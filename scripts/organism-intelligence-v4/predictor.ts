/**
 * Phase-A V4 evaluator for the live simple_mnist-inspired ecology predictor.
 *
 * This module imports the frozen protocol and produces deterministic evidence in memory only. It does
 * not write receipts. The primary endpoint is exactly the protocol's true-label prediction quality at
 * label cadences 145..239. Recovery is a secondary diagnostic only: the first post-reversal label
 * cadence ending eight consecutive correctly classified true labels (threshold 0.5), or null.
 */

import {
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  V4_PROTOCOL_VERSION,
  fixtureSha256,
  mean,
  predictionQuality,
  v4DerivedSeed,
  v4PredictorInputAt,
  v4PredictorTrainingTargetForInput,
  v4PredictorTrueTargetForInput,
} from '../organism-intelligence-v4-protocol';
import {
  TSOTCHKE_ECOLOGY_HIDDEN,
  TSOTCHKE_ECOLOGY_INPUTS,
  TsotchkeEcologyPredictor,
  type TsotchkeEcologyInput,
  type TsotchkeEcologyPredictorSnapshot,
} from '../../src/sim/tsotchke-ecology-predictor';
import {
  corpusBrainVectorInto,
  isBrainWired,
  type MutableCorpusBrainVector,
} from '../../src/sim/tsotchke-brain-intake';
import {
  getTsotchkeRepoByIndex,
  TSOTCHKE_REPO_COUNT,
  type TsotchkeRepoSlug,
} from '../../src/sim/tsotchke-registry';

const FAMILY_ID = 'simple-mnist-ecology-predictor' as const;
const FIXTURE = V4_FAMILY_FIXTURES[FAMILY_ID];
const PARAMETER_ABSOLUTE_LIMIT = 8;
const RECOVERY_WINDOW = 8;
const REPLAY_SPLIT_CADENCE = 160;
const SIMPLE_MNIST_ABLATION: ReadonlySet<TsotchkeRepoSlug> = new Set(['simple_mnist']);
const CONSTRUCTOR_RNG_DRAW_COUNT =
  TSOTCHKE_ECOLOGY_INPUTS * TSOTCHKE_ECOLOGY_HIDDEN + TSOTCHKE_ECOLOGY_HIDDEN;
const FULL_CORPUS_REPO_COUNT = Array.from({ length: TSOTCHKE_REPO_COUNT }, (_, index) =>
  getTsotchkeRepoByIndex(index),
).filter(isBrainWired).length;

export const V4_PREDICTOR_ARMS = FIXTURE.arms;
export type V4PredictorArmId = (typeof V4_PREDICTOR_ARMS)[number];

interface V4PredictorArmConfiguration {
  adaptive: boolean;
  shuffledTrainingFeedback: boolean;
  rowContributionEnabled: boolean;
}

interface V4PredictorTrueLabelRecord {
  labelCadence: number;
  inputIndex: number;
  prediction: number;
  trueTarget: 0 | 1;
  brier: number;
}

interface V4PredictorTrainingRecord {
  labelCadence: number;
  inputIndex: number;
  target: 0 | 1;
  brier: number;
  updated: boolean;
}

interface V4PredictorRoutedRecord {
  cadence: number;
  ecologyRisk: number;
  ecologySurprise: number;
}

interface V4PredictorRegistryRecord {
  cadence: number;
  ablatedSlug: 'simple_mnist' | null;
  channels: readonly [number, number, number, number];
  drive: number;
  repoCount: number;
}

interface V4PredictorBounds {
  checkedSnapshots: number;
  checkedParameterValues: number;
  predictionViolations: number;
  trueBrierViolations: number;
  trainingBrierViolations: number;
  routedSignalViolations: number;
  registrySignalViolations: number;
  registryRepoCountViolations: number;
  parameterViolations: number;
  snapshotStateViolations: number;
  totalViolations: number;
  predictionRange: readonly [number, number];
  trueBrierRange: readonly [number, number];
  trainingBrierRange: readonly [number, number];
  maximumAbsoluteParameter: number;
  parameterAbsoluteLimit: number;
}

