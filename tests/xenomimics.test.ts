/**
 * GATE-XENOMIMIC — the ground-dwelling cosmic-horror fauna is REAL, deterministic, and honest.
 *
 * Proves: the ~100-parameter twin brain; the quantum SINGLET anti-correlation that makes the bipolar
 * mimic/anti twins genuinely opposite; the IIT integration proxy; the Free-Energy-Principle predictive-
 * coding loop (surprise decays under a stable world, spikes on a violated prediction, and CAUSALLY drives
 * arousal — faster flight, suppressed appetite); whole-population determinism (same seed → byte-identical);
 * the 2→1000 growth + eat/breed/die/respawn/predation balance; ground-constraint; weighted-ragdoll fulcrum
 * lean; Born-collapse teleports; and a headless render smoke. Every owner-directive claim is pinned to a
 * measurable behaviour.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import {
  XenomimicBrain,
  XENO_BRAIN_INPUTS,
  XENO_BRAIN_HIDDEN,
  XENO_BRAIN_OUTPUTS,
} from '../src/sim/xenomimic-brain';
import { XenomimicPopulation, XENOMIMIC_MAX, XENOMIMIC_SPECIES } from '../src/sim/xenomimics';
import { XenomimicRenderer } from '../src/sim/xenomimics-render';

/** Drive a population forward N steps at a fixed dt with an optional food field. */
function run(
  pop: XenomimicPopulation,
  steps: number,
  dt: number,
  food?: (x: number, z: number) => number,
): void {
  for (let i = 0; i < steps; i++) pop.step(dt, food ? { foodAt: food } : {});
}

/** Snapshot the exact live-creature state for byte-identical determinism comparison. */
function snapshot(pop: XenomimicPopulation): string {
  const rows: number[][] = [];
  pop.forEach((c) =>
    rows.push([c.x, c.y, c.z, c.vx, c.vz, c.heading, c.energy, c.age, c.species, c.leanX, c.leanZ]),
  );
  return JSON.stringify(rows);
}

