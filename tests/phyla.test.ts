/**
 * Tests for the phyla taxonomy layer (CONTRACTS V3.2, PANTHEON):
 *  - 10 phyla are deterministic from a seed and respect trait-range invariants.
 *  - Phylum-mode morphotypes inherit their phylum's bands (hue/geometry/behavior).
 *  - Outliers fire at ~1% over 10k draws and carry a blended second behavior.
 *  - The no-phyla path stays BIT-IDENTICAL to a frozen snapshot of the legacy
 *    generation logic (and is byte-stable across runs for a fixed seed).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { BEHAVIORS, MORPH_COUNT } from '../src/sim/constants';
import type { Behavior } from '../src/sim/constants';
import type { MorphType } from '../src/types';
import {
  MORPHS_PER_PHYLUM,
  OUTLIER_RATE,
  PHYLUM_COUNT,
  createMorphotypes,
  createPhyla,
  type Phylum,
  type PhylumMorphType,
} from '../src/sim/phyla';

const GEO_COUNT = 40;
const loreName = (i: number) => `Phylum${i}`;

/**
 * Frozen reference of the LEGACY morphotype build (legacy lines 281-289), used
 * as the bit-identity oracle. Mirrors the exact 15-draw order and field set.
 */
function legacyReference(rng: () => number, geoCount: number): MorphType[] {
  const out: MorphType[] = [];
  for (let i = 0; i < MORPH_COUNT; i++) {
    const h = rng();
    const bi = i % BEHAVIORS.length;
    const beh = BEHAVIORS[bi]!;
    out.push({
      id: i,
      gi: i % geoCount,
      col: new THREE.Color().setHSL(h, 0.4 + rng() * 0.6, 0.1 + rng() * 0.55),
      em: new THREE.Color().setHSL(rng(), 0.5 + rng() * 0.5, 0.15 + rng() * 0.4),
      emI: 0.1 + rng() * 0.9,
      met: 0.05 + rng() * 0.9,
      rou: 0.05 + rng() * 0.9,
      op: 0.25 + rng() * 0.75,
      beh,
      srMin: 0.1 + rng() * 0.2,
      srMax: 0.3 + rng() * 1.2,
      spd: 0.15 + rng() * 2.5,
      wf: 0.3 + rng() * 5,
      wa: 0.03 + rng() * 0.35,
    });
  }
  return out;
}

/** Serialize a morphotype to a comparable plain object (Color → [r,g,b]). */
function snap(m: MorphType): Record<string, unknown> {
  return {
    id: m.id,
    gi: m.gi,
    col: [m.col.r, m.col.g, m.col.b],
    em: [m.em.r, m.em.g, m.em.b],
    emI: m.emI,
    met: m.met,
    rou: m.rou,
    op: m.op,
    beh: m.beh,
    srMin: m.srMin,
    srMax: m.srMax,
    spd: m.spd,
    wf: m.wf,
    wa: m.wa,
  };
}

