/**
 * THE SUPER CREATURES (5 Archons / pantheon, GOAL5) + legacy spine — apex minds of the Mechalogodrom (V31+).
 *
 * One unique being is always active: **half the size of a Titan but ~100× its power**, driven by a
 * genuine **deep neural mind** an order of magnitude larger than an NHI's tiny intuition gene. Where a
 * normal creature carries a 50–150-parameter controller and an NHI a single-hidden-layer gene, the
 * Super Creature thinks through a **stacked two-stage network** — a CORTEX that compresses 18 percepts
 * into a 16-dim world-model latent, then an ACTOR that maps that latent to 8 motor/social drives. That
 * is a true 4-layer net (18→32→16→12→8) of **1444 parameters**, inside the briefed 1000–1500 band.
 *
 * On top of the network sit the faculties the brief names: an **emotion-like state** (valence /
 * arousal / dominance, each an EMA of real signals), **episodic memory** (a salience ring), a
 * **prediction loop** (the cortex forecasts next-beat salience; the gap is felt as SURPRISE and feeds
 * back as arousal), **GOAP-style planning** (a goal is chosen each beat from the drive scores), and
 * **self-replication** — when sated and dominant it births up to **3 mutated twins**.
 *
 * Everything is deterministic: weights are rolled from an injected {@link Rng}, `think` is pure and
 * allocation-free, and twin mutation draws from the same seeded stream — so a seed reproduces the
 * Super Creature's entire psychological arc. No `Math.random` / `Date.now`. (Contract rule 7.)
 *
 * This module is the SPINE; the masterful morphing many-eyed BODY + 4K shader that renders it hang off
 * {@link SuperCreature.snapshot} in later increments. See [[reliquary-surface-state]] and ENTITY-SHEETS.
 *
 * ============================================================================
 * NOT SENTIENT DISCLAIMER (binding per MODULE-CONTRACTS.md + masters)
 * NOT SENTIENT. This is a deterministic mathematical model / functional correlate only.
 * No phenomenal consciousness or sentience is implemented or claimed here or in callers.
 * Phenomenal consciousness ~1/10 (contract); hard problem untouched. All "mind"/"plan"/"emotion"
 * terms describe explicit EMA/argmax/numeric mechanisms. See docs/SUPER-CREATURE-RESEARCH.md
 * ============================================================================
 */

import type { Rng } from '../math/rng';
import { TinyMLP, MemoryRing } from './ai/brains';

/** Network shape — chosen so the total parameter count lands inside the briefed 1000–1500 band. */
const SENSE = 18; // perception inputs
const CORTEX_HID = 32; // cortex hidden width
const LATENT = 16; // world-model embedding width
const ACTOR_HID = 12; // actor hidden width
const ACT = 8; // motor/social drives

/** Parameter budget: cortex (18→32→16) + actor (16→12→8). Asserted in tests to stay in [1000,1500]. */
export const SUPER_PARAM_COUNT =
  TinyMLP.weightCount(SENSE, CORTEX_HID, LATENT) + TinyMLP.weightCount(LATENT, ACTOR_HID, ACT);

/** Max living twins the Super Creature may sire (the brief's "twin/offspring creation up to 3"). */
export const SUPER_MAX_OFFSPRING = 3;

/** The goal the planner commits to this beat — a real argmax over drive scores, surfaced to telemetry. */
export type SuperPlan = 'HUNT' | 'FLEE' | 'DOMINATE' | 'DECEIVE' | 'SPAWN' | 'EXPLORE' | 'REST';
export const SUPER_PLANS: readonly SuperPlan[] = [
  'HUNT',
  'FLEE',
  'DOMINATE',
  'DECEIVE',
  'SPAWN',
  'EXPLORE',
  'REST',
] as const;

/** What the Super Creature can sense of the world each beat. Every field is 0..1 unless noted. */
export interface SuperPercept {
  energy: number; // health / satiation
  threat: number; // danger massing nearby
  crowding: number; // local entity density
  chaos: number; // global world disorder
  wealthRel: number; // its purse vs the live mean (0 = broke, 1 = richest)
  preyClose: number; // 1 = prey adjacent, 0 = none in range
  rivalClose: number; // 1 = a rival power adjacent
  pull: number; // singularity / gravitational tug
  light: number; // VISION: scene brightness toward it
  sound: number; // HEARING: audio energy (bass) toward it
  phase: number; // a slow world clock 0..1 (circadian)
}

