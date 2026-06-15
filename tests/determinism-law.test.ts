/**
 * The #1 law, mechanically enforced (closes the GOV-DET governance gap: determinism was enforced only
 * by convention + the golden, with no lint/test guard). Every source file under `src/sim/**` must be
 * free of the unseeded global PRNG and wall-clock reads — all sim randomness flows through the injected
 * seeded `Rng` (ADR-0004 / contract rule 7). This guard fails loudly the moment any edit (this agent's,
 * the parallel editor's, or a future contributor's) reintroduces a non-deterministic call into the sim
 * layer, long before it could silently break "one seed, one cosmos".
 *
 * `src/world.ts` is intentionally NOT covered here: it carries the single documented, try-guarded
 * `Date.now()` exception (the V48 super-evolution wall-clock catch-up, an explicit META-layer outside
 * the population golden). The sim layer proper has zero such exceptions.
 */
import { describe, expect, test } from 'bun:test';

// Match CALLS only (trailing `(`), so JSDoc prose like "never `Math.random`" is not a false positive.
const BANNED: { name: string; re: RegExp }[] = [
  { name: 'Math.random()', re: /\bMath\s*\.\s*random\s*\(/ },
  { name: 'Date.now()', re: /\bDate\s*\.\s*now\s*\(/ },
  { name: 'performance.now()', re: /\bperformance\s*\.\s*now\s*\(/ },
];

/** Strip block + line comments so doc-comment mentions of the banned APIs are ignored (keep `://`). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('determinism law — the sim layer never reads unseeded randomness or the wall clock', () => {
  test('src/sim/** contains no Math.random / Date.now / performance.now CALLS', async () => {
    const glob = new Bun.Glob('src/sim/**/*.ts');
    const offenders: string[] = [];
    let scanned = 0;
    for await (const path of glob.scan('.')) {
      scanned++;
      const code = stripComments(await Bun.file(path).text());
      for (const { name, re } of BANNED) {
        if (re.test(code)) offenders.push(`${path} → ${name}`);
      }
    }
    expect(scanned).toBeGreaterThan(30); // sanity: the glob actually found the sim files
    expect(offenders).toEqual([]); // any entry here is a determinism-law violation
  });
});
