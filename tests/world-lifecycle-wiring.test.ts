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
  });

  test('edge-column controls are exposed only while the UI is a grid', () => {
    expect(EDGES).not.toMatch(/@media \(min-width: 600px\)[^{]*orientation/);
    expect((EDGES.match(/@media \(min-width: 769px\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
