/**
 * QUANTUM QUAKE PHYSICS — simulated quantum geometry over Gaussian wave-packet states.
 *
 * Port of QuantumQuake's QGE particle physics. Upstream `qge/qge_physics.c` encodes a particle's
 * 3D position as a quantum wave function ψ(r) over a spatial grid — a Gaussian envelope times a
 * momentum phase, ψ(r) ∝ exp(−(r−r₀)²/2σ²)·exp(i k·r) (see `qge_particle_spawn`), evolved by
 * Schrödinger phase rotations and measured by the Born rule |ψ|². We reproduce that state
 * construction and then compute quantum-geometric quantities from the resulting model amplitudes:
 *
 *   • Fubini–Study distance  d(ψ₁,ψ₂) = arccos(min(1, |⟨ψ₁|ψ₂⟩|))   — projective Hilbert distance.
 *   • Berry curvature        F_ij = ∂_i A_j − ∂_j A_i,  A_i = Im⟨ψ|∂_iψ⟩  — antisymmetric holonomy.
 *   • Quantum geometric tensor Q_ij = ⟨∂_iψ|∂_jψ⟩ − ⟨∂_iψ|ψ⟩⟨ψ|∂_jψ⟩ via {@link quantumGeometricTensor}.
 *
 * The metric trace is the quantum volume; 4× it is the quantum Fisher information (state
 * distinguishability), which drives the aliveness proxies.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/quantum-quake `qge/qge_physics.c` (Gaussian wave-packet position encoding + momentum
 *   phase + Born-rule measurement) and tsotchke/quantum_geometric_tensor (the QGT / Fubini–Study /
 *   Berry definitions, reused here through the repo's own {@link quantumGeometricTensor}). Both MIT
 *   © tsotchke. References: Provost & Vallée (1980); Berry (1984).
 *
 * Determinism: no Math.random / Date.now — the wave packet is a closed-form function of the state.
 * Hot paths reuse module-level scratch buffers (no per-call allocation in the state builder).
 */
import { quantumGeometricTensor } from '../math/quantum-geometry';

/** QGE state vector for a physics entity. */
export interface QGEState {
  position: [number, number, number]; /* 3D position */
  momentum: [number, number, number]; /* 3D momentum */
  geometricPhase: number; /* Berry phase accumulation */
  curvature: number; /* Local curvature scalar (wave-packet inverse-spread driver) */
}

/** QGE perturbation result. */
export interface QGEPerturbation {
  newPosition: [number, number, number];
  newMomentum: [number, number, number];
  phaseShift: number;
  aliveness: number; /* QGE-derived aliveness metric [0,1] */
}

/**
 * Grid resolution per axis for the encoded wave function. The full state lives on a GRID³ lattice;
 * GRID = 4 → 64 complex amplitudes, the same 64-cell-per-particle neighbourhood the upstream
 * spawn loop samples, small enough that every O(dim) pass below is sub-microsecond.
 */
const GRID = 4;
/** Statevector dimension (number of complex amplitudes) = GRID³. */
const DIM = GRID * GRID * GRID;
/** Center cell coordinate along an axis (GRID/2 maps r₀ to the lattice middle). */
const CENTER = (GRID - 1) / 2;

/** Reusable amplitude scratch for the primary state and its parameter-shifted copies. */
const SCRATCH_RE_A = new Float64Array(DIM);
const SCRATCH_IM_A = new Float64Array(DIM);
const SCRATCH_RE_B = new Float64Array(DIM);
const SCRATCH_IM_B = new Float64Array(DIM);

/**
 * Build the normalized wave-packet amplitudes of |ψ⟩ for a QGE state into the caller's buffers.
 * Reproduces upstream `qge_particle_spawn`: a Gaussian envelope centered at the (scaled) position
 * with a momentum-induced phase k·r, plus the geometric (Berry) phase as a global offset. The
 * inverse spread 1/σ is driven by |curvature| (sharper packet = more localized = more "alive"
 * geometry). Always normalized so ⟨ψ|ψ⟩ = 1. O(DIM); allocation-free (writes into out buffers).
 *
 * @param pos - 3D center position r₀ (mapped onto the lattice).
 * @param mom - 3D momentum k (sets the phase gradient across the lattice).
 * @param phase - geometric phase added as a global complex rotation.
 * @param curvature - inverse-spread driver; larger |curvature| ⇒ tighter packet.
 * @param outRe - real-part output buffer (length ≥ DIM).
 * @param outIm - imag-part output buffer (length ≥ DIM).
 */
