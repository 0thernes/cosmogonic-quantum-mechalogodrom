/**
 * Social-field benchmark (ADR 0019): main-thread EntityManager.update cost at 5k / 10k / 25k
 * organisms, on one core vs with the social field answered by real worker threads.
 *
 * Bun runs Web Workers, so this drives the same SocialScanPool and worker script the browser uses.
 * Between updates it sleeps `GAP` ms (default 12) as a stand-in for the render time in which the
 * browser's worker replies arrive. It reports medians over steady-state frames and how many frames
 * the worker cores answered. CPU only: no renderer, no GPU cost.
 *
 *   bun run bench:social-field            # GAP=12 POPS=5000,10000,25000 FRAMES=90
 */
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, ULTRA_GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import { getQuantizationConfig } from '../src/math/quantization';
import {
  SocialScanPool,
  socialWorkerCount,
  type SocialWorkerLike,
} from '../src/core/social-scan-pool';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

const GAP = Number(process.env.GAP ?? 12);
const FRAMES = Number(process.env.FRAMES ?? 90);
const WARM = Math.min(30, Math.floor(FRAMES / 3));
const POPS = (process.env.POPS ?? '5000,10000,25000').split(',').map(Number);
const WORKER = new URL('../src/workers/social-field-worker.ts', import.meta.url).href;

function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'ultra',
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 10,
      maxLinks: maxEntities * 12,
      shadows: true,
      starCount: 10,
      quantization: getQuantizationConfig('ultra'),
      simRate: 15,
    },
    rng,
    grid: new SpatialHash<Entity>(maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL),
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
      wind: { x: 1, z: 1 },
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

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[s.length >> 1]!;
};

async function run(pop: number, workers: number) {
  const ctx = makeCtx(0xb0d6e7, pop);
  const em = new EntityManager(ctx);
  const pool =
    workers > 0
      ? new SocialScanPool(workers, () => new Worker(WORKER) as unknown as SocialWorkerLike)
      : null;
  em.attachSocialScanner(pool);
  em.reset(pop);
  const ms: number[] = [];
  for (let f = 0; f < FRAMES; f++) {
    ctx.state.frame++;
    ctx.state.elapsed += 1 / 60;
    if (ctx.state.frame % 2 === 0) {
      ctx.grid.clear();
      for (const e of em.list) ctx.grid.insert(e);
    }
    const t0 = performance.now();
    em.update(1 / 60, ctx.state.elapsed);
    if (f >= WARM) ms.push(performance.now() - t0);
    await Bun.sleep(GAP);
  }
  const s = em.socialFieldStats();
  pool?.dispose();
  return { ms: median(ms), offloaded: s.offloaded, frames: s.offloaded + s.local };
}

const cores = navigator.hardwareConcurrency;
const w = socialWorkerCount(cores);
console.log(`cores ${cores} · social worker cores ${w} · render gap ${GAP} ms · ${FRAMES} frames`);
for (const pop of POPS) {
  const one = await run(pop, 0);
  const many = w > 0 ? await run(pop, w) : null;
  const tail = many
    ? ` -> ${many.ms.toFixed(1)} ms with ${w} worker cores (answered ${many.offloaded}/${many.frames} frames)`
    : '';
  console.log(`pop ${pop}: main-thread update ${one.ms.toFixed(1)} ms on 1 core${tail}`);
}
