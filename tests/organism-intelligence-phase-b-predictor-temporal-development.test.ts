import { beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ECOLOGY_TEMPORAL_ARMS,
  ECOLOGY_TEMPORAL_CONTROL_ARMS,
  ECOLOGY_TEMPORAL_DELAYS,
  ECOLOGY_TEMPORAL_GATE_THRESHOLDS,
  ECOLOGY_TEMPORAL_ORACLE_CROSS_ENTROPY,
  ECOLOGY_TEMPORAL_ORACLE_SSE,
  ECOLOGY_TEMPORAL_PRESENT_ONLY_CROSS_ENTROPY_FLOOR,
  ECOLOGY_TEMPORAL_PRESENT_ONLY_SSE_FLOOR,
  ecologyTemporalPredictionEvidence,
  exactOneSidedSignTestPValue,
  runEcologyTemporalDevelopment,
  type EcologyTemporalDevelopmentRow,
  type EcologyTemporalDevelopmentStudy,
} from '../scripts/organism-intelligence-phase-b/ecology-temporal-development';
import { PHASE_B_DEVELOPMENT_SEEDS } from '../scripts/organism-intelligence-phase-b/development-seeds';
import {
  canonicalizePhaseBEvidence,
  canonicalizePhaseBEvidenceNumber,
  PHASE_B_EVIDENCE_PRECISION_LAW,
} from '../scripts/organism-intelligence-phase-b/evidence-precision';

const SHA256 = /^[a-f\d]{64}$/;
const FOCUSED_OPTIONS = Object.freeze({
  trainingTaskSeeds: PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskTrain.slice(0, 2),
  taskSelectionSeeds: PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskSelection.slice(0, 2),
  taskValidationSeeds: PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskValidation.slice(0, 2),
  modelDevelopmentSeeds: PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelDevelopment.slice(0, 1),
  modelValidationSeeds: PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelValidation.slice(0, 1),
  trainingEpochs: 1,
  bootstrapReplicates: 100,
});

let study: EcologyTemporalDevelopmentStudy;

beforeAll(() => {
  study = runEcologyTemporalDevelopment(FOCUSED_OPTIONS);
});

function armRows(
  rows: readonly EcologyTemporalDevelopmentRow[],
  armId: EcologyTemporalDevelopmentRow['armId'],
): readonly EcologyTemporalDevelopmentRow[] {
  return rows.filter((row) => row.armId === armId);
}

