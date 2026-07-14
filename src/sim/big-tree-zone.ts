/**
 * Pure geometry, capacity, slot reservation, and bounded visit lifecycle for the Big Tree.
 *
 * This module intentionally owns no rendering, physics, combat, or species objects. Runtime adapters
 * feed it stable `(ownerKind, ownerId)` identities and positions, then use its state to steer their
 * existing controllers. All per-step storage is fixed at construction and `step()` allocates nothing.
 */

import { CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z } from './constants';

export const NO_BIG_TREE_SLOT = -1;
export const NO_BIG_TREE_VISIT = -1;

const NO_OWNER = -1;
const NO_DEADLINE = Number.POSITIVE_INFINITY;

/** Smaller threshold used for first entry. */
export const BIG_TREE_ZONE_ENTRY_RADIUS = 240;
/** Larger threshold used for exit so boundary noise cannot flap membership. */
export const BIG_TREE_ZONE_EXIT_RADIUS = 270;

export const BigTreeVisitReason = {
  Food: 1,
  Rest: 2,
  Social: 3,
  Safety: 4,
  Curiosity: 5,
} as const;

export type BigTreeVisitReason = (typeof BigTreeVisitReason)[keyof typeof BigTreeVisitReason];

export const BigTreeActivity = {
  None: 0,
  Eat: 1,
  Rest: 2,
  Socialize: 3,
  Observe: 4,
} as const;

export type BigTreeActivity = (typeof BigTreeActivity)[keyof typeof BigTreeActivity];

export const BigTreeSlotKind = {
  Any: 0,
  Eat: BigTreeActivity.Eat,
  Rest: BigTreeActivity.Rest,
  Socialize: BigTreeActivity.Socialize,
  Observe: BigTreeActivity.Observe,
} as const;

export type BigTreeSlotKind = (typeof BigTreeSlotKind)[keyof typeof BigTreeSlotKind];

export const BigTreeVisitState = {
  Outside: 0,
  Travelling: 1,
  Active: 2,
  Leaving: 3,
  Cooldown: 4,
} as const;

export type BigTreeVisitState = (typeof BigTreeVisitState)[keyof typeof BigTreeVisitState];

export function bigTreeVisitStateName(state: BigTreeVisitState): string {
  switch (state) {
    case BigTreeVisitState.Travelling:
      return 'travelling';
    case BigTreeVisitState.Active:
      return 'active';
    case BigTreeVisitState.Leaving:
      return 'leaving';
    case BigTreeVisitState.Cooldown:
      return 'cooldown';
    case BigTreeVisitState.Outside:
      return 'outside';
  }
}

export function bigTreeVisitReasonName(reason: BigTreeVisitReason | 0): string {
  switch (reason) {
    case BigTreeVisitReason.Food:
      return 'food';
    case BigTreeVisitReason.Rest:
      return 'rest';
    case BigTreeVisitReason.Social:
      return 'social';
    case BigTreeVisitReason.Safety:
      return 'safety';
    case BigTreeVisitReason.Curiosity:
      return 'curiosity';
    default:
      return 'none';
  }
}

export function bigTreeActivityName(activity: BigTreeActivity): string {
  switch (activity) {
    case BigTreeActivity.Eat:
      return 'eat';
    case BigTreeActivity.Rest:
      return 'rest';
    case BigTreeActivity.Socialize:
      return 'socialize';
    case BigTreeActivity.Observe:
      return 'observe';
    case BigTreeActivity.None:
      return 'none';
  }
}

/** Last lifecycle event, retained for pull-only development diagnostics and deterministic save/load. */
export const BigTreeTransitionCause = {
  None: 0,
  VisitRequested: 1,
  Arrived: 2,
  StuckRecovery: 3,
  TravelTimeout: 4,
  SlotLost: 5,
  ActivityFinished: 6,
  DwellComplete: 7,
  LeftZone: 8,
  LeaveTimeout: 9,
  CooldownComplete: 10,
  StuckTimeout: 11,
} as const;

export type BigTreeTransitionCause =
  (typeof BigTreeTransitionCause)[keyof typeof BigTreeTransitionCause];

export function bigTreeTransitionCauseName(cause: BigTreeTransitionCause): string {
  switch (cause) {
    case BigTreeTransitionCause.VisitRequested:
      return 'visit-requested';
    case BigTreeTransitionCause.Arrived:
      return 'arrived';
    case BigTreeTransitionCause.StuckRecovery:
      return 'stuck-recovery';
    case BigTreeTransitionCause.TravelTimeout:
      return 'travel-timeout';
    case BigTreeTransitionCause.SlotLost:
      return 'slot-lost';
    case BigTreeTransitionCause.ActivityFinished:
      return 'activity-finished';
    case BigTreeTransitionCause.DwellComplete:
      return 'dwell-complete';
    case BigTreeTransitionCause.LeftZone:
      return 'left-zone';
    case BigTreeTransitionCause.LeaveTimeout:
      return 'leave-timeout';
    case BigTreeTransitionCause.CooldownComplete:
      return 'cooldown-complete';
    case BigTreeTransitionCause.StuckTimeout:
      return 'stuck-timeout';
    default:
      return 'none';
  }
}

export interface BigTreeZoneConfig {
  centerX?: number;
  centerZ?: number;
  enterRadius?: number;
  exitRadius?: number;
}

/** Stateless authored boundary. Membership hysteresis is explicit through `wasInside`. */
export class BigTreeZone {
  readonly centerX: number;
  readonly centerZ: number;
  readonly enterRadius: number;
  readonly exitRadius: number;

  private readonly enterRadiusSquared: number;
  private readonly exitRadiusSquared: number;

  constructor(config: BigTreeZoneConfig = {}) {
    const centerX = config.centerX ?? CRYSTAL_TREE_ORIGIN_X;
    const centerZ = config.centerZ ?? CRYSTAL_TREE_ORIGIN_Z;
    const enterRadius = config.enterRadius ?? BIG_TREE_ZONE_ENTRY_RADIUS;
    const exitRadius = config.exitRadius ?? BIG_TREE_ZONE_EXIT_RADIUS;
    if (
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerZ) ||
      !Number.isFinite(enterRadius) ||
      !Number.isFinite(exitRadius) ||
      enterRadius <= 0 ||
      exitRadius <= enterRadius
    ) {
      throw new RangeError(
        'BigTreeZone requires finite coordinates and exitRadius > enterRadius > 0',
      );
    }
    this.centerX = centerX;
    this.centerZ = centerZ;
    this.enterRadius = enterRadius;
    this.exitRadius = exitRadius;
    this.enterRadiusSquared = enterRadius * enterRadius;
    this.exitRadiusSquared = exitRadius * exitRadius;
  }

  /**
   * Initial entry uses the smaller radius; an existing member remains protected until crossing the
   * larger exit radius. This prevents boundary oscillation without hidden mutable zone state.
   */
  contains(x: number, z: number, wasInside = false): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const dx = x - this.centerX;
    const dz = z - this.centerZ;
    const radiusSquared = wasInside ? this.exitRadiusSquared : this.enterRadiusSquared;
    return dx * dx + dz * dz <= radiusSquared;
  }

  /** Semantic alias used by combat, hazard, and targeting adapters. */
  protects(x: number, z: number, wasInside = false): boolean {
    return this.contains(x, z, wasInside);
  }

  /** A hostile action is legal only when neither participant is protected. */
  harmAllowed(attackerProtected: boolean, targetProtected: boolean): boolean {
    return !attackerProtected && !targetProtected;
  }

  /** Position-based convenience form that applies the same hysteresis to both participants. */
  harmAllowedAt(
    attackerX: number,
    attackerZ: number,
    attackerWasInside: boolean,
    targetX: number,
    targetZ: number,
    targetWasInside: boolean,
  ): boolean {
    return this.harmAllowed(
      this.contains(attackerX, attackerZ, attackerWasInside),
      this.contains(targetX, targetZ, targetWasInside),
    );
  }
}

export interface BigTreeVisitConfig {
  /** Maximum actor records, including actors waiting through a revisit cooldown. */
  maxActors: number;
  /** Maximum concurrent travelling, active, or leaving visitors. */
  capacity: number;
  /** Maximum authored activity/approach slots. */
  maxSlots: number;
  arriveRadius?: number;
  minDwellSeconds?: number;
  maxDwellSeconds?: number;
  minCooldownSeconds?: number;
  maxCooldownSeconds?: number;
  travelTimeoutSeconds?: number;
  leaveTimeoutSeconds?: number;
  slotLeaseSeconds?: number;
  stuckAfterSeconds?: number;
  progressEpsilon?: number;
  maxStuckRecoveries?: number;
  /** World seed folded into per-actor decisions and durations so visit rhythms vary by cosmos. */
  hashSeed?: number;
}

export interface BigTreeVisitView {
  recordId: number;
  ownerKind: number;
  ownerId: number;
  state: BigTreeVisitState;
  reason: BigTreeVisitReason;
  activity: BigTreeActivity;
  slotId: number;
  startedAt: number;
  enteredAt: number;
  stateDeadline: number;
  cooldownUntil: number;
  stuckRecoveries: number;
  visitOrdinal: number;
  partnerKind: number;
  partnerId: number;
  partnerLeaseExpiresAt: number;
  /** Last identity-specific physical membership sample, using the outer exit boundary. */
  insideZone: boolean;
  lastTransitionCause: BigTreeTransitionCause;
  lastTransitionAt: number;
}

export interface BigTreeSlotView {
  slotId: number;
  kind: BigTreeSlotKind;
  x: number;
  z: number;
  ownerKind: number;
  ownerId: number;
  leaseExpiresAt: number;
}

