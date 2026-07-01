import { describe, expect, test } from 'bun:test';
import {
  APEX_BRAIN_ROADMAP_PARAMS,
  APEX_BRAIN_START_PARAMS,
  APEX_ULTIMATE_NEURON_TARGET,
  MECHALOGODROM_BRAIN_DESIGNED_PARAMS,
  apexGrowthStage,
  apexSubstrateTelemetry,
  resolveApexDesignedScale,
  consciousnessFromThought,
} from '../src/sim/apex-consciousness-scaffold';
import { SCALE_APEX_5M, SCALE_APEX_START, SCALE_LIVE, SCALE_MASSIVE } from '../src/sim/apex-brain';

describe('APEX consciousness scaffold — 1B substrate telemetry', () => {
  test('MASSIVE reaches a billion via the manifold AND the quantum stabilizer', () => {
    const t = apexSubstrateTelemetry(SCALE_MASSIVE, 12345);
    expect(t.billionReached).toBe(true);
    expect(t.manifold.reachesBillion).toBe(true);
    expect(t.quantum.reachesBillion).toBe(true);
    expect(t.quantum.stabilizerDim).toBeGreaterThanOrEqual(1_000_000_000);
    expect(t.manifold.residentParams).toBeLessThanOrEqual(t.manifold.deviceBudgetParams);
    // the one call now carries the sensorium + the fused behavioural modulation too
    expect(Number.isFinite(t.sensorium.richness)).toBe(true);
    expect(t.modulation.billionReached).toBe(true);
    expect(t.modulation.planBias.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 6);
  });

  test('LIVE scale does not reach a billion (honest)', () => {
    const t = apexSubstrateTelemetry(SCALE_LIVE, 12345);
    expect(t.billionReached).toBe(false);
  });

  test('telemetry is deterministic for a seed', () => {
    const a = apexSubstrateTelemetry(SCALE_MASSIVE, 777);
    const b = apexSubstrateTelemetry(SCALE_MASSIVE, 777);
    expect(a.quantum.bornEntropy).toBe(b.quantum.bornEntropy);
    expect(a.manifold.designedParams).toBe(b.manifold.designedParams);
  });
});

describe('APEX consciousness scaffold — growth tiers', () => {
  test('roadmap constants: 100k start, 5M near-term, 1B ultimate', () => {
    expect(APEX_BRAIN_START_PARAMS).toBe(100_000);
    expect(APEX_BRAIN_ROADMAP_PARAMS).toBe(5_000_000);
    expect(MECHALOGODROM_BRAIN_DESIGNED_PARAMS).toBe(5_000_000);
    expect(APEX_ULTIMATE_NEURON_TARGET).toBe(1_000_000_000);
  });

  test('resolveApexDesignedScale climbs with level + transcendence', () => {
    expect(resolveApexDesignedScale(0, 0).name).toBe(SCALE_APEX_START.name);
    const high = resolveApexDesignedScale(1200, 1);
    expect(high.name).toBe(SCALE_MASSIVE.name);
  });

  test('apexGrowthStage reports roadmap progress toward 5M', () => {
    const g = apexGrowthStage(500, 0.8, 10);
    expect(g.designedParams).toBeGreaterThan(APEX_BRAIN_START_PARAMS);
    expect(g.roadmapParams).toBe(5_000_000);
    expect(g.ultimateNeurons).toBe(1_000_000_000);
    expect(g.roadmapProgress).toBeGreaterThan(0);
    expect(g.activeVariation.id).toBeGreaterThanOrEqual(0);
  });

  test('consciousness indicators carry honesty tag', () => {
    const c = consciousnessFromThought(
      {
        plan: 'ASCEND',
        superposed: false,
        vitality: 0.7,
        agony: 0.2,
        transcendence: 0.5,
        simulation: 2,
        motor: { x: 0, y: 0, z: 0 },
      },
      100,
      1,
    );
    expect(c.honesty).toBe('computational-indicator-not-sentience');
    expect(c.integratedPhiProxy).toBeGreaterThan(0);
  });

  test('5M tier scale name is APEX-5M', () => {
    expect(SCALE_APEX_5M.name).toBe('APEX-5M');
  });
});
