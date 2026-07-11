import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  assertV4RawMatrix,
  buildV4ForestSvg,
  buildV4RawCsv,
  verifyV4FrozenAuthority,
  V4_MANIFEST_COMMIT,
  V4_RESULT_PATHS,
  type V4ForestRow,
  type V4RawResultRow,
} from '../scripts/organism-intelligence-v4-benchmark';
import {
  fixtureSha256,
  V4_FAMILY_FIXTURES,
  V4_FAMILY_ORDER,
  V4_PROTOCOL_VERSION,
  type V4FamilyId,
} from '../scripts/organism-intelligence-v4-protocol';

const ROOT = resolve(import.meta.dir, '..');
const SHA256 = /^[0-9a-f]{64}$/;

interface ReceiptFamily {
  id: V4FamilyId;
  label: string;
  controllerType: V4ForestRow['controllerType'];
  neuralController: boolean;
  seedCount: number;
  armCount: number;
  rowCount: number;
  fixtureSha256: string;
  matchedArmPass: boolean;
  rawRowReplayPass: boolean;
  inferencePass: boolean;
  magnitudePass: boolean;
  evidencePass: boolean;
  familyPass: boolean;
  claimReleaseGates: { pass: boolean };
  weakestForestContrast: {
    contrast: string;
    meanDelta: number;
    bootstrap95: [number, number];
    holmSignFlipP: number;
    inferencePass: boolean;
  };
  eligibleClaims: string[];
  authorizedClaims: string[];
  withheldClaims: string[];
}

interface V4Receipt {
  schemaVersion: number;
  resultVersion: string;
  protocolVersion: string;
  status: string;
  verificationStatusAtGeneration: string;
  publicationStatusAtGeneration: string;
  indicatorOnly: boolean;
  provenance: {
    repositoryPreregistrationOnly: boolean;
    externallyPreregistered: boolean;
    independentlyReplicated: boolean;
    manifestCommit: string;
    runtimeBaseCommit: string;
    manifestSha256: string;
    canonicalProtocolSha256: string;
    pinnedDependencies: Array<{
      path: string;
      sha256: string;
      symbols: readonly string[];
      verified: true;
    }>;
    benchmarkScriptSha256: string;
    evaluatorSourceSha256: Record<string, string>;
    resultAffectingSourceSha256: Record<string, string>;
    rawDataPath: string;
    rawDataSha256: string;
    familyFixtureSha256: Record<V4FamilyId, string>;
  };
  surrogateCalibrations: {
    ordinaryActionDistribution: {
      actionVectorCount: number;
      nonZeroActionVectorCount: number;
      zeroActionVectorCount: number;
      actionFrequency: number;
      calibrationSha256: string;
    };
    titanPooledPolicy: {
      cooperationRate: number;
      sourceMoveCount: number;
      sourceMovesSha256: string;
      contentHash: string;
    };
  };
  families: ReceiptFamily[];
  familyOutcomeCounts: { evaluated: number; passed: number; failed: number };
  numericalSafety: {
    semanticStorageBytesPerEntity: number;
    aggregateViolationCount: number;
    gateMet: boolean;
    accepted: boolean;
    familyScopes: Record<
      'sharedOrdinaryPredictor' | 'petri' | 'titans',
      {
        replayMatched: boolean;
        gateMet: boolean;
        accepted: boolean;
        campaign: {
          forcedSteps: number;
          semanticLaneOrder?: string[];
          faultClassOrder: string[];
        };
      }
    >;
  };
  performance: { gates: Record<string, boolean> & { accepted: boolean } };
  claims: Record<string, boolean>;
  claimOutcomeCounts: { authorizedEligibleClaims: number; withheldEligibleClaims: number };
  crossFamily: {
    status: string;
    pooledPassAllowed: boolean;
    neuralCapacityRuleEvaluated: boolean;
  };
  publication: { receipt: string; rawCsv: string; forestSvg: string };
  contentSha256: string;
}

