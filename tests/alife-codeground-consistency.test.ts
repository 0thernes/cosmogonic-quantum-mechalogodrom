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
    const zPop = `+${cg.zPopulation.toFixed(3)}`; // exact published current receipt, e.g. "+2.990"
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

  // The surface check above greps for the breadth STRING, which is why a radar that was wrong on four
  // axes shipped unnoticed: docs.html and specs.html inline the nine-axis radar as static markup, and
  // the amber polygon's GEOMETRY — not any number — is what a reader actually sees. It had drifted a
  // full ratchet behind on ecology, cognition, substrate and instrumentation while both pages
  // presented it as current. alife-comparison-stats.ts now re-derives the polygon from the CSV; this
  // decodes the shipped markup back into a vector so a hand-edit or a skipped `gen:alife` fails here.
  test('the inline radar polygon decodes to the code-grounded vector (stale geometry → fail)', () => {
    const axes = (computed.codeGrounded as { axes: number[] }).axes;
    for (const surface of ['docs.html', 'specs.html']) {
      const points = read(surface).match(/<polygon\s+points="([^"]*)"\s+fill="#f59e0b"/)?.[1];
      expect(points, `${surface}: amber Cosmogonic polygon not found`).toBeDefined();
      const decoded = points!.split(' ').map((pair, j) => {
        const [x, y] = pair.split(',').map(Number) as [number, number];
        // chartRadar(): centre (320,318), radius = (v/5)*200, axis j at -90° + j*(360/9).
        const ang = -Math.PI / 2 + (2 * Math.PI * j) / axes.length;
        const r =
          Math.abs(Math.cos(ang)) > 0.3 ? (x - 320) / Math.cos(ang) : (y - 318) / Math.sin(ang);
        return Math.round((r / 40) * 100) / 100;
      });
      expect(decoded, `${surface}: inline radar is stale`).toEqual(axes);
    }
  });
});
