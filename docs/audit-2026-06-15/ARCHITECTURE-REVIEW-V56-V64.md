# Architecture Review & Report — the HUD + Cosmos directive (V56–V64)

_Date: 2026-06-15 · Scope: the work shipped against the "CENTER HUD + cosmos" `/goal` directive._

This report closes out item #8 of the directive ("update Docs/Specs/Lab + full architecture review +
report; fix bugs as found"). The authoritative living record of every change is
[`CHANGELOG.md`](../../CHANGELOG.md) (`Unreleased`); this document is the narrative review on top of it.

## 1. What the directive asked for, and where each piece landed

| #   | Ask                                                                                        | Shipped | Home                                                       |
| --- | ------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------- |
| 1   | CENTER HUD — six inspector panels → one centered, same-size, cyclable, see-through pop-up  | V56     | `src/ui/center-hud.ts`                                     |
| 2   | VIEW/SPEED/RENDER box: Music + SFX on/off + reset count                                    | V57     | `index.html`, `src/ui/panels.ts`, `src/world.ts`           |
| 3   | Telemetry: Sim N(1)/N(2) + which Singularity is summoned                                   | V57     | same                                                       |
| —   | NHIs omnidirectional + contained (no float-to-sky)                                         | V58     | `src/world.ts` (`steerNhiBeings`)                          |
| 5   | Singularities warp **time** (dilation) + **light** (red/blueshift) + better rigs           | V59     | `src/sim/singularities.ts`                                 |
| 5   | Singularities warp the **view** (gravitational lensing)                                    | V60     | `src/core/postfx.ts`, `engine.ts`, `world.ts`              |
| 4   | NEURAL viz alive/interactive (was a static image)                                          | V61     | `src/ui/nhi-observatory.ts`                                |
| 6   | CHAOS MODE — real chaos math + quantum tunnelling/entanglement/superposition on creatures  | V62     | `src/sim/chaos-field.ts`                                   |
| 7   | Super-creature leveling 1→100, godlike powers, SS3/Neo ascension + Stage-2 monolith temple | V63     | `src/sim/super-evolution.ts`, `src/sim/monolith-temple.ts` |
| —   | Adversarial review + fix bugs found                                                        | V64     | `src/sim/chaos-field.ts`, `src/core/postfx.ts`             |

All nine landed, each behind the full gate (`bun run check`: prettier → tsc strict → oxlint → 810 tests →
build) and verified live in the preview before commit.

## 2. New modules — shape & ownership

- **`src/ui/center-hud.ts`** — a thin controller, not a rewrite. It drives each of the six panels'
  EXISTING dock toggle (so their open/close + repaint logic is untouched), re-homes them to one
  centered `!important` slot, and enforces single-open with a ‹ › tab strip, a ◐ transparency toggle,
  and ✕/Escape. Zero sim coupling, zero rng. Fixes the "NEURAL overlaps the bars" class of bug by
  construction — nothing opens at the edges anymore.
- **`src/sim/chaos-field.ts`** — a toggled `ChaosField` on its OWN seeded sub-stream (golden-ratio mix
  off the world seed, like `econRng`). A real **Lorenz attractor** (σ=10, ρ=28, β=8/3) supplies a
  chaotic 0..1 intensity; while engaged it tunnels / entangles / superposes a strided slice of the
  population, elevates `state.chaos` into a 5–10 storm band (re-using the existing chaos couplings to
  the economy + entity jitter), and arms timed weather/algorithm "kick" intents the integrator drains.
  **`update()` returns before drawing a single rng number while off**, so the base sim is byte-identical
  when disengaged — the load-bearing determinism invariant, pinned by `tests/chaos-field.test.ts`.
- **`src/sim/monolith-temple.ts`** — the LV100 ascension end-state made physical: a self-building
  megalithic trilithon (plinth + two tapered pillars + lintel) framing a shimmering colour-cycling
  **portal** (the Game-Stage-2 gateway). Hidden until `reveal()`, animated from `t`/`dt` only (no rng),
  with full geometry/material disposal. Visual-only ⇒ determinism-neutral, so the impure evolution
  META-layer can raise it without touching the population golden.

