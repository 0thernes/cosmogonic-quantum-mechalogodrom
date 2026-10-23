/**
 * PRIME Archon observatory: 27 source-stamped measurement cards (tabs I–III) plus IV · BRAIN, the
 * measured module connectome (CONNECTOME and MEGA 4D views of the same graph, see super-neural-brain.ts).
 * Everything advances only on completed cognition samples; canvas repaint and browser time never
 * synthesize activity in any tab.
 */
import type { SuperMindSnapshot } from '../sim/super-mind';
import { buildNeuralCards, NeuralHistory, type NeuralCard } from './super-neural-data';
import {
  brainGraphText,
  buildBrainGraph,
  drawBrainConnectome,
  drawBrainMega,
  type BrainGraph,
} from './super-neural-brain';

const PAL = {
  bg: '#08040f',
  grid: '#2a1a44',
  axis: '#4a3470',
  text: '#cdb6ff',
  dim: '#7a63a8',
  violet: '#b98cff',
  cyan: '#6cdfff',
  mag: '#ff6ab0',
  gold: '#ffd166',
  green: '#8dff9e',
  red: '#ff5a6b',
};

const TAB_LABELS = ['I · WORLD', 'II · COGNITION', 'III · QUANTUM', 'IV · BRAIN'] as const;

const STYLE = `
.cqm-sneu{container-type:inline-size;display:flex;flex-direction:column;min-height:0;flex:1 1 auto;--sneu-tint:0;--sneu-rgb:150,148,142}
/* V123 (USER #4): the whole box washes toward the live BRUTAL accent as --sneu-tint rises — a soft
   header + rim + inner glow, gradual and legible (the text stays bright above it). */
.cqm-sneu{background:linear-gradient(180deg, rgba(var(--sneu-rgb), calc(var(--sneu-tint) * 0.14)), rgba(var(--sneu-rgb), calc(var(--sneu-tint) * 0.05)))}
.cqm-sneu-tabs{display:flex;gap:4px;padding:6px 8px 0;flex:0 0 auto}
.cqm-sneu-tab{flex:1 1 0;min-width:0;background:rgba(14,8,28,.7);color:#a48fce;border:1px solid rgba(180,120,255,.2);
  border-bottom:none;border-radius:6px 6px 0 0;font:600 9.5px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.06em;padding:6px 4px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s,background .15s}
.cqm-sneu-tab:hover{color:#d8b8ff;background:rgba(28,14,46,.8)}
.cqm-sneu-tab.on{color:#f3ecff;background:rgba(36,16,60,.95);border-color:rgba(180,120,255,.5)}
.cqm-sneu-tab:focus-visible{outline:1px solid #b98cff}
.cqm-sneu-brain-cycle{flex:0 0 auto;background:rgba(40,12,52,.85);color:#ffb8e8;border:1px solid rgba(255,120,200,.45);
  border-radius:6px;font:600 9px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;padding:6px 8px;cursor:pointer;white-space:nowrap}
.cqm-sneu-brain-cycle:hover{color:#ffe0f8;background:rgba(70,20,60,.9)}
.cqm-sneu-brain-cycle.mega{border-color:rgba(0,255,220,.55);color:#9fffe8}
/* V123 (USER #4): the 9 cells were PANCAKED (wide + short) because the panel was height-capped.
   With the panel now flexing to full height (super-panel V123) the 3×3 grid gets real vertical
   room; a per-row floor keeps every cell a comfortable SQUARE-ish tile, never a thin strip. The
   panel tints toward the live BRUTAL style via --sneu-tint (0 = off) driven by cqm:brutal-style. */
.cqm-sneu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(260px,auto);gap:7px;padding:8px;
  overflow-y:auto;flex:1 1 auto;min-height:200px;border-top:1px solid rgba(180,120,255,.28);align-content:stretch}
.cqm-sneu-grid.brain{grid-template-columns:1fr;grid-template-rows:min(56vh,520px);min-height:min(56vh,520px)}
/* Depth: a radial floor-glow + an inset rim make each tile read as a lit 3D chamber, not a flat pane. */
.cqm-sneu-cell{position:relative;border:1px solid rgba(180,120,255,.18);border-radius:8px;
  background:
    linear-gradient(rgba(var(--sneu-rgb), calc(var(--sneu-tint) * .16)), rgba(var(--sneu-rgb), calc(var(--sneu-tint) * .06))),
    radial-gradient(120% 90% at 50% 8%, rgba(40,24,72,.5), rgba(5,3,12,.72) 62%, rgba(2,1,7,.85));
  box-shadow:inset 0 1px 0 rgba(200,170,255,.12), inset 0 -10px 24px rgba(0,0,0,.5), 0 3px 10px rgba(0,0,0,.4);
  overflow:hidden;display:flex;flex-direction:column;min-width:0;min-height:0;transition:box-shadow .4s ease}
.cqm-sneu-cell canvas{display:block;width:100%;height:164px;flex:0 0 164px}
.cqm-sneu-grid.brain .cqm-sneu-cell canvas{flex:1 1 auto;min-height:200px}
.cqm-sneu-cell h3{font:600 12px/1.3 var(--font-mono,monospace);color:#e8dcff;margin:9px 9px 3px;overflow-wrap:anywhere}
.cqm-sneu-source{font:10px/1.4 var(--font-mono,monospace);color:#b9a3e0;margin:0 9px 5px;overflow-wrap:anywhere}
.cqm-sneu-cell details{font:11px/1.45 var(--font-mono,monospace);color:#d3c4eb;margin:6px 9px 9px;overflow-wrap:anywhere}
.cqm-sneu-cell summary{cursor:pointer;color:#9ce5ff;padding:4px 0}
.cqm-sneu-cell pre{max-height:230px;overflow:auto;white-space:pre-wrap;font-size:10px}
.cqm-sneu-status{font:11px/1.5 var(--font-mono,monospace);padding:7px 10px;color:#d6c7ee;background:#130b22;overflow-wrap:anywhere}
.cqm-sneu-export{color:#b8f5ff;border:1px solid #5c668b;background:#141526;border-radius:5px;padding:5px 8px;cursor:pointer}
.cqm-sneu-export:disabled{opacity:.5;cursor:default}
.cqm-sneu-foot{flex-wrap:wrap}
@container (max-width:760px){.cqm-sneu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:480px){.cqm-sneu-grid{grid-template-columns:minmax(0,1fr)}.cqm-sneu-tabs{flex-wrap:wrap}.cqm-sneu-tab{font-size:9px}}

.cqm-sneu-foot{flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:5px 10px;border-top:1px solid rgba(180,120,255,.2);
  background:rgba(22,10,40,.7);font:9px/1.4 var(--font-mono,ui-monospace,monospace);color:#b9a3e0;min-height:0}
.cqm-sneu-foot b{color:#d8b8ff}
`;

