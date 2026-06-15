/**
 * Connectome — the neural link graph rebuilt each cadence from entity proximity (grid-queried),
 * with an open-addressed id→index table and an `ACT_MAX`-clamped activation accumulator. Covered only
 * via the integrated world loop; this pins the direct contract: the link count stays a non-negative
 * integer bounded by the tier's `maxLinks`, neural activation never overflows, and the rebuild is
 * fully reproducible from one seed (it draws no rng — pure proximity + math).
 *
 * Headless (fake-ctx pattern) — drives the real `update` over a real EntityManager + populated grid.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { Connectome } from '../src/sim/connectome';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 1,
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

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone' as const,
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 400,
      targetEntities: 400,
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

function makeWorld(seed: number): { ctx: SimContext; entities: EntityManager; conn: Connectome } {
  const ctx = makeCtx(seed);
  const entities = new EntityManager(ctx);
  entities.reset(100);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const conn = new Connectome(ctx, entities);
  return { ctx, entities, conn };
}

const actTrace = (entities: EntityManager): number[] => {
  const out: number[] = [];
  for (const e of entities.list) if (e) out.push(e.userData.act);
  return out;
};

describe('Connectome — bounded link graph + finite activation, deterministic rebuild', () => {
  test('link count is a non-negative integer bounded by the tier maxLinks', () => {
    const { ctx, conn } = makeWorld(0x1100ab);
    conn.update(1 / 60, 1);
    expect(Number.isInteger(conn.links)).toBe(true);
    expect(conn.links).toBeGreaterThanOrEqual(0);
    expect(conn.links).toBeLessThanOrEqual(ctx.quality.maxLinks);
  });

  test('neural activation stays finite + bounded across many rebuilds (ACT_MAX clamp)', () => {
    const { entities, conn } = makeWorld(0x2200cd);
    for (let f = 0; f < 120; f++) conn.update(1 / 60, f / 60);
    for (const e of entities.list) {
      if (!e) continue;
      expect(Number.isFinite(e.userData.act)).toBe(true);
      expect(Math.abs(e.userData.act)).toBeLessThan(100); // ACT_MAX is ~4; this catches any overflow
    }
  });

  test('identical seeds replay an identical link count + activation trace (no rng)', () => {
    const a = makeWorld(0x3300ef);
    const b = makeWorld(0x3300ef);
    for (let f = 0; f < 60; f++) {
      a.conn.update(1 / 60, f / 60);
      b.conn.update(1 / 60, f / 60);
    }
    expect(a.conn.links).toBe(b.conn.links);
    expect(actTrace(b.entities)).toEqual(actTrace(a.entities));
  });
});
