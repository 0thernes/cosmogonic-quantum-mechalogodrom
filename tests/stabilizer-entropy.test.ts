/**
 * STABILIZER RÉNYI ENTROPY (V99) — the "magic" / non-stabilizerness of a quantum state (Leone, Oliviero &
 * Hamma, PRL 2022). Pinned against CLOSED-FORM values: every stabilizer state (|0…0⟩, |+…+⟩, GHZ) has
 * exactly 0 magic; the T-state |T⟩ = T|+⟩ has exactly 1/4 (the 1-qubit maximum), and a T-state tensored
 * with |0⟩s keeps that 1/4 — so the measure correctly ignores entanglement and sees only non-Cliffordness.
 */
import { describe, expect, test } from 'bun:test';
import { stabilizerLinearEntropy } from '../src/math/stabilizer-entropy';

/** |0…0⟩ — a stabilizer state. */
function ket0(n: number): { re: Float64Array; im: Float64Array } {
  const d = 1 << n;
  const re = new Float64Array(d);
  re[0] = 1;
  return { re, im: new Float64Array(d) };
}
/** |+…+⟩ — a stabilizer state. */
function plus(n: number): { re: Float64Array; im: Float64Array } {
  const d = 1 << n;
  const re = new Float64Array(d).fill(1 / Math.sqrt(d));
  return { re, im: new Float64Array(d) };
}
/** GHZ_n = (|0…0⟩ + |1…1⟩)/√2 — a maximally-entangled STABILIZER (graph) state ⇒ zero magic. */
function ghz(n: number): { re: Float64Array; im: Float64Array } {
  const d = 1 << n;
  const re = new Float64Array(d);
  const s = 1 / Math.sqrt(2);
  re[0] = s;
  re[d - 1] = s;
  return { re, im: new Float64Array(d) };
}
/** |T⟩ = T|+⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2 on qubit 0, tensor |0⟩ on the rest — a magic state. */
function tState(n: number): { re: Float64Array; im: Float64Array } {
  const d = 1 << n;
  const re = new Float64Array(d);
  const im = new Float64Array(d);
  re[0] = 1 / Math.sqrt(2);
  re[1] = 0.5; // e^{iπ/4}/√2 = 0.5 + 0.5i
  im[1] = 0.5;
  return { re, im };
}

describe('stabilizerLinearEntropy — quantum magic / non-stabilizerness (V99)', () => {
  test('every stabilizer state has EXACTLY zero magic (|0…0⟩, |+…+⟩, GHZ)', () => {
    for (let n = 1; n <= 4; n++) {
      expect(stabilizerLinearEntropy(ket0(n).re, ket0(n).im, n)).toBeCloseTo(0, 9);
      expect(stabilizerLinearEntropy(plus(n).re, plus(n).im, n)).toBeCloseTo(0, 9);
    }
    for (let n = 2; n <= 4; n++) {
      expect(stabilizerLinearEntropy(ghz(n).re, ghz(n).im, n)).toBeCloseTo(0, 9);
    }
  });

  test('the T-state has exactly 1/4 magic — and tensoring with |0⟩s preserves it (magic ≠ entanglement)', () => {
    for (let n = 1; n <= 4; n++) {
      const t = tState(n);
      expect(stabilizerLinearEntropy(t.re, t.im, n)).toBeCloseTo(0.25, 9);
    }
  });

  test('magic strictly orders a T-state above any stabilizer state', () => {
    const t = tState(3);
    expect(stabilizerLinearEntropy(t.re, t.im, 3)).toBeGreaterThan(
      stabilizerLinearEntropy(ghz(3).re, ghz(3).im, 3) + 0.1,
    );
  });

  test('magic is bounded in [0,1) and deterministic', () => {
    const t = tState(2);
    const a = stabilizerLinearEntropy(t.re, t.im, 2);
    const b = stabilizerLinearEntropy(t.re, t.im, 2);
    expect(a).toBe(b); // pure function
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  test('NaN / degenerate amplitudes never produce NaN', () => {
    const d = 1 << 2;
    const re = new Float64Array(d);
    const im = new Float64Array(d);
    re[0] = NaN;
    im[2] = Infinity;
    const m = stabilizerLinearEntropy(re, im, 2);
    expect(Number.isFinite(m)).toBe(true);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
  });

  test('the 6-qubit apex register evaluates within budget and stays bounded', () => {
    // a deterministic, normalised-ish 6-qubit state (not a stabilizer ⇒ expect nonzero magic)
    const n = 6;
    const d = 1 << n;
    const re = new Float64Array(d);
    const im = new Float64Array(d);
    let norm = 0;
    for (let i = 0; i < d; i++) {
      re[i] = Math.sin(i * 0.7 + 1);
      im[i] = Math.cos(i * 1.3 + 0.2) * 0.5;
      norm += re[i] * re[i] + im[i] * im[i];
    }
    const inv = 1 / Math.sqrt(norm);
    for (let i = 0; i < d; i++) {
      re[i] *= inv;
      im[i] *= inv;
    }
    const m = stabilizerLinearEntropy(re, im, n);
    expect(Number.isFinite(m)).toBe(true);
    expect(m).toBeGreaterThan(0); // a generic state is magical
    expect(m).toBeLessThan(1);
  });
});
