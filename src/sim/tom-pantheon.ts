/**
 * THEORY OF MIND PANTHEON — 25 deterministic organs for social cognition, wired into the apex mind as an
 * ENSEMBLE opponent-model (super-mind.ts reads getAggregateMenace()/getAggregateConfidence() each beat to
 * bias the social drives; see the `tomPantheon` snapshot field).
 *
 * Each organ infers a belief over the SAME 7 plans the creature runs (rivals are conspecifics) from shared
 * social cues, and reports its predicted MENACE (hostile intent). Crucially the 25 are NOT one filter cloned
 * 25× — they are drawn from SIX genuinely distinct mechanism FAMILIES (the {@link TomKind}s), each with its
 * own belief-update law, assigned to match the organ's name:
 *   • ADDITIVE   — linear cue blend (the generic mentalizers: MACHINE/NEURAL/SYMBOLIC/…).
 *   • BAYESIAN   — multiplicative likelihood × prior, renormalised (BAYESIAN, CAUSAL): a product update,
 *     not a sum, so evidence compounds and the belief sharpens differently.
 *   • RECURSIVE  — level-k nesting (RECURSIVE, META): folds the rival's prior PEAK back in as a second-order
 *     cue ("it models me modelling it"), shifting hostile mass toward the recursive fixed point.
 *   • TEMPORAL   — trend memory (TEMPORAL, EPISODIC, PROSPECTIVE): slow decay + a derivative term on the cue
 *     (rising threat weighs more than steady threat), so it integrates over a longer window.
 *   • DECEPTION  — inverted-hostility / hidden-intent (DECEPTION, COUNTERFACTUAL): reads LOW overt hostility
 *     under HIGH chaos as concealed hostile intent — the model of an opponent masking its plan.
 *   • COALITION  — neighbour-coupled (COALITION, HIERARCHY, REPUTATION, NARRATIVE): smooths belief across
 *     adjacent plans so group/role intent clusters rather than spiking on a single plan.
 *
 * They do not claim phenomenal mind-reading; they are functional mentalizing substrates. Deterministic
 * (seeded {@link Rng}), bounded [0,1], pure leaf (no DOM/THREE). NOT SENTIENT.
 */

import type { Rng } from '../math/rng';
import { SUPER_PLANS } from './super-creature';

const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

export const TOM_ORGANS = [
  'MACHINE_TOM',
  'BAYESIAN_TOM',
  'NEURAL_TOM',
  'SYMBOLIC_TOM',
  'MULTI_AGENT_TOM',
  'RECURSIVE_TOM',
  'CULTURAL_TOM',
  'TEMPORAL_TOM',
  'EMOTIONAL_TOM',
  'STRATEGIC_TOM',
  'EMPATHIC_TOM',
  'DECEPTION_TOM',
  'COALITION_TOM',
  'HIERARCHY_TOM',
  'REPUTATION_TOM',
  'NORMATIVE_TOM',
  'INTENTIONAL_TOM',
  'CAUSAL_TOM',
  'COUNTERFACTUAL_TOM',
  'EPISODIC_TOM',
  'PROSPECTIVE_TOM',
  'COMPARATIVE_TOM',
  'ATTRIBUTIONAL_TOM',
  'NARRATIVE_TOM',
  'META_TOM',
] as const;

export type TomOrgan = (typeof TOM_ORGANS)[number];

/** The six distinct belief-update mechanism families. */
export type TomKind =
  | 'additive'
  | 'bayesian'
  | 'recursive'
  | 'temporal'
  | 'deception'
  | 'coalition';

