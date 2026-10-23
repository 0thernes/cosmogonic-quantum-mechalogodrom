/**
 * PRIME Archon observatory: 27 source-stamped measurement cards plus a separately labeled
 * schematic brain illustration. Measurements advance only on completed cognition samples.
 * Canvas repaint and browser time never synthesize activity in World/Cognition/Quantum.
 */
import type { SuperMindSnapshot } from '../sim/super-mind';
import { buildNeuralCards, NeuralHistory, type NeuralCard } from './super-neural-data';

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
type Drawer = (ctx: CanvasRenderingContext2D, w: number, h: number, s: Snap, t: number) => void;

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
function avg(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] ?? 0;
  return a.length ? s / a.length : 0;
}

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
    clamp01(s.holographic?.confidence ?? 0), // MEMORY = holographic recall confidence
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
  }

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
    // A static schematic activity mark, not a recorded spike train.
    if (v > 0.3) {
      const traceX = p.x + 4 + near * 3;
      ctx.strokeStyle = `hsla(${ohue},90%,60%,0.4)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(traceX, p.y - 6);
      ctx.lineTo(traceX, p.y + 6);
      ctx.stroke();
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
const drawBrainRouted: Drawer = (ctx, w, h, s, t) => {
  if (megaBrainMode) drawMegaBrain(ctx, w, h, s, t);
  else drawBrain(ctx, w, h, s, t);
};

/** Set MEGA 4D brain mode for the neural observatory (instance-safe via setter). */
export function setMegaBrainMode(v: boolean): void {
  megaBrainMode = v;
}

export function getMegaBrainMode(): boolean {
  return megaBrainMode;
}

const SERIES_COLORS = [PAL.cyan, PAL.mag, PAL.gold, PAL.green, PAL.violet, PAL.red];

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
      doc.createTextNode(
        'I–III: sampled computation · IV: schematic illustration · no consciousness verdict',
      ),
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
    this.brainCycleBtn.textContent = getMegaBrainMode()
      ? '⬡ MEGA 4D schematic'
      : '⟁ COMPOSITE schematic';
    this.brainCycleBtn.classList.toggle('mega', getMegaBrainMode());
    this.brainCycleBtn.title =
      'Illustrative geometry, synthetic rhythms and signal motifs; not a measured connectome or EEG.';
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
        card?.id ?? (this.tab === 3 ? 'brain_schematic' : `awaiting_${this.tab}_${i}`);
      const heading = doc.createElement('h3');
      heading.textContent =
        card?.title ??
        (this.tab === 3 ? 'Brain illustration · schematic' : 'Awaiting completed cognition');
      cell.appendChild(heading);
      const source = doc.createElement('p');
      source.className = 'cqm-sneu-source';
      source.textContent = card
        ? `Source: ${card.source}`
        : 'Illustrative geometry is separate from the 27 measurements.';
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
          : 'Schematic brain illustration',
      );
      cell.appendChild(canvas);
      const details = doc.createElement('details'),
        summary = doc.createElement('summary'),
        note = doc.createElement('p'),
        raw = doc.createElement('pre');
      summary.textContent = 'Method, limits & exact values';
      note.textContent = card
        ? `${card.note}${card.warning ? ` WARNING: ${card.warning}` : ''}`
        : 'Geometry, synthetic oscillations, inferred activity and moving motifs are illustrative. These are not recorded neurons, EEG frequency bands, axonal traffic or proof of consciousness.';
      raw.textContent = card ? this.cardText(card) : 'Use tabs I–III for measured model variables.';
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
      if (
        first ||
        unstarted ||
        !this.gridEl.querySelector(
          '[data-card-id="' + (this.cards[this.tab]?.[0]?.id ?? 'brain_schematic') + '"]',
        )
      )
        this.buildGrid();
      else this.refreshDetails();
      if (this.active) this.paint();
    }
    this.updateStatus();
  }

  private refreshDetails(): void {
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
      if (this.tab === 3 && this.snap)
        drawBrainRouted(ctx, w, h, this.snap, this.snap.observatory.tick * 0.1);
      else if (card) drawMeasurement(ctx, w, h, card);
      else frame(ctx, w, h, 'No completed cognitive sample');
    }
  }
}
