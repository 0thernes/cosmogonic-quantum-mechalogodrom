/**
 * QUANTUM-CLASSICAL AUTODIFF — differentiate a variational quantum circuit's expectation value by the
 * EXACT parameter-shift rule, wrapped as an Eshkol custom-VJP node so it composes with the classical
 * reverse-mode tape ({@link ./eshkol-ad}). This is the bridge that lets a quantum-circuit energy sit
 * inside an ordinary loss and be optimised end-to-end — a "quantum AI training loop" in the small.
 *
 * Real math, no approximation:
 *   - Forward: ⟨H⟩(θ) = Σ_i p_i(θ)·H_ii on the exact statevector ({@link ./quantum.QuantumRegister}),
 *     for a diagonal (Pauli-Z / ZZ …) Hamiltonian H.
 *   - Backward: for a gate exp(−i θ P/2) with P a single Pauli (eigenvalues ±1), the parameter-shift
 *     rule gives the EXACT derivative  ∂⟨H⟩/∂θ_k = ½·[⟨H⟩(θ_k+π/2) − ⟨H⟩(θ_k−π/2)]  — not a finite
 *     difference. (Mitarai et al. 2018; Schuld et al. 2019; "General parameter-shift rules for quantum
 *     gradients", Quantum 2022, arXiv:2107.12390.) Each parameter must drive exactly ONE rotation gate.
 *
 * Tsotchke lineage (see THIRD-PARTY-NOTICES.md): this mirrors Eshkol's custom-VJP AD nodes whose stated
 * purpose is "differentiate through Moonlab VQE circuits" (upstream PR #270, commit d4154f6; observed at
 * eshkol HEAD 4d94ab6, v1.3.3-evolve, 2026-07-12) and Moonlab's exact VQE gradient exported through its
 * stable ABI. Here the circuit is our own deterministic statevector; the differentiation contract is the
 * same, and it composes with the ported reverse-mode tape.
 *
 * Determinism: pure — no Rng, no Date.now, no Math.random. Statevector ops are exact; identical inputs
 * yield identical bytes.
 */
import { QuantumRegister, type GateName } from './quantum';
import {
  adCustom,
  adValue,
  adVar,
  adBackward,
  adGradient,
  adTapeNew,
  adTapeReset,
  type AdTape,
} from './eshkol-ad';

/** One operation in a variational ansatz. A `rot` gate's angle is θ[param]; a `fixed` gate has no angle. */
export type CircuitOp =
  | {
      readonly kind: 'rot';
      readonly gate: 'rx' | 'ry' | 'rz';
      readonly target: number;
      readonly param: number;
    }
  | {
      readonly kind: 'fixed';
      readonly gate: GateName;
      readonly target: number;
      readonly control?: number;
    };

/**
 * A parametrized quantum circuit + a DIAGONAL Hamiltonian. `hamiltonian[i]` is the energy of computational
 * basis state |i⟩ (so ⟨H⟩ = Σ_i p_i·hamiltonian[i]); build it from Pauli-Z terms with {@link pauliZHamiltonian}.
 * `paramCount` = number of independent θ parameters (each must appear in exactly one `rot` op).
 */
export interface QuantumCircuit {
  readonly qubits: number;
  readonly ops: readonly CircuitOp[];
  readonly hamiltonian: Float64Array;
  readonly paramCount: number;
}

const SHIFT = Math.PI / 2;

/**
 * Build the diagonal of a Pauli-Z Hamiltonian H = Σ_t coeff_t · Π_{q∈on_t} Z_q. The |i⟩ diagonal entry is
 * Σ_t coeff_t · Π_{q∈on_t} (bit q of i ? −1 : +1). Covers Ising Z and ZZ couplings and Z fields.
 */
export function pauliZHamiltonian(
  qubits: number,
  terms: ReadonlyArray<{ coeff: number; on: readonly number[] }>,
): Float64Array {
  const dim = 1 << qubits;
  const h = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    let e = 0;
    for (const t of terms) {
      let sign = 1;
      for (const q of t.on) sign *= (i >> q) & 1 ? -1 : 1;
      e += t.coeff * sign;
    }
    h[i] = e;
  }
  return h;
}

/**
 * Run the circuit at parameters `theta` and return the exact expectation ⟨H⟩ = Σ_i p_i·H_ii.
 * Pure/deterministic; reuses `reg` (reset internally) to stay allocation-light on repeated calls.
 */
