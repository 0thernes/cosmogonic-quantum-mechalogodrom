/**
 * STAGE 3 (ADR 0010) — wilderness chunk-grid tests (pure, headless).
 *
 * Proves the streaming skeleton is correct + deterministic before any worker/threading code sits
 * on it: world→chunk mapping, per-chunk seeds (own substream, not the core stream), the Chebyshev
 * load ring, and the load/unload diff as the camera moves.
 */
import { describe, expect, test } from 'bun:test';
import {
  CHUNK_SIZE,
  chunkCoord,
  chunkKey,
  chunkSeed,
  chunksInRadius,
  streamPlan,
} from '../src/sim/wilderness-chunks';

describe('wilderness chunk grid (Stage 3 / ADR 0010)', () => {
  test('chunkCoord floors world position into chunks', () => {
    expect(chunkCoord(0, 0)).toEqual({ cx: 0, cz: 0 });
    expect(chunkCoord(CHUNK_SIZE * 1.5, -CHUNK_SIZE * 0.5)).toEqual({ cx: 1, cz: -1 });
    expect(chunkCoord(-1, -1)).toEqual({ cx: -1, cz: -1 });
  });

  test('chunkSeed is deterministic, distinct per chunk and per world seed, and a uint32', () => {
    expect(chunkSeed(42, 3, 7)).toBe(chunkSeed(42, 3, 7)); // deterministic
    expect(chunkSeed(42, 3, 7)).not.toBe(chunkSeed(42, 7, 3)); // distinct per chunk
    expect(chunkSeed(42, 3, 7)).not.toBe(chunkSeed(43, 3, 7)); // distinct per world seed
    const s = chunkSeed(42, 3, 7);
    expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
  });

  test('chunksInRadius returns the (2r+1)^2 Chebyshev block', () => {
    expect(chunksInRadius(0, 0, 0)).toHaveLength(1);
    expect(chunksInRadius(0, 0, 1)).toHaveLength(9);
    expect(chunksInRadius(5, -2, 2)).toHaveLength(25);
  });

  test('streamPlan diffs loaded vs in-range: loads new, unloads stale, keeps overlap', () => {
    // camera at chunk (0,0), radius 1 → 9 chunks wanted, none loaded yet.
    const plan0 = streamPlan(new Set(), 0, 0, 1);
    expect(plan0.load).toHaveLength(9);
    expect(plan0.unload).toHaveLength(0);

    const loaded = new Set(chunksInRadius(0, 0, 1).map((c) => chunkKey(c.cx, c.cz)));

    // jump far (3,0): the 9 old chunks are all out of range → 9 load, 9 unload.
    const far = streamPlan(loaded, 3, 0, 1);
    expect(far.load).toHaveLength(9);
    expect(far.unload).toHaveLength(9);

    // a one-chunk step (1,0): two columns overlap → 3 load, 3 unload.
    const step = streamPlan(loaded, 1, 0, 1);
    expect(step.load).toHaveLength(3);
    expect(step.unload).toHaveLength(3);

    // standing still: nothing to do.
    const still = streamPlan(loaded, 0, 0, 1);
    expect(still.load).toHaveLength(0);
    expect(still.unload).toHaveLength(0);
  });
});