type Snap = SuperMindSnapshot;

// ── primitive helpers ──────────────────────────────────────────────────────────────────────
function lab(ctx: CanvasRenderingContext2D, w: number, base: number, weight = ''): void {
  const k = Math.max(0.85, Math.min(2.2, w / 230));
  ctx.font = `${weight}${(base * k).toFixed(1)}px ui-monospace,monospace`;
}
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, title: string): void {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAL.violet;
  lab(ctx, w, 7.5, '600 ');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title, 5, 4);
}
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

interface P3 {
  x: number;
  y: number;
  d: number;
}
/** Rotate about Y, tilt about X, project with mild perspective. */
function project(
  x: number,
  y: number,
  z: number,
  angle: number,
  cx: number,
  cy: number,
  scale: number,
): P3 {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const rx = x * c + z * sn;
  const rz = -x * sn + z * c;
  const ct = Math.cos(0.46);
  const st = Math.sin(0.46);
  const ry = y * ct - rz * st;
  const rz2 = y * st + rz * ct;
  const k = 1 / (1 - rz2 * 0.16);
  return { x: cx + rx * scale * k, y: cy - ry * scale * k, d: rz2 };
}
// ════════════════════ TAB IV — BRAIN: measured module connectome (two views of one graph) ═══════════
let megaBrainMode = true;
/** Set MEGA 4D brain mode for the neural observatory (instance-safe via setter). */
export function setMegaBrainMode(v: boolean): void {
  megaBrainMode = v;
}

