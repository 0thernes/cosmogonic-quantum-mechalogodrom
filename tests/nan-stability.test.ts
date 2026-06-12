/**
 * NaN-stability regression — pins the seal on the 'lorenz' divergence (src/sim/behaviors.ts).
 *
 * Live failure (0.2.0): repeated APOCALYPSE actions pin chaos at 10 (cm = 3); the lorenz
 * behavior's explicit-Euler attractor accelerations, sampled at unbounded world position, gain
 * faster than the 0.98 damping; once an escapee passes |z| ≈ 280 the quadratic terms
 * (`lx·lz`, `lx·ly`) grow superexponentially, position overflows to ±Infinity, and the first
 * NaN appears as `∞ − ∞` in the attractor cross terms / `∞ · (1 / ∞)` in the containment
 * normalize. The NaN then spreads population-wide because the spatial hash buckets NaN
 * positions into the world-origin cell (`NaN | 0 === 0`): telemetry ENERGY = Σ|vel| → NaN,
 * NaN positions render nothing, the connectome collapses.
 *
 * These experiments drive the EXACT EntityManager/behavior code under the hostile scenario
 * (a few hundred frames so the suite stays fast — the full 20k-frame proof ran in the
 * investigation) and fail within ~60 frames if the lorenz sample clamp is ever removed.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { CHAOS_MAX } from '../src/sim/constants';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** Max legal frame delta: the 0.05 s rawDt clamp at timeScale 3 (world.ts step contract). */
const DT_MAX = 0.15;

/** Fresh mutable sim state pinned to the apocalypse regime (chaos = CHAOS_MAX). */
function makeState(): SimState {
  return {
    chaos: CHAOS_MAX,
    mutations: 0,
    timeScale: 3,
    wireframe: false,
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

/** Minimal DOM-free SimContext with real geometries/morphotypes (fake-ctx pattern). */
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

/** First non-finite field across the population as `"frame=… i=… field=value"`, or null. */
function firstNonFinite(entities: EntityManager, frame: number): string | null {
  const list = entities.list;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e) continue;
    const u = e.userData;
    const f: Record<string, number> = {
      px: e.position.x,
      py: e.position.y,
      pz: e.position.z,
      vx: u.vel.x,
      vy: u.vel.y,
      vz: u.vel.z,
      energy: u.energy,
      sortVal: u.sortVal,
      sx: e.scale.x,
    };
    for (const k of Object.keys(f)) {
      if (!Number.isFinite(f[k] ?? NaN)) return `frame=${frame} i=${i} beh=${u.beh} ${k}=${f[k]}`;
    }
  }
  return null;
}

/** APOCALYPSE-equivalent kick (world.ts apocalypse): scatter velocities, belly = 120. */
function apocalypseKick(entities: EntityManager, rng: () => number): void {
  for (const e of entities.list) {
    if (!e) continue;
    e.userData.vel.set((rng() - 0.5) * 3, (rng() - 0.5) * 3, (rng() - 0.5) * 3);
    e.userData.belly = 120;
  }
}

/** Rebuild the grid every 2nd frame and step the population once — world.ts cadence. */
function stepWorldSlice(ctx: SimContext, entities: EntityManager, dt: number): void {
  const s = ctx.state;
  s.frame++;
  s.elapsed += dt;
  if (s.frame % 2 === 0) {
    ctx.grid.clear();
    for (const e of entities.list) {
      if (e) ctx.grid.insert(e);
    }
  }
  entities.update(dt, s.elapsed);
}

describe('lorenz divergence seal (apocalypse regime)', () => {
  test('all-lorenz population survives 400 max-dt frames of apocalypse spam', () => {
    const ctx = makeCtx(0xc0ffee, 160);
    const entities = new EntityManager(ctx);
    entities.reset(120);
    for (const e of entities.list) {
      if (e) e.userData.beh = 'lorenz';
    }
    const kickRng = mulberry32(2026);
    for (let frame = 1; frame <= 400; frame++) {
      // A user spamming the APOCALYPSE button (chaos stays pinned at CHAOS_MAX).
      if (frame % 100 === 1) apocalypseKick(entities, kickRng);
      stepWorldSlice(ctx, entities, DT_MAX);
      // Auto-split children inherit random morphs — keep the trigger population pure.
      for (const e of entities.list) {
        if (e) e.userData.beh = 'lorenz';
      }
      if (frame % 10 === 0) expect(firstNonFinite(entities, frame)).toBeNull();
    }
    expect(firstNonFinite(entities, 400)).toBeNull();
  });

  test('a lorenz escapee far outside the arena is steered finite, never to Infinity', () => {
    const ctx = makeCtx(7, 10);
    const entities = new EntityManager(ctx);
    // A state the unclamped dynamics reach on the way to overflow (pre-fix: NaN in < 60 frames).
    const e = entities.spawn(new THREE.Vector3(3000, 1500, 3000), 0, 1);
    expect(e).not.toBeNull();
    if (!e) return;
    e.userData.beh = 'lorenz';
    e.userData.life = Number.MAX_SAFE_INTEGER; // hold the escapee alive for the whole window
    for (let frame = 1; frame <= 250; frame++) {
      stepWorldSlice(ctx, entities, DT_MAX);
      expect(firstNonFinite(entities, frame)).toBeNull();
    }
  });

  test('mixed-behavior population at chaos 10 stays finite for 600 frames (NaN canary)', () => {
    const ctx = makeCtx(42, 300);
    const entities = new EntityManager(ctx);
    entities.reset(200);
    const kickRng = mulberry32(1337);
    for (let frame = 1; frame <= 600; frame++) {
      if (frame % 150 === 1) apocalypseKick(entities, kickRng);
      stepWorldSlice(ctx, entities, 0.05); // timeScale-1 worst legal delta
      if (frame % 20 === 0) expect(firstNonFinite(entities, frame)).toBeNull();
    }
    expect(firstNonFinite(entities, 600)).toBeNull();
  });
});
