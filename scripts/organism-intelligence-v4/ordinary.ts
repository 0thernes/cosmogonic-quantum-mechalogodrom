/**
 * Ordinary-organism family evaluator for the frozen V4 Phase-A protocol.
 *
 * This module is deliberately receipt-agnostic: it runs the declared task and returns deterministic,
 * JSON-serializable evidence without writing files. Every arm receives an independently constructed
 * EntityBrainField with the same derived genome and the same exogenous percept/goal schedules. The
 * action-distribution surrogate still advances the live full-semantic controller, then replaces only
 * its horizontal action with the protocol's isolated calibrated stream.
 */

import * as THREE from 'three';
import { mulberry32 } from '../../src/math/rng';
import { EntityBrainField } from '../../src/sim/entity-brain';
import { GENOME_LEN, TRAIT } from '../../src/sim/genome';
import type { Entity, EntityData, OrganismGoalField } from '../../src/types';
import {
  fixtureSha256,
  mean,
  ordinaryActionScore,
  v4CalibrateOrdinarySurrogate,
  v4DerivedSeed,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  v4OrdinarySegmentSignal,
  type V4OrdinarySurrogateCalibration,
  V4_PROTOCOL_VERSION,
  V4_SURROGATE_CALIBRATION,
  V4_SURROGATE_CALIBRATION_SEEDS,
  v4OrdinarySurrogateStep,
} from '../organism-intelligence-v4-protocol';

export const ORDINARY_V4_FAMILY_ID = 'ordinary-organisms' as const;
export const ORDINARY_V4_ARMS = V4_FAMILY_FIXTURES[ORDINARY_V4_FAMILY_ID].arms;

export type OrdinaryV4Arm = (typeof ORDINARY_V4_ARMS)[number];

/** Exact post-construction intervention applied after the matched pre-intervention state is hashed. */
export interface OrdinaryV4InterventionEvidence {
  readonly semanticField:
    'enabled-identity' | 'enabled-cyclic' | 'disabled-goal-preserved' | 'omitted-exact-legacy';
  readonly goalsAttached: boolean;
  readonly semanticRecurrenceEnabled: boolean;
  readonly semanticRecurrenceActive: boolean;
  readonly horizontalActionSource: 'live-neural' | 'frozen-calibrated-surrogate';
  readonly calibrationSha256: string | null;
}

export interface OrdinaryV4HashBundle {
  readonly fixtureSha256: string;
  /** Matched state before any arm intervention: entity, FP32 genome, and controller metadata. */
  readonly initialStateSha256: string;
  readonly initialGenomeSha256: string;
  /** Common exogenous percept tape before an arm applies its declared intervention. */
  readonly perceptSha256: string;
  readonly goalScheduleSha256: string;
  /** Ordinary Phase A has no environment RNG after initialization, so this is the empty tape. */
  readonly environmentRngTapeSha256: string;
  readonly environmentRngDrawCount: 0;
  readonly brainRngSeed: number;
  readonly brainRngTapeSha256: string;
  readonly brainRngDrawCount: number;
  /** Empty for neural arms; populated only by the isolated surrogate arm. */
  readonly surrogateRngSeed: number | null;
  readonly surrogateRngTapeSha256: string;
  readonly surrogateRngDrawCount: number;
  /** Exact declared arm intervention, separate from the matched pre-intervention state hash. */
  readonly interventionSha256: string;
  /** Null outside the surrogate arm; exact frozen calibration identity inside it. */
  readonly calibrationSha256: string | null;
}

export interface OrdinaryV4SecondaryOutcomes {
  readonly totalSteps: number;
  readonly scoredSteps: number;
  readonly allStepMeanActionScore: number;
  readonly scoredMeanGoalProjection: number;
  readonly actionFrequency: number;
  readonly meanHorizontalActionMagnitude: number;
  readonly maximumHorizontalActionMagnitude: number;
  readonly cueMeanResourceContext: number;
  readonly dropoutMeanResourceContext: number;
  /**
   * Preregistered secondary diagnostic. A reversal is recovered on the first post-action step in
   * that goal regime whose complete horizontal velocity has a strictly positive dot product with
   * the new goal. `recoverySteps` is zero when this is already true on the reversal step; null means
   * the observation window ended at the next reversal (or task end) before recovery.
   */
  readonly goalAlignedVelocityRecovery: {
    readonly definition: string;
    readonly reversalCount: number;
    readonly recoveredCount: number;
    readonly perReversal: readonly OrdinaryV4ReversalRecovery[];
  };
  readonly finalHorizontalSpeed: number;
  readonly finalVerticalVelocity: number;
  readonly finalActivation: number;
}

