/**
 * NHI Neural Observatory (CONTRACTS V15) — a self-building inspection panel that opens a window into
 * the live mind of a launched NHI. For the focused NHI it draws a **3×3 grid of nine scientific
 * diagrams**, each bound to a REAL internal variable of {@link NhiMind.think} (nothing decorative):
 *
 *   1 FIRING      — the gene MLP's hidden(6)+output(7) tanh activations (signed bars).
 *   2 TOPOLOGY    — the actual weight matrix as a 5→6→7 node-link graph (edge sign+|w|, node firing).
 *   3 MEMORY      — the episodic MemoryRing valence timeline (oldest→newest).
 *   4 REWARD      — cumulative regret per action (the reward-gradient signal).
 *   5 SENSORY     — the percept vector (energy/threat/crowding/chaos/mood) as a radar.
 *   6 INTENTION   — the 7 action utilities as a polar star, the argmax highlighted.
 *   7 AFFECT      — the mood gauge + the five fixed personality traits.
 *   8 PREDICTION  — the GOAP world-model bits + the planned next step toward dominion.
 *   9 DECISION    — the softmax policy over the utilities, chosen vs greedy highlighted.
 *
 * UI shell only: it never imports or mutates sim state. The world pushes a {@link NhiSnapshot} each
 * Observatory cadence via {@link update}; the panel owns its DOM, its open/closed state, and which
 * NHI is focused ({@link focusIndex}, cycled by the ◀ ▶ buttons and read back by the world).
 */
import type { NhiSnapshot } from '../sim/nhi';
import { NHI_ACTION_LABELS, NHI_FACT_LABELS } from '../sim/nhi';
import { mountToggle } from './panel-dock';

const PAL = {
  bg: '#060a16',
  grid: '#1d2742',
  axis: '#34406a',
  text: '#9fb6dd',
  cyan: '#34e0ff',
  amber: '#ffb648',
  mag: '#ff5cc8',
  green: '#6bff9e',
  red: '#ff6b6b',
};

const VIEW_TITLES = [
  '1 · FIRING',
  '2 · TOPOLOGY',
  '3 · MEMORY',
  '4 · REWARD',
  '5 · SENSORY',
  '6 · INTENTION',
  '7 · AFFECT',
  '8 · PREDICTION',
  '9 · DECISION',
] as const;

const SENSORY_LABELS = ['NRG', 'THR', 'CRD', 'CHS', 'MD'] as const;

const STYLE = `
#cqm-nhi-toggle{position:fixed;right:108px;bottom:10px;z-index:60;height:42px;padding:0 12px;border-radius:21px;
  border:1px solid rgba(80,220,255,.5);background:rgba(6,12,26,.84);color:#9be8ff;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);transition:transform .15s,background .15s}
#cqm-nhi-toggle:hover{transform:scale(1.06);background:rgba(12,24,48,.94)}
#cqm-nhi-toggle:focus-visible{outline:2px solid #34e0ff;outline-offset:2px}
/* V39: raised well clear of the centered dock (which now sits above #bar) so the 3×3 grid never clashes
   with the menu bars when it pops up — the user's explicit fix. Height bounded so it can't run off-screen. */
#cqm-nhi-panel{position:fixed;left:50%;bottom:134px;transform:translateX(-50%);z-index:59;width:min(96vw,740px);
  max-height:min(78vh,640px);display:none;flex-direction:column;border:1px solid rgba(80,220,255,.32);border-radius:12px;
  background:rgba(4,8,18,.95);backdrop-filter:blur(12px);box-shadow:0 10px 46px rgba(0,0,0,.65);
  font:11px/1.5 var(--font-mono,ui-monospace,monospace);color:#cfe0fb;overflow:hidden}
#cqm-nhi-panel.open{display:flex}
.cqm-nhi-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(80,220,255,.22);background:rgba(8,16,34,.75)}
.cqm-nhi-head b{font-size:11px;letter-spacing:.14em;color:#7fd6ff;white-space:nowrap}
.cqm-nhi-meta{font-size:10px;opacity:.85;color:#9fb6dd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-nhi-sp{margin-left:auto}
.cqm-nhi-btn{background:rgba(2,8,20,.9);color:#9be8ff;border:1px solid rgba(80,220,255,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-nhi-btn:hover{background:rgba(16,32,60,.95)}
.cqm-nhi-btn:focus-visible{outline:1px solid #34e0ff}
.cqm-nhi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;overflow-y:auto}
.cqm-nhi-cell{position:relative;border:1px solid rgba(80,220,255,.14);border-radius:6px;background:rgba(3,7,16,.7);overflow:hidden}
.cqm-nhi-cell canvas{display:block;width:100%;height:auto}
.cqm-nhi-empty{padding:26px 16px;text-align:center;color:#7f94c0;font-size:12px;line-height:1.7}
@media (max-width:560px){.cqm-nhi-grid{grid-template-columns:repeat(2,1fr)}#cqm-nhi-toggle{right:96px}}
`;

