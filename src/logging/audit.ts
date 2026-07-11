/**
 * Action audit trail.
 *
 * Each recorded action lands in a bounded in-memory ring, is persisted to
 * localStorage (key `cqm.audit.v1`), and is best-effort mirrored to the server
 * with a rate-shaped fire-and-forget JSON POST. All browser globals are feature-guarded, so the
 * module degrades gracefully under `bun test` (no localStorage, stubbed or
 * absent fetch) — persistence and POSTs simply become no-ops.
 */
import type { AuditEntry } from '../types';
import { serverApiAvailable } from '../core/host-mode';

/** localStorage key. Versioned so future shape changes can re-key cleanly. */
const STORAGE_KEY = 'cqm.audit.v1';

/** Default number of audit entries retained by one trail. */
const DEFAULT_MAX = 200;

/** Hard ceiling for caller-configured audit retention. */
const MAX_CONFIGURED_ENTRIES = 1_000;

/**
 * Keep the optional server mirror comfortably below the server's per-client 60-request burst.
 * The authoritative local ring never sheds entries; only redundant remote copies may be skipped.
 */
const SERVER_MIRROR_BURST = 24;
const SERVER_MIRROR_REFILL_PER_MS = 10 / 1_000;

/** Normalize an optional capacity to a finite integer inside the documented resource ceiling. */
function normalizedMax(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX;
  return Math.min(MAX_CONFIGURED_ENTRIES, Math.max(1, Math.floor(value)));
}

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
  /** Client-side token bucket for the optional server mirror; local retention is unaffected. */
  private mirrorTokens = SERVER_MIRROR_BURST;
  private mirrorLastRefillMs = Date.now();

  /**
   * @param opts.endpoint POST target for the server mirror (default `/api/audit`).
   * @param opts.max Ring capacity (default 200, clamped to ≥ 1).
   */
  constructor(opts?: { endpoint?: string; max?: number }) {
    this.endpoint = opts?.endpoint ?? '/api/audit';
    this.max = normalizedMax(opts?.max);
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
   * persists the ring to localStorage, and may fire-and-forget POST the single
   * entry as JSON. O(1) — the persistence write is bounded by the constant
   * ring cap. Rejections are swallowed; the optional POST is skipped when
   * fetch is unavailable or when accelerated automatic events consume the
   * mirror budget.
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
    // Validate only the newest retainable window. A corrupt/old oversized array must not make boot
    // walk thousands of entries that will be discarded immediately afterward.
    const start = Math.max(0, parsed.length - this.max);
    for (let i = start; i < parsed.length; i++) {
      const blob = parsed[i];
      const entry = toEntry(blob);
      if (entry) {
        this.buf.push(entry);
      }
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

  /** Consume one token for the redundant server mirror without affecting local retention. */
  private takeMirrorToken(): boolean {
    const now = Date.now();
    const elapsed = Math.max(0, now - this.mirrorLastRefillMs);
    this.mirrorLastRefillMs = now;
    this.mirrorTokens = Math.min(
      SERVER_MIRROR_BURST,
      this.mirrorTokens + elapsed * SERVER_MIRROR_REFILL_PER_MS,
    );
    if (this.mirrorTokens < 1) {
      return false;
    }
    this.mirrorTokens -= 1;
    return true;
  }

  /** Rate-shaped fire-and-forget POST of a single entry; every failure mode is swallowed. */
  private post(entry: AuditEntry): void {
    const unavailableDefaultMirror = !serverApiAvailable() && this.endpoint === '/api/audit';
    if (unavailableDefaultMirror || typeof fetch !== 'function' || !this.takeMirrorToken()) {
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
