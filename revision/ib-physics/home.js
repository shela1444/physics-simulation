/* Authenticated landing page for the two practice sections. */
(function () {
  "use strict";

  const app = document.getElementById("app");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function setAccount(auth) {
    const name = auth && (auth.profile?.display_name || auth.user?.email);
    const nameEl = document.getElementById("accountName");
    const outEl = document.getElementById("signOutBtn");
    const teacherEl = document.getElementById("teacherDashLink");
    if (nameEl) {
      nameEl.textContent = name || "";
      nameEl.classList.toggle("hidden", !name);
    }
    if (outEl) outEl.classList.toggle("hidden", !auth || !["student", "teacher"].includes(auth.status));
    if (teacherEl) teacherEl.classList.toggle("hidden", !auth || auth.status !== "teacher");
  }

  function errorPage(message) {
    setAccount(null);
    app.innerHTML = `<div class="hero"><h1>Things to be Remembered</h1><p>Account setup required.</p></div>
      <div class="authcard"><h1>Could not load your account</h1><p>${esc(message || "Try signing in again.")}</p>
      <div class="auth-actions"><button class="btn primary" type="button" onclick="location.reload()">Try again</button></div></div>`;
  }

  function renderLogin(message) {
    setAccount(null);
    app.innerHTML = `<div class="hero"><h1>Things to be Remembered</h1><p>Sign in to choose your practice section.</p></div>
      <div class="authcard">
        <h1>Sign in</h1>
        <p>Students use the username and password from the teacher. Teachers use their email address.</p>
        <form class="auth-form" onsubmit="submitHomeLogin(event)">
          <label for="loginId">Username or email</label>
          <input id="loginId" autocomplete="username" autocapitalize="none" spellcheck="false" required>
          <label for="loginPassword">Password</label>
          <input id="loginPassword" type="password" autocomplete="current-password" required>
          <button class="btn primary" type="submit" id="loginBtn">Sign in</button>
        </form>
        <div class="form-error" id="loginError">${esc(message || "")}</div>
      </div>`;
    const input = document.getElementById("loginId");
    if (input) input.focus();
  }

  function renderCards(auth) {
    setAccount(auth);
    const isTeacher = auth.status === "teacher";
    const canUseErrorBook = isTeacher || !auth.membership?.quiz_only;
    const cards = [];

    if (canUseErrorBook) {
      cards.push(`<a class="section-card error" href="error-log.html">
        <div class="kicker">Section 01 · Review</div>
        <h2>Error Book of Past Papers</h2>
        <p>Review mistakes from past Paper 1 questions, practise active errors, and export selected questions for revision.</p>
        <span class="go">Open Error Book →</span>
      </a>`);
    }

    cards.push(`<a class="section-card practice" href="practice.html?choose=1">
      <div class="kicker">Section 02 · Practice</div>
      <h2>Daily Practice — Things to be Remembered</h2>
      <p>Choose SL or HL, then practise a topic, a five-question round, or a mixed round.</p>
      <span class="go">Choose SL or HL →</span>
    </a>`);

    app.innerHTML = `<div class="hero">
      <h1>Things to be Remembered</h1>
      <p>Signed in as ${esc(auth.profile?.display_name || auth.user?.email || "student")}. Choose a section.</p>
    </div>
    <div class="cards" ${cards.length === 1 ? 'style="grid-template-columns:minmax(0,1fr);max-width:520px"' : ""}>${cards.join("")}</div>
    ${isTeacher ? `<p class="teacher-strip">Teacher tools: <a href="teacher.html">Teacher dashboard</a> · <a href="history.html">Quiz history</a></p>` : ""}`;
  }

  async function boot() {
    app.innerHTML = `<div class="card"><p>Loading your account…</p></div>`;
    if (!window.QuizAuth) return errorPage("The account script did not load.");
    if (!QuizAuth.configured) return errorPage("Account configuration is incomplete.");

    try {
      const auth = await QuizAuth.getState();
      if (auth.status === "signed_out") return renderLogin();
      if (auth.status === "unlinked") return errorPage(auth.message || "Your account is not linked to a class roster.");
      if (auth.status === "student" || auth.status === "teacher") return renderCards(auth);
      return errorPage(auth.message || "Unexpected account state.");
    } catch (error) {
      return errorPage(error.message || "Could not load your account.");
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const id = document.getElementById("loginId");
    const pw = document.getElementById("loginPassword");
    const err = document.getElementById("loginError");
    const btn = document.getElementById("loginBtn");
    if (!id || !pw || !err || !btn) return;
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await QuizAuth.signIn(id.value, pw.value);
      await boot();
    } catch (error) {
      err.textContent = error.message || "Could not sign in.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  }

  async function signOut() {
    try {
      await QuizAuth.signOut();
      await boot();
    } catch (error) {
      toast(error.message || "Could not sign out.");
    }
  }

  window.submitHomeLogin = submitLogin;
  window.homeSignOut = signOut;
  boot();
})();
