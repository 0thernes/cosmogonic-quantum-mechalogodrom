/**
 * THE SUPER CREATURE (V31) — the apex deep mind. Pins the parameter budget, determinism, bounded
 * I/O, the emotion EMA, the prediction-loop surprise, and the twin (offspring) cap.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperCreature,
  SUPER_PARAM_COUNT,
  SUPER_MAX_OFFSPRING,
  SUPER_PLANS,
  type SuperPercept,
} from '../src/sim/super-creature';

/** A neutral percept; override the fields a test cares about. */
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

describe('SuperCreature mind', () => {
  test('the deep mind has 1000–1500 parameters (briefed band) — 1444, stacked cortex+actor', () => {
    expect(SUPER_PARAM_COUNT).toBe(1444);
    expect(SUPER_PARAM_COUNT).toBeGreaterThanOrEqual(1000);
    expect(SUPER_PARAM_COUNT).toBeLessThanOrEqual(1500);
    const sc = new SuperCreature(mulberry32(1));
    expect(sc.paramCount).toBe(SUPER_PARAM_COUNT);
    // half a Titan, ~100× power — the brief's scale.
    expect(sc.sizeRel).toBe(0.5);
    expect(sc.power).toBe(100);
  });

  test('same seed ⇒ identical psychological arc (deterministic, contract rule 7)', () => {
    const a = new SuperCreature(mulberry32(42));
    const b = new SuperCreature(mulberry32(42));
    const seq = [
      percept({ threat: 0.9, energy: 0.2 }),
      percept({ preyClose: 0.9, energy: 0.8 }),
      percept({ wealthRel: 1, rivalClose: 0.8 }),
      percept({ chaos: 0.95, sound: 0.9 }),
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

  test('think() output is bounded and the plan is always a real goal', () => {
    const sc = new SuperCreature(mulberry32(7));
    for (let i = 0; i < 50; i++) {
      const it = sc.think(
        percept({ threat: (i % 10) / 10, energy: 1 - (i % 7) / 7, phase: i / 50 }),
      );
      for (const v of [it.move.x, it.move.y, it.move.z]) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
      for (const v of [it.aggression, it.deception, it.dominance, it.spawn, it.curiosity]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(SUPER_PLANS).toContain(it.plan);
      const snap = sc.snapshot();
      expect(snap.surprise).toBeGreaterThanOrEqual(0);
      expect(snap.surprise).toBeLessThanOrEqual(1);
      expect(snap.sense).toHaveLength(18);
      expect(snap.latent).toHaveLength(16);
      expect(snap.act).toHaveLength(8);
    }
  });

  test('emotion is a real temperament: dread under sustained threat, triumph when safe + sated', () => {
    const dread = new SuperCreature(mulberry32(3));
    const triumph = new SuperCreature(mulberry32(3));
    for (let i = 0; i < 60; i++) {
      dread.think(percept({ threat: 1, energy: 0 }));
      triumph.think(percept({ threat: 0, energy: 1 }));
    }
    expect(dread.snapshot().emotion.valence).toBeLessThan(0);
    expect(triumph.snapshot().emotion.valence).toBeGreaterThan(0);
  });

  test('it sires at most 3 mutated twins, each one generation deeper, then stops', () => {
    const rng = mulberry32(99);
    const prime = new SuperCreature(rng);
    const kids: SuperCreature[] = [];
    for (let i = 0; i < SUPER_MAX_OFFSPRING + 2; i++) {
      const kid = prime.maybeSpawn(rng);
      if (kid) kids.push(kid);
    }
    expect(kids).toHaveLength(SUPER_MAX_OFFSPRING);
    expect(prime.offspringCount).toBe(SUPER_MAX_OFFSPRING);
    expect(prime.maybeSpawn(rng)).toBeNull();
    for (const kid of kids) {
      expect(kid.generation).toBe(prime.generation + 1);
      expect(kid.paramCount).toBe(prime.paramCount); // same architecture, mutated weights
    }
    // a twin's weights differ from the prime's arc — mutation actually perturbed something.
    const twinArc = JSON.stringify(kids[0]!.think(percept()));
    const primeArc = JSON.stringify(prime.think(percept()));
    expect(twinArc).not.toBe(primeArc);
  });
});
