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
import { mulberry32 } from '../src/math/rng';
import { CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z } from '../src/sim/constants';
import { BIG_TREE_ZONE_ENTRY_RADIUS } from '../src/sim/big-tree-zone';

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
 * ISOLATE THE REFUGE FROM THE CALM. `safeZoneAt` is read on TWO independent paths: `consume()`
 * (xenomimics.ts:793 — a protected target cannot be killed) and the per-beat sense construction in
 * `step()` (xenomimics.ts:507/515 — a sheltered twin's threat percept is zeroed). Withholding the
 * coupling ablates BOTH at once, so it cannot tell a refuge from a behavioural change: the control
 * would differ in perception, foraging and breeding as well as in killability. The control arm here
 * therefore STILL supplies `safeZoneAt` — perception stays bit-identical — and severs only the refuge
 * via `setRefugeImmunityAblated(true)`. Measured: the immunity-ablated arm lands on the no-sanctuary
 * arm EXACTLY (604 = 604 across the probe seeds), so the perception channel is worth ZERO at
 * population level and the whole +46..+54 lift is the refuge. That equality is asserted, not assumed.
 *
 * THE PREDATOR MUST FORAGE, NOT PERSEVERATE. An earlier draft of this gate picked victims as the
 * first floor(alive*f) creatures in fixed `forEach` order. Protected creatures never die, so they
 * permanently occupied the head of that order and absorbed the whole predation budget forever: on
 * seed 4242 the refuge arm blocked 80% of attempts while only 28% of the swarm was inside the disc —
 * a 3x targeting bias. That harness inflated the lift to +277 and measured a predator wasting every
 * attack on the same unkillable individuals, NOT a spatial restructuring of the trophic link. Real
 * refuge theory assumes predators forage over the ACCESSIBLE prey, so victims are now drawn as an
 * unbiased seeded sample (Fisher-Yates prefix on `mulberry32`). Under that predator the block rate
 * collapses to ~= the disc's spatial occupancy (21-28% vs 21-28%) and the honest lift is +46 (~7.6%),
 * not +277. The `blocked ~= occupancy` assertion below is the standing guard against that artifact
 * class: it is what the original gate lacked, and it fails loudly on the biased harness.
 *
 * THE DISC IS THE SHIPPED ONE. The earlier draft substituted a test disc at (200,0,r150), justified
 * by the claim that the swarm only reaches x[-383,308]/z[-279,280] and so never meets the Big Tree.
 * That claim is FALSE: the measured seed-4242 unpredated envelope is x[-723,478]/z[-662,630], which
 * overlaps CRYSTAL_TREE_ORIGIN (220,620) r=240 directly. The substitution was never necessary — the
 * shipped disc produces the same refugia ordering — so this gate now asserts about the actual Big
 * Tree geometry rather than a stand-in. Gating a stand-in green-lights a no-op.
 *
 * This is what grounds ecology 3.3 → 3.4 in `scripts/alife-codeground-sensitivity.ts`, at the same bar
 * GATE-XENO-TROPHIC set for 3.2 → 3.3: an emergent population-level dynamic measured against an
 * ablated control. Honest scope: a bounded classical refuge model, not real-world ecological fidelity.
 */
/**
 * As {@link runWithPredation}, but the predator FORAGES: victims are an unbiased seeded sample of the
 * live swarm rather than the head of the iteration order. Returns population plus the telemetry the
 * anti-artifact guard needs (`blocked` attempts vs the disc's mean spatial `occupancy`).
 */
function runWithForagingPredation(
  seed: number,
  steps: number,
  dt: number,
  fraction: number,
  establish: number,
  safeZoneAt?: (x: number, z: number) => boolean,
  ablateImmunity = false,
): { pop: number; flux: number; attempts: number; blocked: number; occupancy: number } {
  const pop = new XenomimicPopulation(seed, { growthRamp: 40, predationRespawn: 5 });
  pop.setRefugeImmunityAblated(ablateImmunity);
  const food = (): number => 0.9;
  const pick = mulberry32((seed ^ 0x13579bdf) >>> 0 || 1);
  let predClock = 0;
  let flux = 0;
  let attempts = 0;
  let blocked = 0;
  let occSum = 0;
  let occN = 0;
  for (let i = 0; i < steps; i++) {
    pop.step(dt, safeZoneAt ? { foodAt: food, safeZoneAt } : { foodAt: food });
    if (i < establish) continue;
    predClock += dt;
    if (fraction <= 0 || predClock < 0.2) continue;
    predClock = 0;
    const live: Parameters<Parameters<XenomimicPopulation['forEach']>[0]>[0][] = [];
    pop.forEach((c) => live.push(c));
    if (live.length === 0) continue;
    if (safeZoneAt) {
      let inside = 0;
      for (const c of live) if (safeZoneAt(c.x, c.z)) inside++;
      occSum += inside / live.length;
      occN++;
    }
    const take = Math.floor(live.length * fraction);
    if (take <= 0) continue;
    // Fisher-Yates prefix: an unbiased seeded sample, so the predator cannot perseverate on the
    // unkillable head of the list.
    const idx = live.map((_, k) => k);
    for (let k = 0; k < take && k < idx.length; k++) {
      const j = k + Math.floor(pick() * (idx.length - k));
      const t = idx[k]!;
      idx[k] = idx[j]!;
      idx[j] = t;
    }
    for (let k = 0; k < take && k < idx.length; k++) {
      attempts++;
      const victim = live[idx[k]!];
      if (!victim) continue;
      const yielded = pop.consume(victim);
      flux += yielded;
      if (yielded === 0) blocked++;
    }
  }
  return {
    pop: pop.population(),
    flux,
    attempts,
    blocked,
    occupancy: occN > 0 ? occSum / occN : 0,
  };
}

describe('GATE-DOME-REFUGE — the sanctuary restructures the trophic link', () => {
  // THE SHIPPED sanctuary geometry, imported from the constants the composition root uses — not a
  // stand-in. `isBigTreeMemberProtected` adds a per-member hysteresis registry on top of this disc;
  // the spatial predicate is its floor (`isBigTreeProtected`), which is what `consume()` consults.
  const refuge = (x: number, z: number): boolean =>
    Math.hypot(x - CRYSTAL_TREE_ORIGIN_X, z - CRYSTAL_TREE_ORIGIN_Z) < BIG_TREE_ZONE_ENTRY_RADIUS;
  const food = (): number => 0.9;
  // MULTI-SEED BY CONSTRUCTION: a one-seed arm here would measure a seed, not an ecological law. The
  // ordering holds on 10/10 seeds that reach a standing stock; a few founding lineages (e.g. 6060,
  // 99) never establish at all, refuge or not — degenerate runs, not refuge failures, which the
  // K>2 assertion excludes.
  const SEEDS = [4242, 1234, 2026];

  test('refugia signature: unpredated > predated-WITH-refuge > predated-WITHOUT-refuge (ablation)', () => {
    for (const seed of SEEDS) {
      // Arm 1 — unpredated control: the logistic carrying capacity K.
      const unpredated = new XenomimicPopulation(seed, { growthRamp: 40 });
      runWithPredation(unpredated, 2400, 1 / 30, food, 0, 99999);
      const K = unpredated.population();

      // Arm 2 — predation WITH the shipped sanctuary: sheltered fauna survive, lifting the equilibrium.
      const sheltered = runWithForagingPredation(seed, 2400, 1 / 30, 0.03, 1200, refuge);

      // Arm 3 — THE CONTROL: `safeZoneAt` is still supplied, so the sheltered twins' threat percept is
      // zeroed EXACTLY as in arm 2 and perception/foraging/breeding/cadence/RNG are bit-identical.
      // Only setRefugeImmunityAblated(true) severs the refuge itself. Withholding the coupling instead
      // would ablate perception AND immunity together and could not isolate the refuge.
      const immunityAblated = runWithForagingPredation(
        seed,
        2400,
        1 / 30,
        0.03,
        1200,
        refuge,
        true,
      );

      // Arm 4 — no sanctuary at all. Measured only to show arm 3 lands exactly on it, i.e. the
      // perception channel moves the equilibrium by ZERO and the whole lift is the refuge.
      const exposed = runWithForagingPredation(seed, 2400, 1 / 30, 0.03, 1200);

      // The control must be a real standing stock, and predation must bite in every predated arm.
      expect(K, `seed ${seed}: no standing stock`).toBeGreaterThan(2);
      expect(sheltered.flux, `seed ${seed}`).toBeGreaterThan(0);
      expect(immunityAblated.flux, `seed ${seed}`).toBeGreaterThan(0);

      // The ordering. Ablating the refuge must LOWER the equilibrium — that is the causal claim.
      expect(immunityAblated.pop, `seed ${seed}`).toBeLessThan(K * 0.9); // predation still regulates
      // Margin, not a hair: the honest foraging-predator lift measures +46..+54 on these seeds.
      expect(sheltered.pop, `seed ${seed}: refuge did no work`).toBeGreaterThan(
        immunityAblated.pop + 25,
      );
      expect(sheltered.pop, `seed ${seed}`).toBeLessThanOrEqual(K); // never beats the unpredated cap
      expect(immunityAblated.pop, `seed ${seed}`).toBeGreaterThan(0); // regulated, not exterminated

      // THE LIFT IS THE REFUGE, NOT THE CALM: zeroing a sheltered twin's threat percept is worth
      // nothing at population level — arm 3 lands on arm 4 exactly.
      expect(immunityAblated.pop, `seed ${seed}: perception channel moved the equilibrium`).toBe(
        exposed.pop,
      );

      // Fewer reachable prey ⇒ strictly less energy through the trophic link. The refuge constrains
      // the SAME link GATE-XENO-TROPHIC gates; it is not a separate cosmetic system.
      expect(sheltered.flux, `seed ${seed}`).toBeLessThan(immunityAblated.flux);
    }
  }, 180_000);

  test('ANTI-ARTIFACT: blocked attempts track the disc occupancy, so the lift is spatial not targeting', () => {
    // The refuge effect is only real if the predator's blocked-attempt rate reflects how much of the
    // swarm is actually inside the disc. A biased predator that perseverates on unkillable prey shows
    // blocked >> occupancy and manufactures the ordering without any ecology. That is exactly the bug
    // the first draft of this gate shipped (80% blocked at 28% occupancy). Guard it permanently.
    for (const seed of SEEDS) {
      const r = runWithForagingPredation(seed, 2400, 1 / 30, 0.03, 1200, refuge);
      expect(r.attempts, `seed ${seed}`).toBeGreaterThan(0);
      expect(r.occupancy, `seed ${seed}: nothing ever entered the disc`).toBeGreaterThan(0.01);
      const blockedRate = r.blocked / r.attempts;
      // Unbiased foraging ⇒ blocked ≈ occupancy. The biased harness measured ~3x; 1.5x fails it.
      expect(blockedRate, `seed ${seed}: predator perseverates on unkillable prey`).toBeLessThan(
        r.occupancy * 1.5,
      );
    }
  }, 120_000);

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