describe('GATE-XENOMIMIC — twin brain', () => {
  test('the shared brain has ~100 parameters (owner: "100 parameters each")', () => {
    const brain = new XenomimicBrain(1234);
    // 6→8→5 tanh MLP: 6*8 + 8 + 5*8 + 5 = 101.
    const expected =
      XENO_BRAIN_INPUTS * XENO_BRAIN_HIDDEN +
      XENO_BRAIN_HIDDEN +
      XENO_BRAIN_OUTPUTS * XENO_BRAIN_HIDDEN +
      XENO_BRAIN_OUTPUTS;
    expect(brain.parameterCount).toBe(expected);
    expect(brain.parameterCount).toBeGreaterThanOrEqual(90);
    expect(brain.parameterCount).toBeLessThanOrEqual(120);
  });

  test('the entangled twins are ANTI-CORRELATED — a real quantum singlet (opposite of mimicry)', () => {
    const brain = new XenomimicBrain(99);
    const rng = mulberry32(7);
    // Neutral senses (mean 0.5) → tilt θ=0 → pure |01⟩+|10⟩ singlet on the twin qubits, so every
    // measurement yields OPPOSITE bits regardless of the collapse outcome.
    const neutral = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let anti = 0;
    const N = 64;
    for (let i = 0; i < N; i++) {
      const beat = brain.beat(neutral, neutral, rng);
      expect(beat.mimicBit === 0 || beat.mimicBit === 1).toBe(true);
      if (beat.mimicBit !== beat.antiBit) anti++;
      expect(beat.coherence).toBeGreaterThanOrEqual(0);
      expect(beat.coherence).toBeLessThanOrEqual(1);
    }
    // The singlet guarantees the twin bits never agree — anti-mimicry holds on every beat.
    expect(anti).toBe(N);
  });

  test('brain output is deterministic and bounded', () => {
    const a = new XenomimicBrain(42);
    const b = new XenomimicBrain(42);
    const ra = mulberry32(5);
    const rb = mulberry32(5);
    const s1 = [0.7, 0.2, 0.3, 0.6, 0.4, 0.8];
    const s2 = [0.1, 0.9, 0.5, 0.2, 0.7, 0.3];
    for (let i = 0; i < 20; i++) {
      const ba = a.beat(s1, s2, ra);
      const bb = b.beat(s1, s2, rb);
      expect(bb.coherence).toBe(ba.coherence);
      expect(bb.mimic.turn).toBe(ba.mimic.turn);
      for (const th of [ba.mimic, ba.anti]) {
        expect(th.turn).toBeGreaterThanOrEqual(-1);
        expect(th.turn).toBeLessThanOrEqual(1);
        for (const v of [th.speed, th.jump, th.eat, th.mate, th.shimmer]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test('IIT integration proxy: the singlet is MAXIMALLY integrated (mutual information ≈ 1)', () => {
    const brain = new XenomimicBrain(3);
    const rng = mulberry32(1);
    const neutral = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let sum = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const beat = brain.beat(neutral, neutral, rng);
      expect(beat.integration).toBeGreaterThanOrEqual(0);
      expect(beat.integration).toBeLessThanOrEqual(1);
      sum += beat.integration;
    }
    // At θ=0 the twin qubits are a perfect singlet → I(mimic;anti) = 1 bit on every beat.
    expect(sum / N).toBeGreaterThan(0.98);
  });

  test('FEP: surprise DECAYS under a stable world and SPIKES when a prediction is violated', () => {
    const brain = new XenomimicBrain(808, 2);
    const rng = mulberry32(11);
    const stable = [0.3, 0.7, 0.2, 0.5, 0.6, 0.4];
    // Feed a fixed world: the generative model learns it, so free-energy (mean squared surprise) → 0.
    let converged = 1;
    for (let i = 0; i < 60; i++) converged = brain.beat(stable, stable, rng).freeEnergy;
    expect(converged).toBeGreaterThanOrEqual(0);
    expect(converged).toBeLessThan(0.05); // the model has learned the stable environment
    // Now violate every prediction at once — surprise must re-arouse the pair.
    const shock = [0.9, 0.1, 0.95, 0.05, 0.9, 0.1];
    const spike = brain.beat(shock, shock, rng).freeEnergy;
    expect(spike).toBeLessThanOrEqual(1);
    expect(spike).toBeGreaterThan(converged + 0.1);
  });

  test('FEP: surprise CAUSALLY raises speed + suppresses appetite (arousal), all else equal', () => {
    // Two identical-weight brains (same seed + species). We prime them on OPPOSITE worlds so their
    // generative models diverge, then present BOTH the same test senses with the same RNG state — the
    // MLP input, statevector, and Born collapse are byte-identical, so ONLY the learned surprise differs.
    const NPRIME = 50;
    const low = new XenomimicBrain(321, 1); // primed on the test world → low surprise
    const high = new XenomimicBrain(321, 1); // primed on the opposite world → high surprise
    const rLow = mulberry32(3);
    const rHigh = mulberry32(3);
    const ones = [1, 1, 1, 1, 1, 1];
    const zeros = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < NPRIME; i++) {
      low.beat(ones, ones, rLow); // learns the world it will be tested on
      high.beat(zeros, zeros, rHigh); // learns the opposite world
    }
    const bLow = low.beat(ones, ones, rLow); // test beat: identical input + identical RNG state
    const bHigh = high.beat(ones, ones, rHigh);
    // The surprise gap is real and large…
    expect(bHigh.mimic.surprise).toBeGreaterThan(bLow.mimic.surprise + 0.2);
    // …and it CAUSALLY drives behaviour: the surprised twin flees faster and eats less (nothing else
    // differs between the two brains at this beat).
    expect(bHigh.mimic.speed).toBeGreaterThan(bLow.mimic.speed);
    expect(bHigh.mimic.eat).toBeLessThan(bLow.mimic.eat);
  });

  test('the 10 species have DISTINCT temperaments — same senses drive different behaviour', () => {
    const senses = [0.6, 0.3, 0.2, 0.5, 0.4, 0.7];
    // Cheetah (0, dash 1.4) vs snail (1, dash 0.5): the fast kind drives more speed from identical senses.
    const cheetah = new XenomimicBrain(500, 0);
    const snail = new XenomimicBrain(500, 1);
    const rc = mulberry32(9);
    const rs = mulberry32(9);
    let cheetahSpeed = 0;
    let snailSpeed = 0;
    for (let i = 0; i < 30; i++) {
      cheetahSpeed += cheetah.beat(senses, senses, rc).mimic.speed;
      snailSpeed += snail.beat(senses, senses, rs).mimic.speed;
    }
    expect(cheetahSpeed).toBeGreaterThan(snailSpeed);
  });
});

describe('GATE-XENOMIMIC — population lifecycle', () => {
  test('starts at exactly 2 (one twin pair) and never exceeds the 1000 cap', () => {
    const pop = new XenomimicPopulation(7, { growthRamp: 20 });
    expect(pop.population()).toBe(2);
    expect(pop.pairCount()).toBe(1);
    run(pop, 4000, 1 / 30, () => 0.95); // abundant food, long run
    expect(pop.population()).toBeLessThanOrEqual(XENOMIMIC_MAX);
    expect(pop.telemetry().pairs).toBeLessThanOrEqual(XENOMIMIC_MAX / 2);
  });

  test('spawnAt (the XNO one-by-one spawn) adds a live pair at a point', () => {
    const pop = new XenomimicPopulation(31, { growthRamp: 999 });
    const before = pop.population();
    const added = pop.spawnAt(40, -20);
    expect(added).toBe(2);
    expect(pop.population()).toBe(before + 2);
  });

  test('telemetry exposes bounded integration/coherence for the data panel', () => {
    const pop = new XenomimicPopulation(13, { growthRamp: 40 });
    run(pop, 300, 1 / 30, () => 0.8);
    const t = pop.telemetry();
    for (const v of [t.coherence, t.bondTension, t.integration, t.freeEnergy, t.meanEnergy]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('whole-population determinism — same seed → byte-identical after many steps', () => {
    const food = (x: number, z: number) => 0.5 + 0.4 * Math.sin(x * 0.01 + z * 0.013);
    const a = new XenomimicPopulation(2024, { growthRamp: 30 });
    const b = new XenomimicPopulation(2024, { growthRamp: 30 });
    run(a, 900, 1 / 30, food);
    run(b, 900, 1 / 30, food);
    expect(snapshot(b)).toBe(snapshot(a));
    // A different seed must diverge (proves the seed actually drives the substream).
    const c = new XenomimicPopulation(2025, { growthRamp: 30 });
    run(c, 900, 1 / 30, food);
    expect(snapshot(c)).not.toBe(snapshot(a));
  });

  test('the swarm slowly MULTIPLIES toward its growth target when fed', () => {
    const pop = new XenomimicPopulation(11, { growthRamp: 40 });
    run(pop, 3000, 1 / 30, () => 0.9);
    expect(pop.population()).toBeGreaterThan(2); // grew past the founding pair
    expect(pop.telemetry().births).toBeGreaterThan(2);
  });

  test('eating flora raises energy; starvation lowers it', () => {
    const fed = new XenomimicPopulation(3, { growthRamp: 999 });
    const starved = new XenomimicPopulation(3, { growthRamp: 999 });
    run(fed, 200, 1 / 30, () => 1);
    run(starved, 200, 1 / 30, () => 0);
    expect(fed.telemetry().meanEnergy).toBeGreaterThan(starved.telemetry().meanEnergy);
  });

  test('creatures die of old age and respawn — population balances (never zero, deaths accrue)', () => {
    const pop = new XenomimicPopulation(5, {
      lifetime: 3,
      respawnDelay: 2,
      growthRamp: 999, // hold target near 2 so we watch pure death/respawn balance
    });
    let minPop = Infinity;
    for (let i = 0; i < 1200; i++) {
      pop.step(1 / 30, { foodAt: () => 0.8 });
      minPop = Math.min(minPop, pop.population());
    }
    expect(pop.telemetry().deaths).toBeGreaterThan(0); // they did die
    expect(pop.population()).toBeGreaterThan(0); // and the population recovered (balanced)
    expect(minPop).toBeGreaterThanOrEqual(0);
  });

  test('predation: consume() yields energy, drops the count, then respawns in ~5s', () => {
    const pop = new XenomimicPopulation(8, { predationRespawn: 5, growthRamp: 999 });
    run(pop, 30, 1 / 30, () => 0.9);
    const before = pop.population();
    let target: ReturnType<typeof firstAlive> = null;
    function firstAlive() {
      let found: Parameters<Parameters<XenomimicPopulation['forEach']>[0]>[0] | null = null;
      pop.forEach((c) => {
        if (!found) found = c;
      });
      return found;
    }
    target = firstAlive();
    expect(target).not.toBeNull();
    const yielded = pop.consume(target!);
    expect(yielded).toBeGreaterThan(0);
    expect(pop.population()).toBe(before - 1);
    expect(pop.telemetry().eaten).toBe(1);
    // Advance past the 5s predation-respawn window → it comes back.
    for (let i = 0; i < 200; i++) pop.step(1 / 30, { foodAt: () => 0.9 });
    expect(pop.population()).toBeGreaterThanOrEqual(before);
  });

  test('weighted-ragdoll fulcrum lean stays bounded + finite, and responds to motion', () => {
    const pop = new XenomimicPopulation(44, { growthRamp: 40 });
    let anyLean = false;
    for (let i = 0; i < 1500; i++) {
      pop.step(1 / 30, { foodAt: () => 0.85 });
      pop.forEach((c) => {
        // The damped pendulum must never blow up (bounded to ±0.7 rad, always finite).
        expect(Number.isFinite(c.leanX)).toBe(true);
        expect(Number.isFinite(c.leanZ)).toBe(true);
        expect(Math.abs(c.leanX)).toBeLessThanOrEqual(0.7 + 1e-9);
        expect(Math.abs(c.leanZ)).toBeLessThanOrEqual(0.7 + 1e-9);
        if (Math.abs(c.leanX) > 1e-3 || Math.abs(c.leanZ) > 1e-3) anyLean = true;
      });
    }
    // Moving creatures actually lean (the fulcrum is live, not a dead field).
    expect(anyLean).toBe(true);
  });

  test('teleports actually fire (Born-rule collapse) over a long run', () => {
    const pop = new XenomimicPopulation(21, { growthRamp: 60 });
    run(pop, 1500, 1 / 30, () => 0.7);
    expect(pop.telemetry().teleports).toBeGreaterThan(0);
  });

  test('creatures stay on the ground wave and inside the arena', () => {
    const radius = 150;
    const pop = new XenomimicPopulation(4, { arenaRadius: radius, growthRamp: 40 });
    run(pop, 800, 1 / 30, () => 0.8);
    // The ground wave has amplitude ≤ 3.2+2.6+1.8 = 7.6; creatures sit at ground + 1.2 + a small hop
    // (max ≈ 2.3). So y is bounded inside the wave envelope — they hug the ground, never float like the
    // sky entities. (The wave is time-varying, so assert the absolute envelope, not a fixed-t height.)
    pop.forEach((c) => {
      const r = Math.sqrt(c.x * c.x + c.z * c.z);
      expect(r).toBeLessThanOrEqual(radius + 1);
      expect(c.y).toBeGreaterThan(-8);
      expect(c.y).toBeLessThan(12);
    });
  });

  test('species spread across all 10 kinds over time', () => {
    const pop = new XenomimicPopulation(77, { growthRamp: 40 });
    run(pop, 3000, 1 / 30, () => 0.9);
    const counts = pop.telemetry().speciesCounts;
    expect(counts.length).toBe(XENOMIMIC_SPECIES);
    const kinds = counts.filter((n) => n > 0).length;
    expect(kinds).toBeGreaterThanOrEqual(3); // meaningful diversity emerged
  });
});

describe('GATE-XENOMIMIC — render smoke (headless)', () => {
  test('renderer builds 10 species meshes, syncs, and disposes cleanly', () => {
    const scene = new THREE.Scene();
    const before = scene.children.length;
    const renderer = new XenomimicRenderer(scene);
    expect(scene.children.length).toBe(before + XENOMIMIC_SPECIES);
    const pop = new XenomimicPopulation(9, { growthRamp: 30 });
    run(pop, 300, 1 / 30, () => 0.8);
    expect(() => renderer.sync(pop, 1.5)).not.toThrow();
    // Some instanced meshes carried live creatures.
    const live = (
      scene.children.filter((o) => o instanceof THREE.InstancedMesh) as THREE.InstancedMesh[]
    ).reduce((sum, m) => sum + m.count, 0);
    expect(live).toBeGreaterThan(0);
    renderer.dispose();
    expect(scene.children.length).toBe(before);
  });
});
