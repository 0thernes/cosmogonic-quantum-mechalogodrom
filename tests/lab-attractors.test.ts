import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(import.meta.dir, '..', 'lab', 'quantum-wildbeyond.html'), 'utf8');

describe('LAB WebGL tiles are fitted to their viewport', () => {
  test('fitWebglTile helper is defined', () => {
    expect(html).toMatch(/function fitWebglTile\s*\(/);
  });

  test('every WEBGL tile calls fitWebglTile after creating its canvas', () => {
    // Only count actual code lines (strip the comment that mentions createCanvas in helper docs).
    const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const webglCreates = [...code.matchAll(/p\.createCanvas\(S,\s*S,\s*p\.WEBGL\);/g)];
    const fits = [...code.matchAll(/fitWebglTile\s*\(\s*p\s*,\s*S\s*,/g)];
    expect(webglCreates.length).toBeGreaterThan(10);
    expect(fits.length).toBeGreaterThanOrEqual(webglCreates.length);
  });
});