/** Normalized utility inputs. Need-like values are clamped to [0,1]. */
export interface BigTreeVisitContext {
  hunger: number;
  fatigue: number;
  healthDeficit: number;
  stress: number;
  socialNeed: number;
  curiosity: number;
  danger: number;
  /** World-space route length, not straight-line distance when a navigator can provide it. */
  distance: number;
  routeAvailable: boolean;
  foodAvailable: boolean;
  /** Normalized recent-visit pressure; 1 means the actor has just completed a visit. */
  recentVisit: number;
  /** Stable individual disposition: 0 is reluctant, 1 is strongly drawn to the tree. */
  personality: number;
  /** Normalized scheduler/render pressure used only to defer optional curiosity/social visits. */
  simulationLoad: number;
}

/** Caller-owned output for a deterministic contextual visit decision. */
export interface BigTreeVisitDecision {
  shouldVisit: boolean;
  reason: BigTreeVisitReason;
  activity: BigTreeActivity;
  utility: number;
  threshold: number;
}

export interface BigTreeZoneStats {
  trackedActors: number;
  activeVisitors: number;
  /** Maximum simultaneous travelling, active, or leaving visitors. */
  capacity: number;
  /** Unreserved authored interaction positions; this can exceed the visitor-capacity ceiling. */
  availableSlots: number;
  completedVisits: number;
  timedOutVisits: number;
  stuckRecoveryEvents: number;
  forcedExitEvents: number;
  partnerReservations: number;
  partnerTimeouts: number;
  rejectedForCapacity: number;
  rejectedForNoSlot: number;
}

/**
 * JSON-safe primitive state. Null deadlines represent an inactive timer. Transition diagnostics
 * are optional additive v1 fields so checkpoints created before observability was added still load.
 */
export interface BigTreeVisitorState {
  ownerKind: number;
  ownerId: number;
  state: BigTreeVisitState;
  reason: BigTreeVisitReason | 0;
  activity: BigTreeActivity;
  slotId: number;
  startedAt: number;
  enteredAt: number | null;
  stateDeadline: number | null;
  cooldownUntil: number | null;
  lastProgressAt: number;
  lastDistance: number | null;
  stuckRecoveries: number;
  visitOrdinal: number;
  slotLeaseExpiresAt: number | null;
  partnerKind: number;
  partnerId: number;
  partnerLeaseExpiresAt: number | null;
  insideZone: boolean;
  lastTransitionCause?: BigTreeTransitionCause;
  lastTransitionAt?: number | null;
}

export interface BigTreeVisitManagerSnapshot {
  version: 1;
  visitors: BigTreeVisitorState[];
  completedVisits: number;
  timedOutVisits: number;
  stuckRecoveryEvents: number;
  forcedExitEvents: number;
  partnerTimeouts: number;
  rejectedForCapacity: number;
  rejectedForNoSlot: number;
}

/**
 * Fixed-capacity visit/slot state machine.
 *
 * Lifecycle: OUTSIDE -> TRAVELLING -> ACTIVE -> LEAVING -> COOLDOWN -> OUTSIDE. Every phase has a
 * hard deadline. Activity slots have renewable leases and are released on completion, target loss,
 * despawn, reset, timeout, or stuck recovery.
 */
export class BigTreeVisitManager {
  readonly zone: BigTreeZone;
  readonly maxActors: number;
  readonly capacity: number;
  readonly maxSlots: number;

  private readonly arriveRadiusSquared: number;
  private readonly minDwellSeconds: number;
  private readonly maxDwellSeconds: number;
  private readonly minCooldownSeconds: number;
  private readonly maxCooldownSeconds: number;
  private readonly travelTimeoutSeconds: number;
  private readonly hashSeedValue: number;

  /** Authored travel deadline used by adapters for reachability rejection. */
  get travelTimeout(): number {
    return this.travelTimeoutSeconds;
  }
  private readonly leaveTimeoutSeconds: number;
  private readonly slotLeaseSeconds: number;
  private readonly stuckAfterSeconds: number;
  private readonly progressEpsilon: number;
  private readonly maxStuckRecoveries: number;

  private readonly actorUsed: Uint8Array;
  private readonly actorOwnerKinds: Int32Array;
  private readonly actorOwnerIds: Int32Array;
  private readonly actorStates: Uint8Array;
  private readonly actorReasons: Uint8Array;
  private readonly actorActivities: Uint8Array;
  private readonly actorSlots: Int32Array;
  private readonly actorStartedAt: Float64Array;
  private readonly actorEnteredAt: Float64Array;
  private readonly actorStateDeadlines: Float64Array;
  private readonly actorCooldownUntil: Float64Array;
  private readonly actorLastProgressAt: Float64Array;
  private readonly actorLastDistance: Float64Array;
  private readonly actorStuckRecoveries: Uint8Array;
  private readonly actorVisitOrdinals: Uint32Array;
  private readonly actorPartnerKinds: Int32Array;
  private readonly actorPartnerIds: Int32Array;
  private readonly actorPartnerDeadlines: Float64Array;
  private readonly actorInsideZone: Uint8Array;
  private readonly actorLastTransitionCauses: Uint8Array;
  private readonly actorLastTransitionAt: Float64Array;
  /** O(1) identity lookup without constraining the public 31-bit owner namespaces. */
  private readonly actorRecordsByKind = new Map<number, Map<number, number>>();
  /** Dense deadline set: only travelling/active/leaving/cooldown actors are stepped each frame. */
  private readonly scheduledRecordIds: Int32Array;
  private readonly scheduledRecordPositions: Int32Array;
  private scheduledRecordCount = 0;
  /** Deterministic O(1) record allocation/reuse; avoids a growing first-free scan. */
  private readonly freeRecordIds: Int32Array;
  private freeRecordCount: number;

  private readonly slotKinds: Uint8Array;
  private readonly slotXs: Float64Array;
  private readonly slotZs: Float64Array;
  private readonly slotOwnerKinds: Int32Array;
  private readonly slotOwnerIds: Int32Array;
  private readonly slotLeaseDeadlines: Float64Array;

  private definedSlots = 0;
  private usedActors = 0;
  private occupancy = 0;
  private pairedActors = 0;

  completedVisits = 0;
  timedOutVisits = 0;
  stuckRecoveryEvents = 0;
  forcedExitEvents = 0;
  partnerTimeouts = 0;
  rejectedForCapacity = 0;
  rejectedForNoSlot = 0;
  /** Shared adapters call with the same canonical timestamp; process that deadline epoch once. */
  private lastSteppedAt = Number.NaN;
  private processedStepCount = 0;

  constructor(zone: BigTreeZone, config: BigTreeVisitConfig) {
    if (
      !Number.isInteger(config.maxActors) ||
      config.maxActors <= 0 ||
      !Number.isInteger(config.capacity) ||
      config.capacity <= 0 ||
      config.capacity > config.maxActors ||
      !Number.isInteger(config.maxSlots) ||
      config.maxSlots <= 0
    ) {
      throw new RangeError('BigTreeVisitManager requires positive fixed capacities');
    }
    this.zone = zone;
    this.maxActors = config.maxActors;
    this.capacity = config.capacity;
    this.maxSlots = config.maxSlots;
    const arriveRadius = this.positive(config.arriveRadius, 4);
    this.arriveRadiusSquared = arriveRadius * arriveRadius;
    this.minDwellSeconds = this.nonNegative(config.minDwellSeconds, 8);
    this.maxDwellSeconds = this.atLeast(
      config.maxDwellSeconds,
      24,
      this.minDwellSeconds,
      'maxDwellSeconds',
    );
    this.minCooldownSeconds = this.nonNegative(config.minCooldownSeconds, 30);
    this.maxCooldownSeconds = this.atLeast(
      config.maxCooldownSeconds,
      90,
      this.minCooldownSeconds,
      'maxCooldownSeconds',
    );
    this.travelTimeoutSeconds = this.positive(config.travelTimeoutSeconds, 45);
    this.hashSeedValue = Number.isFinite(config.hashSeed) ? config.hashSeed! >>> 0 : 0;
    this.leaveTimeoutSeconds = this.positive(config.leaveTimeoutSeconds, 20);
    this.slotLeaseSeconds = this.positive(config.slotLeaseSeconds, 6);
    this.stuckAfterSeconds = this.positive(config.stuckAfterSeconds, 4);
    this.progressEpsilon = this.positive(config.progressEpsilon, 0.5);
    const recoveries = config.maxStuckRecoveries ?? 2;
    if (!Number.isInteger(recoveries) || recoveries < 0 || recoveries > 255) {
      throw new RangeError('maxStuckRecoveries must be an integer in [0,255]');
    }
    this.maxStuckRecoveries = recoveries;

    const n = this.maxActors;
    this.actorUsed = new Uint8Array(n);
    this.actorOwnerKinds = new Int32Array(n);
    this.actorOwnerIds = new Int32Array(n);
    this.actorStates = new Uint8Array(n);
    this.actorReasons = new Uint8Array(n);
    this.actorActivities = new Uint8Array(n);
    this.actorSlots = new Int32Array(n);
    this.actorStartedAt = new Float64Array(n);
    this.actorEnteredAt = new Float64Array(n);
    this.actorStateDeadlines = new Float64Array(n);
    this.actorCooldownUntil = new Float64Array(n);
    this.actorLastProgressAt = new Float64Array(n);
    this.actorLastDistance = new Float64Array(n);
    this.actorStuckRecoveries = new Uint8Array(n);
    this.actorVisitOrdinals = new Uint32Array(n);
    this.actorPartnerKinds = new Int32Array(n);
    this.actorPartnerIds = new Int32Array(n);
    this.actorPartnerDeadlines = new Float64Array(n);
    this.actorInsideZone = new Uint8Array(n);
    this.actorLastTransitionCauses = new Uint8Array(n);
    this.actorLastTransitionAt = new Float64Array(n);
    this.scheduledRecordIds = new Int32Array(n);
    this.scheduledRecordPositions = new Int32Array(n);
    this.freeRecordIds = new Int32Array(n);
    this.freeRecordCount = n;
    this.actorOwnerKinds.fill(NO_OWNER);
    this.actorOwnerIds.fill(NO_OWNER);
    this.actorSlots.fill(NO_BIG_TREE_SLOT);
    this.actorStateDeadlines.fill(NO_DEADLINE);
    this.actorCooldownUntil.fill(NO_DEADLINE);
    this.actorPartnerKinds.fill(NO_OWNER);
    this.actorPartnerIds.fill(NO_OWNER);
    this.actorPartnerDeadlines.fill(NO_DEADLINE);
    this.actorLastTransitionAt.fill(NO_DEADLINE);
    this.scheduledRecordIds.fill(NO_BIG_TREE_VISIT);
    this.scheduledRecordPositions.fill(NO_BIG_TREE_VISIT);
    for (let index = 0; index < n; index++) this.freeRecordIds[index] = n - 1 - index;

    const s = this.maxSlots;
    this.slotKinds = new Uint8Array(s);
    this.slotXs = new Float64Array(s);
    this.slotZs = new Float64Array(s);
    this.slotOwnerKinds = new Int32Array(s);
    this.slotOwnerIds = new Int32Array(s);
    this.slotLeaseDeadlines = new Float64Array(s);
    this.slotOwnerKinds.fill(NO_OWNER);
    this.slotOwnerIds.fill(NO_OWNER);
    this.slotLeaseDeadlines.fill(NO_DEADLINE);
  }

