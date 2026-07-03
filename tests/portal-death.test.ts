/**
 * PORTAL DEATH ZONE (V126, USER). The ascension Portal (the MonolithTemple void throat) kills any
 * population organism that touches it; the organism respawns ELSEWHERE 5 seconds later. Falsifiable:
 * - an organism inside the void sphere is disposed; one far away is untouched;
 * - the death is queued and re-enters the world after ~5 s (and not inside the portal);
 * - disarmed (temple not revealed) the portal kills nothing;
 * - determinism: two identical runs kill + respawn bit-identically (no rng in the VFX, seeded respawn).
 *
 * Headless fake-ctx (mirrors tests/entities-death.test.ts): three's Scene/Mesh need no DOM until render.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { PortalDeath } from '../src/sim/portal-death';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const ARENA_MID = 2.5;
/** Void-throat world centre (matches portal-death.ts): (0, 60, -101.25). */
const PORTAL = new THREE.Vector3(0, 24 * ARENA_MID, -40 * ARENA_MID - 0.5 * ARENA_MID);
const KILL_R = 9 * ARENA_MID;
const DT = 1 / 60;

function makeState(): SimState {
  return {
    chaos: 0.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone' as const,
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

describe('PortalDeath', () => {
  test('an organism inside the void sphere is killed; one far away is untouched', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0); // dead-centre of the portal
    const safe = entities.spawn(new THREE.Vector3(300, 3, 300), 1); // far corner
    expect(safe).not.toBeNull();
    expect(entities.list.length).toBe(2);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(entities.list[0]).toBe(safe as Entity); // the far one survived
    expect(pd.kills).toBe(1);
    expect(pd.stats().pending).toBe(1); // queued to respawn
    pd.dispose();
  });

  test('a rim-adjacent organism just OUTSIDE the sphere survives', () => {
    const ctx = makeCtx(9, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    // Just beyond the kill radius on +x from the portal centre.
    entities.spawn(new THREE.Vector3(PORTAL.x + KILL_R + 2, PORTAL.y, PORTAL.z), 0);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('the dead organism re-enters the world after ~5 s, elsewhere', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 10, DT); // kill at t=10
    expect(entities.list.length).toBe(0);
    expect(pd.stats().pending).toBe(1);
    pd.update(entities, 14.5, DT); // still before the 5-second delay
    expect(entities.list.length).toBe(0);
    pd.update(entities, 15.02, DT); // 10 + 5 elapsed → respawns
    expect(entities.list.length).toBe(1);
    expect(pd.stats().pending).toBe(0);
    const p = entities.list[0]!.position;
    expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
    pd.dispose();
  });

  test('disarmed (temple not revealed) the portal kills nothing', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(false); // temple not revealed
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('frozen dt (pause) kills nothing even when armed', () => {
    const ctx = makeCtx(4, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 1, 0); // paused
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('deterministic: two identical runs kill + respawn identically', () => {
    const run = (): { kills: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const pd = new PortalDeath(ctx);
      pd.setActive(true);
      for (let i = 0; i < 8; i++) entities.spawn(PORTAL.clone(), i % 5); // 8 organisms in the sphere
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        pd.update(entities, t, DT); // ~7 s — deaths at t≈0, respawns fire at t≈5
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      pd.dispose();
      return { kills: pd.kills, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});
