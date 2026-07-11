/**
 * DEVELOPMENT-ONLY delayed-resource-choice harness for the ordinary-organism resource head.
 *
 * This pure runner writes no artifacts, imports no frozen evaluator, defines no pass threshold, and
 * authorizes no claim. It exists to expose mechanism failures before any Phase-B protocol is frozen.
 * Every scheduled trial contains two opposite cues, an inertially reset and input-masked delay, then
 * two visually identical patches. Exactly one finite food unit belongs to the resource-cued patch.
 */

import { mulberry32 } from '../../src/math/rng';
import {
  EntityResourceHead,
  type EntityResourceHeadObservation,
  type EntityResourceHeadTier,
} from '../../src/sim/entity-resource-head';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  PHASE_B_DEVELOPMENT_SEEDS,
} from './development-seeds';

export const ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION = 1 as const;
export const ORDINARY_RESOURCE_DEVELOPMENT_DELAYS = Object.freeze([30, 90, 180] as const);
export const ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS = 4;
export const ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS = 180;
export const ORDINARY_RESOURCE_DEVELOPMENT_TRIALS_PER_SEED = 12;

export const ORDINARY_RESOURCE_DEVELOPMENT_ARMS = Object.freeze([
  'full-h4',
  'recurrence-disabled-h4',
  'state-reset-at-delay-h4',
  'cyclic-semantics-h4',
  'field-disabled-physics-h4',
  'reward-shuffled-h4',
  'legacy-zero-action',
  'full-h2-diagnostic',
  'full-h8-diagnostic',
] as const);

export type OrdinaryResourceDevelopmentArmId = (typeof ORDINARY_RESOURCE_DEVELOPMENT_ARMS)[number];
export type OrdinaryResourceDevelopmentRole = 'train' | 'validation';
export type OrdinaryResourceCueOrder = 'resource-then-threat' | 'threat-then-resource';

const DT_SECONDS = 1 / 60;
const PATCH_DISTANCE = 1.1;
const PATCH_RADIUS = 0.24;
const PATCH_VISUAL_DESCRIPTOR = Object.freeze({
  shape: 'disc',
  radius: PATCH_RADIUS,
  luminance: 0.62,
  hue: 0.31,
  texture: 'phase-b-development-identical-v1',
});
const FOOD_PER_TRIAL = 1;
const INITIAL_ENERGY = 1;
const FOOD_ENERGY_GAIN = 0.2;
const BASE_ENERGY_COST = 0.00035;
const MOTION_ENERGY_COST = 0.00055;
const ACCELERATION = 0.035;
const VELOCITY_DAMPING = 0.91;
const MAX_SPEED = 0.08;
const WORLD_BOUND = 1.6;
const POST_OUTCOME_SHUFFLE_CUE_STEPS = 4;

interface ArmDescriptor {
  readonly id: OrdinaryResourceDevelopmentArmId;
  readonly tier: EntityResourceHeadTier | null;
  readonly recurrenceEnabled: boolean;
  readonly resetAtDelay: boolean;
  readonly semantics: 'identity' | 'cyclic' | 'disabled';
  readonly rewardAssociation: 'causal-action' | 'surrogate-post-outcome' | 'none';
  readonly controller: 'resource-head' | 'zero-action';
  readonly diagnosticTier: boolean;
}

const ARM_DESCRIPTORS: readonly ArmDescriptor[] = Object.freeze([
  descriptor('full-h4', 4),
  descriptor('recurrence-disabled-h4', 4, { recurrenceEnabled: false }),
  descriptor('state-reset-at-delay-h4', 4, { resetAtDelay: true }),
  descriptor('cyclic-semantics-h4', 4, { semantics: 'cyclic' }),
  descriptor('field-disabled-physics-h4', 4, { semantics: 'disabled' }),
  descriptor('reward-shuffled-h4', 4, { rewardAssociation: 'surrogate-post-outcome' }),
  {
    id: 'legacy-zero-action',
    tier: null,
    recurrenceEnabled: false,
    resetAtDelay: false,
    semantics: 'disabled',
    rewardAssociation: 'none',
    controller: 'zero-action',
    diagnosticTier: true,
  },
  descriptor('full-h2-diagnostic', 2, { diagnosticTier: true }),
  descriptor('full-h8-diagnostic', 8, { diagnosticTier: true }),
]);

