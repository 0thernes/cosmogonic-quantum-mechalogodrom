#!/usr/bin/env bun
/**
 * alife-comparison-geometry.ts — the EXTENDED geometry/statistics battery behind the A-Life
 * comparative deep-dive. Companion to `alife-comparison-stats.ts` (which owns the breadth z-scores,
 * per-axis σ-table, correlation, and the original five charts). This script never re-asserts those;
 * it adds the higher-order multivariate geometry the deep-dive cites, all COMPUTED from the single
 * source CSV (`docs/reports/2026-06-26-alife-comparison-matrix.csv`) — never hand-typed:
 *
 *   - PCA (correlation-matrix eigendecomposition via Jacobi rotation): 2D projection + loadings +
 *     explained-variance spectrum.
 *   - Full 26×26 Euclidean distance matrix (9-axis feature space).
 *   - Agglomerative hierarchical clustering (average linkage, Lance–Williams) → dendrogram + flat cuts.
 *   - Pareto frontier in (breadth ↑, peer-maturity ↑) + 9-D dominance counts for Cosmogonic.
 *   - Capability-profile Shannon evenness + Gini (generalist↔specialist index) for all 26 systems.
 *   - 9×9 axis co-occurrence correlation matrix (which capabilities travel together in the field).
 *   - Mahalanobis distance of Cosmogonic from the 25-peer centroid (ridge-regularized Σ⁻¹).
 *
 * Pure + deterministic: no Math.random / Date.now; identical CSV -> identical bytes out.
 * Outputs under docs/reports/assets/ (version-controlled, diffable):
 *   alife-geometry.json · alife-pca.svg · alife-dendrogram.svg · alife-distance-matrix.svg
 *   · alife-axis-correlation.svg · alife-entropy.svg · alife-pareto.svg
 *
 *   bun scripts/alife-comparison-geometry.ts
 */
import { mean, standardDeviation, sampleCorrelation } from 'simple-statistics';

const ROOT = `${import.meta.dir}/..`;
const CSV = `${ROOT}/docs/reports/2026-06-26-alife-comparison-matrix.csv`;
const OUT = `${ROOT}/docs/reports/assets`;

const AXES = [
  'Reproduction',
  'Open-endedness',
  'Ecology',
  'Morphology/Physics',
  'Cognition/Learning',
  'Substrate pluralism',
  'Instrumentation',
  'Consciousness-theory',
  'Visual scale',
] as const;
const NAX = AXES.length;

interface Row {
  project: string;
  axes: number[];
  peerMaturity: number;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 && r[0]!.trim().length > 0);
}

function parseRows(text: string): Row[] {
  const grid = parseCsv(text);
  return grid.slice(1).map((c) => ({
    project: c[0]!.trim(),
    axes: c.slice(3, 3 + NAX).map((x) => Number(x)),
    peerMaturity: Number(c[12]),
  }));
}

const round = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;
const breadthOf = (r: Row): number => mean(r.axes);
const isCosmo = (p: string): boolean => p.startsWith('Cosmogonic');
const euclid = (a: number[], b: number[]): number =>
  Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0));

const ABBR: Record<string, string> = {
  'Cosmogonic Quantum Mechalogodrom': 'COSMOGONIC',
  'Conway Game of Life': 'Game of Life',
  'Karl Sims Evolved Virtual Creatures': 'Karl Sims VC',
  'Growing Neural Cellular Automata': 'Growing NCA',
  'Biomorphs / Blind Watchmaker': 'Biomorphs',
  'Gene Pool / Swimbots': 'Gene Pool',
  'Enhanced POET': 'POET',
  'Evolution Gym': 'EvoGym',
};
const short = (p: string): string => ABBR[p] ?? p;

// ── linear algebra (deterministic, dependency-free) ───────────────────────────
type Mat = number[][];
const zeros = (n: number, m: number): Mat =>
  Array.from({ length: n }, () => Array.from({ length: m }, () => 0));

