<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

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
[COMPLEXITY-2026-06-26.md](./COMPLEXITY-2026-06-26.md) for the formal table.

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

### Quantized entity-brain storage (added 2026-07-05, Bun 1.3.14 x64-win32, same CPU)

`EntityBrainField` now supports real packed genome storage. A 50,000-entity field
contains `50,000 × 80 = 4,000,000` genes:

| Storage mode | Backing array  | Direct genome bytes | Construction avg/iter | Forward-pass note                                      |
| ------------ | -------------- | ------------------: | --------------------: | ------------------------------------------------------ |
| FP32         | `Float32Array` |          16,000,000 |               9.51 ms | 100 `think()` calls: 228.96 ms                         |
| FP16         | `Uint16Array`  |           8,000,000 |              36.25 ms | 100 `think()` calls: 377.91 ms due JS half decode cost |
| INT8         | `Uint8Array`   |           4,000,000 |              67.96 ms | reserved for low tiers; decode cost must stay measured |

Conversion benches over the same 4,000,000-gene fixture:

| Benchmark                         | avg/iter |
| --------------------------------- | -------: |
| FP32 → packed FP16                | 23.82 ms |
| packed FP16 → FP32 scratch decode |  6.11 ms |
| FP32 → INT8                       | 33.58 ms |
| INT8 → FP32 allocation decode     |  9.24 ms |
| INT8 → FP32 scratch decode        | 34.47 ms |

Interpretation: quantization is now **storage-real** and byte-measurable, but CPU
decode is not free in JavaScript. Keep it tier-gated and benchmarked; do not claim
an unconditional frame-time win from packed storage alone. Reproduce with
`bun bench/quantization.bench.ts`.

### Perceptual priority cascade (added 2026-07-05, Bun 1.3.14 x64-win32, same CPU)

The cascade now carries original entity indices through the distance sort instead
of recovering them with post-sort `indexOf`, and `world.ts` feeds those indices to
`EntityBrainField.thinkIndices` so prioritized evaluation keeps each entity paired
with its own genome slot.

Focused benchmark, with seeded fixtures and forced resort work each iteration:

| Benchmark                              |     avg/iter |
| -------------------------------------- | -----------: |
| update priorities, 1,000 entities      |   116-117 µs |
| update priorities, 5,000 entities      |   731-791 µs |
| update priorities, 10,000 entities     | 1.67-1.78 ms |
| get entities to evaluate, frame 0      |     65.56 µs |
| get entities to evaluate, frame 5      |     33.86 µs |
| get entities to evaluate, frame 30     |     58.06 µs |
| apply hive mind, 10,000-entity fixture |    542.16 µs |

Interpretation: the priority cascade is now **slot-correct** and measured under a
real resort workload. These are CPU receipts only; browser visual smoke is still
required before raising/lowering tier capacities or claiming perceptual equivalence.
Reproduce with `bun bench/perceptual-priority.bench.ts`.

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
| everything else   | ~1.0      | ~1.0      | sort/quantum/rd/qc/titans/graphMind/·      |
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

> **Current-state correction (2026-07-10):** the √N arena expansion described in the historical V38
> receipts below was removed by V123 to enforce the owner-critical hard ±540 platform boundary.
> Consequently the old –density-flat— explanation and 25k/50k scaled rows are not current runtime
> claims. Fresh component medians at 50k measured entity update+grid 39.93 ms, visible connectome
> 76.32 ms, entity-brain 14.04 ms, instanced CPU sync 12.50 ms, and PageRank 34.62 ms before most world,
> DOM, render, or GPU work. `resolveTier` now auto-stops at desktop (10k); `?tier=ultra` and
> `?tier=mega` preserve the 25k/50k stress capabilities explicitly. The 2026-07-10 hardening pass also
> changed mega Connectome startup from an eager ~182 MiB ceiling allocation to geometric live-size
> capacity (8,192 link slots + 2,048 ID slots, under 3 MiB at the 500-entity boot population), removed
> 16 bytes/entity/frame of ineffective instanced-motion uploads, and made hazard mass-death removal
> stable O(n+d) with amortized O(1) respawn drains.

The directive asks for **up to 50,000 entities**. Profiled with `bun bench/scale.ts` — a headless
harness (the determinism-test fixture) that drives the real `world.ts` per-frame entity pipeline
(`entities.update` + the spatial-hash rebuild) at a ladder of sizes and times ms/frame. Seed
`0xc0541c`, 120 measured frames after a 40-frame warm-up.

