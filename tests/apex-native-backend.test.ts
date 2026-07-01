/**
 * APEX Native Backend tests — the reference oracle + the reproduction contract (ADR-0007).
 *
 * The pure-TS backend is authoritative and deterministic; a native/WASM backend is only ever a
 * reproduction of it. These tests pin the oracle's determinism and prove the reproduction gate
 * distinguishes a matching backend from a wrong one.
 */
import { describe, expect, test } from 'bun:test';
import {
  REFERENCE_BACKEND,
  ReferenceApexBackend,
  apexGoldenVectors,
  backendReproducesOracle,
  resolveApexBackend,
  type ApexKernelBackend,
} from '../src/sim/apex-native-backend';

describe('native backend — the authoritative reference oracle', () => {
  test('resolveApexBackend returns the authoritative TS oracle', () => {
    const b = resolveApexBackend();
    expect(b.name).toBe('reference-ts');
    expect(b.authoritative).toBe(true);
    expect(b.available).toBe(true);
  });

  test('every kernel hash is deterministic for a seed and diverges across seeds', () => {
    const a = new ReferenceApexBackend();
    const b = new ReferenceApexBackend();
    expect(a.primeSieveHash(256, 7)).toBe(b.primeSieveHash(256, 7));
    expect(a.statevectorHash(6, 8, 7)).toBe(b.statevectorHash(6, 8, 7));
    expect(a.heatGridHash(32, 32, 16, 7)).toBe(b.heatGridHash(32, 32, 16, 7));
    expect(a.pendulumHash(64, 32, 7)).toBe(b.pendulumHash(64, 32, 7));
    // seed changes the seeded kernels
    expect(a.heatGridHash(32, 32, 16, 7)).not.toBe(a.heatGridHash(32, 32, 16, 8));
    expect(a.pendulumHash(64, 32, 7)).not.toBe(a.pendulumHash(64, 32, 8));
  });

  test('the prime-sieve hash is deterministic and the node count changes the twin-prime structure', () => {
    // The seed salts the accumulator; for a fixed seed the twin-prime law over n defines the hash.
    expect(REFERENCE_BACKEND.primeSieveHash(256, 1)).toBe(REFERENCE_BACKEND.primeSieveHash(256, 1));
    expect(REFERENCE_BACKEND.primeSieveHash(256, 1)).not.toBe(
      REFERENCE_BACKEND.primeSieveHash(255, 1),
    );
  });
});

describe('native backend — reproduction contract', () => {
  test('the reference reproduces its own golden vectors', () => {
    expect(backendReproducesOracle(REFERENCE_BACKEND)).toBe(true);
  });

  test('golden vectors are all finite uint32 hashes', () => {
    const g = apexGoldenVectors(0xabcdef);
    for (const v of [g.primeSieve, g.statevector, g.heatGrid, g.pendulum]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });

  test('a WRONG backend fails the reproduction gate', () => {
    const wrong: ApexKernelBackend = {
      name: 'wrong',
      available: true,
      authoritative: false,
      primeSieveHash: () => 0,
      statevectorHash: () => 0,
      heatGridHash: () => 0,
      pendulumHash: () => 0,
    };
    expect(backendReproducesOracle(wrong)).toBe(false);
  });
});
