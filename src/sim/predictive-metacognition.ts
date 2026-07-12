/**
 * PREDICTIVE METACOGNITION — a creature that knows when to trust its own forecast.
 *
 * The organism world already forecasts ecological pressure. This faculty adds the missing
 * SECOND-ORDER question every good forecaster asks: how RELIABLE is that forecast right now? It fits
 * an arbitrary-order Taylor jet to the recent trajectory (the exact Eshkol v1.3 "differentiate to any
 * order" primitive, {@link ../math/eshkol-taylor-jet}) and reads the magnitude of the HIGHEST-order
 * coefficient — the strength of the fastest-varying component of the trajectory. When a low-order
 * model already fits (a smooth, cubic-or-lower ramp), that coefficient is ~0 and the forecast is
 * trustworthy (confidence → 1). When the trajectory has strong high-order curvature (volatile,
 * rapidly-changing acceleration), the coefficient is large and confidence drops.
 *
 * This is a deterministic, bounded predictive-confidence analogue of Eshkol's validated AD (the
 * interval-remainder idea): the leading Taylor term is the honest estimate of what an order-k model
 * leaves out. It is NOT a rigorous mathematical enclosure and NOT a claim of phenomenal metacognition
 * or consciousness — it is operational control data.
 *
 * Operationally it gates decisiveness: the VQE drive resolver DAMPS how hard a creature commits to a
 * resolved decision when the world is currently unpredictable — coupling two faculties, not adding an
 * isolated readout.
 *
 * Cost: one jet fit per cadence for the whole world; O(order²) coefficient solve, order ≤ 8. Consumers
 * read the stable signal in O(1). Determinism: pure — no Rng/Date.now/Math.random.
 */
import { EshkolTaylorJet, ESHKOL_TAYLOR_MAX_ORDER } from '../math/eshkol-taylor-jet';
import type { PredictiveMetacognitionSignal } from '../types';

const DEFAULT_CADENCE = 12;
const DEFAULT_ORDER = 4;
/** Maps the leading-coefficient magnitude to a confidence in (0,1]: confidence = 1/(1 + SCALE·r). */
const REMAINDER_SCALE = 2;

const clamp01 = (value: number): number =>
  !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

/**
 * Invert the Vandermonde of the backward nodes t = 0, −1, …, −order via Gauss–Jordan, so a single
 * matrix–vector product turns the last `order+1` samples into exact Taylor coefficients c[k] =
 * f⁽ᵏ⁾(t₀)/k! at the newest sample. Row 0 of the result yields c₀ = y₀ exactly. Computed ONCE.
 */
function backwardTaylorInverse(order: number): number[][] {
  const n = order + 1;
  // A[j][i] = (−j)^i : value at node t=−j of the basis monomial tⁱ.
  const a: number[][] = Array.from({ length: n }, (_, j) =>
    Array.from({ length: n }, (_, i) => (j === 0 ? (i === 0 ? 1 : 0) : (-j) ** i)),
  );
  const inv: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
  );
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    }
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    [inv[col], inv[pivot]] = [inv[pivot]!, inv[col]!];
    const d = a[col]![col]! || 1e-12;
    for (let c = 0; c < n; c++) {
      a[col]![c]! /= d;
      inv[col]![c]! /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r]![col]!;
      if (factor === 0) continue;
      for (let c = 0; c < n; c++) {
        a[r]![c]! -= factor * a[col]![c]!;
        inv[r]![c]! -= factor * inv[col]![c]!;
      }
    }
  }
  return inv;
}

export interface PredictiveMetacognitionOptions {
  enabled?: boolean;
  cadenceFrames?: number;
  /** Taylor order of the fit; 2..8. Higher = models faster-varying structure before flagging it. */
  order?: number;
}

/**
 * Shared owner of the world's predictive-confidence. Construct once, {@link step} the tracked signal on
 * the cadence, and hand {@link signal} to consumers (and {@link confidence} to the drive resolver).
 */
export class PredictiveMetacognition {
  readonly signal: PredictiveMetacognitionSignal;
  readonly order: number;

