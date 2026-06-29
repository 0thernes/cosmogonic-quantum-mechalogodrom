/**
 * BRUTAL GOD RELEASES — deterministic, headless tests for the NHSI Brutalism Pantheon.
 *
 * Covers the three pure entry points (triggerBrutalRelease / applyBrutalRelease / getBrutalLore): the
 * activation gate, the archetype→substrate→effect mapping for every power family, the per-effect petri
 * vitality side-effects, seeded determinism, and bounded outputs. No rng/clock/DOM — every result is a
 * deterministic function of (state, seed). NOT a sentience claim — functional god-tier mechanisms only.
 */
import { describe, expect, test } from 'bun:test';
import {
  BRUTAL_ARCHETYPES,
  triggerBrutalRelease,
  applyBrutalRelease,
  getBrutalLore,
  type BrutalRelease,
} from '../src/sim/brutal-god-releases';
import { mulberry32 } from '../src/math/rng';

const SEED = 0xb4a7a1;
/** Maximal cosmic state — base = 0.4+0.3+0.2+0.1 = 1.0, well over the 0.65 ignition gate. */
const MAX = { chaos: 1, spin: 1, qgt: 1, ignition: 1 };

function ents(n: number, vitality = 1): { vitality: number; form: string }[] {
  return Array.from({ length: n }, () => ({ vitality, form: 'soup' }));
}

describe('brutal god releases — trigger gate + archetype mapping', () => {
  test('a placid cosmos (base < 0.65) does NOT ignite a release', () => {
    expect(triggerBrutalRelease(0, 0.1, 0.1, 0.1, 0.1, mulberry32(SEED), 1)).toBeNull();
  });

  test('a maximal cosmos ignites a bounded release', () => {
    const r = triggerBrutalRelease(
      0,
      MAX.chaos,
      MAX.spin,
      MAX.qgt,
      MAX.ignition,
      mulberry32(SEED),
      7,
    );
    expect(r).not.toBeNull();
    const rel = r!;
    expect(BRUTAL_ARCHETYPES).toContain(rel.archetype);
    expect(rel.power).toBeGreaterThanOrEqual(0.7);
    expect(rel.power).toBeLessThanOrEqual(1.0);
    expect(rel.duration).toBe(Math.floor(30 + rel.power * 120));
    expect(rel.duration).toBeGreaterThanOrEqual(30);
    expect(typeof rel.substrate).toBe('string');
    expect(rel.effect.length).toBeGreaterThan(0);
  });

  test('godIdx wraps modulo the pantheon (negative and overflowing indices are valid)', () => {
    const n = BRUTAL_ARCHETYPES.length;
    const a = triggerBrutalRelease(-1, 1, 1, 1, 1, mulberry32(SEED), 1)!;
    const b = triggerBrutalRelease(n - 1, 1, 1, 1, 1, mulberry32(SEED), 1)!;
    const c = triggerBrutalRelease(2 * n + 3, 1, 1, 1, 1, mulberry32(SEED), 1)!;
    expect(a.archetype).toBe(b.archetype); // -1 ≡ n-1
    expect(c.archetype).toBe(BRUTAL_ARCHETYPES[3]!); // 2n+3 ≡ 3
  });

  test('each power family maps to its Tsotchke substrate + effect signature', () => {
    const trig = (godIdx: number) => triggerBrutalRelease(godIdx, 1, 1, 1, 1, mulberry32(SEED), 1)!;
    expect(trig(3).effect).toContain('rage'); // BROLY_LEGENDARY → spin/irrep buster
    expect(trig(5).effect).toContain('void'); // KNUL_VOIDKING → void consume
    expect(trig(9).effect).toContain('spiral'); // GURREN_SPIRAL → spiral drill
    expect(trig(2).effect).toContain('rebirth'); // DARK_PHOENIX → cosmic fire rebirth
    expect(trig(6).effect).toContain('shatter'); // SHUMA_GORATH → chaos lord
    expect(trig(15).effect).toContain('quantum'); // DR_MANHATTAN → quantum god
    expect(trig(0).effect).toContain('drain'); // VALKORION_ETERNAL → default emperor drain
  });

  test('deterministic: identical state + seed ⇒ identical release', () => {
    const a = triggerBrutalRelease(4, 0.9, 0.8, 0.7, 0.6, mulberry32(SEED), 12);
    const b = triggerBrutalRelease(4, 0.9, 0.8, 0.7, 0.6, mulberry32(SEED), 12);
    expect(a).toEqual(b);
  });

  test('the Thanos pinn-feed + Phoenix qge branches ignite and stay finite', () => {
    // base = 0.8·0.4 + 0.7·0.3 + 0.6·0.2 + 0.5·0.1 = 0.70, safely over the 0.65 gate.
    const thanos = triggerBrutalRelease(1, 0.8, 0.7, 0.6, 0.5, mulberry32(SEED), 3); // THANOS_SNAP
    const phoenix = triggerBrutalRelease(2, 0.8, 0.7, 0.6, 0.5, mulberry32(SEED), 3); // DARK_PHOENIX
    for (const r of [thanos, phoenix]) {
      expect(r).not.toBeNull();
      expect(r!.power).toBeLessThanOrEqual(1.0);
      expect(Number.isFinite(r!.power)).toBe(true);
    }
  });
});

