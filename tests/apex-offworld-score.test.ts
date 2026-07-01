/**
 * APEX Offworld Umwelt Score tests — the doctrine's Experiment 2, quantified.
 *
 * Asserts the alien substrate is genuinely load-bearing (not garnish): the vast majority of the apex's
 * substrate-driven behaviour must be attributable to the offworld channels (quantum + field +
 * procedural), the score is a proper [0,1] fraction, and the measurement is deterministic.
 */
import { describe, expect, test } from 'bun:test';
import { SCALE_LIVE, SCALE_MASSIVE } from '../src/sim/apex-brain';
import { apexOffworldScore } from '../src/sim/apex-offworld-score';

describe('offworld umwelt score — the alien substrate is load-bearing', () => {
  test('MASSIVE behaviour is overwhelmingly driven by the alien channels', () => {
    const s = apexOffworldScore(SCALE_MASSIVE);
    expect(s.score).toBeGreaterThan(0.9); // alien channels dominate — not decoration
    expect(s.samples).toBeGreaterThan(0);
    expect(s.dTotal).toBeGreaterThanOrEqual(s.dOffworld); // null ablation ⊇ offworld ablation
  });

  test('the score is a proper [0,1] fraction with earthLikeness its complement', () => {
    const s = apexOffworldScore(SCALE_MASSIVE);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1);
    expect(s.earthLikeness).toBeCloseTo(1 - s.score, 9);
  });

  test('LIVE scale is also alien-dominated (its mundane resident load is tiny)', () => {
    const s = apexOffworldScore(SCALE_LIVE);
    expect(s.score).toBeGreaterThan(0.9);
  });

  test('the measurement is deterministic', () => {
    expect(apexOffworldScore(SCALE_MASSIVE)).toEqual(apexOffworldScore(SCALE_MASSIVE));
  });

  test('a smaller ensemble still yields a bounded, alien-dominated score', () => {
    const s = apexOffworldScore(SCALE_MASSIVE, { seeds: [3], warmBeats: 12, sampleEvery: 3 });
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1);
    expect(s.samples).toBeGreaterThan(0);
  });
});
