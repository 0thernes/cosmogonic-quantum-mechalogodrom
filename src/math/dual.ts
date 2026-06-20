/**
 * DUAL NUMBERS — forward-mode automatic differentiation, ported from Eshkol's `vm_dual.c`
 * (audit-verified, native call IDs 370–389). A dual number d = x + x′·ε with ε² = 0 propagates
 * a value and its first derivative through any composition of differentiable ops in O(1) memory
 * and exact (analytic) precision — no finite-difference truncation, no tape. Completes the
 * Eshkol AD family already in `src/math/`: forward (here) · reverse (`eshkol-ad.ts`) · second
 * order (`hyperdual.ts`). Forward mode is the cheap path for f: ℝ → ℝ (or directional derivatives).
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/backend/vm_dual.c. (MIT, © 2024–2026 tsotchke.)
 *
 * Determinism: pure — no Rng, no Date.now, no Math.random.
 */

/** A dual number: value `x` and its first-derivative coefficient `d` (the ε part). */
export interface Dual {
  x: number;
  d: number;
}

/** A constant (zero derivative). */
export const dConst = (x: number): Dual => ({ x, d: 0 });
/** The variable to differentiate at `x` (seeds the ε part to 1, so the result's `.d` = f′(x)). */
export const dVar = (x: number): Dual => ({ x, d: 1 });

export const dAdd = (a: Dual, b: Dual): Dual => ({ x: a.x + b.x, d: a.d + b.d });
export const dSub = (a: Dual, b: Dual): Dual => ({ x: a.x - b.x, d: a.d - b.d });
export const dMul = (a: Dual, b: Dual): Dual => ({ x: a.x * b.x, d: a.d * b.x + a.x * b.d });
export const dDiv = (a: Dual, b: Dual): Dual => ({
  x: a.x / b.x,
  d: (a.d * b.x - a.x * b.d) / (b.x * b.x),
});
export const dNeg = (a: Dual): Dual => ({ x: -a.x, d: -a.d });

/** Apply a unary differentiable function given f(a.x) and f′(a.x). The forward chain rule. */
function dUnary(a: Dual, f: number, df: number): Dual {
  return { x: f, d: df * a.d };
}

export const dSin = (a: Dual): Dual => dUnary(a, Math.sin(a.x), Math.cos(a.x));
export const dCos = (a: Dual): Dual => dUnary(a, Math.cos(a.x), -Math.sin(a.x));
export const dExp = (a: Dual): Dual => {
  const e = Math.exp(a.x);
  return dUnary(a, e, e);
};
export const dLog = (a: Dual): Dual => dUnary(a, Math.log(a.x), 1 / a.x);
export const dSqrt = (a: Dual): Dual => {
  const s = Math.sqrt(a.x);
  return dUnary(a, s, 0.5 / s);
};
export const dPow = (a: Dual, n: number): Dual =>
  dUnary(a, Math.pow(a.x, n), n * Math.pow(a.x, n - 1));
export const dTanh = (a: Dual): Dual => {
  const t = Math.tanh(a.x);
  return dUnary(a, t, 1 - t * t);
};
export const dSigmoid = (a: Dual): Dual => {
  const s = 1 / (1 + Math.exp(-a.x));
  return dUnary(a, s, s * (1 - s));
};

/** Evaluate `f` and its exact first derivative at `x` in one forward pass. */
export function derivative(f: (d: Dual) => Dual, x: number): { value: number; d1: number } {
  const r = f(dVar(x));
  return { value: r.x, d1: r.d };
}
