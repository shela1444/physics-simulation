/**
 * CarPendulumScene — Canvas 2D renderer for the accelerating-car simulation.
 *
 * The car stays at a fixed screen position and the road scrolls using the
 * signed car distance. Every frame is derived from the PendulumState passed to
 * draw(); there is no per-frame randomness. Drawing uses CSS pixels after the
 * DPR transform established in resize() (ARCHITECTURE.md §9).
 */

(function (global) {
  'use strict';

  const PseudoForce = global.PseudoForce = global.PseudoForce || {};

const TAU = Math.PI * 2;

const FALLBACK_COLORS = {
  skyTop: '#08111d',
  skyBottom: '#142b43',
  roadDark: '#171b22',
  roadLine: 'rgba(230, 237, 243, 0.55)',
  carBody: '#2f81f7',
  carBodyDark: '#1f5fa8',
  carWindow: '#0a1929',
  bob: '#f2cc60',
  rope: '#b7c0ca',
  velocity: '#58a6ff',
  accel: '#3fb950',
  decel: '#d29922',
  tension: '#f0883e',
  tensionX: '#79c0ff',
  tensionY: '#d2a8ff',
  insetBg: 'rgba(13, 17, 23, 0.88)',
  insetBorder: 'rgba(139, 148, 158, 0.45)',
  text: '#e6edf3',
  muted: '#8b949e'
};

const COLOR_TOKENS = {
  skyTop: '--scene-sky-top',
  skyBottom: '--scene-sky-bottom',
  roadDark: '--road-dark',
  roadLine: '--road-line',
  carBody: '--car-body',
  carBodyDark: '--car-body-dark',
  carWindow: '--car-window',
  bob: '--bob-color',
  rope: '--rope-color',
  velocity: '--vector-velocity',
  accel: '--accel-color',
  decel: '--decel-color',
  tension: '--vector-tension',
  tensionX: '--vector-tension-x',
  tensionY: '--vector-tension-y',
  insetBg: '--inset-bg',
  insetBorder: '--inset-border',
  text: '--text',
  muted: '--text-muted'
};

const PIXELS_PER_METRE = 24;
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
 * Positive modulo.
 * @param {number} value
 * @param {number} modulus
 * @returns {number}
 */
function mod(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Build a rounded-rectangle path (does not fill or stroke).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Draw a horizontal arrow with a head at (x2, y2).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {string} color
 */
function strokeHorizontalArrow(ctx, x1, y1, x2, y2, color) {
  const length = Math.abs(x2 - x1);
  const head = clamp(length * 0.24, 6, 14);
  const direction = x2 >= x1 ? 1 : -1;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - direction * head, y2 - head * 0.55);
  ctx.lineTo(x2 - direction * head, y2 + head * 0.55);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw an arrow in any direction.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {string} color
 * @param {number} [lineWidth]
 */
function strokeArrow(ctx, x1, y1, x2, y2, color, lineWidth = 2.4) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 0.75) return;

  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(clamp(length * 0.32, 4, 10), length * 0.52);
  const halfWidth = head * 0.48;
  const baseX = x2 - ux * head;
  const baseY = y2 - uy * head;
  const perpX = -uy;
  const perpY = ux;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(baseX, baseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(baseX + perpX * halfWidth, baseY + perpY * halfWidth);
  ctx.lineTo(baseX - perpX * halfWidth, baseY - perpY * halfWidth);
  ctx.closePath();
  ctx.fill();
}

class CarPendulumScene {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('CarPendulumScene requires a canvas element');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colors = { ...FALLBACK_COLORS };

    this.width = 0;
    this.height = 0;
    this.geometry = null;
    this._facing = 1;

    this._readColors();
    this.resize();
  }

  /**
   * Size the backing store to devicePixelRatio and scale the 2D context so all
   * drawing calls use CSS pixels.
   */
  resize() {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;

    let cssW = this.canvas.clientWidth;
    let cssH = this.canvas.clientHeight;

    if ((!cssW || !cssH) && this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      cssW = cssW || rect.width - 24;
      cssH = cssH || rect.height - 24;
    }

    cssW = Math.max(1, Math.round(cssW || 960));
    cssH = Math.max(1, Math.round(cssH || Math.round(cssW * 0.625)));

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.width = cssW;
    this.height = cssH;

    this._readColors();
    this._computeGeometry();
  }

  /**
   * Render one frame.
   * @param {object} state PendulumState from the model
   */
  draw(state) {
    if (!state || !this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this._resolveFacing(state);
    this._drawSky(ctx);
    this._drawScenery(ctx);
    this._drawRoad(ctx, state);
    this._drawCar(ctx, state);
    this._drawPendulum(ctx, state);
    this._drawArrows(ctx, state);
    this._drawTensionInset(ctx, state);
  }

  // ---------------------------------------------------------------------------
  // Layout and colors
  // ---------------------------------------------------------------------------

  _readColors() {
    if (typeof document === 'undefined' || !document.documentElement) return;

    const style = getComputedStyle(document.documentElement);
    for (const key of Object.keys(COLOR_TOKENS)) {
      const token = style.getPropertyValue(COLOR_TOKENS[key]).trim();
      if (token) this.colors[key] = token;
    }
  }

  _computeGeometry() {
    const w = this.width;
    const h = this.height;

    const roadTop = h * 0.58;
    const roadBottom = h * 0.97;
    const roadHeight = roadBottom - roadTop;
    const groundY = roadTop + roadHeight * 0.72;

    const carX = w * 0.48;
    const carWidth = clamp(Math.min(w * 0.46, h * 0.62), 120, 360);
    const wheelRadius = clamp(carWidth * 0.085, 10, 30);
    const bodyHeight = carWidth * 0.20;
    const cabinHeight = carWidth * 0.30;
    const roofThickness = clamp(carWidth * 0.04, 4, 14);

    const bodyBottom = groundY - wheelRadius * 0.72;
    const bodyTop = bodyBottom - bodyHeight;
    const roofTop = bodyTop - cabinHeight;
    const cabinOpeningTop = roofTop + roofThickness;

    const cabinBaseLeft = carX - carWidth * 0.34;
    const cabinBaseRight = carX + carWidth * 0.34;
    const cabinRoofLeft = carX - carWidth * 0.20;
    const cabinRoofRight = carX + carWidth * 0.20;

    const openingHeight = Math.max(12, bodyTop - cabinOpeningTop);
    const ropeLength = openingHeight * 0.80;
    const bobRadius = clamp(carWidth * 0.038, 5, 14);

    this.geometry = {
      roadTop,
      roadBottom,
      roadHeight,
      groundY,
      carX,
      carWidth,
      wheelRadius,
      bodyHeight,
      cabinHeight,
      roofThickness,
      bodyBottom,
      bodyTop,
      roofTop,
      cabinOpeningTop,
      cabinBaseLeft,
      cabinBaseRight,
      cabinRoofLeft,
      cabinRoofRight,
      pivotY: roofTop + roofThickness * 0.5,
      ropeLength,
      bobRadius,
      velocityArrowY: clamp(roofTop * 0.22, 26, 110),
      accelArrowY: clamp(roofTop * 0.44, 58, 170)
    };
  }

  _resolveFacing(state) {
    const velocity = finite(state.carVelocity);
    const acceleration = finite(state.carAcceleration);

    if (Math.abs(velocity) >= 0.05) {
      this._facing = velocity > 0 ? 1 : -1;
    } else if (Math.abs(acceleration) >= 0.05) {
      this._facing = acceleration > 0 ? 1 : -1;
    } else {
      this._facing = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Background and road
  // ---------------------------------------------------------------------------

  _drawSky(ctx) {
    const h = this.geometry.roadTop;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, this.colors.skyTop);
    gradient.addColorStop(1, this.colors.skyBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, h);
  }

  _drawScenery(ctx) {
    const w = this.width;
    const roadTop = this.geometry.roadTop;

    // Far hills.
    ctx.beginPath();
    ctx.moveTo(0, roadTop);
    for (let x = 0; x <= w + 12; x += 12) {
      const y =
        roadTop -
        24 -
        Math.sin(x * 0.012 + 1.4) * 16 -
        Math.sin(x * 0.031 + 0.6) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, roadTop);
    ctx.closePath();
    ctx.fillStyle = 'rgba(6, 15, 27, 0.55)';
    ctx.fill();

    // Near hills.
    ctx.beginPath();
    ctx.moveTo(0, roadTop);
    for (let x = 0; x <= w + 12; x += 12) {
      const y =
        roadTop -
        10 -
        Math.sin(x * 0.018 + 3.1) * 10 -
        Math.sin(x * 0.047 + 1.1) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, roadTop);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 10, 18, 0.82)';
    ctx.fill();
  }

  _drawRoad(ctx, state) {
    const {
      roadTop,
      roadBottom,
      roadHeight
    } = this.geometry;

    const asphalt = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
    asphalt.addColorStop(0, '#20262f');
    asphalt.addColorStop(1, this.colors.roadDark);
    ctx.fillStyle = asphalt;
    ctx.fillRect(0, roadTop, this.width, roadHeight);

    // Road edge.
    ctx.strokeStyle = this.colors.roadLine;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, roadTop + 0.75);
    ctx.lineTo(this.width, roadTop + 0.75);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const distance = finite(state.carDistance);

    // Dashed centre line. The offset is the negative travel distance so the
    // road moves opposite the car and reverses when the car reverses.
    const dashLength = clamp(this.width * 0.036, 18, 34);
    const gapLength = clamp(this.width * 0.030, 15, 30);
    const dashPeriod = dashLength + gapLength;
    const dashOffset = mod(-distance * PIXELS_PER_METRE, dashPeriod);
    const lineY = roadTop + roadHeight * 0.56;

    ctx.strokeStyle = this.colors.roadLine;
    ctx.lineWidth = clamp(this.height * 0.008, 3, 6);
    ctx.lineCap = 'butt';
    for (let x = dashOffset - dashPeriod; x < this.width + dashPeriod; x += dashPeriod) {
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + dashLength, lineY);
      ctx.stroke();
    }

    // Roadside marker posts at the upper road edge.
    const postPeriod = clamp(this.width * 0.19, 88, 190);
    const postOffset = mod(-distance * PIXELS_PER_METRE, postPeriod);
    const postWidth = clamp(this.width * 0.005, 2, 4);
    const postHeight = clamp(this.height * 0.028, 8, 18);

    for (let x = postOffset - postPeriod; x < this.width + postPeriod; x += postPeriod) {
      ctx.fillStyle = '#0b1017';
      ctx.fillRect(x - postWidth / 2, roadTop - postHeight, postWidth, postHeight + 4);

      ctx.fillStyle = this.colors.roadLine;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(
        x - postWidth / 2,
        roadTop - postHeight,
        postWidth,
        Math.max(2, postWidth * 0.8)
      );
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Car
  // ---------------------------------------------------------------------------

  _drawCar(ctx, state) {
    const g = this.geometry;
    const { carX, carWidth } = g;

    // Soft shadow on the road.
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(
      carX,
      g.groundY + 2,
      carWidth * 0.54,
      g.wheelRadius * 0.34,
      0,
      0,
      TAU
    );
    ctx.fill();
    ctx.restore();

    // Mirror the car so it faces the direction of travel (or acceleration).
    ctx.save();
    ctx.translate(carX, 0);
    ctx.scale(this._facing, 1);
    ctx.translate(-carX, 0);

    const spin = mod(finite(state.carDistance) * 2.4, TAU);
    const wheelY = g.groundY - g.wheelRadius;
    const rearAxle = carX - carWidth * 0.29;
    const frontAxle = carX + carWidth * 0.29;

    this._drawWheel(ctx, rearAxle, wheelY, g.wheelRadius, spin);
    this._drawWheel(ctx, frontAxle, wheelY, g.wheelRadius, spin);

    const left = carX - carWidth / 2;
    const right = carX + carWidth / 2;
    const bodyHeight = g.bodyBottom - g.bodyTop;
    const bodyRadius = Math.min(16, carWidth * 0.055);

    roundedRectPath(
      ctx,
      left,
      g.bodyTop,
      carWidth,
      bodyHeight,
      bodyRadius
    );
    const bodyGradient = ctx.createLinearGradient(0, g.bodyTop, 0, g.bodyBottom);
    bodyGradient.addColorStop(0, this.colors.carBody);
    bodyGradient.addColorStop(0.58, this.colors.carBody);
    bodyGradient.addColorStop(1, this.colors.carBodyDark);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    ctx.strokeStyle = this.colors.carBodyDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cabin/window opening.
    ctx.beginPath();
    ctx.moveTo(g.cabinBaseLeft, g.bodyTop);
    ctx.lineTo(g.cabinRoofLeft, g.cabinOpeningTop);
    ctx.lineTo(g.cabinRoofRight, g.cabinOpeningTop);
    ctx.lineTo(g.cabinBaseRight, g.bodyTop);
    ctx.closePath();
    ctx.fillStyle = this.colors.carWindow;
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glass highlight.
    ctx.beginPath();
    ctx.moveTo(g.cabinBaseLeft + carWidth * 0.06, g.bodyTop - carWidth * 0.01);
    ctx.lineTo(g.cabinRoofLeft + carWidth * 0.03, g.cabinOpeningTop + carWidth * 0.02);
    ctx.lineTo(g.cabinRoofLeft + carWidth * 0.09, g.cabinOpeningTop + carWidth * 0.02);
    ctx.closePath();
    ctx.fillStyle = 'rgba(230, 237, 243, 0.06)';
    ctx.fill();

    // Pillars.
    ctx.strokeStyle = this.colors.carBodyDark;
    ctx.lineWidth = clamp(carWidth * 0.035, 4, 13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.cabinBaseLeft, g.bodyTop);
    ctx.lineTo(g.cabinRoofLeft, g.cabinOpeningTop);
    ctx.moveTo(g.cabinBaseRight, g.bodyTop);
    ctx.lineTo(g.cabinRoofRight, g.cabinOpeningTop);
    ctx.stroke();

    // Roof bar; its centre is the rope pivot.
    roundedRectPath(
      ctx,
      carX - carWidth * 0.22,
      g.roofTop,
      carWidth * 0.44,
      g.roofThickness,
      g.roofThickness * 0.5
    );
    ctx.fillStyle = this.colors.carBodyDark;
    ctx.fill();
    ctx.strokeStyle = this.colors.carBody;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Body highlight.
    ctx.strokeStyle = 'rgba(230, 237, 243, 0.20)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(left + carWidth * 0.08, g.bodyTop + 3);
    ctx.lineTo(right - carWidth * 0.08, g.bodyTop + 3);
    ctx.stroke();

    // Door seam and handle.
    ctx.strokeStyle = 'rgba(8, 17, 29, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(carX + carWidth * 0.04, g.bodyTop + bodyHeight * 0.28);
    ctx.lineTo(carX + carWidth * 0.04, g.bodyBottom - bodyHeight * 0.18);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(230, 237, 243, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(carX + carWidth * 0.08, g.bodyTop + bodyHeight * 0.42);
    ctx.lineTo(carX + carWidth * 0.14, g.bodyTop + bodyHeight * 0.42);
    ctx.stroke();

    // Headlight (front) and taillight (rear).
    const lightY = g.bodyTop + bodyHeight * 0.30;
    const lightW = carWidth * 0.07;
    const lightH = Math.max(4, bodyHeight * 0.18);

    roundedRectPath(ctx, right - lightW - carWidth * 0.035, lightY, lightW, lightH, lightH / 2);
    ctx.fillStyle = '#ffe8a3';
    ctx.fill();

    roundedRectPath(ctx, left + carWidth * 0.035, lightY, lightW, lightH, lightH / 2);
    ctx.fillStyle = 'rgba(248, 81, 73, 0.85)';
    ctx.fill();

    // Pivot mount on the roof.
    ctx.beginPath();
    ctx.arc(carX, g.pivotY, clamp(carWidth * 0.016, 2.5, 5.5), 0, TAU);
    ctx.fillStyle = this.colors.rope;
    ctx.fill();
    ctx.strokeStyle = this.colors.carBodyDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  _drawWheel(ctx, x, y, radius, spin) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = '#080b10';
    ctx.fill();
    ctx.strokeStyle = '#2b333d';
    ctx.lineWidth = Math.max(2, radius * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.56, 0, TAU);
    ctx.fillStyle = '#3c4652';
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.85)';
    ctx.lineWidth = Math.max(1.5, radius * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18);
      ctx.lineTo(Math.cos(angle) * radius * 0.49, Math.sin(angle) * radius * 0.49);
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.14, 0, TAU);
    ctx.fillStyle = '#0b0f14';
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Pendulum, angle and arrows
  // ---------------------------------------------------------------------------

  _drawPendulum(ctx, state) {
    const g = this.geometry;
    const pivotX = g.carX;
    const pivotY = g.pivotY;
    const angle = finite(state.angle);
    const bobX = pivotX - Math.sin(angle) * g.ropeLength;
    const bobY = pivotY + Math.cos(angle) * g.ropeLength;

    // Dashed true-vertical reference.
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = this.colors.muted;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY + g.ropeLength);
    ctx.stroke();
    ctx.restore();

    // Rope.
    ctx.strokeStyle = this.colors.rope;
    ctx.lineWidth = clamp(g.carWidth * 0.012, 2, 5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Bob with a small highlight.
    const bobGradient = ctx.createRadialGradient(
      bobX - g.bobRadius * 0.35,
      bobY - g.bobRadius * 0.35,
      g.bobRadius * 0.12,
      bobX,
      bobY,
      g.bobRadius * 1.25
    );
    bobGradient.addColorStop(0, '#fff6c2');
    bobGradient.addColorStop(0.55, this.colors.bob);
    bobGradient.addColorStop(1, '#a98524');

    ctx.beginPath();
    ctx.arc(bobX, bobY, g.bobRadius, 0, TAU);
    ctx.fillStyle = bobGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 246, 194, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Angle arc between the vertical reference and the rope.
    const arcRadius = Math.max(14, Math.min(g.ropeLength * 0.56, g.carWidth * 0.18));
    ctx.strokeStyle = this.colors.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      pivotX,
      pivotY,
      arcRadius,
      Math.PI / 2,
      Math.PI / 2 + angle,
      angle < 0
    );
    ctx.stroke();

    // Arc label, offset to the outside of the arc so it stays legible.
    const midAngle = angle / 2;
    const labelRadius = arcRadius + clamp(g.carWidth * 0.055, 12, 22);
    const labelX = pivotX - Math.sin(midAngle) * labelRadius;
    const labelY = pivotY + Math.cos(midAngle) * labelRadius;
    const fontSize = clamp(this.width * 0.014, 10, 13);

    ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = angle >= 0 ? 'right' : 'left';
    ctx.fillStyle = this.colors.text;
    ctx.fillText(
      `θ = ${Math.abs(finite(state.angleDeg)).toFixed(1)}°`,
      labelX + (angle >= 0 ? -6 : 6),
      labelY
    );
  }

  _maxArrowLength(anchorX) {
    const margin = clamp(this.width * 0.04, 14, 30);
    return Math.max(
      36,
      Math.min(
        this.width * 0.30,
        Math.min(anchorX, this.width - anchorX) - margin
      )
    );
  }

  _drawArrows(ctx, state) {
    const anchorX = this.width * 0.78;
    const maxLength = this._maxArrowLength(anchorX);
    const fontSize = clamp(this.width * 0.0135, 10, 13);

    ctx.save();
    ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';

    this._drawVelocityArrow(
      ctx,
      finite(state.carVelocity),
      anchorX,
      this.geometry.velocityArrowY,
      maxLength,
      fontSize
    );

    this._drawAccelerationArrow(
      ctx,
      finite(state.carAcceleration),
      finite(state.carVelocity),
      anchorX,
      this.geometry.accelArrowY,
      maxLength,
      fontSize
    );

    ctx.restore();
  }

  _drawVelocityArrow(ctx, velocity, anchorX, y, maxLength, fontSize) {
    const speed = Math.abs(velocity);

    if (speed < 0.05) {
      ctx.fillStyle = this.colors.muted;
      ctx.beginPath();
      ctx.arc(anchorX, y, 3.5, 0, TAU);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillText('At rest', anchorX + 10, y);
      return;
    }

    const direction = velocity > 0 ? 1 : -1;
    const length = clamp(50 + speed * 4.5, 54, maxLength);
    const endX = anchorX + direction * length;
    const color = this.colors.velocity;

    strokeHorizontalArrow(ctx, anchorX, y, endX, y, color);

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const labelX = clamp(
      anchorX + direction * length * 0.5,
      70,
      this.width - 70
    );
    ctx.fillText(`v = ${speed.toFixed(1)} m/s`, labelX, y - fontSize - 3);
  }

  _drawAccelerationArrow(ctx, acceleration, velocity, anchorX, y, maxLength, fontSize) {
    const magnitude = Math.abs(acceleration);

    if (magnitude < 0.05) {
      ctx.strokeStyle = this.colors.muted;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(anchorX - 12, y);
      ctx.lineTo(anchorX + 12, y);
      ctx.stroke();

      ctx.fillStyle = this.colors.muted;
      ctx.textAlign = 'left';
      ctx.fillText('a = 0 m/s²', anchorX + 20, y);
      return;
    }

    const direction = acceleration > 0 ? 1 : -1;
    const decelerating = velocity * acceleration < 0;
    const color = decelerating ? this.colors.decel : this.colors.accel;
    const length = clamp(42 + magnitude * 10, 48, maxLength);
    const endX = anchorX + direction * length;

    strokeHorizontalArrow(ctx, anchorX, y, endX, y, color);

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const labelX = clamp(
      anchorX + direction * length * 0.5,
      80,
      this.width - 80
    );
    const label = decelerating
      ? `a = ${magnitude.toFixed(1)} m/s² · deceleration`
      : `a = ${magnitude.toFixed(1)} m/s²`;
    ctx.fillText(label, labelX, y - fontSize - 3);
  }

  /**
   * Draw a compact free-body inset resolving tension into horizontal and
   * vertical components.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} state PendulumState
   */
  _drawTensionInset(ctx, state) {
    const insetW = clamp(this.width * 0.28, 160, 220);
    const insetH = clamp(insetW * 0.64, 106, 142);
    const x = clamp(this.width * 0.02, 12, 20);
    const y = clamp(this.height * 0.04, 12, 20);
    const right = x + insetW;
    const bottom = y + insetH;

    if (right > this.width - 8 || bottom > this.height - 8) return;

    const titleSize = clamp(insetW * 0.065, 10, 13);
    const valueSize = clamp(insetW * 0.058, 9, 11);
    const tension = Math.max(0, finite(state.tension));
    const tensionX = finite(state.tensionX);
    const tensionY = finite(state.tensionY);

    ctx.save();

    // Panel.
    roundedRectPath(ctx, x, y, insetW, insetH, 10);
    ctx.fillStyle = this.colors.insetBg;
    ctx.fill();
    ctx.strokeStyle = this.colors.insetBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title.
    ctx.font = `600 ${titleSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.colors.text;
    ctx.fillText('Tension components', x + 10, y + 7);

    const originX = x + insetW * 0.29;
    const originY = y + insetH * 0.58;
    const arrowLength = Math.min(insetH * 0.33, insetW * 0.23);
    const theta = clamp(finite(state.angle), -55 * Math.PI / 180, 55 * Math.PI / 180);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const txTipX = originX + sinTheta * arrowLength;
    const txTipY = originY;
    const tyTipX = originX;
    const tyTipY = originY - cosTheta * arrowLength;
    const tipX = txTipX;
    const tipY = tyTipY;

    // Dashed component rectangle.
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = this.colors.insetBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(txTipX, txTipY);
    ctx.lineTo(tipX, tipY);
    ctx.moveTo(tyTipX, tyTipY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();

    // Resultant behind the components so the decomposition stays visible even
    // when a component nearly coincides with the rope direction.
    strokeArrow(ctx, originX, originY, tipX, tipY, this.colors.tension, 4);
    if (Math.abs(sinTheta) * arrowLength > 1.5) {
      strokeArrow(ctx, originX, originY, txTipX, txTipY, this.colors.tensionX, 2.2);
    }
    if (cosTheta * arrowLength > 1.5) {
      strokeArrow(ctx, originX, originY, tyTipX, tyTipY, this.colors.tensionY, 2.2);
    }

    // Bob marker at the vector origin.
    ctx.beginPath();
    ctx.arc(originX, originY, clamp(insetW * 0.018, 3, 4.5), 0, TAU);
    ctx.fillStyle = this.colors.bob;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 246, 194, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Numeric readouts.
    ctx.font = `600 ${valueSize}px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const valueY1 = bottom - valueSize * 2 - 7;
    const valueY2 = bottom - valueSize - 5;

    ctx.fillStyle = this.colors.tension;
    ctx.fillText(`T = ${this._formatForce(tension)} N`, x + 10, valueY1);

    const txText = `Tx = ${this._formatForce(Math.abs(tensionX))} N`;
    ctx.fillStyle = this.colors.tensionX;
    ctx.fillText(txText, x + 10, valueY2);
    const txWidth = ctx.measureText(txText).width;

    ctx.fillStyle = this.colors.tensionY;
    ctx.fillText(
      `Ty = ${this._formatForce(Math.abs(tensionY))} N`,
      x + 10 + txWidth + 10,
      valueY2
    );

    ctx.restore();
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  _formatForce(value) {
    const magnitude = Math.abs(finite(value));
    if (magnitude >= 100) return magnitude.toFixed(0);
    if (magnitude >= 10) return magnitude.toFixed(1);
    return magnitude.toFixed(2);
  }
}

  PseudoForce.CarPendulumScene = CarPendulumScene;
})(window);