function jacobiEigen(Ain: Mat, sweeps = 100): { values: number[]; vectors: Mat } {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const V = zeros(n, n);
  for (let i = 0; i < n; i++) V[i]![i] = 1;
  for (let s = 0; s < sweeps; s++) {
    // largest off-diagonal
    let p = 0;
    let q = 1;
    let mx = -1;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs(A[i]![j]!);
        if (v > mx) {
          mx = v;
          p = i;
          q = j;
        }
      }
    if (mx < 1e-12) break;
    const app = A[p]![p]!;
    const aqq = A[q]![q]!;
    const apq = A[p]![q]!;
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    for (let i = 0; i < n; i++) {
      const aip = A[i]![p]!;
      const aiq = A[i]![q]!;
      A[i]![p] = c * aip - sn * aiq;
      A[i]![q] = sn * aip + c * aiq;
    }
    for (let i = 0; i < n; i++) {
      const api = A[p]![i]!;
      const aqi = A[q]![i]!;
      A[p]![i] = c * api - sn * aqi;
      A[q]![i] = sn * api + c * aqi;
    }
    for (let i = 0; i < n; i++) {
      const vip = V[i]![p]!;
      const viq = V[i]![q]!;
      V[i]![p] = c * vip - sn * viq;
      V[i]![q] = sn * vip + c * viq;
    }
  }
  const values = A.map((_, i) => A[i]![i]!);
  // columns of V are eigenvectors
  const vectors = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) vectors[j]![i] = V[i]![j]!;
  // sort desc by eigenvalue
  const idx = values.map((_, i) => i).sort((a, b) => values[b]! - values[a]!);
  return {
    values: idx.map((i) => values[i]!),
    vectors: idx.map((i) => vectors[i]!),
  };
}

function invert(Ain: Mat): Mat {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i]![i] = 1;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r]![col]!) > Math.abs(A[piv]![col]!)) piv = r;
    [A[col], A[piv]] = [A[piv]!, A[col]!];
    [I[col], I[piv]] = [I[piv]!, I[col]!];
    const d = A[col]![col]! || 1e-12;
    for (let j = 0; j < n; j++) {
      A[col]![j]! /= d;
      I[col]![j]! /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r]![col]!;
      for (let j = 0; j < n; j++) {
        A[r]![j]! -= f * A[col]![j]!;
        I[r]![j]! -= f * I[col]![j]!;
      }
    }
  }
  return I;
}

