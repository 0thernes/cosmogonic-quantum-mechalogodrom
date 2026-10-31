import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { Lineage } from '../src/sim/lineage';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';
import { getQuantizationConfig } from '../src/math/quantization';

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
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
      quantization: getQuantizationConfig('phone'),
      shadows: false,
      starCount: 10,
      simRate: 8,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: {
      chaos: 1,
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
    } as SimState,
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

describe('lineage wiring (restored lineage.ts → EntityManager)', () => {
  test('every birth gets a lineage id; children are one generation deeper than parents', () => {
    const em = new EntityManager(makeCtx(3));
    const lin = new Lineage(1024);
    em.lineage = lin;
    const a = em.spawn(null, 0)!;
    const child = em.spawn(null, 0, 1, a)!;
    const grand = em.spawn(null, 0, 1, child)!;
    expect(lin.generationOf(a.userData.lineageId!)).toBe(0);
    expect(lin.generationOf(child.userData.lineageId!)).toBe(1);
    expect(lin.generationOf(grand.userData.lineageId!)).toBe(2);
    expect(lin.isAncestor(a.userData.lineageId!, grand.userData.lineageId!)).toBe(true);
    expect(lin.maxGeneration).toBe(2);
  });
  test('attaching lineage draws no rng: spawn positions are identical with and without it', () => {
    const pos = (withLineage: boolean): number[] => {
      const em = new EntityManager(makeCtx(9));
      if (withLineage) em.lineage = new Lineage(64);
      const out: number[] = [];
      for (let i = 0; i < 20; i++) {
        const e = em.spawn(null, i)!;
        out.push(e.position.x, e.position.y, e.position.z);
      }
      return out;
    };
    expect(pos(true)).toEqual(pos(false));
  });
  test('World attaches a population-sized lineage window', () => {
    expect(readFileSync('src/world.ts', 'utf8')).toContain('this.entities.lineage = new Lineage(');
  });
});
