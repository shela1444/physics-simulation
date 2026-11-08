/* Local Error Book. No account or server storage. */
(function () {
  "use strict";

  const STORAGE_KEY = "ib-error-book-v1";
  const YEARS = Array.from({ length: 12 }, (_, i) => String(2015 + i));
  const MONTHS = ["May", "November"];
  const TZS = ["—", "TZ1", "TZ2", "TZ3"];
  const LEVELS = ["SL", "HL"];
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  let bank = null;
  let book = loadBook();
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

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return prefix + "-" + crypto.randomUUID();
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toastEl.classList.remove("show"), 2500);
  }

  function loadBook() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (value && Array.isArray(value.students) && Array.isArray(value.records)) return value;
    } catch (_) {}
    return { version: 1, students: [], activeStudentId: null, records: [] };
  }

  function saveBook() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
  }

  function activeStudent() {
    return book.students.find((s) => s.id === book.activeStudentId) || null;
  }

  function paperKey() {
    return `${ui.draft.year}|${ui.draft.month}|${ui.draft.tz}|${ui.draft.level}`;
  }

  function paperLabel() {
    return `${ui.draft.year} ${ui.draft.month} ${ui.draft.tz} ${ui.draft.level}`;
  }

  function studentRecords(studentId) {
    return book.records
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => String(b.lastLoggedAt || b.addedAt).localeCompare(String(a.lastLoggedAt || a.addedAt)));
  }

  function recordFor(studentId, mcId) {
    return book.records.find((r) => r.studentId === studentId && r.mcId === mcId);
  }

  function bankQuestion(mcId) {
    return bank && bank.questions ? bank.questions[mcId] : null;
  }

  function optionHtml(name, values, selected) {
    return values.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
  }

  function qMeta(q) {
    return `<div class="qmeta"><span class="pill">${esc(q.id)}</span><span class="pill topic">${esc(q.topic)} — ${esc(q.topicTitle)}</span></div>`;
  }

  function render() {
    if (!bank) {
      app.innerHTML = `<div class="card loading">Loading MC question bank…</div>`;
      return;
    }
    if (ui.practice) {
      renderPractice();
      return;
    }
    const student = activeStudent();
    if (!student) {
      app.innerHTML = renderNoStudent();
      return;
    }
    app.innerHTML = renderShell(student);
  }

  function renderNoStudent() {
    return `<div class="card" style="max-width:620px;margin:30px auto">
      <h1>Error Book</h1>
      <p class="sub">Create a local student profile to start logging MC questions.</p>
      <div class="row" style="margin-top:14px">
        <div class="field" style="flex:1">
          <label>Student name or ID</label>
          <input id="newStudentName" placeholder="e.g. 6IB Alex">
        </div>
        <button class="btn primary" onclick="createStudent()">Create profile</button>
      </div>
      <p class="sub" style="margin-top:14px">Stored only in this browser. No login required.</p>
    </div>`;
  }

  function renderShell(student) {
    const records = studentRecords(student.id);
    const unresolved = records.filter((r) => !r.mastered);
    const first = ui.first ? bankQuestion(ui.first.id) : null;
    const preview = ui.preview ? bankQuestion(ui.preview.id) : null;
    return `
      <div class="profilebar">
        <div class="row">
          <div class="field">
            <label>Student</label>
            <select onchange="switchStudent(this.value)">${book.students.map((s) =>
              `<option value="${esc(s.id)}" ${s.id === student.id ? "selected" : ""}>${esc(s.name)}</option>`
            ).join("")}</select>
          </div>
          <div class="field" style="flex:1">
            <label>Add another student</label>
            <input id="newStudentName" placeholder="Name or ID">
          </div>
          <button class="btn ghost" onclick="createStudent()">Add student</button>
        </div>
        <div class="actions-inline">
          <button class="btn ghost" onclick="exportBook()">Export JSON</button>
          <label class="btn ghost" style="margin:0">Import JSON<input type="file" accept=".json,application/json" onchange="importBook(event)" class="hidden"></label>
        </div>
      </div>

      <h1>Error Book</h1>
      <p class="sub">${esc(student.name)} · ${records.length} logged question${records.length === 1 ? "" : "s"} · ${unresolved.length} still active</p>

      ${ui.error ? `<div class="notice bad">${esc(ui.error)}</div>` : ""}
      ${ui.saved ? `<div class="notice ok">${esc(ui.saved)}</div>` : ""}

      <section class="card" style="margin-top:16px">
        <div class="step">
          <div class="stepnum">1</div>
          <div class="stepbody">
            <h2>Choose the paper</h2>
            <p class="sub">Use the pulldowns, then confirm the first question identifies the correct paper.</p>
            <div class="row">
              <div class="field"><label>Year</label><select onchange="setDraft('year', this.value)">${optionHtml("year", YEARS, ui.draft.year)}</select></div>
              <div class="field"><label>Month</label><select onchange="setDraft('month', this.value)">${optionHtml("month", MONTHS, ui.draft.month)}</select></div>
              <div class="field"><label>Time zone</label><select onchange="setDraft('tz', this.value)">${optionHtml("tz", TZS, ui.draft.tz)}</select></div>
              <div class="field"><label>Level</label><select onchange="setDraft('level', this.value)">${optionHtml("level", LEVELS, ui.draft.level)}</select></div>
              <button class="btn primary" onclick="showFirstQuestion()">Show first question</button>
            </div>
            ${ui.first && first ? `
              <div class="questionbox" style="margin-top:14px">
                <h3>${ui.first.q === 1 ? "First question" : `First available question (Q${ui.first.q})`}</h3>
                <p class="sub">${esc(paperLabel())} · ${esc(ui.first.source)}</p>
                <img class="qimg" src="${esc(first.image)}" width="${first.width}" height="${first.height}" alt="${esc(first.id)}">
                ${ui.confirmed ? `<div class="notice ok">Paper confirmed.</div>` : `<div class="actions">
                  <button class="btn primary" onclick="confirmPaper()">This is the correct paper</button>
                  <button class="btn ghost" onclick="changePaper()">Change paper</button>
                </div>`}
              </div>` : ""}
          </div>
        </div>

        ${ui.confirmed ? `
        <div class="step">
          <div class="stepnum">2</div>
          <div class="stepbody">
            <h2>Enter one wrong question number</h2>
            <p class="sub">The question will be shown immediately so you can confirm it.</p>
            <div class="row">
              <div class="field"><label>Question number</label><input id="wrongQ" type="number" min="1" max="40" value="${esc(ui.qInput)}" placeholder="e.g. 12"></div>
              <button class="btn primary" onclick="checkQuestion()">Check question</button>
            </div>
            ${ui.preview && preview ? `
              <div class="questionbox" style="margin-top:14px">
                <h3>Is this the correct question?</h3>
                <div class="qmeta">${qMeta(preview)}</div>
                <p class="sub">${esc(ui.preview.source)}</p>
                <img class="qimg" src="${esc(preview.image)}" width="${preview.width}" height="${preview.height}" alt="${esc(preview.id)}">
                <div class="actions">
                  <button class="btn primary" onclick="saveCurrentQuestion()">This is the correct question — save it</button>
                  <button class="btn ghost" onclick="clearPreview()">Try another number</button>
                </div>
              </div>` : ""}
          </div>
        </div>` : ""}
      </section>

      <section class="card">
        <div class="toolbar">
          <div><h2>Error history</h2><p class="sub">Mastered questions stay here but are left out of practice.</p></div>
          <button class="btn primary" onclick="startPractice()" ${unresolved.length ? "" : "disabled"}>Practise all active (${unresolved.length})</button>
        </div>
        ${records.length ? renderRecordTable(records) : `<div class="empty">No errors logged yet.</div>`}
      </section>`;
  }

  function renderRecordTable(records) {
    return `<div class="table-wrap"><table>
      <thead><tr><th>Source</th><th>MC ID</th><th>Subtopic</th><th>Logged</th><th>Correct</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${records.map((r) => `<tr>
        <td>${esc(r.source)}</td>
        <td>${esc(r.mcId)}</td>
        <td>${esc(r.topic)}</td>
        <td>${r.timesLogged}×</td>
        <td>${r.practiceCorrect || 0}/2</td>
        <td><span class="status ${r.mastered ? "mastered" : ""}">${r.mastered ? "Mastered" : "Active"}</span></td>
        <td><div class="actions-inline">
          <button class="btn ghost" onclick="toggleMastered('${esc(r.id)}')">${r.mastered ? "Reactivate" : "Mark mastered"}</button>
          <button class="btn danger" onclick="deleteRecord('${esc(r.id)}')">Delete</button>
        </div></td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  function renderPractice() {
    const p = ui.practice;
    if (!p || !p.ids || !p.ids.length) {
      app.innerHTML = `<div class="card"><h1>Practice</h1><p>No active errors to practise.</p><button class="btn primary" onclick="exitPractice()">Back to error book</button></div>`;
      return;
    }
    if (p.complete) {
      app.innerHTML = `<div class="practice card">
        <h1>Practice complete</h1>
        <p class="sub">${p.score} correct out of ${p.total}.</p>
        <div class="score">${p.score} / ${p.total}</div>
        <div class="actions-inline"><button class="btn primary" onclick="startPractice()">Practise active again</button><button class="btn ghost" onclick="exitPractice()">Back to error book</button></div>
      </div>`;
      return;
    }
    const mcId = p.ids[p.index];
    const q = bankQuestion(mcId);
    const student = activeStudent();
    const rec = student && recordFor(student.id, mcId);
    if (!q) { p.index++; if (p.index >= p.ids.length) p.complete = true; render(); return; }
    const chosen = p.selected;
    const revealed = p.revealed;
    app.innerHTML = `<div class="practice card">
      <div class="progress">Question ${p.index + 1} of ${p.ids.length}</div>
      <div class="qmeta">${qMeta(q)}</div>
      <img class="qimg" src="${esc(q.image)}" width="${q.width}" height="${q.height}" alt="${esc(q.id)}">
      <div class="choices">${["A", "B", "C", "D"].map((letter) => {
        let cls = "choice";
        if (chosen === letter) cls += " selected";
        if (revealed && q.answer === letter) cls += " correct";
        if (revealed && chosen === letter && chosen !== q.answer) cls += " wrong";
        return `<button class="${cls}" type="button" onclick="choosePractice('${letter}')" ${revealed ? "disabled" : ""}>${letter}</button>`;
      }).join("")}</div>
      ${revealed ? `<div class="feedback ${chosen === q.answer ? "correct" : "wrong"}">${chosen === q.answer ? "Correct" : "Wrong — the correct answer is " + esc(q.answer)}</div>` : ""}
      <div class="actions-inline">
        ${revealed ? `<button class="btn primary" onclick="nextPractice()">${p.index + 1 < p.ids.length ? "Next question" : "Finish practice"}</button>` : `<button class="btn primary" onclick="submitPractice()" ${chosen ? "" : "disabled"}>Submit</button>`}
        <button class="btn ghost" onclick="exitPractice()">Exit</button>
      </div>
    </div>`;
  }

  function setDraft(key, value) {
    ui.draft[key] = value;
    ui.first = null; ui.confirmed = false; ui.preview = null; ui.error = ""; ui.saved = "";
    render();
  }

  function createStudent() {
    const input = document.getElementById("newStudentName");
    const name = (input && input.value || "").trim();
    if (!name) { toast("Enter a student name or ID."); return; }
    if (book.students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast("That student already exists.");
      return;
    }
    const s = { id: uid("student"), name, createdAt: new Date().toISOString() };
    book.students.push(s);
    book.activeStudentId = s.id;
    saveBook(); ui.error = ""; render(); toast("Student profile created.");
  }

  function switchStudent(id) {
    if (!book.students.some((s) => s.id === id)) return;
    book.activeStudentId = id;
    saveBook(); ui.preview = null; ui.first = null; ui.confirmed = false; ui.error = ""; ui.saved = "";
    render();
  }

  function showFirstQuestion() {
    ui.error = ""; ui.saved = ""; ui.preview = null; ui.confirmed = false;
    const key = paperKey();
    const first = bank.first[key];
    if (!first) {
      ui.first = null;
      ui.error = `No MC first question found for ${paperLabel()}. Check Month, TZ and Level.`;
      render(); return;
    }
    ui.first = first;
    render();
  }

  function confirmPaper() {
    if (!ui.first) return;
    ui.confirmed = true;
    ui.error = ""; ui.saved = "";
    render();
  }

  function changePaper() {
    ui.first = null; ui.confirmed = false; ui.preview = null; ui.error = ""; ui.saved = "";
    render();
  }

  function checkQuestion() {
    ui.error = ""; ui.saved = "";
    const raw = (document.getElementById("wrongQ") || {}).value || "";
    const qnum = Number(raw);
    if (!Number.isInteger(qnum) || qnum < 1 || qnum > 40) {
      ui.error = "Enter a question number from 1 to 40.";
      ui.preview = null; render(); return;
    }
    ui.qInput = String(qnum);
    const key = `${paperKey()}|${qnum}`;
    const mcId = bank.lookup[key];
    if (!mcId) {
      ui.error = `No MC question ${qnum} found for ${paperLabel()}.`;
      ui.preview = null; render(); return;
    }
    const q = bankQuestion(mcId);
    ui.preview = { id: mcId, q: qnum, source: (q.sources[0] || {}).label || `${paperLabel()} Q${qnum}` };
    render();
  }

  function clearPreview() {
    ui.preview = null; ui.error = ""; ui.saved = "";
    render();
  }

  function saveCurrentQuestion() {
    const student = activeStudent();
    if (!student || !ui.preview) return;
    const mcId = ui.preview.id;
    const q = bankQuestion(mcId);
    const now = new Date().toISOString();
    let rec = recordFor(student.id, mcId);
    if (rec) {
      rec.timesLogged = (rec.timesLogged || 0) + 1;
      rec.lastLoggedAt = now;
      if (rec.mastered) { rec.mastered = false; rec.practiceCorrect = 0; }
    } else {
      rec = {
        id: uid("record"),
        studentId: student.id,
        mcId,
        year: ui.draft.year,
        month: ui.draft.month,
        tz: ui.draft.tz,
        level: ui.draft.level,
        qNumber: ui.preview.q,
        source: ui.preview.source,
        topic: q.topic,
        topicTitle: q.topicTitle,
        addedAt: now,
        lastLoggedAt: now,
        timesLogged: 1,
        practiceCorrect: 0,
        mastered: false
      };
      book.records.push(rec);
    }
    saveBook();
    ui.saved = `Saved ${mcId} (${ui.preview.source}).`;
    ui.preview = null; ui.qInput = "";
    render();
    toast("Error logged.");
  }

  function toggleMastered(id) {
    const rec = book.records.find((r) => r.id === id);
    if (!rec) return;
    rec.mastered = !rec.mastered;
    if (rec.mastered) rec.practiceCorrect = 2;
    else rec.practiceCorrect = 0;
    saveBook(); render();
  }

  function deleteRecord(id) {
    const rec = book.records.find((r) => r.id === id);
    if (!rec) return;
    if (!confirm(`Delete ${rec.mcId} from the error book?`)) return;
    book.records = book.records.filter((r) => r.id !== id);
    saveBook(); render(); toast("Record deleted.");
  }

  function startPractice() {
    const student = activeStudent();
    if (!student) return;
    const ids = studentRecords(student.id).filter((r) => !r.mastered).map((r) => r.mcId);
    if (!ids.length) { toast("No active errors to practise."); return; }
    ui.practice = { ids: shuffle([...new Set(ids)]), index: 0, selected: null, revealed: false, score: 0, total: 0, complete: false };
    render();
  }

  function choosePractice(letter) {
    if (!ui.practice || ui.practice.revealed) return;
    ui.practice.selected = letter;
    render();
  }

  function submitPractice() {
    const p = ui.practice;
    if (!p || !p.selected) return;
    const q = bankQuestion(p.ids[p.index]);
    const student = activeStudent();
    const rec = student && recordFor(student.id, p.ids[p.index]);
    const correct = p.selected === q.answer;
    p.total += 1;
    if (correct) {
      p.score += 1;
      if (rec) {
        rec.practiceCorrect = (rec.practiceCorrect || 0) + 1;
        if (rec.practiceCorrect >= 2) rec.mastered = true;
      }
    }
    saveBook();
    p.revealed = true;
    render();
  }

  function nextPractice() {
    const p = ui.practice;
    if (!p) return;
    if (p.index + 1 >= p.ids.length) {
      p.complete = true;
    } else {
      p.index += 1;
      p.selected = null;
      p.revealed = false;
    }
    render();
  }

  function exitPractice() {
    ui.practice = null;
    render();
  }

  function exportBook() {
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "error-book-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBook(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result));
        if (!incoming || incoming.version !== 1 || !Array.isArray(incoming.students) || !Array.isArray(incoming.records)) {
          throw new Error("Not a valid error-book backup.");
        }
        let added = 0, merged = 0;
        for (const s of incoming.students) {
          if (!s || !s.id || !s.name) continue;
          if (!book.students.some((x) => x.id === s.id)) { book.students.push(s); added++; }
        }
        for (const r of incoming.records) {
          if (!r || !r.studentId || !r.mcId) continue;
          const existing = book.records.find((x) => x.studentId === r.studentId && x.mcId === r.mcId);
          if (!existing) { book.records.push(r); added++; }
          else {
            existing.practiceCorrect = Math.max(existing.practiceCorrect || 0, r.practiceCorrect || 0);
            existing.mastered = !!(existing.mastered || r.mastered);
            existing.timesLogged = Math.max(existing.timesLogged || 0, r.timesLogged || 0);
            if (String(r.lastLoggedAt || "") > String(existing.lastLoggedAt || "")) existing.lastLoggedAt = r.lastLoggedAt;
            merged++;
          }
        }
        if (!activeStudent() && book.students.length) book.activeStudentId = book.students[0].id;
        saveBook(); render();
        toast(`Import complete: ${added} added, ${merged} merged.`);
      } catch (error) {
        toast(error.message || "Could not import that file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  window.createStudent = createStudent;
  window.switchStudent = switchStudent;
  window.setDraft = setDraft;
  window.showFirstQuestion = showFirstQuestion;
  window.confirmPaper = confirmPaper;
  window.changePaper = changePaper;
  window.checkQuestion = checkQuestion;
  window.clearPreview = clearPreview;
  window.saveCurrentQuestion = saveCurrentQuestion;
  window.toggleMastered = toggleMastered;
  window.deleteRecord = deleteRecord;
  window.startPractice = startPractice;
  window.choosePractice = choosePractice;
  window.submitPractice = submitPractice;
  window.nextPractice = nextPractice;
  window.exitPractice = exitPractice;
  window.exportBook = exportBook;
  window.importBook = importBook;

  fetch("error-book/index.json")
    .then((r) => { if (!r.ok) throw new Error("Could not load error-book/index.json"); return r.json(); })
    .then((data) => { bank = data; render(); })
    .catch((error) => {
      app.innerHTML = `<div class="card"><h1>Could not load the MC bank</h1><p>${esc(error.message)}</p></div>`;
    });
})();
