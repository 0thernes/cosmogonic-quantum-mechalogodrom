import { describe, expect, test } from 'bun:test';
import {
  buildOrdinaryResourceDevelopmentV2Trials,
  ORDINARY_RESOURCE_DEVELOPMENT_V2_ARMS,
  ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS,
  ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS,
  ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS,
  ordinaryResourceDevelopmentV2YokeDomain,
  resolveOrdinaryResourceDevelopmentV2Contact,
  runOrdinaryResourceDevelopmentV2,
  sweptSegmentCircleFirstT,
  type OrdinaryResourceDevelopmentV2Row,
} from '../scripts/organism-intelligence-phase-b/ordinary-resource-development-v2';
import {
  HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS,
  PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  PHASE_B_DEVELOPMENT_SEEDS,
} from '../scripts/organism-intelligence-phase-b/development-seeds';

const COMPLETE = runOrdinaryResourceDevelopmentV2();

function rowKey(row: OrdinaryResourceDevelopmentV2Row): string {
  return `${row.modelSeed}/${row.validationSeed}/${row.withinSeedIndex}`;
}

function expectFiniteTree(value: unknown): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) expectFiniteTree(entry);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) expectFiniteTree(entry);
  }
}

describe('ordinary resource DEVELOPMENT V2', () => {
  test('pins fresh disjoint seed families while retaining the consumed V1 harness', async () => {
    expect(PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256).toBe(
      '86bb594637eac23d1de4448b8b45809350e2caf7b87a800adf07e772e7e90249',
    );
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train).toHaveLength(12);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation).toHaveLength(8);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model).toHaveLength(4);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate).toHaveLength(8);
    expect(PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault).toHaveLength(4);
    const historical = new Set(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS);
    const v1 = [
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryFault,
    ];
    const v2 = [
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate,
      ...PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault,
    ];
    expect(v2.every((seed) => !historical.has(seed))).toBe(true);
    expect(v2.every((seed) => !v1.includes(seed))).toBe(true);
    expect(new Set(v2).size).toBe(v2.length);
    expect(
      await Bun.file(
        'scripts/organism-intelligence-phase-b/ordinary-resource-development.ts',
      ).exists(),
    ).toBe(true);
    const source = await Bun.file(
      'scripts/organism-intelligence-phase-b/ordinary-resource-development-v2.ts',
    ).text();
    expect(source).not.toContain('organism-intelligence-v4');
    expect(source).not.toContain('Bun.write');
  });

  test('is deterministic across independent model units and retains the exact frozen arm matrix', () => {
    const options = {
      trainSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train.slice(0, 2),
      validationSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation.slice(0, 1),
      modelSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model.slice(0, 2),
      surrogateSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate.slice(0, 2),
      faultSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault.slice(0, 1),
    };
    expect(runOrdinaryResourceDevelopmentV2(options)).toEqual(
      runOrdinaryResourceDevelopmentV2(options),
    );
    expect(ORDINARY_RESOURCE_DEVELOPMENT_V2_ARMS).toEqual([
      'identity-frozen',
      'cyclic-semantics-frozen',
      'semantics-ablated-bearing-retained',
      'bearing-ablated-semantics-retained',
      'field-off',
      'recurrence-disabled',
      'state-reset-at-delay',
      'reward-eligibility-corrupted-trained',
      'legacy-exact-70',
      'feedforward-parameter-matched-recurrence-padded',
      'calibrated-yoked-action-surrogate',
    ]);
    expect(COMPLETE.summary.modelUnitCount).toBe(4);
    expect(COMPLETE.summary.armCount).toBe(11);
    expect(COMPLETE.summary.rowCount).toBe(4 * 11 * 8 * 12);
    expect(COMPLETE.rows).toHaveLength(COMPLETE.summary.rowCount);
    expect(COMPLETE.summary.models).toHaveLength(4);
    expect(COMPLETE.summary.aggregates).toHaveLength(11);
    expect(COMPLETE.summary.aggregates.every((aggregate) => aggregate.modelUnitCount === 4)).toBe(
      true,
    );
    expect(COMPLETE.summary.constantsSha256).toBe(
      'c36bc5dd927c00cd5dda9e39eb33558f2b9b8ae5e377c0f85217083f8b604b97',
    );
    expect(COMPLETE.summary.configurationSha256).toBe(
      '839a2b71509242134d28ae5b41e8710153c4254c168ad6f3004d0e74a0116fd7',
    );
    expect(COMPLETE.summary.rowsSha256).toBe(
      '549bd7485686e0661a56ed88d4f03438be6dcbc42a15d9f4f7ddd1e95bee9257',
    );
    expect(COMPLETE.summary.yokedCalibrationSha256).toBe(
      '046941a03ff61463a172b3500c37105aa0586d3fea95857e40872947250d5614',
    );
  });

  test('counterbalances delay/bearing/cue strata and seals swept contact including ties', () => {
    const trials = buildOrdinaryResourceDevelopmentV2Trials(
      [PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation[0]!],
      'validation',
    );
    expect(trials).toHaveLength(12);
    const strata = new Set<string>();
    for (const trial of trials) {
      strata.add(`${trial.delaySteps}/${trial.targetBearingSign}/${trial.cueOrder}`);
      expect(trial.resourceBearingX + trial.threatBearingX).toBeCloseTo(0, 12);
      expect(trial.resourceBearingZ + trial.threatBearingZ).toBeCloseTo(0, 12);
    }
    expect(strata.size).toBe(12);
    for (const delay of ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS) {
      expect(trials.filter((trial) => trial.delaySteps === delay)).toHaveLength(4);
    }

    // Endpoint is beyond the circle: endpoint-only contact would miss this tunnelling segment.
    expect(sweptSegmentCircleFirstT(-2, 0, 2, 0, 0, 0, 0.25)).toBeCloseTo(0.4375, 12);
    expect(sweptSegmentCircleFirstT(-2, 1, 2, 1, 0, 0, 0.25)).toBeNull();
    expect(sweptSegmentCircleFirstT(0, 0, 2, 0, 0, 0, 0.25)).toBe(0);
    expect(resolveOrdinaryResourceDevelopmentV2Contact(0.4, 0.4)).toEqual({
      patch: 'resource',
      t: 0.4,
    });
    expect(resolveOrdinaryResourceDevelopmentV2Contact(0.5, 0.2)).toEqual({
      patch: 'threat',
      t: 0.2,
    });
  });

  test('first contact is terminal and padding cannot alter endpoint, controller state, or score', () => {
    for (const row of COMPLETE.rows) {
      const fixedBudget =
        ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS * 2 +
        row.delaySteps +
        ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS;
      expect(row.activeControllerSteps + row.paddedControllerSteps).toBe(fixedBudget);
      expect(row.baselineForwardCount).toBe(row.activeControllerSteps);
      if (row.armId === 'legacy-exact-70' || row.armId === 'calibrated-yoked-action-surrogate') {
        expect(row.headForwardCount).toBe(0);
      } else {
        expect(row.headForwardCount).toBe(row.activeControllerSteps);
      }
      expect(row.parametersAfterEvaluationSha256).toBe(row.parametersBeforeEvaluationSha256);
      expect(row.evaluationUpdateCount).toBe(0);
      if (row.terminalContact === null) {
        expect(row.terminalChoiceStep).toBeNull();
        expect(row.paddedControllerSteps).toBe(0);
        expect(row.acquiredFood).toBe(0);
      } else {
        expect(row.terminalChoiceStep).not.toBeNull();
        expect(row.terminalChoiceStep! + row.paddedControllerSteps).toBe(
          ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS,
        );
        expect(row.acquiredFood).toBe(row.terminalContact === 'resource' ? 1 : 0);
      }
      expect(row.primaryOutcome).toBe(row.acquiredFood);
      expect(row.survivalMetric).toBe('not-reported-no-death-regime');
    }
  });

  test('runs and hashes the exact 70-weight baseline plus explicit allocated/exercised budgets', () => {
    const grouped = new Map<string, Set<string>>();
    for (const row of COMPLETE.rows) {
      expect(row.baselineForwardCount).toBeGreaterThan(0);
      expect(row.baselineBrainSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.baselineGenomeSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.baselineControllerSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.baselineObservationStreamSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.parameterBudget.legacyAllocated).toBe(70);
      expect(row.parameterBudget.legacyExercised).toBe(70);
      const hashes = grouped.get(String(row.modelSeed)) ?? new Set<string>();
      hashes.add(row.baselineBrainSha256);
      grouped.set(String(row.modelSeed), hashes);
      if (row.armId === 'legacy-exact-70') {
        expect(row.parameterBudget).toMatchObject({
          headAllocated: 0,
          headExercised: 0,
          totalAllocated: 70,
          totalExercised: 70,
          totalPlanned: 70,
        });
      } else if (row.armId === 'calibrated-yoked-action-surrogate') {
        expect(row.parameterBudget.totalAllocated).toBe(70);
      } else {
        expect(row.parameterBudget.totalAllocated).toBe(121);
        expect(row.parameterBudget.totalPlanned).toBe(121);
      }
    }
    expect([...grouped.values()].every((hashes) => hashes.size === 1)).toBe(true);

    const feedforward = COMPLETE.rows.filter(
      (row) => row.armId === 'feedforward-parameter-matched-recurrence-padded',
    );
    for (const row of feedforward) {
      expect(row.parameterBudget.headExercised).toBe(51);
      expect(row.parameterBudget.totalExercised).toBe(121);
      expect(row.parameterBudget.recurrenceBranchPaddingExecuted).toBe(true);
      expect(row.parameterBudget.literalFlopEqualityClaimed).toBe(false);
      expect(row.recurrentNeuronUpdates).toBe(0);
      expect(row.feedforwardPaddingNeuronUpdates).toBe(row.headForwardCount * 4);
    }
    for (const row of COMPLETE.rows.filter((candidate) => candidate.armId === 'identity-frozen')) {
      expect(row.recurrentNeuronUpdates).toBe(row.headForwardCount * 4);
      expect(row.feedforwardPaddingNeuronUpdates).toBe(0);
    }
  });

  test('freezes identity once, applies destructive paired interventions, and never retrains cyclic', () => {
    const groups = new Map<string, OrdinaryResourceDevelopmentV2Row[]>();
    for (const row of COMPLETE.rows) {
      const key = rowKey(row);
      const selected = groups.get(key) ?? [];
      selected.push(row);
      groups.set(key, selected);
    }
    for (const selected of groups.values()) {
      expect(new Set(selected.map((row) => row.scheduleSha256)).size).toBe(1);
      const identity = selected.find((row) => row.armId === 'identity-frozen')!;
      for (const arm of [
        'cyclic-semantics-frozen',
        'semantics-ablated-bearing-retained',
        'bearing-ablated-semantics-retained',
        'field-off',
        'recurrence-disabled',
        'state-reset-at-delay',
        'feedforward-parameter-matched-recurrence-padded',
      ] as const) {
        const row = selected.find((candidate) => candidate.armId === arm)!;
        expect(row.sourceParameterSha256).toBe(identity.sourceParameterSha256);
        expect(row.sourceTrainingUpdateCount).toBe(identity.sourceTrainingUpdateCount);
      }
      const cyclic = selected.find((row) => row.armId === 'cyclic-semantics-frozen')!;
      expect(cyclic.observationStreamSha256).not.toBe(identity.observationStreamSha256);
    }
    for (const model of COMPLETE.summary.models) {
      expect(model.cyclicRetrained).toBe(false);
      expect(model.identityFrozenCloneSourceSha256).toBe(model.identityParametersAfterSha256);
    }
  });

  test('corrupts reward eligibility only, preserving true physics and exact update event timing/count', () => {
    expect(COMPLETE.summary.models.every((model) => model.identityUpdateCount > 0)).toBe(true);
    for (const model of COMPLETE.summary.models) {
      expect(model.identityUpdateCount).toBe(model.corruptedUpdateCount);
      expect(model.identityRewardTimingSha256).toBe(model.corruptedRewardTimingSha256);
      expect(model.rewardTimingSha256).toBe(model.identityRewardTimingSha256);
      expect(model.identicalRewardTimingAndCount).toBe(true);
      expect(model.truePhysicsActionSource).toBe('identity-combined');
      expect(model.postOutcomeObservationCount).toBe(0);
      expect(model.trainingClockFinalStep).toBe(model.scheduledTrainingStepCount);
      expect(model.paddedTrainingStepCount).toBeGreaterThanOrEqual(0);
      expect(model.baselineGenomeSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(model.baselineControllerSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(model.identityObservationSha256).not.toBe(model.corruptedObservationSha256);
      expect(model.corruptionAssociationSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(model.physicsActionSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(
      COMPLETE.summary.models.some(
        (model) => model.identityParametersAfterSha256 !== model.corruptedParametersAfterSha256,
      ),
    ).toBe(true);
  });

  test('yokes surrogate action magnitude to paired identity tapes and hashes every stream', () => {
    const validationTrials = buildOrdinaryResourceDevelopmentV2Trials(
      PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation,
      'validation',
    );
    for (let modelUnitIndex = 0; modelUnitIndex < 4; modelUnitIndex++) {
      const domains = validationTrials.map((trial, trialIndex) =>
        ordinaryResourceDevelopmentV2YokeDomain(
          PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate[
            (modelUnitIndex + trialIndex) % PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate.length
          ]!,
          modelUnitIndex,
          trial.seed,
          trial.withinSeedIndex,
        ),
      );
      expect(new Set(domains).size).toBe(validationTrials.length);
    }
    for (const row of COMPLETE.rows.filter(
      (candidate) => candidate.armId === 'calibrated-yoked-action-surrogate',
    )) {
      expect(row.yokeSourceActionSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.yokeSourceMagnitudeSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.yokeMagnitudePreservedOnActiveSteps).toBe(true);
      expect(row.sourceParameterSha256).toBeNull();
    }
    expect(COMPLETE.summary.yokedCalibrationSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(COMPLETE.summary.yokedCalibrationPolicy).toBe(
      'full-180-command-open-loop-identity-tape',
    );
    expect(COMPLETE.summary.yokedDirectionPolicy).toBe(
      'validation-seed-separated-domain-v2-full-open-loop-tape',
    );
    expect(COMPLETE.summary.faultSeedRole).toBe('reserved-not-consumed-by-v2-task-runner');
  });

  test('keeps every finite positive/negative row with no threshold or claim', () => {
    expect(COMPLETE.summary.developmentOnly).toBe(true);
    expect(COMPLETE.summary.claimAllowed).toBe(false);
    expect(COMPLETE.summary.thresholdDefined).toBe(false);
    expect(COMPLETE.summary.negativeResultsRetained).toBe(true);
    expect(COMPLETE.summary.rowsFilteredByOutcome).toBe(0);
    expectFiniteTree(COMPLETE);
    for (const row of COMPLETE.rows) {
      expect(row.developmentOnly).toBe(true);
      expect(row.claimAllowed).toBe(false);
      expect(row.acquiredFood).toBeGreaterThanOrEqual(0);
      expect(row.acquiredFood).toBeLessThanOrEqual(row.availableFood);
      expect(row.pathEfficiency).toBeGreaterThanOrEqual(0);
      expect(row.pathEfficiency).toBeLessThanOrEqual(1);
      expect(row.terminalEnergy).toBeGreaterThan(0);
      expect(row.terminalEnergy).toBeLessThanOrEqual(1);
      expect(row.observationStreamSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.actionStreamSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.replaySha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(COMPLETE.rows.some((row) => row.primaryOutcome === 0)).toBe(true);
    expect(COMPLETE.rows.some((row) => row.primaryOutcome === 1)).toBe(true);
  });
});
