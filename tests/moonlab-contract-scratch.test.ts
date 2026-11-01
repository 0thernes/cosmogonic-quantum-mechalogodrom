import { describe, expect, test } from 'bun:test';
import { moonlabTensorContract } from '../src/sim/moonlab-tensor';
import { mat, matMul, lowRankApprox, frobenius, type Mat } from '../src/math/mps-svd';
import { clamp } from '../src/math/scalar';

// Pre-scratch form of moonlabTensorContract, verbatim (fresh matrices per call).
function liftShortVector(v: ArrayLike<number>): ArrayLike<number> {
  if (v.length !== 3) return v;
  const v0 = v[0] ?? 0;
  const v1 = v[1] ?? 0;
  const v2 = v[2] ?? 0;
  return [
    v0,
    v1 - v0 * 0.5,
    v2 - v1 * 0.5,
    v1,
    v2,
    v0 - v2 * 0.5,
    v2,
    v0 - v1 * 0.5,
    v1 - v2 * 0.5,
  ];
}
function squareSide(len: number): number {
  let d = Math.floor(Math.sqrt(Math.max(0, len)));
  if (d < 1) d = 1;
  return d > 64 ? 64 : d;
}
function packMatrix(a: ArrayLike<number>, rows: number, cols: number): Mat {
  const m = mat(rows, cols);
  const lim = rows * cols;
  for (let k = 0; k < lim; k++) m.data[k] = a[k] ?? 0;
  return m;
}
function refContract(a: ArrayLike<number>, b: ArrayLike<number>, chi = 4, bond = 2): number {
  const aL = liftShortVector(a);
  const bL = liftShortVector(b);
  const d = Math.max(2, squareSide(Math.min(aL.length, bL.length)));
  const bnd = Math.max(1, Math.min(bond, d));
  const C = matMul(packMatrix(aL, d, bnd), packMatrix(bL, bnd, d));
  const full = frobenius(C);
  if (full <= 1e-12) return 0;
  const { approx } = lowRankApprox(C, Math.max(1, Math.min(chi, d - 1)));
  return clamp(frobenius(approx) / (full + 1e-12), 0, 1);
}

describe('moonlabTensorContract with reused matrices', () => {
  test('bit-identical to the fresh-matrix form across lengths, chi, bond, in mixed order', () => {
    let s = 11;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    let n = 0;
    for (let rep = 0; rep < 40; rep++) {
      for (const [la, lb] of [
        [3, 3],
        [4, 4],
        [9, 9],
        [2, 2],
        [16, 9],
        [25, 25],
        [4, 3],
        [1, 1],
      ]) {
        const a = new Float32Array(la!).map(() => rnd() * 2 - 1);
        const b = Array.from({ length: lb! }, () => (rep % 7 === 0 ? 0 : rnd() * 2 - 1));
        for (const chi of [1, 2, 4]) {
          for (const bond of [1, 2, 3]) {
            expect(
              Object.is(moonlabTensorContract(a, b, chi, bond), refContract(a, b, chi, bond)),
            ).toBe(true);
            n++;
          }
        }
      }
    }
    expect(n).toBe(40 * 8 * 9);
  });
});
