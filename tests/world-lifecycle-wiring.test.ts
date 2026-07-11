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
    expect(body).toContain('this.superEvo.tick(dt, vitality);');
    expect(body).toMatch(/this\.superheroState\.tick\(\s*dt,/);
    expect(body).not.toContain('this.superEvo.tick(1 / 60');
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
    expect(liveBody).toContain("'retire-dead-economy'");
    expect(liveBody).toContain("'retire-dead-body'");

    const clearStart = WORLD.indexOf('private clearNhiPopulation');
    const clearEnd = WORLD.indexOf('\n  /**', clearStart + 1);
    const clearBody = WORLD.slice(clearStart, clearEnd);
    for (const operation of [
      'this.economy.unregister(World.nhiEconomyId(id))',
      'this.nhiEntities.clear()',
      'this.nhiTargets.clear()',
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
    expect(body).toContain('const nid = this.nhiNextId++;');
    expect(body).toContain('this.entities.discardSpawnAt(entityIndex)');
    expect(body).not.toContain('this.entities.dispose(e)');
    expect(body).toContain('rngRollback: false');
    expect(body).toContain('logicalRollbackComplete');
    expect(body).toContain('rollbackCallFailures');
    expect(body).toContain('logicalRollbackPostconditions');
    expect(body).toContain("resourceCleanupStatus: 'best-effort-unverified'");
    expect(body).toContain('bodyAbsent: !this.nhiBody.has(nid)');
    expect(WORLD).toContain('const kin = this.grid.query(p.x, p.z, 90);');
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
