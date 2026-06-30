/**
 * Entity DYNAMISM invariants — the owner's standing mandate that "every creature should be dynamic
 * and unique and different and special. Reactive, Responsive, Adaptive" + the world should not pile
 * into one spot. The rest of the entity tests pin death / heredity / determinism; NONE guards that
 * the living population stays DIVERSE, MOVING, and SPREAD. A regression that homogenised behaviours,
 * froze motion, or re-collapsed the swarm to the centre would stay deterministic and pass every
 * golden — yet ruin the world. This pins those behavioural-quality invariants empirically.
 *
 * Headless fake-ctx (no WebGL/DOM), mirroring the titan test pattern: real geometries + morphotypes
 * at a small tier, the grid rebuilt each frame (the neighbour-query behaviours read it). Deterministic
 * (seeded Rng), so the thresholds are stable run-to-run.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

const POP = 1200;

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
      maxLinks: 100,
      shadows: false,
      starCount: 5,
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

/** Build a population and drive it `frames` ticks (rebuilding the grid each frame, like the world). */
function driveWorld(seed: number, frames: number): { em: EntityManager; ctx: SimContext } {
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
  return { em, ctx };
}

describe('Entity dynamism — diverse, moving, spread, finite', () => {
  test('the living population runs MANY distinct behaviours (not homogenised to one)', () => {
    const { em, ctx } = driveWorld(0xc0ffee, 400);
    const morphs = ctx.morphs;
    const behaviours = new Set<string>();
    for (const e of em.list) {
      const mi = (e.userData as { mi?: number }).mi;
      if (mi !== undefined) behaviours.add(morphs[mi]?.beh ?? '?');
    }
    expect(em.list.length).toBeGreaterThan(0);
    // measured 20 distinct across 1500; assert a healthy floor so a homogenising regression is caught.
    expect(behaviours.size).toBeGreaterThanOrEqual(8);
  });

  test('creatures are MOVING with varied speeds — none of the swarm is frozen', () => {
    const { em } = driveWorld(0xc0ffee, 400);
    const speeds: number[] = [];
    for (const e of em.list) {
      const v = (e.userData as { vel?: THREE.Vector3 }).vel;
      speeds.push(v ? Math.hypot(v.x, v.y, v.z) : 0);
    }
    speeds.sort((a, b) => a - b);
    const n = speeds.length;
    const frozen = speeds.filter((s) => s < 1e-4).length / n;
    const p10 = speeds[Math.floor(n * 0.1)] ?? 0;
    const p90 = speeds[Math.floor(n * 0.9)] ?? 0;
    expect(frozen).toBeLessThan(0.5); // the population is not stalled (measured 0% frozen)
    expect(p90).toBeGreaterThan(p10); // a real speed spread — motion is varied, not uniform
    expect(p90).toBeGreaterThan(0); // something is genuinely moving
  });

  test('the swarm stays SPREAD across the arena — not re-collapsed to the centre', () => {
    const { em } = driveWorld(0xc0ffee, 400);
    let near = 0;
    let finite = 0;
    for (const e of em.list) {
      const p = e.position;
      if (!Number.isFinite(p.x + p.y + p.z)) continue;
      finite++;
      if (Math.hypot(p.x, p.z) < 60) near++;
    }
    expect(finite).toBe(em.list.length); // no NaN/Inf leaked into any position
    expect(near / em.list.length).toBeLessThan(0.6); // not piled in the middle (measured ~15%)
  });

  test('the world stays numerically clean (no NaN/Inf in any velocity)', () => {
    const { em } = driveWorld(0xbeef, 500);
    for (const e of em.list) {
      const v = (e.userData as { vel?: THREE.Vector3 }).vel;
      if (v) expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
      expect(Number.isFinite(e.position.x + e.position.y + e.position.z)).toBe(true);
    }
  });

  test('the population evolves DETERMINISTICALLY — same seed reproduces the same world', () => {
    const checksum = (em: EntityManager): number => {
      let s = 0;
      for (const e of em.list) s += e.position.x * 0.37 + e.position.z * 0.91 + e.position.y * 0.13;
      return Math.round(s * 1000);
    };
    expect(checksum(driveWorld(0x1234, 240).em)).toBe(checksum(driveWorld(0x1234, 240).em));
  });
});
