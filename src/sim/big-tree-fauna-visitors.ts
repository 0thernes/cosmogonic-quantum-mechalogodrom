/**
 * Bounded Big Tree integration for fixed canonical-fauna systems.
 *
 * Each fauna system retains ownership of its bodies, native vitality scale, movement, animation,
 * combat, and rendering. This adapter owns neither a second creature model nor a second visit state
 * machine: it binds narrow public species hooks to {@link BigTreeVisitManager} and the canonical
 * Crystal-tree edible transaction. Candidate discovery is round-robin and budgeted; active work is
 * bounded by the shared visit capacity.
 */

import type { EdibleReservation, EdibleResource, EdibleResourceKind } from './edible-resource';
import type { BigTreeFoodSource, BigTreeVisitorEnvironment } from './big-tree-visitors';
import {
  BIG_TREE_OWNER_APEX,
  BIG_TREE_OWNER_LEVIATHAN,
  BIG_TREE_OWNER_PUPPET,
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
  type BigTreeFaunaActor,
  type BigTreeFaunaCategory,
  type BigTreeFaunaOwnerKind,
  type BigTreeFaunaSource as BigTreeActorSource,
  type BigTreeFaunaSourceBinding,
} from './big-tree-fauna-source';
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
} from './big-tree-zone';

export {
  BIG_TREE_OWNER_APEX,
  BIG_TREE_OWNER_LEVIATHAN,
  BIG_TREE_OWNER_PUPPET,
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
} from './big-tree-fauna-source';
/** Compatibility alias for the canonical puppet owner-kind name. */
export const BIG_TREE_OWNER_PUPPET_MASTER = BIG_TREE_OWNER_PUPPET;
/** User-launched NHI minds, bound to their one canonical backing Entity (never the visual follower). */
export const BIG_TREE_OWNER_NHI = 8;

export const BigTreeFaunaIntentMode = {
  Normal: 0,
  Travel: 1,
  Calm: 2,
  /** Reciprocal, lease-backed peaceful interaction; target coordinates identify the live partner. */
  Social: 3,
} as const;

export type BigTreeFaunaIntentMode =
  (typeof BigTreeFaunaIntentMode)[keyof typeof BigTreeFaunaIntentMode];

/** Caller-owned, allocation-free view of one stable fauna slot. */
export interface BigTreeFaunaVisitorSample {
  /** Stable for the source lifetime and independent of render-object identity. */
  ownerId: number;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  hunger: number;
  fatigue: number;
  healthDeficit: number;
  stress: number;
  socialNeed: number;
  curiosity: number;
}

/**
 * Narrow public bridge implemented by a canonical fauna system.
 *
 * Slots are stable for the source lifetime. Every method must be O(1), must not retain caller-owned
 * objects, and must treat an invalid/dead owner as a false/no-op result.
 */
export interface BigTreeFaunaSource {
  readonly bigTreeVisitorSlotCount: number;
  readBigTreeVisitor(slot: number, out: BigTreeFaunaVisitorSample): boolean;
  setBigTreeVisitorIntent(
    ownerId: number,
    mode: BigTreeFaunaIntentMode,
    targetX: number,
    targetY: number,
    targetZ: number,
  ): boolean;
  nourishBigTreeVisitor(ownerId: number, nourishment: number): boolean;
  /** Optional native recovery sink used only while an accepted Rest activity is active. */
  restBigTreeVisitor?(ownerId: number, dt: number): boolean;
  clearBigTreeVisitorIntent(ownerId: number): boolean;
}

export interface BigTreeFaunaBinding {
  readonly ownerKind: number;
  readonly source: BigTreeFaunaSource;
}

/** Validate and freeze the species namespace at composition time. */
export function bindBigTreeFauna(
  ownerKind: number,
  source: BigTreeFaunaSource,
): BigTreeFaunaBinding {
  if (
    !Number.isInteger(ownerKind) ||
    ownerKind < BIG_TREE_OWNER_SHOGGOTH ||
    ownerKind > 0x7fffffff
  ) {
    throw new RangeError(
      'fauna ownerKind must be a positive 31-bit integer outside core kinds 1-2',
    );
  }
  if (!source || !Number.isInteger(source.bigTreeVisitorSlotCount)) {
    throw new TypeError('fauna source must expose an integer bigTreeVisitorSlotCount');
  }
  return Object.freeze({ ownerKind, source });
}

