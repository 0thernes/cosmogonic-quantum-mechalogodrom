# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
[0.2.0]: ./CHANGELOG.md
[0.1.0]: ./CHANGELOG.md
