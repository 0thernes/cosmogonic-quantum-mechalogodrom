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
 * The masterful many-eyed body ([super-body.ts]) and the wingman swarm hang off {@link snapshot}.
 *
 * V75 → V84 — the **Quantum Computing Mind** ([super-qubits.ts]): each beat the composite mind also
 * drives a genuine 6-qubit statevector register, encoding its latent + the 10 quantum aspects into real
 * unitary rotations and tunable entanglement (the directive's "Quantum Computing Mind · Simulated
 * Qubits"). V84 moved three Tsotchke primitives from research INTO development and wired them in: the
 * thought-collapse Born sample is drawn through the ported **Eshkol** qubit-RNG ([eshkol-qrng.ts]); the
 * mind reads the ported **QGT / Fubini–Study** geometry of its own circuit; and a ported **spin-glass**
 * Hopfield/Ising lattice ([spin-glass.ts]) settles each beat into a behavioural archetype that biases
 * the plan — a subsymbolic "gut" instinct (MIT © tsotchke; see THIRD-PARTY-NOTICES.md). Their snapshots
 * ride on {@link snapshot} for the BRAIN view. The classical substance here — Creativity Machine,
 * ToT/AoT, recursive depth — is implemented directly.
 *
 * V89 — SUPER CREATURE 1.1 · the consciousness-metrics layer: the mind now measures itself against the
 * two leading SCIENTIFIC theories of consciousness, each a live scalar computed from its own activations
 * — `ignition` (Global Workspace / GNW: a winner-take-all broadcast that gates memory consolidation) and
 * `phi` (Integrated Information / IIT: a tractable surrogate for Φ). Both deterministic, both unit-tested.
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { TinyMLP, MemoryRing } from './ai/brains';
import { QuantumMind, type QubitSnapshot } from './super-qubits';
import { EshkolQrng, type EshkolQrngSnapshot } from '../math/eshkol-qrng';
import { SpinGlass, type SpinSnapshot } from './spin-glass';
import { Reservoir, type ReservoirSnapshot } from './reservoir';
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
/** Mean of the first `n` elements — a module-summary scalar (module-level ⇒ no per-beat allocation). */
function mean(a: ArrayLike<number>, n: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] ?? 0;
  return n > 0 ? s / n : 0;
}

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
  ignition: number; // 0..1 — V89: Global-Workspace broadcast (GNW) — winning coalition crossing access
  phi: number; // 0..1 — V89: Integrated-Information proxy (IIT) — module participation/coherence (Φ*)
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
  /** V75: the live simulated-qubit register (the Quantum Computing Mind). */
  qubits: QubitSnapshot;
  /** V84: the Eshkol qubit-RNG the mind collapses its thoughts through (ported tsotchke/quantum_rng). */
  eshkol: EshkolQrngSnapshot;
  /** V84: the spin-glass instinct lattice (ported tsotchke/spin_based_neural_network). */
  spin: SpinSnapshot;
  /** V1.1: the echo-state reservoir — temporal dynamical memory + the novelty that drives curiosity. */
  reservoir: ReservoirSnapshot;
}

const EMOTION_TAU = 0.12;

// ── V89 · SUPER CREATURE 1.1 — the consciousness-metrics layer ─────────────────────────────────────
// Two live scalars grounded in the two leading SCIENTIFIC theories of consciousness, computed from the
// mind's own activations each beat (deterministic, bounded [0,1], allocation-free):
//   • ignition (Global Workspace / GNW — Baars · Dehaene): a winner-take-all "ignition" — when one
//     plan-coalition crosses an access threshold AND dominates the runner-up, it is broadcast globally.
//     Here the broadcast has a real downstream effect: it gates which imagined content consolidates into
//     episodic memory (broadcast ⇒ reportable). The 2025 Cogitate adversarial test (Ferrante et al.,
//     Nature) pressured the *offset-ignition* prediction; we model ignition as a signature, not a verdict.
//   • phi (Integrated Information / IIT — Tononi): a TRACTABLE surrogate for Φ. True Φ is super-
//     exponential AND non-unique (Hanson & Walker 2023), so this is explicitly a proxy — the
//     participation/coherence ratio of the named module activations: 1 when the parts act as one
//     integrated whole, ≈0 when they act as independent specialists. See docs/SUPER-CREATURE-RESEARCH.md.
/** Access threshold the winning coalition must cross to "ignite" (GWT). */
const IGNITION_THRESHOLD = 0.25;
/** Ignition EMA rate — punchy, so broadcast reads as a near-all-or-none event. */
const IGNITION_TAU = 0.4;
/** Φ-proxy EMA rate — smoother; integration is a slower-moving property of the whole. */
const PHI_TAU = 0.25;