// ── SVG theme (matches alife-comparison-stats.ts) ─────────────────────────────
const BG = '#0b1220';
const GRID = '#27344d';
const TEXT = '#cbd5e1';
const MUTE = '#7c8aa5';
const PEER = '#38bdf8';
const COSMO = '#f59e0b';
const NEAR = '#34d399';
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function svgDoc(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif" role="img" aria-label="${esc(title)}">
<rect width="${w}" height="${h}" rx="14" fill="${BG}"/>
${body}
</svg>`;
}
// blue->cyan->amber heat ramp shared by the matrix/correlation charts
function heat(t: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [12, 20, 36]],
    [0.55, [34, 211, 238]],
    [1, [245, 158, 11]],
  ];
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++)
    if (t >= stops[i]![0] && t <= stops[i + 1]![0]) {
      lo = stops[i]!;
      hi = stops[i + 1]!;
      break;
    }
  const f = (t - lo[0]) / (hi[0] - lo[0] || 1);
  const c = lo[1].map((v, k) => Math.round(v + (hi[1][k]! - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// diverging ramp for correlations [-1,1]: red <-0-> slate <-0-> cyan
function diverge(t: number): string {
  const x = Math.max(-1, Math.min(1, t));
  if (x >= 0) {
    const f = x;
    const c = [56 + (34 - 56) * f, 116 + (211 - 116) * f, 153 + (238 - 153) * f].map((v) =>
      Math.round(v),
    );
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  const f = -x;
  const c = [56 + (248 - 56) * f, 116 + (113 - 116) * f, 153 + (113 - 153) * f].map((v) =>
    Math.round(v),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ── 1. PCA ────────────────────────────────────────────────────────────────────
function pca(rows: Row[]): {
  scores: { name: string; pc1: number; pc2: number; cosmo: boolean }[];
  explained: number[];
  loadings: { pc1: { axis: string; w: number }[]; pc2: { axis: string; w: number }[] };
} {
  const n = rows.length;
  const cols = AXES.map((_, j) => rows.map((r) => r.axes[j]!));
  const mu = cols.map((c) => mean(c));
  const sd = cols.map((c) => standardDeviation(c) || 1);
  // standardized data matrix Z (n×NAX)
  const Z = rows.map((r) => r.axes.map((v, j) => (v - mu[j]!) / sd[j]!));
  // correlation matrix = (1/(n-1)) ZᵀZ
  const C = zeros(NAX, NAX);
  for (let a = 0; a < NAX; a++)
    for (let b = 0; b < NAX; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += Z[i]![a]! * Z[i]![b]!;
      C[a]![b] = s / (n - 1);
    }
  const { values, vectors } = jacobiEigen(C);
  const total = values.reduce((s, v) => s + Math.max(0, v), 0) || 1;
  const explained = values.map((v) => Math.max(0, v) / total);
  // sign convention: make the largest-magnitude loading positive (deterministic)
  const fixSign = (vec: number[]): number[] => {
    let mi = 0;
    for (let i = 1; i < vec.length; i++) if (Math.abs(vec[i]!) > Math.abs(vec[mi]!)) mi = i;
    return vec[mi]! < 0 ? vec.map((x) => -x) : vec;
  };
  const e1 = fixSign(vectors[0]!);
  const e2 = fixSign(vectors[1]!);
  const proj = (z: number[], e: number[]): number => z.reduce((s, v, i) => s + v * e[i]!, 0);
  const scores = rows.map((r, i) => ({
    name: short(r.project),
    pc1: round(proj(Z[i]!, e1), 3),
    pc2: round(proj(Z[i]!, e2), 3),
    cosmo: isCosmo(r.project),
  }));
  const load = (e: number[]): { axis: string; w: number }[] =>
    AXES.map((ax, j) => ({ axis: ax, w: round(e[j]!, 3) })).sort(
      (a, b) => Math.abs(b.w) - Math.abs(a.w),
    );
  return {
    scores,
    explained: explained.map((e) => round(e, 4)),
    loadings: { pc1: load(e1), pc2: load(e2) },
  };
}

function chartPca(p: ReturnType<typeof pca>): string {
  const w = 760;
  const h = 600;
  const padL = 60;
  const padR = 30;
  const padT = 70;
  const padB = 60;
  const xs = p.scores.map((s) => s.pc1);
  const ys = p.scores.map((s) => s.pc2);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const X = (v: number): number => padL + ((v - xmin) / (xmax - xmin || 1)) * (w - padL - padR);
  const Y = (v: number): number =>
    padT + (h - padT - padB) - ((v - ymin) / (ymax - ymin || 1)) * (h - padT - padB);
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">PCA of the 26 systems (9-axis correlation-matrix eigenbasis)</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">PC1 ${(p.explained[0]! * 100).toFixed(1)}% var · PC2 ${(p.explained[1]! * 100).toFixed(1)}% var · together ${((p.explained[0]! + p.explained[1]!) * 100).toFixed(1)}%. amber = this repo.</text>`;
  // axes through 0
  if (xmin < 0 && xmax > 0)
    b += `<line x1="${X(0)}" y1="${padT}" x2="${X(0)}" y2="${h - padB}" stroke="${GRID}" stroke-width="0.8"/>`;
  if (ymin < 0 && ymax > 0)
    b += `<line x1="${padL}" y1="${Y(0)}" x2="${w - padR}" y2="${Y(0)}" stroke="${GRID}" stroke-width="0.8"/>`;
  b += `<text x="${w - padR}" y="${Y(ymin) + 4}" fill="${MUTE}" font-size="11" text-anchor="end">PC1 (generalist breadth →)</text>`;
  b += `<text x="${padL - 6}" y="${padT - 8}" fill="${MUTE}" font-size="11">PC2</text>`;
  p.scores.forEach((s, i) => {
    const cx = X(s.pc1);
    const cy = Y(s.pc2);
    if (s.cosmo) {
      b += `<circle cx="${cx}" cy="${cy}" r="8" fill="${COSMO}"/><circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${COSMO}" stroke-width="1.4" opacity="0.6"/>`;
      b += `<text x="${cx - 12}" y="${cy - 12}" fill="${COSMO}" font-size="11" font-weight="700" text-anchor="end">${esc(s.name)}</text>`;
    } else {
      b += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${PEER}" opacity="0.85"/>`;
      const dy = i % 2 === 0 ? -8 : 14;
      b += `<text x="${cx + 7}" y="${cy + dy}" fill="${MUTE}" font-size="9">${esc(s.name)}</text>`;
    }
  });
  return svgDoc(w, h, b, 'PCA projection');
}