export interface OrdinaryV4ReversalRecovery {
  readonly reversalStep: number;
  readonly windowEndStepExclusive: number;
  readonly previousGoalX: number;
  readonly newGoalX: number;
  readonly firstPositiveGoalAlignedVelocityStep: number | null;
  readonly recoverySteps: number | null;
  readonly recoverySeconds: number | null;
  readonly censored: boolean;
}

export interface OrdinaryV4ArmResult {
  readonly protocolVersion: typeof V4_PROTOCOL_VERSION;
  readonly family: typeof ORDINARY_V4_FAMILY_ID;
  readonly controllerType: 'neural';
  readonly seed: number;
  readonly arm: OrdinaryV4Arm;
  /** Frozen dropout-goal-aligned-action-score; normalized to [0,1]. */
  readonly primaryOutcome: number;
  readonly secondaryOutcomes: OrdinaryV4SecondaryOutcomes;
  readonly intervention: OrdinaryV4InterventionEvidence;
  readonly hashes: OrdinaryV4HashBundle;
  /** SHA-256 over metadata plus the exact big-endian per-step Float64 trace. */
  readonly replayFingerprint: string;
}

export interface OrdinaryV4SurrogateCalibrationResult {
  readonly protocolVersion: typeof V4_PROTOCOL_VERSION;
  readonly family: typeof ORDINARY_V4_FAMILY_ID;
  readonly sourceArm: 'full-semantic-recurrent';
  readonly sourceSeeds: readonly number[];
  readonly actionVectorCount: number;
  readonly calibration: V4OrdinarySurrogateCalibration;
  readonly calibrationSha256: string;
  readonly sourceReplayFingerprints: readonly string[];
  readonly replayFingerprint: string;
}

export interface OrdinaryV4SeedResult {
  readonly protocolVersion: typeof V4_PROTOCOL_VERSION;
  readonly family: typeof ORDINARY_V4_FAMILY_ID;
  readonly seed: number;
  readonly fixtureSha256: string;
  readonly arms: readonly OrdinaryV4ArmResult[];
  readonly replayFingerprint: string;
}

export interface OrdinaryV4EvaluationResult {
  readonly protocolVersion: typeof V4_PROTOCOL_VERSION;
  readonly family: typeof ORDINARY_V4_FAMILY_ID;
  readonly fixtureSha256: string;
  readonly seeds: readonly number[];
  readonly calibration: OrdinaryV4SurrogateCalibrationResult;
  readonly results: readonly OrdinaryV4SeedResult[];
  readonly replayFingerprint: string;
}

interface OrdinaryStep {
  readonly index: number;
  readonly segmentIndex: number;
  readonly time: number;
  readonly goalX: number;
  readonly goalZ: 0;
  readonly resourceCue: number;
  readonly score: boolean;
}

interface RecordedRng {
  readonly rng: () => number;
  readonly tape: number[];
}

interface InternalArmRun {
  readonly result: OrdinaryV4ArmResult;
  readonly horizontalActions: readonly (readonly [number, number])[];
}

const ORDINARY_FIXTURE = V4_FAMILY_FIXTURES[ORDINARY_V4_FAMILY_ID];
const ORDINARY_CANONICAL_EVALUATION_SEEDS = Object.freeze([...V4_EVALUATION_SEEDS]);
const ORDINARY_CANONICAL_CALIBRATION_SEEDS = Object.freeze([...V4_SURROGATE_CALIBRATION_SEEDS]);
/** Frozen after the preregistered 16-seed calibration was first executed in the result phase. */
export const ORDINARY_V4_CALIBRATION_SHA256 =
  'ca74e6d7cab350eb199b5674c6675085105d5abe869ed70c2081912f58fc58bb' as const;