export function circuitExpectation(
  circuit: QuantumCircuit,
  theta: ArrayLike<number>,
  reg?: QuantumRegister,
): number {
  const r = reg ?? new QuantumRegister(circuit.qubits);
  r.reset();
  for (const op of circuit.ops) {
    if (op.kind === 'rot') r.apply(op.gate, op.target, undefined, theta[op.param] ?? 0);
    else r.apply(op.gate, op.target, op.control);
  }
  const p = r.probabilities();
  const h = circuit.hamiltonian;
  let e = 0;
  for (let i = 0; i < p.length; i++) e += (p[i] ?? 0) * (h[i] ?? 0);
  return e;
}

/**
 * The EXACT gradient ∇_θ⟨H⟩ by the parameter-shift rule: ∂_k = ½[E(θ+π/2·e_k) − E(θ−π/2·e_k)]. Exact
 * (not a finite difference) for single-Pauli-rotation gates. O(2·paramCount) circuit evaluations.
 */
export function parameterShiftGradient(
  circuit: QuantumCircuit,
  theta: readonly number[],
  reg?: QuantumRegister,
): number[] {
  const r = reg ?? new QuantumRegister(circuit.qubits);
  const shifted = theta.slice();
  const grad: number[] = [];
  for (let k = 0; k < circuit.paramCount; k++) {
    const base = shifted[k] ?? 0;
    shifted[k] = base + SHIFT;
    const ep = circuitExpectation(circuit, shifted, r);
    shifted[k] = base - SHIFT;
    const em = circuitExpectation(circuit, shifted, r);
    shifted[k] = base;
    grad.push(0.5 * (ep - em));
  }
  return grad;
}

/**
 * Record ⟨H⟩(θ) on the AD `tape` as a custom-VJP node whose backward is the exact parameter-shift gradient.
 * `thetaNodes` are the tape nodes carrying the parameters (typically {@link adVar} leaves, or the outputs of
 * a classical sub-graph). The returned node composes with the surrounding classical tape, so a hybrid
 * quantum-classical loss differentiates end-to-end under one chain rule.
 *
 * @returns the tape node holding ⟨H⟩(θ)
 */
export function adQuantumExpectation(
  tape: AdTape,
  circuit: QuantumCircuit,
  thetaNodes: readonly number[],
  reg?: QuantumRegister,
): number {
  const theta = thetaNodes.map((n) => adValue(tape, n));
  const value = circuitExpectation(circuit, theta, reg);
  return adCustom(tape, value, thetaNodes.slice(), (gradOut, inputValues) => {
    const g = parameterShiftGradient(circuit, inputValues, reg);
    return g.map((gi) => gi * gradOut);
  });
}

/** Result of a VQE run: optimised parameters, final energy, and the per-step energy trace. */
export interface VqeResult {
  theta: number[];
  energy: number;
  energyHistory: number[];
}

/**
 * A minimal Variational Quantum Eigensolver: minimise ⟨H⟩(θ) by gradient descent, taking the gradient
 * through the unified Eshkol AD tape via the parameter-shift custom-VJP node. For a diagonal Hamiltonian
 * the exact ground energy is min_i H_ii, reachable by an expressive product ansatz — so this converges to
 * the exact ground state, a falsifiable functional check that the whole quantum-classical AD path works.
 * Deterministic (no rng); identical inputs ⇒ identical bytes.
 */
export function vqeMinimize(
  circuit: QuantumCircuit,
  theta0: readonly number[],
  lr: number,
  steps: number,
): VqeResult {
  const tape = adTapeNew(64);
  const reg = new QuantumRegister(circuit.qubits);
  const theta = theta0.slice();
  const energyHistory: number[] = [];
  for (let s = 0; s < steps; s++) {
    adTapeReset(tape);
    const thetaNodes = theta.map((t) => adVar(tape, t));
    const eNode = adQuantumExpectation(tape, circuit, thetaNodes, reg);
    energyHistory.push(adValue(tape, eNode));
    adBackward(tape, eNode); // ∂⟨H⟩/∂θ via the exact parameter-shift custom-VJP
    for (let k = 0; k < theta.length; k++)
      theta[k] = (theta[k] ?? 0) - lr * adGradient(tape, thetaNodes[k]!);
  }
  return { theta, energy: circuitExpectation(circuit, theta, reg), energyHistory };
}

/** The exact ground energy of a diagonal Hamiltonian — min basis-state energy (the VQE target). */
export function diagonalGroundEnergy(circuit: QuantumCircuit): number {
  let min = Infinity;
  for (let i = 0; i < circuit.hamiltonian.length; i++)
    min = Math.min(min, circuit.hamiltonian[i] ?? 0);
  return min;
}
