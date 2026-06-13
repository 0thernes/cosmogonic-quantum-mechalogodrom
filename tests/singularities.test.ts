/**
 * Cosmological singularities (CONTRACTS V7.4). Falsifiable claims:
 * - summon/dispose toggle `active` + `kind`; construction draws no rng (boot-stream-neutral);
 * - a BLACK HOLE consumes organisms that cross its event horizon (population drops);
 * - a WHITE HOLE ejects an organism placed inside the horizon back outside it;
 * - a STRANGE STAR recolours an organism inside its conversion radius;
 * - ENTROPY raises the world heat (chaos);
 * - every kind keeps entity positions/velocities FINITE over a long run of the real frame loop;
 * - same seed + same summon/update sequence ⇒ bit-identical population (determinism).
 *
 * Headless: three's Scene/Mesh/Material need no DOM (the fake-ctx pattern).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { SINGULARITY_KINDS, SingularitySystem } from '../src/sim/singularities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

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

const CENTER = new THREE.Vector3(0, 32, 0);

describe('SingularitySystem', () => {
  test('SINGULARITY_KINDS is the five-effect cycle, all distinct', () => {
    expect(SINGULARITY_KINDS.length).toBe(5);
    expect(new Set(SINGULARITY_KINDS).size).toBe(5);
    expect([...SINGULARITY_KINDS]).toEqual([
      'entropy',
      'blackhole',
      'whitehole',
      'greyhole',
      'strangestar',
    ]);
  });

  test('construction draws no rng (boot-stream-neutral) and starts inactive', () => {
    // Two same-seed contexts: in one, draw immediately after building the EntityManager; in
    // the other, build the SingularitySystem in between. If the system constructor consumes
    // zero draws, the next rng value matches — proving boot-stream neutrality.
    const ctxA = makeCtx(42, 500);
    const entA = new EntityManager(ctxA);
    const x = ctxA.rng();

    const ctxB = makeCtx(42, 500);
    const entB = new EntityManager(ctxB);
    const sysB = new SingularitySystem(ctxB, entB);
    const y = ctxB.rng();

    expect(y).toBe(x);
    expect(sysB.active).toBe(false);
    expect(sysB.kind).toBeNull();
    // entA is the control that established the same rng position; touch it so it is not unused.
    expect(new SingularitySystem(ctxA, entA).active).toBe(false);
  });

  test('F-HOLES bodyForce: inactive→false; pulls into a black hole, pushes from a white hole; reach-gated', () => {
    const ctx = makeCtx(7, 500);
    const ent = new EntityManager(ctx);
    const sys = new SingularitySystem(ctx, ent);
    const out = new THREE.Vector3();

    // Inactive: no force, out zeroed.
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
    expect(out.lengthSq()).toBe(0);

    // Black hole pulls a body at +x back TOWARD the centre (−x delta), finite.
    sys.summon('blackhole', CENTER.clone());
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(true);
    expect(out.x).toBeLessThan(0);
    expect(Number.isFinite(out.x) && Number.isFinite(out.y) && Number.isFinite(out.z)).toBe(true);

    // White hole pushes the same body AWAY from the centre (+x delta).
    sys.summon('whitehole', CENTER.clone());
    sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out);
    expect(out.x).toBeGreaterThan(0);

    // Far outside the reach → no force.
    sys.summon('blackhole', CENTER.clone());
    expect(sys.bodyForce(CENTER.x + 1e6, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
    expect(out.lengthSq()).toBe(0);

    // Disposed → field gone again.
    sys.dispose();
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
  });

  test('summon activates the chosen kind; dispose clears it', () => {
    const ctx = makeCtx(3, 500);
    const sys = new SingularitySystem(ctx, new EntityManager(ctx));
    sys.summon('blackhole', CENTER);
    expect(sys.active).toBe(true);
    expect(sys.kind).toBe('blackhole');
    sys.dispose();
    expect(sys.active).toBe(false);
    expect(sys.kind).toBeNull();
  });

  test('a black hole consumes organisms crossing the event horizon', () => {
    const ctx = makeCtx(4, 500);
    const entities = new EntityManager(ctx);
    entities.reset(200);
    const sys = new SingularitySystem(ctx, entities);
    // Place a cluster just off the exact centre (the r²<1e-6 guard skips dead-centre) but well
    // inside the horizon, so they must be consumed.
    for (let i = 0; i < 30; i++) {
      const e = entities.list[i];
      if (e) e.position.set(CENTER.x + 1 + i * 0.05, CENTER.y, CENTER.z);
    }
    const before = entities.list.length;
    sys.summon('blackhole', CENTER);
    for (let f = 0; f < 5; f++) sys.update(1 / 60, f / 60);
    expect(entities.list.length).toBeLessThan(before);
    expect(sys.consumed).toBeGreaterThan(0);
  });

  test('a white hole ejects an organism placed inside the horizon back outside it', () => {
    const ctx = makeCtx(5, 500);
    const entities = new EntityManager(ctx);
    entities.reset(50);
    const sys = new SingularitySystem(ctx, entities);
    const e = entities.list[0];
    expect(e).toBeDefined();
    e!.position.set(CENTER.x + 2, CENTER.y, CENTER.z); // 2 units from centre — inside the horizon
    const dBefore = e!.position.distanceTo(CENTER);
    sys.summon('whitehole', CENTER);
    sys.update(1 / 60, 0);
    const dAfter = e!.position.distanceTo(CENTER);
    expect(dAfter).toBeGreaterThan(dBefore + 10); // thrown out well past where it was
  });

  test('a strange star recolours an organism inside its conversion radius', () => {
    const ctx = makeCtx(6, 500);
    const entities = new EntityManager(ctx);
    entities.reset(50);
    const sys = new SingularitySystem(ctx, entities);
    const e = entities.list[0];
    expect(e).toBeDefined();
    e!.position.set(CENTER.x + 3, CENTER.y, CENTER.z);
    const before = e!.material.color.clone();
    sys.summon('strangestar', CENTER);
    sys.update(1 / 60, 0);
    // The strange-matter stain is a fixed quark-green; the colour must have changed.
    expect(e!.material.color.equals(before)).toBe(false);
    expect(e!.material.color.r).toBeCloseTo(0.18, 5);
    expect(e!.material.color.g).toBeCloseTo(0.34, 5);
  });

  test('entropy raises the world heat (chaos)', () => {
    const ctx = makeCtx(7, 500);
    const entities = new EntityManager(ctx);
    entities.reset(100);
    const sys = new SingularitySystem(ctx, entities);
    ctx.state.chaos = 1;
    sys.summon('entropy', CENTER);
    for (let f = 0; f < 30; f++) sys.update(1 / 60, f / 60);
    expect(ctx.state.chaos).toBeGreaterThan(1);
    expect(ctx.state.chaos).toBeLessThanOrEqual(10);
  });

  test('every kind keeps positions/velocities finite over the real frame loop', () => {
    for (const kind of SINGULARITY_KINDS) {
      const ctx = makeCtx(8, 600);
      const entities = new EntityManager(ctx);
      entities.reset(200);
      const sys = new SingularitySystem(ctx, entities);
      sys.summon(kind, CENTER);
      const state = ctx.state;
      for (let f = 0; f < 240; f++) {
        state.frame++;
        state.elapsed += 1 / 60;
        if (state.frame % 2 === 0) {
          ctx.grid.clear();
          for (const e of entities.list) if (e) ctx.grid.insert(e);
        }
        sys.update(1 / 60, state.elapsed);
        entities.update(1 / 60, state.elapsed);
      }
      for (const e of entities.list) {
        if (!e) continue;
        expect(Number.isFinite(e.position.x)).toBe(true);
        expect(Number.isFinite(e.position.y)).toBe(true);
        expect(Number.isFinite(e.position.z)).toBe(true);
        expect(Number.isFinite(e.userData.vel.x)).toBe(true);
        expect(Number.isFinite(e.userData.vel.lengthSq())).toBe(true);
      }
    }
  });

  test('same seed + same sequence ⇒ identical population (determinism)', () => {
    const run = (): number[] => {
      const ctx = makeCtx(99, 400);
      const entities = new EntityManager(ctx);
      entities.reset(150);
      const sys = new SingularitySystem(ctx, entities);
      const state = ctx.state;
      sys.summon('blackhole', CENTER);
      for (let f = 0; f < 120; f++) {
        state.frame++;
        state.elapsed += 1 / 60;
        sys.update(1 / 60, state.elapsed);
        entities.update(1 / 60, state.elapsed);
      }
      const out: number[] = [entities.list.length];
      for (let i = 0; i < Math.min(20, entities.list.length); i++) {
        const e = entities.list[i];
        if (e) out.push(e.position.x, e.position.y, e.position.z);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
