import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { AuditTrail } from '../src/logging/audit';

/** Map-backed localStorage shim for bun (no DOM). Installed only when absent. */
function createStorageShim(): Storage {
  const map = new Map<string, string>();
  const shim = {
    get length(): number {
      return map.size;
    },
    clear: (): void => {
      map.clear();
    },
    getItem: (k: string): string | null => map.get(k) ?? null,
    key: (i: number): string | null => [...map.keys()][i] ?? null,
    removeItem: (k: string): void => {
      map.delete(k);
    },
    setItem: (k: string, v: string): void => {
      map.set(k, String(v));
    },
  };
  return shim as unknown as Storage;
}

if (typeof localStorage === 'undefined') {
  (globalThis as { localStorage?: Storage }).localStorage = createStorageShim();
}

const KEY = 'cqm.audit.v1';

interface RecordedCall {
  url: string;
  init: RequestInit | undefined;
}

const realFetch = globalThis.fetch;
let calls: RecordedCall[] = [];

/** Recording fetch stub: captures (url, init) and resolves with a 200. */
function installRecordingFetch(): void {
  calls = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return Promise.resolve(new Response('ok'));
  }) as typeof fetch;
}

/** Flush the microtask queue so swallowed rejections would surface if unhandled. */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('AuditTrail', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
    installRecordingFetch();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('ring caps at the configured max, keeping the newest entries in order', () => {
    const trail = new AuditTrail({ max: 5 });
    for (let i = 0; i < 12; i++) {
      trail.record(`a${i}`);
    }
    expect(trail.entries().map((e) => e.action)).toEqual(['a7', 'a8', 'a9', 'a10', 'a11']);
  });

  test('ring caps at 200 by default', () => {
    const trail = new AuditTrail();
    for (let i = 0; i < 205; i++) {
      trail.record(`a${i}`);
    }
    const entries = trail.entries();
    expect(entries.length).toBe(200);
    expect(entries.at(0)?.action).toBe('a5');
    expect(entries.at(-1)?.action).toBe('a204');
  });

  test('persists to localStorage and restores in a new instance', () => {
    const trail = new AuditTrail();
    trail.record('boot');
    trail.record('weather', { idx: 3 });
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(String(raw))).toHaveLength(2);

    const revived = new AuditTrail();
    expect(revived.entries().map((e) => e.action)).toEqual(['boot', 'weather']);
    expect(revived.entries().at(1)?.detail).toEqual({ idx: 3 });
  });

  test('restore trims persisted entries down to max, keeping the newest', () => {
    const persisted = Array.from({ length: 30 }, (_, i) => ({ ts: i, action: `a${i}` }));
    localStorage.setItem(KEY, JSON.stringify(persisted));
    const trail = new AuditTrail({ max: 10 });
    expect(trail.entries().length).toBe(10);
    expect(trail.entries().at(0)?.action).toBe('a20');
    expect(trail.entries().at(-1)?.action).toBe('a29');
  });

  test('corrupt persisted JSON yields an empty trail without throwing', () => {
    localStorage.setItem(KEY, '{not json at all');
    expect(() => new AuditTrail()).not.toThrow();
    expect(new AuditTrail().entries().length).toBe(0);
  });

  test('malformed persisted entries are filtered out individually', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([{ ts: 1, action: 'ok' }, { nope: true }, 42, 'junk', null]),
    );
    const trail = new AuditTrail();
    expect(trail.entries().map((e) => e.action)).toEqual(['ok']);
  });

  test('record() POSTs the single entry as JSON to the default endpoint', () => {
    const trail = new AuditTrail();
    trail.record('boom', { x: 1 });
    expect(calls.length).toBe(1);
    const call = calls.at(0);
    expect(call?.url).toBe('/api/audit');
    expect(call?.init?.method).toBe('POST');
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({
      action: 'boom',
      detail: { x: 1 },
    });
    expect(typeof JSON.parse(String(call?.init?.body)).ts).toBe('number');
  });

  test('custom endpoint is honored', () => {
    const trail = new AuditTrail({ endpoint: '/custom/audit' });
    trail.record('ping');
    expect(calls.at(0)?.url).toBe('/custom/audit');
  });

  test('rejected fetches are swallowed', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;
    const trail = new AuditTrail();
    expect(() => trail.record('doomed')).not.toThrow();
    await tick(); // an unhandled rejection here would fail the test run
    expect(trail.entries().length).toBe(1);
  });

  test('synchronously throwing fetches are swallowed', () => {
    globalThis.fetch = (() => {
      throw new Error('sync explosion');
    }) as unknown as typeof fetch;
    const trail = new AuditTrail();
    expect(() => trail.record('still fine')).not.toThrow();
    expect(trail.entries().length).toBe(1);
  });

  test('skips the POST when fetch is unavailable', () => {
    globalThis.fetch = undefined as unknown as typeof fetch;
    const trail = new AuditTrail();
    expect(() => trail.record('offline')).not.toThrow();
    expect(trail.entries().at(0)?.action).toBe('offline');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  test('degrades to memory-only when localStorage is absent', () => {
    const real = globalThis.localStorage;
    delete (globalThis as { localStorage?: Storage }).localStorage;
    try {
      const trail = new AuditTrail();
      trail.record('ephemeral');
      expect(trail.entries().map((e) => e.action)).toEqual(['ephemeral']);
      expect(calls.length).toBe(1);
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = real;
    }
  });

  test('entries() is a live view in chronological order with timestamps', () => {
    const trail = new AuditTrail();
    const view = trail.entries();
    trail.record('first');
    trail.record('second');
    expect(view.map((e) => e.action)).toEqual(['first', 'second']);
    const first = view.at(0);
    expect(typeof first?.ts).toBe('number');
    expect(first?.detail).toBeUndefined();
  });

  test('setSimClock uses the sim tick instead of wall clock for in-sim records', () => {
    const trail = new AuditTrail();
    trail.setSimClock(() => 42_000);
    trail.record('sim-action', { k: 1 });
    expect(trail.entries().at(-1)?.ts).toBe(42_000);
  });
});
