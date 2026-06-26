/**
 * GWT-4 explicit attention controller.
 *
 * This is not a post-hoc attention label. It is a deterministic, state-dependent allocator that gates
 * the live plan drives before final commitment. It advances the Butlin/GWT-4 receipt from "scaffold" to
 * "mechanism": threat, novelty, workspace ignition, metacognitive confidence, and ACh-like modulation
 * decide which faculty coalition gets access to the global workspace.
 */
import type { SuperPlan } from './super-creature';
import { SUPER_PLANS } from './super-creature';
import type { AttentionSnapshot } from './attention-schema';

const PLAN_COUNT = SUPER_PLANS.length;
const ATTENTION_TAU = 0.35;
const ATTENTION_GAIN = 0.16;

/** State cues that bias attention allocation. All fields are clamped to [0,1]. */
export interface AttentionControllerCues {
  energy: number;
  threat: number;
  novelty: number;
  surprise: number;
  ignition: number;
  workspace: number;
  confidence: number;
  acetylcholine: number;
}

/** Read-only telemetry for the explicit GWT-4 controller. */
export interface AttentionControllerSnapshot {
  focus: number[];
  dominantPlan: SuperPlan;
  confidence: number;
  entropy: number;
  shift: number;
  appliedGain: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Deterministic GWT-4 plan-attention allocator. `updateAndApply` is O(P) where P = plan count and performs
 * no heap allocation; `snapshot` allocates only for telemetry.
 */
export class AttentionController {
  private readonly focus = new Float32Array(PLAN_COUNT);
  private conf = 0;
  private entropy = 1;
  private shift = 0;
  private applied = 0;
  private dominant = 0;

  constructor() {
    for (let i = 0; i < PLAN_COUNT; i++) this.focus[i] = 1 / PLAN_COUNT;
  }

  /**
   * Update the attention distribution and write it into plan drives. O(P), allocation-free.
   *
   * `planSalience` must be in {@link SUPER_PLANS} order and should reflect pre-attentional faculty salience.
   */
  updateAndApply(
    drives: Record<SuperPlan, number>,
    planSalience: ArrayLike<number>,
    cues: AttentionControllerCues,
  ): void {
    let maxDrive = 0;
    for (let i = 0; i < PLAN_COUNT; i++) {
      const plan = SUPER_PLANS[i];
      if (!plan) continue;
      const d = drives[plan];
      if (d > maxDrive) maxDrive = d;
    }
    if (maxDrive < 1e-9) maxDrive = 1;

    let sum = 0;
    let rawDominant = 0;
    let rawDominantScore = -Infinity;
    for (let i = 0; i < PLAN_COUNT; i++) {
      const plan = SUPER_PLANS[i];
      if (!plan) continue;
      const salience = clamp01(planSalience[i] ?? 0);
      const drive = clamp01(drives[plan] / maxDrive);
      const prior = this.stateBias(plan, cues);
      const raw = 0.44 * drive + 0.36 * salience + 0.2 * prior;
      if (raw > rawDominantScore) {
        rawDominantScore = raw;
        rawDominant = i;
      }
      const next = (this.focus[i] ?? 0) + ATTENTION_TAU * (raw - (this.focus[i] ?? 0));
      this.focus[i] = next;
      sum += next;
    }

    if (sum > 1e-9) {
      for (let i = 0; i < PLAN_COUNT; i++) this.focus[i] = (this.focus[i] ?? 0) / sum;
    }

    this.shift =
      Math.abs((this.focus[rawDominant] ?? 0) - (this.focus[this.dominant] ?? 0)) * 0.5 +
      this.shift * 0.5;
    this.dominant = rawDominant;
    this.entropy = this.normalizedEntropy();
    this.conf = clamp01(1 - this.entropy);
    this.applied = 0;

    for (let i = 0; i < PLAN_COUNT; i++) {
      const plan = SUPER_PLANS[i];
      if (!plan) continue;
      const gate = this.focus[i] ?? 0;
      const boost = ATTENTION_GAIN * gate * (0.5 + 0.5 * this.conf);
      drives[plan] += boost;
      this.applied += boost;
    }
  }

  /** Alloc-free read of current attention confidence. */
  get confidence(): number {
    return this.conf;
  }

  /** Allocating telemetry snapshot; do not call from tight loops. */
  snapshot(): AttentionControllerSnapshot {
    return {
      focus: Array.from(this.focus),
      dominantPlan: SUPER_PLANS[this.dominant] ?? 'REST',
      confidence: this.conf,
      entropy: this.entropy,
      shift: this.shift,
      appliedGain: this.applied,
    };
  }

