/**
 * THE METACOGNITIVE EXECUTIVE — Super Creature 1.1's fifth pillar (V92). It does not perceive the world
 * but the MIND ITSELF. Where Global Workspace (`ignition`), Integrated Information (`phi`), the Free
 * Energy Principle ({@link ../sim/active-inference}) and the echo-state reservoir give the creature four
 * parallel substrates of cognition, the metacognitive executive READS their reliability cues and forms a
 * single SECOND-ORDER estimate — a confidence in its own current decision — then spends that confidence
 * as cognitive control: low confidence drives EXPLORATION (resolve the uncertainty), high confidence
 * drives COMMITMENT (exploit the decision). This is the computational core of Higher-Order Theories of
 * consciousness (Rosenthal; Lau & Rosenthal 2011 — "a representation of a representation") and of the
 * metacognition/confidence research program (Fleming & Daw 2017, _Psychological Review_): the brain
 * estimating the reliability of its own first-order states and using that estimate to control behaviour.
 *
 * confidence ← EMA over a weighted blend of four first-order reliability cues, each already 0..1:
 *   • decision margin   — how decisively the winning plan beat the runner-up (first-order evidence),
 *   • Φ integration     — how unified the mind was this beat (a fragmented mind should not be sure),
 *   • belief certainty  — 1 − the active-inference belief entropy (does it know which situation it is in?),
 *   • calm (1−surprise) — was the world as predicted? (a surprised mind should not be sure).
 *
 * Deterministic (a fixed, interpretable linear combination — no random weights, so it draws nothing from
 * the seed stream), bounded [0,1], allocation-free, pure leaf: no DOM, no THREE.
 */

// NaN-safe by construction: `NaN > 0` is false, so any non-finite cue collapses to 0 rather than
// poisoning the confidence EMA (this leaf is reusable + documents a bounded-[0,1] contract).
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** EMA rate of the confidence estimate — slower than ignition, because metacognition is reflective. */
const CONF_TAU = 0.18;
/** Reliability-cue weights (sum = 1): margin · Φ integration · belief certainty · calm. */
const W_MARGIN = 0.4;
const W_PHI = 0.3;
const W_BELIEF = 0.2;
const W_CALM = 0.1;

/** Read-only telemetry of the metacognitive executive for the BRAIN / SuperCreature boards (UI cadence). */
export interface MetacognitionSnapshot {
  /** 0..1 — the second-order confidence in the current decision (the Higher-Order signal). */
  confidence: number;
  /** 0..1 — cognitive-control demand = 1 − confidence (how much to explore / deliberate). */
  control: number;
  /** 0..1 — last first-order decision margin (winning plan vs the runner-up). */
  margin: number;
}

/**
 * The metacognitive executive. Construct ONCE per mind (no seed — it has no random weights); call
 * {@link update} each beat with the four reliability cues, then read {@link value} / {@link control} to
 * modulate the decision and {@link snapshot} for telemetry.
 */
export class Metacognition {
  private confidence = 0.5;
  private lastMargin = 0;

  /**
   * Fold this beat's reliability cues into the confidence EMA and return the updated confidence (0..1).
   *
   * @param margin        decision margin (winner − runnerUp) / winner — 0..1
   * @param phi           the IIT integration proxy — 0..1
   * @param beliefEntropy the active-inference belief entropy — 0..1 (1 = maximally uncertain)
   * @param surprise      the predictor surprise — 0..1
   */
  update(margin: number, phi: number, beliefEntropy: number, surprise: number): number {
    const raw = clamp01(
      W_MARGIN * clamp01(margin) +
        W_PHI * clamp01(phi) +
        W_BELIEF * (1 - clamp01(beliefEntropy)) +
        W_CALM * (1 - clamp01(surprise)),
    );
    this.confidence += CONF_TAU * (raw - this.confidence);
    this.lastMargin = clamp01(margin);
    return this.confidence;
  }

  /** The current second-order confidence (0..1). */
  get value(): number {
    return this.confidence;
  }

  /** Cognitive-control demand = 1 − confidence (0..1) — how strongly to explore/deliberate this beat. */
  get control(): number {
    return 1 - this.confidence;
  }

  snapshot(): MetacognitionSnapshot {
    return { confidence: this.confidence, control: 1 - this.confidence, margin: this.lastMargin };
  }
}
