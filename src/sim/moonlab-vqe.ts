/**
 * MOONLAB VQE — a real Variational Quantum Eigensolver on the project statevector.
 *
 * Faithful TypeScript port of the Moonlab VQE loop structure
 * (Z:\[Vibe Coded (AI)]\(Tsotchke)\mirrors\moonlab\src\algorithms\vqe.c):
 *   - pauli_hamiltonian_t  -> {@link PauliHamiltonian} (H = Σ cᵢ Pᵢ, each Pᵢ a Pauli string)
 *   - vqe_apply_hardware_efficient_ansatz -> {@link applyAnsatz} (RY/RZ + CX entangler layers)
 *   - vqe_compute_energy   -> {@link vqeEnergy}  (E(θ) = Σ cᵢ ⟨ψ(θ)|Pᵢ|ψ(θ)⟩, analytic)
 *   - vqe_solve gradient-descent branch -> {@link vqeOptimize} (parameter-shift gradients)
 *
 * The trial state |ψ(θ)⟩ is prepared with the project's own statevector
 * (src/math/quantum.ts QuantumRegister); Pauli expectations are read directly
 * from the amplitudes. The parameter-shift rule
 *   ∂E/∂θ = ½[E(θ + π/2) − E(θ − π/2)]
 * is exact for RY/RZ generators (single-frequency gates), so gradient descent
 * provably converges toward the ground-state energy (Mitarai et al., PRA 98,
 * 032309 (2018); Schuld et al., PRA 99, 032331 (2019)).
 *
 * Determinism: no randomness in the energy/gradient path. The optional seeded
 * parameter initialiser draws from the project Rng (src/math/rng.ts) — never
 * Math.random / Date.now.
 *
 * MIT © tsotchke (Moonlab) — see THIRD-PARTY-NOTICES.md.
 */

import { QuantumRegister } from '../math/quantum';
import type { Rng } from '../math/rng';

/** Single-qubit Pauli letter inside a Pauli string. 'I' = identity (acts trivially). */
export type Pauli = 'I' | 'X' | 'Y' | 'Z';

/**
 * One weighted Pauli term cᵢ·Pᵢ of a Hamiltonian. `paulis[k]` is the Pauli acting
 * on qubit k (LSB convention, matching QuantumRegister); its length is the qubit count.
 */
export interface PauliTerm {
  /** Real coefficient cᵢ (Hamiltonian is Hermitian ⇒ coefficients are real). */
  coefficient: number;
  /** Pauli string, one letter per qubit, index k = qubit k. */
  paulis: Pauli[];
}

/** A Pauli-sum Hamiltonian H = Σ cᵢ Pᵢ over `qubits` qubits. */
export interface PauliHamiltonian {
  /** Register width this Hamiltonian acts on (1..8, the QuantumRegister cap). */
  qubits: number;
  /** Weighted Pauli terms; every term's string has length === qubits. */
  terms: PauliTerm[];
}

/** VQE ansatz parameters (rotation angles for a 2-qubit hardware-efficient circuit). */
export interface VQEParams {
  theta: number; /* RY angle on qubit 0 */
  phi: number; /* RY angle on qubit 1 */
}

/** VQE result with energy and per-parameter gradients. */
export interface VQEResult {
  energy: number;
  gradients: { theta: number; phi: number };
}

/** Parameter-shift offset: ∂E/∂θ = ½[E(θ+s) − E(θ−s)] is exact at s = π/2 for RY/RZ. */
const SHIFT = Math.PI / 2;

/**
 * Build a single-qubit Pauli Hamiltonian H = c·P (P ∈ {X,Y,Z}, here used as H = Z).
 * Ground energy of Z is −1 (eigenvalue on |1⟩). O(1).
 *
 * @param p - the Pauli operator ('Z' for the canonical H = Z test problem)
 * @param coefficient - real weight c (default 1)
 * @returns a 1-qubit {@link PauliHamiltonian}
 */
export function singlePauliHamiltonian(
  p: Exclude<Pauli, 'I'> = 'Z',
  coefficient = 1,
): PauliHamiltonian {
  return { qubits: 1, terms: [{ coefficient, paulis: [p] }] };
}

/**
 * Build the 2-qubit H = Z⊗Z Hamiltonian (Ising ZZ coupling). Its spectrum is
 * {+c on |00⟩,|11⟩; −c on |01⟩,|10⟩}, ground energy −|c|. O(1).
 *
 * @param coefficient - real weight c (default 1)
 * @returns a 2-qubit {@link PauliHamiltonian}
 */
export function zzHamiltonian(coefficient = 1): PauliHamiltonian {
  return { qubits: 2, terms: [{ coefficient, paulis: ['Z', 'Z'] }] };
}

