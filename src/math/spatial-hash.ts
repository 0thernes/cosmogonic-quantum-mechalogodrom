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
interface CellQueryRecord<T> {
  readonly cx: number;
  readonly cz: number;
  readonly cr: number;
  readonly cells: T[][];
  generation: number;
}

type CellQueryBucket<T> = CellQueryRecord<T> | CellQueryRecord<T>[];

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
  /**
   * Generation-cached live-cell views. Many dense-world entities occupy the same source cell and
   * therefore have the exact same query-cell sequence; build that sequence once per grid rebuild.
   */
  private readonly cellQueries = new Map<number, CellQueryBucket<T>>();
  /** Records populated in the current generation, so clear() invalidates only live borrowed views. */
  private readonly usedCellQueries: CellQueryRecord<T>[] = [];
  private cellQueryGeneration = 1;

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
    this.result.length = 0;
    for (
      let record = this.usedCellQueries.pop();
      record !== undefined;
      record = this.usedCellQueries.pop()
    ) {
      record.cells.length = 0;
      record.generation = 0;
    }
    this.cellQueryGeneration++;
    // At 60 clears/s this branch is millions of years away, but keeping the stamp total makes a
    // stale cached view impossible even after Number.MAX_SAFE_INTEGER.
    if (!Number.isSafeInteger(this.cellQueryGeneration)) {
      for (const bucket of this.cellQueries.values()) {
        if (Array.isArray(bucket)) {
          for (const record of bucket) record.generation = 0;
        } else {
          bucket.generation = 0;
        }
      }
      this.cellQueryGeneration = 1;
    }
  }

  /**
   * Insert an item under its current XZ position. O(1) amortized; allocation-free once the pool
   * is warm. Items that move afterwards must be re-inserted on the next rebuild (legacy
   * behavior — callers must rebuild at the cadence required by their exactness contract).
   */
  insert(item: T): void {
    const cs = this.cellSize;
    const kx = Math.floor(item.position.x / cs);
    const kz = Math.floor(item.position.z / cs);
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
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
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

  /**
   * Bounded, nearest-cells-first variant of {@link query}: visits the centre cell, then each square
   * ring of cells outward (fixed order), and stops as soon as `budget` items are collected or the
   * radius is exhausted. A dense colony can pack hundreds of items into one cell, so each cell is
   * read as a ring buffer starting at `salt mod length`: callers pass a per-querier salt (e.g. their
   * index) and different queriers sample different members instead of all seeing the same first
   * few. Deterministic for a given grid and salt. Callers that need only nearest neighbours and
   * saturating counts get them in O(budget + cells). Same shared result buffer and lifetime rule as
   * {@link query}; callers still filter by true distance. Allocation-free.
   */
  queryNearFirst(x: number, z: number, radius: number, budget: number, salt = 0): readonly T[] {
    const cs = this.cellSize;
    const out = this.result;
    out.length = 0;
    const cr = Math.ceil(radius / cs);
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
    const s = salt >>> 0;
    if (this.takeCell(cx, cz, budget, s)) return out;
    for (let k = 1; k <= cr; k++) {
      for (let d = -k; d <= k; d++) {
        if (this.takeCell(cx + d, cz - k, budget, s) || this.takeCell(cx + d, cz + k, budget, s))
          return out;
      }
      for (let d = -k + 1; d <= k - 1; d++) {
        if (this.takeCell(cx - k, cz + d, budget, s) || this.takeCell(cx + k, cz + d, budget, s))
          return out;
      }
    }
    return out;
  }

  /** Append a cell's items (from `salt mod length`, wrapping) until the buffer holds `budget`. */
  private takeCell(kx: number, kz: number, budget: number, salt: number): boolean {
    const cell = this.cells.get(kx * 10007 + kz);
    const out = this.result;
    if (cell !== undefined && cell.length > 0) {
      const n = cell.length;
      const room = budget - out.length;
      const count = n < room ? n : room;
      let i = salt % n;
      for (let c = 0; c < count; c++) {
        out.push(cell[i]!);
        i = i + 1 === n ? 0 : i + 1;
      }
    }
    return out.length >= budget;
  }

  /**
   * Return the non-empty live cells overlapping the same query square and in the exact same
   * `dx -> dz -> item` traversal order as {@link query}. The outer array is a BORROWED cached view
   * valid until {@link clear}; every inner array is borrowed from this hash and neither level may be
   * mutated by the consumer. Entities occupying the same source cell and using the same radius share
   * one view, so dense high-tier consumers pay the map sweep once per occupied cell per rebuild—not
   * once per entity. Unlike `query()`, this performs no O(k) candidate-reference copy. O(cells) on a
   * cold cell and O(1) on a same-generation cache hit; allocation-free after spatial cells warm up.
   */
  queryCells(x: number, z: number, radius: number): readonly (readonly T[])[] {
    const cs = this.cellSize;
    const cr = Math.ceil(radius / cs);
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
    // Fast numeric key; every hit is validated against all three coordinates, so even an IEEE/key
    // collision only creates a tiny bucket and can never return the wrong view.
    const key = (cx * 10007 + cz) * 257 + cr;
    const bucket = this.cellQueries.get(key);
    let record: CellQueryRecord<T> | undefined;
    if (bucket !== undefined) {
      if (Array.isArray(bucket)) {
        for (let i = 0; i < bucket.length; i++) {
          const candidate = bucket[i];
          if (candidate && candidate.cx === cx && candidate.cz === cz && candidate.cr === cr) {
            record = candidate;
            break;
          }
        }
      } else if (bucket.cx === cx && bucket.cz === cz && bucket.cr === cr) {
        record = bucket;
      }
    }
    if (record === undefined) {
      record = { cx, cz, cr, cells: [], generation: 0 };
      if (bucket === undefined) this.cellQueries.set(key, record);
      else if (Array.isArray(bucket)) bucket.push(record);
      else this.cellQueries.set(key, [bucket, record]);
    }
    if (record.generation === this.cellQueryGeneration) return record.cells;
    const out = record.cells;
    out.length = 0;
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        const cell = this.cells.get((cx + dx) * 10007 + (cz + dz));
        if (cell !== undefined) out.push(cell);
      }
    }
    record.generation = this.cellQueryGeneration;
    this.usedCellQueries.push(record);
    return out;
  }
}
