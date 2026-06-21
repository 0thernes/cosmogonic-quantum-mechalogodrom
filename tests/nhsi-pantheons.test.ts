import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { FacultiesPantheon, FACULTY_NAMES } from '../src/sim/faculties-pantheon';
import { TomPantheon, TOM_ORGANS } from '../src/sim/tom-pantheon';
import { EmergenceAnglesController } from '../src/sim/emergence-angles';

describe('NHSI pantheon modules (100 faculties · 25 ToM · emergence 8–10)', () => {
  test('100 faculties are registered and advance deterministically', () => {
    expect(FACULTY_NAMES.length).toBeGreaterThanOrEqual(100);
    const a = new FacultiesPantheon(mulberry32(42));
    const b = new FacultiesPantheon(mulberry32(42));
    const inputs = new Float32Array([0.2, 0.5, 0.8, 0.1, 0.4, 0.6, 0.3, 0.9]);
    for (let i = 0; i < 40; i++) {
      inputs[0] = (i % 10) / 10;
      a.update(inputs);
      b.update(inputs);
      expect(a.getAggregateActivation()).toBe(b.getAggregateActivation());
      expect(a.getAggregateConfidence()).toBe(b.getAggregateConfidence());
    }
    expect(a.getAllSnapshots().length).toBe(FACULTY_NAMES.length);
  });

  test('25 theory-of-mind organs observe social cues deterministically', () => {
    expect(TOM_ORGANS.length).toBe(25);
    const a = new TomPantheon(mulberry32(7));
    const b = new TomPantheon(mulberry32(7));
    const cues = new Float32Array([0.3, 0.6, 0.2, 0.9, 0.1, 0.5, 0.4, 0.7]);
    for (let i = 0; i < 30; i++) {
      cues[2] = (i % 8) / 8;
      a.observe(cues);
      b.observe(cues);
      expect(a.getAggregateMenace()).toBe(b.getAggregateMenace());
    }
    expect(a.getAllSnapshots().length).toBe(25);
  });

  test('emergence angles 8–10 evolve strains and aggregate collective state', () => {
    const e = new EmergenceAnglesController();
    const g = new Float32Array(32).fill(0.5);
    e.registerStrain('a', g);
    e.registerStrain('b', g);
    e.aggregateCollective('a', new Float32Array([0.1, 0.9, 0.2, 0.4]));
    const evolved = e.evolveEshkolProgram('a', 0.7, new Float32Array([0.5, 0.3]));
    expect(evolved.length).toBeGreaterThan(0);
    const { newA, newB } = e.recombineStrains('a', 'b');
    expect(newA.length).toBe(32);
    expect(newB.length).toBe(32);
    const snaps = e.getAllSnapshots();
    expect(snaps.length).toBeGreaterThanOrEqual(3);
    expect(snaps.some((s) => s.angle === 'HIGHER_ORDER_EMERGENCE')).toBe(true);
    expect(e.getGodScaleSnapshots().length).toBe(5);
    expect(e.getGodScaleSnapshots().some((g) => g.mode === 'ARCHON_WARFARE')).toBe(true);
    expect(e.getAggregateEmergence()).toBeGreaterThanOrEqual(0);
    expect(e.getAggregateEmergence()).toBeLessThanOrEqual(1);
  });
});
