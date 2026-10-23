/**
 * Pairwise quantum mutual information (src/math/qubit-pair-info.ts) — the math behind the observatory's
 * Q · ENTANGLEMENT readout. Pinned on states with known answers: a Bell pair shares 2 bits, every pair of
 * a GHZ state shares 1 bit, a product state shares nothing, and arbitrary states stay inside [0, 2].
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
