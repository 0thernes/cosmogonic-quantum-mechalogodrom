/**
 * Species adapters for the Big Tree ecology.
 *
 * Rendering, food lifecycle, and species simulation remain owned by their canonical systems. This
 * adapter only schedules bounded visits, applies steering impulses, and translates an atomic edible
 * transaction into each species' native energy scale. Candidate discovery is budgeted and staggered;
 * active work is bounded by the authored zone capacity.
 */

import type { EdibleReservation, EdibleResource, EdibleResourceKind } from './edible-resource';
import { XenomimicVisitMode, type XenomimicVisitMode as XenoVisitMode } from './xenomimics';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeTransitionCause,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  NO_BIG_TREE_SLOT,
  NO_BIG_TREE_VISIT,
  type BigTreeSlotView,
  type BigTreeVisitContext,
  type BigTreeVisitDecision,
  type BigTreeVisitView,
  type BigTreeZoneStats,
} from './big-tree-zone';

export const BIG_TREE_OWNER_ORDINARY = 1;
export const BIG_TREE_OWNER_XENOMIMIC = 2;

const NO_OWNER = -1;
const NO_RESOURCE = -1;

/** Structural subset implemented by `Entity`; lightweight tests need no Three.js dependency. */
export interface BigTreeOrdinaryBody {
  readonly id: number;
  readonly position: { x: number; y?: number; z: number };
  readonly rotation?: { y: number };
  readonly userData: {
    /** Simulation-owned identity; unlike Object3D.id it is unaffected by unrelated render objects. */
    ecologyId?: number;
    energy: number;
    belly: number;
    age: number;
    life: number;
    alive?: boolean;
    /** Launched NHIs have a dedicated adapter keyed by mind id. */
    isNhi?: boolean;
    /** True while this body holds an active tree visit; exempts it from centre-gravity herding. */
    treeVisit?: boolean;
    /** Neural activation lane (present on every real organism; optional for lightweight mocks). */
    act?: number;
    /** Game-theory payoff ledger (present on every real organism; optional for lightweight mocks). */
    payoff?: number;
    /** Heritable Prisoner's-Dilemma policy consumed by ordinary behavior outside the sanctuary. */
    strategy?: 0 | 1;
    /** Spawned NHI minions remain ordinary feeding organisms and use this adapter. */
    nhiMinion?: boolean;
    vel: { x: number; y?: number; z: number };
  };
}

/** Structural subset implemented by `Xenomimic`. */
export interface BigTreeXenomimicBody {
  readonly pairId: number;
  readonly role: 0 | 1;
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  energy: number;
  age: number;
  alive: boolean;
  shimmer: number;
}

export interface BigTreeFoodRegistryView {
  get(resourceId: number): EdibleResource | undefined;
}

/** Public CrystalEcosystem transaction surface; tests can supply a DOM-free fake. */
export interface BigTreeFoodSource {
  readonly edibleResources: BigTreeFoodRegistryView;
  reserveFood(
    ownerId: number,
    leaseSeconds?: number,
    kind?: EdibleResourceKind,
  ): EdibleReservation | null;
  renewFood(reservation: EdibleReservation, leaseSeconds?: number): boolean;
  beginFoodConsumption(reservation: EdibleReservation): boolean;
  completeFoodConsumption(reservation: EdibleReservation): number;
  cancelFood(reservation: EdibleReservation): boolean;
  releaseFoodOwner(ownerId: number): number;
}

export interface BigTreeVisitorEnvironment {
  danger?: number;
  stress?: number;
  socialNeed?: number;
  curiosity?: number;
  simulationLoad?: number;
  foodAvailable?: boolean;
}

export interface BigTreeVisitorConfig {
  pollBudget?: number;
  pollIntervalSeconds?: number;
  foodLeaseSeconds?: number;
  foodRetrySeconds?: number;
  foodSearchTimeoutSeconds?: number;
  foodReachRadius?: number;
  ordinarySpeed?: number;
  xenomimicSpeed?: number;
  steeringGain?: number;
  ordinaryRestPerSecond?: number;
  xenomimicRestPerSecond?: number;
  ordinaryRestTarget?: number;
  xenomimicRestTarget?: number;
  socialLeaseSeconds?: number;
  socialReachRadius?: number;
  eatingFeedbackSeconds?: number;
  /** World seed folded into personality/social/curiosity hashes so dispositions vary by cosmos. */
  hashSeed?: number;
}

export type BigTreeVisitorBody = BigTreeOrdinaryBody | BigTreeXenomimicBody;

/**
 * Optional bridge into the world's canonical animation, communication, knowledge, and social
 * systems. Arguments are positional and bodies are existing references so the hot path creates no
 * event object. `partnerKind` and `partnerId` are both `-1` when no live reciprocal partner exists.
 */
export interface BigTreeVisitorActivityCallbacks {
  performActivity(
    ownerKind: number,
    ownerId: number,
    partnerKind: number,
    partnerId: number,
    body: BigTreeVisitorBody,
    activity: BigTreeActivity,
    dt: number,
    now: number,
  ): void;
}

/**
 * Canonical Socialize/Observe state transfer used by the production callback and its focused tests.
 * Socialization requires a live reciprocal partner; observation remains a solitary peaceful act.
 */
export function performBigTreeActivity(
  ownerKind: number,
  partnerId: number,
  body: BigTreeVisitorBody,
  activity: BigTreeActivity,
  dt: number,
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
    const data = (body as BigTreeOrdinaryBody).userData;
    if (activity === BigTreeActivity.Socialize && partnerId >= 0) {
      data.act = Math.min(4, Math.max(-4, (data.act ?? 0) + dt * 0.7));
      data.payoff = Math.max(data.payoff ?? 0, 0.08);
    } else if (activity === BigTreeActivity.Observe) {
      data.act = Math.min(4, Math.max(-4, (data.act ?? 0) + dt * 0.18));
    }
  } else if (ownerKind === BIG_TREE_OWNER_XENOMIMIC) {
    const xenomimic = body as BigTreeXenomimicBody;
    if (activity === BigTreeActivity.Socialize && partnerId >= 0) {
      xenomimic.shimmer = Math.max(xenomimic.shimmer, 0.75);
    } else if (activity === BigTreeActivity.Observe) {
      xenomimic.shimmer = Math.max(xenomimic.shimmer, 0.25);
    }
  }
}

export interface BigTreeSpeciesVisitorView {
  ownerKind: number;
  ownerId: number;
  foodOwnerId: number;
  state: BigTreeVisitState;
  reason: BigTreeVisitReason;
  activity: BigTreeActivity;
  slotId: number;
  foodId: number;
  foodKind: EdibleResourceKind | null;
  foodState: string | null;
  targetX: number;
  targetY: number;
  targetZ: number;
  energy: number;
  eating: boolean;
  partnerKind: number;
  partnerId: number;
  /** Most recent canonical lifecycle edge, surfaced for development telemetry. */
  lastTransitionCause: BigTreeTransitionCause;
  /** Scaled simulation timestamp for `lastTransitionCause`. */
  lastTransitionAt: number;
}