function actorScratch(): BigTreeFaunaActor {
  return {
    ownerId: -1,
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

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * Composition-time adapter from one or more fixed canonical actor sources to the shared stable-ID
 * scheduler contract. Every object, lookup table, and actor scratch record is allocated here;
 * frame-time reads, steering writes, nourishment, rest, and release paths allocate nothing.
 */
class BigTreeActorSourceAdapter implements BigTreeFaunaSource {
  readonly bigTreeVisitorSlotCount: number;

  private readonly sources: readonly BigTreeActorSource[];
  private readonly sourceBySlot: Int32Array;
  private readonly sourceIndexBySlot: Int32Array;
  private readonly ownerIds: Int32Array;
  private readonly slotByOwnerId = new Map<number, number>();
  private readonly actors: BigTreeFaunaActor[];

  constructor(
    private readonly category: BigTreeFaunaCategory,
    input: BigTreeActorSource | readonly BigTreeActorSource[],
  ) {
    const sources = Array.isArray(input)
      ? Array.from(input as readonly BigTreeActorSource[])
      : [input as BigTreeActorSource];
    if (sources.length === 0) throw new RangeError('canonical fauna binding requires a source');
    this.sources = Object.freeze(sources);

    let count = 0;
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
      const source = sources[sourceIndex];
      if (!source || !Number.isInteger(source.bigTreeActorCount) || source.bigTreeActorCount < 0) {
        throw new TypeError('canonical fauna source must expose a non-negative actor count');
      }
      count += source.bigTreeActorCount;
    }
    if (!Number.isSafeInteger(count)) throw new RangeError('canonical fauna actor count overflow');

    this.bigTreeVisitorSlotCount = count;
    this.sourceBySlot = new Int32Array(count);
    this.sourceIndexBySlot = new Int32Array(count);
    this.ownerIds = new Int32Array(count);
    this.ownerIds.fill(-1);
    this.actors = Array.from({ length: count }, actorScratch);

    let slot = 0;
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
      const source = sources[sourceIndex]!;
      for (let actorIndex = 0; actorIndex < source.bigTreeActorCount; actorIndex++, slot++) {
        const actor = this.actors[slot]!;
        if (!source.readBigTreeActor(actorIndex, actor)) {
          throw new TypeError('canonical fauna source rejected a composition-time actor read');
        }
        if (
          actor.category !== category ||
          !Number.isInteger(actor.ownerId) ||
          actor.ownerId < 0 ||
          actor.ownerId > 0x7fffffff ||
          this.slotByOwnerId.has(actor.ownerId)
        ) {
          throw new RangeError(
            'canonical fauna actors require unique stable 31-bit IDs by category',
          );
        }
        this.sourceBySlot[slot] = sourceIndex;
        this.sourceIndexBySlot[slot] = actorIndex;
        this.ownerIds[slot] = actor.ownerId;
        this.slotByOwnerId.set(actor.ownerId, slot);
      }
    }
  }

  readBigTreeVisitor(slot: number, out: BigTreeFaunaVisitorSample): boolean {
    if (!this.validSlot(slot)) return false;
    const source = this.sources[this.sourceBySlot[slot] ?? -1];
    const actorIndex = this.sourceIndexBySlot[slot] ?? -1;
    if (!source || actorIndex < 0) return false;
    const actor = this.actors[slot]!;
    if (
      !source.readBigTreeActor(actorIndex, actor) ||
      actor.ownerId !== (this.ownerIds[slot] ?? -1) ||
      actor.category !== this.category ||
      !(actor.maxEnergy > 0)
    ) {
      return false;
    }
    const normalizedEnergy = clamp01(actor.energy / actor.maxEnergy);
    const normalizedHealth =
      actor.maxHealth !== undefined && actor.maxHealth > 0 && actor.health !== undefined
        ? clamp01(actor.health / actor.maxHealth)
        : 1;
    out.ownerId = actor.ownerId;
    out.alive = actor.alive;
    out.x = actor.x;
    out.y = actor.y;
    out.z = actor.z;
    out.hunger = 1 - normalizedEnergy;
    out.fatigue = clamp01(actor.fatigue ?? 1 - normalizedEnergy);
    out.healthDeficit = 1 - normalizedHealth;
    out.stress = clamp01(actor.danger ?? 0);
    out.socialNeed = clamp01(actor.socialDrive ?? 0);
    out.curiosity = actor.criticalNeed === true ? 0.15 : 0.45;
    return true;
  }

  setBigTreeVisitorIntent(
    ownerId: number,
    mode: BigTreeFaunaIntentMode,
    targetX: number,
    targetY: number,
    targetZ: number,
  ): boolean {
    const slot = this.slotByOwnerId.get(ownerId);
    if (slot === undefined) return false;
    const source = this.sources[this.sourceBySlot[slot] ?? -1];
    const actorIndex = this.sourceIndexBySlot[slot] ?? -1;
    if (!source || actorIndex < 0) return false;
    if (mode === BigTreeFaunaIntentMode.Normal) {
      return source.setBigTreeActorControlled(actorIndex, false);
    }
    const actor = this.actors[slot]!;
    if (actor.ownerId !== ownerId || actor.category !== this.category || !actor.alive) return false;
    if (!source.setBigTreeActorControlled(actorIndex, true)) return false;

    if (mode === BigTreeFaunaIntentMode.Calm) {
      actor.vx = 0;
      actor.vy = 0;
      actor.vz = 0;
    } else {
      const dx = targetX - actor.x;
      const dy = actor.locomotion === 'flight' ? targetY - actor.y : 0;
      const dz = targetZ - actor.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const speed = Math.max(0, Number.isFinite(actor.moveSpeed) ? (actor.moveSpeed ?? 0) : 0);
      const scale = length > 1e-6 ? speed / length : 0;
      actor.vx = dx * scale;
      actor.vy = dy * scale;
      actor.vz = dz * scale;
    }
    if (source.writeBigTreeActor(actorIndex, actor)) return true;
    source.setBigTreeActorControlled(actorIndex, false);
    return false;
  }

  nourishBigTreeVisitor(ownerId: number, nourishment: number): boolean {
    const slot = this.slotByOwnerId.get(ownerId);
    if (slot === undefined) return false;
    const source = this.sources[this.sourceBySlot[slot] ?? -1];
    const actorIndex = this.sourceIndexBySlot[slot] ?? -1;
    return (
      source !== undefined &&
      actorIndex >= 0 &&
      Number.isFinite(nourishment) &&
      nourishment > 0 &&
      source.nourishBigTreeActor(actorIndex, nourishment / 100)
    );
  }

  restBigTreeVisitor(ownerId: number, dt: number): boolean {
    const slot = this.slotByOwnerId.get(ownerId);
    if (slot === undefined) return false;
    const source = this.sources[this.sourceBySlot[slot] ?? -1];
    const actorIndex = this.sourceIndexBySlot[slot] ?? -1;
    return (
      source !== undefined &&
      actorIndex >= 0 &&
      source.restBigTreeActor !== undefined &&
      source.restBigTreeActor(actorIndex, dt)
    );
  }

  clearBigTreeVisitorIntent(ownerId: number): boolean {
    const slot = this.slotByOwnerId.get(ownerId);
    if (slot === undefined) return false;
    const source = this.sources[this.sourceBySlot[slot] ?? -1];
    const actorIndex = this.sourceIndexBySlot[slot] ?? -1;
    return (
      source !== undefined && actorIndex >= 0 && source.setBigTreeActorControlled(actorIndex, false)
    );
  }

  private validSlot(slot: number): boolean {
    return Number.isInteger(slot) && slot >= 0 && slot < this.bigTreeVisitorSlotCount;
  }
}