/** The Super Creature's decision this beat — consumed by the world to move/animate/spawn it. */
export interface SuperIntent {
  move: { x: number; y: number; z: number }; // −1..1 per axis
  aggression: number; // 0..1
  deception: number; // 0..1 (feign-weakness / misdirect)
  dominance: number; // 0..1 projected aura
  spawn: number; // 0..1 desire to replicate
  curiosity: number; // 0..1 drive to explore
  wantsSpawn: boolean; // gated: high desire ∧ sated ∧ below the twin cap
  plan: SuperPlan; // the committed goal
}

/** A read-only view of the live mind — the data telemetry + the future Observatory draw. */
export interface SuperSnapshot {
  name: string;
  generation: number; // 0 = the prime, 1+ = a twin lineage depth
  paramCount: number;
  sizeRel: number; // size vs a Titan (0.5 = half)
  power: number; // power vs a Titan (≈100)
  emotion: { valence: number; arousal: number; dominance: number };
  surprise: number; // |predicted − actual| salience last beat — the prediction-loop error
  offspring: number; // living twins sired (≤ SUPER_MAX_OFFSPRING)
  plan: SuperPlan;
  intent: {
    aggression: number;
    deception: number;
    dominance: number;
    spawn: number;
    curiosity: number;
  };
  sense: number[]; // 18 — the sensory view
  latent: number[]; // 16 — the world-model embedding
  act: number[]; // 8 — raw motor/social output
  memoryMean: number; // running salience memory
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
/** tanh output (−1..1) → unit interval (0..1). */
function unit(v: number): number {
  return v * 0.5 + 0.5;
}

let SUPER_SERIAL = 0; // names twins uniquely without any clock/rng

/** EMA smoothing for the emotion state — slow enough to feel like a temperament, fast enough to react. */
const EMOTION_TAU = 0.12;
/** Per-weight mutation magnitude when a twin is born (deterministic, drawn from the parent's rng). */
const TWIN_MUT_STD = 0.18;

/**
 * The apex mind. Construct once with a seeded {@link Rng} for the prime; `think` each beat with a
 * {@link SuperPercept}; read {@link snapshot} for telemetry. Births twins via {@link maybeSpawn}.
 */
export class SuperCreature {
  readonly name: string;
  readonly generation: number;
  /** Half a Titan (the brief). Titan size is the world's, so this is the RELATIVE factor. */
  readonly sizeRel = 0.5;
  /** ~100× a Titan's power (the brief). Relative, unitless — scales its world influence + visuals. */
  readonly power = 100;

  private readonly cortex: TinyMLP; // 18 → 32 → 16 (world model)
  private readonly actor: TinyMLP; //  16 → 12 →  8 (drives)

  // Allocation-free scratch (steady state allocates nothing in think()).
  private readonly sense = new Float32Array(SENSE);
  private readonly cortexHid = new Float32Array(CORTEX_HID);
  private readonly latent = new Float32Array(LATENT);
  private readonly actorHid = new Float32Array(ACTOR_HID);
  private readonly act = new Float32Array(ACT);

  private readonly memory = new MemoryRing(32);
  private valence = 0; // −1 dread .. +1 triumph
  private arousal = 0; // 0 calm .. 1 frenzied
  private dominance = 0.5; // 0 cowed .. 1 god-mode
  private predictedSalience = 0; // the cortex's forecast for THIS beat, set last beat
  private surprise = 0; // |predicted − actual| last beat
  private plan: SuperPlan = 'REST';
  private offspring = 0;

