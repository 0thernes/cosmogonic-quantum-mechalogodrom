/**
 * Golden tests for the irrep-symmetry leaf — proves it now computes REAL
 * Clebsch–Gordan / Wigner values (delegating to math/irrep.ts), not the old
 * modular-arithmetic stub. Canonical reference values from Edmonds / Varshalovich.
 */
import { describe, expect, test } from 'bun:test';
import {
  libirrepClebsch,
  libirrepSymmetry,
  libirrepWigner,
  su2Dimension,
  symmetryModes,
} from '../src/sim/irrep-symmetry';

const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

describe('irrep-symmetry: real Clebsch–Gordan', () => {
  test('⟨1 0; 1 0 | 2 0⟩ = √(2/3)', () => {
    // m1 = snap(1,0)=0, m2 = snap(1,0)=0, J = 2, M = 0
    expect(close(libirrepClebsch(1, 1, 0), Math.sqrt(2 / 3))).toBe(true);
  });

  test('⟨½ ½; ½ −½ | 1 0⟩ = 1/√2 (spin-½ coupling)', () => {
    // m1 = snap(0.5,0.5)=+0.5, m2 = snap(0.5,0)=−0.5, J = 1, M = 0
    expect(close(libirrepClebsch(0.5, 0.5, 0.5), 1 / Math.SQRT2)).toBe(true);
  });

  test('coefficients are bounded magnitudes in [0,1]', () => {
    for (let j1 = 0; j1 <= 4; j1++) {
      for (let j2 = 0; j2 <= 4; j2++) {
        for (let m = -4; m <= 4; m++) {
          const c = libirrepClebsch(j1, j2, m);
          expect(c >= 0 && c <= 1 + 1e-12).toBe(true);
        }
      }
    }
  });
});

describe('irrep-symmetry: real Wigner small-d', () => {
  test('d^j_{jj}(0) = 1 ⇒ base + 0.1', () => {
    expect(close(libirrepWigner(1, 0, 0), 0.1)).toBe(true);
    expect(close(libirrepWigner(3, 0, 0), 0.1)).toBe(true);
  });

  test('d^j_{jj}(π/2) = 2^{-j} (real reduced rotation element)', () => {
    // idx 12 → β = π/2 (angle range is [0,π)); d^2_{22}(π/2) = cos(π/4)^4 = 0.25
    expect(close(libirrepWigner(2, 12, 0.5), 0.5 + 0.1 * 0.25)).toBe(true);
  });

  test('monotone decrease in β over the first quarter turn', () => {
    const a = libirrepWigner(2, 0, 0); // β = 0    → 0.1
    const b = libirrepWigner(2, 3, 0); // β = π/8
    const c = libirrepWigner(2, 6, 0); // β = π/4
    expect(a > b && b > c).toBe(true);
  });
});

describe('irrep-symmetry: SU(2) dimension + multiplicity', () => {
  test('su2Dimension = 2⌊j⌋+1', () => {
    expect(su2Dimension(0)).toBe(1);
    expect(su2Dimension(1)).toBe(3);
    expect(su2Dimension(2)).toBe(5);
    expect(su2Dimension(0.5)).toBe(1); // floors
  });

  test('libirrepSymmetry saturates at multiples of (2j+1)', () => {
    expect(libirrepSymmetry(1, 10)).toBe(9); // dim 3, round(10/3)=3 → 9
    expect(libirrepSymmetry(2, 12)).toBe(10); // dim 5, round(12/5)=2 → 10
  });

  test('symmetryModes gates dimension by chaos', () => {
    expect(symmetryModes(1, 1)).toBe(3);
    expect(symmetryModes(1, 0)).toBe(1);
  });
});

describe('irrep-symmetry: determinism', () => {
  test('identical inputs ⇒ identical outputs', () => {
    expect(libirrepClebsch(2, 1, 1)).toBe(libirrepClebsch(2, 1, 1));
    expect(libirrepWigner(3, 7, 0.2)).toBe(libirrepWigner(3, 7, 0.2));
  });
});
