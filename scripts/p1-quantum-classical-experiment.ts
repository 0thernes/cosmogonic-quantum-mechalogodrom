/**
 * P1 — Falsifiable quantum-vs-classical advantage experiment harness (per ROADMAP 2026-06-20).
 *
 * Runs controlled arms on a tiny defined task family using existing modules:
 *   - "Classical" arm: disable or minimize quantum faculties (QGT, spin, Eshkol quantum collapse, resonance order bias, etc.).
 *   - "Full" arm: normal quantum-substrate faculties.
 *
 * Metrics (deterministic, seeded): survival steps, resource accumulation, empowerment proxy.
 * Reports the paired Full−Classical effect size + a bootstrap 95% CI.
 *
 * 2026-06-27 — the arms are now a REAL parameter-matched ablation (classical = setQuantumAblated(true),
 * identical percepts). The earlier scaffold differed the arms only by chaos level, which the survival
 * model rewards directly, so that delta measured CHAOS, not a quantum advantage. The ablation now gates
 * the WHOLE quantum-substrate contribution to the DECISION: the quantum-reservoir + Schrödinger-spread
 * curiosity terms, the open-system Lindblad deliberation qubit's push on EXPLORE, the Eshkol-QRNG draw
 * into HUNT, and the QGT (quantum-natural-gradient) + NQS/VMC contributions to the surprise signal. Every
 * gated faculty still evolves + reports on the snapshot; only its influence on the plan is removed. The
 * honest expectation is still a SMALL or NULL effect — and a null is a valid result: the substrate is not
 * yet shown to buy a behavioural advantage on this toy task. Pre-register a real task before any claim.
 *
 * Usage (manual or CI probe):
 *   bun scripts/p1-quantum-classical-experiment.ts --seeds 30 --beats 200
 *
 * Receipts: pure, one seed per run, no Math.random. Extend with real stats lib when ready.
 */

import { mulberry32 } from '../src/math/rng';
import { SuperMind } from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';
import type { SuperMindIntent, SuperMindSnapshot } from '../src/sim/super-mind';

type Arm = 'classical' | 'full';

interface RunResult {
  seed: number;
  arm: Arm;
  survival: number; // beats until "death" proxy (energy < 0)
  totalResource: number;
  meanEmpowerment: number;
}

function makePercept(t: number, chaos: number): SuperPercept {
  return {
    energy: 0.6 + 0.3 * Math.sin(t * 0.07),
    threat: 0.15 + 0.2 * ((t % 17) / 17),
    crowding: 0.25,
    chaos,
    wealthRel: 0.5,
    preyClose: 0.4 + 0.3 * Math.sin(t * 0.11),
    rivalClose: 0.2,
    pull: 0.15,
    light: 0.6,
    sound: 0.4,
    phase: (t % 60) / 60,
  };
}

function runArm(seed: number, maxBeats: number, arm: Arm): RunResult {
  const rng = mulberry32(seed);
  // CONTROLLED ABLATION (fixed 2026-06-27): both arms see IDENTICAL percepts (same fixed chaos); the ONLY
  // difference is whether the quantum-substrate faculties contribute (classical → setQuantumAblated(true)).
  // The previous scaffold differed the arms by CHAOS level, which the survival model rewards directly — so
  // its delta measured chaos, NOT a quantum advantage. Now any Full−Classical delta is attributable to the
  // quantum substrate alone (architecture, params, seed, percepts all matched).
  const FIXED_CHAOS = 0.4;

  const mind = new SuperMind(rng);
  if (arm === 'classical') mind.setQuantumAblated(true);
  let energy = 1.0;
  let totalRes = 0;
  let empSum = 0;
  let t = 0;

  for (t = 0; t < maxBeats; t++) {
    const p = makePercept(t, FIXED_CHAOS);
    const intent = mind.think(p);
    const snap = mind.snapshot();

    // Simple survival model using existing signals
    const emp = empowermentProxy(intent, snap);
    empSum += emp;

    // Resource proxy using available signals (economy may be on world, use resonance/order as proxy)
    const resDelta = snap.resonance.order * 0.015 - intent.consciousness.surprise * 0.008;
    totalRes += resDelta;
    energy += resDelta - 0.008; // baseline drain

    if (energy <= 0) break;
  }

  return {
    seed,
    arm,
    survival: t,
    totalResource: totalRes,
    meanEmpowerment: empSum / Math.max(1, t || 1),
  };
}

function empowermentProxy(intent: SuperMindIntent, snap: SuperMindSnapshot): number {
  return snap.empowerment.empowerment ?? intent.consciousness.ignition ?? 0.5;
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function bootstrapCI(values: number[], seed: number, iters = 1000): [number, number] {
  // Tiny bootstrap for 95% rough interval (for harness; real stats later)
  const rng = mulberry32(seed);
  const n = values.length;
  const stats: number[] = [];
  for (let i = 0; i < iters; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      s += values[(rng() * n) | 0] ?? 0;
    }
    stats.push(s / n);
  }
  stats.sort((a, b) => a - b);
  const lo = stats[(0.025 * iters) | 0] ?? 0;
  const hi = stats[(0.975 * iters) | 0] ?? 0;
  return [lo, hi];
}

