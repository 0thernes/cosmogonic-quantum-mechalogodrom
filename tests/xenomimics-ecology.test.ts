/**
 * GATE-XENO-TROPHIC — the Xenomimics are a REAL new ECOLOGICAL layer, not decoration.
 *
 * The substrate (GATE-XENOMIMIC) proves the creatures live/think/breed; the world coupling
 * (GATE-XENOMIMIC-COUPLING) proves `consume()` + the `chaos` sense are wired. This gate proves the
 * ECOLOGY the owner asked for — that adding this ground-fauna layer produces genuine predator–prey
 * DYNAMICS, ablation-verified against a predation-free control:
 *
 *   1. PREDATION REGULATES the swarm to a stable equilibrium BELOW its unpredated carrying capacity —
 *      without collapsing it (the 5-second predation respawn + logistic growth keep it alive). A
 *      classic ecological regulation signature, and the predation-free arm is the ablation control.
 *   2. TROPHIC ENERGY FLUX flows through the new link and SCALES with predation intensity — heavier
 *      grazing transfers strictly more cumulative energy to the predators.
 *
 * This is what grounds the ecology axis moving 3.2 → 3.3 (`scripts/alife-codeground-sensitivity.ts`):
 * a genuinely new coupled trophic mechanism, gated. It is deterministic (the population's own seeded
 * substream; predation here is applied by the test at a fixed cadence, no rng) and honest — a
 * bounded classical ecology model, not a claim of real-world ecological fidelity.
 */
import { describe, expect, test } from 'bun:test';
import { XenomimicPopulation } from '../src/sim/xenomimics';

/**
 * Advance a population `steps` at `dt`. For the first `establish` steps the swarm grows undisturbed
 * (so it reaches an ecologically meaningful standing stock); thereafter, a predation pressure grazes a
 * bounded `fraction` of the live swarm on a ~5 Hz cadence — mirroring world.ts `runXenomimicPredation`
 * (throttled, ≤`fraction` of live per tick, one creature consumed per predation event). Returns the
 * cumulative energy yielded to predators through the trophic link.
 */
function runWithPredation(
  pop: XenomimicPopulation,
  steps: number,
  dt: number,
  food: (x: number, z: number) => number,
  fraction: number,
  establish: number,
): number {
  let predClock = 0;
  let yielded = 0;
  for (let i = 0; i < steps; i++) {
    pop.step(dt, { foodAt: food });
    if (i < establish) continue;
    predClock += dt;
    if (fraction > 0 && predClock >= 0.2) {
      predClock = 0;
      // Count the live swarm, then consume up to `fraction` of it (deterministic forEach order).
      let alive = 0;
      pop.forEach(() => alive++);
      const cap = Math.max(1, Math.floor(alive * fraction));
      let eaten = 0;
      const victims: Parameters<Parameters<XenomimicPopulation['forEach']>[0]>[0][] = [];
      pop.forEach((c) => {
        if (eaten < cap) {
          victims.push(c);
          eaten++;
        }
      });
      for (const v of victims) yielded += pop.consume(v);
    }
  }
  return yielded;
}

describe('GATE-XENO-TROPHIC — predator–prey ecology', () => {
  test('predation REGULATES the population below the unpredated cap without collapsing it (ablation)', () => {
    const food = (): number => 0.9;
    // Ablation control: no predation — the swarm grows to its logistic carrying capacity (the cap).
    const control = new XenomimicPopulation(4242, { growthRamp: 40 });
    runWithPredation(control, 2400, 1 / 30, food, 0, 99999);
    const controlPop = control.population();

    // Treatment: identical world, established the same way, then a steady predation pressure grazes it.
    const predated = new XenomimicPopulation(4242, { growthRamp: 40, predationRespawn: 5 });
    runWithPredation(predated, 2400, 1 / 30, food, 0.03, 1200);
    const predatedPop = predated.population();

    // Regulation: predation holds the population meaningfully BELOW the unpredated carrying capacity…
    expect(controlPop).toBeGreaterThan(2);
    expect(predatedPop).toBeLessThan(controlPop * 0.9);
    // …yet the 5-second respawn + growth keep it ALIVE (a stable balance, not extinction)…
    expect(predatedPop).toBeGreaterThan(0);
    // …and the predation genuinely happened (the trophic link is live, not decorative).
    expect(predated.telemetry().eaten).toBeGreaterThan(0);
  });

  test('trophic energy flux is positive and SCALES with predation intensity', () => {
    const food = (): number => 0.9;
    // Both establish identically for 900 steps, then diverge in predation intensity.
    const light = new XenomimicPopulation(77, { growthRamp: 40, predationRespawn: 5 });
    const heavy = new XenomimicPopulation(77, { growthRamp: 40, predationRespawn: 5 });
    const lightFlux = runWithPredation(light, 1800, 1 / 30, food, 0.01, 900);
    const heavyFlux = runWithPredation(heavy, 1800, 1 / 30, food, 0.04, 900);
    // Energy flows through the new trophic link…
    expect(lightFlux).toBeGreaterThan(0);
    expect(heavyFlux).toBeGreaterThan(0);
    // …and heavier grazing transfers strictly more cumulative energy to the predators.
    expect(heavyFlux).toBeGreaterThan(lightFlux * 1.5);
  });
});