interface V4PredictorRoutingEvidence {
  ecologyRiskRange: readonly [number, number];
  ecologySurpriseRange: readonly [number, number];
  ecologyRiskZeroCount: number;
  ecologySurpriseZeroCount: number;
  bothRoutesZeroCount: number;
  allRoutesCausallyZero: boolean;
  registry: {
    implementation: 'corpusBrainVectorInto';
    ablatedSlug: 'simple_mnist' | null;
    expectedRepoCount: number;
    repoCountRange: readonly [number, number];
    matchingRepoCountCadences: number;
    driveRange: readonly [number, number];
    channelRanges: readonly [
      readonly [number, number],
      readonly [number, number],
      readonly [number, number],
      readonly [number, number],
    ];
  };
}

interface V4PredictorConstructorRngEvidence {
  evidenceKind: 'transformed-initial-parameter-outputs';
  rawTapeAvailable: false;
  rawTapeSha256: null;
  algorithm: 'mulberry32';
  seedLaw: '(constructorSeed ^ 0x51a7_ec01) >>> 0 || 1';
  drawCountBasis: 'one source draw per randomized w1/w2 parameter output';
  drawCount: number;
  transformedParameterCount: number;
  evidenceSha256: string;
}

export interface V4PredictorArmEvaluation {
  arm: V4PredictorArmId;
  constructorSeed: number;
  adaptiveUpdatesEnabled: boolean;
  shuffledTrainingFeedback: boolean;
  rowContributionEnabled: boolean;
  cadenceCount: number;
  feedbackCount: number;
  updateCount: number;
  scoredTrueLabelCount: number;
  /** Frozen primary endpoint: true-label quality over label cadences 145..239. */
  primaryOutcome: number;
  /** Exact complement of primaryOutcome under the frozen Brier-quality definition. */
  primaryMeanBrier: number;
  preReversal: {
    firstLabelCadence: number;
    lastLabelCadence: number;
    count: number;
    meanBrier: number;
    quality: number;
  };
  postReversalScored: {
    firstLabelCadence: number;
    lastLabelCadence: number;
    count: number;
    meanBrier: number;
    quality: number;
  };
  trainingFeedbackMeanBrier: number;
  recovery: {
    definition: 'eight-consecutive-correct-true-label-classifications';
    threshold: 0.5;
    window: number;
    firstReversedLabelCadence: number;
    cadence: number | null;
    delayCadences: number | null;
  };
  routing: V4PredictorRoutingEvidence;
  constructorRng: V4PredictorConstructorRngEvidence;
  bounds: V4PredictorBounds;
  hashes: {
    initialStateSha256: string;
    initialParametersSha256: string;
    perceptScheduleSha256: string;
    taskScheduleSha256: string;
    constructorRngEvidenceSha256: string;
    predictionTraceSha256: string;
    trueLabelTraceSha256: string;
    trainingFeedbackTraceSha256: string;
    routedSignalTraceSha256: string;
    registryRoutingTraceSha256: string;
    finalParametersSha256: string;
    finalSnapshotSha256: string;
    splitSnapshotSha256: string;
    snapshotContinuationSha256: string;
  };
  replay: {
    splitAfterCadence: number;
    continuationSteps: number;
    byteIdentical: boolean;
    replayContinuationSha256: string;
  };
  contentSha256: string;
}

export interface V4PredictorSeedRow {
  schemaVersion: 1;
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  family: typeof FAMILY_ID;
  evaluationSeed: number;
  constructorSeed: number;
  fixtureSha256: string;
  scheduleSha256: string;
  matchedInitialParameters: boolean;
  matchedEvidence: {
    fixtureSha256: string;
    initialStateSha256: string;
    initialParametersSha256: string;
    preInterventionPerceptScheduleSha256: string;
    taskLabelScheduleSha256: string;
    constructorRng: V4PredictorConstructorRngEvidence;
    initialStateMatchedAcrossArms: boolean;
    initialParametersMatchedAcrossArms: boolean;
    perceptScheduleMatchedAcrossArms: boolean;
    taskScheduleMatchedAcrossArms: boolean;
    constructorRngMatchedAcrossArms: boolean;
    constructorRngDrawCountMatchedAcrossArms: boolean;
  };
  arms: V4PredictorArmEvaluation[];
  contentSha256: string;
}

export interface V4PredictorFamilyEvaluation {
  schemaVersion: 1;
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  family: typeof FAMILY_ID;
  fixtureSha256: string;
  scheduleSha256: string;
  evaluationSeeds: number[];
  seedCount: number;
  rows: V4PredictorSeedRow[];
  contentSha256: string;
}

