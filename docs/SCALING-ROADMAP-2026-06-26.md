<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Scaling Roadmap — fix it, make it better, grow it

How Cosmogonic gets from "crash-proof at 50k" to "a teeming, biome-rich, economy-driven
100× world on a basic laptop." Ordered by leverage ÷ effort ÷ risk; each stage is a
shippable, gate-green, pushed increment that builds on the last.

> **Two rules that run through every stage:**
>
> 1. Keep the receipts/gate discipline (`bun run check` green at every commit; canonical receipts synced).
> 2. **Decide the determinism fork before Stage 4** — it changes the architecture (see Stage 4).

## The two real bottlenecks (why scaling is the way it is)

- **CPU: one JavaScript thread.** Up to 50k agents' neighbour queries + brains + behaviours run on a single thread. Capable hardware **maps** to `mega` via `resolveTier` (≥16 cores + ≥8 GB), but **everyone boots `phone`** for fast first paint (V123) — the perf HUD tier chip or `?tier=mega` is the path to 50k. The sim still can't use the other cores until Workers ship (Stage 3). → fixed by Workers (Stage 3) + sim-LOD (Stage 4) + WebGPU (Stage 5).
- **GPU: fill-rate + the driver watchdog.** 50k instances × (colour + shadow) at 2× DPR + post-FX can exceed the ~2s TDR timeout → freeze. → crash-proofed by the governor (Stage 0); made cheap by culling/LOD (Stage 2) + WebGPU (Stage 5).
- Memory is **not** a bottleneck (~14 MB). FLOPs are **not** the bottleneck. Single-thread execution + the GPU frame-governor are.

---

## ✅ Stage 0 — Crash-proof the foundation (SHIPPED)

- **Spawn budget** (`SPAWN_BUDGET_ULTRA`, `entities.ts`) — amortizes a synchronized auto-split surge (apocalypse) over frames so it ramps to 50k instead of an allocation cliff/freeze. Ultra-gated ⇒ goldens byte-identical.
- **Render-side frame-time governor** (`core/frame-governor.ts` + `core/engine.ts` knobs + `main.ts` wiring) — sheds DPR → post-FX → shadows under sustained slow frames, restores on recovery, so the GPU never trips the driver watchdog. Render-only ⇒ determinism intact.
- **Result:** heavy load (apocalypse / CHAOS spam / 50k) = a quality dip, not a crash.

## Stage 1 — Make perf visible + controllable (effort: S) ✅ SHIPPED

- **Perf HUD** (`src/ui/perf-hud.ts`): live FPS + governor level + active tier + one-tap tier switcher (`?tier=` reload).
- **Tier switch** in-UI — no URL hand-editing required.
- **Remaining:** hunt per-frame allocations; tune governor thresholds on real devices (275HX + 5070 Ti profile).

## Stage 2 — Free camera (surface it) + adaptive quality (effort: S) ✅ MOSTLY SHIPPED

- **Free-fly camera — already in the engine.** It works in the default `free` view (drag = look, scroll = zoom, WASD/arrows = fly); it was just undiscoverable. Surfaced in-app via the perf-HUD hint (`src/ui/perf-hud.ts`). This is the real "it's small to move around" fix.
- **Adaptive quality / render-LOD — already shipped** as the Stage-0 frame governor (sheds DPR → post-FX → shadows under load).
- **Deferred to Stage 3 (correctly):** the determinism-affecting **arena resize** and **per-instance distance-culling**. Both belong with streaming under the Hybrid decision (Stage 4) — that's where "near/simulated vs far/streamed/culled" is designed and visually tuned (a blind hard-cull distance pops against the fog), and the arena resize touches the sim, so it re-baselines goldens as part of the deterministic-core/streamed-wilderness split, not in isolation.
- **Payoff:** you can roam now; the heavy world-growth lands with the streaming substrate where it's safe.

## Stage 3 — Sim off the main thread + streamed world (effort: L) — see [ADR 0010](adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md)