export function getMegaBrainMode(): boolean {
  return megaBrainMode;
}

const SERIES_COLORS = [PAL.cyan, PAL.mag, PAL.gold, PAL.green, PAL.violet, PAL.red];

const BRAIN_NOTE =
  'Both views draw one measured graph. Nodes are the 16 computing modules of SuperMind.think() with their ' +
  'actual output values this tick; their parameter counts sum to the mind total. Lines are the data flows ' +
  'think() performs, each sized by the square root of the RMS of the exact values it carries. MEGA 4D places each module on a ' +
  'tesseract vertex and draws every value as a dot; it turns only when a new tick arrives. Positions are ' +
  'layout. Dots are model variables, not neurons; lines are code paths, not axons. No consciousness verdict.';

function numeric(v: number): string {
  if (!Number.isFinite(v)) return 'INVALID';
  return Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.001)
    ? v.toExponential(3)
    : v.toFixed(3);
}

/** Render bounded cached values only. There is deliberately no time argument. */
function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  card: NeuralCard,
): void {
  frame(ctx, w, h, card.unit);
  const values = card.series.flatMap((series) => series.values);
  if (values.length === 0) {
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 10);
    ctx.fillText('No completed sample', 9, h / 2);
    return;
  }
  let lo = card.range?.[0] ?? 0;
  let hi = card.range?.[1] ?? 0;
  let invalid = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) {
      invalid++;
      continue;
    }
    if (!card.range) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  if (hi === lo) hi = lo + 1;
  const left = 38,
    right = w - 10,
    top = 27,
    bottom = h - 36;
  const pw = Math.max(1, right - left),
    ph = Math.max(1, bottom - top);
  const y = (v: number): number => bottom - ((v - lo) / (hi - lo)) * ph;
  const color = (i: number): string => SERIES_COLORS[i % SERIES_COLORS.length] ?? PAL.cyan;
  ctx.strokeStyle = PAL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 6.5);
  ctx.textAlign = 'right';
  ctx.fillText(numeric(hi), left - 4, top);
  ctx.fillText(numeric(lo), left - 4, bottom - 7);
  ctx.textAlign = 'left';

  if (card.kind === 'heat') {
    const cols = Math.max(1, card.columns ?? card.series[0]?.values.length ?? 1);
    const rows = Math.ceil(values.length / cols),
      cw = pw / cols,
      ch = ph / rows;
    values.forEach((v, i) => {
      const x = left + (i % cols) * cw,
        yy = top + Math.floor(i / cols) * ch;
      const valid = Number.isFinite(v);
      const a = valid ? clamp01((v - lo) / (hi - lo)) : 0;
      ctx.fillStyle = valid ? `hsl(${260 - a * 220},80%,${20 + a * 45}%)` : PAL.red;
      ctx.fillRect(x + 1, yy + 1, Math.max(1, cw - 2), Math.max(1, ch - 2));
      if (card.selected?.includes(i)) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, yy + 1, cw - 2, ch - 2);
      }
      if (cols <= 6 && rows <= 6) {
        ctx.fillStyle = '#fff';
        lab(ctx, w, 6);
        ctx.fillText(valid ? numeric(v) : '!', x + 3, yy + 4);
      }
    });
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 6.5);
    ctx.fillText(
      `${rows} rows × ${cols} columns · color ${numeric(lo)} → ${numeric(hi)}`,
      left,
      bottom + 5,
    );
  } else if (card.kind === 'bloch') {
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 20, w, h - 40);
    const cx = w / 2,
      cy = (top + bottom) / 2,
      scale = Math.min(pw, ph) * 0.42;
    const projectVector = (x: number, yy: number, z: number): P3 =>
      project(x, yy, z, 0.6, cx, cy, scale);
    for (let axis = 0; axis < 3; axis++) {
      const a = projectVector(axis === 0 ? -1 : 0, axis === 1 ? -1 : 0, axis === 2 ? -1 : 0);
      const b = projectVector(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);
      ctx.strokeStyle = PAL.axis;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = PAL.dim;
      ctx.fillText(['X', 'Y', 'Z'][axis] ?? '', b.x + 3, b.y);
    }
    card.series.forEach((series, i) => {
      const [x, yy, z] = series.values;
      if (
        x === undefined ||
        yy === undefined ||
        z === undefined ||
        ![x, yy, z].every(Number.isFinite)
      )
        return;
      const p = projectVector(x, yy, z);
      ctx.strokeStyle = color(i);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = color(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (card.kind === 'lines') {
    card.series.forEach((series, si) => {
      ctx.strokeStyle = color(si);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let joined = false;
      series.values.forEach((v, i) => {
        if (!Number.isFinite(v)) {
          joined = false;
          return;
        }
        const x = left + (i / Math.max(1, series.values.length - 1)) * pw;
        if (joined) ctx.lineTo(x, y(v));
        else ctx.moveTo(x, y(v));
        joined = true;
      });
      ctx.stroke();
      if (series.values.length === 1 && Number.isFinite(series.values[0])) {
        ctx.fillStyle = color(si);
        ctx.fillRect(left - 2, y(series.values[0] ?? 0) - 2, 4, 4);
      }
    });
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 6.5);
    ctx.fillText(card.labels[0] ?? '0', left, bottom + 5);
    ctx.textAlign = 'right';
    ctx.fillText(card.labels.at(-1) ?? '', right, bottom + 5);
    ctx.textAlign = 'left';
  } else {
    const count = Math.max(1, ...card.series.map((series) => series.values.length));
    const groupW = pw / count,
      barW = groupW / Math.max(1, card.series.length);
    card.series.forEach((series, si) =>
      series.values.forEach((v, i) => {
        const x = left + i * groupW + si * barW;
        if (!Number.isFinite(v)) {
          ctx.fillStyle = PAL.red;
          ctx.fillRect(x, top, Math.max(1, barW - 1), 4);
          return;
        }
        ctx.fillStyle = color(si);
        const zeroY = y(Math.max(lo, Math.min(hi, 0)));
        ctx.fillRect(
          x + 0.5,
          Math.min(y(v), zeroY),
          Math.max(0.5, barW - 1),
          Math.max(0.5, Math.abs(y(v) - zeroY)),
        );
        if (card.selected?.includes(i)) {
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(x, top, barW, ph);
        }
      }),
    );
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 6);
    const barLabel = (i: number): string => {
      const label = card.labels[i] ?? String(i);
      return label.length > 12 ? label.slice(0, 8) + '…' + label.slice(-3) : label;
    };
    const labelWidth = Math.max(
      ...card.labels.map((_, i) => ctx.measureText(barLabel(i)).width),
      1,
    );
    const stride = Math.max(1, Math.ceil((labelWidth + 4) / groupW));
    for (let i = 0; i < count; i += stride)
      ctx.fillText(barLabel(i), left + i * groupW, bottom + 5);
  }
  ctx.textAlign = 'left';
  lab(ctx, w, 6);
  let legendX = 8;
  for (let i = 0; i < card.series.length; i++) {
    const label = card.series[i]?.label ?? '';
    if (legendX + ctx.measureText(label).width > w - 5) break;
    ctx.fillStyle = color(i);
    ctx.fillText(label, legendX, h - 12);
    legendX += ctx.measureText(label).width + 12;
  }
  if (invalid) {
    ctx.fillStyle = PAL.red;
    ctx.fillText(`${invalid} INVALID`, w / 2, 4);
  }
}

