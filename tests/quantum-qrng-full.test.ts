/**
 * Golden tests for the deterministic CHSH state-vector reference calculation.
 * These prove model conformance at the canonical angles, not a physical Bell
 * experiment, nonlocality, physical entropy, or security.
 */
import { describe, expect, test } from 'bun:test';
import { QuantumRngFull, bellCorrelation, bellTestWithRng } from '../src/math/quantum-qrng-full';
import { mulberry32 } from '../src/math/rng';

describe('quantum-qrng-full: CHSH state-vector model conformance', () => {
  test('aligned measurement (a=b) is perfectly correlated', () => {
    expect(Math.abs(bellCorrelation(0, 0) - 1)).toBeLessThan(1e-9);
  });

  test('E(θa,θb) = cos(θa − θb) for the Bell state', () => {
    expect(Math.abs(bellCorrelation(0, Math.PI / 4) - Math.cos(Math.PI / 4))).toBeLessThan(1e-9);
    expect(Math.abs(bellCorrelation(Math.PI / 2, 0) - Math.cos(Math.PI / 2))).toBeLessThan(1e-9);
  });

  test('modelled S reaches 2√2 and remains explicitly non-physical', () => {
    const r = bellTestWithRng(mulberry32(1));
    expect(r.violation).toBe(true);
    expect(r.modelConformance).toBe(true);
    expect(r.physicalExperiment).toBe(false);
    // S is analytically EXACT (Born-rule correlations at the canonical CHSH angles, seed-independent) — pin
    // it TIGHT to the Tsirelson bound. A loose `> 2.7` let a wrong measurement-angle regression (e.g.
    // bp = −π/3 → S ≈ 2.780) pass while the "reaches 2√2" claim was already false. 12-digit tolerance is
    // safe (the implementation lands within ~1 ULP) and catches any angle/sign break.
    expect(r.S).toBeCloseTo(2 * Math.SQRT2, 12);
  });

  test('deterministic — identical seed ⇒ identical S', () => {
    expect(bellTestWithRng(mulberry32(42)).S).toBe(bellTestWithRng(mulberry32(42)).S);
  });

  test('preserves stream/snapshot compatibility and snapshotFull captures post-entropy state', () => {
    const q = new QuantumRngFull(mulberry32(0x51a7));
    expect(q.stream()()).toBeGreaterThanOrEqual(0);
    const before = q.snapshot();
    const full = q.snapshotFull();
    expect(full.draws).toBe(before.draws + 64);
    expect(full.modelVersion).toBe('v3.0.1-deterministic-classical-statevector-adaptation');
    expect(full.bell.physicalExperiment).toBe(false);
  });
});
