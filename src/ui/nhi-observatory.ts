/**
 * NHI Neural Observatory (CONTRACTS V15; V75 dimensional-liveness pass) — a self-building inspection
 * panel that opens a window into the live mind of a launched NHI. For the focused NHI it draws a
 * **3×3 grid of nine scientific diagrams**, each bound to a REAL internal variable of
 * {@link NhiMind.think} (nothing decorative). Every cell carries a plain-language caption that names
 * the stage and says what is REAL about it, and the footer legend explains the expanded view in full —
 * so the panel is operational and self-explaining, never "just a flash". V75 — all nine views now LIVE
 * (the directive's "static sucks, 3D is cool, temporal is nice"): FIRING is a rotating 3D activation
 * field, REWARD/SENSORY/INTENTION/AFFECT/PREDICTION breathe, pulse, sweep and tremble (the AFFECT
 * needle even jitters with the real volatility trait), TOPOLOGY/MEMORY/DECISION keep their temporal
 * motion — with every label clamped inside its window so nothing overflows or overshoots:
 *
 *   1 FIRING      — the gene MLP's hidden(6)+output(7) tanh activations, a rotating 3D column field.
 *   2 TOPOLOGY    — the actual weight matrix as a living 5→6→7 node-link graph that bends, breathes
 *                   and morphs to the net's own rhythm (edge sign+|w|, node firing).
 *   3 MEMORY      — the episodic MemoryRing valence timeline (oldest→newest), auto-scaled so even small
 *                   drift reads, with a live mean/latest readout — it visibly DOES something.
 *   4 REWARD      — cumulative regret per action (the reward-gradient signal).
 *   5 SENSORY     — the percept vector (energy/threat/crowding/chaos/mood) as a labelled radar.
 *   6 INTENTION   — the 7 action utilities as a polar star with EVERY spoke labelled, argmax in green.
 *   7 AFFECT      — the mood gauge + the five fixed personality traits.
 *   8 PREDICTION  — the GOAP world-model bits + the planned next step toward dominion.
 *   9 DECISION    — the softmax policy over the utilities, drawn with HORIZONTAL readable labels + the
 *                   probability of each action; chosen vs greedy highlighted.
 *
 * UI shell only: it never imports or mutates sim state. The world pushes a {@link NhiSnapshot} each
 * Observatory cadence via {@link update}; the panel owns its DOM, its open/closed state, and which
 * NHI is focused ({@link focusIndex}, cycled by the ◀ ▶ buttons and read back by the world).
 */
import type { NhiSnapshot } from '../sim/nhi';
import { NHI_ACTION_LABELS, NHI_FACT_LABELS } from '../sim/nhi';
import { mountToggle } from './panel-dock';
import { injectPanelBaseCSS } from './panel-shell';

