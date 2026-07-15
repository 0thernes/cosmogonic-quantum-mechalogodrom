/**
 * Tests for the NHI action orchestrator (src/sim/nhi-system.ts). A mock NhiWorld lets us assert,
 * with no DOM/three.js, that the system: ticks every live NHI's mind, applies the resulting intent,
 * forgets the dead, is deterministic given a seed, and renders alien utterances.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  NHI_SYSTEM_MIND_CAP,
  NhiSystem,
  renderUtterance,
  validateNhiActionOutcome,
  type NhiActionOutcome,
  type NhiSystemStateSnapshot,
  type NhiWorld,
} from '../src/sim/nhi-system';
import { NhiAction, type NhiIntent, type NhiPercept } from '../src/sim/nhi';

function successfulOutcome(intent: NhiIntent): NhiActionOutcome {
  const factSupported =
    intent.action === NhiAction.SPAWN_SWARM ||
    intent.action === NhiAction.MANIPULATE ||
    intent.action === NhiAction.DOMINATE ||
    intent.action === NhiAction.HUNT;
  return {
    effectApplied: true,
    factSupported,
    affected: intent.action === NhiAction.BROADCAST ? 0 : intent.action === NhiAction.HUNT ? 2 : 1,
    energyTransferred: intent.action === NhiAction.HUNT ? 1 : 0,
  };
}

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
      return successfulOutcome(intent);
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
  test('validates action-aware body counts, spawn support, and HUNT conservation receipts', () => {
    expect(
      validateNhiActionOutcome(NhiAction.BROADCAST, {
        effectApplied: true,
        factSupported: false,
        affected: 0,
        energyTransferred: 0,
      }),
    ).toEqual({
      effectApplied: true,
      factSupported: false,
      affected: 0,
      energyTransferred: 0,
    });
    expect(() =>
      validateNhiActionOutcome(NhiAction.BROADCAST, {
        effectApplied: true,
        factSupported: false,
        affected: 1,
        energyTransferred: 0,
      }),
    ).toThrow(/BROADCAST/);
    expect(() =>
      validateNhiActionOutcome(NhiAction.RETREAT, {
        effectApplied: true,
        factSupported: false,
        affected: 0,
        energyTransferred: 0,
      }),
    ).toThrow(/at least one affected body/);
    expect(() =>
      validateNhiActionOutcome(NhiAction.SPAWN_SWARM, {
        effectApplied: true,
        factSupported: false,
        affected: 1,
        energyTransferred: 0,
      }),
    ).toThrow(/SPAWN fact support/);
    expect(() =>
      validateNhiActionOutcome(NhiAction.HUNT, {
        effectApplied: true,
        factSupported: true,
        affected: 1,
        energyTransferred: 1,
      }),
    ).toThrow(/both changed bodies/);
    expect(() =>
      validateNhiActionOutcome(NhiAction.MIMIC, {
        effectApplied: true,
        factSupported: false,
        affected: 2,
        energyTransferred: 0,
      }),
    ).toThrow(/single-body action/);
  });

  test('registers minds and reports count', () => {
    const sys = new NhiSystem();
    expect(() => sys.register(-1, mulberry32(0))).toThrow(/non-negative safe integer/);
    expect(() => sys.register(Number.NaN, mulberry32(0))).toThrow(/non-negative safe integer/);
    sys.register(5, mulberry32(1));
    sys.register(9, mulberry32(2));
    sys.register(5, mulberry32(3)); // idempotent per id
    expect(sys.count).toBe(2);
    expect(Number.isFinite(sys.moodOf(5) ?? Number.NaN)).toBe(true);
    expect(sys.moodOf(999)).toBe(null);
    expect(sys.unregister(5)).toBe(true);
    expect(sys.unregister(5)).toBe(false);
    expect(sys.ids()).toEqual([9]);
    expect(() => sys.unregister(-1)).toThrow(/non-negative safe integer/);
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

  test('isolates a reported per-mind apply fault, advances the beat, and does not starve later minds', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1, 2]));
    world.apply = (id, intent, text) => {
      if (id === 1) throw new Error('injected apply fault');
      world.applied.push({ id, intent, text });
      return successfulOutcome(intent);
    };
    const failures: Array<{ id: number | null; beat: number; phase: string; message: string }> = [];
    const returned = sys.tick(mulberry32(99), world, (failure) => {
      failures.push({
        id: failure.id,
        beat: failure.beat,
        phase: failure.phase,
        message: failure.error instanceof Error ? failure.error.message : String(failure.error),
      });
    });
    expect(failures).toEqual([{ id: 1, beat: 0, phase: 'apply', message: 'injected apply fault' }]);
    expect(returned).toHaveLength(1);
    expect(world.applied.map(({ id }) => id)).toEqual([2]);
    expect(sys.stateSnapshot().beat).toBe(1);
    expect(sys.count).toBe(2);
  });

  test('a throwing diagnostic callback is retained without starving minds or suppressing the beat', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1, 2]));
    world.apply = (id, intent, text) => {
      if (id === 1) throw new Error('material fault');
      world.applied.push({ id, intent, text });
      return successfulOutcome(intent);
    };
    const failures = sys.tick(mulberry32(99), world, () => {
      throw new Error('reporter fault');
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.phase).toBe('apply');
    expect(failures[0]?.reportingError).toBeInstanceOf(Error);
    expect(world.applied.map(({ id }) => id)).toEqual([2]);
    expect(sys.stateSnapshot().beat).toBe(1);
  });

  test('rejects a contradictory structured outcome without starving a later mind', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1, 2]));
    world.apply = (id, intent, text) => {
      world.applied.push({ id, intent, text });
      return id === 1
        ? { effectApplied: false, factSupported: false, affected: 1, energyTransferred: 0 }
        : successfulOutcome(intent);
    };
    const failures = sys.tick(mulberry32(99), world, () => undefined);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.id).toBe(1);
    expect(failures[0]?.phase).toBe('apply');
    expect(failures[0]?.error).toBeInstanceOf(Error);
    expect(world.applied.map(({ id }) => id)).toEqual([1, 2]);
    expect(sys.stateSnapshot().beat).toBe(1);
  });

  test('rejects action-invalid fact support and energy transfer combinations', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    const world = mockWorld(new Set([1]));
    world.apply = (id, intent, text) => {
      world.applied.push({ id, intent, text });
      return {
        effectApplied: true,
        factSupported: true,
        affected: 1,
        // HUNT support without transfer is invalid; transfer on every other action is invalid.
        energyTransferred: intent.action === NhiAction.HUNT ? 0 : 1,
      };
    };
    const failures = sys.tick(mulberry32(99), world, () => undefined);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.phase).toBe('apply');
    expect(failures[0]?.error).toBeInstanceOf(Error);
    expect(sys.snapshot(1)?.facts).toBe(0);
  });

  test('reports failed live-id discovery and still runs every registered mind behind its boundary', () => {
    const sys = new NhiSystem();
    sys.register(1, mulberry32(10));
    sys.register(2, mulberry32(20));
    const world = mockWorld(new Set([1, 2]));
    world.liveIds = () => {
      throw new Error('injected lifecycle failure');
    };
    const failures = sys.tick(mulberry32(99), world, () => undefined);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ id: null, beat: 0, phase: 'lifecycle' });
    expect(world.applied.map(({ id }) => id)).toEqual([1, 2]);
    expect(sys.count).toBe(2);
    expect(sys.stateSnapshot().beat).toBe(1);
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

  test('JSON state restores exact multi-mind continuation with matched caller-owned RNG state', () => {
    const source = new NhiSystem();
    source.register(9, mulberry32(90));
    source.register(2, mulberry32(20));
    source.register(5, mulberry32(50));
    const preludeWorld = mockWorld(new Set([2, 5, 9]));
    const preludeRng = mulberry32(0x51a7e);
    for (let beat = 0; beat < 12; beat++) source.tick(preludeRng, preludeWorld);

    const encoded = JSON.stringify(source.stateSnapshot());
    const restored = NhiSystem.fromState(JSON.parse(encoded) as NhiSystemStateSnapshot);
    expect(JSON.stringify(restored.stateSnapshot())).toBe(encoded);
    expect(restored.ids()).toEqual([2, 5, 9]);

    const sourceRng = mulberry32(0xc0171e);
    const restoredRng = mulberry32(0xc0171e);
    for (let beat = 0; beat < 24; beat++) {
      const sourceWorld = mockWorld(new Set([2, 5, 9]));
      const restoredWorld = mockWorld(new Set([2, 5, 9]));
      source.tick(sourceRng, sourceWorld);
      restored.tick(restoredRng, restoredWorld);
      expect(restoredWorld.applied).toEqual(sourceWorld.applied);
      expect(restored.stateSnapshot()).toEqual(source.stateSnapshot());
    }
  });

  test('OWNER cap seal: the launched-NHI ceiling is exactly 1000', () => {
    // Owner 2026-07-15: "NHI CAP should be 1000 maximum. it's at 32!!!!" — sealed so it cannot
    // silently regress; the composition root derives its live cap from this constant.
    expect(NHI_SYSTEM_MIND_CAP).toBe(1000);
  });

  test('state round-trips the full runtime mind cap', () => {
    const source = new NhiSystem();
    for (let id = 0; id < NHI_SYSTEM_MIND_CAP; id++) {
      source.register(id, mulberry32(0x1000 + id));
    }
    source.tick(mulberry32(0x3200), mockWorld(new Set(source.ids())));
    const state = source.stateSnapshot();
    const restored = NhiSystem.fromState(state);
    expect(restored.count).toBe(NHI_SYSTEM_MIND_CAP);
    expect(restored.stateSnapshot()).toEqual(state);
    expect(() => source.register(NHI_SYSTEM_MIND_CAP, mulberry32(0xbad))).toThrow(/mind cap/);

    const overCap = structuredClone(state) as NhiSystemStateSnapshot & {
      minds: Array<{ id: number; state: (typeof state.minds)[number]['state'] }>;
    };
    overCap.minds.push({
      id: NHI_SYSTEM_MIND_CAP,
      state: structuredClone(state.minds[0]!.state),
    });
    const before = source.stateSnapshot();
    expect(() => source.restoreState(overCap)).toThrow(/mind cap/);
    expect(source.stateSnapshot()).toEqual(before);
  });

  test('malformed population restore is atomic', () => {
    const source = new NhiSystem();
    source.register(1, mulberry32(11));
    source.register(2, mulberry32(22));
    source.tick(mulberry32(33), mockWorld(new Set([1, 2])));
    const before = JSON.stringify(source.stateSnapshot());
    const forged = structuredClone(source.stateSnapshot()) as NhiSystemStateSnapshot & {
      minds: Array<{ id: number }>;
    };
    forged.minds[1]!.id = forged.minds[0]!.id;
    expect(() => source.restoreState(forged)).toThrow(/uniquely sorted/);
    expect(JSON.stringify(source.stateSnapshot())).toBe(before);
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
      return { effectApplied: true, factSupported: false, affected: 1, energyTransferred: 0 };
    };
    sys.tick(mulberry32(0x101), failed);
    expect(sys.snapshot(1)?.facts).toBe(0);

    const succeeded = mockWorld(new Set([1]));
    sys.tick(mulberry32(0x102), succeeded);
    const action = succeeded.applied[0]?.intent.action;
    const expectedBit = action === undefined ? 0 : ([2, 0, 1, 0, 0, 8, 0][action] ?? 0);
    expect(sys.snapshot(1)?.facts).toBe(expectedBit);
  });
});