/** Maps each organ NAME to its mechanism family — the names are matched by distinct algorithms, not decor. */
const ORGAN_KIND: Record<TomOrgan, TomKind> = {
  MACHINE_TOM: 'additive',
  BAYESIAN_TOM: 'bayesian',
  NEURAL_TOM: 'additive',
  SYMBOLIC_TOM: 'additive',
  MULTI_AGENT_TOM: 'coalition',
  RECURSIVE_TOM: 'recursive',
  CULTURAL_TOM: 'additive',
  TEMPORAL_TOM: 'temporal',
  EMOTIONAL_TOM: 'additive',
  STRATEGIC_TOM: 'recursive',
  EMPATHIC_TOM: 'additive',
  DECEPTION_TOM: 'deception',
  COALITION_TOM: 'coalition',
  HIERARCHY_TOM: 'coalition',
  REPUTATION_TOM: 'coalition',
  NORMATIVE_TOM: 'additive',
  INTENTIONAL_TOM: 'additive',
  CAUSAL_TOM: 'bayesian',
  COUNTERFACTUAL_TOM: 'deception',
  EPISODIC_TOM: 'temporal',
  PROSPECTIVE_TOM: 'temporal',
  COMPARATIVE_TOM: 'additive',
  ATTRIBUTIONAL_TOM: 'additive',
  NARRATIVE_TOM: 'coalition',
  META_TOM: 'recursive',
};

export interface TomSnapshot {
  organ: TomOrgan;
  kind: TomKind;
  belief: number[];
  confidence: number;
  menace: number;
  surprise: number;
}

interface TomProfile {
  cueOffset: number;
  decay: number;
  gain: number;
  hostility: number;
  recursion: number;
  phase: number;
}

function at(xs: ArrayLike<number>, index: number): number {
  return xs[index] ?? 0;
}

function peakedness(dist: ArrayLike<number>): number {
  let sumSq = 0;
  for (let i = 0; i < dist.length; i++) {
    const v = at(dist, i);
    sumSq += v * v;
  }
  const n = Math.max(2, dist.length);
  return clamp01((n * sumSq - 1) / (n - 1));
}

function normalizeInPlace(dist: Float32Array): void {
  let sum = 0;
  for (let i = 0; i < dist.length; i++) sum += Math.max(0, at(dist, i));
  if (sum <= 1e-9) {
    const uniform = 1 / Math.max(1, dist.length);
    for (let i = 0; i < dist.length; i++) dist[i] = uniform;
    return;
  }
  for (let i = 0; i < dist.length; i++) dist[i] = Math.max(0, at(dist, i)) / sum;
}

function hostileMass(dist: ArrayLike<number>): number {
  const hunt = SUPER_PLANS.indexOf('HUNT');
  const dominate = SUPER_PLANS.indexOf('DOMINATE');
  return clamp01((hunt >= 0 ? at(dist, hunt) : 0) + (dominate >= 0 ? at(dist, dominate) : 0));
}

function isHostilePlan(plan: number): boolean {
  return SUPER_PLANS[plan] === 'HUNT' || SUPER_PLANS[plan] === 'DOMINATE';
}

class ParametricTom {
  private readonly belief: Float32Array;
  private readonly prior: Float32Array;
  private readonly scratch: Float32Array;
  private readonly lastCue: Float32Array; // TEMPORAL family: previous beat's per-plan cue (trend term)
  private menace = 0;
  private surprise = 0;
  private confidence = 0;

  constructor(
    private readonly organ: TomOrgan,
    private readonly kind: TomKind,
    private readonly profile: TomProfile,
    private readonly planCount: number,
  ) {
    const n = Math.max(1, planCount);
    this.belief = new Float32Array(n).fill(1 / n);
    this.prior = new Float32Array(n).fill(1 / n);
    this.scratch = new Float32Array(n);
    this.lastCue = new Float32Array(n);
  }

  /** The per-plan instantaneous evidence each family transforms differently. */
  private cueFor(plan: number, cues: Float32Array): number {
    const len = Math.max(1, cues.length);
    const cueIndex = (plan + this.profile.cueOffset) % len;
    const adjacent = at(cues, (cueIndex + 1) % len);
    const cue = at(cues, cueIndex);
    const planRhythm = 0.5 + 0.5 * Math.sin((plan + 1) * (this.profile.phase + 0.618));
    const hostileBias =
      (isHostilePlan(plan) ? this.profile.hostility : 1 - this.profile.hostility) * cue;
    return 0.45 * cue + 0.2 * adjacent + 0.2 * hostileBias + 0.15 * planRhythm;
  }

