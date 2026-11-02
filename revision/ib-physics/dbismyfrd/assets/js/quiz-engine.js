/*
 * Pure quiz helpers: filtering, prompt queues, grading, scoring.
 */
(function (root, factory) {
  "use strict";
  var engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  root.QuizEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function levelMatches(equationLevel, filter) {
    if (filter === "all" || filter === "hl") return true;
    if (filter === "sl") return equationLevel === "core";
    if (filter === "ahl") return equationLevel === "ahl";
    return true;
  }

  function filterEquations(data, filters) {
    var theme = filters && filters.theme ? filters.theme : "all";
    var topic = filters && filters.topic ? filters.topic : "all";
    var level = filters && filters.level ? filters.level : "all";
    return data.equations.filter(function (equation) {
      if (theme !== "all" && equation.theme !== theme) return false;
      if (topic !== "all" && equation.topic !== topic) return false;
      return levelMatches(equation.level, level);
    });
  }

  function promptId(equation, symbolIndex) {
    return equation.id + ":" + symbolIndex;
  }

  function promptsForEquation(equation) {
    return equation.symbols.map(function (symbol, symbolIndex) {
      return {
        id: promptId(equation, symbolIndex),
        equationId: equation.id,
        symbolIndex: symbolIndex,
        equation: equation,
        symbol: symbol
      };
    });
  }

  function buildQueue(data, filters) {
    var queue = [];
    filterEquations(data, filters).forEach(function (equation) {
      queue = queue.concat(promptsForEquation(equation));
    });
    return queue;
  }

  function buildAllQueue(data) {
    return buildQueue(data, { theme: "all", topic: "all", level: "all" });
  }

  function queueFromPromptIds(data, ids) {
    var wanted = new Set(ids);
    return buildAllQueue(data).filter(function (prompt) {
      return wanted.has(prompt.id);
    });
  }

  function grade(rawAnswer, prompt, matcher) {
    return matcher.classify(rawAnswer, prompt.symbol);
  }

  function isResolvedCorrect(response) {
    if (!response) return false;
    if (response.status === "correct") return true;
    if (response.status === "close" && response.confirmed === true) return true;
    return false;
  }

  function isMissed(response) {
    if (!response) return true;
    if (response.status === "skipped") return true;
    if (response.status === "invalid") return true;
    if (response.status === "incorrect") return true;
    if (response.status === "close" && response.confirmed !== true) return true;
    return false;
  }

  function summarise(data, queue, responses) {
    var summary = {
      total: queue.length,
      answered: 0,
      correct: 0,
      close: 0,
      incorrect: 0,
      skipped: 0,
      missedPrompts: [],
      byTopic: {},
      byTheme: {}
    };

    queue.forEach(function (prompt) {
      var response = responses[prompt.id];
      var topic = prompt.equation.topic;
      var theme = prompt.equation.theme;

      if (!summary.byTopic[topic]) {
        summary.byTopic[topic] = {
          topic: topic,
          name: prompt.equation.topicName,
          theme: theme,
          total: 0,
          correct: 0,
          close: 0,
          incorrect: 0,
          skipped: 0
        };
      }
      if (!summary.byTheme[theme]) {
        summary.byTheme[theme] = {
          theme: theme,
          total: 0,
          correct: 0,
          close: 0,
          incorrect: 0,
          skipped: 0
        };
      }

      var t = summary.byTopic[topic];
      var th = summary.byTheme[theme];
      t.total += 1;
      th.total += 1;

      if (!response) {
        summary.skipped += 1;
        t.skipped += 1;
        th.skipped += 1;
        summary.missedPrompts.push(prompt);
        return;
      }

      summary.answered += 1;
      if (isResolvedCorrect(response)) {
        summary.correct += 1;
        t.correct += 1;
        th.correct += 1;
      } else {
        summary.missedPrompts.push(prompt);
        if (response.status === "close") {
          summary.close += 1;
          t.close += 1;
          th.close += 1;
        } else if (response.status === "skipped") {
          summary.skipped += 1;
          t.skipped += 1;
          th.skipped += 1;
        } else {
          summary.incorrect += 1;
          t.incorrect += 1;
          th.incorrect += 1;
        }
      }
    });

    summary.percentage = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
    summary.missedPromptIds = summary.missedPrompts.map(function (prompt) { return prompt.id; });
    return summary;
  }

  function topicsWithCounts(data) {
    return data.topics.map(function (topic) {
      var equations = data.equations.filter(function (equation) { return equation.topic === topic.code; });
      return Object.assign({}, topic, {
        equations: equations,
        available: equations.length > 0
      });
    });
  }

  function uniqueValues(values) {
    var seen = new Set();
    return values.filter(function (value) {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  return {
    filterEquations: filterEquations,
    promptsForEquation: promptsForEquation,
    buildQueue: buildQueue,
    buildAllQueue: buildAllQueue,
    queueFromPromptIds: queueFromPromptIds,
    grade: grade,
    isResolvedCorrect: isResolvedCorrect,
    isMissed: isMissed,
    summarise: summarise,
    topicsWithCounts: topicsWithCounts,
    uniqueValues: uniqueValues
  };
});
