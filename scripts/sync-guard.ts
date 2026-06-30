/**
 * SYNC-GUARD — guarantee the working checkout is COMMITTED, PUSHED, and SYNCED with GitHub `main`,
 * safely, from any branch or worktree. The stronger sibling of {@link ./sync-local.ts}:
 *
 *   sync-local (predev `pull`): only fast-forwards local DOWN to origin/main when clean. One direction.
 *   sync-guard (this):          also PUSHES local-ahead commits UP, reconciles a DIVERGED branch, and
 *                               safely DEFUSES the broken states that strand a primary checkout in a
 *                               fleet/worktree repo — detached HEAD, a stuck rebase/merge, a dirty tree.
 *
 * SAFE BY CONSTRUCTION — it NEVER destroys work. Every destructive/rewrite step is FAIL-CLOSED: it
 * preserves the at-risk tip to a `recovery/guard-<ts>` ref and VERIFIES that ref resolves before it
 * proceeds, and it reports honestly (non-zero exit) on any failure rather than logging false success.
 * A `--force` reset additionally snapshots any uncommitted working-tree content (via a non-destructive
 * `git stash create`) to `recovery/guard-<ts>-dirty` before aborting/resetting — `rebase --abort` and
 * `reset --hard` discard the worktree, and a commit-pointing ref alone cannot recover that.
 *  - clean + local-ahead          → `push HEAD:main`; on a non-ff race, reconcile by rebase ONLY if the
 *                                    tree is clean (a dirty tree is never autostashed out of sight).
 *  - clean + behind, no local      → `merge --ff-only origin/main` (advances even a detached HEAD).
 *  - DIVERGED                     → preserve HEAD + report; reconcile with `--rebase` (replay local on
 *                                    main, push) or `--force` (reset to main). Default touches nothing.
 *  - mid REBASE/MERGE (stuck)      → preserve the pre-op tip (ORIG_HEAD) to a recovery ref + report.
 *                                    It does NOT auto-resolve conflicts or abort a live op (use --force).
 *  - DIRTY (uncommitted)          → reports the files; does NOT auto-commit mid-edit work, UNLESS run
 *                                    with `--commit "<msg>"` (opt-in), which commits then explicitly
 *                                    pushes (rebasing first if behind) — never trusting the hook alone.
 *  - offline / no remote          → best-effort no-op.
 *
 * FLAGS:
 *   --commit "<msg>"  also commit a dirty tree (then the post-commit hook pushes it).
 *   --rebase          reconcile a DIVERGED branch: replay local commits on top of main, then push.
 *   --force           clear a stuck op / divergence by preserving to a recovery ref then HARD-RESETTING
 *                     the checkout to origin/main (the "make Local == GitHub no matter what" hammer; the
 *                     discarded state is always saved to recovery/guard-<ts> first, so it is reversible).
 *   --quiet           only print on action / problem.
 *
 * This is a build/ops utility (NOT sim logic) so it may use the clock for the recovery-ref timestamp.
 * The pure {@link decide} function carries all the policy and is unit-tested across the state matrix.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface SyncState {
  /** HEAD is not on a named branch. */
  readonly detached: boolean;
  /** An interrupted git operation is in progress. */
  readonly op: 'none' | 'rebase' | 'merge';
  /** Count of uncommitted (porcelain) entries in the working tree. */
  readonly dirty: number;
  /** Local commits not yet on origin/main. */
  readonly ahead: number;
  /** origin/main commits not yet local. */
  readonly behind: number;
  /** Whether origin/main was reachable (fetch succeeded). */
  readonly reachable: boolean;
}

export interface SyncFlags {
  readonly commit: boolean;
  readonly force: boolean;
  /** Opt-in: reconcile a DIVERGED branch by rebasing local onto main + pushing. Off by default so the
   *  guard "never rebases/resets/discards" unless explicitly asked — matching the predev sync contract. */
  readonly rebase: boolean;
}

export interface SyncPlan {
  /** Preserve the current/pre-op tip to a recovery ref before any reconciling step. */
  readonly preserve: boolean;
  /** Push local-ahead commits to origin/main. */
  readonly push: boolean;
  /** Fast-forward the checkout up to origin/main. */
  readonly ffPull: boolean;
  /** Rebase a diverged local branch onto origin/main, then push. */
  readonly rebasePush: boolean;
  /** Stage + commit the dirty tree (opt-in). */
  readonly commit: boolean;
  /** Force-reset to origin/main after preserving (the --force hammer). */
  readonly forceReset: boolean;
  /** A human-readable classification of the state. */
  readonly status: string;
  /** True when no reconciling action is needed (already in sync / offline). */
  readonly noop: boolean;
}