/**
 * Build the 2-qubit transverse-field Ising Hamiltonian H = −J·Z⊗Z − h·(X⊗I + I⊗X).
 * A nontrivial multi-term problem whose ground state mixes basis states (so the
 * optimizer must rotate the ansatz, not just pick a computational-basis state).
 * O(1).
 *
 * @param j - ZZ coupling strength (default 1)
 * @param h - transverse field strength (default 1)
 * @returns a 2-qubit {@link PauliHamiltonian}
 */
export function tfimHamiltonian(j = 1, h = 1): PauliHamiltonian {
  return {
    qubits: 2,
    terms: [
      { coefficient: -j, paulis: ['Z', 'Z'] },
      { coefficient: -h, paulis: ['X', 'I'] },
      { coefficient: -h, paulis: ['I', 'X'] },
    ],
  };
}

/**
 * Sum of |coefficient| over all terms — bounds |E| by the triangle inequality
 * (every ⟨Pᵢ⟩ ∈ [−1, 1]), so E(θ) ∈ [−coeffL1, +coeffL1] for any θ. O(#terms).
 *
 * @param h - Hamiltonian
 * @returns Σ |cᵢ|
 */
export function coeffL1Norm(h: PauliHamiltonian): number {
  let s = 0;
  for (const t of h.terms) s += Math.abs(t.coefficient);
  return s;
}

/**
 * Apply the hardware-efficient ansatz (Kandala et al., Nature 549, 242 (2017),
 * mirroring vqe_apply_hardware_efficient_ansatz in vqe.c): for each parameter θₖ
 * apply RY(θₖ) on qubit k, then a linear CX entangler over adjacent qubits.
 * One angle per qubit (single layer); extra angles are ignored, missing ones = 0.
 * O(2^n · qubits) over the statevector; allocation-free beyond the register.
 *
 * @param reg - register to evolve in place (already reset to |0…0⟩ by the caller)
 * @param angles - RY rotation angles, angles[k] for qubit k
 */
function applyAnsatz(reg: QuantumRegister, angles: readonly number[]): void {
  const n = reg.qubits;
  for (let q = 0; q < n; q++) {
    reg.apply('ry', q, undefined, angles[q] ?? 0);
  }
  for (let q = 0; q < n - 1; q++) {
    reg.apply('cx', q + 1, q);
  }
}

/**
 * Expectation ⟨ψ|P|ψ⟩ of a single Pauli string P read directly from the statevector
 * amplitudes. For a basis state |x⟩, P|x⟩ = phase·|y⟩ where y flips the bit on every
 * X/Y position and the phase picks up −1 per Z on a set bit and ±i per Y (exactly the
 * accumulation in vqe.c's matrix builder). Because P is Hermitian, ⟨P⟩ is real:
 * ⟨P⟩ = Σ_x Re( conj(a_y) · phase · a_x ). O(2^n · qubits); uses caller scratch buffers.
 *
 * @param re - real amplitude buffer (length ≥ 2^n)
 * @param im - imaginary amplitude buffer (length ≥ 2^n)
 * @param dim - statevector dimension 2^n
 * @param paulis - Pauli string, paulis[q] on qubit q
 * @returns real expectation value in [−1, 1]
 */
function pauliExpectation(
  re: Float64Array,
  im: Float64Array,
  dim: number,
  paulis: readonly Pauli[],
): number {
  let acc = 0;
  for (let x = 0; x < dim; x++) {
    let y = x;
    // phase = phaseRe + i·phaseIm, accumulated over Z (±1) and Y (±i) letters.
    let phaseRe = 1;
    let phaseIm = 0;
    for (let q = 0; q < paulis.length; q++) {
      const p = paulis[q];
      const bit = (x >>> q) & 1;
      if (p === 'X') {
        y ^= 1 << q;
      } else if (p === 'Y') {
        y ^= 1 << q;
        // Y = i·X·Z: +i when bit=0, −i when bit=1. Multiply phase by ±i.
        const s = bit ? -1 : 1;
        const nr = -s * phaseIm;
        const ni = s * phaseRe;
        phaseRe = nr;
        phaseIm = ni;
      } else if (p === 'Z') {
        if (bit) {
          phaseRe = -phaseRe;
          phaseIm = -phaseIm;
        }
      }
      // 'I' contributes nothing.
    }
    // term = conj(a_y) · (phase · a_x); accumulate its real part.
    const ax = re[x] ?? 0;
    const bx = im[x] ?? 0;
    // phase · a_x
    const pr = phaseRe * ax - phaseIm * bx;
    const pi = phaseRe * bx + phaseIm * ax;
    const ay = re[y] ?? 0;
    const by = im[y] ?? 0;
    // Re( conj(a_y) · (pr + i·pi) ) = ay·pr + by·pi
    acc += ay * pr + by * pi;
  }
  return acc;
}

/**
 * Scratch register/amplitude buffers reused across {@link vqeEnergy} calls keyed by
 * qubit count, so the hot energy/gradient path allocates nothing per evaluation.
 */