  get activeVisitors(): number {
    return this.occupancy;
  }

  get trackedActors(): number {
    return this.usedActors;
  }

  get slotCount(): number {
    return this.definedSlots;
  }

  /** Development/performance receipt: unique simulation-time deadline epochs actually processed. */
  get deadlineSteps(): number {
    return this.processedStepCount;
  }

  /** Author one collision-free approach/activity point inside the entry boundary. */
  addSlot(kind: BigTreeSlotKind, x: number, z: number): number {
    if (this.definedSlots >= this.maxSlots) return NO_BIG_TREE_SLOT;
    if (!this.validSlotKind(kind) || !Number.isFinite(x) || !Number.isFinite(z)) {
      throw new RangeError('Big Tree slot kind and coordinates must be valid');
    }
    if (!this.zone.contains(x, z)) {
      throw new RangeError('Big Tree activity slots must be inside the entry boundary');
    }
    const slotId = this.definedSlots++;
    this.slotKinds[slotId] = kind;
    this.slotXs[slotId] = x;
    this.slotZs[slotId] = z;
    this.releaseSlot(slotId);
    return slotId;
  }

  /** Deterministically author a ring of distinct approach/activity points. */
  addRadialSlots(kind: BigTreeSlotKind, count: number, radius: number, phaseRadians = 0): number {
    if (
      !Number.isInteger(count) ||
      count <= 0 ||
      !Number.isFinite(radius) ||
      radius <= 0 ||
      radius >= this.zone.enterRadius ||
      !Number.isFinite(phaseRadians)
    ) {
      throw new RangeError('Big Tree radial slots require a positive count and in-zone radius');
    }
    let added = 0;
    for (let index = 0; index < count && this.definedSlots < this.maxSlots; index++) {
      const angle = phaseRadians + (index / count) * Math.PI * 2;
      if (
        this.addSlot(
          kind,
          this.zone.centerX + Math.cos(angle) * radius,
          this.zone.centerZ + Math.sin(angle) * radius,
        ) !== NO_BIG_TREE_SLOT
      ) {
        added++;
      }
    }
    return added;
  }

  /**
   * Score an optional visit without consuming RNG state or allocating. The caller supplies a stable
   * decision ordinal (for example, an AI polling epoch), so equal inputs always produce equal output
   * while different actors and epochs do not synchronize.
   */
  decideVisit(
    ownerKind: number,
    ownerId: number,
    decisionOrdinal: number,
    context: BigTreeVisitContext,
    out: BigTreeVisitDecision,
  ): boolean {
    out.shouldVisit = false;
    out.reason = BigTreeVisitReason.Curiosity;
    out.activity = BigTreeActivity.Observe;
    out.utility = 0;
    out.threshold = 1;
    if (
      !this.validOwner(ownerKind, ownerId) ||
      !Number.isInteger(decisionOrdinal) ||
      decisionOrdinal < 0 ||
      !context.routeAvailable ||
      !Number.isFinite(context.distance) ||
      context.distance < 0
    ) {
      return false;
    }

    const hunger = this.clamp01(context.hunger);
    const fatigue = this.clamp01(context.fatigue);
    const healthDeficit = this.clamp01(context.healthDeficit);
    const stress = this.clamp01(context.stress);
    const socialNeed = this.clamp01(context.socialNeed);
    const curiosity = this.clamp01(context.curiosity);
    const danger = this.clamp01(context.danger);
    const personality = this.clamp01(context.personality);
    const recentVisit = this.clamp01(context.recentVisit);
    const simulationLoad = this.clamp01(context.simulationLoad);

    const food = context.foodAvailable ? hunger * 1.35 + healthDeficit * 0.1 : 0;
    const rest = fatigue * 1.05 + healthDeficit * 0.5 + stress * 0.2;
    const social = socialNeed * 1.05 + stress * 0.12;
    const safety = danger * 1.5 + stress * 0.45 + healthDeficit * 0.2;
    const explore = curiosity * 0.7 + personality * 0.12;
    const best = Math.max(food, rest, social, safety, explore);

    // Select an activity probabilistically without mutable RNG state. Squaring each positive score
    // preserves a strong preference for the most urgent need while leaving lower, non-zero needs a
    // real chance. The actor identity and polling ordinal decorrelate otherwise identical visitors.
    // Overall visit utility remains based on the strongest need, so a high-priority safety visit is
    // not rejected merely because that visitor deterministically samples a secondary activity.
    const foodWeight = food * food;
    const restWeight = rest * rest;
    const socialWeight = social * social;
    const safetyWeight = safety * safety;
    const exploreWeight = explore * explore;
    const totalWeight = foodWeight + restWeight + socialWeight + safetyWeight + exploreWeight;
    let reason: BigTreeVisitReason = BigTreeVisitReason.Curiosity;
    if (totalWeight > 0) {
      const selection = this.sampleRange(
        ownerKind,
        ownerId,
        decisionOrdinal,
        0x6d2b79f5,
        0,
        totalWeight,
      );
      let boundary = foodWeight;
      if (selection < boundary) {
        reason = BigTreeVisitReason.Food;
      } else if (selection < (boundary += restWeight)) {
        reason = BigTreeVisitReason.Rest;
      } else if (selection < (boundary += socialWeight)) {
        reason = BigTreeVisitReason.Social;
      } else if (selection < (boundary += safetyWeight)) {
        reason = BigTreeVisitReason.Safety;
      }
    }

    const distanceFactor = 1 / (1 + context.distance / 600);
    const crowd = this.capacity <= 0 ? 1 : this.occupancy / this.capacity;
    const crowdFactor = 1 - Math.min(1, crowd) * 0.45;
    const recencyFactor = 1 - recentVisit * 0.6;
    const optionalLoadFactor =
      reason === BigTreeVisitReason.Safety || reason === BigTreeVisitReason.Food
        ? 1
        : 1 - simulationLoad * 0.4;
    const utility =
      Math.max(0, best) * distanceFactor * crowdFactor * recencyFactor * optionalLoadFactor;
    const sampledThreshold = this.sampleRange(
      ownerKind,
      ownerId,
      decisionOrdinal + 1,
      0xa511e9b3,
      0.42,
      0.76,
    );
    const threshold = Math.max(0.22, sampledThreshold - personality * 0.16);

    out.reason = reason;
    out.activity = this.activityForReason(reason);
    out.utility = utility;
    out.threshold = threshold;
    out.shouldVisit = utility >= threshold && this.occupancy < this.capacity;
    return out.shouldVisit;
  }

  /** Decide and reserve a visit in one integration-friendly call. */
  requestContextualVisit(
    ownerKind: number,
    ownerId: number,
    decisionOrdinal: number,
    context: BigTreeVisitContext,
    decisionOut: BigTreeVisitDecision,
    now: number,
    x: number,
    z: number,
  ): number {
    if (!this.decideVisit(ownerKind, ownerId, decisionOrdinal, context, decisionOut)) {
      return NO_BIG_TREE_VISIT;
    }
    return this.requestVisit(ownerKind, ownerId, decisionOut.reason, now, x, z);
  }

