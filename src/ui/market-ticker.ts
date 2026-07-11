/**
 * Market Ticker (CONTRACTS V23; V71 three-section pass) — a self-building panel that makes the economy
 * INSPECTABLE. The directive's note that "Market has a lot of room" is honoured: instead of one strip
 * the panel now carries **three distinct, named data visuals, each with its own section + readout**:
 *
 *   1 PRICE FLOW    — a multi-series sparkline of AURUM/UMBRA FX + the QUANTA/ICHOR commodity prices
 *                     over a rolling history, plus the dominant reserve money, FX, prices, arb spread.
 *   2 WEALTH & POWER — labelled gauges for reserve dominance (AURUM vs UMBRA), cartel grip, and the
 *                     wealth-Gini inequality, plus total wealth + agent count.
 *   3 MARKET STRESS  — stress gauges for arbitrage, sanctions, black-market volume and live auctions.
 *
 * UI shell only — it never imports or mutates sim state; the world pushes a {@link MarketSummary} each
 * Observatory cadence via {@link update}. The sparkline keeps a continuous history ring; the two gauge
 * panels read the latest summary each beat. Every real telemetry the economy exposes is surfaced.
 */
import type { MarketSummary } from '../sim/economy';
import { CURRENCY_GLYPH, COMMODITY_GLYPH } from '../sim/economy';
import { mountToggle } from './panel-dock';
import { injectPanelBaseCSS } from './panel-shell';

const HISTORY = 120; // sparkline ring length

const STYLE = `
#cqm-mkt-toggle{border-color:rgba(255,196,90,.55);background:linear-gradient(180deg,rgba(24,16,4,.92),rgba(14,10,2,.88));color:#ffd98a}
#cqm-mkt-toggle:hover{transform:scale(1.06);background:rgba(40,28,8,.94)}
#cqm-mkt-toggle:focus-visible{outline:2px solid #ffb648;outline-offset:2px}
/* V71: taller + a touch wider so the three sections each get room; the body scrolls. */
#cqm-mkt-panel{position:fixed;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);z-index:71;width:min(94vw,360px);max-height:min(70vh,560px);display:none;flex-direction:column;
  border:1px solid rgba(255,196,90,.32);border-radius:12px;background:rgba(10,8,4,.95);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.65);font:12px/1.5 var(--font-mono,ui-monospace,monospace);color:#f0e2c8;overflow:hidden}
#cqm-mkt-panel.open{display:flex}
.cqm-mkt-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,196,90,.22);background:rgba(26,18,6,.75);flex:0 0 auto}
.cqm-mkt-head b{font-size:11px;letter-spacing:.14em;color:#ffcf7a;white-space:nowrap}
.cqm-mkt-x{margin-left:auto;background:rgba(8,6,2,.9);color:#ffd98a;border:1px solid rgba(255,196,90,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-mkt-x:focus-visible{outline:1px solid #ffb648}
.cqm-mkt-body{flex:1 1 auto;min-height:0;overflow-y:auto}
.cqm-mkt-sec{border-bottom:1px solid rgba(255,196,90,.14)}
.cqm-mkt-secname{display:flex;align-items:center;gap:6px;padding:6px 10px 2px;font:600 9px var(--font-mono,ui-monospace,monospace);
  letter-spacing:.16em;color:#ffc24a;text-transform:uppercase}
.cqm-mkt-secname .sub{margin-left:auto;font-weight:400;letter-spacing:.04em;color:#b9a87f;text-transform:none;font-size:9px}
.cqm-mkt-canvas{display:block;width:100%;height:auto;padding:2px 6px 4px}
.cqm-mkt-rows{padding:2px 10px 8px;display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3px 14px;align-content:start}
.cqm-mkt-rows .k{color:#b9a87f;font-size:10px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.cqm-mkt-rows .v{color:#fff2da;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-mkt-rows .hi{color:#ffd98a;font-weight:600}
.cqm-mkt-rows .warn{color:#ff8a6b}
`;

const PAL = {
  bg: '#0a0804',
  grid: '#3a2c10',
  aurum: '#ffc24a',
  umbra: '#9fb6dd',
  quanta: '#6bff9e',
  ichor: '#ff5cc8',
  track: 'rgba(255,196,90,.12)',
  warn: '#ff8a6b',
  text: '#f0e2c8',
  dim: '#b9a87f',
};

