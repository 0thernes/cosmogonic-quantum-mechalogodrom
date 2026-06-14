import { describe, test, expect } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  Economy,
  priceStep,
  clearVolume,
  gini,
  topKThreshold,
  vickreyOutcome,
  CURRENCIES,
  COMMODITIES,
} from '../src/sim/economy';

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

  test('transferWorth moves worth conservation-exactly (the bargain/ally primitive)', () => {
    const e = seedEconomy(7);
    const before1 = e.wealthOf(1)!.netWorth;
    const before5 = e.wealthOf(5)!.netWorth;
    const moved = e.transferWorth(1, 5, 50); // titan → drone
    expect(moved).toBeGreaterThan(0);
    const after1 = e.wealthOf(1)!.netWorth;
    const after5 = e.wealthOf(5)!.netWorth;
    expect(after1).toBeLessThan(before1); // payer poorer
    expect(after5).toBeGreaterThan(before5); // payee richer
    expect(before1 - after1).toBeCloseTo(moved, 6); // debit == request
    expect(after5 - before5).toBeCloseTo(moved, 6); // credit == debit
    expect(after1 + after5).toBeCloseTo(before1 + before5, 6); // aggregate net worth conserved
  });

  test('transferWorth clamps to liquidity (never mints) and no-ops on bad args', () => {
    const e = seedEconomy(7);
    const totalBefore = e.wealthOf(1)!.netWorth + e.wealthOf(5)!.netWorth;
    const m1 = e.transferWorth(5, 1, 1e9); // drone liquidates ALL its money to the titan
    expect(m1).toBeGreaterThan(0);
    expect(e.transferWorth(5, 1, 1e9)).toBe(0); // nothing left to liquidate
    // Conserved even at the limit (the drone keeps its commodities; only money moved).
    expect(e.wealthOf(1)!.netWorth + e.wealthOf(5)!.netWorth).toBeCloseTo(totalBefore, 6);
    expect(e.transferWorth(1, 1, 10)).toBe(0); // self-transfer
    expect(e.transferWorth(1, 999, 10)).toBe(0); // unknown payee
    expect(e.transferWorth(777, 1, 10)).toBe(0); // unknown payer
    expect(e.transferWorth(1, 5, -5)).toBe(0); // non-positive
    expect(e.transferWorth(1, 5, 0)).toBe(0);
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
    expect(s.cartelShare).toBe(0);
    expect(s.sanctioned).toBe(0);
    expect(s.blackVolume).toBe(0);
    expect(s.auctions).toBe(0);
    expect(s.lastAuctionCommodity).toBe(null);
  });
});

