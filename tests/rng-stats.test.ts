/**
 * rng-stats.test.ts — experiments pinning the randomness-quality battery.
 * Each test states a falsifiable claim (Manhattan: tests are experiments).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { EshkolQrng } from '../src/math/eshkol-qrng';
import {
  popcount,
  shannonEntropy,
  chiSquareUniform,
  serialCorrelation,
  monobitFraction,
  longestRunBits,
  hammingFlow,
  windowedXorEntropy,
  productCorrelation,
  randomnessReport,
} from '../src/math/rng-stats';

describe('popcount', () => {
  test('known bit counts', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(255, 8)).toBe(8);
    expect(popcount(0b1010, 8)).toBe(2);
    expect(popcount(7)).toBe(3);
  });
});

describe('shannonEntropy', () => {
  test('two equiprobable symbols = 1 bit', () => {
    expect(shannonEntropy([0, 1], 2)).toBeCloseTo(1, 12);
  });
  test('four equiprobable symbols = 2 bits', () => {
    expect(shannonEntropy([0, 1, 2, 3], 4)).toBeCloseTo(2, 12);
  });
  test('a constant stream has zero entropy', () => {
    expect(shannonEntropy([5, 5, 5, 5], 256)).toBe(0);
  });
  test('a full 0..255 byte sweep saturates byte-entropy at 8 bits', () => {
    const sweep = Array.from({ length: 256 }, (_, i) => i);
    expect(shannonEntropy(sweep, 256)).toBeCloseTo(8, 12);
  });
  test('empty input is 0, not NaN', () => {
    expect(shannonEntropy([], 256)).toBe(0);
  });
});

describe('chiSquareUniform', () => {
  test('a perfectly flat distribution scores 0', () => {
    const sweep = Array.from({ length: 256 }, (_, i) => i);
    expect(chiSquareUniform(sweep, 256)).toBeCloseTo(0, 9);
  });
  test('a degenerate constant stream scores large and positive', () => {
    const flat = Array.from({ length: 256 }, () => 7);
    expect(chiSquareUniform(flat, 256)).toBeGreaterThan(255);
  });
});

describe('serialCorrelation', () => {
  test('a strictly linear stream is perfectly correlated', () => {
    expect(serialCorrelation([1, 2, 3, 4])).toBeCloseTo(1, 12);
  });
  test('a constant stream has zero (defined) correlation', () => {
    expect(serialCorrelation([3, 3, 3, 3])).toBe(0);
  });
  test('returns 0 for fewer than two samples', () => {
    expect(serialCorrelation([42])).toBe(0);
  });
});

describe('monobit / runs / hamming', () => {
  test('full byte sweep is exactly balanced (monobit = 0.5)', () => {
    const sweep = Array.from({ length: 256 }, (_, i) => i);
    expect(monobitFraction(sweep, 8)).toBeCloseTo(0.5, 12);
  });
  test('all-ones bytes are all 1-bits (monobit = 1)', () => {
    expect(monobitFraction([255, 255, 255], 8)).toBe(1);
  });
  test('a frozen stream never flips a bit (hammingFlow = 0)', () => {
    expect(hammingFlow([9, 9, 9, 9], 8)).toBe(0);
  });
  test('alternating 0x00/0xFF flips every bit (hammingFlow = 1)', () => {
    expect(hammingFlow([0, 255, 0, 255], 8)).toBeCloseTo(1, 12);
  });
  test('longest run is bounded by the bit budget and positive', () => {
    const run = longestRunBits([0, 0, 0], 8);
    expect(run).toBeGreaterThan(0);
    expect(run).toBeLessThanOrEqual(24);
  });
});

describe('windowedXorEntropy / productCorrelation', () => {
  test('windowed XOR entropy is finite and non-negative on a varied stream', () => {
    const v = Array.from({ length: 64 }, (_, i) => (i * 37 + 11) % 256);
    const e = windowedXorEntropy(v, 8);
    expect(Number.isFinite(e)).toBe(true);
    expect(e).toBeGreaterThanOrEqual(0);
  });
  test('product correlation of a frozen normalised stream equals that constant squared', () => {
    // values all = 128, scale 256 → each normalised to 0.5 → product 0.25.
    expect(productCorrelation([128, 128, 128], 256)).toBeCloseTo(0.25, 12);
  });
});

describe('randomnessReport — composite', () => {
  test('quality is always within [0,1]', () => {
    const cases = [[1, 1, 1, 1], Array.from({ length: 256 }, (_, i) => i), [0, 255, 0, 255]];
    for (const c of cases) {
      const q = randomnessReport(c).quality;
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
    }
  });
  test('a constant stream scores poorly', () => {
    const flat = Array.from({ length: 128 }, () => 5);
    expect(randomnessReport(flat).quality).toBeLessThan(0.5);
  });
  test('reports are deterministic for identical input', () => {
    const v = Array.from({ length: 100 }, (_, i) => (i * 91 + 7) % 256);
    expect(randomnessReport(v)).toEqual(randomnessReport(v));
  });
});

describe('measures a seeded deterministic EshkolQrng adapter stream', () => {
  function qrngBytes(seed: number, n: number): number[] {
    const q = new EshkolQrng(mulberry32(seed));
    const out: number[] = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++) out[i] = Number(q.nextU64() & 0xffn);
    return out;
  }

  test('the seeded model stream passes the descriptive quality battery', () => {
    const bytes = qrngBytes(0xc0ffee, 8192);
    const r = randomnessReport(bytes);
    expect(r.entropy).toBeGreaterThan(7.5); // near-max byte entropy
    expect(Math.abs(r.serialCorrelation)).toBeLessThan(0.1); // little lag-1 dependence
    expect(Math.abs(r.monobit - 0.5)).toBeLessThan(0.05); // balanced bits
    expect(Math.abs(r.hammingFlow - 0.5)).toBeLessThan(0.1); // ~half the bits flip per draw
    expect(r.quality).toBeGreaterThan(0.85);
  });

  test('the same seed yields a bit-identical quality report (determinism)', () => {
    expect(randomnessReport(qrngBytes(123, 2048))).toEqual(randomnessReport(qrngBytes(123, 2048)));
  });
});
