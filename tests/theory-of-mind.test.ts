/**
 * THEORY OF MIND (Super Creature 1.1, V94) — the sixth pillar: SOCIAL cognition / opponent modelling.
 * Pins determinism, bounds, the belief being a valid distribution, NaN-safety, liveness, and that the
 * proximity gate makes a near rival at least as menacing as a far one for an identical settled belief.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { TheoryOfMind } from '../src/sim/theory-of-mind';
import { SUPER_PLANS } from '../src/sim/super-creature';

describe('TheoryOfMind — the opponent model (V94)', () => {
  test('menace / socialSurprise / confidence are bounded [0,1]; belief is a valid distribution', () => {
    const t = new TheoryOfMind(mulberry32(1));
    for (let i = 0; i < 60; i++) {
      const m = t.observe(
        (i % 5) / 4,
        ((i + 1) % 4) / 3,
        (i % 3) / 2,
        ((i + 2) % 6) / 5,
        (i % 7) / 6,
        i % 2,
      );
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
      const s = t.snapshot();
      for (const v of [s.menace, s.socialSurprise, s.confidence]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      let sum = 0;
      for (const p of s.belief) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
        sum += p;
      }
      expect(sum).toBeCloseTo(1, 5); // the belief stays a normalised distribution
      expect(SUPER_PLANS).toContain(s.predictedRivalPlan);
    }
  });

  test('deterministic — same seed + same observation stream ⇒ identical opponent model', () => {
    const a = new TheoryOfMind(mulberry32(42));
    const b = new TheoryOfMind(mulberry32(42));
    const seq: Array<[number, number, number, number, number, number]> = [
      [0.9, 0.8, 0.3, 0.7, 0.4, 0.5],
      [0.2, 0.3, 0.9, 0.1, 0.8, 0.2],
      [0.6, 0.6, 0.5, 0.5, 0.5, 0.9],
    ];
    for (const o of seq) {
      expect(a.observe(...o)).toBe(b.observe(...o));
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('NaN / ±Infinity cues never produce NaN or break the bounds (defensive leaf)', () => {
    const t = new TheoryOfMind(mulberry32(5));
    for (const o of [
      [NaN, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, Infinity, -Infinity, NaN, 0.5, 0.5],
      [NaN, NaN, NaN, NaN, NaN, NaN],
    ] as Array<[number, number, number, number, number, number]>) {
      const m = t.observe(...o);
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
      const s = t.snapshot();
      expect(JSON.stringify(s)).not.toContain('null');
    }
  });

  test('the proximity gate: a settled rival is at least as menacing up close as far away', () => {
    const near = new TheoryOfMind(mulberry32(9));
    const far = new TheoryOfMind(mulberry32(9));
    // drive BOTH with identical threatening cues except the final-beat proximity, after a shared settle
    for (let i = 0; i < 40; i++) {
      near.observe(0.8, 0.9, 0.2, 0.8, 0.5, 0.5);
      far.observe(0.8, 0.9, 0.2, 0.8, 0.5, 0.5);
    }
    const mNear = near.observe(1, 0.9, 0.2, 0.8, 0.5, 0.5);
    const mFar = far.observe(0, 0.9, 0.2, 0.8, 0.5, 0.5);
    // the proximity gate (0.3 + 0.7·close) is monotone; the only divergence is rivalClose, so near ≥ far
    expect(mNear).toBeGreaterThanOrEqual(mFar);
  });

  test("it's alive — menace varies across distinct social situations (not a pinned constant)", () => {
    const t = new TheoryOfMind(mulberry32(7));
    const menaces: number[] = [];
    for (let i = 0; i < 30; i++) {
      menaces.push(t.observe((i % 6) / 5, ((i * 7) % 11) / 10, 0.5, (i % 4) / 3, 0.3, (i % 3) / 2));
    }
    expect(new Set(menaces.map((m) => Math.round(m * 1e3))).size).toBeGreaterThan(1);
  });
});