interface VqeScratch {
  reg: QuantumRegister;
  re: Float64Array;
  im: Float64Array;
}
const scratchByWidth: (VqeScratch | undefined)[] = [];

function scratchFor(qubits: number): VqeScratch {
  let s = scratchByWidth[qubits];
  if (!s) {
    const reg = new QuantumRegister(qubits);
    const dim = reg.dimension;
    s = { reg, re: new Float64Array(dim), im: new Float64Array(dim) };
    scratchByWidth[qubits] = s;
  }
  return s;
}

/**
 * Energy expectation E(θ) = Σ cᵢ ⟨ψ(θ)|Pᵢ|ψ(θ)⟩ of the Hamiltonian on the trial
 * state |ψ(θ)⟩ = ansatz(θ)|0…0⟩, evaluated analytically from the real statevector
 * (mirrors vqe_compute_energy's ideal-simulation branch in vqe.c).
 * O(#terms · 2^n · qubits); reuses per-width scratch (allocation-free after warmup).
 *
 * @param h - Pauli Hamiltonian
 * @param angles - ansatz RY angles (angles[k] for qubit k)
 * @returns ground-state-trial energy E(θ), guaranteed within [−L1, +L1] of the coeffs
 * @throws RangeError when the Hamiltonian width is outside the QuantumRegister cap
 */
export function vqeEnergy(h: PauliHamiltonian, angles: readonly number[]): number {
  const { reg, re, im } = scratchFor(h.qubits);
  reg.reset();
  applyAnsatz(reg, angles);
  reg.amplitudesInto(re, im);
  const dim = reg.dimension;
  let energy = 0;
  for (const t of h.terms) {
    energy += t.coefficient * pauliExpectation(re, im, dim, t.paulis);
  }
  return energy;
}

/**
 * Parameter-shift gradient ∂E/∂θₖ = ½[E(…θₖ+π/2…) − E(…θₖ−π/2…)] for every angle,
 * exact for the RY generators of this ansatz. Writes into `out` (length ≥ angles.length).
 * O(#angles · #terms · 2^n); allocation-free (mutates a copy of `angles` in place).
 *
 * @param h - Pauli Hamiltonian
 * @param angles - current ansatz angles
 * @param out - destination gradient buffer
 * @param work - scratch angle buffer (length ≥ angles.length) reused across shifts
 */
function vqeGradient(
  h: PauliHamiltonian,
  angles: readonly number[],
  out: number[],
  work: number[],
): void {
  for (let k = 0; k < angles.length; k++) work[k] = angles[k] ?? 0;
  for (let k = 0; k < angles.length; k++) {
    const base = angles[k] ?? 0;
    work[k] = base + SHIFT;
    const ePlus = vqeEnergy(h, work);
    work[k] = base - SHIFT;
    const eMinus = vqeEnergy(h, work);
    work[k] = base;
    out[k] = 0.5 * (ePlus - eMinus);
  }
}

/**
 * VQE with parameter-shift gradients on the canonical 2-qubit problem: compute the
 * energy of H = Z⊗Z at |ψ(θ,φ)⟩ = RY(θ)⊗RY(φ)|00⟩ and the exact ∂E/∂θ, ∂E/∂φ.
 * Backed by the real statevector — NOT a cosine surrogate. O(2^n) per call.
 *
 * @param params - current ansatz parameters
 * @param h - Hamiltonian (default Z⊗Z); must be a 2-qubit Hamiltonian
 * @returns energy and per-parameter gradients for gradient descent
 */
export function vqeStep(params: VQEParams, h: PauliHamiltonian = zzHamiltonian(1)): VQEResult {
  const angles = [params.theta, params.phi];
  const out: number[] = [0, 0];
  const work: number[] = [0, 0];
  const energy = vqeEnergy(h, angles);
  vqeGradient(h, angles, out, work);
  return { energy, gradients: { theta: out[0] ?? 0, phi: out[1] ?? 0 } };
}

/**
 * One gradient-descent step for the 2-qubit VQE: θ ← θ − η·∂E/∂θ.
 * Deterministic; uses real parameter-shift gradients. O(2^n).
 *
 * @param params - current parameters
 * @param learningRate - step size η (default 0.1)
 * @param h - Hamiltonian (default Z⊗Z)
 * @returns updated parameters
 */
export function vqeGradientDescent(
  params: VQEParams,
  learningRate = 0.1,
  h: PauliHamiltonian = zzHamiltonian(1),
): VQEParams {
  const result = vqeStep(params, h);
  return {
    theta: params.theta - learningRate * result.gradients.theta,
    phi: params.phi - learningRate * result.gradients.phi,
  };
}

