#!/usr/bin/env bun
/**
 * sync-canon.ts — ONE command that makes every readable surface consistent with the single sources
 * of truth. The flow-state fix for "the same fact lives on five pages and drifts": you never edit a
 * version or a test-count on a page again — you change the SOURCE, run `bun run sync`, and every
 * surface (README, ROADMAP, docs/*.md, *.html) is rewritten to match in one pass.
 *
 * SINGLE SOURCES OF TRUTH (edit these, never the surfaces):
 *   • Version        → package.json `version`
 *   • Test / coverage → scripts/canonical-receipts.ts (CANONICAL_TEST_COUNT / LINE_COV / FUNC_COV)
 *   • File map        → derived from the working tree by scripts/gen-filemap.ts
 *
 * What it does (idempotent — safe to run any number of times):
 *   1. propagates the canonical test-count + coverage to every surface (.sync-receipts.cjs),
 *   2. propagates the package version to the CURRENT-version surfaces (badges + the `Latest:` /
 *      `Package vX` / app-footer markers — NOT the historical changelog/version-history mentions),
 *   3. repairs any UTF-8 mojibake the doc loop introduced (scripts/normalize-docs.ts),
 *   4. regenerates docs/FILE-MAP.md from the tree (scripts/gen-filemap.ts).
 *
 * `--check` mode: verify the current-version surfaces match package.json WITHOUT mutating anything
 * (exit 1 on drift) — for a manual/CI spot-check. The committed gate enforces the same invariants in
 * `bun test`: `tests/docs-canon-law.test.ts` (version) + `tests/docs-receipts-law.test.ts` (receipts).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CHECK = process.argv.includes('--check');

/** Current version — the one source of truth for "what version is this". */
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

/**
 * CURRENT-version surfaces. Each entry rewrites ONLY the markers that show the *live* version, never
 * the historical "released as v0.11.0" / version-history mentions. Patterns are deliberately narrow.
 */
const VERSION_SURFACES: ReadonlyArray<readonly [string, ReadonlyArray<readonly [RegExp, string]>]> =
  [
    [
      'README.md',
      [
        // shields.io version badge, if present: `version-0.17.1`
        [/version-0\.[0-9]+\.[0-9]+/g, `version-${VERSION}`],
      ],
    ],
  ];

/** Rewrite a file in place (or, in --check, just report whether it WOULD change). Returns drift. */
function applyVersion(file: string, edits: ReadonlyArray<readonly [RegExp, string]>): string[] {
  let before: string;
  try {
    before = readFileSync(file, 'utf8');
  } catch {
    return []; // surface absent — skip silently
  }
  let after = before;
  for (const [re, to] of edits) after = after.replace(re, to);
  if (after !== before) {
    if (!CHECK) writeFileSync(file, after, 'utf8');
    return [file];
  }
  return [];
}

function run(cmd: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const drift: string[] = [];

// Version → current-version surfaces (non-mutating in --check: applyVersion only writes when !CHECK).
for (const [file, edits] of VERSION_SURFACES) drift.push(...applyVersion(file, edits));

if (CHECK) {
  // Receipts drift is already gated by tests/docs-receipts-law.test.ts, so --check stays
  // non-mutating and only verifies the version surfaces here.
  if (drift.length > 0) {
    console.error('✗ version drift — these surfaces disagree with package.json:');
    for (const f of new Set(drift)) console.error(`   - ${f}`);
    console.error('\n   Fix: run `bun run sync`, then commit the result.');
    process.exit(1);
  }
  console.log(`✓ canon in sync: version ${VERSION} matches every current-version surface.`);
} else {
  // 1. Receipts (test count + coverage) → every surface.
  const receipts = run('node', ['.sync-receipts.cjs']);
  if (!receipts.ok) {
    console.error('sync-canon: receipts sync failed:\n' + receipts.out);
    process.exit(1);
  }
  // 2. Mojibake repair + file-map regen.
  run('bun', ['scripts/normalize-docs.ts']);
  run('bun', ['scripts/gen-filemap.ts']);
  console.log(
    `✓ synced every surface to version ${VERSION} + canonical receipts` +
      (drift.length ? ` (version touched: ${drift.join(', ')})` : ''),
  );
}
