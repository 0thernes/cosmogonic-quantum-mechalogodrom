/**
 * Observatory — the live data-viz panel (CONTRACTS V3.5 + V4.3 multi-page XENOGENESIS +
 * V5.1 RESONANCE legibility).
 *
 * FOUR pages of canvas charts, redrawn on a slow cadence (world calls `draw()` every ~18
 * frames). Page p uses canvases `#obs-c{4p+0..4p+3}` (p0 → obs-c0..3, p1 → obs-c4..7,
 * p2 → obs-c8..11, p3 → obs-c12..15). `setPage(p)` selects the active page; `draw()` renders
 * ONLY that page's four canvases. A page whose canvases (or 2d contexts) are missing no-ops
 * and logs a single `console.warn` the first time it is drawn.
 *
 * V5.1 legibility pass: EVERY one of the 16 canvases now draws, in-canvas via the 2d context
 * (no DOM/HTML labels), an uppercase accent TITLE strip (top-left), a right-aligned value/unit
 * readout and/or a color-keyed bottom legend, and faint gridlines + axis ticks where a chart has
 * a meaningful scale. Strokes are thicker, fills brighter, and a soft additive glow (canvas
 * shadow) outlines each series so the narrow ~200px panel reads clearly; charts fill the body
 * below the title band with no large dead zones. The FIRST {@link push} is replayed once so every
 * ≥2-column chart shows real content from boot instead of a blank panel — see {@link primed}.
 *
 * - Page 0 (V3.5, unchanged): stacked phylum-population area, titan economy ledger,
 *   20×20 war-matrix heat grid, environment triple-line (rdEnergy/qEntropy/trend).
 * - Page 1 VARIANCE: rolling mean±σ bands for population/energy/links; population histogram;
 *   phylum Shannon-diversity (H) timeline; qEntropy-vs-trend phase scatter.
 * - Page 2 ECOLOGY: 10 per-phylum mini-sparklines (small multiples); birth/death flux
 *   timeline; titan matter-vs-energy phase portrait.
 * - Page 3 CONFLICT: war-intensity timeline; alliance/truce/war stacked counts; per-titan
 *   resource bars; biome "sentience" gauge fed by the optional `snapshot.sentience` (0..1).
 * All in-app Dome/World docs (observatory, help, copilot) + /docs + LABS synchronized with README, ARCHITECTURE, ERD/ERM/ERP, PHILOSOPHY, MODULE-CONTRACTS, SPECS, masters (Broly/Starkiller/Manhattan), GH repo. Full Tsotchke wiring, digital biologics petri, sentience. Accurate, current.
 *
 * Follows the Sparkline conventions from ./graphs: one cached 2d context per canvas, a
 * 2×-CSS-pixel HiDPI backing store refreshed only when stale, the same dark backing fill, and
 * allocation-free `push()`/`draw()` bodies. Every page's rings, scratch buffers and palette
 * strings are pre-allocated at construction:
 * - page 0: phylumRing (20×180; first 10 carry phyla), ledgerRing (20×180), envRing (3×180)
 *   and `stackScratch` (20×180), `wealthScratch`/`warsLatest` (Float32Array 20),
 *   `envScratch` (Float32Array 3), `warScratch` (Uint8Array 400), `names` (string[20]);
 * - page 1: statRing (3×180: population/energy/links) and `statScratch` (Float32Array 3),
 *   diversityRing (1×180: Shannon H) and `histScratch` (Float32Array {@link OBS_HIST_BINS});
 * - page 2: fluxRing (2×180: births/deaths proxy) and `fluxScratch` (Float32Array 2),
 *   `matterScratch`/`energyScratch` (Float32Array 10), reusing phylumRing for the multiples;
 * - page 3: warIntensityRing (1×180), warCountsRing (3×180: truce/war/alliance) and
 *   `warCountsScratch` (Float32Array 3), with `sentienceLatest` a scalar and the per-titan
 *   bars reading `matterScratch`/`energyScratch`/`warsLatest`.
 *
 * Theme colors are resolved ONCE at construction via `getComputedStyle` from the app.css
 * `@theme` tokens (`--color-tribe-0..7`, `--color-accent`, `--color-warn`,
 * `--color-danger-line`) with hex/hsl fallbacks when a token is unset.
 *
 * Degrades gracefully: when a page's canvases are absent (or there is no DOM at all, e.g.
 * under `bun test`) that page logs a single `console.warn` and its draw becomes a no-op — the
 * responsive writer lands the panel markup independently.
 *
 * The chart math (ring push/wrap, downsampling stride, palette mapping, token fallback,
 * rolling mean/σ window, Shannon entropy, histogram binning) is exported as pure DOM-free
 * helpers so bun can test it without a canvas.
 */
import { mean, sampleStandardDeviation } from 'simple-statistics';

/** Number of chart series on stacked/ledger charts (10 phyla plus room for 20 titans). */
export const OBS_SERIES = 20;
/** Rolling-window capacity of every observatory ring, in samples (CONTRACTS V3.5). */
export const OBS_RING_CAPACITY = 180;
/** Series on the environment timeline chart: rdEnergy, qEntropy, trend. */
export const OBS_ENV_SERIES = 3;
/** Cells in the titan war matrix (20 × 20, row-major). */
export const WAR_CELLS = 400;
/** Series on the page-1 variance chart: population, energy, links. */
export const OBS_STAT_SERIES = 3;
/** Bins in the page-1 population histogram. */
export const OBS_HIST_BINS = 16;
/** Window (most-recent samples) used for the page-1 rolling mean±σ bands. */
export const OBS_VARIANCE_WINDOW = 24;
/** Number of observatory pages (V4.3). */
export const OBS_PAGE_COUNT = 4;
/** Canvases per page (`#obs-c{4p}..#obs-c{4p+3}`). */
export const OBS_CANVAS_PER_PAGE = 4;

/** Structural shape of one titan's ledger row as consumed by the observatory (V3.5). */
export interface TitanLedgerEntry {
  name: string;
  energy: number;
  matter: number;
  entropy: number;
  /** Count of active wars this titan is waging (> 0 paints the war head marker). */
  war: number;
}

/**
 * Snapshot consumed by {@link Observatory.push}. All arrays may be REUSED by the caller —
 * `push` copies every value it keeps, so the reused `TelemetrySnapshot` arrays are safe to
 * pass straight through. The V4.3 scalar additions are OPTIONAL so the V3.5 callers (and the
 * existing tests) keep compiling; a missing field is treated as the documented default.
 */
export interface ObservatorySnapshot {
  /** Live population per phylum (up to {@link OBS_SERIES} consumed; missing → 0). */
  phylumCounts: ArrayLike<number>;
  /** Per-titan economy rows (up to {@link OBS_SERIES} consumed; missing → zero row). */
  titanLedger: ArrayLike<TitanLedgerEntry>;
  /** 20×20 row-major war matrix, values 0 truce/none, 1 alliance, 2 war (titans.ts REL_* encoding). */
  warMatrix: ArrayLike<number>;
  /** Reaction-diffusion pattern energy (auto-scaled timeline). */
  rdEnergy: number;
  /** Normalized quantum register entropy 0..1 (fixed-scale timeline). */
  qEntropy: number;
  /** Population trend per minute (symmetric-scale timeline around its midline). */
  trend: number;
  /**
   * Total live entity population for the page-1 variance band (V4.3). Missing → the sum of
   * {@link phylumCounts} is used instead, so a V3.5 snapshot still feeds a population series.
   */
  entities?: number;
  /** Aggregate ecosystem energy for the page-1 variance band (V4.3). Missing → 0. */
  energy?: number;
  /** Connectome link count for the page-1 variance band (V4.3). Missing → 0. */
  links?: number;
  /** Biome sentience index 0..1 for the page-3 gauge (V4.3). Missing → 0. */
  sentience?: number;
  /** V71: the three measurable dimensions of {@link sentience} (0..1), drawn as sub-bars. */
  bioIntegration?: number;
  bioCoherence?: number;
  bioMomentum?: number;
}

/**
 * Fixed-capacity multi-series ring buffer backed by ONE pre-allocated Float32Array
 * (column-major: one column = one sample across all series). Pure logic, no DOM — the
 * push/wrap math is testable under bun. Non-finite and missing inputs are stored as 0
 * (NaN-safety bound: one poisoned sample must never break chart normalization).
 */
export class SeriesRing {
  /** Values per column. */
  readonly series: number;
  /** Columns retained before the oldest is evicted. */
  readonly capacity: number;
  /** Single backing store, allocated once and never replaced. */
  private readonly buf: Float32Array;
  /** Physical column index of the oldest sample. */
  private head = 0;
  /** Columns currently buffered. */
  private filled = 0;

  /** @param series Values per column (≥ 1). @param capacity Columns retained (≥ 1). */
  constructor(series: number, capacity: number) {
    if (series < 1 || capacity < 1) {
      throw new Error('SeriesRing: series and capacity must be >= 1');
    }
    this.series = series;
    this.capacity = capacity;
    this.buf = new Float32Array(series * capacity);
  }

  /** Columns currently buffered (0..capacity). O(1). */
  get count(): number {
    return this.filled;
  }

  /**
   * Append one column, evicting the oldest once full. Values are COPIED — the caller may
   * reuse the input array. Missing entries (`values.length < series`) and non-finite values
   * become 0. O(series), allocation-free.
   */
  pushColumn(values: ArrayLike<number>): void {
    const phys =
      this.filled < this.capacity ? (this.head + this.filled) % this.capacity : this.head;
    const base = phys * this.series;
    for (let s = 0; s < this.series; s++) {
      const v = values[s];
      this.buf[base + s] = v !== undefined && Number.isFinite(v) ? v : 0;
    }
    if (this.filled < this.capacity) this.filled++;
    else this.head = (this.head + 1) % this.capacity;
  }

  /**
   * Read series `s` at window index `i` (0 = oldest buffered, `count - 1` = newest).
   * Out-of-window reads return 0. O(1).
   */
  at(s: number, i: number): number {
    if (s < 0 || s >= this.series || i < 0 || i >= this.filled) return 0;
    const phys = (this.head + i) % this.capacity;
    return this.buf[phys * this.series + s] ?? 0;
  }
}

/**
 * Downsampling stride: the smallest step ≥ 1 such that sampling every `stride`-th column of a
 * `count`-column window (always including the final column — see the `k === m - 1` clamps in
 * the draw loops) yields at most `maxPoints` points. O(1).
 */
export function strideFor(count: number, maxPoints: number): number {
  if (count <= 1) return 1;
  if (maxPoints < 1) return count;
  return Math.max(1, Math.ceil(count / maxPoints));
}

/**
 * Map a raw war-matrix value to a palette slot: 0 = truce/none, 1 = alliance, 2 = war
 * (the producer's titans.ts REL_TRUCE/REL_ALLIANCE/REL_WAR encoding — matches types.ts + viz3d.ts).
 * Clamped: negatives and non-finite → 0, ≥ 2 → 2, fractional 1.x → 1. O(1).
 */
export function warPaletteIndex(v: number): 0 | 1 | 2 {
  if (!Number.isFinite(v) || v < 1) return 0;
  return v >= 2 ? 2 : 1;
}