function buildWavePacket(
  pos: readonly [number, number, number],
  mom: readonly [number, number, number],
  phase: number,
  curvature: number,
  outRe: Float64Array,
  outIm: Float64Array,
): void {
  // Map position into lattice-cell offsets (wrap into [0,GRID) by the fractional part so the
  // encoding stays bounded for arbitrary world coordinates).
  const cx = CENTER + (((pos[0] % 1) + 1) % 1) * GRID - GRID / 2;
  const cy = CENTER + (((pos[1] % 1) + 1) % 1) * GRID - GRID / 2;
  const cz = CENTER + (((pos[2] % 1) + 1) % 1) * GRID - GRID / 2;
  // Inverse spread: |curvature| sharpens the packet; floor keeps σ finite and the packet smooth.
  const sigma = 1 / (0.35 + Math.abs(curvature) * 1.5);
  const twoSigma2 = 2 * sigma * sigma;

  let norm = 0;
  let idx = 0;
  for (let iz = 0; iz < GRID; iz++) {
    const dz = iz - cz;
    for (let iy = 0; iy < GRID; iy++) {
      const dy = iy - cy;
      for (let ix = 0; ix < GRID; ix++) {
        const dx = ix - cx;
        const rSq = dx * dx + dy * dy + dz * dz;
        const amp = Math.exp(-rSq / twoSigma2); // Gaussian envelope
        // Momentum phase k·r (upstream: phase = (v·d)·0.1) plus a geometric chirp that couples the
        // momentum phase to the lattice center coordinates. The chirp makes the phase a NON-separable
        // function of the position parameters, so ∂_iψ carries a parameter-dependent phase gradient
        // and the Berry connection A_i = Im⟨ψ|∂_iψ⟩ has a genuinely antisymmetric curl (nonzero Berry
        // curvature) — a linear k·r alone is a pure gauge with zero curvature.
        const kr =
          (mom[0] * dx + mom[1] * dy + mom[2] * dz) * 0.5 +
          phase +
          phase * (mom[1] * cx * dy - mom[0] * cy * dx) * 0.5; // chirp: rotational phase ∝ ∂(p×r)
        outRe[idx] = amp * Math.cos(kr);
        outIm[idx] = amp * Math.sin(kr);
        norm += amp * amp;
        idx++;
      }
    }
  }
  // Normalize to a unit state vector (Born-rule states must satisfy ⟨ψ|ψ⟩ = 1).
  if (norm > 0) {
    const inv = 1 / Math.sqrt(norm);
    for (let i = 0; i < DIM; i++) {
      outRe[i]! *= inv;
      outIm[i]! *= inv;
    }
  } else {
    // Degenerate (should not happen): collapse to |0⟩.
    outRe.fill(0);
    outIm.fill(0);
    outRe[0] = 1;
  }
}

/** Build the wave packet for a whole {@link QGEState} into the given buffers. O(DIM). */
function buildStateAmplitudes(state: QGEState, outRe: Float64Array, outIm: Float64Array): void {
  buildWavePacket(
    state.position,
    state.momentum,
    state.geometricPhase,
    state.curvature,
    outRe,
    outIm,
  );
}

/** Hermitian overlap ⟨a|b⟩ = Σ conj(aᵢ)·bᵢ → magnitude |⟨a|b⟩|. O(DIM); allocation-free. */
function overlapMagnitude(
  aRe: Float64Array,
  aIm: Float64Array,
  bRe: Float64Array,
  bIm: Float64Array,
): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < DIM; i++) {
    const ar = aRe[i]!;
    const ai = aIm[i]!;
    const br = bRe[i]!;
    const bi = bIm[i]!;
    re += ar * br + ai * bi; // Re(conj(a)·b)
    im += ar * bi - ai * br; // Im(conj(a)·b)
  }
  return Math.hypot(re, im);
}

/**
 * Compute the Quantum Geometric Tensor metric of the entity's wave-packet state over its three
 * spatial control parameters (position x, y, z). Returns the 3×3 Fubini–Study metric g_ij =
 * Re Q_ij flattened row-major (9 elements). This genuinely CONSUMES the quantum state: the state
 * is rebuilt under parameter shifts and the QGT is taken from the resulting amplitudes via
 * {@link quantumGeometricTensor}. Diagonal entries are ≥ 0 (positive-semidefinite metric).
 *
 * @param state - current QGE state (its wave packet is the |ψ(θ)⟩ being differentiated).
 * @param _parameters - extra control parameters (reserved; the metric is over spatial θ).
 * @returns Fubini–Study metric tensor, 3×3 row-major (9 elements).
 * @remarks O(P²·DIM) with P = 3 — rebuilds the 64-amplitude state 2·P+1 = 7 times per call.
 */
