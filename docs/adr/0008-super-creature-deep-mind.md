<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# 0008 — The Super Creature: a 1444-parameter deep mind as a stack of two TinyMLPs

- Status: Accepted (V31, 2026-06-14)
- Deciders: the EXECUTOR, with the ARCHITECT (contracts/ownership) and the PHYSICIST (determinism)
- Supersedes / relates to: [0004 deterministic RNG](./0004-deterministic-rng.md),
  [0006 ASI graphics + language stack](./0006-asi-graphics-and-language-stack.md)

## Context

The directive calls for **one always-active SUPER CREATURE** — half a Titan, ~100× its power — with a
**1000–1500-parameter neural mind** spanning vision, memory, planning, deception, learning,
self-preservation, manipulation, strategy, world-modeling, an emotion-like state, dominance, and
twin/offspring creation up to 3. This is an order of magnitude past the NHI's existing intuition
**gene** (a single-hidden-layer `TinyMLP`, a few dozen weights) and the normal creatures' 50–150-param
controllers. It must be deterministic (contract rule 7 / ADR-0004), allocation-free in the hot loop,
testable, and it must not perturb the same-seed golden the rest of the world is pinned against.

## Decision

1. **Reuse, don't reinvent.** Build the deep mind by **stacking two `TinyMLP`s** (the existing,
   already-tested perceptron from `sim/ai/brains.ts`): a **CORTEX** `18→32→16` that compresses 18
   percepts into a 16-dim world-model latent, then an **ACTOR** `16→12→8` that maps that latent to 8
   motor/social drives. That is a true 4-layer net of **1444 parameters** — squarely inside the
   1000–1500 band — with zero new matrix-math code to verify.
2. **Faculties are real variables, not labels.** Emotion = three EMAs (valence/arousal/dominance) of
   live signals; memory = a `MemoryRing` of salience; the prediction loop = the cortex forecasting
   next-beat salience, the error surfaced as SURPRISE feeding arousal; planning = an argmax over seven
   GOAP-style drive scores; replication = weight-mutated twins, capped at 3, one generation deeper.
3. **Determinism via an isolated sub-stream.** The mind's weights + twin mutation draw from a dedicated
   `superRng` seeded off the world seed (golden-ratio mix, like `econRng`/audio). `think()` itself
   draws **no** rng and allocates nothing in steady state. So the main `this.rng` order — and the
   pinned population golden — stay **byte-identical**, exactly as the null-default attach pattern
   guarantees for the economy couplings.
4. **It appears in telemetry** through a self-mounting **⬢ ARCHITECT** panel (the proven
   `market-ticker` shell pattern) and an **apex purse** (economy weight 20) registered on the SUPER
   sub-stream so `econRng`'s order is untouched too.

## Consequences

- **Good:** the mind is substantial yet rests entirely on tested primitives; deterministic + 5 unit
  tests; no hot-loop allocation; the world golden is provably unchanged; telemetry is decoupled UI.
- **Cost:** stacked MLPs are a fixed feed-forward topology (no recurrence/attention) — "memory" lives
  in the explicit `MemoryRing` + emotion EMAs, not in network state. Acceptable for an apex controller;
  revisit if true sequence modeling is needed.
- **Verified live:** in the running world — `ARCHITECT-Ω`, plan DOMINATE, dominance 0.998, wallet 2.1k,
  panel populated, no console errors; full gate green (1477 tests).

## Follow-ups (tracked in KANBAN)

`SUPER-CREATURE-BODY` (the masterful morphing many-eyed 4K body + shader — the graphics emphasis);
`SUPER-CREATURE-SENSES` (percept from real world queries + acting back on the world); then
`ACCESS-PUZZLE` and `SUPERHERO-MODE` (the 2nd super creature + player-as-creature).
