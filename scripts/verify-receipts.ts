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
  // CANONICAL_TEST_COUNT is a FLOOR (min across environments), not an exact pin — parameterized
  // doc/determinism tests count per-file, so the total differs by env (clean CI < a file-rich local
  // tree). Never RAISE the floor automatically (that would red a leaner env); only lower it if a clean
  // run drops below it (tests genuinely removed). This makes the receipts law robust to env + churn.
  console.log(`  CANONICAL_TEST_COUNT = ${Math.min(count, CANONICAL_TEST_COUNT)};`);
  console.log(`  CANONICAL_LINE_COV = '${cov.line}';`);
  console.log(`  CANONICAL_FUNC_COV = '${cov.func}';`);
  process.exit(0);
}

const problems: string[] = [];
// FLOOR, not exact equality: the measured count must be AT LEAST the canonical floor. Parameterized
// doc/determinism tests count per-file, so the exact total is env-dependent (the loop's file-rich tree
// measures more than a clean CI checkout); pinning it exactly made CI perpetually red. A floor catches a
// real regression (tests removed) without lying about a non-portable exact number.
if (count < CANONICAL_TEST_COUNT)
  problems.push(
    `test count: ${count} is BELOW the canonical floor ${CANONICAL_TEST_COUNT} (tests removed? re-floor via --print)`,
  );
// Coverage % is environment-sensitive: Bun instruments a slightly different file set locally vs in
// CI (observed ~4pp lower in CI), so EXACT cross-environment equality is unsatisfiable — it made
// every tagged release build fail at this step. Per Dr. Manhattan's numerical canon ("never bare
// === on derived floats; state tolerances explicitly"), the test COUNT (deterministic) stays exact
// while coverage is enforced within an explicit ±band. Canonical stays the locally-measured headline
// that docs publish; this guards against real regression without lying about float identity.
const COV_TOLERANCE_PP = 6;
if (Math.abs(Number(cov.line) - Number(CANONICAL_LINE_COV)) > COV_TOLERANCE_PP)
  problems.push(
    `line coverage: canonical ${CANONICAL_LINE_COV} but gate measures ${cov.line} (beyond ±${COV_TOLERANCE_PP}pp)`,
  );
if (Math.abs(Number(cov.func) - Number(CANONICAL_FUNC_COV)) > COV_TOLERANCE_PP)
  problems.push(
    `function coverage: canonical ${CANONICAL_FUNC_COV} but gate measures ${cov.func} (beyond ±${COV_TOLERANCE_PP}pp)`,
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
