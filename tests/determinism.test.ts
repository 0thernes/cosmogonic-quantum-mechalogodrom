/**
 * Same-seed GOLDEN determinism (the repo's #1 law, pinned at the population layer).
 *
 * Both audit swarms flagged this gap: every subsystem had local determinism tests, but
 * nothing pinned the integrated entity sim — the layer where a stray rng draw, an
 * iteration-order change, or a conditional draw actually breaks "one seed, one cosmos".
 *
 * The experiment drives TWO completely independent worlds (EntityManager + the world.ts
 * grid-rebuild cadence) from the same seed for 300 frames — through births, deaths,
 * auto-splits, behavior dispatch (incl. the theory stagger + outlier beh2 blend) — and
 * asserts BIT-IDENTICAL population count, positions, velocities, and rng cursor. A third
 * world from a different seed must diverge. Headless (fake-ctx pattern).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 1.2, // above the floor so the chaos-jitter rng draws are exercised
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

/** Run `frames` of the world.ts entity pipeline; return a flat numeric trace. */
function run(seed: number, frames: number): number[] {
  const ctx = makeCtx(seed, 400);
  const entities = new EntityManager(ctx);
  entities.reset(150);
  const state = ctx.state;
  for (let f = 0; f < frames; f++) {
    state.frame++;
    state.elapsed += 1 / 60;
    if (state.frame % 2 === 0) {
      ctx.grid.clear();
      const list = entities.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e) ctx.grid.insert(e);
      }
    }
    entities.update(1 / 60, state.elapsed);
  }
  // Flat trace: population, the post-run rng cursor, then every body's full kinematic state.
  const out: number[] = [entities.list.length, ctx.rng()];
  for (const e of entities.list) {
    if (!e) continue;
    out.push(
      e.position.x,
      e.position.y,
      e.position.z,
      e.userData.vel.x,
      e.userData.vel.y,
      e.userData.vel.z,
      e.userData.age,
      e.userData.sortVal,
    );
  }
  return out;
}

describe('same-seed golden determinism (integrated population sim)', () => {
  test(
    'two worlds from one seed are BIT-IDENTICAL after 300 frames',
    () => {
      const a = run(0xc0541c, 300);
      const b = run(0xc0541c, 300);
      expect(b.length).toBe(a.length);
      // toEqual on the arrays gives exact (bit) comparison for finite doubles.
      expect(b).toEqual(a);
    },
    // Heavy multi-seed replay; coverage suite load can push past 10s.
    { timeout: 30_000 },
  ); // allow for heavy integrated sim in full suite (was timing out at default 5s under load)

  test('a different seed diverges (the trace is sensitive, not vacuous)', () => {
    const a = run(1, 120);
    const c = run(2, 120);
    expect(c).not.toEqual(a);
  });
});
