/**
 * Deterministic DEVELOPMENT-ONLY ecology-predictor task matrix.
 *
 * This module is a mechanism-development surface, not a receipt or publication generator. Every
 * forecast is emitted before its soft outcome is revealed. The immutable scoring outcome is kept
 * separate from an optional gradient-only target so the causal reservoir-lag control cannot
 * contaminate revealed temporal context. Nothing here writes to disk or authorizes a claim.
 */

import {
  TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
  TsotchkeEcologyPredictorV2,
  type TsotchkeEcologyPredictorV2Input,
  type TsotchkeEcologyPredictorV2Options,
  type TsotchkeEcologyPredictorV2Tier,
} from '../../src/sim/tsotchke-ecology-predictor-v2';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  PHASE_B_DEVELOPMENT_SEEDS,
} from './development-seeds';

export const ECOLOGY_DEVELOPMENT_CADENCES = 512;
export const ECOLOGY_DEVELOPMENT_SCHEMA_VERSION = 2;

export const ECOLOGY_DEVELOPMENT_TASKS = Object.freeze([
  'stationary-soft-pressure',
  'abrupt-seed-drift',
  'gradual-drift',
  'recurring-a-b-a',
  'covariate-shift',
  'missing-feedback-irregular-elapsed-time',
] as const);

export type EcologyDevelopmentTaskId = (typeof ECOLOGY_DEVELOPMENT_TASKS)[number];

export const ECOLOGY_DEVELOPMENT_ARMS = Object.freeze([
  'v2-h4-adaptive',
  'v2-h8-adaptive',
  'v2-h16-adaptive',
  'v2-h8-frozen-weights',
  'v2-h8-temporal-inputs-ablated',
  'v2-h8-drift-gain-disabled',
  'v2-h8-causal-reservoir-lag-gradient-target',
  'logistic-current5-adaptive',
  'logistic-temporal9-adaptive',
  'persistence',
  'ewma-008',
] as const);

export type EcologyDevelopmentArmId = (typeof ECOLOGY_DEVELOPMENT_ARMS)[number];

export const ECOLOGY_DEVELOPMENT_SEED_ROLES = Object.freeze([
  'mechanism-development',
  'fixed-configuration-validation',
] as const);

export type EcologyDevelopmentSeedRole = (typeof ECOLOGY_DEVELOPMENT_SEED_ROLES)[number];

const UINT32_DIVISOR = 0x1_0000_0000;
const LOG_EPSILON = 1e-12;
const ECE_BIN_COUNT = 10;
const RECOVERY_BASELINE_CADENCES = 32;
const RECOVERY_WINDOW_CADENCES = 16;
const POST_CHANGE_CADENCES = 32;
const SHUFFLE_BUFFER_CAPACITY = 16;
const DEGRADATION_ABSOLUTE_MARGIN = 1e-4;
const DEGRADATION_RELATIVE_MARGIN = 0.1;

const DEFAULT_NEURAL_OPTIONS = Object.freeze({
  slowLearningRate: 0.004,
  fastLearningRate: 0.04,
  rmsDecay: 0.95,
  rmsEpsilon: 1e-8,
  gradientClip: 1,
  driftAlpha: 0.08,
});

interface TaskDescriptor {
  id: EcologyDevelopmentTaskId;
  version: 1;
  labelLaw: string;
  covariateLaw: string;
  feedbackLaw: string;
}

const TASK_DESCRIPTORS: Readonly<Record<EcologyDevelopmentTaskId, TaskDescriptor>> = Object.freeze({
  'stationary-soft-pressure': {
    id: 'stationary-soft-pressure',
    version: 1,
    labelLaw: 'seed-derived fixed logistic soft pressure',
    covariateLaw: 'bounded counter-derived seasonal covariates',
    feedbackLaw: 'every cadence',
  },
  'abrupt-seed-drift': {
    id: 'abrupt-seed-drift',
    version: 1,
    labelLaw: 'seed-derived logistic coefficients switch at a seed-derived cadence',
    covariateLaw: 'bounded counter-derived seasonal covariates',
    feedbackLaw: 'every cadence',
  },
  'gradual-drift': {
    id: 'gradual-drift',
    version: 1,
    labelLaw: 'seed-derived logistic coefficients interpolate over 144 cadences',
    covariateLaw: 'bounded counter-derived seasonal covariates',
    feedbackLaw: 'every cadence',
  },
  'recurring-a-b-a': {
    id: 'recurring-a-b-a',
    version: 1,
    labelLaw: 'seed-derived logistic regime A then B then A',
    covariateLaw: 'bounded counter-derived seasonal covariates',
    feedbackLaw: 'every cadence',
  },
  'covariate-shift': {
    id: 'covariate-shift',
    version: 1,
    labelLaw: 'seed-derived fixed logistic soft pressure',
    covariateLaw: 'bounded marginals shift once while the conditional law stays fixed',
    feedbackLaw: 'every cadence',
  },
  'missing-feedback-irregular-elapsed-time': {
    id: 'missing-feedback-irregular-elapsed-time',
    version: 1,
    labelLaw: 'seed-derived logistic regime switches after irregular elapsed cadences',
    covariateLaw:
      '512 indexed forecast cadences with deterministic jumps in the separate elapsed-time coordinate',
    feedbackLaw:
      'deterministic contiguous missing-feedback spans; outcomes remain evaluator-visible for scoring',
  },
});

type NeuralArmDescriptor = {
  id: EcologyDevelopmentArmId;
  kind: 'neural';
  tier: TsotchkeEcologyPredictorV2Tier;
  adaptive: boolean;
  temporalInputs: boolean;
  gradientTargetMode: 'revealed-outcome' | 'causal-reservoir-lag';
  slowLearningRate: number;
  fastLearningRate: number;
};

type LogisticArmDescriptor = {
  id: EcologyDevelopmentArmId;
  kind: 'logistic';
  inputCount: 5 | 9;
  slowLearningRate: number;
  fastLearningRate: number;
};

type BaselineArmDescriptor = {
  id: EcologyDevelopmentArmId;
  kind: 'persistence' | 'ewma';
  alpha: number | null;
};

type ArmDescriptor = NeuralArmDescriptor | LogisticArmDescriptor | BaselineArmDescriptor;

const ARM_DESCRIPTORS: readonly ArmDescriptor[] = Object.freeze([
  neuralDescriptor('v2-h4-adaptive', 4),
  neuralDescriptor('v2-h8-adaptive', 8),
  neuralDescriptor('v2-h16-adaptive', 16),
  neuralDescriptor('v2-h8-frozen-weights', 8, { adaptive: false }),
  neuralDescriptor('v2-h8-temporal-inputs-ablated', 8, { temporalInputs: false }),
  neuralDescriptor('v2-h8-drift-gain-disabled', 8, {
    slowLearningRate: DEFAULT_NEURAL_OPTIONS.slowLearningRate,
    fastLearningRate: DEFAULT_NEURAL_OPTIONS.slowLearningRate,
  }),
  neuralDescriptor('v2-h8-causal-reservoir-lag-gradient-target', 8, {
    gradientTargetMode: 'causal-reservoir-lag',
  }),
  logisticDescriptor('logistic-current5-adaptive', 5),
  logisticDescriptor('logistic-temporal9-adaptive', 9),
  { id: 'persistence', kind: 'persistence', alpha: null },
  { id: 'ewma-008', kind: 'ewma', alpha: 0.08 },
]);