/** Execution status is supplied independently of the slower measurement snapshots. */
export type NeuralRuntimeState = 'running' | 'suspended' | 'frozen' | 'unavailable';

const SNEU_BRUTAL_RGB: readonly (readonly [number, number, number])[] = [
  [150, 148, 142],
  [96, 200, 128],
  [232, 200, 112],
  [150, 84, 232],
  [116, 116, 128],
];

/** Bounded, source-stamped PRIME observer. Its JSON export contains the exact plotted values. */
export class SuperNeural {
  private readonly host: HTMLElement;
  private readonly root: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly gridEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly footEl: HTMLElement;
  private readonly exportBtn: HTMLButtonElement;
  private readonly tabBtns: HTMLButtonElement[] = [];
  private readonly brainCycleBtn: HTMLButtonElement;
  private ctxs: (CanvasRenderingContext2D | null)[] = [];
  private tab = 0;
  private active = false;
  private snap: Snap | null = null;
  private cards: NeuralCard[][] = [];
  private brain: BrainGraph | null = null;
  private readonly hist = new NeuralHistory();
  private readonly dpr = Math.min(
    2,
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  );
  private raf = 0;
  private lastPaint = 0;
  private lastStatus = 0;
  private receivedAt = 0;
  private sampleAt = 0;
  private runtime: NeuralRuntimeState = 'unavailable';
  private source = 'PRIME Archon [0]';
  private tintStyle = 0;
  private tintTarget = 0;
  private tintCur = 0;
  private readonly onBrutalStyle = (e: Event): void => {
    const d = (e as CustomEvent).detail as { styleIdx?: number; on?: boolean } | undefined;
    if (!d) return;
    if (typeof d.styleIdx === 'number') this.tintStyle = Math.max(0, Math.min(4, d.styleIdx));
    this.tintTarget = d.on ? 1 : 0;
  };

