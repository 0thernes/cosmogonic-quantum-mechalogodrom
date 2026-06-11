/**
 * The 25 sorting-field algorithms — the original 20 (port of legacy `ALGOS`,
 * lines 206-228, behaviorally honest names preserved verbatim) plus 5 added in
 * V5.3 RESONANCE, each with a DISTINCT spatial swap signature.
 *
 * Each `step` is a pure single-step swap PROPOSAL over the live prefix
 * `values[0..length)` of a pre-allocated Float32Array (Known Bug 4 fix: the
 * legacy code copied entity sort values into a fresh `{length}` object every
 * frame; the new signature reads the shared buffer + live length directly and
 * never touches indices ≥ `length`). Steps never mutate `values` — the caller
 * applies the returned swap to entities and buffer alike.
 *
 * Hot path: every step is O(length) worst case and allocation-free except for
 * the returned `[a, b]` tuple, which the contract explicitly permits and
 * callers treat as transient.
 *
 * V5.3 additions (distinct spatial signatures, none duplicating the first 20):
 *  - TIM RUN MERGE: galloping inter-run boundary repair across power-growing
 *    runs (boundary index walks `2^k`-sized blocks — diagonal "seam" signature).
 *  - BITONIC NETWORK: true Batcher compare-exchange — partner = `j ^ stride`
 *    over halving power-of-two strides, both directions (symmetric butterfly,
 *    distinct from BITONIC MESH's one-sided `j^(k>>1)` heuristic).
 *  - PATIENCE BUCKET: value-addressed bucket phase — partner chosen by which
 *    `1/B` value band an element belongs to (long jumps keyed by magnitude, not
 *    position — a scatter signature no positional field produces).
 *  - BRICK TRANSPOSE: odd-even transposition with a fixed parity PER PASS that
 *    sweeps the whole row before flipping (synchronous brick-wall bands; ODD-
 *    EVEN PULSE alternates parity every call, this holds a parity for n calls).
 *  - PREFIX PANCAKE: front-anchored prefix-reversal homing the window MINIMUM
 *    onto index 0 over a GROWING horizon (head-pinned flips — the mirror image
 *    of PANCAKE FLIP, which drives the window max toward an expanding suffix).
 */
import type { SortAlgo } from '../types';

/**
 * Unchecked typed-array read. O(1).
 * Invariant: every call site bounds `idx` to [0, length) via modulo / min
 * arithmetic, and `length` ≤ `values.length` by the caller's contract.
 */
function at(values: Float32Array, idx: number): number {
  return values[idx]!;
}

/**
 * The 25 sorting-field algorithms (20 legacy + 5 V5.3). Indexed by
 * `SimState.algoIdx`; legacy 0..19 keep their exact order and names so the
 * frozen-reference determinism tests stay pinned, the 5 new fields follow.
 */
