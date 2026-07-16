#!/usr/bin/env bun
/**
 * alife-comparison-stats.ts — the MEASUREMENT engine behind the A-Life comparative audit.
 *
 * Dr. Manhattan's law applied to the comparison: every statistic and every chart in
 * `docs/reports/2026-07-01-25-POINT-SCRUTINY-SCORECARD.md` is COMPUTED here from the single source CSV
 * (`docs/reports/2026-06-26-alife-comparison-matrix.csv`) — never hand-asserted. Re-run to regenerate:
 *
 *   bun scripts/alife-comparison-stats.ts            # print the stats block + (re)write charts/JSON
 *
 * Outputs (all under docs/reports/assets/, all version-controlled + diffable):
 *   - alife-stats.json                  machine-readable receipts (every figure the audit cites)
 *   - alife-breadth-ranked.svg          ranked breadth-of-synthesis bar chart (all systems)
 *   - alife-breadth-vs-maturity.svg     breadth vs peer-maturity scatter (the "broad but immature" map)
 *   - alife-radar-profile.svg           9-axis radar: Cosmogonic vs survey mean vs nearest peer
 *   - alife-nearest-neighbors.svg       Euclidean nearest neighbours in 9-axis feature space
 *   - alife-axis-heatmap.svg            full systems x 9-axis capability heatmap
 *
 * Pure + deterministic: no Math.random / Date.now; identical CSV -> identical bytes out.
 */
import { mean, standardDeviation, sampleCorrelation } from 'simple-statistics';
import { escapeMarkupAttribute, escapeMarkupText } from './markup-escape';

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
  era: string;
  type: string;
  axes: number[];
  peerMaturity: number;
  confidence: number;
  sourceUrl: string;
  basis: string;
}

/** RFC-4180-ish CSV parse: handles quoted fields containing commas + escaped quotes. */
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
  const body = grid.slice(1); // drop header
  return body.map((c) => ({
    project: c[0]!.trim(),
    era: c[1]!.trim(),
    type: c[2]!.trim(),
    axes: c.slice(3, 3 + NAX).map((x) => Number(x)),
    peerMaturity: Number(c[12]),
    confidence: Number(c[13]),
    sourceUrl: (c[14] ?? '').trim(),
    basis: (c[15] ?? '').trim(),
  }));
}

const round = (x: number, d = 2): number => Math.round(x * 10 ** d) / 10 ** d;
const breadthOf = (r: Row): number => mean(r.axes);
const euclid = (a: number[], b: number[]): number =>
  Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0));

// ─────────────────────────────────────────────────────────────────────────────
// SVG primitives (hand-rolled, dependency-free, theme: dark card).
// ─────────────────────────────────────────────────────────────────────────────
const BG = '#0b1220';
const GRID = '#27344d';
const TEXT = '#cbd5e1';
const MUTE = '#7c8aa5';
const PEER = '#38bdf8';
const COSMO = '#f59e0b';
const MEANC = '#a78bfa';
const NEAR = '#34d399';

const esc = escapeMarkupText;

