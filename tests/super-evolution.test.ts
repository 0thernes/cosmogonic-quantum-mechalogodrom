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
    e.gainXp(1e20); // pour in XP → climbs to the LV100 cap → fully ascends (the curve is steep by design)
    expect(e.level).toBe(100); // V63: hard cap
    expect(e.stage).toBe(EVO_STAGES.length - 1); // LEGENDARY (now the LV100 summit)
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

  test('fromJSON rejects non-finite numbers — +Infinity cannot poison the meta state (audit 2026-06-15)', () => {
    // JSON has no Infinity literal, but `1e999` parses to Infinity — a corrupt/tampered localStorage
    // blob. Pre-fix, `Infinity >= 0` slipped past the guard and poisoned xp/day; the Number.isFinite
    // guard now rejects it while still restoring the finite fields.
    const evil = SuperEvolution.fromJSON('{"level":5,"xp":1e999,"day":1e999}');
    expect(Number.isFinite(evil.xp)).toBe(true);
    expect(Number.isFinite(evil.day)).toBe(true);
    expect(evil.level).toBe(5); // finite fields still restore normally
  });

  test('tick accrues XP for a dominant, dreaming apex', () => {
    const e = new SuperEvolution();
    e.tick(2, 1); // 2s at full vitality
    expect(e.xp + (e.level - 1) * 60).toBeGreaterThan(0);
  });

  // ── V63: the 1–100 leveling spec ──────────────────────────────────────────────
  test('the level is hard-capped at 100 (no overflow past the summit)', () => {
    const e = new SuperEvolution();
    expect(e.ascended).toBe(false);
    e.gainXp(1e30);
    expect(e.level).toBe(100);
    expect(e.ascended).toBe(true);
    e.gainXp(1e30); // already at the cap → no-op, no runaway
    expect(e.level).toBe(100);
    expect(e.view().maxLevel).toBe(100);
  });

  test('one godlike power is granted every 10 levels (10 at the summit)', () => {
    const e = new SuperEvolution();
    expect(e.powers().length).toBe(0); // L1
    e.level = 30;
    expect(e.powers().length).toBe(3); // L30 → 3 powers
    e.level = 100;
    expect(e.powers().length).toBe(10); // the full pantheon
    expect(new Set(e.powers()).size).toBe(10); // all distinct
  });

  test('crossing a 10-level milestone arms exactly one pending reaction, drained once', () => {
    const e = new SuperEvolution();
    e.gainXp(1e20); // straight to the cap in one shot
    expect(e.takeMilestone()).toBe(100); // the apex milestone is pending
    expect(e.takeMilestone()).toBe(0); // drained — fires only once
  });

  test('a fresh 10-level crossing fires its own milestone (LV10 → 10)', () => {
    const e = new SuperEvolution();
    // climb to ~L10 via a few hefty grants; the top milestone crossed should surface.
    while (e.level < 10) e.gainXp(e.xpForNext());
    expect(e.level).toBe(10);
    expect(e.takeMilestone()).toBe(10);
  });

  test('restoring an already-capped creature never re-fires the ascension milestone', () => {
    const a = new SuperEvolution();
    a.gainXp(1e20);
    a.takeMilestone(); // drain the live ascension
    const restored = SuperEvolution.fromJSON(a.serialize());
    expect(restored.level).toBe(100);
    expect(restored.ascended).toBe(true);
    expect(restored.takeMilestone()).toBe(0); // restore is silent — temple just IS
  });

  test('appearance hits the full ascension aura at the summit', () => {
    const e = new SuperEvolution();
    e.level = 100;
    e.stage = 4;
    const a = e.appearance();
    expect(a.ascended).toBe(true);
    expect(a.aura).toBe(1);
    expect(a.tier).toBe(10);
    expect(a.sizeMul).toBeGreaterThan(new SuperEvolution().appearance().sizeMul);
  });
});
