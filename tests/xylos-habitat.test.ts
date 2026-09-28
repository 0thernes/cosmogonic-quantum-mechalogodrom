import { expect, test } from 'bun:test';
import { XylosMind, type XylosPercept } from '../src/sim/xylos-mind';
import { XylosHabitat } from '../src/sim/xylos-habitat';
import { ReactionDiffusionSystem } from '../src/sim/reaction-diffusion';
import { mulberry32 } from '../src/math/rng';
import type { SimContext } from '../src/types';

function field(): ReactionDiffusionSystem {
  // This fixture supplies exactly the two context dependencies read by the RD constructor/step.
  return new ReactionDiffusionSystem(
    {
      rng: mulberry32(42),
      state: { weatherIdx: 0, chaos: 1 },
    } as SimContext,
    16,
  );
}

test('Xylos senses actual chemical gradients and action writes alter subsequent perception', () => {
  const rd = field();
  const habitat = new XylosHabitat(rd, 225, 2400);
  const mind = new XylosMind(42);
  const percept: XylosPercept = { nutrient: 0, hazard: 0, signal: 0, gradientX: 0, gradientZ: 0 };
  habitat.sense(mind.view, percept);
  expect(percept.nutrient).toBe(1);
  expect(percept.signal).toBe(0);
  habitat.effect({ ...mind.view, tick: 10, pulse: 0.9 });
  expect(habitat.writes).toBe(1);
  habitat.sense(mind.view, percept);
  expect(percept.nutrient).toBeCloseTo(0.35, 5);
  expect(percept.signal).toBeCloseTo(0.8, 5);
  rd.step();
  habitat.sense({ ...mind.view, x: 0.85 }, percept);
  expect(percept.gradientX).not.toBe(0);
  rd.dispose();
});

test('action cadence and pulse gate suppress disturbance in controls', () => {
  const rd = field();
  const habitat = new XylosHabitat(rd, 225, 2400);
  const view = new XylosMind(3).view;
  habitat.effect({ ...view, tick: 9, pulse: 1 });
  habitat.effect({ ...view, tick: 10, pulse: 0.1 });
  expect(habitat.writes).toBe(0);
  expect(rd.fieldU.every((value) => value === 1)).toBe(true);
  rd.dispose();
});

test('autonomous mind and chemical habitat complete a bounded causal loop', () => {
  const rd = field();
  const habitat = new XylosHabitat(rd, 225, 2400);
  const mind = new XylosMind(67);
  const control = new XylosMind(67);
  const p: XylosPercept = { nutrient: 1, hazard: 0, signal: 0, gradientX: 0, gradientZ: 0 };
  const uniform = { ...p };
  for (let i = 0; i < 300; i++) {
    habitat.sense(mind.view, p);
    mind.tick(p);
    control.tick(uniform);
    habitat.effect(mind.view);
    rd.step();
  }
  expect(habitat.writes).toBeGreaterThan(0);
  expect(mind.view.activity).not.toEqual(control.view.activity);
  expect(rd.fieldU.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  rd.dispose();
});
