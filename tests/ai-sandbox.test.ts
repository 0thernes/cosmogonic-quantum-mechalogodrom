/**
 * Security-boundary tests for the Copilot read-only sandbox (src/server/ai-sandbox.ts).
 *
 * The audit flagged this boundary as having ZERO automated tests (CRITICAL) while shipping
 * security-critical default-deny logic. These tests lock in the gate — including the three
 * holes fixed in Stage 1: the `.env.local` / `.ENV` secret-leak bypass, the `find -delete`
 * deletion primitive, and the disk-writing `bun run check|bench` scripts.
 *
 * Hermetic by design: path/confinement checks use node:fs only, and every command-gate case is a
 * DENY that returns at validation *before* any subprocess spawns — so no OS binary is invoked and
 * the suite is deterministic cross-platform.
 */
import { describe, expect, test } from 'bun:test';
import {
  readFileSafe,
  listDir,
  grepRepo,
  runReadOnly,
  dispatchTool,
} from '../src/server/ai-sandbox';

describe('ai-sandbox: path confinement (read-only, repo-confined)', () => {
  test('reads a real repo file', async () => {
    const r = await readFileSafe('package.json');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toContain('cosmogonic');
  });

  test('lists a real repo directory', async () => {
    expect((await listDir('src')).ok).toBe(true);
  });

  test('blocks .env, .env.local, and .ENV (secret-leak bypass — audit CRITICAL)', async () => {
    expect((await readFileSafe('.env')).ok).toBe(false);
    expect((await readFileSafe('.env.local')).ok).toBe(false);
    expect((await readFileSafe('.ENV')).ok).toBe(false);
  });

  test('blocks .gitignore and .git internals (flagged as exposed)', async () => {
    expect((await readFileSafe('.gitignore')).ok).toBe(false);
    expect((await readFileSafe('.git/config')).ok).toBe(false);
  });

  test('blocks legacy/, node_modules/, dist/', async () => {
    expect((await readFileSafe('legacy/anything')).ok).toBe(false);
    expect((await readFileSafe('node_modules/anything')).ok).toBe(false);
    expect((await readFileSafe('dist/anything')).ok).toBe(false);
  });

  test('blocks traversal, absolute, and home paths', async () => {
    expect((await readFileSafe('../secret')).ok).toBe(false);
    expect((await readFileSafe('/etc/passwd')).ok).toBe(false);
    expect((await readFileSafe('~/secret')).ok).toBe(false);
  });

  test('list_dir does not leak .git* / .env* filenames (audit: listDir block-list mismatch)', async () => {
    // confine() refuses to READ anything under a `.git*`/`.env*` top segment; the directory LISTING must
    // hide the same names, or the model (and an attacker steering it) can confirm which secret-ish files
    // exist. The repo root has .gitignore + .github + .gitattributes — none may surface.
    const r = await listDir('.');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output).not.toContain('.gitignore');
      expect(r.output).not.toContain('.github');
      expect(r.output).not.toContain('.gitattributes');
    }
  });
});

describe('ai-sandbox: command gate is default-deny and write-free', () => {
  const denied = [
    'rm -rf .',
    'find . -delete', // deletion primitive (audit HIGH)
    'find . -exec rm {} ;', // exec primitive
    'git push',
    'git commit -m msg',
    'git checkout main',
    'bun run check', // builds / writes dist (audit HIGH)
    'bun run build',
    'bun run bench',
    'echo hi > out.txt', // redirection
    'cat a && cat b', // chaining
    'cat ../../../etc/passwd', // escapes root
    'curl http://example.com', // network
    'node -e doStuff', // arbitrary exec
    'sh -c whoami', // shell
    // audit 2026-06-15 — sandbox-escape options a dash-led token slipped past the old guards:
    'git grep --open-files-in-pager=id world', // git pager → arbitrary process exec (HIGH)
    'git grep -Oid world', // attached short form of the same pager option
    'git diff --output=leak.txt', // git writes a file (read-only violation)
    'sort -o out.txt package.json', // sort writes a file (read-only violation)
    'cat .env', // `run` read of a blocked secret file (read_file blocks it; run did not — MEDIUM)
    'cat legacy/anything', // `run` read of a blocked legacy file
    'git show HEAD:.env', // read a blocked file via git <rev>:<path>
    'git cat-file -p HEAD', // raw object reads bypass path confinement entirely
    'git show HEAD', // bare rev can disclose historical/deleted file contents
    'git log -p -1 --stat', // patch history can disclose deleted blocked files
    'git log -u -3', // `-u` is a documented alias for `-p` — same disclosure, must be denied identically
    'git log --patch-with-stat -1', // combines stat + full patch content, same disclosure as `-p`
    'git diff HEAD~1 HEAD', // revision diffs are history reads, not confined file reads
    // GNU grep recurses via `-d recurse` / `--directories=recurse` too, not just `-r`/`-R` — these
    // reopened the audit-CRITICAL secret leak (native grep recursed root → .env/.git/legacy) past the
    // `-r`/`-R` block (audit 2026-07-01). All directory-handling spellings must be denied.
    'grep -d recurse KEY .', // space-separated value
    'grep -drecurse KEY .', // attached value
    'grep --directories=recurse KEY .', // long form
    'grep --directories recurse KEY .', // long form, space-separated value
  ];
  for (const cmd of denied) {
    test(`denies: ${cmd}`, async () => {
      expect((await runReadOnly(cmd)).ok).toBe(false);
    });
  }

  test('rejects unknown tool name', async () => {
    expect((await dispatchTool('not_a_real_tool', {})).ok).toBe(false);
  });

  test('grep rejects multi-token / empty patterns', async () => {
    expect((await grepRepo('a b')).ok).toBe(false);
    expect((await grepRepo('')).ok).toBe(false);
  });

  test('grep rejects a dash-led pattern — git option-injection (audit 2026-06-15, HIGH)', async () => {
    expect((await grepRepo('-O')).ok).toBe(false);
    expect((await grepRepo('--open-files-in-pager=id')).ok).toBe(false);
  });

  test('Windows absolute backslash paths cannot escape the repo via run (audit BLOCKER)', async () => {
    // The old confine gate fired only on `/` or `.`, so a Windows absolute path with backslashes and no
    // dot (`C:\Windows`) skipped confinement and `run` enumerated/read the host filesystem OUTSIDE the
    // repo root (demonstrated live). On Windows confine() now rejects these at validation; on POSIX they
    // are treated as non-existent in-repo relative filenames — either way the call must fail, every OS.
    for (const cmd of [
      'ls C:\\Windows',
      'find C:\\Users -maxdepth 1',
      'cat C:\\Windows\\System32',
    ]) {
      expect((await runReadOnly(cmd)).ok).toBe(false);
    }
  });
});

