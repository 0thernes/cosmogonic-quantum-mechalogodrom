/**
 * THE ESHKOL QUANTUM RNG (V84) — proves the ported Tsotchke generator is deterministic from a seed
 * (the one deliberate deviation from upstream), NaN-free, range-correct, and statistically sane.
 * Experiments (a falsifiable claim each), per the Physicist's law 4.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { EshkolQrng, ESHKOL_QUBITS } from '../src/math/eshkol-qrng';

describe('EshkolQrng (V84) — the ported Tsotchke quantum RNG', () => {
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

  test('mean of many draws ≈ 0.5 (no gross bias)', () => {
    const q = new EshkolQrng(mulberry32(99));
    let sum = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) sum += q.next01();
    expect(Math.abs(sum / N - 0.5)).toBeLessThan(0.02);
  });

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
    for (const a of s.amplitudes) expect(Number.isFinite(a)).toBe(true);
    expect(s.entropyEstimate).toBeGreaterThan(0.7); // high-entropy output
    expect(s.entropyEstimate).toBeLessThanOrEqual(1);
  });
});
