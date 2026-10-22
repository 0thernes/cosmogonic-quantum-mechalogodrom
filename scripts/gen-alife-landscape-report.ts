#!/usr/bin/env bun
/**
 * gen-alife-landscape-report.ts — the A-Life competitive LANDSCAPE INDEX, derived (never hand-typed)
 * from the single source CSV (`docs/reports/2026-06-26-alife-comparison-matrix.csv`) and the receipts
 * the three deterministic engines already wrote (`alife-stats.json`, `alife-geometry.json`,
 * `alife-codeground.json`). It replaces an externally generated "competitive landscape" PDF that cycled
 * ten systems fourteen times to reach "140" rows; every row here is a distinct, sourced system.
 *
 *   bun scripts/gen-alife-landscape-report.ts                 # (re)write the print-ready HTML
 *   bun scripts/gen-alife-landscape-report.ts --pdf <out.pdf> # also print it to PDF via Chromium
 *
 * Output: `docs/reports/assets/alife-landscape-index.html` (runs inside `gen:alife`, so it can never
 * drift from the CSV). The PDF is an on-demand derivative — it is not committed.
 *
 * Pure + deterministic: no Math.random / Date.now; identical inputs -> identical bytes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv } from './alife-codeground-sensitivity';
import { escapeMarkupAttribute, escapeMarkupText } from './markup-escape';

const ROOT = resolve(import.meta.dir, '..');
const CSV_PATH = 'docs/reports/2026-06-26-alife-comparison-matrix.csv';
const ASSETS = 'docs/reports/assets';
export const LANDSCAPE_HTML_PATH = `${ASSETS}/alife-landscape-index.html`;

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
const SHORT = ['Rep', 'Open', 'Eco', 'Morph', 'Cog', 'Subst', 'Instr', 'Consc', 'Vis'] as const;

/** One parsed matrix row plus its derived breadth (mean of the nine axes). */
export interface LandscapeRow {
  project: string;
  era: string;
  type: string;
  axes: number[];
  breadth: number;
  peerMaturity: number;
  confidence: number;
  sourceUrl: string;
  basis: string;
  cosmo: boolean;
}

interface AxisReceipt {
  axis: string;
  mean: number;
  std: number;
  max: number;
  cosmo: number;
  cosmoZ: number;
  leaders: string[];
}
interface StatsReceipt {
  nSystems: number;
  nPeers: number;
  survey: {
    breadthMeanAll: number;
    breadthStdAll: number;
    breadthMeanPeers: number;
    breadthStdPeers: number;
    medianBreadth: number;
    medianPeerMaturity: number;
    corrBreadthVsMaturity: number;
  };
  perAxis: AxisReceipt[];
  nearestNeighbours: { name: string; full: string; d: number }[];
}
interface GeometryReceipt {
  pca: { explainedVariance: number[] };
  pareto: { front: string[]; dominatedByCount9d: number; dominatesCount9d: number };
  mahalanobis: { d: number };
}
interface ScenarioReceipt {
  axes: number[];
  breadth: number;
  rank: number;
  total: number;
  zPopulation: number;
  zVsPeers: number;
  mahalanobis: number;
  dominatedBy9d: number;
  leadOverNearestPeerBreadth: number;
}
interface CodegroundReceipt {
  historicalSelfScored: ScenarioReceipt;
  canonicalCodeGrounded: ScenarioReceipt;
}

/** Everything the report is derived from — read once by {@link loadLandscapeInputs}. */
export interface LandscapeInputs {
  csv: string;
  stats: StatsReceipt;
  geometry: GeometryReceipt;
  codeground: CodegroundReceipt;
  version: string;
}

/**
 * Research lineages: distinct systems that share an engine, paper, or design ancestor. Listed so a
 * reader can see that the survey does not double-count — and so the near-duplicates are explicit.
 * Every member must exist in the CSV (asserted), so a rename cannot silently drop a family.
 */
