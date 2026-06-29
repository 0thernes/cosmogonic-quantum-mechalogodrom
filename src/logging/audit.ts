/**
 * Action audit trail.
 *
 * Each recorded action lands in a bounded in-memory ring, is persisted to
 * localStorage (key `cqm.audit.v1`), and is mirrored to the server with a
 * fire-and-forget JSON POST. All browser globals are feature-guarded, so the
 * module degrades gracefully under `bun test` (no localStorage, stubbed or
 * absent fetch) — persistence and POSTs simply become no-ops.
 */
import type { AuditEntry } from '../types';

/** localStorage key. Versioned so future shape changes can re-key cleanly. */
const STORAGE_KEY = 'cqm.audit.v1';

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

/** Narrow one persisted blob to an AuditEntry; null when malformed. */
function toEntry(v: unknown): AuditEntry | null {
  if (!isRecord(v) || typeof v.action !== 'string' || typeof v.ts !== 'number') {
    return null;
  }
  return isRecord(v.detail)
    ? { ts: v.ts, action: v.action, detail: v.detail }
    : { ts: v.ts, action: v.action };
}

/**
 * Bounded audit ring with localStorage persistence and best-effort server
 * mirroring. Construct once in the composition root and share via
 * `SimContext.audit`.
 */
export class AuditTrail {
  private readonly endpoint: string;
  private readonly max: number;
  private readonly buf: AuditEntry[] = [];
  /** When set (by World after boot), sim audit timestamps use the tick counter — not wall clock. */
  private simClock: (() => number) | null = null;

  /**
   * @param opts.endpoint POST target for the server mirror (default `/api/audit`).
   * @param opts.max Ring capacity (default 200, clamped to ≥ 1).
   */
  constructor(opts?: { endpoint?: string; max?: number }) {
    this.endpoint = opts?.endpoint ?? '/api/audit';
    this.max = Math.max(1, Math.floor(opts?.max ?? 200));
    this.restore();
  }

  /**
   * Bind a deterministic sim tick source (typically `() => state.frame`). Boot events recorded
   * before World construction still use wall clock; all in-sim actions use the sim clock.
   */
  setSimClock(clock: () => number): void {
    this.simClock = clock;
  }

  private timestamp(): number {
    const t = this.simClock?.();
    return typeof t === 'number' && Number.isFinite(t) ? t : Date.now();
  }

  /**
   * Record one action. Appends to the ring (evicting the oldest past `max`),
   * persists the ring to localStorage, and fire-and-forget POSTs the single
   * entry as JSON. O(1) — the persistence write is bounded by the constant
   * ring cap. Rejections are swallowed; the POST is skipped entirely when
   * fetch is unavailable.
   */
  record(action: string, detail?: Record<string, unknown>): void {
    const ts = this.timestamp();
    const entry: AuditEntry = detail === undefined ? { ts, action } : { ts, action, detail };
    this.buf.push(entry);
    if (this.buf.length > this.max) {
      this.buf.splice(0, this.buf.length - this.max);
    }
    this.persist();
    this.post(entry);
  }

  /**
   * Live read-only view of the ring, oldest → newest. O(1) — no copy; the
   * array mutates in place on the next record(), so snapshot with `.slice()`
   * if you need to retain it.
   */
  entries(): readonly AuditEntry[] {
    return this.buf;
  }

  /** Load the persisted ring; missing, corrupt, or malformed data is ignored. */
  private restore(): void {
    const store = storageOrNull();
    if (!store) {
      return;
    }
    let raw: string | null;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (raw === null) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) {
      return;
    }
    for (const blob of parsed) {
      const entry = toEntry(blob);
      if (entry) {
        this.buf.push(entry);
      }
    }
    if (this.buf.length > this.max) {
      this.buf.splice(0, this.buf.length - this.max);
    }
  }

  /** Persist the whole ring (≤ `max` entries) to localStorage; failures are non-fatal. */
  private persist(): void {
    const store = storageOrNull();
    if (!store) {
      return;
    }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(this.buf));
    } catch {
      // Quota exceeded / private mode — the in-memory ring stays authoritative.
    }
  }

  /** Fire-and-forget POST of a single entry; every failure mode is swallowed. */
  private post(entry: AuditEntry): void {
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      void fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Server mirror is best-effort; network errors must never surface.
      });
    } catch {
      // Synchronous fetch failures (e.g. relative URL outside a browser) are non-fatal too.
    }
  }
}
