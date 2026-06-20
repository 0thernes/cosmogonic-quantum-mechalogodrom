/**
 * mps-svd.ts — REAL singular value decomposition + matrix-product-state bond
 * truncation (leaf, exclusive owner).
 *
 * Faithful TypeScript reimplementation of the tensor-network core of the Tsotchke
 * `moonlab` corpus (MIT, © tsotchke): `src/algorithms/tensor_network/tensor.c`
 * (bond-dimension SVD truncation) and `ca-mps.ts` (MPS low-rank compression).
 * This is the genuine math that retires the audit's #1 decorative lie — the
 * facade / `sim/moonlab-tensor.ts` "tensor contraction" that was a truncated
 * dot-product with `// no real SVD, for proxy`.
 *
 * The SVD is a deterministic ONE-SIDED JACOBI rotation sweep (Hestenes): pure,
 * NO `Rng`, NO `Date.now`, fixed pair-iteration order, fixed sweep cap, and a
 * fixed sign convention (first significant component of each left singular
 * vector is positive). Same input ⇒ same decomposition, every run (Manhattan:
 * determinism). Intended for the small bond matrices of a cognitive MPS (dims
 * capped at {@link MPS_MAX_DIM}); it is exact linear algebra, not an O(1) proxy.
 *
 * Refs: Golub & Van Loan, *Matrix Computations* §8.6 (one-sided Jacobi SVD);
 * Schollwöck, *The density-matrix renormalization group in the age of matrix
 * product states*, Ann. Phys. 326 (2011) — bond-χ truncation + Frobenius error.
 */

/** Dense row-major matrix. */
export interface Mat {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float64Array;
}

/** Largest matrix dimension supported (keeps the Jacobi sweep bounded + cheap). */
export const MPS_MAX_DIM = 64;

const SVD_TOL = 1e-14;
const SVD_MAX_SWEEPS = 60;

/** Build a zeroed rows×cols matrix. */
export function mat(rows: number, cols: number): Mat {
  return { rows, cols, data: new Float64Array(rows * cols) };
}

/** Build a matrix from a row-major array of rows (each row equal length). */
export function fromRows(rows: readonly (readonly number[])[]): Mat {
  const r = rows.length;
  const c = r > 0 ? rows[0]!.length : 0;
  const m = mat(r, c);
  for (let i = 0; i < r; i++) {
    const row = rows[i]!;
    for (let j = 0; j < c; j++) m.data[i * c + j] = row[j] ?? 0;
  }
  return m;
}

/** Frobenius norm √Σ aᵢⱼ². */
export function frobenius(A: Mat): number {
  let s = 0;
  for (let k = 0; k < A.data.length; k++) {
    const v = A.data[k]!;
    s += v * v;
  }
  return Math.sqrt(s);
}

/** Elementwise A − B (same shape assumed). */
export function matSub(A: Mat, B: Mat): Mat {
  const out = mat(A.rows, A.cols);
  for (let k = 0; k < out.data.length; k++) out.data[k] = A.data[k]! - B.data[k]!;
  return out;
}

/** Matrix product A·B. */
export function matMul(A: Mat, B: Mat): Mat {
  const out = mat(A.rows, B.cols);
  for (let i = 0; i < A.rows; i++) {
    for (let k = 0; k < A.cols; k++) {
      const a = A.data[i * A.cols + k]!;
      if (a === 0) continue;
      for (let j = 0; j < B.cols; j++) {
        const oi = i * out.cols + j;
        out.data[oi] = (out.data[oi] ?? 0) + a * (B.data[k * B.cols + j] ?? 0);
      }
    }
  }
  return out;
}

/**
 * Deterministic thin SVD A = U·diag(S)·Vᵀ via one-sided Jacobi, with singular
 * values sorted descending and a fixed sign convention. U is rows×n, S has
 * length n, V is n×n (n = A.cols). O(sweeps · m · n²); converges quadratically.
 */
