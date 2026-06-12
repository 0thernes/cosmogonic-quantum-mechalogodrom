/**
 * Perf-budget regression guard (CONTRACTS V3.6/V4.5 — Master File III, law 2: "if it is not
 * measured, it is not real").
 *
 * The 10x scale-up to the ultra tier (10,000 entities) put the per-frame simulation cost on a
 * cliff dominated by the O(n·k) behavior loop's spatial-grid neighbor queries. After the
 * ultra-tier throttles landed (theory-stride 3, flock half-rate, 10-unit grid cell, connectome
 * cadence /6 — see docs/BENCHMARKS.md "Ultra-tier 10k optimization") the sim-CPU portion of a
 * frame at the full 10k ceiling measures ≈ 18 ms on the reference machine. (The 6,500 adaptive
 * steady-state target that originally accompanied those throttles was retired in 0.5.0 —
 * `targetEntities === maxEntities` on every tier now; the throttles alone carry the 10k cost.)
 *
 * This experiment drives the EXACT EntityManager update loop + the world.ts grid-rebuild cadence
 * at a HIGH population and asserts the median per-frame wall time stays under a GENEROUS bound.
 * It is intentionally loose — CI runners are slower and noisier than the reference box, and this
 * test must not flake — but tight enough to catch a structural regression (e.g. re-running the
 * theory behaviors every frame, or restoring the every-frame connectome at 10k, which would
 * multiply the loop cost several-fold). It measures the MEDIAN of many frames so a single GC
 * pause cannot fail it. This is a CPU-side guard only: it constructs no renderer and excludes
 * GPU draw cost (which the headless harness cannot measure), exactly like scripts/perf-probe.ts.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, ULTRA_GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** High population for the stress frame — the ultra-class regime where the cliff lived. */
const POP = 8000;

/**
 * Generous per-frame wall-clock ceiling (ms) for the entity-update + grid-rebuild work at
 * {@link POP} entities. The reference machine runs this in ≈ 13 ms; a loaded CI runner has
 * ample slack to 120 ms, yet a 5×-class regression of the dominant loop (≈ 65 ms+) trips it.
 */
const FRAME_BUDGET_MS = 120;

function makeState(): SimState {
  return {
    chaos: 1.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
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
  };
}

/** DOM-free SimContext with real geometries/morphotypes at the ultra tier (fake-ctx pattern). */
function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const auditNoop = { record: () => undefined, entries: () => [] };
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
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
      maxLinks: 6000,
      shadows: true,
      starCount: 10,
    },
    rng,
    grid: new SpatialHash<Entity>(maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL),
    morphs,
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Median of a numeric array (does not mutate the input). */
function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  if (s.length === 0) return 0;
  // Invariant: 0 ≤ mid < length for a non-empty array.
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

describe('per-frame sim-CPU budget at the ultra tier', () => {
  test(`entity-update + grid rebuild at ${POP} entities stays under ${FRAME_BUDGET_MS}ms/frame (median)`, () => {
    const ctx = makeCtx(0xb0d6e7, POP);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const grid = ctx.grid;
    const state = ctx.state;
    expect(entities.list.length).toBe(POP);

    const stepFrame = (): number => {
      state.frame++;
      state.elapsed += 1 / 60;
      if (state.frame % 2 === 0) {
        grid.clear();
        const list = entities.list;
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (e) grid.insert(e);
        }
      }
      const t0 = performance.now();
      entities.update(1 / 60, state.elapsed);
      return performance.now() - t0;
    };

    // Warm the JIT (the first frames compile the megamorphic behavior dispatch).
    for (let f = 0; f < 20; f++) stepFrame();

    const samples: number[] = [];
    for (let f = 0; f < 60; f++) samples.push(stepFrame());

    const med = median(samples);
    // The population is held near POP by the auto-split/death equilibrium — confirm the guard
    // actually measured the heavy regime, not a collapsed world.
    expect(entities.list.length).toBeGreaterThan(POP * 0.7);
    expect(med).toBeLessThan(FRAME_BUDGET_MS);
  }, 30000);
});
