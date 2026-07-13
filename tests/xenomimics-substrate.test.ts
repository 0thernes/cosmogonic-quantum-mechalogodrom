/**
 * GATE-XENO-SCHRODINGER — the Xenomimic brain gains a genuinely NEW, SECOND, independent live consumer of
 * the raw Crank–Nicolson wavefunction substrate ({@link ../src/math/schrodinger}) — a substrate CLASS
 * distinct from the brain's discrete 3-qubit register and its MSE free-energy loop, and wired independently
 * of the apex mind's latent-substrate probe ({@link ../src/sim/latent-substrates}). This is the honest lever
 * behind substrate pluralism moving 4.5 → 4.6 in `scripts/alife-codeground-sensitivity.ts`: the codeground
 * note previously called schrodinger "isolated", but it is already consumed by the SuperMind probe AND now
 * by this second, ablation-gated consumer feeding a wholly separate population.
 *
 * The gate proves two things, the same shape as GATE-XENO-TROPHIC (real dynamics + ablation control):
 *
 *   1. The Schrödinger positional spread is REAL environment-responsive unitary dynamics — bounded [0,1],
 *      deterministic (same senses → same spread, bit for bit), and NOT a constant: the sense-shaped
 *      potential + drift momentum genuinely move the evolved wavefunction's √variance. Food (an attractive
 *      well) strongly LOCALISES it; threat (a repulsive barrier) CONFINES the drifting packet; crowding
 *      (drift momentum) DISPERSES it. The directions are the measured, emergent output of the CN evolution.
 *   2. The substrate is OPERATIONALLY wired into the decision: ablating it (the control arm) measurably
 *      changes the swarm's steering versus the wired arm, on an otherwise byte-identical run (same seed,
 *      same senses, same RNG stream — only the one turn term differs), and the observable `quantumSpread`
 *      goes live when wired, exactly 0 when ablated.
 *
 * HONESTY: a classical numerical Schrödinger solve — deterministic, bounded, no QPU, not sentience. The
 * pluralism claim is "a second, independent live consumer of a real math substrate", not a physics claim.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { XenomimicBrain, schrodingerSpread } from '../src/sim/xenomimic-brain';
import { XenomimicPopulation } from '../src/sim/xenomimics';

// senses = [food, crowding, threat, chaos, twinDist, energy]; schrodingerSpread reads [food, crowding, threat].
const S = (food: number, crowding: number, threat: number): number[] => [
  food,
  crowding,
  threat,
  0.5,
  0.5,
  0.5,
];

describe('GATE-XENO-SCHRODINGER — a second, independent quantum substrate', () => {
  test('the wavepacket spread is REAL environment-responsive dynamics — bounded, deterministic, not constant', () => {
    const envs = [S(0.5, 0.5, 0.5), S(1, 0.2, 0), S(0, 0.2, 0), S(0.5, 0.2, 0.9), S(0.5, 1, 0.5)];
    const vals: number[] = [];
    for (const e of envs) {
      const v = schrodingerSpread(e);
      // Bounded to [0,1]…
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      // …and deterministic — a pure fixed-order CN solve, same senses → same spread bit for bit.
      expect(schrodingerSpread(e)).toBe(v);
      vals.push(v);
    }
    // Not a decorative constant: the environment genuinely moves the evolved wavefunction (measured ≈0.215).
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.1);
  });

  test('the sense-shaped potential drives the spread the way the physics says (food/threat/crowding)', () => {
    // FOOD digs an attractive well → localises the packet → strongly LOWERS the spread (the dominant driver).
    const foodLo = schrodingerSpread(S(0, 0.2, 0)); // no well → disperses
    const foodHi = schrodingerSpread(S(1, 0.2, 0)); // deep well → localises
    expect(foodLo).toBeGreaterThan(foodHi + 0.1); // measured Δ ≈ 0.215

    // THREAT raises a repulsive barrier that reflects/confines the drifting packet → a modestly LOWER spread.
    const threatLo = schrodingerSpread(S(0.5, 0.2, 0));
    const threatHi = schrodingerSpread(S(0.5, 0.2, 0.9));
    expect(threatHi).toBeLessThan(threatLo - 0.01); // measured Δ ≈ -0.037

    // CROWDING gives the packet drift momentum that presses it outward → a modestly HIGHER spread.
    const crowdLo = schrodingerSpread(S(0.5, 0, 0.5));
    const crowdHi = schrodingerSpread(S(0.5, 1, 0.5));
    expect(crowdHi).toBeGreaterThan(crowdLo + 0.005); // measured Δ ≈ 0.025
  });

  test('the substrate is OPERATIONALLY wired into steering — ablation changes behaviour (control arm)', () => {
    // Sum the swarm's absolute steering over a varied sense sequence, wired vs ablated. Both arms share the
    // same seed, senses and RNG stream, so ONLY the Schrödinger turn term can differ between them.
    function runBrain(ablated: boolean): {
      turnSum: number;
      maxSpread: number;
      anySpread: boolean;
    } {
      const brain = new XenomimicBrain(4242, 3);
      if (ablated) brain.setSchrodingerAblated(true);
      const rng = mulberry32(9);
      let turnSum = 0;
      let maxSpread = 0;
      let anySpread = false;
      for (let i = 0; i < 200; i++) {
        const sM = [(i % 7) / 7, (i % 5) / 5, (i % 3) / 3, 0.4, 0.5, (i % 11) / 11];
        const sA = [(i % 4) / 4, (i % 6) / 6, (i % 9) / 9, 0.6, 0.5, (i % 8) / 8];
        const b = brain.beat(sM, sA, rng);
        turnSum += Math.abs(b.mimic.turn) + Math.abs(b.anti.turn);
        maxSpread = Math.max(maxSpread, b.mimic.quantumSpread, b.anti.quantumSpread);
        if (b.mimic.quantumSpread > 0 || b.anti.quantumSpread > 0) anySpread = true;
      }
      return { turnSum, maxSpread, anySpread };
    }

    const wired = runBrain(false);
    const ablated = runBrain(true);

    // The substrate genuinely changes the decision — the wired swarm steers measurably more (measured +8.5%).
    expect(wired.turnSum).toBeGreaterThan(ablated.turnSum * 1.03);
    // …yet the brain still decides without it: the ablation baseline is a clean control, not a dead output.
    expect(ablated.turnSum).toBeGreaterThan(0);
    // The observable tracks the gate: wired beats surface a live spread; ablated beats surface exactly 0.
    expect(wired.anySpread).toBe(true);
    expect(wired.maxSpread).toBeGreaterThan(0);
    expect(ablated.anySpread).toBe(false);
    expect(ablated.maxSpread).toBe(0);
    // Both arms are deterministic — the whole coupled beat is pure given its seed.
    expect(runBrain(false).turnSum).toBe(wired.turnSum);
    expect(runBrain(true).turnSum).toBe(ablated.turnSum);
  });

  test('the substrate is OBSERVABLE — the population telemetry surfaces a live, bounded mean quantumSpread', () => {
    const food = (): number => 0.85;
    const pop = new XenomimicPopulation(4242, { growthRamp: 40 });
    for (let i = 0; i < 300; i++) pop.step(1 / 30, { foodAt: food });
    const t = pop.telemetry();
    // The population-level mean Schrödinger spread is aggregated into telemetry, bounded, and live (>0 wired).
    expect(t.quantumSpread).toBeGreaterThan(0);
    expect(t.quantumSpread).toBeLessThanOrEqual(1);
  });
});
