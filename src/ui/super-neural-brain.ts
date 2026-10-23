/**
 * IV · BRAIN — the PRIME Archon's measured module connectome. Pure: a function of one SuperMind snapshot,
 * no clock, paint state, RNG or simulation writes.
 *
 * {@link buildBrainGraph} copies the output vector of each of the mind's 16 computing modules from the
 * snapshot, and lists the data flows `SuperMind.think()` actually performs between them. Every flow
 * carries the exact values passed along it this beat (or the read-out slice the receiver uses), so its
 * strength is the RMS of real numbers, not an invented synapse weight. The per-module parameter counts
 * are the TinyMLP weights of the network that produced the values and sum to `paramCount` (tested).
 *
 * Two renderings read that graph and nothing else:
 *   • CONNECTOME — a left-to-right flow map: node size = output RMS, line width = √(RMS carried), and each
 *     node prints its RMS, its parameter count and its actual values as a bar strip.
 *   • MEGA 4D — the 16 modules sit on the 16 vertices of a tesseract; every measured value is one dot
 *     (size and brightness = |value| ÷ that module's largest |value|, hue flips for negatives), and the
 *     same flows join the vertices. The view turns only when a new cognition tick arrives.
 * Positions are layout. Dots are model variables, not neurons; flows are code paths, not axons.
 */
import type { SuperMindSnapshot } from '../sim/super-mind';

export type BrainModuleId =
  | 'senses'
  | 'cortex'
  | 'organs'
  | 'imagitron'
  | 'search'
  | 'predictor'
  | 'quantum'
  | 'reservoir'
  | 'instinct'
  | 'reasoner'
  | 'self'
  | 'qubits'
  | 'memory'
  | 'affect'
  | 'meta'
  | 'plan';

export interface BrainModule {
  readonly id: BrainModuleId;
  readonly label: string;
  /** Snapshot path the values are copied from. */
  readonly source: string;
  /** TinyMLP weights of the network that produced the values (0 = no weight network). */
  readonly params: number;
  /** Flow-map column (0 = input … 6 = decision). */
  readonly column: number;
  readonly hue: number;
  readonly values: number[];
  readonly rms: number;
  readonly maxAbs: number;
}

export interface BrainEdge {
  readonly from: BrainModuleId;
  readonly to: BrainModuleId;
  /** What travels along this flow in think(). */
  readonly via: string;
  readonly carried: number[];
  readonly rms: number;
}

export interface BrainGraph {
  readonly tick: number;
  readonly mode: string;
  readonly plan: string;
  readonly paramCount: number;
  readonly modules: BrainModule[];
  readonly edges: BrainEdge[];
  /** Total measured values across all modules (= MEGA 4D dot count). */
  readonly units: number;
}