  private stateBias(plan: SuperPlan, cues: AttentionControllerCues): number {
    const energy = clamp01(cues.energy);
    const threat = clamp01(cues.threat);
    const novelty = clamp01(cues.novelty);
    const surprise = clamp01(cues.surprise);
    const ignition = clamp01(cues.ignition);
    const workspace = clamp01(cues.workspace);
    const confidence = clamp01(cues.confidence);
    const acetylcholine = clamp01(cues.acetylcholine);

    switch (plan) {
      case 'HUNT':
        return clamp01(0.35 * energy + 0.25 * confidence + 0.2 * workspace + 0.2 * (1 - threat));
      case 'FLEE':
        return clamp01(0.7 * threat + 0.2 * surprise + 0.1 * (1 - confidence));
      case 'DOMINATE':
        return clamp01(0.3 * energy + 0.3 * ignition + 0.25 * confidence + 0.15 * workspace);
      case 'DECEIVE':
        return clamp01(0.45 * threat + 0.25 * surprise + 0.2 * workspace + 0.1 * (1 - confidence));
      case 'SPAWN':
        return clamp01(0.65 * energy + 0.2 * workspace + 0.15 * confidence);
      case 'EXPLORE':
        return clamp01(
          0.35 * novelty + 0.25 * surprise + 0.25 * acetylcholine + 0.15 * (1 - threat),
        );
      case 'REST':
        return clamp01(0.55 * (1 - threat) + 0.25 * (1 - surprise) + 0.2 * (1 - acetylcholine));
      default: {
        const _exhaustive: never = plan;
        return _exhaustive;
      }
    }
  }

  private normalizedEntropy(): number {
    let ent = 0;
    for (let i = 0; i < PLAN_COUNT; i++) {
      const p = this.focus[i] ?? 0;
      if (p > 1e-9) ent -= p * Math.log(p);
    }
    return clamp01(ent / Math.log(PLAN_COUNT));
  }
}

/** Per-faculty gain after attention biasing (length = `facultyCount`). */
export interface AttentionGains {
  readonly gains: readonly number[];
  /** Mean gain — telemetry for coupling audit. */
  readonly mean: number;
  /** Surprise-modulated spread: high surprise ⇒ more uniform (explore). */
  readonly spread: number;
}

/**
 * Map an 8-dim attention-schema focus onto `facultyCount` faculty gains.
 * Faculties 0..3 track percept clusters; 4 plans; 5 memory; 6–7 quantum/clifford.
 */
export function facultyGainsFromFocus(
  focus: readonly number[],
  facultyCount: number,
  surprise: number,
  neuromod: { da: number; ach: number; ne: number; ht: number },
): AttentionGains {
  const n = Math.max(1, facultyCount);
  const gains = Array.from({ length: n }, () => 0);
  const spread = clamp01(0.35 + 0.65 * surprise * (0.5 + 0.5 * neuromod.ne));
  const sharp = clamp01(0.4 + 0.6 * neuromod.ach * (1 - spread));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const bucket = Math.min(7, Math.floor((i * 8) / n));
    const base = focus[bucket] ?? 1 / 8;
    const g = (1 - spread) * (sharp * base + (1 - sharp) / 8) + spread / n;
    gains[i] = g;
    sum += g;
  }
  const normalized = sum > 1e-9;
  if (normalized) for (let i = 0; i < n; i++) gains[i] = (gains[i] ?? 0) / sum;
  // mean must describe the gains actually returned: after normalization they sum to 1 (mean 1/n);
  // a degenerate sum leaves them ~0. Reporting the pre-normalization sum/n was inconsistent.
  return { gains, mean: normalized ? 1 / n : 0, spread };
}

/**
 * Apply attention gains to a faculty activation vector (in-place on `out`, scaled copy of `activations`).
 */
export function applyAttentionGains(
  activations: readonly number[],
  gains: readonly number[],
  out: Float32Array | number[],
): void {
  const n = Math.min(activations.length, gains.length, out.length);
  for (let i = 0; i < n; i++) out[i] = (activations[i] ?? 0) * (gains[i] ?? 1);
}

/**
 * Bias plan salience from attention focus + surprise (GWT-4 task relevance).
 * `sal` is mutated in place.
 */
export function biasPlanSalience(
  sal: Record<string, number>,
  attn: AttentionSnapshot,
  surprise: number,
  planKeys: readonly string[],
): void {
  const planFocus = attn.focus[4] ?? 0.125;
  const perceptFocus =
    ((attn.focus[0] ?? 0) + (attn.focus[1] ?? 0) + (attn.focus[2] ?? 0) + (attn.focus[3] ?? 0)) / 4;
  const memFocus = attn.focus[5] ?? 0.125;
  for (const k of planKeys) {
    const v = sal[k] ?? 0;
    if (k === 'EXPLORE') sal[k] = clamp01(v + surprise * perceptFocus * 0.15);
    else if (k === 'REST') sal[k] = clamp01(v + memFocus * 0.1);
    else sal[k] = clamp01(v + planFocus * 0.08);
  }
}

/** One-shot: compute gains from a full attention snapshot. */
export function attentionControllerStep(
  attn: AttentionSnapshot,
  facultyCount: number,
  surprise: number,
  neuromod: { da: number; ach: number; ne: number; ht: number },
): AttentionGains {
  return facultyGainsFromFocus(attn.focus, facultyCount, surprise, neuromod);
}
