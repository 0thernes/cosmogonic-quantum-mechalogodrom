/**
 * DOCS TRUTH LAW — gate enforcement of doc honesty + encoding (root-cause fix).
 *
 * The autonomous doc-writing loop has repeatedly (a) corrupted README/docs into
 * UTF-8 mojibake and (b) overclaimed Tsotchke wiring ("wiring=1.0" across the
 * board, omitting that four external LLM/chain/license-boundary repos are deliberately fenced). These
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
import { readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

/** Living, authoritative surfaces that must state the wiring truthfully. */
const LIVING = [
  'README.md',
  'docs/ARCHITECTURE-2026-06-26.md',
  'docs/MODULE-CONTRACTS-2026-06-26.md',
];

/** Canonical surfaces whose encoding must stay clean (the user-named living docs). */
const CANONICAL = [
  'README.md',
  'docs/ARCHITECTURE-2026-06-26.md',
  'docs/MODULE-CONTRACTS-2026-06-26.md',
  'docs/TECHNICAL-SPECIFICATION-2026-06-26.md',
  'docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md',
];

/**
 * Byte signatures that only occur when UTF-8 is re-encoded as Windows-1252:
 *  â€ = "â€" (em/en dash, smart quotes), Â  = "Â<nbsp>",
 *  ðŸ = "ðŸ" (emoji lead), Ã = "Ã" (double-encoded latin), � = replacement char.
 */
const MOJIBAKE = /â€|Â |ðŸ|Ã[¢-¿]|�/;

// Curly quotes “/” ("..."): this repo's prose uses straight quotes + em/en dashes only, never
// curly quotes, so these only appear when the loop mangles an em-dash (—) into one (it renders as a broken
// quote on the GitHub front page). There are no legitimate curly-quote pairs in the canonical docs. The
// \u escapes keep THIS test file resilient to the same corruption. Fix offenders with a dash-restore pass:
// perl -i -CSD -pe 's/“–/—/g; s/”/—/g; s/“/–/g;' <file>.
const CURLY_QUOTE = new RegExp('[\\u201C\\u201D]');

// Sub-lead-byte + orphaned-tail corruption the MOJIBAKE pattern misses (these ride BELOW the multi-byte
// range): U+0178 (surviving lead of a lost-lead emoji tail), the C1 control block U+0080-U+009F, and
// U+00A6 (surviving tail of a horizontal ellipsis: U+2026 = E2 80 A6, lead bytes lost -> bare A6). None
// is ever legitimate in this repo's prose. (\u escapes keep this file pure ASCII.)
const SUBLEAD = new RegExp('[\\u0080-\\u009F\\u00A6\\u0178]');

