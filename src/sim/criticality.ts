/**
 * NEURAL CRITICALITY (V93) — Super Creature 1.1's **edge-of-chaos self-organiser**. The critical-brain
 * hypothesis (Beggs & Plenz 2003; Shew & Plenz 2013; Wilting & Priesemann 2018; O'Byrne & Jerbi 2022,
 * "How critical is brain criticality?") holds that cortex self-tunes to a CRITICAL POINT between order
 * and chaos — a branching ratio σ ≈ 1 at which neuronal avalanches follow a power law and dynamic range,
 * information transmission and susceptibility are jointly maximised. Anaesthesia and seizure push the
 * brain OFF criticality; wakeful, aware cognition sits near it. This module gives the apex mind the same
 * homeostat: it measures the branching ratio of its OWN activation cascades and adjusts a gain to drive
 * σ → 1, keeping cognition poised at the edge of chaos — neither frozen (subcritical) nor runaway
 * (supercritical) — which then modulates how widely the creature explores in imagination.
 *
 * Branching ratio (Wilting & Priesemann's MR idea, simplified to a leaky ratio of successive
 * active-unit counts): σ̂ = EMA( aₜ / max(1, aₜ₋₁) ), where aₜ = #units whose gain-scaled activation
 * crosses {@link THRESHOLD}. A homeostatic controller nudges the gain g ← clamp(g + η·(1 − σ̂)); g
 * re-scales the activations fed to the threshold next beat, closing the self-organising loop, so the
 * mind settles to a stable active fraction (σ̂ ≈ 1). Susceptibility ∝ 1/(|σ̂ − 1| + ε) peaks at
 * criticality. Fully deterministic (pure arithmetic — no unseeded randomness, no wall-clock; it needs
 * no seed at all) and allocation-free. Pure leaf: no DOM, no THREE.
 */

/** Activation magnitude a unit must exceed (after gain) to count as "firing" this beat. */
const THRESHOLD = 0.3;
/** Homeostatic learning rate driving σ̂ toward 1. */
const CONTROL_RATE = 0.04;
/** EMA rate for the branching-ratio estimate (smooths the noisy per-beat ratio). */
const SIGMA_TAU = 0.1;
/** Gain bounds — the controller may excite (>1) or damp (<1) within this range. */
const GAIN_MIN = 0.25;
const GAIN_MAX = 4;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Read-only telemetry of the criticality homeostat for the BRAIN / SuperCreature boards (UI cadence). */
export interface CriticalitySnapshot {
  /** Number of monitored units (the activation vector width). */
  size: number;
  /** Branching-ratio estimate σ̂ (≈1 = critical, <1 = subcritical/ordered, >1 = supercritical/chaotic). */
  branching: number;
  /** |σ̂ − 1| — distance to the critical point (0 = exactly critical). */
  distanceToCritical: number;
  /** Proximity to criticality, 0..1 (1 = at the edge of chaos, 0 = far). */
  proximity: number;
  /** The homeostatic gain g currently applied to activations (the self-tuning knob). */
  gain: number;
  /** Fraction of units firing this beat, 0..1 (the avalanche's instantaneous size). */
  activeFraction: number;
  /** Susceptibility ∝ 1/(|σ̂−1|+ε), normalised 0..1 — peaks at criticality (max dynamic range). */
  susceptibility: number;
}

/**
 * A self-organised-criticality homeostat. Construct ONCE (no seed needed — it is a deterministic
 * controller); call {@link step} each beat with the mind's activation vector, read {@link gain} to
 * modulate downstream exploration, and {@link snapshot} at UI cadence.
 */
export class Criticality {
  private gainV = 1;
  private sigma = 1; // branching-ratio estimate (starts at the critical value)
  private prevActive = 1; // a_{t−1}, seeded to 1 to avoid a divide-by-zero on the first beat
  private activeFrac = 0;
  private size = 0;

  /**
   * Advance the homeostat one beat under the activation vector `act`: count the firing units (gain-scaled
   * magnitude over threshold), update the branching-ratio EMA from the ratio to last beat's count, and
   * nudge the gain toward criticality (σ̂ → 1). Allocation-free, O(N).
   */
  step(act: ArrayLike<number>): void {
    const n = act.length || 1;
    this.size = n;
    let active = 0;
    for (let i = 0; i < n; i++) {
      if (Math.abs((act[i] ?? 0) * this.gainV) > THRESHOLD) active++;
    }
    const ratio = active / Math.max(1, this.prevActive); // local branching estimate a_t / a_{t−1}
    this.sigma += SIGMA_TAU * (ratio - this.sigma);
    // homeostasis: if subcritical (σ̂ < 1) excite (raise gain); if supercritical, damp.
    this.gainV += CONTROL_RATE * (1 - this.sigma);
    this.gainV = this.gainV < GAIN_MIN ? GAIN_MIN : this.gainV > GAIN_MAX ? GAIN_MAX : this.gainV;
    this.prevActive = active;
    this.activeFrac = active / n;
  }

  /** The homeostatic gain currently applied to activations (the self-tuning knob). */
  get gain(): number {
    return this.gainV;
  }

  /** Branching-ratio estimate σ̂ (≈1 = critical). */
  get branching(): number {
    return this.sigma;
  }

  /** Proximity to criticality, 0..1 (1 = at the edge of chaos). */
  get proximity(): number {
    return clamp01(1 - Math.abs(this.sigma - 1));
  }

  /** Read-only telemetry (UI cadence; allocates the snapshot object). */
  snapshot(): CriticalitySnapshot {
    const dist = Math.abs(this.sigma - 1);
    return {
      size: this.size,
      branching: this.sigma,
      distanceToCritical: dist,
      proximity: this.proximity,
      gain: this.gainV,
      activeFraction: this.activeFrac,
      susceptibility: clamp01(1 / (1 + 8 * dist)), // sharp peak at σ̂ = 1
    };
  }
}
