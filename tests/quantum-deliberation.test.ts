/**
 * QUANTUM DELIBERATION (V98) — closed-form experiments for the Lindblad / GKSL open-system deliberation
 * qubit. Each test is a falsifiable claim about a PROVABLE property of the qubit master equation
 * (Physicist's law 4): the state stays a valid density matrix (purity ∈ [0.5,1]); pure dephasing kills
 * coherence while preserving populations; a closed (unitary) system conserves purity; amplitude damping
 * relaxes to the ground decision; coherence falls monotonically with the dephasing rate; and it is
 * deterministic.
 */
import { describe, expect, test } from 'bun:test';
import { QuantumDeliberation } from '../src/sim/quantum-deliberation';

describe('QuantumDeliberation (V98) — Lindblad open-quantum-system deliberation', () => {
  test('stays a valid density matrix (purity ∈ [0.5,1], populations bounded) over a long random run', () => {
    const q = new QuantumDeliberation();
    let r = 0;
    const rng = (): number => {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      return r / 0x7fffffff;
    };
    for (let i = 0; i < 600; i++) {
      q.step(rng(), rng() * 2 - 1, rng());
      const s = q.snapshot();
      const r2 = s.bloch.x ** 2 + s.bloch.y ** 2 + s.bloch.z ** 2;
      expect(Number.isFinite(r2)).toBeTrue();
      expect(r2).toBeLessThanOrEqual(1 + 1e-9); // inside the Bloch ball
      expect(s.purity).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(s.purity).toBeLessThanOrEqual(1 + 1e-9);
      expect(s.coherence).toBeGreaterThanOrEqual(0);
      expect(s.coherence).toBeLessThanOrEqual(1);
      expect(s.excited).toBeGreaterThanOrEqual(0);
      expect(s.excited).toBeLessThanOrEqual(1);
    }
  });

  test('pure dephasing kills coherence monotonically while preserving the population (z)', () => {
    const q = new QuantumDeliberation({ gamma1: 0 }); // no damping → only the T₂ channel acts
    let prev = q.coherence;
    const z0 = q.snapshot().bloch.z; // starts on the equator ⇒ z = 0
    for (let i = 0; i < 60; i++) {
      q.step(0, 0, 1); // no drive, no bias, full dephasing
      const s = q.snapshot();
      expect(s.coherence).toBeLessThanOrEqual(prev + 1e-9); // never rises
      expect(Math.abs(s.bloch.z - z0)).toBeLessThan(1e-6); // pure dephasing leaves the population fixed
      prev = s.coherence;
    }
    expect(q.coherence).toBeLessThan(1e-3); // decohered into a classical mixture
    expect(q.decisiveness).toBeGreaterThan(0.99);
  });

  test('a closed (no dephasing, no damping) system conserves purity (unitary Rabi precession)', () => {
    const q = new QuantumDeliberation({ gamma1: 0, gammaPhiBase: 0 }); // a perfectly closed system
    for (let i = 0; i < 400; i++) q.step(0.6, 0.4, 0); // drive + detuning, ZERO environment
    const s = q.snapshot();
    expect(s.purity).toBeGreaterThan(0.97); // |b| conserved ⇒ stays (near-)pure; no decoherence
  });

  test('amplitude damping relaxes toward the ground "rest" decision (z → 1, excited → 0)', () => {
    const q = new QuantumDeliberation({ gamma1: 0.4 });
    for (let i = 0; i < 200; i++) q.step(0, 0, 0); // no drive/bias/dephasing — only T₁ relaxation
    const s = q.snapshot();
    expect(s.bloch.z).toBeGreaterThan(0.9); // settled to the ground pole
    expect(s.excited).toBeLessThan(0.05);
    expect(s.coherence).toBeLessThan(0.05);
  });

  test('coherence falls monotonically with the dephasing rate (stronger environment ⇒ more collapse)', () => {
    const calm = new QuantumDeliberation();
    const alarmed = new QuantumDeliberation();
    for (let i = 0; i < 120; i++) {
      calm.step(0.7, 0.2, 0.1); // same deliberation drive…
      alarmed.step(0.7, 0.2, 0.9); // …but a much noisier environment
    }
    expect(alarmed.coherence).toBeLessThan(calm.coherence); // more dephasing ⇒ less sustained superposition
  });

  test('deterministic: same config + same input stream ⇒ bit-identical snapshot', () => {
    const run = (): string => {
      const q = new QuantumDeliberation();
      for (let i = 0; i < 100; i++) q.step((i % 7) / 7, ((i % 5) - 2) / 2, (i % 3) / 3);
      return JSON.stringify(q.snapshot());
    };
    expect(run()).toBe(run());
  });

  test('decisiveness is exactly 1 − coherence and both stay bounded', () => {
    const q = new QuantumDeliberation();
    for (let i = 0; i < 50; i++) q.step(0.5, 0.5, 0.5);
    const s = q.snapshot();
    expect(Math.abs(s.decisiveness - (1 - s.coherence))).toBeLessThan(1e-9);
    expect(s.coherence + s.decisiveness).toBeCloseTo(1, 9);
  });
});
