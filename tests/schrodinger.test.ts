/**
 * schrodinger.test.ts — behavioral-oracle tests for the REAL Schrödinger
 * propagator (src/math/schrodinger.ts). ADR-F stub-honesty: these assert the
 * defining invariants of unitary quantum evolution that a "proxy multiplier"
 * cannot fake — norm conservation (unitarity), energy conservation, eigenstate
 * stationarity, wavepacket propagation, and determinism.
 */
import { describe, expect, test } from 'bun:test';
import {
  gaussianPacket,
  evolve,
  cnStep,
  norm2,
  expectationEnergy,
  expectationX,
  type Wave,
} from '../src/math/schrodinger';

const N = 128;
const DX = 0.1;
const DT = 0.002;
const V0 = Array.from({ length: N }, () => 0); // free particle

function packet(): Wave {
  return gaussianPacket(N, DX, (N * DX) / 2, 1.0, 2.0); // centred, σ=1, momentum k₀=2
}

/** Exact discrete ground eigenstate of the Dirichlet kinetic operator: sin(π(j+1)/(N+1)). */
function sineGround(): Wave {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let j = 0; j < N; j++) re[j] = Math.sin((Math.PI * (j + 1)) / (N + 1));
  const nrm = Math.sqrt(norm2({ re, im }));
  for (let j = 0; j < N; j++) re[j] = re[j]! / nrm;
  return { re, im };
}

describe('unitarity', () => {
  test('norm is conserved to machine precision over many steps', () => {
    const psi0 = packet();
    const n0 = norm2(psi0);
    const psiT = evolve(psi0, V0, DT, DX, 300);
    expect(Math.abs(norm2(psiT) - n0)).toBeLessThan(1e-9);
  });

  test('energy ⟨Ĥ⟩ is conserved for a time-independent potential', () => {
    const psi0 = packet();
    const e0 = expectationEnergy(psi0, V0, DX);
    const psiT = evolve(psi0, V0, DT, DX, 300);
    expect(Math.abs(expectationEnergy(psiT, V0, DX) - e0)).toBeLessThan(1e-6);
  });
});

describe('eigenstate stationarity', () => {
  test('the discrete ground eigenstate keeps |ψ|² invariant (only global phase rotates)', () => {
    const g = sineGround();
    const before = Array.from(g.re, (r, j) => r * r + g.im[j]! * g.im[j]!);
    const gT = evolve(g, V0, DT, DX, 100);
    let maxDiff = 0;
    for (let j = 0; j < N; j++) {
      const p = gT.re[j]! * gT.re[j]! + gT.im[j]! * gT.im[j]!;
      maxDiff = Math.max(maxDiff, Math.abs(p - before[j]!));
    }
    expect(maxDiff).toBeLessThan(1e-7);
  });
});

describe('dynamics', () => {
  test('a wavepacket with positive momentum propagates to the right', () => {
    const psi0 = packet();
    const x0 = expectationX(psi0, DX);
    const psiT = evolve(psi0, V0, DT, DX, 150);
    expect(expectationX(psiT, DX)).toBeGreaterThan(x0 + 1e-3);
  });

  test('the wavefunction stays finite (no NaN/Inf) throughout', () => {
    const psiT = evolve(packet(), V0, DT, DX, 200);
    for (let j = 0; j < N; j++) {
      expect(Number.isFinite(psiT.re[j]!)).toBe(true);
      expect(Number.isFinite(psiT.im[j]!)).toBe(true);
    }
  });
});

describe('determinism', () => {
  test('identical ψ₀ + V + dt ⇒ identical trajectory', () => {
    const a = evolve(packet(), V0, DT, DX, 50);
    const b = evolve(packet(), V0, DT, DX, 50);
    expect(Array.from(a.re)).toEqual(Array.from(b.re));
    expect(Array.from(a.im)).toEqual(Array.from(b.im));
  });

  test('a single Crank–Nicolson step preserves norm', () => {
    const psi0 = packet();
    const stepped = cnStep(psi0, V0, DT, DX);
    expect(Math.abs(norm2(stepped) - norm2(psi0))).toBeLessThan(1e-10);
  });
});
