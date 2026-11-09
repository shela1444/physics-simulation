/**
 * PseudoForceApp — integration layer for the accelerating-frame simulation.
 *
 * Owns the single PendulumModel, wires the UI modules together and runs the
 * requestAnimationFrame render loop. Physics integration is delegated to Loop
 * at a fixed 1/240 s step; pausing halts only integration, so rendering and
 * controls remain live (ARCHITECTURE.md §6).
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};
  const {
    PendulumModel,
    Loop,
    CarPendulumScene,
    HUD,
    ParameterControls,
    TransportControls
  } = PseudoForce;

class PseudoForceApp {
  constructor() {
    this.model = null;
    this.loop = null;
    this.scene = null;
    this.hud = null;
    this.parameters = null;
    this.transport = null;

    this._wasRunningBeforeHidden = true;
    this._lastPaused = false;
    this._lastStatus = '';

    this._onResize = this._handleResize.bind(this);
    this._onVisibility = this._handleVisibility.bind(this);
    this._renderFrame = this._renderFrame.bind(this);
  }

  init() {
    const canvas = document.getElementById('scene-canvas');
    if (!canvas) throw new Error('Missing #scene-canvas');

    this.model = new PendulumModel();
    this.loop = new Loop((dt) => this.model.step(dt), { fixedDt: 1 / 240 });

    this.scene = new CarPendulumScene(canvas);
    this.hud = new HUD(document.getElementById('hud'));

    this.parameters = new ParameterControls(
      document.getElementById('parameter-controls'),
      {
        onChange: (key, value) => this._onParamChange(key, value),
        onConstantVelocity: () => this._onConstantVelocity()
      }
    );

    this.transport = new TransportControls(
      document.getElementById('transport-controls'),
      {
        onToggle: (isPaused) => this._setPaused(isPaused),
        onReset: () => this.reset()
      }
    );

    this.parameters.setValues(this.model.params);
    this._bindGlobalEvents();

    this.scene.resize();

    // Start rendering immediately but keep physics paused until Resume.
    this.loop.start();
    this.loop.pause();
    this._syncUi();

    this._renderFrame();
  }

  /**
   * @param {string} key 'acceleration'
   * @param {number} value
   */
  _onParamChange(key, value) {
    if (key === 'acceleration') {
      this.model.setAcceleration(value);
    }

    this._syncUi();
  }

  /**
   * Set acceleration to zero without changing the car's current velocity.
   */
  _onConstantVelocity() {
    this.model.setAcceleration(0);
    this.parameters.setValues({ acceleration: 0 });
    this._syncUi();
  }

  /**
   * @param {boolean} isPaused
   */
  _setPaused(isPaused) {
    if (isPaused) this.loop.pause();
    else this.loop.resume();

    this._syncUi();
  }

  /**
   * Reset to the paused initial state: acceleration and velocity zero.
   */
  reset() {
    this.loop.pause();
    this.model.reset({ acceleration: 0 });
    this.loop.reset();
    this.loop.pause();
    this.parameters.setValues(this.model.params);
    this._syncUi();
  }

  _bindGlobalEvents() {
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', () =>
      setTimeout(this._onResize, 100)
    );
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  _handleResize() {
    if (this.scene) this.scene.resize();
  }

  _handleVisibility() {
    if (!this.loop) return;

    if (document.hidden) {
      this._wasRunningBeforeHidden = !this.loop.isPaused;
      if (!this.loop.isPaused) this.loop.pause();
    } else if (this._wasRunningBeforeHidden) {
      this.loop.resume();
    }

    this._syncUi();
  }

  /**
   * @param {object} state
   * @returns {string}
   */
  _statusFor(state) {
    if (this.loop && this.loop.isPaused) {
      return state.time > 0
        ? 'Paused — press Resume to continue.'
        : 'Paused — press Resume to begin.';
    }

    const acceleration = state.carAcceleration;
    const velocity = state.carVelocity;

    if (Math.abs(acceleration) < 0.05) {
      if (Math.abs(velocity) < 0.05) {
        return 'At rest — set acceleration to begin.';
      }
      return 'Constant velocity — the bob hangs vertically.';
    }

    if (velocity * acceleration < 0) {
      return `Braking — the bob swings ${acceleration > 0 ? 'left' : 'right'}.`;
    }

    if (acceleration > 0) {
      return 'Accelerating forward — the bob leans left.';
    }

    return 'Accelerating in reverse — the bob leans right.';
  }

  /**
   * @param {string} text
   */
  _setStatus(text) {
    if (text === this._lastStatus) return;
    this._lastStatus = text;

    const el = document.getElementById('status-line');
    if (el) el.textContent = text;
  }

  _syncUi() {
    if (!this.model) return;

    const state = this.model.getState();

    if (this.hud) this.hud.update(state);

    if (this.transport && this._lastPaused !== this.loop.isPaused) {
      this._lastPaused = this.loop.isPaused;
      this.transport.setPaused(this.loop.isPaused);
    }

    this._setStatus(this._statusFor(state));
  }

  _renderFrame() {
    requestAnimationFrame(this._renderFrame);

    if (!this.model) return;

    const state = this.model.getState();

    if (this.scene) this.scene.draw(state);
    this._syncUi();
  }
}

  PseudoForce.PseudoForceApp = PseudoForceApp;
})(window);
