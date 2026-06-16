/**
 * NEUROMODULATION (V95) — Super Creature 1.1's neuromodulatory metalearning layer. Kenji Doya's framework
 * ("Metalearning and neuromodulation", _Neural Networks_ 2002) maps the four classical neuromodulators onto
 * the four metaparameters of reinforcement learning, and that is exactly the role they play here:
 *   • DOPAMINE (DA)      ↔ the reward-prediction error — what is better/worse than expected (drives vigour),
 *   • SEROTONIN (5-HT)   ↔ the temporal-discount factor γ — patience / how far ahead to care (mood),
 *   • NORADRENALINE (NE) ↔ the inverse temperature β — exploit-vs-explore gain / alarm (arousal + surprise),
 *   • ACETYLCHOLINE (ACh)↔ the learning rate α — how fast to update beliefs, i.e. expected uncertainty.
 * This layer computes those four global signals from the creature's OWN state each beat and spends them as a
 * bounded modulation of its drives — a principled chemistry over the cognition, not merely more affect. The
 * dopamine signal is a genuine reward-prediction error: reward minus a running reward expectation (a TD-style
 * baseline). Deterministic (no random weights ⇒ it draws nothing from the seed stream), bounded [0,1],
 * allocation-free, pure leaf: no DOM, no THREE. (Models the metalearning ROLES of the neuromodulators — it
 * makes no claim about actual neurochemistry.)
 */

// NaN-safe by construction (NaN > 0 is false ⇒ non-finite collapses to 0) — this is a reusable leaf.
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Running-reward-expectation rate (the TD baseline the dopamine RPE compares against). */
const REWARD_TAU = 0.1;
/** Per-modulator EMA rates — DA fast (phasic), 5-HT slow (tonic mood), NE quick (alarm), ACh medium. */
const DA_TAU = 0.35;
const SERO_TAU = 0.05;
const NE_TAU = 0.3;
const ACH_TAU = 0.2;

/** Read-only telemetry of the four neuromodulators for the BRAIN / SuperCreature boards (UI cadence). */
export interface NeuromodulationSnapshot {
  /** 0..1 — dopamine: the reward-prediction error, centred at 0.5 (above = better than expected). */
  dopamine: number;
  /** 0..1 — serotonin: tonic mood / patience (the discount-factor analogue). */
  serotonin: number;
  /** 0..1 — noradrenaline: arousal + surprise gain (the inverse-temperature / alarm analogue). */
  noradrenaline: number;
  /** 0..1 — acetylcholine: expected uncertainty (the learning-rate analogue). */
  acetylcholine: number;
  /** The signed reward-prediction error this beat (−1..1) — the raw dopaminergic teaching signal. */
  rpe: number;
}

/**
 * The neuromodulatory metalearning layer. Construct ONCE per mind (no seed — pure deterministic EMAs); call
 * {@link update} each beat with the creature's reward + state, then read the four modulators to bias the
 * decision and {@link snapshot} for telemetry.
 */
export class Neuromodulation {
  private rewardExpect = 0; // running reward baseline (the RPE is measured against this)
  private rpe = 0; // last signed reward-prediction error
  private da = 0.5; // dopamine (centred at 0.5 = "as expected")
  private sero = 0.5; // serotonin (mood / patience)
  private ne = 0.3; // noradrenaline (arousal gain)
  private ach = 0.3; // acetylcholine (expected uncertainty)

  /**
   * Fold this beat's reward + state into the four neuromodulators.
   *
   * @param reward   a composite reward in [0,1] (e.g. energy + wealth + valence) — DA compares it to its baseline
   * @param valence  net affect −1..1 (tonic mood → serotonin)
   * @param arousal  0..1 (→ noradrenaline)
   * @param surprise 0..1 predictor error (→ noradrenaline + acetylcholine)
   * @param threat   0..1 (→ noradrenaline alarm)
   * @param novelty  0..1 (→ acetylcholine, expected uncertainty)
   */
  update(
    reward: number,
    valence: number,
    arousal: number,
    surprise: number,
    threat: number,
    novelty: number,
  ): void {
    const r = clamp01(reward);
    this.rpe = r - this.rewardExpect; // ∈ (−1..1): better (+) or worse (−) than expected
    this.rewardExpect += REWARD_TAU * this.rpe; // move the baseline toward the realised reward
    this.da += DA_TAU * (clamp01(0.5 + 0.5 * this.rpe) - this.da); // RPE → dopamine (centred 0.5)
    const v = valence < -1 ? -1 : valence > 1 ? 1 : valence; // tolerate out-of-range valence
    this.sero += SERO_TAU * (clamp01(0.5 + 0.5 * v) - this.sero); // mood → serotonin
    this.ne += NE_TAU * (clamp01(0.4 * arousal + 0.4 * surprise + 0.2 * threat) - this.ne); // gain/alarm
    this.ach += ACH_TAU * (clamp01(0.5 * novelty + 0.5 * surprise) - this.ach); // expected uncertainty
  }

  /** Dopamine 0..1 — reward-prediction error (>0.5 = reward beat expectation). */
  get dopamine(): number {
    return this.da;
  }
  /** Serotonin 0..1 — tonic mood / patience. */
  get serotonin(): number {
    return this.sero;
  }
  /** Noradrenaline 0..1 — arousal + surprise gain / alarm. */
  get noradrenaline(): number {
    return this.ne;
  }
  /** Acetylcholine 0..1 — expected uncertainty (learning-rate analogue). */
  get acetylcholine(): number {
    return this.ach;
  }

  snapshot(): NeuromodulationSnapshot {
    return {
      dopamine: this.da,
      serotonin: this.sero,
      noradrenaline: this.ne,
      acetylcholine: this.ach,
      rpe: this.rpe,
    };
  }
}
