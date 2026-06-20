/**
 * Golden tests for the REAL CHSH Bell test — proves the entangled two-qubit
 * statevector violates the classical bound and reaches the Tsirelson bound,
 * which the old cos²-table stub was mathematically incapable of.
 */
import { describe, expect, test } from 'bun:test';
import { bellCorrelation, bellTestWithRng } from '../src/math/quantum-qrng-full';
import { mulberry32 } from '../src/math/rng';

describe('quantum-qrng-full: real CHSH Bell test', () => {
  test('aligned measurement (a=b) is perfectly correlated', () => {
    expect(Math.abs(bellCorrelation(0, 0) - 1)).toBeLessThan(1e-9);
  });

  test('E(θa,θb) = cos(θa − θb) for the Bell state', () => {
    expect(Math.abs(bellCorrelation(0, Math.PI / 4) - Math.cos(Math.PI / 4))).toBeLessThan(1e-9);
    expect(Math.abs(bellCorrelation(Math.PI / 2, 0) - Math.cos(Math.PI / 2))).toBeLessThan(1e-9);
  });

  test('S reaches the Tsirelson bound 2√2 ≈ 2.828 (real quantum violation)', () => {
    const r = bellTestWithRng(mulberry32(1));
    expect(r.violation).toBe(true);
    expect(r.S).toBeGreaterThan(2.7);
    expect(r.S).toBeLessThanOrEqual(2 * Math.SQRT2 + 1e-9);
  });

  test('deterministic — identical seed ⇒ identical S', () => {
    expect(bellTestWithRng(mulberry32(42)).S).toBe(bellTestWithRng(mulberry32(42)).S);
  });
});
