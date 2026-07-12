/**
 * GATE-QUANTUM-AD — proves the quantum-classical autodiff bridge (`math/quantum-ad`): a variational
 * circuit's expectation is differentiated by the EXACT parameter-shift rule, wrapped as an Eshkol
 * custom-VJP node so it composes with the classical tape and can drive a real optimiser. Falsifiable:
 *   - EXPECTATION: ⟨Z⟩ under RY(θ) equals cos θ in closed form;
 *   - PARAMETER-SHIFT is EXACT: the shift-rule gradient equals −sin θ analytically, and equals central
 *     finite differences on an entangled multi-parameter circuit;
 *   - TAPE: adQuantumExpectation's backward reproduces the parameter-shift gradient;
 *   - HYBRID: a classical→quantum→classical loss differentiates end-to-end (matches finite differences);
 *   - VQE (functional): gradient descent through the tape drives ⟨H⟩ to the EXACT diagonal ground energy;
 *   - DETERMINISM: identical bytes on repeat.
 */
import { describe, expect, test } from 'bun:test';
import {
  circuitExpectation,
  parameterShiftGradient,
  adQuantumExpectation,
  pauliZHamiltonian,
  vqeMinimize,
  diagonalGroundEnergy,
  type QuantumCircuit,
} from '../src/math/quantum-ad';
import {
  adTapeNew,
  adVar,
  adConst,
  adMul,
  adSub,
  adBackward,
  adGradient,
  adValue,
} from '../src/math/eshkol-ad';

/** 1-qubit RY(θ), H = Z₀ ⇒ ⟨H⟩ = cos θ. */
const RY_Z: QuantumCircuit = {
  qubits: 1,
  ops: [{ kind: 'rot', gate: 'ry', target: 0, param: 0 }],
  hamiltonian: pauliZHamiltonian(1, [{ coeff: 1, on: [0] }]),
  paramCount: 1,
};

/** 2-qubit entangled ansatz RY(θ₀)@0 · RY(θ₁)@1 · CX(0→1), H = Z₀ + 0.5·Z₁ + 0.3·Z₀Z₁. */
const ENTANGLED: QuantumCircuit = {
  qubits: 2,
  ops: [
    { kind: 'rot', gate: 'ry', target: 0, param: 0 },
    { kind: 'rot', gate: 'ry', target: 1, param: 1 },
    { kind: 'fixed', gate: 'cx', target: 1, control: 0 },
  ],
  hamiltonian: pauliZHamiltonian(2, [
    { coeff: 1, on: [0] },
    { coeff: 0.5, on: [1] },
    { coeff: 0.3, on: [0, 1] },
  ]),
  paramCount: 2,
};

describe('GATE-QUANTUM-AD: exact parameter-shift differentiation of a variational circuit', () => {
  test('EXPECTATION: ⟨Z⟩ under RY(θ) = cos θ', () => {
    for (const t of [0, 0.5, 1.3, Math.PI / 2, Math.PI, 2.7]) {
      expect(circuitExpectation(RY_Z, [t])).toBeCloseTo(Math.cos(t), 12);
    }
  });

  test('PARAMETER-SHIFT is EXACT: ∂⟨Z⟩/∂θ = −sin θ (closed form)', () => {
    for (const t of [0.2, 0.9, 1.9, 3.0]) {
      const g = parameterShiftGradient(RY_Z, [t]);
      expect(g[0]!).toBeCloseTo(-Math.sin(t), 12); // exact, not a difference
    }
  });

  test('PARAMETER-SHIFT matches central finite differences on the entangled 2-qubit circuit', () => {
    const pts: number[][] = [
      [0.3, -0.7],
      [1.1, 2.2],
      [-0.9, 0.4],
    ];
    for (const theta of pts) {
      const g = parameterShiftGradient(ENTANGLED, theta);
      const h = 1e-6;
      for (let k = 0; k < 2; k++) {
        const tp = theta.slice();
        tp[k] = theta[k]! + h;
        const tm = theta.slice();
        tm[k] = theta[k]! - h;
        const fd =
          (circuitExpectation(ENTANGLED, tp) - circuitExpectation(ENTANGLED, tm)) / (2 * h);
        expect(Math.abs(g[k]! - fd)).toBeLessThan(1e-4);
      }
    }
  });

  test('TAPE: adQuantumExpectation backward reproduces the parameter-shift gradient', () => {
    const theta = [0.6, -1.2];
    const tape = adTapeNew(32);
    const nodes = theta.map((t) => adVar(tape, t));
    const eNode = adQuantumExpectation(tape, ENTANGLED, nodes);
    expect(adValue(tape, eNode)).toBeCloseTo(circuitExpectation(ENTANGLED, theta), 12);
    adBackward(tape, eNode);
    const ref = parameterShiftGradient(ENTANGLED, theta);
    for (let k = 0; k < 2; k++) expect(adGradient(tape, nodes[k]!)).toBeCloseTo(ref[k]!, 12);
  });

  test('HYBRID: a classical→quantum→classical loss differentiates end-to-end (vs finite differences)', () => {
    const target = 0.4;
    // θ₀ = 2x, θ₁ = x² feed the entangled circuit; L(x) = (⟨H⟩ − target)².
    const grad = (x: number): number => {
      const tape = adTapeNew(64);
      const xn = adVar(tape, x);
      const t0 = adMul(tape, adConst(tape, 2), xn);
      const t1 = adMul(tape, xn, xn);
      const e = adQuantumExpectation(tape, ENTANGLED, [t0, t1]);
      const d = adSub(tape, e, adConst(tape, target));
      const L = adMul(tape, d, d);
      adBackward(tape, L);
      return adGradient(tape, xn);
    };
    const loss = (x: number): number => {
      const e = circuitExpectation(ENTANGLED, [2 * x, x * x]);
      return (e - target) ** 2;
    };
    for (const x of [0.5, -0.3, 1.2]) {
      const h = 1e-6;
      const fd = (loss(x + h) - loss(x - h)) / (2 * h);
      expect(Math.abs(grad(x) - fd)).toBeLessThan(1e-3 + 1e-3 * Math.abs(fd));
    }
  });

  test('VQE (functional): descent through the tape reaches the EXACT diagonal ground energy', () => {
    // H = Z₀ + Z₁ − 0.5·Z₀Z₁ ⇒ ground state |11⟩ at energy −2.5, reachable by a product RY ansatz.
    const circuit: QuantumCircuit = {
      qubits: 2,
      ops: [
        { kind: 'rot', gate: 'ry', target: 0, param: 0 },
        { kind: 'rot', gate: 'ry', target: 1, param: 1 },
      ],
      hamiltonian: pauliZHamiltonian(2, [
        { coeff: 1, on: [0] },
        { coeff: 1, on: [1] },
        { coeff: -0.5, on: [0, 1] },
      ]),
      paramCount: 2,
    };
    const ground = diagonalGroundEnergy(circuit);
    expect(ground).toBeCloseTo(-2.5, 12);
    const res = vqeMinimize(circuit, [1, 1], 0.25, 400);
    expect(res.energy).toBeLessThan(res.energyHistory[0]!); // it descended
    expect(res.energy).toBeLessThan(ground + 0.02); // and reached the exact ground state
  });

  test('DETERMINISTIC: identical VQE inputs ⇒ identical parameters', () => {
    const run = (): number[] => vqeMinimize(ENTANGLED, [0.3, 0.3], 0.2, 60).theta;
    expect(run()).toEqual(run());
  });
});
