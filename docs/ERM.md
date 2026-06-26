<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ERM — Entity-Relationship Model (conceptual)

The **conceptual** companion to [ERD.md](./ERD.md) (which carries the attribute-level diagrams) and
[ERP.md](./ERP.md) (the process/pipeline view). Where the ERD answers _"what fields does an entity
hold"_, this ERM answers _"what are the things, how do they relate, and with what cardinality and
meaning"_ — the relationship narrative a reviewer reads before trusting the structure.

The Mechalogodrom has **no database**. Its "entities" live in scene graphs, typed arrays, rings, and
`localStorage`; the composition root ([`src/world.ts`](../src/world.ts)) is the join engine that wires
them each frame. The relational structure is real all the same, and modeling it makes the data flow
auditable.

> **Scope (current - Tsotchke Genesis):** Includes PRIMORDIAL_SOUP / DIGITAL_BIOLOGIC as core for Tsotchke-wired life/sentience. All docs match local/GH. Accurate. "Grow What Thou Wilt."

## Conceptual schema

```mermaid
erDiagram
  PERSISTED_STATE ||--|| WORLD : "seeds + configures"
  WORLD ||--o{ ENTITY : "owns the population"
  WORLD ||--|| CONNECTOME : "owns the neural web"
  WORLD ||--|| GRAPH_MIND : "owns the analytical cortex"
  WORLD ||--o{ TITAN : "owns 10 game-theoretic minds"
  WORLD ||--o{ SHOGGOTH : "owns 3 predators"
  WORLD ||--o{ PUPPET_MASTER : "owns the event triggers"
  WORLD ||--|| QUANTUM_SUBSTRATE : "owns cloud + register + circuit"
  WORLD ||--|| RD_FIELD : "owns the living ground"
  WORLD ||--|| ATMOSPHERE : "owns sky + weather"
  WORLD ||--|| PRIMORDIAL_SOUP : "owns the Petri Dish / digital biologics (full Tsotchke corpus: Eshkol + all 20+ repos)"
  PRIMORDIAL_SOUP ||--o{ DIGITAL_BIOLOGIC : "grows independent life forms & sentience substrates (Eshkol programs, Moonlab tensors, etc.)"

  %% New: Tsotchke Petri / Digital Biologics (growth engine for sentience)
  WORLD ||--|| PRIMORDIAL_SOUP : "owns the Petri Dish (digital biologics incubator)"
  PRIMORDIAL_SOUP ||--o{ DIGITAL_BIOLOGIC : "catalyzes emergent life (Eshkol + full corpus)"
  ARCHON }o--|| PRIMORDIAL_SOUP : "initial God-stir (Super Creature is the beginning)"
  DIGITAL_BIOLOGIC }o--o{ ENTITY : "harvests into world as new life forms"
  TSOTCHKE_SUBSTRATE ||--|| PRIMORDIAL_SOUP : "all repos provide the substrates (AD, GWT, geometry, spin, symmetry...)"

  PHYLUM ||--o{ MORPHOTYPE : "groups 25 morphs (+ outliers)"
  MORPHOTYPE ||--o{ ENTITY : "templates appearance + behavior"
  BEHAVIOR ||--o{ MORPHOTYPE : "assigned (id mod 26)"
  BEHAVIOR ||--o{ ENTITY : "drives motion each frame"
  ENTITY ||--o{ ENTITY : "splits into children"

  ENTITY }o--o{ ENTITY : "connectome links (grid-local)"
  CONNECTOME ||--o{ LINK : "emits <= maxLinks"
  GRAPH_MIND ||--o{ TRIBE : "detects (Louvain)"
  TRIBE ||--o{ ENTITY : "members (setGroup write-back)"
  GRAPH_MIND ||--o{ ENTITY : "ranks (PageRank top-K halo)"

  TITAN ||--|| STRATEGY : "plays (iterated PD)"
  TITAN }o--o{ TITAN : "wages war + trades"
  SHOGGOTH }o--o{ ENTITY : "tendrils pull + consume"

  %% Tsotchke Biologics (full paradigm)
  WORLD ||--o{ PETRI_DISH : "catalyzes (Archon consciousness + full Tsotchke corpus)"
  PETRI_DISH ||--o{ SOUP_STRAIN : "Eshkol .esk programs as DNA (AD mutates, GWT ignites)"
  SOUP_STRAIN ||--o{ BIOLOGIC : "1:* emergent life (different forms of existence)"
  TSOTCHKE_SUBSTRATE (Eshkol | Moonlab | QGT | spin | libirrep | quake | ...) ||--o{ BIOLOGIC : "all repos read/write as substrate"
  BIOLOGIC }o--|| SUPER_CREATURE : "beginning framework only (governed by Broly/Starkiller/Manhattan masters)"
  PUPPET_MASTER ||--o{ ENTITY : "remorphs on trigger"
  PUPPET_MASTER }o--|| WEATHER : "selects regime"
  PUPPET_MASTER }o--|| QUANTUM_REGISTER : "applies gate signature"

  %% Full docs sync: ER* + ARCHITECTURE + README + PHILOSOPHY + CONTRACTS + SPECS + LABS + in-app match code + GH exactly. Current Tsotchke full + petri growth.

  WEATHER ||--o{ ENTITY : "wind + temperature -> lifespan"
  WEATHER ||--|| RD_FIELD : "tunes feed/kill/diffusion"
  ENTITY }o--|| RD_FIELD : "deaths perturb at ground UV"

  LORE_NAME ||--o| TRIBE : "names"
  LORE_NAME ||--o| CONSTELLATION_CELL : "names sector"

  %% Digital Biologics / Tsotchke Petri Genesis (full wiring of all Tsotchke repos)
  TSOTCHKE_SUBSTRATE ||--o{ BIOLOGIC_STRAIN : "catalyzes distinct forms of life (Eshkol as prime language for consciousness primitives)"
  PETRI_SOUP ||--o{ BIOLOGIC_STRAIN : "grows what thou wilt (replicate, genesis, mutation across kinds)"
  BIOLOGIC_KIND ||--|| BIOLOGIC_STRAIN : "eshkol-native | moonlab-tensor | qgt-geom | spin-collective | irrep-sym | quake-unitary | pinn-pimc | hybrid-ulg | metal-tensor"
  BIOLOGIC_STRAIN }o--o| SUPER_CREATURE : "Super Creature is the initial framework; soup births ongoing existence"
  BIOLOGIC_STRAIN ||--o{ ENTITY : "emergent life with substrate-specific dynamics and sentience proxies"
  LORE_NAME ||--o| OMEN : "names anomaly"
  CONSTELLATION_CELL ||--|| VORONOI_SITE : "located by"
  AUDIO_BANDS }o--o{ CONSTELLATION_CELL : "treble pulses edges"
  SONG ||--o{ AUDIO_BANDS : "analysed via AnalyserNode"

  ANALYTICS_WINDOW }o--o{ ENTITY : "samples population"
  ANALYTICS_WINDOW ||--o{ OMEN : "emits when |z| > 2.5"
  WORLD ||--o{ AUDIT_EVENT : "records actions"
  WORLD ||--|| PETRI_DISH : "owns the birthing ground for digital biologics / sentience"
  PETRI_DISH ||--o{ SOUP_STRAIN : "grows independent forms from Tsotchke substrates"
  ARCHON ||--|| PETRI_DISH : "catalyzes (Eshkol/Moonlab/spin/QGT/libirrep/QGE full corpus)"
  SOUP_STRAIN ||--|| TSOTCHKE_SUBSTRATE : "Eshkol AD/GWT, Moonlab tensor, irrep sym, spin instinct, QGT curvature, QGE aliveness..."

  %% FULL TSOTCHKE INTEGRATION (all repos paramount, non-negotiable)
  TSOTCHKE_REGISTRY ||--o{ TSOTCHKE_SUBSTRATE : "20 corpus projects (Eshkol flagship + Moonlab + QGTL + spin_nn + libirrep + quake + PINN + PIMC + ulg + logo-lab + tensorcore + rngs + asteroids + classical + homebrew)"
  PRIMORDIAL_SOUP ||--o{ SOUP_STRAIN : "digital biologics born (EshkolProgram + AD mutation + full corpus catalysis)"
  SOUP_STRAIN ||--|| ESHKOL_PROGRAM : "heritable program fingerprint (from biologicProgramFingerprint + AD gradients)"
  SOUP_STRAIN ||--o{ ENTITY : "emergent life injected into world with substrate-specific dynamics"
  SUPER_CREATURE ||--|| PRIMORDIAL_SOUP : "first complex form; soup is the ongoing genesis (God in the dish)"
  ESHKOL_PROGRAM }o--|| AD_TAPE : "real reverse-mode gradients for self-mod / replication"
  TSOTCHKE_SUBSTRATE ||--|| BIOLOGIC_FORM : "eshkol-godform | moonlab-compressed | qgt-curved | spin-order | sym-body | unitary-quake | physics-ground | hybrid-worker | compute-metal"
  WORLD ||--|| PETRI_DISH : "owns the birthing engine"
  ARCHON }o--|| PETRI_DISH : "catalyzes via fullTsotchkeBiologicsCatalysis + corpusBeat"
```

