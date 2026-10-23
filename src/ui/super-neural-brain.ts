/**
 * Two fixed-camera views of selected PRIME Archon state and code-path measurements. This partial
 * graph is not a complete execution trace. Positions and tesseract edges are layout, not anatomy.
 * Values include current state, selected network outputs and stored entries as declared by source.
 * Associated core TinyMLP allocations sum to paramCount; other subsystem parameters are excluded.
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
  /** Associated core TinyMLP allocation, including biases; 0 means outside this counted budget. */
  readonly note: string;
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
  /** Complete payload, selected formula operands, or an unavailable structural relationship. */
  readonly measurement: 'payload' | 'operands' | 'unavailable';
  readonly source: string;
  /** Scope and timing of the values. */
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
  readonly warning?: string;
  /** Available value slots; invalid values are not rendered as measured dots. */
  readonly units: number;
}

function numeric(v: unknown): number {
  return typeof v === 'number' ? v : NaN;
}
function vec(a: ArrayLike<number> | undefined): number[] {
  return a ? Array.from(a, numeric) : [];
}
function rmsOf(a: readonly number[]): number {
  return a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : NaN;
}
function maxAbsOf(a: readonly number[]): number {
  let m = a.length ? 0 : NaN;
  for (const v of a) m = Math.max(m, Math.abs(v));
  return m;
}

const MODULE_NOTES: Partial<Record<BrainModuleId, string>> = {
  cortex:
    'Workspace after cortex, broadcast, plastic recall and MPO coupling; associated cortex MLP 18→32→16.',
  imagitron: 'Selected imagination after recurrence blending; associated generator MLP 24→32→16.',
  search: 'Perceptor score channel across candidates; associated critic MLP 16→20→4.',
  quantum: 'Signed raw network output; unit conversion and aspect modulation are separate.',
  memory:
    'Stored ring, newest first; associated 16→16→16 consolidator is one writer, not producer of every entry.',
  reservoir: 'Reservoir state; recurrent/readout parameters are outside the core TinyMLP count.',
  instinct: 'Spin state; coupling parameters are outside the core TinyMLP count.',
};
/** Sixteen selected state groups and associated core-network allocation, not neuron counts. */
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
    label: 'WORKSPACE',
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
    label: 'IMAGINATION',
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
    source: 'observatory.brain.quantumRaw',
    params: 550,
    column: 2,
    hue: 260,
    read: (s) => vec(s.observatory.brain?.quantumRaw),
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

