(function () {
  "use strict";

  var data = window.IB_PHYSICS_DATA;
  var renderer = window.SymbolRender;
  var list = document.getElementById("coverage-list");
  var stats = document.getElementById("coverage-stats");
  var resultLine = document.getElementById("coverage-result-line");
  var empty = document.getElementById("coverage-empty");
  var search = document.getElementById("coverage-search");
  var themeSelect = document.getElementById("coverage-theme");
  var levelSelect = document.getElementById("coverage-level");
  var expandAll = document.getElementById("expand-all");
  var collapseAll = document.getElementById("collapse-all");

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function makeStat(value, label) {
    var node = make("span", "coverage-stat");
    node.appendChild(make("strong", "", String(value)));
    node.appendChild(document.createTextNode(label));
    return node;
  }

  function renderStats() {
    stats.textContent = "";
    stats.appendChild(makeStat(data.stats.equationCount, "printed equations"));
    stats.appendChild(makeStat(data.stats.promptCount, "symbol prompts"));
    stats.appendChild(makeStat(data.topics.filter(function (topic) {
      return topic.equationCount > 0;
    }).length, "topics with equations"));
    stats.appendChild(makeStat(data.stats.ahlCount, "HL-only equations"));
  }

  function searchableText(equation) {
    var pieces = [
      equation.id,
      equation.topic,
      equation.topicName,
      equation.name,
      equation.plain,
      equation.note,
      equation.level
    ];
    equation.symbols.forEach(function (symbol) {
      pieces.push(symbol.token);
      pieces.push(symbol.display);
      pieces.push(symbol.canonical);
      pieces.push(symbol.unit);
      pieces.push.apply(pieces, symbol.accepted);
    });
    return pieces.join(" ").toLowerCase();
  }

  function matches(equation) {
    var query = search.value.trim().toLowerCase();
    var theme = themeSelect.value;
    var level = levelSelect.value;
    if (theme !== "all" && equation.theme !== theme) return false;
    if (level !== "all" && equation.level !== level) return false;
    if (!query) return true;
    return searchableText(equation).indexOf(query) !== -1;
  }

  function buildSymbolRow(symbol) {
    var row = make("div", "symbol-row");
    var token = make("span", "symbol-token");
    renderer.setSymbolDisplay(token, symbol.display);
    row.appendChild(token);

    var body = make("div", "symbol-row-body");
    body.appendChild(make("strong", "", symbol.canonical));
    if (symbol.accepted.length) {
      body.appendChild(make("span", "symbol-alias", "Also accepts: " + symbol.accepted.join(" · ")));
    }
    if (symbol.unit) {
      body.appendChild(make("span", "symbol-alias", "Unit: " + symbol.unit));
    }
    row.appendChild(body);
    return row;
  }

  function buildEquation(equation, open) {
    var details = document.createElement("details");
    details.className = "coverage-equation";
    details.open = Boolean(open);
    details.dataset.theme = equation.theme;

    var summary = document.createElement("summary");
    summary.className = "coverage-summary";

    summary.appendChild(make("span", "coverage-id", equation.id));

    var main = make("span", "coverage-summary-main");
    main.appendChild(make("strong", "", equation.name));
    main.appendChild(make("span", "", equation.topic + " · " + equation.topicName + " · p. " + equation.bookletPage));
    summary.appendChild(main);

    var meta = make("span", "coverage-summary-meta");
    var level = make("span", "level-pill" + (equation.level === "ahl" ? " is-hl" : ""), renderer.levelLabel(equation.level));
    meta.appendChild(level);
    meta.appendChild(make("span", "coverage-symbol-count", equation.symbols.length + " " + (equation.symbols.length === 1 ? "symbol" : "symbols")));
    summary.appendChild(meta);

    var chevron = make("span", "coverage-chevron", "›");
    chevron.setAttribute("aria-hidden", "true");
    summary.appendChild(chevron);

    var detail = make("div", "coverage-detail");
    var formula = make("div", "coverage-formula");
    renderer.renderEquation(formula, equation);
    detail.appendChild(formula);

    if (equation.note) {
      detail.appendChild(make("p", "coverage-note", equation.note));
    }

    var symbolList = make("div", "coverage-symbols");
    equation.symbols.forEach(function (symbol) {
      symbolList.appendChild(buildSymbolRow(symbol));
    });
    detail.appendChild(symbolList);

    details.appendChild(summary);
    details.appendChild(detail);
    return details;
  }

  function renderList() {
    var equations = data.equations.filter(matches);
    var prompts = equations.reduce(function (sum, equation) {
      return sum + equation.symbols.length;
    }, 0);
    var query = search.value.trim();

    list.textContent = "";
    equations.forEach(function (equation) {
      list.appendChild(buildEquation(equation, Boolean(query) && equations.length <= 10));
    });

    resultLine.textContent =
      "Showing " + equations.length + " of " + data.equations.length + " equations · " +
      prompts + " symbol prompts" +
      (query ? " for “" + query + "”" : "") + ".";

    empty.hidden = equations.length > 0;
  }

  function setAllOpen(open) {
    Array.prototype.forEach.call(list.querySelectorAll("details"), function (details) {
      details.open = open;
    });
  }

  search.addEventListener("input", renderList);
  themeSelect.addEventListener("change", renderList);
  levelSelect.addEventListener("change", renderList);
  expandAll.addEventListener("click", function () { setAllOpen(true); });
  collapseAll.addEventListener("click", function () { setAllOpen(false); });

  renderStats();
  renderList();
})();
