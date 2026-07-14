import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_OWNER_ORDINARY,
  BIG_TREE_OWNER_XENOMIMIC,
  BigTreeSpeciesVisitors,
  bigTreeFoodOwnerId,
  ordinaryBigTreeOwnerId,
  xenomimicBigTreeOwnerId,
  type BigTreeFoodSource,
  type BigTreeOrdinaryBody,
  type BigTreeSpeciesVisitorStats,
  type BigTreeSpeciesVisitorView,
  type BigTreeVisitorActivityCallbacks,
  type BigTreeVisitorBody,
  type BigTreeVisitorConfig,
  type BigTreeVisitorEnvironment,
  type BigTreeXenomimicBody,
} from '../src/sim/big-tree-visitors';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeTransitionCause,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  BigTreeZone,
} from '../src/sim/big-tree-zone';
import {
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResourceDefinition,
  type EdibleResourceKind,
} from '../src/sim/edible-resource';
import { XenomimicVisitMode } from '../src/sim/xenomimics';

const FOODS: readonly EdibleResourceDefinition[] = [
  {
    id: 10,
    kind: 'fruit',
    position: { x: -10, y: 8, z: 0 },
    interactionPoint: { x: -10, y: 0, z: 0 },
    nourishment: 28,
  },
  {
    id: 20,
    kind: 'leaf',
    position: { x: 10, y: 6, z: 0 },
    interactionPoint: { x: 10, y: 0, z: 0 },
    nourishment: 14,
  },
];

class FakeTree implements BigTreeFoodSource {
  readonly edibleResources: EdibleResourceRegistry;
  now = 0;
  completeCalls = 0;
  releaseOwnerCalls = 0;

  constructor(definitions: readonly EdibleResourceDefinition[] = FOODS) {
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
    this.releaseOwnerCalls++;
    return this.edibleResources.releaseOwner(ownerId);
  }
}

