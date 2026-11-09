/**
 * Fixed-timestep animation loop with pause/resume.
 *
 * HEADLESS with respect to the simulation: it knows nothing about the model.
 * It only calls the supplied `update(dt)` callback with a FIXED dt, zero or
 * more times per animation frame, decoupling physics from rendering.
 *
 * Pausing halts integration (no `update` calls) while the rAF loop keeps
 * running so the app may continue to render the frozen state.
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

class Loop {
  /**
   * @param {(dt: number) => void} update called with the fixed dt
   * @param {{ fixedDt?: number, maxSubSteps?: number }} [options]
   */
  constructor(update, { fixedDt = 1 / 240, maxSubSteps = 8 } = {}) {
    if (typeof update !== 'function') {
      throw new TypeError('Loop requires an update function');
    }
    this._update = update;
    this.fixedDt = fixedDt;
    this.maxSubSteps = maxSubSteps;

    this._accumulator = 0;
    this._elapsed = 0;
    this._running = false;
    this._paused = false;
    this._rafId = null;
    this._lastTime = 0;
    this._tick = this._tick.bind(this);
  }

  /** Start the rAF loop. No-op if already running. */
  start() {
    if (this._running) return;
    this._running = true;
    this._paused = false;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  /** Stop integrating. The loop stays resumable. */
  pause() {
    this._paused = true;
  }

  /** Resume integration after a pause. */
  resume() {
    if (!this._running) {
      this.start();
      return;
    }
    if (!this._paused) return;
    this._paused = false;
    this._lastTime = performance.now();
  }

  /** Toggle between paused and running. */
  toggle() {
    if (this._paused) this.resume();
    else this.pause();
  }

  /** @returns {boolean} */
  get isPaused() {
    return this._paused;
  }

  /** Reset the accumulator and elapsed time, and unpause. */
  reset() {
    this._accumulator = 0;
    this._elapsed = 0;
    this._paused = false;
    this._lastTime = performance.now();
  }

  /** @returns {number} accumulated simulated seconds */
  get elapsed() {
    return this._elapsed;
  }

  _tick(now) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick);

    let frameTime = (now - this._lastTime) / 1000;
    this._lastTime = now;

    // Guard against large tab-switch gaps.
    if (frameTime > 0.25) frameTime = 0.25;

    if (this._paused) return;

    this._accumulator += frameTime;

    let steps = 0;
    while (this._accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this._update(this.fixedDt);
      this._accumulator -= this.fixedDt;
      this._elapsed += this.fixedDt;
      steps++;
    }

    // Avoid a spiral of death: drop any remaining backlog.
    if (steps >= this.maxSubSteps) {
      this._accumulator = Math.min(this._accumulator, this.fixedDt);
    }
  }
}

  PseudoForce.Loop = Loop;
})(window);
