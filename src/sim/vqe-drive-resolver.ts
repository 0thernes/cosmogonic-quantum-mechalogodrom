/**
 * VARIATIONAL-QUANTUM DRIVE RESOLVER
 *
 * Every living thing in the world carries four competing drives at once — resource-seeking, threat
 * response, exploration, and social gathering. A naive controller blends them linearly, so a scared,
 * hungry, crowded animal ends up doing a muddled average of everything. This resolver instead COMMITS
 * to the minimum-frustration JOINT resolution of those drives, found by a real Variational Quantum
 * Eigensolver: the drives become a 4-qubit diagonal Ising Hamiltonian (local reward for committing a
 * strong drive; a pairwise penalty when two ANTAGONISTIC drives are committed together), and
 * {@link vqeMinimize} drives the circuit toward its ground state using the EXACT parameter-shift
 * gradient through the Eshkol reverse-mode tape ({@link ../math/quantum-ad}).
 *
 * This is the first LIVE consumer of `math/quantum-ad` (Eshkol custom-VJP + Moonlab VQE lineage,
 * observed at eshkol HEAD 4d94ab6, v1.3.3-evolve, 2026-07-12). The quantum substrate stops being a
 * passive wired-but-unread module and starts DECIDING behavior: the resolved commitments and their
 * confidence bias the shared organism controller that the base population, titans, leviathans,
 * shoggoths, petri and soup all read.
 *
 * Honesty: this is a deterministic classical statevector simulation of a variational circuit. It is
 * not physical quantum entropy, not a QPU, not consciousness, and not sentience. `decisionCoherence`
 * reports only the energy improvement the VQE ACTUALLY achieved over the greedy baseline this
 * cadence — a partially-converged run claims proportionally less, never more.
 *
 * Cost: ONE VQE per cadence for the whole world (not per organism). 4 qubits = 16 amplitudes;
 * O(steps · paramCount) circuit evals of O(16). Consumers read the stable signal object in O(1).
 *
 * Determinism: pure. No Rng, no Date.now, no Math.random. Identical inputs ⇒ identical bytes.
 */
import {
  pauliZHamiltonian,
  circuitExpectation,
  vqeMinimize,
  diagonalGroundEnergy,
  type QuantumCircuit,
  type CircuitOp,
} from '../math/quantum-ad';
import { QuantumRegister } from '../math/quantum';
import type { DriveResolutionSignal } from '../types';

/** The four competing drives, each already normalized to [0,1] by the organism-intelligence field. */
export interface DriveVector {
  /** Resource pressure — how hard to commit to foraging/exploiting food. */
  resource: number;
  /** Threat response — how hard to commit to fleeing/defending. */
  threat: number;
  /** Exploration — how hard to commit to wandering toward novelty. */
  exploration: number;
  /** Social drive — how hard to commit to gathering with conspecifics. */
  social: number;
}

/** Qubit index per drive (also the ansatz parameter index). */
const Q_RESOURCE = 0;
const Q_THREAT = 1;
const Q_EXPLORE = 2;
const Q_SOCIAL = 3;
const QUBITS = 4;
const PARAMS = 4;

/**
 * Antagonistic drive pairs and their frustration penalty. A pair is "committed together" when both
 * qubits are 1; the penalty makes the ground state DROP the weaker of two conflicting drives instead
 * of half-serving both. Fixed, documented constants — the resolution is data-driven through the local
 * rewards, not through hand-tuned per-frame biases.
 *   threat ⟂ explore : fear should suppress wandering (strongest antagonism)
 *   resource ⟂ social: under scarcity, foraging competes with gathering
 *   threat ⟂ social  : danger should suppress congregating (mild)
 */
const CONFLICTS: ReadonlyArray<{ a: number; b: number; j: number }> = [
  { a: Q_THREAT, b: Q_EXPLORE, j: 0.9 },
  { a: Q_RESOURCE, b: Q_SOCIAL, j: 0.5 },
  { a: Q_THREAT, b: Q_SOCIAL, j: 0.35 },
];