/** One labelled gauge bar spec for the WEALTH/STRESS sections. */
interface Gauge {
  label: string;
  frac: number; // 0..1 fill
  color: string;
  text: string; // the exact value shown at the right
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** One labelled readout row; returns the value `<span>` so {@link MarketTicker.update} can set it. */
function row(grid: HTMLElement, key: string, doc: Document): HTMLElement {
  const k = doc.createElement('div');
  k.className = 'k';
  k.textContent = key;
  const v = doc.createElement('div');
  v.className = 'v';
  v.textContent = '—';
  grid.appendChild(k);
  grid.appendChild(v);
  return v;
}

/** Owns the self-mounted panel. Construct ONCE (world.ts); call {@link update} each cadence. */
export class MarketTicker {
  private readonly panel: HTMLElement;
  private readonly r: Record<string, HTMLElement> = {};
  private open = false;
  // Section 1 — the rolling history ring for the sparkline.
  private readonly fxH = new Float32Array(HISTORY);
  private readonly pqH = new Float32Array(HISTORY);
  private readonly piH = new Float32Array(HISTORY);
  private head = 0;
  private len = 0;
  // The three section canvases.
  private readonly sparkCtx: CanvasRenderingContext2D | null;
  private readonly sparkCv: HTMLCanvasElement;
  private readonly wealthCtx: CanvasRenderingContext2D | null;
  private readonly wealthCv: HTMLCanvasElement;
  private readonly stressCtx: CanvasRenderingContext2D | null;
  private readonly stressCv: HTMLCanvasElement;
  // V122 (USER #4): the econometrics band — candles / returns+vol / Lorenz.
  private candleCtx: CanvasRenderingContext2D | null = null;
  private candleCv!: HTMLCanvasElement;
  private returnsCtx: CanvasRenderingContext2D | null = null;
  private returnsCv!: HTMLCanvasElement;
  private lorenzCtx: CanvasRenderingContext2D | null = null;
  private lorenzCv!: HTMLCanvasElement;
  private dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  constructor(doc: Document = document) {
    doc.getElementById('cqm-mkt-toggle')?.remove();
    doc.getElementById('cqm-mkt-panel')?.remove();
    doc.getElementById('cqm-mkt-style')?.remove(); // dedupe: the <style> was id-less → a fresh block piled into <head> on every World reconstruction (HMR / re-init)
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.id = 'cqm-mkt-style';
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-mkt-toggle';
    toggle.type = 'button';
    toggle.className = 'cqm-dock-toggle';
    toggle.textContent = '⊙ MARKET';
    toggle.setAttribute('aria-label', 'Open the market ticker');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc); // V33: live in the shared bottom dock bar, not a floating fixed button