// ── 2. distance matrix ─────────────────────────────────────────────────────────
function distanceMatrix(rows: Row[]): number[][] {
  return rows.map((a) => rows.map((b) => round(euclid(a.axes, b.axes), 3)));
}
function chartDistance(rows: Row[], D: number[][], order: number[]): string {
  const n = rows.length;
  const cell = 20;
  const padL = 150;
  const padT = 150;
  const w = padL + n * cell + 20;
  const h = padT + n * cell + 20;
  const mx = Math.max(...D.flat());
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Pairwise distance matrix (Euclidean, 9-axis), clustered order</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">dark = near / similar capability shape · bright = far. rows+cols ordered by the dendrogram.</text>`;
  order.forEach((ri, i) => {
    const lab = short(rows[ri]!.project);
    const cosmo = isCosmo(rows[ri]!.project);
    b += `<text x="${padL - 8}" y="${padT + i * cell + cell / 2 + 3}" fill="${cosmo ? COSMO : TEXT}" font-size="9" font-weight="${cosmo ? 700 : 400}" text-anchor="end">${esc(lab)}</text>`;
    const tx = padL + i * cell + cell / 2;
    b += `<text x="${tx}" y="${padT - 8}" fill="${cosmo ? COSMO : MUTE}" font-size="9" text-anchor="start" transform="rotate(-55 ${tx} ${padT - 8})">${esc(lab)}</text>`;
  });
  order.forEach((ri, i) =>
    order.forEach((cj, j) => {
      const t = D[ri]![cj]! / (mx || 1);
      b += `<rect x="${padL + j * cell}" y="${padT + i * cell}" width="${cell - 1}" height="${cell - 1}" fill="${heat(t)}"/>`;
    }),
  );
  return svgDoc(w, h, b, 'Distance matrix');
}

// ── 3. hierarchical clustering (average linkage) ────────────────────────────────
interface Node {
  id: number;
  left?: Node;
  right?: Node;
  height: number;
  members: number[];
  leaf?: number;
}
function cluster(rows: Row[]): {
  root: Node;
  order: number[];
  merges: { a: string; b: string; height: number }[];
} {
  const n = rows.length;
  const base = rows.map((r) => r.axes);
  let nodes: Node[] = rows.map((_, i) => ({ id: i, height: 0, members: [i], leaf: i }));
  // distance between clusters = average pairwise leaf distance
  const dCluster = (x: Node, y: Node): number => {
    let s = 0;
    for (const i of x.members) for (const j of y.members) s += euclid(base[i]!, base[j]!);
    return s / (x.members.length * y.members.length);
  };
  const merges: { a: string; b: string; height: number }[] = [];
  let nextId = n;
  while (nodes.length > 1) {
    let bi = 0;
    let bj = 1;
    let bd = Infinity;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dCluster(nodes[i]!, nodes[j]!);
        if (d < bd - 1e-9) {
          bd = d;
          bi = i;
          bj = j;
        }
      }
    const a = nodes[bi]!;
    const c = nodes[bj]!;
    const label = (nd: Node): string =>
      nd.leaf !== undefined ? short(rows[nd.leaf]!.project) : `(${nd.members.length})`;
    merges.push({ a: label(a), b: label(c), height: round(bd, 3) });
    const merged: Node = {
      id: nextId++,
      left: a,
      right: c,
      height: bd,
      members: [...a.members, ...c.members],
    };
    nodes = nodes.filter((_, k) => k !== bi && k !== bj);
    nodes.push(merged);
  }
  const root = nodes[0]!;
  const order: number[] = [];
  const walk = (nd: Node): void => {
    if (nd.leaf !== undefined) order.push(nd.leaf);
    else {
      walk(nd.left!);
      walk(nd.right!);
    }
  };
  walk(root);
  return { root, order, merges };
}
function chartDendrogram(rows: Row[], root: Node, order: number[]): string {
  const n = rows.length;
  const padL = 30;
  const padR = 170;
  const padT = 70;
  const rowH = 22;
  const w = 760;
  const h = padT + n * rowH + 24;
  const maxH = root.height;
  const plotW = w - padL - padR;
  const X = (height: number): number => padL + (1 - height / (maxH || 1)) * plotW;
  const yOf: Record<number, number> = {};
  order.forEach((leaf, i) => (yOf[leaf] = padT + i * rowH + rowH / 2));
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Capability dendrogram (average-linkage, Euclidean 9-axis)</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">leaves grouped by capability-shape similarity; join depth = merge distance.</text>`;
  // recursively draw; returns y of node
  const draw = (nd: Node): number => {
    if (nd.leaf !== undefined) {
      const y = yOf[nd.leaf]!;
      const cosmo = isCosmo(rows[nd.leaf]!.project);
      b += `<text x="${w - padR + 8}" y="${y + 3}" fill="${cosmo ? COSMO : TEXT}" font-size="10" font-weight="${cosmo ? 700 : 400}">${esc(short(rows[nd.leaf]!.project))}</text>`;
      return y;
    }
    const yl = draw(nd.left!);
    const yr = draw(nd.right!);
    const x = X(nd.height);
    const xl = nd.left!.leaf !== undefined ? w - padR : X(nd.left!.height);
    const xr = nd.right!.leaf !== undefined ? w - padR : X(nd.right!.height);
    const col = nd.members.some((m) => isCosmo(rows[m]!.project)) ? COSMO : NEAR;
    b += `<path d="M${x} ${yl} H${xl}" stroke="${col}" stroke-width="1.3" fill="none" opacity="0.85"/>`;
    b += `<path d="M${x} ${yr} H${xr}" stroke="${col}" stroke-width="1.3" fill="none" opacity="0.85"/>`;
    b += `<path d="M${x} ${yl} V${yr}" stroke="${col}" stroke-width="1.3" fill="none" opacity="0.85"/>`;
    return (yl + yr) / 2;
  };
  draw(root);
  return svgDoc(w, h, b, 'Dendrogram');
}

