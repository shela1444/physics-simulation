/*
 * Small safe wrapper around localStorage.
 */
(function (root, factory) {
  "use strict";
  var storage = factory();
  if (typeof module === "object" && module.exports) module.exports = storage;
  root.SymbolStorage = storage;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var KEY = "symbol-sense:v1";

  function readAll() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeAll(value) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function get(key, fallback) {
    var all = readAll();
    return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : fallback;
  }

  function set(key, value) {
    var all = readAll();
    all[key] = value;
    return writeAll(all);
  }

  function update(values) {
    var all = readAll();
    Object.keys(values).forEach(function (key) { all[key] = values[key]; });
    return writeAll(all);
  }

  function clear() {
    try {
      window.localStorage.removeItem(KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    get: get,
    set: set,
    update: update,
    clear: clear,
    key: KEY
  };
});
