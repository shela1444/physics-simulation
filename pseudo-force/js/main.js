/**
 * Boot entry point for the pseudo-force simulation.
 *
 * Creates the PseudoForceApp, initializes it, and exposes it as window.app for
 * debugging. All dependencies are read from window.PseudoForce because classic
 * scripts are required under the file:// protocol.
 */

(function (global) {
  'use strict';

  function boot() {
    const app = new global.PseudoForce.PseudoForceApp();
    app.init();
    global.app = app;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
