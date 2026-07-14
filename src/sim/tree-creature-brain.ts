/**
 * CRYSTAL BIG TREE CREATURE BRAIN — a deterministic, fixed-size neural controller for the peaceful
 * creatures authored around the Big Tree. It is a genuine 6→6→4 single-hidden-layer MLP using the same
 * allocation-free {@link TinyMLP} primitive as the canonical organism controller. The four bounded network
 * outputs directly contribute two motor axes and two activity axes; the latter select eat, rest, socialize,
 * or roam. This module makes no consciousness, sentience, or physical-quantum claim.
 *
 * Six neural channels compact the authored percepts without discarding their behavioral meaning:
 *   0. signed metabolic state (energy ↔ hunger)
 *   1. food bearing
 *   2. food proximity (inverse distance)
 *   3. local social density
 *   4. safe-zone calm minus threat
 *   5. phase shifted by stable personality
 *
 * Construction allocates the network and its fixed scratch buffers once. {@link decide} writes into a
 * caller-owned action object and allocates nothing in steady state.
 */
import { hashSeed, mulberry32 } from '../math/rng';
import { TinyMLP } from './ai/brains';

export const TREE_CREATURE_BRAIN_INPUTS = 6;
export const TREE_CREATURE_BRAIN_HIDDEN = 6;
export const TREE_CREATURE_BRAIN_OUTPUTS = 4;
export const TREE_CREATURE_BRAIN_PARAMETERS = TinyMLP.weightCount(
  TREE_CREATURE_BRAIN_INPUTS,
  TREE_CREATURE_BRAIN_HIDDEN,
  TREE_CREATURE_BRAIN_OUTPUTS,
);

const HIDDEN_WEIGHT_SCALE = Math.sqrt(
  6 / (TREE_CREATURE_BRAIN_INPUTS + TREE_CREATURE_BRAIN_HIDDEN),
);
const OUTPUT_WEIGHT_SCALE = Math.sqrt(
  6 / (TREE_CREATURE_BRAIN_HIDDEN + TREE_CREATURE_BRAIN_OUTPUTS),
);
const TAU = Math.PI * 2;
const MODEL_SEED = hashSeed('crystal-big-tree-creature-brain');

export const TREE_CREATURE_ACTIVITY = {
  EAT: 'eat',
  REST: 'rest',
  SOCIAL: 'social',
  ROAM: 'roam',
} as const;

export type TreeCreatureActivity =
  (typeof TREE_CREATURE_ACTIVITY)[keyof typeof TREE_CREATURE_ACTIVITY];

export type TreeCreatureFallbackReason =
  'none' | 'invalid-weights' | 'invalid-input' | 'invalid-output';

/** Raw, world-authored percepts. Finite out-of-range values are clamped; non-finite values use fallback. */
export interface TreeCreaturePercept {
  /** Current nourishment/energy in [0,1]; hunger is its inverse. */
  energy: number;
  /** Unit or near-unit XZ bearing toward reserved reachable food. */
  foodDirectionX: number;
  /** Unit or near-unit XZ bearing toward reserved reachable food. */
  foodDirectionZ: number;
  /** Normalized distance to food: 0 at contact, 1 when distant/unavailable. */
  foodDistance: number;
  /** Nearby willing partners/calm neighbors normalized to [0,1]. */
  socialDensity: number;
  /** Current threat pressure normalized to [0,1]. */
  threat: number;
  /** Big Tree safe-zone calm/support normalized to [0,1]. */
  safeZoneCalm: number;
  /** Simulation phase in radians. */
  phase: number;
  /** Stable individual personality normalized to [0,1]. */
  personality: number;
}

/**
 * Caller-owned action buffer. `motor*` and `*Drive` are direct bounded network/decision evidence;
 * `steer*` and `speed` are the bounded movement command consumed by the creature locomotion system.
 */
export interface TreeCreatureAction {
  motorX: number;
  motorZ: number;
  metabolicDrive: number;
  socialDrive: number;
  steerX: number;
  steerZ: number;
  speed: number;
  eatDrive: number;
  restDrive: number;
  socialActivityDrive: number;
  roamDrive: number;
  activity: TreeCreatureActivity;
  usedFallback: boolean;
}

