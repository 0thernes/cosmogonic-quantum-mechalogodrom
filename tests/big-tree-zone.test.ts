import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_ZONE_ENTRY_RADIUS,
  BIG_TREE_ZONE_EXIT_RADIUS,
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  BigTreeZone,
  NO_BIG_TREE_SLOT,
  NO_BIG_TREE_VISIT,
  type BigTreeSlotView,
  type BigTreeVisitContext,
  type BigTreeVisitDecision,
  type BigTreeVisitView,
  type BigTreeZoneStats,
} from '../src/sim/big-tree-zone';
import { CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z } from '../src/sim/constants';

function createManager(capacity = 2): BigTreeVisitManager {
  const zone = new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 20, exitRadius: 25 });
  return new BigTreeVisitManager(zone, {
    maxActors: 8,
    capacity,
    maxSlots: 6,
    arriveRadius: 1,
    minDwellSeconds: 2,
    maxDwellSeconds: 2,
    minCooldownSeconds: 5,
    maxCooldownSeconds: 5,
    travelTimeoutSeconds: 10,
    leaveTimeoutSeconds: 3,
    slotLeaseSeconds: 4,
    stuckAfterSeconds: 1,
    progressEpsilon: 0.1,
    maxStuckRecoveries: 1,
  });
}

function emptyVisit(): BigTreeVisitView {
  return {
    recordId: -1,
    ownerKind: -1,
    ownerId: -1,
    state: BigTreeVisitState.Outside,
    reason: BigTreeVisitReason.Curiosity,
    activity: BigTreeActivity.None,
    slotId: -1,
    startedAt: 0,
    enteredAt: 0,
    stateDeadline: 0,
    cooldownUntil: 0,
    stuckRecoveries: 0,
    visitOrdinal: 0,
    partnerKind: -1,
    partnerId: -1,
    partnerLeaseExpiresAt: 0,
  };
}

function emptyDecision(): BigTreeVisitDecision {
  return {
    shouldVisit: false,
    reason: BigTreeVisitReason.Curiosity,
    activity: BigTreeActivity.None,
    utility: 0,
    threshold: 0,
  };
}

const HUNGRY_CONTEXT: BigTreeVisitContext = {
  hunger: 1,
  fatigue: 0.1,
  healthDeficit: 0,
  stress: 0,
  socialNeed: 0.1,
  curiosity: 0.2,
  danger: 0,
  distance: 80,
  routeAvailable: true,
  foodAvailable: true,
  recentVisit: 0,
  personality: 0.5,
  simulationLoad: 0,
};

describe('BigTreeZone', () => {
  test('defaults to the canonical Crystal Tree center and authored hysteresis radii', () => {
    const zone = new BigTreeZone();
    expect(zone.centerX).toBe(CRYSTAL_TREE_ORIGIN_X);
    expect(zone.centerZ).toBe(CRYSTAL_TREE_ORIGIN_Z);
    expect(zone.enterRadius).toBe(BIG_TREE_ZONE_ENTRY_RADIUS);
    expect(zone.exitRadius).toBe(BIG_TREE_ZONE_EXIT_RADIUS);
    expect(zone.protects(CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z)).toBe(true);
  });

  test('uses separate entry and exit radii to prevent boundary oscillation', () => {
    const zone = new BigTreeZone({ centerX: 10, centerZ: -5, enterRadius: 20, exitRadius: 25 });
    expect(zone.contains(10, -5)).toBe(true);
    expect(zone.contains(32, -5, false)).toBe(false);
    expect(zone.contains(32, -5, true)).toBe(true);
    expect(zone.contains(35, -5, true)).toBe(true);
    expect(zone.contains(35.001, -5, true)).toBe(false);
  });

  test('blocks harm when either attacker or target is protected', () => {
    const zone = new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 10, exitRadius: 12 });
    expect(zone.harmAllowed(false, false)).toBe(true);
    expect(zone.harmAllowed(true, false)).toBe(false);
    expect(zone.harmAllowed(false, true)).toBe(false);
    expect(zone.harmAllowed(true, true)).toBe(false);
    expect(zone.harmAllowedAt(30, 0, false, 0, 0, false)).toBe(false);
    expect(zone.harmAllowedAt(30, 0, false, -30, 0, false)).toBe(true);
  });
});

