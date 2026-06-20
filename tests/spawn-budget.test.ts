/**
 * F-SPAWN-BUDGET — the apocalypse "brain-fart" fix.
 *
 * Apocalypse maxes `chaos`, which drains every organism's split timer ~3× (cMul saturates at 3),
 * so the WHOLE population turns split-ready in the same frame and auto-split detonates — hundreds
 * of allocations per frame compounding toward the 50,000 ceiling, which freezes a single-thread JS
 * main loop (the GC/allocation cliff). The {@link SPAWN_BUDGET_ULTRA} per-frame cap amortizes that
 * surge across frames so the world still ramps to the ceiling, just over seconds instead of one
 * locked frame. The cap is GATED to the ultra tier (>5,000), so every determinism golden — which
 * runs at <=5,000 — is byte-identical (the budget is never consulted there).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager, SPAWN_BUDGET_ULTRA } from '../src/sim/entities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 2,
    entropy: 0,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0.2, z: -0.1 },
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
      tier: maxEntities > 5000 ? 'mega' : 'desktop',
      isMobile: false,
      instanced: false, // data-only headless path (the budget is independent of the render path)
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 50,
      maxLinks: 500,
      shadows: false,
      starCount: 50,
    },
    rng,
    grid: new SpatialHash<Entity>(16),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/**
 * Simulate the apocalypse trigger condition: a fully split-ready population at max chaos, then run
 * ONE frame. Returns how many new organisms were born that frame.
 */
function surge(seed: number, maxEntities: number, seedCount: number): number {
  const ctx = makeCtx(seed, maxEntities);
  const ent = new EntityManager(ctx);
  ent.reset(seedCount);
  for (const e of ent.list) e.userData.sT = -1; // every organism split-ready (apocalypse condition)
  ctx.state.chaos = 10; // max chaos (drains the timers; cMul saturates)
  ctx.grid.clear();
  for (const e of ent.list) ctx.grid.insert(e);
  const before = ent.list.length;
  ctx.state.frame = 1;
  ent.update(0.016, 0.016);
  return ent.list.length - before;
}

describe('F-SPAWN-BUDGET — amortized mass-spawn (apocalypse brain-fart fix)', () => {
  test('a synchronized split surge is capped at SPAWN_BUDGET_ULTRA per frame at the ultra tier', () => {
    const spawned = surge(7, 50000, 3000);
    expect(spawned).toBeGreaterThan(0); // it still grows — not an accidental no-op
    expect(spawned).toBeLessThanOrEqual(SPAWN_BUDGET_ULTRA); // but never detonates
    // 3,000 ready organisms × ~6% split roll (~180) far exceeds the cap, so the budget binds exactly.
    expect(spawned).toBe(SPAWN_BUDGET_ULTRA);
  });

  test('the cap is deterministic — same seed yields the same surge', () => {
    expect(surge(7, 50000, 3000)).toBe(surge(7, 50000, 3000));
  });

  test('below the ultra tier the budget is never consulted (goldens stay byte-identical)', () => {
    // At a 5,000-cap tier (ultra is strictly > 5,000) the SAME surge is NOT clamped to 64 — proving
    // the budget is ultra-only, so the determinism goldens (which run <= 5,000) are unaffected.
    expect(surge(7, 5000, 3000)).toBeGreaterThan(SPAWN_BUDGET_ULTRA);
  });
});
