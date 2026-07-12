#!/usr/bin/env bun
/**
 * alife-codeground-sensitivity.ts — the HONESTY stress-test behind the A-Life deep-dive.
 *
 * The peer rows in `2026-06-26-alife-comparison-matrix.csv` are literature/documentation
 * judgments. Cosmogonic's CSV row is now the canonical code-grounded profile. This script retains
 * the superseded optimistic self-score as historical evidence and recomputes every headline
 * statistic twice: historical self-score versus current canonical code-grounded profile. Pure +
 * deterministic (no Math.random / Date.now).
 *
 *   bun scripts/alife-codeground-sensitivity.ts   # prints both scenarios + writes alife-codeground.json
 *
 * Canonical code-grounded Cosmogonic vector — each axis cites the strongest source the auditor
 * could defend. The script fails if the CSV drifts from this expected vector:
 *   reproduction        4.0  genome.ts:77-147 + primordial-soup.ts:118-147 (seeded recombine rebirth) — DEFENSIBLE
 *   open-endedness      2.4  emergence-angles.ts real GA + TWO live fitness-selection loops (soup harvest
 *                            world.ts:3085 + petri truncation-selection petri-dish.ts:404) + the birth
 *                            engine shows bounded active novelty versus a frozen control and the petri ring
 *                            selects differentially (GATE-OE-LIVE / GATE-PETRI-SURVIVE). This is not proof
 *                            of unbounded open-ended evolution — the cautious floor was 2.2.
 *   ecology             3.2  titans.ts real economyTick + soup SELECTION loop closed (world.ts:3085 spawns the
 *                            vitality-argmax; GATE-SOUP-SELECT: differential >0 vs a blind pick ~0) — was 3.0
 *   morphology/physics  3.8  reaction-diffusion.ts:87-290 live Gray-Scott PDE; schrodinger.ts dead code, super-body cosmetic — DEFENSIBLE (was 4.0)
 *   cognition/learning  4.5  super-creature.ts predict->surprise->GOAP + FIVE gate-backed non-apex loops:
 *                            AD-gradient forager beats a random walk p<0.01 (GATE-FORAGE); the digital-life
 *                            population LEARNS its fitness by exact Eshkol AD to the analytic optimum, ablation-
 *                            verified, live in petri (GATE-BIOLOGIC-LEARN); the LIVE base 50k population
 *                            FORAGES up the flora biomass gradient (chemotaxis) reaching >3x richer flora than
 *                            a blind wanderer (GATE-CHEMOTAXIS, entities.ts); a real VQE resolves the four
 *                            competing drives into a minimum-frustration JOINT commitment by the EXACT
 *                            parameter-shift gradient through the Eshkol AD tape (GATE-VQE-RESOLVE); and a
 *                            predictive-metacognition faculty fits an EXACT arbitrary-order Taylor jet to the
 *                            trajectory and gates decisiveness by its validated remainder (GATE-PREDICTIVE-
 *                            METACOG, predictive-metacognition.ts). Six accumulated gate-backed mechanisms
 *                            now substantiate the original self-scored ceiling — was 3.8
 *   substrate pluralism 4.5  qcircuit.ts real 5-qubit statevector wired + tsotchke-deep-wire real irrep/SVD; schrodinger/causal-graph/predictive-coding isolated — mild (was 5.0)
 *   instrumentation     4.3  analytics.ts:57-215 wired regression+audit; rng-stats.ts isolated — DEFENSIBLE (was 4.5)
 *   consciousness-thy   3.5  integrated-information.ts:44-92 exact quantum Phi + global-workspace wired; causal-graph + predictive-coding NEVER instantiated — OVERCLAIMED (was 4.5)
 *   visual scale        4.0  instanced-entities.ts pooling is the only desktop/ultra path; 50k tier unbenchmarked, pools cast no shadows — OVERCLAIMED (was 5.0)
 */
import { mean, standardDeviation } from 'simple-statistics';

