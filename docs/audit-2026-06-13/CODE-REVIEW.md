# Cosmogonic Quantum Mechalogodrom — Full Code Review

**Audit date:** 2026-06-13 **Version:** 0.9.0 **Scope:** full source tree (`src/`, `server.ts`, `tests/`, CI, docs)

This review is organized by the **12 audit units (subsystems)**. Each unit opens with a one-paragraph
health note and a quality score, followed by a **severity-sorted findings table**
(`Severity · Category · File:line · Issue · Fix`). Medium and low/info findings are included
exhaustively. A final cross-subsystem **Top Correctness Bugs** section collects every item that the
verification pass independently CONFIRMED; each confirmed high/critical carries a ✅ **verified** tag.

> Severity legend: **critical** = exploitable / data-loss now · **high** = correctness/security defect or
> contract breach · **medium** = real but bounded · **low** = latent/cosmetic · **info** = note / positive
> observation.

---

## Subsystem scorecard

| #   | Unit                                  |   Quality   | Headline risk                                       |
| --- | ------------------------------------- | :---------: | --------------------------------------------------- |
| 1   | core-spine (engine core & world loop) |   4.3 / 5   | `timeScale` defeats the dt clamp at high speed      |
| 2   | math-determinism                      |   4.7 / 5   | Clean; only latent bit-mask / hash-key traps        |
| 3   | entities-genetics                     |   4.0 / 5   | V9 genome/lineage built but wired into nothing      |
| 4   | macro-agents                          |   4.0 / 5   | Faction AI + brains.ts orphaned (PHILOSOPHY rule 4) |
| 5   | environment-cosmology                 |   4.0 / 5   | RD stability proof is numerically wrong             |
| 6   | mind-quantum-analytics                |     n/a     | GraphMind runs on a half-resolution graph           |
| 7   | render-bridge                         |   4.3 / 5   | War-network opacity double-applied; stale buffers   |
| 8   | ui-observatory                        |   4.3 / 5   | Sparkline lacks NaN guard; heavy draw duplication   |
| 9   | ui-shell                              |   4.5 / 5   | Copilot fetch has no timeout; minor contract drift  |
| 10  | audio engine & synthesis              |   4.3 / 5   | Leaked ambient interval; doc/constant drift         |
| 11  | **server-io**                         | **3.5 / 5** | **Sandbox escapes + key exfiltration + no tests**   |
| 12  | markup-styles                         |   4.3 / 5   | Pinch-zoom disabled (WCAG 1.4.4); missing web fonts |

**server-io is the lowest-scoring and highest-risk unit** and dominates the Top Correctness Bugs list
below: a `.env.local` read leaks every LLM API key, `find -delete` is an allowed write primitive,
`git grep` option-injection is an RCE path, and none of it has a single test.

---

## 1 · core-spine — Engine core & world loop **(4.3 / 5)**

**Health.** A very clean composition root. `world.step()` (`src/world.ts:409`) is disciplined: seeded
RNG only, no `Date.now`, an explicit `[0, 50ms]` dt clamp, cadence-gated heavy systems, and good
context-loss resilience in the engine. The one **real bug** is structural rather than cosmetic — the
`timeScale` multiply lands on the _wrong side_ of the protective clamp, so fast-forward integrates steps
up to 5× larger than the clamp was designed to permit. Everything else here is latent or cosmetic.

| Severity | Category     | File:line                   | Issue                                                                                                                                                                                                                                                                                    | Fix                                                                                                                                                                                                                               |
| -------- | ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **high** | correctness  | `src/world.ts:413`          | `const dt = Math.min(Math.max(rawDt,0),0.05) * s.timeScale` — `timeScale` (2/3/5) multiplies **after** the 50 ms clamp, so integrated dt reaches 0.10/0.15/0.25 s, defeating the guard for velocity, containment, auto-split, RD. A frame hitch at high speed produces an outsized jump. | Decide semantics explicitly: sub-step (`steps = ceil(clampedRaw*timeScale/0.05)`, loop `dt/steps`) for a true accelerant, **or** clamp after multiply to keep within the safe envelope. Pin which the determinism golden expects. |
| medium   | correctness  | `src/core/engine.ts:58, 96` | Camera `aspect = w/h` with no height floor → `NaN`/`Infinity` when `innerHeight===0`, poisoning `updateProjectionMatrix()` (blank scene / GL warnings until next non-zero resize).                                                                                                       | Clamp once: `const h = Math.max(1, innerHeight); const w = Math.max(1, innerWidth)`; reuse for `aspect` and `setSize` in both constructor and `onResize`.                                                                         |
| medium   | correctness  | `src/main.ts:57-62`         | `frame()` calls `world.step()` with no try/catch; one throwing system silently kills the rAF loop or floods identical uncaught exceptions — no telemetry, no degradation path.                                                                                                           | Wrap in try/catch: rate-limited `log.error`/`audit.record('frame-error')`, cancel after N consecutive failures. Mirror the engine's existing `isContextLost()` resilience at the loop level.                                      |
| medium   | architecture | `src/sim/entities.ts:82`    | `EntityManager.list` exposes the raw backing array as the canonical read path; the population-array invariant is convention-only across ~30 reader sites.                                                                                                                                | Expose `get list(): readonly Entity[]` over a private array (or length + indexed accessor). Existing readers only index/iterate, so source-compatible.                                                                            |
| low      | architecture | `src/world.ts:870`          | `snapshot()` calls `hud.setLore()` as a side effect inside a "refill" method called >1×/frame, muddying the data/presentation boundary.                                                                                                                                                  | Move `setLore(sn.lore)` to the telemetry cadence block in `step()` (next to `panel.update`) so `snapshot()` stays a pure refill.                                                                                                  |
| low      | correctness  | `src/core/engine.ts:71-84`  | Context-restore handler re-reads window dims but `onResize` isn't guarded against running during loss — redundant GL state calls on a lost context.                                                                                                                                      | Guard `onResize` with `if (this.contextLost) return;` (restore handler recovers size).                                                                                                                                            |
| low      | correctness  | `src/world.ts:392-394`      | `bootPopulation()` floor of 300 can exceed a hypothetically small tier's `maxEntities` (benign today — `spawn()` returns null at cap).                                                                                                                                                   | Clamp to ceiling: `Math.min(maxEntities, Math.max(300, round(targetEntities*0.3)))`.                                                                                                                                              |
| low      | correctness  | `src/world.ts:604-625`      | Manual Euler accumulation on `camera.rotation` in free mode risks gimbal lock / roll near straight up-down. Cosmetic; camera writes no sim state.                                                                                                                                        | Clamp pitch to ±~85° or use quaternion deltas. Low priority given faithful-port intent — documenting suffices.                                                                                                                    |
| low      | correctness  | `src/world.ts:796-805`      | RUN-ALL `allModeCursor` advances even on rejected/no-op proposals, biasing field round-robin contribution. Determinism unaffected.                                                                                                                                                       | Advance the cursor only on accepted swaps, or iterate a fixed field per batch index; else document the proposal-hit-rate weighting.                                                                                               |
| info     | determinism  | `src/memory/store.ts:164`   | `store.defaults()` seed entropy degrades after ~35 min uptime (int32 truncation of sub-ms); two far-apart fresh boots could collide more than full int32 would. Determinism itself intact.                                                                                               | Mix a uint32 without truncation: `((0xc05a06 ^ Math.floor(performance.now()*1000)) >>> 0)`. Cosmetic.                                                                                                                             |