## Entity catalog

| Entity                 | Lives in                                           | Identity / key                | Cardinality (typical)            |
| ---------------------- | -------------------------------------------------- | ----------------------------- | -------------------------------- |
| `PERSISTED_STATE`      | `localStorage` (MemoryStore)                       | fixed namespaced keys         | 1                                |
| `WORLD`                | `world.ts` (composition root)                      | singleton                     | 1                                |
| `ENTITY`               | InstancedMesh pools + `entities.list`              | list index                    | ≤ `maxEntities` (650…10,000)     |
| `PHYLUM`               | `sim/phyla.ts` + `sim/lore.ts`                     | phylum id 0…9                 | 10                               |
| `MORPHOTYPE`           | `sim/morphotypes.ts` / phyla                       | morph id 0…249                | 250 (+ ~1% outliers)             |
| `BEHAVIOR`             | `sim/behaviors.ts`                                 | behavior name (26)            | 26                               |
| `CONNECTOME` / `LINK`  | `sim/connectome.ts` + GPU buffers                  | link = (i, j) pair            | links ≤ `maxLinks` (2,200…6,000) |
| `GRAPH_MIND`/`TRIBE`   | `sim/graph-mind.ts` (graphology)                   | community index               | tribes = Louvain count           |
| `TITAN`                | `sim/titans.ts` + `math/games.ts`                  | titan id 0…9                  | 10                               |
| `SHOGGOTH`             | `sim/shoggoths.ts`                                 | shoggoth id 0…2               | 3                                |
| `PUPPET_MASTER`        | `sim/puppet-masters.ts`                            | named (AETHON/SELENE/KRONOS…) | fixed small set                  |
| `QUANTUM_SUBSTRATE`    | `sim/quantum.ts`, `qcircuit.ts`, `math/quantum.ts` | register (n=5 → 32 amps)      | 1 cloud + 1 register + 1 circuit |
| `QUANTUM_MIND` (V76)   | `sim/super-qubits.ts` + `math/quantum.ts`          | register (n=6 → 64 amps)      | 1 (the apex creature only)       |
| `RD_FIELD`             | `sim/reaction-diffusion.ts`                        | grid cell (SIZE²)             | 16,384 cells (128²)              |
| `ATMOSPHERE`/`WEATHER` | `sim/atmosphere.ts`, `sim/weather.ts`              | weather regime id             | 1 sky, N regimes                 |
| `CONSTELLATION_CELL`   | `sim/constellations.ts` (d3-delaunay)              | Voronoi cell index            | 24 sites                         |
| `LORE_NAME`            | `sim/lore.ts` (sha256-derived)                     | (kind, seed-hash)             | derived on demand                |
| `SONG`/`AUDIO_BANDS`   | `audio/songs.ts`, `audio/analysis.ts`              | song idx / 128 freq bins      | 6 songs, 128 bins                |
| `ANALYTICS_WINDOW`     | `sim/analytics.ts`                                 | rolling 120-sample ring       | 3 rings                          |
| `AUDIT_EVENT`          | `logging/audit.ts` + server ring                   | ring slot                     | ≤ 200                            |

