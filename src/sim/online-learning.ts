/**
 * ONLINE LEARNING — the missing Stratum-X primitive: bounded, deterministic weight adaptation.
 *
 * The audit's headline gap: the apex mind's weights are FROZEN after construction — the Eshkol AD tape
 * computes gradients but nothing ever updates a weight, so the "Learning & Self-Modification" stratum is
 * hollow and the Butlin scorecard stalls at ~9/14. This module supplies the real adaptation rules a mind
 * needs to learn online.
 *
 * DETERMINISM-SAFE (this is the crucial design point): "one seed → one cosmos" forbids *unseeded*
 * randomness, NOT change. Every rule here is a pure, deterministic function of its inputs — no Math.random,
 * no Date.now — so a learned weight trajectory replays bit-for-bit from the same seed. Learning therefore
 * honours Manhattan's determinism law: the cosmos still unfolds identically from one seed; it now also
 * grows. (If a caller ever wants exploration noise, it must pass values drawn from the seeded {@link Rng};
 * none is drawn here.)
 *
 * BOUNDED (Wildbeyond's "loops just below divergence"): every update decays toward zero and clamps the
 * weight magnitude, so no rule can blow a weight (or the frame budget) up. All updates are in-place over a
 * caller-owned buffer — zero allocation, O(n) in the weight count.
 */

/** Shared knobs for the bounded update rules. */
export interface LearnConfig {
  /** Learning rate (step size). Typical 1e-3 … 1e-1. */
  rate: number;
  /** Per-step weight decay toward 0 (forgetting / L2 pull). 0 = none; typical 1e-4 … 1e-2. */
  decay: number;
  /** Hard magnitude bound: every weight is clamped to [-clamp, +clamp]. Keeps the loop below divergence. */
  clamp: number;
}

/** Clamp a scalar to [-c, c], also sealing NaN/±Inf → 0. O(1). */
function bound(v: number, c: number): number {
  if (!(v === v) || v === Infinity || v === -Infinity) return 0; // NaN/Inf → 0
  return v > c ? c : v < -c ? -c : v;
}

/**
 * WIDROW–HOFF / LMS delta rule (supervised): nudge `weights` so a linear unit's output moves toward
 * `target`. `error = target − output` is supplied by the caller (it already knows the output). Update:
 *   wᵢ ← clamp( wᵢ·(1−decay) + rate·error·inputᵢ ).
 * In-place over `weights`; `weights` and `input` must share length. Returns the |error| consumed (for
 * telemetry). Deterministic, O(n), no alloc.
 */
export function deltaRuleUpdate(
  weights: number[],
  input: readonly number[],
  error: number,
  cfg: LearnConfig,
): number {
  const n = weights.length < input.length ? weights.length : input.length;
  const step = cfg.rate * error;
  for (let i = 0; i < n; i++) {
    const w = weights[i] ?? 0;
    weights[i] = bound(w * (1 - cfg.decay) + step * (input[i] ?? 0), cfg.clamp);
  }
  return error < 0 ? -error : error;
}

/**
 * HEBBIAN rule with decay ("cells that fire together wire together"), the unsupervised counterpart:
 *   wᵢ ← clamp( wᵢ·(1−decay) + rate·preᵢ·post ).
 * The decay term is what keeps pure Hebb from diverging (a poor-man's Oja normalisation). In-place,
 * deterministic, O(n), no alloc. Returns the post-synaptic drive magnitude (telemetry).
 */
export function hebbianUpdate(
  weights: number[],
  pre: readonly number[],
  post: number,
  cfg: LearnConfig,
): number {
  const n = weights.length < pre.length ? weights.length : pre.length;
  const step = cfg.rate * post;
  for (let i = 0; i < n; i++) {
    const w = weights[i] ?? 0;
    weights[i] = bound(w * (1 - cfg.decay) + step * (pre[i] ?? 0), cfg.clamp);
  }
  return post < 0 ? -post : post;
}

/**
 * Eligibility-trace learner for DELAYED reward (temporal credit assignment, à la TD(λ)): the trace
 * remembers which inputs were recently active, so a reward that arrives later still reaches the weights
 * that earned it. Per step:
 *   eᵢ ← λ·eᵢ + inputᵢ           (decay the trace, add current activity)
 * Deterministic, bounded, allocation-free after construction (one fixed trace buffer). O(n) per step.
 */
export class EligibilityLearner {
  /** Eligibility trace, one slot per weight. Reused across steps — no per-step allocation. */
  readonly trace: number[];
  /** Trace decay λ ∈ [0,1): how long activity stays "eligible" for reward. */
  private readonly lambda: number;

  constructor(size: number, lambda = 0.9) {
    this.trace = Array.from({ length: size }, () => 0);
    this.lambda = lambda < 0 ? 0 : lambda > 0.999 ? 0.999 : lambda;
  }

  /**
   * Decay the trace toward zero (e.g. on episode reset) without touching weights. O(n).
   */
  reset(): void {
    this.trace.fill(0);
  }

  /**
   * One learning step. `input` drives the trace; `reward` (can be negative) scales the weight change.
   * Mutates both `this.trace` and `weights` in place. Returns the L1 norm of the trace (telemetry).
   * Deterministic, bounded, O(n), no alloc.
   */
  step(
    weights: number[] | Float32Array,
    input: readonly number[] | Float32Array,
    reward: number,
    cfg: LearnConfig,
  ): number {
    const n = weights.length < this.trace.length ? weights.length : this.trace.length;
    const r = Number.isFinite(reward) ? reward : 0;
    const step = cfg.rate * r;
    const decay = Number.isFinite(cfg.decay) ? cfg.decay : 0;
    let traceNorm = 0;
    for (let i = 0; i < n; i++) {
      const prev = this.trace[i] ?? 0;
      const prevSafe = Number.isFinite(prev) ? prev : 0;
      const x = input[i] ?? 0;
      const xSafe = Number.isFinite(x) ? x : 0;
      let e = prevSafe * this.lambda + xSafe;
      if (!Number.isFinite(e)) e = 0;
      this.trace[i] = e;
      traceNorm += e < 0 ? -e : e;
      const w = weights[i] ?? 0;
      weights[i] = bound((Number.isFinite(w) ? w : 0) * (1 - decay) + step * e, cfg.clamp);
    }
    return traceNorm;
  }
}

/** Euclidean norm of a weight vector — for bounded-ness assertions + telemetry. O(n). */
export function weightNorm(weights: readonly number[]): number {
  let s = 0;
  for (const w of weights) s += w * w;
  return Math.sqrt(s);
}