describe('economy — market mechanics (V20)', () => {
  test('topKThreshold returns the k-th largest, with sane edges', () => {
    expect(topKThreshold([5, 1, 9, 3, 7], 1)).toBe(9);
    expect(topKThreshold([5, 1, 9, 3, 7], 2)).toBe(7);
    expect(topKThreshold([5, 1, 9, 3, 7], 5)).toBe(-Infinity); // k >= n → everyone qualifies
    expect(topKThreshold([5, 1, 9], 0)).toBe(Infinity); // k <= 0 → no one
  });

  test('a cartel of the richest forms and holds a super-proportional wealth share', () => {
    const e = new Economy();
    const rng = mulberry32(11);
    // 12 agents of widely varied stature → the richest 5 are a clear oligopoly.
    for (let i = 0; i < 12; i++) e.register(i, `A${i}`, 0.5 + 9 * (i / 11), rng);
    for (let i = 0; i < 80; i++) e.tick(rng, 0.4);
    const s = e.summary();
    expect(s.cartelShare).toBeGreaterThanOrEqual(5 / 12); // ≥ their proportional share (they're richest)
    expect(s.cartelShare).toBeLessThan(1); // but not the whole market (n > CARTEL_SIZE)
    expect(s.arbSpread).toBeGreaterThanOrEqual(0);
    expect(s.arbSpread).toBeLessThanOrEqual(1);
  });

  test('sanctions are tracked and throttle the embargoed agent below an un-sanctioned peer', () => {
    const e = new Economy();
    const rng = mulberry32(21);
    for (let i = 0; i < 8; i++) e.register(i, `A${i}`, 3, rng); // identical stature
    e.sanction(0, true);
    e.sanction(1, true);
    e.sanction(2, true);
    expect(e.isSanctioned(0)).toBe(true);
    expect(e.isSanctioned(3)).toBe(false);
    for (let i = 0; i < 400; i++) e.tick(rng, 0.5);
    expect(e.summary().sanctioned).toBe(3);
    const meanSanctioned =
      (e.wealthOf(0)!.netWorth + e.wealthOf(1)!.netWorth + e.wealthOf(2)!.netWorth) / 3;
    const meanFree =
      (e.wealthOf(3)!.netWorth +
        e.wealthOf(4)!.netWorth +
        e.wealthOf(5)!.netWorth +
        e.wealthOf(6)!.netWorth +
        e.wealthOf(7)!.netWorth) /
      5;
    expect(meanSanctioned).toBeLessThan(meanFree); // the embargo starves them of gains-from-trade
  });

  test('a black market clears off-book ONLY for the sanctioned (zero otherwise)', () => {
    const e = new Economy();
    const rng = mulberry32(31);
    // Varied stature → heterogeneous holdings → two-sided off-book demand among the embargoed.
    for (let i = 0; i < 16; i++) e.register(i, `A${i}`, 0.5 + 7.5 * (i / 15), rng);
    for (let i = 0; i < 30; i++) e.tick(rng, 0.4);
    expect(e.summary().blackVolume).toBe(0); // no sanctions → no off-book market
    for (let i = 0; i < 16; i += 2) e.sanction(i, true); // sanction a varied half
    let sawBlack = false;
    for (let i = 0; i < 120; i++) {
      e.tick(rng, 0.4);
      if (e.summary().blackVolume > 0) sawBlack = true;
    }
    expect(sawBlack).toBe(true); // the embargoed evade via smugglers (two-sided off-book demand)
  });

  test('vickreyOutcome picks the highest bidder at the second price', () => {
    expect(vickreyOutcome([3, 9, 5, 7])).toEqual({ winner: 1, price: 7 }); // top=9@1, runner-up=7
    expect(vickreyOutcome([7, 5, 9, 3]).winner).toBe(2);
    expect(vickreyOutcome([5]).winner).toBe(0); // lone bidder pays its own bid
    expect(vickreyOutcome([]).winner).toBe(-1);
  });

  test('windfall auctions fire on cadence and settle a second-price clearing', () => {
    const e = new Economy();
    const rng = mulberry32(44);
    for (let i = 0; i < 6; i++) e.register(i, `A${i}`, 1 + i, rng);
    for (let i = 0; i < 100; i++) e.tick(rng, 0.4); // > AUCTION_PERIOD ⇒ several auctions
    const s = e.summary();
    expect(s.auctions).toBeGreaterThan(0);
    expect(s.lastAuctionPrice).toBeGreaterThan(0);
    expect(s.lastAuctionCommodity === 'QUANTA' || s.lastAuctionCommodity === 'ICHOR').toBe(true);
  });

  test('the cartel + arbitrage path stays deterministic and well-formed', () => {
    const mk = (): Economy => {
      const e = new Economy();
      const rng = mulberry32(321);
      for (let i = 0; i < 10; i++) e.register(i, `A${i}`, 0.5 + 8 * (i / 9), rng);
      const tr = mulberry32(654);
      for (let i = 0; i < 300; i++) e.tick(tr, (i % 40) / 40);
      return e;
    };
    expect(mk().summary()).toEqual(mk().summary()); // same seed → identical, mechanics included
  });
});