function armConfiguration(arm: V4PredictorArmId): V4PredictorArmConfiguration {
  switch (arm) {
    case 'adaptive':
      return { adaptive: true, shuffledTrainingFeedback: false, rowContributionEnabled: true };
    case 'frozen-identical-initial-weights':
      return { adaptive: false, shuffledTrainingFeedback: false, rowContributionEnabled: true };
    case 'target-shuffled':
      return { adaptive: true, shuffledTrainingFeedback: true, rowContributionEnabled: true };
    case 'row-ablated':
      return { adaptive: true, shuffledTrainingFeedback: false, rowContributionEnabled: false };
  }
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError('predictor evidence cannot hash non-finite data');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`unsupported predictor evidence value: ${typeof value}`);
}

function sha256(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalJson(value)).digest('hex');
}

function predictorInput(inputIndex: number): TsotchkeEcologyInput {
  const vector = v4PredictorInputAt(inputIndex);
  return {
    biomassDepletion: vector[0],
    metabolicDepletion: vector[1],
    crowding: vector[2],
    chaosThermalStress: vector[3],
  };
}

function parameterEvidence(snapshot: TsotchkeEcologyPredictorSnapshot) {
  return {
    seed: snapshot.seed,
    learningRate: snapshot.learningRate,
    w1: snapshot.w1,
    b1: snapshot.b1,
    w2: snapshot.w2,
    b2: snapshot.b2,
  };
}

/** Common pre-intervention state. `adaptive` is omitted because it is the declared arm intervention. */
function initialStateEvidence(snapshot: TsotchkeEcologyPredictorSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    model: snapshot.model,
    seed: snapshot.seed,
    learningRate: snapshot.learningRate,
    revision: snapshot.revision,
    updateCount: snapshot.updateCount,
    hasPending: snapshot.hasPending,
    pendingInput: snapshot.pendingInput,
    pendingPrediction: snapshot.pendingPrediction,
    parameters: parameterEvidence(snapshot),
  };
}

function constructorRngEvidence(
  snapshot: TsotchkeEcologyPredictorSnapshot,
): V4PredictorConstructorRngEvidence {
  const transformedOutputs = {
    constructorSeed: snapshot.seed,
    randomizedW1: snapshot.w1,
    randomizedW2: snapshot.w2,
  };
  return {
    evidenceKind: 'transformed-initial-parameter-outputs',
    rawTapeAvailable: false,
    rawTapeSha256: null,
    algorithm: 'mulberry32',
    seedLaw: '(constructorSeed ^ 0x51a7_ec01) >>> 0 || 1',
    drawCountBasis: 'one source draw per randomized w1/w2 parameter output',
    drawCount: CONSTRUCTOR_RNG_DRAW_COUNT,
    transformedParameterCount: snapshot.w1.length + snapshot.w2.length,
    evidenceSha256: sha256(transformedOutputs),
  };
}

function predictorPerceptScheduleEvidence() {
  return {
    cadenceCount: FIXTURE.totalCadences,
    inputs: Array.from({ length: FIXTURE.totalCadences }, (_, inputIndex) => ({
      inputIndex,
      input: v4PredictorInputAt(inputIndex),
    })),
  };
}

function predictorTaskScheduleEvidence() {
  return {
    reversalCadence: FIXTURE.reversalCadence,
    scoredCadences: FIXTURE.scoredCadences,
    lag: 'label at cadence t trains and scores the prediction retained from input t-1',
    labels: Array.from({ length: FIXTURE.totalCadences }, (_, inputIndex) => ({
      inputIndex,
      trueTarget: v4PredictorTrueTargetForInput(inputIndex),
      unshuffledTrainingTarget: v4PredictorTrainingTargetForInput(inputIndex, false),
      shuffledTrainingTarget: v4PredictorTrainingTargetForInput(inputIndex, true),
    })),
  };
}

function predictorScheduleEvidence() {
  return {
    totalCadences: FIXTURE.totalCadences,
    reversalCadence: FIXTURE.reversalCadence,
    scoredCadences: FIXTURE.scoredCadences,
    lag: 'label at cadence t trains and scores the prediction retained from input t-1',
    rows: Array.from({ length: FIXTURE.totalCadences }, (_, inputIndex) => ({
      inputIndex,
      input: v4PredictorInputAt(inputIndex),
      trueTarget: v4PredictorTrueTargetForInput(inputIndex),
      unshuffledTrainingTarget: v4PredictorTrainingTargetForInput(inputIndex, false),
      shuffledTrainingTarget: v4PredictorTrainingTargetForInput(inputIndex, true),
    })),
  };
}

