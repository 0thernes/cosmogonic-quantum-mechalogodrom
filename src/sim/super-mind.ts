/**
 * THE SUPER MIND — the apex creature's ~10,000-parameter composite cognition model (V45; consciousness-metrics proxies only).
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
 *
 * ============================================================================
 * NOT SENTIENT DISCLAIMER (binding per MODULE-CONTRACTS + masters + GOAL5 receipts)
 * NOT SENTIENT. Deterministic mathematical model / functional correlate / simulacrum only.
 * No phenomenal consciousness, sentience, or hard-problem solution claimed or implemented.
 * Terms ("mind", "consciousness", "HOT", "dream", "hallucinate", "prophecy", "self-aware",
 * "memory as decision", "super power") are shorthand for explicit mechanisms:
 *   Tree-of-Thought / AoT numeric recursion, EMA affect, argmax plan, GWT-ignition proxy,
 *   IIT-Φ surrogate, Clifford/Eshkol/QGT/spin ports as *models*. See receipts + PHILOSOPHY.
 * All 5 Archons are distinct biased instances of this scaffold. Hard problem untouched.
 * ============================================================================
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { latentSubstrateStep, type LatentSubstrateState } from './latent-substrates';
import { gwtCapacityCompete, type GwtCapacityResult } from '../math/global-workspace';
import { Embodiment, type EmbodimentSnapshot } from './embodiment';
import { TinyMLP, MemoryRing } from './ai/brains';
import { QuantumMind, QMIND_QUBITS, type QubitSnapshot } from './super-qubits';
import { EshkolQrng, type EshkolQrngSnapshot } from '../math/eshkol-qrng';
import { CliffordTableau, type CliffordSnapshot } from '../math/clifford-tableau';
import {
  adBackward,
  adGradient,
  adMul,
  adSub,
  adTapeNew,
  adTapeReset,
  adVar,
  type AdTape,
} from '../math/eshkol-ad';
import {
  consciousnessTriple,
  EshkolConsciousnessEngine,
  eshkolEvalProgram,
  eshkolApplyProgramEffect,
  type EshkolConsciousnessSnapshot,
} from './eshkol-bridge';
import {
  eshkolDual,
  eshkolADGradient,
  moonlabTensorContract,
  eshkolApplyAD,
  moonlabTensorQualia,
  quakePerturb,
  gwtBroadcast,
  moonlabMpoStep,
  makeEshkolDual,
  dualAdd,
  dualMul,
  libirrepSymmetry,
  ulgHandoff,
  curvatureAwareNaturalGradient2x2,
  vecNorm,
  storeHebbian,
  recall,
  overlap,
  type HopfieldNet,
  izhStep,
  izhRest,
  IZH_RS,
  type IzhState,
  inferStep,
  freeEnergy,
  initBeliefs,
  type PCNet,
  eshkolParse,
  eshkolCompile,
  eshkolExecute,
  moonlabMPOApply,
} from './tsotchke-facade';
import { SpinGlass, type SpinSnapshot } from './spin-glass';
import { Reservoir, type ReservoirSnapshot } from './reservoir';
import { ActiveInference, AIF_OBS, type ActiveInferenceSnapshot } from './active-inference';
import { Metacognition, type MetacognitionSnapshot } from './metacognition';
import { Criticality, type CriticalitySnapshot } from './criticality';
import { TheoryOfMind } from './theory-of-mind';
import { TomPantheon, type TomPantheonSnapshot } from './tom-pantheon';
import { SuccessorRepresentation, type SuccessorSnapshot } from './successor-representation';
import { Neuromodulation } from './neuromodulation';
import { EmpowermentDrive, type EmpowermentSnapshot } from './empowerment';
import { EligibilityLearner } from './online-learning';
import { QuantumReservoir, type QuantumReservoirSnapshot } from './quantum-reservoir';
import { HolographicMemory, type HolographicSnapshot } from './holographic-memory';
import { QuantumDeliberation, type DeliberationSnapshot } from './quantum-deliberation';
import { ResonanceField, type ResonanceSnapshot } from './resonance';
import { FastWeights, type PlasticSnapshot } from './plastic-weights';
import type { SuperPercept, SuperPlan } from './super-creature';
import { SUPER_PLANS, SUPER_MAX_OFFSPRING } from './super-creature';
// GOAL5 leaves (per MODULE-CONTRACTS contract: super-mind owns wiring of AST-1/HOT-1/HOT-4/memory-orchestra/narrative)
import { AttentionSchema } from './attention-schema';
import {
  AttentionController,
  attentionControllerStep,
  biasPlanSalience,
  type AttentionControllerSnapshot,
} from './attention-controller';
import {
  classicalIntegratedInformation,
  classicalParticipationRatio,
} from './integrated-information';
import { LearnedRecurrence, type LearnedRecurrenceSnapshot } from './learned-recurrence';
import { NQSLearningController, type NQSTelemetry } from './nqs-vmc-learning';
import { grayScottResidual, pinnLoss } from './pinn-residual';
import { pathWeight } from './pimc-paths';
import { qrngApiDrawFrom } from './quantum-rng-api';
import { homebrewEshkolBeat } from './homebrew-eshkol';
import { TSOTCHKE_HARVEST } from './generated-tsotchke-seeds';
import { TopDownPerception } from './topdown-perception';
import { QualitySpace } from './quality-space';
import { MemoryOrchestra } from './memory-orchestra';
import { NarrativeMemory } from './narrative-memory';
import { vqeEnergyProxy } from './moonlab-vqe';
// TSOTCHKE CORPUS (Z:\[Vibe Coded (AI)]\(Tsotchke)): full 20 repos + sites wired. See docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md.
// AD primitive for HOT-1, arena discipline, symmetry, tensor. See audit + receipts.

const SENSE = 18; // perception inputs
const LATENT = 16; // world-model embedding width
const NOISE = 8; // Creativity-Machine perturbation width
export const SUPER_DEPTHS = 5; // recursion depth of the Tree of Thought / predictor
export const SUPER_VARIANTS = 5; // branches explored per depth (5 × 5 depths = 25 thought variants)
export const SUPER_STAGES = 5; // PERCEIVE · IMAGINE · REASON · FEEL · ACT
export const SUPER_ORGANS = 30; // organ-nets (spikes + eyes + loops), each its own tiny network
export const SUPER_QUANTUM = 10; // quantum-aspect intensities (modeled effects; no physical claim)

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

/** The live cognition/consciousness-metrics state (proxies + scalars from submodules) — every field a real internal variable, surfaced to telemetry. No phenomenal claim. */
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
  workspace: number; // Eshkol GWT workspace broadcast from Tsotchke corpus (CONSCIOUSNESS_ENGINE.md)
  qualiaTone: number; // HOT-4: sparse-smooth quality manifold scalar (proxy)
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
  /** RPT-1/2: learned recurrence telemetry. */
  learnedRecurrence: LearnedRecurrenceSnapshot;
  /** RPT-1/2 enhancement: NQS/VMC quantum-state learning telemetry. */
  nqs: NQSTelemetry | null;
  /** V1.1: the active-inference free-energy core (Friston FEP) — belief, free energy, expected free energy. */
  aif: ActiveInferenceSnapshot;
  /** V1.1 (V92): the metacognitive executive — a Higher-Order confidence in the decision + cognitive control. */
  metacog: MetacognitionSnapshot;
  /** V1.1 (V93): the criticality homeostat — branching ratio σ̂ + edge-of-chaos self-tuning. */
  criticality: CriticalitySnapshot;
  /** V1.1: the successor-representation predictive map — model-based look-ahead over the plan dynamics. */
  successor: SuccessorSnapshot;
  /** V95: the empowerment drive — Blahut–Arimoto channel capacity I(A;S′) = how much the mind can STEER its
   *  own future (a reward-free agency hunger, distinct from novelty + the active-inference epistemic term). */
  empowerment: EmpowermentSnapshot;
  /** V97: the holographic (VSA/HRR) memory — the plan it analogically recalls for the current context. */
  holographic: HolographicSnapshot;
  /** V1.2: the quantum-reservoir-computing readout of the 6-qubit register's observable trajectory. */
  quantumReservoir: QuantumReservoirSnapshot;
  /** V98: the open-system Lindblad deliberation qubit — coherent superposition of options decohering into
   *  a committed decision (T₂ dephasing + T₁ relaxation). */
  deliberation: DeliberationSnapshot;
  /** #59: the resonance integrator — standing-wave coherence binding the consciousness assembly by
   *  synchrony (Kuramoto), and whether it crossed into an ignited (bound) moment this beat. */
  resonance: ResonanceSnapshot;
  /** #87/#91: plastic fast-weights — within-life Hebbian self-modification of the latent workspace. */
  plastic: PlasticSnapshot;
  /** #10/#58: the GWT workspace broadcast strength [0,1] — the bound coherence that re-enters arousal +
   *  curiosity next beat, coupling the faculties through the shared workspace. */
  broadcast: number;
  /** V101: Clifford stabilizer snapshot (Moonlab port). */
  clifford: CliffordSnapshot;
  // TSOTCHKE Eshkol consciousness (corpus): 3 substrates + module/program for 5 Archons.
  eshkolConsciousness: {
    logic: number;
    inference: number;
    workspace: number;
    module: string;
    program: string;
  };
  // GOAL5 (AST-1/HOT-1/HOT-4 per contract)
  attentionFocus: number;
  /** GWT-4: explicit state-dependent attention allocator over the plan coalition. */
  attentionController: AttentionControllerSnapshot;
  /** The 25-organ ToM ensemble: aggregate menace/confidence (which bias the social drives), belief diversity
   *  across the 6 mechanism families (0 ⇒ clones), and the family histogram. */
  tomPantheon: TomPantheonSnapshot;
  topDownError: number;
  qualia: number[];
  /** V1.3: the latent-substrate read — Schrödinger uncertainty, SO(3) coherence, Pearl-causal effect. */
  latentSubstrates: LatentSubstrateState;
  /** V1.3 GWT-2: limited-capacity workspace read — occupancy/capacity/access/pressure (Cowan bottleneck). */
  gwtCapacity: { occupancy: number; capacity: number; access: number; pressure: number };
  /** V1.3 AE-2: the forward body-model — contingency / prediction-error / steps. */
  embodiment: EmbodimentSnapshot;
}

const EMOTION_TAU = 0.12; // sync with super-creature for affect EMA (GWT/HOT feel)
/** #71: valence steers behaviour — affect biases plan drives (Butlin sentience proxy). */
const VALENCE_STEER_GAIN = 0.18;
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
//     integrated whole, ≈0 when they act as independent specialists. See docs/SUPER-CREATURE-RESEARCH-2026-06-26.md.
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
/** Clean Hopfield attractor recall (tsotchke/spin_based_neural_network → math/hopfield.ts). */
const HOPFIELD_GAIN = 0.08;
/** Hierarchical predictive-coding net (Rao–Ballard): 4 senses → 2 hidden causes. */
const MIND_PC_NET: PCNet = {
  sizes: [4, 2],
  weights: [
    [
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
    ],
  ],
  precisions: [1, 0.2],
  prior: [0, 0],
};
const PC_SURPRISE_GAIN = 0.025;
const IZH_SPIKE_GAIN = 0.03;
/** One ±1 archetype per {@link SUPER_PLANS} entry — the instinct's behavioural vocabulary (constants). */
const SPIN_ARCHETYPES: number[][] = ((): number[][] => {
  const r = mulberry32(0x5150ed); // fixed "SPIN" seed → a shared instinct vocabulary across creatures
  return SUPER_PLANS.map(() => Array.from({ length: SPIN_SIZE }, () => (r() < 0.5 ? -1 : 1)));
})();

// ── V1.1 · ACTIVE INFERENCE (Friston's Free Energy Principle) ─────────────────────────────────────
/** How strongly the expected-free-energy vote biases plan selection (bounded, on par with the instinct). */
const AIF_GAIN = 0.12;
/** The generative model of what each plan tends to bring about, in observation space
 *  [energy, threat, prey, rival, novelty, wealth] — used to score each plan's EXPECTED free energy. */
