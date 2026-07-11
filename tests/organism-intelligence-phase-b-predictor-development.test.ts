import { beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createEcologyDevelopmentSchedule,
  ECOLOGY_DEVELOPMENT_ARMS,
  ECOLOGY_DEVELOPMENT_CADENCES,
  ECOLOGY_DEVELOPMENT_HASH_PROJECTION_LAW,
  ECOLOGY_DEVELOPMENT_SEED_ROLES,
  ECOLOGY_DEVELOPMENT_TASKS,
  runEcologyPredictorDevelopment,
  type EcologyDevelopmentRow,
  type EcologyDevelopmentStudy,
} from '../scripts/organism-intelligence-phase-b/ecology-development';
import {
  HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS,
  PHASE_B_DEVELOPMENT_SEEDS,
} from '../scripts/organism-intelligence-phase-b/development-seeds';

const DEVELOPMENT_SEED_COUNT = 48;
const VALIDATION_SEED_COUNT = 16;
const TOTAL_SEED_COUNT = DEVELOPMENT_SEED_COUNT + VALIDATION_SEED_COUNT;
const EXPECTED_ROWS =
  TOTAL_SEED_COUNT * ECOLOGY_DEVELOPMENT_TASKS.length * ECOLOGY_DEVELOPMENT_ARMS.length;
const SHA256 = /^[a-f\d]{64}$/;

let study: EcologyDevelopmentStudy;

// This 4,224-row matrix is computed once for the file; parallel coverage can exceed Bun's 5s default.
beforeAll(() => {
  study = runEcologyPredictorDevelopment();
}, 20_000);

const scheduleKey = (row: EcologyDevelopmentRow): string =>
  `${row.seedRole}/${row.taskId}/${row.seed}`;

function rowsBySchedule(
  rows: readonly EcologyDevelopmentRow[],
): Map<string, EcologyDevelopmentRow[]> {
  const grouped = new Map<string, EcologyDevelopmentRow[]>();
  for (const row of rows) {
    const key = scheduleKey(row);
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }
  return grouped;
}

function rowFor(
  rows: readonly EcologyDevelopmentRow[],
  taskId: EcologyDevelopmentRow['taskId'],
  seed: number,
  armId: EcologyDevelopmentRow['armId'],
  seedRole: EcologyDevelopmentRow['seedRole'] = 'mechanism-development',
): EcologyDevelopmentRow {
  const row = rows.find(
    (candidate) =>
      candidate.seedRole === seedRole &&
      candidate.taskId === taskId &&
      candidate.seed === seed &&
      candidate.armId === armId,
  );
  if (row === undefined) throw new Error(`missing row ${seedRole}/${taskId}/${seed}/${armId}`);
  return row;
}

