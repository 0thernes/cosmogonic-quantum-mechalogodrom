/**
 * Reaction-diffusion benchmark — runnable standalone
 * (`bun bench/reaction-diffusion.bench.ts`) or aggregated via `bun bench/index.ts`.
 *
 * Measures one Gray–Scott `step()` at the default 128×128 grid: the full
 * O(SIZE²) PDE integration (16 384 cells × two species, 9-point Laplacian)
 * plus the U → RGBA8 texture refresh. The contract budget is < 0.5 ms — at the
 * world cadence of every 2nd frame that is ≤ 1.5% of a 16.67 ms frame.
 *
 * Deterministic fixture: mulberry32(42) context, CLEAR weather, chaos 1, three
 * seeded perturbs so the field carries live structure (cell cost is branch-free
 * and data-independent, but the fixture stays representative on principle).
 */
import { bench, group, run } from 'mitata';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { ReactionDiffusionSystem } from '../src/sim/reaction-diffusion';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

/** Minimal DOM-free SimContext: the system only reads `state` and `rng`. */
function makeCtx(seed: number): SimContext {
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      isMobile: false,
      dprCap: 2,
      maxEntities: 10,
      quantumCount: 10,
      maxLinks: 10,
      shadows: false,
      starCount: 10,
    },
    rng: mulberry32(seed),
    grid: new SpatialHash<Entity>(),
    morphs: [],
    geos: [],
    state: {
      chaos: 1,
      mutations: 0,
      timeScale: 1,
      wireframe: false,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: 0,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

const rd = new ReactionDiffusionSystem(makeCtx(42), 128);
rd.perturb(0.3, 0.3);
rd.perturb(0.7, 0.5);
rd.perturb(0.5, 0.8);

group('reaction-diffusion: Gray-Scott 128×128', () => {
  bench('step() (PDE integration + texture refresh)', () => {
    rd.step();
  });
});

if (import.meta.main) {
  await run();
}
