/**
 * The receipts law, mechanically enforced (closes the GOV-DOC governance gap: published test-count and
 * coverage figures were enforced only by convention, and drifted repeatedly — agents wrote a number they
 * *believed* (e.g. "1,166") instead of one they *measured*). This guard fails loudly the moment any doc
 * or HTML surface claims a test count or line-coverage figure that does not match the CANONICAL receipts.
 *
 * Dr. Manhattan's law, in code: "if it is not measured, it is not real." A number in a public surface is
 * a receipt; a receipt that disagrees with the canonical measured value is a lie, and a lie fails CI here.
 *
 * Two-part enforcement:
 *   1. THIS test (fast, no spawning): every surface's published test-count / coverage tokens must equal
 *      the canonical constants below. Internal consistency across all surfaces is guaranteed instantly.
 *   2. `scripts/verify-receipts.ts` (run by `bun run check` and in CI): runs `bun test --coverage`
 *      once, preserves its exit status, parses the real numbers, and fails if the canonical constants below have
 *      drifted from reality. That is where the constants are *measured*; this test is where they are
 *      *propagated*. Together: you cannot publish a number you did not measure.
 *
 * To update after adding/removing tests: run `bun scripts/verify-receipts.ts --print`, paste the three
 * canonical values into scripts/canonical-receipts.ts, then run the truth-sync to propagate them.
 *
 * NOTE (2026-06-19): enforcement was restored after a "tolerant during Ralph Tsotchke wiring" window in
 * which both assertions were stubbed to `expect(true).toBe(true)`. The whole point of the law is that it
 * cannot be politely turned off during churn; the live surfaces below are re-policed and green.
 */
import { describe, expect, test } from 'bun:test';
import {
  CANONICAL_TEST_COUNT,
  CANONICAL_LINE_COV,
  CANONICAL_FUNC_COV,
} from '../scripts/canonical-receipts';
import { measureGate, receiptProblems } from '../scripts/verify-receipts';

// Public surfaces that publish receipts. (Dated reports under docs/reports/* are historical worldline
// snapshots carrying a SUPERSEDED banner and are intentionally excluded — their bodies preserve the
// numbers that were true at publication.)
const SURFACES = [
  'README.md',
  'ROADMAP-2026-06-26.md',
  'docs.html',
  'specs.html',
  'docs/TECHNICAL-SPECIFICATION-2026-06-26.md',
  'docs/SUPER-CREATURE-RESEARCH-2026-06-26.md',
  'docs/BENCHMARKS-2026-06-26.md',
  'docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md',
];

const HISTORICAL_SECTION_RE =
  /<!-- cqm-sync:historical:start -->[\s\S]*?<!-- cqm-sync:historical:end -->/g;
const LOCAL_MEASUREMENT_SECTION_RE =
  /<!-- cqm-sync:local-measurement:start -->[\s\S]*?<!-- cqm-sync:local-measurement:end -->/g;

function currentClaimsOnly(text: string): string {
  return text.replace(HISTORICAL_SECTION_RE, '').replace(LOCAL_MEASUREMENT_SECTION_RE, '');
}

/**
 * Patterns that capture a published TEST-COUNT integer (group 1 = the number). The count register in
 * this repo is ALWAYS comma-formatted ("1,052"), so we require the comma in prose patterns — that way a
 * bare 4-digit year like "2025 tested" or "Ferrante 2025" can never be mistaken for a test count. The
 * badge pattern is exempt (it has no comma) but is uniquely prefixed by `tests-`.
 */
const TEST_COUNT_PATTERNS: RegExp[] = [
  /([0-9],[0-9]{3})\s+tests?\b/g, // "1,052 tests"
  /([0-9],[0-9]{3})\s+pass\b/g, // "1,052 pass"
  /([0-9],[0-9]{3})\s+\/\s+0\s+fail/g, // "1,052 / 0 fail"
  /tests-([0-9]{3,4})\b/g, // shields badge "tests-1052"
];

