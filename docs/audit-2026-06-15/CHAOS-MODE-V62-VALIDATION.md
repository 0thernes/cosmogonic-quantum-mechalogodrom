# CHAOS MODE (V62) — Independent Validation Report

**Date:** 2026-06-15 · **Reviewer role:** Validation (separation of duties — the
generator did not grade its own homework) · **Subject:** `bdb9ddd feat(sim):
CHAOS MODE — a Lorenz quantum storm on the creatures (V62)` · **Verdict:**
✅ **PASS** (sound; no blocking defect found).

This run of the repo-wide loop discovered that directive **#6 CHAOS MODE**
— previously tracked as _NOT STARTED_ — had already been implemented and
committed by a parallel editor during the session. Rather than re-implement
(destructive duplication), this run performed an adversarial **validation** of
the landed feature against the project's binding laws. Findings below are
evidence-backed; one minor cosmetic observation is recorded, no fix warranted.

## Scope reviewed

| File                          | Role                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/sim/chaos-field.ts`      | The `ChaosField` engine (240 lines) — audit target                                                                         |
| `src/world.ts` (committed)    | Construction (:471), per-tick step (:668), kick drain (:669/:673), hotkey `k` (:1395/:2128), telemetry `chaosMode` (:1515) |
| `src/sim/entities.ts:418-424` | Existing soft containment — relevant to tunnelling                                                                         |
| `tests/chaos-field.test.ts`   | Landed unit suite                                                                                                          |

## Checks & evidence

### 1. Determinism — PASS

- **Own rng sub-stream.** `mulberry32((seed ^ 0x3c6ef372) >>> 0 || 1)`
  (`chaos-field.ts:72`) — independent of `rng`/`econRng`/`superRng`, matching the
  `econRng` precedent. The world's main draw order is never touched.
- **Zero draws while OFF.** `update()` early-returns at `:131`
  (`if (!this._active) return;`) before any `rng()` call, so chaos mode is a true
  no-op when disengaged. The same-seed golden (`tests/determinism.test.ts`) and
  the feature-determinism suite construct `EntityManager` directly with **no**
  `ChaosField`, so they are structurally immune and remain byte-identical.
- **Fixed per-frame draw order when ON** (Lorenz → quantum stride → kick timer),
  reproducible from seed + the audit-recorded toggle sequence.

### 2. NaN / numerical stability — PASS (prior "Lorenz NaN" lesson applied)

- Integrator step is bounded: `h = Math.min(dt, 0.05) / 4` ⇒ ≤ 0.0125 s per
  sub-step (`:134`). Explicit Euler on the canonical dissipative regime
  (σ=10, ρ=28, β=8/3) is comfortably within its stability bound at this step; the
  attractor is globally attracting and bounded, so the trajectory cannot diverge
  to Inf/NaN. Intensity is `clamp(.../44, 0, 1)` (`:143`). This directly addresses
  the historical Lorenz-NaN defect noted in project history.

### 3. World-disturbance coupling (philosophy: read **and** write) — PASS

- Writes `state.chaos` into the storm band `[5,10]`, never lowering an
  already-higher value (`:148-149`) → the economy (`market stress`,
  `world.ts:794`) and entity jitter react through existing couplings.
- Arms one-shot `weatherKick`/`algoKick` intents drained by the integrator
  (`world.ts:669/:673`) → flips the sky and advances the sorting field.
- Reads the live entity list and writes velocities/positions/colours
  (tunnelling/superposition/entanglement). One-way, no cross-system ownership
  violation.

### 4. Containment after tunnelling — PASS (minor cosmetic note)

- Tunnelling adds an isotropic position jump of `r ∈ [8,32]` u (`:182-191`),
  applied **before** `entities.update` runs that same frame.
- Regular entities are recontained by a **soft** inward velocity nudge
  (`entities.ts:419-422`, `−0.005·r̂` per frame past `containR2`), which
  accumulates and pulls a strayed body back over ~1 s. **Self-correcting** — no
  permanent escape. NHI entities additionally received a hard dome clamp in the
  parallel editor's in-flight `steerNhiBeings` rework.
- **Observation (LOW, cosmetic, no action):** a rim-adjacent organism that
  tunnels outward may visibly pop just past the dome before drifting back. Not a
  correctness defect; flagged only for completeness. A future hardening option
  (not required) would be to clamp the jump target to `containR2`.

### 5. Allocation discipline — PASS

- Per-frame `applyQuantum`/`applyEntanglement` loops allocate nothing. Pair
  tuples are (re)allocated only on the 3–7 s `pairTimer` cadence (`:199-202`,
  `:229-238`), within the "allocation-light" ethic. Stride-3 over the population
  bounds per-frame cost at the 50 k ceiling.

### 6. Tests — PASS

```
$ bun test tests/chaos-field.test.ts
 5 pass · 0 fail · 15 expect() calls  [71 ms]
```

## Doc-debt observed (not fixed this run — tree held by parallel editor)

- `docs/KANBAN.md` has **no V62 `CHAOS-MODE` Done card** (board stale).
- `docs/MODULE-CONTRACTS.md` has **no V62 / F-CHAOS-MODE clause** (the engine is
  shipped without a binding contract entry).
- Auto-memory `directive-hud-cosmos-2026-06` reconciled this run (#6 → shipped).

These were intentionally **not** edited here: `src/world.ts` and
`src/sim/singularities.ts` are dirty with the parallel editor's uncommitted
V63 coupling work (NHI hard-clamp + singularity→chaos stir), so this run avoided
any change that could entangle or clobber that commit.

## Recommended next actions

1. Parallel editor: land the in-flight `world.ts` + `singularities.ts` coupling
   behind the full gate (`bun run check`).
2. After the tree settles: add the V62 `CHAOS-MODE` Done card to `KANBAN.md` and
   an `F-CHAOS-MODE` clause to `MODULE-CONTRACTS.md`.
3. Optional hardening (P3, not a defect): clamp the tunnelling target inside
   `containR2` to remove the cosmetic rim-pop.
