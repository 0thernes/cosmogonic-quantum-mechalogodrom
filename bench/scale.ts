/**
 * Population scale profiler — `bun bench/scale.ts`. Proves the entity SIM pipeline (the per-frame
 * `EntityManager.update` + the spatial-hash rebuild, i.e. the CPU hot path the render sits on top of)
 * scales toward the directive's **50,000-entity** ceiling. Headless (the determinism-test fixture
 * pattern — no GL context needed for the data path), deterministic seed, and it just measures
 * wall-clock ms/frame at a ladder of population sizes. NOT part of `bun run bench` (it's heavy); run it
 * on demand and record the numbers in docs/BENCHMARKS-2026-06-26.md. Standalone-only (`import.meta.main`).
 */
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 1.2,
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

/** A headless SimContext sized for `maxEntities` (no DOM / no GL — pure data path). */
function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'ultra' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
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

/** Run `frames` of the world.ts per-frame entity pipeline at population `n`; return avg ms/frame. */
function profile(n: number, frames: number, warm: number): { ms: number; live: number } {
  const ctx = makeCtx(0xc0541c, n);
  const entities = new EntityManager(ctx);
  entities.reset(n);
  const state = ctx.state;
  const tick = (): void => {
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
  };
  for (let f = 0; f < warm; f++) tick(); // warm caches + let growth settle
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) tick();
  const ms = (performance.now() - t0) / frames;
  return { ms, live: entities.list.length };
}

if (import.meta.main) {
  const LADDER = [2000, 5000, 10000, 25000, 50000];
  console.log('\nPopulation scale profile — entity sim pipeline (update + grid), headless\n');
  console.log('     N  |  live  | ms/frame |  budget (60fps=16.7ms · 30fps=33.3ms)');
  console.log('  ------+--------+----------+--------------------------------------');
  for (const n of LADDER) {
    const { ms, live } = profile(n, 120, 40);
    const verdict = ms <= 16.7 ? '✅ 60fps' : ms <= 33.3 ? '🟨 30fps' : '🟥 < 30fps';
    console.log(
      `  ${String(n).padStart(5)} | ${String(live).padStart(6)} | ${ms.toFixed(2).padStart(8)} | ${verdict}`,
    );
  }
  console.log('');
}
