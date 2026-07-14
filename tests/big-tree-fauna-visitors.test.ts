import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_OWNER_PUPPET_MASTER,
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
  BigTreeFaunaIntentMode,
  BigTreeFaunaVisitors,
  bigTreeFaunaFoodOwnerId,
  bindBigTreeFauna,
  type BigTreeFaunaSource,
  type BigTreeFaunaVisitorSample,
  type BigTreeFaunaVisitorStats,
  type BigTreeFaunaVisitorView,
} from '../src/sim/big-tree-fauna-visitors';
import { EdibleResourceRegistry, type EdibleReservation } from '../src/sim/edible-resource';
import type { BigTreeFoodSource } from '../src/sim/big-tree-visitors';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeTransitionCause,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  BigTreeZone,
} from '../src/sim/big-tree-zone';

interface FakeFaunaRecord {
  id: number;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  hunger: number;
  mode: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  nourishment: number;
  nourishmentCalls: number;
  restSeconds: number;
  clearCalls: number;
}

class FakeFaunaSource implements BigTreeFaunaSource {
  readCalls = 0;
  readonly records: FakeFaunaRecord[];

  constructor(ids: readonly number[], startX = 30) {
    this.records = ids.map((id, index) => ({
      id,
      alive: true,
      x: startX + index,
      y: 0,
      z: 0,
      hunger: 1,
      mode: BigTreeFaunaIntentMode.Normal,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      nourishment: 0,
      nourishmentCalls: 0,
      restSeconds: 0,
      clearCalls: 0,
    }));
  }

  get bigTreeVisitorSlotCount(): number {
    return this.records.length;
  }

  readBigTreeVisitor(slot: number, out: BigTreeFaunaVisitorSample): boolean {
    this.readCalls++;
    const record = this.records[slot];
    if (!record) return false;
    out.ownerId = record.id;
    out.alive = record.alive;
    out.x = record.x;
    out.y = record.y;
    out.z = record.z;
    out.hunger = record.hunger;
    out.fatigue = 0;
    out.healthDeficit = 0;
    out.stress = 0;
    out.socialNeed = 0;
    out.curiosity = 0;
    return true;
  }

  setBigTreeVisitorIntent(
    ownerId: number,
    mode: number,
    targetX: number,
    targetY: number,
    targetZ: number,
  ): boolean {
    const record = this.records.find((candidate) => candidate.id === ownerId);
    if (!record) return false;
    record.mode = mode;
    record.targetX = targetX;
    record.targetY = targetY;
    record.targetZ = targetZ;
    return true;
  }

  nourishBigTreeVisitor(ownerId: number, nourishment: number): boolean {
    const record = this.records.find((candidate) => candidate.id === ownerId);
    if (!record) return false;
    record.nourishment += nourishment;
    record.nourishmentCalls++;
    record.hunger = Math.max(0, record.hunger - nourishment / 50);
    return true;
  }

  restBigTreeVisitor(ownerId: number, dt: number): boolean {
    const record = this.records.find((candidate) => candidate.id === ownerId);
    if (!record) return false;
    record.restSeconds += dt;
    return true;
  }

  clearBigTreeVisitorIntent(ownerId: number): boolean {
    const record = this.records.find((candidate) => candidate.id === ownerId);
    if (!record) return false;
    record.mode = BigTreeFaunaIntentMode.Normal;
    record.clearCalls++;
    return true;
  }

  advance(dt: number, speed = 300): void {
    for (const record of this.records) {
      if (record.mode !== BigTreeFaunaIntentMode.Travel) continue;
      const dx = record.targetX - record.x;
      const dy = record.targetY - record.y;
      const dz = record.targetZ - record.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance <= 1e-9) continue;
      const fraction = Math.min(1, (speed * dt) / distance);
      record.x += dx * fraction;
      record.y += dy * fraction;
      record.z += dz * fraction;
    }
  }
}