  private readonly cadenceFrames: number;
  private readonly inverse: number[][];
  private readonly history: Float64Array;
  private readonly coefficients: Float64Array;
  private readonly jet: EshkolTaylorJet;
  private historyCount = 0;
  private lastFrame = -Infinity;

  constructor(options: PredictiveMetacognitionOptions = {}) {
    const cadence = options.cadenceFrames ?? DEFAULT_CADENCE;
    if (!Number.isInteger(cadence) || cadence < 1 || cadence > 600) {
      throw new RangeError(`metacognition cadence must be an integer in [1,600], got ${cadence}`);
    }
    const order = options.order ?? DEFAULT_ORDER;
    if (!Number.isInteger(order) || order < 2 || order > ESHKOL_TAYLOR_MAX_ORDER) {
      throw new RangeError(
        `metacognition order must be an integer in [2,${ESHKOL_TAYLOR_MAX_ORDER}]`,
      );
    }
    this.order = order;
    this.cadenceFrames = cadence;
    this.inverse = backwardTaylorInverse(order);
    this.history = new Float64Array(order + 1);
    this.coefficients = new Float64Array(order + 1);
    this.jet = new EshkolTaylorJet(order);
    this.signal = {
      enabled: options.enabled ?? true,
      indicatorOnly: true,
      revision: 0,
      forecast: 0,
      remainder: 0,
      predictiveConfidence: 1,
    };
  }

  /** Confidence in (0,1]: 1 when there is not yet enough history, or the trajectory is low-order. */
  get confidence(): number {
    return this.signal.enabled ? this.signal.predictiveConfidence : 1;
  }

  setEnabled(enabled: boolean): void {
    this.signal.enabled = enabled;
    if (!enabled) {
      this.signal.forecast = 0;
      this.signal.remainder = 0;
      this.signal.predictiveConfidence = 1;
      this.signal.revision++;
    }
    this.lastFrame = -Infinity;
  }

  /**
   * Advance on the cadence with the latest tracked value (e.g., normalized ecological pressure).
   * `force` bypasses the cadence gate for the gate tests. Returns the same signal object every call.
   */
  step(value: number, frame: number, force = false): PredictiveMetacognitionSignal {
    if (!this.signal.enabled) return this.signal;
    const f = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;
    if (!force && f - this.lastFrame < this.cadenceFrames) return this.signal;
    this.lastFrame = f;

    const v = Number.isFinite(value) ? value : 0;
    for (let i = this.history.length - 1; i > 0; i--) this.history[i] = this.history[i - 1]!;
    this.history[0] = v;
    if (this.historyCount < this.history.length) this.historyCount++;

    const s = this.signal;
    if (this.historyCount < this.history.length) {
      // Not enough trajectory to fit yet: hold the raw value, full confidence, zero remainder.
      s.forecast = clamp01(v);
      s.remainder = 0;
      s.predictiveConfidence = 1;
      s.revision++;
      return s;
    }

    // Exact arbitrary-order Taylor coefficients at the newest sample: c = V⁻¹ · history.
    for (let k = 0; k <= this.order; k++) {
      let acc = 0;
      const row = this.inverse[k]!;
      for (let j = 0; j <= this.order; j++) acc += row[j]! * this.history[j]!;
      this.coefficients[k] = acc;
    }
    this.jet.setCoefficients(this.coefficients);

    // The forecast one step ahead, and the honest leading-term remainder (how much the highest order
    // moved the answer) → a bounded confidence.
    s.forecast = clamp01(this.jet.evaluate(1));
    const remainder = Math.abs(this.jet.coefficient(this.order));
    s.remainder = Number.isFinite(remainder) ? remainder : 0;
    s.predictiveConfidence = clamp01(1 / (1 + REMAINDER_SCALE * s.remainder));
    s.revision++;
    return s;
  }

  /** Exact k-th derivative of the fitted jet at the newest sample: k!·c[k]. 0 before enough history. */
  derivative(degree: number): number {
    if (this.historyCount < this.history.length) return 0;
    return this.jet.derivative(degree);
  }
}
