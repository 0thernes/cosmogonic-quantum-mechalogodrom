/** Static integration seals for lifecycle/reset wiring that is otherwise buried in the World root. */
import { describe, expect, test } from 'bun:test';

const WORLD = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
const EDGES = await Bun.file(new URL('../src/ui/panel-edge-toggles.ts', import.meta.url)).text();

describe('World lifecycle wiring', () => {
  test('apex progression consumes the real clamped, time-scaled frame delta', () => {
    expect(WORLD).toContain('this.driveSuper(bands.bass, bands.level, t, n, dt);');
    const start = WORLD.indexOf('private driveSuper');
    const end = WORLD.indexOf('\n  /**', start + 1);
    const body = WORLD.slice(start, end);
    expect(body).toContain('n: number, dt: number');
    // GOAL: every Archon self-evolves per-frame on the real dt (not a fixed 1/60) — the tick is now
    // per-Archon (`evo` = superEvos[i]) inside the 5-Archon loop, not a single prime-only `superEvo`.
    expect(body).toContain('evo.tick(dt, evoVitality);');
    expect(body).toMatch(/this\.superheroState\.tick\(\s*dt,/);
    expect(body).not.toMatch(/\.tick\(1 \/ 60/); // no fixed-delta progression anywhere in driveSuper
  });

  test('ALL 5 Archons get their own wingman escort + evolution (parity, not prime-only)', () => {
    // Per-Archon construction: one swarm + renderer + evolution + evo-rng pushed per Archon.
    expect(WORLD).toContain('this.wingSwarms.push(');
    expect(WORLD).toContain('this.wingRenders.push(');
    expect(WORLD).toContain('this.superEvos.push(');
    expect(WORLD).toContain('this.evoRngs.push(');
    // The prime-only singletons are gone — no single wingSwarm/superEvo drive survives.
    expect(WORLD).not.toContain('this.wingSwarm.update(');
    expect(WORLD).not.toContain('this.superEvo.tick(');
    // Each Archon's escort + evolution is driven inside a loop, indexed by the Archon.
    expect(WORLD).toMatch(/this\.wingSwarms\[i\]/);
    expect(WORLD).toMatch(/this\.superEvos\[i\]/);
    // The FIRST Archon to summit raises the ONE monolith temple (idempotent ascend), reached via milestones.
    const start = WORLD.indexOf('private driveSuper');
    const end = WORLD.indexOf('\n  /**', start + 1);
    const body = WORLD.slice(start, end);
    expect(body).toContain('const evo = this.superEvos[i]!;');
    expect(body).toContain('evo.takeMilestone()');
  });

  test('Genesis clears every delayed population respawn before creating one progenitor', () => {
    const start = WORLD.indexOf('private resetSim');
    const end = WORLD.indexOf('\n  /**', start + 1);
    const body = WORLD.slice(start, end);
    const resetAt = body.indexOf('this.entities.reset(1)');
    expect(resetAt).toBeGreaterThan(0);
    for (const system of ['domeFeeding', 'mechaBlaze', 'portalDeath', 'superHunt']) {
      const clearAt = body.indexOf(`this.${system}.clearPendingRespawns()`);
      expect(clearAt, system).toBeGreaterThanOrEqual(0);
      expect(clearAt, system).toBeLessThan(resetAt);
    }
    expect(body.indexOf('this.clearNhiPopulation()')).toBeGreaterThanOrEqual(0);
    expect(body.indexOf('this.clearNhiPopulation()')).toBeLessThan(resetAt);
  });

  test('NHI death/reset retires minds, bodies, targets, and collision-free economy wallets', () => {
    expect(WORLD).not.toContain('ECON_NHI_BASE');
    expect(WORLD).toContain('return -(nid + 1);');
    const liveStart = WORLD.indexOf('private nhiLiveIds');
    const liveEnd = WORLD.indexOf('\n  /**', liveStart + 1);
    const liveBody = WORLD.slice(liveStart, liveEnd);
    expect(liveBody).toContain('this.economy.unregister(World.nhiEconomyId(id))');
    expect(liveBody).toContain('this.nhiBody.remove(id)');
    expect(liveBody).toContain('this.bigTreeFaunaVisitors?.cancel(BIG_TREE_OWNER_NHI, id)');
    expect(liveBody).toContain('this.bigTreeNhiSource?.unregister(id)');
    expect(liveBody).toContain("'retire-dead-economy'");
    expect(liveBody).toContain("'retire-dead-body'");

    const clearStart = WORLD.indexOf('private clearNhiPopulation');
    const clearEnd = WORLD.indexOf('\n  /**', clearStart + 1);
    const clearBody = WORLD.slice(clearStart, clearEnd);
    for (const operation of [
      'this.economy.unregister(World.nhiEconomyId(id))',
      'this.nhiEntities.clear()',
      'this.nhiTargets.clear()',
      'this.bigTreeNhiSource?.reset()',
      'this.nhi.clear()',
      "'clear-population-body'",
    ]) {
      expect(clearBody).toContain(operation);
    }
  });

  test('NHI launch is bounded before user-event RNG and keeps a reverse spatial identity map', () => {
    expect(WORLD).toContain('private static readonly NHI_POPULATION_CAP = NHI_SYSTEM_MIND_CAP;');
    expect(WORLD).toContain('private readonly nhiIdsByEntity = new Map<Entity, number>();');
    const start = WORLD.indexOf('private launchNhiBeing');
    const end = WORLD.indexOf('\n  /**', start + 1);
    const body = WORLD.slice(start, end);
    const capAt = body.indexOf('this.nhiEntities.size >= World.NHI_POPULATION_CAP');
    const idAt = body.indexOf('const nid = this.nhiNextId++;');
    const cameraAt = body.indexOf('cam.getWorldDirection(this.sv2);');
    const effectAt = body.indexOf('this.nhiEffectRng()');
    expect(capAt).toBeGreaterThanOrEqual(0);
    expect(capAt).toBeLessThan(idAt);
    expect(idAt).toBeLessThan(cameraAt);
    expect(idAt).toBeLessThan(effectAt);
    expect(body.indexOf('try {', idAt)).toBeLessThan(cameraAt);
    expect(body.indexOf('try {', idAt)).toBeLessThan(effectAt);
    expect(body).toContain('this.nhi.register(nid, this.nhiBirthRng);');
    expect(body).toContain("this.audit.record('nhi-launch-failed'");
    expect(body).not.toContain('this.uiRng()');
    expect(body).not.toContain('this.nhi.register(nid, this.rng)');
    expect(body).toContain('this.nhiIdsByEntity.set(e, nid);');
    expect(body).toContain('this.bigTreeNhiSource?.register(nid, e)');
    expect(body).toContain('const nid = this.nhiNextId++;');
    expect(body).toContain('this.entities.discardSpawnAt(entityIndex)');
    expect(body).not.toContain('this.entities.dispose(e)');
    expect(body).toContain('rngRollback: false');
    expect(body).toContain('logicalRollbackComplete');
    expect(body).toContain('rollbackCallFailures');
    expect(body).toContain('logicalRollbackPostconditions');
    expect(body).toContain("resourceCleanupStatus: 'best-effort-unverified'");
    expect(body).toContain('bodyAbsent: !this.nhiBody.has(nid)');
    expect(body).toContain("'launch-rollback-tree-visit'");
    expect(body).toContain("rollback('launch-rollback-tree-source'");
    expect(body).toContain('treeSourceAbsent: !this.bigTreeNhiSource?.has(nid)');
    expect(body).toContain('treeIntentAbsent: !this.bigTreeNhiSource?.hasIntent(nid)');
    expect(WORLD).toContain('const kin = this.grid.query(p.x, p.z, SOCIAL_NHI_KIN_R);');
    expect(WORLD).toContain('const oid = this.nhiIdsByEntity.get(oe);');
  });

  test('NHI social audio is guarded and burns its cooldown before the external sink runs', () => {
    const callback = WORLD.indexOf('(_id, level) => {');
    const cooldown = WORLD.indexOf('this.nhiSocialCooldown = 24;', callback);
    const audio = WORLD.indexOf("this.nhiGuard('social-audio'", callback);
    expect(callback).toBeGreaterThanOrEqual(0);
    expect(cooldown).toBeGreaterThan(callback);
    expect(audio).toBeGreaterThan(cooldown);
  });

  test('edge-column controls are exposed only while the UI is a grid', () => {
    expect(EDGES).not.toMatch(/@media \(min-width: 600px\)[^{]*orientation/);
    expect((EDGES.match(/@media \(min-width: 769px\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