/** A single chart drawer: paints `s` into a 2D context of CSS size `w`×`h`. */
type Drawer = (ctx: CanvasRenderingContext2D, w: number, h: number, s: NhiSnapshot) => void;

// ── small canvas helpers ──────────────────────────────────────────────────────
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, title: string): void {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAL.text;
  ctx.font = '8px ui-monospace,monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(title, 5, 4);
}
function maxAbs(a: readonly number[]): number {
  let m = 1e-6;
  for (const v of a) {
    const x = Math.abs(v);
    if (x > m) m = x;
  }
  return m;
}

// ── the nine views ────────────────────────────────────────────────────────────
const drawFiring: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[0]);
  const rows: [number[], string][] = [
    [s.hidden, 'HID'],
    [s.output, 'OUT'],
  ];
  const rowH = (h - 16) / 2;
  rows.forEach(([vals, lab], r) => {
    const y0 = 16 + r * rowH + rowH / 2;
    ctx.strokeStyle = PAL.axis;
    ctx.beginPath();
    ctx.moveTo(22, y0);
    ctx.lineTo(w - 4, y0);
    ctx.stroke();
    ctx.fillStyle = PAL.text;
    ctx.fillText(lab, 2, y0 - 4);
    const bw = (w - 28) / vals.length;
    vals.forEach((v, i) => {
      const x = 24 + i * bw;
      const bh = v * (rowH / 2 - 3); // tanh in (-1,1)
      ctx.fillStyle = v >= 0 ? PAL.cyan : PAL.mag;
      ctx.fillRect(x + 1, y0 - Math.max(0, bh), bw - 2, Math.abs(bh));
    });
  });
};

