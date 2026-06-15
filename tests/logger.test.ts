/**
 * Leveled logger over the shared 512-entry ring (src/logging/logger.ts). Pins the append +
 * console-mirror contract and the load-bearing circular-eviction logic: once the ring is full,
 * `getRecentLogs()` must reconstruct the most-recent 512 entries in oldest→newest order from the
 * `writeIndex` wrap (an off-by-one-able boundary that had no test). console is spied to a no-op so
 * the eviction sweep doesn't flood the test output — and to assert each emit mirrors to console.
 */
import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { createLogger, getRecentLogs } from '../src/logging/logger';

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Level[] = ['debug', 'info', 'warn', 'error'];
const spies = new Map<Level, ReturnType<typeof spyOn>>();

beforeAll(() => {
  for (const l of LEVELS)
    spies.set(
      l,
      spyOn(console, l).mockImplementation(() => undefined),
    );
});
afterAll(() => {
  for (const s of spies.values()) s.mockRestore();
});

describe('createLogger — append + console mirror', () => {
  test('exposes the four levels and appends a well-formed entry to the ring', () => {
    const log = createLogger('unit-a');
    log.info('hello world');
    const last = getRecentLogs().at(-1);
    expect(last).toBeDefined();
    expect(last!.scope).toBe('unit-a');
    expect(last!.level).toBe('info');
    expect(last!.msg).toBe('hello world');
    expect(typeof last!.ts).toBe('number');
    expect(spies.get('info')!).toHaveBeenCalledWith('[unit-a] hello world');
  });

  test('carries the optional data payload to the ring and the console', () => {
    const log = createLogger('unit-b');
    const payload = { code: 42 };
    log.warn('with data', payload);
    const last = getRecentLogs().at(-1)!;
    expect(last.scope).toBe('unit-b');
    expect(last.level).toBe('warn');
    expect(last.data).toEqual(payload);
    expect(spies.get('warn')!).toHaveBeenCalledWith('[unit-b] with data', payload);
  });

  test('every level routes to its matching console method', () => {
    const log = createLogger('unit-c');
    for (const l of LEVELS) {
      const before = spies.get(l)!.mock.calls.length;
      log[l](`msg-${l}`);
      expect(spies.get(l)!.mock.calls.length).toBe(before + 1);
      expect(getRecentLogs().at(-1)!.level).toBe(l);
    }
  });
});

describe('getRecentLogs — order + circular eviction', () => {
  test('returns oldest → newest at the tail', () => {
    const log = createLogger('order');
    log.info('first');
    log.info('second');
    const tail = getRecentLogs().slice(-2);
    expect(tail[0]!.msg).toBe('first');
    expect(tail[1]!.msg).toBe('second');
  });

  test('evicts the oldest past 512 and preserves wrap order', () => {
    const log = createLogger('flood');
    // Push 600 (> the 512 cap) uniquely-numbered entries. Whatever the ring held before, the
    // most-recent 512 are now entirely from this set, so the window is #88..#599 in order.
    const N = 600;
    for (let i = 0; i < N; i++) log.debug(`m${i}`);
    const recent = getRecentLogs();
    expect(recent.length).toBe(512);
    expect(recent[0]!.msg).toBe(`m${N - 512}`); // oldest surviving = #88
    expect(recent.at(-1)!.msg).toBe(`m${N - 1}`); // newest = #599
    // Strictly increasing, contiguous — the wrap reconstruction kept order with no gap/dupe.
    for (let i = 1; i < recent.length; i++) {
      const prev = Number(recent[i - 1]!.msg.slice(1));
      const cur = Number(recent[i]!.msg.slice(1));
      expect(cur).toBe(prev + 1);
    }
  });
});
