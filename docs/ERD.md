# Entity-Relationship Model

The Mechalogodrom has no database — its "entities" live in scene graphs,
typed arrays, rings, and `localStorage`. The relational structure is real
nonetheless, and the composition root (`world.ts`) is effectively its join
engine. Diagrams below follow ERD (structure), ERM (relationship narrative),
and ERP (process models).

## ERD

```mermaid
erDiagram
  MORPHOTYPE ||--o{ ENTITY : "templates (userData.mi)"
  BEHAVIOR ||--o{ MORPHOTYPE : "assigned (id mod 26)"
  BEHAVIOR ||--o{ ENTITY : "drives each frame"
  ENTITY ||--o{ ENTITY : "splits into children"
  SHOGGOTH }o--o{ ENTITY : "tendrils pull (grid query, r=15)"
  SHOGGOTH ||--o{ ENTITY : "consumes, respawns corrupted"
  PUPPET_MASTER ||--o{ ENTITY : "KRONOS remorphs (<=30 per trigger)"
  PUPPET_MASTER }o--|| WEATHER : "SELENE selects at random"
  WEATHER ||--o{ ENTITY : "wind force + temperature lifespan"
  PUPPET_MASTER ||--o{ AUDIT_EVENT : "emits via onEvent"
  PERSISTED_STATE }o--|| SONG : "songIdx"
  PERSISTED_STATE }o--|| WEATHER : "weatherIdx"

  ENTITY {
    int mi "morphotype index 0..99"
    string beh "one of 26 behaviors (overridable)"
    float age ""
    float life "death at age > life * tempMod"
    vec3 vel ""
    float sortVal "value the sorting fields operate on"
    float nW "neural weight (connectome)"
    float act "neural activation accumulator"
    float energy "market wealth 0..100"
    int strategy "nash strategy 0|1"
    int typeId "type-theory tag 0..4"
    int setGroup "set-theory group 0..3"
    float sT "auto-split countdown"
    float belly "post-split digestion pulse"
  }
  MORPHOTYPE {
    int id "0..99"
    int gi "geometry-cache index (id mod ~41)"
    color col ""
    color em "emissive"
    float emI ""
    float met ""
    float rou ""
    float op "opacity; < 0.6 means transparent double-sided"
    string beh "behavior name"
    float srMin "scale range lo"
    float srMax "scale range hi"
    float spd ""
  }
  BEHAVIOR {
    string name "drift..lorenz (26 names, fixed order)"
    string family "motion | neighbor | theory | chaotic"
  }
  SHOGGOTH {
    vec3 position "Lorenz-ish drift, contained at r=60"
    float ph "phase offset"
    int tendrils "8 line segments max"
    float aT "consumption timer"
    float aI "interval 200..500 ticks"
    int consumed "victims so far"
  }
  PUPPET_MASTER {
    string name "AETHON | SELENE | KRONOS"
    string act "chaos | weather | mutate"
    float hue "0.08 | 0.6 | 0.3"
    float orb "orbit radius 45 | 55 | 50"
    float iv "trigger interval 400 | 600 | 500 ticks"
    float ti "elapsed since last trigger"
  }
  WEATHER {
    string name "CLEAR RAIN STORM AURORA VOID FOG"
    float fogDensity "0.003..0.012"
    float exposure "0.5 (VOID) .. 1.6 (AURORA)"
    float tempTarget "-40C (VOID) .. 20C"
    float windFactor "STORM x5 .. CLEAR x0.5"
  }
  SONG {
    string name "FF SOMBER CRYSTAL INDUSTRIAL ETHEREAL QUANTUM"
    int bpm "86 60 120 72 140"
    string wave "chord oscillator type"
    string bass "bass oscillator type"
    float fBase "lowpass filter base Hz"
  }
  AUDIT_EVENT {
    float ts "epoch ms"
    string action ""
    json detail "optional"
  }
  PERSISTED_STATE {
    int version "1"
    int seed "mulberry32 seed, varied per first boot"
    int songIdx ""
    int algoIdx ""
    int viewIdx ""
    int weatherIdx ""
    bool sfxOn ""
    int sessions "boot counter"
  }
```

## ERM — relationship narrative

- **MORPHOTYPE → ENTITY (1:N).** Each of the 100 morphotypes is a template:
  color, emissive, metalness, roughness, opacity, scale range, speed, wobble,
  and a behavior. An entity is born from one morphotype (`userData.mi`) and
  copies its parameters; `EntityManager.remorph` re-points an existing entity
  at a different morphotype with a geometry-ref swap and material rewrite
  (zero allocation, no scene churn).