**Finding (the density trap):** at a FIXED arena the cost is super-linear — neighbours-per-query
`k ∝ density ∝ N`, so the `O(n·k)` loop is effectively `O(n²)`. Raw: 10k = 6.0 ms, 25k = 36 ms, 50k =
**167 ms** (6 fps).

**Historical V38 fix (no longer present):** the spawn radius + containment radius scaled by **√(maxEntities / 10000)**.
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
  `InstancedEntityRenderer.sync(entities.list, ·)` at 8,000 entities (≈ 3.8 ms here, consistent
  with the 4.7 ms/10k per-stage breakdown above) under a generous 80 ms ceiling. The headless CPU
  guard cannot see GPU upload size, but it catches the structural regressions that matter
  CPU-side — pool-rebuild thrash (recreating InstancedMeshes every frame) or an O(n²) census.
- **`ChaosField.update` (engaged) at the mega tier** — the Lorenz storm couples to every organism
  each frame; over 50,000 entities it measures **≈ 0.25 ms/frame median** (max 0.50), i.e.
  **negligible** beside the ≈ 60 ms entity pipeline that dominates the mega tier. Guarded in
  `tests/chaos-field.test.ts` under a 15 ms ceiling (~60× slack). Engaging chaos mode at mega scale
  is effectively free relative to the population loop.

### Singularity force pass — O(k) reach query (V7.5, added 2026-06-27, Bun 1.3.x, same CPU)

A summoned singularity (`src/sim/singularities.ts`) applies an r⁻² gravity + horizon consume/eject +
time-dilation/redshift field to the population. The original pass swept the **whole** `entities.list`
every frame (`O(n)`), and above 5,000 entities fell back to a half-rate stride + 2× accel — a physics
**approximation** that degraded the r⁻² + dilation accuracy and still collapsed the frame as `n` grew
(holes visibly "died" ≈ 25k). **Fix:** the force passes now query the shared per-frame spatial hash at
`REACH` (black/grey/white holes) / `CONV_R` (strange star) — the grid cells overlapping the reach
square are a superset of the 3D sphere, filtered exactly — so they touch only the `k` bodies in range.
Because the V38 areal-density scaling holds density constant, **`k` saturates** as `n` climbs: the
cost is decoupled from the population and the EXACT, un-strided physics runs at every tier (the
half-rate stride is **gone**). The passes draw no rng, so the seeded stream is byte-identical.

Profiled with `bun bench/scale.ts` (seed `0x5106e7`, white hole — non-consuming so `n` is held — 120
measured frames after a 40-frame warm-up; median ms/frame for `singularities.update`):

| N (entities) | k (within REACH) | sing ms/frame | note                                   |
| ------------ | ---------------- | ------------- | -------------------------------------- |
| 2,000        | 2,000            | 0.119         | small arena (density=1) ⇒ all in reach |
| 5,000        | 5,000            | 0.239         | "                                      |
| 10,000       | 10,000           | 0.731         | "                                      |
| 25,000       | 19,996           | 5.98          | arena spreads (√N) ⇒ `k` decouples     |
| 50,000       | 20,008           | **6.03**      | **N doubles, k + cost FLAT ⇒ O(k)**    |

The receipt: from 25k→50k the population **doubles** while `k` (and the singularity cost) stays flat
at ≈ 6 ms — the hole's marginal cost no longer scales with `n`, where the old `O(n)` sweep would have
≈ doubled. Below 10k the small fixed arena puts every body in reach (`k=n`) so the cost tracks `n`, but
those tiers are sub-millisecond and never the bottleneck. Correctness is guarded by
`tests/singularities.test.ts` "O(k) reach query visits EVERY in-REACH entity exactly once …": at
N=25k it asserts the query buffer has no duplicates, every in-REACH body is covered, only in-REACH
bodies are forced, and two clean probes receive the exact `|Δv| = G·dt/r²` (a double-visit would
double it). `k` is conservative here — the bench's legacy square spawn is denser at the core than the
live phylum-disk spread, which puts a smaller fraction inside REACH.

**Historical scope of the flatness (not current after V123):** `k` was held population-flat only **above the 10k
knee**, where `EntityManager.densityScale = √(maxEntities/10000) > 1` spreads the arena to pin areal
density. Below 10k `densityScale` clamps to 1, so the fixed arena's density (and `k`) rise with `n` —
which is why the 2k–10k rows above show `k = n`. That regime is sub-millisecond and never the
bottleneck, and the O(k) query is still a strict net win there (`k ≤ n`, always ≤ the removed O(n)
sweep). The exact, un-strided physics runs at **every** tier.

