import { describe, expect, test } from 'bun:test';
import { hashSeed, mulberry32 } from '../src/math/rng';

describe('mulberry32', () => {
  test('same seed produces the same sequence (determinism, contract rule 7)', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a()).toBe(b());
    }
  });

  test('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let identical = 0;
    for (let i = 0; i < 32; i++) {
      if (a() === b()) identical++;
    }
    expect(identical).toBeLessThan(32);
  });

  test('every draw is in [0, 1)', () => {
    const rng = mulberry32(0xdecafbad);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('seed is coerced to uint32 — s and s + 2^32 are the same stream', () => {
    const a = mulberry32(7);
    const b = mulberry32(7 + 2 ** 32);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  test('seed 0 is a valid stream (does not collapse to a constant)', () => {
    const rng = mulberry32(0);
    const first = rng();
    let varied = false;
    for (let i = 0; i < 16; i++) {
      if (rng() !== first) varied = true;
    }
    expect(varied).toBeTrue();
  });

  test('output is roughly uniform (mean of 10k draws near 0.5)', () => {
    const rng = mulberry32(42);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += rng();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe('hashSeed', () => {
  test('is deterministic', () => {
    expect(hashSeed('cosmogonic')).toBe(hashSeed('cosmogonic'));
  });

  test('returns a uint32', () => {
    for (const s of ['', 'a', 'apocalypse-demo', 'Ω≈ç√∫˜µ', 'cosmogonic quantum mechalogodrom']) {
      const h = hashSeed(s);
      expect(Number.isInteger(h)).toBeTrue();
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  test('matches the FNV-1a 32-bit reference vectors', () => {
    expect(hashSeed('')).toBe(0x811c9dc5); // offset basis
    expect(hashSeed('a')).toBe(0xe40c292c);
    expect(hashSeed('foobar')).toBe(0xbf9cf968);
  });

  test('distinct strings map to distinct seeds (sample set)', () => {
    const samples = ['CLEAR', 'RAIN', 'STORM', 'AURORA', 'VOID', 'FOG', 'fog', 'F OG'];
    const hashes = new Set(samples.map(hashSeed));
    expect(hashes.size).toBe(samples.length);
  });

  test('composes with mulberry32 into a reproducible named stream', () => {
    const a = mulberry32(hashSeed('shoggoth-run'));
    const b = mulberry32(hashSeed('shoggoth-run'));
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });
});