function descriptor(
  id: OrdinaryResourceDevelopmentArmId,
  tier: EntityResourceHeadTier,
  overrides: Partial<
    Pick<
      ArmDescriptor,
      'recurrenceEnabled' | 'resetAtDelay' | 'semantics' | 'rewardAssociation' | 'diagnosticTier'
    >
  > = {},
): ArmDescriptor {
  return {
    id,
    tier,
    recurrenceEnabled: overrides.recurrenceEnabled ?? true,
    resetAtDelay: overrides.resetAtDelay ?? false,
    semantics: overrides.semantics ?? 'identity',
    rewardAssociation: overrides.rewardAssociation ?? 'causal-action',
    controller: 'resource-head',
    diagnosticTier: overrides.diagnosticTier ?? id === 'full-h4',
  };
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
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  throw new TypeError(`canonical JSON rejects ${typeof value}`);
}

function hashCanonical(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalJson(value)).digest('hex');
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0_aaad) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a_2d97) >>> 0;
  return (mixed ^ (mixed >>> 15)) >>> 0;
}

function counterUnit(seed: number, counter: number): number {
  return mix32(seed ^ Math.imul(counter + 1, 0x9e37_79b1)) / 0x1_0000_0000;
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

export interface OrdinaryResourceDevelopmentTrial {
  readonly role: OrdinaryResourceDevelopmentRole;
  readonly familySeed: number;
  readonly withinSeedIndex: number;
  readonly delaySteps: (typeof ORDINARY_RESOURCE_DEVELOPMENT_DELAYS)[number];
  readonly cueOrder: OrdinaryResourceCueOrder;
  readonly targetBearingSign: -1 | 1;
  readonly resourceBearingX: number;
  readonly resourceBearingZ: number;
  readonly threatBearingX: number;
  readonly threatBearingZ: number;
  readonly scheduleSha256: string;
}

interface TrialCondition {
  delaySteps: (typeof ORDINARY_RESOURCE_DEVELOPMENT_DELAYS)[number];
  cueOrder: OrdinaryResourceCueOrder;
  targetBearingSign: -1 | 1;
}

/** Build all 3 × 2 × 2 strata for every seed, then deterministically permute only their order. */
export function buildOrdinaryResourceDevelopmentTrials(
  seeds: readonly number[],
  role: OrdinaryResourceDevelopmentRole,
): readonly OrdinaryResourceDevelopmentTrial[] {
  assertCanonicalFamilySubset(
    seeds,
    role === 'train'
      ? PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain
      : PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation,
    `ordinary ${role} schedule`,
  );
  const trials: OrdinaryResourceDevelopmentTrial[] = [];
  for (const familySeed of seeds) {
    assertPhaseBDevelopmentSeed(familySeed);
    const conditions: TrialCondition[] = [];
    for (const delaySteps of ORDINARY_RESOURCE_DEVELOPMENT_DELAYS) {
      for (const targetBearingSign of [-1, 1] as const) {
        for (const cueOrder of ['resource-then-threat', 'threat-then-resource'] as const) {
          conditions.push({ delaySteps, cueOrder, targetBearingSign });
        }
      }
    }
    const rng = mulberry32(mix32(familySeed ^ (role === 'train' ? 0x71a1_0001 : 0x7a11_0002)));
    for (let i = conditions.length - 1; i > 0; i--) {
      const other = Math.floor(rng() * (i + 1));
      const held = conditions[i]!;
      conditions[i] = conditions[other]!;
      conditions[other] = held;
    }

    const axisAngle = counterUnit(familySeed, role === 'train' ? 41 : 43) * Math.PI * 2;
    const axisX = Math.cos(axisAngle);
    const axisZ = Math.sin(axisAngle);
    for (let withinSeedIndex = 0; withinSeedIndex < conditions.length; withinSeedIndex++) {
      const condition = conditions[withinSeedIndex]!;
      const resourceBearingX = axisX * condition.targetBearingSign;
      const resourceBearingZ = axisZ * condition.targetBearingSign;
      const schedule = {
        version: ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION,
        role,
        familySeed,
        withinSeedIndex,
        ...condition,
        resourceBearing: [resourceBearingX, resourceBearingZ],
        threatBearing: [-resourceBearingX, -resourceBearingZ],
        cueStepsEach: ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS,
        delayMask: 'semantic-and-goal-zero-with-inertial-reset',
        choiceSteps: ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
        patchVisual: PATCH_VISUAL_DESCRIPTOR,
        availableFood: FOOD_PER_TRIAL,
      };
      trials.push({
        role,
        familySeed,
        withinSeedIndex,
        ...condition,
        resourceBearingX,
        resourceBearingZ,
        threatBearingX: -resourceBearingX,
        threatBearingZ: -resourceBearingZ,
        scheduleSha256: hashCanonical(schedule),
      });
    }
  }
  return trials;
}

export interface OrdinaryResourceDevelopmentInputAudit {
  readonly cueObservationCount: number;
  readonly delayObservationCount: number;
  readonly choiceObservationCount: number;
  readonly delaySemanticAbsoluteMax: number;
  readonly delayGoalAbsoluteMax: number;
  readonly choiceSemanticAbsoluteMax: number;
  readonly choiceGoalAbsoluteMax: number;
  readonly postOutcomeTrainingObservationCount: number;
  readonly patchVisualSha256: string;
  readonly resourcePatchVisualSha256: string;
  readonly threatPatchVisualSha256: string;
}

export interface OrdinaryResourceDevelopmentRow {
  readonly schemaVersion: typeof ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION;
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly armId: OrdinaryResourceDevelopmentArmId;
  readonly role: OrdinaryResourceDevelopmentRole;
  readonly familySeed: number;
  readonly withinSeedIndex: number;
  readonly modelSeed: number | null;
  readonly surrogateAssociationSeed: number | null;
  readonly tier: EntityResourceHeadTier | null;
  readonly resourceHeadParameterCount: number;
  readonly intendedTotalWithLegacy: number;
  readonly delaySteps: number;
  readonly cueOrder: OrdinaryResourceCueOrder;
  readonly targetBearingSign: -1 | 1;
  readonly resourceBearingX: number;
  readonly resourceBearingZ: number;
  readonly threatBearingX: number;
  readonly threatBearingZ: number;
  readonly scheduleSha256: string;
  readonly inputAudit: OrdinaryResourceDevelopmentInputAudit;
  readonly availableFood: 1;
  readonly acquiredFood: 0 | 1;
  readonly foodRemaining: 0 | 1;
  readonly resourceConserved: true;
  readonly resourcePatchContacted: boolean;
  readonly threatPatchContacted: boolean;
  readonly firstPatchContact: 'resource' | 'threat' | null;
  readonly primaryOutcome: number;
  readonly firstFoodTimeSteps: number | null;
  readonly pathEfficiency: number;
  readonly endEnergy: number;
  readonly survived: boolean;
  readonly rewardApplied: boolean;
  readonly rewardAssociation: ArmDescriptor['rewardAssociation'];
  readonly replaySha256: string;
}

interface MutableAgent {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  energy: number;
  pathLength: number;
}

interface RevisionCounter {
  value: number;
}

function clearTemporalState(head: EntityResourceHead, recurrenceEnabled: boolean): void {
  head.setRecurrenceEnabled(!recurrenceEnabled);
  head.setRecurrenceEnabled(recurrenceEnabled);
}

function observe(
  head: EntityResourceHead,
  revision: RevisionCounter,
  values: Omit<EntityResourceHeadObservation, 'revision'>,
): void {
  head.observe({ ...values, revision: revision.value++ });
}

function maskedObservation(
  agent: Readonly<MutableAgent>,
): Omit<EntityResourceHeadObservation, 'revision'> {
  return {
    dtSeconds: DT_SECONDS,
    resource: 0,
    threat: 0,
    exploration: 0,
    social: 0,
    goalX: 0,
    goalZ: 0,
    desire: 0,
    cover: 0,
    energy: agent.energy,
    speed: Math.hypot(agent.velocityX, agent.velocityZ) / MAX_SPEED,
  };
}

function cueObservation(
  descriptor: ArmDescriptor,
  cue: 'resource' | 'threat',
  bearingX: number,
  bearingZ: number,
  energy: number,
): Omit<EntityResourceHeadObservation, 'revision'> {
  let resource = cue === 'resource' ? 1 : 0;
  let threat = cue === 'threat' ? 1 : 0;
  let exploration = 0;
  let goalX = bearingX;
  let goalZ = bearingZ;
  let desire = 1;
  let cover = 1;
  if (descriptor.semantics === 'cyclic') {
    exploration = threat;
    threat = resource;
    resource = 0;
  } else if (descriptor.semantics === 'disabled') {
    resource = 0;
    threat = 0;
    exploration = 0;
    goalX = 0;
    goalZ = 0;
    desire = 0;
    cover = 0;
  }
  return {
    dtSeconds: DT_SECONDS,
    resource,
    threat,
    exploration,
    social: 0,
    goalX,
    goalZ,
    desire,
    cover,
    energy,
    speed: 0,
  };
}

function semanticAbsoluteMax(observation: Omit<EntityResourceHeadObservation, 'revision'>): number {
  return Math.max(
    Math.abs(observation.resource),
    Math.abs(observation.threat),
    Math.abs(observation.exploration),
    Math.abs(observation.social),
  );
}

function goalAbsoluteMax(observation: Omit<EntityResourceHeadObservation, 'revision'>): number {
  return Math.max(
    Math.abs(observation.goalX),
    Math.abs(observation.goalZ),
    Math.abs(observation.desire),
    Math.abs(observation.cover),
  );
}

function appendTrace(
  hasher: Bun.CryptoHasher,
  phase: string,
  step: number,
  agent: Readonly<MutableAgent>,
  actionX: number,
  actionZ: number,
): void {
  hasher.update(
    `${phase}|${step}|${agent.x}|${agent.z}|${agent.velocityX}|${agent.velocityZ}|${agent.energy}|${actionX}|${actionZ};`,
  );
}

function runTrial(
  trial: OrdinaryResourceDevelopmentTrial,
  descriptor: ArmDescriptor,
  head: EntityResourceHead | null,
  revision: RevisionCounter,
  modelSeed: number,
  surrogateSeeds: readonly number[],
  globalTrialIndex: number,
): OrdinaryResourceDevelopmentRow {
  const agent: MutableAgent = {
    x: 0,
    z: 0,
    velocityX: 0,
    velocityZ: 0,
    energy: INITIAL_ENERGY,
    pathLength: 0,
  };
  if (head !== null) clearTemporalState(head, descriptor.recurrenceEnabled);
  const trace = new Bun.CryptoHasher('sha256');
  const cues =
    trial.cueOrder === 'resource-then-threat'
      ? (['resource', 'threat'] as const)
      : (['threat', 'resource'] as const);

  for (const cue of cues) {
    const bearingX = cue === 'resource' ? trial.resourceBearingX : trial.threatBearingX;
    const bearingZ = cue === 'resource' ? trial.resourceBearingZ : trial.threatBearingZ;
    for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS; step++) {
      if (head !== null) {
        observe(head, revision, cueObservation(descriptor, cue, bearingX, bearingZ, agent.energy));
        const action = head.readAction();
        appendTrace(trace, cue, step, agent, action.x, action.z);
      } else {
        appendTrace(trace, cue, step, agent, 0, 0);
      }
    }
  }

  // Inertial/position reset: cue-period motion can never carry the answer into the delay.
  agent.x = 0;
  agent.z = 0;
  agent.velocityX = 0;
  agent.velocityZ = 0;
  if (head !== null && descriptor.resetAtDelay) {
    clearTemporalState(head, descriptor.recurrenceEnabled);
  }
  let delaySemanticAbsoluteMax = 0;
  let delayGoalAbsoluteMax = 0;
  for (let step = 0; step < trial.delaySteps; step++) {
    const input = maskedObservation(agent);
    delaySemanticAbsoluteMax = Math.max(delaySemanticAbsoluteMax, semanticAbsoluteMax(input));
    delayGoalAbsoluteMax = Math.max(delayGoalAbsoluteMax, goalAbsoluteMax(input));
    if (head !== null) {
      observe(head, revision, input);
      const action = head.readAction();
      appendTrace(trace, 'delay-mask', step, agent, action.x, action.z);
    } else {
      appendTrace(trace, 'delay-mask', step, agent, 0, 0);
    }
  }

  // A second inertial reset closes the physical-memory route created by masked-period actions.
  agent.x = 0;
  agent.z = 0;
  agent.velocityX = 0;
  agent.velocityZ = 0;
  const resourcePatchX = trial.resourceBearingX * PATCH_DISTANCE;
  const resourcePatchZ = trial.resourceBearingZ * PATCH_DISTANCE;
  const threatPatchX = trial.threatBearingX * PATCH_DISTANCE;
  const threatPatchZ = trial.threatBearingZ * PATCH_DISTANCE;
  let foodRemaining: 0 | 1 = 1;
  let acquiredFood: 0 | 1 = 0;
  let resourcePatchContacted = false;
  let threatPatchContacted = false;
  let firstPatchContact: 'resource' | 'threat' | null = null;
  let firstFoodTimeSteps: number | null = null;
  let rewardApplied = false;
  let surrogateAssociationSeed: number | null = null;
  let postOutcomeTrainingObservationCount = 0;
  let choiceSemanticAbsoluteMax = 0;
  let choiceGoalAbsoluteMax = 0;

  for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS; step++) {
    let actionX = 0;
    let actionZ = 0;
    const input = maskedObservation(agent);
    choiceSemanticAbsoluteMax = Math.max(choiceSemanticAbsoluteMax, semanticAbsoluteMax(input));
    choiceGoalAbsoluteMax = Math.max(choiceGoalAbsoluteMax, goalAbsoluteMax(input));
    if (head !== null) {
      observe(head, revision, input);
      const action = head.readAction();
      actionX = action.x;
      actionZ = action.z;
    }

    if (agent.energy > 0) {
      agent.velocityX = clamp(
        agent.velocityX * VELOCITY_DAMPING + actionX * ACCELERATION,
        -MAX_SPEED,
        MAX_SPEED,
      );
      agent.velocityZ = clamp(
        agent.velocityZ * VELOCITY_DAMPING + actionZ * ACCELERATION,
        -MAX_SPEED,
        MAX_SPEED,
      );
      const priorX = agent.x;
      const priorZ = agent.z;
      agent.x = clamp(agent.x + agent.velocityX, -WORLD_BOUND, WORLD_BOUND);
      agent.z = clamp(agent.z + agent.velocityZ, -WORLD_BOUND, WORLD_BOUND);
      const distance = Math.hypot(agent.x - priorX, agent.z - priorZ);
      agent.pathLength += distance;
      agent.energy = clamp01(
        agent.energy - BASE_ENERGY_COST - MOTION_ENERGY_COST * (distance / MAX_SPEED),
      );
    }
    appendTrace(trace, 'choice-mask', step, agent, actionX, actionZ);

    const resourceDistance = Math.hypot(agent.x - resourcePatchX, agent.z - resourcePatchZ);
    const threatDistance = Math.hypot(agent.x - threatPatchX, agent.z - threatPatchZ);
    if (threatDistance <= PATCH_RADIUS) {
      threatPatchContacted = true;
      firstPatchContact ??= 'threat';
    }
    if (foodRemaining === 1 && resourceDistance <= PATCH_RADIUS) {
      resourcePatchContacted = true;
      firstPatchContact ??= 'resource';
      foodRemaining = 0;
      acquiredFood = 1;
      firstFoodTimeSteps = step + 1;
      agent.energy = clamp01(agent.energy + FOOD_ENERGY_GAIN);
      if (trial.role === 'train' && head !== null && descriptor.rewardAssociation !== 'none') {
        if (descriptor.rewardAssociation === 'surrogate-post-outcome') {
          surrogateAssociationSeed = surrogateSeeds[globalTrialIndex % surrogateSeeds.length]!;
          const angle = counterUnit(surrogateAssociationSeed, globalTrialIndex + 101) * Math.PI * 2;
          clearTemporalState(head, descriptor.recurrenceEnabled);
          for (
            let associationStep = 0;
            associationStep < POST_OUTCOME_SHUFFLE_CUE_STEPS;
            associationStep++
          ) {
            observe(
              head,
              revision,
              cueObservation(
                { ...descriptor, semantics: 'identity' },
                'resource',
                Math.cos(angle),
                Math.sin(angle),
                agent.energy,
              ),
            );
            postOutcomeTrainingObservationCount++;
          }
        }
        head.applyFoodReward(head.readAction().revision, FOOD_PER_TRIAL);
        rewardApplied = true;
      }
    }
  }

  const availableFood = FOOD_PER_TRIAL;
  if (acquiredFood + foodRemaining !== availableFood) {
    throw new Error('ordinary development resource conservation failed');
  }
  const primaryOutcome = acquiredFood / availableFood;
  const directDistance = Math.max(0, PATCH_DISTANCE - PATCH_RADIUS);
  const pathEfficiency = acquiredFood === 1 ? clamp01(directDistance / agent.pathLength) : 0;
  const patchVisualSha256 = hashCanonical(PATCH_VISUAL_DESCRIPTOR);
  const inputAudit: OrdinaryResourceDevelopmentInputAudit = {
    cueObservationCount: ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS * 2,
    delayObservationCount: trial.delaySteps,
    choiceObservationCount: ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
    delaySemanticAbsoluteMax,
    delayGoalAbsoluteMax,
    choiceSemanticAbsoluteMax,
    choiceGoalAbsoluteMax,
    postOutcomeTrainingObservationCount,
    patchVisualSha256,
    resourcePatchVisualSha256: patchVisualSha256,
    threatPatchVisualSha256: patchVisualSha256,
  };
  const resourceHeadParameterCount = head?.parameterCount() ?? 0;
  const intendedTotalWithLegacy = head?.totalParameterCount() ?? 70;
  const replaySha256 = hashCanonical({
    armId: descriptor.id,
    role: trial.role,
    scheduleSha256: trial.scheduleSha256,
    traceSha256: trace.digest('hex'),
    acquiredFood,
    foodRemaining,
    resourcePatchContacted,
    threatPatchContacted,
    firstPatchContact,
    firstFoodTimeSteps,
    pathEfficiency,
    endEnergy: agent.energy,
    rewardApplied,
    surrogateAssociationSeed,
  });

  return {
    schemaVersion: ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION,
    developmentOnly: true,
    claimAllowed: false,
    armId: descriptor.id,
    role: trial.role,
    familySeed: trial.familySeed,
    withinSeedIndex: trial.withinSeedIndex,
    modelSeed: head === null ? null : modelSeed,
    surrogateAssociationSeed,
    tier: descriptor.tier,
    resourceHeadParameterCount,
    intendedTotalWithLegacy,
    delaySteps: trial.delaySteps,
    cueOrder: trial.cueOrder,
    targetBearingSign: trial.targetBearingSign,
    resourceBearingX: trial.resourceBearingX,
    resourceBearingZ: trial.resourceBearingZ,
    threatBearingX: trial.threatBearingX,
    threatBearingZ: trial.threatBearingZ,
    scheduleSha256: trial.scheduleSha256,
    inputAudit,
    availableFood: 1,
    acquiredFood,
    foodRemaining,
    resourceConserved: true,
    resourcePatchContacted,
    threatPatchContacted,
    firstPatchContact,
    primaryOutcome,
    firstFoodTimeSteps,
    pathEfficiency,
    endEnergy: agent.energy,
    survived: agent.energy > 0,
    rewardApplied,
    rewardAssociation: descriptor.rewardAssociation,
    replaySha256,
  };
}