function svgDoc(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif" role="img" aria-label="${escapeMarkupAttribute(title)}">
<rect width="${w}" height="${h}" rx="14" fill="${BG}"/>
${body}
</svg>`;
}

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
const isCosmo = (p: string): boolean => p.startsWith('Cosmogonic');

// 1 ── ranked breadth bar chart ────────────────────────────────────────────────
function chartRanked(rows: Row[]): string {
  const data = rows
    .map((r) => ({ name: short(r.project), v: breadthOf(r), cosmo: isCosmo(r.project) }))
    .sort((a, b) => b.v - a.v);
  const padL = 168;
  const padR = 56;
  const padT = 64;
  const rowH = 22;
  const w = 760;
  const h = padT + data.length * rowH + 28;
  const plotW = w - padL - padR;
  const max = 5;
  const x = (v: number): number => padL + (v / max) * plotW;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Breadth of integrated mechanisms — ranked</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">mean of 9 implementation axes (0–5). amber = this repo. n=${data.length}.</text>`;
  for (let g = 0; g <= max; g++) {
    const gx = x(g);
    b += `<line x1="${gx}" y1="${padT - 8}" x2="${gx}" y2="${padT + data.length * rowH}" stroke="${GRID}" stroke-width="1"/>`;
    b += `<text x="${gx}" y="${padT + data.length * rowH + 18}" fill="${MUTE}" font-size="10" text-anchor="middle">${g}</text>`;
  }
  data.forEach((d, i) => {
    const y = padT + i * rowH;
    const col = d.cosmo ? COSMO : PEER;
    b += `<text x="${padL - 10}" y="${y + rowH / 2 + 4}" fill="${d.cosmo ? COSMO : TEXT}" font-size="11" font-weight="${d.cosmo ? 700 : 400}" text-anchor="end">${esc(d.name)}</text>`;
    b += `<rect x="${padL}" y="${y + 4}" width="${Math.max(1, x(d.v) - padL)}" height="${rowH - 8}" rx="3" fill="${col}" opacity="${d.cosmo ? 0.95 : 0.7}"/>`;
    b += `<text x="${x(d.v) + 6}" y="${y + rowH / 2 + 4}" fill="${d.cosmo ? COSMO : MUTE}" font-size="10" font-weight="${d.cosmo ? 700 : 400}">${round(d.v).toFixed(2)}</text>`;
  });
  return svgDoc(w, h, b, 'Ranked breadth of integrated mechanisms');
}

// 2 ── breadth vs peer-maturity scatter ────────────────────────────────────────
function chartScatter(rows: Row[], medBreadth: number, medMaturity: number): string {
  const w = 720;
  const h = 560;
  const padL = 70;
  const padR = 30;
  const padT = 64;
  const padB = 64;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const X = (v: number): number => padL + (v / 5) * plotW;
  const Y = (v: number): number => padT + plotH - (v / 5) * plotH;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Breadth of synthesis vs peer maturity</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">y = breadth mean (0–5) · x = peer scientific maturity (0–5). upper-left = broad but immature.</text>`;
  for (let g = 0; g <= 5; g++) {
    b += `<line x1="${X(g)}" y1="${padT}" x2="${X(g)}" y2="${padT + plotH}" stroke="${GRID}" stroke-width="0.7"/>`;
    b += `<line x1="${padL}" y1="${Y(g)}" x2="${padL + plotW}" y2="${Y(g)}" stroke="${GRID}" stroke-width="0.7"/>`;
    b += `<text x="${X(g)}" y="${padT + plotH + 18}" fill="${MUTE}" font-size="10" text-anchor="middle">${g}</text>`;
    b += `<text x="${padL - 10}" y="${Y(g) + 4}" fill="${MUTE}" font-size="10" text-anchor="end">${g}</text>`;
  }
  // median quadrant lines
  b += `<line x1="${X(medMaturity)}" y1="${padT}" x2="${X(medMaturity)}" y2="${padT + plotH}" stroke="${MEANC}" stroke-dasharray="4 4" stroke-width="1"/>`;
  b += `<line x1="${padL}" y1="${Y(medBreadth)}" x2="${padL + plotW}" y2="${Y(medBreadth)}" stroke="${MEANC}" stroke-dasharray="4 4" stroke-width="1"/>`;
  b += `<text x="${padL + plotW}" y="${padT + 14}" fill="${MEANC}" font-size="10" text-anchor="end">medians</text>`;
  b += `<text x="${w / 2}" y="${h - 16}" fill="${TEXT}" font-size="12" text-anchor="middle">peer maturity →</text>`;
  b += `<text x="20" y="${padT + plotH / 2}" fill="${TEXT}" font-size="12" text-anchor="middle" transform="rotate(-90 20 ${padT + plotH / 2})">breadth →</text>`;
  // jitter labels deterministically by index parity to reduce overlap
  rows.forEach((r, i) => {
    const cx = X(r.peerMaturity);
    const cy = Y(breadthOf(r));
    const cosmo = isCosmo(r.project);
    if (cosmo) {
      b += `<circle cx="${cx}" cy="${cy}" r="8" fill="${COSMO}"/><circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${COSMO}" stroke-width="1.4" opacity="0.6"/>`;
      b += `<text x="${cx - 12}" y="${cy - 12}" fill="${COSMO}" font-size="11" font-weight="700" text-anchor="end">${esc(short(r.project))}</text>`;
    } else {
      b += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${PEER}" opacity="0.85"/>`;
      const dy = i % 2 === 0 ? -8 : 14;
      b += `<text x="${cx + 7}" y="${cy + dy}" fill="${MUTE}" font-size="9">${esc(short(r.project))}</text>`;
    }
  });
  return svgDoc(w, h, b, 'Breadth vs peer maturity scatter');
}