export const LINEAGES: readonly { family: string; members: readonly string[]; note: string }[] = [
  {
    family: 'Self-replicating CA',
    members: [
      'von Neumann Universal Constructor',
      "Codd's Cellular Automaton",
      "Langton's Loops",
      'Evoloop / SDSR Loop',
      'Chou-Reggia Emergent Replicators',
    ],
    note: 'distinct automata in one design lineage (29 -> 8 states, designed -> evolving -> emergent)',
  },
  {
    family: 'Continuous CA',
    members: [
      'SmoothLife',
      'Lenia',
      'Flow Lenia',
      'Particle Lenia',
      'Sensorimotor Lenia (Hamon et al.)',
    ],
    note: 'Lenia family; each row is a distinct formulation or discovery method',
  },
  {
    family: 'Core War',
    members: ['Core War', 'Coreworld'],
    note: 'Coreworld evolves Redcode programs in a shared core',
  },
  {
    family: 'Tierra',
    members: ['Tierra', 'Network Tierra'],
    note: 'Network Tierra distributes the same instruction set across networked soups',
  },
  {
    family: 'Avida',
    members: ['Avida', 'Avida-ED'],
    note: 'Avida-ED is the educational browser front-end to the Avida engine',
  },
  {
    family: 'NEAT',
    members: [
      'NEAT (NeuroEvolution of Augmenting Topologies)',
      'HyperNEAT',
      'ES-HyperNEAT',
      'NERO (rtNEAT)',
    ],
    note: 'one neuroevolution algorithm line plus the game built on its real-time variant',
  },
  {
    family: 'Quality-Diversity',
    members: [
      'Novelty Search',
      'MAP-Elites',
      'Quality-Diversity (illumination algorithms)',
      'Quality-Diversity through AI Feedback (QDAIF)',
    ],
    note: 'OVERLAP: the QD survey row formalises a class that includes MAP-Elites',
  },
  {
    family: 'LLM-driven evolution',
    members: ['Evolution through Large Models (ELM)', 'OpenELM'],
    note: 'OpenELM is the open-source library operationalising the ELM paper',
  },
  {
    family: 'OMNI',
    members: ['OMNI (Open-endedness via Models of human Notions of Interestingness)', 'OMNI-EPIC'],
    note: 'OMNI-EPIC extends OMNI with code-generated environments',
  },
  {
    family: 'Morphology + RL',
    members: [
      'DERL (Deep Evolutionary Reinforcement Learning)',
      'UNIMAL (Universal Animal design space)',
    ],
    note: 'NEAR-DUPLICATE: same source paper (framework vs design space); confidence lowered',
  },
  {
    family: 'Voxel soft bodies',
    members: [
      'Voxelyze / VoxCAD',
      'Voxcraft-sim',
      'Evolving Soft Robots (Cheney / Unshackling Evolution)',
      'Xenobots (reconfigurable organisms)',
    ],
    note: 'NEAR-DUPLICATE: Voxcraft-sim is the CUDA reimplementation of Voxelyze; the others use them',
  },
  {
    family: 'OpenWorm',
    members: ['OpenWorm', 'DevoWorm'],
    note: 'DevoWorm is the developmental-biology sister project',
  },
];

/**
 * Provenance of the 2026-10-22 audit that produced this index (Physicist law: provenance or
 * oblivion). The additions are asserted to exist in the CSV.
 */