  observe(cues: Float32Array): void {
    this.prior.set(this.belief);
    const n = this.planCount;
    const len = Math.max(1, cues.length);

    // 1) Each family writes its own raw (pre-normalisation) belief into scratch.
    switch (this.kind) {
      case 'bayesian': {
        // Multiplicative likelihood × prior — evidence compounds (product, not sum).
        for (let plan = 0; plan < n; plan++) {
          const like = 0.15 + 0.85 * clamp01(this.profile.gain * this.cueFor(plan, cues) + 0.1);
          this.scratch[plan] = (0.2 / n + at(this.prior, plan)) * like;
        }
        break;
      }
      case 'recursive': {
        // Level-k: fold the prior's PEAK plan back in as a second-order cue (it models me modelling it).
        let peak = 0;
        let peakP = -1;
        for (let i = 0; i < n; i++) {
          const p = at(this.prior, i);
          if (p > peakP) {
            peakP = p;
            peak = i;
          }
        }
        const recoil = this.profile.recursion + 0.25;
        for (let plan = 0; plan < n; plan++) {
          const nested = plan === peak ? recoil * peakP : 0;
          const hostileEcho = isHostilePlan(plan) && isHostilePlan(peak) ? recoil * peakP * 0.5 : 0;
          this.scratch[plan] =
            this.profile.decay * at(this.prior, plan) +
            this.profile.gain * this.cueFor(plan, cues) +
            nested +
            hostileEcho;
        }
        break;
      }
      case 'temporal': {
        // Trend memory: slow decay + a derivative term (rising cue weighs more than a steady one).
        const slowDecay = clamp01(this.profile.decay + 0.18);
        for (let plan = 0; plan < n; plan++) {
          const raw = this.cueFor(plan, cues);
          const trend = Math.max(0, raw - at(this.lastCue, plan));
          this.scratch[plan] =
            slowDecay * at(this.prior, plan) + this.profile.gain * (0.5 * raw + 0.5 * trend);
          this.lastCue[plan] = raw;
        }
        break;
      }
      case 'deception': {
        // Hidden intent: LOW overt hostility under HIGH chaos reads as concealed hostile intent.
        const chaos = at(cues, (len - 1) % len);
        for (let plan = 0; plan < n; plan++) {
          const overt = this.cueFor(plan, cues);
          const masked = isHostilePlan(plan) ? (1 - clamp01(overt)) * chaos : overt * (1 - chaos);
          this.scratch[plan] =
            this.profile.decay * at(this.prior, plan) +
            this.profile.gain * (0.4 * overt + 0.6 * masked);
        }
        break;
      }
      case 'coalition': {
        // Neighbour-coupled: compute a base then smooth across adjacent plans so group intent clusters.
        for (let plan = 0; plan < n; plan++) {
          this.scratch[plan] =
            this.profile.decay * at(this.prior, plan) + this.profile.gain * this.cueFor(plan, cues);
        }
        const base = Float32Array.from(this.scratch);
        const k = 0.3 + 0.4 * this.profile.hostility;
        for (let plan = 0; plan < n; plan++) {
          const left = at(base, (plan - 1 + n) % n);
          const right = at(base, (plan + 1) % n);
          this.scratch[plan] = at(base, plan) + k * 0.5 * (left + right);
        }
        break;
      }
      default: {
        // ADDITIVE: linear cue blend with a light recursive-prior term.
        for (let plan = 0; plan < n; plan++) {
          const recursivePrior =
            this.profile.recursion * at(this.prior, (plan + this.profile.cueOffset) % n);
          this.scratch[plan] =
            this.profile.decay * at(this.prior, plan) +
            this.profile.gain * this.cueFor(plan, cues) +
            recursivePrior * 0.2;
        }
      }
    }

    normalizeInPlace(this.scratch);

    // 2) Commit, measuring the L1 belief shift (social surprise) on the way.
    let delta = 0;
    for (let plan = 0; plan < n; plan++) {
      const next = at(this.scratch, plan);
      delta += Math.abs(next - at(this.prior, plan));
      this.belief[plan] = next;
    }

    this.surprise = clamp01(delta * 0.5);
    this.confidence = peakedness(this.belief);
    this.menace = clamp01(hostileMass(this.belief) * (0.5 + 0.5 * this.profile.hostility));
  }

