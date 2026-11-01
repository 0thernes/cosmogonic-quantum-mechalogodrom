import { describe, expect, test } from 'bun:test';
import { MPS_MAX_DIM, svd, type Mat } from '../src/math/mps-svd';

const SVD_TOL = 1e-14;
const SVD_MAX_SWEEPS = 60;
const mat = (rows: number, cols: number): Mat => ({
  rows,
  cols,
  data: new Float64Array(rows * cols),
});

/** The pre-pooling svd (object sigma list + Array#sort), kept verbatim as the bit-exact reference. */
function refSvd(A: Mat): { U: Mat; S: number[]; V: Mat } {
  const m = A.rows;
  const n = A.cols;
  if (m > MPS_MAX_DIM || n > MPS_MAX_DIM) {
    throw new Error(`svd: dimension exceeds MPS_MAX_DIM=${MPS_MAX_DIM} (${m}×${n})`);
  }
  if (m < n) {
    // Wide matrix (rows < cols): decompose Aᵀ (n × m, tall) = U_t · diag(S) · V_tᵀ,
    // so A = V_t · diag(S) · U_tᵀ with orthonormal columns on both sides.
    const AT = mat(n, m);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        AT.data[j * m + i] = A.data[i * n + j]!;
      }
    }
    const { U: Ut, S, V: Vt } = refSvd(AT);
    return { U: Vt, S, V: Ut };
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

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++)
    if (!Object.is(a[i], b[i])) throw new Error(`index ${i}: ${a[i]} vs ${b[i]}`);
};

describe('svd without per-call sort objects', () => {
  test('U, S, V are bit-identical to the reference across shapes, ties, zero and repeated columns', () => {
    let s = 99;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    let cases = 0;
    for (let rows = 1; rows <= 9; rows++)
      for (let cols = 1; cols <= 9; cols++)
        for (let v = 0; v < 6; v++) {
          const A = mat(rows, cols);
          for (let i = 0; i < A.data.length; i++)
            A.data[i] = v === 0 ? 0 : v === 1 ? (i % 3) - 1 : rnd() * 2 - 1;
          if (v === 2 && cols > 1)
            for (let r = 0; r < rows; r++) A.data[r * cols + 1] = A.data[r * cols]!; // repeated column
          if (v === 3) for (let r = 0; r < rows; r++) A.data[r * cols + cols - 1] = 0; // zero column
          if (v === 4)
            for (let i = 0; i < A.data.length; i++) A.data[i] = Math.round(A.data[i]! * 2) / 2; // ties
          const a = svd(A);
          const b = refSvd(A);
          same(a.S, b.S);
          same(a.U.data, b.U.data);
          same(a.V.data, b.V.data);
          cases++;
        }
    const big = mat(MPS_MAX_DIM, 20);
    for (let i = 0; i < big.data.length; i++) big.data[i] = rnd() - 0.5;
    const a = svd(big),
      b = refSvd(big);
    same(a.S, b.S);
    same(a.U.data, b.U.data);
    expect(cases).toBe(486);
  });
});
