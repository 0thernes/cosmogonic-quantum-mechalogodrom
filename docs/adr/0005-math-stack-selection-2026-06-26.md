<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0005 — Math-stack selection for the Quantum Wildbeyond expansion

## Status

Accepted (2026-06-10). Dependency installs pending capacity window; contracts in
MODULE-CONTRACTS-2026-06-26.md §V2 are written against this decision.

## Context

The expansion mandate supplies a 20-domain catalog of JS/TS math libraries
(`math_libs.md` / key-libraries CSV) and asks for quantum, reaction-diffusion,
graph-theoretic, geometric, audio-spectral, statistical, and lore systems. A
deep-research pass over integration specifics was run; its **adversarial
verification stage was killed by a session capacity limit, so its claims are
recorded as plausible-but-unverified leads, not facts** (per Master File III:
insufficient measurements mean UNKNOWN, not false). Decisions below therefore
prefer options that are robust under uncertainty and isolate every dependency
behind an owned facade (Master File II, law 4).

## Decisions

| Domain             | Choice                                                               | Rationale                                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantum register   | **Pure TS statevector** (`src/math/quantum.ts`, n ≤ 8)               | Research leads indicate `quantum-circuit` is ~14.5 MB unpacked CJS with antlr4 + mathjs runtime deps and no ESM/types — absurd cost for 32 amplitudes. 200 owned lines are faster, typed, testable, allocation-free.                                                                  |
| Reaction-diffusion | **CPU Gray-Scott** on Float32Array ping-pong → three `DataTexture`   | gpu-io's three.js context sharing (initWithThreeRenderer / attachToThreeTexture / state resets) is real but unverified and adds GL state-management risk; 128² CPU is <0.5 ms every 2nd frame — comfortably in budget. gpu-io remains the documented upgrade path if grid size grows. |
| Graph analysis     | **graphology + graphology-communities-louvain + graphology-metrics** | Maintained, TS-native, exactly fits community/pagerank needs; runs on slow cadence (240/600 frames) so per-pass cost is off the hot path.                                                                                                                                             |
| Voronoi            | **d3-delaunay** (+ @types if needed)                                 | Canonical, tiny, built once over 24 static sites.                                                                                                                                                                                                                                     |
| Lore hashing       | **@noble/hashes** (sha2/sha256)                                      | Audited, zero-dep, sync, tree-shakable.                                                                                                                                                                                                                                               |
| Streaming stats    | **simple-statistics**                                                | Zero-dep functional API for regression/stddev on small rings.                                                                                                                                                                                                                         |
| Audio spectra      | **Native Web Audio AnalyserNode**                                    | On the user's own catalog (§9); zero bytes, allocation-free polling into a pre-allocated Uint8Array. Meyda rejected as overweight for 4 bands.                                                                                                                                        |
| ODE integration    | **Owned RK4** (if/when attractor ribbons land)                       | Fixed-step RK4 is allocation-free and sufficient for visualization; `ode45-cash-karp` allocates per call in a hot path.                                                                                                                                                               |

## Consequences

- Bundle growth is bounded to small, typed, maintained deps; the two heavy
  candidates (quantum-circuit, gpu-io) are excluded with documented re-entry
  paths.
- Every dep gets: facade module, NOTICE.md license entry, contract section.
- If the deep-research claims are later re-verified and contradict any lead
  relied on here, this ADR must be amended before the affected system changes.
