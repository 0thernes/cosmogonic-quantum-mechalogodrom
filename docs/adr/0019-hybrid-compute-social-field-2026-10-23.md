# ADR 0019 — Hybrid compute: a snapshot social field on every CPU core

Status: accepted 2026-10-23. Phase 1 (CPU cores) is implemented. Phases 2–4 are planned and
not implemented.

## Context

The organism simulation ran on one CPU thread. Profiling a 10,000-organism frame (base commit
`e590f8c4`, 4-vCPU container) found that the cost came from three places.

- **The ambient social pass (ADR 0016).** Every organism scanned every grid neighbour within the
  flock radius, and did it every frame. That was 60 of 88 ms at 10k. The grid queries themselves cost
  about 10 ms. The rest was megamorphic property reads on three.js objects and `userData` (ablation:
  87.6 ms full, 27.0 ms with the social pass removed).
- **The grid-query behaviors** (flock, nash, market, setunion, typemorph, graphseek). Each ran an
  unbounded query. In a dense colony that averaged 166 candidates.
- **In-place sequential updates.** These make the loop order-dependent, so the work could not
  simply be split across cores.

Determinism is not the cost. Seeded mode only fixes the random stream. What blocked parallelism
was reading and writing live objects in order.

What a browser can reach:

| Path                        | How                    | Status here                                                                             |
| --------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| CPU cores                   | Web Workers            | used (phase 1)                                                                          |
| Shared memory between cores | `SharedArrayBuffer`    | needs cross-origin isolation (COOP/COEP headers); GitHub Pages cannot set them          |
| GPU compute                 | WebGPU compute shaders | ambient wilderness kernel only, when calibrated faster (ADR 0010); not the social field |
| NPU / ML accelerator        | WebNN (`navigator.ml`) | experimental; no inference runs on it                                                   |

CUDA and vendor NPU drivers cannot be called from a web page. The GPU's CUDA cores are reached
through WebGPU.

## Decision

### 1. The social field is a structure-of-arrays snapshot (`src/sim/social-field.ts`)

Above `SOCIAL_BUDGET_MIN_POP` (2,000) organisms, each update ends by packing the population into
flat typed arrays:

- position
- tribe
- type
- energy
- alive
- hostile
- sanctuary shelter

The arrays are bucketed by a counting-sort grid. `scanSocialRange` answers each organism's
neighbourhood:

- its three nearest neighbours
- its nearest kin
- its nearest organism of the same type
- its best-fed kin
- neighbour and kin counts
- the summed direction of close threats

It is a pure function of the snapshot and writes only its own range of the result arrays.

The scan is bounded. It reads at most `SOCIAL_NEIGHBOR_BUDGET` (64) candidates, nearest grid cells
first. Each cell is read from a per-organism salt so that organisms sample different colony
members. The grid-query behaviors use the same budget through `SpatialHash.queryNearFirst`.

### 2. Determinism contract: results never depend on which executor answers

- **Two update slots.** The snapshot packed at the end of update _k_ is consumed at the start of
  update _k + 2_. This lag is part of the simulation's definition, so it holds identically in
  headless tests and in the browser.
- **Late or missing answers.** If an executor has not returned every range, the main thread runs
  `scanSocialRange` on the same snapshot. The answers are bit-identical, so lateness changes only
  speed.
- **Finding organisms in the snapshot.** Each organism records its index in the even-parity and
  odd-parity snapshots (`socialSlot0` / `socialSlot1`). The snapshot still finds it after deaths
  and births reshuffle the list. A partner that has died since the snapshot is dropped.
- **Small worlds are unchanged.** At 2,000 organisms or fewer the field is never built, and the
  exact legacy scan and queries run. Seeded small worlds and the determinism goldens are
  byte-identical.

### 3. Phase 1: worker cores (`src/core/social-scan-pool.ts`, `src/workers/social-field-worker.ts`)

The live browser starts `min(8, cores − 1)` workers. The `?workers=0` parameter opts out. Each
snapshot is split into equal ranges, one per worker. The snapshot travels by structured-clone copy,
so the feature works without cross-origin isolation.

Safety rules:

- A worker holds at most two snapshots. A third dispatch is skipped rather than queued.
- A reply is accepted only for a pending ticket and its exact assigned range, after shape
  validation.
- Any malformed reply or worker error retires the pool, and the main thread takes over.

While the field runs, the perf HUD's compute row gains a social segment
(`social: 3 cores · 96% off-thread`). It shows how many social cores are alive and the share of
recent frames they answered. The rest of the row is the ambient backend that ADR 0010 reports.

### 4. Planned phases (not implemented)

- **Phase 2: shared memory.** When `crossOriginIsolated` is true, back the field with a
  `SharedArrayBuffer` and use `Atomics` completion flags. This removes the per-frame copies and
  the dependence on the main thread yielding. It needs COOP/COEP on the dev server and a deploy
  host that can send them.
- **Phase 3: WebGPU compute.** Port `scanSocialRange` to WGSL, one invocation per organism over
  the same buffers. Equivalence testing is part of the plan:
  - An integer-exact subset must match the CPU kernel bit for bit: indices, counts and kin choice
    within the same snapshot.
  - Float distances may differ in the last bit, so that tolerance must be declared before the GPU
    path may answer seeded runs. Until then it is allowed only in wild mode.
