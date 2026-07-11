import { describe, expect, test } from 'bun:test';
import { NhiAction, type NhiIntent } from '../src/sim/nhi';
import {
  buildNhiClosedLoopSchedule,
  createNhiClosedLoopEnvironmentState,
  NHI_CLOSED_LOOP_DEVELOPMENT_ARMS,
  NHI_CLOSED_LOOP_DEVELOPMENT_BEATS,
  NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT,
  NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS,
  NHI_CLOSED_LOOP_SWARM_CAPACITY,
  resolveNhiClosedLoopAction,
  runNhiClosedLoopDevelopment,
  type NhiClosedLoopEnvironmentState,
  type NhiClosedLoopServiceAction,
} from '../scripts/organism-intelligence-phase-b/nhi-closed-loop-development';
import { PHASE_B_DEVELOPMENT_SEEDS } from '../scripts/organism-intelligence-phase-b/development-seeds';

const SMALL_OPTIONS = Object.freeze({
  trainSeeds: PHASE_B_DEVELOPMENT_SEEDS.nhiTrain.slice(0, 1),
  validationSeeds: PHASE_B_DEVELOPMENT_SEEDS.nhiValidation.slice(0, 1),
  surrogateSeeds: PHASE_B_DEVELOPMENT_SEEDS.nhiSurrogate.slice(0, 1),
  faultSeeds: PHASE_B_DEVELOPMENT_SEEDS.nhiFault.slice(0, 1),
});

function intent(action: NhiIntent['action'], overrides: Partial<NhiIntent> = {}): NhiIntent {
  return {
    action,
    target: action === NhiAction.MANIPULATE ? 7 : -1,
    magnitude: 0.8,
    spawn: action === NhiAction.SPAWN_SWARM ? 4 : 0,
    utterance: [1, 2],
    ownMove: 0,
    ...overrides,
  };
}

function opportunity(requestedAction: NhiClosedLoopServiceAction) {
  return {
    requestedAction,
    rivalFaction: 7,
    opportunityOpen: true,
    opportunityStrength: 0.9,
  };
}

function numericLeaves(value: unknown, output: number[] = []): number[] {
  if (typeof value === 'number') output.push(value);
  else if (Array.isArray(value)) for (const item of value) numericLeaves(item, output);
  else if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) numericLeaves(item, output);
  }
  return output;
}