/** Allocate one reusable action buffer outside the per-frame decision loop. */
export function createTreeCreatureAction(): TreeCreatureAction {
  return {
    motorX: 0,
    motorZ: 0,
    metabolicDrive: 0,
    socialDrive: 0,
    steerX: 0,
    steerZ: 0,
    speed: 0,
    eatDrive: 0,
    restDrive: 1,
    socialActivityDrive: 0,
    roamDrive: 0,
    activity: TREE_CREATURE_ACTIVITY.REST,
    usedFallback: false,
  };
}

export interface TreeCreatureBrainStatus {
  inputCount: number;
  hiddenCount: number;
  outputCount: number;
  parameterCount: number;
  modelReady: boolean;
  decisions: number;
  fallbackCount: number;
  lastActivity: TreeCreatureActivity;
  lastFallbackReason: TreeCreatureFallbackReason;
}

const clamp01 = (value: number): number => (value <= 0 ? 0 : value >= 1 ? 1 : value);
const clampSigned = (value: number): number => (value <= -1 ? -1 : value >= 1 ? 1 : value);
const logistic = (value: number): number => 1 / (1 + Math.exp(-value));

/** One exclusive neural controller instance per tree-dwelling creature. */
export class TreeCreatureBrain {
  private readonly weights = new Float32Array(TREE_CREATURE_BRAIN_PARAMETERS);
  private readonly net: TinyMLP;
  private readonly inputs = new Float32Array(TREE_CREATURE_BRAIN_INPUTS);
  private readonly hidden = new Float32Array(TREE_CREATURE_BRAIN_HIDDEN);
  private readonly outputs = new Float32Array(TREE_CREATURE_BRAIN_OUTPUTS);
  private modelReady = true;
  private decisions = 0;
  private fallbackCount = 0;
  private lastActivity: TreeCreatureActivity = TREE_CREATURE_ACTIVITY.REST;
  private lastFallbackReason: TreeCreatureFallbackReason = 'none';

  /**
   * Build a deterministically seeded model. `initialWeights` supports authored/trained model loading; an
   * invalid shape or non-finite value disables the model until {@link loadWeights} receives a valid vector.
   */
  constructor(seed: number, initialWeights?: ArrayLike<number>) {
    if (initialWeights === undefined) this.initializeWeights(seed);
    else if (!this.copyValidWeights(initialWeights)) {
      this.weights.fill(0);
      this.modelReady = false;
      this.lastFallbackReason = 'invalid-weights';
    }
    this.net = new TinyMLP(
      TREE_CREATURE_BRAIN_INPUTS,
      TREE_CREATURE_BRAIN_HIDDEN,
      TREE_CREATURE_BRAIN_OUTPUTS,
      this.weights,
    );
  }

  /** Live fixed-size weight view for an existing model loader/trainer; non-finite mutations trigger fallback. */
  weightsView(): Float32Array {
    return this.weights;
  }

  /** Validate and copy replacement model weights without allocating. */
  loadWeights(source: ArrayLike<number>): boolean {
    if (!this.copyValidWeights(source)) {
      this.weights.fill(0);
      this.modelReady = false;
      this.lastFallbackReason = 'invalid-weights';
      return false;
    }
    this.modelReady = true;
    this.lastFallbackReason = 'none';
    return true;
  }

