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
  test('runReadOnly runs an allowed read-only command and returns its output', async () => {
    // Exercises the exec path (Bun.spawn array-form + minimalEnv key-stripping + output capture).
    const r = await runReadOnly('git log --oneline -1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output.trim().length).toBeGreaterThan(0);
  });

  test('dispatchTool routes each tool name to its handler on valid args', async () => {
    expect((await dispatchTool('read_file', { path: 'package.json' })).ok).toBe(true);
    expect((await dispatchTool('list_dir', { path: 'src' })).ok).toBe(true);
    expect((await dispatchTool('grep', { pattern: 'cosmogonic' })).ok).toBe(true);
    expect((await dispatchTool('run', { command: 'git log --oneline -1' })).ok).toBe(true);
  });

  test('dispatchTool tolerates missing args — routes with an empty value, handler rejects', async () => {
    expect((await dispatchTool('read_file', {})).ok).toBe(false); // empty path
    expect((await dispatchTool('grep', {})).ok).toBe(false); // empty pattern
    expect((await dispatchTool('run', {})).ok).toBe(false); // empty command
  });
});
