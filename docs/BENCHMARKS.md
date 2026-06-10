# Benchmarks

Measured results for the hot-path primitives. Reproduce with `bun run bench`
(or any single suite, e.g. `bun bench/spatial-hash.bench.ts`).

## Environment

|         |                                                               |
| ------- | ------------------------------------------------------------- |
| Date    | 2026-06-09                                                    |
| CPU     | Intel Core Ultra 9 275HX (~3.46 GHz observed)                 |
| Runtime | Bun 1.3.x (x64-win32), mitata 1.0.34                          |
| Inputs  | Deterministic via `mulberry32(42)` — identical data every run |

## Results

### RNG (`src/math/rng.ts`)

| Benchmark                                        | avg/iter | Notes                             |
| ------------------------------------------------ | -------- | --------------------------------- |
| `Math.random()` (baseline — banned in sim logic) | 737 ps   | engine intrinsic                  |
| `mulberry32(42)()`                               | 1.03 ns  | +0.3 ns buys full reproducibility |
| `hashSeed('cosmogonic-quantum-mechalogodrom')`   | 35.2 ns  | one-shot, boot only               |

Determinism costs ~40% over the native RNG in relative terms but is sub-nanosecond
in absolute terms — invisible against any frame budget.

### Scalar math (`src/math/scalar.ts`)

| Benchmark                       | avg/iter |
| ------------------------------- | -------- |
| `lerp(a, b, t)`                 | 0.97 ns  |
| `clamp(v, -10, 10)`             | 1.78 ns  |
| `dist2(ax, ay, az, bx, by, bz)` | 4.06 ns  |
| `dist2XZ(ax, az, bx, bz)`       | 2.15 ns  |

### Spatial hash (`src/math/spatial-hash.ts`, 1000 items, cell size 8)

| Benchmark                                    | avg/iter | Per-frame budget share\*     |
| -------------------------------------------- | -------- | ---------------------------- |
| `clear()` + `insert()` ×1000 (rebuild cycle) | 16.7 µs  | 0.10% (runs every 2nd frame) |
| `query(0, 0, 8)` (shared-buffer lookup)      | 347 ns   | ~0.4% at 200 queries/frame   |

\* of a 16.67 ms frame at 60 fps, at the desktop entity cap (1000).

The rebuild is O(n); queries are O(cells + k). The shared result buffer keeps
steady-state queries allocation-free (legacy allocated a fresh array per call —
hundreds per frame).

### Sorting-field algorithms (`src/sim/algorithms.ts`, one `step` over `Float32Array(650)`)

| Algorithm       | avg/iter |     | Algorithm      | avg/iter |
| --------------- | -------- | --- | -------------- | -------- |
| BUBBLE FIELD    | 4.4 ns   |     | BITONIC MESH   | 5.7 ns   |
| SELECTION SWEEP | 251 ns   |     | STOOGE DRIFT   | 5.7 ns   |
| INSERTION PUSH  | 5.9 ns   |     | ODD-EVEN PULSE | 9.0 ns   |
| MERGE IMPULSE   | 6.6 ns   |     | COUNT PHASE    | 8.6 ns   |
| PIVOT FIELD     | 5.3 ns   |     | RADIX PHASE    | 15.8 ns  |
| HEAP SIFT       | 7.8 ns   |     | RUN MERGE      | 11.2 ns  |
| SHELL GAP       | 7.1 ns   |     | HOLE SCATTER   | 9.6 ns   |
| COCKTAIL WAVE   | 8.3 ns   |     | STRAND PULL    | 10.7 ns  |
| COMB SWEEP      | 16.0 ns  |     | CYCLE PHASE    | 282 ns   |
| GNOME CRAWL     | 7.2 ns   |     | PANCAKE FLIP   | 214 ns   |

Three algorithms (SELECTION SWEEP, CYCLE PHASE, PANCAKE FLIP) scan O(n) per
step by construction; the rest are O(1)–O(small constant). Exactly one `step`
runs per frame, so even the slowest costs <0.002% of the frame budget. See
[COMPLEXITY.md](./COMPLEXITY.md) for the formal table.

### Wildbeyond V2 hot paths (added 2026-06-10, Bun 1.3.11 x64-win32, same CPU)

| Benchmark                               | avg/iter | Frame-budget share at cadence                   |
| --------------------------------------- | -------- | ----------------------------------------------- |
| `QuantumRegister.apply('h')` (n=5)      | 31.4 ns  | negligible (event-driven)                       |
| `QuantumRegister.apply('cx')` (n=5)     | 18.7 ns  | negligible (per sort swap)                      |
| `QuantumRegister.probabilities()` (n=5) | 12.9 ns  | negligible (every 6th frame)                    |
| `QuantumRegister.entropy()` (n=5)       | 138 ns   | negligible (every 30th frame)                   |
| `ReactionDiffusionSystem.step()` (128²) | 76.2 µs  | 0.46%/call → ~0.23% amortized (every 2nd frame) |

The RD kernel's first naive stencil measured 601 µs; a sliding 3×3 window
rewrite (3 loads per species per cell, bit-identical results) brought it to
76 µs — recorded per the calibration-archive rite. Reproduce:
`bun bench/quantum.bench.ts` · `bun bench/reaction-diffusion.bench.ts`.
Note: two Bun installs exist on PATH (bare `bun` = 1.3.11, `bun run` = 1.3.14);
receipts above cite the version that executed them.

## Interpretation

The entire deterministic core (grid rebuild + a frame's worth of neighbor
queries + one sort step) sums to roughly 0.1 ms per frame at the desktop
entity cap — under 1% of the 60 fps budget. Frame cost is dominated by the
WebGL draw and three.js scene graph, not by the simulation logic measured here.
