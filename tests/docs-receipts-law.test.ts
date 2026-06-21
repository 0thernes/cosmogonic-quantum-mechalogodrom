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
 *   2. `scripts/verify-receipts.ts` (run by `bun run check` and in CI): actually runs `bun test` +
 *      `bun test --coverage`, parses the real numbers, and fails if the canonical constants below have
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

// Public surfaces that publish receipts. (Dated reports under docs/reports/* are historical worldline
// snapshots carrying a SUPERSEDED banner and are intentionally excluded — their bodies preserve the
// numbers that were true at publication.)
const SURFACES = [
  'README.md',
  'ROADMAP.md',
  'docs.html',
  'specs.html',
  'docs/TECHNICAL-SPECIFICATION.md',
  'docs/SUPER-CREATURE-RESEARCH.md',
  'docs/BENCHMARKS.md',
  'docs/NHSI-PROGRESS-DASHBOARD.md',
];

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
      const text = await file.text();
      for (const re of TEST_COUNT_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const g = m[1];
          if (g === undefined) continue;
          const claimed = Number(g.replace(/,/g, ''));
          // Police only the test-count register (1,000–9,999) so years / param counts never false-positive.
          if (claimed >= 1000 && claimed < 10000 && claimed !== CANONICAL_TEST_COUNT) {
            offenders.push(
              `${rel}: claims "${m[0].trim()}" (=${claimed}) but canonical is ${CANONICAL_TEST_COUNT}`,
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
      const text = await file.text();
      pairRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pairRe.exec(text)) !== null) {
        const line = m[1];
        const fn = m[2];
        if (line === undefined || fn === undefined) continue;
        const lv = Number(line);
        const fv = Number(fn);
        if (lv >= 80 && lv <= 100 && fv >= 80 && fv <= 100) {
          if (line !== CANONICAL_LINE_COV || fn !== CANONICAL_FUNC_COV) {
            offenders.push(
              `${rel}: publishes coverage "${m[0].trim()}" != canonical ${CANONICAL_LINE_COV}/${CANONICAL_FUNC_COV}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