function neuralDescriptor(
  id: EcologyDevelopmentArmId,
  tier: TsotchkeEcologyPredictorV2Tier,
  overrides: Partial<
    Pick<
      NeuralArmDescriptor,
      'adaptive' | 'temporalInputs' | 'gradientTargetMode' | 'slowLearningRate' | 'fastLearningRate'
    >
  > = {},
): NeuralArmDescriptor {
  return {
    id,
    kind: 'neural',
    tier,
    adaptive: overrides.adaptive ?? true,
    temporalInputs: overrides.temporalInputs ?? true,
    gradientTargetMode: overrides.gradientTargetMode ?? 'revealed-outcome',
    slowLearningRate: overrides.slowLearningRate ?? DEFAULT_NEURAL_OPTIONS.slowLearningRate,
    fastLearningRate: overrides.fastLearningRate ?? DEFAULT_NEURAL_OPTIONS.fastLearningRate,
  };
}

function logisticDescriptor(id: EcologyDevelopmentArmId, inputCount: 5 | 9): LogisticArmDescriptor {
  return {
    id,
    kind: 'logistic',
    inputCount,
    slowLearningRate: DEFAULT_NEURAL_OPTIONS.slowLearningRate,
    fastLearningRate: DEFAULT_NEURAL_OPTIONS.fastLearningRate,
  };
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError('development JSON rejects non-finite numbers');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`development JSON does not support ${typeof value}`);
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function hashCanonical(value: unknown): string {
  return sha256(canonicalJson(value));
}

function taskHashMaterial(taskId: EcologyDevelopmentTaskId): unknown {
  return {
    descriptor: TASK_DESCRIPTORS[taskId],
    cadenceFloor: ECOLOGY_DEVELOPMENT_CADENCES,
    counterGenerator: 'mix32-domain-separated-v1',
    postChangeCadences: POST_CHANGE_CADENCES,
    recoveryBaselineCadences: RECOVERY_BASELINE_CADENCES,
    recoveryWindowCadences: RECOVERY_WINDOW_CADENCES,
    degradationAbsoluteMargin: DEGRADATION_ABSOLUTE_MARGIN,
    degradationRelativeMargin: DEGRADATION_RELATIVE_MARGIN,
    gradualRecoveryAnchor: 'transition-start-plus-144-cadence-indices',
  };
}

function armHashMaterial(descriptor: ArmDescriptor): unknown {
  return descriptor.kind === 'neural' || descriptor.kind === 'logistic'
    ? {
        ...descriptor,
        rmsDecay: DEFAULT_NEURAL_OPTIONS.rmsDecay,
        rmsEpsilon: DEFAULT_NEURAL_OPTIONS.rmsEpsilon,
        gradientClip: DEFAULT_NEURAL_OPTIONS.gradientClip,
        driftAlpha: DEFAULT_NEURAL_OPTIONS.driftAlpha,
      }
    : descriptor;
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb_352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846c_a68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function counterUnit(seed: number, stream: number, cadence: number): number {
  return (
    mix32(seed ^ Math.imul(stream + 1, 0x9e37_79b1) ^ Math.imul(cadence + 1, 0x85eb_ca6b)) /
    UINT32_DIVISOR
  );
}

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function assertCadence(cadence: number, cadenceCount: number): void {
  if (!Number.isSafeInteger(cadence) || cadence < 0 || cadence >= cadenceCount) {
    throw new RangeError(`development cadence must be an integer in [0,${cadenceCount})`);
  }
}

function taskOrdinal(taskId: EcologyDevelopmentTaskId): number {
  return ECOLOGY_DEVELOPMENT_TASKS.indexOf(taskId);
}

function coefficients(seed: number, taskIndex: number, regime: number): readonly number[] {
  return Object.freeze(
    Array.from({ length: 5 }, (_, index) => {
      const raw = counterUnit(seed, 101 + taskIndex * 23 + regime * 7 + index, 0) * 2 - 1;
      return raw * 1.55;
    }),
  );
}

function alternateCoefficients(
  seed: number,
  taskIndex: number,
  primary: readonly number[],
): readonly number[] {
  return Object.freeze(
    primary.map((value, index) => {
      const perturbation = (counterUnit(seed, 307 + taskIndex * 19 + index, 0) * 2 - 1) * 0.35;
      return -0.9 * value + perturbation;
    }),
  );
}

function taskChangePoints(taskId: EcologyDevelopmentTaskId, seed: number): readonly number[] {
  const offset = mix32(seed ^ Math.imul(taskOrdinal(taskId) + 1, 0x27d4_eb2d));
  switch (taskId) {
    case 'stationary-soft-pressure':
      return Object.freeze([]);
    case 'abrupt-seed-drift':
      return Object.freeze([224 + (offset % 65)]);
    case 'gradual-drift':
      return Object.freeze([176 + (offset % 33)]);
    case 'recurring-a-b-a': {
      const first = 160 + (offset % 25);
      return Object.freeze([first, first + 168]);
    }
    case 'covariate-shift':
      return Object.freeze([240 + (offset % 33)]);
    case 'missing-feedback-irregular-elapsed-time':
      return Object.freeze([232 + (offset % 41)]);
  }
}

function taskRecoveryAnchors(
  taskId: EcologyDevelopmentTaskId,
  changePoints: readonly number[],
): readonly number[] {
  return Object.freeze(
    changePoints.map((changePoint) =>
      taskId === 'gradual-drift' ? changePoint + 144 : changePoint,
    ),
  );
}

function validateTaskId(taskId: string): asserts taskId is EcologyDevelopmentTaskId {
  if (!(ECOLOGY_DEVELOPMENT_TASKS as readonly string[]).includes(taskId)) {
    throw new RangeError(`unknown ecology development task: ${taskId}`);
  }
}

export interface EcologyDevelopmentSchedule {
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly taskId: EcologyDevelopmentTaskId;
  readonly taskSha256: string;
  readonly seed: number;
  readonly seedSha256: string;
  readonly cadenceCount: number;
  readonly changePoints: readonly number[];
  readonly recoveryAnchors: readonly number[];
  inputAt(cadence: number): TsotchkeEcologyPredictorV2Input;
  elapsedCadenceAt(cadence: number): number;
  feedbackAvailableAt(cadence: number): boolean;
  labelAt(cadence: number, input: Readonly<TsotchkeEcologyPredictorV2Input>): number;
}

/**
 * Build a prefix-invariant schedule. No coefficient, change point, covariate, feedback decision, or
 * label depends on the requested horizon, so extending a run cannot rewrite its observed prefix.
 */
export function createEcologyDevelopmentSchedule(
  requestedTaskId: EcologyDevelopmentTaskId,
  seed: number,
  cadenceCount = ECOLOGY_DEVELOPMENT_CADENCES,
): EcologyDevelopmentSchedule {
  validateTaskId(requestedTaskId);
  assertPhaseBDevelopmentSeed(seed);
  if (!Number.isSafeInteger(cadenceCount) || cadenceCount < ECOLOGY_DEVELOPMENT_CADENCES) {
    throw new RangeError(
      `ecology development schedules require at least ${ECOLOGY_DEVELOPMENT_CADENCES} cadences`,
    );
  }

  const taskId = requestedTaskId;
  const descriptor = TASK_DESCRIPTORS[taskId];
  const index = taskOrdinal(taskId);
  const changePoints = taskChangePoints(taskId, seed);
  const recoveryAnchors = taskRecoveryAnchors(taskId, changePoints);
  const primary = coefficients(seed, index, 0);
  const alternate = alternateCoefficients(seed, index, primary);
  const primaryIntercept = (counterUnit(seed, 701 + index, 0) * 2 - 1) * 0.45;
  const alternateIntercept = -primaryIntercept + (counterUnit(seed, 733 + index, 0) - 0.5) * 0.2;
  const phase = counterUnit(seed, 761 + index, 0) * Math.PI * 2;

  const elapsedCadenceAt = (cadence: number): number => {
    assertCadence(cadence, cadenceCount);
    if (taskId !== 'missing-feedback-irregular-elapsed-time') return cadence;
    const gapOffset = seed % 29;
    return cadence + Math.floor((cadence + gapOffset) / 83) * 5;
  };

  const inputAt = (cadence: number): TsotchkeEcologyPredictorV2Input => {
    const elapsed = elapsedCadenceAt(cadence);
    const values = Array.from({ length: 5 }, (_, channel) => {
      const period = 43 + channel * 17 + index * 3;
      const seasonal = 0.5 + 0.29 * Math.sin((elapsed / period) * Math.PI * 2 + phase + channel);
      const local = counterUnit(seed, 811 + index * 11 + channel, cadence);
      let value = clamp01(seasonal * 0.72 + local * 0.28);
      if (taskId === 'covariate-shift' && cadence >= (changePoints[0] ?? Infinity)) {
        value = channel % 2 === 0 ? clamp01(0.28 + 0.7 * value) : clamp01(0.72 * (1 - value));
      }
      return value;
    });
    return {
      biomassDepletion: values[0],
      metabolicDepletion: values[1],
      crowding: values[2],
      chaos: values[3],
      thermalStress: values[4],
    };
  };

  const feedbackAvailableAt = (cadence: number): boolean => {
    assertCadence(cadence, cadenceCount);
    if (taskId !== 'missing-feedback-irregular-elapsed-time') return true;
    const phaseOffset = (cadence + (seed % 37)) % 97;
    const primaryChange = changePoints[0] ?? 0;
    const aroundChange = cadence >= primaryChange + 7 && cadence < primaryChange + 23;
    return phaseOffset < 61 || phaseOffset > 72 ? !aroundChange : false;
  };

  const labelAt = (cadence: number, input: Readonly<TsotchkeEcologyPredictorV2Input>): number => {
    const elapsed = elapsedCadenceAt(cadence);
    const current = [
      input.biomassDepletion,
      input.metabolicDepletion,
      input.crowding,
      input.chaos,
      input.thermalStress,
    ].map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : 0));

    let blend = 0;
    const firstChange = changePoints[0] ?? Infinity;
    if (taskId === 'abrupt-seed-drift' || taskId === 'missing-feedback-irregular-elapsed-time') {
      blend = cadence >= firstChange ? 1 : 0;
    } else if (taskId === 'gradual-drift') {
      blend = clamp01((cadence - firstChange) / 144);
    } else if (taskId === 'recurring-a-b-a') {
      blend = cadence >= firstChange && cadence < (changePoints[1] ?? Infinity) ? 1 : 0;
    }

    let logit = primaryIntercept * (1 - blend) + alternateIntercept * blend;
    for (let channel = 0; channel < current.length; channel++) {
      const weight = (primary[channel] ?? 0) * (1 - blend) + (alternate[channel] ?? 0) * blend;
      logit += weight * ((current[channel] ?? 0) - 0.5);
    }
    logit += 0.22 * Math.sin((elapsed / (67 + index * 5)) * Math.PI * 2 + phase);
    return sigmoid(logit);
  };

  return Object.freeze({
    developmentOnly: true as const,
    claimAllowed: false as const,
    taskId,
    taskSha256: hashCanonical(taskHashMaterial(descriptor.id)),
    seed,
    seedSha256: sha256(`cqm/phase-b/development-seed/v1/${seed}`),
    cadenceCount,
    changePoints,
    recoveryAnchors,
    inputAt,
    elapsedCadenceAt,
    feedbackAvailableAt,
    labelAt,
  });
}

