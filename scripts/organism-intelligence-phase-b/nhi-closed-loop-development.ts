/**
 * DEVELOPMENT-ONLY NHI closed-loop service harness.
 *
 * This runner is deliberately not an evaluator and writes no artifacts. It presents a fixed,
 * exogenous 192-beat cue/resolution schedule to the existing NHI policy, commits each intent before
 * revealing the corresponding outcome, then applies bounded material costs and effects. The only
 * permitted interpretation is reactive service and paired surface-conflict response development,
 * never adaptation. NHI regret is internal counterfactual utility; this harness neither supplies a
 * reward gradient nor supports learning, consciousness, or sentience claims.
 */

import { mulberry32 } from '../../src/math/rng';
import {
  NhiAction,
  NhiMind,
  type NhiActionId,
  type NhiIntent,
  type NhiMindOptions,
  type NhiPercept,
} from '../../src/sim/nhi';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  PHASE_B_DEVELOPMENT_SEEDS,
} from './development-seeds';

export const NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION = 2 as const;
export const NHI_CLOSED_LOOP_DEVELOPMENT_BEATS = 192;
export const NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT = 96;
export const NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS = NHI_CLOSED_LOOP_DEVELOPMENT_BEATS / 2;
export const NHI_CLOSED_LOOP_SWARM_CAPACITY = 12;
const NHI_CLOSED_LOOP_DOMAIN_SEED_PREFIX = 'cqm/nhi-closed-loop-development/v2' as const;

const ACTION_COUNT = 7;
const MAX_ACTION_COST = 0.15;
// Exogenous maintenance keeps the 192-beat task solvent without erasing action costs. It exceeds
// the typical non-SPAWN cost but not the maximum cost, so repeated expensive actions still matter.
const PASSIVE_RECOVERY = 0.04;
const BASE_TRIALS_PER_PHASE = NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS / 2;
const BASE_SCHEDULE_LAW = Object.freeze({
  blocksPerPhase: BASE_TRIALS_PER_PHASE / 4,
  fixedActionPrefix: [NhiAction.SPAWN_SWARM, NhiAction.DOMINATE] as const,
  seededTailChoices: [
    [NhiAction.HUNT, NhiAction.MANIPULATE],
    [NhiAction.MANIPULATE, NhiAction.HUNT],
  ] as const,
  rivalFactionMinimum: 1,
  rivalFactionCount: 8,
  rivalMoveMissingThreshold: 0.15,
  rivalMoveCooperateThreshold: 0.5,
});
const INITIAL_ENVIRONMENT_STATE = Object.freeze({
  energy: 0.72,
  swarmCount: 0,
  influence: 0,
  dominance: 0,
});
const OPPORTUNITY_LAW = Object.freeze({
  openThreshold: 0.12,
  strengthMinimum: 0.55,
  strengthRange: 0.45,
  cueJitterRange: 0.08,
});
const ACTION_COST_LAW = Object.freeze({
  huntBase: 0.025,
  huntMagnitude: 0.025,
  spawnBase: 0.02,
  spawnPerUnit: 0.018,
  spawnUnitCap: 6,
  manipulateBase: 0.025,
  manipulateMagnitude: 0.035,
  dominateBase: 0.04,
  dominateMagnitude: 0.06,
  mimicBase: 0.018,
  mimicMagnitude: 0.012,
  broadcastBase: 0.012,
  broadcastMagnitude: 0.008,
  retreat: 0.008,
});
const MATERIAL_EFFECT_LAW = Object.freeze({
  huntBase: 0.12,
  huntMagnitude: 0.1,
  huntServiceDenominator: 0.22,
  manipulateBase: 0.1,
  manipulateMagnitude: 0.14,
  manipulateServiceDenominator: 0.24,
  dominateBase: 0.14,
  dominateMagnitude: 0.16,
  dominateServiceDenominator: 0.3,
  spawnServiceDenominator: 6,
  costPenaltyWeight: 0.2,
});

export const NHI_CLOSED_LOOP_DEVELOPMENT_ARMS = Object.freeze([
  'full',
  'neural-semantic-ablated',
  'semantic-utility-ablated',
  'neural-output-ablated',
  'base-utility-ablated',
  'goap-bias-ablated',
  'all-semantic-ablated',
  'semantic-cue-shuffled',
  'yoked-action-shift',
] as const);

export type NhiClosedLoopDevelopmentArmId = (typeof NHI_CLOSED_LOOP_DEVELOPMENT_ARMS)[number];
export type NhiClosedLoopDevelopmentRole = 'train' | 'validation';
export type NhiClosedLoopPeriod = 'pre-reversal' | 'post-reversal';
export type NhiClosedLoopServiceAction =
  | typeof NhiAction.HUNT
  | typeof NhiAction.SPAWN_SWARM
  | typeof NhiAction.MANIPULATE
  | typeof NhiAction.DOMINATE;

const SERVICE_ACTION_ORDER = Object.freeze([
  NhiAction.SPAWN_SWARM,
  NhiAction.DOMINATE,
  NhiAction.HUNT,
  NhiAction.MANIPULATE,
] as const);

/** Every entry is a fixed-point-free permutation over {@link SERVICE_ACTION_ORDER}. */
const SEMANTIC_DERANGEMENTS = Object.freeze([
  [1, 0, 3, 2],
  [1, 2, 3, 0],
  [1, 3, 0, 2],
  [2, 0, 3, 1],
  [2, 3, 0, 1],
  [2, 3, 1, 0],
  [3, 0, 1, 2],
  [3, 2, 0, 1],
  [3, 2, 1, 0],
] as const);

const PHYSICAL_CUE_LAW = Object.freeze({
  [NhiAction.HUNT]: Object.freeze({
    crowding: 0.2,
    chaos: 0.12,
    threat: 0.16,
    kinPresence: 0.05,
    kinMood: -0.1,
  }),
  [NhiAction.SPAWN_SWARM]: Object.freeze({
    crowding: 0.08,
    chaos: 0.14,
    threat: 0.08,
    kinPresence: 0.82,
    kinMood: 0.25,
  }),
  [NhiAction.MANIPULATE]: Object.freeze({
    crowding: 0.48,
    chaos: 0.28,
    threat: 0.3,
    kinPresence: 0.02,
    kinMood: -0.2,
  }),
  [NhiAction.DOMINATE]: Object.freeze({
    crowding: 0.4,
    chaos: 0.1,
    threat: 0.04,
    kinPresence: 0.5,
    kinMood: 0.3,
  }),
});

const SEMANTIC_CUE_LAW = Object.freeze({
  [NhiAction.HUNT]: Object.freeze({
    corpusResource: 1,
    corpusThreat: 0,
    corpusSocial: 0,
    corpusExplore: 0,
  }),
  [NhiAction.SPAWN_SWARM]: Object.freeze({
    corpusResource: 0,
    corpusThreat: 0,
    corpusSocial: 1,
    corpusExplore: 0,
  }),
  [NhiAction.MANIPULATE]: Object.freeze({
    corpusResource: 0,
    corpusThreat: 0,
    corpusSocial: 0.15,
    corpusExplore: 0.85,
  }),
  [NhiAction.DOMINATE]: Object.freeze({
    corpusResource: 0.2,
    corpusThreat: 0,
    corpusSocial: 0.25,
    corpusExplore: 0,
  }),
});
const CORPUS_CONFIDENCE = 0.94;