- Move neighbour queries + per-creature brain eval into **Web Workers** — finally use the other ~23 cores. Deterministic work partitioning (seeded, stable chunking) so the core one-seed property holds.
- Absorbs Stage 2's deferred parts under the **Hybrid** contract: a deterministic **preserve core** (bit-exact) + a streamed best-effort **wilderness** (camera-chunked load/unload + per-instance distance-culling/LOD), which is also where the **arena grows** (the wilderness is the new space to roam).
- **Payoff:** 50k goes from crash-proof-but-sluggish → smooth; the world gets big via the wilderness; headroom toward 100k. The first true scaling lever.

## Stage 4 — Simulation LOD / tiered AI (effort: L) ✅ DECIDED: Hybrid (Option C)

- Near-camera creatures get full brains; mid-distance get cheap updates; far away gets **aggregate/herd simulation** ("don't simulate what you can't see in detail").
- **THE DETERMINISM FORK — DECIDED 2026-06-20 by the owner: Option C (Hybrid).**
  - **Option A — Full determinism:** simulate everything, cap depth. Keeps bit-exact replay; scales less.
  - **Option B — Deterministic core + best-effort periphery:** the studied region is deterministic; the far world is decorative. Scales massively; loses pure replay.
  - **Option C — Hybrid (CHOSEN):** a deterministic "preserve" core zone — bit-exact, replayable, the receipts/science superpower stays intact — surrounded by a streamed best-effort "wilderness" that scales to 100×. Determinism is the project's identity, so it is kept where it matters; raw scale lives in the periphery. Stages 4–5 are built to this contract: the core sim is seed-reproducible; the wilderness is camera-streamed LOD and explicitly NOT part of the determinism golden.
- **Payoff:** "100× creatures as a living spectacle" without surrendering the deterministic, receipted core.

## Stage 5 — WebGPU compute (effort: XL — the ceiling-raiser)

- Move neighbour queries + brain eval + reaction-diffusion onto the GPU as compute shaders (GPUs flock 1M+ agents in real time).
- Do this **after** Workers — not instead of.
- Care needed: GPU float determinism (ties to the Stage 4 fork).
- **Payoff:** 100k–1M creatures + large shared param banks on a basic laptop. The real "100× everything."

## Stage 6 — Biomes + verticality (effort: M)

- **Plants grown from the reaction-diffusion living ground** (cheap, instanced — the RD field is already a nutrient substrate).
- A flying/aerial layer + ground/burrowing life (altitude behaviours).
- Biome regions: different RD params + temperature → different flora/fauna.
- **Payoff:** it becomes a world, not a screensaver.

## Stage 7 — Living trophic economy (effort: M)

- A food web: plants → herbivores → predators → titans; scarcity → prices → migration → war, wired into the existing two-currency market.
- **Payoff:** the ecosystem and the economy become one living loop.

## Stage 8 — Intelligence / param scaling to ~50M (effort: M, after Stage 5)

- Shared, quantized param banks + a few big brains (Archons) + tiny per-agent heads, evaluated at low cadence.
- 50M params _stored & cheaply evaluated_, never "50M per agent per frame."
- **Payoff:** the "10× params" goal without melting the laptop. Requires the compute substrate from Stage 5.

---

## Sequencing rationale

```
Stage 0 (done) ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 8
                         └► 6 ─► 7  (can run in parallel after Stage 2)
```

- 1 before everything: see what the governor is doing.
- 2 before 3: culling/LOD + a real camera make the world worth scaling.
- 3 before 4/5: get off the main thread before tiering or GPU-compute.
- 4's fork gates 5 (GPU determinism choice).
- 6/7 (biomes + economy) can proceed in parallel once Stage 2 lands — they're additive content, not perf-blocked.
- 8 last: param scaling needs the Stage 5 compute substrate.

_Status tracked here; each stage ships as its own gate-green commit. Canonical receipts live in `scripts/canonical-receipts.ts`._

---

## External perf audit crosswalk (Gemini 3.1 Pro, 2026-07-05)

A third-party browser-performance assessment (emailed after local profiling on Intel 275HX + RTX 5070 Ti @ ~3 FPS on `?tier=mega`) was reconciled against the **actual codebase** — not aspirational docs. Use this matrix before implementing any recommendation; many items are **already shipped**, **explicitly deferred**, or **blocked by binding constraints** (determinism, GitHub Pages static host).

### Quadrant map (360° comparative frame)