export interface RecoveryObservation {
  changeCadenceIndex: number;
  recoveryAnchorCadenceIndex: number;
  baselineSoftTargetSquaredError: number;
  degradationWindowSoftTargetSquaredError: number;
  degradationMargin: number;
  recoveryThreshold: number;
  degradationObserved: boolean;
  recovered: boolean;
  rightCensored: boolean;
  recoveryOffsetCadenceIndices: number | null;
  censorFollowUpCadenceIndices: number | null;
}

export interface EcologyDevelopmentMetrics {
  softTargetSquaredError: number;
  postAnchorSoftTargetSquaredErrorFirst32: number | null;
  softTargetCalibrationGap: number;
  softTargetCrossEntropy: number;
  recoveries: readonly RecoveryObservation[];
}

export interface EcologyDevelopmentRow {
  schemaVersion: 2;
  developmentOnly: true;
  claimAllowed: false;
  taskId: EcologyDevelopmentTaskId;
  taskSha256: string;
  seedRole: EcologyDevelopmentSeedRole;
  seedRoleSha256: string;
  armId: EcologyDevelopmentArmId;
  armSha256: string;
  seed: number;
  seedSha256: string;
  modelSeed: number | null;
  modelSeedSha256: string | null;
  gradientTargetSeed: number | null;
  gradientTargetSeedSha256: string | null;
  cadenceCount: number;
  forecastCount: number;
  scoreCount: number;
  feedbackCount: number;
  missingFeedbackCount: number;
  changePoints: readonly number[];
  recoveryAnchors: readonly number[];
  scheduleSha256: string;
  inputSha256: string;
  trueScoringTargetSha256: string;
  revealedFeedbackOutcomeSha256: string;
  feedbackMaskSha256: string;
  gradientTargetSha256: string;
  modelFamily: 'v2-neural' | 'online-logistic' | 'state-baseline';
  modelInputCount: 0 | 5 | 9;
  modelTier: TsotchkeEcologyPredictorV2Tier | null;
  allocatedParameterCount: number;
  onlineUpdatedParameterCount: number;
  updateCount: number;
  parameterAbsoluteLimit: number;
  maxAbsoluteParameter: number;
  maxOptimizerAccumulator: number;
  metrics: EcologyDevelopmentMetrics;
}

export interface EcologyDevelopmentAggregate {
  seedRole: EcologyDevelopmentSeedRole;
  taskId: EcologyDevelopmentTaskId;
  armId: EcologyDevelopmentArmId;
  rowCount: number;
  meanSoftTargetSquaredError: number;
  meanPostAnchorSoftTargetSquaredErrorFirst32: number | null;
  meanSoftTargetCalibrationGap: number;
  meanSoftTargetCrossEntropy: number;
  recoveryOpportunityCount: number;
  degradationObservedCount: number;
  recoveryEventCount: number;
  rightCensoredCount: number;
  degradationObservedRate: number;
  recoveryEventRateAmongDegraded: number | null;
  rightCensorRateAmongDegraded: number | null;
  meanRecoveryOffsetAmongEvents: number | null;
  meanCensorFollowUpAmongCensors: number | null;
}