const clamp01 = (value: number): number =>
  !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

/** Product ansatz: one RY rotation per qubit. RY(π) flips |0⟩→|1⟩, so any basis state is reachable. */
const ANSATZ: readonly CircuitOp[] = [
  { kind: 'rot', gate: 'ry', target: Q_RESOURCE, param: Q_RESOURCE },
  { kind: 'rot', gate: 'ry', target: Q_THREAT, param: Q_THREAT },
  { kind: 'rot', gate: 'ry', target: Q_EXPLORE, param: Q_EXPLORE },
  { kind: 'rot', gate: 'ry', target: Q_SOCIAL, param: Q_SOCIAL },
];

/** Single-qubit Z observables, precomputed once, to read P(bit=1) marginals from the resolved state. */
const Z_OBSERVABLE: readonly Float64Array[] = [
  pauliZHamiltonian(QUBITS, [{ coeff: 1, on: [Q_RESOURCE] }]),
  pauliZHamiltonian(QUBITS, [{ coeff: 1, on: [Q_THREAT] }]),
  pauliZHamiltonian(QUBITS, [{ coeff: 1, on: [Q_EXPLORE] }]),
  pauliZHamiltonian(QUBITS, [{ coeff: 1, on: [Q_SOCIAL] }]),
];

/**
 * Build the diagonal drive Hamiltonian as a Pauli-Z Ising model.
 *
 * Committing drive i (bit=1) is rewarded by −d_i; a conflicting pair committed together costs +j.
 * With bit = (1 − Z)/2 the local reward −d·bit contributes +d/2 on Z_i, and the penalty +j·bitₐ·bit_b
 * contributes −j/4 on each of Zₐ,Z_b and +j/4 on ZₐZ_b. Constant offsets are dropped: they shift every
 * eigenvalue equally, so they change neither the argmin nor the parameter-shift gradient, and every
 * downstream quantity here is an ENERGY DIFFERENCE that cancels the offset.
 */
export function buildDriveHamiltonian(drives: DriveVector): Float64Array {
  const d = [
    clamp01(drives.resource),
    clamp01(drives.threat),
    clamp01(drives.exploration),
    clamp01(drives.social),
  ];
  const zField = [0, 0, 0, 0];
  for (let i = 0; i < QUBITS; i++) zField[i] = zField[i]! + d[i]! / 2;
  const terms: { coeff: number; on: number[] }[] = [];
  for (const { a, b, j } of CONFLICTS) {
    zField[a]! -= j / 4;
    zField[b]! -= j / 4;
    terms.push({ coeff: j / 4, on: [a, b] });
  }
  for (let i = 0; i < QUBITS; i++) terms.push({ coeff: zField[i]!, on: [i] });
  return pauliZHamiltonian(QUBITS, terms);
}

/** The greedy baseline config index: commit every drive whose normalized pressure exceeds ½. */
function naiveConfig(drives: DriveVector): number {
  let config = 0;
  if (clamp01(drives.resource) > 0.5) config |= 1 << Q_RESOURCE;
  if (clamp01(drives.threat) > 0.5) config |= 1 << Q_THREAT;
  if (clamp01(drives.exploration) > 0.5) config |= 1 << Q_EXPLORE;
  if (clamp01(drives.social) > 0.5) config |= 1 << Q_SOCIAL;
  return config;
}

export interface VqeDriveResolverOptions {
  enabled?: boolean;
  /** Frames between resolves; consumers read the held signal in between. */
  cadenceFrames?: number;
  /**
   * Counterfactual arm. When false the resolver still publishes a signal but FREEZES to the greedy
   * baseline (no VQE, decisionCoherence=0) — the ablation that proves the quantum path is causal.
   */
  adaptive?: boolean;
  /** VQE gradient-descent step size. */
  learningRate?: number;
  /** VQE gradient-descent steps per resolve. */
  steps?: number;
}

