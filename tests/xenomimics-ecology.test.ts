/**
 * GATE-XENO-TROPHIC — the Xenomimics are a REAL new ECOLOGICAL layer, not decoration.
 *
 * The substrate (GATE-XENOMIMIC) proves the creatures live/think/breed; the world coupling
 * (GATE-XENOMIMIC-COUPLING) proves real grazing, sampled-Entity brain input, and bounded nearest-body
 * predation are wired. This gate proves the
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
 * bounded `fraction` of the live swarm on a ~5 Hz cadence — an isolated population-level pressure used
 * to measure the trophic mechanism independently of World scheduling. Returns the
 * cumulative energy yielded to predators through the trophic link.
 */
function runWithPredation(
  pop: XenomimicPopulation,
  steps: number,
  dt: number,
  food: (x: number, z: number) => number,
  fraction: number,
  establish: number,
  safeZoneAt?: (x: number, z: number) => boolean,
): number {
  let predClock = 0;
  let yielded = 0;
  for (let i = 0; i < steps; i++) {
    pop.step(dt, safeZoneAt ? { foodAt: food, safeZoneAt } : { foodAt: food });
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
    // 60s: a CORRECTNESS gate, not a perf gate — under coverage instrumentation + machine contention
    // the 2×2400-step run measures ~16s, so the old 15s timeout was a chronic gate flake.
  }, 60_000);

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
    // 60s: correctness gate; see the regulation test above for the coverage-timeout rationale.
  }, 60_000);
});

/**
 * GATE-DOME-REFUGE — the Big Tree sanctuary is a real PREDATION REFUGE, not scenery.
 *
 * GATE-XENO-TROPHIC (above) proved the trophic link regulates the swarm. v0.23.0's dome ecology added
 * a sanctuary that SPATIALLY RESTRUCTURES that same link: inside it, predation on ground fauna yields
 * nothing. This is shipped, not hypothetical — `world.ts:783` passes `safeZoneAt:
 * bigTreeXenomimicProtectedAt` in the canonical xenomimicCouplings, `xenomimics.ts:486` binds it per
 * step, and `consume()` (`xenomimics.ts:789-795`) returns 0 for a protected target.
 *
 * A refuge is the textbook stabilising term in predator–prey theory (Rosenzweig–MacArthur with
 * refuge): it lifts the prey's predated equilibrium back toward — but not to — its unpredated carrying
 * capacity. So the falsifiable prediction is an ORDERING, which a decorative zone cannot produce:
 *
 *     unpredated K  >  predated WITH refuge  >  predated WITHOUT refuge  >  0
 *
 * The refuge-OFF arm is the ablation control: same seed, same food, same establish window, same
 * victim selection, same predation cadence — the ONLY difference is whether `safeZoneAt` is supplied.
 * If the sanctuary did no causal work the two predated arms would coincide.
 *
 * This is what grounds ecology 3.3 → 3.4 in `scripts/alife-codeground-sensitivity.ts`, at the same bar
 * GATE-XENO-TROPHIC set for 3.2 → 3.3: an emergent population-level dynamic measured against an
 * ablated control. Honest scope: a bounded classical refuge model, not real-world ecological fidelity.
 */
