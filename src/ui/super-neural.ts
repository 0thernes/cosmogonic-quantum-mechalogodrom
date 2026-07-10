/**
 * SUPER NEURAL OBSERVATORY (V84) — the apex creature's composite-mind observatory, now folded into
 * the SAME Super Creature box (no second window). It mounts its DOM into a HOST element the
 * {@link SuperPanel} provides, so "⊞ NEURAL" grows the one box instead of spawning an overlay.
 *
 * FOUR tabs, all live + 3D + temporal (directive: "9 windows, not 6 … tabs 1/2/3 for 27 data
 * visuals, tab 4 a BRAIN … 3D is cool and temporal is nice … reactive responsive adaptive, no
 * overflow"):
 *   I   · WORLD     — 9 readouts of the CORTEX world-model / perception / imagination.
 *   II  · COGNITION — 9 readouts of the five-stage pipeline, consciousness, emotion, drives, and the
 *                     spin-glass INSTINCT (`SuperMindSnapshot.spin`, the ported Hopfield/Ising lattice).
 *   III · QUANTUM   — 9 readouts of the REAL simulated-qubit mind (`SuperMindSnapshot.qubits`, the
 *                     `super-qubits.ts` 6-qubit statevector register): the |ψ|² statevector phase-
 *                     coloured, per-qubit Bloch vectors, live entropy/coherence, the Born-sampled
 *                     "collapsed thought", the entanglement web — plus the ported QGT GEOMETRY (the
 *                     metric eigen-ellipse of the mind's own circuit) and the ESHKOL qubit-RNG the
 *                     mind collapses its thoughts through (`SuperMindSnapshot.eshkol`).
 *   IV  · BRAIN     — one large rotating 3D connectome of the mind's organs + signal flow.
 *
 * Every readout is bound to a REAL variable of the {@link SuperMindSnapshot}; nothing decorative.
 * Temporal views keep small ring-buffers so the data has MOTION between the slow Observatory pushes.
 * UI shell only — it never imports or mutates sim state (the determinism ban is on sim logic, not the
 * rAF clock). The GEOMETRY / ESHKOL / INSTINCT readouts bind the genuine Tsotchke ports wired into the
 * apex mind (see THIRD-PARTY-NOTICES.md), not presentation echoes.
 */
import type { SuperMindSnapshot } from '../sim/super-mind';

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

const Q_LABELS = ['SUP', 'ENT', 'FTL', '0K', 'QDT', 'MRP', 'MUT', 'RCT', 'RSP', 'ADP'] as const;
const CONS_LABELS = ['DREAM', 'HALLU', 'REASON', 'FEEL', 'SELF', 'NOVEL', 'SURP'] as const;
const STAGE_LABELS = ['PERCEIVE', 'IMAGINE', 'REASON', 'FEEL', 'ACT'] as const;
const TAB_LABELS = ['I · WORLD', 'II · COGNITION', 'III · QUANTUM', 'IV · BRAIN'] as const;

const STYLE = `
.cqm-sneu{display:flex;flex-direction:column;min-height:0;flex:1 1 auto;--sneu-tint:0;--sneu-rgb:150,148,142}
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
.cqm-sneu-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:minmax(150px,1fr);gap:7px;padding:8px;
  overflow-y:auto;flex:1 1 auto;min-height:200px;border-top:1px solid rgba(180,120,255,.28);align-content:stretch}
.cqm-sneu-grid.brain{grid-template-columns:1fr;grid-template-rows:min(56vh,520px);min-height:min(56vh,520px)}
/* Depth: a radial floor-glow + an inset rim make each tile read as a lit 3D chamber, not a flat pane. */
.cqm-sneu-cell{position:relative;border:1px solid rgba(180,120,255,.18);border-radius:8px;
  background:
    linear-gradient(rgba(var(--sneu-rgb), calc(var(--sneu-tint) * .16)), rgba(var(--sneu-rgb), calc(var(--sneu-tint) * .06))),
    radial-gradient(120% 90% at 50% 8%, rgba(40,24,72,.5), rgba(5,3,12,.72) 62%, rgba(2,1,7,.85));
  box-shadow:inset 0 1px 0 rgba(200,170,255,.12), inset 0 -10px 24px rgba(0,0,0,.5), 0 3px 10px rgba(0,0,0,.4);
  overflow:hidden;display:flex;min-height:0;transition:box-shadow .4s ease}
.cqm-sneu-cell canvas{display:block;width:100%;height:100%}
.cqm-sneu-foot{flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:5px 10px;border-top:1px solid rgba(180,120,255,.2);
  background:rgba(22,10,40,.7);font:9px/1.4 var(--font-mono,ui-monospace,monospace);color:#b9a3e0;min-height:0}
.cqm-sneu-foot b{color:#d8b8ff}
`;

type Snap = SuperMindSnapshot;
type Drawer = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: Snap,
  t: number,
  H: Hist,
) => void;