function sha256(value: string | Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

async function fileSha256(path: string): Promise<string> {
  return sha256(new Uint8Array(await Bun.file(resolve(ROOT, path)).arrayBuffer()));
}

async function receipt(): Promise<V4Receipt> {
  return (await Bun.file(resolve(ROOT, V4_RESULT_PATHS.receipt)).json()) as V4Receipt;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field !== '') throw new Error('CSV quote must begin an empty field');
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('CSV ended inside a quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function required(record: Record<string, string>, key: string): string {
  const value = record[key];
  if (value === undefined) throw new Error(`CSV is missing ${key}`);
  return value;
}

function finiteNumber(record: Record<string, string>, key: string): number {
  const value = Number(required(record, key));
  if (!Number.isFinite(value)) throw new Error(`CSV ${key} is not finite`);
  return value;
}

function nullableNumber(record: Record<string, string>, key: string): number | null {
  return required(record, key) === '' ? null : finiteNumber(record, key);
}

function nullableString(record: Record<string, string>, key: string): string | null {
  const value = required(record, key);
  return value === '' ? null : value;
}

function booleanValue(record: Record<string, string>, key: string): boolean {
  const value = required(record, key);
  if (value !== 'true' && value !== 'false') throw new Error(`CSV ${key} is not boolean`);
  return value === 'true';
}

function rawRow(record: Record<string, string>): V4RawResultRow {
  const schemaVersion = finiteNumber(record, 'schema_version');
  if (schemaVersion !== 1) throw new Error('CSV schema version is not 1');
  return {
    schema_version: 1,
    protocol_version: required(record, 'protocol_version') as V4RawResultRow['protocol_version'],
    family: required(record, 'family') as V4RawResultRow['family'],
    controller_type: required(record, 'controller_type') as V4RawResultRow['controller_type'],
    neural_controller: booleanValue(record, 'neural_controller'),
    neural_capacity_evaluated: booleanValue(record, 'neural_capacity_evaluated') as false,
    evidence_tier: required(record, 'evidence_tier') as V4RawResultRow['evidence_tier'],
    seed: finiteNumber(record, 'seed'),
    task: required(record, 'task'),
    arm: required(record, 'arm'),
    live_capacity_tier: required(record, 'live_capacity_tier'),
    live_parameter_count: finiteNumber(record, 'live_parameter_count'),
    designed_parameter_count: finiteNumber(record, 'designed_parameter_count'),
    parameter_count_semantics: required(
      record,
      'parameter_count_semantics',
    ) as V4RawResultRow['parameter_count_semantics'],
    primary_outcome: finiteNumber(record, 'primary_outcome'),
    primary_mean_brier: nullableNumber(record, 'primary_mean_brier'),
    fixture_sha256: required(record, 'fixture_sha256'),
    initial_state_sha256: required(record, 'initial_state_sha256'),
    percept_sha256: required(record, 'percept_sha256'),
    task_schedule_sha256: required(record, 'task_schedule_sha256'),
    environment_rng_evidence_kind: required(record, 'environment_rng_evidence_kind'),
    environment_rng_evidence_sha256: required(record, 'environment_rng_evidence_sha256'),
    environment_rng_tape_sha256: nullableString(record, 'environment_rng_tape_sha256'),
    environment_rng_draw_count: finiteNumber(record, 'environment_rng_draw_count'),
    surrogate_rng_tape_sha256: nullableString(record, 'surrogate_rng_tape_sha256'),
    surrogate_rng_draw_count: finiteNumber(record, 'surrogate_rng_draw_count'),
    calibration_sha256: nullableString(record, 'calibration_sha256'),
    intervention_sha256: nullableString(record, 'intervention_sha256'),
    replay_fingerprint: required(record, 'replay_fingerprint'),
    replay_pass: booleanValue(record, 'replay_pass'),
    latency_ms: nullableNumber(record, 'latency_ms'),
    latency_status: required(record, 'latency_status') as V4RawResultRow['latency_status'],
    memory_bytes: nullableNumber(record, 'memory_bytes'),
    memory_scope: required(record, 'memory_scope') as V4RawResultRow['memory_scope'],
    failure_reason: nullableString(record, 'failure_reason') as V4RawResultRow['failure_reason'],
    secondary_json: required(record, 'secondary_json'),
  };
}

async function rawMatrix(): Promise<{ text: string; rows: V4RawResultRow[] }> {
  const text = await Bun.file(resolve(ROOT, V4_RESULT_PATHS.rawCsv)).text();
  const table = parseCsv(text);
  const header = table[0];
  if (header === undefined) throw new Error('V4 CSV has no header');
  const rows = table.slice(1).map((values, rowIndex) => {
    if (values.length !== header.length) throw new Error(`CSV row ${rowIndex} has the wrong width`);
    return rawRow(Object.fromEntries(header.map((key, index) => [key, values[index]!] as const)));
  });
  return { text, rows };
}

function gitIsAncestor(ancestor: string, descendant: string): boolean {
  return (
    Bun.spawnSync(['git', 'merge-base', '--is-ancestor', ancestor, descendant], { cwd: ROOT })
      .exitCode === 0
  );
}

describe('V4 generated artifact integrity', () => {
  test('binds receipt content, frozen authority, source bytes, fixtures, raw bytes, and ancestry', async () => {
    const value = await receipt();
    const { contentSha256, ...body } = value;
    expect(contentSha256).toMatch(SHA256);
    expect(sha256(JSON.stringify(body))).toBe(contentSha256);
    expect(value.protocolVersion).toBe(V4_PROTOCOL_VERSION);
    expect(value.provenance.manifestCommit).toBe(V4_MANIFEST_COMMIT);
    expect(gitIsAncestor(V4_MANIFEST_COMMIT, value.provenance.runtimeBaseCommit)).toBe(true);
    expect(gitIsAncestor(value.provenance.runtimeBaseCommit, 'HEAD')).toBe(true);

    const authority = await verifyV4FrozenAuthority();
    expect(value.provenance.manifestSha256).toBe(authority.manifestSha256);
    expect(value.provenance.canonicalProtocolSha256).toBe(authority.protocolSha256);
    expect(value.provenance.pinnedDependencies).toEqual(authority.pinnedDependencies);
    for (const [path, expected] of Object.entries(value.provenance.resultAffectingSourceSha256)) {
      expect(await fileSha256(path)).toBe(expected);
    }
    expect(value.provenance.benchmarkScriptSha256).toBe(
      value.provenance.resultAffectingSourceSha256[
        'scripts/organism-intelligence-v4-benchmark.ts'
      ]!,
    );
    expect(value.provenance.evaluatorSourceSha256).toEqual(
      Object.fromEntries(
        Object.entries(value.provenance.resultAffectingSourceSha256).filter(([path]) =>
          path.startsWith('scripts/organism-intelligence-v4/'),
        ),
      ),
    );
    for (const family of V4_FAMILY_ORDER) {
      expect(value.provenance.familyFixtureSha256[family]).toBe(fixtureSha256(family));
    }
    expect(value.provenance.rawDataPath).toBe(V4_RESULT_PATHS.rawCsv);
    expect(await fileSha256(V4_RESULT_PATHS.rawCsv)).toBe(value.provenance.rawDataSha256);
  });

  test('reconstructs the exact 1,152-row matrix and retains failures plus secondary evidence', async () => {
    const { text, rows } = await rawMatrix();
    expect(rows).toHaveLength(1152);
    expect(() => assertV4RawMatrix(rows)).not.toThrow();
    expect(buildV4RawCsv(rows)).toBe(text);
    expect(rows.every(({ replay_pass }) => replay_pass)).toBe(true);

    const expectedReasons: Record<V4FamilyId, V4RawResultRow['failure_reason']> = {
      'ordinary-organisms': 'family-magnitude-gate-failed',
      'simple-mnist-ecology-predictor': 'family-inference-and-magnitude-gates-failed',
      'petri-digital-biologics': 'family-magnitude-gate-failed',
      titans: null,
    };
    for (const family of V4_FAMILY_ORDER) {
      const familyRows = rows.filter((row) => row.family === family);
      expect(familyRows).toHaveLength(64 * V4_FAMILY_FIXTURES[family].arms.length);
      expect(new Set(familyRows.map(({ failure_reason }) => failure_reason))).toEqual(
        new Set([expectedReasons[family]]),
      );
    }

    const ordinary = JSON.parse(
      rows.find(({ family }) => family === 'ordinary-organisms')!.secondary_json,
    ) as { outcomes: { goalAlignedVelocityRecovery?: unknown } };
    expect(ordinary.outcomes.goalAlignedVelocityRecovery).toBeDefined();
    const predictor = JSON.parse(
      rows.find(({ family }) => family === 'simple-mnist-ecology-predictor')!.secondary_json,
    ) as { recovery?: unknown };
    expect(predictor.recovery).toBeDefined();
    const petriDisabled = JSON.parse(
      rows.find(
        ({ family, arm }) =>
          family === 'petri-digital-biologics' && arm === 'shared-field-disabled',
      )!.secondary_json,
    ) as { outcomes: { legacyTrajectoryEquality?: { exact?: boolean } } };
    expect(petriDisabled.outcomes.legacyTrajectoryEquality?.exact).toBe(true);
    const titan = JSON.parse(rows.find(({ family }) => family === 'titans')!.secondary_json) as {
      pairPayoff?: { perRegime?: unknown[]; aggregate?: unknown };
    };
    expect(titan.pairPayoff?.perRegime).toHaveLength(2);
    expect(titan.pairPayoff?.aggregate).toBeDefined();
  });

  test('seals failure-forward claims, release gates, and the accessible forest byte-for-byte', async () => {
    const value = await receipt();
    expect(value.status).toBe('result-generated-awaiting-post-write-integrity-verification');
    expect(value.verificationStatusAtGeneration).toBe('post-write-integrity-gate-required');
    expect(value.publicationStatusAtGeneration).toBe('not-yet-publication-ready');
    expect(value.indicatorOnly).toBe(true);
    expect(value.familyOutcomeCounts).toEqual({ evaluated: 4, passed: 1, failed: 3 });
    expect(value.claimOutcomeCounts).toEqual({
      authorizedEligibleClaims: 1,
      withheldEligibleClaims: 4,
    });

    expect(value.families.map(({ id, familyPass }) => [id, familyPass])).toEqual([
      ['ordinary-organisms', false],
      ['simple-mnist-ecology-predictor', false],
      ['petri-digital-biologics', false],
      ['titans', true],
    ]);
    expect(
      value.families.every(
        ({ matchedArmPass, rawRowReplayPass }) => matchedArmPass && rawRowReplayPass,
      ),
    ).toBe(true);
    expect(value.families.find(({ id }) => id === 'titans')?.authorizedClaims).toEqual([
      'game-policy semantic causality',
    ]);
    expect(
      value.families
        .filter(({ id }) => id !== 'titans')
        .every(({ authorizedClaims }) => authorizedClaims.length === 0),
    ).toBe(true);
    expect(value.numericalSafety.aggregateViolationCount).toBe(0);
    expect(value.numericalSafety.gateMet && value.numericalSafety.accepted).toBe(true);
    expect(
      Object.values(value.numericalSafety.familyScopes).every(
        ({ replayMatched, gateMet, accepted }) => replayMatched && gateMet && accepted,
      ),
    ).toBe(true);
    expect(value.performance.gates.accepted).toBe(true);
    expect(value.crossFamily).toMatchObject({
      status: 'not-evaluated',
      pooledPassAllowed: false,
      neuralCapacityRuleEvaluated: false,
    });
    expect(value.claims.gamePolicySemanticCausality).toBe(true);
    for (const forbidden of [
      'ordinarySemanticTaskResponse',
      'ordinaryRecurrentContextBenefit',
      'adaptiveNextCadencePressurePrediction',
      'ecologicalSemanticSelectionCausality',
      'neuralCapacityScaling',
      'pooledCrossFamilyNeuralScaling',
      'numericScoreUpliftAllowed',
      'v4VersusV3UpliftAllowed',
      'consciousnessUpliftAllowed',
      'sentienceUpliftAllowed',
      'generalIntelligenceClaimAllowed',
      'physicalQuantumClaimAllowed',
      'securityClaimAllowed',
    ]) {
      expect(value.claims[forbidden]).toBe(false);
    }

    expect(value.surrogateCalibrations.ordinaryActionDistribution).toMatchObject({
      actionVectorCount: 7680,
      nonZeroActionVectorCount: 7680,
      zeroActionVectorCount: 0,
      actionFrequency: 1,
    });
    expect(value.surrogateCalibrations.titanPooledPolicy).toMatchObject({
      cooperationRate: 0.2125,
      sourceMoveCount: 960,
    });
    expect(value.surrogateCalibrations.ordinaryActionDistribution.calibrationSha256).toMatch(
      SHA256,
    );
    expect(value.surrogateCalibrations.titanPooledPolicy.sourceMovesSha256).toMatch(SHA256);
    expect(value.surrogateCalibrations.titanPooledPolicy.contentHash).toMatch(SHA256);

    const forestRows: V4ForestRow[] = value.families.map((family) => ({
      family: family.id,
      label: family.label,
      controllerType: family.controllerType,
      neuralController: family.neuralController,
      contrast: family.weakestForestContrast.contrast,
      meanDelta: family.weakestForestContrast.meanDelta,
      lower95: family.weakestForestContrast.bootstrap95[0],
      upper95: family.weakestForestContrast.bootstrap95[1],
      holmSignFlipP: family.weakestForestContrast.holmSignFlipP,
      inferencePass: family.weakestForestContrast.inferencePass,
      familyPass: family.familyPass,
      claimAuthorized: family.authorizedClaims.length > 0,
    }));
    const forest = await Bun.file(resolve(ROOT, V4_RESULT_PATHS.forestSvg)).text();
    expect(forest).toBe(buildV4ForestSvg(forestRows, value.contentSha256));
    expect(forest).toContain('role="img"');
    expect(forest).toContain('<metadata>');
    expect(forest).toContain(value.contentSha256);
    expect(value.publication).toMatchObject({
      receipt: V4_RESULT_PATHS.receipt,
      rawCsv: V4_RESULT_PATHS.rawCsv,
      forestSvg: V4_RESULT_PATHS.forestSvg,
    });
  });
});