export const V4_PREDICTOR_SCHEDULE_SHA256 = sha256(predictorScheduleEvidence());
export const V4_PREDICTOR_PERCEPT_SCHEDULE_SHA256 = sha256(predictorPerceptScheduleEvidence());
export const V4_PREDICTOR_TASK_SCHEDULE_SHA256 = sha256(predictorTaskScheduleEvidence());
export const V4_PREDICTOR_ALL_ZERO_ROUTE_SHA256 = sha256(
  Array.from({ length: FIXTURE.totalCadences }, (_, cadence) => ({
    cadence,
    ecologyRisk: 0,
    ecologySurprise: 0,
  })),
);

function inUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function parameterValues(snapshot: TsotchkeEcologyPredictorSnapshot): number[] {
  return [...snapshot.w1, ...snapshot.b1, ...snapshot.w2, snapshot.b2];
}

function countSnapshotStateViolations(
  snapshot: TsotchkeEcologyPredictorSnapshot,
  expected: {
    seed: number;
    adaptive: boolean;
    revision: number;
    updateCount: number;
    input: TsotchkeEcologyInput;
    prediction: number;
  },
): number {
  let violations = 0;
  if (
    snapshot.schemaVersion !== 1 ||
    snapshot.model !== 'tsotchke-ecology-predictor' ||
    snapshot.seed !== expected.seed ||
    snapshot.learningRate !== FIXTURE.learningRate ||
    snapshot.adaptive !== expected.adaptive ||
    snapshot.revision !== expected.revision ||
    snapshot.updateCount !== expected.updateCount ||
    snapshot.hasPending !== true ||
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < 0 ||
    !Number.isSafeInteger(snapshot.updateCount) ||
    snapshot.updateCount < 0 ||
    snapshot.updateCount > Math.max(0, snapshot.revision - 1)
  ) {
    violations++;
  }
  if (
    snapshot.pendingInput.length !== TSOTCHKE_ECOLOGY_INPUTS ||
    snapshot.w1.length !== TSOTCHKE_ECOLOGY_INPUTS * TSOTCHKE_ECOLOGY_HIDDEN ||
    snapshot.b1.length !== TSOTCHKE_ECOLOGY_HIDDEN ||
    snapshot.w2.length !== TSOTCHKE_ECOLOGY_HIDDEN
  ) {
    violations++;
  }
  if (
    !inUnitInterval(snapshot.pendingPrediction) ||
    snapshot.pendingPrediction !== expected.prediction
  ) {
    violations++;
  }
  const expectedInput = [
    expected.input.biomassDepletion,
    expected.input.metabolicDepletion,
    expected.input.crowding,
    expected.input.chaosThermalStress,
  ];
  for (const value of snapshot.pendingInput) if (!inUnitInterval(value)) violations++;
  if (
    snapshot.pendingInput.length !== expectedInput.length ||
    snapshot.pendingInput.some((value, index) => value !== expectedInput[index])
  ) {
    violations++;
  }
  return violations;
}

function mutableCorpusVector(): MutableCorpusBrainVector {
  return { channels: new Float32Array(4), drive: 0, repoCount: 0 };
}

function registryRecord(
  vector: MutableCorpusBrainVector,
  cadence: number,
  ablated: boolean,
): V4PredictorRegistryRecord {
  return {
    cadence,
    ablatedSlug: ablated ? 'simple_mnist' : null,
    channels: [
      vector.channels[0] ?? 0,
      vector.channels[1] ?? 0,
      vector.channels[2] ?? 0,
      vector.channels[3] ?? 0,
    ],
    drive: vector.drive,
    repoCount: vector.repoCount,
  };
}

function range(values: readonly number[]): readonly [number, number] {
  return values.length === 0 ? [0, 0] : [Math.min(...values), Math.max(...values)];
}

function recoveryCadence(records: readonly V4PredictorTrueLabelRecord[]): number | null {
  const firstReversedLabelCadence = FIXTURE.reversalCadence + 1;
  for (let index = RECOVERY_WINDOW - 1; index < records.length; index++) {
    const window = records.slice(index - RECOVERY_WINDOW + 1, index + 1);
    const last = window.at(-1);
    if (
      last !== undefined &&
      window[0]!.labelCadence >= firstReversedLabelCadence &&
      window.every((record) => (record.prediction >= 0.5 ? 1 : 0) === record.trueTarget)
    ) {
      return last.labelCadence;
    }
  }
  return null;
}

