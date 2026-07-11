/**
 * PANTHEON BREEDING tests — the honesty bar for the 101-creature mating ritual and the freak-genome
 * it begets. These do NOT just check shapes; they verify the REAL mathematics:
 *   • the lineage is 50 sisters + 50 brothers + the apex ς (U+03C2),
 *   • the Touchard/Bell umbral spectrum equals the known Stirling-2 row (Bell(4)=15),
 *   • the homotopy winding number is an exact integer the loop actually realises,
 *   • the Gauss linking number is integer-valued,
 *   • the Blaschke product is a genuine inner function (|B|=1 on the unit circle),
 *   • the de Jong attractor is bounded and its Benettin Lyapunov exponent is finite (some chaotic),
 *   • the ritual's replicator equilibrium and all derived scores are well-formed,
 *   • everything is bit-for-bit deterministic.
 */
import { describe, expect, test } from 'bun:test';
import {
  LINEAGE,
  PANTHEON_TOTAL,
  SISTER_COUNT,
  BROTHER_COUNT,
  APEX_CODEPOINT,
  APEX_TRANSCEND_LEVEL,
  lineageAt,
  isApex,
  apexTranscendence,
  breed,
  breedAt,
  randomBreeding,
  babyAttractorPath,
  babyLoopPath,
  babyBlaschkeImage,
  babyUmbralCoeffs,
  type BabyGenome,
} from '../src/sim/pantheon-breeding';
import { mulberry32 } from '../src/math/rng';

/** Re-measure a planar loop's winding number about the origin (independent of the module's copy). */
function measureWinding(pts: Float64Array): number {
  const n = pts.length / 2;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = pts[2 * i]!;
    const ay = pts[2 * i + 1]!;
    const bx = pts[2 * j]!;
    const by = pts[2 * j + 1]!;
    total += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  }
  return Math.round(total / (2 * Math.PI)) + 0; // normalise −0 → +0
}

describe('lineage — 50 sisters · 50 brothers · 1 apex (ς)', () => {
  test('roster is exactly 101', () => {
    expect(LINEAGE.length).toBe(PANTHEON_TOTAL);
    expect(PANTHEON_TOTAL).toBe(101);
    expect(SISTER_COUNT + BROTHER_COUNT + 1).toBe(101);
  });

  test('50 uppercase sisters + 50 lowercase brothers + the apex', () => {
    const sisters = LINEAGE.filter((g) => g.kin === 'sister');
    const brothers = LINEAGE.filter((g) => g.kin === 'brother');
    const apex = LINEAGE.filter((g) => g.kin === 'apex');
    expect(sisters.length).toBe(50);
    expect(brothers.length).toBe(50);
    expect(apex.length).toBe(1);
    // Latin sisters are uppercase letters; Latin brothers are lowercase.
    for (const g of sisters) if (g.script === 'latin') expect(g.glyph).toBe(g.glyph.toUpperCase());
    for (const g of brothers) if (g.script === 'latin') expect(g.glyph).toBe(g.glyph.toLowerCase());
  });

  test('the apex is the final-sigma ς (U+03C2), index 100, last', () => {
    const apex = LINEAGE[100]!;
    expect(apex.kin).toBe('apex');
    expect(apex.codepoint).toBe(APEX_CODEPOINT);
    expect(apex.codepoint).toBe(0x3c2);
    expect(apex.glyph).toBe('ς');
    expect(isApex(apex)).toBe(true);
    expect(isApex(LINEAGE[0]!)).toBe(false);
  });

  test('the brother sigma is the ordinary σ (U+03C3), distinct from the apex ς', () => {
    const sigmaBrother = LINEAGE.find((g) => g.kin === 'brother' && g.name === 'sigma');
    expect(sigmaBrother).toBeDefined();
    expect(sigmaBrother!.codepoint).toBe(0x3c3);
    expect(sigmaBrother!.codepoint).not.toBe(APEX_CODEPOINT);
  });

  test('every glyph is unique', () => {
    expect(new Set(LINEAGE.map((g) => g.glyph)).size).toBe(101);
    expect(new Set(LINEAGE.map((g) => g.seed)).size).toBe(101);
  });

  test('lineageAt wraps any integer', () => {
    expect(lineageAt(0).index).toBe(0);
    expect(lineageAt(101).index).toBe(0);
    expect(lineageAt(-1).index).toBe(100);
  });
});

describe('apex transcendence roadmap (honest target tracking)', () => {
  test('staged simulation crosses 1 → 2 → 3 across the level-1000 threshold', () => {
    expect(apexTranscendence(0).simulation).toBe(1);
    expect(apexTranscendence(0).transcended).toBe(false);
    expect(apexTranscendence(APEX_TRANSCEND_LEVEL / 2).simulation).toBe(2);
    const t = apexTranscendence(APEX_TRANSCEND_LEVEL);
    expect(t.simulation).toBe(3);
    expect(t.transcended).toBe(true);
    expect(t.progress).toBe(1);
    expect(apexTranscendence(5000).simulation).toBe(3);
  });

  test('progress is clamped to [0,1] and NaN-safe', () => {
    expect(apexTranscendence(-100).progress).toBe(0);
    expect(apexTranscendence(Number.NaN).level).toBe(0);
  });
});