const AUDIT = {
  id: '2026-10-22',
  previousIndexDefects: [
    'Its 140 rows were 10 unique systems (Lenia, Avida, Chromaria, Tierra, Boids, Swarm Chemistry, ALIEN, "Evosphere (WebGL)", Biomorphs, Framsticks) repeated 14 times with sequential numbers #1-#140.',
    'Its "Ecology Mechanism" column read "Deterministic Execution Model" on every row: that is not an ecology mechanism, and it is false for systems whose evolution is driven by stochastic mutation (Tierra, Avida, ALIEN).',
    '"Evosphere (WebGL)" could not be found in any searched source or in the project matrix; it is treated as unverifiable and omitted.',
    'It described the set as "non-LLM" repositories indexed from the project docs, but the project matrix includes LLM-era systems (Voyager, Generative Agents, ELM, ADAS, Darwin Godel Machine).',
    'It carried no scores, no Cosmogonic profile, no sources and no comparison; it also had text errors ("solitions" for solitons; Swarm Chemistry "& bonds" - its particles are kinetic, with no bonds).',
    'The project matrix held 128 peers, not 140; this pass verified and scored 26 more to reach 154 peers (155 systems).',
  ],
  additions: [
    'Barricelli Numerical Symbioorganisms',
    'Grey Walter Tortoises (Machina speculatrix)',
    "Codd's Cellular Automaton",
    'EVOLVE (Conrad-Pattee artificial ecosystem)',
    'Daisyworld',
    'Braitenberg Vehicles',
    "Packard's Bugs (intrinsic adaptation)",
    'Coreworld',
    'Ackley-Littman AL world (ERL)',
    'AntFarm (Collins-Jefferson)',
    'Lindgren Evolving IPD Strategies',
    'Artificial Fishes (Tu-Terzopoulos)',
    'TechnoSphere',
    'Chou-Reggia Emergent Replicators',
    'Webworld',
    'Electric Sheep',
    'Tangled Nature Model',
    'NERO (rtNEAT)',
    'EcoSim (Gras)',
    'Physarum Transport Networks (Jones)',
    'Kilobot Thousand-Robot Swarm',
    'Hide-and-Seek Multi-Agent Autocurricula',
    'XLand (Open-Ended Learning Team)',
    'Biomaker CA',
    'Sensorimotor Lenia (Hamon et al.)',
    'Project Sid (Altera)',
  ],
  corrections: [
    'breve: source URL spiderland.org/s/ returned 404; replaced with the SourceForge project page.',
    "Krcah Evolved Virtual Creatures: the cited PDF was a different author's Framsticks bachelor thesis; replaced with Krcah's DBLP record (the GECCO '07 entry is a one-page poster).",
    "Nanopond: era corrected 2011 -> 2005 (Ierymenko's v1.9 source header reads Copyright 2005).",
    'Flow Lenia: the ALIFE 2023 Best Paper Award, previously trimmed as unverifiable, is confirmed (plus an Artificial Life 2025 journal extension); peer maturity 3 -> 3.5.',
    'Repository prose: stale open-endedness 2.4 / breadth 3.84 / z +3.22 figures left over from an earlier profile were corrected on every current surface.',
  ],
  verification:
    '26 existing source links were re-fetched (24 live and correct, 2 defective and fixed), including 6 PubMed IDs resolved through NCBI E-utilities; each of the 26 new rows was checked against at least one primary or archival source. The other 102 pre-existing rows keep their earlier per-row VERIFIED notes and were not re-fetched in this pass.',
} as const;

/** Parse the matrix into typed rows. O(rows). Throws on a malformed row (fail loud, never guess). */
export function parseLandscapeRows(csv: string): LandscapeRow[] {
  return parseCsv(csv)
    .slice(1)
    .map((c) => {
      if (c.length !== 16) throw new Error(`matrix row has ${c.length} fields: ${c[0]}`);
      const axes = c.slice(3, 12).map(Number);
      if (axes.some((v) => !Number.isFinite(v) || v < 0 || v > 5)) {
        throw new Error(`axis score outside 0..5 for ${c[0]}`);
      }
      const project = c[0]!.trim();
      return {
        project,
        era: c[1]!.trim(),
        type: c[2]!.trim(),
        axes,
        breadth: axes.reduce((s, v) => s + v, 0) / axes.length,
        peerMaturity: Number(c[12]),
        confidence: Number(c[13]),
        sourceUrl: c[14]!.trim(),
        basis: c[15]!.trim(),
        cosmo: project.startsWith('Cosmogonic'),
      };
    });
}

/** Breadth-descending order; ties broken by name with a locale-free comparison (deterministic). */
export function rankRows(rows: readonly LandscapeRow[]): LandscapeRow[] {
  return [...rows].sort(
    (a, b) => b.breadth - a.breadth || (a.project < b.project ? -1 : a.project > b.project ? 1 : 0),
  );
}

/** First four-digit year in an era label, floored to its decade ("1990s" -> 1990, "1948-1949" -> 1940). */
export function decadeOf(era: string): number {
  const m = /(\d{4})/.exec(era);
  if (!m) throw new Error(`era without a year: ${era}`);
  return Math.floor(Number(m[1]) / 10) * 10;
}

