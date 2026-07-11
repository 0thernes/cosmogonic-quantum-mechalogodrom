/**
 * Deterministic DEVELOPMENT-ONLY temporal-identifiability experiment.
 *
 * Every scored example is a counterbalanced cue/query twin. The twins have byte-identical current
 * query inputs and opposite soft targets, so no present-only predictor can beat mean SSE 0.16 or
 * mean cross-entropy ln(2). Evaluation starts each twin from the same frozen model checkpoint,
 * resets episode state independently, forecasts before the target is available, and discards the
 * query token. This module is an in-memory mechanism-development surface, not confirmatory evidence.
 */

import {
  TsotchkeEcologyPredictorV2,
  type TsotchkeEcologyPredictorV2Snapshot,
} from '../../src/sim/tsotchke-ecology-predictor-v2';
import {
  TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS,
  TsotchkeEcologyPredictorV3,
  tsotchkeEcologyPredictorV3ParameterCount,
  type TsotchkeEcologyPredictorV3Input,
  type TsotchkeEcologyPredictorV3Snapshot,
} from '../../src/sim/tsotchke-ecology-predictor-v3';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  PHASE_B_DEVELOPMENT_SEEDS,
} from './development-seeds';

export const ECOLOGY_TEMPORAL_DEVELOPMENT_SCHEMA_VERSION = 1;
export const ECOLOGY_TEMPORAL_DELAYS = Object.freeze([2, 8, 16] as const);
export type EcologyTemporalDelay = (typeof ECOLOGY_TEMPORAL_DELAYS)[number];

export const ECOLOGY_TEMPORAL_PRESENT_ONLY_SSE_FLOOR = 0.16;
export const ECOLOGY_TEMPORAL_PRESENT_ONLY_CROSS_ENTROPY_FLOOR = Math.log(2);
export const ECOLOGY_TEMPORAL_ORACLE_SSE = 0;
export const ECOLOGY_TEMPORAL_ORACLE_CROSS_ENTROPY = -(0.9 * Math.log(0.9) + 0.1 * Math.log(0.1));

export const ECOLOGY_TEMPORAL_ARMS = Object.freeze([
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
] as const);
export type EcologyTemporalArmId = (typeof ECOLOGY_TEMPORAL_ARMS)[number];

export const ECOLOGY_TEMPORAL_CONTROL_ARMS = Object.freeze(
  ECOLOGY_TEMPORAL_ARMS.filter(
    (arm): arm is Exclude<EcologyTemporalArmId, 'v3-h8-identity-history' | 'causal-oracle'> =>
      arm !== 'v3-h8-identity-history' && arm !== 'causal-oracle',
  ),
);