  constructor(host: HTMLElement, doc: Document = document) {
    this.host = host;
    if (!doc.getElementById('cqm-sneu-style')) {
      const style = doc.createElement('style');
      style.id = 'cqm-sneu-style';
      style.textContent = STYLE;
      doc.head.appendChild(style);
    }
    this.root = doc.createElement('div');
    this.root.className = 'cqm-sneu';
    this.root.innerHTML =
      '<div class="cqm-sneu-tabs" data-tabs></div><div class="cqm-sneu-status" data-status role="status"></div><div class="cqm-sneu-grid" data-grid></div><div class="cqm-sneu-foot" data-foot></div>';
    host.appendChild(this.root);
    this.tabsEl = this.root.querySelector('[data-tabs]') as HTMLElement;
    this.gridEl = this.root.querySelector('[data-grid]') as HTMLElement;
    this.statusEl = this.root.querySelector('[data-status]') as HTMLElement;
    this.footEl = this.root.querySelector('[data-foot]') as HTMLElement;
    for (let i = 0; i < TAB_LABELS.length; i++) {
      const b = doc.createElement('button');
      b.className = 'cqm-sneu-tab';
      b.type = 'button';
      b.textContent = TAB_LABELS[i] ?? '';
      b.addEventListener('click', () => this.setTab(i));
      this.tabsEl.appendChild(b);
      this.tabBtns.push(b);
    }
    this.brainCycleBtn = doc.createElement('button');
    this.brainCycleBtn.type = 'button';
    this.brainCycleBtn.className = 'cqm-sneu-brain-cycle';
    this.brainCycleBtn.addEventListener('click', () => {
      setMegaBrainMode(!getMegaBrainMode());
      this.updateBrainButton();
      this.paint();
    });
    this.tabsEl.appendChild(this.brainCycleBtn);
    this.exportBtn = doc.createElement('button');
    this.exportBtn.type = 'button';
    this.exportBtn.className = 'cqm-sneu-export';
    this.exportBtn.textContent = 'Export measured data';
    this.exportBtn.addEventListener('click', () => this.exportData());
    this.footEl.append(
      this.exportBtn,
      doc.createTextNode('I–IV: sampled computation · no consciousness verdict'),
    );
    if (typeof window !== 'undefined')
      window.addEventListener('cqm:brutal-style', this.onBrutalStyle);
    this.setTab(0);
    this.updateStatus();
  }

