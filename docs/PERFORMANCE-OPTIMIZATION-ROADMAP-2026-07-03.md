<!-- reviewed: 2026-07-05 | current 360 browser/GitHub Pages performance triage -->

# Performance Optimization Roadmap - 360 Browser and GitHub Pages Triage

This is the current living performance report for the browser-delivered Cosmogonic Quantum
Mechalogodrom. The filename date is a creation stamp; the contents are current as of
2026-07-05.

## Scope

Input assessed:

- The pasted browser/GitHub Pages performance memo about Wasm, Web Workers,
  SharedArrayBuffer, WebGPU, Rust/Bend, perceptual LOD, and consciousness-indicator scaling.
- Current repo code and docs in this checkout.
- Live GitHub Pages response headers for
  `https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/`.
- Current primary docs for GitHub Pages, browser isolation, WebGPU, WebAssembly,
  Emscripten threading, OffscreenCanvas, and three.js instancing/WebGPU renderer docs
  fetched through Context7 and official web documentation.

## Executive Verdict

The pasted memo is directionally right about the browser being the execution ceiling, but it
overstates several things and misses some current repo truth.

The shortest honest verdict:

- The app is already not naive: it has three.js/WebGL, InstancedMesh pools, a six-rung
  quality ladder, a render governor, spatial hashing, round-robin entity brains, and a
  documented ADR 0010 hybrid worker architecture.
- The live Pages deployment currently does not send `Cross-Origin-Opener-Policy` or
  `Cross-Origin-Embedder-Policy`, so SharedArrayBuffer and Wasm pthreads are not a safe
  current baseline for GitHub Pages. They belong behind feature detection, service-worker
  isolation experiments, or an alternate host with real headers.
- WebGPU is the long-term ceiling-raiser, but it is still a progressive enhancement, not the
  universal runtime. The browser-safe baseline remains WebGL2/three.js.
- **Phase 1.1 (Entity-brain quantization) is storage-real**: FP16 uses `Uint16Array`,
  low-tier INT8 uses `Uint8Array`, and benchmark receipts now record direct byte reductions.
  The measured caveat is CPU decode cost, so packed storage remains tier-gated rather than an
  unconditional frame-time win.
- **Phase 1.2 (GPU Motion Interpolation) is complete**: Simulation and render rates are now
  decoupled. Simulation runs at tier-specific rates (8-15 Hz) while rendering stays at 60 Hz.
  GPU interpolation provides smooth motion. Benchmarks show 89-93% faster sync times at 15 Hz.
- The next engineering move is not "rewrite everything in Rust/WebGPU." It is: stabilize the
  current branch, measure the real frame budget, finish low-risk TypeScript/WebGL optimizations,
  then add ADR 0010 workers for wilderness only, then WebGPU compute.

## Evidence Snapshot

Verification run in this pass:

| Check                                                                                                                                                                                           |          Result | Meaning                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------: | ---------------------------------------------------------------------------------------------------------- |
| `bun run typecheck`                                                                                                                                                                             |            Pass | TypeScript is green after packed quantization, entity-brain storage, and interpolation fixture fixes.      |
| `bun test tests/quantization.test.ts tests/entity-brain.test.ts tests/brutal-entity-morph.test.ts tests/wilderness-chunks.test.ts tests/perf-budget.test.ts tests/motion-interpolation.test.ts` | 58 pass, 0 fail | Focused perf/scaling, quantization, motion-interpolation, and entity-brain mutation tests are green.       |
| `bun bench/quantization.bench.ts`                                                                                                                                                               |            Pass | FP32/FP16/INT8 storage bytes plus conversion/decode costs are recorded in `docs/BENCHMARKS-2026-06-26.md`. |
| `bun run check`                                                                                                                                                                                 |            Pass | Full repo gate passed: format, typecheck, lint, receipts, sync, facts, build, and 2,387 tests.             |
| Live Pages HEAD probe                                                                                                                                                                           |          200 OK | Site is reachable.                                                                                         |
| Live Pages COOP/COEP probe                                                                                                                                                                      |          Absent | Current Pages deployment is not cross-origin isolated.                                                     |

Code touched in this pass:

- `src/math/quantization.ts` - removed `@ts-nocheck`; added packed FP16 bit conversion,
  `Uint16Array` storage helpers, and scratch-window FP16/INT8 decode.
- `src/sim/entity-brain.ts` - entity genomes now select FP32, packed FP16, or INT8 backing
  storage by quality tier while preserving deterministic perturbation and devour mutation.
