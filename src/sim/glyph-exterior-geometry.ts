/**
 * GLYPH EXTERIOR GEOMETRY — impossible per-letter body shapes (deterministic, no rng).
 *
 * Each archetype gets a unique geometry bucket key → wild parametric solid unlike Earth topology.
 */
import * as THREE from 'three';
import type { AlphabetArchetype } from './alphabet-pantheon';
import { GLYPH_EXTERIOR_KIND_COUNT, type GlyphExteriorSignature } from './glyph-exterior-signature';

const geoCache = new Map<string, THREE.BufferGeometry>();

export function glyphGeoBucketKey(a: AlphabetArchetype, sig: GlyphExteriorSignature): string {
  const s = a.seed;
  const v = (s >>> 5) % 8;
  const t = (s >>> 11) % 16;
  const w = (s >>> 17) % 13;
  return `${sig.kindIdx}:${v}:${t}:${w}:${a.index % 7}`;
}

function fi(s: number, shift: number, mod: number): number {
  return ((s >>> shift) % mod) / mod;
}

/** Build one wild solid — parametric insanity keyed to seed + kind. */
function buildWildGlyphGeometry(
  a: AlphabetArchetype,
  sig: GlyphExteriorSignature,
): THREE.BufferGeometry {
  const s = a.seed;
  const k = sig.kindIdx % GLYPH_EXTERIOR_KIND_COUNT;
  const v = (s >>> 5) % 8;
  const t = (s >>> 11) % 16;
  const w = (s >>> 17) % 13;
  const j = fi(s, 3, 40);
  const j2 = fi(s, 7, 37);
  const j3 = fi(s, 9, 41);

  switch (k) {
    case 0:
      return new THREE.BoxGeometry(0.8 + j * 0.7, 0.6 + j2 * 0.9, 0.9 + j3 * 0.65);
    case 1:
      return new THREE.OctahedronGeometry(0.85 + j * 0.5, v % 2);
    case 2:
      return new THREE.DodecahedronGeometry(0.75 + j2 * 0.55, 0);
    case 3:
      return new THREE.TorusGeometry(0.55 + j * 0.35, 0.12 + j2 * 0.28, 5 + (v % 4), 16 + t);
    case 4: {
      const p = 2 + (v % 4);
      const q = 3 + (t % 5);
      return new THREE.TorusKnotGeometry(0.48 + j * 0.22, 0.1 + j2 * 0.16, 48 + t * 2, 6, p, q);
    }
    case 5:
      return new THREE.IcosahedronGeometry(0.7 + j * 0.45, 1 + (v % 2));
    case 6:
      return new THREE.BoxGeometry(1.2 + j * 0.8, 0.15 + j2 * 0.35, 0.9 + j3 * 0.5);
    case 7:
      return new THREE.IcosahedronGeometry(0.65 + j2 * 0.5, v % 3 === 0 ? 1 : 0);
    case 8:
      return new THREE.BoxGeometry(0.35 + j * 0.25, 1.2 + j2 * 0.9, 0.4 + j3 * 0.3);
    case 10:
      return new THREE.IcosahedronGeometry(0.6 + j * 0.55, 2);
    case 11:
      return new THREE.TetrahedronGeometry(0.9 + j * 0.6, 0);
    case 12:
      return new THREE.TorusGeometry(0.5 + j2 * 0.4, 0.06 + j3 * 0.14, 4 + (w % 5), 20 + t);
    case 13:
      return new THREE.SphereGeometry(0.55 + j * 0.4, 6 + (v % 6), 5 + (t % 4));
    case 14:
      return new THREE.BoxGeometry(1.1 + j * 0.5, 1.1 + j2 * 0.45, 0.08 + j3 * 0.22);
    default:
      return new THREE.TorusGeometry(0.6 + j * 0.35, 0.1 + j2 * 0.2, 5 + (v % 3), 14 + w);
  }
}

export function glyphBodyGeometry(
  a: AlphabetArchetype,
  sig: GlyphExteriorSignature,
): THREE.BufferGeometry {
  const key = glyphGeoBucketKey(a, sig);
  let g = geoCache.get(key);
  if (!g) {
    g = buildWildGlyphGeometry(a, sig);
    geoCache.set(key, g);
  }
  return g;
}

/** Clear geometry cache (HMR / dispose). */
export function disposeGlyphGeometryCache(): void {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
}
