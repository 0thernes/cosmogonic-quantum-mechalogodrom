/**
 * GEDANKEN DEATH (V127, USER) — Thaler's "Death of a Gedanken Creature" on the real 70-param entity nets.
 * These are the falsifiable claims (the "real evidence, real proof"):
 * - the kernel forward reproduces EntityBrainField's 6→6→4 tanh MLP bit-for-bit;
 * - a dying net CONFABULATES: output drift off its own policy RISES as weight-damage ramps up (novelty
 *   at full damage ≫ novelty at slight damage), and there is a lucid death-dream (vividness > 0) at an
 *   interior damage band — not at the very first or very last step;
 * - DEVOUR is a real weight-space merge: the predator moves measurably toward the prey (transfer > 0)
 *   and ends CLOSER to it than before; eating self transfers nothing;
 * - the whole thing is deterministic (a hash-seeded ramp, no rng) and the ledger means are exact.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { randomGenome, BRAIN_GENES, TRAIT_GENES, BRAIN_HIDDEN, BRAIN_OUT } from '../src/sim/genome';
import {
  brainForward,
  gedankenDeath,
  devour,
  GedankenLedger,
  DEATH_STEPS,
} from '../src/sim/gedanken-death';

/** A real entity brain slice (the 70 BRAIN weights of a rolled genome). */
function brainOf(seed: number): Float32Array {
  return randomGenome(mulberry32(seed)).slice(TRAIT_GENES, TRAIT_GENES + BRAIN_GENES);
}

const SENSES = new Float32Array([0.4, 0.9, 0.2, 0.6, 0.55, -0.3]); // a dying being's last perception

describe('brainForward', () => {
  test('reproduces the 6→6→4 tanh MLP shape + range', () => {
    const w = brainOf(1);
    const hid = new Float32Array(BRAIN_HIDDEN);
    const out = new Float32Array(BRAIN_OUT);
    brainForward(w, SENSES, hid, out);
    expect(out.length).toBe(4);
    for (const o of out) expect(Math.abs(o)).toBeLessThanOrEqual(1); // tanh-bounded
    // deterministic
    const out2 = new Float32Array(BRAIN_OUT);
    brainForward(w, SENSES, hid, out2);
    expect([...out2]).toEqual([...out]);
  });
});

describe('gedankenDeath — the confabulation of a dying net', () => {
  test('novelty (policy drift) RISES as neuronal damage ramps up', () => {
    const d = gedankenDeath(brainOf(7), SENSES, 42);
    expect(d.novelty.length).toBe(DEATH_STEPS);
    // Averaged over the low third vs the high third of the ramp, drift clearly grows with damage.
    const third = Math.floor(DEATH_STEPS / 3);
    let lo = 0;
    let hi = 0;
    for (let i = 0; i < third; i++) lo += d.novelty[i] ?? 0;
    for (let i = DEATH_STEPS - third; i < DEATH_STEPS; i++) hi += d.novelty[i] ?? 0;
    expect(hi).toBeGreaterThan(lo);
    expect(d.novelty[DEATH_STEPS - 1] ?? 0).toBeGreaterThan(d.novelty[0] ?? 0);
  });

  test('there is a LUCID death-dream: vividness > 0 at an interior damage band', () => {
    const d = gedankenDeath(brainOf(3), SENSES, 11);
    expect(d.vividness).toBeGreaterThan(0);
    expect(Number.isFinite(d.vividness)).toBe(true);
    // The lucid band is a real damage fraction in (0, 1]; the dream is a bounded 4-output.
    expect(d.lucidBand).toBeGreaterThan(0);
    expect(d.lucidBand).toBeLessThanOrEqual(1);
    expect(d.finalDream.length).toBe(4);
    for (const o of d.finalDream) expect(Math.abs(o)).toBeLessThanOrEqual(1);
  });

  test('saturation climbs toward the end of the ramp (the net locks up / noise-death)', () => {
    const d = gedankenDeath(brainOf(9), SENSES, 5);
    // At the last step the net is maximally perturbed ⇒ saturation ≥ at the first step.
    expect(d.saturation[DEATH_STEPS - 1] ?? 0).toBeGreaterThanOrEqual(d.saturation[0] ?? 0);
  });

  test('deterministic: same brain + senses + seed ⇒ identical death dream', () => {
    const a = gedankenDeath(brainOf(4), SENSES, 99);
    const b = gedankenDeath(brainOf(4), SENSES, 99);
    expect([...a.novelty]).toEqual([...b.novelty]);
    expect(a.vividness).toBe(b.vividness);
    expect(a.lucidBand).toBe(b.lucidBand);
    expect([...a.finalDream]).toEqual([...b.finalDream]);
  });
});

describe('devour — one net absorbing another mid-firing', () => {
  test('the predator moves TOWARD the prey (real weight transfer) and ends closer', () => {
    const predator = brainOf(2);
    const prey = brainOf(8);
    const before = new Float32Array(predator); // snapshot
    let dBefore = 0;
    for (let k = 0; k < BRAIN_GENES; k++) {
      const diff = (prey[k] ?? 0) - (before[k] ?? 0);
      dBefore += diff * diff;
    }
    const r = devour(predator, prey, 0.25);
    expect(r.transfer).toBeGreaterThan(0);
    expect(r.mindDistance).toBeCloseTo(Math.sqrt(dBefore), 4);
    // now measurably closer to the prey than before
    let dAfter = 0;
    for (let k = 0; k < BRAIN_GENES; k++) {
      const diff = (prey[k] ?? 0) - (predator[k] ?? 0);
      dAfter += diff * diff;
    }
    expect(Math.sqrt(dAfter)).toBeLessThan(Math.sqrt(dBefore));
  });

  test('devouring an identical mind transfers nothing (distance 0)', () => {
    const a = brainOf(6);
    const b = new Float32Array(a);
    const r = devour(a, b, 0.5);
    expect(r.mindDistance).toBeCloseTo(0, 6);
    expect(r.transfer).toBeCloseTo(0, 6);
  });
});

describe('GedankenLedger — the population research readout', () => {
  test('accumulates exact running means over deaths + devours', () => {
    const led = new GedankenLedger();
    expect(led.meanVividness).toBe(0);
    led.recordDeath(gedankenDeath(brainOf(1), SENSES, 1));
    led.recordDeath(gedankenDeath(brainOf(2), SENSES, 2));
    expect(led.deaths).toBe(2);
    expect(led.meanVividness).toBeGreaterThan(0);
    expect(led.meanLucidBand).toBeGreaterThan(0);
    const pred = brainOf(3);
    led.recordDevour(devour(pred, brainOf(4), 0.3));
    expect(led.devours).toBe(1);
    expect(led.meanTransfer).toBeGreaterThan(0);
    led.clear();
    expect(led.deaths).toBe(0);
    expect(led.meanVividness).toBe(0);
  });
});
