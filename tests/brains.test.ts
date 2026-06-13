import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  utilityPick,
  softmaxPick,
  TinyMLP,
  MarkovChain,
  fsmStep,
  goapPlan,
  MemoryRing,
  type FsmEdge,
  type GoapAction,
} from '../src/sim/ai/brains';

describe('utilityPick (utility AI argmax)', () => {
  test('returns the highest-scoring index', () => {
    expect(utilityPick([1, 5, 3])).toBe(1);
    expect(utilityPick([9, 2, 2])).toBe(0);
    expect(utilityPick([-3, -1, -2])).toBe(1);
  });
  test('ties resolve to the lowest index (deterministic)', () => {
    expect(utilityPick([2, 2, 1])).toBe(0);
    expect(utilityPick([1, 2, 2])).toBe(1);
  });
  test('empty list yields -1', () => {
    expect(utilityPick([])).toBe(-1);
  });
});

describe('softmaxPick (seeded fuzzy choice)', () => {
  test('is deterministic for the same seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const scores = [1, 3, 2, 5];
    for (let i = 0; i < 50; i++) expect(softmaxPick(scores, a)).toBe(softmaxPick(scores, b));
  });
  test('always returns a valid index', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const k = softmaxPick([0.1, 0.2, 0.3], rng);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(3);
    }
  });
  test('low temperature concentrates on the max', () => {
    const rng = mulberry32(3);
    let hits = 0;
    for (let i = 0; i < 200; i++) if (softmaxPick([0, 0, 10], rng, 0.05) === 2) hits++;
    expect(hits).toBeGreaterThan(190); // near-deterministic toward the dominant option
  });
  test('empty list yields -1', () => {
    expect(softmaxPick([], mulberry32(1))).toBe(-1);
  });
});

describe('TinyMLP (fixed-weight perceptron)', () => {
  test('weightCount matches the bias-augmented layout', () => {
    expect(TinyMLP.weightCount(2, 3, 1)).toBe(3 * 3 + 1 * 4); // 13
    expect(TinyMLP.weightCount(8, 8, 4)).toBe(8 * 9 + 4 * 9); // 108
  });
  test('zero weights produce zero (tanh(0)) outputs', () => {
    const net = new TinyMLP(3, 4, 2);
    const h = new Float32Array(4);
    const out = new Float32Array(2);
    net.forward([1, -1, 0.5], h, out);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[1]).toBeCloseTo(0, 6);
  });
  test('forward matches a hand-computed value', () => {
    // 1→1→1, hidden = tanh(0 + 1*x), out = tanh(0 + 1*hidden).
    const w = new Float32Array([0, 1, 0, 1]);
    const net = new TinyMLP(1, 1, 1, w);
    const h = new Float32Array(1);
    const out = new Float32Array(1);
    net.forward([1], h, out);
    expect(h[0]).toBeCloseTo(Math.tanh(1), 6);
    expect(out[0]).toBeCloseTo(Math.tanh(Math.tanh(1)), 6);
  });
  test('forward is allocation-free + deterministic across calls', () => {
    const w = new Float32Array(TinyMLP.weightCount(2, 2, 1)).map((_, i) => Math.sin(i)); // fixed
    const net = new TinyMLP(2, 2, 1, w);
    const h = new Float32Array(2);
    const o1 = new Float32Array(1);
    const o2 = new Float32Array(1);
    net.forward([0.3, -0.7], h, o1);
    net.forward([0.3, -0.7], h, o2);
    expect(o1[0]).toBe(o2[0]);
  });
});

