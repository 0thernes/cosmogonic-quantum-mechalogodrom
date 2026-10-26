import { describe, expect, test } from 'bun:test';
import { parseSeedParam } from '../src/core/seed-param';

describe('parseSeedParam — ?seed= reproducibility (audit #303)', () => {
  test('parses hex and decimal into the same uint32', () => {
    expect(parseSeedParam('0xC05A06')).toBe(0xc05a06);
    expect(parseSeedParam('0xc05a06')).toBe(0xc05a06);
    expect(parseSeedParam(String(0xc05a06))).toBe(0xc05a06);
  });

  test('wraps to uint32', () => {
    expect(parseSeedParam('4294967297')).toBe(1);
    expect(parseSeedParam('0x1FFFFFFFF')).toBe(0xffffffff);
  });

  test('absent / empty / malformed values fall back (null)', () => {
    expect(parseSeedParam(null)).toBeNull();
    expect(parseSeedParam(undefined)).toBeNull();
    expect(parseSeedParam('')).toBeNull();
    expect(parseSeedParam('  ')).toBeNull();
    expect(parseSeedParam('abc')).toBeNull();
    expect(parseSeedParam('-5')).toBeNull();
    expect(parseSeedParam('1.5')).toBeNull();
  });

  test('main.ts uses the parsed seed instead of always overwriting it', async () => {
    const src = await Bun.file(new URL('../src/main.ts', import.meta.url)).text();
    expect(src).toContain("parseSeedParam(new URLSearchParams(location.search).get('seed'))");
    expect(src).toMatch(/seed: urlSeed \?\?/);
  });
});
