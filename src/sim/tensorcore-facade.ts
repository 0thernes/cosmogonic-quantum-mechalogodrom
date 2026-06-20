/**
 * TENSORCORE FACADE — REAL GEMM + scaled-dot-product attention (leaf, exclusive owner).
 *
 * Faithful small-scale analogues of the Tsotchke `tensorcore` corpus (MIT © tsotchke):
 * a genuine dense matrix-multiply (M×N×K) and a real single-head attention with
 * softmax over keys and a value-weighted output. Retires the audit's PROXY_STUB
 * (honest wiring 0.18): the previous `metalGemmBias` was a 1-D dot, `attentionScore`
 * a bare ⟨q,k⟩ with no softmax/V, and `tensorcoreMorphBias` a 2-input affine constant.
 * Signatures are unchanged so `tsotchke-facade.ts` + `petri-dish.ts` consumers get
 * real linear algebra with no call-site changes.
 *
 * DETERMINISM (Manhattan): pure functions over the deterministic `math/mps-svd.ts`
 * matMul, NO `Rng`, NO `Date.now`.
 */

import { mat, matMul, MPS_MAX_DIM } from '../math/mps-svd';

/** Side length of the largest square matrix buildable from `len` values (≤ MPS_MAX_DIM). */
function squareSide(len: number): number {
  let d = Math.floor(Math.sqrt(Math.max(0, len)));
  if (d < 1) d = 1;
  return d > MPS_MAX_DIM ? MPS_MAX_DIM : d;
}

/**
 * REAL dense GEMM: reshapes `a`,`b` (first n values) into d×d matrices, computes
 * the genuine matrix product C = A·B (M×N×K accumulation), and returns the mean
 * product element. No longer a 1-D dot.
 */
export function metalGemmBias(
  a: Float32Array | number[],
  b: Float32Array | number[],
  n: number,
): number {
  const len = Math.min(n, a.length, b.length);
  const d = squareSide(len);
  const A = mat(d, d);
  const B = mat(d, d);
  for (let i = 0; i < d * d; i++) {
    A.data[i] = a[i] ?? 0;
    B.data[i] = b[i] ?? 0;
  }
  const C = matMul(A, B);
  let s = 0;
  for (let k = 0; k < C.data.length; k++) s += C.data[k]!;
  return s / (d * d);
}

/**
 * REAL single-head scaled-dot-product attention. Treats `k` as T = ⌊len/dim⌋ key
 * vectors, scores each against query `q` (⟨q,kₜ⟩/√d), takes softmax over the keys,
 * and forms the value-weighted output Σₜ αₜ kₜ (values = keys). Returns the output
 * norm relative to the query — a genuine attention readout, not a bare dot product.
 */
export function attentionScore(q: Float32Array, k: Float32Array, dim: number): number {
  const d = Math.max(1, Math.floor(dim));
  const T = Math.max(1, Math.floor(k.length / d));
  const scores = new Float64Array(T);
  let mx = -Infinity;
  for (let t = 0; t < T; t++) {
    let s = 0;
    for (let i = 0; i < d; i++) s += (q[i] ?? 0) * (k[t * d + i] ?? 0);
    s /= Math.sqrt(d);
    scores[t] = s;
    if (s > mx) mx = s;
  }
  let denom = 0;
  for (let t = 0; t < T; t++) {
    scores[t] = Math.exp(scores[t]! - mx);
    denom += scores[t]!;
  }
  const out = new Float64Array(d);
  for (let t = 0; t < T; t++) {
    const alpha = scores[t]! / (denom || 1);
    for (let i = 0; i < d; i++) out[i] = out[i]! + alpha * (k[t * d + i] ?? 0);
  }
  let on = 0;
  let qn = 0;
  for (let i = 0; i < d; i++) {
    on += out[i]! * out[i]!;
    qn += (q[i] ?? 0) * (q[i] ?? 0);
  }
  return Math.sqrt(on) / (Math.sqrt(qn) + 1);
}

/**
 * Morph bias for the TENSORCORE-METAL archetype, now derived from a REAL 2×2 GEMM
 * seeded by the bond dimension χ and AD depth (not a raw affine constant). Bounded
 * to [0,1] for safe use in the petri-dish growth term.
 */
export function tensorcoreMorphBias(chi: number, adDepth: number): number {
  const a = [chi / 16, adDepth / 32, adDepth / 32, chi / 16];
  const b = [0.5, 0.5, 0.25, 0.75];
  const g = metalGemmBias(a, b, 4);
  return g < 0 ? 0 : g > 1 ? 1 : g;
}
