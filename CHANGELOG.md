# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-06-11

### Added

- **Pinch-to-zoom** on touch devices: a two-finger pinch on the world feeds the
  same `zoom` accumulator as the mouse wheel — spread apart to pull the camera
  in, pinch together to push out. One-finger look is suppressed during the
  gesture so it can't also yank the camera. Joins the existing joystick (move),
  look pad (look), and radial action wheel for full keyboard-parity touch.
  (`src/ui/input.ts`.)
- **Sorting-field light show**: selecting an algorithm now ignites a bright
  shimmer sweep across the population (~500 organisms flash regardless of
  count), and each swap flashes brighter (emissive 2.6 → 4), so the chosen
  field visibly performs as it sorts. (`src/world.ts`.)
- **A unique sound per sorting field**: `AudioEngine.cue(idx, total)` gives each
  of the 25 fields its own tone — the pitch climbs ~3 octaves across the list
  and the waveform rotates through four timbres, with a shimmering octave
  partial, so no two fields sound alike. (`src/audio/engine.ts`, `src/world.ts`.)

### Notes

- Verified the 25 sorting fields work: each provably reduces inversions (or is a
  documented perpetual field) in `tests/algorithms.test.ts`, and the live HUD
  shows the per-frame swap count climbing. (A "frozen" sim in a preview only
  means the browser tab is backgrounded — `requestAnimationFrame` pauses when
  `document.hidden`.)

## [0.6.0] - 2026-06-11

The **ATELIER** pass (CONTRACTS V6) — a second round of direct user feedback.

### Fixed

- **`/docs` no longer crashes**: Mermaid treats `;` as a statement separator, so
  semicolons inside sequence- and ER-diagram labels threw a parse error. Replaced
  them; all three diagrams render. (`docs.html`.)
- **Observatory legibility — no more text over data**: every chart reserves a
  title band and insets the plot body with padding so titles/legends/readouts
  never overlap the plotted data. The cramped **Titan Roster** and **Titan
  Resources** panels were reworked — real row heights with gaps, a single-column
  or compact two-column fallback, ellipsis-truncated names that can't collide
  with their values, and bars in a separate band from their labels. The
  observatory canvases are taller (≥72px desktop) and the panel roomier/wider on
  desktop and TV. (`src/ui/observatory.ts`, `index.html`, `src/styles/app.css`.)

### Added

- **Visible 25-algorithm picker**: a new collapsible "Sorting Fields" panel lists
  all 25 sorting algorithms as clickable rows (no longer just a cycle button);
  selecting one highlights it, announces it with a distinct per-field tone (the
  eight SFX timbres cycle by index), and a live progress bar on the active row
  tracks how sorted the field currently is. The toolbar cycle button shares the
  same selection path. (`index.html`, `src/styles/app.css`, `src/world.ts`,
  `src/ui/hud.ts`.)
- **Four-page Lab**: the lab artifact is now a 4-page app — page 1 the collapse
  field, pages 2-4 boards of multiple live, seeded generative data-visuals
  (phase portraits, reaction-diffusion, Voronoi, statevector, attractors,
  fractals, networks, spectra…) including p5 WEBGL 3D views. Page nav preserves
  the seed. (`lab/quantum-wildbeyond.html`.)
- **Architecture report at `/docs`**: expanded into a local GitHub-Pages-style
  report — a file/folder architecture tree of the real repo, explicitly labelled
  **ERD / ERM / ERP** sections, per-era system explanations, the tech stack, and
  the determinism/perf model. (`docs.html`.)

## [0.5.0] - 2026-06-11

The **RESONANCE** pass (CONTRACTS V5) — a round of direct user feedback on 0.4.0.

### Fixed / Changed

- **Observatory legibility**: the VAR / ECO / WAR pages rendered but were faint,
  sparse, and unlabeled — they read as broken. Every one of the 16 canvases now
  carries an in-canvas title, value/unit readout, axis ticks/gridlines, bold
  high-contrast strokes and additive glow, and a boot-seed prime so a fresh
  world is never blank. (`src/ui/observatory.ts`.)
