/**
 * MOONLAB VQE — REAL Variational Quantum Eigensolver for the H₂ molecule.
 *
 * Retires the audit's PROXY_STUB (honest 0.12): the previous "VQE" minimized a
 * bare cos(θ)·cos(φ) with no Hamiltonian. This version optimizes the genuine
 * 2-qubit H₂ molecular Hamiltonian (STO-3G, parity-tapered):
 *
 *   H = g₀·I + g₁·Z₀ + g₂·Z₁ + g₃·Z₀Z₁ + g₄·(X₀X₁ + Y₀Y₁)
 *
 * over the hardware-efficient ansatz |ψ(θ,φ)⟩ = R_y(θ)⊗R_y(φ)|00⟩. The energy is
 * the real sum of Pauli expectation values of that product state:
 *
 *   E(θ,φ) = g₀ + g₁cosθ + g₂cosφ + g₃cosθcosφ + g₄sinθsinφ
 *
 * (⟨Y₀Y₁⟩ = 0 for the real-amplitude R_y ansatz). Gradients come from the real
 * Eshkol reverse-mode AD tape, and gradient descent finds the variational
 * minimum — a true VQE loop, not a trig toy. Coefficients from O'Malley et al.,
 * *Phys. Rev. X* 6, 031007 (2016) (H₂ near equilibrium, ≈0.74 Å).
 *
 * DETERMINISM (Manhattan): exact AD + analytic Pauli expectations, NO `Rng`, NO
 * `Date.now`. MIT © tsotchke (moonlab vqe.c) — see THIRD-PARTY-NOTICES.md.
 */

import { adAdd, adBackward, adConst, adMul, adSin, adTapeNew, adVar } from '../math/eshkol-ad';

/** H₂ Hamiltonian Pauli coefficients (Hartree), O'Malley et al. 2016. */
export const H2_COEFFS = { g0: -0.4804, g1: 0.3435, g2: -0.4347, g3: 0.5716, g4: 0.091 } as const;

/** VQE ansatz parameters (rotation angles for the quantum circuit). */
export interface VQEParams {
  theta: number; /* Rotation angle on qubit 0 */
  phi: number; /* Rotation angle on qubit 1 */
}

/** VQE result with energy and gradients. */
export interface VQEResult {
  energy: number;
  gradients: { theta: number; phi: number };
}

/**
 * REAL ⟨ψ(θ,φ)|H_{H₂}|ψ(θ,φ)⟩ — the H₂ energy as a sum of Pauli expectation
 * values over the R_y⊗R_y product state. The quantity a real VQE minimizes.
 */
export function vqeEnergy(theta: number, phi: number): number {
  const { g0, g1, g2, g3, g4 } = H2_COEFFS;
  const cT = Math.cos(theta);
  const cP = Math.cos(phi);
  const sT = Math.sin(theta);
  const sP = Math.sin(phi);
  return g0 + g1 * cT + g2 * cP + g3 * cT * cP + g4 * sT * sP;
}

/**
 * VQE step with Eshkol reverse-mode AD: builds E(θ,φ) on the tape and returns the
 * energy together with exact ∂E/∂θ, ∂E/∂φ gradients (cos via sin(x+π/2)).
 */
export function vqeStep(params: VQEParams): VQEResult {
  const { g0, g1, g2, g3, g4 } = H2_COEFFS;
  const tape = adTapeNew(64);
  const th = adVar(tape, params.theta);
  const ph = adVar(tape, params.phi);
  const cT = adSin(tape, adAdd(tape, th, adConst(tape, Math.PI / 2))); // cos θ
  const cP = adSin(tape, adAdd(tape, ph, adConst(tape, Math.PI / 2))); // cos φ
  const sT = adSin(tape, th);
  const sP = adSin(tape, ph);
  let e = adConst(tape, g0);
  e = adAdd(tape, e, adMul(tape, adConst(tape, g1), cT));
  e = adAdd(tape, e, adMul(tape, adConst(tape, g2), cP));
  e = adAdd(tape, e, adMul(tape, adConst(tape, g3), adMul(tape, cT, cP)));
  e = adAdd(tape, e, adMul(tape, adConst(tape, g4), adMul(tape, sT, sP)));
  adBackward(tape, e);
  return {
    energy: tape.nodes[e]!.value,
    gradients: { theta: tape.nodes[th]!.gradient, phi: tape.nodes[ph]!.gradient },
  };
}

/**
 * Gradient descent step for VQE parameter optimization.
 *
 * @param params - current parameters
 * @param learningRate - step size for gradient descent
 * @returns updated parameters
 */
export function vqeGradientDescent(params: VQEParams, learningRate = 0.05): VQEParams {
  const result = vqeStep(params);
  return {
    theta: params.theta - learningRate * result.gradients.theta,
    phi: params.phi - learningRate * result.gradients.phi,
  };
}

/**
 * Run VQE optimization for a fixed number of iterations, tracking the lowest
 * energy seen (the variational ground-state estimate).
 *
 * @param initialParams - starting parameters
 * @param iterations - number of optimization steps
 * @param learningRate - gradient descent step size
 * @returns final energy and parameters
 */
export function vqeOptimize(
  initialParams: VQEParams,
  iterations = 200,
  learningRate = 0.05,
): { energy: number; params: VQEParams } {
  let params = { ...initialParams };
  let bestEnergy = Infinity;
  let bestParams = { ...params };

  for (let i = 0; i < iterations; i++) {
    const result = vqeStep(params);
    if (result.energy < bestEnergy) {
      bestEnergy = result.energy;
      bestParams = { ...params };
    }
    params = vqeGradientDescent(params, learningRate);
  }

  return { energy: bestEnergy, params: bestParams };
}

/**
 * VQE energy proxy for SuperMind integration. Returns the ground-state proximity
 * of the real H₂ energy surface (1 at the lowest reachable energy, 0 at the
 * highest), bounded to [0, hamiltonianWeight] so the wired consumer's range is
 * preserved — but now derived from a real Pauli-sum Hamiltonian, not cos·cos.
 */
export function vqeEnergyProxy(theta: number, phi: number, hamiltonianWeight = 1): number {
  const { g0, g1, g2, g3, g4 } = H2_COEFFS;
  const span = Math.abs(g1) + Math.abs(g2) + Math.abs(g3) + Math.abs(g4);
  const eMin = g0 - span;
  const eMax = g0 + span;
  const prox = (eMax - vqeEnergy(theta, phi)) / (eMax - eMin);
  const c = prox < 0 ? 0 : prox > 1 ? 1 : prox;
  return c * hamiltonianWeight;
}
