/**
 * Lineage & kinship (CONTRACTS V9 — "offspring and relations… emerging, living, raising, dying").
 *
 * A bounded, allocation-disciplined record of who begat whom. Each birth mints a monotonic lineage
 * id and stores its (≤2) parents, generation depth, and birth tick into fixed-capacity typed arrays
 * indexed by `id % capacity` — so an ever-churning 10k-entity world keeps a rolling window of
 * recent ancestry at O(1) per birth and O(depth) per kinship query, never growing unbounded. Ids
 * older than the window decay to "genesis/unknown" (generation 0, no parents), which is the correct
 * semantics for a forgotten deep ancestor.
 *
 * Determinism: this structure performs NO randomness and NO clock reads — the caller passes the
 * seeded sim tick. Pure leaf module (no imports), unit-testable under `bun test`. It powers the
 * relations graph, generation telemetry, and tribe-affinity-by-kinship that the social economy and
 * faction systems read.
 */

/** No-parent sentinel (a genesis organism, or a parent that has decayed out of the window). */
export const NO_PARENT = -1;

/** A snapshot of one lineage record (returned by {@link Lineage.info}); `gen` 0 = genesis. */
export interface LineageInfo {
  id: number;
  parentA: number;
  parentB: number;
  gen: number;
  bornTick: number;
}

export class Lineage {
  private readonly cap: number;
  private readonly parentA: Int32Array;
  private readonly parentB: Int32Array;
  private readonly gen: Int32Array;
  private readonly born: Float64Array;
  private nextId = 0;
  private deepest = 0;

  /** `capacity` = how many recent lineage records to retain (older ids decay to genesis). */
  constructor(capacity: number) {
    this.cap = Math.max(1, capacity);
    this.parentA = new Int32Array(this.cap).fill(NO_PARENT);
    this.parentB = new Int32Array(this.cap).fill(NO_PARENT);
    this.gen = new Int32Array(this.cap);
    this.born = new Float64Array(this.cap);
  }

  /** True when `id` is a real, still-remembered record (not decayed out of the window). */
  private live(id: number): boolean {
    return id >= 0 && id < this.nextId && id >= this.nextId - this.cap;
  }

  /** Total births ever recorded (also the next id to be minted). */
  get total(): number {
    return this.nextId;
  }

  /** Deepest generation ever reached — a "how far has evolution climbed" telemetry signal. */
  get maxGeneration(): number {
    return this.deepest;
  }

  /**
   * Generation of `id`: 0 for genesis or any decayed/unknown id, else its stored depth. O(1).
   */
  generationOf(id: number): number {
    return this.live(id) ? (this.gen[id % this.cap] ?? 0) : 0;
  }

  /**
   * Record a birth from up to two parents (pass {@link NO_PARENT} for genesis / single-parent
   * budding). Returns the new lineage id. Generation = max(parent generations) + 1, or 0 for
   * genesis. O(1), allocation-free. `tick` is the seeded sim frame/time the caller supplies.
   */
  birth(parentA: number, parentB: number, tick: number): number {
    const id = this.nextId++;
    const slot = id % this.cap;
    this.parentA[slot] = parentA;
    this.parentB[slot] = parentB;
    const hasParent = parentA !== NO_PARENT || parentB !== NO_PARENT;
    const g = hasParent ? Math.max(this.generationOf(parentA), this.generationOf(parentB)) + 1 : 0;
    this.gen[slot] = g;
    this.born[slot] = tick;
    if (g > this.deepest) this.deepest = g;
    return id;
  }

  /** Full record for `id`, or `null` if it has decayed out of the window. O(1). */
  info(id: number): LineageInfo | null {
    if (!this.live(id)) return null;
    const slot = id % this.cap;
    return {
      id,
      parentA: this.parentA[slot] ?? NO_PARENT,
      parentB: this.parentB[slot] ?? NO_PARENT,
      gen: this.gen[slot] ?? 0,
      bornTick: this.born[slot] ?? 0,
    };
  }

  /**
   * True if `ancestor` appears in `descendant`'s ancestry within `maxDepth` generations
   * (breadth-bounded walk up both parent links). `maxDepth` caps work for the per-frame-adjacent
   * callers. O(2^maxDepth) worst case — keep `maxDepth` small (≤ 8). Self counts as related.
   */
  isAncestor(ancestor: number, descendant: number, maxDepth = 6): boolean {
    if (ancestor === NO_PARENT || descendant === NO_PARENT) return false;
    if (ancestor === descendant) return true;
    // Iterative bounded DFS over the (≤2)-ary parent tree.
    let frontier: number[] = [descendant];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const node of frontier) {
        if (!this.live(node)) continue;
        const slot = node % this.cap;
        const pa = this.parentA[slot] ?? NO_PARENT;
        const pb = this.parentB[slot] ?? NO_PARENT;
        if (pa === ancestor || pb === ancestor) return true;
        if (pa !== NO_PARENT) next.push(pa);
        if (pb !== NO_PARENT) next.push(pb);
      }
      frontier = next;
    }
    return false;
  }

  /**
   * Whether `a` and `b` share a common ancestor within `maxDepth` generations (a symmetric
   * relatedness test for siblings/cousins). Also true when one is an ancestor of the other, or
   * they are the same id. O(depth · ancestors). Allocation: small scratch sets (a relation query,
   * not a per-entity-per-frame call — run it on a slow cadence).
   */
  related(a: number, b: number, maxDepth = 6): boolean {
    if (a === NO_PARENT || b === NO_PARENT) return false;
    if (a === b) return true;
    const ancestorsA = this.collectAncestors(a, maxDepth);
    if (ancestorsA.has(b)) return true;
    // Walk b's ancestry; a hit against A's ancestor set is a shared ancestor.
    let frontier: number[] = [b];
    for (let depth = 0; depth <= maxDepth && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const node of frontier) {
        if (ancestorsA.has(node)) return true;
        if (!this.live(node)) continue;
        const slot = node % this.cap;
        const pa = this.parentA[slot] ?? NO_PARENT;
        const pb = this.parentB[slot] ?? NO_PARENT;
        if (pa !== NO_PARENT) next.push(pa);
        if (pb !== NO_PARENT) next.push(pb);
      }
      frontier = next;
    }
    return false;
  }

  /** Collect `id` plus its ancestors within `maxDepth` into a Set. Helper for {@link related}. */
  private collectAncestors(id: number, maxDepth: number): Set<number> {
    const seen = new Set<number>([id]);
    let frontier: number[] = [id];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const node of frontier) {
        if (!this.live(node)) continue;
        const slot = node % this.cap;
        const pa = this.parentA[slot] ?? NO_PARENT;
        const pb = this.parentB[slot] ?? NO_PARENT;
        if (pa !== NO_PARENT && !seen.has(pa)) {
          seen.add(pa);
          next.push(pa);
        }
        if (pb !== NO_PARENT && !seen.has(pb)) {
          seen.add(pb);
          next.push(pb);
        }
      }
      frontier = next;
    }
    return seen;
  }
}
