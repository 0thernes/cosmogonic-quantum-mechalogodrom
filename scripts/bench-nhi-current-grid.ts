#!/usr/bin/env bun
/**
 * Non-gating wall-clock companion to the operation-count receipt in tests/spawn-budget.test.ts.
 * It measures the production EntityManager current-grid method at the declared N/M matrix. Timing
 * never controls the exit code: shared runners, JIT state, and CPU power policy make a 50k wall-clock
 * assertion intrinsically flaky. The 60 Hz frame interval is reported only as a reference threshold.
 */
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { ULTRA_GRID_CELL } from '../src/sim/constants';
import { EntityManager } from '../src/sim/entities';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const POPULATIONS = [1_000, 10_000, 50_000] as const;
const NHI_COUNTS = [0, 1, 8, 32] as const;
const WARMUP_RUNS = 5;
const SAMPLES = 21;
/** Reference only; exceeding it is printed and never fails the process. */
const NON_GATING_REFERENCE_MS = 1000 / 60;

function state(): SimState {
  return {
    chaos: 0,
    entropy: 0,
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

function context(): SimContext {
  const rng = mulberry32(0x4e48_4947);
  const geos = createGeometryCache();
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'mega',
      isMobile: false,
      instanced: true,
      dprCap: 1,
      maxEntities: 50_000,
      targetEntities: 50_000,
      quantumCount: 0,
      maxLinks: 0,
      shadows: false,
      starCount: 0,
      quantization: getQuantizationConfig('desktop'),
    },
    rng,
    grid: new SpatialHash<Entity>(ULTRA_GRID_CELL),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: state(),
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

function percentile(samples: readonly number[], fraction: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

const ctx = context();
const entities = new EntityManager(ctx);
const fixtures: Entity[] = [];
for (let i = 0; i < POPULATIONS.at(-1)!; i++) {
  fixtures.push({ position: new THREE.Vector3(i % 512, 0, (i / 512) | 0) } as Entity);
}

const rows: Array<{
  N: number;
  M: number;
  inserted: number;
  medianMs: number;
  p95Ms: number;
  reference: 'bypass' | 'within' | 'above';
}> = [];

for (const population of POPULATIONS) {
  entities.list.length = 0;
  for (let i = 0; i < population; i++) entities.list.push(fixtures[i]!);
  for (const minds of NHI_COUNTS) {
    for (let i = 0; i < WARMUP_RUNS; i++) entities.rebuildCurrentGridForNhi(minds);
    const samples: number[] = [];
    let inserted = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const started = performance.now();
      inserted = entities.rebuildCurrentGridForNhi(minds);
      samples.push(performance.now() - started);
    }
    const medianMs = percentile(samples, 0.5);
    rows.push({
      N: population,
      M: minds,
      inserted,
      medianMs: Number(medianMs.toFixed(3)),
      p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
      reference: minds === 0 ? 'bypass' : medianMs <= NON_GATING_REFERENCE_MS ? 'within' : 'above',
    });
  }
}

console.table(rows);
console.log(
  `Reference only: ${NON_GATING_REFERENCE_MS.toFixed(3)} ms (one 60 Hz frame); timing is non-gating and exit status is unchanged.`,
);
