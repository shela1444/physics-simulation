/*
 * Local, dependency-free answer matcher for Symbol Sense.
 * Designed for short physics definitions, not general natural-language grading.
 */
(function (root, factory) {
  "use strict";
  var matcher = factory();
  if (typeof module === "object" && module.exports) module.exports = matcher;
  root.AnswerMatcher = matcher;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STOP_WORDS = new Set([
    "the", "a", "an", "of", "per", "to", "in", "on", "for", "at", "by",
    "with", "from", "that", "which", "is", "are", "be", "as", "and", "or",
    "its", "their", "this", "between", "during", "into", "than", "then"
  ]);

  var IRREGULAR = {
    nuclei: "nucleus",
    radii: "radius",
    momenta: "momentum",
    phenomena: "phenomenon",
    quanta: "quantum",
    masses: "mass",
    velocities: "velocity",
    energies: "energy",
    frequencies: "frequency",
    efficiencies: "efficiency",
    activities: "activity",
    resistivities: "resistivity",
    capacities: "capacity",
    axes: "axis",
    indices: "index",
    matrices: "matrix",
    vertices: "vertex",
    lives: "life",
    halves: "half",
    gases: "gas"
  };

  var PROTECTED_PLURALS = new Set([
    "physics", "mathematics", "analysis", "basis", "axis", "gas", "bias",
    "series", "parallel", "mass", "kinetics", "dynamics", "optics"
  ]);

  var CONFLICT_GROUPS = [
    ["initial", "final", "starting", "ending", "before", "after"],
    ["maximum", "minimum", "max", "min", "peak", "trough"],
    ["hot", "cold", "higher", "lower"],
    ["source", "observer"],
    ["incident", "refracted", "scattered", "emitted", "absorbed"],
    ["input", "output", "useful", "wasted"],
    ["series", "parallel"],
    ["internal", "external"],
    ["proper", "contracted", "dilated", "observed"],
    ["electric", "magnetic", "gravitational"],
    ["kinetic", "potential"],
    ["static", "dynamic", "kinetic"],
    ["longitudinal", "transverse"],
    ["angular", "linear", "translational", "rotational"],
    ["average", "instantaneous"],
    ["positive", "negative"],
    ["increase", "decrease", "rise", "fall"],
    ["real", "virtual"],
    ["mass", "charge"],
    ["work", "heat"],
    ["speed", "acceleration"],
    ["period", "frequency"],
    ["density", "pressure"],
    ["current", "voltage"],
    ["resistance", "resistivity"],
    ["wavelength", "frequency"],
    ["amplitude", "displacement"]
  ];

  var CHANGE_MODIFIERS = new Set([
    "change", "difference", "rate", "gradient", "increase", "decrease",
    "delta", "variation", "energy", "density", "unit"
  ]);

  var FORM_QUALIFIERS = new Set([
    "angular", "linear", "rotational", "translational"
  ]);

  var GREEK = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "Δ": "delta",
    "ε": "epsilon", "η": "eta", "θ": "theta", "λ": "lambda", "μ": "mu",
    "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "φ": "phi",
    "Φ": "phi", "ω": "omega", "Ω": "omega", "Ω": "omega"
  };

  var COMMON_ALIASES = {
    "density": ["mass per unit volume"],
    "pressure": ["force per unit area"],
    "electric current": ["rate of flow of charge", "charge per unit time"],
    "potential difference": ["work done per unit charge", "energy transferred per unit charge"],
    "resistance": ["potential difference per unit current", "ratio of potential difference to current"],
    "speed": ["distance travelled per unit time", "rate of change of distance"],
    "velocity": ["rate of change of displacement", "displacement per unit time"],
    "acceleration": ["rate of change of velocity", "change in velocity per unit time"],
    "frequency": ["number of oscillations per second", "number of cycles per second"],
    "period": ["time for one complete oscillation", "time for one complete cycle"],
    "wavelength": ["distance between successive crests", "distance between adjacent crests"],
    "momentum": ["mass times velocity", "mass multiplied by velocity"],
    "linear momentum": ["mass times velocity", "mass multiplied by velocity"],
    "impulse": ["force times time", "change in momentum"],
    "work done": ["force times distance", "energy transferred by a force"],
    "power": ["rate of doing work", "energy transferred per unit time", "work done per unit time"],
    "kinetic energy": ["energy of motion", "energy due to motion"],
    "gravitational potential energy": ["energy due to position in a gravitational field"],
    "elastic potential energy": ["energy stored in a stretched or compressed spring"],
    "efficiency": ["useful output divided by total input", "useful energy output over total energy input"],
    "half-life": ["time for half the nuclei to decay", "time for activity to halve"],
    "activity": ["decays per second", "number of decays per unit time"],
    "gravitational field strength": ["force per unit mass"],
    "electric field strength": ["force per unit charge"],
    "gravitational potential": ["gravitational potential energy per unit mass"],
    "electric potential": ["electric potential energy per unit charge"],
    "magnetic flux": ["magnetic flux density times area", "field lines passing through an area"],
    "magnetic flux density": ["force per unit current per unit length"],
    "refractive index": ["ratio of speed of light in vacuum to speed in medium", "ratio of sine of angle of incidence to sine of angle of refraction"],
    "specific heat capacity": ["energy required per unit mass per unit temperature change", "energy needed per kilogram per kelvin"],
    "specific latent heat": ["energy required per unit mass to change state", "energy needed per kilogram to change state"],
    "thermal conductivity": ["rate of heat transfer per unit area per unit temperature gradient"],
    "electromotive force": ["energy transferred per unit charge", "work done per unit charge"],
    "work function": ["minimum energy needed to remove an electron from a metal surface"],
    "decay constant": ["probability of decay per unit time"],
    "emissivity": ["fraction of black-body power emitted at the same temperature"],
    "albedo": ["fraction of incident power scattered or reflected"]
  };

  function stripDiacritics(value) {
    return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalize(value) {
    var text = String(value == null ? "" : value);
    text = stripDiacritics(text);
    text = text.replace(/[’']s\b/gi, "");
    text = text.replace(/[’']/g, "");
    text = text.replace(/[–—−]/g, " ");
    text = text.replace(/[αβγδΔεηθλμπρστφΦωΩ]/g, function (letter) {
      return " " + (GREEK[letter] || letter) + " ";
    });
    text = text.toLowerCase();
    text = text.replace(/[^a-z0-9%+\- ]/g, " ");
    text = text.replace(/-/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/^(?:the|a|an)\s+/, "");
    return text;
  }

  function singularize(word) {
    if (!word) return word;
    if (IRREGULAR[word]) return IRREGULAR[word];
    if (PROTECTED_PLURALS.has(word)) return word;
    if (word.length <= 3) return word;
    if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
    if (/(ches|shes|ses|xes|zes)$/.test(word)) return word.slice(0, -2);
    if (word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
    return word;
  }

  function contentTokens(text) {
    return normalize(text).split(" ").filter(function (token) {
      return token && !STOP_WORDS.has(token);
    }).map(singularize);
  }

  function tokenKey(text) {
    return contentTokens(text).join(" ");
  }

  function containsSequence(haystack, needle) {
    if (!needle.length || needle.length > haystack.length) return false;
    for (var i = 0; i <= haystack.length - needle.length; i += 1) {
      var matches = true;
      for (var j = 0; j < needle.length; j += 1) {
        if (haystack[i + j] !== needle[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    return false;
  }

  function hasConflict(inputTokens, canonicalTokens) {
    var inputSet = new Set(inputTokens);
    var canonicalSet = new Set(canonicalTokens);
    for (var i = 0; i < CONFLICT_GROUPS.length; i += 1) {
      var group = CONFLICT_GROUPS[i];
      var inputHits = group.filter(function (word) { return inputSet.has(word); });
      var canonicalHits = group.filter(function (word) { return canonicalSet.has(word); });
      if (inputHits.length && canonicalHits.length) {
        var shared = inputHits.some(function (word) { return canonicalHits.indexOf(word) !== -1; });
        if (!shared) return true;
      }
    }
    return false;
  }

  function hasNewChangeModifier(inputTokens, canonicalTokens) {
    var canonicalSet = new Set(canonicalTokens);
    return inputTokens.some(function (token) {
      if (canonicalSet.has(token)) return false;
      return CHANGE_MODIFIERS.has(token) || FORM_QUALIFIERS.has(token);
    });
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var previous = new Array(b.length + 1);
    var current = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j += 1) previous[j] = j;
    for (var i = 1; i <= a.length; i += 1) {
      current[0] = i;
      for (var k = 1; k <= b.length; k += 1) {
        var cost = a[i - 1] === b[k - 1] ? 0 : 1;
        current[k] = Math.min(
          current[k - 1] + 1,
          previous[k] + 1,
          previous[k - 1] + cost
        );
      }
      var swap = previous;
      previous = current;
      current = swap;
    }
    return previous[b.length];
  }

  function overlapStats(inputTokens, canonicalTokens) {
    var inputSet = new Set(inputTokens);
    var canonicalSet = new Set(canonicalTokens);
    var shared = 0;
    canonicalSet.forEach(function (token) {
      if (inputSet.has(token)) shared += 1;
    });
    return {
      shared: shared,
      inputCoverage: inputTokens.length ? shared / inputTokens.length : 0,
      canonicalCoverage: canonicalTokens.length ? shared / canonicalTokens.length : 0
    };
  }

  function buildVariants(symbol) {
    var common = COMMON_ALIASES[symbol.canonical] || [];
    var all = [symbol.canonical].concat(symbol.accepted || []).concat(common);
    var seen = new Set();
    return all.map(function (answer) {
      return {
        label: answer,
        normalized: normalize(answer),
        tokens: contentTokens(answer)
      };
    }).filter(function (variant) {
      var key = variant.tokens.join(" ");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function makeResult(status, reason, extra) {
    var result = { status: status, reason: reason || "" };
    if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
    return result;
  }

  function classify(rawAnswer, symbol) {
    if (!symbol || !symbol.canonical) {
      return makeResult("invalid", "missing-symbol");
    }
    var raw = String(rawAnswer == null ? "" : rawAnswer).trim();
    if (!raw) return makeResult("invalid", "empty");

    var inputNormalized = normalize(raw);
    var inputTokens = contentTokens(raw);
    var variants = buildVariants(symbol);

    if (!inputTokens.length) return makeResult("invalid", "empty");

    var tokenOnly = normalize(symbol.token).replace(/\s+/g, "");
    var compactInput = inputNormalized.replace(/\s+/g, "");
    if (compactInput && compactInput === tokenOnly && normalize(symbol.canonical) !== inputNormalized) {
      return makeResult("incorrect", "symbol-only", {
        canonical: symbol.canonical
      });
    }

    var canonicalTokens = contentTokens(symbol.canonical);
    var conflict = hasConflict(inputTokens, canonicalTokens);
    var changedQuantity = hasNewChangeModifier(inputTokens, canonicalTokens);
    var eligible = variants.filter(function (variant) {
      return !hasConflict(inputTokens, variant.tokens) &&
        !hasNewChangeModifier(inputTokens, variant.tokens);
    });

    for (var i = 0; i < eligible.length; i += 1) {
      var variant = eligible[i];
      if (!variant.tokens.length) continue;
      if (inputNormalized === variant.normalized) {
        return makeResult("correct", "exact", {
          matched: variant.label,
          canonical: symbol.canonical
        });
      }
      if (containsSequence(inputTokens, variant.tokens)) {
        return makeResult("correct", "contains", {
          matched: variant.label,
          canonical: symbol.canonical
        });
      }
    }

    for (var j = 0; j < eligible.length; j += 1) {
      var candidate = eligible[j];
      if (!candidate.tokens.length) continue;
      if (candidate.tokens.length < 2 && candidate.tokens[0].length < 7) continue;
      var target = candidate.tokens.join(" ");
      var distance = levenshtein(inputTokens.join(" "), target);
      var allowed = target.length >= 12 ? 2 : 1;
      if (distance > 0 && distance <= allowed) {
        return makeResult("correct", "typo", {
          matched: candidate.label,
          canonical: symbol.canonical
        });
      }
    }

    if (conflict) {
      return makeResult("incorrect", "opposite-or-different-category", {
        canonical: symbol.canonical
      });
    }

    if (changedQuantity) {
      return makeResult("incorrect", "different-quantity", {
        canonical: symbol.canonical
      });
    }

    var best = null;
    for (var k = 0; k < variants.length; k += 1) {
      var stats = overlapStats(inputTokens, variants[k].tokens);
      var score = (stats.inputCoverage * 0.55) + (stats.canonicalCoverage * 0.45);
      if (!best || score > best.score) {
        best = { score: score, stats: stats, variant: variants[k] };
      }
    }

    if (best && best.stats.canonicalCoverage >= 0.5 && best.stats.inputCoverage >= 0.5) {
      return makeResult("close", "partial-answer", {
        matched: best.variant.label,
        canonical: symbol.canonical,
        score: best.score
      });
    }

    if (best && variants.length) {
      var fullTarget = best.variant.tokens.join(" ");
      if (fullTarget.length >= 6) {
        var similarity = 1 - (levenshtein(inputTokens.join(" "), fullTarget) / Math.max(inputTokens.join(" ").length, fullTarget.length));
        if (similarity >= 0.74) {
          return makeResult("close", "similar-wording", {
            matched: best.variant.label,
            canonical: symbol.canonical,
            score: similarity
          });
        }
      }
    }

    return makeResult("incorrect", "no-match", {
      canonical: symbol.canonical
    });
  }

  return {
    classify: classify,
    normalize: normalize,
    tokenKey: tokenKey,
    contentTokens: contentTokens,
    levenshtein: levenshtein,
    _internals: {
      buildVariants: buildVariants,
      hasConflict: hasConflict,
      hasNewChangeModifier: hasNewChangeModifier
    }
  };
});