// ── 4. Pareto frontier (breadth ↑, maturity ↑) ─────────────────────────────────
function pareto(
  rows: Row[],
): { name: string; breadth: number; maturity: number; onFront: boolean; cosmo: boolean }[] {
  const pts = rows.map((r) => ({
    name: short(r.project),
    breadth: round(breadthOf(r), 3),
    maturity: r.peerMaturity,
    cosmo: isCosmo(r.project),
  }));
  return pts.map((p) => ({
    ...p,
    onFront: !pts.some(
      (q) =>
        q !== p &&
        q.breadth >= p.breadth &&
        q.maturity >= p.maturity &&
        (q.breadth > p.breadth || q.maturity > p.maturity),
    ),
  }));
}
function chartPareto(pts: ReturnType<typeof pareto>): string {
  const w = 720;
  const h = 540;
  const padL = 70;
  const padR = 30;
  const padT = 70;
  const padB = 60;
  const X = (v: number): number => padL + (v / 5) * (w - padL - padR);
  const Y = (v: number): number => padT + (h - padT - padB) - (v / 5) * (h - padT - padB);
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Pareto frontier — breadth vs peer maturity</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">green ring = non-dominated (Pareto-optimal). no system beats Cosmogonic on breadth; many beat it on maturity.</text>`;
  for (let g = 0; g <= 5; g++) {
    b += `<line x1="${X(g)}" y1="${padT}" x2="${X(g)}" y2="${h - padB}" stroke="${GRID}" stroke-width="0.6"/>`;
    b += `<line x1="${padL}" y1="${Y(g)}" x2="${w - padR}" y2="${Y(g)}" stroke="${GRID}" stroke-width="0.6"/>`;
    b += `<text x="${X(g)}" y="${h - padB + 16}" fill="${MUTE}" font-size="10" text-anchor="middle">${g}</text>`;
    b += `<text x="${padL - 8}" y="${Y(g) + 3}" fill="${MUTE}" font-size="10" text-anchor="end">${g}</text>`;
  }
  b += `<text x="${(w + padL) / 2}" y="${h - 14}" fill="${TEXT}" font-size="12" text-anchor="middle">peer maturity →</text>`;
  b += `<text x="20" y="${(padT + h - padB) / 2}" fill="${TEXT}" font-size="12" text-anchor="middle" transform="rotate(-90 20 ${(padT + h - padB) / 2})">breadth →</text>`;
  // connect front
  const front = pts.filter((p) => p.onFront).sort((a, b2) => a.maturity - b2.maturity);
  if (front.length > 1)
    b += `<polyline points="${front.map((p) => `${X(p.maturity)},${Y(p.breadth)}`).join(' ')}" fill="none" stroke="${NEAR}" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>`;
  pts.forEach((p, i) => {
    const cx = X(p.maturity);
    const cy = Y(p.breadth);
    if (p.cosmo) {
      b += `<circle cx="${cx}" cy="${cy}" r="8" fill="${COSMO}"/><circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${NEAR}" stroke-width="1.8"/>`;
      b += `<text x="${cx - 12}" y="${cy - 10}" fill="${COSMO}" font-size="11" font-weight="700" text-anchor="end">${esc(p.name)}</text>`;
    } else {
      b += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${PEER}" opacity="0.85"/>`;
      if (p.onFront)
        b += `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="${NEAR}" stroke-width="1.5"/>`;
      const dy = i % 2 === 0 ? -8 : 14;
      b += `<text x="${cx + 7}" y="${cy + dy}" fill="${MUTE}" font-size="9">${esc(p.name)}</text>`;
    }
  });
  return svgDoc(w, h, b, 'Pareto frontier');
}

