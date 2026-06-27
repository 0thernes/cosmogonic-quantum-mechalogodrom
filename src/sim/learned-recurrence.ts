/**
 * RPT-1/2 — deterministic online learned recurrence (Butlin / Jaeger extension).
 *
 * A tiny recurrent readout learns to predict the next workspace latent from the current latent using
 * seeded initial weights + one-step truncated BPTT each beat. Unlike the fixed echo-state reservoir,
 * these weights **adapt within a life** while remaining **bit-reproducible from seed** (no Math.random).
 *
 * NOT sentient — a functional learned-recurrence substrate, not biological synaptic plasticity.
 */
import type { Rng } from '../math/rng';

export const LR_HIDDEN = 16;
export const LR_IN = 16;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface LearnedRecurrenceSnapshot {
  readonly hidden: number;
  readonly predictionError: number;
  readonly energy: number;
  readonly steps: number;
}

/**
 * One-step online recurrent learner. `step` is O(H² + H·IN), allocation-free after construction.
 */
export class LearnedRecurrence {
  readonly hidden: number;
  readonly inDim: number;
  private readonly wRec: Float32Array;
  private readonly wIn: Float32Array;
  private readonly h: Float32Array;
  private readonly hNext: Float32Array;
  private predictionError = 0;
  private steps = 0;
  private readonly learnRate: number;

  constructor(rng: Rng, hidden = LR_HIDDEN, inDim = LR_IN, learnRate = 0.003) {
    this.hidden = hidden;
    this.inDim = inDim;
    this.learnRate = learnRate;
    this.wRec = new Float32Array(hidden * hidden);
    this.wIn = new Float32Array(hidden * inDim);
    this.h = new Float32Array(hidden);
    this.hNext = new Float32Array(hidden);
    for (let i = 0; i < this.wRec.length; i++) this.wRec[i] = (rng() * 2 - 1) * 0.08;
    for (let i = 0; i < this.wIn.length; i++) this.wIn[i] = (rng() * 2 - 1) * 0.12;
  }

  /**
   * Forward + one-step learn: predict `target` (typically next latent slice) from `input`.
   * Returns normalised prediction error [0,1].
   */
  step(input: ArrayLike<number>, target: ArrayLike<number>): number {
    const H = this.hidden;
    const IN = this.inDim;
    let err = 0;
    for (let j = 0; j < H; j++) {
      let sum = 0;
      for (let i = 0; i < IN; i++) sum += (input[i] ?? 0) * (this.wIn[i * H + j] ?? 0);
      for (let k = 0; k < H; k++) sum += (this.h[k] ?? 0) * (this.wRec[k * H + j] ?? 0);
      const act = Math.tanh(sum);
      this.hNext[j] = act;
      const tgt = target[j % target.length] ?? 0;
      const delta = tgt - act;
      err += delta * delta;
      const lr = this.learnRate;
      for (let i = 0; i < IN; i++) {
        const idx = i * H + j;
        this.wIn[idx] = (this.wIn[idx] ?? 0) + lr * delta * (1 - act * act) * (input[i] ?? 0);
      }
      for (let k = 0; k < H; k++) {
        const idx = k * H + j;
        this.wRec[idx] = (this.wRec[idx] ?? 0) + lr * delta * (1 - act * act) * (this.h[k] ?? 0);
      }
    }
    this.h.set(this.hNext);
    this.predictionError = clamp01(Math.sqrt(err / H));
    this.steps++;
    return this.predictionError;
  }

  /** Blend learned hidden state into workspace latent (in-place). */
  blendIntoLatent(latent: Float32Array, gain: number): void {
    const g = clamp01(gain);
    const n = Math.min(latent.length, this.hidden);
    for (let i = 0; i < n; i++) {
      latent[i] = (latent[i] ?? 0) + g * (this.h[i] ?? 0) * 0.15;
    }
  }

  get error(): number {
    return this.predictionError;
  }

  snapshot(): LearnedRecurrenceSnapshot {
    let energy = 0;
    for (let i = 0; i < this.hidden; i++) energy += Math.abs(this.h[i] ?? 0);
    return {
      hidden: this.hidden,
      predictionError: this.predictionError,
      energy: clamp01(energy / this.hidden),
      steps: this.steps,
    };
  }
}
