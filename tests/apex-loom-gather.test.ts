import { describe, expect, test } from 'bun:test';
import { PrimeSieveLoom } from '../src/sim/apex-brain';
import { mulberry32 } from '../src/math/rng';

/** The pre-optimisation edge-scatter loom, kept as the bit-exact reference (same edges, same purge rule). */
function referenceLoom(n: number, isTwin: (d: number) => boolean) {
  const ei: number[] = [];
  const ej: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isTwin(j - i)) {
        ei.push(i);
        ej.push(j);
      }
    }
  }
  const alive = new Uint8Array(ei.length).fill(1);
  const state = new Float64Array(n);
  const next = new Float64Array(n);
  let allergy = 0;
  const isPrime = (q: number): boolean => {
    if (q < 2) return false;
    for (let p = 2; p * p <= q; p++) if (q % p === 0) return false;
    return true;
  };
  return (drive: number, rng: () => number): number => {
    next.fill(0);
    const inj = drive * 0.1;
    for (let e = 0; e < ei.length; e++) {
      if (!alive[e]) continue;
      next[ei[e]!]! += 0.12 * (state[ej[e]!]! + inj);
      next[ej[e]!]! += 0.12 * (state[ei[e]!]! + inj);
    }
    let tp = 0;
    for (let i = 0; i < n; i++) {
      state[i] = Math.tanh(next[i]! + 0.05 * Math.sin(i + drive));
      tp += Math.abs(state[i]!);
    }
    const q = Math.abs(Math.floor(drive * 7)) + 4;
    if (!isPrime(q)) {
      allergy = Math.min(1, Math.max(0, allergy + 0.15));
      let k = 1 + Math.floor(rng() * 3);
      // lowest-index live edge of each distance, longest first, one per distance
      for (let d = n; d > 0 && k > 0; d--) {
        for (let e = 0; e < ei.length; e++) {
          if (alive[e] && ej[e]! - ei[e]! === d) {
            alive[e] = 0;
            k--;
            break;
          }
        }
      }
    } else allergy *= 0.96;
    return Math.tanh((tp / n) * (1 - allergy));
  };
}

describe('PrimeSieveLoom gather step', () => {
  test('matches the edge-scatter reference bit for bit through purges', () => {
    for (const n of [7, 61, 96, 203]) {
      const loom = new PrimeSieveLoom(n);
      const ref = referenceLoom(n, (d) => loom.isTwinDistance(d));
      const ra = mulberry32(n);
      const rb = mulberry32(n);
      const drv = mulberry32(99);
      for (let s = 0; s < 400; s++) {
        const drive = drv() * 3 - 0.5;
        const a = loom.step(drive, ra);
        const b = ref(drive, rb);
        expect(Object.is(a, b)).toBe(true);
      }
    }
  });
});