/** Minimal structural slice of CSSStyleDeclaration that token reads need (DOM-free testable). */
export interface TokenSource {
  getPropertyValue(name: string): string;
}

/**
 * Read a CSS custom property from a computed style, falling back to a literal when the source
 * is absent or the token is empty/unset. O(1); construction-time only.
 */
export function readToken(style: TokenSource | null, name: string, fallback: string): string {
  if (!style) return fallback;
  const v = style.getPropertyValue(name).trim();
  return v.length > 0 ? v : fallback;
}

/** Result pair for {@link windowMeanStd}: mean and sample standard deviation of a window. */
export interface MeanStd {
  mean: number;
  std: number;
}

/**
 * Mean and SAMPLE standard deviation (n−1) of the last `win` samples of a {@link SeriesRing}
 * series, written into a reused {@link MeanStd} `out` (no allocation). Built on
 * simple-statistics `mean`/`sampleStandardDeviation`, which need ≥ 1 / ≥ 2 finite samples
 * respectively: a 0- or 1-sample window yields `{ mean: <value|0>, std: 0 }`. The scratch
 * `tmp` (length ≥ `win`) collects the window before the stats call; only its first `len`
 * slots are read. O(win). Pure — no DOM.
 *
 * @param ring Source ring. @param s Series index. @param n Live column count (`ring.count`).
 * @param win Window length (most-recent samples). @param tmp Reused scratch (length ≥ win).
 * @param out Reused result object.
 */
export function windowMeanStd(
  ring: SeriesRing,
  s: number,
  n: number,
  win: number,
  tmp: number[],
  out: MeanStd,
): MeanStd {
  const len = Math.min(win, n);
  if (len <= 0) {
    out.mean = 0;
    out.std = 0;
    return out;
  }
  const start = n - len;
  tmp.length = len;
  for (let j = 0; j < len; j++) tmp[j] = ring.at(s, start + j);
  out.mean = mean(tmp);
  out.std = len >= 2 ? sampleStandardDeviation(tmp) : 0;
  return out;
}

/**
 * Normalized Shannon diversity H of a count distribution, in [0, 1]: `−Σ pᵢ·ln pᵢ / ln k`
 * over the `k` non-empty categories' probabilities `pᵢ = countᵢ / Σ`. Returns 0 for an empty
 * or single-occupied distribution (no diversity) and approaches 1 as counts equalize across
 * `series` categories. Non-finite/negative counts are treated as 0. O(series); pure, no DOM.
 *
 * @param counts Per-category counts. @param series Categories considered (≤ counts.length).
 */
export function shannonEntropy(counts: ArrayLike<number>, series: number): number {
  let total = 0;
  let occupied = 0;
  for (let i = 0; i < series; i++) {
    const c = counts[i];
    if (c !== undefined && Number.isFinite(c) && c > 0) {
      total += c;
      occupied++;
    }
  }
  if (total <= 0 || occupied <= 1) return 0;
  let h = 0;
  for (let i = 0; i < series; i++) {
    const c = counts[i];
    if (c !== undefined && Number.isFinite(c) && c > 0) {
      const p = c / total;
      h -= p * Math.log(p);
    }
  }
  const norm = h / Math.log(occupied);
  return norm < 0 ? 0 : norm > 1 ? 1 : norm;
}

/**
 * Bin the last `len` samples of a {@link SeriesRing} series into `out.length` equal-width
 * frequency bins spanning the window's [min, max], writing counts into `out` (reused — no
 * allocation). A degenerate (flat) window drops every sample into the last bin. Returns the
 * peak bin count (≥ 0) for chart auto-scaling. O(len + bins); pure, no DOM.
 *
 * @param ring Source ring. @param s Series index. @param n Live column count.
 * @param len Most-recent samples to bin (clamped to `n`). @param out Reused bin buffer.
 */
export function histogramBins(
  ring: SeriesRing,
  s: number,
  n: number,
  len: number,
  out: Float32Array,
): number {
  const bins = out.length;
  out.fill(0);
  const take = Math.min(len, n);
  if (bins < 1 || take <= 0) return 0;
  const start = n - take;
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < take; j++) {
    const v = ring.at(s, start + j);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  let peak = 0;
  for (let j = 0; j < take; j++) {
    const v = ring.at(s, start + j);
    // Flat window (span 0): everything lands in the final bin.
    const t = span > 0 ? (v - lo) / span : 1;
    let b = Math.floor(t * bins);
    if (b >= bins) b = bins - 1;
    else if (b < 0) b = 0;
    const c = (out[b] ?? 0) + 1;
    out[b] = c;
    if (c > peak) peak = c;
  }
  return peak;
}

/**
 * Compact human-readable number for in-canvas legends/value readouts: integers below 1000 print
 * verbatim, larger magnitudes collapse to a 1-decimal SI-ish suffix (`k`/`M`), and fractional
 * values keep up to `frac` decimals (default 2) with trailing zeros trimmed. Non-finite → `'—'`.
 * Sign is preserved. Pure, allocation-light (one string), no DOM — testable under bun. O(1).
 *
 * @param v Value to format. @param frac Max fraction digits for |v| < 1000 (default 2).
 */
export function fmtCompact(v: number, frac = 2): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}k`;
  if (a >= 100 || Number.isInteger(a)) return `${sign}${Math.round(a)}`;
  // Trim trailing zeros from the fractional rendering (e.g. 0.50 → 0.5, 3.00 → 3).
  const fixed = a.toFixed(frac);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return `${sign}${trimmed}`;
}

/** Fallback literals mirroring the app.css `@theme` tokens (used when tokens are unset). */
const TRIBE_FALLBACKS: readonly string[] = [
  'hsl(0deg 85% 60%)',
  'hsl(45deg 85% 60%)',
  'hsl(90deg 85% 60%)',
  'hsl(135deg 85% 60%)',
  'hsl(180deg 85% 60%)',
  'hsl(225deg 85% 60%)',
  'hsl(270deg 85% 60%)',
  'hsl(315deg 85% 60%)',
];
const ACCENT_FALLBACK = '#0ef';
const WARN_FALLBACK = '#fa0';
const DANGER_FALLBACK = '#ff3232';
/** Dark chart backing, matching the Sparkline fill. */
const BACKING = 'rgba(0,0,8,.85)';
/** Dim slate for truce cells and axis midlines. */
const DIM = 'rgba(148,163,184,1)';
/** Faint slate for gridlines/ticks (low-contrast scaffolding behind the data). */
const GRID = 'rgba(148,163,184,0.22)';
/** Bright readout text for legends/values — near-white so numbers pop on the dark backing. */
const INK = 'rgba(226,232,240,0.92)';
/** 2× backing-store font ≈ 10.5px CSS; reset by canvas resizes, so set per draw. */
const LABEL_FONT = '600 21px "JetBrains Mono", ui-monospace, monospace';
/** 2× backing-store TITLE font ≈ 9px CSS uppercase; the per-chart heading (V5.1). */
const TITLE_FONT = '700 18px "JetBrains Mono", ui-monospace, monospace';
/** 2× backing-store legend/value font ≈ 8px CSS; the unit/value readouts (V5.1). */
const VALUE_FONT = '600 16px "JetBrains Mono", ui-monospace, monospace';
/** Top inset (backing px) reserved for the title strip so data never collides with it. */
const TITLE_BAND = 30;
/**
 * Uniform inset (backing px ≈ 6 CSS px at the 2× store) applied on all sides of every chart's
 * plot body BELOW the title band (V6.1). Guarantees title/legend/value text never collides with
 * plotted data: the plot region is `[PAD, TITLE_BAND] .. [w − PAD, h − PAD]`.
 */
const PAD = 12;
/**
 * Smallest single-column row height (backing px) the titan roster / resource bars accept before
 * {@link rosterLayout} falls back to a compact 2-column grid (V6.1). ≈ two text lines tall at the
 * {@link VALUE_FONT} so a name and its value always have vertical breathing room.
 */
const ROSTER_MIN_ROW_H = 34;
/** Vertical gap reserved between consecutive roster/bar rows (backing px). */
const ROW_GAP = 6;
/** Horizontal inset from a roster/bar cell edge to its swatch/bar/text (backing px). */
const ROW_INSET = 6;

/**
 * Rectangular plot region for a chart, in backing px: the canvas inset by {@link PAD} on the
 * left/right/bottom and by `TITLE_BAND` on the top. All draw bodies derive their geometry from
 * one of these so the title band and the {@link PAD} margins are honored identically everywhere.
 */
export interface PlotRect {
  /** Left edge (= {@link PAD}). */
  left: number;
  /** Top edge (= `TITLE_BAND`). */
  top: number;
  /** Right edge (= `w − PAD`). */
  right: number;
  /** Bottom edge (= `h − PAD`). */
  bottom: number;
  /** Region width (`right − left`, ≥ 0). */
  width: number;
  /** Region height (`bottom − top`, ≥ 0). */
  height: number;
}

/**
 * Compute the padded plot region for a `w × h` backing store: inset {@link PAD} on the left,
 * right and bottom and `TITLE_BAND` on top, then clamp so a tiny canvas yields a degenerate
 * (zero-area) but still well-ordered rect rather than negative spans. Pure, allocation-light (one
 * object), no DOM — testable under bun. O(1).
 *
 * @param w Backing-store width. @param h Backing-store height.
 */
export function plotRect(w: number, h: number): PlotRect {
  const left = PAD;
  const top = TITLE_BAND;
  const right = Math.max(left, w - PAD);
  const bottom = Math.max(top, h - PAD);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Result of {@link rosterLayout}: the geometry for laying out `n` titan rows responsively inside a
 * plot region — either a single column or a compact 2-column grid when rows would otherwise be too
 * short to read. All coordinates are backing px relative to the canvas origin.
 */
export interface RosterLayout {
  /** Columns of cells (1 single-file, 2 compact grid). */
  cols: 1 | 2;
  /** Rows of cells per column (`ceil(n / cols)`). */
  rows: number;
  /** Width of one cell (column stride). */
  cellW: number;
  /** Height of one cell (row stride, including the inter-row gap). */
  cellH: number;
  /** Vertical gap reserved between consecutive rows (subtracted from the drawable cell). */
  gap: number;
  /** Drawable height inside a cell after the row gap (`cellH − gap`, ≥ 1). */
  innerH: number;
}

/**
 * Lay out `n` roster rows (titan names + a bar/swatch + a value) inside a padded {@link PlotRect}
 * so every row has real height with a gap and nothing has to overlap (V6.1). Tries a single column
 * first; if that makes each row shorter than `minRowH` backing px it switches to a compact
 * 2-column grid (halving the row count, doubling the per-row height) so 10 titans still fit a
 * short canvas legibly. Pure, allocation-light (one object), no DOM — testable under bun. O(1).
 *
 * @param region Padded plot region from {@link plotRect}.
 * @param n Row count (≥ 1; e.g. {@link OBS_SERIES}).
 * @param minRowH Minimum single-column row height before falling back to two columns (backing px).
 * @param gap Inter-row gap to reserve inside each cell (backing px).
 */
export function rosterLayout(
  region: PlotRect,
  n: number,
  minRowH: number,
  gap: number,
): RosterLayout {
  const count = n < 1 ? 1 : n;
  const singleRowH = region.height / count;
  const cols: 1 | 2 = singleRowH < minRowH && count > 1 ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const cellW = region.width / cols;
  const cellH = region.height / rows;
  const innerH = Math.max(1, cellH - gap);
  return { cols, rows, cellW, cellH, gap, innerH };
}

/**
 * Truncate `text` to fit `maxWidth` backing px under the caller's already-set font, appending an
 * ellipsis when characters are dropped. Measures via the live 2d context (`measureText`) so the
 * result respects the actual rasterized width; an empty string or non-positive width yields `''`.
 * Allocation-light (slices a few candidate substrings), no ring/array growth. O(L) on the string
 * length in the worst case (one trailing-char trim loop). Pairs with the row layout so a long
 * titan name never collides with its right-aligned value.
 *
 * @param x 2d context whose CURRENT font is used for measurement.
 * @param text Source label. @param maxWidth Available width in backing px.
 */
export function truncateToWidth(
  x: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  maxWidth: number,
): string {
  if (maxWidth <= 0 || text.length === 0) return '';
  if (x.measureText(text).width <= maxWidth) return text;
  const ell = '…';
  // Drop trailing characters until the name + ellipsis fits; never return below the ellipsis.
  let end = text.length - 1;
  while (end > 0) {
    const candidate = text.slice(0, end) + ell;
    if (x.measureText(candidate).width <= maxWidth) return candidate;
    end--;
  }
  return ell;
}

/** Active page index (which quad of canvases `draw()` renders). */
export type ObsPage = 0 | 1 | 2 | 3;

/**
 * Live observatory bound to the 16 canvases `#obs-c0..#obs-c15`, four per page. See the module
 * JSDoc for the per-page chart roster, scratch inventory and the degraded no-op mode.
 */
