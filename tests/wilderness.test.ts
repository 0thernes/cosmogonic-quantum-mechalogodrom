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
import {
  WildernessPopulation,
  simulateWildernessData,
  wildernessResourcePatchKey,
} from '../src/sim/wilderness-population';
import { WildernessRenderer } from '../src/sim/wilderness-render';
import type { WorkerPool, WorkerResult, WorkerTask } from '../src/core/worker-pool';

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
    // Camera-local wilderness census stays fixed: radius 3 => 7×7 chunks, 128 entities each.
    expect(pop.getActiveChunkCount()).toBe(49);
    expect(pop.getEntityCount()).toBe(49 * 128);
    let seen = 0;
    pop.forEachEntity(() => {
      seen++;
    });
    expect(seen).toBe(pop.getEntityCount());

    const chunksBeforeInvalidInput = pop.getActiveChunkCount();
    const entitiesBeforeInvalidInput = pop.getEntityCount();
    pop.update(Number.NaN, 0, 1 / 60);
    pop.update(0, Number.POSITIVE_INFINITY, 1 / 60);
    expect(pop.getActiveChunkCount()).toBe(chunksBeforeInvalidInput);
    expect(pop.getEntityCount()).toBe(entitiesBeforeInvalidInput);
    pop.forEachEntity((entity) => {
      expect(Number.isFinite(entity.x)).toBe(true);
      expect(Number.isFinite(entity.z)).toBe(true);
    });
    pop.dispose();
  });

  test('coordinate-derived population seeds are load-order independent and chunk-distinct', () => {
    const a = new WildernessPopulation(null, 0xabc123);
    const b = new WildernessPopulation(null, 0xabc123);
    // Both load 0,0, but at different points in their deterministic camera-radius traversal.
    a.update(0, 0, 0);
    b.update(100, 0, 0);

    const a00 = a.getSnapshot('0,0');
    const b00 = b.getSnapshot('0,0');
    const a10 = a.getSnapshot('1,0');
    expect(a00).not.toBeNull();
    expect(b00).not.toBeNull();
    expect(a10).not.toBeNull();
    expect(a00!.positions).toEqual(b00!.positions);
    expect(a00!.positions[7]).not.toBe(a10!.positions[7]);

    a.dispose();
    b.dispose();
  });

  test('shared kernel is deterministic and clamps invalid or oversized dt', () => {
    const initial = new Float32Array([50, 0, 50, 1, 0, -0.5, 2, 123]);
    const invalid = new Float32Array(initial);
    simulateWildernessData(invalid, 77, '0,0', Number.NaN);
    expect(invalid).toEqual(initial);

    const oversized = new Float32Array(initial);
    const capped = new Float32Array(initial);
    simulateWildernessData(oversized, 77, '0,0', 10);
    simulateWildernessData(capped, 77, '0,0', 0.05);
    expect(oversized).toEqual(capped);

    const replay = new Float32Array(initial);
    simulateWildernessData(replay, 77, '0,0', 0.05);
    expect(replay).toEqual(capped);
  });

  test('operational intelligence changes the shared fauna kernel under a matched-seed control', () => {
    const initial = new Float32Array([
      4, 0, 8, 0.25, 0, -0.1, 2, 123, 96, 0, 91, -0.2, 0, 0.15, 3, 456,
    ]);
    const baseline = new Float32Array(initial);
    const adaptive = new Float32Array(initial);
    const replay = new Float32Array(initial);
    simulateWildernessData(baseline, 77, '0,0', 0.05, 100);
    simulateWildernessData(adaptive, 77, '0,0', 0.05, 100, 1, 0.8, 0.7);
    simulateWildernessData(replay, 77, '0,0', 0.05, 100, 1, 0.8, 0.7);

    expect(adaptive).toEqual(replay);
    expect(adaptive).not.toEqual(baseline);
    for (const value of adaptive) expect(Number.isFinite(value)).toBe(true);
  });

  test('high uint32 seeds retain diverse resource patches despite Float32 packing', () => {
    const packedSeeds = new Float32Array(128);
    const keys = new Set<number>();
    for (let i = 0; i < packedSeeds.length; i++) {
      packedSeeds[i] = (0xf123_4567 + i) >>> 0;
      keys.add(wildernessResourcePatchKey(packedSeeds[i]!, i));
    }
    expect(new Set(packedSeeds).size).toBeLessThan(8);
    expect(keys.size).toBe(packedSeeds.length);
  });

  test('rejects non-positive or non-finite chunk sizes before boundary math', () => {
    const entity = new Float32Array([4, 0, 8, 0.25, 0, -0.1, 2, 123]);
    for (const chunkSize of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        simulateWildernessData(new Float32Array(entity), 77, '0,0', 0.05, chunkSize, 1, 1, 1),
      ).toThrow('chunkSize');
    }
  });

  test('malformed and non-finite worker results fall back to the shared synchronous kernel', async () => {
    let call = 0;
    const malformedPool = {
      executeAsync: async (task: WorkerTask): Promise<WorkerResult> => {
        call++;
        if (call % 2 === 0) {
          return {
            id: task.id,
            type: task.type,
            data: new Float32Array(Math.max(0, task.data.length - 1)),
            success: true,
          };
        }
        const bad = new Float32Array(task.data);
        bad[0] = Number.NaN;
        return { id: task.id, type: task.type, data: bad, success: true };
      },
    } as unknown as WorkerPool;

    const sync = new WildernessPopulation(null, 0x13579bdf);
    const asyncPop = new WildernessPopulation(malformedPool, 0x13579bdf);
    sync.update(0, 0, 1 / 60);
    asyncPop.update(0, 0, 1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(asyncPop.getSnapshot('0,0')!.positions).toEqual(sync.getSnapshot('0,0')!.positions);
    expect(call).toBeGreaterThan(0);
    sync.dispose();
    asyncPop.dispose();
  });

  test('worker backpressure keeps one active frame and only the newest queued frame', async () => {
    type Deferred = {
      task: WorkerTask;
      resolve: (result: WorkerResult) => void;
    };
    const calls: Deferred[] = [];
    const deferredPool = {
      executeAsync: (task: WorkerTask): Promise<WorkerResult> =>
        new Promise((resolve) => {
          calls.push({ task, resolve });
        }),
    } as unknown as WorkerPool;
    const pop = new WildernessPopulation(deferredPool, 0x2468ace0);

    pop.update(0, 0, 1 / 60);
    const callsPerFrame = calls.length;
    expect(callsPerFrame).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) pop.update(0, 0, 1 / 60);
    expect(calls).toHaveLength(callsPerFrame);

    for (const pending of calls.slice(0, callsPerFrame)) {
      pending.resolve({
        id: pending.task.id,
        type: pending.task.type,
        data: new Float32Array(0),
        success: false,
        error: 'synthetic fallback',
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(callsPerFrame * 2);
    expect(calls[callsPerFrame]!.task.id).toContain('-101');

    for (const pending of calls.slice(callsPerFrame)) {
      pending.resolve({
        id: pending.task.id,
        type: pending.task.type,
        data: new Float32Array(0),
        success: false,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    pop.dispose();
  });
});

describe('WildernessRenderer', () => {
  test('is a deliberate visual no-op — no confetti Points attached to the scene', () => {
    const scene = new THREE.Scene();
    const pop = new WildernessPopulation(null, 0xdef456);
    const render = new WildernessRenderer(scene);
    pop.update(120, 120, 1 / 60);
    render.sync(pop, 1.5);
    const pts = scene.children.find((c) => c instanceof THREE.Points);
    expect(pts).toBeUndefined();
    expect(scene.children.length).toBe(0);
    render.dispose();
    pop.dispose();
  });
});
