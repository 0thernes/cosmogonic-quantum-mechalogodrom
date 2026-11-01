import { describe, expect, test } from 'bun:test';
import { DeterministicStatevectorRng } from '../src/math/deterministic-statevector-rng';
import { mulberry32 } from '../src/math/rng';

const fnv = (h: number, s: string) => {
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return h;
};

describe('DeterministicStatevectorRng 32-bit halves', () => {
  test('mixed next01/nextU64 stream and snapshot match the BigInt-era fingerprint', () => {
    // Fingerprint recorded with the previous BigInt implementation (same seed, same call mix).
    const r = new DeterministicStatevectorRng(mulberry32(7));
    let h = 0;
    for (let i = 0; i < 3000; i++)
      h = fnv(h, String(i % 3 ? r.next01() : Number(r.nextU64() % 1000003n)));
    const snap = r.snapshot();
    h = fnv(h, JSON.stringify(snap));
    expect(snap.lastWord).toBe('09ef6abc9c754755');
    expect(h >>> 0).toBe(2730174551);
  });

  test('next01 is the top 53 bits of the same word, and a restored copy continues identically', () => {
    const a = new DeterministicStatevectorRng(mulberry32(11));
    const b = new DeterministicStatevectorRng(mulberry32(11));
    for (let i = 0; i < 500; i++) expect(a.next01()).toBe(Number(b.nextU64() >> 11n) / 2 ** 53);
    const c = DeterministicStatevectorRng.fromSnapshot(a.snapshot());
    expect(JSON.stringify(c.snapshot())).toBe(JSON.stringify(a.snapshot()));
    for (let i = 0; i < 200; i++) expect(c.nextU64()).toBe(a.nextU64());
  });
});
