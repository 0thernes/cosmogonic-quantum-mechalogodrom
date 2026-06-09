import { beforeEach, describe, expect, test } from 'bun:test';
import { MemoryStore } from '../src/memory/store';
import type { PersistedState } from '../src/types';

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

const KEY = 'test.cqm.state';

const sample: PersistedState = {
  version: 1,
  seed: 123456,
  songIdx: 2,
  algoIdx: 3,
  viewIdx: 1,
  weatherIdx: 4,
  sfxOn: true,
  sessions: 7,
};

describe('MemoryStore', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  test('defaults() is a valid version-1 state with a uint32 seed', () => {
    const d = new MemoryStore(KEY).defaults();
    expect(d.version).toBe(1);
    expect(Number.isInteger(d.seed)).toBe(true);
    expect(d.seed).toBeGreaterThanOrEqual(0);
    expect(d.seed).toBeLessThanOrEqual(0xffffffff);
    expect(d.songIdx).toBe(0);
    expect(d.algoIdx).toBe(0);
    expect(d.viewIdx).toBe(0);
    expect(d.weatherIdx).toBe(0);
    expect(d.sfxOn).toBe(false);
    expect(d.sessions).toBe(0);
  });

  test('round-trips a saved state', () => {
    const store = new MemoryStore(KEY);
    store.save(sample);
    expect(store.load()).toEqual(sample);
  });

  test('persists across instances sharing a key', () => {
    new MemoryStore(KEY).save(sample);
    expect(new MemoryStore(KEY).load()).toEqual(sample);
  });

  test('load() returns null when nothing was saved', () => {
    expect(new MemoryStore(KEY).load()).toBeNull();
  });

  test('load() returns null on corrupt JSON without throwing', () => {
    localStorage.setItem(KEY, '{definitely not json');
    const store = new MemoryStore(KEY);
    expect(() => store.load()).not.toThrow();
    expect(store.load()).toBeNull();
  });

  test('load() returns null on valid JSON that is not an object', () => {
    for (const raw of ['42', '"hello"', 'null', 'true', '[1,2,3]']) {
      localStorage.setItem(KEY, raw);
      expect(new MemoryStore(KEY).load()).toBeNull();
    }
  });

  test('migration stub: unknown or missing versions are discarded', () => {
    const store = new MemoryStore(KEY);
    localStorage.setItem(KEY, JSON.stringify({ ...sample, version: 2 }));
    expect(store.load()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ ...sample, version: '1' }));
    expect(store.load()).toBeNull();
    const versionless: Record<string, unknown> = { ...sample };
    delete versionless.version;
    localStorage.setItem(KEY, JSON.stringify(versionless));
    expect(store.load()).toBeNull();
  });

  test('load() rejects v1 payloads with invalid field types', () => {
    const store = new MemoryStore(KEY);
    const bad: ReadonlyArray<Record<string, unknown>> = [
      { ...sample, seed: 'abc' },
      { ...sample, songIdx: Number.NaN },
      { ...sample, weatherIdx: Number.POSITIVE_INFINITY },
      { ...sample, sfxOn: 'yes' },
      { ...sample, sessions: undefined },
    ];
    for (const payload of bad) {
      localStorage.setItem(KEY, JSON.stringify(payload));
      expect(store.load()).toBeNull();
    }
  });

  test('load() normalizes seed to uint32 and strips unknown keys', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...sample, seed: -1, legacyCruft: true }));
    const loaded = new MemoryStore(KEY).load();
    expect(loaded).toEqual({ ...sample, seed: 0xffffffff });
    expect(loaded && 'legacyCruft' in loaded).toBe(false);
  });

  test('never throws when storage itself throws', () => {
    const real = globalThis.localStorage;
    const hostile = {
      getItem: (): string | null => {
        throw new Error('denied');
      },
      setItem: (): void => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    (globalThis as { localStorage?: Storage }).localStorage = hostile;
    try {
      const store = new MemoryStore(KEY);
      expect(store.load()).toBeNull();
      expect(() => store.save(sample)).not.toThrow();
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = real;
    }
  });

  test('degrades to no-op when localStorage is absent', () => {
    const real = globalThis.localStorage;
    delete (globalThis as { localStorage?: Storage }).localStorage;
    try {
      const store = new MemoryStore(KEY);
      expect(store.load()).toBeNull();
      expect(() => store.save(sample)).not.toThrow();
      expect(store.defaults().version).toBe(1);
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = real;
    }
  });
});