  /**
   * Begin a capacity-limited visit and reserve the nearest compatible free slot. Returns a stable
   * record id, or -1 when the actor is cooling down, already visiting, the zone is full, or no slot
   * is available.
   */
  requestVisit(
    ownerKind: number,
    ownerId: number,
    reason: BigTreeVisitReason,
    now: number,
    x: number,
    z: number,
  ): number {
    if (
      !this.validOwner(ownerKind, ownerId) ||
      !this.validReason(reason) ||
      !Number.isFinite(now) ||
      !Number.isFinite(x) ||
      !Number.isFinite(z)
    ) {
      return NO_BIG_TREE_VISIT;
    }

    let recordId = this.findActor(ownerKind, ownerId);
    if (recordId !== NO_BIG_TREE_VISIT) {
      const state = this.actorStates[recordId];
      if (state === BigTreeVisitState.Cooldown) {
        if (
          now < (this.actorCooldownUntil[recordId] ?? NO_DEADLINE) ||
          this.actorInsideZone[recordId] !== 0
        ) {
          return NO_BIG_TREE_VISIT;
        }
        this.actorStates[recordId] = BigTreeVisitState.Outside;
        this.recordTransition(recordId, BigTreeTransitionCause.CooldownComplete, now);
        this.unscheduleRecord(recordId);
      } else if (state !== BigTreeVisitState.Outside) {
        return NO_BIG_TREE_VISIT;
      }
    }
    if (this.occupancy >= this.capacity) {
      this.rejectedForCapacity++;
      return NO_BIG_TREE_VISIT;
    }

    const activity = this.activityForReason(reason);
    const slotId = this.findNearestFreeSlot(activity, x, z, NO_BIG_TREE_SLOT);
    if (slotId === NO_BIG_TREE_SLOT) {
      this.rejectedForNoSlot++;
      return NO_BIG_TREE_VISIT;
    }

    if (recordId === NO_BIG_TREE_VISIT) {
      recordId = this.acquireActorRecord(ownerKind, ownerId);
      if (recordId === NO_BIG_TREE_VISIT) return NO_BIG_TREE_VISIT;
    }

    this.reserveSlot(slotId, ownerKind, ownerId, now);
    const ordinal = ((this.actorVisitOrdinals[recordId] ?? 0) + 1) >>> 0;
    this.actorVisitOrdinals[recordId] = ordinal === 0 ? 1 : ordinal;
    this.actorStates[recordId] = BigTreeVisitState.Travelling;
    this.actorReasons[recordId] = reason;
    this.actorActivities[recordId] = activity;
    this.actorSlots[recordId] = slotId;
    this.actorStartedAt[recordId] = now;
    this.actorEnteredAt[recordId] = NO_DEADLINE;
    this.actorStateDeadlines[recordId] = now + this.travelTimeoutSeconds;
    this.actorCooldownUntil[recordId] = NO_DEADLINE;
    this.actorLastProgressAt[recordId] = now;
    this.actorLastDistance[recordId] = this.distanceToSlot(slotId, x, z);
    this.actorStuckRecoveries[recordId] = 0;
    this.actorInsideZone[recordId] = this.zone.contains(x, z, true) ? 1 : 0;
    this.recordTransition(recordId, BigTreeTransitionCause.VisitRequested, now);
    this.scheduleRecord(recordId);
    this.occupancy++;
    return recordId;
  }

  /**
   * Feed one actor's current position into the lifecycle. Returns its resulting state. Call at the
   * actor's normal AI cadence; leases and hard deadlines remain correct between calls via `step(now)`.
   */
  updatePosition(
    ownerKind: number,
    ownerId: number,
    x: number,
    z: number,
    now: number,
  ): BigTreeVisitState {
    const recordId = this.findActor(ownerKind, ownerId);
    if (
      recordId === NO_BIG_TREE_VISIT ||
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      !Number.isFinite(now)
    ) {
      return BigTreeVisitState.Outside;
    }

    const state = this.actorStates[recordId] as BigTreeVisitState;
    this.actorInsideZone[recordId] = this.zone.contains(x, z, true) ? 1 : 0;
    if (state === BigTreeVisitState.Travelling) {
      if (now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE)) {
        this.timedOutVisits++;
        this.toCooldown(recordId, now, BigTreeTransitionCause.TravelTimeout);
        return BigTreeVisitState.Cooldown;
      }
      const slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
      if (!this.slotOwnedBy(slotId, ownerKind, ownerId)) {
        this.toCooldown(recordId, now, BigTreeTransitionCause.SlotLost);
        return BigTreeVisitState.Cooldown;
      }
      this.slotLeaseDeadlines[slotId] = now + this.slotLeaseSeconds;
      const dx = x - (this.slotXs[slotId] ?? 0);
      const dz = z - (this.slotZs[slotId] ?? 0);
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared <= this.arriveRadiusSquared && this.zone.contains(x, z)) {
        this.actorStates[recordId] = BigTreeVisitState.Active;
        this.actorEnteredAt[recordId] = now;
        this.actorStateDeadlines[recordId] =
          now +
          this.sampleRange(
            ownerKind,
            ownerId,
            this.actorVisitOrdinals[recordId] ?? 1,
            0x51ed270b,
            this.minDwellSeconds,
            this.maxDwellSeconds,
          );
        this.recordTransition(recordId, BigTreeTransitionCause.Arrived, now);
        return BigTreeVisitState.Active;
      }

