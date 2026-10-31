import { describe, expect, test } from 'bun:test';
import { XENO_TRUST_MIN_BEATS, XenomindTrustGate } from '../src/sim/xenomind-gate';

describe('Xenomind trust gate — no noise into brains until trained', () => {
  test('untrained (fresh) gate applies exactly zero nudge', () => {
    const g = new XenomindTrustGate();
    expect(g.trust()).toBe(0);
    expect(g.nudge(0.9, 0.8, 0.04)).toBe(0);
  });
  test('a random (uncorrelated) xenomind never earns trust', () => {
    const g = new XenomindTrustGate();
    let s = 1;
    const r = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 5000; i++) g.observe(r(), r());
    expect(g.trust()).toBe(0);
  });
  test('an agreeing xenomind earns trust only after the minimum beats, and only sharpens the brain', () => {
    const g = new XenomindTrustGate();
    for (let i = 0; i < XENO_TRUST_MIN_BEATS - 1; i++) g.observe(0.8, 0.7);
    expect(g.trust()).toBe(0);
    for (let i = 0; i < 400; i++) g.observe(0.8, 0.7);
    expect(g.trust()).toBeGreaterThan(0);
    expect(g.nudge(0.8, 0.7, 0.04)).toBeGreaterThan(0); // same lean: sharpen
    expect(g.nudge(0.2, 0.7, 0.04)).toBe(0); // contradicts the brain: never applied
    expect(g.nudge(0.2, 0.3, 0.04)).toBeLessThan(0);
    expect(Math.abs(g.nudge(1, 1, 0.04))).toBeLessThanOrEqual(0.02 + 1e-12);
  });
});