const EMPTY_UINT32_SHA256 = sha256Uint32([]);
const ORDINARY_STEPS = buildStepSchedule();
const ORDINARY_REVERSALS = buildReversalSchedule();
const ORDINARY_EXOGENOUS_PERCEPT_TAPE_SHA256 = sha256Canonical({
  definition: 'ordinary-v4-common-exogenous-percept-tape',
  initial: {
    energy: ORDINARY_FIXTURE.initialEntity.energy,
    age: ORDINARY_FIXTURE.initialEntity.age,
    life: ORDINARY_FIXTURE.initialEntity.life,
    phase: ORDINARY_FIXTURE.initialEntity.ph,
    velocity: ORDINARY_FIXTURE.initialEntity.velocity,
  },
  worldChaos: ORDINARY_FIXTURE.worldChaos,
  steps: ORDINARY_STEPS.map((step) => [
    step.index,
    step.time,
    step.resourceCue,
    [step.resourceCue, 0, 0, 0],
  ]),
});
const ORDINARY_GOAL_SHA256 = sha256Canonical({
  definition: 'ordinary-v4-goal-tape',
  steps: ORDINARY_STEPS.map((step) => [step.index, step.goalX, step.goalZ, 1, 1, step.index + 1]),
});

function buildStepSchedule(): OrdinaryStep[] {
  const steps: OrdinaryStep[] = [];
  for (const [segmentIndex, segment] of ORDINARY_FIXTURE.segments.entries()) {
    for (let offset = 0; offset < segment.steps; offset++) {
      const index = steps.length;
      steps.push({
        index,
        segmentIndex,
        time: ORDINARY_FIXTURE.initialSimulationTime + index / ORDINARY_FIXTURE.simulationHz,
        goalX: segment.goalX,
        goalZ: 0,
        resourceCue: segment.resourceCue,
        score: segment.score,
      });
    }
  }
  if (steps.length !== ORDINARY_FIXTURE.totalSteps) {
    throw new Error('ordinary V4 step schedule drifted from the frozen fixture');
  }
  return steps;
}

function buildReversalSchedule(): Omit<
  OrdinaryV4ReversalRecovery,
  'firstPositiveGoalAlignedVelocityStep' | 'recoverySteps' | 'recoverySeconds' | 'censored'