export interface EcologyDevelopmentSummary {
  schemaVersion: 2;
  studyId: 'tsotchke-ecology-predictor-phase-b-development-v2';
  developmentOnly: true;
  claimAllowed: false;
  cadenceCount: number;
  seedCount: number;
  mechanismDevelopmentSeedCount: number;
  fixedConfigurationValidationSeedCount: number;
  seedRoleCount: number;
  taskCount: number;
  armCount: number;
  rowCount: number;
  seedFamilySha256: string;
  configurationSha256: string;
  rowsSha256: string;
  retention: {
    configuredRows: number;
    retainedRows: number;
    rowsFilteredByOutcome: 0;
  };
  aggregates: readonly EcologyDevelopmentAggregate[];
}

export interface EcologyDevelopmentStudy {
  summary: EcologyDevelopmentSummary;
  rows: readonly EcologyDevelopmentRow[];
}

interface MetricAccumulator {
  predictions: number[];
  labels: number[];
  softTargetSquaredErrors: number[];
  softTargetCrossEntropies: number[];
}

interface ArmRuntime {
  descriptor: ArmDescriptor;
  forecast(input: TsotchkeEcologyPredictorV2Input): number;
  resolve(scoringLabel: number, feedbackAvailable: boolean): number | null;
  counts(): {
    forecastCount: number;
    feedbackCount: number;
    missingFeedbackCount: number;
    allocatedParameterCount: number;
    onlineUpdatedParameterCount: number;
    updateCount: number;
    parameterAbsoluteLimit: number;
    maxAbsoluteParameter: number;
    maxOptimizerAccumulator: number;
  };
}

class CausalReservoirLagGradientTarget {
  private readonly seed: number;
  private readonly buffer: number[] = [];
  private feedbackIndex = 0;

  constructor(seed: number) {
    assertPhaseBDevelopmentSeed(seed);
    this.seed = seed;
  }

  next(revealedLabel: number): number {
    const index = this.feedbackIndex++;
    if (this.buffer.length < SHUFFLE_BUFFER_CAPACITY) {
      this.buffer.push(revealedLabel);
      return 0.5;
    }
    const selected = Math.floor(counterUnit(this.seed, 0x51f, index) * SHUFFLE_BUFFER_CAPACITY);
    const laggedTarget = this.buffer[selected] ?? 0.5;
    this.buffer[selected] = revealedLabel;
    return laggedTarget;
  }
}

const PREDEFINED_DEVELOPMENT_SEED_SET = new Set<number>(
  Object.values(PHASE_B_DEVELOPMENT_SEEDS).flat(),
);

function derivedDevelopmentSeed(
  domain: string,
  components: readonly (number | string)[],
  reserved: ReadonlySet<number>,
): number {
  for (let nonce = 0; nonce < 1024; nonce++) {
    const digest = new Bun.CryptoHasher('sha256')
      .update(`${domain}/${components.join('/')}/${nonce}`)
      .digest('hex');
    const candidate = Number.parseInt(digest.slice(0, 8), 16) >>> 0;
    if (PREDEFINED_DEVELOPMENT_SEED_SET.has(candidate) || reserved.has(candidate)) continue;
    try {
      assertPhaseBDevelopmentSeed(candidate);
      return candidate;
    } catch {
      // A zero or historical evidence collision advances deterministically to the next nonce.
    }
  }
  throw new Error(`unable to derive a disjoint Phase-B development seed for ${domain}`);
}

function flattenV2Parameters(predictor: TsotchkeEcologyPredictorV2): number[] {
  const snapshot = predictor.snapshot();
  return [
    ...snapshot.parameters.w1,
    ...snapshot.parameters.b1,
    ...snapshot.parameters.wSkip,
    ...snapshot.parameters.w2,
    snapshot.parameters.b2,
  ];
}

function flattenV2Optimizer(predictor: TsotchkeEcologyPredictorV2): number[] {
  const snapshot = predictor.snapshot();
  return [
    ...snapshot.optimizer.rmsW1,
    ...snapshot.optimizer.rmsB1,
    ...snapshot.optimizer.rmsWSkip,
    ...snapshot.optimizer.rmsW2,
    snapshot.optimizer.rmsB2,
  ];
}

class OnlineLogisticControl {
  private readonly inputCount: 5 | 9;
  private readonly slowLearningRate: number;
  private readonly fastLearningRate: number;
  private readonly weights: Float64Array;
  private readonly initialWeights: number[];
  private readonly rms: Float64Array;
  private readonly pendingInput: Float64Array;
  private bias = 0;
  private rmsBias = 0;
  private pendingPrediction = 0.5;
  private pending = false;
  private contextValid = false;
  private lastRevealedOutcome = 0;
  private lastSignedResidual = 0;
  private lastOutcomeDelta = 0;
  private driftScore = 0;
  private forecastCount = 0;
  private feedbackCount = 0;
  private missingFeedbackCount = 0;
  private updateCount = 0;

  constructor(seed: number, descriptor: LogisticArmDescriptor) {
    assertPhaseBDevelopmentSeed(seed);
    this.inputCount = descriptor.inputCount;
    this.slowLearningRate = descriptor.slowLearningRate;
    this.fastLearningRate = descriptor.fastLearningRate;
    this.weights = new Float64Array(this.inputCount);
    this.rms = new Float64Array(this.inputCount);
    this.pendingInput = new Float64Array(this.inputCount);
    const scale = Math.sqrt(6 / (this.inputCount + 1));
    for (let index = 0; index < this.weights.length; index++) {
      this.weights[index] = (counterUnit(seed, 0x10_9157, index) * 2 - 1) * scale;
    }
    this.initialWeights = [...this.weights, this.bias];
  }

  forecast(input: TsotchkeEcologyPredictorV2Input): number {
    if (this.pending) throw new Error('online logistic control has an unresolved forecast');
    const current = [
      input.biomassDepletion,
      input.metabolicDepletion,
      input.crowding,
      input.chaos,
      input.thermalStress,
    ];
    for (let index = 0; index < 5; index++) {
      const value = current[index];
      this.pendingInput[index] =
        typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : 0;
    }
    if (this.inputCount === 9) {
      this.pendingInput[5] = this.contextValid ? this.lastRevealedOutcome : 0;
      this.pendingInput[6] = this.contextValid ? this.lastSignedResidual : 0;
      this.pendingInput[7] = this.contextValid ? this.lastOutcomeDelta : 0;
      this.pendingInput[8] = this.contextValid ? 1 : 0;
    }
    let logit = this.bias;
    for (let index = 0; index < this.weights.length; index++) {
      logit += (this.weights[index] ?? 0) * (this.pendingInput[index] ?? 0);
    }
    this.pendingPrediction = sigmoid(logit);
    this.pending = true;
    this.forecastCount++;
    return this.pendingPrediction;
  }

