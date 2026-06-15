/**
 * Architectural invariant guard: the simulation + math layers are DOM-FREE. `src/sim/**` and
 * `src/math/**` must never touch `document` / `window` listeners / DOM element types — that freedom is
 * exactly what lets the whole test suite run headlessly (fake-ctx pattern) and what keeps the
 * deterministic substrate separable from the rendered spectacle (PHILOSOPHY + the leaf-import rule in
 * types.ts). If a sim/math module reaches into the DOM, headless tests + the same-seed golden silently
 * stop being able to exercise it; this guard fails loudly instead.
 *
 * Verified clean across the codebase by the 2026-06-15 inspection (ARCH-07); now pinned so it stays so.
 */
import { describe, expect, test } from 'bun:test';

const DOM_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'document.*', re: /\bdocument\s*\./ },
  { name: 'getElementById', re: /\bgetElementById\s*\(/ },
  { name: 'querySelector', re: /\bquerySelector(All)?\s*\(/ },
  { name: 'window.addEventListener', re: /\bwindow\s*\.\s*addEventListener\s*\(/ },
  { name: 'HTMLElement', re: /\bHTML[A-Za-z]*Element\b/ },
];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('architecture — the sim + math layers are DOM-free (headless-testable leaves)', () => {
  test('no src/sim/** or src/math/** file references the DOM', async () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const dir of ['src/sim/**/*.ts', 'src/math/**/*.ts']) {
      const glob = new Bun.Glob(dir);
      for await (const path of glob.scan('.')) {
        scanned++;
        const code = stripComments(await Bun.file(path).text());
        for (const { name, re } of DOM_PATTERNS) {
          if (re.test(code)) offenders.push(`${path} → ${name}`);
        }
      }
    }
    expect(scanned).toBeGreaterThan(30); // sanity: the globs actually matched the leaf files
    expect(offenders).toEqual([]); // any entry breaks the DOM-free leaf invariant
  });
});
