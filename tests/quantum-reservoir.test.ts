/**
 * THE QUANTUM RESERVOIR (Super Creature 1.2) — the quantum-reservoir-computing readout of the 6-qubit
 * register's observable trajectory (Fujii & Nakajima 2017). Pins determinism, bounds, NaN-safety, the
 * flux response (0 on the first beat / under a static state, rising as the state moves), the zero-input
 * fixed point, and the snapshot shape.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  QRC_FEAT,
  QRC_IN,
  QuantumReservoir,
  type QuantumReservoirSnapshot,
} from '../src/sim/quantum-reservoir';

const obsFrom = (seed: number): number[] => {
  const r = mulberry32(seed);
  return Array.from({ length: QRC_IN }, () => r() * 2 - 1); // ~Bloch components in [−1,1]
};

describe('QuantumReservoir — the QRC readout (SC 1.2)', () => {
  test('deterministic — the same observable stream replays identical features + flux', () => {
    const a = new QuantumReservoir(mulberry32(0x9e37));
    const b = new QuantumReservoir(mulberry32(0x9e37));
    for (let i = 1; i <= 30; i++) {
      const o = obsFrom(i);
      a.step(o);
      b.step(o);
      expect(a.quantumFlux).toBe(b.quantumFlux);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('features stay in [−1,1] and flux in [0,1], all finite, under an arbitrary stream', () => {
    const qr = new QuantumReservoir(mulberry32(7));
    for (let i = 1; i <= 200; i++) {
      qr.step(obsFrom(i * 13 + 1));
      expect(qr.quantumFlux).toBeGreaterThanOrEqual(0);
      expect(qr.quantumFlux).toBeLessThanOrEqual(1);
      for (let f = 0; f < QRC_FEAT; f++) {
        const v = qr.feature(f);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('flux is 0 on the first beat and ~0 under a static quantum state', () => {
    const qr = new QuantumReservoir(mulberry32(3));
    const o = obsFrom(42);
    qr.step(o); // first beat: no previous observation → flux 0
    expect(qr.quantumFlux).toBe(0);
    for (let i = 0; i < 5; i++) qr.step(o); // unchanged observables
    expect(qr.quantumFlux).toBeCloseTo(0, 12);
  });

  test('flux rises as the quantum state moves; a full ±1 swing approaches the max', () => {
    const qr = new QuantumReservoir(mulberry32(5));
    const lo = Array.from({ length: QRC_IN }, () => -1);
    const hi = Array.from({ length: QRC_IN }, () => 1);
    qr.step(lo); // seed
    qr.step(hi); // every observable swung −1→+1: the largest possible step
    expect(qr.quantumFlux).toBeGreaterThan(0.9);
    qr.step(hi); // no change now
    expect(qr.quantumFlux).toBeCloseTo(0, 12);
  });

  test('a NaN / ±Inf observable cannot poison the readout', () => {
    const qr = new QuantumReservoir(mulberry32(9));
    qr.step(obsFrom(1));
    const bad = obsFrom(2);
    bad[3] = NaN;
    bad[7] = Infinity;
    bad[11] = -Infinity;
    qr.step(bad);
    expect(Number.isFinite(qr.quantumFlux)).toBe(true);
    for (let f = 0; f < QRC_FEAT; f++) expect(Number.isFinite(qr.feature(f))).toBe(true);
    // a clean beat afterwards recovers finite, bounded values
    qr.step(obsFrom(3));
    expect(JSON.stringify(qr.snapshot())).not.toContain('null');
  });

  test('zero observables drive the leaky trace → 0 ⇒ features → tanh(0) = 0', () => {
    const qr = new QuantumReservoir(mulberry32(11));
    const zero = Array.from({ length: QRC_IN }, () => 0);
    for (let i = 0; i < 200; i++) qr.step(zero);
    for (let f = 0; f < QRC_FEAT; f++) expect(qr.feature(f)).toBeCloseTo(0, 9);
    expect(qr.snapshot().energy).toBeCloseTo(0, 9);
  });

  test('out-of-range feature index returns 0, never throws', () => {
    const qr = new QuantumReservoir(mulberry32(13));
    qr.step(obsFrom(1));
    expect(qr.feature(-1)).toBe(0);
    expect(qr.feature(QRC_FEAT)).toBe(0);
    expect(qr.feature(999)).toBe(0);
  });

  test('snapshot: bounded fields + the right feature width', () => {
    const qr = new QuantumReservoir(mulberry32(17));
    for (let i = 1; i <= 20; i++) qr.step(obsFrom(i));
    const snap: QuantumReservoirSnapshot = qr.snapshot();
    expect(snap.in).toBe(QRC_IN);
    expect(snap.feature).toHaveLength(QRC_FEAT);
    expect(snap.flux).toBeGreaterThanOrEqual(0);
    expect(snap.flux).toBeLessThanOrEqual(1);
    expect(snap.energy).toBeGreaterThanOrEqual(0);
    expect(snap.energy).toBeLessThanOrEqual(1);
  });
});