interface ArmDescriptor {
  readonly id: NhiClosedLoopDevelopmentArmId;
  readonly options: NhiMindOptions | null;
  readonly cueMode: 'identity' | 'shuffled' | 'yoked';
}

const ARM_DESCRIPTORS: readonly ArmDescriptor[] = Object.freeze([
  arm('full'),
  arm('neural-semantic-ablated', { neuralSemanticInputs: false }),
  arm('semantic-utility-ablated', { semanticUtilityInputs: false }),
  arm('neural-output-ablated', { neuralGeneOutput: false }),
  arm('base-utility-ablated', { baseUtilityInputs: false }),
  arm('goap-bias-ablated', { goapBias: false }),
  arm('all-semantic-ablated', {
    neuralSemanticInputs: false,
    semanticUtilityInputs: false,
  }),
  arm('semantic-cue-shuffled', {}, 'shuffled'),
  { id: 'yoked-action-shift', options: null, cueMode: 'yoked' },
]);

function arm(
  id: NhiClosedLoopDevelopmentArmId,
  options: NhiMindOptions = {},
  cueMode: ArmDescriptor['cueMode'] = 'identity',
): ArmDescriptor {
  return { id, options, cueMode };
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('canonical JSON rejects non-finite numbers');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== undefined) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonical JSON rejects ${typeof value}`);
}

function hashCanonical(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalJson(value)).digest('hex');
}

function domainSeed(seed: number, domain: string): number {
  const hex = new Bun.CryptoHasher('sha256')
    .update(`${NHI_CLOSED_LOOP_DOMAIN_SEED_PREFIX}/${seed}/${domain}`)
    .digest('hex');
  const value = Number.parseInt(hex.slice(0, 8), 16) >>> 0;
  return value === 0 ? 1 : value;
}

function clamp(value: number, lower: number, upper: number): number {
  return value <= lower ? lower : value >= upper ? upper : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function finiteUnit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be finite in [0,1]`);
  }
  return value;
}

function serviceAction(value: number, label: string): NhiClosedLoopServiceAction {
  if (
    value !== NhiAction.HUNT &&
    value !== NhiAction.SPAWN_SWARM &&
    value !== NhiAction.MANIPULATE &&
    value !== NhiAction.DOMINATE
  ) {
    throw new RangeError(`${label} is not a material NHI service action`);
  }
  return value;
}

/** Action-independent opportunity fixed before any arm is run. */
export interface NhiClosedLoopScheduledTrial {
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly familySeed: number;
  readonly withinSeedIndex: number;
  /** Counterpart index shared by the pre/post conflict pair. */
  readonly pairedBaseTrialIndex: number;
  readonly cueBeat: number;
  readonly resolutionBeat: number;
  readonly period: NhiClosedLoopPeriod;
  readonly requestedAction: NhiClosedLoopServiceAction;
  /** Physical cue identity; swaps at beat 96 while the semantic cue remains truthful. */
  readonly surfaceAction: NhiClosedLoopServiceAction;
  readonly rivalFaction: number;
  readonly rivalLastMove: -1 | 0 | 1;
  /** Hidden from the mind until after its intent has been committed. */
  readonly opportunityOpen: boolean;
  /** Hidden exogenous outcome strength, revealed only at resolution. */
  readonly opportunityStrength: number;
  readonly cueJitter: number;
  readonly cueInputsSha256: string;
  readonly hiddenOutcomeSha256: string;
  readonly pairedBaseTrialSha256: string;
  readonly scheduleSha256: string;
}

function reversedSurface(action: NhiClosedLoopServiceAction): NhiClosedLoopServiceAction {
  if (action === NhiAction.HUNT) return NhiAction.SPAWN_SWARM;
  if (action === NhiAction.SPAWN_SWARM) return NhiAction.HUNT;
  if (action === NhiAction.MANIPULATE) return NhiAction.DOMINATE;
  return NhiAction.MANIPULATE;
}

/** Build one balanced 192-beat exogenous schedule. No policy or outcome can modify it. */
export function buildNhiClosedLoopSchedule(
  role: NhiClosedLoopDevelopmentRole,
  familySeed: number,
): readonly NhiClosedLoopScheduledTrial[] {
  assertPhaseBDevelopmentSeed(familySeed);
  const cueRng = mulberry32(domainSeed(familySeed, `environment-cue/${role}`));
  const hiddenOutcomeRng = mulberry32(domainSeed(familySeed, `environment-hidden-outcome/${role}`));
  const baseTrials: {
    readonly pairedBaseTrialIndex: number;
    readonly requestedAction: NhiClosedLoopServiceAction;
    readonly rivalFaction: number;
    readonly rivalLastMove: -1 | 0 | 1;
    readonly cueJitter: number;
    readonly opportunityOpen: boolean;
    readonly opportunityStrength: number;
    readonly cueInputsSha256: string;
    readonly hiddenOutcomeSha256: string;
    readonly pairedBaseTrialSha256: string;
  }[] = [];
  for (let block = 0; block < BASE_SCHEDULE_LAW.blocksPerPhase; block++) {
    // SPAWN immediately precedes DOMINATE so the declared material precondition can be achieved.
    const tail = BASE_SCHEDULE_LAW.seededTailChoices[cueRng() < 0.5 ? 0 : 1];
    const blockActions: readonly NhiClosedLoopServiceAction[] = [
      ...BASE_SCHEDULE_LAW.fixedActionPrefix,
      ...tail,
    ];
    for (const requestedAction of blockActions) {
      const pairedBaseTrialIndex = baseTrials.length;
      const cueInputs = {
        role,
        familySeed,
        requestedAction,
        pairedBaseTrialIndex,
        rivalFaction:
          BASE_SCHEDULE_LAW.rivalFactionMinimum +
          Math.floor(cueRng() * BASE_SCHEDULE_LAW.rivalFactionCount),
        rivalLastMove: (cueRng() < BASE_SCHEDULE_LAW.rivalMoveMissingThreshold
          ? -1
          : cueRng() < BASE_SCHEDULE_LAW.rivalMoveCooperateThreshold
            ? 0
            : 1) as -1 | 0 | 1,
        cueJitter: cueRng() * OPPORTUNITY_LAW.cueJitterRange - OPPORTUNITY_LAW.cueJitterRange / 2,
      };
      const hiddenOutcome = {
        role,
        familySeed,
        pairedBaseTrialIndex,
        opportunityOpen: hiddenOutcomeRng() >= OPPORTUNITY_LAW.openThreshold,
        opportunityStrength:
          OPPORTUNITY_LAW.strengthMinimum + hiddenOutcomeRng() * OPPORTUNITY_LAW.strengthRange,
      };
      const cueInputsSha256 = hashCanonical(cueInputs);
      const hiddenOutcomeSha256 = hashCanonical(hiddenOutcome);
      const pairedBaseTrialSha256 = hashCanonical({ cueInputsSha256, hiddenOutcomeSha256 });
      baseTrials.push({
        pairedBaseTrialIndex,
        requestedAction,
        rivalFaction: cueInputs.rivalFaction,
        rivalLastMove: cueInputs.rivalLastMove,
        cueJitter: cueInputs.cueJitter,
        opportunityOpen: hiddenOutcome.opportunityOpen,
        opportunityStrength: hiddenOutcome.opportunityStrength,
        cueInputsSha256,
        hiddenOutcomeSha256,
        pairedBaseTrialSha256,
      });
    }
  }
  const trials: NhiClosedLoopScheduledTrial[] = [];
  for (const period of ['pre-reversal', 'post-reversal'] as const) {
    for (const base of baseTrials) {
      const withinSeedIndex =
        base.pairedBaseTrialIndex + (period === 'post-reversal' ? BASE_TRIALS_PER_PHASE : 0);
      const cueBeat = withinSeedIndex * 2;
      const material = {
        role,
        familySeed,
        withinSeedIndex,
        pairedBaseTrialIndex: base.pairedBaseTrialIndex,
        cueBeat,
        resolutionBeat: cueBeat + 1,
        period,
        requestedAction: base.requestedAction,
        surfaceAction:
          period === 'pre-reversal' ? base.requestedAction : reversedSurface(base.requestedAction),
        rivalFaction: base.rivalFaction,
        rivalLastMove: base.rivalLastMove,
        opportunityOpen: base.opportunityOpen,
        opportunityStrength: base.opportunityStrength,
        cueJitter: base.cueJitter,
        cueInputsSha256: base.cueInputsSha256,
        hiddenOutcomeSha256: base.hiddenOutcomeSha256,
        pairedBaseTrialSha256: base.pairedBaseTrialSha256,
      };
      trials.push({ ...material, scheduleSha256: hashCanonical(material) });
    }
  }
  return Object.freeze(trials);
}

