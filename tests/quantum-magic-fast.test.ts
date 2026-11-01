import { describe, expect, test } from 'bun:test';
import { quantumMagic } from '../src/math/quantum-magic';
import { mulberry32 } from '../src/math/rng';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The pre-optimisation in-place Pauli application, kept verbatim as the bit-exact reference. */
function referenceMagic(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  nQubits: number,
): { magic: number; magicNorm: number } {
  const dim = 1 << nQubits;
  if (nQubits < 1) return { magic: 0, magicNorm: 0 };
  const wr = new Float64Array(dim);
  const wi = new Float64Array(dim);
  const total = 4 ** nQubits; // number of Pauli strings
  let sum4 = 0; // Σ_P ⟨ψ|P|ψ⟩⁴
  for (let s = 0; s < total; s++) {
    // work ← |ψ⟩
    for (let i = 0; i < dim; i++) {
      wr[i] = re[i] ?? 0;
      wi[i] = im[i] ?? 0;
    }
    // apply P = ⊗_q P_q (2 bits per qubit: 0=I, 1=X, 2=Y, 3=Z) in place — the factors commute
    for (let q = 0; q < nQubits; q++) {
      const p = (s >> (2 * q)) & 3;
      if (p === 0) continue;
      const m = 1 << q;
      for (let base = 0; base < dim; base += m << 1) {
        for (let off = 0; off < m; off++) {
          const i0 = base + off;
          const i1 = i0 + m;
          const r0 = wr[i0] ?? 0;
          const q0 = wi[i0] ?? 0;
          const r1 = wr[i1] ?? 0;
          const q1 = wi[i1] ?? 0;
          if (p === 1) {
            // X = [[0,1],[1,0]] — swap the |0⟩/|1⟩ amplitudes of qubit q
            wr[i0] = r1;
            wi[i0] = q1;
            wr[i1] = r0;
            wi[i1] = q0;
          } else if (p === 2) {
            // Y = [[0,-i],[i,0]] — out0 = -i·a1, out1 = i·a0
            wr[i0] = q1;
            wi[i0] = -r1;
            wr[i1] = -q0;
            wi[i1] = r0;
          } else {
            // Z = [[1,0],[0,-1]] — negate the |1⟩ amplitude
            wr[i1] = -r1;
            wi[i1] = -q1;
          }
        }
      }
    }
    // ⟨ψ|P|ψ⟩ = Σ_i conj(ψ_i)·(Pψ)_i ; real for Hermitian P
    let exp = 0;
    for (let i = 0; i < dim; i++) exp += (re[i] ?? 0) * (wr[i] ?? 0) + (im[i] ?? 0) * (wi[i] ?? 0);
    sum4 += exp * exp * exp * exp;
  }
  // M₂ = −log₂( (1/d) Σ ⟨P⟩⁴ ); a stabilizer state has Σ⟨P⟩⁴ = d ⇒ M₂ = 0.
  const ratio = sum4 / dim;
  let magic = ratio > 0 ? -Math.log2(ratio) : 0;
  if (magic < 0) magic = 0; // float guard (ratio can land at 1+ε for stabilizer states)
  const magicNorm = clamp01(nQubits > 0 ? magic / nQubits : 0); // log₂(d) = nQubits
  return { magic, magicNorm };
}

describe('quantumMagic mask form', () => {
  test('is bit-identical to the in-place Pauli reference on random and edge states', () => {
    const rng = mulberry32(7);
    for (let n = 1; n <= 6; n++) {
      for (let trial = 0; trial < (n === 6 ? 6 : 12); trial++) {
        const d = 1 << n;
        const re = new Float64Array(d);
        const im = new Float64Array(d);
        let norm = 0;
        for (let i = 0; i < d; i++) {
          re[i] = trial === 0 && i > 0 ? 0 : rng() - 0.5;
          im[i] = trial === 0 ? 0 : rng() - 0.5;
          norm += re[i]! * re[i]! + im[i]! * im[i]!;
        }
        const k = 1 / Math.sqrt(norm);
        for (let i = 0; i < d; i++) {
          re[i]! *= k;
          im[i]! *= k;
        }
        const a = quantumMagic(re, im, n);
        const b = referenceMagic(re, im, n);
        expect(Object.is(a.magic, b.magic)).toBe(true);
        expect(Object.is(a.magicNorm, b.magicNorm)).toBe(true);
      }
    }
  });
});
