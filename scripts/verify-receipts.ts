#!/usr/bin/env bun
/**
 * verify-receipts.ts — the MEASUREMENT half of the receipts law (Dr. Manhattan's law in a script).
 *
 * Parses the real `bun test --coverage` output, compares it to the CANONICAL constants committed in
 * `scripts/canonical-receipts.ts`, and fails on drift. Normal package-script use owns one direct
 * `bun test --coverage` child and preserves its status. Managed hosts that deny nested processes can
 * capture that command themselves, then provide both its transcript and exit code explicitly.
 *
 *   bun scripts/verify-receipts.ts
 *   bun scripts/verify-receipts.ts --print  # measure + print the canonical triple to paste
 *   bun scripts/verify-receipts.ts --from-file coverage.txt --test-exit-code=0
 *
 * The companion fast test (`docs-receipts-law.test.ts`) then propagates the canon to every public surface.
 * Together they make it impossible to ship a test-count or coverage figure that was not measured.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CANONICAL_TEST_COUNT, CANONICAL_LINE_COV, CANONICAL_FUNC_COV } from './canonical-receipts';

interface CoverageTranscript {
  text: string;
  exitCode: number | null;
}

/** Per-test timeout (ms) for the gate's `bun test --coverage` run — a contention ceiling, not a target. */
const GATE_COVERAGE_TEST_TIMEOUT_MS = 120_000;

function run(args: string[]): CoverageTranscript {
  const r = spawnSync('bun', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    // Gate sentinels: RECEIPTS_LAW_CHILD (legacy) + CQM_COVERAGE so wall-clock budget
    // tests skip meaningless instrumented timings (see tests/coverage-mode.ts).
    env: { ...process.env, RECEIPTS_LAW_CHILD: '1', CQM_COVERAGE: '1' },
  });
  if (r.error) {
    throw new Error(
      `verify-receipts: could not spawn \`bun ${args.join(' ')}\` (${r.error.message}). ` +
        'Capture that command with the host shell, then use --from-file <path> ' +
        'and --test-exit-code=<status>.',
    );
  }
  return {
    text: `${r.stdout ?? ''}\n${r.stderr ?? ''}`,
    exitCode: r.status,
  };
}

function declaredExitCode(): number | null {
  const prefix = '--test-exit-code=';
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return null;
  const value = Number(arg.slice(prefix.length));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('verify-receipts: --test-exit-code must be a non-negative integer');
  }
  return value;
}

async function coverageOutput(): Promise<CoverageTranscript> {
  const fromFileIdx = process.argv.indexOf('--from-file');
  if (fromFileIdx >= 0) {
    const path = process.argv[fromFileIdx + 1];
    if (!path) throw new Error('verify-receipts: --from-file requires a path');
    return { text: readFileSync(path, 'utf8'), exitCode: declaredExitCode() };
  }
  if (process.argv.includes('--stdin')) {
    const text = await Bun.stdin.text();
    // Preserve the actual test transcript for humans/CI logs; parsing still happens below.
    process.stdout.write(text);
    return { text, exitCode: declaredExitCode() };
  }
  // Per-test ceiling for the gate's coverage run. Several deterministic headless-sim integration tests
  // legitimately run 10–30 s each under `--coverage` on a contended machine (measured worst ~26 s), which
  // sporadically trips Bun's 5 s default and reds the gate on load, NOT on any correctness fault (they
  // pass in isolation). A generous 120 s ceiling makes the gate robust to contention while still catching
  // a genuine hang (which runs unbounded). It is a MAXIMUM, so fast tests are unaffected.
  const transcript = run(['test', '--coverage', `--timeout=${GATE_COVERAGE_TEST_TIMEOUT_MS}`]);
  process.stdout.write(transcript.text);
  return transcript;
}

