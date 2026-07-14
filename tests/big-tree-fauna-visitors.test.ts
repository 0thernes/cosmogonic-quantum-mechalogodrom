import { describe, expect, test } from 'bun:test';
import {
  BigTreeFaunaVisitors,
  bigTreeFaunaFoodOwnerId,
  type BigTreeFaunaVisitorStats,
  type BigTreeFaunaVisitorView,
} from '../src/sim/big-tree-fauna-visitors';
import {
  BIG_TREE_OWNER_APEX,
  BIG_TREE_OWNER_LEVIATHAN,
  BIG_TREE_OWNER_PUPPET,
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
  type BigTreeFaunaActor,
  type BigTreeFaunaCategory,
  type BigTreeFaunaOwnerKind,
  type BigTreeFaunaSource,
  type BigTreeFaunaSourceBinding,
} from '../src/sim/big-tree-fauna-source';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  BigTreeZone,
} from '../src/sim/big-tree-zone';
import type { BigTreeFoodSource, BigTreeVisitorEnvironment } from '../src/sim/big-tree-visitors';
import {
  EDIBLE_RESOURCE_RESPAWN_SECONDS,
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResourceDefinition,
  type EdibleResourceKind,
} from '../src/sim/edible-resource';

const OWNER_KINDS: readonly BigTreeFaunaOwnerKind[] = [
  BIG_TREE_OWNER_SHOGGOTH,
  BIG_TREE_OWNER_TITAN,
  BIG_TREE_OWNER_LEVIATHAN,
  BIG_TREE_OWNER_PUPPET,
  BIG_TREE_OWNER_APEX,
];

const CATEGORIES: readonly BigTreeFaunaCategory[] = [
  'shoggoth',
  'titan',
  'leviathan',
  'puppet',
  'apex',
];

class FakeTree implements BigTreeFoodSource {
  readonly edibleResources: EdibleResourceRegistry;
  now = 0;
  completeCalls = 0;

  constructor(definitions: readonly EdibleResourceDefinition[]) {
    this.edibleResources = new EdibleResourceRegistry(definitions);
  }

  tick(now: number): void {
    this.now = now;
    this.edibleResources.update(now);
  }

  reserveFood(
    ownerId: number,
    leaseSeconds = 8,
    kind?: EdibleResourceKind,
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
    this.completeCalls++;
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

class FakeFaunaSource implements BigTreeFaunaSource {
  readonly actors: BigTreeFaunaActor[];
  readCalls = 0;
  writeCalls = 0;
  nutritionAwards = 0;

  constructor(actors: BigTreeFaunaActor[]) {
    this.actors = actors;
  }

  get bigTreeActorCount(): number {
    return this.actors.length;
  }

  readBigTreeActor(index: number, out: BigTreeFaunaActor): boolean {
    this.readCalls++;
    const actor = this.actors[index];
    if (!actor) return false;
    Object.assign(out, actor);
    return true;
  }

  writeBigTreeActor(index: number, actor: Readonly<BigTreeFaunaActor>): boolean {
    this.writeCalls++;
    const target = this.actors[index];
    if (!target || target.ownerId !== actor.ownerId || target.category !== actor.category)
      return false;
    target.vx = actor.vx;
    target.vy = actor.vy;
    target.vz = actor.vz;
    target.energy = actor.energy;
    target.aggressionSuppressed = actor.aggressionSuppressed;
    return true;
  }

  nourishBigTreeActor(index: number, normalizedNutrition: number): boolean {
    const actor = this.actors[index];
    if (!actor || !Number.isFinite(normalizedNutrition) || normalizedNutrition <= 0) return false;
    actor.energy = Math.min(actor.maxEnergy, actor.energy + normalizedNutrition * actor.maxEnergy);
    this.nutritionAwards++;
    return true;
  }

  setBigTreeActorControlled(index: number, controlled: boolean): boolean {
    const actor = this.actors[index];
    if (!actor) return false;
    actor.aggressionSuppressed = controlled;
    return true;
  }

  integrate(dt: number): void {
    for (const actor of this.actors) {
      actor.x += actor.vx * dt;
      actor.y += actor.vy * dt;
      actor.z += actor.vz * dt;
    }
  }
}

function actor(
  ownerId: number,
  category: BigTreeFaunaCategory,
  x = 0,
  y = 0,
  energy = 0,
): BigTreeFaunaActor {
  return {
    ownerId,
    category,
    locomotion: 'flight',
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    energy,
    maxEnergy: 1,
    alive: true,
    fatigue: 1 - energy,
    socialDrive: 0.35,
    health: 1,
    maxHealth: 1,
    danger: 0,
    criticalNeed: energy <= 0.08,
    moveSpeed: 20,
    aggressionSuppressed: false,
  };
}

function food(id: number, kind: EdibleResourceKind, x = 0, y = 0): EdibleResourceDefinition {
  return {
    id,
    kind,
    position: { x, y: y + 8, z: 0 },
    interactionPoint: { x, y, z: 0 },
    nourishment: kind === 'fruit' ? 28 : 14,
  };
}

function manager(capacity: number, dwellSeconds = 2): BigTreeVisitManager {
  return new BigTreeVisitManager(
    new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 30, exitRadius: 35 }),
    {
      maxActors: 256,
      capacity,
      maxSlots: 64,
      arriveRadius: 1.5,
      minDwellSeconds: dwellSeconds,
      maxDwellSeconds: dwellSeconds,
      minCooldownSeconds: 2,
      maxCooldownSeconds: 2,
      travelTimeoutSeconds: 8,
      leaveTimeoutSeconds: 3,
      slotLeaseSeconds: 4,
      stuckAfterSeconds: 2,
      maxStuckRecoveries: 1,
    },
  );
}

