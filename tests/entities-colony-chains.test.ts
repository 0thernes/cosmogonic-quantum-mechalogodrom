/**
 * Colony / chain ecology seals (ADR 0016 deep).
 *
 * The living ALife read depends on organisms forming long nearest-neighbor filaments and
 * tribal (same-setGroup) clusters — the ant/bee-like chains the owner saw before habitat
 * expansion thinned contact. These tests pin that geometry: after a long deterministic run,
 * kin pair distances sit in a chain band (not isolation fog, not a single centroid pile).
 *
 * Not a consciousness claim — only measured spatial/social structure.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, PLATFORM_HALF, SOCIAL_FLOCK_R } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

const POP = 400;

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
      maxLinks: 2000,
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

function drive(seed: number, frames: number): EntityManager {
  const ctx = makeCtx(seed);
  const em = new EntityManager(ctx);
  em.reset(POP);
  const dt = 1 / 60;
  for (let f = 1; f <= frames; f++) {
    ctx.state.frame = f;
    ctx.grid.clear();
    for (const e of em.list) ctx.grid.insert(e);
    em.update(dt, f * dt);
  }
  return em;
}

/** Mean nearest-neighbor distance among live entities with the same setGroup. */
function meanKinNearestNeighbor(list: readonly Entity[]): {
  mean: number;
  samples: number;
  kinContactFrac: number;
} {
  let sum = 0;
  let samples = 0;
  let withKin = 0;
  const live = list.filter((e) => e && e.userData.alive !== false);
  for (let i = 0; i < live.length; i++) {
    const a = live[i]!;
    let minD = Infinity;
    let kinHits = 0;
    for (let j = 0; j < live.length; j++) {
      if (i === j) continue;
      const b = live[j]!;
      if (b.userData.setGroup !== a.userData.setGroup) continue;
      kinHits++;
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dz = a.position.z - b.position.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < minD) minD = d;
    }
    if (kinHits > 0 && Number.isFinite(minD)) {
      sum += minD;
      samples++;
      if (minD < SOCIAL_FLOCK_R) withKin++;
    }
  }
  return {
    mean: samples > 0 ? sum / samples : Infinity,
    samples,
    kinContactFrac: samples > 0 ? withKin / samples : 0,
  };
}

describe('Entity colony / chain ecology (ADR 0016 deep)', () => {
  test('after a long run, kin nearest-neighbors form a chain-length band (not isolation fog)', () => {
    const em = drive(0xc01a1e, 900);
    const { mean, samples, kinContactFrac } = meanKinNearestNeighbor(em.list);
    expect(samples).toBeGreaterThan(POP * 0.4);
    // Ideal graphseek edge is ~4..9u; allow a living band (strings, not collapse, not rim fog).
    expect(mean).toBeGreaterThan(2.5);
    expect(mean).toBeLessThan(SOCIAL_FLOCK_R * 0.85);
    // Most organisms with any kin still have one inside the social flock disk.
    expect(kinContactFrac).toBeGreaterThan(0.55);
  });

  test('population stays on the social platform core (not rim isolation scatter)', () => {
    const em = drive(0xa11ce, 600);
    let meanR = 0;
    let n = 0;
    for (const e of em.list) {
      if (!e || e.userData.alive === false) continue;
      meanR += Math.hypot(e.position.x, e.position.z);
      n++;
    }
    meanR /= Math.max(1, n);
    // Social-core founders + ambient gravity: mean radius well inside platform half.
    expect(meanR).toBeLessThan(PLATFORM_HALF * 0.55);
    expect(meanR).toBeGreaterThan(PLATFORM_HALF * 0.02);
  });

  test('colony geometry is deterministic under the same seed', () => {
    const a = drive(0xbee5, 200);
    const b = drive(0xbee5, 200);
    const snap = (em: EntityManager): number[] =>
      em.list.flatMap((e) => [e.position.x, e.position.y, e.position.z, e.userData.setGroup]);
    expect(snap(a)).toEqual(snap(b));
  });
});
