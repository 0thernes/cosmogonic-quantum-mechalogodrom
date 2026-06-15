/**
 * Architectural invariant guard: import DIRECTION (the layering the ARCHITECT master mandates —
 * exclusive ownership, no upward dependencies). Distinct from leaf-dom-freedom.test.ts (which bans
 * DOM *API references*): this bans the deterministic leaves from *importing* the layers above them.
 *
 *   - `src/sim/**`  must never import from the UI or server layers (ui → sim is the allowed
 *     direction; the deterministic substrate must stay independent of the rendered spectacle).
 *   - `src/math/**` is the lowest leaf — it imports only `../types` (the shared contract) and
 *     external libs, never sim / ui / server / core / audio / logging.
 *
 * An upward import would couple the layers, drag presentation code into the headless test graph,
 * and let the same-seed golden silently stop covering a leaf. Verified clean today; pinned so it stays.
 */
import { describe, expect, test } from 'bun:test';

/** Strip comments so a commented-out import is not a false positive (keep `://`). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Every module specifier in a `from '...'` / side-effect `import '...'` statement. */
function importSpecifiers(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/(?:from|import)\s+'([^']+)'/g)) out.push(m[1]!);
  return out;
}

/** True when `spec` references `layer` as a path segment (e.g. `../ui/foo`, `../../server`). */
function importsLayer(spec: string, layer: string): boolean {
  return new RegExp(`(^|/)${layer}(/|$)`).test(spec);
}

async function scan(
  dir: string,
  forbidden: readonly string[],
): Promise<{ offenders: string[]; scanned: number }> {
  const offenders: string[] = [];
  let scanned = 0;
  const glob = new Bun.Glob(dir);
  for await (const path of glob.scan('.')) {
    scanned++;
    const code = stripComments(await Bun.file(path).text());
    for (const spec of importSpecifiers(code)) {
      for (const layer of forbidden) {
        if (importsLayer(spec, layer))
          offenders.push(`${path} → imports ${spec} (forbidden layer '${layer}')`);
      }
    }
  }
  return { offenders, scanned };
}

describe('architecture — leaves never import the layers above them', () => {
  test('the detector flags an upward import and clears allowed ones (guard is not vacuous)', () => {
    // Would CATCH a real violation:
    expect(importsLayer('../ui/audit-dock', 'ui')).toBe(true);
    expect(importsLayer('../../server/copilot', 'server')).toBe(true);
    expect(importsLayer('../sim/entities', 'sim')).toBe(true);
    // Does NOT false-positive on the allowed leaf imports or look-alike names:
    expect(importsLayer('../types', 'sim')).toBe(false);
    expect(importsLayer('../math/rng', 'sim')).toBe(false);
    expect(importsLayer('three/addons/postprocessing/RenderPass.js', 'ui')).toBe(false);
    expect(importsLayer('../observer/x', 'server')).toBe(false); // 'server' ⊄ 'observer'
  });

  test('src/sim/** never imports the UI or server layers', async () => {
    const { offenders, scanned } = await scan('src/sim/**/*.ts', ['ui', 'server']);
    expect(scanned).toBeGreaterThan(30); // sanity: the glob matched the sim files
    expect(offenders).toEqual([]);
  });

  test('src/math/** imports only ../types + external libs (no sim/ui/server/core/audio/logging)', async () => {
    const { offenders, scanned } = await scan('src/math/**/*.ts', [
      'sim',
      'ui',
      'server',
      'core',
      'audio',
      'logging',
    ]);
    expect(scanned).toBeGreaterThan(3); // sanity: the glob matched the math leaves
    expect(offenders).toEqual([]);
  });
});
