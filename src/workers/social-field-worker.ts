/**
 * Social-field worker: answers one range of a packed social snapshot off the main thread.
 *
 * Receives a {@link SocialScanJob} (a copied snapshot plus an organism range), runs the same pure
 * {@link scanSocialRange} kernel the main thread runs, and transfers the range's answers back. The
 * kernel reads only the snapshot, so the answers are bit-identical to a main-thread scan — this
 * worker can make the world faster, never different. Result space is allocated once and reused.
 */
import {
  isSocialScanJob,
  runSocialScanJob,
  socialOutputBuffers,
  type SocialFieldBuffers,
  type SocialScanOutputs,
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

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event: MessageEvent<unknown>) => {
    if (event.origin !== '' && event.origin !== self.origin) return;
    const job = event.data;
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
