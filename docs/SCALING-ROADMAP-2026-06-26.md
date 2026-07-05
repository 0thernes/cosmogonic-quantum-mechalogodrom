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

- **CPU: one JavaScript thread.** Up to 50k agents' neighbour queries + brains + behaviours run on a single thread. The tier auto-selects `mega` on a ≥16-core box, but the sim can't use those cores — so the hardware that _qualifies_ for 50k can't _run_ it smoothly. → fixed by Workers (Stage 3) + sim-LOD (Stage 4) + WebGPU (Stage 5).
- **GPU: fill-rate + the driver watchdog.** 50k instances × (colour + shadow) at 2× DPR + post-FX can exceed the ~2s TDR timeout → freeze. → crash-proofed by the governor (Stage 0); made cheap by culling/LOD (Stage 2) + WebGPU (Stage 5).
- Memory is **not** a bottleneck (~14 MB). FLOPs are **not** the bottleneck. Single-thread execution + the GPU frame-governor are.

---

## ✅ Stage 0 — Crash-proof the foundation (SHIPPED)

- **Spawn budget** (`SPAWN_BUDGET_ULTRA`, `entities.ts`) — amortizes a synchronized auto-split surge (apocalypse) over frames so it ramps to 50k instead of an allocation cliff/freeze. Ultra-gated ⇒ goldens byte-identical.
- **Render-side frame-time governor** (`core/frame-governor.ts` + `core/engine.ts` knobs + `main.ts` wiring) — sheds DPR → post-FX → shadows under sustained slow frames, restores on recovery, so the GPU never trips the driver watchdog. Render-only ⇒ determinism intact.
- **Result:** heavy load (apocalypse / CHAOS spam / 50k) = a quality dip, not a crash.

## Stage 1 — Make perf visible + controllable (effort: S)

- A small render-layer **perf HUD**: live FPS + the governor's current quality level (full / dpr-shed / fx-off / shadows-off) + the active tier.
- **Tier switch** in-UI (sets `?tier=` + reloads) so nobody hand-edits the URL.
- Hunt remaining per-frame allocations; tune governor thresholds on real devices.
- **Payoff:** the crash-proofing becomes _visible and controllable_; you can see the governor react.

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

- **Dual-Graphics API Fallback:** Attempt WebGPU initialization first; fall back to WebGL2 if unavailable (ensures mobile compatibility). WebGPU provides native GPU compute for massive parallelism; WebGL2 is the universal fallback supported by 100% of modern browsers.
- **GPU Compute Shaders:** Move neighbour queries + brain eval + reaction-diffusion onto the GPU as compute shaders (GPUs flock 1M+ agents in real time).
- **Transform Feedback / Unified Buffer Storage:** For WebGL2, use Transform Feedback to compute neural states and save them directly into VRAM buffers, then feed them back into the rendering pipeline without CPU round-trip.
- **Off-Screen Canvas Rendering:** Move the rendering loop to an OffscreenCanvas in a dedicated Web Worker to decouple GPU draw commands from DOM updates and UI event listeners.
- Do this **after** Workers — not instead of.
- Care needed: GPU float determinism (ties to the Stage 4 fork).
- **Payoff:** 100k–1M creatures + large shared param banks on a basic laptop. The real "100× everything."

---

## Comprehensive Performance Analysis (2026-07-03 Deep Dive)

### Current Architecture Assessment vs Gemini 3.1 Pro High Recommendations

**Rendering Architecture:**

- ✅ **WebGL2 Implementation:** Current engine uses Three.js with WebGL2 renderer (not WebGPU yet)
- ✅ **Instanced Rendering:** Fully implemented via `InstancedEntityRenderer` - single draw calls for 50k entities
- ✅ **Frame Governor:** Adaptive quality system sheds DPR → post-FX → shadows under load
- ⚠️ **WebGPU Migration:** Planned for Stage 5; currently WebGL2-only (no compute shaders yet)
- ⚠️ **Off-Screen Canvas:** Not implemented; rendering on main thread
- ⚠️ **Transform Feedback:** Not implemented; CPU-GPU round-trip for neural states

**WebAssembly & Native Integration:**

- ✅ **Native C++ Reliquary:** Sibling C++20 engine exists in `native/` for ray-marched gallery (separate from browser sim)
- ❌ **WebAssembly in Browser:** No Wasm compilation for main simulation - all logic in TypeScript
- ❌ **SIMD Optimization:** No SIMD128 usage in browser code
- ❌ **Emscripten Integration:** Native C++ code is standalone, not compiled to Wasm for browser use

**Multi-Threading Strategy:**

- ✅ **ADR 0010 Architecture:** Hybrid model designed - deterministic core + streamed wilderness
- ✅ **Worker Harness Contract:** Designed with sync executor + async worker executor + typed protocol
- ⚠️ **Worker Implementation:** Harness designed but NOT yet implemented (Stage 3 pending)
- ⚠️ **SharedArrayBuffer:** Planned for zero-copy where COOP/COEP headers allow
- ⚠️ **Current Reality:** All simulation runs on single JavaScript thread (the documented bottleneck)

**Mathematical Optimizations:**