const DEFAULT_CADENCE = 12;
const DEFAULT_LR = 0.5;
const DEFAULT_STEPS = 48;

/**
 * Owns one deterministic drive resolver for the whole world. Construct once, {@link step} on the
 * shared cadence with the current drives, and hand {@link signal} to consumers.
 */
export class VqeDriveResolver {
  readonly signal: DriveResolutionSignal;

  private readonly adaptive: boolean;
  private readonly cadenceFrames: number;
  private readonly learningRate: number;
  private readonly steps: number;
  private readonly reg = new QuantumRegister(QUBITS);
  private lastFrame = -Infinity;

  constructor(options: VqeDriveResolverOptions = {}) {
    const cadence = options.cadenceFrames ?? DEFAULT_CADENCE;
    if (!Number.isInteger(cadence) || cadence < 1 || cadence > 600) {
      throw new RangeError(`drive-resolver cadence must be an integer in [1,600], got ${cadence}`);
    }
    const steps = options.steps ?? DEFAULT_STEPS;
    if (!Number.isInteger(steps) || steps < 1 || steps > 512) {
      throw new RangeError(`drive-resolver steps must be an integer in [1,512], got ${steps}`);
    }
    const lr = options.learningRate ?? DEFAULT_LR;
    if (!Number.isFinite(lr) || lr <= 0 || lr > 4) {
      throw new RangeError(`drive-resolver learningRate must be in (0,4], got ${lr}`);
    }
    this.adaptive = options.adaptive ?? true;
    this.cadenceFrames = cadence;
    this.learningRate = lr;
    this.steps = steps;
    this.signal = {
      enabled: options.enabled ?? true,
      indicatorOnly: true,
      adaptive: this.adaptive,
      revision: 0,
      resourceCommit: 0,
      threatCommit: 0,
      exploreCommit: 0,
      socialCommit: 0,
      actionBias: 0.5,
      decisionCoherence: 0,
    };
  }

  /** Enable/disable without replacing the stable signal object. */
  setEnabled(enabled: boolean): void {
    this.signal.enabled = enabled;
    if (!enabled) this.clearSignal();
    this.lastFrame = -Infinity;
  }

