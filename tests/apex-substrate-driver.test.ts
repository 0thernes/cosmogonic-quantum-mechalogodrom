/**
 * APEX Substrate Driver tests — the substrate fused into behavioural modulation.
 *
 * Asserts the modulation is bounded, deterministic, and reaches a billion; the ablation law itself is
 * proven in apex-substrate-ablation.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import { SCALE_MASSIVE } from '../src/sim/apex-brain';
import { ApexSubstrateDriver } from '../src/sim/apex-substrate-driver';

function drive(seed: number, steps = 24) {
  const d = new ApexSubstrateDriver(SCALE_MASSIVE, seed);
  for (let i = 0; i < steps; i++) d.step(0.5 + 0.3 * Math.sin(i));
  return d;
}

describe('substrate driver — bounded, billion-reaching modulation', () => {
  test('modulation channels are finite and in [0, 1]; plan bias sums to 1', () => {
    const m = drive(1).modulate(6);
    for (const k of ['motorGain', 'exploration', 'thermalStress', 'transcendencePush'] as const) {
      expect(Number.isFinite(m[k])).toBe(true);
      expect(m[k]).toBeGreaterThanOrEqual(0);
      expect(m[k]).toBeLessThanOrEqual(1);
    }
    expect(m.planBias.length).toBe(6);
    expect(m.planBias.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 6);
    expect(m.billionReached).toBe(true);
  });

  test('telemetry exposes manifold + quantum + sensorium', () => {
    const t = drive(2).telemetry();
    expect(t.manifold.reachesBillion).toBe(true);
    expect(t.quantum.reachesBillion).toBe(true);
    expect(Number.isFinite(t.sensorium.richness)).toBe(true);
  });
});

describe('substrate driver — determinism', () => {
  test('same seed + same drive ⇒ identical modulation', () => {
    const a = drive(999).modulate(6);
    const b = drive(999).modulate(6);
    expect(a).toEqual(b);
  });
});
