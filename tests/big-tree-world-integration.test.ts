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
  test('uses one canonical Crystal food source and one bounded multi-species visitor scheduler', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('new BigTreeVisitManager(this.bigTreeZone');
    expect(source).toMatch(
      /new BigTreeSpeciesVisitors\(\s*this\.crystalEcosystem,\s*this\.bigTreeVisits,/,
    );
    expect(source).toMatch(
      /new BigTreeFaunaVisitors\(\s*this\.crystalEcosystem,\s*this\.bigTreeVisits,/,
    );
    expect(source).toContain('bindBigTreeFauna(BIG_TREE_OWNER_SHOGGOTH, this.shoggoths)');
    expect(source).toContain('bindBigTreeFauna(BIG_TREE_OWNER_TITAN, this.titans)');
    expect(source).toContain('bindBigTreeFauna(BIG_TREE_OWNER_PUPPET_MASTER, this.puppets)');
    expect(source).toContain('bindBigTreeFauna(BIG_TREE_OWNER_NHI, this.bigTreeNhiSource)');
    expect(source).toContain('new NhiBigTreeSource(');
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
    expect(source).toContain('this.bigTreeFaunaVisitors.update(time, dt, environment);');
    expect(source).toContain('(2 * stats.socialPairs) / Math.max(1, totalVisitors)');
    expect(source).toContain('this.bigTreeNhiSource?.readIntent(id, this.bigTreeNhiIntent)');
    expect(source).toContain('applyNhiBigTreeIntent(this.bigTreeNhiIntent, p, v)');
  });

  test('wires identity-aware membership into living beings and conservative endpoints into hazards', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('this.entities.attachSanctuary(this.bigTreeOrdinaryProtectedAt)');
    expect(source).toContain('safeZoneAt: this.bigTreeXenomimicProtectedAt');
    expect(source).toContain('pairId * 2 + role');
    expect(source).toContain('this.shoggoths.attachSanctuary(this.bigTreeShoggothProtectedAt)');
    expect(source).toContain('this.puppets.attachSanctuary(this.bigTreePuppetProtectedAt)');
    expect(source).toContain('this.titans.attachSanctuary(this.bigTreeTitanProtectedAt)');
    expect(source).toContain('this.singularities.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.chaosField.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toMatch(
      /this\.portalDeathFauna\.update\([\s\S]*?this\.bigTreeProtectedAt,\s*\);/,
    );
    expect(source).toContain('this.bigTreeSanctuary?.protectsEndpoint(x, z)');
    expect(source).not.toMatch(/BigTree.*(?:Line|LineSegments|ArrowHelper)/);
  });

  test('composition-root membership keeps independent living-species hysteresis histories', () => {
    const zone = new BigTreeZone({ centerX: 0, centerZ: 0 });
    const world = Object.create(World.prototype) as WorldMembershipHarness;
    world.bigTreeZone = zone;
    world.bigTreeSanctuary = new BigTreeSanctuaryMembershipRegistry(zone, 16);

    // First arrival in the annulus is outside for either species.
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 10, 250, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 20, 250, 0)).toBe(false);

    // A different stable identity enters, then retains protection through that same annulus point.
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_SHOGGOTH, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_TITAN, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_PUPPET, 0, 239, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_SHOGGOTH, 0, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_TITAN, 0, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_PUPPET, 0, 250, 0)).toBe(true);

    // Crossing the outer boundary clears only that identity's retained state.
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_ORDINARY, 11, 271, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_XENOMIMIC, 21, 250, 0)).toBe(true);
    expect(world.bigTreeSanctuary.protectedMembers).toBe(4);

    // Each fixed kind owns independent history even when stable numeric IDs overlap.
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_SHOGGOTH, 0, 271, 0)).toBe(false);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_TITAN, 0, 250, 0)).toBe(true);
    expect(world.isBigTreeMemberProtected(BIG_TREE_SANCTUARY_PUPPET, 0, 250, 0)).toBe(true);
    expect(world.bigTreeSanctuary.protectedMembers).toBe(3);
  });

  test('death, predation, reset, and disposal release identity membership', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toMatch(
      /this\.entities\.onDeath = \(x, z, entity\) => \{[\s\S]*?this\.bigTreeSanctuary\.remove\(BIG_TREE_SANCTUARY_ORDINARY, ecologyId\)/,
    );
    expect(source).toMatch(
      /event\.kind === 'death' \|\| event\.kind === 'eaten'[\s\S]*?this\.bigTreeSanctuary\?\.remove\(\s*BIG_TREE_SANCTUARY_XENOMIMIC,\s*event\.pairId \* 2 \+ event\.role/,
    );

    const resetStart = source.indexOf('private resetSim(): void {');
    const resetEnd = source.indexOf('  private summonSingularity', resetStart);
    const resetBody = source.slice(resetStart, resetEnd);
    expect(resetBody).toContain('this.bigTreeVisitors.resetOrdinary();');
    expect(resetBody).not.toContain('this.bigTreeVisitors.reset();');
    expect(resetBody).not.toContain('this.bigTreeFaunaVisitors.reset();');
    expect(resetBody).not.toContain('this.bigTreeVisits.reset();');
    expect(resetBody).not.toContain('this.crystalEcosystem.resetFood(');
    expect(resetBody).toContain('this.clearNhiPopulation();');
    const sanctuaryReset = source.indexOf(
      'this.bigTreeSanctuary.removeKind(BIG_TREE_SANCTUARY_ORDINARY);',
      resetStart,
    );
    const entityReset = source.indexOf('this.entities.reset(1);', resetStart);
    expect(sanctuaryReset).toBeGreaterThan(resetStart);
    expect(entityReset).toBeGreaterThan(sanctuaryReset);

    const disposeStart = source.indexOf('dispose(): void {');
    const faunaAdapterReset = source.indexOf('this.bigTreeFaunaVisitors.reset();', disposeStart);
    const speciesAdapterReset = source.indexOf('this.bigTreeVisitors.reset();', disposeStart);
    const managerReset = source.indexOf('this.bigTreeVisits.reset();', disposeStart);
    const faunaSystemDispose = source.indexOf('this.shoggoths.dispose();', disposeStart);
    expect(faunaAdapterReset).toBeGreaterThan(disposeStart);
    expect(speciesAdapterReset).toBeGreaterThan(faunaAdapterReset);
    expect(managerReset).toBeGreaterThan(speciesAdapterReset);
    expect(faunaSystemDispose).toBeGreaterThan(managerReset);
    expect(source.indexOf('this.bigTreeSanctuary.reset();', disposeStart)).toBeGreaterThan(
      disposeStart,
    );
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
