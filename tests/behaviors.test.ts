/**
 * Per-behavior finiteness + boundedness (Domain 08/10). The same-seed golden exercises the 26
 * behavior fields indirectly through the integrated population trace, but nothing isolates the
 * guarantee that EVERY handler keeps an entity finite — even a far escapee at maximum chaos, the
 * exact regime that historically overflowed `lorenz` to ±Infinity → NaN (see LORENZ_BOUND in
 * behaviors.ts, and tests/nan-stability.test.ts for the integrated version). This pins that guarantee
 * per behavior, so a future force tweak that reintroduces an overflow fails loudly and locally.
 *
 * Headless (fake-ctx pattern, no WebGL): drives the real `applyBehavior` dispatch over real
 * EntityManager entities with a populated grid, so neighbour-query behaviours (flock, nash, market,
 * typemorph, setunion, graphseek) run their real code paths.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { applyBehavior, type BehaviorEnv } from '../src/sim/behaviors';
import { BEHAVIORS } from '../src/sim/constants';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';
import { getQuantizationConfig } from '../src/math/quantization';

function makeState(): SimState {
  return {
    chaos: 6, // saturates the chaos multiplier (cMul = min(chaos/2, 3) = 3)
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0.5, z: 0.3 },
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
      maxEntities: 400,
      targetEntities: 400,
      quantumCount: 10,
      maxLinks: 100,
      quantization: getQuantizationConfig('phone'),
      shadows: false,
      starCount: 10,
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

function makeEnv(ctx: SimContext): BehaviorEnv {
  const t = 12.3;
  return {
    ctx,
    spawn: () => null, // 'split' reaches the cap → null, exactly like a full world
    sanctuaryAt: null,
    actorProtected: false,
    dt: 1 / 60,
    t,
    cm: 3, // max chaos multiplier — the hostile regime
    sp2: 3,
    sinWF: Math.sin(t),
    cosWF: Math.cos(t),
    doTheory: true,
    doFlock: true,
  };
}

function isFinite3(e: Entity): boolean {
  const p = e.position;
  const v = e.userData.vel;
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.z) &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  );
}

function firstEntity(ents: EntityManager): Entity {
  const e = ents.list.find((x): x is Entity => x != null);
  if (!e) throw new Error('no entity spawned');
  return e;
}

describe('behaviors — all 26 handlers stay finite and bounded', () => {
  test('the canonical list has the expected 26 fields', () => {
    expect(BEHAVIORS.length).toBe(26);
    expect(new Set(BEHAVIORS).size).toBe(26); // no duplicates
  });

  test('every behavior keeps a normal entity finite + bounded (no explosion)', () => {
    const ctx = makeCtx(0xb3ba71);
    const ents = new EntityManager(ctx);
    ents.reset(60);
    for (const e of ents.list) if (e) ctx.grid.insert(e);
    const env = makeEnv(ctx);
    const e = firstEntity(ents);
    for (const beh of BEHAVIORS) {
      e.userData.beh = beh;
      e.position.set(4, 6, -3);
      e.userData.vel.set(0.1, -0.2, 0.05);
      for (let k = 0; k < 10; k++) applyBehavior(e, env);
      expect(isFinite3(e)).toBe(true); // behavior `${beh}` must stay finite
      expect(e.userData.vel.length()).toBeLessThan(1e4); // and must not explode
    }
  });

  test('every behavior keeps a FAR-ESCAPEE finite at max chaos (the Lorenz overflow regime)', () => {
    const ctx = makeCtx(0x5ca733);
    const ents = new EntityManager(ctx);
    ents.reset(40);
    for (const e of ents.list) if (e) ctx.grid.insert(e);
    const env = makeEnv(ctx);
    const e = firstEntity(ents);
    for (const beh of BEHAVIORS) {
      e.userData.beh = beh;
      // way outside the containment arena (|x|,|z| ≤ 65) with a large velocity — the exact state
      // that pre-fix drove `lorenz` to ±Infinity → NaN within ~60 frames.
      e.position.set(3000, 1500, 3000);
      e.userData.vel.set(50, -30, 40);
      for (let k = 0; k < 30; k++) applyBehavior(e, env);
      expect(isFinite3(e)).toBe(true); // behavior `${beh}` must not overflow from a far escapee
    }
  });

  test('applying a behavior is reproducible from one seed (deterministic dispatch)', () => {
    const run = (): number[] => {
      const ctx = makeCtx(0xd37e44);
      const ents = new EntityManager(ctx);
      ents.reset(50);
      for (const e of ents.list) if (e) ctx.grid.insert(e);
      const env = makeEnv(ctx);
      const e = firstEntity(ents);
      e.userData.beh = 'lorenz';
      for (let k = 0; k < 25; k++) applyBehavior(e, env);
      const v = e.userData.vel;
      return [e.position.x, e.position.y, e.position.z, v.x, v.y, v.z];
    };
    expect(run()).toEqual(run());
  });
});

function twoEntityFixture(seed: number): {
  ctx: SimContext;
  ents: EntityManager;
  actor: Entity;
  target: Entity;
  env: BehaviorEnv;
} {
  const ctx = makeCtx(seed);
  const ents = new EntityManager(ctx);
  ents.reset(2);
  const actor = ents.list[0];
  const target = ents.list[1];
  if (!actor || !target) throw new Error('two-entity fixture failed to spawn');
  actor.position.set(0, 0, 0);
  target.position.set(2, 0, 0);
  ctx.grid.clear();
  ctx.grid.insert(actor);
  ctx.grid.insert(target);
  return { ctx, ents, actor, target, env: makeEnv(ctx) };
}

describe('behaviors — Big Tree sanctuary boundary', () => {
  const crossBodyBehaviors: Array<'nash' | 'market' | 'typemorph' | 'setunion'> = [
    'nash',
    'market',
    'typemorph',
    'setunion',
  ];

  test.each(crossBodyBehaviors)(
    '%s cannot affect bodies when the actor is protected',
    (behavior) => {
      const { ctx, actor, target, env } = twoEntityFixture(0x5afe0001);
      Object.defineProperty(ctx, 'rng', { value: () => 0.5 });
      actor.userData.beh = behavior;
      actor.userData.vel.set(0, 0, 0);
      actor.userData.energy = 20;
      actor.userData.payoff = 0;
      actor.userData.strategy = 0;
      actor.userData.typeId = 0;
      actor.userData.setGroup = 0;
      target.userData.energy = 90;
      target.userData.strategy = 1;
      target.userData.typeId = 4;
      target.userData.setGroup = 3;
      env.sanctuaryAt = (x) => x === 0;

      applyBehavior(actor, env);

      expect(actor.userData.vel.toArray()).toEqual([0, 0, 0]);
      expect(actor.userData.energy).toBe(20);
      expect(actor.userData.payoff).toBe(0);
      expect(actor.userData.strategy).toBe(0);
      expect(target.userData.energy).toBe(90);
    },
  );

  test.each(crossBodyBehaviors)(
    '%s cannot affect a protected target across the boundary',
    (behavior) => {
      const { ctx, actor, target, env } = twoEntityFixture(0x5afe0002);
      Object.defineProperty(ctx, 'rng', { value: () => 0.5 });
      actor.userData.beh = behavior;
      actor.userData.vel.set(0, 0, 0);
      actor.userData.energy = 20;
      actor.userData.payoff = 3;
      actor.userData.strategy = 0;
      actor.userData.typeId = 0;
      actor.userData.setGroup = 0;
      target.userData.energy = 90;
      target.userData.strategy = 1;
      target.userData.typeId = 4;
      target.userData.setGroup = 3;
      env.sanctuaryAt = (x) => x === 2;

      applyBehavior(actor, env);

      expect(actor.userData.vel.toArray()).toEqual([0, 0, 0]);
      expect(actor.userData.energy).toBe(20);
      expect(actor.userData.payoff).toBe(3);
      expect(actor.userData.strategy).toBe(0);
      expect(target.userData.energy).toBe(90);
    },
  );

  test('friendly flocking remains active between protected organisms', () => {
    const { actor, env } = twoEntityFixture(0x5afe0003);
    actor.userData.beh = 'flock';
    actor.userData.vel.set(0, 0, 0);
    env.sanctuaryAt = () => true;

    applyBehavior(actor, env);

    expect(actor.userData.vel.x).toBeGreaterThan(0);
    expect(actor.userData.vel.y).toBe(0);
    expect(actor.userData.vel.z).toBe(0);
  });

  test('sanctuary removes chaos and wind force, preserves damping, and consumes the same RNG draws', () => {
    const run = (protectedHere: boolean): { velocity: number[]; nextDraw: number } => {
      const ctx = makeCtx(0x5afe0004);
      const ents = new EntityManager(ctx);
      ents.reset(1);
      const actor = firstEntity(ents);
      actor.position.set(0, 0, 0);
      actor.userData.beh = 'pulse';
      actor.userData.vel.set(0.1, 0.2, -0.3);
      ents.attachSanctuary(protectedHere ? () => true : () => false);

      ents.update(1 / 60, 1);

      return { velocity: actor.userData.vel.toArray(), nextDraw: ctx.rng() };
    };

    const calm = run(true);
    const exposed = run(false);
    expect(calm.velocity[0]).toBeCloseTo(0.1 * 0.985, 12);
    expect(calm.velocity[1]).toBeCloseTo(0.2 * 0.985, 12);
    expect(calm.velocity[2]).toBeCloseTo(-0.3 * 0.985, 12);
    expect(exposed.velocity).not.toEqual(calm.velocity);
    expect(calm.nextDraw).toBe(exposed.nextDraw);
  });
});