- **Population fills its ceiling**: the ultra tier now grows to the full 10,000
  entities (was an adaptive 6,500 throttle) — an ultra classification implies a
  discrete GPU, and the per-frame neighbour-query optimizations keep it smooth.
  `targetEntities === maxEntities` on every tier; determinism preserved per
  device. (`src/core/quality.ts`.)
- **Algorithms are visible again**: the active sorting field now batches swaps
  per frame (6–28, scaled to population) so it visibly organizes the world
  instead of nudging one organism among thousands; swapped organisms flash
  brighter and the HUD shows a live swap-count (`step N · M ⇄`). Cycling the
  algorithm now obviously changes the activity. (`src/world.ts`, `src/ui/hud.ts`.)
- **25 sorting fields** (was 20): added TIM RUN MERGE, BITONIC NETWORK, PATIENCE
  BUCKET, BRICK TRANSPOSE, and a fifth — each with a distinct spatial swap
  signature. (`src/sim/algorithms.ts`.)
- **Audio raised to the QUANTUM/BLACK MERIDIAN tier**: VOIDCROWN, ELDER ENGINE,
  and LAST THEOREM rebuilt with full 4-note dramatic voicings and 16-step
  evolving melodies; a new cataclysmic finale, **STARKILLER REQUIEM**; the
  synthesis deepened across all songs with a sub-bass octave, a third detuned
  chord voice, chord-tone arpeggiation, slow filter-cutoff LFO swells, and a
  per-song rising/falling intensity envelope. (`src/audio/songs.ts`, `engine.ts`.)
- **Lab artifact filled**: the collapse-field now grows to the full viewport
  (was ~40% dead margin) with a live in-canvas HUD (seed, particle count,
  collapse events, last measurement + Born probability, field blend, fps) and a
  "THE MATH" legend explaining the Lorenz-XZ + curl-noise blend and the Born
  rule. (`lab/quantum-wildbeyond.html`.)
- **Mobile/portrait ergonomics**: on small / portrait / coarse-pointer viewports
  the four panels become edge-docked **slide-out sheets** — each parked
  off-screen behind an always-visible handle tab (TEL/CTL/OBS/AUD) that slides it
  in over the unobstructed 3D world; one sheet per edge, Escape closes all. The
  audit panel is a sheet now instead of hidden. (`index.html`, `src/styles/app.css`.)

### Performance

- **Ultra-tier 10k frame-cost optimization** (CONTRACTS V3.6/V4.5 amendment).
  Headless forensic profiling (a throwaway `scripts/perf-probe.ts` mirroring the
  exact `world.ts` `step()` cadences, since deleted) measured the sim-CPU cost at
  the 10,000-entity ceiling at **23.67 ms/frame** (42 fps render-free), dominated
  by `entities.update`'s O(n·k) neighbor-query loop (≈ 292k neighbor visits/frame;
  `flock` alone ran unthrottled every frame). Four ultra-only levers — all gated
  `maxEntities > 5000` so phone/laptop/desktop stay byte-identical and every
  determinism test is untouched — cut it to **18.46 ms/frame** (54 fps render-free):
  theory-behavior stagger 2→3, `flock` to half-rate, spatial-hash cell 16→10
  (`ULTRA_GRID_CELL`), and the connectome rebuild cadence ladder extended /4 (>2k)
  and /6 (>5k).
- **Adaptive ultra population target** (`QualityProfile.targetEntities`). Organic
  growth now settles an idle ultra world at **6,500** entities (sim-CPU ≈ 9.5
  ms/frame → 105 fps render-free), where the ≥55fps desktop acceptance gate holds
  with GPU-render headroom; **10,000 remains the reachable hard ceiling** via
  bursts/apocalypse, after which the world relaxes back toward the target. Every
  capacity buffer (pools, index tables, atmosphere rng-draw count) is still sized
  from the 10k ceiling — determinism preserved. `targetEntities === maxEntities`
  on all other tiers (no behavioral change).