export interface BigTreeSpeciesVisitorStats {
  activeVisitors: number;
  activeOrdinary: number;
  activeXenomimics: number;
  lastPollCount: number;
  totalPolls: number;
  acceptedVisits: number;
  completedMeals: number;
  consumedFruit: number;
  consumedLeaves: number;
  targetLosses: number;
  cancellations: number;
  zoneCapacity: number;
  socialPairs: number;
  /** One-shot ordinary-organism cooperative-policy changes caused by a newly formed social pair. */
  policyTransfers: number;
  completedVisits: number;
  timedOutVisits: number;
  stuckRecoveries: number;
  forcedExits: number;
  partnerTimeouts: number;
  rejectedForCapacity: number;
  rejectedForNoSlot: number;
  availableSlots: number;
}

type VisitorBody = BigTreeVisitorBody;

/** Stable identity independent of an entity array's current index. */
export function ordinaryBigTreeOwnerId(body: BigTreeOrdinaryBody): number {
  const ecologyId = body.userData.ecologyId;
  if (Number.isSafeInteger(ecologyId) && (ecologyId ?? -1) >= 0) return ecologyId!;
  if (!Number.isSafeInteger(body.id) || body.id < 0) return NO_OWNER;
  return body.id;
}

/** Stable pair/role identity independent of a Xenomimic population array's current index. */
export function xenomimicBigTreeOwnerId(body: BigTreeXenomimicBody): number {
  if (!Number.isSafeInteger(body.pairId) || body.pairId < 0) return NO_OWNER;
  const id = body.pairId * 2 + body.role;
  return Number.isSafeInteger(id) ? id : NO_OWNER;
}

/** Food reservations share one numeric namespace, so species kind is encoded into the key. */
export function bigTreeFoodOwnerId(ownerKind: number, ownerId: number): number {
  if (
    (ownerKind !== BIG_TREE_OWNER_ORDINARY && ownerKind !== BIG_TREE_OWNER_XENOMIMIC) ||
    !Number.isSafeInteger(ownerId) ||
    ownerId < 0
  ) {
    return NO_OWNER;
  }
  const id = ownerId * 4 + ownerKind;
  return Number.isSafeInteger(id) ? id : NO_OWNER;
}

export class BigTreeSpeciesVisitors {
  readonly visits: BigTreeVisitManager;
  readonly tree: BigTreeFoodSource;

  private readonly pollBudget: number;
  private readonly pollIntervalSeconds: number;
  private readonly foodLeaseSeconds: number;
  private readonly foodRetrySeconds: number;
  private readonly foodSearchTimeoutSeconds: number;
  private readonly foodReachRadiusSquared: number;
  private readonly ordinarySpeed: number;
  private readonly xenomimicSpeed: number;
  private readonly hashSeedValue: number;
  private readonly steeringGain: number;
  private readonly ordinaryRestPerSecond: number;
  private readonly xenomimicRestPerSecond: number;
  private readonly ordinaryRestTarget: number;
  private readonly xenomimicRestTarget: number;
  private readonly socialLeaseSeconds: number;
  private readonly socialReachRadiusSquared: number;
  private readonly eatingFeedbackSeconds: number;
  private readonly activityCallbacks: BigTreeVisitorActivityCallbacks | null;

  private readonly activeKinds: Uint8Array;
  private readonly activeOwnerIds: Float64Array;
  private readonly activeFoodOwnerIds: Float64Array;
  private readonly activeBodies: (VisitorBody | null)[];
  private readonly foodReservations: (EdibleReservation | null)[];
  private readonly foodRetryAt: Float64Array;
  private readonly foodMissingSince: Float64Array;
  private readonly eatingUntil: Float64Array;
  private readonly targetXs: Float64Array;
  private readonly targetYs: Float64Array;
  private readonly targetZs: Float64Array;
  /** Stable root-object identity to dense active-array index; maintained on swap removal. */
  private readonly ordinaryActiveIndices = new Map<number, number>();
  /** Stable pair/role identity to dense active-array index; maintained on swap removal. */
  private readonly xenomimicActiveIndices = new Map<number, number>();

  private activeCount = 0;
  private ordinaryCursor = 0;
  private xenomimicCursor = 0;
  private pollOrdinaryNext = true;
  private nextPollAt = 0;
  private pollOrdinal = 0;

  private readonly context: BigTreeVisitContext = {
    hunger: 0,
    fatigue: 0,
    healthDeficit: 0,
    stress: 0,
    socialNeed: 0,
    curiosity: 0,
    danger: 0,
    distance: 0,
    routeAvailable: true,
    foodAvailable: true,
    recentVisit: 0,
    personality: 0,
    simulationLoad: 0,
  };
  private readonly decision: BigTreeVisitDecision = {
    shouldVisit: false,
    reason: BigTreeVisitReason.Curiosity,
    activity: BigTreeActivity.None,
    utility: 0,
    threshold: 0,
  };
  private readonly visitView: BigTreeVisitView = {
    recordId: -1,
    ownerKind: NO_OWNER,
    ownerId: NO_OWNER,
    state: BigTreeVisitState.Outside,
    reason: BigTreeVisitReason.Curiosity,
    activity: BigTreeActivity.None,
    slotId: NO_BIG_TREE_SLOT,
    startedAt: 0,
    enteredAt: 0,
    stateDeadline: 0,
    cooldownUntil: 0,
    stuckRecoveries: 0,
    visitOrdinal: 0,
    partnerKind: NO_OWNER,
    partnerId: NO_OWNER,
    partnerLeaseExpiresAt: 0,
    insideZone: false,
    lastTransitionCause: BigTreeTransitionCause.None,
    lastTransitionAt: 0,
  };
  private readonly slotView: BigTreeSlotView = {
    slotId: NO_BIG_TREE_SLOT,
    kind: BigTreeSlotKind.Any,
    x: 0,
    z: 0,
    ownerKind: NO_OWNER,
    ownerId: NO_OWNER,
    leaseExpiresAt: 0,
  };
  private readonly zoneStats: BigTreeZoneStats = {
    trackedActors: 0,
    activeVisitors: 0,
    capacity: 0,
    availableSlots: 0,
    completedVisits: 0,
    timedOutVisits: 0,
    stuckRecoveryEvents: 0,
    forcedExitEvents: 0,
    partnerReservations: 0,
    partnerTimeouts: 0,
    rejectedForCapacity: 0,
    rejectedForNoSlot: 0,
  };

  lastPollCount = 0;
  totalPolls = 0;
  acceptedVisits = 0;
  completedMeals = 0;
  consumedFruit = 0;
  consumedLeaves = 0;
  targetLosses = 0;
  cancellations = 0;
  policyTransfers = 0;