- **BEHAVIOR → MORPHOTYPE / ENTITY (1:N).** The 26 behaviors are assigned to
  morphotypes round-robin (`id % 26`), so each behavior owns roughly 4
  morphotypes. Entities normally inherit the behavior through their
  morphotype, but it is overridable per entity: Shoggoth-corrupted spawns are
  forced to `lorenz` regardless of morphotype.
- **ENTITY → ENTITY (1:N, self).** Organisms reproduce: the user `split`
  action spawns 4 children around up to 5 mature parents; the `split`
  behavior and the auto-split countdown (`sT`) spawn singles; death below the
  100-entity floor triggers 3 respawns near the corpse.
- **SHOGGOTH ↔ ENTITY (M:N + 1:N).** Tendrils connect each Shoggoth to up to
  8 nearby entities per frame (spatial-hash query, radius 15) and tug them
  inward. On its consumption interval, a Shoggoth deletes its nearest entity
  within range and spawns 2 corrupted (`lorenz`, dark-violet) replacements —
  a destructive 1:N relationship that recolors the population over time.
- **PUPPET_MASTER → ENTITY / WEATHER / SimState (1:N).** KRONOS remorphs up
  to 30 random entities per trigger; SELENE overwrites the active weather
  index at random; AETHON raises `chaos` (clamped to 70% of max). Every
  trigger emits a `PuppetEvent` which the world forwards to the HUD toast and
  the audit trail.
- **WEATHER → ENTITY (1:N).** The active weather drives the wind vector
  added to every entity's velocity, and the temperature, which scales
  lifespan (cold ×0.7, hot ×1.3 on the death threshold).
- **SONG / PERSISTED_STATE (N:1 references).** `PersistedState` stores
  indices, not copies: `songIdx`, `algoIdx`, `viewIdx`, `weatherIdx` point
  into the fixed catalogs (5 songs, 20 algorithms, 4 view modes, 6 weathers).
- **AUDIT_EVENT (append-only ring).** Produced by user actions and puppet
  events; stored three ways with no foreign keys back — a local ring
  (`AuditTrail`, cap 200), `localStorage` (`cqm.audit.v1`), and the server's
  in-memory ring via `POST /api/audit`.

## ERP — process models

### Boot sequence

```mermaid
sequenceDiagram
  participant M as main.ts
  participant S as MemoryStore
  participant W as world.ts
  participant Q as detectQuality
  participant E as Engine
  participant Sys as sim systems

  M->>S: load()
  S-->>M: PersistedState or null -> defaults()
  M->>W: createWorld(persisted)
  W->>Q: detectQuality()
  Q-->>W: QualityProfile (dprCap, maxEntities, ...)
  W->>W: rng = mulberry32(persisted.seed)
  W->>E: new Engine(canvas, quality)
  W->>Sys: construct SimContext + all systems
  W->>Sys: entities.reset(300)
  M->>W: start rAF loop
```

### User action → audit round-trip

```mermaid
sequenceDiagram
  actor U as User
  participant I as InputSystem
  participant W as world.ts (UiActions)
  participant A as AudioEngine
  participant T as AuditTrail
  participant Srv as server.ts
  participant P as Audit panel (HTMX)

  U->>I: pointerdown [data-action="weather"]
  I->>W: actions.cycleWeather()
  W->>W: weather.cycle() -> AURORA
  W->>A: play('crystallize')
  W->>T: record('weather', { to: 'AURORA' })
  T-->>T: ring + localStorage 'cqm.audit.v1'
  T--)Srv: POST /api/audit (fire-and-forget)
  Note over P,Srv: independently, every 5 s
  P->>Srv: GET /api/audit (hx-get)
  Srv-->>P: ordered-list HTML fragment, newest first (hx-swap innerHTML)
```

### Audio engine lifecycle (Known Bugs 1-3 fixed)

```mermaid
stateDiagram-v2
  [*] --> Locked
  Locked --> Ready : first user gesture -> init()
  Ready --> Playing : toggleMusic() on -> scheduler starts
  Playing --> Ready : toggleMusic() off -> clearInterval (Bug 2)
  Playing --> Hidden : visibilitychange hidden -> ctx.suspend() (Bug 3)
  Hidden --> Playing : visible -> ctx.resume()
  note right of Playing
    Octave wraps every 4 cycles
    (Bug 1) instead of drifting
    ultrasonic
  end note
```

### Weather state machine

```mermaid
stateDiagram-v2
  [*] --> CLEAR
  CLEAR --> RAIN : cycle()
  RAIN --> STORM : cycle()
  STORM --> AURORA : cycle()
  AURORA --> VOID : cycle()
  VOID --> FOG : cycle()
  FOG --> CLEAR : cycle()
  note right of VOID
    SELENE may jump to ANY state
    at random on her 600-tick timer
  end note
```