export function svd(A: Mat): { U: Mat; S: number[]; V: Mat } {
  const m = A.rows;
  const n = A.cols;
  if (m > MPS_MAX_DIM || n > MPS_MAX_DIM) {
    throw new Error(`svd: dimension exceeds MPS_MAX_DIM=${MPS_MAX_DIM} (${m}×${n})`);
  }
  // Working copy whose columns are rotated toward mutual orthogonality.
  const W = Float64Array.from(A.data);
  const V = mat(n, n);
  for (let i = 0; i < n; i++) V.data[i * n + i] = 1;

  const col = (M: Float64Array, ld: number, r: number, j: number): number => M[r * ld + j]!;

  for (let sweep = 0; sweep < SVD_MAX_SWEEPS; sweep++) {
    let offDiag = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let alpha = 0;
        let beta = 0;
        let gamma = 0;
        for (let r = 0; r < m; r++) {
          const wp = col(W, n, r, p);
          const wq = col(W, n, r, q);
          alpha += wp * wp;
          beta += wq * wq;
          gamma += wp * wq;
        }
        offDiag = Math.max(offDiag, Math.abs(gamma) / (Math.sqrt(alpha * beta) + SVD_TOL));
        if (Math.abs(gamma) <= SVD_TOL * Math.sqrt(alpha * beta)) continue;
        // Jacobi rotation that diagonalizes the 2×2 Gram block.
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let r = 0; r < m; r++) {
          const wp = col(W, n, r, p);
          const wq = col(W, n, r, q);
          W[r * n + p] = c * wp - s * wq;
          W[r * n + q] = s * wp + c * wq;
        }
        for (let r = 0; r < n; r++) {
          const vp = col(V.data, n, r, p);
          const vq = col(V.data, n, r, q);
          V.data[r * n + p] = c * vp - s * vq;
          V.data[r * n + q] = s * vp + c * vq;
        }
      }
    }
    if (offDiag < SVD_TOL) break;
  }

  // Singular values = column norms of W; left vectors = normalized columns.
  const sigma: { val: number; idx: number }[] = [];
  for (let j = 0; j < n; j++) {
    let nrm = 0;
    for (let r = 0; r < m; r++) {
      const w = col(W, n, r, j);
      nrm += w * w;
    }
    sigma.push({ val: Math.sqrt(nrm), idx: j });
  }
  // Deterministic descending sort (tie-break on original column index).
  sigma.sort((a, b) => b.val - a.val || a.idx - b.idx);

  const U = mat(m, n);
  const S: number[] = Array.from({ length: n }, () => 0);
  const Vs = mat(n, n);
  for (let k = 0; k < n; k++) {
    const { val, idx } = sigma[k]!;
    S[k] = val;
    if (val > SVD_TOL) {
      for (let r = 0; r < m; r++) U.data[r * n + k] = col(W, n, r, idx) / val;
    }
    for (let r = 0; r < n; r++) Vs.data[r * n + k] = col(V.data, n, r, idx);
    // Sign convention: first significant U component positive.
    let pivot = 0;
    for (let r = 0; r < m; r++) {
      if (Math.abs(U.data[r * n + k]!) > 1e-9) {
        pivot = U.data[r * n + k]!;
        break;
      }
    }
    if (pivot < 0) {
      for (let r = 0; r < m; r++) U.data[r * n + k] = -U.data[r * n + k]!;
      for (let r = 0; r < n; r++) Vs.data[r * n + k] = -Vs.data[r * n + k]!;
    }
  }
  return { U, S, V: Vs };
}

/**
 * Real bond-χ MPS truncation: the best rank-χ approximation of A in Frobenius
 * norm (Eckart–Young), reconstructed from the top-χ singular triplets, plus the
 * exact truncation error √(Σ_{k>χ} σ_k²). This is the genuine tensor-network
 * bond-dimension compression — the thing the stub only gestured at.
 */
export function lowRankApprox(
  A: Mat,
  chi: number,
): { approx: Mat; truncationError: number; keptRank: number } {
  const { U, S, V } = svd(A);
  const n = A.cols;
  const k = Math.max(0, Math.min(chi, S.length));
  const approx = mat(A.rows, A.cols);
  for (let t = 0; t < k; t++) {
    const sigma = S[t]!;
    if (sigma <= SVD_TOL) continue;
    for (let i = 0; i < A.rows; i++) {
      const ui = U.data[i * n + t]! * sigma;
      if (ui === 0) continue;
      for (let j = 0; j < A.cols; j++) {
        const ai = i * A.cols + j;
        approx.data[ai] = (approx.data[ai] ?? 0) + ui * (V.data[j * n + t] ?? 0);
      }
    }
  }
  let dropped = 0;
  let kept = 0;
  for (let t = 0; t < S.length; t++) {
    const sigma = S[t]!;
    if (t < k && sigma > SVD_TOL) kept++;
    if (t >= k) dropped += sigma * sigma;
  }
  return { approx, truncationError: Math.sqrt(dropped), keptRank: kept };
}
