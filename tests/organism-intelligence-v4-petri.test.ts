import { describe, expect, test } from 'bun:test';
import type { Biologic } from '../src/sim/digital-biologics';
import { stepBiologic } from '../src/sim/digital-biologics';
import { petriSharedEcologyFlux } from '../src/sim/petri-dish';
import {
  fixtureSha256,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  v4DerivedSeed,
  v4SemanticSignal,
} from '../scripts/organism-intelligence-v4-protocol';
import {
  createV4PetriInitialState,
  runV4PetriArm,
  runV4PetriEvaluation,
  runV4PetriSeed,
  V4_PETRI_ARMS,
  type V4PetriSpecialistSnapshot,
} from '../scripts/organism-intelligence-v4/petri';

const FIXTURE = V4_FAMILY_FIXTURES['petri-digital-biologics'];
const SEED = V4_EVALUATION_SEEDS[0]!;

function cloneSpecialist(
  source: typeof FIXTURE.resourceSpecialist | typeof FIXTURE.explorationSpecialist,
): Biologic & { vitality?: number } {
  return { ...source, fitnessWeights: [...source.fitnessWeights] };
}

function bridgeVitality(biologic: Biologic & { vitality?: number }): void {
  biologic.vitality = Math.min(
    3,
    Math.max(
      0.01,
      (biologic.vitality ?? biologic.consciousness) * 0.85 + biologic.consciousness * 0.15,
    ),
  );
}

function snapshot(biologic: Biologic & { vitality?: number }): V4PetriSpecialistSnapshot {
  return {
    id: biologic.id,
    form: biologic.form,
    adFitness: biologic.adFitness,
    consciousness: biologic.consciousness,
    alive: biologic.alive,
    generation: biologic.generation,
    speciation: biologic.speciation,
    vitality: biologic.vitality ?? biologic.consciousness,
    fitnessWeights: [...(biologic.fitnessWeights ?? [])],
  };
}