// ── temporal history (ring buffers give the views motion between slow pushes) ──────────────
const HCAP = 96;
interface Hist {
  /** Newest sample index; the caller advances it once per frame before drawers push. */
  head: number;
  push(key: string, v: number): void;
  series(key: string): Float32Array;
}
function makeHist(): Hist {
  const rings = new Map<string, Float32Array>();
  const ring = (key: string): Float32Array => {
    let r = rings.get(key);
    if (!r) {
      r = new Float32Array(HCAP);
      rings.set(key, r);
    }
    return r;
  };
  return {
    head: 0,
    push(key, v) {
      ring(key)[this.head % HCAP] = Number.isFinite(v) ? v : 0;
    },
    series(key) {
      return ring(key);
    },
  };
}

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
// [60] spark() ran a fresh createRadialGradient per call — thousands per frame in the MEGA-brain axon
// pass, a heavy per-frame allocation + GC churn. Instead we bake each colour's radial falloff ONCE into a
// small offscreen sprite (alpha 1 at the core → 0 at the rim) and blit it with globalAlpha carrying the
// per-call opacity. The gradient profile is identical, so the render is visually equivalent; the colour is
// quantised to /8 per channel so the cache is bounded (the axon hues vary continuously). Falls back to the
// original gradient when there is no DOM (headless tests import this module but never call spark()).
const SPARK_SPRITE_R = 32;
const sparkSprites = new Map<string, HTMLCanvasElement | null>();
function sparkSprite(rgb: string): HTMLCanvasElement | null {
  const parts = rgb.split(',');
  const q = (s: string | undefined): number =>
    Math.min(255, Math.max(0, Math.round((parseInt(s ?? '255', 10) || 0) / 8) * 8));
  const key = `${q(parts[0])},${q(parts[1])},${q(parts[2])}`;
  const cached = sparkSprites.get(key);
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') {
    sparkSprites.set(key, null);
    return null;
  }
  const cv = document.createElement('canvas');
  cv.width = SPARK_SPRITE_R * 2;
  cv.height = SPARK_SPRITE_R * 2;
  const sctx = cv.getContext('2d');
  if (!sctx) {
    sparkSprites.set(key, null);
    return null;
  }
  const grad = sctx.createRadialGradient(
    SPARK_SPRITE_R,
    SPARK_SPRITE_R,
    0,
    SPARK_SPRITE_R,
    SPARK_SPRITE_R,
    SPARK_SPRITE_R,
  );
  grad.addColorStop(0, `rgba(${key},1)`);
  grad.addColorStop(1, `rgba(${key},0)`);
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, SPARK_SPRITE_R * 2, SPARK_SPRITE_R * 2);
  sparkSprites.set(key, cv);
  return cv;
}
function spark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  a: number,
): void {
  if (r <= 0) return;
  const sprite = sparkSprite(rgb);
  if (!sprite) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Sprite core alpha is 1; multiply the existing globalAlpha by the per-call opacity so compositing
  // matches the old rgba(rgb,a) fill (which itself composited against globalAlpha). Bilinear scale to 2r.
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp01(a);
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}
function frac(x: number): number {
  return x - Math.floor(x);
}
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clampS = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

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
/** Draw a temporal series (ring buffer) as a flowing line filling [x0,x1]×[y0,y1] (v in [lo,hi]). */
function trail(
  ctx: CanvasRenderingContext2D,
  s: Float32Array,
  head: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  lo: number,
  hi: number,
  rgb: string,
): void {
  const n = s.length;
  const span = Math.max(1e-6, hi - lo);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const idx = (head + 1 + i) % n; // oldest → newest
    const v = s[idx] ?? 0;
    const x = x0 + (i / (n - 1)) * (x1 - x0);
    const y = y1 - clamp01((v - lo) / span) * (y1 - y0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(${rgb},.9)`;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}
function avg(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] ?? 0;
  return a.length ? s / a.length : 0;
}

// ════════════════════ TAB I — WORLD MODEL (9 views) ════════════════════
const drawLatentRing: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · LATENT RING');
  const lat = s.latent;
  const n = lat.length || 16;
  const cx = w / 2;
  const cy = h / 2 + 5;
  const scale = Math.min(w, h) * 0.4;
  const ang = t * 0.4;
  const pts: P3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(
      project(
        Math.cos(a) * 0.82,
        clampS(lat[i] ?? 0) * 0.9,
        Math.sin(a) * 0.82,
        ang,
        cx,
        cy,
        scale,
      ),
    );
  }
  for (let i = 0; i < n; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % n]!;
    const da = 0.4 + 0.5 * (1 - (p0.d + 1) / 2);
    ctx.strokeStyle = `rgba(108,223,255,${da.toFixed(2)})`;
    ctx.lineWidth = 1 + (1 - (p0.d + 1) / 2) * 1.4;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  for (const p of pts) {
    const near = (p.d + 1) / 2;
    spark(ctx, p.x, p.y, 2 + near * 4, '108,223,255', 0.25 + near * 0.4);
  }
};
const drawLatentSpectrum: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · SPECTRUM');
  const lat = s.latent;
  const n = lat.length || 16;
  const x0 = 6;
  const x1 = w - 6;
  const mid = h / 2 + 6;
  const bw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const v = clampS(lat[i] ?? 0);
    const x = x0 + i * bw;
    const shimmer = 0.9 + Math.sin(t * 3 + i) * 0.1;
    const bh = v * (h * 0.32) * shimmer;
    ctx.fillStyle = v >= 0 ? 'rgba(108,223,255,.8)' : 'rgba(255,106,176,.8)';
    ctx.fillRect(x + 1, mid - Math.max(0, bh), bw - 2, Math.abs(bh));
  }
  ctx.strokeStyle = PAL.grid;
  ctx.beginPath();
  ctx.moveTo(x0, mid);
  ctx.lineTo(x1, mid);
  ctx.stroke();
};
const drawLatentHeat: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'WORLD · TEMPORAL');
  const lat = s.latent;
  const n = Math.min(lat.length || 16, 16);
  for (let i = 0; i < n; i++) H.push('lh' + i, clampS(lat[i] ?? 0));
  const top = 16;
  const rh = (h - top - 4) / n;
  const cols = HCAP;
  const cw = (w - 8) / cols;
  for (let i = 0; i < n; i++) {
    const ser = H.series('lh' + i);
    for (let c = 0; c < cols; c++) {
      const idx = (H.head + 1 + c) % cols;
      const v = ((ser[idx] ?? 0) + 1) / 2;
      const r = Math.round(80 + v * 175);
      const b = Math.round(140 + (1 - v) * 80);
      ctx.fillStyle = `rgb(${r},${Math.round(60 + v * 60)},${b})`;
      ctx.fillRect(4 + c * cw, top + i * rh, cw + 0.6, rh + 0.6);
    }
  }
};
const drawImagination: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · IMAGINE');
  const lat = s.latent;
  const img = s.imagined;
  const n = Math.max(lat.length, img.length) || 16;
  const padX = 7;
  const mid = h / 2 + 4;
  const plotH = h - 32;
  const xOf = (i: number): number => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);
  const yOf = (v: number): number => mid - clampS(v) * (plotH / 2);
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.lineTo(xOf(i), yOf(lat[i] ?? 0));
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(xOf(i), yOf(img[i] ?? 0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,106,176,.14)';
  ctx.fill();
  for (const [arr, col] of [
    [lat, PAL.cyan],
    [img, PAL.mag],
  ] as const) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xOf(i);
      const y = yOf(arr[i] ?? 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  const si = Math.round(frac(t * 0.25) * (n - 1));
  spark(ctx, xOf(si), yOf(img[si] ?? 0), 3 + Math.abs(Math.sin(t * 3)) * 2, '255,106,176', 0.6);
};
const drawNoveltyField: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · NOVELTY');
  const nov = clamp01(s.consciousness.novelty ?? 0);
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.42;
  for (let r = 1; r <= 5; r++) {
    const rr = ((R * r) / 5) * (0.95 + Math.sin(t * 2 + r) * 0.05);
    ctx.strokeStyle = `rgba(141,255,158,${(0.1 + nov * 0.4 * (1 - r / 6)).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  spark(ctx, cx, cy, R * (0.3 + nov * 0.7), '141,255,158', 0.15 + nov * 0.5);
  ctx.fillStyle = PAL.green;
  lab(ctx, w, 8, '600 ');
  ctx.textAlign = 'center';
  ctx.fillText(nov.toFixed(2), cx, cy - 5);
  ctx.textAlign = 'left';
};
const drawWorldSphere: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · SPHERE');
  const lat = s.latent;
  const n = lat.length || 16;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const scale = Math.min(w, h) * 0.4;
  const ang = t * 0.35;
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden spiral
    const rr = 0.6 + clamp01(((lat[i] ?? 0) + 1) / 2) * 0.5;
    const p = project(
      Math.sin(phi) * Math.cos(theta) * rr,
      Math.cos(phi) * rr,
      Math.sin(phi) * Math.sin(theta) * rr,
      ang,
      cx,
      cy,
      scale,
    );
    const near = (p.d + 1) / 2;
    spark(ctx, p.x, p.y, 1.6 + near * 3.4, '185,140,255', 0.2 + near * 0.5);
  }
};
const drawLatentNorm: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'WORLD · ENERGY');
  let e = 0;
  for (let i = 0; i < s.latent.length; i++) e += (s.latent[i] ?? 0) ** 2;
  e = Math.sqrt(e / Math.max(1, s.latent.length));
  H.push('lnorm', e);
  trail(ctx, H.series('lnorm'), H.head, 6, 16, w - 6, h - 8, 0, 1, '108,223,255');
  ctx.fillStyle = PAL.cyan;
  lab(ctx, w, 7);
  ctx.textAlign = 'right';
  ctx.fillText('‖latent‖ ' + e.toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
};
const drawPerceptRadar: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · PERCEPT');
  const k = s.consciousness;
  const vals = [
    clamp01(k.reasoning ?? 0),
    clamp01(k.novelty ?? 0),
    clamp01((k.feeling ?? 0) * 0.5 + 0.5),
    clamp01(k.selfAware ?? 0),
    clamp01(s.emotion.arousal ?? 0),
    clamp01(k.surprise ?? 0),
  ];
  const n = vals.length;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.38;
  ctx.strokeStyle = PAL.grid;
  for (let g = 1; g <= 2; g++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = (R * g) / 2;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = R * (0.1 + (vals[i % n] ?? 0) * 0.9) * (0.96 + Math.sin(t * 2 + i) * 0.04);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(108,223,255,.2)';
  ctx.strokeStyle = PAL.cyan;
  ctx.lineWidth = 1.3;
  ctx.fill();
  ctx.stroke();
};
const drawSensoryWheel: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'WORLD · SENSORIA');
  const lat = s.latent;
  const n = lat.length || 16;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.42;
  const spin = t * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + spin;
    const v = clamp01(((lat[i] ?? 0) + 1) / 2);
    const rr = R * (0.3 + v * 0.7);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    ctx.strokeStyle = `rgba(185,140,255,${(0.2 + v * 0.6).toFixed(2)})`;
    ctx.lineWidth = 1 + v * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    spark(ctx, x, y, 1.5 + v * 3, '185,140,255', 0.3 + v * 0.4);
  }
};

