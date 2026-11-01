import { describe, expect, test } from 'bun:test';
import { SpatialHash } from '../src/math/spatial-hash';

type P = { id: number; position: { x: number; z: number } };

/** Plain square scan in the original (dx, dz) order — what query() must always equal. */
function reference(items: P[], cs: number, x: number, z: number, r: number): number[] {
  const cells = new Map<number, P[]>();
  for (const it of items) {
    const k = Math.floor(it.position.x / cs) * 10007 + Math.floor(it.position.z / cs);
    let c = cells.get(k);
    if (!c) cells.set(k, (c = []));
    c.push(it);
  }
  const cr = Math.ceil(r / cs),
    cx = Math.floor(x / cs),
    cz = Math.floor(z / cs);
  const out: number[] = [];
  for (let dx = -cr; dx <= cr; dx++)
    for (let dz = -cr; dz <= cr; dz++)
      for (const it of cells.get((cx + dx) * 10007 + (cz + dz)) ?? []) out.push(it.id);
  return out;
}

describe('SpatialHash query reuse', () => {
  test('repeated and shrinking queries around one point match a fresh scan, also after inserts', () => {
    let s = 12345;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const grid = new SpatialHash<P>(8);
    const items: P[] = [];
    for (let i = 0; i < 3000; i++) {
      const it = { id: i, position: { x: (rnd() - 0.5) * 400, z: (rnd() - 0.5) * 400 } };
      items.push(it);
      grid.insert(it);
    }
    let hits = 0;
    for (let q = 0; q < 400; q++) {
      const x = (rnd() - 0.5) * 400,
        z = (rnd() - 0.5) * 400;
      for (const r of [60, 48, 48, 40, 32, 32, 8, 0.5, 64]) {
        expect(grid.query(x, z, r).map((p) => p.id)).toEqual(reference(items, 8, x, z, r));
        hits++;
      }
      if (q % 7 === 0) {
        const it = { id: items.length, position: { x, z } };
        items.push(it);
        grid.insert(it);
        expect(grid.query(x, z, 16).map((p) => p.id)).toEqual(reference(items, 8, x, z, 16));
      }
    }
    // Items that move after insertion stay in their insert-time cell, exactly like a fresh scan of the grid.
    for (const it of items) it.position.x += 1000;
    expect(grid.query(0, 0, 40).length).toBeGreaterThan(0);
    expect(hits).toBe(3600);
  });
});
