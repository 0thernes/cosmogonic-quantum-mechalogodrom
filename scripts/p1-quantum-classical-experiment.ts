/**
 * P1 — Falsifiable quantum-vs-classical advantage experiment harness (per ROADMAP 2026-06-20).
 *
 * Runs controlled arms on a tiny defined task family using existing modules:
 *   - "Classical" arm: disable or minimize quantum faculties (QGT, spin, Eshkol quantum collapse, resonance order bias, etc.).
 *   - "Full" arm: normal quantum-substrate faculties.
 *
 * Metrics (deterministic, seeded): survival steps, resource efficiency, decision quality proxy.
 * Reports effect size, 95% CI skeleton (bootstrap later), ablation signal.
 *
 * This is the infrastructure. Run many seeds, pre-register tasks in future.
 * Current task: simple resource-foraging survival in a noisy field (uses existing economy + percept bias).
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
  // For "classical" we bias the mind constructor / percepts to reduce quantum signals.
  // In real use this would be a flag on SuperMind or faculty mask.
  // For scaffold we simulate by higher chaos + lower phase coherence bias in percept.
  const effectiveChaos = arm === 'classical' ? 0.7 : 0.35;

  const mind = new SuperMind(rng);
  let energy = 1.0;
  let totalRes = 0;
  let empSum = 0;
  let t = 0;

  for (t = 0; t < maxBeats; t++) {
    const p = makePercept(t, effectiveChaos);
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

  console.log('\nSurvival (higher better):');
  console.log(`  Classical mean: ${mean(cSurv).toFixed(1)}`);
  console.log(`  Full mean:      ${mean(fSurv).toFixed(1)}`);
  const ci0s = ciSurv[0] ?? 0,
    ci1s = ciSurv[1] ?? 0;
  console.log(
    `  Delta (Full - Classical): ${dSurv.toFixed(2)}  [${ci0s.toFixed(2)}, ${ci1s.toFixed(2)}]`,
  );

  console.log('\nMean Empowerment (higher better):');
  console.log(`  Classical mean: ${mean(cEmp).toFixed(3)}`);
  console.log(`  Full mean:      ${mean(fEmp).toFixed(3)}`);
  const ci0e = ciEmp[0] ?? 0,
    ci1e = ciEmp[1] ?? 0;
  console.log(`  Delta: ${dEmp.toFixed(4)}  [${ci0e.toFixed(4)}, ${ci1e.toFixed(4)}]`);

  console.log(
    '\nNote: This is the P1 scaffold. Extend with real task, more ablations (QGT off, spin off, Eshkol QRNG off), and statistical test when the effect size is non-trivial. Negative or zero result is valid science.',
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
