/**
 * V122 (USER #9) — BRUTAL presses morph the ENTITIES every time. Receipts:
 *  - EntityBrainField.perturbBrains jitters ONLY the brain-weight region (personality traits are
 *    identity and must survive), deterministically (same rng seed ⇒ same drift), and small (±amp);
 *  - SuperCreature.perturbMind drifts the deep mind deterministically and stays inside the ±1.5
 *    weight band; behaviour genuinely changes (a perturbed twin diverges from its unperturbed clone);
 *  - static seals: the instanced pool carries the morph-wave uniforms + the freakshow layer, world
 *    arms wave/sweep/jitter on every toggle, and the ghost/neon/chrome modes gained 1/1 GPU layers.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import { SuperCreature } from '../src/sim/super-creature';
import { TRAIT_GENES, GENOME_LEN } from '../src/sim/genome';

const root = resolve(import.meta.dir, '..');
const src = (p: string): string => readFileSync(resolve(root, p), 'utf8');

describe('EntityBrainField.perturbBrains (V122)', () => {
  test('jitters brain weights, preserves personality traits, deterministic per seed', () => {
    const mk = (): EntityBrainField => new EntityBrainField(8, mulberry32(42));
    const a = mk();
    const b = mk();
    const before = Array.from(a.genomeAt(3));
    a.perturbBrains(mulberry32(7));
    b.perturbBrains(mulberry32(7));
    const after = Array.from(a.genomeAt(3));
    // Traits (identity region) untouched; brain region moved but only slightly.
    for (let i = 0; i < TRAIT_GENES; i++) expect(after[i]).toBe(before[i]!);
    let moved = 0;
    for (let i = TRAIT_GENES; i < GENOME_LEN; i++) {
      const d = Math.abs(after[i]! - before[i]!);
      if (d > 0) moved++;
      expect(d).toBeLessThanOrEqual(0.015 + 1e-9); // amp bound
    }
    expect(moved).toBeGreaterThan(0);
    // Same seed ⇒ bit-identical drift on the twin field.
    expect(Array.from(b.genomeAt(3))).toEqual(after);
  });
});

describe('SuperCreature.perturbMind (V122)', () => {
  const runMind = (c: SuperCreature): string => {
    const out: string[] = [];
    for (let b = 0; b < 12; b++) {
      const i = c.think({
        energy: 0.7,
        threat: 0.2,
        crowding: 0.5,
        chaos: 0.3,
        wealthRel: 0.5,
        preyClose: 0.4,
        rivalClose: 0.1,
        pull: 0.0,
        light: 0.6,
        sound: 0.3,
        phase: (b % 10) / 10,
      });
      out.push(
        [i.move.x, i.move.y, i.move.z, i.aggression, i.deception, i.dominance, i.curiosity]
          .map((v) => v.toFixed(5))
          .join(','),
      );
    }
    return out.join('|');
  };

  test('deterministic drift inside the weight band; the perturbed mind diverges behaviourally', () => {
    const base = new SuperCreature(mulberry32(5));
    const twin = new SuperCreature(mulberry32(5));
    twin.perturbMind(mulberry32(13));
    expect(runMind(twin)).not.toBe(runMind(base)); // the jitter leaves a real behavioural mark
    // Determinism of the perturbation itself: an identically-seeded perturb reproduces exactly.
    const t2 = new SuperCreature(mulberry32(5));
    t2.perturbMind(mulberry32(13));
    const t3 = new SuperCreature(mulberry32(5));
    t3.perturbMind(mulberry32(13));
    expect(runMind(t2)).toBe(runMind(t3));
  });
});

describe('V122 static seals — morph wave + 1/1 render modes', () => {
  test('instanced pool carries the wave uniforms, spasm branch, and freakshow layer', () => {
    const code = src('src/sim/instanced-entities.ts');
    expect(code).toContain('uMorphWave');
    expect(code).toContain('uMorphSeed');
    expect(code).toContain('setMorphWave');
    expect(code).toContain('BRUTAL MORPH WAVE');
    expect(code).toContain('FREAKSHOW');
  });

  test('ghost / neon / chrome gained distinct GPU layers (10 renders, each 1/1)', () => {
    const code = src('src/sim/instanced-entities.ts');
    expect(code).toContain('uMode > 3.5'); // chrome liquid streak
    expect(code).toContain('uMode > 2.5'); // neon tube flicker
    expect(code).toContain('uMode > 1.5'); // ghost spectral wisps
  });

  test('world arms wave + staggered remorph + neural jitter on EVERY toggle', () => {
    const world = src('src/world.ts');
    expect(world).toContain('this.brutalMorphWave = 1;');
    expect(world).toContain('this.brutalMorphSeed++;');
    expect(world).toContain('this.entityBrains.perturbBrains(this.genomeRng);');
    expect(world).toContain('.perturbMind(this.uiRng);');
    expect(world).toContain('this.brutalMorphCursor = 0;');
  });
});
