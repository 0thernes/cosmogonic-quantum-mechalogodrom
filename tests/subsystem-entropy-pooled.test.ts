import { describe, expect, test } from 'bun:test';
import { subsystemLinearEntropy } from '../src/sim/integrated-information';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Pre-pooling form (fresh relabel arrays per call), verbatim. */
function refSle(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  nQubits: number,
  aMask: number,
): number {
  const aBits: number[] = [];
  const bBits: number[] = [];
  for (let q = 0; q < nQubits; q++) {
    if ((aMask & (1 << q)) !== 0) aBits.push(q);
    else bBits.push(q);
  }
  const dimA = 1 << aBits.length;
  const dimB = 1 << bBits.length;
  if (dimA < 2) return 0; // empty A side carries no entanglement
  // Relabel amplitudes into M[a][b] = ψ_{a,b} (a indexes A, b indexes B).
  const mRe = new Float64Array(dimA * dimB);
  const mIm = new Float64Array(dimA * dimB);
  const dim = 1 << nQubits;
  for (let g = 0; g < dim; g++) {
    let a = 0;
    for (let t = 0; t < aBits.length; t++) if ((g & (1 << (aBits[t] ?? 0))) !== 0) a |= 1 << t;
    let b = 0;
    for (let t = 0; t < bBits.length; t++) if ((g & (1 << (bBits[t] ?? 0))) !== 0) b |= 1 << t;
    mRe[a * dimB + b] = re[g] ?? 0;
    mIm[a * dimB + b] = im[g] ?? 0;
  }
  // purity = Tr ρ_A² = Σ_{a,a'} |Σ_b M[a][b]·conj(M[a'][b])|².
  let purity = 0;
  for (let a = 0; a < dimA; a++) {
    for (let ap = 0; ap < dimA; ap++) {
      let rr = 0;
      let ii = 0;
      const aoff = a * dimB;
      const apoff = ap * dimB;
      for (let b = 0; b < dimB; b++) {
        const xr = mRe[aoff + b] ?? 0;
        const xi = mIm[aoff + b] ?? 0;
        const yr = mRe[apoff + b] ?? 0;
        const yi = mIm[apoff + b] ?? 0;
        rr += xr * yr + xi * yi; // Re(x·conj(y))
        ii += xi * yr - xr * yi; // Im(x·conj(y))
      }
      purity += rr * rr + ii * ii;
    }
  }
  const sl = (dimA / (dimA - 1)) * (1 - purity);
  return clamp01(sl);
}

describe('subsystemLinearEntropy with reused relabel buffers', () => {
  test('bit-identical to the fresh-array form across sizes and masks, in mixed call order', () => {
    let s = 5;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    let n = 0;
    for (const nq of [1, 2, 3, 6, 4, 8, 2, 5]) {
      const dim = 1 << nq;
      const re = Array.from({ length: dim }, () => rnd() - 0.5);
      const im = Array.from({ length: dim }, () => rnd() - 0.5);
      for (let mask = 0; mask < dim; mask++) {
        expect(Object.is(subsystemLinearEntropy(re, im, nq, mask), refSle(re, im, nq, mask))).toBe(
          true,
        );
        n++;
      }
    }
    expect(n).toBe(2 + 4 + 8 + 64 + 16 + 256 + 4 + 32);
  });
});
