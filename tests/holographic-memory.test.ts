/**
 * THE HOLOGRAPHIC MEMORY (V97) — closed-form experiments for the VSA / HRR compositional memory. Each test
 * is a falsifiable claim about a PROVABLE property of the MAP-VSA algebra (Physicist's law 4): bipolar
 * binding is exactly self-inverse, random atoms are near-orthogonal in high D, bundling preserves similarity,
 * cleanup snaps noise back to the nearest atom — and, end-to-end, the module recalls the plan it bound to a
 * given context, deterministically and within bounds.
 */
import { describe, expect, test } from 'bun:test';
import { HolographicMemory, HRR_DIM } from '../src/sim/holographic-memory';
import { mulberry32 } from '../src/math/rng';

const D = HRR_DIM;
const atom = (r: () => number): Int8Array =>
  Int8Array.from({ length: D }, () => (r() < 0.5 ? -1 : 1));
const cos = (a: Int8Array, b: Int8Array): number => {
  let dot = 0;
  for (let i = 0; i < D; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot / D;
};

describe('HolographicMemory (V97) — Vector Symbolic Architecture / HRR compositional memory', () => {
  test('bipolar binding (⊙) is EXACTLY self-inverse: unbind(a⊙b, a) = b', () => {
    const r = mulberry32(1);
    const a = atom(r);
    const b = atom(r);
    let exact = true;
    for (let i = 0; i < D; i++) {
      const bound = (a[i] ?? 0) * (b[i] ?? 0);
      const unbound = bound * (a[i] ?? 0);
      if (unbound !== (b[i] ?? 0)) exact = false;
    }
    expect(exact).toBeTrue(); // a[i]² = 1 ⇒ perfect recovery (no cleanup needed)
  });

  test('random atoms are near-orthogonal in high dimension (|⟨a,b⟩|/D ≪ 1)', () => {
    const r = mulberry32(2);
    const atoms = Array.from({ length: 12 }, () => atom(r));
    let maxAbs = 0;
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        maxAbs = Math.max(
          maxAbs,
          Math.abs(cos(atoms[i] ?? new Int8Array(D), atoms[j] ?? new Int8Array(D))),
        );
      }
    }
    expect(maxAbs).toBeLessThan(0.2); // σ ≈ 1/√512 ≈ 0.044; 0.2 is ~4.5σ — distinct codes stay separable
  });

  test('bundling (majority sign) stays SIMILAR to every constituent', () => {
    const r = mulberry32(3);
    const a = atom(r);
    const b = atom(r);
    const c = atom(r);
    const bundle = Int8Array.from({ length: D }, (_, i) =>
      (a[i] ?? 0) + (b[i] ?? 0) + (c[i] ?? 0) >= 0 ? 1 : -1,
    );
    expect(cos(bundle, a)).toBeGreaterThan(0.3);
    expect(cos(bundle, b)).toBeGreaterThan(0.3);
    expect(cos(bundle, c)).toBeGreaterThan(0.3);
  });

  test('cleanup recovers the nearest codebook atom from a noisy vector', () => {
    const r = mulberry32(4);
    const book = Array.from({ length: 7 }, () => atom(r));
    const nr = mulberry32(99);
    const target = 4;
    const clean = book[target] ?? new Int8Array(D);
    const noisy = Int8Array.from({ length: D }, (_, i) =>
      nr() < 0.2 ? -(clean[i] ?? 1) : (clean[i] ?? 1),
    );
    let best = -1;
    let bestV = -Infinity;
    for (let k = 0; k < book.length; k++) {
      const c = cos(noisy, book[k] ?? new Int8Array(D));
      if (c > bestV) {
        bestV = c;
        best = k;
      }
    }
    expect(best).toBe(target); // 20% bit-flips ⇒ still nearest its own atom
  });

  test('the module RECALLS the plan it bound to a context (analogical memory)', () => {
    const mem = new HolographicMemory(mulberry32(7));
    const sA = [1, 1, 1, 1, 0, 0, 0, 0];
    const sB = [1, 0, 1, 0, 1, 0, 1, 0];
    for (let i = 0; i < 40; i++) {
      mem.observe(2, sA); // in situation A → plan 2
      mem.observe(5, sB); // in situation B → plan 5
    }
    expect(mem.recall(sA)).toBe(2);
    expect(mem.recall(sB)).toBe(5);
    const s = mem.snapshot();
    expect(s.confidence).toBeGreaterThan(0); // a real, confident analogy
    expect(s.traceEnergy).toBeGreaterThan(0);
  });

  test('same seed + same (plan, senses) stream ⇒ bit-identical (deterministic)', () => {
    const run = (): string => {
      const mem = new HolographicMemory(mulberry32(0xabc));
      const lr = mulberry32(0xdef);
      for (let i = 0; i < 80; i++) {
        const s = Array.from({ length: 8 }, () => lr());
        mem.recall(s);
        mem.observe(Math.floor(lr() * 7), s);
      }
      return JSON.stringify(mem.snapshot());
    };
    expect(run()).toBe(run());
  });

  test('recall stays bounded + NaN-free over a long random driven run', () => {
    const mem = new HolographicMemory(mulberry32(11));
    const lr = mulberry32(13);
    for (let i = 0; i < 500; i++) {
      const s = Array.from({ length: 8 }, () => lr());
      const rp = mem.recall(s);
      expect(rp === -1 || (rp >= 0 && rp < 7)).toBeTrue();
      expect(mem.confidence).toBeGreaterThanOrEqual(0);
      expect(mem.confidence).toBeLessThanOrEqual(1);
      mem.observe(Math.floor(lr() * 7), s);
    }
    const s = mem.snapshot();
    for (const v of s.similarity) {
      expect(Number.isFinite(v)).toBeTrue();
      expect(v).toBeGreaterThanOrEqual(-1.0001);
      expect(v).toBeLessThanOrEqual(1.0001);
    }
    expect(s.traceEnergy).toBeGreaterThanOrEqual(0);
    expect(s.traceEnergy).toBeLessThanOrEqual(1);
    expect(s.margin).toBeGreaterThanOrEqual(0);
  });
});