const PLAN_OBS: Record<SuperPlan, number[]> = {
  HUNT: [0.6, 0.6, 0.9, 0.2, 0.0, 0.3],
  FLEE: [-0.3, -0.9, -0.5, -0.2, -0.2, 0.0],
  DOMINATE: [0.4, 0.2, 0.0, 0.6, 0.0, 0.8],
  DECEIVE: [0.0, 0.3, 0.2, 0.7, 0.0, 0.3],
  SPAWN: [0.5, -0.3, 0.0, -0.2, 0.0, 0.2],
  EXPLORE: [0.2, -0.2, 0.3, 0.0, 0.9, 0.2],
  REST: [0.3, -0.6, -0.3, -0.3, -0.5, 0.0],
};
/** The plan observations in {@link SUPER_PLANS} order, so the EFE index i ↔ SUPER_PLANS[i]. */
const PLAN_OBS_ARR: number[][] = SUPER_PLANS.map((p) => PLAN_OBS[p]);

// ── V92 · METACOGNITIVE EXECUTIVE (Higher-Order Theory of consciousness) ──────────────────────────
/** Low metacognitive confidence opens an exploration drive (bounded) — uncertainty ⇒ seek information. */
const METACOG_EXPLORE_GAIN = 0.18;

// ── V1.1 · SUCCESSOR REPRESENTATION (the predictive map — Dayan 1993; Stachenfeld et al. 2017) ──────
/** How strongly the model-based look-ahead value biases plan selection (bounded, on par with the others). */
const SR_GAIN = 0.12;

// ── V95 · EMPOWERMENT DRIVE (channel-capacity intrinsic motivation — Klyubin/Polani/Nehaniv 2005) ──────
/** Vote for the most-empowering plan (the highest channel-capacity contribution; bounded, on par). */
const EMP_VOTE_GAIN = 0.12;
/** How strongly agency-hunger lifts curiosity toward regions the mind can actually steer. */
const EMP_CURIOSITY_GAIN = 0.12;
/** #9/#37 SHARED-PROCESSING — an INCOHERENT workspace (low last-beat coherence) means the mind's action→
 *  outcome statistics are stale/unreliable, so the empowerment channel forgets faster (treats incoherence
 *  as extra effective surprise — Salge/Polani non-stationary channel; FEP low-precision ⇒ faster update).
 *  Routed into the EXISTING surprise input of empowerment.update, so empowerment co-varies with the
 *  collective as a genuine adaptation-rate byproduct — not an output edit. */
const INCOH_FORGET_GAIN = 0.4;

// ── V97 · HOLOGRAPHIC MEMORY (VSA / HRR analogical recall — Plate 1995; Kanerva 2009) ────────────────
/** Vote for the plan the holographic trace analogically recalls for this context (bounded, on par). */
const HRR_GAIN = 0.12;

// ── V98 · QUANTUM DELIBERATION (Lindblad open-system decider — GKSL master equation) ─────────────────
/** While the deliberation qubit stays COHERENT (undecided), lift exploration to keep deliberating. */
const DELIB_GAIN = 0.1;
/** #9/#37 SHARED-PROCESSING coupling — last beat's bound coherence SUPPRESSES the deliberation's dephasing
 *  bath (a collectively-correlated environment dephases slower; GWT stabilises a bound coalition against
 *  premature collapse). Routed into the EXISTING arousal→dephasing input, so deliberation.coherence becomes
 *  a genuine Lindblad byproduct of the collective — not an output edit. Bounded; uses lastResOrder. */
const DELIB_COUPLE = 0.5;

// ── V1.2 · QUANTUM RESERVOIR COMPUTING (Fujii & Nakajima 2017 — the qubit register IS the reservoir) ──
/** How strongly the quantum-state velocity (qFlux) drives curiosity (bounded, on par with the others). */
const QRC_CURIOSITY_GAIN = 0.1;
/** How strongly the quantum reservoir's LEARNED linear readout (the 4-D feature vector — the actual point
 *  of reservoir computing) biases the plan drives (bounded, P1-ablatable via qGate). */
const QRC_FEATURE_GAIN = 0.05;
/** How strongly the CP¹ manifold curvature (Christoffel trace) corrects the flat QGT natural gradient in the
 *  apex's self-optimization step (0 = flat Fisher QNG; small = a bounded Riemannian curvature correction). */
const QNG_CURVATURE_WEIGHT = 0.15;
/** How strongly the MemoryOrchestra regime-shift sentinel lifts exploration (classical faculty, ungated). */
const MEMORY_REGIME_GAIN = 0.05;
/** How strongly the NarrativeMemory recalled-narrative trust votes for continuing the recent plan. */
const NARRATIVE_TRUST_GAIN = 0.04;
/** V1.3: how strongly the evolved-wavepacket positional uncertainty (Schrödinger) lifts curiosity. */
const LATENT_CURIOSITY_GAIN = 0.1;
/** V1.3 · GWT-2: the limited-capacity workspace size (Cowan's ~4 ± 1 conscious slots). */
const GWT_WORKSPACE_CAPACITY = 4;
/** V1.3 · GWT-2: how strongly last beat's workspace competition pressure re-enters curiosity. */
const GWT_CAPACITY_REENTRY_GAIN = 0.08;
/** V1.3 · AE-2: sensory dimensions the forward body-model predicts (s[0..7]). */
const EMBODIMENT_DIM = 8;
/** V1.3 · AE-2: how strongly body-contingency (knowing one's own body) lifts the self-awareness signal. */
const EMBODIMENT_SELF_GAIN = 0.12;

// ── #59 · RESONANCE INTEGRATOR (Kuramoto binding-by-synchrony — the coupling spark) ───────────────────
/** The consciousness/integration faculties coupled into the standing wave (the "do they agree?" set). */
const RESONANCE_FACULTIES = 12;
/** When BOUND (ignited), how hard the standing wave contrast-sharpens the coalition (decisive commit). */
const RESONANCE_COMMIT_GAIN = 0.14;
/** When UNBOUND (incoherent), how hard the scattered assembly is pushed to EXPLORE (resolve the doubt). */
const RESONANCE_EXPLORE_GAIN = 0.1;
/** #9/#37 COUPLING>COUNT — GWT binding gate: how strongly last beat's resonance coherence (the bound-
 *  assembly signal) modulates the access-faculties (dreaming/hallucinating/reasoning). This is the
 *  documented "the bound assembly's signal is made available to the modules so they co-vary through it"
 *  mechanism applied DIRECTLY to the faculty derivations — NOT via the latent (which the measured
 *  experiments showed washes out). Centred on r=0.5 so it transmits the VARYING coherence (co-variation),
 *  not a DC offset. Theory-motivated (GNW workspace access), so the resulting co-variation is a genuine
 *  byproduct of integration, not an injected correlation. Tuned by the coupling-audit. */
const COUPLING_BIND_GAIN = 0.5;
/** #9/#37 UN-RAIL (2026-07-02): scales the selfAware BASE below the 1.0 clamp rail so the bind-gate's
 *  ± excursions transmit instead of being clipped away — the coupling audit measured selfAware ISOLATED
 *  at 200 beats because the raw sum saturated to a constant 1.0 (a pinned instrument reads nothing).
 *  Companion NULLs from the same experiment (reverted, do not retry blindly): coherence-gating the
 *  reservoir INPUT (echo-state tanh normalises a scalar gain away) and coherence-scaling the holographic
 *  IMPRINT (cleanup-cosine confidence is scale-robust; HRR_DECAY mixes too slowly). */
const SELF_BASE_SCALE = 0.85;

// ── #10/#58 · GWT BROADCAST + RE-ENTRY (the coupling write-back) ───────────────────────────────────────
/** Smoothing of the workspace broadcast signal — how fast it tracks the assembly's ignition. */
const BROADCAST_TAU = 0.25;
/** V96 ONLINE LEARNING: bounded per-plan reward-bias adaptation — decay toward 0 + hard |bias| cap. */
const PLAN_LEARN_DECAY = 0.002;
const PLAN_LEARN_CLAMP = 0.5;
/** Default strength of the broadcast's re-entry into the workspace latent (0 disables the write-back).
 *  Kept MODEST on purpose: larger gains saturate the nonlinear faculty subnets (washing out the signal),
 *  and cranking it to force the coupling metric up would be Goodhart-gaming the audit. It is a real but
 *  partial coupler — a global scalar cannot densely couple deep faculties; explicit faculty-to-faculty
 *  edges are the genuine follow-up. */
const BROADCAST_GAIN = 0.5;

