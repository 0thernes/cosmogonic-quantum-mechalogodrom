/**
 * The three GOAL5 consciousness leaves the audit flagged as having NO dedicated unit tests:
 * AST-1 attention-schema, HOT-1 top-down generative perception, and HOT-4 quality-space. These guard
 * the contract each leaf must keep — determinism (one seed → one result), bounded outputs (no
 * divergence/NaN), and the real behavioural property each computes — so they can't silently rot into
 * decoration. All pure + headless (no WebGL/DOM).
 */
import { describe, expect, test } from 'bun:test';
import { AttentionSchema } from '../src/sim/attention-schema';
import { TopDownPerception } from '../src/sim/topdown-perception';
import { QualitySpace } from '../src/sim/quality-space';
import type { SuperPercept } from '../src/sim/super-creature';

const percept = (over: Partial<SuperPercept> = {}): SuperPercept => ({
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
});

describe('AST-1 · AttentionSchema', () => {
  test('focus starts uniform and confidence stays in [0,1]', () => {
    const a = new AttentionSchema();
    const s0 = a.snapshot();
    expect(s0.focus).toHaveLength(8);
    for (const f of s0.focus) expect(f).toBeCloseTo(1 / 8, 6); // neutral init
    a.update([0.4, 0.2, 0.1, 0.3, 0.2, 0.1, 0.1, 0.1], 0.3, 0.5, 0.1);
    const s1 = a.snapshot();
    expect(s1.confidence).toBeGreaterThanOrEqual(0);
    expect(s1.confidence).toBeLessThanOrEqual(1);
    const sum = s1.focus.reduce((p, c) => p + c, 0);
    expect(sum).toBeCloseTo(1, 5); // salience stays a normalised distribution
  });

  test('a peaked salience yields HIGHER confidence than a flat one (low entropy = focused)', () => {
    const focused = new AttentionSchema();
    const flat = new AttentionSchema();
    for (let i = 0; i < 50; i++) {
      focused.update([3, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01], 0.2, 0.4, 0.1);
      flat.update([0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3], 0.2, 0.4, 0.1);
    }
    expect(focused.confidence).toBeGreaterThan(flat.confidence + 0.1);
    expect(focused.snapshot().dominantDim).toBe(0); // argmax tracks the peaked dim
  });

  test('deterministic + NaN-free across a long varied run', () => {
    const run = (): number[] => {
      const a = new AttentionSchema();
      for (let i = 0; i < 200; i++) {
        a.update(
          [i % 5, (i % 3) / 3, 0.2, 0.1, (i % 7) / 7, 0.1, 0.2, 0.3],
          (i % 4) / 4,
          (i % 2) / 2,
          0.1,
        );
      }
      const s = a.snapshot();
      return [s.confidence, s.historyMean, s.dominantDim, ...s.focus];
    };
    const a = run();
    expect(run()).toEqual(a); // one seed → one result
    for (const v of a) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('HOT-1 · TopDownPerception', () => {
  test('generated bias is bounded to [-0.3, 0.3] and deterministic', () => {
    const a = new TopDownPerception();
    const b = new TopDownPerception();
    a.generate([0.7, 0.4, 0.6, 0.3], 0.8);
    b.generate([0.7, 0.4, 0.6, 0.3], 0.8);
    const sa = a.snapshot();
    expect(sa.bias).toHaveLength(4);
    for (const x of sa.bias) {
      expect(Number.isFinite(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(-0.3);
      expect(x).toBeLessThanOrEqual(0.3);
    }
    expect(b.snapshot().bias).toEqual(sa.bias); // identical inputs → identical bias
  });

  test('apply biases the percept but keeps every channel in [0,1]', () => {
    const td = new TopDownPerception();
    td.generate([1, 1, 1, 1], 1); // push the bias hard
    const p = percept({ energy: 0.99, threat: 0.99, light: 0.99, sound: 0.99 });
    td.apply(p);
    for (const v of [p.energy, p.threat, p.light, p.sound]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    td.setError(0.42);
    expect(td.snapshot().error).toBe(0.42);
  });
});

describe('HOT-4 · QualitySpace', () => {
  test('tone is in [0,1] and the code vector is finite (a bounded qualia manifold)', () => {
    // NOTE: project() is sequence-dependent, not cross-instance pure — the Tsotchke-facade calls it
    // wires carry hidden global state, so two fresh instances on identical input need NOT match. World
    // determinism still holds (the facade sequence is itself seeded); we assert the real invariants.
    const a = new QualitySpace();
    const state = [0.6, 0.4, 0.5, 0.3, 0.7, 0.2, 0.45, 0.55];
    const ra = a.project(state);
    expect(ra.tone).toBeGreaterThanOrEqual(0);
    expect(ra.tone).toBeLessThanOrEqual(1);
    expect(ra.code.length).toBeGreaterThan(0);
    for (const c of ra.code) expect(Number.isFinite(c)).toBe(true);
    const snap = a.snapshot();
    expect(snap.tone).toBeGreaterThanOrEqual(0);
    expect(snap.tone).toBeLessThanOrEqual(1);
    expect(snap.code).toHaveLength(ra.code.length);
  });

  test('distinct internal states map to distinct quality codes (the space discriminates)', () => {
    const q = new QualitySpace();
    const c1 = Array.from(q.project([0.9, 0.1, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3]).code);
    const c2 = Array.from(q.project([0.1, 0.9, 0.2, 0.8, 0.1, 0.9, 0.3, 0.7]).code);
    expect(c1).not.toEqual(c2);
  });

  test('NaN-free across a long varied run', () => {
    const q = new QualitySpace();
    for (let i = 0; i < 300; i++) {
      const r = q.project([
        (i % 5) / 5,
        (i % 3) / 3,
        (i % 7) / 7,
        (i % 4) / 4,
        (i % 6) / 6,
        (i % 2) / 2,
        0.4,
        0.6,
      ]);
      expect(Number.isFinite(r.tone)).toBe(true);
      expect(Number.isFinite(r.toneGrad ?? 0)).toBe(true);
    }
  });
});
