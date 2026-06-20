/**
 * Golden tests for the REAL H₂ VQE — proves it optimizes a genuine Pauli-sum
 * molecular Hamiltonian with real AD gradients, not the old cos·cos toy.
 */
import { describe, expect, test } from 'bun:test';
import { H2_COEFFS, vqeEnergy, vqeStep, vqeOptimize, vqeEnergyProxy } from '../src/sim/moonlab-vqe';

const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

describe('moonlab-vqe: real H₂ Hamiltonian energy', () => {
  test('E(0,0) = g0+g1+g2+g3 (Z eigenstate |00⟩)', () => {
    const { g0, g1, g2, g3 } = H2_COEFFS;
    expect(close(vqeEnergy(0, 0), g0 + g1 + g2 + g3)).toBe(true);
  });

  test('E(π,0) flips Z₀ ⇒ g0−g1+g2−g3', () => {
    const { g0, g1, g2, g3 } = H2_COEFFS;
    expect(close(vqeEnergy(Math.PI, 0), g0 - g1 + g2 - g3)).toBe(true);
  });
});

describe('moonlab-vqe: real AD gradients', () => {
  test('∇E = 0 at the |00⟩ stationary point', () => {
    const r = vqeStep({ theta: 0, phi: 0 });
    expect(close(r.gradients.theta, 0, 1e-9)).toBe(true);
    expect(close(r.gradients.phi, 0, 1e-9)).toBe(true);
  });

  test('∂E/∂θ at (π/2,0) = −(g1+g3) (real chain rule, not cos·cos)', () => {
    const { g1, g3 } = H2_COEFFS;
    const r = vqeStep({ theta: Math.PI / 2, phi: 0 });
    expect(close(r.gradients.theta, -(g1 + g3), 1e-9)).toBe(true);
  });
});

describe('moonlab-vqe: variational minimization', () => {
  test('optimization drives energy below the identity offset', () => {
    const { energy } = vqeOptimize({ theta: 0.3, phi: 0.3 }, 300, 0.1);
    expect(energy).toBeLessThan(-0.5); // a real minimum well below g0
  });

  test('optimized energy ≤ starting energy', () => {
    const start = vqeEnergy(0.3, 0.3);
    const { energy } = vqeOptimize({ theta: 0.3, phi: 0.3 }, 300, 0.1);
    expect(energy).toBeLessThanOrEqual(start + 1e-9);
  });
});

describe('moonlab-vqe: wired proxy stays bounded', () => {
  test('vqeEnergyProxy ∈ [0, weight]', () => {
    for (let t = 0; t < 6; t++) {
      for (let p = 0; p < 6; p++) {
        const v = vqeEnergyProxy(t, p, 1);
        expect(v >= 0 && v <= 1).toBe(true);
      }
    }
  });
});