export interface OrdinaryResourceDevelopmentAggregate {
  readonly armId: OrdinaryResourceDevelopmentArmId;
  readonly role: OrdinaryResourceDevelopmentRole;
  readonly rowCount: number;
  readonly acquiredFood: number;
  readonly availableFood: number;
  readonly meanPrimaryOutcome: number;
  readonly meanFirstFoodTimeSteps: number | null;
  readonly meanPathEfficiency: number;
  readonly meanEndEnergy: number;
  readonly survivalRate: number;
  readonly rewardAppliedCount: number;
}

export interface OrdinaryResourceDevelopmentArmSummary {
  readonly armId: OrdinaryResourceDevelopmentArmId;
  readonly tier: EntityResourceHeadTier | null;
  readonly resourceHeadParameterCount: number;
  readonly intendedTotalWithLegacy: number;
  readonly parametersBeforeTrainingSha256: string | null;
  readonly parametersAfterTrainingSha256: string | null;
  readonly parametersAfterValidationSha256: string | null;
  readonly validationReadoutUnchanged: boolean;
}

export interface OrdinaryResourceDevelopmentSummary {
  readonly schemaVersion: typeof ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION;
  readonly studyId: 'ordinary-resource-head-phase-b-development-v1';
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly thresholdDefined: false;
  readonly negativeResultsRetained: true;
  readonly trainSeeds: readonly number[];
  readonly validationSeeds: readonly number[];
  readonly surrogateSeeds: readonly number[];
  readonly armCount: number;
  readonly trainTrialCountPerArm: number;
  readonly validationTrialCountPerArm: number;
  readonly rowCount: number;
  readonly rowsFilteredByOutcome: 0;
  readonly configurationSha256: string;
  readonly rowsSha256: string;
  readonly aggregates: readonly OrdinaryResourceDevelopmentAggregate[];
  readonly arms: readonly OrdinaryResourceDevelopmentArmSummary[];
}