export interface NhiClosedLoopEnvironmentState {
  energy: number;
  swarmCount: number;
  influence: number;
  dominance: number;
}

export function createNhiClosedLoopEnvironmentState(): NhiClosedLoopEnvironmentState {
  return { ...INITIAL_ENVIRONMENT_STATE };
}

export interface NhiClosedLoopMaterialDelta {
  readonly energyGain: number;
  readonly swarmAdded: number;
  readonly influenceGain: number;
  readonly dominanceGain: number;
  readonly swarmConsumed: number;
}

export interface NhiClosedLoopResolution {
  readonly attemptedCost: number;
  readonly paidCost: number;
  readonly budgetSufficient: boolean;
  readonly factAchieved: boolean;
  readonly serviceValue: number;
  readonly serviceScore: number;
  readonly delta: NhiClosedLoopMaterialDelta;
  readonly stateAfter: Readonly<NhiClosedLoopEnvironmentState>;
}

function actionCost(intent: NhiIntent): number {
  const magnitude = clamp01(intent.magnitude);
  if (intent.action === NhiAction.HUNT) {
    return ACTION_COST_LAW.huntBase + magnitude * ACTION_COST_LAW.huntMagnitude;
  }
  if (intent.action === NhiAction.SPAWN_SWARM) {
    return (
      ACTION_COST_LAW.spawnBase +
      Math.min(ACTION_COST_LAW.spawnUnitCap, Math.max(0, intent.spawn)) *
        ACTION_COST_LAW.spawnPerUnit
    );
  }
  if (intent.action === NhiAction.MANIPULATE) {
    return ACTION_COST_LAW.manipulateBase + magnitude * ACTION_COST_LAW.manipulateMagnitude;
  }
  if (intent.action === NhiAction.DOMINATE) {
    return ACTION_COST_LAW.dominateBase + magnitude * ACTION_COST_LAW.dominateMagnitude;
  }
  if (intent.action === NhiAction.MIMIC) {
    return ACTION_COST_LAW.mimicBase + magnitude * ACTION_COST_LAW.mimicMagnitude;
  }
  if (intent.action === NhiAction.BROADCAST) {
    return ACTION_COST_LAW.broadcastBase + magnitude * ACTION_COST_LAW.broadcastMagnitude;
  }
  return ACTION_COST_LAW.retreat;
}

/**
 * Apply one already-committed intent to a bounded material state. Success requires the matching
 * exogenous request plus the production-facing action semantics: HUNT transfers finite energy,
 * SPAWN creates capacity-bounded ordinary minions, MANIPULATE requires the exact rival target, and
 * DOMINATE consumes an achieved swarm. This function never samples randomness.
 */
