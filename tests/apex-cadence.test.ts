import { describe, expect, test } from 'bun:test';
import { apexFullThinksPerFrame, apexThinkMode } from '../src/sim/apex-cadence';

describe('apex cadence (GOAL5 frame budget)', () => {
  test('exactly one full think per frame across 5 archons', () => {
    for (let frame = 0; frame < 50; frame++) {
      let fulls = 0;
      for (let i = 0; i < 5; i++) {
        if (apexThinkMode(frame, i, 5) === 'full') fulls++;
      }
      expect(fulls).toBe(1);
      expect(apexFullThinksPerFrame(5)).toBe(1);
    }
  });

  test('round-robins so every archon gets a full beat every 5 frames', () => {
    for (let i = 0; i < 5; i++) {
      const fulls = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((f) => apexThinkMode(f, i, 5))
        .filter((m) => m === 'full').length;
      expect(fulls).toBe(2); // frames i and i+5
    }
  });

  test('is pure and handles negative/zero count safely', () => {
    expect(apexThinkMode(-3, 0, 5)).toBe('full'); // floor via >=0 clamp on frame path uses 0
    expect(apexThinkMode(0, 0, 0)).toBe('full');
    expect(apexFullThinksPerFrame(0)).toBe(0);
  });
});
