import { describe, expect, test } from 'bun:test';
import { Mortality } from '../src/sim/mortality';

// Deterministic LCG so the test never touches Math.random (banned in sim logic).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('Mortality — finitude without NaN', () => {
  test('over-reproduction floors lifespan at 1 and never corrupts metrics', () => {
    const m = new Mortality(lcg(7), {
      baseLifespan: 1000,
      reproductionAge: 0,
      reproductionCost: 100,
    });
    for (let i = 0; i < 5; i++) m.step();
    // 20 reproductions at cost 100 would drive lifespan to ~ -1000 without the floor.
    for (let i = 0; i < 20; i++) expect(m.reproduce()).toBe(true);

    expect(m.currentState.lifespan).toBeGreaterThanOrEqual(1);
    // Progress/urgency/legacy must stay finite in [0,1] (pre-fix: NaN / negative).
    for (const v of [m.lifespanProgress, m.urgency]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(m.remainingLifespan).toBeGreaterThanOrEqual(0);

    m.die('age');
    expect(Number.isFinite(m.currentState.legacyScore)).toBe(true);
    expect(m.currentState.legacyScore).toBeGreaterThanOrEqual(0);
    expect(m.currentState.legacyScore).toBeLessThanOrEqual(1);
  });

  test('death by age is deterministic from the seeded lifespan', () => {
    const make = () => new Mortality(lcg(99), { baseLifespan: 100, lifespanVariance: 0.2 });
    const a = make();
    const b = make();
    for (let i = 0; i < 200; i++) {
      a.step();
      b.step();
    }
    expect(a.isAlive).toBe(false);
    expect(b.isAlive).toBe(false);
    expect(a.currentState.lifespan).toBe(b.currentState.lifespan);
    expect(a.currentState.causeOfDeath).toBe('age');
  });
});