function finite(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
function vec(a: ArrayLike<number> | undefined): number[] {
  return a ? Array.from(a, finite) : [];
}
function rmsOf(a: readonly number[]): number {
  return a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : 0;
}
function maxAbsOf(a: readonly number[]): number {
  let m = 0;
  for (const v of a) m = Math.max(m, Math.abs(v));
  return m;
}

/** The 16 modules: id, label, snapshot source, producing-network weights, flow column, hue. */
const MODULE_SPECS: readonly {
  id: BrainModuleId;
  label: string;
  source: string;
  params: number;
  column: number;
  hue: number;
  read: (s: SuperMindSnapshot) => number[];
}[] = [
  {
    id: 'senses',
    label: 'SENSES',
    source: 'observatory.senses',
    params: 0,
    column: 0,
    hue: 190,
    read: (s) => vec(s.observatory.senses),
  },
  {
    id: 'cortex',
    label: 'CORTEX',
    source: 'latent',
    params: 1136,
    column: 1,
    hue: 200,
    read: (s) => vec(s.latent),
  },
  {
    id: 'instinct',
    label: 'INSTINCT',
    source: 'spin.spins',
    params: 0,
    column: 1,
    hue: 140,
    read: (s) => vec(s.spin?.spins),
  },
  {
    id: 'organs',
    label: 'ORGANS ×30',
    source: 'observatory.organOutputs',
    params: 1740,
    column: 2,
    hue: 45,
    read: (s) => vec(s.observatory.organOutputs),
  },
  {
    id: 'imagitron',
    label: 'IMAGITRON',
    source: 'imagined',
    params: 1328,
    column: 2,
    hue: 290,
    read: (s) => vec(s.imagined),
  },
  {
    id: 'predictor',
    label: 'PREDICTOR',
    source: 'observatory.predicted',
    params: 808,
    column: 2,
    hue: 175,
    read: (s) => vec(s.observatory.predicted),
  },
  {
    id: 'quantum',
    label: 'QUANTUM NET',
    source: 'quantum',
    params: 550,
    column: 2,
    hue: 260,
    read: (s) => vec(s.quantum),
  },
  {
    id: 'reservoir',
    label: 'RESERVOIR',
    source: 'reservoir.state',
    params: 0,
    column: 2,
    hue: 160,
    read: (s) => vec(s.reservoir?.state),
  },
  {
    id: 'search',
    label: 'THOUGHT SEARCH',
    source: 'observatory.search.scores',
    params: 424,
    column: 3,
    hue: 310,
    read: (s) => vec(s.observatory.search.scores),
  },
  {
    id: 'reasoner',
    label: 'REASONER',
    source: 'observatory.reasoned',
    params: 808,
    column: 3,
    hue: 120,
    read: (s) => vec(s.observatory.reasoned),
  },
  {
    id: 'self',
    label: 'SELF-MODEL',
    source: 'observatory.selfModel',
    params: 340,
    column: 3,
    hue: 300,
    read: (s) => vec(s.observatory.selfModel),
  },
  {
    id: 'qubits',
    label: 'QUBITS |ψ|²',
    source: 'qubits.probs',
    params: 0,
    column: 3,
    hue: 230,
    read: (s) => vec(s.qubits?.probs),
  },
  {
    id: 'memory',
    label: 'MEMORY',
    source: 'observatory.memory.values',
    params: 544,
    column: 3,
    hue: 30,
    read: (s) => vec(s.observatory.memory.values),
  },
  {
    id: 'affect',
    label: 'AFFECT',
    source: 'observatory.affectOutputs',
    params: 259,
    column: 4,
    hue: 340,
    read: (s) => vec(s.observatory.affectOutputs),
  },
  {
    id: 'meta',
    label: 'META',
    source: 'observatory.actionOutputs',
    params: 2144,
    column: 5,
    hue: 20,
    read: (s) => vec(s.observatory.actionOutputs),
  },
  {
    id: 'plan',
    label: 'PLAN',
    source: 'observatory.planScores',
    params: 0,
    column: 6,
    hue: 50,
    read: (s) => vec(s.observatory.planScores),
  },
];

/** The data flows think() performs, each with the values it carries (or the slice the receiver reads). */
const EDGE_SPECS: readonly {
  from: BrainModuleId;
  to: BrainModuleId;
  via: string;
  carry: (s: SuperMindSnapshot, m: Record<BrainModuleId, number[]>) => number[];
}[] = [
  {
    from: 'senses',
    to: 'cortex',
    via: 'the 18 encoded senses are the cortex input',
    carry: (_s, m) => m.senses,
  },
  {
    from: 'senses',
    to: 'instinct',
    via: 'senses 0–5 set the plan saliences that drive the spin field',
    carry: (_s, m) => m.senses.slice(0, 6),
  },
  {
    from: 'senses',
    to: 'memory',
    via: 'salience pushed to memory reads threat and crowding',
    carry: (_s, m) => [m.senses[1] ?? 0, m.senses[2] ?? 0],
  },
  {
    from: 'senses',
    to: 'affect',
    via: 'affect input reads energy, threat, wealth',
    carry: (_s, m) => [m.senses[0] ?? 0, m.senses[1] ?? 0, m.senses[4] ?? 0],
  },
  {
    from: 'senses',
    to: 'plan',
    via: 'plan drive formulas read energy, threat, wealth, prey',
    carry: (_s, m) => [m.senses[0] ?? 0, m.senses[1] ?? 0, m.senses[4] ?? 0, m.senses[5] ?? 0],
  },
  {
    from: 'cortex',
    to: 'organs',
    via: 'each organ reads a 4-wide latent window',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'imagitron',
    via: 'latent + 8 noise values seed every imagined branch',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'predictor',
    via: 'latent, rolled forward once per depth',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'quantum',
    via: 'latent is the quantum-net input',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'reservoir',
    via: 'latent drives the echo-state reservoir',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'qubits',
    via: 'latent sets the register rotation angles',
    carry: (_s, m) => m.cortex,
  },
  { from: 'cortex', to: 'meta', via: 'latent is meta input 0–15', carry: (_s, m) => m.cortex },
  {
    from: 'imagitron',
    to: 'search',
    via: 'the perceptor scores each imagined branch (winning branch shown)',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'search',
    to: 'imagitron',
    via: 'the winning score per depth re-seeds the next depth',
    carry: (s) => winners(s),
  },
  {
    from: 'imagitron',
    to: 'reasoner',
    via: 'imagined winner is the reasoner input',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'imagitron',
    to: 'self',
    via: 'imagined winner is the self-model input',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'imagitron',
    to: 'memory',
    via: 'the consolidator folds the imagined winner into memory',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'imagitron',
    to: 'affect',
    via: 'affect input reads imagined[0]',
    carry: (_s, m) => [m.imagitron[0] ?? 0],
  },
  {
    from: 'imagitron',
    to: 'meta',
    via: 'imagined winner is meta input 16–31',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'predictor',
    to: 'memory',
    via: 'salience pushed to memory reads |predicted[0]|',
    carry: (_s, m) => [m.predictor[0] ?? 0],
  },
  {
    from: 'quantum',
    to: 'qubits',
    via: 'aspect drives gate the Hadamards and the entangler',
    carry: (_s, m) => m.quantum,
  },
  { from: 'quantum', to: 'meta', via: 'aspects are meta input 52–61', carry: (_s, m) => m.quantum },
  {
    from: 'organs',
    to: 'affect',
    via: 'affect input reads organ aggregate 0',
    carry: (s) => [finite(s.observatory.organAggregates[0])],
  },
  {
    from: 'organs',
    to: 'meta',
    via: 'the 4 organ aggregates are meta input 48–51',
    carry: (s) => vec(s.observatory.organAggregates),
  },
  {
    from: 'reasoner',
    to: 'affect',
    via: 'affect input reads reasoned[0]',
    carry: (_s, m) => [m.reasoner[0] ?? 0],
  },
  {
    from: 'reasoner',
    to: 'meta',
    via: 'reasoned is meta input 32–47',
    carry: (_s, m) => m.reasoner,
  },
  {
    from: 'affect',
    to: 'meta',
    via: 'the 3 affect outputs are meta input 62–64',
    carry: (_s, m) => m.affect,
  },
  {
    from: 'self',
    to: 'meta',
    via: 'the 4 self-model outputs are meta input 65–68',
    carry: (_s, m) => m.self,
  },
  {
    from: 'meta',
    to: 'plan',
    via: 'meta outputs 3–7 become aggression, deception, dominance, spawn, curiosity',
    carry: (_s, m) => m.meta.slice(3, 8),
  },
  {
    from: 'instinct',
    to: 'plan',
    via: 'the recalled archetype biases its plan by its overlap',
    carry: (s) => [finite(s.spin?.bestOverlap)],
  },
  {
    from: 'reservoir',
    to: 'plan',
    via: 'reservoir novelty raises curiosity (EXPLORE)',
    carry: (s) => [finite(s.reservoir?.novelty)],
  },
];

function winners(s: SuperMindSnapshot): number[] {
  const o = s.observatory;
  const w = Math.max(0, Math.trunc(o.variantsPerDepth));
  return o.search.selectedVariants.map((v, d) => finite(o.search.scores[d * w + v]));
}

/** Build the measured module graph of one snapshot. Pure; copies every value it reads. */
export function buildBrainGraph(s: SuperMindSnapshot): BrainGraph {
  const raw = {} as Record<BrainModuleId, number[]>;
  for (const spec of MODULE_SPECS) raw[spec.id] = spec.read(s);
  const modules: BrainModule[] = MODULE_SPECS.map((spec) => {
    const values = raw[spec.id];
    return {
      id: spec.id,
      label: spec.label,
      source: spec.source,
      params: spec.params,
      column: spec.column,
      hue: spec.hue,
      values,
      rms: rmsOf(values),
      maxAbs: maxAbsOf(values),
    };
  });
  const edges: BrainEdge[] = EDGE_SPECS.map((e) => {
    const carried = e.carry(s, raw).map(finite);
    return { from: e.from, to: e.to, via: e.via, carried, rms: rmsOf(carried) };
  });
  return {
    tick: s.observatory.tick,
    mode: s.observatory.mode,
    plan: String(s.plan),
    paramCount: s.paramCount,
    modules,
    edges,
    units: modules.reduce((n, m) => n + m.values.length, 0),
  };
}

/** Plain-text dump of the exact numbers the two views draw (for the details panel and export). */
export function brainGraphText(g: BrainGraph): string {
  const f = (v: number): string =>
    Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.001) ? v.toExponential(3) : v.toFixed(4);
  const mods = g.modules.map(
    (m) =>
      `${m.label} (${m.source}, ${m.params}p) rms ${f(m.rms)} max|v| ${f(m.maxAbs)} n ${m.values.length}: [${m.values.map(f).join(', ')}]`,
  );
  const edges = g.edges.map(
    (e) => `${e.from} → ${e.to} · rms ${f(e.rms)} · ${e.via}: [${e.carried.map(f).join(', ')}]`,
  );
  return `tick ${g.tick} (${g.mode}) · plan ${g.plan} · ${g.units} values · ${g.edges.length} flows\nMODULES\n${mods.join('\n')}\nFLOWS\n${edges.join('\n')}`;
}

