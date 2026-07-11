/**
 * Tests for the NHI action orchestrator (src/sim/nhi-system.ts). A mock NhiWorld lets us assert,
 * with no DOM/three.js, that the system: ticks every live NHI's mind, applies the resulting intent,
 * forgets the dead, is deterministic given a seed, and renders alien utterances.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { NhiSystem, renderUtterance, type NhiWorld } from '../src/sim/nhi-system';
import type { NhiIntent, NhiPercept } from '../src/sim/nhi';

/** A recording mock world. `alive` controls which ids are live; every apply() is logged. */
function mockWorld(
  alive: Set<number>,
): NhiWorld & { applied: { id: number; intent: NhiIntent; text: string }[] } {
  const applied: { id: number; intent: NhiIntent; text: string }[] = [];
  return {
    applied,
    liveIds: () => [...alive],
    percept: (): Omit<NhiPercept, 'beat'> => ({
      energy: 0.6,
      crowding: 0.4,
      chaos: 0.3,
      threat: 0.2,
      rivalFaction: 1,
      rivalLastMove: 1,
    }),
    apply: (id, intent, text) => {
      applied.push({ id, intent, text });
      return true;
    },
  };
}

describe('renderUtterance', () => {
  test('maps glyphs to an uppercase alien string', () => {
    expect(renderUtterance([0, 1, 2])).toBe('XATHUURRL');
    expect(renderUtterance([])).toBe('');
  });
  test('clamps out-of-range glyphs without throwing', () => {
    expect(renderUtterance([99, -1]).length).toBeGreaterThan(0);
  });
});

describe('NhiSystem', () => {
  test('registers minds and reports count', () => {
    const sys = new NhiSystem();
    sys.register(5, mulberry32(1));
    sys.register(9, mulberry32(2));
    sys.register(5, mulberry32(3)); // idempotent per id
    expect(sys.count).toBe(2);
    expect(Number.isFinite(sys.moodOf(5) ?? Number.NaN)).toBe(true);
    expect(sys.moodOf(999)).toBe(null);
  });

  test('ticks every live NHI and applies one intent each', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1, 2]));
    sys.tick(mulberry32(99), world);
    expect(world.applied.length).toBe(2);
    expect(world.applied.map((a) => a.id).sort()).toEqual([1, 2]);
    for (const a of world.applied) {
      expect(a.intent.action).toBeGreaterThanOrEqual(0);
      expect(a.intent.action).toBeLessThan(7);
      expect(typeof a.text).toBe('string');
    }
  });

  test('forgets NHIs that have died', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1])); // 2 has died
    sys.tick(mulberry32(99), world);
    expect(sys.count).toBe(1);
    expect(world.applied.map((a) => a.id)).toEqual([1]);
  });

  test('clear synchronously forgets every mind and permits a deterministic fresh population', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    sys.tick(mulberry32(99), mockWorld(new Set([1, 2])));
    sys.clear();
    expect(sys.count).toBe(0);
    expect(sys.ids()).toEqual([]);
    expect(sys.snapshot(1)).toBe(null);

    sys.register(7, mulberry32(77));
    const fresh = new NhiSystem();
    fresh.register(7, mulberry32(77));
    const a = mockWorld(new Set([7]));
    const b = mockWorld(new Set([7]));
    sys.tick(mulberry32(88), a);
    fresh.tick(mulberry32(88), b);
    expect(a.applied).toEqual(b.applied); // clear reset the orchestration beat as well as the map
  });

  test('is deterministic: same seeds ⇒ identical applied stream', () => {
    const run = (): string => {
      const sys = new NhiSystem();
      sys.register(1, mulberry32(7));
      sys.register(2, mulberry32(8));
      const world = mockWorld(new Set([1, 2]));
      const rng = mulberry32(1234);
      for (let b = 0; b < 20; b++) sys.tick(rng, world);
      return world.applied
        .map((a) => `${a.id}:${a.intent.action}:${a.intent.spawn}:${a.text}`)
        .join('|');
    };
    expect(run()).toBe(run());
  });

  test('feeds material apply acknowledgement back into the mind world model', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(0xacc));
    const failed = mockWorld(new Set([1]));
    failed.apply = (id, intent, text) => {
      failed.applied.push({ id, intent, text });
      return false;
    };
    sys.tick(mulberry32(0x101), failed);
    expect(sys.snapshot(1)?.facts).toBe(0);

    const succeeded = mockWorld(new Set([1]));
    sys.tick(mulberry32(0x102), succeeded);
    const action = succeeded.applied[0]?.intent.action;
    const expectedBit = action === undefined ? 0 : ([2, 4, 1, 0, 0, 8, 0][action] ?? 0);
    expect(sys.snapshot(1)?.facts).toBe(expectedBit);
  });
});