/**
 * Pure policy: map an observed {@link SyncState} + {@link SyncFlags} to a {@link SyncPlan}.
 * No IO — every branch is unit-testable.
 */
export function decide(s: SyncState, f: SyncFlags): SyncPlan {
  const base: SyncPlan = {
    preserve: false,
    push: false,
    ffPull: false,
    rebasePush: false,
    commit: false,
    forceReset: false,
    status: '',
    noop: false,
  };
  if (!s.reachable) {
    return { ...base, status: 'offline — origin/main unreachable; left as-is', noop: true };
  }
  // A stuck rebase/merge: preserve, then either force-reset (opt-in) or hand back to the human.
  if (s.op !== 'none') {
    if (f.force) {
      return {
        ...base,
        preserve: true,
        forceReset: true,
        status: `stuck ${s.op} — preserved + force-reset to origin/main`,
      };
    }
    return {
      ...base,
      preserve: true,
      status: `stuck ${s.op} in progress — left untouched (pre-op tip safe in git's reflog/ORIG_HEAD); resolve it, or re-run with --force`,
    };
  }
  const clean = s.dirty === 0;
  const diverged = s.ahead > 0 && s.behind > 0;

  if (diverged) {
    if (!clean && !f.commit) {
      return {
        ...base,
        preserve: true,
        status: `DIVERGED (+${s.ahead}/-${s.behind}) with a dirty tree — left untouched; commit (or --commit), then --rebase`,
      };
    }
    if (f.force) {
      return {
        ...base,
        preserve: true,
        forceReset: true,
        status: `DIVERGED (+${s.ahead}/-${s.behind}) — preserved + force-reset to origin/main`,
      };
    }
    if (f.rebase) {
      return {
        ...base,
        preserve: true,
        commit: !clean && f.commit,
        rebasePush: true,
        status: `DIVERGED (+${s.ahead}/-${s.behind}) — preserved, rebasing local onto main then pushing`,
      };
    }
    return {
      ...base,
      preserve: true,
      status: `DIVERGED (+${s.ahead}/-${s.behind}) — local commits safe at HEAD; reconcile with --rebase (replay local on main) or --force (reset to main)`,
    };
  }

  // Dirty tree, not committing: report it; still push any already-committed-ahead commits (safe).
  if (s.dirty > 0 && !f.commit) {
    return {
      ...base,
      push: s.ahead > 0,
      status: `${s.dirty} uncommitted file(s) — NOT auto-committed (pass --commit to commit+push)${s.ahead > 0 ? `; pushing ${s.ahead} committed-ahead` : ''}`,
      noop: s.ahead === 0,
    };
  }

  const willCommit = s.dirty > 0 && f.commit;
  // Committing locally while BEHIND diverges the branch, so a plain ff-pull could never advance —
  // reconcile by rebasing the (committed) local work onto main, then pushing. Preserve first.
  if (willCommit && s.behind > 0) {
    return {
      ...base,
      preserve: true,
      commit: true,
      rebasePush: true,
      status: `committed dirty tree, then rebasing onto main (-${s.behind}) and pushing`,
    };
  }

  const push = s.ahead > 0 || willCommit;
  const ffPull = s.behind > 0 && clean; // willCommit+behind handled above ⇒ ffPull is clean-only here
  if (!push && !ffPull) {
    return {
      ...base,
      status: 'already committed, pushed, and in sync with origin/main',
      noop: true,
    };
  }
  return {
    ...base,
    commit: willCommit,
    push,
    ffPull,
    status: [
      willCommit ? 'committed dirty tree' : null,
      push ? `pushed +${s.ahead + (willCommit ? 1 : 0)} to main` : null,
      ffPull ? `fast-forwarded +${s.behind}` : null,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IO layer (skipped when imported as a module, e.g. by the unit test).
// ─────────────────────────────────────────────────────────────────────────────

function git(args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}
function tryGit(args: string[]): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}
function gitOk(args: string[]): boolean {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** True iff a rebase is interrupted (a rebase-merge/rebase-apply dir or REBASE_HEAD is present). */
function inProgressRebase(): boolean {
  const gp = (n: string): string | null => tryGit(['rev-parse', '--git-path', n]);
  return (
    tryGit(['rev-parse', '--verify', '-q', 'REBASE_HEAD']) !== null ||
    [gp('rebase-merge'), gp('rebase-apply')].some((p) => p !== null && existsSync(p))
  );
}

/** True iff the working tree has no uncommitted changes. */
function isClean(): boolean {
  return (tryGit(['status', '--porcelain']) ?? '').trim() === '';
}

function observe(): SyncState {
  // `reachable` requires BOTH a successful fetch AND a resolvable origin/main — a fresh clone with a
  // different default branch can fetch yet have no origin/main, and then every reconcile step would be
  // a swallowed no-op falsely reported as success.
  const fetched = tryGit(['fetch', 'origin', 'main', '--quiet']) !== null;
  const originResolves = tryGit(['rev-parse', '--verify', '-q', 'origin/main']) !== null;
  const reachable = fetched && originResolves;
  const detached = tryGit(['symbolic-ref', '-q', '--short', 'HEAD']) === null;
  const op: SyncState['op'] = inProgressRebase()
    ? 'rebase'
    : tryGit(['rev-parse', '--verify', '-q', 'MERGE_HEAD']) !== null
      ? 'merge'
      : 'none';
  const dirty = (tryGit(['status', '--porcelain']) ?? '')
    .split('\n')
    .filter((l) => l.trim()).length;
  const counts = reachable
    ? tryGit(['rev-list', '--left-right', '--count', 'HEAD...origin/main'])
    : '0\t0';
  const [a = '0', b = '0'] = (counts ?? '0\t0').split(/\s+/);
  return { detached, op, dirty, ahead: Number(a), behind: Number(b), reachable };
}

function recoveryRef(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `recovery/guard-${ts}`;
}

function run(): void {
  const argv = process.argv.slice(2);
  const quiet = argv.includes('--quiet');
  const force = argv.includes('--force');
  const rebase = argv.includes('--rebase');
  const ci = argv.indexOf('--commit');
  const commit = ci >= 0;
  const next = argv[ci + 1];
  const commitMsg =
    commit && next && !next.startsWith('--')
      ? next
      : 'chore: sync-guard auto-commit of working tree';

  const state = observe();
  const plan = decide(state, { commit, force, rebase });
  const log = (m: string): void => {
    if (!quiet || !plan.noop) console.log(`sync-guard: ${m}`);
  };

  if (plan.noop && !plan.push && !plan.ffPull && !plan.preserve && !plan.commit) {
    log(plan.status);
    process.exit(0);
  }

  // 1. Commit a dirty tree first (opt-in), so any later preserve captures the committed work. Fail on
  //    a rejected commit (e.g. the pre-commit gate is red) rather than silently leaving a staged index.
  if (plan.commit) {
    gitOk(['add', '-A']);
    if (!gitOk(['commit', '-m', commitMsg])) {
      log('commit failed (gate red / nothing to commit) — index staged, not committed');
      process.exit(1);
    }
  }

  // 2. Preserve the AT-RISK tip before any history-rewrite/reset — FAIL-CLOSED. For a stuck op the
  //    pre-op tip is ORIG_HEAD; otherwise the work at risk is HEAD (a diverged branch's local-ahead
  //    commits live at HEAD, never a stale ORIG_HEAD).
  // Create a recovery ref ONLY when about to act destructively (force-reset / rebase-rewrite). The
  // report-only paths (stuck-no-force, diverged-no-flags) touch nothing, so git's own reflog/ORIG_HEAD
  // already hold the state — this avoids ref litter on the frequently-run (predev) path.
  let recovery: string | null = null;
  if (plan.forceReset || plan.rebasePush) {
    const stuck = state.op !== 'none';
    const tip = stuck
      ? (tryGit(['rev-parse', '-q', '--verify', 'ORIG_HEAD']) ?? tryGit(['rev-parse', 'HEAD']))
      : tryGit(['rev-parse', 'HEAD']);
    const ref = recoveryRef();
    const saved =
      tip !== null &&
      gitOk(['branch', '-f', ref, tip]) &&
      tryGit(['rev-parse', '--verify', ref]) === tip;
    if (!saved) {
      log(
        'FAILED to create a recovery ref — refusing the destructive/rewrite step; nothing changed',
      );
      process.exit(1);
    }
    recovery = ref;
    log(`preserved ${tip!.slice(0, 8)} -> ${ref}`);
    // For a stuck op, also save the (possibly different) current HEAD belt-and-suspenders.
    const headNow = tryGit(['rev-parse', 'HEAD']);
    if (stuck && headNow !== null && headNow !== tip) {
      gitOk(['branch', '-f', `${ref}-head`, headNow]);
    }
  }

  // 3. A stuck rebase/merge without --force: it is preserved; hand it back to the human.
  if (state.op !== 'none' && !plan.forceReset) {
    log(plan.status);
    process.exit(0);
  }

  // 4. Force-reset to origin/main (preserved above; fail-closed). Report honestly if the reset fails.
  if (plan.forceReset) {
    // `rebase --abort` / `merge --abort` (and the reset --hard below) restore tracked files to their
    // pre-op committed state, discarding ANY uncommitted working-tree content — not just conflict-marker
    // edits. The recovery ref above only captures committed history (a branch ref can't hold worktree
    // state), so a dirty tree here would otherwise be silently and irrecoverably lost, contradicting this
    // script's own "discarded state is always saved first" guarantee. `git stash create` does not modify
    // the index/worktree (unlike `stash push`), so it is safe to attempt unconditionally; if it fails for
    // any reason (including an unresolvable conflict shape), fail closed rather than risk silent loss.
    if (!isClean()) {
      const stashSha = tryGit([
        'stash',
        'create',
        'sync-guard: pre-force-reset working-tree snapshot',
      ]);
      const dirtyRef = `${recovery}-dirty`;
      const dirtySaved = stashSha !== null && gitOk(['branch', '-f', dirtyRef, stashSha]);
      if (!dirtySaved) {
        log(
          'FAILED to snapshot uncommitted working-tree changes — refusing the force-reset; nothing changed',
        );
        process.exit(1);
      }
      log(
        `preserved uncommitted changes -> ${dirtyRef} (recover with: git stash apply ${dirtyRef})`,
      );
    }
    if (state.op === 'rebase' && inProgressRebase()) gitOk(['rebase', '--abort']);
    if (state.op === 'merge') gitOk(['merge', '--abort']);
    const ok = gitOk(['reset', '--hard', 'origin/main']);
    log(
      ok
        ? plan.status
        : `force-reset FAILED — left as-is; your tip is on ${recovery}; resolve manually`,
    );
    process.exit(ok ? 0 : 1);
  }

  // 5. Reconcile a diverged branch (committed work included) by rebasing onto main, then push.
  if (plan.rebasePush) {
    if (gitOk(['pull', '--rebase', '--autostash', 'origin', 'main'])) {
      gitOk(['push', 'origin', 'HEAD:main']);
      log(plan.status);
      process.exit(0);
    }
    if (inProgressRebase()) gitOk(['rebase', '--abort']);
    log(
      `rebase hit a conflict — aborted; your work is on ${recovery} and the current branch. Resolve manually, or --force to reset.`,
    );
    process.exit(1);
  }

  // 6. Push local-ahead / just-committed commits (pushing committed objects never loses work). On a
  //    non-ff race, auto-reconcile by rebase ONLY when the tree is clean (so no dirty edits can be
  //    stranded in a stash); a dirty tree is reported + left untouched.
  if (plan.push) {
    if (!gitOk(['push', 'origin', 'HEAD:main'])) {
      if (isClean() && gitOk(['pull', '--rebase', 'origin', 'main'])) {
        gitOk(['push', 'origin', 'HEAD:main']);
      } else {
        if (inProgressRebase()) gitOk(['rebase', '--abort']);
        log(
          'push rejected (origin/main moved); local commits are safe — re-run `bun run guard` to reconcile (any dirty edits left untouched)',
        );
      }
    }
  }

  // 7. Fast-forward DOWN to origin/main (decide() only sets ffPull for a clean tree).
  if (plan.ffPull) {
    gitOk(['merge', '--ff-only', 'origin/main']);
  }

  log(plan.status);
  process.exit(0);
}

// Only execute when run directly (`bun scripts/sync-guard.ts`), not when imported by the test.
if (import.meta.main) run();
