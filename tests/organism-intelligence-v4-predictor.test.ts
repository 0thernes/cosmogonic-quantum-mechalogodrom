import { describe, expect, test } from 'bun:test';
import {
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  predictionQuality,
  v4DerivedSeed,
  v4PredictorInputAt,
  v4PredictorTrainingTargetForInput,
  v4PredictorTrueTargetForInput,
} from '../scripts/organism-intelligence-v4-protocol';
import {
  V4_PREDICTOR_ALL_ZERO_ROUTE_SHA256,
  V4_PREDICTOR_ARMS,
  V4_PREDICTOR_PERCEPT_SCHEDULE_SHA256,
  V4_PREDICTOR_SCHEDULE_SHA256,
  V4_PREDICTOR_TASK_SCHEDULE_SHA256,
  evaluateV4PredictorFamily,
  evaluateV4PredictorSeed,
  verifyV4PredictorSeedReplay,
  type V4PredictorArmId,
} from '../scripts/organism-intelligence-v4/predictor';
import {
  TsotchkeEcologyPredictor,
  type TsotchkeEcologyInput,
} from '../src/sim/tsotchke-ecology-predictor';

const FIXTURE = V4_FAMILY_FIXTURES['simple-mnist-ecology-predictor'];
const SEED = V4_EVALUATION_SEEDS[0]!;

function inputAt(index: number): TsotchkeEcologyInput {
  const input = v4PredictorInputAt(index);
  return {
    biomassDepletion: input[0],
    metabolicDepletion: input[1],
    crowding: input[2],
    chaosThermalStress: input[3],
  };
}

function manualArm(
  evaluationSeed: number,
  configuration: { adaptive: boolean; shuffled: boolean },
) {
  const predictor = new TsotchkeEcologyPredictor(
    v4DerivedSeed(evaluationSeed, 'predictorConstructor'),
    {
      adaptive: configuration.adaptive,
      learningRate: FIXTURE.learningRate,
    },
  );
  let previousPrediction: number | undefined;
  const truePredictions: number[] = [];
  const trueLabels: number[] = [];
  const shuffledLabels: number[] = [];
  const scoredBriers: number[] = [];
  const trainingBriers: number[] = [];

  for (let cadence = 0; cadence < FIXTURE.totalCadences; cadence++) {
    const trainingTarget =
      cadence === 0
        ? undefined
        : v4PredictorTrainingTargetForInput(cadence - 1, configuration.shuffled);
    const result = predictor.step(inputAt(cadence), trainingTarget);
    if (cadence > 0) {
      expect(result.previousBrier).toBe((previousPrediction! - trainingTarget!) ** 2);
      trainingBriers.push(result.previousBrier!);
      if (cadence >= FIXTURE.scoredCadences.first && cadence <= FIXTURE.scoredCadences.last) {
        const trueTarget = v4PredictorTrueTargetForInput(cadence - 1);
        truePredictions.push(previousPrediction!);
        trueLabels.push(trueTarget);
        shuffledLabels.push(v4PredictorTrainingTargetForInput(cadence - 1, true));
        scoredBriers.push((previousPrediction! - trueTarget) ** 2);
      }
    } else {
      expect(result.previousBrier).toBeNull();
      expect(result.updated).toBe(false);
    }
    previousPrediction = result.prediction;
  }
  return {
    quality: predictionQuality(truePredictions, trueLabels),
    shuffledLabelQuality: predictionQuality(truePredictions, shuffledLabels),
    brier: scoredBriers.reduce((sum, value) => sum + value, 0) / scoredBriers.length,
    trainingBrier: trainingBriers.reduce((sum, value) => sum + value, 0) / trainingBriers.length,
    updateCount: predictor.snapshot().updateCount,
  };
}

function armById(row: ReturnType<typeof evaluateV4PredictorSeed>, arm: V4PredictorArmId) {
  const found = row.arms.find((candidate) => candidate.arm === arm);
  if (found === undefined) throw new Error(`missing predictor arm ${arm}`);
  return found;
}

