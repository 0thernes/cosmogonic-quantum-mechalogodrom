/**
 * Worker cores for the organism social field (ADR 0019).
 *
 * At the end of every update the entity manager packs a snapshot of the population; a pool splits
 * the organisms into equal ranges and asks one worker per range to answer them while the main
 * thread renders and runs the next update. Two updates later {@link SocialScanExecutor.collect}
 * finds the answers in the field — or reports that they are not all back, and the main thread
 * computes the identical answers itself. Because every range is a pure function of the same
 * snapshot, a pool changes how fast the world runs, never what happens in it: seeded runs stay
 * reproducible with any number of cores, or none.
 *
 * Two pools, one contract:
 * - {@link SocialScanPool} (phase 1) copies the snapshot to each core by structured clone and copies
 *   the answers back from reply messages. It works on any page, but replies arrive only when the main
 *   thread yields.
 * - {@link SharedSocialScanPool} (phase 2, cross-origin isolated pages) backs the field with
 *   SharedArrayBuffers. Cores read the snapshot in place, write answers in place and count
 *   completion with `Atomics`, so nothing is copied and nothing waits for the main thread to yield.
 *
 * Safety: a core holds at most two snapshots (so queues can never pile up behind a slow core), every
 * message crossing the boundary is shape-checked, and any worker error retires the pool so the main
 * thread simply takes over.
 */
import {
  SHARED_FREE,
  SHARED_MAX_BOUND,
  SHARED_QUEUED,
  SHARED_RUNNING,
  copySocialInputs,
  isSharedSocialField,
  isSocialScanOutputs,
  sharedWord,
  writeSocialOutputs,
  type SocialFieldBuffers,
  type SocialFieldParams,
  type SocialScanExecutor,
  type SocialScanJob,
  type SocialScanOutputs,
  type SocialSharedInit,
  type SocialSharedJob,
} from '../sim/social-field';
import type { SocialScanReply } from '../workers/social-field-worker';

/** Minimal worker surface the pool needs (a real Worker, or a test double). */
export interface SocialWorkerLike {
  postMessage(message: SocialScanJob | SocialSharedInit | SocialSharedJob): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** Live receipt of what the pool has done (shown in the perf HUD). */
export interface SocialScanPoolStats {
  readonly workers: number;
  readonly dispatched: number;
  readonly served: number;
  readonly late: number;
  readonly skippedBusy: number;
  readonly retired: boolean;
  /** True for the shared-memory pool (phase 2). */
  readonly shared: boolean;
}

/** A social-field pool as the composition root holds it. */
export interface SocialScanCores extends SocialScanExecutor {
  stats(): SocialScanPoolStats;
  dispose(): void;
}

/**
 * HUD text for the social field: `3 cores · 96% off-thread` (`3 cores · shared memory · …` on the
 * phase-2 pool), or `main thread` when no worker cores run. `offloadShare` is the share of recent
 * frames the cores answered (NaN = no recent frames).
 */
export function formatSocialCompute(workers: number, offloadShare: number, shared = false): string {
  if (workers <= 0) return 'main thread';
  const share = Number.isFinite(offloadShare)
    ? ` · ${Math.round(offloadShare * 100)}% off-thread`
    : '';
  return `${workers} cores${shared ? ' · shared memory' : ''}${share}`;
}

/** Worker count for the social field: leave one core for the main thread, cap at 8. */
export function socialWorkerCount(hardwareConcurrency: number | undefined): number {
  const cores = Math.floor(hardwareConcurrency ?? 1);
  return Number.isFinite(cores) && cores > 2 ? Math.min(8, cores - 1) : 0;
}

/** Snapshots a core may hold at once: the one being answered and the next (two-update pipeline). */
const MAX_IN_FLIGHT = 2;

interface PendingScan {
  readonly ranges: readonly (readonly [number, number])[];
  readonly outputs: (SocialScanOutputs | null)[];
  received: number;
}

export class SocialScanPool implements SocialScanCores {
  private readonly workers: SocialWorkerLike[];
  /** Jobs posted to each worker and not yet answered (workers answer in FIFO order). */
  private readonly inFlight: number[];
  private readonly pending = new Map<number, PendingScan>();
  private retired = false;
  private counts = { dispatched: 0, served: 0, late: 0, skippedBusy: 0 };

  constructor(count: number, spawn: () => SocialWorkerLike) {
    this.workers = [];
    this.inFlight = [];
    for (let w = 0; w < count; w++) {
      const worker = spawn();
      const slot = w;
      worker.onmessage = (event) => this.onReply(slot, event.data);
      worker.onerror = () => this.retire();
      this.workers.push(worker);
      this.inFlight.push(0);
    }
  }