describe('GATE-DOME-REFUGE — the sanctuary restructures the trophic link', () => {
  // GEOMETRY FIDELITY MATTERS, and finding that out is half this gate's value. The shipped sanctuary
  // is a disc OFFSET from where the fauna spawn (Big Tree at (220,620), r=240; the swarm establishes
  // near the origin and disperses to x[-383,308] / z[-279,280]). An earlier draft of this gate centred
  // the disc on the founding pair instead — which zeroes their threat signal during the establish
  // window, suppresses the forage→breed path, and left the lineage stuck at 2 on seed 77 while other
  // seeds grew to cap. That is a test artifact, NOT the shipped configuration, and it is exactly the
  // shape of a seed-lucky result. Keep this disc offset from the spawn area.
  const refuge = (x: number, z: number): boolean => Math.hypot(x - 200, z) < 150;
  const food = (): number => 0.9;
  // MULTI-SEED BY CONSTRUCTION: a one-seed arm here would measure a seed, not an ecological law. The
  // ordering below was verified on 9/9 seeds that reach a standing stock (a few founding lineages —
  // e.g. 6060, 99 — never establish at all, refuge or not; those are degenerate runs, not refuge
  // failures, and the K>2 assertion excludes them).
  const SEEDS = [4242, 1234, 2026];

  test('refugia signature: unpredated > predated-WITH-refuge > predated-WITHOUT-refuge (ablation)', () => {
    for (const seed of SEEDS) {
      // Arm 1 — unpredated control: the logistic carrying capacity K.
      const unpredated = new XenomimicPopulation(seed, { growthRamp: 40 });
      runWithPredation(unpredated, 2400, 1 / 30, food, 0, 99999);
      const K = unpredated.population();

      // Arm 2 — predation WITH the sanctuary: sheltered fauna survive, lifting the equilibrium.
      const sheltered = new XenomimicPopulation(seed, { growthRamp: 40, predationRespawn: 5 });
      const shelteredFlux = runWithPredation(sheltered, 2400, 1 / 30, food, 0.03, 1200, refuge);
      const shelteredPop = sheltered.population();

      // Arm 3 — ABLATION: identical seed, food, establish window, victim selection and cadence. The
      // ONLY difference is that `safeZoneAt` is withheld. If the sanctuary did no causal work these
      // two arms would coincide.
      const exposed = new XenomimicPopulation(seed, { growthRamp: 40, predationRespawn: 5 });
      const exposedFlux = runWithPredation(exposed, 2400, 1 / 30, food, 0.03, 1200);
      const exposedPop = exposed.population();

      // The control must be a real standing stock, and predation must bite in BOTH predated arms.
      expect(K, `seed ${seed}: no standing stock`).toBeGreaterThan(2);
      expect(sheltered.telemetry().eaten).toBeGreaterThan(0);
      expect(exposed.telemetry().eaten).toBeGreaterThan(0);

      // The ordering. Ablating the refuge must LOWER the equilibrium — that is the causal claim.
      expect(exposedPop, `seed ${seed}`).toBeLessThan(K * 0.9); // predation still regulates
      expect(shelteredPop, `seed ${seed}: refuge did no work`).toBeGreaterThan(exposedPop);
      expect(shelteredPop, `seed ${seed}`).toBeLessThanOrEqual(K); // never beats the unpredated cap
      expect(exposedPop, `seed ${seed}`).toBeGreaterThan(0); // regulated, not exterminated

      // Fewer reachable prey ⇒ strictly less energy through the trophic link. The refuge constrains
      // the SAME link GATE-XENO-TROPHIC gates; it is not a separate cosmetic system.
      expect(shelteredFlux, `seed ${seed}`).toBeLessThan(exposedFlux);
    }
  }, 180_000);

  test('the refuge is a SPATIAL law: sheltered fauna are unkillable, exposed fauna are not', () => {
    // 2400 steps on a seed that reaches cap, so the swarm straddles the disc boundary and BOTH sides
    // of the law are exercised — otherwise the protected assertion is vacuously true.
    const pop = new XenomimicPopulation(4242, { growthRamp: 40, predationRespawn: 5 });
    runWithPredation(pop, 2400, 1 / 30, food, 0, 99999, refuge);
    let inside = 0;
    let outside = 0;
    const victims: Parameters<Parameters<XenomimicPopulation['forEach']>[0]>[0][] = [];
    pop.forEach((c) => victims.push(c));
    for (const c of victims) {
      const wasInside = refuge(c.x, c.z);
      const yielded = pop.consume(c);
      if (wasInside) {
        expect(yielded).toBe(0); // protected: the sanctuary refuses the kill outright
        inside++;
      } else if (yielded > 0) outside++;
    }
    // Both sides must be exercised, or the assertion above proves nothing.
    expect(inside, 'no fauna inside the refuge — assertion would be vacuous').toBeGreaterThan(0);
    expect(outside, 'no fauna killed outside the refuge — no contrast').toBeGreaterThan(0);
  }, 90_000);
});