export interface OrdinaryResourceDevelopmentStudy {
  readonly summary: OrdinaryResourceDevelopmentSummary;
  readonly rows: readonly OrdinaryResourceDevelopmentRow[];
}

export interface RunOrdinaryResourceDevelopmentOptions {
  /** Focused tests may use canonical-family prefixes; arbitrary or historical seeds are rejected. */
  readonly trainSeeds?: readonly number[];
  readonly validationSeeds?: readonly number[];
  readonly surrogateSeeds?: readonly number[];
}

function assertCanonicalFamilySubset(
  selected: readonly number[],
  canonical: readonly number[],
  label: string,
): void {
  if (selected.length === 0) throw new RangeError(`${label} requires at least one seed`);
  const allowed = new Set(canonical);
  for (const seed of selected) {
    assertPhaseBDevelopmentSeed(seed);
    if (!allowed.has(seed))
      throw new RangeError(`${label} seed ${seed} is outside its frozen family`);
  }
}

function aggregate(
  rows: readonly OrdinaryResourceDevelopmentRow[],
): OrdinaryResourceDevelopmentAggregate[] {
  const aggregates: OrdinaryResourceDevelopmentAggregate[] = [];
  for (const armId of ORDINARY_RESOURCE_DEVELOPMENT_ARMS) {
    for (const role of ['train', 'validation'] as const) {
      const selected = rows.filter((row) => row.armId === armId && row.role === role);
      if (selected.length === 0)
        throw new Error(`ordinary development aggregate is empty: ${armId}/${role}`);
      const foodTimes = selected
        .map((row) => row.firstFoodTimeSteps)
        .filter((value): value is number => value !== null);
      aggregates.push({
        armId,
        role,
        rowCount: selected.length,
        acquiredFood: selected.reduce((total, row) => total + row.acquiredFood, 0),
        availableFood: selected.reduce((total, row) => total + row.availableFood, 0),
        meanPrimaryOutcome: mean(selected.map((row) => row.primaryOutcome)),
        meanFirstFoodTimeSteps: foodTimes.length === 0 ? null : mean(foodTimes),
        meanPathEfficiency: mean(selected.map((row) => row.pathEfficiency)),
        meanEndEnergy: mean(selected.map((row) => row.endEnergy)),
        survivalRate: mean(selected.map((row) => (row.survived ? 1 : 0))),
        rewardAppliedCount: selected.filter((row) => row.rewardApplied).length,
      });
    }
  }
  return aggregates;
}