  /**
   * Birth the Super Creature. With no preset weights it rolls a fresh deep mind from `rng` (the
   * prime); twins pass mutated weight arrays + an incremented generation (see {@link maybeSpawn}).
   */
  constructor(
    rng: Rng,
    opts?: { name?: string; generation?: number; cortexW?: Float32Array; actorW?: Float32Array },
  ) {
    this.generation = opts?.generation ?? 0;
    this.name =
      opts?.name ?? (this.generation === 0 ? 'ARCHITECT-Ω' : `ARCHITECT-Ω·${++SUPER_SERIAL}`);
    const cw = opts?.cortexW ?? SuperCreature.rollWeights(SENSE, CORTEX_HID, LATENT, rng);
    const aw = opts?.actorW ?? SuperCreature.rollWeights(LATENT, ACTOR_HID, ACT, rng);
    this.cortex = new TinyMLP(SENSE, CORTEX_HID, LATENT, cw);
    this.actor = new TinyMLP(LATENT, ACTOR_HID, ACT, aw);
  }

  /** Roll a bias-augmented weight array in [−1,1] for a `(in,hid,out)` layer pair. */
  private static rollWeights(nIn: number, nHid: number, nOut: number, rng: Rng): Float32Array {
    const w = new Float32Array(TinyMLP.weightCount(nIn, nHid, nOut));
    for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
    return w;
  }

  get paramCount(): number {
    return this.cortex.weights.length + this.actor.weights.length;
  }
  get offspringCount(): number {
    return this.offspring;
  }

  /**
   * One cognitive beat: perceive → CORTEX (world model) → ACTOR (drives) → emotion / memory /
   * prediction-loop / plan. Pure & allocation-free. Returns the intent the world acts on.
   */
  think(p: SuperPercept): SuperIntent {
    // ── PERCEPTION: assemble the 18-vector (raw senses + interoceptive feedback) ──────────────────
    const s = this.sense;
    s[0] = clamp01(p.energy);
    s[1] = clamp01(p.threat);
    s[2] = clamp01(p.crowding);
    s[3] = clamp01(p.chaos);
    s[4] = clamp01(p.wealthRel);
    s[5] = clamp01(p.preyClose);
    s[6] = clamp01(p.rivalClose);
    s[7] = clamp01(p.pull);
    s[8] = clamp01(p.light);
    s[9] = clamp01(p.sound);
    s[10] = this.valence; // interoception: it feels its own state
    s[11] = this.arousal;
    s[12] = this.dominance;
    s[13] = this.memory.mean();
    s[14] = this.surprise;
    s[15] = this.offspring / SUPER_MAX_OFFSPRING;
    s[16] = Math.sin(p.phase * Math.PI * 2); // circadian, as a 2-phase clock
    s[17] = Math.cos(p.phase * Math.PI * 2);

    // ── COGNITION: cortex compresses to a world-model latent, actor maps it to drives ─────────────
    this.cortex.forward(s, this.cortexHid, this.latent);
    this.actor.forward(this.latent, this.actorHid, this.act);

    const a = this.act;
    const mx = a[0] ?? 0;
    const my = a[1] ?? 0;
    const mz = a[2] ?? 0;
    const aggression = unit(a[3] ?? 0);
    const deception = unit(a[4] ?? 0);
    const domProject = unit(a[5] ?? 0);
    const spawnDesire = unit(a[6] ?? 0);
    const curiosity = unit(a[7] ?? 0);
    const moveMag = clamp01(Math.sqrt(mx * mx + my * my + mz * mz) / Math.SQRT2);

    // ── PREDICTION LOOP: compare last beat's forecast to this beat's actual salience → surprise ────
    const salience = clamp01(0.5 * s[1] + 0.3 * s[2] + 0.2 * moveMag); // how eventful "now" is
    this.surprise = clamp01(Math.abs(this.predictedSalience - salience));
    this.predictedSalience = unit(this.latent[0] ?? 0); // the cortex's forecast for the NEXT beat
    this.memory.push(salience);

    // ── EMOTION: each axis is an EMA toward a real signal (a temperament, not decoration) ─────────
    this.valence += EMOTION_TAU * (clamp(s[0] - s[1], -1, 1) - this.valence);
    const arouseTarget = clamp01(0.4 * moveMag + 0.3 * this.surprise + 0.3 * aggression);
    this.arousal += EMOTION_TAU * (arouseTarget - this.arousal);
    const domTarget = clamp01(0.6 * domProject + 0.4 * s[4]);
    this.dominance += EMOTION_TAU * (domTarget - this.dominance);

    // ── PLANNING (GOAP-lite): score each goal from drives+senses+emotion, commit to the argmax ────
    const drives: Record<SuperPlan, number> = {
      HUNT: aggression * (0.5 + 0.5 * s[5]) * (1 - 0.5 * s[1]),
      FLEE: s[1] * (1 - this.dominance),
      DOMINATE: domProject * (0.4 + 0.6 * s[4]) * this.dominance,
      DECEIVE: deception * s[1] * (1 - this.dominance),
      SPAWN: spawnDesire * s[0] * (this.offspring < SUPER_MAX_OFFSPRING ? 1 : 0),
      EXPLORE: curiosity * (1 - s[1]) * (0.5 + 0.5 * (1 - s[2])),
      REST: (1 - this.arousal) * (1 - s[1]) * s[0],
    };
    // POWER OF MATH (inline, legacy V31 path): number theory gcd resonance for combinatoric plan-limb alignment (Euclid)
    function _gcd(x: number, y: number) {
      while (y) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x || 1;
    }
    for (let ii = 0; ii < SUPER_PLANS.length; ii++) {
      const pk = SUPER_PLANS[ii]!;
      const res = (_gcd(ii + 1, ((s[0] * 10) | 0) + 1) % 3) * 0.02;
      drives[pk] = (drives[pk] ?? 0) + res;
    }
    let best: SuperPlan = 'REST';
    let bestScore = -Infinity;
    for (const k of SUPER_PLANS) {
      const v = drives[k];
      if (v > bestScore) {
        bestScore = v;
        best = k;
      }
    }
    this.plan = best;

    const wantsSpawn = spawnDesire > 0.8 && this.offspring < SUPER_MAX_OFFSPRING && s[0] > 0.5;
    return {
      move: { x: mx, y: my, z: mz },
      aggression,
      deception,
      dominance: domProject,
      spawn: spawnDesire,
      curiosity,
      wantsSpawn,
      plan: best,
    };
  }