// ── V84: the spin-glass instinct (ported tsotchke/spin_based_neural_network) ──────────────────────
/** Spins in the Hopfield/Ising instinct lattice (capacity 0.138·N ≈ 7.7 > the 7 plan archetypes). */
const SPIN_SIZE = 56;
/** Metropolis sweeps per beat. */
const SPIN_SWEEPS = 6;
/** Settle temperature — low enough that the archetype attractors dominate the recall. */
const SPIN_TEMP = 0.35;
/** Local-field gain from the situational-salience projection. */
const SPIN_FIELD_GAIN = 0.85;
/** How strongly the recalled instinct biases its matching plan's drive (bounded, small). */
const INSTINCT_GAIN = 0.12;
/** One ±1 archetype per {@link SUPER_PLANS} entry — the instinct's behavioural vocabulary (constants). */
const SPIN_ARCHETYPES: number[][] = ((): number[][] => {
  const r = mulberry32(0x5150ed); // fixed "SPIN" seed → a shared instinct vocabulary across creatures
  return SUPER_PLANS.map(() => Array.from({ length: SPIN_SIZE }, () => (r() < 0.5 ? -1 : 1)));
})();

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
  /** V75: the genuine statevector quantum register the composite mind drives each beat. */
  private readonly qmind: QuantumMind;
  /** V84: the Eshkol qubit-RNG (ported gate-for-gate from tsotchke/quantum_rng) that the mind's
   *  thought-collapse samples through — so the apex psyche literally measures through Eshkol. */
  private readonly eshkol: EshkolQrng;
  /** V84: the spin-glass instinct — a Hopfield/Ising lattice the mind settles to recall an archetype. */
  private readonly spin: SpinGlass;
  /** Dedicated seeded stream for the instinct's Metropolis dynamics (independent of the beat stream). */
  private readonly spinDrive: Rng;
  /** V1.1: the echo-state reservoir the mind steps with its latent each beat (short-term temporal memory). */
  private readonly reservoir: Reservoir;
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
  private readonly spinField = new Float32Array(SPIN_SIZE); // situational drive into the instinct lattice
  private readonly phiMods = new Float32Array(8); // V89: the 8 named module-summary scalars for the Φ proxy

  private readonly memory = new MemoryRing(48);
  private valence = 0;
  private arousal = 0;
  private dominance = 0.5;
  private ignition = 0; // V89: persisted Global-Workspace broadcast (EMA) — gates next-beat consolidation
  private phi = 0; // V89: persisted Integrated-Information proxy (EMA)
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
    ignition: 0,
    phi: 0,
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
    // The quantum mind draws its seed LAST (after every weight is initialised) so it never perturbs
    // the weight stream — a dedicated child stream, so its per-beat Born sample stays independent.
    // V84: that child stream is now the Eshkol qubit-RNG itself (ported gate-for-gate from
    // tsotchke/quantum_rng), so the apex psyche's "thought collapse" is literally measured through the
    // Eshkol generator — still fully reproducible from the world seed (Eshkol is seeded, deterministic).
    // One child seed (a SINGLE rng draw — zero stream shift vs. the prior code) fans out to the three
    // subsymbolic substrates: the Eshkol qubit-RNG, the quantum register it samples through, and the
    // spin-glass instinct. All seeded ⇒ the whole apex psyche still replays bit-for-bit from the seed.
    const childSeed = (Math.floor(rng() * 0xffffffff) ^ 0x9e3779b9) >>> 0 || 1;
    this.eshkol = new EshkolQrng(mulberry32(childSeed));
    this.qmind = new QuantumMind(this.eshkol.stream());
    this.spin = new SpinGlass(SPIN_SIZE, mulberry32((childSeed ^ 0x5bd1e995) >>> 0 || 1));
    this.spin.imprint(SPIN_ARCHETYPES);
    this.spinDrive = mulberry32((childSeed ^ 0x2545f491) >>> 0 || 1);
    this.reservoir = new Reservoir(mulberry32((childSeed ^ 0x119de1f3) >>> 0 || 1));
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
    // V1.1: step the echo-state reservoir on the fresh latent — a fading nonlinear echo of the mind's
    // recent world-models that gives it temporal memory; its novelty (below) sharpens curiosity.
    this.reservoir.step(this.latent);

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

    // dream replay folds the imagined latent into memory (consolidation between beats). V89 · GWT: the
    // PREVIOUS beat's global-workspace broadcast gates how strongly imagined content consolidates —
    // ignited (broadcast) content is what becomes reportable/stored.
    const dreamVec = this.consolidator.forward(this.imagined);
    this.memory.push(unit(dreamVec[0] ?? 0) * (0.5 + 0.5 * this.ignition));

    // ── QUANTUM COMPUTING MIND ── drive the simulated-qubit register with this beat's aspects +
    // latent: the circuit encodes cognition into real unitary evolution + tunable entanglement.
    this.qmind.evolve(this.quantumOut, this.latent);

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
      ignition: this.ignition, // carried; finalised after the plan argmax below
      phi: this.phi, // carried; finalised after the plan argmax below
    };

    // ── SPIN-GLASS INSTINCT ── settle the Hopfield/Ising lattice under a situational field so it
    // recalls the behavioural archetype the moment evokes; its dominant attractor biases the matching
    // plan below — a genuine subsymbolic "gut feeling" arbitrating with the MLP's deliberation.
    const sal: Record<SuperPlan, number> = {
      HUNT: clamp01(s[5] * 0.6 + s[0] * 0.4),
      FLEE: clamp01(s[1]),
      DOMINATE: clamp01(s[4]),
      DECEIVE: clamp01(s[1] * 0.5 + s[2] * 0.5),
      SPAWN: clamp01(s[0] * 0.6),
      EXPLORE: clamp01(s[3] * 0.5 + novelty * 0.5),
      REST: clamp01(1 - this.arousal),
    };
    for (let i = 0; i < SPIN_SIZE; i++) {
      let f = 0;
      for (let pIdx = 0; pIdx < SUPER_PLANS.length; pIdx++) {
        const plan = SUPER_PLANS[pIdx];
        if (!plan) continue;
        f += sal[plan] * (SPIN_ARCHETYPES[pIdx]?.[i] ?? 0);
      }
      this.spinField[i] = f;
    }
    this.spin.setField(this.spinField, SPIN_FIELD_GAIN);
    this.spin.settle(SPIN_SWEEPS, SPIN_TEMP, this.spinDrive);
    let instinctPattern = -1;
    let instinctStrength = 0;
    for (let pIdx = 0; pIdx < SUPER_PLANS.length; pIdx++) {
      const o = this.spin.overlapWith(pIdx);
      const a = o < 0 ? -o : o;
      if (a > instinctStrength) {
        instinctStrength = a;
        instinctPattern = pIdx;
      }
    }
    const instinctPlan = instinctPattern >= 0 ? SUPER_PLANS[instinctPattern] : undefined;

    // ── decode drives ──
    const aggression = unit(act[3] ?? 0);
    const deception = unit(act[4] ?? 0);
    const domProject = unit(act[5] ?? 0);
    const spawnDesire = unit(act[6] ?? 0);
    const curiosity = clamp01(unit(act[7] ?? 0) + 0.3 * novelty + 0.15 * this.reservoir.novelty);

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
    // the instinct's recalled archetype nudges its plan (bounded) — subsymbolic vote on the decision
    if (instinctPlan) drives[instinctPlan] += INSTINCT_GAIN * instinctStrength;
    let best: SuperPlan = 'REST';
    let bestScore = -Infinity;
    let runnerUp = -Infinity;
    for (const k of SUPER_PLANS) {
      const d = drives[k];
      if (d > bestScore) {
        runnerUp = bestScore;
        bestScore = d;
        best = k;
      } else if (d > runnerUp) {
        runnerUp = d;
      }
    }
    this.plan = best;

    // ── V89 · GWT IGNITION ── the winning plan-coalition is "broadcast" when it crosses the access
    // threshold AND dominates the runner-up (a near-all-or-none event). Persisted so it gates the NEXT
    // beat's memory consolidation above; surfaced live on the SuperCreature board.
    const access = clamp01((bestScore - IGNITION_THRESHOLD) / (1 - IGNITION_THRESHOLD));
    const margin = bestScore > 1e-6 ? clamp01((bestScore - runnerUp) / bestScore) : 0;
    this.ignition += IGNITION_TAU * (access * margin - this.ignition);
    this.cons.ignition = this.ignition;

    // ── V89 · IIT Φ-PROXY ── the participation/coherence ratio of the named module activations: 1 when
    // the parts move as one (integrated), 1/M when they act independently (segregated). A TRACTABLE
    // surrogate — true Φ is intractable + non-unique (see docs/SUPER-CREATURE-RESEARCH.md).
    const mods = this.phiMods;
    mods[0] = mean(this.latent, LATENT);
    mods[1] = mean(this.imagined, LATENT);
    mods[2] = mean(reason, LATENT);
    mods[3] = mean(this.pred, LATENT);
    mods[4] = this.organSum[0] ?? 0;
    mods[5] = mean(q, SUPER_QUANTUM);
    mods[6] = mean(aff, 3);
    mods[7] = mean(self, 4);
    let phiEnergy = 0;
    let phiSum = 0;
    for (let i = 0; i < mods.length; i++) {
      const x = mods[i] ?? 0;
      phiEnergy += x * x;
      phiSum += x;
    }
    const M = mods.length;
    const pr = phiEnergy > 1e-9 ? (phiSum * phiSum) / (M * phiEnergy) : 1 / M;
    this.phi += PHI_TAU * (clamp01((pr - 1 / M) / (1 - 1 / M)) - this.phi);
    this.cons.phi = this.phi;

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
      qubits: this.qmind.snapshot(),
      eshkol: this.eshkol.snapshot(),
      spin: this.spin.snapshot(),
      reservoir: this.reservoir.snapshot(),
    };
  }
}
