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
] as const;

export type FacultyName = (typeof FACULTY_NAMES)[number];

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

/** Faculties Pantheon controller — manages all 100 faculties. */
export class FacultiesPantheon {
  private readonly faculties: ProfiledFaculty[];

  constructor(rng: Rng) {
    this.faculties = FACULTY_NAMES.map(
      (faculty, index) => new ProfiledFaculty(faculty, makeProfile(index, rng)),
    );
  }

  update(inputs: Float32Array): void {
    for (const faculty of this.faculties) faculty.update(inputs);
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