const ROOT = `${import.meta.dir}/..`;
const CSV = `${ROOT}/docs/reports/2026-06-26-alife-comparison-matrix.csv`;
const OUT = `${ROOT}/docs/reports/assets`;
const NAX = 9;
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
];
const HISTORICAL_SELF_SCORED = [4.0, 3.5, 5.0, 4.0, 4.5, 5.0, 4.5, 4.5, 5.0];
// Honest FLOOR rises, each move 1:1 with a green ablation-verified gate; the superseded self-scored
// vector is retained as historical evidence; Consciousness (idx 7) stays 3.5.
//   batch-15b: ecology 3.0→3.2 (GATE-SOUP-SELECT) · cognition 3.8→3.9 (GATE-FORAGE)
//   batch-22:  open-endedness 2.2→2.4 (two selection loops + bounded-active-novelty/frozen control;
//              not a claim of unbounded evolution)
//   batch-23:  cognition 3.9→4.0 (GATE-BIOLOGIC-LEARN — the base population learns by exact Eshkol AD)
//   batch-25:  cognition 4.0→4.1 (GATE-CHEMOTAXIS — the LIVE base 50k population forages up the flora gradient)
//   batch-27:  cognition 4.1→4.3 (GATE-MLP: a real Eshkol-AD multi-layer perceptron solves XOR — a nonlinear
//              map a linear unit provably cannot; + GATE-SELFMODEL: every digital biologic trains that MLP
//              ONLINE by exact backprop into a forward self-model whose error collapses in the live petri —
//              a qualitative jump from linear learners to a universal approximator, two ablation-verified gates)
//   batch-44:  cognition 4.3 -> 4.4 (GATE-VQE-RESOLVE: a real Variational Quantum Eigensolver resolves the four
//              competing drives into a minimum-frustration JOINT commitment via the EXACT parameter-shift
//              gradient through the Eshkol AD tape — the first LIVE consumer of math/quantum-ad. It converges
//              to the exact diagonal ground state and causally biases the base-population seek force through
//              the production EntityManager loop, ablation-verified. A joint multi-drive conflict resolver,
//              distinct in kind from the per-drive linear/MLP learners above; classical statevector, not a QPU)
//   batch-45:  cognition 4.4 -> 4.5 (GATE-PREDICTIVE-METACOG: a predictive-metacognition faculty fits an EXACT
//              arbitrary-order Taylor jet — the Eshkol v1.3 "differentiate to any order" primitive — to the
//              recent trajectory, reproducing derivatives 0..k exactly, and reads its leading-coefficient
//              remainder as a validated predictive-confidence that CAUSALLY damps the VQE resolver's commit
//              when the world is volatile. A distinct metacognitive class; the 6th accumulated gate-backed
//              cognitive mechanism now substantiates the original self-scored ceiling of 4.5. Indicator-only)
export const CODE_GROUNDED = [4.0, 2.4, 3.2, 3.8, 4.5, 4.5, 4.3, 3.5, 4.0];
const EXPECTED_CANONICAL_CODE_GROUNDED = CODE_GROUNDED;

interface Row {
  project: string;
  axes: number[];
  peerMaturity: number;
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let f = '';
  let row: string[] = [];
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 && r[0]!.trim().length > 0);
}
function parseRows(text: string): Row[] {
  return parseCsv(text)
    .slice(1)
    .map((c) => ({
      project: c[0]!.trim(),
      axes: c.slice(3, 3 + NAX).map(Number),
      peerMaturity: Number(c[12]),
    }));
}
const round = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;
const breadth = (a: number[]): number => mean(a);
const isCosmo = (p: string): boolean => p.startsWith('Cosmogonic');

// minimal Gauss-Jordan invert for Mahalanobis
function invert(Ain: number[][]): number[][] {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
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
      const fac = A[r]![col]!;
      for (let j = 0; j < n; j++) {
        A[r]![j]! -= fac * A[col]![j]!;
        I[r]![j]! -= fac * I[col]![j]!;
      }
    }
  }
  return I;
}
function mahalanobis(cosmoAxes: number[], peers: Row[], ridge = 0.15): number {
  const mu = AXES.map((_, j) => mean(peers.map((r) => r.axes[j]!)));
  const Cov = Array.from({ length: NAX }, () => Array.from({ length: NAX }, () => 0));
  const n = peers.length;
  for (let a = 0; a < NAX; a++)
    for (let b = 0; b < NAX; b++) {
      let s = 0;
      for (const r of peers) s += (r.axes[a]! - mu[a]!) * (r.axes[b]! - mu[b]!);
      Cov[a]![b] = s / (n - 1);
    }
  for (let i = 0; i < NAX; i++) Cov[i]![i]! += ridge;
  const inv = invert(Cov);
  const diff = cosmoAxes.map((v, j) => v - mu[j]!);
  let d2 = 0;
  for (let a = 0; a < NAX; a++)
    for (let b = 0; b < NAX; b++) d2 += diff[a]! * inv[a]![b]! * diff[b]!;
  return round(Math.sqrt(Math.max(0, d2)), 3);
}

function scenario(rows: Row[], cosmoAxes: number[], peers: Row[]): Record<string, unknown> {
  const breadths = rows.map((r) => (isCosmo(r.project) ? breadth(cosmoAxes) : breadth(r.axes)));
  const cb = breadth(cosmoAxes);
  const popMean = mean(breadths);
  const popStd = standardDeviation(breadths);
  const peerBreadths = peers.map((r) => breadth(r.axes));
  const peerMean = mean(peerBreadths);
  const peerStd = standardDeviation(peerBreadths);
  const rank = [...breadths].sort((a, b) => b - a).indexOf(cb) + 1;
  const pct = (breadths.filter((v) => v <= cb).length / breadths.length) * 100;
  const dominatedBy = peers.filter(
    (r) => r.axes.every((v, j) => v >= cosmoAxes[j]!) && r.axes.some((v, j) => v > cosmoAxes[j]!),
  ).length;
  const peerMaxBreadth = Math.max(...peerBreadths);
  return {
    breadth: round(cb, 3),
    rank,
    total: rows.length,
    percentile: round(pct, 1),
    zPopulation: round((cb - popMean) / popStd, 3),
    zVsPeers: round((cb - peerMean) / peerStd, 3),
    mahalanobis: mahalanobis(cosmoAxes, peers),
    dominatedBy9d: dominatedBy,
    leadOverNearestPeerBreadth: round(cb - peerMaxBreadth, 3),
    perAxisZ: AXES.map((ax, j) => {
      const col = rows.map((r) => (isCosmo(r.project) ? cosmoAxes[j]! : r.axes[j]!));
      const m = mean(col);
      const sd = standardDeviation(col);
      return {
        axis: ax,
        score: cosmoAxes[j]!,
        z: round(sd === 0 ? 0 : (cosmoAxes[j]! - m) / sd, 2),
      };
    }),
  };
}

