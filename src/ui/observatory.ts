/**
 * Observatory — the live data-viz panel (CONTRACTS V3.5 + V4.3 multi-page XENOGENESIS).
 *
 * FOUR pages of canvas charts, redrawn on a slow cadence (world calls `draw()` every ~18
 * frames). Page p uses canvases `#obs-c{4p+0..4p+3}` (p0 → obs-c0..3, p1 → obs-c4..7,
 * p2 → obs-c8..11, p3 → obs-c12..15). `setPage(p)` selects the active page; `draw()` renders
 * ONLY that page's four canvases. A page whose canvases (or 2d contexts) are missing no-ops
 * and logs a single `console.warn` the first time it is drawn.
 *
 * - Page 0 (V3.5, unchanged): stacked phylum-population area, titan economy ledger,
 *   10×10 war-matrix heat grid, environment triple-line (rdEnergy/qEntropy/trend).
 * - Page 1 VARIANCE: rolling mean±σ bands for population/energy/links; population histogram;
 *   phylum Shannon-diversity (H) timeline; qEntropy-vs-trend phase scatter.
 * - Page 2 ECOLOGY: 10 per-phylum mini-sparklines (small multiples); birth/death flux
 *   timeline; titan matter-vs-energy phase portrait.
 * - Page 3 CONFLICT: war-intensity timeline; alliance/truce/war stacked counts; per-titan
 *   resource bars; biome "sentience" gauge fed by the optional `snapshot.sentience` (0..1).
 *
 * Follows the Sparkline conventions from ./graphs: one cached 2d context per canvas, a
 * 2×-CSS-pixel HiDPI backing store refreshed only when stale, the same dark backing fill, and
 * allocation-free `push()`/`draw()` bodies. Every page's rings, scratch buffers and palette
 * strings are pre-allocated at construction:
 * - page 0: phylumRing (10×180), ledgerRing (10×180), envRing (3×180) and `stackScratch`
 *   (10×180), `wealthScratch`/`warsLatest` (Float32Array 10), `envScratch` (Float32Array 3),
 *   `warScratch` (Uint8Array 100), `names` (string[10]);
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

/** Number of chart series on the stacked/ledger charts (10 phyla, 10 titans). */
export const OBS_SERIES = 10;
/** Rolling-window capacity of every observatory ring, in samples (CONTRACTS V3.5). */
export const OBS_RING_CAPACITY = 180;
/** Series on the environment timeline chart: rdEnergy, qEntropy, trend. */
export const OBS_ENV_SERIES = 3;
/** Cells in the titan war matrix (10 × 10, row-major). */
export const WAR_CELLS = 100;
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
  /** 10×10 row-major war matrix, values 0 truce/none, 1 war, 2 alliance. */
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
 * Map a raw war-matrix value to a palette slot: 0 = truce/none, 1 = war, 2 = alliance.
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
/** 2× backing-store font ≈ 10.5px CSS; reset by canvas resizes, so set per draw. */
const LABEL_FONT = '600 21px "JetBrains Mono", ui-monospace, monospace';

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

  /** Backing-store size of the canvas most recently prepped (avoids a return-object alloc). */
  private pw = 0;
  private ph = 0;

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
    this.warColors = [DIM, this.danger, this.accent];
    this.warAlphas = [0.16, 0.85, 0.6];
    this.names = Array.from({ length: OBS_SERIES }, () => '');
    this.statColors = [this.accent, this.warnColor, this.danger];
    this.warStackColors = [DIM, this.danger, this.accent];
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
      if (slot === 2) allies++;
      else if (slot === 1) wars++;
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

    // Page 3: sentience gauge scalar (clamped to 0..1).
    const sen = snapshot.sentience ?? 0;
    this.sentienceLatest = Number.isFinite(sen) ? (sen < 0 ? 0 : sen > 1 ? 1 : sen) : 0;
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
   * the dark backing fill. Returns false when the canvas has no layout size (hidden panel).
   * O(1).
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
    x.clearRect(0, 0, this.pw, this.ph);
    x.fillStyle = BACKING;
    x.fillRect(0, 0, this.pw, this.ph);
    return true;
  }

  /**
   * Stroke one ring series as a normalized polyline: value `lo` maps to the 8% bottom margin,
   * `lo + range` to the 8% top margin (so a symmetric `lo = -a, range = 2a` centers zero on
   * the canvas midline). O(m) where m = downsampled points; allocation-free.
   */
  private polyline(
    x: CanvasRenderingContext2D,
    ring: SeriesRing,
    s: number,
    n: number,
    stride: number,
    w: number,
    h: number,
    lo: number,
    range: number,
    color: string,
  ): void {
    const m = Math.floor((n - 1) / stride) + 1;
    x.strokeStyle = color;
    x.beginPath();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = h * 0.92 - ((ring.at(s, i) - lo) / range) * h * 0.84;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
  }

  /** Small page-title caption in the top-left, in the accent color. O(1). */
  private caption(x: CanvasRenderingContext2D, text: string, color: string): void {
    x.globalAlpha = 1;
    x.font = LABEL_FONT;
    x.fillStyle = color;
    x.fillText(text, 8, 24);
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
    const ring = this.phylumRing;
    const n = ring.count;
    if (n < 2) return;
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
    x.lineWidth = 1.2;
    for (let s = 0; s < OBS_SERIES; s++) {
      const color = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.strokeStyle = color;
      x.fillStyle = color;
      x.globalAlpha = 1;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const top = this.stackScratch[s * OBS_RING_CAPACITY + k] ?? 0;
        const py = h - (top / maxTotal) * h * 0.92;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      // Sparkline order: stroke the top edge, then close the band along the previous
      // cumulative (or the baseline for series 0) and fill translucently.
      x.stroke();
      for (let k = m - 1; k >= 0; k--) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const bottom = s === 0 ? 0 : (this.stackScratch[(s - 1) * OBS_RING_CAPACITY + k] ?? 0);
        const py = h - (bottom / maxTotal) * h * 0.92;
        x.lineTo(px, py);
      }
      x.closePath();
      x.globalAlpha = 0.35;
      x.fill();
    }
    x.globalAlpha = 1;
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
    const ring = this.ledgerRing;
    const n = ring.count;
    if (n < 2) return;
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
    x.lineWidth = 1.4;
    x.globalAlpha = 0.9;
    for (let s = 0; s < OBS_SERIES; s++) {
      this.polyline(
        x,
        ring,
        s,
        n,
        stride,
        w,
        h,
        lo,
        range,
        this.seriesColors[s] ?? ACCENT_FALLBACK,
      );
      if ((this.warsLatest[s] ?? 0) > 0) {
        const py = h * 0.92 - ((ring.at(s, n - 1) - lo) / range) * h * 0.84;
        x.fillStyle = this.danger;
        x.fillRect(w - 7, py - 3.5, 7, 7);
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
    const nm = this.names[best] ?? '';
    if (nm.length > 0) {
      x.globalAlpha = 1;
      x.font = LABEL_FONT;
      x.fillStyle = this.seriesColors[best] ?? ACCENT_FALLBACK;
      x.fillText(nm, 8, 24);
    }
    x.globalAlpha = 1;
  }

  /**
   * `#obs-c2`: 10×10 war-matrix heat grid. Cell color/alpha by {@link warPaletteIndex}:
   * dim slate truce, danger war, accent alliance. O(C) = O(100).
   */
  private drawWarGrid(): void {
    const { c, x } = this.slot(2);
    if (!c || !x || !this.prep(c, x)) return;
    const cw = this.pw / 10;
    const ch = this.ph / 10;
    const pad = Math.min(2, cw * 0.08);
    for (let r = 0; r < 10; r++) {
      for (let q = 0; q < 10; q++) {
        const idx = warPaletteIndex(this.warScratch[r * 10 + q] ?? 0);
        x.fillStyle = this.warColors[idx] ?? DIM;
        x.globalAlpha = this.warAlphas[idx] ?? 1;
        x.fillRect(q * cw + pad, r * ch + pad, cw - pad * 2, ch - pad * 2);
      }
    }
    x.globalAlpha = 1;
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
    const ring = this.envRing;
    const n = ring.count;
    if (n < 2) return;
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
    // Trend midline (zero axis).
    x.strokeStyle = DIM;
    x.globalAlpha = 0.3;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, h * 0.5);
    x.lineTo(w, h * 0.5);
    x.stroke();
    x.globalAlpha = 0.95;
    x.lineWidth = 1.4;
    this.polyline(x, ring, 0, n, stride, w, h, 0, rdMax, this.accent);
    this.polyline(x, ring, 1, n, stride, w, h, 0, 1, this.warnColor);
    this.polyline(x, ring, 2, n, stride, w, h, -trendAbs, trendAbs * 2, this.danger);
    x.globalAlpha = 1;
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
    const ring = this.statRing;
    const n = ring.count;
    if (n < 2) return;
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
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
      // ±σ band as a closed translucent ribbon around the mean polyline.
      x.fillStyle = color;
      x.globalAlpha = 0.18;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = h * 0.92 - ((ring.at(s, i) + sd - lo) / range) * h * 0.84;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      for (let k = m - 1; k >= 0; k--) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        const py = h * 0.92 - ((ring.at(s, i) - sd - lo) / range) * h * 0.84;
        x.lineTo(px, py);
      }
      x.closePath();
      x.fill();
      // Mean polyline.
      x.globalAlpha = 0.95;
      x.lineWidth = 1.4;
      this.polyline(x, ring, s, n, stride, w, h, lo, range, color);
    }
    x.globalAlpha = 1;
    this.caption(x, 'pop/energy/links ±σ', this.accent);
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
    const ring = this.statRing;
    const n = ring.count;
    if (n < 1) return;
    const peak = histogramBins(ring, 0, n, OBS_RING_CAPACITY, this.histScratch);
    if (peak <= 0) return;
    const bins = this.histScratch.length;
    const bw = w / bins;
    x.fillStyle = this.accent;
    x.globalAlpha = 0.75;
    for (let b = 0; b < bins; b++) {
      const cnt = this.histScratch[b] ?? 0;
      const bh = (cnt / peak) * h * 0.84;
      x.fillRect(b * bw + 1, h * 0.95 - bh, bw - 2, bh);
    }
    x.globalAlpha = 1;
    this.caption(x, 'population histogram', this.accent);
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
    const ring = this.diversityRing;
    const n = ring.count;
    if (n < 2) return;
    const stride = strideFor(n, Math.max(2, w >> 1));
    x.strokeStyle = DIM;
    x.globalAlpha = 0.3;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, h * 0.5);
    x.lineTo(w, h * 0.5);
    x.stroke();
    x.globalAlpha = 0.95;
    x.lineWidth = 1.6;
    this.polyline(x, ring, 0, n, stride, w, h, 0, 1, this.warnColor);
    x.globalAlpha = 1;
    this.caption(x, 'phylum diversity H', this.warnColor);
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
    const ring = this.envRing;
    const n = ring.count;
    if (n < 2) return;
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    let trendAbs = 1e-6;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const tr = Math.abs(ring.at(2, i));
      if (tr > trendAbs) trendAbs = tr;
    }
    // Crosshair at (qEntropy 0.5, trend 0).
    x.strokeStyle = DIM;
    x.globalAlpha = 0.25;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, h * 0.5);
    x.lineTo(w, h * 0.5);
    x.moveTo(w * 0.5, 0);
    x.lineTo(w * 0.5, h);
    x.stroke();
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const qx = ring.at(1, i); // qEntropy ∈ [0, 1]
      const tr = ring.at(2, i);
      const px = (qx < 0 ? 0 : qx > 1 ? 1 : qx) * w;
      const py = h * 0.5 - (tr / (trendAbs * 2)) * h * 0.84;
      const newest = i === n - 1;
      x.globalAlpha = newest ? 1 : 0.3 + 0.5 * (k / Math.max(1, m - 1));
      x.fillStyle = newest ? this.accent : this.warnColor;
      const rad = newest ? 4 : 2;
      x.beginPath();
      x.arc(px, py, rad, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    this.caption(x, 'qEntropy × trend', this.accent);
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
    const ring = this.phylumRing;
    const n = ring.count;
    if (n < 2) return;
    const cols = 5;
    const rows = 2;
    const cw = w / cols;
    const ch = h / rows;
    const stride = strideFor(n, Math.max(2, (cw | 0) >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    x.lineWidth = 1.3;
    for (let s = 0; s < OBS_SERIES; s++) {
      const gx = (s % cols) * cw;
      const gy = Math.floor(s / cols) * ch;
      // Per-cell max for an independent vertical scale.
      let hi = 1e-6;
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const v = ring.at(s, i);
        if (v > hi) hi = v;
      }
      x.strokeStyle = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.globalAlpha = 0.9;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = gx + (i / (n - 1)) * cw;
        const py = gy + ch * 0.92 - (ring.at(s, i) / hi) * ch * 0.8;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
    }
    x.globalAlpha = 1;
    this.caption(x, 'phyla (small multiples)', this.accent);
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
    const ring = this.fluxRing;
    const n = ring.count;
    if (n < 2) return;
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
    const mid = h * 0.5;
    // Midline.
    x.strokeStyle = DIM;
    x.globalAlpha = 0.3;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, mid);
    x.lineTo(w, mid);
    x.stroke();
    // Births up (accent), deaths down (danger) as filled areas from the midline.
    this.fluxArea(x, ring, 0, n, stride, w, mid, mag, -1, this.accent);
    this.fluxArea(x, ring, 1, n, stride, w, mid, mag, 1, this.danger);
    x.globalAlpha = 1;
    this.caption(x, 'birth / death flux', this.accent);
  }

  /**
   * Fill one flux series as an area anchored on the midline, growing `dir` (−1 up / +1 down)
   * proportional to the magnitude scale `mag`. O(m); allocation-free.
   */
  private fluxArea(
    x: CanvasRenderingContext2D,
    ring: SeriesRing,
    s: number,
    n: number,
    stride: number,
    w: number,
    mid: number,
    mag: number,
    dir: 1 | -1,
    color: string,
  ): void {
    const m = Math.floor((n - 1) / stride) + 1;
    x.fillStyle = color;
    x.globalAlpha = 0.5;
    x.beginPath();
    x.moveTo(0, mid);
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const px = (i / (n - 1)) * w;
      const py = mid + dir * (ring.at(s, i) / mag) * mid * 0.9;
      x.lineTo(px, py);
    }
    x.lineTo(w, mid);
    x.closePath();
    x.fill();
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
    // Axes.
    x.strokeStyle = DIM;
    x.globalAlpha = 0.25;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, h * 0.92);
    x.lineTo(w, h * 0.92);
    x.moveTo(w * 0.08, 0);
    x.lineTo(w * 0.08, h);
    x.stroke();
    for (let s = 0; s < OBS_SERIES; s++) {
      const mt = this.matterScratch[s] ?? 0;
      const en = this.energyScratch[s] ?? 0;
      const px = w * 0.08 + ((mt - mLo) / mRange) * w * 0.86;
      const py = h * 0.92 - ((en - eLo) / eRange) * h * 0.84;
      const atWar = (this.warsLatest[s] ?? 0) > 0;
      x.globalAlpha = 0.9;
      x.fillStyle = atWar ? this.danger : (this.seriesColors[s] ?? ACCENT_FALLBACK);
      x.beginPath();
      x.arc(px, py, atWar ? 5 : 4, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    this.caption(x, 'titan matter × energy', this.accent);
  }

  /**
   * `#obs-c11`: ecology legend strip — 10 titan name chips in their series colors so the phase
   * portrait and small multiples are decodable. Names come from the latest push. O(S).
   */
  private drawEcologyLegend(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const rowH = h / OBS_SERIES;
    x.font = LABEL_FONT;
    x.textBaseline = 'middle';
    for (let s = 0; s < OBS_SERIES; s++) {
      const cy = rowH * (s + 0.5);
      x.globalAlpha = 1;
      x.fillStyle = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.fillRect(8, cy - rowH * 0.25, rowH * 0.4, rowH * 0.5);
      const nm = this.names[s] ?? '';
      if (nm.length > 0) {
        x.fillStyle = DIM;
        x.fillText(nm, 8 + rowH * 0.4 + 8, cy);
      }
    }
    x.textBaseline = 'alphabetic';
    x.globalAlpha = 1;
    void w;
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
    const ring = this.warIntensityRing;
    const n = ring.count;
    if (n < 2) return;
    const stride = strideFor(n, Math.max(2, w >> 1));
    // Auto-scale to the window peak so low-grade conflict is still legible.
    const m = Math.floor((n - 1) / stride) + 1;
    let hi = 1e-3;
    for (let k = 0; k < m; k++) {
      const i = k === m - 1 ? n - 1 : k * stride;
      const v = ring.at(0, i);
      if (v > hi) hi = v;
    }
    x.globalAlpha = 0.95;
    x.lineWidth = 1.6;
    this.polyline(x, ring, 0, n, stride, w, h, 0, hi, this.danger);
    x.globalAlpha = 1;
    this.caption(x, 'war intensity', this.danger);
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
    const ring = this.warCountsRing;
    const n = ring.count;
    if (n < 2) return;
    const stride = strideFor(n, Math.max(2, w >> 1));
    const m = Math.floor((n - 1) / stride) + 1;
    // Series == stack slot: truce@0 (bottom), war@1, alliance@2 (top).
    const total = WAR_CELLS;
    // Draw from the top series down so each band sits on the cumulative of the ones below.
    for (let s = 2; s >= 0; s--) {
      x.fillStyle = this.warStackColors[s] ?? DIM;
      x.globalAlpha = s === 0 ? 0.25 : 0.6;
      x.beginPath();
      for (let k = 0; k < m; k++) {
        const i = k === m - 1 ? n - 1 : k * stride;
        const px = (i / (n - 1)) * w;
        let acc = 0;
        for (let u = 0; u <= s; u++) acc += ring.at(u, i);
        const py = h - (acc / total) * h;
        if (k === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.lineTo(w, h);
      x.lineTo(0, h);
      x.closePath();
      x.fill();
    }
    x.globalAlpha = 1;
    this.caption(x, 'truce / war / alliance', this.accent);
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
    if (n < 1) return;
    let lo = Infinity;
    let hi = -Infinity;
    for (let s = 0; s < OBS_SERIES; s++) {
      const v = ring.at(s, n - 1);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!(hi > lo)) hi = lo + 1;
    const range = hi - lo;
    const rowH = h / OBS_SERIES;
    for (let s = 0; s < OBS_SERIES; s++) {
      const v = ring.at(s, n - 1);
      const frac = (v - lo) / range;
      const bw = 8 + frac * (w - 16);
      const cy = rowH * s + rowH * 0.15;
      const bh = rowH * 0.7;
      x.globalAlpha = 0.85;
      x.fillStyle = this.seriesColors[s] ?? ACCENT_FALLBACK;
      x.fillRect(8, cy, bw, bh);
      if ((this.warsLatest[s] ?? 0) > 0) {
        x.globalAlpha = 1;
        x.strokeStyle = this.danger;
        x.lineWidth = 2;
        x.strokeRect(8, cy, bw, bh);
      }
    }
    x.globalAlpha = 1;
    this.caption(x, 'titan resources', this.accent);
  }

  /**
   * `#obs-c15`: biome "sentience" gauge — a 240° arc dial filled to `sentienceLatest` (0..1),
   * colored from warn (low) toward accent (high) and captioned with the percentage. Fed by the
   * optional `snapshot.sentience`; a missing value reads as 0. O(1).
   */
  private drawSentienceGauge(): void {
    const { c, x } = this.slot(3);
    if (!c || !x || !this.prep(c, x)) return;
    const w = this.pw;
    const h = this.ph;
    const cx = w * 0.5;
    const cy = h * 0.62;
    const radius = Math.min(w, h) * 0.36;
    const start = Math.PI * 0.75;
    const sweep = Math.PI * 1.5; // 270° dial
    const v = this.sentienceLatest;
    // Track.
    x.globalAlpha = 0.25;
    x.strokeStyle = DIM;
    x.lineWidth = Math.max(6, radius * 0.18);
    x.beginPath();
    x.arc(cx, cy, radius, start, start + sweep);
    x.stroke();
    // Filled value arc (warn → accent as it climbs).
    x.globalAlpha = 0.95;
    x.strokeStyle = v >= 0.5 ? this.accent : this.warnColor;
    x.beginPath();
    x.arc(cx, cy, radius, start, start + sweep * v);
    x.stroke();
    // Needle.
    const ang = start + sweep * v;
    x.globalAlpha = 1;
    x.strokeStyle = v >= 0.5 ? this.accent : this.warnColor;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(ang) * radius * 0.92, cy + Math.sin(ang) * radius * 0.92);
    x.stroke();
    // Readout.
    x.font = LABEL_FONT;
    x.fillStyle = v >= 0.5 ? this.accent : this.warnColor;
    x.textAlign = 'center';
    x.fillText(`${Math.round(v * 100)}%`, cx, cy);
    x.textAlign = 'start';
    this.caption(x, 'biome sentience', this.accent);
  }
}