const esc = escapeMarkupText;
const attr = escapeMarkupAttribute;
const f1 = (x: number): string => x.toFixed(1);
const f2 = (x: number): string => x.toFixed(2);
const sign = (x: number, d: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d)}`;
const host = (url: string): string => {
  if (!/^https?:\/\//.test(url)) return url;
  return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]!;
};

/** Cell tint for a 0..5 axis score (light, print-safe). */
function heat(v: number): string {
  const t = Math.max(0, Math.min(1, v / 5));
  const l = Math.round(97 - t * 42);
  return `hsl(190 70% ${l}%)`;
}

const CSS = `
@page { size: Letter; margin: 14mm 12mm 16mm 12mm; }
:root { --ink:#0f172a; --mute:#475569; --line:#cbd5e1; --soft:#f1f5f9; --accent:#b45309; --cosmo:#fef3c7; }
* { box-sizing: border-box; }
body { margin:0; font: 9.5pt/1.42 "Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:#fff; }
h1 { font-size: 21pt; line-height:1.15; margin: 0 0 4pt; letter-spacing:-0.01em; }
h2 { font-size: 13pt; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 1.5px solid var(--ink); break-after: avoid; }
h3 { font-size: 10.5pt; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 6pt; }
.sub { color: var(--mute); font-size: 10pt; margin-bottom: 10pt; }
.cards { display:grid; grid-template-columns: repeat(4, 1fr); gap: 6pt; margin: 8pt 0 10pt; }
.card { border:1px solid var(--line); border-radius:6px; padding:6pt 8pt; background: var(--soft); }
.card b { display:block; font-size: 14pt; line-height:1.1; }
.card span { color: var(--mute); font-size: 8pt; }
.box { border:1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 4px; padding: 7pt 10pt; margin: 8pt 0; background:#fffbeb; break-inside: avoid; }
.box.ok { border-left-color:#15803d; background:#f0fdf4; }
ul, ol { margin: 0 0 6pt 16pt; padding:0; }
li { margin: 0 0 2.5pt; }
table { width:100%; border-collapse: collapse; margin: 4pt 0 8pt; }
th, td { border-bottom: 1px solid var(--line); padding: 2.5pt 4pt; text-align:left; vertical-align: top; }
th { background: var(--soft); font-weight: 650; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
td.n, th.n { text-align:right; font-variant-numeric: tabular-nums; }
td.c, th.c { text-align:center; font-variant-numeric: tabular-nums; }
.idx { font-size: 7.4pt; line-height: 1.25; }
.idx td, .idx th { padding: 1.6pt 2.5pt; }
.idx .type { color: var(--mute); font-size: 6.6pt; display:block; }
tr.cosmo td { background: var(--cosmo) !important; font-weight: 650; }
.figs { display:grid; grid-template-columns: 1fr 1fr; gap: 8pt; break-inside: avoid; }
.figs img { width:100%; max-height:74mm; object-fit:contain; border-radius:6px; border:1px solid var(--line); background:#0b1220; }
.small { font-size: 8.3pt; }
th.c, td.c { white-space: nowrap; }
.cap { color: var(--mute); font-size: 8pt; }
.notes { font-size: 7.6pt; line-height: 1.33; }
.note { break-inside: avoid; border-bottom: 1px solid var(--line); padding: 3pt 0 4pt; }
.note h4 { margin:0 0 1pt; font-size: 8.4pt; }
.note .meta { color: var(--mute); }
a { color: #0e7490; text-decoration: none; word-break: break-all; }
.pass { color:#15803d; font-weight:650; } .fail { color:#b91c1c; font-weight:650; }
.pb { break-before: page; }
`;

/**
 * Render the complete landscape index as one self-contained, print-ready HTML document.
 * O(rows · axes + rows log rows). Deterministic: identical inputs give identical output.
 */
export function renderLandscapeHtml(inputs: LandscapeInputs): string {
  const rows = parseLandscapeRows(inputs.csv);
  const { stats, geometry, codeground } = inputs;
  if (rows.length !== stats.nSystems) {
    throw new Error(
      `stale receipts: CSV has ${rows.length} rows, alife-stats.json says ${stats.nSystems}`,
    );
  }
  const names = new Set(rows.map((r) => r.project));
  for (const fam of LINEAGES) {
    for (const m of fam.members) if (!names.has(m)) throw new Error(`lineage member missing: ${m}`);
  }
  for (const a of AUDIT.additions)
    if (!names.has(a)) throw new Error(`audit addition missing: ${a}`);

  const ranked = rankRows(rows);
  const cosmo = ranked.find((r) => r.cosmo);
  if (!cosmo) throw new Error('Cosmogonic row missing');
  const peers = ranked.filter((r) => !r.cosmo);
  const cg = codeground.canonicalCodeGrounded;
  const hist = codeground.historicalSelfScored;
  const s = stats.survey;

  // Integrity checks — computed, not asserted in prose.
  const normalized = rows.map((r) =>
    r.project
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim(),
  );
  const dupes = normalized.length - new Set(normalized).size;
  const missingSource = rows.filter((r) => !r.cosmo && !/^https?:\/\//.test(r.sourceUrl)).length;
  const missingBasis = rows.filter((r) => r.basis.length < 20).length;
  const lineageExtra = LINEAGES.reduce((n, f) => n + f.members.length - 1, 0);
  const independent = rows.length - lineageExtra;

  const decades = new Map<number, number>();
  for (const r of rows) decades.set(decadeOf(r.era), (decades.get(decadeOf(r.era)) ?? 0) + 1);
  const decadeRows = [...decades.entries()].sort((a, b) => a[0] - b[0]);

  const axisRank = AXES.map((_, i) => 1 + peers.filter((p) => p.axes[i]! > cosmo.axes[i]!).length);
  const confMean = peers.reduce((t, r) => t + r.confidence, 0) / peers.length;

  const card = (v: string, label: string): string =>
    `<div class="card"><b>${esc(v)}</b><span>${esc(label)}</span></div>`;

  const out: string[] = [];
  out.push(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A-Life Landscape Index</title><style>${CSS}</style></head><body>`);

  // ── 1. Header + receipts ──────────────────────────────────────────────────
  out.push(`<h1>Cosmogonic Quantum Mechalogodrom<br>A-Life Competitive Landscape Index</h1>
<div class="sub">${stats.nSystems} distinct systems (${stats.nPeers} peers + Cosmogonic) scored on nine capability axes ·
derived from <code>${esc(CSV_PATH)}</code> and its generated receipts · v${esc(inputs.version)}</div>`);
  out.push(`<div class="cards">
${card(`#${cg.rank} / ${cg.total}`, 'breadth rank (mean of 9 axes)')}
${card(`${f2(cg.breadth)} / 5`, `breadth · survey mean ${f2(s.breadthMeanAll)} ± ${f2(s.breadthStdAll)}`)}
${card(`${sign(cg.zPopulation, 3)}σ`, `z vs all systems · ${sign(cg.zVsPeers, 3)}σ vs peers`)}
${card(`${f2(geometry.mahalanobis.d)}`, 'Mahalanobis distance from the peer centroid')}
${card(`+${f2(cg.leadOverNearestPeerBreadth)}`, `breadth lead over the nearest peer (${stats.nearestNeighbours[0]!.name})`)}
${card(`${cg.dominatedBy9d} / ${geometry.pareto.dominatesCount9d}`, 'systems dominating it / dominated by it (9-D)')}
${card(`${f1(cosmo.peerMaturity)} / 5`, `peer maturity · survey median ${f1(s.medianPeerMaturity)}`)}
${card(`≥ ${independent}`, `independent lineages (${LINEAGES.length} declared families counted once)`)}
</div>`);
  out.push(`<div class="box ok"><b>Honest reading.</b><ul>
<li>The lead is <b>breadth of integration</b>, not quality and not a first: Cosmogonic is the sole leader on exactly one axis of nine (substrate pluralism); a specialist peer holds the top on the other eight.</li>
<li><b>Open-endedness ${f1(cosmo.axes[1]!)}</b> is its one below-mean axis (z ${sign(stats.perAxis[1]!.cosmoZ, 2)}); novelty is authored and fitness is fixed-target, not autonomously open-ended.</li>
<li>On consciousness-theory it is a strong outlier (z ${sign(stats.perAxis[7]!.cosmoZ, 2)}) but <b>LIDA and the Conscious Turing Machine score above it</b>; its scores there are computational indicators only, not sentience.</li>
<li>Peer maturity is <b>${f1(cosmo.peerMaturity)}/5</b> against a survey median of ${f1(s.medianPeerMaturity)}: no external peer review or replication yet. Its quantum components are classical simulations, not quantum hardware.</li>
<li>Every peer score is this project's literature judgment of a published system, not an external benchmark; z-scores move whenever the corpus grows, so the corpus size is always quoted with them.</li>
</ul></div>`);

  // ── 2. Audit / errata ─────────────────────────────────────────────────────
  out.push(`<h2>Audit ${esc(AUDIT.id)} — what this index corrects</h2>
<div class="box"><b>The earlier auto-generated "Competitive Landscape Index" PDF was not usable:</b><ol>
${AUDIT.previousIndexDefects.map((d) => `<li>${esc(d)}</li>`).join('\n')}
</ol></div>
<h3>Data corrections to the project matrix</h3><ul>
${AUDIT.corrections.map((d) => `<li>${esc(d)}</li>`).join('\n')}
</ul>
<h3>${AUDIT.additions.length} verified additions (128 → ${stats.nPeers} peers)</h3>
<p>${AUDIT.additions.map((a) => esc(a)).join(' · ')}</p>
<h3>Verification coverage</h3><p>${esc(AUDIT.verification)}</p>`);

  // ── 3. Profile vs survey ──────────────────────────────────────────────────
  out.push(`<h2>Cosmogonic's nine-axis profile against the survey</h2>
<table><thead><tr><th>Axis</th><th class="c">Cosmogonic</th><th class="c">Survey mean</th><th class="c">σ</th><th class="c">z</th><th class="c">Rank on axis</th><th>Axis leaders (top score)</th></tr></thead><tbody>
${stats.perAxis
  .map((a, i) => {
    const leaders =
      a.leaders.length > 4
        ? `${a.leaders.slice(0, 4).join(', ')} +${a.leaders.length - 4} more`
        : a.leaders.join(', ');
    return `<tr><td>${esc(a.axis)}</td><td class="c"><b>${f1(a.cosmo)}</b></td><td class="c">${f2(a.mean)}</td><td class="c">${f2(a.std)}</td><td class="c">${sign(a.cosmoZ, 2)}</td><td class="c">${axisRank[i]} / ${rows.length}</td><td>${esc(leaders)} (${f1(a.max)})</td></tr>`;
  })
  .join('\n')}
</tbody></table>
<p class="cap">Rank on axis = 1 + the number of peers scoring strictly higher (ties share a rank). Historical self-score, kept only as a sensitivity baseline: breadth ${f2(hist.breadth)}, z ${sign(hist.zPopulation, 3)} / ${sign(hist.zVsPeers, 3)}, Mahalanobis ${f2(hist.mahalanobis)} — superseded by the code-grounded profile above.</p>
<div class="figs">
<div><img src="alife-radar-profile.svg" alt="Nine-axis radar: Cosmogonic versus survey mean and nearest peer"><div class="cap">Radar: Cosmogonic (amber) vs survey mean vs nearest peer.</div></div>
<div><img src="alife-pca.svg" alt="PCA projection of all surveyed systems"><div class="cap">PCA of all ${rows.length} systems (PC1 ${(geometry.pca.explainedVariance[0]! * 100).toFixed(1)}%, PC2 ${(geometry.pca.explainedVariance[1]! * 100).toFixed(1)}% of variance).</div></div>
</div>`);

  // ── 4. Rubric ─────────────────────────────────────────────────────────────
  const rubric: [string, string][] = [
    [
      'Reproduction',
      '0 none · 1 growth or fission without heredity (Gray-Scott, Lenia) · 2 inheritance without a mutation operator (PhysiCell) · 3 self-replication without heritable variation, or archive heredity (Primordial Particle Systems, AlChemy) · 4 mutation + selection (Karl Sims, GOLEM) · 5 open self-replication + mutation + selection platforms (Tierra, Avida, NEAT)',
    ],
    [
      'Open-endedness',
      '1 none · 2 fixed target or convergent (Aevol, Evoloop) · 3 bounded novelty (Lindgren, Neural MMO) · 4 explicitly open-ended-evolution targeting (Tierra, Flow Lenia) · 5 field-leading open-endedness (Geb, POET, Picbreeder, OMNI-EPIC)',
    ],
    [
      'Ecology',
      '0-1 none or a solo agent · 2 single-species competition · 3 multi-species or parasite interactions · 4 food webs or dense social interdependence (SimLife, Neural MMO) · 5 rich coevolving ecologies (Polyworld, Sugarscape)',
    ],
    [
      'Morphology/Physics',
      '0 aspatial · 1 grid without physics · 2 2D kinematics or spatial chemistry · 3 2D physics or fixed physical bodies · 4 3D physics or cell mechanics · 5 evolved or real 3D bodies (Karl Sims, Voxelyze, Xenobots)',
    ],
    [
      'Cognition/Learning',
      '0 none · 1 reactive or baked · 2 simple controllers · 3 evolved controllers or specified cognitive models · 4 learning agents, neural brains, LLM agents · 5 deep RL at scale',
    ],
    [
      'Substrate pluralism',
      '1 one computational substrate · 2 two coupled substrates (agents + PDE field: PhysiCell) · higher = several genuinely distinct coupled substrates',
    ],
    [
      'Instrumentation',
      '1 theoretical or hand analysis · 2 minimal tooling · 3 logging and reproductions · 4 Avida-grade analysis tooling · 5 benchmark suites (Evolution Gym, Melting Pot, Craftax)',
    ],
    [
      'Consciousness-theory',
      '0 none · 5 an explicit computational theory of consciousness (LIDA, Conscious Turing Machine)',
    ],
    [
      'Visual scale',
      '1 headless · 2 simple displays · 3 good real-time rendering · 4 rich visuals · 5 iconic spectacle (Lenia, ALIEN, Karl Sims)',
    ],
    [
      'Peer maturity (not in breadth)',
      '2 unreviewed or indie · 3 published, niche adoption · 4 well cited · 5 foundational',
    ],
  ];
  out.push(`<h2>Scoring rubric (0-5 per axis)</h2>
<table class="small"><thead><tr><th style="width:22%">Axis</th><th>Anchors used by the matrix</th></tr></thead><tbody>
${rubric.map(([a, d]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(d)}</td></tr>`).join('\n')}
</tbody></table>`);

  // ── 5. Full ranked index ──────────────────────────────────────────────────
  out.push(`<h2 class="pb">Full index — ${rows.length} systems ranked by breadth</h2>
<table class="idx"><thead><tr><th class="n">#</th><th>System <span class="type">type</span></th><th>Era</th>${SHORT.map((h) => `<th class="c">${h}</th>`).join('')}<th class="c">Breadth</th><th class="c">Peer</th><th class="c">Conf</th></tr></thead><tbody>
${ranked
  .map(
    (r, i) =>
      `<tr${r.cosmo ? ' class="cosmo"' : ''}><td class="n">${i + 1}</td><td>${esc(r.project)}<span class="type">${esc(r.type)}</span></td><td>${esc(r.era)}</td>${r.axes
        .map((v) => `<td class="c" style="background:${heat(v)}">${f1(v)}</td>`)
        .join(
          '',
        )}<td class="c"><b>${f2(r.breadth)}</b></td><td class="c">${f1(r.peerMaturity)}</td><td class="c">${f2(r.confidence)}</td></tr>`,
  )
  .join('\n')}
</tbody></table>
<p class="cap">Axes: Rep reproduction · Open open-endedness · Eco ecology · Morph morphology/physics · Cog cognition/learning · Subst substrate pluralism · Instr instrumentation · Consc consciousness-theory · Vis visual scale. Breadth = mean of the nine axes. Peer = scientific maturity (not part of breadth). Conf = the scorer's confidence in the row (peer mean ${f2(confMean)}).</p>`);

  // ── 6. Structure of the survey ────────────────────────────────────────────
  out.push(`<h2 class="pb">Structure of the survey</h2>
<h3>Integrity checks</h3>
<table><tbody>
<tr><td>Distinct system names (normalized)</td><td class="${dupes === 0 ? 'pass' : 'fail'}">${rows.length - dupes} / ${rows.length} — ${dupes === 0 ? 'no repeats' : `${dupes} duplicate(s)`}</td></tr>
<tr><td>Peer rows with an http(s) source</td><td class="${missingSource === 0 ? 'pass' : 'fail'}">${peers.length - missingSource} / ${peers.length}</td></tr>
<tr><td>Rows with a written basis</td><td class="${missingBasis === 0 ? 'pass' : 'fail'}">${rows.length - missingBasis} / ${rows.length}</td></tr>
<tr><td>Systems dominating Cosmogonic on all 9 axes</td><td class="pass">${cg.dominatedBy9d}</td></tr>
<tr><td>Correlation of breadth with peer maturity</td><td>${s.corrBreadthVsMaturity.toFixed(3)} (broad systems tend to be younger and less validated)</td></tr>
</tbody></table>
<h3>Research lineages (declared families, so nothing is double-counted silently)</h3>
<table><thead><tr><th>Family</th><th>Members in the survey</th><th>Note</th></tr></thead><tbody>
${LINEAGES.map((f) => `<tr><td><b>${esc(f.family)}</b></td><td>${f.members.map(esc).join(' · ')}</td><td>${esc(f.note)}</td></tr>`).join('\n')}
</tbody></table>
<p class="cap">Counting each declared family once gives a conservative floor of ${independent} independent lineages across ${rows.length} rows.</p>
<h3>Systems by decade</h3>
<table><thead><tr>${decadeRows.map(([d]) => `<th class="c">${d}s</th>`).join('')}</tr></thead><tbody><tr>${decadeRows.map(([, n]) => `<td class="c">${n}</td>`).join('')}</tr></tbody></table>
<h3>Nearest neighbours in nine-axis space</h3>
<table><thead><tr><th class="n">#</th><th>System</th><th class="c">Euclidean distance</th><th class="c">Breadth</th></tr></thead><tbody>
${stats.nearestNeighbours
  .map((nb, i) => {
    const row = rows.find((r) => r.project === nb.full);
    return `<tr><td class="n">${i + 1}</td><td>${esc(nb.full)}</td><td class="c">${f2(nb.d)}</td><td class="c">${row ? f2(row.breadth) : '—'}</td></tr>`;
  })
  .join('\n')}
</tbody></table>
<p>Pareto front (no system beats it on every axis): ${geometry.pareto.front.map(esc).join(' · ')}.</p>
<div class="figs">
<div><img src="alife-breadth-vs-maturity.svg" alt="Breadth versus peer maturity scatter"><div class="cap">Breadth vs peer maturity — the "broad but immature" quadrant.</div></div>
<div><img src="alife-pareto.svg" alt="Pareto front chart"><div class="cap">Pareto front across the nine axes.</div></div>
</div>`);

  // ── 7. Evidence notes ─────────────────────────────────────────────────────
  out.push(`<h2 class="pb">Per-system evidence notes (${rows.length})</h2>
<div class="notes">
${ranked
  .map((r, i) => {
    const src = /^https?:\/\//.test(r.sourceUrl)
      ? `<a href="${attr(r.sourceUrl)}">${esc(host(r.sourceUrl))}</a>`
      : esc(r.sourceUrl);
    return `<div class="note"><h4>${i + 1}. ${esc(r.project)} <span class="meta">· ${esc(r.era)} · ${esc(r.type)} · breadth ${f2(r.breadth)} · source ${src}</span></h4>${esc(r.basis)}</div>`;
  })
  .join('\n')}
</div>`);

  // ── 8. Method & limits ────────────────────────────────────────────────────
  out.push(`<h2>Method and limits</h2><ul>
<li>One CSV is the single source of truth; <code>alife-comparison-stats.ts</code>, <code>alife-comparison-geometry.ts</code> and <code>alife-codeground-sensitivity.ts</code> compute every statistic, and this document is regenerated from them by <code>gen-alife-landscape-report.ts</code> inside <code>bun run gen:alife</code>.</li>
<li>Cosmogonic's row is the code-grounded profile <code>[${cg.axes.map(f1).join(', ')}]</code>, re-audited against source and moved only by test-backed gates; the earlier self-score is kept solely as a labelled sensitivity baseline.</li>
<li>Peer rows are single-rater literature judgments with a stated confidence; they are not results of running each system. Anchors keep the scale consistent, but a second independent rater has not yet scored the matrix.</li>
<li>Survey statistics depend on which systems are included. Adding foundational models that score low on most axes (this pass added several) lowers the survey mean and raises Cosmogonic's z-scores without any change to Cosmogonic itself.</li>
<li>Not established by this index: sentience or consciousness, physical-quantum-hardware performance, or superiority over any specialist system on its own specialty.</li>
</ul>
<p class="cap">Previous corpus sizes (113 and 129 systems) are superseded; dated reports under <code>docs/reports/</code> keep their own historical numbers.</p>
</body></html>
`);
  return out.join('\n');
}

/** Read the CSV, the three receipts and the package version from the repo root. */
export function loadLandscapeInputs(root: string = ROOT): LandscapeInputs {
  const read = (p: string): string => readFileSync(`${root}/${p}`, 'utf8');
  return {
    csv: read(CSV_PATH),
    stats: JSON.parse(read(`${ASSETS}/alife-stats.json`)) as StatsReceipt,
    geometry: JSON.parse(read(`${ASSETS}/alife-geometry.json`)) as GeometryReceipt,
    codeground: JSON.parse(read(`${ASSETS}/alife-codeground.json`)) as CodegroundReceipt,
    version: (JSON.parse(read('package.json')) as { version: string }).version,
  };
}

/** Print the generated HTML to a Letter PDF with headless Chromium (opt-in; needs Playwright). */
async function printPdf(htmlPath: string, pdfPath: string): Promise<void> {
  const { chromium } = await import('playwright');
  const bundled = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(existsSync(bundled) ? { executablePath: bundled } : {});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    mkdirSync(dirname(pdfPath), { recursive: true });
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font:7pt sans-serif;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between"><span>Cosmogonic Quantum Mechalogodrom · A-Life Landscape Index</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const html = renderLandscapeHtml(loadLandscapeInputs());
  const htmlPath = `${ROOT}/${LANDSCAPE_HTML_PATH}`;
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`wrote ${LANDSCAPE_HTML_PATH}`);
  const i = process.argv.indexOf('--pdf');
  if (i >= 0) {
    const target = process.argv[i + 1];
    if (!target) throw new Error('--pdf needs an output path');
    const pdfPath = resolve(process.cwd(), target);
    await printPdf(htmlPath, pdfPath);
    console.log(`wrote ${pdfPath}`);
  }
}

if (import.meta.main) void main();
