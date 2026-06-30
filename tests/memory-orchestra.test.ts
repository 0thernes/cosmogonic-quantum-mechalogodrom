/**
 * MEMORY ORCHESTRA — recall() cap regression (GOAL5 faculty).
 *
 * recall() reuses a preallocated `recallOut` buffer and shrinks its `.length` to the actual
 * fill count each call. A past bug derived the NEXT call's capacity from that same mutated
 * `.length` instead of a constant, so a call that returned fewer than `max` results would
 * permanently lock every future call to that smaller count, never recovering even once more
 * records became available.
 */
import { describe, expect, test } from 'bun:test';
import { MemoryOrchestra } from '../src/sim/memory-orchestra';

describe('MemoryOrchestra.recall', () => {
  test('a smaller-result call does not shrink-lock the cap for later, larger-result calls', () => {
    const mem = new MemoryOrchestra();
    const ctx = new Array(8).fill(0.5);

    mem.write('obs', 1, 0.9, 0, [1, 0, 0, 0, 0, 0, 0, 0]);
    mem.write('obs', 2, 0.9, 0, [1, 0, 0, 0, 0, 0, 0, 0]);
    const first = mem.recall(ctx, 4);
    expect(first.length).toBe(2);

    mem.write('obs', 3, 0.9, 0, [1, 0, 0, 0, 0, 0, 0, 0]);
    mem.write('obs', 4, 0.9, 0, [1, 0, 0, 0, 0, 0, 0, 0]);
    const second = mem.recall(ctx, 4);
    expect(second.length).toBe(4);
  });

  test('recall respects a smaller explicit max even when more records are available', () => {
    const mem = new MemoryOrchestra();
    const ctx = new Array(8).fill(0.5);
    for (let i = 0; i < 6; i++) {
      mem.write('obs', i, 0.9, 0, [1, 0, 0, 0, 0, 0, 0, 0]);
    }
    expect(mem.recall(ctx, 2).length).toBe(2);
    expect(mem.recall(ctx, 4).length).toBe(4);
  });
});
