import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pkg from '../package.json';
import { buildBom } from '../scripts/sbom';

describe('CycloneDX SBOM', () => {
  test('includes the complete reachable install graph with valid dependency references', () => {
    const bom = buildBom();
    const directCount =
      Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
    expect(bom.components.length).toBeGreaterThan(directCount);

    const refs = new Set([
      bom.metadata.component['bom-ref'],
      ...bom.components.map((c) => c['bom-ref']),
    ]);
    for (const edge of bom.dependencies) {
      expect(refs.has(edge.ref)).toBe(true);
      for (const child of edge.dependsOn) expect(refs.has(child)).toBe(true);
    }
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      expect(bom.components.some((component) => component.name === name)).toBe(true);
    }
    expect(bom.components.find((component) => component.name === 'three')?.scope).toBe('required');
    expect(bom.components.find((component) => component.name === 'typescript')?.scope).toBe(
      'excluded',
    );
    // Transitive peer requirements are part of the graph, not invisible installer side effects.
    expect(bom.components.some((component) => component.name === 'graphology-types')).toBe(true);
  });

  test('is byte-for-byte deterministic', () => {
    expect(JSON.stringify(buildBom())).toBe(JSON.stringify(buildBom()));
  });

  test('fails closed when a required dependency is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cqm-sbom-'));
    try {
      mkdirSync(join(dir, 'node_modules'));
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'fixture', version: '1.0.0', dependencies: { missing: '1.0.0' } }),
      );
      expect(() => buildBom(dir)).toThrow(/Unable to resolve required dependency missing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('permits an absent platform-specific optional dependency', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cqm-sbom-optional-'));
    try {
      mkdirSync(join(dir, 'node_modules'));
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'fixture',
          version: '1.0.0',
          optionalDependencies: { 'another-platform-only-package': '1.0.0' },
        }),
      );
      expect(buildBom(dir).components).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