  resolve(revealedOutcome: number, feedbackAvailable: boolean): number | null {
    if (!this.pending) throw new Error('online logistic control has no pending forecast');
    if (!feedbackAvailable) {
      this.pending = false;
      this.pendingInput.fill(0);
      this.pendingPrediction = 0.5;
      this.missingFeedbackCount++;
      return null;
    }

    const prediction = this.pendingPrediction;
    const signedResidual = revealedOutcome - prediction;
    const nextDriftScore = clamp01(
      (1 - DEFAULT_NEURAL_OPTIONS.driftAlpha) * this.driftScore +
        DEFAULT_NEURAL_OPTIONS.driftAlpha * Math.abs(signedResidual),
    );
    const learningRate =
      this.slowLearningRate + (this.fastLearningRate - this.slowLearningRate) * nextDriftScore;
    const logitGradient = prediction - revealedOutcome;
    let normSquared = logitGradient * logitGradient;
    for (let index = 0; index < this.pendingInput.length; index++) {
      const gradient = logitGradient * (this.pendingInput[index] ?? 0);
      normSquared += gradient * gradient;
    }
    const norm = Math.sqrt(normSquared);
    const scale =
      norm > DEFAULT_NEURAL_OPTIONS.gradientClip ? DEFAULT_NEURAL_OPTIONS.gradientClip / norm : 1;
    for (let index = 0; index < this.weights.length; index++) {
      const gradient = logitGradient * (this.pendingInput[index] ?? 0) * scale;
      const nextRms =
        DEFAULT_NEURAL_OPTIONS.rmsDecay * (this.rms[index] ?? 0) +
        (1 - DEFAULT_NEURAL_OPTIONS.rmsDecay) * gradient * gradient;
      this.rms[index] = nextRms;
      this.weights[index] = Math.max(
        -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
        Math.min(
          TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
          (this.weights[index] ?? 0) -
            (learningRate * gradient) / (Math.sqrt(nextRms) + DEFAULT_NEURAL_OPTIONS.rmsEpsilon),
        ),
      );
    }
    const biasGradient = logitGradient * scale;
    this.rmsBias =
      DEFAULT_NEURAL_OPTIONS.rmsDecay * this.rmsBias +
      (1 - DEFAULT_NEURAL_OPTIONS.rmsDecay) * biasGradient * biasGradient;
    this.bias = Math.max(
      -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      Math.min(
        TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
        this.bias -
          (learningRate * biasGradient) /
            (Math.sqrt(this.rmsBias) + DEFAULT_NEURAL_OPTIONS.rmsEpsilon),
      ),
    );

    const previousOutcome = this.lastRevealedOutcome;
    this.lastOutcomeDelta = this.contextValid ? revealedOutcome - previousOutcome : 0;
    this.lastRevealedOutcome = revealedOutcome;
    this.lastSignedResidual = signedResidual;
    this.driftScore = nextDriftScore;
    this.contextValid = true;
    this.pending = false;
    this.pendingInput.fill(0);
    this.pendingPrediction = 0.5;
    this.feedbackCount++;
    this.updateCount++;
    return revealedOutcome;
  }

  counts(): ReturnType<ArmRuntime['counts']> {
    const parameters = [...this.weights, this.bias];
    const optimizer = [...this.rms, this.rmsBias];
    return {
      forecastCount: this.forecastCount,
      feedbackCount: this.feedbackCount,
      missingFeedbackCount: this.missingFeedbackCount,
      allocatedParameterCount: parameters.length,
      onlineUpdatedParameterCount: parameters.filter(
        (value, index) => value !== this.initialWeights[index],
      ).length,
      updateCount: this.updateCount,
      parameterAbsoluteLimit: TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      maxAbsoluteParameter: Math.max(...parameters.map((value) => Math.abs(value))),
      maxOptimizerAccumulator: Math.max(...optimizer),
    };
  }
}

function createArmRuntime(
  descriptor: ArmDescriptor,
  modelSeed: number,
  gradientTargetSeed: number,
): ArmRuntime {
  if (descriptor.kind === 'neural') {
    const options: TsotchkeEcologyPredictorV2Options = {
      tier: descriptor.tier,
      adaptive: descriptor.adaptive,
      temporalInputs: descriptor.temporalInputs,
      slowLearningRate: descriptor.slowLearningRate,
      fastLearningRate: descriptor.fastLearningRate,
      rmsDecay: DEFAULT_NEURAL_OPTIONS.rmsDecay,
      rmsEpsilon: DEFAULT_NEURAL_OPTIONS.rmsEpsilon,
      gradientClip: DEFAULT_NEURAL_OPTIONS.gradientClip,
      driftAlpha: DEFAULT_NEURAL_OPTIONS.driftAlpha,
    };
    const predictor = new TsotchkeEcologyPredictorV2(modelSeed, options);
    const initialParameters = flattenV2Parameters(predictor);
    const reservoirLag =
      descriptor.gradientTargetMode === 'causal-reservoir-lag'
        ? new CausalReservoirLagGradientTarget(gradientTargetSeed)
        : null;
    let pendingToken = 0;

    return {
      descriptor,
      forecast(input) {
        const forecast = predictor.forecast(input);
        pendingToken = forecast.token;
        return forecast.prediction;
      },
      resolve(scoringLabel, feedbackAvailable) {
        if (!feedbackAvailable) {
          predictor.discardPending();
          pendingToken = 0;
          return null;
        }
        const gradientTarget = reservoirLag?.next(scoringLabel) ?? scoringLabel;
        predictor.observe({ token: pendingToken, outcome: scoringLabel, gradientTarget });
        pendingToken = 0;
        return gradientTarget;
      },
      counts() {
        const snapshot = predictor.snapshot();
        const parameters = flattenV2Parameters(predictor);
        const optimizer = flattenV2Optimizer(predictor);
        return {
          forecastCount: snapshot.counters.forecastCount,
          feedbackCount: snapshot.counters.observationCount,
          missingFeedbackCount: snapshot.counters.discardCount,
          allocatedParameterCount: predictor.trainableParameterCount,
          onlineUpdatedParameterCount: parameters.filter(
            (value, index) => value !== initialParameters[index],
          ).length,
          updateCount: snapshot.counters.updateCount,
          parameterAbsoluteLimit: TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
          maxAbsoluteParameter: Math.max(...parameters.map((value) => Math.abs(value))),
          maxOptimizerAccumulator: Math.max(...optimizer),
        };
      },
    };
  }

  if (descriptor.kind === 'logistic') {
    const predictor = new OnlineLogisticControl(modelSeed, descriptor);
    return {
      descriptor,
      forecast: (input) => predictor.forecast(input),
      resolve: (revealedOutcome, feedbackAvailable) =>
        predictor.resolve(revealedOutcome, feedbackAvailable),
      counts: () => predictor.counts(),
    };
  }

  let forecastCount = 0;
  let feedbackCount = 0;
  let missingFeedbackCount = 0;
  let state = 0.5;

  return {
    descriptor,
    forecast() {
      forecastCount++;
      return state;
    },
    resolve(scoringLabel, feedbackAvailable) {
      if (!feedbackAvailable) {
        missingFeedbackCount++;
        return null;
      }
      feedbackCount++;
      if (descriptor.kind === 'persistence') state = scoringLabel;
      else
        state =
          (descriptor.alpha ?? 0.08) * scoringLabel + (1 - (descriptor.alpha ?? 0.08)) * state;
      return scoringLabel;
    },
    counts() {
      return {
        forecastCount,
        feedbackCount,
        missingFeedbackCount,
        allocatedParameterCount: 0,
        onlineUpdatedParameterCount: 0,
        updateCount: 0,
        parameterAbsoluteLimit: 0,
        maxAbsoluteParameter: 0,
        maxOptimizerAccumulator: 0,
      };
    },
  };
}

