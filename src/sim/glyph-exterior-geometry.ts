/**
 * GLYPH EXTERIOR GEOMETRY — impossible per-letter body shapes (deterministic, no rng).
 *
 * Each archetype gets a unique geometry bucket key → wild parametric solid unlike Earth topology.
 */
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { mulberry32 } from '../math/rng';
import type { AlphabetArchetype } from './alphabet-pantheon';
import { GLYPH_EXTERIOR_KIND_COUNT, type GlyphExteriorSignature } from './glyph-exterior-signature';

const geoCache = new Map<string, THREE.BufferGeometry>();
const glyphNoise = createNoise3D(mulberry32(0x5eed));

function displaceGlyphGeometry(geo: THREE.BufferGeometry, seed: number, intensity: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute | null;
  const nr = nrm ? (nrm.array as Float32Array) : null;
  const ox = ((seed >>> 5) % 1000) * 0.001;
  const oy = ((seed >>> 11) % 1000) * 0.001;
  const oz = ((seed >>> 17) % 1000) * 0.001;
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i] ?? 0;
    const y = arr[i + 1] ?? 0;
    const z = arr[i + 2] ?? 0;
    const nx = nr ? (nr[i] ?? 0) : x;
    const ny = nr ? (nr[i + 1] ?? 0) : y;
    const nz = nr ? (nr[i + 2] ?? 0) : z;
    const n = glyphNoise(x * 1.2 + ox, y * 1.2 + oy, z * 1.2 + oz);
    const s = 1 + n * intensity;
    arr[i] = x * s + nx * n * intensity;
    arr[i + 1] = y * s + ny * n * intensity;
    arr[i + 2] = z * s + nz * n * intensity;
  }
  pos.needsUpdate = true;
  if (nrm) nrm.needsUpdate = true;
  geo.computeVertexNormals();
}

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

  let geo: THREE.BufferGeometry;
  // Massively increased polygon counts for Ultra HD alien detail
  switch (k) {
    case 0:
      geo = new THREE.BoxGeometry(0.8 + j * 0.7, 0.6 + j2 * 0.9, 0.9 + j3 * 0.65, 30, 30, 30);
      break;
    case 1:
      geo = new THREE.OctahedronGeometry(0.85 + j * 0.5, 12 + (v % 4));
      break;
    case 2:
      geo = new THREE.DodecahedronGeometry(0.75 + j2 * 0.55, 10);
      break;
    case 3:
      geo = new THREE.TorusGeometry(0.55 + j * 0.35, 0.12 + j2 * 0.28, 64 + (v % 16), 256 + t * 8);
      break;
    case 4: {
      const p = 2 + (v % 4);
      const q = 3 + (t % 5);
      geo = new THREE.TorusKnotGeometry(0.48 + j * 0.22, 0.1 + j2 * 0.16, 512 + t * 16, 64, p, q);
      break;
    }
    case 5:
      geo = new THREE.IcosahedronGeometry(0.7 + j * 0.45, 12 + (v % 4));
      break;
    case 6:
      geo = new THREE.BoxGeometry(1.2 + j * 0.8, 0.15 + j2 * 0.35, 0.9 + j3 * 0.5, 50, 20, 40);
      break;
    case 7:
      geo = new THREE.IcosahedronGeometry(0.65 + j2 * 0.5, v % 3 === 0 ? 15 : 10);
      break;
    case 8:
      geo = new THREE.BoxGeometry(0.35 + j * 0.25, 1.2 + j2 * 0.9, 0.4 + j3 * 0.3, 20, 60, 20);
      break;
    case 10:
      geo = new THREE.IcosahedronGeometry(0.6 + j * 0.55, 14);
      break;
    case 11:
      geo = new THREE.TetrahedronGeometry(0.9 + j * 0.6, 12);
      break;
    case 12:
      geo = new THREE.TorusGeometry(0.5 + j2 * 0.4, 0.06 + j3 * 0.14, 60 + (w % 16), 256 + t * 8);
      break;
    case 13:
      geo = new THREE.SphereGeometry(0.55 + j * 0.4, 128 + (v % 20), 64 + (t % 16));
      break;
    case 14:
      geo = new THREE.BoxGeometry(1.1 + j * 0.5, 1.1 + j2 * 0.45, 0.08 + j3 * 0.22, 50, 50, 10);
      break;
    default:
      geo = new THREE.TorusGeometry(0.6 + j * 0.35, 0.1 + j2 * 0.2, 60 + (v % 12), 200 + w * 8);
      break;
  }

  // Apply heavy alien displacement noise using their chaos and generative traits
  displaceGlyphGeometry(geo, s, 0.15 + a.bias.chaos * 0.25 + a.bias.generative * 0.15);
  return geo;
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