| Angle                       | Lens                          | Summary                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0° — Measured now**       | What ships today              | WebGL2 + Three.js · InstancedMesh pools (≤80 draws @ 10k+) · six-rung quality ladder · frame governor · sim cadence throttles · √N mega scaling · 5+20 apex mind tiering · phone boot default                                                                                                                                   |
| **90° — Gemini advises**    | Generic browser perf playbook | Wasm linear memory · Web Workers + SharedArrayBuffer · WebGPU compute · FP16/INT8 · imposters · temporal GPU interpolation · lazy Butlin eval                                                                                                                                                                                   |
| **180° — Hard conflicts**   | Repo law vs advice            | **Determinism:** prior SAB worker **removed** (raced main thread). **GitHub Pages:** no COOP/COEP headers → SharedArrayBuffer blocked on Safari without fallback. **Bit-exact replay** is identity — GPU float nondeterminism gates WebGPU brain path. **Not 50k params/agent** — apex ~10k weights, entities ~70-param TinyMLP |
| **270° — Synthesis / next** | Honest sequencing             | Stage 3 Workers (deterministic partition) → Stage 4 Hybrid wilderness LOD → Stage 5 WebGPU compute. Short wins: GPU frustum cull on instanced pools, motion-vector vertex interpolation, consciousness texture field (GWT proxy)                                                                                                |

### Recommendation-by-recommendation verdict

| #   | Gemini recommendation                                | Repo status                                                                                                                                                                                                                                           | Verdict                                                                                                                                                                          |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Wasm for C/C++ math (Emscripten)**                 | `native/` C++ gallery + apex golden contract exist; browser sim is **TypeScript authoritative**. `resolveApexBackend()` → TS oracle only.                                                                                                             | **PLANNED** (Stage 5 substrate). Tsotchke corpus is **studied/wired in TS**, not compiled to Wasm in-browser yet.                                                                |
| 2   | **Web Workers + SharedArrayBuffer**                  | ADR-0010 Hybrid design accepted. Wilderness **chunk grid math only** (`wilderness-chunks.ts`). Prior SAB worker in SuperMind **removed** for nondeterminism.                                                                                          | **NEXT BIG LEVER** (Stage 3). Must use **deterministic work partitioning**, not shared mutable latent. Single-thread fallback when `SharedArrayBuffer` undefined (Safari/Pages). |
| 3   | **WebGPU compute for brains**                        | Zero `navigator.gpu` usage. ROADMAP Stage **5** (after Workers). WebGL2 only via `THREE.WebGLRenderer`.                                                                                                                                               | **DEFERRED** — correct sequence. Probe WebGPU → fall back WebGL2 is ROADMAP item, not shipped.                                                                                   |
| 4   | **Instanced rendering (50k → 1 draw)**               | ✅ `InstancedEntityRenderer` — one pool per morphotype, custom per-instance shader lanes. Phone tier uses per-mesh (1k cap).                                                                                                                          | **SHIPPED** (tablet+). Gemini's core GPU win is **already the architecture**.                                                                                                    |
| 5   | **Dual API WebGPU/WebGL fallback**                   | WebGL2 only today. Feature-flag WebGPU in ROADMAP.                                                                                                                                                                                                    | **NOT STARTED** — add probe + graceful degrade when Stage 5 begins.                                                                                                              |
| 6   | **Multi-tier param scaling (100 / 1k / 50k params)** | Entity brains: **same 70-param TinyMLP** at all tiers; cost control = **round-robin slices** (`SLICES=8`), not width scaling. Apex: 5 full minds + 20 light-echoes. `apex-parameter-manifold.ts` has substrate tiers but not wired to `quality.tier`. | **PARTIAL** — entity **count** tiers exist; per-agent **parameter count** does not shrink on phone. Candidate Stage 4 LOD item.                                                  |
| 7   | **Async Wasm module splitting**                      | No `.wasm` in `dist/`. Bun bundles TS.                                                                                                                                                                                                                | **NOT APPLICABLE YET** — revisit when Wasm hot path lands.                                                                                                                       |
| 8   | **OffscreenCanvas + worker render**                  | Main-thread WebGL canvas only.                                                                                                                                                                                                                        | **NOT STARTED** — render governor already sheds on main thread; OffscreenCanvas is Stage 3+ optional.                                                                            |
| 9   | **FP16 / INT8 quantization**                         | All hot paths `Float32Array`. Stage 8 mentions quantized param banks.                                                                                                                                                                                 | **DEFERRED** (Stage 8, post-WebGPU). Conflicts with current golden-byte determinism unless carefully scoped.                                                                     |
| 10  | **Tensor batching / global contraction**             | Spatial hash + shared query buffer; per-entity brains still individual forward passes (round-robin).                                                                                                                                                  | **PARTIAL** — neighbor query batched via grid; brain eval not yet batched. Worker Stage 3 target.                                                                                |
| 11  | **GPU motion-vector temporal interpolation**         | Two-frame `beh2` behavior blending in `entities.ts`. No vertex shader position tween between sim ticks.                                                                                                                                               | **PARTIAL** — sim-side blend exists; **GPU velocity tween** (10–15 Hz sim / 60 Hz render) is a **high-ROI, determinism-safe** render-only win.                                   |
| 12  | **Screen-space imposters / billboards**              | Distant entity LOD deferred to wilderness streaming (ADR-0010). Instanced pools draw **all** instances (`frustumCulled=false`).                                                                                                                       | **PLANNED** (Stage 4 wilderness + distance cull).                                                                                                                                |
| 13  | **Perceptual brain priority cascade**                | Cadence throttles: theory stride, flock every-2nd-frame, connectome cadence, brain `SLICES=8`, pantheon every-4-frames.                                                                                                                               | **SHIPPED (CPU cadence)** — aligns with Gemini's "think less often" advice; not distance-sorted yet.                                                                             |
| 14  | **Lazy Butlin / GWT texture / Thaler noise tables**  | Consciousness kernels run in TS; GWT/IIT/FEP adapters exist. No GPU consciousness texture yet. Simplex noise in `simplex-noise` dep.                                                                                                                  | **PARTIAL** — lazy eval + GWT render-to-texture are **documented targets**; not wired.                                                                                           |
| 15  | **Rust/Bend backend**                                | Native C++ for gallery; Bend has **no Wasm target**.                                                                                                                                                                                                  | **OUT OF SCOPE** for GitHub Pages. Rust→Wasm is a valid Stage 5 alternative to TS Workers if determinism contract holds.                                                         |
| 16  | **Frustum culling on GPU**                           | Selective culling on portal-temple + fire-pillar (2026-07-03 audit). Instanced entity pools intentionally unculled.                                                                                                                                   | **PARTIAL** — extend culling to instanced pools without breaking population visibility contract.                                                                                 |