export class Observatory {
  /** Per-canvas elements `#obs-c0..#obs-c15` (null when absent). */
  private readonly canvases: readonly (HTMLCanvasElement | null)[];
  /** Per-canvas 2d contexts (null when the canvas or its context is unavailable). */
  private readonly ctxs: readonly (CanvasRenderingContext2D | null)[];
  /** True for page p when all four of its canvases resolved a 2d context. */
  private readonly pageReady: readonly boolean[];
  /** Latched so each unavailable page warns at most once (first `draw()` of that page). */
  private readonly pageWarned: boolean[];
  /** Currently selected page; `draw()` renders only this page's four canvases. */
  private page: ObsPage = 0;
  /** Hidden aria-live region that announces the latest snapshot summary to screen readers. */
  private readonly liveEl: HTMLElement | null;

  /** 10 series colors: tribe tokens 0..7 then accent and warn (resolved once). */
  private readonly seriesColors: readonly string[];
  /** War-state palette indexed by {@link warPaletteIndex}: truce, war, alliance. */
  private readonly warColors: readonly string[];
  /** Fill alpha per war state (truce cells stay dim so wars read at a glance). */
  private readonly warAlphas: readonly number[];
  private readonly accent: string;
  private readonly warnColor: string;
  private readonly danger: string;
  /** Pre-resolved page-1 band palette [population, energy, links] (no per-draw array). */
  private readonly statColors: readonly string[];
  /** Pre-resolved page-3 stacked palette [truce, war, alliance] (no per-draw array). */
  private readonly warStackColors: readonly string[];

  // ---- Page 0 rings/scratch (V3.5, unchanged) ----------------------------------------------
  /** Phylum population history (10 × 180). */
  private readonly phylumRing = new SeriesRing(OBS_SERIES, OBS_RING_CAPACITY);
  /** Titan net-holdings history (energy + matter − entropy, 10 × 180). */
  private readonly ledgerRing = new SeriesRing(OBS_SERIES, OBS_RING_CAPACITY);
  /** Environment history (rdEnergy, qEntropy, trend; 3 × 180). */
  private readonly envRing = new SeriesRing(OBS_ENV_SERIES, OBS_RING_CAPACITY);

  /** Scratch: cumulative stacked sums, series-major (`s * OBS_RING_CAPACITY + k`). */
  private readonly stackScratch = new Float32Array(OBS_SERIES * OBS_RING_CAPACITY);
  /** Scratch: per-titan net holdings for the current push. */
  private readonly wealthScratch = new Float32Array(OBS_SERIES);
  /** Scratch: rdEnergy/qEntropy/trend column for the current push. */
  private readonly envScratch = new Float32Array(OBS_ENV_SERIES);
  /** Latest war matrix copy (heat grid reads this, not the caller's array). */
  private readonly warScratch = new Uint8Array(WAR_CELLS);
  /** Latest per-titan active-war counts (war head markers / resource bars). */
  private readonly warsLatest = new Float32Array(OBS_SERIES);
  /** Latest titan name references (dominant-titan label; assignment only). */
  private readonly names: string[];

  // ---- Page 1 rings/scratch (VARIANCE) -----------------------------------------------------
  /** Population/energy/links history for the rolling mean±σ bands + histogram (3 × 180). */
  private readonly statRing = new SeriesRing(OBS_STAT_SERIES, OBS_RING_CAPACITY);
  /** Phylum Shannon-diversity H history (1 × 180). */
  private readonly diversityRing = new SeriesRing(1, OBS_RING_CAPACITY);
  /** Scratch: population/energy/links column for the current push. */
  private readonly statScratch = new Float32Array(OBS_STAT_SERIES);
  /** Scratch: histogram bin counts for the population distribution. */
  private readonly histScratch = new Float32Array(OBS_HIST_BINS);
  /** Scratch: window collector reused by {@link windowMeanStd} (length tracks the window). */
  private readonly statWindow: number[] = [];
  /** Scratch: reused mean/σ result for the band draw. */
  private readonly meanStd: MeanStd = { mean: 0, std: 0 };
  /** Scratch: single-cell column for the 1-series diversity/war-intensity ring pushes. */
  private readonly scalarScratch = new Float32Array(1);

  // ---- Page 2 rings/scratch (ECOLOGY) ------------------------------------------------------
  /** Birth/death flux proxy history (2 × 180: rise, fall of total population per push). */
  private readonly fluxRing = new SeriesRing(2, OBS_RING_CAPACITY);
  /** Scratch: births/deaths proxy column for the current push. */
  private readonly fluxScratch = new Float32Array(2);
  /** Total population at the previous push (flux is the signed delta). */
  private lastPopulation = 0;
  /** Whether {@link lastPopulation} holds a real prior sample yet (first push has no delta). */
  private havePrevPop = false;
  /** Latest per-titan matter (resource bars + matter-vs-energy phase portrait). */
  private readonly matterScratch = new Float32Array(OBS_SERIES);
  /** Latest per-titan energy (resource bars + matter-vs-energy phase portrait). */
  private readonly energyScratch = new Float32Array(OBS_SERIES);

  // ---- Page 3 rings/scratch (CONFLICT) -----------------------------------------------------
  /** War-intensity history (1 × 180: fraction of war cells in the matrix). */
  private readonly warIntensityRing = new SeriesRing(1, OBS_RING_CAPACITY);
  /** Truce/war/alliance cell-count history (3 × 180). */
  private readonly warCountsRing = new SeriesRing(3, OBS_RING_CAPACITY);
  /** Scratch: truce/war/alliance counts for the current push. */
  private readonly warCountsScratch = new Float32Array(3);
  /** Latest biome sentience index 0..1 (page-3 gauge). */
  private sentienceLatest = 0;
  /** V71: the three measurable sentience dimensions (0..1) shown as sub-dials under the gauge. */
  private bioIntLatest = 0;
  private bioCohLatest = 0;
  private bioMomLatest = 0;

  /** Backing-store size of the canvas most recently prepped (avoids a return-object alloc). */
  private pw = 0;
  private ph = 0;

  /**
   * False until the very first {@link push}; the first sample is written TWICE so every
   * timeline/area/band chart (all of which need ≥ 2 columns to draw a segment) shows content
   * from boot instead of a blank panel (V5.1). The doubled column is a faithful copy of the
   * first real reading — no synthetic value is invented — so the seeded chart reads the world's
   * actual opening state. O(1).
   */
  private primed = false;

  /**
   * Resolves the 16 canvases, their 2d contexts and the theme tokens once, and pre-allocates
   * every page's rings and scratch. A page whose four canvases all resolve a context is
   * `ready`; otherwise it no-ops and warns the first time it would draw. With no DOM at all
   * (e.g. under `bun test`) all pages are unready and the panel is silent until drawn. O(1).
   */
  constructor() {
    const doc = typeof document === 'undefined' ? null : document;
    const grab = (id: string): HTMLCanvasElement | null => {
      if (!doc || typeof HTMLCanvasElement === 'undefined') return null;
      const el = doc.getElementById(id);
      return el instanceof HTMLCanvasElement ? el : null;
    };
    const total = OBS_PAGE_COUNT * OBS_CANVAS_PER_PAGE;
    const canvases: (HTMLCanvasElement | null)[] = [];
    const ctxs: (CanvasRenderingContext2D | null)[] = [];
    for (let i = 0; i < total; i++) {
      const c = grab(`obs-c${i}`);
      canvases.push(c);
      ctxs.push(c ? c.getContext('2d') : null);
    }
    this.canvases = canvases;
    this.ctxs = ctxs;
    const ready: boolean[] = [];
    for (let p = 0; p < OBS_PAGE_COUNT; p++) {
      let ok = true;
      for (let j = 0; j < OBS_CANVAS_PER_PAGE; j++) {
        if (!ctxs[p * OBS_CANVAS_PER_PAGE + j]) ok = false;
      }
      ready.push(ok);
    }
    this.pageReady = ready;
    this.pageWarned = Array.from({ length: OBS_PAGE_COUNT }, () => false);

    // Theme tokens, read once (fallbacks keep the charts legible without app.css).
    const style =
      doc && typeof getComputedStyle === 'function' ? getComputedStyle(doc.documentElement) : null;
    const colors: string[] = [];
    for (let i = 0; i < TRIBE_FALLBACKS.length; i++) {
      colors.push(readToken(style, `--color-tribe-${i}`, TRIBE_FALLBACKS[i] ?? ACCENT_FALLBACK));
    }
    this.accent = readToken(style, '--color-accent', ACCENT_FALLBACK);
    this.warnColor = readToken(style, '--color-warn', WARN_FALLBACK);
    this.danger = readToken(style, '--color-danger-line', DANGER_FALLBACK);
    colors.push(this.accent, this.warnColor); // series 8 and 9
    this.seriesColors = colors;
    // Indexed by the RAW war-matrix value (0 truce, 1 alliance, 2 war): alliance→teal(accent),
    // war→red(danger). (Was inverted — alliances rendered red-as-war and wars teal-as-ally.)
    this.warColors = [DIM, this.accent, this.danger];
    // V5.1: brighter floors so war/alliance cells read at a glance on the narrow heat grid — war (2)
    // is the more intense floor.
    this.warAlphas = [0.22, 0.8, 0.95];
    this.names = Array.from({ length: OBS_SERIES }, () => '');
    this.statColors = [this.accent, this.warnColor, this.danger];
    // NOTE: indexed by the stacked-ring SERIES/scratch order [truce, wars, allies] (NOT the raw
    // war-matrix value like warColors) — so war→red, ally→teal is correct here and must NOT be swapped.
    this.warStackColors = [DIM, this.danger, this.accent];

    if (doc) {
      const panel = doc.getElementById('oP');
      if (panel) {
        const live = doc.createElement('div');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        live.setAttribute('aria-label', 'Observatory summary');
        live.textContent = 'Observatory panel ready.';
        panel.appendChild(live);
        this.liveEl = live;
      } else {
        this.liveEl = null;
      }
    } else {
      this.liveEl = null;
    }
  }