function binding(
  ownerKind: BigTreeFaunaOwnerKind,
  category: BigTreeFaunaCategory,
  source: BigTreeFaunaSource,
): BigTreeFaunaSourceBinding {
  return { ownerKind, category, source };
}

function adapter(
  tree: FakeTree,
  visits: BigTreeVisitManager,
  bindings: readonly BigTreeFaunaSourceBinding[],
  pollBudget = 32,
): BigTreeFaunaVisitors {
  return new BigTreeFaunaVisitors(tree, visits, bindings, {
    pollBudget,
    pollIntervalSeconds: 0.1,
    foodLeaseSeconds: 3,
    foodRetrySeconds: 0.1,
    foodSearchTimeoutSeconds: 0.4,
    foodReachRadius: 12,
    steeringGain: 8,
    restPerSecond: 0.1,
    restTarget: 0.8,
    socialLeaseSeconds: 0.5,
    socialReachRadius: 10,
    flightVisitY: 0.01,
  });
}

function tick(
  tree: FakeTree,
  visitors: BigTreeFaunaVisitors,
  now: number,
  dt: number,
  environment?: Readonly<BigTreeVisitorEnvironment>,
): void {
  tree.tick(now);
  visitors.update(now, dt, environment);
}

function stats(): BigTreeFaunaVisitorStats {
  return {
    activeVisitors: 0,
    activeShoggoths: 0,
    activeTitans: 0,
    activeLeviathans: 0,
    activePuppets: 0,
    activeApex: 0,
    lastPollCount: 0,
    totalPolls: 0,
    acceptedVisits: 0,
    completedMeals: 0,
    consumedFruit: 0,
    consumedLeaves: 0,
    targetLosses: 0,
    cancellations: 0,
    socialPairs: 0,
  };
}

function visitorView(): BigTreeFaunaVisitorView {
  return {
    ownerKind: BIG_TREE_OWNER_SHOGGOTH,
    ownerId: -1,
    category: 'shoggoth',
    sourceIndex: -1,
    state: BigTreeVisitState.Outside,
    activity: BigTreeActivity.None,
    slotId: -1,
    foodId: -1,
    foodKind: null,
    foodState: null,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    normalizedEnergy: 0,
    partnerKind: -1,
    partnerId: -1,
  };
}

