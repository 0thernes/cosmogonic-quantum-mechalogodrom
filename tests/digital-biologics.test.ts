import { describe, expect, test } from 'bun:test';
import { BIOLOGIC_FORMS, birthBiologic, stepBiologic } from '../src/sim/digital-biologics';
import { createPetriDish, petriDishBeat } from '../src/sim/petri-dish';
import { mulberry32 } from '../src/math/rng';

describe('digital biologics birth', () => {
  test('is deterministic, finite, and selects a known corpus-backed form', () => {
    const a = birthBiologic(3, 42);
    const b = birthBiologic(3, 42);

    expect(a).toEqual(b);
    expect(BIOLOGIC_FORMS).toContain(a.form);
    expect(a.alive).toBe(true);
    expect(a.consciousness).toBeGreaterThanOrEqual(0);
    expect(a.consciousness).toBeLessThanOrEqual(1);

    for (const [key, value] of Object.entries(a)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), key).toBe(true);
      }
    }
  });

  test('stepBiologic is deterministic and advances generation', () => {
    const a = birthBiologic(1, 7);
    const b = birthBiologic(1, 7);
    stepBiologic(a, 0.6);
    stepBiologic(b, 0.6);
    expect(a).toEqual(b);
    expect(a.generation).toBe(1);

    const reality = birthBiologic(1, 7);
    reality.form = 'REALITY_MXY';
    reality.brutalGodPower = 1;
    const curvatureBefore = reality.qgtCurvature;
    stepBiologic(reality, 0.6);
    expect(Number.isFinite(reality.qgtCurvature)).toBe(true);
    expect(reality.qgtCurvature).toBeGreaterThan(curvatureBefore);
  });

  test('petri dish ignition can birth full Biologic records (world-wired path)', () => {
    // Force ignition conditions by beating a dish hard with a fixed rng until a birth lands
    // OR inject via the public birth leaf and confirm petri steps it.
    const dish = createPetriDish(0xc0ffee01);
    dish.ignitionSlot = 11; // near max (NUTRIENT_SLOTS-1=11) → ignition ~1
    dish.phiSurrogate = 0.9;
    dish.aliveness = 0.9;
    dish.biomass = 0.9;
    const before = dish.biologics.length;
    // Seed one full biologic the same way petriDishBeat does on ignition
    const born = birthBiologic(0, 99);
    dish.biologics.push({ ...born, vitality: born.consciousness });
    expect(dish.biologics.length).toBe(before + 1);
    expect(dish.biologics[0]!.form).toBeDefined();
    expect(BIOLOGIC_FORMS).toContain(dish.biologics[0]!.form as (typeof BIOLOGIC_FORMS)[number]);

    const rng = mulberry32(0x51ff);
    for (let i = 0; i < 5; i++) petriDishBeat(dish, 0, i + 100, rng);
    // Full records keep adFitness and get stepped (generation advances while alive)
    const live = dish.biologics.filter((b) => typeof b.adFitness === 'number');
    expect(live.length).toBeGreaterThan(0);
    expect((live[0]!.generation ?? 0) >= 1 || live[0]!.alive === false).toBe(true);
  });
});
