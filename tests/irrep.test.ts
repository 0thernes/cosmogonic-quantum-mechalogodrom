/**
 * irrep.test.ts — behavioral-oracle tests for the REAL libirrep port (src/math/irrep.ts).
 *
 * These are ADR-F "stub-honesty" oracles: properties that genuine representation
 * theory MUST satisfy and that a modular-arithmetic stub CANNOT fake — Wigner-d
 * unitarity, the identity rotation, Clebsch–Gordan orthonormality, selection
 * rules, and tabulated reference values. If `irrep.ts` ever regresses to a proxy,
 * these fail loudly.
 */
import { describe, expect, test } from 'bun:test';
import {
  wignerSmallD,
  clebschGordan,
  isValidProjection,
  irrepMultiplicity,
  wigner6j,
  wigner9j,
  IRREP_J_MAX,
} from '../src/math/irrep';

const TOL = 1e-10;

describe('Wigner small-d rotation matrix', () => {
  test('d^j(0) = identity (δ_{m′m})', () => {
    for (const j of [0.5, 1, 1.5, 2, 3]) {
      for (let mp = -j; mp <= j; mp += 1) {
        for (let m = -j; m <= j; m += 1) {
          const expected = mp === m ? 1 : 0;
          expect(Math.abs(wignerSmallD(j, mp, m, 0) - expected)).toBeLessThan(TOL);
        }
      }
    }
  });

  test('rows are orthonormal at arbitrary β (unitarity: Σ_m d_{m′m} d_{m″m} = δ_{m′m″})', () => {
    const beta = Math.PI / 3;
    for (const j of [0.5, 1, 1.5, 2]) {
      for (let mp = -j; mp <= j; mp += 1) {
        for (let mpp = -j; mpp <= j; mpp += 1) {
          let dot = 0;
          for (let m = -j; m <= j; m += 1) {
            dot += wignerSmallD(j, mp, m, beta) * wignerSmallD(j, mpp, m, beta);
          }
          expect(Math.abs(dot - (mp === mpp ? 1 : 0))).toBeLessThan(TOL);
        }
      }
    }
  });

  test('matches tabulated spin-½ rotation: d^{1/2}_{++} = cos(β/2), d^{1/2}_{+-} = −sin(β/2)', () => {
    const beta = 0.7;
    expect(Math.abs(wignerSmallD(0.5, 0.5, 0.5, beta) - Math.cos(beta / 2))).toBeLessThan(TOL);
    expect(Math.abs(wignerSmallD(0.5, 0.5, -0.5, beta) + Math.sin(beta / 2))).toBeLessThan(TOL);
    expect(Math.abs(wignerSmallD(0.5, -0.5, 0.5, beta) - Math.sin(beta / 2))).toBeLessThan(TOL);
  });

  test('matches tabulated spin-1: d^1_{00} = cos β', () => {
    const beta = 1.1;
    expect(Math.abs(wignerSmallD(1, 0, 0, beta) - Math.cos(beta))).toBeLessThan(TOL);
  });

  test('determinism: same inputs ⇒ identical output', () => {
    expect(wignerSmallD(2, 1, -1, 0.9)).toBe(wignerSmallD(2, 1, -1, 0.9));
  });
});

describe('Clebsch–Gordan coefficients', () => {
  test('tabulated singlet/triplet values (Condon–Shortley)', () => {
    // |1,1⟩ = |↑↑⟩
    expect(Math.abs(clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 1) - 1)).toBeLessThan(TOL);
    // ⟨½ ½; ½ −½ | 1 0⟩ = 1/√2 ;  ⟨½ ½; ½ −½ | 0 0⟩ = 1/√2
    expect(Math.abs(clebschGordan(0.5, 0.5, 0.5, -0.5, 1, 0) - 1 / Math.SQRT2)).toBeLessThan(TOL);
    expect(Math.abs(clebschGordan(0.5, 0.5, 0.5, -0.5, 0, 0) - 1 / Math.SQRT2)).toBeLessThan(TOL);
    // ⟨½ −½; ½ ½ | 0 0⟩ = −1/√2 (antisymmetric singlet)
    expect(Math.abs(clebschGordan(0.5, -0.5, 0.5, 0.5, 0, 0) + 1 / Math.SQRT2)).toBeLessThan(TOL);
  });

  test('selection rules: zero unless M = m₁+m₂ and |j₁−j₂| ≤ J ≤ j₁+j₂', () => {
    expect(clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 0)).toBe(0); // M ≠ m₁+m₂
    expect(clebschGordan(0.5, 0.5, 0.5, 0.5, 2, 1)).toBe(0); // J > j₁+j₂
    expect(clebschGordan(1, 0, 1, 0, 0, 0)).not.toBe(0); // valid → nonzero
  });

  test('orthonormality over m₁ at fixed M: Σ ⟨..|J M⟩⟨..|J′ M⟩ = δ_{JJ′}', () => {
    const j1 = 1;
    const j2 = 1;
    const M = 0;
    for (const J of [0, 1, 2]) {
      for (const Jp of [0, 1, 2]) {
        let s = 0;
        for (let m1 = -j1; m1 <= j1; m1 += 1) {
          const m2 = M - m1;
          s += clebschGordan(j1, m1, j2, m2, J, M) * clebschGordan(j1, m1, j2, m2, Jp, M);
        }
        expect(Math.abs(s - (J === Jp ? 1 : 0))).toBeLessThan(TOL);
      }
    }
  });

  test('full normalization: Σ_{m₁m₂} ⟨..|J M⟩² = 1 for a valid (J,M)', () => {
    const j1 = 1.5;
    const j2 = 1;
    const J = 2.5;
    const M = 0.5;
    let s = 0;
    for (let m1 = -j1; m1 <= j1; m1 += 1) {
      for (let m2 = -j2; m2 <= j2; m2 += 1) {
        const cg = clebschGordan(j1, m1, j2, m2, J, M);
        s += cg * cg;
      }
    }
    expect(Math.abs(s - 1)).toBeLessThan(TOL);
  });
});