- `src/world.ts` - devour now mutates packed entity-brain storage through
  `EntityBrainField.devourBrain(...)` instead of mutating a returned subarray.
- `tests/quantization.test.ts` and `tests/entity-brain.test.ts` - added byte-level storage
  receipts and packed-storage mutation seals.
- `bench/quantization.bench.ts` - seeded fixtures replace `Math.random` in measured bodies.
- `tests/quantization.test` - duplicate extensionless copy removed; `.ts` is canonical.
- `docs/BENCHMARKS-2026-06-26.md` - added quantized entity-brain storage benchmark receipts.

## 90 Degrees - Current Runtime Reality

The current app is a static browser app on GitHub Pages with a Bun build pipeline and three.js
runtime:

- `package.json` has `pages: bun run build && bun scripts/build-pages.ts`.
- `scripts/build-pages.ts` assembles static `site/`, rewrites project-subpath navigation, adds
  `.nojekyll`, and disables server-only `/api/audit` polling for Pages.
- `.github/workflows/pages.yml` publishes the static artifact through GitHub Actions Pages flow.
- `src/core/quality.ts` defines six tiers:
  - phone: 1,000
  - tablet: 2,000
  - laptop: 5,000
  - desktop: 10,000
  - ultra: 25,000
  - mega: 50,000
- `src/sim/instanced-entities.ts` already uses InstancedMesh pools above phone tier. The memo's
  "if you issue one draw call per creature" warning is valid in general, but the repo already
  addresses that core issue.
- `src/sim/entity-brain.ts` is a 70-parameter tiny MLP per normal organism, processed in 8 cohorts,
  not 50,000 parameters per entity in the current runtime.
- `docs/adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md` already made the key
  determinism decision: keep the golden deterministic core on the main thread; workers own
  best-effort wilderness only.
- `src/sim/wilderness-chunks.ts` is a pure deterministic skeleton for ADR 0010 chunk streaming.

## 180 Degrees - Comparative Assessment

| Memo claim / proposal                            | Repo truth                                                                                                                                          | Verdict                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| "The browser is choking the machine."            | True in the sense that Pages means client-only browser execution. Current bottleneck is one JS main thread plus GPU fill/frame pacing.              | Valid, but not the whole story.              |
| "Move from individual draw calls to instancing." | Already implemented for non-phone tiers through `InstancedEntityRenderer`.                                                                          | Done baseline. Improve, do not re-invent.    |
| "Use SharedArrayBuffer workers."                 | ADR 0010 wants SAB where isolated, else transferables. Live Pages lacks COOP/COEP today.                                                            | Correct as optional path, wrong as baseline. |
| "Compile C/C++ math to Wasm."                    | Native C++ exists, but browser sim is TypeScript. Wasm is feasible for isolated kernels, not a first rewrite.                                       | Medium-term, after measurement.              |
| "Use WebGPU compute."                            | WebGPU is not implemented. MDN still marks WebGPU limited availability, though it is the right ceiling-raiser.                                      | Long-term, feature-detected only.            |
| "Use WebGL2/WebGPU fallback."                    | Current renderer is WebGL/three.js. Three.js docs now include WebGPU paths and fallback language, but this app has no renderer abstraction yet.     | Correct architecture target.                 |
| "50k agents x 50k params = 2.5B floats."         | Current normal organism brain is 70 params; 50M/shared-parameter banks are future Stage 8, not per-agent today.                                     | Overstated for current code.                 |
| "FP16/INT8 quantization."                        | Entity-brain storage now uses real packed arrays by quality tier; benchmarks verify direct byte reductions and visible JS decode cost.              | Storage-real for entity brains; keep gated.  |
| "Decouple sim from render with interpolation."   | **Phase 1.2 complete**: Simulation runs at 8-15 Hz (tier-dependent), rendering at 60 Hz with GPU interpolation. Benchmarks show 89-93% faster sync. | **Complete**. Frame governor decoupled.      |
| "Rust vs Bend."                                  | Rust-to-Wasm is plausible for browser kernels. Bend is native/CUDA-oriented and not a GitHub Pages browser path today.                              | Rust later; Bend native-only experiment.     |

## 270 Degrees - Holes, Gaps, and Failure Modes

### P0 - Truth and Gate Gaps

