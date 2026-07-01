/**
 * HYPER-DUAL NUMBERS — exact second-order automatic differentiation, ported from Eshkol's
 * `vm_hyperdual.c` (audit-verified) implementing Fike & Alonso (2011). A hyper-dual number
 *
 *     h = x + x₁·ε₁ + x₂·ε₂ + x₁₂·ε₁ε₂,   with ε₁² = ε₂² = (ε₁ε₂)² = 0,  ε₁ε₂ = ε₂ε₁ ≠ 0
 *
 * carries a value and its first/second derivatives through any composition of differentiable
 * ops with NO truncation error (unlike finite differences) and NO tape (unlike reverse-mode):
 * evaluating f at hdVar(x) yields f(x) in `.x`, f'(x) in `.e1`/`.e2`, and f''(x) in `.e12`.
 * This is the exact-Hessian companion to the reverse-mode tape in `eshkol-ad.ts` — curvature
 * for the mind's optimisation, genuine calculus rather than token statistics.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/backend/vm_hyperdual.c (native call IDs 410–439).
 *   Method: J. Fike & J. Alonso, "The Development of Hyper-Dual Numbers for Exact Second
 *   Derivative Calculations", AIAA 2011-886. (MIT, © 2024–2026 tsotchke.)
 *
 * Determinism: pure — no Rng, no Date.now, no Math.random. Exact (analytic) derivatives.
 */

/** A hyper-dual number: real part + two first-order duals + one second-order cross term. */
export interface HyperDual {
  /** Real / value part f(x). */
  x: number;
  /** ε₁ coefficient — carries ∂/∂x along direction 1. */
  e1: number;
  /** ε₂ coefficient — carries ∂/∂x along direction 2. */
  e2: number;
  /** ε₁ε₂ coefficient — carries the second derivative ∂²/∂x². */
  e12: number;
}

/** A constant (zero derivatives). */
export const hdConst = (x: number): HyperDual => ({ x, e1: 0, e2: 0, e12: 0 });

/** The variable to differentiate at `x`: seeds both first-order parts to 1 so .e1/.e2 = f'(x). */
export const hdVar = (x: number): HyperDual => ({ x, e1: 1, e2: 1, e12: 0 });

export const hdAdd = (a: HyperDual, b: HyperDual): HyperDual => ({
  x: a.x + b.x,
  e1: a.e1 + b.e1,
  e2: a.e2 + b.e2,
  e12: a.e12 + b.e12,
});

export const hdSub = (a: HyperDual, b: HyperDual): HyperDual => ({
  x: a.x - b.x,
  e1: a.e1 - b.e1,
  e2: a.e2 - b.e2,
  e12: a.e12 - b.e12,
});

export const hdMul = (a: HyperDual, b: HyperDual): HyperDual => ({
  x: a.x * b.x,
  e1: a.e1 * b.x + a.x * b.e1,
  e2: a.e2 * b.x + a.x * b.e2,
  e12: a.e12 * b.x + a.e1 * b.e2 + a.e2 * b.e1 + a.x * b.e12,
});

/**
 * Apply a unary differentiable function given its value f, first derivative df, and second
 * derivative ddf (all at `a.x`). The hyper-dual chain rule.
 */
function hdUnary(a: HyperDual, f: number, df: number, ddf: number): HyperDual {
  return {
    x: f,
    e1: df * a.e1,
    e2: df * a.e2,
    e12: ddf * a.e1 * a.e2 + df * a.e12,
  };
}

export const hdNeg = (a: HyperDual): HyperDual => ({ x: -a.x, e1: -a.e1, e2: -a.e2, e12: -a.e12 });

/** Reciprocal 1/a:  f=1/x, f'=-1/x², f''=2/x³. */
export const hdRecip = (a: HyperDual): HyperDual => {
  const x = a.x;
  return hdUnary(a, 1 / x, -1 / (x * x), 2 / (x * x * x));
};

export const hdDiv = (a: HyperDual, b: HyperDual): HyperDual => hdMul(a, hdRecip(b));

export const hdSin = (a: HyperDual): HyperDual =>
  hdUnary(a, Math.sin(a.x), Math.cos(a.x), -Math.sin(a.x));

export const hdCos = (a: HyperDual): HyperDual =>
  hdUnary(a, Math.cos(a.x), -Math.sin(a.x), -Math.cos(a.x));

export const hdExp = (a: HyperDual): HyperDual => {
  const e = Math.exp(a.x);
  return hdUnary(a, e, e, e);
};

// Domain-guarded: log/sqrt of a non-positive value would return NaN/±Infinity and poison the first- AND
// second-order derivatives for the rest of the tape. Clamp the domain to a tiny epsilon so an
// out-of-range input yields finite (saturated) values + gradients instead of NaN.
const HD_EPS = 1e-12;
export const hdLog = (a: HyperDual): HyperDual => {
  const x = a.x > HD_EPS ? a.x : HD_EPS;
  return hdUnary(a, Math.log(x), 1 / x, -1 / (x * x));
};

export const hdSqrt = (a: HyperDual): HyperDual => {
  const x = a.x > 0 ? a.x : 0;
  const s = Math.sqrt(x);
  const sg = s > HD_EPS ? s : HD_EPS;
  const xg = x > HD_EPS ? x : HD_EPS;
  // f=√x, f'=1/(2√x), f''=−1/(4·x·√x) — keep the exact formula, only guard the denominators.
  return hdUnary(a, s, 0.5 / sg, -0.25 / (sg * xg));
};

/** Power with a constant real exponent n:  f=xⁿ, f'=n·xⁿ⁻¹, f''=n(n-1)·xⁿ⁻². */
export const hdPow = (a: HyperDual, n: number): HyperDual =>
  hdUnary(a, Math.pow(a.x, n), n * Math.pow(a.x, n - 1), n * (n - 1) * Math.pow(a.x, n - 2));

export const hdTanh = (a: HyperDual): HyperDual => {
  const t = Math.tanh(a.x);
  const dt = 1 - t * t; // sech²
  const ddt = -2 * t * dt;
  return hdUnary(a, t, dt, ddt);
};

export const hdSigmoid = (a: HyperDual): HyperDual => {
  const s = 1 / (1 + Math.exp(-a.x));
  const ds = s * (1 - s);
  const dds = ds * (1 - 2 * s);
  return hdUnary(a, s, ds, dds);
};

/**
 * Evaluate `f` and its exact first and second derivatives at `x` in a single forward pass.
 * @returns `{ value: f(x), d1: f'(x), d2: f''(x) }`
 */
export function derivatives2(
  f: (h: HyperDual) => HyperDual,
  x: number,
): { value: number; d1: number; d2: number } {
  const r = f(hdVar(x));
  return { value: r.x, d1: r.e1, d2: r.e12 };
}
