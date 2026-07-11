/**
 * NHI cognitive snapshot (V15) — the data layer behind the 3×3 neural-observatory grid.
 *
 * The 9 scientific views are only as honest as the snapshot they read, so this pins: (1) the snapshot
 * exposes the real network/percept shapes (9→6→7 MLP, 7 actions, 109 weights); (2) it is bit-identical
 * from one seed (so two observers see the same mind); (3) it is sensitive (a different seed diverges).
 * Pure cognition — no DOM, headless.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { NhiMind, type NhiPercept } from '../src/sim/nhi';

function percept(beat: number): NhiPercept {
  return {
    beat,
    energy: 0.6,
    crowding: 0.4,
    chaos: 0.5,
    threat: 0.3,
    rivalFaction: 2,
    rivalLastMove: beat % 2,
  };
}

function run(seed: number): ReturnType<NhiMind['snapshot']> {
  const rng = mulberry32(seed);
  const mind = new NhiMind(rng);
  for (let i = 0; i < 12; i++) mind.think(percept(i), rng);
  return mind.snapshot();
}

describe('NHI cognitive snapshot', () => {
  test('exposes the real layer shapes the 9 views draw', () => {
    const s = run(0xb12a7);
    expect(s.sensory.length).toBe(9);
    expect(s.hidden.length).toBe(6);
    expect(s.output.length).toBe(7);
    expect(s.scores.length).toBe(7);
    expect(s.policy.length).toBe(7);
    expect(s.policyRegret.length).toBe(7);
    expect(s.policyRegret.every(Number.isFinite)).toBe(true);
    expect(s.policy.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
      true,
    );
    expect(s.policy.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    expect(s.policyTemperature).toBeGreaterThan(0);
    expect(s.regretMix).toBeGreaterThanOrEqual(0);
    expect(s.regretMix).toBeLessThanOrEqual(1);
    expect(['softmax', 'regret-positive', 'regret-uniform']).toContain(s.selectionMode);
    expect(s.regret.length).toBe(7);
    expect(s.dims).toEqual({ in: 9, hid: 6, out: 7 });
    // TinyMLP.weightCount(9,6,7) = 6*(9+1) + 7*(6+1) = 60 + 49.
    expect(s.weights.length).toBe(109);
    expect(s.neuralSemanticInputs).toBe(true);
    expect(s.lastAction).toBeGreaterThanOrEqual(0);
    expect(s.lastAction).toBeLessThan(7);
    expect(s.mood).toBeGreaterThanOrEqual(-1);
    expect(s.mood).toBeLessThanOrEqual(1);
    expect(s.facts).toBeGreaterThanOrEqual(0);
    expect(s.facts).toBeLessThanOrEqual(15);
    expect(s.rivalCount).toBeGreaterThanOrEqual(1); // met faction 2
  });

  test('same seed → bit-identical snapshot (two observers, one mind)', () => {
    expect(run(7)).toEqual(run(7));
  });

  test('a different seed diverges (the snapshot is sensitive, not vacuous)', () => {
    expect(run(1)).not.toEqual(run(2));
  });
});
