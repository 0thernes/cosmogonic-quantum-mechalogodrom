/**
 * LIBIRREP SYMMETRY — REAL SO(3)/SU(2) representation theory (leaf, exclusive owner).
 *
 * This leaf now DELEGATES to the genuine factorial-sum kernels in `math/irrep.ts`
 * (faithful port of the Tsotchke `libirrep` corpus — `clebsch_gordan.c`,
 * `wigner_d.c`): Racah-form Clebsch–Gordan coefficients and Wigner small-d
 * rotation matrix elements. The previous implementation here was modular
 * arithmetic dressed as representation theory (the audit's PROXY_STUB verdict);
 * the five exported symbols keep their signatures so every consumer
 * (godform, petri-dish, phyla, quality-space, super-body, super-mind,
 * topdown-perception, world, tsotchke-facade) now receives real symmetry math
 * with no call-site changes.
 *
 * DETERMINISM (Manhattan): pure functions over `math/irrep.ts`, NO `Rng`, NO
 * `Date.now`. Outputs are bounded — CG/Wigner elements live in [-1, 1] — so the
 * small additive perturbations these feed into colony growth, morphology angles,
 * and quality-space coordinates stay numerically safe.
 */

import { clebschGordan, wignerSmallD, irrepMultiplicity, IRREP_J_MAX } from '../math/irrep';

/** Clamp an angular momentum to the exact-factorial-safe range [0, IRREP_J_MAX]. */
function clampJ(j: number): number {
  const v = j < 0 ? 0 : j;
  return v > IRREP_J_MAX ? IRREP_J_MAX : v;
}

/** Nearest valid projection of `j` to `x`: |m| ≤ j with (j − m) a non-negative integer. */
function snapProjection(j: number, x: number): number {
  const c = x < -j ? -j : x > j ? j : x;
  return j - Math.round(j - c);
}

/**
 * Magnitude of the real Clebsch–Gordan coefficient |⟨j₁ m₁; j₂ m₂ | J M⟩| for the
 * maximal coupling J = j₁+j₂ (capped), with m₁ the projection of j₁ nearest `m`
 * and m₂ the projection of j₂ nearest 0. A genuine representation-theory weight
 * in [0, 1] (0 when a selection rule fails). Replaces the old modulo stub.
 */
export function libirrepClebsch(j1: number, j2: number, m: number): number {
  const J1 = clampJ(j1);
  const J2 = clampJ(j2);
  const m1 = snapProjection(J1, m);
  const m2 = snapProjection(J2, 0);
  const J = Math.min(J1 + J2, IRREP_J_MAX);
  const M = m1 + m2;
  return Math.abs(clebschGordan(J1, m1, J2, m2, J, M));
}

/**
 * SO(3)-equivariant component count for `baseCount` features carrying angular
 * momentum `irrepDeg` — real (2j+1)-saturating multiplicity from `math/irrep.ts`.
 */
export function libirrepSymmetry(irrepDeg: number, baseCount: number): number {
  return irrepMultiplicity(Math.floor(clampJ(irrepDeg)), baseCount);
}

/**
 * Wigner small-d rotation element d^j_{jj}(β) added to `base`. `idx` selects the
 * rotation angle β ∈ [0, π); the returned element is a real reduced-rotation
 * matrix value (= cos(β/2)^{2j}) in [0, 1], scaled to a gentle ±0.1 perturbation.
 */
export function libirrepWigner(irrepDeg: number, idx: number, base: number): number {
  const j = clampJ(Math.floor(irrepDeg));
  const beta = ((((idx % 24) + 24) % 24) / 24) * Math.PI;
  const d = wignerSmallD(j, j, j, beta);
  return base + d * 0.1;
}

/** SU(2) irrep dimension 2j+1 (exact). */
export function su2Dimension(j: number): number {
  return Math.max(1, 2 * Math.floor(Math.max(0, j)) + 1);
}

/** Active symmetry modes: irrep dimension gated by chaos (point-group projector style). */
export function symmetryModes(irrepDeg: number, chaos: number): number {
  const dim = su2Dimension(irrepDeg);
  return Math.floor(dim * (0.5 + Math.min(1, Math.max(0, chaos)) * 0.5));
}