>[] {
  const reversals = ORDINARY_STEPS.flatMap((step, index) => {
    const previous = ORDINARY_STEPS[index - 1];
    if (previous === undefined || previous.goalX === step.goalX) return [];
    return [
      {
        reversalStep: step.index,
        previousGoalX: previous.goalX,
        newGoalX: step.goalX,
      },
    ];
  });
  return reversals.map((reversal, index) => ({
    ...reversal,
    windowEndStepExclusive: reversals[index + 1]?.reversalStep ?? ORDINARY_FIXTURE.totalSteps,
  }));
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('canonical JSON rejects non-finite numbers');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (ArrayBuffer.isView(value)) {
    const entries =
      value instanceof DataView
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : (value as unknown as ArrayLike<number>);
    return canonicalJson(Array.from(entries));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonical JSON does not support ${typeof value}`);
}

function sha256Canonical(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalJson(value)).digest('hex');
}

function uint32Bytes(values: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 4);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? -1;
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new RangeError('uint32 tape values must be exact uint32 integers');
    }
    view.setUint32(index * 4, value, false);
  }
  return bytes;
}

function float32Bytes(values: ArrayLike<number>): Uint8Array {
  const bytes = new Uint8Array(values.length * 4);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? 0;
    if (!Number.isFinite(value)) throw new RangeError('Float32 hash inputs must be finite');
    view.setFloat32(index * 4, value, false);
  }
  return bytes;
}

function float64Bytes(values: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 8);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? 0;
    if (!Number.isFinite(value)) throw new RangeError('Float64 hash inputs must be finite');
    view.setFloat64(index * 8, value, false);
  }
  return bytes;
}

function sha256Bytes(bytes: Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

function sha256Uint32(values: readonly number[]): string {
  return sha256Bytes(uint32Bytes(values));
}

function traceFingerprint(metadata: unknown, trace: readonly number[]): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(canonicalJson(metadata));
  hasher.update(float64Bytes(trace));
  return hasher.digest('hex');
}

function recordedMulberry32(seed: number): RecordedRng {
  const source = mulberry32(seed);
  const tape: number[] = [];
  return {
    tape,
    rng: () => {
      const value = source();
      tape.push(Math.floor(value * 0x1_0000_0000));
      return value;
    },
  };
}

function createEntity(): Entity {
  const initial = ORDINARY_FIXTURE.initialEntity;
  const { velocity, ...entityData } = initial;
  const data: EntityData = {
    ...entityData,
    vel: new THREE.Vector3(...velocity),
  } as unknown as EntityData;
  return { userData: data } as Entity;
}

function createGoalField(): OrganismGoalField {
  return {
    directionX: new Float32Array(1),
    directionZ: new Float32Array(1),
    desire: new Float32Array(1).fill(1),
    cover: new Float32Array(1).fill(1),
    revision: new Uint32Array(1),
  };
}

function assertArm(arm: string): asserts arm is OrdinaryV4Arm {
  if (!(ORDINARY_V4_ARMS as readonly string[]).includes(arm)) {
    throw new RangeError(`unknown ordinary V4 arm: ${arm}`);
  }
}

function calibrationSha256For(calibration: V4OrdinarySurrogateCalibration): string {
  return traceFingerprint(
    {
      protocolVersion: V4_PROTOCOL_VERSION,
      family: ORDINARY_V4_FAMILY_ID,
      sourceArm: 'full-semantic-recurrent',
      sourceSeeds: ORDINARY_CANONICAL_CALIBRATION_SEEDS,
      actionVectorCount: ORDINARY_CANONICAL_CALIBRATION_SEEDS.length * ORDINARY_FIXTURE.totalSteps,
      actionFrequency: calibration.actionFrequency,
    },
    calibration.sortedNonZeroMagnitudes,
  );
}

function assertCanonicalCalibration(calibration: V4OrdinarySurrogateCalibration): string {
  // The protocol primitive performs every numeric bound/order check while consuming three inert draws.
  v4OrdinarySurrogateStep(calibration, () => 0);
  const calibrationSha256 = calibrationSha256For(calibration);
  if (calibrationSha256 !== ORDINARY_V4_CALIBRATION_SHA256) {
    throw new RangeError(
      'ordinary surrogate calibration does not match the frozen 16-seed identity',
    );
  }
  return calibrationSha256;
}

function assertCanonicalEvaluationSeeds(seeds: readonly number[]): void {
  for (const seed of seeds) v4DerivedSeed(seed, 'ordinaryBrain');
  const calibrationSeeds = new Set<number>(ORDINARY_CANONICAL_CALIBRATION_SEEDS);
  if (seeds.some((seed) => calibrationSeeds.has(seed))) {
    throw new RangeError(
      'ordinary V4 evaluation seeds may not overlap surrogate calibration seeds',
    );
  }
  if (
    seeds.length !== ORDINARY_CANONICAL_EVALUATION_SEEDS.length ||
    seeds.some((seed, index) => seed !== ORDINARY_CANONICAL_EVALUATION_SEEDS[index])
  ) {
    throw new RangeError(
      'ordinary V4 publication requires the exact canonical 64 seeds in source order',
    );
  }
}

function interventionEvidence(
  arm: OrdinaryV4Arm,
  calibrationSha256: string | null,
): OrdinaryV4InterventionEvidence {
  switch (arm) {
    case 'full-semantic-recurrent':
      return {
        semanticField: 'enabled-identity',
        goalsAttached: true,
        semanticRecurrenceEnabled: true,
        semanticRecurrenceActive: true,
        horizontalActionSource: 'live-neural',
        calibrationSha256: null,
      };
    case 'recurrence-disabled-current-input':
      return {
        semanticField: 'enabled-identity',
        goalsAttached: true,
        semanticRecurrenceEnabled: false,
        semanticRecurrenceActive: false,
        horizontalActionSource: 'live-neural',
        calibrationSha256: null,
      };
    case 'semantic-channel-cyclic-permutation':
      return {
        semanticField: 'enabled-cyclic',
        goalsAttached: true,
        semanticRecurrenceEnabled: true,
        semanticRecurrenceActive: true,
        horizontalActionSource: 'live-neural',
        calibrationSha256: null,
      };
    case 'goal-preserved-shared-field-disabled':
      return {
        semanticField: 'disabled-goal-preserved',
        goalsAttached: true,
        semanticRecurrenceEnabled: true,
        semanticRecurrenceActive: false,
        horizontalActionSource: 'live-neural',
        calibrationSha256: null,
      };
    case 'exact-legacy':
      return {
        semanticField: 'omitted-exact-legacy',
        goalsAttached: false,
        semanticRecurrenceEnabled: true,
        semanticRecurrenceActive: false,
        horizontalActionSource: 'live-neural',
        calibrationSha256: null,
      };
    case 'action-distribution-matched-surrogate':
      if (calibrationSha256 === null) {
        throw new TypeError('ordinary surrogate intervention requires its calibration identity');
      }
      return {
        semanticField: 'enabled-identity',
        goalsAttached: true,
        semanticRecurrenceEnabled: true,
        semanticRecurrenceActive: true,
        horizontalActionSource: 'frozen-calibrated-surrogate',
        calibrationSha256,
      };
  }
}

function runOrdinaryArm(
  seed: number,
  arm: OrdinaryV4Arm,
  calibration: V4OrdinarySurrogateCalibration | null,
  captureActions: boolean,
): InternalArmRun {
  assertArm(arm);
  const brainSeed = v4DerivedSeed(seed, 'ordinaryBrain');
  const brainRng = recordedMulberry32(brainSeed);
  const brain = new EntityBrainField(1, brainRng.rng);
  if (brainRng.tape.length !== GENOME_LEN) {
    throw new Error(`ordinary brain RNG draw count drifted: ${brainRng.tape.length}`);
  }
  brain.setOnlineLearningEnabled(ORDINARY_FIXTURE.onlineActorCriticLearning);

  const entity = createEntity();
  const goals = createGoalField();
  const genome = brain.genomeAt(0);
  const genomeSha256 = sha256Bytes(float32Bytes(genome));
  const initialPerceptSha256 = sha256Canonical({
    definition: 'ordinary-v4-pre-intervention-percept',
    baseSenses: [
      ORDINARY_FIXTURE.initialEntity.energy / 100,
      ORDINARY_FIXTURE.initialEntity.age / ORDINARY_FIXTURE.initialEntity.life,
      Math.hypot(...ORDINARY_FIXTURE.initialEntity.velocity) / 6,
      ORDINARY_FIXTURE.worldChaos / 10,
      genome[TRAIT.curiosity] ?? 0,
      Math.sin(ORDINARY_FIXTURE.initialEntity.ph + ORDINARY_FIXTURE.initialSimulationTime * 0.6),
    ],
    exogenousTapeSha256: ORDINARY_EXOGENOUS_PERCEPT_TAPE_SHA256,
  });
  const initialStateSha256 = sha256Canonical({
    entity: ORDINARY_FIXTURE.initialEntity,
    controller: {
      brainRngSeed: brainSeed,
      genomeSha256,
      genomeStorage: brain.genomeStorageKind(),
      genomeStorageBytes: brain.genomeStorageBytes(),
      semanticStorageBytes: brain.semanticStorageBytes(),
      onlineActorCriticLearning: ORDINARY_FIXTURE.onlineActorCriticLearning,
      adaptiveFieldAttached: false,
      goalFieldAttached: false,
      semanticRecurrenceEnabled: true,
    },
  });

  const surrogate = arm === 'action-distribution-matched-surrogate';
  if (surrogate && calibration === null) {
    throw new TypeError('the ordinary surrogate arm requires its frozen 16-seed calibration');
  }
  if (!surrogate && calibration !== null) {
    throw new TypeError('ordinary calibration is only valid for the surrogate arm');
  }
  const calibrationSha256 = surrogate ? assertCanonicalCalibration(calibration!) : null;
  const intervention = interventionEvidence(arm, calibrationSha256);
  const interventionSha256 = sha256Canonical(intervention);
  // Arm intervention happens only after the matched pre-intervention state above has been sealed.
  if (arm === 'recurrence-disabled-current-input') brain.setSemanticRecurrenceEnabled(false);
  const surrogateSeed = surrogate ? v4DerivedSeed(seed, 'ordinarySurrogate') : null;
  const surrogateRng = surrogateSeed === null ? null : recordedMulberry32(surrogateSeed);

  const trace: number[] = [];
  const horizontalActions: (readonly [number, number])[] = [];
  const allScores: number[] = [];
  const scoredScores: number[] = [];
  let scoredProjection = 0;
  let actionCount = 0;
  let magnitudeSum = 0;
  let maximumMagnitude = 0;
  let cueResourceContext = 0;
  let cueSteps = 0;
  let dropoutResourceContext = 0;
  let dropoutSteps = 0;
  const reversalRecoveries = ORDINARY_REVERSALS.map((reversal) => ({
    ...reversal,
    firstPositiveGoalAlignedVelocityStep: null as number | null,
  }));
  let activeReversalIndex = -1;

  for (const step of ORDINARY_STEPS) {
    const reversalIndex = ORDINARY_REVERSALS.findIndex(
      ({ reversalStep }) => reversalStep === step.index,
    );
    if (reversalIndex >= 0) activeReversalIndex = reversalIndex;
    goals.directionX[0] = step.goalX;
    goals.directionZ[0] = step.goalZ;
    goals.desire[0] = 1;
    goals.cover[0] = 1;
    goals.revision[0] = step.index + 1;

    const cyclic = arm === 'semantic-channel-cyclic-permutation';
    const signal = v4OrdinarySegmentSignal(step.resourceCue, cyclic);
    if (arm === 'goal-preserved-shared-field-disabled') {
      brain.attachAdaptiveField(null, goals);
    } else if (arm === 'exact-legacy') {
      brain.attachAdaptiveField(null, null);
    } else {
      brain.attachAdaptiveField(signal, goals);
    }

    const beforeX = entity.userData.vel.x;
    const beforeY = entity.userData.vel.y;
    const beforeZ = entity.userData.vel.z;
    brain.thinkAll([entity], ORDINARY_FIXTURE.worldChaos, step.time);

    let deltaX = entity.userData.vel.x - beforeX;
    let deltaZ = entity.userData.vel.z - beforeZ;
    if (surrogate) {
      const replacement = v4OrdinarySurrogateStep(calibration!, surrogateRng!.rng);
      deltaX = replacement[0];
      deltaZ = replacement[1];
      entity.userData.vel.x = beforeX + deltaX;
      entity.userData.vel.z = beforeZ + deltaZ;
    }
    const deltaY = entity.userData.vel.y - beforeY;
    const magnitude = Math.hypot(deltaX, deltaZ);
    const score = ordinaryActionScore(deltaX, deltaZ, step.goalX, step.goalZ);
    const projection = deltaX * step.goalX + deltaZ * step.goalZ;
    const goalAlignedVelocity =
      entity.userData.vel.x * step.goalX + entity.userData.vel.z * step.goalZ;
    const semantic = brain.semanticStateAt(0);

    const activeRecovery = reversalRecoveries[activeReversalIndex];
    if (
      activeRecovery !== undefined &&
      activeRecovery.firstPositiveGoalAlignedVelocityStep === null &&
      step.index < activeRecovery.windowEndStepExclusive &&
      goalAlignedVelocity > 0
    ) {
      activeRecovery.firstPositiveGoalAlignedVelocityStep = step.index;
    }

    allScores.push(score);
    if (step.score) {
      scoredScores.push(score);
      scoredProjection += projection;
      dropoutResourceContext += semantic.resource;
      dropoutSteps++;
    } else {
      cueResourceContext += semantic.resource;
      cueSteps++;
    }
    if (magnitude > V4_SURROGATE_CALIBRATION.nonZeroThreshold) actionCount++;
    magnitudeSum += magnitude;
    maximumMagnitude = Math.max(maximumMagnitude, magnitude);
    if (captureActions) horizontalActions.push([deltaX, deltaZ]);

    trace.push(
      step.index,
      step.segmentIndex,
      step.time,
      step.goalX,
      step.resourceCue,
      step.score ? 1 : 0,
      deltaX,
      deltaY,
      deltaZ,
      score,
      entity.userData.vel.x,
      entity.userData.vel.y,
      entity.userData.vel.z,
      entity.userData.act,
      semantic.resource,
      semantic.threat,
      semantic.exploration,
      semantic.social,
      semantic.ready ? 1 : 0,
    );
  }

  if (scoredScores.length === 0 || allScores.length !== ORDINARY_FIXTURE.totalSteps) {
    throw new Error('ordinary V4 evaluator produced an incomplete task trace');
  }
  const surrogateTape = surrogateRng?.tape ?? [];
  const hashes: OrdinaryV4HashBundle = {
    fixtureSha256: fixtureSha256(ORDINARY_V4_FAMILY_ID),
    initialStateSha256,
    initialGenomeSha256: genomeSha256,
    perceptSha256: initialPerceptSha256,
    goalScheduleSha256: ORDINARY_GOAL_SHA256,
    environmentRngTapeSha256: EMPTY_UINT32_SHA256,
    environmentRngDrawCount: 0,
    brainRngSeed: brainSeed,
    brainRngTapeSha256: sha256Uint32(brainRng.tape),
    brainRngDrawCount: brainRng.tape.length,
    surrogateRngSeed: surrogateSeed,
    surrogateRngTapeSha256: sha256Uint32(surrogateTape),
    surrogateRngDrawCount: surrogateTape.length,
    interventionSha256,
    calibrationSha256,
  };
  const secondaryOutcomes: OrdinaryV4SecondaryOutcomes = {
    totalSteps: allScores.length,
    scoredSteps: scoredScores.length,
    allStepMeanActionScore: mean(allScores),
    scoredMeanGoalProjection: scoredProjection / scoredScores.length,
    actionFrequency: actionCount / allScores.length,
    meanHorizontalActionMagnitude: magnitudeSum / allScores.length,
    maximumHorizontalActionMagnitude: maximumMagnitude,
    cueMeanResourceContext: cueResourceContext / Math.max(1, cueSteps),
    dropoutMeanResourceContext: dropoutResourceContext / Math.max(1, dropoutSteps),
    goalAlignedVelocityRecovery: {
      definition:
        'first post-action step in each goal regime with velocity dot newGoal > 0; recoverySteps = firstPositiveStep - reversalStep; null is right-censored at the next reversal or task end',
      reversalCount: reversalRecoveries.length,
      recoveredCount: reversalRecoveries.filter(
        ({ firstPositiveGoalAlignedVelocityStep }) => firstPositiveGoalAlignedVelocityStep !== null,
      ).length,
      perReversal: reversalRecoveries.map((reversal) => {
        const first = reversal.firstPositiveGoalAlignedVelocityStep;
        const recoverySteps = first === null ? null : first - reversal.reversalStep;
        return {
          ...reversal,
          recoverySteps,
          recoverySeconds:
            recoverySteps === null ? null : recoverySteps / ORDINARY_FIXTURE.simulationHz,
          censored: first === null,
        };
      }),
    },
    finalHorizontalSpeed: Math.hypot(entity.userData.vel.x, entity.userData.vel.z),
    finalVerticalVelocity: entity.userData.vel.y,
    finalActivation: entity.userData.act,
  };
  const primaryOutcome = mean(scoredScores);
  const replayFingerprint = traceFingerprint(
    {
      protocolVersion: V4_PROTOCOL_VERSION,
      family: ORDINARY_V4_FAMILY_ID,
      controllerType: 'neural',
      seed,
      arm,
      primaryOutcome,
      secondaryOutcomes,
      intervention,
      hashes,
    },
    trace,
  );

  return {
    result: {
      protocolVersion: V4_PROTOCOL_VERSION,
      family: ORDINARY_V4_FAMILY_ID,
      controllerType: 'neural',
      seed,
      arm,
      primaryOutcome,
      secondaryOutcomes,
      intervention,
      hashes,
      replayFingerprint,
    },
    horizontalActions,
  };
}

/** Run one declared ordinary arm. The surrogate arm requires the frozen calibration payload. */
export function evaluateOrdinaryV4Arm(
  seed: number,
  arm: OrdinaryV4Arm,
  calibration: V4OrdinarySurrogateCalibration | null = null,
): OrdinaryV4ArmResult {
  v4DerivedSeed(seed, 'ordinaryBrain');
  return runOrdinaryArm(seed, arm, calibration, false).result;
}

/**
 * Build the frozen action-distribution surrogate from full-arm actions on all 16 disjoint calibration
 * seeds. The complete sorted magnitude distribution is returned so later runs do not approximate it.
 */
export function calibrateOrdinaryV4Surrogate(): OrdinaryV4SurrogateCalibrationResult {
  const actions: (readonly [number, number])[] = [];
  const sourceReplayFingerprints: string[] = [];
  for (const seed of ORDINARY_CANONICAL_CALIBRATION_SEEDS) {
    const run = runOrdinaryArm(seed, 'full-semantic-recurrent', null, true);
    actions.push(...run.horizontalActions);
    sourceReplayFingerprints.push(run.result.replayFingerprint);
  }
  const calibration = v4CalibrateOrdinarySurrogate(actions);
  const calibrationSha256 = calibrationSha256For(calibration);
  if (calibrationSha256 !== ORDINARY_V4_CALIBRATION_SHA256) {
    throw new Error('ordinary 16-seed calibration drifted from its frozen identity');
  }
  const replayFingerprint = sha256Canonical({
    calibrationSha256,
    sourceReplayFingerprints,
  });
  return {
    protocolVersion: V4_PROTOCOL_VERSION,
    family: ORDINARY_V4_FAMILY_ID,
    sourceArm: 'full-semantic-recurrent',
    sourceSeeds: [...ORDINARY_CANONICAL_CALIBRATION_SEEDS],
    actionVectorCount: actions.length,
    calibration,
    calibrationSha256,
    sourceReplayFingerprints,
    replayFingerprint,
  };
}

/** Run all six declared arms for one seed in frozen source order. */
export function evaluateOrdinaryV4Seed(
  seed: number,
  calibration: V4OrdinarySurrogateCalibration,
): OrdinaryV4SeedResult {
  v4DerivedSeed(seed, 'ordinaryBrain');
  assertCanonicalCalibration(calibration);
  const arms = ORDINARY_V4_ARMS.map(
    (arm) =>
      runOrdinaryArm(
        seed,
        arm,
        arm === 'action-distribution-matched-surrogate' ? calibration : null,
        false,
      ).result,
  );
  return {
    protocolVersion: V4_PROTOCOL_VERSION,
    family: ORDINARY_V4_FAMILY_ID,
    seed,
    fixtureSha256: fixtureSha256(ORDINARY_V4_FAMILY_ID),
    arms,
    replayFingerprint: sha256Canonical({
      seed,
      arms: arms.map(({ arm, replayFingerprint }) => [arm, replayFingerprint]),
    }),
  };
}

/** Run the complete ordinary V4 family without writing a result artifact. */
export function evaluateOrdinaryV4(
  seeds: readonly number[] = ORDINARY_CANONICAL_EVALUATION_SEEDS,
): OrdinaryV4EvaluationResult {
  assertCanonicalEvaluationSeeds(seeds);
  const calibration = calibrateOrdinaryV4Surrogate();
  const results = seeds.map((seed) => evaluateOrdinaryV4Seed(seed, calibration.calibration));
  const seedList = [...seeds];
  return {
    protocolVersion: V4_PROTOCOL_VERSION,
    family: ORDINARY_V4_FAMILY_ID,
    fixtureSha256: fixtureSha256(ORDINARY_V4_FAMILY_ID),
    seeds: seedList,
    calibration,
    results,
    replayFingerprint: sha256Canonical({
      calibration: calibration.replayFingerprint,
      seeds: seedList,
      results: results.map(({ seed, replayFingerprint }) => [seed, replayFingerprint]),
    }),
  };
}
