/**
 * Leveled logger over a single shared ring buffer.
 *
 * Every logger created via {@link createLogger} appends into one module-level
 * 512-entry ring, so the most recent activity across all scopes can be
 * inspected with {@link getRecentLogs}. Pure ECMAScript (console only) — runs
 * identically under `bun test`, in the Bun server, and in the browser.
 */
import type { LogEntry, Logger, LogLevel } from '../types';

/** Capacity of the shared ring buffer; entries beyond this evict the oldest. */
const RING_CAPACITY = 512;

/** Shared ring storage. Append-only until full, then circular via `writeIndex`. */
const ring: LogEntry[] = [];

/** Next slot to overwrite once the ring is full (always points at the oldest entry). */
let writeIndex = 0;

/** Append one entry to the shared ring and mirror it to the console. O(1). */
function emit(level: LogLevel, scope: string, msg: string, data?: unknown): void {
  const entry: LogEntry =
    data === undefined
      ? { ts: Date.now(), level, scope, msg }
      : { ts: Date.now(), level, scope, msg, data };
  if (ring.length < RING_CAPACITY) {
    ring.push(entry);
  } else {
    ring[writeIndex] = entry;
    writeIndex = (writeIndex + 1) % RING_CAPACITY;
  }
  const line = `[${scope}] ${msg}`;
  if (data === undefined) {
    console[level](line);
  } else {
    console[level](line, data);
  }
}

/**
 * Create a logger bound to `scope` (e.g. `'server'`, `'world'`). Creation
 * allocates one object and four closures; each log call is O(1) and shares the
 * module-wide 512-entry ring with every other logger.
 */
export function createLogger(scope: string): Logger {
  return {
    debug: (msg, data) => emit('debug', scope, msg, data),
    info: (msg, data) => emit('info', scope, msg, data),
    warn: (msg, data) => emit('warn', scope, msg, data),
    error: (msg, data) => emit('error', scope, msg, data),
  };
}

/**
 * Snapshot of the shared ring, oldest → newest (at most 512 entries, all
 * scopes interleaved). Allocates a fresh array — O(n) where n ≤ 512; intended
 * for diagnostics panels and error reports, never for per-frame paths.
 */
export function getRecentLogs(): readonly LogEntry[] {
  if (ring.length < RING_CAPACITY) {
    return ring.slice();
  }
  return [...ring.slice(writeIndex), ...ring.slice(0, writeIndex)];
}