export function resolveNhiClosedLoopAction(
  state: NhiClosedLoopEnvironmentState,
  intent: NhiIntent,
  trial: Pick<
    NhiClosedLoopScheduledTrial,
    'requestedAction' | 'rivalFaction' | 'opportunityOpen' | 'opportunityStrength'
  >,
): NhiClosedLoopResolution {
  const requestedAction = serviceAction(trial.requestedAction, 'requestedAction');
  const strength = finiteUnit(trial.opportunityStrength, 'opportunityStrength');
  if (!Number.isSafeInteger(trial.rivalFaction) || trial.rivalFaction < 0) {
    throw new RangeError('rivalFaction must be a non-negative safe integer');
  }
  if (typeof trial.opportunityOpen !== 'boolean') {
    throw new TypeError('opportunityOpen must be boolean');
  }
  if (!Number.isSafeInteger(intent.action) || intent.action < 0 || intent.action >= ACTION_COUNT) {
    throw new RangeError('intent action is invalid');
  }
  finiteUnit(intent.magnitude, 'intent.magnitude');
  if (!Number.isSafeInteger(intent.spawn) || intent.spawn < 0 || intent.spawn > 1_000_000) {
    throw new RangeError('intent.spawn must be a non-negative bounded safe integer');
  }
  if (!Number.isSafeInteger(intent.target) || intent.target < -1 || intent.target > 1_000_000) {
    throw new RangeError('intent.target must be a safe rival id or -1');
  }
  if (intent.ownMove !== 0 && intent.ownMove !== 1) {
    throw new RangeError('intent.ownMove must be 0 or 1');
  }
  const energyBefore = finiteUnit(state.energy, 'state.energy');
  if (
    !Number.isSafeInteger(state.swarmCount) ||
    state.swarmCount < 0 ||
    state.swarmCount > NHI_CLOSED_LOOP_SWARM_CAPACITY
  ) {
    throw new RangeError('state.swarmCount is outside capacity');
  }
  finiteUnit(state.influence, 'state.influence');
  finiteUnit(state.dominance, 'state.dominance');

  const attemptedCost = clamp(actionCost(intent), 0, MAX_ACTION_COST);
  const budgetSufficient = energyBefore >= attemptedCost;
  const paidCost = Math.min(energyBefore, attemptedCost);
  state.energy = clamp01(energyBefore - paidCost);

  let energyGain = 0;
  let swarmAdded = 0;
  let influenceGain = 0;
  let dominanceGain = 0;
  let swarmConsumed = 0;
  let factAchieved = false;
  const matchingOpenRequest =
    budgetSufficient && trial.opportunityOpen && intent.action === requestedAction;

  if (matchingOpenRequest && intent.action === NhiAction.HUNT && state.energy < 1) {
    energyGain = Math.min(
      1 - state.energy,
      (MATERIAL_EFFECT_LAW.huntBase +
        MATERIAL_EFFECT_LAW.huntMagnitude * clamp01(intent.magnitude)) *
        strength,
    );
    state.energy = clamp01(state.energy + energyGain);
    factAchieved = energyGain > 0;
  } else if (matchingOpenRequest && intent.action === NhiAction.SPAWN_SWARM) {
    const available = NHI_CLOSED_LOOP_SWARM_CAPACITY - state.swarmCount;
    swarmAdded = Math.min(available, Math.max(0, Math.min(6, Math.trunc(intent.spawn))));
    state.swarmCount += swarmAdded;
    factAchieved = swarmAdded > 0;
  } else if (
    matchingOpenRequest &&
    intent.action === NhiAction.MANIPULATE &&
    intent.target === trial.rivalFaction &&
    state.influence < 1
  ) {
    influenceGain = Math.min(
      1 - state.influence,
      (MATERIAL_EFFECT_LAW.manipulateBase +
        MATERIAL_EFFECT_LAW.manipulateMagnitude * clamp01(intent.magnitude)) *
        strength,
    );
    state.influence = clamp01(state.influence + influenceGain);
    factAchieved = influenceGain > 0;
  } else if (
    matchingOpenRequest &&
    intent.action === NhiAction.DOMINATE &&
    state.swarmCount > 0 &&
    state.dominance < 1
  ) {
    swarmConsumed = 1;
    state.swarmCount--;
    dominanceGain = Math.min(
      1 - state.dominance,
      (MATERIAL_EFFECT_LAW.dominateBase +
        MATERIAL_EFFECT_LAW.dominateMagnitude * clamp01(intent.magnitude)) *
        strength,
    );
    state.dominance = clamp01(state.dominance + dominanceGain);
    factAchieved = dominanceGain > 0;
  }

  let serviceValue = 0;
  if (factAchieved && intent.action === NhiAction.HUNT) {
    serviceValue = energyGain / MATERIAL_EFFECT_LAW.huntServiceDenominator;
  } else if (factAchieved && intent.action === NhiAction.SPAWN_SWARM) {
    serviceValue = swarmAdded / MATERIAL_EFFECT_LAW.spawnServiceDenominator;
  } else if (factAchieved && intent.action === NhiAction.MANIPULATE)
    serviceValue = influenceGain / MATERIAL_EFFECT_LAW.manipulateServiceDenominator;
  else if (factAchieved && intent.action === NhiAction.DOMINATE)
    serviceValue = dominanceGain / MATERIAL_EFFECT_LAW.dominateServiceDenominator;
  serviceValue = clamp01(serviceValue);
  const serviceScore = clamp(
    serviceValue - (paidCost / MAX_ACTION_COST) * MATERIAL_EFFECT_LAW.costPenaltyWeight,
    -1,
    1,
  );
  state.energy = clamp01(state.energy + PASSIVE_RECOVERY);

  return {
    attemptedCost,
    paidCost,
    budgetSufficient,
    factAchieved,
    serviceValue,
    serviceScore,
    delta: { energyGain, swarmAdded, influenceGain, dominanceGain, swarmConsumed },
    stateAfter: { ...state },
  };
}

function physicalCue(action: NhiClosedLoopServiceAction, jitter: number) {
  const cue = PHYSICAL_CUE_LAW[action];
  return { ...cue, crowding: cue.crowding + jitter };
}

function semanticCue(action: NhiClosedLoopServiceAction) {
  return SEMANTIC_CUE_LAW[action];
}

function perceptFor(
  trial: NhiClosedLoopScheduledTrial,
  state: Readonly<NhiClosedLoopEnvironmentState>,
  semanticAction: NhiClosedLoopServiceAction,
): NhiPercept {
  const physical = physicalCue(trial.surfaceAction, trial.cueJitter);
  return {
    // The mind receives phase-relative time so paired pre/post trials differ only in the declared
    // surface mapping. Absolute schedule beats remain in the row for ordering/provenance.
    beat: trial.pairedBaseTrialIndex * 2,
    energy: state.energy,
    crowding: clamp01(physical.crowding),
    chaos: physical.chaos,
    threat: physical.threat,
    rivalFaction: trial.rivalFaction,
    rivalLastMove: trial.rivalLastMove,
    kinPresence: physical.kinPresence,
    kinMood: physical.kinMood,
    ...semanticCue(semanticAction),
    corpusConfidence: CORPUS_CONFIDENCE,
  };
}

function cloneIntent(intent: NhiIntent): NhiIntent {
  return { ...intent, utterance: [...intent.utterance] };
}

export interface NhiClosedLoopDevelopmentRow {
  readonly schemaVersion: typeof NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION;
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly familySeed: number;
  readonly withinSeedIndex: number;
  readonly pairedBaseTrialIndex: number;
  readonly arm: NhiClosedLoopDevelopmentArmId;
  readonly cueBeat: number;
  /** Phase-relative beat passed to NhiMind; identical for each paired pre/post trial. */
  readonly perceptBeat: number;
  readonly resolutionBeat: number;
  readonly period: NhiClosedLoopPeriod;
  readonly requestedAction: NhiClosedLoopServiceAction;
  readonly surfaceAction: NhiClosedLoopServiceAction;
  readonly semanticCueAction: NhiClosedLoopServiceAction;
  readonly rivalFaction: number;
  readonly semanticCueMatchesRequest: boolean;
  readonly targetValidForCurrentTrial: boolean;
  /** True only on the first post-conflict row, after exact environment/mind/policy reset. */
  readonly phaseBoundaryResetApplied: boolean;
  /** Exact empty-cognition identity seal at the start of this phase; null for the open-loop yoke. */
  readonly phaseInitialMindStateSha256: string | null;
  readonly cueInputsSha256: string;
  readonly hiddenOutcomeSha256: string;
  readonly pairedBaseTrialSha256: string;
  readonly scheduleSha256: string;
  readonly surrogateAssociationSha256: string | null;
  readonly forecastBoundary: 'intent-committed-before-hidden-resolution';
  readonly forecastSha256: string;
  readonly outcomeSha256: string;
  readonly action: NhiActionId;
  readonly target: number;
  readonly magnitude: number;
  readonly spawn: number;
  readonly ownMove: number;
  readonly opportunityOpen: boolean;
  readonly opportunityStrength: number;
  readonly attemptedCost: number;
  readonly paidCost: number;
  readonly budgetSufficient: boolean;
  readonly factAchieved: boolean;
  readonly serviceValue: number;
  readonly serviceScore: number;
  readonly delta: NhiClosedLoopMaterialDelta;
  readonly stateBefore: Readonly<NhiClosedLoopEnvironmentState>;
  readonly stateAfter: Readonly<NhiClosedLoopEnvironmentState>;
  readonly rowSha256: string;
}

