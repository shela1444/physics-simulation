/* Shared Supabase-backed Error Book. */
(function () {
  "use strict";

  const YEARS = Array.from({ length: 12 }, (_, i) => String(2015 + i));
  const MONTHS = ["May", "November"];
  const TZS = ["—", "TZ1", "TZ2", "TZ3"];
  const LEVELS = ["SL", "HL"];
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const whoEl = document.getElementById("accountName");
  const outEl = document.getElementById("signOutBtn");

  let bank = null;
  let auth = null;
  let records = [];
  const selectedIds = new Set();
  const ui = {
    draft: { year: "2022", month: "May", tz: "TZ1", level: "SL" },
    first: null,
    confirmed: false,
    preview: null,
    qInput: "",
    error: "",
    saved: "",
    practice: null
  };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function toast(m) {
    if (!toastEl) return;
    toastEl.textContent = m; toastEl.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove("show"), 2500);
  }
  function setAccount(a) {
    if (whoEl) {
      whoEl.textContent = a && a.profile ? a.profile.display_name : "";
      whoEl.classList.toggle("hidden", !a || !a.profile);
    }
    if (outEl) outEl.classList.toggle("hidden", !a || a.status !== "student");
  }
  function paperKey() { return `${ui.draft.year}|${ui.draft.month}|${ui.draft.tz}|${ui.draft.level}`; }
  function paperLabel() { return `${ui.draft.year} ${ui.draft.month} ${ui.draft.tz} ${ui.draft.level}`; }
  function bankQuestion(id) { return bank && bank.questions ? bank.questions[id] : null; }
  function imageUrl(part) {
    const path = typeof part === "string" ? part : (part.path || part.image || "");
    return "error-book/" + String(path).replace(/^\/+/, "");
  }
  function imagesHtml(q, cls) {
    const parts = (q.images && q.images.length) ? q.images : [{ path: q.image, width: q.width, height: q.height }];
    return parts.map((p) => `<img class="${cls || "qimg"}" src="${esc(imageUrl(p))}" width="${p.width || q.width}" height="${p.height || q.height}" alt="${esc(q.id)}">`).join("");
  }
  function optionHtml(values, selected) {
    return values.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
  }
  function qMeta(q) { return `<div class="qmeta"><span class="pill">${esc(q.id)}</span><span class="pill topic">${esc(q.topic)} — ${esc(q.topicTitle)}</span></div>`; }

  async function boot() {
    if (!bank) { app.innerHTML = `<div class="card loading">Loading MC question bank…</div>`; return; }
    if (!window.QuizAuth) { renderSetup("The account script did not load."); return; }
    if (!QuizAuth.configured) { renderSetup(); return; }
    const state = await QuizAuth.getState();
    auth = state;
    setAccount(state);
    if (state.status === "signed_out") { renderLogin(); return; }
    if (state.status === "unlinked") { renderUnlinked(state.message); return; }
    if (state.status === "teacher") { renderTeacherNotice(); return; }
    if (state.status !== "student") { renderError(state.message || "Could not load your account."); return; }
    if (!await loadRecords()) return;
    render();
  }

  async function loadRecords() {
    const sb = QuizAuth.getClient();
    const { data, error } = await sb.from("error_records")
      .select("*")
      .eq("roster_student_id", auth.roster.id)
      .order("last_logged_at", { ascending: false });
    if (error) { renderError(error.message); return false; }
    records = data || [];
    for (const id of [...selectedIds]) if (!records.some((r) => r.id === id)) selectedIds.delete(id);
    return true;
  }

  function renderSetup(message) {
    setAccount(null);
    app.innerHTML = `<div class="authcard"><h1>Supabase setup required</h1><p>${esc(message || "The account configuration is incomplete.")}</p><p>Run the schema and fill <code>supabase-config.js</code>.</p></div>`;
  }
  function renderLogin(message) {
    setAccount(null);
    app.innerHTML = `<div class="authcard"><h1>Error Book sign-in</h1><p>Use the username and password from your teacher. Teachers use their email address.</p>
      <form class="auth-form" onsubmit="submitLogin(event)">
        <label for="loginId">Username or email</label><input id="loginId" autocomplete="username" autocapitalize="none" spellcheck="false" required>
        <label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" required>
        <button class="btn primary" type="submit" id="loginBtn">Sign in</button>
      </form><div class="form-error" id="loginError">${esc(message || "")}</div></div>`;
    const input = document.getElementById("loginId"); if (input) input.focus();
  }
  function renderUnlinked(message) {
    setAccount(auth);
    app.innerHTML = `<div class="authcard"><h1>Account not linked</h1><p>${esc(message || "Ask your teacher to link this account to your 6IB roster name.")}</p><button class="btn primary" onclick="signOutErrorBook()">Sign out</button></div>`;
  }
  function renderTeacherNotice() {
    setAccount(auth);
    app.innerHTML = `<div class="authcard"><h1>Teacher account</h1><p>Open the teacher dashboard to manage the 6IB roster and view all student records.</p><div class="actions-inline"><a class="btn primary" href="teacher.html">Teacher dashboard</a><button class="btn ghost" onclick="signOutErrorBook()">Sign out</button></div></div>`;
  }
  function renderError(message) {
    setAccount(null);
    app.innerHTML = `<div class="authcard"><h1>Could not load the Error Book</h1><p>${esc(message)}</p><button class="btn primary" onclick="bootErrorBook()">Try again</button></div>`;
  }

  async function submitLogin(event) {
    event.preventDefault();
    const id = document.getElementById("loginId");
    const pw = document.getElementById("loginPassword");
    const err = document.getElementById("loginError");
    const btn = document.getElementById("loginBtn");
    if (!id || !pw || !err || !btn) return;
    err.textContent = ""; btn.disabled = true; btn.textContent = "Signing in…";
    try { await QuizAuth.signIn(id.value, pw.value); await boot(); }
    catch (e) { err.textContent = e.message || "Could not sign in."; }
    finally { btn.disabled = false; btn.textContent = "Sign in"; }
  }

  function render() {
    if (!auth || auth.status !== "student") { boot(); return; }
    const first = ui.first ? bankQuestion(ui.first.id) : null;
    const preview = ui.preview ? bankQuestion(ui.preview.id) : null;
    const unresolved = records.filter((r) => !r.mastered);
    app.innerHTML = `
      <h1>Error Book</h1>
      <p class="sub">${esc(auth.profile.display_name)} · 6IB · ${records.length} logged · ${unresolved.length} active</p>
      ${ui.error ? `<div class="notice bad">${esc(ui.error)}</div>` : ""}
      ${ui.saved ? `<div class="notice ok">${esc(ui.saved)}</div>` : ""}

      <section class="card" style="margin-top:16px">
        <div class="step"><div class="stepnum">1</div><div class="stepbody">
          <h2>Choose the paper</h2><p class="sub">Confirm the first question identifies the correct paper.</p>
          <div class="row">
            <div class="field"><label>Year</label><select onchange="setDraft('year',this.value)">${optionHtml(YEARS, ui.draft.year)}</select></div>
            <div class="field"><label>Month</label><select onchange="setDraft('month',this.value)">${optionHtml(MONTHS, ui.draft.month)}</select></div>
            <div class="field"><label>Time zone</label><select onchange="setDraft('tz',this.value)">${optionHtml(TZS, ui.draft.tz)}</select></div>
            <div class="field"><label>Level</label><select onchange="setDraft('level',this.value)">${optionHtml(LEVELS, ui.draft.level)}</select></div>
            <button class="btn primary" onclick="showFirstQuestion()">Show first question</button>
          </div>
          ${ui.first && first ? `<div class="questionbox" style="margin-top:14px">
            <h3>${ui.first.q === 1 ? "First question" : `First available question (Q${ui.first.q})`}</h3>
            <p class="sub">${esc(paperLabel())} · ${esc(ui.first.source)}</p>
            ${imagesHtml(first)}
            ${ui.confirmed ? `<div class="notice ok">Paper confirmed.</div>` : `<div class="actions"><button class="btn primary" onclick="confirmPaper()">This is the correct paper</button><button class="btn ghost" onclick="changePaper()">Change paper</button></div>`}
          </div>` : ""}
        </div></div>
        ${ui.confirmed ? `<div class="step"><div class="stepnum">2</div><div class="stepbody">
          <h2>Enter one wrong question number</h2>
          <p class="sub">The question will be shown immediately for checking.</p>
          <div class="row"><div class="field"><label>Question number</label><input id="wrongQ" type="number" min="1" max="40" value="${esc(ui.qInput)}" placeholder="e.g. 12"></div><button class="btn primary" onclick="checkQuestion()">Check question</button></div>
          ${ui.preview && preview ? `<div class="questionbox" style="margin-top:14px">
            <h3>Is this the correct question?</h3>${qMeta(preview)}<p class="sub">${esc(ui.preview.source)}</p>
            ${imagesHtml(preview)}
            <div class="actions"><button class="btn primary" onclick="saveCurrentQuestion()">This is the correct question — save it</button><button class="btn ghost" onclick="clearPreview()">Try another number</button></div>
          </div>` : ""}
        </div></div>` : ""}
      </section>

      <section class="card">
        <div class="toolbar"><div><h2>Error history</h2><p class="sub">Select any questions to export as a PDF, or practise all active errors.</p></div>
        <div class="export-actions">
          <button class="btn ghost" onclick="selectAllRows()">Select all</button>
          <button class="btn ghost" onclick="clearExportSelection()">Clear</button>
          <button class="btn primary" id="exportSelectedBtn" onclick="exportSelectedPdf()" disabled>Export selected PDF (0)</button>
          <button class="btn primary" onclick="startPractice()" ${unresolved.length ? "" : "disabled"}>Practise all active (${unresolved.length})</button>
        </div></div>
        ${records.length ? renderTable() : `<div class="empty">No errors logged yet.</div>`}
      </section>`;
    updateExportButton();
  }

  function renderTable() {
    return `<div class="table-wrap"><table><thead><tr><th class="selectcol"></th><th>Source</th><th>MC ID</th><th>Subtopic</th><th>Logged</th><th>Correct</th><th>Status</th></tr></thead><tbody>
      ${records.map((r) => `<tr><td class="selectcol"><input class="rowcheck" type="checkbox" ${selectedIds.has(r.id) ? "checked" : ""} onchange="toggleExportSelection('${esc(r.id)}', this.checked)" aria-label="Select ${esc(r.mc_id)}"></td><td>${esc(r.source)}</td><td>${esc(r.mc_id)}</td><td>${esc(r.topic)}</td><td>${r.times_logged}×</td><td>${r.practice_correct}/2</td><td><span class="status ${r.mastered ? "mastered" : ""}">${r.mastered ? "Mastered" : "Active"}</span></td></tr>`).join("")}
    </tbody></table></div>`;
  }

  function updateExportButton() {
    const btn = document.getElementById("exportSelectedBtn");
    if (!btn) return;
    btn.textContent = `Export selected PDF (${selectedIds.size})`;
    btn.disabled = selectedIds.size === 0;
  }
  function toggleExportSelection(id, checked) {
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    updateExportButton();
  }
  function selectAllRows() {
    for (const r of records) selectedIds.add(r.id);
    render();
  }
  function clearExportSelection() {
    selectedIds.clear();
    render();
  }

  function imageUrl(part) {
    const path = typeof part === "string" ? part : (part.path || part.image || "");
    return "error-book/" + String(path).replace(/^\/+/, "");
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load " + url));
      img.src = url;
    });
  }
  async function imageForPdf(part) {
    const img = await loadImage(imageUrl(part));
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return { data: canvas.toDataURL("image/jpeg", 0.93), width: img.naturalWidth, height: img.naturalHeight };
  }
  function questionParts(q) {
    return (q.images && q.images.length) ? q.images : [{ path: q.image, width: q.width, height: q.height }];
  }
  async function exportSelectedPdf() {
    const JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) { toast("PDF library did not load."); return; }
    const chosen = records.filter((r) => selectedIds.has(r.id));
    if (!chosen.length) { toast("Select at least one question."); return; }
    const button = document.getElementById("exportSelectedBtn");
    if (button) { button.disabled = true; button.textContent = "Preparing PDF…"; }
    try {
      const prepared = [];
      for (const rec of chosen) {
        const q = bankQuestion(rec.mc_id);
        if (!q) continue;
        const images = [];
        for (const part of questionParts(q)) images.push(await imageForPdf(part));
        prepared.push({ rec, q, images });
      }
      if (!prepared.length) throw new Error("No selected questions could be loaded.");

      const pdf = new JsPDF({ unit: "pt", format: "a4" });
      const pageW = 595.28, pageH = 841.89;
      const margin = 34, bottom = 806, contentTop = 82;
      const rowH = (bottom - contentTop - 12) / 2;
      let slot = 0, y = contentTop;

      function header() {
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
        pdf.text("Things to be Remembered — Selected Errors", margin, 32);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
        pdf.text(`Student: ${auth.profile.display_name}`, margin, 49);
        const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        pdf.text(`Date: ${date}`, pageW - margin, 49, { align: "right" });
        pdf.setDrawColor(205, 212, 225); pdf.line(margin, 59, pageW - margin, 59);
      }
      function newPage() { pdf.addPage(); header(); y = contentTop; slot = 0; }
      function label(q, rec) {
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
        pdf.setTextColor(47, 69, 168);
        pdf.text(q.id + "  ·  " + rec.source, margin, y);
        pdf.setTextColor(20, 20, 20); y += 13;
      }
      function drawImage(image, maxX, maxY) {
        const scale = Math.min(maxX / image.width, maxY / image.height);
        const w = image.width * scale, h = image.height * scale;
        pdf.addImage(image.data, "JPEG", margin, y, w, h, undefined, "FAST");
        y += h + 12;
      }

      header();
      for (const item of prepared) {
        const q = item.q;
        if (item.images.length > 1) {
          // Keep all parts together; allow the question to use extra pages.
          if (slot > 0) newPage();
          label(q, item.rec);
          for (let i = 0; i < item.images.length; i++) {
            if (i > 0) newPage();
            if (i > 0) {
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
              pdf.setTextColor(47, 69, 168); pdf.text(q.id + " (continued)", margin, y);
              pdf.setTextColor(20, 20, 20); y += 13;
            }
            drawImage(item.images[i], pageW - 2 * margin, bottom - y - 4);
          }
          slot = 2;
          continue;
        }
        if (slot >= 2 || y + rowH > bottom) newPage();
        label(q, item.rec);
        drawImage(item.images[0], pageW - 2 * margin, rowH - 18);
        slot += 1;
      }

      // Answer key.
      pdf.addPage(); header();
      y = contentTop;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
      pdf.text("Answer Key", margin, y); y += 20;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
      pdf.text("MC ID", margin, y); pdf.text("Answer", margin + 80, y); pdf.text("Source", margin + 130, y); y += 12;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      for (const item of prepared) {
        if (y > 790) { pdf.addPage(); header(); y = contentTop; }
        const source = pdf.splitTextToSize(item.rec.source, pageW - margin * 2 - 130);
        pdf.text(item.q.id, margin, y); pdf.text(item.q.answer, margin + 80, y); pdf.text(source[0] || "", margin + 130, y);
        y += 13;
      }
      const pages = pdf.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(102, 112, 133);
        pdf.text(`Page ${i} of ${pages}`, pageW - margin, 824, { align: "right" });
      }
      pdf.save(`error-book-selected-${new Date().toISOString().slice(0,10)}.pdf`);
      toast(`PDF exported: ${prepared.length} question${prepared.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast(error.message || "Could not create the PDF.");
    } finally {
      if (button) { button.disabled = selectedIds.size === 0; button.textContent = `Export selected PDF (${selectedIds.size})`; }
    }
  }

  function setDraft(k, v) { ui.draft[k] = v; ui.first = null; ui.confirmed = false; ui.preview = null; ui.error = ""; ui.saved = ""; render(); }
  function showFirstQuestion() {
    ui.error = ""; ui.saved = ""; ui.preview = null; ui.confirmed = false;
    const f = bank.first[paperKey()];
    if (!f) { ui.first = null; ui.error = `No MC first question found for ${paperLabel()}.`; render(); return; }
    ui.first = f; render();
  }
  function confirmPaper() { if (!ui.first) return; ui.confirmed = true; ui.error = ""; ui.saved = ""; render(); }
  function changePaper() { ui.first = null; ui.confirmed = false; ui.preview = null; ui.error = ""; ui.saved = ""; render(); }
  function checkQuestion() {
    ui.error = ""; ui.saved = "";
    const raw = (document.getElementById("wrongQ") || {}).value || "";
    const qnum = Number(raw);
    if (!Number.isInteger(qnum) || qnum < 1 || qnum > 40) { ui.error = "Enter a question number from 1 to 40."; ui.preview = null; render(); return; }
    ui.qInput = String(qnum);
    const key = `${paperKey()}|${qnum}`;
    const mcId = bank.lookup[key];
    if (!mcId) { ui.error = `No MC question ${qnum} found for ${paperLabel()}.`; ui.preview = null; render(); return; }
    const q = bankQuestion(mcId);
    ui.preview = { id: mcId, q: qnum, source: (q.sources[0] || {}).label || `${paperLabel()} Q${qnum}` };
    render();
  }
  function clearPreview() { ui.preview = null; ui.error = ""; ui.saved = ""; render(); }

  async function saveCurrentQuestion() {
    if (!ui.preview || !auth.roster) return;
    const sb = QuizAuth.getClient();
    const q = bankQuestion(ui.preview.id);
    ui.error = ""; ui.saved = "";
    const { data, error } = await sb.rpc("log_error", {
      p_roster_id: auth.roster.id,
      p_mc_id: ui.preview.id,
      p_year: ui.draft.year,
      p_month: ui.draft.month,
      p_tz: ui.draft.tz,
      p_level: ui.draft.level,
      p_q_number: ui.preview.q,
      p_source: ui.preview.source,
      p_topic: q.topic,
      p_topic_title: q.topicTitle
    });
    if (error) { ui.error = error.message; render(); return; }
    ui.saved = `Saved ${ui.preview.id} (${ui.preview.source}).`;
    ui.preview = null; ui.qInput = "";
    await loadRecords(); render(); toast("Error logged.");
  }

  function startPractice() {
    const ids = records.filter((r) => !r.mastered).map((r) => r.id);
    if (!ids.length) { toast("No active errors to practise."); return; }
    ui.practice = { ids: shuffle([...new Set(ids)]), index: 0, selected: null, revealed: false, score: 0, total: 0, complete: false };
    renderPractice();
  }
  function renderPractice() {
    const p = ui.practice;
    if (!p) { render(); return; }
    if (p.complete) {
      app.innerHTML = `<div class="practice card"><h1>Practice complete</h1><p class="sub">${p.score} correct out of ${p.total}.</p><div class="score">${p.score} / ${p.total}</div><div class="actions-inline"><button class="btn primary" onclick="startPractice()">Practise active again</button><button class="btn ghost" onclick="exitPractice()">Back to error book</button></div></div>`;
      return;
    }
    const rec = records.find((r) => r.id === p.ids[p.index]);
    const q = rec && bankQuestion(rec.mc_id);
    if (!q) { p.index++; if (p.index >= p.ids.length) p.complete = true; else renderPractice(); return; }
    const chosen = p.selected, revealed = p.revealed;
    app.innerHTML = `<div class="practice card">
      <div class="progress">Question ${p.index + 1} of ${p.ids.length}</div>${qMeta(q)}
      ${imagesHtml(q)}
      <div class="choices">${["A","B","C","D"].map((l) => {
        let cls = "choice"; if (chosen === l) cls += " selected";
        if (revealed && q.answer === l) cls += " correct";
        if (revealed && chosen === l && chosen !== q.answer) cls += " wrong";
        return `<button class="${cls}" type="button" onclick="choosePractice('${l}')" ${revealed ? "disabled" : ""}>${l}</button>`;
      }).join("")}</div>
      ${revealed ? `<div class="feedback ${chosen === q.answer ? "correct" : "wrong"}">${chosen === q.answer ? "Correct" : "Wrong — the correct answer is " + esc(q.answer)}</div>` : ""}
      <div class="actions-inline">${revealed ? `<button class="btn primary" onclick="nextPractice()">${p.index + 1 < p.ids.length ? "Next question" : "Finish practice"}</button>` : `<button class="btn primary" onclick="submitPractice()" ${chosen ? "" : "disabled"}>Submit</button>`}<button class="btn ghost" onclick="exitPractice()">Exit</button></div>
    </div>`;
  }
  function choosePractice(l) { if (!ui.practice || ui.practice.revealed) return; ui.practice.selected = l; renderPractice(); }
  async function submitPractice() {
    const p = ui.practice; if (!p || !p.selected) return;
    const rec = records.find((r) => r.id === p.ids[p.index]);
    const q = rec && bankQuestion(rec.mc_id);
    if (!rec || !q) return;
    const correct = p.selected === q.answer;
    const sb = QuizAuth.getClient();
    const { data, error } = await sb.rpc("record_practice", { p_record_id: rec.id, p_correct: correct });
    if (error) { toast(error.message); return; }
    const updated = Array.isArray(data) ? data[0] : data;
    if (updated) Object.assign(rec, updated);
    p.total += 1; if (correct) p.score += 1;
    p.revealed = true; renderPractice();
  }
  function nextPractice() {
    const p = ui.practice; if (!p) return;
    if (p.index + 1 >= p.ids.length) p.complete = true;
    else { p.index += 1; p.selected = null; p.revealed = false; }
    renderPractice();
  }
  function exitPractice() { ui.practice = null; render(); }
  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

  window.submitLogin = submitLogin;
  window.signOutErrorBook = async function () { try { await QuizAuth.signOut(); } catch (_) {} window.location.reload(); };
  window.bootErrorBook = boot;
  window.setDraft = setDraft;
  window.showFirstQuestion = showFirstQuestion;
  window.confirmPaper = confirmPaper;
  window.changePaper = changePaper;
  window.checkQuestion = checkQuestion;
  window.clearPreview = clearPreview;
  window.saveCurrentQuestion = saveCurrentQuestion;
  window.startPractice = startPractice;
  window.toggleExportSelection = toggleExportSelection;
  window.selectAllRows = selectAllRows;
  window.clearExportSelection = clearExportSelection;
  window.exportSelectedPdf = exportSelectedPdf;
  window.choosePractice = choosePractice;
  window.submitPractice = submitPractice;
  window.nextPractice = nextPractice;
  window.exitPractice = exitPractice;

  fetch("error-book/index.json")
    .then((r) => { if (!r.ok) throw new Error("Could not load error-book/index.json"); return r.json(); })
    .then((data) => { bank = data; boot(); })
    .catch((e) => { app.innerHTML = `<div class="card"><h1>Could not load the MC bank</h1><p>${esc(e.message)}</p></div>`; });
})();