- **Phase 4: WebNN.** Run batched organism brain forward passes (`EntityBrain`) once WebNN ships
  without a flag. The networks are small, so it is adopted only if a measured win beats WebGPU or
  WASM SIMD.

The world and creature expansion requested alongside this work will spend the headroom this ADR
creates. See _Expansion plan_; it is planned, not claimed.

## CQM-25 assessment

Affected axis IDs:

- `visual_embodied_scale` (organisms simulated within a frame budget)
- `instrumentation_reproducibility` (executor-independent determinism, HUD receipts, a committed
  benchmark)
- `social_communication` (the social statistics above 2,000 are now bounded samples taken from a
  two-update-old snapshot)

**No evidence state changes.**

- **Subject / scope:** `EntityManager.update` main-thread CPU time and seeded trajectories, at 5k,
  10k and 25k organisms. GPU draw cost is excluded.
- **Measures:** `bun run bench:social-field` gives the median main-thread update time and the
  frames the workers answered. It uses the real `SocialScanPool` and worker script under Bun, with
  a 12 ms inter-frame gap standing in for render time.
- **Controls:**
  - the same seed with no executor
  - an executor that is always late
  - an executor that is late on every third frame
  - worlds at or below 2,000 organisms
- **Falsifiers** (`tests/social-field.test.ts`):
  - any executor schedule that changes a seeded position bit
  - a corrupted executor whose world does _not_ change
  - any range split that changes a kernel answer
  - a bounded scan that reads more than its budget
  - an unbounded scan that differs from brute force
  - a world at or below 2,000 organisms that touches the field
- **Pinned provenance:** base `e590f8c4`. Measurements are from a 4-vCPU container with 3 worker
  cores.

### Measured (4-vCPU container, main-thread `EntityManager.update`, median)

| Organisms | Base (1 core, unbounded) | Bounded field, 1 core |         Bounded field + 3 worker cores |
| --------: | -----------------------: | --------------------: | -------------------------------------: |
|     5,000 |                 ≈ 30 ms¹ |              25–27 ms | 11–13 ms (answered 84–88 of 90 frames) |
|    10,000 |                ≈ 133 ms¹ |              47–55 ms |                 22–26 ms (84–88 of 90) |
|    25,000 |                ≈ 865 ms¹ |            128–150 ms |                    73–88 ms (88 of 90) |

¹ The base column was measured with the earlier probe, which also timed `InstancedEntityRenderer.sync`
(≈ 1–11 ms). The two frames not answered by workers in each run are the first two updates, which
always scan locally by construction.

### Negative results retained

- **The kernel is branch-bound.** It takes about 20 ms per 10k organisms on one core.
  - Cell-order traversal gave no gain.
  - Hoisting the budget gave no gain.
  - A stripped kernel (nearest-only) takes about 9 ms, so the remaining cost is the
    neighbourhood statistics themselves.
- **A one-update pipeline failed at 25k.**
  - Workers answered 0 of 90 frames.
  - Worker replies are delivered only when the main thread yields, so a busy update could never
    see them.
  - This is why the pipeline is two updates deep.
- **Copying is not free.** The structured-clone copy costs measurable main-thread time at 25k.
  Phase 2 exists to remove it.
- **The browser proof is narrow.** In real Chromium under software WebGL, the worker bundle loaded
  and answered the field within three updates. Frame rates on GPU hardware were not measured in
  this environment.
- **Social semantics changed above 2,000.**
  - Statistics are sampled, at most 64 candidates.
  - They come from a two-update-old snapshot rather than live in-order reads.
  - This is a deliberate model change at scale, not a refactor. It is disclosed in the CHANGELOG.

## Expansion plan (next; nothing below is implemented)

Each item rides in the same snapshot, so it scales across cores like the social field. Each one
must read and write another system (PHILOSOPHY), and each names its falsifier before any code.

1. **Environmental field layer**

   - **Axes:** `environmental_coupling`, `resource_maintenance`
   - **Mechanism:** a per-cell nutrient / light / chemical-trail grid packed beside the social
     grid. Organisms deposit into it and are steered and fed by it.
   - **Falsifier:** freezing the field leaves seeded trajectories and energy budgets unchanged. If
     that happens, the field is decorative.

2. **Signals between organisms**

   - **Axis:** `social_communication`
   - **Mechanism:** each organism emits a small signal vector. The kernel aggregates what each
     organism hears from kin and from rivals, and that input enters its brain percept.
   - **Falsifier:** shuffling signals across organisms does not change behaviour.

3. **Homeostatic regulation**

   - **Axis:** `homeostasis`
   - **Mechanism:** a regulated internal variable couples energy, the field, and behaviour
     choice.
   - **Falsifier:** clamping the variable has no effect on survival or behaviour.

4. **Scale**

   - **Axis:** `visual_embodied_scale`
   - **Mechanism:** raise tier targets only after measuring p95 frame time on real GPU hardware.
   - **Falsifier:** p95 at the new target exceeds the tier's frame budget.

## Consequences

- Organism counts that cost 135–880 ms of main-thread time per frame now cost 22–88 ms on four
  vCPUs. On hardware with more cores the worker share grows, up to the 8-core cap.
- Every future parallel or GPU kernel must follow the same contract: a pure function of a frame
  snapshot, with a main-thread fallback that gives identical answers.
- The two-slot snapshot is the integration point for phases 2–4.
