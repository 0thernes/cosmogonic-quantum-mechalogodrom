/**
 * QUANTUM QUAKE PHYSICS — Quantum Geometric Tensor (QGE) physics integration.
 *
 * Port of QuantumQuake's QGE physics (src/physics/qge_physics.c) providing
 * quantum geometric tensor-based perturbations and aliveness metrics.
 * Combines differential geometry with quantum information for physics simulation.
 *
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** QGE state vector for a physics entity. */
export interface QGEState {
  position: [number, number, number]; /* 3D position */
  momentum: [number, number, number]; /* 3D momentum */
  geometricPhase: number; /* Berry phase accumulation */
  curvature: number; /* Local curvature scalar */
}

/** QGE perturbation result. */
export interface QGEPerturbation {
  newPosition: [number, number, number];
  newMomentum: [number, number, number];
  phaseShift: number;
  aliveness: number; /* QGE-derived aliveness metric [0,1] */
}

/**
 * Compute Quantum Geometric Tensor (QGE) metric tensor.
 * QGE = ⟨∂ψ|∂ψ⟩ − ⟨∂ψ|ψ⟩⟨ψ|∂ψ⟩ (real part).
 *
 * @param state - current QGE state
 * @param _parameters - parameter vector (e.g., control parameters) - unused in simplified version
 * @returns metric tensor (3x3 matrix flattened)
 */
export function computeQGE(state: QGEState, _parameters: number[]): number[] {
  // Simplified QGE: metric depends on curvature and geometric phase
  const metric = new Array(9).fill(0);
  const c = state.curvature;
  const phi = state.geometricPhase;

  // Diagonal elements (curvature-weighted)
  metric[0] = 1 + c * Math.cos(phi); /* g_xx */
  metric[4] = 1 + c * Math.cos(phi + Math.PI / 3); /* g_yy */
  metric[8] = 1 + c * Math.cos(phi + (2 * Math.PI) / 3); /* g_zz */

  // Off-diagonal elements (phase-dependent coupling)
  metric[1] = metric[3] = c * Math.sin(phi) * 0.1; /* g_xy = g_yx */
  metric[2] = metric[6] = c * Math.sin(phi + Math.PI / 4) * 0.1; /* g_xz = g_zx */
  metric[5] = metric[7] = c * Math.sin(phi + Math.PI / 2) * 0.1; /* g_yz = g_zy */

  return metric;
}

/**
 * Apply QGE-based perturbation to physics state.
 * Uses metric tensor to warp momentum and position.
 *
 * @param state - current QGE state
 * @param parameters - control parameters
 * @param strength - perturbation strength
 * @returns perturbed state with aliveness metric
 */
export function qgePerturb(state: QGEState, parameters: number[], strength = 0.1): QGEPerturbation {
  const metric = computeQGE(state, parameters);

  // Apply metric to momentum (geometric warping)
  const newMomentum: [number, number, number] = [
    state.momentum[0] * (1 + strength * metric[0]!),
    state.momentum[1] * (1 + strength * metric[4]!),
    state.momentum[2] * (1 + strength * metric[8]!),
  ];

  // Position update with geodesic correction
  const newPosition: [number, number, number] = [
    state.position[0] + newMomentum[0] * 0.01 + strength * metric[1]! * 0.001,
    state.position[1] + newMomentum[1] * 0.01 + strength * metric[5]! * 0.001,
    state.position[2] + newMomentum[2] * 0.01 + strength * metric[7]! * 0.001,
  ];

  // Phase shift from curvature
  const phaseShift = state.geometricPhase + strength * state.curvature * 0.1;

  // Aliveness metric: combination of curvature and phase coherence
  const aliveness = Math.min(
    1,
    Math.abs(state.curvature) * 0.5 + Math.abs(Math.sin(phaseShift)) * 0.5,
  );

  return { newPosition, newMomentum, phaseShift, aliveness };
}

/**
 * Compute Berry curvature (geometric phase derivative).
 *
 * @param state - current QGE state
 * @param _parameters - control parameters - unused in simplified version
 * @returns Berry curvature vector
 */
export function berryCurvature(state: QGEState, _parameters: number[]): [number, number, number] {
  const phi = state.geometricPhase;
  const c = state.curvature;

  // Simplified Berry curvature: depends on phase and parameter derivatives
  return [
    c * Math.sin(phi),
    c * Math.sin(phi + (2 * Math.PI) / 3),
    c * Math.sin(phi + (4 * Math.PI) / 3),
  ];
}

/**
 * Fubini-Study distance between two quantum states.
 * Measures distinguishability of states in projective Hilbert space.
 *
 * @param state1 - first QGE state
 * @param state2 - second QGE state
 * @returns Fubini-Study distance [0, π/2]
 */
export function fubiniStudyDistance(state1: QGEState, state2: QGEState): number {
  // Simplified: distance based on phase difference and position
  const dPhase = Math.abs(state1.geometricPhase - state2.geometricPhase);
  const dPos = Math.sqrt(
    (state1.position[0] - state2.position[0]) ** 2 +
      (state1.position[1] - state2.position[1]) ** 2 +
      (state1.position[2] - state2.position[2]) ** 2,
  );

  // Combine phase and position distance
  return Math.min(Math.PI / 2, dPhase * 0.5 + dPos * 0.01);
}

/**
 * QGE aliveness proxy for SuperMind integration (O(1) approximation).
 * Uses curvature and phase coherence without full tensor computation.
 *
 * @param curvature - local curvature scalar
 * @param phase - geometric phase
 * @param alivenessFactor - modulation factor
 * @returns aliveness estimate [0,1]
 */
export function qgeAlivenessProxy(curvature: number, phase: number, alivenessFactor = 1): number {
  const phaseCoherence = Math.abs(Math.sin(phase));
  const curvatureContribution = Math.min(1, Math.abs(curvature) * 0.5);
  return (phaseCoherence * 0.6 + curvatureContribution * 0.4) * alivenessFactor;
}

/**
 * QGE physics step for entity integration.
 * Updates state with quantum-geometric perturbations.
 *
 * @param state - current QGE state
 * @param parameters - control parameters (e.g., from environment)
 * @param dt - time step
 * @returns updated QGE state
 */
export function qgePhysicsStep(state: QGEState, parameters: number[], dt = 0.016): QGEState {
  const perturbation = qgePerturb(state, parameters, dt * 10);
  const curvature = state.curvature + dt * 0.1 * Math.sin(state.geometricPhase);

  return {
    position: perturbation.newPosition,
    momentum: perturbation.newMomentum,
    geometricPhase: perturbation.phaseShift,
    curvature: Math.max(-1, Math.min(1, curvature)),
  };
}
