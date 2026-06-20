/**
 * Deterministic VQE acceptance tests (Moonlab port).
 *
 * Falsifiable closed-form checks:
 *   - ⟨Z⟩ = +1 for |0⟩ (RY angle 0) and −1 for |1⟩ (RY angle π).
 *   - Single-qubit H = Z has exact ground energy −1; the parameter-shift
 *     optimizer reaches ≤ −0.99 from a seeded start.
 *   - Energy stays within the coefficient L1 bound [−L1, +L1] for any angles.
 *   - 2-qubit H = Z⊗Z reaches its ground energy −1.
 *   - TFIM (multi-term, off-diagonal) ground energy matches the exact eigenvalue.
 *   - parameter-shift gradient matches a central finite difference.
 *   - same seed ⇒ identical optimization trajectory.
 */

import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  coeffL1Norm,
  singlePauliHamiltonian,
  tfimHamiltonian,
  vqeEnergy,
  vqeEnergyProxy,
  vqeMinimize,
  vqeOptimize,
  vqeSeedParams,
  vqeStep,
  zzHamiltonian,
  type VQEParams,
} from '../src/sim/moonlab-vqe';

const TOL = 1e-9;

describe('Pauli expectations (closed form)', () => {
  test('⟨Z⟩ = +1 for |0⟩ (RY(0)|0⟩)', () => {
    const h = singlePauliHamiltonian('Z', 1);
    // angle 0 leaves the qubit in |0⟩; ⟨Z⟩ = +1, so E = c·1 = +1.
    expect(vqeEnergy(h, [0])).toBeCloseTo(1, 9);
  });

  test('⟨Z⟩ = −1 for |1⟩ (RY(π)|0⟩)', () => {
    const h = singlePauliHamiltonian('Z', 1);
    expect(vqeEnergy(h, [Math.PI])).toBeCloseTo(-1, 9);
  });

  test('⟨Z⟩ = 0 for the equator (RY(π/2)|0⟩ = |+⟩)', () => {
    const h = singlePauliHamiltonian('Z', 1);
    expect(Math.abs(vqeEnergy(h, [Math.PI / 2]))).toBeLessThan(1e-9);
  });

  test('⟨X⟩ = +1 for |+⟩ (RY(π/2)|0⟩)', () => {
    const h = singlePauliHamiltonian('X', 1);
    expect(vqeEnergy(h, [Math.PI / 2])).toBeCloseTo(1, 9);
  });
});

describe('single-qubit H = Z ground state', () => {
  test('optimizer reaches ≤ −0.99 from a seeded start', () => {
    const h = singlePauliHamiltonian('Z', 1);
    const rng = mulberry32(0xc0ffee);
    const p = vqeSeedParams(rng); // only theta used for 1 qubit
    const res = vqeMinimize(h, [p.theta], 300, 0.3);
    expect(res.energy).toBeLessThanOrEqual(-0.99);
    // Exact ground energy is −1; never undershoot it.
    expect(res.energy).toBeGreaterThanOrEqual(-1 - TOL);
  });

  test('energy is bounded by the coefficient L1 norm for arbitrary angles', () => {
    const c = 2.5;
    const h = singlePauliHamiltonian('Z', c);
    const l1 = coeffL1Norm(h);
    expect(l1).toBeCloseTo(c, 12);
    for (const a of [-3, -1.1, 0, 0.7, 2.2, 5.0]) {
      const e = vqeEnergy(h, [a]);
      expect(e).toBeLessThanOrEqual(l1 + TOL);
      expect(e).toBeGreaterThanOrEqual(-l1 - TOL);
    }
  });
});

describe('2-qubit H = Z⊗Z ground state', () => {
  test('vqeOptimize reaches ground energy −1', () => {
    const rng = mulberry32(42);
    const start: VQEParams = vqeSeedParams(rng);
    const { energy } = vqeOptimize(start, 400, 0.3, zzHamiltonian(1));
    expect(energy).toBeLessThanOrEqual(-0.99);
    expect(energy).toBeGreaterThanOrEqual(-1 - TOL);
  });

  test('vqeStep energy at |01⟩ (θ=0, φ=π) equals −1 (the ground state)', () => {
    // RY(0)|0⟩ ⊗ RY(π)|0⟩ = |0⟩⊗|1⟩ ⇒ ⟨Z⊗Z⟩ = (+1)(−1) = −1.
    const r = vqeStep({ theta: 0, phi: Math.PI }, zzHamiltonian(1));
    expect(r.energy).toBeCloseTo(-1, 9);
  });
});

describe('TFIM multi-term Hamiltonian (off-diagonal)', () => {
  test('reaches the exact ground eigenvalue', () => {
    // H = −Z⊗Z − (X⊗I + I⊗X). Exact spectrum computed by diagonalising the
    // 4x4 matrix; the ground energy is −(1 + 2·√2)/… verified numerically below.
    const h = tfimHamiltonian(1, 1);
    const exact = exactGroundEnergy4(h);
    const rng = mulberry32(7);
    let best = Infinity;
    // The single-layer ansatz can miss the global min from one start; restart a
    // few seeded times (still fully deterministic) and take the best.
    for (let s = 0; s < 6; s++) {
      const p = vqeSeedParams(rng);
      const { energy } = vqeMinimize(h, [p.theta, p.phi], 500, 0.2);
      if (energy < best) best = energy;
    }
    // Never below the true ground energy; close to it from above.
    expect(best).toBeGreaterThanOrEqual(exact - 1e-6);
    expect(best).toBeLessThanOrEqual(exact + 0.05);
  });
});