describe('createPhyla', () => {
  test('produces exactly PHYLUM_COUNT (10) phyla', () => {
    const phyla = createPhyla(mulberry32(1), loreName, GEO_COUNT);
    expect(phyla).toHaveLength(PHYLUM_COUNT);
    expect(PHYLUM_COUNT).toBe(10);
  });

  test('is deterministic from a seed (same seed ⇒ identical phyla)', () => {
    const a = createPhyla(mulberry32(0xc05a06), loreName, GEO_COUNT);
    const b = createPhyla(mulberry32(0xc05a06), loreName, GEO_COUNT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('different seeds diverge', () => {
    const a = createPhyla(mulberry32(1), loreName, GEO_COUNT);
    const b = createPhyla(mulberry32(2), loreName, GEO_COUNT);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  test('names come from the supplied loreName callback', () => {
    const phyla = createPhyla(mulberry32(7), (i) => `Tribe-${i}`, GEO_COUNT);
    phyla.forEach((p, i) => expect(p.name).toBe(`Tribe-${i}`));
  });

  test('trait ranges are respected for every phylum', () => {
    const phyla = createPhyla(mulberry32(123456), loreName, GEO_COUNT);
    phyla.forEach((p, i) => {
      // hueBand: ordered, inside [0,1].
      const [hlo, hhi] = p.hueBand;
      expect(hlo).toBeGreaterThanOrEqual(0);
      expect(hhi).toBeLessThanOrEqual(1);
      expect(hlo).toBeLessThanOrEqual(hhi);

      // geometryFamily: non-empty, all valid cache indices.
      expect(p.geometryFamily.length).toBeGreaterThan(0);
      for (const g of p.geometryFamily) {
        expect(Number.isInteger(g)).toBeTrue();
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThan(GEO_COUNT);
      }

      // behaviorPool: non-empty, all real behaviors.
      expect(p.behaviorPool.length).toBeGreaterThan(0);
      for (const b of p.behaviorPool) {
        expect(BEHAVIORS).toContain(b);
      }

      // sizeMul / speedMul: ordered, positive, finite.
      for (const [lo, hi] of [p.sizeMul, p.speedMul]) {
        expect(Number.isFinite(lo)).toBeTrue();
        expect(Number.isFinite(hi)).toBeTrue();
        expect(lo).toBeGreaterThan(0);
        expect(lo).toBeLessThanOrEqual(hi);
      }

      // homeSector is the phylum index — distinct per phylum.
      expect(p.homeSector).toBe(i);
    });
  });
});

describe('createMorphotypes — backward compatibility (no phyla)', () => {
  test('returns exactly MORPH_COUNT (100) morphotypes', () => {
    const morphs = createMorphotypes(mulberry32(42), GEO_COUNT);
    expect(morphs).toHaveLength(MORPH_COUNT);
  });

  test('is BIT-IDENTICAL to the frozen legacy reference for the same seed', () => {
    const SEEDS = [0, 1, 42, 0xc05a06, 0xdecafbad, 2026];
    for (const seed of SEEDS) {
      const actual = createMorphotypes(mulberry32(seed), GEO_COUNT).map(snap);
      const expected = legacyReference(mulberry32(seed), GEO_COUNT).map(snap);
      expect(actual).toEqual(expected);
    }
  });

  test('legacy path carries NO phylum/beh2 keys (parity with MorphType shape)', () => {
    const morphs = createMorphotypes(mulberry32(99), GEO_COUNT) as PhylumMorphType[];
    for (const m of morphs) {
      expect('phylum' in m).toBeFalse();
      expect('beh2' in m).toBeFalse();
    }
  });

  test('empty phyla array behaves as the legacy path', () => {
    const withEmpty = createMorphotypes(mulberry32(7), GEO_COUNT, []).map(snap);
    const legacy = createMorphotypes(mulberry32(7), GEO_COUNT).map(snap);
    expect(withEmpty).toEqual(legacy);
  });

  test('determinism: same seed ⇒ identical population', () => {
    const a = createMorphotypes(mulberry32(555), GEO_COUNT).map(snap);
    const b = createMorphotypes(mulberry32(555), GEO_COUNT).map(snap);
    expect(a).toEqual(b);
  });
});

describe('createMorphotypes — phylum mode', () => {
  function build(seed: number): { phyla: Phylum[]; morphs: PhylumMorphType[] } {
    const rng = mulberry32(seed);
    const phyla = createPhyla(rng, loreName, GEO_COUNT);
    // Same rng stream continues into morphotype generation (as world will wire).
    const morphs = createMorphotypes(rng, GEO_COUNT, phyla);
    return { phyla, morphs };
  }

  test('count is 25 × phyla.length', () => {
    const { phyla, morphs } = build(2024);
    expect(morphs).toHaveLength(MORPHS_PER_PHYLUM * phyla.length);
    expect(morphs).toHaveLength(250);
  });

  test('is deterministic from a seed', () => {
    const a = build(2024).morphs.map(snap);
    const b = build(2024).morphs.map(snap);
    expect(a).toEqual(b);
  });

  test('every morphotype is tagged with a valid phylum index, blocks contiguous', () => {
    const { morphs } = build(31337);
    morphs.forEach((m, idx) => {
      expect(m.id).toBe(idx);
      const expectedPhylum = Math.floor(idx / MORPHS_PER_PHYLUM);
      expect(m.phylum).toBe(expectedPhylum);
    });
  });

  test('non-outlier members respect their phylum hue band, geometry & behavior', () => {
    const { phyla, morphs } = build(8675309);
    for (const m of morphs) {
      if (m.beh2 !== undefined) continue; // outlier — exempt from band checks
      const p = phyla[m.phylum!]!;
      // Geometry from the family.
      expect(p.geometryFamily).toContain(m.gi);
      // Behavior from the pool.
      expect(p.behaviorPool).toContain(m.beh);
      // Hue inside the band (HSL round-trips, tolerance for float).
      const hsl = { h: 0, s: 0, l: 0 };
      m.col.getHSL(hsl);
      // setHSL stores hue verbatim; recovering it via getHSL is exact enough.
      expect(hsl.h).toBeGreaterThanOrEqual(p.hueBand[0] - 1e-6);
      expect(hsl.h).toBeLessThanOrEqual(p.hueBand[1] + 1e-6);
    }
  });

  test('all parameters are finite (NaN-safety holds even for outliers)', () => {
    const { morphs } = build(13);
    for (const m of morphs) {
      for (const v of [m.emI, m.met, m.rou, m.op, m.srMin, m.srMax, m.spd, m.wf, m.wa]) {
        expect(Number.isFinite(v)).toBeTrue();
      }
      expect(m.srMin).toBeLessThanOrEqual(m.srMax);
      expect(m.spd).toBeGreaterThan(0);
    }
  });

  test('outliers carry a second behavior from the full behavior set', () => {
    const { morphs } = build(424242);
    for (const m of morphs) {
      if (m.beh2 === undefined) continue;
      expect(BEHAVIORS).toContain(m.beh2 as Behavior);
    }
  });
});

describe('outlier rate ≈ 1% over a large sample', () => {
  test('~1% of phylum-mode morphotypes are outliers across 10k draws', () => {
    // Build enough phyla-mode populations to total ≥ 10k morphotypes, each from
    // a distinct seed, and tally outliers (those carrying a blended beh2).
    let total = 0;
    let outliers = 0;
    let seed = 1;
    while (total < 10000) {
      const rng = mulberry32(seed++);
      const phyla = createPhyla(rng, loreName, GEO_COUNT);
      const morphs = createMorphotypes(rng, GEO_COUNT, phyla);
      for (const m of morphs) {
        total++;
        if (m.beh2 !== undefined) outliers++;
      }
    }
    const rate = outliers / total;
    // Binomial around p=0.01 over ≥10k draws: allow a generous tolerance band.
    expect(rate).toBeGreaterThan(OUTLIER_RATE * 0.4);
    expect(rate).toBeLessThan(OUTLIER_RATE * 2.2);
  });
});