## 3. Determinism posture (the project's first law)

The directive added several systems that mutate the world; each was built to preserve "same seed +
same user-action sequence ⇒ same evolution":

- **Off ⇒ silent.** `ChaosField.update` and `SingularitySystem.update` both early-return with **zero
  rng draws** when inactive. New systems that own randomness (`ChaosField`) run on a dedicated
  golden-ratio sub-stream, so even when active they never perturb the main entity draw order.
- **Visual-only effects draw nothing.** The gravitational lens (`postfx.ts`), the singularity time
  dilation / redshift, the NEURAL rAF animation, and the monolith temple are all pure float / shader /
  `t`-`dt` math — no rng, no sim mutation (the lens is a pixel-exact passthrough at strength 0).
- **The evolution META-layer stays outside the golden.** `SuperEvolution` is explicitly impure
  (wall-clock catch-up) and isolated on `evoRng`; the V63 additions (cap, milestones, ascension,
  temple) are all downstream of it and visual, so the population sim remains reproducible.

## 4. Review findings (V64) — and the verdict on the rest

An adversarial pass over all V59–V63 code found **two** real (non-crashing) defects, both fixed in V64:

1. **MED — entanglement rebinding** (`chaos-field.ts`): pairs stored raw list indices; a death
   left-shifts higher indices, so a pair silently re-pointed at a different organism between re-picks.
   → now stored by **object reference** (a dead partner goes inert; the pair dissolves cleanly).
2. **MED — bloom render-target leak** (`postfx.ts`): `EffectComposer.dispose()` frees only its own
   targets, not the passes, so the cinematic (`?fx=1`) `UnrealBloom` pass leaked on every dispose /
   hot-reload. → `PostFx.dispose()` now disposes **every pass** first.

The remaining files — `singularities.ts`, `super-evolution.ts`, `monolith-temple.ts`,
`nhi-observatory.ts`, and the `world.ts` wiring — were reviewed and found **clean**: disposal is
complete (the V59 photon-ring/halo extras and all temple geometries are tracked + freed), the
backward-iteration + `disposeAt` interaction in `applyHole` is correct, the level cap is airtight, the
lens handles the point-behind-camera case, and the NEURAL rAF loop is lifecycle-safe (self-cancels on
close / hot-replace). Two LOW cosmetic items (a self-correcting `cycle()` upper bound; a chromatic
dispersion anisotropy) were judged not worth changing.

## 5. Performance notes

- `ChaosField.applyQuantum` strides the population by 3 (≈17k of 50k per frame) and is
  allocation-free; entanglement is capped at 40 pairs. Cost is zero when off.
- Singularity rigs add a photon ring + halo (a few meshes) only while a hole is summoned (≤9 s).
- The NEURAL panel's 60 fps rAF loop runs **only while the panel is open**, decoupled from the sim
  cadence, and paints nine small canvases — negligible.
- The monolith temple is 11 static meshes, revealed once at LV100.

## 6. Recommendations / future work (not blocking)

- **Stage 2 build-out.** The ascension fires a `cqm:ascension` event and the portal exists as a
  placeholder; the "Eshkol Tsotchke" second world behind it is the natural next stage.
- **Per-level morph audio.** V63 plays a voice on each 10-level milestone; richer per-stage
  sound/light design could deepen the Goku-ascension feel.
- **Camera shake on chaos intensity.** `ChaosField.shake` is exposed but not yet consumed by the
  camera; wiring it would make the "shakes the world" reading more visceral (kept out of V62 to avoid
  touching the camera path under time pressure).

---

_Generated as part of the directive close-out. See `CHANGELOG.md` for the per-version detail and the
exact "verified live" evidence behind each feature._