// ── 5. capability evenness (entropy / Gini) ─────────────────────────────────────
function evenness(
  rows: Row[],
): { name: string; evenness: number; gini: number; breadth: number; cosmo: boolean }[] {
  return rows
    .map((r) => {
      const sum = r.axes.reduce((s, v) => s + v, 0) || 1;
      const p = r.axes.map((v) => v / sum);
      const H = -p.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
      const Hn = H / Math.log(NAX);
      // Gini of the raw axis vector
      const v = [...r.axes].sort((a, b) => a - b);
      const m = mean(v) || 1;
      let g = 0;
      for (let i = 0; i < NAX; i++) for (let j = 0; j < NAX; j++) g += Math.abs(v[i]! - v[j]!);
      const gini = g / (2 * NAX * NAX * m);
      return {
        name: short(r.project),
        evenness: round(Hn, 3),
        gini: round(gini, 3),
        breadth: round(breadthOf(r), 3),
        cosmo: isCosmo(r.project),
      };
    })
    .sort((a, b) => b.evenness - a.evenness);
}
function chartEvenness(rows: ReturnType<typeof evenness>): string {
  const padL = 168;
  const padR = 56;
  const padT = 64;
  const rowH = 22;
  const w = 760;
  const h = padT + rows.length * rowH + 28;
  const plotW = w - padL - padR;
  const X = (v: number): number => padL + v * plotW;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Capability evenness — generalist ↔ specialist</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">normalized Shannon evenness of the 9-axis profile (1 = perfectly balanced generalist, 0 = single-axis specialist).</text>`;
  for (let g = 0; g <= 10; g += 2) {
    const gx = X(g / 10);
    b += `<line x1="${gx}" y1="${padT - 8}" x2="${gx}" y2="${padT + rows.length * rowH}" stroke="${GRID}" stroke-width="0.7"/>`;
    b += `<text x="${gx}" y="${padT + rows.length * rowH + 18}" fill="${MUTE}" font-size="10" text-anchor="middle">${(g / 10).toFixed(1)}</text>`;
  }
  rows.forEach((d, i) => {
    const y = padT + i * rowH;
    const col = d.cosmo ? COSMO : PEER;
    b += `<text x="${padL - 10}" y="${y + rowH / 2 + 4}" fill="${d.cosmo ? COSMO : TEXT}" font-size="11" font-weight="${d.cosmo ? 700 : 400}" text-anchor="end">${esc(d.name)}</text>`;
    b += `<rect x="${padL}" y="${y + 4}" width="${Math.max(1, X(d.evenness) - padL)}" height="${rowH - 8}" rx="3" fill="${col}" opacity="${d.cosmo ? 0.95 : 0.7}"/>`;
    b += `<text x="${X(d.evenness) + 6}" y="${y + rowH / 2 + 4}" fill="${d.cosmo ? COSMO : MUTE}" font-size="10" font-weight="${d.cosmo ? 700 : 400}">${d.evenness.toFixed(3)}</text>`;
  });
  return svgDoc(w, h, b, 'Capability evenness');
}

// ── 6. axis co-occurrence correlation (9×9) ─────────────────────────────────────
function axisCorrelation(rows: Row[]): number[][] {
  const cols = AXES.map((_, j) => rows.map((r) => r.axes[j]!));
  return AXES.map((_, a) =>
    AXES.map((_, b) => {
      const ca = cols[a]!;
      const cb = cols[b]!;
      if (standardDeviation(ca) === 0 || standardDeviation(cb) === 0) return a === b ? 1 : 0;
      return round(sampleCorrelation(ca, cb), 3);
    }),
  );
}
function chartAxisCorr(M: number[][]): string {
  const cell = 46;
  const padL = 150;
  const padT = 150;
  const w = padL + NAX * cell + 20;
  const h = padT + NAX * cell + 20;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Axis co-occurrence correlation (which capabilities travel together)</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">Pearson r across all 26 systems. cyan = co-occur · red = trade off · slate = independent.</text>`;
  AXES.forEach((a, j) => {
    b += `<text x="${padL - 8}" y="${padT + j * cell + cell / 2 + 3}" fill="${TEXT}" font-size="9" text-anchor="end">${esc(a)}</text>`;
    const tx = padL + j * cell + cell / 2;
    b += `<text x="${tx}" y="${padT - 8}" fill="${MUTE}" font-size="9" transform="rotate(-55 ${tx} ${padT - 8})">${esc(a)}</text>`;
  });
  M.forEach((rowv, i) =>
    rowv.forEach((v, j) => {
      const x = padL + j * cell;
      const y = padT + i * cell;
      b += `<rect x="${x}" y="${y}" width="${cell - 1}" height="${cell - 1}" fill="${diverge(v)}"/>`;
      b += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3}" fill="${Math.abs(v) > 0.5 ? '#0b1220' : '#9fb3d1'}" font-size="9" text-anchor="middle">${v.toFixed(2)}</text>`;
    }),
  );
  return svgDoc(w, h, b, 'Axis correlation');
}

