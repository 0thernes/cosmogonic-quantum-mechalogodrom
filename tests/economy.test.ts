import { describe, test, expect } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { Economy, priceStep, clearVolume, gini, CURRENCIES, COMMODITIES } from '../src/sim/economy';

describe('economy — pure helpers', () => {
  test('priceStep stays bounded and tracks the sign of excess demand', () => {
    expect(priceStep(1, 1, 0.06)).toBeGreaterThan(1); // positive excess → price up
    expect(priceStep(1, -1, 0.06)).toBeLessThan(1); // negative excess → price down
    // extreme excess can never escape the [0.05, 50] book
    let p = 1;
    for (let i = 0; i < 10000; i++) p = priceStep(p, 5, 0.5);
    expect(p).toBeLessThanOrEqual(50);
    let q = 1;
    for (let i = 0; i < 10000; i++) q = priceStep(q, -5, 0.5);
    expect(q).toBeGreaterThanOrEqual(0.05);
  });

  test('clearVolume matches the smaller side of the book', () => {
    const r = clearVolume([5, 3, -4, -2, 1]); // buys 9, sells 6
    expect(r.buy).toBeCloseTo(9, 9);
    expect(r.sell).toBeCloseTo(6, 9);
    expect(r.vol).toBeCloseTo(6, 9); // min(9, 6)
    expect(clearVolume([1, 2, 3]).vol).toBe(0); // all buys → nothing clears
    expect(clearVolume([]).vol).toBe(0);
  });

  test('gini is 0 for equality, →1 for concentration, and always in [0,1]', () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0, 6);
    expect(gini([0, 0, 0, 100])).toBeGreaterThan(0.7);
    expect(gini([])).toBe(0);
    expect(gini([0, 0, 0])).toBe(0);
    const g = gini([1, 2, 3, 4, 5, 100]);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(1);
  });
});

describe('economy — naming', () => {
  test('exactly two competing currencies and two commodities', () => {
    expect(CURRENCIES).toEqual(['AURUM', 'UMBRA']);
    expect(COMMODITIES).toEqual(['QUANTA', 'ICHOR']);
  });
});

function seedEconomy(seed: number): Economy {
  const e = new Economy();
  const rng = mulberry32(seed);
  // A spread of statures: titans heavy, drones light — purses scale with weight.
  e.register(1, 'AETHON the Titan', 9, rng);
  e.register(2, 'NYX the Titan', 8, rng);
  e.register(3, 'A Shoggoth', 3, rng);
  e.register(4, 'A Puppeteer', 2.5, rng);
  e.register(5, 'A Drone', 0.5, rng);
  return e;
}

describe('economy — Economy market', () => {
  test('purses scale with stature (weight)', () => {
    const e = seedEconomy(7);
    const titan = e.wealthOf(1)!;
    const drone = e.wealthOf(5)!;
    expect(titan.netWorth).toBeGreaterThan(drone.netWorth * 5);
  });

  test('register is idempotent per id; count + has track enrolment', () => {
    const e = new Economy();
    const rng = mulberry32(1);
    e.register(42, 'X', 1, rng);
    e.register(42, 'X-again', 1, rng); // ignored
    expect(e.count).toBe(1);
    expect(e.has(42)).toBe(true);
    expect(e.has(99)).toBe(false);
  });

  test('same seed → identical market history (determinism)', () => {
    const a = seedEconomy(123);
    const b = seedEconomy(123);
    const ra = mulberry32(999);
    const rb = mulberry32(999);
    for (let i = 0; i < 200; i++) {
      a.tick(ra, (i % 50) / 50);
      b.tick(rb, (i % 50) / 50);
    }
    expect(a.summary()).toEqual(b.summary());
  });

  test('prices, fx, shares and gini stay well-formed across a long run', () => {
    const e = seedEconomy(55);
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) e.tick(rng, 0.3 + 0.5 * Math.sin(i * 0.1) ** 2);
    const s = e.summary();
    expect(Number.isFinite(s.pQuanta)).toBe(true);
    expect(s.pQuanta).toBeGreaterThanOrEqual(0.05);
    expect(s.pQuanta).toBeLessThanOrEqual(50);
    expect(s.pIchor).toBeGreaterThanOrEqual(0.05);
    expect(s.fx).toBeGreaterThanOrEqual(0.1);
    expect(s.fx).toBeLessThanOrEqual(10);
    expect(s.aurumShare).toBeGreaterThanOrEqual(0);
    expect(s.aurumShare).toBeLessThanOrEqual(1);
    expect(s.gini).toBeGreaterThanOrEqual(0);
    expect(s.gini).toBeLessThanOrEqual(1);
    expect(s.dominant).toBe(s.aurumShare >= 0.5 ? 'AURUM' : 'UMBRA');
    expect(s.agents).toBe(5);
  });

  test('an empty market ticks safely and reports neutral aggregates', () => {
    const e = new Economy();
    const rng = mulberry32(3);
    e.tick(rng, 0.5); // no agents → no-op
    const s = e.summary();
    expect(s.agents).toBe(0);
    expect(s.gini).toBe(0);
    expect(s.totalWealth).toBe(0);
  });
});
