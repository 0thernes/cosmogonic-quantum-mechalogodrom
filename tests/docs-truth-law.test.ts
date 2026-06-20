/**
 * DOCS TRUTH LAW — gate enforcement of doc honesty + encoding (root-cause fix).
 *
 * The autonomous doc-writing loop has repeatedly (a) corrupted README/docs into
 * UTF-8 mojibake and (b) overclaimed Tsotchke wiring ("wiring=1.0" across the
 * board, omitting that the 4 LLM/chain/API repos are deliberately fenced). These
 * tests make `bun run check` / CI FAIL on either problem, so no writer — script
 * or LLM loop — can publish corrupted or untruthful docs. The fix tool is
 * `bun scripts/normalize-docs.ts` (encoding); truth is a manual edit.
 *
 * Companion: scripts/normalize-docs.ts, tests/docs-receipts-law.test.ts.
 */
import { describe, expect, test } from 'bun:test';

/** Living, authoritative surfaces that must state the wiring truthfully. */
const LIVING = ['README.md', 'docs/ARCHITECTURE.md', 'docs/MODULE-CONTRACTS.md'];

/** Sequences that only occur when UTF-8 was re-encoded as Windows-1252 (mojibake). */
const MOJIBAKE = /â€|Â |ðŸ|Ã¢|�/;

async function allDocFiles(): Promise<string[]> {
  const glob = new Bun.Glob('docs/**/*.md');
  const files = ['README.md', 'CHANGELOG.md', 'ROADMAP.md'];
  for await (const f of glob.scan('.')) files.push(f);
  return files;
}

describe('docs truth law — encoding', () => {
  test('no UTF-8 mojibake in README, CHANGELOG, ROADMAP, or any docs/*.md', async () => {
    const offenders: string[] = [];
    for (const rel of await allDocFiles()) {
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
