/**
 * THEORY OF MIND PANTHEON — 25 deterministic organs for social cognition.
 *
 * Each organ is a distinct bounded filter over the same social cues. They do not claim phenomenal mind
 * reading; they are functional mentalizing substrates: opponent modelling, belief tracking, deception
 * pressure, coalition inference, narrative attribution, and meta-ToM telemetry.
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

export interface TomSnapshot {
  organ: TomOrgan;
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

class ParametricTom {
  private readonly belief: Float32Array;
  private readonly prior: Float32Array;
  private readonly scratch: Float32Array;
  private menace = 0;
  private surprise = 0;
  private confidence = 0;

  constructor(
    private readonly organ: TomOrgan,
    private readonly profile: TomProfile,
    private readonly planCount: number,
  ) {
    const n = Math.max(1, planCount);
    this.belief = new Float32Array(n).fill(1 / n);
    this.prior = new Float32Array(n).fill(1 / n);
    this.scratch = new Float32Array(n);
  }

  observe(cues: Float32Array): void {
    this.prior.set(this.belief);
    let delta = 0;

    for (let plan = 0; plan < this.planCount; plan++) {
      const cueIndex = (plan + this.profile.cueOffset) % Math.max(1, cues.length);
      const adjacentIndex = (cueIndex + 1) % Math.max(1, cues.length);
      const cue = at(cues, cueIndex);
      const adjacent = at(cues, adjacentIndex);
      const planRhythm = 0.5 + 0.5 * Math.sin((plan + 1) * (this.profile.phase + 0.618));
      const recursivePrior =
        this.profile.recursion * at(this.prior, (plan + this.profile.cueOffset) % this.planCount);
      const hostileBias =
        (SUPER_PLANS[plan] === 'HUNT' || SUPER_PLANS[plan] === 'DOMINATE'
          ? this.profile.hostility
          : 1 - this.profile.hostility) * cue;

      const raw =
        this.profile.decay * at(this.prior, plan) +
        this.profile.gain * (0.45 * cue + 0.2 * adjacent + 0.2 * hostileBias + 0.15 * planRhythm) +
        recursivePrior * 0.2;

      this.scratch[plan] = raw;
    }

    normalizeInPlace(this.scratch);

    for (let plan = 0; plan < this.planCount; plan++) {
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

  snapshot(): TomSnapshot {
    return {
      organ: this.organ,
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

/** ToM Pantheon controller — manages all 25 organs. */
export class TomPantheon {
  private readonly organs: ParametricTom[];

  constructor(rng: Rng, planCount = SUPER_PLANS.length) {
    const n = Math.max(1, planCount);
    this.organs = TOM_ORGANS.map(
      (organ, index) => new ParametricTom(organ, makeProfile(index, rng), n),
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
}
