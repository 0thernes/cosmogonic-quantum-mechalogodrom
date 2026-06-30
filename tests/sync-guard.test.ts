/**
 * SYNC-GUARD policy — the pure {@link decide} function that decides how to make a checkout
 * COMMITTED + PUSHED + SYNCED with origin/main without ever destroying work. Falsifiable claims:
 * - importing the script runs NO git (the IO is `import.meta.main`-gated);
 * - every state maps to the correct safe plan (push-ahead / ff-pull / rebase-diverged / preserve);
 * - SAFETY INVARIANT: a force-reset is NEVER planned without first preserving to a recovery ref, and
 *   a stuck rebase/merge is never auto-resolved without --force.
 */
import { describe, expect, test } from 'bun:test';
import { decide, type SyncFlags, type SyncState } from '../scripts/sync-guard';

const S = (o: Partial<SyncState> = {}): SyncState => ({
  detached: false,
  op: 'none',
  dirty: 0,
  ahead: 0,
  behind: 0,
  reachable: true,
  ...o,
});
const F = (o: Partial<SyncFlags> = {}): SyncFlags => ({
  commit: false,
  force: false,
  rebase: false,
  ...o,
});

describe('sync-guard decide() — safe sync policy', () => {
  test('offline → no-op, nothing touched', () => {
    const p = decide(S({ reachable: false, behind: 9, ahead: 9 }), F());
    expect(p.noop).toBe(true);
    expect(p.push || p.ffPull || p.preserve || p.forceReset).toBe(false);
    expect(p.status).toContain('offline');
  });

  test('already in sync → no-op', () => {
    const p = decide(S(), F());
    expect(p.noop).toBe(true);
    expect(p.push).toBe(false);
    expect(p.ffPull).toBe(false);
  });

  test('clean + local-ahead → push, no ff', () => {
    const p = decide(S({ ahead: 3 }), F());
    expect(p.push).toBe(true);
    expect(p.ffPull).toBe(false);
    expect(p.preserve).toBe(false);
  });

  test('clean + behind → fast-forward, no push', () => {
    const p = decide(S({ behind: 2 }), F());
    expect(p.ffPull).toBe(true);
    expect(p.push).toBe(false);
  });

  test('behind + dirty (no --commit) → does NOT ff over a dirty tree', () => {
    const p = decide(S({ behind: 2, dirty: 4 }), F());
    expect(p.ffPull).toBe(false);
    expect(p.commit).toBe(false);
    expect(p.status).toContain('uncommitted');
  });

  test('ahead + dirty (no --commit) → still pushes the committed-ahead, leaves edits', () => {
    const p = decide(S({ ahead: 2, dirty: 4 }), F());
    expect(p.push).toBe(true);
    expect(p.commit).toBe(false);
    expect(p.noop).toBe(false);
  });

  test('dirty + --commit while BEHIND → commit then REBASE (never a structurally-impossible ff)', () => {
    const p = decide(S({ dirty: 5, behind: 1 }), F({ commit: true }));
    expect(p.commit).toBe(true);
    expect(p.rebasePush).toBe(true);
    expect(p.preserve).toBe(true);
    expect(p.ffPull).toBe(false);
    expect(p.push).toBe(false);
  });

  test('dirty + --commit while EVEN → commit then push (no rebase needed)', () => {
    const p = decide(S({ dirty: 5, behind: 0 }), F({ commit: true }));
    expect(p.commit).toBe(true);
    expect(p.push).toBe(true);
    expect(p.rebasePush).toBe(false);
    expect(p.ffPull).toBe(false);
  });

  test('DIVERGED + clean, no flags → preserve + report (no auto-rebase, honors the ff-only contract)', () => {
    const p = decide(S({ ahead: 2, behind: 3 }), F());
    expect(p.preserve).toBe(true);
    expect(p.rebasePush).toBe(false);
    expect(p.forceReset).toBe(false);
  });

  test('DIVERGED + clean + --rebase → preserve first, then rebase-and-push', () => {
    const p = decide(S({ ahead: 2, behind: 3 }), F({ rebase: true }));
    expect(p.preserve).toBe(true);
    expect(p.rebasePush).toBe(true);
    expect(p.forceReset).toBe(false);
  });

  test('DIVERGED + dirty (no --commit) → preserve + report, no auto-rebase', () => {
    const p = decide(S({ ahead: 2, behind: 3, dirty: 1 }), F());
    expect(p.preserve).toBe(true);
    expect(p.rebasePush).toBe(false);
  });

  test('DIVERGED + --force → preserve + force-reset', () => {
    const p = decide(S({ ahead: 2, behind: 3 }), F({ force: true }));
    expect(p.preserve).toBe(true);
    expect(p.forceReset).toBe(true);
  });

  test('stuck rebase (no --force) → preserve, hand back to human (no auto-resolve)', () => {
    const p = decide(S({ op: 'rebase', dirty: 3 }), F());
    expect(p.preserve).toBe(true);
    expect(p.forceReset).toBe(false);
    expect(p.rebasePush).toBe(false);
    expect(p.status).toContain('stuck rebase');
  });

  test('stuck rebase + --force → preserve + force-reset', () => {
    const p = decide(S({ op: 'rebase', dirty: 3 }), F({ force: true }));
    expect(p.preserve).toBe(true);
    expect(p.forceReset).toBe(true);
  });

  test('stuck merge → preserve + report', () => {
    const p = decide(S({ op: 'merge' }), F());
    expect(p.preserve).toBe(true);
    expect(p.status).toContain('stuck merge');
  });

  test('SAFETY INVARIANT: across the whole state matrix, force-reset ⇒ preserve, and a stuck op is never auto-resolved without --force', () => {
    for (const reachable of [true, false]) {
      for (const op of ['none', 'rebase', 'merge'] as const) {
        for (const dirty of [0, 3]) {
          for (const ahead of [0, 2]) {
            for (const behind of [0, 2]) {
              for (const commit of [true, false]) {
                for (const force of [true, false]) {
                  for (const rebase of [true, false]) {
                    const p = decide(
                      S({ reachable, op, dirty, ahead, behind }),
                      F({ commit, force, rebase }),
                    );
                    if (p.forceReset) expect(p.preserve).toBe(true); // never reset without a backup
                    if (op !== 'none' && !force) expect(p.forceReset).toBe(false); // no silent clobber
                    if (!reachable) expect(p.noop).toBe(true); // offline never acts
                    expect(p.push && p.ffPull).toBe(false); // never both — that would imply divergence
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});