// ── 7. Mahalanobis distance from peer centroid ──────────────────────────────────
function mahalanobis(
  rows: Row[],
  ridge = 0.15,
): { d: number; d2: number; ridge: number; eqEuclidSigma: number } {
  const cosmo = rows.find((r) => isCosmo(r.project))!;
  const peers = rows.filter((r) => !isCosmo(r.project));
  const mu = AXES.map((_, j) => mean(peers.map((r) => r.axes[j]!)));
  const Cov = zeros(NAX, NAX);
  const n = peers.length;
  for (let a = 0; a < NAX; a++)
    for (let b = 0; b < NAX; b++) {
      let s = 0;
      for (const r of peers) s += (r.axes[a]! - mu[a]!) * (r.axes[b]! - mu[b]!);
      Cov[a]![b] = s / (n - 1);
    }
  for (let i = 0; i < NAX; i++) Cov[i]![i]! += ridge; // regularize (consciousness-theory ~ singular)
  const inv = invert(Cov);
  const diff = cosmo.axes.map((v, j) => v - mu[j]!);
  let d2 = 0;
  for (let a = 0; a < NAX; a++)
    for (let b = 0; b < NAX; b++) d2 += diff[a]! * inv[a]![b]! * diff[b]!;
  // average peer Mahalanobis for reference scale
  let peerMean = 0;
  for (const r of peers) {
    const df = r.axes.map((v, j) => v - mu[j]!);
    let pd2 = 0;
    for (let a = 0; a < NAX; a++)
      for (let b = 0; b < NAX; b++) pd2 += df[a]! * inv[a]![b]! * df[b]!;
    peerMean += Math.sqrt(Math.max(0, pd2));
  }
  peerMean /= peers.length;
  return {
    d: round(Math.sqrt(Math.max(0, d2)), 3),
    d2: round(d2, 3),
    ridge,
    eqEuclidSigma: round(Math.sqrt(Math.max(0, d2)) / (peerMean || 1), 3),
  };
}

