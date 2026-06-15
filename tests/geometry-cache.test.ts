/**
 * createGeometryCache — the shared, never-disposed BufferGeometry pool built once at boot. The
 * morphotype contract indexes it as `mi % geos.length`, so its size + validity are load-bearing; and
 * it must be a PURE factory (same count every call) for the determinism of morphotype assignment.
 * It had no dedicated test (every other suite merely depends on it); this pins the contract.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { createGeometryCache } from '../src/sim/geometry-cache';

describe('createGeometryCache — shared geometry pool', () => {
  test('builds a stable, non-empty set of valid BufferGeometries with vertices', () => {
    const geos = createGeometryCache();
    expect(geos.length).toBeGreaterThan(0);
    for (const g of geos) {
      expect(g).toBeInstanceOf(THREE.BufferGeometry);
      const pos = g.getAttribute('position');
      expect(pos).toBeDefined(); // even the fallback sphere has a position attribute
      expect(pos.count).toBeGreaterThan(0);
    }
  });

  test('is a pure factory — the count is stable across builds (mi % length contract)', () => {
    expect(createGeometryCache().length).toBe(createGeometryCache().length);
  });
});