/**
 * Run VQE gradient descent for a fixed number of iterations, returning the lowest
 * energy found and the angles that achieved it (mirrors the gradient-descent branch
 * of vqe_solve, tracking the running best). Convergence toward the ground-state
 * energy is guaranteed by the exact parameter-shift gradient. O(iterations · 2^n).
 *
 * @param h - Pauli Hamiltonian (1..8 qubits)
 * @param initialAngles - starting angles (angles[k] for qubit k)
 * @param iterations - number of descent steps (default 200)
 * @param learningRate - step size η (default 0.2)
 * @returns the best (lowest) energy and the angles that produced it
 */
export function vqeMinimize(
  h: PauliHamiltonian,
  initialAngles: readonly number[],
  iterations = 200,
  learningRate = 0.2,
): { energy: number; angles: number[] } {
  const angles = new Array<number>(h.qubits);
  for (let k = 0; k < h.qubits; k++) angles[k] = initialAngles[k] ?? 0;
  const grad = new Array<number>(h.qubits).fill(0);
  const work = new Array<number>(h.qubits).fill(0);

  let bestEnergy = Infinity;
  const bestAngles = angles.slice();

  for (let it = 0; it < iterations; it++) {
    const energy = vqeEnergy(h, angles);
    if (energy < bestEnergy) {
      bestEnergy = energy;
      for (let k = 0; k < h.qubits; k++) bestAngles[k] = angles[k] ?? 0;
    }
    vqeGradient(h, angles, grad, work);
    for (let k = 0; k < h.qubits; k++) {
      angles[k] = (angles[k] ?? 0) - learningRate * (grad[k] ?? 0);
    }
  }
  // Final state may beat every visited point.
  const finalEnergy = vqeEnergy(h, angles);
  if (finalEnergy < bestEnergy) {
    bestEnergy = finalEnergy;
    for (let k = 0; k < h.qubits; k++) bestAngles[k] = angles[k] ?? 0;
  }
  return { energy: bestEnergy, angles: bestAngles };
}

/**
 * Run the 2-qubit VQE optimization for a fixed number of iterations on the given
 * Hamiltonian (default Z⊗Z), returning the best energy and parameters.
 * Backwards-compatible wrapper over {@link vqeMinimize}. O(iterations · 2^n).
 *
 * @param initialParams - starting parameters
 * @param iterations - number of optimization steps (default 200)
 * @param learningRate - gradient descent step size (default 0.2)
 * @param h - Hamiltonian (default Z⊗Z)
 * @returns final best energy and parameters
 */
export function vqeOptimize(
  initialParams: VQEParams,
  iterations = 200,
  learningRate = 0.2,
  h: PauliHamiltonian = zzHamiltonian(1),
): { energy: number; params: VQEParams } {
  const res = vqeMinimize(h, [initialParams.theta, initialParams.phi], iterations, learningRate);
  return {
    energy: res.energy,
    params: { theta: res.angles[0] ?? 0, phi: res.angles[1] ?? 0 },
  };
}

/**
 * Draw a seeded initial parameter pair from the project Rng, in (−π, π].
 * Deterministic: same rng stream position ⇒ same parameters. O(1).
 *
 * @param rng - seeded project Rng (src/math/rng.ts); never Math.random/Date.now
 * @returns starting {@link VQEParams}
 */
export function vqeSeedParams(rng: Rng): VQEParams {
  return { theta: (rng() * 2 - 1) * Math.PI, phi: (rng() * 2 - 1) * Math.PI };
}

/**
 * VQE energy proxy for SuperMind integration — now a REAL single-term VQE evaluation
 * (replacing the former cosine surrogate). Prepares |ψ⟩ = RY(θ)⊗RY(φ)|00⟩ on the
 * project statevector and returns the energy of the weighted ZZ Hamiltonian
 * H = hamiltonianWeight·(Z⊗Z), shifted/scaled into [0, 1] for the consumer:
 *   proxy = (⟨Z⊗Z⟩ + 1) · 0.5 · hamiltonianWeight.
 * ⟨Z⊗Z⟩ ∈ [−1, 1] is computed from the amplitudes, so the proxy stays bounded
 * (the SuperMind clamps its surprise term). Deterministic; O(2^n) = O(4).
 *
 * @param theta - RY angle on qubit 0
 * @param phi - RY angle on qubit 1
 * @param hamiltonianWeight - ZZ coupling strength / output scale (default 1)
 * @returns bounded energy estimate in [0, hamiltonianWeight]
 */
export function vqeEnergyProxy(theta: number, phi: number, hamiltonianWeight = 1): number {
  const { reg, re, im } = scratchFor(2);
  reg.reset();
  applyAnsatz(reg, [theta, phi]);
  reg.amplitudesInto(re, im);
  const zz = pauliExpectation(re, im, reg.dimension, ['Z', 'Z']);
  return (zz + 1) * 0.5 * hamiltonianWeight;
}
