# Architecture

How the Cosmogonic Quantum Mechalogodrom is wired. The binding per-module API
spec lives in [MODULE-CONTRACTS.md](./MODULE-CONTRACTS.md); this document is
the map.

## Design rules (enforced, not aspirational)

1. **Acyclic runtime module graph.** `src/types.ts` is a type-only hub —
   every module may `import type` from it, but leaf modules never import it at
   runtime (`verbatimModuleSyntax` erases the type edges at emit).
2. **Leaf modules are DOM-free.** `src/math/*`, `src/logging/logger.ts`,
   `src/sim/constants.ts`, `src/audio/songs.ts` run under `bun test` with no
   browser. Browser globals are confined to `src/ui/*`, `src/core/engine.ts`,
   `src/audio/engine.ts`, `src/logging/audit.ts`, `src/memory/store.ts`, and
   `src/main.ts`.
3. **Composition root owns the wiring.** `src/world.ts` constructs the single
   `SimContext` (scene, quality, rng, grid, morphs, geos, state, audit, sfx),
   instantiates every system, implements `UiActions`, and runs the frame
   pipeline. `src/main.ts` boots it and binds window-level events.
4. **Determinism.** One `mulberry32` stream, seeded from `PersistedState.seed`,
   injected via `SimContext.rng`. No sim module touches the global random
   number generator.

## Module graph

```mermaid
graph TD
  subgraph entry["Entry & composition"]
    main["src/main.ts"]
    world["src/world.ts"]
  end

  subgraph corel["src/core"]
    quality["quality.ts<br/>detectQuality()"]
    engine["engine.ts<br/>Engine (renderer/scene/camera)"]
  end

  subgraph siml["src/sim"]
    constants["constants.ts (leaf)<br/>WEATHERS · BEHAVIORS · VIEW_MODES<br/>MONOLITH_CONFIG · PIPE_LINKS · DIORAMA_CONFIG"]
    geocache["geometry-cache.ts<br/>~41 shared BufferGeometries"]
    morphotypes["morphotypes.ts<br/>100 MorphTypes"]
    algorithms["algorithms.ts<br/>ALGOS (20 sort fields)"]
    behaviors["behaviors.ts<br/>26 behavioral fields"]
    entities["entities.ts<br/>EntityManager"]
    shoggoths["shoggoths.ts<br/>ShoggothSystem"]
    puppets["puppet-masters.ts<br/>PuppetMasterSystem"]
    weather["weather.ts<br/>WeatherSystem"]
    quantum["quantum.ts<br/>QuantumCloud"]
    connectome["connectome.ts<br/>Connectome"]
    environment["environment.ts<br/>EnvironmentSystem"]
  end

  subgraph simv2["src/sim — Wildbeyond V2"]
    qcircuit["qcircuit.ts<br/>QuantumCircuitSystem"]
    rd["reaction-diffusion.ts<br/>ReactionDiffusionSystem (Gray-Scott 128²)"]
    graphmind["graph-mind.ts<br/>GraphMind (graphology · louvain · pagerank)"]
    constellations["constellations.ts<br/>ConstellationSystem (d3-delaunay)"]
    lore["lore.ts<br/>LoreEngine (@noble/hashes sha256)"]
    analytics["analytics.ts<br/>AnalyticsSystem (simple-statistics)"]
  end

  subgraph mathl["src/math (leaves)"]
    scalar["scalar.ts"]
    rng["rng.ts<br/>mulberry32 · hashSeed"]
    shash["spatial-hash.ts<br/>SpatialHash"]
    qreg["quantum.ts<br/>QuantumRegister (statevector, n ≤ 8)"]
  end

  subgraph audiol["src/audio"]
    songs["songs.ts (leaf)<br/>SONGS · SFX_TYPES"]
    aengine["engine.ts<br/>AudioEngine"]
    analysis["analysis.ts<br/>AudioAnalysis (AnalyserNode bands)"]
  end

  subgraph uil["src/ui"]
    input["input.ts<br/>InputSystem"]
    hud["hud.ts<br/>Hud"]
    panels["panels.ts<br/>TelemetryPanel"]
    graphs["graphs.ts<br/>Sparkline"]
  end

  subgraph persist["src/logging + src/memory"]
    logger["logging/logger.ts (leaf)"]
    audit["logging/audit.ts<br/>AuditTrail"]
    store["memory/store.ts<br/>MemoryStore"]
  end

  subgraph serverl["Server"]
    server["server.ts (Bun.serve)"]
    indexhtml["index.html"]
    docshtml["docs.html"]
  end

  main --> world
  world --> quality
  world --> engine
  world --> geocache
  world --> morphotypes
  world --> algorithms
  world --> entities
  world --> shoggoths
  world --> puppets
  world --> weather
  world --> quantum
  world --> connectome
  world --> environment
  world --> aengine
  world --> input
  world --> hud
  world --> panels
  world --> store
  world --> audit
  world --> shash
  world --> rng
  world --> qcircuit
  world --> rd
  world --> graphmind
  world --> constellations
  world --> analytics
  world --> analysis

  entities --> behaviors
  behaviors --> scalar
  behaviors --> constants
  morphotypes --> constants
  environment --> constants
  panels --> graphs
  aengine --> songs

  qcircuit --> qreg
  graphmind --> connectome
  graphmind --> entities
  constellations --> lore
  analysis --> aengine

  qcircuit -. "bands() → setQuantumBands (every 6f)" .-> quantum
  rd -. "DataTexture → attachGroundEmissiveMap" .-> environment
  analytics -. "record('omen', …) on |z| > 2.5" .-> audit
  puppets -. "PuppetEvent → gate sequence" .-> qcircuit
  entities -. "deaths → perturb(u, v)" .-> rd
  graphmind -. "setCommunityOf → tribe link palette" .-> connectome

  server --> indexhtml
  server --> docshtml
  server --> logger

  audit -. "fire-and-forget POST /api/audit" .-> server
  indexhtml -. "HTMX GET /api/audit every 5s" .-> server
```

