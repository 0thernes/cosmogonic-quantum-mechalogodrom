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

/**
 * Public surfaces whose NHSI claims must match the verified code (2026-06-21 honesty audit). The
 * autonomous doc loop repeatedly re-inflates these to unsupported ACHIEVEMENT numbers (144 faculties,
 * 15 emergence angles, "14/14 achieved", "25 Archons fully implemented", "100% live", "sentience
 * achieved"). This gate FAILS on those specific affirmative overclaims so no writer can publish them —
 * the same forcing function the receipts floor uses for test counts. Targets / paths are fine
 * ("14/14 path", "100-faculty design"); only false ACHIEVEMENT is banned.
 */
const NHSI_SURFACES = [
  'README.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'ROADMAP.md',
  'docs/NHSI-PROGRESS-DASHBOARD.md',
  'docs/ARCHITECTURE.md',
  'docs/TECHNICAL-SPECIFICATION.md',
];

/** Banned affirmative overclaims (verified false). `label` is shown when one is found. */
const OVERCLAIMS: { re: RegExp; label: string }[] = [
  {
    re: /\b144\s*(?:\/\s*144)?\s*\+?\s*facult/i,
    label: '"144 faculties" (verified: 100-faculty design, ~30 deep-wired)',
  },
  {
    re: /\b1[2-9]\s+emergence\b|\b1[2-9]\s*\/\s*1[2-9]\s+emergence/i,
    label:
      '12-19 emergence angles (verified: 10 wired + 5 god-scale EVENTS, not additional angles)',
  },
  {
    re: /14\s*\/\s*14\s+structural\s+(?:scaffolding\s+achieved|receipts)/i,
    label: '"14/14 structural scaffolding achieved/receipts" (verified: 8/14 met + 6/14 partial)',
  },
  {
    re: /14\s*\/\s*14\s+(?:scaffolding\s+)?achieved/i,
    label: '"14/14 achieved" (verified: 8/14 met + 6/14 partial)',
  },
  {
    re: /[Aa]rchons?\s+fully\s+implemented/i,
    label: '"Archons fully implemented" (verified: 5 individuated + 20 light-echo)',
  },
  {
    re: /\bfully\s+implemented\s+(?:with\s+)?brutal\s+god/i,
    label: '"fully implemented with brutal god powers" (verified: 5 individuated + 20 light-echo)',
  },
  {
    re: /\b100%\s+live\b/i,
    label: '"100% live" (verified: 5 of 25 archons individuated; ~30 of 100 faculties deep-wired)',
  },
  {
    re: /(?:achieved|reached)\s+sentience|sentience\s+(?:achieved|reached)/i,
    label: 'a claim of achieved sentience (NOT claimed — indicators are not sentience)',
  },
];

describe('docs truth law — no false NHSI achievement overclaims', () => {
  test('no public surface asserts an unsupported achievement (use the verified numbers / "path" framing)', async () => {
    const offenders: string[] = [];
    for (const rel of NHSI_SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = await file.text();
      for (const { re, label } of OVERCLAIMS) {
        const m = re.exec(text);
        if (m) offenders.push(`${rel}: ${label} — found "${m[0].trim()}"`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Public surfaces claim an NHSI achievement the code does not support. Use the verified numbers ' +
          '(100-faculty design ~30 deep-wired · 5 individuated archons + 20 light-echo · 25 ToM wired · ' +
          '10 emergence angles · Butlin 8/14 met + 6/14 partial) or "path/target" framing. See ' +
          'docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md:\n  - ' +
          offenders.join('\n  - '),
      );
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