describe('receipts law — every published test count matches the canonical (measured) value', () => {
  test('no surface claims a test count other than the canonical one', async () => {
    const offenders: string[] = [];
    for (const rel of SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = currentClaimsOnly(await file.text());
      for (const re of TEST_COUNT_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const g = m[1];
          if (g === undefined) continue;
          const claimed = Number(g.replace(/,/g, ''));
          // Police only the test-count register (1,000–9,999). Tracked-only discovery now makes the
          // count deterministic across clean local/CI checkouts, so every live surface must be exact.
          if (claimed >= 1000 && claimed < 10000 && claimed !== CANONICAL_TEST_COUNT) {
            offenders.push(
              `${rel}: claims "${m[0].trim()}" (=${claimed}) instead of canonical ${CANONICAL_TEST_COUNT}`,
            );
          }
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Published test counts disagree with the canonical measured value (${CANONICAL_TEST_COUNT}). ` +
          `Run \`bun scripts/verify-receipts.ts --print\`, fix the surfaces, never hand-write a count:\n  - ` +
          offenders.join('\n  - '),
      );
    }
    expect(offenders).toEqual([]);

    const measured = measureGate(
      `All files | ${CANONICAL_FUNC_COV} | ${CANONICAL_LINE_COV} |\n` +
        ` ${CANONICAL_TEST_COUNT} pass\n 0 fail\n` +
        `Ran ${CANONICAL_TEST_COUNT} tests across 281 files.`,
    );
    expect(receiptProblems(measured)).toEqual([]);
    expect(receiptProblems({ ...measured, count: CANONICAL_TEST_COUNT - 1 })).toContain(
      `test count: canonical ${CANONICAL_TEST_COUNT} but gate measures ${CANONICAL_TEST_COUNT - 1} (re-measure and re-sync)`,
    );
    expect(receiptProblems(measured, 1)).toContain('bun test --coverage exited with status 1');
    expect(receiptProblems(measured, null)).toContain(
      'bun test --coverage did not report an exit status',
    );
  });
});

describe('receipts law — coverage figures are internally consistent across surfaces', () => {
  test('no surface publishes a line/function coverage pair other than the canonical one', async () => {
    const offenders: string[] = [];
    const pairRe =
      /([0-9]{2}\.[0-9]{2})\s*%?\s*(?:line)?\s*\/\s*([0-9]{2}\.[0-9]{2})\s*%?\s*(?:function|func)?/g;
    for (const rel of SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = currentClaimsOnly(await file.text());
      pairRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pairRe.exec(text)) !== null) {
        const line = m[1];
        const fn = m[2];
        if (line === undefined || fn === undefined) continue;
        const lv = Number(line);
        const fv = Number(fn);
        if (lv >= 80 && lv <= 100 && fv >= 80 && fv <= 100) {
          // The published pair is the portable coverage floor, not whichever higher number one OS
          // happened to measure. Live surfaces therefore carry the exact canonical floor pair.
          if (line !== CANONICAL_LINE_COV || fn !== CANONICAL_FUNC_COV) {
            offenders.push(
              `${rel}: publishes coverage "${m[0].trim()}" instead of canonical ${CANONICAL_LINE_COV}/${CANONICAL_FUNC_COV}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('receipts law — historical snapshots remain immutable', () => {
  test('the v0.21.11 README receipt is explicit and excluded from current-fact propagation', async () => {
    const readme = await Bun.file('README.md').text();
    const blocks = readme.match(HISTORICAL_SECTION_RE) ?? [];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('v0.21.11 (2026-07-07 public-doc truth repair)');
    expect(blocks[0]).toContain('2,360-test');
    expect(blocks[0]).toContain('Package **v0.21.11**');

    const brain = await Bun.file(
      'docs/BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md',
    ).text();
    const brainHistorical = brain.match(HISTORICAL_SECTION_RE) ?? [];
    expect(brainHistorical).toHaveLength(3);
    expect(brainHistorical.join('\n')).toContain('Version under review:** `v0.21.9`');
    expect(brainHistorical.join('\n')).toContain('2,867,279');
    expect(currentClaimsOnly(brain)).toContain(
      `**${CANONICAL_TEST_COUNT.toLocaleString('en-US')}** pass / **0** fail`,
    );
  });
});
