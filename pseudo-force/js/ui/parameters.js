/**
 * ParameterControls — acceleration slider and Constant velocity action.
 *
 * Renders into #parameter-controls (ARCHITECTURE.md §7.4, §8). Slider changes
 * are reported through onChange(key, value). The Constant velocity button sets
 * acceleration to zero through onConstantVelocity without changing velocity.
 * setValues() repopulates the slider without firing onChange.
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

  const ACCELERATION_DEF = {
    key: 'acceleration',
    id: 'param-acceleration',
    label: 'Car acceleration',
    min: -10,
    max: 10,
    step: 0.5,
    initial: 0,
    decimals: 1,
    unit: 'm/s²',
    ariaLabel: 'Car acceleration in metres per second squared',
    ends: ['Brake / reverse', 'Accelerate']
  };

  class ParameterControls {
    /**
     * @param {HTMLElement} rootEl element to render into (#parameter-controls)
     * @param {{
     *   onChange?: (key: string, value: number) => void,
     *   onConstantVelocity?: () => void
     * }} [handlers]
     */
    constructor(rootEl, { onChange, onConstantVelocity } = {}) {
      this.root = rootEl || null;
      this.onChange = typeof onChange === 'function' ? onChange : null;
      this.onConstantVelocity =
        typeof onConstantVelocity === 'function' ? onConstantVelocity : null;

      /** @type {{ def: object, input: HTMLInputElement, valueEl: HTMLElement }|null} */
      this.acceleration = null;

      /** @type {HTMLButtonElement|null} */
      this.constantVelocityBtn = null;

      /** True while setValues() writes to the widget — suppresses onChange. */
      this._applying = false;

      this._build();
    }

    /**
     * Update the acceleration slider without notifying the owner.
     * @param {{ acceleration?: number }} [params]
     */
    setValues(params = {}) {
      if (!params || !this.acceleration) return;

      const numeric = Number(params.acceleration);
      if (!Number.isFinite(numeric)) return;

      const safe = this._clampStep(ACCELERATION_DEF, numeric);

      this._applying = true;
      try {
        this.acceleration.input.value = String(safe);
        this.acceleration.valueEl.textContent =
          this._format(ACCELERATION_DEF, safe);
        this.acceleration.input.setAttribute(
          'aria-valuetext',
          this._format(ACCELERATION_DEF, safe)
        );
      } finally {
        this._applying = false;
      }
    }

    _build() {
      if (!this.root || typeof document === 'undefined') return;

      this._buildSlider(ACCELERATION_DEF);
      this._buildConstantVelocityButton();
    }

    /**
     * @param {object} def
     */
    _buildSlider(def) {
      const container = document.createElement('div');
      container.className = 'slider-container';

      const head = document.createElement('div');
      head.className = 'slider-container__head';

      const label = document.createElement('label');
      label.className = 'slider-container__label';
      label.htmlFor = def.id;
      label.textContent = def.label;

      const value = document.createElement('span');
      value.className = 'slider-container__value';
      value.textContent = this._format(def, def.initial);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'slider';
      input.id = def.id;
      input.name = def.key;
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      input.value = String(def.initial);
      input.setAttribute('aria-label', def.ariaLabel);
      input.setAttribute('aria-valuetext', this._format(def, def.initial));

      const ends = document.createElement('div');
      ends.className = 'slider-container__ends';
      const leftLabel = document.createElement('span');
      leftLabel.textContent = def.ends[0];
      const rightLabel = document.createElement('span');
      rightLabel.textContent = def.ends[1];
      ends.append(leftLabel, rightLabel);

      head.append(label, value);
      container.append(head, input, ends);
      this.root.append(container);

      input.addEventListener('input', () => {
        const numeric = Number(input.value);
        if (!Number.isFinite(numeric)) return;

        value.textContent = this._format(def, numeric);
        input.setAttribute('aria-valuetext', this._format(def, numeric));

        if (!this._applying && this.onChange) {
          this.onChange(def.key, numeric);
        }
      });

      this.acceleration = { def, input, valueEl: value };
    }

    _buildConstantVelocityButton() {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'constant-velocity-btn';
      button.className = 'btn btn--secondary constant-velocity-btn';
      button.textContent = 'Constant velocity';
      button.setAttribute(
        'aria-label',
        'Set acceleration to zero and keep the current car velocity'
      );

      button.addEventListener('click', () => {
        if (this.onConstantVelocity) this.onConstantVelocity();
      });

      this.root.append(button);
      this.constantVelocityBtn = button;
    }

    /**
     * Clamp a value to the slider range and snap it to its step.
     * @param {{ min: number, max: number, step: number }} def
     * @param {number} value
     * @returns {number}
     */
    _clampStep(def, value) {
      const clamped = Math.min(def.max, Math.max(def.min, value));
      const stepped = Math.round(clamped / def.step) * def.step;
      return Number(stepped.toFixed(2));
    }

    /**
     * @param {{ decimals: number, unit: string }} def
     * @param {number} value
     * @returns {string}
     */
    _format(def, value) {
      const numeric = Number(value);
      const safe = Number.isFinite(numeric) ? numeric : 0;
      const magnitude = Math.abs(safe).toFixed(def.decimals);

      if (safe > 0) return `+${magnitude} ${def.unit}`;
      if (safe < 0) return `−${magnitude} ${def.unit}`;
      return `${(0).toFixed(def.decimals)} ${def.unit}`;
    }
  }

  PseudoForce.ParameterControls = ParameterControls;
})(window);