const drawTopology: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[1]);
  const { in: ni, hid: nh, out: no } = s.dims;
  const cols = [ni, nh, no];
  const acts = [s.sensory, s.hidden, s.output];
  const colX = [w * 0.16, w * 0.5, w * 0.84];
  const top = 18;
  const bot = h - 6;
  const posY = (n: number, k: number) => top + ((k + 0.5) * (bot - top)) / n;
  const mw = maxAbs(s.weights);
  // input→hidden edges: weights[h*(ni+1)+1+i]
  ctx.lineWidth = 1;
  for (let hh = 0; hh < nh; hh++) {
    for (let i = 0; i < ni; i++) {
      const wv = s.weights[hh * (ni + 1) + 1 + i] ?? 0;
      const a = Math.abs(wv) / mw;
      if (a < 0.22) continue;
      ctx.strokeStyle = `rgba(${wv >= 0 ? '52,224,255,' : '255,92,200,'}${(a * 0.7).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(colX[0]!, posY(ni, i));
      ctx.lineTo(colX[1]!, posY(nh, hh));
      ctx.stroke();
    }
  }
  // hidden→output edges: weights[off + o*(nh+1)+1+h]
  const off = nh * (ni + 1);
  for (let o = 0; o < no; o++) {
    for (let hh = 0; hh < nh; hh++) {
      const wv = s.weights[off + o * (nh + 1) + 1 + hh] ?? 0;
      const a = Math.abs(wv) / mw;
      if (a < 0.22) continue;
      ctx.strokeStyle = `rgba(${wv >= 0 ? '52,224,255,' : '255,92,200,'}${(a * 0.7).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(colX[1]!, posY(nh, hh));
      ctx.lineTo(colX[2]!, posY(no, o));
      ctx.stroke();
    }
  }
  // nodes filled by |activation|
  cols.forEach((n, c) => {
    for (let k = 0; k < n; k++) {
      const a = Math.min(1, Math.abs(acts[c]?.[k] ?? 0));
      ctx.fillStyle = `rgba(120,230,255,${(0.25 + a * 0.75).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(colX[c]!, posY(n, k), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
};

const drawMemory: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[2]);
  const m = s.memory;
  const y0 = (16 + h) / 2;
  ctx.strokeStyle = PAL.axis;
  ctx.beginPath();
  ctx.moveTo(4, y0);
  ctx.lineTo(w - 4, y0);
  ctx.stroke();
  if (m.length < 2) return;
  const mx = maxAbs(m);
  const sx = (w - 8) / (m.length - 1);
  ctx.beginPath();
  m.forEach((v, i) => {
    const x = 4 + i * sx;
    const y = y0 - (v / mx) * (h - 22) * 0.42;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = PAL.green;
  ctx.lineWidth = 1.4;
  ctx.stroke();
};

const drawReward: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[3]);
  const r = s.regret;
  const mx = maxAbs(r);
  const n = r.length;
  const rowH = (h - 18) / n;
  const x0 = w * 0.5;
  r.forEach((v, i) => {
    const y = 18 + i * rowH;
    const bw = (v / mx) * (w * 0.42);
    ctx.fillStyle = v >= 0 ? PAL.green : PAL.red;
    ctx.fillRect(x0, y + 1, bw, rowH - 2);
    ctx.fillStyle = PAL.text;
    ctx.fillText(NHI_ACTION_LABELS[i] ?? '', 3, y + rowH / 2 - 4);
  });
  ctx.strokeStyle = PAL.axis;
  ctx.beginPath();
  ctx.moveTo(x0, 16);
  ctx.lineTo(x0, h);
  ctx.stroke();
};

const drawSensory: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[4]);
  // map mood (−1..1) into 0..1 so all 5 axes share a 0..1 radar
  const vals = [
    s.sensory[0] ?? 0,
    s.sensory[1] ?? 0,
    s.sensory[2] ?? 0,
    s.sensory[3] ?? 0,
    (s.sensory[4] ?? 0) * 0.5 + 0.5,
  ];
  const cx = w / 2;
  const cy = (h + 14) / 2;
  const R = Math.min(w, h - 14) * 0.4;
  const N = 5;
  for (let ring = 1; ring <= 2; ring++) {
    ctx.strokeStyle = PAL.grid;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const rr = (R * ring) / 2;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  vals.forEach((v, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const rr = R * Math.max(0, Math.min(1, v));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = PAL.text;
    const la = cx + Math.cos(a) * (R + 7) - 6;
    const ly = cy + Math.sin(a) * (R + 7) - 3;
    ctx.fillText(SENSORY_LABELS[i] ?? '', la, ly);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(52,224,255,.28)';
  ctx.strokeStyle = PAL.cyan;
  ctx.lineWidth = 1.3;
  ctx.fill();
  ctx.stroke();
};

const drawIntention: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[5]);
  const sc = s.scores;
  const n = sc.length;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of sc) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  let arg = 0;
  for (let i = 1; i < n; i++) if ((sc[i] ?? 0) > (sc[arg] ?? 0)) arg = i;
  const cx = w / 2;
  const cy = (h + 14) / 2;
  const R = Math.min(w, h - 14) * 0.4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = R * (0.12 + 0.88 * (((sc[i] ?? 0) - lo) / span));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,182,72,.22)';
  ctx.strokeStyle = PAL.amber;
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
  // highlight the argmax spoke
  const aa = (arg / n) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = PAL.green;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(aa) * R, cy + Math.sin(aa) * R);
  ctx.stroke();
};

const drawAffect: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[6]);
  // mood gauge (semicircle, −1 left .. +1 right)
  const cx = w / 2;
  const cy = h * 0.5;
  const R = Math.min(w * 0.42, h * 0.32);
  ctx.strokeStyle = PAL.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.stroke();
  const ma = Math.PI + (s.mood * 0.5 + 0.5) * Math.PI;
  ctx.strokeStyle = s.mood >= 0 ? PAL.amber : PAL.cyan;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ma) * R, cy + Math.sin(ma) * R);
  ctx.stroke();
  ctx.fillStyle = PAL.text;
  ctx.fillText('MOOD ' + s.mood.toFixed(2), cx - 22, cy + 4);
  // five trait bars along the bottom
  const t = s.traits;
  const traits: [string, number][] = [
    ['NAR', t.narcissism],
    ['AGG', t.aggression],
    ['DEC', t.deceit],
    ['HAL', t.hallucination],
    ['VOL', t.volatility],
  ];
  const bw = (w - 8) / traits.length;
  traits.forEach(([lab, v], i) => {
    const x = 4 + i * bw;
    const bh = v * (h * 0.26);
    ctx.fillStyle = PAL.mag;
    ctx.fillRect(x + 2, h - 10 - bh, bw - 4, bh);
    ctx.fillStyle = PAL.text;
    ctx.fillText(lab, x + 2, h - 9);
  });
};

const drawPrediction: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[7]);
  // four GOAP fact cells, lit when their bit is set
  const cellW = (w - 8) / 4;
  for (let b = 0; b < 4; b++) {
    const set = (s.facts & (1 << b)) !== 0;
    const x = 4 + b * cellW;
    ctx.fillStyle = set ? 'rgba(107,255,158,.85)' : 'rgba(40,56,90,.7)';
    ctx.fillRect(x + 2, 20, cellW - 4, 22);
    ctx.fillStyle = set ? '#04210f' : PAL.text;
    ctx.fillText(NHI_FACT_LABELS[b] ?? '', x + 4, 28);
  }
  ctx.fillStyle = PAL.text;
  ctx.fillText('GOAL → DOMINATE + DECEIVE', 5, h - 30);
  const planned = s.plannedAction >= 0 ? (NHI_ACTION_LABELS[s.plannedAction] ?? '?') : 'IDLE';
  ctx.fillStyle = PAL.amber;
  ctx.font = '10px ui-monospace,monospace';
  ctx.fillText('NEXT STEP ▸ ' + planned, 5, h - 16);
  ctx.font = '8px ui-monospace,monospace';
};

const drawDecision: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, VIEW_TITLES[8]);
  // softmax policy over the action utilities (temp ~0.5), chosen vs greedy highlighted
  const sc = s.scores;
  const n = sc.length;
  let mx = -Infinity;
  let greedy = 0;
  for (let i = 0; i < n; i++)
    if ((sc[i] ?? 0) > mx) {
      mx = sc[i] ?? 0;
      greedy = i;
    }
  let z = 0;
  const p = sc.map((v) => {
    const e = Math.exp((v - mx) / 0.5);
    z += e;
    return e;
  });
  for (let i = 0; i < n; i++) p[i] = (p[i] ?? 0) / z;
  const bw = (w - 8) / n;
  const base = h - 12;
  for (let i = 0; i < n; i++) {
    const x = 4 + i * bw;
    const bh = (p[i] ?? 0) * (h - 30);
    ctx.fillStyle = i === s.lastAction ? PAL.amber : 'rgba(52,224,255,.55)';
    ctx.fillRect(x + 1, base - bh, bw - 2, bh);
    if (i === greedy) {
      ctx.strokeStyle = PAL.green;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, base - bh, bw - 2, bh);
    }
    ctx.fillStyle = PAL.text;
    ctx.save();
    ctx.translate(x + bw / 2 + 3, base + 1);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(NHI_ACTION_LABELS[i] ?? '', 0, 0);
    ctx.restore();
  }
};

const DRAWERS: readonly Drawer[] = [
  drawFiring,
  drawTopology,
  drawMemory,
  drawReward,
  drawSensory,
  drawIntention,
  drawAffect,
  drawPrediction,
  drawDecision,
];

/**
 * The self-building panel. Construct ONCE (world.ts); call {@link update} each Observatory cadence
 * with the focused NHI's snapshot (or null when none is launched). Reads back {@link focusIndex} so
 * the world knows which NHI to snapshot next.
 */
export class NhiObservatory {
  private readonly panel: HTMLElement;
  private readonly meta: HTMLElement;
  private readonly gridEl: HTMLElement;
  private readonly emptyEl: HTMLElement;
  private readonly ctxs: CanvasRenderingContext2D[] = [];
  private open = false;
  private focus = 0;
  private dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  constructor(doc: Document = document) {
    // Guard against a double-mount (e.g. bun --hot re-running world.ts): drop any prior nodes so a
    // single live toggle/panel exists and the click handler always targets THIS instance.
    doc.getElementById('cqm-nhi-toggle')?.remove();
    doc.getElementById('cqm-nhi-panel')?.remove();
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-nhi-toggle';
    toggle.type = 'button';
    toggle.textContent = '⊞ NEURAL';
    toggle.setAttribute('aria-label', 'Open the NHI neural observatory');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc); // V33: live in the shared bottom dock bar, not a floating fixed button

    const panel = doc.createElement('section');
    panel.id = 'cqm-nhi-panel';
    panel.setAttribute('aria-label', 'NHI neural observatory');
    panel.innerHTML = `<div class="cqm-nhi-head"><b>NEURAL OBSERVATORY</b>
      <span class="cqm-nhi-meta" data-meta>no NHI launched</span>
      <span class="cqm-nhi-sp"></span>
      <button class="cqm-nhi-btn" data-prev aria-label="Previous NHI">◀</button>
      <button class="cqm-nhi-btn" data-next aria-label="Next NHI">▶</button>
      <button class="cqm-nhi-btn" data-close aria-label="Close">✕</button></div>
      <div class="cqm-nhi-empty" data-empty>No NHI launched.<br>Press the <b>⟁ NHI</b> button (or <b>N</b>) to release a non-human intelligence,<br>then watch its mind think here in real time.</div>
      <div class="cqm-nhi-grid" data-grid style="display:none"></div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.meta = panel.querySelector('[data-meta]') as HTMLElement;
    this.gridEl = panel.querySelector('[data-grid]') as HTMLElement;
    this.emptyEl = panel.querySelector('[data-empty]') as HTMLElement;
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );
    (panel.querySelector('[data-prev]') as HTMLElement).addEventListener('click', () =>
      this.cycle(-1),
    );
    (panel.querySelector('[data-next]') as HTMLElement).addEventListener('click', () =>
      this.cycle(1),
    );

    for (let i = 0; i < 9; i++) {
      const cell = doc.createElement('div');
      cell.className = 'cqm-nhi-cell';
      const cv = doc.createElement('canvas');
      cell.appendChild(cv);
      this.gridEl.appendChild(cell);
      const c = cv.getContext('2d');
      if (c) this.ctxs.push(c);
    }
  }

  /** Index of the focused NHI within the world's `nhi.ids()` list — the world reads this to snapshot. */
  get focusIndex(): number {
    return this.focus;
  }

  /** Whether the panel is open (the world can skip building snapshots when closed). */
  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
  }

  private cycle(d: number): void {
    this.focus = Math.max(0, this.focus + d);
  }

  /**
   * Repaint the nine views from `snap`. `meta` carries the focused NHI id + the live count so the
   * header + focus index stay honest as NHIs spawn/die. Null `snap` shows the empty state. O(1) work
   * beyond the nine small canvases; only runs meaningfully when the panel is open.
   */
  update(snap: NhiSnapshot | null, meta: { id: number; count: number }): void {
    if (meta.count > 0) this.focus = this.focus % meta.count;
    else this.focus = 0;
    if (!this.open) return;
    const has = snap !== null && meta.count > 0;
    this.emptyEl.style.display = has ? 'none' : 'block';
    this.gridEl.style.display = has ? 'grid' : 'none';
    this.meta.textContent = has
      ? `NHI #${meta.id} · ${this.focus + 1}/${meta.count} · ${NHI_ACTION_LABELS[snap!.lastAction] ?? '?'}`
      : `no NHI launched`;
    if (!has) return;
    const cw = Math.max(120, Math.floor(this.gridEl.clientWidth / 3) - 8);
    const ch = Math.round(cw * 0.7);
    for (let i = 0; i < this.ctxs.length; i++) {
      const ctx = this.ctxs[i];
      const drawer = DRAWERS[i];
      if (!ctx || !drawer) continue;
      const cv = ctx.canvas;
      if (cv.width !== cw * this.dpr || cv.height !== ch * this.dpr) {
        cv.width = cw * this.dpr;
        cv.height = ch * this.dpr;
        cv.style.height = ch + 'px';
      }
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawer(ctx, cw, ch, snap!);
    }
  }
}