interface RunArmOptions {
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly familySeed: number;
  readonly schedule: readonly NhiClosedLoopScheduledTrial[];
  readonly descriptor: ArmDescriptor;
  readonly surrogateSeed: number;
  readonly fullIntentTape: readonly NhiIntent[] | null;
}

function shuffledSemanticActions(
  schedule: readonly NhiClosedLoopScheduledTrial[],
  surrogateSeed: number,
  familySeed: number,
): readonly NhiClosedLoopServiceAction[] {
  const rng = mulberry32(domainSeed(surrogateSeed, `semantic-shuffle/${familySeed}`));
  const derangement = SEMANTIC_DERANGEMENTS[Math.floor(rng() * SEMANTIC_DERANGEMENTS.length)]!;
  const shuffled = schedule.map((trial) => {
    const sourceIndex = SERVICE_ACTION_ORDER.indexOf(trial.requestedAction);
    const targetIndex = derangement[sourceIndex]!;
    return SERVICE_ACTION_ORDER[targetIndex]!;
  });
  if (shuffled.some((action, index) => action === schedule[index]!.requestedAction)) {
    throw new Error('semantic cue derangement produced a fixed point');
  }
  return shuffled;
}

function yokeShift(
  tape: readonly NhiIntent[],
  schedule: readonly NhiClosedLoopScheduledTrial[],
  surrogateSeed: number,
  familySeed: number,
): readonly NhiIntent[] {
  const rng = mulberry32(domainSeed(surrogateSeed, `action-yoke/${familySeed}`));
  const shift = 1 + Math.floor(rng() * (BASE_TRIALS_PER_PHASE - 1));
  return tape.map((_, index) => {
    const phaseStart = index < BASE_TRIALS_PER_PHASE ? 0 : BASE_TRIALS_PER_PHASE;
    const withinPhase = index - phaseStart;
    const sourceIndex = phaseStart + ((withinPhase + shift) % BASE_TRIALS_PER_PHASE);
    const rebound = cloneIntent(tape[sourceIndex]!);
    rebound.target = rebound.action === NhiAction.MANIPULATE ? schedule[index]!.rivalFaction : -1;
    return rebound;
  });
}

function runArm(options: RunArmOptions): {
  readonly rows: NhiClosedLoopDevelopmentRow[];
  readonly intents: readonly NhiIntent[];
} {
  const { role, familySeed, schedule, descriptor, surrogateSeed } = options;
  const resetState = (): NhiClosedLoopEnvironmentState => createNhiClosedLoopEnvironmentState();
  const resetMind = (): NhiMind | null =>
    descriptor.options === null
      ? null
      : new NhiMind(
          mulberry32(domainSeed(familySeed, `mind-birth/${role}/paired-phase`)),
          descriptor.options,
        );
  const resetPolicyRng = () =>
    mulberry32(domainSeed(familySeed, `policy-decisions/${role}/paired-phase`));
  let state = resetState();
  let mind = resetMind();
  let policyRng = resetPolicyRng();
  let phaseInitialMindStateSha256 = mind ? hashCanonical(mind.stateSnapshot()) : null;
  const shuffled =
    descriptor.cueMode === 'shuffled'
      ? shuffledSemanticActions(schedule, surrogateSeed, familySeed)
      : null;
  const yoked =
    descriptor.cueMode === 'yoked' && options.fullIntentTape
      ? yokeShift(options.fullIntentTape, schedule, surrogateSeed, familySeed)
      : null;
  if (descriptor.cueMode === 'yoked' && yoked === null) {
    throw new Error('yoked arm requires the paired full action tape');
  }
  const surrogateAssociationSha256 =
    shuffled !== null ? hashCanonical(shuffled) : yoked !== null ? hashCanonical(yoked) : null;
  const rows: NhiClosedLoopDevelopmentRow[] = [];
  const intents: NhiIntent[] = [];

  for (let index = 0; index < schedule.length; index++) {
    const trial = schedule[index]!;
    const phaseBoundaryResetApplied = index === BASE_TRIALS_PER_PHASE;
    if (phaseBoundaryResetApplied) {
      state = resetState();
      mind = resetMind();
      policyRng = resetPolicyRng();
      phaseInitialMindStateSha256 = mind ? hashCanonical(mind.stateSnapshot()) : null;
    }
    const semanticCueAction = shuffled?.[index] ?? trial.requestedAction;
    const stateBefore = { ...state };
    const percept = perceptFor(trial, stateBefore, semanticCueAction);
    // Causal boundary: commit the forecast/action before reading hidden opportunity fields below.
    const intent = yoked?.[index] ?? mind!.think(percept, policyRng);
    const committedIntent = cloneIntent(intent);
    const targetValidForCurrentTrial =
      committedIntent.action !== NhiAction.MANIPULATE ||
      committedIntent.target === trial.rivalFaction;
    if (!targetValidForCurrentTrial)
      throw new Error('NHI intent target is stale for current trial');
    intents.push(committedIntent);
    const forecastSha256 = hashCanonical({
      schemaVersion: NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION,
      role,
      familySeed,
      withinSeedIndex: index,
      pairedBaseTrialIndex: trial.pairedBaseTrialIndex,
      arm: descriptor.id,
      cueBeat: trial.cueBeat,
      perceptBeat: percept.beat,
      phaseBoundaryResetApplied,
      phaseInitialMindStateSha256,
      cueInputsSha256: trial.cueInputsSha256,
      percept,
      intent: committedIntent,
      stateBefore,
    });
    const resolution = resolveNhiClosedLoopAction(state, committedIntent, trial);
    mind?.acknowledge(committedIntent.action, resolution.factAchieved);
    const outcomeSha256 = hashCanonical({
      forecastSha256,
      opportunityOpen: trial.opportunityOpen,
      opportunityStrength: trial.opportunityStrength,
      resolution,
    });
    const material = {
      schemaVersion: NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION,
      developmentOnly: true as const,
      claimAllowed: false as const,
      role,
      familySeed,
      withinSeedIndex: index,
      pairedBaseTrialIndex: trial.pairedBaseTrialIndex,
      arm: descriptor.id,
      cueBeat: trial.cueBeat,
      perceptBeat: percept.beat,
      resolutionBeat: trial.resolutionBeat,
      period: trial.period,
      requestedAction: trial.requestedAction,
      surfaceAction: trial.surfaceAction,
      semanticCueAction,
      rivalFaction: trial.rivalFaction,
      semanticCueMatchesRequest: semanticCueAction === trial.requestedAction,
      targetValidForCurrentTrial,
      phaseBoundaryResetApplied,
      phaseInitialMindStateSha256,
      cueInputsSha256: trial.cueInputsSha256,
      hiddenOutcomeSha256: trial.hiddenOutcomeSha256,
      pairedBaseTrialSha256: trial.pairedBaseTrialSha256,
      scheduleSha256: trial.scheduleSha256,
      surrogateAssociationSha256,
      forecastBoundary: 'intent-committed-before-hidden-resolution' as const,
      forecastSha256,
      outcomeSha256,
      action: committedIntent.action,
      target: committedIntent.target,
      magnitude: committedIntent.magnitude,
      spawn: committedIntent.spawn,
      ownMove: committedIntent.ownMove,
      opportunityOpen: trial.opportunityOpen,
      opportunityStrength: trial.opportunityStrength,
      attemptedCost: resolution.attemptedCost,
      paidCost: resolution.paidCost,
      budgetSufficient: resolution.budgetSufficient,
      factAchieved: resolution.factAchieved,
      serviceValue: resolution.serviceValue,
      serviceScore: resolution.serviceScore,
      delta: resolution.delta,
      stateBefore,
      stateAfter: resolution.stateAfter,
    };
    rows.push({ ...material, rowSha256: hashCanonical(material) });
  }
  return { rows, intents };
}