const PAL = {
  bg: '#060a16',
  grid: '#1d2742',
  axis: '#34406a',
  text: '#9fb6dd',
  dim: '#5f719a',
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

/** Per-cell plain-language caption — "what this is + what's real about it". Always shown under the cell. */
const VIEW_CAP = [
  'Gene-MLP activations — hidden(6) + output(7), tanh. Cyan = +, magenta = −.',
  'Live 5→6→7 weight graph. Signal flows input→hidden→output; edges bend & breathe to the net rhythm.',
  'Episodic valence ring, oldest→newest. Rises when fed/calm, falls under threat/chaos.',
  'Cumulative regret per action — the reward-gradient signal that nudges future choices.',
  'Percept vector: ENRG · THREAT · CROWD · CHAOS · MOOD (the 5 gene inputs).',
  '7 action drives (utilities). Longest spoke = what it wants most; green = the winner.',
  'Mood gauge (−manic..+brood) + the 5 fixed personality traits.',
  'GOAP world-model bits + the planned NEXT step on its scheme toward dominion.',
  'Softmax policy: bar height = P(action). Amber = chosen this beat, green outline = greedy.',
] as const;

/** Longer description shown in the footer legend when a view is expanded. */
const VIEW_DESC = [
  'FIRING — the inherited neural gene (a tiny MLP) thinking out loud. Top row = its 6 hidden neurons, bottom = the 7 output neurons (one per action). Bars are tanh activations: cyan fires positive, magenta negative. This is the raw neural vote that feeds the decision.',
  'TOPOLOGY — the gene as a living graph: 5 sensory inputs → 6 hidden → 7 action outputs. Each line is a real weight (cyan +, magenta −, thickness = |w|); a pulse rides every lit edge so you watch signal flow forward. It bends, breathes and morphs because a neural net is dynamic, not a frozen diagram.',
  'MEMORY — the episodic MemoryRing. Every decision beat the NHI stores one valence sample (energy − threat + a little chaos); the line is those samples oldest→newest, auto-scaled so even tiny drift is visible. The readout shows the latest value and the running mean — proof the memory is live and feeding mood.',
  'REWARD — cumulative regret for each action: how much better the greedy choice would have been. This is the learning signal (regret-matching) that biases the NHI toward choices it "wishes" it had made.',
  'SENSORY — the 5 gene inputs as a radar: energy, threat, crowding, chaos, and mood. This is exactly what the mind perceives this beat before it decides.',
  'INTENTION — the 7 action utilities as a star, every spoke labelled. Longer spoke = stronger drive; the green spoke is the argmax (what it most wants). Built from hand-designed drives + the gene vote + the GOAP plan nudge.',
  'AFFECT — the mood gauge (left = brooding, right = manic) plus the five personality traits fixed at birth: narcissism, aggression, deceit, hallucination, volatility. Mood drifts; traits do not.',
  'PREDICTION — the GOAP layer. The four bits are the world-model facts it has achieved (SWARM · DECEIVE · DOMINATE · FED); NEXT STEP is the cheapest action toward its goal (dominate + deceive). It runs a coherent multi-step scheme, not pure reaction.',
  'DECISION — the softmax policy over the utilities. Each bar is the probability of taking that action; the action names are written horizontally beneath. Amber (throbbing) is the action actually chosen this beat; the green outline marks the greedy (highest-utility) action.',
] as const;

const SENSORY_LABELS = ['ENRG', 'THRT', 'CRWD', 'CHAOS', 'MOOD'] as const;

const STYLE = `
#cqm-nhi-toggle{border-color:rgba(80,220,255,.55);background:linear-gradient(180deg,rgba(8,16,32,.92),rgba(4,10,22,.88));color:#9be8ff}
#cqm-nhi-toggle:hover{transform:scale(1.06);background:rgba(12,24,48,.94)}
#cqm-nhi-toggle:focus-visible{outline:2px solid #34e0ff;outline-offset:2px}
/* V39: raised well clear of the centered dock so the 3×3 grid never clashes with the menu bars.
   V71: wider so the nine labelled diagrams + their captions breathe. NOTE: the CENTER HUD
   (center-hud.ts) re-homes this panel into its centred slot with !important (position/size), so
   these are only the standalone fallback used before the HUD initialises. */
#cqm-nhi-panel{position:fixed;left:50%;bottom:calc(var(--cqm-bottom-h,108px) + 130px);transform:translateX(-50%);z-index:71;width:min(96vw,860px);
  max-height:min(82vh,720px);display:none;flex-direction:column;border:1px solid rgba(80,220,255,.32);border-radius:12px;
  background:rgba(4,8,18,.95);backdrop-filter:blur(12px);box-shadow:0 10px 46px rgba(0,0,0,.65);
  font:12px/1.5 var(--font-mono,ui-monospace,monospace);color:#cfe0fb;overflow:hidden}
#cqm-nhi-panel.open{display:flex}
.cqm-nhi-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(80,220,255,.22);background:rgba(8,16,34,.75)}
.cqm-nhi-head b{font-size:11px;letter-spacing:.14em;color:#7fd6ff;white-space:nowrap}
.cqm-nhi-meta{font-size:10px;opacity:.85;color:#9fb6dd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-nhi-sp{margin-left:auto}
.cqm-nhi-btn{background:rgba(2,8,20,.9);color:#9be8ff;border:1px solid rgba(80,220,255,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-nhi-btn:hover{background:rgba(16,32,60,.95)}
.cqm-nhi-btn:focus-visible{outline:1px solid #34e0ff}
.cqm-nhi-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:max-content;gap:6px;padding:8px;overflow-y:auto;flex:1 1 auto;min-height:0}
.cqm-nhi-cell{position:relative;border:1px solid rgba(80,220,255,.14);border-radius:6px;background:rgba(3,7,16,.7);overflow:hidden;cursor:zoom-in;transition:border-color .15s;display:flex;flex-direction:column}
.cqm-nhi-cell:hover{border-color:rgba(80,220,255,.5)}
.cqm-nhi-cell canvas{display:block;width:100%;height:auto}
/* The plain-language caption under each diagram — this is what makes every stage self-explaining. */
.cqm-nhi-cap{font:8.5px/1.3 var(--font-mono,ui-monospace,monospace);color:#8aa0c8;padding:4px 6px;
  border-top:1px solid rgba(80,220,255,.1);background:rgba(6,12,26,.55)}
/* V61: click any view to expand it to the whole panel (zoom-out to return). */
.cqm-nhi-grid.expanded{grid-template-columns:1fr;grid-auto-rows:1fr}
.cqm-nhi-grid.expanded .cqm-nhi-cell{display:none}
.cqm-nhi-grid.expanded .cqm-nhi-cell.exp{display:flex;cursor:zoom-out}
.cqm-nhi-grid.expanded .cqm-nhi-cell.exp .cqm-nhi-cap{font-size:11px;line-height:1.45;color:#aecbf0;padding:7px 9px}
/* Footer legend — orients in grid mode, gives the full description in expanded mode. */
.cqm-nhi-legend{flex:0 0 auto;padding:6px 11px;border-top:1px solid rgba(80,220,255,.18);background:rgba(8,16,34,.7);
  font:9.5px/1.45 var(--font-mono,ui-monospace,monospace);color:#9fb6dd;max-height:88px;overflow-y:auto}
.cqm-nhi-legend b{color:#7fd6ff}
.cqm-nhi-empty{position:relative;padding:0;text-align:center;color:#7f94c0;font-size:12px;line-height:1.7;flex:1 1 auto;min-height:0;overflow-y:auto}
.cqm-nhi-empty canvas{display:block;width:100%;height:auto;border-radius:8px}
.cqm-nhi-hint{position:absolute;left:0;right:0;bottom:14px;padding:0 16px;pointer-events:none;text-shadow:0 1px 6px #000}
@media (max-width:560px){.cqm-nhi-grid{grid-template-columns:repeat(2,1fr)}}
`;

/**
 * A single chart drawer: paints `s` into a 2D context of CSS size `w`×`h`. `t` is a continuous
 * animation phase in seconds (the rAF timestamp) so the views can FLOW between snapshots — signal
 * pulses travelling the topology, breathing fills, a sweeping memory cursor — instead of freezing
 * at the slow Observatory cadence. UI presentation only (the determinism ban is on sim logic, not
 * the rAF clock).
 */
type Drawer = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: NhiSnapshot,
  t: number,
) => void;

