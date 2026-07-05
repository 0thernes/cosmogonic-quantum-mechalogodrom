<!-- reviewed: 2026-07-02 | mega-audit PM-artifact gap-fill | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Performance Targets (SLOs)

**Living document. The frame budget as an explicit contract.** Measured numbers live in
[BENCHMARKS-2026-06-26.md](./BENCHMARKS-2026-06-26.md); this sheet turns them into **targets** with
regression thresholds, so a slowdown is a tracked defect, not a vibe. Physicist's law
([GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN](../masters/GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN.xml)):
a frame budget you do not measure is a frame budget you do not have.

## 1 · Frame budget

Target **60 fps ⇒ 16.67 ms/frame** at the desktop entity tier; **30 fps floor** on mobile/integrated GPUs
(the `RenderGovernor` sheds FX before it drops physics — see the singularity lens-shed note in AUDIT-LOG).
`dt` is clamped to ≤ 0.05 s so a stall never explodes the integrator.

| Budget line           | Target                        | Regression alert   |
| --------------------- | ----------------------------- | ------------------ |
| Total frame @ desktop | ≤ 16.67 ms (60 fps)           | > 20 ms sustained  |
| Mobile floor          | ≥ 30 fps (FX-shed allowed)    | < 30 fps           |
| GPU frame (render)    | ≤ ~8 ms at 1080p desktop tier | TDR / context loss |

## 2 · Cognition budget (measured 2026-07-02, Bun 1.3.x, Intel Core Ultra 9 275HX)

The apex mind is the largest single per-frame CPU cost. It is **millisecond-scale, not sub-millisecond** —
the old "sub-millisecond / <2% frame / 289 µs" claims were retired as false.

| Operation                                | Measured (full bench) | Target       | Note                                     |
| ---------------------------------------- | --------------------- | ------------ | ---------------------------------------- |
| `SuperMind.think()` (one apex beat)      | **1.99 ms**           | ≤ 2.5 ms     | every sim frame for the primary apex     |
| `SuperMind.snapshot()` (UI telemetry)    | **1.35 ms**           | ≤ 2.0 ms     | only when the BRAIN board is open        |
| `5× think()` (GOAL5 pantheon, amortized) | **9.77 ms**           | ≤ 12 ms      | `driveSuper` every-4-frames cadence      |
| `rngContrast(seed,64)`                   | 3.10 ms               | offline only | quantum-vs-classical experiment, not hot |
| `petri step()` (PDE + texture)           | 84.09 µs              | ≤ 150 µs     | reaction-diffusion substrate             |

This is why the world runs **5 individuated apex minds on a staggered cadence + 20 cheaper light-echoes**,
not 25 full minds every frame.

## 3 · Entity & memory budget

- **Entity tiers (six-rung ladder, `src/core/quality.ts`):** phone **1,000** (per-mesh) · tablet **2,000** · laptop **5,000** · desktop **10,000** · ultra **25,000** · mega ceiling **50,000** (instanced). Everyone **boots phone** for fast first paint (V123); the perf HUD tier chip or `?tier=` selects higher rungs. `resolveTier(cores, mem)` maps capable hardware to `mega` but is guidance only — not the boot default.
- **Neural mass:** apex ≈ 10,081 weights; whole-world ≈ 3.5 M params ≈ 14 MB Float32, one CPU thread.
- **Allocation discipline:** hot loops must be allocation-free (shared result buffers; spatial-hash
  `query` reuses one array). Per-beat `new Float32Array`/`{}`/`[]` in a frame path is a tracked regression.
- **GPU:** every `new THREE.*` outside the shared cache MUST be freed in `World.dispose()` (the recurring
  VRAM-leak class; last swept 2026-07-01).

## 4 · Regression policy

- `bun run bench` is the source; record new hot paths in `BENCHMARKS-2026-06-26.md`.
- **Threshold:** a hot-path primitive regressing **> 15%** vs the recorded baseline (CI runners are noisy;
  15% clears the noise floor) is a defect — investigate before shipping.
- **Gap (tracked):** CI runs bench as informational-only (no historical time-series / alerting). Promoting
  bench to a gated time-series is a P1 CI item (see [RISK-REGISTER-2026-07-02.md](./RISK-REGISTER-2026-07-02.md)).

## 5 · Determinism cost (accepted)

Seeded `mulberry32` costs ~40% relative over native `Math.random` but is **~1 ns absolute** — invisible
against any frame budget, and non-negotiable (determinism is a binding constraint, not a perf trade).