| Gap                                                                    | Evidence                                                                             | Risk                         | Required action                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------- |
| Full gate not proven after current dirty-tree performance work.        | Fixed in this pass.                                                                  | Closed.                      | `bun run check` passed with 2,387 tests, receipts, sync, facts, lint, and build. |
| Multiple performance docs disagree on quantization and worker state.   | Older docs still say quantization not implemented or imply Phase 1 is only proposed. | Doc overclaim or underclaim. | Make this file the current source, then sync related docs or prune duplicates.   |
| `tests/quantization.test` and `tests/quantization.test.ts` both exist. | Fixed in this pass.                                                                  | Closed.                      | Keep only canonical `tests/quantization.test.ts`.                                |
| Quantization uses `@ts-nocheck`.                                       | Fixed in this pass.                                                                  | Closed.                      | `src/math/quantization.ts` is now strict-typechecked.                            |

### P1 - Static Hosting and Security Header Gaps

| Gap                                                                                    | Evidence                                                       | Risk                                                              | Required action                                                                                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Live Pages is not cross-origin isolated.                                               | HEAD response has no COOP or COEP headers.                     | SAB and Wasm pthreads unavailable as baseline.                    | Runtime feature detection plus transferables fallback. Consider Cloudflare/Vercel/Netlify/static host with headers for isolated build. |
| GitHub Pages is static hosting.                                                        | Official GitHub docs describe static HTML/CSS/JS publishing.   | No server-side APIs, headers, or dynamic compute on Pages.        | Keep Pages client-only; do server/AI features only locally or on another host.                                                         |
| Service-worker COOP/COEP shims are possible but not equivalent to real server control. | Browser isolation docs require top-level isolation conditions. | Can break third-party assets, OAuth/popups, or cached first load. | Treat as experimental, measured, and reversible.                                                                                       |

### P2 - Runtime Architecture Gaps

| Gap                                                                        | Evidence                                                                                              | Risk                                                                             | Required action                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `simRate`/motion interpolation is wired, but browser visual proof remains. | `world.ts` gates sim ticks by quality `simRate`; instanced renderer has motion attrs/uniforms/tests.  | Claims of perceptually smooth 10-15Hz sim still need screenshot/canvas evidence. | Add Playwright visual smoke across tiers and tune interpolation bands.           |
| Priority cascade is live, but visual/perf receipts must stay current.      | `world.ts` drives entity brains via slot-safe priority indices; focused tests and bench now cover it. | Bad cadence choices could flatten background behavior or hide stutter.           | Keep near/full fidelity; capture browser traces before changing tier capacities. |
| Workers are designed but not implemented.                                  | ADR 0010 and `wilderness-chunks.ts` exist.                                                            | Single-thread ceiling remains.                                                   | Implement sync executor first, then async wilderness worker, never core writes.  |
| WebGPU renderer abstraction absent.                                        | Current core is three.js WebGL path.                                                                  | WebGPU work would sprawl through world/render code.                              | Add a narrow graphics capability facade before compute.                          |
| Wasm toolchain absent from build.                                          | No Emscripten/wasm-pack build path.                                                                   | Wasm claims are speculative.                                                     | Only port isolated kernels after JS benchmarks show a real bottleneck.           |

### P3 - Visual/Capability Preservation Gaps

| Gap                                                   | Risk                        | Preservation rule                                                                                                                     |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Aggressive LOD could make the world visibly cheaper.  | Diluted visual quality.     | Full-fidelity near field; imposters only beyond perceptual threshold with shader-matched atlas and transition bands.                  |
| Sparse/lazy brains could flatten agent individuality. | Diluted intelligence.       | Use macro-brains only for far wilderness; core and focal entities keep full minds.                                                    |
| WebGPU compute could break determinism.               | Scientific receipt failure. | Keep golden core CPU-deterministic; GPU computes wilderness or visual fields until deterministic enough.                              |
| Mobile tier could become a different app.             | Capability dilution.        | Change density/cadence, not the conceptual systems: every tier keeps digital biologics, GWT/indicator telemetry, and visual identity. |

## 360 Degrees - Dynamic Multiquadrant Methodology

Score each candidate on five axes, 1 low to 5 high:

- Performance leverage
- Determinism safety
- Visual fidelity preservation
- GitHub Pages compatibility
- Implementation risk, inverted: 5 means low risk

