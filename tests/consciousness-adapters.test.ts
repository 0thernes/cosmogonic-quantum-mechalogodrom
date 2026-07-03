import { describe, expect, test } from 'bun:test';
import {
  CONSCIOUSNESS_ENTITY_KINDS,
  DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES,
  buildEntityConsciousnessRecord,
  generateConsciousnessDashboardData,
  signalsFromEntityProfile,
  supportsFramework,
} from '../src/sim/consciousness-adapters';
import { FRAMEWORK_COUNT, FRAMEWORK_IDS } from '../src/sim/consciousness-kernel';
import { runConsciousnessLab } from '../src/sim/consciousness-lab';

describe('consciousness entity adapters', () => {
  test('the default profile set covers every promised entity class exactly once', () => {
    expect(DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.length).toBe(CONSCIOUSNESS_ENTITY_KINDS.length);
    expect(new Set(DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.map((p) => p.kind))).toEqual(
      new Set(CONSCIOUSNESS_ENTITY_KINDS),
    );
  });

  test('plants are low-bandwidth: field/learning/body are present, CTM/projective are absent', () => {
    const plant = DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.find((p) => p.kind === 'plant')!;
    const signals = signalsFromEntityProfile(plant, 12);
    expect(signals.fieldCoherence).toBeGreaterThan(0);
    expect(signals.ualDepth).toBeGreaterThan(0);
    expect(signals.sensorimotorMastery).toBeGreaterThan(0);
    expect(signals.projectiveFrame).toBeUndefined();
    expect(signals.streamCompetition).toBeUndefined();
    expect(supportsFramework(plant, 'ctm')).toBe(false);
  });

  test('apex-scale profiles expose the full ten-framework contract', () => {
    const apex = DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.find((p) => p.kind === 'apex')!;
    const signals = signalsFromEntityProfile(apex, 20);
    const defined = Object.values(signals).filter((v) => v !== undefined);
    expect(defined.length).toBeGreaterThanOrEqual(FRAMEWORK_COUNT);
    for (const id of FRAMEWORK_IDS) expect(supportsFramework(apex, id)).toBe(true);
  });

  test('entity records build indicator-only snapshots with bounded framework scores', () => {
    const lab = runConsciousnessLab(0x20260703);
    for (const profile of DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES) {
      const record = buildEntityConsciousnessRecord(profile, lab);
      expect(record.snapshot.claim).toBe('indicatorOnly');
      expect(record.snapshot.frameworks.length).toBe(FRAMEWORK_COUNT);
      expect(record.activeFrameworks).toBeGreaterThan(0);
      for (const framework of record.snapshot.frameworks) {
        expect(framework.score).toBeGreaterThanOrEqual(0);
        expect(framework.score).toBeLessThanOrEqual(1);
      }
    }
  });

  test('dashboard data is deterministic and keeps the honesty claim at the top level', () => {
    const a = generateConsciousnessDashboardData(77);
    const b = generateConsciousnessDashboardData(77);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.claim).toBe('indicatorOnly');
    expect(a.entityRecords.length).toBe(CONSCIOUSNESS_ENTITY_KINDS.length);
    expect(a.labReport.claim).toBe('indicatorOnly');
  });
});
