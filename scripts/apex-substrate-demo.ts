/**
 * APEX #101 substrate demo — drives the full 1-billion-parameter substrate for the ς apex end-to-end
 * and prints what it does. A tangible, deterministic proof (and the integration reference for wiring
 * the driver into the world beat loop). Run: `bun scripts/apex-substrate-demo.ts`
 *
 * NOT part of the app; a headless witness. Deterministic — same output every run.
 */
import { SCALE_MASSIVE } from '../src/sim/apex-brain';
import { LINEAGE } from '../src/sim/pantheon-breeding';
import { ApexSubstrateDriver } from '../src/sim/apex-substrate-driver';
import { manifoldSummary } from '../src/sim/apex-parameter-manifold';
import { substrateUniforms } from '../src/sim/apex-substrate-visual';
import { apexOffworldScore } from '../src/sim/apex-offworld-score';

const f = (v: number, d = 3): string => v.toFixed(d);

// The final-sigma ς apex identity (pantheon index 100).
const seed = LINEAGE[100]?.seed ?? 0x5c2b;
const driver = new ApexSubstrateDriver(SCALE_MASSIVE, seed);

console.log('═══ APEX #101 (ς) — 1-BILLION-PARAMETER SUBSTRATE ═══\n');
console.log('  ' + manifoldSummary(driver.manifold));
const t0 = driver.telemetry();
console.log(
  `  quantum: dense ${t0.quantum.denseQubits}q · stabilizer ${t0.quantum.stabilizerQubits}q` +
    ` → ${(t0.quantum.stabilizerDim / 1e9).toFixed(2)}B-dim` +
    ` (${t0.quantum.reachesBillion ? '✦ billion Hilbert dim' : 'sub-billion'})\n`,
);

console.log('  beat │ motor  explor therml transc │ acoustic heat  tunnel richness');
console.log('  ─────┼──────────────────────────────┼──────────────────────────────');
for (let beat = 1; beat <= 24; beat++) {
  const drive = 0.5 + 0.4 * Math.sin(beat * 0.4);
  driver.step(drive);
  if (beat % 4 === 0) {
    const m = driver.modulate(6);
    const s = driver.telemetry().sensorium;
    console.log(
      `  ${String(beat).padStart(4)} │ ${f(m.motorGain)}  ${f(m.exploration)}  ${f(m.thermalStress)}  ${f(m.transcendencePush)} │` +
        `  ${f(s.acousticInterference)}    ${f(s.heatLoad)} ${f(s.tunnelAmplitude)}  ${f(s.richness)}`,
    );
  }
}

// Ablation deltas — prove each tier is load-bearing.
const full = driver.modulate(6);
console.log('\n  ─── ablation (Δ motorGain when a tier is removed) ───');
for (const tier of ['procedural', 'quantum', 'field', 'resident'] as const) {
  const d = full.motorGain - driver.modulate(6, { [tier]: true }).motorGain;
  console.log(`    remove ${tier.padEnd(11)} → Δ motorGain ${d >= 0 ? '+' : ''}${f(d, 4)}`);
}

// Offworld umwelt score — how alien is the behaviour?
const off = apexOffworldScore(SCALE_MASSIVE);
console.log(
  `\n  offworld umwelt score: ${f(off.score)} (earth-likeness ${f(off.earthLikeness)})` +
    ` — ${(off.score * 100).toFixed(1)}% of behaviour is the alien substrate\n`,
);

// Visual uniforms the apex body shader would consume.
const u = substrateUniforms(driver.manifold, driver.telemetry().quantum);
console.log('  body uniforms:', Object.fromEntries(Object.entries(u).map(([k, v]) => [k, f(v)])));
console.log('\n═══ deterministic · Tsotchke quantum brain · NOT sentient (doctrine Level 3-4) ═══');