describe('V4 simple_mnist ecology-predictor evaluator', () => {
  test('runs the four frozen arms with identical initial parameters and exact cadence counts', () => {
    const row = evaluateV4PredictorSeed(SEED);
    expect(row.family).toBe('simple-mnist-ecology-predictor');
    expect(row.evaluationSeed).toBe(SEED);
    expect(row.constructorSeed).toBe(v4DerivedSeed(SEED, 'predictorConstructor'));
    expect(row.scheduleSha256).toBe(V4_PREDICTOR_SCHEDULE_SHA256);
    expect(row.scheduleSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row.arms.map((arm) => arm.arm)).toEqual([...V4_PREDICTOR_ARMS]);
    expect(row.arms.map((arm) => arm.arm)).toEqual([...FIXTURE.arms]);
    expect(row.matchedInitialParameters).toBe(true);
    expect(new Set(row.arms.map((arm) => arm.hashes.initialParametersSha256)).size).toBe(1);
    expect(row.matchedEvidence).toMatchObject({
      fixtureSha256: row.fixtureSha256,
      preInterventionPerceptScheduleSha256: V4_PREDICTOR_PERCEPT_SCHEDULE_SHA256,
      taskLabelScheduleSha256: V4_PREDICTOR_TASK_SCHEDULE_SHA256,
      initialStateMatchedAcrossArms: true,
      initialParametersMatchedAcrossArms: true,
      perceptScheduleMatchedAcrossArms: true,
      taskScheduleMatchedAcrossArms: true,
      constructorRngMatchedAcrossArms: true,
      constructorRngDrawCountMatchedAcrossArms: true,
    });
    expect(row.matchedEvidence.constructorRng).toMatchObject({
      evidenceKind: 'transformed-initial-parameter-outputs',
      rawTapeAvailable: false,
      rawTapeSha256: null,
      algorithm: 'mulberry32',
      drawCountBasis: 'one source draw per randomized w1/w2 parameter output',
      drawCount: 20,
      transformedParameterCount: 20,
    });
    expect(row.matchedEvidence.constructorRng.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);

    for (const hashName of [
      'initialStateSha256',
      'initialParametersSha256',
      'perceptScheduleSha256',
      'taskScheduleSha256',
      'constructorRngEvidenceSha256',
    ] as const) {
      expect(new Set(row.arms.map((arm) => arm.hashes[hashName])).size).toBe(1);
    }

    for (const arm of row.arms) {
      expect(arm.cadenceCount).toBe(240);
      expect(arm.feedbackCount).toBe(239);
      expect(arm.scoredTrueLabelCount).toBe(95);
      expect(arm.preReversal).toMatchObject({
        firstLabelCadence: 1,
        lastLabelCadence: 120,
        count: 120,
      });
      expect(arm.postReversalScored).toMatchObject({
        firstLabelCadence: 145,
        lastLabelCadence: 239,
        count: 95,
      });
      expect(arm.postReversalScored.quality + arm.postReversalScored.meanBrier).toBeCloseTo(1, 14);
      expect(arm.primaryOutcome).toBe(arm.postReversalScored.quality);
      expect(arm.primaryMeanBrier).toBe(arm.postReversalScored.meanBrier);
    }
    expect(armById(row, 'frozen-identical-initial-weights').updateCount).toBe(0);
    expect(armById(row, 'adaptive').updateCount).toBe(239);
    expect(armById(row, 'target-shuffled').updateCount).toBe(239);
    expect(armById(row, 'row-ablated').updateCount).toBe(239);
  });

  test('uses the exact t-1 lag and scores shuffled training against unshuffled truth', () => {
    const row = evaluateV4PredictorSeed(SEED);
    const cases = [
      { arm: 'adaptive', adaptive: true, shuffled: false },
      { arm: 'frozen-identical-initial-weights', adaptive: false, shuffled: false },
      { arm: 'target-shuffled', adaptive: true, shuffled: true },
      { arm: 'row-ablated', adaptive: true, shuffled: false },
    ] as const;

    for (const item of cases) {
      const expected = manualArm(SEED, item);
      const actual = armById(row, item.arm);
      expect(actual.postReversalScored.quality).toBe(expected.quality);
      expect(actual.postReversalScored.meanBrier).toBe(expected.brier);
      expect(actual.trainingFeedbackMeanBrier).toBe(expected.trainingBrier);
      expect(actual.updateCount).toBe(expected.updateCount);
    }

    const shuffledExpected = manualArm(SEED, { adaptive: true, shuffled: true });
    const shuffledActual = armById(row, 'target-shuffled');
    expect(shuffledActual.postReversalScored.quality).not.toBe(
      shuffledExpected.shuffledLabelQuality,
    );
    expect(shuffledActual.shuffledTrainingFeedback).toBe(true);
  });

  test('keeps row ablation diagnostic learning live while making its routed evidence exactly zero', () => {
    const row = evaluateV4PredictorSeed(SEED);
    const adaptive = armById(row, 'adaptive');
    const ablated = armById(row, 'row-ablated');

    expect(ablated.rowContributionEnabled).toBe(false);
    expect(adaptive.rowContributionEnabled).toBe(true);
    expect(ablated.preReversal).toEqual(adaptive.preReversal);
    expect(ablated.postReversalScored).toEqual(adaptive.postReversalScored);
    expect(ablated.recovery).toEqual(adaptive.recovery);
    expect(ablated.hashes.predictionTraceSha256).toBe(adaptive.hashes.predictionTraceSha256);
    expect(ablated.hashes.trueLabelTraceSha256).toBe(adaptive.hashes.trueLabelTraceSha256);
    expect(ablated.hashes.trainingFeedbackTraceSha256).toBe(
      adaptive.hashes.trainingFeedbackTraceSha256,
    );
    expect(ablated.hashes.finalSnapshotSha256).toBe(adaptive.hashes.finalSnapshotSha256);
    expect(ablated.hashes.routedSignalTraceSha256).not.toBe(
      adaptive.hashes.routedSignalTraceSha256,
    );
    expect(ablated.hashes.routedSignalTraceSha256).toBe(V4_PREDICTOR_ALL_ZERO_ROUTE_SHA256);
    expect(ablated.routing).toMatchObject({
      ecologyRiskRange: [0, 0],
      ecologySurpriseRange: [0, 0],
      ecologyRiskZeroCount: 240,
      ecologySurpriseZeroCount: 240,
      bothRoutesZeroCount: 240,
      allRoutesCausallyZero: true,
    });
    expect(adaptive.routing.allRoutesCausallyZero).toBe(false);
    expect(adaptive.routing.registry).toMatchObject({
      implementation: 'corpusBrainVectorInto',
      ablatedSlug: null,
      expectedRepoCount: 17,
      repoCountRange: [17, 17],
      matchingRepoCountCadences: 240,
    });
    expect(ablated.routing.registry).toMatchObject({
      implementation: 'corpusBrainVectorInto',
      ablatedSlug: 'simple_mnist',
      expectedRepoCount: 16,
      repoCountRange: [16, 16],
      matchingRepoCountCadences: 240,
    });
    expect(ablated.hashes.registryRoutingTraceSha256).not.toBe(
      adaptive.hashes.registryRoutingTraceSha256,
    );
  });

  test('seals bounded snapshots, continuation replay, and deterministic whole-row replay', () => {
    const row = evaluateV4PredictorSeed(SEED);
    for (const arm of row.arms) {
      expect(arm.bounds.checkedSnapshots).toBe(240);
      expect(arm.bounds.checkedParameterValues).toBe(240 * 25);
      expect(arm.bounds.registrySignalViolations).toBe(0);
      expect(arm.bounds.registryRepoCountViolations).toBe(0);
      expect(arm.bounds.totalViolations).toBe(0);
      expect(arm.bounds.maximumAbsoluteParameter).toBeLessThanOrEqual(
        arm.bounds.parameterAbsoluteLimit,
      );
      for (const [minimum, maximum] of [
        arm.bounds.predictionRange,
        arm.bounds.trueBrierRange,
        arm.bounds.trainingBrierRange,
      ]) {
        expect(minimum).toBeGreaterThanOrEqual(0);
        expect(maximum).toBeLessThanOrEqual(1);
      }
      expect(arm.replay).toMatchObject({
        splitAfterCadence: 159,
        continuationSteps: 80,
        byteIdentical: true,
      });
      expect(arm.hashes.snapshotContinuationSha256).toBe(arm.replay.replayContinuationSha256);
      for (const hash of Object.values(arm.hashes)) expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }

    const replay = verifyV4PredictorSeedReplay(SEED);
    expect(replay.byteIdentical).toBe(true);
    expect(replay.firstSha256).toBe(replay.secondSha256);
    expect(evaluateV4PredictorSeed(SEED)).toEqual(row);
  });

  test('emits the exact 64 fixed rows and bounded, explicitly nullable recovery diagnostics', () => {
    const family = evaluateV4PredictorFamily();
    expect(family.evaluationSeeds).toEqual([...V4_EVALUATION_SEEDS]);
    expect(family.seedCount).toBe(64);
    expect(family.rows).toHaveLength(64);
    expect(new Set(family.rows.map((row) => row.contentSha256)).size).toBe(64);
    expect(family.contentSha256).toMatch(/^[0-9a-f]{64}$/);

    let recoveredAdaptiveSeeds = 0;
    for (const row of family.rows) {
      expect(row.matchedInitialParameters).toBe(true);
      expect(Object.values(row.matchedEvidence).filter((value) => value === false)).toEqual([]);
      for (const arm of row.arms) {
        expect(arm.bounds.totalViolations).toBe(0);
        expect(arm.replay.byteIdentical).toBe(true);
        const cadence = arm.recovery.cadence;
        if (cadence !== null) {
          expect(cadence).toBeGreaterThanOrEqual(128);
          expect(cadence).toBeLessThanOrEqual(239);
          expect(arm.recovery.delayCadences).toBe(cadence - 120);
          if (arm.arm === 'adaptive') recoveredAdaptiveSeeds++;
        } else {
          expect(arm.recovery.delayCadences).toBeNull();
        }
      }
    }
    expect(recoveredAdaptiveSeeds).toBeGreaterThan(0);
    expect(recoveredAdaptiveSeeds).toBeLessThan(64);
  });

  test('rejects ad hoc seeds outside the frozen evaluation family', () => {
    expect(() => evaluateV4PredictorSeed(0)).toThrow(/64 frozen V4 evaluation seeds/);
    expect(() => evaluateV4PredictorSeed(Number.NaN)).toThrow(/64 frozen V4 evaluation seeds/);
  });
});
