/**
 * SUPER-CREATURE EVOLUTION (V48) — the Vegeta/Goku self-evolving power + appearance arc. Pins the
 * exponential power curve, leveling, the 5 ascension stages, appearance growth, the daemon-cron
 * applyDays surge (deterministic), the evolutionary history, and cross-session persistence.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperEvolution, EVO_STAGES } from '../src/sim/super-evolution';

describe('SuperEvolution (V48)', () => {
  test('power grows exponentially with level (it gets "over 9000")', () => {
    const e = new SuperEvolution();
    expect(e.power()).toBe(100); // BASE, level 1
    const p1 = e.power();
    e.level = 10;
    const p10 = e.power();
    e.level = 50;
    e.stage = 3; // ULTRA
    const p50 = e.power();
    expect(p10).toBeGreaterThan(p1 * 4); // exponential, not linear
    expect(p50).toBeGreaterThan(9000); // it's over 9000
  });

  test('XP levels the creature up', () => {
    const e = new SuperEvolution();
    expect(e.level).toBe(1);
    e.gainXp(60); // exactly one level at L1
    expect(e.level).toBe(2);
  });

  test('it ASCENDS through the 5 stages at the level thresholds (with a power leap)', () => {
    const e = new SuperEvolution();
    expect(e.stageName()).toBe('BASE');
    const basePower = e.power();
    e.gainXp(1e20); // pour in XP → climbs past level 120 → fully ascends (the curve is steep by design)
    expect(e.level).toBeGreaterThan(120);
    expect(e.stage).toBe(EVO_STAGES.length - 1); // LEGENDARY
    expect(e.stageName()).toBe('LEGENDARY');
    expect(e.power()).toBeGreaterThan(basePower * 1000);
    expect(e.mutations).toBeGreaterThanOrEqual(4); // one mutation per ascension
  });

  test('appearance grows + shifts as it evolves', () => {
    const young = new SuperEvolution().appearance();
    const old = new SuperEvolution();
    old.level = 80;
    old.stage = 3;
    const grown = old.appearance();
    expect(grown.sizeMul).toBeGreaterThan(young.sizeMul); // bigger
    expect(grown.glowMul).toBeGreaterThan(young.glowMul); // brighter
    expect(grown.spikeBoost).toBeGreaterThan(young.spikeBoost); // more spikes
  });

  test('the daemon-cron applyDays surges power per elapsed day + logs the tale (deterministic)', () => {
    const a = new SuperEvolution();
    const b = new SuperEvolution();
    a.applyDays(7, mulberry32(99));
    b.applyDays(7, mulberry32(99));
    expect(a.day).toBe(7);
    expect(a.level).toBeGreaterThan(1); // it trained
    expect(a.history().length).toBeGreaterThan(7); // born + 7 day entries
    // deterministic for the same seed
    expect(a.serialize()).toBe(b.serialize());
    expect(a.view().power).toBe(b.view().power);
  });

  test('applyDays caps the catch-up (no runaway on a huge gap)', () => {
    const e = new SuperEvolution();
    e.applyDays(1e6, mulberry32(1)); // someone left for "a million days"
    expect(e.day).toBeLessThanOrEqual(3650); // capped at a decade
  });

  test('serialize → fromJSON round-trips the evolution state', () => {
    const e = new SuperEvolution();
    e.applyDays(20, mulberry32(5));
    const restored = SuperEvolution.fromJSON(e.serialize());
    expect(restored.level).toBe(e.level);
    expect(restored.stage).toBe(e.stage);
    expect(restored.day).toBe(e.day);
    expect(restored.power()).toBe(e.power());
    // malformed input is tolerated → a fresh BASE creature
    const fresh = SuperEvolution.fromJSON('{not json');
    expect(fresh.level).toBe(1);
  });

  test('tick accrues XP for a dominant, dreaming apex', () => {
    const e = new SuperEvolution();
    e.tick(2, 1); // 2s at full vitality
    expect(e.xp + (e.level - 1) * 60).toBeGreaterThan(0);
  });
});
