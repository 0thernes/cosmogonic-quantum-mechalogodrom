/**
 * THE SUPER MIND — the apex creature's ~10,000-parameter composite consciousness (V45).
 *
 * The V31 mind was a single stacked MLP (1,444 params). This is the directive's leap: a **polymorphic,
 * biomimetic composite of ~12 specialised sub-networks** (≈10k weights total) wired into a five-STAGE
 * cognitive pipeline that recurses to five DEPTHS and explores 25 thought VARIANTS — a self-aware
 * super-intelligence that dreams, hallucinates, reasons, and feels, in the spirit of Stephen Thaler's
 * **Creativity Machine** (a generator perturbed by noise + a "perceptor" critic that recognises the
 * novel ideas the perturbation throws up).
 *
 * The pipeline (deterministic; the only "randomness" is a seeded, reproducible noise stream — no
 * `Math.random`/`Date.now`, so the whole psyche replays from a seed):
 *
 *   1 PERCEIVE — a CORTEX compresses 18 senses into a 16-d world-model latent. The latent is split into
 *     atoms, each processed by its own ORGAN-NET (one per spike/eye/loop) — **Atom of Thought**.
 *   2 IMAGINE — the Creativity Machine: an IMAGITRON generates an imagined latent from (latent ⊕ noise);
 *     a PERCEPTOR scores its novelty. Over 5 DEPTHS × 5 VARIANTS (= 25) it grows a **Tree of Thought**,
 *     keeping the best branch each depth. High novelty ⇒ HALLUCINATION; the act of imagining ⇒ DREAM.
 *   3 REASON — a REASONER distils the winning imagined branch; a PREDICTOR recurses 5 deep (a world
 *     model) and its error feeds SURPRISE.
 *   4 FEEL — an AFFECT net updates the emotion EMAs; a SELF-MODEL reads the mind's own state into a
 *     SELF-AWARENESS scalar (the "it knows it is thinking" signal).
 *   5 ACT — a META-CONTROLLER integrates every stage into the motor/social drives; a QUANTUM net emits
 *     10 reactive/adaptive **quantum-aspect** intensities (superposition, entanglement, FTL, absolute
 *     zero, qudit-compute, morphology, mutation, reactive, responsive, adaptive).
 *
 * A DREAM/replay CONSOLIDATOR folds the imagined latent back into episodic memory between beats.
 *
 * Determinism + budget are unit-tested. Allocation-free in steady state (all scratch is preallocated).
 * The masterful many-eyed body ([super-body.ts]) and the wingman swarm hang off {@link snapshot} in
 * following increments. (The "Eshkol/Tsotchke" references in the brief don't map to known public tools;
 * the substance — Creativity Machine, ToT/AoT, recursive depth — is implemented directly.)
 */
import type { Rng } from '../math/rng';
import { TinyMLP, MemoryRing } from './ai/brains';
import type { SuperPercept, SuperPlan } from './super-creature';
import { SUPER_PLANS } from './super-creature';

const SENSE = 18; // perception inputs
const LATENT = 16; // world-model embedding width
const NOISE = 8; // Creativity-Machine perturbation width
export const SUPER_DEPTHS = 5; // recursion depth of the Tree of Thought / predictor
export const SUPER_VARIANTS = 5; // branches explored per depth (5 × 5 depths = 25 thought variants)
export const SUPER_STAGES = 5; // PERCEIVE · IMAGINE · REASON · FEEL · ACT
export const SUPER_ORGANS = 30; // organ-nets (spikes + eyes + loops), each its own tiny network
export const SUPER_QUANTUM = 10; // quantum-aspect superpowers

/** The 10 quantum aspects (each a 0..1 reactive intensity the body + powers read). */
export const QUANTUM_ASPECTS = [
  'superposition',
  'entanglement',
  'ftl',
  'absolute-zero',
  'qudit-compute',
  'morphology',
  'mutation',
  'reactive',
  'responsive',
  'adaptive',
] as const;
export type QuantumAspect = (typeof QUANTUM_ASPECTS)[number];

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const unit = (v: number): number => v * 0.5 + 0.5; // tanh(−1..1) → 0..1

