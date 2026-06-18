#!/usr/bin/env bun
/**
 * verify-receipts.ts — the MEASUREMENT half of the receipts law (Dr. Manhattan's law in a script).
 *
 * Runs the real gate (`bun test`, `bun test --coverage`), parses the true numbers, and compares them to
 * the CANONICAL constants committed in `tests/docs-receipts-law.test.ts`. If they have drifted, it fails
 * with a precise diff so the truth-sync can update the constant — never the other way around.
 *
 *   bun scripts/verify-receipts.ts          # verify canon == reality (used by `bun run check` + CI)
 *   bun scripts/verify-receipts.ts --print   # just measure + print the canonical triple to paste
 *
 * The companion fast test (`docs-receipts-law.test.ts`) then propagates the canon to every public surface.
 * Together they make it impossible to ship a test-count or coverage figure that was not measured.
 */
import { spawnSync } from 'node:child_process';
import { CANONICAL_TEST_COUNT, CANONICAL_LINE_COV, CANONICAL_FUNC_COV } from './canonical-receipts';

function run(args: string[]): string {
  const r = spawnSync('bun', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    // Sentinel kept for compatibility; the fast test no longer spawns, but harmless to set.
    env: { ...process.env, RECEIPTS_LAW_CHILD: '1' },
  });
  return `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
}

function measureTestCount(): number {
  const out = run(['test']);
  const ran = out.match(/Ran\s+([0-9]+)\s+tests?\b/);
  if (ran) return Number(ran[1]);
  const pass = out.match(/^\s*([0-9]+)\s+pass\s*$/m);
  if (pass) return Number(pass[1]);
  throw new Error('verify-receipts: could not parse a test count from `bun test`');
}

function measureCoverage(): { line: string; func: string } {
  const out = run(['test', '--coverage']);
  // Bun prints: "All files                | % Funcs | % Lines | ..." then a row "All files | NN.NN | NN.NN |"
  const row = out.match(/All files[^\n|]*\|\s*([0-9]+\.[0-9]+)\s*\|\s*([0-9]+\.[0-9]+)\s*\|/);
  if (!row || row[1] === undefined || row[2] === undefined)
    throw new Error('verify-receipts: could not parse coverage from `bun test --coverage`');
  // Column order in Bun: % Funcs then % Lines.
  return { func: row[1], line: row[2] };
}

const printOnly = process.argv.includes('--print');

const count = measureTestCount();
const cov = measureCoverage();

if (printOnly) {
  console.log('Canonical receipts (paste into tests/docs-receipts-law.test.ts):');
  console.log(`  CANONICAL_TEST_COUNT = ${count};`);
  console.log(`  CANONICAL_LINE_COV = '${cov.line}';`);
  console.log(`  CANONICAL_FUNC_COV = '${cov.func}';`);
  process.exit(0);
}

const problems: string[] = [];
if (count !== CANONICAL_TEST_COUNT)
  problems.push(`test count: canonical ${CANONICAL_TEST_COUNT} but gate measures ${count}`);
if (cov.line !== CANONICAL_LINE_COV)
  problems.push(`line coverage: canonical ${CANONICAL_LINE_COV} but gate measures ${cov.line}`);
if (cov.func !== CANONICAL_FUNC_COV)
  problems.push(`function coverage: canonical ${CANONICAL_FUNC_COV} but gate measures ${cov.func}`);

if (problems.length > 0) {
  console.error('✗ receipts law: canonical constants have drifted from the measured gate:');
  for (const p of problems) console.error(`   - ${p}`);
  console.error('\n   Fix: run `bun scripts/verify-receipts.ts --print`, update the constants in');
  console.error(
    '   tests/docs-receipts-law.test.ts, then re-sync the surfaces. Never the reverse.',
  );
  process.exit(1);
}

console.log(
  `✓ receipts law: ${count} tests · ${cov.line}% line / ${cov.func}% function — canon matches reality.`,
);
