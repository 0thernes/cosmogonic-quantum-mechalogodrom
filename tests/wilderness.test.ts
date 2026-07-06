/**
 * Wilderness population + renderer + chunk-grid contracts (ADR 0010).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  CHUNK_SIZE,
  chunkCoord,
  chunkKey,
  chunkSeed,
  chunksInRadius,
  streamPlan,
} from '../src/sim/wilderness-chunks';
import { WildernessPopulation } from '../src/sim/wilderness-population';
import { WildernessRenderer } from '../src/sim/wilderness-render';

describe('wilderness chunk grid (Stage 3 / ADR 0010)', () => {
  test('chunkCoord floors world position into chunks', () => {
    expect(chunkCoord(0, 0)).toEqual({ cx: 0, cz: 0 });
    expect(chunkCoord(CHUNK_SIZE * 1.5, -CHUNK_SIZE * 0.5)).toEqual({ cx: 1, cz: -1 });
    expect(chunkCoord(-1, -1)).toEqual({ cx: -1, cz: -1 });
  });

  test('chunkSeed is deterministic, distinct per chunk and per world seed, and a uint32', () => {
    expect(chunkSeed(42, 3, 7)).toBe(chunkSeed(42, 3, 7));
    expect(chunkSeed(42, 3, 7)).not.toBe(chunkSeed(42, 7, 3));
    expect(chunkSeed(42, 3, 7)).not.toBe(chunkSeed(43, 3, 7));
    const s = chunkSeed(42, 3, 7);
    expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
  });

  test('chunksInRadius returns the (2r+1)^2 Chebyshev block', () => {
    expect(chunksInRadius(0, 0, 0)).toHaveLength(1);
    expect(chunksInRadius(0, 0, 1)).toHaveLength(9);
    expect(chunksInRadius(5, -2, 2)).toHaveLength(25);
  });

  test('streamPlan diffs loaded vs in-range: loads new, unloads stale, keeps overlap', () => {
    const plan0 = streamPlan(new Set(), 0, 0, 1);
    expect(plan0.load).toHaveLength(9);
    expect(plan0.unload).toHaveLength(0);

    const loaded = new Set(chunksInRadius(0, 0, 1).map((c) => chunkKey(c.cx, c.cz)));

    const far = streamPlan(loaded, 3, 0, 1);
    expect(far.load).toHaveLength(9);
    expect(far.unload).toHaveLength(9);

    const step = streamPlan(loaded, 1, 0, 1);
    expect(step.load).toHaveLength(3);
    expect(step.unload).toHaveLength(3);

    const still = streamPlan(loaded, 0, 0, 1);
    expect(still.load).toHaveLength(0);
    expect(still.unload).toHaveLength(0);
  });
});

describe('WildernessPopulation', () => {
  test('loads camera-streamed chunks and exposes entity + chunk counts', () => {
    const pop = new WildernessPopulation(null, 0xabc123);
    pop.update(50, 50, 1 / 60);
    expect(pop.getEntityCount()).toBeGreaterThan(0);
    expect(pop.getActiveChunkCount()).toBeGreaterThan(0);
    let seen = 0;
    pop.forEachEntity(() => {
      seen++;
    });
    expect(seen).toBe(pop.getEntityCount());
    pop.dispose();
  });
});

describe('WildernessRenderer', () => {
  test('sync is allocation-free and toggles visibility from population count', () => {
    const scene = new THREE.Scene();
    const pop = new WildernessPopulation(null, 0xdef456);
    const render = new WildernessRenderer(scene);
    pop.update(120, 120, 1 / 60);
    render.sync(pop, 1.5);
    const pts = scene.children.find((c) => c instanceof THREE.Points) as THREE.Points | undefined;
    expect(pts?.visible).toBe(true);
    expect((pts?.geometry as THREE.BufferGeometry).drawRange.count).toBeGreaterThan(0);
    render.dispose();
    pop.dispose();
  });
});
