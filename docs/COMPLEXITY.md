# Complexity Budget

Per-hot-path time complexity, matching the JSDoc in each module. The frame
budget is 16.6ms; everything below runs inside `requestAnimationFrame`
unless marked otherwise.

## Symbols

| Symbol | Meaning                                                                         |
| ------ | ------------------------------------------------------------------------------- |
| `n`    | Live entities — capped at `quality.maxEntities` (650 mobile, 1,000 desktop)     |
| `k`    | Items returned by one `SpatialHash.query` (bounded by local density)            |
| `C`    | Cells scanned by a query = `(2⌈r/8⌉ + 1)²` for radius `r`, cell size 8          |
| `c`    | Occupied grid cells (≤ `n`)                                                     |
| `q`    | Quantum particles — `quality.quantumCount` (3,500 mobile, 6,000 desktop)        |
| `L`    | Connectome link cap — `quality.maxLinks` (2,200 mobile, 4,000 desktop)          |
| `m`    | Monoliths (16, fixed)                                                           |
| `s`    | Shoggoths (3, fixed)                                                            |
| `p`    | Pipelines (21) × packets (3–6 each), fixed                                      |
| `w`    | Sparkline rolling window (100 samples)                                          |
| `2^n`  | Quantum basis states — n = 5 qubits in the sim → 32 amplitudes (n ≤ 8 hard cap) |
| `SIZE` | Reaction-diffusion grid side (default 128 → SIZE² = 16,384 cells)               |
| `V`    | Graph nodes mirrored from live entities (≤ `n`)                                 |
| `E`    | Graph edges mirrored from connectome links (≤ `L`)                              |
| `B`    | Analyser frequency bins — fftSize 256 → 128                                     |
| `W`    | Analytics ring window (120 samples; distinct from sparkline `w`)                |

## Hot-path table

