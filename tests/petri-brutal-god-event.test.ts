/**
 * Petri brutal-god routing — headless tests for applyBrutalGodEvent event-string branches.
 * Locks in the 2026-06-27 misroute fix (DETERMINISTIC_REWRITE / FATE_TWIST / BINARY_IGNITION).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { applyBrutalRelease, triggerBrutalRelease } from '../src/sim/brutal-god-releases';
import { applyBrutalGodEvent, createPetriDish, type PetriDishState } from '../src/sim/petri-dish';

const rng = mulberry32(0xb00da1);

function seededDish(seed: number): PetriDishState {
  const d = createPetriDish(seed);
  d.biomass = 0.55;
  d.complexity = 5;
  d.pressure = 0.35;
  d.aliveness = 0.75;
  d.godPower = 0.2;
  return d;
}

describe('applyBrutalGodEvent — event routing (2026-06-27 fix)', () => {
  test('DETERMINISTIC_REWRITE → reality-warp branch (pressure rises)', () => {
    const d = seededDish(1);
    const p0 = d.pressure;
    applyBrutalGodEvent(d, 'DETERMINISTIC_REWRITE', 0.3, 0.8, rng);
    expect(d.pressure).toBeGreaterThan(p0);
  });

  test('FATE_TWIST → chaos branch (complexity rises)', () => {
    const d = seededDish(2);
    const c0 = d.complexity;
    applyBrutalGodEvent(d, 'FATE_TWIST', 0.3, 0.7, rng);
    expect(d.complexity).toBeGreaterThan(c0);
  });

  test('BINARY_IGNITION → rebirth branch (biomass rises)', () => {
    const d = seededDish(3);
    d.biomass = 0.45;
    applyBrutalGodEvent(d, 'BINARY_IGNITION', 0.4, 0.75, rng);
    expect(d.biomass).toBeGreaterThan(0.45);
  });

  test('VOID_RIFT → consume branch (biomass falls)', () => {
    const d = seededDish(4);
    d.biomass = 0.85;
    applyBrutalGodEvent(d, 'VOID_RIFT', 0.3, 0.85, rng);
    expect(d.biomass).toBeLessThan(0.85);
  });

  test('SPIRAL_WILL → transcendence branch (complexity rises)', () => {
    const d = seededDish(5);
    const c0 = d.complexity;
    applyBrutalGodEvent(d, 'SPIRAL_WILL', 0.5, 0.9, rng);
    expect(d.complexity).toBeGreaterThan(c0);
  });
});

describe('petri brutal release — live biologics contract', () => {
  test('applyBrutalRelease mutates vitality in place (petri-dish.ts mirror)', () => {
    const dish = createPetriDish(99);
    dish.aliveness = 0.95;
    dish.spinPolarization = 0.9;
    dish.qgtCurvature = 0.85;
    dish.ignitionSlot = 6;
    dish.biologics.push({ form: 'M0', vitality: 1 }, { form: 'M1', vitality: 1 });
    const rel = triggerBrutalRelease(
      0,
      dish.aliveness,
      dish.spinPolarization,
      dish.qgtCurvature,
      dish.ignitionSlot / 7,
      mulberry32(4242),
      100,
    );
    expect(rel).not.toBeNull();
    const before = dish.biologics.map((b) => b.vitality ?? 0);
    const ents = dish.biologics as Array<{ vitality: number; form: string }>;
    applyBrutalRelease(rel!, ents, dish.aliveness, 100);
    expect(dish.biologics.some((b, i) => (b.vitality ?? 0) !== before[i]!)).toBe(true);
  });
});
