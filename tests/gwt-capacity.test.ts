/**
 * GWT-2 limited-capacity workspace — proves the new capacity-bounded competition is a genuine Cowan
 * bottleneck (top-K conscious access + excluded `pressure`), not the winner-take-all argmax it replaces.
 * The super-mind reproducibility test additionally covers its live integration (snapshot().gwtCapacity
 * is part of the bit-identical-from-seed assertion).
 */
import { describe, expect, test } from 'bun:test';
import { gwtCapacityCompete } from '../src/math/global-workspace';

describe('GWT-2 limited-capacity workspace competition', () => {
  test('uniform field: only `capacity` slots gain access; the rest is competition pressure', () => {
    const sal = new Float32Array(10).fill(0.5);
    const r = gwtCapacityCompete(sal, 10, 4);
    expect(r.occupancy).toBe(4);
    expect(r.capacity).toBe(4);
    expect(r.admitted.length).toBe(4);
    expect(r.access).toBeCloseTo(0.4, 5); // 4 of 10 equal slots
    expect(r.pressure).toBeCloseTo(0.6, 5);
    expect(r.access + r.pressure).toBeCloseTo(1, 6);
  });

  test('a dominant contender ignites with high access and near-zero pressure', () => {
    const sal = [8, 0, 0, 0, 0, 0];
    const r = gwtCapacityCompete(sal, 6, 4);
    expect(r.ignited).toBe(true);
    expect(r.admitted[0]).toBe(0);
    expect(r.access).toBeGreaterThan(0.9);
    expect(r.pressure).toBeLessThan(0.1);
  });

  test('capacity is clamped to [1, n] and ties break deterministically by index', () => {
    const sal = new Float32Array(5).fill(1);
    expect(gwtCapacityCompete(sal, 5, 99).occupancy).toBe(5); // cap > n → n
    expect(gwtCapacityCompete(sal, 5, 0).occupancy).toBe(1); // cap < 1 → 1
    expect(gwtCapacityCompete(sal, 5, 3).admitted).toEqual([0, 1, 2]); // ties → lowest indices
  });

  test('deterministic + bounded across temperatures', () => {
    const sal = [0.1, 0.9, 0.3, 0.7, 0.2];
    for (const temp of [0.5, 1, 2]) {
      const a = gwtCapacityCompete(sal, 5, 3, 0.5, temp);
      const b = gwtCapacityCompete(sal, 5, 3, 0.5, temp);
      expect(a).toEqual(b);
      expect(a.access).toBeGreaterThanOrEqual(0);
      expect(a.access).toBeLessThanOrEqual(1);
      expect(a.pressure).toBeGreaterThanOrEqual(0);
      expect(a.pressure).toBeLessThanOrEqual(1);
    }
  });

  test('empty workspace is well-defined', () => {
    const r = gwtCapacityCompete([], 0, 4);
    expect(r.occupancy).toBe(0);
    expect(r.access).toBe(0);
    expect(r.ignited).toBe(false);
  });
});
