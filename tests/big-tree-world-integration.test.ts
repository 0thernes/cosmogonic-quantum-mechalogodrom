import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_SANCTUARY_ORDINARY,
  BIG_TREE_SANCTUARY_PUPPET,
  BIG_TREE_SANCTUARY_SHOGGOTH,
  BIG_TREE_SANCTUARY_TITAN,
  BIG_TREE_SANCTUARY_XENOMIMIC,
  BigTreeSanctuaryMembershipRegistry,
} from '../src/sim/big-tree-sanctuary';
import { BigTreeZone } from '../src/sim/big-tree-zone';
import { World } from '../src/world';

const WORLD_URL = new URL('../src/world.ts', import.meta.url);
const MAIN_URL = new URL('../src/main.ts', import.meta.url);

interface WorldMembershipHarness {
  bigTreeZone: BigTreeZone;
  bigTreeSanctuary: BigTreeSanctuaryMembershipRegistry;
  isBigTreeMemberProtected(
    ownerKind: number,
    ownerId: number | undefined,
    x: number,
    z: number,
  ): boolean;
}

interface WorldDiagnosticGateHarness {
  developmentDiagnostics: boolean;
  getBigTreeEcologySnapshot(): unknown;
}

describe('Big Tree production composition root', () => {
  test('food lifecycle flushing is dirty, retryable, and deduplicated without losing respawn time', () => {
    const resources = { persistenceRevision: 0, hasPendingRespawns: false };
    let foodTime = 0;
    let snapshotCalls = 0;
    let saveCalls = 0;
    let allowSave = true;
    const harness = {
      disposeAbort: new AbortController(),
      crystalEcosystem: {
        edibleResources: resources,
        get foodTime(): number {
          return foodTime;
        },
        snapshotFoodPersistence: () => {
          snapshotCalls++;
          return { version: 1 as const, capacity: 0, entries: [] };
        },
      },
      lastPersistedBigTreeFoodRevision: 0,
      lastPersistedBigTreeFoodTime: 0,
      store: {
        saveBigTreeEcology: (): boolean => {
          saveCalls++;
          return allowSave;
        },
      },
    };
    const persist = World.prototype.persistBigTreeEcology as unknown as (
      this: typeof harness,
    ) => void;

    persist.call(harness);
    expect({ snapshotCalls, saveCalls }).toEqual({ snapshotCalls: 0, saveCalls: 0 });

    resources.persistenceRevision = 1;
    persist.call(harness);
    persist.call(harness);
    expect({ snapshotCalls, saveCalls }).toEqual({ snapshotCalls: 1, saveCalls: 1 });

    resources.hasPendingRespawns = true;
    foodTime = 2;
    persist.call(harness);
    persist.call(harness);
    expect({ snapshotCalls, saveCalls }).toEqual({ snapshotCalls: 2, saveCalls: 2 });

    allowSave = false;
    resources.persistenceRevision = 2;
    persist.call(harness);
    persist.call(harness);
    expect({ snapshotCalls, saveCalls }).toEqual({ snapshotCalls: 4, saveCalls: 4 });
    expect(harness.lastPersistedBigTreeFoodRevision).toBe(1);
    expect(harness.lastPersistedBigTreeFoodTime).toBe(2);
  });

  test('uses one canonical Crystal food source and one bounded shared visit manager', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('new BigTreeVisitManager(this.bigTreeZone');
    expect(source).toMatch(
      /new BigTreeSpeciesVisitors\(\s*this\.crystalEcosystem,\s*this\.bigTreeVisits,/,
    );
    expect(source).toMatch(
      /new BigTreeFaunaVisitors\(\s*this\.crystalEcosystem,\s*this\.bigTreeVisits,/,
    );
    expect(source).toContain('maxActors: bigTreeActorCapacity');
    expect(source).toContain('capacity: Math.min(72, bigTreeActorCapacity)');
    expect(source).toContain('pollBudget: 64');
    expect(source).toContain('pollIntervalSeconds: 0.1');
  });

  test('authors multiple eating, resting, social, observation, and overflow positions', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('addRadialSlots(BigTreeSlotKind.Eat, 32');
    expect(source).toContain('addRadialSlots(BigTreeSlotKind.Rest, 24');
    expect(source).toContain('addRadialSlots(BigTreeSlotKind.Socialize, 24');
    expect(source).toContain('addRadialSlots(BigTreeSlotKind.Observe, 16');
    expect(source).toContain('addRadialSlots(BigTreeSlotKind.Any, 8');
  });

  test('advances visitors after the authoritative scaled Crystal clock and cleans lifecycle state', async () => {
    const source = await Bun.file(WORLD_URL).text();
    const crystalTick = source.indexOf('this.updateCrystalEcosystem(dt, uiDt, t, false);');
    const visitorTick = source.indexOf('this.updateBigTreeVisitors(dt, t);', crystalTick);
    expect(crystalTick).toBeGreaterThan(-1);
    expect(visitorTick).toBeGreaterThan(crystalTick);
    expect(source).toContain('this.bigTreeVisitors?.cancelXenomimic(');
    expect(source).toContain('event.pairId * 2 + event.role');
    expect(source).toContain('this.bigTreeVisitors.reset();');
    expect(source).toContain('this.bigTreeFaunaVisitors.reset();');
    expect(source).toContain('this.crystalEcosystem.setVisitorPresence(');
    expect(source).toContain('this.bigTreeVisitors?.xenomimicLocomotionMode(pairId, role)');
    expect(source).toContain('(2 * socialPairs) / Math.max(1, activeVisitors)');
  });

  test('binds every autonomous fauna category while preserving player-owned hero locomotion', async () => {
    const source = await Bun.file(WORLD_URL).text();
    const start = source.indexOf('const bigTreeFaunaBindings: BigTreeFaunaBinding[]');
    const end = source.indexOf('this.bigTreeFaunaVisitors = new BigTreeFaunaVisitors', start);
    const bindings = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(bindings).toContain('BIG_TREE_OWNER_SHOGGOTH');
    expect(bindings).toContain('BIG_TREE_OWNER_TITAN');
    expect(bindings).toContain('BIG_TREE_OWNER_LEVIATHAN');
    expect(bindings).toContain('BIG_TREE_OWNER_PUPPET');
    expect(bindings).toContain('BIG_TREE_OWNER_APEX');
    expect(bindings).toContain('BIG_TREE_OWNER_NHI');
    expect(bindings).toContain('bindBigTreeFauna(BIG_TREE_OWNER_NHI, this.bigTreeNhiSource)');
    expect(bindings).toContain('this.superBodies');
    expect(bindings).not.toContain('this.heroBodies');
    expect(source).toContain('this.shoggoths.count +');
    expect(source).toContain('this.puppets.count +');
    expect(source).toContain('this.titans.count +');
    expect(source).toContain('this.leviathans.count +');
    expect(source).toContain('APEX_INDIVIDUATED +');
    expect(source).toContain('World.NHI_POPULATION_CAP');
  });

  test('wires the same sanctuary into aggression, hazards, and ChaosField without debug lines', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('this.entities.attachSanctuary(this.bigTreeOrdinaryProtectedAt)');
    expect(source).toContain('this.shoggoths.attachSanctuary(this.bigTreeShoggothProtectedAt)');
    expect(source).toContain('this.puppets.attachSanctuary(this.bigTreePuppetProtectedAt)');
    expect(source).toContain('this.titans.attachSanctuary(this.bigTreeTitanProtectedAt)');
    expect(source).toContain('this.singularities.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.chaosField.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('safeZoneAt: this.bigTreeXenomimicProtectedAt');
    expect(source).not.toMatch(/BigTree.*(?:Line|LineSegments|ArrowHelper)/);
  });

  test('composition-root membership keeps independent living-species hysteresis histories', () => {
    const zone = new BigTreeZone({ centerX: 0, centerZ: 0 });
    const world = Object.create(World.prototype) as WorldMembershipHarness;
    world.bigTreeZone = zone;
    world.bigTreeSanctuary = new BigTreeSanctuaryMembershipRegistry(zone, 16);

    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 10, 250, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 20, 250, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_SHOGGOTH, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_TITAN, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_PUPPET, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 271, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 250, 0)).toBe(true);
    expect(world.bigTreeSanctuary.protectedMembers).toBe(4);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_SHOGGOTH, 0, 271, 0)).toBe(false);
    expect(world.bigTreeSanctuary.protectedMembers).toBe(3);
  });

  test('restores and flushes only the food checkpoint across application lifecycle boundaries', async () => {
    const [worldSource, mainSource] = await Promise.all([
      Bun.file(WORLD_URL).text(),
      Bun.file(MAIN_URL).text(),
    ]);
    const crystalConstruction = worldSource.indexOf(
      'this.crystalEcosystem = new CrystalEcosystem(',
    );
    const foodRestore = worldSource.indexOf(
      'this.crystalEcosystem.restoreFoodPersistence(opts.bigTreeEcology.food)',
      crystalConstruction,
    );
    const visitorConstruction = worldSource.indexOf(
      'this.bigTreeVisits = new BigTreeVisitManager(',
      foodRestore,
    );
    expect(crystalConstruction).toBeGreaterThan(-1);
    expect(foodRestore).toBeGreaterThan(crystalConstruction);
    expect(visitorConstruction).toBeGreaterThan(foodRestore);

    expect(worldSource).toContain('persistBigTreeEcology(): void');
    expect(worldSource).toContain('food: this.crystalEcosystem.snapshotFoodPersistence()');
    expect(worldSource).toMatch(
      /this\.bigTreeFaunaVisitors\.reset\(\);[\s\S]*this\.bigTreeVisitors\.reset\(\);[\s\S]*this\.crystalEcosystem\.resetFood\(this\.state\.elapsed\);[\s\S]*this\.store\.clearBigTreeEcology\(\)/,
    );
    expect(worldSource).toContain('resources.persistenceRevision');
    expect(worldSource).toContain('resources.hasPendingRespawns');
    expect(worldSource).toContain('foodTime !== this.lastPersistedBigTreeFoodTime');
    expect(worldSource).toContain('if (saved) {');
    expect(worldSource).toContain(
      'opts.bigTreeEcology.food.entries.some((entry) => entry.remainingRespawn === null)',
    );
    expect(worldSource).toContain('food: this.crystalEcosystem.snapshotFoodPersistence()');
    expect(mainSource).toContain('const bigTreeEcology = store.loadBigTreeEcology();');
    expect(mainSource).toContain('bigTreeEcology,');
    expect(mainSource).toContain("document.visibilityState === 'visible'");
    expect(mainSource).toContain('world?.persistBigTreeEcology();');
    expect(mainSource).toContain("window.addEventListener('pagehide'");

    // The persisted schema remains deliberately bounded: no actor-lifecycle state can be replayed.
    const persistenceMethod = worldSource.slice(
      worldSource.indexOf('persistBigTreeEcology(): void'),
      worldSource.indexOf(
        '/** Legacy doSplit',
        worldSource.indexOf('persistBigTreeEcology(): void'),
      ),
    );
    expect(persistenceMethod).not.toMatch(/visit|slot|partner|cooldown|owner/i);
  });

  test('exposes pull-only ecology observability locally and remains inert in production', async () => {
    const source = await Bun.file(WORLD_URL).text();
    const main = await Bun.file(MAIN_URL).text();
    const start = source.indexOf('  getBigTreeEcologySnapshot(');
    const end = source.indexOf('\n  /**\n   * Read-only perf telemetry', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);

    expect(body).toContain('if (!this.developmentDiagnostics) return null;');
    expect(body).toContain('this.bigTreeVisits.readVisit(kind, id, visitView)');
    expect(body).toContain('lastTransitionCauseName: bigTreeTransitionCauseName(');
    expect(body).toContain('remainingStateSeconds: remaining(');
    expect(body).toContain('foodReservationOwnerId: resource?.ownerId ?? null');
    expect(body).toContain('aggressionSuppressed: registered ? membershipView.protected : null');
    expect(body).toContain('this.crystalEcosystem.neuralStatus()');
    expect(body).toContain('this.crystalEcosystem.edibleResources.get(');
    expect(body).not.toContain('this.crystalEcosystem.edibleResources.all');
    expect(body).not.toMatch(/(?:Line|LineSegments|ArrowHelper)/);

    expect(main).toContain('const developmentDiagnostics =');
    expect(main).toContain('developmentDiagnostics,');
    expect(main).toContain('if (developmentDiagnostics) {');
    expect(main).toContain('world?.getBigTreeEcologySnapshot(query) ?? null');

    const disabled = Object.create(World.prototype) as WorldDiagnosticGateHarness;
    disabled.developmentDiagnostics = false;
    expect(disabled.getBigTreeEcologySnapshot()).toBeNull();
  });
});
