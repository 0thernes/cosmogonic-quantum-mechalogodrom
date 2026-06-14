/**
 * Tests for the NHI super-mind (src/sim/nhi.ts) and the game-theory primitives it leans on
 * (src/sim/ai/brains.ts). Everything is pure + seeded, so the contract is: same seed ⇒ same mind ⇒
 * same decisions, bit-for-bit. We also assert the apex decision stays well-formed and that distinct
 * seeds yield distinct personalities (the world must not fill with identical clones).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { bestResponse, iteratedMove, regretMatch, GameStrategy } from '../src/sim/ai/brains';
import { NhiMind, NhiAction, type NhiPercept } from '../src/sim/nhi';

describe('game theory: bestResponse', () => {
  test('picks the row maximizing expected payoff', () => {
    // Prisoner's dilemma payoff (row player): C=[3,0], D=[5,1]; row-major 2x2.
    const payoff = [3, 0, 5, 1];
    // Opponent certain to cooperate → defect (row 1) dominates.
    expect(bestResponse(payoff, 2, 2, [1, 0])).toBe(1);
    // Opponent certain to defect → defect still dominates (1 > 0).
    expect(bestResponse(payoff, 2, 2, [0, 1])).toBe(1);
  });
  test('ties resolve to the lowest index; empty → -1', () => {
    expect(bestResponse([2, 2, 2, 2], 2, 2, [0.5, 0.5])).toBe(0);
    expect(bestResponse([], 0, 0, [])).toBe(-1);
  });
});

describe('game theory: iteratedMove', () => {
  const rng = mulberry32(1);
  test('TIT_FOR_TAT cooperates first, then mirrors', () => {
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, -1, false, 0, rng)).toBe(0);
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, 1, true, 1, rng)).toBe(1);
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, 0, true, 2, rng)).toBe(0);
  });
  test('GRUDGER cooperates until betrayed, then defects forever', () => {
    expect(iteratedMove(GameStrategy.GRUDGER, 0, false, 5, rng)).toBe(0);
    expect(iteratedMove(GameStrategy.GRUDGER, 0, true, 6, rng)).toBe(1);
  });
  test('ALWAYS_DEFECT always defects', () => {
    expect(iteratedMove(GameStrategy.ALWAYS_DEFECT, 0, false, 0, rng)).toBe(1);
  });
  test('PROBER opens with a defection then probes', () => {
    expect(iteratedMove(GameStrategy.PROBER, -1, false, 0, rng)).toBe(1);
    expect(iteratedMove(GameStrategy.PROBER, 1, false, 1, rng)).toBe(0);
    // round>2 and the opponent kept cooperating → exploit them (defect).
    expect(iteratedMove(GameStrategy.PROBER, 0, false, 3, rng)).toBe(1);
  });
  test('GENEROUS_TFT sometimes forgives a defection (deterministic per seed)', () => {
    const r = mulberry32(42);
    let forgave = 0;
    for (let i = 0; i < 200; i++)
      if (iteratedMove(GameStrategy.GENEROUS_TFT, 1, true, i, r) === 0) forgave++;
    expect(forgave).toBeGreaterThan(0); // forgives some
    expect(forgave).toBeLessThan(200); // but not all
  });
});

describe('game theory: regretMatch', () => {
  test('with no positive regret, returns a valid in-range action', () => {
    const a = regretMatch([0, 0, 0], 3, mulberry32(7));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(3);
  });
  test('favors the highest-regret action', () => {
    const counts = [0, 0, 0];
    const rng = mulberry32(9);
    for (let i = 0; i < 1000; i++) {
      const a = regretMatch([1, 8, 1], 3, rng);
      counts[a] = (counts[a] ?? 0) + 1;
    }
    expect((counts[1] ?? 0) > (counts[0] ?? 0)).toBe(true);
    expect((counts[1] ?? 0) > (counts[2] ?? 0)).toBe(true);
  });
  test('empty → -1', () => {
    expect(regretMatch([], 0, mulberry32(1))).toBe(-1);
  });
});

const PERCEPT: NhiPercept = {
  beat: 0,
  energy: 0.6,
  crowding: 0.4,
  chaos: 0.3,
  threat: 0.2,
  rivalFaction: 2,
  rivalLastMove: 1,
};

describe('NhiMind', () => {
  test('is bit-reproducible: same seed ⇒ identical decision stream', () => {
    const run = (): string => {
      const mind = new NhiMind(mulberry32(123));
      const rng = mulberry32(456);
      const out: string[] = [];
      for (let b = 0; b < 30; b++) {
        const intent = mind.think({ ...PERCEPT, beat: b }, rng);
        out.push(
          `${intent.action}:${intent.spawn}:${intent.ownMove}:${intent.utterance.join(',')}`,
        );
      }
      return out.join('|');
    };
    expect(run()).toBe(run());
  });

  test('emits well-formed intents', () => {
    const mind = new NhiMind(mulberry32(5));
    const rng = mulberry32(6);
    for (let b = 0; b < 100; b++) {
      const intent = mind.think({ ...PERCEPT, beat: b, chaos: (b % 10) / 10 }, rng);
      expect(intent.action).toBeGreaterThanOrEqual(0);
      expect(intent.action).toBeLessThan(7);
      expect(intent.spawn).toBeGreaterThanOrEqual(0);
      expect(intent.magnitude).toBeGreaterThanOrEqual(0);
      expect(intent.magnitude).toBeLessThanOrEqual(1);
      expect(intent.utterance.length).toBeGreaterThan(0);
      for (const g of intent.utterance) {
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThan(12);
      }
      // SPAWN_SWARM must release ≥1; every other action releases none.
      if (intent.action === NhiAction.SPAWN_SWARM) expect(intent.spawn).toBeGreaterThan(0);
      else expect(intent.spawn).toBe(0);
      // MANIPULATE targets a faction; nothing else does.
      if (intent.action === NhiAction.MANIPULATE) expect(intent.target).toBe(PERCEPT.rivalFaction);
      else expect(intent.target).toBe(-1);
    }
  });

  test('distinct seeds → distinct personalities (no clone army)', () => {
    const a = new NhiMind(mulberry32(1));
    const b = new NhiMind(mulberry32(2));
    const traits = (m: NhiMind): number[] => [
      m.narcissism,
      m.aggression,
      m.deceit,
      m.hallucination,
      m.volatility,
    ];
    expect(traits(a)).not.toEqual(traits(b));
    for (const t of [...traits(a), ...traits(b)]) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  test('produces a variety of actions over time (not stuck on one)', () => {
    const mind = new NhiMind(mulberry32(77));
    const rng = mulberry32(88);
    const seen = new Set<number>();
    for (let b = 0; b < 300; b++) {
      const energy = (b % 7) / 7;
      const threat = ((b * 3) % 5) / 5;
      seen.add(mind.think({ ...PERCEPT, beat: b, energy, threat, chaos: (b % 4) / 4 }, rng).action);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3); // a scheming mind explores its options
  });

  test('spawnChild yields a mutated but valid offspring mind', () => {
    const parent = new NhiMind(mulberry32(11));
    const child = parent.spawnChild(mulberry32(12));
    const rng = mulberry32(13);
    const intent = child.think(PERCEPT, rng);
    expect(intent.action).toBeGreaterThanOrEqual(0);
    expect(intent.action).toBeLessThan(7);
  });
});
