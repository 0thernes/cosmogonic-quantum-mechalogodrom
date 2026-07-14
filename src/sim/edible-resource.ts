/**
 * Deterministic pooled resources for discrete food such as Big Tree fruit and leaves.
 *
 * The registry owns a fixed set of resource records. Consumption never allocates a replacement:
 * the consumed slot becomes unavailable immediately and the same slot is restored after exactly
 * five seconds of caller-supplied simulation time. The caller is responsible for passing the
 * world's scaled simulation clock; this module intentionally uses no wall clock or timer API.
 */

export const EDIBLE_RESOURCE_RESPAWN_SECONDS = 5;

export type EdibleResourceKind = 'fruit' | 'leaf';

export type EdibleResourceState = 'available' | 'reserved' | 'consuming' | 'respawning';

export interface EdibleResourcePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface EdibleResourceDefinition {
  /** Stable numeric identity. IDs must be unique safe integers. */
  readonly id: number;
  readonly kind: EdibleResourceKind;
  readonly position: EdibleResourcePoint;
  /** Reachable point used by navigation; defaults to `position`. */
  readonly interactionPoint?: EdibleResourcePoint;
  /** Positive energy/nutrition award returned by successful consumption. */
  readonly nourishment: number;
}

/** Read-only view of one stable pooled resource record. */
export interface EdibleResource {
  readonly id: number;
  readonly kind: EdibleResourceKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly interactionX: number;
  readonly interactionY: number;
  readonly interactionZ: number;
  readonly nourishment: number;
  readonly state: EdibleResourceState;
  readonly ownerId: number | null;
  readonly leaseUntil: number;
  readonly respawnAt: number;
  /** Changes whenever a slot becomes available again, invalidating stale reservations. */
  readonly generation: number;
}

export interface EdibleReservation {
  readonly id: number;
  readonly generation: number;
  readonly ownerId: number;
  readonly leaseUntil: number;
}

export type EdibleResourceLifecyclePhase = 'unavailable' | 'restore' | 'available';

/**
 * Optional bridge for render/collision state.
 *
 * `onRestore` runs while the resource is still `respawning`. Only after it returns successfully
 * does the registry publish the resource as `available` and call `onAvailable`. A failed restore
 * leaves the item unavailable and queued for a deterministic retry on the next `update` call.
 * Callbacks must not re-enter registry mutation methods.
 */
export interface EdibleResourceVisualLifecycle {
  onUnavailable?(resource: EdibleResource): void;
  onRestore?(resource: EdibleResource): void;
  onAvailable?(resource: EdibleResource): void;
  onError?(error: unknown, phase: EdibleResourceLifecyclePhase, resource: EdibleResource): void;
}

export interface EdibleResourceStats {
  readonly capacity: number;
  readonly available: number;
  readonly reserved: number;
  readonly consuming: number;
  readonly respawning: number;
  readonly pendingLeases: number;
  readonly pendingRespawns: number;
  readonly lifecycleErrors: number;
}

interface MutableEdibleResource {
  id: number;
  kind: EdibleResourceKind;
  x: number;
  y: number;
  z: number;
  interactionX: number;
  interactionY: number;
  interactionZ: number;
  nourishment: number;
  state: EdibleResourceState;
  ownerId: number | null;
  leaseUntil: number;
  respawnAt: number;
  generation: number;
}

type HeapOrder = (leftIndex: number, rightIndex: number) => boolean;

/** Fixed-capacity indexed min-heap: each resource can occur at most once. */
class IndexedMinHeap {
  private readonly heap: Int32Array;
  private readonly position: Int32Array;
  private readonly comesBefore: HeapOrder;
  private count = 0;

  constructor(capacity: number, comesBefore: HeapOrder) {
    this.heap = new Int32Array(capacity);
    this.heap.fill(-1);
    this.position = new Int32Array(capacity);
    this.position.fill(-1);
    this.comesBefore = comesBefore;
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.count = 0;
    this.heap.fill(-1);
    this.position.fill(-1);
  }

  peek(): number {
    return this.count === 0 ? -1 : this.heap[0]!;
  }

  insert(index: number): boolean {
    if (this.position[index]! >= 0) return false;
    const slot = this.count++;
    this.heap[slot] = index;
    this.position[index] = slot;
    this.siftUp(slot);
    return true;
  }