// 3 ── radar profile ───────────────────────────────────────────────────────────
function chartRadar(cosmo: Row, meanProfile: number[], near: Row): string {
  const w = 640;
  const h = 600;
  const cx = w / 2;
  const cy = h / 2 + 18;
  const R = 200;
  const pt = (j: number, v: number): [number, number] => {
    const ang = -Math.PI / 2 + (2 * Math.PI * j) / NAX;
    const r = (v / 5) * R;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (vals: number[]): string =>
    vals
      .map((v, j) =>
        pt(j, v)
          .map((n) => round(n, 1))
          .join(','),
      )
      .join(' ');
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Nine-axis capability profile</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">amber = Cosmogonic · violet = survey mean · green = nearest peer (${esc(short(near.project))})</text>`;
  for (let g = 1; g <= 5; g++) {
    b += `<polygon points="${poly(Array.from({ length: NAX }, () => g))}" fill="none" stroke="${GRID}" stroke-width="0.7"/>`;
  }
  for (let j = 0; j < NAX; j++) {
    const [ex, ey] = pt(j, 5);
    b += `<line x1="${cx}" y1="${cy}" x2="${round(ex, 1)}" y2="${round(ey, 1)}" stroke="${GRID}" stroke-width="0.7"/>`;
    const [lx, ly] = pt(j, 5.95);
    const anchor = Math.abs(lx - cx) < 12 ? 'middle' : lx < cx ? 'end' : 'start';
    b += `<text x="${round(lx, 1)}" y="${round(ly, 1)}" fill="${TEXT}" font-size="10" text-anchor="${anchor}">${esc(AXES[j]!)}</text>`;
  }
  b += `<polygon points="${poly(near.axes)}" fill="${NEAR}" fill-opacity="0.10" stroke="${NEAR}" stroke-width="1.4"/>`;
  b += `<polygon points="${poly(meanProfile)}" fill="${MEANC}" fill-opacity="0.12" stroke="${MEANC}" stroke-width="1.4"/>`;
  b += `<polygon points="${poly(cosmo.axes)}" fill="${COSMO}" fill-opacity="0.22" stroke="${COSMO}" stroke-width="2.2"/>`;
  return svgDoc(w, h, b, 'Nine-axis capability radar');
}

/**
 * Propagate the radar into the two hand-authored pages that inline it.
 *
 * `docs.html` and `specs.html` each carry a copy of {@link chartRadar}'s body inline (static markup,
 * so the profile is readable with JS off). Being hand-copied, it FORKED from this CSV and silently
 * went stale on four axes — ecology, cognition, substrate and instrumentation each drifted a full
 * ratchet behind while both pages presented the polygon as the current profile. Nothing caught it:
 * the consistency test only greps those files for the breadth string, and check-generated.ts guards
 * only the gallery embeds.
 *
 * The drift is not a one-off. The violet/green polygons encode the SURVEY MEAN and the NEAREST PEER,
 * so they go stale on any CSV row addition — growing the peer corpus silently invalidates both, plus
 * the peer's name in the caption and aria-label. Hand-maintenance cannot hold that invariant, so the
 * radar is derived here (single source = the CSV) exactly like every other figure in this script.
 *
 * Patches values only — geometry, colours and labels stay in the markup. Returns the files changed.
 */
async function syncInlineRadar(cosmo: Row, meanProfile: number[], near: Row): Promise<string[]> {
  const poly = (vals: number[]): string =>
    vals
      .map((v, j) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * j) / NAX;
        const r = (v / 5) * 200;
        return `${round(320 + r * Math.cos(ang), 1)},${round(318 + r * Math.sin(ang), 1)}`;
      })
      .join(' ');
  // fill colour identifies each series — same triple chartRadar() draws (green/violet/amber).
  const series: [string, number[]][] = [
    ['#34d399', near.axes],
    ['#a78bfa', meanProfile],
    ['#f59e0b', cosmo.axes],
  ];
  const peer = esc(short(near.project));
  const changed: string[] = [];
  for (const page of ['docs.html', 'specs.html']) {
    const path = `${ROOT}/${page}`;
    const before = await Bun.file(path).text();
    let after = before;
    for (const [colour, vals] of series) {
      const re = new RegExp(`(<polygon\\s+points=")[^"]*("\\s+fill="${colour}")`);
      if (!re.test(after)) throw new Error(`${page}: inline radar ${colour} polygon not found`);
      after = after.replace(re, `$1${poly(vals)}$2`);
    }
    // The nearest peer's NAME is part of the data — it changes whenever a closer peer is added.
    after = after.replace(/(green = nearest peer \()[^)]*(\))/, `$1${peer}$2`);
    after = after.replace(
      /(aria-label="Nine-axis capability radar: Cosmogonic vs survey mean vs )[^"]*(")/,
      `$1${peer}$2`,
    );
    if (after !== before) {
      await Bun.write(path, after);
      changed.push(page);
    }
  }
  return changed;
}