  /**
   * Select the active page (0..3). `draw()` renders only this page's four canvases; `push()`
   * keeps feeding EVERY page's rings regardless, so switching pages never shows a gap. Values
   * outside 0..3 are ignored. O(1).
   */
  setPage(p: ObsPage): void {
    if (p === 0 || p === 1 || p === 2 || p === 3) this.page = p;
  }

  /** The currently selected page (0..3). O(1). */
  get activePage(): ObsPage {
    return this.page;
  }

  /**
   * Record one snapshot into EVERY page's rolling windows. All values are COPIED — the caller
   * may reuse all snapshot arrays. O(S + C) where S = {@link OBS_SERIES} and C =
   * {@link WAR_CELLS}; allocation-free (writes into pre-allocated rings/scratch only).
   */
  push(snapshot: ObservatorySnapshot): void {
    // Page 0: phylum area.
    this.phylumRing.pushColumn(snapshot.phylumCounts);

    // Page 0 + page 2: titan ledger → net holdings, names, wars, raw matter/energy.
    const ledger = snapshot.titanLedger;
    for (let s = 0; s < OBS_SERIES; s++) {
      const e = ledger[s];
      if (e) {
        this.wealthScratch[s] = e.energy + e.matter - e.entropy;
        this.warsLatest[s] = e.war;
        this.matterScratch[s] = e.matter;
        this.energyScratch[s] = e.energy;
        this.names[s] = e.name;
      } else {
        this.wealthScratch[s] = 0;
        this.warsLatest[s] = 0;
        this.matterScratch[s] = 0;
        this.energyScratch[s] = 0;
        this.names[s] = '';
      }
    }
    this.ledgerRing.pushColumn(this.wealthScratch);

    // Page 0 + page 3: war matrix copy + truce/war/alliance tallies.
    const wm = snapshot.warMatrix;
    let truce = 0;
    let wars = 0;
    let allies = 0;
    for (let i = 0; i < WAR_CELLS; i++) {
      // Uint8 coercion truncates/wraps exotic inputs; warPaletteIndex clamps again at draw.
      const raw = wm[i] ?? 0;
      this.warScratch[i] = raw;
      const slot = warPaletteIndex(raw);
      // slot 1 = alliance, slot 2 = war (producer convention). (Was inverted — counted wars as allies.)
      if (slot === 2) wars++;
      else if (slot === 1) allies++;
      else truce++;
    }
    this.warCountsScratch[0] = truce;
    this.warCountsScratch[1] = wars;
    this.warCountsScratch[2] = allies;
    this.warCountsRing.pushColumn(this.warCountsScratch);
    this.scalarScratch[0] = wars / WAR_CELLS;
    this.warIntensityRing.pushColumn(this.scalarScratch);

    // Page 0: environment timelines.
    this.envScratch[0] = snapshot.rdEnergy;
    this.envScratch[1] = snapshot.qEntropy;
    this.envScratch[2] = snapshot.trend;
    this.envRing.pushColumn(this.envScratch);

    // Page 1: population/energy/links variance window + phylum Shannon diversity.
    let phylaSum = 0;
    for (let s = 0; s < OBS_SERIES; s++) {
      const c = snapshot.phylumCounts[s];
      if (c !== undefined && Number.isFinite(c) && c > 0) phylaSum += c;
    }
    const population =
      snapshot.entities !== undefined && Number.isFinite(snapshot.entities)
        ? snapshot.entities
        : phylaSum;
    this.statScratch[0] = population;
    this.statScratch[1] = snapshot.energy ?? 0;
    this.statScratch[2] = snapshot.links ?? 0;
    this.statRing.pushColumn(this.statScratch);
    this.scalarScratch[0] = shannonEntropy(snapshot.phylumCounts, OBS_SERIES);
    this.diversityRing.pushColumn(this.scalarScratch);

    // Page 2: birth/death flux proxy from the signed population delta.
    if (this.havePrevPop) {
      const d = population - this.lastPopulation;
      this.fluxScratch[0] = d > 0 ? d : 0; // births proxy
      this.fluxScratch[1] = d < 0 ? -d : 0; // deaths proxy
    } else {
      this.fluxScratch[0] = 0;
      this.fluxScratch[1] = 0;
      this.havePrevPop = true;
    }
    this.fluxRing.pushColumn(this.fluxScratch);
    this.lastPopulation = population;

    // Page 3: sentience gauge scalar + its three measurable dimensions (each clamped to 0..1).
    const cl01 = (n: number | undefined): number =>
      typeof n === 'number' && Number.isFinite(n) ? (n < 0 ? 0 : n > 1 ? 1 : n) : 0;
    this.sentienceLatest = cl01(snapshot.sentience);
    this.bioIntLatest = cl01(snapshot.bioIntegration);
    this.bioCohLatest = cl01(snapshot.bioCoherence);
    this.bioMomLatest = cl01(snapshot.bioMomentum);

    // V5.1 seed: replay the FIRST real sample once so every ≥2-column chart is non-blank from
    // boot. The replay re-enters with `primed` set, so it appends a second identical column and
    // does not recurse further. Flux records a 0 delta on the replay (population unchanged),
    // which is the honest reading for a steady opening frame.
    if (!this.primed) {
      this.primed = true;
      this.push(snapshot);
    }

    // V81: surface a terse summary for screen readers. Throttled naturally by the push cadence.
    if (this.liveEl && this.primed) {
      const pageNames = ['Overview', 'Variance', 'Ecology', 'Conflict'];
      const pageName = pageNames[this.page] ?? 'Observatory';
      const total =
        snapshot.entities !== undefined && Number.isFinite(snapshot.entities)
          ? snapshot.entities
          : this.lastPopulation;
      this.liveEl.textContent =
        `${pageName}: ${Math.round(total)} entities. ` +
        `Energy ${(snapshot.energy ?? 0).toFixed(1)}, ` +
        `links ${snapshot.links ?? 0}, ` +
        `sentience ${((snapshot.sentience ?? 0) * 100).toFixed(0)}%.`;
    }
  }

  /**
   * Redraw the ACTIVE page's four charts (the other twelve canvases are left untouched).
   * World calls this every ~18 frames (halve the cadence on the phone tier). An unready page
   * no-ops and warns once. O(S·m + C) at worst; allocation-free (canvas path commands and
   * pre-resolved color strings only).
   */
  draw(): void {
    const p = this.page;
    if (!this.pageReady[p]) {
      if (!this.pageWarned[p]) {
        this.pageWarned[p] = true;
        console.warn(
          `Observatory: page ${p} canvases #obs-c${p * 4}..#obs-c${p * 4 + 3} (or their 2d contexts) unavailable — page disabled`,
        );
      }
      return;
    }
    switch (p) {
      case 0:
        this.drawPhylum();
        this.drawLedger();
        this.drawWarGrid();
        this.drawEnv();
        break;
      case 1:
        this.drawVarianceBands();
        this.drawPopulationHistogram();
        this.drawDiversity();
        this.drawEntropyTrendPhase();
        break;
      case 2:
        this.drawPhylumMultiples();
        this.drawFlux();
        this.drawTitanMatterEnergyPhase();
        this.drawEcologyLegend();
        break;
      case 3:
        this.drawWarIntensity();
        this.drawWarStacked();
        this.drawTitanResourceBars();
        this.drawSentienceGauge();
        break;
    }
  }

  // ============================================================================================
  // Canvas plumbing
  // ============================================================================================

  /** The canvas/context pair for the active page's local slot `j` (0..3), or null/null. */
  private slot(j: number): { c: HTMLCanvasElement | null; x: CanvasRenderingContext2D | null } {
    const idx = this.page * OBS_CANVAS_PER_PAGE + j;
    return { c: this.canvases[idx] ?? null, x: this.ctxs[idx] ?? null };
  }

  /**
   * Refresh the HiDPI backing store (2× CSS pixels — the Sparkline `ensureGS` convention;
   * width/height are touched only when stale because assignment clears the canvas) and lay
   * the dark backing fill. Resets the shared 2d state (alpha/glow/text alignment/line cap) so a
   * style left behind by the previous canvas of the page can never bleed into this one — the
   * V5.1 charts toggle alpha and glow heavily, so a clean slate per canvas is load-bearing.
   * Returns false when the canvas has no layout size (hidden panel). O(1).
   */
  private prep(c: HTMLCanvasElement, x: CanvasRenderingContext2D): boolean {
    const w = c.offsetWidth * 2;
    const h = c.offsetHeight * 2;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.pw = c.width;
    this.ph = c.height;
    if (this.pw === 0 || this.ph === 0) return false;
    // Reset shared context state before the backing fill (alpha must be 1 or the fill is faint).
    x.globalAlpha = 1;
    x.shadowBlur = 0;
    x.shadowColor = 'transparent';
    x.lineCap = 'butt';
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    x.clearRect(0, 0, this.pw, this.ph);
    x.fillStyle = BACKING;
    x.fillRect(0, 0, this.pw, this.ph);
    return true;
  }

  // ============================================================================================
  // V5.1 in-canvas chrome: titles, legends, axes, glow. All allocation-free (no per-draw
  // arrays); every label is rasterized through the 2d context per the contract (no DOM edits).
  // ============================================================================================

