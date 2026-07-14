/**
 * Versioned localStorage persistence for cross-session preferences.
 *
 * `load()` validates and migrates whatever it finds; any missing, corrupt, or
 * unrecognized payload yields `null` (never a throw), so the composition root
 * can always fall back to `defaults()`. Browser globals are feature-guarded —
 * under `bun test` without a localStorage shim, load/save become no-ops.
 */
import type { PersistedState, PersistedStateV1 } from '../types';
import type {
  EdibleResourcePersistenceEntryV1,
  EdibleResourcePersistenceSnapshotV1,
} from '../sim/edible-resource';

/** Default localStorage key for the persisted state blob. */
const DEFAULT_KEY = 'cqm.state';
const DEFAULT_BIG_TREE_ECOLOGY_KEY = 'cqm.big-tree-ecology.v1';
const BIG_TREE_RESPAWN_MAX_SECONDS = 5;

/**
 * Deliberately narrow application checkpoint. The surrounding cosmos still starts fresh on reload;
 * only pooled Big Tree food generations and remaining respawn time cross the boundary. Active actor,
 * visit, slot, partner, and cooldown state is excluded.
 */
export interface BigTreeEcologyPersistenceSnapshotV1 {
  readonly version: 1;
  readonly food: EdibleResourcePersistenceSnapshotV1;
}

export type BigTreeEcologyPersistenceSnapshot = BigTreeEcologyPersistenceSnapshotV1;

/**
 * Resolve localStorage at call time (test shims patch `globalThis` after
 * module load); null when unavailable or when access itself throws (some
 * browsers raise SecurityError with storage disabled).
 */
function storageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Narrow an unknown JSON value to a plain object. */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Narrow to a finite number (rejects NaN, ±Infinity, and non-numbers). */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Narrow to a non-negative safe integer — the only shape valid for array
 * indices and monotonic counters. Rejects floats, negatives, NaN, ±Infinity,
 * and float-integers at or beyond 2^53 (Number.isSafeInteger).
 */
function isIndexLike(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}

/**
 * Validate a version-1 payload field by field; null when any field is off.
 *
 * Tamper policy — REJECT, not normalize: songIdx/algoIdx/viewIdx/weatherIdx/
 * sessions must already be non-negative safe integers; a tampered-but-typed
 * blob (1.5, -1, 2^53, 1e308…) discards the WHOLE payload so the caller falls
 * back to a coherent `defaults()` rather than a half-sanitized state. The one
 * exception stays: `seed` accepts any finite number and keeps its uint32
 * normalization (`>>> 0`), because every finite input maps deterministically
 * to a valid seed.
 */
function validateV1(r: Record<string, unknown>): PersistedStateV1 | null {
  const { seed, songIdx, algoIdx, viewIdx, weatherIdx, sfxOn, sessions } = r;
  if (
    !isFiniteNumber(seed) ||
    !isIndexLike(songIdx) ||
    !isIndexLike(algoIdx) ||
    !isIndexLike(viewIdx) ||
    !isIndexLike(weatherIdx) ||
    typeof sfxOn !== 'boolean' ||
    !isIndexLike(sessions)
  ) {
    return null;
  }
  // `sim` (CONTRACTS V7.6) is ADDITIVE: a pre-V7.6 blob lacks it and loads as GENESIS (1);
  // if present it must be exactly 1 or 2 (tamper policy — reject anything else).
  const sim = r.sim === undefined ? 1 : r.sim;
  if (sim !== 1 && sim !== 2) {
    return null;
  }
  // Additive persisted fields: musicOn, renderIdx, tier. Absence is allowed;
  // presence with wrong type rejects the whole blob (tamper policy).
  if (r.musicOn !== undefined && typeof r.musicOn !== 'boolean') return null;
  if (r.renderIdx !== undefined && !isIndexLike(r.renderIdx)) return null;
  if (r.tier !== undefined && typeof r.tier !== 'string') return null;
  // Rebuilt field by field: strips unknown keys and normalizes seed to uint32.
  const out: PersistedStateV1 = {
    version: 1,
    seed: seed >>> 0,
    songIdx,
    algoIdx,
    viewIdx,
    weatherIdx,
    sfxOn,
    sessions,
    sim,
  };
  if (r.musicOn !== undefined) out.musicOn = r.musicOn;
  if (r.renderIdx !== undefined) out.renderIdx = r.renderIdx;
  if (r.tier !== undefined) out.tier = r.tier;
  return out;
}

/**
 * Versioned migration stub. Version 1 passes validation as-is; unknown or
 * future versions are discarded (null) rather than guessed at. When version 2
 * lands, add its upgrade path here.
 */
