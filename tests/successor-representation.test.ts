/**
 * THE PREDICTIVE MAP (Super Creature 1.1) — the successor-representation look-ahead. Pins the closed-form
 * SR identities it must converge to ( M = (I − γT)⁻¹ ), determinism, bounds, NaN-safety, the value
 * look-ahead's monotonicity, and the snapshot shape.
 */
import { describe, expect, test } from 'bun:test';
import {
  SR_STATES,
  SuccessorRepresentation,
  type SuccessorSnapshot,
} from '../src/sim/successor-representation';

const GAMMA = 0.9; // must match the module's SR_GAMMA

describe('SuccessorRepresentation — the predictive map (SC 1.1)', () => {
  test('identity-initialised: M[s,s] = 1, off-diagonal 0', () => {
    const sr = new SuccessorRepresentation();
    for (let s = 0; s < SR_STATES; s++) {
      for (let j = 0; j < SR_STATES; j++) {
        expect(sr.occupancy(s, j)).toBe(s === j ? 1 : 0);
      }
    }
  });

  test('self-loop converges to the closed form M[s,s] = 1/(1−γ)', () => {
    const sr = new SuccessorRepresentation();
    // state 2 always transitions to itself
    sr.observe(2); // first call only records the state (no transition yet)
    for (let i = 0; i < 4000; i++) sr.observe(2);
    expect(sr.occupancy(2, 2)).toBeCloseTo(1 / (1 - GAMMA), 2); // = 10
  });

  test('a deterministic 2-cycle converges to (I − γT)⁻¹', () => {
    // T: 0→1, 1→0. Closed form: M[0,0] = 1/(1−γ²), M[0,1] = γ/(1−γ²).
    const sr = new SuccessorRepresentation();
    sr.observe(0);
    for (let i = 0; i < 8000; i++) {
      sr.observe(1);
      sr.observe(0);
    }
    const denom = 1 - GAMMA * GAMMA;
    expect(sr.occupancy(0, 0)).toBeCloseTo(1 / denom, 1); // ≈ 5.263
    expect(sr.occupancy(0, 1)).toBeCloseTo(GAMMA / denom, 1); // ≈ 4.737
  });

  test('every entry stays bounded in [0, 1/(1−γ)] and finite under an arbitrary plan stream', () => {
    const sr = new SuccessorRepresentation();
    const cap = 1 / (1 - GAMMA) + 1e-6;
    // a pseudo-random-but-deterministic plan walk (index arithmetic, no RNG)
    let p = 0;
    for (let i = 0; i < 5000; i++) {
      p = (p * 7 + 3) % SR_STATES;
      sr.observe(p);
      for (let s = 0; s < SR_STATES; s++) {
        for (let j = 0; j < SR_STATES; j++) {
          const v = sr.occupancy(s, j);
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  test('out-of-range plan indices are clamped, never throw or poison the matrix', () => {
    const sr = new SuccessorRepresentation();
    sr.observe(99); // out of range
    sr.observe(-5);
    sr.observe(3);
    for (let s = 0; s < SR_STATES; s++) {
      for (let j = 0; j < SR_STATES; j++) expect(Number.isFinite(sr.occupancy(s, j))).toBe(true);
    }
  });

  test('value look-ahead V(p) = sum M[p,j]*r[j] — finite, and a NaN reward cannot poison it', () => {
    const sr = new SuccessorRepresentation();
    sr.observe(0);
    for (let i = 0; i < 200; i++) {
      sr.observe(1);
      sr.observe(0);
    }
    const out: number[] = Array.from({ length: SR_STATES }, () => 0);
    const reward = [1, 0, 0, 0, 0, 0, 0];
    sr.lookahead(reward, out);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
    // from state 0 the map expects to occupy 0 a lot, so V(0) for reward concentrated on 0 is large
    expect(out[0]).toBeGreaterThan(out[2] ?? 0);
    // a NaN drive collapses to 0 contribution, never NaN
    const bad = [NaN, 0, 0, 0, 0, 0, 0];
    sr.lookahead(bad, out);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
  });

  test('look-ahead is monotonic: more reward on a reachable state ⇒ at least as much value', () => {
    const sr = new SuccessorRepresentation();
    sr.observe(0);
    for (let i = 0; i < 400; i++) {
      sr.observe(1);
      sr.observe(0);
    }
    const lo: number[] = Array.from({ length: SR_STATES }, () => 0);
    const hi: number[] = Array.from({ length: SR_STATES }, () => 0);
    sr.lookahead([0, 1, 0, 0, 0, 0, 0], lo);
    sr.lookahead([0, 2, 0, 0, 0, 0, 0], hi);
    // doubling the reward on state 1 cannot decrease the value of any plan that can reach state 1
    for (let p = 0; p < SR_STATES; p++) expect(hi[p] ?? 0).toBeGreaterThanOrEqual(lo[p] ?? 0);
  });

  test('deterministic — the same plan stream replays an identical map', () => {
    const a = new SuccessorRepresentation();
    const b = new SuccessorRepresentation();
    const stream = [0, 1, 1, 3, 2, 5, 6, 0, 4, 4, 2, 1, 0, 6, 3];
    for (const p of stream) {
      a.observe(p);
      b.observe(p);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
    for (let s = 0; s < SR_STATES; s++) {
      for (let j = 0; j < SR_STATES; j++) expect(a.occupancy(s, j)).toBe(b.occupancy(s, j));
    }
  });

  test('snapshot: bounded fields, a valid predictedNext, normalised occupancy row', () => {
    const sr = new SuccessorRepresentation();
    sr.observe(0);
    for (let i = 0; i < 300; i++) {
      sr.observe(1);
      sr.observe(0);
    }
    const snap: SuccessorSnapshot = sr.snapshot();
    expect(snap.states).toBe(SR_STATES);
    expect(snap.horizon).toBeCloseTo(1 / (1 - GAMMA), 6);
    expect(snap.predictedNext).toBeGreaterThanOrEqual(0);
    expect(snap.predictedNext).toBeLessThan(SR_STATES);
    expect(snap.certainty).toBeGreaterThanOrEqual(0);
    expect(snap.certainty).toBeLessThanOrEqual(1);
    expect(snap.occupancy).toHaveLength(SR_STATES);
    for (const v of snap.occupancy) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // currently in state 0 whose policy sends it to 1 ⇒ the map should predict 1 next
    expect(snap.predictedNext).toBe(1);
  });
});
