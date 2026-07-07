#!/usr/bin/env bun
/**
 * sync-surfaces.ts — the ONE propagator that keeps duplicated facts identical across every
 * human-readable surface (MD + HTML). Single source of truth in, all surfaces out, automatically.
 *
 *   Source of truth          ->  propagated token
 *   -----------------------------------------------------------------
 *   package.json `version`   ->  the CURRENT-version markers (badges, "Package vX.Y.Z",
 *                                "vX.Y.Z @ current", the package.json description tail)
 *   scripts/canonical-receipts.ts (CANONICAL_TEST_COUNT / LINE_COV / FUNC_COV)
 *                            ->  every `tests-NNNN` / `NN.NN% line / NN.NN% func` receipt token
 *
 * Run by the pre-commit hook (so a commit can never ship drifted surfaces) and standalone:
 *     bun scripts/sync-surfaces.ts          # rewrite surfaces in place
 *     bun scripts/sync-surfaces.ts --check  # report only, exit 1 if any surface would change
 *
 * SURGICAL on version: only explicit current-version markers are rewritten — HISTORICAL references
 * ("Super Creature 1.1 released as v0.11.0") are left untouched, because they are facts about the
 * past, not claims about the present. Policed by tests/docs-consistency-law.test.ts +
 * tests/docs-receipts-law.test.ts so CI fails if anything drifts back out of sync.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');

/** Single source of truth: the package version. */
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

/** Single source of truth: the measured canonical receipts. */
const receiptsSrc = readFileSync('scripts/canonical-receipts.ts', 'utf8');
const TEST = receiptsSrc.match(/CANONICAL_TEST_COUNT = (\d+);/)?.[1];
const LINE = receiptsSrc.match(/CANONICAL_LINE_COV = '([0-9]+\.[0-9]+)';/)?.[1];
const FUNC = receiptsSrc.match(/CANONICAL_FUNC_COV = '([0-9]+\.[0-9]+)';/)?.[1];
if (!TEST || !LINE || !FUNC)
  throw new Error('sync-surfaces: cannot parse scripts/canonical-receipts.ts');
const TEST_COMMA = Number(TEST).toLocaleString('en-US');

/** Single source of truth: the NHSI design facts (sibling constants in canonical-receipts.ts). */
const nhsi = (name: string): string =>
  receiptsSrc.match(new RegExp(`${name} = (\\d+);`))?.[1] ?? '';
const FACULTIES = nhsi('CANONICAL_FACULTIES');
const ARCHONS = nhsi('CANONICAL_ARCHONS');
const TOM = nhsi('CANONICAL_TOM_ORGANS');
const EMERGENCE = nhsi('CANONICAL_EMERGENCE_ANGLES');
const BIOFORMS = nhsi('CANONICAL_BIOLOGIC_FORMS');
if (!FACULTIES || !ARCHONS || !TOM || !EMERGENCE || !BIOFORMS)
  throw new Error('sync-surfaces: cannot parse NHSI design facts from canonical-receipts.ts');

/** Markdown / HTML surfaces that publish shared facts. */
const SURFACES = [
  'README.md',
  'ROADMAP-2026-06-26.md',
  'docs.html',
  'specs.html',
  'index.html',
  'bible.html',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'NOTICE.md',
  'docs/TECHNICAL-SPECIFICATION-2026-06-26.md',
  'docs/ARCHITECTURE-2026-06-26.md',
  'docs/SUPER-CREATURE-RESEARCH-2026-06-26.md',
  'docs/BENCHMARKS-2026-06-26.md',
  'docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md',
  'docs/KANBAN-2026-06-26.md',
  'docs/MODULE-CONTRACTS-2026-06-26.md',
  'docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md',
  'docs/VERIFICATION-ANALYTICAL-DATA.md',
  'docs/BOOK-2026-06-26.md',
  'docs/RISK-REGISTER-2026-07-02.md',
  'docs/RUNBOOK-2026-06-26.md',
  'docs/DESIGN-SYSTEM-2026-06-26.md',
  'docs/reports/README.md',
  'docs/reports/2026-07-01-25-POINT-SCRUTINY-SCORECARD.md',
];