// ── small canvas helpers ──────────────────────────────────────────────────────
/** Label size scales gently with canvas width so the expanded view stays readable, never tiny. */
function lab(ctx: CanvasRenderingContext2D, w: number, base: number, weight = ''): void {
  const k = Math.max(1, Math.min(2.4, w / 240));
  ctx.font = `${weight}${(base * k).toFixed(1)}px ui-monospace,monospace`;
}
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, title: string): void {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAL.cyan;
  lab(ctx, w, 8, '600 ');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
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
/** [min, max] of an array (with a tiny guard) — drives the auto-scaling so small drift still reads. */
function range(a: readonly number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  return [lo, hi];
}
/** A soft additive glow dot — the unit of "signal" in the animated views. */
function spark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  a: number,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
/** Fractional part — drives travelling pulses (`frac(t*speed + offset)` ∈ [0,1)). */
function frac(x: number): number {
  return x - Math.floor(x);
}
/** Point on a quadratic bezier at parameter f∈[0,1] — for pulses riding the curved topology edges. */
function qbez(p0: number, pc: number, p1: number, f: number): number {
  const g = 1 - f;
  return g * g * p0 + 2 * g * f * pc + f * f * p1;
}
interface P3 {
  x: number;
  y: number;
  d: number;
}
/**
 * Rotate (x,y,z) about Y by `angle`, tilt about X, project to screen with mild depth perspective —
 * the small 3D primitive the V75 "make the nine views live + dimensional" pass uses (FIRING columns,
 * SENSORY/INTENTION tilt). `d` is the post-rotation depth (−1..1, nearer = larger) for shading.
 */
function project(
  x: number,
  y: number,
  z: number,
  angle: number,
  cx: number,
  cy: number,
  scale: number,
  tilt = 0.5,
): P3 {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const rx = x * c + z * sn;
  const rz = -x * sn + z * c;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const ry = y * ct - rz * st;
  const rz2 = y * st + rz * ct;
  const k = 1 / (1 - rz2 * 0.16);
  return { x: cx + rx * scale * k, y: cy - ry * scale * k, d: rz2 };
}

// ── the nine views ────────────────────────────────────────────────────────────
const drawFiring: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, VIEW_TITLES[0]);
  // V75: the firing is now a rotating 3D field — hidden(6) on an inner ring, output(7) on an outer
  // ring, each a column lifted by its tanh activation (cyan +, magenta −), depth-sorted so it has
  // real dimensionality + perpetual motion instead of two flat bar rows.
  const cx = w / 2;
  const cy = h / 2 + 6;
  const scale = Math.min(w, h) * 0.4;
  const ang = t * 0.5;
  interface Col {
    base: P3;
    tip: P3;
    v: number;
  }
  const cols: Col[] = [];
  const rings: [readonly number[], number][] = [
    [s.hidden, 0.55],
    [s.output, 0.95],
  ];
  for (const [vals, rad] of rings) {
    const n = vals.length || 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const v = Math.max(-1, Math.min(1, vals[i] ?? 0));
      cols.push({
        base: project(Math.cos(a) * rad, 0, Math.sin(a) * rad, ang, cx, cy, scale),
        tip: project(Math.cos(a) * rad, v, Math.sin(a) * rad, ang, cx, cy, scale),
        v,
      });
    }
  }
  cols.sort((a, b) => a.base.d - b.base.d); // far → near
  for (const c of cols) {
    const near = (c.base.d + 1) / 2;
    const rgb = c.v >= 0 ? '52,224,255' : '255,92,200';
    ctx.strokeStyle = `rgba(${rgb},${(0.3 + Math.abs(c.v) * 0.6).toFixed(2)})`;
    ctx.lineWidth = (1 + Math.abs(c.v) * 2) * (0.6 + near * 0.6);
    ctx.beginPath();
    ctx.moveTo(c.base.x, c.base.y);
    ctx.lineTo(c.tip.x, c.tip.y);
    ctx.stroke();
    spark(ctx, c.tip.x, c.tip.y, 1.5 + Math.abs(c.v) * 5 * near, rgb, 0.2 + Math.abs(c.v) * 0.5);
  }
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 6.5);
  ctx.textAlign = 'right';
  ctx.fillText('hid·out firing', w - 5, 5);
  ctx.textAlign = 'left';
};

