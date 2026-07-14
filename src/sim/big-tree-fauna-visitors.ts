/**
 * Canonical Big Tree adapters for independently owned dome fauna.
 *
 * This coordinator deliberately reuses the production {@link BigTreeVisitManager} and
 * {@link BigTreeFoodSource}. It does not own a second zone, food pool, clock, renderer, relationship
 * table, or species simulation. Discovery is round-robin and budgeted; active work can never exceed
 * the shared visit-manager capacity.
 */

import type { EdibleReservation, EdibleResource, EdibleResourceKind } from './edible-resource';
import { type BigTreeFoodSource, type BigTreeVisitorEnvironment } from './big-tree-visitors';
import {
  type BigTreeFaunaActor,
  type BigTreeFaunaCategory,
  type BigTreeFaunaOwnerKind,
  type BigTreeFaunaSourceBinding,
  BIG_TREE_OWNER_APEX,
  BIG_TREE_OWNER_LEVIATHAN,
  BIG_TREE_OWNER_PUPPET,
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
} from './big-tree-fauna-source';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  NO_BIG_TREE_SLOT,
  NO_BIG_TREE_VISIT,
  type BigTreeSlotView,
  type BigTreeVisitContext,
  type BigTreeVisitDecision,
  type BigTreeVisitView,
} from './big-tree-zone';

const NO_OWNER = -1;
const NO_RESOURCE = -1;
/** Disjoint from ordinary/Xenomimic food-owner keys, which remain below one million in production. */
const FAUNA_FOOD_OWNER_BASE = 1_000_000_000;
const FAUNA_FOOD_KIND_STRIDE = 1_000_000;

export interface BigTreeFaunaVisitorConfig {
  pollBudget?: number;
  pollIntervalSeconds?: number;
  foodLeaseSeconds?: number;
  foodRetrySeconds?: number;
  foodSearchTimeoutSeconds?: number;
  foodReachRadius?: number;
  steeringGain?: number;
  restPerSecond?: number;
  restTarget?: number;
  socialLeaseSeconds?: number;
  socialReachRadius?: number;
  flightVisitY?: number;
}

export interface BigTreeFaunaVisitorStats {
  activeVisitors: number;
  activeShoggoths: number;
  activeTitans: number;
  activeLeviathans: number;
  activePuppets: number;
  activeApex: number;
  lastPollCount: number;
  totalPolls: number;
  acceptedVisits: number;
  completedMeals: number;
  consumedFruit: number;
  consumedLeaves: number;
  targetLosses: number;
  cancellations: number;
  socialPairs: number;
}

export interface BigTreeFaunaVisitorView {
  ownerKind: BigTreeFaunaOwnerKind;
  ownerId: number;
  category: BigTreeFaunaCategory;
  sourceIndex: number;
  state: BigTreeVisitState;
  activity: BigTreeActivity;
  slotId: number;
  foodId: number;
  foodKind: EdibleResourceKind | null;
  foodState: string | null;
  targetX: number;
  targetY: number;
  targetZ: number;
  normalizedEnergy: number;
  partnerKind: number;
  partnerId: number;
}

/** Encode fauna reservations into one collision-free safe-integer namespace. */
export function bigTreeFaunaFoodOwnerId(ownerKind: BigTreeFaunaOwnerKind, ownerId: number): number {
  if (!isFaunaOwnerKind(ownerKind) || !Number.isInteger(ownerId) || ownerId < 0) return NO_OWNER;
  const value =
    FAUNA_FOOD_OWNER_BASE +
    (ownerKind - BIG_TREE_OWNER_SHOGGOTH) * FAUNA_FOOD_KIND_STRIDE +
    ownerId;
  return Number.isSafeInteger(value) ? value : NO_OWNER;
}

function isFaunaOwnerKind(value: number): value is BigTreeFaunaOwnerKind {
  return (
    value === BIG_TREE_OWNER_SHOGGOTH ||
    value === BIG_TREE_OWNER_TITAN ||
    value === BIG_TREE_OWNER_LEVIATHAN ||
    value === BIG_TREE_OWNER_PUPPET ||
    value === BIG_TREE_OWNER_APEX
  );
}

