/**
 * Social-field worker: answers one range of a packed social snapshot off the main thread.
 *
 * Two protocols, chosen by the pool (ADR 0019):
 * - Copy (phase 1): receives a {@link SocialScanJob} (a copied snapshot plus an organism range), runs
 *   the pure {@link scanSocialRange} kernel and transfers the range's answers back. Result space is
 *   allocated once and reused.
 * - Shared memory (phase 2): after a {@link SocialSharedInit}, receives {@link SocialSharedJob}s that
 *   name a field in SharedArrayBuffers. It claims the range atomically, scans it in place and
 *   publishes completion with `Atomics` — no reply. It posts a message only to report a malformed
 *   job, which retires the pool.
 *
 * Either way the kernel reads only the snapshot, so the answers are bit-identical to a main-thread
 * scan — this worker can make the world faster, never different.
 */
import {
  isSocialScanJob,
  isSocialSharedInit,
  isSocialSharedJob,
  runSocialScanJob,
  runSocialSharedJob,
  socialOutputBuffers,
  type SocialFieldBuffers,
  type SocialScanOutputs,
  type SocialSharedCore,
} from '../sim/social-field';

/** Reply envelope: the job's ticket and range, and its answers (or ok=false). */
export interface SocialScanReply {
  ticket: number;
  from: number;
  to: number;
  ok: boolean;
  out?: SocialScanOutputs;
}

const workerSelf = self as unknown as {
  postMessage(message: SocialScanReply, transfer?: Transferable[]): void;
};

let scratch: SocialFieldBuffers | null = null;
let shared: SocialSharedCore | null = null;

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event: MessageEvent<unknown>) => {
    if (event.origin !== '' && event.origin !== self.origin) return;
    const job = event.data;
    if (isSocialSharedInit(job)) {
      shared = { core: job.core, progress: job.progress, bound: new Map() };
      return;
    }
    if (isSocialSharedJob(job)) {
      let outcome = 'invalid';
      try {
        if (shared !== null) outcome = runSocialSharedJob(shared, job);
      } catch {
        outcome = 'invalid';
      }
      if (outcome === 'invalid')
        workerSelf.postMessage({ ticket: job.ticket, from: job.from, to: job.to, ok: false });
      return;
    }
    if (!isSocialScanJob(job)) {
      workerSelf.postMessage({ ticket: -1, from: 0, to: 0, ok: false });
      return;
    }
    try {
      const run = runSocialScanJob(job, scratch);
      scratch = run.scratch;
      workerSelf.postMessage(
        { ticket: job.ticket, from: job.from, to: job.to, ok: true, out: run.out },
        socialOutputBuffers(run.out),
      );
    } catch {
      workerSelf.postMessage({ ticket: job.ticket, from: job.from, to: job.to, ok: false });
    }
  };
}
