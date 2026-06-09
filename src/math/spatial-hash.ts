/**
 * Uniform-grid spatial hash over the XZ plane.
 *
 * Port of the legacy `SG` module (legacy/cosmogonic-quantum-mechalogodrom.html lines 358-367):
 * same default cell size (8), same `kx * 10007 + kz` cell key, same truncating `| 0` cell
 * coordinates, and the cell-array pool is kept so steady-state rebuilds allocate nothing.
 *
 * Known Bug 5 fix: legacy `SG.query` allocated a fresh result array per call (hundreds per
 * frame). `query()` now fills one shared instance buffer — see its doc for the lifetime rule.
 */

/**
 * Spatial hash for items carrying a mutable `{ position: { x, z } }` (THREE.Object3D satisfies
 * this). insert is O(1) amortized; query is O(cells + k) where k = items in the visited cells.
 *
 * Usage per frame: `clear()`, `insert()` everything, then any number of `query()` calls.
 */
export class SpatialHash<T extends { position: { x: number; z: number } }> {
  /** Cell side length in world units (legacy `CS`). */
  private readonly cellSize: number;
  /** Live cells keyed by `kx * 10007 + kz` (legacy key formula). */
  private readonly cells = new Map<number, T[]>();
  /** Cell arrays currently in the map — lets clear() recycle without iterating the Map. */
  private readonly used: T[][] = [];
  /** Pool of empty cell arrays (legacy `pool`) — reused across clear() cycles. */
  private readonly pool: T[][] = [];
  /** Shared query result buffer (Known Bug 5 fix). Contents valid only until the next query(). */
  private readonly result: T[] = [];

  constructor(cellSize = 8) {
    this.cellSize = cellSize;
  }

  /**
   * Empty every cell, recycling cell arrays into the pool. O(c) where c = live cells;
   * allocation-free (the legacy version allocated an `Object.keys` array plus a fresh cell map
   * per clear).
   */
  clear(): void {
    for (let cell = this.used.pop(); cell !== undefined; cell = this.used.pop()) {
      cell.length = 0;
      this.pool.push(cell);
    }
    this.cells.clear();
  }

  /**
   * Insert an item under its current XZ position. O(1) amortized; allocation-free once the pool
   * is warm. Items that move afterwards must be re-inserted on the next rebuild (legacy
   * behavior — the grid is rebuilt every other frame).
   */
  insert(item: T): void {
    const cs = this.cellSize;
    const kx = (item.position.x / cs) | 0;
    const kz = (item.position.z / cs) | 0;
    const key = kx * 10007 + kz;
    let cell = this.cells.get(key);
    if (cell === undefined) {
      cell = this.pool.pop() ?? [];
      this.cells.set(key, cell);
      this.used.push(cell);
    }
    cell.push(item);
  }

  /**
   * Collect every item in the grid cells overlapping the square of half-width `radius` centred
   * on (x, z) — a cheap superset of the true circle, exactly like legacy `SG.query`; callers do
   * their own distance filtering.
   *
   * Returns a SHARED buffer valid only until the next query() call (Known Bug 5 fix) — copy it
   * if you must hold results across queries. O(cells + k) where k = items in the visited cells;
   * allocation-free.
   */
  query(x: number, z: number, radius: number): readonly T[] {
    const cs = this.cellSize;
    const out = this.result;
    out.length = 0;
    const cr = Math.ceil(radius / cs);
    const cx = (x / cs) | 0;
    const cz = (z / cs) | 0;
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        const cell = this.cells.get((cx + dx) * 10007 + (cz + dz));
        if (cell !== undefined) {
          for (let i = 0; i < cell.length; i++) {
            // Invariant: i < cell.length and cells are dense arrays of T — index is in range.
            out.push(cell[i]!);
          }
        }
      }
    }
    return out;
  }
}
