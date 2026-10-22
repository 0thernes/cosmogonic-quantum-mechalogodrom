/**
 * svg-labels.ts — text fitting and collision-free point labelling for the hand-rolled SVG charts
 * (`alife-comparison-stats.ts`, `alife-comparison-geometry.ts`).
 *
 * The charts are written without a browser, so text extents are estimated. The per-glyph-class
 * widths below are calibrated against Chromium's rendering of every chart string in the UI sans
 * stack and err wide, so text placed by these estimates stays inside its canvas when rendered.
 * tests/alife-chart-bounds.test.ts holds every generated chart to that contract.
 */

/** Em widths per glyph class (calibrated on Inter; conservative for Segoe UI / Roboto). */
function glyphEm(ch: string): number {
  if (/[mwMW@%]/.test(ch)) return 0.92;
  if (/[A-Z]/.test(ch)) return 0.76;
  if (/[ijlI|!.,:;'`]/.test(ch)) return 0.34;
  if (/[ftr()[\]{}\-/]/.test(ch)) return 0.44;
  if (/[a-z]/.test(ch)) return 0.6;
  if (/[0-9]/.test(ch)) return 0.67;
  if (ch === ' ') return 0.3;
  if (/[—…→↔]/.test(ch)) return 1.0;
  return 0.66;
}

/** Estimated rendered width of `text` at `size` px (bold for weight >= 600); errs wide. */
export function estimateTextWidth(text: string, size: number, weight = 400): number {
  let em = 0;
  for (const ch of text) em += glyphEm(ch);
  return em * size * (weight >= 600 ? 1.08 : 1.02);
}

/**
 * Shorten `text` to fit `maxWidth` at `size`: first drop a trailing parenthetical ("GOLEM (Genetically
 * Organized ...)" -> "GOLEM"), then cut with an ellipsis. Returns the text unchanged when it fits.
 */
export function fitText(text: string, maxWidth: number, size: number, weight = 400): string {
  if (estimateTextWidth(text, size, weight) <= maxWidth) return text;
  const bare = text.replace(/\s*\([^)]*\)\s*$/, '');
  if (bare.length > 0 && estimateTextWidth(bare, size, weight) <= maxWidth) return bare;
  let cut = bare;
  while (cut.length > 1 && estimateTextWidth(`${cut}…`, size, weight) > maxWidth)
    cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Hover text for a shortened label: the full name as an SVG `<title>`, or nothing if unshortened. */
export function fullNameTitle(full: string, shown: string, esc: (s: string) => string): string {
  return shown === full ? '' : `<title>${esc(full)}</title>`;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PointLabelRequest {
  /** Anchor point (marker centre). */
  x: number;
  y: number;
  text: string;
  size: number;
  /** Font weight; bold labels are estimated wider. */
  weight?: number;
  /** Marker radius, kept clear of the label. */
  r: number;
}

export interface PlacedPointLabel {
  index: number;
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Greedy collision-free placement. Requests are taken in the given order (callers sort by
 * priority); each tries right-of-marker, then left-of-marker, at three vertical offsets. A label that
 * would overlap a placed label, any marker, or leave `bounds` is skipped rather than drawn over
 * something, so the chart stays legible at any corpus size.
 */
export function placePointLabels(
  requests: readonly PointLabelRequest[],
  markers: readonly { x: number; y: number; r: number }[],
  bounds: Box,
): PlacedPointLabel[] {
  const taken: Box[] = [];
  const markerBoxes = markers.map((m) => ({
    x0: m.x - m.r,
    y0: m.y - m.r,
    x1: m.x + m.r,
    y1: m.y + m.r,
  }));
  const placed: PlacedPointLabel[] = [];
  requests.forEach((q, index) => {
    const w = estimateTextWidth(q.text, q.size, q.weight ?? 400);
    const h = q.size;
    const gap = q.r + 4;
    for (const dy of [q.size * 0.35, -q.size * 0.6, q.size * 1.3]) {
      for (const anchor of ['start', 'end'] as const) {
        const x = anchor === 'start' ? q.x + gap : q.x - gap;
        const y = q.y + dy;
        const box: Box = {
          x0: anchor === 'start' ? x : x - w,
          y0: y - h,
          x1: anchor === 'start' ? x + w : x,
          y1: y + h * 0.25,
        };
        if (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1)
          continue;
        if (taken.some((t) => overlaps(t, box)) || markerBoxes.some((m) => overlaps(m, box)))
          continue;
        taken.push(box);
        placed.push({ index, text: q.text, x, y, anchor });
        return;
      }
    }
  });
  return placed;
}

export interface LabelledPoint {
  name: string;
  x: number;
  y: number;
  /** Highlighted series (Cosmogonic): labelled first, larger and bold. */
  focus: boolean;
  /** Higher labels earlier when space is contested. */
  priority: number;
}

/**
 * Collision-free point labels: the focus point first, then by `priority`. A point whose label would
 * overlap a placed label or marker stays unlabelled (callers put its name on hover) instead of piling
 * text on text. `style(focus)` supplies the fill/size/weight attributes.
 */
export function pointLabelMarkup(
  pts: readonly LabelledPoint[],
  bounds: Box,
  radius: (focus: boolean) => number,
  style: (focus: boolean) => { attrs: string; size: number; weight?: number },
  esc: (s: string) => string,
): string {
  const order = [...pts].sort(
    (a, b) => Number(b.focus) - Number(a.focus) || b.priority - a.priority,
  );
  const placed = placePointLabels(
    order.map((p) => {
      const st = style(p.focus);
      return { x: p.x, y: p.y, text: p.name, size: st.size, weight: st.weight, r: radius(p.focus) };
    }),
    pts.map((p) => ({ x: p.x, y: p.y, r: radius(p.focus) })),
    bounds,
  );
  const r1 = (v: number): number => Math.round(v * 10) / 10;
  return placed
    .map(
      (l) =>
        `<text x="${r1(l.x)}" y="${r1(l.y)}" ${style(order[l.index]!.focus).attrs} text-anchor="${l.anchor}">${esc(l.text)}</text>`,
    )
    .join('');
}
