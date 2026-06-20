/**
 * MOONLAB VQE — Variational Quantum Eigensolver with Eshkol AD.
 *
 * Port of Moonlab's VQE algorithm (src/algorithms/vqe/vqe.c) combined with
 * Eshkol automatic differentiation for parameter optimization.
 * Finds the ground state energy of a Hamiltonian using variational ansatz.
 *
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

import { adAdd, adBackward, adConst, adMul, adSin, adTapeNew, adVar } from '../math/eshkol-ad';

/** VQE ansatz parameters (rotation angles for quantum circuit). */
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
 * VQE with Eshkol AD: compute energy and parameter gradients.
 * Uses reverse-mode AD for efficient gradient computation.
 * Simple ansatz: prepare state |ψ(θ,φ)⟩ = R_y(θ) ⊗ R_y(φ) |00⟩.
 * For a 2-qubit system with Hamiltonian H = Z⊗Z (simplified).
 *
 * @param params - current ansatz parameters
 * @returns energy and gradients for gradient descent
 */
export function vqeStep(params: VQEParams): VQEResult {
  const tape = adTapeNew(10);

  // Build computational graph with AD tape
  const thetaVar = adVar(tape, params.theta);
  const phiVar = adVar(tape, params.phi);

  // cos(θ) * cos(φ) using AD operations
  const cosTheta = adSin(tape, adAdd(tape, thetaVar, adConst(tape, Math.PI / 2)));
  const cosPhi = adSin(tape, adAdd(tape, phiVar, adConst(tape, Math.PI / 2)));
  const energyNode = adMul(tape, cosTheta, cosPhi);

  // Backward pass to compute gradients
  adBackward(tape, energyNode);

  // Extract gradients from tape
  const thetaGrad = tape.nodes[thetaVar]!.gradient;
  const phiGrad = tape.nodes[phiVar]!.gradient;

  const energy = tape.nodes[energyNode]!.value;

  return {
    energy,
    gradients: { theta: thetaGrad, phi: phiGrad },
  };
}

/**
 * Gradient descent step for VQE parameter optimization.
 *
 * @param params - current parameters
 * @param learningRate - step size for gradient descent
 * @returns updated parameters
 */
export function vqeGradientDescent(params: VQEParams, learningRate = 0.01): VQEParams {
  const result = vqeStep(params);
  return {
    theta: params.theta - learningRate * result.gradients.theta,
    phi: params.phi - learningRate * result.gradients.phi,
  };
}

/**
 * Run VQE optimization for a fixed number of iterations.
 *
 * @param initialParams - starting parameters
 * @param iterations - number of optimization steps
 * @param learningRate - gradient descent step size
 * @returns final energy and parameters
 */
export function vqeOptimize(
  initialParams: VQEParams,
  iterations = 100,
  learningRate = 0.01,
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
 * VQE energy proxy for SuperMind integration (O(1) approximation).
 * Uses parameterized ansatz without full AD for hot-path performance.
 *
 * @param theta - rotation angle parameter
 * @param phi - rotation angle parameter
 * @param hamiltonianWeight - Hamiltonian coupling strength
 * @returns energy estimate
 */
export function vqeEnergyProxy(theta: number, phi: number, hamiltonianWeight = 1): number {
  return (Math.cos(theta) * Math.cos(phi) + 1) * 0.5 * hamiltonianWeight;
}
