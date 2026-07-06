#!/usr/bin/env bun
/**
 * reproduce.ts — the THIRD-PARTY REPRODUCIBILITY ARTIFACT (risk register R2; scrutiny point #22).
 *
 * The single weakest scientific axis of this project is external validation: every internal receipt is
 * strong, but nobody outside has re-run anything. This script is the mechanical fix — a one-command,
 * dependency-light, fully deterministic replication of the apex mind's headline measured claims:
 *
 *   bun scripts/reproduce.ts                 # default seed 123 · 200 beats
 *   bun scripts/reproduce.ts --seed 7 --beats 500
 *
 * It runs the REAL `SuperMind` (the full apex cognition stack — GWT ignition, IIT-Φ, active inference,
 * spin-glass, quantum register, Clifford reflex, the works) under a fixed seed and a scripted percept
 * schedule, records the 16 consciousness-faculty activations every beat, and prints:
 *
 *   - a FINGERPRINT (FNV-1a over every recorded float's bytes) — run it twice, the hashes MUST match;
 *     run it on another machine at the same commit, the hash MUST still match (bit-reproducibility);
 *   - the measured COUPLING metrics (meanAbsCoupling / density / isolated count) — the same numbers the
 *     gate's regression floor enforces (tests/coupling-audit.test.ts);
 *   - a final-snapshot digest of the headline consciousness indicators.
 *
 * What matching hashes PROVE: the determinism claim and the coupling measurement are real and
 * reproducible by anyone, with no trust in this repo's own CI. What they do NOT prove: consciousness,
 * sentience, or scientific validity of the interpretations — see docs/RUNBOOK-2026-06-26.md.
 *
 * PURE math only: no Math.random, no Date.now, no network, no DOM. Exported functions are test-covered
 * (tests/reproduce.test.ts) without pinning a golden hash (the hash changes whenever the apex evolves —
 * it is a PER-COMMIT fingerprint, not an eternal constant).
 */
import { mulberry32 } from '../src/math/rng';
import { SuperMind, type SuperMindSnapshot } from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';
import { couplingReport } from '../src/sim/coupling-audit';

/** The scripted, seed-independent percept schedule (mirrors tests/coupling-audit.test.ts). */
function perceptAt(i: number): SuperPercept {
  return {
    energy: 1 - (i % 7) / 7,
    threat: (i % 11) / 11,
    crowding: 0.3,
    chaos: ((i % 9) + 1) / 10,
    wealthRel: 0.5,
    preyClose: 0.3,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: i / 60,
  };
}

/** The 16 consciousness-faculty activations the coupling audit reads from each snapshot. */
function faculties(s: SuperMindSnapshot): number[] {
  const c = s.consciousness;
  return [
    c.dreaming,
    c.hallucinating,
    c.reasoning,
    c.selfAware,
    c.novelty,
    c.surprise,
    c.ignition,
    c.phi,
    c.qualiaTone,
    (c.feeling + 1) / 2,
    s.empowerment.empowerment,
    s.holographic.confidence,
    s.deliberation.coherence,
    s.reservoir.novelty,
    s.metacog.confidence,
    s.resonance.order,
  ];
}

/** FNV-1a (32-bit, two independent lanes → 64-bit hex) over the exact IEEE-754 bytes of each value. */
export function fingerprint(values: readonly number[]): string {
  const buf = new DataView(new ArrayBuffer(8));
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4 ^ 0x5bd1e995;
  for (const v of values) {
    buf.setFloat64(0, v, true);
    for (let b = 0; b < 8; b++) {
      const byte = buf.getUint8(b);
      h1 = ((h1 ^ byte) * 0x01000193) >>> 0;
      h2 = ((h2 ^ ((byte + 0x9e) & 0xff)) * 0x01000193) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** The receipt a replicator compares. Everything in it is deterministic given (seed, beats). */
export interface ReproReceipt {
  seed: number;
  beats: number;
  /** FNV-1a over all 16 × beats recorded activations, in faculty-major order. */
  fingerprint: string;
  /** Coupling metrics at threshold 0.3 — the gate-enforced numbers (floor 0.188 < mean < 0.6). */
  meanAbsCoupling: number;
  density: number;
  isolatedCount: number;
  /** Final-beat headline indicators (rounded to 6 dp for display; the hash carries full precision). */
  final: { phi: number; ignition: number; selfAware: number; empowerment: number };
}

/** Run the full apex mind for `beats` under `seed` and measure. Pure + deterministic. */
export function reproduce(seed: number, beats: number): ReproReceipt {
  const mind = new SuperMind(mulberry32(seed));
  const series: number[][] = Array.from({ length: 16 }, () => []);
  let last: SuperMindSnapshot | null = null;
  for (let i = 0; i < beats; i++) {
    mind.think(perceptAt(i));
    last = mind.snapshot();
    const v = faculties(last);
    for (let f = 0; f < v.length; f++) series[f]!.push(v[f]!);
  }
  const rep = couplingReport(series, 0.3);
  const all: number[] = [];
  for (const s of series) all.push(...s);
  const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
  return {
    seed,
    beats,
    fingerprint: fingerprint(all),
    meanAbsCoupling: r6(rep.meanAbsCoupling),
    density: r6(rep.density),
    isolatedCount: rep.isolated.length,
    final: {
      phi: r6(last!.consciousness.phi),
      ignition: r6(last!.consciousness.ignition),
      selfAware: r6(last!.consciousness.selfAware),
      empowerment: r6(last!.empowerment.empowerment),
    },
  };
}

if (import.meta.main) {
  const argN = (flag: string, dflt: number): number => {
    const i = process.argv.indexOf(flag);
    const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : dflt;
  };
  const seed = argN('--seed', 123);
  const beats = argN('--beats', 200);

  const a = reproduce(seed, beats);
  const b = reproduce(seed, beats); // in-process double-run: determinism is asserted, not assumed
  const deterministic = a.fingerprint === b.fingerprint;

  console.log('COSMOGONIC REPRODUCIBILITY RECEIPT');
  console.log(`  seed ${a.seed} · ${a.beats} beats · 16 consciousness faculties recorded per beat`);
  console.log(`  fingerprint        ${a.fingerprint}  (FNV-1a over every recorded float's bytes)`);
  console.log(
    `  double-run check   ${deterministic ? 'IDENTICAL — deterministic' : 'MISMATCH — determinism VIOLATED'}`,
  );
  console.log(
    `  meanAbsCoupling    ${a.meanAbsCoupling}  (gate floor > 0.188, anti-overclaim < 0.6)`,
  );
  console.log(`  coupling density   ${a.density} · isolated faculties ${a.isolatedCount}/16`);
  console.log(
    `  final indicators   phi ${a.final.phi} · ignition ${a.final.ignition} · selfAware ${a.final.selfAware} · empowerment ${a.final.empowerment}`,
  );
  console.log('');
  console.log(
    '  To replicate: same commit + same command on any machine must print the SAME fingerprint.',
  );
  console.log(
    '  Full gate receipts: `bun run check`. Methodology + claims scope: docs/RUNBOOK-2026-06-26.md',
  );
  if (!deterministic) process.exit(1);
}