const drawTopology: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, VIEW_TITLES[1]);
  const { in: ni, hid: nh, out: no } = s.dims;
  const cols = [ni, nh, no];
  const acts = [s.sensory, s.hidden, s.output];
  const colX = [w * 0.16, w * 0.5, w * 0.84];
  const top = 18;
  const bot = h - 6;
  // Each node's Y waves a little — the net "stretches & morphs" rather than sitting rigid.
  const posY = (n: number, k: number, c: number): number => {
    const baseY = top + ((k + 0.5) * (bot - top)) / n;
    return baseY + Math.sin(t * 1.1 + k * 0.9 + c * 1.7) * (bot - top) * 0.018;
  };
  const mw = maxAbs(s.weights);
  const off = nh * (ni + 1);
  // A curved edge whose control point bows perpendicular to the line and SWELLS with a sine — the
  // band has depth, cadence and rhythm. A pulse rides the curve, brightness driven by the SOURCE
  // node's live firing, so you watch the signal actually flow forward.
  const edge = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    wv: number,
    a: number,
    drive: number,
    seed: number,
  ): void => {
    const rgb = wv >= 0 ? '52,224,255' : '255,92,200';
    const mx2 = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    // perpendicular bow, breathing with t (cadence) and scaled by weight strength (depth)
    const bow = Math.sin(t * 1.6 + seed * 6.28) * (8 + a * 16);
    const cx = mx2 + (-dy / len) * bow;
    const cy = my + (dx / len) * bow;
    ctx.strokeStyle = `rgba(${rgb},${(a * 0.6).toFixed(2)})`;
    ctx.lineWidth = 0.6 + a * 1.8;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    const lit = Math.min(1, Math.abs(drive));
    if (a > 0.4 && lit > 0.12) {
      const f = frac(t * (0.35 + a * 0.5) + seed);
      spark(ctx, qbez(x0, cx, x1, f), qbez(y0, cy, y1, f), 3 + a * 2, rgb, 0.25 + lit * 0.5);
    }
  };
  for (let hh = 0; hh < nh; hh++) {
    for (let i = 0; i < ni; i++) {
      const wv = s.weights[hh * (ni + 1) + 1 + i] ?? 0;
      const a = Math.abs(wv) / mw;
      if (a < 0.22) continue;
      edge(
        colX[0]!,
        posY(ni, i, 0),
        colX[1]!,
        posY(nh, hh, 1),
        wv,
        a,
        s.sensory[i] ?? 0,
        (i * 7 + hh * 13) * 0.11,
      );
    }
  }
  for (let o = 0; o < no; o++) {
    for (let hh = 0; hh < nh; hh++) {
      const wv = s.weights[off + o * (nh + 1) + 1 + hh] ?? 0;
      const a = Math.abs(wv) / mw;
      if (a < 0.22) continue;
      edge(
        colX[1]!,
        posY(nh, hh, 1),
        colX[2]!,
        posY(no, o, 2),
        wv,
        a,
        s.hidden[hh] ?? 0,
        (hh * 5 + o * 17) * 0.13,
      );
    }
  }
  // nodes: a pulsing halo whose radius breathes with |activation| so live neurons glow.
  cols.forEach((n, c) => {
    for (let k = 0; k < n; k++) {
      const a = Math.min(1, Math.abs(acts[c]?.[k] ?? 0));
      const x = colX[c]!;
      const y = posY(n, k, c);
      if (a > 0.1) {
        const pr = (5 + a * 9) * (0.85 + Math.sin(t * 3 + k + c) * 0.15);
        spark(ctx, x, y, pr, '120,230,255', 0.1 + a * 0.4);
      }
      ctx.fillStyle = `rgba(160,240,255,${(0.3 + a * 0.7).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // column labels so the flow direction is unambiguous
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('IN', colX[0]!, h - 1);
  ctx.fillText('HID', colX[1]!, h - 1);
  ctx.fillText('OUT', colX[2]!, h - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};

const drawMemory: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, VIEW_TITLES[2]);
  const m = s.memory;
  const padT = 18;
  const padB = 14;
  const plotH = h - padT - padB;
  // Auto-scale to the data's own [min,max] (with a floor) so even small drift fills the band and the
  // line never looks "flat". A zero baseline shows the sign of valence.
  let [lo, hi] = range(m);
  const mid = (lo + hi) / 2;
  let span = hi - lo;
  if (span < 0.08) {
    lo = mid - 0.04;
    hi = mid + 0.04;
    span = 0.08;
  }
  const yOf = (v: number): number => padT + plotH - ((v - lo) / span) * plotH;
  // faint gridlines
  ctx.strokeStyle = PAL.grid;
  ctx.lineWidth = 1;
  for (let g = 0; g <= 2; g++) {
    const y = padT + (g / 2) * plotH;
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(w - 4, y);
    ctx.stroke();
  }
  // zero baseline (if 0 is in range)
  if (lo < 0 && hi > 0) {
    ctx.strokeStyle = PAL.axis;
    ctx.beginPath();
    const yz = yOf(0);
    ctx.moveTo(4, yz);
    ctx.lineTo(w - 4, yz);
    ctx.stroke();
  }
  if (m.length < 2) {
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 8);
    ctx.fillText('filling memory…', 6, padT + plotH / 2);
    return;
  }
  const sx = (w - 8) / (m.length - 1);
  // filled area under the curve → the timeline reads as a living signal, not a hairline
  ctx.beginPath();
  m.forEach((v, i) => {
    const x = 4 + i * sx;
    const y = yOf(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(4 + (m.length - 1) * sx, padT + plotH);
  ctx.lineTo(4, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(107,255,158,.12)';
  ctx.fill();
  // the line itself
  ctx.beginPath();
  m.forEach((v, i) => {
    const x = 4 + i * sx;
    const y = yOf(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = PAL.green;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // sample dots so the discrete episodic nature reads
  m.forEach((v, i) => {
    ctx.fillStyle = 'rgba(107,255,158,.55)';
    ctx.beginPath();
    ctx.arc(4 + i * sx, yOf(v), 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // a breathing comet at the newest sample (right edge) so the timeline feels live
  const last = m[m.length - 1] ?? 0;
  const lx = 4 + (m.length - 1) * sx;
  const ly = yOf(last);
  spark(ctx, lx, ly, 4 + Math.abs(Math.sin(t * 2.5)) * 3, '107,255,158', 0.7);
  // live readout — proof it DOES something
  let sum = 0;
  for (const v of m) sum += v;
  const mean = sum / m.length;
  ctx.fillStyle = PAL.text;
  lab(ctx, w, 7.5);
  ctx.textAlign = 'right';
  ctx.fillText(`now ${last.toFixed(2)} · μ ${mean.toFixed(2)}`, w - 5, 5);
  ctx.textAlign = 'left';
};

const drawReward: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, VIEW_TITLES[3]);
  const r = s.regret;
  const mx = maxAbs(r);
  const n = r.length;
  const rowH = (h - 22) / n;
  const x0 = w * 0.46;
  // The action carrying the most regret pulses — it's the strongest learning signal this beat.
  let peak = 0;
  for (let i = 1; i < n; i++) if (Math.abs(r[i] ?? 0) > Math.abs(r[peak] ?? 0)) peak = i;
  ctx.strokeStyle = PAL.axis;
  ctx.beginPath();
  ctx.moveTo(x0, 16);
  ctx.lineTo(x0, h - 2);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  r.forEach((v, i) => {
    const y = 18 + i * rowH + rowH / 2;
    const grow = i === peak ? 0.9 + Math.abs(Math.sin(t * 3)) * 0.1 : 1;
    const bw = (v / mx) * (w * 0.42) * grow;
    const rgb = v >= 0 ? '107,255,158' : '255,107,107';
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fillRect(x0, y - (rowH - 4) / 2, bw, rowH - 4);
    // a shimmer travels each bar toward its tip — the gradient is "flowing"
    spark(ctx, x0 + bw * frac(t * 0.5 + i * 0.2), y, 2.5, rgb, 0.5);
    if (i === peak) spark(ctx, x0 + bw, y, 4 + Math.abs(Math.sin(t * 3)) * 2, rgb, 0.6);
    ctx.fillStyle = i === peak ? PAL.text : PAL.dim;
    lab(ctx, w, 6.6);
    ctx.textAlign = 'left';
    ctx.fillText(NHI_ACTION_LABELS[i] ?? '', 3, y);
  });
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
};

const drawSensory: Drawer = (ctx, w, h, s, t) => {
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
  const R = Math.min(w, h - 14) * 0.36;
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
  // a sweeping radar beam (the scope rotates) — life without moving the labels
  const sweep = t * 0.8;
  ctx.strokeStyle = 'rgba(52,224,255,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
  ctx.stroke();
  // breathing percept polygon + the strongest sense sparking
  const breath = 0.97 + Math.sin(t * 2) * 0.03;
  let peak = 0;
  for (let i = 1; i < N; i++) if ((vals[i] ?? 0) > (vals[peak] ?? 0)) peak = i;
  ctx.beginPath();
  vals.forEach((v, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const rr = R * Math.max(0, Math.min(1, v)) * breath;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(52,224,255,.28)';
  ctx.strokeStyle = PAL.cyan;
  ctx.lineWidth = 1.3;
  ctx.fill();
  ctx.stroke();
  const pa = (peak / N) * Math.PI * 2 - Math.PI / 2;
  const pr = R * Math.max(0, Math.min(1, vals[peak] ?? 0)) * breath;
  spark(
    ctx,
    cx + Math.cos(pa) * pr,
    cy + Math.sin(pa) * pr,
    4 + Math.abs(Math.sin(t * 3)) * 3,
    '52,224,255',
    0.6,
  );
  // axis labels OUTSIDE the web, anchored by quadrant so they never overlap the polygon
  ctx.fillStyle = PAL.text;
  lab(ctx, w, 7);
  vals.forEach((_v, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * (R + 9);
    const ly = cy + Math.sin(a) * (R + 9);
    ctx.textAlign = Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center';
    ctx.textBaseline = Math.sin(a) > 0.3 ? 'top' : 'bottom';
    ctx.fillText(SENSORY_LABELS[i] ?? '', lx, ly);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};

const drawIntention: Drawer = (ctx, w, h, s, t) => {
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
  const R = Math.min(w, h - 14) * 0.34;
  const breath = 0.96 + Math.sin(t * 2.2) * 0.04;
  // spokes + grid ring
  ctx.strokeStyle = PAL.grid;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  ctx.stroke();
  // the utility polygon (breathing)
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = R * (0.12 + 0.88 * (((sc[i] ?? 0) - lo) / span)) * breath;
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
  // the argmax spoke throbs, with a spark riding to its tip — the live "this is what it wants"
  const aa = (arg / n) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = PAL.green;
  ctx.lineWidth = 1.4 + Math.abs(Math.sin(t * 3)) * 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(aa) * R, cy + Math.sin(aa) * R);
  ctx.stroke();
  const f = frac(t * 0.6);
  spark(ctx, cx + Math.cos(aa) * R * f, cy + Math.sin(aa) * R * f, 3, '107,255,158', 0.6);
  const argRR = R * (0.12 + 0.88) * breath;
  spark(
    ctx,
    cx + Math.cos(aa) * argRR,
    cy + Math.sin(aa) * argRR,
    3 + Math.abs(Math.sin(t * 3)) * 3,
    '107,255,158',
    0.6,
  );
  // EVERY spoke labelled with its action name (this is what the "vector points" are)
  lab(ctx, w, 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * (R + 9);
    const ly = cy + Math.sin(a) * (R + 9);
    ctx.fillStyle = i === arg ? PAL.green : PAL.text;
    ctx.textAlign = Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center';
    ctx.textBaseline = Math.sin(a) > 0.3 ? 'top' : 'bottom';
    ctx.fillText(NHI_ACTION_LABELS[i] ?? '', lx, ly);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};

const drawAffect: Drawer = (ctx, w, h, s, tm) => {
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
  // the needle TREMBLES with the (real) volatility trait — a volatile mind's mood is never frozen.
  const jitter = Math.sin(tm * 5) * (s.traits.volatility ?? 0) * 0.08;
  const ma = Math.PI + (Math.max(-1, Math.min(1, s.mood + jitter)) * 0.5 + 0.5) * Math.PI;
  const moodRGB = s.mood >= 0 ? '255,182,72' : '52,224,255';
  ctx.strokeStyle = `rgb(${moodRGB})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ma) * R, cy + Math.sin(ma) * R);
  ctx.stroke();
  spark(ctx, cx + Math.cos(ma) * R, cy + Math.sin(ma) * R, 4, moodRGB, 0.6);
  ctx.fillStyle = PAL.text;
  lab(ctx, w, 7.5);
  ctx.textAlign = 'center';
  ctx.fillText('MOOD ' + s.mood.toFixed(2), cx, cy + 5);
  ctx.textAlign = 'left';
  // five trait bars along the bottom; the dominant trait breathes + sparks
  const tr = s.traits;
  const traits: [string, number][] = [
    ['NAR', tr.narcissism],
    ['AGG', tr.aggression],
    ['DEC', tr.deceit],
    ['HAL', tr.hallucination],
    ['VOL', tr.volatility],
  ];
  let peak = 0;
  for (let i = 1; i < traits.length; i++) if (traits[i]![1] > traits[peak]![1]) peak = i;
  const bw = (w - 8) / traits.length;
  lab(ctx, w, 7);
  traits.forEach(([label, v], i) => {
    const x = 4 + i * bw;
    const grow = i === peak ? 0.92 + Math.abs(Math.sin(tm * 3)) * 0.08 : 1;
    const bh = v * (h * 0.26) * grow;
    ctx.fillStyle = i === peak ? PAL.mag : 'rgba(255,92,200,.6)';
    ctx.fillRect(x + 2, h - 11 - bh, bw - 4, bh);
    if (i === peak) spark(ctx, x + bw / 2, h - 11 - bh, 4, '255,92,200', 0.5);
    ctx.fillStyle = PAL.text;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + bw / 2, h - 10);
  });
  ctx.textAlign = 'left';
};

