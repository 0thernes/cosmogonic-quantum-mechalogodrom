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
});
