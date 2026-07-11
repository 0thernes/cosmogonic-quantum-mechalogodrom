/**
 * verify:alife (as a gate test) — the A-Life 9-axis code-grounded numbers are COMPUTED-AND-GATED, not
 * hand-typed. Closes the drift hole batch-15b left open: the code-grounded breadth/z live in
 * `CODE_GROUNDED` (alife-codeground-sensitivity.ts), are rendered into `alife-codeground.json`, and are
 * hand-cited on 4 narrative surfaces — none of it was gated. This test recomputes from the CSV +
 * CODE_GROUNDED and fails `bun run check` when (a) the committed JSON is stale (a floor/CSV edit that
 * forgot to regenerate), or (b) a surface number was hand-edited away from the computed value.
 *
 * Same SSOT discipline as tests/docs-receipts-law.test.ts does for the test-count receipt.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { computeAlifeCodeground } from '../scripts/alife-codeground-sensitivity';

const ROOT = `${import.meta.dir}/..`;
const read = (p: string): string => readFileSync(`${ROOT}/${p}`, 'utf8');

describe('A-Life code-grounded stats are computed-and-gated (no silent drift)', () => {
  const computed = computeAlifeCodeground(
    read('docs/reports/2026-06-26-alife-comparison-matrix.csv'),
  );
  const committed = JSON.parse(read('docs/reports/assets/alife-codeground.json')) as unknown;

  test('committed alife-codeground.json equals a fresh recompute (edit CODE_GROUNDED/CSV without regen → fail)', () => {
    expect(committed).toEqual(computed);
  });

  test('every current narrative surface cites the current code-grounded figure (hand-edit → fail)', () => {
    const cg = computed.codeGrounded as { breadth: number; zPopulation: number };
    const breadth = cg.breadth.toFixed(2); // e.g. "3.71"
    const zPop = `+${cg.zPopulation.toFixed(3)}`; // exact published current receipt, e.g. "+2.954"
    // README / docs.html / specs.html render the code-grounded breadth as "<breadth> / 5".
    for (const surface of ['README.md', 'docs.html', 'specs.html']) {
      expect(read(surface)).toContain(`${breadth} / 5`);
    }
    // The NHSI dashboard cites the code-grounded z-population at receipt precision.
    expect(read('docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md')).toContain(
      `population z \`${zPop}\``,
    );
  });

  test('the honest FLOOR never exceeds the self-scored ceiling on any axis (no inflation past the self-score)', () => {
    const self = (computed.selfScored as { axes: number[] }).axes;
    const floor = (computed.codeGrounded as { axes: number[] }).axes;
    for (let i = 0; i < self.length; i++) expect(floor[i]!).toBeLessThanOrEqual(self[i]!);
  });
});