### Why 3 FPS on a 5070 Ti is plausible (deductive)

1. **Boot tier ≠ capability tier** — default boot is **phone (1k entities)**; 3 FPS at `?tier=mega` means 50k sim on **one JS thread** + 50k instanced draws + post-FX + shadows at 2× DPR.
2. **CPU-bound sim** — `SuperMind.think()` ≈ **2 ms** per apex beat; 50k entity brains round-robin but neighbor queries + flock + consciousness adapters stack on the same thread.
3. **GPU fill-rate** — governor sheds DPR/FX/shadows under load (Stage 0), but unculled instanced population + heavy fragment shaders can still TDR-throttle.
4. **Not a hardware failure** — the 275HX/5070 Ti are idle on 23 cores and much of the GPU when the bottleneck is single-thread JS + draw count.

### Action queue (ordered by leverage ÷ risk)

1. **Stage 3 Workers** — deterministic brain/neighbor partition (the Gemini #1 win the repo agrees on).
2. **GPU motion-vector interpolation** — render-only, no determinism fork (quick win candidate).
3. **Distance-sorted brain cadence** — extend existing CPU throttles with camera prominence (Gemini #13).
4. **GWT consciousness texture** — GPU broadcast buffer for Butlin GWT indicator (Gemini #14).
5. **WebGPU probe + fallback** — when Stage 5 starts; do not skip WebGL2 path.
6. **Wire `apex-parameter-manifold` to `quality.tier`** — honest param scaling in UI + caps.

_Full measured targets: [PERFORMANCE-TARGETS-2026-07-02.md](./PERFORMANCE-TARGETS-2026-07-02.md). Worker contract: [ADR 0010](adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md)._