  remove(index: number): boolean {
    const slot = this.position[index]!;
    if (slot < 0) return false;

    const lastSlot = --this.count;
    const lastIndex = this.heap[lastSlot]!;
    this.heap[lastSlot] = -1;
    this.position[index] = -1;
    if (slot === lastSlot) return true;

    this.heap[slot] = lastIndex;
    this.position[lastIndex] = slot;
    if (!this.siftUp(slot)) this.siftDown(slot);
    return true;
  }

  pop(): number {
    const index = this.peek();
    if (index >= 0) this.remove(index);
    return index;
  }

  fix(index: number): void {
    const slot = this.position[index]!;
    if (slot < 0) return;
    if (!this.siftUp(slot)) this.siftDown(slot);
  }

  private siftUp(initialSlot: number): boolean {
    let slot = initialSlot;
    let moved = false;
    while (slot > 0) {
      const parent = (slot - 1) >> 1;
      const index = this.heap[slot]!;
      const parentIndex = this.heap[parent]!;
      if (!this.comesBefore(index, parentIndex)) break;
      this.swap(slot, parent);
      slot = parent;
      moved = true;
    }
    return moved;
  }

  private siftDown(initialSlot: number): void {
    let slot = initialSlot;
    for (;;) {
      const left = slot * 2 + 1;
      if (left >= this.count) return;
      const right = left + 1;
      let next = left;
      if (right < this.count && this.comesBefore(this.heap[right]!, this.heap[left]!)) {
        next = right;
      }
      if (!this.comesBefore(this.heap[next]!, this.heap[slot]!)) return;
      this.swap(slot, next);
      slot = next;
    }
  }

  private swap(leftSlot: number, rightSlot: number): void {
    const leftIndex = this.heap[leftSlot]!;
    const rightIndex = this.heap[rightSlot]!;
    this.heap[leftSlot] = rightIndex;
    this.heap[rightSlot] = leftIndex;
    this.position[leftIndex] = rightSlot;
    this.position[rightIndex] = leftSlot;
  }
}

const AVAILABLE = 0;
const RESERVED = 1;
const CONSUMING = 2;
const RESPAWNING = 3;

function stateSlot(state: EdibleResourceState): number {
  switch (state) {
    case 'available':
      return AVAILABLE;
    case 'reserved':
      return RESERVED;
    case 'consuming':
      return CONSUMING;
    case 'respawning':
      return RESPAWNING;
  }
}

function kindSlot(kind: EdibleResourceKind): number {
  return kind === 'fruit' ? 0 : 1;
}

