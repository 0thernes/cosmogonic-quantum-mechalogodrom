import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { OmegaPoint } from '../src/sim/omega-point';

describe('omega-point wiring (HUD first)', () => {
  test('Ω rises under high coherence and stays below 1', () => {
    const o = new OmegaPoint();
    for (let i = 0; i < 400; i++) o.update([0.9, 0.9, 0.9], [0.8, 0.6], 0.9, 0.9, 0.9, 0.9, -1);
    expect(o.score).toBeGreaterThan(0.3);
    expect(o.score).toBeLessThan(1);
    const low = new OmegaPoint();
    for (let i = 0; i < 400; i++) low.update([0.1, 0.1, 0.1], [0.05, 0], 0.1, 0.1, 0.1, 0.1, -0.4);
    expect(low.score).toBeLessThan(o.score);
  });
  test('World updates Ω on the apex beat and pushes it to the HUD', () => {
    const w = readFileSync('src/world.ts', 'utf8');
    expect(w).toContain('this.omegaPoint.update(');
    expect(w).toContain('this.hud.setOmega(this.omegaPoint.score, this.omegaPoint.converging)');
    expect(readFileSync('src/ui/hud.ts', 'utf8')).toMatch(
      /setOmega\(score: number, converging: boolean\)/,
    );
  });
});