export const ECOLOGY_TEMPORAL_GATE_THRESHOLDS = Object.freeze({
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

const DEFAULT_TRAINING_EPOCHS = 2;
const DEFAULT_BOOTSTRAP_REPLICATES = 2_000;
const LOG_EPSILON = 1e-12;
const CURRENT_INPUT_COUNT = 5;
const EWMA_ALPHA = 0.08;

const TEMPORAL_TASK_PROTOCOL = Object.freeze({
  version: 1,
  twinLaw: 'match and mismatch cues share one byte-identical terminal query input',
  cueLaw:
    'one task-seed-selected channel carries the cue bit; four other channels are seed-derived',
  neutralLaw: 'every intervening frame has five seed-derived bounded covariates',
  queryLaw: 'the cue channel carries the query bit; four other current channels are seed-derived',
  targetLaw: 'cue equals query => 0.9; cue differs from query => 0.1',
  delayLaw: 'cue/query lags 2,8,16 use 1,7,15 intervening neutral frames',
  evaluationLaw:
    'clone frozen checkpoint, reset each twin independently, forecast query, discard query token',
});

const TEMPORAL_ARM_PROTOCOLS: Readonly<Record<EcologyTemporalArmId, unknown>> = Object.freeze({
  'v3-h8-identity-history': {
    model: 'V3 H8',
    allocatedParameters: 926,
    gradientReachableParameters: 926,
    historyInputs: true,
    evaluationTransform: 'identity',
  },
  'v3-h8-history-zero-parameter-matched': {
    model: 'V3 H8',
    allocatedParameters: 926,
    gradientReachableParameters: 62,
    historyInputs: false,
    evaluationTransform: 'identity',
  },
  'v3-h8-state-reset-before-query': {
    model: 'V3 H8 primary frozen checkpoint',
    allocatedParameters: 926,
    gradientReachableParameters: 926,
    evaluationTransform: 'clear all episode history immediately before query',
  },
  'v3-h8-cue-ablated': {
    model: 'V3 H8 primary frozen checkpoint',
    allocatedParameters: 926,
    gradientReachableParameters: 926,
    evaluationTransform: 'replace the cue bit with its seed-derived cue-profile covariate',
  },
  'v3-h8-fixed-tap-derangement': {
    model: 'V3 H8 primary frozen checkpoint',
    allocatedParameters: 926,
    gradientReachableParameters: 926,
    evaluationTransform: 'cyclically map each valid tap t to source tap (t+1) mod validTapCount',
  },
  'v3-h8-target-shuffled': {
    model: 'V3 H8',
    allocatedParameters: 926,
    gradientReachableParameters: 926,
    trainingTargetTransform:
      'fault-seed Fisher-Yates permutation of the complete ordered training target vector',
    evaluationTransform: 'identity task with true target',
  },
  'v2-h8': {
    model: 'V2 H8',
    allocatedParameters: 98,
    gradientReachableParameters: 62,
    trainingTransform: 'clear temporal context at every episode boundary',
    evaluationTransform: 'clear temporal context per twin with discardPending(true)',
  },
  'current5-logistic': {
    model: 'five-current-input online logistic RMSProp control',
    allocatedParameters: 6,
    gradientReachableParameters: 6,
    evaluationTransform: 'frozen parameters; present query only',
  },
  persistence: {
    model: 'episode-local persistence control',
    episodeResetPrediction: 0.5,
    evaluationFeedbackCount: 0,
  },
  'ewma-008': {
    model: 'episode-local EWMA control',
    alpha: EWMA_ALPHA,
    episodeResetPrediction: 0.5,
    evaluationFeedbackCount: 0,
  },
  'constant-05': { model: 'constant', prediction: 0.5 },
  'causal-oracle': { model: 'causal oracle', predictionLaw: 'prediction equals soft target' },
});

type QueryBit = 0 | 1;
type TwinRelation = 'match' | 'mismatch';
type EcologyTemporalSeedRole = 'mechanism-development' | 'fixed-configuration-validation';

interface RequiredEcologyInput extends TsotchkeEcologyPredictorV3Input {
  biomassDepletion: number;
  metabolicDepletion: number;
  crowding: number;
  chaos: number;
  thermalStress: number;
}

interface TemporalSequence {
  priorInputs: readonly RequiredEcologyInput[];
  queryInput: RequiredEcologyInput;
  cueBit: QueryBit;
  target: 0.1 | 0.9;
  cueChannel: number;
}

interface TemporalTaskProfile {
  cueChannel: number;
  cueCovariates: readonly number[];
  queryCovariates: readonly number[];
  neutralCovariates: readonly (readonly number[])[];
}

interface TemporalRoleConfiguration {
  role: EcologyTemporalSeedRole;
  modelSeeds: readonly number[];
  taskSeeds: readonly number[];
}

interface TrainingEpisode {
  sequence: TemporalSequence;
}

interface OnlineLogisticSnapshot {
  weights: number[];
  bias: number;
  rms: number[];
  rmsBias: number;
  updateCount: number;
}

interface FrozenModelBundle {
  primary: TsotchkeEcologyPredictorV3Snapshot;
  historyZero: TsotchkeEcologyPredictorV3Snapshot;
  targetShuffled: TsotchkeEcologyPredictorV3Snapshot;
  v2: TsotchkeEcologyPredictorV2Snapshot;
  logistic: OnlineLogisticSnapshot;
  trainingReceipt: EcologyTemporalTrainingReceipt;
  modelHashes: Readonly<Record<EcologyTemporalArmId, string>>;
}

interface TwinEvaluation {
  relation: TwinRelation;
  cueBit: QueryBit;
  target: 0.1 | 0.9;
  prediction: number;
  squaredError: number;
  crossEntropy: number;
  queryInputSha256: string;
  scheduleSha256: string;
}

interface ContrastDraft {
  controlArmId: (typeof ECOLOGY_TEMPORAL_CONTROL_ARMS)[number];
  pairedRowCount: number;
  meanSseGain: number;
  modelMeanGains: readonly number[];
  medianModelGain: number;
  delayMeanGains: Readonly<Record<EcologyTemporalDelay, number>>;
  oneSidedSignTestPValue: number;
  bootstrap99Lower: number;
  worstModelGain: number;
}

export interface EcologyTemporalTrainingReceipt {
  trainingEpochs: number;
  taskSeedCount: number;
  episodeCountPerAdaptiveArm: number;
  labeledObservationCountPerAdaptiveArm: number;
  discardedPreQueryForecastCountPerHistoryArm: number;
  forecastBeforeLabel: true;
  taskSeedFamilySha256: string;
  targetShuffleSeedSha256: string;
  targetShufflePermutationSha256: string;
  targetShuffleSameLabelFraction: number;
}

export interface EcologyTemporalRowMetrics {
  meanSquaredError: number;
  meanCrossEntropy: number;
  twinPredictionMargin: number;
  orderingCorrect: 0 | 1;
}

export interface EcologyTemporalDevelopmentRow {
  schemaVersion: 1;
  developmentOnly: true;
  claimAllowed: false;
  seedRole: EcologyTemporalSeedRole;
  modelSeed: number;
  modelSeedSha256: string;
  taskSeed: number;
  taskSeedSha256: string;
  taskProfileSha256: string;
  delay: EcologyTemporalDelay;
  neutralFrameCount: 1 | 7 | 15;
  queryBit: QueryBit;
  cueChannel: number;
  armId: EcologyTemporalArmId;
  modelFamily: 'v3-neural' | 'v2-neural' | 'online-logistic' | 'state-baseline' | 'oracle';
  allocatedParameterCount: number;
  gradientReachableParameterCount: number;
  frozenModelSha256: string;
  armProtocolSha256: string;
  taskProtocolSha256: string;
  terminalCurrentInputSha256: string;
  terminalCurrentInputsByteIdentical: true;
  evaluationWeightsFrozen: true;
  evaluationObservationCount: 0;
  discardedPreQueryForecasts: number;
  discardedQueryForecasts: 2;
  samples: readonly [TwinEvaluation, TwinEvaluation];
  metrics: EcologyTemporalRowMetrics;
}

export interface EcologyTemporalControlContrast {
  inferenceSeedRole: 'fixed-configuration-validation';
  controlArmId: (typeof ECOLOGY_TEMPORAL_CONTROL_ARMS)[number];
  pairedRowCount: number;
  meanSseGain: number;
  medianModelGain: number;
  delayMeanGains: Readonly<Record<EcologyTemporalDelay, number>>;
  oneSidedSignTestPValue: number;
  holmAdjustedPValue: number;
  bootstrap99Lower: number;
  worstModelGain: number;
  passes: boolean;
}

export interface EcologyTemporalAdvancementGate {
  passed: boolean;
  thresholds: typeof ECOLOGY_TEMPORAL_GATE_THRESHOLDS;
  observed: {
    minimumControlMeanSseGain: number;
    minimumControlMedianModelGain: number;
    minimumDelayMeanSseGain: number;
    meanTwinMargin: number;
    orderingRate: number;
    maximumHolmAdjustedPValue: number;
    minimumBootstrap99Lower: number;
    worstModelGain: number;
    rowsFilteredByOutcome: 0;
  };
  failedCriteria: readonly string[];
}

export interface EcologyTemporalDevelopmentSummary {
  schemaVersion: 1;
  studyId: 'tsotchke-ecology-temporal-identifiability-phase-b-development-v1';
  developmentOnly: true;
  claimAllowed: false;
  conclusion:
    | 'development-gate-passed-confirmatory-protocol-still-required'
    | 'development-gate-failed-no-advancement';
  trainingEpochs: number;
  trainingTaskSeedCount: number;
  modelSeedCount: number;
  evaluationTaskSeedCount: number;
  roleCount: number;
  inferenceScope: 'fixed-configuration-validation-only';
  inferenceRowCount: number;
  delayCount: 3;
  armCount: number;
  rowCount: number;
  analyticFloors: {
    presentOnlyMeanSquaredError: 0.16;
    presentOnlyMeanCrossEntropy: number;
    causalOracleMeanSquaredError: 0;
    causalOracleMeanCrossEntropy: number;
  };
  targetShuffle: {
    method: 'fault-seed-fisher-yates-permutation';
    seedSha256: string;
    permutationSha256: string;
    sameLabelFraction: number;
  };
  taskProfileUniqueness: {
    configuredTaskSeedCount: number;
    uniqueTaskProfileCount: number;
    allTaskProfilesUnique: true;
    profileFamilySha256: string;
  };
  retention: {
    configuredRows: number;
    retainedRows: number;
    rowsFilteredByOutcome: 0;
  };
  seedFamiliesSha256: string;
  configurationSha256: string;
  rowsSha256: string;
  pairedControlContrasts: readonly EcologyTemporalControlContrast[];
  advancementGate: EcologyTemporalAdvancementGate;
}

export interface EcologyTemporalDevelopmentStudy {
  summary: EcologyTemporalDevelopmentSummary;
  rows: readonly EcologyTemporalDevelopmentRow[];
}

export interface RunEcologyTemporalDevelopmentOptions {
  trainingTaskSeeds?: readonly number[];
  taskSelectionSeeds?: readonly number[];
  taskValidationSeeds?: readonly number[];
  modelDevelopmentSeeds?: readonly number[];
  modelValidationSeeds?: readonly number[];
  targetShuffleSeed?: number;
  trainingEpochs?: number;
  bootstrapReplicates?: number;
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError('temporal development JSON rejects non-finite numbers');
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
  throw new TypeError(`temporal development JSON does not support ${typeof value}`);
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function hashCanonical(value: unknown): string {
  return sha256(canonicalJson(value));
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

function counterUnit(seed: number, domain: number, index: number): number {
  return mix32(seed ^ domain ^ Math.imul(index + 1, 0x9e37_79b1)) / 0x1_0000_0000;
}

function clampProbability(value: number): number {
  return Math.max(LOG_EPSILON, Math.min(1 - LOG_EPSILON, value));
}

function crossEntropy(target: number, prediction: number): number {
  const bounded = clampProbability(prediction);
  return -(target * Math.log(bounded) + (1 - target) * Math.log(1 - bounded));
}

function mean(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('mean requires at least one value');
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('median requires at least one value');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function inputVector(input: RequiredEcologyInput): readonly number[] {
  return [
    input.biomassDepletion,
    input.metabolicDepletion,
    input.crowding,
    input.chaos,
    input.thermalStress,
  ];
}

function inputFromVector(vector: readonly number[]): RequiredEcologyInput {
  return {
    biomassDepletion: vector[0] ?? 0,
    metabolicDepletion: vector[1] ?? 0,
    crowding: vector[2] ?? 0,
    chaos: vector[3] ?? 0,
    thermalStress: vector[4] ?? 0,
  };
}

function inputsByteIdentical(left: RequiredEcologyInput, right: RequiredEcologyInput): boolean {
  const leftBytes = new Uint8Array(Float64Array.from(inputVector(left)).buffer);
  const rightBytes = new Uint8Array(Float64Array.from(inputVector(right)).buffer);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

function cueChannelFor(taskSeed: number): number {
  return mix32(taskSeed ^ 0x5a17_3c9d) % CURRENT_INPUT_COUNT;
}

function boundedProfileCovariate(taskSeed: number, domain: number, index: number): number {
  return 0.15 + 0.7 * counterUnit(taskSeed, domain, index);
}

function createTemporalTaskProfile(taskSeed: number): TemporalTaskProfile {
  const cueCovariates = Array.from({ length: CURRENT_INPUT_COUNT }, (_, index) =>
    boundedProfileCovariate(taskSeed, 0x2c11_0001, index),
  );
  const queryCovariates = Array.from({ length: CURRENT_INPUT_COUNT }, (_, index) =>
    boundedProfileCovariate(taskSeed, 0x2c11_0002, index),
  );
  const neutralCovariates = Array.from(
    { length: TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS - 1 },
    (_, frame) =>
      Array.from({ length: CURRENT_INPUT_COUNT }, (_, feature) =>
        boundedProfileCovariate(taskSeed, 0x2c11_1000 ^ Math.imul(frame + 1, 0x9e37_79b1), feature),
      ),
  );
  return {
    cueChannel: cueChannelFor(taskSeed),
    cueCovariates,
    queryCovariates,
    neutralCovariates,
  };
}

function taskProfileHashMaterial(taskSeed: number): TemporalTaskProfile {
  // The seed itself is deliberately absent: uniqueness must come from generated task structure.
  return createTemporalTaskProfile(taskSeed);
}

function createTemporalSequence(
  taskSeed: number,
  delay: EcologyTemporalDelay,
  queryBit: QueryBit,
  relation: TwinRelation,
  cueAblated = false,
): TemporalSequence {
  const cueBit = (relation === 'match' ? queryBit : 1 - queryBit) as QueryBit;
  const profile = createTemporalTaskProfile(taskSeed);
  const cueChannel = profile.cueChannel;
  const cueVector = [...profile.cueCovariates];
  cueVector[cueChannel] = cueAblated ? (profile.cueCovariates[cueChannel] as number) : cueBit;
  const queryVector = [...profile.queryCovariates];
  queryVector[cueChannel] = queryBit;
  const priorInputs = [
    inputFromVector(cueVector),
    ...profile.neutralCovariates
      .slice(0, delay - 1)
      .map((neutralVector) => inputFromVector(neutralVector)),
  ];
  return {
    priorInputs,
    queryInput: inputFromVector(queryVector),
    cueBit,
    target: relation === 'match' ? 0.9 : 0.1,
    cueChannel,
  };
}

class OnlineLogistic5 {
  private readonly weights = new Float64Array(CURRENT_INPUT_COUNT);
  private readonly rms = new Float64Array(CURRENT_INPUT_COUNT);
  private bias = 0;
  private rmsBias = 0;
  private updateCount = 0;

  constructor(seedOrSnapshot: number | OnlineLogisticSnapshot) {
    if (typeof seedOrSnapshot === 'number') {
      assertPhaseBDevelopmentSeed(seedOrSnapshot);
      const scale = Math.sqrt(6 / (CURRENT_INPUT_COUNT + 1));
      for (let index = 0; index < CURRENT_INPUT_COUNT; index++) {
        this.weights[index] = (counterUnit(seedOrSnapshot, 0x10_9157, index) * 2 - 1) * scale;
      }
      return;
    }
    this.weights.set(seedOrSnapshot.weights);
    this.bias = seedOrSnapshot.bias;
    this.rms.set(seedOrSnapshot.rms);
    this.rmsBias = seedOrSnapshot.rmsBias;
    this.updateCount = seedOrSnapshot.updateCount;
  }

  predict(input: RequiredEcologyInput): number {
    const vector = inputVector(input);
    let logit = this.bias;
    for (let index = 0; index < CURRENT_INPUT_COUNT; index++) {
      logit += (this.weights[index] ?? 0) * (vector[index] ?? 0);
    }
    return logit >= 0 ? 1 / (1 + Math.exp(-logit)) : Math.exp(logit) / (1 + Math.exp(logit));
  }

  train(input: RequiredEcologyInput, target: number): void {
    const vector = inputVector(input);
    const gradientScale = this.predict(input) - target;
    let normSquared = gradientScale * gradientScale;
    for (const value of vector) normSquared += gradientScale * gradientScale * value * value;
    const norm = Math.sqrt(normSquared);
    const clip = norm > 1 ? 1 / norm : 1;
    for (let index = 0; index < CURRENT_INPUT_COUNT; index++) {
      const gradient = gradientScale * (vector[index] ?? 0) * clip;
      const accumulator = 0.95 * (this.rms[index] ?? 0) + 0.05 * gradient * gradient;
      this.rms[index] = accumulator;
      this.weights[index] = Math.max(
        -8,
        Math.min(
          8,
          (this.weights[index] ?? 0) - (0.006 * gradient) / (Math.sqrt(accumulator) + 1e-8),
        ),
      );
    }
    const biasGradient = gradientScale * clip;
    this.rmsBias = 0.95 * this.rmsBias + 0.05 * biasGradient * biasGradient;
    this.bias = Math.max(
      -8,
      Math.min(8, this.bias - (0.006 * biasGradient) / (Math.sqrt(this.rmsBias) + 1e-8)),
    );
    this.updateCount++;
  }

  snapshot(): OnlineLogisticSnapshot {
    return {
      weights: Array.from(this.weights),
      bias: this.bias,
      rms: Array.from(this.rms),
      rmsBias: this.rmsBias,
      updateCount: this.updateCount,
    };
  }
}

function trainV3Episode(
  predictor: TsotchkeEcologyPredictorV3,
  sequence: TemporalSequence,
  target: number,
): void {
  predictor.resetEpisode();
  for (const input of sequence.priorInputs) {
    predictor.forecast(input);
    if (!predictor.discardPending()) throw new Error('V3 pre-query forecast did not discard');
  }
  const query = predictor.forecast(sequence.queryInput);
  predictor.observe({ token: query.token, outcome: target });
}

function trainV2Episode(predictor: TsotchkeEcologyPredictorV2, sequence: TemporalSequence): void {
  // Match evaluation exactly: learned parameters persist, but temporal outcome/residual state may
  // never leak from a preceding episode into this twin.
  predictor.discardPending(true);
  for (const input of sequence.priorInputs) {
    predictor.forecast(input);
    if (!predictor.discardPending()) throw new Error('V2 pre-query forecast did not discard');
  }
  const query = predictor.forecast(sequence.queryInput);
  predictor.observe({ token: query.token, outcome: sequence.target });
}

function createTrainingEpisodes(
  taskSeeds: readonly number[],
  trainingEpochs: number,
): readonly TrainingEpisode[] {
  const episodes: TrainingEpisode[] = [];
  for (let epoch = 0; epoch < trainingEpochs; epoch++) {
    for (let taskIndex = 0; taskIndex < taskSeeds.length; taskIndex++) {
      const taskSeed = taskSeeds[taskIndex] as number;
      for (const delay of ECOLOGY_TEMPORAL_DELAYS) {
        for (const queryBit of [0, 1] as const) {
          const relations: readonly TwinRelation[] =
            (epoch + taskIndex + queryBit + delay) % 2 === 0
              ? ['match', 'mismatch']
              : ['mismatch', 'match'];
          for (const relation of relations) {
            episodes.push({
              sequence: createTemporalSequence(taskSeed, delay, queryBit, relation),
            });
          }
        }
      }
    }
  }
  return episodes;
}

function shuffledTrainingTargets(
  episodes: readonly TrainingEpisode[],
  targetShuffleSeed: number,
): readonly (0.1 | 0.9)[] {
  const targets = episodes.map((episode) => episode.sequence.target);
  for (let upper = targets.length - 1, draw = 0; upper > 0; upper--, draw++) {
    const selected = Math.floor(counterUnit(targetShuffleSeed, 0x5f17_7e11, draw) * (upper + 1));
    const held = targets[upper] as 0.1 | 0.9;
    targets[upper] = targets[selected] as 0.1 | 0.9;
    targets[selected] = held;
  }
  return targets;
}

function trainModelBundle(
  modelSeed: number,
  taskSeeds: readonly number[],
  trainingEpochs: number,
  targetShuffleSeed: number,
): FrozenModelBundle {
  const primary = new TsotchkeEcologyPredictorV3(modelSeed, { tier: 8 });
  const historyZero = new TsotchkeEcologyPredictorV3(modelSeed, {
    tier: 8,
    historyInputs: false,
  });
  const targetShuffled = new TsotchkeEcologyPredictorV3(modelSeed, { tier: 8 });
  const v2 = new TsotchkeEcologyPredictorV2(modelSeed, { tier: 8 });
  const logistic = new OnlineLogistic5(modelSeed);
  const episodes = createTrainingEpisodes(taskSeeds, trainingEpochs);
  const shuffledTargets = shuffledTrainingTargets(episodes, targetShuffleSeed);
  let discardedPreQueryForecastCount = 0;

  for (let episodeIndex = 0; episodeIndex < episodes.length; episodeIndex++) {
    const sequence = (episodes[episodeIndex] as TrainingEpisode).sequence;
    trainV3Episode(primary, sequence, sequence.target);
    trainV3Episode(historyZero, sequence, sequence.target);
    trainV3Episode(targetShuffled, sequence, shuffledTargets[episodeIndex] as 0.1 | 0.9);
    trainV2Episode(v2, sequence);
    logistic.train(sequence.queryInput, sequence.target);
    discardedPreQueryForecastCount += sequence.priorInputs.length;
  }

  const primarySnapshot = primary.snapshot();
  const historyZeroSnapshot = historyZero.snapshot();
  const targetShuffledSnapshot = targetShuffled.snapshot();
  const v2Snapshot = v2.snapshot();
  const logisticSnapshot = logistic.snapshot();
  const trainingReceipt: EcologyTemporalTrainingReceipt = {
    trainingEpochs,
    taskSeedCount: taskSeeds.length,
    episodeCountPerAdaptiveArm: episodes.length,
    labeledObservationCountPerAdaptiveArm: episodes.length,
    discardedPreQueryForecastCountPerHistoryArm: discardedPreQueryForecastCount,
    forecastBeforeLabel: true,
    taskSeedFamilySha256: hashCanonical(taskSeeds),
    targetShuffleSeedSha256: sha256(
      `cqm/phase-b/temporal-target-shuffle-seed/v1/${targetShuffleSeed}`,
    ),
    targetShufflePermutationSha256: hashCanonical(shuffledTargets),
    targetShuffleSameLabelFraction:
      episodes.filter((episode, index) => episode.sequence.target === shuffledTargets[index])
        .length / episodes.length,
  };
  const primaryHash = hashCanonical(primarySnapshot);
  const modelHashes: Readonly<Record<EcologyTemporalArmId, string>> = Object.freeze({
    'v3-h8-identity-history': primaryHash,
    'v3-h8-history-zero-parameter-matched': hashCanonical(historyZeroSnapshot),
    'v3-h8-state-reset-before-query': primaryHash,
    'v3-h8-cue-ablated': primaryHash,
    'v3-h8-fixed-tap-derangement': primaryHash,
    'v3-h8-target-shuffled': hashCanonical(targetShuffledSnapshot),
    'v2-h8': hashCanonical(v2Snapshot),
    'current5-logistic': hashCanonical(logisticSnapshot),
    persistence: hashCanonical({ episodeResetPrediction: 0.5 }),
    'ewma-008': hashCanonical({ episodeResetPrediction: 0.5, alpha: EWMA_ALPHA }),
    'constant-05': hashCanonical({ prediction: 0.5 }),
    'causal-oracle': hashCanonical({ law: 'prediction-equals-soft-target' }),
  });
  return {
    primary: primarySnapshot,
    historyZero: historyZeroSnapshot,
    targetShuffled: targetShuffledSnapshot,
    v2: v2Snapshot,
    logistic: logisticSnapshot,
    trainingReceipt,
    modelHashes,
  };
}

function derangeValidHistoryTaps(predictor: TsotchkeEcologyPredictorV3): void {
  const snapshot = predictor.snapshot();
  const validCount = Math.min(
    snapshot.counters.episodeForecastCount,
    TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS,
  );
  if (validCount < 2) throw new Error('tap derangement requires at least two valid taps');
  const sourceRing = [...snapshot.history.ring];
  const targetRing = [...sourceRing];
  const slotForTap = (tap: number): number =>
    (snapshot.history.cursor - 1 - tap + TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS * 2) %
    TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
  for (let targetTap = 0; targetTap < validCount; targetTap++) {
    const sourceTap = (targetTap + 1) % validCount;
    const targetBase = slotForTap(targetTap) * CURRENT_INPUT_COUNT;
    const sourceBase = slotForTap(sourceTap) * CURRENT_INPUT_COUNT;
    for (let feature = 0; feature < CURRENT_INPUT_COUNT; feature++) {
      targetRing[targetBase + feature] = sourceRing[sourceBase + feature] as number;
    }
  }
  snapshot.history.ring = targetRing;
  predictor.restore(snapshot);
}

function evaluateV3Twin(
  snapshot: TsotchkeEcologyPredictorV3Snapshot,
  sequence: TemporalSequence,
  mode: 'identity' | 'state-reset' | 'tap-derangement',
): number {
  const predictor = TsotchkeEcologyPredictorV3.fromSnapshot(snapshot);
  predictor.resetEpisode();
  for (const input of sequence.priorInputs) {
    predictor.forecast(input);
    if (!predictor.discardPending())
      throw new Error('V3 evaluation pre-query token was not discarded');
  }
  if (mode === 'state-reset') predictor.resetEpisode();
  if (mode === 'tap-derangement') derangeValidHistoryTaps(predictor);
  const query = predictor.forecast(sequence.queryInput);
  if (!predictor.discardPending()) throw new Error('V3 evaluation query token was not discarded');
  return query.prediction;
}

function evaluateV2Twin(
  snapshot: TsotchkeEcologyPredictorV2Snapshot,
  sequence: TemporalSequence,
): number {
  const predictor = TsotchkeEcologyPredictorV2.fromSnapshot(snapshot);
  // V2 has no episode object, but its discard boundary explicitly supports clearing temporal state
  // without touching learned parameters. Each twin therefore starts from the same empty context.
  predictor.discardPending(true);
  for (const input of sequence.priorInputs) {
    predictor.forecast(input);
    if (!predictor.discardPending())
      throw new Error('V2 evaluation pre-query token was not discarded');
  }
  const query = predictor.forecast(sequence.queryInput);
  if (!predictor.discardPending()) throw new Error('V2 evaluation query token was not discarded');
  return query.prediction;
}

function modelFamilyFor(armId: EcologyTemporalArmId): EcologyTemporalDevelopmentRow['modelFamily'] {
  if (armId.startsWith('v3-')) return 'v3-neural';
  if (armId === 'v2-h8') return 'v2-neural';
  if (armId === 'current5-logistic') return 'online-logistic';
  if (armId === 'causal-oracle') return 'oracle';
  return 'state-baseline';
}

function parameterCountsFor(armId: EcologyTemporalArmId): {
  allocated: number;
  gradientReachable: number;
} {
  if (armId.startsWith('v3-')) {
    const allocated = tsotchkeEcologyPredictorV3ParameterCount(8);
    return {
      allocated,
      // With 96 history inputs identically zero, only 5*8 input weights, 8 hidden biases,
      // 5 skip weights, 8 output weights, and the output bias can receive a gradient.
      gradientReachable:
        armId === 'v3-h8-history-zero-parameter-matched' ? 5 * 8 + 8 + 5 + 8 + 1 : allocated,
    };
  }
  if (armId === 'v2-h8') {
    // Reset-per-episode V2 has five reachable current inputs and four identically-zero temporal
    // inputs: 5*8 + 8 + 5 + 8 + 1 = 62 of 98 allocated scalars.
    return { allocated: 98, gradientReachable: 62 };
  }
  if (armId === 'current5-logistic') return { allocated: 6, gradientReachable: 6 };
  return { allocated: 0, gradientReachable: 0 };
}

function predictTwin(
  armId: EcologyTemporalArmId,
  bundle: FrozenModelBundle,
  sequence: TemporalSequence,
): number {
  switch (armId) {
    case 'v3-h8-identity-history':
      return evaluateV3Twin(bundle.primary, sequence, 'identity');
    case 'v3-h8-history-zero-parameter-matched':
      return evaluateV3Twin(bundle.historyZero, sequence, 'identity');
    case 'v3-h8-state-reset-before-query':
      return evaluateV3Twin(bundle.primary, sequence, 'state-reset');
    case 'v3-h8-cue-ablated':
      return evaluateV3Twin(bundle.primary, sequence, 'identity');
    case 'v3-h8-fixed-tap-derangement':
      return evaluateV3Twin(bundle.primary, sequence, 'tap-derangement');
    case 'v3-h8-target-shuffled':
      return evaluateV3Twin(bundle.targetShuffled, sequence, 'identity');
    case 'v2-h8':
      return evaluateV2Twin(bundle.v2, sequence);
    case 'current5-logistic':
      return new OnlineLogistic5(bundle.logistic).predict(sequence.queryInput);
    case 'persistence':
      return 0.5;
    case 'ewma-008':
      return 0.5;
    case 'constant-05':
      return 0.5;
    case 'causal-oracle':
      return sequence.target;
  }
}

function evaluateTwin(
  armId: EcologyTemporalArmId,
  bundle: FrozenModelBundle,
  taskSeed: number,
  delay: EcologyTemporalDelay,
  queryBit: QueryBit,
  relation: TwinRelation,
): TwinEvaluation {
  const sequence = createTemporalSequence(
    taskSeed,
    delay,
    queryBit,
    relation,
    armId === 'v3-h8-cue-ablated',
  );
  const prediction = predictTwin(armId, bundle, sequence);
  const residual = sequence.target - prediction;
  return {
    relation,
    cueBit: sequence.cueBit,
    target: sequence.target,
    prediction,
    squaredError: residual * residual,
    crossEntropy: crossEntropy(sequence.target, prediction),
    queryInputSha256: hashCanonical(inputVector(sequence.queryInput)),
    scheduleSha256: hashCanonical({
      taskSeed,
      delay,
      queryBit,
      relation,
      cueBit: sequence.cueBit,
      cueChannel: sequence.cueChannel,
      cueAblated: armId === 'v3-h8-cue-ablated',
      priorInputs: sequence.priorInputs.map(inputVector),
      queryInput: inputVector(sequence.queryInput),
    }),
  };
}

function runRow(
  role: EcologyTemporalSeedRole,
  modelSeed: number,
  taskSeed: number,
  delay: EcologyTemporalDelay,
  queryBit: QueryBit,
  armId: EcologyTemporalArmId,
  bundle: FrozenModelBundle,
): EcologyTemporalDevelopmentRow {
  const parameterCounts = parameterCountsFor(armId);
  const cueAblated = armId === 'v3-h8-cue-ablated';
  const matchSequence = createTemporalSequence(taskSeed, delay, queryBit, 'match', cueAblated);
  const mismatchSequence = createTemporalSequence(
    taskSeed,
    delay,
    queryBit,
    'mismatch',
    cueAblated,
  );
  if (!inputsByteIdentical(matchSequence.queryInput, mismatchSequence.queryInput)) {
    throw new Error('counterbalanced twins do not have byte-identical terminal current inputs');
  }
  const match = evaluateTwin(armId, bundle, taskSeed, delay, queryBit, 'match');
  const mismatch = evaluateTwin(armId, bundle, taskSeed, delay, queryBit, 'mismatch');
  if (match.queryInputSha256 !== mismatch.queryInputSha256) {
    throw new Error('counterbalanced twin terminal-input hashes differ');
  }
  const meanSquaredError = (match.squaredError + mismatch.squaredError) / 2;
  const meanCrossEntropy = (match.crossEntropy + mismatch.crossEntropy) / 2;
  const twinPredictionMargin = match.prediction - mismatch.prediction;
  return {
    schemaVersion: 1,
    developmentOnly: true,
    claimAllowed: false,
    seedRole: role,
    modelSeed,
    modelSeedSha256: sha256(`cqm/phase-b/temporal-model-seed/v1/${modelSeed}`),
    taskSeed,
    taskSeedSha256: sha256(`cqm/phase-b/temporal-task-seed/v1/${taskSeed}`),
    taskProfileSha256: hashCanonical(taskProfileHashMaterial(taskSeed)),
    delay,
    neutralFrameCount: (delay - 1) as 1 | 7 | 15,
    queryBit,
    cueChannel: cueChannelFor(taskSeed),
    armId,
    modelFamily: modelFamilyFor(armId),
    allocatedParameterCount: parameterCounts.allocated,
    gradientReachableParameterCount: parameterCounts.gradientReachable,
    frozenModelSha256: bundle.modelHashes[armId],
    armProtocolSha256: hashCanonical(TEMPORAL_ARM_PROTOCOLS[armId]),
    taskProtocolSha256: hashCanonical({
      protocol: TEMPORAL_TASK_PROTOCOL,
      delay,
      neutralFrameCount: delay - 1,
    }),
    terminalCurrentInputSha256: match.queryInputSha256,
    terminalCurrentInputsByteIdentical: true,
    evaluationWeightsFrozen: true,
    evaluationObservationCount: 0,
    discardedPreQueryForecasts: delay * 2,
    discardedQueryForecasts: 2,
    samples: [match, mismatch],
    metrics: {
      meanSquaredError,
      meanCrossEntropy,
      twinPredictionMargin,
      orderingCorrect: twinPredictionMargin > 0 ? 1 : 0,
    },
  };
}

function rowKey(row: EcologyTemporalDevelopmentRow): string {
  return `${row.seedRole}/${row.modelSeed}/${row.taskSeed}/${row.delay}/${row.queryBit}`;
}

function logChoose(n: number, k: number): number {
  const reduced = Math.min(k, n - k);
  let result = 0;
  for (let index = 1; index <= reduced; index++) {
    result += Math.log(n - reduced + index) - Math.log(index);
  }
  return result;
}

/** Exact upper-tail P[X >= observed positive signs] under X ~ Binomial(nonTies, 0.5). */
export function exactOneSidedSignTestPValue(values: readonly number[]): number {
  const positive = values.filter((value) => value > 0).length;
  const negative = values.filter((value) => value < 0).length;
  const n = positive + negative;
  if (n === 0) return 1;
  const logs: number[] = [];
  for (let successes = positive; successes <= n; successes++) {
    logs.push(logChoose(n, successes) - n * Math.log(2));
  }
  const maximum = Math.max(...logs);
  return Math.min(
    1,
    Math.exp(maximum) * logs.reduce((sum, value) => sum + Math.exp(value - maximum), 0),
  );
}

function bootstrap99Lower(
  modelMeanGains: readonly number[],
  controlArmId: EcologyTemporalArmId,
  replicateCount: number,
): number {
  const seed =
    Number.parseInt(sha256(`cqm/phase-b/temporal-bootstrap/v1/${controlArmId}`).slice(0, 8), 16) >>>
    0;
  const replicates: number[] = [];
  for (let replicate = 0; replicate < replicateCount; replicate++) {
    let total = 0;
    for (let draw = 0; draw < modelMeanGains.length; draw++) {
      const selected = Math.floor(
        counterUnit(seed, 0x7b00_7001 ^ replicate, draw) * modelMeanGains.length,
      );
      total += modelMeanGains[selected] as number;
    }
    replicates.push(total / modelMeanGains.length);
  }
  replicates.sort((left, right) => left - right);
  return replicates[Math.floor(0.01 * replicateCount)] as number;
}

function draftContrasts(
  rows: readonly EcologyTemporalDevelopmentRow[],
  bootstrapReplicates: number,
): ContrastDraft[] {
  const primary = new Map(
    rows.filter((row) => row.armId === 'v3-h8-identity-history').map((row) => [rowKey(row), row]),
  );
  return ECOLOGY_TEMPORAL_CONTROL_ARMS.map((controlArmId) => {
    const gains: number[] = [];
    const byModel = new Map<string, number[]>();
    const byDelay = new Map<EcologyTemporalDelay, number[]>();
    for (const control of rows.filter((row) => row.armId === controlArmId)) {
      const identity = primary.get(rowKey(control));
      if (identity === undefined) throw new Error(`primary row missing for ${rowKey(control)}`);
      const gain = control.metrics.meanSquaredError - identity.metrics.meanSquaredError;
      gains.push(gain);
      const modelKey = `${control.seedRole}/${control.modelSeed}`;
      const modelGains = byModel.get(modelKey) ?? [];
      modelGains.push(gain);
      byModel.set(modelKey, modelGains);
      const delayGains = byDelay.get(control.delay) ?? [];
      delayGains.push(gain);
      byDelay.set(control.delay, delayGains);
    }
    const modelMeanGains = [...byModel.values()].map(mean);
    const delayMeanGains: Readonly<Record<EcologyTemporalDelay, number>> = {
      2: mean(byDelay.get(2) ?? []),
      8: mean(byDelay.get(8) ?? []),
      16: mean(byDelay.get(16) ?? []),
    };
    return {
      controlArmId,
      pairedRowCount: gains.length,
      meanSseGain: mean(gains),
      modelMeanGains,
      medianModelGain: median(modelMeanGains),
      delayMeanGains,
      // Model seeds, not correlated task/query rows, are the independent inferential units.
      oneSidedSignTestPValue: exactOneSidedSignTestPValue(modelMeanGains),
      bootstrap99Lower: bootstrap99Lower(modelMeanGains, controlArmId, bootstrapReplicates),
      worstModelGain: Math.min(...modelMeanGains),
    };
  });
}

function finalizeContrasts(drafts: readonly ContrastDraft[]): EcologyTemporalControlContrast[] {
  const ranked = [...drafts].sort(
    (left, right) =>
      left.oneSidedSignTestPValue - right.oneSidedSignTestPValue ||
      left.controlArmId.localeCompare(right.controlArmId),
  );
  const adjusted = new Map<EcologyTemporalArmId, number>();
  let runningMaximum = 0;
  for (let rank = 0; rank < ranked.length; rank++) {
    const draft = ranked[rank] as ContrastDraft;
    const candidate = Math.min(1, draft.oneSidedSignTestPValue * (ranked.length - rank));
    runningMaximum = Math.max(runningMaximum, candidate);
    adjusted.set(draft.controlArmId, runningMaximum);
  }
  return drafts.map((draft) => {
    const holmAdjustedPValue = adjusted.get(draft.controlArmId);
    if (holmAdjustedPValue === undefined) throw new Error('Holm correction lost a control');
    const passes =
      draft.meanSseGain >= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.meanSseGain &&
      draft.medianModelGain >= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.medianModelGain &&
      ECOLOGY_TEMPORAL_DELAYS.every(
        (delay) =>
          draft.delayMeanGains[delay] >= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.everyDelayMeanGain,
      ) &&
      holmAdjustedPValue < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.holmAdjustedPExclusiveMaximum &&
      draft.bootstrap99Lower > ECOLOGY_TEMPORAL_GATE_THRESHOLDS.bootstrap99LowerExclusiveMinimum &&
      draft.worstModelGain >= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.worstModelGain;
    return {
      inferenceSeedRole: 'fixed-configuration-validation',
      controlArmId: draft.controlArmId,
      pairedRowCount: draft.pairedRowCount,
      meanSseGain: draft.meanSseGain,
      medianModelGain: draft.medianModelGain,
      delayMeanGains: draft.delayMeanGains,
      oneSidedSignTestPValue: draft.oneSidedSignTestPValue,
      holmAdjustedPValue,
      bootstrap99Lower: draft.bootstrap99Lower,
      worstModelGain: draft.worstModelGain,
      passes,
    };
  });
}

function buildGate(
  rows: readonly EcologyTemporalDevelopmentRow[],
  contrasts: readonly EcologyTemporalControlContrast[],
): EcologyTemporalAdvancementGate {
  const primaryRows = rows.filter((row) => row.armId === 'v3-h8-identity-history');
  const minimumControlMeanSseGain = Math.min(...contrasts.map((contrast) => contrast.meanSseGain));
  const minimumControlMedianModelGain = Math.min(
    ...contrasts.map((contrast) => contrast.medianModelGain),
  );
  const minimumDelayMeanSseGain = Math.min(
    ...contrasts.flatMap((contrast) =>
      ECOLOGY_TEMPORAL_DELAYS.map((delay) => contrast.delayMeanGains[delay]),
    ),
  );
  const meanTwinMargin = mean(primaryRows.map((row) => row.metrics.twinPredictionMargin));
  const orderingRate = mean(primaryRows.map((row) => row.metrics.orderingCorrect));
  const maximumHolmAdjustedPValue = Math.max(
    ...contrasts.map((contrast) => contrast.holmAdjustedPValue),
  );
  const minimumBootstrap99Lower = Math.min(
    ...contrasts.map((contrast) => contrast.bootstrap99Lower),
  );
  const worstModelGain = Math.min(...contrasts.map((contrast) => contrast.worstModelGain));
  const failedCriteria: string[] = [];
  if (minimumControlMeanSseGain < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.meanSseGain)
    failedCriteria.push('mean-sse-gain');
  if (minimumControlMedianModelGain < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.medianModelGain)
    failedCriteria.push('median-model-gain');
  if (minimumDelayMeanSseGain < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.everyDelayMeanGain)
    failedCriteria.push('every-delay-mean-gain');
  if (meanTwinMargin < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.meanTwinMargin)
    failedCriteria.push('twin-margin');
  if (orderingRate < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.orderingRate)
    failedCriteria.push('ordering-rate');
  if (maximumHolmAdjustedPValue >= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.holmAdjustedPExclusiveMaximum)
    failedCriteria.push('holm-adjusted-p');
  if (minimumBootstrap99Lower <= ECOLOGY_TEMPORAL_GATE_THRESHOLDS.bootstrap99LowerExclusiveMinimum)
    failedCriteria.push('bootstrap-99-lower');
  if (worstModelGain < ECOLOGY_TEMPORAL_GATE_THRESHOLDS.worstModelGain)
    failedCriteria.push('worst-model-gain');
  return {
    passed: failedCriteria.length === 0 && contrasts.every((contrast) => contrast.passes),
    thresholds: ECOLOGY_TEMPORAL_GATE_THRESHOLDS,
    observed: {
      minimumControlMeanSseGain,
      minimumControlMedianModelGain,
      minimumDelayMeanSseGain,
      meanTwinMargin,
      orderingRate,
      maximumHolmAdjustedPValue,
      minimumBootstrap99Lower,
      worstModelGain,
      rowsFilteredByOutcome: 0,
    },
    failedCriteria,
  };
}

function normalizedSeedSubset(
  label: string,
  seeds: readonly number[],
  sealedFamilyName: string,
  sealedFamily: readonly number[],
): readonly number[] {
  if (seeds.length === 0) throw new RangeError(`${label} requires at least one seed`);
  const sorted = [...seeds].sort((left, right) => left - right);
  const allowed = new Set(sealedFamily);
  for (const seed of sorted) {
    assertPhaseBDevelopmentSeed(seed);
    if (!allowed.has(seed)) {
      throw new RangeError(`${label} seed ${seed} is outside sealed family ${sealedFamilyName}`);
    }
  }
  if (new Set(sorted).size !== sorted.length)
    throw new RangeError(`${label} contains duplicate seeds`);
  return Object.freeze(sorted);
}

/** Execute the sealed in-memory development matrix. This function performs no filesystem IO. */
export function runEcologyTemporalDevelopment(
  options: RunEcologyTemporalDevelopmentOptions = {},
): EcologyTemporalDevelopmentStudy {
  const trainingEpochs = options.trainingEpochs ?? DEFAULT_TRAINING_EPOCHS;
  const bootstrapReplicates = options.bootstrapReplicates ?? DEFAULT_BOOTSTRAP_REPLICATES;
  if (!Number.isSafeInteger(trainingEpochs) || trainingEpochs < 1 || trainingEpochs > 32) {
    throw new RangeError('temporal development trainingEpochs must be an integer in [1,32]');
  }
  if (
    !Number.isSafeInteger(bootstrapReplicates) ||
    bootstrapReplicates < 100 ||
    bootstrapReplicates > 100_000
  ) {
    throw new RangeError('temporal development bootstrapReplicates must be in [100,100000]');
  }

  const trainingTaskSeeds = normalizedSeedSubset(
    'training task family',
    options.trainingTaskSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskTrain,
    'predictorV3TaskTrain',
    PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskTrain,
  );
  const targetShuffleSeed =
    options.targetShuffleSeed ?? (PHASE_B_DEVELOPMENT_SEEDS.predictorV3Fault[0] as number);
  normalizedSeedSubset(
    'target-shuffle family',
    [targetShuffleSeed],
    'predictorV3Fault',
    PHASE_B_DEVELOPMENT_SEEDS.predictorV3Fault,
  );
  const roleConfigurations: readonly TemporalRoleConfiguration[] = [
    {
      role: 'mechanism-development',
      modelSeeds: normalizedSeedSubset(
        'development model family',
        options.modelDevelopmentSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelDevelopment,
        'predictorV3ModelDevelopment',
        PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelDevelopment,
      ),
      taskSeeds: normalizedSeedSubset(
        'task-selection family',
        options.taskSelectionSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskSelection,
        'predictorV3TaskSelection',
        PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskSelection,
      ),
    },
    {
      role: 'fixed-configuration-validation',
      modelSeeds: normalizedSeedSubset(
        'validation model family',
        options.modelValidationSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelValidation,
        'predictorV3ModelValidation',
        PHASE_B_DEVELOPMENT_SEEDS.predictorV3ModelValidation,
      ),
      taskSeeds: normalizedSeedSubset(
        'task-validation family',
        options.taskValidationSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskValidation,
        'predictorV3TaskValidation',
        PHASE_B_DEVELOPMENT_SEEDS.predictorV3TaskValidation,
      ),
    },
  ];
  assertDisjointPhaseBDevelopmentFamilies({
    trainingTaskSeeds,
    taskSelectionSeeds: roleConfigurations[0]?.taskSeeds ?? [],
    taskValidationSeeds: roleConfigurations[1]?.taskSeeds ?? [],
    modelDevelopmentSeeds: roleConfigurations[0]?.modelSeeds ?? [],
    modelValidationSeeds: roleConfigurations[1]?.modelSeeds ?? [],
    targetShuffleSeed: [targetShuffleSeed],
  });

  const configuredTaskSeeds = [
    ...new Set([
      ...trainingTaskSeeds,
      ...roleConfigurations.flatMap((configuration) => configuration.taskSeeds),
    ]),
  ].sort((left, right) => left - right);
  const taskProfileEntries = configuredTaskSeeds.map((taskSeed) => ({
    taskSeedSha256: sha256(`cqm/phase-b/temporal-task-profile-seed/v1/${taskSeed}`),
    taskProfileSha256: hashCanonical(taskProfileHashMaterial(taskSeed)),
  }));
  const uniqueTaskProfileCount = new Set(taskProfileEntries.map((entry) => entry.taskProfileSha256))
    .size;
  if (uniqueTaskProfileCount !== configuredTaskSeeds.length) {
    throw new Error(
      `temporal task profiles are not unique: ${uniqueTaskProfileCount} !== ${configuredTaskSeeds.length}`,
    );
  }
  const taskProfileUniqueness = {
    configuredTaskSeedCount: configuredTaskSeeds.length,
    uniqueTaskProfileCount,
    allTaskProfilesUnique: true as const,
    profileFamilySha256: hashCanonical(taskProfileEntries),
  };

  const rows: EcologyTemporalDevelopmentRow[] = [];
  const trainingReceipts: {
    role: EcologyTemporalSeedRole;
    modelSeed: number;
    receipt: EcologyTemporalTrainingReceipt;
  }[] = [];
  for (const roleConfiguration of roleConfigurations) {
    for (const modelSeed of roleConfiguration.modelSeeds) {
      const bundle = trainModelBundle(
        modelSeed,
        trainingTaskSeeds,
        trainingEpochs,
        targetShuffleSeed,
      );
      trainingReceipts.push({
        role: roleConfiguration.role,
        modelSeed,
        receipt: bundle.trainingReceipt,
      });
      for (const taskSeed of roleConfiguration.taskSeeds) {
        for (const delay of ECOLOGY_TEMPORAL_DELAYS) {
          for (const queryBit of [0, 1] as const) {
            for (const armId of ECOLOGY_TEMPORAL_ARMS) {
              rows.push(
                runRow(roleConfiguration.role, modelSeed, taskSeed, delay, queryBit, armId, bundle),
              );
            }
          }
        }
      }
    }
  }

  const modelSeedCount = roleConfigurations.reduce(
    (total, configuration) => total + configuration.modelSeeds.length,
    0,
  );
  const expectedRows = roleConfigurations.reduce(
    (total, configuration) =>
      total +
      configuration.modelSeeds.length *
        configuration.taskSeeds.length *
        ECOLOGY_TEMPORAL_DELAYS.length *
        2 *
        ECOLOGY_TEMPORAL_ARMS.length,
    0,
  );
  if (rows.length !== expectedRows)
    throw new Error(`temporal row matrix mismatch: ${rows.length} !== ${expectedRows}`);
  const targetShuffleReceipt = trainingReceipts[0]?.receipt;
  if (targetShuffleReceipt === undefined) throw new Error('temporal training receipt is absent');
  if (
    trainingReceipts.some(
      ({ receipt }) =>
        receipt.targetShuffleSeedSha256 !== targetShuffleReceipt.targetShuffleSeedSha256 ||
        receipt.targetShufflePermutationSha256 !==
          targetShuffleReceipt.targetShufflePermutationSha256 ||
        receipt.targetShuffleSameLabelFraction !==
          targetShuffleReceipt.targetShuffleSameLabelFraction,
    )
  ) {
    throw new Error('target-shuffle control changed across model seeds');
  }

  // Mechanism-development/selection rows remain visible, but only the locked validation role may
  // affect inferential contrasts or the advancement decision.
  const inferenceRows = rows.filter((row) => row.seedRole === 'fixed-configuration-validation');
  const contrasts = finalizeContrasts(draftContrasts(inferenceRows, bootstrapReplicates));
  const advancementGate = buildGate(inferenceRows, contrasts);
  const seedFamilies = {
    trainingTaskSeeds,
    targetShuffleSeed,
    roles: roleConfigurations,
  };
  const configuration = {
    schemaVersion: ECOLOGY_TEMPORAL_DEVELOPMENT_SCHEMA_VERSION,
    taskProtocol: TEMPORAL_TASK_PROTOCOL,
    delays: ECOLOGY_TEMPORAL_DELAYS,
    armProtocols: TEMPORAL_ARM_PROTOCOLS,
    thresholds: ECOLOGY_TEMPORAL_GATE_THRESHOLDS,
    inferenceScope: 'fixed-configuration-validation-only',
    trainingEpochs,
    bootstrapReplicates,
    seedFamilies,
    taskProfileEntries,
    trainingReceipts,
  };
  const summary: EcologyTemporalDevelopmentSummary = {
    schemaVersion: 1,
    studyId: 'tsotchke-ecology-temporal-identifiability-phase-b-development-v1',
    developmentOnly: true,
    claimAllowed: false,
    conclusion: advancementGate.passed
      ? 'development-gate-passed-confirmatory-protocol-still-required'
      : 'development-gate-failed-no-advancement',
    trainingEpochs,
    trainingTaskSeedCount: trainingTaskSeeds.length,
    modelSeedCount,
    evaluationTaskSeedCount: roleConfigurations.reduce(
      (total, configurationEntry) => total + configurationEntry.taskSeeds.length,
      0,
    ),
    roleCount: roleConfigurations.length,
    inferenceScope: 'fixed-configuration-validation-only',
    inferenceRowCount: inferenceRows.length,
    delayCount: 3,
    armCount: ECOLOGY_TEMPORAL_ARMS.length,
    rowCount: rows.length,
    analyticFloors: {
      presentOnlyMeanSquaredError: ECOLOGY_TEMPORAL_PRESENT_ONLY_SSE_FLOOR,
      presentOnlyMeanCrossEntropy: ECOLOGY_TEMPORAL_PRESENT_ONLY_CROSS_ENTROPY_FLOOR,
      causalOracleMeanSquaredError: ECOLOGY_TEMPORAL_ORACLE_SSE,
      causalOracleMeanCrossEntropy: ECOLOGY_TEMPORAL_ORACLE_CROSS_ENTROPY,
    },
    targetShuffle: {
      method: 'fault-seed-fisher-yates-permutation',
      seedSha256: targetShuffleReceipt.targetShuffleSeedSha256,
      permutationSha256: targetShuffleReceipt.targetShufflePermutationSha256,
      sameLabelFraction: targetShuffleReceipt.targetShuffleSameLabelFraction,
    },
    taskProfileUniqueness,
    retention: {
      configuredRows: expectedRows,
      retainedRows: rows.length,
      rowsFilteredByOutcome: 0,
    },
    seedFamiliesSha256: hashCanonical(seedFamilies),
    configurationSha256: hashCanonical(configuration),
    rowsSha256: hashCanonical(rows),
    pairedControlContrasts: contrasts,
    advancementGate,
  };
  JSON.parse(canonicalJson({ summary, rows }));
  return { summary, rows };
}

if (import.meta.main) {
  console.log(canonicalJson(runEcologyTemporalDevelopment()));
}