  get menaceLevel(): number {
    return this.menace;
  }

  get confidenceLevel(): number {
    return this.confidence;
  }

  beliefVector(): Float32Array {
    return this.belief;
  }

  snapshot(): TomSnapshot {
    return {
      organ: this.organ,
      kind: this.kind,
      belief: Array.from(this.belief),
      confidence: this.confidence,
      menace: this.menace,
      surprise: this.surprise,
    };
  }
}

function makeProfile(index: number, rng: Rng): TomProfile {
  const phase = rng() * Math.PI * 2;
  return {
    cueOffset: index % 6,
    decay: clamp01(0.54 + 0.012 * index),
    gain: clamp01(0.34 + 0.018 * ((index * 7) % 11)),
    hostility: clamp01(0.2 + 0.6 * rng()),
    recursion: clamp01(0.05 + 0.03 * (index % 5)),
    phase,
  };
}

/** Aggregate telemetry of the whole pantheon (what the apex reads + the boards display). */
export interface TomPantheonSnapshot {
  organs: number;
  menace: number;
  confidence: number;
  /** Spread of beliefs across the ensemble (max pairwise L1 distance) — proof the organs are not clones. */
  diversity: number;
  kinds: Record<TomKind, number>;
}

/** ToM Pantheon controller — manages all 25 organs as an ensemble opponent-model. */
export class TomPantheon {
  private readonly organs: ParametricTom[];

  constructor(rng: Rng, planCount = SUPER_PLANS.length) {
    const n = Math.max(1, planCount);
    this.organs = TOM_ORGANS.map(
      (organ, index) => new ParametricTom(organ, ORGAN_KIND[organ], makeProfile(index, rng), n),
    );
  }

  observe(cues: Float32Array): void {
    for (const organ of this.organs) organ.observe(cues);
  }

  getSnapshot(organIndex: number): TomSnapshot {
    const index = Math.abs(Math.floor(organIndex)) % this.organs.length;
    return (this.organs[index] ?? this.organs[0]!).snapshot();
  }

  getAllSnapshots(): TomSnapshot[] {
    return this.organs.map((organ) => organ.snapshot());
  }

  getAggregateMenace(): number {
    let total = 0;
    for (const organ of this.organs) total += organ.menaceLevel;
    return this.organs.length > 0 ? total / this.organs.length : 0;
  }

  getAggregateConfidence(): number {
    let total = 0;
    for (const organ of this.organs) total += organ.confidenceLevel;
    return this.organs.length > 0 ? total / this.organs.length : 0;
  }

  /** Max pairwise L1 distance between organ beliefs — 0 iff every organ agrees exactly (i.e. clones). */
  diversity(): number {
    let max = 0;
    for (let i = 0; i < this.organs.length; i++) {
      const a = this.organs[i]!.beliefVector();
      for (let j = i + 1; j < this.organs.length; j++) {
        const b = this.organs[j]!.beliefVector();
        let d = 0;
        for (let k = 0; k < a.length; k++) d += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
        if (d > max) max = d;
      }
    }
    return max;
  }

  snapshot(): TomPantheonSnapshot {
    const kinds: Record<TomKind, number> = {
      additive: 0,
      bayesian: 0,
      recursive: 0,
      temporal: 0,
      deception: 0,
      coalition: 0,
    };
    for (const organ of TOM_ORGANS) kinds[ORGAN_KIND[organ]]++;
    return {
      organs: this.organs.length,
      menace: this.getAggregateMenace(),
      confidence: this.getAggregateConfidence(),
      diversity: this.diversity(),
      kinds,
    };
  }
}
