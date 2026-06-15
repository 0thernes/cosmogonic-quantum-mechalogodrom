/**
 * Market Ticker (CONTRACTS V23) — a self-building panel that makes the economy INSPECTABLE: the live
 * AURUM/UMBRA market state in a scientific readout + a price/FX sparkline. UI shell only — it never
 * imports or mutates sim state; the world pushes a {@link MarketSummary} each Observatory cadence via
 * {@link update}. Surfaces every telemetry the UI section asks of the economy: dominant currency +
 * share, FX, commodity prices + arbitrage spread, wealth Gini, total wealth, agent count, cartel
 * share, sanctioned count, black-market volume, and the windfall-auction tally + last clearing price.
 */
import type { MarketSummary } from '../sim/economy';
import { CURRENCY_GLYPH, COMMODITY_GLYPH } from '../sim/economy';
import { mountToggle } from './panel-dock';

const HISTORY = 120; // sparkline ring length

const STYLE = `
#cqm-mkt-toggle{position:fixed;right:204px;bottom:10px;z-index:60;height:42px;padding:0 12px;border-radius:21px;
  border:1px solid rgba(255,196,90,.5);background:rgba(20,14,4,.84);color:#ffd98a;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);transition:transform .15s,background .15s}
#cqm-mkt-toggle:hover{transform:scale(1.06);background:rgba(40,28,8,.94)}
#cqm-mkt-toggle:focus-visible{outline:2px solid #ffb648;outline-offset:2px}
#cqm-mkt-panel{position:fixed;right:10px;bottom:128px;z-index:59;width:min(94vw,320px);display:none;flex-direction:column;
  border:1px solid rgba(255,196,90,.32);border-radius:12px;background:rgba(10,8,4,.95);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.65);font:11px/1.5 var(--font-mono,ui-monospace,monospace);color:#f0e2c8;overflow:hidden}
#cqm-mkt-panel.open{display:flex}
.cqm-mkt-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,196,90,.22);background:rgba(26,18,6,.75)}
.cqm-mkt-head b{font-size:11px;letter-spacing:.14em;color:#ffcf7a;white-space:nowrap}
.cqm-mkt-x{margin-left:auto;background:rgba(8,6,2,.9);color:#ffd98a;border:1px solid rgba(255,196,90,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-mkt-x:focus-visible{outline:1px solid #ffb648}
.cqm-mkt-spark{display:block;width:100%;height:auto;border-bottom:1px solid rgba(255,196,90,.14);flex:0 0 auto}
/* V70: the rows SCROLL within the short HUD strip (nothing cut off) + lay out in TWO column-pairs so
   the wide panel is used fully. */
.cqm-mkt-rows{padding:7px 10px;display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3px 14px;
  flex:1 1 auto;min-height:0;overflow-y:auto;align-content:start}
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
};

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
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly cv: HTMLCanvasElement;
  private readonly r: Record<string, HTMLElement> = {};
  private open = false;
  private readonly fxH = new Float32Array(HISTORY);
  private readonly pqH = new Float32Array(HISTORY);
  private readonly piH = new Float32Array(HISTORY);
  private head = 0;
  private len = 0;
  private dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  constructor(doc: Document = document) {
    doc.getElementById('cqm-mkt-toggle')?.remove();
    doc.getElementById('cqm-mkt-panel')?.remove();
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-mkt-toggle';
    toggle.type = 'button';
    toggle.textContent = '⊙ MARKET';
    toggle.setAttribute('aria-label', 'Open the market ticker');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc); // V33: live in the shared bottom dock bar, not a floating fixed button

    const panel = doc.createElement('section');
    panel.id = 'cqm-mkt-panel';
    panel.setAttribute('aria-label', 'Economy market ticker');
    panel.innerHTML =
      `<div class="cqm-mkt-head"><b>MARKET</b><button class="cqm-mkt-x" data-close aria-label="Close">✕</button></div>` +
      `<canvas class="cqm-mkt-spark" data-spark></canvas><div class="cqm-mkt-rows" data-rows></div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.cv = panel.querySelector('[data-spark]') as HTMLCanvasElement;
    this.ctx = this.cv.getContext('2d');
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );

    const grid = panel.querySelector('[data-rows]') as HTMLElement;
    this.r.dominant = row(grid, 'Reserve money', doc);
    this.r.fx = row(grid, '☉/☾ FX', doc);
    this.r.prices = row(grid, '◇ / ❖ price', doc);
    this.r.arb = row(grid, 'Arb spread', doc);
    this.r.gini = row(grid, 'Wealth Gini', doc);
    this.r.wealth = row(grid, 'Total wealth', doc);
    this.r.agents = row(grid, 'Agents', doc);
    this.r.cartel = row(grid, 'Cartel share', doc);
    this.r.sanctioned = row(grid, 'Sanctioned', doc);
    this.r.black = row(grid, 'Black market', doc);
    this.r.auctions = row(grid, 'Auctions', doc);
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
   * when open, repaint the readout + sparkline. Pure presentation; O(HISTORY) draw. Null-safe text.
   */
  update(s: MarketSummary): void {
    this.fxH[this.head] = s.fx;
    this.pqH[this.head] = s.pQuanta;
    this.piH[this.head] = s.pIchor;
    this.head = (this.head + 1) % HISTORY;
    if (this.len < HISTORY) this.len++;
    if (!this.open) return;

    const dom = s.dominant;
    const domGlyph = CURRENCY_GLYPH[dom];
    this.r.dominant!.textContent = `${dom} ${domGlyph} ${(s.aurumShare * 100).toFixed(0)}%/${((1 - s.aurumShare) * 100).toFixed(0)}%`;
    this.r.dominant!.className = 'v hi';
    this.r.fx!.textContent = s.fx.toFixed(3);
    this.r.prices!.textContent = `${COMMODITY_GLYPH.QUANTA}${s.pQuanta.toFixed(2)} / ${COMMODITY_GLYPH.ICHOR}${s.pIchor.toFixed(2)}`;
    this.r.arb!.textContent = `${(s.arbSpread * 100).toFixed(1)}%`;
    this.r.gini!.textContent = s.gini.toFixed(3);
    this.r.wealth!.textContent = fmt(s.totalWealth);
    this.r.agents!.textContent = String(s.agents);
    this.r.cartel!.textContent = `${(s.cartelShare * 100).toFixed(1)}%`;
    this.r.sanctioned!.textContent = String(s.sanctioned);
    this.r.sanctioned!.className = s.sanctioned > 0 ? 'v warn' : 'v';
    this.r.black!.textContent = s.blackVolume > 0 ? fmt(s.blackVolume) : '—';
    this.r.black!.className = s.blackVolume > 0 ? 'v warn' : 'v';
    this.r.auctions!.textContent =
      s.auctions > 0
        ? `${s.auctions} · ${s.lastAuctionCommodity ?? ''}${COMMODITY_GLYPH[s.lastAuctionCommodity ?? 'QUANTA']} @${s.lastAuctionPrice.toFixed(1)}`
        : '0';
    this.drawSpark();
  }

  /** Sparkline of FX (amber) + QUANTA (green) + ICHOR (magenta) over the history ring. */
  private drawSpark(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const cssW = this.panel.clientWidth || 300;
    const cssH = 64;
    if (this.cv.width !== cssW * this.dpr || this.cv.height !== cssH * this.dpr) {
      this.cv.width = cssW * this.dpr;
      this.cv.height = cssH * this.dpr;
      this.cv.style.height = cssH + 'px';
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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
}

/** Compact human number (1.2k, 3.4M) for the readout. */
function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(0);
}
