/**
 * PLASTIC / FAST WEIGHTS — pure, headless tests (Stratum X within-life plasticity, #87/#91).
 *
 * Verifies the Hebbian fast-weight substrate: outer-product imprinting, associative recall, decay as
 * forgetting, clip as stability, the read-then-write step, and determinism. Hand-computed expectations;
 * all determinism-safe (pure, no rng/clock/DOM).
 */
import { describe, expect, test } from 'bun:test';
import { FastWeights } from '../src/sim/plastic-weights';

describe('FastWeights — Hebbian within-life plasticity', () => {
  test('imprint then recall is auto-associative; orthogonal input recalls ~0', () => {
    const fw = new FastWeights(2, 1, 0, 10); // eta=1, no decay
    fw.imprint([1, 0]); // W = [[1,0],[0,0]]
    expect(fw.recall([1, 0])).toEqual([1, 0]); // recalls the imprinted pattern
    expect(fw.recall([0, 1])).toEqual([0, 0]); // orthogonal → nothing
  });

  test('two imprinted patterns superpose', () => {
    const fw = new FastWeights(2, 1, 0, 10);
    fw.imprint([1, 0]);
    fw.imprint([0, 1]); // W = [[1,0],[0,1]] (identity)
    expect(fw.recall([1, 1])).toEqual([1, 1]);
  });

  test('decay forgets: energy shrinks as empty beats pass', () => {
    const fw = new FastWeights(2, 1, 0.5, 10);
    fw.imprint([1, 0]);
    const e1 = fw.snapshot().energy; // 1
    fw.imprint([0, 0]); // decays: 0.5
    const e2 = fw.snapshot().energy;
    fw.imprint([0, 0]); // 0.25
    const e3 = fw.snapshot().energy;
    expect(e1).toBeCloseTo(1, 10);
    expect(e2).toBeCloseTo(0.5, 10);
    expect(e3).toBeCloseTo(0.25, 10);
    expect(e2).toBeLessThan(e1);
    expect(e3).toBeLessThan(e2);
  });

  test('clip bounds the weights (stability)', () => {
    const fw = new FastWeights(1, 1, 0, 0.4); // clip 0.4
    for (let i = 0; i < 50; i++) fw.imprint([1]); // would grow to 50 without the clip
    expect(fw.snapshot().strongest).toBeCloseTo(0.4, 10);
    expect(fw.snapshot().strongest).toBeLessThanOrEqual(0.4 + 1e-9);
  });

  test('step reads the recent past THEN writes (no within-beat echo)', () => {
    const fw = new FastWeights(2, 1, 0, 10);
    // first step: W is empty, so recall is 0 → x passes through unchanged, then [1,0] is imprinted.
    expect(fw.step([1, 0])).toEqual([1, 0]);
    // second step: recall([1,0]) = [1,0] (from beat 1) → overlay = x + recall = [2,0]; then re-imprint.
    expect(fw.step([1, 0])).toEqual([2, 0]);
  });

  test('is deterministic + pure: identical streams → identical state; inputs not mutated', () => {
    const a = new FastWeights(3, 0.5, 0.1, 4);
    const b = new FastWeights(3, 0.5, 0.1, 4);
    const seq = [
      [1, 0, 0],
      [0, 1, 0.5],
      [0.3, 0.3, 0.3],
    ];
    for (let i = 0; i < 20; i++) {
      const x = seq[i % seq.length]!;
      a.imprint(x);
      b.imprint(x);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.recall([1, 1, 1])).toEqual(b.recall([1, 1, 1]));

    const frozen = Object.freeze([0.2, 0.4, 0.6]);
    a.recall(frozen);
    a.step(frozen);
    expect([...frozen]).toEqual([0.2, 0.4, 0.6]); // input untouched
  });

  test('snapshot shape: n, energy ≥ 0, strongest ≥ 0', () => {
    const fw = new FastWeights(4);
    fw.imprint([0.5, 0.5, 0.5, 0.5]);
    const s = fw.snapshot();
    expect(s.n).toBe(4);
    expect(s.energy).toBeGreaterThan(0);
    expect(s.strongest).toBeGreaterThan(0);
    expect(s.strongest).toBeLessThanOrEqual(s.energy);
  });
});