describe('the ritual — evolutionary game theory', () => {
  test('equilibrium cooperate-fraction and entropy are well-formed', () => {
    for (let n = 0; n < 40; n++) {
      const baby = breedAt(n, (n * 7 + 3) % 101, n);
      expect(baby.ritual.cooperate).toBeGreaterThanOrEqual(0);
      expect(baby.ritual.cooperate).toBeLessThanOrEqual(1);
      expect(baby.ritual.entropy).toBeGreaterThanOrEqual(0);
      expect(baby.ritual.entropy).toBeLessThanOrEqual(1);
      expect(baby.ritual.inbreeding).toBeGreaterThanOrEqual(0);
      expect(baby.ritual.inbreeding).toBeLessThanOrEqual(1);
    }
  });

  test('a self-rite is asexual with full inbreeding F=1', () => {
    const self = breedAt(12, 12, 0);
    expect(self.ritual.asexual).toBe(true);
    expect(self.ritual.inbreeding).toBe(1);
  });

  test('a cross-kin cross-script pairing is a full hybrid (F=0)', () => {
    // greek sister (idx 0) × latin brother (idx 74): different kin AND script, neither apex.
    const a = lineageAt(0);
    const b = lineageAt(74);
    expect(a.kin).not.toBe(b.kin);
    expect(a.script).not.toBe(b.script);
    expect(breed(a, b, 0).ritual.inbreeding).toBe(0);
  });
});

describe('umbral — Touchard/Bell over exact Stirling-2 numbers', () => {
  test('Bell(4) = 15 with the canonical S(4,k) row', () => {
    // ordinals 0 + 1 ⇒ degree 3 + (1 % 5) = 4.
    const baby = breedAt(0, 1, 0);
    expect(baby.umbral.degree).toBe(4);
    expect(babyUmbralCoeffs(baby)).toEqual([0, 1, 7, 6, 1]); // S(4,0..4)
    expect(baby.umbral.bell).toBe(15); // Bell(4)
  });

  test('bell number always equals the coefficient sum, degree in 3..7', () => {
    for (let n = 0; n < 50; n++) {
      const baby = breedAt(n, n + 5, n);
      const sum = babyUmbralCoeffs(baby).reduce((s, c) => s + c, 0);
      expect(baby.umbral.bell).toBe(sum);
      expect(baby.umbral.degree).toBeGreaterThanOrEqual(3);
      expect(baby.umbral.degree).toBeLessThanOrEqual(7);
      expect(Number.isFinite(baby.umbral.evaluation)).toBe(true);
    }
  });
});

describe('homotopy — exact integer winding + integer linking', () => {
  test('the loop realises its declared winding number (π₁ invariant)', () => {
    for (let n = 0; n < 40; n++) {
      const baby = breedAt(n, (n * 13 + 1) % 101, n);
      const loop = babyLoopPath(baby, 512);
      expect(measureWinding(loop)).toBe(baby.homotopy.winding);
      expect(Number.isInteger(baby.homotopy.winding)).toBe(true);
    }
  });

  test('the Gauss linking number is integer-valued and finite', () => {
    for (let n = 0; n < 40; n++) {
      const baby = breedAt(n, (n * 5 + 2) % 101, n);
      expect(Number.isInteger(baby.homotopy.linking)).toBe(true);
      expect(Number.isFinite(baby.homotopy.linkingRaw)).toBe(true);
    }
  });

  test('linking genuinely DISCRIMINATES (both linked ±1 and unlinked 0 occur) — not a dead constant', () => {
    // parentLoop3D once put off∈[0.7,1.1) so exactly one of B's crossings always sat inside A's disk ⇒
    // linking was ALWAYS ±1 and the rarity linking term was a fixed +0.14 for every child. The widened
    // off range must now yield BOTH unlinked (0) and linked (±1) pairs across the roster.
    const seen = new Set<number>();
    for (let i = 0; i < 101; i++) {
      for (let j = 0; j < 101; j++) {
        seen.add(breedAt(i, j, 0).homotopy.linking);
        if (seen.has(0) && [...seen].some((v) => v !== 0)) break;
      }
    }
    expect(seen.has(0)).toBe(true); // unlinked pairs exist (the dead-constant bug is gone)
    expect([...seen].some((v) => v !== 0)).toBe(true); // linked pairs still exist
  });
});

