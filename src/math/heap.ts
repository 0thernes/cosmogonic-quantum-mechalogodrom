/**
 * Array-backed binary heap and a bounded top-K selector.
 *
 * A binary heap is the textbook priority-queue structure: a complete binary tree flattened into
 * an array where index `i`'s children are `2i+1` and `2i+2`. `push`/`pop` are O(log n) (one
 * sift-up / sift-down along the tree height ⌊log₂ n⌋); `peek` is O(1).
 *
 * The repo's first use is {@link selectTopK}: pulling the K highest-ranked entities out of a
 * PageRank result without paying for a full O(V log V) sort of all V nodes. A bounded min-heap of
 * size K keeps the K best seen so far with its WORST kept item at the root, so each of the V
 * candidates costs at most one O(log K) sift — O(V log K) total, and for K ≪ V (here K = 20,
 * V ≤ 10,000) that is the difference between ~13 and ~4.3 comparisons per element.
 *
 * Determinism: the heap imposes a total order through its comparator and performs no I/O, no
 * `Math.random`, and no time reads, so identical inputs yield identical output. `selectTopK`'s
 * comparator must be a strict weak ordering with deterministic tie-breaking (see its doc) for the
 * result SET to match a stable full sort exactly.
 */

/**
 * `less(a, b)` returns `true` when `a` should sit closer to the root than `b` — i.e. `a` has the
 * higher priority. With a "smaller-is-higher-priority" comparator the root is the minimum (a
 * min-heap); invert it for a max-heap.
 */
export type Less<T> = (a: T, b: T) => boolean;

/**
 * Generic binary heap over a caller-supplied {@link Less} comparator. Array-backed, so the only
 * allocations are the backing array's own growth steps; `clear()` keeps the capacity for reuse,
 * letting a long-lived heap run allocation-free in steady state.
 *
 * The root (`peek()`) is always the highest-priority element under `less`. `pop()` removes it;
 * `replaceRoot()` swaps it out in a single sift (the fused pop-then-push used by bounded top-K).
 */
export class BinaryHeap<T> {
  /** Complete-tree array: node `i`'s children live at `2i+1` and `2i+2`. */
  private readonly items: T[] = [];
  private readonly less: Less<T>;

  constructor(less: Less<T>) {
    this.less = less;
  }

  /** Number of elements currently in the heap. O(1). */
  get size(): number {
    return this.items.length;
  }

  /** True when the heap holds no elements. O(1). */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Empty the heap, retaining backing-array capacity for reuse. O(1) (no per-element work). */
  clear(): void {
    this.items.length = 0;
  }

  /**
   * The highest-priority element without removing it, or `undefined` when empty. O(1).
   */
  peek(): T | undefined {
    return this.items[0];
  }

  /** Insert an element, sifting it up to its ordered position. O(log n). */
  push(item: T): void {
    const items = this.items;
    items.push(item);
    this.siftUp(items.length - 1);
  }

  /**
   * Remove and return the root (highest-priority element), or `undefined` when empty. O(log n):
   * the last element is moved to the root and sifted down.
   */
  pop(): T | undefined {
    const items = this.items;
    const n = items.length;
    if (n === 0) return undefined;
    const root = items[0];
    const last = items.pop()!; // n > 0, so pop() yields a T
    if (n > 1) {
      items[0] = last;
      this.siftDown(0);
    }
    return root;
  }

  /**
   * Replace the root with `item` in a single sift-down and return the old root. Equivalent to
   * `pop()` then `push(item)` but with one O(log n) reshuffle instead of two. On an EMPTY heap it
   * simply inserts `item` and returns `undefined`. This is the core of the bounded top-K loop:
   * "if the candidate beats the current worst-kept, evict the worst and admit the candidate".
   */
  replaceRoot(item: T): T | undefined {
    const items = this.items;
    if (items.length === 0) {
      items.push(item);
      return undefined;
    }
    const root = items[0];
    items[0] = item;
    this.siftDown(0);
    return root;
  }

  /** Copy the heap's elements (unordered) into a fresh array. O(n). */
  toArray(): T[] {
    return this.items.slice();
  }

  /** Bubble the element at `i` toward the root until the heap property holds. O(log n). */
  private siftUp(i: number): void {
    const items = this.items;
    const item = items[i]!; // i is a valid index supplied by push()
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const pv = items[parent]!; // parent < i, in range
      if (!this.less(item, pv)) break;
      items[i] = pv;
      i = parent;
    }
    items[i] = item;
  }

  /** Push the element at `i` toward the leaves until the heap property holds. O(log n). */
  private siftDown(i: number): void {
    const items = this.items;
    const n = items.length;
    const item = items[i]!; // i is a valid index supplied by callers
    for (;;) {
      let child = 2 * i + 1;
      if (child >= n) break;
      const right = child + 1;
      // Pick the higher-priority child to swap with (keeps the sibling subtree ordered).
      if (right < n && this.less(items[right]!, items[child]!)) child = right;
      const cv = items[child]!; // child < n, in range
      if (!this.less(cv, item)) break;
      items[i] = cv;
      i = child;
    }
    items[i] = item;
  }
}

/**
 * Return up to `k` items from `items`, the ones ranked highest by `isBetter`, where
 * `isBetter(a, b) === true` means "a ranks strictly above b". For the result SET to match the
 * first `k` of a stable descending sort EXACTLY, `isBetter` must be a strict total order — break
 * value ties with a stable key (e.g. ascending index) so no two distinct items compare equal.
 *
 * Cost: O(n log k) time, O(k) space — a bounded min-heap of size `k` keeps the best-so-far with
 * its WORST member at the root, and each later candidate that beats that root evicts it in one
 * O(log k) `replaceRoot`. Returns a new array (length `min(k, n)`); element ORDER within it is
 * unspecified (heap order), so callers that need ranked order should sort the small result.
 *
 * Degenerate `k`: `k <= 0` ⇒ `[]`; `k >= n` ⇒ a shallow copy of all items (still only the items
 * that exist). The input array is never mutated.
 */
export function selectTopK<T>(items: readonly T[], k: number, isBetter: Less<T>): T[] {
  const n = items.length;
  if (k <= 0 || n === 0) return [];
  if (k >= n) return items.slice();
  // Root = the WORST of the kept set: `a` sits above `b` in this heap when `b` is better than `a`.
  const heap = new BinaryHeap<T>((a, b) => isBetter(b, a));
  for (let i = 0; i < k; i++) heap.push(items[i]!); // i < k <= n
  for (let i = k; i < n; i++) {
    const candidate = items[i]!; // i < n
    // peek() is defined: the heap holds exactly k >= 1 items here.
    if (isBetter(candidate, heap.peek()!)) heap.replaceRoot(candidate);
  }
  return heap.toArray();
}
