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
 *   reproduction        3.5  entities.ts:466-494 breedTraits + :557 — asexual inherit + point-mutation of 4
 *                            behaviorally load-bearing traits in the LIVE base population, lineage-verified
 *                            against the shipped EntityManager (entity-heredity.test.ts:121-159: >10% parental
 *                            signature vs a 2.5% random baseline). Real heredity, so it clears the repro=3 anchor
 *                            (Primordial Particle Systems: "emergent fission but no heritable genome/mutation").
 *                            It cannot reach 4: there is NO SELECTION. Birth is a flat trait-blind rng()<0.06
 *                            (entities.ts:1135); death is age-driven on `life: 200 + rng()*900` (entities.ts:563),
 *                            drawn from the MAIN rng at spawn and never inherited. No birth or death path reads a
 *                            heritable trait, so heredity + mutation + zero fitness differential = NEUTRAL DRIFT.
 *                            Every repro=4 peer has selection (Cell Lab, Bibites, Life Engine, biosim4, Karl Sims)
 *                            or true self-replication (Langton's Loops, von Neumann UC). The prior 4.0 cited
 *                            genome.ts breed/crossover — ZERO callers in src/, "reserved for the planned spawn-path
 *                            wiring" by their own docstring — and the soup rebirth, which is `pa = i` inside
 *                            `if (!alive[i])`: corpse x living, not two live parents, and a startup transient that
 *                            is dormant thereafter. Reproduction was the ONLY axis carried verbatim from the
 *                            superseded self-score with no gate and no revision — OVERCLAIMED (was 4.0).
 *                            HONEST PATH BACK: make one reproductive quantity depend on a heritable trait (gate the
 *                            split roll on inherited nW/strategy, or derive `life` from a gene), then add
 *                            GATE-REPRO-SELECT proving trait frequencies shift vs a fitness-blind ablated control.
 *   open-endedness      2.4  emergence-angles.ts real GA + TWO live fitness-selection loops (soup harvest
 *                            world.ts:4094 + petri truncation-selection petri-dish.ts:204, live at :526) + the birth
 *                            engine shows bounded active novelty versus a frozen control and the petri ring
 *                            selects differentially (GATE-OE-LIVE / GATE-PETRI-SURVIVE). This is not proof
 *                            of unbounded open-ended evolution — the cautious floor was 2.2.
 *   ecology             3.3  titans.ts real economyTick + soup SELECTION loop closed (world.ts:3085 spawns the
 *                            vitality-argmax; GATE-SOUP-SELECT: differential >0 vs a blind pick ~0) PLUS a new
 *                            Xenomimic trophic layer — ground fauna GRAZE the flora and are PREYED on by the base
 *                            entities (world.ts:4554 consumeNearest, one-way, 5s respawn), with the entity
 *                            connectome firing density fed back as swarm agitation. Predation REGULATES the swarm
 *                            to a stable equilibrium below its unpredated carrying capacity without collapsing it,
 *                            and the trophic energy flux scales with predation intensity, ablation-verified
 *                            (GATE-XENO-TROPHIC). A classical ecology model, not real-world fidelity — was 3.2
 *   morphology/physics  3.8  reaction-diffusion.ts:87-336 live Gray-Scott PDE (step() :171, stepped every
 *                            frame world.ts:2725); super-body cosmetic. The old "schrodinger.ts dead code" note
 *                            is RETIRED as FALSE — it has two live consumers (xenomimic-brain.ts:45,
 *                            latent-substrates.ts:20) and is already banked on substrate pluralism below, so
 *                            this axis must not re-count it. No rigid/soft-body, collision or forces —
 *                            DEFENSIBLE (was 4.0)
 *   cognition/learning  4.5  super-creature.ts predict->surprise->GOAP + FOUR gate-backed non-apex loops on the
 *                            SHIPPED path. (GATE-FORAGE is deliberately NOT among them: sim/ad-forager.ts is a
 *                            reference kernel with zero src consumers — it self-declares "not wired into the live
 *                            EntityManager population" at :5-6 — so the batch-15b +0.1 it once carried is
 *                            re-attributed to GATE-CHEMOTAXIS, which establishes the same capability by ablation
 *                            on the REAL EntityManager+AlienFlora. Gating a stand-in green-lights a no-op.) The
 *                            digital-life population LEARNS its fitness by exact Eshkol AD to the analytic optimum,
 *                            ablation-verified, live in petri (GATE-BIOLOGIC-LEARN); the LIVE base population
 *                            FORAGES up the flora biomass gradient (chemotaxis) reaching >3x richer flora than
 *                            a blind wanderer (GATE-CHEMOTAXIS, entities.ts); a real VQE resolves the four
 *                            competing drives into a minimum-frustration JOINT commitment by the EXACT
 *                            parameter-shift gradient through the Eshkol AD tape (GATE-VQE-RESOLVE); and a
 *                            predictive-metacognition faculty fits an EXACT arbitrary-order Taylor jet to the
 *                            trajectory and gates decisiveness by its validated remainder (GATE-PREDICTIVE-
 *                            METACOG, predictive-metacognition.ts). Six accumulated gate-backed mechanisms
 *                            now substantiate the original self-scored ceiling — was 3.8
 *   substrate pluralism 4.6  qcircuit.ts real 5-qubit statevector wired + tsotchke-deep-wire real irrep/SVD PLUS
 *                            a genuinely NEW second, independent live consumer of the raw Crank–Nicolson
 *                            wavefunction (math/schrodinger.ts) now drives the Xenomimic ground fauna: each beat
 *                            evolves a Gaussian wavepacket by the EXACT unitary CN scheme under a sense-shaped
 *                            potential and reads its positional spread as an exploration cue widening the
 *                            creature's turn, ablation-verified (GATE-XENO-SCHRODINGER, xenomimic-brain.ts
 *                            schrodingerSpread). A distinct substrate CLASS — a continuous position-space PDE —
 *                            feeding a wholly separate population. The prior "schrodinger/causal-graph/
 *                            predictive-coding isolated" note was stale: schrodinger is also consumed by the apex
 *                            latent-substrate probe (sim/latent-substrates.ts) and causal-graph/predictive-coding
 *                            remain wired only there (not independently gated), so the axis is still short of the
 *                            5.0 self-score — was 4.5
 *   instrumentation     4.4  analytics.ts:57-215 wired regression+audit PLUS rng-stats.ts (the Tsotchke
 *                            quantum_stats randomness battery) is now WIRED LIVE — core/rng-provenance.ts makes
 *                            the Xenomimic population MEASURE a provenance receipt of the exact seeded mulberry32
 *                            generator underpinning its determinism and surface it in telemetry (rngQuality) +
 *                            the panel. The instrument is falsifiable: it scores the sim generator ~0.99 yet
 *                            DISCRIMINATES a degenerate stream far lower under the same battery, is deterministic,
 *                            and surfaces with recompute fidelity (GATE-RNG-PROVENANCE). This retires the prior
 *                            "rng-stats.ts isolated" note — was 4.3
 *   consciousness-thy   3.5  integrated-information.ts exact quantum Phi + global-workspace wired. The earlier
 *                            "causal-graph + predictive-coding NEVER instantiated" note is STALE: the real
 *                            hierarchical predictive-coding.ts IS live (super-mind.ts:1198-1200 inferStep+freeEnergy
 *                            feed cons.surprise) and causal-graph.ts is wired via the apex latent-substrate probe.
 *                            HELD at 3.5 regardless (batch-57 audit) — every named consciousness theory the audit
 *                            tracks (IIT / GWT / FEP / HOT / RPT / AST / causal / sensorimotor) is ALREADY
 *                            code-grounded and counted, so no genuinely-new named theory remains to ground; moving
 *                            this axis would re-label existing work, the exact overclaim this most-exposed dimension
 *                            is deliberately held against. The 4.5 self-score stays unearned — OVERCLAIMED (was 4.5)
 *   visual scale        4.0  instanced-entities.ts pooling is the only desktop/ultra path; pools cast no shadows
 *                            (instanced-entities.ts:989). The old "50k tier unbenchmarked" note is RETIRED as FALSE
 *                            — 50k IS measured (BENCHMARKS-2026-06-26.md:207-225, ~167ms/frame ≈ 6fps raw), which
 *                            argues the SAME way: auto-tier stops at desktop 10k (quality.ts:129-136), 50k is an
 *                            explicit ?tier=mega stress ceiling, and whole-world native-GPU frame time is still
 *                            unprofiled — OVERCLAIMED (was 5.0)
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
//   batch-54:  ecology 3.2 -> 3.3 (GATE-XENO-TROPHIC: the batch-47 Xenomimic ground-fauna layer is a genuine new
//              trophic mechanism — a consumer that grazes the flora and a prey the base entities eat (world.ts
//              runXenomimicPredation, one-way, 5s respawn), with the entity connectome firing fed back as swarm
//              agitation. It produces real predator-prey REGULATION: predation holds the swarm to a stable
//              equilibrium BELOW its unpredated carrying capacity without collapsing it, and the trophic energy
//              flux SCALES with predation intensity — both ablation-verified. A new coupled adaptive/reactive
//              ecological mechanism atop the soup-selection + titan-economy grounding; classical model, no claim
//              of real-world ecological fidelity)
//   batch-55:  substrate pluralism 4.5 -> 4.6 (GATE-XENO-SCHRODINGER: the raw Crank–Nicolson wavefunction
//              substrate math/schrodinger.ts gains a genuinely NEW, second, INDEPENDENT live consumer in the
//              Xenomimic brain — each beat evolves a Gaussian wavepacket by the EXACT unitary CN scheme under a
//              sense-shaped potential (food well / threat barrier / crowding drift) and reads its positional
//              spread √(⟨x²⟩−⟨x⟩²) as an exploration cue that widens the creature's turn. Ablation-verified: the
//              spread is bounded, deterministic and drive-responsive, and the coupling measurably changes the
//              swarm's steering versus an ablated control. A distinct substrate CLASS — a continuous
//              position-space PDE — feeding a wholly separate population from the apex mind's existing
//              latent-substrate probe (sim/latent-substrates.ts); classical numerical Schrödinger, not a QPU.
//              Corrects the now-stale "schrodinger isolated" grounding — causal-graph/predictive-coding remain
//              wired only via that single apex probe, so the axis stays below its 5.0 self-score)
//   batch-56:  instrumentation 4.3 -> 4.4 (GATE-RNG-PROVENANCE: the previously-ISOLATED randomness battery
//              math/rng-stats.ts — a port of the Tsotchke quantum_rng quantum_stats.c suite — gets its first live
//              consumer via core/rng-provenance.ts. The Xenomimic population MEASURES a provenance receipt of the
//              exact seeded mulberry32 generator underpinning its determinism (from a dedicated sample, so it
//              never perturbs the live stream) and surfaces it in telemetry (rngQuality) + the panel — measured,
//              not assumed. The instrument is falsifiable: it scores the sim generator ~0.99 yet DISCRIMINATES a
//              degenerate stream far lower under the SAME battery, is deterministic, and surfaces with recompute
//              fidelity. A genuine new MEASURED-observability mechanism; classical statistics over a classical
//              PRNG — a reproducibility receipt, not a physical-entropy or security claim)
//   batch-58:  reproduction 4.0 -> 3.5 (the floor's FIRST DOWNWARD move, and the first correction of an
//              unearned score rather than a credit for new work. A 9-axis re-audit — one auditor per axis,
//              each proposed move then put to three independent skeptics prompted to REFUTE it — returned
//              8 of 9 axes DEFENSIBLE and this one OVERCLAIMED; all three skeptics returned "cannot
//              refute". Note the law is deliberately ASYMMETRIC: a gate is the price of a RAISE, and
//              demanding one for a LOWERING would freeze unearned scores forever, since no gate can prove
//              a mechanism ISN'T there. Reproduction was the only axis carried verbatim from the
//              superseded optimistic self-score with no gate and no revision, while five siblings were
//              lowered on inspection. Both of its cited groundings fail on the code: genome.ts
//              breed/crossover have ZERO callers in src/ and their own docstring calls them "reserved for
//              the planned entity/NHI spawn-path wiring", decodeTraits (sole reader of the 10-trait
//              phenotype, fertility included) has no caller at all, and the soup rebirth breeds `pa = i`
//              from INSIDE `if (!alive[i])` — a corpse genome, not the "two living parents" both modules
//              claimed (docstrings corrected separately). What remains is real but unselected: heritable
//              traits + point mutation with a flat trait-blind birth roll and an uninherited lifespan =
//              neutral drift. 3.5 credits the genuine live heredity the rationale never cited and refuses
//              credit for selection that does not exist. Lowering a score is not a capability regression:
//              nothing in the sim changed, only the honesty of the number. NOTE the anti-inflation assert
//              floor[i] <= self[i] still holds (3.5 <= 4.0), but that cap is worth revisiting — it lets a
//              superseded 2026-06-26 guess bound the measured floor, and Cognition sits at zero headroom)
export const CODE_GROUNDED = [3.5, 2.4, 3.3, 3.8, 4.5, 4.6, 4.4, 3.5, 4.0];
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