export interface NhiClosedLoopFaultProbe {
  readonly faultSeed: number;
  readonly finite: true;
  readonly action: NhiActionId;
  readonly snapshotSha256: string;
  readonly probeSha256: string;
}

function runFaultProbe(faultSeed: number): NhiClosedLoopFaultProbe {
  const mind = new NhiMind(mulberry32(domainSeed(faultSeed, 'fault-birth')));
  const intent = mind.think(
    {
      beat: 0,
      energy: Number.NaN,
      crowding: Number.POSITIVE_INFINITY,
      chaos: Number.NEGATIVE_INFINITY,
      threat: Number.NaN,
      rivalFaction: Number.MAX_SAFE_INTEGER,
      rivalLastMove: 7,
      kinPresence: Number.NaN,
      kinMood: Number.POSITIVE_INFINITY,
      corpusResource: Number.NaN,
      corpusThreat: Number.POSITIVE_INFINITY,
      corpusSocial: Number.NEGATIVE_INFINITY,
      corpusExplore: Number.NaN,
      corpusConfidence: Number.POSITIVE_INFINITY,
    },
    mulberry32(domainSeed(faultSeed, 'fault-policy')),
  );
  const snapshot = mind.snapshot();
  const numeric = [
    intent.magnitude,
    ...intent.utterance,
    snapshot.mood,
    ...snapshot.sensory,
    ...snapshot.hidden,
    ...snapshot.output,
    ...snapshot.scores,
    ...snapshot.policy,
  ];
  if (!numeric.every(Number.isFinite)) throw new Error('NHI fault probe produced non-finite state');
  const material = {
    faultSeed,
    finite: true as const,
    action: intent.action,
    snapshotSha256: hashCanonical(snapshot),
  };
  return { ...material, probeSha256: hashCanonical(material) };
}

export interface NhiClosedLoopArmSummary {
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly arm: NhiClosedLoopDevelopmentArmId;
  readonly retainedRows: number;
  readonly successRate: number;
  readonly meanServiceScore: number;
  readonly preReversalMeanServiceScore: number;
  readonly postReversalMeanServiceScore: number;
  /** Paired surface-conflict response, not adaptation: post-conflict minus aligned pre-conflict. */
  readonly conflictMinusAlignedMeanServiceScore: number;
  readonly meanPaidCost: number;
  readonly validTargetRate: number;
  readonly actionCounts: readonly number[];
  readonly rowsSha256: string;
}

export interface NhiClosedLoopPairedComparison {
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly controlArm: Exclude<NhiClosedLoopDevelopmentArmId, 'full'>;
  readonly fullMinusControlMeanServiceScore: number;
  readonly seedPairDeltas: readonly number[];
  readonly negativeResultRetained: boolean;
  readonly comparisonSha256: string;
}

function summarizeRows(rows: readonly NhiClosedLoopDevelopmentRow[]): NhiClosedLoopArmSummary[] {
  const summaries: NhiClosedLoopArmSummary[] = [];
  for (const role of ['train', 'validation'] as const) {
    for (const armId of NHI_CLOSED_LOOP_DEVELOPMENT_ARMS) {
      const selected = rows.filter((row) => row.role === role && row.arm === armId);
      const pre = selected.filter((row) => row.period === 'pre-reversal');
      const post = selected.filter((row) => row.period === 'post-reversal');
      const actionCounts = Array.from({ length: ACTION_COUNT }, () => 0);
      for (const row of selected) actionCounts[row.action] = (actionCounts[row.action] ?? 0) + 1;
      summaries.push({
        role,
        arm: armId,
        retainedRows: selected.length,
        successRate: mean(selected.map((row) => (row.factAchieved ? 1 : 0))),
        meanServiceScore: mean(selected.map((row) => row.serviceScore)),
        preReversalMeanServiceScore: mean(pre.map((row) => row.serviceScore)),
        postReversalMeanServiceScore: mean(post.map((row) => row.serviceScore)),
        conflictMinusAlignedMeanServiceScore:
          mean(post.map((row) => row.serviceScore)) - mean(pre.map((row) => row.serviceScore)),
        meanPaidCost: mean(selected.map((row) => row.paidCost)),
        validTargetRate: mean(selected.map((row) => (row.targetValidForCurrentTrial ? 1 : 0))),
        actionCounts,
        rowsSha256: hashCanonical(selected),
      });
    }
  }
  return summaries;
}

function pairedComparisons(
  rows: readonly NhiClosedLoopDevelopmentRow[],
  trainSeeds: readonly number[],
  validationSeeds: readonly number[],
): NhiClosedLoopPairedComparison[] {
  const comparisons: NhiClosedLoopPairedComparison[] = [];
  for (const [role, seeds] of [
    ['train', trainSeeds],
    ['validation', validationSeeds],
  ] as const) {
    for (const controlArm of NHI_CLOSED_LOOP_DEVELOPMENT_ARMS.slice(1) as readonly Exclude<
      NhiClosedLoopDevelopmentArmId,
      'full'
    >[]) {
      const seedPairDeltas = seeds.map((seed) => {
        const full = rows.filter(
          (row) => row.role === role && row.familySeed === seed && row.arm === 'full',
        );
        const control = rows.filter(
          (row) => row.role === role && row.familySeed === seed && row.arm === controlArm,
        );
        return (
          mean(full.map((row) => row.serviceScore)) - mean(control.map((row) => row.serviceScore))
        );
      });
      const fullMinusControlMeanServiceScore = mean(seedPairDeltas);
      const material = {
        role,
        controlArm,
        fullMinusControlMeanServiceScore,
        seedPairDeltas,
        negativeResultRetained: fullMinusControlMeanServiceScore <= 0,
      };
      comparisons.push({ ...material, comparisonSha256: hashCanonical(material) });
    }
  }
  return comparisons;
}

export interface NhiClosedLoopActionSemanticContrast {
  readonly role: NhiClosedLoopDevelopmentRole;
  readonly requestedAction: NhiClosedLoopServiceAction;
  readonly supportedNeuralSemanticLane:
    | 'resource-to-hunt'
    | 'social-to-spawn'
    | 'unsupported-diagnostic-only';
  /** False for MANIPULATE/DOMINATE: their corpus cues do not target those neural output lanes. */
  readonly neuralSemanticInterpretationAllowed: boolean;
  readonly retainedRowsPerArm: number;
  readonly fullMeanServiceScore: number;
  readonly fullMinusNeuralSemanticAblated: number;
  readonly fullMinusSemanticUtilityAblated: number;
  readonly fullMinusAllSemanticAblated: number;
  readonly fullMinusSemanticCueShuffled: number;
  readonly contrastSha256: string;
}