      const distance = Math.sqrt(distanceSquared);
      const previous = this.actorLastDistance[recordId] ?? NO_DEADLINE;
      if (distance <= previous - this.progressEpsilon) {
        this.actorLastDistance[recordId] = distance;
        this.actorLastProgressAt[recordId] = now;
      } else if (now - (this.actorLastProgressAt[recordId] ?? now) >= this.stuckAfterSeconds) {
        if (!this.recoverStuck(recordId, x, z, now)) {
          this.timedOutVisits++;
          this.toCooldown(recordId, now, BigTreeTransitionCause.StuckTimeout);
          return BigTreeVisitState.Cooldown;
        }
      }
      return this.actorStates[recordId] as BigTreeVisitState;
    }

    if (state === BigTreeVisitState.Active) {
      if (!this.zone.contains(x, z, true)) {
        this.completedVisits++;
        this.toCooldown(recordId, now, BigTreeTransitionCause.LeftZone);
        return BigTreeVisitState.Cooldown;
      }
      const slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
      if (!this.slotOwnedBy(slotId, ownerKind, ownerId)) {
        this.toLeaving(recordId, now, BigTreeTransitionCause.SlotLost);
        return BigTreeVisitState.Leaving;
      }
      this.slotLeaseDeadlines[slotId] = now + this.slotLeaseSeconds;
      if (now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE)) {
        this.toLeaving(recordId, now, BigTreeTransitionCause.DwellComplete);
        return BigTreeVisitState.Leaving;
      }
      return BigTreeVisitState.Active;
    }

    if (state === BigTreeVisitState.Leaving) {
      if (!this.zone.contains(x, z, true)) {
        this.completedVisits++;
        this.toCooldown(recordId, now, BigTreeTransitionCause.LeftZone);
        return BigTreeVisitState.Cooldown;
      }
      if (now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE)) {
        this.forcedExitEvents++;
        this.toCooldown(recordId, now, BigTreeTransitionCause.LeaveTimeout);
        return BigTreeVisitState.Cooldown;
      }
      return BigTreeVisitState.Leaving;
    }

    if (
      state === BigTreeVisitState.Cooldown &&
      now >= (this.actorCooldownUntil[recordId] ?? NO_DEADLINE) &&
      this.actorInsideZone[recordId] === 0
    ) {
      this.actorStates[recordId] = BigTreeVisitState.Outside;
      this.recordTransition(recordId, BigTreeTransitionCause.CooldownComplete, now);
      return BigTreeVisitState.Outside;
    }
    return state;
  }

  /** Finish an activity early while preserving the bounded leave/cooldown phases. */
  finishActivity(ownerKind: number, ownerId: number, now: number): boolean {
    const recordId = this.findActor(ownerKind, ownerId);
    if (
      recordId === NO_BIG_TREE_VISIT ||
      !Number.isFinite(now) ||
      this.actorStates[recordId] !== BigTreeVisitState.Active
    ) {
      return false;
    }
    this.toLeaving(recordId, now, BigTreeTransitionCause.ActivityFinished);
    return true;
  }

  /**
   * Reserve a willing, active social partner symmetrically. A partner can participate in at most one
   * interaction, and the lease times out unless either participant renews it.
   */
  reservePartner(
    ownerKind: number,
    ownerId: number,
    partnerKind: number,
    partnerId: number,
    now: number,
    willing: boolean,
    leaseSeconds = this.slotLeaseSeconds,
  ): boolean {
    if (
      !willing ||
      !Number.isFinite(now) ||
      !Number.isFinite(leaseSeconds) ||
      leaseSeconds <= 0 ||
      (ownerKind === partnerKind && ownerId === partnerId)
    ) {
      return false;
    }
    const ownerRecord = this.findActor(ownerKind, ownerId);
    const partnerRecord = this.findActor(partnerKind, partnerId);
    if (
      ownerRecord === NO_BIG_TREE_VISIT ||
      partnerRecord === NO_BIG_TREE_VISIT ||
      this.actorStates[ownerRecord] !== BigTreeVisitState.Active ||
      this.actorStates[partnerRecord] !== BigTreeVisitState.Active ||
      this.actorActivities[ownerRecord] !== BigTreeActivity.Socialize ||
      (this.actorActivities[partnerRecord] !== BigTreeActivity.Socialize &&
        this.actorActivities[partnerRecord] !== BigTreeActivity.Observe)
    ) {
      return false;
    }

    const ownerPartnerRecord = this.partnerRecordOf(ownerRecord);
    const otherPartnerRecord = this.partnerRecordOf(partnerRecord);
    if (ownerPartnerRecord === partnerRecord && otherPartnerRecord === ownerRecord) {
      const deadline = now + leaseSeconds;
      this.actorPartnerDeadlines[ownerRecord] = deadline;
      this.actorPartnerDeadlines[partnerRecord] = deadline;
      return true;
    }
    if (ownerPartnerRecord !== NO_BIG_TREE_VISIT || otherPartnerRecord !== NO_BIG_TREE_VISIT) {
      return false;
    }

    this.actorPartnerKinds[ownerRecord] = partnerKind;
    this.actorPartnerIds[ownerRecord] = partnerId;
    this.actorPartnerKinds[partnerRecord] = ownerKind;
    this.actorPartnerIds[partnerRecord] = ownerId;
    const deadline = now + leaseSeconds;
    this.actorPartnerDeadlines[ownerRecord] = deadline;
    this.actorPartnerDeadlines[partnerRecord] = deadline;
    this.pairedActors++;
    return true;
  }

  releasePartner(ownerKind: number, ownerId: number): boolean {
    const recordId = this.findActor(ownerKind, ownerId);
    if (recordId === NO_BIG_TREE_VISIT || this.partnerRecordOf(recordId) === NO_BIG_TREE_VISIT) {
      return false;
    }
    this.releaseActorPartner(recordId);
    return true;
  }

  /** Despawn/error cleanup: release every slot and remove the actor without a cooldown. */
  cancelActor(ownerKind: number, ownerId: number): boolean {
    const recordId = this.findActor(ownerKind, ownerId);
    if (recordId === NO_BIG_TREE_VISIT) return false;
    if (this.isOccupying(this.actorStates[recordId] as BigTreeVisitState)) this.occupancy--;
    this.releaseActorPartner(recordId);
    this.releaseActorSlot(recordId);
    this.clearActorRecord(recordId);
    this.usedActors--;
    return true;
  }

  /**
   * Release one adapter/species namespace without disturbing actors owned by another adapter.
   * Reset/genesis paths may call this outside the hot loop; iteration is bounded by that kind's
   * tracked records rather than the global actor ceiling.
   */
  cancelOwnerKind(ownerKind: number): number {
    if (!Number.isInteger(ownerKind) || ownerKind < 0) return 0;
    const records = this.actorRecordsByKind.get(ownerKind);
    if (!records) return 0;
    let cancelled = 0;
    for (const ownerId of records.keys()) {
      if (this.cancelActor(ownerKind, ownerId)) cancelled++;
    }
    return cancelled;
  }

  /**
   * Advance hard deadlines and lease expiry without actor objects or allocation. Paused simulation
   * passes the same `now`, so no dwell, lease, exit, or cooldown time elapses while paused.
   */
  step(now: number): void {
    if (!Number.isFinite(now)) return;
    if (now === this.lastSteppedAt) return;
    this.lastSteppedAt = now;
    this.processedStepCount++;
    let scheduledIndex = 0;
    while (scheduledIndex < this.scheduledRecordCount) {
      const recordId = this.scheduledRecordIds[scheduledIndex] ?? NO_BIG_TREE_VISIT;
      if (recordId === NO_BIG_TREE_VISIT || this.actorUsed[recordId] === 0) {
        if (recordId !== NO_BIG_TREE_VISIT) this.unscheduleRecord(recordId);
        else scheduledIndex++;
        continue;
      }
      if (
        this.actorPartnerKinds[recordId] !== NO_OWNER &&
        now >= (this.actorPartnerDeadlines[recordId] ?? NO_DEADLINE)
      ) {
        this.partnerTimeouts++;
        this.releaseActorPartner(recordId);
      }
      const state = this.actorStates[recordId] as BigTreeVisitState;
      const slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
      if (state === BigTreeVisitState.Travelling) {
        const lifecycleExpired = now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE);
        const leaseExpired =
          slotId === NO_BIG_TREE_SLOT || now >= (this.slotLeaseDeadlines[slotId] ?? NO_DEADLINE);
        if (lifecycleExpired || leaseExpired) {
          this.timedOutVisits++;
          this.toCooldown(
            recordId,
            now,
            lifecycleExpired
              ? BigTreeTransitionCause.TravelTimeout
              : BigTreeTransitionCause.SlotLost,
          );
        }
      } else if (state === BigTreeVisitState.Active) {
        const lifecycleExpired = now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE);
        const leaseExpired =
          slotId === NO_BIG_TREE_SLOT || now >= (this.slotLeaseDeadlines[slotId] ?? NO_DEADLINE);
        if (lifecycleExpired || leaseExpired) {
          this.toLeaving(
            recordId,
            now,
            lifecycleExpired
              ? BigTreeTransitionCause.DwellComplete
              : BigTreeTransitionCause.SlotLost,
          );
        }
      } else if (
        state === BigTreeVisitState.Leaving &&
        now >= (this.actorStateDeadlines[recordId] ?? NO_DEADLINE)
      ) {
        this.forcedExitEvents++;
        this.toCooldown(recordId, now, BigTreeTransitionCause.LeaveTimeout);
      } else if (
        state === BigTreeVisitState.Cooldown &&
        now >= (this.actorCooldownUntil[recordId] ?? NO_DEADLINE)
      ) {
        // A cooldown is time-bounded, but optional revisits also require a real boundary exit.
        // Stop scheduling the elapsed timer; the owning adapter's staggered candidate sample will
        // call updatePosition and release this record only after the body crosses the exit radius.
        if (this.actorInsideZone[recordId] === 0) {
          this.actorStates[recordId] = BigTreeVisitState.Outside;
          this.recordTransition(recordId, BigTreeTransitionCause.CooldownComplete, now);
        }
        this.unscheduleRecord(recordId);
        continue;
      } else if (state === BigTreeVisitState.Outside) {
        this.unscheduleRecord(recordId);
        continue;
      }
      scheduledIndex++;
    }

    // Clean any orphaned slot lease left by a caller error. Normal actor transitions release first.
    for (let slotId = 0; slotId < this.definedSlots; slotId++) {
      if (
        this.slotOwnerKinds[slotId] !== NO_OWNER &&
        now >= (this.slotLeaseDeadlines[slotId] ?? NO_DEADLINE)
      ) {
        this.releaseSlot(slotId);
      }
    }
  }

  /** Release all visits/reservations while retaining authored slot positions. */
  reset(): void {
    for (let slotId = 0; slotId < this.definedSlots; slotId++) this.releaseSlot(slotId);
    for (let recordId = 0; recordId < this.maxActors; recordId++) this.clearActorRecord(recordId);
    this.scheduledRecordIds.fill(NO_BIG_TREE_VISIT);
    this.scheduledRecordPositions.fill(NO_BIG_TREE_VISIT);
    this.scheduledRecordCount = 0;
    this.freeRecordCount = this.maxActors;
    for (let index = 0; index < this.maxActors; index++) {
      this.freeRecordIds[index] = this.maxActors - 1 - index;
    }
    this.usedActors = 0;
    this.occupancy = 0;
    this.pairedActors = 0;
    this.completedVisits = 0;
    this.timedOutVisits = 0;
    this.stuckRecoveryEvents = 0;
    this.forcedExitEvents = 0;
    this.partnerTimeouts = 0;
    this.rejectedForCapacity = 0;
    this.rejectedForNoSlot = 0;
    this.lastSteppedAt = Number.NaN;
    this.processedStepCount = 0;
  }

  stateOf(ownerKind: number, ownerId: number): BigTreeVisitState {
    const recordId = this.findActor(ownerKind, ownerId);
    return recordId === NO_BIG_TREE_VISIT
      ? BigTreeVisitState.Outside
      : (this.actorStates[recordId] as BigTreeVisitState);
  }

  selectedSlotOf(ownerKind: number, ownerId: number): number {
    const recordId = this.findActor(ownerKind, ownerId);
    return recordId === NO_BIG_TREE_VISIT
      ? NO_BIG_TREE_SLOT
      : (this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT);
  }

  /** Fill caller-owned debug/telemetry storage. */
  readVisit(ownerKind: number, ownerId: number, out: BigTreeVisitView): boolean {
    const recordId = this.findActor(ownerKind, ownerId);
    if (recordId === NO_BIG_TREE_VISIT) return false;
    out.recordId = recordId;
    out.ownerKind = this.actorOwnerKinds[recordId] ?? NO_OWNER;
    out.ownerId = this.actorOwnerIds[recordId] ?? NO_OWNER;
    out.state = this.actorStates[recordId] as BigTreeVisitState;
    out.reason = this.actorReasons[recordId] as BigTreeVisitReason;
    out.activity = this.actorActivities[recordId] as BigTreeActivity;
    out.slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
    out.startedAt = this.actorStartedAt[recordId] ?? 0;
    out.enteredAt = this.actorEnteredAt[recordId] ?? NO_DEADLINE;
    out.stateDeadline = this.actorStateDeadlines[recordId] ?? NO_DEADLINE;
    out.cooldownUntil = this.actorCooldownUntil[recordId] ?? NO_DEADLINE;
    out.stuckRecoveries = this.actorStuckRecoveries[recordId] ?? 0;
    out.visitOrdinal = this.actorVisitOrdinals[recordId] ?? 0;
    out.partnerKind = this.actorPartnerKinds[recordId] ?? NO_OWNER;
    out.partnerId = this.actorPartnerIds[recordId] ?? NO_OWNER;
    out.partnerLeaseExpiresAt = this.actorPartnerDeadlines[recordId] ?? NO_DEADLINE;
    out.insideZone = this.actorInsideZone[recordId] !== 0;
    out.lastTransitionCause = this.actorLastTransitionCauses[recordId] as BigTreeTransitionCause;
    out.lastTransitionAt = this.actorLastTransitionAt[recordId] ?? NO_DEADLINE;
    return true;
  }

  /** Fill caller-owned aggregate telemetry without producing garbage on a debug polling loop. */
  readStats(out: BigTreeZoneStats): void {
    let availableSlots = 0;
    for (let slotId = 0; slotId < this.definedSlots; slotId++) {
      if (this.slotOwnerKinds[slotId] === NO_OWNER) availableSlots++;
    }
    out.trackedActors = this.usedActors;
    out.activeVisitors = this.occupancy;
    out.capacity = this.capacity;
    out.availableSlots = availableSlots;
    out.completedVisits = this.completedVisits;
    out.timedOutVisits = this.timedOutVisits;
    out.stuckRecoveryEvents = this.stuckRecoveryEvents;
    out.forcedExitEvents = this.forcedExitEvents;
    out.partnerReservations = this.pairedActors;
    out.partnerTimeouts = this.partnerTimeouts;
    out.rejectedForCapacity = this.rejectedForCapacity;
    out.rejectedForNoSlot = this.rejectedForNoSlot;
  }

  /** Fill caller-owned slot debug/steering storage. */
  readSlot(slotId: number, out: BigTreeSlotView): boolean {
    if (!Number.isInteger(slotId) || slotId < 0 || slotId >= this.definedSlots) return false;
    out.slotId = slotId;
    out.kind = this.slotKinds[slotId] as BigTreeSlotKind;
    out.x = this.slotXs[slotId] ?? 0;
    out.z = this.slotZs[slotId] ?? 0;
    out.ownerKind = this.slotOwnerKinds[slotId] ?? NO_OWNER;
    out.ownerId = this.slotOwnerIds[slotId] ?? NO_OWNER;
    out.leaseExpiresAt = this.slotLeaseDeadlines[slotId] ?? NO_DEADLINE;
    return true;
  }

  /**
   * Capture manager-local JSON-safe state for deterministic tests and coordinated replay checkpoints.
   * This is not a standalone World save: callers must pair it with the same simulation clock, authored
   * slot/config layout, food registry, adapter bindings, and sanctuary membership history.
   */
  snapshot(): BigTreeVisitManagerSnapshot {
    const visitors: BigTreeVisitorState[] = [];
    for (let recordId = 0; recordId < this.maxActors; recordId++) {
      if (this.actorUsed[recordId] === 0) continue;
      const slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
      visitors.push({
        ownerKind: this.actorOwnerKinds[recordId] ?? NO_OWNER,
        ownerId: this.actorOwnerIds[recordId] ?? NO_OWNER,
        state: this.actorStates[recordId] as BigTreeVisitState,
        reason: (this.actorReasons[recordId] ?? 0) as BigTreeVisitReason | 0,
        activity: this.actorActivities[recordId] as BigTreeActivity,
        slotId,
        startedAt: this.actorStartedAt[recordId] ?? 0,
        enteredAt: this.finiteDeadline(this.actorEnteredAt[recordId]),
        stateDeadline: this.finiteDeadline(this.actorStateDeadlines[recordId]),
        cooldownUntil: this.finiteDeadline(this.actorCooldownUntil[recordId]),
        lastProgressAt: this.actorLastProgressAt[recordId] ?? 0,
        lastDistance: this.finiteDeadline(this.actorLastDistance[recordId]),
        stuckRecoveries: this.actorStuckRecoveries[recordId] ?? 0,
        visitOrdinal: this.actorVisitOrdinals[recordId] ?? 0,
        slotLeaseExpiresAt:
          slotId === NO_BIG_TREE_SLOT ? null : this.finiteDeadline(this.slotLeaseDeadlines[slotId]),
        partnerKind: this.actorPartnerKinds[recordId] ?? NO_OWNER,
        partnerId: this.actorPartnerIds[recordId] ?? NO_OWNER,
        partnerLeaseExpiresAt: this.finiteDeadline(this.actorPartnerDeadlines[recordId]),
        insideZone: this.actorInsideZone[recordId] !== 0,
        lastTransitionCause: this.actorLastTransitionCauses[recordId] as BigTreeTransitionCause,
        lastTransitionAt: this.finiteDeadline(this.actorLastTransitionAt[recordId]),
      });
    }
    return {
      version: 1,
      visitors,
      completedVisits: this.completedVisits,
      timedOutVisits: this.timedOutVisits,
      stuckRecoveryEvents: this.stuckRecoveryEvents,
      forcedExitEvents: this.forcedExitEvents,
      partnerTimeouts: this.partnerTimeouts,
      rejectedForCapacity: this.rejectedForCapacity,
      rejectedForNoSlot: this.rejectedForNoSlot,
    };
  }

  /** Restore a snapshot after validating identities, slots, capacity, and reciprocal partnerships. */
  restore(snapshot: BigTreeVisitManagerSnapshot): void {
    if (snapshot.version !== 1 || snapshot.visitors.length > this.maxActors) {
      throw new RangeError('Incompatible Big Tree visit snapshot');
    }
    this.validateCounter(snapshot.completedVisits, 'completedVisits');
    this.validateCounter(snapshot.timedOutVisits, 'timedOutVisits');
    this.validateCounter(snapshot.stuckRecoveryEvents, 'stuckRecoveryEvents');
    this.validateCounter(snapshot.forcedExitEvents, 'forcedExitEvents');
    this.validateCounter(snapshot.partnerTimeouts, 'partnerTimeouts');
    this.validateCounter(snapshot.rejectedForCapacity, 'rejectedForCapacity');
    this.validateCounter(snapshot.rejectedForNoSlot, 'rejectedForNoSlot');

    let restoredOccupancy = 0;
    let restoredPairs = 0;
    for (let index = 0; index < snapshot.visitors.length; index++) {
      const visitor = snapshot.visitors[index]!;
      this.validateVisitorState(visitor);
      if (this.isOccupying(visitor.state)) restoredOccupancy++;
      for (let other = 0; other < index; other++) {
        const previous = snapshot.visitors[other]!;
        if (previous.ownerKind === visitor.ownerKind && previous.ownerId === visitor.ownerId) {
          throw new RangeError('Big Tree snapshot contains a duplicate actor identity');
        }
        if (visitor.slotId !== NO_BIG_TREE_SLOT && visitor.slotId === previous.slotId) {
          throw new RangeError('Big Tree snapshot contains a duplicate slot reservation');
        }
      }
      if (visitor.partnerKind !== NO_OWNER) {
        let reciprocal = false;
        for (let partnerIndex = 0; partnerIndex < snapshot.visitors.length; partnerIndex++) {
          const partner = snapshot.visitors[partnerIndex]!;
          if (
            partner.ownerKind === visitor.partnerKind &&
            partner.ownerId === visitor.partnerId &&
            partner.partnerKind === visitor.ownerKind &&
            partner.partnerId === visitor.ownerId &&
            partner.partnerLeaseExpiresAt === visitor.partnerLeaseExpiresAt
          ) {
            if (
              visitor.activity !== BigTreeActivity.Socialize &&
              partner.activity !== BigTreeActivity.Socialize
            ) {
              throw new RangeError('Big Tree partner reservation requires a social visitor');
            }
            reciprocal = true;
            if (
              visitor.ownerKind < partner.ownerKind ||
              (visitor.ownerKind === partner.ownerKind && visitor.ownerId < partner.ownerId)
            ) {
              restoredPairs++;
            }
            break;
          }
        }
        if (!reciprocal) throw new RangeError('Big Tree partner reservation must be reciprocal');
      }
    }
    if (restoredOccupancy > this.capacity) {
      throw new RangeError('Big Tree snapshot exceeds configured visitor capacity');
    }

    this.reset();
    for (let index = 0; index < snapshot.visitors.length; index++) {
      const visitor = snapshot.visitors[index]!;
      const recordId = this.acquireActorRecord(visitor.ownerKind, visitor.ownerId);
      this.actorStates[recordId] = visitor.state;
      this.actorReasons[recordId] = visitor.reason;
      this.actorActivities[recordId] = visitor.activity;
      this.actorSlots[recordId] = visitor.slotId;
      this.actorStartedAt[recordId] = visitor.startedAt;
      this.actorEnteredAt[recordId] = this.restoreDeadline(visitor.enteredAt);
      this.actorStateDeadlines[recordId] = this.restoreDeadline(visitor.stateDeadline);
      this.actorCooldownUntil[recordId] = this.restoreDeadline(visitor.cooldownUntil);
      this.actorLastProgressAt[recordId] = visitor.lastProgressAt;
      this.actorLastDistance[recordId] = this.restoreDeadline(visitor.lastDistance);
      this.actorStuckRecoveries[recordId] = visitor.stuckRecoveries;
      this.actorVisitOrdinals[recordId] = visitor.visitOrdinal;
      this.actorPartnerKinds[recordId] = visitor.partnerKind;
      this.actorPartnerIds[recordId] = visitor.partnerId;
      this.actorPartnerDeadlines[recordId] = this.restoreDeadline(visitor.partnerLeaseExpiresAt);
      this.actorInsideZone[recordId] = visitor.insideZone ? 1 : 0;
      this.actorLastTransitionCauses[recordId] =
        visitor.lastTransitionCause ?? BigTreeTransitionCause.None;
      this.actorLastTransitionAt[recordId] = this.restoreDeadline(visitor.lastTransitionAt ?? null);
      if (visitor.state !== BigTreeVisitState.Outside) this.scheduleRecord(recordId);
      if (visitor.slotId !== NO_BIG_TREE_SLOT) {
        this.slotOwnerKinds[visitor.slotId] = visitor.ownerKind;
        this.slotOwnerIds[visitor.slotId] = visitor.ownerId;
        this.slotLeaseDeadlines[visitor.slotId] = this.restoreDeadline(visitor.slotLeaseExpiresAt);
      }
    }
    this.occupancy = restoredOccupancy;
    this.pairedActors = restoredPairs;
    this.completedVisits = snapshot.completedVisits;
    this.timedOutVisits = snapshot.timedOutVisits;
    this.stuckRecoveryEvents = snapshot.stuckRecoveryEvents;
    this.forcedExitEvents = snapshot.forcedExitEvents;
    this.partnerTimeouts = snapshot.partnerTimeouts;
    this.rejectedForCapacity = snapshot.rejectedForCapacity;
    this.rejectedForNoSlot = snapshot.rejectedForNoSlot;
  }

  private recoverStuck(recordId: number, x: number, z: number, now: number): boolean {
    const recoveries = this.actorStuckRecoveries[recordId] ?? 0;
    if (recoveries >= this.maxStuckRecoveries) return false;
    const oldSlot = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
    const activity = this.actorActivities[recordId] as BigTreeActivity;
    const ownerKind = this.actorOwnerKinds[recordId] ?? NO_OWNER;
    const ownerId = this.actorOwnerIds[recordId] ?? NO_OWNER;
    this.releaseActorSlot(recordId);
    const nextSlot = this.findNearestFreeSlot(activity, x, z, oldSlot);
    if (nextSlot === NO_BIG_TREE_SLOT) return false;
    this.reserveSlot(nextSlot, ownerKind, ownerId, now);
    this.actorSlots[recordId] = nextSlot;
    this.actorLastDistance[recordId] = this.distanceToSlot(nextSlot, x, z);
    this.actorLastProgressAt[recordId] = now;
    this.actorStuckRecoveries[recordId] = recoveries + 1;
    this.stuckRecoveryEvents++;
    this.recordTransition(recordId, BigTreeTransitionCause.StuckRecovery, now);
    return true;
  }

  private toLeaving(recordId: number, now: number, cause: BigTreeTransitionCause): void {
    this.releaseActorPartner(recordId);
    this.releaseActorSlot(recordId);
    this.actorStates[recordId] = BigTreeVisitState.Leaving;
    this.actorStateDeadlines[recordId] = now + this.leaveTimeoutSeconds;
    this.recordTransition(recordId, cause, now);
  }

  private toCooldown(recordId: number, now: number, cause: BigTreeTransitionCause): void {
    const previous = this.actorStates[recordId] as BigTreeVisitState;
    if (this.isOccupying(previous)) this.occupancy--;
    this.releaseActorPartner(recordId);
    this.releaseActorSlot(recordId);
    const ownerKind = this.actorOwnerKinds[recordId] ?? 0;
    const ownerId = this.actorOwnerIds[recordId] ?? 0;
    const duration = this.sampleRange(
      ownerKind,
      ownerId,
      this.actorVisitOrdinals[recordId] ?? 1,
      0x9e3779b9,
      this.minCooldownSeconds,
      this.maxCooldownSeconds,
    );
    this.actorStates[recordId] = BigTreeVisitState.Cooldown;
    this.scheduleRecord(recordId);
    this.actorCooldownUntil[recordId] = now + duration;
    this.actorStateDeadlines[recordId] = this.actorCooldownUntil[recordId] ?? NO_DEADLINE;
    this.recordTransition(recordId, cause, now);
  }

  private recordTransition(recordId: number, cause: BigTreeTransitionCause, now: number): void {
    this.actorLastTransitionCauses[recordId] = cause;
    this.actorLastTransitionAt[recordId] = now;
  }

  private acquireActorRecord(ownerKind: number, ownerId: number): number {
    if (this.freeRecordCount === 0) return NO_BIG_TREE_VISIT;
    const recordId = this.freeRecordIds[--this.freeRecordCount] ?? NO_BIG_TREE_VISIT;
    if (recordId === NO_BIG_TREE_VISIT) return NO_BIG_TREE_VISIT;
    this.actorUsed[recordId] = 1;
    this.actorOwnerKinds[recordId] = ownerKind;
    this.actorOwnerIds[recordId] = ownerId;
    this.actorStates[recordId] = BigTreeVisitState.Outside;
    this.actorVisitOrdinals[recordId] = 0;
    this.actorLastTransitionCauses[recordId] = BigTreeTransitionCause.None;
    this.actorLastTransitionAt[recordId] = NO_DEADLINE;
    let records = this.actorRecordsByKind.get(ownerKind);
    if (records === undefined) {
      records = new Map<number, number>();
      this.actorRecordsByKind.set(ownerKind, records);
    }
    records.set(ownerId, recordId);
    this.usedActors++;
    return recordId;
  }

  private clearActorRecord(recordId: number): void {
    this.unscheduleRecord(recordId);
    const wasUsed = this.actorUsed[recordId] !== 0;
    if (wasUsed) {
      const ownerKind = this.actorOwnerKinds[recordId] ?? NO_OWNER;
      const ownerId = this.actorOwnerIds[recordId] ?? NO_OWNER;
      const records = this.actorRecordsByKind.get(ownerKind);
      records?.delete(ownerId);
      if (records?.size === 0) this.actorRecordsByKind.delete(ownerKind);
    }
    this.actorUsed[recordId] = 0;
    this.actorOwnerKinds[recordId] = NO_OWNER;
    this.actorOwnerIds[recordId] = NO_OWNER;
    this.actorStates[recordId] = BigTreeVisitState.Outside;
    this.actorReasons[recordId] = 0;
    this.actorActivities[recordId] = BigTreeActivity.None;
    this.actorSlots[recordId] = NO_BIG_TREE_SLOT;
    this.actorStartedAt[recordId] = 0;
    this.actorEnteredAt[recordId] = NO_DEADLINE;
    this.actorStateDeadlines[recordId] = NO_DEADLINE;
    this.actorCooldownUntil[recordId] = NO_DEADLINE;
    this.actorLastProgressAt[recordId] = 0;
    this.actorLastDistance[recordId] = NO_DEADLINE;
    this.actorStuckRecoveries[recordId] = 0;
    this.actorVisitOrdinals[recordId] = 0;
    this.actorPartnerKinds[recordId] = NO_OWNER;
    this.actorPartnerIds[recordId] = NO_OWNER;
    this.actorPartnerDeadlines[recordId] = NO_DEADLINE;
    this.actorInsideZone[recordId] = 0;
    this.actorLastTransitionCauses[recordId] = BigTreeTransitionCause.None;
    this.actorLastTransitionAt[recordId] = NO_DEADLINE;
    if (wasUsed) this.freeRecordIds[this.freeRecordCount++] = recordId;
  }

  private findActor(ownerKind: number, ownerId: number): number {
    return this.actorRecordsByKind.get(ownerKind)?.get(ownerId) ?? NO_BIG_TREE_VISIT;
  }

  private scheduleRecord(recordId: number): void {
    if ((this.scheduledRecordPositions[recordId] ?? NO_BIG_TREE_VISIT) !== NO_BIG_TREE_VISIT)
      return;
    const position = this.scheduledRecordCount++;
    this.scheduledRecordIds[position] = recordId;
    this.scheduledRecordPositions[recordId] = position;
  }

  private unscheduleRecord(recordId: number): void {
    const position = this.scheduledRecordPositions[recordId] ?? NO_BIG_TREE_VISIT;
    if (position === NO_BIG_TREE_VISIT) return;
    const lastPosition = --this.scheduledRecordCount;
    const lastRecord = this.scheduledRecordIds[lastPosition] ?? NO_BIG_TREE_VISIT;
    if (position !== lastPosition) {
      this.scheduledRecordIds[position] = lastRecord;
      if (lastRecord !== NO_BIG_TREE_VISIT) this.scheduledRecordPositions[lastRecord] = position;
    }
    this.scheduledRecordIds[lastPosition] = NO_BIG_TREE_VISIT;
    this.scheduledRecordPositions[recordId] = NO_BIG_TREE_VISIT;
  }

  private findNearestFreeSlot(
    activity: BigTreeActivity,
    x: number,
    z: number,
    excludedSlot: number,
  ): number {
    let best = NO_BIG_TREE_SLOT;
    let bestDistanceSquared = NO_DEADLINE;
    for (let slotId = 0; slotId < this.definedSlots; slotId++) {
      if (
        slotId === excludedSlot ||
        this.slotOwnerKinds[slotId] !== NO_OWNER ||
        !this.slotSupports(slotId, activity)
      ) {
        continue;
      }
      const dx = x - (this.slotXs[slotId] ?? 0);
      const dz = z - (this.slotZs[slotId] ?? 0);
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < bestDistanceSquared) {
        best = slotId;
        bestDistanceSquared = distanceSquared;
      }
    }
    return best;
  }

  private reserveSlot(slotId: number, ownerKind: number, ownerId: number, now: number): void {
    this.slotOwnerKinds[slotId] = ownerKind;
    this.slotOwnerIds[slotId] = ownerId;
    this.slotLeaseDeadlines[slotId] = now + this.slotLeaseSeconds;
  }

  private releaseActorSlot(recordId: number): void {
    const slotId = this.actorSlots[recordId] ?? NO_BIG_TREE_SLOT;
    const ownerKind = this.actorOwnerKinds[recordId] ?? NO_OWNER;
    const ownerId = this.actorOwnerIds[recordId] ?? NO_OWNER;
    if (this.slotOwnedBy(slotId, ownerKind, ownerId)) this.releaseSlot(slotId);
    this.actorSlots[recordId] = NO_BIG_TREE_SLOT;
  }

  private partnerRecordOf(recordId: number): number {
    const partnerKind = this.actorPartnerKinds[recordId] ?? NO_OWNER;
    const partnerId = this.actorPartnerIds[recordId] ?? NO_OWNER;
    return partnerKind === NO_OWNER || partnerId === NO_OWNER
      ? NO_BIG_TREE_VISIT
      : this.findActor(partnerKind, partnerId);
  }

  private releaseActorPartner(recordId: number): void {
    const partnerRecord = this.partnerRecordOf(recordId);
    const hadPartner = this.actorPartnerKinds[recordId] !== NO_OWNER;
    const ownerKind = this.actorOwnerKinds[recordId] ?? NO_OWNER;
    const ownerId = this.actorOwnerIds[recordId] ?? NO_OWNER;
    this.actorPartnerKinds[recordId] = NO_OWNER;
    this.actorPartnerIds[recordId] = NO_OWNER;
    this.actorPartnerDeadlines[recordId] = NO_DEADLINE;
    if (
      partnerRecord !== NO_BIG_TREE_VISIT &&
      this.actorPartnerKinds[partnerRecord] === ownerKind &&
      this.actorPartnerIds[partnerRecord] === ownerId
    ) {
      this.actorPartnerKinds[partnerRecord] = NO_OWNER;
      this.actorPartnerIds[partnerRecord] = NO_OWNER;
      this.actorPartnerDeadlines[partnerRecord] = NO_DEADLINE;
    }
    if (hadPartner && this.pairedActors > 0) this.pairedActors--;
  }

  private releaseSlot(slotId: number): void {
    this.slotOwnerKinds[slotId] = NO_OWNER;
    this.slotOwnerIds[slotId] = NO_OWNER;
    this.slotLeaseDeadlines[slotId] = NO_DEADLINE;
  }

  private slotOwnedBy(slotId: number, ownerKind: number, ownerId: number): boolean {
    return (
      Number.isInteger(slotId) &&
      slotId >= 0 &&
      slotId < this.definedSlots &&
      this.slotOwnerKinds[slotId] === ownerKind &&
      this.slotOwnerIds[slotId] === ownerId
    );
  }

  private slotSupports(slotId: number, activity: BigTreeActivity): boolean {
    const kind = this.slotKinds[slotId];
    return kind === BigTreeSlotKind.Any || kind === activity;
  }

  private distanceToSlot(slotId: number, x: number, z: number): number {
    const dx = x - (this.slotXs[slotId] ?? 0);
    const dz = z - (this.slotZs[slotId] ?? 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  private activityForReason(reason: BigTreeVisitReason): BigTreeActivity {
    if (reason === BigTreeVisitReason.Food) return BigTreeActivity.Eat;
    if (reason === BigTreeVisitReason.Rest) return BigTreeActivity.Rest;
    if (reason === BigTreeVisitReason.Social) return BigTreeActivity.Socialize;
    return BigTreeActivity.Observe;
  }

  private validReason(reason: number): reason is BigTreeVisitReason {
    return (
      reason === BigTreeVisitReason.Food ||
      reason === BigTreeVisitReason.Rest ||
      reason === BigTreeVisitReason.Social ||
      reason === BigTreeVisitReason.Safety ||
      reason === BigTreeVisitReason.Curiosity
    );
  }

  private validSlotKind(kind: number): kind is BigTreeSlotKind {
    return (
      kind === BigTreeSlotKind.Any ||
      kind === BigTreeSlotKind.Eat ||
      kind === BigTreeSlotKind.Rest ||
      kind === BigTreeSlotKind.Socialize ||
      kind === BigTreeSlotKind.Observe
    );
  }

  private validOwner(ownerKind: number, ownerId: number): boolean {
    return (
      Number.isInteger(ownerKind) &&
      ownerKind >= 0 &&
      ownerKind <= 0x7fffffff &&
      Number.isInteger(ownerId) &&
      ownerId >= 0 &&
      ownerId <= 0x7fffffff
    );
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

  private isOccupying(state: BigTreeVisitState): boolean {
    return (
      state === BigTreeVisitState.Travelling ||
      state === BigTreeVisitState.Active ||
      state === BigTreeVisitState.Leaving
    );
  }

  private sampleRange(
    ownerKind: number,
    ownerId: number,
    ordinal: number,
    salt: number,
    minimum: number,
    maximum: number,
  ): number {
    if (maximum <= minimum) return minimum;
    let hash = (salt ^ this.hashSeedValue ^ Math.imul(ownerKind + 1, 0x85ebca6b)) >>> 0;
    hash = Math.imul(hash ^ ownerId, 0xc2b2ae35) >>> 0;
    hash = Math.imul(hash ^ ordinal, 0x27d4eb2d) >>> 0;
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x2c1b3c6d) >>> 0;
    hash ^= hash >>> 12;
    const unit = (hash >>> 0) / 0x100000000;
    return minimum + (maximum - minimum) * unit;
  }

  private finiteDeadline(value: number | undefined): number | null {
    return value !== undefined && Number.isFinite(value) ? value : null;
  }

  private restoreDeadline(value: number | null): number {
    return value === null ? NO_DEADLINE : value;
  }

  private validateCounter(value: number, label: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`Big Tree snapshot ${label} must be a non-negative integer`);
    }
  }

  private validateOptionalFinite(value: number | null, label: string): void {
    if (value !== null && !Number.isFinite(value)) {
      throw new RangeError(`Big Tree snapshot ${label} must be finite or null`);
    }
  }

  private validateVisitorState(visitor: BigTreeVisitorState): void {
    if (!this.validOwner(visitor.ownerKind, visitor.ownerId)) {
      throw new RangeError('Big Tree snapshot contains an invalid actor identity');
    }
    if (
      visitor.state !== BigTreeVisitState.Outside &&
      visitor.state !== BigTreeVisitState.Travelling &&
      visitor.state !== BigTreeVisitState.Active &&
      visitor.state !== BigTreeVisitState.Leaving &&
      visitor.state !== BigTreeVisitState.Cooldown
    ) {
      throw new RangeError('Big Tree snapshot contains an invalid lifecycle state');
    }
    if (
      visitor.activity !== BigTreeActivity.None &&
      visitor.activity !== BigTreeActivity.Eat &&
      visitor.activity !== BigTreeActivity.Rest &&
      visitor.activity !== BigTreeActivity.Socialize &&
      visitor.activity !== BigTreeActivity.Observe
    ) {
      throw new RangeError('Big Tree snapshot contains an invalid activity');
    }
    if (visitor.reason !== 0 && !this.validReason(visitor.reason)) {
      throw new RangeError('Big Tree snapshot contains an invalid visit reason');
    }
    if (typeof visitor.insideZone !== 'boolean') {
      throw new RangeError('Big Tree snapshot contains invalid boundary membership');
    }
    const transitionCause = visitor.lastTransitionCause ?? BigTreeTransitionCause.None;
    const transitionAt = visitor.lastTransitionAt ?? null;
    if (
      !Number.isInteger(transitionCause) ||
      transitionCause < BigTreeTransitionCause.None ||
      transitionCause > BigTreeTransitionCause.StuckTimeout
    ) {
      throw new RangeError('Big Tree snapshot contains an invalid transition cause');
    }
    if (
      (transitionCause === BigTreeTransitionCause.None && transitionAt !== null) ||
      (transitionCause !== BigTreeTransitionCause.None && transitionAt === null)
    ) {
      throw new RangeError('Big Tree snapshot transition cause and timestamp must agree');
    }
    const needsSlot =
      visitor.state === BigTreeVisitState.Travelling || visitor.state === BigTreeVisitState.Active;
    if (
      (needsSlot &&
        (!Number.isInteger(visitor.slotId) ||
          visitor.slotId < 0 ||
          visitor.slotId >= this.definedSlots ||
          !this.slotSupports(visitor.slotId, visitor.activity))) ||
      (!needsSlot && visitor.slotId !== NO_BIG_TREE_SLOT)
    ) {
      throw new RangeError('Big Tree snapshot contains an invalid activity slot');
    }
    if (
      !Number.isFinite(visitor.startedAt) ||
      !Number.isFinite(visitor.lastProgressAt) ||
      !Number.isInteger(visitor.stuckRecoveries) ||
      visitor.stuckRecoveries < 0 ||
      visitor.stuckRecoveries > this.maxStuckRecoveries ||
      !Number.isInteger(visitor.visitOrdinal) ||
      visitor.visitOrdinal < 0 ||
      visitor.visitOrdinal > 0xffffffff
    ) {
      throw new RangeError('Big Tree snapshot contains invalid progress state');
    }
    this.validateOptionalFinite(visitor.enteredAt, 'enteredAt');
    this.validateOptionalFinite(visitor.stateDeadline, 'stateDeadline');
    this.validateOptionalFinite(visitor.cooldownUntil, 'cooldownUntil');
    this.validateOptionalFinite(visitor.lastDistance, 'lastDistance');
    this.validateOptionalFinite(visitor.slotLeaseExpiresAt, 'slotLeaseExpiresAt');
    this.validateOptionalFinite(visitor.partnerLeaseExpiresAt, 'partnerLeaseExpiresAt');
    this.validateOptionalFinite(transitionAt, 'lastTransitionAt');
    if (visitor.lastDistance !== null && visitor.lastDistance < 0) {
      throw new RangeError('Big Tree snapshot lastDistance must be non-negative');
    }
    if (needsSlot && visitor.slotLeaseExpiresAt === null) {
      throw new RangeError('Big Tree active slot must have a finite lease');
    }
    if (
      (visitor.state === BigTreeVisitState.Travelling ||
        visitor.state === BigTreeVisitState.Active ||
        visitor.state === BigTreeVisitState.Leaving) &&
      visitor.stateDeadline === null
    ) {
      throw new RangeError('Big Tree active lifecycle state must have a finite deadline');
    }
    if (
      visitor.state === BigTreeVisitState.Active &&
      (visitor.enteredAt === null || visitor.enteredAt > visitor.stateDeadline!)
    ) {
      throw new RangeError('Big Tree active visit must have a valid entry time');
    }
    if (
      visitor.state === BigTreeVisitState.Cooldown &&
      (visitor.cooldownUntil === null ||
        visitor.stateDeadline === null ||
        visitor.cooldownUntil !== visitor.stateDeadline)
    ) {
      throw new RangeError('Big Tree cooldown must have one finite matching deadline');
    }
    const hasPartner = visitor.partnerKind !== NO_OWNER || visitor.partnerId !== NO_OWNER;
    if (
      hasPartner &&
      (!this.validOwner(visitor.partnerKind, visitor.partnerId) ||
        (visitor.partnerKind === visitor.ownerKind && visitor.partnerId === visitor.ownerId) ||
        visitor.partnerLeaseExpiresAt === null ||
        visitor.state !== BigTreeVisitState.Active ||
        (visitor.activity !== BigTreeActivity.Socialize &&
          visitor.activity !== BigTreeActivity.Observe))
    ) {
      throw new RangeError('Big Tree snapshot contains an invalid partner reservation');
    }
    if (!hasPartner && visitor.partnerLeaseExpiresAt !== null) {
      throw new RangeError('Big Tree unpaired visitor cannot retain a partner lease');
    }
  }

  private positive(value: number | undefined, fallback: number): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved) || resolved <= 0)
      throw new RangeError('Expected a positive duration');
    return resolved;
  }

  private nonNegative(value: number | undefined, fallback: number): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved) || resolved < 0) {
      throw new RangeError('Expected a non-negative duration');
    }
    return resolved;
  }

  private atLeast(
    value: number | undefined,
    fallback: number,
    minimum: number,
    label: string,
  ): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved) || resolved < minimum) {
      throw new RangeError(`${label} must be finite and at least its minimum`);
    }
    return resolved;
  }
}
