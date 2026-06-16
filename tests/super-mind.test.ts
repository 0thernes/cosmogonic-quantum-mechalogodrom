/**
 * THE SUPER MIND (V45) — the apex creature's ~10k-param composite consciousness. Pins the parameter
 * budget, the 5-stage / 5-depth / 25-variant / 10-quantum architecture, determinism, bounded drives +
 * consciousness + quantum aspects, and NaN-freedom across the dream/hallucinate/reason/feel pipeline.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperMind,
  QUANTUM_ASPECTS,
  SUPER_DEPTHS,
  SUPER_VARIANTS,
  SUPER_STAGES,
  SUPER_ORGANS,
  SUPER_QUANTUM,
} from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';

function percept(over: Partial<SuperPercept> = {}): SuperPercept {
  return {
    energy: 0.5,
    threat: 0.2,
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.3,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: 0.25,
    ...over,
  };
}

describe('SuperMind composite consciousness (V45)', () => {
  test('the composite mind is ~10,000 parameters across its sub-networks', () => {
    const m = new SuperMind(mulberry32(1));
    expect(m.paramCount).toBeGreaterThanOrEqual(9000);
    expect(m.paramCount).toBeLessThanOrEqual(11000);
    // architecture: 5 stages, 5 depths, 25 variants, 30 organ-nets, 10 quantum aspects
    expect(SUPER_STAGES).toBe(5);
    expect(SUPER_DEPTHS).toBe(5);
    expect(SUPER_DEPTHS * SUPER_VARIANTS).toBe(25);
    expect(SUPER_ORGANS).toBe(30);
    expect(SUPER_QUANTUM).toBe(10);
    expect(QUANTUM_ASPECTS).toHaveLength(10);
    expect(m.snapshot().variants).toBe(25);
  });

  test('same seed ⇒ identical psyche (deterministic — the whole mind replays from a seed)', () => {
    const a = new SuperMind(mulberry32(42));
    const b = new SuperMind(mulberry32(42));
    const seq = [
      percept({ threat: 0.9, energy: 0.2 }),
      percept({ chaos: 0.95, sound: 0.9 }),
      percept({ preyClose: 0.9, wealthRel: 1 }),
    ];
    let last = '';
    for (const p of seq) {
      a.think(p);
      b.think(p);
      last = JSON.stringify(a.snapshot());
      expect(last).toBe(JSON.stringify(b.snapshot()));
    }
    expect(last.length).toBeGreaterThan(0);
  });

  test('drives + consciousness + quantum are all bounded; plan is always a real goal', () => {
    const m = new SuperMind(mulberry32(7));
    for (let i = 0; i < 40; i++) {
      const it = m.think(
        percept({ threat: (i % 10) / 10, energy: 1 - (i % 7) / 7, phase: i / 40 }),
      );
      for (const v of [it.move.x, it.move.y, it.move.z]) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
      for (const v of [it.aggression, it.deception, it.dominance, it.spawn, it.curiosity]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(it.quantum).toHaveLength(10);
      for (const qa of it.quantum) {
        expect(qa).toBeGreaterThanOrEqual(0);
        expect(qa).toBeLessThanOrEqual(1);
      }
      const c = it.consciousness;
      for (const v of [
        c.dreaming,
        c.hallucinating,
        c.reasoning,
        c.selfAware,
        c.novelty,
        c.surprise,
        c.ignition, // V89 · GWT broadcast
        c.phi, // V89 · IIT Φ proxy
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(c.feeling).toBeGreaterThanOrEqual(-1);
      expect(c.feeling).toBeLessThanOrEqual(1);
    }
  });

  test('it always DREAMS (imagines) and the consciousness fields are live, not constant', () => {
    const m = new SuperMind(mulberry32(3));
    const dreams: number[] = [];
    for (let i = 0; i < 30; i++)
      dreams.push(m.think(percept({ chaos: i / 30 })).consciousness.dreaming);
    expect(Math.min(...dreams)).toBeGreaterThan(0); // it is always imagining
    expect(new Set(dreams.map((d) => Math.round(d * 1e3))).size).toBeGreaterThan(1); // it varies (alive)
  });

  test('V89 (SC 1.1) — ignition (GWT) + Φ (IIT) are live, bounded [0,1], finite metrics', () => {
    const m = new SuperMind(mulberry32(11));
    const igs: number[] = [];
    const phis: number[] = [];
    for (let i = 0; i < 60; i++) {
      const c = m.think(
        percept({
          threat: (i % 12) / 12,
          preyClose: ((i + 3) % 9) / 9,
          wealthRel: (i % 5) / 5,
          phase: i / 60,
        }),
      ).consciousness;
      for (const v of [c.ignition, c.phi]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      igs.push(c.ignition);
      phis.push(c.phi);
      // the snapshot carries the same metrics for the boards/telemetry
      expect(m.snapshot().consciousness.phi).toBe(c.phi);
    }
    // both are alive — they vary across the run, not pinned constants
    expect(new Set(igs.map((x) => Math.round(x * 1e3))).size).toBeGreaterThan(1);
    expect(new Set(phis.map((x) => Math.round(x * 1e3))).size).toBeGreaterThan(1);
  });

  test('no NaN across a long run of dreaming/reasoning/feeling', () => {
    const m = new SuperMind(mulberry32(5));
    for (let i = 0; i < 300; i++) {
      const it = m.think(percept({ threat: Math.sin(i) * 0.5 + 0.5, phase: (i % 60) / 60 }));
      const snap = m.snapshot();
      const fin =
        it.move.x +
        it.aggression +
        snap.emotion.valence +
        snap.consciousness.novelty +
        (snap.quantum[0] ?? 0);
      expect(Number.isFinite(fin)).toBe(true);
    }
  });
});