**Consuming-hole worst case (V7.5):** a black/grey hole's per-frame disposal is bounded by
**MAX_CONSUME = 25**, not `n`. The deferred consume originally did a per-victim `list.indexOf`
(`O(n·consumeCap)` — up to ~1.25M ops/frame at 50k _while actively eating_); it is now a **single
reverse `list` scan** with a `Set` membership test (`O(n)` once + the `disposeAt` left-shifts that were
always there), which also serves as the stale-grid / same-frame-cross-system liveness guard. This is a
transient spike on the consuming path only — the force pass itself is `O(k)` every frame.

**Entropy stays global by design (V7.5):** `applyEntropy` is **deliberately NOT** converted to the
O(k) reach query (≈ 5 ms/frame at 50k, a global strided `i += 2` pass). Two reasons, confirmed by an
adversarial audit: (1) heat death is a global thermodynamic end-state, not a finite-speed front — the
expanding shell is a stylized rig, and the genuinely global reach of the effect is the world-heat
coupling (`s.chaos`); (2) the stride + per-visit `rng()` draws are part of the seeded stream, so
bounding the thermalization spatially would perturb determinism for every entropy-active replay.
Global+strided is the determinism-preserving correct state; the ~5 ms is a bounded, transient-effect
tradeoff, not a scaling defect.

## Apex mind (Super Creature) — per-beat cognitive budget (measured 2026-07-02)

Bun 1.3.x x64-win32, Intel Core Ultra 9 275HX. The apex mind is a 20-plus-faculty stack (the SC 1.1
cognition layer + the Eshkol/Moonlab/QGTL quantum substrate). It is the largest single per-frame CPU cost
and it is **millisecond-scale** — the old "≈ 298 µs / ~1.8% of a frame / effectively free" figures were
FALSE and are retired; do not repeat them. `bench/super-mind.bench.ts` measures two cadences:

- **`SuperMind.think()` — one full cognitive beat, PER SIMULATION FRAME: ≈ 1.99 ms/iter** (median 2.07 ms;
  1.41 ms · 5.62 ms range). That single call runs the entire 5-stage / 5-depth / 25-variant Tree of
  Thought, the 30 organ-nets, the 6-qubit `evolve()` + per-beat quantum-natural-gradient + Grover, the
  live 16-qubit Clifford reflex, spin-glass settle, active inference, theory-of-mind, neuromodulation,
  successor-representation look-ahead, empowerment, and holographic recall — for the LONE apex. At ≈ 2 ms
  it is **~12% of a 60 fps (16.67 ms) frame**: real, non-trivial, and the reason the world runs one primary
  apex per frame plus staggered echoes rather than all 5 minds every frame.
- **`SuperMind.snapshot()` — UI-cadence telemetry: ≈ 1.35 ms/iter** (0.95 ms · 4.02 ms). The heavy readouts
  — the full Quantum Geometric Tensor (re-applies the circuit ~5×), the quantum "magic" (4⁶ = 4096 Pauli
  expectations), integrated information + coherence — run ONLY when the BRAIN observatory is open, NEVER per
  simulation beat, so the ~1.35 ms is paid at the observatory cadence (a few times a second), not at 60 fps.

**Finding:** the per-beat apex cost is real (~12% of a frame for the lone apex), the expensive quantum
geometry/magic is correctly gated to UI cadence, and the GOAL5 5-mind budget below is why the pantheon
runs on a staggered cadence. `think()` improved from ~3.34 ms (2026-06-26) to ~1.99 ms after the
memory-orchestra / QRC-readout / curvature-QNG wiring passes.

## GOAL5: 5 Super Minds (Archons / Godforms) frame budget (Dr Manhattan measurement)

Intel Core Ultra 9 275HX. The GOAL5 contract targets combined new per-frame work for 5 minds at `<2%` of a
60 fps frame; determinism (distinct child seeds `master ^ (i * 0x9e3779b1)`, like `world.ts`) produces
identical minds; provenance via Eshkol/Moonlab/QGT ports measured for fidelity.

Current measured `bun run bench` (2026-07-02, Bun 1.3.x) — the older sub-millisecond figures are
superseded:

- Single `SuperMind.think()`: **~1.99 ms** (full bench suite).
- `SuperMind.snapshot()` (UI cadence): **~1.35 ms** — gated, not per-sim-frame.
- `5× think()` batch (all-full, historical): **~9.77 ms**.
- **Frame-budget status (2026-07-08 GOAL5 cut):** world `driveSuper` now runs **1 full + 4 echo** minds
  per frame via `apexThinkMode` (`src/sim/apex-cadence.ts`). Echo mode keeps the same pipeline with
  **1×1 Tree-of-Thought** (vs 5×5) and **1 predictor step** — same determinism contract, far less
  imagination cost. Amortized full thinks = 1/frame (~1.99 ms ≈ 12% of 16.67 ms) instead of 5/frame
  (~58%). The strict GOAL5 `<2%` target is **still not met**, but the multi-apex tax is cut by design
  rather than left as five full minds. Re-bench after further cuts before claiming `<2%`.

Bodies: per-frame O(1) updates (prebuilt geo, uniform drives) add negligible (<0.1% measured indirect).

**Determinism receipt:** same master seed -> bit-identical outputs for corresponding minds (verified via
super-mind, Eshkol, QRNG, and Clifford same-seed tests). Frame provenance remains seeded: every mind draws
from its own child stream; no shared random source.

**Reproduce:** `bun run bench` for the full suite and `bun bench/super-mind.bench.ts` for the focused
SuperMind/GOAL5 run.

## Eshkol AD (Wengert tape) — automatic differentiation (2026-06-20)

Bun 1.3.11 x64-win32, Intel Core Ultra 9 275HX (~3.45 GHz). Port of tsotchke/Eshkol `lib/backend/vm_autodiff.c` — reverse-mode automatic differentiation with nested gradients.

| Benchmark                                     | avg/iter | Notes                               |
| --------------------------------------------- | -------- | ----------------------------------- |
| `adTapeNew(100)`                              | 1.79 µs  | tape allocation (100-node capacity) |
| `adConst + adVar creation`                    | 220 ns   | two node pushes                     |
| `adAdd` (tape node creation)                  | 254 ns   | binary addition node                |
| `adMul` (tape node creation)                  | 235 ns   | binary multiplication node          |
| `adSin` (tape node creation)                  | 227 ns   | unary sine node                     |
| `adBackward` (gradient propagation, 10 nodes) | 308 ns   | reverse-mode gradient accumulation  |
| Complex expression `sin(x*y) + x` (gradient)  | 604 ns   | 5-node tape + backward pass         |

**Finding:** Eshkol AD operations are sub-microsecond per node; even complex expressions with gradient backpropagation stay under 1 µs. The Wengert tape is allocation-friendly (pre-allocated node pool) and deterministic — no stochastic elements. At the GOAL5 cadence (5 minds every 4 frames), the per-mind AD cost is negligible against the measured `5× think()` batch (~9.77 ms); the retired `<2% / 1.875%` frame-budget shorthand does not apply to AD alone.

Reproduce: `bun bench/eshkol-ad.bench.ts`.

## Crystal/Big Tree ecosystem (2026-07-14)

Bun 1.3.14 x64-win32, Intel Core Ultra 9 275HX (~3.45 GHz). One full production-census
`CrystalEcosystem.update()`: ~30k instanced canopy sync, the 20k-item edible-resource clock,
250 neural residents (6-6-4 TinyMLP inference + state machines + food transactions), 99 ambient
fauna, and resident social pairing with peer teaching.

| Benchmark                                             | median  | Notes                           |
| ----------------------------------------------------- | ------- | ------------------------------- |
| `CrystalEcosystem.update` (full census, steady state) | 0.77 ms | p90 1.29 ms over 60 warm frames |

**Finding:** the complete Big Tree ecology costs under 5% of a 16.67 ms frame at the production
census, dominated by the instanced canopy sync rather than the neural or food logic. The matching
regression guard (`tests/crystal-ecosystem-perf.test.ts`) holds a generous 20 ms median ceiling
(~26x slack) so a structural regression fails loudly without CI flake.

Reproduce: `bun bench/crystal-ecosystem.bench.ts`.

## Interpretation

The entire deterministic core (grid rebuild + a frame's worth of neighbor
queries + one sort step) sums to roughly 0.1 ms per frame at the desktop
entity cap — under 1% of the 60 fps budget. Frame cost is dominated by the
WebGL draw and three.js scene graph, not by the simulation logic measured here.
At the ultra tier the simulation cost becomes material (≈ 9.5 ms/frame at the
6,500 steady-state target, ≈ 18.5 ms at the 10k ceiling) — see the
"Ultra-tier 10k optimization" section above for the per-stage forensics.