function evaluateArm(evaluationSeed: number, arm: V4PredictorArmId): V4PredictorArmEvaluation {
  const configuration = armConfiguration(arm);
  const constructorSeed = v4DerivedSeed(evaluationSeed, 'predictorConstructor');
  const predictor = new TsotchkeEcologyPredictor(constructorSeed, {
    adaptive: configuration.adaptive,
    learningRate: FIXTURE.learningRate,
  });
  const initialSnapshot = predictor.snapshot();
  const initialStateSha256 = sha256(initialStateEvidence(initialSnapshot));
  const initialParametersSha256 = sha256(parameterEvidence(initialSnapshot));
  const constructorRng = constructorRngEvidence(initialSnapshot);

  const predictions: number[] = [];
  const trueRecords: V4PredictorTrueLabelRecord[] = [];
  const trainingRecords: V4PredictorTrainingRecord[] = [];
  const routedRecords: V4PredictorRoutedRecord[] = [];
  const registryRecords: V4PredictorRegistryRecord[] = [];
  const corpusVector = mutableCorpusVector();
  const primaryContinuation: unknown[] = [];
  const replayContinuation: unknown[] = [];
  let replayPredictor: TsotchkeEcologyPredictor | null = null;
  let splitSnapshotSha256 = '';
  let previousPrediction: number | undefined;

  let predictionViolations = 0;
  let trueBrierViolations = 0;
  let trainingBrierViolations = 0;
  let routedSignalViolations = 0;
  let registrySignalViolations = 0;
  let registryRepoCountViolations = 0;
  let parameterViolations = 0;
  let snapshotStateViolations = 0;
  let checkedParameterValues = 0;
  let maximumAbsoluteParameter = 0;
  const trueBriers: number[] = [];
  const trainingBriers: number[] = [];

  for (let cadence = 0; cadence < FIXTURE.totalCadences; cadence++) {
    const input = predictorInput(cadence);
    const trainingTarget =
      cadence === 0
        ? undefined
        : v4PredictorTrainingTargetForInput(cadence - 1, configuration.shuffledTrainingFeedback);
    const result = predictor.step(input, trainingTarget);
    predictions.push(result.prediction);
    if (!inUnitInterval(result.prediction)) predictionViolations++;

    if (cadence === 0) {
      if (result.previousBrier !== null || result.updated) trainingBrierViolations++;
    } else {
      const retainedPrediction = previousPrediction!;
      const trueTarget = v4PredictorTrueTargetForInput(cadence - 1);
      const trueBrier = (retainedPrediction - trueTarget) ** 2;
      trueBriers.push(trueBrier);
      if (!inUnitInterval(trueBrier)) trueBrierViolations++;
      trueRecords.push({
        labelCadence: cadence,
        inputIndex: cadence - 1,
        prediction: retainedPrediction,
        trueTarget,
        brier: trueBrier,
      });

      const expectedTrainingBrier = (retainedPrediction - trainingTarget!) ** 2;
      const reportedTrainingBrier = result.previousBrier;
      if (
        reportedTrainingBrier === null ||
        !inUnitInterval(reportedTrainingBrier) ||
        reportedTrainingBrier !== expectedTrainingBrier
      ) {
        trainingBrierViolations++;
      }
      if (reportedTrainingBrier !== null) trainingBriers.push(reportedTrainingBrier);
      trainingRecords.push({
        labelCadence: cadence,
        inputIndex: cadence - 1,
        target: trainingTarget!,
        brier: reportedTrainingBrier ?? Number.NaN,
        updated: result.updated,
      });
    }

    const ecologyRisk = configuration.rowContributionEnabled ? result.prediction : 0;
    const ecologySurprise = configuration.rowContributionEnabled
      ? Math.sqrt(result.previousBrier ?? 0)
      : 0;
    if (!inUnitInterval(ecologyRisk) || !inUnitInterval(ecologySurprise)) routedSignalViolations++;
    routedRecords.push({ cadence, ecologyRisk, ecologySurprise });

    const predictorAblated = !configuration.rowContributionEnabled;
    const corpus = corpusBrainVectorInto(
      corpusVector,
      evaluationSeed,
      cadence,
      predictorAblated ? SIMPLE_MNIST_ABLATION : undefined,
      { simpleMnistRisk: result.prediction },
    );
    const registry = registryRecord(corpus, cadence, predictorAblated);
    registryRecords.push(registry);
    if (
      !inUnitInterval(registry.drive) ||
      registry.channels.some((value) => !inUnitInterval(value))
    ) {
      registrySignalViolations++;
    }
    const expectedRepoCount = FULL_CORPUS_REPO_COUNT - (predictorAblated ? 1 : 0);
    if (registry.repoCount !== expectedRepoCount) registryRepoCountViolations++;

    const snapshot = predictor.snapshot();
    const parameters = parameterValues(snapshot);
    checkedParameterValues += parameters.length;
    for (const value of parameters) {
      if (!Number.isFinite(value) || Math.abs(value) > PARAMETER_ABSOLUTE_LIMIT) {
        parameterViolations++;
      } else {
        maximumAbsoluteParameter = Math.max(maximumAbsoluteParameter, Math.abs(value));
      }
    }
    snapshotStateViolations += countSnapshotStateViolations(snapshot, {
      seed: constructorSeed,
      adaptive: configuration.adaptive,
      revision: cadence + 1,
      updateCount: configuration.adaptive ? cadence : 0,
      input,
      prediction: result.prediction,
    });

    if (cadence === REPLAY_SPLIT_CADENCE - 1) {
      splitSnapshotSha256 = sha256(snapshot);
      replayPredictor = TsotchkeEcologyPredictor.fromSnapshot(snapshot);
    } else if (cadence >= REPLAY_SPLIT_CADENCE) {
      const replayResult = replayPredictor!.step(input, trainingTarget);
      primaryContinuation.push({ cadence, result, snapshot });
      replayContinuation.push({
        cadence,
        result: replayResult,
        snapshot: replayPredictor!.snapshot(),
      });
    }
    previousPrediction = result.prediction;
  }

  const scoredRecords = trueRecords.filter(
    (record) =>
      record.labelCadence >= FIXTURE.scoredCadences.first &&
      record.labelCadence <= FIXTURE.scoredCadences.last,
  );
  const preReversalRecords = trueRecords.filter(
    (record) => record.inputIndex < FIXTURE.reversalCadence,
  );
  const scoredPredictions = scoredRecords.map((record) => record.prediction);
  const scoredLabels = scoredRecords.map((record) => record.trueTarget);
  const prePredictions = preReversalRecords.map((record) => record.prediction);
  const preLabels = preReversalRecords.map((record) => record.trueTarget);
  const firstRecoveryCadence = recoveryCadence(trueRecords);
  const finalSnapshot = predictor.snapshot();
  const routedRisk = routedRecords.map((record) => record.ecologyRisk);
  const routedSurprise = routedRecords.map((record) => record.ecologySurprise);
  const expectedRegistryRepoCount =
    FULL_CORPUS_REPO_COUNT - (configuration.rowContributionEnabled ? 0 : 1);
  const registryChannelRanges: V4PredictorRoutingEvidence['registry']['channelRanges'] = [
    range(registryRecords.map((record) => record.channels[0])),
    range(registryRecords.map((record) => record.channels[1])),
    range(registryRecords.map((record) => record.channels[2])),
    range(registryRecords.map((record) => record.channels[3])),
  ];
  const routing: V4PredictorRoutingEvidence = {
    ecologyRiskRange: range(routedRisk),
    ecologySurpriseRange: range(routedSurprise),
    ecologyRiskZeroCount: routedRisk.filter((value) => value === 0).length,
    ecologySurpriseZeroCount: routedSurprise.filter((value) => value === 0).length,
    bothRoutesZeroCount: routedRecords.filter(
      (record) => record.ecologyRisk === 0 && record.ecologySurprise === 0,
    ).length,
    allRoutesCausallyZero: routedRecords.every(
      (record) => record.ecologyRisk === 0 && record.ecologySurprise === 0,
    ),
    registry: {
      implementation: 'corpusBrainVectorInto',
      ablatedSlug: configuration.rowContributionEnabled ? null : 'simple_mnist',
      expectedRepoCount: expectedRegistryRepoCount,
      repoCountRange: range(registryRecords.map((record) => record.repoCount)),
      matchingRepoCountCadences: registryRecords.filter(
        (record) => record.repoCount === expectedRegistryRepoCount,
      ).length,
      driveRange: range(registryRecords.map((record) => record.drive)),
      channelRanges: registryChannelRanges,
    },
  };
  const primaryContinuationBytes = canonicalJson({
    splitSnapshotSha256,
    continuation: primaryContinuation,
    finalSnapshot,
  });
  const replayFinalSnapshot = replayPredictor!.snapshot();
  const replayContinuationBytes = canonicalJson({
    splitSnapshotSha256,
    continuation: replayContinuation,
    finalSnapshot: replayFinalSnapshot,
  });
  const primaryContinuationSha256 = new Bun.CryptoHasher('sha256')
    .update(primaryContinuationBytes)
    .digest('hex');
  const replayContinuationSha256 = new Bun.CryptoHasher('sha256')
    .update(replayContinuationBytes)
    .digest('hex');

  const boundsBase = {
    checkedSnapshots: FIXTURE.totalCadences,
    checkedParameterValues,
    predictionViolations,
    trueBrierViolations,
    trainingBrierViolations,
    routedSignalViolations,
    registrySignalViolations,
    registryRepoCountViolations,
    parameterViolations,
    snapshotStateViolations,
  };
  const bounds: V4PredictorBounds = {
    ...boundsBase,
    totalViolations: Object.values(boundsBase)
      .slice(2)
      .reduce((sum, value) => sum + value, 0),
    predictionRange: range(predictions),
    trueBrierRange: range(trueBriers),
    trainingBrierRange: range(trainingBriers),
    maximumAbsoluteParameter,
    parameterAbsoluteLimit: PARAMETER_ABSOLUTE_LIMIT,
  };

  const armBase = {
    arm,
    constructorSeed,
    adaptiveUpdatesEnabled: configuration.adaptive,
    shuffledTrainingFeedback: configuration.shuffledTrainingFeedback,
    rowContributionEnabled: configuration.rowContributionEnabled,
    cadenceCount: FIXTURE.totalCadences,
    feedbackCount: trainingRecords.length,
    updateCount: finalSnapshot.updateCount,
    scoredTrueLabelCount: scoredRecords.length,
    primaryOutcome: predictionQuality(scoredPredictions, scoredLabels),
    primaryMeanBrier: mean(scoredRecords.map((record) => record.brier)),
    preReversal: {
      firstLabelCadence: preReversalRecords[0]!.labelCadence,
      lastLabelCadence: preReversalRecords.at(-1)!.labelCadence,
      count: preReversalRecords.length,
      meanBrier: mean(preReversalRecords.map((record) => record.brier)),
      quality: predictionQuality(prePredictions, preLabels),
    },
    postReversalScored: {
      firstLabelCadence: scoredRecords[0]!.labelCadence,
      lastLabelCadence: scoredRecords.at(-1)!.labelCadence,
      count: scoredRecords.length,
      meanBrier: mean(scoredRecords.map((record) => record.brier)),
      quality: predictionQuality(scoredPredictions, scoredLabels),
    },
    trainingFeedbackMeanBrier: mean(trainingBriers),
    recovery: {
      definition: 'eight-consecutive-correct-true-label-classifications' as const,
      threshold: 0.5 as const,
      window: RECOVERY_WINDOW,
      firstReversedLabelCadence: FIXTURE.reversalCadence + 1,
      cadence: firstRecoveryCadence,
      delayCadences:
        firstRecoveryCadence === null ? null : firstRecoveryCadence - FIXTURE.reversalCadence,
    },
    routing,
    constructorRng,
    bounds,
    hashes: {
      initialStateSha256,
      initialParametersSha256,
      perceptScheduleSha256: V4_PREDICTOR_PERCEPT_SCHEDULE_SHA256,
      taskScheduleSha256: V4_PREDICTOR_TASK_SCHEDULE_SHA256,
      constructorRngEvidenceSha256: constructorRng.evidenceSha256,
      predictionTraceSha256: sha256(predictions),
      trueLabelTraceSha256: sha256(trueRecords),
      trainingFeedbackTraceSha256: sha256(trainingRecords),
      routedSignalTraceSha256: sha256(routedRecords),
      registryRoutingTraceSha256: sha256(registryRecords),
      finalParametersSha256: sha256(parameterEvidence(finalSnapshot)),
      finalSnapshotSha256: sha256(finalSnapshot),
      splitSnapshotSha256,
      snapshotContinuationSha256: primaryContinuationSha256,
    },
    replay: {
      splitAfterCadence: REPLAY_SPLIT_CADENCE - 1,
      continuationSteps: FIXTURE.totalCadences - REPLAY_SPLIT_CADENCE,
      byteIdentical: primaryContinuationBytes === replayContinuationBytes,
      replayContinuationSha256,
    },
  };
  return { ...armBase, contentSha256: sha256(armBase) };
}

