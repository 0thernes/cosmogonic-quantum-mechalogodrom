import { describe, expect, test } from 'bun:test';
import { CliffordTableau } from '../src/math/clifford-tableau';

/** Pre-pooling entanglementEntropy (fresh row arrays per call), verbatim, over the tableau's x/z. */
function refEE(t: CliffordTableau, k: number): number {
  const { n, x, z } = t as unknown as { n: number; x: Uint8Array; z: Uint8Array };
  const cut = Math.max(0, Math.min(n, Math.floor(k)));
  if (cut === 0 || cut === n) return 0;
  const cols = 2 * cut;
  const mat: Uint8Array[] = [];
  for (let s = 0; s < n; s++) {
    const row = new Uint8Array(cols);
    const base = (n + s) * n;
    for (let j = 0; j < cut; j++) {
      row[j] = x[base + j] ?? 0;
      row[cut + j] = z[base + j] ?? 0;
    }
    mat.push(row);
  }
  let rank = 0;
  for (let col = 0; col < cols && rank < mat.length; col++) {
    let pivot = -1;
    for (let i = rank; i < mat.length; i++) {
      if ((mat[i]?.[col] ?? 0) === 1) {
        pivot = i;
        break;
      }
    }
    if (pivot < 0) continue;
    const tmp = mat[rank];
    mat[rank] = mat[pivot] ?? new Uint8Array(cols);
    if (tmp) mat[pivot] = tmp;
    const pr = mat[rank];
    if (!pr) continue;
    for (let i = 0; i < mat.length; i++) {
      if (i !== rank && (mat[i]?.[col] ?? 0) === 1) {
        const ri = mat[i];
        if (!ri) continue;
        for (let c = 0; c < cols; c++) ri[c] = (ri[c] ?? 0) ^ (pr[c] ?? 0);
      }
    }
    rank++;
  }
  const s = rank - cut;
  return s < 0 ? 0 : s;
}

describe('CliffordTableau.entanglementEntropy with a reused workspace', () => {
  test('identical to the fresh-array form on random circuits, every cut, mixed sizes', () => {
    let seed = 7;
    const rnd = (m: number) => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % m;
    let checked = 0;
    let nonzero = 0;
    for (const n of [2, 5, 3, 8, 12, 4, 16]) {
      for (let rep = 0; rep < 12; rep++) {
        const t = new CliffordTableau(n);
        for (let g = 0; g < n * 6; g++) {
          const op = rnd(3);
          const a = rnd(n);
          if (op === 0) t.h(a);
          else if (op === 1) t.s(a);
          else {
            const b = (a + 1 + rnd(n - 1)) % n;
            t.cnot(a, b);
          }
        }
        for (let k = -1; k <= n + 1; k++) {
          const got = t.entanglementEntropy(k);
          expect(got).toBe(refEE(t, k));
          if (got > 0) nonzero++;
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(nonzero).toBeGreaterThan(50);
  });
});