function actorScratch(): BigTreeFaunaActor {
  return {
    ownerId: 0,
    category: 'shoggoth',
    locomotion: 'ground',
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    energy: 0,
    maxEnergy: 1,
    alive: false,
    fatigue: 0,
    socialDrive: 0,
    health: 1,
    maxHealth: 1,
    danger: 0,
    criticalNeed: false,
    moveSpeed: 18,
    aggressionSuppressed: false,
  };
}

export class BigTreeFaunaVisitors {
  readonly tree: BigTreeFoodSource;
  readonly visits: BigTreeVisitManager;
  readonly bindings: readonly BigTreeFaunaSourceBinding[];

  private readonly pollBudget: number;
  private readonly pollIntervalSeconds: number;
  private readonly foodLeaseSeconds: number;
  private readonly foodRetrySeconds: number;
  private readonly foodSearchTimeoutSeconds: number;
  private readonly foodReachRadiusSquared: number;
  private readonly steeringGain: number;
  private readonly restPerSecond: number;
  private readonly restTarget: number;
  private readonly socialLeaseSeconds: number;
  private readonly socialReachRadiusSquared: number;
  private readonly flightVisitY: number;

  private readonly activeBindings: (BigTreeFaunaSourceBinding | null)[];
  private readonly activeSourceIndices: Int32Array;
  private readonly activeKinds: Int32Array;
  private readonly activeOwnerIds: Int32Array;
  private readonly activeFoodOwnerIds: Float64Array;
  private readonly foodReservations: (EdibleReservation | null)[];
  private readonly nextFoodRetryAt: Float64Array;
  private readonly foodSearchDeadline: Float64Array;
  private readonly targetXs: Float64Array;
  private readonly targetYs: Float64Array;
  private readonly targetZs: Float64Array;
  private readonly activeByKind = new Map<number, Map<number, number>>();
  private activeCount = 0;

  private readonly sourceCursors: Int32Array;
  private bindingCursor = 0;
  private nextPollAt = 0;
  private pollOrdinal = 0;
  private lastPollCount = 0;
  private totalPolls = 0;
  private acceptedVisits = 0;
  private completedMeals = 0;
  private consumedFruit = 0;
  private consumedLeaves = 0;
  private targetLosses = 0;
  private cancellations = 0;