function migrate(parsed: unknown): PersistedState | null {
  if (!isRecord(parsed)) {
    return null;
  }
  if (parsed.version === 1) {
    return validateV1(parsed);
  }
  return null;
}

/** Validate the isolated ecology key without importing simulation runtime code into this leaf. */
function validateBigTreeEcology(parsed: unknown): BigTreeEcologyPersistenceSnapshotV1 | null {
  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.food)) return null;
  const food = parsed.food;
  if (food.version !== 1 || !isIndexLike(food.capacity) || !Array.isArray(food.entries))
    return null;
  if (food.entries.length > food.capacity) return null;

  const entries: EdibleResourcePersistenceEntryV1[] = [];
  const ids = new Set<number>();
  for (const candidate of food.entries) {
    if (!isRecord(candidate)) return null;
    const { id, generation, remainingRespawn } = candidate;
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      typeof generation !== 'number' ||
      !Number.isSafeInteger(generation) ||
      generation < 1 ||
      ids.has(id) ||
      (remainingRespawn !== null &&
        (!isFiniteNumber(remainingRespawn) ||
          remainingRespawn < 0 ||
          remainingRespawn > BIG_TREE_RESPAWN_MAX_SECONDS))
    ) {
      return null;
    }
    ids.add(id);
    entries.push({
      id,
      generation,
      remainingRespawn: remainingRespawn as number | null,
    });
  }
  return {
    version: 1,
    food: { version: 1, capacity: food.capacity, entries },
  };
}

/** Cross-session preference store. Construct once in the composition root. */
export class MemoryStore {
  private readonly key: string;
  private readonly bigTreeEcologyKey: string;

  /**
   * @param key preference key (default `'cqm.state'`)
   * @param bigTreeEcologyKey isolated food checkpoint key (default `'cqm.big-tree-ecology.v1'`)
   */
  constructor(key: string = DEFAULT_KEY, bigTreeEcologyKey: string = DEFAULT_BIG_TREE_ECOLOGY_KEY) {
    this.key = key;
    this.bigTreeEcologyKey = bigTreeEcologyKey;
  }

  /**
   * Versioned load with migration. Returns null on missing key, unparseable
   * JSON, unknown version, or invalid field types — never throws, so a
   * corrupted blob can never brick boot.
   */
  load(): PersistedState | null {
    const store = storageOrNull();
    if (!store) {
      return null;
    }
    let raw: string | null;
    try {
      raw = store.getItem(this.key);
    } catch {
      return null;
    }
    if (raw === null) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    return migrate(parsed);
  }

  /** Persist the state as JSON; quota or storage failures are swallowed. */
  save(s: PersistedState): void {
    const store = storageOrNull();
    if (!store) {
      return;
    }
    try {
      store.setItem(this.key, JSON.stringify(s));
    } catch {
      // Quota exceeded / private mode — preferences just won't survive reload.
    }
  }

  /** Load the isolated Big Tree food checkpoint; corrupt/unknown payloads are ignored, never thrown. */
  loadBigTreeEcology(): BigTreeEcologyPersistenceSnapshot | null {
    const store = storageOrNull();
    if (!store) return null;
    let raw: string | null;
    try {
      raw = store.getItem(this.bigTreeEcologyKey);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      return validateBigTreeEcology(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Persist only primitive food lifecycle state; false means a later lifecycle flush should retry. */
  saveBigTreeEcology(snapshot: BigTreeEcologyPersistenceSnapshot): boolean {
    const store = storageOrNull();
    if (!store) return false;
    try {
      store.setItem(this.bigTreeEcologyKey, JSON.stringify(snapshot));
      return true;
    } catch {
      // Quota exceeded / private mode — retain the dirty revision so a later flush can retry.
      return false;
    }
  }

  /** Genesis/reset boundary: prevent a pre-reset depletion checkpoint from returning on reload. */
  clearBigTreeEcology(): boolean {
    const store = storageOrNull();
    if (!store) return false;
    try {
      store.removeItem(this.bigTreeEcologyKey);
      return true;
    } catch {
      // Storage access is optional; a failed clear cannot break the running simulation.
      return false;
    }
  }

  /**
   * Fresh version-1 state. The seed XORs a constant with the boot-time
   * microsecond clock — varied per boot, yet reproducible once persisted.
   * Booleans/indices mirror the legacy boot state (lines 166/172/179:
   * sound off, all cycles at 0).
   */
  defaults(): PersistedState {
    return {
      version: 1,
      seed: (0xc05a06 ^ ((performance.now() * 1000) | 0)) >>> 0,
      songIdx: 0,
      algoIdx: 0,
      viewIdx: 0,
      weatherIdx: 0,
      sfxOn: false,
      sessions: 0,
      sim: 1,
      musicOn: false,
      renderIdx: 0,
    };
  }
}
