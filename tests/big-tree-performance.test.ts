import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_OWNER_ORDINARY,
  BIG_TREE_OWNER_XENOMIMIC,
  BigTreeSpeciesVisitors,
  type BigTreeFoodSource,
  type BigTreeOrdinaryBody,
  type BigTreeSpeciesVisitorStats,
  type BigTreeVisitorActivityCallbacks,
  type BigTreeXenomimicBody,
} from '../src/sim/big-tree-visitors';
import {
  BigTreeActivity,
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeZone,
} from '../src/sim/big-tree-zone';
import {
  EDIBLE_RESOURCE_RESPAWN_SECONDS,
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResourceDefinition,
  type EdibleResourceKind,
} from '../src/sim/edible-resource';

const STRESS_ORDINARY_COUNT = 10_000;
const STRESS_XENOMIMIC_COUNT = 2_000;
const ZONE_CAPACITY = 72;
const POLL_BUDGET = 64;

function foodDefinitions(count: number): EdibleResourceDefinition[] {
  const definitions: EdibleResourceDefinition[] = [];
  for (let index = 0; index < count; index++) {
    definitions.push({
      id: index + 1,
      kind: (index & 1) === 0 ? 'fruit' : 'leaf',
      position: { x: 0, y: 8 + (index % 4), z: 0 },
      interactionPoint: { x: 0, y: 0, z: 0 },
      nourishment: (index & 1) === 0 ? 24 : 12,
    });
  }
  return definitions;
}

class StressTree implements BigTreeFoodSource {
  readonly edibleResources: EdibleResourceRegistry;
  now = 0;

  constructor(foodCount: number) {
    this.edibleResources = new EdibleResourceRegistry(foodDefinitions(foodCount));
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

function visitManager(slotKind: BigTreeSlotKind): BigTreeVisitManager {
  const visits = new BigTreeVisitManager(
    new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 40, exitRadius: 48 }),
    {
      maxActors: STRESS_ORDINARY_COUNT + STRESS_XENOMIMIC_COUNT,
      capacity: ZONE_CAPACITY,
      maxSlots: ZONE_CAPACITY,
      arriveRadius: 2,
      minDwellSeconds: 4,
      maxDwellSeconds: 4,
      minCooldownSeconds: 8,
      maxCooldownSeconds: 8,
      travelTimeoutSeconds: 12,
      leaveTimeoutSeconds: 5,
      slotLeaseSeconds: 6,
      stuckAfterSeconds: 2,
      maxStuckRecoveries: 1,
    },
  );
  for (let index = 0; index < ZONE_CAPACITY; index++) {
    visits.addSlot(slotKind, 0, 0);
  }
  return visits;
}

function visitorAdapter(
  tree: StressTree,
  visits: BigTreeVisitManager,
  callbacks: BigTreeVisitorActivityCallbacks | null = null,
): BigTreeSpeciesVisitors {
  return new BigTreeSpeciesVisitors(
    tree,
    visits,
    {
      pollBudget: POLL_BUDGET,
      pollIntervalSeconds: 0.1,
      foodLeaseSeconds: 3,
      foodRetrySeconds: 0.1,
      foodSearchTimeoutSeconds: 0.5,
      foodReachRadius: 2,
      ordinarySpeed: 20,
      xenomimicSpeed: 20,
      steeringGain: 8,
      socialLeaseSeconds: 1,
      socialReachRadius: 4,
    },
    callbacks,
  );
}

function ordinaryPopulation(count: number, energy: number): BigTreeOrdinaryBody[] {
  const population: BigTreeOrdinaryBody[] = [];
  for (let id = 0; id < count; id++) {
    population.push({
      id,
      position: { x: 0, z: 0 },
      userData: {
        ecologyId: id,
        energy,
        belly: 0,
        age: 0,
        life: 100,
        alive: true,
        vel: { x: 0, z: 0 },
      },
    });
  }
  return population;
}

function xenomimicPopulation(count: number, energy: number): BigTreeXenomimicBody[] {
  const population: BigTreeXenomimicBody[] = [];
  for (let pairId = 0; pairId < count; pairId++) {
    population.push({
      pairId,
      role: 0,
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      heading: 0,
      energy,
      age: 0,
      alive: true,
      shimmer: 0,
    });
  }
  return population;
}