describe('BigTreeVisitManager', () => {
  test('makes deterministic context-weighted decisions without synchronizing every actor', () => {
    const visits = createManager(2);
    visits.addRadialSlots(BigTreeSlotKind.Eat, 2, 5);
    const a = emptyDecision();
    const repeat = emptyDecision();
    const blocked = emptyDecision();

    expect(visits.decideVisit(1, 10, 4, HUNGRY_CONTEXT, a)).toBe(true);
    expect(visits.decideVisit(1, 10, 4, HUNGRY_CONTEXT, repeat)).toBe(true);
    expect(repeat).toEqual(a);
    expect(a.reason).toBe(BigTreeVisitReason.Food);
    expect(a.activity).toBe(BigTreeActivity.Eat);

    expect(
      visits.decideVisit(1, 10, 4, { ...HUNGRY_CONTEXT, routeAvailable: false }, blocked),
    ).toBe(false);
    expect(blocked.shouldVisit).toBe(false);
    const visitId = visits.requestContextualVisit(1, 10, 4, HUNGRY_CONTEXT, a, 12, 0, 10);
    expect(visitId).not.toBe(NO_BIG_TREE_VISIT);
  });

  test('reserves compatible distinct slots and enforces zone capacity', () => {
    const visits = createManager(2);
    const eatA = visits.addSlot(BigTreeSlotKind.Eat, -4, 0);
    const eatB = visits.addSlot(BigTreeSlotKind.Eat, 4, 0);
    visits.addSlot(BigTreeSlotKind.Rest, 0, 4);

    const first = visits.requestVisit(1, 10, BigTreeVisitReason.Food, 0, -15, 0);
    const second = visits.requestVisit(1, 11, BigTreeVisitReason.Food, 0, 15, 0);
    const rejected = visits.requestVisit(1, 12, BigTreeVisitReason.Rest, 0, 0, 15);
    expect(first).not.toBe(NO_BIG_TREE_VISIT);
    expect(second).not.toBe(NO_BIG_TREE_VISIT);
    expect(rejected).toBe(NO_BIG_TREE_VISIT);
    expect(visits.activeVisitors).toBe(2);
    expect(new Set([visits.selectedSlotOf(1, 10), visits.selectedSlotOf(1, 11)])).toEqual(
      new Set([eatA, eatB]),
    );

    expect(visits.cancelActor(1, 10)).toBe(true);
    expect(visits.activeVisitors).toBe(1);
    expect(visits.requestVisit(1, 12, BigTreeVisitReason.Rest, 0.1, 0, 15)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
  });

  test('runs a bounded travel, activity, leave, cooldown, and revisit lifecycle', () => {
    const visits = createManager(1);
    const slot = visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    expect(visits.requestVisit(2, 7, BigTreeVisitReason.Food, 0, 0, 0)).not.toBe(NO_BIG_TREE_VISIT);
    expect(visits.updatePosition(2, 7, 0, 0, 0)).toBe(BigTreeVisitState.Active);

    const view = emptyVisit();
    expect(visits.readVisit(2, 7, view)).toBe(true);
    expect(view.activity).toBe(BigTreeActivity.Eat);
    expect(view.slotId).toBe(slot);
    expect(view.stateDeadline).toBe(2);

    visits.step(1.999);
    expect(visits.stateOf(2, 7)).toBe(BigTreeVisitState.Active);
    visits.step(2);
    expect(visits.stateOf(2, 7)).toBe(BigTreeVisitState.Leaving);
    expect(visits.selectedSlotOf(2, 7)).toBe(NO_BIG_TREE_SLOT);
    expect(visits.updatePosition(2, 7, 30, 0, 2.1)).toBe(BigTreeVisitState.Cooldown);
    expect(visits.activeVisitors).toBe(0);
    expect(visits.completedVisits).toBe(1);

    expect(visits.readVisit(2, 7, view)).toBe(true);
    expect(view.cooldownUntil).toBe(7.1);
    expect(visits.requestVisit(2, 7, BigTreeVisitReason.Food, 7.099, 30, 0)).toBe(
      NO_BIG_TREE_VISIT,
    );
    visits.step(7.1);
    expect(visits.stateOf(2, 7)).toBe(BigTreeVisitState.Outside);
    expect(visits.requestVisit(2, 7, BigTreeVisitReason.Food, 7.1, 30, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
  });

  test('expired leases free reservations and prevent permanent targeting', () => {
    const visits = createManager(1);
    const slot = visits.addSlot(BigTreeSlotKind.Any, 0, 0);
    expect(visits.requestVisit(1, 1, BigTreeVisitReason.Safety, 0, 10, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
    visits.step(3.999);
    expect(visits.stateOf(1, 1)).toBe(BigTreeVisitState.Travelling);
    visits.step(4);
    expect(visits.stateOf(1, 1)).toBe(BigTreeVisitState.Cooldown);
    expect(visits.activeVisitors).toBe(0);
    expect(visits.timedOutVisits).toBe(1);

    const slotView: BigTreeSlotView = {
      slotId: -1,
      kind: BigTreeSlotKind.Any,
      x: 0,
      z: 0,
      ownerKind: -1,
      ownerId: -1,
      leaseExpiresAt: 0,
    };
    expect(visits.readSlot(slot, slotView)).toBe(true);
    expect(slotView.ownerKind).toBe(-1);
    expect(visits.requestVisit(1, 2, BigTreeVisitReason.Curiosity, 4, 10, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
  });

  test('stuck detection selects another slot once, then exits cleanly when still blocked', () => {
    const visits = createManager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -1, 0);
    visits.addSlot(BigTreeSlotKind.Eat, 1, 0);
    expect(visits.requestVisit(3, 9, BigTreeVisitReason.Food, 0, -10, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
    const firstSlot = visits.selectedSlotOf(3, 9);
    expect(visits.updatePosition(3, 9, -10, 0, 0.5)).toBe(BigTreeVisitState.Travelling);
    expect(visits.updatePosition(3, 9, -10, 0, 1.1)).toBe(BigTreeVisitState.Travelling);
    const recoveredSlot = visits.selectedSlotOf(3, 9);
    expect(recoveredSlot).not.toBe(firstSlot);
    expect(visits.stuckRecoveryEvents).toBe(1);

    expect(visits.updatePosition(3, 9, -10, 0, 2.2)).toBe(BigTreeVisitState.Cooldown);
    expect(visits.activeVisitors).toBe(0);
    expect(visits.selectedSlotOf(3, 9)).toBe(NO_BIG_TREE_SLOT);
    expect(visits.timedOutVisits).toBe(1);
  });

  test('early completion, cancellation, and reset release all activity slots', () => {
    const visits = createManager(2);
    visits.addSlot(BigTreeSlotKind.Rest, 0, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    expect(visits.requestVisit(4, 1, BigTreeVisitReason.Rest, 0, 0, 0)).not.toBe(NO_BIG_TREE_VISIT);
    expect(visits.updatePosition(4, 1, 0, 0, 0)).toBe(BigTreeVisitState.Active);
    expect(visits.finishActivity(4, 1, 0.5)).toBe(true);
    expect(visits.stateOf(4, 1)).toBe(BigTreeVisitState.Leaving);
    expect(visits.selectedSlotOf(4, 1)).toBe(NO_BIG_TREE_SLOT);

    expect(visits.requestVisit(4, 2, BigTreeVisitReason.Social, 0.5, 3, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
    expect(visits.cancelActor(4, 2)).toBe(true);
    expect(visits.trackedActors).toBe(1);
    visits.reset();
    expect(visits.activeVisitors).toBe(0);
    expect(visits.trackedActors).toBe(0);
    expect(visits.completedVisits).toBe(0);
    expect(visits.requestVisit(4, 3, BigTreeVisitReason.Social, 1, 3, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
  });

  test('social partners are willing, exclusive, symmetric, bounded, and cleaned up', () => {
    const visits = createManager(3);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 0, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    for (let ownerId = 1; ownerId <= 3; ownerId++) {
      const x = (ownerId - 2) * 3;
      expect(visits.requestVisit(5, ownerId, BigTreeVisitReason.Social, 0, x, 0)).not.toBe(
        NO_BIG_TREE_VISIT,
      );
      expect(visits.updatePosition(5, ownerId, x, 0, 0)).toBe(BigTreeVisitState.Active);
    }

    expect(visits.reservePartner(5, 1, 5, 2, 0, false, 1)).toBe(false);
    expect(visits.reservePartner(5, 1, 5, 2, 0, true, 1)).toBe(true);
    expect(visits.reservePartner(5, 3, 5, 2, 0, true, 1)).toBe(false);
    const first = emptyVisit();
    const second = emptyVisit();
    visits.readVisit(5, 1, first);
    visits.readVisit(5, 2, second);
    expect([first.partnerKind, first.partnerId]).toEqual([5, 2]);
    expect([second.partnerKind, second.partnerId]).toEqual([5, 1]);

    visits.step(0.999);
    expect(visits.releasePartner(5, 3)).toBe(false);
    visits.step(1);
    visits.readVisit(5, 1, first);
    visits.readVisit(5, 2, second);
    expect(first.partnerId).toBe(-1);
    expect(second.partnerId).toBe(-1);
    expect(visits.partnerTimeouts).toBe(1);
  });

  test('round-trips JSON-safe visitor state and exposes allocation-free observability buffers', () => {
    const visits = createManager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -2, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 2, 0);
    expect(visits.requestVisit(7, 1, BigTreeVisitReason.Social, 10, -2, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
    expect(visits.requestVisit(7, 2, BigTreeVisitReason.Social, 10, 2, 0)).not.toBe(
      NO_BIG_TREE_VISIT,
    );
    visits.updatePosition(7, 1, -2, 0, 10);
    visits.updatePosition(7, 2, 2, 0, 10);
    expect(visits.reservePartner(7, 1, 7, 2, 10, true, 1.5)).toBe(true);

    const encoded = JSON.stringify(visits.snapshot());
    expect(encoded).not.toContain('Infinity');
    const restored = createManager(2);
    restored.addSlot(BigTreeSlotKind.Socialize, -2, 0);
    restored.addSlot(BigTreeSlotKind.Socialize, 2, 0);
    restored.restore(JSON.parse(encoded));
    expect(restored.snapshot()).toEqual(visits.snapshot());

    const stats: BigTreeZoneStats = {
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
    restored.readStats(stats);
    expect(stats.activeVisitors).toBe(2);
    expect(stats.availableSlots).toBe(0);
    expect(stats.partnerReservations).toBe(1);

    const corrupt = restored.snapshot();
    corrupt.visitors[1]!.slotId = corrupt.visitors[0]!.slotId;
    expect(() => restored.restore(corrupt)).toThrow(/duplicate slot/);
    expect(JSON.stringify(restored.snapshot())).toBe(encoded);

    restored.reset();
    restored.readStats(stats);
    expect(stats).toMatchObject({ trackedActors: 0, activeVisitors: 0, availableSlots: 2 });
  });

  test('contains no wall-clock or ambient-random source', async () => {
    const source = await Bun.file(new URL('../src/sim/big-tree-zone.ts', import.meta.url)).text();
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Date.now');
  });

  test('steps only scheduled visit deadlines instead of scanning the actor ceiling every frame', async () => {
    const source = await Bun.file(new URL('../src/sim/big-tree-zone.ts', import.meta.url)).text();
    const start = source.indexOf('  step(now: number): void {');
    const end = source.indexOf('\n  /** Release all visits/reservations', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body).toContain('scheduledRecordCount');
    expect(body).not.toContain('this.maxActors');
  });

  test('allocates actor records from a deterministic free list instead of a growing scan', async () => {
    const source = await Bun.file(new URL('../src/sim/big-tree-zone.ts', import.meta.url)).text();
    const start = source.indexOf('  private acquireActorRecord(');
    const end = source.indexOf('\n  private clearActorRecord(', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body).toContain('freeRecordIds');
    expect(body).not.toContain('for (');
  });
});