class FakeTreeFood implements BigTreeFoodSource {
  readonly edibleResources = new EdibleResourceRegistry([
    {
      id: 10,
      kind: 'fruit',
      position: { x: 0, y: 8, z: 0 },
      interactionPoint: { x: 0, y: 0, z: 0 },
      nourishment: 28,
    },
  ]);
  now = 0;

  setTime(now: number): void {
    this.now = now;
    this.edibleResources.update(now);
  }

  reserveFood(
    ownerId: number,
    leaseSeconds = 8,
    kind?: 'fruit' | 'leaf',
  ): EdibleReservation | null {
    return this.edibleResources.reserveAny(ownerId, this.now, leaseSeconds, kind);
  }

  renewFood(reservation: EdibleReservation, leaseSeconds = 8): boolean {
    return this.edibleResources.renewLease(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
      leaseSeconds,
    );
  }

  beginFoodConsumption(reservation: EdibleReservation): boolean {
    return this.edibleResources.beginConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
    );
  }

  completeFoodConsumption(reservation: EdibleReservation): number {
    return this.edibleResources.completeConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
    );
  }

  cancelFood(reservation: EdibleReservation): boolean {
    return this.edibleResources.cancel(reservation.id, reservation.generation, reservation.ownerId);
  }

  releaseFoodOwner(ownerId: number): number {
    return this.edibleResources.releaseOwner(ownerId);
  }
}

function makeVisits(capacity = 4): BigTreeVisitManager {
  const zone = new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 20, exitRadius: 25 });
  const visits = new BigTreeVisitManager(zone, {
    maxActors: 64,
    capacity,
    maxSlots: 12,
    arriveRadius: 3,
    minDwellSeconds: 0.4,
    maxDwellSeconds: 0.4,
    minCooldownSeconds: 5,
    maxCooldownSeconds: 5,
    travelTimeoutSeconds: 10,
    leaveTimeoutSeconds: 4,
    stuckAfterSeconds: 2,
  });
  visits.addRadialSlots(BigTreeSlotKind.Eat, 4, 2);
  visits.addRadialSlots(BigTreeSlotKind.Rest, 2, 4);
  visits.addRadialSlots(BigTreeSlotKind.Socialize, 2, 3);
  visits.addRadialSlots(BigTreeSlotKind.Observe, 2, 6);
  return visits;
}

function stats(): BigTreeFaunaVisitorStats {
  return {
    activeVisitors: 0,
    trackedFauna: 0,
    lastPollCount: 0,
    totalPolls: 0,
    acceptedVisits: 0,
    completedMeals: 0,
    consumedFruit: 0,
    consumedLeaves: 0,
    targetLosses: 0,
    cancellations: 0,
  };
}

function visitorView(): BigTreeFaunaVisitorView {
  return {
    ownerKind: 0,
    ownerId: -1,
    state: BigTreeVisitState.Outside,
    reason: 0 as never,
    activity: BigTreeActivity.None,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    foodId: -1,
    foodKind: null,
    foodState: null,
    partnerKind: -1,
    partnerId: -1,
    lastTransitionCause: BigTreeTransitionCause.None,
    lastTransitionAt: 0,
  };
}

function tick(
  adapter: BigTreeFaunaVisitors,
  tree: FakeTreeFood,
  source: FakeFaunaSource,
  now: number,
  dt = 0.1,
): void {
  tree.setTime(now);
  adapter.update(now, dt, { foodAvailable: true });
  source.advance(dt);
}