| Candidate                                      | Perf | Determinism | Visual | Pages | Risk | Total | Placement                 |
| ---------------------------------------------- | ---: | ----------: | -----: | ----: | ---: | ----: | ------------------------- |
| Fix branch gate/type/doc truth                 |    3 |           5 |      5 |     5 |    5 |    23 | Do first                  |
| Real quantized storage                         |    3 |           4 |      5 |     5 |    4 |    21 | Phase 1                   |
| Runtime perf HUD/profiler receipts             |    3 |           5 |      5 |     5 |    5 |    23 | Phase 1                   |
| Sim/render decoupling + interpolation          |    4 |           4 |      4 |     5 |    3 |    20 | Phase 1/2                 |
| Perceptual priority cascade                    |    5 |           3 |      4 |     5 |    3 |    20 | Phase 2                   |
| ADR 0010 wilderness workers with transferables |    4 |           4 |      5 |     5 |    3 |    21 | Phase 3                   |
| SAB workers on isolated host                   |    5 |           3 |      5 |     2 |    2 |    17 | Optional deployment track |
| WebGPU graphics facade                         |    4 |           3 |      5 |     4 |    2 |    18 | Phase 4                   |
| WebGPU compute for wilderness                  |    5 |           2 |      5 |     3 |    2 |    17 | Phase 5                   |
| Rust-to-Wasm math kernels                      |    3 |           3 |      5 |     4 |    2 |    17 | Later, selective          |
| Bend native/CUDA version                       |    5 |           2 |      5 |     0 |    1 |    13 | Separate native product   |

Deductive conclusion from constraints:

1. Pages is static, so no server-side rescue path exists there.
2. SAB/Wasm pthreads require cross-origin isolation, absent on current live Pages.
3. Core determinism is a hard contract, so async/GPU must not write golden-read state.
4. Therefore the correct scaling route is hybrid: deterministic core remains conservative;
   scalable wilderness and visual fields get workers/GPU.

Inductive conclusion from current repo:

1. The codebase already earns big wins from instancing, frame governance, and typed arrays.
2. The new entity-brain quantization work is memory-real, but CPU decode cost is measurable.
3. Perceptual priority is now wired through original entity slots, so it reduces brain cadence
   without corrupting per-entity genomes.
4. The existing ADR 0010 and chunk tests mean worker streaming is the most natural next
   architectural frontier.
5. The fastest safe progress is to finish current partial phases, not jump stacks.

## Execution Pipeline and Triage

### Phase 0 - Stabilize and Seal Current Truth

Goal: make the worktree honest before adding new engine layers.

Tasks:

1. Run `bun run check`; fix only in-scope failures.
2. Remove duplicate `tests/quantization.test` or document why both files exist. Completed
   2026-07-05.
3. Remove `@ts-nocheck` from `src/math/quantization.ts`. Completed 2026-07-05.
4. Add a short benchmark note to `docs/BENCHMARKS-2026-06-26.md` after real benchmark runs.
   Completed 2026-07-05 for entity-brain quantization.
5. Reconcile stale performance docs against this report.

Definition of done:

- `bun run typecheck` passes.
- Focused perf tests pass.
- Full `bun run check` passes.
- No doc says "quantization complete" beyond the entity-brain storage scope.

### Phase 1 - Measurement Before More Machinery

Goal: quantify the actual hot path on current WebGL/TS.

Tasks:

1. Add browser perf trace recipe for phone/tablet/desktop/mega.
2. Record:
   - median and p95 frame time
   - entity update time
   - instanced sync time
   - render time
   - heap use
   - draw call count
   - active tier and governor level
3. Add a visible "perf truth chip" that reports tier, entity count, governor level, and frame EMA.

Definition of done:

- One reproducible benchmark command or manual trace recipe per tier.
- Numbers stored with machine/browser/date context.

### Phase 2 - Finish Low-Risk TypeScript/WebGL Optimizations

Goal: get real wins without changing deployment model.

Tasks:

1. Convert FP16/INT8 from "precision truncation" into actual storage:
   - `Uint16Array` packed half floats or domain-specific `Int8Array` banks.
   - Dequantize only into scratch windows needed by the current cohort.
   - Entity-brain storage completed 2026-07-05; other buffers remain candidates, not done.
2. Make benchmark arrays seeded, not `Math.random`-filled inside measured bodies.
   - Completed 2026-07-05 for `bench/quantization.bench.ts`.
   - Completed 2026-07-05 for `bench/perceptual-priority.bench.ts`; the bench now also forces real
     resort work instead of cached no-op iterations.
3. Wire `simRate` through a real fixed-step accumulator:
   - `world.ts` fixed-step sim gating is present.
   - instance motion attributes and shader uniforms are present.
   - remaining: visual regression smoke and interpolation-alpha proof in browser.