/** Selected relationships, with scope and timing explicit rather than a complete execution trace. */
const EDGE_SPECS: readonly {
  from: BrainModuleId;
  to: BrainModuleId;
  via: string;
  source: string;
  measurement: 'payload' | 'operands';
  carry: (s: SuperMindSnapshot, m: Record<BrainModuleId, number[]>) => number[];
}[] = [
  {
    from: 'senses',
    to: 'cortex',
    measurement: 'payload',
    source: 'observatory.senses',
    via: 'Complete cortex input; displayed workspace also includes subsequent coupling.',
    carry: (_s, m) => m.senses,
  },
  {
    from: 'senses',
    to: 'instinct',
    measurement: 'operands',
    source: 'observatory.senses[0..5]',
    via: 'Sensory salience operands; novelty, affect, attention and archetypes also determine the spin field.',
    carry: (_s, m) => m.senses.slice(0, 6),
  },
  {
    from: 'senses',
    to: 'memory',
    measurement: 'operands',
    source: 'observatory.senses[1,2]',
    via: 'Threat/crowding operands before salience weighting, predicted magnitude and clamp.',
    carry: (_s, m) => [numeric(m.senses[1]), numeric(m.senses[2])],
  },
  {
    from: 'senses',
    to: 'affect',
    measurement: 'operands',
    source: 'observatory.senses[0,1,4]',
    via: 'Energy, threat and wealth operands in the 12-channel affect input.',
    carry: (_s, m) => [numeric(m.senses[0]), numeric(m.senses[1]), numeric(m.senses[4])],
  },
  {
    from: 'senses',
    to: 'plan',
    measurement: 'operands',
    source: 'observatory.senses[0,1,4,5]',
    via: 'Sensory operands of initial drive formulas; later controller terms also modify scores.',
    carry: (_s, m) => [
      numeric(m.senses[0]),
      numeric(m.senses[1]),
      numeric(m.senses[4]),
      numeric(m.senses[5]),
    ],
  },
  {
    from: 'cortex',
    to: 'organs',
    measurement: 'payload',
    source: 'latent (30 four-channel windows)',
    via: 'Concatenated inputs in organ order: window offset (organ × 4) modulo latent width.',
    carry: (s, m) =>
      Array.from({ length: s.observatory.organOutputs.length / 2 }, (_, k) =>
        Array.from({ length: 4 }, (_, i) => numeric(m.cortex[((k * 4) % m.cortex.length) + i])),
      ).flat(),
  },
  {
    from: 'cortex',
    to: 'imagitron',
    measurement: 'operands',
    source: 'latent',
    via: 'First-depth seed only; each generator input also contains eight noise values.',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'predictor',
    measurement: 'payload',
    source: 'latent',
    via: 'Complete first predictor input; later inputs are previous predictor outputs.',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'quantum',
    measurement: 'payload',
    source: 'latent',
    via: 'Complete raw quantum-network input.',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'reservoir',
    measurement: 'payload',
    source: 'latent',
    via: 'Complete echo-state reservoir input.',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'qubits',
    measurement: 'payload',
    source: 'latent',
    via: 'Complete latent argument of qmind.evolve; aspect controls are separate.',
    carry: (_s, m) => m.cortex,
  },
  {
    from: 'cortex',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[0..15]',
    via: 'Exact first 16-channel meta input block.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(0, 16),
  },
  {
    from: 'imagitron',
    to: 'search',
    measurement: 'payload',
    source: 'observatory.brain.imaginationWinner',
    via: 'Final-depth selected candidate, one actual perceptor input; other candidate vectors are not displayed.',
    carry: (s) => vec(s.observatory.brain?.imaginationWinner),
  },
  {
    from: 'search',
    to: 'imagitron',
    measurement: 'operands',
    source: 'observatory.brain.searchWinnerVectors (except final depth)',
    via: 'Selected vectors re-seed later depths, not scores; eight noise inputs are omitted.',
    carry: (s) =>
      vec(s.observatory.brain?.searchWinnerVectors).slice(
        0,
        Math.max(0, s.observatory.activeDepths - 1) * 16,
      ),
  },
  {
    from: 'imagitron',
    to: 'reasoner',
    measurement: 'payload',
    source: 'observatory.brain.imaginationWinner',
    via: 'Exact reasoner input before the later learned-recurrence blend.',
    carry: (s) => vec(s.observatory.brain?.imaginationWinner),
  },
  {
    from: 'imagitron',
    to: 'self',
    measurement: 'payload',
    source: 'imagined',
    via: 'Complete self-model input after learned-recurrence blending.',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'imagitron',
    to: 'memory',
    measurement: 'payload',
    source: 'imagined',
    via: 'Complete consolidator input; only its transformed, gated first output enters the ring.',
    carry: (_s, m) => m.imagitron,
  },
  {
    from: 'imagitron',
    to: 'affect',
    measurement: 'operands',
    source: 'imagined[0]',
    via: 'Post-blend imagined channel 0 is one affect input.',
    carry: (_s, m) => [numeric(m.imagitron[0])],
  },
  {
    from: 'imagitron',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[16..31]',
    via: 'Exact post-blend imagination block consumed by meta.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(16, 32),
  },
  {
    from: 'predictor',
    to: 'memory',
    measurement: 'operands',
    source: 'observatory.predicted[0]',
    via: 'Signed predictor operand; salience applies abs, weighting and clamp before writing.',
    carry: (_s, m) => [numeric(m.predictor[0])],
  },
  {
    from: 'quantum',
    to: 'qubits',
    measurement: 'payload',
    source: 'observatory.brain.qubitAspects',
    via: 'Exact converted/modulated aspect argument before the later quake mutation.',
    carry: (s) => vec(s.observatory.brain?.qubitAspects),
  },
  {
    from: 'quantum',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[52..61]',
    via: 'Exact signed raw quantum-network block, not final aspect intensities.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(52, 62),
  },
  {
    from: 'organs',
    to: 'affect',
    measurement: 'operands',
    source: 'observatory.organAggregates[0]',
    via: 'Attention-weighted aggregate 0 is one affect input.',
    carry: (s) => [numeric(s.observatory.organAggregates[0])],
  },
  {
    from: 'organs',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[48..51]',
    via: 'Exact four attention-weighted aggregate channels consumed by meta.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(48, 52),
  },
  {
    from: 'reasoner',
    to: 'affect',
    measurement: 'operands',
    source: 'observatory.reasoned[0]',
    via: 'Reasoner channel 0 is one affect input.',
    carry: (_s, m) => [numeric(m.reasoner[0])],
  },
  {
    from: 'reasoner',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[32..47]',
    via: 'Exact reasoned block consumed by meta.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(32, 48),
  },
  {
    from: 'affect',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[62..64]',
    via: 'Exact raw affect block, not smoothed emotion state.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(62, 65),
  },
  {
    from: 'self',
    to: 'meta',
    measurement: 'payload',
    source: 'observatory.brain.metaInput[65..68]',
    via: 'Exact four raw self-model outputs consumed by meta.',
    carry: (s) => vec(s.observatory.brain?.metaInput).slice(65, 69),
  },
  {
    from: 'meta',
    to: 'plan',
    measurement: 'operands',
    source: 'observatory.actionOutputs[3..7]',
    via: 'Raw outputs before unit conversion; curiosity also combines novelty and other terms.',
    carry: (_s, m) => m.meta.slice(3, 8),
  },
  {
    from: 'instinct',
    to: 'plan',
    measurement: 'operands',
    source: 'spin.bestOverlap',
    via: 'Maximum absolute archetype overlap, multiplied by INSTINCT_GAIN for its selected plan.',
    carry: (s) => [numeric(s.spin?.bestOverlap)],
  },
  {
    from: 'reservoir',
    to: 'plan',
    measurement: 'operands',
    source: 'reservoir.novelty',
    via: 'Reservoir novelty is one weighted curiosity operand, not the full EXPLORE score.',
    carry: (s) => [numeric(s.reservoir?.novelty)],
  },
  {
    from: 'memory',
    to: 'senses',
    measurement: 'payload',
    source: 'observatory.senses[13]',
    via: 'Prior memory mean read before this beat writes the ring; final ring mean can differ.',
    carry: (_s, m) => [numeric(m.senses[13])],
  },
];

