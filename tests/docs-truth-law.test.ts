/**
 * DOCS TRUTH LAW — gate enforcement of doc honesty + encoding (root-cause fix).
 *
 * The autonomous doc-writing loop has repeatedly (a) corrupted README/docs into
 * UTF-8 mojibake and (b) overclaimed Tsotchke wiring ("wiring=1.0" across the
 * board, omitting that the 4 LLM/chain/API repos are deliberately fenced). These
 * tests make `bun run check` / CI FAIL on either problem, so no writer — script
 * or LLM loop — can publish corrupted or untruthful docs. Fix encoding with
 * `bun scripts/normalize-docs.ts`; truth is a manual edit.
 *
 * The mojibake pattern below is written with \u escapes so this test file itself
 * stays pure ASCII and cannot be corrupted by the same loop.
 *
 * Companion: scripts/normalize-docs.ts, tests/docs-receipts-law.test.ts.
 */
import { describe, expect, test } from 'bun:test';

/** Living, authoritative surfaces that must state the wiring truthfully. */
const LIVING = ['README.md', 'docs/ARCHITECTURE.md', 'docs/MODULE-CONTRACTS.md'];

/** Canonical surfaces whose encoding must stay clean (the user-named living docs). */
const CANONICAL = [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/MODULE-CONTRACTS.md',
  'docs/TECHNICAL-SPECIFICATION.md',
  'docs/ERD.md',
  'docs/ERM.md',
  'docs/ERP.md',
];

/**
 * Byte signatures that only occur when UTF-8 is re-encoded as Windows-1252:
 *  â€ = "â€" (em/en dash, smart quotes), Â  = "Â<nbsp>",
 *  ðŸ = "ðŸ" (emoji lead), Ã = "Ã" (double-encoded latin), � = replacement char.
 */
const MOJIBAKE = /â€|Â |ðŸ|Ã[¢-¿]|�/;

describe('docs truth law — encoding', () => {
  test('no UTF-8 mojibake in the canonical living docs (run scripts/normalize-docs.ts to fix)', async () => {
    const offenders: string[] = [];
    for (const rel of CANONICAL) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      if (MOJIBAKE.test(await file.text())) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

describe('docs truth law — honest Tsotchke wiring', () => {
  test('no living surface asserts a blanket wiring=1.0', async () => {
    const offenders: string[] = [];
    for (const rel of LIVING) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      if (/wiring\s*=\s*1\.0/i.test(await file.text())) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  test('living surfaces acknowledge the fenced LLM/chain/API repos', async () => {
    for (const rel of LIVING) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      expect((await file.text()).toLowerCase()).toContain('fenced');
    }
  });
});