/** Execute the complete fixed development matrix in memory. No row is filtered by its outcome. */
export function runOrdinaryResourceDevelopment(
  options: RunOrdinaryResourceDevelopmentOptions = {},
): OrdinaryResourceDevelopmentStudy {
  const trainSeeds = options.trainSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain;
  const validationSeeds = options.validationSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation;
  const surrogateSeeds = options.surrogateSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate;
  assertCanonicalFamilySubset(
    trainSeeds,
    PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain,
    'ordinary train',
  );
  assertCanonicalFamilySubset(
    validationSeeds,
    PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation,
    'ordinary validation',
  );
  assertCanonicalFamilySubset(
    surrogateSeeds,
    PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate,
    'ordinary surrogate',
  );
  assertDisjointPhaseBDevelopmentFamilies({ trainSeeds, validationSeeds, surrogateSeeds });

  const trainTrials = buildOrdinaryResourceDevelopmentTrials(trainSeeds, 'train');
  const validationTrials = buildOrdinaryResourceDevelopmentTrials(validationSeeds, 'validation');
  const modelSeed = surrogateSeeds[0]!;
  const rows: OrdinaryResourceDevelopmentRow[] = [];
  const armSummaries: OrdinaryResourceDevelopmentArmSummary[] = [];

  for (const arm of ARM_DESCRIPTORS) {
    const head = arm.tier === null ? null : new EntityResourceHead(modelSeed, arm.tier);
    if (head !== null) {
      head.setRecurrenceEnabled(arm.recurrenceEnabled);
      head.setOnlineLearningEnabled(true);
    }
    const revision: RevisionCounter = { value: 0 };
    const parametersBeforeTrainingSha256 =
      head === null ? null : hashCanonical(head.snapshot().parameters);
    for (let index = 0; index < trainTrials.length; index++) {
      rows.push(
        runTrial(trainTrials[index]!, arm, head, revision, modelSeed, surrogateSeeds, index),
      );
    }
    const parametersAfterTrainingSha256 =
      head === null ? null : hashCanonical(head.snapshot().parameters);
    if (head !== null) head.setOnlineLearningEnabled(false);
    for (let index = 0; index < validationTrials.length; index++) {
      rows.push(
        runTrial(
          validationTrials[index]!,
          arm,
          head,
          revision,
          modelSeed,
          surrogateSeeds,
          trainTrials.length + index,
        ),
      );
    }
    const parametersAfterValidationSha256 =
      head === null ? null : hashCanonical(head.snapshot().parameters);
    armSummaries.push({
      armId: arm.id,
      tier: arm.tier,
      resourceHeadParameterCount: head?.parameterCount() ?? 0,
      intendedTotalWithLegacy: head?.totalParameterCount() ?? 70,
      parametersBeforeTrainingSha256,
      parametersAfterTrainingSha256,
      parametersAfterValidationSha256,
      validationReadoutUnchanged: parametersAfterTrainingSha256 === parametersAfterValidationSha256,
    });
  }

  const expectedRows = ARM_DESCRIPTORS.length * (trainTrials.length + validationTrials.length);
  if (rows.length !== expectedRows) {
    throw new Error(`ordinary development row matrix mismatch: ${rows.length} !== ${expectedRows}`);
  }
  const configuration = {
    schemaVersion: ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION,
    arms: ARM_DESCRIPTORS,
    delays: ORDINARY_RESOURCE_DEVELOPMENT_DELAYS,
    cueSteps: ORDINARY_RESOURCE_DEVELOPMENT_CUE_STEPS,
    choiceSteps: ORDINARY_RESOURCE_DEVELOPMENT_CHOICE_STEPS,
    physics: {
      dtSeconds: DT_SECONDS,
      patchDistance: PATCH_DISTANCE,
      patchRadius: PATCH_RADIUS,
      acceleration: ACCELERATION,
      velocityDamping: VELOCITY_DAMPING,
      maxSpeed: MAX_SPEED,
      worldBound: WORLD_BOUND,
    },
    trainSeeds,
    validationSeeds,
    surrogateSeeds,
  };
  const summary: OrdinaryResourceDevelopmentSummary = {
    schemaVersion: ORDINARY_RESOURCE_DEVELOPMENT_SCHEMA_VERSION,
    studyId: 'ordinary-resource-head-phase-b-development-v1',
    developmentOnly: true,
    claimAllowed: false,
    thresholdDefined: false,
    negativeResultsRetained: true,
    trainSeeds: [...trainSeeds],
    validationSeeds: [...validationSeeds],
    surrogateSeeds: [...surrogateSeeds],
    armCount: ARM_DESCRIPTORS.length,
    trainTrialCountPerArm: trainTrials.length,
    validationTrialCountPerArm: validationTrials.length,
    rowCount: rows.length,
    rowsFilteredByOutcome: 0,
    configurationSha256: hashCanonical(configuration),
    rowsSha256: hashCanonical(rows),
    aggregates: aggregate(rows),
    arms: armSummaries,
  };
  // Guard the public in-memory/CLI shape against undefined and non-finite values.
  JSON.parse(canonicalJson({ summary, rows }));
  return { summary, rows };
}

assertDisjointPhaseBDevelopmentFamilies({
  ordinaryTrain: PHASE_B_DEVELOPMENT_SEEDS.ordinaryTrain,
  ordinaryValidation: PHASE_B_DEVELOPMENT_SEEDS.ordinaryValidation,
  ordinarySurrogate: PHASE_B_DEVELOPMENT_SEEDS.ordinarySurrogate,
});

if (import.meta.main) {
  console.log(canonicalJson(runOrdinaryResourceDevelopment()));
}
