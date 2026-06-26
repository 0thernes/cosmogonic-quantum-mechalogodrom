<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0010 — Worker offload + streamed "Hybrid world" for scaling

- Status: Accepted
- Date: 2026-06-20
- Governs: Scaling roadmap Stages 3–5 (`docs/SCALING-ROADMAP-2026-06-26.md`)

## Context

The single hard scaling bottleneck is the **one JavaScript thread**: neighbour queries +
per-creature brains + behaviours for up to 50,000 agents all run on it. The quality tier
auto-selects `mega` on a ≥16-core box, but the sim can only use **one** core — so the
hardware that _qualifies_ for 50k cannot _run_ it smoothly. Stage 0 made it crash-proof
(spawn-budget + the render governor), not fast.

Two facts collide:

- **The determinism law (ADR 0004):** one 32-bit seed → a bit-identical universe, enforced
  by a 300-frame golden + the feature-determinism tests; `Math.random`/`Date.now` are banned
  in sim logic. This is the project's identity (the "receipts" discipline).
- **Web Workers are asynchronous.** The sim is **synchronous and fully computed every tick**.
  Naively moving a hot path to a worker either (a) blocks on the round-trip each frame
  (slower than doing it inline — pointless), or (b) pipelines with a 1-frame lag, which
  **changes the golden** (the universe at frame N is no longer bit-identical). So you cannot
  move the deterministic hot path onto a worker without losing determinism.

The owner decided the determinism fork (2026-06-20): **Hybrid** — a deterministic preserve
core + a streamed best-effort wilderness.

## Decision

**The Hybrid split IS the worker boundary.** Workers are never on the deterministic critical
path; they run the wilderness, which is explicitly outside the golden.

1. **Deterministic CORE — main thread, synchronous, in the golden.** The preserve-core
   population + the apex Archon minds stay on the main thread, computed bit-exact each tick
   from the seed. The determinism golden covers ONLY the core. Nothing about adding workers
   may change the core's rng stream or call order.

2. **Best-effort WILDERNESS — worker threads, async, NOT in the golden.** An additively-introduced
   population that:
   - runs its own seeded (but non-golden) loop off-thread on the idle cores;
   - is **camera-streamed** — chunks load/unload by distance (this is where the world finally
     GROWS, i.e. Stage 2's deferred "bigger world", safely);
   - renders via instanced pools updated from worker snapshots, where a **1-frame lag is fine**
     (wilderness is ambient/decorative, not reproducible-by-contract);
   - is **strictly one-way**: the core may seed/spawn INTO the wilderness; the wilderness
     **never** writes back any value the golden reads.

3. **Offload harness contract.** A generic offload utility with:
   - a **SYNC executor** (default — used by anything determinism-bound, and the universal
     fallback when Workers/SharedArrayBuffer are unavailable: graceful degradation to a
     smaller-but-correct world);
   - an **ASYNC worker executor** (wilderness only);
   - a **typed message protocol** using transferable `Float32Array` buffers for
     positions/colours (no per-frame structured-clone of objects);
   - **SharedArrayBuffer** for zero-copy where cross-origin isolation (COOP/COEP) allows,
     else `postMessage` with transfer.

4. **Determinism-preservation rules (binding).**
   - No worker result feeds any value the golden reads.
   - The core rng stream + call order are byte-identical whether or not workers exist
     (wilderness off / absent ⇒ goldens unchanged — the same guard pattern as the
     ultra-tier spawn budget and theory-stagger).
   - The wilderness uses its OWN substreams (`mulberry32(hashSeed('wilderness:' + chunkId) ^ seed)`),
     so it is reproducible-ish per chunk but explicitly excluded from the global golden.
   - Tests: existing goldens MUST stay green untouched; a new test asserts the harness's SYNC
     path is deterministic and matches the worker kernel's pure output.

## Consequences

**Positive**

- Uses the idle ~23 cores (wilderness on workers) → smooth at scale; the path toward 100k.
- The determinism superpower is **preserved for the core** — the receipts/science identity intact.
- The world can grow arbitrarily (wilderness chunks) without re-baselining the core golden.
- Graceful degradation: no Workers / no SAB ⇒ everything runs sync on main (smaller, correct).

**Negative / accepted risks**

- Two sim paths (sync core + async wilderness) is more complexity; the one-way boundary must
  be policed (a lint/test that no wilderness output flows into core/golden state).
- The wilderness is only loosely reproducible (per-chunk seeded), not one global golden.
  Accepted — that is the Hybrid trade the owner chose.
- Cross-engine float determinism is not guaranteed in workers; irrelevant for the wilderness
  (non-golden) and must never leak to the core.
- SharedArrayBuffer needs COOP/COEP headers (cross-origin isolation), which may require
  server/Pages header config; the harness falls back to transferables if unavailable.
- Implementation is **multi-push**, each its own gate-green commit (see below).

## Implementation plan (this ADR governs Stages 3–5)

- **3a** — offload harness: sync executor + worker executor + typed protocol + fallback;
  tested via the sync path. _(next push)_
- **3b** — a minimal wilderness population simulated on a worker, rendered from snapshots
  (1-frame lag), strictly one-way; goldens untouched.
- **3c** — camera-streamed chunks: the world grows (load near / freeze far).
- **5** — move the wilderness kernels to WebGPU compute for 100k–1M.

See also: ADR 0004 (deterministic RNG), ADR 0002 (three.js rendering), `docs/SCALING-ROADMAP-2026-06-26.md`.
