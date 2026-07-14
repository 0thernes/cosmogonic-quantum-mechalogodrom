import { describe, expect, test } from 'bun:test';
import { World } from '../src/world';
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
  BIG_TREE_SANCTUARY_ORDINARY,
  BigTreeSanctuaryMembershipRegistry,
} from '../src/sim/big-tree-sanctuary';
import { EdibleResourceRegistry } from '../src/sim/edible-resource';

function diagnosticsHarness(enabled: boolean): World {
  const harness = Object.create(World.prototype) as Record<string, unknown>;
  harness.developmentDiagnostics = enabled;
  if (!enabled) return harness as unknown as World;

  const zone = new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 20, exitRadius: 25 });
  const visits = new BigTreeVisitManager(zone, {
    maxActors: 4,
    capacity: 2,
    maxSlots: 2,
    travelTimeoutSeconds: 20,
    slotLeaseSeconds: 10,
  });
  visits.addSlot(BigTreeSlotKind.Rest, 0, 0);
  visits.requestVisit(1, 7, BigTreeVisitReason.Rest, 10, 5, 0);

  const sanctuary = new BigTreeSanctuaryMembershipRegistry(zone, 4);
  sanctuary.register(BIG_TREE_SANCTUARY_ORDINARY, 7, 5, 0);

  const food = new EdibleResourceRegistry([
    {
      id: 100,
      kind: 'fruit',
      position: { x: 1, y: 8, z: 2 },
      interactionPoint: { x: 1, y: 0, z: 2 },
      nourishment: 12,
    },
  ]);

  harness.state = { frame: 42, elapsed: 12 };
  harness.bigTreeZone = zone;
  harness.bigTreeVisits = visits;
  harness.bigTreeSanctuary = sanctuary;
  harness.bigTreeVisitorStats = {};
  harness.bigTreeFaunaVisitorStats = {};
  harness.bigTreeVisitors = {
    readStats(out: Record<string, number>): void {
      Object.assign(out, {
        activeVisitors: 1,
        activeOrdinary: 1,
        activeXenomimics: 0,
        lastPollCount: 1,
        totalPolls: 3,
        acceptedVisits: 1,
        completedMeals: 0,
        consumedFruit: 0,
        consumedLeaves: 0,
        targetLosses: 0,
        cancellations: 0,
        zoneCapacity: 2,
        socialPairs: 0,
      });
    },
    readVisitor(ownerKind: number, ownerId: number, _now: number, out: Record<string, unknown>) {
      if (ownerKind !== 1 || ownerId !== 7) return false;
      Object.assign(out, {
        ownerKind,
        ownerId,
        state: BigTreeVisitState.Travelling,
        reason: BigTreeVisitReason.Rest,
        activity: BigTreeActivity.Rest,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        foodId: -1,
        foodKind: null,
        foodState: null,
        eating: false,
        lastTransitionCause: BigTreeTransitionCause.VisitRequested,
        lastTransitionAt: 10,
      });
      return true;
    },
  };
  harness.bigTreeFaunaVisitors = {
    readStats(out: Record<string, number>): void {
      Object.assign(out, {
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
      });
    },
    readVisitor(): boolean {
      return false;
    },
  };
  harness.crystalEcosystem = {
    edibleResources: food,
    neuralStatus: () => ({
      controllerCount: 250,
      inputCount: 12,
      hiddenCount: 16,
      outputCount: 8,
      parametersPerController: 344,
      totalParameters: 86_000,
      modelReady: true,
      decisions: 500,
      fallbackCount: 0,
      lastFallbackReason: 'none',
      lastActivity: 'observe',
      lastMotorX: 0.1,
      lastMotorZ: -0.1,
      lastSocialDrive: 0.4,
      visitorCount: 1,
      visitorPresence: 1 / 32,
      visitorSocialActivity: 0,
    }),
  };
  return harness as unknown as World;
}

describe('Big Tree development observability', () => {
  test('is inert unless the World is explicitly constructed for development diagnostics', () => {
    expect(diagnosticsHarness(false).getBigTreeEcologySnapshot()).toBeNull();
  });

  test('joins indexed visit, sanctuary, food, and neural receipts without mutating lifecycle state', () => {
    const world = diagnosticsHarness(true);
    const before = world.getBigTreeEcologySnapshot({ ownerKind: 1, ownerId: 7, foodId: 100 });
    const repeat = world.getBigTreeEcologySnapshot({ ownerKind: 1, ownerId: 7, foodId: 100 });

    expect(before).not.toBeNull();
    expect(repeat).toEqual(before);
    expect(before?.zone).toEqual({ centerX: 0, centerZ: 0, entryRadius: 20, exitRadius: 25 });
    expect(before?.visits).toMatchObject({ trackedActors: 1, activeVisitors: 1, capacity: 2 });
    expect(before?.actor).toMatchObject({
      ownerKind: 1,
      ownerId: 7,
      adapter: 'core',
      visit: {
        stateName: 'travelling',
        reasonName: 'rest',
        activityName: 'rest',
        remainingStateSeconds: 18,
        lastTransitionCauseName: 'visit-requested',
        lastTransitionAt: 10,
      },
      sanctuary: { registered: true, protected: true, x: 5, z: 0 },
    });
    expect(before?.foodItem).toMatchObject({
      id: 100,
      kind: 'fruit',
      state: 'available',
      generation: 1,
      remainingRespawnSeconds: null,
    });
    expect(before?.food).toMatchObject({ capacity: 1, available: 1, pendingRespawns: 0 });
    expect(before?.neuralController).toMatchObject({ controllerCount: 250, modelReady: true });
    expect(JSON.stringify(before)).not.toContain('Infinity');
  });

  test('keeps detailed reads optional and uses indexed lookups rather than full ecology scans', async () => {
    const world = diagnosticsHarness(true);
    expect(world.getBigTreeEcologySnapshot()).toMatchObject({ actor: null, foodItem: null });
    expect(
      world.getBigTreeEcologySnapshot({ ownerKind: -1, ownerId: 7, foodId: -1 }),
    ).toMatchObject({
      actor: null,
      foodItem: null,
    });

    const source = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
    const start = source.indexOf('  getBigTreeEcologySnapshot(');
    const end = source.indexOf('\n  /**\n   * Read-only perf telemetry', start);
    const body = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(body).toContain('edibleResources.get');
    expect(body).toContain('bigTreeVisits.readVisit');
    expect(body).not.toContain('entities.list');
    expect(body).not.toContain('bodyView()');
    expect(body).not.toContain('for (');
  });

  test('main exposes the inspector only through the existing localhost hook', async () => {
    const source = await Bun.file(new URL('../src/main.ts', import.meta.url)).text();
    expect(source).toContain("location.hostname === 'localhost'");
    expect(source).toContain("location.hostname === '127.0.0.1'");
    expect(source).toContain('developmentDiagnostics,');
    expect(source).toContain('if (developmentDiagnostics)');
    expect(source).toContain('bigTreeEcology: {');
    expect(source).toContain('world?.getBigTreeEcologySnapshot(query) ?? null');

    const worldSource = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
    expect(worldSource).toContain(
      'if (this.developmentDiagnostics && this.state.frame % 600 === 0)',
    );
  });
});
