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
  newActivitySeries,
  bedauPackardActivity,
  openEndednessVerdict,
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

  test('newActivitySeries: only high-water-mark rises count; revisiting old ground contributes 0', () => {
    // window=2: step i compares snap[i] to max(snap[i-2..i-1]).
    // series [0,1,2,3,2,4] → i=2:max(0,2-1)=1, i=3:max(0,3-2)=1, i=4:max(0,2-3)=0, i=5:max(0,4-3)=1
    expect(newActivitySeries([0, 1, 2, 3, 2, 4], 2)).toEqual([1, 1, 0, 1]);
    expect(newActivitySeries([5, 5, 5], 2)).toEqual([0]); // flat → no new activity
    expect(newActivitySeries([1, 2], 8)).toEqual([]); // too short for the warmup window
  });

  test('bedauPackardActivity stays a [0,1] fraction after the DRY refactor', () => {
    // hand-check: snaps [0,1,2,3,2,4], window=2 → persistingNew=1+1+0+1=3, total=2+3+2+4=11 → 3/11
    expect(bedauPackardActivity([0, 1, 2, 3, 2, 4], 2)).toBeCloseTo(3 / 11, 12);
    expect(bedauPackardActivity([1, 2], 8)).toBe(0); // too short
    expect(bedauPackardActivity([5, 5, 5, 5], 2)).toBe(0); // flat → zero activity
  });

  test('openEndednessVerdict: UNBOUNDED when the innovation rate persists (linear growth)', () => {
    // a steadily-climbing series keeps minting new high-water marks at a constant rate → open-ended
    const linear = Array.from({ length: 40 }, (_, i) => i);
    const v = openEndednessVerdict(linear, 8);
    expect(v.verdict).toBe('unbounded');
    expect(v.newLate).toBeGreaterThan(0);
    expect(v.ratio).toBeGreaterThanOrEqual(0.5);
  });

  test('openEndednessVerdict: BOUNDED when innovation decays onto a plateau (logistic saturation)', () => {
    // a saturating curve innovates early then flattens → new-activity rate collapses in the late half
    const logistic = Array.from({ length: 40 }, (_, i) => 1 / (1 + Math.exp(-(i - 8) * 0.6)));
    const v = openEndednessVerdict(logistic, 8);
    expect(v.verdict).toBe('bounded');
    expect(v.newLate).toBeLessThan(v.newEarly);
  });

  test('openEndednessVerdict: INACTIVE when the soup never innovates (frozen/monoculture)', () => {
    const flat = Array.from({ length: 40 }, () => 3);
    expect(openEndednessVerdict(flat, 8).verdict).toBe('inactive');
    // too-short series can't be judged → inactive, not a false positive
    expect(openEndednessVerdict([1, 2, 3], 8).verdict).toBe('inactive');
  });
});
