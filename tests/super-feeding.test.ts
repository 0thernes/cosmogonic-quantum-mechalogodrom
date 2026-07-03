/**
 * SUPER FEEDING (V128, USER stage C). The Super Creatures devour the organism swarm in their maw; each
 * eaten organism undergoes the gedanken neural-death (via onEat) and respawns 5 s later ELSEWHERE.
 * Falsifiable: eaten-in-maw / spared-far / spared-NHI / onEat-fires-before-disposal / respawn-after-5s /
 * bites capped per frame / deterministic. Headless fake-ctx (mirrors tests/portal-death.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { SuperFeeding } from '../src/sim/super-feeding';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const MAW = new THREE.Vector3(0, 60, 0); // an apex body centre
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

describe('SuperFeeding', () => {
  test('an organism in the maw is devoured (onEat fires before disposal); a far one is spared', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const feed = new SuperFeeding(ctx);
    const eaten: number[] = [];
    entities.spawn(MAW.clone(), 0); // in the maw
    const safe = entities.spawn(new THREE.Vector3(400, 3, 400), 1); // far away
    expect(safe).not.toBeNull();
    feed.update([MAW.clone()], entities, 1, DT, (e, i) => {
      expect(entities.list[i]).toBe(e); // still present when onEat fires
      eaten.push(i);
    });
    expect(eaten.length).toBe(1);
    expect(feed.stats().meals).toBe(1);
    expect(feed.stats().pending).toBe(1);
    expect(entities.list.length).toBe(1);
    expect(entities.list[0]).toBe(safe as Entity);
    feed.dispose();
  });

  test('a launched NHI (isNhi) is spared the maw', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const feed = new SuperFeeding(ctx);
    const nhi = entities.spawn(MAW.clone(), 0);
    nhi!.userData.isNhi = true;
    feed.update([MAW.clone()], entities, 1, DT);
    expect(feed.stats().meals).toBe(0);
    expect(entities.list.length).toBe(1);
    feed.dispose();
  });

  test('at most BITES_PER_FRAME (3) are eaten per apex per frame', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const feed = new SuperFeeding(ctx);
    for (let i = 0; i < 8; i++) entities.spawn(MAW.clone(), i % 5); // 8 in the maw
    feed.update([MAW.clone()], entities, 1, DT);
    expect(feed.stats().meals).toBe(3); // capped
    expect(entities.list.length).toBe(5);
    feed.dispose();
  });

  test('a devoured organism re-enters the world after ~5 s', () => {
    const ctx = makeCtx(4, 50);
    const entities = new EntityManager(ctx);
    const feed = new SuperFeeding(ctx);
    entities.spawn(MAW.clone(), 0);
    feed.update([MAW.clone()], entities, 10, DT); // eaten at t=10
    expect(entities.list.length).toBe(0);
    feed.update([], entities, 14.5, DT); // before the delay (no supers ⇒ no new bites)
    expect(entities.list.length).toBe(0);
    feed.update([], entities, 15.02, DT); // 10 + 5 elapsed → respawns
    expect(entities.list.length).toBe(1);
    expect(feed.stats().pending).toBe(0);
    feed.dispose();
  });

  test('frozen dt (pause) eats nothing', () => {
    const ctx = makeCtx(5, 50);
    const entities = new EntityManager(ctx);
    const feed = new SuperFeeding(ctx);
    entities.spawn(MAW.clone(), 0);
    feed.update([MAW.clone()], entities, 1, 0);
    expect(feed.stats().meals).toBe(0);
    expect(entities.list.length).toBe(1);
    feed.dispose();
  });

  test('deterministic: two identical feeding runs match', () => {
    const run = (): { meals: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const feed = new SuperFeeding(ctx);
      for (let i = 0; i < 10; i++) entities.spawn(MAW.clone(), i % 5);
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        feed.update([MAW.clone()], entities, t, DT);
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      feed.dispose();
      return { meals: feed.stats().meals, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});