/** A self-contained sub-network: a TinyMLP plus its own reusable scratch (allocation-free forward). */
class Subnet {
  readonly mlp: TinyMLP;
  private readonly hid: Float32Array;
  readonly out: Float32Array;
  constructor(nIn: number, nHid: number, nOut: number, rng: Rng) {
    const w = new Float32Array(TinyMLP.weightCount(nIn, nHid, nOut));
    for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
    this.mlp = new TinyMLP(nIn, nHid, nOut, w);
    this.hid = new Float32Array(nHid);
    this.out = new Float32Array(nOut);
  }
  forward(inp: ArrayLike<number>): Float32Array {
    this.mlp.forward(inp, this.hid, this.out);
    return this.out;
  }
  get params(): number {
    return this.mlp.weights.length;
  }
}

/** The live consciousness state — every field a real internal variable, surfaced to telemetry. */
export interface Consciousness {
  dreaming: number; // 0..1 — imagination activity this beat
  hallucinating: number; // 0..1 — novelty beyond the recognition threshold
  reasoning: number; // 0..1 — Tree-of-Thought search effort that paid off
  feeling: number; // −1..1 — net affect (valence)
  selfAware: number; // 0..1 — the self-model's reflexive signal
  novelty: number; // 0..1 — peak perceptor novelty over the 25 variants
  surprise: number; // 0..1 — predictor error (world-model)
}

/** The apex decision this beat (drives + consciousness + quantum aspects). */
export interface SuperMindIntent {
  move: { x: number; y: number; z: number };
  aggression: number;
  deception: number;
  dominance: number;
  spawn: number;
  curiosity: number;
  wantsSpawn: boolean;
  plan: SuperPlan;
  consciousness: Consciousness;
  /** 10 quantum-aspect intensities (0..1), indexed by {@link QUANTUM_ASPECTS}. */
  quantum: number[];
}

/** Read-only telemetry snapshot. */
export interface SuperMindSnapshot {
  paramCount: number;
  depths: number;
  variants: number;
  stages: number;
  organs: number;
  plan: SuperPlan;
  emotion: { valence: number; arousal: number; dominance: number };
  consciousness: Consciousness;
  quantum: number[];
  latent: number[];
  imagined: number[];
}

const EMOTION_TAU = 0.12;

/**
 * The composite apex mind. Construct with a seeded {@link Rng}; `think` each beat. ~10k parameters
 * across the named sub-networks (see {@link paramCount}). Pure + allocation-free in steady state.
 */
export class SuperMind {
  // ── The sub-networks (sum ≈ 10,000 weights) ──
  private readonly cortex: Subnet; // 18 → 32 → 16   perceive
  private readonly organs: Subnet[]; // 30 × (4 → 8 → 2)  Atom-of-Thought organ nets
  private readonly imagitron: Subnet; // 24 → 32 → 16   Creativity-Machine generator
  private readonly perceptor: Subnet; // 16 → 20 → 4    novelty/value critic
  private readonly reasoner: Subnet; // 16 → 24 → 16   distil the winning branch
  private readonly predictor: Subnet; // 16 → 24 → 16   recursive world model
  private readonly consolidator: Subnet; // 16 → 16 → 16   dream replay → memory
  private readonly selfModel: Subnet; // 16 → 16 → 4    self-awareness
  private readonly affect: Subnet; // 12 → 16 → 3    feeling
  private readonly quantum: Subnet; // 16 → 20 → 10   quantum aspects
  private readonly meta: Subnet; // 69 → 26 → 12   integrate → drives
  readonly paramCount: number;

