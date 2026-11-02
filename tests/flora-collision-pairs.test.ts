import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlienFlora } from '../src/sim/alien-flora';
import type { SimContext } from '../src/types';

/** The former in-place 3×3 bucket scan (same maths, float32 push written per pair), replayed over the
 *  per-step arrays the instance just computed. */
function referencePush(f: any): Float32Array {
  const n = f.plantX.length;
  const push = new Float32Array(n * 2);
  const kin: Float32Array = f.plantKin;
  const col = (o: number): any => Array.from({ length: n }, (_, i) => kin[i * 8 + o]!);
  const px = col(0);
  const pz = col(1);
  const rr = col(2);
  const ox = col(3);
  const oz = col(4);
  const touch = col(5);
  const hn = f.hashN;
  for (let i = 0; i < n; i++) {
    const hx = Math.floor((f.plantX[i] - f.hashOrigin) / 5.5);
    const hz = Math.floor((f.plantZ[i] - f.hashOrigin) / 5.5);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = hx + dx;
        const cz = hz + dz;
        if (cx < 0 || cz < 0 || cx >= hn || cz >= hn) continue;
        for (const j of f.hashBuckets[cz * hn + cx] as number[]) {
          if (j <= i) continue;
          let ddx = px[i] - px[j];
          let ddz = pz[i] - pz[j];
          const d2 = ddx * ddx + ddz * ddz;
          const minDist = rr[i] + rr[j];
          if (d2 >= minDist * minDist || d2 < 1e-8) continue;
          const d = Math.sqrt(d2);
          const overlap = 1 - d / minDist;
          const inv = 1 / d;
          ddx *= inv;
          ddz *= inv;
          const closing = (ox[i] - ox[j]) * -ddx + (oz[i] - oz[j]) * -ddz > 0 ? 1.15 : 1;
          let mag = overlap * overlap * minDist * 0.72 * closing * Math.max(touch[i], touch[j]);
          if (mag > 3.2) mag = 3.2;
          push[i * 2] = push[i * 2]! + ddx * mag;
          push[i * 2 + 1] = push[i * 2 + 1]! + ddz * mag;
          push[j * 2] = push[j * 2]! - ddx * mag;
          push[j * 2 + 1] = push[j * 2 + 1]! - ddz * mag;
        }
      }
    }
  }
  return push;
}

describe('AlienFlora static collision pairs', () => {
  test('precomputed candidate list equals the 3x3 bucket scan, pair for pair and in order', () => {
    const f: any = new AlienFlora({
      scene: new THREE.Scene(),
      quality: { isMobile: true },
    } as unknown as SimContext);
    const n = f.plantX.length;
    const got: number[] = [];
    const want: number[] = [];
    const hn = f.hashN;
    for (let i = 0; i < n; i++) {
      for (let p = f.pairStart[i]; p < f.pairStart[i + 1]; p++) got.push(i, f.pairJ[p]);
      const hx = Math.floor((f.plantX[i] - f.hashOrigin) / 5.5);
      const hz = Math.floor((f.plantZ[i] - f.hashOrigin) / 5.5);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const cx = hx + dx;
          const cz = hz + dz;
          if (cx < 0 || cz < 0 || cx >= hn || cz >= hn) continue;
          for (const j of f.hashBuckets[cz * hn + cx] as number[]) if (j > i) want.push(i, j);
        }
    }
    expect(got.length).toBeGreaterThan(1000);
    expect(got).toEqual(want);
  });

  test('per-step push field is bit-identical to the in-place bucket scan', () => {
    const f: any = new AlienFlora({
      scene: new THREE.Scene(),
      quality: { isMobile: true },
    } as unknown as SimContext);
    let nonzero = 0;
    for (let k = 0; k < 40; k++) {
      f.update(1 / 60, 1 + k / 60, 0.7, 0.4);
      const want = referencePush(f);
      expect(Buffer.from(f.plantPush.buffer).equals(Buffer.from(want.buffer))).toBe(true);
      nonzero = want.filter((v) => v !== 0).length;
    }
    expect(nonzero).toBeGreaterThan(100);
  });
});
