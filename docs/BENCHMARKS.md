# Benchmarks

Measured results for the hot-path primitives. Reproduce with `bun run bench`
(or any single suite, e.g. `bun bench/spatial-hash.bench.ts`).

## Environment

|         |                                                               |
| ------- | ------------------------------------------------------------- |
| Date    | 2026-06-17                                                    |
| CPU     | Intel Core Ultra 9 275HX (~3.28 GHz observed)                 |
| Runtime | Bun 1.3.14 via `bun run bench` (x64-win32), mitata 1.0.34     |
| Inputs  | Deterministic via `mulberry32(42)` — identical data every run |

## Results

### RNG (`src/math/rng.ts`)

| Benchmark                                        | avg/iter  | Notes                             |
| ------------------------------------------------ | --------- | --------------------------------- |
| `Math.random()` (baseline — banned in sim logic) | 793.85 ps | engine intrinsic                  |
| `mulberry32(42)()`                               | 1.18 ns   | sub-ns-class reproducibility cost |
| `hashSeed('cosmogonic-quantum-mechalogodrom')`   | 34.90 ns  | one-shot, boot only               |

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

| Benchmark                                    | avg/iter  | Per-frame budget share\*     |
| -------------------------------------------- | --------- | ---------------------------- |
| `clear()` + `insert()` ×1000 (rebuild cycle) | 17.67 µs  | 0.11% (runs every 2nd frame) |
| `query(0, 0, 8)` (shared-buffer lookup)      | 344.74 ns | ~0.4% at 200 queries/frame   |

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

### Selection utility (`src/math/top-k.ts`, added receipt 2026-06-17)

| Benchmark                                     | avg/iter  | Notes                               |
| --------------------------------------------- | --------- | ----------------------------------- |
| `selectTopK` bounded min-heap, V=10,000, K=20 | 412.09 µs | O(V log K), allocation-disciplined  |
| full `Array.sort().slice(0, 20)` baseline     | 6.03 ms   | O(V log V), kept as comparison only |

Measured speedup: **about 14.6x** for the sampled top-20 selection path.

### Wildbeyond V2 hot paths (added 2026-06-10, Bun 1.3.11 x64-win32, same CPU)

| Benchmark                               | avg/iter  | Frame-budget share at cadence                   |
| --------------------------------------- | --------- | ----------------------------------------------- |
| `QuantumRegister.apply('h')` (n=5)      | 32.96 ns  | negligible (event-driven)                       |
| `QuantumRegister.apply('cx')` (n=5)     | 24.32 ns  | negligible (per sort swap)                      |
| `QuantumRegister.probabilities()` (n=5) | 15.80 ns  | negligible (every 6th frame)                    |
| `QuantumRegister.entropy()` (n=5)       | 144.89 ns | negligible (every 30th frame)                   |
| `ReactionDiffusionSystem.step()` (128²) | 75.18 µs  | 0.45%/call → ~0.23% amortized (every 2nd frame) |

The RD kernel's first naive stencil measured 601 µs; a sliding 3×3 window
rewrite (3 loads per species per cell, bit-identical results) brought it to
76 µs — recorded per the calibration-archive rite. Reproduce:
`bun bench/quantum.bench.ts` · `bun bench/reaction-diffusion.bench.ts`.
Note: two Bun installs exist on PATH (bare `bun` = 1.3.11, `bun run` = 1.3.14);
receipts above cite the version that executed them.

## Ultra-tier 10k optimization (added 2026-06-10, Bun 1.3.11 x64-win32, same CPU)

The 10× scale-up to the ultra tier (10,000-entity cap, CONTRACTS V3.1) exposed a
per-frame **simulation** cost wall the 1,000-entity legacy never hit: at 10k the app
ran ≈ 22 fps in-browser against the V3.6/V4.5 ≥ 55 fps desktop acceptance gate.

### Forensic method (Master File III)

A throwaway headless harness (`scripts/perf-probe.ts`, deleted after measuring)
constructed the SIM-ONLY systems DOM-free at 10k entities, drove the exact `world.ts`
`step()` ordering + cadences, and timed each stage with `performance.now()` averaged over
400 frames. GPU render is **excluded** — `engine.render()` is a no-op stub — so these
numbers isolate the CPU/sim portion (= `world.step` minus `engine.render`). Reproduce the
method with the regression guard `tests/perf-budget.test.ts`.

### Per-stage breakdown at the 10,000-entity ceiling (ms/frame, sim-CPU only)

| Stage             | Baseline  | Optimized | Note                                       |
| ----------------- | --------- | --------- | ------------------------------------------ |
| `entities.update` | 15.65     | 11.63     | O(n·k) behavior loop — the dominant cost   |
| `instanced.sync`  | 4.64      | 4.67      | 10k matrices/frame (left as-is, see below) |
| `connectome`      | 1.98      | 0.60      | cadence /3 → /6 at 10k                     |
| grid rebuild      | 0.43      | 0.56      | cell 16 → 10 (more cells, fewer per cell)  |
| everything else   | ~1.0      | ~1.0      | sort/quantum/rd/qc/titans/graphMind/…      |
| **TOTAL sim-CPU** | **23.67** | **18.46** | **42 → 54 fps render-free**                |

