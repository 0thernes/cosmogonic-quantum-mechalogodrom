/**
 * Determinism UNDER USE (Wave 1-2). The golden integrated test proves the world is byte-identical
 * at the feature DEFAULTS (renderMode 'solid', entropy 0); these tests prove the new couplings are
 * ALSO deterministic when actively ENGAGED, and — just as important — that they are not accidental
 * no-ops (an engaged lever must visibly diverge from the baseline). Driven through the real
 * `EntityManager.update` loop with the per-frame grid rebuild, so the conditional theory/market rng
 * draws are exercised exactly as in the world.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { RenderMode } from '../src/sim/constants';
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

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop',
      isMobile: false,
      instanced: false,
      dprCap: 1.5,
      maxEntities: 2000,
      targetEntities: 2000,
      quantumCount: 50,
      maxLinks: 500,
      shadows: false,
      starCount: 50,
      quantization: getQuantizationConfig('phone'),
      simRate: 15,
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

/** Run the entity loop for `frames` from `seed` with a given render mode + entropy; return a position trace. */
function run(seed: number, renderMode: RenderMode, entropy: number, frames = 120): number[] {
  const ctx = makeCtx(seed);
  ctx.state.renderMode = renderMode;
  ctx.state.entropy = entropy;
  const ent = new EntityManager(ctx);
  ent.reset(200);
  for (let f = 0; f < frames; f++) {
    ctx.state.frame = f;
    if (f % 2 === 0) {
      ctx.grid.clear();
      for (const e of ent.list) ctx.grid.insert(e);
    }
    ent.update(0.016, f * 0.016);
  }
  const out: number[] = [];
  for (const e of ent.list) out.push(e.position.x, e.position.y, e.position.z);
  return out;
}

describe('determinism under use (Wave 1-2 couplings)', () => {
  test('F-RENDER-DYN: engaging neon is reproducible from one seed', () => {
    expect(run(7, 'neon', 0)).toEqual(run(7, 'neon', 0));
  });

  test('F-CHAOS-ENTROPY: engaging entropy damping is reproducible from one seed', () => {
    expect(run(7, 'solid', 6)).toEqual(run(7, 'solid', 6));
  });

  test('the couplings actually DO something — engaged levers diverge from the solid/0 baseline', () => {
    const baseline = run(7, 'solid', 0);
    expect(run(7, 'neon', 0)).not.toEqual(baseline); // render-mode dynamics move the field
    expect(run(7, 'solid', 8)).not.toEqual(baseline); // entropy damps the field
  });

  test('a different seed yields a different trace (the seed actually drives it)', () => {
    expect(run(1, 'solid', 0)).not.toEqual(run(2, 'solid', 0));
  });
});