// 4 ── nearest neighbours bar chart ────────────────────────────────────────────
function chartNeighbours(neigh: { name: string; d: number }[]): string {
  const padL = 150;
  const padR = 60;
  const padT = 64;
  const rowH = 30;
  const w = 680;
  const h = padT + neigh.length * rowH + 28;
  const plotW = w - padL - padR;
  const max = Math.max(...neigh.map((n) => n.d)) * 1.08;
  const x = (v: number): number => padL + (v / max) * plotW;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Nearest neighbours in 9-axis feature space</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">Euclidean distance from Cosmogonic (lower = more similar capability shape).</text>`;
  neigh.forEach((n, i) => {
    const y = padT + i * rowH;
    b += `<text x="${padL - 10}" y="${y + rowH / 2 + 4}" fill="${TEXT}" font-size="11" text-anchor="end">${esc(n.name)}</text>`;
    b += `<rect x="${padL}" y="${y + 5}" width="${Math.max(1, x(n.d) - padL)}" height="${rowH - 12}" rx="3" fill="${NEAR}" opacity="0.78"/>`;
    b += `<text x="${x(n.d) + 6}" y="${y + rowH / 2 + 4}" fill="${MUTE}" font-size="10">${round(n.d).toFixed(2)}</text>`;
  });
  return svgDoc(w, h, b, 'Nearest neighbours');
}

