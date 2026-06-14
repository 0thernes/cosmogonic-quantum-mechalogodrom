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

  test('the weak DECEIVE under threat (feign weakness); the dominant do not bother', () => {
    const weak = creatureDrive({ threat: 1, prey: 0.2, satiation: 0.3, boldness: 0.4 });
    const dominant = creatureDrive({ threat: 1, prey: 0.2, satiation: 0.3, boldness: 2.6 });
    expect(weak.deceive).toBeGreaterThan(0.4);
    expect(dominant.deceive).toBeLessThan(weak.deceive);
    expect(creatureDrive({ threat: 0, prey: 0.5, satiation: 0.5, boldness: 0.4 }).deceive).toBe(0);
  });

  test('no partner sensed ⇒ trade and ally stay silent (legacy callers unchanged)', () => {
    const d = creatureDrive({ threat: 0.5, prey: 0.5, satiation: 0.5, boldness: 1 });
    expect(d.trade).toBe(0);
    expect(d.ally).toBe(0);
    // …and an explicit zero partner is identical to omitting it.
    const z = creatureDrive({
      threat: 0.5,
      prey: 0.5,
      satiation: 0.5,
      boldness: 1,
      partner: 0,
      peer: 1,
    });
    expect(z.trade).toBe(0);
    expect(z.ally).toBe(0);
  });

  test('you BARGAIN with the unlike in safety; boldness sharpens the deal', () => {
    // Safe, partner present, very different wealth (peer≈0) ⇒ trade fires; danger kills it.
    const safe = creatureDrive({
      threat: 0,
      prey: 0.2,
      satiation: 0.5,
      boldness: 1.4,
      partner: 1,
      peer: 0,
    });
    const inPeril = creatureDrive({
      threat: 1,
      prey: 0.2,
      satiation: 0.5,
      boldness: 1.4,
      partner: 1,
      peer: 0,
    });
    expect(safe.trade).toBeGreaterThan(0.4);
    expect(inPeril.trade).toBeLessThan(safe.trade);
    // A bolder bargainer drives a harder deal than a timid one, all else equal.
    const bold = creatureDrive({
      threat: 0,
      prey: 0.2,
      satiation: 0.5,
      boldness: 2.6,
      partner: 1,
      peer: 0,
    });
    const timid = creatureDrive({
      threat: 0,
      prey: 0.2,
      satiation: 0.5,
      boldness: 0.4,
      partner: 1,
      peer: 0,
    });
    expect(bold.trade).toBeGreaterThan(timid.trade);
  });

  test('you ALLY with a PEER under threat, not with the unlike', () => {
    const withPeer = creatureDrive({
      threat: 0.9,
      prey: 0.2,
      satiation: 0.5,
      boldness: 1,
      partner: 1,
      peer: 1,
    });
    const withStranger = creatureDrive({
      threat: 0.9,
      prey: 0.2,
      satiation: 0.5,
      boldness: 1,
      partner: 1,
      peer: 0,
    });
    expect(withPeer.ally).toBeGreaterThan(0.4);
    expect(withStranger.ally).toBeLessThan(withPeer.ally); // strangers get traded with, not allied
    // No threat ⇒ no coalition, even among peers.
    expect(
      creatureDrive({ threat: 0, prey: 0.2, satiation: 0.5, boldness: 1, partner: 1, peer: 1 })
        .ally,
    ).toBe(0);
  });

  test('all drives stay in their bounds for extreme/garbage percepts', () => {
    for (const p of [
      { threat: 9, prey: -5, satiation: 2, boldness: 99, partner: 9, peer: 9 },
      { threat: -9, prey: 9, satiation: -9, boldness: -9, partner: -9, peer: -9 },
    ]) {
      const d = creatureDrive(p);
      expect(d.flee).toBeGreaterThanOrEqual(0);
      expect(d.flee).toBeLessThanOrEqual(1);
      expect(d.hunt).toBeGreaterThanOrEqual(0);
      expect(d.hunt).toBeLessThanOrEqual(2);
      expect(d.agitation).toBeGreaterThanOrEqual(0);
      expect(d.agitation).toBeLessThanOrEqual(1);
      expect(d.deceive).toBeGreaterThanOrEqual(0);
      expect(d.deceive).toBeLessThanOrEqual(1);
      expect(d.trade).toBeGreaterThanOrEqual(0);
      expect(d.trade).toBeLessThanOrEqual(1);
      expect(d.ally).toBeGreaterThanOrEqual(0);
      expect(d.ally).toBeLessThanOrEqual(1);
    }
  });
});
