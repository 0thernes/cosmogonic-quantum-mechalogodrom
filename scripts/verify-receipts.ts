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

/** One cold `bun test --coverage` run — count and coverage must share the same measurement. */
function measureGate(): { count: number; line: string; func: string } {
  const out = run(['test', '--coverage']);
  const ran = out.match(/Ran\s+([0-9]+)\s+tests?\b/);
  const pass = out.match(/^\s*([0-9]+)\s+pass\s*$/m);
  const count = ran ? Number(ran[1]) : pass ? Number(pass[1]) : NaN;
  if (!Number.isFinite(count))
    throw new Error('verify-receipts: could not parse test count from `bun test --coverage`');
  // Bun prints: "All files                | % Funcs | % Lines | ..." then a row "All files | NN.NN | NN.NN |"
  const row = out.match(/All files[^\n|]*\|\s*([0-9]+\.[0-9]+)\s*\|\s*([0-9]+\.[0-9]+)\s*\|/);
  if (!row || row[1] === undefined || row[2] === undefined)
    throw new Error('verify-receipts: could not parse coverage from `bun test --coverage`');
  // Column order in Bun: % Funcs then % Lines.
  return { count, func: row[1], line: row[2] };
}

const printOnly = process.argv.includes('--print');

const { count, line: lineCov, func: funcCov } = measureGate();
const cov = { line: lineCov, func: funcCov };

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
// Coverage is a DERIVED FLOAT and jitters run-to-run (~0.05 observed on a fixed tree); an exact
// `!==` on it is the "bare === on derived floats" anti-pattern the Physicist forbids, and is why this
// gate drifted red on every run. We pin a measured representative value and accept it within an
// explicit tolerance (Manhattan: state tolerances and test AT them). The integer test COUNT does not
// jitter, so it stays an exact match — a genuine overclaim (e.g. 1238 vs 1447) is still caught.
const COV_TOL = 0.25; // ≥0.25% off ⇒ real drift / overclaim; ≤0.25% ⇒ measurement jitter.
if (Math.abs(Number(cov.line) - Number(CANONICAL_LINE_COV)) > COV_TOL)
  problems.push(
    `line coverage: canonical ${CANONICAL_LINE_COV} but gate measures ${cov.line} (tol ±${COV_TOL})`,
  );
if (Math.abs(Number(cov.func) - Number(CANONICAL_FUNC_COV)) > COV_TOL)
  problems.push(
    `function coverage: canonical ${CANONICAL_FUNC_COV} but gate measures ${cov.func} (tol ±${COV_TOL})`,
  );

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