  private readonly actor = actorScratch();
  private readonly partner = actorScratch();
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
    reason: BigTreeVisitReason.Food,
    activity: BigTreeActivity.None,
    utility: 0,
    threshold: 1,
  };
  private readonly visitView: BigTreeVisitView = {
    recordId: NO_BIG_TREE_VISIT,
    ownerKind: NO_OWNER,
    ownerId: NO_OWNER,
    state: BigTreeVisitState.Outside,
    reason: BigTreeVisitReason.Food,
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
  };
  private readonly otherVisitView: BigTreeVisitView = { ...this.visitView };
  private readonly slotView: BigTreeSlotView = {
    slotId: NO_BIG_TREE_SLOT,
    kind: BigTreeSlotKind.Any,
    x: 0,
    z: 0,
    ownerKind: NO_OWNER,
    ownerId: NO_OWNER,
    leaseExpiresAt: 0,
  };

  constructor(
    tree: BigTreeFoodSource,
    visits: BigTreeVisitManager,
    bindings: readonly BigTreeFaunaSourceBinding[],
    config: BigTreeFaunaVisitorConfig = {},
  ) {
    this.tree = tree;
    this.visits = visits;
    this.bindings = bindings;
    this.pollBudget = this.integerAtLeast(config.pollBudget, 16, 1, 'pollBudget');
    this.pollIntervalSeconds = this.positive(
      config.pollIntervalSeconds,
      0.1,
      'pollIntervalSeconds',
    );
    this.foodLeaseSeconds = this.positive(config.foodLeaseSeconds, 8, 'foodLeaseSeconds');
    this.foodRetrySeconds = this.positive(config.foodRetrySeconds, 0.4, 'foodRetrySeconds');
    this.foodSearchTimeoutSeconds = this.positive(
      config.foodSearchTimeoutSeconds,
      8,
      'foodSearchTimeoutSeconds',
    );
    const reach = this.positive(config.foodReachRadius, 8, 'foodReachRadius');
    this.foodReachRadiusSquared = reach * reach;
    this.steeringGain = this.positive(config.steeringGain, 5, 'steeringGain');
    this.restPerSecond = this.positive(config.restPerSecond, 0.035, 'restPerSecond');
    this.restTarget = this.range(config.restTarget, 0.86, 0, 1, 'restTarget');
    this.socialLeaseSeconds = this.positive(config.socialLeaseSeconds, 4, 'socialLeaseSeconds');
    const socialReach = this.positive(config.socialReachRadius, 24, 'socialReachRadius');
    this.socialReachRadiusSquared = socialReach * socialReach;
    this.flightVisitY = this.positive(config.flightVisitY, 24, 'flightVisitY');

    const capacity = visits.capacity;
    this.activeBindings = Array.from({ length: capacity }, () => null);
    this.activeSourceIndices = new Int32Array(capacity);
    this.activeKinds = new Int32Array(capacity);
    this.activeOwnerIds = new Int32Array(capacity);
    this.activeFoodOwnerIds = new Float64Array(capacity);
    this.foodReservations = Array.from({ length: capacity }, () => null);
    this.nextFoodRetryAt = new Float64Array(capacity);
    this.foodSearchDeadline = new Float64Array(capacity);
    this.targetXs = new Float64Array(capacity);
    this.targetYs = new Float64Array(capacity);
    this.targetZs = new Float64Array(capacity);
    this.activeSourceIndices.fill(-1);
    this.activeKinds.fill(NO_OWNER);
    this.activeOwnerIds.fill(NO_OWNER);
    this.activeFoodOwnerIds.fill(NO_OWNER);
    this.sourceCursors = new Int32Array(bindings.length);

    for (const binding of bindings) {
      if (!isFaunaOwnerKind(binding.ownerKind)) {
        throw new RangeError(`unsupported Big Tree fauna owner kind ${binding.ownerKind}`);
      }
    }
  }

  get activeVisitors(): number {
    return this.activeCount;
  }

  /** Update active visitors every frame and sample only a fixed candidate budget. */
  update(now: number, dt: number, environment?: Readonly<BigTreeVisitorEnvironment>): void {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(dt) || dt < 0) return;
    this.visits.step(now);
    let index = 0;
    while (index < this.activeCount) {
      if (this.updateActive(index, now, dt)) continue;
      index++;
    }
    this.matchSocialPartners(now);
    this.pollCandidates(now, environment);
  }

  reset(): void {
    while (this.activeCount > 0) this.removeActive(this.activeCount - 1, true);
    this.activeByKind.clear();
    this.sourceCursors.fill(0);
    this.bindingCursor = 0;
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
  }

  readStats(out: BigTreeFaunaVisitorStats): void {
    out.activeVisitors = this.activeCount;
    out.activeShoggoths = this.countKind(BIG_TREE_OWNER_SHOGGOTH);
    out.activeTitans = this.countKind(BIG_TREE_OWNER_TITAN);
    out.activeLeviathans = this.countKind(BIG_TREE_OWNER_LEVIATHAN);
    out.activePuppets = this.countKind(BIG_TREE_OWNER_PUPPET);
    out.activeApex = this.countKind(BIG_TREE_OWNER_APEX);
    out.lastPollCount = this.lastPollCount;
    out.totalPolls = this.totalPolls;
    out.acceptedVisits = this.acceptedVisits;
    out.completedMeals = this.completedMeals;
    out.consumedFruit = this.consumedFruit;
    out.consumedLeaves = this.consumedLeaves;
    out.targetLosses = this.targetLosses;
    out.cancellations = this.cancellations;
    let pairs = 0;
    for (let index = 0; index < this.activeCount; index++) {
      const kind = this.activeKinds[index] ?? NO_OWNER;
      const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
      if (this.visits.readVisit(kind, ownerId, this.visitView) && this.visitView.partnerKind >= 0) {
        pairs++;
      }
    }
    out.socialPairs = Math.floor(pairs / 2);
  }

  readVisitor(
    ownerKind: BigTreeFaunaOwnerKind,
    ownerId: number,
    out: BigTreeFaunaVisitorView,
  ): boolean {
    const index = this.findActive(ownerKind, ownerId);
    if (index < 0 || !this.visits.readVisit(ownerKind, ownerId, this.visitView)) return false;
    const binding = this.activeBindings[index];
    if (
      !binding ||
      !binding.source.readBigTreeActor(this.activeSourceIndices[index]!, this.actor)
    ) {
      return false;
    }
    const reservation = this.foodReservations[index];
    const resource = reservation ? this.tree.edibleResources.get(reservation.id) : undefined;
    out.ownerKind = ownerKind;
    out.ownerId = ownerId;
    out.category = binding.category;
    out.sourceIndex = this.activeSourceIndices[index]!;
    out.state = this.visitView.state;
    out.activity = this.visitView.activity;
    out.slotId = this.visitView.slotId;
    out.foodId = reservation?.id ?? NO_RESOURCE;
    out.foodKind = resource?.kind ?? null;
    out.foodState = resource?.state ?? null;
    out.targetX = this.targetXs[index]!;
    out.targetY = this.targetYs[index]!;
    out.targetZ = this.targetZs[index]!;
    out.normalizedEnergy = this.normalizedEnergy(this.actor);
    out.partnerKind = this.visitView.partnerKind;
    out.partnerId = this.visitView.partnerId;
    return true;
  }

  private pollCandidates(now: number, environment?: Readonly<BigTreeVisitorEnvironment>): void {
    this.lastPollCount = 0;
    if (now < this.nextPollAt || this.bindings.length === 0) return;
    this.nextPollAt = now + this.pollIntervalSeconds;
    // A poll tick never needs more calls than there are addressable actors — without this cap a
    // tick over mostly one-member sources (the apexes) re-polls the same bodies to burn the budget.
    let addressable = 0;
    for (const binding of this.bindings) {
      addressable += Math.max(0, binding.source.bigTreeActorCount);
    }
    const budget = Math.min(this.pollBudget, addressable);
    let emptyBindings = 0;
    while (this.lastPollCount < budget && emptyBindings < this.bindings.length) {
      const bindingIndex = this.bindingCursor % this.bindings.length;
      this.bindingCursor = (bindingIndex + 1) % this.bindings.length;
      const binding = this.bindings[bindingIndex]!;
      const count = binding.source.bigTreeActorCount;
      if (count <= 0) {
        emptyBindings++;
        continue;
      }
      emptyBindings = 0;
      const sourceIndex = (this.sourceCursors[bindingIndex] ?? 0) % count;
      this.sourceCursors[bindingIndex] = (sourceIndex + 1) % count;
      this.consider(binding, sourceIndex, now, environment);
      this.lastPollCount++;
      this.totalPolls++;
      this.pollOrdinal = (this.pollOrdinal + 1) >>> 0;
    }
  }

  private consider(
    binding: BigTreeFaunaSourceBinding,
    sourceIndex: number,
    now: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    if (!binding.source.readBigTreeActor(sourceIndex, this.actor)) return;
    const ownerId = this.actor.ownerId;
    if (
      !this.validActor(binding, this.actor) ||
      !this.actor.alive ||
      this.findActive(binding.ownerKind, ownerId) >= 0 ||
      this.visits.stateOf(binding.ownerKind, ownerId) !== BigTreeVisitState.Outside
    ) {
      return;
    }

    const centerDx = this.visits.zone.centerX - this.actor.x;
    const centerDz = this.visits.zone.centerZ - this.actor.z;
    const centerDy = this.actor.locomotion === 'flight' ? this.flightVisitY - this.actor.y : 0;
    const distance = Math.sqrt(centerDx * centerDx + centerDy * centerDy + centerDz * centerDz);
    const speed = Math.max(1, this.actor.moveSpeed ?? 18);
    const energy = this.normalizedEnergy(this.actor);
    const health = this.normalizedHealth(this.actor);
    this.context.hunger = 1 - energy;
    this.context.fatigue = this.clamp01(this.actor.fatigue ?? (1 - energy) * 0.35);
    this.context.healthDeficit = 1 - health;
    this.context.stress = this.clamp01(
      Math.max((this.actor.danger ?? 0) * 0.6, environment?.stress ?? 0),
    );
    this.context.socialNeed = this.clamp01(
      Math.max(this.actor.socialDrive ?? 0.25, environment?.socialNeed ?? 0),
    );
    this.context.curiosity = this.clamp01(
      this.hashUnit(binding.ownerKind, ownerId, 0x8da6b343) * 0.7 +
        (environment?.curiosity ?? 0) * 0.3,
    );
    this.context.danger = this.clamp01(Math.max(this.actor.danger ?? 0, environment?.danger ?? 0));
    this.context.distance = distance;
    this.context.routeAvailable = distance / speed <= this.visits.travelTimeout;
    this.context.foodAvailable = environment?.foodAvailable ?? true;
    this.context.recentVisit = 0;
    this.context.personality = this.hashUnit(binding.ownerKind, ownerId, 0x9e3779b9);
    this.context.simulationLoad = this.clamp01(environment?.simulationLoad ?? 0);
    if (this.actor.criticalNeed) {
      this.context.hunger = Math.max(this.context.hunger, 0.92);
      this.context.danger = Math.max(this.context.danger, 0.7);
    }

    const visitId = this.visits.requestContextualVisit(
      binding.ownerKind,
      ownerId,
      this.pollOrdinal,
      this.context,
      this.decision,
      now,
      this.actor.x,
      this.actor.z,
    );
    if (visitId !== NO_BIG_TREE_VISIT) this.addActive(binding, sourceIndex, ownerId, now);
  }

  private addActive(
    binding: BigTreeFaunaSourceBinding,
    sourceIndex: number,
    ownerId: number,
    now: number,
  ): void {
    if (this.activeCount >= this.activeBindings.length) {
      this.visits.cancelActor(binding.ownerKind, ownerId);
      return;
    }
    const index = this.activeCount++;
    this.activeBindings[index] = binding;
    this.activeSourceIndices[index] = sourceIndex;
    this.activeKinds[index] = binding.ownerKind;
    this.activeOwnerIds[index] = ownerId;
    this.activeFoodOwnerIds[index] = bigTreeFaunaFoodOwnerId(binding.ownerKind, ownerId);
    this.foodReservations[index] = null;
    this.nextFoodRetryAt[index] = now;
    // Food-search timeout starts after arrival/activity selection, not while a distant body travels.
    this.foodSearchDeadline[index] = Number.POSITIVE_INFINITY;
    this.setActiveIndex(binding.ownerKind, ownerId, index);
    if (!binding.source.setBigTreeActorControlled(sourceIndex, true)) {
      this.removeActive(index, true);
      return;
    }
    this.acceptedVisits++;
  }

  /** Return true when swap-removal placed a new actor at this same index. */
  private updateActive(index: number, now: number, dt: number): boolean {
    const binding = this.activeBindings[index];
    const sourceIndex = this.activeSourceIndices[index] ?? -1;
    const kind = this.activeKinds[index] ?? NO_OWNER;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    if (
      !binding ||
      sourceIndex < 0 ||
      !binding.source.readBigTreeActor(sourceIndex, this.actor) ||
      !this.validActor(binding, this.actor) ||
      this.actor.ownerId !== ownerId ||
      !this.actor.alive
    ) {
      this.removeActive(index, true);
      return true;
    }

    const state = this.visits.updatePosition(kind, ownerId, this.actor.x, this.actor.z, now);
    if (
      state === BigTreeVisitState.Outside ||
      state === BigTreeVisitState.Cooldown ||
      !this.visits.readVisit(kind, ownerId, this.visitView)
    ) {
      this.removeActive(index, false);
      return true;
    }

    this.actor.aggressionSuppressed = true;
    if (state === BigTreeVisitState.Travelling) {
      if (!this.visits.readSlot(this.visitView.slotId, this.slotView)) {
        this.removeActive(index, true);
        return true;
      }
      const targetY = this.actor.locomotion === 'flight' ? this.flightVisitY : this.actor.y;
      this.setTarget(index, this.slotView.x, targetY, this.slotView.z);
      this.steer(this.actor, this.slotView.x, targetY, this.slotView.z, dt);
    } else if (state === BigTreeVisitState.Leaving) {
      const angle = this.hashUnit(kind, ownerId, 0x7f4a7c15) * Math.PI * 2;
      const radius = this.visits.zone.exitRadius + 48;
      const targetX = this.visits.zone.centerX + Math.cos(angle) * radius;
      const targetZ = this.visits.zone.centerZ + Math.sin(angle) * radius;
      const targetY = this.actor.locomotion === 'flight' ? this.flightVisitY : this.actor.y;
      this.setTarget(index, targetX, targetY, targetZ);
      this.steer(this.actor, targetX, targetY, targetZ, dt);
      this.cancelReservation(index);
    } else if (this.visitView.activity === BigTreeActivity.Eat) {
      if (this.updateFood(index, binding, sourceIndex, now, dt)) return true;
    } else if (this.visitView.activity === BigTreeActivity.Rest) {
      this.damp(this.actor, dt);
      const nextEnergy = Math.min(
        this.actor.maxEnergy,
        this.actor.energy + this.actor.maxEnergy * this.restPerSecond * dt,
      );
      this.actor.energy = nextEnergy;
      if (this.normalizedEnergy(this.actor) >= this.restTarget) {
        this.visits.finishActivity(kind, ownerId, now);
      }
    } else {
      this.damp(this.actor, dt);
    }

    if (!binding.source.writeBigTreeActor(sourceIndex, this.actor)) {
      this.removeActive(index, true);
      return true;
    }
    return false;
  }

  private updateFood(
    index: number,
    binding: BigTreeFaunaSourceBinding,
    sourceIndex: number,
    now: number,
    dt: number,
  ): boolean {
    const kind = this.activeKinds[index]!;
    const ownerId = this.activeOwnerIds[index]!;
    let reservation = this.foodReservations[index] ?? null;
    if (reservation === null) {
      if (!Number.isFinite(this.foodSearchDeadline[index])) {
        this.foodSearchDeadline[index] = now + this.foodSearchTimeoutSeconds;
      }
      if (now < this.nextFoodRetryAt[index]!) {
        this.damp(this.actor, dt);
        return false;
      }
      if (now >= this.foodSearchDeadline[index]!) {
        this.visits.finishActivity(kind, ownerId, now);
        this.targetLosses++;
        return false;
      }
      const preferred: EdibleResourceKind = ((kind + ownerId) & 1) === 0 ? 'fruit' : 'leaf';
      const foodOwnerId = this.activeFoodOwnerIds[index]!;
      reservation =
        this.tree.reserveFood(foodOwnerId, this.foodLeaseSeconds, preferred) ??
        this.tree.reserveFood(foodOwnerId, this.foodLeaseSeconds);
      if (reservation === null) {
        this.nextFoodRetryAt[index] = now + this.foodRetrySeconds;
        return false;
      }
      this.foodReservations[index] = reservation;
    }

    const resource = this.tree.edibleResources.get(reservation.id);
    if (!this.resourceMatches(resource, reservation)) {
      this.foodReservations[index] = null;
      this.nextFoodRetryAt[index] = now + this.foodRetrySeconds;
      this.targetLosses++;
      return false;
    }
    if (!this.tree.renewFood(reservation, this.foodLeaseSeconds)) {
      this.foodReservations[index] = null;
      this.nextFoodRetryAt[index] = now + this.foodRetrySeconds;
      this.targetLosses++;
      return false;
    }

    const targetY = this.actor.locomotion === 'flight' ? resource.interactionY : this.actor.y;
    this.setTarget(index, resource.interactionX, targetY, resource.interactionZ);
    this.steer(this.actor, resource.interactionX, targetY, resource.interactionZ, dt);
    const dx = this.actor.x - resource.interactionX;
    const dy = this.actor.locomotion === 'flight' ? this.actor.y - resource.interactionY : 0;
    const dz = this.actor.z - resource.interactionZ;
    if (dx * dx + dy * dy + dz * dz > this.foodReachRadiusSquared) return false;

    if (!this.tree.beginFoodConsumption(reservation)) {
      this.foodReservations[index] = null;
      this.nextFoodRetryAt[index] = now + this.foodRetrySeconds;
      this.targetLosses++;
      return false;
    }
    const nourishment = this.tree.completeFoodConsumption(reservation);
    this.foodReservations[index] = null;
    if (nourishment <= 0) {
      this.nextFoodRetryAt[index] = now + this.foodRetrySeconds;
      this.targetLosses++;
      return false;
    }
    const normalized = nourishment / 100;
    if (!binding.source.nourishBigTreeActor(sourceIndex, normalized)) {
      // The food transaction is already committed; fail closed by ending this visit without a
      // duplicate grant. Source validation tests make this branch diagnostic-only in production.
      this.visits.finishActivity(kind, ownerId, now);
      return false;
    }
    // The final shared write below commits steering as well as energy. Mirror the exactly-once grant
    // in scratch so that write cannot overwrite the species-native nourishment applied above.
    this.actor.energy = Math.min(
      this.actor.maxEnergy,
      this.actor.energy + normalized * this.actor.maxEnergy,
    );
    this.completedMeals++;
    if (resource.kind === 'fruit') this.consumedFruit++;
    else this.consumedLeaves++;
    this.visits.finishActivity(kind, ownerId, now);
    return false;
  }

  private matchSocialPartners(now: number): void {
    for (let first = 0; first < this.activeCount; first++) {
      const firstKind = this.activeKinds[first]!;
      const firstId = this.activeOwnerIds[first]!;
      if (
        !this.visits.readVisit(firstKind, firstId, this.visitView) ||
        this.visitView.state !== BigTreeVisitState.Active ||
        this.visitView.activity !== BigTreeActivity.Socialize ||
        this.visitView.partnerKind >= 0
      ) {
        continue;
      }
      const firstBinding = this.activeBindings[first];
      if (
        !firstBinding ||
        !firstBinding.source.readBigTreeActor(this.activeSourceIndices[first]!, this.actor)
      ) {
        continue;
      }
      for (let second = first + 1; second < this.activeCount; second++) {
        const secondKind = this.activeKinds[second]!;
        const secondId = this.activeOwnerIds[second]!;
        if (
          !this.visits.readVisit(secondKind, secondId, this.otherVisitView) ||
          this.otherVisitView.state !== BigTreeVisitState.Active ||
          (this.otherVisitView.activity !== BigTreeActivity.Socialize &&
            this.otherVisitView.activity !== BigTreeActivity.Observe) ||
          this.otherVisitView.partnerKind >= 0
        ) {
          continue;
        }
        const secondBinding = this.activeBindings[second];
        if (
          !secondBinding ||
          !secondBinding.source.readBigTreeActor(this.activeSourceIndices[second]!, this.partner)
        ) {
          continue;
        }
        const dx = this.actor.x - this.partner.x;
        const dz = this.actor.z - this.partner.z;
        if (dx * dx + dz * dz > this.socialReachRadiusSquared) continue;
        if (
          this.visits.reservePartner(
            firstKind,
            firstId,
            secondKind,
            secondId,
            now,
            true,
            this.socialLeaseSeconds,
          )
        ) {
          break;
        }
      }
    }
  }

  private removeActive(index: number, cancelVisit: boolean): void {
    const binding = this.activeBindings[index];
    const sourceIndex = this.activeSourceIndices[index] ?? -1;
    const kind = this.activeKinds[index] ?? NO_OWNER;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    this.cancelReservation(index);
    if (binding && sourceIndex >= 0) {
      if (binding.source.readBigTreeActor(sourceIndex, this.actor)) {
        this.actor.aggressionSuppressed = false;
        binding.source.writeBigTreeActor(sourceIndex, this.actor);
      }
      binding.source.setBigTreeActorControlled(sourceIndex, false);
    }
    if (cancelVisit) {
      if (this.visits.cancelActor(kind, ownerId)) this.cancellations++;
    }
    this.deleteActiveIndex(kind, ownerId);

    const last = --this.activeCount;
    if (index !== last) {
      this.activeBindings[index] = this.activeBindings[last] ?? null;
      this.activeSourceIndices[index] = this.activeSourceIndices[last]!;
      this.activeKinds[index] = this.activeKinds[last]!;
      this.activeOwnerIds[index] = this.activeOwnerIds[last]!;
      this.activeFoodOwnerIds[index] = this.activeFoodOwnerIds[last]!;
      this.foodReservations[index] = this.foodReservations[last] ?? null;
      this.nextFoodRetryAt[index] = this.nextFoodRetryAt[last]!;
      this.foodSearchDeadline[index] = this.foodSearchDeadline[last]!;
      this.targetXs[index] = this.targetXs[last]!;
      this.targetYs[index] = this.targetYs[last]!;
      this.targetZs[index] = this.targetZs[last]!;
      this.setActiveIndex(this.activeKinds[index]!, this.activeOwnerIds[index]!, index);
    }
    this.activeBindings[last] = null;
    this.activeSourceIndices[last] = -1;
    this.activeKinds[last] = NO_OWNER;
    this.activeOwnerIds[last] = NO_OWNER;
    this.activeFoodOwnerIds[last] = NO_OWNER;
    this.foodReservations[last] = null;
    this.nextFoodRetryAt[last] = 0;
    this.foodSearchDeadline[last] = 0;
    this.targetXs[last] = 0;
    this.targetYs[last] = 0;
    this.targetZs[last] = 0;
  }

  private cancelReservation(index: number): void {
    const reservation = this.foodReservations[index] ?? null;
    if (reservation !== null) this.tree.cancelFood(reservation);
    const owner = this.activeFoodOwnerIds[index] ?? NO_OWNER;
    if (owner >= 0) this.tree.releaseFoodOwner(owner);
    this.foodReservations[index] = null;
  }

  private setTarget(index: number, x: number, y: number, z: number): void {
    this.targetXs[index] = x;
    this.targetYs[index] = y;
    this.targetZs[index] = z;
  }

  private steer(actor: BigTreeFaunaActor, x: number, y: number, z: number, dt: number): void {
    const dx = x - actor.x;
    const dy = actor.locomotion === 'flight' ? y - actor.y : 0;
    const dz = z - actor.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance <= 1e-6) {
      this.damp(actor, dt);
      return;
    }
    const speed = Math.max(1, actor.moveSpeed ?? 18);
    const blend = Math.min(1, this.steeringGain * dt);
    actor.vx += ((dx / distance) * speed - actor.vx) * blend;
    if (actor.locomotion === 'flight') {
      actor.vy += ((dy / distance) * speed - actor.vy) * blend;
    }
    actor.vz += ((dz / distance) * speed - actor.vz) * blend;
  }

  private damp(actor: BigTreeFaunaActor, dt: number): void {
    const damping = Math.max(0, 1 - dt * 5);
    actor.vx *= damping;
    actor.vz *= damping;
    if (actor.locomotion === 'flight') actor.vy *= damping;
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

  private validActor(binding: BigTreeFaunaSourceBinding, actor: BigTreeFaunaActor): boolean {
    return (
      actor.category === binding.category &&
      Number.isInteger(actor.ownerId) &&
      actor.ownerId >= 0 &&
      Number.isFinite(actor.x) &&
      Number.isFinite(actor.y) &&
      Number.isFinite(actor.z) &&
      Number.isFinite(actor.vx) &&
      Number.isFinite(actor.vy) &&
      Number.isFinite(actor.vz) &&
      Number.isFinite(actor.energy) &&
      Number.isFinite(actor.maxEnergy) &&
      actor.maxEnergy > 0
    );
  }

  private normalizedEnergy(actor: BigTreeFaunaActor): number {
    return this.clamp01(actor.energy / actor.maxEnergy);
  }

  private normalizedHealth(actor: BigTreeFaunaActor): number {
    const maximum = actor.maxHealth ?? 1;
    return maximum > 0 ? this.clamp01((actor.health ?? maximum) / maximum) : 0;
  }

  private countKind(kind: BigTreeFaunaOwnerKind): number {
    return this.activeByKind.get(kind)?.size ?? 0;
  }

  private findActive(kind: number, ownerId: number): number {
    return this.activeByKind.get(kind)?.get(ownerId) ?? -1;
  }

  private setActiveIndex(kind: number, ownerId: number, index: number): void {
    let map = this.activeByKind.get(kind);
    if (!map) {
      map = new Map<number, number>();
      this.activeByKind.set(kind, map);
    }
    map.set(ownerId, index);
  }

  private deleteActiveIndex(kind: number, ownerId: number): void {
    const map = this.activeByKind.get(kind);
    map?.delete(ownerId);
    if (map?.size === 0) this.activeByKind.delete(kind);
  }

  private hashUnit(ownerKind: number, ownerId: number, salt: number): number {
    let hash = (salt ^ Math.imul(ownerKind + 1, 0x85ebca6b)) >>> 0;
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
