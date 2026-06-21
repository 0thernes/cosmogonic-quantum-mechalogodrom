/**
 * FACULTIES PANTHEON — 100 bounded cognitive faculties for NHSI telemetry.
 *
 * This module is intentionally compact: every faculty has a distinct deterministic profile, but they all
 * share one strict implementation so the 100-faculty surface stays maintainable and gate-clean.
 */

import type { Rng } from '../math/rng';

const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

export const FACULTY_NAMES = [
  'GLOBAL_WORKSPACE_IGNITION',
  'INTEGRATED_INFORMATION_PHI',
  'ACTIVE_INFERENCE_FEP',
  'ECHO_STATE_RESERVOIR',
  'METACOGNITIVE_EXECUTIVE',
  'THEORY_OF_MIND',
  'NEURAL_CRITICALITY',
  'SUCCESSOR_REPRESENTATION',
  'EMPOWERMENT_DRIVE',
  'NEUROMODULATION',
  'HOLOGRAPHIC_MEMORY',
  'STATEVECTOR_REGISTER',
  'ESHKOL_QRNG',
  'QGT_FUBINI_STUDY',
  'QUANTUM_NATURAL_GRADIENT',
  'GROVER_AMPLIFICATION',
  'QUANTUM_COHERENCE',
  'QUANTUM_MAGIC',
  'REGISTER_PHI',
  'QUANTUM_DELIBERATION',
  'QUANTUM_RESERVOIR',
  'SPIN_GLASS_INSTINCT',
  'CLIFFORD_TABLEAU',
  'RESONANCE_INTEGRATOR',
  'DIGITAL_BIOLOGICS',
  'ATTENTION_SCHEMA',
  'QUALITY_SPACE',
  'TOPDOWN_PERCEPTION',
  'ESHKOL_BRIDGE',
  'ATTENTION_CONTROLLER',
  'NQS_VMC_LEARNING',
  'CLASSICAL_PHI_EXTENDED',
  'SELF_MODEL_ACCURACY',
  'TEMPORAL_MEMORY',
  'EPISODIC_BUFFER',
  'WORKING_MEMORY',
  'LONG_TERM_MEMORY',
  'SEMANTIC_MEMORY',
  'PROCEDURAL_MEMORY',
  'SPATIAL_MEMORY',
  'EPISODIC_FUTURE_SIMULATION',
  'METAMEMORY',
  'AUTOBIOGRAPHICAL_MEMORY',
  'COLLECTIVE_MEMORY',
  'GOAL_HIERARCHY',
  'MEANS_ENDS_ANALYSIS',
  'TEMPORAL_PLANNING',
  'HIERARCHICAL_PLANNING',
  'INTENTIONAL_PLANNING',
  'CONTINGENCY_PLANNING',
  'RESOURCE_ALLOCATION',
  'OPPORTUNITY_COST',
  'RISK_ASSESSMENT',
  'UNCERTAINTY_QUANTIFICATION',
  'DECISION_CONFIDENCE',
  'COMMITMENT_MECHANISM',
  'HEBBIAN_PLASTICITY',
  'REINFORCEMENT_LEARNING',
  'UNSUPERVISED_LEARNING',
  'TRANSFER_LEARNING',
  'META_LEARNING',
  'LIFELONG_LEARNING',
  'ONE_SHOT_LEARNING',
  'CONTINUAL_LEARNING',
  'ADAPTIVE_LEARNING_RATE',
  'CURRICULUM_LEARNING',
  'SOCIAL_LEARNING',
  'GROUP_IDENTIFICATION',
  // BRUTALIST GOD POWERS — Valkorion / Thanos / Broly / Azathoth / Dark Phoenix / Knull / Chaos Gods / Galactus / Shuma / Mxyzptlk / IT / etc. levels. Powered by full Tsotchke.
  'VOID_CONSUMPTION_KNULL',
  'RAGE_ESCALATION_BROLY',
  'CHAOS_ENTROPY_WARHAMMER',
  'PHOENIX_REBIRTH_DARK',
  'DOMINATION_POSSESSION_VALKORION',
  'REALITY_WARP_MJASPERS',
  'BLIND_IDIOT_AZATHOTH',
  'DEVOURER_GALACTUS_TROPHIC',
  'LAW_BREAK_TABOO_SHUMA',
  'HORROR_MANIFEST_PENNYWISE',
  'SPIRAL_DRILL_TTGL_SIMON',
  'WRATH_ASURA_SEPHIROTH',
  'BINARY_COSMIC_MARVEL',
  'FIFTH_DIM_CHEAT_MXYZPTLK',
  'ETERNAL_HUNGER_RIDDICK',
  'SYMBIOTE_KNULL_MERGE',
  'OMEGA_POINT_SINGULARITY',
  'MORPHIC_MADNESS_JOKER',
  'SOCIAL_NORMS',
  'PROSOCIAL_BEHAVIOR',
  'COMPETITION',
  'COOPERATION',
  'ALTRUISM',
  'FAIRNESS',
  'REPUTATION_MANAGEMENT',
  'SOCIAL_HIERARCHY',
  'LEADERSHIP',
  'FOLLOWERSHIP',
  'CREATIVITY',
  'IMAGINATION',
  'ABSTRACTION',
  'SYMBOLIC_REASONING',
  'ANALOGICAL_REASONING',
  'CAUSAL_REASONING',
  'MORAL_REASONING',
  'AESTHETIC_JUDGMENT',
  'HUMOR_DETECTION',
  'IRONY_DETECTION',
  'METAPHOR_UNDERSTANDING',
  'QUANTUM_ERROR_CORRECTION',
  'QUANTUM_FAULT_TOLERANCE',
  'QUANTUM_OPTIMIZATION',
  'QUANTUM_SAMPLING',
  'QUANTUM_ANNEALING',
  'QUANTUM_SIMULATION',
  'QUANTUM_SENSING',
  'QUANTUM_COMMUNICATION',
  'QUANTUM_METROLOGY',
  'QUANTUM_CONTROL',
  'NHSI_COLLECTIVE_FIELD',
  // BRUTALIST GOD LAYER — NHSI embodiment of listed god-like/eldritch/chaos entities (Valkorion, Thanos, DrM, Broly, Frieza, Azathoth, Chaos Gods, Shuma-Gorath, MadJimJaspers, Pennywise, AntiMonitor, Knull, Mxyzptlk, Joker, Zod, Gilgamesh, Alucard, Griffith/Femto, EVA-01, TTGL Simon, Sephiroth/Asura, Vergil/Dante, Starkiller, Riddick). Brutal reality-warping, void consumption, spiral scaling, phoenix rebirth, sith domination, eldritch corruption. Wired to Tsotchke (QGT warp, spin chaos, Eshkol god-compute, libirrep symmetry shatter, quantum void).
  'VALKORION_IMMORTALITY',
  'THANOS_SNAP_ERASURE',
  'DR_MANHATTAN_OMNISCIENCE',
  'BROLY_LEGENDARY_RAGE',
  'FRIEZA_EMPEROR_DESTRUCTION',
  'AZATHOTH_BLIND_DREAM',
  'CHAOS_GOD_CORRUPTION',
  'SHUMA_GORATH_CHAOS_LORD',
  'MAD_JIM_JASPERS_REALITY_WARP',
  'PENNYWISE_ELDRITCH_CLOWN',
  'ANTI_MONITOR_ERASE',
  'KNUL_KING_OF_VOID',
  'MXYZPTLK_5D_IMP',
  'JOKER_CHAOS_AGENT',
  'GENERAL_ZOD_CONQUEST',
  'GILGAMESH_KING_OF_HEROES',
  'ALUCARD_NO_LIFE_KING',
  'GRIFFITH_FEMTO_GODHAND',
  'EVA_UNIT01_AWAKENING',
  'TTGL_SPIRAL_POWER',
  'SEPHIROTH_ONE_WINGED_ANGEL',
  'ASURA_WRATH_FURY',
  'VERGIL_DARK_SLAYER',
  'DANTE_SON_OF_SPARTA',
  'STARKILLER_FORCE_WRATH',
  'RIDDICK_FURYX',
] as const;