export const ALGOS: readonly SortAlgo[] = [
  {
    name: 'BUBBLE FIELD',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % (length - 1);
      return at(values, j) > at(values, j + 1) ? [j, j + 1] : null;
    },
  },
  {
    name: 'SELECTION SWEEP',
    step(values, length, i) {
      if (length < 2) return null;
      const s = i % length;
      let m = s;
      for (let k = s + 1; k < length; k++) {
        if (at(values, k) < at(values, m)) m = k;
      }
      return m !== s ? [s, m] : null;
    },
  },
  {
    name: 'INSERTION PUSH',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      return j > 0 && at(values, j) < at(values, j - 1) ? [j - 1, j] : null;
    },
  },
  {
    name: 'MERGE IMPULSE',
    step(values, length, i) {
      if (length < 2) return null;
      const s = 2 << (i % 4);
      const st = (i * s) % length;
      const m = Math.min(st + Math.floor(s / 2), length);
      return m > 0 && m < length && at(values, m) < at(values, m - 1) ? [m - 1, m] : null;
    },
  },
  {
    name: 'PIVOT FIELD',
    step(values, length, i) {
      if (length < 2) return null;
      const p = at(values, length - 1);
      const j = i % length;
      return j < length - 1 && at(values, j) > p ? [j, length - 1] : null;
    },
  },
  {
    name: 'HEAP SIFT',
    step(values, length, i) {
      if (length < 2) return null;
      const n = length;
      const h = Math.max(1, (n / 2) | 0);
      const j = i % h;
      const l = 2 * j + 1;
      const r = 2 * j + 2;
      let g = j;
      if (l < n && at(values, l) > at(values, g)) g = l;
      if (r < n && at(values, r) > at(values, g)) g = r;
      return g !== j ? [j, g] : null;
    },
  },
  {
    name: 'SHELL GAP',
    step(values, length, i) {
      if (length < 2) return null;
      // Legacy `[5,3,1][i%3]` without the per-call array literal (hot path).
      const m3 = i % 3;
      const g = m3 === 0 ? 5 : m3 === 1 ? 3 : 1;
      const j = (i * g) % length;
      return j + g < length && at(values, j) > at(values, j + g) ? [j, j + g] : null;
    },
  },
  {
    name: 'COCKTAIL WAVE',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % (length - 1);
      const d = Math.floor(i / length) % 2;
      const k = d ? length - 2 - j : j;
      return k >= 0 && k < length - 1 && at(values, k) > at(values, k + 1) ? [k, k + 1] : null;
    },
  },
  {
    name: 'COMB SWEEP',
    step(values, length, i) {
      if (length < 2) return null;
      let g = Math.floor(length / 1.3);
      for (let k = 0; k < i % 3; k++) g = Math.max(1, Math.floor(g / 1.3));
      const j = (i * g) % length;
      return j + g < length && at(values, j) > at(values, j + g) ? [j, j + g] : null;
    },
  },
  {
    name: 'GNOME CRAWL',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      return j > 0 && at(values, j) < at(values, j - 1) ? [j - 1, j] : null;
    },
  },
  {
    name: 'CYCLE PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const c = i % length;
      let p = 0;
      for (let k = c + 1; k < length; k++) {
        if (at(values, k) < at(values, c)) p++;
      }
      return p > 0 && c !== p % length ? [c, p % length] : null;
    },
  },
  {
    name: 'PANCAKE FLIP',
    step(values, length, i) {
      if (length < 2) return null;
      const n = Math.max(2, length - (i % length));
      let m = 0;
      for (let k = 1; k < n; k++) {
        if (at(values, k) > at(values, m)) m = k;
      }
      return m !== n - 1 ? [m, n - 1] : null;
    },
  },
  {
    name: 'BITONIC MESH',
    step(values, length, i) {
      if (length < 2) return null;
      const k = 2 << (i % 4);
      const j = (i * 2) % length;
      const p = j ^ (k >> 1);
      return p > 0 && p < length && j < p && at(values, j) > at(values, p) ? [j, p] : null;
    },
  },
  {
    name: 'STOOGE DRIFT',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const e = Math.min(j + 2, length - 1);
      return at(values, j) > at(values, e) ? [j, e] : null;
    },
  },
  {
    name: 'ODD-EVEN PULSE',
    step(values, length, i) {
      if (length < 2) return null;
      const p = i % 2;
      for (let j = p; j < length - 1; j += 2) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    name: 'COUNT PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const t = (i + 1) % length;
      return j !== t && at(values, j) > at(values, t) ? [j, t] : null;
    },
  },
  {
    name: 'RADIX PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const d = Math.pow(10, i % 3);
      const j = i % length;
      const k = (j + 1) % length;
      return Math.floor(at(values, j) / d) % 10 > Math.floor(at(values, k) / d) % 10
        ? [j, k]
        : null;
    },
  },
  {
    name: 'RUN MERGE',
    step(values, length, i) {
      if (length < 2) return null;
      const rs = 4;
      const s = (i * rs) % length;
      for (let j = s; j < Math.min(s + rs - 1, length - 1); j++) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    name: 'HOLE SCATTER',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const k = (j + 3) % length;
      return at(values, j) > at(values, k) ? [j, k] : null;
    },
  },
  {
    name: 'STRAND PULL',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      if (j > 0 && at(values, j) < at(values, j - 1)) return [j - 1, j];
      return j < length - 1 && at(values, j) > at(values, j + 1) ? [j, j + 1] : null;
    },
  },
  {
    // V5.3 — Timsort-flavoured run merge. Runs double in width as `i` advances
    // (`w = 2^(1 + (i>>3 & 3))` ∈ {2,4,8,16}); the step gallops along the seam
    // between two adjacent width-`w` runs and repairs the first out-of-order
    // boundary pair it finds. Signature: a diagonal seam that slides and widens,
    // unlike RUN MERGE's fixed 4-wide windows or MERGE IMPULSE's single midpoint.
    name: 'TIM RUN MERGE',
    step(values, length, i) {
      if (length < 2) return null;
      const w = 2 << ((i >> 3) & 3); // 2,4,8,16
      const base = (i * w) % length;
      // Walk up to `w` boundary candidates inside the live prefix; the run pair
      // is [base, base+w) | [base+w, base+2w), so the seam sits at base+w.
      const start = base + w - 1;
      const end = Math.min(base + 2 * w - 1, length - 1);
      for (let j = Math.max(start - w + 1, 0); j < end; j++) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    // V5.3 — Batcher bitonic compare-exchange network. Partner is the true XOR
    // neighbour `p = j ^ stride` over a halving power-of-two stride schedule
    // (`stride = 2^(3 - (i & 3))` ∈ {8,4,2,1}); the ascending/descending sense
    // flips per bitonic block (`(j / (stride<<1)) & 1`). Symmetric butterfly:
    // every index can reach a far partner in BOTH directions — distinct from
    // BITONIC MESH, which only ever proposed the lower-index `j^(k>>1)` partner.
    name: 'BITONIC NETWORK',
    step(values, length, i) {
      if (length < 2) return null;
      const stride = 8 >> (i & 3) || 1; // 8,4,2,1
      const j = (i * 7 + 1) % length;
      const p = j ^ stride;
      if (p >= length || p === j) return null;
      const lo = j < p ? j : p;
      const hi = j < p ? p : j;
      // Ascending block ⇒ keep min low; descending block ⇒ keep max low.
      const ascending = ((lo / (stride << 1)) & 1) === 0;
      const outOfOrder = ascending
        ? at(values, lo) > at(values, hi)
        : at(values, lo) < at(values, hi);
      return outOfOrder ? [lo, hi] : null;
    },
  },
  {
    // V5.3 — Patience/bucket phase: VALUE-addressed, not position-addressed.
    // The active element's magnitude picks a target band b ∈ [0, B); the step
    // pulls it toward the slot block that band owns whenever it currently sits
    // in the wrong band region. Jumps are keyed by value, producing a scatter
    // signature (long, magnitude-driven hops) that no positional field emits.
    // Perpetual field: the band map cycles over all indices, so for distinct
    // values it admits no global fixpoint — documented in the tests.
    name: 'PATIENCE BUCKET',
    step(values, length, i) {
      if (length < 2) return null;
      const buckets = length < 8 ? length : 8;
      const span = length / buckets;
      const j = i % length;
      const v = at(values, j);
      // Map value (assumed roughly [0,100) sort-val range, clamped) to a band.
      const band =
        v <= 0 ? 0 : v >= 100 ? buckets - 1 : Math.min(buckets - 1, ((v / 100) * buckets) | 0);
      // The band's home slot for this rotation of `i`.
      const home = Math.min(length - 1, (band * span + (i % Math.max(1, span | 0))) | 0);
      if (home === j) return null;
      // Only propose when the swap is order-improving for THIS pair, so the
      // field still strictly cuts inversions on the trajectory.
      const lo = j < home ? j : home;
      const hi = j < home ? home : j;
      return at(values, lo) > at(values, hi) ? [lo, hi] : null;
    },
  },
  {
    // V5.3 — Brick-wall odd-even transposition with a parity HELD for a full
    // pass. `pass = floor(i / max(1, length-1))` toggles parity once per sweep;
    // within a sweep the same parity's brick layer is scanned left→right and the
    // first disordered brick is repaired. Synchronous banded mortar lines that
    // hold, then flip — distinct from ODD-EVEN PULSE, whose parity flips EVERY
    // single call (`i % 2`) rather than every `length-1` calls.
    name: 'BRICK TRANSPOSE',
    step(values, length, i) {
      if (length < 2) return null;
      const passLen = length - 1;
      const parity = (Math.floor(i / passLen) & 1) as 0 | 1;
      for (let j = parity; j < length - 1; j += 2) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    // V5.3 — Front-anchored prefix-reversal pancake with a GROWING horizon: the
    // working window expands from the left as `i` advances
    // (`h = 2 + (i % (length-1))`), and the step homes the window MINIMUM to the
    // front via the boundary swap `[0, m]`. Every proposal is front-anchored at
    // index 0 (nested flips collapsing onto the head), the mirror image of
    // PANCAKE FLIP, which drives the window MAX toward an expanding suffix tail.
    // The swap is order-improving (front should hold the smaller value), so the
    // field strictly reduces inversions while keeping its distinct head-pinned
    // flip signature.
    name: 'PREFIX PANCAKE',
    step(values, length, i) {
      if (length < 2) return null;
      const h = 2 + (i % (length - 1)); // window width 2..length, grows with i
      let m = 0;
      for (let k = 1; k < h; k++) {
        if (at(values, k) < at(values, m)) m = k;
      }
      // Bring the window minimum to the front whenever the head is larger —
      // a single head-pinned boundary swap that begins the prefix flip.
      return m !== 0 && at(values, 0) > at(values, m) ? [0, m] : null;
    },
  },
];
