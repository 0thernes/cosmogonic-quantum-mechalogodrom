import { describe, expect, test } from 'bun:test';
import { mat, svd, svdInto, lowRankApprox, lowRankApproxInto } from '../src/math/mps-svd';

describe('svdInto / lowRankApproxInto write the same numbers as svd / lowRankApprox', () => {
  test('bit-identical U, S, V and rank-χ approximation, reusing dirty buffers across shapes', () => {
    let s = 3;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    let cases = 0;
    for (const [m, n] of [
      [2, 2],
      [4, 2],
      [3, 3],
      [6, 4],
      [2, 2],
      [9, 5],
      [4, 4],
      [1, 1],
      [12, 12],
    ]) {
      const U = mat(m!, n!);
      const V = mat(n!, n!);
      const S = new Float64Array(n!);
      const out = mat(m!, n!);
      for (let rep = 0; rep < 6; rep++) {
        const A = mat(m!, n!);
        for (let k = 0; k < A.data.length; k++)
          A.data[k] = rep === 0 ? 0 : rep === 1 && k % 2 ? 0 : rnd();
        U.data.fill(9);
        V.data.fill(-9);
        S.fill(5);
        svdInto(A, U, S, V);
        const ref = svd(A);
        for (let k = 0; k < U.data.length; k++)
          expect(Object.is(U.data[k], ref.U.data[k])).toBe(true);
        for (let k = 0; k < V.data.length; k++)
          expect(Object.is(V.data[k], ref.V.data[k])).toBe(true);
        for (let k = 0; k < n!; k++) expect(Object.is(S[k], ref.S[k])).toBe(true);
        for (const chi of [1, 2, n!]) {
          out.data.fill(7);
          lowRankApproxInto(A, chi, out);
          const r = lowRankApprox(A, chi).approx;
          for (let k = 0; k < r.data.length; k++)
            expect(Object.is(out.data[k], r.data[k])).toBe(true);
        }
        cases++;
      }
    }
    expect(cases).toBe(54);
    expect(() => svdInto(mat(2, 3), mat(2, 3), new Float64Array(3), mat(3, 3))).toThrow();
  });
});
