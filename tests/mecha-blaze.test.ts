/**
 * MECHA BLAZE (V127, USER "Mechalogodrom also KILLS/DESTROYS Entities … like the portal but in a FIERY
 * BLAZE … respawn in 5 seconds"). An organism that rises into the mecha's high kill sphere is incinerated
 * and re-enters ELSEWHERE ~5 s later. Falsifiable:
 * - an organism inside the sphere is disposed; one far below (normal arena) is untouched;
 * - the death re-enters after ~5 s; disarmed / frozen-dt kills nothing;
 * - determinism: two identical runs kill + respawn bit-identically.
 *
 * Headless fake-ctx mirrors tests/portal-death.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { MechaBlaze, MECHA_Y } from '../src/sim/mecha-blaze';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** Mecha kill-sphere centre (matches mecha-blaze.ts): (0, 756, 0) = 3× the original authored altitude. */
const MECHA = new THREE.Vector3(0, MECHA_Y, 0);
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
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
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

describe('MechaBlaze', () => {
  test('an organism inside the mecha sphere burns; one in the normal arena is untouched', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const mb = new MechaBlaze(ctx);
    entities.spawn(MECHA.clone(), 0); // flew up into the mecha
    const safe = entities.spawn(new THREE.Vector3(300, 3, 300), 1); // down in the arena
    expect(entities.list.length).toBe(2);
    mb.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(entities.list[0]).toBe(safe as Entity);
    expect(mb.kills).toBe(1);
    expect(mb.stats().pending).toBe(1);
    mb.dispose();
  });

  test('the fiery cone REACHES DOWN — a high-flyer below the mecha burns; one below the floor is safe', () => {
    const ctx = makeCtx(11, 50);
    const entities = new EntityManager(ctx);
    const mb = new MechaBlaze(ctx);
    entities.spawn(new THREE.Vector3(0, 600, 0), 0); // high-flyer under the mecha, inside the cone
    const lowSwarm = entities.spawn(new THREE.Vector3(0, 300, 0), 1); // below BLAZE_FLOOR → safe
    const wideMiss = entities.spawn(new THREE.Vector3(340, 600, 340), 2); // in the y-band but far outside the cone
    mb.update(entities, 1, DT);
    expect(mb.kills).toBe(1); // only the high-flyer in the cone burned
    expect(entities.list).toContain(lowSwarm as Entity);
    expect(entities.list).toContain(wideMiss as Entity);
    mb.dispose();
  });

  test('the incinerated organism re-enters the world after ~5 s', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const mb = new MechaBlaze(ctx);
    entities.spawn(MECHA.clone(), 0);
    mb.update(entities, 10, DT); // burn at t=10
    expect(entities.list.length).toBe(0);
    mb.update(entities, 14.5, DT); // before the delay
    expect(entities.list.length).toBe(0);
    mb.update(entities, 15.02, DT); // 10 + 5 → respawns
    expect(entities.list.length).toBe(1);
    expect(mb.stats().pending).toBe(0);
    mb.dispose();
  });

  test('disarmed kills nothing; frozen dt (pause) kills nothing', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const mb = new MechaBlaze(ctx);
    mb.setActive(false);
    entities.spawn(MECHA.clone(), 0);
    mb.update(entities, 1, DT);
    expect(mb.kills).toBe(0);
    mb.setActive(true);
    mb.update(entities, 1, 0); // frozen
    expect(mb.kills).toBe(0);
    expect(entities.list.length).toBe(1);
    mb.dispose();
  });

  test('a sanctuary-protected high-flyer is neither burned nor queued for a delayed respawn', () => {
    const ctx = makeCtx(41, 50);
    const entities = new EntityManager(ctx);
    const mb = new MechaBlaze(ctx);
    const protectedEntity = entities.spawn(MECHA.clone(), 0);
    let deathCallbacks = 0;
    let protectionChecks = 0;
    const isProtected = (x: number, z: number): boolean => {
      protectionChecks++;
      return x === MECHA.x && z === MECHA.z;
    };

    mb.update(entities, 1, DT, () => deathCallbacks++, isProtected);
    mb.update(entities, 7, DT, () => deathCallbacks++, isProtected);

    expect(protectionChecks).toBeGreaterThan(0);
    expect(entities.list).toEqual([protectedEntity as Entity]);
    expect(deathCallbacks).toBe(0);
    expect(mb.kills).toBe(0);
    expect(mb.stats().pending).toBe(0);
    mb.dispose();
  });

  test('deterministic: two identical runs incinerate + respawn identically', () => {
    const run = (): { kills: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const mb = new MechaBlaze(ctx);
      for (let i = 0; i < 6; i++) entities.spawn(MECHA.clone(), i % 5); // 6 up at the mecha
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        mb.update(entities, t, DT);
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      mb.dispose();
      return { kills: mb.kills, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});