/**
 * PURE recompute of the code-grounded sensitivity object (the shape written to alife-codeground.json)
 * from the raw comparison CSV + the {@link CODE_GROUNDED} floor. Exported so a gate test can recompute
 * and diff the committed artifact — a CODE_GROUNDED or CSV edit that forgets to regenerate the JSON, or
 * a hand-edited surface number, then fails `check`. Deterministic (no Math.random / Date.now).
 */
export function computeAlifeCodeground(csvText: string): {
  note: string;
  canonicalSource: string;
  historicalSelfScored: Record<string, unknown>;
  canonicalCodeGrounded: Record<string, unknown>;
  selfScored: Record<string, unknown>;
  codeGrounded: Record<string, unknown>;
  deltas: { basis: string; breadth: number; zPopulation: number; mahalanobis: number };
} {
  const rows = parseRows(csvText);
  const cosmo = rows.find((r) => isCosmo(r.project));
  if (!cosmo) throw new Error('Cosmogonic comparison row is missing');
  const peers = rows.filter((r) => !isCosmo(r.project));
  if (
    cosmo.axes.length !== EXPECTED_CANONICAL_CODE_GROUNDED.length ||
    cosmo.axes.some((value, index) => value !== EXPECTED_CANONICAL_CODE_GROUNDED[index])
  ) {
    throw new Error(
      `canonical Cosmogonic CSV profile drifted: expected ${EXPECTED_CANONICAL_CODE_GROUNDED.join(',')}, received ${cosmo.axes.join(',')}`,
    );
  }
  const historical = scenario(rows, HISTORICAL_SELF_SCORED, peers);
  const canonical = scenario(rows, CODE_GROUNDED, peers);
  const historicalEntry = { axes: HISTORICAL_SELF_SCORED, ...historical };
  const canonicalEntry = { axes: CODE_GROUNDED, ...canonical };
  return {
    note: 'sensitivity of A-Life headline statistics: superseded historical optimistic self-score versus the canonical code-grounded CSV profile',
    canonicalSource: 'docs/reports/2026-06-26-alife-comparison-matrix.csv',
    historicalSelfScored: historicalEntry,
    canonicalCodeGrounded: canonicalEntry,
    selfScored: historicalEntry,
    codeGrounded: canonicalEntry,
    deltas: {
      basis: 'canonical-minus-historical',
      breadth: round((canonical.breadth as number) - (historical.breadth as number), 3),
      zPopulation: round((canonical.zPopulation as number) - (historical.zPopulation as number), 3),
      mahalanobis: round((canonical.mahalanobis as number) - (historical.mahalanobis as number), 3),
    },
  };
}

async function main(): Promise<void> {
  const out = computeAlifeCodeground(await Bun.file(CSV).text());
  const historical = out.historicalSelfScored;
  const canonical = out.canonicalCodeGrounded;
  await Bun.write(`${OUT}/alife-codeground.json`, JSON.stringify(out, null, 2) + '\n');

  const fmt = (s: Record<string, unknown>): string =>
    `breadth ${s.breadth} (rank #${s.rank}/${s.total}, pct ${s.percentile}) · z-pop ${s.zPopulation} · z-peers ${s.zVsPeers} · Mahalanobis ${s.mahalanobis} · dominated-by ${s.dominatedBy9d} · lead over nearest peer breadth +${s.leadOverNearestPeerBreadth}`;
  console.log(
    'A-LIFE CODE-GROUNDED SENSITIVITY (historical optimistic self-score vs canonical CSV profile)\n',
  );
  console.log('  HISTORICAL SELF : ' + fmt(historical));
  console.log('  CANONICAL CODE  : ' + fmt(canonical));
  console.log(
    `\n  Δ breadth ${out.deltas.breadth}  ·  Δ z-population ${out.deltas.zPopulation}  ·  Δ Mahalanobis ${out.deltas.mahalanobis}`,
  );
  console.log('\n  per-axis (historical -> canonical, z under canonical):');
  (historical.perAxisZ as { axis: string; score: number }[]).forEach((s, i) => {
    const c = (canonical.perAxisZ as { axis: string; score: number; z: number }[])[i]!;
    const arrow = c.score < s.score ? 'v' : c.score > s.score ? '^' : '=';
    console.log(
      `    ${s.axis.padEnd(22)} ${s.score} -> ${c.score} ${arrow}  (z ${c.z >= 0 ? '+' : ''}${c.z})`,
    );
  });
  console.log('\n  wrote alife-codeground.json');
}

if (import.meta.main) void main();