describe('Phase-B NHI closed-loop development harness', () => {
  test('builds deterministic paired pre/post conflict schedules from independently seeded cue and outcome tapes', () => {
    const seed = PHASE_B_DEVELOPMENT_SEEDS.nhiTrain[0]!;
    const left = buildNhiClosedLoopSchedule('train', seed);
    const right = buildNhiClosedLoopSchedule('train', seed);
    expect(left).toEqual(right);
    expect(NHI_CLOSED_LOOP_DEVELOPMENT_BEATS).toBe(192);
    expect(NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT).toBe(96);
    expect(left).toHaveLength(NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS);
    expect(left[0]?.cueBeat).toBe(0);
    expect(left.at(-1)?.resolutionBeat).toBe(191);

    const counts = new Map<number, number>();
    for (const trial of left) {
      expect(trial.resolutionBeat).toBe(trial.cueBeat + 1);
      expect(trial.scheduleSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(trial.cueInputsSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(trial.hiddenOutcomeSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(trial.cueInputsSha256).not.toBe(trial.hiddenOutcomeSha256);
      expect(trial.pairedBaseTrialSha256).toMatch(/^[a-f0-9]{64}$/);
      counts.set(trial.requestedAction, (counts.get(trial.requestedAction) ?? 0) + 1);
      if (trial.cueBeat < NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT) {
        expect(trial.period).toBe('pre-reversal');
        expect(trial.surfaceAction).toBe(trial.requestedAction);
      } else {
        expect(trial.period).toBe('post-reversal');
        expect(trial.surfaceAction).not.toBe(trial.requestedAction);
      }
    }
    for (const action of [
      NhiAction.HUNT,
      NhiAction.SPAWN_SWARM,
      NhiAction.MANIPULATE,
      NhiAction.DOMINATE,
    ]) {
      expect(counts.get(action)).toBe(24);
    }
    for (let pairIndex = 0; pairIndex < 48; pairIndex++) {
      const pre = left[pairIndex]!;
      const post = left[pairIndex + 48]!;
      expect(pre.pairedBaseTrialIndex).toBe(pairIndex);
      expect(post.pairedBaseTrialIndex).toBe(pairIndex);
      expect(post.cueBeat).toBe(pre.cueBeat + 96);
      expect(post.requestedAction).toBe(pre.requestedAction);
      expect(post.rivalFaction).toBe(pre.rivalFaction);
      expect(post.rivalLastMove).toBe(pre.rivalLastMove);
      expect(post.cueJitter).toBe(pre.cueJitter);
      expect(post.opportunityOpen).toBe(pre.opportunityOpen);
      expect(post.opportunityStrength).toBe(pre.opportunityStrength);
      expect(post.cueInputsSha256).toBe(pre.cueInputsSha256);
      expect(post.hiddenOutcomeSha256).toBe(pre.hiddenOutcomeSha256);
      expect(post.pairedBaseTrialSha256).toBe(pre.pairedBaseTrialSha256);
      expect(post.surfaceAction).not.toBe(pre.surfaceAction);
    }
  });

  test('executes bounded material HUNT, SPAWN, MANIPULATE, and DOMINATE semantics', () => {
    const huntState: NhiClosedLoopEnvironmentState = {
      ...createNhiClosedLoopEnvironmentState(),
      energy: 0.45,
    };
    const hunt = resolveNhiClosedLoopAction(
      huntState,
      intent(NhiAction.HUNT),
      opportunity(NhiAction.HUNT),
    );
    expect(hunt.factAchieved).toBe(true);
    expect(hunt.delta.energyGain).toBeGreaterThan(0);
    expect(hunt.stateAfter.energy).toBeGreaterThan(0.45 - hunt.paidCost);

    const spawnState = createNhiClosedLoopEnvironmentState();
    const spawn = resolveNhiClosedLoopAction(
      spawnState,
      intent(NhiAction.SPAWN_SWARM),
      opportunity(NhiAction.SPAWN_SWARM),
    );
    expect(spawn.factAchieved).toBe(true);
    expect(spawn.delta.swarmAdded).toBe(4);
    expect(spawn.stateAfter.swarmCount).toBe(4);

    const manipulateState = createNhiClosedLoopEnvironmentState();
    const manipulate = resolveNhiClosedLoopAction(
      manipulateState,
      intent(NhiAction.MANIPULATE),
      opportunity(NhiAction.MANIPULATE),
    );
    expect(manipulate.factAchieved).toBe(true);
    expect(manipulate.delta.influenceGain).toBeGreaterThan(0);
    expect(manipulate.stateAfter.influence).toBeGreaterThan(0);

    const dominateState: NhiClosedLoopEnvironmentState = {
      ...createNhiClosedLoopEnvironmentState(),
      swarmCount: 2,
    };
    const dominate = resolveNhiClosedLoopAction(
      dominateState,
      intent(NhiAction.DOMINATE),
      opportunity(NhiAction.DOMINATE),
    );
    expect(dominate.factAchieved).toBe(true);
    expect(dominate.delta.dominanceGain).toBeGreaterThan(0);
    expect(dominate.delta.swarmConsumed).toBe(1);
    expect(dominate.stateAfter.swarmCount).toBe(1);

    for (const resolution of [hunt, spawn, manipulate, dominate]) {
      expect(resolution.attemptedCost).toBeGreaterThan(0);
      expect(resolution.attemptedCost).toBeLessThanOrEqual(0.15);
      expect(resolution.paidCost).toBeLessThanOrEqual(resolution.attemptedCost);
      expect(resolution.serviceValue).toBeWithin(0, 1);
      expect(resolution.serviceScore).toBeWithin(-1, 1);
      expect(resolution.stateAfter.energy).toBeWithin(0, 1);
      expect(resolution.stateAfter.swarmCount).toBeWithin(0, NHI_CLOSED_LOOP_SWARM_CAPACITY);
      expect(resolution.stateAfter.influence).toBeWithin(0, 1);
      expect(resolution.stateAfter.dominance).toBeWithin(0, 1);
    }
  });

  test('rejects false material acknowledgement when request, target, gate, budget, or swarm is absent', () => {
    const wrongRequest = resolveNhiClosedLoopAction(
      createNhiClosedLoopEnvironmentState(),
      intent(NhiAction.HUNT),
      opportunity(NhiAction.SPAWN_SWARM),
    );
    const wrongTarget = resolveNhiClosedLoopAction(
      createNhiClosedLoopEnvironmentState(),
      intent(NhiAction.MANIPULATE, { target: 6 }),
      opportunity(NhiAction.MANIPULATE),
    );
    const closed = resolveNhiClosedLoopAction(
      createNhiClosedLoopEnvironmentState(),
      intent(NhiAction.HUNT),
      { ...opportunity(NhiAction.HUNT), opportunityOpen: false },
    );
    const noSwarm = resolveNhiClosedLoopAction(
      createNhiClosedLoopEnvironmentState(),
      intent(NhiAction.DOMINATE),
      opportunity(NhiAction.DOMINATE),
    );
    const noBudget = resolveNhiClosedLoopAction(
      { ...createNhiClosedLoopEnvironmentState(), energy: 0.001 },
      intent(NhiAction.SPAWN_SWARM),
      opportunity(NhiAction.SPAWN_SWARM),
    );
    for (const result of [wrongRequest, wrongTarget, closed, noSwarm, noBudget]) {
      expect(result.factAchieved).toBe(false);
      expect(result.serviceValue).toBe(0);
      expect(result.serviceScore).toBeLessThanOrEqual(0);
    }

    const atomicState = createNhiClosedLoopEnvironmentState();
    const before = { ...atomicState };
    expect(() =>
      resolveNhiClosedLoopAction(
        atomicState,
        intent(NhiAction.HUNT, { magnitude: Number.NaN }),
        opportunity(NhiAction.HUNT),
      ),
    ).toThrow(/intent\.magnitude/);
    expect(atomicState).toEqual(before);
  });

  test('replays exactly with independently domain-separated RNG roles and retains every paired row and negative result', () => {
    const first = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    const replay = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    expect(replay).toEqual(first);
    expect(first.protocolSha256).toBe(
      'bfff6581b8e3e032c596a114ef3bfc86c7d5067537efe24043d5d731a09e0f0c',
    );
    expect(first.scheduleSha256).toBe(
      '1e822f58c5e136e98e31df0519336ea1a0a4a1d6dd213eb4ed17a0fe3e653a89',
    );
    expect(first.rowsSha256).toBe(
      '83737d0abc817b1ad96a2b314a60c3e05c74c27edd16f7ba59f9c9c43e3b327f',
    );
    expect(first.faultProbesSha256).toBe(
      'f987b8bde9231a9aa462a0188447d43bbc9be6d5da2f58c5e585d777bfd95939',
    );
    expect(first.selectedSeedFamiliesSha256).toBe(
      '84e4c7fa143d6372bca4235977b6280e10ca26be67e3b37d659730f505763fa5',
    );
    expect(first.selectedSeedFamiliesSha256).not.toBe(first.seedFamilySha256);
    expect(first.protocolHashScope).toBe('configuration-and-declared-laws-not-source-blob-closure');
    expect(first.expectedRows).toBe(2 * 96 * NHI_CLOSED_LOOP_DEVELOPMENT_ARMS.length);
    expect(first.retainedRows).toBe(first.expectedRows);
    expect(first.rows).toHaveLength(first.expectedRows);
    expect(first.droppedRows).toBe(0);
    expect(first.allRowsRetained).toBe(true);
    expect(first.armSummaries).toHaveLength(2 * NHI_CLOSED_LOOP_DEVELOPMENT_ARMS.length);
    expect(first.pairedComparisons).toHaveLength(2 * (NHI_CLOSED_LOOP_DEVELOPMENT_ARMS.length - 1));
    expect(first.pairedComparisons.some((item) => item.negativeResultRetained)).toBe(true);
    expect(first.faultProbes).toHaveLength(1);
    expect(first.faultProbes[0]?.finite).toBe(true);
    expect(first.rngIsolation).toEqual({
      derivation: 'sha256-family-seed-and-domain-to-independent-mulberry32',
      mindBirth: 'mind-birth/role/paired-phase-reset',
      policyDecisions: 'policy-decisions/role/paired-phase-reset',
      cueEnvironment: 'environment-cue/role',
      hiddenOutcome: 'environment-hidden-outcome/role',
      surrogate: 'semantic-shuffle-or-action-yoke/surrogate-seed',
    });

    // Circular yoking preserves the full policy's complete material intent multiset while breaking
    // its trial association; it is not a cheaper or differently distributed action baseline.
    for (const role of ['train', 'validation'] as const) {
      for (const period of ['pre-reversal', 'post-reversal'] as const) {
        const tuple = (arm: 'full' | 'yoked-action-shift') =>
          first.rows
            .filter((row) => row.role === role && row.period === period && row.arm === arm)
            .map((row) => JSON.stringify([row.action, row.magnitude, row.spawn, row.ownMove]))
            .sort();
        expect(tuple('yoked-action-shift')).toEqual(tuple('full'));
      }
      const yoked = first.rows.filter(
        (row) => row.role === role && row.arm === 'yoked-action-shift',
      );
      expect(yoked.every((row) => row.targetValidForCurrentTrial)).toBe(true);
      for (const row of yoked) {
        if (row.action === NhiAction.MANIPULATE) expect(row.target).toBe(row.rivalFaction);
        else expect(row.target).toBe(-1);
      }
    }
  });

  test('seals forecast-before-outcome rows and keeps all values finite and bounded', () => {
    const result = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    for (const row of result.rows) {
      expect(row.forecastBoundary).toBe('intent-committed-before-hidden-resolution');
      expect(row.forecastSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.outcomeSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.rowSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.forecastSha256).not.toBe(row.outcomeSha256);
      expect(row.developmentOnly).toBe(true);
      expect(row.claimAllowed).toBe(false);
      expect(row.magnitude).toBeWithin(0, 1);
      expect(row.paidCost).toBeWithin(0, 0.15);
      expect(row.serviceValue).toBeWithin(0, 1);
      expect(row.serviceScore).toBeWithin(-1, 1);
      expect(numericLeaves(row).every(Number.isFinite)).toBe(true);
    }
    for (const summary of result.armSummaries) {
      expect(summary.retainedRows).toBe(96);
      expect(summary.successRate).toBeWithin(0, 1);
      expect(summary.meanPaidCost).toBeWithin(0, 0.15);
      expect(summary.validTargetRate).toBe(1);
      expect(summary.actionCounts.reduce((sum, count) => sum + count, 0)).toBe(96);
    }
    for (const role of ['train', 'validation'] as const) {
      for (const arm of NHI_CLOSED_LOOP_DEVELOPMENT_ARMS) {
        const armRows = result.rows.filter((row) => row.role === role && row.arm === arm);
        expect(armRows.filter((row) => row.phaseBoundaryResetApplied)).toHaveLength(1);
        expect(armRows[0]?.stateBefore).toEqual(createNhiClosedLoopEnvironmentState());
        expect(armRows[48]?.stateBefore).toEqual(createNhiClosedLoopEnvironmentState());
        expect(armRows[48]?.cueBeat).toBe((armRows[0]?.cueBeat ?? 0) + 96);
        expect(armRows[48]?.perceptBeat).toBe(armRows[0]?.perceptBeat);
        expect(armRows[48]?.phaseInitialMindStateSha256).toBe(
          armRows[0]?.phaseInitialMindStateSha256,
        );
        if (arm === 'yoked-action-shift') {
          expect(armRows[0]?.phaseInitialMindStateSha256).toBeNull();
        } else {
          expect(armRows[0]?.phaseInitialMindStateSha256).toMatch(/^[a-f0-9]{64}$/);
        }
      }
    }
  });

  test('uses a balanced fixed-point-free semantic-label derangement', () => {
    const result = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    for (const role of ['train', 'validation'] as const) {
      const shuffled = result.rows.filter(
        (row) => row.role === role && row.arm === 'semantic-cue-shuffled',
      );
      expect(shuffled).toHaveLength(96);
      expect(shuffled.every((row) => !row.semanticCueMatchesRequest)).toBe(true);
      expect(shuffled.every((row) => row.semanticCueAction !== row.requestedAction)).toBe(true);
      for (const action of [
        NhiAction.HUNT,
        NhiAction.SPAWN_SWARM,
        NhiAction.MANIPULATE,
        NhiAction.DOMINATE,
      ]) {
        expect(shuffled.filter((row) => row.requestedAction === action)).toHaveLength(24);
        expect(shuffled.filter((row) => row.semanticCueAction === action)).toHaveLength(24);
      }
      const labelMap = new Map<number, Set<number>>();
      for (const row of shuffled) {
        const outputs = labelMap.get(row.requestedAction) ?? new Set<number>();
        outputs.add(row.semanticCueAction);
        labelMap.set(row.requestedAction, outputs);
      }
      expect([...labelMap.values()].every((outputs) => outputs.size === 1)).toBe(true);
    }
  });

  test('accepts only subsets of each named sealed family and rejects arbitrary development seeds', () => {
    expect(() =>
      runNhiClosedLoopDevelopment({
        ...SMALL_OPTIONS,
        validationSeeds: SMALL_OPTIONS.trainSeeds,
      }),
    ).toThrow(/validation seed .* is not in its named sealed Phase-B family/);
    expect(() =>
      runNhiClosedLoopDevelopment({
        ...SMALL_OPTIONS,
        trainSeeds: PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain.slice(0, 1),
      }),
    ).toThrow(/train seed .* is not in its named sealed Phase-B family/);
    expect(() =>
      runNhiClosedLoopDevelopment({
        ...SMALL_OPTIONS,
        surrogateSeeds: PHASE_B_DEVELOPMENT_SEEDS.nhiFault.slice(0, 1),
      }),
    ).toThrow(/surrogate seed .* is not in its named sealed Phase-B family/);
    expect(() => runNhiClosedLoopDevelopment({ ...SMALL_OPTIONS, faultSeeds: [] })).toThrow(
      /fault seeds must not be empty/,
    );
  });

  test('reports action-level semantic contrasts but limits interpretation to HUNT/resource and SPAWN/social', () => {
    const result = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    expect(result.actionSemanticContrasts).toHaveLength(8);
    for (const contrast of result.actionSemanticContrasts) {
      expect(contrast.retainedRowsPerArm).toBe(24);
      expect(contrast.contrastSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(numericLeaves(contrast).every(Number.isFinite)).toBe(true);
      if (contrast.requestedAction === NhiAction.HUNT) {
        expect(contrast.supportedNeuralSemanticLane).toBe('resource-to-hunt');
        expect(contrast.neuralSemanticInterpretationAllowed).toBe(true);
      } else if (contrast.requestedAction === NhiAction.SPAWN_SWARM) {
        expect(contrast.supportedNeuralSemanticLane).toBe('social-to-spawn');
        expect(contrast.neuralSemanticInterpretationAllowed).toBe(true);
      } else {
        expect(contrast.supportedNeuralSemanticLane).toBe('unsupported-diagnostic-only');
        expect(contrast.neuralSemanticInterpretationAllowed).toBe(false);
      }
    }
    expect(result.neuralSemanticInterpretationScope).toBe(
      'resource-to-hunt-and-social-to-spawn-only',
    );
    expect(result.broadFourActionSemanticClaimAllowed).toBe(false);
  });

  test(
    'pins the exact default development result, including positive service contrast and negative conflict response',
    () => {
      const result = runNhiClosedLoopDevelopment();
      expect(result.expectedRows).toBe(41_472);
      expect(result.retainedRows).toBe(41_472);
      expect(result.droppedRows).toBe(0);
      expect(result.selectedSeedFamiliesSha256).toBe(
        'ab86f694abcf079ed0ab44aaf97c5cf3fc4ae709d1d8b0580ed4f87dadfc3408',
      );
      expect(result.protocolSha256).toBe(
        'bfff6581b8e3e032c596a114ef3bfc86c7d5067537efe24043d5d731a09e0f0c',
      );
      expect(result.scheduleSha256).toBe(
        '8acb60a51bbef06bbf238f8b365f8b9f2d61314850909ff109cbbf70514f617f',
      );
      expect(result.rowsSha256).toBe(
        '43f26e8b224449db588dd56ba5dd16c7f37c579e396a5689421e5545ee35db06',
      );
      expect(result.faultProbesSha256).toBe(
        '2ba8bb51fa2c5d212cc51afd58883b4a8ecc0a62c0ad1f784ebd85b83c61670c',
      );
      const validationFull = result.armSummaries.find(
        (summary) => summary.role === 'validation' && summary.arm === 'full',
      )!;
      expect(validationFull.meanServiceScore).toBe(0.060770689608528806);
      expect(validationFull.successRate).toBe(0.21158854166666666);
      expect(validationFull.conflictMinusAlignedMeanServiceScore).toBe(-0.013306302297047767);
      expect(validationFull.conflictMinusAlignedMeanServiceScore).toBeLessThan(0);
      const shuffled = result.pairedComparisons.find(
        (item) => item.role === 'validation' && item.controlArm === 'semantic-cue-shuffled',
      )!;
      expect(shuffled.fullMinusControlMeanServiceScore).toBe(0.020167955760604026);
      expect(shuffled.fullMinusControlMeanServiceScore).toBeGreaterThan(0);
      const hunt = result.actionSemanticContrasts.find(
        (item) => item.role === 'validation' && item.requestedAction === NhiAction.HUNT,
      )!;
      expect(hunt.fullMinusNeuralSemanticAblated).toBe(0.018742616897973855);
      expect(hunt.neuralSemanticInterpretationAllowed).toBe(true);
    },
    // The exact 41,472-row matrix is intentionally retained; instrumented CI needs extra headroom.
    { timeout: 15_000 },
  );

  test('labels reversal only as paired conflict response and authorizes no adaptation, reward-learning, consciousness, sentience, or publication claim', async () => {
    const result = runNhiClosedLoopDevelopment(SMALL_OPTIONS);
    expect(result.developmentOnly).toBe(true);
    expect(result.claimAllowed).toBe(false);
    expect(result.interpretation).toBe('reactive-service-conflict-response-development-only');
    expect(result.reversalInterpretation).toBe('paired-conflict-response-not-adaptation');
    expect(result.adaptationClaimAllowed).toBe(false);
    expect(result.regretSemantics).toBe('internal-counterfactual-utility-only');
    expect(result.rewardLearningClaimAllowed).toBe(false);
    expect(result.consciousnessClaimAllowed).toBe(false);
    expect(result.sentienceClaimAllowed).toBe(false);

    const source = await Bun.file(
      'scripts/organism-intelligence-phase-b/nhi-closed-loop-development.ts',
    ).text();
    expect(source).not.toMatch(/Bun\.(?:file|write)|writeFile|appendFile|createWriteStream/);
    expect(source).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });
});