// ════════════════════ TAB II — COGNITION (9 views) ════════════════════
const drawPipeline: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · PIPELINE');
  const k = s.consciousness;
  const drive = [
    0.85,
    k.dreaming ?? 0,
    k.reasoning ?? 0,
    Math.abs(k.feeling ?? 0),
    s.emotion.dominance ?? 0.5,
  ];
  const n = 5;
  const y = h / 2 + 2;
  const x0 = 22;
  const x1 = w - 18;
  const xOf = (i: number): number => x0 + (i / (n - 1)) * (x1 - x0);
  ctx.strokeStyle = 'rgba(185,140,255,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xOf(0), y);
  ctx.lineTo(xOf(n - 1), y);
  ctx.stroke();
  spark(ctx, xOf(frac(t * 0.3) * (n - 1)), y, 5, '141,255,158', 0.6);
  for (let i = 0; i < n; i++) {
    const x = xOf(i);
    const v = clamp01(drive[i] ?? 0);
    spark(ctx, x, y, 6 + v * 7, '185,140,255', 0.15 + v * 0.4);
    ctx.fillStyle = `rgba(216,184,255,${(0.5 + v * 0.5).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.text;
    lab(ctx, w, 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(STAGE_LABELS[i] ?? '', x, y - 12);
    ctx.textBaseline = 'top';
  }
  ctx.textAlign = 'left';
};
const drawConsciousness: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · CONSCIOUS');
  const k = s.consciousness;
  const vals = [
    k.dreaming ?? 0,
    k.hallucinating ?? 0,
    k.reasoning ?? 0,
    (k.feeling ?? 0) * 0.5 + 0.5,
    k.selfAware ?? 0,
    k.novelty ?? 0,
    k.surprise ?? 0,
  ];
  const n = vals.length;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h - 14) * 0.4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const v = clamp01(vals[i] ?? 0);
    const rr = R * (0.12 + v * 0.88) * (0.94 + Math.sin(t * 2.4 + i) * 0.06);
    const tipX = cx + Math.cos(a) * rr;
    const tipY = cy + Math.sin(a) * rr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - 0.18) * rr * 0.4, cy + Math.sin(a - 0.18) * rr * 0.4);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(cx + Math.cos(a + 0.18) * rr * 0.4, cy + Math.sin(a + 0.18) * rr * 0.4);
    ctx.closePath();
    ctx.fillStyle = `rgba(185,140,255,${(0.18 + v * 0.5).toFixed(2)})`;
    ctx.strokeStyle = `rgba(216,184,255,${(0.4 + v * 0.5).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.dim;
    lab(ctx, w, 5.8);
    ctx.textAlign = Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center';
    ctx.textBaseline = Math.sin(a) > 0.3 ? 'top' : 'bottom';
    ctx.fillText(CONS_LABELS[i] ?? '', cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7));
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};
const drawEmotionCube: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · EMOTION');
  const cx = w / 2;
  const cy = h / 2 + 4;
  const scale = Math.min(w, h) * 0.32;
  const ang = t * 0.35;
  const corners: P3[] = [];
  for (let i = 0; i < 8; i++)
    corners.push(project(i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, ang, cx, cy, scale));
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 4],
    [1, 3],
    [1, 5],
    [2, 3],
    [2, 6],
    [3, 7],
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7],
  ];
  ctx.strokeStyle = 'rgba(74,52,112,.85)';
  ctx.lineWidth = 1;
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(corners[a]!.x, corners[a]!.y);
    ctx.lineTo(corners[b]!.x, corners[b]!.y);
    ctx.stroke();
  }
  const pt = project(
    clampS(s.emotion.valence ?? 0),
    (s.emotion.arousal ?? 0) * 2 - 1,
    (s.emotion.dominance ?? 0.5) * 2 - 1,
    ang,
    cx,
    cy,
    scale,
  );
  const ctr = project(0, 0, 0, ang, cx, cy, scale);
  ctx.strokeStyle = 'rgba(255,209,102,.7)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(ctr.x, ctr.y);
  ctx.lineTo(pt.x, pt.y);
  ctx.stroke();
  spark(ctx, pt.x, pt.y, 6 + Math.abs(Math.sin(t * 2.5)) * 3, '255,209,102', 0.8);
};
const drawTreeOfThought: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · TREE-OF-THOUGHT');
  const depth = Math.max(1, Math.min(5, s.depths || 3));
  const variants = Math.max(1, Math.min(4, s.variants || 3));
  const rootX = w / 2;
  const rootY = h - 12;
  const levelH = (h - 24) / depth;
  const draw = (x: number, y: number, d: number, spread: number): void => {
    if (d >= depth) return;
    for (let v = 0; v < variants; v++) {
      const nx = x + (v - (variants - 1) / 2) * spread;
      const ny = y - levelH;
      const lit = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + d * 1.3 + v));
      ctx.strokeStyle = `rgba(185,140,255,${lit.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      spark(ctx, nx, ny, 2 + lit * 3, '185,140,255', 0.3 + lit * 0.3);
      draw(nx, ny, d + 1, spread * 0.52);
    }
  };
  draw(rootX, rootY, 0, w * 0.3);
  spark(ctx, rootX, rootY, 4, '141,255,158', 0.7);
  ctx.fillStyle = PAL.gold;
  lab(ctx, w, 6.5);
  ctx.textAlign = 'right';
  ctx.fillText(`${depth}d × ${variants}v`, w - 5, 5);
  ctx.textAlign = 'left';
};
const drawFreeEnergy: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'COG · FREE ENERGY');
  // REAL faculty: the Active-Inference free-energy core (Friston FEP). The belief over the 8 latent
  // situations (lit = the one it thinks it's in), plus the variational free energy F it minimises and
  // the Bayesian surprise, as temporal trails.
  const a = s.aif;
  const post = a?.posterior ?? [];
  const n = post.length || 8;
  const bw = (w - 10) / n;
  const top = 17;
  const bandH = (h - top - 16) * 0.5;
  let mx = 1e-6;
  for (let i = 0; i < n; i++) mx = Math.max(mx, post[i] ?? 0);
  for (let i = 0; i < n; i++) {
    const v = (post[i] ?? 0) / mx;
    const lit = i === (a?.belief ?? -1);
    ctx.fillStyle = lit
      ? 'rgba(141,255,158,.9)'
      : `rgba(108,223,255,${(0.3 + v * 0.5).toFixed(2)})`;
    ctx.fillRect(5 + i * bw + 0.5, top + bandH - v * bandH, Math.max(0.8, bw - 1), v * bandH);
  }
  H.push('aifF', clamp01((a?.freeEnergy ?? 0) / 6));
  H.push('aifS', clamp01((a?.surprise ?? 0) / 6));
  const ty0 = top + bandH + 4;
  trail(ctx, H.series('aifF'), H.head, 6, ty0, w - 6, h - 4, 0, 1, '185,140,255');
  trail(ctx, H.series('aifS'), H.head, 6, ty0, w - 6, h - 4, 0, 1, '255,106,176');
  ctx.fillStyle = PAL.violet;
  lab(ctx, w, 6.5);
  ctx.fillText('F ' + (a?.freeEnergy ?? 0).toFixed(2), 6, 5);
  ctx.fillStyle = PAL.green;
  ctx.textAlign = 'right';
  ctx.fillText('epi ' + (a?.epistemic ?? 0).toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
};
const drawCriticality: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'COG · CRITICALITY');
  // REAL faculty: the self-organised-criticality homeostat. The branching ratio σ̂ tracked against the
  // critical line σ=1 (the edge of chaos), coloured by proximity; the susceptibility bar peaks there.
  const c = s.criticality;
  const sigma = c?.branching ?? 1;
  const prox = clamp01(c?.proximity ?? 0);
  const rgb = prox > 0.6 ? '141,255,158' : prox > 0.3 ? '255,209,102' : '255,90,107';
  const y1 = h - 14;
  H.push('crit', clamp01(sigma / 2)); // σ∈[0,2] → 0..1, so the critical σ=1 sits at 0.5
  // the critical line σ=1 (a faint guide the trail should hug)
  const yc = y1 - 0.5 * (y1 - 16);
  ctx.strokeStyle = 'rgba(205,182,255,.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, yc);
  ctx.lineTo(w - 6, yc);
  ctx.stroke();
  trail(ctx, H.series('crit'), H.head, 6, 16, w - 6, y1, 0, 1, rgb);
  const susc = clamp01(c?.susceptibility ?? 0);
  ctx.fillStyle = `rgba(${rgb},.8)`;
  ctx.fillRect(6, h - 9, (w - 12) * susc, 4);
  ctx.fillStyle = `rgba(${rgb},1)`;
  lab(ctx, w, 6.5);
  ctx.fillText('σ ' + sigma.toFixed(2), 6, 5);
  ctx.fillStyle = PAL.dim;
  ctx.textAlign = 'right';
  ctx.fillText('g ' + (c?.gain ?? 1).toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
};
const drawDriveVectors: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · DRIVES');
  const k = s.consciousness;
  const drives: [string, number, string][] = [
    ['DREAM', k.dreaming ?? 0, '185,140,255'],
    ['REASON', k.reasoning ?? 0, '108,223,255'],
    ['NOVEL', k.novelty ?? 0, '141,255,158'],
    ['SELF', k.selfAware ?? 0, '255,209,102'],
  ];
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.4;
  for (let i = 0; i < drives.length; i++) {
    const [name, v, rgb] = drives[i]!;
    const a = (i / drives.length) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 0.6) * 0.05;
    const rr = R * clamp01(v);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    ctx.strokeStyle = `rgba(${rgb},.8)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    spark(ctx, x, y, 2 + clamp01(v) * 4, rgb, 0.5);
    ctx.fillStyle = `rgba(${rgb},.9)`;
    lab(ctx, w, 5.6);
    ctx.textAlign = 'center';
    ctx.fillText(name, cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
  }
  ctx.textAlign = 'left';
};
const drawSelfGauge: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'COG · SELF-AWARE');
  const v = clamp01(s.consciousness.selfAware ?? 0);
  const cx = w / 2;
  const cy = h / 2 + 10;
  const R = Math.min(w, h) * 0.4;
  ctx.strokeStyle = PAL.grid;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,209,102,${(0.5 + v * 0.5).toFixed(2)})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * v);
  ctx.stroke();
  spark(
    ctx,
    cx,
    cy,
    R * (0.4 + v * 0.5) * (0.95 + Math.sin(t * 2) * 0.05),
    '255,209,102',
    0.1 + v * 0.3,
  );
  ctx.fillStyle = PAL.gold;
  lab(ctx, w, 9, '600 ');
  ctx.textAlign = 'center';
  ctx.fillText(v.toFixed(2), cx, cy - 4);
  ctx.textAlign = 'left';
};
const drawInstinct: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'COG · INSTINCT');
  // REAL port: the Hopfield/Ising spin-glass instinct (ported tsotchke/spin_based_neural_network).
  // The ±1 lattice (up = lit), the archetype it RECALLED + its overlap (confidence), the energy
  // descent into the attractor, and the net magnetization — physics doing associative memory.
  const sp = s.spin;
  const spins = sp?.spins ?? [];
  const n = spins.length || 1;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const gx = 6;
  const gy = 16;
  const cw = (w - 12) / cols;
  const chh = (h * 0.5) / rows;
  for (let i = 0; i < n; i++) {
    const up = (spins[i] ?? 0) >= 0;
    const xx = gx + (i % cols) * cw;
    const yy = gy + Math.floor(i / cols) * chh;
    ctx.fillStyle = up ? 'rgba(141,255,158,.85)' : 'rgba(40,24,60,.85)';
    ctx.fillRect(xx + 0.5, yy + 0.5, Math.max(1, cw - 1), Math.max(1, chh - 1));
  }
  const ov = clamp01(sp?.bestOverlap ?? 0);
  H.push('spinE', clamp01(((sp?.energy ?? 0) + 2) / 4)); // energy descent trail (re-centred)
  trail(ctx, H.series('spinE'), H.head, 6, h - 14, w - 6, h - 4, 0, 1, '255,106,176');
  ctx.fillStyle = PAL.green;
  lab(ctx, w, 6.5);
  ctx.fillText('#' + (sp?.bestPattern ?? -1) + ' ' + (ov * 100).toFixed(0) + '%', 6, 5);
  ctx.fillStyle = PAL.dim;
  ctx.textAlign = 'right';
  ctx.fillText('m ' + (sp?.magnetization ?? 0).toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
};

