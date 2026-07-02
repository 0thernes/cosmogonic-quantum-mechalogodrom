#!/usr/bin/env bun
/**
 * alife-codeground-sensitivity.ts — the HONESTY stress-test behind the A-Life deep-dive.
 *
 * The 25-peer rows in `2026-06-26-alife-comparison-matrix.csv` are literature/documentation
 * judgments; the ONE row that is a self-score (Cosmogonic) was re-audited against the ACTUAL
 * SOURCE by a 9-agent code-grounding pass (2026-06-26). Several self-scores were optimistic.
 * This script recomputes EVERY headline statistic twice — once with the self-scored row, once
 * with the code-defensible row — so the deep-dive can show exactly how much the conclusion moves
 * under brutal re-scoring. Pure + deterministic (no Math.random / Date.now).
 *
 *   bun scripts/alife-codeground-sensitivity.ts   # prints both scenarios + writes alife-codeground.json
 *
 * Code-grounded Cosmogonic vector — each axis cites the strongest source the auditor could defend:
 *   reproduction        4.0  genome.ts:77-147 + primordial-soup.ts:118-147 (seeded recombine rebirth) — DEFENSIBLE
 *   open-endedness      2.2  emergence-angles.ts:117-184 only real GA; super-evolution.ts:93-287 handcrafted arc — OVERCLAIMED (was 3.5)
 *   ecology             3.0  titans.ts:969-1015 real economyTick; leviathans scenery, connectome one-way — OVERCLAIMED (was 5.0)
 *   morphology/physics  3.8  reaction-diffusion.ts:87-290 live Gray-Scott PDE; schrodinger.ts dead code, super-body cosmetic — DEFENSIBLE (was 4.0)
 *   cognition/learning  3.8  super-creature.ts:234-280 real predict->surprise->GOAP; super-mind integration depth unverified — mild (was 4.5)
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
const CODE_GROUNDED = [4.0, 2.2, 3.0, 3.8, 3.8, 4.5, 4.3, 3.5, 4.0];

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

async function main(): Promise<void> {
  const rows = parseRows(await Bun.file(CSV).text());
  const cosmo = rows.find((r) => isCosmo(r.project))!;
  const peers = rows.filter((r) => !isCosmo(r.project));
  const self = scenario(rows, cosmo.axes, peers);
  const code = scenario(rows, CODE_GROUNDED, peers);

  const out = {
    note: 'sensitivity of the A-Life headline stats to code-grounded re-scoring of the one self-scored row',
    selfScored: { axes: cosmo.axes, ...self },
    codeGrounded: { axes: CODE_GROUNDED, ...code },
    deltas: {
      breadth: round((code.breadth as number) - (self.breadth as number), 3),
      zPopulation: round((code.zPopulation as number) - (self.zPopulation as number), 3),
      mahalanobis: round((code.mahalanobis as number) - (self.mahalanobis as number), 3),
    },
  };
  await Bun.write(`${OUT}/alife-codeground.json`, JSON.stringify(out, null, 2) + '\n');

  const fmt = (s: Record<string, unknown>): string =>
    `breadth ${s.breadth} (rank #${s.rank}/${s.total}, pct ${s.percentile}) · z-pop ${s.zPopulation} · z-peers ${s.zVsPeers} · Mahalanobis ${s.mahalanobis} · dominated-by ${s.dominatedBy9d} · lead over nearest peer breadth +${s.leadOverNearestPeerBreadth}`;
  console.log('A-LIFE CODE-GROUNDED SENSITIVITY (self-scored vs source-audited Cosmogonic row)\n');
  console.log('  SELF-SCORED : ' + fmt(self));
  console.log('  CODE-GROUND : ' + fmt(code));
  console.log(
    `\n  Δ breadth ${out.deltas.breadth}  ·  Δ z-population ${out.deltas.zPopulation}  ·  Δ Mahalanobis ${out.deltas.mahalanobis}`,
  );
  console.log('\n  per-axis (self -> code-grounded, z under code-grounded):');
  (self.perAxisZ as { axis: string; score: number }[]).forEach((s, i) => {
    const c = (code.perAxisZ as { axis: string; score: number; z: number }[])[i]!;
    const arrow = c.score < s.score ? 'v' : c.score > s.score ? '^' : '=';
    console.log(
      `    ${s.axis.padEnd(22)} ${s.score} -> ${c.score} ${arrow}  (z ${c.z >= 0 ? '+' : ''}${c.z})`,
    );
  });
  console.log('\n  wrote alife-codeground.json');
}
void main();