export function computeQGE(state: QGEState, _parameters: number[]): number[] {
  const theta = [state.position[0], state.position[1], state.position[2]];
  const geo = quantumGeometricTensor(
    theta,
    (p, re, im) => {
      buildWavePacket(
        [p[0]!, p[1]!, p[2]!],
        state.momentum,
        state.geometricPhase,
        state.curvature,
        re,
        im,
      );
    },
    DIM,
    1e-3,
  );
  const m = geo.metric;
  return [
    m[0]![0]!,
    m[0]![1]!,
    m[0]![2]!,
    m[1]![0]!,
    m[1]![1]!,
    m[1]![2]!,
    m[2]![0]!,
    m[2]![1]!,
    m[2]![2]!,
  ];
}

/**
 * Apply a QGE-based perturbation to the physics state, warping momentum and position by the real
 * Fubini–Study metric of the entity's wave packet and deriving aliveness from the quantum Fisher
 * information (4·trace g — total distinguishability of the state under its own controls). Genuinely
 * consumes the state through {@link computeQGE}.
 *
 * @param state - current QGE state.
 * @param parameters - control parameters forwarded to the metric.
 * @param strength - perturbation strength.
 * @returns perturbed state with a bounded [0,1] aliveness metric.
 * @remarks O(P²·DIM); dominated by the QGT rebuilds in {@link computeQGE}.
 */
export function qgePerturb(state: QGEState, parameters: number[], strength = 0.1): QGEPerturbation {
  const metric = computeQGE(state, parameters);
  const gxx = metric[0]!;
  const gyy = metric[4]!;
  const gzz = metric[8]!;
  const gxy = metric[1]!;
  const gyz = metric[5]!;
  const gzx = metric[6]!;

  // Geometric warping of momentum by the diagonal metric (state-sensitive scaling).
  const newMomentum: [number, number, number] = [
    state.momentum[0] * (1 + strength * gxx),
    state.momentum[1] * (1 + strength * gyy),
    state.momentum[2] * (1 + strength * gzz),
  ];

  // Position update with off-diagonal (geodesic-coupling) corrections.
  const newPosition: [number, number, number] = [
    state.position[0] + newMomentum[0] * 0.01 + strength * gxy * 0.001,
    state.position[1] + newMomentum[1] * 0.01 + strength * gyz * 0.001,
    state.position[2] + newMomentum[2] * 0.01 + strength * gzx * 0.001,
  ];

  // Phase shift from the Berry phase plus curvature-driven holonomy.
  const phaseShift = state.geometricPhase + strength * state.curvature * 0.1;

  // Quantum Fisher information = 4·trace(g); aliveness saturates it through tanh into [0,1].
  const fisher = 4 * (gxx + gyy + gzz);
  const aliveness = Math.tanh(Math.abs(fisher) * 0.5);

  return { newPosition, newMomentum, phaseShift, aliveness };
}

/**
 * Berry curvature of the wave-packet state — the antisymmetric tensor F_ij = ∂_i A_j − ∂_j A_i of
 * the Berry connection A_i = Im⟨ψ|∂_iψ⟩, returned as the three independent components of the dual
 * vector [F_yz, F_zx, F_xy] over the (x, y, z) spatial parameters. Computed from the imaginary part
 * of the QGT (Im Q_ij), which is exactly the gauge-invariant Berry curvature; that tensor is
 * antisymmetric by construction, so F_ij = −F_ji holds for the components.
 *
 * @param state - current QGE state.
 * @param _parameters - reserved control parameters (curvature is over the spatial θ).
 * @returns Berry curvature components [F_yz, F_zx, F_xy].
 * @remarks O(P²·DIM); one QGT rebuild of the 64-amplitude state.
 */
export function berryCurvature(state: QGEState, _parameters: number[]): [number, number, number] {
  const theta = [state.position[0], state.position[1], state.position[2]];
  const geo = quantumGeometricTensor(
    theta,
    (p, re, im) => {
      buildWavePacket(
        [p[0]!, p[1]!, p[2]!],
        state.momentum,
        state.geometricPhase,
        state.curvature,
        re,
        im,
      );
    },
    DIM,
    1e-3,
  );
  const b = geo.berry; // Ω_ij = Im Q_ij, antisymmetric
  // Dual vector of the antisymmetric 3×3 curvature: (F_yz, F_zx, F_xy).
  return [b[1]![2]!, b[2]![0]!, b[0]![1]!];
}

