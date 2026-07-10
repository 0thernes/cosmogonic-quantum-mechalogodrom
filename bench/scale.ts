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
import { Connectome } from '../src/sim/connectome';
import { SINGULARITY_FIELD, SingularitySystem } from '../src/sim/singularities';
import { getQuantizationConfig } from '../src/math/quantization';
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
      maxLinks: maxEntities * 12,
      quantization: getQuantizationConfig('ultra'),
      shadows: false,
      starCount: 10,
      simRate: 15,
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

/**
 * Profile JUST the singularity force pass with a hole active at population `n`. A WHITE hole is
 * used (non-consuming) so the population stays at `n` and we measure the steady O(k) reach-query +
 * exact r⁻² cost — NOT one-off consumption. Proves the cost is ~FLAT as `n` climbs (the retired
 * O(n) sweep grew with `n`): k = entities within REACH is held roughly constant by the areal-density
 * scaling, so the singularity's marginal cost no longer scales with the population. Returns the
 * median ms/frame for `singularities.update` and the measured in-REACH count `k`.
 */
function profileHole(
  n: number,
  frames: number,
  warm: number,
): { ms: number; live: number; k: number } {
  const ctx = makeCtx(0x5106e7, n);
  const entities = new EntityManager(ctx);
  entities.reset(n);
  const sys = new SingularitySystem(ctx, entities);
  const state = ctx.state;
  const center = new THREE.Vector3(0, 16 * 2.5, 0); // mid-field, inside the populated core
  sys.summon('whitehole', center);
  const rebuild = (): void => {
    if (state.frame % 2 === 0) {
      ctx.grid.clear();
      const list = entities.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e) ctx.grid.insert(e);
      }
    }
  };
  const samples: number[] = [];
  const tick = (measure: boolean): void => {
    state.frame++;
    state.elapsed += 1 / 60;
    rebuild();
    if (!sys.active) sys.summon('whitehole', center); // keep one alive across the whole run
    const t0 = measure ? performance.now() : 0;
    sys.update(1 / 60, state.elapsed);
    if (measure) samples.push(performance.now() - t0);
  };
  for (let f = 0; f < warm; f++) tick(false);
  for (let f = 0; f < frames; f++) tick(true);
  samples.sort((a, b) => a - b);
  const k = ctx.grid.query(center.x, center.z, SINGULARITY_FIELD.REACH).length;
  return { ms: samples[samples.length >> 1] ?? 0, live: entities.list.length, k };
}

/**
 * Structural 10k connectome receipt. The visible sample measures CPU topology + animated geometry writes;
 * the hidden sample rebuilds the same topology without mutating activation and must write zero geometry
 * floats. Both samples use the read-only measurement mode. Headless: `needsUpdate` is set, but there is no
 * WebGL driver/upload timing claim.
 */
function profileConnectome(n: number): {
  visibleMs: number;
  hiddenMs: number;
  links: number;
  pairs: number;
  maxLinks: number;
  visibleFloats: number;
  hiddenFloats: number;
} {
  const ctx = makeCtx(0xc011ec7, n);
  const entities = new EntityManager(ctx);
  entities.reset(n);
  for (const entity of entities.list) if (entity) ctx.grid.insert(entity);
  const connectome = new Connectome(ctx, entities);

  const sample = (visible: boolean): { ms: number; floats: number } => {
    connectome.setWebVisible(visible);
    for (let f = 0; f < 3; f++) connectome.update(1 / 60, f / 60, false);
    const samples: number[] = [];
    for (let f = 0; f < 12; f++) {
      const t0 = performance.now();
      connectome.update(1 / 60, (f + 3) / 60, false);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    return { ms: samples[samples.length >> 1] ?? 0, floats: connectome.geometryFloatsWritten };
  };

  const visible = sample(true);
  const hidden = sample(false);
  const result = {
    visibleMs: visible.ms,
    hiddenMs: hidden.ms,
    links: connectome.links,
    pairs: connectome.pairCount,
    maxLinks: ctx.quality.maxLinks,
    visibleFloats: visible.floats,
    hiddenFloats: hidden.floats,
  };
  connectome.dispose();
  return result;
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

  const conn = profileConnectome(10000);
  console.log(
    '\nConnectome @ 10,000 entities — 120,000-link production cap (CPU median; headless)\n',
  );
  console.log('          | links/max | pairs | geometry floats | ms/rebuild');
  console.log('  --------+-----------+-------+-----------------+-----------');
  console.log(
    `  visible | ${String(conn.links).padStart(6)}/${String(conn.maxLinks).padEnd(6)} | ${String(conn.pairs).padStart(5)} | ${String(conn.visibleFloats).padStart(15)} | ${conn.visibleMs.toFixed(2).padStart(9)}`,
  );
  console.log(
    `  hidden  | ${String(conn.links).padStart(6)}/${String(conn.maxLinks).padEnd(6)} | ${String(conn.pairs).padStart(5)} | ${String(conn.hiddenFloats).padStart(15)} | ${conn.hiddenMs.toFixed(2).padStart(9)}`,
  );
  console.log(
    '  Hidden still rebuilds pairs/topology; zero geometry floats means no CPU buffer writes/upload flag.',
  );

  console.log('\nSingularity force pass — O(k) reach query, white hole active (median ms/frame)\n');
  console.log('     N  |  live  |    k   | sing ms | note (cost ~flat ⇒ O(k), not O(n))');
  console.log('  ------+--------+--------+---------+-----------------------------------');
  for (const n of LADDER) {
    const { ms, live, k } = profileHole(n, 120, 40);
    console.log(
      `  ${String(n).padStart(5)} | ${String(live).padStart(6)} | ${String(k).padStart(6)} | ${ms.toFixed(3).padStart(7)} | k = entities within REACH`,
    );
  }
  console.log('');
}