  dispatch(f: SocialFieldBuffers, p: SocialFieldParams, ticket: number): void {
    const w = this.workers.length;
    if (this.retired || w === 0 || f.n === 0) return;
    if (this.inFlight.some((k) => k >= MAX_IN_FLIGHT)) {
      this.counts.skippedBusy++;
      return;
    }
    const inputs = copySocialInputs(f, p);
    const n = f.n;
    const ranges: [number, number][] = [];
    for (let k = 0; k < w; k++) {
      const from = Math.floor((n * k) / w);
      const to = Math.floor((n * (k + 1)) / w);
      ranges.push([from, to]);
      this.inFlight[k]!++;
      // Structured clone copies the snapshot per worker, so main-thread repacking is always safe.
      this.workers[k]!.postMessage({ ticket, from, to, params: p, inputs });
    }
    this.pending.set(ticket, { ranges, outputs: ranges.map(() => null), received: 0 });
    this.counts.dispatched++;
  }

  collect(f: SocialFieldBuffers, ticket: number): boolean {
    const scan = this.pending.get(ticket);
    // Anything older than this ticket can never be collected now: drop it (late replies ignored).
    for (const t of this.pending.keys()) if (t <= ticket) this.pending.delete(t);
    if (this.retired || scan === undefined || scan.received < scan.ranges.length) {
      if (!this.retired && this.workers.length > 0) this.counts.late++;
      return false;
    }
    for (let k = 0; k < scan.ranges.length; k++)
      writeSocialOutputs(f, scan.ranges[k]![0], scan.outputs[k]!);
    this.counts.served++;
    return true;
  }

  stats(): SocialScanPoolStats {
    return {
      workers: this.retired ? 0 : this.workers.length,
      ...this.counts,
      retired: this.retired,
      shared: false,
    };
  }

  dispose(): void {
    this.retire();
  }

  private onReply(slot: number, value: unknown): void {
    if (this.inFlight[slot]! > 0) this.inFlight[slot]!--;
    if (this.retired) return;
    const reply = value as Partial<SocialScanReply> | null;
    const scan = typeof reply?.ticket === 'number' ? this.pending.get(reply.ticket) : undefined;
    if (!reply || scan === undefined) return; // abandoned ticket: the core is simply free again
    const range = scan.ranges[slot]!;
    if (reply.ok !== true || reply.from !== range[0] || reply.to !== range[1]) {
      this.retire();
      return;
    }
    if (!isSocialScanOutputs(reply.out, range[1] - range[0])) {
      this.retire();
      return;
    }
    if (scan.outputs[slot] === null) {
      scan.outputs[slot] = reply.out;
      scan.received++;
    }
  }

  private retire(): void {
    if (this.retired) return;
    this.retired = true;
    this.pending.clear();
    for (const w of this.workers) {
      w.onmessage = null;
      w.onerror = null;
      w.terminate();
    }
  }
}

/** Main-thread view of one shared field: the id its cores know it by, its control block, its ticket. */
interface SharedFieldState {
  readonly id: number;
  /** One word per range (ticket and phase), then the completion counter. */
  readonly control: Int32Array;
  /** Ticket dispatched on this field and not yet collected (0 = none). */
  ticket: number;
}

/**
 * Phase 2: the social field in shared memory. The owner allocates fields with {@link makeBuffer},
 * so cores read each snapshot where it was packed and write their answers straight into it.
 * {@link collect} reads the completion counter instead of waiting for messages, so answers count
 * even if the main thread never yielded. Cores never reply; a message from one means a malformed
 * job, and like a worker error it retires the pool.
 *
 * The owner must call {@link reclaim} before writing into a field: it takes back every range no
 * core has started, and returns false if a late core is still writing there. Nothing on the main
 * thread ever waits for a core.
 */
export class SharedSocialScanPool implements SocialScanCores {
  private readonly workers: SocialWorkerLike[] = [];
  /** Jobs posted to each core; its progress counter says how many it has consumed. */
  private readonly posted: number[] = [];
  private readonly progress: Int32Array;
  /** Field ids each core holds, oldest first — mirrors the core's own binding order. */
  private readonly bound: number[][] = [];
  private readonly fields = new WeakMap<SocialFieldBuffers, SharedFieldState>();
  private fieldSeq = 0;
  private retired = false;
  private counts = { dispatched: 0, served: 0, late: 0, skippedBusy: 0 };

  constructor(count: number, spawn: () => SocialWorkerLike) {
    this.progress = new Int32Array(new SharedArrayBuffer(4 * Math.max(1, count)));
    for (let w = 0; w < count; w++) {
      const worker = spawn();
      worker.onmessage = () => this.retire();
      worker.onerror = () => this.retire();
      worker.postMessage({ kind: 'shared-init', core: w, progress: this.progress });
      this.workers.push(worker);
      this.posted.push(0);
      this.bound.push([]);
    }
  }