/**
 * Fubini–Study distance between two QGE states in projective Hilbert space:
 * d = arccos(min(1, |⟨ψ₁|ψ₂⟩|)) over the normalized wave-packet amplitudes. d(ψ,ψ) = 0 (with a
 * near-1 fidelity guard so f64 round-off does not leak through arccos's singular slope) and
 * orthogonal states give π/2. This is projective-Hilbert distinguishability inside the numerical
 * model, not a physical measurement or Euclidean position distance.
 *
 * @param state1 - first QGE state.
 * @param state2 - second QGE state.
 * @returns Fubini–Study distance in [0, π/2].
 * @remarks O(DIM); reuses module scratch buffers (allocation-free).
 */
export function fubiniStudyDistance(state1: QGEState, state2: QGEState): number {
  buildStateAmplitudes(state1, SCRATCH_RE_A, SCRATCH_IM_A);
  buildStateAmplitudes(state2, SCRATCH_RE_B, SCRATCH_IM_B);
  const fidelity = overlapMagnitude(SCRATCH_RE_A, SCRATCH_IM_A, SCRATCH_RE_B, SCRATCH_IM_B);
  // arccos is ill-conditioned near 1 (infinite slope: arccos(1−ε) ≈ √(2ε)), so identical states
  // would read ~3e-8 from f64 round-off. Treat fidelity within 1 ULP-scale of 1 as exactly equal.
  if (fidelity >= 1 - 1e-12) return 0;
  return Math.acos(fidelity);
}

/**
 * QGE aliveness proxy for SuperMind integration (O(DIM) approximation, no full QGT). Derived from a
 * REAL geometric quantity: the Fubini–Study distinguishability of the entity's wave packet from the
 * lattice ground state |0⟩, normalized to [0,1] by the π/2 maximum and modulated by `alivenessFactor`.
 * A maximally spread / phase-rich state is maximally distinguishable from the trivial state ⇒ "alive".
 *
 * @param curvature - local curvature scalar (inverse-spread driver of the packet).
 * @param phase - geometric phase.
 * @param alivenessFactor - modulation factor (default 1).
 * @returns aliveness estimate in [0,1].
 * @remarks O(DIM); reuses module scratch buffers (allocation-free).
 */
export function qgeAlivenessProxy(curvature: number, phase: number, alivenessFactor = 1): number {
  // Build the packet (centered, momentum-free) and its overlap with the ground state |0⟩.
  buildWavePacket([0, 0, 0], [0.6, 0.4, 0.5], phase, curvature, SCRATCH_RE_A, SCRATCH_IM_A);
  // ⟨0|ψ⟩ = ψ₀ (the |0⟩ amplitude); |⟨0|ψ⟩| is the fidelity with the trivial state.
  const fidelity = Math.hypot(SCRATCH_RE_A[0]!, SCRATCH_IM_A[0]!);
  const f = fidelity > 1 ? 1 : fidelity;
  const fsDistance = Math.acos(f); // [0, π/2]
  const normalized = fsDistance / (Math.PI / 2); // [0,1]
  const out = normalized * alivenessFactor;
  return out < 0 ? 0 : out > 1 ? 1 : out;
}

/**
 * QGE physics step for entity integration. Advances the wave-packet state with the metric-warped
 * {@link qgePerturb} (geometric momentum/position update + Berry phase accumulation) and evolves the
 * curvature by a Schrödinger-style phase drift. Deterministic: identical inputs ⇒ identical output.
 *
 * @param state - current QGE state.
 * @param parameters - control parameters forwarded to the metric.
 * @param dt - time step (default 1/60-ish).
 * @returns updated QGE state with curvature clamped to [-1, 1].
 * @remarks O(P²·DIM); one perturbation (handful of 64-amplitude rebuilds) per call.
 */
export function qgePhysicsStep(
  state: QGEState,
  parameters: number[],
  dt = 0.016,
): QGEState & { aliveness: number } {
  const perturbation = qgePerturb(state, parameters, dt * 10);
  const curvature = state.curvature + dt * 0.1 * Math.sin(state.geometricPhase);

  return {
    position: perturbation.newPosition,
    momentum: perturbation.newMomentum,
    geometricPhase: perturbation.phaseShift,
    curvature: Math.max(-1, Math.min(1, curvature)),
    // Surface the QFI-derived aliveness (previously computed by qgePerturb then discarded). NOT added
    // to QGEState — that interface is the persistent feedback state; this is a per-step read-out.
    aliveness: perturbation.aliveness,
  };
}