Notes:

- `src/types.ts` is omitted from the graph on purpose: all of its edges are
  `import type` and vanish at emit.
- Neighbor lookups inside `behaviors.ts`, `shoggoths.ts`, and `connectome.ts`
  go through `ctx.grid` (the shared `SpatialHash<Entity>`), which `world.ts`
  rebuilds — systems never own the grid.
- The `hunt` behavior is the one sim consumer that imports `MONOLITH_CONFIG`
  directly from `constants.ts` (it steers toward the nearest of 16 monoliths).
- `math/quantum.ts` (QuantumRegister), `sim/lore.ts` (LoreEngine), and the
  dotted V2 edges express PHILOSOPHY.md rule 4 — every Wildbeyond system reads
  from AND writes to at least one existing system. The dotted arrows are the
  feedback web: register bands recolor the quantum cloud, the RD field lights
  the ground, Louvain tribes recolor connectome links and rewrite entity
  set-groups, analytics omens land in the audit ring, audio bands shimmer the
  lights/constellations/cloud.
- New external dependencies stay behind owned facades (ADR 0005): graphology +
  louvain + metrics inside `graph-mind.ts`, d3-delaunay inside
  `constellations.ts`, @noble/hashes inside `lore.ts`, simple-statistics inside
  `analytics.ts`. No other module imports them.

## Frame pipeline

Owned by `world.ts`, driven by `requestAnimationFrame`:

```mermaid
flowchart LR
  rAF([rAF]) --> dt["dt = min(clock.delta, 0.05)<br/>× timeScale"]
  dt --> camera["camera<br/>(free/orbit/fly/top)"]
  camera --> wx["weather.apply"]
  wx --> pm["puppetMasters.update"]
  pm --> grid["grid rebuild<br/>(every 2nd frame)"]
  grid --> shog["shoggoths.update"]
  shog --> sort["sort step<br/>ALGOS[algoIdx]"]
  sort --> ents["entities.update"]
  ents --> conn["connectome.update<br/>(cadence by n)"]
  conn --> qc["qcircuit.update<br/>(every 30th frame)"]
  qc --> q["quantum.update"]
  q --> rd["rd.step<br/>(every 2nd frame, offset 1)"]
  rd --> gm["graphMind<br/>communities 240f · rank 600f+120"]
  gm --> an["analytics<br/>push 8f · analyze 60f"]
  an --> cons["constellations.update<br/>(every frame, O(1))"]
  cons --> env["environment.update"]
  env --> telem["telemetry<br/>(every 8th frame)"]
  telem --> render([engine.render])

  pm -. "PuppetEvent → onPuppetEvent" .-> qc
  sort -. "swap → onSortSwap(a, b)" .-> qc
  qc -. "bands() every 6f" .-> q
  ents -. "deaths → rd.perturb(u, v)" .-> rd
  ab["audio bands<br/>(polled every frame)"] -.-> cons
```

Cadences — V1 rows straight from the legacy loop, V2 rows from
MODULE-CONTRACTS.md §Frame pipeline V2:

