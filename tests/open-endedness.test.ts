/**
 * OPEN-ENDEDNESS metrics — pure, headless tests.
 *
 * Verifies the instrumentation that measures whether the soup evolves open-endedly (Bedau-Packard
 * evolutionary activity + the 2026 Petri-NCA novelty/diversity template). Hand-computed expected
 * values; all determinism-safe (pure functions, no rng/clock/DOM).
 */
import { describe, expect, test } from 'bun:test';
import {
  shannonDiversity,
  richness,
  historicalNovelty,
  evolutionaryActivity,
} from '../src/sim/open-endedness';

describe('open-endedness metrics (research bedrock: Bedau-Packard + Petri-NCA)', () => {
  test('shannonDiversity (bits): even spread → log2(n), monoculture → 0', () => {
    expect(shannonDiversity([1, 1])).toBeCloseTo(1, 10); // 2 even → 1 bit
    expect(shannonDiversity([1, 1, 1, 1])).toBeCloseTo(2, 10); // 4 even → 2 bits
    expect(shannonDiversity([4])).toBe(0); // monoculture
    expect(shannonDiversity([5, 0, 0])).toBe(0); // one species present
    expect(shannonDiversity([])).toBe(0); // empty
    expect(shannonDiversity([-3, -1])).toBe(0); // negatives clamped
  });

  test('richness counts distinct present categories', () => {
    expect(richness([3, 0, 5, 1])).toBe(3);
    expect(richness([0, 0])).toBe(0);
    expect(richness([])).toBe(0);
  });

  test('historicalNovelty: nearest-neighbour distance in feature space', () => {
    expect(
      historicalNovelty(
        [0, 0],
        [
          [0, 0],
          [3, 4],
        ],
      ),
    ).toBe(0); // matches an archived point
    expect(historicalNovelty([3, 4], [[0, 0]])).toBe(5); // 3-4-5 triangle
    expect(historicalNovelty([1, 1], [])).toBe(Number.POSITIVE_INFINITY); // nothing seen yet = max novel
  });

  test('evolutionaryActivity: per-component cumulative activity, total, mean', () => {
    const a = evolutionaryActivity([
      [1, 2],
      [3, 0],
    ]);
    expect(a.cumulative).toEqual([4, 2]); // columns summed across time
    expect(a.total).toBe(6);
    expect(a.mean).toBe(3);
  });

  test('evolutionaryActivity tolerates ragged rows + empty history', () => {
    const a = evolutionaryActivity([[1], [2, 5], [0, 0, 9]]);
    expect(a.cumulative).toEqual([3, 5, 9]);
    expect(a.total).toBe(17);
    const empty = evolutionaryActivity([]);
    expect(empty.cumulative).toEqual([]);
    expect(empty.total).toBe(0);
    expect(empty.mean).toBe(0);
  });

  test('open-endedness signal: novelty stays high while the population keeps exploring new ground', () => {
    // A drifting-but-bounded run revisits old signatures (low novelty); an open-ended run keeps moving.
    const archive = [
      [0, 0],
      [1, 0],
      [2, 0],
    ];
    const revisiting = historicalNovelty([1, 0], archive); // back to known ground
    const exploring = historicalNovelty([2, 5], archive); // new region
    expect(exploring).toBeGreaterThan(revisiting);
  });
});