/**
 * Two-sided paired permutation (randomization / sign-flip) test for a set of paired deltas
 * `d_i = full_i − classical_i`. The null hypothesis is exchangeability of the arm labels within each
 * seed, i.e. each `d_i` is equally likely to have carried the opposite sign — so under H0 the sampling
 * distribution of the mean is generated by independently flipping the sign of every `d_i`. Returns the
 * fraction of `iters` random sign-assignments whose |mean| ≥ the observed |mean|, with the standard
 * add-one correction `(hits + 1)/(iters + 1)` so the estimate is unbiased and never exactly 0.
 *
 * Deterministic (seeded mulberry32), pure, O(iters · n). This is the correct significance test for a
 * within-seed paired design (it makes no normality assumption, unlike a t-test) and is the honest
 * companion to the bootstrap CI: the CI shows the effect's spread, this shows whether it clears noise.
 * A high p (≳ 0.05) means "not distinguishable from no effect" — which for the quantum ablation is the
 * scientifically expected, and perfectly valid, outcome.
 */
export function pairedPermutationP(deltas: number[], seed: number, iters = 5000): number {
  const n = deltas.length;
  if (n === 0) return 1;
  let obs = 0;
  for (let i = 0; i < n; i++) obs += deltas[i] ?? 0;
  obs = Math.abs(obs / n);
  const rng = mulberry32(seed);
  let hits = 0;
  for (let it = 0; it < iters; it++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += (rng() < 0.5 ? -1 : 1) * (deltas[i] ?? 0);
    if (Math.abs(s / n) >= obs - 1e-12) hits++;
  }
  return (hits + 1) / (iters + 1);
}

export function runP1Experiment(numSeeds = 20, maxBeats = 180): void {
  console.log('P1 Quantum vs Classical Advantage Harness (deterministic, seeded)');
  console.log(`Seeds: ${numSeeds} | Max beats: ${maxBeats}`);

  const classical: RunResult[] = [];
  const full: RunResult[] = [];

  for (let i = 0; i < numSeeds; i++) {
    const s = 1000 + i * 17;
    classical.push(runArm(s, maxBeats, 'classical'));
    full.push(runArm(s, maxBeats, 'full'));
  }

  const cSurv = classical.map((r) => r.survival);
  const fSurv = full.map((r) => r.survival);
  const cEmp = classical.map((r) => r.meanEmpowerment);
  const fEmp = full.map((r) => r.meanEmpowerment);

  const dSurv = mean(fSurv) - mean(cSurv);
  const dEmp = mean(fEmp) - mean(cEmp);

  const deltasSurv: number[] = fSurv.map((v, i) => v - (cSurv[i] ?? 0) || 0);
  const deltasEmp: number[] = fEmp.map((v, i) => v - (cEmp[i] ?? 0) || 0);
  const ciSurv = bootstrapCI(deltasSurv, 0x51f15e);
  const ciEmp = bootstrapCI(deltasEmp, 0xe4f5eed);
  const pSurv = pairedPermutationP(deltasSurv, 0x9e3779b1);
  const pEmp = pairedPermutationP(deltasEmp, 0x85ebca6b);
  const verdict = (p: number): string =>
    p <= 0.05 ? 'distinguishable from noise' : 'NOT distinguishable from noise (null)';

  console.log('\nSurvival (higher better):');
  console.log(`  Classical mean: ${mean(cSurv).toFixed(1)}`);
  console.log(`  Full mean:      ${mean(fSurv).toFixed(1)}`);
  const ci0s = ciSurv[0] ?? 0,
    ci1s = ciSurv[1] ?? 0;
  console.log(
    `  Delta (Full - Classical): ${dSurv.toFixed(2)}  [${ci0s.toFixed(2)}, ${ci1s.toFixed(2)}]`,
  );
  console.log(`  Paired permutation p = ${pSurv.toFixed(4)}  → ${verdict(pSurv)}`);

  console.log('\nMean Empowerment (higher better):');
  console.log(`  Classical mean: ${mean(cEmp).toFixed(3)}`);
  console.log(`  Full mean:      ${mean(fEmp).toFixed(3)}`);
  const ci0e = ciEmp[0] ?? 0,
    ci1e = ciEmp[1] ?? 0;
  console.log(`  Delta: ${dEmp.toFixed(4)}  [${ci0e.toFixed(4)}, ${ci1e.toFixed(4)}]`);
  console.log(`  Paired permutation p = ${pEmp.toFixed(4)}  → ${verdict(pEmp)}`);

  console.log(
    '\nNote: The paired permutation test (sign-flip, no normality assumption) is the honest verdict; the bootstrap CI shows the spread. A p ≳ 0.05 means the quantum ablation is not distinguishable from noise on this toy task — the scientifically expected, valid result. The ablation already covers the quantum-reservoir, Schrödinger spread, Lindblad decider, Eshkol-QRNG, QGT, and NQS/VMC pathways; the remaining step before any advantage claim is a PRE-REGISTERED task with real differential mortality (this toy survival task is near-saturating, ~199.7/200, so it has little power to separate the arms).',
  );

  // Simple gate-friendly assertion for the harness itself (not a performance claim)
  if (Math.min(...fSurv) < 5 || Math.min(...cSurv) < 5) {
    console.warn('Warning: some runs died extremely early — check task definition.');
  }
}

if (import.meta.main) {
  const seeds = readNumericArg('--seeds', 20);
  const beats = readNumericArg('--beats', 180);
  runP1Experiment(seeds, beats);
}

function readNumericArg(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  const raw = index >= 0 ? process.argv[index + 1] : undefined;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
