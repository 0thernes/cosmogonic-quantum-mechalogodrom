/**
 * Allocation-stable Big Tree sanctuary membership keyed by simulation-owned identity.
 *
 * The registry deliberately separates persistent entity membership from conservative point tests.
 * Registered entities enter through the smaller authored boundary and retain membership through the
 * hysteresis annulus until they cross the larger exit boundary. Unregistered endpoints (projectile
 * impacts, area effects, spawn sites) can be checked against the outer boundary without accidentally
 * granting first-arrival membership to an entity in the annulus.
 */

import { BigTreeZone } from './big-tree-zone';

export const NO_BIG_TREE_SANCTUARY_MEMBER = -1;

/** Stable composition-root namespaces. IDs only need to be unique within one namespace. */
export const BIG_TREE_SANCTUARY_ORDINARY = 1;
export const BIG_TREE_SANCTUARY_XENOMIMIC = 2;
export const BIG_TREE_SANCTUARY_SHOGGOTH = 3;
export const BIG_TREE_SANCTUARY_TITAN = 4;
export const BIG_TREE_SANCTUARY_PUPPET = 5;

const NO_OWNER = -1;
const EMPTY_KEY = 0;
const OCCUPIED_KEY = 1;

export interface BigTreeSanctuaryMembershipView {
  recordId: number;
  ownerKind: number;
  ownerId: number;
  x: number;
  z: number;
  protected: boolean;
}

/** Caller-owned development counters for deterministic index health checks. */
export interface BigTreeSanctuaryIndexStats {
  tableCapacity: number;
  trackedMembers: number;
  protectedMembers: number;
  backshiftDeletions: number;
  relocatedKeys: number;
  maxLookupProbeLength: number;
  maxBackshiftProbeLength: number;
}

/**
 * Fixed-capacity sanctuary membership with no per-register, per-update, or per-read allocation.
 *
 * A fixed open-addressed table maps `(ownerKind, ownerId)` to dense record storage. Removal closes
 * the affected linear-probe cluster with bounded backward shifting instead of retaining tombstones,
 * then returns record IDs to a deterministic LIFO free list. Reset restores the exact construction
 * state, including index-health counters.
 */
export class BigTreeSanctuaryMembershipRegistry {
  readonly zone: BigTreeZone;
  readonly capacity: number;

  private readonly recordUsed: Uint8Array;
  private readonly recordOwnerKinds: Int32Array;
  private readonly recordOwnerIds: Int32Array;
  private readonly recordXs: Float64Array;
  private readonly recordZs: Float64Array;
  private readonly recordProtected: Uint8Array;
  private readonly freeRecordIds: Int32Array;
  private freeRecordCount: number;

  private readonly keyStates: Uint8Array;
  private readonly keyOwnerKinds: Int32Array;
  private readonly keyOwnerIds: Int32Array;
  private readonly keyRecordIds: Int32Array;
  private readonly keyMask: number;

  private trackedCount = 0;
  private protectedCount = 0;
  private backshiftDeletionCount = 0;
  private relocatedKeyCount = 0;
  private maxLookupProbeLength = 0;
  private maxBackshiftProbeLength = 0;

  constructor(zone: BigTreeZone, capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 0x0fffffff) {
      throw new RangeError('BigTreeSanctuaryMembershipRegistry requires a positive fixed capacity');
    }
    this.zone = zone;
    this.capacity = capacity;

    this.recordUsed = new Uint8Array(capacity);
    this.recordOwnerKinds = new Int32Array(capacity);
    this.recordOwnerIds = new Int32Array(capacity);
    this.recordXs = new Float64Array(capacity);
    this.recordZs = new Float64Array(capacity);
    this.recordProtected = new Uint8Array(capacity);
    this.freeRecordIds = new Int32Array(capacity);
    this.freeRecordCount = capacity;

