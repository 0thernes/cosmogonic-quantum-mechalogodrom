# ERP — Entity Relationships in Process (the dynamic view)

The **process** companion to [ERD.md](./ERD.md) (attribute structure) and [ERM.md](./ERM.md)
(conceptual relationships). Static models say what the things are; this document says **how they move
through time** — the boot sequence, the per-frame pipeline, the cadence schedule that keeps the heavy
substrates off each other's frames, and the lifecycles entities and events pass through.

Think of it as the "resource plan" for a 16.6 ms frame budget: every system gets a slot and a cadence,
and the composition root ([`src/world.ts`](../src/world.ts)) is the scheduler. Costs per stage live in
[COMPLEXITY.md](./COMPLEXITY.md); this is the ordering and the why.

> All mermaid labels below are punctuation-light by necessity — a semicolon inside a label is a
> statement separator and crashes the parser (documented gotcha, fixed once already on `/docs`).

## 1. Boot / seed sequence

How a deterministic world comes into being from a single seed.

```mermaid
sequenceDiagram
  participant U as User
  participant M as main.ts
  participant Q as quality.ts
  participant St as MemoryStore
  participant W as World
  participant Sys as Systems

  U->>M: load page
  M->>M: ColorManagement.enabled = false
  M->>Q: detectQuality(device)
  Q-->>M: tier (entities, links, cadences)
  M->>St: read PERSISTED_STATE (seed, songIdx, weatherIdx, algoIdx)
  St-->>M: validated state (defaults if absent)
  M->>W: new World(ctx with seeded rng)
  W->>Sys: construct entities, connectome, graph-mind, titans, quantum, RD, atmosphere
  Sys-->>W: scene graph + typed-array state primed
  M->>W: bind resize, first-gesture unlock
  U->>W: first gesture
  W->>W: unlock() audio graph
  loop every animation frame
    M->>W: update(dt clamped >= 0)
  end
```

## 2. Per-frame pipeline

The order of a single `World.update(dt)`. Read-only projections (render, audio, UI) come last and
never mutate sim state.

```mermaid
flowchart TD
  A[rAF tick] --> B[clamp dt >= 0]
  B --> C{grid rebuild frame?<br/>every 2nd}
  C -- yes --> D[SpatialHash clear + insert n]
  C -- no --> E[reuse last grid]
  D --> F[EntityManager.update<br/>behaviors + neighbor queries]
  E --> F
  F --> G[Connectome.update<br/>cadence by population]
  G --> H[Titans + Shoggoths + PuppetMasters]
  H --> I[Quantum cloud + register drift]
  I --> J{RD step frame?<br/>every 2nd offset 1}
  J -- yes --> K[ReactionDiffusion.step]
  J -- no --> L[skip]
  K --> M[Weather.apply + Atmosphere]
  L --> M
  M --> N{slow cadences}
  N --> O[Louvain every 240f]
  N --> P[PageRank every 600f offset 300]
  O --> Q[render projections]
  P --> Q
  Q --> R[viz3d + observatory on cadence]
  R --> S[telemetry + analytics every 8th]
  S --> T[audio analyser poll O of 128]
  T --> A
```

## 3. Cadence schedule

The heavy passes are deliberately interleaved so no two land on the same frame. This is the core of
the frame-budget "resource plan".

| Stage                  | Cadence                           | Offset | Why staggered                                   |
| ---------------------- | --------------------------------- | ------ | ----------------------------------------------- |
| Grid rebuild           | every 2nd frame                   | 0      | halves O(n) rebuild cost                        |
| Reaction-diffusion     | every 2nd frame                   | 1      | never shares a frame with the grid rebuild      |
| Connectome             | 1f (≤400) / 2f (≤700) / 3f (>700) | —      | bounds the only per-frame O(n·k) consumer       |
| Quantum register drift | every 30th frame                  | —      | gate math is bursty, not continuous             |
| Telemetry + analytics  | every 8th frame                   | —      | text writes are O(1) but DOM-touching           |
| Observatory draw       | every 18th frame                  | —      | 16 canvases — expensive, low-urgency            |
| Louvain (tribes)       | every 240th frame                 | 60/180 | rebuilds graphology graph — heavy               |
| PageRank (halo)        | every 600th frame                 | 300    | offset 300 never collides with the 240f Louvain |
| Analytics regression   | every 60th frame                  | —      | O(W=120) mean/stddev/slope                      |

