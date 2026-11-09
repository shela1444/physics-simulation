/**
 * TransportControls — pause/resume and reset for the pseudo-force simulation.
 *
 * Renders into #transport-controls (ARCHITECTURE.md §7.4, §8). It is stateless
 * with respect to physics: user intent is reported via onToggle(isPaused) and
 * onReset(), while setPaused() paints the authoritative state supplied by the
 * app. Global shortcuts are Space (toggle) and R (reset).
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

const PAUSE_GLYPH = '\u23F8'; // ⏸
const PLAY_GLYPH = '\u25B6';  // ▶
const RESET_GLYPH = '\u21BA'; // ↺

class TransportControls {
  /**
   * @param {HTMLElement} rootEl element to render into (#transport-controls)
   * @param {{ onToggle?: (isPaused: boolean) => void, onReset?: () => void }} [handlers]
   */
  constructor(rootEl, { onToggle, onReset } = {}) {
    this.root = rootEl || null;
    this.onToggle = typeof onToggle === 'function' ? onToggle : null;
    this.onReset = typeof onReset === 'function' ? onReset : null;

    this.paused = false;
    this.toggleBtn = null;

    this._onKeyDown = this._handleKeyDown.bind(this);

    this._build();
    this.setPaused(false);

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._onKeyDown);
    }
  }

  /**
   * @param {boolean} isPaused
   */
  setPaused(isPaused) {
    this.paused = !!isPaused;

    const label = this.toggleBtn
      ? this.toggleBtn.querySelector('.transport-btn__label')
      : null;
    const glyph = this.toggleBtn
      ? this.toggleBtn.querySelector('.transport-btn__glyph')
      : null;

    if (glyph) glyph.textContent = this.paused ? PLAY_GLYPH : PAUSE_GLYPH;
    if (label) label.textContent = this.paused ? 'Resume' : 'Pause';

    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-pressed', String(this.paused));
      this.toggleBtn.setAttribute(
        'aria-label',
        this.paused ? 'Resume simulation' : 'Pause simulation'
      );
      this.toggleBtn.classList.toggle('is-paused', this.paused);
    }

    if (this.root && this.root.classList) {
      this.root.classList.toggle('is-paused', this.paused);
    }
  }

  _build() {
    if (!this.root || typeof document === 'undefined') return;

    const row = document.createElement('div');
    row.className = 'transport-controls__row';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn--primary transport-btn';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Pause simulation');

    const toggleGlyph = document.createElement('span');
    toggleGlyph.className = 'transport-btn__glyph';
    toggleGlyph.setAttribute('aria-hidden', 'true');
    toggleGlyph.textContent = PAUSE_GLYPH;

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'transport-btn__label';
    toggleLabel.textContent = 'Pause';

    toggle.append(toggleGlyph, toggleLabel);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn--secondary transport-btn';
    reset.setAttribute('aria-label', 'Reset simulation');

    const resetGlyph = document.createElement('span');
    resetGlyph.className = 'transport-btn__glyph';
    resetGlyph.setAttribute('aria-hidden', 'true');
    resetGlyph.textContent = RESET_GLYPH;

    const resetLabel = document.createElement('span');
    resetLabel.className = 'transport-btn__label';
    resetLabel.textContent = 'Reset';

    reset.append(resetGlyph, resetLabel);

    toggle.addEventListener('click', () => {
      const next = !this.paused;
      this.setPaused(next);
      if (this.onToggle) this.onToggle(next);
    });

    reset.addEventListener('click', () => {
      if (this.onReset) this.onReset();
    });

    row.append(toggle, reset);
    this.root.append(row);

    this.toggleBtn = toggle;
  }

  /**
   * @param {EventTarget|null} target
   * @returns {boolean}
   */
  _isTypingTarget(target) {
    if (!target || typeof (/** @type {any} */ (target).tagName) !== 'string') {
      return false;
    }

    const element = /** @type {any} */ (target);
    const tag = element.tagName.toUpperCase();

    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (element.isContentEditable === true) return true;
    if (tag !== 'INPUT') return false;

    const type = String(element.type || 'text').toLowerCase();
    return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(type);
  }

  /**
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.repeat) return;
    if (this._isTypingTarget(event.target)) return;

    if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      const next = !this.paused;
      this.setPaused(next);
      if (this.onToggle) this.onToggle(next);
      return;
    }

    if (event.code === 'KeyR' || event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      if (this.onReset) this.onReset();
    }
  }
}

  PseudoForce.TransportControls = TransportControls;
})(window);
