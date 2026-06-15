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
});
