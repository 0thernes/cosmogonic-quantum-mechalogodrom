/**
 * THE SPIN-GLASS INSTINCT (V84) — proves the ported Tsotchke spin network is a working Hopfield
 * associative memory: imprinted archetypes are stable attractors, a field nudge recalls the nearest
 * one, and the whole instinct replays from a seed. Experiments (a falsifiable claim each).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SpinGlass } from '../src/sim/spin-glass';

const N = 24;
// Two well-separated archetypes (block patterns → low cross-overlap).
const PATTERN_A = Array.from({ length: N }, (_, i) => (i < N / 2 ? 1 : -1));
const PATTERN_B = Array.from({ length: N }, (_, i) => (i % 2 === 0 ? 1 : -1));

describe('SpinGlass (V84) — the ported Tsotchke spin-based instinct', () => {
  test('an imprinted pattern is a stable attractor at low temperature', () => {
    const sg = new SpinGlass(N, mulberry32(1));
    sg.imprint([PATTERN_A]);
    sg.setStateToPattern(0);
    sg.setField([], 0); // zero field
    sg.settle(20, 0.05, mulberry32(2)); // cold relaxation
    const s = sg.snapshot();
    expect(s.bestPattern).toBe(0);
    expect(s.bestOverlap).toBeGreaterThan(0.95); // it stays in the memory
  });

  test('a field nudge recalls the matching archetype from a random start', () => {
    const sg = new SpinGlass(N, mulberry32(3));
    sg.imprint([PATTERN_A, PATTERN_B]);
    sg.setField(PATTERN_B, 0.6); // bias toward B
    sg.settle(60, 0.2, mulberry32(4));
    const s = sg.snapshot();
    expect(s.patterns).toBe(2);
    expect(s.overlap[1] ?? 0).toBeGreaterThan(0.7); // recalled B
    expect(s.overlap[1] ?? 0).toBeGreaterThan(s.overlap[0] ?? 0); // and B beats A
  });

  test('same seed + same drive ⇒ identical instinct (deterministic)', () => {
    const run = (): string => {
      const sg = new SpinGlass(N, mulberry32(7));
      sg.imprint([PATTERN_A, PATTERN_B]);
      const drive = mulberry32(11);
      for (let beat = 0; beat < 10; beat++) {
        sg.setField(PATTERN_A, 0.3 + beat * 0.02);
        sg.settle(5, 0.5, drive);
      }
      return JSON.stringify(sg.snapshot());
    };
    expect(run()).toBe(run());
  });

  test('snapshot stays bounded + NaN-free over a long driven run', () => {
    const sg = new SpinGlass(N, mulberry32(13));
    sg.imprint([PATTERN_A, PATTERN_B]);
    const drive = mulberry32(17);
    for (let beat = 0; beat < 300; beat++) {
      sg.setField(beat % 2 === 0 ? PATTERN_A : PATTERN_B, 0.5);
      sg.settle(3, 0.4 + 0.3 * Math.sin(beat * 0.1), drive);
      const s = sg.snapshot();
      expect(Number.isFinite(s.energy)).toBe(true);
      expect(s.magnetization).toBeGreaterThanOrEqual(-1);
      expect(s.magnetization).toBeLessThanOrEqual(1);
      for (const m of s.overlap) {
        expect(m).toBeGreaterThanOrEqual(-1.0001);
        expect(m).toBeLessThanOrEqual(1.0001);
      }
    }
  });

  test('rejects a degenerate size', () => {
    expect(() => new SpinGlass(1, mulberry32(1))).toThrow(RangeError);
  });
});