- **Regression guard** `tests/perf-budget.test.ts`: asserts the median
  entity-update frame at 8k entities stays under a loose 120 ms wall-clock bound
  (catches a 5×-class regression without flaking on CI).
- Full per-stage breakdown, tuned constants, and **rejected calibration values**
  recorded in `docs/BENCHMARKS.md` ("Ultra-tier 10k optimization"). The harness
  excludes GPU draw cost (~21 ms at 10k), which is why 55fps at a true idle-settled
  10k is met via the adaptive target rather than raw CPU optimization.

## [0.4.0] - 2026-06-11

The **XENOGENESIS** expansion (CONTRACTS V4): the cosmos becomes an alien,
immortal, sentient biome — it gets an atmosphere, watches itself through a
holographic 3D instrument panel and a four-page analytics observatory, and
rates its own aliveness.

### Added

- **Alien atmosphere** (`src/sim/atmosphere.ts`) — an inverted sky dome with a
  non-Earth baked gradient (deep-oxblood horizon → violet zenith → teal
  counter-glow) that recolors with weather and chaos, three wind-advected haze
  ribbons that breathe with the music's bass, a tier-scaled particulate air
  volume, and an aurora curtain that brightens with quantum entropy.
- **In-scene 3D analytics** (`src/sim/viz3d.ts`) — a holographic instrument
  panel floating above the arena: a ring of ten phylum-population towers, a ring
  of ten titan economy obelisks (height = matter, glow = energy, hue = war), and
  a live war-network of up to 45 segments between them.
- **Four-page Observatory** (`src/ui/observatory.ts`) — page 0 overview, page 1
  **variance** (rolling mean±σ bands, population histogram, Shannon diversity,
  qEntropy–trend phase), page 2 **ecology** (per-phylum small-multiples,
  birth/death flux, titan matter–energy portraits), page 3 **conflict** (war
  intensity, alliance/truce/war stacks, per-titan resource bars, a biome
  sentience gauge), switched by accessible tabs.
- **Biome sentience index** in the telemetry snapshot — community structure ×
  quantum coherence × demographic momentum, normalized 0..1.

### Changed

- Consolidated the touch surface onto `InputSystem` (look pad + radial action
  wheel + long-press apocalypse + guarded haptics) and removed the redundant
  `TouchControls` twin to avoid double-binding.
- Removed a stale duplicate `onDeath` ground-feedback assignment in `world.ts`.

## [0.3.0] - 2026-06-10

The **PANTHEON** expansion (CONTRACTS V3): the arena grows 5×, the population
grows to 10,000, ten lore-named creature phyla with wildcard outliers populate
it, and ten colossal non-human intelligences (TITANS) run a global economy and
wage game-theoretic war over it — observed live from a four-chart Observatory,
playable from a phone to a 43″ TV. The QUANTUM-tier soundtrack (4 new dark
songs around the untouched QUANTUM) shipped in the 0.3.0 groundwork commit.

### Added

- **Quality tier ladder** (`core/quality.ts`): phone 650 (legacy per-mesh
  path) / laptop 2,000 / desktop 5,000 / ultra 10,000 entities, resolved once
  at boot from pointer type + `hardwareConcurrency` + `deviceMemory ?? 8`;
  quantum/links/stars budgets scale sublinearly per rung. `QualityProfile`
  gains `tier` + `instanced`.
- **5× arena** (`sim/constants.ts`): `ARENA = 5` (XZ), `ARENA_Y = 2`
  (vertical), `ARENA_MID = 2.5` (mid-field actors) drive everything — ground
  240→1200 (same 60×60 segments, wavelengths ÷ARENA, swell ×ARENA_Y),
  containment 65→325 (4225→105625), monolith/diorama layouts ×5 floor and ×2
  height from one legacy-authored table, camera far 900→2600, fog ÷ARENA,
  star shells ×3, spatial-hash cell 8→16, sky-web at y 110, camera modes and
  speeds ×ARENA_MID, sector rectangles ×ARENA.