  /**
   * Run one allocation-free forward/decision pass into `action`. Network outputs materially affect both
   * movement and activity selection; hard survival/context evidence keeps behavior safe and interpretable.
   */
  decide(percept: TreeCreaturePercept, action: TreeCreatureAction): TreeCreatureAction {
    this.decisions++;
    if (!this.modelReady) {
      const reason =
        this.lastFallbackReason === 'invalid-output' ? 'invalid-output' : 'invalid-weights';
      return this.fallback(action, reason);
    }
    if (!this.isFinitePercept(percept)) return this.fallback(action, 'invalid-input');

    const energy = clamp01(percept.energy);
    const hunger = 1 - energy;
    const foodDistance = clamp01(percept.foodDistance);
    const foodProximity = 1 - foodDistance;
    const socialDensity = clamp01(percept.socialDensity);
    const threat = clamp01(percept.threat);
    const calm = clamp01(percept.safeZoneCalm);
    const personality = clamp01(percept.personality);

    const foodLength = Math.hypot(percept.foodDirectionX, percept.foodDirectionZ);
    let foodX = 0;
    let foodZ = 0;
    let foodBearing = 0;
    if (foodLength > 1e-8) {
      foodX = percept.foodDirectionX / foodLength;
      foodZ = percept.foodDirectionZ / foodLength;
      foodBearing = Math.atan2(foodZ, foodX) / Math.PI;
    }

    const input = this.inputs;
    input[0] = energy * 2 - 1;
    input[1] = foodBearing;
    input[2] = foodProximity * 2 - 1;
    input[3] = socialDensity * 2 - 1;
    input[4] = calm - threat;
    input[5] = Math.sin(percept.phase + (personality * 2 - 1) * Math.PI);

    this.net.forward(input, this.hidden, this.outputs);
    const rawMotorX = this.outputs[0]!;
    const rawMotorZ = this.outputs[1]!;
    const rawMetabolic = this.outputs[2]!;
    const rawSocial = this.outputs[3]!;
    if (
      !Number.isFinite(rawMotorX) ||
      !Number.isFinite(rawMotorZ) ||
      !Number.isFinite(rawMetabolic) ||
      !Number.isFinite(rawSocial)
    ) {
      this.modelReady = false;
      return this.fallback(action, 'invalid-output');
    }

    const motorX = clampSigned(rawMotorX);
    const motorZ = clampSigned(rawMotorZ);
    const metabolicDrive = clampSigned(rawMetabolic);
    const socialDrive = clampSigned(rawSocial);

    // Direct neural axes remain load-bearing while bounded needs/context prevent absurd unsafe choices.
    const eatDrive = logistic(metabolicDrive + hunger * 1.1 + foodProximity * 0.9 - threat * 0.7);
    const restDrive = logistic(-metabolicDrive + hunger * 0.6 + calm * 0.7 - foodProximity * 0.25);
    const socialActivityDrive = logistic(
      socialDrive + socialDensity * 0.8 + calm * 0.5 - threat * 0.8,
    );
    const roamDrive = logistic(
      -socialDrive + energy * 0.6 + (1 - socialDensity) * 0.45 + personality * 0.25 - threat * 0.4,
    );

    let activity: TreeCreatureActivity = TREE_CREATURE_ACTIVITY.EAT;
    let bestDrive = eatDrive;
    if (restDrive > bestDrive) {
      activity = TREE_CREATURE_ACTIVITY.REST;
      bestDrive = restDrive;
    }
    if (socialActivityDrive > bestDrive) {
      activity = TREE_CREATURE_ACTIVITY.SOCIAL;
      bestDrive = socialActivityDrive;
    }
    if (roamDrive > bestDrive) activity = TREE_CREATURE_ACTIVITY.ROAM;

    const phaseHeading = percept.phase + personality * TAU;
    const phaseX = Math.cos(phaseHeading);
    const phaseZ = Math.sin(phaseHeading);
    const motorMagnitude = clamp01(Math.hypot(motorX, motorZ));
    let steerX = motorX * 0.5;
    let steerZ = motorZ * 0.5;
    let speed = 0;
    switch (activity) {
      case TREE_CREATURE_ACTIVITY.EAT: {
        const approach = 0.35 + foodProximity * 0.55;
        steerX += foodX * approach;
        steerZ += foodZ * approach;
        speed = 0.25 + hunger * 0.45 + motorMagnitude * 0.2;
        break;
      }
      case TREE_CREATURE_ACTIVITY.REST:
        steerX *= 0.12;
        steerZ *= 0.12;
        speed = 0.03 + motorMagnitude * 0.07;
        break;
      case TREE_CREATURE_ACTIVITY.SOCIAL:
        steerX += phaseX * (1 - socialDensity) * 0.2;
        steerZ += phaseZ * (1 - socialDensity) * 0.2;
        speed = 0.14 + (1 - socialDensity) * 0.22 + motorMagnitude * 0.14;
        break;
      case TREE_CREATURE_ACTIVITY.ROAM:
        steerX += phaseX * 0.5;
        steerZ += phaseZ * 0.5;
        speed = 0.3 + personality * 0.25 + motorMagnitude * 0.2;
        break;
    }

    const steerMagnitude = Math.hypot(steerX, steerZ);
    if (steerMagnitude > 1) {
      steerX /= steerMagnitude;
      steerZ /= steerMagnitude;
    }
    speed = clamp01(speed);
    if (!Number.isFinite(steerX + steerZ + speed)) {
      this.modelReady = false;
      return this.fallback(action, 'invalid-output');
    }

    action.motorX = motorX;
    action.motorZ = motorZ;
    action.metabolicDrive = metabolicDrive;
    action.socialDrive = socialDrive;
    action.steerX = steerX;
    action.steerZ = steerZ;
    action.speed = speed;
    action.eatDrive = eatDrive;
    action.restDrive = restDrive;
    action.socialActivityDrive = socialActivityDrive;
    action.roamDrive = roamDrive;
    action.activity = activity;
    action.usedFallback = false;
    this.lastActivity = activity;
    this.lastFallbackReason = 'none';
    return action;
  }