  constructor(
    tree: BigTreeFoodSource,
    visits: BigTreeVisitManager,
    config: BigTreeVisitorConfig = {},
    activityCallbacks: BigTreeVisitorActivityCallbacks | null = null,
  ) {
    this.tree = tree;
    this.visits = visits;
    this.activityCallbacks = activityCallbacks;
    this.pollBudget = this.integerAtLeast(config.pollBudget, 8, 1, 'pollBudget');
    this.pollIntervalSeconds = this.positive(
      config.pollIntervalSeconds,
      0.2,
      'pollIntervalSeconds',
    );
    this.foodLeaseSeconds = this.positive(config.foodLeaseSeconds, 8, 'foodLeaseSeconds');
    this.foodRetrySeconds = this.positive(config.foodRetrySeconds, 0.35, 'foodRetrySeconds');
    this.foodSearchTimeoutSeconds = this.positive(
      config.foodSearchTimeoutSeconds,
      3,
      'foodSearchTimeoutSeconds',
    );
    const foodReachRadius = this.positive(config.foodReachRadius, 3, 'foodReachRadius');
    this.foodReachRadiusSquared = foodReachRadius * foodReachRadius;
    this.ordinarySpeed = this.positive(config.ordinarySpeed, 24, 'ordinarySpeed');
    this.xenomimicSpeed = this.positive(config.xenomimicSpeed, 18, 'xenomimicSpeed');
    this.hashSeedValue = Number.isFinite(config.hashSeed) ? config.hashSeed! >>> 0 : 0;
    this.steeringGain = this.positive(config.steeringGain, 4, 'steeringGain');
    this.ordinaryRestPerSecond = this.positive(
      config.ordinaryRestPerSecond,
      4,
      'ordinaryRestPerSecond',
    );
    this.xenomimicRestPerSecond = this.positive(
      config.xenomimicRestPerSecond,
      0.04,
      'xenomimicRestPerSecond',
    );
    this.ordinaryRestTarget = this.range(
      config.ordinaryRestTarget,
      90,
      0,
      100,
      'ordinaryRestTarget',
    );
    this.xenomimicRestTarget = this.range(
      config.xenomimicRestTarget,
      0.9,
      0,
      1,
      'xenomimicRestTarget',
    );
    this.socialLeaseSeconds = this.positive(config.socialLeaseSeconds, 2, 'socialLeaseSeconds');
    const socialReachRadius = this.positive(config.socialReachRadius, 72, 'socialReachRadius');
    this.socialReachRadiusSquared = socialReachRadius * socialReachRadius;
    this.eatingFeedbackSeconds = this.positive(
      config.eatingFeedbackSeconds,
      0.8,
      'eatingFeedbackSeconds',
    );

    const capacity = visits.capacity;
    this.activeKinds = new Uint8Array(capacity);
    this.activeOwnerIds = new Float64Array(capacity);
    this.activeFoodOwnerIds = new Float64Array(capacity);
    this.activeBodies = Array.from<VisitorBody | null>({ length: capacity }).fill(null);
    this.foodReservations = Array.from<EdibleReservation | null>({ length: capacity }).fill(null);
    this.foodRetryAt = new Float64Array(capacity);
    this.foodMissingSince = new Float64Array(capacity);
    this.eatingUntil = new Float64Array(capacity);
    this.targetXs = new Float64Array(capacity);
    this.targetYs = new Float64Array(capacity);
    this.targetZs = new Float64Array(capacity);
    this.activeOwnerIds.fill(NO_OWNER);
    this.activeFoodOwnerIds.fill(NO_OWNER);
    this.foodMissingSince.fill(Number.POSITIVE_INFINITY);
  }

  get activeVisitors(): number {
    return this.activeCount;
  }

  /** O(1), allocation-free membership query keyed by the ordinary Entity's ecology owner id. */
  isEntityVisitorActive(ownerId: number): boolean {
    return Number.isSafeInteger(ownerId) && ownerId >= 0 && this.ordinaryActiveIndices.has(ownerId);
  }

  /** O(1), allocation-free membership query keyed by the Xenomimic's stable pair and role. */
  isXenomimicVisitorActive(pairId: number, role: 0 | 1): boolean {
    if (!Number.isSafeInteger(pairId) || pairId < 0 || (role !== 0 && role !== 1)) return false;
    const ownerId = pairId * 2 + role;
    return Number.isSafeInteger(ownerId) && this.xenomimicActiveIndices.has(ownerId);
  }

  /**
   * Canonical locomotion intent consumed by `XenomimicPopulation`. Travel keeps adapter-authored
   * headings authoritative; peaceful active activities suppress autonomous roaming. The lookup is
   * map-backed and allocation-free, so the Xenomimic integrator can query it for every live body.
   */
  xenomimicLocomotionMode(pairId: number, role: 0 | 1): XenoVisitMode {
    const ownerId = pairId * 2 + role;
    if (
      !Number.isSafeInteger(pairId) ||
      pairId < 0 ||
      (role !== 0 && role !== 1) ||
      !Number.isSafeInteger(ownerId) ||
      this.findActive(BIG_TREE_OWNER_XENOMIMIC, ownerId) < 0 ||
      !this.visits.readVisit(BIG_TREE_OWNER_XENOMIMIC, ownerId, this.visitView)
    ) {
      return XenomimicVisitMode.Normal;
    }
    if (
      this.visitView.state === BigTreeVisitState.Travelling ||
      this.visitView.state === BigTreeVisitState.Leaving ||
      this.visitView.state === BigTreeVisitState.Cooldown ||
      (this.visitView.state === BigTreeVisitState.Active &&
        this.visitView.activity === BigTreeActivity.Eat)
    ) {
      return XenomimicVisitMode.Travel;
    }
    return this.visitView.state === BigTreeVisitState.Active
      ? XenomimicVisitMode.Calm
      : XenomimicVisitMode.Normal;
  }

