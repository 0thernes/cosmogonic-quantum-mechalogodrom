/**
 * Unit tests for the P1 paired permutation (sign-flip) significance test. This is the honest verdict
 * layer of the quantum-vs-classical keystone: the bootstrap CI shows spread, this shows whether the
 * effect clears noise. The properties below pin the test's correctness against cases with a KNOWN
 * answer, so a future edit can't silently turn it into a p-hacking machine.
 */
import { describe, expect, test } from 'bun:test';
import { pairedPermutationP } from '../scripts/p1-quantum-classical-experiment';

describe('pairedPermutationP — a real, deterministic significance test', () => {
  test('a large consistent effect is highly significant (small p)', () => {
    // every pair strongly positive → almost no sign-flip reaches the observed |mean| → tiny p
    const deltas = Array.from({ length: 24 }, (_, i) => 5 + (i % 3));
    expect(pairedPermutationP(deltas, 12345)).toBeLessThan(0.01);
  });

  test('pure noise around zero is NOT significant (large p)', () => {
    // symmetric ±small deltas → the observed mean is tiny → most permutations match or exceed it → p≈1
    const deltas = Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    expect(pairedPermutationP(deltas, 777)).toBeGreaterThan(0.2);
  });

  test('deterministic: same deltas + seed ⇒ identical p (seeded, replayable)', () => {
    const deltas = [1, -2, 3, -1, 0.5, 2, -0.5, 1.5];
    expect(pairedPermutationP(deltas, 42)).toBe(pairedPermutationP(deltas, 42));
  });

  test('p is a valid probability in (0, 1] and respects the add-one floor', () => {
    const deltas = Array.from({ length: 16 }, (_, i) => i - 7);
    const p = pairedPermutationP(deltas, 999, 1000);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThanOrEqual(1 / 1001); // (hits+1)/(iters+1) can never be 0
  });

  test('empty input is the trivial null (p = 1)', () => {
    expect(pairedPermutationP([], 1)).toBe(1);
  });

  test('a bigger effect is at least as significant as a smaller one (monotone sanity)', () => {
    const small = Array.from({ length: 20 }, () => 0.5);
    const big = Array.from({ length: 20 }, () => 3.0);
    expect(pairedPermutationP(big, 55)).toBeLessThanOrEqual(pairedPermutationP(small, 55));
  });
});
