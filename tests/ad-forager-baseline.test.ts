/**
 * GATE-FORAGE — the flagship "smarter, not decorative" proof for the Cognition/Learning axis.
 *
 * Claim under test: a base agent that senses a food field by EXACT reverse-mode AD (Eshkol Wengert
 * tape) and climbs the gradient provably reaches food faster than an unbiased seeded random walk —
 * measured over many seeds, significance by paired permutation, and ABLATION-VERIFIED load-bearing
 * (zero the sensed gradient → the forager becomes byte-identical to the random walk). This is the
 * honest, falsifiable instrument that licenses moving the code-grounded Cognition/Learning floor.
 *
 * Falsifiability: if the gradient were decorative, the ablation arm would match the AD arm and the
 * paired-permutation p would be ≈1 — both assertions below would FAIL. Fully deterministic (seeded).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { runForager, type FoodSource, type ForagerConfig } from '../src/sim/ad-forager';
import { pairedPermutationP } from '../scripts/p1-quantum-classical-experiment';

const CFG: ForagerConfig = {
  sigma: 2500, // spread wide enough that ∇f is sensed even from the far ring (never the flat fallback)
  step: 1.5,
  reachRadius: 2.5,
  maxSteps: 600,
  bound: 60,
};

/**
 * Build one trial's field + far-ring start deterministically from a seed. A SINGLE Gaussian food
 * source (chemotaxis toward one nutrient, E. coli-style) — its unambiguous peak IS the source centre,
 * so gradient ascent converges to the food rather than to the centroid of a blurred multi-source hump.
 */
function trial(seed: number): { sources: FoodSource[]; sx: number; sz: number } {
  const r = mulberry32((seed * 2654435761 + 1) >>> 0);
  const sources: FoodSource[] = [{ x: (r() - 0.5) * 30, z: (r() - 0.5) * 30, amp: 1 }];
  const angle = r() * Math.PI * 2;
  const radius = 40 + r() * 8; // 40–48 units out — a random walk usually can't diffuse this far in maxSteps
  return { sources, sx: Math.cos(angle) * radius, sz: Math.sin(angle) * radius };
}

const N = 50;

describe('GATE-FORAGE: AD-gradient forager provably beats a random walk', () => {
  const adSteps: number[] = [];
  const rndSteps: number[] = [];
  const ablSteps: number[] = [];
  let adReached = 0;
  let rndReached = 0;
  for (let seed = 0; seed < N; seed++) {
    const { sources, sx, sz } = trial(seed);
    const ad = runForager(sources, sx, sz, CFG, mulberry32(seed + 1), 'gradient');
    const rnd = runForager(sources, sx, sz, CFG, mulberry32(seed + 1), 'random');
    const abl = runForager(sources, sx, sz, CFG, mulberry32(seed + 1), 'gradient', true);
    adSteps.push(ad.steps);
    rndSteps.push(rnd.steps);
    ablSteps.push(abl.steps);
    if (ad.reached) adReached++;
    if (rnd.reached) rndReached++;
  }
  const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  const meanAD = mean(adSteps);
  const meanRND = mean(rndSteps);
  const deltas = rndSteps.map((v, i) => v - adSteps[i]!); // >0 ⇒ AD faster

  test('AD reaches food in < 0.6x the steps of the random walk', () => {
    expect(meanAD).toBeLessThan(0.6 * meanRND);
    expect(meanAD).toBeGreaterThan(0); // it did move + take real steps
  });

  test('the speed-up is significant (paired permutation p < 0.01)', () => {
    expect(pairedPermutationP(deltas, 12345)).toBeLessThan(0.01);
  });

  test('the gradient is LOAD-BEARING: zeroing it makes the forager byte-identical to the random walk', () => {
    // same field, same start, same seeded rng, same code path minus the sensed gradient ⇒ same trajectory.
    for (let i = 0; i < N; i++) expect(ablSteps[i]).toBe(rndSteps[i]);
    // and the AD arm clearly beats that ablation baseline (not just noise between arms).
    expect(meanAD).toBeLessThan(0.6 * mean(ablSteps));
  });

  test('the AD forager reliably finds food where the random walk usually does not', () => {
    expect(adReached).toBeGreaterThanOrEqual(N - 2); // essentially always
    expect(rndReached).toBeLessThan(N / 2); // the far ring defeats undirected diffusion
  });

  test('deterministic: identical seed ⇒ identical step count (replay)', () => {
    const { sources, sx, sz } = trial(7);
    const a = runForager(sources, sx, sz, CFG, mulberry32(8), 'gradient');
    const b = runForager(sources, sx, sz, CFG, mulberry32(8), 'gradient');
    expect(a.steps).toBe(b.steps);
    expect(a.reached).toBe(b.reached);
  });
});