    let keyCapacity = 2;
    while (keyCapacity < capacity * 2) keyCapacity *= 2;
    this.keyStates = new Uint8Array(keyCapacity);
    this.keyOwnerKinds = new Int32Array(keyCapacity);
    this.keyOwnerIds = new Int32Array(keyCapacity);
    this.keyRecordIds = new Int32Array(keyCapacity);
    this.keyMask = keyCapacity - 1;

    this.initializeStorage();
  }

  get size(): number {
    return this.trackedCount;
  }

  get protectedMembers(): number {
    return this.protectedCount;
  }

  /**
   * Register an identity and its current position. A first observation in the hysteresis annulus is
   * outside. Re-registering an existing identity is equivalent to an update and keeps its history.
   */
  register(ownerKind: number, ownerId: number, x: number, z: number): number {
    if (!this.validOwner(ownerKind, ownerId)) return NO_BIG_TREE_SANCTUARY_MEMBER;

    const existingKey = this.findKey(ownerKind, ownerId);
    if (existingKey >= 0) {
      const recordId = this.keyRecordIds[existingKey] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
      this.updateRecord(recordId, x, z);
      return recordId;
    }
    if (this.freeRecordCount === 0) return NO_BIG_TREE_SANCTUARY_MEMBER;

    const keySlot = this.findInsertionKey(ownerKind, ownerId);
    if (keySlot < 0) return NO_BIG_TREE_SANCTUARY_MEMBER;
    const recordId = this.freeRecordIds[--this.freeRecordCount] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
    if (recordId < 0) return NO_BIG_TREE_SANCTUARY_MEMBER;

    this.recordUsed[recordId] = 1;
    this.recordOwnerKinds[recordId] = ownerKind;
    this.recordOwnerIds[recordId] = ownerId;
    this.recordXs[recordId] = x;
    this.recordZs[recordId] = z;
    const protectedHere = this.zone.contains(x, z, false);
    this.recordProtected[recordId] = protectedHere ? 1 : 0;
    if (protectedHere) this.protectedCount++;

    this.keyStates[keySlot] = OCCUPIED_KEY;
    this.keyOwnerKinds[keySlot] = ownerKind;
    this.keyOwnerIds[keySlot] = ownerId;
    this.keyRecordIds[keySlot] = recordId;
    this.trackedCount++;
    return recordId;
  }

  /** Update a registered member through `BigTreeZone.contains(current, previous)`. */
  update(ownerKind: number, ownerId: number, x: number, z: number): boolean {
    const keySlot = this.findKey(ownerKind, ownerId);
    if (keySlot < 0) return false;
    const recordId = this.keyRecordIds[keySlot] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
    return this.updateRecord(recordId, x, z);
  }

  /** Remove a despawned identity and deterministically return its record to the free list. */
  remove(ownerKind: number, ownerId: number): boolean {
    const keySlot = this.findKey(ownerKind, ownerId);
    if (keySlot < 0) return false;
    const recordId = this.keyRecordIds[keySlot] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
    if (recordId < 0 || this.recordUsed[recordId] === 0) return false;

    if (this.recordProtected[recordId] !== 0) this.protectedCount--;
    this.recordUsed[recordId] = 0;
    this.recordOwnerKinds[recordId] = NO_OWNER;
    this.recordOwnerIds[recordId] = NO_OWNER;
    this.recordXs[recordId] = 0;
    this.recordZs[recordId] = 0;
    this.recordProtected[recordId] = 0;
    this.freeRecordIds[this.freeRecordCount++] = recordId;

    this.eraseKeyAndBackshift(keySlot);
    this.trackedCount--;
    return true;
  }

  /**
   * Remove one population namespace while retaining every other species' hysteresis history.
   * This is intentionally O(capacity): it is a reset/lifecycle operation, never a frame hot path.
   */
  removeKind(ownerKind: number): number {
    if (!Number.isInteger(ownerKind) || ownerKind < 0 || ownerKind > 0x7fffffff) return 0;
    let removed = 0;
    for (let recordId = 0; recordId < this.capacity; recordId++) {
      if (this.recordUsed[recordId] === 0 || this.recordOwnerKinds[recordId] !== ownerKind)
        continue;
      const ownerId = this.recordOwnerIds[recordId] ?? NO_OWNER;
      if (ownerId >= 0 && this.remove(ownerKind, ownerId)) removed++;
    }
    return removed;
  }

  /** Restore the registry to its deterministic empty construction state. */
  reset(): void {
    this.initializeStorage();
    this.trackedCount = 0;
    this.protectedCount = 0;
  }

  /** Copy one member into caller-owned storage. */
  read(ownerKind: number, ownerId: number, out: BigTreeSanctuaryMembershipView): boolean {
    const keySlot = this.findKey(ownerKind, ownerId);
    if (keySlot < 0) return false;
    const recordId = this.keyRecordIds[keySlot] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
    if (recordId < 0 || this.recordUsed[recordId] === 0) return false;
    out.recordId = recordId;
    out.ownerKind = this.recordOwnerKinds[recordId] ?? NO_OWNER;
    out.ownerId = this.recordOwnerIds[recordId] ?? NO_OWNER;
    out.x = this.recordXs[recordId] ?? 0;
    out.z = this.recordZs[recordId] ?? 0;
    out.protected = this.recordProtected[recordId] !== 0;
    return true;
  }

  /** Identity-aware protection used for registered living beings. */
  protects(ownerKind: number, ownerId: number): boolean {
    const keySlot = this.findKey(ownerKind, ownerId);
    if (keySlot < 0) return false;
    const recordId = this.keyRecordIds[keySlot] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
    return recordId >= 0 && this.recordProtected[recordId] !== 0;
  }

  /**
   * Conservative stateless protection for hostile endpoints that do not own a membership record.
   * This intentionally uses the outer radius and must not be used to establish entity membership.
   */
  protectsEndpoint(x: number, z: number): boolean {
    return this.zone.protects(x, z, true);
  }

  /** Copy allocation-free index diagnostics into caller-owned storage. */
  readIndexStats(out: BigTreeSanctuaryIndexStats): void {
    out.tableCapacity = this.keyStates.length;
    out.trackedMembers = this.trackedCount;
    out.protectedMembers = this.protectedCount;
    out.backshiftDeletions = this.backshiftDeletionCount;
    out.relocatedKeys = this.relocatedKeyCount;
    out.maxLookupProbeLength = this.maxLookupProbeLength;
    out.maxBackshiftProbeLength = this.maxBackshiftProbeLength;
  }

  private updateRecord(recordId: number, x: number, z: number): boolean {
    if (recordId < 0 || this.recordUsed[recordId] === 0) return false;
    const wasProtected = this.recordProtected[recordId] !== 0;
    const protectedHere = this.zone.contains(x, z, wasProtected);
    this.recordXs[recordId] = x;
    this.recordZs[recordId] = z;
    if (protectedHere !== wasProtected) {
      this.recordProtected[recordId] = protectedHere ? 1 : 0;
      this.protectedCount += protectedHere ? 1 : -1;
    }
    return protectedHere;
  }

  private initializeStorage(): void {
    this.recordUsed.fill(0);
    this.recordOwnerKinds.fill(NO_OWNER);
    this.recordOwnerIds.fill(NO_OWNER);
    this.recordXs.fill(0);
    this.recordZs.fill(0);
    this.recordProtected.fill(0);
    this.keyStates.fill(EMPTY_KEY);
    this.keyOwnerKinds.fill(NO_OWNER);
    this.keyOwnerIds.fill(NO_OWNER);
    this.keyRecordIds.fill(NO_BIG_TREE_SANCTUARY_MEMBER);
    this.freeRecordCount = this.capacity;
    for (let index = 0; index < this.capacity; index++) {
      this.freeRecordIds[index] = this.capacity - 1 - index;
    }
    this.backshiftDeletionCount = 0;
    this.relocatedKeyCount = 0;
    this.maxLookupProbeLength = 0;
    this.maxBackshiftProbeLength = 0;
  }

  private findKey(ownerKind: number, ownerId: number): number {
    if (!this.validOwner(ownerKind, ownerId)) return -1;
    let slot = this.hash(ownerKind, ownerId);
    for (let probes = 0; probes <= this.keyMask; probes++) {
      const state = this.keyStates[slot] ?? EMPTY_KEY;
      if (state === EMPTY_KEY) {
        this.noteLookupProbeLength(probes + 1);
        return -1;
      }
      if (
        state === OCCUPIED_KEY &&
        this.keyOwnerKinds[slot] === ownerKind &&
        this.keyOwnerIds[slot] === ownerId
      ) {
        this.noteLookupProbeLength(probes + 1);
        return slot;
      }
      slot = (slot + 1) & this.keyMask;
    }
    this.noteLookupProbeLength(this.keyMask + 1);
    return -1;
  }

  private findInsertionKey(ownerKind: number, ownerId: number): number {
    let slot = this.hash(ownerKind, ownerId);
    for (let probes = 0; probes <= this.keyMask; probes++) {
      const state = this.keyStates[slot] ?? EMPTY_KEY;
      if (state === EMPTY_KEY) {
        this.noteLookupProbeLength(probes + 1);
        return slot;
      }
      slot = (slot + 1) & this.keyMask;
    }
    this.noteLookupProbeLength(this.keyMask + 1);
    return -1;
  }

  /**
   * Delete one linear-probe entry without leaving a tombstone behind.
   *
   * The table is provisioned at no more than 50% load, so an empty terminator always exists. An
   * entry moves into the current hole exactly when that hole lies on its cyclic probe path from its
   * home slot. The scan therefore terminates deterministically within the fixed table capacity while
   * preserving lookup reachability for every surviving key.
   */
  private eraseKeyAndBackshift(keySlot: number): void {
    this.backshiftDeletionCount++;
    let hole = keySlot;
    let scan = (hole + 1) & this.keyMask;
    let scanned = 0;

    while (scanned <= this.keyMask) {
      scanned++;
      const state = this.keyStates[scan] ?? EMPTY_KEY;
      if (state === EMPTY_KEY) break;

      const ownerKind = this.keyOwnerKinds[scan] ?? NO_OWNER;
      const ownerId = this.keyOwnerIds[scan] ?? NO_OWNER;
      const home = this.hash(ownerKind, ownerId);
      const distanceToScan = (scan - home) & this.keyMask;
      const distanceToHole = (hole - home) & this.keyMask;
      if (distanceToHole < distanceToScan) {
        this.keyStates[hole] = OCCUPIED_KEY;
        this.keyOwnerKinds[hole] = ownerKind;
        this.keyOwnerIds[hole] = ownerId;
        this.keyRecordIds[hole] = this.keyRecordIds[scan] ?? NO_BIG_TREE_SANCTUARY_MEMBER;
        hole = scan;
        this.relocatedKeyCount++;
      }
      scan = (scan + 1) & this.keyMask;
    }

    this.keyStates[hole] = EMPTY_KEY;
    this.keyOwnerKinds[hole] = NO_OWNER;
    this.keyOwnerIds[hole] = NO_OWNER;
    this.keyRecordIds[hole] = NO_BIG_TREE_SANCTUARY_MEMBER;
    if (scanned > this.maxBackshiftProbeLength) this.maxBackshiftProbeLength = scanned;
  }

  private noteLookupProbeLength(length: number): void {
    if (length > this.maxLookupProbeLength) this.maxLookupProbeLength = length;
  }

  private hash(ownerKind: number, ownerId: number): number {
    let hash = Math.imul(ownerKind ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    hash ^= Math.imul(ownerId ^ (ownerId >>> 16), 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;
    return hash & this.keyMask;
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
}