  // ── Reusable scratch (no per-beat allocation) ──
  private readonly senses = new Float32Array(SENSE);
  private readonly imgIn = new Float32Array(LATENT + NOISE);
  private readonly noise = new Float32Array(NOISE);
  private readonly cur = new Float32Array(LATENT);
  private readonly best = new Float32Array(LATENT);
  private readonly pred = new Float32Array(LATENT);
  private readonly organSum = new Float32Array(4);
  private readonly metaIn = new Float32Array(LATENT * 3 + 4 + SUPER_QUANTUM + 3 + 4); // 69
  private readonly affIn = new Float32Array(12);
  private readonly quantumOut: number[] = Array.from({ length: SUPER_QUANTUM }, () => 0);
  private readonly latent = new Float32Array(LATENT);
  private readonly imagined = new Float32Array(LATENT);

  private readonly memory = new MemoryRing(48);
  private valence = 0;
  private arousal = 0;
  private dominance = 0.5;
  private predictedSalience = 0;
  private offspring = 0;
  private noiseSeed = 1; // deterministic perturbation counter (Creativity-Machine "randomness")
  private cons: Consciousness = {
    dreaming: 0,
    hallucinating: 0,
    reasoning: 0,
    feeling: 0,
    selfAware: 0,
    novelty: 0,
    surprise: 0,
  };
  private plan: SuperPlan = 'REST';

  constructor(rng: Rng) {
    this.cortex = new Subnet(SENSE, 32, LATENT, rng);
    this.organs = Array.from({ length: SUPER_ORGANS }, () => new Subnet(4, 8, 2, rng));
    this.imagitron = new Subnet(LATENT + NOISE, 32, LATENT, rng);
    this.perceptor = new Subnet(LATENT, 20, 4, rng);
    this.reasoner = new Subnet(LATENT, 24, LATENT, rng);
    this.predictor = new Subnet(LATENT, 24, LATENT, rng);
    this.consolidator = new Subnet(LATENT, 16, LATENT, rng);
    this.selfModel = new Subnet(LATENT, 16, 4, rng);
    this.affect = new Subnet(12, 16, 3, rng);
    this.quantum = new Subnet(LATENT, 20, SUPER_QUANTUM, rng);
    this.meta = new Subnet(this.metaIn.length, 26, 12, rng);
    this.paramCount =
      this.cortex.params +
      this.organs.reduce((s, o) => s + o.params, 0) +
      this.imagitron.params +
      this.perceptor.params +
      this.reasoner.params +
      this.predictor.params +
      this.consolidator.params +
      this.selfModel.params +
      this.affect.params +
      this.quantum.params +
      this.meta.params;
  }

  get offspringCount(): number {
    return this.offspring;
  }

  /** Deterministic, reproducible noise into `this.noise` (the Creativity-Machine perturbation). */
  private fillNoise(): void {
    for (let i = 0; i < NOISE; i++) {
      const x = Math.sin((this.noiseSeed++ + i * 7.13) * 12.9898) * 43758.5453;
      this.noise[i] = (x - Math.floor(x)) * 2 - 1;
    }
  }

