/**
 * irrep.ts — REAL SO(3)/SU(2) irreducible-representation math (leaf, exclusive owner).
 *
 * Faithful TypeScript reimplementation of the symmetry kernels in the Tsotchke
 * `libirrep` corpus (MIT, © tsotchke): Wigner small-d rotation matrices
 * (`wigner_d.c`) and Clebsch–Gordan coefficients (`clebsch_gordan.c`), via the
 * standard closed-form factorial sums (Wigner formula / Racah formula). This is
 * the genuine math that retires the decorative `sim/tsotchke-facade.ts`
 * `libirrepClebsch` / `libirrepWigner` / `libirrepSymmetry` stubs (which were
 * modular-arithmetic placeholders, not representation theory).
 *
 * DETERMINISM (Manhattan): pure functions, NO `Rng`, NO `Date.now`, no
 * iteration-order hazards; sums run over a fixed integer index range. Safe to
 * call anywhere in sim logic.
 *
 * Angular-momentum quantum numbers are half-integers represented as JS numbers
 * in steps of 0.5 (e.g. spin-½ → j = 0.5). Degrees are capped at {@link IRREP_J_MAX}
 * so every integer factorial that appears stays EXACT in IEEE-754 float64
 * (n! is exact through 18!, and the largest argument here is 2·J_MAX + 2 ≤ 18).
 *
 * Refs: Edmonds, *Angular Momentum in Quantum Mechanics* (1957); Varshalovich,
 * Moskalev & Khersonskii, *Quantum Theory of Angular Momentum* (1988); Wigner
 * (1931). Upstream: libirrep `src/wigner_d.c`, `src/clebsch_gordan.c`.
 */

/** Max angular momentum so all factorials below stay exact in float64 (2·J+2 ≤ 18). */
export const IRREP_J_MAX = 8;

/** Exact factorial table 0!..(2·J_MAX+2)!, built once at module load. O(1) lookup. */
const FACT: readonly number[] = (() => {
  const f: number[] = [1];
  for (let n = 1; n <= 2 * IRREP_J_MAX + 2; n++) f.push(f[n - 1]! * n);
  return f;
})();

/** n! for a non-negative integer n within the supported range; Infinity if out of range. */
function fact(n: number): number {
  return n >= 0 && n < FACT.length ? FACT[n]! : Number.POSITIVE_INFINITY;
}

/** True when m is a valid projection of j: |m| ≤ j and (j − m) is a non-negative integer. */
export function isValidProjection(j: number, m: number): boolean {
  if (j < 0 || Math.abs(m) > j) return false;
  const d = j - m;
  return Number.isInteger(d) && d >= 0;
}

/** (−1)^n for integer n, sign-correct for negative n. */
function sign(n: number): number {
  return n % 2 === 0 ? 1 : -1;
}

/**
 * Wigner small-d matrix element d^j_{m′m}(β) — the real reduced rotation matrix
 * about the y-axis (Condon–Shortley convention). O(j) over the Wigner sum.
 *
 * d^j_{m′m}(β) = √[(j+m′)!(j−m′)!(j+m)!(j−m)!]
 *   · Σ_k (−1)^{m′−m+k} (cos β/2)^{2j−m′+m−2k} (sin β/2)^{m′−m+2k}
 *       / [ (j+m−k)! k! (m′−m+k)! (j−m′−k)! ]
 */
export function wignerSmallD(j: number, mp: number, m: number, beta: number): number {
  if (j > IRREP_J_MAX || !isValidProjection(j, mp) || !isValidProjection(j, m)) return 0;
  const c = Math.cos(beta / 2);
  const s = Math.sin(beta / 2);
  const pref = Math.sqrt(fact(j + mp) * fact(j - mp) * fact(j + m) * fact(j - m));
  const kMin = Math.max(0, m - mp);
  const kMax = Math.min(j + m, j - mp);
  let sum = 0;
  for (let k = kMin; k <= kMax; k++) {
    const denom = fact(j + m - k) * fact(k) * fact(mp - m + k) * fact(j - mp - k);
    if (!Number.isFinite(denom) || denom === 0) continue;
    const cosExp = 2 * j - mp + m - 2 * k;
    const sinExp = mp - m + 2 * k;
    sum += (sign(mp - m + k) * c ** cosExp * s ** sinExp) / denom;
  }
  return pref * sum;
}

/** Δ(a,b,c) triangle coefficient √-argument used by Clebsch–Gordan; 0 if the triangle fails. */
function triangle(a: number, b: number, c: number): number {
  const x1 = a + b - c;
  const x2 = a - b + c;
  const x3 = -a + b + c;
  if (x1 < 0 || x2 < 0 || x3 < 0) return 0;
  return (fact(x1) * fact(x2) * fact(x3)) / fact(a + b + c + 1);
}

/**
 * Clebsch–Gordan coefficient ⟨j₁ m₁ j₂ m₂ | J M⟩ (Condon–Shortley convention),
 * via the Racah closed form. Returns 0 when any selection rule fails
 * (M ≠ m₁+m₂, triangle |j₁−j₂| ≤ J ≤ j₁+j₂, or invalid projections). O(j) sum.
 */
export function clebschGordan(
  j1: number,
  m1: number,
  j2: number,
  m2: number,
  J: number,
  M: number,
): number {
  if (J > IRREP_J_MAX) return 0;
  if (!isValidProjection(j1, m1) || !isValidProjection(j2, m2) || !isValidProjection(J, M))
    return 0;
  if (Math.abs(m1 + m2 - M) > 1e-12) return 0;
  if (J < Math.abs(j1 - j2) - 1e-12 || J > j1 + j2 + 1e-12) return 0;

  const tri = triangle(j1, j2, J);
  if (tri === 0) return 0;

  const pref = Math.sqrt(
    (2 * J + 1) *
      tri *
      fact(J + M) *
      fact(J - M) *
      fact(j1 - m1) *
      fact(j1 + m1) *
      fact(j2 - m2) *
      fact(j2 + m2),
  );

  const kMin = Math.max(0, Math.max(j2 - J - m1, j1 + m2 - J));
  const kMax = Math.min(j1 + j2 - J, Math.min(j1 - m1, j2 + m2));
  let sum = 0;
  for (let k = kMin; k <= kMax; k++) {
    const denom =
      fact(k) *
      fact(j1 + j2 - J - k) *
      fact(j1 - m1 - k) *
      fact(j2 + m2 - k) *
      fact(J - j2 + m1 + k) *
      fact(J - j1 - m2 + k);
    if (!Number.isFinite(denom) || denom === 0) continue;
    sum += sign(k) / denom;
  }
  return pref * sum;
}

/**
 * Number of independent components in the SO(3)-symmetric placement of `baseCount`
 * features carrying angular momentum `j` — the real replacement for the facade's
 * `libirrepSymmetry` modular stub. A degree-j irrep spans (2j+1) projections, so
 * an equivariant arrangement saturates at multiples of that dimension.
 */
export function irrepMultiplicity(j: number, baseCount: number): number {
  const dim = 2 * Math.min(Math.max(j, 0), IRREP_J_MAX) + 1;
  return Math.max(1, Math.round(baseCount / dim)) * dim;
}