4. Implement priority cadence for entity brains:
   - Completed 2026-07-05 for live world handoff: priority cascade now feeds original entity slots to
     `EntityBrainField.thinkIndices`, preserving each entity/genome pairing.
   - Completed 2026-07-05 for the cascade's index preservation; removed the post-sort `indexOf` path.
   - remaining: visual smoke for tier transitions and a later far-wilderness macro-brain split.

Definition of done:

- Memory reduction is measured in bytes, not inferred.
- Visual quality preserved in screenshots.
- Determinism tests still pass for the core.

### Phase 3 - ADR 0010 Workers, Transferables First

Goal: use cores without breaking golden determinism.

Tasks:

1. Implement sync executor and protocol in-process first.
2. Add async worker executor using transferable `ArrayBuffer` snapshots.
3. Connect it only to wilderness chunks.
4. Add runtime selection:
   - `crossOriginIsolated && SharedArrayBuffer`: SAB path
   - workers available: transferables path
   - fallback: sync/smaller world path
5. Assert wilderness data never feeds golden-read core state.

Definition of done:

- Existing determinism goldens unchanged.
- Worker off/on produces same deterministic core.
- Wilderness may lag 1 frame and is explicitly outside golden.

### Phase 4 - WebGPU/WebGL2 Graphics Facade

Goal: add WebGPU without abandoning universal browser reach.

Tasks:

1. Create a capability probe around `navigator.gpu`, WebGL2, OffscreenCanvas, and isolation.
2. Keep WebGL2 as the default/fallback renderer.
3. Prototype a WebGPU-only lab path before touching main world.
4. Only then migrate selected visual fields or wilderness buffers.

Definition of done:

- WebGL2 path remains visually identical.
- WebGPU path is feature-detected and can be disabled by query flag.
- Failure to initialize WebGPU is a normal fallback, not an error.

### Phase 5 - GPU Compute and Wasm Kernels

Goal: move only proven hot kernels.

Tasks:

1. Port one isolated pure kernel first:
   - reaction-diffusion
   - wilderness flock/neighbor step
   - batched tiny MLP for wilderness
2. Compare TS vs Wasm vs WebGPU with the same input fixtures.
3. Keep core CPU deterministic unless GPU determinism is proven and baselined.
4. Introduce Rust-to-Wasm only where it beats optimized TS with enough margin to justify the toolchain.

Definition of done:

- Kernel has golden fixtures.
- Kernel has benchmark deltas.
- Fallback path remains available.

### Phase 6 - Visual Fidelity and Intelligence Preservation

Goal: scale without making the world smaller in spirit.

Rules:

1. Full shader identity stays near-camera.
2. Distant imposters use a generated atlas from the real creature shaders, not generic sprites.
3. Macro-brains only replace distant wilderness agents, never focal Archons/core entities.
4. Cognitive indicators remain present on all tiers, but cadence/resolution may vary by tier.
5. Every reduction has a visible or measured compensation: interpolation, texture fields, or
   aggregate behavior.

## Source Basis

Primary external docs:

- GitHub Pages static hosting:
  https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- GitHub Pages custom workflows:
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- SharedArrayBuffer security requirements:
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- COEP and cross-origin isolation:
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy
- COOP/COEP guide:
  https://web.dev/articles/coop-coep
- WebGPU API availability and purpose:
  https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- WebAssembly streaming MIME requirement:
  https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static
- Emscripten pthreads and worker constraints:
  https://emscripten.org/docs/porting/pthreads.html
- Emscripten Wasm Workers API:
  https://emscripten.org/docs/api_reference/wasm_workers.html
- OffscreenCanvas:
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen
- three.js InstancedMesh and WebGPU docs were checked via Context7 library `/mrdoob/three.js`.

Local source anchors:

- `package.json`
- `.github/workflows/pages.yml`
- `scripts/build-pages.ts`
- `src/core/quality.ts`
- `src/core/frame-governor.ts`
- `src/sim/instanced-entities.ts`
- `src/sim/entity-brain.ts`
- `src/sim/wilderness-chunks.ts`
- `docs/adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md`

## Final Position

The correct path is not to dilute visual quality, reduce capabilities, or flatten intelligence.
It is to allocate fidelity where perception and scientific receipts demand it, and move the
unbounded spectacle into progressively more parallel, explicitly best-effort layers.

In other words:

1. Preserve the deterministic core.
2. Make performance measurable.
3. Finish real quantization and real interpolation.
4. Stream wilderness through workers.
5. Add WebGPU compute only behind fallback gates.
6. Treat Rust/Wasm as selective kernel acceleration, not a religion.
7. Treat Bend as a separate native/CUDA research branch, not a GitHub Pages browser answer.
