import { describe, expect, test } from 'bun:test';
import {
  buildOrdinaryResourceDevelopmentTrials,
  ORDINARY_RESOURCE_DEVELOPMENT_ARMS,
  ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
  ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS,
  ORDINARY_RESOURCE_DEVELOPMENT_DELAYS,
  ORDINARY_RESOURCE_DEVELOPMENT_TRIALS_PER_SEED,
  runOrdinaryResourceDevelopment,
  type OrdinaryResourceDevelopmentRow,
} from '../scripts/organism-intelligence-phase-b/ordinary-resource-development';
import {
  HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS,
  PHASE_B_DEVELOPMENT_SEEDS,
} from '../scripts/organism-intelligence-phase-b/development-seeds';

const OPTIONS = {
  trainSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain.slice(0, 4),
  validationSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation.slice(0, 2),
  surrogateSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate.slice(0, 4),
} as const;

const STUDY = runOrdinaryResourceDevelopment(OPTIONS);

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

function scheduleKey(row: OrdinaryResourceDevelopmentRow): string {
  return `${row.role}/${row.familySeed}/${row.withinSeedIndex}`;
}

describe('ordinary Phase-B delayed-resource development harness', () => {
  test('is deterministic, retains the exact arm/row matrix, and forbids claims', () => {
    const replay = runOrdinaryResourceDevelopment(OPTIONS);
    expect(replay).toEqual(STUDY);
    expect(STUDY.summary.studyId).toBe('ordinary-resource-head-phase-b-development-v1');
    expect(STUDY.summary.developmentOnly).toBe(true);
    expect(STUDY.summary.claimAllowed).toBe(false);
    expect(STUDY.summary.thresholdDefined).toBe(false);
    expect(STUDY.summary.negativeResultsRetained).toBe(true);
    expect(STUDY.summary.rowsFilteredByOutcome).toBe(0);
    expect(ORDINARY_RESOURCE_DEVELOPMENT_ARMS).toEqual([
      'full-h4',
      'recurrence-disabled-h4',
      'state-reset-at-delay-h4',
      'cyclic-semantics-h4',
      'field-disabled-physics-h4',
      'reward-shuffled-h4',
      'legacy-zero-action',
      'full-h2-diagnostic',
      'full-h8-diagnostic',
    ]);
    expect(STUDY.summary.armCount).toBe(9);
    expect(STUDY.summary.trainTrialCountPerArm).toBe(4 * 12);
    expect(STUDY.summary.validationTrialCountPerArm).toBe(2 * 12);
    expect(STUDY.summary.rowCount).toBe(9 * (4 * 12 + 2 * 12));
    expect(STUDY.rows).toHaveLength(STUDY.summary.rowCount);
    for (const arm of STUDY.summary.arms) expect(arm.validationReadoutUnchanged).toBe(true);

    expect(
      STUDY.summary.arms.map((arm) => [
        arm.armId,
        arm.resourceHeadParameterCount,
        arm.intendedTotalWithLegacy,
      ]),
    ).toEqual([
      ['full-h4', 51, 121],
      ['recurrence-disabled-h4', 51, 121],
      ['state-reset-at-delay-h4', 51, 121],
      ['cyclic-semantics-h4', 51, 121],
      ['field-disabled-physics-h4', 51, 121],
      ['reward-shuffled-h4', 51, 121],
      ['legacy-zero-action', 0, 70],
      ['full-h2-diagnostic', 27, 97],
      ['full-h8-diagnostic', 99, 169],
    ]);
  });

  test('defaults to all fixed ordinary train/validation/surrogate families', () => {
    const complete = runOrdinaryResourceDevelopment();
    expect(complete.summary.trainSeeds).toEqual(PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain);
    expect(complete.summary.validationSeeds).toEqual(PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation);
    expect(complete.summary.surrogateSeeds).toEqual(PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate);
    expect(complete.summary.trainTrialCountPerArm).toBe(32 * 12);
    expect(complete.summary.validationTrialCountPerArm).toBe(16 * 12);
    expect(complete.summary.rowCount).toBe(9 * (32 * 12 + 16 * 12));
    expect(complete.summary.aggregates.some((aggregate) => aggregate.acquiredFood > 0)).toBe(true);
    expect(complete.summary.aggregates.every((aggregate) => aggregate.availableFood > 0)).toBe(
      true,
    );
  });

  test('uses no historical evidence seed and rejects non-ordinary or historical overrides', async () => {
    const historical = new Set(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS);
    const used = [
      ...STUDY.summary.trainSeeds,
      ...STUDY.summary.validationSeeds,
      ...STUDY.summary.surrogateSeeds,
    ];
    expect(used.every((seed) => !historical.has(seed))).toBe(true);
    expect(new Set(used).size).toBe(used.length);
    expect(() =>
      runOrdinaryResourceDevelopment({
        ...OPTIONS,
        trainSeeds: [HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS[0]!],
      }),
    ).toThrow(/evidence family|outside its frozen family/);
    expect(() =>
      runOrdinaryResourceDevelopment({
        ...OPTIONS,
        trainSeeds: [PHASE_B_DEVELOPMENT_SEEDS.nhiTrain[0]!],
      }),
    ).toThrow(/outside its frozen family/);

    const source = await Bun.file(
      'scripts/organism-intelligence-phase-b/ordinary-resource-development.ts',
    ).text();
    expect(source).not.toContain('organism-intelligence-v4');
    expect(source).not.toMatch(/V4_(?:EVALUATION|SURROGATE|FAMILY|PROTOCOL)/);
  });

  test('counterbalances every delay × target-bearing × cue-order stratum with opposite bearings', () => {
    const trials = buildOrdinaryResourceDevelopmentTrials(
      [PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain[0]!],
      'train',
    );
    expect(trials).toHaveLength(ORDINARY_RESOURCE_DEVELOPMENT_TRIALS_PER_SEED);
    expect(buildOrdinaryResourceDevelopmentTrials([OPTIONS.trainSeeds[0]!], 'train')).toEqual(
      trials,
    );
    const strata = new Map<string, number>();
    for (const trial of trials) {
      const key = `${trial.delaySteps}/${trial.targetBearingSign}/${trial.cueOrder}`;
      strata.set(key, (strata.get(key) ?? 0) + 1);
      expect(trial.resourceBearingX + trial.threatBearingX).toBeCloseTo(0, 12);
      expect(trial.resourceBearingZ + trial.threatBearingZ).toBeCloseTo(0, 12);
      expect(Math.hypot(trial.resourceBearingX, trial.resourceBearingZ)).toBeCloseTo(1, 12);
      expect(Math.hypot(trial.threatBearingX, trial.threatBearingZ)).toBeCloseTo(1, 12);
    }
    expect(strata.size).toBe(12);
    expect([...strata.values()].every((count) => count === 1)).toBe(true);
    for (const delay of ORDINARY_RESOURCE_DEVELOPMENT_DELAYS) {
      expect(trials.filter((trial) => trial.delaySteps === delay)).toHaveLength(4);
    }
    expect(trials.filter((trial) => trial.targetBearingSign === -1)).toHaveLength(6);
    expect(trials.filter((trial) => trial.targetBearingSign === 1)).toHaveLength(6);
    expect(trials.filter((trial) => trial.cueOrder === 'resource-then-threat')).toHaveLength(6);
    expect(trials.filter((trial) => trial.cueOrder === 'threat-then-resource')).toHaveLength(6);
  });

  test('keeps schedules/physics matched, food conserved, and visually identical threat patches inert', () => {
    const schedules = new Map<string, Set<string>>();
    for (const row of STUDY.rows) {
      const key = scheduleKey(row);
      const hashes = schedules.get(key) ?? new Set<string>();
      hashes.add(row.scheduleSha256);
      schedules.set(key, hashes);
      expect(row.availableFood).toBe(1);
      expect(row.acquiredFood + row.foodRemaining).toBe(row.availableFood);
      expect(row.resourceConserved).toBe(true);
      expect(row.resourcePatchContacted).toBe(row.acquiredFood === 1);
      if (!row.resourcePatchContacted) expect(row.acquiredFood).toBe(0);
      expect(row.inputAudit.resourcePatchVisualSha256).toBe(row.inputAudit.threatPatchVisualSha256);
      expect(row.inputAudit.patchVisualSha256).toBe(row.inputAudit.resourcePatchVisualSha256);
      if (row.firstPatchContact === 'threat' && !row.resourcePatchContacted) {
        expect(row.acquiredFood).toBe(0);
      }
    }
    expect(schedules.size).toBe((4 + 2) * 12);
    expect([...schedules.values()].every((hashes) => hashes.size === 1)).toBe(true);

    const legacy = STUDY.rows.filter((row) => row.armId === 'legacy-zero-action');
    expect(legacy.every((row) => row.acquiredFood === 0)).toBe(true);
    expect(legacy.every((row) => row.pathEfficiency === 0)).toBe(true);
  });

  test('masks all post-cue decision inputs and exposes no patch/target future leakage', () => {
    for (const row of STUDY.rows) {
      expect(row.inputAudit.cueObservationCount).toBe(ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS * 2);
      expect(row.inputAudit.delayObservationCount).toBe(row.delaySteps);
      expect(row.inputAudit.choiceObservationCount).toBe(
        ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
      );
      expect(row.inputAudit.delaySemanticAbsoluteMax).toBe(0);
      expect(row.inputAudit.delayGoalAbsoluteMax).toBe(0);
      expect(row.inputAudit.choiceSemanticAbsoluteMax).toBe(0);
      expect(row.inputAudit.choiceGoalAbsoluteMax).toBe(0);
      expect(row.inputAudit.resourcePatchVisualSha256).toBe(row.inputAudit.threatPatchVisualSha256);
      if (row.armId === 'reward-shuffled-h4' && row.role === 'train' && row.rewardApplied) {
        expect(row.inputAudit.postOutcomeTrainingObservationCount).toBe(4);
        const associationSeed = row.surrogateAssociationSeed;
        if (associationSeed === null)
          throw new Error('reward-shuffled row omitted association seed');
        expect(OPTIONS.surrogateSeeds).toContain(associationSeed);
      } else {
        expect(row.inputAudit.postOutcomeTrainingObservationCount).toBe(0);
        expect(row.surrogateAssociationSeed).toBeNull();
      }
    }
  });

  test('learns only from acquired training food and freezes every validation readout', () => {
    const validationRows = STUDY.rows.filter((row) => row.role === 'validation');
    expect(validationRows.every((row) => !row.rewardApplied)).toBe(true);
    for (const row of STUDY.rows.filter((candidate) => candidate.rewardApplied)) {
      expect(row.role).toBe('train');
      expect(row.acquiredFood).toBe(1);
      expect(row.resourcePatchContacted).toBe(true);
      expect(row.armId).not.toBe('legacy-zero-action');
    }
    expect(STUDY.rows.some((row) => row.rewardApplied)).toBe(true);
    for (const arm of STUDY.summary.arms) {
      expect(arm.parametersAfterValidationSha256).toBe(arm.parametersAfterTrainingSha256);
      expect(arm.validationReadoutUnchanged).toBe(true);
    }
  });

  test('retains finite bounded outcomes and replay fingerprints for every negative/positive row', () => {
    expectFiniteTree(STUDY);
    for (const row of STUDY.rows) {
      expect(row.primaryOutcome).toBeGreaterThanOrEqual(0);
      expect(row.primaryOutcome).toBeLessThanOrEqual(1);
      expect(row.pathEfficiency).toBeGreaterThanOrEqual(0);
      expect(row.pathEfficiency).toBeLessThanOrEqual(1);
      expect(row.endEnergy).toBeGreaterThanOrEqual(0);
      expect(row.endEnergy).toBeLessThanOrEqual(1);
      expect(row.firstFoodTimeSteps === null || row.firstFoodTimeSteps >= 1).toBe(true);
      expect(
        row.firstFoodTimeSteps === null ||
          row.firstFoodTimeSteps <= ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
      ).toBe(true);
      expect(row.replaySha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.scheduleSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.developmentOnly).toBe(true);
      expect(row.claimAllowed).toBe(false);
    }
    expect(STUDY.summary.rowsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(STUDY.summary.configurationSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(STUDY.summary.aggregates.some((aggregate) => aggregate.meanPrimaryOutcome === 0)).toBe(
      true,
    );
  });
});