describe('ai-sandbox: success paths (the gate ALLOWS + executes valid read-only input)', () => {
  test(
    'runReadOnly runs an allowed read-only command and returns its output',
    async () => {
      // Exercises the exec path (Bun.spawn array-form + minimalEnv key-stripping + output capture).
      const r = await runReadOnly('echo cosmogonic-sandbox-ok');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.output.trim()).toContain('cosmogonic-sandbox-ok');
    },
    { timeout: 20_000 },
  );

  test(
    'dispatchTool routes each tool name to its handler on valid args',
    async () => {
      expect((await dispatchTool('read_file', { path: 'package.json' })).ok).toBe(true);
      expect((await dispatchTool('list_dir', { path: 'src' })).ok).toBe(true);
      expect((await dispatchTool('grep', { pattern: 'cosmogonic' })).ok).toBe(true);
      expect((await dispatchTool('run', { command: 'echo cosmogonic-sandbox-ok' })).ok).toBe(true);
    },
    { timeout: 60_000 },
  );

  test('dispatchTool tolerates missing args — routes with an empty value, handler rejects', async () => {
    expect((await dispatchTool('read_file', {})).ok).toBe(false); // empty path
    expect((await dispatchTool('grep', {})).ok).toBe(false); // empty pattern
    expect((await dispatchTool('run', {})).ok).toBe(false); // empty command
  });
});

describe('ai-sandbox: recursive traversal cannot leak private dirs (audit CRITICAL)', () => {
  // `grep -r KEY .` / `find .` / `du .` / `rg KEY .` / `ls -R .` would spawn a native binary at the repo
  // root and recurse INTO legacy/.git/node_modules/.env, returning the file contents/paths the read tools
  // forbid. All must be denied at validation (ok:false) BEFORE any subprocess spawns.
  test('inherently-recursive binaries are denied outright', async () => {
    for (const cmd of [
      'find .',
      'find legacy',
      'du -a .',
      'du legacy',
      'tree .',
      'rg secret .',
      'rg secret',
    ]) {
      expect((await runReadOnly(cmd)).ok).toBe(false);
    }
  });

  test('recursive grep / ls flags are denied (non-recursive forms still allowed by validation)', async () => {
    for (const cmd of [
      'grep -r KEY .',
      'grep -rn KEY .',
      'grep -R KEY .',
      'grep --recursive KEY .',
      'ls -R .',
      'ls --recursive .',
    ]) {
      expect((await runReadOnly(cmd)).ok).toBe(false);
    }
  });

  test('bare private-dir tokens are confined for native tools', async () => {
    // `ls legacy` / `cat legacy` / `grep KEY legacy` previously skipped confine (no separator) and
    // enumerated/searched a blocked dir; now the bare token is sealed in.
    expect((await runReadOnly('ls legacy')).ok).toBe(false);
    expect((await runReadOnly('ls node_modules')).ok).toBe(false);
    expect((await runReadOnly('grep KEY legacy')).ok).toBe(false);
  });

  test('nested .env / .git are blocked at any depth, not just the top segment', async () => {
    expect((await readFileSafe('config/.env')).ok).toBe(false);
    expect((await readFileSafe('deploy/.env.production')).ok).toBe(false);
    expect((await readFileSafe('a/b/.git/config')).ok).toBe(false);
    expect((await runReadOnly('cat config/.env')).ok).toBe(false);
  });

  test('.claude worktree checkouts are blocked — they hold sibling .git/.memory content (audit MEDIUM)', async () => {
    expect((await readFileSafe('.claude/worktrees/x/.memory/notes.md')).ok).toBe(false);
    expect((await listDir('.claude')).ok).toBe(false);
    expect((await runReadOnly('cat .claude/worktrees/x/.git/config')).ok).toBe(false);
  });
});
