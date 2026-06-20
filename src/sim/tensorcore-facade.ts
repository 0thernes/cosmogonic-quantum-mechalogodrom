/**
 * TENSORCORE FACADE — Metal/GEMM compute bias from Tsotchke mirrors/tensorcore.
 * Deterministic dot-product kernels for morph/quantum scaling (no Metal dep in browser sim).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** GEMM-style dot for n-dim vectors. O(n). */
export function metalGemmBias(
  a: Float32Array | number[],
  b: Float32Array | number[],
  n: number,
): number {
  const lim = Math.min(n, a.length, b.length);
  let s = 0;
  for (let i = 0; i < lim; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s / (lim || 1);
}

/** Scaled attention score ⟨q,k⟩/√d. O(d). */
export function attentionScore(q: Float32Array, k: Float32Array, dim: number): number {
  const d = Math.max(1, dim);
  let s = 0;
  for (let i = 0; i < Math.min(d, q.length, k.length); i++) s += (q[i] ?? 0) * (k[i] ?? 0);
  return s / Math.sqrt(d);
}

/** Compute bias for godform archetype TENSORCORE-METAL. O(1). */
export function tensorcoreMorphBias(chi: number, adDepth: number): number {
  return (chi / 16 + adDepth / 32) * 0.5;
}