/** Bind a canonical indexed fauna source (or fixed composite) into the stable-ID scheduler. */
export function bindBigTreeActorSource(
  ownerKind: BigTreeFaunaOwnerKind,
  category: BigTreeFaunaCategory,
  source: BigTreeActorSource | readonly BigTreeActorSource[],
): BigTreeFaunaBinding {
  const expectedCategory =
    ownerKind === BIG_TREE_OWNER_SHOGGOTH
      ? 'shoggoth'
      : ownerKind === BIG_TREE_OWNER_TITAN
        ? 'titan'
        : ownerKind === BIG_TREE_OWNER_LEVIATHAN
          ? 'leviathan'
          : ownerKind === BIG_TREE_OWNER_PUPPET
            ? 'puppet'
            : ownerKind === BIG_TREE_OWNER_APEX
              ? 'apex'
              : null;
  if (category !== expectedCategory) throw new RangeError('fauna owner kind/category mismatch');
  return bindBigTreeFauna(ownerKind, new BigTreeActorSourceAdapter(category, source));
}

/**
 * Food reservations use a single numeric namespace. Fauna keys are negative and packed far below
 * the Crystal-tree creature range, so they cannot alias the positive ordinary/Xenomimic keys.
 */
export function bigTreeFaunaFoodOwnerId(ownerKind: number, ownerId: number): number {
  if (
    !Number.isInteger(ownerKind) ||
    ownerKind < BIG_TREE_OWNER_SHOGGOTH ||
    ownerKind > 0x7fffffff ||
    !Number.isInteger(ownerId) ||
    ownerId < 0 ||
    ownerId > 0x7fffffff
  ) {
    return Number.NaN;
  }
  const packed = ownerKind * 0x80000000 + ownerId + 1;
  return Number.isSafeInteger(packed) ? -packed : Number.NaN;
}

export interface BigTreeFaunaVisitorConfig {
  /** Maximum candidate snapshots read per poll, regardless of total fauna population. */
  pollBudget?: number;
  pollIntervalSeconds?: number;
  /** Fixed active array capacity; defaults to the shared visit capacity. */
  activeCapacity?: number;
  foodLeaseSeconds?: number;
  foodRetrySeconds?: number;
  foodSearchTimeoutSeconds?: number;
  foodReachRadius?: number;
  socialLeaseSeconds?: number;
  socialReachRadius?: number;
  /** Compatibility-only: canonical actor adapters use each source actor's authored moveSpeed. */
  steeringGain?: number;
  /** Compatibility-only: recovery is delegated to the optional canonical source rest hook. */
  restPerSecond?: number;
  restTarget?: number;
  /** Compatibility-only: canonical flight actors retain their authored Y targets. */
  flightVisitY?: number;
}

export interface BigTreeFaunaVisitorStats {
  activeVisitors: number;
  trackedFauna: number;
  lastPollCount: number;
  totalPolls: number;
  acceptedVisits: number;
  completedMeals: number;
  consumedFruit: number;
  consumedLeaves: number;
  targetLosses: number;
  cancellations: number;
}

export interface BigTreeFaunaVisitorView {
  ownerKind: number;
  ownerId: number;
  state: BigTreeVisitState;
  reason: BigTreeVisitReason;
  activity: BigTreeActivity;
  targetX: number;
  targetY: number;
  targetZ: number;
  foodId: number;
  foodKind: EdibleResourceKind | null;
  foodState: string | null;
  partnerKind: number;
  partnerId: number;
  /** Most recent canonical lifecycle edge, surfaced for development telemetry. */
  lastTransitionCause: BigTreeTransitionCause;
  /** Scaled simulation timestamp for `lastTransitionCause`. */
  lastTransitionAt: number;
}

const NO_OWNER = -1;
const NO_RESOURCE = -1;

/**
 * Generic fixed-fauna visitor scheduler.
 *
 * Lifecycle and cooldowns are canonical `BigTreeVisitManager` state. Food is reserved, consumed,
 * and respawned by the canonical tree registry. This class only holds bounded routing handles needed
 * to connect those systems to the species hooks.
 */
export class BigTreeFaunaVisitors {
  readonly visits: BigTreeVisitManager;
  readonly tree: BigTreeFoodSource;
  readonly bindings: readonly BigTreeFaunaBinding[];

  private readonly pollBudget: number;
  private readonly pollIntervalSeconds: number;
  private readonly foodLeaseSeconds: number;
  private readonly foodRetrySeconds: number;
  private readonly foodSearchTimeoutSeconds: number;
  private readonly foodReachRadiusSquared: number;
  private readonly socialLeaseSeconds: number;
  private readonly socialReachRadiusSquared: number;

  private readonly sourceCursors: Int32Array;
  private readonly sourcePollRemaining: Int32Array;
  private pollSourceIndex = 0;
  private nextPollAt = 0;
  private pollOrdinal = 0;

  private readonly activeBindingIndices: Int32Array;
  private readonly activeSlots: Int32Array;
  private readonly activeOwnerIds: Int32Array;
  private readonly activeFoodOwnerIds: Float64Array;
  private readonly foodReservations: (EdibleReservation | null)[];
  private readonly foodRetryAt: Float64Array;
  private readonly foodMissingSince: Float64Array;
  private readonly targetXs: Float64Array;
  private readonly targetYs: Float64Array;
  private readonly targetZs: Float64Array;
  /** Last canonical source positions; fixed-capacity social matching never scans a full roster. */
  private readonly activeXs: Float64Array;
  private readonly activeYs: Float64Array;
  private readonly activeZs: Float64Array;
  private activeCount = 0;

  /** Event-bounded identity sets make reset/cancel clean cooldown-only manager records too. */
  private readonly trackedOwnerIds: Array<Set<number>>;