function assertFiniteAtLeast(name: string, value: number, minimum: number): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} must be a finite number >= ${minimum}`);
  }
}

function assertOwner(ownerId: number): void {
  if (!Number.isSafeInteger(ownerId)) {
    throw new TypeError('ownerId must be a safe integer');
  }
}

/**
 * Fixed-capacity registry for race-safe discrete food.
 *
 * Available slots live in deterministic per-kind doubly linked free lists. Selecting and removing
 * a free resource is O(1); deadline insertion/removal is O(log capacity) in fixed indexed heaps.
 */
export class EdibleResourceRegistry {
  private readonly items: MutableEdibleResource[];
  private readonly indexById: ReadonlyMap<number, number>;
  /** ownerId → indices of live reserved/consuming claims; keeps releaseOwner O(claims held). */
  private readonly ownerClaims = new Map<number, Set<number>>();
  /** Reused scratch for restore failures deferred within one update() drain. */
  private readonly restoreDeferred: number[] = [];
  private readonly lifecycle: EdibleResourceVisualLifecycle;
  private readonly freePrevious: Int32Array;
  private readonly freeNext: Int32Array;
  private readonly freeListed: Uint8Array;
  private readonly freeHead = new Int32Array(2);
  private readonly freeTail = new Int32Array(2);
  private readonly counts = new Int32Array(4);
  private readonly leaseHeap: IndexedMinHeap;
  private readonly respawnHeap: IndexedMinHeap;
  private lifecycleErrorCount = 0;

  constructor(
    definitions: readonly EdibleResourceDefinition[],
    lifecycle: EdibleResourceVisualLifecycle = {},
  ) {
    this.lifecycle = lifecycle;
    this.items = [];
    const mutableIndexById = new Map<number, number>();
    this.indexById = mutableIndexById;
    this.freePrevious = new Int32Array(definitions.length);
    this.freePrevious.fill(-1);
    this.freeNext = new Int32Array(definitions.length);
    this.freeNext.fill(-1);
    this.freeListed = new Uint8Array(definitions.length);
    this.freeHead.fill(-1);
    this.freeTail.fill(-1);

    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index]!;
      this.validateDefinition(definition, mutableIndexById);
      const interaction = definition.interactionPoint ?? definition.position;
      const resource: MutableEdibleResource = {
        id: definition.id,
        kind: definition.kind,
        x: definition.position.x,
        y: definition.position.y,
        z: definition.position.z,
        interactionX: interaction.x,
        interactionY: interaction.y,
        interactionZ: interaction.z,
        nourishment: definition.nourishment,
        state: 'available',
        ownerId: null,
        leaseUntil: 0,
        respawnAt: 0,
        generation: 1,
      };
      this.items[index] = resource;
      mutableIndexById.set(resource.id, index);
      this.counts[AVAILABLE] = this.counts[AVAILABLE]! + 1;
      this.appendFree(index);
    }

    const orderedByLease = (leftIndex: number, rightIndex: number): boolean => {
      const left = this.items[leftIndex]!;
      const right = this.items[rightIndex]!;
      return (
        left.leaseUntil < right.leaseUntil ||
        (left.leaseUntil === right.leaseUntil && left.id < right.id)
      );
    };
    const orderedByRespawn = (leftIndex: number, rightIndex: number): boolean => {
      const left = this.items[leftIndex]!;
      const right = this.items[rightIndex]!;
      return (
        left.respawnAt < right.respawnAt ||
        (left.respawnAt === right.respawnAt && left.id < right.id)
      );
    };
    this.leaseHeap = new IndexedMinHeap(definitions.length, orderedByLease);
    this.respawnHeap = new IndexedMinHeap(definitions.length, orderedByRespawn);
  }

  get capacity(): number {
    return this.items.length;
  }

  /** The same fixed backing array and resource objects are returned for the registry lifetime. */
  get all(): readonly EdibleResource[] {
    return this.items;
  }

  get(resourceId: number): EdibleResource | undefined {
    const index = this.indexById.get(resourceId);
    return index === undefined ? undefined : this.items[index];
  }

  /**
   * Reserves the next deterministic free slot. Free-list selection is O(1).
   * Due leases are first retired in deadline order.
   */
  reserveAny(
    ownerId: number,
    now: number,
    leaseSeconds: number,
    kind?: EdibleResourceKind,
  ): EdibleReservation | null {
    this.validateLeaseRequest(ownerId, now, leaseSeconds);
    this.expireLeases(now);
    const index = kind === undefined ? this.nextAnyFree() : this.freeHead[kindSlot(kind)]!;
    return index < 0 ? null : this.reserveIndex(index, ownerId, now + leaseSeconds);
  }

  /** Reserves a known resource without scanning the pool. */
  reserveById(
    resourceId: number,
    ownerId: number,
    now: number,
    leaseSeconds: number,
  ): EdibleReservation | null {
    this.validateLeaseRequest(ownerId, now, leaseSeconds);
    const index = this.indexById.get(resourceId);
    if (index === undefined) return null;
    this.expireIndexIfDue(index, now);
    if (this.items[index]!.state !== 'available') return null;
    return this.reserveIndex(index, ownerId, now + leaseSeconds);
  }

  /** Extends an active reservation/consumption lease. */
  renewLease(
    resourceId: number,
    generation: number,
    ownerId: number,
    now: number,
    leaseSeconds: number,
  ): boolean {
    this.validateLeaseRequest(ownerId, now, leaseSeconds);
    const index = this.indexById.get(resourceId);
    if (index === undefined) return false;
    this.expireIndexIfDue(index, now);
    const resource = this.items[index]!;
    if (!this.matchesOwnedActive(resource, generation, ownerId)) return false;
    resource.leaseUntil = now + leaseSeconds;
    this.leaseHeap.fix(index);
    return true;
  }

  /** Transitions a valid reservation to the explicit `consuming` state. */
  beginConsumption(resourceId: number, generation: number, ownerId: number, now: number): boolean {
    assertOwner(ownerId);
    assertFiniteAtLeast('now', now, 0);
    const index = this.indexById.get(resourceId);
    if (index === undefined) return false;
    this.expireIndexIfDue(index, now);
    const resource = this.items[index]!;
    if (
      resource.state !== 'reserved' ||
      resource.generation !== generation ||
      resource.ownerId !== ownerId
    ) {
      return false;
    }
    this.transition(resource, 'consuming');
    return true;
  }

  /**
   * Atomically awards nourishment once and schedules exactly one five-second respawn.
   * Returns zero for stale, duplicate, wrong-owner, expired, or otherwise invalid attempts.
   */
  completeConsumption(
    resourceId: number,
    generation: number,
    ownerId: number,
    now: number,
  ): number {
    assertOwner(ownerId);
    assertFiniteAtLeast('now', now, 0);
    const index = this.indexById.get(resourceId);
    if (index === undefined) return 0;
    this.expireIndexIfDue(index, now);
    const resource = this.items[index]!;
    if (
      resource.state !== 'consuming' ||
      resource.generation !== generation ||
      resource.ownerId !== ownerId
    ) {
      return 0;
    }

    this.leaseHeap.remove(index);
    this.untrackClaim(resource.ownerId, index);
    resource.ownerId = null;
    resource.leaseUntil = 0;
    resource.respawnAt = now + EDIBLE_RESOURCE_RESPAWN_SECONDS;
    this.transition(resource, 'respawning');
    if (!this.respawnHeap.insert(index)) {
      throw new Error(`resource ${resource.id} already has a respawn deadline`);
    }
    this.notify('unavailable', resource);
    return resource.nourishment;
  }

  /** Cancels one reservation or in-progress consumption and invalidates its generation. */
  cancel(resourceId: number, generation: number, ownerId: number): boolean {
    assertOwner(ownerId);
    const index = this.indexById.get(resourceId);
    if (index === undefined) return false;
    const resource = this.items[index]!;
    if (!this.matchesOwnedActive(resource, generation, ownerId)) return false;
    this.leaseHeap.remove(index);
    this.makeAvailable(index);
    return true;
  }

  /**
   * Releases every reservation owned by an entity. Call this for goal cancellation, death, or
   * despawn. O(claims held) via the owner-claims index — safe on the global entity-death hook,
   * which fires for owners that never reserved anything (the common case returns in O(1)).
   */
  releaseOwner(ownerId: number): number {
    assertOwner(ownerId);
    const claims = this.ownerClaims.get(ownerId);
    if (claims === undefined || claims.size === 0) return 0;
    let released = 0;
    // Iterating the live set is safe: JS Set iterators skip entries deleted mid-iteration, and
    // makeAvailable→untrackClaim only deletes the entry currently being visited.
    for (const index of claims) {
      const resource = this.items[index]!;
      if (
        resource.ownerId === ownerId &&
        (resource.state === 'reserved' || resource.state === 'consuming')
      ) {
        this.leaseHeap.remove(index);
        this.makeAvailable(index);
        released++;
      }
    }
    return released;
  }

  /**
   * Advances leases and respawns against simulation time. Returns the number restored this call.
   */
  update(now: number): number {
    assertFiniteAtLeast('now', now, 0);
    this.expireLeases(now);
    let restored = 0;
    for (;;) {
      const index = this.respawnHeap.peek();
      if (index < 0) break;
      const resource = this.items[index]!;
      if (resource.respawnAt > now) break;
      this.respawnHeap.pop();
      if (resource.state !== 'respawning') continue;

      if (!this.notify('restore', resource)) {
        // The visual/collision resource is not ready, so it must not become edible yet. Defer it
        // locally and keep draining — one failed restore must never head-of-line block other due
        // items (including the other kind's pool bridged through the same callback pair).
        this.restoreDeferred.push(index);
        continue;
      }
      this.makeAvailable(index);
      restored++;
    }
    if (this.restoreDeferred.length > 0) {
      for (const index of this.restoreDeferred) this.respawnHeap.insert(index);
      this.restoreDeferred.length = 0;
    }
    return restored;
  }

  /**
   * Invalidates all outstanding references and restores the fixed pool to a clean initial state.
   * A failed visual restore remains queued and unavailable instead of exposing invisible food.
   */
  reset(now = 0): void {
    assertFiniteAtLeast('now', now, 0);
    this.leaseHeap.clear();
    this.respawnHeap.clear();
    this.ownerClaims.clear();
    this.restoreDeferred.length = 0;
    this.freePrevious.fill(-1);
    this.freeNext.fill(-1);
    this.freeListed.fill(0);
    this.freeHead.fill(-1);
    this.freeTail.fill(-1);
    this.counts.fill(0);

    for (let index = 0; index < this.items.length; index++) {
      const resource = this.items[index]!;
      const needsRestore = resource.state === 'respawning';
      this.bumpGeneration(resource);
      resource.ownerId = null;
      resource.leaseUntil = 0;

      if (needsRestore) {
        resource.state = 'respawning';
        resource.respawnAt = now;
        this.counts[RESPAWNING] = this.counts[RESPAWNING]! + 1;
        if (!this.notify('restore', resource)) {
          this.respawnHeap.insert(index);
          continue;
        }
        this.transition(resource, 'available');
      } else {
        resource.state = 'available';
        resource.respawnAt = 0;
        this.counts[AVAILABLE] = this.counts[AVAILABLE]! + 1;
      }
      resource.respawnAt = 0;
      this.appendFree(index);
      this.notify('available', resource);
    }
  }

  stats(): EdibleResourceStats {
    return {
      capacity: this.items.length,
      available: this.counts[AVAILABLE]!,
      reserved: this.counts[RESERVED]!,
      consuming: this.counts[CONSUMING]!,
      respawning: this.counts[RESPAWNING]!,
      pendingLeases: this.leaseHeap.size,
      pendingRespawns: this.respawnHeap.size,
      lifecycleErrors: this.lifecycleErrorCount,
    };
  }

  private validateDefinition(
    definition: EdibleResourceDefinition,
    existing: ReadonlyMap<number, number>,
  ): void {
    if (!Number.isSafeInteger(definition.id)) {
      throw new TypeError('resource id must be a safe integer');
    }
    if (existing.has(definition.id)) {
      throw new Error(`duplicate edible resource id ${definition.id}`);
    }
    if (definition.kind !== 'fruit' && definition.kind !== 'leaf') {
      throw new TypeError(`unsupported edible resource kind ${String(definition.kind)}`);
    }
    assertFiniteAtLeast('nourishment', definition.nourishment, Number.MIN_VALUE);
    this.validatePoint('position', definition.position);
    if (definition.interactionPoint !== undefined) {
      this.validatePoint('interactionPoint', definition.interactionPoint);
    }
  }

  private validatePoint(name: string, point: EdibleResourcePoint): void {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      throw new TypeError(`${name} coordinates must be finite`);
    }
  }

  private validateLeaseRequest(ownerId: number, now: number, leaseSeconds: number): void {
    assertOwner(ownerId);
    assertFiniteAtLeast('now', now, 0);
    assertFiniteAtLeast('leaseSeconds', leaseSeconds, Number.MIN_VALUE);
  }

  private reserveIndex(index: number, ownerId: number, leaseUntil: number): EdibleReservation {
    const resource = this.items[index]!;
    this.removeFree(index);
    resource.ownerId = ownerId;
    this.trackClaim(ownerId, index);
    resource.leaseUntil = leaseUntil;
    resource.respawnAt = 0;
    this.transition(resource, 'reserved');
    if (!this.leaseHeap.insert(index)) {
      throw new Error(`resource ${resource.id} already has an active lease`);
    }
    return {
      id: resource.id,
      generation: resource.generation,
      ownerId,
      leaseUntil,
    };
  }

  private trackClaim(ownerId: number, index: number): void {
    let claims = this.ownerClaims.get(ownerId);
    if (claims === undefined) {
      claims = new Set();
      this.ownerClaims.set(ownerId, claims);
    }
    claims.add(index);
  }

  private untrackClaim(ownerId: number | null, index: number): void {
    if (ownerId === null) return;
    const claims = this.ownerClaims.get(ownerId);
    if (claims === undefined) return;
    claims.delete(index);
    if (claims.size === 0) this.ownerClaims.delete(ownerId);
  }

  private matchesOwnedActive(
    resource: MutableEdibleResource,
    generation: number,
    ownerId: number,
  ): boolean {
    return (
      (resource.state === 'reserved' || resource.state === 'consuming') &&
      resource.generation === generation &&
      resource.ownerId === ownerId
    );
  }

  private expireLeases(now: number): void {
    for (;;) {
      const index = this.leaseHeap.peek();
      if (index < 0) return;
      const resource = this.items[index]!;
      if (resource.leaseUntil > now) return;
      this.leaseHeap.pop();
      if (resource.state === 'reserved' || resource.state === 'consuming') {
        this.makeAvailable(index);
      }
    }
  }

  private expireIndexIfDue(index: number, now: number): void {
    const resource = this.items[index]!;
    if (
      (resource.state === 'reserved' || resource.state === 'consuming') &&
      resource.leaseUntil <= now
    ) {
      this.leaseHeap.remove(index);
      this.makeAvailable(index);
    }
  }

  private makeAvailable(index: number): void {
    const resource = this.items[index]!;
    this.transition(resource, 'available');
    this.untrackClaim(resource.ownerId, index);
    resource.ownerId = null;
    resource.leaseUntil = 0;
    resource.respawnAt = 0;
    this.bumpGeneration(resource);
    this.appendFree(index);
    this.notify('available', resource);
  }

  private transition(resource: MutableEdibleResource, next: EdibleResourceState): void {
    if (resource.state === next) return;
    const previousSlot = stateSlot(resource.state);
    this.counts[previousSlot] = this.counts[previousSlot]! - 1;
    resource.state = next;
    const nextSlot = stateSlot(next);
    this.counts[nextSlot] = this.counts[nextSlot]! + 1;
  }

  private bumpGeneration(resource: MutableEdibleResource): void {
    resource.generation =
      resource.generation >= Number.MAX_SAFE_INTEGER ? 1 : resource.generation + 1;
  }

  private nextAnyFree(): number {
    const fruit = this.freeHead[0]!;
    const leaf = this.freeHead[1]!;
    if (fruit < 0) return leaf;
    if (leaf < 0) return fruit;
    return this.items[fruit]!.id <= this.items[leaf]!.id ? fruit : leaf;
  }

  private appendFree(index: number): void {
    if (this.freeListed[index] !== 0) {
      throw new Error(`resource ${this.items[index]!.id} is already on a free list`);
    }
    const slot = kindSlot(this.items[index]!.kind);
    const tail = this.freeTail[slot]!;
    this.freePrevious[index] = tail;
    this.freeNext[index] = -1;
    if (tail < 0) this.freeHead[slot] = index;
    else this.freeNext[tail] = index;
    this.freeTail[slot] = index;
    this.freeListed[index] = 1;
  }

  private removeFree(index: number): void {
    if (this.freeListed[index] === 0) {
      throw new Error(`resource ${this.items[index]!.id} is not on a free list`);
    }
    const slot = kindSlot(this.items[index]!.kind);
    const previous = this.freePrevious[index]!;
    const next = this.freeNext[index]!;
    if (previous < 0) this.freeHead[slot] = next;
    else this.freeNext[previous] = next;
    if (next < 0) this.freeTail[slot] = previous;
    else this.freePrevious[next] = previous;
    this.freePrevious[index] = -1;
    this.freeNext[index] = -1;
    this.freeListed[index] = 0;
  }

  private notify(phase: EdibleResourceLifecyclePhase, resource: MutableEdibleResource): boolean {
    const callback =
      phase === 'unavailable'
        ? this.lifecycle.onUnavailable
        : phase === 'restore'
          ? this.lifecycle.onRestore
          : this.lifecycle.onAvailable;
    if (callback === undefined) return true;
    try {
      callback(resource);
      return true;
    } catch (error) {
      this.lifecycleErrorCount++;
      try {
        this.lifecycle.onError?.(error, phase, resource);
      } catch {
        // Error reporting must never alter simulation state.
      }
      return false;
    }
  }
}
