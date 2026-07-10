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