/** One cold `bun test --coverage` transcript — count and coverage must share the same measurement. */
export function measureGate(out: string): { count: number; line: string; func: string } {
  const failed = out.match(/(^|\n)\s*([0-9]+)\s+fail\b/);
  if (failed && Number(failed[2]) > 0) {
    throw new Error(`verify-receipts: coverage test run reported ${failed[2]} failing test(s)`);
  }

  const ran = out.match(/Ran\s+([0-9]+)\s+tests?\b/);
  const pass = out.match(/^\s*([0-9]+)\s+pass\s*$/m);
  let count = ran ? Number(ran[1]) : pass ? Number(pass[1]) : NaN;
  if (!Number.isFinite(count)) {
    // Fallback for polluted or different output formats (e.g. "2181 pass")
    const passLine = out.match(/(\d+)\s+pass\b/);
    if (passLine) count = Number(passLine[1]);
  }
  if (!Number.isFinite(count))
    throw new Error('verify-receipts: could not parse test count from `bun test --coverage`');
  // Bun prints: "All files                | % Funcs | % Lines | ..." then a row "All files | NN.NN | NN.NN |"
  const row = out.match(/All files[^\n|]*\|\s*([0-9]+\.[0-9]+)\s*\|\s*([0-9]+\.[0-9]+)\s*\|/);
  if (!row || row[1] === undefined || row[2] === undefined)
    throw new Error('verify-receipts: could not parse coverage from `bun test --coverage`');
  // Column order in Bun: % Funcs then % Lines.
  return { count, func: row[1], line: row[2] };
}

/** Compare a measured transcript to the single canonical receipt. Pure for focused regression tests. */
export function receiptProblems(
  measured: { count: number; line: string; func: string },
  testExitCode: number | null = 0,
): string[] {
  const problems: string[] = [];
  if (testExitCode === null) {
    problems.push('bun test --coverage did not report an exit status');
  } else if (testExitCode !== 0) {
    problems.push(`bun test --coverage exited with status ${testExitCode}`);
  }
  // Tracked-only documentation discovery makes the suite count identical in clean/local/CI checkouts.
  // Exact equality now catches both mass deletion and unreceipted test additions; no stale escape floor.
  if (measured.count !== CANONICAL_TEST_COUNT) {
    problems.push(
      `test count: canonical ${CANONICAL_TEST_COUNT} but gate measures ${measured.count} (re-measure and re-sync)`,
    );
  }
  // Coverage varies by instrumenter/OS, so the portable Ubuntu measurement is a one-sided floor.
  // Higher Windows coverage is valid; anything below the published floor is a real regression.
  if (Number(measured.line) < Number(CANONICAL_LINE_COV)) {
    problems.push(
      `line coverage: portable floor ${CANONICAL_LINE_COV} but gate measures ${measured.line}`,
    );
  }
  if (Number(measured.func) < Number(CANONICAL_FUNC_COV)) {
    problems.push(
      `function coverage: portable floor ${CANONICAL_FUNC_COV} but gate measures ${measured.func}`,
    );
  }
  return problems;
}

async function main(): Promise<void> {
  const printOnly = process.argv.includes('--print');
  const transcript = await coverageOutput();
  const measured = measureGate(transcript.text);
  if (transcript.exitCode === null) {
    throw new Error('verify-receipts: bun test --coverage did not report an exit status');
  }
  if (transcript.exitCode !== 0) {
    throw new Error(
      `verify-receipts: refusing to use a failed coverage run (exit ${transcript.exitCode})`,
    );
  }

  if (printOnly) {
    console.log('Canonical receipts (paste into scripts/canonical-receipts.ts):');
    console.log(`  CANONICAL_TEST_COUNT = ${measured.count};`);
    console.log(`  CANONICAL_LINE_COV = '${measured.line}';`);
    console.log(`  CANONICAL_FUNC_COV = '${measured.func}';`);
    return;
  }

  const problems = receiptProblems(measured, transcript.exitCode);
  if (problems.length > 0) {
    console.error('✗ receipts law: canonical constants have drifted from the measured gate:');
    for (const problem of problems) console.error(`   - ${problem}`);
    console.error(
      '\n   Fix: run `bun scripts/verify-receipts.ts --print`, update the constants in',
    );
    console.error(
      '   scripts/canonical-receipts.ts, then re-sync the surfaces. Never the reverse.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `✓ receipts law: ${measured.count} tests · ${measured.line}% line / ${measured.func}% function — exact count and portable coverage floor verified.`,
  );
}

if (import.meta.main) await main();
