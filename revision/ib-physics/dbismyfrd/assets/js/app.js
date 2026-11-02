(function () {
  "use strict";

  var data = window.IB_PHYSICS_DATA;
  var matcher = window.AnswerMatcher;
  var engine = window.QuizEngine;
  var storage = window.SymbolStorage;
  var render = window.SymbolRender;

  var LEVEL_COPY = {
    all: "all levels",
    sl: "SL core",
    hl: "HL — core and AHL",
    ahl: "HL only"
  };

  var state = {
    screen: "home",
    filters: { level: "all", theme: "all" },
    session: null,
    result: null,
    feedback: null,
    lastFilters: null
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    el.screens = {
      home: $("screen-home"),
      quiz: $("screen-quiz"),
      results: $("screen-results")
    };
    el.statEquations = $("stat-equations");
    el.statPrompts = $("stat-prompts");
    el.statTopics = $("stat-topics");
    el.lastResultChip = $("last-result-chip");
    el.lastResultValue = $("last-result-value");
    el.levelFilter = $("level-filter");
    el.themeFilter = $("theme-filter");
    el.filterSummary = $("filter-summary");
    el.topicGrid = $("topic-grid");
    el.topicEmptyNote = $("topic-empty-note");
    el.startAll = $("start-all");
    el.startAllLabel = $("start-all-label");
    el.quizTopic = $("quiz-topic");
    el.quizLevel = $("quiz-level");
    el.quizEquationId = $("quiz-equation-id");
    el.quizEquationName = $("quiz-equation-name");
    el.quizEquation = $("quiz-equation");
    el.quizNote = $("quiz-note");
    el.targetSymbol = $("target-symbol");
    el.targetHint = $("target-hint");
    el.answerForm = $("answer-form");
    el.answerInput = $("answer-input");
    el.submitAnswer = $("submit-answer");
    el.feedback = $("feedback");
    el.skipQuestion = $("skip-question");
    el.nextQuestion = $("next-question");
    el.progressFill = $("progress-fill");
    el.progressLabel = $("progress-label");
    el.quizLiveScore = $("quiz-live-score");
    el.quitQuiz = $("quit-quiz");
    el.toast = $("toast");
    el.scoreRing = $("score-ring");
    el.scoreValue = $("score-value");
    el.scoreCaption = $("score-caption");
    el.resultsEyebrow = $("results-eyebrow");
    el.resultsTitle = $("results-title");
    el.resultsLede = $("results-lede");
    el.resultStats = $("result-stats");
    el.breakdownList = $("breakdown-list");
    el.missedSection = $("missed-section");
    el.missedCount = $("missed-count");
    el.missedList = $("missed-list");
    el.retryMissed = $("retry-missed");
    el.restartSession = $("restart-session");
    el.backHome = $("back-home");
  }

  function totalPrompts(equations) {
    return equations.reduce(function (sum, equation) {
      return sum + equation.symbols.length;
    }, 0);
  }

  function promptCountLabel(count) {
    return count + " symbol " + (count === 1 ? "prompt" : "prompts");
  }

  function init() {
    cacheElements();
    var saved = storage.get("settings", {});
    if (saved && ["all", "sl", "hl", "ahl"].indexOf(saved.level) !== -1) {
      state.filters.level = saved.level;
    }
    if (saved && ["all", "A", "B", "C", "D", "E"].indexOf(saved.theme) !== -1) {
      state.filters.theme = saved.theme;
    }

    el.statEquations.textContent = data.stats.equationCount;
    el.statPrompts.textContent = data.stats.promptCount;
    el.statTopics.textContent = data.topics.filter(function (topic) {
      return topic.equationCount > 0;
    }).length;

    renderLastResult();
    bindEvents();
    syncFilterUI();
    renderTopicGrid();
    updateFilterSummary();
    showScreen("home");
  }

  function bindEvents() {
    el.levelFilter.addEventListener("click", function (event) {
      var button = event.target.closest("[data-level]");
      if (!button) return;
      state.filters.level = button.dataset.level;
      persistSettings();
      syncFilterUI();
      renderTopicGrid();
      updateFilterSummary();
    });

    el.themeFilter.addEventListener("click", function (event) {
      var button = event.target.closest("[data-theme]");
      if (!button) return;
      state.filters.theme = button.dataset.theme;
      persistSettings();
      syncFilterUI();
      renderTopicGrid();
      updateFilterSummary();
    });

    el.startAll.addEventListener("click", function () {
      startSession({
        level: state.filters.level,
        theme: state.filters.theme,
        topic: "all"
      });
    });

    el.topicGrid.addEventListener("click", function (event) {
      var card = event.target.closest("[data-topic]");
      if (!card || card.disabled) return;
      startSession({
        level: state.filters.level,
        theme: state.filters.theme,
        topic: card.dataset.topic
      });
    });

    el.answerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (state.feedback) {
        nextQuestion();
        return;
      }
      submitAnswer();
    });

    el.skipQuestion.addEventListener("click", skipQuestion);
    el.nextQuestion.addEventListener("click", nextQuestion);
    el.quitQuiz.addEventListener("click", quitQuiz);
    el.retryMissed.addEventListener("click", retryMissed);
    el.restartSession.addEventListener("click", restartSession);
    el.backHome.addEventListener("click", goHome);

    el.feedback.addEventListener("click", function (event) {
      var button = event.target.closest("[data-feedback-action]");
      if (!button) return;
      handleFeedbackAction(button.dataset.feedbackAction);
    });
  }

  function renderLastResult() {
    var last = storage.get("lastResult", null);
    var hasScore = last && typeof last.percentage === "number";
    el.lastResultChip.hidden = !hasScore;
    if (hasScore) el.lastResultValue.textContent = last.percentage + "%";
  }

  function persistSettings() {
    storage.set("settings", {
      level: state.filters.level,
      theme: state.filters.theme
    });
  }

  function syncFilterUI() {
    Array.prototype.forEach.call(el.levelFilter.querySelectorAll("[data-level]"), function (button) {
      var active = button.dataset.level === state.filters.level;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    Array.prototype.forEach.call(el.themeFilter.querySelectorAll("[data-theme]"), function (button) {
      var active = button.dataset.theme === state.filters.theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateFilterSummary() {
    var equations = engine.filterEquations(data, {
      level: state.filters.level,
      theme: state.filters.theme,
      topic: "all"
    });
    var prompts = totalPrompts(equations);
    var themeText = state.filters.theme === "all" ? "all themes" : "Theme " + state.filters.theme;
    el.filterSummary.textContent =
      equations.length + " " + (equations.length === 1 ? "equation" : "equations") +
      " · " + promptCountLabel(prompts) + " — " +
      LEVEL_COPY[state.filters.level] + ", " + themeText + ".";
    el.startAll.disabled = equations.length === 0;
    el.startAllLabel.textContent = state.filters.theme === "all"
      ? "Practice all topics"
      : "Practice Theme " + state.filters.theme;
  }

  function renderTopicGrid() {
    var topics = engine.topicsWithCounts(data).filter(function (topic) {
      return state.filters.theme === "all" || topic.theme === state.filters.theme;
    });
    var visibleWithEquations = 0;
    el.topicGrid.textContent = "";

    topics.forEach(function (topic) {
      var equations = engine.filterEquations(data, {
        level: state.filters.level,
        theme: "all",
        topic: topic.code
      });
      var prompts = totalPrompts(equations);
      var disabled = equations.length === 0;
      if (!disabled) visibleWithEquations += 1;

      var card = document.createElement("button");
      card.type = "button";
      card.className = "topic-card theme-" + topic.theme + (disabled ? " is-disabled" : "");
      card.dataset.topic = topic.code;
      card.disabled = disabled;
      card.setAttribute("aria-label",
        topic.code + " " + topic.name + ". " +
        (disabled ? "No equations printed in the data booklet." : equations.length + " equations, " + promptCountLabel(prompts) + ".")
      );

      var top = document.createElement("span");
      top.className = "topic-card-top";

      var text = document.createElement("span");
      var code = document.createElement("span");
      code.className = "topic-code";
      code.textContent = topic.code;
      var name = document.createElement("span");
      name.className = "topic-name";
      name.textContent = topic.name;
      text.appendChild(code);
      text.appendChild(name);

      var pill = document.createElement("span");
      pill.className = "level-pill";
      if (disabled) {
        pill.textContent = "No equations";
      } else {
        var hasCore = equations.some(function (equation) { return equation.level === "core"; });
        var hasAhl = equations.some(function (equation) { return equation.level === "ahl"; });
        if (hasCore && hasAhl) {
          pill.textContent = "SL/HL + HL";
        } else if (hasAhl) {
          pill.textContent = "HL only";
          pill.classList.add("is-hl");
        } else {
          pill.textContent = "SL/HL";
        }
      }

      top.appendChild(text);
      top.appendChild(pill);

      var bottom = document.createElement("span");
      bottom.className = "topic-card-bottom";
      var count = document.createElement("span");
      count.className = "topic-count";
      if (disabled) {
        count.textContent = "No printed equations";
      } else {
        count.innerHTML = "<strong>" + equations.length + "</strong> " +
          (equations.length === 1 ? "equation" : "equations") +
          " · <strong>" + prompts + "</strong> prompts";
      }
      var arrow = document.createElement("span");
      arrow.className = "topic-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = disabled ? "—" : "→";
      bottom.appendChild(count);
      bottom.appendChild(arrow);

      card.appendChild(top);
      card.appendChild(bottom);
      el.topicGrid.appendChild(card);
    });

    el.topicEmptyNote.hidden = visibleWithEquations > 0;
  }

  function showScreen(name) {
    state.screen = name;
    Object.keys(el.screens).forEach(function (key) {
      el.screens[key].hidden = key !== name;
    });
    window.scrollTo(0, 0);
  }

  function startSession(filters, promptIds) {
    var queue = promptIds
      ? engine.queueFromPromptIds(data, promptIds)
      : engine.buildQueue(data, filters);
    if (!queue.length) {
      showToast("No symbol prompts match that selection.");
      return;
    }

    state.lastFilters = {
      level: filters.level,
      theme: filters.theme,
      topic: filters.topic
    };
    state.session = {
      queue: queue,
      cursor: 0,
      responses: {},
      filters: {
        level: filters.level,
        theme: filters.theme,
        topic: filters.topic
      },
      startedAt: Date.now(),
      isRetry: Boolean(promptIds)
    };
    state.feedback = null;
    state.result = null;
    showScreen("quiz");
    renderPrompt();
  }

  function currentPrompt() {
    if (!state.session) return null;
    return state.session.queue[state.session.cursor] || null;
  }

  function renderPrompt() {
    var prompt = currentPrompt();
    if (!prompt) {
      finishSession();
      return;
    }

    state.feedback = null;
    var session = state.session;

    el.quizTopic.textContent = prompt.equation.topic + " · " + prompt.equation.topicName;
    el.quizLevel.textContent = render.levelLabel(prompt.equation.level);
    el.quizLevel.classList.toggle("is-hl", prompt.equation.level === "ahl");
    el.quizEquationId.textContent = prompt.equation.id;
    el.quizEquationName.textContent = prompt.equation.name;
    el.quizNote.textContent = prompt.equation.note || "";
    render.renderEquation(el.quizEquation, prompt.equation);
    el.quizEquation.classList.toggle("is-long", prompt.equation.plain.length > 40);

    render.setSymbolDisplay(el.targetSymbol, prompt.symbol.display);
    el.targetSymbol.classList.toggle("is-word", prompt.symbol.display.length > 8 || prompt.symbol.display.indexOf(" ") !== -1);
    el.targetHint.textContent = "in this equation";

    el.answerInput.value = "";
    el.answerInput.disabled = false;
    el.submitAnswer.disabled = false;
    el.skipQuestion.hidden = false;
    el.nextQuestion.hidden = true;
    el.feedback.hidden = true;
    el.feedback.textContent = "";
    el.feedback.className = "feedback";

    var progress = ((session.cursor + 1) / session.queue.length) * 100;
    el.progressFill.style.width = progress + "%";
    el.progressLabel.textContent = (session.cursor + 1) + " / " + session.queue.length;
    updateLiveScore();

    window.requestAnimationFrame(function () {
      el.answerInput.focus();
    });
  }

  function submitAnswer() {
    var prompt = currentPrompt();
    if (!prompt) return;
    var raw = el.answerInput.value.trim();
    if (!raw) {
      showToast("Type an answer first.");
      el.answerInput.focus();
      return;
    }

    var verdict = engine.grade(raw, prompt, matcher);
    var response = {
      raw: raw,
      status: verdict.status,
      reason: verdict.reason,
      confirmed: verdict.status === "correct" ? true : null,
      verdict: verdict
    };
    state.session.responses[prompt.id] = response;
    showFeedback(prompt, response);
    updateLiveScore();
  }

  function skipQuestion() {
    var prompt = currentPrompt();
    if (!prompt || state.feedback) return;
    var response = {
      raw: "",
      status: "skipped",
      reason: "skipped",
      confirmed: false,
      verdict: {
        canonical: prompt.symbol.canonical,
        unit: prompt.symbol.unit
      }
    };
    state.session.responses[prompt.id] = response;
    showFeedback(prompt, response);
    updateLiveScore();
  }

  function showFeedback(prompt, response) {
    var symbol = prompt.symbol;
    var statusClass = "is-incorrect";
    var title = "Not quite.";
    var copy = "The correct meaning is shown below.";
    var closeUnconfirmed = response.status === "close" && response.confirmed == null;

    if (response.status === "correct" || (response.status === "close" && response.confirmed === true)) {
      statusClass = "is-correct";
      title = "Correct.";
      copy = response.reason === "typo"
        ? "That is the right meaning, allowing for a small spelling slip."
        : "That is the right meaning for this symbol.";
    } else if (closeUnconfirmed) {
      statusClass = "is-close";
      title = "Close.";
      copy = "The full answer has an extra qualifier. Does your wording mean the same thing?";
    } else if (response.status === "skipped") {
      statusClass = "is-close";
      title = "Answer revealed.";
      copy = "This one is now marked for review.";
    } else if (response.reason === "symbol-only") {
      copy = "That is the symbol itself. The quiz is asking what the symbol represents.";
    } else if (response.reason === "different-quantity") {
      copy = "That is a related quantity, but this symbol represents something different.";
    } else if (response.reason === "opposite-or-different-category") {
      copy = "That is the opposite or a different category. Check the qualifier in the answer.";
    } else if (response.status === "close" && response.confirmed === false) {
      statusClass = "is-incorrect";
      title = "Marked for review.";
      copy = "The full answer is shown below.";
    }

    state.feedback = response;
    el.feedback.hidden = false;
    el.feedback.className = "feedback " + statusClass;
    el.feedback.textContent = "";

    var top = document.createElement("div");
    top.className = "feedback-top";
    var icon = document.createElement("span");
    icon.className = "feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = statusClass === "is-correct" ? "✓" : (statusClass === "is-close" ? "≈" : "×");
    var copyWrap = document.createElement("div");
    var heading = document.createElement("p");
    heading.className = "feedback-title";
    heading.textContent = title;
    var detail = document.createElement("p");
    detail.className = "feedback-copy";
    detail.textContent = copy;
    copyWrap.appendChild(heading);
    copyWrap.appendChild(detail);
    top.appendChild(icon);
    top.appendChild(copyWrap);

    var answer = document.createElement("div");
    answer.className = "feedback-answer";
    var answerLabel = document.createElement("span");
    answerLabel.textContent = "Answer:";
    var answerValue = document.createElement("strong");
    answerValue.textContent = symbol.canonical;
    answer.appendChild(answerLabel);
    answer.appendChild(answerValue);
    if (symbol.unit) {
      var unit = document.createElement("span");
      unit.className = "feedback-unit";
      unit.textContent = "· " + symbol.unit;
      answer.appendChild(unit);
    }

    el.feedback.appendChild(top);
    el.feedback.appendChild(answer);

    if (closeUnconfirmed) {
      var actions = document.createElement("div");
      actions.className = "feedback-actions";

      var confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "button button-secondary";
      confirm.dataset.feedbackAction = "confirm";
      confirm.textContent = "Yes, I meant that";

      var reject = document.createElement("button");
      reject.type = "button";
      reject.className = "text-button";
      reject.dataset.feedbackAction = "reject";
      reject.textContent = "No, mark it wrong";

      actions.appendChild(confirm);
      actions.appendChild(reject);
      el.feedback.appendChild(actions);
    }

    el.answerInput.disabled = true;
    el.submitAnswer.disabled = true;
    el.skipQuestion.hidden = true;
    el.nextQuestion.hidden = false;
    el.nextQuestion.innerHTML = "";
    el.nextQuestion.appendChild(document.createTextNode(
      state.session.cursor >= state.session.queue.length - 1 ? "See results " : "Next symbol "
    ));
    var arrow = document.createElement("span");
    arrow.className = "button-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    el.nextQuestion.appendChild(arrow);

    window.requestAnimationFrame(function () {
      if (closeUnconfirmed) {
        var firstAction = el.feedback.querySelector("[data-feedback-action='confirm']");
        if (firstAction) firstAction.focus();
      } else {
        el.nextQuestion.focus();
      }
    });
  }

  function handleFeedbackAction(action) {
    var prompt = currentPrompt();
    if (!prompt) return;
    var response = state.session.responses[prompt.id];
    if (!response || response.status !== "close") return;

    if (action === "confirm") {
      response.confirmed = true;
    } else if (action === "reject") {
      response.confirmed = false;
    } else {
      return;
    }

    state.session.responses[prompt.id] = response;
    showFeedback(prompt, response);
    updateLiveScore();
  }

  function nextQuestion() {
    var prompt = currentPrompt();
    if (!prompt || !state.session) return;
    var response = state.session.responses[prompt.id];
    if (response && response.status === "close" && response.confirmed == null) {
      response.confirmed = false;
      state.session.responses[prompt.id] = response;
    }

    state.session.cursor += 1;
    if (state.session.cursor >= state.session.queue.length) {
      finishSession();
    } else {
      renderPrompt();
    }
  }

  function updateLiveScore() {
    if (!state.session) return;
    var count = 0;
    Object.keys(state.session.responses).forEach(function (id) {
      if (engine.isResolvedCorrect(state.session.responses[id])) count += 1;
    });
    el.quizLiveScore.textContent = count + " correct";
  }

  function finishSession() {
    if (!state.session) return;
    var summary = engine.summarise(data, state.session.queue, state.session.responses);
    state.result = summary;
    storage.set("lastResult", {
      date: new Date().toISOString(),
      percentage: summary.percentage,
      total: summary.total,
      correct: summary.correct,
      filters: state.session.filters
    });
    renderLastResult();
    renderResults(summary);
    showScreen("results");
  }

  function scoreTitle(percentage) {
    if (percentage >= 90) return "Excellent recall.";
    if (percentage >= 75) return "Strong work.";
    if (percentage >= 60) return "Good progress.";
    if (percentage >= 40) return "Keep building.";
    return "Start with the review list.";
  }

  function scoreLede(summary) {
    if (!summary.missedPrompts.length) {
      return "No missed symbols in this session. Try a different topic or raise the level filter.";
    }
    return "Review the " + summary.missedPrompts.length + " missed " +
      (summary.missedPrompts.length === 1 ? "symbol" : "symbols") +
      ", then retry only those prompts.";
  }

  function renderResults(summary) {
    var percentage = summary.percentage;
    el.scoreRing.style.setProperty("--score", percentage);
    el.scoreValue.textContent = percentage + "%";
    el.scoreCaption.textContent = "correct";
    el.resultsEyebrow.textContent = state.session && state.session.isRetry ? "Retry complete" : "Session complete";
    el.resultsTitle.textContent = scoreTitle(percentage);
    el.resultsLede.textContent = scoreLede(summary);

    el.resultStats.textContent = "";
    [
      ["correct", "Correct", summary.correct],
      ["close", "Unconfirmed close", summary.close],
      ["incorrect", "Incorrect", summary.incorrect],
      ["skipped", "Skipped", summary.skipped]
    ].forEach(function (row) {
      var stat = document.createElement("div");
      stat.className = "result-stat is-" + row[0];
      var value = document.createElement("strong");
      value.textContent = row[2];
      var label = document.createElement("span");
      label.textContent = row[1];
      stat.appendChild(value);
      stat.appendChild(label);
      el.resultStats.appendChild(stat);
    });

    el.breakdownList.textContent = "";
    var rows = Object.keys(summary.byTopic).map(function (code) {
      return summary.byTopic[code];
    }).sort(function (a, b) {
      return a.topic.localeCompare(b.topic, undefined, { numeric: true });
    });

    rows.forEach(function (row) {
      var pct = row.total ? Math.round((row.correct / row.total) * 100) : 0;
      var wrapper = document.createElement("div");
      wrapper.className = "breakdown-row";

      var topic = document.createElement("div");
      topic.className = "breakdown-topic";
      var strong = document.createElement("strong");
      strong.textContent = row.topic + " · " + row.name;
      var count = document.createElement("span");
      count.textContent = row.correct + " / " + row.total + " correct";
      topic.appendChild(strong);
      topic.appendChild(count);

      var bar = document.createElement("div");
      bar.className = "breakdown-bar";
      var fill = document.createElement("span");
      fill.style.width = pct + "%";
      bar.appendChild(fill);

      var score = document.createElement("div");
      score.className = "breakdown-score";
      score.textContent = pct + "%";

      wrapper.appendChild(topic);
      wrapper.appendChild(bar);
      wrapper.appendChild(score);
      el.breakdownList.appendChild(wrapper);
    });

    el.missedList.textContent = "";
    el.missedCount.textContent = summary.missedPrompts.length;
    el.retryMissed.disabled = summary.missedPrompts.length === 0;

    if (!summary.missedPrompts.length) {
      var empty = document.createElement("p");
      empty.className = "empty-results";
      empty.textContent = "Nothing missed in this session.";
      el.missedList.appendChild(empty);
    } else {
      summary.missedPrompts.forEach(function (prompt) {
        el.missedList.appendChild(buildMissedItem(prompt, state.session.responses[prompt.id]));
      });
    }
  }

  function buildMissedItem(prompt, response) {
    var details = document.createElement("details");
    details.className = "missed-item";

    var summary = document.createElement("summary");
    var token = document.createElement("span");
    token.className = "missed-token";
    render.setSymbolDisplay(token, prompt.symbol.display);

    var main = document.createElement("span");
    main.className = "missed-main";
    var title = document.createElement("strong");
    title.textContent = prompt.equation.name;
    var sub = document.createElement("span");
    sub.textContent = prompt.equation.topic + " · " + prompt.equation.topicName;
    main.appendChild(title);
    main.appendChild(sub);

    var chevron = document.createElement("span");
    chevron.className = "missed-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";

    summary.appendChild(token);
    summary.appendChild(main);
    summary.appendChild(chevron);

    var detail = document.createElement("div");
    detail.className = "missed-detail";

    var formula = document.createElement("div");
    formula.className = "missed-formula";
    render.renderEquation(formula, prompt.equation);

    var answer = document.createElement("div");
    answer.className = "missed-answer";
    var answerLabel = document.createElement("span");
    answerLabel.textContent = "Correct answer";
    var answerValue = document.createElement("strong");
    answerValue.textContent = prompt.symbol.canonical;
    answer.appendChild(answerLabel);
    answer.appendChild(answerValue);

    if (prompt.symbol.unit) {
      var unit = document.createElement("span");
      unit.className = "feedback-unit";
      unit.textContent = "Unit: " + prompt.symbol.unit;
      answer.appendChild(unit);
    }

    if (response && response.raw) {
      var given = document.createElement("span");
      given.textContent = "Your answer: " + response.raw;
      answer.appendChild(given);
    } else if (response && response.status === "skipped") {
      var skipped = document.createElement("span");
      skipped.textContent = "You skipped this one.";
      answer.appendChild(skipped);
    }

    detail.appendChild(formula);
    detail.appendChild(answer);
    details.appendChild(summary);
    details.appendChild(detail);
    return details;
  }

  function retryMissed() {
    if (!state.result || !state.result.missedPromptIds.length) return;
    var filters = state.session ? state.session.filters : state.lastFilters;
    startSession(filters, state.result.missedPromptIds);
  }

  function restartSession() {
    var filters = state.lastFilters || {
      level: state.filters.level,
      theme: state.filters.theme,
      topic: "all"
    };
    startSession(filters);
  }

  function quitQuiz() {
    var answered = state.session ? Object.keys(state.session.responses).length : 0;
    if (answered > 0 && !window.confirm("Leave this session? Your progress will be lost.")) {
      return;
    }
    goHome();
  }

  function goHome() {
    state.session = null;
    state.result = null;
    state.feedback = null;
    renderTopicGrid();
    updateFilterSummary();
    showScreen("home");
  }

  var toastTimer = null;

  function showToast(message) {
    if (toastTimer) window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.hidden = false;
    toastTimer = window.setTimeout(function () {
      el.toast.hidden = true;
    }, 2800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