- ✅ **Typed Arrays:** Extensive use of Float32Array/Float64Array for neural weights and state
- ✅ **Allocation-Free Hot Paths:** Preallocated scratch buffers, no per-frame allocations
- ✅ **Round-Robin Brain Processing:** 8-slice cohort system bounds 50k brain eval cost
- ⚠️ **FP16/INT8 Quantization:** Not implemented - all weights stored as FP32
- ⚠️ **Batch Tensor Contraction:** Individual agent brains evaluated separately (no global tensor batching)
- ⚠️ **Sparse Activation:** No stochastic pruning - all 70 brain parameters evaluated per tick

**Mobile Fallback Strategy:**

- ✅ **Quality Tier Ladder:** 6-tier system (phone 1k → tablet 2k → laptop 5k → desktop 10k → ultra 25k → mega 50k)
- ✅ **Hardware Detection:** Auto-detects cores, memory, touch input, viewport size
- ✅ **Graceful Degradation:** Phone tier uses per-mesh rendering, no shadows, capped DPR
- ✅ **Boot Optimization:** Everyone boots phone tier for fast first paint, then tier switcher available
- ⚠️ **WebGPU Fallback:** Not yet implemented - will need WebGL2 fallback for mobile
- ⚠️ **SharedArrayBuffer Fallback:** Planned for mobile Safari COOP/COEP restrictions

**Temporal/Perceptual Optimizations:**

- ✅ **Suspended Animation:** V121 - organisms stay alive in place while paused (shader-based uTime)
- ✅ **Visual Clock Separation:** Sim clock vs visual clock for frozen inspection
- ⚠️ **GPU Motion Interpolation:** Not implemented - positions updated every frame
- ⚠️ **Shader State Interpolation:** Not implemented - consciousness indicators uploaded every frame
- ⚠️ **Imposter Billboarding:** Not implemented - full meshes at all distances
- ⚠️ **Perceptual Priority Cascades:** Not implemented - all entities evaluated equally

**Consciousness Indicators (Butlin/Thaler):**

- ✅ **Butlin 8/14 Met + 6/14 Partial:** GWT-1/3/4, PP, HOT-1/2, AE-1, IIT, AST-1, recurrence proxies
- ✅ **Thaler Creativity Machine:** Full mini CM implemented (6→6→4 MLP, perturbational ideation)
- ✅ **Lazy Evaluation:** Consciousness kernel uses coupled dynamical system (emergence metric)
- ⚠️ **Screen-Space GWT Buffering:** Not implemented - GWT computed on CPU
- ⚠️ **GPU Noise Fields:** Not implemented - Thaler perturbations use CPU RNG
- ⚠️ **Macro-Brain Aggregation:** Not implemented - individual brains only

**Rust/Bend Migration Feasibility:**

- ✅ **TypeScript Foundation:** Clean allocation-free architecture suitable for Rust port
- ✅ **Deterministic RNG:** Seeded mulberry32 easy to port
- ⚠️ **Rust-to-Wasm Path:** Feasible but requires significant refactoring
- ⚠️ **Bend Limitation:** Bend does not support WebAssembly yet (native-only)
- ⚠️ **Current Recommendation:** Rust-to-Wasm viable for browser; Bend for native desktop only

### Critical Gap Analysis

**Immediate Performance Bottlenecks:**

1. **Single-Thread Simulation:** 50k agents on one JS thread despite multi-core hardware
2. **No GPU Compute:** All neural evaluation on CPU despite RTX 5070 Ti availability
3. **CPU-GPU Round-Trip:** Neural states computed on CPU, uploaded to GPU every frame
4. **FP32 Storage:** 50k × 70 params = 3.5M FP32 values (~14 MB) - could be FP16/INT8

**High-Impact Optimizations (Gemini Recommendations):**

1. **WebGPU Compute Shaders:** Move brain eval to GPU (Stage 5) - 10-100x speedup
2. **Web Workers with SharedArrayBuffer:** Parallelize simulation (Stage 3) - use idle cores
3. **Dual-API Fallback:** WebGPU → WebGL2 for mobile compatibility
4. **Off-Screen Canvas:** Decouple rendering from main thread
5. **FP16 Quantization:** Halve memory bandwidth, double cache efficiency
6. **GPU Transform Feedback:** Eliminate CPU-GPU round-trip for neural states

**Medium-Impact Optimizations:**

1. **Batch Tensor Contraction:** Evaluate 50k brains as single tensor operation
2. **Sparse Activation:** Only evaluate top 1-5% of neural pathways per frame
3. **GPU Motion Interpolation:** Sim at 10-15 Hz, render at 60 Hz via GPU tweening
4. **Imposter Billboarding:** Use 2D billboards for distant entities
5. **Perceptual Priority:** Full brains near camera, cheap updates far away

**Architecture Strengths:**

1. **Excellent Determinism:** Seeded RNG, golden receipts, reproducible simulations
2. **Allocation-Free Hot Paths:** Preallocated buffers, no GC pressure
3. **Instanced Rendering:** Single draw calls for massive entity counts
4. **Adaptive Quality:** Frame governor gracefully degrades under load
5. **Mobile-First Design:** Quality tier ladder ensures universal compatibility
6. **Comprehensive Testing:** 2336 tests, 92.75% line coverage

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
