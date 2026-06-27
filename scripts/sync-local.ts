/**
 * SYNC-LOCAL — keep the working checkout current with GitHub `main`, automatically.
 *
 * Why this exists: the post-commit hook auto-PUSHES local → `origin/main`, but nothing pulled the
 * other direction. With work landing on `main` from many worktrees, a primary checkout silently drifts
 * BEHIND GitHub — so "Local ≠ GitHub" (stale UI, missing renamed docs, fixes that never reached the
 * tree you run). This closes that gap: it runs as `predev`, so every `bun dev` first fast-forwards the
 * current branch up to `origin/main`.
 *
 * SAFE BY CONSTRUCTION — it only ever fast-forwards:
 *  - If the checkout is BEHIND with no local-only commits → `merge --ff-only` advances it. (the normal case)
 *  - If it has diverged / local commits / a dirty tree that blocks ff → it leaves the tree untouched and
 *    just prints a note. It NEVER rebases, resets, stashes, or discards anything.
 *  - Offline / no remote → best-effort no-op.
 * Opt out with `CQM_NO_SYNC=1 bun dev`.
 */
import { execFileSync } from 'node:child_process';

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

if (process.env['CQM_NO_SYNC'] === '1') {
  console.log('sync-local: skipped (CQM_NO_SYNC=1).');
  process.exit(0);
}

// Best-effort fetch of main; if it fails (offline / no remote), leave the tree as-is.
if (tryGit(['fetch', 'origin', 'main', '--quiet']) === null) {
  console.log('sync-local: could not reach origin (offline?) — local kept as-is.');
  process.exit(0);
}

const head = tryGit(['rev-parse', 'HEAD']);
const remote = tryGit(['rev-parse', 'origin/main']);
if (!head || !remote) process.exit(0);

if (head === remote) {
  console.log('sync-local: already current with origin/main.');
  process.exit(0);
}

// Count local-only commits (left) vs incoming (right). Only fast-forward when there are ZERO local-only.
const counts = tryGit(['rev-list', '--left-right', '--count', `HEAD...origin/main`]);
const [aheadStr = '0', behindStr = '0'] = (counts ?? '').split(/\s+/);
const ahead = Number(aheadStr);
const behind = Number(behindStr);

if (ahead > 0) {
  console.log(
    `sync-local: ${ahead} local-only commit(s) — NOT touching them; push them to land on main. (origin/main is ${behind} ahead.)`,
  );
  process.exit(0);
}

// ahead === 0 → a clean fast-forward is possible. ff-only refuses (non-zero) if the working tree blocks it.
if (tryGit(['merge', '--ff-only', 'origin/main']) !== null) {
  console.log(
    `sync-local: fast-forwarded local → origin/main (+${behind} commit(s)). Local == GitHub.`,
  );
} else {
  console.log(
    'sync-local: behind origin/main but ff blocked (uncommitted changes touch incoming files) — local kept; commit or stash, then `bun run pull`.',
  );
}
