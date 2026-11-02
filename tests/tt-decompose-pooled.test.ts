import { describe, expect, test } from 'bun:test';
import { fromRows, mat, svd, svdInto, type Mat } from '../src/math/mps-svd';
import { TsotchkeDeepWireController } from '../src/sim/tsotchke-deep-wire';

// Verbatim pre-pooling moonlabTTDecompose.
function refTT(tensor: Float32Array, maxRank = 8) {
  const len = tensor.length;
  if (len <= 1) return { cores: [tensor.slice()], ranks: [1], truncationError: 0 };
  let r = Math.min(Math.floor(Math.sqrt(len)), 64);
  if (r < 1) r = 1;
  const c = Math.ceil(len / r);
  const rows: number[][] = [];
  for (let i = 0; i < r; i++) {
    const row: number[] = Array.from({ length: c }, () => 0);
    for (let j = 0; j < c; j++) {
      const idx = i * c + j;
      row[j] = idx < len ? (tensor[idx] ?? 0) : 0;
    }
    rows.push(row);
  }
  const A: Mat = fromRows(rows);
  const { U, S, V } = svd(A);
  const chi = Math.max(1, Math.min(maxRank, S.length));
  const core0 = new Float32Array(r * chi);
  const core1 = new Float32Array(chi * c);
  for (let t = 0; t < chi; t++) {
    const root = Math.sqrt(Math.max(0, S[t] ?? 0));
    for (let i = 0; i < r; i++) core0[i * chi + t] = (U.data[i * S.length + t] ?? 0) * root;
    for (let j = 0; j < c; j++) core1[t * c + j] = root * (V.data[j * S.length + t] ?? 0);
  }
  let kept = 0;
  let total = 0;
  for (let t = 0; t < S.length; t++) {
    const e = (S[t] ?? 0) * (S[t] ?? 0);
    total += e;
    if (t < chi) kept += e;
  }
  const truncationError = total > 0 ? Math.sqrt(Math.max(0, total - kept) / total) : 0;
  return { cores: [core0, core1], ranks: [chi], truncationError };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

describe('pooled TT decomposition', () => {
  test('svdInto on wide and square matrices matches svd() bit for bit, with dirty buffers', () => {
    const rnd = rng(7);
    for (let m = 1; m <= 9; m++)
      for (let n = m; n <= 12; n++) {
        const A = mat(m, n);
        for (let i = 0; i < A.data.length; i++) A.data[i] = rnd();
        const want = svd(A);
        const U = m < n ? mat(m, m) : mat(m, n);
        const V = m < n ? mat(n, m) : mat(n, n);
        U.data.fill(9);
        V.data.fill(9);
        const S = new Float64Array(Math.min(m, n)).fill(9);
        svdInto(A, U, S, V);
        expect(Array.from(U.data)).toEqual(Array.from(want.U.data));
        expect(Array.from(V.data)).toEqual(Array.from(want.V.data));
        expect(Array.from(S)).toEqual(want.S);
      }
  });

  test('decomposeTT equals the pre-pooling reference across sizes and ranks', () => {
    const ctl = new TsotchkeDeepWireController();
    const rnd = rng(11);
    for (const len of [1, 2, 3, 5, 16, 17, 30, 64, 100, 257, 1000, 4096])
      for (const rank of [1, 3, 8, 70]) {
        const t = new Float32Array(len);
        for (let i = 0; i < len; i++) t[i] = rnd();
        const got = ctl.decomposeTT(t, rank);
        const want = refTT(t, rank);
        expect(got.ranks).toEqual(want.ranks);
        expect(Object.is(got.truncationError, want.truncationError)).toBe(true);
        expect(got.cores.length).toBe(want.cores.length);
        for (let k = 0; k < want.cores.length; k++)
          expect(Array.from(got.cores[k]!)).toEqual(Array.from(want.cores[k]!));
      }
  });
});