describe('blasean — finite Blaschke product is a genuine inner function', () => {
  test('zeros lie in the open unit disk; degree in 1..5', () => {
    for (let n = 0; n < 40; n++) {
      const baby = breedAt(n, (n * 9 + 4) % 101, n);
      expect(baby.blaschke.degree).toBeGreaterThanOrEqual(1);
      expect(baby.blaschke.degree).toBeLessThanOrEqual(5);
      expect(baby.blaschke.zeros.length).toBe(baby.blaschke.degree);
      for (const z of baby.blaschke.zeros) expect(Math.hypot(z.re, z.im)).toBeLessThan(1);
    }
  });

  test('|B(z)| = 1 on the unit circle (the inner-function theorem), numerically', () => {
    for (let n = 0; n < 40; n++) {
      const baby = breedAt(n, (n * 11 + 6) % 101, n);
      expect(baby.blaschke.boundaryError).toBeLessThan(1e-6);
      const img = babyBlaschkeImage(baby, 128);
      for (let i = 0; i < img.length; i += 2) {
        expect(Math.hypot(img[i]!, img[i + 1]!)).toBeCloseTo(1, 5);
      }
    }
  });
});

describe('chaos — de Jong attractor + Benettin Lyapunov', () => {
  test('the attractor is bounded in [−2,2]² and the orbit is finite', () => {
    for (let n = 0; n < 25; n++) {
      const baby = breedAt(n, (n * 3 + 8) % 101, n);
      const path = babyAttractorPath(baby, 1500);
      for (let i = 0; i < path.length; i++) {
        expect(Number.isFinite(path[i]!)).toBe(true);
        expect(Math.abs(path[i]!)).toBeLessThanOrEqual(2.0001);
      }
    }
  });

  test('Lyapunov exponents are finite and at least some children are chaotic (λ>0)', () => {
    let chaoticCount = 0;
    for (let n = 0; n < 60; n++) {
      const baby = breedAt(n, (n * 17 + 2) % 101, n);
      expect(Number.isFinite(baby.chaos.lyapunov)).toBe(true);
      if (baby.chaos.chaotic) chaoticCount++;
    }
    expect(chaoticCount).toBeGreaterThan(0);
  });
});

describe('the child — assembly, rarity, determinism, novelty', () => {
  test('rarity in [0,1] and rank consistent', () => {
    for (let n = 0; n < 60; n++) {
      const baby = breedAt(n, (n * 19 + 5) % 101, n);
      expect(baby.rarity).toBeGreaterThanOrEqual(0);
      expect(baby.rarity).toBeLessThanOrEqual(1);
      const expected =
        baby.rarity >= 0.8
          ? 'FORBIDDEN'
          : baby.rarity >= 0.6
            ? 'MYTHIC'
            : baby.rarity >= 0.35
              ? 'RARE'
              : 'COMMON';
      expect(baby.rank).toBe(expected);
      expect(baby.hue).toBeGreaterThanOrEqual(0);
      expect(baby.hue).toBeLessThan(1);
    }
  });

  test('apex-blooded flag set iff a parent is the apex', () => {
    expect(breedAt(100, 3, 0).apexBlooded).toBe(true);
    expect(breedAt(3, 100, 0).apexBlooded).toBe(true);
    expect(breedAt(3, 4, 0).apexBlooded).toBe(false);
  });

  test('breeding is bit-for-bit deterministic', () => {
    const a = breedAt(7, 42, 99);
    const b = breedAt(7, 42, 99);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('children are novel — distinct genomes across the roster', () => {
    const ids = new Set<string>();
    const fingerprints = new Set<string>();
    for (let i = 0; i < 101; i++) {
      const baby = breedAt(i, (i * 23 + 7) % 101, i);
      ids.add(baby.id);
      fingerprints.add(fingerprint(baby));
    }
    expect(ids.size).toBe(101);
    // Genomes are richly differentiated (not N clones) — most fingerprints are unique.
    expect(fingerprints.size).toBeGreaterThan(90);
  });

  test('randomBreeding yields valid, deterministic children including inbred/asexual rites', () => {
    const rng = mulberry32(0xc0ffee);
    let asexualSeen = 0;
    let inbredSeen = 0;
    for (let n = 0; n < 200; n++) {
      const baby = randomBreeding(rng);
      expect(baby.rarity).toBeGreaterThanOrEqual(0);
      expect(baby.rarity).toBeLessThanOrEqual(1);
      if (baby.ritual.asexual) asexualSeen++;
      if (baby.ritual.inbreeding >= 0.45) inbredSeen++;
    }
    expect(asexualSeen).toBeGreaterThan(0);
    expect(inbredSeen).toBeGreaterThan(0);
    // Same seed ⇒ same stream ⇒ same first child.
    const r1 = mulberry32(0xabcdef);
    const r2 = mulberry32(0xabcdef);
    expect(JSON.stringify(randomBreeding(r1))).toBe(JSON.stringify(randomBreeding(r2)));
  });
});

/** A compact genome fingerprint over the four mathematics (for the novelty/diversity check). */
function fingerprint(g: BabyGenome): string {
  return [
    g.umbral.degree,
    g.umbral.bell,
    g.homotopy.winding,
    g.homotopy.linking,
    g.chaos.a,
    g.chaos.d,
    g.blaschke.degree,
    g.rarity,
  ].join('|');
}
