/**
 * Owner directive #7 — singularities render at FULL fidelity on EVERY device tier (NO LOD
 * degradation). This pins the falsifiable claim behind that fix: a singularity summoned on the
 * lowest ('phone') tier builds the IDENTICAL geometry — same accretion-disk particle count and the
 * same total vertex count across the whole rig — as one summoned on the highest ('mega') tier.
 *
 * If anyone re-introduces tier-graded `particleBudget`/`sphereSegs`/`torusSegs`/`icoDetail` in
 * src/sim/singularities.ts, the phone/mega totals diverge and this test goes red.
 *
 * Headless: three's Scene/Mesh/Material need no DOM (the fake-ctx pattern, mirroring
 * tests/singularities.test.ts). The summon path touches only `ctx` (rng/quality/scene), never the
 * EntityManager, so a minimal `{ list: [] }` stub is sufficient.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { SINGULARITY_KINDS, SingularitySystem } from '../src/sim/singularities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { EntityManager } from '../src/sim/entities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, QualityTier, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 0.5,
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

/** A SimContext pinned to a specific quality tier — the ONLY thing that varies between the two runs. */
function makeCtx(tier: QualityTier): SimContext {
  const rng = mulberry32(0xc0ffee);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier,
      isMobile: tier === 'phone',
      instanced: false,
      dprCap: 1.25,
      maxEntities: 2000,
      quantization: getQuantizationConfig('desktop'),
      targetEntities: 2000,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
    },
    rng,
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Summon `kind` at `tier` and measure the built rig: disk particle count + total rig vertices. */
function summonMeasure(
  kind: (typeof SINGULARITY_KINDS)[number],
  tier: QualityTier,
): { particles: number; totalVerts: number } {
  const ctx = makeCtx(tier);
  const entities = { list: [] } as unknown as EntityManager;
  const sys = new SingularitySystem(ctx, entities);
  sys.summon(kind, new THREE.Vector3(0, 32, 0));
  let particles = 0;
  let totalVerts = 0;
  ctx.scene.traverse((o) => {
    const geo = (o as THREE.Mesh | THREE.Points).geometry as THREE.BufferGeometry | undefined;
    const pos = geo?.getAttribute?.('position');
    if (!pos) return;
    totalVerts += pos.count;
    if ((o as THREE.Points).isPoints) particles = pos.count;
  });
  sys.dispose();
  return { particles, totalVerts };
}

describe('singularity fidelity is tier-independent (owner directive #7)', () => {
  test('the accretion-disk particle count is the top-tier budget (7600) on phone AND mega', () => {
    for (const kind of SINGULARITY_KINDS) {
      const phone = summonMeasure(kind, 'phone');
      const mega = summonMeasure(kind, 'mega');
      expect(phone.particles).toBe(7600);
      expect(mega.particles).toBe(7600);
    }
  });

  test('the whole rig builds identical geometry on every tier (no LOD degradation)', () => {
    const tiers: QualityTier[] = ['phone', 'laptop', 'desktop', 'ultra', 'mega'];
    for (const kind of SINGULARITY_KINDS) {
      const baseline = summonMeasure(kind, 'phone').totalVerts;
      expect(baseline).toBeGreaterThan(0);
      for (const tier of tiers) {
        expect(summonMeasure(kind, tier).totalVerts).toBe(baseline);
      }
    }
  });
});
