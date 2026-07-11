/**
 * Ordinary resource-head DEVELOPMENT V2.
 *
 * V1 remains intact as a retained negative result. V2 uses fresh versioned train/validation/model/
 * surrogate/fault families and treats independent model initializations as the hierarchical units.
 * The existing 70-weight EntityBrainField is executed, then composed with the resource head through
 * one fixed bounded law. Identity is trained once; frozen clones receive paired interventions.
 *
 * This module writes nothing, defines no threshold, and authorizes no claim.
 */

import * as THREE from 'three';
import { mulberry32 } from '../../src/math/rng';
import { EntityBrainField } from '../../src/sim/entity-brain';
import {
  EntityResourceHead,
  ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS,
  type EntityResourceHeadObservation,
  type EntityResourceHeadSnapshot,
} from '../../src/sim/entity-resource-head';
import { BRAIN_GENES, TRAIT_GENES } from '../../src/sim/genome';
import type { Entity, EntityData } from '../../src/types';
import {
  assertDisjointPhaseBDevelopmentFamilies,
  assertPhaseBDevelopmentSeed,
  PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  PHASE_B_DEVELOPMENT_SEEDS,
} from './development-seeds';

export const ORDINARY_RESOURCE_DEVELOPMENT_V2_SCHEMA_VERSION = 2 as const;
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS = Object.freeze([30, 90, 180] as const);
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS = 4;
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS = 180;
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_TRIALS_PER_SEED = 12;
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_DECIMAL_PLACES = 9;
export const ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_QUANTIZATION_LAW = Object.freeze({
  id: 'ordinary-resource-development-v2-hash-fixed-decimal-1e-9-v1',
  decimalPlaces: ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_DECIMAL_PLACES,
  absoluteQuantum: 1e-9,
  rawComputation: 'ieee-754-binary64',
  boundary:
    'hash-only-floating-stream-replay-row-and-yoke-receipts; returned-study-values-unrounded',
} as const);

export const ORDINARY_RESOURCE_DEVELOPMENT_V2_ARMS = Object.freeze([
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
] as const);

export type OrdinaryResourceDevelopmentV2ArmId =
  (typeof ORDINARY_RESOURCE_DEVELOPMENT_V2_ARMS)[number];
export type OrdinaryResourceDevelopmentV2CueOrder = 'resource-then-threat' | 'threat-then-resource';

const DT_SECONDS = 1 / 60;
const PATCH_DISTANCE = 1.1;
const PATCH_RADIUS = 0.24;
const FOOD_PER_TRIAL = 1;
const INITIAL_ENERGY = 1;
const BASE_ENERGY_COST = 0.00035;
const MOTION_ENERGY_COST = 0.00055;
const FOOD_ENERGY_GAIN = 0.2;
const ACCELERATION = 0.035;
const VELOCITY_DAMPING = 0.91;
const MAX_SPEED = 0.08;
const WORLD_BOUND = 1.6;
const LEGACY_MAX_STEER = 0.05625;
const BASE_ACTION_WEIGHT = 0.5;
const HEAD_ACTION_WEIGHT = 0.5;
const CONTACT_TIE_EPSILON = 1e-12;
const CONTACT_TIE_PRECEDENCE = 'resource' as const;
const HEAD_TIER = 4 as const;
const PATCH_VISUAL_DESCRIPTOR = Object.freeze({
  shape: 'disc',
  radius: PATCH_RADIUS,
  luminance: 0.62,
  hue: 0.31,
  texture: 'phase-b-development-v2-identical-patches',
});

const V2_CONSTANTS = Object.freeze({
  schemaVersion: ORDINARY_RESOURCE_DEVELOPMENT_V2_SCHEMA_VERSION,
  delays: ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS,
  cueSteps: ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS,
  choiceSteps: ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS,
  dtSeconds: DT_SECONDS,
  patchDistance: PATCH_DISTANCE,
  patchRadius: PATCH_RADIUS,
  foodPerTrial: FOOD_PER_TRIAL,
  initialEnergy: INITIAL_ENERGY,
  baseEnergyCost: BASE_ENERGY_COST,
  motionEnergyCost: MOTION_ENERGY_COST,
  foodEnergyGain: FOOD_ENERGY_GAIN,
  acceleration: ACCELERATION,
  velocityDamping: VELOCITY_DAMPING,
  maxSpeed: MAX_SPEED,
  worldBound: WORLD_BOUND,
  legacyMaxSteer: LEGACY_MAX_STEER,
  composition: `clamp(${BASE_ACTION_WEIGHT}*legacy + ${HEAD_ACTION_WEIGHT}*head,-1,1)`,
  contact: 'swept-segment-circle-first-t',
  contactTieEpsilon: CONTACT_TIE_EPSILON,
  contactTiePrecedence: CONTACT_TIE_PRECEDENCE,
  terminal: 'first-patch-contact-freezes-scored-path-energy; remaining-budget-pure-padding',
  survival: 'not-reported-no-death-regime',
  feedforwardControl:
    'same 51 allocated parameters; recurrence-disabled action plus explicit recurrence-branch padding; no literal machine-FLOP equality claim',
  yokeDirectionLaw:
    'v2: mix32(surrogateSeed xor validationSeed xor model-domain xor within-seed-domain), then counterUnit(domain, choiceStep)',
});

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError('V2 canonical JSON rejects non-finite numbers');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
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
  throw new TypeError(`V2 canonical JSON rejects ${typeof value}`);
}

function hashCanonical(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalJson(value)).digest('hex');
}

/**
 * Canonical audit projection for values produced by floating-point simulation.
 *
 * Bun delegates transcendental arithmetic to the host platform, so Windows and Linux can differ in
 * the last few binary digits while preserving the same trajectory and outcome. Hash receipts render
 * every finite number to the nearest 10^-9 decimal unit and normalize quantized zero. The study rows
 * themselves remain unrounded; only their audit projection and floating stream receipts use this law.
 */
function canonicalQuantizedHashJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError('V2 quantized hash JSON rejects non-finite numbers');
    const fixed = value.toFixed(ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_DECIMAL_PLACES);
    return Number(fixed) === 0
      ? `0.${'0'.repeat(ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_DECIMAL_PLACES)}`
      : fixed;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalQuantizedHashJson(entry)).join(',')}]`;
  if (typeof value === 'object' && value !== undefined) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalQuantizedHashJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`V2 quantized hash JSON rejects ${typeof value}`);
}

function hashCanonicalQuantized(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalQuantizedHashJson(value)).digest('hex');
}

function quantizedHashNumber(value: number): string {
  return canonicalQuantizedHashJson(value);
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

/** Domain key for one model/validation-schedule surrogate direction tape. */
export function ordinaryResourceDevelopmentV2YokeDomain(
  surrogateSeed: number,
  modelUnitIndex: number,
  validationSeed: number,
  withinSeedIndex: number,
): number {
  return mix32(
    surrogateSeed ^
      validationSeed ^
      Math.imul(modelUnitIndex + 1, 0x85eb_ca6b) ^
      Math.imul(withinSeedIndex + 1, 0xc2b2_ae35),
  );
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

export interface OrdinaryResourceDevelopmentV2Trial {
  readonly seed: number;
  readonly withinSeedIndex: number;
  readonly delaySteps: (typeof ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS)[number];
  readonly cueOrder: OrdinaryResourceDevelopmentV2CueOrder;
  readonly targetBearingSign: -1 | 1;
  readonly resourceBearingX: number;
  readonly resourceBearingZ: number;
  readonly threatBearingX: number;
  readonly threatBearingZ: number;
  readonly scheduleSha256: string;
}

interface TrialCondition {
  delaySteps: (typeof ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS)[number];
  cueOrder: OrdinaryResourceDevelopmentV2CueOrder;
  targetBearingSign: -1 | 1;
}

function assertFamilySubset(
  selected: readonly number[],
  canonical: readonly number[],
  label: string,
): void {
  if (selected.length === 0) throw new RangeError(`${label} requires at least one seed`);
  const allowed = new Set(canonical);
  for (const seed of selected) {
    assertPhaseBDevelopmentSeed(seed);
    if (!allowed.has(seed)) throw new RangeError(`${label} seed ${seed} is outside its V2 family`);
  }
  if (new Set(selected).size !== selected.length)
    throw new RangeError(`${label} contains duplicates`);
}

export function buildOrdinaryResourceDevelopmentV2Trials(
  seeds: readonly number[],
  role: 'train' | 'validation',
): readonly OrdinaryResourceDevelopmentV2Trial[] {
  assertFamilySubset(
    seeds,
    role === 'train'
      ? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train
      : PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation,
    `ordinary V2 ${role}`,
  );
  const trials: OrdinaryResourceDevelopmentV2Trial[] = [];
  for (const seed of seeds) {
    const conditions: TrialCondition[] = [];
    for (const delaySteps of ORDINARY_RESOURCE_DEVELOPMENT_V2_DELAYS) {
      for (const targetBearingSign of [-1, 1] as const) {
        for (const cueOrder of ['resource-then-threat', 'threat-then-resource'] as const) {
          conditions.push({ delaySteps, cueOrder, targetBearingSign });
        }
      }
    }
    const rng = mulberry32(mix32(seed ^ (role === 'train' ? 0x2a71_0001 : 0x2a71_0002)));
    for (let index = conditions.length - 1; index > 0; index--) {
      const other = Math.floor(rng() * (index + 1));
      const held = conditions[index]!;
      conditions[index] = conditions[other]!;
      conditions[other] = held;
    }
    const angle = counterUnit(seed, role === 'train' ? 211 : 223) * Math.PI * 2;
    const axisX = Math.cos(angle);
    const axisZ = Math.sin(angle);
    for (let withinSeedIndex = 0; withinSeedIndex < conditions.length; withinSeedIndex++) {
      const condition = conditions[withinSeedIndex]!;
      const resourceBearingX = axisX * condition.targetBearingSign;
      const resourceBearingZ = axisZ * condition.targetBearingSign;
      const material = {
        role,
        seed,
        withinSeedIndex,
        ...condition,
        resourceBearing: [resourceBearingX, resourceBearingZ],
        threatBearing: [-resourceBearingX, -resourceBearingZ],
        constantsSha256: hashCanonical(V2_CONSTANTS),
        patchVisual: PATCH_VISUAL_DESCRIPTOR,
      };
      trials.push({
        seed,
        withinSeedIndex,
        ...condition,
        resourceBearingX,
        resourceBearingZ,
        threatBearingX: -resourceBearingX,
        threatBearingZ: -resourceBearingZ,
        scheduleSha256: hashCanonical(material),
      });
    }
  }
  return trials;
}

/** Earliest normalized segment parameter t ∈ [0,1], including a start already inside the circle. */
export function sweptSegmentCircleFirstT(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  centerX: number,
  centerZ: number,
  radius: number,
): number | null {
  for (const value of [startX, startZ, endX, endZ, centerX, centerZ, radius]) {
    if (!Number.isFinite(value)) throw new RangeError('swept contact requires finite values');
  }
  if (radius <= 0) throw new RangeError('swept contact radius must be positive');
  const offsetX = startX - centerX;
  const offsetZ = startZ - centerZ;
  const radiusSquared = radius * radius;
  if (offsetX * offsetX + offsetZ * offsetZ <= radiusSquared) return 0;
  const deltaX = endX - startX;
  const deltaZ = endZ - startZ;
  const a = deltaX * deltaX + deltaZ * deltaZ;
  if (a <= Number.EPSILON) return null;
  const b = 2 * (offsetX * deltaX + offsetZ * deltaZ);
  const c = offsetX * offsetX + offsetZ * offsetZ - radiusSquared;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(Math.max(0, discriminant));
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  if (second >= 0 && second <= 1) return second;
  return null;
}

export function resolveOrdinaryResourceDevelopmentV2Contact(
  resourceT: number | null,
  threatT: number | null,
): { patch: 'resource' | 'threat'; t: number } | null {
  if (resourceT === null) return threatT === null ? null : { patch: 'threat', t: threatT };
  if (threatT === null) return { patch: 'resource', t: resourceT };
  if (Math.abs(resourceT - threatT) <= CONTACT_TIE_EPSILON) {
    return CONTACT_TIE_PRECEDENCE === 'resource'
      ? { patch: 'resource', t: resourceT }
      : { patch: 'threat', t: threatT };
  }
  return resourceT < threatT
    ? { patch: 'resource', t: resourceT }
    : { patch: 'threat', t: threatT };
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

class LegacyBrainRuntime {
  readonly field: EntityBrainField;
  readonly entity: Entity;
  readonly brainSha256: string;
  readonly genomeSha256: string;
  readonly controllerSha256: string;
  forwardCount = 0;

  constructor(seed: number) {
    this.field = new EntityBrainField(1, mulberry32(seed));
    const genome = this.field.genomeAt(0);
    this.brainSha256 = hashCanonical(Array.from(genome.subarray(TRAIT_GENES)));
    this.genomeSha256 = hashCanonical(Array.from(genome));
    const phase = counterUnit(seed, 307) * Math.PI * 2;
    this.controllerSha256 = hashCanonical({
      implementation: 'EntityBrainField-fp32-6x6x4',
      countedBrainWeights: BRAIN_GENES,
      nonCountedInheritedTraits: Array.from(genome.subarray(0, TRAIT_GENES)),
      phase,
      legacyMaxSteer: LEGACY_MAX_STEER,
      genomeSha256: this.genomeSha256,
    });
    const userData = {
      vel: new THREE.Vector3(),
      age: 40,
      life: 600,
      ph: phase,
      energy: 100,
      payoff: 0,
      act: 0,
    } as unknown as EntityData;
    this.entity = { userData } as unknown as Entity;
  }

  action(
    agent: Readonly<MutableAgent>,
    simulationTime: number,
    observationHasher?: Bun.CryptoHasher,
  ): readonly [number, number] {
    const data = this.entity.userData;
    observationHasher?.update(
      canonicalQuantizedHashJson({
        energy: agent.energy,
        velocityX: agent.velocityX,
        velocityZ: agent.velocityZ,
        simulationTime,
        phase: data.ph,
      }),
    );
    data.vel.set(agent.velocityX, 0, agent.velocityZ);
    data.energy = agent.energy * 100;
    data.age = 40 + simulationTime * 0.01;
    data.act = 0;
    const beforeX = data.vel.x;
    const beforeZ = data.vel.z;
    this.field.thinkAll([this.entity], 0, simulationTime);
    this.forwardCount++;
    return [
      clamp((data.vel.x - beforeX) / LEGACY_MAX_STEER, -1, 1),
      clamp((data.vel.z - beforeZ) / LEGACY_MAX_STEER, -1, 1),
    ];
  }
}

interface HeadRuntime {
  readonly head: EntityResourceHead;
  readonly revision: RevisionCounter;
  readonly mode: 'recurrent' | 'current-input' | 'feedforward-padded';
  readonly paddingState: Float64Array | null;
  readonly recurrentParameters: readonly number[];
  forwardCount: number;
  recurrentNeuronUpdates: number;
  paddingNeuronUpdates: number;
}

function createHeadRuntime(
  snapshot: EntityResourceHeadSnapshot,
  mode: HeadRuntime['mode'],
): HeadRuntime {
  const head = EntityResourceHead.fromSnapshot(snapshot);
  head.setOnlineLearningEnabled(false);
  head.setRecurrenceEnabled(mode === 'recurrent');
  return {
    head,
    revision: { value: snapshot.observedRevision + 1 },
    mode,
    paddingState: mode === 'feedforward-padded' ? new Float64Array(snapshot.tier) : null,
    recurrentParameters: snapshot.parameters.recurrent,
    forwardCount: 0,
    recurrentNeuronUpdates: 0,
    paddingNeuronUpdates: 0,
  };
}

function clearHeadTemporal(runtime: HeadRuntime): void {
  const recurrence = runtime.mode === 'recurrent';
  runtime.head.setRecurrenceEnabled(!recurrence);
  runtime.head.setRecurrenceEnabled(recurrence);
  runtime.paddingState?.fill(0);
}

function observeHead(
  runtime: HeadRuntime,
  observation: Omit<EntityResourceHeadObservation, 'revision'>,
): readonly [number, number] {
  runtime.head.observe({ ...observation, revision: runtime.revision.value++ });
  runtime.forwardCount++;
  if (runtime.mode === 'recurrent') {
    runtime.recurrentNeuronUpdates += HEAD_TIER;
  } else if (runtime.mode === 'feedforward-padded') {
    const padding = runtime.paddingState!;
    for (let neuron = 0; neuron < HEAD_TIER; neuron++) {
      const recurrent = runtime.recurrentParameters[neuron] ?? 0;
      const equilibrium = 0.125 / (1 - recurrent);
      const retention =
        2 ** (-observation.dtSeconds / ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS[neuron]!);
      padding[neuron] = equilibrium + ((padding[neuron] ?? 0) - equilibrium) * retention;
      runtime.paddingNeuronUpdates++;
    }
  }
  const action = runtime.head.readAction();
  return [action.x, action.z];
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

type CueIntervention = 'identity' | 'cyclic' | 'semantic-off' | 'bearing-off' | 'field-off';

function cueObservation(
  cue: 'resource' | 'threat',
  bearingX: number,
  bearingZ: number,
  energy: number,
  intervention: CueIntervention,
): Omit<EntityResourceHeadObservation, 'revision'> {
  const lanes = cue === 'resource' ? [1, 0, 0, 0] : [0, 1, 0, 0];
  if (intervention === 'cyclic') lanes.unshift(lanes.pop()!);
  const semanticsOff = intervention === 'semantic-off' || intervention === 'field-off';
  const bearingOff = intervention === 'bearing-off' || intervention === 'field-off';
  return {
    dtSeconds: DT_SECONDS,
    resource: semanticsOff ? 0 : lanes[0]!,
    threat: semanticsOff ? 0 : lanes[1]!,
    exploration: semanticsOff ? 0 : lanes[2]!,
    social: semanticsOff ? 0 : lanes[3]!,
    goalX: bearingOff ? 0 : bearingX,
    goalZ: bearingOff ? 0 : bearingZ,
    desire: bearingOff ? 0 : 1,
    cover: bearingOff ? 0 : 1,
    energy,
    speed: 0,
  };
}

function corruptEligibilityObservation(
  identity: Omit<EntityResourceHeadObservation, 'revision'>,
  surrogateSeed: number,
  trialIndex: number,
): Omit<EntityResourceHeadObservation, 'revision'> {
  const shift = 1 + (mix32(surrogateSeed ^ trialIndex) % 3);
  const lanes = [identity.resource, identity.threat, identity.exploration, identity.social];
  const permuted = lanes.map((_, index) => lanes[(index + shift) % lanes.length] ?? 0);
  const quarterTurns = 1 + (mix32(surrogateSeed ^ Math.imul(trialIndex + 1, 17)) % 3);
  const angle = quarterTurns * (Math.PI / 2);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    ...identity,
    resource: permuted[0]!,
    threat: permuted[1]!,
    exploration: permuted[2]!,
    social: permuted[3]!,
    goalX: identity.goalX * cosine - identity.goalZ * sine,
    goalZ: identity.goalX * sine + identity.goalZ * cosine,
  };
}

function composeAction(
  baseline: readonly [number, number],
  head: readonly [number, number],
): readonly [number, number] {
  return [
    clamp(BASE_ACTION_WEIGHT * baseline[0] + HEAD_ACTION_WEIGHT * head[0], -1, 1),
    clamp(BASE_ACTION_WEIGHT * baseline[1] + HEAD_ACTION_WEIGHT * head[1], -1, 1),
  ];
}

interface TerminalOutcome {
  contact: 'resource' | 'threat' | null;
  terminalChoiceStep: number | null;
  acquiredFood: 0 | 1;
  firstFoodTimeSteps: number | null;
  terminalPathLength: number;
  terminalEnergy: number;
  pathEfficiency: number;
  paddedChoiceSteps: number;
}

interface TrialExecution {
  outcome: TerminalOutcome;
  choiceActions: readonly (readonly [number, number])[];
  observationSha256: string;
  baselineObservationSha256: string;
  actionSha256: string;
  actionMagnitudeSha256: string;
  rewardRevision: number | null;
  activeControllerSteps: number;
  paddedControllerSteps: number;
}

interface ExecuteTrialOptions {
  trial: OrdinaryResourceDevelopmentV2Trial;
  intervention: CueIntervention;
  baseline: LegacyBrainRuntime;
  head: HeadRuntime | null;
  resetAtDelay: boolean;
  actionSource: 'combined' | 'legacy' | 'yoked';
  yokedActions?: readonly (readonly [number, number])[];
  surrogateSeed?: number;
  modelUnitIndex: number;
  /** Calibration only: produce a full open-loop command tape without scoring either patch. */
  ignoreContacts?: boolean;
}

function executeValidationTrial(options: ExecuteTrialOptions): TrialExecution {
  const { trial, baseline, head } = options;
  const agent: MutableAgent = {
    x: 0,
    z: 0,
    velocityX: 0,
    velocityZ: 0,
    energy: INITIAL_ENERGY,
    pathLength: 0,
  };
  if (head !== null) clearHeadTemporal(head);
  const observations = new Bun.CryptoHasher('sha256');
  const baselineObservations = new Bun.CryptoHasher('sha256');
  const actions = new Bun.CryptoHasher('sha256');
  const actionMagnitudes = new Bun.CryptoHasher('sha256');
  let simulationStep = 0;
  let activeControllerSteps = 0;
  const cueOrder =
    trial.cueOrder === 'resource-then-threat'
      ? (['resource', 'threat'] as const)
      : (['threat', 'resource'] as const);

  for (const cue of cueOrder) {
    const bearingX = cue === 'resource' ? trial.resourceBearingX : trial.threatBearingX;
    const bearingZ = cue === 'resource' ? trial.resourceBearingZ : trial.threatBearingZ;
    for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS; step++) {
      const observation = cueObservation(
        cue,
        bearingX,
        bearingZ,
        agent.energy,
        options.intervention,
      );
      observations.update(canonicalQuantizedHashJson(observation));
      baseline.action(agent, simulationStep * DT_SECONDS, baselineObservations);
      if (head !== null) observeHead(head, observation);
      simulationStep++;
      activeControllerSteps++;
    }
  }

  agent.x = 0;
  agent.z = 0;
  agent.velocityX = 0;
  agent.velocityZ = 0;
  if (head !== null && options.resetAtDelay) clearHeadTemporal(head);
  for (let step = 0; step < trial.delaySteps; step++) {
    const observation = maskedObservation(agent);
    observations.update(canonicalQuantizedHashJson(observation));
    baseline.action(agent, simulationStep * DT_SECONDS, baselineObservations);
    if (head !== null) observeHead(head, observation);
    simulationStep++;
    activeControllerSteps++;
  }

  agent.x = 0;
  agent.z = 0;
  agent.velocityX = 0;
  agent.velocityZ = 0;
  const resourceX = trial.resourceBearingX * PATCH_DISTANCE;
  const resourceZ = trial.resourceBearingZ * PATCH_DISTANCE;
  const threatX = trial.threatBearingX * PATCH_DISTANCE;
  const threatZ = trial.threatBearingZ * PATCH_DISTANCE;
  const choiceActions: (readonly [number, number])[] = [];
  let terminal: TerminalOutcome | null = null;

  for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS; step++) {
    if (terminal !== null) {
      choiceActions.push([0, 0]);
      actions.update(
        `${quantizedHashNumber(step)}|${quantizedHashNumber(0)}|${quantizedHashNumber(0)}|padded;`,
      );
      actionMagnitudes.update(`${quantizedHashNumber(step)}|${quantizedHashNumber(0)}|padded;`);
      continue;
    }
    const observation = maskedObservation(agent);
    observations.update(canonicalQuantizedHashJson(observation));
    const baselineAction = baseline.action(
      agent,
      simulationStep * DT_SECONDS,
      baselineObservations,
    );
    const headAction = head === null ? ([0, 0] as const) : observeHead(head, observation);
    let action: readonly [number, number];
    if (options.actionSource === 'legacy') {
      action = baselineAction;
    } else if (options.actionSource === 'yoked') {
      const source = options.yokedActions?.[step] ?? ([0, 0] as const);
      const magnitude = Math.hypot(source[0], source[1]);
      const seed = options.surrogateSeed;
      if (seed === undefined) throw new Error('yoked action source requires a surrogate seed');
      const directionDomain = ordinaryResourceDevelopmentV2YokeDomain(
        seed,
        options.modelUnitIndex,
        trial.seed,
        trial.withinSeedIndex,
      );
      const angle = counterUnit(directionDomain, step) * Math.PI * 2;
      action = [magnitude * Math.cos(angle), magnitude * Math.sin(angle)];
      if (Math.abs(Math.hypot(action[0], action[1]) - magnitude) > 1e-12) {
        throw new Error('yoked action surrogate failed magnitude preservation');
      }
    } else {
      action = composeAction(baselineAction, headAction);
    }
    choiceActions.push(action);
    actions.update(
      `${quantizedHashNumber(step)}|${quantizedHashNumber(action[0])}|${quantizedHashNumber(action[1])};`,
    );
    actionMagnitudes.update(
      `${quantizedHashNumber(step)}|${quantizedHashNumber(Math.hypot(action[0], action[1]))};`,
    );
    activeControllerSteps++;
    simulationStep++;

    const priorX = agent.x;
    const priorZ = agent.z;
    const proposedVelocityX = clamp(
      agent.velocityX * VELOCITY_DAMPING + action[0] * ACCELERATION,
      -MAX_SPEED,
      MAX_SPEED,
    );
    const proposedVelocityZ = clamp(
      agent.velocityZ * VELOCITY_DAMPING + action[1] * ACCELERATION,
      -MAX_SPEED,
      MAX_SPEED,
    );
    const proposedX = clamp(priorX + proposedVelocityX, -WORLD_BOUND, WORLD_BOUND);
    const proposedZ = clamp(priorZ + proposedVelocityZ, -WORLD_BOUND, WORLD_BOUND);
    const resourceT = sweptSegmentCircleFirstT(
      priorX,
      priorZ,
      proposedX,
      proposedZ,
      resourceX,
      resourceZ,
      PATCH_RADIUS,
    );
    const threatT = sweptSegmentCircleFirstT(
      priorX,
      priorZ,
      proposedX,
      proposedZ,
      threatX,
      threatZ,
      PATCH_RADIUS,
    );
    const contact = options.ignoreContacts
      ? null
      : resolveOrdinaryResourceDevelopmentV2Contact(resourceT, threatT);
    const fraction = contact?.t ?? 1;
    const travelled = Math.hypot(proposedX - priorX, proposedZ - priorZ) * fraction;
    agent.x = priorX + (proposedX - priorX) * fraction;
    agent.z = priorZ + (proposedZ - priorZ) * fraction;
    agent.velocityX = contact === null ? proposedVelocityX : 0;
    agent.velocityZ = contact === null ? proposedVelocityZ : 0;
    agent.pathLength += travelled;
    agent.energy = clamp01(
      agent.energy - BASE_ENERGY_COST - MOTION_ENERGY_COST * (travelled / MAX_SPEED),
    );
    if (contact !== null) {
      const acquiredFood: 0 | 1 = contact.patch === 'resource' ? 1 : 0;
      if (acquiredFood === 1) agent.energy = clamp01(agent.energy + FOOD_ENERGY_GAIN);
      const directDistance = Math.max(0, PATCH_DISTANCE - PATCH_RADIUS);
      terminal = {
        contact: contact.patch,
        terminalChoiceStep: step + 1,
        acquiredFood,
        firstFoodTimeSteps: acquiredFood === 1 ? step + 1 : null,
        terminalPathLength: agent.pathLength,
        terminalEnergy: agent.energy,
        pathEfficiency:
          acquiredFood === 1 ? clamp01(directDistance / Math.max(agent.pathLength, 1e-12)) : 0,
        paddedChoiceSteps: ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS - step - 1,
      };
    }
  }

  terminal ??= {
    contact: null,
    terminalChoiceStep: null,
    acquiredFood: 0,
    firstFoodTimeSteps: null,
    terminalPathLength: agent.pathLength,
    terminalEnergy: agent.energy,
    pathEfficiency: 0,
    paddedChoiceSteps: 0,
  };
  return {
    outcome: terminal,
    choiceActions,
    observationSha256: observations.digest('hex'),
    baselineObservationSha256: baselineObservations.digest('hex'),
    actionSha256: actions.digest('hex'),
    actionMagnitudeSha256: actionMagnitudes.digest('hex'),
    rewardRevision: null,
    activeControllerSteps,
    paddedControllerSteps: terminal.paddedChoiceSteps,
  };
}

interface PairedTrainingReceipt {
  modelSeed: number;
  modelSeedSha256: string;
  baselineBrainSha256: string;
  baselineGenomeSha256: string;
  baselineControllerSha256: string;
  identityParametersBeforeSha256: string;
  identityParametersAfterSha256: string;
  corruptedParametersBeforeSha256: string;
  corruptedParametersAfterSha256: string;
  baselineObservationSha256: string;
  identityObservationSha256: string;
  corruptedObservationSha256: string;
  physicsActionSha256: string;
  corruptionAssociationSha256: string;
  rewardTimingSha256: string;
  identityRewardTimingSha256: string;
  corruptedRewardTimingSha256: string;
  identityUpdateCount: number;
  corruptedUpdateCount: number;
  identicalRewardTimingAndCount: true;
  truePhysicsActionSource: 'identity-combined';
  postOutcomeObservationCount: 0;
  scheduledTrainingStepCount: number;
  trainingClockFinalStep: number;
  paddedTrainingStepCount: number;
  identitySnapshot: EntityResourceHeadSnapshot;
  corruptedSnapshot: EntityResourceHeadSnapshot;
}

function trainPairedModel(
  modelSeed: number,
  modelUnitIndex: number,
  trials: readonly OrdinaryResourceDevelopmentV2Trial[],
  surrogateSeeds: readonly number[],
): PairedTrainingReceipt {
  const identity = new EntityResourceHead(modelSeed, HEAD_TIER);
  const corrupted = new EntityResourceHead(modelSeed, HEAD_TIER);
  const identityRevision: RevisionCounter = { value: 0 };
  const corruptedRevision: RevisionCounter = { value: 0 };
  const baseline = new LegacyBrainRuntime(modelSeed);
  const identityBefore = hashCanonical(identity.snapshot().parameters);
  const corruptedBefore = hashCanonical(corrupted.snapshot().parameters);
  const identityObservations = new Bun.CryptoHasher('sha256');
  const corruptedObservations = new Bun.CryptoHasher('sha256');
  const baselineObservations = new Bun.CryptoHasher('sha256');
  const physicsActions = new Bun.CryptoHasher('sha256');
  const corruptionAssociations = new Bun.CryptoHasher('sha256');
  const identityRewardTiming: unknown[] = [];
  const corruptedRewardTiming: unknown[] = [];
  let identityUpdateCount = 0;
  let corruptedUpdateCount = 0;
  let simulationStep = 0;
  let paddedTrainingStepCount = 0;

  const observePair = (
    identityObservation: Omit<EntityResourceHeadObservation, 'revision'>,
    corruptedObservation: Omit<EntityResourceHeadObservation, 'revision'>,
  ): readonly [number, number] => {
    identityObservations.update(canonicalQuantizedHashJson(identityObservation));
    corruptedObservations.update(canonicalQuantizedHashJson(corruptedObservation));
    identity.observe({ ...identityObservation, revision: identityRevision.value++ });
    corrupted.observe({ ...corruptedObservation, revision: corruptedRevision.value++ });
    const action = identity.readAction();
    return [action.x, action.z];
  };

  for (let trialIndex = 0; trialIndex < trials.length; trialIndex++) {
    const trial = trials[trialIndex]!;
    const surrogateSeed = surrogateSeeds[(modelUnitIndex + trialIndex) % surrogateSeeds.length]!;
    identity.setRecurrenceEnabled(false);
    identity.setRecurrenceEnabled(true);
    corrupted.setRecurrenceEnabled(false);
    corrupted.setRecurrenceEnabled(true);
    const agent: MutableAgent = {
      x: 0,
      z: 0,
      velocityX: 0,
      velocityZ: 0,
      energy: INITIAL_ENERGY,
      pathLength: 0,
    };
    const cueOrder =
      trial.cueOrder === 'resource-then-threat'
        ? (['resource', 'threat'] as const)
        : (['threat', 'resource'] as const);
    for (const cue of cueOrder) {
      const bearingX = cue === 'resource' ? trial.resourceBearingX : trial.threatBearingX;
      const bearingZ = cue === 'resource' ? trial.resourceBearingZ : trial.threatBearingZ;
      for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS; step++) {
        const source = cueObservation(cue, bearingX, bearingZ, agent.energy, 'identity');
        const corrupt = corruptEligibilityObservation(source, surrogateSeed, trialIndex);
        corruptionAssociations.update(canonicalQuantizedHashJson(corrupt));
        baseline.action(agent, simulationStep * DT_SECONDS, baselineObservations);
        observePair(source, corrupt);
        simulationStep++;
      }
    }
    agent.x = 0;
    agent.z = 0;
    agent.velocityX = 0;
    agent.velocityZ = 0;
    for (let step = 0; step < trial.delaySteps; step++) {
      const input = maskedObservation(agent);
      baseline.action(agent, simulationStep * DT_SECONDS, baselineObservations);
      observePair(input, input);
      simulationStep++;
    }
    agent.x = 0;
    agent.z = 0;
    agent.velocityX = 0;
    agent.velocityZ = 0;
    const resourceX = trial.resourceBearingX * PATCH_DISTANCE;
    const resourceZ = trial.resourceBearingZ * PATCH_DISTANCE;
    const threatX = trial.threatBearingX * PATCH_DISTANCE;
    const threatZ = trial.threatBearingZ * PATCH_DISTANCE;
    let terminal = false;
    for (let step = 0; step < ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS; step++) {
      if (terminal) {
        // Advance the declared simulation clock without controller/state updates. Later trials never
        // inherit a time/phase schedule that depends on whether an earlier trial terminated early.
        simulationStep++;
        paddedTrainingStepCount++;
        continue;
      }
      const input = maskedObservation(agent);
      const baselineAction = baseline.action(
        agent,
        simulationStep * DT_SECONDS,
        baselineObservations,
      );
      const identityHeadAction = observePair(input, input);
      const action = composeAction(baselineAction, identityHeadAction);
      physicsActions.update(
        `${quantizedHashNumber(trialIndex)}|${quantizedHashNumber(step)}|${quantizedHashNumber(action[0])}|${quantizedHashNumber(action[1])};`,
      );
      simulationStep++;
      const priorX = agent.x;
      const priorZ = agent.z;
      const velocityX = clamp(
        agent.velocityX * VELOCITY_DAMPING + action[0] * ACCELERATION,
        -MAX_SPEED,
        MAX_SPEED,
      );
      const velocityZ = clamp(
        agent.velocityZ * VELOCITY_DAMPING + action[1] * ACCELERATION,
        -MAX_SPEED,
        MAX_SPEED,
      );
      const nextX = clamp(priorX + velocityX, -WORLD_BOUND, WORLD_BOUND);
      const nextZ = clamp(priorZ + velocityZ, -WORLD_BOUND, WORLD_BOUND);
      const contact = resolveOrdinaryResourceDevelopmentV2Contact(
        sweptSegmentCircleFirstT(priorX, priorZ, nextX, nextZ, resourceX, resourceZ, PATCH_RADIUS),
        sweptSegmentCircleFirstT(priorX, priorZ, nextX, nextZ, threatX, threatZ, PATCH_RADIUS),
      );
      const fraction = contact?.t ?? 1;
      const travelled = Math.hypot(nextX - priorX, nextZ - priorZ) * fraction;
      agent.x = priorX + (nextX - priorX) * fraction;
      agent.z = priorZ + (nextZ - priorZ) * fraction;
      agent.velocityX = contact === null ? velocityX : 0;
      agent.velocityZ = contact === null ? velocityZ : 0;
      agent.pathLength += travelled;
      agent.energy = clamp01(
        agent.energy - BASE_ENERGY_COST - MOTION_ENERGY_COST * (travelled / MAX_SPEED),
      );
      if (contact !== null) {
        terminal = true;
        if (contact.patch === 'resource') {
          agent.energy = clamp01(agent.energy + FOOD_ENERGY_GAIN);
          identity.applyFoodReward(identity.readAction().revision, FOOD_PER_TRIAL);
          corrupted.applyFoodReward(corrupted.readAction().revision, FOOD_PER_TRIAL);
          identityUpdateCount++;
          corruptedUpdateCount++;
          const identityEvent = {
            trialIndex,
            choiceStep: step + 1,
            revision: identity.readAction().revision,
            reward: FOOD_PER_TRIAL,
          };
          const corruptedEvent = {
            trialIndex,
            choiceStep: step + 1,
            revision: corrupted.readAction().revision,
            reward: FOOD_PER_TRIAL,
          };
          identityRewardTiming.push(identityEvent);
          corruptedRewardTiming.push(corruptedEvent);
        }
      }
    }
  }

  if (identityUpdateCount !== corruptedUpdateCount) {
    throw new Error('paired reward-corruption update counts diverged');
  }
  const identityRewardTimingSha256 = hashCanonical(identityRewardTiming);
  const corruptedRewardTimingSha256 = hashCanonical(corruptedRewardTiming);
  if (identityRewardTimingSha256 !== corruptedRewardTimingSha256) {
    throw new Error('paired reward-corruption update timing diverged');
  }
  const scheduledTrainingStepCount = trials.reduce(
    (total, trial) =>
      total +
      ORDINARY_RESOURCE_DEVELOPMENT_V2_CUE_STEPS * 2 +
      trial.delaySteps +
      ORDINARY_RESOURCE_DEVELOPMENT_V2_CHOICE_STEPS,
    0,
  );
  if (simulationStep !== scheduledTrainingStepCount) {
    throw new Error('paired training clock drifted from its fixed scheduled budget');
  }
  return {
    modelSeed,
    modelSeedSha256: hashCanonical({ family: 'ordinary-v2-model', modelSeed }),
    baselineBrainSha256: baseline.brainSha256,
    baselineGenomeSha256: baseline.genomeSha256,
    baselineControllerSha256: baseline.controllerSha256,
    identityParametersBeforeSha256: identityBefore,
    identityParametersAfterSha256: hashCanonical(identity.snapshot().parameters),
    corruptedParametersBeforeSha256: corruptedBefore,
    corruptedParametersAfterSha256: hashCanonical(corrupted.snapshot().parameters),
    baselineObservationSha256: baselineObservations.digest('hex'),
    identityObservationSha256: identityObservations.digest('hex'),
    corruptedObservationSha256: corruptedObservations.digest('hex'),
    physicsActionSha256: physicsActions.digest('hex'),
    corruptionAssociationSha256: corruptionAssociations.digest('hex'),
    rewardTimingSha256: identityRewardTimingSha256,
    identityRewardTimingSha256,
    corruptedRewardTimingSha256,
    identityUpdateCount,
    corruptedUpdateCount,
    identicalRewardTimingAndCount: true,
    truePhysicsActionSource: 'identity-combined',
    postOutcomeObservationCount: 0,
    scheduledTrainingStepCount,
    trainingClockFinalStep: simulationStep,
    paddedTrainingStepCount,
    identitySnapshot: identity.snapshot(),
    corruptedSnapshot: corrupted.snapshot(),
  };
}

interface ArmDescriptor {
  id: OrdinaryResourceDevelopmentV2ArmId;
  intervention: CueIntervention;
  source: 'identity-trained' | 'corrupted-trained' | 'legacy' | 'yoked';
  headMode: HeadRuntime['mode'] | null;
  resetAtDelay: boolean;
  actionSource: ExecuteTrialOptions['actionSource'];
}

const ARM_DESCRIPTORS: readonly ArmDescriptor[] = Object.freeze([
  arm('identity-frozen'),
  arm('cyclic-semantics-frozen', { intervention: 'cyclic' }),
  arm('semantics-ablated-bearing-retained', { intervention: 'semantic-off' }),
  arm('bearing-ablated-semantics-retained', { intervention: 'bearing-off' }),
  arm('field-off', { intervention: 'field-off' }),
  arm('recurrence-disabled', { headMode: 'current-input' }),
  arm('state-reset-at-delay', { resetAtDelay: true }),
  arm('reward-eligibility-corrupted-trained', { source: 'corrupted-trained' }),
  arm('legacy-exact-70', { source: 'legacy', headMode: null, actionSource: 'legacy' }),
  arm('feedforward-parameter-matched-recurrence-padded', { headMode: 'feedforward-padded' }),
  arm('calibrated-yoked-action-surrogate', {
    source: 'yoked',
    headMode: null,
    actionSource: 'yoked',
  }),
]);

function arm(
  id: OrdinaryResourceDevelopmentV2ArmId,
  overrides: Partial<Omit<ArmDescriptor, 'id'>> = {},
): ArmDescriptor {
  return {
    id,
    intervention: overrides.intervention ?? 'identity',
    source: overrides.source ?? 'identity-trained',
    headMode: overrides.headMode === undefined ? 'recurrent' : overrides.headMode,
    resetAtDelay: overrides.resetAtDelay ?? false,
    actionSource: overrides.actionSource ?? 'combined',
  };
}

export interface OrdinaryResourceDevelopmentV2ParameterBudget {
  readonly legacyAllocated: 70;
  readonly legacyExercised: 70;
  readonly headAllocated: number;
  readonly headExercised: number;
  readonly totalAllocated: number;
  readonly totalExercised: number;
  readonly totalPlanned: number;
  readonly recurrenceBranchPaddingExecuted: boolean;
  readonly literalFlopEqualityClaimed: false;
}

export interface OrdinaryResourceDevelopmentV2Row {
  readonly schemaVersion: 2;
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly modelUnitIndex: number;
  readonly modelSeed: number;
  readonly modelSeedSha256: string;
  readonly validationSeed: number;
  readonly withinSeedIndex: number;
  readonly armId: OrdinaryResourceDevelopmentV2ArmId;
  readonly scheduleSha256: string;
  readonly constantsSha256: string;
  readonly seedFamilySha256: string;
  readonly baselineBrainSha256: string;
  readonly baselineGenomeSha256: string;
  readonly baselineControllerSha256: string;
  readonly sourceParameterSha256: string | null;
  readonly parametersBeforeEvaluationSha256: string | null;
  readonly parametersAfterEvaluationSha256: string | null;
  readonly sourceTrainingUpdateCount: number;
  readonly evaluationUpdateCount: 0;
  readonly observationStreamSha256: string;
  readonly baselineObservationStreamSha256: string;
  readonly actionStreamSha256: string;
  readonly actionMagnitudeStreamSha256: string;
  readonly yokeSourceActionSha256: string | null;
  readonly yokeSourceMagnitudeSha256: string | null;
  readonly yokeMagnitudePreservedOnActiveSteps: boolean | null;
  readonly parameterBudget: OrdinaryResourceDevelopmentV2ParameterBudget;
  readonly baselineForwardCount: number;
  readonly headForwardCount: number;
  readonly recurrentNeuronUpdates: number;
  readonly feedforwardPaddingNeuronUpdates: number;
  readonly activeControllerSteps: number;
  readonly paddedControllerSteps: number;
  readonly delaySteps: number;
  readonly cueOrder: OrdinaryResourceDevelopmentV2CueOrder;
  readonly targetBearingSign: -1 | 1;
  readonly terminalContact: 'resource' | 'threat' | null;
  readonly terminalChoiceStep: number | null;
  readonly acquiredFood: 0 | 1;
  readonly availableFood: 1;
  readonly primaryOutcome: 0 | 1;
  readonly firstFoodTimeSteps: number | null;
  readonly pathEfficiency: number;
  readonly terminalPathLength: number;
  readonly terminalEnergy: number;
  readonly survivalMetric: 'not-reported-no-death-regime';
  readonly replaySha256: string;
}

function parameterBudget(descriptor: ArmDescriptor): OrdinaryResourceDevelopmentV2ParameterBudget {
  const hasHead = descriptor.headMode !== null;
  const headAllocated = hasHead ? 51 : 0;
  const headExercised = !hasHead ? 0 : descriptor.headMode === 'current-input' ? 47 : 51;
  return {
    legacyAllocated: 70,
    legacyExercised: 70,
    headAllocated,
    headExercised,
    totalAllocated: 70 + headAllocated,
    totalExercised: 70 + headExercised,
    totalPlanned: 70 + headAllocated,
    recurrenceBranchPaddingExecuted: descriptor.headMode === 'feedforward-padded',
    literalFlopEqualityClaimed: false,
  };
}

export interface OrdinaryResourceDevelopmentV2ModelReceipt extends Omit<
  PairedTrainingReceipt,
  'identitySnapshot' | 'corruptedSnapshot'
> {
  readonly identityFrozenCloneSourceSha256: string;
  readonly cyclicRetrained: false;
}

export interface OrdinaryResourceDevelopmentV2Aggregate {
  readonly armId: OrdinaryResourceDevelopmentV2ArmId;
  readonly modelUnitCount: number;
  readonly rowCount: number;
  readonly acquiredFood: number;
  readonly availableFood: number;
  readonly meanPrimaryOutcome: number;
  readonly meanFirstFoodTimeSteps: number | null;
  readonly meanPathEfficiency: number;
  readonly meanTerminalPathLength: number;
  readonly meanTerminalEnergy: number;
  readonly perModelPrimaryOutcomes: readonly number[];
}

export interface OrdinaryResourceDevelopmentV2Summary {
  readonly schemaVersion: 2;
  readonly studyId: 'ordinary-resource-head-phase-b-development-v2';
  readonly hashProjectionLaw: typeof ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_QUANTIZATION_LAW;
  readonly developmentOnly: true;
  readonly claimAllowed: false;
  readonly thresholdDefined: false;
  readonly negativeResultsRetained: true;
  readonly seedFamilySha256: string;
  readonly trainSeeds: readonly number[];
  readonly validationSeeds: readonly number[];
  readonly modelSeeds: readonly number[];
  readonly surrogateSeeds: readonly number[];
  readonly faultSeeds: readonly number[];
  readonly faultSeedRole: 'reserved-not-consumed-by-v2-task-runner';
  readonly modelUnitCount: number;
  readonly armCount: number;
  readonly rowCount: number;
  readonly rowsFilteredByOutcome: 0;
  readonly constantsSha256: string;
  readonly configurationSha256: string;
  readonly rowsSha256: string;
  readonly yokedCalibrationSha256: string;
  readonly yokedCalibrationPolicy: 'full-180-command-open-loop-identity-tape';
  readonly yokedDirectionPolicy: 'validation-seed-separated-domain-v2-full-open-loop-tape';
  readonly models: readonly OrdinaryResourceDevelopmentV2ModelReceipt[];
  readonly aggregates: readonly OrdinaryResourceDevelopmentV2Aggregate[];
}

export interface OrdinaryResourceDevelopmentV2Study {
  readonly summary: OrdinaryResourceDevelopmentV2Summary;
  readonly rows: readonly OrdinaryResourceDevelopmentV2Row[];
}

export interface RunOrdinaryResourceDevelopmentV2Options {
  readonly trainSeeds?: readonly number[];
  readonly validationSeeds?: readonly number[];
  readonly modelSeeds?: readonly number[];
  readonly surrogateSeeds?: readonly number[];
  readonly faultSeeds?: readonly number[];
}

function aggregateRows(
  rows: readonly OrdinaryResourceDevelopmentV2Row[],
  modelSeeds: readonly number[],
): OrdinaryResourceDevelopmentV2Aggregate[] {
  return ORDINARY_RESOURCE_DEVELOPMENT_V2_ARMS.map((armId) => {
    const selected = rows.filter((row) => row.armId === armId);
    const foodTimes = selected
      .map((row) => row.firstFoodTimeSteps)
      .filter((value): value is number => value !== null);
    const perModelPrimaryOutcomes = modelSeeds.map((modelSeed) => {
      const unit = selected.filter((row) => row.modelSeed === modelSeed);
      return mean(unit.map((row) => row.primaryOutcome));
    });
    return {
      armId,
      modelUnitCount: modelSeeds.length,
      rowCount: selected.length,
      acquiredFood: selected.reduce((total, row) => total + row.acquiredFood, 0),
      availableFood: selected.length,
      meanPrimaryOutcome: mean(selected.map((row) => row.primaryOutcome)),
      meanFirstFoodTimeSteps: foodTimes.length === 0 ? null : mean(foodTimes),
      meanPathEfficiency: mean(selected.map((row) => row.pathEfficiency)),
      meanTerminalPathLength: mean(selected.map((row) => row.terminalPathLength)),
      meanTerminalEnergy: mean(selected.map((row) => row.terminalEnergy)),
      perModelPrimaryOutcomes,
    };
  });
}

/** Execute the complete fresh-seed V2 development matrix in memory. */
export function runOrdinaryResourceDevelopmentV2(
  options: RunOrdinaryResourceDevelopmentV2Options = {},
): OrdinaryResourceDevelopmentV2Study {
  const trainSeeds = options.trainSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train;
  const validationSeeds = options.validationSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation;
  const modelSeeds = options.modelSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model;
  const surrogateSeeds = options.surrogateSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate;
  const faultSeeds = options.faultSeeds ?? PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault;
  assertFamilySubset(trainSeeds, PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train, 'ordinary V2 train');
  assertFamilySubset(
    validationSeeds,
    PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation,
    'ordinary V2 validation',
  );
  assertFamilySubset(modelSeeds, PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model, 'ordinary V2 model');
  assertFamilySubset(
    surrogateSeeds,
    PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate,
    'ordinary V2 surrogate',
  );
  assertFamilySubset(faultSeeds, PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault, 'ordinary V2 fault');
  assertDisjointPhaseBDevelopmentFamilies({
    trainSeeds,
    validationSeeds,
    modelSeeds,
    surrogateSeeds,
    faultSeeds,
  });

  const trainTrials = buildOrdinaryResourceDevelopmentV2Trials(trainSeeds, 'train');
  const validationTrials = buildOrdinaryResourceDevelopmentV2Trials(validationSeeds, 'validation');
  const constantsSha256 = hashCanonical(V2_CONSTANTS);
  const rows: OrdinaryResourceDevelopmentV2Row[] = [];
  const modelReceipts: OrdinaryResourceDevelopmentV2ModelReceipt[] = [];
  const yokeCalibrationMaterial: unknown[] = [];

  for (let modelUnitIndex = 0; modelUnitIndex < modelSeeds.length; modelUnitIndex++) {
    const modelSeed = modelSeeds[modelUnitIndex]!;
    const training = trainPairedModel(modelSeed, modelUnitIndex, trainTrials, surrogateSeeds);
    const identitySourceSha = hashCanonical(training.identitySnapshot.parameters);
    const corruptedSourceSha = hashCanonical(training.corruptedSnapshot.parameters);
    const {
      identitySnapshot: _identitySnapshot,
      corruptedSnapshot: _corruptedSnapshot,
      ...publicTraining
    } = training;
    modelReceipts.push({
      ...publicTraining,
      identityFrozenCloneSourceSha256: identitySourceSha,
      cyclicRetrained: false,
    });

    const identityActionTapes = new Map<string, readonly (readonly [number, number])[]>();
    const identityActionHashes = new Map<string, string>();
    const identityMagnitudeHashes = new Map<string, string>();
    // Calibration uses a dedicated frozen clone and ignores patch contacts, so every yoke source is a
    // complete 180-command open-loop tape rather than an outcome-truncated tape padded with zeros.
    const calibrationHead = createHeadRuntime(training.identitySnapshot, 'recurrent');
    const calibrationBaseline = new LegacyBrainRuntime(modelSeed);
    const yokeCalibrationBaseline = new LegacyBrainRuntime(modelSeed);
    for (let trialIndex = 0; trialIndex < validationTrials.length; trialIndex++) {
      const trial = validationTrials[trialIndex]!;
      const calibration = executeValidationTrial({
        trial,
        intervention: 'identity',
        baseline: calibrationBaseline,
        head: calibrationHead,
        resetAtDelay: false,
        actionSource: 'combined',
        modelUnitIndex,
        ignoreContacts: true,
      });
      identityActionTapes.set(trial.scheduleSha256, calibration.choiceActions);
      identityActionHashes.set(trial.scheduleSha256, calibration.actionSha256);
      identityMagnitudeHashes.set(trial.scheduleSha256, calibration.actionMagnitudeSha256);
      const surrogateSeed = surrogateSeeds[(modelUnitIndex + trialIndex) % surrogateSeeds.length]!;
      const yokeDomain = ordinaryResourceDevelopmentV2YokeDomain(
        surrogateSeed,
        modelUnitIndex,
        trial.seed,
        trial.withinSeedIndex,
      );
      const yokeCalibration = executeValidationTrial({
        trial,
        intervention: 'identity',
        baseline: yokeCalibrationBaseline,
        head: null,
        resetAtDelay: false,
        actionSource: 'yoked',
        yokedActions: calibration.choiceActions,
        surrogateSeed,
        modelUnitIndex,
        ignoreContacts: true,
      });
      yokeCalibrationMaterial.push({
        modelSeed,
        validationSeed: trial.seed,
        withinSeedIndex: trial.withinSeedIndex,
        scheduleSha256: trial.scheduleSha256,
        sourceActionSha256: calibration.actionSha256,
        sourceMagnitudeSha256: calibration.actionMagnitudeSha256,
        surrogateSeed,
        yokeDomain,
        yokeActionSha256: yokeCalibration.actionSha256,
        yokeMagnitudeSha256: yokeCalibration.actionMagnitudeSha256,
        openLoopContactPolicy: 'ignored-for-full-180-command-calibration',
        magnitudes: calibration.choiceActions.map((action) => Math.hypot(action[0], action[1])),
      });
    }

    for (const descriptor of ARM_DESCRIPTORS) {
      const sourceSnapshot =
        descriptor.source === 'corrupted-trained'
          ? training.corruptedSnapshot
          : descriptor.source === 'identity-trained'
            ? training.identitySnapshot
            : null;
      const sourceParameterSha =
        descriptor.source === 'corrupted-trained'
          ? corruptedSourceSha
          : descriptor.source === 'identity-trained'
            ? identitySourceSha
            : null;
      const head =
        sourceSnapshot === null || descriptor.headMode === null
          ? null
          : createHeadRuntime(sourceSnapshot, descriptor.headMode);
      const baseline = new LegacyBrainRuntime(modelSeed);
      const sourceUpdateCount =
        descriptor.source === 'corrupted-trained'
          ? training.corruptedUpdateCount
          : descriptor.source === 'identity-trained'
            ? training.identityUpdateCount
            : 0;

      for (let trialIndex = 0; trialIndex < validationTrials.length; trialIndex++) {
        const trial = validationTrials[trialIndex]!;
        const yokeKey = trial.scheduleSha256;
        const beforeParameters =
          head === null ? null : hashCanonical(head.head.snapshot().parameters);
        const baselineForwardsBefore = baseline.forwardCount;
        const headForwardsBefore = head?.forwardCount ?? 0;
        const recurrentBefore = head?.recurrentNeuronUpdates ?? 0;
        const paddingBefore = head?.paddingNeuronUpdates ?? 0;
        const execution = executeValidationTrial({
          trial,
          intervention: descriptor.intervention,
          baseline,
          head,
          resetAtDelay: descriptor.resetAtDelay,
          actionSource: descriptor.actionSource,
          yokedActions:
            descriptor.source === 'yoked' ? identityActionTapes.get(yokeKey) : undefined,
          surrogateSeed:
            descriptor.source === 'yoked'
              ? surrogateSeeds[(modelUnitIndex + trialIndex) % surrogateSeeds.length]
              : undefined,
          modelUnitIndex,
        });
        if (descriptor.source === 'yoked' && !identityActionTapes.has(yokeKey)) {
          throw new Error('yoked surrogate ran before its paired identity action tape');
        }
        const afterParameters =
          head === null ? null : hashCanonical(head.head.snapshot().parameters);
        if (beforeParameters !== afterParameters) {
          throw new Error(`frozen V2 validation parameters mutated in ${descriptor.id}`);
        }
        const outcome = execution.outcome;
        const budget = parameterBudget(descriptor);
        const replaySha256 = hashCanonicalQuantized({
          modelSeed,
          validationSeed: trial.seed,
          armId: descriptor.id,
          scheduleSha256: trial.scheduleSha256,
          observationSha256: execution.observationSha256,
          actionSha256: execution.actionSha256,
          outcome,
        });
        rows.push({
          schemaVersion: 2,
          developmentOnly: true,
          claimAllowed: false,
          modelUnitIndex,
          modelSeed,
          modelSeedSha256: training.modelSeedSha256,
          validationSeed: trial.seed,
          withinSeedIndex: trial.withinSeedIndex,
          armId: descriptor.id,
          scheduleSha256: trial.scheduleSha256,
          constantsSha256,
          seedFamilySha256: PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
          baselineBrainSha256: baseline.brainSha256,
          baselineGenomeSha256: baseline.genomeSha256,
          baselineControllerSha256: baseline.controllerSha256,
          sourceParameterSha256: sourceParameterSha,
          parametersBeforeEvaluationSha256: beforeParameters,
          parametersAfterEvaluationSha256: afterParameters,
          sourceTrainingUpdateCount: sourceUpdateCount,
          evaluationUpdateCount: 0,
          observationStreamSha256: execution.observationSha256,
          baselineObservationStreamSha256: execution.baselineObservationSha256,
          actionStreamSha256: execution.actionSha256,
          actionMagnitudeStreamSha256: execution.actionMagnitudeSha256,
          yokeSourceActionSha256:
            descriptor.source === 'yoked' ? (identityActionHashes.get(yokeKey) ?? null) : null,
          yokeSourceMagnitudeSha256:
            descriptor.source === 'yoked' ? (identityMagnitudeHashes.get(yokeKey) ?? null) : null,
          yokeMagnitudePreservedOnActiveSteps: descriptor.source === 'yoked' ? true : null,
          parameterBudget: budget,
          baselineForwardCount: baseline.forwardCount - baselineForwardsBefore,
          headForwardCount: (head?.forwardCount ?? 0) - headForwardsBefore,
          recurrentNeuronUpdates: (head?.recurrentNeuronUpdates ?? 0) - recurrentBefore,
          feedforwardPaddingNeuronUpdates: (head?.paddingNeuronUpdates ?? 0) - paddingBefore,
          activeControllerSteps: execution.activeControllerSteps,
          paddedControllerSteps: execution.paddedControllerSteps,
          delaySteps: trial.delaySteps,
          cueOrder: trial.cueOrder,
          targetBearingSign: trial.targetBearingSign,
          terminalContact: outcome.contact,
          terminalChoiceStep: outcome.terminalChoiceStep,
          acquiredFood: outcome.acquiredFood,
          availableFood: 1,
          primaryOutcome: outcome.acquiredFood,
          firstFoodTimeSteps: outcome.firstFoodTimeSteps,
          pathEfficiency: outcome.pathEfficiency,
          terminalPathLength: outcome.terminalPathLength,
          terminalEnergy: outcome.terminalEnergy,
          survivalMetric: 'not-reported-no-death-regime',
          replaySha256,
        });
      }
    }
  }

  const expectedRows = modelSeeds.length * ARM_DESCRIPTORS.length * validationTrials.length;
  if (rows.length !== expectedRows) {
    throw new Error(`ordinary V2 row matrix mismatch: ${rows.length} !== ${expectedRows}`);
  }
  const configuration = {
    constants: V2_CONSTANTS,
    hashProjectionLaw: ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_QUANTIZATION_LAW,
    arms: ARM_DESCRIPTORS,
    trainSeeds,
    validationSeeds,
    modelSeeds,
    surrogateSeeds,
    faultSeeds,
    faultSeedRole: 'reserved-not-consumed-by-v2-task-runner',
    seedFamilySha256: PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
  };
  const summary: OrdinaryResourceDevelopmentV2Summary = {
    schemaVersion: 2,
    studyId: 'ordinary-resource-head-phase-b-development-v2',
    hashProjectionLaw: ORDINARY_RESOURCE_DEVELOPMENT_V2_HASH_QUANTIZATION_LAW,
    developmentOnly: true,
    claimAllowed: false,
    thresholdDefined: false,
    negativeResultsRetained: true,
    seedFamilySha256: PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256,
    trainSeeds: [...trainSeeds],
    validationSeeds: [...validationSeeds],
    modelSeeds: [...modelSeeds],
    surrogateSeeds: [...surrogateSeeds],
    faultSeeds: [...faultSeeds],
    faultSeedRole: 'reserved-not-consumed-by-v2-task-runner',
    modelUnitCount: modelSeeds.length,
    armCount: ARM_DESCRIPTORS.length,
    rowCount: rows.length,
    rowsFilteredByOutcome: 0,
    constantsSha256,
    configurationSha256: hashCanonical(configuration),
    rowsSha256: hashCanonicalQuantized(rows),
    yokedCalibrationSha256: hashCanonicalQuantized(yokeCalibrationMaterial),
    yokedCalibrationPolicy: 'full-180-command-open-loop-identity-tape',
    yokedDirectionPolicy: 'validation-seed-separated-domain-v2-full-open-loop-tape',
    models: modelReceipts,
    aggregates: aggregateRows(rows, modelSeeds),
  };
  JSON.parse(canonicalJson({ summary, rows }));
  return { summary, rows };
}

assertDisjointPhaseBDevelopmentFamilies({
  ordinaryV2Train: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Train,
  ordinaryV2Validation: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Validation,
  ordinaryV2Model: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Model,
  ordinaryV2Surrogate: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Surrogate,
  ordinaryV2Fault: PHASE_B_DEVELOPMENT_SEEDS.ordinaryV2Fault,
});

if (BRAIN_GENES !== 70)
  throw new Error(`ordinary V2 requires exact 70-weight legacy brain; got ${BRAIN_GENES}`);

if (import.meta.main) {
  console.log(canonicalJson(runOrdinaryResourceDevelopmentV2()));
}
