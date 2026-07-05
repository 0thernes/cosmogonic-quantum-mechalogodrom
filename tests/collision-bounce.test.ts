/**
 * COLLISION BOUNCE (V128, USER stage E). Organisms ricochet off the big solid bodies instead of
 * ghosting through. Falsifiable: a penetrating organism is EJECTED to the collider surface and its
 * INWARD velocity is mirrored (× restitution 0.85); an outside organism is untouched; an inside one
 * already moving OUT is ejected but not reflected; frozen dt is a no-op; deterministic.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { CollisionBounce, type BounceCollider } from '../src/sim/collision-bounce';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

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

function makeCtx(seed: number): SimContext {
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
      maxEntities: 50,
      targetEntities: 50,
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

const COL: BounceCollider = { x: 0, y: 0, z: 0, r: 10 };

function spawnAt(entities: EntityManager, x: number, y: number, z: number): Entity {
  const e = entities.spawn(new THREE.Vector3(x, y, z), 0)!;
  return e;
}

describe('CollisionBounce', () => {
  test('a penetrating organism moving inward is ejected to the surface + its velocity reflects', () => {
    const ctx = makeCtx(1);
    const entities = new EntityManager(ctx);
    const bounce = new CollisionBounce();
    const e = spawnAt(entities, 3, 0, 0); // inside r=10 on +x
    e.userData.vel.set(-5, 0, 0); // barrelling toward the centre
    const hits = bounce.update([COL], entities, DT);
    expect(hits).toBe(1);
    expect(bounce.impacts).toBe(1);
    // ejected to the +x surface
    expect(e.position.x).toBeCloseTo(10, 5);
    expect(e.position.y).toBeCloseTo(0, 5);
    expect(e.position.z).toBeCloseTo(0, 5);
    // inward −5 reflected to +5·restitution = +4.25 (now heading OUT)
    expect(e.userData.vel.x).toBeCloseTo(4.25, 4);
  });

  test('an organism OUTSIDE the collider is untouched', () => {
    const ctx = makeCtx(2);
    const entities = new EntityManager(ctx);
    const bounce = new CollisionBounce();
    const e = spawnAt(entities, 40, 0, 0); // well outside
    e.userData.vel.set(-5, 0, 0);
    const hits = bounce.update([COL], entities, DT);
    expect(hits).toBe(0);
    expect(e.position.x).toBeCloseTo(40, 5);
    expect(e.userData.vel.x).toBeCloseTo(-5, 5);
  });

  test('a penetrating organism already moving OUT is ejected but not reflected', () => {
    const ctx = makeCtx(3);
    const entities = new EntityManager(ctx);
    const bounce = new CollisionBounce();
    const e = spawnAt(entities, 3, 0, 0);
    e.userData.vel.set(2, 0, 0); // already heading outward
    bounce.update([COL], entities, DT);
    expect(e.position.x).toBeCloseTo(10, 5); // still ejected to the surface
    expect(e.userData.vel.x).toBeCloseTo(2, 5); // but velocity unchanged (leaving already)
  });

  test('frozen dt (pause) is a no-op', () => {
    const ctx = makeCtx(4);
    const entities = new EntityManager(ctx);
    const bounce = new CollisionBounce();
    const e = spawnAt(entities, 3, 0, 0);
    e.userData.vel.set(-5, 0, 0);
    expect(bounce.update([COL], entities, 0)).toBe(0);
    expect(e.position.x).toBeCloseTo(3, 5);
  });

  test('deterministic: two identical runs match', () => {
    const run = (): number[] => {
      const ctx = makeCtx(7);
      const entities = new EntityManager(ctx);
      const bounce = new CollisionBounce();
      for (let i = 0; i < 6; i++) {
        const e = spawnAt(entities, 2 + i * 0.5, i - 3, -1);
        e.userData.vel.set(-4, 1, 2);
      }
      bounce.update([COL], entities, DT);
      const out: number[] = [bounce.impacts];
      for (const e of entities.list)
        out.push(+e.position.x.toFixed(4), +e.userData.vel.x.toFixed(4));
      return out;
    };
    expect(run()).toEqual(run());
  });
});