  private readonly sample: BigTreeFaunaVisitorSample = {
    ownerId: NO_OWNER,
    alive: false,
    x: 0,
    y: 0,
    z: 0,
    hunger: 0,
    fatigue: 0,
    healthDeficit: 0,
    stress: 0,
    socialNeed: 0,
    curiosity: 0,
  };
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
    activity: BigTreeActivity.Observe,
    utility: 0,
    threshold: 1,
  };
  private readonly visitView: BigTreeVisitView = {
    recordId: NO_BIG_TREE_VISIT,
    ownerKind: 0,
    ownerId: 0,
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

  private lastPollCount = 0;
  private totalPolls = 0;
  private acceptedVisits = 0;
  private completedMeals = 0;
  private consumedFruit = 0;
  private consumedLeaves = 0;
  private targetLosses = 0;
  private cancellations = 0;

  constructor(
    tree: BigTreeFoodSource,
    visits: BigTreeVisitManager,
    inputBindings: readonly (BigTreeFaunaBinding | BigTreeFaunaSourceBinding)[],
    config: BigTreeFaunaVisitorConfig = {},
  ) {
    const bindings: BigTreeFaunaBinding[] = [];
    for (const binding of inputBindings) {
      if ('bigTreeVisitorSlotCount' in binding.source) {
        bindings.push(binding as BigTreeFaunaBinding);
      } else {
        const canonical = binding as BigTreeFaunaSourceBinding;
        bindings.push(
          bindBigTreeActorSource(canonical.ownerKind, canonical.category, canonical.source),
        );
      }
    }
    if (bindings.length === 0) throw new RangeError('at least one fauna binding is required');
    const seenKinds = new Set<number>();
    for (const binding of bindings) {
      if (seenKinds.has(binding.ownerKind))
        throw new RangeError('fauna ownerKind values must be unique');
      seenKinds.add(binding.ownerKind);
    }
    this.tree = tree;
    this.visits = visits;
    this.bindings = Object.freeze(Array.from(bindings));
    this.pollBudget = this.integerAtLeast(config.pollBudget, 24, 1, 'pollBudget');
    this.pollIntervalSeconds = this.positive(
      config.pollIntervalSeconds,
      0.2,
      'pollIntervalSeconds',
    );
    const activeCapacity = this.integerAtLeast(
      config.activeCapacity,
      visits.capacity,
      1,
      'activeCapacity',
    );
    if (activeCapacity > visits.capacity) {
      throw new RangeError('activeCapacity cannot exceed the shared Big Tree visit capacity');
    }
    this.foodLeaseSeconds = this.positive(config.foodLeaseSeconds, 8, 'foodLeaseSeconds');
    this.foodRetrySeconds = this.positive(config.foodRetrySeconds, 0.35, 'foodRetrySeconds');
    this.foodSearchTimeoutSeconds = this.positive(
      config.foodSearchTimeoutSeconds,
      5,
      'foodSearchTimeoutSeconds',
    );
    const foodReachRadius = this.positive(config.foodReachRadius, 4, 'foodReachRadius');
    this.foodReachRadiusSquared = foodReachRadius * foodReachRadius;
    this.socialLeaseSeconds = this.positive(config.socialLeaseSeconds, 2, 'socialLeaseSeconds');
    const socialReachRadius = this.positive(config.socialReachRadius, 72, 'socialReachRadius');
    this.socialReachRadiusSquared = socialReachRadius * socialReachRadius;

    this.sourceCursors = new Int32Array(bindings.length);
    this.sourcePollRemaining = new Int32Array(bindings.length);
    this.activeBindingIndices = new Int32Array(activeCapacity);
    this.activeSlots = new Int32Array(activeCapacity);
    this.activeOwnerIds = new Int32Array(activeCapacity);
    this.activeFoodOwnerIds = new Float64Array(activeCapacity);
    this.activeFoodOwnerIds.fill(Number.NaN);
    this.foodReservations = Array.from<EdibleReservation | null>({ length: activeCapacity }).fill(
      null,
    );
    this.foodRetryAt = new Float64Array(activeCapacity);
    this.foodMissingSince = new Float64Array(activeCapacity);
    this.foodMissingSince.fill(Number.POSITIVE_INFINITY);
    this.targetXs = new Float64Array(activeCapacity);
    this.targetYs = new Float64Array(activeCapacity);
    this.targetZs = new Float64Array(activeCapacity);
    this.activeXs = new Float64Array(activeCapacity);
    this.activeYs = new Float64Array(activeCapacity);
    this.activeZs = new Float64Array(activeCapacity);
    this.trackedOwnerIds = bindings.map(() => new Set<number>());
  }

  get activeVisitors(): number {
    return this.activeCount;
  }

  /** Advance from the same scaled simulation clock used by the Crystal food source. */
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

  /** Lifecycle hook for portal death, despawn, or source-owned teardown. */
  cancel(ownerKind: number, ownerId: number): boolean {
    const bindingIndex = this.bindingIndexOf(ownerKind);
    if (bindingIndex < 0 || !Number.isInteger(ownerId) || ownerId < 0) return false;
    const activeIndex = this.activeIndexOf(ownerKind, ownerId);
    const existed =
      activeIndex >= 0 ||
      this.trackedOwnerIds[bindingIndex]!.has(ownerId) ||
      this.visits.stateOf(ownerKind, ownerId) !== BigTreeVisitState.Outside;
    if (activeIndex >= 0) this.removeActive(activeIndex, true);
    else {
      this.bindings[bindingIndex]!.source.clearBigTreeVisitorIntent(ownerId);
      this.visits.cancelActor(ownerKind, ownerId);
    }
    this.trackedOwnerIds[bindingIndex]!.delete(ownerId);
    if (existed) this.cancellations++;
    return existed;
  }

  /** Release all fauna food/intents and only this adapter's visit records. Authored slots survive. */
  reset(): void {
    while (this.activeCount > 0) this.removeActive(this.activeCount - 1, true);
    for (let bindingIndex = 0; bindingIndex < this.bindings.length; bindingIndex++) {
      const binding = this.bindings[bindingIndex]!;
      const tracked = this.trackedOwnerIds[bindingIndex]!;
      for (const ownerId of tracked) {
        binding.source.clearBigTreeVisitorIntent(ownerId);
        this.visits.cancelActor(binding.ownerKind, ownerId);
      }
      tracked.clear();
    }
    this.sourceCursors.fill(0);
    this.sourcePollRemaining.fill(0);
    this.pollSourceIndex = 0;
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
    let tracked = 0;
    for (const owners of this.trackedOwnerIds) tracked += owners.size;
    out.activeVisitors = this.activeCount;
    out.trackedFauna = tracked;
    out.lastPollCount = this.lastPollCount;
    out.totalPolls = this.totalPolls;
    out.acceptedVisits = this.acceptedVisits;
    out.completedMeals = this.completedMeals;
    out.consumedFruit = this.consumedFruit;
    out.consumedLeaves = this.consumedLeaves;
    out.targetLosses = this.targetLosses;
    out.cancellations = this.cancellations;
  }

  /** Development-only caller-owned view; O(capacity), never used by the frame scheduler. */
  readVisitor(ownerKind: number, ownerId: number, out: BigTreeFaunaVisitorView): boolean {
    const index = this.activeIndexOf(ownerKind, ownerId);
    if (index < 0 || !this.visits.readVisit(ownerKind, ownerId, this.visitView)) return false;
    const reservation = this.foodReservations[index];
    const resource = reservation ? this.tree.edibleResources.get(reservation.id) : undefined;
    out.ownerKind = ownerKind;
    out.ownerId = ownerId;
    out.state = this.visitView.state;
    out.reason = this.visitView.reason;
    out.activity = this.visitView.activity;
    out.targetX = this.targetXs[index] ?? 0;
    out.targetY = this.targetYs[index] ?? 0;
    out.targetZ = this.targetZs[index] ?? 0;
    out.foodId = reservation?.id ?? NO_RESOURCE;
    out.foodKind = resource?.kind ?? null;
    out.foodState = resource?.state ?? null;
    out.partnerKind = this.visitView.partnerKind;
    out.partnerId = this.visitView.partnerId;
    out.lastTransitionCause = this.visitView.lastTransitionCause;
    out.lastTransitionAt = this.visitView.lastTransitionAt;
    return true;
  }

  private pollCandidates(
    now: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    this.lastPollCount = 0;
    if (now < this.nextPollAt) return;
    this.nextPollAt = now + this.pollIntervalSeconds;
    let remainingTotal = 0;
    for (let index = 0; index < this.bindings.length; index++) {
      const count = Math.max(0, this.bindings[index]!.source.bigTreeVisitorSlotCount);
      const remaining = Math.min(count, this.pollBudget);
      this.sourcePollRemaining[index] = remaining;
      remainingTotal += remaining;
    }
    while (this.lastPollCount < this.pollBudget && remainingTotal > 0) {
      const bindingIndex = this.nextPollableBinding();
      if (bindingIndex < 0) break;
      const binding = this.bindings[bindingIndex]!;
      const count = binding.source.bigTreeVisitorSlotCount;
      if (count <= 0) {
        this.sourcePollRemaining[bindingIndex] = 0;
        continue;
      }
      const slot = (this.sourceCursors[bindingIndex] ?? 0) % count;
      this.sourceCursors[bindingIndex] = (slot + 1) % count;
      this.sourcePollRemaining[bindingIndex] = (this.sourcePollRemaining[bindingIndex] ?? 0) - 1;
      remainingTotal--;
      this.lastPollCount++;
      this.totalPolls++;
      this.pollOrdinal = (this.pollOrdinal + 1) >>> 0;
      this.consider(bindingIndex, slot, now, environment);
    }
  }

  private nextPollableBinding(): number {
    for (let checked = 0; checked < this.bindings.length; checked++) {
      const index = this.pollSourceIndex;
      this.pollSourceIndex = (this.pollSourceIndex + 1) % this.bindings.length;
      if ((this.sourcePollRemaining[index] ?? 0) > 0) return index;
    }
    return -1;
  }

  private consider(
    bindingIndex: number,
    slot: number,
    now: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    const binding = this.bindings[bindingIndex]!;
    if (!binding.source.readBigTreeVisitor(slot, this.sample) || !this.validSample(this.sample)) {
      return;
    }
    const ownerId = this.sample.ownerId;
    let visitState = this.visits.stateOf(binding.ownerKind, ownerId);
    if (visitState === BigTreeVisitState.Cooldown) {
      visitState = this.visits.updatePosition(
        binding.ownerKind,
        ownerId,
        this.sample.x,
        this.sample.z,
        now,
      );
    }
    if (!this.sample.alive || visitState !== BigTreeVisitState.Outside) {
      return;
    }
    this.fillContext(binding.ownerKind, ownerId, environment);
    // Fixed fauna can wander into the sanctuary under their canonical controller without first
    // winning an optional utility draw. Adopt that real entry as a truthful Safety/Observe visit so
    // it receives the same bounded dwell, departure, and cooldown lifecycle as planned visitors.
    let visitId = this.visits.requestContextualVisit(
      binding.ownerKind,
      ownerId,
      this.pollOrdinal,
      this.context,
      this.decision,
      now,
      this.sample.x,
      this.sample.z,
    );
    if (
      visitId === NO_BIG_TREE_VISIT &&
      this.visits.zone.contains(this.sample.x, this.sample.z, false)
    ) {
      visitId = this.visits.requestVisit(
        binding.ownerKind,
        ownerId,
        BigTreeVisitReason.Safety,
        now,
        this.sample.x,
        this.sample.z,
      );
    }
    if (visitId === NO_BIG_TREE_VISIT) return;
    if (this.activeCount >= this.activeOwnerIds.length) {
      this.visits.cancelActor(binding.ownerKind, ownerId);
      return;
    }
    const index = this.activeCount++;
    this.activeBindingIndices[index] = bindingIndex;
    this.activeSlots[index] = slot;
    this.activeOwnerIds[index] = ownerId;
    this.activeFoodOwnerIds[index] = bigTreeFaunaFoodOwnerId(binding.ownerKind, ownerId);
    this.foodReservations[index] = null;
    this.foodRetryAt[index] = now;
    this.foodMissingSince[index] = Number.POSITIVE_INFINITY;
    this.targetXs[index] = this.visits.zone.centerX;
    this.targetYs[index] = this.sample.y;
    this.targetZs[index] = this.visits.zone.centerZ;
    this.activeXs[index] = this.sample.x;
    this.activeYs[index] = this.sample.y;
    this.activeZs[index] = this.sample.z;
    this.trackedOwnerIds[bindingIndex]!.add(ownerId);
    this.acceptedVisits++;
    if (this.visits.readVisit(binding.ownerKind, ownerId, this.visitView)) {
      if (this.visitView.reason === BigTreeVisitReason.Food) this.acquireFood(index, now);
      // Commit travel intent in the same scheduling tick as the visit record. The World drives NHI
      // cognition before this adapter, so this closes the only gap in which the next frame's ambient
      // roam/hunt could otherwise run after a visit had already been accepted.
      if (
        this.visitView.slotId !== NO_BIG_TREE_SLOT &&
        this.visits.readSlot(this.visitView.slotId, this.slotView)
      ) {
        this.setIntent(
          index,
          BigTreeFaunaIntentMode.Travel,
          this.slotView.x,
          this.sample.y,
          this.slotView.z,
        );
      }
    }
  }

  /** Returns true when swap-removal requires the caller to process the same index again. */
  private updateActive(index: number, now: number, dt: number): boolean {
    const bindingIndex = this.activeBindingIndices[index] ?? -1;
    const binding = this.bindings[bindingIndex];
    const slot = this.activeSlots[index] ?? -1;
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    if (
      !binding ||
      !binding.source.readBigTreeVisitor(slot, this.sample) ||
      !this.validSample(this.sample) ||
      !this.sample.alive ||
      this.sample.ownerId !== ownerId
    ) {
      this.removeActive(index, true);
      this.cancellations++;
      return true;
    }
    this.activeXs[index] = this.sample.x;
    this.activeYs[index] = this.sample.y;
    this.activeZs[index] = this.sample.z;

    const state = this.visits.updatePosition(
      binding.ownerKind,
      ownerId,
      this.sample.x,
      this.sample.z,
      now,
    );
    if (state === BigTreeVisitState.Outside) {
      this.removeActive(index, false);
      return true;
    }
    if (state === BigTreeVisitState.Cooldown) {
      if (!this.visits.zone.contains(this.sample.x, this.sample.z, true)) {
        this.removeActive(index, false);
        return true;
      }
      // The lifecycle deadline has fired, but dropping the source intent here would allow an
      // immobile protected camper. Retain bounded adapter ownership and keep asking the canonical
      // controller for a calm radial exit until the body crosses the outer hysteresis boundary.
      this.setEgressIntent(index, binding.ownerKind, ownerId);
      this.releaseFood(index);
      return false;
    }
    if (!this.visits.readVisit(binding.ownerKind, ownerId, this.visitView)) {
      this.removeActive(index, false);
      return true;
    }

    if (state === BigTreeVisitState.Travelling) {
      if (
        this.visitView.slotId === NO_BIG_TREE_SLOT ||
        !this.visits.readSlot(this.visitView.slotId, this.slotView)
      ) {
        this.removeActive(index, true);
        return true;
      }
      const reservation = this.foodReservations[index];
      const resource = reservation ? this.tree.edibleResources.get(reservation.id) : undefined;
      this.setIntent(
        index,
        BigTreeFaunaIntentMode.Travel,
        this.slotView.x,
        resource?.interactionY ?? this.sample.y,
        this.slotView.z,
      );
      if (this.visitView.reason === BigTreeVisitReason.Food) this.maintainFood(index, now);
      return false;
    }

    if (state === BigTreeVisitState.Leaving) {
      this.setEgressIntent(index, binding.ownerKind, ownerId);
      this.releaseFood(index);
      return false;
    }

    if (this.visitView.activity === BigTreeActivity.Eat) {
      this.updateFoodActivity(index, now);
    } else if (this.visitView.activity === BigTreeActivity.Rest) {
      binding.source.restBigTreeVisitor?.(ownerId, dt);
      this.setIntent(
        index,
        BigTreeFaunaIntentMode.Calm,
        this.sample.x,
        this.sample.y,
        this.sample.z,
      );
    } else if (this.visitView.activity === BigTreeActivity.Socialize) {
      const partnerIndex = this.activeIndexOf(this.visitView.partnerKind, this.visitView.partnerId);
      if (partnerIndex >= 0 && this.socialPairWithinReach(index, partnerIndex)) {
        this.setIntent(
          index,
          BigTreeFaunaIntentMode.Social,
          this.activeXs[partnerIndex] ?? this.sample.x,
          this.activeYs[partnerIndex] ?? this.sample.y,
          this.activeZs[partnerIndex] ?? this.sample.z,
        );
      } else {
        if (this.visitView.partnerKind !== NO_OWNER) {
          this.visits.releasePartner(binding.ownerKind, ownerId);
        }
        this.setIntent(
          index,
          BigTreeFaunaIntentMode.Calm,
          this.sample.x,
          this.sample.y,
          this.sample.z,
        );
      }
    } else {
      this.setIntent(
        index,
        BigTreeFaunaIntentMode.Calm,
        this.sample.x,
        this.sample.y,
        this.sample.z,
      );
    }
    return false;
  }

  /**
   * Pair willing active fauna through a capacity-bounded cached search. The canonical visit manager
   * owns the reciprocal lease, timeout, snapshot, and cancellation semantics; this adapter supplies
   * live 3D reachability across every bound canonical fauna or NHI source.
   */
  private matchSocialPartners(now: number): void {
    // Each source was already sampled exactly once by updateActive(). Pair only from those
    // fixed-capacity numeric caches: adapter reads remain O(active), while exhaustive pair checks
    // are bounded by the authored shared visit capacity and cannot miss a later compatible peer.
    for (let first = 0; first < this.activeCount; first++) {
      const firstBinding = this.bindings[this.activeBindingIndices[first] ?? -1];
      const firstOwnerId = this.activeOwnerIds[first] ?? NO_OWNER;
      if (
        !firstBinding ||
        !this.visits.readVisit(firstBinding.ownerKind, firstOwnerId, this.visitView)
      ) {
        continue;
      }
      if (
        this.visitView.state !== BigTreeVisitState.Active ||
        this.visitView.activity !== BigTreeActivity.Socialize
      ) {
        continue;
      }
      if (this.visitView.partnerKind !== NO_OWNER) {
        const partnerIndex = this.activeIndexOf(
          this.visitView.partnerKind,
          this.visitView.partnerId,
        );
        if (partnerIndex < 0 || !this.socialPairWithinReach(first, partnerIndex)) {
          this.visits.releasePartner(firstBinding.ownerKind, firstOwnerId);
          continue;
        }
        this.visits.reservePartner(
          firstBinding.ownerKind,
          firstOwnerId,
          this.visitView.partnerKind,
          this.visitView.partnerId,
          now,
          true,
          this.socialLeaseSeconds,
        );
        continue;
      }

      for (let second = first + 1; second < this.activeCount; second++) {
        const secondBinding = this.bindings[this.activeBindingIndices[second] ?? -1];
        const secondOwnerId = this.activeOwnerIds[second] ?? NO_OWNER;
        if (
          !secondBinding ||
          !this.socialPairWithinReach(first, second) ||
          !this.visits.readVisit(secondBinding.ownerKind, secondOwnerId, this.visitView) ||
          this.visitView.state !== BigTreeVisitState.Active ||
          this.visitView.activity !== BigTreeActivity.Socialize ||
          this.visitView.partnerKind !== NO_OWNER
        ) {
          continue;
        }
        if (
          this.visits.reservePartner(
            firstBinding.ownerKind,
            firstOwnerId,
            secondBinding.ownerKind,
            secondOwnerId,
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

  private socialPairWithinReach(firstIndex: number, secondIndex: number): boolean {
    const dx = (this.activeXs[firstIndex] ?? 0) - (this.activeXs[secondIndex] ?? 0);
    const dy = (this.activeYs[firstIndex] ?? 0) - (this.activeYs[secondIndex] ?? 0);
    const dz = (this.activeZs[firstIndex] ?? 0) - (this.activeZs[secondIndex] ?? 0);
    return dx * dx + dy * dy + dz * dz <= this.socialReachRadiusSquared;
  }

  private updateFoodActivity(index: number, now: number): void {
    if (!this.maintainFood(index, now)) return;
    const reservation = this.foodReservations[index];
    if (reservation == null) return;
    const resource = this.tree.edibleResources.get(reservation.id);
    if (!this.resourceMatches(resource, reservation)) {
      this.loseFood(index, now);
      return;
    }
    this.setIntent(
      index,
      BigTreeFaunaIntentMode.Travel,
      resource.interactionX,
      resource.interactionY,
      resource.interactionZ,
    );
    const dx = this.sample.x - resource.interactionX;
    const dy = this.sample.y - resource.interactionY;
    const dz = this.sample.z - resource.interactionZ;
    if (dx * dx + dy * dy + dz * dz > this.foodReachRadiusSquared) return;
    if (!this.tree.beginFoodConsumption(reservation)) {
      this.loseFood(index, now);
      return;
    }
    this.foodReservations[index] = null;
    const nourishment = this.tree.completeFoodConsumption(reservation);
    if (!(nourishment > 0)) {
      this.loseFood(index, now);
      return;
    }
    const bindingIndex = this.activeBindingIndices[index] ?? -1;
    const binding = this.bindings[bindingIndex];
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    if (binding) binding.source.nourishBigTreeVisitor(ownerId, nourishment);
    this.completedMeals++;
    if (resource.kind === 'fruit') this.consumedFruit++;
    else this.consumedLeaves++;
    if (binding) this.visits.finishActivity(binding.ownerKind, ownerId, now);
  }

  private maintainFood(index: number, now: number): boolean {
    const reservation = this.foodReservations[index];
    if (reservation != null) {
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
      Number.isFinite(this.foodMissingSince[index]) &&
      now - (this.foodMissingSince[index] ?? now) >= this.foodSearchTimeoutSeconds
    ) {
      const bindingIndex = this.activeBindingIndices[index] ?? -1;
      const binding = this.bindings[bindingIndex];
      if (binding) {
        this.visits.finishActivity(binding.ownerKind, this.activeOwnerIds[index] ?? NO_OWNER, now);
      }
    }
    return false;
  }

  private acquireFood(index: number, now: number): boolean {
    const foodOwnerId = this.activeFoodOwnerIds[index] ?? Number.NaN;
    if (!Number.isSafeInteger(foodOwnerId)) return false;
    const bindingIndex = this.activeBindingIndices[index] ?? 0;
    const binding = this.bindings[bindingIndex];
    const ownerId = this.activeOwnerIds[index] ?? 0;
    const preferred: EdibleResourceKind =
      binding && this.hashUnit(binding.ownerKind, ownerId, 0x4f1bbcdc) >= 0.45 ? 'fruit' : 'leaf';
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
    const reservation = this.foodReservations[index];
    if (reservation != null) this.tree.cancelFood(reservation);
    this.foodReservations[index] = null;
    this.foodRetryAt[index] = now + this.foodRetrySeconds;
    if (!Number.isFinite(this.foodMissingSince[index])) this.foodMissingSince[index] = now;
    this.targetLosses++;
  }

  private releaseFood(index: number): void {
    const reservation = this.foodReservations[index];
    if (reservation != null) this.tree.cancelFood(reservation);
    this.foodReservations[index] = null;
    this.foodMissingSince[index] = Number.POSITIVE_INFINITY;
  }

  private setIntent(
    index: number,
    mode: BigTreeFaunaIntentMode,
    targetX: number,
    targetY: number,
    targetZ: number,
  ): void {
    const binding = this.bindings[this.activeBindingIndices[index] ?? -1];
    if (!binding) return;
    this.targetXs[index] = targetX;
    this.targetYs[index] = targetY;
    this.targetZs[index] = targetZ;
    binding.source.setBigTreeVisitorIntent(
      this.activeOwnerIds[index] ?? NO_OWNER,
      mode,
      targetX,
      targetY,
      targetZ,
    );
  }

  /** Shortest deterministic horizontal egress; the hash only resolves the exact-centre ambiguity. */
  private setEgressIntent(index: number, ownerKind: number, ownerId: number): void {
    let dx = this.sample.x - this.visits.zone.centerX;
    let dz = this.sample.z - this.visits.zone.centerZ;
    let length = Math.sqrt(dx * dx + dz * dz);
    if (length <= 1e-6) {
      const angle = this.hashUnit(ownerKind, ownerId, 0x7f4a7c15) * Math.PI * 2;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      length = 1;
    }
    const radius = this.visits.zone.exitRadius + 24;
    this.setIntent(
      index,
      BigTreeFaunaIntentMode.Travel,
      this.visits.zone.centerX + (dx / length) * radius,
      this.sample.y,
      this.visits.zone.centerZ + (dz / length) * radius,
    );
  }

  private removeActive(index: number, cancelVisit: boolean): void {
    const bindingIndex = this.activeBindingIndices[index] ?? -1;
    const binding = this.bindings[bindingIndex];
    const ownerId = this.activeOwnerIds[index] ?? NO_OWNER;
    this.releaseFood(index);
    if (binding) {
      binding.source.clearBigTreeVisitorIntent(ownerId);
      if (cancelVisit) {
        this.visits.cancelActor(binding.ownerKind, ownerId);
        this.trackedOwnerIds[bindingIndex]!.delete(ownerId);
      }
    }

    const last = --this.activeCount;
    if (index !== last) {
      this.activeBindingIndices[index] = this.activeBindingIndices[last] ?? -1;
      this.activeSlots[index] = this.activeSlots[last] ?? -1;
      this.activeOwnerIds[index] = this.activeOwnerIds[last] ?? NO_OWNER;
      this.activeFoodOwnerIds[index] = this.activeFoodOwnerIds[last] ?? Number.NaN;
      this.foodReservations[index] = this.foodReservations[last] ?? null;
      this.foodRetryAt[index] = this.foodRetryAt[last] ?? 0;
      this.foodMissingSince[index] = this.foodMissingSince[last] ?? Number.POSITIVE_INFINITY;
      this.targetXs[index] = this.targetXs[last] ?? 0;
      this.targetYs[index] = this.targetYs[last] ?? 0;
      this.targetZs[index] = this.targetZs[last] ?? 0;
      this.activeXs[index] = this.activeXs[last] ?? 0;
      this.activeYs[index] = this.activeYs[last] ?? 0;
      this.activeZs[index] = this.activeZs[last] ?? 0;
    }
    this.activeBindingIndices[last] = -1;
    this.activeSlots[last] = -1;
    this.activeOwnerIds[last] = NO_OWNER;
    this.activeFoodOwnerIds[last] = Number.NaN;
    this.foodReservations[last] = null;
    this.foodRetryAt[last] = 0;
    this.foodMissingSince[last] = Number.POSITIVE_INFINITY;
    this.targetXs[last] = 0;
    this.targetYs[last] = 0;
    this.targetZs[last] = 0;
    this.activeXs[last] = 0;
    this.activeYs[last] = 0;
    this.activeZs[last] = 0;
  }

  private fillContext(
    ownerKind: number,
    ownerId: number,
    environment: Readonly<BigTreeVisitorEnvironment> | undefined,
  ): void {
    const dx = this.sample.x - this.visits.zone.centerX;
    const dy = this.sample.y;
    const dz = this.sample.z - this.visits.zone.centerZ;
    this.context.hunger = this.clamp01(this.sample.hunger);
    this.context.fatigue = this.clamp01(this.sample.fatigue);
    this.context.healthDeficit = this.clamp01(this.sample.healthDeficit);
    this.context.stress = Math.max(
      this.clamp01(this.sample.stress),
      this.clamp01(environment?.stress ?? 0),
    );
    this.context.socialNeed = Math.max(
      this.clamp01(this.sample.socialNeed),
      this.clamp01(environment?.socialNeed ?? 0),
    );
    this.context.curiosity = Math.max(
      this.clamp01(this.sample.curiosity),
      this.clamp01(environment?.curiosity ?? 0),
    );
    this.context.danger = this.clamp01(environment?.danger ?? 0);
    this.context.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.context.routeAvailable = true;
    this.context.foodAvailable = environment?.foodAvailable !== false;
    this.context.recentVisit = 0;
    this.context.personality = this.hashUnit(ownerKind, ownerId, 0x9e3779b9);
    this.context.simulationLoad = this.clamp01(environment?.simulationLoad ?? 0);
  }

  private validSample(sample: BigTreeFaunaVisitorSample): boolean {
    return (
      Number.isInteger(sample.ownerId) &&
      sample.ownerId >= 0 &&
      sample.ownerId <= 0x7fffffff &&
      Number.isFinite(sample.x) &&
      Number.isFinite(sample.y) &&
      Number.isFinite(sample.z)
    );
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

  private bindingIndexOf(ownerKind: number): number {
    for (let index = 0; index < this.bindings.length; index++) {
      if (this.bindings[index]!.ownerKind === ownerKind) return index;
    }
    return -1;
  }

  private activeIndexOf(ownerKind: number, ownerId: number): number {
    for (let index = 0; index < this.activeCount; index++) {
      const binding = this.bindings[this.activeBindingIndices[index] ?? -1];
      if (binding?.ownerKind === ownerKind && this.activeOwnerIds[index] === ownerId) return index;
    }
    return -1;
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
}