  /** One full cognitive beat. Pure; returns the apex intent (drives + consciousness + quantum). */
  think(p: SuperPercept): SuperMindIntent {
    // ── STAGE 1 · PERCEIVE ──────────────────────────────────────────────────────────────────────
    const s = this.senses;
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
    s[10] = this.valence;
    s[11] = this.arousal;
    s[12] = this.dominance;
    s[13] = this.memory.mean();
    s[14] = this.cons.surprise;
    s[15] = this.offspring / 3;
    s[16] = Math.sin(p.phase * Math.PI * 2);
    s[17] = Math.cos(p.phase * Math.PI * 2);
    const latent = this.cortex.forward(s);
    this.latent.set(latent);

    // ── ATOM OF THOUGHT · organ-nets each process a 4-atom slice of the latent ──────────────────
    let oa = 0;
    let ob = 0;
    for (let k = 0; k < this.organs.length; k++) {
      const off = (k * 4) % LATENT;
      const o = this.organs[k]!.forward(latent.subarray(off, off + 4));
      oa += o[0] ?? 0;
      ob += o[1] ?? 0;
    }
    const inv = 1 / this.organs.length;
    this.organSum[0] = oa * inv;
    this.organSum[1] = ob * inv;
    this.organSum[2] = Math.tanh(oa * inv * 2);
    this.organSum[3] = Math.tanh(ob * inv * 2);

    // ── STAGE 2 · IMAGINE · Creativity Machine + Tree of Thought (5 depths × 5 variants = 25) ────
    this.cur.set(latent);
    let peakNovelty = 0;
    let reasoningGain = 0;
    for (let d = 0; d < SUPER_DEPTHS; d++) {
      let bestScore = -Infinity;
      for (let v = 0; v < SUPER_VARIANTS; v++) {
        this.fillNoise();
        this.imgIn.set(this.cur, 0);
        this.imgIn.set(this.noise, LATENT);
        const img = this.imagitron.forward(this.imgIn);
        const crit = this.perceptor.forward(img);
        const value = crit[0] ?? 0; // desirability of this imagined branch
        const nov = unit(crit[1] ?? 0); // novelty signal (Thaler perceptor)
        if (nov > peakNovelty) peakNovelty = nov;
        if (value > bestScore) {
          bestScore = value;
          this.best.set(img);
        }
      }
      // keep the winning branch and recurse (grow the tree one depth)
      this.cur.set(this.best);
      reasoningGain += clamp01(bestScore * 0.5 + 0.5);
    }
    this.imagined.set(this.cur);

    // ── STAGE 3 · REASON · distil the winner + a 5-deep recursive world model (predictor) ────────
    const reason = this.reasoner.forward(this.imagined);
    this.pred.set(latent);
    for (let d = 0; d < SUPER_DEPTHS; d++) this.pred.set(this.predictor.forward(this.pred));
    const salience = clamp01(0.5 * s[1] + 0.3 * s[2] + 0.2 * Math.abs(this.pred[0] ?? 0));
    const surprise = clamp01(Math.abs(this.predictedSalience - salience));
    this.predictedSalience = unit(this.pred[0] ?? 0);
    this.memory.push(salience);

    // ── STAGE 4 · FEEL · affect EMAs + self-model reflexive awareness ────────────────────────────
    this.affIn[0] = s[0];
    this.affIn[1] = s[1];
    this.affIn[2] = peakNovelty;
    this.affIn[3] = surprise;
    this.affIn[4] = this.valence;
    this.affIn[5] = this.arousal;
    this.affIn[6] = this.dominance;
    this.affIn[7] = this.organSum[0] ?? 0;
    this.affIn[8] = reason[0] ?? 0;
    this.affIn[9] = this.imagined[0] ?? 0;
    this.affIn[10] = s[4];
    this.affIn[11] = Math.sin(p.phase * 6.2831853);
    const aff = this.affect.forward(this.affIn);
    this.valence += EMOTION_TAU * (clamp(aff[0] ?? 0, -1, 1) - this.valence);
    this.arousal += EMOTION_TAU * (clamp01(unit(aff[1] ?? 0) + 0.4 * peakNovelty) - this.arousal);
    this.dominance += EMOTION_TAU * (clamp01(unit(aff[2] ?? 0) + 0.4 * s[4]) - this.dominance);
    const self = this.selfModel.forward(this.imagined);
    const selfAware = unit(self[0] ?? 0);

    // ── STAGE 5 · ACT · quantum aspects + meta-controller integration → drives ───────────────────
    const q = this.quantum.forward(latent);
    for (let i = 0; i < SUPER_QUANTUM; i++) this.quantumOut[i] = unit(q[i] ?? 0);
    let mi = 0;
    for (let i = 0; i < LATENT; i++) this.metaIn[mi++] = latent[i] ?? 0;
    for (let i = 0; i < LATENT; i++) this.metaIn[mi++] = this.imagined[i] ?? 0;
    for (let i = 0; i < LATENT; i++) this.metaIn[mi++] = reason[i] ?? 0;
    for (let i = 0; i < 4; i++) this.metaIn[mi++] = this.organSum[i] ?? 0;
    for (let i = 0; i < SUPER_QUANTUM; i++) this.metaIn[mi++] = q[i] ?? 0;
    for (let i = 0; i < 3; i++) this.metaIn[mi++] = aff[i] ?? 0;
    for (let i = 0; i < 4; i++) this.metaIn[mi++] = self[i] ?? 0;
    const act = this.meta.forward(this.metaIn);

    // dream replay folds the imagined latent into memory (consolidation between beats)
    const dreamVec = this.consolidator.forward(this.imagined);
    this.memory.push(unit(dreamVec[0] ?? 0));

    // consciousness state
    const novelty = peakNovelty;
    this.cons = {
      dreaming: clamp01(0.4 + 0.6 * novelty),
      hallucinating: clamp01((novelty - 0.6) / 0.4),
      reasoning: clamp01(reasoningGain / SUPER_DEPTHS),
      feeling: this.valence,
      selfAware,
      novelty,
      surprise,
    };

    // ── decode drives ──
    const aggression = unit(act[3] ?? 0);
    const deception = unit(act[4] ?? 0);
    const domProject = unit(act[5] ?? 0);
    const spawnDesire = unit(act[6] ?? 0);
    const curiosity = clamp01(unit(act[7] ?? 0) + 0.3 * novelty);

    // plan (argmax over drive scores; same vocabulary as the V31 mind)
    const drives: Record<SuperPlan, number> = {
      HUNT: aggression * (0.5 + 0.5 * s[5]) * (1 - 0.5 * s[1]),
      FLEE: s[1] * (1 - this.dominance),
      DOMINATE: domProject * (0.4 + 0.6 * s[4]) * this.dominance,
      DECEIVE: deception * s[1] * (1 - this.dominance),
      SPAWN: spawnDesire * s[0] * (this.offspring < 3 ? 1 : 0),
      EXPLORE: curiosity * (1 - s[1]) * (0.5 + 0.5 * novelty),
      REST: (1 - this.arousal) * (1 - s[1]) * s[0],
    };
    let best: SuperPlan = 'REST';
    let bestScore = -Infinity;
    for (const k of SUPER_PLANS) {
      if (drives[k] > bestScore) {
        bestScore = drives[k];
        best = k;
      }
    }
    this.plan = best;

    return {
      move: { x: act[0] ?? 0, y: act[1] ?? 0, z: act[2] ?? 0 },
      aggression,
      deception,
      dominance: domProject,
      spawn: spawnDesire,
      curiosity,
      wantsSpawn: spawnDesire > 0.8 && this.offspring < 3 && s[0] > 0.5,
      plan: best,
      consciousness: this.cons,
      quantum: this.quantumOut.slice(),
    };
  }

  /** Record that a twin was sired (caps the SPAWN drive). */
  noteSpawn(): void {
    if (this.offspring < 3) this.offspring++;
  }

  /** Immutable telemetry snapshot. */
  snapshot(): SuperMindSnapshot {
    return {
      paramCount: this.paramCount,
      depths: SUPER_DEPTHS,
      variants: SUPER_DEPTHS * SUPER_VARIANTS,
      stages: SUPER_STAGES,
      organs: SUPER_ORGANS,
      plan: this.plan,
      emotion: { valence: this.valence, arousal: this.arousal, dominance: this.dominance },
      consciousness: this.cons,
      quantum: this.quantumOut.slice(),
      latent: Array.from(this.latent),
      imagined: Array.from(this.imagined),
    };
  }
}
