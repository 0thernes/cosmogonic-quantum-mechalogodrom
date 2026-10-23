/**
 * Pairwise quantum mutual information (src/math/qubit-pair-info.ts) — the math behind the observatory's
 * pairwise total-correlation readout. A Bell pair shares 2 bits, a pair in a GHZ state of at least three
 * qubits shares 1 bit despite being separable, and a product state shares nothing.
 */
import { describe, expect, test } from 'bun:test';
import {
  amplitudesFromBorn,
  pairIndex,
  pairwiseMutualInformation,
  qubitEntropyFromBloch,
} from '../src/math/qubit-pair-info';
import { mulberry32 } from '../src/math/rng';

const S = Math.SQRT1_2;
function basis(n: number, entries: [number, number, number?][]): [Float64Array, Float64Array] {
  const re = new Float64Array(1 << n);
  const im = new Float64Array(1 << n);
  for (const [i, r, m] of entries) {
    re[i] = r;
    im[i] = m ?? 0;
  }
  return [re, im];
}

describe('pairwise quantum mutual information', () => {
  test('a Bell pair on qubits 0,1 of three shares exactly 2 bits; the spectator shares none', () => {
    const [re, im] = basis(3, [
      [0b000, S],
      [0b011, S],
    ]);
    const pi = pairwiseMutualInformation(re, im);
    expect(pi.qubits).toBe(3);
    expect(pi.mutual[pairIndex(0, 1, 3)]).toBeCloseTo(2, 9);
    expect(pi.mutual[pairIndex(0, 2, 3)]).toBeCloseTo(0, 9);
    expect(pi.mutual[pairIndex(1, 2, 3)]).toBeCloseTo(0, 9);
    expect(Array.from(pi.single).map((v) => +v.toFixed(9))).toEqual([1, 1, 0]);
  });

  test('every pair of a GHZ state shares exactly 1 bit', () => {
    const [re, im] = basis(4, [
      [0b0000, S],
      [0b1111, S],
    ]);
    const pi = pairwiseMutualInformation(re, im);
    for (const v of pi.mutual) expect(v).toBeCloseTo(1, 9);
  });

  test('complex phases are respected: (|00⟩ + i|11⟩)/√2 on qubits 1,2 is still a full Bell pair', () => {
    const [re, im] = basis(3, [
      [0b000, S, 0],
      [0b110, 0, S],
    ]);
    const pi = pairwiseMutualInformation(re, im);
    expect(pi.mutual[pairIndex(1, 2, 3)]).toBeCloseTo(2, 9);
    expect(pi.mutual[pairIndex(0, 1, 3)]).toBeCloseTo(0, 9);
  });

  test('a product state shares no information between any pair', () => {
    // |+⟩ on qubit 0, |1⟩ on qubit 2, |0⟩ on qubit 1
    const [re, im] = basis(3, [
      [0b100, S],
      [0b101, S],
    ]);
    const pi = pairwiseMutualInformation(re, im);
    for (const v of pi.mutual) expect(v).toBeCloseTo(0, 9);
    for (const v of pi.single) expect(v).toBeCloseTo(0, 9);
  });

  test('random 6-qubit states stay in [0,2] bits, symmetric index order, deterministic', () => {
    const rng = mulberry32(2026);
    for (let trial = 0; trial < 5; trial++) {
      const re = new Float64Array(64);
      const im = new Float64Array(64);
      let norm = 0;
      for (let i = 0; i < 64; i++) {
        re[i] = rng() - 0.5;
        im[i] = rng() - 0.5;
        norm += re[i]! ** 2 + im[i]! ** 2;
      }
      norm = Math.sqrt(norm);
      for (let i = 0; i < 64; i++) {
        re[i] = re[i]! / norm;
        im[i] = im[i]! / norm;
      }
      const a = pairwiseMutualInformation(re, im);
      const b = pairwiseMutualInformation(re, im);
      expect(a.mutual).toHaveLength(15);
      expect(Array.from(a.mutual)).toEqual(Array.from(b.mutual));
      for (const v of a.mutual) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(2);
      }
    }
  });

  test('a full-rank complex reduced state matches its known spectrum and local-unitary invariance', () => {
    // Purify a Bell-diagonal state on qubits 0,2 using orthogonal environment states on 1,3.
    // Its marginals are I/2 and its spectrum is these four unequal probabilities.
    const weights = [0.4, 0.3, 0.2, 0.1];
    const bellStates = [
      [
        [0, 1],
        [5, 1],
      ],
      [
        [0, 1],
        [5, -1],
      ],
      [
        [1, 1],
        [4, 1],
      ],
      [
        [1, 1],
        [4, -1],
      ],
    ];
    const re = new Float64Array(16);
    const im = new Float64Array(16);
    for (let k = 0; k < 4; k++) {
      const environment = ((k & 1) << 1) | ((k & 2) << 2);
      for (const [state, sign] of bellStates[k]!)
        re[environment | state!] = sign! * Math.sqrt(weights[k]! / 2);
    }
    const expected = 2 + weights.reduce((sum, p) => sum + p * Math.log2(p), 0);
    const before = pairwiseMutualInformation(re, im);
    expect(before.mutual[pairIndex(0, 2, 4)]).toBeCloseTo(expected, 10);
    // Local Rx(0.73) produces complex off-diagonal density entries without changing the spectrum.
    const rotatedRe = new Float64Array(16);
    const rotatedIm = new Float64Array(16);
    for (let i = 0; i < 16; i++) {
      rotatedRe[i] = Math.cos(0.73 / 2) * re[i]!;
      rotatedIm[i] = -Math.sin(0.73 / 2) * re[i ^ 1]!;
    }
    const after = pairwiseMutualInformation(rotatedRe, rotatedIm);
    expect(after.single[0]).toBeCloseTo(1, 10);
    expect(after.single[2]).toBeCloseTo(1, 10);
    expect(after.mutual[pairIndex(0, 2, 4)]).toBeCloseTo(expected, 10);
  });

  test('invalid amplitudes, probabilities and phases cannot become plausible correlation values', () => {
    for (const re of [
      [NaN, 0],
      [Infinity, 0],
      [0, 0],
      [0.5, 0.5],
      [1.001, 0],
    ])
      expect(() => pairwiseMutualInformation(re, [0, 0])).toThrow(RangeError);
    expect(() => pairwiseMutualInformation([1, 0], [NaN, 0])).toThrow(RangeError);
    expect(() => pairwiseMutualInformation([1, 0], [0])).toThrow(RangeError);
    for (const probs of [
      [NaN, 0],
      [Infinity, 0],
      [-0.5, 1.5],
      [0, 0],
      [0.4, 0.4],
    ])
      expect(() => amplitudesFromBorn(probs, [0, 0])).toThrow(RangeError);
    const missingPhases: number[] = [];
    missingPhases.length = 2;
    for (const phase of [[0], [0, NaN], [0, Infinity], missingPhases])
      expect(() => amplitudesFromBorn([1, 0], phase)).toThrow(RangeError);
    for (const r of [NaN, Infinity, -1, 2])
      expect(() => qubitEntropyFromBloch(r)).toThrow(RangeError);
  });

  test('only bounded normalization roundoff is removed, without mutating inputs', () => {
    const scale = Math.sqrt(1 + 5e-10);
    const re = [S * scale, 0, 0, S * scale];
    const im = [0, 0, 0, 0];
    const before = re.slice();
    expect(pairwiseMutualInformation(re, im).mutual[0]).toBeCloseTo(2, 10);
    expect(re).toEqual(before);
    expect(im).toEqual([0, 0, 0, 0]);
    expect(qubitEntropyFromBloch(1 + 1e-12)).toBe(0);
  });

  test('pairIndex enumerates (0,1),(0,2),…,(n−2,n−1) without gaps and is order-free', () => {
    const n = 6;
    const seen: number[] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) seen.push(pairIndex(a, b, n));
    expect(seen).toEqual(Array.from({ length: 15 }, (_, i) => i));
    expect(pairIndex(4, 1, n)).toBe(pairIndex(1, 4, n));
  });

  test('single-qubit entropy from the Bloch length, and Born→amplitude reconstruction', () => {
    expect(qubitEntropyFromBloch(1)).toBeCloseTo(0, 12);
    expect(qubitEntropyFromBloch(0)).toBeCloseTo(1, 12);
    const amp = amplitudesFromBorn([0.5, 0.5], [0, Math.PI / 2]);
    expect(amp.re[0]).toBeCloseTo(S, 12);
    expect(amp.im[1]).toBeCloseTo(S, 12);
    expect(() => pairwiseMutualInformation([1, 0, 0], [0, 0, 0])).toThrow(RangeError);
  });
});
