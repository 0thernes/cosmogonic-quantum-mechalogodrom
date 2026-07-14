/**
 * Fixed-budget Big Tree ecology benchmarks. Run with:
 *
 *   bun bench/big-tree-ecology.bench.ts
 *
 * Fixtures are fully constructed before mitata samples them. Timed callbacks reuse stable pools,
 * deadlines, actor storage, and visitor records so setup/allocation does not pollute frame costs.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { BigTreeFaunaVisitors } from '../src/sim/big-tree-fauna-visitors';
import {
  BIG_TREE_OWNER_SHOGGOTH,
  type BigTreeFaunaActor,
  type BigTreeFaunaSource,
  type BigTreeFaunaSourceBinding,
} from '../src/sim/big-tree-fauna-source';
import {
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeVisitReason,
  BigTreeVisitState,
  BigTreeZone,
} from '../src/sim/big-tree-zone';
import type { BigTreeFoodSource, BigTreeVisitorEnvironment } from '../src/sim/big-tree-visitors';
import {
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResourceDefinition,
  type EdibleResourceKind,
} from '../src/sim/edible-resource';

const FOOD_CAPACITY = 20_000;
const RENEWAL_BUDGET = 72;
const VISITOR_BUDGET = 72;
const FAUNA_CROWD = 64;

const foodDefinitions: EdibleResourceDefinition[] = Array.from(
  { length: FOOD_CAPACITY },
  (_, index) => ({
    id: index,
    kind: (index & 1) === 0 ? 'fruit' : 'leaf',
    position: { x: index % 128, y: 8, z: Math.floor(index / 128) },
    interactionPoint: { x: index % 128, y: 0, z: Math.floor(index / 128) },
    nourishment: (index & 1) === 0 ? 28 : 14,
  }),
);
const registry = new EdibleResourceRegistry(foodDefinitions);
const persistenceRegistry = new EdibleResourceRegistry(foodDefinitions);
const cleanPersistenceSnapshot = persistenceRegistry.persistenceSnapshot(0);
const reservations: EdibleReservation[] = [];
for (let index = 0; index < RENEWAL_BUDGET; index++) {
  const reservation = registry.reserveAny(index, 0, 8);
  if (reservation === null) throw new Error('failed to build fixed food renewal fixture');
  reservations.push(reservation);
}

function createVisitManager(capacity: number, maxSlots = capacity): BigTreeVisitManager {
  return new BigTreeVisitManager(
    new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 30, exitRadius: 35 }),
    {
      maxActors: Math.max(capacity, 256),
      capacity,
      maxSlots,
      arriveRadius: 1.5,
      minDwellSeconds: 1_000,
      maxDwellSeconds: 1_000,
      minCooldownSeconds: 30,
      maxCooldownSeconds: 30,
      travelTimeoutSeconds: 20,
      leaveTimeoutSeconds: 10,
      slotLeaseSeconds: 8,
      stuckAfterSeconds: 4,
      maxStuckRecoveries: 1,
    },
  );
}

const visitManager = createVisitManager(VISITOR_BUDGET);
for (let index = 0; index < VISITOR_BUDGET; index++) {
  const angle = (index / VISITOR_BUDGET) * Math.PI * 2;
  const x = Math.cos(angle) * 6;
  const z = Math.sin(angle) * 6;
  visitManager.addSlot(BigTreeSlotKind.Socialize, x, z);
  const visitId = visitManager.requestVisit(
    BIG_TREE_OWNER_SHOGGOTH,
    index,
    BigTreeVisitReason.Social,
    0,
    x,
    z,
  );
  if (visitId < 0) throw new Error('failed to build fixed visit-manager fixture');
  if (
    visitManager.updatePosition(BIG_TREE_OWNER_SHOGGOTH, index, x, z, 0) !==
    BigTreeVisitState.Active
  ) {
    throw new Error('visit-manager fixture did not enter the active state');
  }
}

class BenchTree implements BigTreeFoodSource {
  readonly edibleResources = new EdibleResourceRegistry([foodDefinitions[0]!]);
  now = 0;

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

class BenchFaunaSource implements BigTreeFaunaSource {
  readCalls = 0;

  constructor(readonly actors: BigTreeFaunaActor[]) {}

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
    const target = this.actors[index];
    if (!target || target.ownerId !== actor.ownerId) return false;
    target.vx = actor.vx;
    target.vy = actor.vy;
    target.vz = actor.vz;
    target.energy = actor.energy;
    target.aggressionSuppressed = actor.aggressionSuppressed;
    return true;
  }

  nourishBigTreeActor(index: number, normalizedNutrition: number): boolean {
    const actor = this.actors[index];
    if (!actor || normalizedNutrition <= 0) return false;
    actor.energy = Math.min(actor.maxEnergy, actor.energy + normalizedNutrition * actor.maxEnergy);
    return true;
  }

  setBigTreeActorControlled(index: number, controlled: boolean): boolean {
    const actor = this.actors[index];
    if (!actor) return false;
    actor.aggressionSuppressed = controlled;
    return true;
  }
}

function faunaActor(ownerId: number, x: number): BigTreeFaunaActor {
  return {
    ownerId,
    category: 'shoggoth',
    locomotion: 'flight',
    x,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    energy: 1,
    maxEnergy: 1,
    alive: true,
    fatigue: 0,
    socialDrive: 1,
    health: 1,
    maxHealth: 1,
    danger: 0,
    criticalNeed: false,
    moveSpeed: 20,
    aggressionSuppressed: false,
  };
}

const faunaTree = new BenchTree();
const faunaVisits = createVisitManager(FAUNA_CROWD);
const faunaActors = Array.from({ length: FAUNA_CROWD }, (_, index) => {
  const x = (index - (FAUNA_CROWD - 1) / 2) * 0.02;
  faunaVisits.addSlot(BigTreeSlotKind.Socialize, x, 0);
  return faunaActor(index, x);
});
const faunaSource = new BenchFaunaSource(faunaActors);
const faunaBinding: BigTreeFaunaSourceBinding = {
  ownerKind: BIG_TREE_OWNER_SHOGGOTH,
  category: 'shoggoth',
  source: faunaSource,
};
const faunaVisitors = new BigTreeFaunaVisitors(faunaTree, faunaVisits, [faunaBinding], {
  pollBudget: FAUNA_CROWD,
  pollIntervalSeconds: 0.1,
  foodLeaseSeconds: 3,
  foodRetrySeconds: 0.1,
  foodSearchTimeoutSeconds: 0.4,
  foodReachRadius: 12,
  steeringGain: 8,
  restPerSecond: 0.1,
  restTarget: 0.8,
  socialLeaseSeconds: 0.5,
  socialReachRadius: 0.001,
  flightVisitY: 0.01,
});
const socialEnvironment: BigTreeVisitorEnvironment = {
  socialNeed: 1,
  stress: 1,
  curiosity: 0,
  foodAvailable: false,
};
faunaVisitors.update(0, 0, socialEnvironment);
faunaVisitors.update(0.05, 0, socialEnvironment);
if (faunaVisitors.activeVisitors < 48) {
  throw new Error('fauna matcher fixture requires at least 48 active unmatched visitors');
}

group('big-tree ecology: fixed food budgets', () => {
  bench('20,000 resources, no deadline due', () => {
    do_not_optimize(registry.update(0));
  });

  bench('renew 72 live reservations', () => {
    let renewed = 0;
    for (const reservation of reservations) {
      if (registry.renewLease(reservation.id, reservation.generation, reservation.ownerId, 0, 8)) {
        renewed++;
      }
    }
    do_not_optimize(renewed);
  });
});

group('big-tree ecology: sparse food persistence', () => {
  bench('snapshot clean 20,000-slot pool', () => {
    do_not_optimize(persistenceRegistry.persistenceSnapshot(0));
  });

  bench('stringify clean sparse snapshot', () => {
    do_not_optimize(JSON.stringify(cleanPersistenceSnapshot));
  });
});

group('big-tree ecology: fixed visitor budgets', () => {
  bench('step 72 active visit records', () => {
    visitManager.step(0.05);
    do_not_optimize(visitManager.activeVisitors);
  });

  bench(`${faunaVisitors.activeVisitors} unmatched fauna social candidates`, () => {
    faunaVisitors.update(0.05, 0, socialEnvironment);
    do_not_optimize(faunaSource.readCalls);
  });
});

if (import.meta.main) {
  await run(
    process.argv.includes('--json')
      ? { format: { json: { debug: false, samples: false } } }
      : undefined,
  );
}