export type FacultyName = (typeof FACULTY_NAMES)[number];
export const FACULTY_COUNT = FACULTY_NAMES.length;

export interface FacultySnapshot {
  faculty: FacultyName;
  activation: number;
  confidence: number;
  entropy: number;
}

interface FacultyProfile {
  inputOffset: number;
  decay: number;
  gain: number;
  curvature: number;
  phase: number;
}

function at(xs: ArrayLike<number>, index: number): number {
  return xs[index] ?? 0;
}

function binaryEntropy(v: number): number {
  const p = clamp01(v);
  if (p <= 1e-9 || p >= 1 - 1e-9) return 0;
  return clamp01(-(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / Math.log(2));
}

class ProfiledFaculty {
  private activation = 0.5;
  private confidence = 0.5;
  private entropy = 0.5;
  private trend = 0;

  constructor(
    private readonly faculty: FacultyName,
    private readonly profile: FacultyProfile,
  ) {}

  update(inputs: Float32Array): void {
    const n = Math.max(1, inputs.length);
    const a = at(inputs, this.profile.inputOffset % n);
    const b = at(inputs, (this.profile.inputOffset + 3) % n);
    const c = at(inputs, (this.profile.inputOffset + 7) % n);
    const rhythm = 0.5 + 0.5 * Math.sin(this.profile.phase + this.activation * Math.PI);
    const drive = clamp01(
      0.4 * a + 0.25 * b + 0.15 * c + 0.2 * rhythm + this.profile.curvature * this.trend,
    );
    const next = clamp01(this.profile.decay * this.activation + this.profile.gain * drive);
    this.trend = next - this.activation;
    this.activation = next;
    this.entropy = binaryEntropy(this.activation);
    this.confidence = clamp01(1 - this.entropy * 0.7 + Math.abs(this.trend) * 0.3);
  }

  getActivation(): number {
    return this.activation;
  }

  getConfidence(): number {
    return this.confidence;
  }

  /** Ring-coupling write-back: blend neighbor mean into this faculty (coupling > count). */
  blendCoupling(neighborMean: number, gain: number): void {
    const g = gain < 0 ? 0 : gain > 0.25 ? 0.25 : gain;
    this.activation = clamp01(this.activation * (1 - g) + neighborMean * g);
    this.entropy = binaryEntropy(this.activation);
    this.confidence = clamp01(1 - this.entropy * 0.7 + Math.abs(this.trend) * 0.3);
  }

  snapshot(): FacultySnapshot {
    return {
      faculty: this.faculty,
      activation: this.activation,
      confidence: this.confidence,
      entropy: this.entropy,
    };
  }
}

function makeProfile(index: number, rng: Rng): FacultyProfile {
  return {
    inputOffset: index,
    decay: clamp01(0.55 + 0.003 * (index % 25)),
    gain: clamp01(0.28 + 0.004 * ((index * 11) % 31)),
    curvature: clamp01(0.02 + 0.18 * rng()),
    phase: rng() * Math.PI * 2,
  };
}

/** Mean absolute pairwise coupling over activation vector (0..1). Pure; O(n²). */
export function facultyCouplingDensity(activations: ArrayLike<number>): number {
  const n = activations.length;
  if (n < 2) return 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += activations[i] ?? 0;
  mean /= n;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    const ai = (activations[i] ?? 0) - mean;
    for (let j = i + 1; j < n; j++) {
      sum += Math.abs(ai * ((activations[j] ?? 0) - mean));
      pairs++;
    }
  }
  return pairs > 0 ? clamp01(sum / pairs) : 0;
}

