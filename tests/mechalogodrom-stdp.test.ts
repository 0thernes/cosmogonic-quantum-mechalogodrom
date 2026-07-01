/**
 * MECHALOGODROM-BRAIN — STDP plasticity (closes the self-documented "STDP not yet wired" gap, FUSE-8).
 *
 * Pins the exact Bi–Poo spike-timing window (LTP for pre→post, LTD for post→pre, net-LTD bias, decay),
 * and proves the wired brain actually LEARNS: under a driving stream its variant→fusion gains diverge
 * from unity (plasticity > 0), stay bounded, and remain deterministic. Pure — seeded, no clock/DOM.
 */
import { describe, expect, test } from 'bun:test';
import { MechalogodromBrain, stdpWeightDelta } from '../src/sim/mechalogodrom-brain';

type Percept = Parameters<MechalogodromBrain['tick']>[0];
function drive(i: number): Percept {
  // A structured, ignition-heavy stream so the cortex fires (post) and variants fire (pre) → STDP engages.
  return {
    fusion: 0.6 + 0.35 * Math.sin(i * 0.5),
    dimension: 30 + (i % 40),
    power: 6000 + i * 13,
    chaos: 0.5 + 0.3 * Math.sin(i),
    warp: 0.2 + 0.2 * Math.cos(i * 0.7),
    apexVitality: 0.6,
    apexTranscendence: 0.5,
    apexAgony: 0.1,
  };
}

describe('STDP kernel (Bi–Poo window)', () => {
  test('pre→post potentiates, post→pre depresses, simultaneous is neutral', () => {
    expect(stdpWeightDelta(1)).toBeGreaterThan(0); // Δt>0 (pre before post) → LTP
    expect(stdpWeightDelta(5)).toBeGreaterThan(0);
    expect(stdpWeightDelta(-1)).toBeLessThan(0); // Δt<0 (post before pre) → LTD
    expect(stdpWeightDelta(-5)).toBeLessThan(0);
    expect(stdpWeightDelta(0)).toBe(0); // no causal order
  });
  test('magnitude decays with |Δt| and vanishes far out', () => {
    expect(stdpWeightDelta(1)).toBeGreaterThan(stdpWeightDelta(10));
    expect(stdpWeightDelta(-1)).toBeLessThan(stdpWeightDelta(-10)); // both negative; nearer is more negative
    expect(Math.abs(stdpWeightDelta(100))).toBeLessThan(1e-3);
  });
  test('net-LTD bias: symmetric depression slightly exceeds potentiation (stability)', () => {
    expect(Math.abs(stdpWeightDelta(-3))).toBeGreaterThan(Math.abs(stdpWeightDelta(3)));
  });
});

describe('MechalogodromBrain — STDP is wired and the brain learns', () => {
  test('driving the brain makes the variant→fusion gains diverge from unity (plasticity > 0)', () => {
    const b = new MechalogodromBrain(1234);
    let last = b.tick(drive(0));
    expect(last.plasticity).toBe(0); // unlearned at the first beat
    for (let i = 1; i < 120; i++) last = b.tick(drive(i));
    expect(last.plasticity).toBeGreaterThan(0); // real learning occurred
    expect(last.plasticity).toBeGreaterThanOrEqual(0);
    expect(last.plasticity).toBeLessThanOrEqual(1); // bounded (gains clamped)
    const fuse8 = last.indicators.find((ind) => ind.id === 'FUSE-8')!;
    expect(fuse8.mechanism).toContain('STDP wired');
    expect(fuse8.status === 'met' || fuse8.status === 'partial').toBe(true);
  });

  test('deterministic: same seed + same drive ⇒ identical plasticity and snapshot', () => {
    const a = new MechalogodromBrain(77);
    const b = new MechalogodromBrain(77);
    let sa = a.tick(drive(0));
    let sb = b.tick(drive(0));
    for (let i = 1; i < 80; i++) {
      sa = a.tick(drive(i));
      sb = b.tick(drive(i));
    }
    expect(sa.plasticity).toBe(sb.plasticity);
    expect(sa.activity).toBe(sb.activity);
    expect(sa.consciousnessProxy).toBe(sb.consciousnessProxy);
    expect(sa.dominantVariant).toBe(sb.dominantVariant);
  });
});