// ── rendering ────────────────────────────────────────────────────────────────────────────────────
const BG = '#03010a';
const TEXT = '#e8dcff';
const DIM = '#8f7cba';

function font(ctx: CanvasRenderingContext2D, w: number, base: number, weight = ''): void {
  const k = Math.max(0.85, Math.min(2.2, w / 460));
  ctx.font = `${weight}${(base * k).toFixed(1)}px ui-monospace,monospace`;
}
function num(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
}
function header(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  foot: string,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#00ffd5';
  font(ctx, w, 9, '600 ');
  ctx.fillText(title, 8, 6);
  ctx.fillStyle = DIM;
  font(ctx, w, 7);
  ctx.textBaseline = 'bottom';
  ctx.fillText(foot, 8, h - 4);
  ctx.textBaseline = 'top';
}

/** CONNECTOME: the measured modules as a left-to-right flow map. Pure function of the graph. */
export function drawBrainConnectome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  g: BrainGraph,
): void {
  header(
    ctx,
    w,
    h,
    `IV · CONNECTOME — ${g.modules.length} modules · ${g.edges.length} measured flows · ${g.paramCount}p · tick ${g.tick}`,
    'node size = output RMS · strip = its actual values · line width = √(RMS carried) · layout only',
  );
  const cols = 7;
  const top = 34;
  const bottom = h - 22;
  const left = 46;
  const right = w - 58;
  const byCol: BrainModule[][] = Array.from({ length: cols }, () => []);
  for (const m of g.modules) byCol[m.column]!.push(m);
  const pos = new Map<BrainModuleId, { x: number; y: number }>();
  byCol.forEach((list, c) => {
    const x = left + (c / (cols - 1)) * (right - left);
    list.forEach((m, i) => {
      pos.set(m.id, { x, y: top + ((i + 0.5) / list.length) * (bottom - top) });
    });
  });
  const nodeMax = Math.max(1e-9, ...g.modules.map((m) => m.rms));
  const edgeMax = Math.max(1e-9, ...g.edges.map((e) => e.rms));
  const hueOf = new Map(g.modules.map((m) => [m.id, m.hue]));
  for (const e of g.edges) {
    const a = pos.get(e.from)!;
    const b = pos.get(e.to)!;
    const k = Math.sqrt(e.rms / edgeMax);
    const back = b.x <= a.x;
    const mx = (a.x + b.x) / 2;
    const my = back ? Math.min(a.y, b.y) - 26 : (a.y + b.y) / 2;
    ctx.strokeStyle = `hsla(${hueOf.get(e.from) ?? 200},90%,62%,${(0.12 + 0.75 * k).toFixed(2)})`;
    ctx.lineWidth = 0.6 + 4.2 * k;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
  }
  for (const m of g.modules) {
    const p = pos.get(m.id)!;
    const k = Math.sqrt(m.rms / nodeMax);
    const r = 3.5 + 9 * k;
    ctx.fillStyle = `hsla(${m.hue},90%,${(30 + 40 * k).toFixed(0)}%,0.95)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${m.hue},90%,75%,0.9)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    font(ctx, w, 7, '600 ');
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.id === 'plan' ? `PLAN · ${g.plan}` : m.label, p.x, p.y - r - 2);
    ctx.textBaseline = 'top';
    font(ctx, w, 6.2);
    ctx.fillStyle = DIM;
    ctx.fillText(`rms ${num(m.rms)}${m.params ? ` · ${m.params}p` : ''}`, p.x, p.y + r + 2);
    // the module's actual values, scaled by its own largest |value|
    const sw = 40;
    const sh = 8;
    const sx = p.x - sw / 2;
    const sy = p.y + r + 12;
    const n = m.values.length;
    const scale = m.maxAbs > 1e-12 ? m.maxAbs : 1;
    for (let i = 0; i < n; i++) {
      const v = (m.values[i] ?? 0) / scale;
      const bw = sw / n;
      ctx.fillStyle =
        v >= 0 ? `hsla(${m.hue},90%,65%,0.9)` : `hsla(${(m.hue + 180) % 360},90%,65%,0.9)`;
      const hh = Math.abs(v) * (sh / 2);
      ctx.fillRect(
        sx + i * bw,
        v >= 0 ? sy + sh / 2 - hh : sy + sh / 2,
        Math.max(0.4, bw - 0.2),
        Math.max(0.4, hh),
      );
    }
  }
  ctx.textAlign = 'left';
}

/** The 16 tesseract vertices (±1 in x, y, z, w), indexed by bit pattern. */
const TESS: readonly (readonly [number, number, number, number])[] = Array.from(
  { length: 16 },
  (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1],
);
/** Vertex per module (a permutation of 0–15). senses→cortex, cortex→organs/imagitron/predictor,
 *  organs→meta and meta→plan each run along a tesseract edge. */
const VERTEX: Record<BrainModuleId, number> = {
  senses: 0,
  cortex: 1,
  organs: 3,
  imagitron: 5,
  predictor: 9,
  quantum: 7,
  reservoir: 13,
  instinct: 2,
  search: 4,
  reasoner: 12,
  self: 6,
  qubits: 15,
  memory: 8,
  affect: 14,
  meta: 11,
  plan: 10,
};
function rot4(
  p: readonly [number, number, number, number],
  a: number,
  b: number,
  c: number,
): [number, number, number, number] {
  const [x, y, z, w] = p;
  const x1 = x * Math.cos(a) - w * Math.sin(a);
  const w1 = x * Math.sin(a) + w * Math.cos(a);
  const y1 = y * Math.cos(b) - w1 * Math.sin(b);
  const w2 = y * Math.sin(b) + w1 * Math.cos(b);
  const x2 = x1 * Math.cos(c) - z * Math.sin(c);
  const z2 = x1 * Math.sin(c) + z * Math.cos(c);
  return [x2, y1, z2, w2];
}
function proj(
  p: readonly [number, number, number, number],
  cx: number,
  cy: number,
  s: number,
): { x: number; y: number; d: number } {
  const k = 1 / (1.9 - p[3] * 0.45); // perspective through w
  const x = p[0] * k;
  const y = p[1] * k;
  const z = p[2] * k;
  const t = 0.42;
  const yy = y * Math.cos(t) - z * Math.sin(t);
  const zz = y * Math.sin(t) + z * Math.cos(t);
  return { x: cx + x * s, y: cy - yy * s, d: zz };
}

/**
 * MEGA 4D: every measured value is one dot at its module's tesseract vertex; the real flows join the
 * vertices. The view angle advances with the cognition tick, never with browser time.
 */
export function drawBrainMega(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  g: BrainGraph,
): void {
  header(
    ctx,
    w,
    h,
    `IV · MEGA 4D — ${g.units} measured values · 16 modules on 16 tesseract vertices · ${g.edges.length} flows · tick ${g.tick}`,
    'dot = one value · size = |value| ÷ module max · hue flip = negative · line = √(RMS carried) · turns per tick',
  );
  const cx = w / 2;
  const cy = h / 2 + 6;
  const s = Math.min(w, h - 50) * 0.36;
  const a = g.tick * 0.021;
  const b = g.tick * 0.013;
  const c = 0.5 + g.tick * 0.008;
  const vp = TESS.map((v) => proj(rot4(v, a, b, c), cx, cy, s));
  ctx.strokeStyle = 'hsla(220,70%,55%,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++)
    for (const bit of [1, 2, 4, 8]) {
      const j = i | bit;
      if (j === i) continue;
      ctx.beginPath();
      ctx.moveTo(vp[i]!.x, vp[i]!.y);
      ctx.lineTo(vp[j]!.x, vp[j]!.y);
      ctx.stroke();
    }
  const edgeMax = Math.max(1e-9, ...g.edges.map((e) => e.rms));
  const hueOf = new Map(g.modules.map((m) => [m.id, m.hue]));
  for (const e of g.edges) {
    const p = vp[VERTEX[e.from]]!;
    const q = vp[VERTEX[e.to]]!;
    const k = Math.sqrt(e.rms / edgeMax);
    ctx.strokeStyle = `hsla(${hueOf.get(e.from) ?? 200},95%,62%,${(0.15 + 0.7 * k).toFixed(2)})`;
    ctx.lineWidth = 0.5 + 3.5 * k;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  for (const m of g.modules) {
    const base = TESS[VERTEX[m.id]]!;
    const n = m.values.length;
    const radius = 0.07 + 0.022 * Math.sqrt(n);
    const scale = m.maxAbs > 1e-12 ? m.maxAbs : 1;
    for (let i = 0; i < n; i++) {
      // fixed Fibonacci-sphere slot around the vertex (layout only)
      const yy = 1 - (2 * (i + 0.5)) / n;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const th = i * 2.399963229728653;
      const pt = proj(
        rot4(
          [
            base[0] + Math.cos(th) * rr * radius,
            base[1] + yy * radius,
            base[2] + Math.sin(th) * rr * radius,
            base[3],
          ],
          a,
          b,
          c,
        ),
        cx,
        cy,
        s,
      );
      const v = (m.values[i] ?? 0) / scale;
      const mag = Math.abs(v);
      const hue = v >= 0 ? m.hue : (m.hue + 180) % 360;
      ctx.fillStyle = `hsla(${hue},95%,${(28 + 50 * mag).toFixed(0)}%,${(0.35 + 0.65 * mag).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 0.8 + 2.6 * mag, 0, Math.PI * 2);
      ctx.fill();
    }
    const lp = vp[VERTEX[m.id]]!;
    font(ctx, w, 6.4, '600 ');
    ctx.fillStyle = `hsla(${m.hue},90%,78%,0.95)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${m.id === 'plan' ? `PLAN ${g.plan}` : m.label} · ${n}`, lp.x, lp.y - 10);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}
