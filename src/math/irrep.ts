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
 * in steps of 0.5 (e.g. spin-½ → j = 0.5). Degrees are capped at {@link IRREP_J_MAX}.
 * Clebsch–Gordan + Wigner-d draw their factorials from the linear FACT table (built
 * to 3·J_MAX+1 = 25!, the largest argument `(j1+j2+J+1)` reaches at J=8); the upper
 * entries past 18! are not bit-exact in f64, but the balanced numerator/denominator
 * ratios keep CG/Wigner-d accurate to ~1e-16 (verified by orthonormality at j=8).
 * 6j/9j need a far larger range (~4·J ≈ 33! at J=8) and use the log-factorial table LF.
 *
 * Refs: Edmonds, *Angular Momentum in Quantum Mechanics* (1957); Varshalovich,
 * Moskalev & Khersonskii, *Quantum Theory of Angular Momentum* (1988); Wigner
 * (1931). Upstream: libirrep `src/wigner_d.c`, `src/clebsch_gordan.c`.
 */

/** Max angular momentum the closed-form coefficients are validated for. */
export const IRREP_J_MAX = 8;

/**
 * Factorial table 0!..(3·J_MAX+1)! = 0!..25!, built once at module load. 25! is the
 * largest argument Clebsch–Gordan reaches `(j1+j2+J+1)` at J=8. Entries 0..18 are
 * bit-exact in f64; 19!..25! carry f64 rounding (~1e-10 rel) but appear only inside
 * balanced ratios, so CG/Wigner-d stay accurate to ~1e-16. O(1) lookup.
 */
const FACT: readonly number[] = (() => {
  const f: number[] = [1];
  for (let n = 1; n <= 3 * IRREP_J_MAX + 1; n++) f.push(f[n - 1]! * n);
  return f;
})();

/** n! for a non-negative integer n within the supported range; Infinity if out of range. */
function fact(n: number): number {
  return n >= 0 && n < FACT.length ? FACT[n]! : Number.POSITIVE_INFINITY;
}

/**
 * ln(n!) table, 0..(4*J_MAX+2). The 6j/9j Racah sum needs factorials up to ~4*J (≈ 33! at J=8) — far
 * beyond the linear FACT table (25!) and the f64-exact factorial limit (18!). Evaluating those terms with
 * FACT silently dropped them (the `t+1 >= FACT.length` guard) and returned a wrong/near-zero 6j for j >= 7
 * (verified: {8 8 8;8 8 8} gave 4.2e-12 vs the true -1.265e-2). Log-factorials stay accurate to ~1e-14.
 */
