# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
[0.1.0]: ./CHANGELOG.md
