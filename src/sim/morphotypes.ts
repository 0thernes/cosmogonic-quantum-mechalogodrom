/**
 * Morphotype generation — port of legacy lines 276-289 (`MT` build loop).
 *
 * A morphotype is the genome an entity instantiates: geometry index, PBR
 * material palette, behavior, and motion parameters. Generation is fully
 * deterministic from the injected {@link Rng} (Known Bug 9 fix: the legacy
 * file's ambient `rng` is replaced by an explicit seeded mulberry32).
 */
import * as THREE from 'three';
import type { Rng } from '../math/rng';
import type { MorphType } from '../types';
import { BEHAVIORS, MORPH_COUNT } from './constants';

/**
 * Generates the {@link MORPH_COUNT} (100) morphotypes, deterministic from
 * `rng`. Consumes exactly 15 rng draws per morphotype in legacy evaluation
 * order (hue, col S/L, em H/S/L, emI, met, rou, op, srMin, srMax, spd, wf,
 * wa) so a given seed reproduces the legacy population byte-for-byte.
 *
 * `geoCount` is the geometry-cache length; morphotype `i` borrows geometry
 * `i % geoCount` (legacy `_i % cachedGeos.length`). O(MORPH_COUNT), boot-time.
 */
export function createMorphotypes(rng: Rng, geoCount: number): MorphType[] {
  const out: MorphType[] = [];
  for (let i = 0; i < MORPH_COUNT; i++) {
    const h = rng();
    const bi = i % BEHAVIORS.length;
    // Invariant: bi ∈ [0, BEHAVIORS.length) — modulo of a non-negative index.
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
