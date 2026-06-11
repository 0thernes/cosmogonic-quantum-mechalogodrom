/**
 * Observatory — the live data-viz panel (CONTRACTS V3.5).
 *
 * Four canvas charts redrawn on a slow cadence (world calls `draw()` every ~18 frames):
 * - `#obs-c0` stacked phylum-population area chart (10 series, 180-sample ring),
 * - `#obs-c1` titan economy ledger (10 net-holdings polylines + war head markers),
 * - `#obs-c2` 10×10 titan war-matrix heat grid (0 truce / 1 war / 2 alliance),
 * - `#obs-c3` environment timelines (rdEnergy / qEntropy / trend triple-line).
 *
 * Follows the Sparkline conventions from ./graphs: one cached 2d context per canvas, a
 * 2×-CSS-pixel HiDPI backing store refreshed only when stale, the same dark backing fill, and
 * allocation-free `push()`/`draw()` bodies. All rings, scratch buffers and palette strings are
 * pre-allocated at construction:
 * - three {@link SeriesRing}s (phyla 10×180, titan wealth 10×180, environment 3×180),
 * - `stackScratch` (Float32Array 10×180) — cumulative sums for the stacked area bands,
 * - `wealthScratch`/`warsLatest` (Float32Array 10), `envScratch` (Float32Array 3),
 * - `warScratch` (Uint8Array 100) — latest war matrix copy,
 * - `names` (string[10]) — latest titan name references (assignment only, no string building).
 *
 * Theme colors are resolved ONCE at construction via `getComputedStyle` from the app.css
 * `@theme` tokens (`--color-tribe-0..7`, `--color-accent`, `--color-warn`,
 * `--color-danger-line`) with hex/hsl fallbacks when a token is unset.
 *
 * Degrades gracefully: when the `#obs-c0..#obs-c3` canvases are absent (or there is no DOM at
 * all, e.g. under `bun test`) the constructor logs a single `console.warn` and `push`/`draw`
 * become no-ops — the responsive writer lands the panel markup independently.
 *
 * The chart math (ring push/wrap, downsampling stride, palette mapping, token fallback) is
 * exported as pure DOM-free helpers so bun can test it without a canvas.
 */

/** Number of chart series on the stacked/ledger charts (10 phyla, 10 titans). */
export const OBS_SERIES = 10;
/** Rolling-window capacity of every observatory ring, in samples (CONTRACTS V3.5). */
export const OBS_RING_CAPACITY = 180;
/** Series on the environment timeline chart: rdEnergy, qEntropy, trend. */
export const OBS_ENV_SERIES = 3;
/** Cells in the titan war matrix (10 × 10, row-major). */
export const WAR_CELLS = 100;

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
 * pass straight through.
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

/**
 * Live observatory bound to the canvases `#obs-c0..#obs-c3`. See the module JSDoc for the
 * chart roster, scratch inventory and the degraded no-op mode.
 */
export class Observatory {
  /** False when any canvas/context was unavailable at construction — all methods no-op. */
  private readonly enabled: boolean;
  private readonly c0: HTMLCanvasElement | null;
  private readonly c1: HTMLCanvasElement | null;
  private readonly c2: HTMLCanvasElement | null;
  private readonly c3: HTMLCanvasElement | null;
  private readonly x0: CanvasRenderingContext2D | null;
  private readonly x1: CanvasRenderingContext2D | null;
  private readonly x2: CanvasRenderingContext2D | null;
  private readonly x3: CanvasRenderingContext2D | null;

  /** 10 series colors: tribe tokens 0..7 then accent and warn (resolved once). */
  private readonly seriesColors: readonly string[];
  /** War-state palette indexed by {@link warPaletteIndex}: truce, war, alliance. */
  private readonly warColors: readonly string[];
  /** Fill alpha per war state (truce cells stay dim so wars read at a glance). */
  private readonly warAlphas: readonly number[];
  private readonly accent: string;
  private readonly warnColor: string;
  private readonly danger: string;

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
  /** Latest per-titan active-war counts (war head markers). */
  private readonly warsLatest = new Float32Array(OBS_SERIES);
  /** Latest titan name references (dominant-titan label; assignment only). */
  private readonly names: string[];

