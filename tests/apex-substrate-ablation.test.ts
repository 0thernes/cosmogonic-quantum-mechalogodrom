/**
 * APEX Substrate Ablation harness — the doctrine's Experiment 1, as a test.
 *
 * "If any substrate can be removed with no downstream effect, it was decoration, not biology."
 * Each tier (procedural / quantum / field / resident) is zeroed in turn and the resulting behavioural
 * modulation MUST differ from the full-substrate modulation. If any ablation leaves behaviour
 * unchanged, that tier is decoration and the test fails.
 */
import { describe, expect, test } from 'bun:test';
import { SCALE_MASSIVE } from '../src/sim/apex-brain';
import { ApexSubstrateDriver, type AblationFlags } from '../src/sim/apex-substrate-driver';

function driven(seed = 42, steps = 24): ApexSubstrateDriver {
  const d = new ApexSubstrateDriver(SCALE_MASSIVE, seed);
  for (let i = 0; i < steps; i++) d.step(0.6);
  return d;
}

const TIERS: (keyof AblationFlags)[] = ['procedural', 'quantum', 'field', 'resident'];

describe('ablation — every substrate tier is load-bearing', () => {
  test('ablating any tier changes the behavioural modulation', () => {
    const d = driven();
    const full = JSON.stringify(d.modulate(6));
    for (const tier of TIERS) {
      const ablated = JSON.stringify(d.modulate(6, { [tier]: true }));
      expect(ablated).not.toBe(full); // this tier demonstrably affects behaviour
    }
  });

  test('ablating the field drops thermal stress (heat load removed)', () => {
    const d = driven();
    expect(d.modulate(6, { field: true }).thermalStress).toBeLessThan(
      d.modulate(6).thermalStress + 1e-9,
    );
    // and strictly changes it when heat load is present
    expect(d.modulate(6, { field: true }).thermalStress).not.toBe(d.modulate(6).thermalStress);
  });

  test('ablating the quantum tier flattens the plan bias toward uniform', () => {
    const d = driven();
    const ablated = d.modulate(6, { quantum: true }).planBias;
    for (const v of ablated) expect(v).toBeCloseTo(1 / 6, 6);
    // the live quantum plan bias is NOT perfectly uniform
    const live = d.modulate(6).planBias;
    const maxDev = Math.max(...live.map((v) => Math.abs(v - 1 / 6)));
    expect(maxDev).toBeGreaterThan(0);
  });

  test('ablation is deterministic', () => {
    const a = driven(7).modulate(6, { procedural: true, field: true });
    const b = driven(7).modulate(6, { procedural: true, field: true });
    expect(a).toEqual(b);
  });
});
