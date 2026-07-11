import { describe, expect, test } from 'bun:test';
import {
  calibrateOrdinaryV4Surrogate,
  evaluateOrdinaryV4,
  evaluateOrdinaryV4Arm,
  evaluateOrdinaryV4Seed,
  ORDINARY_V4_ARMS,
  ORDINARY_V4_CALIBRATION_SHA256,
} from '../scripts/organism-intelligence-v4/ordinary';
import {
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  V4_SURROGATE_CALIBRATION,
  V4_SURROGATE_CALIBRATION_SEEDS,
} from '../scripts/organism-intelligence-v4-protocol';

const SEED = 3_957_713_710;
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('ordinary-organism V4 evaluator', () => {
  test('derives the exact 16-seed action-distribution surrogate deterministically', () => {
    const first = calibrateOrdinaryV4Surrogate();
    const replay = calibrateOrdinaryV4Surrogate();

    expect(first.sourceSeeds).toEqual([...V4_SURROGATE_CALIBRATION_SEEDS]);
    expect(first.sourceArm).toBe('full-semantic-recurrent');
    expect(first.actionVectorCount).toBe(
      V4_SURROGATE_CALIBRATION_SEEDS.length * V4_FAMILY_FIXTURES['ordinary-organisms'].totalSteps,
    );
    expect(first.calibration.actionFrequency).toBe(1);
    expect(first.calibration.sortedNonZeroMagnitudes).toHaveLength(first.actionVectorCount);
    expect(
      first.calibration.sortedNonZeroMagnitudes.every(
        (value, index, values) =>
          value > V4_SURROGATE_CALIBRATION.nonZeroThreshold &&
          value <= V4_SURROGATE_CALIBRATION.motorBound &&
          (index === 0 || value >= values[index - 1]!),
      ),
    ).toBe(true);
    expect(first.sourceReplayFingerprints).toHaveLength(V4_SURROGATE_CALIBRATION_SEEDS.length);
    expect(first.calibrationSha256).toBe(ORDINARY_V4_CALIBRATION_SHA256);
    expect(first.replayFingerprint).toBe(
      '002f13466eeb06788d2ce327c93afc21c72b64b7b4ef4354ee149b85b26a88f2',
    );
    expect(replay.calibrationSha256).toBe(first.calibrationSha256);
    expect(replay.replayFingerprint).toBe(first.replayFingerprint);
  });

  test('runs every declared arm with matched initial, percept, goal, and brain-RNG evidence', () => {
    const calibration = calibrateOrdinaryV4Surrogate();
    const result = evaluateOrdinaryV4Seed(SEED, calibration.calibration);

    expect(result.arms.map(({ arm }) => arm)).toEqual([...ORDINARY_V4_ARMS]);
    expect(result.arms.map(({ arm }) => arm)).toEqual([
      ...V4_FAMILY_FIXTURES['ordinary-organisms'].arms,
    ]);
    expect(result.replayFingerprint).toBe(
      '1f308fdcef3968d8511f60f5c3d81d4686bd562fbc53f062f9e95d41328281d0',
    );

    const matched = result.arms[0]!.hashes;
    for (const arm of result.arms) {
      expect(Number.isFinite(arm.primaryOutcome)).toBe(true);
      expect(arm.primaryOutcome).toBeGreaterThanOrEqual(0);
      expect(arm.primaryOutcome).toBeLessThanOrEqual(1);
      expect(arm.secondaryOutcomes.totalSteps).toBe(480);
      expect(arm.secondaryOutcomes.scoredSteps).toBe(240);
      expect(arm.secondaryOutcomes.actionFrequency).toBeGreaterThanOrEqual(0);
      expect(arm.secondaryOutcomes.actionFrequency).toBeLessThanOrEqual(1);
      expect(arm.replayFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(arm.hashes.fixtureSha256).toBe(matched.fixtureSha256);
      expect(arm.hashes.initialStateSha256).toBe(matched.initialStateSha256);
      expect(arm.hashes.initialGenomeSha256).toBe(matched.initialGenomeSha256);
      expect(arm.hashes.perceptSha256).toBe(matched.perceptSha256);
      expect(arm.hashes.goalScheduleSha256).toBe(matched.goalScheduleSha256);
      expect(arm.hashes.environmentRngTapeSha256).toBe(EMPTY_SHA256);
      expect(arm.hashes.environmentRngDrawCount).toBe(0);
      expect(arm.hashes.brainRngTapeSha256).toBe(matched.brainRngTapeSha256);
      expect(arm.hashes.brainRngDrawCount).toBe(80);
      expect(arm.hashes.interventionSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(arm.intervention.calibrationSha256).toBe(arm.hashes.calibrationSha256);
    }

    const surrogate = result.arms.find(
      ({ arm }) => arm === 'action-distribution-matched-surrogate',
    )!;
    expect(surrogate.hashes.surrogateRngSeed).not.toBeNull();
    expect(surrogate.hashes.surrogateRngDrawCount).toBe(480 * 3);
    expect(surrogate.hashes.surrogateRngTapeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(surrogate.hashes.calibrationSha256).toBe(ORDINARY_V4_CALIBRATION_SHA256);
    expect(surrogate.intervention.horizontalActionSource).toBe('frozen-calibrated-surrogate');
    for (const arm of result.arms.filter(({ arm }) => arm !== surrogate.arm)) {
      expect(arm.hashes.surrogateRngSeed).toBeNull();
      expect(arm.hashes.surrogateRngDrawCount).toBe(0);
      expect(arm.hashes.surrogateRngTapeSha256).toBe(EMPTY_SHA256);
      expect(arm.hashes.calibrationSha256).toBeNull();
      expect(arm.intervention.horizontalActionSource).toBe('live-neural');
    }
  });

  test('reports the live recurrent retention and declared controls without filtering outcomes', () => {
    const calibration = calibrateOrdinaryV4Surrogate();
    const result = evaluateOrdinaryV4Seed(SEED, calibration.calibration);
    const byArm = new Map(result.arms.map((arm) => [arm.arm, arm]));
    const full = byArm.get('full-semantic-recurrent')!;
    const stateless = byArm.get('recurrence-disabled-current-input')!;
    const cyclic = byArm.get('semantic-channel-cyclic-permutation')!;
    const disabled = byArm.get('goal-preserved-shared-field-disabled')!;
    const legacy = byArm.get('exact-legacy')!;
    const surrogate = byArm.get('action-distribution-matched-surrogate')!;

    expect(full.secondaryOutcomes.dropoutMeanResourceContext).toBeGreaterThan(0);
    expect(stateless.secondaryOutcomes.dropoutMeanResourceContext).toBe(0);
    expect(stateless.intervention.semanticRecurrenceEnabled).toBe(false);
    expect(stateless.intervention.semanticRecurrenceActive).toBe(false);
    expect(cyclic.secondaryOutcomes.dropoutMeanResourceContext).toBe(0);
    expect(cyclic.intervention.semanticField).toBe('enabled-cyclic');
    expect(disabled.secondaryOutcomes.dropoutMeanResourceContext).toBe(0);
    expect(disabled.intervention.semanticField).toBe('disabled-goal-preserved');
    expect(disabled.intervention.goalsAttached).toBe(true);
    expect(legacy.secondaryOutcomes.dropoutMeanResourceContext).toBe(0);
    expect(legacy.intervention.semanticField).toBe('omitted-exact-legacy');
    expect(legacy.intervention.goalsAttached).toBe(false);
    expect(surrogate.secondaryOutcomes.dropoutMeanResourceContext).toBe(
      full.secondaryOutcomes.dropoutMeanResourceContext,
    );
    expect(new Set(result.arms.map(({ replayFingerprint }) => replayFingerprint)).size).toBe(
      ORDINARY_V4_ARMS.length,
    );
  });

  test('reports each cumulative-velocity reversal recovery with explicit censoring and units', () => {
    const calibration = calibrateOrdinaryV4Surrogate();
    const result = evaluateOrdinaryV4Seed(SEED, calibration.calibration);

    for (const arm of result.arms) {
      const recovery = arm.secondaryOutcomes.goalAlignedVelocityRecovery;
      expect(recovery.reversalCount).toBe(3);
      expect(recovery.perReversal.map(({ reversalStep }) => reversalStep)).toEqual([120, 240, 360]);
      expect(
        recovery.perReversal.map(({ windowEndStepExclusive }) => windowEndStepExclusive),
      ).toEqual([240, 360, 480]);
      expect(
        recovery.perReversal.map(({ previousGoalX, newGoalX }) => [previousGoalX, newGoalX]),
      ).toEqual([
        [1, -1],
        [-1, 1],
        [1, -1],
      ]);
      expect(
        recovery.perReversal.every((event) => {
          if (event.firstPositiveGoalAlignedVelocityStep === null) {
            return event.censored && event.recoverySteps === null && event.recoverySeconds === null;
          }
          return (
            !event.censored &&
            event.firstPositiveGoalAlignedVelocityStep >= event.reversalStep &&
            event.firstPositiveGoalAlignedVelocityStep < event.windowEndStepExclusive &&
            event.recoverySteps ===
              event.firstPositiveGoalAlignedVelocityStep - event.reversalStep &&
            event.recoverySeconds === event.recoverySteps / 60
          );
        }),
      ).toBe(true);
      expect(recovery.recoveredCount).toBe(
        recovery.perReversal.filter(({ censored }) => !censored).length,
      );
    }

    const full = result.arms.find(({ arm }) => arm === 'full-semantic-recurrent')!;
    const surrogate = result.arms.find(
      ({ arm }) => arm === 'action-distribution-matched-surrogate',
    )!;
    expect(
      full.secondaryOutcomes.goalAlignedVelocityRecovery.perReversal.map(
        ({ recoverySteps }) => recoverySteps,
      ),
    ).toEqual([null, 0, null]);
    expect(
      surrogate.secondaryOutcomes.goalAlignedVelocityRecovery.perReversal.map(
        ({ recoverySteps }) => recoverySteps,
      ),
    ).toEqual([0, null, 0]);
  });

  test('replays byte-identically and rejects undeclared or unmatched invocations', () => {
    const calibration = calibrateOrdinaryV4Surrogate();
    const first = evaluateOrdinaryV4Arm(SEED, 'full-semantic-recurrent');
    const replay = evaluateOrdinaryV4Arm(SEED, 'full-semantic-recurrent');
    expect(replay).toEqual(first);

    expect(() => evaluateOrdinaryV4Arm(SEED, 'not-an-arm' as never)).toThrow(
      'unknown ordinary V4 arm',
    );
    expect(() => evaluateOrdinaryV4Arm(SEED, 'action-distribution-matched-surrogate')).toThrow(
      'requires its frozen 16-seed calibration',
    );
    expect(() => evaluateOrdinaryV4Arm(-1, 'full-semantic-recurrent')).toThrow('uint32');
    expect(() => evaluateOrdinaryV4([SEED, SEED])).toThrow('exact canonical 64 seeds');
    expect(() => evaluateOrdinaryV4([...V4_EVALUATION_SEEDS].reverse())).toThrow(
      'exact canonical 64 seeds',
    );
    expect(() =>
      evaluateOrdinaryV4([V4_SURROGATE_CALIBRATION_SEEDS[0], ...V4_EVALUATION_SEEDS.slice(1)]),
    ).toThrow('may not overlap surrogate calibration seeds');
    expect(evaluateOrdinaryV4().seeds).toEqual([...V4_EVALUATION_SEEDS]);
    expect(() =>
      evaluateOrdinaryV4Arm(SEED, 'full-semantic-recurrent', calibration.calibration),
    ).toThrow('only valid for the surrogate arm');
    expect(() =>
      evaluateOrdinaryV4Arm(SEED, 'action-distribution-matched-surrogate', {
        actionFrequency: 0,
        sortedNonZeroMagnitudes: [],
      }),
    ).toThrow('does not match the frozen 16-seed identity');
    expect(() =>
      evaluateOrdinaryV4Seed(SEED, {
        actionFrequency: 2,
        sortedNonZeroMagnitudes: calibration.calibration.sortedNonZeroMagnitudes,
      }),
    ).toThrow('outside its frozen bounds');
  });
});