function appendNumber(hasher: Bun.CryptoHasher, value: number): void {
  hasher.update(`${Object.is(value, -0) ? 0 : value};`);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('cannot average an empty development metric');
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function calibrationGap(predictions: readonly number[], labels: readonly number[]): number {
  const predictionSums = new Float64Array(ECE_BIN_COUNT);
  const labelSums = new Float64Array(ECE_BIN_COUNT);
  const counts = new Uint32Array(ECE_BIN_COUNT);
  for (let index = 0; index < predictions.length; index++) {
    const prediction = predictions[index] ?? 0.5;
    const label = labels[index] ?? 0.5;
    const bin = Math.min(ECE_BIN_COUNT - 1, Math.floor(prediction * ECE_BIN_COUNT));
    predictionSums[bin] = (predictionSums[bin] ?? 0) + prediction;
    labelSums[bin] = (labelSums[bin] ?? 0) + label;
    counts[bin] = (counts[bin] ?? 0) + 1;
  }
  let gap = 0;
  for (let bin = 0; bin < ECE_BIN_COUNT; bin++) {
    const count = counts[bin] ?? 0;
    if (count === 0) continue;
    gap +=
      (count / predictions.length) *
      Math.abs((predictionSums[bin] ?? 0) / count - (labelSums[bin] ?? 0) / count);
  }
  return gap;
}

function postAnchorSoftTargetSquaredError(
  squaredErrors: readonly number[],
  recoveryAnchors: readonly number[],
): number | null {
  const selected: number[] = [];
  for (const anchor of recoveryAnchors) {
    for (
      let cadence = anchor;
      cadence < Math.min(squaredErrors.length, anchor + POST_CHANGE_CADENCES);
      cadence++
    ) {
      selected.push(squaredErrors[cadence] ?? 0);
    }
  }
  return selected.length === 0 ? null : mean(selected);
}

function recoveryObservations(
  squaredErrors: readonly number[],
  changePoints: readonly number[],
  recoveryAnchors: readonly number[],
): readonly RecoveryObservation[] {
  return Object.freeze(
    changePoints.map((changeCadenceIndex, index) => {
      const recoveryAnchorCadenceIndex = recoveryAnchors[index];
      if (recoveryAnchorCadenceIndex === undefined) {
        throw new Error('recovery anchor matrix is incomplete');
      }
      const regimeEnd = Math.min(
        squaredErrors.length,
        changePoints[index + 1] ?? squaredErrors.length,
      );
      const baselineStart = Math.max(0, changeCadenceIndex - RECOVERY_BASELINE_CADENCES);
      const baselineSoftTargetSquaredError = mean(
        squaredErrors.slice(baselineStart, changeCadenceIndex),
      );
      const degradationEnd = recoveryAnchorCadenceIndex + RECOVERY_WINDOW_CADENCES;
      if (degradationEnd > regimeEnd) {
        throw new Error('recovery estimand lacks a complete degradation window');
      }
      const degradationWindowSoftTargetSquaredError = mean(
        squaredErrors.slice(recoveryAnchorCadenceIndex, degradationEnd),
      );
      const degradationMargin = Math.max(
        DEGRADATION_ABSOLUTE_MARGIN,
        baselineSoftTargetSquaredError * DEGRADATION_RELATIVE_MARGIN,
      );
      const recoveryThreshold = Math.min(1, baselineSoftTargetSquaredError + degradationMargin);
      const degradationObserved = degradationWindowSoftTargetSquaredError > recoveryThreshold;
      let recoveredAt: number | null = null;
      if (degradationObserved) {
        for (
          let windowEnd = degradationEnd + RECOVERY_WINDOW_CADENCES;
          windowEnd <= regimeEnd;
          windowEnd++
        ) {
          const window = squaredErrors.slice(windowEnd - RECOVERY_WINDOW_CADENCES, windowEnd);
          if (mean(window) <= recoveryThreshold) {
            recoveredAt = windowEnd;
            break;
          }
        }
      }
      return {
        changeCadenceIndex,
        recoveryAnchorCadenceIndex,
        baselineSoftTargetSquaredError,
        degradationWindowSoftTargetSquaredError,
        degradationMargin,
        recoveryThreshold,
        degradationObserved,
        recovered: recoveredAt !== null,
        rightCensored: degradationObserved && recoveredAt === null,
        recoveryOffsetCadenceIndices:
          recoveredAt === null ? null : recoveredAt - recoveryAnchorCadenceIndex,
        censorFollowUpCadenceIndices:
          degradationObserved && recoveredAt === null
            ? regimeEnd - recoveryAnchorCadenceIndex
            : null,
      };
    }),
  );
}

function finishMetrics(
  accumulator: MetricAccumulator,
  changePoints: readonly number[],
  recoveryAnchors: readonly number[],
): EcologyDevelopmentMetrics {
  return {
    softTargetSquaredError: mean(accumulator.softTargetSquaredErrors),
    postAnchorSoftTargetSquaredErrorFirst32: postAnchorSoftTargetSquaredError(
      accumulator.softTargetSquaredErrors,
      recoveryAnchors,
    ),
    softTargetCalibrationGap: calibrationGap(accumulator.predictions, accumulator.labels),
    softTargetCrossEntropy: mean(accumulator.softTargetCrossEntropies),
    recoveries: recoveryObservations(
      accumulator.softTargetSquaredErrors,
      changePoints,
      recoveryAnchors,
    ),
  };
}

function createAccumulators(): Map<EcologyDevelopmentArmId, MetricAccumulator> {
  return new Map(
    ECOLOGY_DEVELOPMENT_ARMS.map((armId) => [
      armId,
      {
        predictions: [],
        labels: [],
        softTargetSquaredErrors: [],
        softTargetCrossEntropies: [],
      },
    ]),
  );
}

function runSchedule(
  seedRole: EcologyDevelopmentSeedRole,
  taskId: EcologyDevelopmentTaskId,
  seed: number,
  cadenceCount: number,
): EcologyDevelopmentRow[] {
  const schedule = createEcologyDevelopmentSchedule(taskId, seed, cadenceCount);
  const modelSeed = derivedDevelopmentSeed(
    'cqm/predictor-phase-b/dev-model-initialization/v1',
    [seedRole, seed, taskId],
    new Set(),
  );
  const gradientTargetSeed = derivedDevelopmentSeed(
    'cqm/predictor-phase-b/dev-causal-reservoir-lag-gradient-target/v1',
    [seedRole, seed, taskId],
    new Set([modelSeed]),
  );
  const runtimes = ARM_DESCRIPTORS.map((descriptor) =>
    createArmRuntime(descriptor, modelSeed, gradientTargetSeed),
  );
  const accumulators = createAccumulators();
  const gradientTargetHashers = new Map(
    ECOLOGY_DEVELOPMENT_ARMS.map((armId) => [armId, new Bun.CryptoHasher('sha256')]),
  );
  const inputHasher = new Bun.CryptoHasher('sha256');
  const labelHasher = new Bun.CryptoHasher('sha256');
  const revealedFeedbackOutcomeHasher = new Bun.CryptoHasher('sha256');
  const feedbackHasher = new Bun.CryptoHasher('sha256');

  for (let cadence = 0; cadence < cadenceCount; cadence++) {
    // Causal boundary: all arms forecast from the current inputs before this cadence's label exists.
    const input = schedule.inputAt(cadence);
    const predictions = runtimes.map((runtime) => runtime.forecast(input));
    const scoringLabel = schedule.labelAt(cadence, input);
    const feedbackAvailable = schedule.feedbackAvailableAt(cadence);

    appendNumber(inputHasher, input.biomassDepletion ?? 0);
    appendNumber(inputHasher, input.metabolicDepletion ?? 0);
    appendNumber(inputHasher, input.crowding ?? 0);
    appendNumber(inputHasher, input.chaos ?? 0);
    appendNumber(inputHasher, input.thermalStress ?? 0);
    appendNumber(labelHasher, scoringLabel);
    feedbackHasher.update(feedbackAvailable ? '1' : '0');
    if (feedbackAvailable) appendNumber(revealedFeedbackOutcomeHasher, scoringLabel);
    else revealedFeedbackOutcomeHasher.update('missing;');

    for (let armIndex = 0; armIndex < runtimes.length; armIndex++) {
      const runtime = runtimes[armIndex];
      const prediction = predictions[armIndex];
      if (runtime === undefined || prediction === undefined) {
        throw new Error('development arm matrix is internally incomplete');
      }
      const accumulator = accumulators.get(runtime.descriptor.id);
      const gradientTargetHasher = gradientTargetHashers.get(runtime.descriptor.id);
      if (accumulator === undefined || gradientTargetHasher === undefined) {
        throw new Error(`development accumulator missing for ${runtime.descriptor.id}`);
      }
      const residual = scoringLabel - prediction;
      accumulator.predictions.push(prediction);
      accumulator.labels.push(scoringLabel);
      accumulator.softTargetSquaredErrors.push(residual * residual);
      const boundedPrediction = Math.min(1 - LOG_EPSILON, Math.max(LOG_EPSILON, prediction));
      accumulator.softTargetCrossEntropies.push(
        -scoringLabel * Math.log(boundedPrediction) -
          (1 - scoringLabel) * Math.log(1 - boundedPrediction),
      );

      const gradientTarget = runtime.resolve(scoringLabel, feedbackAvailable);
      if (gradientTarget === null) gradientTargetHasher.update('missing;');
      else appendNumber(gradientTargetHasher, gradientTarget);
    }
  }

  const inputSha256 = inputHasher.digest('hex');
  const trueScoringTargetSha256 = labelHasher.digest('hex');
  const revealedFeedbackOutcomeSha256 = revealedFeedbackOutcomeHasher.digest('hex');
  const feedbackMaskSha256 = feedbackHasher.digest('hex');
  const scheduleSha256 = hashCanonical({
    seedRole,
    taskId,
    seed,
    cadenceCount,
    changePoints: schedule.changePoints,
    recoveryAnchors: schedule.recoveryAnchors,
    inputSha256,
    trueScoringTargetSha256,
    revealedFeedbackOutcomeSha256,
    feedbackMaskSha256,
  });
  const feedbackCount = Array.from({ length: cadenceCount }, (_, cadence) =>
    schedule.feedbackAvailableAt(cadence),
  ).filter(Boolean).length;

  return runtimes.map((runtime) => {
    const descriptor = runtime.descriptor;
    const counts = runtime.counts();
    const accumulator = accumulators.get(descriptor.id);
    const gradientTargetHasher = gradientTargetHashers.get(descriptor.id);
    if (accumulator === undefined || gradientTargetHasher === undefined) {
      throw new Error(`development finalizer missing for ${descriptor.id}`);
    }
    if (
      counts.forecastCount !== cadenceCount ||
      counts.feedbackCount !== feedbackCount ||
      counts.missingFeedbackCount !== cadenceCount - feedbackCount
    ) {
      throw new Error(`development budget mismatch for ${taskId}/${seed}/${descriptor.id}`);
    }
    return {
      schemaVersion: ECOLOGY_DEVELOPMENT_SCHEMA_VERSION,
      developmentOnly: true,
      claimAllowed: false,
      taskId,
      taskSha256: schedule.taskSha256,
      seedRole,
      seedRoleSha256: sha256(`cqm/phase-b/development-seed-role/v1/${seedRole}`),
      armId: descriptor.id,
      armSha256: hashCanonical(armHashMaterial(descriptor)),
      seed,
      seedSha256: schedule.seedSha256,
      modelSeed: descriptor.kind === 'neural' || descriptor.kind === 'logistic' ? modelSeed : null,
      modelSeedSha256:
        descriptor.kind === 'neural' || descriptor.kind === 'logistic'
          ? sha256(`cqm/phase-b/development-model-seed/v1/${modelSeed}`)
          : null,
      gradientTargetSeed:
        descriptor.kind === 'neural' && descriptor.gradientTargetMode === 'causal-reservoir-lag'
          ? gradientTargetSeed
          : null,
      gradientTargetSeedSha256:
        descriptor.kind === 'neural' && descriptor.gradientTargetMode === 'causal-reservoir-lag'
          ? sha256(`cqm/phase-b/development-gradient-target-seed/v1/${gradientTargetSeed}`)
          : null,
      cadenceCount,
      forecastCount: counts.forecastCount,
      scoreCount: accumulator.softTargetSquaredErrors.length,
      feedbackCount: counts.feedbackCount,
      missingFeedbackCount: counts.missingFeedbackCount,
      changePoints: schedule.changePoints,
      recoveryAnchors: schedule.recoveryAnchors,
      scheduleSha256,
      inputSha256,
      trueScoringTargetSha256,
      revealedFeedbackOutcomeSha256,
      feedbackMaskSha256,
      gradientTargetSha256: gradientTargetHasher.digest('hex'),
      modelFamily:
        descriptor.kind === 'neural'
          ? 'v2-neural'
          : descriptor.kind === 'logistic'
            ? 'online-logistic'
            : 'state-baseline',
      modelInputCount:
        descriptor.kind === 'neural'
          ? 9
          : descriptor.kind === 'logistic'
            ? descriptor.inputCount
            : 0,
      modelTier: descriptor.kind === 'neural' ? descriptor.tier : null,
      allocatedParameterCount: counts.allocatedParameterCount,
      onlineUpdatedParameterCount: counts.onlineUpdatedParameterCount,
      updateCount: counts.updateCount,
      parameterAbsoluteLimit: counts.parameterAbsoluteLimit,
      maxAbsoluteParameter: counts.maxAbsoluteParameter,
      maxOptimizerAccumulator: counts.maxOptimizerAccumulator,
      metrics: finishMetrics(accumulator, schedule.changePoints, schedule.recoveryAnchors),
    } satisfies EcologyDevelopmentRow;
  });
}

function aggregateRows(rows: readonly EcologyDevelopmentRow[]): EcologyDevelopmentAggregate[] {
  const aggregates: EcologyDevelopmentAggregate[] = [];
  const presentRoles = ECOLOGY_DEVELOPMENT_SEED_ROLES.filter((seedRole) =>
    rows.some((row) => row.seedRole === seedRole),
  );
  for (const seedRole of presentRoles) {
    for (const taskId of ECOLOGY_DEVELOPMENT_TASKS) {
      for (const armId of ECOLOGY_DEVELOPMENT_ARMS) {
        const selected = rows.filter(
          (row) => row.seedRole === seedRole && row.taskId === taskId && row.armId === armId,
        );
        if (selected.length === 0)
          throw new Error(`development aggregate is empty: ${seedRole}/${taskId}/${armId}`);
        const postAnchor = selected
          .map((row) => row.metrics.postAnchorSoftTargetSquaredErrorFirst32)
          .filter((value): value is number => value !== null);
        const recoveries = selected.flatMap((row) => row.metrics.recoveries);
        const degraded = recoveries.filter((recovery) => recovery.degradationObserved);
        const events = degraded.filter((recovery) => recovery.recovered);
        const censors = degraded.filter((recovery) => recovery.rightCensored);
        aggregates.push({
          seedRole,
          taskId,
          armId,
          rowCount: selected.length,
          meanSoftTargetSquaredError: mean(
            selected.map((row) => row.metrics.softTargetSquaredError),
          ),
          meanPostAnchorSoftTargetSquaredErrorFirst32:
            postAnchor.length === 0 ? null : mean(postAnchor),
          meanSoftTargetCalibrationGap: mean(
            selected.map((row) => row.metrics.softTargetCalibrationGap),
          ),
          meanSoftTargetCrossEntropy: mean(
            selected.map((row) => row.metrics.softTargetCrossEntropy),
          ),
          recoveryOpportunityCount: recoveries.length,
          degradationObservedCount: degraded.length,
          recoveryEventCount: events.length,
          rightCensoredCount: censors.length,
          degradationObservedRate:
            recoveries.length === 0 ? 0 : degraded.length / recoveries.length,
          recoveryEventRateAmongDegraded:
            degraded.length === 0 ? null : events.length / degraded.length,
          rightCensorRateAmongDegraded:
            degraded.length === 0 ? null : censors.length / degraded.length,
          meanRecoveryOffsetAmongEvents:
            events.length === 0
              ? null
              : mean(
                  events.map((recovery) => {
                    if (recovery.recoveryOffsetCadenceIndices === null) {
                      throw new Error('recovery event lacks an offset');
                    }
                    return recovery.recoveryOffsetCadenceIndices;
                  }),
                ),
          meanCensorFollowUpAmongCensors:
            censors.length === 0
              ? null
              : mean(
                  censors.map((recovery) => {
                    if (recovery.censorFollowUpCadenceIndices === null) {
                      throw new Error('right-censored observation lacks follow-up');
                    }
                    return recovery.censorFollowUpCadenceIndices;
                  }),
                ),
        });
      }
    }
  }
  return aggregates;
}

export interface RunEcologyDevelopmentOptions {
  /** Custom seeds exist for focused tests only; every entry still crosses the historical firewall. */
  seeds?: readonly number[];
  cadenceCount?: number;
}

/** Execute the complete in-memory development matrix. This function performs no filesystem IO. */
export function runEcologyPredictorDevelopment(
  options: RunEcologyDevelopmentOptions = {},
): EcologyDevelopmentStudy {
  const cadenceCount = options.cadenceCount ?? ECOLOGY_DEVELOPMENT_CADENCES;
  const roleFamilies: readonly {
    role: EcologyDevelopmentSeedRole;
    seeds: readonly number[];
  }[] = options.seeds
    ? [{ role: 'mechanism-development', seeds: options.seeds }]
    : [
        {
          role: 'mechanism-development',
          seeds: PHASE_B_DEVELOPMENT_SEEDS.predictorDevelopment,
        },
        {
          role: 'fixed-configuration-validation',
          seeds: PHASE_B_DEVELOPMENT_SEEDS.predictorCalibration,
        },
      ];
  if (roleFamilies.some((family) => family.seeds.length === 0)) {
    throw new RangeError('ecology development requires at least one seed per configured role');
  }
  assertDisjointPhaseBDevelopmentFamilies(
    Object.fromEntries(roleFamilies.map((family) => [family.role, family.seeds])),
  );
  if (!Number.isSafeInteger(cadenceCount) || cadenceCount < ECOLOGY_DEVELOPMENT_CADENCES) {
    throw new RangeError(
      `ecology development requires at least ${ECOLOGY_DEVELOPMENT_CADENCES} cadences`,
    );
  }

  const rows: EcologyDevelopmentRow[] = [];
  // The fixed-configuration validation role runs second and cannot mutate the static arm config.
  for (const family of roleFamilies) {
    for (const taskId of ECOLOGY_DEVELOPMENT_TASKS) {
      for (const seed of family.seeds) {
        assertPhaseBDevelopmentSeed(seed);
        rows.push(...runSchedule(family.role, taskId, seed, cadenceCount));
      }
    }
  }

  const seedCount = roleFamilies.reduce((total, family) => total + family.seeds.length, 0);
  const expectedRows = seedCount * ECOLOGY_DEVELOPMENT_TASKS.length * ARM_DESCRIPTORS.length;
  if (rows.length !== expectedRows) {
    throw new Error(`development row matrix mismatch: ${rows.length} !== ${expectedRows}`);
  }
  const aggregates = aggregateRows(rows);
  const configuration = {
    schemaVersion: ECOLOGY_DEVELOPMENT_SCHEMA_VERSION,
    cadenceCount,
    tasks: ECOLOGY_DEVELOPMENT_TASKS.map((taskId) => taskHashMaterial(taskId)),
    arms: ARM_DESCRIPTORS.map((descriptor) => armHashMaterial(descriptor)),
    seedFamilies: roleFamilies,
  };
  const summary: EcologyDevelopmentSummary = {
    schemaVersion: ECOLOGY_DEVELOPMENT_SCHEMA_VERSION,
    studyId: 'tsotchke-ecology-predictor-phase-b-development-v2',
    developmentOnly: true,
    claimAllowed: false,
    cadenceCount,
    seedCount,
    mechanismDevelopmentSeedCount:
      roleFamilies.find((family) => family.role === 'mechanism-development')?.seeds.length ?? 0,
    fixedConfigurationValidationSeedCount:
      roleFamilies.find((family) => family.role === 'fixed-configuration-validation')?.seeds
        .length ?? 0,
    seedRoleCount: roleFamilies.length,
    taskCount: ECOLOGY_DEVELOPMENT_TASKS.length,
    armCount: ARM_DESCRIPTORS.length,
    rowCount: rows.length,
    seedFamilySha256: hashCanonical(roleFamilies),
    configurationSha256: hashCanonical(configuration),
    rowsSha256: hashCanonical(rows),
    retention: {
      configuredRows: expectedRows,
      retainedRows: rows.length,
      rowsFilteredByOutcome: 0,
    },
    aggregates,
  };
  // Round-tripping here is a cheap guard against accidental undefined/non-finite output fields.
  JSON.parse(canonicalJson({ summary, rows }));
  return { summary, rows };
}

if (import.meta.main) {
  console.log(canonicalJson(runEcologyPredictorDevelopment()));
}
