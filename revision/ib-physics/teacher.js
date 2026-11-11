/* Teacher dashboard: classes and attempt summaries. */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const whoEl = document.getElementById("accountName");
  const signOutEl = document.getElementById("signOutBtn");

  const state = {
    auth: null,
    classes: [],
    attempts: [],
    errorStudents: [],
    errorRecords: [],
    errorClassId: "",
    filters: {
      classId: "",
      student: "",
      from: "",
      to: "",
      level: "",
      mode: ""
    }
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function setAccount(auth) {
    const name = auth && auth.profile && auth.profile.display_name;
    if (whoEl) {
      whoEl.textContent = name || "";
      whoEl.classList.toggle("hidden", !name);
    }
    if (signOutEl) {
      signOutEl.classList.toggle("hidden", !auth || auth.status !== "teacher");
    }
  }

  function renderSetup(message) {
    setAccount(null);
    app.innerHTML = `
      <div class="hero">
        <h1>Teacher dashboard</h1>
        <p>Account setup is not complete.</p>
      </div>
      <div class="card authcard">
        <h1>Supabase setup required</h1>
        <p>${esc(message || "The browser configuration is empty.")}</p>
        <div class="auth-note">
          Add the Supabase project URL, publishable key and student email domain to
          <code>supabase-config.js</code>, then reload this page.
        </div>
      </div>`;
  }

  function renderLogin(message) {
    setAccount(null);
    app.innerHTML = `
      <div class="hero">
        <h1>Teacher dashboard</h1>
        <p>Sign in with the teacher email and password.</p>
      </div>
      <div class="card authcard">
        <h1>Teacher sign-in</h1>
        <form class="auth-form" onsubmit="submitTeacherLogin(event)">
          <label for="teacherEmail">Email or username</label>
          <input class="input" id="teacherEmail" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(QuizAuth.teacherEmail || "")}" required>
          <label for="teacherPassword">Password</label>
          <input class="input" id="teacherPassword" type="password" autocomplete="current-password" required>
          <button class="btn primary" id="teacherLoginBtn" type="submit">Sign in</button>
        </form>
        <div class="form-error" id="teacherLoginError">${esc(message || "")}</div>
        <div class="auth-note">Students use the <a href="index.html">student quiz</a>.</div>
      </div>`;
  }

  function renderError(message) {
    setAccount(null);
    app.innerHTML = `
      <div class="hero">
        <h1>Teacher dashboard</h1>
        <p>Could not open the dashboard.</p>
      </div>
      <div class="card authcard">
        <h1>Account error</h1>
        <p>${esc(message)}</p>
        <div class="auth-actions">
          <button class="btn primary" onclick="bootTeacher()">Try again</button>
          <button class="btn ghost" onclick="signOutTeacher()">Sign out</button>
        </div>
      </div>`;
  }

  function renderNotTeacher(auth) {
    setAccount(auth);
    app.innerHTML = `
      <div class="hero">
        <h1>Teacher dashboard</h1>
        <p>This account is signed in as a student.</p>
      </div>
      <div class="card authcard">
        <h1>Teacher access required</h1>
        <p>Ask the site owner to add this email to the teacher allowlist, then sign out and back in.</p>
        <div class="auth-actions">
          <a class="btn primary" href="index.html">Go to student quiz</a>
          <button class="btn ghost" onclick="signOutTeacher()">Sign out</button>
        </div>
      </div>`;
  }

  function renderLoading() {
    setAccount(null);
    app.innerHTML = `
      <div class="hero"><h1>Teacher dashboard</h1><p>Loading classes and attempts…</p></div>
      <div class="card authcard"><p>One moment.</p></div>`;
  }

  async function bootTeacher() {
    if (!window.QuizAuth) {
      renderSetup("The account script did not load.");
      return;
    }
    if (!QuizAuth.configured) {
      renderSetup();
      return;
    }

    renderLoading();
    const auth = await QuizAuth.getState();
    state.auth = auth;

    if (auth.status === "signed_out") {
      renderLogin();
      return;
    }
    if (auth.status !== "teacher") {
      if (auth.status === "student" || auth.status === "unlinked") {
        renderNotTeacher(auth);
      } else {
        renderError(auth.message || "This account cannot open the teacher dashboard.");
      }
      return;
    }

    setAccount(auth);
    await loadDashboard();
  }

  function joined(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  async function loadDashboard() {
    const sb = QuizAuth.getClient();
    if (!sb || !state.auth || state.auth.status !== "teacher") {
      renderError("The teacher session is not available.");
      return;
    }

    const [classesResult, attemptsResult, rosterResult, errorsResult] = await Promise.all([
      sb.from("classes")
        .select("id, name, join_code, created_at")
        .order("name", { ascending: true }),
      sb.from("attempts")
        .select(`
          id, class_id, completed_at, level, mode, selection,
          total_questions, correct_count, almost_count, learn_count, duration_seconds,
          student:profiles!attempts_student_id_fkey(display_name),
          classroom:classes!attempts_class_id_fkey(name)
        `)
        .order("completed_at", { ascending: false })
        .limit(2000),
      sb.from("roster_students")
        .select("id, class_id, display_name, username, auth_user_id, created_at")
        .order("display_name", { ascending: true }),
      sb.from("error_records")
        .select("id, roster_student_id, mc_id, year, month, tz, level, q_number, source, topic, times_logged, practice_correct, mastered, last_logged_at")
        .order("last_logged_at", { ascending: false })
        .limit(3000)
    ]);

    if (classesResult.error || attemptsResult.error || rosterResult.error || errorsResult.error) {
      const error = classesResult.error || attemptsResult.error || rosterResult.error || errorsResult.error;
      renderError(error.message || "Could not load the dashboard data.");
      return;
    }

    state.classes = classesResult.data || [];
    state.attempts = (attemptsResult.data || []).map((attempt) => ({
      ...attempt,
      student: joined(attempt.student),
      classroom: joined(attempt.classroom)
    }));
    state.errorStudents = rosterResult.data || [];
    state.errorRecords = errorsResult.data || [];
    if (!state.errorClassId || !state.classes.some((c) => c.id === state.errorClassId)) {
      state.errorClassId = state.classes[0] ? state.classes[0].id : "";
    }

    renderDashboard();
  }

  function studentNames() {
    return [...new Set(
      state.attempts
        .map((a) => a.student && a.student.display_name)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function renderDashboard() {
    setAccount(state.auth);
    const options = state.classes.map((c) =>
      `<option value="${esc(c.id)}">${esc(c.name)}</option>`
    ).join("");
    const studentOptions = studentNames().map((name) =>
      `<option value="${esc(name)}">${esc(name)}</option>`
    ).join("");

    app.innerHTML = `
      <div class="dashboard-head">
        <div>
          <h1>Attempt summary</h1>
          <p>Signed in as ${esc(state.auth.profile.display_name || "teacher")}. Only completed attempts are shown.</p>
        </div>
        <button class="btn ghost" onclick="loadDashboard()">Refresh</button>
      </div>

      <div class="stats" id="stats"></div>

      <section class="panel">
        <h2>Error Book</h2>
        <p class="sub">Shared mistakes imported from the scanned papers. Students see only their own rows.</p>
        <div class="row" style="margin-bottom:12px">
          <div class="field" style="min-width:180px">
            <label for="errorClassFilter">Class</label>
            <select class="input" id="errorClassFilter" onchange="setErrorClass(this.value)">
              ${state.classes.map((c) => `<option value="${esc(c.id)}" ${c.id === state.errorClassId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        ${renderErrorBook()}
      </section>

      <section class="panel">
        <h2>Classes</h2>
        <p class="sub">The 6IB roster and student accounts are prepared by the setup script. You can create an additional class here.</p>
        <form class="class-form" onsubmit="createClass(event)">
          <input class="input" id="className" maxlength="80" placeholder="Class name, e.g. 6IB Physics" required>
          <button class="btn primary" id="createClassBtn" type="submit">Create class</button>
        </form>
        <div class="form-error" id="classError" role="alert"></div>
        <div class="class-grid" id="classList"></div>
      </section>

      <section class="panel">
        <h2>Attempt records</h2>
        <p class="sub">Latest completed attempts from classes you own. Open <a href="history.html">Quiz history</a> for question-level results grouped by topic.</p>
        <div class="filters">
          <div class="field">
            <label for="filterClass">Class</label>
            <select class="input" id="filterClass" onchange="updateFilter('classId', this.value)">
              <option value="">All classes</option>${options}
            </select>
          </div>
          <div class="field">
            <label for="filterStudent">Student</label>
            <select class="input" id="filterStudent" onchange="updateFilter('student', this.value)">
              <option value="">All students</option>${studentOptions}
            </select>
          </div>
          <div class="field">
            <label for="filterLevel">Level</label>
            <select class="input" id="filterLevel" onchange="updateFilter('level', this.value)">
              <option value="">All levels</option>
              <option>SL</option>
              <option>HL</option>
            </select>
          </div>
          <div class="field">
            <label for="filterMode">Round</label>
            <select class="input" id="filterMode" onchange="updateFilter('mode', this.value)">
              <option value="">All rounds</option>
              <option value="topic">Topic</option>
              <option value="theme">Theme</option>
              <option value="all">All topics</option>
            </select>
          </div>
          <div class="field">
            <label for="filterFrom">From</label>
            <input class="input" type="date" id="filterFrom" onchange="updateFilter('from', this.value)">
          </div>
          <div class="field">
            <label for="filterTo">To</label>
            <input class="input" type="date" id="filterTo" onchange="updateFilter('to', this.value)">
          </div>
        </div>
        <div class="save-status" id="resultCount"></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Completed</th>
                <th>Student</th>
                <th>Class</th>
                <th>Level</th>
                <th>Round</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="attemptBody"></tbody>
          </table>
        </div>
      </section>`;

    renderClassList();
    applyFilterValues();
    renderAttemptTable();
  }

  function renderErrorBook() {
    const students = state.errorStudents.filter((s) => s.class_id === state.errorClassId);
    if (!students.length) return `<div class="empty">No students in this class.</div>`;
    const ids = new Set(students.map((s) => s.id));
    const errs = state.errorRecords.filter((r) => ids.has(r.roster_student_id));
    const byRoster = new Map();
    for (const r of errs) {
      const a = byRoster.get(r.roster_student_id) || { total: 0, active: 0, mastered: 0, last: "" };
      a.total += 1;
      if (r.mastered) a.mastered += 1; else a.active += 1;
      if (!a.last || String(r.last_logged_at) > a.last) a.last = r.last_logged_at;
      byRoster.set(r.roster_student_id, a);
    }
    return `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Username</th><th>Account</th><th>Errors</th><th>Active</th><th>Mastered</th><th>Last logged</th></tr></thead><tbody>
      ${students.map((s) => {
        const a = byRoster.get(s.id) || { total: 0, active: 0, mastered: 0, last: "" };
        return `<tr><td>${esc(s.display_name)}</td><td>${esc(s.username)}</td><td>${s.auth_user_id ? "Linked" : "Not linked"}</td><td>${a.total}</td><td>${a.active}</td><td>${a.mastered}</td><td>${a.last ? esc(formatDate(a.last)) : "—"}</td></tr>`;
      }).join("")}
    </tbody></table></div>`;
  }

  function setErrorClass(id) {
    if (!state.classes.some((c) => c.id === id)) return;
    state.errorClassId = id;
    renderDashboard();
  }


  function applyFilterValues() {
    const map = {
      filterClass: state.filters.classId,
      filterStudent: state.filters.student,
      filterLevel: state.filters.level,
      filterMode: state.filters.mode,
      filterFrom: state.filters.from,
      filterTo: state.filters.to
    };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    });
  }

  function updateFilter(key, value) {
    state.filters[key] = value || "";
    renderAttemptTable();
  }

  function renderClassList() {
    const el = document.getElementById("classList");
    if (!el) return;
    if (!state.classes.length) {
      el.innerHTML = `<div class="empty">No classes yet. Create one above.</div>`;
      return;
    }

    el.innerHTML = state.classes.map((c) => `
      <div class="class-card">
        <div class="name">${esc(c.name)}</div>
        <div class="code-label">Join code</div>
        <div class="code">${esc(c.join_code)}</div>
        <button class="btn ghost" onclick="copyCode('${esc(c.join_code)}')">Copy code</button>
      </div>`).join("");
  }

  function filteredAttempts() {
    return state.attempts.filter((a) => {
      if (state.filters.classId && a.class_id !== state.filters.classId) return false;
      if (state.filters.student && (!a.student || a.student.display_name !== state.filters.student)) return false;
      if (state.filters.level && a.level !== state.filters.level) return false;
      if (state.filters.mode && a.mode !== state.filters.mode) return false;

      const date = new Date(a.completed_at);
      const ymd = Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
      if (state.filters.from && ymd < state.filters.from) return false;
      if (state.filters.to && ymd > state.filters.to) return false;
      return true;
    });
  }

  function modeLabel(attempt) {
    if (attempt.mode === "all") return "All topics";
    if (attempt.mode === "theme") return `Theme ${attempt.selection}`;
    return `Topic ${attempt.selection}`;
  }

  function scoreClass(attempt) {
    const total = Number(attempt.total_questions) || 0;
    const pct = total ? Number(attempt.correct_count) / total : 0;
    if (pct >= 0.8) return "good";
    if (pct >= 0.5) return "mid";
    return "low";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function renderAttemptTable() {
    const rows = filteredAttempts();
    const body = document.getElementById("attemptBody");
    const stats = document.getElementById("stats");
    const count = document.getElementById("resultCount");
    if (!body || !stats) return;

    const students = new Set(rows.map((a) => a.student && a.student.display_name).filter(Boolean));
    const correct = rows.reduce((sum, a) => sum + Number(a.correct_count || 0), 0);
    const total = rows.reduce((sum, a) => sum + Number(a.total_questions || 0), 0);
    const avg = total ? Math.round((correct / total) * 100) : 0;

    stats.innerHTML = `
      <div class="stat"><b>${rows.length}</b><span>Attempts</span></div>
      <div class="stat"><b>${students.size}</b><span>Students</span></div>
      <div class="stat"><b>${total ? avg + "%" : "—"}</b><span>Average score</span></div>
      <div class="stat"><b>${state.classes.length}</b><span>Classes</span></div>`;

    if (count) {
      count.textContent = `${rows.length} attempt${rows.length === 1 ? "" : "s"} shown`;
    }

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="empty">No completed attempts match these filters.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((a) => {
      const cls = scoreClass(a);
      return `<tr>
        <td>${esc(formatDate(a.completed_at))}</td>
        <td>${esc(a.student ? a.student.display_name : "Unknown student")}</td>
        <td>${esc(a.classroom ? a.classroom.name : "Unknown class")}</td>
        <td>${esc(a.level)}</td>
        <td>${esc(modeLabel(a))}</td>
        <td class="score ${cls}">${Number(a.correct_count)} / ${Number(a.total_questions)}</td>
        <td>${esc(formatDuration(a.duration_seconds))}</td>
      </tr>`;
    }).join("");
  }

  async function createClass(event) {
    event.preventDefault();
    const input = document.getElementById("className");
    const button = document.getElementById("createClassBtn");
    const error = document.getElementById("classError");
    if (!input || !button) return;

    const name = input.value.trim();
    if (!name) return;

    error.textContent = "";
    button.disabled = true;
    button.textContent = "Creating…";

    const sb = QuizAuth.getClient();
    const { error: createError } = await sb
      .from("classes")
      .insert({ teacher_id: state.auth.user.id, name });

    button.disabled = false;
    button.textContent = "Create class";

    if (createError) {
      error.textContent = createError.message || "Could not create the class.";
      return;
    }

    input.value = "";
    await loadDashboard();
    toast("Class created.");
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast("Join code copied.");
    } catch (_) {
      window.prompt("Copy this join code:", code);
    }
  }

  async function submitTeacherLogin(event) {
    event.preventDefault();
    const email = document.getElementById("teacherEmail");
    const password = document.getElementById("teacherPassword");
    const errorEl = document.getElementById("teacherLoginError");
    const button = document.getElementById("teacherLoginBtn");
    if (!email || !password || !errorEl || !button) return;
    errorEl.textContent = "";
    button.disabled = true; button.textContent = "Signing in…";
    try {
      await QuizAuth.signIn(email.value, password.value);
      await bootTeacher();
    } catch (error) {
      errorEl.textContent = error.message || "Could not sign in.";
    } finally {
      button.disabled = false; button.textContent = "Sign in";
    }
  }

  async function signOutTeacher() {
    try {
      await QuizAuth.signOut();
    } catch (error) {
      toast(error.message || "Could not sign out.");
    }
    await bootTeacher();
  }

  window.bootTeacher = bootTeacher;
  window.submitTeacherLogin = submitTeacherLogin;
  window.signOutTeacher = signOutTeacher;
  window.loadDashboard = loadDashboard;
  window.createClass = createClass;
  window.updateFilter = updateFilter;
  window.setErrorClass = setErrorClass;
  window.copyCode = copyCode;

  bootTeacher();
})();
