/**
 * PLASTIC / FAST WEIGHTS — within-life self-modification (Stratum X; faculties #87 + #91).
 *
 * The apex mind's subnet weights are frozen at birth (seeded, deterministic). That is the biggest gap
 * on the route to NHSI (static architecture, no online learning) and the
 * largest unmet consciousness marker (Butlin RPT — learned recurrence). This is the substrate that lets
 * the mind change its OWN weights AS IT LIVES, without retraining: a fast-changing Hebbian weight matrix
 * overlaid on the slow frozen weights.
 *
 * Mechanism — HEBBIAN FAST WEIGHTS (Hebb 1949, "cells that fire together wire together"; Ba, Hinton,
 * Mnih, Leibo, Ionescu 2016, "Using Fast Weights to Attend to the Recent Past"). Each beat: the fast
 * matrix decays a little and accumulates the outer product of the current activation (W ← (1−λ)·W +
 * η·x⊗x). Recall (W·x) then pulls new activations toward recently-co-active patterns — a transient,
 * self-written associative memory that the mind both READS and WRITES every beat (PHILOSOPHY: every
 * system reads AND writes another). Decay keeps it a *recent-past* memory and bounds it; a clip keeps it
 * stable. It is genuine online plasticity, not training — the weights move within a single life.
 *
 * PURE + deterministic: no rng, no clock, no DOM; init is zeros; all updates are arithmetic over the
 * supplied (already-deterministic) activations. Determinism-law-safe. Wiring it into super-mind think()
 * (a plastic overlay on the latent / a fast associative recall biasing the plan) is the clean follow-up.
 */

/** A lean telemetry snapshot of a {@link FastWeights} matrix. */
export interface PlasticSnapshot {
  /** Matrix dimension (n × n). */
  readonly n: number;
  /** Total |weight| mass — how much the mind has written into its fast memory right now. */
  readonly energy: number;
  /** The single strongest |weight| — the dominant learned association. */
  readonly strongest: number;
}

/**
 * A Hebbian FAST-WEIGHT matrix: a transient, self-written associative memory the mind updates each beat.
 * Deterministic; bounded by decay + clip; starts empty. `eta` = plasticity rate, `decay` = forgetting
 * rate (keeps it a recent-past memory), `clip` = per-weight magnitude bound (stability).
 */
export class FastWeights {
  private readonly w: Float64Array;

  constructor(
    private readonly n: number,
    private readonly eta = 0.5,
    private readonly decay = 0.1,
    private readonly clip = 4,
  ) {
    this.w = new Float64Array(Math.max(0, n) * Math.max(0, n));
  }

  /**
   * One plasticity step: decay the fast weights and imprint the outer product of `x` (Hebbian
   * `W ← clip((1−decay)·W + η·xᵢxⱼ)`). Mutates the matrix (that IS the learning); `x` is not mutated.
   */
  imprint(x: readonly number[]): void {
    const n = this.n;
    const keep = 1 - this.decay;
    for (let i = 0; i < n; i++) {
      const xi = x[i] ?? 0;
      const row = i * n;
      for (let j = 0; j < n; j++) {
        let v = keep * (this.w[row + j] ?? 0) + this.eta * xi * (x[j] ?? 0);
        if (v > this.clip) v = this.clip;
        else if (v < -this.clip) v = -this.clip;
        this.w[row + j] = v;
      }
    }
  }

  /** Recall: `y = W·x` — the fast-memory's pull toward recently-co-active patterns. Pure (new array). */
  recall(x: readonly number[]): number[] {
    const n = this.n;
    const y = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++) {
      const row = i * n;
      let s = 0;
      for (let j = 0; j < n; j++) s += (this.w[row + j] ?? 0) * (x[j] ?? 0);
      y[i] = s;
    }
    return y;
  }

  /**
   * The full plastic overlay for one beat: recall FIRST (read the fast memory built from prior beats),
   * THEN imprint the current `x` (write this beat in) — so the returned overlay reflects the recent past,
   * not a within-beat echo of the input itself. Returns `x[i] + gain·recall(x)[i]` (the slow activation
   * nudged by the self-written fast memory). Pure w.r.t. `x`.
   */
  step(x: readonly number[], gain = 1): number[] {
    const recalled = this.recall(x);
    this.imprint(Array.from(x));
    return x.map((xi, i) => (xi ?? 0) + gain * (recalled[i] ?? 0));
  }

  /** Recall + imprint in one beat; writes overlay into `out` (length ≥ n). Allocation-free. */
  overlayInPlace(x: ArrayLike<number>, out: Float32Array | number[], gain = 1): void {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const row = i * n;
      let s = 0;
      for (let j = 0; j < n; j++) s += (this.w[row + j] ?? 0) * (x[j] ?? 0);
      out[i] = (x[i] ?? 0) + gain * s;
    }
    this.imprint(Array.from(x));
  }

  snapshot(): PlasticSnapshot {
    let energy = 0;
    let strongest = 0;
    for (let k = 0; k < this.w.length; k++) {
      const a = Math.abs(this.w[k] ?? 0);
      energy += a;
      if (a > strongest) strongest = a;
    }
    return { n: this.n, energy, strongest };
  }
}
