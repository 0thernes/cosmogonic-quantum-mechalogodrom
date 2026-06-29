import { describe, expect, test } from 'bun:test';
import { MechalogodromBrain } from '../src/sim/mechalogodrom-brain';
import { MECHALOGODROM_BRAIN_DESIGNED_PARAMS } from '../src/sim/apex-brain';

describe('MechalogodromBrain — 5M designed fusion mind', () => {
  test('designed params = 5M roadmap; live params tractable', () => {
    const b = new MechalogodromBrain(42);
    expect(b.designedParams).toBe(MECHALOGODROM_BRAIN_DESIGNED_PARAMS);
    expect(b.designedParams).toBe(5_000_000);
    expect(b.liveParams).toBeGreaterThan(0);
    expect(b.liveParams).toBeLessThan(500_000);
  });

  test('tick is deterministic and bounded', () => {
    const a = new MechalogodromBrain(7);
    const b = new MechalogodromBrain(7);
    const p = {
      fusion: 0.8,
      dimension: 42,
      power: 9001,
      chaos: 0.6,
      warp: 0.3,
      apexVitality: 0.7,
      apexTranscendence: 0.5,
      apexAgony: 0.1,
    };
    const sa = a.tick(p);
    const sb = b.tick(p);
    expect(sa.activity).toBe(sb.activity);
    expect(sa.consciousnessProxy).toBe(sb.consciousnessProxy);
    expect(sa.dominantVariant).toBeGreaterThanOrEqual(0);
    expect(sa.dominantVariant).toBeLessThan(10);
    expect(Number.isFinite(sa.consciousnessProxy)).toBe(true);
  });
});
