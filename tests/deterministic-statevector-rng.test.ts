import { describe, expect, test } from 'bun:test';
import {
  DeterministicStatevectorRng,
  STATEVECTOR_RNG_PROVENANCE,
  STATEVECTOR_RNG_SECURITY_BOUNDARY,
} from '../src/math/deterministic-statevector-rng';
import { mulberry32 } from '../src/math/rng';

describe('DeterministicStatevectorRng', () => {
  test('same seed and configuration replay the exact 64-bit stream', () => {
    const a = new DeterministicStatevectorRng(mulberry32(0x51a7_e001));
    const b = new DeterministicStatevectorRng(mulberry32(0x51a7_e001));
    for (let i = 0; i < 32; i++) expect(a.nextU64()).toBe(b.nextU64());
  });

  test('snapshot restore resumes at the exact next output, including a wrapped health ring', () => {
    const source = new DeterministicStatevectorRng(mulberry32(20260710), {
      qubits: 5,
      evolutionRounds: 3,
      healthWindowBits: 128,
      repetitionCutoff: 24,
    });
    for (let i = 0; i < 7; i++) source.nextU64();
    const snapshot = source.snapshot();
    const expected = Array.from({ length: 20 }, () => source.nextU64());
    const restored = DeterministicStatevectorRng.fromSnapshot(snapshot);
    expect(Array.from({ length: 20 }, () => restored.nextU64())).toEqual(expected);
    expect(restored.snapshot()).toEqual(source.snapshot());
  });

  test('all declared unitary gates preserve norm; Born measurement collapses the full register', () => {
    const q = new DeterministicStatevectorRng(mulberry32(77), { qubits: 3 });
    q.h(0);
    q.x(1);
    q.z(0);
    q.s(2);
    q.ry(1, 0.731);
    q.rz(2, -1.127);
    q.cnot(0, 2);
    q.cz(2, 1);
    expect(q.stateNorm()).toBeCloseTo(1, 12);

    const measured = q.measureRegister();
    expect(measured).toBeGreaterThanOrEqual(0);
    expect(measured).toBeLessThan(8);
    expect(q.stateNorm()).toBe(1);
    const snapshot = q.snapshot();
    for (let i = 0; i < snapshot.dimension; i++) {
      expect(snapshot.real[i]).toBe(i === measured ? 1 : 0);
      expect(snapshot.imag[i]).toBe(0);
    }
  });

  test('next01 and bounded health telemetry remain finite and in range', () => {
    const q = new DeterministicStatevectorRng(mulberry32(9), {
      healthWindowBits: 256,
    });
    for (let i = 0; i < 24; i++) {
      const value = q.next01();
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const health = q.health();
    expect(health.sampleBits).toBe(256);
    expect(health.ones + health.zeros).toBe(health.sampleBits);
    expect(Number.isFinite(health.proportionOnes)).toBe(true);
    expect(health.proportionOnes).toBeGreaterThanOrEqual(0);
    expect(health.proportionOnes).toBeLessThanOrEqual(1);
    expect(health.adaptiveProportionLowerBound).toBeGreaterThanOrEqual(0);
    expect(health.adaptiveProportionUpperBound).toBeLessThanOrEqual(1);
    expect(health.longestRun).toBeGreaterThanOrEqual(1);
    expect(health.standardsClaim).toBe('not-sp800-90b-validation-or-certification');
    expect(['diagnostic-pass', 'diagnostic-alert']).toContain(health.status);
  });

  test('different seeds produce divergent streams', () => {
    const a = new DeterministicStatevectorRng(mulberry32(1));
    const b = new DeterministicStatevectorRng(mulberry32(2));
    let differences = 0;
    for (let i = 0; i < 16; i++) if (a.nextU64() !== b.nextU64()) differences++;
    expect(differences).toBeGreaterThan(12);
  });

  test('snapshot records the pinned provenance and explicit security boundary', () => {
    const q = new DeterministicStatevectorRng(mulberry32(3), { qubits: 2 });
    const snapshot = q.snapshot();
    expect(snapshot.provenance).toEqual(STATEVECTOR_RNG_PROVENANCE);
    expect(snapshot.provenance.commit).toBe('a00ad483cbbef31ea7536f09ae99409d81c9a823');
    expect(snapshot.securityBoundary).toBe(STATEVECTOR_RNG_SECURITY_BOUNDARY);
    expect(snapshot.securityBoundary).toContain('not a CSPRNG');
  });

  test('rejects a malformed snapshot without partially mutating the live stream', () => {
    const source = new DeterministicStatevectorRng(mulberry32(0x5afe_2026), {
      qubits: 4,
      healthWindowBits: 128,
    });
    for (let i = 0; i < 4; i++) source.nextU64();
    const good = source.snapshot();
    const target = DeterministicStatevectorRng.fromSnapshot(good);
    const control = DeterministicStatevectorRng.fromSnapshot(good);
    const malformed = structuredClone(good);
    malformed.real.fill(0);

    expect(() => target.restore(malformed)).toThrow('not normalised');
    expect(target.nextU64()).toBe(control.nextU64());
  });
});
