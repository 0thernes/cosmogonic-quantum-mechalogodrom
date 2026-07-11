import { describe, expect, test } from 'bun:test';
import { DarkEnergy } from '../src/sim/dark-energy';

describe('DarkEnergy', () => {
  test('stays bounded and deterministic across repeated cosmology steps', () => {
    const a = new DarkEnergy();
    const b = new DarkEnergy();

    for (let i = 0; i < 128; i++) {
      const energy = (Math.sin(i * 0.17) + 1) * 0.5;
      const matter = (Math.cos(i * 0.11) + 1) * 0.5;
      a.step(energy, matter);
      b.step(energy, matter);
    }

    const sa = a.snapshot();
    const sb = b.snapshot();
    expect(sa).toEqual(sb);

    expect(sa.lambda).toBeGreaterThanOrEqual(0);
    expect(sa.lambda).toBeLessThanOrEqual(1);
    expect(sa.expansionRate).toBeGreaterThanOrEqual(0);
    expect(sa.expansionRate).toBeLessThanOrEqual(1);
    expect(sa.hubble).toBeGreaterThanOrEqual(0);
    expect(sa.hubble).toBeLessThanOrEqual(1);
    expect(sa.w).toBeGreaterThanOrEqual(-1);
    expect(sa.w).toBeLessThanOrEqual(-1 / 3);
    for (const value of Object.values(sa)) expect(Number.isFinite(value)).toBe(true);
  });

  test('stays finite + in-range over a long live-length run (no divergence)', () => {
    // Now stepped every apex beat in World, so it must survive thousands of steps without escaping (the
    // sibling strange-attractor had exactly this latent divergence bug). φ is clamp-bounded so it cannot.
    const d = new DarkEnergy();
    for (let i = 0; i < 3000; i++) {
      d.step((i % 5) / 5, ((i * 7) % 9) / 9);
      const s = d.snapshot();
      expect(Number.isFinite(s.expansionRate)).toBe(true);
      expect(s.expansionRate).toBeGreaterThanOrEqual(0);
      expect(s.expansionRate).toBeLessThanOrEqual(1);
      expect(s.lambda).toBeGreaterThanOrEqual(0);
      expect(s.lambda).toBeLessThanOrEqual(1);
    }
  });

  test('w stays in its physical band [-1, -1/3] even with the live ∂w/∂φ AD nudge', () => {
    // Regression for the equation-of-state sign fix: the eos MODEL is now `-1 + ratio` (φ-dependent in
    // the operating band) instead of the former `-1 - ratio` that clamped to a constant −1 and made the
    // central-difference gradient identically 0. With the gradient live, `this.w += adGrad*0.005` is a
    // real nudge, so w must be re-clamped to keep its documented range — this drives φ hard (high energy)
    // for many steps and asserts the band holds every step. A revert that drops the re-clamp regresses it.
    const d = new DarkEnergy();
    for (let i = 0; i < 2000; i++) {
      d.step(0.85 + 0.15 * Math.sin(i * 0.3), 0.05); // energetic + sparse → φ grows, ratio unsaturates
      const w = d.snapshot().w;
      expect(w).toBeGreaterThanOrEqual(-1);
      expect(w).toBeLessThanOrEqual(-1 / 3);
      expect(Number.isFinite(w)).toBe(true);
    }
  });

  test('the matter/energy densities are load-bearing (a sparse energetic universe expands faster)', () => {
    // The World coupling reads expansion, gated on acceleration; that is only meaningful if the densities
    // actually drive it. A sparse+energetic universe must expand faster than a crowded matter-dominated one.
    const sparse = new DarkEnergy();
    const crowded = new DarkEnergy();
    for (let i = 0; i < 400; i++) {
      sparse.step(0.9, 0.1); // high energy, low matter → accelerating
      crowded.step(0.2, 0.9); // low energy, high matter → contracting
    }
    expect(sparse.expansion).toBeGreaterThan(crowded.expansion);
  });
});