function manager(capacity = 4, maxActors = 64): BigTreeVisitManager {
  return new BigTreeVisitManager(
    new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 30, exitRadius: 35 }),
    {
      maxActors,
      capacity,
      maxSlots: 24,
      arriveRadius: 1.5,
      minDwellSeconds: 1,
      maxDwellSeconds: 1,
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

function adapter(
  tree: FakeTree,
  visits: BigTreeVisitManager,
  pollBudget = 8,
  activityCallbacks: BigTreeVisitorActivityCallbacks | null = null,
  config: BigTreeVisitorConfig = {},
): BigTreeSpeciesVisitors {
  return new BigTreeSpeciesVisitors(
    tree,
    visits,
    {
      pollBudget,
      pollIntervalSeconds: 0.1,
      foodLeaseSeconds: 3,
      foodRetrySeconds: 0.1,
      foodSearchTimeoutSeconds: 0.4,
      foodReachRadius: 1.5,
      ordinarySpeed: 20,
      xenomimicSpeed: 20,
      steeringGain: 8,
      socialLeaseSeconds: 0.4,
      ...config,
    },
    activityCallbacks,
  );
}

function ordinary(id: number, x: number, energy = 0, y = 0): BigTreeOrdinaryBody {
  return {
    id,
    position: { x, y, z: 0 },
    rotation: { y: 0 },
    userData: {
      energy,
      belly: 0,
      age: 0,
      life: 100,
      alive: true,
      strategy: 0,
      vel: { x: 0, y: 0, z: 0 },
    },
  };
}

function xenomimic(pairId: number, role: 0 | 1, x: number, energy = 0): BigTreeXenomimicBody {
  return {
    pairId,
    role,
    x,
    z: 0,
    vx: 0,
    vz: 0,
    heading: 0,
    energy,
    age: 0,
    alive: true,
    shimmer: 0,
  };
}

function tick(
  tree: FakeTree,
  visitors: BigTreeSpeciesVisitors,
  now: number,
  dt: number,
  ordinaryBodies: readonly BigTreeOrdinaryBody[],
  xenomimics: readonly BigTreeXenomimicBody[],
  environment?: Readonly<BigTreeVisitorEnvironment>,
): void {
  tree.tick(now);
  visitors.update(now, dt, ordinaryBodies, xenomimics, environment);
}

function emptyVisitorView(): BigTreeSpeciesVisitorView {
  return {
    ownerKind: -1,
    ownerId: -1,
    foodOwnerId: -1,
    state: BigTreeVisitState.Outside,
    reason: 5,
    activity: 0,
    slotId: -1,
    foodId: -1,
    foodKind: null,
    foodState: null,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    energy: 0,
    eating: false,
    partnerKind: -1,
    partnerId: -1,
    lastTransitionCause: BigTreeTransitionCause.None,
    lastTransitionAt: 0,
  };
}

function emptyStats(): BigTreeSpeciesVisitorStats {
  return {
    activeVisitors: 0,
    activeOrdinary: 0,
    activeXenomimics: 0,
    lastPollCount: 0,
    totalPolls: 0,
    acceptedVisits: 0,
    completedMeals: 0,
    consumedFruit: 0,
    consumedLeaves: 0,
    targetLosses: 0,
    cancellations: 0,
    zoneCapacity: 0,
    socialPairs: 0,
    policyTransfers: 0,
    completedVisits: 0,
    timedOutVisits: 0,
    stuckRecoveries: 0,
    forcedExits: 0,
    partnerTimeouts: 0,
    rejectedForCapacity: 0,
    rejectedForNoSlot: 0,
    availableSlots: 0,
  };
}

describe('BigTreeSpeciesVisitors', () => {
  test('low-need ordinary and Xenomimic entrants are adopted as bounded Safety observers', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Observe, -5, 0);
    visits.addSlot(BigTreeSlotKind.Observe, 5, 0);
    const visitors = adapter(tree, visits);
    // These stable identities have low deterministic social/curiosity scores; neither has hunger,
    // fatigue, danger, or stress, so only physical sanctuary entry justifies the visit.
    const entity = ordinary(1, -5, 100);
    const xeno = xenomimic(0, 0, 5, 1);
    const quiet: BigTreeVisitorEnvironment = {
      danger: 0,
      stress: 0,
      socialNeed: 0,
      curiosity: 0,
      simulationLoad: 1,
      foodAvailable: false,
    };

    tick(tree, visitors, 0, 0, [entity], [xeno], quiet);

    const ordinaryView = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, entity.id, 0, ordinaryView)).toBe(true);
    expect(ordinaryView.reason).toBe(BigTreeVisitReason.Safety);
    expect(ordinaryView.activity).toBe(BigTreeActivity.Observe);
    const xenoView = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_XENOMIMIC, 0, 0, xenoView)).toBe(true);
    expect(xenoView.reason).toBe(BigTreeVisitReason.Safety);
    expect(xenoView.activity).toBe(BigTreeActivity.Observe);
    expect(visitors.activeVisitors).toBe(2);
  });

  test('leave timeout retains calm radial egress through cooldown until a real outer exit', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Observe, 5, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, 5, 100);
    const quiet: BigTreeVisitorEnvironment = {
      danger: 0,
      stress: 0,
      socialNeed: 0,
      curiosity: 0,
      simulationLoad: 1,
      foodAvailable: false,
    };

    tick(tree, visitors, 0, 0, [entity], [], quiet);
    tick(tree, visitors, 0.1, 0.1, [entity], [], quiet);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Active);

    // The one-second dwell and then the three-second leave deadline both expire while the fake body
    // remains blocked at x=5. Cooldown bounds the lifecycle but must not drop egress authority.
    tick(tree, visitors, 1.11, 0, [entity], [], quiet);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Leaving);
    tick(tree, visitors, 4.12, 0.1, [entity], [], quiet);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    expect(visitors.activeVisitors).toBe(1);
    const cooldownView = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, entity.id, 4.12, cooldownView)).toBe(true);
    expect(cooldownView.targetX).toBeGreaterThan(visits.zone.exitRadius);
    expect(cooldownView.targetZ).toBeCloseTo(0);
    expect(entity.userData.vel.x).toBeGreaterThan(0);

    // Only a real outer-boundary crossing releases adapter control. Re-entering before the cooldown
    // ends does not create another visit or reservation.
    entity.position.x = 36;
    tick(tree, visitors, 4.2, 0, [entity], [], quiet);
    expect(visitors.activeVisitors).toBe(0);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    entity.position.x = 5;
    tick(tree, visitors, 4.3, 0, [entity], [], quiet);
    expect(visitors.activeVisitors).toBe(0);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    const out = emptyStats();
    visitors.readStats(out);
    expect(out.acceptedVisits).toBe(1);
  });

  test('launched NHI bodies use their dedicated source while ordinary NHI minions can eat', () => {
    const tree = new FakeTree([FOODS[0]!]);
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);
    const launched = ordinary(101, 10, 0);
    launched.userData.isNhi = true;
    const minion = ordinary(102, -10, 0);
    minion.userData.nhiMinion = true;

    tick(tree, visitors, 0, 0, [launched, minion], []);

    expect(visitors.activeVisitors).toBe(1);
    expect(tree.edibleResources.get(10)?.state).toBe('reserved');
    expect(launched.userData.treeVisit).toBeUndefined();
    expect(minion.userData.treeVisit).toBe(true);

    tick(tree, visitors, 0.1, 0.1, [launched, minion], []);

    expect(minion.userData.energy).toBe(28);
    expect(minion.userData.belly).toBe(24);
    expect(tree.completeCalls).toBe(1);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
  });

  test('ordinary organisms and Xenomimics discover, travel to, and eat fruit and leaves once', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    visits.addSlot(BigTreeSlotKind.Eat, 10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, -10);
    const xeno = xenomimic(0, 1, 10);

    expect(ordinaryBigTreeOwnerId(entity)).toBe(1);
    expect(xenomimicBigTreeOwnerId(xeno)).toBe(1);
    expect(bigTreeFoodOwnerId(BIG_TREE_OWNER_ORDINARY, 1)).not.toBe(
      bigTreeFoodOwnerId(BIG_TREE_OWNER_XENOMIMIC, 1),
    );

    tick(tree, visitors, 0, 0, [entity], [xeno]);
    expect(visitors.activeVisitors).toBe(2);
    expect(tree.edibleResources.get(10)?.state).toBe('reserved');
    expect(tree.edibleResources.get(20)?.state).toBe('reserved');

    tick(tree, visitors, 0.1, 0.1, [entity], [xeno]);
    expect(entity.userData.energy).toBe(28);
    expect(entity.userData.belly).toBe(24);
    expect(xeno.energy).toBeCloseTo(0.14, 8);
    expect(xeno.shimmer).toBe(1);
    expect(tree.completeCalls).toBe(2);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
    expect(tree.edibleResources.get(20)?.state).toBe('respawning');

    const stats = emptyStats();
    visitors.readStats(stats);
    expect(stats).toMatchObject({ completedMeals: 2, consumedFruit: 1, consumedLeaves: 1 });
    tick(tree, visitors, 0.2, 0.1, [entity], [xeno]);
    expect(entity.userData.energy).toBe(28);
    expect(xeno.energy).toBeCloseTo(0.14, 8);
    expect(tree.completeCalls).toBe(2);
  });

  test('ordinary organisms must reach the food interaction Y before nutrition is awarded', () => {
    const tree = new FakeTree([
      {
        id: 30,
        kind: 'fruit',
        position: { x: -10, y: 18, z: 0 },
        interactionPoint: { x: -10, y: 6, z: 0 },
        nourishment: 28,
      },
    ]);
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, -10, 0, 30);

    tick(tree, visitors, 0, 0, [entity], []);
    tick(tree, visitors, 0.1, 0.1, [entity], []);

    // X/Z already match exactly, but a dome organism 24 units above the authored approach point
    // cannot consume through the canopy. Steering carries the real interaction Y downward.
    expect(entity.userData.energy).toBe(0);
    expect(entity.userData.vel.y).toBeLessThan(0);
    expect(tree.completeCalls).toBe(0);
    expect(tree.edibleResources.get(30)?.state).toBe('reserved');
    const view = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, entity.id, 0.1, view)).toBe(true);
    expect(view.targetY).toBe(6);
    expect(view.lastTransitionCause).toBe(BigTreeTransitionCause.Arrived);
    expect(view.lastTransitionAt).toBe(0.1);

    entity.position.y = 6;
    tick(tree, visitors, 0.2, 0.1, [entity], []);
    expect(entity.userData.energy).toBe(28);
    expect(tree.completeCalls).toBe(1);
    expect(tree.edibleResources.get(30)?.state).toBe('respawning');
  });

  test('ordinary identity prefers the simulation ecology id over render-object construction order', () => {
    const first = ordinary(7, 0);
    const rebuiltVisual = ordinary(9_007, 0);
    first.userData.ecologyId = 42;
    rebuiltVisual.userData.ecologyId = 42;

    expect(ordinaryBigTreeOwnerId(first)).toBe(42);
    expect(ordinaryBigTreeOwnerId(rebuiltVisual)).toBe(42);
    delete rebuiltVisual.userData.ecologyId;
    expect(ordinaryBigTreeOwnerId(rebuiltVisual)).toBe(9_007);
  });

  test('a reservation race has one winner, one nutrition award, and no duplicate consumption', () => {
    const tree = new FakeTree([FOODS[0]!]);
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    visits.addSlot(BigTreeSlotKind.Eat, -8, 0);
    const visitors = adapter(tree, visits);
    const first = ordinary(1, -10);
    const second = ordinary(3, -8);

    tick(tree, visitors, 0, 0, [first, second], []);
    expect(visitors.activeVisitors).toBe(2);
    expect(tree.edibleResources.get(10)?.ownerId).toBe(
      bigTreeFoodOwnerId(BIG_TREE_OWNER_ORDINARY, first.id),
    );
    tick(tree, visitors, 0.1, 0.1, [first, second], []);
    tick(tree, visitors, 0.2, 0.1, [first, second], []);

    expect(first.userData.energy + second.userData.energy).toBe(28);
    expect(tree.completeCalls).toBe(1);
    const stats = emptyStats();
    visitors.readStats(stats);
    expect(stats.completedMeals).toBe(1);
    tree.tick(5.099);
    expect(tree.edibleResources.get(10)?.state).toBe('respawning');
    tree.tick(5.1);
    expect(tree.edibleResources.get(10)?.state).toBe('available');
  });

  test('target loss releases stale ownership, reselects another kind, and completes gracefully', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, -10);

    tick(tree, visitors, 0, 0, [entity], []);
    const foodOwner = bigTreeFoodOwnerId(BIG_TREE_OWNER_ORDINARY, entity.id);
    expect(tree.edibleResources.get(10)?.ownerId).toBe(foodOwner);
    expect(tree.edibleResources.releaseOwner(foodOwner)).toBe(1);
    expect(tree.edibleResources.get(10)?.state).toBe('available');

    // Reserve the preferred fruit elsewhere so retry falls back to the available leaf.
    expect(tree.edibleResources.reserveById(10, 999, 0.05, 3)).not.toBeNull();
    tick(tree, visitors, 0.1, 0.1, [entity], []);
    tick(tree, visitors, 0.2, 0.1, [entity], []);
    expect(entity.userData.vel.x).toBeGreaterThan(0);
    entity.position.x = 10;
    tick(tree, visitors, 0.3, 0.1, [entity], []);
    expect(entity.userData.energy).toBe(14);
    const stats = emptyStats();
    visitors.readStats(stats);
    expect(stats.targetLosses).toBeGreaterThanOrEqual(1);
    expect(stats.consumedLeaves).toBe(1);
    expect(tree.edibleResources.get(20)?.state).toBe('respawning');
  });

  test('meal visits leave, enter cooldown, and cannot immediately camp or re-enter', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, -10);

    tick(tree, visitors, 0, 0, [entity], []);
    tick(tree, visitors, 0.1, 0.1, [entity], []);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Leaving);
    entity.position.x = 40;
    tick(tree, visitors, 0.2, 0.1, [entity], []);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    expect(visitors.activeVisitors).toBe(0);

    tick(tree, visitors, 2.19, 0, [entity], []);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    tick(tree, visitors, 2.2, 0, [], []);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Outside);
  });

  test('social visitors pair peacefully and partner loss releases the survivor without trapping it', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    const visitors = adapter(tree, visits);
    const first = ordinary(10, -3, 100);
    const second = ordinary(11, 3, 100);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };

    tick(tree, visitors, 0, 0, [first, second], [], social);
    tick(tree, visitors, 0.1, 0.1, [first, second], [], social);
    const firstView = emptyVisitorView();
    const secondView = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, first.id, 0.1, firstView)).toBe(true);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, second.id, 0.1, secondView)).toBe(true);
    expect(firstView.partnerId).toBe(second.id);
    expect(secondView.partnerId).toBe(first.id);
    tick(tree, visitors, 0.2, 0.1, [first, second], [], social);
    expect(first.rotation?.y).toBeCloseTo(Math.PI / 2, 8);
    expect(second.rotation?.y).toBeCloseTo(-Math.PI / 2, 8);
    expect(first.userData.energy).toBe(100);
    expect(second.userData.energy).toBe(100);

    expect(visitors.cancelOrdinary(first)).toBe(true);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, second.id, 0.21, secondView)).toBe(true);
    expect(secondView.partnerId).toBe(-1);
    tick(tree, visitors, 1.1, 1, [second], [], social);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, second.id)).toBe(BigTreeVisitState.Leaving);
  });

  test('distant social visitors remain unpaired until a willing partner is within interaction reach', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -20, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 20, 0);
    const visitors = adapter(tree, visits, 8, null, { socialReachRadius: 10 });
    const first = ordinary(70, -20, 100);
    const second = ordinary(71, 20, 100);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };
    const view = emptyVisitorView();

    tick(tree, visitors, 0, 0, [first, second], [], social);
    tick(tree, visitors, 0.1, 0.1, [first, second], [], social);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, first.id, 0.1, view)).toBe(true);
    expect(view.partnerId).toBe(-1);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, second.id, 0.1, view)).toBe(true);
    expect(view.partnerId).toBe(-1);

    second.position.x = -15;
    tick(tree, visitors, 0.2, 0.1, [first, second], [], social);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, first.id, 0.2, view)).toBe(true);
    expect(view.partnerId).toBe(second.id);
  });

  test('social reach is three-dimensional and never pairs vertically distant bodies', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    const visitors = adapter(tree, visits, 8, null, { socialReachRadius: 10 });
    const low = ordinary(72, -3, 100, 0);
    const high = ordinary(73, 3, 100, 40);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };
    const view = emptyVisitorView();

    tick(tree, visitors, 0, 0, [low, high], [], social);
    tick(tree, visitors, 0.1, 0.1, [low, high], [], social);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, low.id, 0.1, view)).toBe(true);
    expect(view.partnerId).toBe(-1);

    high.position.y = 5;
    tick(tree, visitors, 0.2, 0.1, [low, high], [], social);
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, low.id, 0.2, view)).toBe(true);
    expect(view.partnerId).toBe(high.id);
  });

  test('Xenomimic locomotion remains Travel through cooldown egress until a real outer exit', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Socialize, 0, 0);
    const visitors = adapter(tree, visits);
    const xeno = xenomimic(80, 1, 0, 1);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };

    tick(tree, visitors, 0, 0, [], [xeno], social);
    expect(visitors.xenomimicLocomotionMode(xeno.pairId, xeno.role)).toBe(
      XenomimicVisitMode.Travel,
    );
    tick(tree, visitors, 0.1, 0.1, [], [xeno], social);
    expect(visitors.xenomimicLocomotionMode(xeno.pairId, xeno.role)).toBe(XenomimicVisitMode.Calm);
    tick(tree, visitors, 1.11, 1.01, [], [xeno], social);
    expect(visitors.xenomimicLocomotionMode(xeno.pairId, xeno.role)).toBe(
      XenomimicVisitMode.Travel,
    );
    tick(tree, visitors, 4.12, 0.1, [], [xeno], social);
    expect(visits.stateOf(BIG_TREE_OWNER_XENOMIMIC, xeno.pairId * 2 + xeno.role)).toBe(
      BigTreeVisitState.Cooldown,
    );
    expect(visitors.xenomimicLocomotionMode(xeno.pairId, xeno.role)).toBe(
      XenomimicVisitMode.Travel,
    );
    expect(Math.hypot(xeno.vx, xeno.vz)).toBeGreaterThan(0);

    xeno.x = 36;
    tick(tree, visitors, 4.2, 0, [], [xeno], social);
    expect(visitors.xenomimicLocomotionMode(xeno.pairId, xeno.role)).toBe(
      XenomimicVisitMode.Normal,
    );
  });

  test('activity callbacks receive reciprocal live partner identities and clear them after partner loss', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    const calls: Array<{
      ownerKind: number;
      ownerId: number;
      partnerKind: number;
      partnerId: number;
      body: BigTreeVisitorBody;
      activity: number;
      dt: number;
      now: number;
    }> = [];
    const callbacks: BigTreeVisitorActivityCallbacks = {
      performActivity(ownerKind, ownerId, partnerKind, partnerId, body, activity, dt, now) {
        calls.push({ ownerKind, ownerId, partnerKind, partnerId, body, activity, dt, now });
      },
    };
    const visitors = adapter(tree, visits, 8, callbacks);
    const first = ordinary(30, -3, 100);
    const second = ordinary(31, 3, 100);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };

    tick(tree, visitors, 0, 0, [first, second], [], social);
    tick(tree, visitors, 0.1, 0.1, [first, second], [], social);
    calls.length = 0;
    tick(tree, visitors, 0.2, 0.1, [first, second], [], social);

    expect(calls).toHaveLength(2);
    const firstCall = calls.find((call) => call.ownerId === first.id)!;
    const secondCall = calls.find((call) => call.ownerId === second.id)!;
    expect(firstCall).toMatchObject({
      ownerKind: BIG_TREE_OWNER_ORDINARY,
      partnerKind: BIG_TREE_OWNER_ORDINARY,
      partnerId: second.id,
      activity: BigTreeActivity.Socialize,
      dt: 0.1,
      now: 0.2,
    });
    expect(secondCall).toMatchObject({
      ownerKind: BIG_TREE_OWNER_ORDINARY,
      partnerKind: BIG_TREE_OWNER_ORDINARY,
      partnerId: first.id,
      activity: BigTreeActivity.Socialize,
    });
    expect(firstCall.body).toBe(first);
    expect(secondCall.body).toBe(second);

    expect(visitors.cancelOrdinary(first)).toBe(true);
    calls.length = 0;
    tick(tree, visitors, 0.3, 0.1, [second], [], social);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      ownerId: second.id,
      partnerKind: -1,
      partnerId: -1,
      activity: BigTreeActivity.Socialize,
    });
  });

  test('a new willing ordinary pair performs one real cooperative-policy transfer', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    const visitors = adapter(tree, visits);
    const teacher = ordinary(35, -3, 100);
    const learner = ordinary(36, 3, 100);
    teacher.userData.strategy = 0;
    learner.userData.strategy = 1;
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };
    const out = emptyStats();

    tick(tree, visitors, 0, 0, [teacher, learner], [], social);
    tick(tree, visitors, 0.1, 0.1, [teacher, learner], [], social);
    visitors.readStats(out);
    expect(Number(learner.userData.strategy)).toBe(0);
    expect(out.policyTransfers).toBe(1);

    // Lease renewals and activity callbacks are not additional teaching events.
    tick(tree, visitors, 0.2, 0.1, [teacher, learner], [], social);
    tick(tree, visitors, 0.3, 0.1, [teacher, learner], [], social);
    visitors.readStats(out);
    expect(out.policyTransfers).toBe(1);

    // The canonical Nash policy is body-owned, so it remains changed after partner cleanup.
    expect(visitors.cancelOrdinary(teacher)).toBe(true);
    expect(Number(learner.userData.strategy)).toBe(0);
  });

  test('mixed-species social pairs do not claim unsupported policy transfer', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Socialize, -3, 0);
    visits.addSlot(BigTreeSlotKind.Socialize, 3, 0);
    const visitors = adapter(tree, visits);
    const ordinaryVisitor = ordinary(37, -3, 100);
    ordinaryVisitor.userData.strategy = 1;
    const xeno = xenomimic(38, 0, 3, 1);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };
    const out = emptyStats();

    tick(tree, visitors, 0, 0, [ordinaryVisitor], [xeno], social);
    tick(tree, visitors, 0.1, 0.1, [ordinaryVisitor], [xeno], social);
    visitors.readStats(out);
    expect(ordinaryVisitor.userData.strategy).toBe(1);
    expect(out.policyTransfers).toBe(0);
  });

  test('activity callback stops when the bounded activity dwell time expires', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Socialize, 0, 0);
    let callbackCount = 0;
    const callbacks: BigTreeVisitorActivityCallbacks = {
      performActivity() {
        callbackCount++;
      },
    };
    const visitors = adapter(tree, visits, 8, callbacks);
    const entity = ordinary(40, 0, 100);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };

    tick(tree, visitors, 0, 0, [entity], [], social);
    tick(tree, visitors, 0.1, 0.1, [entity], [], social);
    expect(callbackCount).toBe(1);
    tick(tree, visitors, 1.11, 1.01, [entity], [], social);
    expect(callbackCount).toBe(1);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Leaving);
  });

  test('active membership helpers use stable identities and survive dense-array swap removal', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    visits.addSlot(BigTreeSlotKind.Eat, 10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(50, -10);
    const xeno = xenomimic(12, 1, 10);

    expect(visitors.isEntityVisitorActive(entity.id)).toBe(false);
    expect(visitors.isXenomimicVisitorActive(xeno.pairId, xeno.role)).toBe(false);
    tick(tree, visitors, 0, 0, [entity], [xeno]);
    expect(visitors.isEntityVisitorActive(entity.id)).toBe(true);
    expect(visitors.isXenomimicVisitorActive(xeno.pairId, xeno.role)).toBe(true);
    expect(visitors.isXenomimicVisitorActive(xeno.pairId, 0)).toBe(false);

    // Removing index zero swap-compacts the Xenomimic into it; its identity map must be rewritten.
    expect(visitors.cancelOrdinary(entity)).toBe(true);
    expect(visitors.isEntityVisitorActive(entity.id)).toBe(false);
    expect(visitors.isXenomimicVisitorActive(xeno.pairId, xeno.role)).toBe(true);
    expect(visitors.cancelXenomimic(xeno)).toBe(true);
    expect(visitors.isXenomimicVisitorActive(xeno.pairId, xeno.role)).toBe(false);
  });

  test('fatigued ordinary and Xenomimic visitors use canonical energy scales while resting', () => {
    const tree = new FakeTree();
    const visits = manager(2);
    visits.addSlot(BigTreeSlotKind.Rest, -5, 0);
    visits.addSlot(BigTreeSlotKind.Rest, 5, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(20, -5, 80, 17);
    entity.userData.age = entity.userData.life;
    const xeno = xenomimic(9, 0, 5, 0.8);
    xeno.age = 300;

    tick(tree, visitors, 0, 0, [entity], [xeno]);
    const view = emptyVisitorView();
    expect(visitors.readVisitor(BIG_TREE_OWNER_ORDINARY, entity.id, 0, view)).toBe(true);
    expect(view.targetY).toBe(17);
    tick(tree, visitors, 0.1, 0.5, [entity], [xeno]);
    expect(entity.userData.energy).toBe(82);
    expect(xeno.energy).toBeCloseTo(0.82, 8);
    expect(entity.userData.energy).toBeLessThanOrEqual(100);
    expect(xeno.energy).toBeLessThanOrEqual(1);
    expect(entity.userData.vel.y).toBe(0);
    expect(tree.completeCalls).toBe(0);
  });

  test('death/despawn and reset release food, slots, partners, and tracked object references', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);
    const entity = ordinary(1, -10);

    tick(tree, visitors, 0, 0, [entity], []);
    expect(tree.edibleResources.get(10)?.state).toBe('reserved');
    entity.userData.alive = false;
    tick(tree, visitors, 0.05, 0.05, [entity], []);
    expect(tree.edibleResources.get(10)?.state).toBe('available');
    expect(visitors.activeVisitors).toBe(0);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Outside);

    entity.userData.alive = true;
    tick(tree, visitors, 0.1, 0.05, [entity], []);
    expect(visitors.cancelOrdinary(entity.id)).toBe(true);
    visitors.reset();
    const stats = emptyStats();
    visitors.readStats(stats);
    expect(stats).toMatchObject({ activeVisitors: 0, acceptedVisits: 0, cancellations: 0 });
    expect(tree.edibleResources.get(10)?.state).toBe('available');
  });

  test('an unrelated ordinary death does not scan the complete tree food registry', () => {
    const tree = new FakeTree();
    const visits = manager(1);
    visits.addSlot(BigTreeSlotKind.Eat, -10, 0);
    const visitors = adapter(tree, visits);

    expect(visitors.cancelOrdinary(999_999)).toBe(false);
    expect(tree.releaseOwnerCalls).toBe(0);
  });

  test('ordinary-only and adapter-local resets preserve foreign shared-manager visitors', () => {
    const tree = new FakeTree();
    const visits = manager(3);
    visits.addRadialSlots(BigTreeSlotKind.Eat, 3, 10);
    const visitors = adapter(tree, visits);
    const entity = ordinary(71, -10);
    const xeno = xenomimic(72, 0, 10);
    const foreignKind = 99;
    const foreignId = 73;

    expect(visits.requestVisit(foreignKind, foreignId, BigTreeVisitReason.Food, 0, 0, 20)).not.toBe(
      -1,
    );
    tick(tree, visitors, 0, 0, [entity], [xeno]);
    expect(visitors.activeVisitors).toBe(2);

    visitors.resetOrdinary();
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Outside);
    expect(visits.stateOf(BIG_TREE_OWNER_XENOMIMIC, xeno.pairId * 2 + xeno.role)).toBe(
      BigTreeVisitState.Travelling,
    );
    expect(visits.stateOf(foreignKind, foreignId)).toBe(BigTreeVisitState.Travelling);
    expect(visitors.activeVisitors).toBe(1);

    visitors.reset();
    expect(visits.stateOf(BIG_TREE_OWNER_XENOMIMIC, xeno.pairId * 2 + xeno.role)).toBe(
      BigTreeVisitState.Outside,
    );
    expect(visits.stateOf(foreignKind, foreignId)).toBe(BigTreeVisitState.Travelling);
    expect(visits.trackedActors).toBe(1);
  });

  test('ordinary reset removes cooldown-only records while preserving other owner namespaces', () => {
    const tree = new FakeTree();
    const visits = manager(3);
    visits.addRadialSlots(BigTreeSlotKind.Observe, 3, 5);
    const visitors = adapter(tree, visits);
    const entity = ordinary(81, 5, 100);
    const quiet: BigTreeVisitorEnvironment = { danger: 0, stress: 0 };

    tick(tree, visitors, 0, 0, [entity], [], quiet);
    tick(tree, visitors, 0.1, 0.1, [entity], [], quiet);
    tick(tree, visitors, 1.11, 0, [entity], [], quiet);
    tick(tree, visitors, 4.12, 0.1, [entity], [], quiet);
    entity.position.x = 36;
    tick(tree, visitors, 4.2, 0, [entity], [], quiet);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Cooldown);
    expect(visitors.activeVisitors).toBe(0);

    expect(
      visits.requestVisit(BIG_TREE_OWNER_XENOMIMIC, 82, BigTreeVisitReason.Safety, 4.2, 100, 0),
    ).not.toBe(-1);
    expect(visits.requestVisit(99, 83, BigTreeVisitReason.Safety, 4.2, -100, 0)).not.toBe(-1);

    visitors.resetOrdinary();
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, entity.id)).toBe(BigTreeVisitState.Outside);
    expect(visits.stateOf(BIG_TREE_OWNER_XENOMIMIC, 82)).toBe(BigTreeVisitState.Travelling);
    expect(visits.stateOf(99, 83)).toBe(BigTreeVisitState.Travelling);
    expect(visits.trackedActors).toBe(2);
  });

  test('event-driven disposal reclaims cooldown records for fresh organism identities', () => {
    const tree = new FakeTree();
    const visits = manager(1, 1);
    visits.addSlot(BigTreeSlotKind.Socialize, 0, 0);
    const visitors = adapter(tree, visits);
    const social: BigTreeVisitorEnvironment = { socialNeed: 1, curiosity: 0 };
    const first = ordinary(90, 0, 100);

    tick(tree, visitors, 0, 0, [first], [], social);
    tick(tree, visitors, 1.01, 1.01, [first], [], social);
    first.position.x = 40;
    tick(tree, visitors, 1.1, 0.09, [first], [], social);
    expect(visits.stateOf(BIG_TREE_OWNER_ORDINARY, first.id)).toBe(BigTreeVisitState.Cooldown);
    expect(visitors.cancelOrdinary(first)).toBe(true);

    const replacement = ordinary(91, 0, 100);
    tick(tree, visitors, 1.2, 0.1, [replacement], [], social);
    expect(visitors.activeVisitors).toBe(1);
    expect(visitors.isEntityVisitorActive(replacement.id)).toBe(true);
  });

  test('candidate polling is fixed-budget, staggered, and active work remains capacity-bounded', () => {
    const tree = new FakeTree();
    const visits = manager(4);
    visits.addRadialSlots(BigTreeSlotKind.Eat, 4, 10);
    const visitors = adapter(tree, visits, 7);
    const population: BigTreeOrdinaryBody[] = [];
    for (let id = 1; id <= 50_000; id++) population.push(ordinary(id, 0));
    const stats = emptyStats();

    tick(tree, visitors, 0, 0, population, []);
    visitors.readStats(stats);
    expect(stats.lastPollCount).toBe(7);
    expect(stats.totalPolls).toBe(7);
    expect(stats.activeVisitors).toBeLessThanOrEqual(4);

    tick(tree, visitors, 0.05, 0.05, population, []);
    visitors.readStats(stats);
    expect(stats.lastPollCount).toBe(0);
    expect(stats.totalPolls).toBe(7);
    tick(tree, visitors, 0.1, 0.05, population, []);
    visitors.readStats(stats);
    expect(stats.lastPollCount).toBe(7);
    expect(stats.totalPolls).toBe(14);
    expect(stats.activeVisitors).toBeLessThanOrEqual(stats.zoneCapacity);
  });

  test('contains no ambient randomness, wall clock, or timer API', async () => {
    const source = await Bun.file(
      new URL('../src/sim/big-tree-visitors.ts', import.meta.url),
    ).text();
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('setInterval');
  });

  test('active identity lookup is map-backed and introduces no linear population scan', async () => {
    const source = await Bun.file(
      new URL('../src/sim/big-tree-visitors.ts', import.meta.url),
    ).text();
    const lookupStart = source.indexOf('  private findActive(');
    const lookupEnd = source.indexOf('  private setActiveIndex(', lookupStart);
    expect(lookupStart).toBeGreaterThan(-1);
    expect(lookupEnd).toBeGreaterThan(lookupStart);
    const lookupSource = source.slice(lookupStart, lookupEnd);
    expect(lookupSource).toContain('ordinaryActiveIndices.get(ownerId)');
    expect(lookupSource).toContain('xenomimicActiveIndices.get(ownerId)');
    expect(lookupSource).not.toMatch(/\bfor\s*\(/);
    expect(lookupSource).not.toMatch(/\bwhile\s*\(/);
  });
});