At the **adaptive 6,500 steady-state target** (the ultra default an idle world settles at)
the same harness measures **9.52 ms/frame → 105 fps render-free** (`entities.update` 5.23,
`instanced.sync` 2.72). Pass the count to the harness to reproduce either regime.

### Root cause (measured, not assumed)

`entities.update` issued **1,368 grid queries/frame visiting ≈ 292,000 neighbors** (≈ 213 per
query — the 3×3 cell block is a coarse superset of the interaction disk). Attributed by query
radius: **flock (r=8) 87.6k**, **nash+typemorph (r=10) 87.7k**, **setunion (r=15) 80.0k**,
**graphseek (r=16) 37.4k**. The five theory behaviors were already staggered every 2nd frame;
`flock` ran **every** frame unthrottled.

### Tuned constants + rejected values (calibration archive)

All four levers are gated to apply **only above 5,000 entities** (ultra) so the phone/laptop/
desktop tiers stay byte-identical — `nash`/`market` draw rng conditional on neighbor payoffs,
so the spatial-hash cell size and behavior cadence are part of the seeded stream at ≤ 5,000.

| Lever                          | Chosen   | Rejected (and why)                                                                                                                                                                                                |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theory-behavior stride (ultra) | **3**    | 2 = baseline (no gain); 4+ thins the social behaviors visibly without a proportional win past 3                                                                                                                   |
| Flock cadence (ultra)          | **1/2**  | every-frame = baseline; flock draws no rng so the stagger is stream-neutral                                                                                                                                       |
| `ULTRA_GRID_CELL`              | **10**   | 16 = 13.5→ no (214 nb/q); 8 = 15.8 ms, 6 = 16.3, 4 = 16.0 — all WORSE: shrinking the cell multiplies the (2·⌈r/cs⌉+1)² visited cells faster than it thins each cell. 10 = measured minimum at 13.5 ms (136 nb/q). |
| Connectome cadence (>5k)       | **/6**   | extends the legacy 1/2/3 ladder; +/4 rung added at >2k. Connectome draws no rng → cadence is determinism-neutral.                                                                                                 |
| Adaptive ultra target          | **6500** | 10000 settles ≈ 18.5 ms (54 fps render-free, no GPU headroom); 7000 ≈ 11.3 ms; 6500 ≈ 9.5 ms leaves clear room toward 55 fps WITH render. 10000 stays the reachable ceiling via bursts.                           |

`instanced.sync` (≈ 4.7 ms, two O(n) passes writing 10k matrices) was profiled and left
intact: `setMatrixAt`/`setColorAt`/Map lookups are each < 0.5 ms across 10k — the cost is
irreducible per-entity matrix composition + megamorphic property access over 10k entities, and
a single-pass refactor would risk the pool-sizing invariant for ≈ 1 ms. The adaptive 6,500
target cuts it to 2.7 ms for the idle world instead.

### GPU caveat (what the harness cannot measure)

The harness measures **sim-CPU only**; it excludes WebGL draw cost (instanced pool draws, fog,
shadows, RD texture upload, quantum points). The in-browser 22 fps baseline (≈ 45 ms total)
against the 23.67 ms sim-CPU baseline implies GPU render adds ≈ 21 ms at 10k — already above the
18 ms a 55 fps total frame allows. **55 fps at a true, idle-settled 10k is therefore not
reachable on CPU optimization alone on this class of machine**, which is exactly why the ultra
tier's idle target is the adaptive 6,500 (sim-CPU 9.5 ms + a proportionally smaller GPU draw),
with 10,000 left as the hard ceiling reachable on demand via bursts/apocalypse.

## Population scale to 50,000 (V38)

The directive asks for **up to 50,000 entities**. Profiled with `bun bench/scale.ts` — a headless
harness (the determinism-test fixture) that drives the real `world.ts` per-frame entity pipeline
(`entities.update` + the spatial-hash rebuild) at a ladder of sizes and times ms/frame. Seed
`0xc0541c`, 120 measured frames after a 40-frame warm-up.

**Finding (the density trap):** at a FIXED arena the cost is super-linear — neighbours-per-query
`k ∝ density ∝ N`, so the `O(n·k)` loop is effectively `O(n²)`. Raw: 10k = 6.0 ms, 25k = 36 ms, 50k =
**167 ms** (6 fps).

**Fix (`entities.ts`, V38):** the spawn radius + containment radius scale by **√(maxEntities / 10000)**.
The arena is a wide thin DISK, so areal density `∝ N / radius²`; scaling the radius by √N holds density
(and thus `k`, and the query cost) roughly constant. Clamped to ≥ 1, so it is **exactly 1.0 at ≤ 10k** —
every existing tier and the determinism golden stay byte-identical; only the opt-in `mega` tier spreads.