function assertEvaluationSeed(evaluationSeed: number): void {
  if (!V4_EVALUATION_SEEDS.some((seed) => seed === evaluationSeed)) {
    throw new RangeError('predictor evaluator requires one of the 64 frozen V4 evaluation seeds');
  }
}

/** Evaluate all four frozen arms for one preregistered seed without writing an artifact. */
export function evaluateV4PredictorSeed(evaluationSeed: number): V4PredictorSeedRow {
  assertEvaluationSeed(evaluationSeed);
  const arms = V4_PREDICTOR_ARMS.map((arm) => evaluateArm(evaluationSeed, arm));
  const initialStateHashes = new Set(arms.map((arm) => arm.hashes.initialStateSha256));
  const initialHashes = new Set(arms.map((arm) => arm.hashes.initialParametersSha256));
  const perceptScheduleHashes = new Set(arms.map((arm) => arm.hashes.perceptScheduleSha256));
  const taskScheduleHashes = new Set(arms.map((arm) => arm.hashes.taskScheduleSha256));
  const constructorRngHashes = new Set(arms.map((arm) => arm.hashes.constructorRngEvidenceSha256));
  const constructorRngDrawCounts = new Set(arms.map((arm) => arm.constructorRng.drawCount));
  const commonConstructorRng = arms[0]!.constructorRng;
  const rowBase = {
    schemaVersion: 1 as const,
    protocolVersion: V4_PROTOCOL_VERSION,
    family: FAMILY_ID,
    evaluationSeed,
    constructorSeed: v4DerivedSeed(evaluationSeed, 'predictorConstructor'),
    fixtureSha256: fixtureSha256(FAMILY_ID),
    scheduleSha256: V4_PREDICTOR_SCHEDULE_SHA256,
    matchedInitialParameters: initialHashes.size === 1,
    matchedEvidence: {
      fixtureSha256: fixtureSha256(FAMILY_ID),
      initialStateSha256: arms[0]!.hashes.initialStateSha256,
      initialParametersSha256: arms[0]!.hashes.initialParametersSha256,
      preInterventionPerceptScheduleSha256: V4_PREDICTOR_PERCEPT_SCHEDULE_SHA256,
      taskLabelScheduleSha256: V4_PREDICTOR_TASK_SCHEDULE_SHA256,
      constructorRng: commonConstructorRng,
      initialStateMatchedAcrossArms: initialStateHashes.size === 1,
      initialParametersMatchedAcrossArms: initialHashes.size === 1,
      perceptScheduleMatchedAcrossArms: perceptScheduleHashes.size === 1,
      taskScheduleMatchedAcrossArms: taskScheduleHashes.size === 1,
      constructorRngMatchedAcrossArms: constructorRngHashes.size === 1,
      constructorRngDrawCountMatchedAcrossArms: constructorRngDrawCounts.size === 1,
    },
    arms,
  };
  return { ...rowBase, contentSha256: sha256(rowBase) };
}