describe('Phase-B temporal-identifiability development harness', () => {
  test('predeclares exact causal delays, analytic floors, arms, and strict thresholds', () => {
    expect(ECOLOGY_TEMPORAL_DELAYS).toEqual([2, 8, 16]);
    expect(ECOLOGY_TEMPORAL_PRESENT_ONLY_SSE_FLOOR).toBe(0.16);
    expect(ECOLOGY_TEMPORAL_PRESENT_ONLY_CROSS_ENTROPY_FLOOR).toBe(0.693_147);
    expect(ECOLOGY_TEMPORAL_ORACLE_SSE).toBe(0);
    expect(ECOLOGY_TEMPORAL_ORACLE_CROSS_ENTROPY).toBe(0.325_083);
    expect(PHASE_B_EVIDENCE_PRECISION_LAW).toEqual({
      id: 'phase-b-fixed-decimal-1e-6-v1',
      decimalPlaces: 6,
      absoluteQuantum: 1e-6,
      rawComputation: 'ieee-754-binary64',
      boundary: 'before-returned-rows-derived-statistics-gates-digests-json-csv-and-svg',
    });
    expect(canonicalizePhaseBEvidenceNumber(-0)).toBe(0);
    expect(canonicalizePhaseBEvidenceNumber(0.123_456_789_6)).toBe(0.123_457);
    expect(() => canonicalizePhaseBEvidenceNumber(Number.POSITIVE_INFINITY)).toThrow(
      'rejects non-finite',
    );
    expect(ECOLOGY_TEMPORAL_ARMS).toEqual([
      'v3-h8-identity-history',
      'v3-h8-history-zero-parameter-matched',
      'v3-h8-state-reset-before-query',
      'v3-h8-cue-ablated',
      'v3-h8-fixed-tap-derangement',
      'v3-h8-target-shuffled',
      'v2-h8',
      'current5-logistic',
      'persistence',
      'ewma-008',
      'constant-05',
      'causal-oracle',
    ]);
    expect(ECOLOGY_TEMPORAL_CONTROL_ARMS).toHaveLength(10);
    expect(ECOLOGY_TEMPORAL_GATE_THRESHOLDS).toEqual({
      meanSseGain: 0.04,
      medianModelGain: 0.03,
      everyDelayMeanGain: 0.02,
      meanTwinMargin: 0.2,
      orderingRate: 0.75,
      holmAdjustedPExclusiveMaximum: 0.01,
      bootstrap99LowerExclusiveMinimum: 0,
      worstModelGain: -0.01,
      rowsFilteredByOutcome: 0,
    });
  });

  test('canonicalizes forecast evidence only after raw endpoint-sensitive metrics are computed', () => {
    const target = 0.1;
    const rawPrediction = 0.999_999_6;
    const evidence = ecologyTemporalPredictionEvidence(target, rawPrediction);
    const rawCrossEntropy = -(
      target * Math.log(rawPrediction) +
      (1 - target) * Math.log(1 - rawPrediction)
    );
    const roundedFirstCrossEntropy = -(
      target * Math.log(1 - 1e-12) +
      (1 - target) * Math.log(1e-12)
    );

    expect(evidence.prediction).toBe(1);
    expect(evidence.squaredError).toBe(
      canonicalizePhaseBEvidenceNumber((target - rawPrediction) ** 2),
    );
    expect(evidence.squaredError).toBe(0.809_999);
    expect(evidence.crossEntropy).toBe(canonicalizePhaseBEvidenceNumber(rawCrossEntropy));
    expect(evidence.crossEntropy).toBe(13.258_621);
    expect(roundedFirstCrossEntropy - evidence.crossEntropy).toBeGreaterThan(11);
  });

  test('is deterministic and invariant to caller seed ordering', () => {
    const replay = runEcologyTemporalDevelopment(FOCUSED_OPTIONS);
    const reordered = runEcologyTemporalDevelopment({
      ...FOCUSED_OPTIONS,
      trainingTaskSeeds: [...FOCUSED_OPTIONS.trainingTaskSeeds].reverse(),
      taskSelectionSeeds: [...FOCUSED_OPTIONS.taskSelectionSeeds].reverse(),
      taskValidationSeeds: [...FOCUSED_OPTIONS.taskValidationSeeds].reverse(),
    });
    expect(replay).toEqual(study);
    expect(reordered).toEqual(study);
    expect(study.summary.seedFamiliesSha256).toMatch(SHA256);
    expect(study.summary.configurationSha256).toMatch(SHA256);
    expect(study.summary.rowsSha256).toMatch(SHA256);
  });

  test('retains every configured row in both development roles without outcome filtering', () => {
    const expectedRows =
      (FOCUSED_OPTIONS.modelDevelopmentSeeds.length * FOCUSED_OPTIONS.taskSelectionSeeds.length +
        FOCUSED_OPTIONS.modelValidationSeeds.length * FOCUSED_OPTIONS.taskValidationSeeds.length) *
      ECOLOGY_TEMPORAL_DELAYS.length *
      2 *
      ECOLOGY_TEMPORAL_ARMS.length;
    expect(expectedRows).toBe(288);
    expect(study.rows).toHaveLength(expectedRows);
    expect(study.summary).toMatchObject({
      schemaVersion: 2,
      studyId: 'tsotchke-ecology-temporal-identifiability-phase-b-development-v2',
      evidencePrecisionLaw: PHASE_B_EVIDENCE_PRECISION_LAW,
      developmentOnly: true,
      claimAllowed: false,
      trainingEpochs: 1,
      trainingTaskSeedCount: 2,
      modelSeedCount: 2,
      evaluationTaskSeedCount: 4,
      roleCount: 2,
      inferenceScope: 'fixed-configuration-validation-only',
      inferenceRowCount: expectedRows / 2,
      delayCount: 3,
      armCount: 12,
      rowCount: expectedRows,
      retention: {
        configuredRows: expectedRows,
        retainedRows: expectedRows,
        rowsFilteredByOutcome: 0,
      },
    });
    expect(study.summary.targetShuffle).toMatchObject({
      method: 'fault-seed-fisher-yates-permutation',
    });
    expect(canonicalizePhaseBEvidence(study)).toEqual(study);
    expect(study.summary.targetShuffle.seedSha256).toMatch(SHA256);
    expect(study.summary.targetShuffle.permutationSha256).toMatch(SHA256);
    expect(study.summary.targetShuffle.sameLabelFraction).toBeGreaterThan(0);
    expect(study.summary.targetShuffle.sameLabelFraction).toBeLessThan(1);
    expect(study.rows.filter((row) => row.seedRole === 'mechanism-development')).toHaveLength(
      expectedRows / 2,
    );
    expect(
      study.rows.filter((row) => row.seedRole === 'fixed-configuration-validation'),
    ).toHaveLength(expectedRows / 2);
  });

  test('constructs counterbalanced twins with byte-identical terminal inputs and no label leakage', () => {
    for (const row of study.rows) {
      const [match, mismatch] = row.samples;
      expect(row.developmentOnly).toBe(true);
      expect(row.claimAllowed).toBe(false);
      expect(row.terminalCurrentInputsByteIdentical).toBe(true);
      expect(match.queryInputSha256).toBe(mismatch.queryInputSha256);
      expect(row.terminalCurrentInputSha256).toBe(match.queryInputSha256);
      expect(match.target).toBe(0.9);
      expect(mismatch.target).toBe(0.1);
      expect(match.cueBit).toBe(row.queryBit);
      expect(mismatch.cueBit).toBe((1 - row.queryBit) as 0 | 1);
      expect(row.neutralFrameCount).toBe((row.delay - 1) as 1 | 7 | 15);
      expect(row.discardedPreQueryForecasts).toBe(row.delay * 2);
      expect(row.discardedQueryForecasts).toBe(2);
      expect(row.evaluationWeightsFrozen).toBe(true);
      expect(row.evaluationObservationCount).toBe(0);
      expect(row.taskProtocolSha256).toMatch(SHA256);
      expect(row.taskProfileSha256).toMatch(SHA256);
      expect(row.armProtocolSha256).toMatch(SHA256);
      expect(row.frozenModelSha256).toMatch(SHA256);
    }
  });

  test('realizes exact present-only and causal-oracle reference behavior', () => {
    for (const row of armRows(study.rows, 'constant-05')) {
      expect(row.samples[0].prediction).toBe(0.5);
      expect(row.samples[1].prediction).toBe(0.5);
      expect(row.metrics.meanSquaredError).toBeCloseTo(ECOLOGY_TEMPORAL_PRESENT_ONLY_SSE_FLOOR, 15);
      expect(row.metrics.meanCrossEntropy).toBe(ECOLOGY_TEMPORAL_PRESENT_ONLY_CROSS_ENTROPY_FLOOR);
      expect(row.metrics.twinPredictionMargin).toBe(0);
      expect(row.metrics.orderingCorrect).toBe(0);
    }
    for (const row of armRows(study.rows, 'causal-oracle')) {
      expect(row.samples[0].prediction).toBe(0.9);
      expect(row.samples[1].prediction).toBe(0.1);
      expect(row.metrics.meanSquaredError).toBe(ECOLOGY_TEMPORAL_ORACLE_SSE);
      expect(row.metrics.meanCrossEntropy).toBe(ECOLOGY_TEMPORAL_ORACLE_CROSS_ENTROPY);
      expect(row.metrics.twinPredictionMargin).toBeCloseTo(0.8, 15);
      expect(row.metrics.orderingCorrect).toBe(1);
    }
  });

  test('makes all present-only and state-erasure controls predict identically across each twin', () => {
    const presentOnlyArms: readonly EcologyTemporalDevelopmentRow['armId'][] = [
      'v3-h8-history-zero-parameter-matched',
      'v3-h8-state-reset-before-query',
      'v3-h8-cue-ablated',
      'v2-h8',
      'current5-logistic',
      'persistence',
      'ewma-008',
      'constant-05',
    ];
    for (const armId of presentOnlyArms) {
      for (const row of armRows(study.rows, armId)) {
        expect(row.samples[0].prediction).toBe(row.samples[1].prediction);
        expect(row.metrics.twinPredictionMargin).toBe(0);
        if (armId === 'persistence' || armId === 'ewma-008' || armId === 'constant-05') {
          expect(row.samples[0].prediction).toBe(0.5);
        }
      }
    }
    const primary = armRows(study.rows, 'v3-h8-identity-history');
    const parameterMatched = armRows(study.rows, 'v3-h8-history-zero-parameter-matched');
    expect(
      primary.every(
        (row) => row.allocatedParameterCount === 926 && row.gradientReachableParameterCount === 926,
      ),
    ).toBe(true);
    expect(
      parameterMatched.every(
        (row) => row.allocatedParameterCount === 926 && row.gradientReachableParameterCount === 62,
      ),
    ).toBe(true);
    expect(armRows(study.rows, 'v2-h8')[0]).toMatchObject({
      allocatedParameterCount: 98,
      gradientReachableParameterCount: 62,
    });
    expect(armRows(study.rows, 'current5-logistic')[0]).toMatchObject({
      allocatedParameterCount: 6,
      gradientReachableParameterCount: 6,
    });
  });

  test('builds a genuinely distinct seed-derived task profile for every configured task seed', () => {
    expect(study.summary.taskProfileUniqueness).toMatchObject({
      configuredTaskSeedCount: 6,
      uniqueTaskProfileCount: 6,
      allTaskProfilesUnique: true,
    });
    expect(study.summary.taskProfileUniqueness.profileFamilySha256).toMatch(SHA256);
    const rowProfileByTaskSeed = new Map<number, string>();
    for (const row of study.rows) {
      const prior = rowProfileByTaskSeed.get(row.taskSeed);
      if (prior === undefined) rowProfileByTaskSeed.set(row.taskSeed, row.taskProfileSha256);
      else expect(row.taskProfileSha256).toBe(prior);
    }
    expect(new Set(rowProfileByTaskSeed.values()).size).toBe(rowProfileByTaskSeed.size);
  });

  test('computes the exact sign-test upper tail even below the null median', () => {
    expect(exactOneSidedSignTestPValue([-1, -1, 1])).toBeCloseTo(7 / 8, 15);
    expect(exactOneSidedSignTestPValue([-1, 1, 1])).toBeCloseTo(1 / 2, 15);
    expect(exactOneSidedSignTestPValue([1, 1, 1])).toBeCloseTo(1 / 8, 15);
    expect(exactOneSidedSignTestPValue([-1, 0, 1])).toBeCloseTo(3 / 4, 15);
    expect(exactOneSidedSignTestPValue([0, 0])).toBe(1);
  });

  test('reports paired causal contrasts, Holm correction, bootstrap bounds, and the full gate', () => {
    const contrasts = study.summary.pairedControlContrasts;
    const primaryRowCount = armRows(
      study.rows.filter((row) => row.seedRole === 'fixed-configuration-validation'),
      'v3-h8-identity-history',
    ).length;
    expect(contrasts.map((contrast) => contrast.controlArmId)).toEqual([
      ...ECOLOGY_TEMPORAL_CONTROL_ARMS,
    ]);
    for (const contrast of contrasts) {
      expect(contrast.inferenceSeedRole).toBe('fixed-configuration-validation');
      expect(contrast.pairedRowCount).toBe(primaryRowCount);
      expect(Object.keys(contrast.delayMeanGains).sort()).toEqual(['16', '2', '8']);
      expect(Number.isFinite(contrast.meanSseGain)).toBe(true);
      expect(Number.isFinite(contrast.medianModelGain)).toBe(true);
      expect(Number.isFinite(contrast.bootstrap99Lower)).toBe(true);
      expect(contrast.oneSidedSignTestPValue).toBeGreaterThanOrEqual(0);
      expect(contrast.oneSidedSignTestPValue).toBeLessThanOrEqual(1);
      expect(contrast.holmAdjustedPValue).toBeGreaterThanOrEqual(contrast.oneSidedSignTestPValue);
      expect(contrast.holmAdjustedPValue).toBeLessThanOrEqual(1);
    }
    expect(study.summary.advancementGate.thresholds).toEqual(ECOLOGY_TEMPORAL_GATE_THRESHOLDS);
    expect(study.summary.advancementGate.observed.rowsFilteredByOutcome).toBe(0);
    expect(study.summary.advancementGate.passed).toBe(
      contrasts.every((contrast) => contrast.passes) &&
        study.summary.advancementGate.failedCriteria.length === 0,
    );
  });

  test('never converts a development result into a confirmatory claim', () => {
    expect(study.summary.claimAllowed).toBe(false);
    if (study.summary.advancementGate.passed) {
      expect(study.summary.conclusion).toBe(
        'development-gate-passed-confirmatory-protocol-still-required',
      );
    } else {
      expect(study.summary.conclusion).toBe('development-gate-failed-no-advancement');
      expect(study.summary.advancementGate.failedCriteria.length).toBeGreaterThan(0);
    }
  });

  test('pins the exact sealed default result and its honest failed gate', () => {
    const sealed = runEcologyTemporalDevelopment();
    expect(sealed.summary).toMatchObject({
      rowCount: 46_080,
      inferenceRowCount: 36_864,
      conclusion: 'development-gate-failed-no-advancement',
      developmentOnly: true,
      claimAllowed: false,
      seedFamiliesSha256: 'a14179926f8fd43041b773790dc3bd62dcc5dc5bafc41db4a86fe4ea03794688',
      configurationSha256: 'e9d41c9ed838375f848867fd05e71ee895868feb8b5d64044a9015bf6ec73479',
      rowsSha256: '241f61fee25f4d48462135083cecedd55cd60f36178dacd56a843de6121226c4',
      retention: {
        configuredRows: 46_080,
        retainedRows: 46_080,
        rowsFilteredByOutcome: 0,
      },
      targetShuffle: {
        method: 'fault-seed-fisher-yates-permutation',
        seedSha256: 'e26692994b49a18ab8cd70aeed895ae8d70258600b2e8ae04caebb1de8fa903b',
        permutationSha256: '1b794303fd09d8267da434452afa3044fdbc5342f2ed096755d5a2ad462d8170',
        sameLabelFraction: 0.510417,
      },
      taskProfileUniqueness: {
        configuredTaskSeedCount: 80,
        uniqueTaskProfileCount: 80,
        allTaskProfilesUnique: true,
        profileFamilySha256: '06ebbf60d95c3d09277f350b3ea768fdd0dfb97b86fea02a66efe7946fc3e6a2',
      },
    });
    expect(sealed.summary.advancementGate.passed).toBe(false);
    expect(sealed.summary.advancementGate.failedCriteria).toEqual([
      'mean-sse-gain',
      'median-model-gain',
      'every-delay-mean-gain',
      'twin-margin',
      'ordering-rate',
      'holm-adjusted-p',
      'bootstrap-99-lower',
      'worst-model-gain',
    ]);
    const { observed, thresholds } = sealed.summary.advancementGate;
    const sealedGateMargins = [
      Math.abs(observed.minimumControlMeanSseGain - thresholds.meanSseGain),
      Math.abs(observed.minimumControlMedianModelGain - thresholds.medianModelGain),
      Math.abs(observed.minimumDelayMeanSseGain - thresholds.everyDelayMeanGain),
      Math.abs(observed.meanTwinMargin - thresholds.meanTwinMargin),
      Math.abs(observed.orderingRate - thresholds.orderingRate),
      Math.abs(observed.maximumHolmAdjustedPValue - thresholds.holmAdjustedPExclusiveMaximum),
      Math.abs(observed.minimumBootstrap99Lower - thresholds.bootstrap99LowerExclusiveMinimum),
      Math.abs(observed.worstModelGain - thresholds.worstModelGain),
    ];
    expect(sealedGateMargins).toHaveLength(8);
    for (const margin of sealedGateMargins) {
      expect(margin).toBeGreaterThan(PHASE_B_EVIDENCE_PRECISION_LAW.absoluteQuantum);
    }
    const primary = sealed.rows.filter(
      (row) =>
        row.seedRole === 'fixed-configuration-validation' && row.armId === 'v3-h8-identity-history',
    );
    expect(primary).toHaveLength(3_072);
    expect(
      canonicalizePhaseBEvidenceNumber(
        primary.reduce((total, row) => total + row.metrics.meanSquaredError, 0) / primary.length,
      ),
    ).toBe(0.168091);
    expect(
      canonicalizePhaseBEvidenceNumber(
        primary.reduce((total, row) => total + row.metrics.meanCrossEntropy, 0) / primary.length,
      ),
    ).toBe(0.71026);
    expect(sealed.summary.advancementGate.observed.meanTwinMargin).toBe(0.000118);
    expect(sealed.summary.advancementGate.observed.orderingRate).toBe(0.5);
  }, 30_000);

  test('rejects unsealed seed substitutions and unsafe workload controls', () => {
    const taskTrainSeed = PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskTrain[0] as number;
    expect(() => runEcologyTemporalDevelopment({ ...FOCUSED_OPTIONS, trainingEpochs: 0 })).toThrow(
      'trainingEpochs',
    );
    expect(() =>
      runEcologyTemporalDevelopment({ ...FOCUSED_OPTIONS, bootstrapReplicates: 99 }),
    ).toThrow('bootstrapReplicates');
    expect(() =>
      runEcologyTemporalDevelopment({ ...FOCUSED_OPTIONS, trainingTaskSeeds: [] }),
    ).toThrow('at least one seed');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        trainingTaskSeeds: [PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelDevelopment[0] as number],
      }),
    ).toThrow('outside sealed family predictorV3TaskTrain');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        taskSelectionSeeds: [taskTrainSeed],
      }),
    ).toThrow('outside sealed family predictorV3TaskSelection');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        taskValidationSeeds: [taskTrainSeed],
      }),
    ).toThrow('outside sealed family predictorV3TaskValidation');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        modelDevelopmentSeeds: [taskTrainSeed],
      }),
    ).toThrow('outside sealed family predictorV3ModelDevelopment');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        modelValidationSeeds: [taskTrainSeed],
      }),
    ).toThrow('outside sealed family predictorV3ModelValidation');
    expect(() =>
      runEcologyTemporalDevelopment({
        ...FOCUSED_OPTIONS,
        targetShuffleSeed: taskTrainSeed,
      }),
    ).toThrow('outside sealed family predictorV3Fault');
  });

  test('keeps the runner development-only and free of filesystem mutation', () => {
    const source = readFileSync(
      resolve('scripts/organism-intelligence-phase-b/ecology-temporal-development.ts'),
      'utf8',
    );
    expect(source).toContain('developmentOnly: true');
    expect(source).toContain('claimAllowed: false');
    expect(source).toContain('discardPending()');
    expect(source).not.toContain('writeFile');
    expect(source).not.toContain('mkdir');
    expect(source).not.toContain('appendFile');
  });
});