describe('organism-intelligence V4 Petri family evaluator', () => {
  test('deep-clones the exact frozen two-specialist fixture without mutating protocol data', () => {
    const before = JSON.stringify(FIXTURE);
    const state = createV4PetriInitialState(SEED);
    expect(state.biologics).toHaveLength(2);
    expect(state.biologics[0]).toEqual(FIXTURE.resourceSpecialist);
    expect(state.biologics[1]).toEqual(FIXTURE.explorationSpecialist);
    expect(state.biologics[0]).not.toBe(FIXTURE.resourceSpecialist);
    expect((state.biologics[0] as Biologic).fitnessWeights).not.toBe(
      FIXTURE.resourceSpecialist.fitnessWeights,
    );
    expect(v4DerivedSeed(SEED, 'petriRng')).toBe((SEED ^ FIXTURE.rngSeedXor) >>> 0);

    runV4PetriArm(SEED, 'full-semantic-selection');
    expect(JSON.stringify(FIXTURE)).toBe(before);
    expect([...V4_PETRI_ARMS]).toEqual([...FIXTURE.arms]);
  });

  test('runs all four declared arms with exact initial, percept, task, environment, and RNG matching', () => {
    const result = runV4PetriSeed(SEED);
    expect(result.arms.map((run) => run.arm)).toEqual([...FIXTURE.arms]);
    expect(result.matched.exact).toBe(true);
    expect(result.matched.environmentRngDrawCount).toBe(240);
    expect(new Set(result.arms.map((run) => run.hashes.initialStateSha256)).size).toBe(1);
    expect(new Set(result.arms.map((run) => run.hashes.perceptSha256)).size).toBe(1);
    expect(new Set(result.arms.map((run) => run.hashes.taskScheduleSha256)).size).toBe(1);
    expect(new Set(result.arms.map((run) => run.hashes.environmentRngTapeSha256)).size).toBe(1);
    expect(new Set(result.arms.map((run) => run.hashes.environmentTrajectorySha256)).size).toBe(1);
    expect(new Set(result.arms.map((run) => run.hashes.interventionSha256)).size).toBe(4);
    expect(new Set(result.arms.map((run) => run.hashes.trajectorySha256)).size).toBe(4);

    for (const run of result.arms) {
      expect(run.hashes.fixtureSha256).toBe(fixtureSha256('petri-digital-biologics'));
      expect(run.totalBeats).toBe(240);
      expect(run.scoredBeats).toBe(80);
      expect(run.primaryOutcome).toBeGreaterThanOrEqual(0);
      expect(run.primaryOutcome).toBeLessThanOrEqual(1);
      expect(run.secondary.favoredSpeciationShare).toBeGreaterThanOrEqual(0);
      expect(run.secondary.favoredSpeciationShare).toBeLessThanOrEqual(1);
      expect(run.secondary.lineageRetentionRate).toBe(1);
      expect(run.secondary.finalSpecialists.resource.id).toBe(FIXTURE.resourceSpecialist.id);
      expect(run.secondary.finalSpecialists.exploration.id).toBe(FIXTURE.explorationSpecialist.id);
      expect(run.secondary.finalSpecialists.resource.generation).toBe(240);
      expect(run.secondary.finalSpecialists.exploration.generation).toBe(240);
      expect(run.secondary.finalSpecialists.resource.alive).toBe(true);
      expect(run.secondary.finalSpecialists.exploration.alive).toBe(true);
    }

    const byArm = Object.fromEntries(result.arms.map((run) => [run.arm, run]));
    expect(byArm['full-semantic-selection']!.secondary.meanSelectionPressure).toBeGreaterThan(0);
    expect(
      byArm['semantic-channel-cyclic-permutation']!.secondary.meanSelectionPressure,
    ).toBeGreaterThan(0);
    expect(byArm['shared-field-disabled']!.secondary.meanSelectionPressure).toBe(0);
    expect(byArm['uniform-flux-no-affinity']!.secondary.meanSelectionPressure).toBe(0);
    expect(byArm['uniform-flux-no-affinity']!.affinityBypassed).toBe(true);
    expect(byArm['full-semantic-selection']!.primaryOutcome).not.toBe(
      byArm['shared-field-disabled']!.primaryOutcome,
    );
    expect(byArm['full-semantic-selection']!.secondary.favoredSpeciationShare).not.toBe(
      byArm['shared-field-disabled']!.secondary.favoredSpeciationShare,
    );
  });

  test('compares the disabled trajectory to a fresh, honestly scoped live legacy reference', () => {
    const result = runV4PetriSeed(SEED);
    const disabled = result.arms.find(({ arm }) => arm === 'shared-field-disabled')!;
    const comparison = disabled.secondary.legacyTrajectoryEquality;

    expect(comparison.applicable).toBe(true);
    expect(comparison.referenceBasis).toBe('same-seed-independent-live-undefined-signal-replay');
    expect(comparison.referenceScope).toBe('behavioral-equivalence-not-version-independent-golden');
    expect(comparison.observedTrajectorySha256).toBe(disabled.hashes.trajectorySha256);
    expect(comparison.referenceTrajectorySha256).toBe(disabled.hashes.trajectorySha256);
    expect(comparison.observedFinalStateSha256).toBe(disabled.hashes.finalStateSha256);
    expect(comparison.referenceFinalStateSha256).toBe(disabled.hashes.finalStateSha256);
    expect(comparison.exact).toBe(true);

    for (const intervened of result.arms.filter(({ arm }) => arm !== 'shared-field-disabled')) {
      expect(intervened.secondary.legacyTrajectoryEquality).toMatchObject({
        applicable: false,
        referenceTrajectorySha256: null,
        referenceFinalStateSha256: null,
        exact: null,
      });
      expect(intervened.secondary.legacyTrajectoryEquality.observedTrajectorySha256).toBe(
        intervened.hashes.trajectorySha256,
      );
    }
  });

  test('the uniform control truly bypasses affinity and gives both strains the same declared scalar', () => {
    const resource = cloneSpecialist(FIXTURE.resourceSpecialist);
    const exploration = cloneSpecialist(FIXTURE.explorationSpecialist);
    for (let beat = 0; beat < FIXTURE.totalBeats; beat++) {
      const regime = FIXTURE.regimes.find(
        (candidate) => beat >= candidate.firstBeat && beat <= candidate.lastBeat,
      )!;
      const signal = v4SemanticSignal(regime.signal);
      const uniformFlux = petriSharedEcologyFlux(signal);
      expect(uniformFlux).toBe(beat < 120 ? 0.34 : 0.22);
      stepBiologic(resource, uniformFlux, true);
      stepBiologic(exploration, uniformFlux, true);
      bridgeVitality(resource);
      bridgeVitality(exploration);
    }

    const evaluated = runV4PetriArm(SEED, 'uniform-flux-no-affinity');
    expect(evaluated.secondary.finalSpecialists.resource).toEqual(snapshot(resource));
    expect(evaluated.secondary.finalSpecialists.exploration).toEqual(snapshot(exploration));
    expect(evaluated.secondary.finalSpecialists.resource.speciation).toBe(
      evaluated.secondary.finalSpecialists.exploration.speciation,
    );
    expect(evaluated.secondary.meanSelectionPressure).toBe(0);
    expect(evaluated.secondary.selectionPressureActiveBeatRate).toBe(0);
  });

  test('same seed and arm replays byte-identically while a different seed changes the environment tape', () => {
    const first = runV4PetriArm(SEED, 'full-semantic-selection');
    const replay = runV4PetriArm(SEED, 'full-semantic-selection');
    const other = runV4PetriArm(V4_EVALUATION_SEEDS[1]!, 'full-semantic-selection');
    expect(replay).toEqual(first);
    expect(replay.hashes.trajectorySha256).toBe(first.hashes.trajectorySha256);
    expect(replay.secondary.lineageTrajectorySha256).toBe(first.secondary.lineageTrajectorySha256);
    expect(other.hashes.environmentRngTapeSha256).not.toBe(first.hashes.environmentRngTapeSha256);
    expect(other.hashes.initialStateSha256).not.toBe(first.hashes.initialStateSha256);
  });

  test(
    'executes the complete frozen 64-seed set with bounded outcomes and matched evidence',
    () => {
      const evaluation = runV4PetriEvaluation();
      expect(evaluation.evaluationSeeds).toEqual([...V4_EVALUATION_SEEDS]);
      expect(evaluation.runs).toHaveLength(64);
      expect(evaluation.fixtureSha256).toBe(fixtureSha256('petri-digital-biologics'));
      for (const run of evaluation.runs) {
        expect(run.matched.exact).toBe(true);
        expect(run.arms).toHaveLength(4);
        expect(run.arms.every((arm) => Number.isFinite(arm.primaryOutcome))).toBe(true);
        expect(run.arms.every((arm) => arm.primaryOutcome >= 0 && arm.primaryOutcome <= 1)).toBe(
          true,
        );
        expect(run.arms.every((arm) => arm.secondary.lineageRetentionRate === 1)).toBe(true);
        expect(
          run.arms.find(({ arm }) => arm === 'shared-field-disabled')!.secondary
            .legacyTrajectoryEquality.exact,
        ).toBe(true);
      }
    },
    // Full 64-seed × 4-arm eval is heavy; under `bun test --coverage` wall time ~2× cold.
    { timeout: 45_000 },
  );

  test('rejects malformed seeds, duplicate batches, and unknown runtime arm strings', () => {
    expect(() => createV4PetriInitialState(-1)).toThrow();
    expect(() => runV4PetriEvaluation([])).toThrow();
    expect(() => runV4PetriEvaluation([1, 1])).toThrow();
    expect(() => runV4PetriArm(1, 'invented-arm' as never)).toThrow();
  });
});