  /**
   * Advance from the world's scaled simulation clock. Call after `CrystalEcosystem.update`, so its
   * transaction wrappers observe the same current food time. Passing the same `now` pauses every
   * visit, reservation, retry, dwell, and cooldown deadline.
   */
  update(
    now: number,
    dt: number,
    ordinary: readonly BigTreeOrdinaryBody[],
    xenomimics: readonly BigTreeXenomimicBody[],
    environment?: Readonly<BigTreeVisitorEnvironment>,
  ): void {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(dt) || dt < 0) return;
    this.visits.step(now);
    let index = 0;
    while (index < this.activeCount) {
      if (this.updateActive(index, now, dt)) continue;
      index++;
    }
    this.matchSocialPartners(now);
    this.pollCandidates(now, ordinary, xenomimics, environment);
  }

  /** Explicit lifecycle hook for entity removal; stable identity prevents shifted-index aliasing. */
  cancelOrdinary(bodyOrId: BigTreeOrdinaryBody | number): boolean {
    const ownerId = typeof bodyOrId === 'number' ? bodyOrId : ordinaryBigTreeOwnerId(bodyOrId);
    return this.cancelOwner(BIG_TREE_OWNER_ORDINARY, ownerId);
  }

  /** Explicit lifecycle hook for Xenomimic death/despawn. */
  cancelXenomimic(bodyOrOwnerId: BigTreeXenomimicBody | number): boolean {
    const ownerId =
      typeof bodyOrOwnerId === 'number' ? bodyOrOwnerId : xenomimicBigTreeOwnerId(bodyOrOwnerId);
    return this.cancelOwner(BIG_TREE_OWNER_XENOMIMIC, ownerId);
  }

  /** Cancel only the ordinary Entity namespace for an EntityManager-only Genesis reset. */
  resetOrdinary(): void {
    this.resetOwnerKind(BIG_TREE_OWNER_ORDINARY);
    this.ordinaryCursor = 0;
    this.pollOrdinaryNext = true;
  }

  /**
   * Cancel both namespaces owned by this adapter. The shared manager itself belongs to World and is
   * deliberately not reset here; fixed-fauna records must survive adapter-local cleanup.
   */
  reset(): void {
    this.resetOwnerKind(BIG_TREE_OWNER_ORDINARY);
    this.resetOwnerKind(BIG_TREE_OWNER_XENOMIMIC);
    this.ordinaryCursor = 0;
    this.xenomimicCursor = 0;
    this.pollOrdinaryNext = true;
    this.nextPollAt = 0;
    this.pollOrdinal = 0;
    this.lastPollCount = 0;
    this.totalPolls = 0;
    this.acceptedVisits = 0;
    this.completedMeals = 0;
    this.consumedFruit = 0;
    this.consumedLeaves = 0;
    this.targetLosses = 0;
    this.cancellations = 0;
    this.policyTransfers = 0;
  }

  /** Caller-owned development view; returns false for untracked/cooldown-only actors. */
  readVisitor(
    ownerKind: number,
    ownerId: number,
    now: number,
    out: BigTreeSpeciesVisitorView,
  ): boolean {
    const index = this.findActive(ownerKind, ownerId);
    if (index < 0 || !this.visits.readVisit(ownerKind, ownerId, this.visitView)) return false;
    const body = this.activeBodies[index] ?? null;
    if (body === null) return false;
    const reservation = this.foodReservations[index];
    const resource = reservation ? this.tree.edibleResources.get(reservation.id) : undefined;
    out.ownerKind = ownerKind;
    out.ownerId = ownerId;
    out.foodOwnerId = this.activeFoodOwnerIds[index] ?? NO_OWNER;
    out.state = this.visitView.state;
    out.reason = this.visitView.reason;
    out.activity = this.visitView.activity;
    out.slotId = this.visitView.slotId;
    out.foodId = reservation?.id ?? NO_RESOURCE;
    out.foodKind = resource?.kind ?? null;
    out.foodState = resource?.state ?? null;
    out.targetX = this.targetXs[index] ?? 0;
    out.targetY = this.targetYs[index] ?? 0;
    out.targetZ = this.targetZs[index] ?? 0;
    out.energy = this.energyOf(ownerKind, body);
    out.eating = now < (this.eatingUntil[index] ?? 0);
    out.partnerKind = this.visitView.partnerKind;
    out.partnerId = this.visitView.partnerId;
    out.lastTransitionCause = this.visitView.lastTransitionCause;
    out.lastTransitionAt = this.visitView.lastTransitionAt;
    return true;
  }

  readStats(out: BigTreeSpeciesVisitorStats): void {
    let ordinary = 0;
    for (let index = 0; index < this.activeCount; index++) {
      if (this.activeKinds[index] === BIG_TREE_OWNER_ORDINARY) ordinary++;
    }
    this.visits.readStats(this.zoneStats);
    out.activeVisitors = this.activeCount;
    out.activeOrdinary = ordinary;
    out.activeXenomimics = this.activeCount - ordinary;
    out.lastPollCount = this.lastPollCount;
    out.totalPolls = this.totalPolls;
    out.acceptedVisits = this.acceptedVisits;
    out.completedMeals = this.completedMeals;
    out.consumedFruit = this.consumedFruit;
    out.consumedLeaves = this.consumedLeaves;
    out.targetLosses = this.targetLosses;
    out.cancellations = this.cancellations;
    out.zoneCapacity = this.visits.capacity;
    out.socialPairs = this.zoneStats.partnerReservations;
    out.policyTransfers = this.policyTransfers;
    out.completedVisits = this.zoneStats.completedVisits;
    out.timedOutVisits = this.zoneStats.timedOutVisits;
    out.stuckRecoveries = this.zoneStats.stuckRecoveryEvents;
    out.forcedExits = this.zoneStats.forcedExitEvents;
    out.partnerTimeouts = this.zoneStats.partnerTimeouts;
    out.rejectedForCapacity = this.zoneStats.rejectedForCapacity;
    out.rejectedForNoSlot = this.zoneStats.rejectedForNoSlot;
    out.availableSlots = this.zoneStats.availableSlots;
  }

  private pollCandidates(
    now: number,
    ordinary: readonly BigTreeOrdinaryBody[],
    xenomimics: readonly BigTreeXenomimicBody[],
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    this.lastPollCount = 0;
    if (now < this.nextPollAt) return;
    this.nextPollAt = now + this.pollIntervalSeconds;
    let ordinaryRemaining = Math.min(ordinary.length, this.pollBudget);
    let xenomimicRemaining = Math.min(xenomimics.length, this.pollBudget);
    while (
      this.lastPollCount < this.pollBudget &&
      (ordinaryRemaining > 0 || xenomimicRemaining > 0)
    ) {
      const useOrdinary =
        ordinaryRemaining > 0 && (xenomimicRemaining === 0 || this.pollOrdinaryNext);
      if (useOrdinary) {
        const index = this.ordinaryCursor % ordinary.length;
        this.ordinaryCursor = (index + 1) % ordinary.length;
        ordinaryRemaining--;
        this.considerOrdinary(ordinary[index]!, now, environment);
      } else {
        const index = this.xenomimicCursor % xenomimics.length;
        this.xenomimicCursor = (index + 1) % xenomimics.length;
        xenomimicRemaining--;
        this.considerXenomimic(xenomimics[index]!, now, environment);
      }
      this.pollOrdinaryNext = !useOrdinary;
      this.lastPollCount++;
      this.totalPolls++;
      this.pollOrdinal = (this.pollOrdinal + 1) >>> 0;
    }
  }

  private considerOrdinary(
    body: BigTreeOrdinaryBody,
    now: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    const ownerId = ordinaryBigTreeOwnerId(body);
    let visitState = this.visits.stateOf(BIG_TREE_OWNER_ORDINARY, ownerId);
    if (visitState === BigTreeVisitState.Cooldown) {
      visitState = this.visits.updatePosition(
        BIG_TREE_OWNER_ORDINARY,
        ownerId,
        body.position.x,
        body.position.z,
        now,
      );
    }
    if (
      ownerId < 0 ||
      body.userData.alive === false ||
      body.userData.isNhi === true ||
      this.findActive(BIG_TREE_OWNER_ORDINARY, ownerId) >= 0 ||
      visitState !== BigTreeVisitState.Outside
    ) {
      return;
    }
    this.fillContext(
      BIG_TREE_OWNER_ORDINARY,
      ownerId,
      body.position.x,
      body.position.z,
      1 - this.clamp01(body.userData.energy / 100),
      body.userData.life > 0 ? this.clamp01(body.userData.age / body.userData.life) : 0,
      environment,
    );
    // A being that arrived under its ordinary ecosystem controller is already a real sanctuary
    // entrant even when its optional-visit utility is low. Adopt that incidental arrival into the
    // canonical bounded lifecycle as a Safety/Observe visit instead of leaving it calm but
    // untracked forever. Capacity and authored-slot admission remain owned by the visit manager.
    let visitId = this.visits.requestContextualVisit(
      BIG_TREE_OWNER_ORDINARY,
      ownerId,
      this.pollOrdinal,
      this.context,
      this.decision,
      now,
      body.position.x,
      body.position.z,
    );
    if (
      visitId === NO_BIG_TREE_VISIT &&
      this.visits.zone.contains(body.position.x, body.position.z, false)
    ) {
      visitId = this.visits.requestVisit(
        BIG_TREE_OWNER_ORDINARY,
        ownerId,
        BigTreeVisitReason.Safety,
        now,
        body.position.x,
        body.position.z,
      );
    }
    if (visitId !== NO_BIG_TREE_VISIT) this.addActive(BIG_TREE_OWNER_ORDINARY, ownerId, body, now);
  }

  private considerXenomimic(
    body: BigTreeXenomimicBody,
    now: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    const ownerId = xenomimicBigTreeOwnerId(body);
    let visitState = this.visits.stateOf(BIG_TREE_OWNER_XENOMIMIC, ownerId);
    if (visitState === BigTreeVisitState.Cooldown) {
      visitState = this.visits.updatePosition(
        BIG_TREE_OWNER_XENOMIMIC,
        ownerId,
        body.x,
        body.z,
        now,
      );
    }
    if (
      ownerId < 0 ||
      !body.alive ||
      this.findActive(BIG_TREE_OWNER_XENOMIMIC, ownerId) >= 0 ||
      visitState !== BigTreeVisitState.Outside
    ) {
      return;
    }
    this.fillContext(
      BIG_TREE_OWNER_XENOMIMIC,
      ownerId,
      body.x,
      body.z,
      1 - this.clamp01(body.energy),
      this.clamp01(body.age / 300),
      environment,
    );
    let visitId = this.visits.requestContextualVisit(
      BIG_TREE_OWNER_XENOMIMIC,
      ownerId,
      this.pollOrdinal,
      this.context,
      this.decision,
      now,
      body.x,
      body.z,
    );
    if (visitId === NO_BIG_TREE_VISIT && this.visits.zone.contains(body.x, body.z, false)) {
      visitId = this.visits.requestVisit(
        BIG_TREE_OWNER_XENOMIMIC,
        ownerId,
        BigTreeVisitReason.Safety,
        now,
        body.x,
        body.z,
      );
    }
    if (visitId !== NO_BIG_TREE_VISIT) {
      this.addActive(BIG_TREE_OWNER_XENOMIMIC, ownerId, body, now);
    }
  }

  private fillContext(
    ownerKind: number,
    ownerId: number,
    x: number,
    z: number,
    hunger: number,
    fatigue: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    const dx = x - this.visits.zone.centerX;
    const dz = z - this.visits.zone.centerZ;
    this.context.hunger = hunger;
    this.context.fatigue = fatigue;
    this.context.healthDeficit = 0;
    this.context.stress = this.clamp01(environment?.stress ?? 0);
    this.context.socialNeed = Math.max(
      this.clamp01(environment?.socialNeed ?? 0),
      this.hashUnit(ownerKind, ownerId, 0x68bc21eb) * 0.65,
    );
    this.context.curiosity = Math.max(
      this.clamp01(environment?.curiosity ?? 0),
      this.hashUnit(ownerKind, ownerId, 0x02e5be93) * 0.55,
    );
    this.context.danger = this.clamp01(environment?.danger ?? 0);
    this.context.distance = Math.sqrt(dx * dx + dz * dz);
    this.context.routeAvailable = true;
    this.context.foodAvailable = environment?.foodAvailable !== false;
    this.context.recentVisit = 0;
    this.context.personality = this.hashUnit(ownerKind, ownerId, 0x9e3779b9);
    this.context.simulationLoad = this.clamp01(environment?.simulationLoad ?? 0);
  }

  private addActive(ownerKind: number, ownerId: number, body: VisitorBody, now: number): void {
    if (this.activeCount >= this.activeBodies.length) {
      this.visits.cancelActor(ownerKind, ownerId);
      return;
    }
    const index = this.activeCount++;
    this.activeKinds[index] = ownerKind;
    this.activeOwnerIds[index] = ownerId;
    this.activeFoodOwnerIds[index] = bigTreeFoodOwnerId(ownerKind, ownerId);
    this.activeBodies[index] = body;
    this.setActiveIndex(ownerKind, ownerId, index);
    this.foodReservations[index] = null;
    this.foodRetryAt[index] = now;
    this.foodMissingSince[index] = Number.POSITIVE_INFINITY;
    this.eatingUntil[index] = 0;
    this.targetXs[index] = this.visits.zone.centerX;
    this.targetYs[index] = this.yOf(ownerKind, body);
    this.targetZs[index] = this.visits.zone.centerZ;
    // Keep the source-owned body marked for the complete visit lifecycle, including travel. Older
    // entity controllers may use this narrow signal to yield ambient herding until cleanup below.
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      (body as BigTreeOrdinaryBody).userData.treeVisit = true;
    }
    this.acceptedVisits++;
    if (this.visits.readVisit(ownerKind, ownerId, this.visitView)) {
      if (this.visitView.reason === BigTreeVisitReason.Food) this.acquireFood(index, now);
    }
  }

  /** Returns true when the current slot was removed and the swapped entry needs processing. */
  private updateActive(index: number, now: number, dt: number): boolean {
    const ownerKind = this.activeKinds[index] ?? 0;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    const body = this.activeBodies[index] ?? null;
    if (body === null || !this.isAlive(ownerKind, body)) {
      this.removeActive(index, true);
      this.cancellations++;
      return true;
    }
    const x = this.xOf(ownerKind, body);
    const z = this.zOf(ownerKind, body);
    const state = this.visits.updatePosition(ownerKind, ownerId, x, z, now);
    if (state === BigTreeVisitState.Outside) {
      this.removeActive(index, false);
      return true;
    }
    if (state === BigTreeVisitState.Cooldown) {
      // A hard leave timeout bounds the visit state, but it must not also drop locomotion while the
      // body is still protected. Keep calm deterministic egress authority until the body really
      // crosses the outer hysteresis boundary; the manager's cooldown still blocks re-entry.
      if (!this.visits.zone.contains(x, z, true)) {
        this.removeActive(index, false);
        return true;
      }
      this.steerToExit(index, ownerKind, ownerId, body, dt);
      this.releaseFood(index);
      return false;
    }
    if (!this.visits.readVisit(ownerKind, ownerId, this.visitView)) {
      this.removeActive(index, false);
      return true;
    }

    if (state === BigTreeVisitState.Travelling) {
      if (
        this.visitView.slotId === NO_BIG_TREE_SLOT ||
        !this.visits.readSlot(this.visitView.slotId, this.slotView)
      ) {
        this.visits.cancelActor(ownerKind, ownerId);
        this.removeActive(index, false);
        return true;
      }
      // Authored visit slots are planar. Preserve the organism's current vertical plane for
      // resting/social destinations; food activity replaces this with the edible's authored,
      // reachable interaction Y. Xenomimics intentionally remain ground-planar.
      const targetY = this.yOf(ownerKind, body);
      this.setTarget(index, this.slotView.x, targetY, this.slotView.z);
      this.steer(ownerKind, body, this.slotView.x, targetY, this.slotView.z, dt);
      if (this.visitView.reason === BigTreeVisitReason.Food) this.maintainFood(index, now, false);
      return false;
    }

    if (state === BigTreeVisitState.Leaving) {
      this.steerToExit(index, ownerKind, ownerId, body, dt);
      this.releaseFood(index);
      return false;
    }

    let partnerKind = this.visitView.partnerKind;
    let partnerId = this.visitView.partnerId;
    if (this.visitView.activity === BigTreeActivity.Socialize && partnerKind !== NO_OWNER) {
      const partnerIndex = this.findActive(partnerKind, partnerId);
      if (partnerIndex < 0 || !this.socialPairWithinReach(index, partnerIndex)) {
        this.visits.releasePartner(ownerKind, ownerId);
        partnerKind = NO_OWNER;
        partnerId = NO_OWNER;
      } else {
        this.faceSocialPartner(ownerKind, body, partnerKind, partnerId);
      }
    }

    if (this.activityCallbacks !== null) {
      this.activityCallbacks.performActivity(
        ownerKind,
        ownerId,
        partnerKind,
        partnerId,
        body,
        this.visitView.activity,
        dt,
        now,
      );
    }

    if (this.visitView.activity === BigTreeActivity.Eat) {
      this.updateFoodActivity(index, now, dt);
    } else if (this.visitView.activity === BigTreeActivity.Rest) {
      this.damp(ownerKind, body, dt);
      this.updateRestActivity(index, ownerKind, body, now, dt);
    } else {
      this.damp(ownerKind, body, dt);
    }
    return false;
  }

  private updateFoodActivity(index: number, now: number, dt: number): void {
    if (!this.maintainFood(index, now, true)) return;
    const reservation = this.foodReservations[index] ?? null;
    if (reservation === null) return;
    const resource = this.tree.edibleResources.get(reservation.id);
    if (!this.resourceMatches(resource, reservation)) {
      this.loseFood(index, now);
      return;
    }
    this.setTarget(index, resource.interactionX, resource.interactionY, resource.interactionZ);
    const ownerKind = this.activeKinds[index] ?? 0;
    const body = this.activeBodies[index]!;
    this.steer(
      ownerKind,
      body,
      resource.interactionX,
      resource.interactionY,
      resource.interactionZ,
      dt,
    );
    const dx = this.xOf(ownerKind, body) - resource.interactionX;
    const dz = this.zOf(ownerKind, body) - resource.interactionZ;
    // Ordinary organisms inhabit the full dome volume, so sharing X/Z with food is insufficient:
    // they must reach the canonical interaction point in 3D. Xenomimics are a planar ground
    // population and deliberately retain the established X/Z reach model.
    const dy =
      ownerKind === BIG_TREE_OWNER_ORDINARY ? this.yOf(ownerKind, body) - resource.interactionY : 0;
    if (dx * dx + dy * dy + dz * dz > this.foodReachRadiusSquared) return;

    if (!this.tree.beginFoodConsumption(reservation)) {
      this.loseFood(index, now);
      return;
    }
    this.foodReservations[index] = null;
    const nourishment = this.tree.completeFoodConsumption(reservation);
    if (nourishment <= 0) {
      this.tree.cancelFood(reservation);
      this.loseFood(index, now);
      return;
    }
    this.awardNourishment(ownerKind, body, nourishment);
    this.eatingUntil[index] = now + this.eatingFeedbackSeconds;
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const ordinary = body as BigTreeOrdinaryBody;
      ordinary.userData.belly = Math.max(ordinary.userData.belly, 24);
    } else {
      const xenomimic = body as BigTreeXenomimicBody;
      xenomimic.shimmer = Math.max(xenomimic.shimmer, 1);
    }
    this.completedMeals++;
    if (resource.kind === 'fruit') this.consumedFruit++;
    else this.consumedLeaves++;
    this.visits.finishActivity(ownerKind, this.activeOwnerIds[index] ?? NO_OWNER, now);
  }

  private maintainFood(index: number, now: number, allowTimeout: boolean): boolean {
    const reservation = this.foodReservations[index] ?? null;
    if (reservation !== null) {
      const resource = this.tree.edibleResources.get(reservation.id);
      if (
        this.resourceMatches(resource, reservation) &&
        this.tree.renewFood(reservation, this.foodLeaseSeconds)
      ) {
        return true;
      }
      this.loseFood(index, now);
    }
    if (now >= (this.foodRetryAt[index] ?? 0) && this.acquireFood(index, now)) return true;
    if (
      allowTimeout &&
      Number.isFinite(this.foodMissingSince[index]) &&
      now - (this.foodMissingSince[index] ?? now) >= this.foodSearchTimeoutSeconds
    ) {
      this.visits.finishActivity(
        this.activeKinds[index] ?? 0,
        this.activeOwnerIds[index] ?? NO_OWNER,
        now,
      );
    }
    return false;
  }

  private acquireFood(index: number, now: number): boolean {
    const ownerKind = this.activeKinds[index] ?? 0;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    const foodOwnerId = this.activeFoodOwnerIds[index] ?? NO_OWNER;
    if (foodOwnerId < 0) return false;
    const preferred: EdibleResourceKind = ((ownerKind + ownerId) & 1) === 0 ? 'fruit' : 'leaf';
    const reservation =
      this.tree.reserveFood(foodOwnerId, this.foodLeaseSeconds, preferred) ??
      this.tree.reserveFood(foodOwnerId, this.foodLeaseSeconds);
    if (reservation === null) {
      this.foodRetryAt[index] = now + this.foodRetrySeconds;
      if (!Number.isFinite(this.foodMissingSince[index])) this.foodMissingSince[index] = now;
      return false;
    }
    this.foodReservations[index] = reservation;
    this.foodRetryAt[index] = now;
    this.foodMissingSince[index] = Number.POSITIVE_INFINITY;
    return true;
  }

  private loseFood(index: number, now: number): void {
    const reservation = this.foodReservations[index] ?? null;
    if (reservation !== null) this.tree.cancelFood(reservation);
    this.foodReservations[index] = null;
    this.foodRetryAt[index] = now + this.foodRetrySeconds;
    if (!Number.isFinite(this.foodMissingSince[index])) this.foodMissingSince[index] = now;
    this.targetLosses++;
  }

  private releaseFood(index: number): void {
    const reservation = this.foodReservations[index] ?? null;
    // This adapter owns at most one reservation per active actor. Cancelling that exact generation
    // is sufficient and O(1); an owner-wide release scans the complete 20k tree pool and previously
    // ran on every LEAVING frame. Lifecycle cleanup keeps the rare owner-wide fallback in cancelOwner.
    if (reservation !== null) this.tree.cancelFood(reservation);
    this.foodReservations[index] = null;
  }

  private updateRestActivity(
    index: number,
    ownerKind: number,
    body: VisitorBody,
    now: number,
    dt: number,
  ): void {
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const ordinary = body as BigTreeOrdinaryBody;
      ordinary.userData.energy = Math.min(
        100,
        ordinary.userData.energy + this.ordinaryRestPerSecond * dt,
      );
      if (ordinary.userData.energy >= this.ordinaryRestTarget) {
        this.visits.finishActivity(ownerKind, this.activeOwnerIds[index] ?? NO_OWNER, now);
      }
    } else {
      const xenomimic = body as BigTreeXenomimicBody;
      xenomimic.energy = Math.min(1, xenomimic.energy + this.xenomimicRestPerSecond * dt);
      if (xenomimic.energy >= this.xenomimicRestTarget) {
        this.visits.finishActivity(ownerKind, this.activeOwnerIds[index] ?? NO_OWNER, now);
      }
    }
  }

  /** One-pass matching queue; never scans all possible pairs. */
  private matchSocialPartners(now: number): void {
    let waiting = -1;
    for (let index = 0; index < this.activeCount; index++) {
      const ownerKind = this.activeKinds[index] ?? 0;
      const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
      if (!this.visits.readVisit(ownerKind, ownerId, this.visitView)) continue;
      if (
        this.visitView.state !== BigTreeVisitState.Active ||
        this.visitView.activity !== BigTreeActivity.Socialize
      ) {
        continue;
      }
      if (this.visitView.partnerKind !== NO_OWNER) {
        const partnerIndex = this.findActive(this.visitView.partnerKind, this.visitView.partnerId);
        if (partnerIndex < 0 || !this.socialPairWithinReach(index, partnerIndex)) {
          this.visits.releasePartner(ownerKind, ownerId);
          continue;
        }
        this.visits.reservePartner(
          ownerKind,
          ownerId,
          this.visitView.partnerKind,
          this.visitView.partnerId,
          now,
          true,
          this.socialLeaseSeconds,
        );
        continue;
      }
      if (waiting < 0) {
        waiting = index;
        continue;
      }
      const waitingKind = this.activeKinds[waiting] ?? 0;
      const waitingOwner = this.activeOwnerIds[waiting] ?? NO_OWNER;
      if (!this.socialPairWithinReach(waiting, index)) {
        waiting = index;
        continue;
      }
      if (
        this.visits.reservePartner(
          waitingKind,
          waitingOwner,
          ownerKind,
          ownerId,
          now,
          true,
          this.socialLeaseSeconds,
        )
      ) {
        this.transferCooperativePolicy(waiting, index);
        waiting = -1;
      } else {
        waiting = index;
      }
    }
  }

  /**
   * A real, narrowly scoped knowledge transfer: when two willing ordinary organisms first pair,
   * a defector may imitate its cooperative partner. `strategy` is not decorative metadata — the
   * canonical Nash behavior reads it after the visit, and heredity can pass it to descendants.
   * Existing leases take the branch above and therefore cannot repeat or inflate this event.
   */
  private transferCooperativePolicy(firstIndex: number, secondIndex: number): void {
    if (
      this.activeKinds[firstIndex] !== BIG_TREE_OWNER_ORDINARY ||
      this.activeKinds[secondIndex] !== BIG_TREE_OWNER_ORDINARY
    ) {
      return;
    }
    const first = this.activeBodies[firstIndex] as BigTreeOrdinaryBody | null;
    const second = this.activeBodies[secondIndex] as BigTreeOrdinaryBody | null;
    if (first === null || second === null) return;
    const firstStrategy = first.userData.strategy;
    const secondStrategy = second.userData.strategy;
    if (firstStrategy === 0 && secondStrategy === 1) {
      second.userData.strategy = 0;
      this.policyTransfers++;
    } else if (firstStrategy === 1 && secondStrategy === 0) {
      first.userData.strategy = 0;
      this.policyTransfers++;
    }
  }

  private cancelOwner(ownerKind: number, ownerId: number): boolean {
    if (ownerId < 0) return false;
    const index = this.findActive(ownerKind, ownerId);
    if (index >= 0) {
      this.removeActive(index, true);
      this.cancellations++;
      return true;
    }
    const cancelled = this.visits.cancelActor(ownerKind, ownerId);
    // Unknown ordinary deaths are common ecosystem churn. They cannot own adapter food, so avoid
    // turning every unrelated death into a complete Crystal-tree registry scan. The owner-wide
    // fallback is retained only for an inconsistent visit record missing from the dense active map.
    if (cancelled) {
      this.tree.releaseFoodOwner(bigTreeFoodOwnerId(ownerKind, ownerId));
      this.cancellations++;
    }
    return cancelled;
  }

  private resetOwnerKind(ownerKind: number): void {
    let index = 0;
    while (index < this.activeCount) {
      if ((this.activeKinds[index] ?? NO_OWNER) !== ownerKind) {
        index++;
        continue;
      }
      this.removeActive(index, true);
    }
    this.visits.cancelOwnerKind(ownerKind);
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) this.ordinaryActiveIndices.clear();
    else if (ownerKind === BIG_TREE_OWNER_XENOMIMIC) this.xenomimicActiveIndices.clear();
  }

  private removeActive(index: number, cancelVisit: boolean): void {
    const ownerKind = this.activeKinds[index] ?? 0;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    const leavingBody = this.activeBodies[index];
    if (ownerKind === BIG_TREE_OWNER_ORDINARY && leavingBody) {
      (leavingBody as BigTreeOrdinaryBody).userData.treeVisit = false;
    }
    this.releaseFood(index);
    if (cancelVisit) this.visits.cancelActor(ownerKind, ownerId);
    this.deleteActiveIndex(ownerKind, ownerId);
    const last = --this.activeCount;
    if (index !== last) {
      this.activeKinds[index] = this.activeKinds[last] ?? 0;
      this.activeOwnerIds[index] = this.activeOwnerIds[last] ?? NO_OWNER;
      this.activeFoodOwnerIds[index] = this.activeFoodOwnerIds[last] ?? NO_OWNER;
      this.activeBodies[index] = this.activeBodies[last] ?? null;
      this.foodReservations[index] = this.foodReservations[last] ?? null;
      this.foodRetryAt[index] = this.foodRetryAt[last] ?? 0;
      this.foodMissingSince[index] = this.foodMissingSince[last] ?? Number.POSITIVE_INFINITY;
      this.eatingUntil[index] = this.eatingUntil[last] ?? 0;
      this.targetXs[index] = this.targetXs[last] ?? 0;
      this.targetYs[index] = this.targetYs[last] ?? 0;
      this.targetZs[index] = this.targetZs[last] ?? 0;
      this.setActiveIndex(
        this.activeKinds[index] ?? 0,
        this.activeOwnerIds[index] ?? NO_OWNER,
        index,
      );
    }
    this.activeKinds[last] = 0;
    this.activeOwnerIds[last] = NO_OWNER;
    this.activeFoodOwnerIds[last] = NO_OWNER;
    this.activeBodies[last] = null;
    this.foodReservations[last] = null;
    this.foodRetryAt[last] = 0;
    this.foodMissingSince[last] = Number.POSITIVE_INFINITY;
    this.eatingUntil[last] = 0;
    this.targetXs[last] = 0;
    this.targetYs[last] = 0;
    this.targetZs[last] = 0;
  }

  private findActive(ownerKind: number, ownerId: number): number {
    const index =
      ownerKind === BIG_TREE_OWNER_ORDINARY
        ? this.ordinaryActiveIndices.get(ownerId)
        : ownerKind === BIG_TREE_OWNER_XENOMIMIC
          ? this.xenomimicActiveIndices.get(ownerId)
          : undefined;
    return index ?? -1;
  }

  private setActiveIndex(ownerKind: number, ownerId: number, index: number): void {
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) this.ordinaryActiveIndices.set(ownerId, index);
    else if (ownerKind === BIG_TREE_OWNER_XENOMIMIC)
      this.xenomimicActiveIndices.set(ownerId, index);
  }

  private deleteActiveIndex(ownerKind: number, ownerId: number): void {
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) this.ordinaryActiveIndices.delete(ownerId);
    else if (ownerKind === BIG_TREE_OWNER_XENOMIMIC) this.xenomimicActiveIndices.delete(ownerId);
  }

  private setTarget(index: number, x: number, y: number, z: number): void {
    this.targetXs[index] = x;
    this.targetYs[index] = y;
    this.targetZs[index] = z;
  }

  /**
   * Choose the shortest calm horizontal route through the outer boundary. The identity hash is used
   * only at the exact centre, where no radial direction exists, so the fallback remains deterministic.
   */
  private steerToExit(
    index: number,
    ownerKind: number,
    ownerId: number,
    body: VisitorBody,
    dt: number,
  ): void {
    const x = this.xOf(ownerKind, body);
    const z = this.zOf(ownerKind, body);
    let dx = x - this.visits.zone.centerX;
    let dz = z - this.visits.zone.centerZ;
    let length = Math.sqrt(dx * dx + dz * dz);
    if (length <= 1e-6) {
      const angle = this.hashUnit(ownerKind, ownerId, 0x7f4a7c15) * Math.PI * 2;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      length = 1;
    }
    const radius = this.visits.zone.exitRadius + 24;
    const targetX = this.visits.zone.centerX + (dx / length) * radius;
    const targetZ = this.visits.zone.centerZ + (dz / length) * radius;
    const targetY = this.yOf(ownerKind, body);
    this.setTarget(index, targetX, targetY, targetZ);
    this.steer(ownerKind, body, targetX, targetY, targetZ, dt);
  }

  private socialPairWithinReach(firstIndex: number, secondIndex: number): boolean {
    const firstKind = this.activeKinds[firstIndex] ?? 0;
    const secondKind = this.activeKinds[secondIndex] ?? 0;
    const first = this.activeBodies[firstIndex] ?? null;
    const second = this.activeBodies[secondIndex] ?? null;
    if (first === null || second === null) return false;
    const dx = this.xOf(firstKind, first) - this.xOf(secondKind, second);
    const dy = this.yOf(firstKind, first) - this.yOf(secondKind, second);
    const dz = this.zOf(firstKind, first) - this.zOf(secondKind, second);
    return dx * dx + dy * dy + dz * dz <= this.socialReachRadiusSquared;
  }

  /** Orient willing partners without adding a second movement controller or a population scan. */
  private faceSocialPartner(
    ownerKind: number,
    body: VisitorBody,
    partnerKind: number,
    partnerId: number,
  ): void {
    const partnerIndex = this.findActive(partnerKind, partnerId);
    const partner = partnerIndex >= 0 ? (this.activeBodies[partnerIndex] ?? null) : null;
    if (partner === null) return;
    const dx = this.xOf(partnerKind, partner) - this.xOf(ownerKind, body);
    const dz = this.zOf(partnerKind, partner) - this.zOf(ownerKind, body);
    if (dx * dx + dz * dz > this.socialReachRadiusSquared || dx * dx + dz * dz <= 1e-8) return;
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const rotation = (body as BigTreeOrdinaryBody).rotation;
      if (rotation !== undefined) rotation.y = Math.atan2(dx, dz);
    } else {
      (body as BigTreeXenomimicBody).heading = Math.atan2(dz, dx);
    }
  }

  private steer(
    ownerKind: number,
    body: VisitorBody,
    targetX: number,
    targetY: number,
    targetZ: number,
    dt: number,
  ): void {
    const x = this.xOf(ownerKind, body);
    const y = this.yOf(ownerKind, body);
    const z = this.zOf(ownerKind, body);
    const dx = targetX - x;
    const dy = ownerKind === BIG_TREE_OWNER_ORDINARY ? targetY - y : 0;
    const dz = targetZ - z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance <= 1e-6) {
      this.damp(ownerKind, body, dt);
      return;
    }
    const speed = ownerKind === BIG_TREE_OWNER_ORDINARY ? this.ordinarySpeed : this.xenomimicSpeed;
    const desiredX = (dx / distance) * speed;
    const desiredY = (dy / distance) * speed;
    const desiredZ = (dz / distance) * speed;
    const blend = Math.min(1, this.steeringGain * dt);
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const velocity = (body as BigTreeOrdinaryBody).userData.vel;
      velocity.x += (desiredX - velocity.x) * blend;
      velocity.y = (velocity.y ?? 0) + (desiredY - (velocity.y ?? 0)) * blend;
      velocity.z += (desiredZ - velocity.z) * blend;
    } else {
      const xenomimic = body as BigTreeXenomimicBody;
      xenomimic.vx += (desiredX - xenomimic.vx) * blend;
      xenomimic.vz += (desiredZ - xenomimic.vz) * blend;
      // Xenomimic integration defines vx=cos(heading), vz=sin(heading).
      xenomimic.heading = Math.atan2(xenomimic.vz, xenomimic.vx);
    }
  }

  private damp(ownerKind: number, body: VisitorBody, dt: number): void {
    const damping = Math.max(0, 1 - dt * 5);
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const velocity = (body as BigTreeOrdinaryBody).userData.vel;
      velocity.x *= damping;
      velocity.y = (velocity.y ?? 0) * damping;
      velocity.z *= damping;
    } else {
      const xenomimic = body as BigTreeXenomimicBody;
      xenomimic.vx *= damping;
      xenomimic.vz *= damping;
    }
  }

  private awardNourishment(ownerKind: number, body: VisitorBody, nourishment: number): void {
    if (ownerKind === BIG_TREE_OWNER_ORDINARY) {
      const ordinary = body as BigTreeOrdinaryBody;
      ordinary.userData.energy = Math.min(100, Math.max(0, ordinary.userData.energy + nourishment));
    } else {
      const xenomimic = body as BigTreeXenomimicBody;
      xenomimic.energy = Math.min(1, Math.max(0, xenomimic.energy + nourishment / 100));
    }
  }

  private resourceMatches(
    resource: EdibleResource | undefined,
    reservation: EdibleReservation,
  ): resource is EdibleResource {
    return (
      resource !== undefined &&
      resource.generation === reservation.generation &&
      resource.ownerId === reservation.ownerId &&
      (resource.state === 'reserved' || resource.state === 'consuming')
    );
  }

  private isAlive(ownerKind: number, body: VisitorBody): boolean {
    return ownerKind === BIG_TREE_OWNER_ORDINARY
      ? (body as BigTreeOrdinaryBody).userData.alive !== false
      : (body as BigTreeXenomimicBody).alive;
  }

  private xOf(ownerKind: number, body: VisitorBody): number {
    return ownerKind === BIG_TREE_OWNER_ORDINARY
      ? (body as BigTreeOrdinaryBody).position.x
      : (body as BigTreeXenomimicBody).x;
  }

  private zOf(ownerKind: number, body: VisitorBody): number {
    return ownerKind === BIG_TREE_OWNER_ORDINARY
      ? (body as BigTreeOrdinaryBody).position.z
      : (body as BigTreeXenomimicBody).z;
  }

  /** Xenomimics are planar; zero is only a diagnostic target and never enters their steering. */
  private yOf(ownerKind: number, body: VisitorBody): number {
    return ownerKind === BIG_TREE_OWNER_ORDINARY
      ? ((body as BigTreeOrdinaryBody).position.y ?? 0)
      : 0;
  }

  private energyOf(ownerKind: number, body: VisitorBody): number {
    return ownerKind === BIG_TREE_OWNER_ORDINARY
      ? (body as BigTreeOrdinaryBody).userData.energy
      : (body as BigTreeXenomimicBody).energy;
  }

  private hashUnit(ownerKind: number, ownerId: number, salt: number): number {
    let hash = (salt ^ this.hashSeedValue ^ Math.imul(ownerKind + 1, 0x85ebca6b)) >>> 0;
    hash = Math.imul(hash ^ ownerId, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x2c1b3c6d) >>> 0;
    hash ^= hash >>> 12;
    return hash / 0x100000000;
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value >= 1 ? 1 : value;
  }

  private integerAtLeast(
    value: number | undefined,
    fallback: number,
    minimum: number,
    label: string,
  ): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || resolved < minimum) {
      throw new RangeError(`${label} must be an integer >= ${minimum}`);
    }
    return resolved;
  }

  private positive(value: number | undefined, fallback: number, label: string): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved) || resolved <= 0) {
      throw new RangeError(`${label} must be a positive finite number`);
    }
    return resolved;
  }

  private range(
    value: number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    label: string,
  ): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved) || resolved < minimum || resolved > maximum) {
      throw new RangeError(`${label} must be in [${minimum},${maximum}]`);
    }
    return resolved;
  }
}