const drawPrediction: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, VIEW_TITLES[7]);
  // four GOAP fact cells, lit when their bit is set — achieved facts GLOW + breathe
  const cellW = (w - 8) / 4;
  lab(ctx, w, 7);
  ctx.textAlign = 'center';
  for (let b = 0; b < 4; b++) {
    const set = (s.facts & (1 << b)) !== 0;
    const x = 4 + b * cellW;
    if (set)
      spark(ctx, x + cellW / 2, 32, 9 + Math.abs(Math.sin(t * 2.5 + b)) * 4, '107,255,158', 0.3);
    const glow = set ? 0.7 + Math.abs(Math.sin(t * 2.5 + b)) * 0.3 : 1;
    ctx.fillStyle = set ? `rgba(107,255,158,${glow.toFixed(2)})` : 'rgba(40,56,90,.7)';
    ctx.fillRect(x + 2, 20, cellW - 4, 24);
    ctx.fillStyle = set ? '#04210f' : PAL.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(NHI_FACT_LABELS[b] ?? '', x + cellW / 2, 32);
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 7.5);
  ctx.fillText('GOAL ▸ DOMINATE + DECEIVE', 5, h - 30);
  const planned = s.plannedAction >= 0 ? (NHI_ACTION_LABELS[s.plannedAction] ?? '?') : 'IDLE';
  // the committed next step pulses — the scheme is alive, not a frozen label
  const pulse = 0.7 + Math.abs(Math.sin(t * 2.5)) * 0.3;
  ctx.fillStyle = `rgba(255,182,72,${pulse.toFixed(2)})`;
  lab(ctx, w, 9, '600 ');
  ctx.fillText('NEXT STEP ▸ ' + planned, 5, h - 16);
};

