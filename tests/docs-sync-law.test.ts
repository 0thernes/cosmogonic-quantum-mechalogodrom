/**
 * DOCS SYNC LAW — the single-source-of-truth gate.
 *
 * Shared facts (version, NHSI numbers, the package.json blurb) used to be hand-copied into a
 * dozen surfaces and drifted apart — package.json said "144 faculties / 15 emergence angles"
 * while docs.html said "100 / 10". scripts/canonical.ts is now the ONE source; this gate FAILS
 * `bun run check` / CI the moment any surface disagrees with it, so the fix is always:
 *     bun run sync            # rewrite every surface from canonical.ts
 *
 * Covers three propagation channels (see scripts/sync-surfaces.ts):
 *   1. package.json "version" must equal canonical VERSION.
 *   2. package.json "description" must equal the generated PKG_DESCRIPTION.
 *   3. every <!--canon:KEY-->…<!--/canon--> marker must hold exactly CANON[KEY].
 *
 * Companion: scripts/canonical.ts, scripts/sync-surfaces.ts, tests/docs-receipts-law.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import { CANON, PKG_DESCRIPTION, VERSION } from '../scripts/canonical';

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
const MARKER_RE = /<!--canon:([A-Za-z0-9_]+)-->([\s\S]*?)<!--\/canon-->/g;

describe('docs sync law — canonical.ts is the single source of truth', () => {
  test('package.json version equals canonical VERSION', async () => {
    const pkg = JSON.parse(await Bun.file('package.json').text());
    expect(pkg.version).toBe(VERSION);
  });

  test('package.json description is generated from canonical (run `bun run sync` to fix)', async () => {
    const pkg = JSON.parse(await Bun.file('package.json').text());
    expect(pkg.description).toBe(PKG_DESCRIPTION);
  });

  test('every <!--canon:KEY--> marker holds the canonical value (run `bun run sync` to fix)', async () => {
    const offenders: string[] = [];
    for (const rel of MARKER_SURFACES) {
      const file = Bun.file(rel);
      if (!(await file.exists())) continue;
      const text = await file.text();
      for (const m of text.matchAll(MARKER_RE)) {
        const key = m[1]!;
        const val = m[2]!;
        if (!(key in CANON)) offenders.push(`${rel}: unknown canon key "${key}"`);
        else if (val !== CANON[key])
          offenders.push(`${rel}: canon:${key} = "${val}" but canonical = "${CANON[key]}"`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Surfaces drifted from canonical.ts — run `bun run sync`:\n  - ' + offenders.join('\n  - '),
      );
    }
    expect(offenders).toEqual([]);
  });
});
