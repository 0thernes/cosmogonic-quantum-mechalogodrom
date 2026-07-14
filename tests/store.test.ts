import { beforeEach, describe, expect, test } from 'bun:test';
import { MemoryStore, type BigTreeEcologyPersistenceSnapshotV1 } from '../src/memory/store';
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
const ECOLOGY_KEY = 'test.cqm.big-tree-ecology.v1';

const sample: PersistedState = {
  version: 1,
  seed: 123456,
  songIdx: 2,
  algoIdx: 3,
  viewIdx: 1,
  weatherIdx: 4,
  sfxOn: true,
  sessions: 7,
  sim: 1,
};

const ecologySample: BigTreeEcologyPersistenceSnapshotV1 = {
  version: 1,
  food: {
    version: 1,
    capacity: 3,
    entries: [
      { id: 10, generation: 4, remainingRespawn: 2.75 },
      { id: 20, generation: 2, remainingRespawn: null },
    ],
  },
};

describe('MemoryStore', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(ECOLOGY_KEY);
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

  test('round-trips the isolated primitive Big Tree food checkpoint', () => {
    const store = new MemoryStore(KEY, ECOLOGY_KEY);
    expect(store.saveBigTreeEcology(ecologySample)).toBe(true);
    expect(store.loadBigTreeEcology()).toEqual(ecologySample);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(ECOLOGY_KEY)!)).toEqual(ecologySample);

    expect(store.clearBigTreeEcology()).toBe(true);
    expect(store.loadBigTreeEcology()).toBeNull();
  });

  test('corrupt ecology data is isolated from valid preferences and rejected safely', () => {
    const store = new MemoryStore(KEY, ECOLOGY_KEY);
    store.save(sample);
    const invalid = [
      { ...ecologySample, version: 2 },
      { version: 1, food: { ...ecologySample.food, version: 2 } },
      {
        version: 1,
        food: {
          version: 1,
          capacity: 3,
          entries: [
            { id: 10, generation: 2, remainingRespawn: null },
            { id: 10, generation: 3, remainingRespawn: null },
          ],
        },
      },
      {
        version: 1,
        food: {
          version: 1,
          capacity: 3,
          entries: [{ id: 10, generation: 2, remainingRespawn: 5.001 }],
        },
      },
    ];

    for (const payload of invalid) {
      localStorage.setItem(ECOLOGY_KEY, JSON.stringify(payload));
      expect(store.loadBigTreeEcology()).toBeNull();
      expect(store.load()).toEqual(sample);
    }
    localStorage.setItem(ECOLOGY_KEY, '{bad json');
    expect(store.loadBigTreeEcology()).toBeNull();
    expect(store.load()).toEqual(sample);
  });

  test('Genesis clear removes an older checkpoint even when replacement writes are rejected', () => {
    const real = globalThis.localStorage;
    let ecologyRaw: string | null = JSON.stringify(ecologySample);
    const quotaLimited = {
      getItem: (key: string): string | null => (key === ECOLOGY_KEY ? ecologyRaw : null),
      setItem: (): void => {
        throw new Error('quota');
      },
      removeItem: (key: string): void => {
        if (key === ECOLOGY_KEY) ecologyRaw = null;
      },
    } as unknown as Storage;
    (globalThis as { localStorage?: Storage }).localStorage = quotaLimited;
    try {
      const store = new MemoryStore(KEY, ECOLOGY_KEY);
      expect(store.loadBigTreeEcology()).toEqual(ecologySample);
      expect(
        store.saveBigTreeEcology({
          ...ecologySample,
          food: { ...ecologySample.food, entries: [] },
        }),
      ).toBe(false);
      expect(store.loadBigTreeEcology()).toEqual(ecologySample);
      expect(store.clearBigTreeEcology()).toBe(true);
      expect(store.loadBigTreeEcology()).toBeNull();
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = real;
    }
  });

  test('load() returns null when nothing was saved', () => {
    expect(new MemoryStore(KEY).load()).toBeNull();
  });

  test('additive sim (V7.6): a pre-V7.6 blob without `sim` loads as GENESIS (1)', () => {
    // An old saved state has every V1 field BUT `sim`. The additive migration must accept it
    // and default sim → 1, never discarding the user's other preferences.
    const legacy: Record<string, unknown> = { ...sample };
    delete legacy['sim'];
    localStorage.setItem(KEY, JSON.stringify(legacy));
    expect(new MemoryStore(KEY).load()).toEqual({ ...sample, sim: 1 });
  });

  test('sim = 2 round-trips; a tampered sim is rejected (whole payload discarded)', () => {
    const store = new MemoryStore(KEY);
    store.save({ ...sample, sim: 2 });
    expect(store.load()).toEqual({ ...sample, sim: 2 });
    for (const bad of [0, 3, 1.5, -1, 'two', null]) {
      localStorage.setItem(KEY, JSON.stringify({ ...sample, sim: bad }));
      expect(new MemoryStore(KEY).load()).toBeNull();
    }
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

  test('load() rejects tampered-but-typed v1 blobs (non-integer or negative indices)', () => {
    const store = new MemoryStore(KEY);
    const bad: ReadonlyArray<Record<string, unknown>> = [
      { ...sample, songIdx: 1.5 },
      { ...sample, algoIdx: -1 },
      { ...sample, viewIdx: 0.999999 },
      { ...sample, weatherIdx: -0.25 },
      { ...sample, sessions: 3.14 },
      { ...sample, sessions: -7 },
    ];
    for (const payload of bad) {
      localStorage.setItem(KEY, JSON.stringify(payload));
      expect(store.load()).toBeNull();
    }
  });

  test('load() rejects tampered-but-typed v1 blobs (huge values past the safe-integer range)', () => {
    const store = new MemoryStore(KEY);
    const bad: ReadonlyArray<Record<string, unknown>> = [
      { ...sample, songIdx: 2 ** 53 },
      { ...sample, viewIdx: Number.MAX_SAFE_INTEGER + 2 },
      { ...sample, algoIdx: 1e21 },
      { ...sample, sessions: 1e308 },
    ];
    for (const payload of bad) {
      localStorage.setItem(KEY, JSON.stringify(payload));
      expect(store.load()).toBeNull();
    }
  });

  test('load() still accepts large-but-safe integer counters', () => {
    const big = { ...sample, sessions: Number.MAX_SAFE_INTEGER };
    localStorage.setItem(KEY, JSON.stringify(big));
    expect(new MemoryStore(KEY).load()).toEqual(big);
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
      expect(store.loadBigTreeEcology()).toBeNull();
      expect(store.saveBigTreeEcology(ecologySample)).toBe(false);
      expect(store.clearBigTreeEcology()).toBe(false);
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
      expect(store.loadBigTreeEcology()).toBeNull();
      expect(store.saveBigTreeEcology(ecologySample)).toBe(false);
      expect(store.clearBigTreeEcology()).toBe(false);
      expect(store.defaults().version).toBe(1);
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = real;
    }
  });
});
