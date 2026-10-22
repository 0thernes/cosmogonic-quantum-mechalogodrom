/**
 * The A-Life landscape index is DERIVED, never hand-edited: these gates fail `bun run check` when the
 * committed HTML drifts from a fresh render of the CSV + receipts, when the matrix repeats a system
 * (the defect of the externally generated index this replaced: 10 systems cycled 14 times), or when a
 * peer row loses its source or written basis.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  LANDSCAPE_HTML_PATH,
  LINEAGES,
  decadeOf,
  loadLandscapeInputs,
  parseLandscapeRows,
  rankRows,
  renderLandscapeHtml,
} from '../scripts/gen-alife-landscape-report';

const ROOT = `${import.meta.dir}/..`;
const inputs = loadLandscapeInputs(ROOT);
const rows = parseLandscapeRows(inputs.csv);
const peers = rows.filter((r) => !r.cosmo);

describe('A-Life landscape index is derived from the matrix (no drift, no repeats)', () => {
  test('committed HTML equals a fresh render (CSV/receipt edit without `gen:alife` → fail)', () => {
    expect(readFileSync(`${ROOT}/${LANDSCAPE_HTML_PATH}`, 'utf8')).toBe(
      renderLandscapeHtml(inputs),
    );
  });

  test('every system appears exactly once, even after normalising case and punctuation', () => {
    const norm = rows.map((r) =>
      r.project
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
    );
    expect(new Set(norm).size).toBe(rows.length);
  });

  test('the survey covers at least 140 distinct peers, each with an http(s) source and a basis', () => {
    expect(peers.length).toBeGreaterThanOrEqual(140);
    for (const p of peers) {
      expect(p.sourceUrl, p.project).toMatch(/^https?:\/\//);
      expect(p.basis.length, p.project).toBeGreaterThan(20);
    }
  });

  test('Cosmogonic is ranked by breadth like every other row, and the ranking is deterministic', () => {
    const a = rankRows(rows).map((r) => r.project);
    const b = rankRows([...rows].reverse()).map((r) => r.project);
    expect(a).toEqual(b);
    expect(rankRows(rows)[0]!.cosmo).toBe(true);
  });

  test('every declared lineage member exists in the matrix', () => {
    const names = new Set(rows.map((r) => r.project));
    for (const fam of LINEAGES) for (const m of fam.members) expect(names.has(m), m).toBe(true);
  });

  test('era labels map to decades', () => {
    expect(decadeOf('1990s')).toBe(1990);
    expect(decadeOf('1948-1949')).toBe(1940);
    expect(decadeOf('1940s-1950s')).toBe(1940);
    expect(decadeOf('2024')).toBe(2020);
    expect(() => decadeOf('unknown')).toThrow();
  });

  test('a malformed row fails loudly instead of being guessed', () => {
    const header = inputs.csv.split('\n')[0]!;
    expect(() =>
      parseLandscapeRows(
        `${header}\nBroken,2020,x,9,0,0,0,0,0,0,0,0,1,0.5,https://a.b,"basis text long enough"\n`,
      ),
    ).toThrow();
    expect(() => parseLandscapeRows(`${header}\nShort,2020,x,1,2\n`)).toThrow();
  });
});
