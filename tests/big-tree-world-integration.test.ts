import { describe, expect, test } from 'bun:test';

const WORLD_URL = new URL('../src/world.ts', import.meta.url);

describe('Big Tree production composition root', () => {
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
    const start = source.indexOf('const bigTreeFaunaBindings: BigTreeFaunaSourceBinding[]');
    const end = source.indexOf('this.bigTreeFaunaVisitors = new BigTreeFaunaVisitors', start);
    const bindings = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(bindings).toContain('BIG_TREE_OWNER_SHOGGOTH');
    expect(bindings).toContain('BIG_TREE_OWNER_TITAN');
    expect(bindings).toContain('BIG_TREE_OWNER_LEVIATHAN');
    expect(bindings).toContain('BIG_TREE_OWNER_PUPPET');
    expect(bindings).toContain('BIG_TREE_OWNER_APEX');
    expect(bindings).toContain('this.superBodies');
    expect(bindings).not.toContain('this.heroBodies');
    expect(source).toContain('this.shoggoths.count +');
    expect(source).toContain('this.puppets.count +');
    expect(source).toContain('this.titans.count +');
    expect(source).toContain('this.leviathans.count +');
  });

  test('wires the same sanctuary into aggression, hazards, and ChaosField without debug lines', async () => {
    const source = await Bun.file(WORLD_URL).text();
    expect(source).toContain('this.entities.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.shoggoths.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.puppets.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.titans.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.singularities.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('this.chaosField.attachSanctuary(this.bigTreeProtectedAt)');
    expect(source).toContain('safeZoneAt: this.bigTreeProtectedAt');
    expect(source).not.toMatch(/BigTree.*(?:Line|LineSegments|ArrowHelper)/);
  });
});