  makeBuffer(bytes: number): ArrayBufferLike {
    return new SharedArrayBuffer(bytes);
  }

  reclaim(f: SocialFieldBuffers): boolean {
    const s = this.fields.get(f);
    if (s === undefined) return this.retired || isSharedSocialField(f);
    return this.takeBack(s);
  }

  dispatch(f: SocialFieldBuffers, p: SocialFieldParams, ticket: number): void {
    const w = this.workers.length;
    if (this.retired || w === 0 || f.n === 0) return;
    for (let k = 0; k < w; k++) {
      if (this.posted[k]! - Atomics.load(this.progress, k) >= MAX_IN_FLIGHT) {
        this.counts.skippedBusy++;
        return;
      }
    }
    const s = this.stateOf(f);
    // The owner reclaims before packing, so a core can never still be running here; if one is
    // (or the field is not shared memory), answer nothing rather than race it.
    if (s === null || !this.takeBack(s)) return;
    const control = s.control;
    Atomics.store(control, w, 0);
    for (let k = 0; k < w; k++) Atomics.store(control, k, sharedWord(ticket, SHARED_QUEUED));
    s.ticket = ticket;
    const n = f.n;
    for (let k = 0; k < w; k++) {
      const job: SocialSharedJob = {
        kind: 'shared',
        ticket,
        field: s.id,
        range: k,
        from: Math.floor((n * k) / w),
        to: Math.floor((n * (k + 1)) / w),
        n,
        params: p,
      };
      const held = this.bound[k]!;
      if (!held.includes(s.id)) {
        job.bind = { field: f, control };
        held.push(s.id);
        if (held.length > SHARED_MAX_BOUND) held.shift();
      }
      this.posted[k]!++;
      this.workers[k]!.postMessage(job);
    }
    this.counts.dispatched++;
  }

  collect(f: SocialFieldBuffers, ticket: number): boolean {
    const s = this.fields.get(f);
    const w = this.workers.length;
    if (this.retired || w === 0) return false;
    if (s === undefined || s.ticket !== ticket) {
      this.counts.late++;
      return false;
    }
    s.ticket = 0;
    // Every range DONE: each core published with an atomic add after its last write, so this load
    // also makes every answer visible to this thread.
    if (Atomics.load(s.control, w) === w) {
      this.counts.served++;
      return true;
    }
    this.takeBack(s); // ranges no core started are cancelled; the owner answers them itself
    this.counts.late++;
    return false;
  }

  stats(): SocialScanPoolStats {
    return {
      workers: this.retired ? 0 : this.workers.length,
      ...this.counts,
      retired: this.retired,
      shared: true,
    };
  }

  dispose(): void {
    this.retire();
  }

  /** The field's main-thread state, registering it on first use; null if it is not shared memory. */
  private stateOf(f: SocialFieldBuffers): SharedFieldState | null {
    let s = this.fields.get(f);
    if (s === undefined) {
      if (!isSharedSocialField(f)) return null;
      const words = this.workers.length + 1;
      s = {
        id: ++this.fieldSeq,
        control: new Int32Array(new SharedArrayBuffer(4 * words)),
        ticket: 0,
      };
      this.fields.set(f, s);
    }
    return s;
  }

  /**
   * Cancel every range of the field that no core has started (QUEUED → FREE). Returns true when no
   * core is writing into the field any more, i.e. every range is FREE or DONE.
   */
  private takeBack(s: SharedFieldState): boolean {
    const c = s.control;
    let idle = true;
    for (let k = 0; k < c.length - 1; k++) {
      let word = Atomics.load(c, k);
      if ((word & 3) === SHARED_QUEUED) {
        const seen = Atomics.compareExchange(c, k, word, (word & ~3) | SHARED_FREE);
        if (seen === word) continue;
        word = seen; // a core claimed (or finished) it first
      }
      if ((word & 3) === SHARED_RUNNING) idle = false;
    }
    return idle;
  }

  private retire(): void {
    if (this.retired) return;
    this.retired = true;
    for (const w of this.workers) {
      w.onmessage = null;
      w.onerror = null;
      w.terminate();
    }
  }
}

/** Start the social-field cores: shared memory when the page can share it, else copies. */
export function createSocialScanPool(
  count: number,
  spawn: () => SocialWorkerLike,
  shared: boolean,
): SocialScanCores {
  return shared ? new SharedSocialScanPool(count, spawn) : new SocialScanPool(count, spawn);
}

/** Whether this page can use the shared-memory pool (cross-origin isolated, SharedArrayBuffer). */
export function canShareSocialField(scope: {
  crossOriginIsolated?: boolean;
  SharedArrayBuffer?: unknown;
}): boolean {
  return scope.crossOriginIsolated === true && typeof scope.SharedArrayBuffer === 'function';
}
