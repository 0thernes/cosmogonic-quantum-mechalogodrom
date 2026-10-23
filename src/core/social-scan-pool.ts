/**
 * Worker cores for the organism social field (ADR 0019).
 *
 * At the end of every update the entity manager packs a snapshot of the population; this pool splits
 * the organisms into equal ranges and asks one worker per range to answer them while the main
 * thread renders and runs the next update. Two updates later {@link collect} copies the answers in —
 * or reports that they are not all back, and the main thread computes the identical answers itself. Because every range
 * is a pure function of the same snapshot, the pool changes how fast the world runs, never what
 * happens in it: seeded runs stay reproducible with any number of cores, or none.
 *
 * Safety: a core holds at most two snapshots (so queues can never pile up behind a slow core), a
 * reply is accepted only for a ticket still pending and its exact assigned range, every reply's shape
 * is validated, and any worker error retires the pool so the main thread simply takes over.
 */
import {
  copySocialInputs,
  isSocialScanOutputs,
  writeSocialOutputs,
  type SocialFieldBuffers,
  type SocialFieldParams,
  type SocialScanExecutor,
  type SocialScanJob,
  type SocialScanOutputs,
} from '../sim/social-field';
import type { SocialScanReply } from '../workers/social-field-worker';

/** Minimal worker surface the pool needs (a real Worker, or a test double). */
export interface SocialWorkerLike {
  postMessage(message: SocialScanJob): void;
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
}

/**
 * HUD text for the social field: `3 cores · 96% off-thread`, or `main thread` when no worker cores
 * run. `offloadShare` is the share of recent frames the cores answered (NaN = no recent frames).
 */
export function formatSocialCompute(workers: number, offloadShare: number): string {
  if (workers <= 0) return 'main thread';
  const share = Number.isFinite(offloadShare)
    ? ` · ${Math.round(offloadShare * 100)}% off-thread`
    : '';
  return `${workers} cores${share}`;
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

export class SocialScanPool implements SocialScanExecutor {
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
