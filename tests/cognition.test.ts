/**
 * Creature cognition kernel (V24) — the pure perception→drive map the Shoggoths reason with.
 * Pinned at the corners so "perceive + remember → flee / hunt" stays monotone + bounded.
 */
import { describe, expect, test } from 'bun:test';
import { creatureDrive } from '../src/sim/cognition';

describe('creatureDrive', () => {
  test('a threatened, broke, starving creature FLEES hard and barely hunts', () => {
    const d = creatureDrive({ threat: 1, prey: 0.5, satiation: 0, boldness: 0.4 });
    expect(d.flee).toBeGreaterThan(0.7);
    expect(d.hunt).toBeLessThan(0.5);
    expect(d.agitation).toBeGreaterThan(0.8);
  });

  test('a safe, prey-rich, hungry, BOLD creature HUNTS hard and does not flee', () => {
    const d = creatureDrive({ threat: 0, prey: 1, satiation: 0, boldness: 2.4 });
    expect(d.flee).toBe(0);
    expect(d.hunt).toBeGreaterThan(1);
  });

  test('wealth (boldness) + a full belly suppress the flee response under the same threat', () => {
    const timid = creatureDrive({ threat: 0.8, prey: 0.3, satiation: 0.1, boldness: 0.4 });
    const brave = creatureDrive({ threat: 0.8, prey: 0.3, satiation: 0.9, boldness: 2.6 });
    expect(brave.flee).toBeLessThan(timid.flee);
  });

  test('all drives stay in their bounds for extreme/garbage percepts', () => {
    for (const p of [
      { threat: 9, prey: -5, satiation: 2, boldness: 99 },
      { threat: -9, prey: 9, satiation: -9, boldness: -9 },
    ]) {
      const d = creatureDrive(p);
      expect(d.flee).toBeGreaterThanOrEqual(0);
      expect(d.flee).toBeLessThanOrEqual(1);
      expect(d.hunt).toBeGreaterThanOrEqual(0);
      expect(d.hunt).toBeLessThanOrEqual(2);
      expect(d.agitation).toBeGreaterThanOrEqual(0);
      expect(d.agitation).toBeLessThanOrEqual(1);
    }
  });
});