| Step                        | Cadence                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Grid rebuild                | Every 2nd frame (halves the O(n) rebuild cost)                                                                                       |
| Connectome                  | Every frame (n ≤ 400), every 2nd (≤ 700), every 3rd (> 700)                                                                          |
| Quantum colors              | Every 6th frame (positions upload every frame)                                                                                       |
| Telemetry text              | Every 8th frame                                                                                                                      |
| Sparkline redraw            | Every 18th frame                                                                                                                     |
| Quantum circuit (V2)        | `update()` every 30th frame (ry drift + entropy); measures every 8th update (≈ 240f); gate events (puppet / sort swap) as they occur |
| Register bands → cloud (V2) | Every 6th frame, aligned with the cloud's color pass                                                                                 |
| Reaction-diffusion (V2)     | `step()` every 2nd frame, offset 1 from the grid rebuild (the two never share a frame)                                               |
| Louvain communities (V2)    | Every 240th frame                                                                                                                    |
| PageRank (V2)               | Every 600th frame, offset 120 from the Louvain pass                                                                                  |
| Analytics (V2)              | `push()` every 8th frame (with telemetry); `analyze()` every 60th frame                                                              |
| Constellations (V2)         | Every frame — O(1) opacity/pulse only (Voronoi built once at construction)                                                           |
| Audio band poll (V2)        | Every frame — O(128) analyser read, zeros until audio is initialized                                                                 |

## Data flow

Three loops run concurrently:

**1. Simulation loop (per frame).** `InputSystem` exposes `keys`, `camVel`,
and `touch` as read-only state; `world.ts` reads them in the camera step.
Systems communicate only through `SimContext` (shared mutable `SimState`,
shared `SpatialHash`, shared `Rng`) and explicit constructor references
(`EntityManager` is handed to shoggoths, puppet masters, and the connectome).
`EntityManager.update` returns `UpdateStats`; `world.ts` assembles the
`TelemetrySnapshot` (including the once write-only `mutations` counter, Known
Bug 14) and feeds `TelemetryPanel` every 8th frame.

**2. Audit loop (event-driven + polled).** User actions and puppet-master
events call `AuditTrail.record(action, detail)`, which appends to a local
ring (mirrored to `localStorage` key `cqm.audit.v1`) and fire-and-forget
POSTs JSON to `/api/audit`. The server keeps its own in-memory ring (cap
200). The `#aP` panel in `index.html` polls `GET /api/audit` via HTMX
(`hx-trigger="load, every 5s"`) and swaps in the returned `<ol>` fragment —
no client-side rendering code involved.

**3. Persistence loop (boot/exit).** `MemoryStore.load()` returns a versioned
`PersistedState` (or `null` on corruption — it never throws), from which
`world.ts` seeds the RNG and restores song/algorithm/view/weather/SFX
preferences; preference-changing actions call `save()`.

**4. Feedback web (V2).** The Wildbeyond systems close loops between
previously independent subsystems, all fanned out by `world.ts`:

- Entity deaths call `rd.perturb(u, v)` at the death position normalized to
  ground UV — the population's mortality literally scars the ground texture.
- `PuppetEvent`s fan out to `qcircuit.onPuppetEvent` (characteristic gate
  sequences: AETHON → rx(chaos·π/4), SELENE → h+cz, KRONOS → x+swap) and to a
  `LoreEngine` epithet rendered in the HUD toast.
- Sort swaps call `qcircuit.onSortSwap(a, b)` (parity-chosen cx targets) — the
  sorting field drives the register, the register's bands recolor the quantum
  cloud, and a measurement collapse implodes it locally.
- `GraphMind` reads `connectome.pairs`, writes community indices into entity
  `setGroup`s (making the set-theory behavior tribe-aware) and installs the
  8-hue link palette via `connectome.setCommunityOf`.
- `AudioAnalysis` bands modulate point-light shimmer (bass), constellation
  pulse (treble), and quantum-cloud point size (level), all with multipliers
  ≤ 0.35 so a silent world is visually identical to v1.
- `AnalyticsSystem` watches telemetry rings and emits lore-named omens into
  the same audit pipeline as user actions (loop 2 above).

## Quality profile

`detectQuality()` resolves once at boot from `matchMedia` + viewport
heuristics (legacy lines 153–162, 457):

| Knob           | Mobile | Desktop |
| -------------- | ------ | ------- |
| `dprCap`       | 1.25   | 2       |
| `maxEntities`  | 650    | 1,000   |
| `quantumCount` | 3,500  | 6,000   |
| `maxLinks`     | 2,200  | 4,000   |
| `shadows`      | off    | on      |
| `starCount`    | 2,000  | 4,000   |

`Engine.onResize()` reapplies `setPixelRatio(min(devicePixelRatio, dprCap))`
on every resize (Known Bug 6 — the legacy version set it once and went blurry
when the window moved between monitors).

## Server

`server.ts` is a Bun fullstack server: it imports `index.html` and
`docs.html` directly (Bun bundles their TypeScript and Tailwind on the fly)
and routes `/`, `/docs`, `GET /api/health`, `GET|POST /api/audit`, with a 404
fallback. Port `Number(process.env.PORT) || 3000`. Requests are logged via
`createLogger('server')` into the shared 512-entry ring.
