/**
 * THE METACOGNITIVE EXECUTIVE (Super Creature 1.1, V92) — the fifth pillar: a Higher-Order confidence in
 * the mind's own decision, spent as cognitive control. Pins determinism, bounds, the monotonic response
 * to its four reliability cues, the control = 1 − confidence identity, and snapshot shape.
 */
import { describe, expect, test } from 'bun:test';
import { Metacognition, type MetacognitionSnapshot } from '../src/sim/metacognition';

describe('Metacognition — the metacognitive executive (V92)', () => {
  test('confidence + control are bounded [0,1] and control = 1 − confidence', () => {
    const m = new Metacognition();
    // sweep a grid of cue combinations including the extremes
    for (let i = 0; i < 50; i++) {
      const margin = (i % 5) / 4;
      const phi = ((i + 1) % 4) / 3;
      const belief = (i % 3) / 2;
      const surprise = ((i + 2) % 6) / 5;
      const c = m.update(margin, phi, belief, surprise);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
      expect(m.control).toBeCloseTo(1 - c, 12);
      expect(m.value).toBe(c);
    }
  });

  test('it clamps out-of-range AND non-finite cues (defensive) — never NaN, never poisons the EMA', () => {
    const m = new Metacognition();
    let c = m.update(5, -3, 9, -2); // wildly out of range
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
    // actual NaN / ±Infinity on any cue must collapse to a bounded value, not poison the EMA forever
    const bad: Array<[number, number, number, number]> = [
      [NaN, 0.5, 0.5, 0.5],
      [0.5, NaN, 0.5, 0.5],
      [0.5, 0.5, NaN, 0.5],
      [0.5, 0.5, 0.5, NaN],
      [Infinity, -Infinity, NaN, Infinity],
    ];
    for (const [mg, ph, be, su] of bad) {
      c = m.update(mg, ph, be, su);
      expect(Number.isFinite(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    // a clean beat AFTER a NaN beat recovers to a finite, bounded value (no permanent EMA poisoning)
    c = m.update(1, 1, 0, 0);
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
    expect(JSON.stringify(m.snapshot())).not.toContain('null'); // snapshot never serialises a NaN
  });

  test('deterministic — the same cue stream replays the identical confidence trajectory', () => {
    const a = new Metacognition();
    const b = new Metacognition();
    const seq: Array<[number, number, number, number]> = [
      [0.9, 0.8, 0.1, 0.1],
      [0.2, 0.3, 0.9, 0.8],
      [0.5, 0.5, 0.5, 0.5],
      [1, 1, 0, 0],
    ];
    for (const [mg, ph, be, su] of seq) {
      expect(a.update(mg, ph, be, su)).toBe(b.update(mg, ph, be, su));
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('high-reliability cues drive confidence UP, low-reliability cues drive it DOWN', () => {
    // settle a "sure" mind: decisive margin, integrated, certain belief, unsurprised
    const sure = new Metacognition();
    for (let i = 0; i < 80; i++) sure.update(1, 1, 0, 0);
    // settle an "unsure" mind: tied decision, fragmented, uncertain belief, surprised
    const unsure = new Metacognition();
    for (let i = 0; i < 80; i++) unsure.update(0, 0, 1, 1);
    expect(sure.value).toBeGreaterThan(0.85);
    expect(unsure.value).toBeLessThan(0.15);
    // control is the inverse: the unsure mind demands far more exploration/deliberation
    expect(unsure.control).toBeGreaterThan(sure.control);
  });

  test('each cue moves confidence in the right direction, holding the others fixed', () => {
    const base = (over: Partial<{ m: number; p: number; b: number; s: number }>): number => {
      const mc = new Metacognition();
      const v = { m: 0.5, p: 0.5, b: 0.5, s: 0.5, ...over };
      let c = 0;
      for (let i = 0; i < 60; i++) c = mc.update(v.m, v.p, v.b, v.s);
      return c;
    };
    const mid = base({});
    expect(base({ m: 1 })).toBeGreaterThan(mid); // more margin ⇒ more confident
    expect(base({ p: 1 })).toBeGreaterThan(mid); // more integration ⇒ more confident
    expect(base({ b: 0 })).toBeGreaterThan(mid); // less belief entropy (more certain) ⇒ more confident
    expect(base({ s: 0 })).toBeGreaterThan(mid); // less surprise ⇒ more confident
  });

  test('snapshot carries confidence, control, and the last margin', () => {
    const m = new Metacognition();
    m.update(0.7, 0.6, 0.2, 0.3);
    const snap: MetacognitionSnapshot = m.snapshot();
    expect(snap.confidence).toBe(m.value);
    expect(snap.control).toBeCloseTo(1 - m.value, 12);
    expect(snap.margin).toBeCloseTo(0.7, 12);
  });
});