  /** World calls this even in frozen frames, without taking a new cognitive snapshot. O(1). */
  setRuntime(state: NeuralRuntimeState, source: string): void {
    if (source !== this.source) {
      this.hist.clear();
      this.sampleAt = 0;
      this.receivedAt = 0;
      this.snap = null;
      this.cards = [];
      this.brain = null;
      this.buildGrid();
      this.paint();
    }
    if (state === this.runtime && source === this.source) return;
    this.runtime = state;
    this.source = source;
    this.updateStatus();
  }

  private updateBrainButton(): void {
    this.brainCycleBtn.hidden = this.tab !== 3;
    this.brainCycleBtn.textContent = getMegaBrainMode() ? '⬡ MEGA 4D' : '⟁ CONNECTOME';
    this.brainCycleBtn.classList.toggle('mega', getMegaBrainMode());
    this.brainCycleBtn.title =
      'Switch views of the same measured graph: every dot is a model value, every line a data flow in think().';
  }

  private buildGrid(): void {
    const doc = this.host.ownerDocument;
    this.gridEl.replaceChildren();
    this.ctxs = [];
    this.gridEl.classList.toggle('brain', this.tab === 3);
    const current = this.cards[this.tab] ?? [];
    const count = this.tab === 3 ? 1 : 9;
    for (let i = 0; i < count; i++) {
      const card = current[i];
      const cell = doc.createElement('div');
      cell.className = 'cqm-sneu-cell';
      cell.dataset.cardId =
        card?.id ?? (this.tab === 3 ? 'brain_measured' : `awaiting_${this.tab}_${i}`);
      const heading = doc.createElement('h3');
      heading.textContent =
        card?.title ??
        (this.tab === 3 ? 'Brain · measured module connectome' : 'Awaiting completed cognition');
      cell.appendChild(heading);
      const source = doc.createElement('p');
      source.className = 'cqm-sneu-source';
      source.textContent = card
        ? `Source: ${card.source}`
        : this.tab === 3
          ? 'Source: observatory.senses · latent · spin.spins · observatory.organOutputs · imagined · observatory.predicted · quantum · reservoir.state · observatory.search.scores · observatory.reasoned · observatory.selfModel · qubits.probs · observatory.memory.values · observatory.affectOutputs · observatory.actionOutputs · observatory.planScores'
          : 'Awaiting completed cognition.';
      cell.appendChild(source);
      const warning = doc.createElement('p');
      warning.className = 'cqm-sneu-source';
      warning.dataset.warning = '';
      warning.style.color = PAL.gold;
      warning.textContent = card?.warning ?? '';
      warning.hidden = !card?.warning;
      cell.appendChild(warning);
      const canvas = doc.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        card
          ? `${card.title}. ${card.unit}. Exact values available below.`
          : 'Measured module connectome of the PRIME Archon mind',
      );
      cell.appendChild(canvas);
      const details = doc.createElement('details'),
        summary = doc.createElement('summary'),
        note = doc.createElement('p'),
        raw = doc.createElement('pre');
      summary.textContent = 'Method, limits & exact values';
      note.textContent = card
        ? `${card.note}${card.warning ? ` WARNING: ${card.warning}` : ''}`
        : this.tab === 3
          ? BRAIN_NOTE
          : 'No completed cognition sample yet.';
      raw.textContent = card
        ? this.cardText(card)
        : this.tab === 3 && this.brain
          ? brainGraphText(this.brain)
          : 'No completed cognition sample yet.';
      details.append(summary, note, raw);
      cell.appendChild(details);
      this.gridEl.appendChild(cell);
      this.ctxs.push(canvas.getContext('2d'));
    }
  }

  private cardText(card: NeuralCard): string {
    return (
      `${card.labels.length ? `Channels / x labels: ${card.labels.join(', ')}\n` : ''}` +
      card.series
        .map((series) => `${series.label}: [${series.values.map(String).join(', ')}]`)
        .join('\n')
    );
  }

  /** Select a view without appending measurements or changing the source. */
  setTab(i: number): void {
    this.tab = Math.max(0, Math.min(3, i));
    this.tabBtns.forEach((b, k) => {
      b.classList.toggle('on', k === this.tab);
      b.setAttribute('aria-pressed', String(k === this.tab));
    });
    this.updateBrainButton();
    this.buildGrid();
    this.paint();
  }

  /** Stop the painting loop when the parent panel is not observing. */
  setActive(v: boolean): void {
    this.active = v;
    if (v) {
      this.paint();
      if (!this.raf) this.raf = requestAnimationFrame(this.tick);
    } else {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  /** Snapshot ingestion, independent of tab/paint cadence. Duplicate beats never append history. */
  update(snap: Snap | null): void {
    this.receivedAt = performance.now();
    if (!snap) {
      this.snap = null;
      this.cards = [];
      this.brain = null;
      this.hist.clear();
      this.sampleAt = 0;
      this.buildGrid();
      this.updateStatus();
      return;
    }
    const first = this.snap === null;
    const fresh = this.hist.ingest(snap);
    const unstarted = snap.observatory.tick === 0 || snap.observatory.mode === 'unstarted';
    // Retain the accepted snapshot with its cards/history on duplicate deliveries.
    if (!fresh && !first && !unstarted) {
      this.updateStatus();
      return;
    }
    this.snap = snap;
    if (unstarted) this.sampleAt = 0;
    if (fresh) this.sampleAt = this.receivedAt;
    if (fresh || first || unstarted) {
      this.cards = buildNeuralCards(snap, this.hist);
      this.brain = unstarted ? null : buildBrainGraph(snap);
      if (
        first ||
        unstarted ||
        !this.gridEl.querySelector(
          '[data-card-id="' + (this.cards[this.tab]?.[0]?.id ?? 'brain_measured') + '"]',
        )
      )
        this.buildGrid();
      else this.refreshDetails();
      if (this.active) this.paint();
    }
    this.updateStatus();
  }

  private refreshDetails(): void {
    if (this.tab === 3) {
      const raw = this.gridEl.querySelector('pre');
      if (raw) raw.textContent = this.brain ? brainGraphText(this.brain) : '';
      return;
    }
    const cards = this.cards[this.tab] ?? [];
    for (let i = 0; i < cards.length; i++) {
      const cell = this.gridEl.children.item(i),
        card = cards[i];
      if (!cell || !card) continue;
      const note = cell.querySelector('details p'),
        raw = cell.querySelector('pre');
      const warning = cell.querySelector<HTMLElement>('[data-warning]');
      if (warning) {
        warning.textContent = card.warning ?? '';
        warning.hidden = !card.warning;
      }
      if (note) note.textContent = `${card.note}${card.warning ? ` WARNING: ${card.warning}` : ''}`;
      if (raw) raw.textContent = this.cardText(card);
    }
  }

  private updateStatus(): void {
    const now = performance.now(),
      tick = this.snap?.observatory.tick ?? 0;
    const age = this.sampleAt ? ((now - this.sampleAt) / 1000).toFixed(1) : '—';
    const transport = this.receivedAt ? ((now - this.receivedAt) / 1000).toFixed(1) : '—';
    const status =
      this.runtime === 'running' && this.sampleAt && now - this.sampleAt > 3000
        ? 'RUNNING · sample stale >3s'
        : this.runtime.toUpperCase();
    this.statusEl.textContent = `${this.source} · ${status} · cognitive tick ${tick} (${this.snap?.observatory.mode ?? 'unstarted'}) · sample age ${age}s · delivery age ${transport}s · ${this.hist.samples.length}/96 observed beats. Gaps are unsampled; no interpolated activity.`;
    this.root.dataset.runtime = this.runtime;
    this.root.dataset.cognitiveTick = String(tick);
    this.root.dataset.sampleCount = String(this.hist.samples.length);
    this.exportBtn.disabled = !this.snap || tick === 0;
  }

  private exportData(): void {
    if (!this.snap) return;
    const data = {
      schemaVersion: 1,
      source: this.source,
      runtime: this.runtime,
      exportedAt: new Date().toISOString(),
      sampling: 'Completed observed cognitive ticks only; skipped ticks are not reconstructed.',
      snapshot: this.snap,
      history: this.hist.samples,
      cards: this.cards,
      brain: this.brain,
    };
    const json = JSON.stringify(
      data,
      (_key, value: unknown) =>
        typeof value === 'number' && !Number.isFinite(value) ? String(value) : value,
      2,
    );
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = this.host.ownerDocument.createElement('a');
    a.href = url;
    a.download = `cqm-prime-observatory-tick-${this.snap.observatory.tick}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Release animation and event resources when the owning World is disposed. */
  dispose(): void {
    this.setActive(false);
    if (typeof window !== 'undefined')
      window.removeEventListener('cqm:brutal-style', this.onBrutalStyle);
    this.root.remove();
  }

  private readonly tick = (ts: number): void => {
    this.raf = 0;
    if (!this.active || !this.host.isConnected) return;
    this.raf = requestAnimationFrame(this.tick);
    if (ts - this.lastStatus >= 250) {
      this.lastStatus = ts;
      this.updateStatus();
    }
    if (ts - this.lastPaint < 100) return;
    this.lastPaint = ts;
    this.easeTint();
    this.paint();
  };

  private easeTint(): void {
    if (Math.abs(this.tintCur - this.tintTarget) < 0.002) this.tintCur = this.tintTarget;
    else this.tintCur += (this.tintTarget - this.tintCur) * 0.06;
    const rgb = SNEU_BRUTAL_RGB[this.tintStyle] ?? SNEU_BRUTAL_RGB[0]!;
    this.root.style.setProperty('--sneu-tint', this.tintCur.toFixed(3));
    this.root.style.setProperty('--sneu-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`);
  }

  private paint(): void {
    for (let i = 0; i < this.ctxs.length; i++) {
      const ctx = this.ctxs[i];
      if (!ctx) continue;
      const w = Math.floor(ctx.canvas.clientWidth),
        h = Math.floor(ctx.canvas.clientHeight);
      if (w < 8 || h < 8) continue;
      if (
        ctx.canvas.width !== Math.floor(w * this.dpr) ||
        ctx.canvas.height !== Math.floor(h * this.dpr)
      ) {
        ctx.canvas.width = Math.floor(w * this.dpr);
        ctx.canvas.height = Math.floor(h * this.dpr);
      }
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const card = this.cards[this.tab]?.[i];
      if (this.tab === 3 && this.brain) {
        if (getMegaBrainMode()) drawBrainMega(ctx, w, h, this.brain);
        else drawBrainConnectome(ctx, w, h, this.brain);
      } else if (card) drawMeasurement(ctx, w, h, card);
      else frame(ctx, w, h, 'No completed cognitive sample');
    }
  }
}
