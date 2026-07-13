/**
 * SELF-HEALING COHESION — the central living zone re-gathers a scattered swarm.
 *
 * The 2× habitat expansion + the old scatter events (Burst / Apocalypse / Chaos flinging bodies with a
 * ±3 velocity) left the swarm sprayed to the rim where the hard containment box pinned it with NO way
 * home: too sparse to make social contact, so the ant/bee chains and clusters the owner loved died into
 * lonely scatter. `entities-dynamism.test.ts` guards the OPPOSITE failure (a regression that re-collapses
 * the swarm to a point) but nothing guarded THIS one — a scatter that never recovers stays deterministic
 * and passes every golden yet ruins the world. The living zone (constants.ts `LIVING_ZONE`) fixes it:
 * OUTSIDE the zone a gentle centre-gravity draws escapees home; INSIDE it the swarm is force-free so kin
 * springs alone shape the clusters. These tests pin both halves — the pull heals scatter, and it leaves
 * an in-zone population untouched.
 *
 * Not a consciousness claim — only measured spatial cohesion of a deterministic simulation.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, LIVING_ZONE, PLATFORM_FLOOR, PLATFORM_HALF } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

const POP = 500;

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'desktop' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities: POP,
      targetEntities: POP,
      quantumCount: 5,
      maxLinks: 100,
      shadows: false,
      starCount: 5,
      quantization: getQuantizationConfig('phone'),
      simRate: 15,
    },
    rng,
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs,
    geos,
    state: {
      chaos: 1.5,
      mutations: 0,
      timeScale: 1,
      renderMode: 'solid',
      sim: 1,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0.2, z: -0.1 },
      viewIdx: 1,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      algoMode: 'single',
      algoTimer: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Fling every organism out to the rim band (r ∈ [0.75, 0.95]·PLATFORM_HALF), the post-scatter state. */
function scatterToRim(em: EntityManager, seed: number): void {
  const r = mulberry32(seed);
  for (const e of em.list) {
    if (!e) continue;
    const ang = r() * Math.PI * 2;
    const rad = (0.75 + r() * 0.2) * PLATFORM_HALF;
    e.position.set(Math.cos(ang) * rad, PLATFORM_FLOOR + r() * 200, Math.sin(ang) * rad);
    (e.userData.vel as THREE.Vector3).set(0, 0, 0);
  }
}

function meanRadius(em: EntityManager): number {
  let sum = 0;
  let n = 0;
  for (const e of em.list) {
    if (!e || e.userData.alive === false) continue;
    if (!Number.isFinite(e.position.x + e.position.z)) continue;
    sum += Math.hypot(e.position.x, e.position.z);
    n++;
  }
  return n > 0 ? sum / n : Infinity;
}

/** Drive an already-populated manager `frames` ticks, rebuilding the grid each frame like the world. */
function run(em: EntityManager, ctx: SimContext, frames: number): void {
  const dt = 1 / 60;
  for (let f = 1; f <= frames; f++) {
    ctx.state.frame = f;
    ctx.grid.clear();
    for (const e of em.list) ctx.grid.insert(e);
    em.update(dt, f * dt);
  }
}

describe('Entity self-healing cohesion (central living zone)', () => {
  test('a rim-scattered swarm re-gathers to the living core (scatter is not permanent)', () => {
    const ctx = makeCtx(0x5ca77e);
    const em = new EntityManager(ctx);
    em.reset(POP);
    scatterToRim(em, 0x5ca77e);
    const before = meanRadius(em);
    // Sanity: the scatter really did throw the swarm out to the rim band.
    expect(before).toBeGreaterThan(PLATFORM_HALF * 0.7);

    run(em, ctx, 800);
    const after = meanRadius(em);
    // The centre-gravity pulled the swarm most of the way home — a decisive, visible gathering…
    expect(after).toBeLessThan(before * 0.65);
    // …settling near/inside the living zone (not stranded at the rim, not collapsed to a point).
    expect(after).toBeLessThan(LIVING_ZONE * 1.2);
    expect(after).toBeGreaterThan(PLATFORM_HALF * 0.02);
  });

  test('an in-zone population is left untouched — the pull only fires on escapees', () => {
    // Founders spawn in the inner ring (well inside LIVING_ZONE), so the centre-gravity never fires and
    // the swarm must still stay SPREAD, exactly as the dynamism envelope requires (no over-collapse).
    const ctx = makeCtx(0xc0c0a);
    const em = new EntityManager(ctx);
    em.reset(POP);
    run(em, ctx, 400);
    let near = 0;
    let n = 0;
    for (const e of em.list) {
      if (!e || !Number.isFinite(e.position.x + e.position.z)) continue;
      n++;
      if (Math.hypot(e.position.x, e.position.z) < 60) near++;
    }
    // Lives inside the zone (never needed pulling) yet stays spread — not piled at the centre.
    expect(meanRadius(em)).toBeLessThan(LIVING_ZONE);
    expect(near / Math.max(1, n)).toBeLessThan(0.6);
  });

  test('the gathering is deterministic — same seed reproduces the same mean radius', () => {
    const drive = (): number => {
      const ctx = makeCtx(0xdec1de);
      const em = new EntityManager(ctx);
      em.reset(POP);
      scatterToRim(em, 0xdec1de);
      run(em, ctx, 300);
      return Math.round(meanRadius(em) * 1000);
    };
    expect(drive()).toBe(drive());
  });
});