// 5 ── capability heatmap ──────────────────────────────────────────────────────
function lerpColor(t: number): string {
  // dark navy -> cyan -> amber, perceptual-ish 3-stop
  const stops: [number, [number, number, number]][] = [
    [0, [12, 20, 36]],
    [0.55, [34, 211, 238]],
    [1, [245, 158, 11]],
  ];
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i]![0] && t <= stops[i + 1]![0]) {
      lo = stops[i]!;
      hi = stops[i + 1]!;
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const f = (t - lo[0]) / span;
  const c = lo[1].map((v, k) => Math.round(v + (hi[1][k]! - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function chartHeatmap(rows: Row[]): string {
  const ordered = [...rows].sort((a, b) => breadthOf(b) - breadthOf(a));
  const padL = 168;
  const padT = 150;
  const cellW = 50;
  const cellH = 21;
  const w = padL + NAX * cellW + 20;
  const h = padT + ordered.length * cellH + 20;
  let b = '';
  b += `<text x="28" y="30" fill="${TEXT}" font-size="18" font-weight="700">Capability heatmap — ${ordered.length} systems × 9 axes</text>`;
  b += `<text x="28" y="50" fill="${MUTE}" font-size="12">each cell = axis score 0–5 (dark→cyan→amber). rows sorted by breadth.</text>`;
  AXES.forEach((a, j) => {
    const x = padL + j * cellW + cellW / 2;
    b += `<text x="${x}" y="${padT - 8}" fill="${TEXT}" font-size="10" text-anchor="start" transform="rotate(-45 ${x} ${padT - 8})">${esc(a)}</text>`;
  });
  ordered.forEach((r, i) => {
    const y = padT + i * cellH;
    b += `<text x="${padL - 10}" y="${y + cellH / 2 + 4}" fill="${isCosmo(r.project) ? COSMO : TEXT}" font-size="10" font-weight="${isCosmo(r.project) ? 700 : 400}" text-anchor="end">${esc(short(r.project))}</text>`;
    r.axes.forEach((v, j) => {
      const x = padL + j * cellW;
      b += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" rx="2" fill="${lerpColor(v / 5)}"/>`;
      b += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 3.5}" fill="${v / 5 > 0.5 ? '#0b1220' : '#9fb3d1'}" font-size="9" text-anchor="middle">${v}</text>`;
    });
  });
  return svgDoc(w, h, b, 'Capability heatmap');
}

// ─────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const text = await Bun.file(CSV).text();
  const rows = parseRows(text);
  const cosmo = rows.find((r) => isCosmo(r.project));
  if (!cosmo) throw new Error('Cosmogonic row not found in CSV');
  const peers = rows.filter((r) => !isCosmo(r.project));

  const breadths = rows.map(breadthOf);
  const peerBreadths = peers.map(breadthOf);
  const maturities = rows.map((r) => r.peerMaturity);

  const popMean = mean(breadths);
  const popStd = standardDeviation(breadths);
  const peerMean = mean(peerBreadths);
  const peerStd = standardDeviation(peerBreadths);
  const cosmoBreadth = breadthOf(cosmo);
  const zPop = (cosmoBreadth - popMean) / popStd;
  const zPeer = (cosmoBreadth - peerMean) / peerStd;
  const percentile = (breadths.filter((v) => v <= cosmoBreadth).length / breadths.length) * 100;
  const corrBM = sampleCorrelation(breadths, maturities);

  const sortedBreadth = [...breadths].sort((a, b) => a - b);
  const medBreadth = sortedBreadth[Math.floor(sortedBreadth.length / 2)]!;
  const sortedMat = [...maturities].sort((a, b) => a - b);
  const medMaturity = sortedMat[Math.floor(sortedMat.length / 2)]!;

  const perAxis = AXES.map((label, j) => {
    const col = rows.map((r) => r.axes[j]!);
    const m = mean(col);
    const sd = standardDeviation(col);
    const mx = Math.max(...col);
    const cv = cosmo.axes[j]!;
    return {
      axis: label,
      mean: round(m),
      std: round(sd),
      max: mx,
      cosmo: cv,
      cosmoZ: round(sd === 0 ? 0 : (cv - m) / sd),
      leaders: rows.filter((r) => r.axes[j] === mx).map((r) => short(r.project)),
    };
  });
  const meanProfile = perAxis.map((a) => a.mean);

  const neigh = peers
    .map((r) => ({ name: short(r.project), full: r.project, d: round(euclid(cosmo.axes, r.axes)) }))
    .sort((a, b) => a.d - b.d);
  const nearestRow = peers.find((r) => short(r.project) === neigh[0]!.name)!;

  const stats = {
    generatedFrom: 'docs/reports/2026-06-26-alife-comparison-matrix.csv',
    method: 'population statistics over all systems incl. Cosmogonic; breadth = mean of 9 axes',
    nSystems: rows.length,
    nPeers: peers.length,
    cosmogonic: {
      breadthMean: round(cosmoBreadth),
      breadthRank: [...breadths].sort((a, b) => b - a).indexOf(cosmoBreadth) + 1,
      zScorePopulation: round(zPop),
      zScoreVsPeers: round(zPeer),
      percentile: round(percentile, 1),
      peerMaturity: cosmo.peerMaturity,
    },
    survey: {
      breadthMeanAll: round(popMean),
      breadthStdAll: round(popStd),
      breadthMeanPeers: round(peerMean),
      breadthStdPeers: round(peerStd),
      medianBreadth: round(medBreadth),
      medianPeerMaturity: round(medMaturity),
      corrBreadthVsMaturity: round(corrBM, 3),
    },
    perAxis,
    nearestNeighbours: neigh.slice(0, 10),
  };

  await Bun.write(`${OUT}/alife-stats.json`, JSON.stringify(stats, null, 2) + '\n');
  await Bun.write(`${OUT}/alife-breadth-ranked.svg`, chartRanked(rows));
  await Bun.write(
    `${OUT}/alife-breadth-vs-maturity.svg`,
    chartScatter(rows, medBreadth, medMaturity),
  );
  await Bun.write(`${OUT}/alife-radar-profile.svg`, chartRadar(cosmo, meanProfile, nearestRow));
  await Bun.write(`${OUT}/alife-nearest-neighbors.svg`, chartNeighbours(neigh.slice(0, 8)));
  await Bun.write(`${OUT}/alife-axis-heatmap.svg`, chartHeatmap(rows));
  const radarSynced = await syncInlineRadar(cosmo, meanProfile, nearestRow);

  // Print a human-readable receipt block.
  const L: string[] = [];
  L.push(
    `A-LIFE COMPARATIVE STATISTICS — ${stats.nSystems} systems (${stats.nPeers} peers + Cosmogonic)`,
  );
  L.push(
    `  breadth(Cosmogonic) = ${stats.cosmogonic.breadthMean}  rank #${stats.cosmogonic.breadthRank}/${stats.nSystems}  pctile ${stats.cosmogonic.percentile}`,
  );
  L.push(
    `  survey breadth: all mean ${stats.survey.breadthMeanAll} sd ${stats.survey.breadthStdAll} | peers mean ${stats.survey.breadthMeanPeers} sd ${stats.survey.breadthStdPeers}`,
  );
  L.push(
    `  z(Cosmogonic): population ${stats.cosmogonic.zScorePopulation}  vs-peers ${stats.cosmogonic.zScoreVsPeers}`,
  );
  L.push(
    `  corr(breadth, peerMaturity) = ${stats.survey.corrBreadthVsMaturity}   median breadth ${stats.survey.medianBreadth} / median maturity ${stats.survey.medianPeerMaturity}`,
  );
  L.push(
    `  nearest peers: ${neigh
      .slice(0, 5)
      .map((n) => `${n.name} ${n.d}`)
      .join(' · ')}`,
  );
  L.push(`  per-axis leaders:`);
  for (const a of perAxis)
    L.push(
      `    ${a.axis.padEnd(22)} mean ${a.mean} sd ${a.std} max ${a.max} | Cosmo ${a.cosmo} (z ${a.cosmoZ >= 0 ? '+' : ''}${a.cosmoZ}) | leaders: ${a.leaders.join(', ')}`,
    );
  L.push(`  wrote 5 SVG charts + alife-stats.json to docs/reports/assets/`);
  L.push(
    radarSynced.length > 0
      ? `  inline radar re-derived from the CSV in: ${radarSynced.join(', ')}`
      : `  inline radar already matches the CSV (docs.html, specs.html)`,
  );
  console.log(L.join('\n'));
}

void main();