  /** Low-cadence development snapshot; intentionally allocates one small object outside the hot path. */
  status(): TreeCreatureBrainStatus {
    return {
      inputCount: TREE_CREATURE_BRAIN_INPUTS,
      hiddenCount: TREE_CREATURE_BRAIN_HIDDEN,
      outputCount: TREE_CREATURE_BRAIN_OUTPUTS,
      parameterCount: TREE_CREATURE_BRAIN_PARAMETERS,
      modelReady: this.modelReady,
      decisions: this.decisions,
      fallbackCount: this.fallbackCount,
      lastActivity: this.lastActivity,
      lastFallbackReason: this.lastFallbackReason,
    };
  }

  private initializeWeights(seed: number): void {
    const derivedSeed = ((seed >>> 0) ^ MODEL_SEED) >>> 0 || 1;
    const rng = mulberry32(derivedSeed);
    let cursor = 0;
    for (let hidden = 0; hidden < TREE_CREATURE_BRAIN_HIDDEN; hidden++) {
      this.weights[cursor++] = 0;
      for (let input = 0; input < TREE_CREATURE_BRAIN_INPUTS; input++) {
        this.weights[cursor++] = (rng() * 2 - 1) * HIDDEN_WEIGHT_SCALE;
      }
    }
    for (let output = 0; output < TREE_CREATURE_BRAIN_OUTPUTS; output++) {
      this.weights[cursor++] = 0;
      for (let hidden = 0; hidden < TREE_CREATURE_BRAIN_HIDDEN; hidden++) {
        this.weights[cursor++] = (rng() * 2 - 1) * OUTPUT_WEIGHT_SCALE;
      }
    }
  }

  private copyValidWeights(source: ArrayLike<number>): boolean {
    if (source.length !== TREE_CREATURE_BRAIN_PARAMETERS) return false;
    for (let i = 0; i < source.length; i++) if (!Number.isFinite(source[i])) return false;
    for (let i = 0; i < source.length; i++) this.weights[i] = source[i]!;
    return true;
  }

  private isFinitePercept(percept: TreeCreaturePercept): boolean {
    return (
      Number.isFinite(percept.energy) &&
      Number.isFinite(percept.foodDirectionX) &&
      Number.isFinite(percept.foodDirectionZ) &&
      Number.isFinite(percept.foodDistance) &&
      Number.isFinite(percept.socialDensity) &&
      Number.isFinite(percept.threat) &&
      Number.isFinite(percept.safeZoneCalm) &&
      Number.isFinite(percept.phase) &&
      Number.isFinite(percept.personality)
    );
  }

  private fallback(
    action: TreeCreatureAction,
    reason: Exclude<TreeCreatureFallbackReason, 'none'>,
  ): TreeCreatureAction {
    action.motorX = 0;
    action.motorZ = 0;
    action.metabolicDrive = 0;
    action.socialDrive = 0;
    action.steerX = 0;
    action.steerZ = 0;
    action.speed = 0;
    action.eatDrive = 0;
    action.restDrive = 1;
    action.socialActivityDrive = 0;
    action.roamDrive = 0;
    action.activity = TREE_CREATURE_ACTIVITY.REST;
    action.usedFallback = true;
    this.fallbackCount++;
    this.lastActivity = TREE_CREATURE_ACTIVITY.REST;
    this.lastFallbackReason = reason;
    return action;
  }
}