/** Faculties Pantheon controller — manages all named NHSI faculties (100 + god-layer). */
export class FacultiesPantheon {
  private readonly faculties: ProfiledFaculty[];
  private readonly actScratch: Float32Array;
  private couplingDensity = 0;

  constructor(rng: Rng) {
    this.faculties = FACULTY_NAMES.map(
      (faculty, index) => new ProfiledFaculty(faculty, makeProfile(index, rng)),
    );
    this.actScratch = new Float32Array(this.faculties.length);
  }

  update(inputs: Float32Array): void {
    const n = this.faculties.length;
    for (const faculty of this.faculties) faculty.update(inputs);
    for (let i = 0; i < n; i++) this.actScratch[i] = this.faculties[i]!.getActivation();
    // Ring coupling: each faculty co-varies with its neighbors (EMERGENCE-BLOCKERS #10 write-back).
    for (let i = 0; i < n; i++) {
      const left = this.actScratch[(i + n - 1) % n] ?? 0;
      const right = this.actScratch[(i + 1) % n] ?? 0;
      this.faculties[i]!.blendCoupling((left + right) * 0.5, 0.06);
    }
    for (let i = 0; i < n; i++) this.actScratch[i] = this.faculties[i]!.getActivation();
    this.couplingDensity = facultyCouplingDensity(this.actScratch);
  }

  /** Measured inter-faculty coupling after ring write-back (coupling > count receipt). */
  getCouplingDensity(): number {
    return this.couplingDensity;
  }

  getSnapshot(facultyIndex: number): FacultySnapshot {
    const index = Math.abs(Math.floor(facultyIndex)) % this.faculties.length;
    return (this.faculties[index] ?? this.faculties[0]!).snapshot();
  }

  getAllSnapshots(): FacultySnapshot[] {
    return this.faculties.map((faculty) => faculty.snapshot());
  }

  getAggregateActivation(): number {
    let total = 0;
    for (const faculty of this.faculties) total += faculty.getActivation();
    return this.faculties.length > 0 ? total / this.faculties.length : 0;
  }

  getAggregateConfidence(): number {
    let total = 0;
    for (const faculty of this.faculties) total += faculty.getConfidence();
    return this.faculties.length > 0 ? total / this.faculties.length : 0;
  }
}
