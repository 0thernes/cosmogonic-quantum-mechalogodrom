/**
 * Every A-Life chart keeps its text on its canvas. The published radar once right-anchored
 * "Consciousness-theory" at x=85.6 on a 640 px canvas, so the figure read "...sciousness-theory";
 * eight more charts cut long system names or headers at their edges. This gate measures each `<text>`
 * with the same calibrated, wide-erring estimator the generators use (scripts/svg-labels.ts),
 * including rotated headers, and fails when any box leaves the viewBox.
 */
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import {
  estimateTextWidth,
  fitText,
  fullNameTitle,
  placePointLabels,
  pointLabelMarkup,
} from '../scripts/svg-labels';

const ASSETS = `${import.meta.dir}/../docs/reports/assets`;
const charts = readdirSync(ASSETS).filter((f) => /^alife-.*\.svg$/.test(f));

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#183;': '·',
};

const attr = (attrs: string, name: string): string | undefined =>
  attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

/** Text lines whose estimated box leaves the canvas, as `text [x0, x1, y0, y1]`. */
function outOfBounds(svg: string): string[] {
  const vb = attr(svg.match(/<svg\b([^>]*)>/)![1]!, 'viewBox')!
    .split(/\s+/)
    .map(Number);
  const [vx, vy, vw, vh] = vb as [number, number, number, number];
  const bad: string[] = [];
  const decode = (raw: string): string =>
    raw
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&#?\w+;/g, (e) => ENTITIES[e] ?? '?');
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1]!;
    const size = Number(attr(attrs, 'font-size') ?? 16);
    const weight = Number(attr(attrs, 'font-weight') ?? 400);
    const anchor = attr(attrs, 'text-anchor') ?? 'start';
    const rot = attr(attrs, 'transform')?.match(
      /rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)/,
    );
    // Multi-line labels are <tspan x dy> runs: each line is its own box below the previous one.
    let x = Number(attr(attrs, 'x') ?? 0);
    let y = Number(attr(attrs, 'y') ?? 0);
    const spans = [...m[2]!.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    const lines = spans.length
      ? spans.map((t) => {
          x = Number(attr(t[1]!, 'x') ?? x);
          y += Number(attr(t[1]!, 'dy') ?? 0);
          return { text: decode(t[2]!), x, y };
        })
      : [{ text: decode(m[2]!), x, y }];
    for (const line of lines) {
      if (line.text.trim() === '') continue;
      const w = estimateTextWidth(line.text, size, weight);
      const x0 = anchor === 'end' ? line.x - w : anchor === 'middle' ? line.x - w / 2 : line.x;
      let corners: [number, number][] = [
        [x0, line.y - size * 0.8],
        [x0 + w, line.y - size * 0.8],
        [x0, line.y + size * 0.25],
        [x0 + w, line.y + size * 0.25],
      ];
      if (rot) {
        const a = (Number(rot[1]) * Math.PI) / 180;
        const cx = Number(rot[2]);
        const cy = Number(rot[3]);
        corners = corners.map(([px, py]) => [
          cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a),
          cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a),
        ]);
      }
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const box = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      if (
        box[0]! < vx - 0.5 ||
        box[1]! > vx + vw + 0.5 ||
        box[2]! < vy - 0.5 ||
        box[3]! > vy + vh + 0.5
      )
        bad.push(`${line.text} [${box.map((v) => v.toFixed(0)).join(', ')}]`);
    }
  }
  return bad;
}

describe('A-Life charts keep every label on the canvas', () => {
  test('the gallery has charts to check', () => {
    expect(charts.length).toBeGreaterThanOrEqual(11);
  });

  for (const file of charts) {
    test(`${file}: no text box leaves the viewBox`, () => {
      expect(outOfBounds(readFileSync(`${ASSETS}/${file}`, 'utf8'))).toEqual([]);
    });
  }

  test('the estimator still detects the original clipped radar label', () => {
    const clipped = `<svg viewBox="0 0 640 600"><text x="85.6" y="276.7" font-size="10" text-anchor="end">Consciousness-theory</text></svg>`;
    expect(outOfBounds(clipped)).toHaveLength(1);
  });
});

describe('label helpers', () => {
  test('fitText keeps fitting text, drops a parenthetical, then ellipsizes', () => {
    expect(fitText('ALIEN', 200, 11)).toBe('ALIEN');
    expect(fitText('GOLEM (Genetically Organized Lifelike Electro Mechanics)', 120, 11)).toBe(
      'GOLEM',
    );
    const cut = fitText('Species: Artificial Life, Real Evolution', 90, 11);
    expect(cut.endsWith('…')).toBe(true);
    expect(estimateTextWidth(cut, 11)).toBeLessThanOrEqual(90);
    expect(fullNameTitle('A & B', cut, (s) => s.replace('&', '&amp;'))).toBe(
      '<title>A &amp; B</title>',
    );
    expect(fullNameTitle('ALIEN', 'ALIEN', (s) => s)).toBe('');
  });

  test('placePointLabels skips a label that would collide and keeps labels inside bounds', () => {
    const bounds = { x0: 0, y0: 0, x1: 200, y1: 100 };
    const markers = [
      { x: 20, y: 50, r: 4 },
      { x: 22, y: 51, r: 4 },
    ];
    const placed = placePointLabels(
      [
        { x: 20, y: 50, text: 'first', size: 10, r: 4 },
        { x: 22, y: 51, text: 'second', size: 10, r: 4 },
        { x: 195, y: 50, text: 'edge', size: 10, r: 4 },
      ],
      [...markers, { x: 195, y: 50, r: 4 }],
      bounds,
    );
    expect(placed.map((p) => p.text)).toContain('first');
    const edge = placed.find((p) => p.text === 'edge');
    expect(edge?.anchor).toBe('end');
    for (const p of placed) {
      const w = estimateTextWidth(p.text, 10);
      expect(p.anchor === 'end' ? p.x - w : p.x).toBeGreaterThanOrEqual(0);
      expect(p.anchor === 'end' ? p.x : p.x + w).toBeLessThanOrEqual(200);
    }
    // Two labels never share space: a third request at the same marker finds no free slot.
    const crowded = placePointLabels(
      Array.from({ length: 8 }, (_, i) => ({ x: 100, y: 50, text: `label-${i}`, size: 10, r: 4 })),
      [{ x: 100, y: 50, r: 4 }],
      bounds,
    );
    expect(crowded.length).toBeLessThan(8);
  });

  test('pointLabelMarkup labels the focus point first in its own style', () => {
    const markup = pointLabelMarkup(
      [
        { name: 'peer', x: 60, y: 50, focus: false, priority: 9 },
        { name: 'Focus', x: 140, y: 50, focus: true, priority: 0 },
      ],
      { x0: 0, y0: 0, x1: 300, y1: 100 },
      () => 5,
      (focus) =>
        focus
          ? { attrs: 'font-size="12" font-weight="700"', size: 12, weight: 700 }
          : { attrs: 'font-size="9"', size: 9 },
      (s) => s,
    );
    expect(markup.indexOf('>Focus<')).toBeLessThan(markup.indexOf('>peer<'));
    expect(markup).toContain('font-weight="700"');
  });
});