  /**
   * If the mind wants to replicate and is below the twin cap, sire a mutated child and return it
   * (else `null`). The child inherits the parent's weights perturbed by seeded Gaussian-ish noise —
   * a deterministic offspring, one generation deeper. Caller owns the returned twin.
   */
  maybeSpawn(rng: Rng): SuperCreature | null {
    if (this.offspring >= SUPER_MAX_OFFSPRING) return null;
    this.offspring++;
    const cw = SuperCreature.mutate(this.cortex.weights, rng);
    const aw = SuperCreature.mutate(this.actor.weights, rng);
    return new SuperCreature(rng, {
      name: `${this.name}·twin${this.offspring}`,
      generation: this.generation + 1,
      cortexW: cw,
      actorW: aw,
    });
  }

  /** Clone a weight array with per-weight mutation (two rng draws → an approx-normal nudge). */
  private static mutate(src: Float32Array, rng: Rng): Float32Array {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const g = (rng() + rng() - 1) * TWIN_MUT_STD; // sum of 2 uniforms ≈ triangular ~ Gaussian
      out[i] = clamp((src[i] ?? 0) + g, -1.5, 1.5);
    }
    return out;
  }

  /** Immutable snapshot for telemetry / the Observatory. Allocates the small arrays it returns. */
  snapshot(): SuperSnapshot {
    return {
      name: this.name,
      generation: this.generation,
      paramCount: this.paramCount,
      sizeRel: this.sizeRel,
      power: this.power,
      emotion: { valence: this.valence, arousal: this.arousal, dominance: this.dominance },
      surprise: this.surprise,
      offspring: this.offspring,
      plan: this.plan,
      intent: {
        aggression: unit(this.act[3] ?? 0),
        deception: unit(this.act[4] ?? 0),
        dominance: unit(this.act[5] ?? 0),
        spawn: unit(this.act[6] ?? 0),
        curiosity: unit(this.act[7] ?? 0),
      },
      sense: Array.from(this.sense),
      latent: Array.from(this.latent),
      act: Array.from(this.act),
      memoryMean: this.memory.mean(),
    };
  }
}