describe('BigTreeFaunaVisitors', () => {
  test('uses collision-free food ownership for every fauna category', () => {
    const owners = OWNER_KINDS.map((kind) => bigTreeFaunaFoodOwnerId(kind, 7));
    expect(new Set(owners).size).toBe(OWNER_KINDS.length);
    for (const owner of owners) expect(owner).toBeGreaterThanOrEqual(1_000_000_000);
    expect(bigTreeFaunaFoodOwnerId(BIG_TREE_OWNER_SHOGGOTH, -1)).toBe(-1);
  });

  test('Shoggoths, Titans, Leviathans, Puppeteers, and autonomous Apex bodies all eat canonically', () => {
    const definitions = [
      food(1, 'leaf', -4),
      food(2, 'fruit', -2),
      food(3, 'leaf', 0),
      food(4, 'fruit', 2),
      food(5, 'leaf', 4),
    ];
    const tree = new FakeTree(definitions);
    const visits = manager(5);
    const sources: FakeFaunaSource[] = [];
    const bindings: BigTreeFaunaSourceBinding[] = [];
    for (let index = 0; index < OWNER_KINDS.length; index++) {
      const x = -4 + index * 2;
      visits.addSlot(BigTreeSlotKind.Eat, x, 0);
      const source = new FakeFaunaSource([actor(0, CATEGORIES[index]!, x)]);
      sources.push(source);
      bindings.push(binding(OWNER_KINDS[index]!, CATEGORIES[index]!, source));
    }
    const visitors = adapter(tree, visits, bindings);

    tick(tree, visitors, 0, 0);
    const out = stats();
    visitors.readStats(out);
    expect(out).toMatchObject({
      activeVisitors: 5,
      activeShoggoths: 1,
      activeTitans: 1,
      activeLeviathans: 1,
      activePuppets: 1,
      activeApex: 1,
    });

    tick(tree, visitors, 0.1, 0.1);
    visitors.readStats(out);
    expect(out).toMatchObject({ completedMeals: 5, consumedFruit: 2, consumedLeaves: 3 });
    expect(tree.completeCalls).toBe(5);
    expect(sources.reduce((sum, source) => sum + source.nutritionAwards, 0)).toBe(5);
    expect(sources.reduce((sum, source) => sum + source.actors[0]!.energy, 0)).toBeCloseTo(0.98, 8);
    for (const source of sources) expect(source.actors[0]!.aggressionSuppressed).toBe(true);
  });

  test('a simultaneous food race has one reward, one respawn deadline, and exact 5-second reuse', () => {
    const tree = new FakeTree([food(10, 'leaf')]);
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Eat, -1, 0);
    visits.addSlot(BigTreeSlotKind.Eat, 1, 0);
    const source = new FakeFaunaSource([actor(0, 'shoggoth', -1), actor(2, 'shoggoth', 1)]);
    const visitors = adapter(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', source)],
      2,
    );

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.1, 0.1);
    tick(tree, visitors, 0.2, 0.1);

    expect(source.actors[0]!.energy + source.actors[1]!.energy).toBeCloseTo(0.14, 8);
    expect(source.nutritionAwards).toBe(1);
    expect(tree.completeCalls).toBe(1);
    expect(tree.edibleResources.stats()).toMatchObject({ respawning: 1, pendingRespawns: 1 });
    tree.tick(0.1 + EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.001);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
    tree.tick(0.1 + EDIBLE_RESOURCE_RESPAWN_SECONDS);
    expect(tree.edibleResources.get(10)?.state).toBe('available');
    expect(tree.edibleResources.stats()).toMatchObject({ available: 1, pendingRespawns: 0 });
  });

  test('a visitor falls back to the other edible kind when its deterministic preference is empty', () => {
    const tree = new FakeTree([food(18, 'fruit')]);
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    // Shoggoth owner 0 prefers leaves; only fruit exists.
    const source = new FakeFaunaSource([actor(0, 'shoggoth')]);
    const visitors = adapter(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', source)],
      1,
    );

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.1, 0.1);

    expect(source.nutritionAwards).toBe(1);
    expect(source.actors[0]!.energy).toBeCloseTo(0.28, 8);
    expect(tree.edibleResources.get(18)?.state).toBe('respawning');
  });

  test('food search timeout starts on arrival rather than expiring during a legitimate journey', () => {
    const tree = new FakeTree([food(11, 'leaf')]);
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    const source = new FakeFaunaSource([actor(0, 'shoggoth', -40)]);
    const visitors = adapter(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', source)],
      1,
    );

    tick(tree, visitors, 0, 0);
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 0)).toBe(BigTreeVisitState.Travelling);
    tick(tree, visitors, 1, 1);
    expect(tree.completeCalls).toBe(0);
    source.actors[0]!.x = 0;
    source.actors[0]!.y = 0;
    tick(tree, visitors, 1.1, 0.1);
    expect(tree.completeCalls).toBe(1);
    expect(source.actors[0]!.energy).toBeCloseTo(0.14, 8);
  });

  test('flight steering must reach the real interaction altitude before food can be consumed', () => {
    const tree = new FakeTree([food(12, 'leaf', 0, 0)]);
    const visits = manager(1, 5);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    const source = new FakeFaunaSource([actor(0, 'leviathan', 0, 8)]);
    const visitors = new BigTreeFaunaVisitors(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_LEVIATHAN, 'leviathan', source)],
      {
        pollBudget: 1,
        pollIntervalSeconds: 0.05,
        foodLeaseSeconds: 3,
        foodRetrySeconds: 0.05,
        foodSearchTimeoutSeconds: 4,
        foodReachRadius: 0.5,
        steeringGain: 8,
        flightVisitY: 0.01,
      },
    );

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.05, 0.05);
    expect(tree.completeCalls).toBe(0);
    expect(source.actors[0]!.vy).toBeLessThan(0);
    for (let step = 2; step < 80 && tree.completeCalls === 0; step++) {
      source.integrate(0.05);
      tick(tree, visitors, step * 0.05, 0.05);
    }
    expect(tree.completeCalls).toBe(1);
    expect(source.actors[0]!.y).toBeLessThanOrEqual(0.5);
  });

  test('completed visitors leave, release control, and observe the shared revisit cooldown', () => {
    const tree = new FakeTree([food(13, 'fruit')]);
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    const source = new FakeFaunaSource([actor(0, 'titan')]);
    const visitors = adapter(tree, visits, [binding(BIG_TREE_OWNER_TITAN, 'titan', source)], 1);

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.1, 0.1);
    expect(visits.stateOf(BIG_TREE_OWNER_TITAN, 0)).toBe(BigTreeVisitState.Leaving);
    expect(source.actors[0]!.aggressionSuppressed).toBe(true);
    source.actors[0]!.x = 40;
    tick(tree, visitors, 0.2, 0.1);
    expect(visits.stateOf(BIG_TREE_OWNER_TITAN, 0)).toBe(BigTreeVisitState.Cooldown);
    expect(visitors.activeVisitors).toBe(0);
    expect(source.actors[0]!.aggressionSuppressed).toBe(false);
    tick(tree, visitors, 2.19, 0);
    expect(visits.stateOf(BIG_TREE_OWNER_TITAN, 0)).toBe(BigTreeVisitState.Cooldown);
    tick(tree, visitors, 2.2, 0, { foodAvailable: false });
    expect(visits.stateOf(BIG_TREE_OWNER_TITAN, 0)).toBe(BigTreeVisitState.Outside);
  });

  test('cross-species social partners pair, then partner loss releases both reservations safely', () => {
    const tree = new FakeTree([food(14, 'fruit')]);
    const visits = manager(2, 1);
    visits.addSlot(BigTreeSlotKind.Socialize, -2, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 2, 0);
    const shoggoth = new FakeFaunaSource([actor(0, 'shoggoth', -2, 0, 1)]);
    const puppet = new FakeFaunaSource([actor(0, 'puppet', 2, 0, 1)]);
    shoggoth.actors[0]!.socialDrive = 1;
    puppet.actors[0]!.socialDrive = 1;
    const visitors = adapter(tree, visits, [
      binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', shoggoth),
      binding(BIG_TREE_OWNER_PUPPET, 'puppet', puppet),
    ]);
    const environment: BigTreeVisitorEnvironment = {
      socialNeed: 1,
      curiosity: 0,
      foodAvailable: false,
    };

    tick(tree, visitors, 0, 0, environment);
    tick(tree, visitors, 0.1, 0.1, environment);
    const first = visitorView();
    const second = visitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 0, first)).toBe(true);
    expect(visitors.readVisitor(BIG_TREE_OWNER_PUPPET, 0, second)).toBe(true);
    expect(first.activity).toBe(BigTreeActivity.Socialize);
    expect(first.partnerKind).toBe(BIG_TREE_OWNER_PUPPET);
    expect(second.partnerKind).toBe(BIG_TREE_OWNER_SHOGGOTH);

    puppet.actors[0]!.alive = false;
    tick(tree, visitors, 0.2, 0.1, environment);
    expect(visitors.readVisitor(BIG_TREE_OWNER_PUPPET, 0, second)).toBe(false);
    expect(visitors.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 0, first)).toBe(true);
    expect(first.partnerKind).toBe(-1);
    visitors.reset();
    expect(shoggoth.actors[0]!.aggressionSuppressed).toBe(false);
    expect(visits.trackedActors).toBe(0);
  });

  test('reset releases active food, locomotion control, slots, and visit records', () => {
    const tree = new FakeTree([food(15, 'leaf', 0, 0)]);
    const visits = manager(1, 5);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    const source = new FakeFaunaSource([actor(0, 'apex', 0, 20)]);
    const visitors = adapter(tree, visits, [binding(BIG_TREE_OWNER_APEX, 'apex', source)], 1);

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.1, 0.1);
    expect(tree.edibleResources.get(15)?.state).toBe('reserved');
    expect(source.actors[0]!.aggressionSuppressed).toBe(true);
    visitors.reset();

    expect(tree.edibleResources.get(15)?.state).toBe('available');
    expect(source.actors[0]!.aggressionSuppressed).toBe(false);
    expect(visitors.activeVisitors).toBe(0);
    expect(visits.trackedActors).toBe(0);
  });

  test('candidate discovery is bounded by poll budget under stress-level fauna counts', () => {
    const tree = new FakeTree([food(16, 'leaf')]);
    const visits = manager(8);
    for (let index = 0; index < 8; index++) visits.addSlot(BigTreeSlotKind.Eat, index, 0);
    const population = Array.from({ length: 20_000 }, (_, index) =>
      actor(index, 'shoggoth', index % 20),
    );
    const source = new FakeFaunaSource(population);
    const visitors = adapter(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', source)],
      32,
    );
    const out = stats();

    tick(tree, visitors, 0, 0);
    visitors.readStats(out);
    expect(out.lastPollCount).toBe(32);
    expect(out.totalPolls).toBe(32);
    expect(source.readCalls).toBe(32);
    expect(out.activeVisitors).toBeLessThanOrEqual(8);
  });

  test('view output exposes visit reason/activity and real reservation ownership', () => {
    const tree = new FakeTree([food(17, 'fruit')]);
    const visits = manager(1, 5);
    visits.addSlot(BigTreeSlotKind.Eat, 0, 0);
    const source = new FakeFaunaSource([actor(7, 'shoggoth', 0, 20)]);
    const visitors = adapter(
      tree,
      visits,
      [binding(BIG_TREE_OWNER_SHOGGOTH, 'shoggoth', source)],
      1,
    );
    const view = visitorView();

    tick(tree, visitors, 0, 0);
    tick(tree, visitors, 0.1, 0.1);
    expect(visitors.readVisitor(BIG_TREE_OWNER_SHOGGOTH, 7, view)).toBe(true);
    expect(view).toMatchObject({
      category: 'shoggoth',
      activity: BigTreeActivity.Eat,
      foodId: 17,
      foodKind: 'fruit',
      foodState: 'reserved',
    });
    expect(visits.stateOf(BIG_TREE_OWNER_SHOGGOTH, 7)).not.toBe(BigTreeVisitState.Outside);
    expect(BigTreeVisitReason.Food).toBe(1);
  });
});
