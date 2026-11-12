/* Role-aware quiz history, grouped by topic. */
(function () {
  "use strict";

  const TOPICS = [
    ["A1","Kinematics"],["A2","Forces and momentum"],["A3","Work, energy and power"],
    ["A4","Rigid body mechanics"],["A5","Galilean and special relativity"],
    ["B1","Thermal energy transfers"],["B2","Greenhouse effect"],["B3","Gas laws"],
    ["B4","Thermodynamics"],["B5","Current and circuits"],
    ["C1","Simple harmonic motion"],["C2","Wave model"],["C3","Wave phenomena"],
    ["C4","Standing waves and resonance"],["C5","Doppler effect"],
    ["D1","Gravitational fields"],["D2","Electric and magnetic fields"],
    ["D3","Motion in electromagnetic fields"],["D4","Induction"],
    ["E1","Structure of the atom"],["E2","Quantum physics"],["E3","Radioactive decay"],
    ["E4","Fission"],["E5","Fusion and stars"],["T3","Mathematics (units and measurement)"]
  ];
  const TOPIC_TITLE = Object.fromEntries(TOPICS);
  const TOPIC_INDEX = Object.fromEntries(TOPICS.map(([code], index) => [code, index]));
  const RESULT_LABEL = { correct: "Correct", almost: "Almost", learn: "Wrong" };
  const MODE_LABEL = {
    topic: "Topic",
    "topic-quick": "5-question round",
    theme: "Theme",
    all: "All topics"
  };

  const state = {
    auth: null,
    loading: true,
    error: "",
    noAnswersColumn: false,
    classes: [],
    roster: [],
    attempts: [],
    classId: "",
    studentId: "",
    topic: "all",
    needsWork: false
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function joined(value) {
    return Array.isArray(value) ? (value[0] || null) : (value || null);
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
    const name = auth && (auth.profile && auth.profile.display_name || auth.user && auth.user.email);
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

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (!total) return "0s";
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
  }

  function paperLabel(attempt) {
    const level = attempt.level ? ` · ${attempt.level}` : "";
    return `${MODE_LABEL[attempt.mode] || attempt.mode || "Quiz"}${level}`;
  }

  function selectionLabel(attempt) {
    if (attempt.mode === "all") return "All topics";
    if (attempt.mode === "theme") return `Theme ${attempt.selection || ""}`;
    if (attempt.mode === "topic" || attempt.mode === "topic-quick") {
      const title = TOPIC_TITLE[attempt.selection] || "";
      return attempt.selection ? `${attempt.selection}${title ? " — " + title : ""}` : "Topic";
    }
    return attempt.selection || "Quiz";
  }

  function resultClass(result) {
    return result === "correct" ? "correct" : result === "almost" ? "almost" : "learn";
  }

  function resultBadge(result) {
    return `<span class="status ${resultClass(result)}">${esc(RESULT_LABEL[result] || "Wrong")}</span>`;
  }

  function answersOf(attempt) {
    return Array.isArray(attempt.answers) ? attempt.answers : [];
  }

  function missingAnswersError(error) {
    return Boolean(error && (error.code === "42703" || /answers/i.test(error.message || "")));
  }

  async function fetchAttempts(sb, studentId) {
    const base = [
      "id", "class_id", "student_id", "completed_at", "level", "mode", "selection",
      "total_questions", "correct_count", "almost_count", "learn_count", "duration_seconds",
      "student:profiles!attempts_student_id_fkey(display_name)",
      "classroom:classes!attempts_class_id_fkey(name)"
    ].join(", ");
    const run = async (includeAnswers) => {
      let query = sb.from("attempts")
        .select(includeAnswers ? `${base}, answers` : base)
        .order("completed_at", { ascending: false })
        .limit(1000);
      if (studentId) query = query.eq("student_id", studentId);
      return query;
    };

    let result = await run(true);
    if (result.error && missingAnswersError(result.error)) {
      state.noAnswersColumn = true;
      result = await run(false);
    }
    if (result.error) throw result.error;
    return (result.data || []).map((attempt) => ({
      ...attempt,
      answers: answersOf(attempt),
      student: joined(attempt.student),
      classroom: joined(attempt.classroom)
    }));
  }

  async function loadTeacher(sb) {
    const [classesResult, rosterResult, attempts] = await Promise.all([
      sb.from("classes").select("id, name").order("name", { ascending: true }),
      sb.from("roster_students")
        .select("id, class_id, display_name, username, auth_user_id")
        .order("display_name", { ascending: true }),
      fetchAttempts(sb, "")
    ]);
    if (classesResult.error) throw classesResult.error;
    if (rosterResult.error) throw rosterResult.error;
    state.classes = classesResult.data || [];
    state.roster = rosterResult.data || [];
    state.attempts = attempts;
    if (!state.classId || !state.classes.some((item) => item.id === state.classId)) {
      const counts = new Map();
      for (const attempt of state.attempts) {
        counts.set(attempt.class_id, (counts.get(attempt.class_id) || 0) + 1);
      }
      const best = state.classes
        .slice()
        .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))[0];
      state.classId = best ? best.id : "";
    }
    if (state.studentId && !state.roster.some((item) => item.auth_user_id === state.studentId && item.class_id === state.classId)) {
      state.studentId = "";
    }
  }

  async function boot() {
    setAccount(null);
    document.getElementById("app").innerHTML = `<div class="card"><p class="attempt-sub">Loading quiz history…</p></div>`;
    if (!window.QuizAuth) {
      state.loading = false;
      state.error = "The account script did not load.";
      render();
      return;
    }
    try {
      const auth = await QuizAuth.getState();
      state.auth = auth;
      state.loading = false;
      if (auth.status === "student") {
        const sb = QuizAuth.getClient();
        state.attempts = await fetchAttempts(sb, auth.user.id);
      } else if (auth.status === "teacher") {
        await loadTeacher(QuizAuth.getClient());
      }
      render();
    } catch (error) {
      state.loading = false;
      state.error = error.message || "Could not load quiz history.";
      render();
    }
  }

  function filteredAttempts() {
    const teacher = state.auth && state.auth.status === "teacher";
    return state.attempts.filter((attempt) => {
      if (teacher && attempt.class_id !== state.classId) return false;
      if (teacher && state.studentId && attempt.student_id !== state.studentId) return false;
      return true;
    });
  }

  function studentName(attempt) {
    const profile = joined(attempt.student);
    if (profile && profile.display_name) return profile.display_name;
    const roster = state.roster.find((item) => item.auth_user_id === attempt.student_id);
    return roster ? roster.display_name : "Student";
  }

  function analyze(attempts) {
    const groups = new Map();
    let events = 0;
    for (const attempt of attempts) {
      for (const answer of answersOf(attempt)) {
        if (!answer || !answer.qid) continue;
        events += 1;
        const key = `${attempt.student_id || "student"}|${answer.qid}`;
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            studentId: attempt.student_id,
            studentName: studentName(attempt),
            qid: answer.qid,
            type: answer.type || "recall",
            topic: answer.topic || "—",
            topicTitle: answer.topicTitle || TOPIC_TITLE[answer.topic] || answer.topic || "Unknown topic",
            source: answer.source || "",
            question: answer.question || "",
            image: answer.image || "",
            alt: answer.alt || answer.qid,
            attempts: 0,
            wrongCount: 0,
            latestAt: "",
            latest: answer
          };
          groups.set(key, group);
        }
        group.attempts += 1;
        if (answer.result !== "correct") group.wrongCount += 1;
        const at = attempt.completed_at || "";
        if (!group.latestAt || at >= group.latestAt) {
          group.latestAt = at;
          group.latest = answer;
        }
      }
    }
    const topics = new Map();
    for (const group of groups.values()) {
      const code = group.topic || "—";
      if (!topics.has(code)) {
        topics.set(code, {
          code,
          title: group.topicTitle || TOPIC_TITLE[code] || code,
          questions: 0,
          responses: 0,
          correct: 0,
          almost: 0,
          learn: 0
        });
      }
      const topic = topics.get(code);
      topic.questions += 1;
      topic.responses += group.attempts;
      const result = group.latest.result || "learn";
      if (result === "correct") topic.correct += 1;
      else if (result === "almost") topic.almost += 1;
      else topic.learn += 1;
    }
    const list = Array.from(groups.values()).sort((a, b) => {
      const ai = TOPIC_INDEX[a.topic] == null ? 999 : TOPIC_INDEX[a.topic];
      const bi = TOPIC_INDEX[b.topic] == null ? 999 : TOPIC_INDEX[b.topic];
      if (ai !== bi) return ai - bi;
      return String(a.qid).localeCompare(String(b.qid), undefined, { numeric: true });
    });
    const topicList = Array.from(topics.values()).sort((a, b) => {
      const ai = TOPIC_INDEX[a.code] == null ? 999 : TOPIC_INDEX[a.code];
      const bi = TOPIC_INDEX[b.code] == null ? 999 : TOPIC_INDEX[b.code];
      return ai - bi;
    });
    const summary = { events, questions: list.length, correct: 0, almost: 0, learn: 0 };
    for (const group of list) {
      const result = group.latest.result || "learn";
      if (result === "correct") summary.correct += 1;
      else if (result === "almost") summary.almost += 1;
      else summary.learn += 1;
    }
    summary.accuracy = summary.questions ? Math.round((summary.correct / summary.questions) * 100) : 0;
    return { groups: list, topics: topicList, summary };
  }

  function classOptions() {
    return state.classes.map((item) =>
      `<option value="${esc(item.id)}" ${item.id === state.classId ? "selected" : ""}>${esc(item.name)}</option>`
    ).join("");
  }

  function studentOptions() {
    return state.roster
      .filter((item) => item.class_id === state.classId && item.auth_user_id)
      .map((item) =>
        `<option value="${esc(item.auth_user_id)}" ${item.auth_user_id === state.studentId ? "selected" : ""}>${esc(item.display_name)}</option>`
      ).join("");
  }

  function renderTopicCards(data) {
    if (!data.topics.length) {
      return `<div class="topic-empty">No question-level details yet. Older attempts did not store them; complete a new quiz to build topic history.</div>`;
    }
    return data.topics.map((topic) => {
      const total = topic.questions || 1;
      const accuracy = Math.round((topic.correct / total) * 100);
      const needs = topic.almost + topic.learn;
      const cls = topic.learn ? "needs" : topic.almost ? "mixed" : "good";
      return `<button type="button" class="topic-card ${cls} ${state.topic === topic.code ? "active" : ""}" onclick="qhSetTopic('${esc(topic.code)}')">
        <div class="topic-code">${esc(topic.code)}</div>
        <div class="topic-name">${esc(topic.title)}</div>
        <div class="topic-counts"><b>${topic.questions}</b> question${topic.questions === 1 ? "" : "s"} · <b>${needs}</b> need work</div>
        <div class="mini">${accuracy}% correct · ${topic.responses} attempt${topic.responses === 1 ? "" : "s"}</div>
      </button>`;
    }).join("");
  }

  function renderGroups(data) {
    let groups = data.groups;
    if (state.topic !== "all") groups = groups.filter((group) => group.topic === state.topic);
    if (state.needsWork) groups = groups.filter((group) => group.latest.result !== "correct");
    if (!groups.length) {
      return `<div class="empty">${state.needsWork ? "No wrong or partial questions in this selection." : "No attempted questions in this selection yet."}</div>`;
    }
    return groups.map((group) => {
      const answer = group.latest;
      const selected = Array.isArray(answer.selected) && answer.selected.length ? answer.selected.join(", ") : "—";
      const correct = answer.answer || "—";
      const body = group.image
        ? `<a href="${esc(group.image)}" target="_blank" rel="noopener"><img class="qimg" src="${esc(group.image)}" alt="${esc(group.alt)}" loading="lazy"></a>`
        : `<p class="qtext">${esc(group.question || group.qid)}</p>`;
      return `<article class="qcard ${resultClass(answer.result)}">
        <div class="qhead">
          ${resultBadge(answer.result)}
          ${state.auth && state.auth.status === "teacher" ? `<span class="student">${esc(group.studentName)}</span>` : ""}
          <b>${esc(group.qid)}</b>
          <span class="chip">${esc(group.topic)} — ${esc(group.topicTitle)}</span>
        </div>
        <p class="qmeta">${esc(group.source || "")} · ${group.attempts} attempt${group.attempts === 1 ? "" : "s"} · ${group.wrongCount} wrong/partial</p>
        ${body}
        <div class="qanswers">
          <div class="qanswer"><span>Your answer</span><b>${esc(selected)}</b></div>
          <div class="qanswer"><span>Correct answer</span><b>${esc(correct)}</b></div>
          <div class="qanswer"><span>Latest</span><b>${esc(formatDate(group.latestAt))}</b></div>
        </div>
      </article>`;
    }).join("");
  }

  function renderAttempts(attempts) {
    if (!attempts.length) return `<div class="empty">No completed attempts in this selection.</div>`;
    return attempts.map((attempt) => {
      const answers = answersOf(attempt);
      const rows = answers.length ? answers.map((answer) =>
        `<div class="attempt-answer">
          <div class="a-main"><b>${esc(answer.qid || "Question")}</b> · ${esc(answer.topic || "")} — ${esc(answer.topicTitle || "")}
            <div class="a-meta">${esc(answer.source || "")} · selected ${esc((answer.selected || []).join(", ") || "—")}</div>
          </div>
          <div class="a-state">${resultBadge(answer.result)}</div>
        </div>`
      ).join("") : `<div class="empty" style="padding:16px">Question-level detail was not recorded for this earlier attempt.</div>`;
      return `<details class="attempt">
        <summary>
          <div class="attempt-main">
            <span class="attempt-title">${esc(formatDate(attempt.completed_at))}</span>
            ${state.auth && state.auth.status === "teacher" ? `<span class="chip">${esc(studentName(attempt))}</span>` : ""}
            <span class="attempt-sub">${esc(paperLabel(attempt))} · ${esc(selectionLabel(attempt))} · ${formatDuration(attempt.duration_seconds)}</span>
          </div>
          <span class="attempt-score">${esc(attempt.correct_count)} / ${esc(attempt.total_questions)} correct</span>
        </summary>
        <div class="attempt-body">${rows}</div>
      </details>`;
    }).join("");
  }

  function render() {
    const app = document.getElementById("app");
    if (!app) return;
    if (state.auth) setAccount(state.auth);

    if (state.loading) {
      app.innerHTML = `<div class="card"><p class="attempt-sub">Loading quiz history…</p></div>`;
      return;
    }
    if (!state.auth || state.auth.status === "signed_out") {
      app.innerHTML = `<div class="hero"><h1>Quiz history</h1><p>Sign in to see completed attempts.</p></div>
        <div class="authcard"><h1>Sign in required</h1><p>Students sign in from the quiz page. Teachers sign in from the teacher dashboard.</p>
        <div class="auth-actions"><a class="btn primary" href="index.html">Student sign in</a><a class="btn ghost" href="teacher.html">Teacher sign in</a></div></div>`;
      return;
    }
    if (state.auth.status === "unconfigured") {
      app.innerHTML = `<div class="authcard"><h1>Setup required</h1><p>${esc(state.auth.message || "The account configuration is incomplete.")}</p></div>`;
      return;
    }
    if (state.auth.status === "unlinked") {
      app.innerHTML = `<div class="authcard"><h1>Account not linked</h1><p>${esc(state.auth.message || "Ask your teacher to link this account to the class roster.")}</p></div>`;
      return;
    }
    if (state.auth.status !== "student" && state.auth.status !== "teacher") {
      app.innerHTML = `<div class="authcard"><h1>Could not load history</h1><p>${esc(state.error || state.auth.message || "Unexpected account state.")}</p></div>`;
      return;
    }
    if (state.error) {
      app.innerHTML = `<div class="card"><div class="notice bad">${esc(state.error)}</div><button class="btn primary" onclick="location.reload()">Try again</button></div>`;
      return;
    }

    const isTeacher = state.auth.status === "teacher";
    const attempts = filteredAttempts();
    const data = analyze(attempts);
    const classItem = state.classes.find((item) => item.id === state.classId);
    const studentItem = state.roster.find((item) => item.auth_user_id === state.studentId);
    const scope = isTeacher
      ? `${classItem ? classItem.name : "Class"}${studentItem ? " · " + studentItem.display_name : " · all students"}`
      : "Your completed attempts";

    app.innerHTML = `
      <div class="hero">
        <h1>Quiz history</h1>
        <p>${esc(scope)} · grouped by topic</p>
      </div>
      ${state.noAnswersColumn ? `<div class="notice warn">Question-level details are unavailable until the <code>answers</code> database migration is applied.</div>` : ""}
      ${isTeacher ? `<div class="card" style="margin-bottom:14px"><div class="filters">
        <div class="field"><label for="classFilter">Class</label><select class="input" id="classFilter" onchange="qhSetClass(this.value)">${classOptions()}</select></div>
        <div class="field"><label for="studentFilter">Student</label><select class="input" id="studentFilter" onchange="qhSetStudent(this.value)"><option value="">All students</option>${studentOptions()}</select></div>
      </div></div>` : ""}
      <div class="stats">
        <div class="stat"><b>${attempts.length}</b><span>Attempts</span></div>
        <div class="stat"><b>${data.summary.questions}</b><span>Questions</span></div>
        <div class="stat"><b>${data.summary.correct}</b><span>Correct</span></div>
        <div class="stat"><b>${data.summary.almost + data.summary.learn}</b><span>Need work</span></div>
        <div class="stat"><b>${data.summary.accuracy}%</b><span>Accuracy</span></div>
      </div>
      <div class="toolbar">
        <div class="section-head" style="margin:0"><div><h2>By topic</h2><p>Latest result for each student-question pair.</p></div></div>
        <label class="toggle"><input type="checkbox" ${state.needsWork ? "checked" : ""} onchange="qhToggleNeedsWork(this.checked)"> Wrong / partial only</label>
      </div>
      <div class="topic-grid">${renderTopicCards(data)}</div>
      <div class="section-head">
        <div><h2>${state.topic === "all" ? "Attempted questions" : `${esc(state.topic)} — ${esc(TOPIC_TITLE[state.topic] || state.topic)}`}</h2>
        <p>${state.needsWork ? "Showing questions whose latest result was partial or wrong." : "Showing every attempted question in this scope."}</p></div>
        ${state.topic !== "all" ? `<button class="btn ghost" onclick="qhSetTopic('all')">Show all topics</button>` : ""}
      </div>
      <div class="question-list">${renderGroups(data)}</div>
      <div class="section-head"><div><h2>Attempts</h2><p>Completed attempts, newest first.</p></div></div>
      <div class="attempts">${renderAttempts(attempts)}</div>`;
  }

  window.qhSetClass = function (value) {
    state.classId = value;
    state.studentId = "";
    state.topic = "all";
    render();
  };
  window.qhSetStudent = function (value) {
    state.studentId = value;
    state.topic = "all";
    render();
  };
  window.qhSetTopic = function (value) {
    state.topic = state.topic === value ? "all" : value;
    render();
  };
  window.qhToggleNeedsWork = function (checked) {
    state.needsWork = Boolean(checked);
    render();
  };
  window.qhSignOut = async function () {
    try {
      await QuizAuth.signOut();
      location.reload();
    } catch (error) {
      toast(error.message || "Could not sign out.");
    }
  };

  boot();
})();