```mermaid
gantt
  title Heavy-pass interleave over 600 frames
  dateFormat X
  axisFormat %s
  section Substrates
  Grid rebuild (2f)      :0, 600
  Reaction-diffusion (2f off1) :1, 600
  section Slow cortex
  Louvain (240f)         :milestone, 240, 0
  Louvain (240f) again   :milestone, 480, 0
  PageRank (600f off300) :milestone, 300, 0
```

## 4. Entity lifecycle

Birth to death to perturbation — the state machine every organism passes through.

```mermaid
stateDiagram-v2
  [*] --> Spawned : seeded by phylum + morphotype
  Spawned --> Living : enters InstancedMesh pool
  Living --> Living : behavior drives velocity each frame
  Living --> Splitting : sT countdown reaches 0
  Splitting --> Living : two children inherit morph (belly pulse)
  Living --> Ranked : enters PageRank top-K (emissive halo)
  Ranked --> Living : falls out of top-K (restore baseline)
  Living --> Consumed : shoggoth consumption tick in reach
  Living --> Expired : age > life * tempMod
  Consumed --> Perturb : death writes RD field at ground UV
  Expired --> Perturb
  Perturb --> [*] : removed before next neighbor rebuild
```

## 5. Audit event flow

The fire-and-forget telemetry path — never blocks the sim, always bounded.

```mermaid
sequenceDiagram
  participant Sys as System
  participant A as AuditTrail (client ring)
  participant Srv as server.ts (ring, cap 200)
  participant P as HTMX panel

  Sys->>A: record(action, detail)
  A->>A: append to 200-entry ring O(1)
  A-)Srv: POST /api/audit (fire and forget)
  Srv->>Srv: reject > 8 KiB (413)
  Srv->>Srv: validate + truncate (surrogate-safe)
  Srv->>Srv: pushAudit O(1)
  Srv-->>A: 201 retained=n
  loop every 5s
    P->>Srv: GET /api/audit
    Srv-->>P: escaped <ol> newest-first
  end
```

## 6. Build / release process

```mermaid
flowchart LR
  Dev[edit] --> Check[bun run check]
  Check --> Fmt[prettier] --> Types[tsc strict] --> Lint[oxlint] --> Test[bun test] --> Build[bun build dist]
  Build --> Commit[commit]
  Commit --> Tag{tag v*?}
  Tag -- no --> CI[CI gate on push/PR]
  Tag -- yes --> Rel[release.yml]
  Rel --> Pkg[package dist + lab] --> Pub[GitHub Release asset]
  CI --> CodeQL[CodeQL weekly + PR]
```

## Invariants the process preserves

1. **dt is never negative** — clamped before any curve sampling, so a late first frame cannot
   NaN-poison the sim.
2. **Read-after-write ordering** — neighbor-dependent systems (connectome, graph-mind) run after the
   grid is rebuilt for the frame; slow passes read the latest `connectome.pairs`.
3. **No corpse references** — death removes an entity before the next rebuild, so links/tribes/ranks
   never address a dead index.
4. **Projections are pure reads** — render, audio, observatory, and analytics consume sim state and
   never write it back (the one sanctioned write-back direction is documented per system in
   [ERM.md](./ERM.md)).
5. **Bounded everything** — every ring, buffer, and heap is fixed-size; the process cannot grow
   unbounded memory regardless of input or runtime.

See [COMPLEXITY.md](./COMPLEXITY.md) for the measured cost of each stage and
[BENCHMARKS.md](./BENCHMARKS.md) for the ultra-tier 10k interleave in detail.