/** Build the measured module graph of one snapshot. Pure; copies every value it reads. */
export function buildBrainGraph(s: SuperMindSnapshot): BrainGraph {
  const raw = {} as Record<BrainModuleId, number[]>;
  const available = s.observatory.tick > 0 && s.observatory.mode !== 'unstarted';
  for (const spec of MODULE_SPECS) raw[spec.id] = available ? spec.read(s) : [];
  const modules: BrainModule[] = MODULE_SPECS.map((spec) => {
    const values = raw[spec.id];
    return {
      id: spec.id,
      label: spec.label,
      source: spec.source,
      params: spec.params,
      note:
        MODULE_NOTES[spec.id] ??
        'Selected state/output; parameters count only the associated fixed core TinyMLP, including biases. Zero does not mean weightless.',
      column: spec.column,
      hue: spec.hue,
      values,
      rms: rmsOf(values),
      maxAbs: maxAbsOf(values),
    };
  });
  const edges: BrainEdge[] = available
    ? EDGE_SPECS.filter(
        (e) => !(e.from === 'search' && e.to === 'imagitron' && s.observatory.activeDepths < 2),
      ).map((e) => {
        const carried = e.carry(s, raw).map(numeric);
        return {
          from: e.from,
          to: e.to,
          via: e.via,
          source: e.source,
          measurement: carried.length ? e.measurement : 'unavailable',
          carried,
          rms: rmsOf(carried),
        };
      })
    : [];
  const invalid = modules.reduce(
    (n, m) => n + m.values.filter((v) => !Number.isFinite(v)).length,
    0,
  );
  const unavailable = edges.filter((e) => !Number.isFinite(e.rms)).length;
  return {
    tick: s.observatory.tick,
    mode: s.observatory.mode,
    plan: String(s.plan),
    paramCount: s.paramCount,
    warning: !available
      ? 'No completed cognition tick; state unavailable.'
      : invalid || unavailable
        ? String(invalid) +
          ' invalid module value(s); ' +
          unavailable +
          ' invalid/unavailable relationship(s).'
        : undefined,
    modules,
    edges,
    units: modules.reduce((n, m) => n + m.values.length, 0),
  };
}

