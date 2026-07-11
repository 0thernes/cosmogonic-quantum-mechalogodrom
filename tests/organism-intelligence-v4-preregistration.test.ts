import { describe, expect, test } from 'bun:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fixtureSha256,
  V4_ACCEPTANCE,
  V4_BOOTSTRAP_SAMPLES,
  V4_EVALUATION_SEEDS,
  V4_EXCLUSIONS,
  V4_FAMILY_FIXTURES,
  V4_FAMILY_ORDER,
  V4_HISTORICAL_SEED_SOURCES,
  V4_MATCHED_ARM_LAW,
  V4_PINNED_DEPENDENCIES,
  V4_PROTOCOL_VERSION,
  V4_SIGN_FLIP_SAMPLES,
  V4_SURROGATE_CALIBRATION_SEEDS,
  type V4FamilyId,
} from '../scripts/organism-intelligence-v4-protocol';

interface ManifestFamily {
  id: string;
  controllerType: string;
  primaryOutcome: string;
  arms: string[];
}

interface SeedSource {
  path: string;
  jsonPointer: string;
  sha256: string;
}

interface Preregistration {
  protocolVersion: string;
  status: string;
  indicatorOnly: boolean;
  externallyPreregistered: boolean;
  independentlyReplicated: boolean;
  protocolAuthority: {
    canonicalSource: string;
    canonicalSourceSha256: string;
    pinnedDependencies: Array<{ path: string; sha256: string; symbols: string[] }>;
    familyFixtureSha256: Record<string, string>;
  };
  provenancePolicy: Record<string, boolean>;
  seedPolicy: {
    evaluationSeedCount: number;
    evaluationSeeds: number[];
    surrogateCalibrationSeeds: number[];
    historicalSeedSources: SeedSource[];
    developmentAndTuningSeedSets: Array<{ id: string; source: string; seedCount: number }>;
    otherDevelopmentOrTuningSeeds: number[];
  };
  families: ManifestFamily[];
  excludedFamilies: Array<{ id: string; reason: string }>;
  matchedArmLaw: string[];
  statistics: Record<string, string | number | boolean>;
  acceptance: Record<string, string>;
  publication: Record<string, string | boolean>;
  claimLaw: Record<string, boolean>;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preregPath = resolve(
  ROOT,
  'docs/reports/assets/organism-intelligence-v4-phase-a-preregistration.json',
);

async function json<T>(path: string): Promise<T> {
  return (await Bun.file(path).json()) as T;
}

async function sha256(path: string): Promise<string> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

function jsonPointer(root: unknown, pointer: string): unknown {
  let value = root;
  for (const raw of pointer.split('/').slice(1)) {
    if (typeof value !== 'object' || value === null) return undefined;
    const key = raw.replaceAll('~1', '/').replaceAll('~0', '~');
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

describe('V4 Phase-A repository preregistration', () => {
  test('pins the canonical source, fixtures, arm interventions, exclusions, and matched-arm law', async () => {
    const prereg = await json<Preregistration>(preregPath);
    expect(prereg.protocolVersion).toBe(V4_PROTOCOL_VERSION);
    expect(prereg.protocolAuthority.canonicalSource).toBe(
      'scripts/organism-intelligence-v4-protocol.ts',
    );
    expect(await sha256(resolve(ROOT, prereg.protocolAuthority.canonicalSource))).toBe(
      prereg.protocolAuthority.canonicalSourceSha256,
    );
    expect(prereg.protocolAuthority.pinnedDependencies).toEqual(
      V4_PINNED_DEPENDENCIES.map((dependency) => ({
        ...dependency,
        symbols: [...dependency.symbols],
      })),
    );
    for (const dependency of prereg.protocolAuthority.pinnedDependencies) {
      expect(await sha256(resolve(ROOT, dependency.path))).toBe(dependency.sha256);
    }
    expect(
      Object.fromEntries(V4_FAMILY_ORDER.map((family) => [family, fixtureSha256(family)])),
    ).toEqual(prereg.protocolAuthority.familyFixtureSha256);

    expect(prereg.families.map((family) => family.id)).toEqual([...V4_FAMILY_ORDER]);
    for (const family of prereg.families) {
      const fixture = V4_FAMILY_FIXTURES[family.id as V4FamilyId];
      expect(family.controllerType).toBe(fixture.controllerType);
      expect(family.arms).toEqual([...fixture.arms]);
      expect(Object.keys(fixture.armInterventions)).toEqual([...fixture.arms]);
      expect(family.primaryOutcome).toContain(fixture.primaryOutcome.id);
      expect(family.primaryOutcome).toContain('[0,1]');
    }

    expect(prereg.excludedFamilies.map(({ id, reason }) => [id, reason])).toEqual(
      V4_EXCLUSIONS.map(([id, reason]) => [id, reason]),
    );
    const allIds = [
      ...prereg.families.map(({ id }) => id),
      ...prereg.excludedFamilies.map(({ id }) => id),
    ];
    expect(new Set(allIds).size).toBe(20);
    expect(prereg.matchedArmLaw).toEqual([...V4_MATCHED_ARM_LAW]);
  });

  test('freezes 64 evaluation and 16 calibration seeds disjoint from every pinned historical set', async () => {
    const prereg = await json<Preregistration>(preregPath);
    const evaluation = prereg.seedPolicy.evaluationSeeds;
    const calibration = prereg.seedPolicy.surrogateCalibrationSeeds;
    expect(evaluation).toEqual([...V4_EVALUATION_SEEDS]);
    expect(calibration).toEqual([...V4_SURROGATE_CALIBRATION_SEEDS]);
    expect(evaluation).toEqual(
      Array.from(
        { length: 64 },
        (_, index) => (0xc411_0001 + Math.imul(index + 1, 0x27d4_eb2d)) >>> 0,
      ),
    );
    expect(calibration).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => (0xd3a1_0001 + Math.imul(index + 1, 0x1656_67b1)) >>> 0,
      ),
    );
    expect(evaluation).toHaveLength(prereg.seedPolicy.evaluationSeedCount);
    expect(new Set([...evaluation, ...calibration]).size).toBe(80);
    expect(
      [...evaluation, ...calibration].every(
        (seed) => Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffff_ffff,
      ),
    ).toBe(true);

    expect(prereg.seedPolicy.historicalSeedSources).toEqual(
      V4_HISTORICAL_SEED_SOURCES.map((source) => ({ ...source })),
    );
    const historical = new Set<number>();
    for (const source of prereg.seedPolicy.historicalSeedSources) {
      const path = resolve(ROOT, source.path);
      expect(await sha256(path)).toBe(source.sha256);
      const seeds = jsonPointer(await json<unknown>(path), source.jsonPointer);
      expect(Array.isArray(seeds)).toBe(true);
      for (const seed of seeds as number[]) historical.add(seed);
    }
    expect(evaluation.filter((seed) => historical.has(seed))).toEqual([]);
    expect(calibration.filter((seed) => historical.has(seed))).toEqual([]);
    expect(evaluation.filter((seed) => calibration.includes(seed))).toEqual([]);
    expect(prereg.seedPolicy.developmentAndTuningSeedSets).toEqual([
      {
        id: 'surrogate-calibration',
        source: 'seedPolicy.surrogateCalibrationSeeds',
        seedCount: 16,
      },
    ]);
    expect(prereg.seedPolicy.otherDevelopmentOrTuningSeeds).toEqual([]);
  });

  test('predeclares executable inference, magnitude, replay, safety, cost, and publication gates', async () => {
    const prereg = await json<Preregistration>(preregPath);
    expect(prereg.status).toBe('protocol-frozen-before-result-generation');
    expect(prereg.statistics.bootstrapSamples).toBe(V4_BOOTSTRAP_SAMPLES);
    expect(prereg.statistics.signFlipSamples).toBe(V4_SIGN_FLIP_SAMPLES);
    expect(prereg.statistics.alpha).toBe(0.05);
    expect(prereg.statistics.confidenceLevel).toBe(0.95);
    expect(String(prereg.statistics.multipleComparison)).toContain('Holm');
    expect(String(prereg.statistics.multipleComparison)).toContain(
      'bootstrap intervals are not multiplicity-adjusted',
    );
    expect(V4_ACCEPTANCE.primaryContrasts['ordinary-organisms']).toHaveLength(4);
    expect(V4_ACCEPTANCE.primaryContrasts['petri-digital-biologics']).toHaveLength(3);
    expect(V4_ACCEPTANCE.primaryContrasts.titans).toHaveLength(3);
    expect(Object.keys(prereg.acceptance).sort()).toEqual([
      'adaptivePrediction',
      'crossFamilyNeuralScaling',
      'familyBehavior',
      'inference',
      'neuralCapacity',
      'numericalSafety',
      'outcomeScale',
      'populationCost',
      'recurrentContext',
      'replay',
      'semanticSpecificity',
    ]);
    expect(prereg.acceptance.inference).toContain('paired mean full-minus-control > 0');
    expect(prereg.acceptance.inference).toContain('unadjusted paired-bootstrap');
    expect(prereg.acceptance.inference).toContain('Holm-adjusted one-sided paired sign-flip');
    expect(prereg.acceptance.familyBehavior).toContain('absolute normalized outcome points');
    expect(prereg.acceptance.familyBehavior).not.toContain('strongest-control');
    expect(prereg.publication.receipt).toContain('benchmark-v4.json');
    expect(prereg.publication.rawCsv).toContain('.csv');
    expect(prereg.publication.forestSvg).toContain('.svg');
    expect(prereg.publication.forestRule).toContain('unadjusted paired-bootstrap');
  });

  test('keeps every unsupported capability and score claim explicitly false', async () => {
    const prereg = await json<Preregistration>(preregPath);
    expect(prereg.indicatorOnly).toBe(true);
    expect(prereg.externallyPreregistered).toBe(false);
    expect(prereg.independentlyReplicated).toBe(false);
    expect(Object.keys(prereg.claimLaw)).toContain('v4VersusV3UpliftAllowed');
    expect(Object.values(prereg.claimLaw).every((allowed) => allowed === false)).toBe(true);
    expect(prereg.provenancePolicy.resultGeneratorMustImportCanonicalSource).toBe(true);
    expect(prereg.provenancePolicy.resultMustRecordFamilyFixtureSha256).toBe(true);
  });
});