describe('Phase-B ecology predictor development matrix', () => {
  test('is deterministic, seed-order invariant, and retains every configured row', () => {
    const seeds = PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment.slice(0, 2);
    const first = runEcologyPredictorDevelopment({ seeds });
    const replay = runEcologyPredictorDevelopment({ seeds });
    const reordered = runEcologyPredictorDevelopment({ seeds: [...seeds].reverse() });

    expect(replay).toEqual(first);
    for (const row of first.rows) {
      expect(
        reordered.rows.find(
          (candidate) =>
            candidate.taskId === row.taskId &&
            candidate.seed === row.seed &&
            candidate.armId === row.armId,
        ),
      ).toEqual(row);
    }
    const configuredRows =
      seeds.length * ECOLOGY_DEVELOPMENT_TASKS.length * ECOLOGY_DEVELOPMENT_ARMS.length;
    expect(first.summary.retention).toEqual({
      configuredRows,
      retainedRows: configuredRows,
      rowsFilteredByOutcome: 0,
    });
  });

  test('runs 48 mechanism-development seeds then 16 fixed-configuration validation seeds', () => {
    expect(PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment).toHaveLength(DEVELOPMENT_SEED_COUNT);
    expect(PHASE_B_DEVELOPMENT_SEEDS.predictorCalibration).toHaveLength(VALIDATION_SEED_COUNT);
    expect(ECOLOGY_DEVELOPMENT_TASKS).toHaveLength(6);
    expect(ECOLOGY_DEVELOPMENT_ARMS).toHaveLength(11);
    expect(ECOLOGY_DEVELOPMENT_SEED_ROLES).toEqual([
      'mechanism-development',
      'fixed-configuration-validation',
    ]);
    expect(EXPECTED_ROWS).toBe(4_224);
    expect(study.rows).toHaveLength(EXPECTED_ROWS);
    expect(study.summary).toMatchObject({
      schemaVersion: 2,
      developmentOnly: true,
      claimAllowed: false,
      cadenceCount: ECOLOGY_DEVELOPMENT_CADENCES,
      seedCount: TOTAL_SEED_COUNT,
      mechanismDevelopmentSeedCount: DEVELOPMENT_SEED_COUNT,
      fixedConfigurationValidationSeedCount: VALIDATION_SEED_COUNT,
      seedRoleCount: 2,
      taskCount: 6,
      armCount: 11,
      rowCount: EXPECTED_ROWS,
      retention: {
        configuredRows: EXPECTED_ROWS,
        retainedRows: EXPECTED_ROWS,
        rowsFilteredByOutcome: 0,
      },
    });
    expect(study.summary.aggregates).toHaveLength(2 * 6 * 11);

    const developmentRows = study.rows.filter((row) => row.seedRole === 'mechanism-development');
    const validationRows = study.rows.filter(
      (row) => row.seedRole === 'fixed-configuration-validation',
    );
    expect(developmentRows).toHaveLength(DEVELOPMENT_SEED_COUNT * 6 * 11);
    expect(validationRows).toHaveLength(VALIDATION_SEED_COUNT * 6 * 11);
    expect(study.rows.findIndex((row) => row.seedRole === 'fixed-configuration-validation')).toBe(
      developmentRows.length,
    );
    expect(
      new Set(developmentRows.map((row) => row.seed)).intersection(
        new Set(validationRows.map((row) => row.seed)),
      ).size,
    ).toBe(0);
    for (const aggregate of study.summary.aggregates) {
      expect(aggregate.rowCount).toBe(
        aggregate.seedRole === 'mechanism-development'
          ? DEVELOPMENT_SEED_COUNT
          : VALIDATION_SEED_COUNT,
      );
    }
  });

  test('contains every role x seed x task x arm tuple exactly once with stable hashes', () => {
    const keys = new Set(
      study.rows.map((row) => `${row.seedRole}/${row.taskId}/${row.seed}/${row.armId}`),
    );
    expect(keys.size).toBe(EXPECTED_ROWS);
    expect(study.summary.seedFamilySha256).toMatch(SHA256);
    expect(study.summary.configurationSha256).toMatch(SHA256);
    expect(study.summary.rowsSha256).toMatch(SHA256);
    expect(study.summary.seedFamilySha256).toBe(
      '83a7302638d51b9b7101475be938641dfc13c7e0ef186ea2a2a2aa97d79a319a',
    );
    expect(study.summary.configurationSha256).toBe(
      '7f4b711c619435e10d6c23a627ca3ccdbe22b41ad3ea828ce7f9ccef284898fe',
    );
    expect(study.summary.rowsSha256).toBe(
      '309b6b4eff1b5fadacf6184e6436551148f05a0fa0495991b17b44000d95fe53',
    );
    expect(study.summary.hashProjectionLaw).toEqual(ECOLOGY_DEVELOPMENT_HASH_PROJECTION_LAW);
    expect(study.summary.hashProjectionLaw).toEqual({
      id: 'ecology-development-hash-fixed-decimal-1e-9-v1',
      decimalPlaces: 9,
      absoluteQuantum: 1e-9,
      rawComputation: 'ieee-754-binary64',
      boundary:
        'hash-only-input-target-gradient-stream-receipts-and-rows-sha256; returned-study-values-unrounded',
    });
    expect(
      study.rows.some(
        (row) =>
          row.metrics.softTargetSquaredError !==
          Number(row.metrics.softTargetSquaredError.toFixed(9)),
      ),
    ).toBe(true);

    for (const row of study.rows) {
      expect(row.taskSha256).toMatch(SHA256);
      expect(row.seedRoleSha256).toMatch(SHA256);
      expect(row.armSha256).toMatch(SHA256);
      expect(row.seedSha256).toMatch(SHA256);
      expect(row.scheduleSha256).toMatch(SHA256);
      expect(row.inputSha256).toMatch(SHA256);
      expect(row.trueScoringTargetSha256).toMatch(SHA256);
      expect(row.revealedFeedbackOutcomeSha256).toMatch(SHA256);
      expect(row.feedbackMaskSha256).toMatch(SHA256);
      expect(row.gradientTargetSha256).toMatch(SHA256);
    }
    for (const armId of ECOLOGY_DEVELOPMENT_ARMS) {
      expect(
        new Set(study.rows.filter((row) => row.armId === armId).map((row) => row.armSha256)).size,
      ).toBe(1);
    }
  });

  test('rejects historical, duplicate, empty, invalid-task, and undersized invocations', () => {
    const historical = HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS[0];
    const valid = PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment[0];
    if (historical === undefined || valid === undefined) throw new Error('seed fixture is empty');
    expect(() => runEcologyPredictorDevelopment({ seeds: [historical] })).toThrow(
      /overlaps a V1-V4 evidence family/,
    );
    expect(() => createEcologyDevelopmentSchedule('abrupt-seed-drift', historical)).toThrow(
      /overlaps a V1-V4 evidence family/,
    );
    expect(() => runEcologyPredictorDevelopment({ seeds: [valid, valid] })).toThrow(/overlaps/);
    expect(() => runEcologyPredictorDevelopment({ seeds: [] })).toThrow(/at least one seed/);
    expect(() => runEcologyPredictorDevelopment({ seeds: [valid], cadenceCount: 511 })).toThrow(
      /at least 512 cadences/,
    );
    expect(() => createEcologyDevelopmentSchedule('unknown' as never, valid)).toThrow(
      /unknown ecology development task/,
    );
  });

  test('domain-separates model and reservoir seeds from task, historical, and predefined families', () => {
    const predefined = new Set(Object.values(PHASE_B_DEVELOPMENT_SEEDS).flat());
    const historical = new Set(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS);
    for (const rows of rowsBySchedule(study.rows).values()) {
      const modelRows = rows.filter(
        (row) => row.modelFamily === 'v2-neural' || row.modelFamily === 'online-logistic',
      );
      expect(modelRows).toHaveLength(9);
      expect(new Set(modelRows.map((row) => row.modelSeed)).size).toBe(1);
      const modelSeed = modelRows[0]?.modelSeed;
      if (modelSeed === null || modelSeed === undefined) throw new Error('model seed missing');
      expect(modelSeed).not.toBe(rows[0]?.seed);
      expect(predefined.has(modelSeed)).toBe(false);
      expect(historical.has(modelSeed)).toBe(false);
      expect(modelRows.every((row) => row.modelSeedSha256?.match(SHA256))).toBe(true);

      const reservoir = rows.find(
        (row) => row.armId === 'v2-h8-causal-reservoir-lag-gradient-target',
      );
      if (reservoir?.gradientTargetSeed === null || reservoir?.gradientTargetSeed === undefined) {
        throw new Error('reservoir target seed missing');
      }
      expect(reservoir.gradientTargetSeed).not.toBe(modelSeed);
      expect(predefined.has(reservoir.gradientTargetSeed)).toBe(false);
      expect(historical.has(reservoir.gradientTargetSeed)).toBe(false);
      expect(reservoir.gradientTargetSeedSha256).toMatch(SHA256);
      expect(
        rows
          .filter((row) => row.armId !== 'v2-h8-causal-reservoir-lag-gradient-target')
          .every((row) => row.gradientTargetSeed === null && row.gradientTargetSeedSha256 === null),
      ).toBe(true);
    }
  });

  test('keeps all eleven arms on matched schedules, outcomes, and feedback budgets', () => {
    const grouped = rowsBySchedule(study.rows);
    expect(grouped.size).toBe(TOTAL_SEED_COUNT * 6);
    for (const rows of grouped.values()) {
      expect(rows).toHaveLength(11);
      for (const field of [
        'taskSha256',
        'seedRoleSha256',
        'seedSha256',
        'scheduleSha256',
        'inputSha256',
        'trueScoringTargetSha256',
        'revealedFeedbackOutcomeSha256',
        'feedbackMaskSha256',
        'cadenceCount',
        'forecastCount',
        'scoreCount',
        'feedbackCount',
        'missingFeedbackCount',
      ] as const) {
        expect(new Set(rows.map((row) => row[field])).size).toBe(1);
      }
      expect(new Set(rows.map((row) => JSON.stringify(row.changePoints))).size).toBe(1);
      expect(new Set(rows.map((row) => JSON.stringify(row.recoveryAnchors))).size).toBe(1);
      expect(rows.every((row) => row.forecastCount === 512 && row.scoreCount === 512)).toBe(true);
      expect(rows.every((row) => row.feedbackCount + row.missingFeedbackCount === 512)).toBe(true);
      expect(new Set(rows.map((row) => row.armId)).size).toBe(11);
    }
  });

  test('schedule prefixes are invariant and gradual recovery starts after the 144-step transition', () => {
    const seed = PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment[0];
    if (seed === undefined) throw new Error('predictor development family is empty');
    for (const taskId of ECOLOGY_DEVELOPMENT_TASKS) {
      const short = createEcologyDevelopmentSchedule(taskId, seed, 512);
      const extended = createEcologyDevelopmentSchedule(taskId, seed, 768);
      expect(extended.changePoints).toEqual(short.changePoints);
      expect(extended.recoveryAnchors).toEqual(short.recoveryAnchors);
      for (let cadence = 0; cadence < 512; cadence++) {
        const shortInput = short.inputAt(cadence);
        const extendedInput = extended.inputAt(cadence);
        expect(extendedInput).toEqual(shortInput);
        expect(extended.elapsedCadenceAt(cadence)).toBe(short.elapsedCadenceAt(cadence));
        expect(extended.feedbackAvailableAt(cadence)).toBe(short.feedbackAvailableAt(cadence));
        expect(extended.labelAt(cadence, extendedInput)).toBe(short.labelAt(cadence, shortInput));
      }
    }
    const gradual = createEcologyDevelopmentSchedule('gradual-drift', seed);
    expect(gradual.recoveryAnchors[0]).toBe((gradual.changePoints[0] ?? 0) + 144);
  });

  test('uses 512 forecast indices while missing feedback and elapsed-time jumps remain distinct', () => {
    const missingRows = study.rows.filter(
      (row) => row.taskId === 'missing-feedback-irregular-elapsed-time',
    );
    expect(missingRows).toHaveLength(TOTAL_SEED_COUNT * 11);
    expect(missingRows.every((row) => row.scoreCount === 512)).toBe(true);
    expect(
      missingRows.every((row) => row.feedbackCount < 512 && row.missingFeedbackCount > 0),
    ).toBe(true);
    expect(
      study.rows
        .filter((row) => row.taskId !== 'missing-feedback-irregular-elapsed-time')
        .every((row) => row.feedbackCount === 512 && row.missingFeedbackCount === 0),
    ).toBe(true);

    const seed = PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment[0];
    if (seed === undefined) throw new Error('predictor development family is empty');
    const schedule = createEcologyDevelopmentSchedule(
      'missing-feedback-irregular-elapsed-time',
      seed,
    );
    expect(schedule.elapsedCadenceAt(511)).toBeGreaterThan(511);
  });

  test('separates immutable revealed outcomes from causal reservoir-lag gradient targets', () => {
    const seed = PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment[0];
    if (seed === undefined) throw new Error('predictor development family is empty');
    const direct = rowFor(study.rows, 'stationary-soft-pressure', seed, 'v2-h8-adaptive');
    const ablated = rowFor(
      study.rows,
      'stationary-soft-pressure',
      seed,
      'v2-h8-temporal-inputs-ablated',
    );
    const reservoir = rowFor(
      study.rows,
      'stationary-soft-pressure',
      seed,
      'v2-h8-causal-reservoir-lag-gradient-target',
    );
    expect(ablated.trueScoringTargetSha256).toBe(direct.trueScoringTargetSha256);
    expect(ablated.revealedFeedbackOutcomeSha256).toBe(direct.revealedFeedbackOutcomeSha256);
    expect(ablated.gradientTargetSha256).toBe(direct.gradientTargetSha256);
    expect(direct.gradientTargetSha256).toBe(direct.revealedFeedbackOutcomeSha256);
    expect(reservoir.trueScoringTargetSha256).toBe(direct.trueScoringTargetSha256);
    expect(reservoir.revealedFeedbackOutcomeSha256).toBe(direct.revealedFeedbackOutcomeSha256);
    expect(reservoir.gradientTargetSha256).not.toBe(direct.gradientTargetSha256);
    expect(reservoir.gradientTargetSeedSha256).toMatch(SHA256);
  });

  test('reports fixed weights, allocated parameters, online-updated scalars, and update steps separately', () => {
    for (const rows of rowsBySchedule(study.rows).values()) {
      const frozen = rows.find((row) => row.armId === 'v2-h8-frozen-weights');
      const adaptive = rows.find((row) => row.armId === 'v2-h8-adaptive');
      if (frozen === undefined || adaptive === undefined) throw new Error('H8 arm missing');
      expect(frozen.allocatedParameterCount).toBe(98);
      expect(frozen.onlineUpdatedParameterCount).toBe(0);
      expect(frozen.updateCount).toBe(0);
      expect(frozen.maxOptimizerAccumulator).toBe(0);
      expect(adaptive.allocatedParameterCount).toBe(98);
      expect(adaptive.onlineUpdatedParameterCount).toBe(98);
      expect(adaptive.updateCount).toBe(adaptive.feedbackCount);
    }
  });

  test('adds deterministic bounded current-five and temporal-nine online logistic controls', () => {
    for (const rows of rowsBySchedule(study.rows).values()) {
      const current = rows.find((row) => row.armId === 'logistic-current5-adaptive');
      const temporal = rows.find((row) => row.armId === 'logistic-temporal9-adaptive');
      if (current === undefined || temporal === undefined)
        throw new Error('logistic control missing');
      expect(current.modelFamily).toBe('online-logistic');
      expect(current.modelInputCount).toBe(5);
      expect(current.allocatedParameterCount).toBe(6);
      expect(current.onlineUpdatedParameterCount).toBe(6);
      expect(current.updateCount).toBe(current.feedbackCount);
      expect(temporal.modelInputCount).toBe(9);
      expect(temporal.allocatedParameterCount).toBe(10);
      expect(temporal.onlineUpdatedParameterCount).toBe(10);
      expect(temporal.updateCount).toBe(temporal.feedbackCount);
      for (const row of [current, temporal]) {
        expect(row.maxAbsoluteParameter).toBeLessThanOrEqual(row.parameterAbsoluteLimit);
        expect(row.maxOptimizerAccumulator).toBeGreaterThanOrEqual(0);
        expect(row.maxOptimizerAccumulator).toBeLessThanOrEqual(1);
      }
    }
  });

  test('qualifies all soft-target metrics and keeps every value finite and bounded', () => {
    for (const row of study.rows) {
      const metrics = row.metrics;
      expect(Number.isFinite(metrics.softTargetSquaredError)).toBe(true);
      expect(metrics.softTargetSquaredError).toBeGreaterThanOrEqual(0);
      expect(metrics.softTargetSquaredError).toBeLessThanOrEqual(1);
      expect(Number.isFinite(metrics.softTargetCalibrationGap)).toBe(true);
      expect(metrics.softTargetCalibrationGap).toBeGreaterThanOrEqual(0);
      expect(metrics.softTargetCalibrationGap).toBeLessThanOrEqual(1);
      expect(Number.isFinite(metrics.softTargetCrossEntropy)).toBe(true);
      expect(metrics.softTargetCrossEntropy).toBeGreaterThanOrEqual(0);
      expect(metrics.softTargetCrossEntropy).toBeLessThanOrEqual(-Math.log(1e-12));
      if (row.recoveryAnchors.length === 0) {
        expect(metrics.postAnchorSoftTargetSquaredErrorFirst32).toBeNull();
      } else {
        expect(metrics.postAnchorSoftTargetSquaredErrorFirst32).toBeGreaterThanOrEqual(0);
        expect(metrics.postAnchorSoftTargetSquaredErrorFirst32).toBeLessThanOrEqual(1);
      }
      expect(row.maxAbsoluteParameter).toBeLessThanOrEqual(row.parameterAbsoluteLimit);
      expect(Number.isFinite(row.maxOptimizerAccumulator)).toBe(true);
    }
  });

  test('requires observed degradation and separates recovery events from censor follow-up', () => {
    let noDegradation = 0;
    let events = 0;
    let censors = 0;
    for (const row of study.rows) {
      expect(row.metrics.recoveries).toHaveLength(row.changePoints.length);
      for (const recovery of row.metrics.recoveries) {
        if (!recovery.degradationObserved) {
          noDegradation++;
          expect(recovery.recovered).toBe(false);
          expect(recovery.rightCensored).toBe(false);
          expect(recovery.recoveryOffsetCadenceIndices).toBeNull();
          expect(recovery.censorFollowUpCadenceIndices).toBeNull();
        } else if (recovery.recovered) {
          events++;
          expect(recovery.rightCensored).toBe(false);
          expect(recovery.recoveryOffsetCadenceIndices).toBeGreaterThan(0);
          expect(recovery.censorFollowUpCadenceIndices).toBeNull();
        } else {
          censors++;
          expect(recovery.rightCensored).toBe(true);
          expect(recovery.recoveryOffsetCadenceIndices).toBeNull();
          expect(recovery.censorFollowUpCadenceIndices).toBeGreaterThan(0);
        }
        if (row.taskId === 'gradual-drift') {
          expect(recovery.recoveryAnchorCadenceIndex).toBe(recovery.changeCadenceIndex + 144);
        }
      }
    }
    expect(noDegradation).toBeGreaterThan(0);
    expect(events).toBeGreaterThan(0);
    expect(censors).toBeGreaterThan(0);

    for (const aggregate of study.summary.aggregates) {
      expect(aggregate.recoveryEventCount + aggregate.rightCensoredCount).toBe(
        aggregate.degradationObservedCount,
      );
      if (aggregate.degradationObservedCount === 0) {
        expect(aggregate.recoveryEventRateAmongDegraded).toBeNull();
        expect(aggregate.rightCensorRateAmongDegraded).toBeNull();
      } else {
        expect(
          (aggregate.recoveryEventRateAmongDegraded ?? 0) +
            (aggregate.rightCensorRateAmongDegraded ?? 0),
        ).toBe(1);
      }
      expect(aggregate.meanRecoveryOffsetAmongEvents === null).toBe(
        aggregate.recoveryEventCount === 0,
      );
      expect(aggregate.meanCensorFollowUpAmongCensors === null).toBe(
        aggregate.rightCensoredCount === 0,
      );
    }
  });

  test('retains unfavorable neural, tier, and logistic comparisons in both seed roles', () => {
    const unfavorableByRole = new Map(ECOLOGY_DEVELOPMENT_SEED_ROLES.map((role) => [role, 0]));
    let h16NotBetterThanH8 = 0;
    let h8NotBetterThanTemporalLogistic = 0;
    for (const rows of rowsBySchedule(study.rows).values()) {
      const h8 = rows.find((row) => row.armId === 'v2-h8-adaptive');
      const h16 = rows.find((row) => row.armId === 'v2-h16-adaptive');
      const logistic = rows.find((row) => row.armId === 'logistic-temporal9-adaptive');
      const persistence = rows.find((row) => row.armId === 'persistence');
      const ewma = rows.find((row) => row.armId === 'ewma-008');
      if (
        h8 === undefined ||
        h16 === undefined ||
        logistic === undefined ||
        persistence === undefined ||
        ewma === undefined
      ) {
        throw new Error('configured comparison arm is missing');
      }
      if (
        h8.metrics.softTargetSquaredError >=
        Math.min(persistence.metrics.softTargetSquaredError, ewma.metrics.softTargetSquaredError)
      ) {
        unfavorableByRole.set(h8.seedRole, (unfavorableByRole.get(h8.seedRole) ?? 0) + 1);
      }
      if (h16.metrics.softTargetSquaredError >= h8.metrics.softTargetSquaredError) {
        h16NotBetterThanH8++;
      }
      if (h8.metrics.softTargetSquaredError >= logistic.metrics.softTargetSquaredError) {
        h8NotBetterThanTemporalLogistic++;
      }
    }
    expect(unfavorableByRole.get('mechanism-development')).toBeGreaterThan(0);
    expect(unfavorableByRole.get('fixed-configuration-validation')).toBeGreaterThan(0);
    expect(h16NotBetterThanH8).toBeGreaterThan(0);
    expect(h8NotBetterThanTemporalLogistic).toBeGreaterThan(0);
    expect(study.summary.retention.rowsFilteredByOutcome).toBe(0);
  });

  test('has no direct frozen evaluator import, ambiguous metric field, or filesystem write surface', () => {
    const source = readFileSync(
      resolve('scripts/organism-intelligence-phase-b/ecology-development.ts'),
      'utf8',
    );
    expect(source).not.toContain('organism-intelligence-v4');
    expect(source).not.toMatch(/run(?:Ordinary|Predictor|Petri|Titan).*V4/);
    expect(source).not.toMatch(/\bV4_(?:EVALUATION|SURROGATE|CALIBRATION)/);
    expect(source).not.toMatch(/\b(?:writeFile|writeFileSync|Bun\.write)\s*\(/);
    expect(source).not.toMatch(/\b(?:meanBrier|postChangeBrier|logLoss)\b/);
    expect(source).toContain('assertPhaseBDevelopmentSeed');
    expect(source).toContain('PREDEFINED_DEVELOPMENT_SEED_SET');
    expect(source).toContain('developmentOnly: true');
    expect(source).toContain('claimAllowed: false');
  });
});
