/*
 * Rendering helpers shared by the quiz and coverage pages.
 */
(function (root) {
  "use strict";

  function renderEquation(element, equation) {
    if (!element) return;
    element.textContent = "";
    if (root.katex && equation.latex) {
      try {
        root.katex.render(equation.latex, element, {
          throwOnError: false,
          displayMode: true,
          strict: "ignore",
          trust: false
        });
        element.classList.add("is-rendered");
        return;
      } catch (error) {
        // Fall through to the readable plain-text equation.
      }
    }
    element.textContent = equation.plain;
    element.classList.remove("is-rendered");
  }

  function setSymbolDisplay(element, token) {
    if (!element) return;
    element.textContent = "";
    var text = String(token == null ? "" : token);
    var underscore = text.indexOf("_");
    if (underscore === -1) {
      element.textContent = text;
      return;
    }
    element.appendChild(document.createTextNode(text.slice(0, underscore)));
    var sub = document.createElement("sub");
    sub.textContent = text.slice(underscore + 1);
    element.appendChild(sub);
  }

  function levelLabel(level) {
    return level === "ahl" ? "HL only" : "SL/HL";
  }

  function themeLabel(data, themeId) {
    var theme = data.themes.find(function (item) { return item.id === themeId; });
    return theme ? theme.short : themeId;
  }

  function plural(count, singular, pluralForm) {
    return count === 1 ? singular : (pluralForm || singular + "s");
  }

  function formatPercent(value) {
    return String(Math.max(0, Math.min(100, Math.round(value)))) + "%";
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  root.SymbolRender = {
    renderEquation: renderEquation,
    setSymbolDisplay: setSymbolDisplay,
    levelLabel: levelLabel,
    themeLabel: themeLabel,
    plural: plural,
    formatPercent: formatPercent,
    make: make
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
