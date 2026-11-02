(function () {
  "use strict";

  var data = window.IB_PHYSICS_DATA;
  var renderer = window.SymbolRender;
  var STORAGE_KEY = "symbol-sense:review:v1";

  var CONSTANT_TOKENS = new Set([
    "G", "c", "h", "k_B", "R", "N_A", "σ", "ε_0", "μ_0", "R_0"
  ]);

  var state = {
    reviewed: {},
    flagged: {},
    changes: {},
    filters: {
      search: "",
      theme: "all",
      level: "all",
      status: "all",
      view: "flat"
    }
  };

  var originalById = {};
  var workingEquations = [];
  var prompts = [];
  var promptById = {};
  var riskById = {};
  var lastFiltered = [];
  var toastTimer = null;
  var mergePreview = null;
  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function uniqueAliases(values) {
    var seen = new Set();
    if (!Array.isArray(values)) {
      values = typeof values === "string" ? values.split(/[,;]+/) : [];
    }
    return values.map(function (value) {
      return String(value == null ? "" : value).trim();
    }).filter(function (value) {
      if (!value) return false;
      var key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function parseAliases(text) {
    return uniqueAliases(String(text || "").split(/[,;]+/));
  }

  function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function symbolEquals(a, b) {
    return a.canonical === b.canonical &&
      a.unit === b.unit &&
      arraysEqual(a.accepted, b.accepted);
  }

  function isChanged(prompt) {
    return !symbolEquals(prompt.symbol, prompt.original);
  }

  function hashString(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function computeBaseRevision() {
    return hashString(prompts.map(function (prompt) {
      return [
        prompt.id,
        prompt.original.canonical,
        prompt.original.accepted.join("|"),
        prompt.original.unit
      ].join("~");
    }).join(";;"));
  }

  function symbolKey(symbol) {
    var aliases = (symbol.accepted || []).map(function (alias) {
      return alias.toLowerCase();
    }).sort();
    return [
      String(symbol.canonical || "").toLowerCase(),
      aliases.join("|"),
      String(symbol.unit || "").toLowerCase()
    ].join("~");
  }

  function symbolDetail(symbol) {
    var parts = [];
    if (symbol.accepted && symbol.accepted.length) {
      parts.push("Accepts: " + symbol.accepted.join(" · "));
    } else {
      parts.push("No extra aliases");
    }
    if (symbol.unit) parts.push("Unit: " + symbol.unit);
    return parts.join(" · ");
  }

  function normalizeIncomingSymbol(symbol) {
    if (!isObject(symbol) || typeof symbol.canonical !== "string" || !symbol.canonical.trim()) {
      return null;
    }
    return {
      canonical: symbol.canonical.trim(),
      accepted: uniqueAliases(symbol.accepted || []),
      unit: typeof symbol.unit === "string" ? symbol.unit.trim() : ""
    };
  }

  function cacheElements() {
    el.search = $("review-search");
    el.theme = $("review-theme");
    el.level = $("review-level");
    el.status = $("review-status");
    el.view = $("review-view");
    el.progressText = $("review-progress-text");
    el.progressFill = $("review-progress-fill");
    el.changedCount = $("review-changed-count");
    el.flaggedCount = $("review-flagged-count");
    el.riskCount = $("review-risk-count");
    el.resultLine = $("review-result-line");
    el.list = $("review-list");
    el.empty = $("review-empty");
    el.next = $("review-next");
    el.riskButton = $("review-risk-button");
    el.exportChanges = $("export-changes");
    el.exportCurriculum = $("export-curriculum");
    el.mergeButton = $("merge-changes");
    el.mergeDialog = $("merge-dialog");
    el.mergeClose = $("merge-close");
    el.mergeBrowse = $("merge-browse");
    el.mergeDrop = el.mergeBrowse;
    el.mergeFileInput = $("merge-file-input");
    el.mergeFileList = $("merge-file-list");
    el.mergePreview = $("merge-preview");
    el.mergeSummary = $("merge-summary");
    el.mergeWarnings = $("merge-warnings");
    el.mergeConflicts = $("merge-conflicts");
    el.mergeReset = $("merge-reset");
    el.mergeCancel = $("merge-cancel");
    el.mergeApply = $("merge-apply");
    el.reset = $("reset-review");
    el.toast = $("review-toast");
  }

  function buildOriginalIndex() {
    originalById = {};
    data.equations.forEach(function (equation) {
      equation.symbols.forEach(function (symbol) {
        originalById[equation.id + ":" + symbol.index] = deepClone(symbol);
      });
    });
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!isObject(parsed)) return;
      state.reviewed = isObject(parsed.reviewed) ? parsed.reviewed : {};
      state.flagged = isObject(parsed.flagged) ? parsed.flagged : {};
      state.changes = isObject(parsed.changes) ? parsed.changes : {};
    } catch (error) {
      state.reviewed = {};
      state.flagged = {};
      state.changes = {};
    }
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: data.version,
        savedAt: new Date().toISOString(),
        reviewed: state.reviewed,
        flagged: state.flagged,
        changes: state.changes
      }));
    } catch (error) {
      showToast("Could not save the draft in this browser.");
    }
  }

  function buildWorking() {
    workingEquations = deepClone(data.equations);
    var symbolById = {};

    workingEquations.forEach(function (equation) {
      equation.symbols.forEach(function (symbol) {
        symbolById[equation.id + ":" + symbol.index] = symbol;
      });
    });

    Object.keys(state.changes).forEach(function (id) {
      var symbol = symbolById[id];
      var original = originalById[id];
      var change = state.changes[id];
      if (!symbol || !original || !isObject(change) || typeof change.canonical !== "string" || !change.canonical.trim()) {
        delete state.changes[id];
        return;
      }
      symbol.canonical = change.canonical.trim();
      symbol.accepted = Array.isArray(change.accepted) ? uniqueAliases(change.accepted) : original.accepted.slice();
      symbol.unit = typeof change.unit === "string" ? change.unit.trim() : original.unit;
      if (symbolEquals(symbol, original)) delete state.changes[id];
    });

    prompts = [];
    promptById = {};
    workingEquations.forEach(function (equation) {
      equation.symbols.forEach(function (symbol) {
        var id = equation.id + ":" + symbol.index;
        var prompt = {
          id: id,
          equation: equation,
          symbol: symbol,
          original: originalById[id]
        };
        prompts.push(prompt);
        promptById[id] = prompt;
      });
    });

    computeRisks();
  }

  function computeRisks() {
    var tokenMap = {};

    prompts.forEach(function (prompt) {
      var token = prompt.symbol.token;
      if (!tokenMap[token]) {
        tokenMap[token] = { count: 0, meanings: new Set() };
      }
      tokenMap[token].count += 1;
      tokenMap[token].meanings.add(prompt.symbol.canonical.toLowerCase());
    });

    riskById = {};
    prompts.forEach(function (prompt) {
      var reasons = [];
      var info = tokenMap[prompt.symbol.token];
      var canonicalWords = prompt.symbol.canonical.split(/\s+/).filter(Boolean);

      if (info && info.meanings.size >= 5) {
        reasons.push(info.meanings.size + " distinct meanings for this symbol");
      }
      if (CONSTANT_TOKENS.has(prompt.symbol.token) || /(^|\s)constant(\s|$)/i.test(prompt.symbol.canonical)) {
        reasons.push("physical constant");
      }
      if (prompt.symbol.token.indexOf(" ") !== -1 || (!/[ _\dΔ'\/]/.test(prompt.symbol.token) && prompt.symbol.token.length > 5)) {
        reasons.push("word-based prompt");
      }
      if (canonicalWords.length > 10) {
        reasons.push("long definition");
      }
      if (prompt.symbol.accepted.length >= 4) {
        reasons.push("multiple accepted aliases");
      }

      riskById[prompt.id] = reasons;
    });
  }

  function pruneReviewState() {
    Object.keys(state.reviewed).forEach(function (id) {
      if (!promptById[id]) delete state.reviewed[id];
    });
    Object.keys(state.flagged).forEach(function (id) {
      if (!promptById[id]) delete state.flagged[id];
    });
    Object.keys(state.changes).forEach(function (id) {
      if (!promptById[id] || !isChanged(promptById[id])) delete state.changes[id];
    });
    saveDraft();
  }

  function promptBlob(prompt) {
    return [
      prompt.equation.id,
      prompt.equation.topic,
      prompt.equation.topicName,
      prompt.equation.name,
      prompt.equation.level,
      prompt.equation.plain,
      prompt.symbol.token,
      prompt.symbol.canonical,
      prompt.symbol.unit,
      prompt.symbol.accepted.join(" "),
      (riskById[prompt.id] || []).join(" ")
    ].join(" ").toLowerCase();
  }

  function matches(prompt) {
    var filters = state.filters;
    if (filters.theme !== "all" && prompt.equation.theme !== filters.theme) return false;
    if (filters.level !== "all" && prompt.equation.level !== filters.level) return false;
    if (filters.status === "unreviewed" && state.reviewed[prompt.id]) return false;
    if (filters.status === "reviewed" && !state.reviewed[prompt.id]) return false;
    if (filters.status === "changed" && !isChanged(prompt)) return false;
    if (filters.status === "flagged" && !state.flagged[prompt.id]) return false;
    if (filters.status === "risk" && !(riskById[prompt.id] || []).length) return false;
    if (filters.search && promptBlob(prompt).indexOf(filters.search.toLowerCase()) === -1) return false;
    return true;
  }

  function filteredPrompts() {
    return prompts.filter(matches);
  }

  function renderSummary() {
    var reviewed = 0;
    var changed = 0;
    var flagged = 0;
    var risk = 0;

    prompts.forEach(function (prompt) {
      if (state.reviewed[prompt.id]) reviewed += 1;
      if (isChanged(prompt)) changed += 1;
      if (state.flagged[prompt.id]) flagged += 1;
      if ((riskById[prompt.id] || []).length) risk += 1;
    });

    el.progressText.textContent = reviewed + " / " + prompts.length;
    el.progressFill.style.width = (prompts.length ? (reviewed / prompts.length) * 100 : 0) + "%";
    el.changedCount.textContent = changed;
    el.flaggedCount.textContent = flagged;
    el.riskCount.textContent = risk;
    el.riskButton.textContent = "Risk queue (" + risk + ")";
    el.riskButton.disabled = risk === 0;
    el.exportChanges.disabled = !(changed > 0 || reviewed > 0 || flagged > 0);
  }

  function renderGroupHeader(equation, groupPrompts) {
    var head = make("div", "review-group-head");
    var title = make("div", "review-group-title");
    title.appendChild(make("span", "review-group-id", equation.id));
    title.appendChild(make("strong", "", equation.name));
    title.appendChild(make(
      "span",
      "review-group-meta",
      equation.topic + " · " + equation.topicName + " · " +
      renderer.levelLabel(equation.level) + " · p. " + equation.bookletPage
    ));

    var side = make("div", "review-group-side");
    var reviewedInGroup = groupPrompts.filter(function (prompt) {
      return state.reviewed[prompt.id];
    }).length;
    side.appendChild(make("span", "review-group-progress", reviewedInGroup + " / " + groupPrompts.length + " reviewed"));

    head.appendChild(title);
    head.appendChild(side);

    var wrapper = make("div", "review-group-header-wrap");
    wrapper.appendChild(head);

    var formula = make("div", "review-group-formula");
    renderer.renderEquation(formula, equation);
    wrapper.appendChild(formula);
    return wrapper;
  }

  function buildRow(prompt) {
    var row = make("div", "review-row");
    row.dataset.promptId = prompt.id;
    row.classList.toggle("is-reviewed", Boolean(state.reviewed[prompt.id]));
    row.classList.toggle("is-flagged", Boolean(state.flagged[prompt.id]));
    row.classList.toggle("is-changed", isChanged(prompt));

    var head = make("div", "review-row-head");

    var toggle = make("button", "review-toggle", state.reviewed[prompt.id] ? "✓" : "");
    toggle.classList.toggle("is-on", Boolean(state.reviewed[prompt.id]));
    toggle.type = "button";
    toggle.dataset.action = "review";
    toggle.setAttribute("aria-pressed", String(Boolean(state.reviewed[prompt.id])));
    toggle.setAttribute("aria-label", state.reviewed[prompt.id] ? "Mark as unreviewed" : "Mark as reviewed");
    toggle.title = state.reviewed[prompt.id] ? "Mark as unreviewed" : "Mark as reviewed";

    var symbol = make("span", "review-symbol");
    renderer.setSymbolDisplay(symbol, prompt.symbol.display);

    var main = make("div", "review-row-main");
    var meta = make(
      "div",
      "review-row-meta",
      prompt.equation.id + " · " + prompt.equation.name + " · " +
      prompt.equation.topic + " · " + renderer.levelLabel(prompt.equation.level) +
      " · p. " + prompt.equation.bookletPage
    );
    var answer = make("div", "review-answer");
    answer.appendChild(make("strong", "", prompt.symbol.canonical));
    if (prompt.symbol.unit) {
      answer.appendChild(make("span", "review-unit", prompt.symbol.unit));
    }

    var aliases = make(
      "div",
      "review-aliases",
      prompt.symbol.accepted.length
        ? "Accepts: " + prompt.symbol.accepted.join(" · ")
        : "No extra aliases"
    );

    main.appendChild(meta);
    main.appendChild(answer);
    main.appendChild(aliases);

    if (isChanged(prompt)) {
      var original = make(
        "div",
        "review-original",
        "Originally: " + prompt.original.canonical +
        (prompt.original.unit ? " · " + prompt.original.unit : "")
      );
      main.appendChild(original);
    }

    var side = make("div", "review-row-side");
    var reasons = riskById[prompt.id] || [];
    if (reasons.length) {
      main.appendChild(make("div", "review-risk-reasons", "Risk: " + reasons.join(" · ")));
    }
    if (reasons.length) {
      var riskBadge = make("span", "review-risk-badge", "Risk");
      riskBadge.title = reasons.join("; ");
      riskBadge.setAttribute("aria-label", "High-risk answer: " + reasons.join("; "));
      side.appendChild(riskBadge);
    }

    var flag = make("button", "review-icon-button" + (state.flagged[prompt.id] ? " is-flagged" : ""), state.flagged[prompt.id] ? "Flagged" : "Flag");
    flag.type = "button";
    flag.dataset.action = "flag";
    flag.setAttribute("aria-pressed", String(Boolean(state.flagged[prompt.id])));

    var edit = make("button", "review-icon-button", "Edit");
    edit.type = "button";
    edit.dataset.action = "edit";

    side.appendChild(flag);
    side.appendChild(edit);

    head.appendChild(toggle);
    head.appendChild(symbol);
    head.appendChild(main);
    head.appendChild(side);

    row.appendChild(head);
    row.appendChild(buildEditor(prompt));
    return row;
  }

  function buildEditor(prompt) {
    var form = document.createElement("form");
    form.className = "review-editor";
    form.hidden = true;

    var grid = make("div", "review-editor-grid");

    function field(labelText, name, value, placeholder) {
      var label = document.createElement("label");
      label.appendChild(make("span", "", labelText));
      var input = document.createElement("input");
      input.type = "text";
      input.name = name;
      input.value = value == null ? "" : value;
      input.autocomplete = "off";
      if (placeholder) input.placeholder = placeholder;
      label.appendChild(input);
      return label;
    }

    grid.appendChild(field("Canonical answer", "canonical", prompt.symbol.canonical, "Required"));
    grid.appendChild(field("Accepted aliases", "accepted", prompt.symbol.accepted.join(", "), "Comma-separated"));
    grid.appendChild(field("Unit", "unit", prompt.symbol.unit, "Optional"));

    var actions = make("div", "review-editor-actions");
    var save = make("button", "button button-primary", "Save changes");
    save.type = "submit";
    var cancel = make("button", "text-button", "Cancel");
    cancel.type = "button";
    cancel.dataset.action = "cancel";
    var revert = make("button", "text-button", "Revert to original");
    revert.type = "button";
    revert.dataset.action = "revert";
    revert.disabled = !isChanged(prompt);

    actions.appendChild(save);
    actions.appendChild(cancel);
    actions.appendChild(revert);
    form.appendChild(grid);
    form.appendChild(actions);
    return form;
  }

  function renderByEquation(filtered) {
    var groups = [];
    var byId = {};

    filtered.forEach(function (prompt) {
      if (!byId[prompt.equation.id]) {
        byId[prompt.equation.id] = {
          equation: prompt.equation,
          prompts: []
        };
        groups.push(byId[prompt.equation.id]);
      }
      byId[prompt.equation.id].prompts.push(prompt);
    });

    groups.forEach(function (group) {
      var section = make("section", "review-group");
      section.appendChild(renderGroupHeader(group.equation, group.prompts));
      group.prompts.forEach(function (prompt) {
        section.appendChild(buildRow(prompt));
      });
      el.list.appendChild(section);
    });
  }

  function renderBySymbol(filtered) {
    var byToken = {};
    filtered.forEach(function (prompt) {
      var token = prompt.symbol.token;
      if (!byToken[token]) {
        byToken[token] = {
          token: token,
          prompts: [],
          meanings: new Set()
        };
      }
      byToken[token].prompts.push(prompt);
      byToken[token].meanings.add(prompt.symbol.canonical.toLowerCase());
    });

    Object.keys(byToken).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    }).forEach(function (token) {
      var group = byToken[token];
      var section = make("section", "review-group review-symbol-group");
      var head = make("div", "review-symbol-head");

      var symbol = make("span", "review-symbol-large");
      renderer.setSymbolDisplay(symbol, group.token);
      var copy = make("div", "review-symbol-copy");
      copy.appendChild(make("strong", "", group.prompts.length + " " + (group.prompts.length === 1 ? "prompt" : "prompts")));
      copy.appendChild(make("span", "", group.meanings.size + " distinct " + (group.meanings.size === 1 ? "meaning" : "meanings")));

      head.appendChild(symbol);
      head.appendChild(copy);
      section.appendChild(head);

      group.prompts.forEach(function (prompt) {
        section.appendChild(buildRow(prompt));
      });
      el.list.appendChild(section);
    });
  }

  function renderList() {
    var filtered = filteredPrompts();
    lastFiltered = filtered;
    el.list.textContent = "";
    el.empty.hidden = filtered.length > 0;

    var changedInView = filtered.filter(isChanged).length;
    el.resultLine.textContent = "Showing " + filtered.length + " of " + prompts.length +
      " prompts · " + changedInView + " changed in this view.";

    if (!filtered.length) return;

    if (state.filters.view === "equation") {
      renderByEquation(filtered);
    } else if (state.filters.view === "symbol") {
      renderBySymbol(filtered);
    } else {
      filtered.forEach(function (prompt) {
        el.list.appendChild(buildRow(prompt));
      });
    }
  }

  function renderView(preserveScroll) {
    var y = preserveScroll ? window.scrollY : null;
    renderSummary();
    renderList();
    if (y !== null) window.scrollTo(0, y);
  }

  function syncControls() {
    el.search.value = state.filters.search;
    el.theme.value = state.filters.theme;
    el.level.value = state.filters.level;
    el.status.value = state.filters.status;
    el.view.value = state.filters.view;
  }

  function findRow(promptId) {
    var rows = el.list.querySelectorAll(".review-row");
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].dataset.promptId === promptId) return rows[i];
    }
    return null;
  }

  function closeEditor(row) {
    if (!row) return;
    row.classList.remove("is-editing");
    var form = row.querySelector(".review-editor");
    if (form) form.hidden = true;
  }

  function openEditor(row) {
    if (!row) return;
    Array.prototype.forEach.call(el.list.querySelectorAll(".review-row.is-editing"), closeEditor);
    row.classList.add("is-editing");
    var form = row.querySelector(".review-editor");
    if (!form) return;
    form.hidden = false;
    var input = form.querySelector('[name="canonical"]');
    if (input) input.focus();
  }

  function toggleReviewed(prompt) {
    if (state.reviewed[prompt.id]) {
      delete state.reviewed[prompt.id];
    } else {
      state.reviewed[prompt.id] = true;
    }
    saveDraft();
  }

  function toggleFlagged(prompt) {
    if (state.flagged[prompt.id]) {
      delete state.flagged[prompt.id];
    } else {
      state.flagged[prompt.id] = true;
    }
    saveDraft();
  }

  function updateChange(prompt) {
    if (symbolEquals(prompt.symbol, prompt.original)) {
      delete state.changes[prompt.id];
      return;
    }
    state.changes[prompt.id] = {
      canonical: prompt.symbol.canonical,
      accepted: prompt.symbol.accepted.slice(),
      unit: prompt.symbol.unit
    };
  }

  function revertPrompt(prompt) {
    prompt.symbol.canonical = prompt.original.canonical;
    prompt.symbol.accepted = prompt.original.accepted.slice();
    prompt.symbol.unit = prompt.original.unit;
    delete state.changes[prompt.id];
    saveDraft();
    computeRisks();
    showToast("Reverted to the original answer.");
    renderView(true);
  }

  function handleListClick(event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var row = button.closest(".review-row");
    if (!row) return;
    var prompt = promptById[row.dataset.promptId];
    if (!prompt) return;

    if (button.dataset.action === "review") {
      toggleReviewed(prompt);
      renderView(true);
    } else if (button.dataset.action === "flag") {
      toggleFlagged(prompt);
      renderView(true);
    } else if (button.dataset.action === "edit") {
      openEditor(row);
    } else if (button.dataset.action === "cancel") {
      closeEditor(row);
    } else if (button.dataset.action === "revert") {
      revertPrompt(prompt);
    }
  }

  function handleListSubmit(event) {
    var form = event.target.closest(".review-editor");
    if (!form) return;
    event.preventDefault();

    var row = form.closest(".review-row");
    var prompt = promptById[row.dataset.promptId];
    if (!prompt) return;

    var canonical = form.elements.canonical.value.trim();
    if (!canonical) {
      showToast("Canonical answer cannot be empty.");
      form.elements.canonical.focus();
      return;
    }

    prompt.symbol.canonical = canonical;
    prompt.symbol.accepted = parseAliases(form.elements.accepted.value);
    prompt.symbol.unit = form.elements.unit.value.trim();
    updateChange(prompt);
    computeRisks();
    saveDraft();
    showToast("Saved. Draft updated.");
    renderView(true);
  }

  function nextUnreviewed() {
    var next = lastFiltered.find(function (prompt) {
      return !state.reviewed[prompt.id];
    });

    if (!next && state.filters.status !== "unreviewed") {
      state.filters.status = "unreviewed";
      syncControls();
      renderView();
      next = lastFiltered.find(function (prompt) {
        return !state.reviewed[prompt.id];
      });
    }

    if (!next) {
      showToast("No unreviewed prompts match these filters.");
      return;
    }

    var row = findRow(next.id);
    if (!row) {
      showToast("The next unreviewed prompt is outside this view.");
      return;
    }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    openEditor(row);
  }

  function setRiskQueue() {
    state.filters.status = "risk";
    state.filters.view = "flat";
    syncControls();
    renderView();
    var y = el.list.offsetTop - 12;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function resetDraft() {
    if (!window.confirm("Reset all review flags and answer edits in this browser?")) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage errors; the in-memory reset still works.
    }
    state.reviewed = {};
    state.flagged = {};
    state.changes = {};
    state.filters = {
      search: "",
      theme: "all",
      level: "all",
      status: "all",
      view: "flat"
    };
    syncControls();
    buildWorking();
    renderView();
    showToast("Draft reset.");
  }

  function downloadFile(filename, contents, type) {
    var blob = new Blob([contents], { type: type || "text/plain" });
    var url = window.URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }

  function serializeCurriculum() {
    var exported = deepClone(data);
    exported.equations = deepClone(workingEquations);
    exported.generatedAt = new Date().toISOString().slice(0, 10);
    exported.source = exported.source || {};
    exported.source.reviewedAt = new Date().toISOString();
    var json = JSON.stringify(exported, null, 2);
    return "/*\n * Symbol Sense curriculum data\n * Exported from review.html on " + new Date().toISOString() + "\n" +
      " * Replace data/curriculum.js with this file, then run node tests/run-tests.js.\n */\n" +
      "(function (root) {\n" +
      "  \"use strict\";\n" +
      "  var data = " + json + ";\n" +
      "  if (typeof module === \"object\" && module.exports) module.exports = data;\n" +
      "  root.IB_PHYSICS_DATA = data;\n" +
      "})(typeof globalThis !== \"undefined\" ? globalThis : this);\n";
  }

  function exportCurriculum() {
    downloadFile("curriculum.js", serializeCurriculum(), "text/javascript");
    showToast("Downloaded curriculum.js. Replace data/curriculum.js and run the tests.");
  }

  function exportChanges() {
    var changed = prompts.filter(isChanged);
    var reviewedIds = Object.keys(state.reviewed).filter(function (id) { return promptById[id]; });
    var flaggedIds = Object.keys(state.flagged).filter(function (id) { return promptById[id]; });
    if (!changed.length && !reviewedIds.length && !flaggedIds.length) {
      showToast("No review changes or statuses to export.");
      return;
    }

    var payload = {
      schemaVersion: 2,
      version: data.version,
      baseRevision: computeBaseRevision(),
      exportedAt: new Date().toISOString(),
      reviewed: reviewedIds,
      flagged: flaggedIds,
      changes: changed.map(function (prompt) {
        return {
          promptId: prompt.id,
          equationId: prompt.equation.id,
          topic: prompt.equation.topic,
          token: prompt.symbol.token,
          original: {
            canonical: prompt.original.canonical,
            accepted: prompt.original.accepted,
            unit: prompt.original.unit
          },
          updated: {
            canonical: prompt.symbol.canonical,
            accepted: prompt.symbol.accepted,
            unit: prompt.symbol.unit
          }
        };
      })
    };
    downloadFile("symbol-sense-changes.json", JSON.stringify(payload, null, 2), "application/json");
    showToast("Downloaded the review file.");
  }


  function resetMergeState() {
    mergePreview = null;
    el.mergeFileInput.value = "";
    el.mergeFileList.textContent = "";
    el.mergePreview.hidden = true;
    el.mergeSummary.textContent = "";
    el.mergeWarnings.textContent = "";
    el.mergeConflicts.textContent = "";
    el.mergeApply.disabled = true;
    el.mergeApply.textContent = "Apply merge";
  }

  function openMergeDialog() {
    resetMergeState();
    if (typeof el.mergeDialog.showModal === "function") {
      el.mergeDialog.showModal();
    } else {
      el.mergeDialog.setAttribute("open", "");
    }
  }

  function closeMergeDialog() {
    if (el.mergeDialog.open && typeof el.mergeDialog.close === "function") {
      el.mergeDialog.close();
    } else {
      el.mergeDialog.removeAttribute("open");
      resetMergeState();
    }
  }

  function readMergeFile(file) {
    if (typeof file.text === "function") {
      return file.text().then(function (text) {
        return { fileName: file.name, text: text };
      }).catch(function () {
        return { fileName: file.name, error: "Could not read this file." };
      });
    }
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({ fileName: file.name, text: String(reader.result || "") });
      };
      reader.onerror = function () {
        resolve({ fileName: file.name, error: "Could not read this file." });
      };
      reader.readAsText(file);
    });
  }

  function handleMergeFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (file) {
      return /\.json$/i.test(file.name) || file.type === "application/json";
    });
    if (!files.length) {
      showToast("Choose one or more JSON review files.");
      return;
    }

    mergePreview = null;
    el.mergePreview.hidden = true;
    el.mergeApply.disabled = true;
    el.mergeFileList.textContent = "";
    files.forEach(function (file) {
      var row = make("div", "merge-file-row");
      row.appendChild(make("strong", "", file.name));
      row.appendChild(make("span", "", "Reading…"));
      el.mergeFileList.appendChild(row);
    });

    Promise.all(files.map(readMergeFile)).then(function (results) {
      try {
        var preview = buildMergePreview(results);
        mergePreview = preview;
        renderMergePreview(preview);
      } catch (error) {
        console.error(error);
        showToast("Could not parse those review files.");
      }
    });
  }

  function buildMergePreview(results) {
    var incomingById = {};
    var ignored = [];
    var warnings = [];
    var files = [];
    var validFiles = 0;
    var currentBase = computeBaseRevision();

    function ensureIncoming(id) {
      if (!incomingById[id]) {
        incomingById[id] = {
          id: id,
          prompt: promptById[id],
          variants: [],
          reviewed: false,
          flagged: false,
          sourceFiles: []
        };
      }
      return incomingById[id];
    }

    function addVariant(incoming, updated, fileName, baseMismatch) {
      var key = symbolKey(updated);
      var existing = incoming.variants.find(function (variant) { return variant.key === key; });
      if (existing) {
        if (existing.files.indexOf(fileName) === -1) existing.files.push(fileName);
        existing.baseMismatch = existing.baseMismatch || baseMismatch;
      } else {
        incoming.variants.push({
          key: key,
          updated: updated,
          files: [fileName],
          baseMismatch: Boolean(baseMismatch)
        });
      }
      if (incoming.sourceFiles.indexOf(fileName) === -1) incoming.sourceFiles.push(fileName);
    }

    results.forEach(function (result) {
      var info = {
        name: result.fileName,
        status: "ok",
        changeCount: 0,
        reviewedCount: 0,
        flaggedCount: 0,
        error: "",
        warning: false
      };
      files.push(info);

      if (result.error) {
        info.status = "error";
        info.error = result.error;
        return;
      }

      var payload;
      try {
        payload = JSON.parse(result.text);
      } catch (error) {
        info.status = "error";
        info.error = "Not valid JSON.";
        return;
      }

      if (!isObject(payload)) {
        info.status = "error";
        info.error = "The file does not contain a review object.";
        return;
      }

      if (payload.version && payload.version !== data.version) {
        warnings.push(result.fileName + " was exported from data version " + payload.version + ", not " + data.version + ".");
        info.warning = true;
      }

      if (payload.baseRevision && payload.baseRevision !== currentBase) {
        warnings.push(result.fileName + " was exported from a different base revision.");
        info.warning = true;
      }

      var changes = Array.isArray(payload.changes) ? payload.changes : [];
      var reviewed = Array.isArray(payload.reviewed) ? payload.reviewed : [];
      var flagged = Array.isArray(payload.flagged) ? payload.flagged : [];

      if (!changes.length && !reviewed.length && !flagged.length) {
        info.status = "error";
        info.error = "No changes or review statuses found.";
        return;
      }

      validFiles += 1;

      changes.forEach(function (change) {
        if (!isObject(change) || typeof change.promptId !== "string") {
          ignored.push({ file: result.fileName, promptId: "", reason: "Invalid change entry." });
          return;
        }
        var prompt = promptById[change.promptId];
        if (!prompt) {
          ignored.push({ file: result.fileName, promptId: change.promptId, reason: "Unknown prompt ID." });
          return;
        }
        var updated = normalizeIncomingSymbol(change.updated);
        if (!updated) {
          ignored.push({ file: result.fileName, promptId: change.promptId, reason: "Invalid updated answer." });
          return;
        }
        var baseMismatch = false;
        if (isObject(change.original)) {
          var original = normalizeIncomingSymbol(change.original);
          if (original && symbolKey(original) !== symbolKey(prompt.original)) {
            baseMismatch = true;
            warnings.push(result.fileName + " · " + change.promptId + " was based on a different original answer.");
            info.warning = true;
          }
        }
        addVariant(ensureIncoming(change.promptId), updated, result.fileName, baseMismatch);
        info.changeCount += 1;
      });

      reviewed.forEach(function (id) {
        if (!promptById[id]) {
          ignored.push({ file: result.fileName, promptId: id, reason: "Unknown reviewed prompt ID." });
          return;
        }
        ensureIncoming(id).reviewed = true;
        info.reviewedCount += 1;
      });

      flagged.forEach(function (id) {
        if (!promptById[id]) {
          ignored.push({ file: result.fileName, promptId: id, reason: "Unknown flagged prompt ID." });
          return;
        }
        ensureIncoming(id).flagged = true;
        info.flaggedCount += 1;
      });
    });

    var auto = [];
    var identical = [];
    var statusOnly = [];
    var conflicts = [];

    Object.keys(incomingById).forEach(function (id) {
      var incoming = incomingById[id];
      var prompt = incoming.prompt;
      if (!prompt) return;

      if (!incoming.variants.length) {
        statusOnly.push(incoming);
        return;
      }

      var currentKey = symbolKey(prompt.symbol);
      var uniqueKeys = incoming.variants.map(function (variant) { return variant.key; });
      var allSame = uniqueKeys.every(function (key) { return key === uniqueKeys[0]; });

      if (allSame) {
        var variant = incoming.variants[0];
        if (variant.key === currentKey) {
          identical.push({ incoming: incoming, variant: variant });
        } else if (isChanged(prompt)) {
          conflicts.push({
            incoming: incoming,
            current: prompt.symbol,
            variants: [variant],
            reason: "The current draft and the imported file differ."
          });
        } else if (variant.baseMismatch) {
          conflicts.push({
            incoming: incoming,
            current: prompt.symbol,
            variants: [variant],
            reason: "The imported file is based on a different original answer."
          });
        } else {
          auto.push({ incoming: incoming, variant: variant });
        }
      } else {
        conflicts.push({
          incoming: incoming,
          current: prompt.symbol,
          variants: incoming.variants,
          reason: isChanged(prompt)
            ? "The current draft and the imported files differ."
            : "The imported files disagree with each other."
        });
      }
    });

    var statusUpdates = Object.keys(incomingById).filter(function (id) {
      var incoming = incomingById[id];
      return incoming.reviewed || incoming.flagged;
    }).length;

    return {
      files: files,
      validFiles: validFiles,
      incomingById: incomingById,
      auto: auto,
      identical: identical,
      statusOnly: statusOnly,
      conflicts: conflicts,
      ignored: ignored,
      warnings: warnings,
      statusUpdates: statusUpdates,
      hasData: Boolean(auto.length || identical.length || statusOnly.length || conflicts.length)
    };
  }

  function renderMergeFileList(files) {
    el.mergeFileList.textContent = "";
    files.forEach(function (file) {
      var row = make("div", "merge-file-row" + (file.status === "error" ? " is-error" : "") + (file.warning ? " has-warning" : ""));
      row.appendChild(make("strong", "", file.name));
      if (file.status === "error") {
        row.appendChild(make("span", "", file.error));
      } else {
        row.appendChild(make(
          "span",
          "",
          file.changeCount + (file.changeCount === 1 ? " change" : " changes") + " · " +
          file.reviewedCount + " reviewed · " + file.flaggedCount + " flagged"
        ));
      }
      el.mergeFileList.appendChild(row);
    });
  }

  function mergeStat(value, label) {
    var node = make("div", "merge-stat");
    node.appendChild(make("strong", "", String(value)));
    node.appendChild(make("span", "", label));
    return node;
  }

  function renderMergePreview(preview) {
    renderMergeFileList(preview.files);
    el.mergePreview.hidden = false;
    el.mergeSummary.textContent = "";
    el.mergeWarnings.textContent = "";
    el.mergeConflicts.textContent = "";

    var invalidFiles = preview.files.filter(function (file) { return file.status === "error"; }).length;
    var candidateChanges = preview.auto.length + preview.conflicts.length;
    var summary = make("div", "merge-summary");
    summary.appendChild(mergeStat(preview.validFiles, "files read"));
    summary.appendChild(mergeStat(candidateChanges, "answer changes"));
    summary.appendChild(mergeStat(preview.conflicts.length, "conflicts"));
    summary.appendChild(mergeStat(preview.statusUpdates, "status updates"));
    summary.appendChild(mergeStat(preview.ignored.length + invalidFiles, "ignored"));
    el.mergeSummary.appendChild(summary);

    if (!preview.hasData) {
      el.mergeSummary.appendChild(make("p", "merge-empty", "No mergeable review data was found in those files."));
    }

    if (preview.warnings.length || preview.ignored.length) {
      if (preview.warnings.length) {
        var warningBox = document.createElement("details");
        warningBox.className = "merge-warning-box";
        warningBox.appendChild(make("summary", "", "Warnings (" + preview.warnings.length + ")"));
        var warningList = document.createElement("ul");
        preview.warnings.forEach(function (warning) {
          warningList.appendChild(make("li", "", warning));
        });
        warningBox.appendChild(warningList);
        el.mergeWarnings.appendChild(warningBox);
      }
      if (preview.ignored.length) {
        var ignoredBox = document.createElement("details");
        ignoredBox.className = "merge-warning-box";
        ignoredBox.appendChild(make("summary", "", "Ignored entries (" + preview.ignored.length + ")"));
        var ignoredList = document.createElement("ul");
        preview.ignored.slice(0, 50).forEach(function (entry) {
          ignoredList.appendChild(make("li", "", entry.file + " · " + (entry.promptId || "no prompt ID") + " · " + entry.reason));
        });
        if (preview.ignored.length > 50) {
          ignoredList.appendChild(make("li", "", "… and " + (preview.ignored.length - 50) + " more."));
        }
        ignoredBox.appendChild(ignoredList);
        el.mergeWarnings.appendChild(ignoredBox);
      }
    }

    if (preview.conflicts.length) {
      el.mergeConflicts.appendChild(make("h3", "merge-section-title", "Resolve conflicts (" + preview.conflicts.length + ")"));
      el.mergeConflicts.appendChild(make("p", "merge-section-note", "Nothing is applied until you click Apply merge. Keep current is selected by default."));
      preview.conflicts.forEach(function (conflict, index) {
        el.mergeConflicts.appendChild(buildMergeConflictCard(conflict, index));
      });
    } else if (preview.hasData) {
      el.mergeConflicts.appendChild(make("p", "merge-no-conflicts", "No conflicts. All valid changes will merge automatically."));
    }

    el.mergeApply.disabled = !preview.hasData;
    el.mergeApply.textContent = "Apply merge";
  }

  function buildMergeConflictCard(conflict, index) {
    var card = make("article", "merge-conflict");
    card.dataset.conflictIndex = String(index);

    var head = make("div", "merge-conflict-head");
    var symbol = make("span", "review-symbol-large");
    renderer.setSymbolDisplay(symbol, conflict.incoming.prompt.symbol.display);
    var copy = make("div", "merge-conflict-copy");
    copy.appendChild(make("strong", "", conflict.incoming.prompt.equation.name));
    copy.appendChild(make(
      "span",
      "",
      conflict.incoming.prompt.equation.id + " · " + conflict.incoming.prompt.equation.topic + " · " +
      conflict.incoming.prompt.symbol.token + " · " + conflict.reason
    ));
    head.appendChild(symbol);
    head.appendChild(copy);

    var options = make("div", "merge-options");

    function addOption(value, labelText, symbolData, files, checked) {
      var label = document.createElement("label");
      label.className = "merge-option";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "merge-choice-" + index;
      radio.value = value;
      radio.checked = Boolean(checked);

      var optionCopy = make("span", "merge-option-copy");
      optionCopy.appendChild(make("span", "merge-option-label", labelText));
      if (symbolData) {
        optionCopy.appendChild(make("strong", "", symbolData.canonical));
        optionCopy.appendChild(make("span", "merge-option-detail", symbolDetail(symbolData)));
      }
      if (files && files.length) {
        optionCopy.appendChild(make("span", "merge-option-source", files.join(", ")));
      }
      label.appendChild(radio);
      label.appendChild(optionCopy);
      options.appendChild(label);
    }

    addOption("current", "Keep current draft", conflict.current, [], true);
    conflict.variants.forEach(function (variant, variantIndex) {
      addOption(
        "import-" + variantIndex,
        "Accept imported" + (conflict.variants.length > 1 ? " option " + (variantIndex + 1) : ""),
        variant.updated,
        variant.files,
        false
      );
    });
    addOption("custom", "Use a custom value", null, [], false);

    var custom = make("div", "merge-custom");
    custom.hidden = true;

    function customField(labelText, key, value) {
      var label = document.createElement("label");
      label.appendChild(make("span", "", labelText));
      var input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.dataset.mergeCustom = key;
      input.value = value == null ? "" : value;
      label.appendChild(input);
      return label;
    }

    custom.appendChild(customField("Canonical answer", "canonical", conflict.current.canonical));
    custom.appendChild(customField("Accepted aliases", "accepted", conflict.current.accepted.join(", ")));
    custom.appendChild(customField("Unit", "unit", conflict.current.unit));

    card.appendChild(head);
    card.appendChild(options);
    card.appendChild(custom);
    return card;
  }

  function handleMergeChoiceChange(event) {
    var radio = event.target.closest('input[type="radio"]');
    if (!radio) return;
    var card = radio.closest(".merge-conflict");
    if (!card) return;
    var custom = card.querySelector(".merge-custom");
    if (!custom) return;
    custom.hidden = radio.value !== "custom";
    if (!custom.hidden) {
      var input = custom.querySelector('[data-merge-custom="canonical"]');
      if (input) input.focus();
    }
  }

  function applyIncomingStatus(incoming) {
    if (incoming.reviewed) state.reviewed[incoming.id] = true;
    if (incoming.flagged) state.flagged[incoming.id] = true;
  }

  function applyIncomingSymbol(prompt, updated) {
    prompt.symbol.canonical = updated.canonical;
    prompt.symbol.accepted = updated.accepted.slice();
    prompt.symbol.unit = updated.unit;
    updateChange(prompt);
  }

  function handleMergeApply() {
    if (!mergePreview) return;

    var cards = Array.prototype.slice.call(el.mergeConflicts.querySelectorAll(".merge-conflict"));
    var choices = [];
    var invalid = false;

    cards.forEach(function (card) {
      var checked = card.querySelector('input[type="radio"]:checked');
      var value = checked ? checked.value : "current";
      var choice = { value: value, custom: null };
      if (value === "custom") {
        var canonical = card.querySelector('[data-merge-custom="canonical"]').value.trim();
        if (!canonical) {
          showToast("A custom conflict answer cannot be empty.");
          card.querySelector('[data-merge-custom="canonical"]').focus();
          invalid = true;
          return;
        }
        choice.custom = {
          canonical: canonical,
          accepted: parseAliases(card.querySelector('[data-merge-custom="accepted"]').value),
          unit: card.querySelector('[data-merge-custom="unit"]').value.trim()
        };
      }
      choices.push(choice);
    });

    if (invalid) return;

    var applied = 0;
    var keptCurrent = 0;

    mergePreview.auto.forEach(function (item) {
      applyIncomingSymbol(item.incoming.prompt, item.variant.updated);
      applyIncomingStatus(item.incoming);
      applied += 1;
    });

    mergePreview.identical.forEach(function (item) {
      applyIncomingStatus(item.incoming);
    });

    mergePreview.statusOnly.forEach(function (incoming) {
      applyIncomingStatus(incoming);
    });

    mergePreview.conflicts.forEach(function (conflict, index) {
      var choice = choices[index] || { value: "current", custom: null };
      if (choice.value.indexOf("import-") === 0) {
        var variantIndex = Number(choice.value.slice(7));
        var variant = conflict.variants[variantIndex];
        if (variant) {
          applyIncomingSymbol(conflict.incoming.prompt, variant.updated);
          applyIncomingStatus(conflict.incoming);
          applied += 1;
        }
      } else if (choice.value === "custom" && choice.custom) {
        applyIncomingSymbol(conflict.incoming.prompt, choice.custom);
        applyIncomingStatus(conflict.incoming);
        applied += 1;
      } else {
        keptCurrent += 1;
      }
    });

    var fileCount = mergePreview.validFiles;
    computeRisks();
    saveDraft();
    renderView(true);
    closeMergeDialog();

    var message = "Merged " + applied + " answer change" + (applied === 1 ? "" : "s") +
      " from " + fileCount + " review file" + (fileCount === 1 ? "" : "s") + ".";
    if (keptCurrent) {
      message += " Kept the current answer for " + keptCurrent + " conflict" + (keptCurrent === 1 ? "" : "s") + ".";
    }
    showToast(message);
  }

  function showToast(message) {
    if (toastTimer) window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.hidden = false;
    toastTimer = window.setTimeout(function () {
      el.toast.hidden = true;
    }, 3200);
  }

  function bindEvents() {
    el.search.addEventListener("input", function () {
      state.filters.search = el.search.value;
      renderView();
    });
    el.theme.addEventListener("change", function () {
      state.filters.theme = el.theme.value;
      renderView();
    });
    el.level.addEventListener("change", function () {
      state.filters.level = el.level.value;
      renderView();
    });
    el.status.addEventListener("change", function () {
      state.filters.status = el.status.value;
      renderView();
    });
    el.view.addEventListener("change", function () {
      state.filters.view = el.view.value;
      renderView();
    });
    el.next.addEventListener("click", nextUnreviewed);
    el.riskButton.addEventListener("click", setRiskQueue);
    el.mergeButton.addEventListener("click", openMergeDialog);
    el.exportCurriculum.addEventListener("click", exportCurriculum);
    el.exportChanges.addEventListener("click", exportChanges);
    el.reset.addEventListener("click", resetDraft);
    el.list.addEventListener("click", handleListClick);
    el.list.addEventListener("submit", handleListSubmit);

    el.mergeBrowse.addEventListener("click", function () {
      el.mergeFileInput.click();
    });
    el.mergeFileInput.addEventListener("change", function () {
      if (el.mergeFileInput.files && el.mergeFileInput.files.length) {
        handleMergeFiles(el.mergeFileInput.files);
      }
    });
    el.mergeReset.addEventListener("click", resetMergeState);
    el.mergeCancel.addEventListener("click", closeMergeDialog);
    el.mergeClose.addEventListener("click", closeMergeDialog);
    el.mergeApply.addEventListener("click", handleMergeApply);
    el.mergeConflicts.addEventListener("change", handleMergeChoiceChange);
    el.mergeDialog.addEventListener("close", resetMergeState);
    el.mergeDialog.addEventListener("click", function (event) {
      if (event.target === el.mergeDialog) closeMergeDialog();
    });

    ["dragenter", "dragover"].forEach(function (type) {
      el.mergeBrowse.addEventListener(type, function (event) {
        event.preventDefault();
        el.mergeBrowse.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      el.mergeBrowse.addEventListener(type, function (event) {
        event.preventDefault();
        el.mergeBrowse.classList.remove("is-dragover");
      });
    });
    el.mergeBrowse.addEventListener("drop", function (event) {
      if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) {
        handleMergeFiles(event.dataTransfer.files);
      }
    });
  }

  function init() {
    cacheElements();
    buildOriginalIndex();
    loadDraft();
    buildWorking();
    pruneReviewState();
    syncControls();
    bindEvents();
    renderView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