describe('MarkovChain (seeded transition sampling)', () => {
  test('deterministic rows force the successor regardless of rng', () => {
    // 0→1 always, 1→0 always.
    const chain = new MarkovChain(2, new Float32Array([0, 1, 1, 0]));
    const rng = mulberry32(42);
    let s = 0;
    const seq: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = chain.next(s, rng);
      seq.push(s);
    }
    expect(seq).toEqual([1, 0, 1, 0, 1, 0]);
  });
  test('a dead (all-zero) row stays put', () => {
    const chain = new MarkovChain(2, new Float32Array([0, 0, 1, 0]));
    expect(chain.next(0, mulberry32(1))).toBe(0);
  });
  test('same seed ⇒ same walk', () => {
    const w = new Float32Array([1, 1, 1, 1]);
    const c1 = new MarkovChain(2, w);
    const c2 = new MarkovChain(2, w);
    const r1 = mulberry32(99);
    const r2 = mulberry32(99);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 30; i++) {
      a = c1.next(a, r1);
      b = c2.next(b, r2);
      expect(a).toBe(b);
    }
  });
});

describe('fsmStep (finite-state machine)', () => {
  const edges: FsmEdge<{ threat: number }>[] = [
    { from: 0, to: 1, guard: (s) => s.threat > 0.5 }, // idle → flee
    { from: 1, to: 0, guard: (s) => s.threat <= 0.5 }, // flee → idle
  ];
  test('takes a transition when its guard passes', () => {
    expect(fsmStep(0, edges, { threat: 0.9 })).toBe(1);
    expect(fsmStep(1, edges, { threat: 0.1 })).toBe(0);
  });
  test('stays when no guard passes', () => {
    expect(fsmStep(0, edges, { threat: 0.1 })).toBe(0);
    expect(fsmStep(1, edges, { threat: 0.9 })).toBe(1);
  });
  test('edge order is the priority', () => {
    const e: FsmEdge<number>[] = [
      { from: 0, to: 5, guard: () => true },
      { from: 0, to: 9, guard: () => true },
    ];
    expect(fsmStep(0, e, 0)).toBe(5); // first matching edge wins
  });
});

describe('goapPlan (goal-oriented action planning)', () => {
  // facts: bit0 = wood, bit1 = axe, bit2 = house
  const actions: GoapAction[] = [
    { pre: 0, preClear: 0, set: 0b010, clear: 0, cost: 1 }, // getAxe
    { pre: 0b010, preClear: 0, set: 0b001, clear: 0, cost: 1 }, // chopWood (needs axe)
    { pre: 0b011, preClear: 0, set: 0b100, clear: 0, cost: 1 }, // build (needs wood+axe)
  ];
  test('finds a plan from nothing to a built house', () => {
    const plan = new Int32Array(8);
    const len = goapPlan(0, 0b100, actions, plan);
    expect(len).toBe(3);
    expect(plan[len - 1]).toBe(2); // last action is build
    // replay the plan and confirm the goal bit ends set
    let s = 0;
    for (let i = 0; i < len; i++) {
      const a = actions[plan[i] as number] as GoapAction;
      s = (s | a.set) & ~a.clear;
    }
    expect(s & 0b100).toBe(0b100);
  });
  test('already-satisfied goal needs an empty plan', () => {
    const plan = new Int32Array(8);
    expect(goapPlan(0b100, 0b100, actions, plan)).toBe(0);
  });
  test('unreachable goal returns -1', () => {
    const plan = new Int32Array(8);
    // remove the only build action ⇒ bit2 unreachable
    expect(goapPlan(0, 0b100, actions.slice(0, 2), plan)).toBe(-1);
  });
});

describe('MemoryRing (bounded episodic memory)', () => {
  test('evicts oldest at capacity and reads most-recent-first', () => {
    const m = new MemoryRing(3);
    m.push(1);
    m.push(2);
    m.push(3);
    m.push(4); // evicts 1
    expect(m.size).toBe(3);
    expect(m.recent(0)).toBe(4);
    expect(m.recent(1)).toBe(3);
    expect(m.recent(2)).toBe(2);
    expect(m.recent(3)).toBeUndefined();
  });
  test('mean averages stored entries', () => {
    const m = new MemoryRing(3);
    m.push(4);
    m.push(3);
    m.push(2);
    expect(m.mean()).toBeCloseTo(3, 6);
  });
  test('clear forgets everything', () => {
    const m = new MemoryRing(2);
    m.push(7);
    m.clear();
    expect(m.size).toBe(0);
    expect(m.recent(0)).toBeUndefined();
    expect(m.mean()).toBe(0);
  });
});
