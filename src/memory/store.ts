/**
 * Versioned localStorage persistence for cross-session preferences.
 *
 * `load()` validates and migrates whatever it finds; any missing, corrupt, or
 * unrecognized payload yields `null` (never a throw), so the composition root
 * can always fall back to `defaults()`. Browser globals are feature-guarded —
 * under `bun test` without a localStorage shim, load/save become no-ops.
 */
import type { PersistedState, PersistedStateV1 } from '../types';

/** Default localStorage key for the persisted state blob. */
const DEFAULT_KEY = 'cqm.state';

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

/** Validate a version-1 payload field by field; null when any field is off. */
function validateV1(r: Record<string, unknown>): PersistedStateV1 | null {
  const { seed, songIdx, algoIdx, viewIdx, weatherIdx, sfxOn, sessions } = r;
  if (
    !isFiniteNumber(seed) ||
    !isFiniteNumber(songIdx) ||
    !isFiniteNumber(algoIdx) ||
    !isFiniteNumber(viewIdx) ||
    !isFiniteNumber(weatherIdx) ||
    typeof sfxOn !== 'boolean' ||
    !isFiniteNumber(sessions)
  ) {
    return null;
  }
  // Rebuilt field by field: strips unknown keys and normalizes seed to uint32.
  return { version: 1, seed: seed >>> 0, songIdx, algoIdx, viewIdx, weatherIdx, sfxOn, sessions };
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

/** Cross-session preference store. Construct once in the composition root. */
export class MemoryStore {
  private readonly key: string;

  /** @param key localStorage key (default `'cqm.state'`). */
  constructor(key: string = DEFAULT_KEY) {
    this.key = key;
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
    };
  }
}