const drawDecision: Drawer = (ctx, w, h, s, t) => {
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
  const base = h - 16; // leave a readable label band beneath the bars
  const top = 26;
  const beat = 0.6 + Math.abs(Math.sin(t * 3)) * 0.4; // the chosen action throbs
  for (let i = 0; i < n; i++) {
    const x = 4 + i * bw;
    const bh = (p[i] ?? 0) * (base - top);
    const chosen = i === s.lastAction;
    if (chosen) spark(ctx, x + bw / 2, base - bh, bw, '255,182,72', beat * 0.5);
    ctx.fillStyle = chosen
      ? `rgba(255,${(150 + beat * 60).toFixed(0)},72,${(0.7 + beat * 0.3).toFixed(2)})`
      : 'rgba(52,224,255,.5)';
    ctx.fillRect(x + 1, base - bh, bw - 2, bh);
    if (i === greedy) {
      ctx.strokeStyle = PAL.green;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, base - bh, bw - 2, bh);
    }
    // probability % above the bar
    ctx.fillStyle = PAL.text;
    lab(ctx, w, 6.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round((p[i] ?? 0) * 100)}%`, x + bw / 2, base - bh - 1);
    // HORIZONTAL action label beneath the bar (the explicit fix to the unreadable vertical text)
    ctx.fillStyle = chosen ? PAL.amber : PAL.dim;
    ctx.textBaseline = 'top';
    ctx.fillText(NHI_ACTION_LABELS[i] ?? '', x + bw / 2, base + 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
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
 * The DORMANT brain — a living idle animation shown when no NHI is launched, so the panel is never
 * a frozen, lifeless image. A ring of neurons fires sparks at a wandering pacemaker, pulses race
 * the chords between them, and the whole thing breathes. Pure `t`-driven trig (no rng, no state):
 * a fixed deterministic layout that simply animates. O(nodes²) on a tiny graph.
 */
function drawIdleBrain(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.36;
  const N = 9;
  const nx: number[] = [];
  const ny: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2 + t * 0.12; // the whole net slowly rotates
    const wob = 1 + Math.sin(t * 1.3 + i * 1.7) * 0.08;
    nx.push(cx + Math.cos(a) * R * wob);
    ny.push(cy + Math.sin(a) * R * wob * 0.82);
  }
  // chords with travelling pulses
  for (let i = 0; i < N; i++) {
    for (let j = i + 2; j < N; j++) {
      if ((i + j) % 3 !== 0) continue; // a sparse, structured subset
      const x0 = nx[i]!;
      const y0 = ny[i]!;
      const x1 = nx[j]!;
      const y1 = ny[j]!;
      ctx.strokeStyle = 'rgba(52,224,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const f = frac(t * 0.4 + (i * 3 + j) * 0.09);
      spark(ctx, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 3, '120,230,255', 0.5);
    }
  }
  // a wandering pacemaker that lights each neuron as it sweeps past
  const lead = frac(t * 0.18) * N;
  for (let i = 0; i < N; i++) {
    const d = Math.min(Math.abs(i - lead), N - Math.abs(i - lead));
    const fire = Math.max(0, 1 - d * 0.7);
    const pr = 4 + fire * 10;
    if (fire > 0.05) spark(ctx, nx[i]!, ny[i]!, pr, '52,224,255', 0.2 + fire * 0.6);
    ctx.fillStyle = `rgba(160,240,255,${(0.4 + fire * 0.6).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(nx[i]!, ny[i]!, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
  private readonly legendEl: HTMLElement;
  private readonly cells: HTMLElement[] = [];
  private readonly ctxs: CanvasRenderingContext2D[] = [];
  private idleCtx: CanvasRenderingContext2D | null = null;
  private open = false;
  private focus = 0;
  private dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  /** Latest pushed snapshot + meta — the rAF loop paints from these every frame (decoupled cadence). */
  private snap: NhiSnapshot | null = null;
  private metaC = { id: 0, count: 0 };
  /** rAF handle for the self-animation loop (runs only while open + connected). */
  private raf = 0;
  /** V61: which view is expanded to fill the panel (−1 = the 3×3 grid). */
  private expanded = -1;

  constructor(doc: Document = document) {
    // Guard against a double-mount (e.g. bun --hot re-running world.ts): drop any prior nodes so a
    // single live toggle/panel exists and the click handler always targets THIS instance.
    doc.getElementById('cqm-nhi-toggle')?.remove();
    doc.getElementById('cqm-nhi-panel')?.remove();
    doc.getElementById('cqm-nhi-style')?.remove(); // drop a prior <style> too, else it accumulates per re-mount
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.id = 'cqm-nhi-style';
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-nhi-toggle';
    toggle.type = 'button';
    toggle.className = 'cqm-dock-toggle';
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
      <div class="cqm-nhi-empty" data-empty><canvas data-idle></canvas>
      <div class="cqm-nhi-hint">No NHI launched.<br>Press the <b>⟁ NHI</b> button (or <b>N</b>) to release a non-human intelligence,<br>then watch its mind think here in real time.</div></div>
      <div class="cqm-nhi-grid" data-grid style="display:none"></div>
      <div class="cqm-nhi-legend" data-legend></div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.meta = panel.querySelector('[data-meta]') as HTMLElement;
    this.gridEl = panel.querySelector('[data-grid]') as HTMLElement;
    this.emptyEl = panel.querySelector('[data-empty]') as HTMLElement;
    this.legendEl = panel.querySelector('[data-legend]') as HTMLElement;
    this.idleCtx = (panel.querySelector('[data-idle]') as HTMLCanvasElement).getContext('2d');
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
      cell.title = VIEW_TITLES[i] ?? '';
      // Click a view to expand it to the whole panel; click the expanded view to return to the grid.
      cell.addEventListener('click', () => this.toggleExpand(i));
      const cv = doc.createElement('canvas');
      cell.appendChild(cv);
      const cap = doc.createElement('div');
      cap.className = 'cqm-nhi-cap';
      cap.textContent = VIEW_CAP[i] ?? '';
      cell.appendChild(cap);
      this.gridEl.appendChild(cell);
      this.cells.push(cell);
      const c = cv.getContext('2d');
      if (c) this.ctxs.push(c);
    }
    this.refreshLegend();
  }

  /** Expand view `i` to fill the panel, or collapse back to the 3×3 grid if it's already expanded. */
  private toggleExpand(i: number): void {
    this.expanded = this.expanded === i ? -1 : i;
    this.cells.forEach((c, k) => c.classList.toggle('exp', k === this.expanded));
    this.gridEl.classList.toggle('expanded', this.expanded >= 0);
    this.refreshLegend();
  }

  /** Footer legend: orient in grid mode, give the full description of the expanded view otherwise. */
  private refreshLegend(): void {
    if (this.expanded >= 0) {
      // VIEW_DESC starts with its own "NAME — "; strip it so the bold title isn't repeated.
      const desc = (VIEW_DESC[this.expanded] ?? '').replace(/^[^—]*—\s*/, '');
      this.legendEl.innerHTML = `<b>${VIEW_TITLES[this.expanded]}</b> — ${desc}`;
    } else {
      this.legendEl.innerHTML =
        '<b>Nine live readouts of this NHI’s mind</b> — every shape is a REAL internal variable of its decision loop, not decoration. Click any panel to expand it and read exactly what it means.';
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
    if (v) this.startLoop();
    else this.stopLoop();
  }

  private cycle(d: number): void {
    // Wrap within the known item count so the focus index stays valid between renders (it was
    // growing unbounded as the user cycled, then only clamped at read time).
    const c = this.metaC.count;
    this.focus = c > 0 ? (((this.focus + d) % c) + c) % c : 0;
  }

  /**
   * Push the focused NHI's latest snapshot + meta. This NO LONGER paints — it just records the data
   * and refreshes the header; the self-driven rAF loop ({@link tick}) renders every frame so the
   * views FLOW continuously (signal pulses, breathing) between the slow Observatory pushes instead of
   * freezing. `null` snap / `count === 0` ⇒ the animated idle brain. O(1).
   */
  update(snap: NhiSnapshot | null, meta: { id: number; count: number }): void {
    if (meta.count > 0) this.focus = this.focus % meta.count;
    else this.focus = 0;
    this.snap = snap;
    this.metaC = meta;
    if (!this.open) return;
    const has = snap !== null && meta.count > 0;
    this.emptyEl.style.display = has ? 'none' : 'block';
    this.gridEl.style.display = has ? 'grid' : 'none';
    this.legendEl.style.display = has ? 'block' : 'none';
    this.meta.textContent = has
      ? `NHI #${meta.id} · ${this.focus + 1}/${meta.count} · ${NHI_ACTION_LABELS[snap!.lastAction] ?? '?'}`
      : `no NHI launched`;
  }

  // ── self-animation loop ─────────────────────────────────────────────────────
  private startLoop(): void {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }
  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  /** One animation frame; `ts` is the rAF DOMHighResTimeStamp (ms). Self-heals if the panel is torn down. */
  private readonly tick = (ts: number): void => {
    this.raf = 0;
    if (!this.open || !this.panel.isConnected) return; // stop cleanly (closed or hot-replaced)
    this.paint(ts / 1000);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Render this frame: the nine live views when an NHI is focused, else the animated idle brain. */
  private paint(t: number): void {
    if (this.snap !== null && this.metaC.count > 0) this.paintGrid(t, this.snap);
    else this.paintIdle(t);
  }

  /** Paint the 3×3 grid (or the single expanded view). Sizes each canvas to its own cell. */
  private paintGrid(t: number, snap: NhiSnapshot): void {
    for (let i = 0; i < this.ctxs.length; i++) {
      const ctx = this.ctxs[i];
      const drawer = DRAWERS[i];
      const cell = this.cells[i];
      if (!ctx || !drawer || !cell) continue;
      const cw = Math.floor(cell.clientWidth);
      if (cw < 8) continue; // a collapsed sibling while one view is expanded → skip (it's hidden)
      const exp = this.expanded === i;
      const ch = exp
        ? Math.max(180, Math.min(Math.round(cw * 0.5), this.gridEl.clientHeight - 64))
        : Math.round(cw * 0.7);
      this.size(ctx, cw, ch);
      drawer(ctx, cw, ch, snap, t);
    }
  }

  /** Paint the dormant-brain idle animation into the empty-state canvas. */
  private paintIdle(t: number): void {
    const ctx = this.idleCtx;
    if (!ctx) return;
    const cw = Math.max(160, Math.floor(this.emptyEl.clientWidth));
    const ch = Math.round(cw * 0.5);
    this.size(ctx, cw, ch);
    drawIdleBrain(ctx, cw, ch, t);
  }

  /** Resize a canvas to `w`×`h` CSS px (DPR-backed) only when it actually changed, then set the DPR transform. */
  private size(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cv = ctx.canvas;
    if (cv.width !== w * this.dpr || cv.height !== h * this.dpr) {
      cv.width = w * this.dpr;
      cv.height = h * this.dpr;
      cv.style.height = h + 'px';
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}