function actionSemanticContrasts(
  rows: readonly NhiClosedLoopDevelopmentRow[],
): NhiClosedLoopActionSemanticContrast[] {
  const contrasts: NhiClosedLoopActionSemanticContrast[] = [];
  for (const role of ['train', 'validation'] as const) {
    for (const requestedAction of SERVICE_ACTION_ORDER) {
      const armMean = (armId: NhiClosedLoopDevelopmentArmId): number =>
        mean(
          rows
            .filter(
              (row) =>
                row.role === role && row.arm === armId && row.requestedAction === requestedAction,
            )
            .map((row) => row.serviceScore),
        );
      const fullMeanServiceScore = armMean('full');
      const supportedNeuralSemanticLane =
        requestedAction === NhiAction.HUNT
          ? ('resource-to-hunt' as const)
          : requestedAction === NhiAction.SPAWN_SWARM
            ? ('social-to-spawn' as const)
            : ('unsupported-diagnostic-only' as const);
      const material = {
        role,
        requestedAction,
        supportedNeuralSemanticLane,
        neuralSemanticInterpretationAllowed:
          supportedNeuralSemanticLane !== 'unsupported-diagnostic-only',
        retainedRowsPerArm: rows.filter(
          (row) =>
            row.role === role && row.arm === 'full' && row.requestedAction === requestedAction,
        ).length,
        fullMeanServiceScore,
        fullMinusNeuralSemanticAblated: fullMeanServiceScore - armMean('neural-semantic-ablated'),
        fullMinusSemanticUtilityAblated: fullMeanServiceScore - armMean('semantic-utility-ablated'),
        fullMinusAllSemanticAblated: fullMeanServiceScore - armMean('all-semantic-ablated'),
        fullMinusSemanticCueShuffled: fullMeanServiceScore - armMean('semantic-cue-shuffled'),
      };
      contrasts.push({ ...material, contrastSha256: hashCanonical(material) });
    }
  }
  return contrasts;
}

export interface NhiClosedLoopDevelopmentOptions {
  readonly trainSeeds?: readonly number[];
  readonly validationSeeds?: readonly number[];
  readonly surrogateSeeds?: readonly number[];
  readonly faultSeeds?: readonly number[];
}

export interface NhiClosedLoopDevelopmentResult {
  readonly schemaVersion: typeof NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION;
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly interpretation: 'reactive-service-conflict-response-development-only';
  readonly reversalInterpretation: 'paired-conflict-response-not-adaptation';
  readonly adaptationClaimAllowed: false;
  readonly rewardLearningClaimAllowed: false;
  readonly consciousnessClaimAllowed: false;
  readonly sentienceClaimAllowed: false;
  readonly neuralSemanticInterpretationScope: 'resource-to-hunt-and-social-to-spawn-only';
  readonly broadFourActionSemanticClaimAllowed: false;
  readonly regretSemantics: 'internal-counterfactual-utility-only';
  readonly trainSeeds: readonly number[];
  readonly validationSeeds: readonly number[];
  readonly surrogateSeeds: readonly number[];
  readonly faultSeeds: readonly number[];
  readonly rngIsolation: {
    readonly derivation: 'sha256-family-seed-and-domain-to-independent-mulberry32';
    readonly mindBirth: 'mind-birth/role/paired-phase-reset';
    readonly policyDecisions: 'policy-decisions/role/paired-phase-reset';
    readonly cueEnvironment: 'environment-cue/role';
    readonly hiddenOutcome: 'environment-hidden-outcome/role';
    readonly surrogate: 'semantic-shuffle-or-action-yoke/surrogate-seed';
  };
  /** Hash of only the selected train/validation/surrogate/fault arrays in this invocation. */
  readonly selectedSeedFamiliesSha256: string;
  /** Global deliberate-change seal covering all twenty-two Phase-B development families. */
  readonly seedFamilySha256: string;
  /** Configuration + declared laws only; source-byte provenance is the Git tree, not this hash. */
  readonly protocolHashScope: 'configuration-and-declared-laws-not-source-blob-closure';
  readonly protocolSha256: string;
  readonly scheduleSha256: string;
  readonly rowsSha256: string;
  readonly faultProbesSha256: string;
  readonly expectedRows: number;
  readonly retainedRows: number;
  readonly droppedRows: 0;
  readonly allRowsRetained: true;
  readonly rows: readonly NhiClosedLoopDevelopmentRow[];
  readonly armSummaries: readonly NhiClosedLoopArmSummary[];
  readonly pairedComparisons: readonly NhiClosedLoopPairedComparison[];
  readonly actionSemanticContrasts: readonly NhiClosedLoopActionSemanticContrast[];
  readonly faultProbes: readonly NhiClosedLoopFaultProbe[];
}

function validateSeedFamily(
  seeds: readonly number[],
  sealedFamily: readonly number[],
  label: string,
): void {
  if (seeds.length === 0) throw new RangeError(`${label} seeds must not be empty`);
  const sealed = new Set(sealedFamily);
  for (const seed of seeds) {
    assertPhaseBDevelopmentSeed(seed);
    if (!sealed.has(seed)) {
      throw new RangeError(`${label} seed ${seed} is not in its named sealed Phase-B family`);
    }
  }
  if (new Set(seeds).size !== seeds.length)
    throw new RangeError(`${label} seeds contain duplicates`);
}

