import { describe, expect, test } from 'bun:test';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS,
  PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  PHASE_B_DEVELOPMENT_SEEDS,
  phaseBDevelopmentSeeds,
} from '../scripts/organism-intelligence-phase-b/development-seeds';
import {
  V4_EVALUATION_SEEDS,
  V4_SURROGATE_CALIBRATION_SEEDS,
} from '../scripts/organism-intelligence-v4-protocol';

describe('Phase-B development seed firewall', () => {
  test('reconstructs and rejects every V1-V4 evidence/calibration seed', async () => {
    const v1 = (await Bun.file(
      'docs/reports/assets/organism-intelligence-causal-benchmark.json',
    ).json()) as { protocol: { heldOutSeeds: number[] } };
    const v2 = (await Bun.file(
      'docs/reports/assets/organism-intelligence-causal-benchmark-v2.json',
    ).json()) as { protocol: { heldOutSeeds: number[] } };
    const v3 = (await Bun.file(
      'docs/reports/assets/organism-intelligence-causal-benchmark-v3.json',
    ).json()) as { protocol: { evaluationSeeds: number[] } };
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS).toHaveLength(170);
    expect(new Set(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS).size).toBe(170);
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS.slice(0, 30)).toEqual(v1.protocol.heldOutSeeds);
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS.slice(30, 60)).toEqual(v2.protocol.heldOutSeeds);
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS.slice(60, 90)).toEqual(
      v3.protocol.evaluationSeeds,
    );
    for (const seed of HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS) {
      expect(() => assertPhaseBDevelopmentSeed(seed)).toThrow(/overlaps a V1-V4 evidence family/);
    }
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS).toContain(V4_EVALUATION_SEEDS[0]);
    expect(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS).toContain(V4_SURROGATE_CALIBRATION_SEEDS[0]);
  });

  test('derives deterministic domain-separated, mutually disjoint development families', () => {
    expect(PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256).toBe(
      '86bb594637eac23d1de4448b8b45809350e2caf7b87a800adf07e772e7e90249',
    );
    expect(PHASE_B_DEVELOPMENT_SEEDS.nhiTrain).toHaveLength(32);
    expect(PHASE_B_DEVELOPMENT_SEEDS.nhiValidation).toHaveLength(16);
    expect(PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment).toHaveLength(48);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain).toHaveLength(32);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train).toHaveLength(12);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation).toHaveLength(8);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model).toHaveLength(4);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate).toHaveLength(8);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault).toHaveLength(4);
    expect(phaseBDevelopmentSeeds('nhi-train', 32)).toEqual(PHASE_B_DEVELOPMENT_SEEDS.nhiTrain);
    expect(phaseBDevelopmentSeeds('nhi-train', 3)).toEqual(
      PHASE_B_DEVELOPMENT_SEEDS.nhiTrain.slice(0, 3),
    );
    expect(PHASE_B_DEVELOPMENT_SEEDS.nhiTrain.slice(0, 3)).toEqual([
      2_754_074_950, 162_971_225, 159_303_717,
    ]);

    expect(() => assertDisjointPhaseBDevelopmentFamilies(PHASE_B_DEVELOPMENT_SEEDS)).not.toThrow();
    const all = Object.values(PHASE_B_DEVELOPMENT_SEEDS).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const seed of all) {
      expect(() => assertPhaseBDevelopmentSeed(seed)).not.toThrow();
    }
  });

  test('rejects invalid counts, invalid uint32 values, and cross-role overlap', () => {
    for (const count of [0, -1, 10_001, 1.5, Number.NaN]) {
      expect(() => phaseBDevelopmentSeeds('ordinary-train', count)).toThrow(RangeError);
    }
    expect(() => phaseBDevelopmentSeeds('unknown' as never, 1)).toThrow(/unknown.*namespace/);
    for (const seed of [0, -1, 0x1_0000_0000, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertPhaseBDevelopmentSeed(seed)).toThrow(RangeError);
    }
    const seed = PHASE_B_DEVELOPMENT_SEEDS.nhiTrain[0]!;
    expect(() => assertDisjointPhaseBDevelopmentFamilies({ left: [seed], right: [seed] })).toThrow(
      /overlaps left and right/,
    );
  });
});