describe('brutal god releases — apply side-effects on the petri', () => {
  const make = (effect: string, power = 0.9): BrutalRelease => ({
    archetype: 'VALKORION_ETERNAL',
    power,
    duration: 100,
    substrate: 'test',
    effect,
  });

  test('rage/buster culls a fraction and warps (BROLY/ASURA)', () => {
    const e = ents(30);
    const out = applyBrutalRelease(make('legendary-rage-planet-buster'), e, 0.5, 7);
    expect(out.consumed).toBeGreaterThanOrEqual(0);
    expect(out.warp).toBeCloseTo(0.9 * 0.4, 6);
    expect(out.note).toContain('VALKORION_ETERNAL');
  });

  test('phoenix/rebirth resurrects the near-dead (DARK PHOENIX/JEAN/EVA)', () => {
    const e = ents(10, 0.05); // all below the 0.15 rebirth threshold
    const out = applyBrutalRelease(make('cosmic-fire-rebirth-galaxy'), e, 0.5, 1);
    expect(out.reborn).toBe(10);
    for (const ent of e) expect(ent.vitality).toBeGreaterThan(1.0);
  });

  test('snap/drain halves the population to near-zero (VALKORION/THANOS/GRIFFITH)', () => {
    const e = ents(20, 1);
    const out = applyBrutalRelease(make('emperor-drain-possess-snap'), e, 0.5, 1);
    expect(out.consumed).toBe(10); // first half
    expect(e[0]!.vitality).toBeCloseTo(0.1, 6);
    expect(e[19]!.vitality).toBe(1); // second half untouched
  });

  test('void/consume drains every other body but never below 0.01 (KNULL/AZATHOTH/ANTI)', () => {
    const e = ents(12, 1);
    const out = applyBrutalRelease(make('void-consume-anti-matter-dream'), e, 0.5, 1);
    expect(out.consumed).toBeGreaterThan(0);
    for (const ent of e) expect(ent.vitality).toBeGreaterThanOrEqual(0.01);
  });

  test('spiral/drill transcends — boosts vitality, capped at 3.0 (GURREN/SIMON/TTGL)', () => {
    const e = ents(10, 2.9);
    const out = applyBrutalRelease(make('spiral-drill-transcend-limit-break', 1.0), e, 1.0, 5);
    for (const ent of e) expect(ent.vitality).toBeLessThanOrEqual(3.0);
    expect(out.reborn).toBeGreaterThanOrEqual(Math.floor(1.0 * 5));
  });

  test('deterministic + total: same release/seed ⇒ identical mutations and finite tallies', () => {
    const rel = make('void-consume-anti-matter-dream');
    const e1 = ents(15);
    const e2 = ents(15);
    const o1 = applyBrutalRelease(rel, e1, 0.3, 9);
    const o2 = applyBrutalRelease(rel, e2, 0.3, 9);
    expect(o1).toEqual(o2);
    expect(e1).toEqual(e2);
    for (const v of [o1.consumed, o1.reborn, o1.warp]) expect(Number.isFinite(v)).toBe(true);
  });

  test('an empty petri is a safe no-op', () => {
    const out = applyBrutalRelease(make('emperor-drain-possess-snap'), [], 0.5, 1);
    expect(out.consumed).toBe(0);
    expect(out.reborn).toBe(0);
  });
});

describe('brutal god releases — lore', () => {
  test('every one of the 20 archetypes has distinct, non-empty lore', () => {
    expect(BRUTAL_ARCHETYPES).toHaveLength(20);
    const seen = new Set<string>();
    for (const arch of BRUTAL_ARCHETYPES) {
      const lore = getBrutalLore(arch);
      expect(typeof lore).toBe('string');
      expect(lore.length).toBeGreaterThan(10);
      seen.add(lore);
    }
    expect(seen.size).toBe(BRUTAL_ARCHETYPES.length); // all distinct
  });
});