/** Plain-text dump of the exact numbers the two views draw (for the details panel and export). */
export function brainGraphText(g: BrainGraph): string {
  const f = (v: number): string => (Object.is(v, -0) ? '-0' : String(v));
  const mods = g.modules.map(
    (m) =>
      `${m.label} (${m.source}, ${m.params} core-MLP parameters; ${m.note}) rms ${f(m.rms)} max|v| ${f(m.maxAbs)} n ${m.values.length}: [${m.values.map(f).join(', ')}]`,
  );
  const edges = g.edges.map(
    (e) =>
      `${e.from} → ${e.to} · rms ${f(e.rms)} · ${e.measurement}; ${e.source}; ${e.via}: [${e.carried.map(f).join(', ')}]`,
  );
  return `tick ${g.tick} (${g.mode}) · plan ${g.plan} · ${g.units} values · ${g.edges.length} partial relationships\n${g.warning ?? ''}\nMODULES\n${mods.join('\n')}\nFLOWS\n${edges.join('\n')}`;
}

// ── rendering ────────────────────────────────────────────────────────────────────────────────────
const BG = '#03010a';
const TEXT = '#e8dcff';
const DIM = '#8f7cba';

function font(ctx: CanvasRenderingContext2D, w: number, base: number, weight = ''): void {
  const k = Math.max(0.85, Math.min(2.2, w / 460));
  ctx.font = `${weight}${Math.max(9, base * k).toFixed(1)}px ui-monospace,monospace`;
}
function num(v: number): string {
  if (!Number.isFinite(v)) return 'unavailable';
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
}

