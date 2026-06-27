/**
 * Embodiment (Butlin AE-2: output↔input contingency) — a within-life forward BODY-MODEL.
 *
 * The 2026-06-21 honesty audit graded AE-2 as PARTIAL: "embodiment is closed at the WORLD level, not
 * modelled inside think()." This module closes that gap: each beat it predicts the sensory DELTA its
 * chosen action will cause, then next beat measures the ACTUAL change and learns the map (delta rule).
 * Its `contingency` — how predictable its senses are given its own actions — is the computational
 * signature of having a controllable body (output→input→output loop modelled internally). The learning
 * is genuine within-life weight adaptation, so this also strengthens the RPT-2 / AE-1 (learned agency)
 * indicators rather than the architected-only baseline.
 *
 * Determinism law: weights seeded once via `mulberry32`; `step()` draws no rng / no clock. Bounded.
 * NOT sentient — a functional body-model, not an inner body sense.
 */
import { mulberry32 } from '../math/rng';

export interface EmbodimentSnapshot {
  /** [0,1] — how contingent the senses are on the agent's actions (1 = fully predictable/controllable). */
  contingency: number;
  /** Last beat's mean |predicted − actual| sensory-delta error. */
  predictionError: number;
  /** Beats observed. */
  steps: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const round = (x: number): number => Math.round(x * 1e4) / 1e4;
const CONTINGENCY_TAU = 0.1; // EMA rate of the contingency estimate
const LR = 0.1; // within-life learning rate of the body model

/** A learned action→sensory-delta forward model + the contingency it affords. */
export class Embodiment {
  private readonly nPlans: number;
  private readonly dim: number;
  /** nPlans × dim learned map: action → expected sensory delta. */
  private readonly w: Float32Array;
  private readonly lastSensory: Float32Array;
  private readonly predDelta: Float32Array;
  private lastPlan = -1;
  private primed = false;
  private contingency = 0.5;
  private predictionError = 0;
  private stepCount = 0;

  constructor(nPlans: number, dim: number, seed: number) {
    this.nPlans = nPlans;
    this.dim = dim;
    this.w = new Float32Array(nPlans * dim);
    const r = mulberry32(seed >>> 0);
    for (let i = 0; i < this.w.length; i++) this.w[i] = (r() - 0.5) * 0.1;
    this.lastSensory = new Float32Array(dim);
    this.predDelta = new Float32Array(dim);
  }

  /**
   * One beat: (1) verify last beat's prediction against the ACTUAL sensory change and learn the body
   * model (delta rule); (2) predict the sensory delta THIS action will cause. Returns the contingency.
   */
  step(planIdx: number, sensory: ArrayLike<number>): number {
    const d = this.dim;
    const p = ((planIdx % this.nPlans) + this.nPlans) % this.nPlans;
    if (this.primed && this.lastPlan >= 0) {
      let err = 0;
      const base = this.lastPlan * d;
      for (let j = 0; j < d; j++) {
        const actualDelta = (sensory[j] ?? 0) - this.lastSensory[j]!;
        err += Math.abs(this.predDelta[j]! - actualDelta);
        // learn: move the action's expected effect toward the observed effect (within-life plasticity)
        this.w[base + j]! += LR * (actualDelta - this.w[base + j]!);
      }
      this.predictionError = err / d;
      this.contingency += CONTINGENCY_TAU * (clamp01(1 - this.predictionError) - this.contingency);
    }
    const base = p * d;
    for (let j = 0; j < d; j++) {
      this.predDelta[j] = this.w[base + j]!;
      this.lastSensory[j] = sensory[j] ?? 0;
    }
    this.lastPlan = p;
    this.primed = true;
    this.stepCount++;
    return this.contingency;
  }

  snapshot(): EmbodimentSnapshot {
    return {
      contingency: round(this.contingency),
      predictionError: round(this.predictionError),
      steps: this.stepCount,
    };
  }
}