function stats(): BigTreeSpeciesVisitorStats {
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

describe('Big Tree ecology performance invariants', () => {
  test('stress populations retain fixed-budget discovery and capacity-bounded active work', () => {
    const tree = new StressTree(128);
    const visits = visitManager(BigTreeSlotKind.Eat);
    const visitors = visitorAdapter(tree, visits);
    const ordinary = ordinaryPopulation(STRESS_ORDINARY_COUNT, 0);
    const xenomimics = xenomimicPopulation(STRESS_XENOMIMIC_COUNT, 0);
    const out = stats();

    for (let poll = 0; poll < 4; poll++) {
      const now = poll * 0.1;
      tree.tick(now);
      visitors.update(now, poll === 0 ? 0 : 0.1, ordinary, xenomimics, {
        foodAvailable: true,
        simulationLoad: 0.5,
      });
      visitors.readStats(out);
      expect(out.lastPollCount).toBe(POLL_BUDGET);
      expect(out.totalPolls).toBe((poll + 1) * POLL_BUDGET);
      expect(out.activeVisitors).toBeLessThanOrEqual(ZONE_CAPACITY);
      expect(out.activeVisitors).toBeLessThanOrEqual(out.zoneCapacity);
    }

    tree.tick(0.35);
    visitors.update(0.35, 0.05, ordinary, xenomimics, { foodAvailable: true });
    visitors.readStats(out);
    expect(out.lastPollCount).toBe(0);
    expect(out.totalPolls).toBe(4 * POLL_BUDGET);
    expect(out.activeVisitors).toBe(ZONE_CAPACITY);
    expect(out.activeOrdinary + out.activeXenomimics).toBe(out.activeVisitors);
  });

  test('concurrent mixed-species social workloads pair in one bounded pass and clean up', () => {
    const tree = new StressTree(1);
    const visits = visitManager(BigTreeSlotKind.Socialize);
    let activityCalls = 0;
    const callbacks: BigTreeVisitorActivityCallbacks = {
      performActivity(_ownerKind, _ownerId, _partnerKind, _partnerId, _body, activity) {
        if (activity === BigTreeActivity.Socialize) activityCalls++;
      },
    };
    const visitors = visitorAdapter(tree, visits, callbacks);
    const ordinary = ordinaryPopulation(6_000, 100);
    const xenomimics = xenomimicPopulation(STRESS_XENOMIMIC_COUNT, 1);
    const environment = { socialNeed: 1, curiosity: 0, foodAvailable: false } as const;
    const out = stats();

    visitors.update(0, 0, ordinary, xenomimics, environment);
    visitors.update(0.1, 0.1, ordinary, xenomimics, environment);
    activityCalls = 0;
    visitors.update(0.2, 0.1, ordinary, xenomimics, environment);
    visitors.readStats(out);

    expect(out.activeVisitors).toBe(ZONE_CAPACITY);
    expect(out.activeOrdinary).toBe(ZONE_CAPACITY / 2);
    expect(out.activeXenomimics).toBe(ZONE_CAPACITY / 2);
    expect(out.socialPairs).toBe(ZONE_CAPACITY / 2);
    expect(activityCalls).toBe(ZONE_CAPACITY);
    expect(out.lastPollCount).toBe(POLL_BUDGET);

    visitors.reset();
    visitors.readStats(out);
    expect(out).toMatchObject({
      activeVisitors: 0,
      socialPairs: 0,
      totalPolls: 0,
      acceptedVisits: 0,
    });
    expect(visits.activeVisitors).toBe(0);
    expect(visits.trackedActors).toBe(0);
  });

  test('bulk consume and respawn cycles retain fixed records and bounded deadline counts', () => {
    const resourceCount = 256;
    const cycles = 64;
    const registry = new EdibleResourceRegistry(foodDefinitions(resourceCount));
    const pool = registry.all;
    const records = pool.slice();
    const initialGenerations = records.map((resource) => resource.generation);

    for (let cycle = 0; cycle < cycles; cycle++) {
      const now = cycle * EDIBLE_RESOURCE_RESPAWN_SECONDS;
      let nourishment = 0;
      for (let index = 0; index < resourceCount; index++) {
        const resourceId = index + 1;
        const ownerId = cycle * resourceCount + index + 1;
        const reservation = registry.reserveById(resourceId, ownerId, now, 6);
        if (reservation === null)
          throw new Error(`missing resource ${resourceId} in cycle ${cycle}`);
        if (!registry.beginConsumption(resourceId, reservation.generation, ownerId, now)) {
          throw new Error(`failed to consume resource ${resourceId} in cycle ${cycle}`);
        }
        nourishment += registry.completeConsumption(
          resourceId,
          reservation.generation,
          ownerId,
          now,
        );
      }

      expect(nourishment).toBe((resourceCount / 2) * (24 + 12));
      expect(registry.stats()).toMatchObject({
        capacity: resourceCount,
        available: 0,
        respawning: resourceCount,
        pendingRespawns: resourceCount,
        pendingLeases: 0,
      });
      expect(registry.update(now + EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.001)).toBe(0);
      expect(registry.update(now + EDIBLE_RESOURCE_RESPAWN_SECONDS)).toBe(resourceCount);
      expect(registry.stats()).toMatchObject({
        capacity: resourceCount,
        available: resourceCount,
        respawning: 0,
        pendingRespawns: 0,
        pendingLeases: 0,
      });
      expect(registry.all).toBe(pool);
    }

    for (let index = 0; index < resourceCount; index++) {
      const resource = registry.get(index + 1)!;
      expect(resource).toBe(records[index]!);
      expect(resource.generation).toBe(initialGenerations[index]! + cycles);
    }
  });

  test('hot-path source seals prohibit full-population and all-actor scans', async () => {
    const visitorSource = await Bun.file(
      new URL('../src/sim/big-tree-visitors.ts', import.meta.url),
    ).text();
    const zoneSource = await Bun.file(
      new URL('../src/sim/big-tree-zone.ts', import.meta.url),
    ).text();

    const pollStart = visitorSource.indexOf('  private pollCandidates(');
    const pollEnd = visitorSource.indexOf('\n  private considerOrdinary(', pollStart);
    const pollBody = visitorSource.slice(pollStart, pollEnd);
    expect(pollStart).toBeGreaterThan(-1);
    expect(pollEnd).toBeGreaterThan(pollStart);
    expect(pollBody).toContain('this.lastPollCount < this.pollBudget');
    expect(pollBody).toContain('Math.min(ordinary.length, this.pollBudget)');
    expect(pollBody).toContain('Math.min(xenomimics.length, this.pollBudget)');
    expect(pollBody).not.toMatch(/\bfor\s*\(/);

    const socialStart = visitorSource.indexOf('  private matchSocialPartners(');
    const socialEnd = visitorSource.indexOf('\n  private cancelOwner(', socialStart);
    const socialBody = visitorSource.slice(socialStart, socialEnd);
    expect(socialStart).toBeGreaterThan(-1);
    expect(socialEnd).toBeGreaterThan(socialStart);
    expect(socialBody.match(/\bfor\s*\(/g) ?? []).toHaveLength(1);
    expect(socialBody).toContain('index < this.activeCount');

    const stepStart = zoneSource.indexOf('  step(now: number): void {');
    const stepEnd = zoneSource.indexOf('\n  /** Release all visits/reservations', stepStart);
    const stepBody = zoneSource.slice(stepStart, stepEnd);
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    expect(stepBody).toContain('this.scheduledRecordCount');
    expect(stepBody).not.toContain('this.maxActors');

    const lookupStart = visitorSource.indexOf('  private findActive(');
    const lookupEnd = visitorSource.indexOf('\n  private setActiveIndex(', lookupStart);
    const lookupBody = visitorSource.slice(lookupStart, lookupEnd);
    expect(lookupStart).toBeGreaterThan(-1);
    expect(lookupEnd).toBeGreaterThan(lookupStart);
    expect(lookupBody).toContain('ordinaryActiveIndices.get(ownerId)');
    expect(lookupBody).toContain('xenomimicActiveIndices.get(ownerId)');
    expect(lookupBody).not.toMatch(/\b(?:for|while)\s*\(/);

    // Ensure both species remain represented in the test's production owner namespace.
    expect(BIG_TREE_OWNER_ORDINARY).not.toBe(BIG_TREE_OWNER_XENOMIMIC);
  });
});
