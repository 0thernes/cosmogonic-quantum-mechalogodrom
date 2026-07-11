/**
 * ESHKOL RNG COMPATIBILITY ADAPTER — proves the bounded classical state-vector adaptation is
 * deterministic from a seed, NaN-free, range-correct, and statistically sane. It is neither a direct
 * upstream port nor a physical entropy/security claim.
 * Experiments (a falsifiable claim each), per the Physicist's law 4.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { EshkolQrng, ESHKOL_QUBITS } from '../src/math/eshkol-qrng';

describe('EshkolQrng — deterministic state-vector compatibility adapter', () => {
  test('zero-draw telemetry reports insufficient evidence instead of maximum entropy', () => {
    const s = new EshkolQrng(mulberry32(0x51a7)).snapshot();
    expect(s.draws).toBe(0);
    expect(s.health.status).toBe('insufficient-data');
    expect(s.health.sampleBits).toBe(0);
    expect(s.entropyEstimate).toBe(0);
  });

  test('same seed ⇒ identical bitstream (the seeded-determinism deviation holds)', () => {
    const a = new EshkolQrng(mulberry32(12345));
    const b = new EshkolQrng(mulberry32(12345));
    for (let i = 0; i < 500; i++) expect(a.nextU64()).toBe(b.nextU64());
  });

  test('different seeds ⇒ different streams (the seed actually seeds)', () => {
    const a = new EshkolQrng(mulberry32(1));
    const b = new EshkolQrng(mulberry32(2));
    let differ = 0;
    for (let i = 0; i < 64; i++) if (a.nextU64() !== b.nextU64()) differ++;
    expect(differ).toBeGreaterThan(60); // overwhelmingly distinct
  });

  test('next01() stays in [0,1) and never returns NaN over a long run', () => {
    const q = new EshkolQrng(mulberry32(7));
    for (let i = 0; i < 5000; i++) {
      const v = q.next01();
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test(
    'mean of many draws ≈ 0.5 (no gross bias)',
    () => {
      const q = new EshkolQrng(mulberry32(99));
      let sum = 0;
      const N = 20000;
      for (let i = 0; i < N; i++) sum += q.next01();
      expect(Math.abs(sum / N - 0.5)).toBeLessThan(0.02);
    },
    // Coverage instrumentation can push this 20,000-draw statistical seal past Bun's 5s default.
    { timeout: 15_000 },
  );

  test('all 8 histogram buckets populated (output spread, not stuck)', () => {
    const q = new EshkolQrng(mulberry32(42));
    const buckets = Array.from({ length: 8 }, () => 0);
    for (let i = 0; i < 8000; i++) buckets[Math.floor(q.next01() * 8)]!++;
    for (const b of buckets) expect(b).toBeGreaterThan(500); // each ~1000 if uniform
  });

  test('stream() yields a working Rng matching next01()', () => {
    const a = new EshkolQrng(mulberry32(2024));
    const b = new EshkolQrng(mulberry32(2024));
    const rng = a.stream();
    for (let i = 0; i < 100; i++) expect(rng()).toBe(b.next01());
  });

  test('snapshot telemetry is well-formed + bounded', () => {
    const q = new EshkolQrng(mulberry32(5));
    for (let i = 0; i < 40; i++) q.next01();
    const s = q.snapshot();
    expect(s.qubits).toBe(ESHKOL_QUBITS);
    expect(s.steps).toBeGreaterThan(0);
    expect(s.draws).toBe(40);
    expect(s.amplitudes).toHaveLength(ESHKOL_QUBITS);
    expect(s.pool).toHaveLength(16);
    expect(s.lastBits).toHaveLength(64);
    expect(s.modelVersion).toBe('v3.0.1-deterministic-classical-statevector-adaptation');
    expect(s.securityBoundary).toContain('not a CSPRNG');
    expect(s.securityBoundary).toContain('not physical entropy');
    for (const a of s.amplitudes) expect(Number.isFinite(a)).toBe(true);
    expect(s.entropyEstimate).toBeGreaterThan(0.7); // high empirical binary-entropy estimate
    expect(s.entropyEstimate).toBeLessThanOrEqual(1);
  });
});
