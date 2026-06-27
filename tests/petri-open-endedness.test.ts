/**
 * Petri open-endedness telemetry — proves the (previously unsurfaced) open-endedness metrics are
 * now LIVE on the petri-dish view: species richness + Shannon diversity of the live biologic forms,
 * computed read-only from `state.biologics` (no effect on sim dynamics). This closes the gap the
 * gap-census flagged: `open-endedness.ts` was tested but never wired into the running petri loop.
 */
import { describe, expect, test } from 'bun:test';
import { createPetriDish, petriDishView, type PetriDishState } from '../src/sim/petri-dish';
import { shannonDiversity, richness } from '../src/sim/open-endedness';

function withForms(forms: string[]): PetriDishState {
  const s = createPetriDish(42);
  s.biologics = forms.map((f) => ({ form: f, vitality: 0.5 }));
  return s;
}

describe('petri open-endedness telemetry', () => {
  test('empty population → richness 0, diversity 0', () => {
    const v = petriDishView(createPetriDish(7));
    expect(v.speciesRichness).toBe(0);
    expect(v.speciesDiversity).toBe(0);
  });

  test('monoculture → richness 1, diversity 0 bits', () => {
    const v = petriDishView(withForms(['x', 'x', 'x', 'x']));
    expect(v.speciesRichness).toBe(1);
    expect(v.speciesDiversity).toBe(0);
  });

  test('mixed forms → richness = distinct count, diversity = Shannon bits', () => {
    const v = petriDishView(withForms(['a', 'a', 'b']));
    expect(v.speciesRichness).toBe(2);
    // -(2/3·log2(2/3) + 1/3·log2(1/3)) ≈ 0.9183 bits
    expect(v.speciesDiversity).toBeCloseTo(0.9183, 3);
  });

  test('view metrics match the open-endedness kernels directly (no drift)', () => {
    const v = petriDishView(withForms(['p', 'q', 'q', 'r', 'r', 'r']));
    const counts = [1, 2, 3]; // p:1, q:2, r:3
    expect(v.speciesRichness).toBe(richness(counts));
    expect(v.speciesDiversity).toBeCloseTo(shannonDiversity(counts), 6);
  });

  test('even spread of n forms → diversity → log2(n)', () => {
    const v = petriDishView(withForms(['a', 'b', 'c', 'd']));
    expect(v.speciesRichness).toBe(4);
    expect(v.speciesDiversity).toBeCloseTo(2, 6); // log2(4) = 2
  });
});

describe('petri open-endedness — live novelty search (historicalNovelty wired)', () => {
  test('empty / single population → novelty 0 (no neighbours to be novel against)', () => {
    expect(petriDishView(createPetriDish(7)).populationNovelty).toBe(0);
    expect(petriDishView(withForms(['solo'])).populationNovelty).toBe(0);
  });

  test('a monoculture (identical signatures) → novelty 0', () => {
    expect(petriDishView(withForms(['x', 'x', 'x', 'x'])).populationNovelty).toBe(0);
  });

  test('a diverse population → positive, bounded novelty (it occupies spread-out feature space)', () => {
    const v = petriDishView(withForms(['alpha', 'beta', 'gamma', 'delta', 'omega']));
    expect(v.populationNovelty).toBeGreaterThan(0);
    expect(v.populationNovelty).toBeLessThanOrEqual(1);
  });

  test('more-distinct forms are at least as novel as a near-monoculture (novelty tracks divergence)', () => {
    const mono = petriDishView(withForms(['a', 'a', 'a', 'b'])).populationNovelty;
    const diverse = petriDishView(withForms(['a', 'm', 'z', 'Q'])).populationNovelty;
    expect(diverse).toBeGreaterThanOrEqual(mono);
  });
});