  /**
   * Draw the chart TITLE strip: an uppercase accent heading top-left over a faint underline that
   * spans the canvas, reserving {@link TITLE_BAND} backing px so the plot body never collides
   * with it. Returns nothing; callers offset their plot region by `TITLE_BAND`. O(1).
   */
  private title(x: CanvasRenderingContext2D, text: string, w: number): void {
    x.globalAlpha = 1;
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    x.font = TITLE_FONT;
    x.fillStyle = this.accent;
    x.fillText(text.toUpperCase(), 8, 19);
    // Separator hairline under the title band.
    x.globalAlpha = 1;
    x.strokeStyle = GRID;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, TITLE_BAND - 4);
    x.lineTo(w, TITLE_BAND - 4);
    x.stroke();
  }

  /**
   * Right-aligned value/unit readout on the title row (e.g. `107 ent`), in the bright readout
   * ink so the latest reading is legible at a glance. O(1).
   */
  private readout(x: CanvasRenderingContext2D, text: string, w: number): void {
    x.globalAlpha = 1;
    x.font = VALUE_FONT;
    x.fillStyle = INK;
    x.textAlign = 'end';
    x.textBaseline = 'alphabetic';
    x.fillText(text, w - 6, 18);
    x.textAlign = 'start';
  }

  /**
   * A compact color-keyed legend laid out along the bottom edge: for each entry a filled swatch
   * plus its label, flowing left-to-right and wrapping is avoided by keeping entries short. The
   * `labels`/`colors` are read in lockstep up to `count`; values come from `getVal` (or are
   * omitted when null). Drawn in the readout ink so it reads on the dark fill. O(count).
   */
  private legend(
    x: CanvasRenderingContext2D,
    labels: readonly string[],
    colors: readonly string[],
    count: number,
    w: number,
    h: number,
    getVal: ((i: number) => string) | null,
  ): void {
    x.globalAlpha = 1;
    x.font = VALUE_FONT;
    x.textBaseline = 'middle';
    x.textAlign = 'start';
    const cy = h - 8;
    const sw = 12; // swatch edge
    let cx = 8;
    for (let i = 0; i < count; i++) {
      const label = labels[i] ?? '';
      const val = getVal ? getVal(i) : '';
      const text = val.length > 0 ? `${label} ${val}` : label;
      x.globalAlpha = 1;
      x.fillStyle = colors[i] ?? ACCENT_FALLBACK;
      x.fillRect(cx, cy - sw / 2, sw, sw);
      cx += sw + 4;
      x.fillStyle = INK;
      x.fillText(text, cx, cy);
      cx += x.measureText(text).width + 14;
      if (cx > w - 20 && i < count - 1) break; // never overflow the narrow panel
    }
    x.textBaseline = 'alphabetic';
  }

  /**
   * Horizontal gridlines + right-edge y-axis tick labels for a framed timeline plot. `ticks`
   * evenly-spaced lines span the plot region `[top, bottom]`; each is labeled with the data
   * value it represents (`lo` at the bottom → `lo + range` at the top), formatted compactly with
   * an optional unit. Faint lines sit BEHIND the data (call before stroking series). O(ticks).
   */
  private grid(
    x: CanvasRenderingContext2D,
    w: number,
    top: number,
    bottom: number,
    lo: number,
    range: number,
    ticks: number,
    unit: string,
  ): void {
    x.font = VALUE_FONT;
    x.textBaseline = 'middle';
    x.textAlign = 'end';
    x.lineWidth = 1;
    for (let t = 0; t <= ticks; t++) {
      const f = t / ticks;
      const py = bottom - f * (bottom - top);
      x.globalAlpha = 1;
      x.strokeStyle = GRID;
      x.beginPath();
      x.moveTo(0, py);
      x.lineTo(w, py);
      x.stroke();
      const val = lo + f * range;
      const label = unit.length > 0 ? `${fmtCompact(val)}${unit}` : fmtCompact(val);
      x.globalAlpha = 0.85;
      x.fillStyle = INK;
      x.fillText(label, w - 3, py - 7);
    }
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    x.globalAlpha = 1;
  }

  /**
   * Enable a soft additive glow around subsequent strokes/fills in `color`; pair with
   * {@link glowOff}. Implemented via canvas shadow (shadowBlur/shadowColor), which the contract
   * permits and which is allocation-free. O(1).
   */
  private glowOn(x: CanvasRenderingContext2D, color: string, blur: number): void {
    x.shadowColor = color;
    x.shadowBlur = blur;
  }

  /** Clear the glow set by {@link glowOn}. O(1). */
  private glowOff(x: CanvasRenderingContext2D): void {
    x.shadowBlur = 0;
    x.shadowColor = 'transparent';
  }

  // ============================================================================================
  // Page 0 — V3.5 (UNCHANGED behavior)
  // ============================================================================================

  /**
   * `#obs-c0`: stacked phylum-population area chart. Bands are cumulative sums precomputed
   * into `stackScratch`, auto-scaled to the window's max total. O(S·m).
   */
  private drawPhylum(): void {
    const { c, x } = this.slot(0);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ph = h - top;
    const ring = this.phylumRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'phylum population', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let maxTotal = 0;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      let acc = 0;
      for (let s = 0; s < OBS_SERIES; s++) {
        acc += ring.at(s, i);
        this.stackScratch[s * OBS_RING_CAPACITY + k] = acc;
      }
      if (acc > maxTotal) maxTotal = acc;
    }
    if (maxTotal <= 0) maxTotal = 1;
    // Current total = the top of the highest band at the newest column.
    const curTotal = this.stackScratch[(OBS_SERIES - 1) * OBS_RING_CAPACITY + (m - 1)] ?? 0;
    // Reference gridlines (population totals) drawn first, behind the stacked bands.
    this.grid(x, w, top + 2, h - 2, 0, maxTotal, 3, '');
    for (let s = 0; s < OBS_SERIES; s++) {
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.strokeStyle = color;
      x.fillStyle = color;
      // Fill the band first (translucent), then a BRIGHT top edge with glow so each phylum reads.
      x.globalAlpha = 0.42;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const tp = this.stackScratch[s * OBS_RING_CAPACITY + k] ?? 0;
        const py = h - (tp / maxTotal) * ph * 0.98;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      for (let k = m - 1; k >= 0; k--) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const bottom = s === 0 ? 0 : (this.stackScratch[(s - 1) * OBS_RING_CAPACITY + k] ?? 0);
        const py = h - (bottom / maxTotal) * ph * 0.98;
        x.lineTo(px, py);
      }
      x.closePath();
      x.fill();
      // Bright top edge.
      x.globalAlpha = 1;
      x.lineWidth = 1.8;
      this.glowOn(x, color, 6);
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const tp = this.stackScratch[s * OBS_RING_CAPACITY + k] ?? 0;
        const py = h - (tp / maxTotal) * ph * 0.98;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
      this.glowOff(x);
    }
    x.globalAlpha = 1;
    this.title(x, 'phylum population', w);
    this.readout(x, `Σ ${fmtCompact(curTotal)} ent`, w);
  }

  /**
   * `#obs-c1`: titan economy ledger — one polyline per titan of net holdings
   * (energy + matter − entropy), min/max-normalized over the window; a danger head marker on
   * titans currently at war and the dominant titan's lore name in its series color. O(S·m).
   */
  private drawLedger(): void {
    const { c, x } = this.slot(1);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.ledgerRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'titan ledger', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let lo = Infinity;
    let hi = -Infinity;
    for (let s = 0; s < OBS_SERIES; s++) {
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const v = ring.at(s, i);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!(hi > lo)) hi = lo + 1; // flat window: avoid division by zero
    const range = hi - lo;
    // Net-holdings reference grid (3 ticks) behind the lines.
    this.grid(x, w, top + 2, h - 2, lo, range, 3, '');
    // Plot inside [top, h]: reuse polyline's 0.92/0.84 framing but shifted down past the title.
    const pTop = top;
    const pH = h - top;
    x.lineWidth = 2.1;
    for (let s = 0; s < OBS_SERIES; s++) {
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.globalAlpha = 0.95;
      this.glowOn(x, color, 4);
      x.strokeStyle = color;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = pTop + pH * 0.92 - ((ring.at(s, i) - lo) / range) * pH * 0.84;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
      this.glowOff(x);
      if ((this.warsLatest[s] ?? 0) > 0) {
        const py = pTop + pH * 0.92 - ((ring.at(s, n - 1) - lo) / range) * pH * 0.84;
        x.globalAlpha = 1;
        x.fillStyle = this.danger;
        x.fillRect(w - 9, py - 4, 9, 9);
      }
    }
    let best = 0;
    let bestV = -Infinity;
    for (let s = 0; s < OBS_SERIES; s++) {
      const v = ring.at(s, n - 1);
      if (v > bestV) {
        bestV = v;
        best = s;
      }
    }
    x.globalAlpha = 1;
    this.title(x, 'titan ledger', w);
    const nm = this.names[best] ?? '';
    // Dominant titan: its lore name in its own color, with the net-holdings value.
    x.font = VALUE_FONT;
    x.textAlign = 'end';
    x.textBaseline = 'alphabetic';
    x.fillStyle = nm.length > 0 ? (this.seriesColors[best] ?? ACCENT_FALLBACK) : INK;
    x.fillText(`${nm.length > 0 ? `${nm} ` : ''}${fmtCompact(bestV)}`, w - 6, 18);
    x.textAlign = 'start';
  }

  /**
   * `#obs-c2`: titan war-matrix heat grid. Cell color/alpha by {@link warPaletteIndex}:
   * dim slate truce, danger war, accent alliance. O(C) = O(WAR_CELLS).
   */
  private drawWarGrid(): void {
    const { c, x } = this.slot(2);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const legendH = 18;
    const gridTop = top + 2;
    const gridH = h - gridTop - legendH;
    const side = Math.sqrt(WAR_CELLS);
    const cw = w / side;
    const ch = gridH / side;
    const pad = Math.min(2, cw * 0.08);
    let wars = 0;
    let allies = 0;
    for (let r = 0; r < side; r++) {
      for (let q = 0; q < side; q++) {
        const idx = warPaletteIndex(this.warScratch[r * side + q] ?? 0);
        if (idx === 2)
          wars++; // 2 = war, 1 = alliance (producer convention)
        else if (idx === 1) allies++;
        x.fillStyle = this.warColors[idx] ?? DIM;
        x.globalAlpha = this.warAlphas[idx] ?? 1;
        x.fillRect(q * cw + pad, gridTop + r * ch + pad, cw - pad * 2, ch - pad * 2);
      }
    }
    x.globalAlpha = 1;
    this.title(x, `war matrix ${side}×${side}`, w);
    this.readout(x, `${wars}⚔ ${allies}∞`, w);
    // Legend order matches warColors' raw-value indexing: [0]=truce, [1]=alliance/ally, [2]=war.
    this.legend(x, ['truce', 'ally', 'war'], this.warColors, 3, w, h, null);
  }

  /**
   * `#obs-c3`: environment triple-line — rdEnergy (accent, auto-scaled), qEntropy (warn,
   * fixed 0..1) and trend (danger, symmetric about the dim midline). O(3·m).
   */
  private drawEnv(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.envRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'environment', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let rdMax = 1e-6;
    let trendAbs = 1e-6;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const rd = Math.abs(ring.at(0, i));
      if (rd > rdMax) rdMax = rd;
      const tr = Math.abs(ring.at(2, i));
      if (tr > trendAbs) trendAbs = tr;
    }
    const pTop = top;
    const pH = h - top - 18; // leave room for the legend strip
    const mid = pTop + pH * 0.5;
    // Zero-trend midline + two faint guide rails.
    x.strokeStyle = GRID;
    x.globalAlpha = 1;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, mid);
    x.lineTo(w, mid);
    x.moveTo(0, pTop + pH * 0.16);
    x.lineTo(w, pTop + pH * 0.16);
    x.moveTo(0, pTop + pH * 0.84);
    x.lineTo(w, pTop + pH * 0.84);
    x.stroke();
    x.lineWidth = 2;
    this.envLine(x, ring, 0, n, stride, w, pTop, pH, 0, rdMax, this.accent);
    this.envLine(x, ring, 1, n, stride, w, pTop, pH, 0, 1, this.warnColor);
    this.envLine(x, ring, 2, n, stride, w, pTop, pH, -trendAbs, trendAbs * 2, this.danger);
    x.globalAlpha = 1;
    this.title(x, 'environment', w);
    const rd = ring.at(0, n - 1);
    const qe = ring.at(1, n - 1);
    const tr = ring.at(2, n - 1);
    this.legend(x, ['rd', 'qH', 'trend'], this.statColors, 3, w, h, (i) =>
      i === 0 ? fmtCompact(rd) : i === 1 ? fmtCompact(qe) : fmtCompact(tr),
    );
  }

  /**
   * Stroke one env/timeline series into a plot region offset below the title band, normalizing
   * `lo`→8% bottom margin and `lo+range`→8% top with a soft glow. O(m); allocation-free.
   */
  private envLine(
    x: CanvasRenderingContext2D,
    ring: SeriesRing,
    s: number,
    n: number,
    stride: number,
    w: number,
    pTop: number,
    pH: number,
    lo: number,
    range: number,
    color: string,
  ): void {
    const m = Math.floor((n - 1) / stride) + 1;
    x.globalAlpha = 1;
    x.strokeStyle = color;
    this.glowOn(x, color, 4);
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = pTop + pH * 0.92 - ((ring.at(s, i) - lo) / range) * pH * 0.84;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    this.glowOff(x);
  }

  // ============================================================================================
  // Page 1 — VARIANCE
  // ============================================================================================

  /**
   * `#obs-c4`: rolling mean±σ bands for population (accent), energy (warn) and links (danger).
   * Each series is independently min/max-normalized over its window so the three fit one
   * panel; the mean is a solid polyline and ±1 sample-σ is a translucent band. σ uses the last
   * {@link OBS_VARIANCE_WINDOW} samples via {@link windowMeanStd}. O(STAT·m).
   */
  private drawVarianceBands(): void {
    const { c, x } = this.slot(0);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.statRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'variance ±σ', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    const pTop = top;
    const pH = h - top - 18; // legend strip
    // Faint horizontal rails so the three independently-normalized series share a frame.
    x.strokeStyle = GRID;
    x.lineWidth = 1;
    for (let g = 0; g <= 2; g++) {
      const gy = pTop + (g / 2) * pH;
      x.beginPath();
      x.moveTo(0, gy);
      x.lineTo(w, gy);
      x.stroke();
    }
    for (let s = 0; s < OBS_STAT_SERIES; s++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const v = ring.at(s, i);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      // Widen the extent by one global σ so the ±σ band has vertical room.
      windowMeanStd(ring, s, n, OBS_VARIANCE_WINDOW, this.statWindow, this.meanStd);
      const sd = this.meanStd.std;
      lo -= sd;
      hi += sd;
      if (!(hi > lo)) hi = lo + 1;
      const range = hi - lo;
      const color = this.statColors[s] ?? ACCENT_FALLBACK;
      // ±σ band as a closed translucent ribbon around the mean polyline (brighter than V4).
      x.fillStyle = color;
      x.globalAlpha = 0.26;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = pTop + pH * 0.92 - ((ring.at(s, i) + sd - lo) / range) * pH * 0.84;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      for (let k = m - 1; k >= 0; k--) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = pTop + pH * 0.92 - ((ring.at(s, i) - sd - lo) / range) * pH * 0.84;
        x.lineTo(px, py);
      }
      x.closePath();
      x.fill();
      // Bright mean polyline with glow.
      x.globalAlpha = 1;
      x.lineWidth = 2.1;
      x.strokeStyle = color;
      this.glowOn(x, color, 4);
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = pTop + pH * 0.92 - ((ring.at(s, i) - lo) / range) * pH * 0.84;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
      this.glowOff(x);
    }
    x.globalAlpha = 1;
    this.title(x, 'variance  mean±σ', w);
    const pop = ring.at(0, n - 1);
    const en = ring.at(1, n - 1);
    const lk = ring.at(2, n - 1);
    this.legend(x, ['pop', 'energy', 'links'], this.statColors, 3, w, h, (i) =>
      i === 0 ? fmtCompact(pop) : i === 1 ? fmtCompact(en) : fmtCompact(lk),
    );
  }

  /**
   * `#obs-c5`: population histogram over the live variance window. Bars are auto-scaled to the
   * peak bin; binning is delegated to {@link histogramBins}. O(bins + window).
   */
  private drawPopulationHistogram(): void {
    const { c, x } = this.slot(1);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.statRing;
    const n = ring.count;
    if (n < 1) {
      this.title(x, 'pop histogram', w);
      return;
    }
    const peak = histogramBins(ring, 0, n, OBS_RING_CAPACITY, this.histScratch);
    // Window [min, max] for the x-axis labels (matches histogramBins' own span).
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = ring.at(0, i);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const bins = this.histScratch.length;
    const pTop = top + 2;
    const baseY = h - 16; // axis baseline; below it sits the x-range labels
    const pH = baseY - pTop;
    // Count gridlines behind the bars.
    if (peak > 0) this.grid(x, w, pTop, baseY, 0, peak, 2, '');
    const bw = w / bins;
    for (let b = 0; b < bins; b++) {
      const cnt = this.histScratch[b] ?? 0;
      const bh = peak > 0 ? (cnt / peak) * pH * 0.92 : 0;
      // Bright accent bars with a glow; taller bins read hotter.
      x.globalAlpha = cnt > 0 ? 0.9 : 0.12;
      x.fillStyle = this.accent;
      this.glowOn(x, this.accent, cnt > 0 ? 5 : 0);
      x.fillRect(b * bw + 1, baseY - bh, bw - 2, bh);
      this.glowOff(x);
    }
    // X-axis baseline + range endpoints.
    x.globalAlpha = 1;
    x.strokeStyle = GRID;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, baseY);
    x.lineTo(w, baseY);
    x.stroke();
    x.font = VALUE_FONT;
    x.fillStyle = INK;
    x.textBaseline = 'alphabetic';
    x.textAlign = 'start';
    x.fillText(Number.isFinite(lo) ? fmtCompact(lo) : '0', 2, h - 4);
    x.textAlign = 'end';
    x.fillText(Number.isFinite(hi) ? fmtCompact(hi) : '0', w - 2, h - 4);
    x.textAlign = 'start';
    this.title(x, 'pop histogram', w);
    this.readout(x, `peak ${fmtCompact(peak)}`, w);
  }

  /**
   * `#obs-c6`: phylum Shannon-diversity timeline — normalized H ∈ [0, 1] on a fixed scale
   * (warn line over a dim 0.5 midline), so flattening biodiversity reads as a falling line.
   * O(m).
   */
  private drawDiversity(): void {
    const { c, x } = this.slot(2);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.diversityRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'diversity H', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    const pTop = top + 2;
    const pH = h - pTop - 4;
    // Fixed 0..1 grid (H is normalized), labeled 0 / .5 / 1.
    this.grid(x, w, pTop, h - 4, 0, 1, 2, '');
    // Filled area under the line to read biodiversity collapse as the floor draining.
    x.fillStyle = this.warnColor;
    x.globalAlpha = 0.22;
    x.beginPath();
    x.moveTo(0, h - 4);
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = h - 4 - ring.at(0, i) * pH;
      x.lineTo(px, py);
    }
    x.lineTo(w, h - 4);
    x.closePath();
    x.fill();
    // Bright glowing line.
    x.globalAlpha = 1;
    x.lineWidth = 2.4;
    x.strokeStyle = this.warnColor;
    this.glowOn(x, this.warnColor, 5);
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = h - 4 - ring.at(0, i) * pH;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    this.glowOff(x);
    x.globalAlpha = 1;
    this.title(x, 'phylum diversity H', w);
    this.readout(x, `H ${fmtCompact(ring.at(0, n - 1))}`, w);
  }

  /**
   * `#obs-c7`: qEntropy-vs-trend phase scatter. qEntropy (0..1) maps to x; trend maps to y,
   * symmetric about the vertical midline (auto-scaled to the window's |trend| max). The newest
   * point is a filled accent dot; older points fade. Reads the page-0 {@link envRing}
   * (qEntropy@1, trend@2). O(m).
   */
  private drawEntropyTrendPhase(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.envRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'qH × trend', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let trendAbs = 1e-6;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const tr = Math.abs(ring.at(2, i));
      if (tr > trendAbs) trendAbs = tr;
    }
    const pTop = top + 2;
    const pH = h - pTop - 16;
    const midY = pTop + pH * 0.5;
    const midX = w * 0.5;
    // Crosshair + box at (qEntropy 0.5, trend 0).
    x.strokeStyle = GRID;
    x.globalAlpha = 1;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, midY);
    x.lineTo(w, midY);
    x.moveTo(midX, pTop);
    x.lineTo(midX, pTop + pH);
    x.stroke();
    // Connect the trajectory faintly so the phase path is visible, then dot the samples.
    x.globalAlpha = 0.45;
    x.strokeStyle = this.warnColor;
    x.lineWidth = 1.3;
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const qx = ring.at(1, i);
      const tr = ring.at(2, i);
      const px = (qx < 0 ? 0 : qx > 1 ? 1 : qx) * w;
      const py = midY - (tr / (trendAbs * 2)) * pH * 0.84;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const qx = ring.at(1, i); // qEntropy ∈ [0, 1]
      const tr = ring.at(2, i);
      const px = (qx < 0 ? 0 : qx > 1 ? 1 : qx) * w;
      const py = midY - (tr / (trendAbs * 2)) * pH * 0.84;
      const newest = i === n - 1;
      x.globalAlpha = newest ? 1 : 0.3 + 0.5 * (k / Math.max(1, m - 1));
      x.fillStyle = newest ? this.accent : this.warnColor;
      const rad = newest ? 5 : 2.4;
      if (newest) this.glowOn(x, this.accent, 7);
      x.beginPath();
      x.arc(px, py, rad, 0, Math.PI * 2);
      x.fill();
      if (newest) this.glowOff(x);
    }
    // Axis annotations.
    x.globalAlpha = 0.85;
    x.font = VALUE_FONT;
    x.fillStyle = INK;
    x.textBaseline = 'alphabetic';
    x.textAlign = 'start';
    x.fillText('qH 0', 2, h - 4);
    x.textAlign = 'end';
    x.fillText('1', w - 2, h - 4);
    x.textAlign = 'start';
    this.title(x, 'qH × trend phase', w);
    this.readout(x, `±${fmtCompact(trendAbs)}/m`, w);
  }

  // ============================================================================================
  // Page 2 — ECOLOGY
  // ============================================================================================

  /**
   * `#obs-c8`: per-phylum small multiples — 10 mini-sparklines on a 5×2 grid, each phylum's
   * population history independently auto-scaled in its own series color over the {@link
   * phylumRing}. O(S·m).
   */
  private drawPhylumMultiples(): void {
    const { c, x } = this.slot(0);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.phylumRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'phyla small-multiples', w);
      return;
    }
    const cols = 5;
    const rows = 2;
    const gridH = h - top;
    const cw = w / cols;
    const ch = gridH / rows;
    const stride = strideFor(n, Math.max(2, (cw | 0) >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    // Only the cols*rows cells that fit the 5×2 grid (= PHYLUM_COUNT); series 10..19 (titan charts
    // elsewhere use OBS_SERIES=20) would render fully clipped below the canvas.
    for (let s = 0; s < cols * rows; s++) {
      const gx = (s % cols) * cw;
      const gy = top + Math.floor(s / cols) * ch;
      // Faint cell frame so the 10 panels read as a grid.
      x.globalAlpha = 1;
      x.strokeStyle = GRID;
      x.lineWidth = 1;
      x.strokeRect(gx + 1, gy + 1, cw - 2, ch - 2);
      // Per-cell max for an independent vertical scale.
      let hi = 1e-6;
      let cur = 0;
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const v = ring.at(s, i);
        if (v > hi) hi = v;
        if (i === n - 1) cur = v;
      }
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      // Translucent area + bright glowing line.
      x.fillStyle = color;
      x.globalAlpha = 0.28;
      x.beginPath();
      x.moveTo(gx, gy + ch * 0.94);
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = gx + (i / (n - 1)) * cw;
        const py = gy + ch * 0.94 - (ring.at(s, i) / hi) * ch * 0.72;
        x.lineTo(px, py);
      }
      x.lineTo(gx + cw, gy + ch * 0.94);
      x.closePath();
      x.fill();
      x.strokeStyle = color;
      x.globalAlpha = 1;
      x.lineWidth = 1.8;
      this.glowOn(x, color, 3);
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = gx + (i / (n - 1)) * cw;
        const py = gy + ch * 0.94 - (ring.at(s, i) / hi) * ch * 0.72;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
      this.glowOff(x);
      // Per-cell index + current count label.
      x.globalAlpha = 0.92;
      x.font = VALUE_FONT;
      x.fillStyle = color;
      x.textBaseline = 'top';
      x.textAlign = 'start';
      x.fillText(`${s}`, gx + 4, gy + 3);
      x.fillStyle = INK;
      x.textAlign = 'end';
      x.fillText(fmtCompact(cur), gx + cw - 3, gy + 3);
      x.textAlign = 'start';
      x.textBaseline = 'alphabetic';
    }
    x.globalAlpha = 1;
    this.title(x, 'phyla small-multiples', w);
  }

  /**
   * `#obs-c9`: birth/death flux timeline — births (accent) above and deaths (danger) below a
   * dim midline, each a translucent area against a shared auto-scaled magnitude. Reads the
   * {@link fluxRing} (births@0, deaths@1). O(m).
   */
  private drawFlux(): void {
    const { c, x } = this.slot(1);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.fluxRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'birth / death flux', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let mag = 1e-6;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const b = ring.at(0, i);
      const d = ring.at(1, i);
      if (b > mag) mag = b;
      if (d > mag) mag = d;
    }
    const pTop = top + 2;
    const pH = h - pTop - 18; // legend strip
    const mid = pTop + pH * 0.5;
    const half = pH * 0.45;
    // Midline + ±peak rails labeled with the magnitude.
    x.strokeStyle = GRID;
    x.globalAlpha = 1;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, mid);
    x.lineTo(w, mid);
    x.moveTo(0, mid - half);
    x.lineTo(w, mid - half);
    x.moveTo(0, mid + half);
    x.lineTo(w, mid + half);
    x.stroke();
    x.font = VALUE_FONT;
    x.fillStyle = INK;
    x.globalAlpha = 0.85;
    x.textAlign = 'end';
    x.textBaseline = 'middle';
    x.fillText(`+${fmtCompact(mag)}`, w - 3, mid - half + 7);
    x.fillText(`-${fmtCompact(mag)}`, w - 3, mid + half - 7);
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    // Births up (accent), deaths down (danger) as filled areas from the midline.
    this.fluxArea(x, ring, 0, n, stride, w, mid, half, mag, -1, this.accent);
    this.fluxArea(x, ring, 1, n, stride, w, mid, half, mag, 1, this.danger);
    x.globalAlpha = 1;
    this.title(x, 'birth / death flux', w);
    this.legend(x, ['births', 'deaths'], [this.accent, this.danger], 2, w, h, (i) =>
      fmtCompact(ring.at(i, n - 1)),
    );
  }

  /**
   * Fill one flux series as an area anchored on the midline, growing `dir` (−1 up / +1 down)
   * proportional to `mag` and capped at `half` px, with a bright glowing top edge. O(m);
   * allocation-free.
   */
  private fluxArea(
    x: CanvasRenderingContext2D,
    ring: SeriesRing,
    s: number,
    n: number,
    stride: number,
    w: number,
    mid: number,
    half: number,
    mag: number,
    dir: 1 | -1,
    color: string,
  ): void {
    const m = Math.floor((n - 1) / stride) + 1;
    x.fillStyle = color;
    x.globalAlpha = 0.55;
    x.beginPath();
    x.moveTo(0, mid);
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = mid + dir * (ring.at(s, i) / mag) * half;
      x.lineTo(px, py);
    }
    x.lineTo(w, mid);
    x.closePath();
    x.fill();
    // Bright glowing edge over the filled area.
    x.globalAlpha = 1;
    x.lineWidth = 1.8;
    x.strokeStyle = color;
    this.glowOn(x, color, 4);
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = mid + dir * (ring.at(s, i) / mag) * half;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    this.glowOff(x);
  }

  /**
   * `#obs-c10`: titan matter-vs-energy phase portrait. Each titan is a dot at
   * (matter → x, energy → y), both min/max-normalized across the 10 titans this push, sized by
   * net holdings and reddened when at war. Reads `matterScratch`/`energyScratch`/`warsLatest`.
   * O(S).
   */
  private drawTitanMatterEnergyPhase(): void {
    const { c, x } = this.slot(2);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    let mLo = Infinity;
    let mHi = -Infinity;
    let eLo = Infinity;
    let eHi = -Infinity;
    for (let s = 0; s < OBS_SERIES; s++) {
      const mt = this.matterScratch[s] ?? 0;
      const en = this.energyScratch[s] ?? 0;
      if (mt < mLo) mLo = mt;
      if (mt > mHi) mHi = mt;
      if (en < eLo) eLo = en;
      if (en > eHi) eHi = en;
    }
    if (!(mHi > mLo)) mHi = mLo + 1;
    if (!(eHi > eLo)) eHi = eLo + 1;
    const mRange = mHi - mLo;
    const eRange = eHi - eLo;
    const x0 = w * 0.1;
    const baseY = h - 16;
    const pTop = top + 2;
    const pH = baseY - pTop;
    const pW = w - x0 - 4;
    // Axes + faint inner grid.
    x.strokeStyle = GRID;
    x.globalAlpha = 1;
    x.lineWidth = 1;
    x.beginPath();
    for (let g = 1; g < 3; g++) {
      const gy = baseY - (g / 3) * pH;
      x.moveTo(x0, gy);
      x.lineTo(w, gy);
      const gx = x0 + (g / 3) * pW;
      x.moveTo(gx, pTop);
      x.lineTo(gx, baseY);
    }
    x.stroke();
    x.lineWidth = 1.4;
    x.strokeStyle = DIM;
    x.globalAlpha = 0.5;
    x.beginPath();
    x.moveTo(x0, baseY);
    x.lineTo(w, baseY);
    x.moveTo(x0, pTop);
    x.lineTo(x0, baseY);
    x.stroke();
    for (let s = 0; s < OBS_SERIES; s++) {
      const mt = this.matterScratch[s] ?? 0;
      const en = this.energyScratch[s] ?? 0;
      const px = x0 + ((mt - mLo) / mRange) * pW;
      const py = baseY - ((en - eLo) / eRange) * pH;
      const atWar = (this.warsLatest[s] ?? 0) > 0;
      const color = atWar ? this.danger : (this.seriesColors[s] ?? ACCENT_FALLBACK);
      x.globalAlpha = 1;
      x.fillStyle = color;
      this.glowOn(x, color, atWar ? 7 : 4);
      x.beginPath();
      x.arc(px, py, atWar ? 6 : 4.5, 0, Math.PI * 2);
      x.fill();
      this.glowOff(x);
    }
    // Axis labels.
    x.globalAlpha = 0.85;
    x.font = VALUE_FONT;
    x.fillStyle = INK;
    x.textBaseline = 'alphabetic';
    x.textAlign = 'start';
    x.fillText('matter→', x0 + 2, h - 4);
    x.save();
    x.translate(8, baseY);
    x.rotate(-Math.PI / 2);
    x.fillText('energy→', 0, 0);
    x.restore();
    this.title(x, 'titan matter × energy', w);
  }

  /**
   * `#obs-c11`: titan roster — one row per titan (color swatch + truncated lore name + a
   * matter/energy readout) laid out responsively in the padded plot region (V6.1). Rows get real
   * height with a gap via {@link rosterLayout}, collapsing to a compact 2-column grid when a short
   * canvas can't give 10 single-file rows room; names are ellipsis-truncated by
   * {@link truncateToWidth} so they never collide with the right-aligned value. Names come from
   * the latest push. O(S).
   */
  private drawEcologyLegend(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const region = plotRect(w, h);
    const lay = rosterLayout(region, OBS_SERIES, ROSTER_MIN_ROW_H, ROW_GAP);
    x.font = VALUE_FONT;
    x.textBaseline = 'middle';
    for (let s = 0; s < OBS_SERIES; s++) {
      const col = lay.cols === 2 ? Math.floor(s / lay.rows) : 0;
      const rowInCol = lay.cols === 2 ? s % lay.rows : s;
      const cellX = region.left + col * lay.cellW;
      const cellTop = region.top + rowInCol * lay.cellH;
      const cy = cellTop + lay.innerH * 0.5;
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      const swatch = Math.min(lay.innerH * 0.7, lay.cellW * 0.18);
      const swX = cellX + ROW_INSET;
      // Color swatch (glowing), inset from the cell edge, keyed to the phase portrait.
      x.globalAlpha = 1;
      x.fillStyle = color;
      this.glowOn(x, color, 3);
      x.fillRect(swX, cy - swatch * 0.5, swatch, swatch);
      this.glowOff(x);
      // Per-titan matter / energy readout pinned to the cell's right edge first, so the name's
      // available width is the remaining gap (name + value can never collide).
      const mt = this.matterScratch[s] ?? 0;
      const en = this.energyScratch[s] ?? 0;
      const atWar = (this.warsLatest[s] ?? 0) > 0;
      const valText = `${fmtCompact(mt)}m ${fmtCompact(en)}e`;
      const cellRight = cellX + lay.cellW - ROW_INSET;
      const valW = x.measureText(valText).width;
      x.globalAlpha = 1;
      x.textAlign = 'end';
      x.fillStyle = atWar ? this.danger : DIM;
      x.fillText(valText, cellRight, cy);
      // Truncated name in the space between the swatch and the value column.
      const nameX = swX + swatch + ROW_INSET;
      const nameW = cellRight - valW - ROW_INSET - nameX;
      const nm = truncateToWidth(x, this.names[s] || `titan ${s}`, nameW);
      x.textAlign = 'start';
      x.fillStyle = INK;
      x.fillText(nm, nameX, cy);
    }
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    x.globalAlpha = 1;
    this.title(x, 'titan roster', w);
  }

  // ============================================================================================
  // Page 3 — CONFLICT
  // ============================================================================================

  /**
   * `#obs-c12`: war-intensity timeline — the fraction of war cells in the matrix over time
   * (danger line, fixed 0..1 scale over a dim midline). Reads {@link warIntensityRing}. O(m).
   */
  private drawWarIntensity(): void {
    const { c, x } = this.slot(0);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.warIntensityRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'war intensity', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    // Auto-scale to the window peak so low-grade conflict is still legible.
    const m = Math.floor((n - 1) / stride) + 1;
    let hi = 1e-3;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const v = ring.at(0, i);
      if (v > hi) hi = v;
    }
    const pTop = top + 2;
    const baseY = h - 4;
    const pH = baseY - pTop;
    // Gridlines labeled as % of cells at war.
    this.grid(x, w, pTop, baseY, 0, hi * 100, 2, '%');
    // Filled area under the danger line.
    x.fillStyle = this.danger;
    x.globalAlpha = 0.3;
    x.beginPath();
    x.moveTo(0, baseY);
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = baseY - (ring.at(0, i) / hi) * pH;
      x.lineTo(px, py);
    }
    x.lineTo(w, baseY);
    x.closePath();
    x.fill();
    // Bright glowing line.
    x.globalAlpha = 1;
    x.lineWidth = 2.4;
    x.strokeStyle = this.danger;
    this.glowOn(x, this.danger, 6);
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = baseY - (ring.at(0, i) / hi) * pH;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    this.glowOff(x);
    x.globalAlpha = 1;
    this.title(x, 'war intensity', w);
    this.readout(x, `${fmtCompact(ring.at(0, n - 1) * 100)}% cells`, w);
  }

  /**
   * `#obs-c13`: alliance/truce/war stacked-count timeline — truce (dim), war (danger) and
   * alliance (accent) cell counts stacked to the constant {@link WAR_CELLS} total. Reads
   * {@link warCountsRing} (truce@0, war@1, alliance@2). O(3·m).
   */
  private drawWarStacked(): void {
    const { c, x } = this.slot(1);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const ring = this.warCountsRing;
    const n = ring.count;
    if (n < 2) {
      this.title(x, 'truce / war / ally', w);
      return;
    }
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    // Series == stack slot: truce@0 (bottom), war@1, alliance@2 (top).
    const total = WAR_CELLS;
    const pTop = top + 2;
    const baseY = h - 18; // legend strip
    const pH = baseY - pTop;
    // Percentage rails (0/50/100% of the 100 cells).
    this.grid(x, w, pTop, baseY, 0, 100, 2, '');
    // Draw from the top series down so each band sits on the cumulative of the ones below.
    for (let s = 2; s >= 0; s--) {
      const color = this.warStackColors[s] ?? DIM;
      x.fillStyle = color;
      x.globalAlpha = s === 0 ? 0.32 : 0.78;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        let acc = 0;
        for (let u = 0; u <= s; u++) acc += ring.at(u, i);
        const py = baseY - (acc / total) * pH;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.lineTo(w, baseY);
      x.lineTo(0, baseY);
      x.closePath();
      x.fill();
      // Bright edge on the war + alliance bands so transitions are visible.
      if (s > 0) {
        x.globalAlpha = 1;
        x.lineWidth = 1.6;
        x.strokeStyle = color;
        this.glowOn(x, color, 3);
        x.beginPath();
        for (let k = 0; k < m; k++) {
          const i = k === m - 1 ? n - 1 : k * stride;
          const px = (i / (n - 1)) * w;
          let acc = 0;
          for (let u = 0; u <= s; u++) acc += ring.at(u, i);
          const py = baseY - (acc / total) * pH;
          if (k === 0) x.moveTo(px, py);
          else x.lineTo(px, py);
        }
        x.stroke();
        this.glowOff(x);
      }
    }
    x.globalAlpha = 1;
    this.title(x, 'truce / war / ally', w);
    this.legend(x, ['truce', 'war', 'ally'], this.warStackColors, 3, w, h, (i) =>
      fmtCompact(ring.at(i, n - 1)),
    );
  }

  /**
   * `#obs-c14`: per-titan resource bars — one horizontal bar per titan, length by net holdings
   * (energy + matter − entropy, min/max-normalized across titans), in the series color and
   * outlined danger when at war. Reads the page-0 {@link ledgerRing} newest column plus
   * `warsLatest`. O(S).
   */
  private drawTitanResourceBars(): void {
    const { c, x } = this.slot(2);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const ring = this.ledgerRing;
    const n = ring.count;
    if (n < 1) {
      this.title(x, 'titan resources', w);
      return;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (let s = 0; s < OBS_SERIES; s++) {
      const v = ring.at(s, n - 1);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!(hi > lo)) hi = lo + 1;
    const range = hi - lo;
    const region = plotRect(w, h);
    const lay = rosterLayout(region, OBS_SERIES, ROSTER_MIN_ROW_H, ROW_GAP);
    x.font = VALUE_FONT;
    for (let s = 0; s < OBS_SERIES; s++) {
      const col = lay.cols === 2 ? Math.floor(s / lay.rows) : 0;
      const rowInCol = lay.cols === 2 ? s % lay.rows : s;
      const cellX = region.left + col * lay.cellW;
      const cellTop = region.top + rowInCol * lay.cellH;
      const trackX = cellX + ROW_INSET;
      const trackW = Math.max(1, lay.cellW - ROW_INSET * 2);
      // Split the row: a TEXT band (name left, value right) ABOVE a BAR track, so letters never
      // sit on the plotted bar (the user's "letters over the data" complaint). The bar reads the
      // bottom ~52% of the drawable cell; labels live in the top ~48%.
      const labelY = cellTop + lay.innerH * 0.28;
      const barTop = cellTop + lay.innerH * 0.56;
      const barH = Math.max(2, lay.innerH * 0.4);
      const v = ring.at(s, n - 1);
      const frac = (v - lo) / range;
      const bw = Math.max(2, frac * trackW);
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      const atWar = (this.warsLatest[s] ?? 0) > 0;
      // Track behind the bar so empty/short rows aren't dead space.
      x.globalAlpha = 1;
      x.fillStyle = GRID;
      x.fillRect(trackX, barTop, trackW, barH);
      // Bright glowing bar.
      x.fillStyle = color;
      this.glowOn(x, color, 3);
      x.fillRect(trackX, barTop, bw, barH);
      this.glowOff(x);
      if (atWar) {
        x.globalAlpha = 1;
        x.strokeStyle = this.danger;
        x.lineWidth = 2;
        x.strokeRect(trackX, barTop, bw, barH);
      }
      // Value pinned right first so the name's budget excludes it (no name/value collision).
      const valText = fmtCompact(v);
      const valW = x.measureText(valText).width;
      x.globalAlpha = 1;
      x.textBaseline = 'middle';
      x.textAlign = 'end';
      x.fillStyle = atWar ? this.danger : INK;
      x.fillText(valText, trackX + trackW, labelY);
      // Truncated name in the remaining width to the left of the value.
      const nameW = trackW - valW - ROW_INSET * 2;
      const nm = truncateToWidth(x, this.names[s] || `titan ${s}`, nameW);
      x.textAlign = 'start';
      x.fillStyle = INK;
      x.fillText(nm, trackX, labelY);
    }
    x.textAlign = 'start';
    x.textBaseline = 'alphabetic';
    x.globalAlpha = 1;
    this.title(x, 'titan resources', w);
  }

  /**
   * `#obs-c15`: biome "sentience" gauge — a 270° arc dial filled to `sentienceLatest` (0..1),
   * colored from warn (low) toward accent (high), with quarter ticks, a glowing needle and the
   * percentage in the hub plus a `BIOME SENTIENCE` title. Fed by the optional `snapshot.sentience`;
   * a missing value reads as 0. O(1).
   */
  private drawSentienceGauge(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const top = TITLE_BAND;
    const cx = w * 0.5;
    // V71: dial raised + shrunk to free the lower ~40% for the three dimension bars.
    const cy = top + (h - top) * 0.36;
    const radius = Math.min(w, h - top) * 0.27;
    const start = Math.PI * 0.75;
    const sweep = Math.PI * 1.5; // 270° dial
    const v = this.sentienceLatest;
    const hot = v >= 0.5 ? this.accent : this.warnColor;
    const lw = Math.max(7, radius * 0.2);
    // Track.
    x.globalAlpha = 0.35;
    x.strokeStyle = DIM;
    x.lineWidth = lw;
    x.lineCap = 'round';
    x.beginPath();
    x.arc(cx, cy, radius, start, start + sweep);
    x.stroke();
    // Filled value arc (warn → accent as it climbs) with glow.
    x.globalAlpha = 1;
    x.strokeStyle = hot;
    this.glowOn(x, hot, 8);
    x.beginPath();
    x.arc(cx, cy, radius, start, start + sweep * v);
    x.stroke();
    this.glowOff(x);
    x.lineCap = 'butt';
    // Quarter ticks around the dial (0/25/50/75/100%).
    x.globalAlpha = 0.7;
    x.strokeStyle = INK;
    x.lineWidth = 1.5;
    for (let t = 0; t <= 4; t++) {
      const ta = start + sweep * (t / 4);
      const r0 = radius + lw * 0.6;
      const r1 = radius + lw * 0.95;
      x.beginPath();
      x.moveTo(cx + Math.cos(ta) * r0, cy + Math.sin(ta) * r0);
      x.lineTo(cx + Math.cos(ta) * r1, cy + Math.sin(ta) * r1);
      x.stroke();
    }
    // Needle.
    const ang = start + sweep * v;
    x.globalAlpha = 1;
    x.strokeStyle = hot;
    x.lineWidth = 2.4;
    this.glowOn(x, hot, 5);
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(ang) * radius * 0.92, cy + Math.sin(ang) * radius * 0.92);
    x.stroke();
    this.glowOff(x);
    // Center readout.
    x.font = LABEL_FONT;
    x.fillStyle = hot;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(`${Math.round(v * 100)}%`, cx, cy);
    x.textBaseline = 'alphabetic';
    x.textAlign = 'start';
    // V71: the three MEASURABLE dimensions the composite blends (label · bar · %), so the biome's
    // aliveness is readable, not one black-box number — INTEGRATION (community structure → integrated
    // information), COHERENCE (quantum entropy → criticality), MOMENTUM (demographic slope → autopoiesis).
    const dims: ReadonlyArray<readonly [string, number]> = [
      ['INTEGRATION', this.bioIntLatest],
      ['COHERENCE', this.bioCohLatest],
      ['MOMENTUM', this.bioMomLatest],
    ];
    const bx = w * 0.1;
    const bw = w * 0.8;
    const barH = Math.max(4, (h - top) * 0.04);
    const zoneTop = cy + radius + lw * 1.2;
    const rowGap = (h - 6 - zoneTop) / dims.length;
    x.font = '600 13px "JetBrains Mono", ui-monospace, monospace';
    for (let i = 0; i < dims.length; i++) {
      const d = dims[i];
      if (!d || rowGap <= 0) continue;
      const ry = zoneTop + rowGap * i + Math.max(12, rowGap * 0.45);
      const col = d[1] >= 0.5 ? this.accent : this.warnColor;
      x.globalAlpha = 0.9;
      x.fillStyle = INK;
      x.textAlign = 'left';
      x.fillText(d[0], bx, ry - 3);
      x.textAlign = 'right';
      x.fillStyle = col;
      x.fillText(`${Math.round(d[1] * 100)}%`, bx + bw, ry - 3);
      x.globalAlpha = 0.3;
      x.fillStyle = DIM;
      x.fillRect(bx, ry, bw, barH);
      x.globalAlpha = 1;
      x.fillStyle = col;
      x.fillRect(bx, ry, bw * d[1], barH);
    }
    x.globalAlpha = 1;
    x.textAlign = 'start';
    this.title(x, 'biome sentience', w);
  }
}