describe('parameter-shift gradient correctness', () => {
  test('matches central finite difference on Z⊗Z', () => {
    const h = zzHamiltonian(1.3);
    const p: VQEParams = { theta: 0.6, phi: -1.1 };
    const { gradients } = vqeStep(p, h);
    const eps = 1e-5;
    const dTheta =
      (vqeEnergy(h, [p.theta + eps, p.phi]) - vqeEnergy(h, [p.theta - eps, p.phi])) / (2 * eps);
    const dPhi =
      (vqeEnergy(h, [p.theta, p.phi + eps]) - vqeEnergy(h, [p.theta, p.phi - eps])) / (2 * eps);
    expect(gradients.theta).toBeCloseTo(dTheta, 5);
    expect(gradients.phi).toBeCloseTo(dPhi, 5);
  });
});

describe('determinism', () => {
  test('same seed ⇒ identical trajectory and result', () => {
    const h = zzHamiltonian(1);
    const a = vqeOptimize(vqeSeedParams(mulberry32(123)), 200, 0.25, h);
    const b = vqeOptimize(vqeSeedParams(mulberry32(123)), 200, 0.25, h);
    expect(a.energy).toBe(b.energy);
    expect(a.params.theta).toBe(b.params.theta);
    expect(a.params.phi).toBe(b.params.phi);
  });

  test('vqeEnergyProxy is deterministic and bounded in [0, w]', () => {
    const w = 2;
    for (const [t, f] of [
      [0, 0],
      [0, Math.PI],
      [0.7, -1.3],
      [Math.PI / 2, Math.PI / 2],
    ] as const) {
      const v1 = vqeEnergyProxy(t, f, w);
      const v2 = vqeEnergyProxy(t, f, w);
      expect(v1).toBe(v2);
      expect(v1).toBeGreaterThanOrEqual(-TOL);
      expect(v1).toBeLessThanOrEqual(w + TOL);
    }
    // θ=0, φ=0 ⇒ |00⟩ ⇒ ⟨ZZ⟩=+1 ⇒ proxy = (1+1)·0.5·w = w.
    expect(vqeEnergyProxy(0, 0, w)).toBeCloseTo(w, 9);
    // θ=0, φ=π ⇒ |01⟩ ⇒ ⟨ZZ⟩=−1 ⇒ proxy = 0.
    expect(vqeEnergyProxy(0, Math.PI, w)).toBeCloseTo(0, 9);
  });
});

/**
 * Exact ground energy of a 2-qubit Pauli Hamiltonian by dense 4x4 real-symmetric
 * diagonalisation (all our test Hamiltonians are real-symmetric in the Z basis).
 * Reference oracle independent of the VQE statevector code path.
 */
function exactGroundEnergy4(h: { terms: { coefficient: number; paulis: string[] }[] }): number {
  const dim = 4;
  // Build the real matrix M[y][x].
  const M: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  for (const t of h.terms) {
    for (let x = 0; x < dim; x++) {
      let y = x;
      let re = 1;
      let im = 0;
      for (let q = 0; q < t.paulis.length; q++) {
        const p = t.paulis[q];
        const bit = (x >>> q) & 1;
        if (p === 'X') {
          y ^= 1 << q;
        } else if (p === 'Y') {
          y ^= 1 << q;
          const s = bit ? -1 : 1;
          const nr = -s * im;
          const ni = s * re;
          re = nr;
          im = ni;
        } else if (p === 'Z') {
          if (bit) {
            re = -re;
            im = -im;
          }
        }
      }
      // Our test Hamiltonians are real in this basis (no lone Y), so im ≈ 0.
      M[y]![x]! += t.coefficient * re;
    }
  }
  // Jacobi eigenvalue iteration on the symmetric 4x4.
  return jacobiMinEigenvalue(M, dim);
}

/** Smallest eigenvalue of a symmetric matrix via the cyclic Jacobi method. */
function jacobiMinEigenvalue(A: number[][], n: number): number {
  const a = A.map((row) => row.slice());
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) off += (a[p]![q] ?? 0) ** 2;
    }
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q] ?? 0;
        if (Math.abs(apq) < 1e-18) continue;
        const app = a[p]![p] ?? 0;
        const aqq = a[q]![q] ?? 0;
        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p] ?? 0;
          const akq = a[k]![q] ?? 0;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k] ?? 0;
          const aqk = a[q]![k] ?? 0;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
      }
    }
  }
  let min = Infinity;
  for (let i = 0; i < n; i++) min = Math.min(min, a[i]![i] ?? 0);
  return min;
}