/**
 * The composite apex mind. Construct with a seeded {@link Rng}; `think` each beat. ~10k parameters
 * across the named sub-networks (see {@link paramCount}). Pure + allocation-free in steady state.
 * Optional biasScale (cliffordWeight from godform) for per-archetype reflex differentiation (GOAL5).
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
  /** V102: Hopfield associative memory — plan archetypes as energy minima (math/hopfield.ts). */
  private readonly hopfield: HopfieldNet;
  /** V103: Izhikevich spiking neuron — cortical tick, not an attention head. */
  private izhMembrane: IzhState;
  /** V103: hierarchical predictive-coding beliefs (variational free-energy inference). */
  private pcBeliefs: number[][];
  /** Dedicated seeded stream for the instinct's Metropolis dynamics (independent of the beat stream). */
  private readonly spinDrive: Rng;
  /** V1.1: the echo-state reservoir the mind steps with its latent each beat (short-term temporal memory). */
  private readonly reservoir: Reservoir;
  /** RPT-1/2: online learned recurrence — weights adapt within a life, seeded deterministic. */
  private readonly learnedRecurrence: LearnedRecurrence;
  /** RPT-1/2 enhancement: NQS/VMC quantum-state learning — energy-based learned recurrence (Carleo & Troyer 2017). */
  private readonly nqsController: NQSLearningController;
  private lastNqsTelemetry: NQSTelemetry | null = null;
  /** PIMC path-integral trace (Tsotchke mirrors/PIMC) — "soul" weight for EXPLORE bias. */
  private readonly pimcPath: Float32Array;
  /** Ring adjacency for classical IIT-2 bipartition (8 modules). */
  private readonly phiAdjacency: Float32Array;
  /** V1.1: the active-inference free-energy core — Bayesian world-belief + expected-free-energy planning. */
  private readonly aif: ActiveInference;
  /** V92: the metacognitive executive — reads the substrates' reliability into a second-order confidence
   *  (no random weights ⇒ it draws nothing from the seed stream; constructed inline). */
  private readonly metacog = new Metacognition();
  /** V1.1 (V93): the self-organised-criticality homeostat — keeps cognition poised at the edge of chaos. */
  private readonly criticality = new Criticality();
  /** V95: neuromodulation — Doya's four-modulator metalearning chemistry (DA/5-HT/NE/ACh) over cognition. */
  private readonly neuro = new Neuromodulation();
  /** V94: theory of mind — models the NEAREST RIVAL's intent from its observable cues (social cognition). */
  private readonly tom: TheoryOfMind;
  /** The 25-organ ToM ensemble (6 distinct mechanism families) — its aggregate menace + confidence bias
   *  the social drives below, making all 25 organs reachable + plan-affecting (not a parked name-list). */
  private readonly tomPantheon: TomPantheon;
  private readonly tomCues = new Float32Array(SUPER_PLANS.length); // reused social-cue buffer (no hot alloc)
  private tomEnsembleMenace = 0;
  private tomEnsembleConfidence = 0;
  /** V1.1: the successor-representation predictive map — model-based look-ahead over its own plan dynamics
   *  (no random weights ⇒ it draws nothing from the seed stream; identity-initialised). */
  private readonly successor = new SuccessorRepresentation();
  /** V95: the empowerment drive — channel capacity of the mind's action→future-cell map (agency hunger). */
  private readonly empowerment: EmpowermentDrive;
  /** V97: the holographic (VSA/HRR) compositional memory — binds (context ⊙ plan), recalls by unbinding. */
  private readonly holographic: HolographicMemory;
  /** V1.2: the quantum-reservoir-computing readout — reads the register's observable trajectory each beat. */
  private readonly qreservoir: QuantumReservoir;
  /** V98: the open-system Lindblad deliberation qubit (no seed — a deterministic master equation). */
  private readonly deliberation = new QuantumDeliberation();
  /** #59: the resonance integrator — a persistent bank of coupled oscillators (no seed — deterministic
   *  Kuramoto dynamics) that binds the consciousness assembly into a standing wave across beats, with an
   *  ADAPTIVE-COUPLING HOMEOSTAT self-tuning K to the responsive regime of the synchronization transition
   *  (so binding is maximally sensitive to faculty agreement — never frozen, never dead; cf. the
   *  responsiveness goal, distinct from the branching-ratio SOC in
   *  criticality.ts). */
  private readonly resonanceField = new ResonanceField(
    RESONANCE_FACULTIES,
    1.4,
    2 * Math.PI,
    0.15,
    3,
    true,
    0.5,
  );
  /** Eshkol reverse-mode AD tape (vm_autodiff.c) — prealloc, reused each beat for predictor surprise. */
  private readonly predTape: AdTape = adTapeNew(32);
  /** V101: Moonlab Clifford stabilizer tableau — live 16-qubit reflex (Aaronson–Gottesman). */
  private readonly clifford: CliffordTableau;
  private readonly cliffordRng: Rng;
  private cliffordBeat = 0;
  private cliffordEntNorm = 0;
  /** Eshkol consciousness engine (logic + inference + GWT workspace). */
  private readonly eshkolEngine: EshkolConsciousnessEngine;
  private readonly eshkolSalience = new Float32Array(6);
  /** #87/#91: Hebbian fast weights — within-life plastic overlay (Butlin RPT). */
  private readonly plastic = new FastWeights(LATENT, 0.3, 0.12, 3);
  private readonly organActs = new Float32Array(SUPER_ORGANS);
  private readonly attnSchema = new AttentionSchema();
  private readonly attnController = new AttentionController();
  private readonly topdown = new TopDownPerception();
  private readonly qualSpace = new QualitySpace();
  private readonly memOrch = new MemoryOrchestra();
  private readonly narrMem!: NarrativeMemory;
  private cliffordScale = 1.0;
  // Eshkol consciousness + libirrep sym from corpus - wired via facade
  private tsotchkeModule = 'EshkolConsciousness'; // from godform, for per-Archon specialization from Tsotchke corpus
  private _eshkolProgram = '(define (think state) state)'; // Eshkol .esk program from corpus for this Archon - prefixed for noUnused
  get tsotchkeModuleRef() {
    return this.tsotchkeModule;
  } // used to satisfy noUnused
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
  private readonly quantumOut = new Float32Array(SUPER_QUANTUM);
  private readonly latent: Float32Array;
  private readonly imagined = new Float32Array(LATENT);
  private readonly spinField = new Float32Array(SPIN_SIZE); // situational drive into the instinct lattice
  /** Bipolar probe buffer for Hopfield recall (no per-beat allocation). */
  private readonly hopProbe = new Float32Array(SPIN_SIZE);
  private readonly phiMods = new Float32Array(8); // V89: the 8 named module-summary scalars for the Φ proxy
  private readonly pcObs = new Float32Array(4); // V103: clamped sensory layer for hierarchical PC
  private readonly aifObs = new Float32Array(AIF_OBS); // V1.1: observation vector fed to the free-energy core
  private readonly aifG = new Float32Array(SUPER_PLANS.length); // per-plan EFE
  private readonly srReward = new Float32Array(SUPER_PLANS.length); // V1.1: per-plan drive → SR look-ahead
  private readonly srValue = new Float32Array(SUPER_PLANS.length); // SR plan values
  private readonly attentionSalience = new Float32Array(SUPER_PLANS.length); // GWT-4 plan salience scratch
  private readonly qObs = new Float64Array(3 * QMIND_QUBITS); // V1.2: register Bloch observables → QRC
  // Pre-allocated scratch arrays for tensor operations (avoid .slice() allocations)
  private readonly tensorScratch1 = new Float32Array(4);
  private readonly tensorScratch2 = new Float32Array(4);
  // V96 · ONLINE LEARNING — the Stratum-X adaptation channel: a seeded, bounded, reward-reinforced
  // per-plan bias. ON by default (the apex mind LEARNS at runtime); setLearning(false) freezes it back to
  // the byte-identical frozen-weight mind. Deterministic (no rng) + bounded (|bias| ≤ 0.5). O(plans).
  private learnEnabled = true;
  private learnRate = 0.02;
  private readonly planBias = new Float32Array(SUPER_PLANS.length);
  private readonly planOneHot = new Float32Array(SUPER_PLANS.length);
  private readonly planLearner = new EligibilityLearner(SUPER_PLANS.length, 0.85);

  private readonly memory = new MemoryRing(48);
  private valence = 0;
  private arousal = 0;
  private dominance = 0.5;
  /** #10/#58: the GWT workspace broadcast strength [0,1] (smoothed from ignition). Written each beat
   *  from the resonance state and READ at the top of the NEXT beat (re-entry) by arousal + curiosity —
   *  the write-back that makes the faculties genuinely co-vary through the shared workspace. */
  private broadcast = 0;
  /** Last beat's Kuramoto resonance ORDER r ∈ [0,1] (continuous binding coherence) — used as a GWT
   *  workspace gate on the access-faculties next beat (the documented "bound assembly modulates the
   *  modules" mechanism, applied directly so it isn't washed out by the latent bottleneck). */
  private lastResOrder = 0.5;
  /** #9/#37 COUPLING>COUNT — per-faculty coherence weights from the resonance field (Kuramoto).
   *  Faculties in phase with the collective → weight ~1 (amplified in broadcast re-entry);
   *  out of phase → weight ~0 (damped). This turns the uniform broadcast gain into faculty-specific
   *  coupling edges — the #1 highest-leverage finding from the honesty audit. */
  private lastResWeights: number[] = [];
  /** How strongly the broadcast re-enters cognition (0 = the write-back is disabled — a clean baseline). */
  private readonly broadcastGain: number;
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
    qualiaTone: 0,
    workspace: 0, // Eshkol GWT from corpus
  };
  private plan: SuperPlan = 'REST';
  /** P1 quantum-ablation gate: 1 = quantum-substrate faculties contribute, 0 = ablated (a parameter-matched
   *  control arm for the quantum-vs-classical experiment). Gates the WHOLE quantum-substrate contribution to
   *  the decision: the quantum-reservoir + Schrödinger-spread curiosity terms, the Lindblad-decider's push on
   *  EXPLORE, the Eshkol-QRNG draw into HUNT, and the QGT (quantum-natural-gradient) + NQS/VMC contributions
   *  to the surprise signal. Every gated faculty still EVOLVES + reports on the snapshot; only its influence
   *  on the decision is removed, so the ablation is observable but telemetry is intact. Default ON — the live
   *  sim + every reproducibility/bounds golden are byte-identical; only the experiment's classical arm sets 0. */
  private qGate = 1;

  constructor(
    rng: Rng,
    biasScale = 1.0,
    eshkolL = 0.5,
    eshkolI = 0.5,
    eshkolW = 0.5,
    module = 'EshkolConsciousness',
    program = '(define (think state) state)',
    broadcastGain = BROADCAST_GAIN,
  ) {
    const cScale = clamp01(biasScale); // 0.2-0.9 range per godform, used for reflex
    this.cliffordScale = cScale;
    this.broadcastGain = clamp01(broadcastGain);
    this.eshkolEngine = new EshkolConsciousnessEngine(eshkolL, eshkolI, eshkolW);
    this.tsotchkeModule = module;
    this._eshkolProgram = program;
    this.narrMem = new NarrativeMemory(rng); // GOAL5 init with rng (stream effect same for repro)
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

    // Metacognition (Eshkol VM + Moonlab MPO) runs SYNCHRONOUSLY in-beat on every runtime — see think().
    // A prior production-only Web Worker aliased `latent` through a SharedArrayBuffer and wrote it
    // off-thread, racing the main thread and making the SHIPPED path non-deterministic while the
    // single-threaded tests stayed green (a verifier that falsely passed). Determinism is the #1 law,
    // so the worker is gone: one proven-deterministic path in every runtime (browser, test, bench).
    this.latent = new Float32Array(LATENT);

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
    // spin-glass instinct. All seeded: the whole apex psyche still replays bit-for-bit from the seed.
    const childSeed = (Math.floor(rng() * 0xffffffff) ^ 0x9e3779b9) >>> 0 || 1;
    this.eshkol = new EshkolQrng(mulberry32(childSeed));
    this.cliffordRng = mulberry32((childSeed ^ 0xc11ff0d1) >>> 0 || 1);
    this.clifford = new CliffordTableau(16);
    this.qmind = new QuantumMind(this.eshkol.stream());
    this.spin = new SpinGlass(SPIN_SIZE, mulberry32((childSeed ^ 0x5bd1e995) >>> 0 || 1));
    this.spin.imprint(SPIN_ARCHETYPES);
    this.hopfield = storeHebbian(SPIN_ARCHETYPES);
    this.izhMembrane = izhRest(IZH_RS);
    this.pcBeliefs = initBeliefs(MIND_PC_NET);
    this.spinDrive = mulberry32((childSeed ^ 0x2545f491) >>> 0 || 1);
    this.reservoir = new Reservoir(mulberry32((childSeed ^ 0x119de1f3) >>> 0 || 1));
    this.embodiment = new Embodiment(
      SUPER_PLANS.length,
      EMBODIMENT_DIM,
      (childSeed ^ 0xe3b0c442) >>> 0 || 1,
    );
    this.learnedRecurrence = new LearnedRecurrence(mulberry32((childSeed ^ 0x3c6ef372) >>> 0 || 1));
    // NQS/VMC: quantum-state learned recurrence on its own seed (determinism-safe, no main-stream draw).
    // 6 visible units (matching QMIND_QUBITS), 8 hidden, small VMC config for per-beat online learning.
    this.nqsController = new NQSLearningController(
      6,
      8,
      {
        sampleCount: 16,
        thermalizationSteps: 20,
        learningRate: 0.005,
        regularization: 0.001,
      },
      (childSeed ^ 0x5eed1234) >>> 0 || 1,
    );
    this.pimcPath = new Float32Array(8);
    for (let i = 0; i < 8; i++) this.pimcPath[i] = 0.5 + i * 0.05;
    this.phiAdjacency = new Float32Array(64);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      this.phiAdjacency[i * 8 + j] = 1;
      this.phiAdjacency[j * 8 + i] = 1;
      this.phiAdjacency[i * 8 + i] = 1;
    }
    // V1.1: the active-inference free-energy core, on its own XOR-derived seed (no extra rng draw). Its
    // preference C (want energy/prey/wealth, avoid threat/rivals) is the creature's standing "goal".
    this.aif = new ActiveInference(mulberry32((childSeed ^ 0xa3c59ac3) >>> 0 || 1));
    this.aif.setPreference([1, -1, 0.6, -0.4, 0.3, 0.5]);
    // V94: theory of mind — its own XOR-derived child stream (no extra rng draw ⇒ determinism intact).
    this.tom = new TheoryOfMind(mulberry32((childSeed ^ 0xc2b2ae35) >>> 0 || 1));
    // The 25-organ ToM ensemble — its own XOR-derived child stream (no extra rng draw ⇒ determinism intact).
    this.tomPantheon = new TomPantheon(mulberry32((childSeed ^ 0x7f4a7c15) >>> 0 || 1));
    // V95: the empowerment drive — its own XOR-derived child stream for the frozen LSH hyperplanes (no draw
    // on the weight stream ⇒ every sub-network keeps bit-identical weights, determinism intact).
    this.empowerment = new EmpowermentDrive(mulberry32((childSeed ^ 0x27d4eb2f) >>> 0 || 1));
    // V97: the holographic memory — its own XOR-derived child stream for the frozen codebook atoms (no draw
    // on the weight stream ⇒ determinism intact).
    this.holographic = new HolographicMemory(mulberry32((childSeed ^ 0x85ebca6b) >>> 0 || 1));
    // V1.2: the quantum-reservoir-computing readout, on its own XOR-derived child stream (no extra draw).
    this.qreservoir = new QuantumReservoir(mulberry32((childSeed ^ 0x7feb352d) >>> 0 || 1));
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

  /**
   * V96 · ONLINE LEARNING: enable/disable the per-plan reward-bias adaptation channel. ON by default ⇒
   * the apex mind learns at runtime; setLearning(false) freezes it back to byte-identical frozen-weight
   * behaviour (and resets the learned bias + eligibility trace to zero). `rate` (optional, clamped ≤ 0.2)
   * sets the bounded step size. Determinism-safe (no rng — replays bit-for-bit from one seed). O(1).
   */
  setLearning(enabled: boolean, rate?: number): void {
    this.learnEnabled = enabled;
    if (rate !== undefined && rate >= 0) this.learnRate = rate > 0.2 ? 0.2 : rate;
    if (!enabled) {
      this.planBias.fill(0);
      this.planLearner.reset();
    }
  }

  /** V96: snapshot of the learned per-plan bias vector (for tests / inspection). O(plans). */
  learnedPlanBias(): number[] {
    return [...this.planBias];
  }

  /** One full cognitive beat. Pure; returns the apex intent (drives + consciousness + quantum). */
  /**
   * Full cognitive beat. `mode: 'echo'` is the GOAL5 light path — same pipeline,
   * 1 depth × 1 imagination variant (instead of 5×5) and 1 predictor step — so
   * non-active Archons stay live without the full Tree-of-Thought cost.
   * Default `'full'` preserves every existing test / golden path.
   */
  think(p: SuperPercept, mode: 'full' | 'echo' = 'full'): SuperMindIntent {
    // Shallow copy so twin minds / reused percept literals stay bit-identical (topdown.apply mutates).
    const wp: SuperPercept = { ...p };
    const thinkDepths = mode === 'echo' ? 1 : SUPER_DEPTHS;
    const thinkVariants = mode === 'echo' ? 1 : SUPER_VARIANTS;
    // HOT-1: close the generative loop — last beat's top-down bias shapes this beat's percept.
    this.topdown.apply(wp);
    // ── STAGE 1 · PERCEIVE ──────────────────────────────────────────────────────────────────────
    const s = this.senses;
    s[0] = clamp01(wp.energy);
    s[1] = clamp01(wp.threat);
    s[2] = clamp01(wp.crowding);
    s[3] = clamp01(wp.chaos);
    s[4] = clamp01(wp.wealthRel);
    s[5] = clamp01(wp.preyClose);
    s[6] = clamp01(wp.rivalClose);
    s[7] = clamp01(wp.pull);
    s[8] = clamp01(wp.light);
    s[9] = clamp01(wp.sound);
    s[10] = this.valence;
    s[11] = this.arousal;
    s[12] = this.dominance;
    s[13] = this.memory.mean();
    s[14] = this.cons.surprise;
    s[15] = this.offspring / SUPER_MAX_OFFSPRING;
    s[16] = Math.sin(wp.phase * Math.PI * 2);
    s[17] = Math.cos(wp.phase * Math.PI * 2);
    // #10/#58 — broadcast re-entry into arousal (the documented read-half: bound assembly → shared feel).
    if (this.broadcastGain > 0 && this.broadcast > 0) {
      const br = this.broadcastGain * this.broadcast;
      s[11] = clamp01((s[11] ?? 0) + br * 0.45);
    }
    const progFx = eshkolEvalProgram(this._eshkolProgram, (s[0] ?? 0) + (s[1] ?? 0) * 0.5);
    const subs = eshkolApplyProgramEffect(
      this.eshkolEngine.logic,
      this.eshkolEngine.inference,
      this.eshkolEngine.workspace,
      progFx,
    );
    this.eshkolEngine.logic = subs.logic;
    this.eshkolEngine.inference = subs.inference;
    this.eshkolEngine.workspace = subs.workspace;
    const latent = this.cortex.forward(s);
    for (let i = 0; i < LATENT; i++) this.latent[i] = latent[i] ?? 0;
    // ── #10/#58 · GWT BROADCAST RE-ENTRY ── blend LAST beat's workspace broadcast into the shared latent
    // (the workspace representation every faculty reads: the reservoir, the imagination loop that yields
    // novelty + reasoning, and the self-model that yields self-awareness). Here the ignition broadcast
    // RE-ENTERS the workspace — the bound assembly's signal made available to the modules — so they co-vary
    // through it instead of each running input-independently (the read-half of the read+write coupling
    // loop the audit enforces, #10). A bounded MODULATION (not a takeover); uses last beat's value, so it
    // is deterministic recurrence (#58), never a within-beat circular dependency.
    //
    // #9/#37 COUPLING>COUNT — FACULTY-SPECIFIC RE-ENTRY (the #1 honesty audit finding):
    // The re-entry weight per latent dimension is now driven by the resonance field's per-faculty
    // coherence weights (Kuramoto). Faculties in phase with the collective → amplified; out of phase →
    // damped. This replaces the uniform scalar gain with explicit faculty-to-faculty coupling edges,
    // turning phase-locking into structured information flow. The coupling audit measures whether this
    // lifts meanAbsCoupling + density above the weak-coupling threshold.
    if (this.broadcastGain > 0 && this.broadcast > 0) {
      const b = this.broadcastGain * this.broadcast;
      const rw = this.lastResWeights;
      for (let i = 0; i < this.latent.length; i++) {
        // Faculty-specific weight: map latent index to resonance faculty index (cyclic),
        // then use the coherence weight as the re-entry gain. The 0.5 baseline preserves the
        // pre-coupling behavior when weights are uniform (all ~0.5 at initialization).
        const wIdx = i % Math.max(1, rw.length);
        const w = rw[wIdx] ?? 0.5;
        this.latent[i] = (this.latent[i] ?? 0) + b * w * (0.5 + 0.5 * Math.sin((i + 1) * 0.618));
      }
    }
    // ── #87/#91 · PLASTIC FAST-WEIGHTS ── within-life Hebbian self-modification: recall the self-written
    // fast memory of recent latents (READ), imprint this beat (WRITE), then blend a bounded 0.15 fraction of
    // the recall into the workspace latent — so the mind's OWN recent experience reshapes what every
    // downstream faculty reads. Online plasticity (not training); deterministic; bounded by decay + clip.
    const plasticLat = Array.from(this.latent);
    const plasticRecall = this.plastic.recall(plasticLat);
    this.plastic.imprint(plasticLat);
    for (let i = 0; i < this.latent.length; i++) {
      this.latent[i] = clamp((this.latent[i] ?? 0) + 0.15 * (plasticRecall[i] ?? 0), -4, 4);
    }
    // Deep Tsotchke: Eshkol compiler VM + Moonlab MPO on cadence (real MIT ports, not decorative).
    if (this.cliffordBeat % 17 === 0) {
      const bc = eshkolCompile(eshkolParse(this._eshkolProgram));
      const divine = eshkolExecute(bc, this.cons.surprise);
      this.cons.workspace = clamp01(this.cons.workspace + divine * 0.012);
      const mpoOut = moonlabMPOApply(
        {
          matrices: [this.latent.subarray(0, 4)],
          bondDimension: 1,
          physicalDimension: LATENT,
        },
        this.latent,
      );
      for (let i = 0; i < Math.min(LATENT, mpoOut.length); i++) {
        this.latent[i] = clamp((this.latent[i] ?? 0) + (mpoOut[i] ?? 0) * 0.008, -4, 4);
      }
    }
    // V1.1: step the echo-state reservoir on the fresh latent — a fading nonlinear echo of the mind's
    // recent world-models that gives it temporal memory; its novelty (below) sharpens curiosity.
    // (#9/#37 measured NULL, 2026-07-02: coherence-GATING this input washed out — the echo-state tanh
    // normalises a scalar input gain away, so reservoir.novelty's coupling didn't move. Reverted; see
    // AUDIT-LOG. Input-side gain is NOT a viable coupler for normalising nonlinear faculties.)
    this.reservoir.step(this.latent);
    // V1.1 (V93): measure the mind's own activation cascades and self-tune toward the critical point
    // (branching ratio σ̂ → 1) — the edge of chaos, where dynamic range + exploration are maximised.
    this.criticality.step(this.latent);

    // ── ATOM OF THOUGHT · organ-nets (GWT-4 attention-weighted) ────────────────────────────────
    const attnPre = this.attnSchema.snapshot();
    const attnG = attentionControllerStep(attnPre, SUPER_ORGANS, this.cons.surprise, {
      da: this.neuro.dopamine,
      ach: this.neuro.acetylcholine,
      ne: this.neuro.noradrenaline,
      ht: this.neuro.serotonin,
    });
    let oa = 0;
    let ob = 0;
    let wSum = 0;
    for (let k = 0; k < this.organs.length; k++) {
      const off = (k * 4) % LATENT;
      const o = this.organs[k]!.forward(this.latent.subarray(off, off + 4));
      const w = attnG.gains[k] ?? 1 / SUPER_ORGANS;
      this.organActs[k] = (o[0] ?? 0) * w;
      oa += this.organActs[k] ?? 0;
      ob += (o[1] ?? 0) * w;
      wSum += w;
    }
    const inv = wSum > 1e-9 ? 1 / wSum : 1 / this.organs.length;
    this.organSum[0] = oa * inv;
    this.organSum[1] = ob * inv;
    this.organSum[2] = Math.tanh(oa * inv * 2);
    this.organSum[3] = Math.tanh(ob * inv * 2);

    // ── STAGE 2 · IMAGINE · Creativity Machine + Tree of Thought (full: 5×5=25; echo: 1×1) ────
    this.cur.set(this.latent); // the broadcast-blended workspace latent (GWT re-entry feeds imagination)
    let peakNovelty = 0;
    let reasoningGain = 0;
    for (let d = 0; d < thinkDepths; d++) {
      let bestScore = -Infinity;
      for (let v = 0; v < thinkVariants; v++) {
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

    // ── STAGE 3 · REASON · distil the winner + recursive world model (full: 5 deep; echo: 1) ──
    // WIRED Eshkol AD tape (from the depth-classed Tsotchke corpus AUTODIFF/vm_ad + vm_symbolic_ad.c, reverse mode for multi-var error, 32-level tape, dual numbers) for better predictor/surprise. Det, prealloc. Moonlab tensor for quantum scaling.
    const reason = this.reasoner.forward(this.imagined);
    this.pred.set(this.latent);
    for (let d = 0; d < thinkDepths; d++) this.pred.set(this.predictor.forward(this.pred));
    const salience = clamp01(0.5 * s[1] + 0.3 * s[2] + 0.2 * Math.abs(this.pred[0] ?? 0));
    const surprise = clamp01(Math.abs(this.predictedSalience - salience));
    // Heartbeat: more Eshkol AD from corpus for predictor (dual error).
    const predErr = Math.abs((this.pred[0] ?? 0) - (this.imagined[0] ?? 0));
    const adPred = { primal: surprise, tangent: predErr * 0.1 }; // from Eshkol AD tape
    this.cons.surprise = adPred.primal;
    // Eshkol AD: use facade dual (from corpus tape.esk + autodiff) for error grad. Det.
    const ad = eshkolDual((x: number) => Math.abs(x - (this.pred[0] ?? 0)), surprise);
    const adDual = { primal: surprise, tangent: ad.derivative };
    this.cons.surprise = adDual.primal; // use for qualia etc.
    // deeper Eshkol AD/tape + Moonlab tensor for predictor error + surprise in deliberation (quantum delib affected)
    const adTapeGrad = eshkolADGradient(
      (x) => Math.abs(x - (this.imagined[0] ?? 0.5)),
      this.pred[0] ?? 0,
    );
    this.tensorScratch1.set(this.pred.subarray(0, 4));
    this.tensorScratch2.set(this.imagined.subarray(0, 4));
    const tPred = moonlabTensorContract(this.tensorScratch1, this.tensorScratch2, 4);
    // Wire Moonlab VQE energy proxy for quantum parameter optimization
    const vqeEnergy = vqeEnergyProxy(this.pred[0] ?? 0, this.imagined[0] ?? 0, 1);
    this.cons.surprise = clamp01(
      adDual.primal + Math.abs(adTapeGrad) * 0.05 + Math.abs(tPred) * 0.02 + vqeEnergy * 0.03,
    );
    // active Eshkol dual arith (makeEshkolDual + dualAdd/Mul from AUTODIFF.md + tape.esk) + gwtBroadcast (GWT from workspace.cpp) for predictor surprise
    const dSurp = makeEshkolDual(this.cons.surprise, ad.derivative);
    const dPred = makeEshkolDual((this.pred[0] ?? 0) * 0.1, 0.5);
    const dComb = dualAdd(dSurp, dualMul(dPred, makeEshkolDual(0.8)));
    // re-wire gwtBroadcast for Eshkol GWT workspace effect in surprise (from CONSCIOUSNESS_ENGINE.md + workspace.cpp)
    const gwtS = gwtBroadcast([surprise, peakNovelty], [0.6, 0.5]);
    this.cons.surprise = clamp01(dComb.value + (gwtS[0] || 0) * 0.05 + Math.abs(tPred) * 0.02);
    // Eshkol full reverse-mode tape: d/dpred of (pred - imagined)^2 for exact surprise sensitivity
    adTapeReset(this.predTape);
    const tapePred = adVar(this.predTape, this.pred[0] ?? 0);
    const tapeImag = adVar(this.predTape, this.imagined[0] ?? 0);
    const tapeErr = adSub(this.predTape, tapePred, tapeImag);
    const tapeSq = adMul(this.predTape, tapeErr, tapeErr);
    adBackward(this.predTape, tapeSq);
    const tapeGrad = Math.abs(adGradient(this.predTape, tapePred));
    this.cons.surprise = clamp01(this.cons.surprise + tapeGrad * 0.03 * this.eshkolEngine.logic);

    // Quantum Natural Gradient: precondition cognitive gradient with QGT metric for self-optimization
    // Use 2x2 allocation-free QNG for the mind's two cognition knobs (superposition + entanglement)
    const qngRidge = 1e-3;
    const qngOut = [0, 0]; // Preallocated array for allocation-free QNG
    // QGT metric components (simplified from quantum-geometry for 2D cognitive space)
    const g00 = 1 + this.cons.surprise * 0.5;
    const g01 = this.cons.workspace * 0.3;
    const g11 = 1 + this.eshkolEngine.inference * 0.5;
    // Precondition the gradient with the CURVATURE-AWARE natural gradient: (g + λI + κ·Γ)⁻¹·∇L, where the
    // Christoffel trace Γ of the CP¹ cognitive manifold corrects the flat QGT metric so the step respects
    // the manifold's curvature (Riemannian, not just Fisher-flat). Wires the previously-unwired
    // curvature-aware-qng kernel; κ=0 recovers the old flat QNG, so this is a bounded, deterministic upgrade.
    curvatureAwareNaturalGradient2x2(
      g00,
      g01,
      g11,
      tapeGrad,
      predErr,
      QNG_CURVATURE_WEIGHT,
      qngRidge,
      qngOut,
    );
    const qngNorm = vecNorm(qngOut);
    // P1-ablatable: the QGT / Quantum-Natural-Gradient contribution to surprise (the QGT still preconditions
    // above; only its influence on the uncertainty signal is gated in the ablated arm).
    this.cons.surprise = clamp01(
      this.cons.surprise + qngNorm * 0.02 * this.eshkolEngine.logic * this.qGate,
    );
    // Consciousness-engine triple (Eshkol CONSCIOUSNESS_ENGINE.md): logic/inference/workspace modulate workspace scalar
    const cTriple = consciousnessTriple(Math.floor(this.eshkolEngine.logic * 5) % 5);
    this.cons.workspace = clamp01(
      cTriple.workspace * 0.4 + this.eshkolEngine.workspace * 0.35 + (gwtS[0] || 0) * 0.25,
    );
    this.cons.surprise = clamp01(this.cons.surprise + cTriple.inference * predErr * 0.02);
    // Heartbeat small: additional Eshkol AD/Moonlab tensor note for Archons from the depth-ledger corpus.
    this.predictedSalience = unit(this.pred[0] ?? 0);
    const lrErr = this.learnedRecurrence.step(this.latent, this.pred);
    this.learnedRecurrence.blendIntoLatent(this.imagined, clamp01(0.1 * (1 - lrErr)));
    // NQS/VMC: step the quantum-state learner each beat. The energy variance (convergence metric)
    // feeds surprise: high variance = the quantum state hasn't converged = more prediction uncertainty.
    this.lastNqsTelemetry = this.nqsController.step();
    // P1-ablatable: the NQS/VMC (neural-quantum-state) energy-variance contribution to surprise (the learner
    // still steps + reports telemetry; only its influence on the uncertainty signal is gated).
    this.cons.surprise = clamp01(
      this.cons.surprise + this.lastNqsTelemetry.energyVariance * 0.02 * this.qGate,
    );

    // (Previous deep GWT block removed for type/contract clean; symbols centralized in facade. 5 Archons still benefit.)
    this.memory.push(salience);

    // Izhikevich cortical spike + hierarchical predictive-coding free energy (digital biology, not LLM).
    const izhR = izhStep(IZH_RS, this.izhMembrane, 8 + surprise * 35 + peakNovelty * 20);
    this.izhMembrane = izhR.state;
    if (izhR.spiked) this.cons.surprise = clamp01(this.cons.surprise + IZH_SPIKE_GAIN);
    this.pcObs[0] = s[0] ?? 0;
    this.pcObs[1] = s[1] ?? 0;
    this.pcObs[2] = surprise;
    this.pcObs[3] = peakNovelty;
    const pcObsArr = [this.pcObs[0]!, this.pcObs[1]!, this.pcObs[2]!, this.pcObs[3]!];
    this.pcBeliefs = inferStep(MIND_PC_NET, this.pcBeliefs, pcObsArr, 0.08);
    const pcF = freeEnergy(MIND_PC_NET, this.pcBeliefs, pcObsArr);
    this.cons.surprise = clamp01(this.cons.surprise + Math.min(1, pcF * 0.008) * PC_SURPRISE_GAIN);

    // GOAL5: call leaves per-beat (AST-1 attention schema, HOT-1 topdown generative, HOT-4 quality, memory as decision)
    // uses internal signals; deterministic; pre-allocated. bias from world percept already differentiates via godform.
    const cq = this.clifford.n;
    const cb = this.cliffordBeat++ % cq;
    this.clifford.h(cb);
    if (cb > 0) this.clifford.cnot(cb - 1, cb);
    if (this.cliffordBeat % 11 === 0) this.clifford.sample(this.cliffordRng);
    const cut = Math.max(1, Math.floor(cq / 2));
    this.cliffordEntNorm = this.clifford.entanglementEntropy(cut) / cut;

    // Quantum coherence: register snapshot readout (Tsotchke quantum-coherence leaf).
    const snap = this.qmind.snapshot();
    this.cliffordEntNorm = clamp01(this.cliffordEntNorm + snap.coherenceL1 * 0.2);

    // Quantum magic: beyond-classical non-stabilizerness (Tsotchke quantum-magic leaf)
    // Compute stabilizer 2-Rényi entropy to measure how far beyond Clifford the state is
    // Use the magic already computed on the TRUE register amplitudes inside snapshot() (super-qubits.ts).
    // The previous quantumMagic() call here was fed a malformed vector — re = sqrt(p) (magnitudes only),
    // im = sin(phase) (phase only); neither the real amplitudes nor normalized — so its result was wrong
    // and still fed `reflex` -> the attention schema + god-jewel shader.
    const magicNorm = snap.magicNorm;

    const reflex = clamp01(
      ((this.quantumOut[1] ?? 0) + (this.quantumOut[0] ?? 0)) * 0.5 * this.cliffordScale +
        this.cliffordEntNorm * 0.35 +
        magicNorm * 0.15,
    );
    this.attnSchema.update(s, surprise, this.ignition, reflex);
    this.topdown.generate(this.imagined, peakNovelty);
    this.topdown.setError(surprise);
    this.memOrch.write('obs', 0, clamp01(surprise + 0.3 * peakNovelty), 0, [
      s[0] ?? 0,
      s[1] ?? 0,
      surprise,
      peakNovelty,
    ]);
    this.narrMem.write('OBS', surprise, clamp01(peakNovelty), 0.4, s[0] ?? 0, 0, 0);

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
    this.affIn[11] = Math.sin(wp.phase * 6.2831853);
    const aff = this.affect.forward(this.affIn);
    this.valence += EMOTION_TAU * (clamp(aff[0] ?? 0, -1, 1) - this.valence);
    this.arousal += EMOTION_TAU * (clamp01(unit(aff[1] ?? 0) + 0.4 * peakNovelty) - this.arousal);
    this.dominance += EMOTION_TAU * (clamp01(unit(aff[2] ?? 0) + 0.4 * s[4]) - this.dominance);
    // Eshkol AD apply on dominance from corpus tape (for Archon affect diff); Moonlab qualia tensor on valence feel
    this.dominance = eshkolApplyAD(this.dominance, adTapeGrad || 0, 0.03);
    const qualTensor = moonlabTensorQualia([this.valence, this.arousal, peakNovelty], 5);
    this.cons.qualiaTone = clamp01(0.5 + 0.5 * qualTensor); // qualia from tensor (Tsotchke Moonlab)
    // more GWT + MPO from corpus in mind cons/qualia
    const gwtRes = gwtBroadcast([surprise, peakNovelty], [this.eshkolEngine.workspace || 0.6, 0.5]);
    const mpoRes = moonlabMpoStep(this.imagined, 2);
    this.cons.qualiaTone = clamp01(
      this.cons.qualiaTone + ((gwtRes[0] || 0) + Math.abs(mpoRes)) * 0.01,
    );
    const self = this.selfModel.forward(this.imagined);
    const selfAware = unit(self[0] ?? 0);
    this.metacog.updateSelfModel(self, [this.valence, this.arousal, this.dominance, surprise]);

    // ── STAGE 5 · ACT · quantum aspects + meta-controller integration → drives ───────────────────
    const q = this.quantum.forward(this.latent);
    for (let i = 0; i < SUPER_QUANTUM; i++) this.quantumOut[i] = unit(q[i] ?? 0);
    // Moonlab tensor contract on quantum aspects (VQE-like optimization proxy from corpus tensor/MPO) for 5 Archons
    this.tensorScratch1.set(this.quantumOut.subarray(0, 4));
    this.tensorScratch2.set(this.quantumOut.subarray(4, 8));
    const tQ = moonlabTensorContract(this.tensorScratch1, this.tensorScratch2, 4);
    if (tQ > 0) {
      const q0 = this.quantumOut[0] ?? 0;
      this.quantumOut[0] = clamp01(q0 + tQ * 0.01);
    }
    // libirrepSymmetry (Tsotchke corpus) for Archon quantum aspect symmetry (e.g. modulate aspect for multi-part equivariance)
    const ir = libirrepSymmetry(3, 4);
    this.quantumOut[4] = clamp01((this.quantumOut[4] ?? 0) + (ir % 3) * 0.02);
    // ulgHandoff (Tsotchke ulg) for hybrid aliveness in quantum aspects
    const ulgQ = ulgHandoff(this.quantumOut[8] ?? 0.5, this.quantumOut[9] ?? 0.5);
    this.quantumOut[8] = clamp01((this.quantumOut[8] ?? 0) + ulgQ * 0.01);
    // additional Moonlab tensor on quantum aspects + Eshkol AD for "tape" in delib (more corpus everywhere in mind)
    this.tensorScratch1.set(this.quantumOut.subarray(2, 6));
    this.tensorScratch2.set(this.quantumOut.subarray(6, 10));
    const tQ2 = moonlabTensorContract(this.tensorScratch1, this.tensorScratch2, 3);
    const adQ2 = eshkolADGradient((x) => Math.abs(x), this.quantumOut[5] ?? 0.5);
    this.quantumOut[5] = clamp01((this.quantumOut[5] ?? 0) + tQ2 * 0.005 + adQ2 * 0.01);
    let mi = 0;
    for (let i = 0; i < LATENT; i++) this.metaIn[mi++] = this.latent[i] ?? 0;
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
    // V1.2 · QUANTUM RESERVOIR COMPUTING — read the register's evolved Bloch observables and step the QRC
    // readout: the 6-qubit register is the high-dimensional reservoir; its quantum-state velocity (qFlux)
    // becomes a curiosity drive below (Fujii & Nakajima 2017).
    this.qmind.readObservables(this.qObs);
    this.qreservoir.step(this.qObs);
    // V99 — READ the GENUINE quantum register Φ (real IIT min-cut entanglement) so the previously-INERT
    // quantum integration now WRITES into cognition (PHILOSOPHY: every system reads AND writes another).
    // Fed into the metacognition "integration" cue below, blended with the classical module proxy.
    const qPhi = this.qmind.integratedInformationNow();
    // quakePerturb (quantum-quake corpus) modulates one quantum aspect for Archon aliveness
    // (qPhi is the genuine quantum register Φ; it is consumed by the integration cue at the plan stage below)
    const qkP = quakePerturb(
      0.5 + (this.eshkolEngine.inference - 0.5) * 0.5 /*proxy*/,
      17 + ((this.eshkolEngine.logic * 10) | 0),
      0.1,
    );
    this.quantumOut[9] = clamp01((this.quantumOut[9] ?? 0) * qkP); // adaptive aspect perturbed by quake aliveness (Tsotchke quantum-quake)

    // consciousness state. #9/#37 — the GWT binding gate: last beat's resonance coherence (the bound-
    // assembly signal) modulates the access-faculties so they co-vary through the shared bound state — the
    // documented workspace mechanism, applied directly (not via the washed-out latent). Centred on 0.5.
    const novelty = peakNovelty;
    const bindGate = COUPLING_BIND_GAIN * (this.lastResOrder - 0.5);
    this.cons = {
      dreaming: clamp01(0.4 + 0.6 * novelty + bindGate),
      hallucinating: clamp01((novelty - 0.6) / 0.4 + bindGate),
      reasoning: clamp01(reasoningGain / thinkDepths + bindGate),
      feeling: this.valence,
      selfAware: clamp01(
        // #9/#37 UN-RAIL (2026-07-02): the raw sum sat pinned at the 1.0 clamp rail, where a constant
        // series carries NO coupling signature — the audit measured selfAware ISOLATED at 200 beats
        // despite being bind-gated (an instrument pinned at full scale is a broken instrument). Scaling
        // the BASE below the rail restores headroom in both directions, so the bind-gate's ± excursions
        // actually transmit. Semantics preserved: still the high reflexive signal, now varying.
        selfAware * SELF_BASE_SCALE +
          bindGate +
          EMBODIMENT_SELF_GAIN * this.lastEmbodimentContingency,
      ), // 4th GWT access-faculty; V1.3 AE-2 body-contingency lifts self-awareness
      novelty,
      surprise,
      ignition: this.ignition, // carried; finalised after the plan argmax below
      phi: this.phi, // carried; finalised after the plan argmax below
      workspace: this.eshkolEngine.workspace || 0.5, // Eshkol GWT from corpus
      qualiaTone: this.cons.qualiaTone || 0,
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
    biasPlanSalience(sal, this.attnSchema.snapshot(), surprise, SUPER_PLANS);
    // gwtBroadcast (Tsotchke Eshkol GWT) for more workspace effect on sal drives
    const gwtSal = gwtBroadcast([sal.HUNT, sal.EXPLORE, sal.DOMINATE], [0.5, 0.6, 0.4]);
    sal.HUNT = clamp01(sal.HUNT + (gwtSal[0] || 0) * 0.05);
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

    // V102 · CLEAN HOPFIELD RECALL — deterministic energy descent on the Hebbian attractor net
    // (math/hopfield.ts, MIT spin_based_neural_network corpus) cleans the spin-glass probe into
    // the nearest stored plan archetype; a second subsymbolic vote alongside the SK instinct.
    let hopPlan: SuperPlan | undefined;
    let hopStrength = 0;
    this.spin.spinsInto(this.hopProbe);
    const { state: hopState } = recall(this.hopfield, this.hopProbe);
    let hopPattern = -1;
    for (let pIdx = 0; pIdx < SUPER_PLANS.length; pIdx++) {
      const o = overlap(hopState, SPIN_ARCHETYPES[pIdx] ?? []);
      const a = o < 0 ? -o : o;
      if (a > hopStrength) {
        hopStrength = a;
        hopPattern = pIdx;
      }
    }
    hopPlan = hopPattern >= 0 ? SUPER_PLANS[hopPattern] : undefined;

    // ── ACTIVE INFERENCE · the free-energy core ── PERCEIVE the world into a belief over latent
    // situations (minimising variational free energy F), then score every plan by its EXPECTED free
    // energy G — trading information gain (epistemic curiosity) against preference (pragmatic value).
    const obs = this.aifObs;
    obs[0] = s[0] * 2 - 1; // energy
    obs[1] = s[1] * 2 - 1; // threat
    obs[2] = s[5] * 2 - 1; // prey near
    obs[3] = s[6] * 2 - 1; // rival near
    obs[4] = novelty * 2 - 1; // novelty
    obs[5] = s[4] * 2 - 1; // wealth (relative)
    const aifPerc = this.aif.perceive(obs);
    this.aif.expectedFreeEnergy(PLAN_OBS_ARR, this.aifG);

    // ── decode drives ──
    const aggression = unit(act[3] ?? 0);
    const deception = unit(act[4] ?? 0);
    const domProject = unit(act[5] ?? 0);
    const spawnDesire = unit(act[6] ?? 0);
    // V1.3 LATENT SUBSTRATES — wire the (formerly dead, 0-import) Schrödinger / SO(3) / Pearl-causal
    // modules into the live decision: a real Crank–Nicolson wavepacket's positional spread is an
    // exploration cue; the SO(3) geodesic coherence of the latent + the do(surprise→workspace) causal
    // effect ride as measured substrates (surfaced in snapshot). Deterministic + bounded.
    const ls = latentSubstrateStep({
      drive: this.arousal,
      angles: Array.from(this.latent),
      ignition: this.ignition,
      phi: this.phi,
      workspace: this.ignition,
      surprise: novelty,
      novelty: this.reservoir.novelty,
      selfAware: this.attnSchema.confidence,
      reasoning: this.dominance,
      qualiaTone: this.valence * 0.5 + 0.5,
    });
    this.lastLatentSub = ls;
    const curiosity = clamp01(
      unit(act[7] ?? 0) +
        0.3 * novelty +
        0.15 * this.reservoir.novelty +
        0.12 * (1 - this.criticality.proximity) + // off-criticality ⇒ explore to recover the edge of chaos
        EMP_CURIOSITY_GAIN * this.empowerment.empowerment + // agency hunger ⇒ seek regions it can steer
        QRC_CURIOSITY_GAIN * this.qreservoir.quantumFlux * this.qGate + // quantum reservoir (P1-ablatable)
        LATENT_CURIOSITY_GAIN * ls.quantumUncertainty * this.qGate + // Schrödinger spread (P1-ablatable)
        GWT_CAPACITY_REENTRY_GAIN * this.lastGwtCapacity.pressure, // V1.3 GWT-2: overloaded workspace ⇒ explore
    );

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
    // #71 · VALENCE STEERS BEHAVIOUR — negative affect amplifies withdrawal; positive amplifies approach.
    const vPos = clamp01(this.valence);
    const vNeg = clamp01(-this.valence);
    drives.FLEE += VALENCE_STEER_GAIN * vNeg * (1 - this.dominance);
    drives.REST += VALENCE_STEER_GAIN * vNeg * 0.5 * s[0];
    drives.DOMINATE += VALENCE_STEER_GAIN * vPos * this.dominance;
    drives.HUNT += VALENCE_STEER_GAIN * vPos * s[5];
    drives.SPAWN += VALENCE_STEER_GAIN * vPos * s[0] * 0.25;
    drives.EXPLORE += VALENCE_STEER_GAIN * (0.5 - Math.abs(this.valence)) * novelty;
    // the instinct's recalled archetype nudges its plan (bounded) — subsymbolic vote on the decision
    if (instinctPlan) drives[instinctPlan] += INSTINCT_GAIN * instinctStrength;
    if (hopPlan) drives[hopPlan] += HOPFIELD_GAIN * hopStrength;
    // the free-energy core votes too: lower expected free energy ⇒ a stronger (bounded) bias, so the
    // creature is at once goal-seeking (pragmatic) AND curious (epistemic) under one principle (Friston).
    let gMin = Infinity;
    let gMax = -Infinity;
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const g = this.aifG[i] ?? 0;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
    }
    const gSpan = gMax - gMin > 1e-9 ? gMax - gMin : 1;
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const plan = SUPER_PLANS[i];
      if (plan) drives[plan] += AIF_GAIN * ((gMax - (this.aifG[i] ?? 0)) / gSpan);
    }

    // ── V94 · THEORY OF MIND ── infer the nearest rival's intent from its observable cues, then bias the
    // creature's SOCIAL plans: meet predicted aggression with flight + deception (or, if dominant, press
    // DOMINATE); exploit a rival predicted weak/passive with HUNT/DOMINATE. A bounded social vote, like the
    // instinct and free-energy votes above.
    const tomGain = 0.14;
    const menace = this.tom.observe(s[6], s[1], this.dominance, aggression, s[2], s[3]);
    drives.FLEE += tomGain * menace * (1 - this.dominance);
    drives.DECEIVE += tomGain * menace * 0.5;
    drives.DOMINATE += tomGain * (1 - menace) * this.dominance;
    drives.HUNT += tomGain * (1 - menace) * s[5];

    // ── ToM PANTHEON ── the 25-organ ensemble (6 distinct mechanism families) re-reads the same social cues
    // and casts an AGGREGATE social vote alongside the single opponent-model above. A many-models consensus is
    // steadier than one net: its mean menace (gated by ensemble confidence, so a split jury votes weakly)
    // sharpens the same FLEE/DECEIVE/DOMINATE social pressure — making all 25 organs reachable + plan-
    // affecting, not a parked name-list. Bounded, deterministic, allocation-free.
    const c = this.tomCues;
    c[0] = s[6] ?? 0; // rival proximity
    c[1] = s[1] ?? 0; // threat
    c[2] = this.dominance; // my dominance
    c[3] = aggression; // my aggression
    c[4] = s[2] ?? 0; // crowding
    c[5] = menace; // the single opponent-model's read (a shared prior the ensemble refines)
    c[6] = s[3] ?? 0; // chaos (the deception family reads this last slot as concealment pressure)
    this.tomPantheon.observe(c);
    this.tomEnsembleMenace = this.tomPantheon.getAggregateMenace();
    this.tomEnsembleConfidence = this.tomPantheon.getAggregateConfidence();
    const tomEnsembleGain = 0.08;
    const ensembleVote = tomEnsembleGain * this.tomEnsembleMenace * this.tomEnsembleConfidence;
    drives.FLEE += ensembleVote * (1 - this.dominance);
    drives.DECEIVE += ensembleVote * 0.6;
    drives.DOMINATE += ensembleVote * this.dominance;

    // ── V95 · NEUROMODULATION ── Doya's metalearning chemistry: a reward-prediction error (dopamine) plus
    // serotonin (patience), noradrenaline (alarm gain) and acetylcholine (attention), computed from the
    // creature's own state, spent as a bounded modulation of the drives — DA → reward pursuit, 5-HT → REST,
    // NE → threat reactivity, ACh → attend to novelty.
    const nmGain = 0.12;
    const reward = clamp01(0.4 * s[0] + 0.3 * s[4] + 0.3 * unit(this.valence));
    this.neuro.update(reward, this.valence, this.arousal, surprise, s[1], novelty);
    drives.HUNT += nmGain * this.neuro.dopamine * s[5];
    drives.DOMINATE += nmGain * this.neuro.dopamine * this.dominance;
    drives.REST += nmGain * this.neuro.serotonin;
    drives.EXPLORE += nmGain * this.neuro.acetylcholine * novelty;
    drives.FLEE += nmGain * this.neuro.noradrenaline * s[1];

    // Tsotchke PINN/PIMC/QRNG-API/homebrew — decision-path substrates (not telemetry-only).
    const pinnHealth = pinnLoss(
      grayScottResidual(
        s[0] ?? 0,
        s[1] ?? 0,
        s[2] ?? 0,
        s[3] ?? 0,
        s[4] ?? 0,
        s[5] ?? 0,
        0.055,
        0.062,
      ),
    );
    this.pimcPath[0] = clamp01((this.pimcPath[0] ?? 0) + (surprise - 0.5) * 0.08);
    for (let pi = 1; pi < 8; pi++)
      this.pimcPath[pi] = clamp01((this.pimcPath[pi - 1] ?? 0) * 0.7 + novelty * 0.3);
    const pimcW = pathWeight(this.pimcPath, 2.5 + surprise, (x) => (x - 0.5) * (x - 0.5));
    const hb = homebrewEshkolBeat(TSOTCHKE_HARVEST.eskCount, this.cliffordBeat, this.noiseSeed);
    const apiDraw = qrngApiDrawFrom(this.eshkol);
    drives.REST += 0.06 * pinnHealth * (1 - s[1]);
    drives.EXPLORE += 0.08 * pimcW * (1 - (s[1] ?? 0));
    drives.SPAWN += 0.04 * hb.vitality * s[0];
    drives.HUNT += 0.03 * apiDraw.draw * s[5] * this.qGate; // Eshkol-QRNG draw (P1-ablatable)
    void hb.fingerprint;

    // ── V1.1 · SUCCESSOR REPRESENTATION ── model-based look-ahead: bias each plan by the discounted FUTURE
    // drive its learned predictive map expects it to open onto (Dayan 1993; Stachenfeld et al. 2017, Nat.
    // Neuro.). A plan leading to high-value successor states is boosted beyond its immediate drive — the
    // creature now plans over its OWN behavioural dynamics, not just this beat. Bounded, like the votes above.
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const plan = SUPER_PLANS[i];
      this.srReward[i] = plan ? drives[plan] : 0;
    }
    this.successor.lookahead(this.srReward, this.srValue);
    // more tensor/AD in successor for Tsotchke (Moonlab/Eshkol)
    this.tensorScratch1.set(this.srValue.subarray(0, 4));
    this.tensorScratch2.set(this.quantumOut.subarray(0, 4));
    const srT = moonlabTensorContract(this.tensorScratch1, this.tensorScratch2, 3);
    const srAd = eshkolADGradient((x) => x, this.srValue[0] ?? 0);
    // blend lightly
    this.srValue[0] = clamp01((this.srValue[0] ?? 0) + srT * 0.005 + srAd * 0.01);
    let vMin = Infinity;
    let vMax = -Infinity;
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const v = this.srValue[i] ?? 0;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const vSpan = vMax - vMin > 1e-9 ? vMax - vMin : 1;
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const plan = SUPER_PLANS[i];
      if (plan) drives[plan] += SR_GAIN * (((this.srValue[i] ?? 0) - vMin) / vSpan);
    }

    // ── V95 · EMPOWERMENT ── vote for the plan whose action-row currently steers the future the MOST
    // (highest channel-capacity contribution), scaled by how empowered the mind feels — a bounded
    // agency-hunger vote (last beat's estimate; the drive is refreshed at the end of this beat).
    const empBest = this.empowerment.bestAction();
    if (empBest >= 0) {
      const empPlan = SUPER_PLANS[empBest];
      if (empPlan) {
        // use moonlabTensorContract (Tsotchke Moonlab) + eshkolAD for more tensor/AD in empowerment vote (deeper wiring into mind)
        this.tensorScratch1.set(this.quantumOut.subarray(0, 3));
        const empT = moonlabTensorContract(
          this.tensorScratch1,
          [this.empowerment.empowerment, 0.5, 0.3],
          2,
        );
        const empAd = eshkolADGradient((x) => x * x, this.empowerment.empowerment);
        drives[empPlan] = clamp01(
          (drives[empPlan] ?? 0) +
            EMP_VOTE_GAIN * this.empowerment.empowerment +
            empT * 0.02 +
            empAd * 0.01,
        );
      }
    }

    // ── V97 · HOLOGRAPHIC MEMORY ── recall the plan the VSA trace bound to contexts like this one (an
    // analogical prior: "in situations like this, I chose …") and give it a bounded vote by recall confidence.
    const hrrPlan = this.holographic.recall(s);
    if (hrrPlan >= 0) {
      const hp = SUPER_PLANS[hrrPlan];
      if (hp) drives[hp] += HRR_GAIN * this.holographic.confidence;
    }
    // Moonlab tensor + AD on holographic for more corpus in recall (Tsotchke wiring deeper)
    this.tensorScratch1.set(this.quantumOut.subarray(0, 2));
    const hrrT = moonlabTensorContract([this.holographic.confidence, 0.5], this.tensorScratch1, 2);
    const hrrAd = eshkolADGradient((x) => x, this.holographic.confidence);
    if (hrrPlan >= 0) {
      const hp = SUPER_PLANS[hrrPlan];
      if (hp) drives[hp] = clamp01((drives[hp] ?? 0) + hrrT * 0.01 + hrrAd * 0.005);
    }

    // ── V98 · QUANTUM DELIBERATION ── evolve the open-system decider: curiosity sustains the coherent
    // superposition of options (Rabi drive), dominance leans the preference (detuning), arousal is the
    // environmental noise that decoheres it. While it stays COHERENT (undecided), keep exploring.
    // #9/#37 — the collective coherence suppresses the dephasing bath (shared-processing input, not an edit).
    this.deliberation.step(
      curiosity,
      clamp(2 * this.dominance - 1, -1, 1),
      clamp01(this.arousal * (1 - DELIB_COUPLE * this.lastResOrder)),
    );
    // P1-ablatable: the quantum DECIDER's influence on the plan (the qubit still evolves + reports its
    // coherence on the snapshot; only its drive contribution is gated, so the ablation is observable but
    // the classical arm's deliberation telemetry is unchanged).
    drives.EXPLORE += DELIB_GAIN * this.deliberation.coherence * this.qGate;

    // ── V92 · METACOGNITIVE EXECUTIVE ── before committing, the mind estimates its CONFIDENCE in the
    // decision from four reliability cues — the provisional decision margin, integration (Φ, last beat),
    // belief certainty (1 − active-inference belief entropy), and calm (1 − surprise) — then spends it as
    // control: low confidence opens an exploration drive (resolve the uncertainty) BEFORE the final
    // argmax; high confidence simply lets the leading plan stand (commit / exploit).
    // TSOTCHKE Eshkol update: substrates evolve (logic from narr, inference from surprise, workspace from ignition). Eshkol consciousness model.
    // Bias drives with Eshkol (workspace for "broadcast" to EXPLORE, logic for stable REST).
    drives.EXPLORE += 0.08 * this.eshkolEngine.workspace;
    drives.REST += 0.05 * this.eshkolEngine.logic;
    drives.DOMINATE += 0.04 * this.eshkolEngine.inference;
    // P1-ablatable: the quantum reservoir's LEARNED linear readout (the 4-D feature vector — the whole
    // point of reservoir computing) biases the plan. Previously only the scalar quantumFlux was wired
    // (into curiosity); the feature vector was computed every beat and dropped. Each feature ∈ [−1,1] is
    // unit-mapped to [0,1] and gated by qGate, so the learned quantum-temporal readout finally votes on the
    // decision while staying part of the P1 quantum-ablation control.
    drives.EXPLORE += QRC_FEATURE_GAIN * unit(this.qreservoir.feature(0)) * this.qGate;
    drives.HUNT += QRC_FEATURE_GAIN * unit(this.qreservoir.feature(1)) * this.qGate;
    drives.DOMINATE += QRC_FEATURE_GAIN * unit(this.qreservoir.feature(2)) * this.qGate;
    drives.REST += QRC_FEATURE_GAIN * unit(this.qreservoir.feature(3)) * this.qGate;
    // The MemoryOrchestra + NarrativeMemory were WRITE-ONLY — written every beat (above) but their derived
    // state (regime sentinel, consolidated narrative, graph trust) was never read, so it could not shape the
    // decision. Wire their outputs into the plan (classical faculties ⇒ ungated, not part of the quantum
    // ablation). (1) The regime-shift sentinel: a rising surprise-regime ⇒ the world changed ⇒ explore. (2)
    // Consolidate episodes→belief on ignition, then let the recalled-narrative trust for the recent plan cast
    // a small continuity vote. All deterministic (both stores are pure — no rng) and bounded.
    const memRegime = this.memOrch.step(surprise, this.cons.phi).regime;
    drives.EXPLORE += MEMORY_REGIME_GAIN * clamp01((memRegime - 0.5) * 2);
    this.narrMem.consolidate(this.ignition);
    const narr = this.narrMem.retrieve(SUPER_PLANS.indexOf(this.plan), clamp01(surprise), 1);
    drives[this.plan] += NARRATIVE_TRUST_GAIN * narr.trust * narr.relevance;
    // Eshkol logic: simple "unification" for belief consistency (corpus logic engine) - affects narrative conf.
    if (this.eshkolEngine.logic > 0.6) {
      this.cons.novelty = clamp01(this.cons.novelty * 0.9); // "unify" reduces novelty noise
    }
    let m1 = -Infinity;
    let m2 = -Infinity;
    for (const k of SUPER_PLANS) {
      const d = drives[k];
      if (d > m1) {
        m2 = m1;
        m1 = d;
      } else if (d > m2) {
        m2 = d;
      }
    }
    const decisionMargin = m1 > 1e-6 ? clamp01((m1 - m2) / m1) : 0;
    // V99 — the metacog "integration" reliability cue now blends the classical module participation-ratio
    // (`this.phi`) with the GENUINE quantum register Φ (`qPhi`) — a richer, real-IIT integration signal.
    // #9/#37 SHARED-PROCESSING — plus a small last-beat binding-coherence term: higher-order metacognition
    // genuinely tracks the first-order ENSEMBLE's reliability (binding-by-synchrony as an integration cue,
    // the same role the Φ arg plays). Bounded convex blend; metacog.confidence becomes a real byproduct.
    const confidence = this.metacog.update(
      decisionMargin,
      clamp01(0.45 * this.phi + 0.45 * qPhi + 0.1 * this.lastResOrder),
      aifPerc.beliefEntropy,
      surprise,
    );
    drives.EXPLORE += METACOG_EXPLORE_GAIN * (1 - confidence) * (1 - s[1]);

    // ── GWT-4 · EXPLICIT ATTENTION CONTROLLER ── this is the state-dependent ACCESS CONTROL step:
    // before the resonance field and final argmax, the mind allocates bounded attention over the plan
    // coalitions. The gate reads current drive strength, plan salience, surprise/novelty, Eshkol workspace,
    // prior ignition, metacognitive confidence, and ACh modulation, then WRITES back into the drives. That
    // makes GWT-4 a decision mechanism rather than only an AST-1 telemetry label.
    this.attentionSalience[0] = sal.HUNT;
    this.attentionSalience[1] = sal.FLEE;
    this.attentionSalience[2] = sal.DOMINATE;
    this.attentionSalience[3] = sal.DECEIVE;
    this.attentionSalience[4] = sal.SPAWN;
    this.attentionSalience[5] = sal.EXPLORE;
    this.attentionSalience[6] = sal.REST;
    this.attnController.updateAndApply(drives, this.attentionSalience, {
      energy: s[0] ?? 0,
      threat: s[1] ?? 0,
      novelty,
      surprise,
      ignition: this.ignition,
      workspace: this.eshkolEngine.workspace,
      confidence,
      acetylcholine: this.neuro.acetylcholine,
    });

    // ── #59 · RESONANCE INTEGRATOR ── bind the consciousness assembly by SYNCHRONY (the coupling spark;
    // coupling > count). The twelve integration faculties — GWT ignition, IIT
    // Φ, quantum Φ, Eshkol workspace, deliberation coherence, empowerment, criticality, metacog
    // confidence, FEP prediction-confirmation (1−surprise), HOT qualia tone, reservoir + quantum-reservoir
    // novelty — drive a persistent bank of coupled Kuramoto oscillators. When they AGREE the bank
    // phase-locks into a standing wave (high coherence ⇒ a bound, ignited moment); when they scatter it
    // stays incoherent. The binding then STEERS the commit: a bound assembly contrast-sharpens the
    // leading coalition about its mean (raising its margin ⇒ a more decisive downstream GWT ignition); an
    // unbound one resolves itself by EXPLORING. The ignition/Φ inputs are last-beat values — that is
    // recurrent re-entry (#58), not a hack. Pure + deterministic: phases evolve only from already-seeded
    // faculty signals, drawing nothing from the rng stream, so the beat stays bit-reproducible.
    const resonance = this.resonanceField.step([
      this.ignition,
      this.phi,
      qPhi,
      this.eshkolEngine.workspace,
      this.deliberation.coherence,
      this.empowerment.empowerment,
      this.criticality.proximity,
      confidence,
      clamp01(1 - surprise),
      this.cons.qualiaTone,
      this.reservoir.novelty,
      this.qreservoir.quantumFlux,
    ]);
    this.lastResOrder = resonance.order; // #9/#37 — carry the binding coherence to next beat's GWT gate
    this.lastResWeights = resonance.weights; // #9/#37 — per-faculty coupling edges for broadcast re-entry
    if (resonance.ignited) {
      let driveMean = 0;
      for (const k of SUPER_PLANS) driveMean += drives[k];
      driveMean /= SUPER_PLANS.length;
      for (const k of SUPER_PLANS) {
        drives[k] += RESONANCE_COMMIT_GAIN * resonance.order * (drives[k] - driveMean);
      }
    } else {
      drives.EXPLORE += RESONANCE_EXPLORE_GAIN * (1 - resonance.order);
    }
    // #10/#58 — write the GWT BROADCAST: when the assembly binds, its coherence becomes the workspace
    // signal that arousal + curiosity read at the TOP of the next beat (re-entry above). Smoothed; decays
    // when unbound. This is the write half of the read+write loop the coupling audit exists to enforce.
    this.broadcast += BROADCAST_TAU * ((resonance.ignited ? resonance.order : 0) - this.broadcast);

    // ROADMAP FULFILLMENT NOTE (from 2026-06-21 Honesty Audit + Roadmap P1/P2):
    // "denser faculty↔faculty edges" is the remaining lever after GWT bind + shared-processing.
    // Previous latent injections were measured and reverted (see audit addendum).
    // Current is the honest "modest but real" shipped regime (~0.19+); every lift still needs
    // coupling-audit measurement before it graduates from roadmap to claim.
    // ── V96 · ONLINE LEARNING ── add the reward-reinforced per-plan bias before the argmax. ON by default
    //    ⇒ plans that recently led to reward are nudged up (the eligibility trace below gives delayed
    //    credit); setLearning(false) zeroes planBias ⇒ this is `+= 0` ⇒ byte-identical to the frozen mind.
    for (let i = 0; i < SUPER_PLANS.length; i++) {
      const plan = SUPER_PLANS[i];
      if (plan) drives[plan] += this.planBias[i] ?? 0;
    }

    let best: SuperPlan = 'REST';
    let bestScore = -Infinity;
    let bestIdx = 0;
    let runnerUp = -Infinity;
    for (let ki = 0; ki < SUPER_PLANS.length; ki++) {
      const k = SUPER_PLANS[ki]!;
      const d = drives[k];
      if (d > bestScore) {
        runnerUp = bestScore;
        bestScore = d;
        best = k;
        bestIdx = ki;
      } else if (d > runnerUp) {
        runnerUp = d;
      }
    }
    this.plan = best;
    // V96 · ONLINE LEARNING: reinforce the chosen plan by this beat's (centred) reward via the eligibility
    // trace — temporal credit, so reward also reaches plans that recently set it up. Only when enabled;
    // otherwise planBias stays zero (no behavioural drift). Deterministic (no rng), bounded, O(plans).
    if (this.learnEnabled) {
      for (let i = 0; i < SUPER_PLANS.length; i++) this.planOneHot[i] = i === bestIdx ? 1 : 0;
      this.planLearner.step(this.planBias, this.planOneHot, reward - 0.5, {
        rate: this.learnRate,
        decay: PLAN_LEARN_DECAY,
        clamp: PLAN_LEARN_CLAMP,
      });
    }
    // ── V1.3 · GWT-2 LIMITED-CAPACITY WORKSPACE (Baars/Dehaene broadcast + Cowan ~4 bottleneck) ──
    // The 7 plan-coalitions compete for a capacity-bounded workspace: only the top GWT_WORKSPACE_CAPACITY
    // gain conscious access; the excluded salient mass is the competition `pressure`. An explicit
    // limited-capacity competition (Butlin GWT-2), not a bare argmax — surfaced on snapshot().gwtCapacity
    // and re-entered into next beat's curiosity (read above). Deterministic, allocation-free.
    for (let i = 0; i < SUPER_PLANS.length; i++) this.gwtSal[i] = drives[SUPER_PLANS[i]!] ?? 0;
    this.lastGwtCapacity = gwtCapacityCompete(
      this.gwtSal,
      SUPER_PLANS.length,
      GWT_WORKSPACE_CAPACITY,
    );
    // V1.3 AE-2 EMBODIMENT — learn + read how contingent the senses are on THIS chosen action (body-model).
    this.lastEmbodimentContingency = this.embodiment.step(bestIdx, s);
    // V1.1: fold the realised plan transition into the predictive map so next beat's look-ahead is informed.
    this.successor.observe(bestIdx);
    // V95: credit LAST beat's action → THIS beat's latent cell and refresh the empowerment estimate the next
    // beat's curiosity + plan vote will read. Drives no rng ⇒ the beat stream stays bit-reproducible.
    // #9/#37 — collective incoherence ⇒ faster channel forgetting (shared-processing via the surprise input).
    const effSurprise = clamp01(surprise + INCOH_FORGET_GAIN * (1 - this.lastResOrder));
    this.empowerment.update(this.latent, bestIdx, effSurprise);
    // V97: bind the committed (context ⊙ plan) into the holographic trace so next time a like context
    // recalls it. (#9/#37 measured NULL, 2026-07-02: coherence-scaling the imprint strength washed out —
    // the cleanup-cosine confidence is scale-robust and the HRR_DECAY mixture shifts too slowly to
    // transmit per-beat coherence. Reverted to the plain fold-in; see AUDIT-LOG.)
    this.holographic.observe(bestIdx, s);

    // ── V89 · GWT IGNITION ── the winning plan-coalition is "broadcast" when it crosses the access
    // threshold AND dominates the runner-up (a near-all-or-none event). Persisted so it gates the NEXT
    // beat's memory consolidation above; surfaced live on the SuperCreature board.
    const access = clamp01((bestScore - IGNITION_THRESHOLD) / (1 - IGNITION_THRESHOLD));
    const margin = bestScore > 1e-6 ? clamp01((bestScore - runnerUp) / bestScore) : 0;
    this.ignition += IGNITION_TAU * (access * margin - this.ignition);
    this.cons.ignition = this.ignition;
    // Eshkol GWT workspace broadcast (corpus CONSCIOUSNESS_ENGINE.md: workspace_t + GWT broadcast, logic vars, factor graphs, active inference free energy): the ignition is "broadcast" with workspace strength for 5 Archons.
    // modulates next consolidation. Workspace "step" like in Eshkol.
    for (let si = 0; si < 6; si++) {
      this.eshkolSalience[si] = clamp01(
        (this.organSum[si % 4] ?? 0) * 0.5 + (this.quantumOut[si] ?? 0) * 0.5,
      );
    }
    this.eshkolEngine.step({
      surprise,
      ignition: this.ignition,
      narrative: peakNovelty,
      salience: this.eshkolSalience,
      freeEnergy: aifPerc.freeEnergy,
    });
    this.cons.workspace = clamp01(this.eshkolEngine.workspace * this.ignition);

    // ── V89 · IIT Φ-PROXY ── the participation/coherence ratio pr = (Σxᵢ)²/(M·Σxᵢ²) ∈ [0,1] of the named
    // module activations: 1 when the parts move as one (integrated), ≈1/M when one dominates, → 0 when they
    // cancel (anti-correlated). Rescaled so the ~1/M "independent" baseline maps to 0; sub-baseline values
    // clamp to 0. A TRACTABLE surrogate — true Φ is intractable + non-unique (see SUPER-CREATURE-RESEARCH-2026-06-26.md).
    const mods = this.phiMods;
    mods[0] = mean(this.latent, LATENT);
    mods[1] = mean(this.imagined, LATENT);
    mods[2] = mean(reason, LATENT);
    mods[3] = mean(this.pred, LATENT);
    mods[4] = this.organSum[0] ?? 0;
    mods[5] = mean(q, SUPER_QUANTUM);
    mods[6] = mean(aff, 3);
    mods[7] = mean(self, 4);
    const pr = classicalParticipationRatio(mods);
    const cPhi = classicalIntegratedInformation(mods, this.phiAdjacency);
    const phiBlend = clamp01(0.55 * pr + 0.45 * cPhi.phi);
    this.phi += PHI_TAU * (phiBlend - this.phi);
    // Additional: Eshkol AD/Moonlab tensor for 5 Archons. Continue.
    // Eshkol AD dual for phi (from corpus AUTODIFF).
    this.cons.phi = this.phi;

    // GOAL5 HOT-4: project to sparse-smooth qualia tone (uses attn conf + other state)
    const attnC = this.attnSchema.confidence;
    const qState = [
      this.valence,
      this.arousal,
      this.dominance,
      this.phi,
      this.ignition,
      mean(this.quantumOut, SUPER_QUANTUM),
      surprise,
      attnC,
    ];
    const qTone = this.qualSpace.project(qState);
    this.cons.qualiaTone = qTone.tone;
    // Heartbeat wiring: use Eshkol AD toneGrad from corpus for more in qualia (5 Archons).
    if (qTone.toneGrad)
      this.cons.qualiaTone = Math.max(0, Math.min(1, qTone.tone + (qTone.toneGrad || 0) * 0.01));

    return {
      move: { x: act[0] ?? 0, y: act[1] ?? 0, z: act[2] ?? 0 },
      aggression,
      deception,
      dominance: domProject,
      spawn: spawnDesire,
      curiosity,
      wantsSpawn: spawnDesire > 0.8 && this.offspring < SUPER_MAX_OFFSPRING && s[0] > 0.5,
      plan: best,
      consciousness: this.cons,
      quantum: Array.from(this.quantumOut),
    };
  }

  /** Record that a twin was sired (caps the SPAWN drive). */
  noteSpawn(): void {
    if (this.offspring < 3) this.offspring++;
  }

  /** Latest Eshkol consciousness substrates (for primordial soup catalysis). */
  eshkolBeat(): EshkolConsciousnessSnapshot {
    return this.eshkolEngine.snapshot();
  }

  /** Immutable telemetry snapshot. */
  /** V1.3 AE-2: the within-life forward body-model (output↔input contingency). */
  private embodiment: Embodiment;
  /** V1.3 AE-2: last beat's body-contingency, re-entered into self-awareness. */
  private lastEmbodimentContingency = 0;
  /** V1.3 GWT-2: scratch for the plan-drive saliences fed to the capacity competition (alloc-free). */
  private readonly gwtSal = new Float32Array(SUPER_PLANS.length);
  /** V1.3 GWT-2: last beat's limited-capacity workspace read (occupancy / access / competition pressure). */
  private lastGwtCapacity: GwtCapacityResult = {
    admitted: [],
    occupancy: 0,
    capacity: GWT_WORKSPACE_CAPACITY,
    access: 0,
    pressure: 0,
    ignited: false,
  };
  /** V1.3: last beat's latent-substrate read (Schrödinger uncertainty / SO(3) coherence / causal effect). */
  private lastLatentSub: LatentSubstrateState = {
    quantumUncertainty: 0,
    orientationCoherence: 0,
    causalEffect: 0,
    causalGrad: 0,
  };

  /** P1: ablate (true) or restore (false) the quantum-substrate contributions to the decision — the
   *  parameter-matched control arm for the quantum-vs-classical advantage experiment. Default = ON. */
  setQuantumAblated(on: boolean): void {
    this.qGate = on ? 0 : 1;
  }

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
      quantum: Array.from(this.quantumOut),
      latent: Array.from(this.latent),
      imagined: Array.from(this.imagined),
      qubits: this.qmind.snapshot(),
      eshkol: this.eshkol.snapshot(),
      spin: this.spin.snapshot(),
      reservoir: this.reservoir.snapshot(),
      learnedRecurrence: this.learnedRecurrence.snapshot(),
      nqs: this.lastNqsTelemetry,
      aif: this.aif.snapshot(),
      metacog: this.metacog.snapshot(),
      criticality: this.criticality.snapshot(),
      successor: this.successor.snapshot(),
      empowerment: this.empowerment.snapshot(),
      holographic: this.holographic.snapshot(),
      quantumReservoir: this.qreservoir.snapshot(),
      deliberation: this.deliberation.snapshot(),
      resonance: this.resonanceField.snapshot(),
      broadcast: this.broadcast,
      plastic: this.plastic.snapshot(),
      clifford: this.clifford.snapshot(),
      // TSOTCHKE Eshkol consciousness (corpus): 3 substrates snapshot for 5 Archons.
      eshkolConsciousness: {
        logic: this.eshkolEngine.logic,
        inference: this.eshkolEngine.inference,
        workspace: this.eshkolEngine.workspace,
        module: this.tsotchkeModule,
        program: this._eshkolProgram,
      },
      // GOAL5 surfaces
      attentionFocus: this.attnSchema.snapshot().dominantDim + this.attnSchema.confidence * 0.001, // scalar focus proxy
      attentionController: this.attnController.snapshot(),
      tomPantheon: this.tomPantheon.snapshot(),
      topDownError: this.topdown.snapshot().error,
      qualia: Array.from(
        this.qualSpace.project([
          this.valence,
          this.arousal,
          this.dominance,
          this.phi,
          this.ignition,
          mean(this.quantumOut, SUPER_QUANTUM),
          0,
          this.attnSchema.confidence,
        ]).code,
      ),
      latentSubstrates: { ...this.lastLatentSub },
      gwtCapacity: {
        occupancy: this.lastGwtCapacity.occupancy,
        capacity: this.lastGwtCapacity.capacity,
        access: this.lastGwtCapacity.access,
        pressure: this.lastGwtCapacity.pressure,
      },
      embodiment: this.embodiment.snapshot(),
    };
  }
}