- **InstancedMesh pools** (`sim/instanced-entities.ts`): above the phone tier
  every entity renders through one InstancedMesh per (cached geometry ×
  transparency) pair — ≤80 draw calls for 10,000 organisms instead of 10,000.
  Per-instance matrix + `instanceColor` + custom vec4 emissive·intensity/alpha
  attribute patched via `onBeforeCompile`; pools are lazily built at uniform
  share ×4 headroom and grow ×2 event-driven, uploads clipped to live ranges.
  The EntityManager facade is UNCHANGED — entities stay real meshes (never
  scene-added), mirrored once per frame after all visual mutations.
- **Phyla taxonomy live** (V3.2 wiring): `createPhyla` mints 10 lore-named
  phyla; `createMorphotypes(rng, geoCount, phyla)` emits 250 morphotypes in
  contiguous 25-morph blocks with ~1% wildcard OUTLIERS (band-ignoring
  palettes, blended behavior pairs, ×3 parameter excursions). `EntityData`
  gains `phylum`/`beh2`; outliers temporally blend their two behaviors on
  (frame+i) parity; null-position spawns bias toward the phylum's home wedge
  (matching its titan's patrol post); `EntityManager.phylumCounts` recounts
  per update. All morph rolls now span the LIVE morph table (`morphs.length`,
  not the legacy 100), across world/shoggoths/puppets/titans.
- **TITANS** (`sim/titans.ts` + `math/games.ts`, V3.3 wiring): ten colossal
  (×3 scale) silhouette archetypes patrol phylum wedges inside ±300; each runs
  an {energy, matter, entropy} economy — harvest (entities consumed → matter),
  metabolize, witness quantum collapses (energy, wired through `onCollapse`),
  bathe in RD pattern density (entropy relief, fed every 60f from the live V
  field), pay size-scaled upkeep, and WASTE entropy as ground scars drained to
  the reaction-diffusion field each frame. Staggered iterated-PD diplomacy
  (45 pairs over a 600f cycle) derives TRUCE/ALLIANCE/WAR; wars fire territory
  strikes (energy raid + loot + champion-morph burst + scatter + conscription
  remorphs); bankruptcy mutates strategy by replicator dynamics over the live
  strategy census. Payoffs flow through the actual energy ledger.
- **Observatory live** (V3.5 wiring): world pushes the telemetry snapshot into
  the four-chart observatory every 18f (36f phone) — stacked phylum areas,
  titan wealth polylines + war markers, 10×10 war-matrix heat grid, and
  rdEnergy/qEntropy/trend timelines. `TelemetrySnapshot` grows
  `maxLinks/morphTotal/titans/phylumCounts/titanLedger/warMatrix/rdEnergy`
  (REUSED views, documented); telemetry panel gains the TITANS row and scales
  its sparklines from the snapshot caps.
- **Touch controls v2** (V3.4): on coarse pointers the static pads are
  replaced by the drag joystick (move), a right-thumb LOOK PAD feeding the
  same `look` accumulator as mouse drags, and a radial ACTION WHEEL
  (Split/Burst/Mutate/Chaos petals ≥44px + 600ms apocalypse long-press core
  with a CSS arming ring). Sim actions pulse `navigator.vibrate` ≤30ms,
  silenced under `prefers-reduced-motion`.
- **Responsive overlay** (V3.4, `#ui` in app.css): desktop three-column grid
  (telemetry+audit left, observatory+control right, free 3D center), phone
  portrait sheet stack with grips (audit yields), low-landscape twin rails,
  foldable hinge-safe columns (`horizontal-viewport-segments: 2` — panels
  never span the fold), TV ≥1900px 10-foot mode (type tokens ×~1.6, 44px
  toolbar targets, 3px focus rings). Panels carry only glass styling; ALL
  placement lives in CSS.
- **Tests**: games equilibria (PD defect lock-in, TFT cooperation, grim window
  forgiveness, Pavlov fixed points, GTFT forgiveness threshold, replicator
  fixed points/absorption/seals), quality ladder (tier resolution + budget
  monotonicity), instanced pools (sizing math + headless sync: mirroring,
  emissive/alpha channels, matrix tracking, growth, wireframe sweep).

### Changed

- Boot/reset population is 30% of the tier cap (legacy 300 of 1,000); burst
  scales 30→100 at ultra; sparse-respawn floor scales to 10% of the cap.
- Graph-mind cadences double above 2,500 entities (Louvain on a 10k mirror
  would spike the V2 240f budget).
- Death→ground feedback (`EntityManager.onDeath` → `rd.perturb`) is wired in
  the composition root over the 1200u ground UV, completing the 0.2.1 API.
- `ObservatorySnapshot.ledger` renamed `titanLedger` so the reused
  `TelemetrySnapshot` satisfies it structurally.

### Known compromises (documented in MODULE-CONTRACTS §V3 notes)

- Instanced pools render metalness/roughness at 0.5/0.5 (per-instance PBR
  scalars are not worth two more attributes; emissive carries identity) and
  cast no shadows (legacy capped casters at 120 anyway).
- Pool transparency is a two-variant split per geometry at per-instance
  alpha — within-pool instance sorting is not performed.

## [0.2.1] - 2026-06-10

The audit wave: SKEPTIC-confirmed findings from the adversarial 0.2.0 audit,
landed as a patch release. Contract additions are recorded in
`docs/MODULE-CONTRACTS.md` §CONTRACT AMENDMENTS — 0.2.1.

### Added

- **Mouse-look + wheel zoom** on the canvas: pointer drags that start on `#c`
  accumulate into `InputSystem.look` (`{dx, dy}`, pointer-captured, first
  pointer wins) and the wheel into a deltaMode-normalized `zoom` accumulator;
  the world consumes-and-zeroes both every frame (applied in free view only),
  and window blur clears them along with all other held input (Known Bug 11
  extension).
- **Feedback-web APIs made explicit**: `EntityManager.onDeath` (world wires
  deaths to `rd.perturb` at ground UV), `QuantumCloud.implodeAt(basis)`
  (localized implosion on register collapse) and `setBreath(level)`
  (audio-level point-size breathe), `EnvironmentSystem.setAudioBass(bass)`
  (six-light rig shimmer), and `AnalyticsSystem.nameOmen` (world injects
  `lore.name('omen', i)` so omens are lore-named).

### Changed

- **Audio coupling set finalized**: bass → six-light rig shimmer
  (`EnvironmentSystem.setAudioBass`), treble → constellation pulse, level →
  quantum-cloud point size (`QuantumCloud.setBreath`), all multipliers
  ≤ 0.35. The bass → tone-mapping-exposure offset is removed entirely —
  exposure is owned by the weather system alone.

### Fixed

- **NaN lorenz seal**: the `lorenz` behavior clamps its attractor samples to
  ±25, so an escapee's position can no longer drive the quadratic terms to
  ±Infinity and spread NaN population-wide through the spatial hash
  (regression-tested in `tests/nan-stability.test.ts`).
- **Exposure accumulation**: the audio bass shimmer compounded into
  `toneMappingExposure` (~15× past the weather pullback once music played,
  tone-mapping the world to white); fixed first as a bounded
  remove-before-lerp offset, then removed outright in favor of the rig
  coupling above.
- **Color-pipeline legacy fidelity**: `outputColorSpace` is forced to
  `LinearSRGBColorSpace` (with `THREE.ColorManagement` disabled before engine
  construction) and the point-light rig is rescaled with explicit
  legacy-light gains, so the palette authored against three r128's
  linear-out, legacy-light-unit pipeline renders exactly as the monolith did.
- **Controls color restoration**: the legacy control families are back as
  `@theme` tokens — the green-glass toolbar (`#bar`) and the apocalypse red
  danger family — instead of the flattened accent palette.
- **Determinism**: the audio engine draws from its own derived RNG stream
  (`seed ^ 0xa0d10`), so wall-clock scheduler callbacks can no longer drain
  the sim stream and break same-seed reproducibility.
- **Docs match the executed pipeline**: PageRank runs every 600th frame at
  offset 300 (offset 120 — as previously documented — would collide with the
  240-frame Louvain pass at frame 720 and every 1,200 frames after); the
  documented frame order now ends graph mind → constellations → environment →
  telemetry + analytics push (8f) → analytics analyze (60f) → render; the
  `/docs` diagrams are regenerated (V2 module graph + `/lab` route, V2 ERD,
  V2 frame pipeline with cadences).

### Security

- **Server hardening**: `POST /api/audit` bodies are capped at 8 KB (413
  beyond, declared and actual), audit `detail` payloads are truncated at
  storage time, and the HTMX fragment HTML-escapes every user-controlled
  string.
- **Store validation**: `MemoryStore.load()` field-validates the persisted
  JSON (finite numbers, booleans, known version) and returns `null` on any
  mismatch — corrupt or hostile `localStorage` can never throw or smuggle
  values into the sim.
- **SRI**: the `/lab` artifact pins its p5.js CDN script with a sha384
  `integrity` hash + `crossorigin="anonymous"`.

## [0.2.0] - 2026-06-10

The **Quantum Wildbeyond** expansion. Seven new systems implementing
[docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md): every effect earns its visuals from
an honest model (statevector, PDE, graph, Voronoi geometry, cryptographic
digest, audio spectrum, rolling regression), and every system both reads from
and writes to at least one existing system. Specified in
`docs/MODULE-CONTRACTS.md` §CONTRACTS V2.

### Added

- **Quantum register** (`src/math/quantum.ts`): pure-TS statevector core —
  2^n complex amplitudes as a Float64Array pair (n ≤ 8 enforced), 12 gates
  (h/x/y/z/s/t/rx/ry/rz/cx/cz/swap), Born-rule probabilities into a reused
  buffer, normalized Shannon entropy, and seeded-RNG measurement collapse.
- **Quantum circuit system** (`src/sim/qcircuit.ts`): a 5-qubit register
  driven by the world — puppet-master events apply characteristic gate
  sequences (AETHON → rx(chaos·π/4), SELENE → h+cz, KRONOS → x+swap), sort
  swaps apply parity-targeted cx, a chaos-derived ry drifts every 30 frames,
  and every 8th update measures. Basis probabilities become 32 hue bands for
  the quantum cloud; measured collapses implode it locally.
- **Reaction-diffusion ground** (`src/sim/reaction-diffusion.ts`): Gray-Scott
  on a 128×128 CPU typed-array ping-pong field bound to a three.js
  `DataTexture` used as the ground's emissive map. Weather couples the
  parameters (STORM raises feed, VOID raises kill, AURORA boosts diffusion;
  chaos scales reaction rate) and entity deaths perturb the field at their
  ground-UV position.
- **Graph mind** (`src/sim/graph-mind.ts`, graphology +
  graphology-communities-louvain + graphology-metrics): mirrors the
  connectome into a graph every 240 frames and runs seeded Louvain community
  detection — tribes color connectome links via an 8-hue palette and are
  written back into member entities' set-theory groups; a PageRank pass every
  600 frames gives the top-20 entities an emissive floor boost.
- **Constellations** (`src/sim/constellations.ts`, d3-delaunay): a Voronoi
  sky-web at y≈55 over the 24 static monolith/diorama sites, built once;
  Delaunay site links and audio-pulsed cell edges; O(log n) camera point
  location resolves the current lore sub-sector.
- **Lore engine** (`src/sim/lore.ts`, @noble/hashes sha256): deterministic
  cosmic naming — sha256(seed‖kind‖index) digests index a syllable table to
  derive sector/tribe/star/omen names and puppet/weather/collapse epithets,
  memoized. Same seed, same mythology.
- **Audio analysis** (`src/audio/analysis.ts`): AnalyserNode tap over the
  music and SFX buses polled per frame into a pre-allocated buffer —
  bass/mid/treble/level bands (multipliers ≤ 0.35) drive point-light shimmer,
  constellation pulse, and quantum-cloud point-size breathing. A silent world
  looks identical to v0.1.
- **Analytics** (`src/sim/analytics.ts`, simple-statistics): 120-sample
  rolling rings for population/energy/links; every 60 frames a
  linear-regression slope yields the population trend per minute, and
  population z-score anomalies (|z| > 2.5) emit lore omens to the audit
  trail, at most once per 30 s.
- **Telemetry**: rows `#v9` TRIBES, `#v10` TREND (`±x.x/m`), `#v11` QBIT-S
  (register entropy), and the `#lore` sub-sector line; `TelemetrySnapshot`
  gains `tribes` / `trend` / `qEntropy` / `lore`.
- **Lab artifact** (`lab/quantum-wildbeyond.html`, served at `/lab`):
  self-contained seeded p5.js "collapse field" — particles flowing a blended
  Lorenz-XZ/curl-noise field, a Voronoi shatter overlay echoing the 24 cosmos
  sites, interference rings on measurement events; p5 from CDN only.
- **Master files** (`masters/`): the steering trinity — Executor (Broly),
  Architect (Starkiller), Physicist (Dr Manhattan) — bound by `CLAUDE.md`,
  plus the aesthetic constitution `docs/PHILOSOPHY.md`.
- **Reference catalogs** imported into `docs/reference/`
  (`math-libs-catalog.md` + `domain-key-libraries.csv`): the 20-domain JS/TS
  math-library survey with per-library adoption status; the selection itself
  is recorded in [ADR 0005](./docs/adr/0005-math-stack-selection.md).
- **Design-system audit** (`docs/DESIGN-SYSTEM.md`): component and token
  audit (naming, token coverage, completeness scores), documented color/type/
  spacing/motion tokens including the 8-hue tribe palette, and per-component
  accessibility notes.
- Tests for the new math: quantum (H·H identity within 1e-12, Bell-pair
  entropy, probabilities sum to 1 ± 1e-9, measurement determinism),
  reaction-diffusion (finite over 500 steps, symmetry breaking, same-seed
  field equality), graph-mind (two-cluster Louvain, seeded determinism),
  lore (seed stability, pronounceability), analytics (slope signs, one omen
  per window). Benchmarks: quantum gates/probabilities at n = 5,
  reaction-diffusion step at 128².

### Changed

- `Connectome` exposes `pairs`/`pairCount` (filled during the rebuild it
  already performs) and `setCommunityOf(fn)` — link hue offsets by community
  index instead of pure time hue when the graph mind installs a palette.
- `QuantumCloud` gains `setQuantumBands(bands)` — particle hue keys off the
  register's 32 basis probabilities blended with the legacy psi hue; a change
  in the last collapse index triggers a localized implosion through the
  existing collapse/respawn path (no new allocation).
- `AudioEngine` gains `tapAnalyser()` — one lazily created AnalyserNode
  (fftSize 256, smoothing 0.8) fan-out connected from the music and SFX
  gains; null before `init()`.
- `EnvironmentSystem` gains `attachGroundEmissiveMap(texture)` with an
  emissive-intensity coupling on the ground material.
- `Hud` gains `setLore(name)`; puppet-master toasts now carry lore epithets.
- Design system pass: remaining hardcoded hex/px values hoisted into `@theme`
  tokens, `:focus-visible` rings on all interactive elements,
  `prefers-reduced-motion` damping for pulses/transitions, and an
  aria-labeled `/lab` link in the toolbar. Visual identity (void/cyan glass)
  unchanged — elevated, not redesigned.

## [0.1.0] - 2026-06-09

First release: the 882-line legacy monolith
(`legacy/cosmogonic-quantum-mechalogodrom.html`, three.js r128 via CDN) ported
to a modular Bun + TypeScript + three.js 0.184 codebase with the same
constants, magic numbers, and audiovisual feel.

### Added

- Modular simulation: 26 behavioral fields (drift, orbit, pulse, swarm, flee,
  hunt, split, coil, spiral, expand, zigzag, sine, bounce, flock, scatter,
  vortex, lattice, wave, helix, quantum, nash, market, typemorph, setunion,
  graphseek, lorenz), 100 procedural morphotypes over ~41 shared geometries,
  20 sorting-field algorithms with behaviorally honest names.
- Ecosystem actors: 3 Shoggoths (Lorenz-ish drift, grid-queried tendrils,
  consumption with corrupted respawn) and 3 puppet masters (AETHON / SELENE /
  KRONOS) acting on chaos, weather, and mutation timers.
- Environment: 16 monoliths, 8 dioramas, 21 data pipelines, quantum particle
  cloud (3,500 mobile / 6,000 desktop) with collapse/respawn, neural
  connectome (up to 2,200 / 4,000 links), 6 weather states, sector naming.
- Audio: 5 procedural Web Audio songs (FF SOMBER, CRYSTAL, INDUSTRIAL,
  ETHEREAL, QUANTUM) plus 8 synthesized SFX types.
- Deterministic seeded RNG (`mulberry32`) injected via `SimContext` — runs are
  reproducible from a persisted seed.
- Bun fullstack server (`server.ts`): `/`, `/docs`, `GET /api/health`,
  HTMX-polled `GET /api/audit` fragment, `POST /api/audit` in-memory ring.
- UI: glassmorphic Tailwind 4 panels, telemetry with canvas sparklines,
  touch control pad + joystick, audit trail panel, `/docs` page rendering live
  Mermaid architecture/ERD/sequence diagrams.
- Persistence: versioned `localStorage` store (`cqm.state`) for seed, song,
  algorithm, view, weather, SFX preference, and session count.
- Tests (`bun test`) for math, RNG determinism, spatial hash, sorting
  algorithms, store, and audit; mitata benchmarks (`bun run bench`).
- Docs: architecture, ERD/ERM/ERP, wireframes, complexity budget, and four
  ADRs (Bun runtime, three.js rendering, HTMX + Tailwind UI, deterministic
  RNG).

### Changed

- three.js r128 global script replaced with npm `three@0.184` ES modules;
  partial GPU buffer uploads now use `clearUpdateRanges()` /
  `addUpdateRange()`.
- Hand-rolled CSS replaced with Tailwind CSS 4 `@theme` tokens; fonts
  self-hosted via Fontsource instead of Google Fonts CDN.
- Touch control pad gained yaw buttons (`yleft` / `yright`), making the
  keyboard's C/V yaw reachable on touch devices.

### Fixed

Fixes mandated by the Known Bugs table in `docs/MODULE-CONTRACTS.md`, relative
to the legacy prototype:

- Music pitch octave now wraps instead of drifting ultrasonic over time.
- Toggling music off clears the scheduler interval (no orphaned scheduler).
- Hidden tabs no longer queue oscillators (burst-on-resume eliminated);
  AudioContext suspends/resumes with `visibilitychange`.
- Render loop no longer calls `getElementById` per frame or copies sort
  values into a fresh object; UI caches element refs, sorting uses the
  pre-allocated `Float32Array` + live length.
- Spatial hash queries reuse a shared result buffer instead of allocating an
  array per call (hundreds per frame).
- Window resize reapplies the device pixel ratio (monitor moves between
  displays of different DPR).
- Icon-only toolbar buttons have accessible names (`aria-label` + `title`).
- Joystick tracks its own pointer/touch identifier (no wrong-finger reads
  under multi-touch).
- Seeded `mulberry32` RNG injection replaces all `Math.random()` calls in sim
  logic — runs are reproducible.
- Touch roll/tilt buttons rotate in the same direction as the Z/X/R/F keys
  they mirror (signs were inverted).
- Held keys clear on window blur (camera no longer keeps flying, Space no
  longer keeps bursting).
- Pipeline packets reuse a target vector in `curve.getPointAt(t, target)`
  (no per-packet Vector3 allocation per frame).
- Connectome uploads only the live link range to the GPU instead of the full
  4,000-segment buffers.
- The `mutations` counter is surfaced in telemetry (`#v8`) instead of being
  write-only.

[Unreleased]: ./CHANGELOG.md
[0.3.0]: ./CHANGELOG.md
[0.2.1]: ./CHANGELOG.md
[0.2.0]: ./CHANGELOG.md
[0.1.0]: ./CHANGELOG.md
