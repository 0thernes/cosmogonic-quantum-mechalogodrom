/**
 * mps-svd.test.ts — behavioral-oracle tests for the REAL moonlab tensor port
 * (src/math/mps-svd.ts). ADR-F stub-honesty: these assert properties that genuine
 * SVD / bond-truncation MUST satisfy and a truncated dot-product CANNOT fake —
 * exact reconstruction A = U·Σ·Vᵀ, descending non-negative singular values,
 * orthonormal singular vectors, exact rank-1 recovery, and the Eckart–Young
 * Frobenius truncation-error identity.
 */
import { describe, expect, test } from 'bun:test';
import {
  svd,
  lowRankApprox,
  fromRows,
  mat,
  matMul,
  matSub,
  frobenius,
  type Mat,
} from '../src/math/mps-svd';

const TOL = 1e-9;

function transpose(A: Mat): Mat {
  const out = mat(A.cols, A.rows);
  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < A.cols; j++) out.data[j * A.rows + i] = A.data[i * A.cols + j]!;
  }
  return out;
}

function diag(s: number[]): Mat {
  const n = s.length;
  const d = mat(n, n);
  for (let i = 0; i < n; i++) d.data[i * n + i] = s[i]!;
  return d;
}

function reconstruct(U: Mat, S: number[], V: Mat): Mat {
  return matMul(matMul(U, diag(S)), transpose(V));
}

const SAMPLE = fromRows([
  [4, 0, 1],
  [2, -3, 5],
  [1, 1, 0],
  [0, 2, -1],
]);

describe('SVD core', () => {
  test('reconstructs A = U·Σ·Vᵀ to machine precision', () => {
    const { U, S, V } = svd(SAMPLE);
    expect(frobenius(matSub(SAMPLE, reconstruct(U, S, V)))).toBeLessThan(TOL);
  });

  test('singular values are non-negative and sorted descending', () => {
    const { S } = svd(SAMPLE);
    for (const v of S) expect(v).toBeGreaterThanOrEqual(-TOL);
    for (let i = 1; i < S.length; i++) expect(S[i - 1]!).toBeGreaterThanOrEqual(S[i]! - TOL);
  });

  test('V is orthogonal (VᵀV = I)', () => {
    const { V } = svd(SAMPLE);
    const g = matMul(transpose(V), V);
    for (let i = 0; i < V.cols; i++) {
      for (let j = 0; j < V.cols; j++) {
        expect(Math.abs(g.data[i * V.cols + j]! - (i === j ? 1 : 0))).toBeLessThan(TOL);
      }
    }
  });

  test('left singular vectors of nonzero values are orthonormal (UᵀU block = I)', () => {
    const { U, S } = svd(SAMPLE);
    const g = matMul(transpose(U), U);
    const n = U.cols;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (S[i]! > 1e-7 && S[j]! > 1e-7) {
          expect(Math.abs(g.data[i * n + j]! - (i === j ? 1 : 0))).toBeLessThan(TOL);
        }
      }
    }
  });

  test('diagonal matrix → singular values are the sorted magnitudes', () => {
    const { S } = svd(
      fromRows([
        [1, 0],
        [0, 2],
      ]),
    );
    expect(Math.abs(S[0]! - 2)).toBeLessThan(TOL);
    expect(Math.abs(S[1]! - 1)).toBeLessThan(TOL);
  });

  test('deterministic: identical decomposition across runs', () => {
    const a = svd(SAMPLE);
    const b = svd(SAMPLE);
    expect(Array.from(a.U.data)).toEqual(Array.from(b.U.data));
    expect(a.S).toEqual(b.S);
    expect(Array.from(a.V.data)).toEqual(Array.from(b.V.data));
  });
});

describe('MPS bond truncation', () => {
  test('rank-1 matrix is recovered exactly at χ=1 (zero truncation error)', () => {
    // outer product [1,2,3]ᵀ · [1,1] → rank 1
    const A = fromRows([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    const { approx, truncationError, keptRank } = lowRankApprox(A, 1);
    expect(keptRank).toBe(1);
    expect(truncationError).toBeLessThan(TOL);
    expect(frobenius(matSub(A, approx))).toBeLessThan(TOL);
  });

  test('Eckart–Young: reported truncationError equals ‖A − A_χ‖_F', () => {
    for (const chi of [1, 2, 3]) {
      const { approx, truncationError } = lowRankApprox(SAMPLE, chi);
      expect(Math.abs(truncationError - frobenius(matSub(SAMPLE, approx)))).toBeLessThan(TOL);
    }
  });

  test('truncation error is monotone non-increasing in χ', () => {
    const e1 = lowRankApprox(SAMPLE, 1).truncationError;
    const e2 = lowRankApprox(SAMPLE, 2).truncationError;
    const e3 = lowRankApprox(SAMPLE, 3).truncationError;
    expect(e1).toBeGreaterThanOrEqual(e2 - TOL);
    expect(e2).toBeGreaterThanOrEqual(e3 - TOL);
    expect(e3).toBeLessThan(TOL); // full rank ⇒ exact
  });

  test('full-rank χ reproduces A (error → 0)', () => {
    const { approx } = lowRankApprox(SAMPLE, SAMPLE.cols);
    expect(frobenius(matSub(SAMPLE, approx))).toBeLessThan(TOL);
  });
});