  /**
   * Resolve the current drive conflict on the configured cadence. Returns the same signal object
   * every call. `force` bypasses the cadence gate (used by the resolve-every-frame gate tests).
   *
   * `predictiveConfidence` ∈ (0,1] (default 1) DAMPS the resolved coherence: when the world's recent
   * dynamics are volatile (low confidence, from {@link ../sim/predictive-metacognition}), a creature
   * commits less hard to its resolved decision. At confidence 1 the output is byte-identical.
   */
  step(
    drives: DriveVector,
    frame: number,
    force = false,
    predictiveConfidence = 1,
  ): DriveResolutionSignal {
    if (!this.signal.enabled) return this.signal;
    const f = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;
    if (!force && f - this.lastFrame < this.cadenceFrames) return this.signal;
    this.lastFrame = f;

    const hamiltonian = buildDriveHamiltonian(drives);
    const circuit: QuantumCircuit = {
      qubits: QUBITS,
      ops: ANSATZ,
      hamiltonian,
      paramCount: PARAMS,
    };

    const greedy = naiveConfig(drives);
    const naiveEnergy = hamiltonian[greedy] ?? 0;
    const groundEnergy = diagonalGroundEnergy(circuit);
    // Energy span across all 2^n configs — the denominator that turns an energy improvement into a
    // bounded, offset-free coherence in [0,1].
    let maxEnergy = -Infinity;
    for (let i = 0; i < hamiltonian.length; i++)
      maxEnergy = Math.max(maxEnergy, hamiltonian[i] ?? 0);
    const span = Math.max(1e-9, maxEnergy - groundEnergy);

    let commits: [number, number, number, number];
    let achievedEnergy: number;
    if (this.adaptive) {
      // Deterministic, drive-informed warm start: a strong drive begins already leaning committed.
      const theta0 = [
        this.warmStart(drives.resource),
        this.warmStart(drives.threat),
        this.warmStart(drives.exploration),
        this.warmStart(drives.social),
      ];
      const result = vqeMinimize(circuit, theta0, this.learningRate, this.steps);
      achievedEnergy = result.energy;
      commits = [
        this.marginal(circuit, result.theta, Q_RESOURCE),
        this.marginal(circuit, result.theta, Q_THREAT),
        this.marginal(circuit, result.theta, Q_EXPLORE),
        this.marginal(circuit, result.theta, Q_SOCIAL),
      ];
    } else {
      // Ablation: no VQE. The greedy baseline IS the decision; no conflict is resolved.
      achievedEnergy = naiveEnergy;
      commits = [
        (greedy >> Q_RESOURCE) & 1,
        (greedy >> Q_THREAT) & 1,
        (greedy >> Q_EXPLORE) & 1,
        (greedy >> Q_SOCIAL) & 1,
      ];
    }

    // Only claim the energy improvement the VQE ACTUALLY achieved over the greedy baseline, then damp
    // it by how much the world's near-future is currently trustworthy (metacognitive gating).
    const improvement = naiveEnergy - achievedEnergy;
    const coherence = clamp01(improvement / span) * clamp01(predictiveConfidence);

    const s = this.signal;
    s.resourceCommit = clamp01(commits[0]);
    s.threatCommit = clamp01(commits[1]);
    s.exploreCommit = clamp01(commits[2]);
    s.socialCommit = clamp01(commits[3]);
    // exploit ↔ explore axis: >0.5 leans explore, <0.5 leans exploit. Neutral when neither committed.
    s.actionBias = clamp01(0.5 + 0.5 * (s.exploreCommit - s.resourceCommit));
    s.decisionCoherence = coherence;
    s.revision++;
    return s;
  }

  private warmStart(drive: number): number {
    // Map drive∈[0,1] to θ∈[0.2π, 0.8π]: strong drive ⇒ larger θ ⇒ higher P(bit=1) at the start.
    return Math.PI * (0.2 + 0.6 * clamp01(drive));
  }

  private marginal(circuit: QuantumCircuit, theta: readonly number[], qubit: number): number {
    // P(bit=1) = (1 − ⟨Z⟩)/2, with ⟨Z⟩ read on the RESOLVED state via the exact statevector.
    const zExp = circuitExpectation(
      { ...circuit, hamiltonian: Z_OBSERVABLE[qubit]! },
      theta,
      this.reg,
    );
    return clamp01((1 - zExp) / 2);
  }

  private clearSignal(): void {
    const s = this.signal;
    s.resourceCommit = 0;
    s.threatCommit = 0;
    s.exploreCommit = 0;
    s.socialCommit = 0;
    s.actionBias = 0.5;
    s.decisionCoherence = 0;
    s.revision++;
  }
}

/**
 * The one bounded seam every consumer uses: how decisively to commit to a resource goal given the
 * resolved drive conflict. A COHERENT exploit-leaning resolution seeks harder (>1); a coherent
 * explore-leaning resolution eases off (<1). With no conflict resolved (decisionCoherence=0, the
 * ablation arm, or a disabled/absent signal) this is exactly 1 — so behavior is byte-identical to the
 * pre-resolver world until a genuine conflict is actually resolved. Pure; caller-safe for null.
 */
export function resolverCommitFactor(signal: DriveResolutionSignal | undefined): number {
  if (!signal || !signal.enabled) return 1;
  // (0.5 − actionBias): + when exploit-leaning, − when explore-leaning. Scaled by how much conflict
  // was actually resolved, and capped to a modest ±20% so it biases, never overrides, the controller.
  const lean = (0.5 - signal.actionBias) * signal.decisionCoherence;
  return clamp01Range(1 + lean * 0.4, 0.8, 1.2);
}

function clamp01Range(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  return value < lo ? lo : value > hi ? hi : value;
}