| N (entities) | ms/frame raw | ms/frame √N-scaled | budget                       |
| ------------ | ------------ | ------------------ | ---------------------------- |
| 2,000        | 0.9          | 1.0                | ✅ 60 fps                    |
| 5,000        | 2.2          | 2.1                | ✅ 60 fps                    |
| 10,000       | 6.0          | 6.7                | ✅ 60 fps (ceiling)          |
| 25,000       | 36.2         | **25.0**           | 🟨 30 fps                    |
| 50,000       | 167.5        | **60.1**           | 🟥 sim ~16 fps (2.8× faster) |

The residual super-linearity past 25k is the flock/swarm behaviours actively **re-concentrating**
entities the spawn spread out — a deeper neighbour-list LOD is the next lever. The opt-in `mega` tier
(`?tier=mega`, `core/quality.ts`) raises the ceiling to 50,000, boots at 90% of it, and was verified
live: **44,977 entities instantiated, rendered, and stepped with zero console errors** (the throttled
preview tab's full-frame cost is render-bound; a discrete GPU absorbs the 50k instanced draw).

### Regression guards added 2026-06-15 (Bun 1.3.11 x64-win32, same CPU)

Two more sim stages now carry dedicated median-of-many-frames guards alongside the
`entities.update` budget, closing the "unmeasured" findings for each:

- **`instanced.sync`** — `tests/perf-budget.test.ts` now drives the real
  `InstancedEntityRenderer.sync(entities.list, …)` at 8,000 entities (≈ 3.8 ms here, consistent
  with the 4.7 ms/10k per-stage breakdown above) under a generous 80 ms ceiling. The headless CPU
  guard cannot see GPU upload size, but it catches the structural regressions that matter
  CPU-side — pool-rebuild thrash (recreating InstancedMeshes every frame) or an O(n²) census.
- **`ChaosField.update` (engaged) at the mega tier** — the Lorenz storm couples to every organism
  each frame; over 50,000 entities it measures **≈ 0.25 ms/frame median** (max 0.50), i.e.
  **negligible** beside the ≈ 60 ms entity pipeline that dominates the mega tier. Guarded in
  `tests/chaos-field.test.ts` under a 15 ms ceiling (~60× slack). Engaging chaos mode at mega scale
  is effectively free relative to the population loop.

## Apex mind (Super Creature) — per-beat cognitive budget (2026-06-17)

Bun 1.3.14 x64-win32, Intel Core Ultra 9 275HX (~3.28 GHz observed in the bench run). The apex mind grew from one stacked MLP (V31)
to a 20-plus-faculty stack (the SC 1.1 cognition layer + the Eshkol/Moonlab/QGTL quantum substrate), so its
per-frame budget was, until now, **unmeasured**. `bench/super-mind.bench.ts` measures its two cadences:

- **`SuperMind.think()` — one full cognitive beat, PER SIMULATION FRAME: ≈ 224 µs/iter** (p75 210.60 µs;
  172.50 µs … 1.46 ms; p99 663.40 µs). That single call runs the entire 5-stage / 5-depth / 25-variant Tree of Thought, the
  30 organ-nets, the 6-qubit `evolve()` + the per-beat quantum-natural-gradient + Grover amplification, the
  spin-glass settle, active inference, theory-of-mind, neuromodulation, the successor-representation
  look-ahead, empowerment, and holographic recall — for the LONE apex creature. At ≈ 0.224 ms it is **~1.34%
  of a 60 fps (16.67 ms) frame**: the whole apex psyche is effectively free beside the population render,
  with healthy headroom for further faculties.
- **`SuperMind.snapshot()` — UI-cadence telemetry: ≈ 1.08 ms/iter**. The heavy readouts
  — the full Quantum Geometric Tensor (re-applies the circuit ~5×), the quantum "magic" (4⁶ = 4096 Pauli
  expectations), integrated information + coherence — run ONLY when the BRAIN observatory is open, NEVER per
  simulation beat, so the ~1 ms is paid at the observatory cadence (a few times a second), not at 60 fps.

**Finding:** the per-beat apex cost is negligible against the frame budget, and the expensive quantum
geometry/magic is correctly gated to UI cadence. The 20-plus-faculty stack is **operationally sound** — the
growth that drove the 1.1 expansion has not threatened the frame budget.

## Interpretation

The entire deterministic core (grid rebuild + a frame's worth of neighbor
queries + one sort step) sums to roughly 0.1 ms per frame at the desktop
entity cap — under 1% of the 60 fps budget. Frame cost is dominated by the
WebGL draw and three.js scene graph, not by the simulation logic measured here.
At the ultra tier the simulation cost becomes material (≈ 9.5 ms/frame at the
6,500 steady-state target, ≈ 18.5 ms at the 10k ceiling) — see the
"Ultra-tier 10k optimization" section above for the per-stage forensics.
