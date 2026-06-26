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

/** Markdown / HTML surfaces that publish shared facts. */
const SURFACES = [
  'README.md',
  'ROADMAP.md',
  'docs.html',
  'specs.html',
  'index.html',
  'docs/TECHNICAL-SPECIFICATION.md',
  'docs/ARCHITECTURE.md',
  'docs/SUPER-CREATURE-RESEARCH.md',
  'docs/BENCHMARKS.md',
  'docs/CORPUS_INTEGRATION_REPORT.md',
  'docs/NHSI-PROGRESS-DASHBOARD.md',
  // Canonical docs that publish the CURRENT gate figure (single "Gate:" line, no historical
  // receipts to clobber). Their slash-form "LINE% / FUNC%" was drifting unseen until added here.
  'docs/ERD.md',
  'docs/KANBAN.md',
];

/** Apply receipts (test count + coverage) propagation. */
function syncReceipts(s: string): string {
  return (
    s
      .replace(/tests-[0-9]{3,4}/g, `tests-${TEST}`)
      .replace(/\b[0-9],[0-9]{3}\s+tests\b/g, `${TEST_COMMA} tests`)
      .replace(/(?<![,0-9])\b[0-9]{3,4}\s+tests\b/g, `${TEST} tests`)
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
      .replace(/\b[0-9]{2}\.[0-9]{2}%\s*\/\s*[0-9]{2}\.[0-9]{2}%/g, `${LINE}% / ${FUNC}%`)
      .replace(
        /coverage-[0-9]{2}\.[0-9]{2}%25%20line%20%C2%B7%20[0-9]{2}\.[0-9]{2}%25%20func/g,
        `coverage-${LINE}%25%20line%20%C2%B7%20${FUNC}%25%20func`,
      )
      .replace(/Line coverage: [0-9]{2}\.[0-9]{2}%/g, `Line coverage: ${LINE}%`)
      .replace(/Function coverage: [0-9]{2}\.[0-9]{2}%/g, `Function coverage: ${FUNC}%`)
      .replace(/Test count: \d+/g, `Test count: ${TEST}`)
  );
}

/** Apply CURRENT-version propagation. Only explicit present-tense markers — never historical refs. */
function syncVersion(s: string): string {
  return (
    s
      .replace(/Package\s+\*\*v?0\.[0-9]+\.[0-9]+\*\*/g, `Package **v${VERSION}**`)
      .replace(/Package\s+v?0\.[0-9]+\.[0-9]+/g, `Package v${VERSION}`)
      .replace(/v?0\.[0-9]+\.[0-9]+\s+@\s+current/g, `v${VERSION} @ current`)
      .replace(/version-0\.[0-9]+\.[0-9]+/g, `version-${VERSION}`)
      // TECH-SPEC / spec-header "**Version:** vX.Y.Z" — the one current-version marker this missed,
      // which left TECHNICAL-SPECIFICATION.md stuck a version behind until hand-reconciled. Now durable.
      .replace(/(\*\*Version:\*\*\s+)v?0\.[0-9]+\.[0-9]+/g, `$1v${VERSION}`)
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
  const next = syncVersion(syncReceipts(s));
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
