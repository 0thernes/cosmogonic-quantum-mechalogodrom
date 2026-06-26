/**
 * sync-surfaces.ts — propagate canonical.ts into every surface that repeats a shared fact,
 * so a number lives in ONE place and updates everywhere at once. Two mechanisms:
 *
 *   1. Marker spans (works in .md AND .html — both honour HTML comments):
 *        <!--canon:version-->0.17.1<!--/canon-->
 *      The text between the open/close marker is rewritten to CANON[key]. Add a marker
 *      anywhere the fact appears and it is kept in lockstep forever.
 *
 *   2. package.json "description" — regenerated wholesale from PKG_DESCRIPTION (JSON can't
 *      carry comment markers), so the npm/GitHub blurb can never drift from the numbers.
 *
 * Usage:
 *   bun run sync          rewrite all surfaces, print what changed
 *   bun run sync:check    report drift and exit 1 (wired into the gate via docs-sync-law.test.ts)
 *
 * Companion gate: tests/docs-sync-law.test.ts asserts every surface is already in sync.
 */
import { CANON, PKG_DESCRIPTION } from './canonical';

/** Surfaces that may carry <!--canon:*--> markers. (Globs kept explicit + small on purpose.) */
const MARKER_SURFACES = [
  'README.md',
  'ROADMAP.md',
  'AGENTS.md',
  'docs.html',
  'specs.html',
  'index.html',
  'docs/ARCHITECTURE.md',
  'docs/NHSI-PROGRESS-DASHBOARD.md',
  'docs/TECHNICAL-SPECIFICATION.md',
];

const MARKER_RE = /<!--canon:([A-Za-z0-9_]+)-->[\s\S]*?<!--\/canon-->/g;
const checkOnly = process.argv.includes('--check');

let drift = 0;
const unknown = new Set<string>();

for (const rel of MARKER_SURFACES) {
  const file = Bun.file(rel);
  if (!(await file.exists())) continue;
  const original = await file.text();
  const fixed = original.replace(MARKER_RE, (whole, key: string) => {
    const val = CANON[key];
    if (val === undefined) {
      unknown.add(`${rel}: <!--canon:${key}--> has no value in canonical.ts`);
      return whole;
    }
    return `<!--canon:${key}-->${val}<!--/canon-->`;
  });
  if (fixed !== original) {
    drift++;
    if (checkOnly) console.log(`drift: ${rel}`);
    else {
      await Bun.write(rel, fixed);
      console.log(`synced: ${rel}`);
    }
  }
}

// package.json description (no comment markers possible in JSON — regenerate the value).
{
  const rel = 'package.json';
  const original = await Bun.file(rel).text();
  const descRe = /("description":\s*")(?:[^"\\]|\\.)*(")/;
  if (descRe.test(original)) {
    const fixed = original.replace(descRe, (_m, a: string, b: string) => a + PKG_DESCRIPTION + b);
    if (fixed !== original) {
      drift++;
      if (checkOnly) console.log(`drift: ${rel} (description)`);
      else {
        await Bun.write(rel, fixed);
        console.log(`synced: ${rel} (description)`);
      }
    }
  }
}

if (unknown.size > 0) {
  console.error('\nUnknown canon keys (add them to CANON in scripts/canonical.ts):');
  for (const u of unknown) console.error('  - ' + u);
  process.exit(1);
}
if (checkOnly && drift > 0) {
  console.error(`\n${drift} surface(s) drifted from canonical.ts — run: bun run sync`);
  process.exit(1);
}
console.log(drift === 0 ? 'all surfaces in sync with canonical.ts' : `synced ${drift} surface(s)`);
