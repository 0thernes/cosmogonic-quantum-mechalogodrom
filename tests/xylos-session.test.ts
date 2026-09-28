import { describe, expect, test } from 'bun:test';
import { XylosSession, XYLOS_RECORDING_CAPACITY } from '../src/core/xylos-session';
import type { XylosPercept } from '../src/sim/xylos-mind';

const input: XylosPercept = {
  nutrient: 0.7,
  hazard: 0.2,
  signal: 0.3,
  gradientX: 0.1,
  gradientZ: -0.2,
};
const idle = (): void => {};

describe('Xylos entropy and experiment boundary', () => {
  test('seeded sessions match exactly and never call the live entropy source', () => {
    let draws = 0;
    const a = new XylosSession(42, 'seeded', () => {
      draws++;
      return 0.8;
    });
    const b = new XylosSession(42, 'seeded');
    for (let i = 0; i < 90; i++) {
      a.tick(input);
      b.tick(input);
    }
    expect(a.view).toEqual(b.view);
    expect(draws).toBe(0);
  });

  test('live samples change a same-seed trajectory', () => {
    const a = new XylosSession(42, 'live', () => 0.9);
    const b = new XylosSession(42, 'live', () => -0.9);
    for (let i = 0; i < 90; i++) {
      a.tick(input);
      b.tick(input);
    }
    expect(a.view.activity).not.toEqual(b.view.activity);
    expect(a.status.source).toBe('browser entropy');
  });

  test('a complete live experiment replays exactly including changing senses and learned weights', () => {
    let draws = 0;
    const session = new XylosSession(74, 'live', () => Math.sin(++draws));
    session.startRecording();
    for (let i = 0; i < 250; i++) session.tick({ ...input, nutrient: (i % 17) / 17 });
    const expected = structuredClone(session.view);
    session.replay();
    for (let i = 0; i < 250; i++) session.tick({ ...input, nutrient: 0 });
    expect(session.view).toEqual(expected);
    expect(draws).toBe(250);
    expect(session.status.replayStep).toBe(250);
    expect(session.tick(input)).toBe(false);
    expect(session.view).toEqual(expected);
  });

  test('replay suppresses both world sensing and effects, while live cognition couples every step', () => {
    const session = new XylosSession(3, 'seeded');
    let reads = 0;
    let writes = 0;
    const sense = (_view: unknown, p: XylosPercept): void => {
      reads++;
      Object.assign(p, input);
    };
    const effect = (): void => {
      writes++;
    };
    session.startRecording();
    session.advance(0.2, sense, effect);
    expect([reads, writes]).toEqual([4, 4]);
    session.replay();
    session.advance(0.2, sense, effect);
    expect([reads, writes]).toEqual([4, 4]);
  });

  test('pause consumes no entropy, input, effects or fractional-time debt', () => {
    const session = new XylosSession(3, 'live', () => {
      throw new Error('must not run');
    });
    const before = structuredClone(session.view);
    session.advance(
      0,
      () => {
        throw new Error('must not sense');
      },
      idle,
    );
    expect(session.view).toEqual(before);
    expect(session.status.error).toBeNull();
  });

  test('fixed-step partitioning preserves the same trajectory', () => {
    const a = new XylosSession(4, 'seeded');
    const b = new XylosSession(4, 'seeded');
    const sense = (_view: unknown, p: XylosPercept): void => {
      Object.assign(p, input);
    };
    for (let i = 0; i < 120; i++) a.advance(1 / 60, sense, idle);
    for (let i = 0; i < 40; i++) b.advance(0.05, sense, idle);
    expect(a.view).toEqual(b.view);
  });

  test('catch-up is capped, discarded ticks counted, and invalid dt rejected', () => {
    const session = new XylosSession(5, 'seeded');
    session.advance(1, (_view, p) => Object.assign(p, input), idle);
    expect(session.view.tick).toBe(4);
    expect(session.status.droppedSteps).toBe(16);
    for (const dt of [NaN, Infinity, -1]) expect(() => session.advance(dt, idle, idle)).toThrow();
    expect(session.view.tick).toBe(4);
    session.advance(Number.MAX_VALUE, idle, idle);
    expect(session.status.droppedSteps).toBe(Number.MAX_SAFE_INTEGER);
    expect(session.view.tick).toBe(8);
  });

  test('entropy failure is visible, seeded, and does not retry every tick', () => {
    let draws = 0;
    const session = new XylosSession(6, 'live', () => {
      draws++;
      throw new Error('unavailable');
    });
    const seeded = new XylosSession(6, 'seeded');
    for (let i = 0; i < 5; i++) {
      session.tick(input);
      seeded.tick(input);
    }
    expect(session.view).toEqual(seeded.view);
    expect(session.status.source).toBe('seeded fallback');
    expect(session.status.error).toContain('unavailable');
    expect(draws).toBe(1);
    session.setMode('live');
    session.tick(input);
    expect(draws).toBe(2);
  });

  test('invalid senses leave brain, recording and entropy cursor untouched', () => {
    let draws = 0;
    const session = new XylosSession(7, 'live', () => {
      draws++;
      return 0;
    });
    session.startRecording();
    const before = structuredClone(session.view);
    for (const bad of [NaN, Infinity, -0.1, 1.1]) {
      expect(() => session.tick({ ...input, nutrient: bad })).toThrow();
    }
    expect(session.view).toEqual(before);
    expect(session.status.recordedSteps).toBe(0);
    expect(draws).toBe(0);
    const sense = (_view: unknown, p: XylosPercept): void => {
      Object.assign(p, input);
    };
    session.advance(0.025, sense, idle);
    expect(() =>
      session.advance(
        0.025,
        (_view, p) => {
          Object.assign(p, input, { nutrient: NaN });
        },
        idle,
      ),
    ).toThrow();
    session.advance(0.025, sense, idle);
    expect(session.view.tick).toBe(1);
  });

  test('full recording stops at its cap while life continues', () => {
    const session = new XylosSession(8, 'seeded');
    session.startRecording();
    for (let i = 0; i < XYLOS_RECORDING_CAPACITY + 3; i++) session.tick(input);
    expect(session.status.recording).toBe(false);
    expect(session.status.recordedSteps).toBe(XYLOS_RECORDING_CAPACITY);
    expect(session.view.tick).toBe(XYLOS_RECORDING_CAPACITY + 3);
  });

  test('recording can restart and mode changes leave replay without losing the tape', () => {
    const session = new XylosSession(9, 'seeded');
    expect(() => session.replay()).toThrow();
    session.startRecording();
    session.tick(input);
    session.replay();
    session.setMode('seeded');
    session.tick(input);
    expect(session.status.recordedSteps).toBe(1);
    session.replay();
    session.startRecording();
    expect(session.status.mode).toBe('seeded');
    expect(session.status.recordedSteps).toBe(0);
    expect(session.view.tick).toBe(0);
  });
});
