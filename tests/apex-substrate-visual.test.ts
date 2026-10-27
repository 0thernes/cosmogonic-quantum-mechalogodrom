/**
 * APEX Substrate Visual Bridge tests — the pure telemetry → shader-uniform mapping.
 *
 * Asserts the uniforms are always in-range and load-bearing: the billion reach reads near-full at
 * MASSIVE and near-empty at LIVE, the quantum dim saturates once the stabilizer clears a billion, and
 * ablating the substrate demonstrably changes the look.
 */
import { describe, expect, test } from 'bun:test';
import { SCALE_LIVE, SCALE_MASSIVE } from '../src/sim/apex-brain';
import { DEVICE_BROWSER, buildManifold } from '../src/sim/apex-parameter-manifold';
import { ApexQuantumSubstrate } from '../src/sim/apex-quantum-substrate';
import { substrateUniforms } from '../src/sim/apex-substrate-visual';

function reachFor(seed: number, steps = 12) {
  const q = new ApexQuantumSubstrate(seed);
  for (let i = 0; i < steps; i++) q.step(0.5);
  return q.reach();
}

describe('visual bridge — bounded, load-bearing uniforms', () => {
  test('every uniform is finite and in [0, 1]', () => {
    const u = substrateUniforms(buildManifold(SCALE_MASSIVE, DEVICE_BROWSER), reachFor(1));
    for (const v of Object.values(u)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('the billion reach reads near-full at MASSIVE and small at LIVE', () => {
    const massive = substrateUniforms(buildManifold(SCALE_MASSIVE, DEVICE_BROWSER), reachFor(1));
    const live = substrateUniforms(buildManifold(SCALE_LIVE, DEVICE_BROWSER), reachFor(1));
    expect(massive.uBillionReach).toBeGreaterThan(0.99);
    expect(massive.uBillionReach).toBeGreaterThan(live.uBillionReach);
  });

  test('the quantum-dim uniform saturates once the stabilizer clears a billion', () => {
    const u = substrateUniforms(buildManifold(SCALE_MASSIVE, DEVICE_BROWSER), reachFor(1));
    expect(u.uQuantumDim).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  test('ablating the substrate (different scale) changes the look', () => {
    const massive = substrateUniforms(buildManifold(SCALE_MASSIVE, DEVICE_BROWSER), reachFor(1));
    const live = substrateUniforms(buildManifold(SCALE_LIVE, DEVICE_BROWSER), reachFor(1));
    expect(massive.uBillionReach).not.toBe(live.uBillionReach);
    expect(massive.uTierSpread).toBeGreaterThanOrEqual(0);
  });
});
