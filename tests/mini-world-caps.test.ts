/**
 * Mini World runs every population at one tenth (rounded, minimum 1): 5 super creatures → 1, 100 glyph
 * brains → 10, crystal-tree census, xenomimics, NHI minds, wilderness streaming. The full world keeps every
 * authored value. Runs in a child process because WORLD_SCALE is fixed at module load from `location`.
 */
import { describe, expect, test } from 'bun:test';
import { APEX_INDIVIDUATED } from '../src/sim/godform';
import { XENOMIMIC_MAX } from '../src/sim/xenomimics';
import { NHI_SYSTEM_MIND_CAP } from '../src/sim/nhi-system';
import { PANTHEON_ACTIVE_INDICES } from '../src/sim/alphabet-pantheon';
import { MECHA_ALTITUDE } from '../src/sim/constants';
import { crystalProductionConfig } from '../src/sim/crystal-ecosystem';

const PROBE = (search: string): string => `
globalThis.location = { search: '${search}' };
const g = await import('./src/sim/godform.ts');
const x = await import('./src/sim/xenomimics.ts');
const n = await import('./src/sim/nhi-system.ts');
const a = await import('./src/sim/alphabet-pantheon.ts');
const gb = await import('./src/sim/glyph-brain.ts');
const c = await import('./src/sim/crystal-ecosystem.ts');
const w = await import('./src/sim/wilderness-population.ts');
const k = await import('./src/sim/constants.ts');
const mb = await import('./src/sim/mecha-blaze.ts');
const batch = new gb.GlyphBrainBatch(1234);
const snaps = batch.thinkAll(new Float32Array(64));
const pop = new w.WildernessPopulation(null, 0xabc123);
pop.update(50, 50, 1 / 60);
const cfg = c.crystalProductionConfig();
console.log(JSON.stringify({ alt: k.MECHA_ALTITUDE, ceil: k.PLATFORM_CEIL, blazeY: mb.MECHA_Y, apex: g.APEX_INDIVIDUATED, xeno: x.XENOMIMIC_MAX, nhi: n.NHI_SYSTEM_MIND_CAP,
  active: a.PANTHEON_ACTIVE_INDICES, brains: batch.count, snaps: snaps.length, snapOk: snaps.every((s) => s && typeof s.activity === 'number'),
  wild: pop.getEntityCount(), chunks: pop.getActiveChunkCount(),
  tree: [cfg.leaves, cfg.fruits, cfg.flowers, cfg.creaturesPerSpecies, cfg.ambientCreatures, cfg.motes, cfg.relics, cfg.domeBranches, cfg.bonsaiBranches] }));
`;

function run(search: string): Record<string, unknown> {
  const r = Bun.spawnSync([process.execPath, '-e', PROBE(search)], { cwd: process.cwd() });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return JSON.parse(r.stdout.toString().trim().split('\n').pop()!);
}

describe('Mini World population caps', () => {
  test('full world keeps every authored count', () => {
    expect(MECHA_ALTITUDE).toBe(756);
    expect(APEX_INDIVIDUATED).toBe(5);
    expect(XENOMIMIC_MAX).toBe(1000);
    expect(NHI_SYSTEM_MIND_CAP).toBe(1000);
    expect(PANTHEON_ACTIVE_INDICES).toEqual(Array.from({ length: 100 }, (_, i) => i));
    const cfg = crystalProductionConfig();
    expect([
      cfg.leaves,
      cfg.creaturesPerSpecies,
      cfg.ambientCreatures,
      cfg.motes,
      cfg.relics,
    ]).toEqual([10_000, 25, 99, 5000, 50]);
  });

  test('Mini World runs one tenth of every population (minimum 1)', () => {
    const m = run('?world=mini');
    // The centre god + its ±20 u orbiting corona hang under the 231.8 ceiling (≈207.8), not through it.
    expect(m.alt as number).toBeCloseTo((m.ceil as number) - 24, 6);
    expect((m.alt as number) + 21).toBeLessThan(m.ceil as number);
    expect(m.blazeY).toBe(m.alt);
    expect(m.apex).toBe(1);
    expect(m.xeno).toBe(100);
    expect(m.nhi).toBe(100);
    expect(m.active).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(m.brains).toBe(10);
    expect(m.snaps).toBe(100);
    expect(m.snapOk).toBe(true);
    expect(m.chunks).toBe(49);
    expect(m.wild).toBe(49 * 13);
    // leaves, fruits, flowers, per-species, ambient, motes, relics scale; branch structure does not.
    expect(m.tree).toEqual([1000, 1000, 1000, 3, 10, 500, 5, 500, 1000]);
  }, 60_000);
});