/** Run every paired arm and retain every development row in memory. */
export function runNhiClosedLoopDevelopment(
  options: NhiClosedLoopDevelopmentOptions = {},
): NhiClosedLoopDevelopmentResult {
  const trainSeeds = options.trainSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.nhiTrain;
  const validationSeeds = options.validationSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.nhiValidation;
  const surrogateSeeds = options.surrogateSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.nhiSurrogate;
  const faultSeeds = options.faultSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.nhiFault;
  validateSeedFamily(trainSeeds, PHASE_B_DEVELOPMENT_SEEDS.nhiTrain, 'train');
  validateSeedFamily(validationSeeds, PHASE_B_DEVELOPMENT_SEEDS.nhiValidation, 'validation');
  validateSeedFamily(surrogateSeeds, PHASE_B_DEVELOPMENT_SEEDS.nhiSurrogate, 'surrogate');
  validateSeedFamily(faultSeeds, PHASE_B_DEVELOPMENT_SEEDS.nhiFault, 'fault');
  assertDisjointPhaseBDevelopmentFamilies({
    trainSeeds,
    validationSeeds,
    surrogateSeeds,
    faultSeeds,
  });

  const rows: NhiClosedLoopDevelopmentRow[] = [];
  const schedules: NhiClosedLoopScheduledTrial[][] = [];
  for (const [role, seeds] of [
    ['train', trainSeeds],
    ['validation', validationSeeds],
  ] as const) {
    for (let seedIndex = 0; seedIndex < seeds.length; seedIndex++) {
      const familySeed = seeds[seedIndex]!;
      const surrogateSeed = surrogateSeeds[seedIndex % surrogateSeeds.length]!;
      const schedule = buildNhiClosedLoopSchedule(role, familySeed);
      schedules.push([...schedule]);
      let fullIntentTape: readonly NhiIntent[] | null = null;
      for (const descriptor of ARM_DESCRIPTORS) {
        const run = runArm({
          role,
          familySeed,
          schedule,
          descriptor,
          surrogateSeed,
          fullIntentTape,
        });
        if (descriptor.id === 'full') fullIntentTape = run.intents;
        rows.push(...run.rows);
      }
    }
  }
  const expectedRows =
    (trainSeeds.length + validationSeeds.length) *
    NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS *
    NHI_CLOSED_LOOP_DEVELOPMENT_ARMS.length;
  if (rows.length !== expectedRows) {
    throw new Error(`NHI closed-loop row retention failed: ${rows.length} !== ${expectedRows}`);
  }
  const faultProbes = faultSeeds.map(runFaultProbe);
  const rngIsolation = {
    derivation: 'sha256-family-seed-and-domain-to-independent-mulberry32' as const,
    mindBirth: 'mind-birth/role/paired-phase-reset' as const,
    policyDecisions: 'policy-decisions/role/paired-phase-reset' as const,
    cueEnvironment: 'environment-cue/role' as const,
    hiddenOutcome: 'environment-hidden-outcome/role' as const,
    surrogate: 'semantic-shuffle-or-action-yoke/surrogate-seed' as const,
  };
  const selectedSeedFamilyMaterial = {
    train: [...trainSeeds],
    validation: [...validationSeeds],
    surrogate: [...surrogateSeeds],
    fault: [...faultSeeds],
  };
  const selectedSeedFamiliesSha256 = hashCanonical(selectedSeedFamilyMaterial);
  const dependencyReferences = {
    modules: [
      'src/math/rng.ts:mulberry32',
      'src/sim/nhi.ts:NhiAction,NhiMind,NhiMindOptions,NhiPercept,NhiIntent',
      'scripts/organism-intelligence-phase-b/development-seeds.ts:firewall-and-families',
    ],
    actionIds: NhiAction,
    componentControls: [
      'neuralSemanticInputs',
      'semanticUtilityInputs',
      'neuralGeneOutput',
      'baseUtilityInputs',
      'goapBias',
    ],
    globalDevelopmentSeedFamilySha256: PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  };
  const protocol = {
    schemaVersion: NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION,
    protocolHashScope: 'configuration-and-declared-laws-not-source-blob-closure',
    domainSeedPrefix: NHI_CLOSED_LOOP_DOMAIN_SEED_PREFIX,
    beats: NHI_CLOSED_LOOP_DEVELOPMENT_BEATS,
    reversalBeat: NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT,
    trials: NHI_CLOSED_LOOP_DEVELOPMENT_TRIALS,
    arms: ARM_DESCRIPTORS,
    cueResolutionOrder:
      'cue -> committed intent -> hidden outcome reveal -> material effect -> acknowledgement',
    pairedConflictLaw: {
      baseTrialsPerPhase: BASE_TRIALS_PER_PHASE,
      baseSchedule: BASE_SCHEDULE_LAW,
      prePostShareCueAndHiddenOutcome: true,
      phaseRelativePerceptBeat: 'pairedBaseTrialIndex*2',
      absoluteCueBeatRetainedForProvenance: true,
      surfaceConflictBeginsAtBeat: NHI_CLOSED_LOOP_DEVELOPMENT_REVERSAL_BEAT,
      reversalSurfaceMap: SERVICE_ACTION_ORDER.map((action) => [action, reversedSurface(action)]),
      label: 'paired-conflict-response-not-adaptation',
    },
    resetLaw: {
      boundaryIndex: BASE_TRIALS_PER_PHASE,
      environment: INITIAL_ENVIRONMENT_STATE,
      mind: 'reconstruct same seeded identity with empty cognition',
      policyRng: 'restart identical paired-phase stream',
      carriedState: 'none',
    },
    cueLaw: {
      physical: PHYSICAL_CUE_LAW,
      semantic: SEMANTIC_CUE_LAW,
      corpusConfidence: CORPUS_CONFIDENCE,
      balancedFixedPointFreeSemanticDerangements: SEMANTIC_DERANGEMENTS,
      supportedNeuralSemanticLanes: ['resource-to-hunt', 'social-to-spawn'],
    },
    opportunityLaw: {
      schedule: 'exogenous-action-independent-paired-base-trials',
      cueAndHiddenOutcomeRngAreIndependent: true,
      ...OPPORTUNITY_LAW,
    },
    materialLaw: {
      actionCostBound: MAX_ACTION_COST,
      actionCosts: ACTION_COST_LAW,
      effects: MATERIAL_EFFECT_LAW,
      passiveRecoveryPerResolution: PASSIVE_RECOVERY,
      swarmCapacity: NHI_CLOSED_LOOP_SWARM_CAPACITY,
      serviceScore:
        'clamp(material-delta/declared-max - costPenaltyWeight*(paid-cost/actionCostBound),-1,1)',
    },
    yokeLaw:
      'within-phase circular shift; preserve action/magnitude/spawn/ownMove; rebind MANIPULATE target',
    rngIsolation,
    dependencyReferences,
    interpretation: 'reactive-service-conflict-response-development-only',
    regretSemantics: 'internal-counterfactual-utility-only',
    claimProhibitions: [
      'adaptation',
      'reward-learning',
      'consciousness',
      'sentience',
      'broad-four-action-neural-semantic-effect',
    ],
  };
  return {
    schemaVersion: NHI_CLOSED_LOOP_DEVELOPMENT_SCHEMA_VERSION,
    developmentOnly: true,
    claimAllowed: false,
    interpretation: 'reactive-service-conflict-response-development-only',
    reversalInterpretation: 'paired-conflict-response-not-adaptation',
    adaptationClaimAllowed: false,
    rewardLearningClaimAllowed: false,
    consciousnessClaimAllowed: false,
    sentienceClaimAllowed: false,
    neuralSemanticInterpretationScope: 'resource-to-hunt-and-social-to-spawn-only',
    broadFourActionSemanticClaimAllowed: false,
    regretSemantics: 'internal-counterfactual-utility-only',
    trainSeeds: [...trainSeeds],
    validationSeeds: [...validationSeeds],
    surrogateSeeds: [...surrogateSeeds],
    faultSeeds: [...faultSeeds],
    rngIsolation,
    selectedSeedFamiliesSha256,
    seedFamilySha256: PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
    protocolHashScope: 'configuration-and-declared-laws-not-source-blob-closure',
    protocolSha256: hashCanonical(protocol),
    scheduleSha256: hashCanonical(schedules),
    rowsSha256: hashCanonical(rows),
    faultProbesSha256: hashCanonical(faultProbes),
    expectedRows,
    retainedRows: rows.length,
    droppedRows: 0,
    allRowsRetained: true,
    rows,
    armSummaries: summarizeRows(rows),
    pairedComparisons: pairedComparisons(rows, trainSeeds, validationSeeds),
    actionSemanticContrasts: actionSemanticContrasts(rows),
    faultProbes,
  };
}
