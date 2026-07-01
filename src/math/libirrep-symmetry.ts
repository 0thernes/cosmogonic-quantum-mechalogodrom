/**
 * LIBIRREP SYMMETRY — Clebsch-Gordan, Wigner-D, spherical harmonics, SU(2) characters from Tsotchke libirrep.
 *
 * EXACT (no approximations). Previously this file shipped coarse closed-form placeholders (a `cos()` stand-in
 * for the CG coefficient, a small-j guess for Wigner-d, a hand-listed Legendre table, and a `cos/sin` switch
 * for the symmetry factor). Those were decorative — real names over fake math. This is the faithful port of
 * libirrep's symmetry substrate (clebsch_gordan.c / wigner_d.c / spherical_harmonics.c):
 *   • {@link clebschGordan} and {@link wignerD} delegate to the exact, test-verified Racah/Wigner routines in
 *     {@link ./irrep} — one source of truth, no duplicated approximation.
 *   • {@link sphericalHarmonic} is the exact real Yₗᵐ via the associated-Legendre recurrence.
 *   • {@link libirrepSymmetry} — the ONE actually wired into the sim (`godform.ts`, `world.ts`,
 *     `morphic-field.ts`) — is now the exact normalized SU(2) Weyl character χⱼ(θ), a genuine
 *     representation-theory quantity, not a `cos` pattern. It recovers the true spinor physics: a 2π
 *     rotation of a half-integer spin returns −1 (4π periodicity), which the old switch could never express.
 *
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

import { clebschGordan as irrepClebschGordan, wignerSmallD } from './irrep';

/**
 * Clebsch-Gordan coefficient ⟨j1 m1; j2 m2 | j m⟩ for coupling two angular momenta.
 * Delegates to the exact Racah-formula implementation in {@link ./irrep} (this is the faithful libirrep
 * surface over the one canonical routine — never the old `cos()` approximation).
 */
export function clebschGordan(
  j1: number,
  m1: number,
  j2: number,
  m2: number,
  j: number,
  m: number,
): number {
  return irrepClebschGordan(j1, m1, j2, m2, j, m);
}

/**
 * Wigner (small) d-matrix element dʲ_{m',m}(β) for a rotation by β about the y-axis.
 * Delegates to the exact Jacobi-polynomial implementation ({@link wignerSmallD} in `irrep.ts`).
 */
export function wignerD(j: number, mPrime: number, m: number, beta: number): number {
  return wignerSmallD(j, mPrime, m, beta);
}

/**
 * Associated Legendre polynomial Pₗᵐ(x), integer 0 ≤ m ≤ l, |x| ≤ 1, with the Condon-Shortley phase.
 * Exact three-term recurrence (Numerical Recipes `plgndr`). Pure, allocation-free.
 */
function associatedLegendre(l: number, m: number, x: number): number {
  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2; // the -fact carries the Condon-Shortley (-1)^m phase
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/** (a)! / (b)! for 0 ≤ a ≤ b, evaluated as ∏_{k=a+1}^{b} 1/k (no factorial overflow for bounded l). */
function factorialRatio(a: number, b: number): number {
  let r = 1;
  for (let k = a + 1; k <= b; k++) r /= k;
  return r;
}

/**
 * Real spherical harmonic Yₗᵐ(θ, φ) — the exact angular solution of Laplace's equation.
 * m = 0 → √((2l+1)/4π)·Pₗ(cosθ); m > 0 → √2·N·Pₗᵐ·cos(mφ); m < 0 → √2·N·Pₗ|ᵐ|·sin(|m|φ),
 * with N = √((2l+1)/4π · (l−|m|)!/(l+|m|)!). Convention-standard (Condon-Shortley), so Y₀⁰ = 1/(2√π)
 * and Y₁⁰ = √(3/4π)·cosθ exactly.
 */
export function sphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  if (!Number.isInteger(l) || l < 0) return 0;
  const am = Math.abs(m);
  if (am > l) return 0;
  const plm = associatedLegendre(l, am, Math.cos(theta));
  const norm = Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * factorialRatio(l - am, l + am));
  if (m === 0) return norm * plm;
  const azimuthal = m > 0 ? Math.cos(m * phi) : Math.sin(am * phi);
  return Math.SQRT2 * norm * plm * azimuthal;
}

/**
 * Normalized SU(2) irreducible-representation character — the genuine "symmetry factor from irrep theory".
 * `symmetry` selects the irrep (spin j = symmetry/2, dimension d = 2j+1 = |symmetry|+1); `parameter` is the
 * rotation angle θ. Returns the Weyl character χⱼ(θ) = sin((2j+1)θ/2) / sin(θ/2) normalized by d into
 * [−1, 1]. This is exact representation theory, not decoration: χⱼ(0) = 1 (identity), for j = 1/2 it is
 * cos(θ/2), and a 2π rotation of a half-integer spin returns −1 — the spinor sign, i.e. the real 4π
 * periodicity of SU(2). Pure, deterministic, bounded.
 */
export function libirrepSymmetry(symmetry: number, parameter: number): number {
  const d = Math.abs(Math.round(symmetry)) + 1; // irrep dimension 2j+1 ≥ 1
  const TWO_PI = 2 * Math.PI;
  let theta = parameter % (2 * TWO_PI); // SU(2) characters are 4π-periodic (half-integer spin ⇒ spinors)
  if (theta < 0) theta += 2 * TWO_PI;
  const half = theta / 2;
  const sinHalf = Math.sin(half);
  if (Math.abs(sinHalf) < 1e-12) {
    // Weyl-denominator zero at θ = 2πk: the character limit is (−1)^{k(d−1)}.
    const k = Math.round(theta / TWO_PI);
    return (k * (d - 1)) % 2 === 0 ? 1 : -1;
  }
  return Math.sin(d * half) / (d * sinHalf);
}