  /** Backing-store size of the canvas most recently prepped (avoids a return-object alloc). */
  private pw = 0;
  private ph = 0;

  /**
   * Resolves the four canvases, their 2d contexts and the theme tokens once. When anything is
   * missing (including the whole DOM), warns once and disables the instance. O(1).
   */
  constructor() {
    const doc = typeof document === 'undefined' ? null : document;
    const grab = (id: string): HTMLCanvasElement | null => {
      if (!doc || typeof HTMLCanvasElement === 'undefined') return null;
      const el = doc.getElementById(id);
      return el instanceof HTMLCanvasElement ? el : null;
    };
    this.c0 = grab('obs-c0');
    this.c1 = grab('obs-c1');
    this.c2 = grab('obs-c2');
    this.c3 = grab('obs-c3');
    this.x0 = this.c0 ? this.c0.getContext('2d') : null;
    this.x1 = this.c1 ? this.c1.getContext('2d') : null;
    this.x2 = this.c2 ? this.c2.getContext('2d') : null;
    this.x3 = this.c3 ? this.c3.getContext('2d') : null;
    this.enabled = !!(this.x0 && this.x1 && this.x2 && this.x3);
    if (!this.enabled) {
      console.warn(
        'Observatory: canvases #obs-c0..#obs-c3 (or their 2d contexts) unavailable — observatory disabled',
      );
    }

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
  }

  /**
   * Record one snapshot into the rolling windows. Every value is COPIED — the caller may
   * reuse all snapshot arrays. O(S + C) where S = {@link OBS_SERIES} and C =
   * {@link WAR_CELLS}; allocation-free (writes into pre-allocated rings/scratch only).
   */
  push(snapshot: ObservatorySnapshot): void {
    if (!this.enabled) return;
    this.phylumRing.pushColumn(snapshot.phylumCounts);
    const ledger = snapshot.titanLedger;
    for (let s = 0; s < OBS_SERIES; s++) {
      const e = ledger[s];
      if (e) {
        this.wealthScratch[s] = e.energy + e.matter - e.entropy;
        this.warsLatest[s] = e.war;
        this.names[s] = e.name;
      } else {
        this.wealthScratch[s] = 0;
        this.warsLatest[s] = 0;
        this.names[s] = '';
      }
    }
    this.ledgerRing.pushColumn(this.wealthScratch);
    const wm = snapshot.warMatrix;
    for (let i = 0; i < WAR_CELLS; i++) {
      // Uint8 coercion truncates/wraps exotic inputs; warPaletteIndex clamps again at draw.
      this.warScratch[i] = wm[i] ?? 0;
    }
    this.envScratch[0] = snapshot.rdEnergy;
    this.envScratch[1] = snapshot.qEntropy;
    this.envScratch[2] = snapshot.trend;
    this.envRing.pushColumn(this.envScratch);
  }

  /**
   * Full redraw of all four charts. World calls this every ~18 frames (halve the cadence on
   * the phone tier). O(S·m + C) where S = 10 series, m ≤ 180 downsampled columns and C = 100
   * war cells; allocation-free (canvas path commands and pre-resolved color strings only).
   */
  draw(): void {
    if (!this.enabled) return;
    this.drawPhylum();
    this.drawLedger();
    this.drawWarGrid();
    this.drawEnv();
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
   * `#obs-c0`: stacked phylum-population area chart. Bands are cumulative sums precomputed
   * into `stackScratch`, auto-scaled to the window's max total. O(S·m).
   */
  private drawPhylum(): void {
    const c = this.c0;
    const x = this.x0;
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
    const c = this.c1;
    const x = this.x1;
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
    const c = this.c2;
    const x = this.x2;
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
    const c = this.c3;
    const x = this.x3;
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
}