describe('BigTreeFaunaVisitors — generic canonical-fauna binding', () => {
  test('low-need incidental fauna keeps radial egress control through leave timeout and cooldown', () => {
    const source = new FakeFaunaSource([77], 5);
    source.records[0]!.hunger = 0;
    const tree = new FakeTreeFood();
    const visits = makeVisits(1);
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01, activeCapacity: 1 },
    );

    tick(adapter, tree, source, 0, 0.1);
    tick(adapter, tree, source, 0.1, 0.1);
    const active = visitorView();
    expect(adapter.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 77, active)).toBe(true);
    expect(active.reason).toBe(BigTreeVisitReason.Safety);
    expect(active.activity).toBe(BigTreeActivity.Observe);
    expect(active.state).toBe(BigTreeVisitState.Active);

    // Freeze the fake source after arrival. The dwell ends at 0.5 and leave timeout at 4.5, but the
    // adapter must continue issuing a real Travel intent while the body is still inside radius 25.
    tree.setTime(0.51);
    adapter.update(0.51, 0.1, { foodAvailable: false });
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 77)).toBe(BigTreeVisitState.Leaving);
    tree.setTime(4.52);
    adapter.update(4.52, 0.1, { foodAvailable: false });
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 77)).toBe(BigTreeVisitState.Cooldown);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Travel);
    expect(source.records[0]?.targetX).toBeGreaterThan(visits.zone.exitRadius);
    const duringCooldown = stats();
    adapter.readStats(duringCooldown);
    expect(duringCooldown.activeVisitors).toBe(1);

    source.records[0]!.x = 26;
    tree.setTime(4.6);
    adapter.update(4.6, 0.1, { foodAvailable: false });
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Normal);
    const afterExit = stats();
    adapter.readStats(afterExit);
    expect(afterExit.activeVisitors).toBe(0);
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 77)).toBe(BigTreeVisitState.Cooldown);

    source.records[0]!.x = 5;
    tree.setTime(4.7);
    adapter.update(4.7, 0.1, { foodAvailable: false });
    const reentered = stats();
    adapter.readStats(reentered);
    expect(reentered.activeVisitors).toBe(0);
    expect(reentered.acceptedVisits).toBe(1);
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 77)).toBe(BigTreeVisitState.Cooldown);
  });

  test('uses stable species IDs and a collision-free food-owner namespace', () => {
    const source = new FakeFaunaSource([777]);
    const binding = bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source);
    const sample = {} as BigTreeFaunaVisitorSample;
    expect(binding.source.readBigTreeVisitor(0, sample)).toBe(true);
    expect(sample.ownerId).toBe(777);
    expect(bigTreeFaunaFoodOwnerId(BIG_TREE_OWNER_SHOGGOTH, 777)).toBeLessThan(-1_000_000_000);
    expect(bigTreeFaunaFoodOwnerId(BIG_TREE_OWNER_SHOGGOTH, 777)).not.toBe(
      bigTreeFaunaFoodOwnerId(BIG_TREE_OWNER_PUPPET_MASTER, 777),
    );
  });

  test('steers a hungry fauna visitor, consumes canonically once, then leaves into cooldown', () => {
    const source = new FakeFaunaSource([777]);
    const tree = new FakeTreeFood();
    const visits = makeVisits();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01, activeCapacity: 2 },
    );

    tick(adapter, tree, source, 0);
    const travelling = visitorView();
    expect(adapter.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 777, travelling)).toBe(true);
    expect(travelling.lastTransitionCause).toBe(BigTreeTransitionCause.VisitRequested);
    expect(travelling.lastTransitionAt).toBe(0);
    tick(adapter, tree, source, 0.1);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Travel);
    tick(adapter, tree, source, 0.2);
    tick(adapter, tree, source, 0.3);

    expect(source.records[0]?.nourishment).toBe(28);
    expect(source.records[0]?.nourishmentCalls).toBe(1);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
    const postMealState = visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 777);
    expect(
      postMealState === BigTreeVisitState.Leaving || postMealState === BigTreeVisitState.Cooldown,
    ).toBe(true);

    tick(adapter, tree, source, 0.4);
    tick(adapter, tree, source, 0.5);
    expect(source.records[0]?.nourishmentCalls).toBe(1);
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 777)).toBe(BigTreeVisitState.Cooldown);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Normal);

    source.records[0]!.hunger = 1;
    tick(adapter, tree, source, 1);
    const out = stats();
    adapter.readStats(out);
    expect(out.acceptedVisits).toBe(1); // revisit cooldown blocks immediate camping
    expect(out.completedMeals).toBe(1);
    expect(out.consumedFruit).toBe(1);
  });

  test('two hungry fauna cannot duplicate one nutrition award', () => {
    const source = new FakeFaunaSource([10, 20]);
    const tree = new FakeTreeFood();
    const visits = makeVisits(2);
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 2, pollIntervalSeconds: 0.01, activeCapacity: 2 },
    );

    for (let step = 0; step < 6; step++) tick(adapter, tree, source, step * 0.1);
    const nourishmentCalls = source.records.reduce(
      (sum, record) => sum + record.nourishmentCalls,
      0,
    );
    const nourishment = source.records.reduce((sum, record) => sum + record.nourishment, 0);
    expect(nourishmentCalls).toBe(1);
    expect(nourishment).toBe(28);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
  });

  test('an airborne fauna body cannot consume until its XYZ interaction point is reachable', () => {
    const source = new FakeFaunaSource([11], 0);
    source.records[0]!.y = 100;
    const tree = new FakeTreeFood();
    const visits = makeVisits();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01, foodReachRadius: 4 },
    );

    tick(adapter, tree, source, 0);
    tick(adapter, tree, source, 0.1);
    expect(source.records[0]?.nourishmentCalls).toBe(0);
    expect(tree.edibleResources.get(10)?.state).toBe('reserved');
    expect(source.records[0]?.targetY).toBe(0);

    // Reaching the same canonical interaction point in all three axes permits exactly one meal.
    source.records[0]!.y = 0;
    tick(adapter, tree, source, 0.2, 0);
    expect(source.records[0]?.nourishmentCalls).toBe(1);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
  });

  test('death cancels the exact reservation, clears intent, and removes the visit record', () => {
    const source = new FakeFaunaSource([42], 100);
    const tree = new FakeTreeFood();
    const visits = makeVisits();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01 },
    );
    tick(adapter, tree, source, 0, 0);
    expect(tree.edibleResources.get(10)?.state).toBe('reserved');
    source.records[0]!.alive = false;
    tick(adapter, tree, source, 0.1, 0);
    expect(tree.edibleResources.get(10)?.state).toBe('available');
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 42)).toBe(BigTreeVisitState.Outside);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Normal);
    expect(source.records[0]?.clearCalls).toBeGreaterThan(0);
  });

  test('reset clears active and cooldown-only fauna without resetting shared authored slots', () => {
    const source = new FakeFaunaSource([8]);
    const tree = new FakeTreeFood();
    const visits = makeVisits();
    const slotCount = visits.slotCount;
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01 },
    );
    for (let step = 0; step < 6; step++) tick(adapter, tree, source, step * 0.1);
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 8)).toBe(BigTreeVisitState.Cooldown);
    adapter.reset();
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 8)).toBe(BigTreeVisitState.Outside);
    expect(visits.slotCount).toBe(slotCount);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning'); // consumed food remains tree-owned
  });

  test('candidate discovery stays at the authored budget with 50,000 fauna slots', () => {
    let reads = 0;
    const huge: BigTreeFaunaSource = {
      bigTreeVisitorSlotCount: 50_000,
      readBigTreeVisitor(slot, out) {
        reads++;
        out.ownerId = slot;
        out.alive = true;
        out.x = 100;
        out.y = 0;
        out.z = 100;
        out.hunger = 0;
        out.fatigue = 0;
        out.healthDeficit = 0;
        out.stress = 0;
        out.socialNeed = 0;
        out.curiosity = 0;
        return true;
      },
      setBigTreeVisitorIntent: () => true,
      nourishBigTreeVisitor: () => true,
      clearBigTreeVisitorIntent: () => true,
    };
    const tree = new FakeTreeFood();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      makeVisits(),
      [bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, huge)],
      { pollBudget: 7, pollIntervalSeconds: 1 },
    );
    tree.setTime(0);
    adapter.update(0, 0, { foodAvailable: true });
    const out = stats();
    adapter.readStats(out);
    expect(reads).toBe(7);
    expect(out.lastPollCount).toBe(7);
    expect(out.activeVisitors).toBe(0);
  });

  test('non-food contextual activity uses real calm intent and still has a hard dwell bound', () => {
    const source = new FakeFaunaSource([19]);
    source.records[0]!.hunger = 0;
    const originalRead = source.readBigTreeVisitor.bind(source);
    source.readBigTreeVisitor = (slot, out) => {
      if (!originalRead(slot, out)) return false;
      out.fatigue = 1;
      return true;
    };
    const tree = new FakeTreeFood();
    const visits = makeVisits();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [bindBigTreeFauna(BIG_TREE_OWNER_PUPPET_MASTER, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01 },
    );
    for (let step = 0; step < 4; step++) tick(adapter, tree, source, step * 0.1);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Calm);
    expect(source.records[0]?.restSeconds).toBeGreaterThan(0);
    expect(
      visits.readVisit(BIG_TREE_OWNER_PUPPET_MASTER, 19, {
        recordId: -1,
        ownerKind: 0,
        ownerId: 0,
        state: BigTreeVisitState.Outside,
        reason: 0 as never,
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
        insideZone: false,
        lastTransitionCause: 0,
        lastTransitionAt: 0,
      }),
    ).toBe(true);
    tick(adapter, tree, source, 0.8);
    tick(adapter, tree, source, 0.9);
    expect(source.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Normal);
    expect(visits.stateOf(BIG_TREE_OWNER_PUPPET_MASTER, 19)).toBe(BigTreeVisitState.Cooldown);
  });

  test('different canonical fauna species form one reciprocal leased social pair and clean up', () => {
    const shoggoths = new FakeFaunaSource([101], -3);
    const titans = new FakeFaunaSource([202], 3);
    for (const source of [shoggoths, titans]) {
      source.records[0]!.hunger = 0;
      const originalRead = source.readBigTreeVisitor.bind(source);
      source.readBigTreeVisitor = (slot, out) => {
        if (!originalRead(slot, out)) return false;
        out.socialNeed = 1;
        out.curiosity = 0;
        return true;
      };
    }
    const tree = new FakeTreeFood();
    const visits = makeVisits(2);
    const adapter = new BigTreeFaunaVisitors(
      tree,
      visits,
      [
        bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, shoggoths),
        bindBigTreeFauna(BIG_TREE_OWNER_TITAN, titans),
      ],
      {
        pollBudget: 2,
        pollIntervalSeconds: 0.01,
        activeCapacity: 2,
        socialLeaseSeconds: 0.4,
        socialReachRadius: 10,
      },
    );

    tick(adapter, tree, shoggoths, 0, 0);
    // The generic adapter owns both sources; advance neither fake because both already occupy their
    // authored social slots. A second scheduler tick enters and pairs them.
    tree.setTime(0.1);
    adapter.update(0.1, 0.1, { foodAvailable: true });
    const shoggothView = visitorView();
    const titanView = visitorView();
    expect(adapter.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 101, shoggothView)).toBe(true);
    expect(adapter.readVisitor(BIG_TREE_OWNER_TITAN, 202, titanView)).toBe(true);
    expect(shoggothView.activity).toBe(BigTreeActivity.Socialize);
    expect([shoggothView.partnerKind, shoggothView.partnerId]).toEqual([BIG_TREE_OWNER_TITAN, 202]);
    expect([titanView.partnerKind, titanView.partnerId]).toEqual([BIG_TREE_OWNER_SHOGGOTH, 101]);

    tree.setTime(0.2);
    adapter.update(0.2, 0.1, { foodAvailable: true });
    expect(shoggoths.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Social);
    expect(titans.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Social);

    expect(adapter.cancel(BIG_TREE_OWNER_SHOGGOTH, 101)).toBe(true);
    expect(adapter.readVisitor(BIG_TREE_OWNER_TITAN, 202, titanView)).toBe(true);
    expect(titanView.partnerId).toBe(-1);
    tree.setTime(0.3);
    adapter.update(0.3, 0.1, { foodAvailable: true });
    expect(titans.records[0]?.mode).toBe(BigTreeFaunaIntentMode.Calm);
  });
});