---

## 2 · math-determinism **(4.7 / 5)**

**Health.** The strongest unit in the codebase — the math/RNG kernel is pure, well-documented, and
correctly refuses to sanitize NaN at the primitive layer (containment is the sim's job, and a dedicated
`nan-stability.test.ts` exists). Every finding here is a **latent trap or a positive observation**, not a
live bug: a bit-mask that disagrees with its own documented invariant for window ≥ 32, an undocumented
spatial-hash collision bound, and unclamped share inputs to the replicator. None fire under any shipped
configuration.

| Severity | Category    | File:line                         | Issue                                                                                                                                                                                                                               | Fix                                                                                                                                         |
| -------- | ----------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --- | ------------------------------------------------------------------- | ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------- |
| medium   | correctness | `src/math/spatial-hash.ts:56, 84` | Cell key `kx*10007 + kz` is collision-free only inside the contracted arena (`                                                                                                                                                      | kz                                                                                                                                          | ≤ ~75`today). A future arena expansion or sub-unit cell size past` | kz  | ~5003`silently aliases far cells; a`NaN` position dumps into key 0. | Document the invariant in JSDoc (`collision-free while | cellZ | < 5003`); optionally a dev-only assert or NaN guard at insert. No runtime change for the current arena. |
| low      | correctness | `src/math/games.ts:111-114`       | `defections()` can integer-overflow its bitmask for `window ≥ 32`, contradicting the module's own documented `window ≤ 30` invariant that `pushHistory` enforces but this does not. No live bug (all callers use default window 8). | Apply the same clamp: `const w = window < 30 ? window : 30`; or factor a shared `clampWindow()`. Pure, O(1), no behavior change at default. |
| low      | correctness | `src/math/games.ts:228-232`       | `replicatorStep` computes mean fitness from **unclamped** incoming shares; it seals non-finite _fitness_ but not bad _shares_ — asymmetric robustness. No live bug (sole producer keeps a valid simplex).                           | Clamp in the mean loop: `const x = (shares[i] ?? 0) > 0 ? shares[i] : 0`; reuse in the update loop. O(n), allocation-free.                  |
| info     | correctness | `src/math/quantum.ts:225-244`     | `measure()` fall-back to most-probable state cannot disagree harmfully with the CDF path — a measurement never lands on a ~0-probability basis state. Good design; the dual-purpose `chosen`/`picked` var is just subtle to read.   | No change. Optional: rename `bestIdx`/`cdfIdx` and `return picked >= 0 ? picked : bestIdx`.                                                 |
| info     | dx          | `src/math/heap.ts:157-173`        | `selectTopK` returns heap order, not ranked order — correct per contract (consumer needs the top-K _set_), but a footgun for a future ranked consumer.                                                                              | No change. Optionally offer a `selectTopKSorted` convenience.                                                                               |
| info     | correctness | `src/math/scalar.ts:13-20`        | `lerp`/`clamp` do not guard NaN — **intentional**; sanitizing here would hide the divergences `nan-stability.test.ts` is meant to catch.                                                                                            | No change. Correct separation of concerns.                                                                                                  |
| info     | correctness | `src/math/rng.ts:18-19`           | `mulberry32` coerces non-integer/out-of-range seeds via `>>> 0` with no validation (`NaN >>> 0 === 0`). Harmless — contract only promises uint32, and no caller passes NaN.                                                         | No change.                                                                                                                                  |

---

## 3 · entities-genetics **(4.0 / 5)**

**Health.** The entity manager and morphotype machinery are solid, but this unit carries the audit's
clearest **contract breach**: the entire V9 genetics subsystem (`genome.ts`, `lineage.ts`) is built and
tested yet wired into nothing — offspring inherit no genome. A second `RENDER_MODE_DYN` gap leaves two
documented dynamic fields inert. Both are doc-vs-code drift the "contract wins" rule exists to catch.

| Severity | Category | File:line                                                  | Issue                                                                                                                                                                                  | Fix                                                                                                                                                                                           |
| -------- | -------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **high** | contract | `src/sim/genome.ts` (consumer site `src/world.ts:250-268`) | The V9 genome + lineage modules are **orphaned**: fully built and tested, wired into nothing. Offspring inherit nothing; the documented genetics era is non-functional in the product. | Wire per the V9 contract (assign genome at spawn from the seeded stream, inherit on split), **or** record the deferral explicitly in MODULE-CONTRACTS / ROADMAP so the orphan is intentional. |
| medium   | contract | `src/sim/entities.ts:285, 385`                             | `RENDER_MODE_DYN` `vision` and `social` fields are inert — mode changes leave perception radius and social pull unchanged, contradicting the `F-RENDER-DYN` comments.                  | Thread `vision`/`social` into behaviors, or delete the fields and the comments that promise them.                                                                                             |

_(Cross-unit note: `EntityManager.onDeath` signature drift and the `disposeAt` O(n) shift are tracked under
units 11/architecture and the performance review respectively.)_

---

## 4 · macro-agents **(4.0 / 5)**

**Health.** Constellations, leviathans, and the puppet/herald layer are well-built, but this unit holds
the second major **PHILOSOPHY rule-4 violation**: the faction AI (`factions.ts`) and its pre-transformer
toolbox (`ai/brains.ts`) read nothing live and write nothing live — an orphaned trophy shelf the manifesto
explicitly forbids, while `AI-SUBSYSTEM.md` describes it in the present tense. The remaining items are a
lighting calibration miss and dead-export hygiene.