/** Evaluate the exact ordered 64-seed family fixed by the frozen protocol. */
export function evaluateV4PredictorFamily(): V4PredictorFamilyEvaluation {
  const rows = V4_EVALUATION_SEEDS.map((seed) => evaluateV4PredictorSeed(seed));
  const evaluationBase = {
    schemaVersion: 1 as const,
    protocolVersion: V4_PROTOCOL_VERSION,
    family: FAMILY_ID,
    fixtureSha256: fixtureSha256(FAMILY_ID),
    scheduleSha256: V4_PREDICTOR_SCHEDULE_SHA256,
    evaluationSeeds: [...V4_EVALUATION_SEEDS],
    seedCount: rows.length,
    rows,
  };
  return { ...evaluationBase, contentSha256: sha256(evaluationBase) };
}

/** Independent whole-row rerun used by callers as a byte-level replay gate. */
export function verifyV4PredictorSeedReplay(evaluationSeed: number) {
  const first = evaluateV4PredictorSeed(evaluationSeed);
  const second = evaluateV4PredictorSeed(evaluationSeed);
  const firstBytes = canonicalJson(first);
  const secondBytes = canonicalJson(second);
  return {
    byteIdentical: firstBytes === secondBytes,
    firstSha256: sha256(first),
    secondSha256: sha256(second),
  } as const;
}

/** Naming aliases matching the other Phase-A family evaluators. */
export const evaluatePredictorV4Seed = evaluateV4PredictorSeed;
export const evaluatePredictorV4 = evaluateV4PredictorFamily;