const LF: readonly number[] = (() => {
  const t: number[] = [0];
  for (let n = 1; n <= 4 * IRREP_J_MAX + 2; n++) t.push(t[n - 1]! + Math.log(n));
  return t;
})();
/** ln(n!) within range; +Infinity if out of range. */
function lf(n: number): number {
  return n >= 0 && n < LF.length ? LF[n]! : Number.POSITIVE_INFINITY;
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
  // Guard every angular momentum, not just J: fact() saturates to Infinity past the table, so an
  // unclamped large j1/j2 (reachable via the unclamped getClebsch path in tsotchke-deep-wire) would
  // make the prefactor sqrt(Infinity) -> a non-finite CG.
  if (j1 > IRREP_J_MAX || j2 > IRREP_J_MAX || J > IRREP_J_MAX) return 0;
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

/** ln of the Racah triangle coefficient (a sqrt of a factorial ratio); null if the triangle inequality fails. Log-space keeps large-j exact. */
function logTriangleDelta(a: number, b: number, c: number): number | null {
  const x1 = a + b - c;
  const x2 = a - b + c;
  const x3 = -a + b + c;
  const x4 = a + b + c + 1;
  if (x1 < 0 || x2 < 0 || x3 < 0 || !Number.isInteger(x1)) return null;
  return 0.5 * (lf(x1) + lf(x2) + lf(x3) - lf(x4));
}

/**
 * Wigner 6j symbol {j1 j2 j3; j4 j5 j6} via the exact Racah W-formula
 * (Edmonds 6.3.7 / Racah 1942). Returns 0 unless the four triangles
 * (j1 j2 j3), (j1 j5 j6), (j4 j2 j6), (j4 j5 j3) all hold. O(t) integer sum.
 *
 * { j1 j2 j3 } = Δ(j1j2j3)Δ(j1j5j6)Δ(j4j2j6)Δ(j4j5j3)
 * { j4 j5 j6 }   · Σ_t (−1)^t (t+1)! / [ Π(t−αᵢ)! · Π(βⱼ−t)! ]
 */
export function wigner6j(
  j1: number,
  j2: number,
  j3: number,
  j4: number,
  j5: number,
  j6: number,
): number {
  for (const j of [j1, j2, j3, j4, j5, j6]) if (j < 0 || j > IRREP_J_MAX) return 0;
  const ld1 = logTriangleDelta(j1, j2, j3);
  const ld2 = logTriangleDelta(j1, j5, j6);
  const ld3 = logTriangleDelta(j4, j2, j6);
  const ld4 = logTriangleDelta(j4, j5, j3);
  if (ld1 === null || ld2 === null || ld3 === null || ld4 === null) return 0;
  const logDelta = ld1 + ld2 + ld3 + ld4;

  // a = lower bounds, b = upper bounds of the Racah sum index t.
  const a = [j1 + j2 + j3, j1 + j5 + j6, j4 + j2 + j6, j4 + j5 + j3];
  const b = [j1 + j2 + j4 + j5, j2 + j3 + j5 + j6, j3 + j1 + j6 + j4];
  const tMin = Math.max(...a);
  const tMax = Math.min(...b);
  if (tMin > tMax + 1e-9) return 0;

  // Each summand = (-1)^t (t+1)! / [Prod(t-ai)! Prod(bj-t)!] * Delta1*Delta2*Delta3*Delta4, evaluated in
  // LOG space so the ~33! factorials at j=8 stay exact (the old linear-FACT path overflowed -> wrong/~0).
  let sum = 0;
  for (let t = Math.round(tMin); t <= Math.round(tMax); t++) {
    let logTerm = logDelta + lf(t + 1);
    let ok = true;
    for (const ai of a) {
      const v = t - ai;
      if (v < 0) {
        ok = false;
        break;
      }
      logTerm -= lf(v);
    }
    if (!ok) continue;
    for (const bj of b) {
      const v = bj - t;
      if (v < 0) {
        ok = false;
        break;
      }
      logTerm -= lf(v);
    }
    if (!ok || !Number.isFinite(logTerm)) continue;
    sum += sign(t) * Math.exp(logTerm);
  }
  return sum;
}

/**
 * Wigner 9j symbol via the standard single sum over a product of three 6j
 * symbols (Edmonds 6.4.3 / Varshalovich 10.2.4):
 *
 * { a b c }            { a b c }{ d e f }{ g h j }
 * { d e f } = Σ_x (2x+1){ f j x }{ b x h }{ x a d }
 * { g h j }
 *
 * x runs over the overlap of the triangles in half-integer steps. Returns 0
 * when no valid x exists. Exact (delegates to {@link wigner6j}).
 */
export function wigner9j(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  j: number,
): number {
  for (const v of [a, b, c, d, e, f, g, h, j]) if (v < 0 || v > IRREP_J_MAX) return 0;
  const xMin = Math.max(Math.abs(a - j), Math.abs(b - f), Math.abs(d - h));
  const xMax = Math.min(a + j, b + f, d + h);
  if (xMin > xMax + 1e-9) return 0;
  let sum = 0;
  for (let x = xMin; x <= xMax + 1e-9; x += 1) {
    const w1 = wigner6j(a, b, c, f, j, x);
    const w2 = wigner6j(d, e, f, b, x, h);
    const w3 = wigner6j(g, h, j, x, a, d);
    sum += sign(2 * x) * (2 * x + 1) * w1 * w2 * w3;
  }
  return sum;
}
