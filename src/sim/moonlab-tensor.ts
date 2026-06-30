/**
 * MOONLAB TENSOR — REAL tensor-network / MPO kernels (leaf, exclusive owner).
 *
 * Every function here now performs genuine linear algebra through the real
 * one-sided-Jacobi SVD + Eckart–Young bond truncation in `math/mps-svd.ts`
 * (faithful port of the Tsotchke `moonlab` tensor-network core). This retires
 * the audit's #1 decorative lie — the previous "tensor contraction" that was a
 * truncated dot-product `dot / (1 + chi*0.01)`. The five exported symbols keep
 * their signatures, so `tsotchke-facade.ts` and every consumer (world.ts qgeMod,
 * super-mind reason/empowerment votes, etc.) now receive real bond-truncated
 * tensor physics with no call-site changes.
 *
 * DETERMINISM (Manhattan): pure functions over a deterministic SVD (fixed sweep
 * cap, fixed sign convention), NO `Rng`, NO `Date.now`. Outputs are bounded to
 * [0,1] (Frobenius-energy and entanglement-entropy ratios), so the small
 * additive perturbations they feed into the sim stay numerically safe.
 */

import { clamp } from '../math/scalar';
import { type Mat, mat, matMul, svd, lowRankApprox, frobenius, MPS_MAX_DIM } from '../math/mps-svd';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Side length of the largest square matrix we can build from `len` values (≤ MPS_MAX_DIM). */
function squareSide(len: number): number {
  let d = Math.floor(Math.sqrt(Math.max(0, len)));
  if (d < 1) d = 1;
  return d > MPS_MAX_DIM ? MPS_MAX_DIM : d;
}

/** Pack the first rows·cols values of `a` into a fresh row-major matrix. */
function packMatrix(a: ArrayLike<number>, rows: number, cols: number): Mat {
  const m = mat(rows, cols);
  const lim = rows * cols;
  for (let k = 0; k < lim; k++) m.data[k] = a[k] ?? 0;
  return m;
}

/** Tridiagonal 1-D hopping MPO transfer operator (diagonal 0.5, off-diagonals 1/(bond+1)). */
function transferOperator(d: number, bond: number): Mat {
  const t = mat(d, d);
  const w = 1 / (Math.max(1, bond) + 1);
  for (let i = 0; i < d; i++) {
    t.data[i * d + i] = 0.5;
    if (i > 0) t.data[i * d + (i - 1)] = w;
    if (i < d - 1) t.data[i * d + (i + 1)] = w;
  }
  return t;
}

/**
 * REAL bond-χ tensor contraction. Reshapes `a` → (d×bond) and `b` → (bond×d),
 * contracts over the shared bond index (matMul), then takes the Eckart–Young
 * rank-χ truncation of the product. Returns the retained Frobenius-energy ratio
 * in [0,1] — i.e. how much of the contraction survives bond dimension χ.
 */
export function moonlabTensorContract(
  a: number[] | Float32Array,
  b: number[] | Float32Array,
  chi = 4,
  bond = 2,
): number {
  const d = squareSide(Math.min(a.length, b.length));
  const bnd = Math.max(1, Math.min(bond, d));
  const A = packMatrix(a, d, bnd);
  const B = packMatrix(b, bnd, d);
  const C = matMul(A, B);
  const full = frobenius(C);
  if (full <= 1e-12) return 0;
  const { approx } = lowRankApprox(C, Math.max(1, Math.min(chi, d)));
  return clamp01(frobenius(approx) / (full + 1e-12));
}

/**
 * REAL entanglement-entropy "qualia" of `v`. Reshapes `v` into a square matrix,
 * takes its singular spectrum, and returns the normalized von-Neumann entropy
 * S = −Σ pₖ ln pₖ / ln(k) of the bond-χ-limited Schmidt coefficients
 * pₖ = σₖ²/Σσ² — 0 for a product (rank-1) state, 1 for a maximally entangled one.
 */
export function moonlabTensorQualia(v: number[], chi: number): number {
  // Pack into at least a 2x2 (packMatrix zero-pads) so length-3 inputs form a real [[v0,v1],[v2,0]]
  // and yield genuine entropy. The old `if (d < 2) return 0` made every length-<4 call return 0 — and
  // all 5 production call sites pass length-3 arrays, so the 'qualia tensor' coupling was inert (always
  // 0), violating "real math under every effect" (audit). The all-zero case is still caught by the
  // `total <= 1e-12` guard below.
  const d = Math.max(2, squareSide(v.length));
  const k = Math.max(2, Math.min(chi || 4, d));
  const { S } = svd(packMatrix(v, d, d));
  let total = 0;
  for (let i = 0; i < k; i++) total += S[i]! * S[i]!;
  if (total <= 1e-12) return 0;
  let entropy = 0;
  for (let i = 0; i < k; i++) {
    const p = (S[i]! * S[i]!) / total;
    if (p > 1e-12) entropy -= p * Math.log(p);
  }
  return clamp01(entropy / Math.log(k));
}

/**
 * REAL MPO step: applies a tridiagonal hopping transfer operator to the reshaped
 * `state`, truncates the result to bond dimension χ (Eckart–Young), and returns
 * the retained Frobenius-energy ratio in [0,1].
 */
export function moonlabMpoStep(state: Float32Array, bond: number, chi = 4): number {
  const d = squareSide(state.length);
  const S = packMatrix(state, d, d);
  const M = matMul(transferOperator(d, bond), S);
  const full = frobenius(M);
  if (full <= 1e-12) return 0;
  const { approx } = lowRankApprox(M, Math.max(1, Math.min(chi, d)));
  return clamp01(frobenius(approx) / (full + 1e-12));
}

/**
 * REAL bond-truncated MPO sweep. Applies the transfer operator, χ-truncates, and
 * writes the transformed amplitudes back into a same-length Float32Array
 * (clamped to [0,1]); values past the d² block pass through clamped.
 */
export function moonlabMpoApply(state: Float32Array, bond: number, chi = 4): Float32Array {
  const out = new Float32Array(state.length);
  const d = squareSide(state.length);
  const M = matMul(transferOperator(d, bond), packMatrix(state, d, d));
  const { approx } = lowRankApprox(M, Math.max(1, Math.min(chi, d)));
  const block = d * d;
  for (let i = 0; i < state.length; i++) {
    out[i] = clamp01(i < block ? approx.data[i]! : (state[i] ?? 0));
  }
  return out;
}

/** ULG ⊕ moonlab handoff: deterministic coupling of world-aliveness and tensor hybrid energy. */
export function ulgHandoff(aliveness: number, hybrid: number): number {
  return clamp01(aliveness * 0.7 + hybrid * 0.3);
}