describe('docs truth law — encoding', () => {
  test('no UTF-8 mojibake or curly-quote dash-mangling in the canonical living docs', async () => {
    const offenders: string[] = [];
    for (const rel of CANONICAL) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = await file.text();
      if (MOJIBAKE.test(text) || CURLY_QUOTE.test(text) || SUBLEAD.test(text)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * Deployed HTML surfaces (GitHub Pages: index/docs/specs.html). The .md normalizer globs .md/.xml
 * and the encoding test above scans only .md/.xml, so lossy U+FFFD replacement chars and a broken
 * `class="<FFFD>badge<FFFD>"` repeatedly shipped to the live site with green CI. This gate closes
 * that hole — no mojibake / U+FFFD / sub-lead-byte corruption may reach the HTML either.
 */
const HTML_SURFACES = ['index.html', 'docs.html', 'specs.html'];

describe('docs truth law — encoding (deployed HTML surfaces)', () => {
  test('no UTF-8 mojibake / U+FFFD / sub-lead-byte corruption in the deployed HTML', async () => {
    const offenders: string[] = [];
    for (const rel of HTML_SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const ht = await file.text();
      if (MOJIBAKE.test(ht) || SUBLEAD.test(ht)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

// Steering XML (the 3 master files) + the KANBAN board sit OUTSIDE the .md CANONICAL list and the HTML
// list, so their corruption shipped unseen with green CI: each master carried ~150 box-drawing rules
// (U+2550) re-encoded into double-encoding mojibake, and KANBAN carried orphaned-emoji fragments +
// curly-quote-as-em-dash separators. normalize-docs.ts now also globs the master + report XML so they get
// repaired; this gate keeps them clean no matter what writer touches them. (Kept as line comments + pure
// ASCII so this corruption-detector can never itself be corrupted.)
const STEERING_SURFACES = [
  'masters/LEGENDARY-SUPER-SAIYAN-BROLY-MANIFESTO.xml',
  'masters/ORACLE-ARCHITECT-OF-THE-DARKSIDE-STARKILLER.xml',
  'masters/GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN.xml',
  'docs/KANBAN-2026-06-26.md',
];

describe('docs truth law — encoding (steering XML + KANBAN)', () => {
  test('no mojibake / U+FFFD / sub-lead-byte / curly-quote corruption in the steering surfaces', async () => {
    const offenders: string[] = [];
    for (const rel of STEERING_SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = await file.text();
      if (MOJIBAKE.test(text) || SUBLEAD.test(text) || CURLY_QUOTE.test(text)) offenders.push(rel);
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
  'ROADMAP-2026-06-26.md',
  'docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md',
  'docs/ARCHITECTURE-2026-06-26.md',
  'docs/TECHNICAL-SPECIFICATION-2026-06-26.md',
  '.github/copilot-instructions.md',
  'docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md',
  'docs/PHILOSOPHY-2026-06-26.md',
  'masters/LEGENDARY-SUPER-SAIYAN-BROLY-MANIFESTO.xml',
  'masters/GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN.xml',
  'masters/ORACLE-ARCHITECT-OF-THE-DARKSIDE-STARKILLER.xml',
  // Deployed front-page HTML — repeatedly shipped "144 faculties" / "15 emergence angles" to the
  // live site because this list never policed it. Now gated like every other public surface.
  'index.html',
  'docs.html',
  'specs.html',
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
    re: /14\s*\/\s*14\s+(?:structural\s+)?(?:scaffolding\s+)?achieved/i,
    label: '"14/14 (structural/scaffolding) achieved" (verified: 8/14 met + 6/14 partial)',
  },
  {
    // "14/14" immediately followed by an achievement verb (no honest qualifier between). Requires the
    // verb adjacent so it can't trip on honest framing like "path to 14/14, not complete" or
    // "Butlin 14/14 | … 8/14 MET". Catches "14/14 achieved", "14/14 is complete", "14/14 fully met".
    re: /14\s*\/\s*14\s+(?:is\s+|are\s+|now\s+|fully\s+)?(?:achieved|complete|met)\b/i,
    label:
      '"14/14 achieved/complete/met" (verified: 8/14 met + 6/14 partial; on the path, not complete)',
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
          'docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md:\n  - ' +
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

  test('living surfaces acknowledge the corrected four-repository fence', async () => {
    for (const rel of LIVING) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = (await file.text()).toLowerCase();
      expect(text).toContain('fenced');
      expect(text).toContain('obliteratus');
    }
  });
});

// Unresolved git conflict markers must NEVER ship. A botched fleet rebase once left a ">>>>>>> <sha>"
// line committed in docs/VERIFICATION-ANALYTICAL-DATA.md that NO existing gate caught (prettier accepts
// it as plain text, and the encoding scans only cover allow-lists). This scans EVERY tracked, non-binary,
// non-legacy file. The marker strings are built programmatically (repeat()) so this test file stays clean
// and never matches itself. Only the unambiguous "<<<<<<< " / ">>>>>>> " ends are checked — a bare
// "=======" line collides with Markdown setext headings, so it is intentionally not matched.
const CONFLICT_OPEN = '<'.repeat(7) + ' ';
const CONFLICT_CLOSE = '>'.repeat(7) + ' ';
const BINARY_EXT =
  /\.(png|jpe?g|gif|ico|webp|svg|woff2?|ttf|otf|eot|mp[34]|wav|bmp|pdf|zip|gz|lock|wasm)$/i;
const ROOT = resolve(import.meta.dir, '..');
const FALLBACK_SKIP_DIRS = new Set([
  '.agents',
  '.codex',
  '.git',
  'coverage',
  'dist',
  'legacy',
  'node_modules',
]);

function repoRel(abs: string): string {
  return relative(ROOT, abs).split(sep).join('/');
}

async function listRepoFilesFallback(dir = ROOT): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const abs = resolve(dir, entry.name);
    const rel = repoRel(abs);
    const top = rel.split('/')[0] ?? rel;
    if (FALLBACK_SKIP_DIRS.has(entry.name) || FALLBACK_SKIP_DIRS.has(top)) continue;
    if (entry.isDirectory()) {
      files.push(...(await listRepoFilesFallback(abs)));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

async function conflictScanFiles(): Promise<string[]> {
  try {
    const stdout = Bun.spawnSync(['git', '-C', ROOT, 'ls-files']).stdout.toString();
    const tracked = stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (tracked.length > 0) return tracked;
  } catch {
    // Managed Windows sandboxes may deny nested child processes; fall through to the in-process walk.
  }
  return listRepoFilesFallback();
}

describe('docs truth law — no unresolved git conflict markers', () => {
  test('no tracked text file contains a git conflict marker', async () => {
    const offenders: string[] = [];
    for (const rel of await conflictScanFiles()) {
      if (rel.startsWith('legacy/') || BINARY_EXT.test(rel)) continue;
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = await file.text();
      if (text.split('\n').some((l) => l.startsWith(CONFLICT_OPEN) || l.startsWith(CONFLICT_CLOSE)))
        offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  }, 30_000);
});

describe('docs truth law — consolidation hygiene', () => {
  test('the entity schema preserves literal wildcard references', async () => {
    const text = await Bun.file('docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md').text();
    expect(text).toContain('reports/2026-06-20-*');
    expect(text).toContain('tsotchke-*.ts');
    expect(text).not.toContain('reports/2026-06-20-_');
    expect(text).not.toContain('tsotchke-_.ts');
  });

  test('no extensionless TypeScript-like source duplicates are tracked', async () => {
    const offenders: string[] = [];
    for (const rel of await conflictScanFiles()) {
      if (BINARY_EXT.test(rel)) continue;
      if (!rel.startsWith('src/') && !rel.startsWith('bench/')) continue;
      const leaf = rel.split('/').pop() ?? rel;
      if (leaf.includes('.')) continue;
      const sibling = Bun.file(`${rel}.ts`);
      if (!(await sibling.exists())) continue;
      const text = await Bun.file(rel).text();
      if (/\b(?:import|export|interface|class|type|enum|const|let)\b/.test(text)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
