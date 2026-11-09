/**
 * Pseudo Force in an Accelerating Frame — pendulum model.
 *
 * HEADLESS core: no DOM access, no imports. The car accelerates without drag
 * and the bob is a damped simple pendulum observed in the car's accelerating
 * frame. Screen/positivity conventions follow ARCHITECTURE.md §4–§5.
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

  const G = 9.81;

  const DEFAULT_PARAMS = {
    acceleration: 0.0,
    mass: 0.5,
    ropeLength: 1.2,
    damping: 1.6,
    gravity: G
  };

const ALLOWED_PARAM_KEYS = new Set([
  'acceleration',
  'mass',
  'ropeLength',
  'damping',
  'gravity'
]);

const POSITIVE_PARAM_KEYS = new Set(['mass', 'ropeLength', 'gravity']);

class PendulumModel {
  /**
   * @param {Partial<typeof DEFAULT_PARAMS>} [params]
   */
  constructor(params = {}) {
    this.params = { ...DEFAULT_PARAMS };

    for (const key of Object.keys(params)) {
      this.setParam(key, params[key]);
    }

    this.time = 0;              // s
    this.carVelocity = 0;       // m/s, forward/right positive
    this.carDistance = 0;       // m, signed
    this.angle = 0;             // rad, positive = trailing backward/left
    this.angularVelocity = 0;   // rad/s
  }

  /**
   * Zero time, car motion and pendulum state, optionally replacing parameters
   * first. The car always restarts at rest.
   * @param {Partial<typeof DEFAULT_PARAMS>} [params]
   */
  reset(params = {}) {
    for (const key of Object.keys(params)) {
      this.setParam(key, params[key]);
    }

    this.time = 0;
    this.carVelocity = 0;
    this.carDistance = 0;
    this.angle = 0;
    this.angularVelocity = 0;
  }

  /**
   * Update one physical parameter. Unknown keys and non-finite values are
   * ignored, as are non-positive mass, rope length and gravity.
   * @param {string} key
   * @param {number} value
   * @returns {boolean} true when the value was accepted
   */
  setParam(key, value) {
    if (!ALLOWED_PARAM_KEYS.has(key)) return false;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return false;
    if (POSITIVE_PARAM_KEYS.has(key) && numeric <= 0) return false;

    this.params[key] = numeric;
    return true;
  }

  /**
   * Convenience wrapper for the acceleration slider.
   * @param {number} value m/s²
   * @returns {boolean}
   */
  setAcceleration(value) {
    return this.setParam('acceleration', value);
  }

  /**
   * Advance the simulation with semi-implicit (symplectic) Euler.
   * @param {number} dt seconds
   */
  step(dt) {
    const step = Number(dt);
    if (!Number.isFinite(step) || step <= 0) return;

    const { acceleration, ropeLength, damping, gravity } = this.params;

    this.carVelocity += acceleration * step;
    this.carDistance += this.carVelocity * step;

    const angularAcceleration =
      -(gravity / ropeLength) * Math.sin(this.angle) +
      (acceleration / ropeLength) * Math.cos(this.angle) -
      damping * this.angularVelocity;

    this.angularVelocity += angularAcceleration * step;
    this.angle += this.angularVelocity * step;
    this.time += step;
  }

  /**
   * Static equilibrium angle in the accelerating frame.
   * @returns {number} radians, atan2(acceleration, gravity)
   */
  getEquilibriumAngle() {
    return Math.atan2(this.params.acceleration, this.params.gravity);
  }

  /**
   * @returns {{
   *   time: number,
   *   carAcceleration: number,
   *   carVelocity: number,
   *   carDistance: number,
   *   angle: number,
   *   angleDeg: number,
   *   angularVelocity: number,
   *   equilibriumAngle: number,
   *   equilibriumAngleDeg: number,
   *   weight: number,
   *   tension: number,
   *   tensionX: number,
   *   tensionY: number,
   *   mass: number,
   *   ropeLength: number,
   *   gravity: number
   * }} a plain PendulumState copy
   */
  getState() {
    const {
      acceleration,
      mass,
      ropeLength,
      gravity
    } = this.params;

    const equilibriumAngle = this.getEquilibriumAngle();
    const angularSpeed = this.angularVelocity;
    const tension = Math.max(
      0,
      mass * (
        gravity * Math.cos(this.angle) +
        acceleration * Math.sin(this.angle) +
        ropeLength * angularSpeed * angularSpeed
      )
    );

    return {
      time: this.time,

      carAcceleration: acceleration,
      carVelocity: this.carVelocity,
      carDistance: this.carDistance,

      angle: this.angle,
      angleDeg: this.angle * (180 / Math.PI),
      angularVelocity: this.angularVelocity,

      equilibriumAngle,
      equilibriumAngleDeg: equilibriumAngle * (180 / Math.PI),

      weight: mass * gravity,
      tension,
      tensionX: tension * Math.sin(this.angle),
      tensionY: tension * Math.cos(this.angle),

      mass,
      ropeLength,
      gravity
    };
  }
}

  PseudoForce.G = G;
  PseudoForce.DEFAULT_PARAMS = DEFAULT_PARAMS;
  PseudoForce.PendulumModel = PendulumModel;
})(window);