/** Apply receipts (test count + coverage) propagation. */
function syncReceipts(s: string): string {
  const protectedLocalCoverage: string[] = [];
  const protectLocalCoverage = (match: string): string => {
    const token = `__CQM_LOCAL_COVERAGE_${protectedLocalCoverage.length}__`;
    protectedLocalCoverage.push(match);
    return token;
  };

  let out = s
    .replace(
      /`expect\(\)` calls · \*\*[0-9]{2}\.[0-9]{2}% line \/ [0-9]{2}\.[0-9]{2}% func\*\* on this Windows checkout/g,
      protectLocalCoverage,
    )
    .replace(
      /Windows coverage measured `[0-9]{2}\.[0-9]{2}%` line \/ `[0-9]{2}\.[0-9]{2}%` func/g,
      protectLocalCoverage,
    );

  out = out
    .replace(/tests-[0-9]{3,4}/g, `tests-${TEST}`)
    .replace(/\b[0-9],[0-9]{3}\s+tests\b/g, `${TEST_COMMA} tests`)
    // Anchored to a RECEIPT marker after "tests" so it never rewrites ordinary prose like
    // "we ran 500 tests of X" into the canonical count — a silent, unrecoverable corruption of the
    // owner's factual numbers on commit (data-loss audit 2026-07-01). A novel receipt form that
    // drifts fails sync:check loudly (safe) rather than corrupting prose (unsafe).
    .replace(
      /(?<![,0-9])\b[0-9]{3,4}\s+tests\b(?=\s+green\b|,\s*[0-9]|\s*\(0\s+fail\b|\s*·|\s+pass(?:ing)?\b|\s*\/\s*0\s+fail\b)/g,
      `${TEST} tests`,
    )
    // specs.html stat block splits the number and its "tests" label across two divs
    // (`<div class="n gd">1,477</div><div class="l">tests ...`), so the \s+ variants above
    // never match it and it drifted unseen. Scoped to that exact markup — the `class="l">tests`
    // anchor is unique to the stat card, so no other number can be caught.
    .replace(
      /(<div class="n[^"]*">)[0-9][0-9,]*(<\/div>\s*<div class="l">tests\b)/g,
      `$1${TEST_COMMA}$2`,
    )
    .replace(/\b[0-9],[0-9]{3}\s+pass\b/g, `${TEST_COMMA} pass`)
    .replace(/\b[0-9],[0-9]{3}\s+tests\s*\/\s*0\s+fail\b/g, `${TEST_COMMA} tests / 0 fail`)
    .replace(/(?<![,0-9])\b[0-9]{3,4}\s+tests\s*\/\s*0\s+fail\b/g, `${TEST} tests / 0 fail`)
    .replace(
      /\b[0-9]{2}\.[0-9]{2}%\s+line\s*\/\s*[0-9]{2}\.[0-9]{2}%\s+func\b/g,
      `${LINE}% line / ${FUNC}% func`,
    )
    .replace(
      /\b[0-9]{2}\.[0-9]{2}\s*%\s+line\s*\/\s*[0-9]{2}\.[0-9]{2}\s*%\s+function\b/g,
      `${LINE} % line / ${FUNC} % function`,
    )
    // Bare "LINE% / FUNC%" gate shorthand (e.g. "90.80% / 87.88%") in README/ERD/KANBAN "Gate:" lines.
    // Runs AFTER the worded variants above, so it never touches "NN% line / NN% func".
    // Tied to the preceding "tests" receipt (e.g. "1,984 tests · 91.86% / 89.06%") so it can NEVER
    // clobber an unrelated two-decimal ratio (a benchmark "95.00% / 12.00%") elsewhere in a surface
    // (data-loss audit 2026-07-01). Runs AFTER the worded variants above.
    .replace(
      /(tests[^0-9\n]{0,8})[0-9]{2}\.[0-9]{2}%\s*\/\s*[0-9]{2}\.[0-9]{2}%/g,
      `$1${LINE}% / ${FUNC}%`,
    )
    .replace(
      /coverage-[0-9]{2}\.[0-9]{2}%25%20line%20%C2%B7%20[0-9]{2}\.[0-9]{2}%25%20func/g,
      `coverage-${LINE}%25%20line%20%C2%B7%20${FUNC}%25%20func`,
    )
    .replace(/Line coverage: [0-9]{2}\.[0-9]{2}%/g, `Line coverage: ${LINE}%`)
    .replace(/Function coverage: [0-9]{2}\.[0-9]{2}%/g, `Function coverage: ${FUNC}%`)
    .replace(/Test count: \d+/g, `Test count: ${TEST}`)
    // Backtick / bold receipt tokens in living reports (`1,477` tests, **1,477** tests)
    .replace(/`([0-9],[0-9]{3})`\s+tests/g, `\`${TEST_COMMA}\` tests`)
    .replace(/\*\*([0-9],[0-9]{3})\*\*\s+tests/g, `**${TEST_COMMA}** tests`)
    .replace(/\*\*(?:1,477|2,295)\b/g, `**${TEST_COMMA}`)
    .replace(/`(?:1,477|2,295)`/g, `\`${TEST_COMMA}\``)
    // Canonical coverage shorthand in reports (~95% line / ~92% function)
    .replace(/~95%\s*line\s*\/\s*~92%\s*function/g, `~${LINE}% line / ~${FUNC}% function`)
    .replace(/~95\s*%\s+line\s*\/\s*~92\s*%\s+function/g, `~${LINE} % line / ~${FUNC} % function`)
    .replace(
      /`[0-9]{2}\.[0-9]{2}%`\s+line\s*\/\s*`[0-9]{2}\.[0-9]{2}%`\s+func/g,
      `\`${LINE}%\` line / \`${FUNC}%\` func`,
    )
    .replace(/(\| Line coverage\s+\|\s+`)[0-9]{2}\.[0-9]{2}(%`\s+\|)/g, `$1${LINE}$2`)
    .replace(/(\| Function coverage\s+\|\s+`)[0-9]{2}\.[0-9]{2}(%`\s+\|)/g, `$1${FUNC}$2`)
    .replace(
      /Current canon: \*\*[0-9]{2}\.[0-9]{2}% line \/ [0-9]{2}\.[0-9]{2}% function\*\*/g,
      `Current canon: **${LINE}% line / ${FUNC}% function**`,
    )
    .replace(
      /canonical [0-9]{2}\.[0-9]{2}\s*\/\s*[0-9]{2}\.[0-9]{2}/g,
      `canonical ${LINE} / ${FUNC}`,
    )
    .replace(
      /canonical [0-9]{2}\.[0-9]{2}% line \/ [0-9]{2}\.[0-9]{2}% func/g,
      `canonical ${LINE}% line / ${FUNC}% func`,
    )
    .replace(
      /canonical [0-9]{2}\.[0-9]{2} line \/ [0-9]{2}\.[0-9]{2} function/g,
      `canonical ${LINE} line / ${FUNC} function`,
    )
    .replace(/\b[0-9],[0-9]{3}-test\b/g, `${TEST_COMMA}-test`)
    .replace(/\b[0-9],[0-9]{3}-test floor\b/g, `${TEST_COMMA}-test floor`)
    .replace(/(\| Test count \(floor\)\s+\|\s+`)[0-9]+(`)/g, `$1${TEST}$2`)
    .replace(/\*\*([0-9],[0-9]{3})\*\* \(floor/g, `**${TEST_COMMA}** (floor`)
    .replace(/\b[0-9]{2}\.[0-9]{2} % \/ [0-9]{2}\.[0-9]{2} %/g, `${LINE} % / ${FUNC} %`)
    .replace(/\b[0-9],[0-9]{3} passing tests\b/g, `${TEST_COMMA} passing tests`)
    .replace(/\b[0-9],[0-9]{3} \(0 failing\)/g, `${TEST_COMMA} (0 failing)`)
    .replace(/bun test \([0-9],[0-9]{3} tests\)/g, `bun test (${TEST_COMMA} tests)`)
    .replace(/"([0-9],[0-9]{3}) tests, 0 failing"/g, `"${TEST_COMMA} tests, 0 failing"`)
    .replace(/"([0-9]{2}\.[0-9]{2})% line coverage"/g, `"${LINE}% line coverage"`)
    .replace(
      /Coverage line ≥ 0\.90(\s+\|\s+✅ )[0-9]{2}\.[0-9]{2}%/g,
      `Coverage line ≥ 0.90$1${LINE}%`,
    )
    .replace(
      /Coverage func ≥ 0\.85(\s+\|\s+✅ )[0-9]{2}\.[0-9]{2}%/g,
      `Coverage func ≥ 0.85$1${FUNC}%`,
    )
    .replace(/\*\*~95 \/ ~92\*\*/g, `**~${LINE} / ~${FUNC}**`)
    // Generic matchers for outdated canonical floors in tables, lists or specific sentences
    .replace(
      /\*\*([0-9],[0-9]{3})\*\*\s+\(canonical floor;\s*[0-9]\s+failing\)/g,
      `**${TEST_COMMA}** (canonical floor; 0 failing)`,
    )
    .replace(/`([0-9],[0-9]{3})`-test/g, `\`${TEST_COMMA}\`-test`)
    .replace(/\b([0-9],[0-9]{3})-test\s+canonical\s+floor\b/g, `${TEST_COMMA}-test canonical floor`)
    .replace(
      /\*\*([0-9],[0-9]{3})-test\s+canonical\s+floor\s*\/\s*[0-9]{2}\.[0-9]{2}%\s*\/\s*[0-9]{2}\.[0-9]{2}%\*\*/g,
      `**${TEST_COMMA}-test canonical floor / ${LINE}% / ${FUNC}%**`,
    )
    .replace(
      /\*\*([0-9],[0-9]{3})\s*\/\s*[0-9]{2}\.[0-9]{2}%\s*\/\s*[0-9]{2}\.[0-9]{2}%\*\*/g,
      `**${TEST_COMMA} / ${LINE}% / ${FUNC}%**`,
    );

  for (let i = 0; i < protectedLocalCoverage.length; i++) {
    out = out.replace(`__CQM_LOCAL_COVERAGE_${i}__`, protectedLocalCoverage[i]!);
  }

  return out;
}

/** Apply CURRENT-version propagation. Only explicit present-tense markers — never historical refs. */
function syncVersion(s: string): string {
  return (
    s
      .replace(/Package\s+\*\*v?0\.[0-9]+\.[0-9]+\*\*/g, `Package **v${VERSION}**`)
      .replace(/Package\s+v?0\.[0-9]+\.[0-9]+/g, `Package v${VERSION}`)
      .replace(
        /Package\/source version:\s+\*\*v?0\.[0-9]+\.[0-9]+\*\*/g,
        `Package/source version: **v${VERSION}**`,
      )
      .replace(/(`scripts\/canonical-receipts\.ts`\s+\(v)0\.[0-9]+\.[0-9]+/g, `$1${VERSION}`)
      .replace(/v?0\.[0-9]+\.[0-9]+\s+@\s+current/g, (m) =>
        m.includes('\n')
          ? m.replace(/v?0\.[0-9]+\.[0-9]+/, `v${VERSION}`)
          : `v${VERSION} @ current`,
      )
      .replace(/version-0\.[0-9]+\.[0-9]+/g, `version-${VERSION}`)
      .replace(
        /reviewed:\s*[0-9-]{10}\s*\|\s*v0\.[0-9]+\.[0-9]+/g,
        `reviewed: 2026-07-07 | v${VERSION}`,
      )
      .replace(/(\| Package version\s+\|\s+`)0\.[0-9]+\.[0-9]+(`)/g, `$1${VERSION}$2`)
      // TECH-SPEC / spec-header "**Version:** vX.Y.Z" — the one current-version marker this missed,
      // which left TECHNICAL-SPECIFICATION-2026-06-26.md stuck a version behind until hand-reconciled. Now durable.
      .replace(/(\*\*Version:\*\*\s+)v?0\.[0-9]+\.[0-9]+/g, `$1v${VERSION}`)
      // Present-tense doc headers that stamp the CURRENT version next to current data: ERD
      // "Scope (vX)", KANBAN "Status (vX)", MODULE-CONTRACTS "...WIRE ERA (vX)". One occurrence
      // each, never a historical series — the TECH-SPEC release tag "(v0.11.0)" uses a different
      // shape (no Scope/Status/ERA prefix) and is correctly left untouched.
      .replace(/(Scope \(v?)0\.[0-9]+\.[0-9]+/g, `$1${VERSION}`)
      .replace(/(Status \(v?)0\.[0-9]+\.[0-9]+/g, `$1${VERSION}`)
      .replace(/(ERA \(v?)0\.[0-9]+\.[0-9]+/g, `$1${VERSION}`)
      // docs.html prose current-version slots the patterns above missed (left them stuck at 0.12.0):
      //   the file-tree note "version history -> X" and "(0.7.0 -> X, Tsotchke Petri full, current)".
      // Scoped tightly so they never touch a historical era label.
      .replace(/(version history (?:&rarr;|→)\s*)v?0\.[0-9]+\.[0-9]+/g, `$1${VERSION}`)
      .replace(
        /((?:&rarr;|→)\s*)v?0\.[0-9]+\.[0-9]+(,\s*Tsotchke Petri full, current)/g,
        `$1${VERSION}$2`,
      )
      // Living present-tense version stamps (reports, dashboard, docs.html gate line).
      .replace(/\*\*v0\.[0-9]+\.[0-9]+ ·/g, `**v${VERSION} ·`)
      .replace(/\| Repo package\s+\|\s+`v0\.[0-9]+\.[0-9]+`/g, `| Repo package  | \`v${VERSION}\``)
      .replace(
        /Technical Specification · v0\.[0-9]+\.[0-9]+ ·/g,
        `Technical Specification · v${VERSION} ·`,
      )
      .replace(
        /Measured v0\.[0-9]+\.[0-9]+ technical specification/g,
        `Measured v${VERSION} technical specification`,
      )
      .replace(/The v0\.[0-9]+\.[0-9]+ Mechalogodrom Bible/g, `The v${VERSION} Mechalogodrom Bible`)
      .replace(/· v0\.[0-9]+\.[0-9]+ · Butlin/g, `· v${VERSION} · Butlin`)
      .replace(/· \*\*v0\.[0-9]+\.[0-9]+ —/g, `· **v${VERSION} —`)
      .replace(/\*\*Version:\*\* `v0\.[0-9]+\.[0-9]+`/g, `**Version:** \`v${VERSION}\``)
      .replace(
        /Cosmogonic \(v0\.[0-9]+\.[0-9]+, gate green\)/g,
        `Cosmogonic (v${VERSION}, gate green)`,
      )
      .replace(/current as of v0\.[0-9]+\.[0-9]+ \(/g, `current as of v${VERSION} (`)
      .replace(/Build Health \(v0\.[0-9]+\.[0-9]+\)/g, `Build Health (v${VERSION})`)
      .replace(/\*\*Repo:\*\* `v0\.[0-9]+\.[0-9]+`/g, `**Repo:** \`v${VERSION}\``)
      .replace(/as of 2026-06-26 \(v0\.[0-9]+\.[0-9]+\)/g, `as of 2026-06-26 (v${VERSION})`)
      .replace(
        /\*\*Edition:\*\* v4[^·]*· \*\*Repo:\*\* `v0\.[0-9]+\.[0-9]+`/g,
        `**Edition:** v4 (113-system expansion, 2026-07-02) · **Repo:** \`v${VERSION}\``,
      )
      .replace(/against `v0\.[0-9]+\.[0-9]+`/g, `against \`v${VERSION}\``)
      .replace(/\*\*Build:\*\* v0\.[0-9]+\.[0-9]+/g, `**Build:** v${VERSION}`)
      .replace(/\*\*v0\.[0-9]+\.[0-9]+\*\*,/g, `**v${VERSION}**,`)
      .replace(/\*\*v0\.[0-9]+\.[0-9]+\*\* · `main`/g, `**v${VERSION}** · \`main\``)
      .replace(/Canonical receipts: v0\.[0-9]+\.[0-9]+/g, `Canonical receipts: v${VERSION}`)
      .replace(/stands today: v0\.[0-9]+\.[0-9]+/g, `stands today: v${VERSION}`)
      .replace(/\(v0\.[0-9]+\.[0-9]+\)(?=.*(?:manifesto|NHSI|0thernes))/gi, `(v${VERSION})`)
      .replace(/> v0\.[0-9]+\.[0-9]+ ·/g, `> v${VERSION} ·`)
      .replace(/Bun [^,]+, v0\.[0-9]+\.[0-9]+/g, (m) =>
        m.replace(/v0\.[0-9]+\.[0-9]+/, `v${VERSION}`),
      )
  );
}

/**
 * Propagate the NHSI design counts. SURGICAL: only the unambiguous canonical phrasings, so legit
 * other-framings stay intact ("~20 apex faculties", "5 individuated Archons", "10 + 5 events" are
 * never touched) — matches "-faculty", "Archon pantheon", "ToM/theory-of-mind organs",
 * "emergence angles", "BiologicForms"; never bare "faculties"/"Archons" or "N-Archon" (= individuated).
 */
function syncNHSI(s: string): string {
  return (
    s
      .replace(/\b[0-9]+(-faculty\b)/g, `${FACULTIES}$1`)
      .replace(/\b[0-9]+( Archon pantheons?\b)/g, `${ARCHONS}$1`)
      // NOTE: bare "N-Archon" is NOT synced — "5-Archon live table" legitimately means the 5 individuated
      // apex minds, not the 25-Archon pantheon. Only the unambiguous "Archon pantheon" form is enforced.
      .replace(/\b[0-9]+( (?:ToM|theory-of-mind) organs\b)/g, `${TOM}$1`)
      .replace(/\b[0-9]+( emergence angles\b)/g, `${EMERGENCE}$1`)
      .replace(/\b[0-9]+( BiologicForms\b)/g, `${BIOFORMS}$1`)
  );
}

let changed = 0;
const drift: string[] = [];
for (const file of SURFACES) {
  let s: string;
  try {
    s = readFileSync(file, 'utf8');
  } catch {
    continue; // surface may not exist in every tree
  }
  const next = syncNHSI(syncVersion(syncReceipts(s)));
  if (next !== s) {
    drift.push(file);
    if (!checkOnly) writeFileSync(file, next, 'utf8');
    changed++;
  }
}

// package.json description carries a trailing "vX.Y.Z" that must equal the version field.
{
  const pkgRaw = readFileSync('package.json', 'utf8');
  const pkgNext = pkgRaw.replace(/("description":\s*"[^"]*?)v0\.[0-9]+\.[0-9]+/g, `$1v${VERSION}`);
  if (pkgNext !== pkgRaw) {
    drift.push('package.json');
    if (!checkOnly) writeFileSync('package.json', pkgNext, 'utf8');
    changed++;
  }
}

if (checkOnly) {
  if (changed > 0) {
    console.error(`sync-surfaces --check: ${changed} surface(s) drifted from source of truth:`);
    for (const d of drift) console.error(`   - ${d}`);
    console.error(`   Fix: bun scripts/sync-surfaces.ts`);
    process.exit(1);
  }
  console.log(
    `sync-surfaces --check: all surfaces match v${VERSION} · ${TEST} tests · ${LINE}/${FUNC}%`,
  );
} else {
  console.log(
    changed > 0
      ? `Synced ${changed} surface(s) to v${VERSION} · ${TEST} tests · ${LINE}% line / ${FUNC}% func`
      : `Surfaces already in sync (v${VERSION} · ${TEST} tests · ${LINE}/${FUNC}%)`,
  );
}