| Operation                                               | Module                        | Cost per call                        | Cadence                                                          | Notes                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SpatialHash.insert`                                    | `math/spatial-hash`           | O(1) amortized                       | n× per rebuild                                                   | Integer cell keys `kx·10007 + kz`; cells pooled                                                                                                                                                                                                                       |
| `SpatialHash.clear`                                     | `math/spatial-hash`           | O(c)                                 | every 2nd frame                                                  | Cells returned to pool — no GC churn                                                                                                                                                                                                                                  |
| `SpatialHash.query`                                     | `math/spatial-hash`           | O(C + k)                             | hundreds per frame                                               | Returns a **shared buffer valid until the next query** (Known Bug 5 fix — legacy allocated an array per call)                                                                                                                                                         |
| Grid rebuild                                            | `world.ts`                    | O(n)                                 | every 2nd frame                                                  | clear + n inserts; halves rebuild cost vs per-frame                                                                                                                                                                                                                   |
| `EntityManager.update`                                  | `sim/entities`                | O(n + n′·k̄ + h·m)                    | every frame                                                      | 19 behaviors are O(1)/entity; `flock` and the 5 theory behaviors are O(C + k) per entity, with theory staggered `(frame + i) % 2` so `n′ ≈` half their population; `hunt` is O(m) for its `h` entities                                                                |
| Sort step                                               | `world.ts` + `sim/algorithms` | O(n) copy + O(1)–O(n) step           | every frame                                                      | `sortVal`s copied into a pre-allocated `Float32Array` (Known Bug 4 fix — legacy built a fresh `{length}` object per frame); `step(values, length, i)` is O(length) worst case (SELECTION SWEEP, CYCLE PHASE, PANCAKE FLIP, ODD-EVEN PULSE scan; most others are O(1)) |
| `Connectome.update`                                     | `sim/connectome`              | O((n/2)·(C + k)), emit ≤ L links     | every frame n ≤ 400; every 2nd ≤ 700; every 3rd > 700            | Iterates every 2nd entity, query radius 8, links within distance 8; GPU upload is O(links) via `clearUpdateRanges()` + `addUpdateRange(0, links·6)` (Known Bug 13 fix — legacy uploaded all 4,000 segments)                                                           |
| `ShoggothSystem.update`                                 | `sim/shoggoths`               | O(s·(C + k)) + O(n) on trigger       | every frame; consumption per-Shoggoth every 200–500 ticks        | Tendrils: query radius 15, ≤ 8 segments each; consumption does a full nearest-victim scan only when its interval fires and `n > 50`                                                                                                                                   |
| `PuppetMasterSystem.update`                             | `sim/puppet-masters`          | O(s) ≡ O(1); O(30) on KRONOS trigger | every frame; triggers every 400–600 ticks                        | AETHON/SELENE triggers are O(1)                                                                                                                                                                                                                                       |
| `QuantumCloud.update`                                   | `sim/quantum`                 | O(q)                                 | every frame                                                      | Position upload every frame; HSL color rewrite + upload every 6th frame; collapse/respawn is O(1) per particle                                                                                                                                                        |
| `WeatherSystem.apply`                                   | `sim/weather`                 | O(1)                                 | every frame                                                      | Lerps on fog density/color, exposure, temperature, wind                                                                                                                                                                                                               |
| `EnvironmentSystem.update`                              | `sim/environment`             | O(p + m + d·12) — all fixed          | every frame                                                      | 21 pipes' packets via `curve.getPointAt(t, target)` (Known Bug 12 fix — no Vector3 per packet), 16 monolith rings, 8 dioramas × 12 crystals; effectively constant                                                                                                     |
| `EnvironmentSystem.sectorAt`                            | `sim/environment`             | O(1)                                 | every frame                                                      | Six threshold compares on camera position                                                                                                                                                                                                                             |
| Telemetry update                                        | `ui/panels`                   | O(1) text writes                     | every 8th frame                                                  | Element refs cached once in the constructor (Known Bug 4 fix)                                                                                                                                                                                                         |
| `Sparkline.push` / `draw`                               | `ui/graphs`                   | O(1) / O(w)                          | push every 8th, draw every 18th frame                            | Rolling 100-sample buffer, cached 2d context                                                                                                                                                                                                                          |
| `AuditTrail.record`                                     | `logging/audit`               | O(1)                                 | event-driven                                                     | Ring append + fire-and-forget POST                                                                                                                                                                                                                                    |
| `createLogger(...).info` etc.                           | `logging/logger`              | O(1)                                 | event-driven                                                     | Shared 512-entry ring                                                                                                                                                                                                                                                 |
| `mulberry32` draw                                       | `math/rng`                    | O(1)                                 | thousands per frame                                              | 32-bit integer mixing, no allocation                                                                                                                                                                                                                                  |
| `QuantumRegister.apply`                                 | `math/quantum`                | O(2^n) — n = 5 → 32 amps             | gate events (puppet, sort swap) + ry drift every 30th frame      | One pass over the amplitude pair per gate (controlled gates included); allocation-free Float64Array math                                                                                                                                                              |
| `QuantumRegister.probabilities` / `entropy` / `measure` | `math/quantum`                | O(2^n)                               | entropy every 30th frame; bands every 6th; measure ≈ every 240th | `probabilities()` fills a REUSED Float64Array, valid until the next call; `measure(rng)` collapses to a basis state via the seeded stream                                                                                                                             |
| `ReactionDiffusionSystem.step`                          | `sim/reaction-diffusion`      | O(SIZE²) = 16,384 cells              | every 2nd frame, offset 1 from grid rebuild                      | Gray-Scott on two Float32Array ping-pong pairs, < 0.5 ms at 128; U field uploads as a `DataTexture` (ground emissiveMap); weather/chaos-coupled params read per step                                                                                                  |
| Louvain pass                                            | `sim/graph-mind`              | ~O(E) per pass                       | every 240th frame                                                | Graph rebuilt from `connectome.pairs` (filled free during its rebuild); louvain seeded with `ctx.rng` for determinism; community indices written into entity `setGroup`s                                                                                              |
| PageRank pass                                           | `sim/graph-mind`              | O(i·(V + E)), i = iterations         | every 600th frame, offset 120                                    | Top-20 entities get an emissive floor boost while rank holds                                                                                                                                                                                                          |
| Voronoi build                                           | `sim/constellations`          | O(n log n), n = 24 sites             | ONCE at construction                                             | d3-delaunay over the static monolith+diorama XZ sites; never rebuilt                                                                                                                                                                                                  |
| `subSectorAt` (voronoi.find)                            | `sim/constellations`          | O(log n)                             | every frame                                                      | Camera point location → lore cell name; the rest of `update()` is O(1) opacity/pulse work                                                                                                                                                                             |
| `AudioAnalysis.update`                                  | `audio/analysis`              | O(B) = O(128)                        | every frame                                                      | Analyser poll into a pre-allocated Uint8Array + exponential smoothing; returns a REUSED bands object; zeros before `init()`                                                                                                                                           |
| `AnalyticsSystem.push`                                  | `sim/analytics`               | O(1)                                 | every 8th frame (with telemetry)                                 | Three pre-allocated 120-sample ring writes                                                                                                                                                                                                                            |
| `AnalyticsSystem.analyze`                               | `sim/analytics`               | O(W) = O(120)                        | every 60th frame                                                 | mean/stddev + linear-regression slope → trend/min; population z-score omen at \|z\| > 2.5, throttled to once per 30 s                                                                                                                                                 |

## Dominant costs at the desktop cap (n = 1,000)

1. **Entity loop** — O(n) base plus neighbor queries for the ~270 entities
   running `flock`/theory behaviors (≈ 4 morphotypes per behavior × 100
   morphotypes ÷ 26 behaviors, halved by staggering). With healthy spatial
   distribution `k̄` stays in the tens.
2. **Connectome** — the only O(n·k) consumer that also writes 2 × 3 floats
   per link into 24,000-float buffers; its cadence backs off to every 3rd
   frame above 700 entities precisely because of this.
3. **Quantum cloud** — a fixed O(q) = 6,000-iteration loop; cheap per
   iteration (a handful of trig calls), and its color pass (HSL→RGB) is
   gated to every 6th frame.

The Wildbeyond V2 systems do not change this ranking by design: every heavy
substrate (register entropy, Gray-Scott step, Louvain, PageRank, regression)
runs on a documented cadence, so the only V2 costs paid **every** frame are
the O(128) analyser poll, the O(log 24) Voronoi point location, and O(1)
constellation pulse work. The single largest per-event V2 cost is one
O(SIZE²) = 16,384-cell RD step every 2nd frame (offset 1 from the grid
rebuild so the two never share a frame), measured at < 0.5 ms at size 128 —
see [BENCHMARKS.md](./BENCHMARKS.md).

## Allocation discipline

Big-O only tells half the story at 60 fps — the other half is GC pressure.
Contract rule 5: per-frame `update()` bodies perform **zero allocations**.
Every system documents its module-level scratch (temp vectors, shared color,
the spatial hash's shared query buffer, the pre-allocated sort
`Float32Array`, connectome/tendril `Float32Array`s — and, in V2, the
register's reused probability `Float64Array`, the qcircuit's reused 32-entry
bands `Float32Array`, the RD ping-pong pairs, the analyser's `Uint8Array` +
reused bands object, and the analytics rings). If a profiler shows GC spikes
during steady state, that is a regression — see
[CONTRIBUTING.md](../CONTRIBUTING.md).

Benchmarks for the leaf hot paths (`spatial-hash`, `rng`, `algorithms`,
`scalar`, plus V2's `quantum` gate/probability ops at n = 5 and the
`reaction-diffusion` step at 128²) live in `bench/` and run with
`bun run bench` on deterministic `mulberry32(42)` inputs.