describe('helpers', () => {
  test('isValidProjection enforces |m| ≤ j and integer (j−m)', () => {
    expect(isValidProjection(1, 0)).toBe(true);
    expect(isValidProjection(0.5, 0.5)).toBe(true);
    expect(isValidProjection(1, 2)).toBe(false);
    expect(isValidProjection(1, 0.5)).toBe(false); // non-integer j−m
  });

  test('irrepMultiplicity saturates to a multiple of the irrep dimension (2j+1)', () => {
    expect(irrepMultiplicity(1, 5) % 3).toBe(0); // dim 3
    expect(irrepMultiplicity(0.5, 4) % 2).toBe(0); // dim 2
    expect(irrepMultiplicity(2, 1)).toBeGreaterThanOrEqual(1);
  });

  test('IRREP_J_MAX keeps factorials exact (sanity)', () => {
    expect(IRREP_J_MAX).toBeGreaterThanOrEqual(4);
    expect(wignerSmallD(IRREP_J_MAX + 1, 0, 0, 0.5)).toBe(0); // out of range → 0
  });
});

describe('Wigner 6j / 9j recoupling symbols (Racah)', () => {
  // Tabulated reference values (Edmonds; Varshalovich tables).
  test('tabulated 6j reference values', () => {
    expect(Math.abs(wigner6j(1, 1, 1, 1, 1, 1) - 1 / 6)).toBeLessThan(TOL);
    expect(Math.abs(wigner6j(2, 2, 2, 2, 2, 2) - -3 / 70)).toBeLessThan(TOL);
    // {a b 0; c d e} closed form ⇒ {1 1 0;1 1 1} = (−1)^(1+1+1)/√((2·1+1)(2·1+1)) = −1/3
    expect(Math.abs(wigner6j(1, 1, 0, 1, 1, 1) - -1 / 3)).toBeLessThan(TOL);
  });

  test('6j stays exact at large j (log-space; regression for the j>=7 factorial-overflow bug)', () => {
    // {j j j; j j j} at the top of the supported range. The old linear-factorial path overflowed the FACT
    // table (the Racah sum needs ~33! at j=8) and silently dropped terms -> a 28%-off value at j=7 and a
    // wrong-sign ~0 at j=8. Reference values (exact Racah, cross-checked against BigInt rationals):
    expect(Math.abs(wigner6j(7, 7, 7, 7, 7, 7) - 0.00854965)).toBeLessThan(1e-7);
    expect(Math.abs(wigner6j(8, 8, 8, 8, 8, 8) - -0.01265208)).toBeLessThan(1e-7);
    // Non-negligible + correctly signed (the bug returned ~4e-12).
    expect(wigner6j(8, 8, 8, 8, 8, 8)).toBeLessThan(-1e-3);
  });

  test('6j is invariant under column permutation (swap cols 1↔2)', () => {
    const a = wigner6j(1, 2, 2, 2, 1, 1);
    const b = wigner6j(2, 1, 2, 1, 2, 1);
    expect(Math.abs(a - b)).toBeLessThan(TOL);
  });

  test('6j vanishes when a triangle rule fails', () => {
    // (j1 j2 j3) = (1,1,5) violates the triangle |j1−j2|≤j3≤j1+j2.
    expect(wigner6j(1, 1, 5, 1, 1, 1)).toBe(0);
  });

  test('6j returns 0 above IRREP_J_MAX (range guard)', () => {
    expect(wigner6j(IRREP_J_MAX + 1, 1, 1, 1, 1, 1)).toBe(0);
  });

  test('9j is finite, real, and uses the 6j sum (no ±0.1 stub)', () => {
    const v = wigner9j(1, 1, 2, 1, 1, 2, 2, 2, 2);
    expect(Number.isFinite(v)).toBe(true);
    // The discredited stub returned ±0.1 for any parity-even sum; the real value here is small & ≠ 0.1.
    expect(Math.abs(Math.abs(v) - 0.1)).toBeGreaterThan(1e-3);
    // {1 1 1;1 1 1;1 1 1} = 0 exactly (known).
    expect(Math.abs(wigner9j(1, 1, 1, 1, 1, 1, 1, 1, 1))).toBeLessThan(TOL);
  });

  test('9j vanishes when no valid intermediate x exists', () => {
    // Choose triangles with empty overlap for x.
    expect(wigner9j(0, 0, 0, 0, 0, 0, 3, 3, 0)).toBe(0);
  });
});