    const panel = doc.createElement('section');
    panel.id = 'cqm-mkt-panel';
    panel.setAttribute('aria-label', 'Economy market ticker');
    panel.innerHTML =
      `<div class="cqm-mkt-head"><b>MARKET</b><button class="cqm-mkt-x" data-close aria-label="Close">✕</button></div>` +
      `<div class="cqm-mkt-body">` +
      // Section 1 — PRICE FLOW
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">① Price Flow<span class="sub">FX · commodities</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-spark></canvas><div class="cqm-mkt-rows" data-rows-flow></div></div>` +
      // Section 2 — WEALTH & POWER
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">② Wealth &amp; Power<span class="sub">dominance · inequality</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-wealth></canvas><div class="cqm-mkt-rows" data-rows-wealth></div></div>` +
      // Section 3 — MARKET STRESS
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">③ Market Stress<span class="sub">arbitrage · sanctions</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-stress></canvas><div class="cqm-mkt-rows" data-rows-stress></div></div>` +
      // V122 (USER #4) — the econometrics band: candles, returns/vol, Lorenz. All computed from the
      // REAL fx history ring + the economy's REAL wealth distribution — no fabricated series.
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">④ FX Candles<span class="sub">☉/☾ OHLC · 20 buckets</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-candles></canvas><div class="cqm-mkt-rows" data-rows-candles></div></div>` +
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">⑤ Returns &amp; Volatility<span class="sub">log-returns · σ · drawdown</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-returns></canvas><div class="cqm-mkt-rows" data-rows-returns></div></div>` +
      `<div class="cqm-mkt-sec"><div class="cqm-mkt-secname">⑥ Wealth Lorenz<span class="sub">distribution · inequality curve</span></div>` +
      `<canvas class="cqm-mkt-canvas" data-lorenz></canvas><div class="cqm-mkt-rows" data-rows-lorenz></div></div>` +
      `</div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.sparkCv = panel.querySelector('[data-spark]') as HTMLCanvasElement;
    this.sparkCtx = this.sparkCv.getContext('2d');
    this.wealthCv = panel.querySelector('[data-wealth]') as HTMLCanvasElement;
    this.wealthCtx = this.wealthCv.getContext('2d');
    this.stressCv = panel.querySelector('[data-stress]') as HTMLCanvasElement;
    this.stressCtx = this.stressCv.getContext('2d');
    this.candleCv = panel.querySelector('[data-candles]') as HTMLCanvasElement;
    this.candleCtx = this.candleCv.getContext('2d');
    this.returnsCv = panel.querySelector('[data-returns]') as HTMLCanvasElement;
    this.returnsCtx = this.returnsCv.getContext('2d');
    this.lorenzCv = panel.querySelector('[data-lorenz]') as HTMLCanvasElement;
    this.lorenzCtx = this.lorenzCv.getContext('2d');
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );

    const flow = panel.querySelector('[data-rows-flow]') as HTMLElement;
    this.r.dominant = row(flow, 'Reserve money', doc);
    this.r.fx = row(flow, '☉/☾ FX', doc);
    this.r.prices = row(flow, '◇ / ❖ price', doc);
    this.r.arb = row(flow, 'Arb spread', doc);

    const wealth = panel.querySelector('[data-rows-wealth]') as HTMLElement;
    this.r.wealth = row(wealth, 'Total wealth', doc);
    this.r.agents = row(wealth, 'Agents', doc);
    this.r.gini = row(wealth, 'Wealth Gini', doc);
    this.r.cartel = row(wealth, 'Cartel share', doc);

    const stress = panel.querySelector('[data-rows-stress]') as HTMLElement;
    this.r.sanctioned = row(stress, 'Sanctioned', doc);
    this.r.black = row(stress, 'Black market', doc);
    this.r.auctions = row(stress, 'Auctions', doc);

    // V122 (USER #4): econometrics readouts under each new visual.
    const candles = panel.querySelector('[data-rows-candles]') as HTMLElement;
    this.r.ohlc = row(candles, 'Last O/H/L/C', doc);
    this.r.range = row(candles, 'Window range', doc);
    const returns = panel.querySelector('[data-rows-returns]') as HTMLElement;
    this.r.vol = row(returns, 'σ (per tick)', doc);
    this.r.drawdown = row(returns, 'Max drawdown', doc);
    this.r.momentum = row(returns, 'Momentum', doc);
    const lorenz = panel.querySelector('[data-rows-lorenz]') as HTMLElement;
    this.r.top10 = row(lorenz, 'Top 10% hold', doc);
    this.r.bottom50 = row(lorenz, 'Bottom 50% hold', doc);
  }

  /** Whether the panel is open (the world can skip pushing summaries when closed). */
  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
  }

  /**
   * Record the latest market state into the sparkline ring (always, so history is continuous) and,
   * when open, repaint the three sections + readouts. Pure presentation; O(HISTORY) draw. Null-safe.
   */
  update(s: MarketSummary): void {
    this.fxH[this.head] = s.fx;
    this.pqH[this.head] = s.pQuanta;
    this.piH[this.head] = s.pIchor;
    this.head = (this.head + 1) % HISTORY;
    if (this.len < HISTORY) this.len++;
    if (!this.open) return;

    // ── Section 1 readouts ──
    const dom = s.dominant;
    const domGlyph = CURRENCY_GLYPH[dom];
    this.r.dominant!.textContent = `${dom} ${domGlyph} ${(s.aurumShare * 100).toFixed(0)}%/${((1 - s.aurumShare) * 100).toFixed(0)}%`;
    this.r.dominant!.className = 'v hi';
    this.r.fx!.textContent = s.fx.toFixed(3);
    this.r.prices!.textContent = `${COMMODITY_GLYPH.QUANTA}${s.pQuanta.toFixed(2)} / ${COMMODITY_GLYPH.ICHOR}${s.pIchor.toFixed(2)}`;
    this.r.arb!.textContent = `${(s.arbSpread * 100).toFixed(1)}%`;
    // ── Section 2 readouts ──
    this.r.wealth!.textContent = fmt(s.totalWealth);
    this.r.agents!.textContent = String(s.agents);
    this.r.gini!.textContent = s.gini.toFixed(3);
    this.r.cartel!.textContent = `${(s.cartelShare * 100).toFixed(1)}%`;
    // ── Section 3 readouts ──
    this.r.sanctioned!.textContent = String(s.sanctioned);
    this.r.sanctioned!.className = s.sanctioned > 0 ? 'v warn' : 'v';
    this.r.black!.textContent = s.blackVolume > 0 ? fmt(s.blackVolume) : '—';
    this.r.black!.className = s.blackVolume > 0 ? 'v warn' : 'v';
    this.r.auctions!.textContent =
      s.auctions > 0
        ? `${s.auctions} · ${s.lastAuctionCommodity ?? ''}${COMMODITY_GLYPH[s.lastAuctionCommodity ?? 'QUANTA']} @${s.lastAuctionPrice.toFixed(1)}`
        : '0';

    this.drawSpark();
    this.drawWealth(s);
    this.drawStress(s);
    this.drawCandles();
    this.drawReturns();
    this.drawLorenz(s);
  }

  /** Read the fx ring oldest→newest into a dense array (≤ HISTORY). O(len). */
  private fxSeries(): number[] {
    const out: number[] = [];
    for (let k = 0; k < this.len; k++) {
      out.push(this.fxH[(this.head - this.len + k + HISTORY) % HISTORY] ?? 0);
    }
    return out;
  }

  /** ④ FX candlesticks: the history ring bucketed into 20 OHLC candles (up amber, down magenta). */
  private drawCandles(): void {
    const ctx = this.candleCtx;
    if (!ctx) return;
    const cssH = 72;
    const cssW = this.fit(ctx, this.candleCv, cssH);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    const fx = this.fxSeries();
    if (fx.length < 4) return;
    const buckets = Math.min(20, Math.floor(fx.length / 2));
    const per = fx.length / buckets;
    interface Candle {
      o: number;
      h: number;
      l: number;
      c: number;
    }
    const candles: Candle[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (let b = 0; b < buckets; b++) {
      const s0 = Math.floor(b * per);
      const s1 = Math.max(s0 + 1, Math.floor((b + 1) * per));
      let h = -Infinity;
      let l = Infinity;
      for (let k = s0; k < s1 && k < fx.length; k++) {
        const v = fx[k] ?? 0;
        if (v > h) h = v;
        if (v < l) l = v;
      }
      const c: Candle = { o: fx[s0] ?? 0, h, l, c: fx[Math.min(s1, fx.length) - 1] ?? 0 };
      candles.push(c);
      if (c.h > hi) hi = c.h;
      if (c.l < lo) lo = c.l;
    }
    const span = hi - lo || 1;
    const yOf = (v: number): number => cssH - 6 - ((v - lo) / span) * (cssH - 12);
    const cw = (cssW - 8) / buckets;
    candles.forEach((c, b) => {
      const x = 4 + b * cw + cw / 2;
      const up = c.c >= c.o;
      ctx.strokeStyle = up ? PAL.aurum : PAL.ichor;
      ctx.fillStyle = up ? PAL.aurum : PAL.ichor;
      ctx.lineWidth = 1;
      ctx.beginPath(); // wick
      ctx.moveTo(x, yOf(c.h));
      ctx.lineTo(x, yOf(c.l));
      ctx.stroke();
      const bodyTop = yOf(Math.max(c.o, c.c));
      const bodyH = Math.max(1.5, Math.abs(yOf(c.o) - yOf(c.c)));
      ctx.fillRect(x - Math.max(1.5, cw * 0.28), bodyTop, Math.max(3, cw * 0.56), bodyH);
    });
    const last = candles[candles.length - 1]!;
    this.r.ohlc!.textContent = `${last.o.toFixed(2)}/${last.h.toFixed(2)}/${last.l.toFixed(2)}/${last.c.toFixed(2)}`;
    this.r.range!.textContent = `${lo.toFixed(2)} – ${hi.toFixed(2)}`;
  }

  /** ⑤ Log-return bars + realized volatility + max drawdown + momentum (all from the real ring). */
  private drawReturns(): void {
    const ctx = this.returnsCtx;
    if (!ctx) return;
    const cssH = 56;
    const cssW = this.fit(ctx, this.returnsCv, cssH);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    const fx = this.fxSeries();
    if (fx.length < 3) return;
    const rets: number[] = [];
    for (let k = 1; k < fx.length; k++) {
      const a = fx[k - 1] ?? 1;
      const b = fx[k] ?? 1;
      rets.push(a > 0 && b > 0 ? Math.log(b / a) : 0);
    }
    let mean = 0;
    for (const r of rets) mean += r;
    mean /= rets.length;
    let varSum = 0;
    for (const r of rets) varSum += (r - mean) * (r - mean);
    const sigma = Math.sqrt(varSum / Math.max(1, rets.length - 1));
    // Max drawdown over the window: deepest peak→trough drop, the risk number traders live by.
    let peak = fx[0] ?? 1;
    let mdd = 0;
    for (const v of fx) {
      if (v > peak) peak = v;
      else if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak);
    }
    const mid = cssH / 2;
    const maxAbs = Math.max(1e-9, ...rets.map((r) => Math.abs(r)));
    const bw = (cssW - 8) / rets.length;
    ctx.strokeStyle = PAL.grid;
    ctx.beginPath();
    ctx.moveTo(2, mid);
    ctx.lineTo(cssW - 2, mid);
    ctx.stroke();
    rets.forEach((r, k) => {
      const x = 4 + k * bw;
      const h = (Math.abs(r) / maxAbs) * (cssH / 2 - 4);
      ctx.fillStyle = r >= 0 ? PAL.quanta : PAL.warn;
      ctx.fillRect(x, r >= 0 ? mid - h : mid, Math.max(1, bw * 0.7), Math.max(1, h));
    });
    const mom = rets.slice(-12).reduce((a, b) => a + b, 0);
    this.r.vol!.textContent = `${(sigma * 100).toFixed(2)}%`;
    this.r.drawdown!.textContent = `${(mdd * 100).toFixed(1)}%`;
    this.r.drawdown!.className = mdd > 0.1 ? 'v warn' : 'v';
    this.r.momentum!.textContent = `${mom >= 0 ? '▲' : '▼'} ${(mom * 100).toFixed(2)}%`;
    this.r.momentum!.className = mom >= 0 ? 'v hi' : 'v warn';
  }

  /** ⑥ The REAL Lorenz curve from the economy's wealth deciles — the inequality gap shaded. */
  private drawLorenz(s: MarketSummary): void {
    const ctx = this.lorenzCtx;
    if (!ctx) return;
    const cssH = 84;
    const cssW = this.fit(ctx, this.lorenzCv, cssH);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    const px = 6;
    const plotW = cssW - px * 2;
    const plotH = cssH - 12;
    const X = (f: number): number => px + f * plotW;
    const Y = (f: number): number => cssH - 6 - f * plotH;
    // Equality diagonal.
    ctx.strokeStyle = PAL.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(1), Y(1));
    ctx.stroke();
    ctx.setLineDash([]);
    // The Lorenz curve through (d/10, deciles[d-1]) — fill the inequality gap.
    const d = s.deciles;
    if (!d || d.length !== 10) return;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (let i = 0; i < 10; i++) ctx.lineTo(X((i + 1) / 10), Y(clamp01(d[i] ?? 0)));
    ctx.lineTo(X(1), Y(1));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,138,107,.18)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (let i = 0; i < 10; i++) ctx.lineTo(X((i + 1) / 10), Y(clamp01(d[i] ?? 0)));
    ctx.strokeStyle = PAL.aurum;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    this.r.top10!.textContent = `${(s.topDecileShare * 100).toFixed(1)}%`;
    this.r.top10!.className = s.topDecileShare > 0.5 ? 'v warn' : 'v hi';
    this.r.bottom50!.textContent = `${(clamp01(d[4] ?? 0) * 100).toFixed(1)}%`;
  }

  /** Section 1: sparkline of FX (amber) + QUANTA (green) + ICHOR (magenta) over the history ring. */
  private drawSpark(): void {
    const ctx = this.sparkCtx;
    if (!ctx) return;
    const cssW = this.fit(ctx, this.sparkCv, 64);
    const cssH = 64;
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    const series: [Float32Array, string][] = [
      [this.fxH, PAL.aurum],
      [this.pqH, PAL.quanta],
      [this.piH, PAL.ichor],
    ];
    // Shared scale across all series so their relative motion reads.
    let lo = Infinity;
    let hi = -Infinity;
    for (const [buf] of series) {
      for (let k = 0; k < this.len; k++) {
        const v = buf[(this.head - this.len + k + HISTORY) % HISTORY] ?? 0;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const span = hi - lo || 1;
    for (const [buf, color] of series) {
      ctx.beginPath();
      for (let k = 0; k < this.len; k++) {
        const v = buf[(this.head - this.len + k + HISTORY) % HISTORY] ?? 0;
        const x = (k / Math.max(1, this.len - 1)) * (cssW - 4) + 2;
        const y = cssH - 4 - ((v - lo) / span) * (cssH - 8);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  /** Section 2: reserve dominance, cartel grip, and Gini inequality as labelled gauges. */
  private drawWealth(s: MarketSummary): void {
    const ctx = this.wealthCtx;
    if (!ctx) return;
    const gauges: Gauge[] = [
      {
        label: `${s.dominant === 'AURUM' ? '☉' : '☾'} RESERVE`,
        frac: Math.max(s.aurumShare, 1 - s.aurumShare),
        color: s.dominant === 'AURUM' ? PAL.aurum : PAL.umbra,
        text: `${(Math.max(s.aurumShare, 1 - s.aurumShare) * 100).toFixed(0)}%`,
      },
      {
        label: 'CARTEL',
        frac: clamp01(s.cartelShare),
        color: s.cartelShare > 0.4 ? PAL.warn : PAL.aurum,
        text: `${(s.cartelShare * 100).toFixed(0)}%`,
      },
      {
        label: 'GINI',
        frac: clamp01(s.gini),
        color: s.gini > 0.6 ? PAL.warn : PAL.quanta,
        text: s.gini.toFixed(2),
      },
    ];
    this.drawGauges(ctx, this.wealthCv, gauges);
  }

  /** Section 3: arbitrage, sanctions, black-market and auction pressure as stress gauges. */
  private drawStress(s: MarketSummary): void {
    const ctx = this.stressCtx;
    if (!ctx) return;
    const blackFrac = s.blackVolume > 0 ? clamp01(s.blackVolume / (s.totalWealth * 0.08 + 1)) : 0;
    const gauges: Gauge[] = [
      {
        label: 'ARB',
        frac: clamp01(s.arbSpread / 0.15),
        color: s.arbSpread > 0.08 ? PAL.warn : PAL.aurum,
        text: `${(s.arbSpread * 100).toFixed(1)}%`,
      },
      {
        label: 'SANCTION',
        frac: clamp01(s.sanctioned / 12),
        color: s.sanctioned > 0 ? PAL.warn : PAL.dim,
        text: String(s.sanctioned),
      },
      {
        label: 'BLACK MKT',
        frac: blackFrac,
        color: s.blackVolume > 0 ? PAL.ichor : PAL.dim,
        text: s.blackVolume > 0 ? fmt(s.blackVolume) : '—',
      },
      {
        label: 'AUCTIONS',
        frac: clamp01(s.auctions / 8),
        color: s.auctions > 0 ? PAL.quanta : PAL.dim,
        text: String(s.auctions),
      },
    ];
    this.drawGauges(ctx, this.stressCv, gauges);
  }

  /** Shared horizontal-gauge renderer: label · track+fill · exact value. Height scales to bar count. */
  private drawGauges(
    ctx: CanvasRenderingContext2D,
    cv: HTMLCanvasElement,
    gauges: readonly Gauge[],
  ): void {
    const rowH = 17;
    const cssH = gauges.length * rowH + 6;
    const cssW = this.fit(ctx, cv, cssH);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.textBaseline = 'middle';
    ctx.font = '8.5px ui-monospace,monospace';
    const labW = 58;
    const valW = 40;
    const barX = labW + 4;
    const barW = cssW - barX - valW - 4;
    gauges.forEach((g, i) => {
      const y = 3 + i * rowH + rowH / 2;
      ctx.fillStyle = PAL.dim;
      ctx.textAlign = 'left';
      ctx.fillText(g.label, 4, y);
      // track
      ctx.fillStyle = PAL.track;
      ctx.fillRect(barX, y - 4, barW, 8);
      // fill
      ctx.fillStyle = g.color;
      ctx.fillRect(barX, y - 4, Math.max(1, barW * clamp01(g.frac)), 8);
      // value
      ctx.fillStyle = PAL.text;
      ctx.textAlign = 'right';
      ctx.fillText(g.text, cssW - 3, y);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Size a canvas to the panel width × `cssH` (DPR-backed) and return the CSS width. */
  private fit(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, cssH: number): number {
    const cssW = Math.max(120, (this.panel.clientWidth || 320) - 12);
    if (cv.width !== cssW * this.dpr || cv.height !== cssH * this.dpr) {
      cv.width = cssW * this.dpr;
      cv.height = cssH * this.dpr;
      cv.style.height = cssH + 'px';
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return cssW;
  }
}

/** Compact human number (1.2k, 3.4M) for the readout. */
function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(0);
}
