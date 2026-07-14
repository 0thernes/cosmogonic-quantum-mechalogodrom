import { describe, expect, test } from 'bun:test';
import {
  type BigTreeSanctuaryIndexStats,
  BigTreeSanctuaryMembershipRegistry,
  NO_BIG_TREE_SANCTUARY_MEMBER,
  type BigTreeSanctuaryMembershipView,
} from '../src/sim/big-tree-sanctuary';
import { BigTreeZone } from '../src/sim/big-tree-zone';

function emptyView(): BigTreeSanctuaryMembershipView {
  return { recordId: -1, ownerKind: -1, ownerId: -1, x: 0, z: 0, protected: false };
}

function emptyIndexStats(): BigTreeSanctuaryIndexStats {
  return {
    tableCapacity: 0,
    trackedMembers: 0,
    protectedMembers: 0,
    backshiftDeletions: 0,
    relocatedKeys: 0,
    maxLookupProbeLength: 0,
    maxBackshiftProbeLength: 0,
  };
}

function sanctuaryHash(ownerKind: number, ownerId: number, keyMask: number): number {
  let hash = Math.imul(ownerKind ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  hash ^= Math.imul(ownerId ^ (ownerId >>> 16), 0xc2b2ae35) >>> 0;
  hash ^= hash >>> 16;
  return hash & keyMask;
}

describe('BigTreeSanctuaryMembershipRegistry', () => {
  test('does not grant first-arrival membership in the 240..270 hysteresis annulus', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      4,
    );
    expect(members.register(1, 10, 250, 0)).toBe(0);
    expect(members.protects(1, 10)).toBe(false);
    expect(members.protectedMembers).toBe(0);

    const view = emptyView();
    expect(members.read(1, 10, view)).toBe(true);
    expect(view).toEqual({
      recordId: 0,
      ownerKind: 1,
      ownerId: 10,
      x: 250,
      z: 0,
      protected: false,
    });
  });

  test('enters below 240, remains protected through the annulus, and exits beyond 270', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      2,
    );
    members.register(2, 20, 280, 0);
    expect(members.update(2, 20, 239, 0)).toBe(true);
    expect(members.protectedMembers).toBe(1);
    expect(members.update(2, 20, 250, 0)).toBe(true);
    expect(members.update(2, 20, 270, 0)).toBe(true);
    expect(members.update(2, 20, 270.001, 0)).toBe(false);
    expect(members.protectedMembers).toBe(0);

    // Once exited, the same annulus point cannot re-enter without crossing the inner boundary.
    expect(members.update(2, 20, 250, 0)).toBe(false);
    expect(members.update(2, 20, 239.999, 0)).toBe(true);
  });

  test('re-register preserves membership history and stable record identity', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      2,
    );
    const recordId = members.register(3, 30, 100, 0);
    expect(members.register(3, 30, 260, 0)).toBe(recordId);
    expect(members.size).toBe(1);
    expect(members.protects(3, 30)).toBe(true);
  });

  test('cleanup releases membership and deterministically reuses the freed record', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      2,
    );
    expect(members.register(4, 40, 10, 0)).toBe(0);
    expect(members.register(4, 41, 300, 0)).toBe(1);
    expect(members.register(4, 42, 10, 0)).toBe(NO_BIG_TREE_SANCTUARY_MEMBER);
    expect(members.remove(4, 40)).toBe(true);
    expect(members.remove(4, 40)).toBe(false);
    expect(members.protects(4, 40)).toBe(false);
    expect(members.protectedMembers).toBe(0);
    expect(members.register(4, 42, 10, 0)).toBe(0);
    expect(members.size).toBe(2);
    expect(members.protectedMembers).toBe(1);
  });

  test('backshift deletion preserves colliding keys without retaining tombstones', () => {
    const capacity = 4;
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      capacity,
    );
    const tableCapacity = 8;
    const ownerKind = 4;
    const buckets: number[][] = Array.from({ length: tableCapacity }, () => []);
    for (let ownerId = 0; ownerId < 1_000; ownerId++) {
      const bucket = buckets[sanctuaryHash(ownerKind, ownerId, tableCapacity - 1)];
      if (bucket && bucket.length < 3) bucket.push(ownerId);
    }
    const colliders = buckets.find((bucket) => bucket.length === 3);
    expect(colliders).toBeDefined();
    if (!colliders) throw new Error('failed to construct a deterministic collision cluster');

    for (const ownerId of colliders) {
      expect(members.register(ownerKind, ownerId, 10, 0)).not.toBe(NO_BIG_TREE_SANCTUARY_MEMBER);
    }
    expect(members.remove(ownerKind, colliders[0] ?? -1)).toBe(true);
    for (const ownerId of colliders.slice(1)) {
      expect(members.read(ownerKind, ownerId, emptyView())).toBe(true);
      expect(members.update(ownerKind, ownerId, 250, 0)).toBe(true);
    }

    const stats = emptyIndexStats();
    members.readIndexStats(stats);
    expect(stats).toMatchObject({
      tableCapacity,
      trackedMembers: 2,
      protectedMembers: 2,
      backshiftDeletions: 1,
      relocatedKeys: 2,
    });
    expect(stats.maxLookupProbeLength).toBeGreaterThanOrEqual(3);
    expect(stats.maxLookupProbeLength).toBeLessThanOrEqual(tableCapacity);
    expect(stats.maxBackshiftProbeLength).toBeGreaterThanOrEqual(3);
    expect(stats.maxBackshiftProbeLength).toBeLessThanOrEqual(tableCapacity);
  });

  test('sustains unique-identity churn with table-bounded probe lengths', () => {
    const capacity = 16;
    const rounds = 512;
    const members = new BigTreeSanctuaryMembershipRegistry(new BigTreeZone(), capacity);
    let registered = 0;
    let removed = 0;

    for (let round = 0; round < rounds; round++) {
      const firstOwnerId = round * capacity;
      for (let offset = 0; offset < capacity; offset++) {
        const ownerId = firstOwnerId + offset;
        if (members.register(1, ownerId, offset, 0) >= 0) registered++;
      }
      for (let index = 0; index < capacity; index++) {
        const offset = (index * 5) & (capacity - 1);
        if (members.remove(1, firstOwnerId + offset)) removed++;
      }
      expect(members.size).toBe(0);
    }

    expect(registered).toBe(rounds * capacity);
    expect(removed).toBe(rounds * capacity);
    expect(members.register(2, 1_000_000, 0, 0)).toBe(0);
    expect(members.read(2, 1_000_000, emptyView())).toBe(true);

    const stats = emptyIndexStats();
    members.readIndexStats(stats);
    expect(stats.tableCapacity).toBe(capacity * 2);
    expect(stats.trackedMembers).toBe(1);
    expect(stats.backshiftDeletions).toBe(rounds * capacity);
    expect(stats.relocatedKeys).toBeGreaterThan(0);
    expect(stats.maxLookupProbeLength).toBeLessThanOrEqual(stats.tableCapacity);
    expect(stats.maxBackshiftProbeLength).toBeLessThanOrEqual(stats.tableCapacity);
  });

  test('reset removes every identity and restores the original allocation order', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      3,
    );
    members.register(5, 50, 10, 0);
    members.register(5, 51, 250, 0);
    expect(members.remove(5, 50)).toBe(true);
    members.reset();
    expect(members.size).toBe(0);
    expect(members.protectedMembers).toBe(0);
    expect(members.read(5, 50, emptyView())).toBe(false);
    expect(members.update(5, 51, 10, 0)).toBe(false);
    expect(members.register(6, 60, 10, 0)).toBe(0);
    const stats = emptyIndexStats();
    members.readIndexStats(stats);
    expect(stats).toMatchObject({
      trackedMembers: 1,
      backshiftDeletions: 0,
      relocatedKeys: 0,
      maxBackshiftProbeLength: 0,
    });
  });

  test('population reset removes one kind without erasing another kind hysteresis', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      4,
    );
    members.register(1, 10, 100, 0);
    members.register(1, 11, 300, 0);
    members.register(2, 20, 100, 0);
    members.update(2, 20, 250, 0);

    expect(members.removeKind(1)).toBe(2);
    expect(members.removeKind(1)).toBe(0);
    expect(members.read(1, 10, emptyView())).toBe(false);
    expect(members.protects(2, 20)).toBe(true);
    expect(members.size).toBe(1);
    expect(members.protectedMembers).toBe(1);
  });

  test('outer-radius endpoint protection is conservative but separate from membership', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(
      new BigTreeZone({ centerX: 0, centerZ: 0 }),
      1,
    );
    expect(members.protectsEndpoint(250, 0)).toBe(true);
    expect(members.protectsEndpoint(270, 0)).toBe(true);
    expect(members.protectsEndpoint(270.001, 0)).toBe(false);
    expect(members.register(7, 70, 250, 0)).toBe(0);
    expect(members.protects(7, 70)).toBe(false);
  });

  test('uses fixed storage and no ambient clock or random source', async () => {
    const source = await Bun.file(
      new URL('../src/sim/big-tree-sanctuary.ts', import.meta.url),
    ).text();
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('performance.now');
    expect(source).not.toContain('new Map');
    expect(source).not.toContain('new Set');
    expect(source).not.toContain('TOMBSTONE_KEY');
    expect(source).toContain('freeRecordIds');
    expect(source).toContain('eraseKeyAndBackshift');
    expect(source).toContain('BigTreeZone.contains');
  });

  test('rejects invalid identities without consuming capacity', () => {
    const members = new BigTreeSanctuaryMembershipRegistry(new BigTreeZone(), 1);
    expect(members.register(-1, 1, 0, 0)).toBe(NO_BIG_TREE_SANCTUARY_MEMBER);
    expect(members.register(1, Number.NaN, 0, 0)).toBe(NO_BIG_TREE_SANCTUARY_MEMBER);
    expect(members.size).toBe(0);
    expect(() => new BigTreeSanctuaryMembershipRegistry(new BigTreeZone(), 0)).toThrow(
      /positive fixed capacity/,
    );
  });
});
