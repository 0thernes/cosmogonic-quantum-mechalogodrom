/**
 * THEORY OF MIND (V94) — Super Creature 1.1's sixth pillar: SOCIAL cognition. The other five pillars model
 * the creature's OWN mind (Global Workspace, Integrated Information, the Free Energy Principle, the echo-
 * state reservoir, and the metacognitive executive); this one models the OTHER agent's. From the observable
 * behaviour of the nearest rival alone, it infers a belief over what that rival is trying to do — a
 * distribution over the same seven plans the creature itself runs — and forecasts its MENACE. This is
 * "mentalizing" / opponent modelling: grounded in Machine Theory of Mind (Rabinowitz et al., DeepMind 2018)
 * and the social-neuroscience mentalizing literature (the temporo-parietal junction inferring others'
 * intentions). An apex predator that predicts its opponents acts on their INTENTIONS, not just their
 * positions — it can pre-empt an attack or press a faltering rival.
 *
 * A fixed-weight predictor (a `TinyMLP`, exactly like the apex sub-networks) maps the rival's observable
 * cues → plan logits; a softmax gives an instantaneous estimate; a leaky belief EMA integrates it. A
 * SOCIAL SURPRISE signal fires when the rival acts against the running belief (the model is wrong — it may
 * be deceived). Deterministic (seeded weights, drawn from a dedicated child stream ⇒ zero perturbation of
 * the apex weight stream), bounded [0,1], allocation-free in steady state. Pure leaf: no DOM, no THREE.
 */
import { TinyMLP } from './ai/brains';
import type { Rng } from '../math/rng';
import { SUPER_PLANS, type SuperPlan } from './super-creature';

/** Observable rival cues fed to the mentalizing net. */
const TOM_IN = 6;
const TOM_HID = 12;
/** The belief is over the SAME plan vocabulary the creature runs (rivals are conspecifics). */
const TOM_OUT = SUPER_PLANS.length; // 7
/** Leaky integration of the belief over the rival's intent (a filter, not a snap judgement). */
const BELIEF_TAU = 0.15;
/** Indices of the plans the creature reads as hostile-toward-me when weighing menace. */
const IDX_HUNT = SUPER_PLANS.indexOf('HUNT');
const IDX_DOMINATE = SUPER_PLANS.indexOf('DOMINATE');
const IDX_DECEIVE = SUPER_PLANS.indexOf('DECEIVE');

// NaN-safe: `NaN > 0` is false ⇒ any non-finite input collapses to 0 (this is a reusable leaf).
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Read-only telemetry of the opponent model for the BRAIN / SuperCreature boards (UI cadence). */
export interface TheoryOfMindSnapshot {
  /** argmax of the belief — the plan the creature thinks the nearest rival is pursuing. */
  predictedRivalPlan: SuperPlan;
  /** The full belief distribution over the 7 plans. */
  belief: number[];
  /** 0..1 — predicted probability the rival is acting against the creature, gated by proximity. */
  menace: number;
  /** 0..1 — how far the rival's apparent intent departs from the running belief (mentalizing error). */
  socialSurprise: number;
  /** 0..1 — peakedness of the belief (how sure the model is which plan the rival is on). */
  confidence: number;
}

/**
 * The theory-of-mind / opponent model. Construct ONCE per mind with a dedicated seeded {@link Rng}; call
 * {@link observe} each beat with the nearest rival's cues, then read {@link menaceLevel} to bias the social
 * plans and {@link snapshot} for telemetry.
 */
export class TheoryOfMind {
  private readonly net: TinyMLP;
  private readonly hid: Float32Array;
  private readonly logits: Float32Array;
  private readonly belief: Float32Array; // EMA distribution over the 7 plans
  private readonly obs = new Float32Array(TOM_IN);
  private menace = 0;
  private socialSurprise = 0;

  constructor(rng: Rng) {
    const w = new Float32Array(TinyMLP.weightCount(TOM_IN, TOM_HID, TOM_OUT));
    for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
    this.net = new TinyMLP(TOM_IN, TOM_HID, TOM_OUT, w);
    this.hid = new Float32Array(TOM_HID);
    this.logits = new Float32Array(TOM_OUT);
    this.belief = new Float32Array(TOM_OUT).fill(1 / TOM_OUT);
  }

  /**
   * Observe the nearest rival's external cues and update the belief over its intent. Returns the MENACE
   * (0..1): the predicted probability the rival is acting against the creature, scaled by how close it is.
   * Allocation-free; O(net).
   */
  observe(
    rivalClose: number,
    threat: number,
    myDominance: number,
    myAggression: number,
    crowding: number,
    chaos: number,
  ): number {
    const o = this.obs;
    o[0] = clamp01(rivalClose);
    o[1] = clamp01(threat);
    o[2] = clamp01(myDominance);
    o[3] = clamp01(myAggression);
    o[4] = clamp01(crowding);
    o[5] = clamp01(chaos);
    this.net.forward(o, this.hid, this.logits);
    // softmax the logits → an instantaneous estimate of the rival's intent
    let max = -Infinity;
    for (let i = 0; i < TOM_OUT; i++) {
      const v = this.logits[i] ?? 0;
      if (v > max) max = v;
    }
    let z = 0;
    for (let i = 0; i < TOM_OUT; i++) {
      const e = Math.exp((this.logits[i] ?? 0) - max);
      this.logits[i] = e;
      z += e;
    }
    const inv = z > 0 ? 1 / z : 0;
    // social surprise = L1 gap between the new estimate and the PRIOR belief (rival defied the model)
    let ss = 0;
    for (let i = 0; i < TOM_OUT; i++) {
      ss += Math.abs((this.logits[i] ?? 0) * inv - (this.belief[i] ?? 0));
    }
    this.socialSurprise = clamp01(ss * 0.5);
    // leaky belief update toward the new estimate
    for (let i = 0; i < TOM_OUT; i++) {
      this.belief[i] =
        (this.belief[i] ?? 0) + BELIEF_TAU * ((this.logits[i] ?? 0) * inv - (this.belief[i] ?? 0));
    }
    // menace = P(rival is HUNT or DOMINATE, plus half its DECEIVE mass), gated by how close it is
    const hostile =
      (IDX_HUNT >= 0 ? (this.belief[IDX_HUNT] ?? 0) : 0) +
      (IDX_DOMINATE >= 0 ? (this.belief[IDX_DOMINATE] ?? 0) : 0) +
      0.5 * (IDX_DECEIVE >= 0 ? (this.belief[IDX_DECEIVE] ?? 0) : 0);
    this.menace = clamp01(hostile * (0.3 + 0.7 * clamp01(rivalClose)));
    return this.menace;
  }

  /** The current menace (0..1) — predicted hostility of the nearest rival, gated by proximity. */
  get menaceLevel(): number {
    return this.menace;
  }

  snapshot(): TheoryOfMindSnapshot {
    let best = 0;
    let bestP = -1;
    let sumSq = 0;
    for (let i = 0; i < TOM_OUT; i++) {
      const p = this.belief[i] ?? 0;
      sumSq += p * p;
      if (p > bestP) {
        bestP = p;
        best = i;
      }
    }
    // confidence = normalised peakedness of the belief: (M·Σp² − 1)/(M − 1) ∈ [0,1] (1 = certain).
    const M = TOM_OUT;
    const confidence = clamp01((M * sumSq - 1) / (M - 1));
    return {
      predictedRivalPlan: SUPER_PLANS[best] ?? 'REST',
      belief: Array.from(this.belief),
      menace: this.menace,
      socialSurprise: this.socialSurprise,
      confidence,
    };
  }
}
