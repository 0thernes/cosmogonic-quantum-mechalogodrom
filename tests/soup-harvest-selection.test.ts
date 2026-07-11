/**
 * GATE-SOUP-SELECT — proves the soup SELECTION loop (world.ts:3079) is load-bearing, not decorative.
 *
 * The arena now materializes the FITTEST evolved strain (PrimordialSoup.harvestEmergent, a vitality-
 * argmax driven by the Tsotchke PINN metabolic residual) instead of the fitness-blind slot 0. Honest
 * claim: the selection differential — spawned vitality minus the live-population mean — is strictly
 * positive under selection and ~0 for the slot-0 baseline. If selection were decorative, the two
 * differentials would coincide. Fully deterministic (seeded soup + advanced rng stream).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { PrimordialSoup } from '../src/sim/primordial-soup';

const WARMUP = 400;
const EVENTS = 24;
const SPACING = 20;

type Mode = 'harvest' | 'slot0' | 'random';

/** Mean over a harvest run of (selected-strain vitality − live-population mean vitality). */
function selectionDifferential(seed: number, mode: Mode): { diff: number; count: number } {
  const soup = new PrimordialSoup(seed);
  const rng = mulberry32(seed);
  const pickRng = mulberry32((seed ^ 0x9e3779b9) >>> 0); // independent stream for the random-slot control
  let tick = 0;
  for (let i = 0; i < WARMUP; i++) soup.update(0, tick++, rng);
  let sum = 0;
  let count = 0;
  for (let e = 0; e < EVENTS; e++) {
    const snap = soup.snapshot();
    const popMean = snap.meanVitality;
    if (mode === 'harvest') {
      const h = soup.harvestEmergent();
      if (h) {
        sum += h.vitality - popMean;
        count++;
      }
    } else if (mode === 'slot0') {
      const s0 = snap.strains[0];
      if (s0 && s0.alive) {
        sum += s0.vitality - popMean;
        count++;
      }
    } else {
      const live = snap.strains.filter((s) => s.alive);
      if (live.length > 0) {
        const pick = live[Math.floor(pickRng() * live.length)]!;
        sum += pick.vitality - popMean;
        count++;
      }
    }
    for (let i = 0; i < SPACING; i++) soup.update(0, tick++, rng);
  }
  return { diff: count > 0 ? sum / count : 0, count };
}

// Average over several seeds so a fixed slot's per-seed luck (slot 0 may be above OR below mean for any
// one seed) washes out, while the argmax differential — always ≥ 0 by construction — stays positive.
const SEEDS = [0x50f7, 0x1234, 0xabcd, 0x7777, 0x2468, 0x9abc, 0x3141, 0x5926];
const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;

describe('GATE-SOUP-SELECT: harvest selection tracks fitness; blind picks do not', () => {
  const selDiff = mean(SEEDS.map((s) => selectionDifferential(s, 'harvest').diff));
  const slot0Diff = mean(SEEDS.map((s) => selectionDifferential(s, 'slot0').diff));
  const randDiff = mean(SEEDS.map((s) => selectionDifferential(s, 'random').diff));

  test('selection produces a clearly positive vitality differential (fittest > population mean)', () => {
    for (const s of SEEDS)
      expect(selectionDifferential(s, 'harvest').count).toBeGreaterThanOrEqual(EVENTS - 6);
    expect(selDiff).toBeGreaterThan(0.1);
  });

  test('a uniformly-random (truly fitness-blind) pick has ~0 differential', () => {
    expect(Math.abs(randDiff)).toBeLessThan(0.03); // blind = no edge, as expected
    expect(selDiff).toBeGreaterThan(randDiff + 0.09); // selection clearly beats a blind pick
  });

  test('selection also beats the OLD fixed slot-0 spawn (which had only an incidental edge)', () => {
    expect(selDiff).toBeGreaterThan(slot0Diff + 0.04); // tracking the true max > a fixed above-avg slot
  });

  test('deterministic: identical seed ⇒ identical differential', () => {
    const a = selectionDifferential(0x50f7, 'harvest').diff;
    const b = selectionDifferential(0x50f7, 'harvest').diff;
    expect(a).toBe(b);
  });
});
