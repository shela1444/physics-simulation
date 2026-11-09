/**
 * HUD — numeric telemetry for the pseudo-force simulation.
 *
 * Stateless with respect to the simulation: update(state) receives a
 * PendulumState once per frame and writes formatted values into the existing
 * spans declared in index.html (ARCHITECTURE.md §7.4, §8). Missing elements
 * are ignored so the class is safe during partial page loads.
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

/**
 * @param {number} value
 * @param {number} [fallback]
 * @returns {number}
 */
function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Format a signed value with a true minus sign for negatives.
 * @param {number} value
 * @param {number} digits
 * @returns {string}
 */
function signed(value, digits) {
  const numeric = finite(value);
  const rounded = Math.abs(numeric) < 0.5 * Math.pow(10, -digits) ? 0 : numeric;
  if (rounded > 0) return `+${rounded.toFixed(digits)}`;
  if (rounded < 0) return `−${Math.abs(rounded).toFixed(digits)}`;
  return (0).toFixed(digits);
}

class HUD {
  /**
   * @param {HTMLElement} rootEl element containing the telemetry spans (#hud)
   */
  constructor(rootEl) {
    this.root = rootEl || (typeof document !== 'undefined' ? document : null);

    this.accelerationEl = this._get('hud-acceleration');
    this.velocityEl = this._get('hud-velocity');
    this.angleEl = this._get('hud-angle');
    this.pseudoEl = this._get('hud-pseudo');
    this.massEl = this._get('hud-mass');
  }

  /**
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  _get(id) {
    if (this.root && typeof this.root.querySelector === 'function') {
      const found = this.root.querySelector('#' + id);
      if (found) return found;
    }
    if (typeof document !== 'undefined') {
      return document.getElementById(id) || null;
    }
    return null;
  }

  /**
   * @param {HTMLElement|null} el
   * @param {string} text
   */
  _set(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  /**
   * @param {object} state PendulumState
   */
  update(state) {
    if (!state) return;

    const acceleration = finite(state.carAcceleration);
    const velocity = finite(state.carVelocity);
    const angleDeg = finite(state.angleDeg);
    const pseudoForce = finite(state.pseudoForce);
    const mass = finite(state.mass);

    const decelerating =
      Math.abs(acceleration) >= 0.05 && velocity * acceleration < 0;

    this._set(this.accelerationEl, `${signed(acceleration, 1)} m/s²`);

    const speed = Math.abs(velocity);
    const velocityText =
      speed < 0.05
        ? '0.0 m/s'
        : `${speed.toFixed(1)} m/s ${velocity > 0 ? '→' : '←'}`;
    this._set(this.velocityEl, velocityText);

    const absAngle = Math.abs(angleDeg);
    const direction =
      absAngle < 0.5 ? 'vertical' : angleDeg > 0 ? 'back' : 'forward';
    this._set(this.angleEl, `${absAngle.toFixed(1)}° ${direction}`);

    this._set(this.pseudoEl, `${pseudoForce.toFixed(2)} N`);
    this._set(this.massEl, `${mass.toFixed(2)} kg`);

    if (this.accelerationEl && this.accelerationEl.classList) {
      this.accelerationEl.classList.toggle('is-decel', decelerating);
      this.accelerationEl.classList.toggle(
        'is-coasting',
        Math.abs(acceleration) < 0.05
      );
    }
  }
}

  PseudoForce.HUD = HUD;
})(window);
