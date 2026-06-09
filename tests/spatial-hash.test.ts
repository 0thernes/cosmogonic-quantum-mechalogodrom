import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { dist2XZ } from '../src/math/scalar';
import { SpatialHash } from '../src/math/spatial-hash';

interface Pt {
  id: number;
  position: { x: number; z: number };
}

/** Seeded random points centred on the origin (negative and positive coordinates). */
function makePoints(n: number, seed: number, extent: number): Pt[] {
  const rng = mulberry32(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      id: i,
      position: { x: (rng() - 0.5) * extent, z: (rng() - 0.5) * extent },
    });
  }
  return pts;
}

/** Brute-force reference: every point within `radius` of (x, z) in the XZ plane. */
function bruteWithin(pts: readonly Pt[], x: number, z: number, radius: number): Pt[] {
  return pts.filter((p) => dist2XZ(p.position.x, p.position.z, x, z) <= radius * radius);
}

/** Legacy truncating cell coordinate: (v / cellSize) | 0. */
function cellCoord(v: number, cellSize: number): number {
  return (v / cellSize) | 0;
}

describe('SpatialHash.query vs brute force', () => {
  test('every brute-force radius match is returned (superset guarantee, default cell size)', () => {
    const pts = makePoints(500, 1337, 200);
    const grid = new SpatialHash<Pt>();
    for (const p of pts) grid.insert(p);

    const centers = mulberry32(99);
    for (const radius of [0.5, 3, 8, 12.5, 40]) {
      for (let q = 0; q < 20; q++) {
        const x = (centers() - 0.5) * 200;
        const z = (centers() - 0.5) * 200;
        const got = new Set(grid.query(x, z, radius));
        for (const p of bruteWithin(pts, x, z, radius)) {
          expect(got.has(p)).toBeTrue();
        }
      }
    }
  });

  test('returned items only come from cells overlapping the query square', () => {
    const cellSize = 8;
    const pts = makePoints(400, 4242, 160);
    const grid = new SpatialHash<Pt>(cellSize);
    for (const p of pts) grid.insert(p);

    const x = 13.7;
    const z = -41.2;
    const radius = 20;
    const cr = Math.ceil(radius / cellSize);
    const cx = cellCoord(x, cellSize);
    const cz = cellCoord(z, cellSize);
    const res = grid.query(x, z, radius);
    expect(res.length).toBeGreaterThan(0);
    for (const p of res) {
      expect(Math.abs(cellCoord(p.position.x, cellSize) - cx)).toBeLessThanOrEqual(cr);
      expect(Math.abs(cellCoord(p.position.z, cellSize) - cz)).toBeLessThanOrEqual(cr);
    }
  });

  test('returns no duplicates and only inserted items', () => {
    const pts = makePoints(300, 7, 120);
    const all = new Set(pts);
    const grid = new SpatialHash<Pt>();
    for (const p of pts) grid.insert(p);

    const res = grid.query(0, 0, 30);
    expect(new Set(res).size).toBe(res.length);
    for (const p of res) expect(all.has(p)).toBeTrue();
  });

  test('superset guarantee holds for custom cell sizes', () => {
    for (const cellSize of [2, 32]) {
      const pts = makePoints(250, 555, 100);
      const grid = new SpatialHash<Pt>(cellSize);
      for (const p of pts) grid.insert(p);
      const got = new Set(grid.query(-12.3, 9.9, 17));
      for (const p of bruteWithin(pts, -12.3, 9.9, 17)) {
        expect(got.has(p)).toBeTrue();
      }
    }
  });

  test('radius 0 still finds a co-located item', () => {
    const grid = new SpatialHash<Pt>();
    const p: Pt = { id: 0, position: { x: -3.25, z: 5.5 } };
    grid.insert(p);
    expect(grid.query(-3.25, 5.5, 0)).toContain(p);
  });

  test('empty grid yields an empty result', () => {
    const grid = new SpatialHash<Pt>();
    expect(grid.query(0, 0, 50).length).toBe(0);
  });
});

describe('SpatialHash shared result buffer (Known Bug 5 fix)', () => {
  test('query returns the same buffer instance every call', () => {
    const pts = makePoints(100, 2024, 80);
    const grid = new SpatialHash<Pt>();
    for (const p of pts) grid.insert(p);

    const first = grid.query(0, 0, 10);
    const second = grid.query(25, -25, 10);
    expect(Object.is(first, second)).toBeTrue();
  });

  test('a previous result is invalidated (overwritten) by the next query', () => {
    const grid = new SpatialHash<Pt>();
    const near: Pt = { id: 1, position: { x: 1, z: 1 } };
    const far: Pt = { id: 2, position: { x: 500, z: 500 } };
    grid.insert(near);
    grid.insert(far);

    const first = grid.query(0, 0, 2);
    expect([...first]).toEqual([near]);

    const second = grid.query(500, 500, 2);
    // Same shared buffer: `first` now reflects the second query's contents.
    expect([...first]).toEqual([far]);
    expect([...second]).toEqual([far]);
  });

  test('copying the buffer preserves results across queries', () => {
    const grid = new SpatialHash<Pt>();
    const a: Pt = { id: 1, position: { x: 0, z: 0 } };
    const b: Pt = { id: 2, position: { x: 100, z: 100 } };
    grid.insert(a);
    grid.insert(b);

    const snapshot = [...grid.query(0, 0, 2)];
    grid.query(100, 100, 2);
    expect(snapshot).toEqual([a]);
  });
});

describe('SpatialHash.clear and cell pooling', () => {
  test('clear empties the grid', () => {
    const pts = makePoints(50, 3, 40);
    const grid = new SpatialHash<Pt>();
    for (const p of pts) grid.insert(p);
    expect(grid.query(0, 0, 40).length).toBeGreaterThan(0);
    grid.clear();
    expect(grid.query(0, 0, 40).length).toBe(0);
  });

  test('repeated clear/insert cycles stay correct (exercises the pooled cell arrays)', () => {
    const grid = new SpatialHash<Pt>();
    for (let cycle = 0; cycle < 5; cycle++) {
      const pts = makePoints(200, 100 + cycle, 90);
      grid.clear();
      for (const p of pts) grid.insert(p);

      const got = new Set(grid.query(5, -5, 15));
      const expected = bruteWithin(pts, 5, -5, 15);
      for (const p of expected) expect(got.has(p)).toBeTrue();
      // No stale items from earlier cycles may leak out of recycled cells.
      const all = new Set(pts);
      for (const p of got) expect(all.has(p)).toBeTrue();
    }
  });

  test('moved items are found at their new position after a rebuild', () => {
    const grid = new SpatialHash<Pt>();
    const p: Pt = { id: 1, position: { x: 0, z: 0 } };
    grid.insert(p);
    expect(grid.query(0, 0, 1)).toContain(p);

    p.position.x = 64;
    p.position.z = -64;
    grid.clear();
    grid.insert(p);
    expect(grid.query(64, -64, 1)).toContain(p);
    expect(grid.query(0, 0, 1)).not.toContain(p);
  });
});