// ── main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const rows = parseRows(await Bun.file(CSV).text());
  const cosmo = rows.find((r) => isCosmo(r.project))!;
  const peers = rows.filter((r) => !isCosmo(r.project));

  const p = pca(rows);
  const D = distanceMatrix(rows);
  const { root, order, merges } = cluster(rows);
  const par = pareto(rows);
  const even = evenness(rows);
  const corr = axisCorrelation(rows);
  const maha = mahalanobis(rows);

  // 9-D Pareto dominance for Cosmogonic
  const dominatesCosmo = peers.filter(
    (r) => r.axes.every((v, j) => v >= cosmo.axes[j]!) && r.axes.some((v, j) => v > cosmo.axes[j]!),
  );
  const cosmoDominates = peers.filter(
    (r) => cosmo.axes.every((v, j) => v >= r.axes[j]!) && cosmo.axes.some((v, j) => v > r.axes[j]!),
  );

  // per-axis percentile rank for Cosmogonic
  const perAxisPercentile = AXES.map((ax, j) => {
    const col = rows.map((r) => r.axes[j]!);
    const le = col.filter((v) => v <= cosmo.axes[j]!).length;
    return { axis: ax, score: cosmo.axes[j]!, percentile: round((le / col.length) * 100, 1) };
  });

  // ratios
  const cosmoBreadth = breadthOf(cosmo);
  const emptyAxes = [4, 5, 7]; // cognition, substrate, consciousness (0-based in AXES)
  const emptyLeadShare = round(
    emptyAxes.reduce((s, j) => s + (cosmo.axes[j]! - mean(rows.map((r) => r.axes[j]!))), 0) /
      AXES.reduce((s, _, j) => s + (cosmo.axes[j]! - mean(rows.map((r) => r.axes[j]!))), 0),
    3,
  );

  const geometry = {
    generatedFrom: 'docs/reports/2026-06-26-alife-comparison-matrix.csv',
    note: 'extended multivariate geometry; companion to alife-stats.json. deterministic.',
    pca: { explainedVariance: p.explained, topLoadings: p.loadings, scores: p.scores },
    clustering: { mergeOrderLeaves: order.map((i) => short(rows[i]!.project)), merges },
    pareto: {
      front: par.filter((x) => x.onFront).map((x) => x.name),
      cosmogonicOnFront: par.find((x) => x.cosmo)!.onFront,
      dominatedByCount9d: dominatesCosmo.length,
      dominatesCount9d: cosmoDominates.length,
      dominatesNames: cosmoDominates.map((r) => short(r.project)),
    },
    evenness: even.map((e) => ({ name: e.name, evenness: e.evenness, gini: e.gini })),
    cosmogonicEvenness: even.find((e) => e.cosmo),
    axisCorrelation: { axes: AXES, matrix: corr },
    mahalanobis: maha,
    perAxisPercentile,
    ratios: {
      breadthOverMaturity: round(cosmoBreadth / cosmo.peerMaturity, 3),
      emptyAxisLeadShare: emptyLeadShare,
      breadthMean: round(cosmoBreadth, 3),
    },
  };

  await Bun.write(`${OUT}/alife-geometry.json`, JSON.stringify(geometry, null, 2) + '\n');
  await Bun.write(`${OUT}/alife-pca.svg`, chartPca(p));
  await Bun.write(`${OUT}/alife-distance-matrix.svg`, chartDistance(rows, D, order));
  await Bun.write(`${OUT}/alife-dendrogram.svg`, chartDendrogram(rows, root, order));
  await Bun.write(`${OUT}/alife-pareto.svg`, chartPareto(par));
  await Bun.write(`${OUT}/alife-entropy.svg`, chartEvenness(even));
  await Bun.write(`${OUT}/alife-axis-correlation.svg`, chartAxisCorr(corr));

  const L: string[] = [];
  L.push(`A-LIFE EXTENDED GEOMETRY — ${rows.length} systems`);
  L.push(
    `  PCA explained: PC1 ${(p.explained[0]! * 100).toFixed(1)}%  PC2 ${(p.explained[1]! * 100).toFixed(1)}%  (sum ${((p.explained[0]! + p.explained[1]!) * 100).toFixed(1)}%)`,
  );
  L.push(
    `  PC1 top loadings: ${p.loadings.pc1
      .slice(0, 4)
      .map((l) => `${l.axis} ${l.w}`)
      .join(', ')}`,
  );
  L.push(
    `  Cosmogonic PCA: pc1 ${p.scores.find((s) => s.cosmo)!.pc1}  pc2 ${p.scores.find((s) => s.cosmo)!.pc2}`,
  );
  L.push(
    `  Pareto: Cosmogonic on front = ${geometry.pareto.cosmogonicOnFront}; front = ${geometry.pareto.front.join(', ')}`,
  );
  L.push(
    `  9-D dominance: dominated-by ${dominatesCosmo.length}, dominates ${cosmoDominates.length} (${geometry.pareto.dominatesNames.join(', ')})`,
  );
  L.push(
    `  Cosmogonic evenness ${geometry.cosmogonicEvenness!.evenness} (gini ${geometry.cosmogonicEvenness!.gini}); most-generalist rank #${even.findIndex((e) => e.cosmo) + 1}/${rows.length}`,
  );
  L.push(
    `  Mahalanobis(Cosmo vs peer centroid, ridge ${maha.ridge}) = ${maha.d}  (~${maha.eqEuclidSigma}× mean peer Mahalanobis)`,
  );
  L.push(
    `  breadth/maturity ratio ${geometry.ratios.breadthOverMaturity}; empty-axis lead share ${geometry.ratios.emptyAxisLeadShare}`,
  );
  L.push(`  clustered leaf order: ${order.map((i) => short(rows[i]!.project)).join(' · ')}`);
  L.push(`  wrote 6 SVG charts + alife-geometry.json to docs/reports/assets/`);
  console.log(L.join('\n'));
}

void main();