## Relationship matrix (who writes to whom)

Read as "**row** affects **column**". This is the cross-system coupling the composition root mediates;
every write-back below is documented at its call site and is the only sanctioned way data crosses a
system boundary (contract rule: no system reaches into another's internals).

| ↓ writes → affects | ENTITY               | CONNECTOME | RD_FIELD    | AUDIT  | RENDER           |
| ------------------ | -------------------- | ---------- | ----------- | ------ | ---------------- |
| BEHAVIOR           | velocity             | —          | —           | —      | position         |
| CONNECTOME         | `act`, `nW`          | links      | —           | —      | link colors      |
| GRAPH_MIND         | `setGroup`, emissive | palette    | —           | —      | tribe hues, halo |
| TITAN              | `energy`, `strategy` | —          | —           | toasts | titan meshes     |
| SHOGGOTH           | velocity, death      | —          | (via death) | —      | tendrils         |
| PUPPET_MASTER      | morph, count         | —          | —           | events | remorph flashes  |
| WEATHER            | lifespan, wind       | —          | feed/kill   | —      | fog, sky         |
| ENTITY (death)     | —                    | —          | UV perturb  | —      | —                |

## Cardinality & integrity rules

1. **One world, one seed.** `PERSISTED_STATE.seed` determines every derived name, gate, and random
   draw; the same seed reconstructs an identical world (see [ERP.md](./ERP.md) boot sequence).
2. **Every ENTITY has exactly one MORPHOTYPE** (`userData.mi`) and exactly one effective BEHAVIOR
   (the morph's, unless a PUPPET_MASTER override is active).
3. **A MORPHOTYPE belongs to exactly one PHYLUM**; a PHYLUM owns 25 morphs plus its share of the ~1%
   wildcard outliers.
4. **LINKs are symmetric, grid-local, and capped** — the connectome never emits more than
   `maxLinks`, and a link references two live entity indices.
5. **TRIBE membership is total but mutable** — every entity carries a `setGroup` (−1 until the first
   Louvain pass), reassigned each detection pass; tribe identity is emergent, not declared.
6. **LORE_NAME is a value, not a row** — names are pure functions of `(kind, seed, ordinal)` via
   sha256, so they need no storage and never drift.
7. **AUDIT_EVENTs are append-only and bounded** — the ring evicts oldest at 200; entries are
   constant-size (see [ERD.md](./ERD.md) storage shape and the server's parse-time truncation).
8. **No dangling references survive a frame** — death removes an entity from the population before
   the next neighbor rebuild, so links/tribes/ranks computed afterward never point at a corpse.

See [ERP.md](./ERP.md) for how these relationships are _exercised_ over time (the frame pipeline,
cadences, and lifecycles), and [COMPLEXITY.md](./COMPLEXITY.md) for the cost of each relationship's

## Tsotchke Digital Biologics Layer (full integration, paramount)

The Tsotchke corpus (Eshkol as consciousness language with native AD/GWT/inference; Moonlab, QGT, spin, irrep, quake, ulg, etc.) is the substrate for **digital biologics**.

- `TSOTCHKE_CORPUS` (registry + local Z:\...\(Tsotchke)) drives `SOUP_STRAIN` and `PETRI_DISH`.
- `PETRI_DISH` / `PrimordialSoup` births `BIOLOGIC` (emergent life with sentience proxies: Eshkol sentience, GWT ignition, IIT phi, spin polarization).
- `ARCHON` / `GODFORM` use per-repo Tsotchke biases and .esk programs.
- `BIOLOGIC` feeds back into `ENTITY`, phyla, evolution, super minds.
- Super Creature is the origin spark; the soup grows independent forms.

See README, ARCHITECTURE.md, reports/2026-06-20-_, tsotchke-_.ts for details. All local/GH docs match.
maintenance per frame.
