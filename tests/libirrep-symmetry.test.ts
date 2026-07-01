/**
 * LIBIRREP SYMMETRY — exact representation-theory checks (retires the former decorative placeholders).
 *
 * These pin the math to EXACT, textbook, falsifiable values: real Clebsch-Gordan / Wigner-d / spherical
 * harmonics, and the normalized SU(2) Weyl character — including the spinor sign (a 2π rotation of a
 * half-integer spin returns −1). A `cos()`/`sin()` stand-in cannot satisfy these; only the genuine math can.
 * Pure, deterministic — no rng/clock/DOM.
 */
import { describe, expect, test } from 'bun:test';
import {
  clebschGordan,
  wignerD,
  sphericalHarmonic,
  libirrepSymmetry,
} from '../src/math/libirrep-symmetry';

describe('libirrep symmetry — exact Clebsch-Gordan (delegated to the Racah routine)', () => {
  test('known angular-momentum coupling coefficients', () => {
    expect(clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 1)).toBeCloseTo(1, 9); // stretched state
    expect(clebschGordan(0.5, 0.5, 0.5, -0.5, 1, 0)).toBeCloseTo(1 / Math.SQRT2, 9);
    expect(clebschGordan(1, 0, 1, 0, 2, 0)).toBeCloseTo(Math.sqrt(2 / 3), 9);
    expect(clebschGordan(1, 0, 1, 0, 0, 0)).toBeCloseTo(-1 / Math.sqrt(3), 9);
  });
  test('selection rules zero out impossible couplings', () => {
    expect(clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 0)).toBe(0); // M ≠ m1+m2
    expect(clebschGordan(1, 0, 1, 0, 3, 0)).toBe(0); // J > j1+j2 (triangle)
  });
});

describe('libirrep symmetry — exact Wigner small-d', () => {
  test('spin-1/2 and spin-1 rotation elements', () => {
    for (const beta of [0.3, 1.1, 2.4, Math.PI / 2]) {
      expect(wignerD(0.5, 0.5, 0.5, beta)).toBeCloseTo(Math.cos(beta / 2), 9);
      expect(wignerD(0.5, 0.5, -0.5, beta)).toBeCloseTo(-Math.sin(beta / 2), 9);
      expect(wignerD(1, 0, 0, beta)).toBeCloseTo(Math.cos(beta), 9);
    }
  });
});

describe('libirrep symmetry — exact real spherical harmonics', () => {
  test('Y_0^0, Y_1^0, Y_2^0 match closed forms', () => {
    expect(sphericalHarmonic(0, 0, 1.0, 0.7)).toBeCloseTo(1 / (2 * Math.sqrt(Math.PI)), 9);
    for (const theta of [0.0, 0.6, Math.PI / 2, 2.5]) {
      expect(sphericalHarmonic(1, 0, theta, 0)).toBeCloseTo(
        Math.sqrt(3 / (4 * Math.PI)) * Math.cos(theta),
        9,
      );
      expect(sphericalHarmonic(2, 0, theta, 0)).toBeCloseTo(
        Math.sqrt(5 / (16 * Math.PI)) * (3 * Math.cos(theta) ** 2 - 1),
        9,
      );
    }
  });
  test('|m| > l vanishes', () => {
    expect(sphericalHarmonic(1, 2, 0.5, 0.5)).toBe(0);
  });
});

describe('libirrep symmetry — exact normalized SU(2) Weyl character (the wired faculty)', () => {
  test('trivial irrep (j=0) is identically 1', () => {
    for (const t of [0, 0.5, 2.0, 5.0, -3.0]) expect(libirrepSymmetry(0, t)).toBeCloseTo(1, 9);
  });
  test('spin-1/2 character equals cos(θ/2)', () => {
    for (const t of [0.4, 1.7, 3.0]) expect(libirrepSymmetry(1, t)).toBeCloseTo(Math.cos(t / 2), 9);
  });
  test('identity rotation gives full symmetry (=1) for every irrep', () => {
    for (const s of [0, 1, 2, 3, 4]) expect(libirrepSymmetry(s, 0)).toBeCloseTo(1, 9);
  });
  test('the spinor sign: a 2π rotation returns −1 for half-integer spin, +1 for integer spin', () => {
    expect(libirrepSymmetry(1, 2 * Math.PI)).toBeCloseTo(-1, 9); // j=1/2 spinor
    expect(libirrepSymmetry(3, 2 * Math.PI)).toBeCloseTo(-1, 9); // j=3/2 spinor
    expect(libirrepSymmetry(2, 2 * Math.PI)).toBeCloseTo(1, 9); // j=1 integer
    expect(libirrepSymmetry(1, 4 * Math.PI)).toBeCloseTo(1, 9); // 4π periodicity restores +1
  });
  test('bounded in [-1, 1] over a wide sweep of irreps and angles', () => {
    for (let s = 0; s <= 6; s++) {
      for (let i = 0; i < 400; i++) {
        const t = (i / 400) * 8 * Math.PI - 4 * Math.PI;
        const v = libirrepSymmetry(s, t);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
  test('deterministic: identical args → identical output', () => {
    expect(libirrepSymmetry(2, 3)).toBe(libirrepSymmetry(2, 3));
  });
});