/** Keep labels within their measured slot without shrinking below the readable font minimum. */
function fitted(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  width: number,
): void {
  let text = value;
  while (text.length > 1 && ctx.measureText(text).width > width) text = text.slice(0, -2) + '…';
  ctx.fillText(text, x, y);
}
function finiteMax(values: readonly number[]): number {
  return Math.max(1e-9, ...values.filter(Number.isFinite));
}
function strength(value: number, maximum: number): number {
  return Number.isFinite(value) ? Math.sqrt(Math.max(0, value) / maximum) : 0;
}
const SHORT_LABELS: Partial<Record<BrainModuleId, string>> = {
  cortex: 'WORKSPACE',
  imagitron: 'IMAGINE',
  quantum: 'Q-NET',
  search: 'SEARCH',
  reservoir: 'RESERVOIR',
  self: 'SELF',
  qubits: 'QUBITS',
  organs: 'ORGANS',
  memory: 'MEMORY',
};

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
  fitted(ctx, title, 8, 6, w - 16);
  ctx.fillStyle = DIM;
  font(ctx, w, 7);
  ctx.textBaseline = 'bottom';
  fitted(ctx, foot, 8, h - 4, w - 16);
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
    `CONNECTOME · ${g.modules.length} groups · ${g.edges.length} partial links · tick ${g.tick}`,
    g.warning ??
      'Partial graph · RMS scaled within view · dashed = unavailable · details: exact sources/values',
  );
  const compact = w < 620;
  const cols = compact ? 4 : 7;
  const top = 34;
  const bottom = h - 22;
  const left = compact ? 45 : 76;
  const right = w - left;
  const byCol: BrainModule[][] = Array.from({ length: cols }, () => []);
  g.modules.forEach((m, i) => byCol[compact ? i % cols : m.column]!.push(m));
  const pos = new Map<BrainModuleId, { x: number; y: number }>();
  byCol.forEach((list, c) => {
    const x = left + (c / (cols - 1)) * (right - left);
    list.forEach((m, i) => {
      pos.set(m.id, { x, y: top + ((i + 0.5) / list.length) * (bottom - top) });
    });
  });
  const nodeMax = finiteMax(g.modules.map((m) => m.rms));
  const edgeMax = finiteMax(g.edges.map((e) => e.rms));
  const hueOf = new Map(g.modules.map((m) => [m.id, m.hue]));
  for (const e of g.edges) {
    const a = pos.get(e.from)!;
    const b = pos.get(e.to)!;
    const k = strength(e.rms, edgeMax);
    const back = b.x <= a.x;
    const mx = (a.x + b.x) / 2;
    const my = back ? Math.min(a.y, b.y) - 26 : (a.y + b.y) / 2;
    ctx.strokeStyle = `hsla(${hueOf.get(e.from) ?? 200},90%,62%,${(0.12 + 0.75 * k).toFixed(2)})`;
    ctx.setLineDash(Number.isFinite(e.rms) ? [] : [3, 3]);
    ctx.lineWidth = 0.6 + 4.2 * k;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const m of g.modules) {
    const p = pos.get(m.id)!;
    const k = strength(m.rms, nodeMax);
    const r = 3.5 + (compact ? 5 : 9) * k;
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
    fitted(
      ctx,
      compact ? (SHORT_LABELS[m.id] ?? m.label) : m.id === 'plan' ? `PLAN · ${g.plan}` : m.label,
      p.x,
      p.y - r - 2,
      compact ? w / 4 - 8 : (w - 32) / 7,
    );
    ctx.textBaseline = 'top';
    font(ctx, w, 6.2);
    ctx.fillStyle = DIM;
    fitted(ctx, `rms ${num(m.rms)}`, p.x, p.y + r + 2, compact ? w / 4 - 8 : (w - 32) / 7);
    // the module's actual values, scaled by its own largest |value|
    const sw = 40;
    const sh = 8;
    const sx = p.x - sw / 2;
    const sy = p.y + r + 12;
    const n = m.values.length;
    const scale = finiteMax(m.values.map((v) => Math.abs(v)));
    for (let i = 0; i < n; i++) {
      const raw = m.values[i];
      if (raw === undefined || !Number.isFinite(raw)) continue;
      const v = raw / scale;
      const bw = sw / n;
      ctx.fillStyle =
        v >= 0 ? `hsla(${m.hue},90%,65%,0.9)` : `hsla(${(m.hue + 180) % 360},90%,65%,0.9)`;
      const hh = Math.abs(v) * (sh / 2);
      ctx.fillRect(
        sx + i * bw,
        v >= 0 ? sy + sh / 2 - hh : sy + sh / 2,
        Math.max(0.4, bw - 0.2),
        hh,
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
 * vertices. The camera is fixed: changing only the tick changes the status text, never geometry.
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
    `MEGA 4D · ${g.units} value slots · ${g.edges.length} partial links · tick ${g.tick}`,
    g.warning ??
      'Fixed layout · dot = valid value · magnitude scaled per group · dotted links unavailable',
  );
  const cx = w / 2;
  const legendTop = h - 100;
  const graphBottom = legendTop - 12;
  const cy = (34 + graphBottom) / 2;
  const s = Math.min(w, graphBottom - 34) * 0.36;
  const a = 0.42;
  const b = 0.26;
  const c = 0.66;
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
  const edgeMax = finiteMax(g.edges.map((e) => e.rms));
  const hueOf = new Map(g.modules.map((m) => [m.id, m.hue]));
  for (const e of g.edges) {
    const p = vp[VERTEX[e.from]]!;
    const q = vp[VERTEX[e.to]]!;
    const k = strength(e.rms, edgeMax);
    ctx.strokeStyle = `hsla(${hueOf.get(e.from) ?? 200},95%,62%,${(0.15 + 0.7 * k).toFixed(2)})`;
    ctx.setLineDash(Number.isFinite(e.rms) ? [] : [3, 3]);
    ctx.lineWidth = 0.5 + 3.5 * k;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const m of g.modules) {
    const base = TESS[VERTEX[m.id]]!;
    const n = m.values.length;
    const radius = 0.07 + 0.022 * Math.sqrt(n);
    const scale = finiteMax(m.values.map((v) => Math.abs(v)));
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
      const raw = m.values[i];
      if (raw === undefined || !Number.isFinite(raw)) continue;
      const v = raw / scale;
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
    const index = g.modules.indexOf(m);
    ctx.fillText(String(index + 1).padStart(2, '0'), lp.x, lp.y - 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    fitted(
      ctx,
      String(index + 1).padStart(2, '0') + ' ' + (SHORT_LABELS[m.id] ?? m.label),
      8 + ((index % 4) * (w - 16)) / 4,
      legendTop + Math.floor(index / 4) * 18,
      (w - 16) / 4 - 6,
    );
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}