| Severity | Category     | File:line                                                                                    | Issue                                                                                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                                  |
| -------- | ------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **high** | architecture | `src/sim/factions.ts:217` (`decideFaction`); `src/world.ts:52-67, 269-320`; `src/main.ts:14` | Faction AI + `brains.ts` are implemented and tested but **never wired into the running world** — no live read, no live write. The documented faction→steering feedback into the 10k organisms does not exist; the doc overstates completion. Determinism unaffected (nothing draws from the stream). | Wire per V9 (assign `userData.faction` at spawn from the seeded stream, call `decideFaction` in update, map Intent → steering nudge on the golden test's cadence), **or** mark the integration PENDING in `AI-SUBSYSTEM.md` and add a tracking note. |
| medium   | correctness  | `src/sim/leviathans.ts:79`                                                                   | Leviathan aura `PointLight` omits the `decay=0` 4th arg every other light sets, so it attenuates `1/r²` across 225 units and reads near-invisible at scenery scale. Purely visual.                                                                                                                   | `new THREE.PointLight(color, 0, 90*ARENA_MID, 0)` to match the `LEGACY_LIGHT_GAIN`/`POINT_LIGHT_GAIN` non-physical-falloff convention.                                                                                                               |
| medium   | architecture | `src/sim/ai/brains.ts:44, 192, 267`                                                          | `softmaxPick`, `goapPlan`, `MemoryRing` are exported but consumed by no production module; `goapPlan` allocates fresh `Map`/`Set`/array per call despite a JSDoc claiming reused scratch. Dead surface drifts uncovered.                                                                             | Wire ≥1 consumer (Heralds GOAP path, agent `MemoryRing`) once factions integrate, **or** annotate them as reserved primitives in one place and correct `goapPlan`'s JSDoc.                                                                           |
| info     | type-safety  | `src/sim/factions.ts:182-183, 282-288`                                                       | `decideFaction` is documented "pure" but mutates module-level scratch (`DEVOURER_HIDDEN`/`DEVOURER_OUT`) — non-reentrant. Safe in single-threaded JS; the "pure" phrasing overstates.                                                                                                                | Soften JSDoc to "deterministic and allocation-free via module scratch (not reentrant)".                                                                                                                                                              |
| info     | correctness  | `src/sim/constellations.ts:179-183`                                                          | `subSectorAt` keeps a stale warm-start cell when `delaunay.find` returns -1 — unreachable with the fixed 24 sites; the fallback (last known sector) is benign even if it fired.                                                                                                                      | None required; appropriately defensive.                                                                                                                                                                                                              |

---

## 5 · environment-cosmology **(4.0 / 5)**

**Health.** Rich, physically-motivated systems (reaction-diffusion, atmosphere, singularities, weather,
environment pipes). No live NaN/crash anywhere — the `[0,1]` clamps and deterministic draw counts hold.
The standout is a **numerically wrong stability proof** in the AURORA RD path: the boundedness still holds
_because of the clamp_, but the proof uses the wrong kernel weight, so a maintainer "optimizing away" the
clamp on the proof's authority would get a diverging field. The rest are sky-dome cache thrash, documented
physics asymmetries, and contract/doc drift.

| Severity | Category    | File:line                                         | Issue                                                                                                                                                                                                                                                                               | Fix                                                                                                                                           |
| -------- | ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| medium   | correctness | `src/sim/reaction-diffusion.ts:26-28, 64-69, 213` | The AURORA RD stability proof uses kernel weight 1.6 (real orthogonal-flip eigenvalue is −2.0); the rejection of the 1.5 boost uses the same wrong arithmetic, and 1.2 already crosses the divergence threshold. Boundedness survives only via the `[0,1]` clamp, not the claimed ` | factor                                                                                                                                        | <1`.                   | Recompute with the actual eigenvalue; either lower `AURORA_DIFFUSION_BOOST` so the unclamped scheme is stable, or rewrite the JSDoc to state stability relies on the clamp. Add a 500-step checkerboard finiteness test. |
| medium   | performance | `src/sim/atmosphere.ts:316-319, 357-363`          | Sky-dome re-bake cache keyed on `Math.round(chaos)` thrashes (re-bakes every frame) when chaos sits near a half-integer — exactly the ENTROPY/BREAK-FREE regime. Contradicts the "cheap every frame" guarantee.                                                                     | Add hysteresis: re-bake only when `                                                                                                           | chaos - lastBakedChaos | > 0.5`; store the float, not the rounded bucket.                                                                                                                                                                         |
| low      | contract    | `src/sim/environment.ts:438-440, 681-699`         | Module now owns `groundMaterial` coupling, `setAudioBass`, and `attachGroundEmissiveMap` not listed in MODULE-CONTRACTS — understated public surface.                                                                                                                               | Add `setAudioBass(b)` and `attachGroundEmissiveMap(tex)` to the `§environment.ts` contract block with V2 cross-refs.                          |
| low      | correctness | `src/sim/singularities.ts:172, 244-261`           | ENTROPY pushes colossi outward in `bodyForce` but `applyEntropy` applies no radial force to organisms — an undocumented, counter-intuitive physics split. Internally intentional but uncalled-out.                                                                                  | Drop the entropy radial term for bodies, **or** add a matching organism nudge, **or** add a one-line comment noting the deliberate asymmetry. |
| low      | correctness | `src/sim/singularities.ts:168-170, 227-234`       | Greyhole `bodyForce` sign is a fixed average (0.6), ignoring the absorb/emit pulse organisms feel — colossi never experience the signature pulse the contract describes.                                                                                                            | Key `bodyForce` sign off the same `sin(t*1.3)` phase as `update()`, or document the time-averaged choice.                                     |
| low      | correctness | `src/sim/atmosphere.ts:355-363`                   | The live per-frame `chaosNorm` passed to the gated `bakeDome` can be skipped by the integer-bucket gate it was meant for — coupling is simultaneously too coarse (within a bucket) and too eager (at a boundary).                                                                   | Same fix as the thrash finding: float dead-band on chaos.                                                                                     |
| info     | docs        | `src/sim/weather.ts:110-117`                      | STORM flash comment overstates "two flashes"; behavior (deterministic spikes from two incommensurate generators) is correct/desirable.                                                                                                                                              | Reword to "two independent flash generators at incommensurate rates".                                                                         |
| info     | determinism | `src/sim/reaction-diffusion.ts:280-283`           | `perturb()` draws rng() per disk cell even when discarded — parity-stable (count is a deterministic fn of inputs, pinned by tests) but advances the shared stream more than needed.                                                                                                 | No change (would break pinned tests); documented as intentional: 2 draws per in-disk cell.                                                    |
| info     | dx          | `src/sim/environment.ts:405-408, 620`             | `buildPipe` wraps packet `t` at init even though per-frame update re-wraps — comment over-justifies as legacy crash-avoidance.                                                                                                                                                      | Keep the wrap (correct first-frame position) but trim the comment.                                                                            |
| info     | correctness | `src/sim/atmosphere.ts:429-435`                   | Aurora curtain opacity lerp can leave `opacity` in `(0, 0.001]` with `visible=false` — no artifact, but a future reader of `opacity` without the `visible` check sees stale nonzero.                                                                                                | Snap to exact 0 at the threshold before hiding.                                                                                               |

---

## 6 · mind-quantum-analytics _(score n/a)_

**Health.** The connectome / GraphMind / quantum-circuit / analytics cluster is ambitious and mostly
correct, but it has one **high-severity correctness defect**: GraphMind sentience runs on a _half-
resolution_ graph because the connectome anchor loop strides by two (`ni += 2`), so odd-indexed entities
are never used as analytical anchors. A determinism reliance on object-key enumeration order compounds the
risk. The remainder are minor coloring, dead-code, progress-proxy, and test-coverage gaps.

| Severity | Category     | File:line                   | Issue                                                                                                                                                                                                          | Fix                                                                                                                                  |
| -------- | ------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **high** | correctness  | `src/sim/connectome.ts:185` | The anchor loop `for (let ni = 0; ... ; ni += 2)` strides by two, so GraphMind runs on a half-resolution subgraph — odd-indexed organisms never anchor analytical pairs; "sentience" sees half the population. | Emit analytical pairs for **all** indices in a separate loop, or document the even-anchored subgraph and caveat the sentience claim. |
| medium   | determinism  | `src/sim/graph-mind.ts:117` | GraphMind leans on object integer-key enumeration order for determinism — fragile (insertion-order vs numeric-order edge cases).                                                                               | Iterate the entity index space checking `hasNode`, or numerically sort keys first.                                                   |
| low      | correctness  | `src/sim/connectome.ts:219` | Tribe hue uses only the first endpoint's community, so mixed-community segments mis-color.                                                                                                                     | Color each segment vertex by its own endpoint community.                                                                             |
| low      | architecture | `src/sim/artifacts.ts:162`  | `ArtifactField.influenceAt` is dead — the system reads but never writes, failing PHILOSOPHY's read-and-write rule.                                                                                             | Wire `influenceAt` into a consumer, or document the field as a visual-only exception.                                                |
| low      | correctness  | `src/sim/algorithms.ts:309` | PATIENCE BUCKET has no fixpoint, so the picker's progress-bar proxy never completes.                                                                                                                           | Show a churn indicator for perpetual fields instead of a progress bar.                                                               |
| low      | testing      | `src/sim/qcircuit.ts:1`     | No dedicated tests for the connectome update or the quantum-circuit gates.                                                                                                                                     | Add qcircuit event/cadence tests and a connectome activation-saturation test.                                                        |
| info     | architecture | `src/sim/connectome.ts:214` | The activation pump depends on a decay constant owned by another module (entities).                                                                                                                            | Cross-reference the activation cap from the entities decay site.                                                                     |
| info     | dx           | `src/sim/qcircuit.ts:148`   | Quantum-circuit `bands` return is discarded on refresh and relies on buffer aliasing.                                                                                                                          | Split into a void refresh + accessor, or test that register evolution changes the cloud refresh.                                     |
| info     | correctness  | `src/sim/analytics.ts:211`  | Omen lore name is keyed by event ordinal, not identity.                                                                                                                                                        | None required; key off a content hash if a stable per-event name is wanted.                                                          |

---

## 7 · render-bridge **(4.3 / 5)**

**Health.** `viz3d.ts` (the war-panel / obelisk / network bridge) is correct as rendered — `setDrawRange`
is honored, so nothing draws wrong today — but it leans heavily on undocumented invariants that would
silently break on a tuning change. The two findings worth acting on: the phone tier silently drops phyla
5-9, and war-network opacity is **double-applied** (per-vertex color _and_ material opacity), so a link's
brightness depends on unrelated global war state.

| Severity | Category     | File:line                            | Issue                                                                                                                                                                                                                  | Fix                                                                                                                                                              |
| -------- | ------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| medium   | correctness  | `src/sim/viz3d.ts:247, 256, 294-298` | `lowDetail` builds `PHYLA/2` towers but hue and count still key on `PHYLA`, so the phone tier silently shows only phyla 0-4 — an undocumented data-completeness loss with an asymmetric divisor.                       | Map phone tower `i → round(i*PHYLA/towerCount)` for **both** hue and counts, or document "first 5 phyla only". Make divisor and index consistent.                |
| medium   | correctness  | `src/sim/viz3d.ts:369-374, 385`      | War-network opacity is baked into per-vertex color **and** set as material opacity (`maxOpacity`), so link brightness tracks the global max relation that frame — alliance links flicker as unrelated wars start/stop. | Pick one channel: bake `op` into vertex color and set `netMat.opacity` to a constant. (`LineBasicMaterial` has no per-vertex alpha, so vertex-color carries op.) |
| low      | correctness  | `src/sim/viz3d.ts:377-387`           | War-network position/color buffers are never cleared when the visible segment count shrinks; stale tail lingers (safe only while `drawRange` is honored).                                                              | Document that bytes past `w*6` are intentionally stale (drawRange authoritative), or zero the freed tail when `w < lastW`.                                       |
| low      | correctness  | `src/sim/viz3d.ts:325, 364-368`      | War-network endpoint Y uses obelisk height `h` whose "top == h" coupling is load-bearing but undocumented; a geometry-anchor change silently detaches endpoints, untested.                                             | Comment that `a.h` is the obelisk top in root-local coords; optionally a named `obeliskTopY(ob)` helper.                                                         |
| low      | type-safety  | `src/sim/viz3d.ts:298`               | Redundant `raw !== undefined` after `Number.isFinite(raw)` (always true).                                                                                                                                              | Drop `&& raw !== undefined`.                                                                                                                                     |
| low      | correctness  | `src/sim/viz3d.ts:329`               | Obelisk war-red hue uses a linear lerp on the raw hue scalar, not the shortest arc, so high-index titans flash through unrelated hues en route to red.                                                                 | Interpolate on the shortest hue arc, or document.                                                                                                                |
| low      | architecture | `src/sim/viz3d.ts:175-212, 248, 268` | No `dispose()`/teardown — 30+ materials, shared geometries, and the net geometry never released (zero leak in the single-lifetime app).                                                                                | Add `dispose()` for the shared geos + per-mesh materials + `netMat`; call from world teardown.                                                                   |
| low      | testing      | `src/sim/viz3d.ts:325`               | `SMOOTH*NET_CADENCE*0.5` obelisk ease is an unguarded magic composite that must stay `<1`, with no easing test.                                                                                                        | Name it `OBELISK_SMOOTH` or clamp `Math.min(0.95, …)`; add a monotonic-ease assertion.                                                                           |
| info     | type-safety  | `src/sim/viz3d.ts:320, 328`          | `warN` divides by `(TITANS-1)` unguarded — safe only because `TITANS` is a fixed const 10.                                                                                                                             | Guard `warN = TITANS>1 ? war/(TITANS-1) : 0` if `TITANS` becomes configurable.                                                                                   |
| info     | type-safety  | `src/sim/viz3d.ts:349-350`           | Dead `?? 0` fallbacks on `Uint8Array` pair-index reads (typed number, in-range by loop bound).                                                                                                                         | Drop the `?? 0`.                                                                                                                                                 |
| info     | architecture | `src/sim/viz3d.ts:43-47`             | `PANEL_Y=220` hardcodes clearance over a "~90u titan roam ceiling" it cannot see change.                                                                                                                               | Derive from a `TITAN_ROAM_CEILING` const or cite it in the comment.                                                                                              |

---

## 8 · ui-observatory **(4.3 / 5)**

**Health.** A genuinely impressive, property-tested charting layer. The one functional gap: the older
`Sparkline.push()` does **not** uphold the NaN-safety its sibling `SeriesRing` advertises, so a single
poisoned telemetry sample breaks a chart until it scrolls out. Everything else is normalization-floor
amplification, palette-source mislabeling, and heavy (but correct) draw-loop duplication.

| Severity | Category      | File:line                                                                     | Issue                                                                                                                                                                                                | Fix                                                                                                                  |
| -------- | ------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| medium   | correctness   | `src/ui/graphs.ts:58-66, 87-107`                                              | `Sparkline.push()` has no NaN/Infinity guard; a transient bad sample (entities/chaos/energy/links) renders a broken/blank line for the 100-sample window. Contract advertises NaN-safe ring buffers. | Coerce in `push()` like `SeriesRing`: `this.buf[...] = Number.isFinite(v) ? v : 0`.                                  |
| low      | correctness   | `src/ui/graphs.ts:50`                                                         | Sparkline area-fill color derived by brittle `replace('1)', '0.08)')`; works only because all call sites end `,1)`, else silent opaque flood.                                                        | Parse rgba channels explicitly, or accept a separate fill-alpha param.                                               |
| low      | architecture  | `src/ui/observatory.ts:690-783`                                               | The read-only HUD writes no sim system back — a PHILOSOPHY "reads AND writes" deviation left implicit.                                                                                               | Document the HUD layer (observatory/graphs/hud/panels) as exempt, or surface a derived signal back to the world.     |
| low      | accessibility | `src/ui/observatory.ts:1192-1200, 918-948`                                    | `drawWarGrid` legend swatches ignore per-state war alphas, so truce/war/ally read full-opacity in the key but dimmed in the grid.                                                                    | Pass per-entry alpha into `legend()` (or pre-multiply the swatch).                                                   |
| low      | correctness   | `src/ui/observatory.ts:1631-1648, 1820-1856, 1221-1228`                       | Phase-portrait / multiples normalization divides by an `1e-6`-floored range that magnifies sub-unit noise into full-scale, clip-out excursions (canvas clips, no crash).                             | Floor the per-series scale to `max(hi, 1)` for integer population data, or clamp the normalized fraction to `[0,1]`. |
| low      | architecture  | `src/ui/observatory.ts:1027-1083, 1106-1147, 1314-1379, 1469-1502, 1960-2002` | The index/clamp/x-map normalization logic is duplicated ~15×; any downsampling change must touch all sites.                                                                                          | Extract `strokeSeries(ring, s, n, stride, w, mapY)`; `envLine`/`fluxArea` already hint at it.                        |
| info     | architecture  | `src/ui/observatory.ts:663, 668`                                              | `warColors` and `warStackColors` are identical literals — duplicated palette state.                                                                                                                  | Collapse to one field, or comment the intent to diverge.                                                             |
| info     | correctness   | `src/ui/observatory.ts:779-782`                                               | Recursive priming push assumes the snapshot is re-consumable (index-stable across two synchronous reads) — a latent coupling the type doesn't enforce.                                               | Tighten the doc/type, or seed the duplicate column from internal scratch.                                            |
| info     | correctness   | `src/ui/observatory.ts:337-348`                                               | `fmtCompact` collapses `[100,1000)` to integers, dropping sub-unit precision (visible decimal jump at 100).                                                                                          | Keep one decimal through 1000 if the cliff is undesirable; else leave (tested).                                      |
| info     | correctness   | `src/ui/observatory.ts:1246-1256`                                             | `drawEnv` legend keys off `statColors` (the page-1 palette) for rd/qH/trend — a future recolor desyncs the env legend.                                                                               | Introduce an explicit `envColors` passed to both `envLine` and the legend.                                           |

---

## 9 · ui-shell **(4.5 / 5)**

**Health.** The cleanest UI unit. The only items with user-facing weight are in the Copilot client —
`Object.values().join` yields `[object Object]`, chat history is unbounded per turn, and the fetch has no
timeout. Everything else is contract/doc drift and missing teardown.

| Severity | Category     | File:line           | Issue                                                                                            | Fix                                                        |
| -------- | ------------ | ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| low      | docs         | `src/ui/panels.ts`  | JSDoc omits the mandatory `etn`/`snt` rows; contract is stale (`v0..v8`).                        | List `v0..v11` plus `etn`/`snt`.                           |
| low      | dx           | `src/ui/copilot.ts` | `Object.values().join` yields `[object Object]` for object values.                               | Use `Object.entries` + `JSON.stringify`.                   |
| low      | performance  | `src/ui/copilot.ts` | Unbounded chat history per turn.                                                                 | Keep a trailing window (~20).                              |
| low      | docs         | `src/docs-page.ts`  | `await mermaid.run()` is unhandled.                                                              | Wrap in try/catch.                                         |
| low      | dx           | `src/ui/copilot.ts` | `fetch('/api/copilot')` has no timeout.                                                          | Add an `AbortController` (~8 s).                           |
| info     | contract     | `src/ui/hud.ts`     | `setAlgo` contract drift (`swapped:boolean` vs `swaps:number`); `setLore` missing from contract. | Fix the contract; add `setLore`.                           |
| info     | type-safety  | `src/ui/input.ts`   | `apocTimer` cast vs `window.setTimeout`.                                                         | Use `window.setTimeout` / `ReturnType<typeof setTimeout>`. |
| info     | architecture | `src/ui/input.ts`   | Input/panel listeners have no teardown.                                                          | Add `dispose()`.                                           |

---

## 10 · Audio engine & synthesis **(4.3 / 5)** _(`src/audio/engine.ts`, `songs.ts`, `analysis.ts`)_

**Health.** A carefully calibrated synth layer. The one real (if benign) bug is a **leaked ambient
`setInterval`** never stored or cleared — harmless for the single world-owned engine, but a hazard the
moment an engine is ever reset/hot-reloaded, and it freezes the "random cadence" at install time.
Remaining items are envelope/clamp invariants that no current palette entry trips, plus doc drift.

| Severity | Category    | File:line                           | Issue                                                                                                                                                                                           | Fix                                                                                                                                        |
| -------- | ----------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| low      | bug         | `src/audio/engine.ts:158-163`       | Ambient auto-SFX `setInterval` is installed but never stored/cleared — one leaked interval + listener per engine; cadence frozen at install (`3500 + rng()*3500`).                              | Store the handle and clear it in `dispose()`, or re-arm via `setTimeout` with a fresh `rng()` delay each fire and keep the id for cleanup. |
| low      | docs        | `src/audio/engine.ts:198-201`       | JSDoc claims the music bus ramps to 0.25 but the code uses `MUSIC_BUS_GAIN = 0.2`.                                                                                                              | Change the `toggleMusic` JSDoc to `{@link MUSIC_BUS_GAIN}` (0.2).                                                                          |
| low      | correctness | `src/audio/engine.ts:354-356`       | Exponential gain release assumes `peak > 0.0008`; floor clamp (0.0005) and release floor (0.0008) are inconsistent, so a tiny-peak spec could invert the envelope. No current palette trips it. | Clamp `peak = Math.max(0.001, spec.peak)`, or derive the release floor as `min(0.0008, peak*0.5)`.                                         |
| low      | type-safety | `src/audio/songs.ts:240-247`        | `bandOf()` silently returns `{start:0,count:1}` for an unknown family name, masking config drift.                                                                                               | Type the param as the literal union and `throw` on unknown family.                                                                         |
| low      | correctness | `src/audio/engine.ts:435-437`       | `cue()` proportional slot mapping can never reach the top voice when `n < count`, biasing field tones flat.                                                                                     | Map across the closed range: `round((i/max(1,n-1))*(count-1))`.                                                                            |
| info     | correctness | `src/audio/engine.ts:365-385`       | FM/LFO depth is clamped against `f0` only (carriers ramp upward) — correct for the current palette; depends on an unasserted `f1==f0` invariant.                                                | Clamp against the min carrier frequency over the ramp if downward sweeps + vibrato ever combine.                                           |
| info     | docs        | `src/audio/engine.ts:1-31, 197-227` | Legacy line-number citations no longer map 1:1 to the current synthesis (provenance drift).                                                                                                     | Add "rescored in V5.2/V7.x" where a method materially diverged.                                                                            |

---

## 11 · server-io **(3.5 / 5 — lowest score, highest risk)**

**Health.** This unit is where the audit's teeth are. The module markets itself as a hard boundary that
holds "even if an attacker fully controls the model," yet it ships **multiple sandbox escapes**: a
`.env.local` read leaks every LLM API key (the secret blocklist matches only the exact basename `.env`,
not the `.env.*` family or case variants); `find` on the ALLOW list grants `find . -delete`; `git grep`
forwards an unguarded pattern that `--open-files-in-pager` turns into RCE; `bun run check`/`bench` write
`dist/` and execute project code; and `runReadOnly` spreads the **entire `process.env`** (keys included)
into every model-controlled subprocess. None of it has a single test. The `/api/chat` and `/api/tool`
routes that drive all this are unauthenticated, unthrottled, and bind to `0.0.0.0` by default. The logging
layer and the (sanctioned) wall-clock usage are clean.

| Severity     | Category     | File:line                                | Issue                                                                                                                                                                                                                    | Fix                                                                                                                                                                                                                                                                                                             |
| ------------ | ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **critical** | security     | `src/server/ai-sandbox.ts:50-61, 39`     | `read_file(".env.local")` leaks **all** LLM API keys — `BLOCKED_PREFIXES` matches the exact top segment `.env` only, missing `.env.*` and case variants (`.ENV`). Reachable via prompt injection from repo content.      | Confine on a normalized lowercased basename: reject `=== '.env'` OR `startsWith('.env.')` (case-insensitive). Prefer an **allowlist** of readable roots (`src/ docs/ tests/ *.md package.json`). Add regression tests for `.env.local`, `.ENV`, `.env.production`.                                              |
| **high**     | security     | `src/server/ai-sandbox.ts:99, 205-227`   | `find` on `ALLOWED_BINS` gives the "read-only" sandbox a **file-deletion primitive** (`find . -delete`) — a destructive write the contract forbids.                                                                      | Remove `find` from `ALLOWED_BINS` (reads covered by `list_dir`/`grep`/`git ls-files`), or denylist `-delete`/`-exec*`/`-ok*`/`-fprint*`/`-fls`. Prefer per-binary arg allowlists.                                                                                                                               |
| **high**     | security     | `src/server/ai-sandbox.ts:299-314`       | `grepRepo` forwards an unguarded `pattern` to `git grep`; a leading `-` is parsed as an option → arbitrary execution via `--open-files-in-pager` (strongest sandbox escape).                                             | Insert `-e ${pattern} --` so the pattern is unambiguously the search term and following tokens are pathspecs; also reject patterns starting with `-`.                                                                                                                                                           |
| **high**     | security     | `src/server/ai-sandbox.ts:240-254`       | `ALLOWED_SCRIPTS` includes `check` and `bench`: `bun run check` writes `dist/` and runs `scripts/build.ts`; `bun run bench` executes `bench/index.ts` — both break "writes nothing" and add a code-exec surface.         | Drop `check`/`bench`; keep only `typecheck`/`lint`/`format:check` (no-emit). Audit every allowlisted script for writes.                                                                                                                                                                                         |
| **high**     | security     | `src/server/ai-sandbox.ts:277-282`       | `runReadOnly` spreads the **entire `process.env`** (incl. all LLM keys) into every model-controlled subprocess — any single metachar-filter bypass becomes full key exfiltration.                                        | Pass a minimal explicit env: `{ PATH, GIT_PAGER:'cat', PAGER:'cat', HOME/USERPROFILE }`. Never spread `process.env` into a child running attacker-influenced argv.                                                                                                                                              |
| **high**     | security     | `server.ts:289-335`                      | `/api/chat` and `/api/tool` have no auth, no rate limit, no per-IP throttle — a read-only RCE surface + LLM-key/quota proxy; the server binds `0.0.0.0` by default.                                                      | Bind `127.0.0.1` unless an explicit `HOST` env opts in; add a per-IP token bucket + a global in-flight cap on tool spawns; allowlist CORS origins.                                                                                                                                                              |
| **high**     | testing      | `src/server/ai-sandbox.ts:1`             | The default-deny gate — the **entire safety story** — has zero executable spec; the two escapes above are exactly what a basic deny-table test would catch.                                                              | Add `tests/ai-sandbox.test.ts`: confine rejects `..`/absolute/`~`/blocked prefixes; `validateCommand` denies every DENY token, metachars, quotes, non-allow bins, `git push`/`checkout x`, `bun add`, `find -delete`, grep `-`; allows `git log`/`ls src`/`cat README.md`. Mock dispatch for copilot fail-over. |
| medium       | security     | `src/server/ai-sandbox.ts:256-268`       | `validateCommand` path confinement is heuristic — skips args without `/` or `.`, and the `legacy/`/`.env`/`.git`/`node_modules`/`dist` blocklist is bypassable via `cat .env` / `cat legacy/...` / `git show HEAD:.env`. | Apply `BLOCKED_PREFIXES` + `confine()` to **every** positional path arg, not just an escape check. Route all path validation through one `confine()`.                                                                                                                                                           |
| medium       | security     | `server.ts:234-275`                      | The `POST /api/audit` endpoint is unauthenticated — any client can poison/forge the server-side audit feed, undermining its record purpose (reachable off-host given the bind).                                          | Gate behind same-origin/CSRF or a shared secret; throttle per-IP; treat client `ts` as advisory and stamp server receipt time.                                                                                                                                                                                  |
| medium       | performance  | `src/server/ai-sandbox.ts:277-295`       | `runReadOnly` buffers full stdout before truncating, so `MAX_OUTPUT` does not bound peak memory; the 15 s timeout limits duration, not bytes — memory-exhaustion DoS.                                                    | Read streams incrementally with a hard byte budget; abort/kill once `MAX_OUTPUT*small-factor` bytes seen.                                                                                                                                                                                                       |
| medium       | correctness  | `src/server/copilot.ts:299-345`          | `chatCompletion` trusts provider-returned `tool_calls` shape without validation before executing tools; a non-conforming free provider degrades every turn (caught, but a robustness hole given untrusted upstreams).    | Validate each ToolCall (`id`, `function.name`, `function.arguments` are strings) before use; skip malformed with a synthesized error tool-result.                                                                                                                                                               |
| low          | architecture | `server.ts:306-309`                      | The chat wire-contract (`messages` + optional `provider`) is parsed across both `server.ts` and `copilot.ts`.                                                                                                            | Have `parseChatRequest` return `{ messages, provider }` as one narrowed value owned by the wire boundary.                                                                                                                                                                                                       |
| low          | contract     | `src/server/copilot.ts:229, 326`         | `MAX_MESSAGES` (copilot) and the route cap (server, 100) disagree — a client sending 80 messages gets a 200 but only its last 24 are seen, silently.                                                                     | Align the bounds: export `MAX_MESSAGES` and use it as the route cap, or reject `>MAX_MESSAGES`.                                                                                                                                                                                                                 |
| low          | security     | `src/server/copilot.ts:295-297, 382-388` | Untrusted upstream provider error text is echoed into the client reply (bounded to 300 chars).                                                                                                                           | Map provider failures to a generic category for the client; log raw detail server-side.                                                                                                                                                                                                                         |
| low          | security     | `src/server/ai-sandbox.ts:256-268`       | (Supply-chain pass duplicate of the path heuristic): only confines args containing `/` or `.`; relies on the metachar filter as the sole traversal guard.                                                                | Resolve and re-confine every non-flag positional via `confine()` unconditionally.                                                                                                                                                                                                                               |
| low          | correctness  | `server.ts:177, 253`                     | `text.length` caps measure UTF-16 code units, not bytes, so `MAX_BODY_LEN`/`MAX_CHAT_BODY` are not true byte caps (a non-ASCII body up to ~3× the intended byte cap is accepted).                                        | Measure `Buffer.byteLength(text,'utf8')` or read as bytes if a true byte cap matters.                                                                                                                                                                                                                           |
| info         | correctness  | `src/logging/logger.ts:26-31, 59-64`     | `getRecentLogs` ring-rotation branch is only reachable after exactly 512 entries — verified correct; the two-phase invariant is implicit.                                                                                | Optional one-line note that rotation applies once `ring.length === RING_CAPACITY`.                                                                                                                                                                                                                              |
| info         | determinism  | `src/server/copilot.ts`                  | `Date.now`/wall-clock use is the sanctioned exception (server is outside sim by contract) — listed to complete the determinism ledger.                                                                                   | No change. Never import sim/RNG into `src/server/**` or `src/logging/**`.                                                                                                                                                                                                                                       |

---

## 12 · markup-styles **(4.3 / 5)**

**Health.** Strong overall a11y posture undercut by two real regressions: the viewport meta **disables
pinch-zoom** (WCAG 1.4.4 fail, leaving 8-9px panel text un-magnifiable), and `docs.html` references web
fonts it never loads (silent fallback to browser defaults). A duplicated, contradictory
`prefers-reduced-motion` block rounds out the medium tier.

| Severity | Category      | File:line                                | Issue                                                                                                                                                 | Fix                                                                                                               |
| -------- | ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| medium   | correctness   | `docs.html:48, 65-69, 78-82, 105-109`    | `/docs` references Inter / JetBrains Mono it never loads — renders in browser defaults, contradicting its own "self-hosted via fontsource" badge.     | Add `@fontsource` imports to `src/docs-page.ts` so Bun bundles them, or add `@font-face`/`<link>` to `docs.html`. |
| medium   | accessibility | `index.html:5-8`                         | Viewport meta `user-scalable=no, maximum-scale=1` disables pinch-zoom — fails WCAG 2.1 SC 1.4.4 / 1.4.10; low-vision users can't magnify 8-10px text. | Remove `maximum-scale=1,user-scalable=no`; rely on existing `touch-action:none` to suppress gesture scrolling.    |
| low      | correctness   | `src/styles/app.css:116-125 & 1117-1126` | Two duplicate, contradictory `prefers-reduced-motion` blocks; the 1ms contract is silently violated, and a future editor sees only one.               | Keep one canonical block; reconcile with the comment + DESIGN-SYSTEM; merge the `::before`/`::after` coverage.    |
| low      | accessibility | `index.html:728-739`                     | `#algo-active` wraps a static "Active" label inside an `aria-live=polite` region, re-announcing the prefix every field change.                        | Move `aria-live` onto `#algo-active-name`, or split the static label out.                                         |
| low      | accessibility | `index.html:344-448`                     | Observatory canvases use `role=img`+`aria-label` but surface no underlying data to AT, undocumented as decorative.                                    | Document as decorative-with-title, or add an off-screen text summary updated with the draw.                       |
| low      | accessibility | `index.html:1044-1082`                   | Sheet `.open` and header `.col` drive overlapping visibility with no unified announced state — AT can meet an expanded-labelled but collapsed sheet.  | Unify to one expand/collapse per panel; have the toggle set `aria-expanded`. (DESIGN-SYSTEM backlog #1.)          |
| low      | accessibility | `src/styles/app.css:77, 1090`            | 8-9px mono UI/audit text on non-TV tiers with no touch-zoom escape.                                                                                   | Allow page zoom and/or lift the `4xs`/`3xs` floors slightly on default tiers.                                     |
| info     | correctness   | `src/styles/app.css:923-975`             | Radial action-wheel `132 = 3×44` box math is implicit; a future touch-target bump could misalign the wheel.                                           | Express as `calc(3 * var(--wheel-cell))`, or comment-pin `132 = 3×44`.                                            |
| info     | docs          | `docs.html:11-32`                        | `docs.html` duplicates the favicon/theme-color/color triad separately from the design tokens.                                                         | Note the duplication, or generate `docs.html :root` from the token source.                                        |

---

# Top Correctness Bugs (cross-subsystem) — from CONFIRMED

These 19 findings were independently re-verified against the source. Each confirmed **high/critical** is
marked ✅ **verified**. They are grouped by theme and ordered critical → high.

### A. Security — the copilot sandbox boundary (server-io)

The boundary advertises itself as holding "even if an attacker fully controls the model." It does not.

1. ✅ **verified — CRITICAL** · **`.env.local` leaks every LLM API key** · `src/server/ai-sandbox.ts:50-61, 39`
   `BLOCKED_PREFIXES` matches only the exact top segment `.env`, so `read_file(".env.local")` (and `.ENV`
   on case-insensitive dev FS) walks straight through. Reachable via prompt injection from repo content.
   **Confirmed in source:** `const top = rl.split(sep)[0]; if (BLOCKED_PREFIXES.includes(top …))` — a
   literal segment-equality check, no `.env.*` family match.

2. ✅ **verified — HIGH** · **`find . -delete` write primitive** · `src/server/ai-sandbox.ts:99, 205-227`
   `find` is on `ALLOWED_BINS` (line 99) and no DENY token or arg-filter blocks `-delete`/`-exec`. The
   read-only sandbox can recursively delete repo files. **Confirmed:** `find` present in the set; `META`
   and `DENY_TOKENS` contain no `find`-arg guard.

3. ✅ **verified — HIGH** · **`git grep` option-injection → RCE** · `src/server/ai-sandbox.ts:299-314`
   `grepRepo` builds `git grep -n -I --fixed-strings ${pattern}` with no `-e`/`--` separator, so a pattern
   beginning `-` is parsed as a `git grep` option (`--open-files-in-pager=…`) → arbitrary process exec.
   **Confirmed in source** at line 313.

4. ✅ **verified — HIGH** · **`bun run check`/`bench` write disk & exec project code** ·
   `src/server/ai-sandbox.ts:240-254` `ALLOWED_SCRIPTS = ['typecheck','lint','format:check','check','bench']`
   — `check` runs the build (writes `dist/`, runs `scripts/build.ts`) and `bench` runs `bench/index.ts`,
   both violating "writes nothing." **Confirmed in source** at line 246.

5. ✅ **verified — HIGH** · **Full `process.env` injected into every subprocess** ·
   `src/server/ai-sandbox.ts:277-282` `Bun.spawn(v.argv, { env: { ...process.env, GIT_PAGER:'cat', … } })`
   spreads all keys into model-controlled children — any filter bypass becomes key exfiltration.
   **Confirmed in source** at line 281.

6. ✅ **verified — HIGH** · **`/api/chat` & `/api/tool` unauthenticated, unthrottled, `0.0.0.0`** ·
   `server.ts:289-335` Both routes drive the sandbox / outbound LLM calls with no auth, rate limit, or
   loopback bind. **Confirmed in source:** the two route blocks call `runAgent`/`dispatchTool` with no
   gate; `Bun.serve` is configured with `port` only.

7. ✅ **verified — HIGH** · **Copilot leaks confidential repo source to anonymous LLMs** ·
   `src/server/copilot.ts` The default provider set includes anonymous, key-less third-party endpoints, so
   read-only repo content is shipped off-host by default. (LGPL p5 is correctly CDN-isolated — separate
   finding.) **Fix:** default Copilot to no provider (opt-in); drop anonymous providers from defaults;
   document the egress; gate off by default in distributed builds.

### B. Simulation correctness

8. ✅ **verified — HIGH** · **`timeScale` defeats the 50 ms dt clamp** · `src/world.ts:413`
   `const dt = Math.min(Math.max(rawDt,0),0.05) * s.timeScale` — the multiply is _outside_ the clamp, so
   fast-forward integrates up to 0.25 s steps. **Confirmed verbatim in source** at line 413.

9. ✅ **verified — HIGH** · **GraphMind runs on a half-resolution graph** · `src/sim/connectome.ts:185`
   The anchor loop strides `ni += 2`, so odd-indexed organisms never anchor analytical pairs — sentience
   sees half the population. **Confirmed in source:** `for (let ni = 0; ni < list.length && wI < max; ni += 2)`.

### C. Subsystem wiring / contract breaches (PHILOSOPHY rule 4)

10. ✅ **verified — HIGH** · **Genome + lineage orphaned, V9 unwired** · `src/sim/genome.ts`
    (consumer `src/world.ts:250-268`) Built and tested, wired into nothing; offspring inherit no genome.
    **Confirmed:** the `world.ts` construction block (248-268) builds phyla/morphs but never constructs or
    references a genome/lineage system.

11. ✅ **verified — HIGH** · **Faction AI + brains.ts orphaned** · `src/sim/factions.ts:217`;
    `src/world.ts:52-67, 269-320`; `src/main.ts:14` `decideFaction` reads/writes nothing live; the
    documented faction→steering loop into the 10k organisms does not exist — a trophy-shelf demo the
    manifesto forbids, described as complete in `AI-SUBSYSTEM.md`.

### D. Test coverage of the highest-risk code

12. ✅ **verified — CRITICAL** · **ai-sandbox security boundary has ZERO tests** ·
    `src/server/ai-sandbox.ts:50-296` A single-char regression in `confine()`/`validateCommand()` becomes
    host RCE or out-of-repo read with no failing test. The bugs in §A above would all have been caught by a
    basic deny-table. **The single highest-value test to add.**

13. ✅ **verified — HIGH** · **No tests for ai-sandbox or copilot** · `src/server/ai-sandbox.ts:1`
    The default-deny gate has no executable specification despite the V9 acceptance claiming it was
    "verified live."

14. ✅ **verified — HIGH** · **server.ts HTTP endpoints untested** · `server.ts:91-313`
    Audit ring, body guards, HTML escaping, and message parsing — the only network surface — have no tests;
    an XSS-escaping or body-guard regression ships undetected.

15. ✅ **verified — HIGH** · **titans.ts (largest sim module) has no direct test** · `src/sim/titans.ts:1-40`
    The most complex sim subsystem, with an explicit determinism contract and many cross-system
    read/writes, could break determinism or its allocation budget with nothing to catch it.

16. ✅ **verified — HIGH** · **The #1 project law has no automated gate** · `package.json:13`
    `Math.random`/`Date.now` banned in sim logic — but a stray draw on a rarely-exercised branch escapes
    the golden tests. **Fix:** an oxlint `no-restricted-syntax` rule (or a grep meta-test) over `src/sim/**`
    - `src/world.ts`, pinned as a CI gate.

### E. Documentation accuracy & supply-chain

17. ✅ **verified — HIGH** · **0.9.0 AGImAGNOSIS subsystem absent from all five docs** ·
    `docs/ERD.md`, `ERM.md`, `ERP.md`, `ARCHITECTURE.md`, `COMPLEXITY.md` No entities/nodes/edges/budgets
    for factions/genome/lineage/leviathans/NHI/artifacts or the AI kernel + Copilot server — a reader using
    these as the map misses the newest, largest era and the security-critical fence.

18. ✅ **verified — HIGH** · **Three live server routes undocumented** · `docs/ARCHITECTURE.md:337-346`;
    `docs/500-POINT-INSPECTION.md:332`; `server.ts:4-15` `/api/copilot`, `/api/chat`, `/api/tool` (one
    executes commands, one makes outbound calls) are missing from the docs/header; the inspection's
    rate-limit WARNs reason only about `/api/audit`. **Confirmed:** the two route blocks exist at
    `server.ts:289-335`.

19. ✅ **verified — HIGH** · **NOTICE incomplete; release ships no LICENSE/NOTICE for `/docs` deps** ·
    `NOTICE.md` and `.github/workflows/release.yml` Regenerate NOTICE from the production dep closure via
    `scripts/sbom.ts`, gate drift in CI, and ship `LICENSE`/`NOTICE`/`THIRD-PARTY-LICENSES` (incl. OFL text)
    in the release and any Pages dir.

---

## Verification notes

- **Re-read at source** (file:line confirmed verbatim): `world.ts:413` (dt clamp), `connectome.ts:185`
  (`ni += 2` stride), `main.ts:57-62` (no try/catch), `core/engine.ts:58/96` (camera aspect),
  `ai-sandbox.ts:39/50-61` (`.env` segment check), `:99` (`find` allowed), `:240-254` (`check`/`bench`),
  `:277-282` (`...process.env`), `:299-314` (`git grep` no `-e`/`--`), `server.ts:289-335`
  (`/api/chat`,`/api/tool`), `world.ts:248-268` (no genome/lineage construction).
- **CONFIRMED set:** 19 findings (2 critical, 17 high). All carry the ✅ **verified** tag above.
- **Unit scores** are reproduced from the audit's `UNIT_SCORES` (mind-quantum-analytics had no numeric
  score recorded — marked _n/a_).

_End of Full Code Review — Cosmogonic Quantum Mechalogodrom 0.9.0, 2026-06-13._