// ════════════════════ TAB III — QUANTUM (9 views) ════════════════════
const drawQuantumCrown: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'Q · CROWN');
  const q = s.quantum;
  const n = q.length || 10;
  const cx = w / 2;
  const cy = h / 2 + 6;
  const scale = Math.min(w, h) * 0.38;
  const ang = t * 0.45;
  type Spike = { base: P3; tip: P3; v: number; i: number };
  const spikes: Spike[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const v = clamp01(q[i] ?? 0);
    spikes.push({
      base: project(Math.cos(a) * 0.85, -0.2, Math.sin(a) * 0.85, ang, cx, cy, scale),
      tip: project(Math.cos(a) * 0.85, -0.2 + v * 1.3, Math.sin(a) * 0.85, ang, cx, cy, scale),
      v,
      i,
    });
  }
  for (const sp of spikes.slice().sort((a, b) => a.base.d - b.base.d)) {
    ctx.strokeStyle = `rgba(185,140,255,${(0.3 + sp.v * 0.6).toFixed(2)})`;
    ctx.lineWidth = 1 + sp.v * 2;
    ctx.beginPath();
    ctx.moveTo(sp.base.x, sp.base.y);
    ctx.lineTo(sp.tip.x, sp.tip.y);
    ctx.stroke();
    spark(ctx, sp.tip.x, sp.tip.y, 1.6 + sp.v * 5, '185,140,255', 0.2 + sp.v * 0.6);
    if ((sp.base.d + 1) / 2 > 0.34) {
      ctx.fillStyle = PAL.dim;
      lab(ctx, w, 5.6);
      ctx.textAlign = 'center';
      ctx.fillText(Q_LABELS[sp.i] ?? '', sp.tip.x, sp.tip.y - 6);
    }
  }
  ctx.textAlign = 'left';
};
const drawAmplitudes: Drawer = (ctx, w, h, s) => {
  frame(ctx, w, h, 'Q · STATEVECTOR');
  // REAL register: the 2ⁿ Born probabilities, each bar HUE-coded by its amplitude phase.
  const probs = s.qubits?.probs ?? [];
  const phase = s.qubits?.phase ?? [];
  const n = probs.length || 1;
  const x0 = 5;
  const bw = (w - 10) / n;
  const base = h - 9;
  let mx = 1e-6;
  for (let i = 0; i < n; i++) mx = Math.max(mx, probs[i] ?? 0);
  for (let i = 0; i < n; i++) {
    const v = (probs[i] ?? 0) / mx;
    const hue = (((phase[i] ?? 0) + Math.PI) / (2 * Math.PI)) * 360; // phase → hue
    ctx.fillStyle = `hsl(${hue.toFixed(0)},85%,${(40 + v * 25).toFixed(0)}%)`;
    ctx.fillRect(x0 + i * bw, base - v * (h - 24), Math.max(0.6, bw - 0.5), v * (h - 24));
  }
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 6);
  ctx.textAlign = 'right';
  ctx.fillText(`|ψ|² · ${n} basis · ${s.qubits?.qubits ?? 0}q`, w - 5, 5);
  ctx.textAlign = 'left';
};
const drawGeometry: Drawer = (ctx, w, h, s, t, H) => {
  frame(ctx, w, h, 'Q · GEOMETRY');
  // REAL port: the Quantum Geometric Tensor of the mind's OWN circuit (ported QGTL / Moonlab qgt.c) —
  // the 2×2 Fubini–Study metric over the (superposition, entanglement) drives. Its eigen-ellipse shows
  // how the thought-space stretches; det = curvature, trace = scalar "speed", Ω = Berry phase.
  const g = s.qubits?.geometry;
  const m00 = g?.metric[0] ?? 0;
  const m01 = g?.metric[1] ?? 0;
  const m11 = g?.metric[3] ?? 0;
  const tr = m00 + m11;
  const det = m00 * m11 - m01 * m01;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  const l1 = tr / 2 + disc; // major eigenvalue of the metric
  const l2 = Math.max(0, tr / 2 - disc); // minor (clamp tiny negatives from FD noise)
  const ang = 0.5 * Math.atan2(2 * m01, m00 - m11);
  const cx = w / 2;
  const cy = h / 2 + 4;
  const rad = Math.min(w, h) * 0.34;
  const a1 = Math.sqrt(Math.max(1e-9, l1));
  const a2 = Math.sqrt(Math.max(1e-9, l2));
  const mxA = Math.max(a1, a2) || 1;
  ctx.strokeStyle = PAL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - rad, cy);
  ctx.lineTo(cx + rad, cy);
  ctx.moveTo(cx, cy - rad);
  ctx.lineTo(cx, cy + rad);
  ctx.stroke();
  const hue = (g?.berry ?? 0) >= 0 ? '185,140,255' : '255,106,176'; // Berry sign → hue
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang + t * 0.25); // slow precession so the curvature is alive
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    Math.max(1, (a1 / mxA) * rad),
    Math.max(1, (a2 / mxA) * rad),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = `rgba(${hue},.16)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${hue},.85)`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  H.push('qgeoS', clamp01(tr / 4)); // trace ("speed") temporal trail along the bottom
  trail(ctx, H.series('qgeoS'), H.head, 6, h - 14, w - 6, h - 4, 0, 1, '108,223,255');
  ctx.fillStyle = PAL.violet;
  lab(ctx, w, 6.5);
  ctx.fillText('S ' + tr.toFixed(2), 6, 5);
  ctx.fillStyle = PAL.gold;
  ctx.textAlign = 'right';
  ctx.fillText('κ ' + det.toFixed(3), w - 5, 5);
  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.mag;
  ctx.fillText('Ω ' + (g?.berry ?? 0).toFixed(3), 6, h - 22);
};
const drawEshkol: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'Q · ESHKOL RNG');
  // REAL port: the Eshkol qubit-RNG the mind COLLAPSES its thoughts through (ported tsotchke/quantum_rng).
  // The 8 qubit amplitudes (phase array), the live 64-bit output word, and the buffer's entropy estimate.
  const e = s.eshkol;
  const amps = e?.amplitudes ?? [];
  const bits = e?.lastBits ?? '';
  const hh = clamp01(e?.entropyEstimate ?? 0);
  const n = amps.length || 8;
  const bw = (w - 12) / n;
  const base = h * 0.6;
  for (let i = 0; i < n; i++) {
    const v = clamp01((amps[i] ?? 0) * 2); // each amplitude ∈ [0, 0.5]
    ctx.fillStyle = `rgba(108,223,255,${(0.35 + v * 0.5).toFixed(2)})`;
    ctx.fillRect(6 + i * bw + 0.5, base - v * (h * 0.36), Math.max(0.8, bw - 1), v * (h * 0.36));
  }
  const m = bits.length || 64;
  const tw = (w - 12) / m;
  for (let i = 0; i < m; i++) {
    if (bits[i] === '1') {
      ctx.fillStyle = 'rgba(141,255,158,.85)';
      ctx.fillRect(6 + i * tw, base + 4, Math.max(0.6, tw - 0.3), 5);
    }
  }
  H.push('eshH', hh);
  trail(ctx, H.series('eshH'), H.head, 6, h - 14, w - 6, h - 4, 0, 1, '255,209,102');
  ctx.fillStyle = PAL.gold;
  lab(ctx, w, 6.5);
  ctx.fillText('H ' + hh.toFixed(3), 6, 5);
  ctx.fillStyle = PAL.dim;
  ctx.textAlign = 'right';
  ctx.fillText((e?.draws ?? 0) + ' draws', w - 5, 5);
  ctx.textAlign = 'left';
};
const drawEntangleWeb: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'Q · ENTANGLE');
  // REAL register: the n qubits as nodes (size = P(|1⟩)); web density scales with the live
  // entanglement metric (mean reduced-state purity deficit).
  const p1 = s.qubits?.p1 ?? [];
  const ent = clamp01(s.qubits?.entanglement ?? 0);
  const n = p1.length || 6;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.4;
  const pts: { x: number; y: number; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.3;
    const v = clamp01(p1[i] ?? 0);
    pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, v });
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const strength = (0.4 + (pts[i]!.v + pts[j]!.v) * 0.3) * ent;
      if (strength < 0.12) continue;
      ctx.strokeStyle = `rgba(185,140,255,${(strength * 0.7).toFixed(2)})`;
      ctx.lineWidth = 0.5 + strength * 1.8;
      ctx.beginPath();
      ctx.moveTo(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(pts[j]!.x, pts[j]!.y);
      ctx.stroke();
    }
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 6);
  ctx.textAlign = 'right';
  ctx.fillText('E ' + ent.toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
  for (const p of pts) spark(ctx, p.x, p.y, 1.6 + p.v * 4, '108,223,255', 0.3 + p.v * 0.4);
};
const drawSuperposWheel: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'Q · SUPERPOSITION');
  // REAL register: each qubit's P(|1⟩) as radius (centre = |0⟩, rim = |1⟩); the ring brightness is
  // the live coherence (mean equatorial Bloch magnitude).
  const p1 = s.qubits?.p1 ?? [];
  const coh = clamp01(s.qubits?.coherence ?? 0);
  const n = p1.length || 6;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.42;
  const spin = t * 0.7;
  ctx.strokeStyle = `rgba(108,223,255,${(0.12 + coh * 0.6).toFixed(2)})`;
  ctx.lineWidth = 1 + coh * 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + spin;
    const v = clamp01(p1[i] ?? 0);
    const rr = R * (0.15 + v * 0.85);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    ctx.strokeStyle = `rgba(185,140,255,${(0.2 + v * 0.4).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    spark(ctx, x, y, 2 + v * 4, '185,140,255', 0.3 + v * 0.5);
  }
};
const drawQEntropy: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'Q · ENTROPY');
  // REAL register: normalized Shannon entropy of the Born distribution (1 = uniform superposition).
  const ent = clamp01(s.qubits?.entropy ?? 0);
  const coh = clamp01(s.qubits?.coherence ?? 0);
  H.push('qent', ent);
  H.push('qcoh', coh);
  trail(ctx, H.series('qent'), H.head, 6, 16, w - 6, h - 8, 0, 1, '185,140,255');
  trail(ctx, H.series('qcoh'), H.head, 6, 16, w - 6, h - 8, 0, 1, '108,223,255');
  ctx.fillStyle = PAL.violet;
  lab(ctx, w, 6.5);
  ctx.fillText('S ' + ent.toFixed(2), 6, 5);
  ctx.fillStyle = PAL.cyan;
  ctx.textAlign = 'right';
  ctx.fillText('coh ' + coh.toFixed(2), w - 5, 5);
  ctx.textAlign = 'left';
};
const drawCollapse: Drawer = (ctx, w, h, s, _t, H) => {
  frame(ctx, w, h, 'Q · COLLAPSE');
  // REAL register: the Born-sampled basis state this beat (the "collapsed thought"), as a temporal
  // raster — each column a past beat, the lit row the basis index it sampled.
  const qb = s.qubits;
  const sampled = qb?.sampled ?? 0;
  const dim = Math.max(1, qb?.dim ?? 64);
  H.push('coll', sampled);
  const cols = HCAP;
  const cw = (w - 8) / cols;
  const rows = Math.min(dim, 32);
  const rh = (h - 18) / rows;
  const ser = H.series('coll');
  for (let c = 0; c < cols; c++) {
    const idx = (H.head + 1 + c) % cols;
    const row = Math.round(((ser[idx] ?? 0) / Math.max(1, dim - 1)) * (rows - 1));
    const fade = c / cols;
    ctx.fillStyle = `rgba(141,255,158,${(0.12 + fade * 0.65).toFixed(2)})`;
    ctx.fillRect(4 + c * cw, 16 + row * rh, cw + 0.6, Math.max(1, rh - 0.5));
  }
  ctx.fillStyle = PAL.green;
  lab(ctx, w, 6.5);
  ctx.textAlign = 'right';
  ctx.fillText('|' + (qb?.sampledBits ?? '') + '⟩', w - 5, 5);
  ctx.textAlign = 'left';
};
const drawBloch: Drawer = (ctx, w, h, s, t) => {
  frame(ctx, w, h, 'Q · STATE SPHERE');
  const cx = w / 2;
  const cy = h / 2 + 4;
  const scale = Math.min(w, h) * 0.36;
  const ang = t * 0.4;
  // three rings of the sphere
  for (let r = 0; r < 3; r++) {
    ctx.strokeStyle = `rgba(74,52,112,.7)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const p =
        r === 0
          ? project(Math.cos(a), Math.sin(a), 0, ang, cx, cy, scale)
          : r === 1
            ? project(Math.cos(a), 0, Math.sin(a), ang, cx, cy, scale)
            : project(0, Math.cos(a), Math.sin(a), ang, cx, cy, scale);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // REAL register: every qubit's Bloch vector from its reduced density matrix (z = computational
  // axis → screen up). A short vector = mixed/entangled; a long one near the equator = live
  // superposition. Each qubit gets its own hue.
  const bloch = s.qubits?.bloch ?? [];
  const ctr = project(0, 0, 0, ang, cx, cy, scale);
  const cols = [
    '141,255,158',
    '108,223,255',
    '185,140,255',
    '255,209,102',
    '255,106,176',
    '255,90,107',
  ];
  for (let i = 0; i < bloch.length; i++) {
    const b = bloch[i]!;
    const p = project(b.x, b.z, b.y, ang, cx, cy, scale);
    const rgb = cols[i % cols.length]!;
    ctx.strokeStyle = `rgba(${rgb},.85)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ctr.x, ctr.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    spark(ctx, p.x, p.y, 2 + clamp01(b.r ?? 0) * 4, rgb, 0.7);
  }
  ctx.fillStyle = PAL.dim;
  lab(ctx, w, 6);
  ctx.textAlign = 'right';
  ctx.fillText(`${bloch.length} qubits`, w - 5, 5);
  ctx.textAlign = 'left';
};

// ════════════════════ TAB IV — BRAIN (1 large connectome) ════════════════════
const BRAIN_NODES = [
  'CORTEX',
  'IMAGITRON',
  'PERCEPTOR',
  'REASONER',
  'AFFECT',
  'QUANTUM',
  'MEMORY',
  'DRIVE',
  'SELF',
] as const;
const BRAIN_HUES = [200, 280, 45, 120, 330, 170, 260, 15, 300];
const drawBrain: Drawer = (ctx, w, h, s, t) => {
  ctx.fillStyle = '#03010a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#00ffd5';
  lab(ctx, w, 9, '600 ');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`IV · BRAIN — composite connectome · ${s.paramCount}p · ${s.organs} organs`, 8, 6);
  const cx = w / 2;
  const cy = h / 2 + 8;
  const scale = Math.min(w, h) * 0.38;
  const ang = t * 0.25;
  const k = s.consciousness;
  const act = [
    avg(s.latent.length ? Array.from(s.latent, (v) => Math.abs(v)) : [0.5]),
    clamp01(k.dreaming ?? 0),
    clamp01(k.novelty ?? 0),
    clamp01(k.reasoning ?? 0),
    clamp01((k.feeling ?? 0) * 0.5 + 0.5),
    avg(s.quantum.length ? s.quantum : [0.5]),
    clamp01(k.hallucinating ?? 0),
    clamp01(s.emotion.dominance ?? 0.5),
    clamp01(k.selfAware ?? 0),
  ];
  const n = BRAIN_NODES.length;
  const pts: P3[] = [];
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pts.push(
      project(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
        ang,
        cx,
        cy,
        scale,
      ),
    );
  }
  const pulse = frac(t * 0.4);
  const glob = 0.3 * (k.selfAware ?? 0) + 0.25 * (k.reasoning ?? 0) + 0.2 * (k.novelty ?? 0);
  if (glob > 0.35) {
    const wave = frac(t * 0.65);
    const r = scale * (0.15 + wave * 0.8);
    ctx.strokeStyle = `hsla(170,100%,55%,${(glob * (1 - wave) * 0.45).toFixed(2)})`;
    ctx.lineWidth = 1 + glob * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const strength = (act[i]! + act[j]!) * 0.5;
      if (strength < 0.08) continue;
      const near = ((pts[i]!.d + pts[j]!.d) / 2 + 1) / 2;
      const hue = (BRAIN_HUES[i]! + BRAIN_HUES[j]!) / 2;
      ctx.strokeStyle = `hsla(${hue},100%,${(48 + strength * 32).toFixed(0)}%,${(strength * 0.55 * near).toFixed(2)})`;
      ctx.lineWidth = 0.7 + strength * 2.2 * near;
      ctx.beginPath();
      ctx.moveTo(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(pts[j]!.x, pts[j]!.y);
      ctx.stroke();
      const pp = (pulse + (i + j) * 0.11) % 1;
      const px = pts[i]!.x + (pts[j]!.x - pts[i]!.x) * pp;
      const py = pts[i]!.y + (pts[j]!.y - pts[i]!.y) * pp;
      spark(ctx, px, py, 1.5 + strength * 3, `${hue},255,200`, strength * 0.65 * near);
    }
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const v = clamp01(act[i] ?? 0);
    const near = (p.d + 1) / 2;
    const hue = (BRAIN_HUES[i]! + v * 40 + t * 12) % 360;
    for (let m = 0; m < 4; m++) {
      const ma = t * (1.2 + m * 0.3) + i * 0.9;
      const mr = 8 + m * 5 + v * 6;
      const sx = p.x + Math.cos(ma) * mr * near;
      const sy = p.y + Math.sin(ma) * mr * near * 0.7;
      ctx.fillStyle = `hsla(${hue},95%,${(55 + v * 25).toFixed(0)}%,${(0.25 + v * 0.35).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + v * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    spark(ctx, p.x, p.y, 6 + v * 14 * near, `${hue},255,180`, 0.3 + v * 0.45);
    ctx.fillStyle = `hsla(${hue},100%,${(42 + v * 38).toFixed(0)}%,${(0.65 + v * 0.35).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8 + v * 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (v > 0.45 && near > 0.3) {
      spark(ctx, p.x, p.y, 10 + v * 18 * near, `${hue},255,160`, 0.35 + v * 0.4);
    }
    if (near > 0.36) {
      ctx.fillStyle = `hsla(${hue},90%,80%,0.9)`;
      lab(ctx, w, 7);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(BRAIN_NODES[i] ?? '', p.x, p.y - 8);
      ctx.textBaseline = 'top';
    }
  }
  ctx.textAlign = 'left';
  // Secondary glomerular ring — 36 micro-satellite nodes between organ hubs.
  for (let g = 0; g < 36; g++) {
    const ga = (g / 36) * Math.PI * 2 + ang * 0.4;
    const gb = Math.sin(t * 2.1 + g * 0.37) * 0.5 + 0.5;
    const gr = scale * (0.55 + gb * 0.22);
    const gx = cx + Math.cos(ga) * gr;
    const gy = cy + Math.sin(ga) * gr * 0.72;
    const gh = (BRAIN_HUES[g % n]! + t * 40 + gb * 80) % 360;
    ctx.fillStyle = `hsla(${gh},100%,${(38 + gb * 42).toFixed(0)}%,${(0.35 + gb * 0.45).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(gx, gy, 1.2 + gb * 2.8, 0, Math.PI * 2);
    ctx.fill();
    if (gb > 0.55) spark(ctx, gx, gy, 3 + gb * 6, `${gh},255,180`, gb * 0.5);
  }
};

/** 4D hyper-grid neuron projected through a rotating w-axis slice — MEGA GODLIKE mode. */
const MEGA_N = 420;
/** The static (i,j) axon pairs drawMegaBrain connects: the ~22k of the 88k pairs whose 4D-Hamming filter
 * `((i^j)&15) ∈ {1,2,3,4}` passes. Precomputed once so the per-frame pass iterates only real candidates
 * instead of the full O(MEGA_N²) double loop with a per-pair skip. Packed [i,j,i,j,…], i<j ascending —
 * same pairs in the same order the old loop drew, so the render is byte-identical. */
const MEGA_PAIRS: Uint16Array = (() => {
  const out: number[] = [];
  for (let i = 0; i < MEGA_N; i++) {
    for (let j = i + 1; j < MEGA_N; j++) {
      const d4 = (i ^ j) & 15;
      if (d4 >= 1 && d4 <= 4) out.push(i, j);
    }
  }
  return Uint16Array.from(out);
})();
/** Per-neuron spike-train history (ring buffer of binary spikes). */
const SPIKE_HIST = 24;
const spikeBuf: Float32Array[] = Array.from({ length: MEGA_N }, () => new Float32Array(SPIKE_HIST));
let spikeHead = 0;
/** Cortical layers — neurons assigned to frequency bands by index range. */
const LAYERS = 5; // delta, theta, alpha, beta, gamma
const LAYER_HUES = [220, 260, 30, 0, 330]; // blue, purple, amber, red, magenta
const LAYER_NAMES = ['δ delta', 'θ theta', 'α alpha', 'β beta', 'γ gamma'];
function layerOf(i: number): number {
  return Math.floor((i / MEGA_N) * LAYERS);
}
/** 4D→3D stereographic-style projection: rotate in the x-w and y-w planes, then project. */
function project4(
  x: number,
  y: number,
  z: number,
  w: number,
  aXW: number,
  aYW: number,
  aXY: number,
  cx: number,
  cy: number,
  scale: number,
): P3 {
  const cxw = Math.cos(aXW),
    sxw = Math.sin(aXW);
  const cyw = Math.cos(aYW),
    syw = Math.sin(aYW);
  const cxy = Math.cos(aXY),
    sxy = Math.sin(aXY);
  // rotate x-w
  let x1 = x * cxw - w * sxw;
  let w1 = x * sxw + w * cxw;
  // rotate y-w
  let y1 = y * cyw - w1 * syw;
  let w2 = y * syw + w1 * cyw;
  // rotate x-y
  let x2 = x1 * cxy - y1 * sxy;
  let y2 = x1 * sxy + y1 * cxy;
  // perspective through w2
  const k = 1 / (1 - w2 * 0.18);
  const rx = x2 * k;
  const ry = y2 * k;
  const rz = z * k;
  // 3D tilt + project
  return project(rx, ry, rz, 0, cx, cy, scale);
}
const TESS_VERTS: readonly (readonly [number, number, number, number])[] = [
  [-1, -1, -1, -1],
  [1, -1, -1, -1],
  [-1, 1, -1, -1],
  [1, 1, -1, -1],
  [-1, -1, 1, -1],
  [1, -1, 1, -1],
  [-1, 1, 1, -1],
  [1, 1, 1, -1],
  [-1, -1, -1, 1],
  [1, -1, -1, 1],
  [-1, 1, -1, 1],
  [1, 1, -1, 1],
  [-1, -1, 1, 1],
  [1, -1, 1, 1],
  [-1, 1, 1, 1],
  [1, 1, 1, 1],
];
const TESS_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
  [8, 9],
  [8, 10],
  [9, 11],
  [10, 11],
  [8, 12],
  [9, 13],
  [10, 14],
  [11, 15],
  [12, 13],
  [12, 14],
  [13, 15],
  [14, 15],
  [0, 8],
  [1, 9],
  [2, 10],
  [3, 11],
  [4, 12],
  [5, 13],
  [6, 14],
  [7, 15],
];
const DEFAULT_SIGNAL = new Float32Array([0.5]);
const drawMegaBrain: Drawer = (ctx, w, h, s, t) => {
  ctx.fillStyle = '#03010a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#00ffd5';
  lab(ctx, w, 9, '600 ');
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(
    `IV · MEGA GODLIKE BRAIN — 4D tesseract · ${s.paramCount}p · ${s.organs} organs · ${LAYERS} layers`,
    8,
    6,
  );
  const cx = w / 2;
  const cy = h / 2 + 10;
  const scale = Math.min(w, h) * 0.48;
  const axw = t * 0.18;
  const ayw = t * 0.13;
  const axy = t * 0.09;
  const latent = s.latent.length ? s.latent : DEFAULT_SIGNAL;
  const quantum = s.quantum.length ? s.quantum : DEFAULT_SIGNAL;
  const k = s.consciousness;
  const glob =
    0.25 * (k.dreaming ?? 0) +
    0.25 * (k.reasoning ?? 0) +
    0.2 * (k.selfAware ?? 0) +
    0.15 * (k.novelty ?? 0) +
    0.15 * (s.emotion.dominance ?? 0.5);

  // 1) Draw the 4D tesseract skeleton (the spacetime scaffolding of the brain).
  const tpts: P3[] = [];
  for (const v of TESS_VERTS) {
    tpts.push(
      project4(v[0] * 0.78, v[1] * 0.78, v[2] * 0.78, v[3] * 0.78, axw, ayw, axy, cx, cy, scale),
    );
  }
  ctx.strokeStyle = 'hsla(220,90%,55%,0.22)';
  ctx.lineWidth = 1;
  for (const [i, j] of TESS_EDGES) {
    const a = tpts[i]!;
    const b = tpts[j]!;
    if (a.d < -0.95 || b.d < -0.95) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // 2) Neural somas on a 4D hypersphere, assigned to cortical frequency layers.
  const pts: P3[] = [];
  const act: number[] = [];
  const organ: number[] = [];
  const layer: number[] = [];
  for (let i = 0; i < MEGA_N; i++) {
    const u = (i + 0.5) / MEGA_N;
    const v = frac(i * 0.6180339887);
    const th = 2 * Math.PI * u;
    const ph = Math.acos(2 * v - 1);
    const r4 = 0.58 + 0.42 * Math.sin(i * 0.17 + t * 1.3);
    const x4 = r4 * Math.sin(ph) * Math.cos(th);
    const y4 = r4 * Math.sin(ph) * Math.sin(th);
    const z4 = r4 * Math.cos(ph);
    const w4 = r4 * Math.sin(t * 0.41 + i * 0.08);
    pts.push(project4(x4, y4, z4, w4, axw, ayw, axy, cx, cy, scale));
    const lv = Math.abs(latent[i % latent.length] ?? 0);
    const qv = Math.abs(quantum[i % quantum.length] ?? 0);
    const li = layerOf(i);
    layer.push(li);
    // layer-specific frequency coupling: gamma fires faster, delta slower
    const freqMul = 0.5 + li * 0.35;
    const spike = Math.max(0, Math.sin(t * 6 * freqMul + i * 0.37) * 0.5 + 0.5) * (lv + qv + glob);
    const a = clamp01(lv * 0.45 + qv * 0.35 + glob * 0.3 + spike * 0.35);
    act.push(a);
    organ.push(i % s.organs);
    // write spike-train: 1 if firing, 0 if quiescent
    const buf = spikeBuf[i]!;
    buf[spikeHead] = a > 0.5 ? 1 : 0;
  }
  spikeHead = (spikeHead + 1) % SPIKE_HIST;

  // 3) Axonal connections: small-world by 4D Hamming distance, with traveling spikes.
  const pulse = frac(t * 0.55);
  for (let k = 0; k < MEGA_PAIRS.length; k += 2) {
    const i = MEGA_PAIRS[k]!;
    const j = MEGA_PAIRS[k + 1]!;
    const strength = (act[i]! + act[j]!) * 0.5;
    if (strength < 0.12) continue;
    const near = ((pts[i]!.d + pts[j]!.d) / 2 + 1) / 2;
    const li = layer[i]!;
    const lj = layer[j]!;
    const lhue = LAYER_HUES[li]!;
    const lhue2 = LAYER_HUES[lj]!;
    const hue = (lhue + lhue2) / 2 + ((t * 20) % 360);
    ctx.strokeStyle = `hsla(${hue},100%,${(46 + strength * 38).toFixed(0)}%,${(strength * 0.4 * near).toFixed(2)})`;
    ctx.lineWidth = 0.3 + strength * 1.6 * near;
    ctx.beginPath();
    ctx.moveTo(pts[i]!.x, pts[i]!.y);
    ctx.lineTo(pts[j]!.x, pts[j]!.y);
    ctx.stroke();
    // traveling pulse packet
    const pp = (pulse + (i + j) * 0.013) % 1;
    const px = pts[i]!.x + (pts[j]!.x - pts[i]!.x) * pp;
    const py = pts[i]!.y + (pts[j]!.y - pts[i]!.y) * pp;
    spark(ctx, px, py, 1.5 + strength * 3.5, `${(hue + 60) % 360},255,200`, strength * 0.7 * near);
  }

  // 4) Dendritic halo + soma core + spike-train trace for each neuron.
  for (let i = 0; i < MEGA_N; i++) {
    const p = pts[i]!;
    const v = act[i]!;
    const near = (p.d + 1) / 2;
    const li = layer[i]!;
    const baseHue = LAYER_HUES[li]!;
    const ohue = (baseHue + organ[i]! * 6 + v * 80 + t * 15) % 360;
    const sat = 85 + v * 15;
    const lit = 35 + v * 45;
    // spike-train trace: draw recent spikes as a tiny vertical bar to the right of the soma
    const buf = spikeBuf[i]!;
    if (v > 0.3) {
      const traceX = p.x + 4 + near * 3;
      ctx.strokeStyle = `hsla(${ohue},90%,60%,0.4)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(traceX, p.y - 6);
      ctx.lineTo(traceX, p.y + 6);
      ctx.stroke();
      for (let b = 0; b < SPIKE_HIST; b++) {
        const idx = (spikeHead + b) % SPIKE_HIST;
        const sv = buf[idx]!;
        if (sv > 0) {
          const by = p.y - 6 + (b / SPIKE_HIST) * 12;
          ctx.fillStyle = `hsla(${ohue},100%,70%,${(sv * (1 - b / SPIKE_HIST) * 0.8).toFixed(2)})`;
          ctx.fillRect(traceX - 1, by - 0.5, 2, 1.5);
        }
      }
    }
    // dendritic shimmer ring
    spark(ctx, p.x, p.y, 5 + v * 14 * near, `${ohue},255,180`, 0.25 + v * 0.35);
    // soma core
    ctx.fillStyle = `hsla(${ohue},${sat}%,${lit}%,${(0.55 + v * 0.45).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.3 + v * 3.2 * near, 0, Math.PI * 2);
    ctx.fill();
    // spike glow on high activity
    if (v > 0.55 && near > 0.3) {
      spark(ctx, p.x, p.y, 8 + v * 22 * near, `${ohue},255,160`, 0.4 + v * 0.45);
    }
  }

  // 5) Global broadcast wavefront when consciousness is high.
  if (glob > 0.4) {
    const wave = frac(t * 0.8);
    const r = scale * (0.2 + wave * 0.75);
    ctx.strokeStyle = `hsla(170,100%,${(50 + glob * 30).toFixed(0)}%,${(glob * (1 - wave) * 0.55).toFixed(2)})`;
    ctx.lineWidth = 1 + glob * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6) Frequency band legend (bottom-left).
  ctx.font = '8px ui-monospace, monospace';
  ctx.textBaseline = 'bottom';
  for (let l = 0; l < LAYERS; l++) {
    const lh = LAYER_HUES[l]!;
    const ly = h - 4 - (LAYERS - l) * 10;
    ctx.fillStyle = `hsl(${lh},90%,60%)`;
    ctx.fillRect(8, ly, 6, 6);
    ctx.fillStyle = `hsla(${lh},80%,70%,0.85)`;
    ctx.fillText(LAYER_NAMES[l] ?? '', 18, ly + 6);
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
};

let megaBrainMode = true;
const drawBrainRouted: Drawer = (ctx, w, h, s, t, H) => {
  if (megaBrainMode) drawMegaBrain(ctx, w, h, s, t, H);
  else drawBrain(ctx, w, h, s, t, H);
};

/** Set MEGA 4D brain mode for the neural observatory (instance-safe via setter). */
export function setMegaBrainMode(v: boolean): void {
  megaBrainMode = v;
}

export function getMegaBrainMode(): boolean {
  return megaBrainMode;
}

// ── tab → drawer assignment ──────────────────────────────────────────────────────────────────
const TABS: readonly Drawer[][] = [
  [
    drawLatentRing,
    drawLatentSpectrum,
    drawLatentHeat,
    drawImagination,
    drawNoveltyField,
    drawWorldSphere,
    drawLatentNorm,
    drawPerceptRadar,
    drawSensoryWheel,
  ],
  [
    drawPipeline,
    drawConsciousness,
    drawEmotionCube,
    drawTreeOfThought,
    drawFreeEnergy,
    drawCriticality,
    drawDriveVectors,
    drawSelfGauge,
    drawInstinct,
  ],
  [
    drawQuantumCrown,
    drawAmplitudes,
    drawGeometry,
    drawEshkol,
    drawEntangleWeb,
    drawSuperposWheel,
    drawQEntropy,
    drawCollapse,
    drawBloch,
  ],
  [drawBrainRouted],
];

/**
 * The Super Creature's neural observatory, rendered INTO a host element owned by {@link SuperPanel}
 * (so it is the SAME box). Owns a self-driven rAF loop while {@link setActive}(true).
 */
/** V123 (USER #4): per-BRUTAL-style accent (r,g,b) the NEURAL box tints toward — concrete grey ·
 *  nouveau green · rococo gold · cosmic purple · repression ash. Kept subtle so cells stay legible. */
const SNEU_BRUTAL_RGB: readonly (readonly [number, number, number])[] = [
  [150, 148, 142],
  [96, 200, 128],
  [232, 200, 112],
  [150, 84, 232],
  [116, 116, 128],
];

export class SuperNeural {
  private readonly host: HTMLElement;
  private readonly root: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly gridEl: HTMLElement;
  private readonly footEl: HTMLElement;
  private readonly tabBtns: HTMLElement[] = [];
  private readonly brainCycleBtn: HTMLButtonElement;
  private cells: HTMLElement[] = [];
  private ctxs: CanvasRenderingContext2D[] = [];
  private tab = 0;
  private active = false;
  private snap: Snap | null = null;
  private readonly hist = makeHist();
  private dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  private raf = 0;
  private frameN = 0;
  // V123: BRUTAL tint — target (from the toggle event) + eased current, applied to the box as it
  // crossfades so the NEURAL skin shifts colour WITH the creature's brutal style, gradually.
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
    const root = doc.createElement('div');
    root.className = 'cqm-sneu';
    root.innerHTML =
      `<div class="cqm-sneu-tabs" data-tabs></div><div class="cqm-sneu-grid" data-grid></div>` +
      `<div class="cqm-sneu-foot" data-foot></div>`;
    host.appendChild(root);
    this.root = root;
    // V123 (USER #4): the NEURAL box tints WITH the creature's BRUTAL style (world dispatches on toggle).
    if (typeof window !== 'undefined')
      window.addEventListener('cqm:brutal-style', this.onBrutalStyle);
    this.tabsEl = root.querySelector('[data-tabs]') as HTMLElement;
    this.gridEl = root.querySelector('[data-grid]') as HTMLElement;
    this.footEl = root.querySelector('[data-foot]') as HTMLElement;

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
    this.brainCycleBtn.textContent = getMegaBrainMode() ? '⬡ MEGA 4D' : '⟁ COMPOSITE';
    this.brainCycleBtn.classList.toggle('mega', getMegaBrainMode());
    this.brainCycleBtn.title = 'Cycle brain view: composite connectome ↔ MEGA GODLIKE 4D tesseract';
    this.brainCycleBtn.hidden = true;
    this.brainCycleBtn.addEventListener('click', () => {
      setMegaBrainMode(!getMegaBrainMode());
      this.brainCycleBtn.textContent = getMegaBrainMode() ? '⬡ MEGA 4D' : '⟁ COMPOSITE';
      this.brainCycleBtn.classList.toggle('mega', getMegaBrainMode());
    });
    this.tabsEl.appendChild(this.brainCycleBtn);
    this.buildGrid(doc);
    this.setTab(0);
  }

  private buildGrid(doc: Document): void {
    this.gridEl.innerHTML = '';
    this.cells = [];
    this.ctxs = [];
    const drawers = TABS[this.tab] ?? [];
    this.gridEl.classList.toggle('brain', this.tab === 3);
    for (let i = 0; i < drawers.length; i++) {
      const cell = doc.createElement('div');
      cell.className = 'cqm-sneu-cell';
      const cv = doc.createElement('canvas');
      cell.appendChild(cv);
      this.gridEl.appendChild(cell);
      this.cells.push(cell);
      const c = cv.getContext('2d');
      if (c) this.ctxs.push(c);
    }
  }

  setTab(i: number): void {
    this.tab = Math.max(0, Math.min(TABS.length - 1, i));
    this.tabBtns.forEach((b, k) => b.classList.toggle('on', k === this.tab));
    this.brainCycleBtn.hidden = this.tab !== 3;
    this.buildGrid(this.host.ownerDocument ?? document);
  }

  setActive(v: boolean): void {
    this.active = v;
    if (v) this.startLoop();
    else this.stopLoop();
  }

  /**
   * Push the latest composite-mind snapshot. The rAF loop animates BETWEEN pushes on a live screen;
   * we ALSO paint once on arrival so the views still render when rAF is throttled (a backgrounded /
   * hidden tab pauses rAF). Cheap — only when the box is in neural mode.
   */
  update(snap: Snap | null): void {
    this.easeTint(); // V123: advance the BRUTAL tint on the data cadence too (works when rAF is throttled)
    this.snap = snap;
    if (!snap) return;
    // textContent (not innerHTML) for the dynamic plan label — matches the WebGL-card hardening.
    // snap.plan is a closed enum today, but this removes the HTML-injection sink outright.
    const d = this.footEl.ownerDocument ?? document;
    const planEl = d.createElement('b');
    planEl.textContent = String(snap.plan);
    this.footEl.replaceChildren(
      planEl,
      d.createTextNode(
        ` · ${snap.paramCount}p · ${snap.stages}st × ${snap.depths}d × ${snap.variants}v · ${snap.organs} organs`,
      ),
    );
    if (this.active) {
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      this.paint(now / 1000);
    }
  }

  private startLoop(): void {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }
  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  private lastPaint = 0;
  private readonly tick = (ts: number): void => {
    this.raf = 0;
    if (!this.active || !this.host.isConnected) return;
    this.raf = requestAnimationFrame(this.tick);
    this.easeTint(); // V123: crossfade the BRUTAL skin tint every frame (cheap CSS-var write)
    // ~30 fps cap: repaint at most every 33 ms so 9 live canvases never fight the WebGL render loop.
    if (ts - this.lastPaint < 33) return;
    this.lastPaint = ts;
    this.paint(ts / 1000);
  };

  /** V123 (USER #4): ease the box's BRUTAL tint toward its target and write it as CSS vars — a
   *  gradual skin shift (rim + floor-glow hue) that keeps the cells legible. O(1). */
  private easeTint(): void {
    const target = this.tintTarget;
    if (Math.abs(this.tintCur - target) < 0.002) this.tintCur = target;
    else this.tintCur += (target - this.tintCur) * 0.06;
    const rgb = SNEU_BRUTAL_RGB[this.tintStyle] ?? SNEU_BRUTAL_RGB[0]!;
    this.root.style.setProperty('--sneu-tint', this.tintCur.toFixed(3));
    this.root.style.setProperty('--sneu-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`);
  }

  private paint(t: number): void {
    const snap = this.snap;
    if (!snap) return;
    // history advances once per rendered frame so temporal views flow; set head BEFORE drawers push
    this.frameN++;
    this.hist.head = this.frameN;
    const drawers = TABS[this.tab] ?? [];
    for (let i = 0; i < this.ctxs.length; i++) {
      const ctx = this.ctxs[i];
      const drawer = drawers[i];
      const cell = this.cells[i];
      if (!ctx || !drawer || !cell) continue;
      const cw = Math.floor(cell.clientWidth);
      const chh = Math.floor(cell.clientHeight);
      if (cw < 8 || chh < 8) continue;
      this.size(ctx, cw, chh);
      drawer(ctx, cw, chh, snap, t, this.hist);
    }
  }

  private size(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cv = ctx.canvas;
    if (cv.width !== w * this.dpr || cv.height !== h * this.dpr) {
      cv.width = w * this.dpr;
      cv.height = h * this.dpr;
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}
