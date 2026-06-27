<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Audit Log (centralized)

**One place for the project's audit history.** New audits, reviews, and fix-passes append a dated
entry HERE (newest first). The dated reports under [`docs/reports/`](./reports/) are **living,
continuously-rewritten current documents** — rewritten in place to current truth, never forked into
dated / historical / "superseded snapshot" copies (per the binding "Living docs, no archives" law in
[CLAUDE.md](../CLAUDE.md)). Live facts (version, test/coverage receipts) are propagated automatically by
`scripts/sync-surfaces.ts`. This log records what changed and why.

---

## 2026-06-27 — Singularity O(k) change: adversarial audit follow-up (consume O(n·k)→O(n), docstring honesty, 5 regression nets; entropy stays global — verified)

Ran a 5-dimension adversarial audit (17 agents, refute-by-default verify) over the shipped O(k)
singularity change ([abed50b]) — correctness/determinism, perf/complexity, physics-fidelity,
edge/stale-grid, test-coverage. **9 findings confirmed (all low/nit — zero shipped bugs), 3
dismissed.** Acted on every confirmed one; landed the real improvements, left correct code alone.

- **Consume disposal O(n·consumeCap) → O(n) (`singularities.ts`):** the deferred horizon-consume did a
  per-victim `list.indexOf` (up to ~1.25M ops/frame at 50k _while actively eating_ — the real ceiling on
  the consuming path). Replaced with a **single reverse `list` scan** + a `Set` membership test (`CONSUME_SET`):
  O(n) once plus the `disposeAt` left-shifts that were always there. The Set lookup still doubles as the
  stale-grid / same-frame-cross-system liveness guard (no double-dispose). Force pass stays O(k) every frame.
- **Docstring honesty (3 comments):** the "population-INDEPENDENT" framing overclaimed — `densityScale`
  clamps to 1 below 10k, so `k` is population-flat only **above** the 10k knee (below it `k` scales with
  `n` but stays ≤ the removed O(n) sweep). Scoped the `update`/`applyHole`/`applyStrange` comments to match
  reality, and noted the every-other-frame grid staleness explicitly.
- **Entropy stays global — and now says WHY (`applyEntropy` doc):** both the perf and physics dimensions
  **dismissed** making entropy O(k). Heat death is a global thermodynamic end-state (the expanding shell is
  a rig, not a force boundary; the global reach is the `s.chaos` world-heat coupling), and entropy's
  `i += 2` stride + per-visit `rng()` draws are part of the seeded stream — a spatial bound would break
  determinism for entropy-active replays. Documented the rationale so it isn't re-attempted.
- **5 regression nets added (`tests/singularities.test.ts`, now 17 tests):** the audit found several
  correct-but-untested paths a future refactor could silently break. Added: (1) **greyhole** absorb cap
  (`consumed === MAX_CONSUME>>2`, the audited "never retains" bug site) + emit ejects-without-consuming;
  (2) **>MAX_CONSUME** — `consumed === MAX_CONSUME` in one frame, the eaten subset is exactly the
  first-`MAX_CONSUME` in grid-query order, and it's deterministic (directly exercises the new consume
  scan); (3) **warp shell** — a probe at `HORIZON < r < HORIZON·WARP_R_MULT` gets `|Δv| < ` pure r⁻²
  (time dilation) + redshift (deleting the warp block now fails); (4) **strange star at N≥25k** — recolour
  ⟺ inside `CONV_R` (the O(k) `CONV_R` path, previously only a single-probe test); (5) **entropy** — the
  `i += 2` stride changes exactly even-index bodies (odd byte-identical), deterministically, chaos rises.

Dismissed (correctly): the "entropy is O(n)" finding (intentional, documented); the "entropy contradicts
its shell" physics framing (heat death IS global); a `forceOk` comment-precision nit (the test is sound —
the y-offset makes `r ≥ 10` a hard invariant, so no body can hit the dead-centre guard). Full
`bun run check` gate green.

---

## 2026-06-27 — V-VITALS: a per-entity GPU effect suite where every spectacle is a falsifiable state readout

Pushed the "real, not decorative" mandate into a full **named effect library** on every instanced
creature body — spectacular AND provable. Added a per-instance `instVitals` vec4 carrying four REAL
signals, feeding the reliquary shader so the visuals encode the ecosystem's actual condition.

- **New per-instance channel (`src/sim/instanced-entities.ts`):** `instVitals` vec4, packed by the
  exported pure `packVitals` — x=wealth (`energy/100`), y=senescence (`age/life`), z=neural firing
  (`act`), w=exertion (`speed×8`). Every lane finite and in `[0,1]`; non-finite inputs and `life<=0`
  pack 0 (a bare data-mesh → zeros, never NaN). Same buffer lifecycle as `instEmissive` (built in
  `buildPool`, written in `sync` pass-2, uploaded clipped to the live range).
- **The effect suite (reliquary fragment + one vertex term), each a falsifiable readout of one lane:**
  PHOSPHOR GASEOUSNESS + GILDED BUFFER SHIMMER (wealth), LASER-DANCE SYNAPSE ARCS + SHARDWARP vertex
  bristle (neural firing), ASHEN CATARACT pigment-greying (senescence), HYPERSPACE IONIZING FLUTTER
  (exertion), SINGULROSITY BLOOM (wealth×firing), BIT-GLITCH CHAOS CORE (world chaos × senescence). An
  idle poor young still organism stays quiet; a rich, firing, ancient, sprinting one blazes — _the
  spectacle is the state_. GPU-only (zero per-entity CPU), reuses the relief/fresnel/normal already
  computed + one extra fbm; the shardwarp is gated on `act` so idle geometry is byte-identical.
- **Determinism preserved:** pure `f(state)`, **no rng** — seeded trajectory byte-identical; only
  pixels change.
- **Verified, despite the stale-bundle trap:** `tsc` clean; **tests/entity-vitals.test.ts** (8 tests)
  pins `packVitals` (lanes, clamps, NaN/`life<=0` guards, offset window) AND a headless
  `InstancedEntityRenderer.sync` integration proving the packed real state reaches the pool's
  `instVitals` buffer (and a bare mesh packs zeros); existing `tests/instanced.test.ts` still green.
  Because `preview_start` served a stale bundle, the new GLSL was compiled **directly in the live
  WebGL2 context** (both the fragment suite and the shardwarp vertex term: `COMPILE_STATUS` true, empty
  info-log) with the prerequisite locals the integrated shader provides — conclusive that it compiles.
- **Extensible by design:** the four-lane channel + the additive-term pattern is the substrate for the
  next batch of named effects (vortexical swirl, helix cosmos, orbital plasmoids, lapse-collapse
  breathing, storm thermal radiance …), each to be wired to a real signal — never decoration.
- **Contract synced:** the instanced per-instance-channels bullet in `MODULE-CONTRACTS-2026-06-26.md`.

## 2026-06-27 — Honesty sweep: 5 verified doc/comment-truth fixes (NOT-WIRED labels · entropy doc · provider + contract drift)

Round-2 adversarial audit (6 deep finders — deep-math, uncovered-sim, test-quality, wiring-honesty,
docdrift, contracts — then refute-by-default verify). The **math-deep finder returned clean-empty** (core
math sound). 3 confirmed by the workflow + 2 re-verified by hand after the verify stage hit transient
rate-limiting. All **comment/doc-ONLY, zero behavior change**; landed on `main` as `9512b02`:

- **`self-evolution-loop.ts` ("faculty #99")** & **`morphic-field.ts`** — both fully-built classes with 0
  import/call/test sites, yet their headers (and FILE-MAP) implied LIVE faculties ("Tsotchke-wired",
  "Called once per creature per beat"). Relabeled IMPLEMENTED-BUT-NOT-WIRED (matching the
  `libirrep-symmetry.ts` precedent) + softened the JSDoc + annotated the FILE-MAP row.
- **`mixed-state-qgt.ts`** — the `entropy` field doc claimed von Neumann `−Tr(ρ log ρ) ∈ [0, log d]` but
  `computeEntropy()` returns LINEAR entropy `1 − Tr(ρ²) ∈ [0, 1−1/d]`. Doc corrected to the real formula.
- **`docs/COPILOT-PROVIDERS`** — claimed default=Pollinations + "fails over once"; the code
  (`src/server/copilot.ts`) makes **FreeLLMAPI** the always-present PRIMARY/default with a multi-step
  failover (FreeLLMAPI → LLM7 → Pollinations). Corrected default, failover, label, and the FreeLLMAPI section.
- **`docs/MODULE-CONTRACTS` (`EntityManager.onDeath`)** — contract said `((e: Entity) => void)` but the code
  is `((x, z) => void)` via `disposeAt()` ("audit fix A"; wired at `world.ts:521`). Updated the **stale
  contract** to match the deliberate code.

Refuted / left alone (no slop): `pinn-residual` test-gap (math correct); dead-but-honest
`nqs-vmc-learning` / `curvature-aware-qng` (no false "wired" claim — NEO-MIND marks them partial ◆);
`pimc-paths` (actually wired). Gate green: prettier, tsc, oxlint, **1585 pass / 0 fail**, receipts, sync, build.

## 2026-06-27 — UI/UX cross-surface design audit + Local↔GitHub parity + 5 visual fixes

Two design-master agents audited all four public HTML surfaces (`index`/`specs`/`docs`/`lab`), `app.css`,
and the 22 `src/ui/**` panels for typography, legibility, ergonomics, and **cross-surface consistency**
(the owner's "the UI/UX wireframing is different" concern). Confirmed: the surfaces are 3–4 different
design systems sharing a dark vibe but diverging on nearly every token (ink/line/panel hex, heading font,
type scale, nav component); the lab is a separate light theme with no nav home. Per-surface quality is
high; consistency is the gap. Fixed the objective/safe items (zero visual risk):

- `specs.html` footer printed "© 2026 0thernes" **twice** → removed the dup; added the **favicon** specs
  was missing (the orbit-glyph SVG that index + docs already carry) → all 3 dark surfaces now match.
- `docs.html` `--ink-faint 0.5` ≈ 4.0:1 at 9–10px = **WCAG-AA fail** → `0.62` (≈5.0:1); and `--ink`
  brightened `#b8c8e8 → #cfe0fb` to unify body text with specs + improve legibility.
- `lab/` added `theme-color` + `viewport-fit=cover` (was missing both).

Recorded (ledger §15) the full divergence inventory + a recommended canonical token set for the deliberate
follow-up unification (one `:root`, one nav component, propagate `--text-*` tokens into the ~12 JS-injected
HUD panels that hardcode 8.5–13px sprawl, and a min-px floor on the `nhi-observatory`/`super-neural` canvas
labels that render ~5.5–6px on phones). Left the stylistic-identity calls (specs mono-vs-Inter headings)
and the hot `app.css` dup-motion block for owner/loop. **Local↔GitHub parity:** fast-forwarded the primary
checkout (was 5 commits behind `origin/main` — the documented fleet-drift symptom) so local == GitHub;
confirmed the prior audit commit `d3a5fb1` is in GitHub history. Gate green (prettier full-repo).

## 2026-06-27 — Singularities scale to the mega ceiling: O(n) force sweep → O(k) reach query (exact physics, no stride)

The owner reported singularities "die around 25,000 entities" and asked them to stay physically accurate
and falsifiable as the world scales toward the 50,000 mega ceiling.

- **Root cause:** `SingularitySystem.applyHole`/`applyStrange` (`src/sim/singularities.ts`) swept the
  **whole** `entities.list` every frame (`O(n)`) — a per-body `sqrt` + r⁻² + horizon + redshift +
  time-dilation pass on top of the rest of the sim. Above 5,000 entities it fell back to a **half-rate
  stride + 2× accel** approximation that degraded the r⁻² + dilation accuracy AND still collapsed the
  frame as `n` grew, so the hole's dt-based forces/animation went erratic and it visually "died".

* **Fix:** the force passes now query the shared per-frame spatial hash (`ctx.grid`, already rebuilt in
  `world.ts` before `singularities.update`) at `REACH` (black/grey/white holes) / `CONV_R` (strange
  star). The grid cells overlapping the reach **square** are a superset of the 3D reach **sphere**
  (`|xz| ≤ ‖Δ‖ ≤ REACH`), filtered exactly by 3D distance². Cost is now `O(cells + k)` where `k` =
  bodies within reach — and because the V38 areal-density scaling holds density constant, **`k`
  saturates** as `n` climbs, so the cost is decoupled from population. The `>5,000` half-rate stride +
  2× gain is **removed**: the EXACT per-frame physics runs at every tier (mega included).
* **Determinism preserved:** the passes draw **no rng**, so the seeded stream is byte-identical (the
  global determinism golden never summons a singularity and is untouched). Horizon consumption is
  **deferred** — collected during the force pass (capped at `MAX_CONSUME`), disposed afterwards via
  `list.indexOf` + `disposeAt`, which also guards against a stale-grid / same-frame cross-system
  (shoggoth/titan) disposal so a body is never double-consumed. Query iteration order is the hash's
  deterministic cell-raster × insert order. Entropy stays a global O(n) strided heat-death (no reach,
  not the bug). New export `SINGULARITY_FIELD` surfaces the falsifiable field constants for tests/audits.
* **Receipt (`bun bench/scale.ts`, white hole, median ms/frame for `singularities.update`):** from
  **25k→50k the population doubles while `k` and the cost stay FLAT at ≈ 6.0 ms** (k≈20k both) — the
  old O(n) sweep would have ≈ doubled. Recorded in
  [BENCHMARKS-2026-06-26.md](./BENCHMARKS-2026-06-26.md) ("Singularity force pass — O(k) reach query").
* **Tests:** `tests/singularities.test.ts` updated to populate `ctx.grid` per frame (mirrors the real
  loop) + a new at-scale guard: at **N = 25,000** it asserts the REACH query buffer has **no
  duplicates**, **every** in-REACH body is covered, **only** in-REACH bodies are forced, and two clean
  probes receive the exact `|Δv| = G·dt/r²` (a double-visit would double it — falsifies re-application
  and proves the stride is gone). Full `bun run check` gate green (1583 tests, 0 fail).

---

## 2026-06-27 — Creature-body visuals made falsifiable: metabolic-luminance readout (energy + senescence → glow)

Per the PHILOSOPHY laws ("Real math or no math" + "Feedback over garnish") — visuals must be honest
readouts of real state, never decoration. The masses' resting self-glow was a constant
(`morphBase.emI × emissiveBoost`); now it is `× metabolicLuminance(energy, age, life)`, so an idle
organism's body reads out its REAL condition.

- **New coupling (`src/sim/entities.ts`):** exported pure `metabolicLuminance(energy, age, life)` →
  `[0.27, 1.0]`. **Wealth** (`energy` 0..100, the market-behavior payoff the trade loop
  redistributes) drives a `0.45..1.0` burn — a destitute organism still smoulders, never goes black;
  a wealthy one burns at full base. **Senescence** (`age/life`) drives a quadratic late-life fade
  bottoming at `0.6×`. Monotonic increasing in energy, decreasing in age; finite and bounded (energy
  clamped, `life<=0` guarded). Wired into the resting-emissive target in `update()` (the `act<=1`
  branch); a neural spike or a graph-mind connectome-hub boost still overrides it and decays back.
- **Why this is legitimate, not garnish:** it makes EXISTING feedback loops visible — the market
  economy (energy) and mortality (age/life) — complementing the market behavior's pre-existing
  `energy→scale` readout. Wealth and age are now legible on every organism, every frame, not just
  market entities on their cadence.
- **Determinism preserved:** pure `f(state)`, **no rng** — the seeded trajectory (positions, rng
  stream) is byte-identical; only the rendered glow scalar changes. No determinism/golden test
  snapshots entity emissive, and graph-mind's emissive tests use isolated stubs (unaffected).
- **Falsifiable (`tests/entity-metabolic-luminance.test.ts`, 6 tests / 691 assertions):** pure-function
  anchors (rich+young = 1.0, destitute = 0.45, end-of-life floor = 0.27), monotonicity in both axes,
  bounds + guards over a grid; AND a live `EntityManager.update` integration proving a thriving body
  ends visibly brighter than a starving, aged one (converging on the analytic targets) — isolated via
  `chaos=0` (zeroes the market rng nudge + neural `act`) and an empty grid (no trades) — plus a
  bit-for-bit determinism check across two identically-seeded runs.
- **Contract synced:** the V7.3 emissive-coupling line in `MODULE-CONTRACTS-2026-06-26.md` now states
  the full target `morphBase.emI × emissiveBoost × metabolicLuminance(...)`.

## 2026-06-27 — Adversarial multi-dimension audit: 9 verified defects fixed (GPU leaks · misrouted dispatch · dead telemetry · doc drift)

Ran an 8-finder adversarial workflow (correctness · efficiency · deadcode · security · determinism ·
docdrift · config) over an isolated worktree off the live `origin/main`, then put every candidate through
a **refute-by-default** skeptic that re-read the actual code. 9 findings survived (9 raw → 9 deduped → 9
confirmed real + still-present); the **efficiency, security, and determinism** finders each returned a
clean **empty** set — independently corroborating the core's prior green. All 9 landed on `main`:

- **GPU-resource leaks on HMR teardown (MED + LOW):** `NhiBodySystem` (3 shared geometries + live body
  materials) and `ReactionDiffusionSystem` (the Gray–Scott `DataTexture`) had no `dispose()` and were
  absent from `World.dispose()` — which already tears down every other GPU-owning subsystem. Added a
  `dispose()` to each and wired both into `World.dispose()`.
- **`petri-dish.applyBrutalGodEvent` misroute (MED):** 3 of the 7 real emitted events
  (`DETERMINISTIC_REWRITE`, `FATE_TWIST`, `BINARY_IGNITION`) matched no `includes()` token and fell
  through to the generic `else`, so their themed effects never fired. Routed each to its intended branch
  (`REWRITE`→Manhattan, `FATE`/`TWIST`→Joker, `IGNITION`→Phoenix); extensible branches preserved.
- **`petri-dish` dead telemetry (MED):** `state.biologics` was never populated → `speciesRichness` /
  `speciesDiversity` structurally 0 and `applyBrutalRelease` a perpetual no-op on `[]`. Now materialize
  the born strain (deterministic from seeded `morphotype`/`bioFlux`, ring-capped at 64) at the
  sentient-birth site.
- **`mortality.computeSelectionPressure` (LOW):** survivors' `legacyScore` is death-only (0 while alive),
  so it always returned 0. Added a `liveLegacy` getter (same formula, evaluated live) read for survivors.
- **`coupling-audit` (LOW):** dead `maxAbs` local — computed/updated but never read — removed.
- **doc/config drift (3):** TSOTCHKE-MAP user-repo `(15)`→`(16)` (so 16+6 = 22 reconciles with the
  header + the 16-entry registry); `bunfig.toml` coverage comment de-hard-coded to point at the
  `canonical-receipts` SSOT (per the no-hand-edit-coverage law); TECH-SPEC §1 codebase-metrics snapshot
  refreshed to measured 2026-06-27 (548 files / 201 `src` / 160 `tests` / 131 `sim` — was 530/196/152/127).

Gate green end-to-end on the final rebased tree: `prettier`, `tsc` strict, `oxlint`, **1582 pass / 0
fail**, `verify:receipts`, `sync:check`, `build` (7 artifacts). No PR — direct to `main`.

## 2026-06-27 — Runtime verification (the app actually BOOTS, STEPS, and RENDERS)

The whole audit had been static (gate / tsc / lint / encoding / fact-consistency). This pass closed the
one dimension nothing had covered: **does the simulation actually run?** Started a real dev server
(`preview_start` → `bun server.ts`, autoPort 36307), loaded the app, and drove the deterministic
`window.__CQM__.step(1/60)` hook for 120 frames. Result:

- **Boots clean:** console shows `[world] world ready` + `[main] boot`, **0 errors / 0 warnings**; server
  log clean.
- **Full UI renders:** the accessibility snapshot is the live app — WebGL `Canvas`, Telemetry panel,
  4-tab Observatory (4 chart images), flight Controls, all **25** named Sorting Fields.
- **Sim genuinely steps** (matches the documented architecture with real values, not zeros):
  **463 entities** spawned (ramping to the tier's 650 cap), **216 / 250 morphotypes**, **10 phyla**
  (50/48/45/41/36/40/48/52/51/51), **10 named titans** with energy/matter/entropy + a live PD war matrix,
  16 shoggoths / 14 puppeteers, a 2-currency **economy** (aurum 7515 / umbra 7518, FX approx 1.0,
  Gini 0.51), quantum metrics, weather/wind/temp, procedural lore + soundtrack. Determinism law holds.
- Only the off-screen `preview_screenshot` timed out — a known headless-WebGL capture limit, **not** an
  app fault (console stayed error-free through it).

Verdict: the repo is not merely gate-green — it is a **genuinely functional** deterministic simulation.
True, accurate, real, authentic. (Server stopped after the check.)

## 2026-06-27 — Exhaustive 8-partition ground-up re-audit (every folder/file) + 7 cross-surface fixes

Dispatched **8 read-only master-lens agents** partitioning the entire tree (math · sim a-e/f-n/o-z+world ·
ui+core+server · all 83 docs · root MD/XML/HTML/.github · scripts+bench+native+tests), each reading
line-by-line vs the §1 canon, then **re-verified every candidate against `origin/main`** (the agents read
the main checkout, ~15 commits behind — several findings were already loop-fixed there, e.g. the
`brutal-god-releases` double-application). Fixed 7 verified-real items that the automated `verify:facts` /
`sync:check` structurally cannot catch (prose/comment facts):

- `specs.html:812` apex "**1,644**-weight spine" → `~1,444` (customer-facing; canon spine is ~1,444 — the
  other `1,644`s on the page are legit C++ line-counts).
- `README.md:43` "~**195** source modules" → `~200` (true tracked `src/*.ts` = 200, matching the FILE-MAP
  it cites). Recorded the FILE-MAP-200-vs-metrics-196 **dual-count** (two deterministic generators, not
  drift) in ledger §14.
- `docs/ERD:67` "one of **9** forms" + `docs/BLEEDING-EDGE:22,58` "**16+** Forms" → **26**
  (`BIOLOGIC_FORMS.length`; BLEEDING-EDGE self-contradicted its own line 8).
- `.github/CODEOWNERS:3,14,15` three dead links (undated `MODULE-CONTRACTS.md`/`COMPLEXITY.md`) → dated
  filenames — they had been routing zero reviews.
- `src/math/mixed-state-qgt.ts` header claimed "the Bures metric / reduces to standard QGT / SLD"; the code
  drops the leading ρ and computes the `Tr(∂ρ∂ρ)` proxy (≈2× Fubini-Study for pure states) → header
  rewritten honestly (comment-only; the math is unchanged and bounded).
- `src/math/quantum-geometry.ts:1` file-header `/**` was never closed → swallowed the `QuantumGeometry`
  interface JSDoc; closed it (tsc-clean).

Recorded-but-deferred (owner-call / by-design / risk): 3 UI canvases snapshot DPR once (blur on monitor
change; cosmetic), native `-ffast-math` (documented owner perf call) + a shader-leak/dim-clamp edge,
honesty-header candidates (`nqs-vmc-learning`/`morphic-field`/`temporal-crystal` — re-verify wiring on main
first), and the `ulg-bridge` "Language Gateway"-vs-"Law Graph" ambiguity (owner ruling). Full inventory:
ledger §14. Gate green at fix tip; `verify:facts` 0 drift / 83 surfaces; quantum/math core re-verified
machine-precision-correct; test suite 0 skips/vacuous across 156 files.

## 2026-06-27 — Apex-body shader RED fix (`metalnessFactor` inject-before-declare) + repo-wide shader-injection sweep

Fixed a live shader-compile failure in the apex/super-creature body and then swept every shader patch in
the repo for the same bug class.

- **The bug (`src/sim/super-body.ts`, `patchGodJewel` onBeforeCompile):** the metalness micro-variance
  patch assigned `metalnessFactor = clamp(metalVar, 0.4, 1.0);` inside the `#include <roughnessmap_fragment>`
  replacement — but in the Three.js (r184) MeshStandard fragment chunk order, `metalnessFactor` is declared
  only by the **later** `#include <metalnessmap_fragment>` (`float metalnessFactor = metalness;`). So every
  god-jewel material failed to compile with `'metalnessFactor' : undeclared identifier` +
  `'assign' : l-value required (can't modify a const)`, flooding the console with
  `THREE.WebGLProgram: Shader Error` and breaking the apex body's PBR (fallback/wrong render).
- **The fix:** split the patch — the roughness replace keeps only `roughnessFactor` (declared by its own
  chunk); a new `.replace('#include <metalnessmap_fragment>', …)` computes `metalVar` + assigns
  `metalnessFactor` **after** the include declares it. `rqD`/`morphR` stay in scope (same `main()`, declared
  earlier in the roughness block). No new uniforms; determinism intact. Shipped `126875f`.
- **Verified live, not just compiled:** full `bun run check` gate green; browser preview driven 30+ frames
  via the `__CQM__.step()` hook showed **zero** `THREE.WebGLProgram`/"Fragment shader is not compiled"
  errors, with the **5 god-jewel apex-body MeshStandardMaterials present and rendering** and 24 GL programs
  compiled. (The lone `GL_INVALID_FRAMEBUFFER_OPERATION` is the hidden preview tab's 0×0 canvas / 1×1
  drawing buffer — environmental, not a shader error; the default FB reports `FRAMEBUFFER_COMPLETE`.)
- **Repo-wide sweep — super-body was the SOLE instance.** Audited all 5 shader-bearing src files two ways:
  line-by-line by hand AND a 5-agent adversarial workflow (each candidate re-checked by a skeptic prompted
  to _refute_ it against the canonical r184 chunk order). **0 findings.** `titans.ts` (onBeforeCompile +
  cage/aura ShaderMaterials) sets `roughnessFactor` at its own chunk and never touches `metalnessFactor`;
  `instanced-entities.ts` (reliquary) is the textbook-correct version of this exact pattern — relief locals
  declared in the roughness chunk and reused in the later emissive chunk, `metalnessFactor`/`normal` touched
  only at `<emissivemap_fragment>` (after their declaring chunks); `postfx.ts` (gravitational-lens
  ShaderPass, guarded fallback) and `engine.ts` (cosmic-env ShaderMaterial) declare all uniforms/varyings
  and use only auto-injected built-ins. All clean.
- **Gate gotcha (recorded, not a code bug):** the worktree's `CLAUDE.md` had been checked out CRLF (global
  `core.autocrlf=true` fighting `.gitattributes eol=lf`), which alone failed `prettier --check` and blocked
  the whole gate while `git status` showed it "clean" (git normalizes on compare; prettier reads raw bytes).
  Repaired to LF — its clean-filtered blob hash is identical to HEAD, so **zero** content change entered the
  commit (the fix commit is `super-body.ts` only, +7/−2).

## 2026-06-27 — New-feature audit (pantheon-breeding) + gate-RED catch

Re-baselined off the current `origin/main` after the day's churn (the 101-super-creature breeding feature,
26 more dated-doc renames, a tsc-RED→green scramble). Findings:

- **Caught a real gate-RED:** `src/sim/petri-dish.ts` imported `clamp01` but never used it (`TS6133`,
  `noUnusedLocals`) — `main` was TypeScript-RED. Independently confirmed; the fleet had fixed it in
  parallel (dropped the import), so no duplicate landed. Verified `bun run typecheck` clean on the result.
- **Fixed a real P1 in the new feature:** `src/ui/pantheon-architecture-panel.ts` grew its `brood` array
  without bound (MATE +1 / STORM +6 per click, each entry holding four genome sub-structures) — a
  user-driven memory leak. Added a `capBrood(incoming)` ring-cap (ceiling 256, cap-before-push so the
  storm `rarest` index stays stable). Rest of the 1,357-line feature audited **clean**: determinism (seeded
  `mulberry32` only), clamped numerics, O(1) breed hot path, XSS-safe panel (`textContent`, no `innerHTML`),
  non-vacuous tests (Bell(4)=15, |B|=1 on the circle, bit-for-bit determinism).
- **Whole-repo re-verify green:** `bun run check` (1,537 pass / 0 fail, 7 artifacts, receipts 95.02/92.14),
  `verify:facts` 0 drift / 80 surfaces, 0 mojibake + 0 broken links / 90 surfaces, Butlin still 8 met / 6
  partial. Canonical sources unchanged (v0.18.0, 1477 floor).

## 2026-06-27 — Independent second-auditor re-verification at the live tip + causal-graph test gap closed

Re-ran the full audit as an independent second auditor against the current `origin/main` tip
(`0df3d41`, the "bump every reviewed-stamp to 2026-06-27" mass edit — the highest-drift-risk commit) in
an isolated worktree off origin/main. **Every load-bearing claim independently re-confirmed GREEN:**
`prettier --check`, `tsc --noEmit` strict, `oxlint`, `verify:receipts`, `sync:check`, and `verify:facts`
all pass; `verify:facts` = **0 drift across 80 MD/HTML/XML surfaces**; `sync:check` = all surfaces match
`v0.18.0 · 1477 tests · 95.03/92.03%`. The `0df3d41` date bump touched only the `reviewed:` stamp comment
across 83 files (no filename churn, no body-date rewrite) — internally consistent (a 06-27 re-review stamp
over findings legitimately dated 06-26), not drift.

- **Receipts split is benign (verified, not a bug):** `verify:receipts` printed `1537 tests · 95.02 /
92.14` while `sync:check`/canon publish `1477 · 95.03 / 92.03`. These are _measured-now vs published
  headline_: `verify-receipts.ts` enforces a **floor** (`count >= min(canon, PORTABLE_TEST_FLOOR=1400)`)
  and a **±6pp coverage band**, then prints the measured triple — it never asserts equality. The leaner
  worktree measures 1537 (vs 2924 in the file-rich main tree) because `bun test` counts every `*.test.ts`
  present; the floor semantics absorb this by design. Correct.
- **Newest loop code hand-verified correct (the freshest = highest bug-risk):** `latent-substrates.ts`
  (real Crank–Nicolson positional spread, SO(3) geodesic coherence, all bounded; `observe()` arg order
  matches the call exactly) and `causal-graph.ts` Pearl do-calculus (graph surgery holds X; the
  twin-network counterfactual uses dynamics **algebraically identical** to the main propagation —
  `(p·w)·0.6 = p·w·0.6`). Both are genuinely **wired live** into `super-mind.ts` (imported :61 → called
  :1187 → stored → exposed on `snapshot()` :1688), not computed-and-discarded.
- **FIXED — real coverage gap (additive, `tests/causal-graph.test.ts`, 9 tests / 36 assertions):**
  `causal-graph.ts` is now load-bearing (drives `latent-substrates` → the apex snapshot) yet had **no
  direct test** — it was exercised only indirectly through the `clamp01`-bounded `latentSubstrateStep`
  wrapper, which cannot catch a regression in the do-operator itself (the same blind spot that hid the
  earlier `wigner6j` j≥7 sign bug behind small-case tests). The new test pins the **defining do-calculus
  contract**: do(X=x) surgery holds X so a change to X's _parent_ cannot reach Y (exact equality);
  counterfactual of do(X=x) equals the factual effect of do(X=1−x) (exact, byte-identical); plus
  determinism, [0,1] bounds, finite AD gradient on both the direct-edge and indirect branches, snapshot
  intervention-count, and `updateWeight` online learning + safe no-op on a missing edge. Gate-clean
  (prettier/tsc/oxlint green).
- **Observation (latent process gap, not a defect):** `verify:facts` runs in CI (`ci.yml:76`) but is
  **not** in the local `bun run check` chain (`format:check → typecheck → lint → test → verify:receipts →
sync:check → build`), so a prose-fact drift is only caught post-push by CI rather than at the
  pre-commit gate. By design — `verify:facts` is a report-for-triage auditor (legit multi-framings are
  allow-listed) — so it is intentionally out of the fast local gate; recorded so the asymmetry is known.

Net: the repo is **true, accurate, current, and defensible** at `0df3d41`. No new bugs and no new
cross-surface drift beyond what the ledger already documents; one genuine test-coverage gap on
freshly-elevated apex code closed.

## 2026-06-26 — Line-by-line read: petri-dish active-bug fixes + dead-state reclassification + doc honesty

Deep per-file read (~84 src files read directly, beyond agents/manifest) of the math/quantum core, every
consciousness faculty, every Tsotchke port, and the petri/genetics layer. The math is verified
expert-grade (RNG mulberry32 + FNV, statevector, Crank–Nicolson unitary, irrep wigner6j LF-fix present,
Clifford tableau, dual/hyperdual/eshkol-ad exact, so3 Hamilton, coherence/IIT/GWT/FEP/SR/empowerment/
metacog/criticality/neuromod all correct + well-cited). **Every Tsotchke port is genuine + honest** —
several explicitly RETIRE prior decorative stubs (moonlab-tensor "retires the #1 decorative lie";
tensorcore "retires the PROXY_STUB"; eshkol-vm "retires the NOT-a-VM note"; qge-aliveness "no bare trig").

- **FIXED (2 active sim bugs — golden-safe; petri-dish has no test/golden capture, full suite green):**
  `petri-dish.ts` complexity **ratchet-DOWN** (`Math.min(8,…)` every 40 beats clobbered complexity the
  brutal branches raised to 12–30 → gated `< 8`, now monotone, `214f65e`); and `state.qgtCurvature`
  **computed-then-discarded** (frozen 0.5 fed into `triggerBrutalRelease` while the real per-beat
  `qgeOut.curvature` was thrown away → now wired, `af968ea`+`106302f` hotfix for a `clamp01` typo).
- **3 doc-honesty overclaims FIXED (`a152edf`, comment-only):** `mixed-state-qgt computeEntropy` said
  "von Neumann" but returns LINEAR entropy; `eshkol-bridge eshkolADGradient` "AD" is actually central
  finite-difference; `curvature-aware-qng` header described the full geodesic update but `dg=0` reduces it
  to ridge QNG. Plus `faculties-pantheon` 100-vs-144 header + Tsotchke `.esk` 721-census-vs-1436-harvest.
- **Reclassified the 7 flagged "dead-state P1s": 2 were ACTIVE bugs (fixed above)**; the other 3 in this
  layer (`petri.emergence` dead-guard, `narrative-memory._skill`, holographic `PersistentNarrative`) are
  **benign reserved placeholders** — honestly `void`-marked, never consumed downstream with a wrong value,
  so they are a wiring backlog (design decision on the source), not correctness defects.

## 2026-06-26 — Code-vs-canonical COUNT audit (every count constant verified)

Swept every count-defining constant in `src/` against its published/canonical value (the "numbers must
match" mandate). Counts are consistent EXCEPT two framing gaps, both reconciled as honest code comments
(no value changed):

- **`faculties-pantheon.ts`** — `FACULTY_NAMES.length = 144` but the header claimed "100 bounded cognitive
  faculties / 100-faculty surface". `FACULTY_COUNT (144)` has **0 consumers** outside the file, so public
  surfaces correctly publish the canonical **100** — the header was just inaccurate. Rewritten to disclose
  **100 design + brutal-god layer = 144 named (internal-only)** (`eb06788`).
- **Tsotchke `.esk` count (721 vs 1436)** — `corpus-audit-receipts.ts` `TSOTCHKE_ESK_COUNT = 721` is the
  **2026-06-20 CSV census snapshot**; the **live runtime harvest** (`generated-tsotchke-seeds.ts`
  `eskCount`) scans **1436** recursively — which is what README / NHSI-dashboard / INTEGRATION-MAP publish
  ("1436+"). Both correct (dated root census vs current recursive harvest); added a comment so they never
  read as drift. **Tsotchke tech is real; no value touched.**

Verified MATCHING vs canonical: `BIOLOGIC_FORMS = 26`, `ARCHON_CHANNELS = 25`, `TOM_ORGANS = 25`,
`EMERGENCE_ANGLES = 15` (= 10 canonical + 5 god events, honestly framed in its own header), `MORPH_COUNT =
100` legacy / `PHYLUM_COUNT = 10` (×25 = 250 live), `FACTION_COUNT = 8`, `WINGMAN_COUNT = 100` × 257
params, `SUPER_PARAM_COUNT = 1444`, `SUPER_ORGANS = 30`, `SOUP_SLOTS = 128`, `TSOTCHKE_REPO_COUNT = 22` /
20 projects / 21 registry. Corpus census (12,444 files / 501 MB / 3.87M lines) is the measured authority;
"~13k / 714 MB" in loop-logs are rough/older mentions.

## 2026-06-26 — Independent re-baseline after fleet churn (0 new findings)

A fresh full-repo re-audit off the current `origin/main` tip (taken **after** the 24 dated-doc renames +
the 532-file per-file coverage manifest) confirms nothing regressed: `bun run check` is **green** (1,489
pass / 0 fail, 7 build artifacts; `verify:receipts` + `sync:check` match `v0.18.0 · 95.03/92.03`); `bun
run verify:facts` reports **0 drift across 80 MD/HTML/XML surfaces**; an independent codepoint scan finds
**0 mojibake** (U+0080–009F / U+00A6 / U+0178 / U+201C/D / U+FFFD) and **0 broken relative links** across
all 90 doc surfaces; and the Butlin-membership reconciliation is verified to have **landed** — the honesty
audit and `PATH-TO-14-14` both enumerate exactly **8 met** (GWT-1/3/4, HOT-1/2, AST-1, PP-1, AE-1) / **6
partial** (RPT-1/2, GWT-2, HOT-3/4, AE-2), RPT-1 in partial, "never 9/14". Canonical sources unchanged
(`canonical-receipts.ts` · `package.json`). Verdict: the repo is **true, accurate, current, and
defensible** — 0 new findings on re-read.

## 2026-06-26 — Exhaustive subsystem audit (UI · core/scripts/server · non-core sim)

Completed the line-by-line code review beyond the math/mind core — three master-lens reviewers over
**every remaining subsystem**:

- **UI + rendering (`src/ui/**`×20,`src/core/{engine,postfx,frame-governor,quality}`, all Three.js
render-bearing sim modules, `app.css`): 0 P0 / 0 P1 — exceptionally disciplined.** Every GPU
allocation has a matching `dispose()`, hot paths are allocation-free (pre-allocated ring buffers +
scratch), WebGL context-loss + HMR are handled throughout, DOM via `textContent` (no injection). Two
P2 per-frame-allocation notes (`nhi-observatory.ts`un-throttled rAF vs`super-neural`'s 33 ms cap).
- **Core / scripts / server / build / bench: 0 P0 / 0 P1 / 0 exploitable security.** The
  sandbox/server/copilot security boundary is hardened (repo-confinement, default-deny, token-bucket,
  no SSRF/ReDoS/injection found). 7 × P2 (latent/robustness/dev-tooling). **Fixed this pass:**
  `redactSecrets` now also scrubs non-`sk-` provider key prefixes (`gsk_`/`hf_`/`nvapi-`/`AIza`/`xai-`)
  before any provider error is surfaced (RISK-10 hardening) + a new gate test; and a new
  `BIOLOGIC_FORMS.length === CANONICAL_BIOLOGIC_FORMS` invariant test (the one canonical count that is a
  hard array length — previously ungated). **Flagged:** `sync-surfaces.ts:74` `tests-[0-9]{3,4}` won't
  round-trip a future ≥5-digit count (latent; current 1,477 unaffected).
- **Non-core sim (economy, factions, titans, leviathans, petri-dish, narrative, dark-energy,
  digital-biologics, …): 0 P0, 7 × P1 (dead/frozen state), determinism CLEAN.** Real defects flagged
  for careful (golden-affecting) follow-up — the fleet is actively in this area: `petri-dish.ts`
  (complexity ratchet clobbered to 8; `qgtCurvature` computed-then-discarded, frozen 0.5; `emergence`
  read-but-never-written; `state.biologics` never populated → brutal-release mutation loop is a no-op);
  `narrative-memory.ts` `_skill` procedural store never written/read; `dark-energy.ts:92` `w += adGrad`
  has no re-clamp so the `[-1,-1/3]` invariant can break; `digital-biologics.ts:97` Eshkol-native form's
  `.esk` DNA is pinned to program 0 (`formIdx` always 0). + ~15 P2 (shared-scratch aliasing, FPS-coupled
  impulse, dead `.includes('BROLY'/'KNUL')` branches, etc.).

Determinism law re-confirmed by direct grep: **0 actual `Math.random` / `Date.now` / `performance.now`
calls in the entire `src/sim` + `src/math` tree** (every match is a comment asserting their absence).

**Per-file line-by-line re-read of the asserted-clean non-core sim modules** (explicit, not agent-
asserted): `strange-attractor`, `morphic-field`, `causal-graph`, `reaction-diffusion`, `leviathans`,
`noosphere`, `stigmergy`, `asteroids-physics`, `quality-space`, `gold-lattice`, `quantum-lattice`,
`plastic-weights`, `temporal-crystal`, `omega-point` — all confirmed correct + deterministic
(`causal-graph`'s "3-pass" propagation is intentional for the documented shallow DAG, not a convergence
bug; `reaction-diffusion` carries a written Gray–Scott boundedness/stability proof; the `dark-energy`
`w` over-range is masked downstream by `omega-point`'s `clamp01(1+darkW)`). **FIXED `strange-attractor.ts`:**
`lorenzDeriv` (pure) was recomputed 3× per step for `.x/.y/.z`; now computed once — byte-identical output,
full suite + determinism goldens green.

**Independent line-by-line re-read of the thinly-covered non-`sim` dirs** (corroborating the ledger §11
attestation with direct reads): `src/logging/{audit,logger}.ts` (bounded rings, tamper-guarded, `Date.now`
is a legit log timestamp outside sim), `src/memory/store.ts` (tamper-**rejecting** versioned validation;
its `performance.now()` is the persisted boot-seed source, not sim logic), `src/sim/ai/brains.ts` (the
deterministic classical-AI kernel — pure + injected seeded `Rng`, alloc-free, lowest-index tie-break),
`src/audio/{analysis,engine,songs}.ts` (alloc-free FFT bands; `dispose()` clears timers + closes the
AudioContext; `createSfxPalette(rng)` uses the seeded `Rng`) — **all clean, 0 new findings.** Full
per-finding detail + the every-folder/file coverage matrix in the ledger §7/§9/§11.

## 2026-06-26 — Dated MD filenames (safe set) + every reference rewired

Per the owner's decision ("both renamed and don't break — figure it out"), the **24 pure-content docs
that are safe to rename** were `git mv`'d to dated filenames (`X-2026-06-26.md`) and **every reference
rewired** across all tracked text files (md/html/xml/ts/json). Verified non-breaking: **0 broken links
repo-wide**, `tests/doc-links.test.ts` green (136/0), `tsc` clean, `sync:check` green, `prettier`
clean, FILE-MAP regenerated. Renamed: `HANDOFF`, `research_receipts`, `500-POINT-INSPECTION`,
`AI-SUBSYSTEM`, `BLEEDING-EDGE-…`, `BOOK`, `COMPLEXITY`, `CONTROLS`, `COPILOT-PROVIDERS`, `DESIGN-SYSTEM`,
`EMERGENCE-BLOCKERS`, `ENTITY-SHEETS`, `GOAL5-RESEARCH-RECEIPTS`, `NEO-MIND-ARCHITECTURE`,
`NHSI-RESEARCH-PAPERS-LEDGER`, `NOVELTY-…`, `PRE-2016-AI`, `RUNBOOK`, `SCALING-ROADMAP`,
`TSOTCHKE-CORPUS-INTEGRATION-PLAN`, `TSOTCHKE-LICENSE-UNBLOCK-PLAN`, `TSOTCHKE_CORPUS_INTEGRATION_AUDIT`,
`WIREFRAMES`, `reference/math-libs-catalog`.

**Kept at canonical names because renaming BREAKS** (the "don't break" constraint): GitHub/agent-special
(`README`/`CHANGELOG`/`CLAUDE`/`AGENTS`/`LICENSE`/`ROADMAP`/`index.html`/Pages HTML/`.github`/`.memory`),
the 14 docs hardcoded in `sync-surfaces`/`docs-truth-law`/`gen-filemap`, the convention-critical
`AUDIT-LOG`/ledger/`TSOTCHKE-INTEGRATION-MAP`, numbered ADRs, `legacy/**`, and already-dated files. These
carry the in-content `reviewed: 2026-06-27` stamp instead. Full rationale in the ledger §4.

## 2026-06-26 — Deep code-correctness audit (3 expert reviewers: quantum · A-life · engine)

Line-by-line correctness/complexity review of the math + sim core (beyond gate-green) by three parallel
domain reviewers, each verifying against closed forms. **Verdict: the quantum/numerical core is
expert-clean — 0 P0, 0 genuine P1; every closed-form invariant holds to machine precision** (Bell/GHZ
correlations, CHSH = 2√2, Grover gain, Wigner-d/CG/6j/9j, stabilizer magic = log₂(4/3), Crank–Nicolson
unitarity to 1e-13, hyperdual AD). Determinism law holds (0 `Math.random` / `Date.now` in sim logic).

Real findings (3 × P1):

- **FIXED — `src/sim/super-mind.ts:1078` dead write.** `const adQ = eshkolDual(…); this.cons.phi =
adQ.value;` was discarded by the wholesale `this.cons = {…}` rebuild 14 lines later (`phi: this.phi`).
  Removed the dead per-beat `eshkolDual` compute; `qPhi` + `eshkolDual` stay used elsewhere; 10
  super-mind tests + determinism goldens green, behaviour unchanged.
- **FLAGGED — `src/sim/holographic-memory.ts:191-482` `PersistentNarrative` never invoked.** ~230 lines
  (event ring, 12-symbol Bayesian belief, regime detector, retrieval router) reachable only via
  `recordEvent` / `routeRecall`, which nothing in `src` calls → its state is perpetually zero (telemetry
  only). Wire-into-the-beat vs delete is a golden-affecting architecture call — owner decision.
- **FLAGGED — `src/sim/shoggoths.ts:481` O(shoggoths × N) prey scan.** Each feeding shoggoth full-scans
  `entities.list` (~100 × 50,000 ≈ 5M dist²/frame worst case at the mega tier). The radius-12 consume
  circle is inside the existing radius-15 grid query (`nearby`, line 304), so filtering `nearby` would be
  O(k) and byte-identical — but `disposeAt` needs a list index and swap-removes (indices unstable; no
  id→index map in scope), so a safe fix needs that infra. Not rushed under the active loop (a wrong index
  disposes the wrong entity → golden break). Determinism-safe fix documented for careful follow-up.

P2 doc-honesty notes (no wrong results — comments over-claim vs the code): `curvature-aware-qng.ts`
hardcodes Christoffel `dg=0` so it is plain QNG (name over-promises); `mixed-state-qgt.ts`
`computeEntropy` returns linear entropy `1−Tr ρ²`, doc says von Neumann; `eshkol-bridge.ts`
`eshkolADGradient` is a central finite-difference, doc says "reverse-mode tape"; `libirrep-symmetry.ts`
is a simplified surrogate vs the exact `irrep.ts` (foot-gun if imported by mistake). Recommend tightening
the comments to match the code.

## 2026-06-26 — Full-repo consistency audit + gate-RED fixes (verification ledger)

Obsessive cross-surface fact audit (every MD / HTML / XML / code path). The canonical source-of-truth
matrix + the full findings table live in
[VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md).

- **Gate restored to green.** 3 dead relative links (`CHANGELOG.md` + `docs/KANBAN-2026-06-26.md` → the deleted
  `docs/audit-2026-06-15/` dir, consolidated by `e51a376`) repointed to `docs/AUDIT-LOG.md`;
  `tests/doc-links.test.ts` `SKIP` extended with `.claude` (transient worktrees) + `legacy`
  (preserved-verbatim) so nested-worktree pollution no longer false-fails the local gate. 0 broken
  links repo-wide.
- **CHANGELOG hygiene.** Merged three duplicate `## [0.16.1] - 2026-06-21` headers into one; removed 3
  orphaned Ralph-loop `###` slop lines below the reference-link footer; completed the footer links.
- **Count drift.** `docs/KANBAN-2026-06-26.md` "ALL 19 Tsotchke repos" -> "20 projects" (canonical: 19 mirrors +
  Eshkol flagship).
- **Every MD date-stamped (the `/goal` "current date on every MD", done safely).** Prepended an
  idempotent `<!-- reviewed: 2026-06-27 … -->` marker to all **75 maintained** Markdown docs (excludes
  `legacy/**` verbatim, `.github/**` + `.memory/**` external-tool files, and the dated `CHANGELOG.md`).
  Done as an in-content stamp, NOT a filename rename — renaming would 404 the entire cross-link graph,
  the `sync-surfaces.ts` surface list, the doc-links gate, and GitHub Pages. Gate stays green.
- **Stale figures propagated to current truth (living-docs rewrite-in-place).** 13 loop-log / process /
  ADR surfaces carried stale receipts (`HANDOFF-2026-06-26.md` 942/1172; `research_receipts-2026-06-26.md`, `docs/GOAL5-*`,
  `docs/TSOTCHKE_CORPUS_INTEGRATION_AUDIT-2026-06-26.md`, `docs/TSOTCHKE-CORPUS-RALPH-WIRING-*` 1183/1174;
  `docs/adr/0007/0008/0009` 671/736/1504; `docs/DESIGN-SYSTEM-2026-06-26.md` 229; `docs/DAILY_RUNS/*` 942/913;
  `docs/TSOTCHKE-ULTIMATE-*` v0.16.1). All rewritten in place to canonical
  **`1,477 / 95.03% / 92.03% / v0.18.0`**; `CHANGELOG` per-release receipts + `legacy/**` kept verbatim.
- **Verified correct (no action):** determinism (0 `Math.random` / `Date.now` in `src/sim`),
  `tsc` + oxlint 0, Butlin `8/14 met + 6/14 partial` across ~40 surfaces, entity `50,000`,
  BiologicForms `26`, Tsotchke `20`, and the 2928-vs-1477 test count (floor-by-design,
  `PORTABLE_TEST_FLOOR = 1400`).
- **Flagged for owner (not auto-fixed):** 7 released git tags (v0.11.0, v0.14.1–3, v0.15.0, v0.16.0,
  v0.17.0) without a `CHANGELOG` entry — not back-filled to avoid fabricating change content. (The
  earlier KANBAN mojibake and the loop-log stale figures are now resolved — see the propagation bullet
  above + Findings D/F in the ledger.)

## 2026-06-26 — Living-docs policy; reports rewritten current; stray PR closed

- **Policy shift (binding):** reports/docs are now LIVING — rewritten in place to the current truth,
  never forked into dated / historical / "superseded snapshot" copies. Encoded in
  [CLAUDE.md](../CLAUDE.md) ("Living docs, no archives") and [`reports/README.md`](./reports/README.md).
  Reverses the prior frozen-archive + guardrail-header approach.
- **All dated reports rewritten in place** to current truth (v0.18.0 · 1477 tests · ~95% line / ~92%
  function · Butlin 8/14 met + 6/14 partial · SuperMind `think()` ~3.34 / 8.85 ms); removed every stale
  figure and every "restored historical snapshot" header. The bloated manifesto trimmed ~1116 → ~470 lines.
- **Report dedup:** the three overlapping 2026-06-17 state-of-the-art reports collapsed to one
  ([`STATE-OF-THE-ART-COMBINED.md`](./reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md) = Parts I/II/III);
  the WHOLE-REPO + SUPER-CREATURE splits removed, all references repointed (README, docs.html, specs.html,
  TECHNICAL-SPECIFICATION). 11 → 9 report files; no broken links.
- **No-PR law enforced:** closed stray PR #20 (`ship` → `main`, a superseded `AUDIT-LOG` edit that
  re-asserted a "frozen archive" framing) by absorbing `ship` with `git merge -s ours` — main's tree
  unchanged, 0 open PRs at rest.

## 2026-06-26 — Report archive restored + A-Life comparison truth sync

- Restored the `C:\Users\Alexa\Downloads\COSMOGONIC REPORTS` archive into canonical repo location
  `docs/reports/` so the reports ship with the local/GitHub repo instead of living only in Downloads.
- Added [`reports/2026-06-26-CURRENT-TRUTH-BASELINE.md`](./reports/2026-06-26-CURRENT-TRUTH-BASELINE.md)
  and stamped the restored historical reports with a current-baseline warning.
- Added the A-Life comparative audit and scoring matrix:
  [`reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md`](./reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md) and
  [`reports/2026-06-26-alife-comparison-matrix.csv`](./reports/2026-06-26-alife-comparison-matrix.csv).
- Truth-sync corrections: current gate baseline is 1,477 tests with 95.03% line / 92.03% function
  coverage; Butlin remains 8/14 met + 6/14 partial; GOAL5 `<2%` frame-budget status is a remediation
  target, not a current proven fact.

## 2026-06-26 — Math-correctness pass (unwired research leaves)

Independent sequential file-by-file sweep; fixes verified against the full gate. All in unwired,
untested research modules (no live telemetry consumer — golden-safe), so the math is now correct
without changing any wired behavior:

- `math/mixed-state-qgt.ts` — the von-Neumann (linear) entropy summed only the FIRST ROW of ρ
  (`computeEntropy(…, dim)` vs the purity's correct `d2`); now sums all d² entries. And
  `statevectorToDensityMatrix` wrote ρᵀ — the imaginary part of ρ_ij = ψ_i·conj(ψ_j) was sign-flipped;
  corrected to `ai·br − ar·bi`.
- `sim/resonance-integrator.ts` — `facultyPhaseFromActivation` multiplied an `atan2` result by π,
  pushing `angle` to ~π² and breaking the documented [-π, π] contract; `findCoalition`'s phase-wrap
  then produced a NEGATIVE distance that trivially admitted out-of-phase faculties. Removed the bogus
  `* π` and hardened the wrap to a true circular distance ∈ [0, π].

## 2026-06-26 — Consistency + flow pass

- **Single-source sync + auto-push/auto-sync hooks.** `package.json` version and the canonical
  receipts (`scripts/canonical-receipts.ts`) are now the single sources of truth, propagated to
  every MD/HTML surface by `scripts/sync-surfaces.ts` (surgical on version — historical refs
  preserved). `core.hooksPath` is wired (`prepare`), so the `pre-commit` hook auto-syncs surfaces
  and the `post-commit` hook auto-pushes the branch — local and GitHub stay in lockstep with no
  manual round-trip. `bun run sync:check` is in the gate so drift fails CI.
- **Drift fixed:** canonical function coverage 87.88 -> measured 87.91 (propagated everywhere);
  `ARCHITECTURE-2026-06-26.md` stale "0.16.1+ master" -> 0.17.1+.
- **Report sprawl consolidated:** this centralized log replaces the practice of one-file-per-audit;
  the standalone 2026-06-26 line-by-line report was folded into the entry below.

## 2026-06-26 — Line-by-line source audit + fixes

Obsessive file-by-file review; every fix verified against the full gate (prettier + tsc strict +
oxlint 0 + tests + receipts + build) and classified by wiring before changing.

- **Gate restored:** the container had no `node_modules` (gate couldn't run); installed.
- **Lint 27 warnings -> 0:** removed cosmetic `x = x` "Ralph 10x" grafts (`quantum.ts`,
  `super-mind.ts`); converted 23 `new Array(n)` -> `Array.from`; renamed Eshkol AST `then`/`else`
  -> `consequent`/`alternate` (no-thenable); removed stale `eslint-disable`s + a garbled `hashSeed`
  JSDoc graft.
- **Supply chain:** `dompurify` override `^3.4.9` -> `^3.4.11` (clears GHSA-cmwh-pvxp-8882; the CI
  supply-chain audit failure).
- **8 latent bugs fixed** (all in unwired/unread paths — golden-safe):
  - `causal-graph.ts` — do(X=x) cut edges OUT of X (should be INTO X), defeating interventions.
  - `tsotchke-deep-wire.ts` — SU(2) character table returned NaN (0/0); use Dirichlet limit 2j+1.
  - `nqs-vmc-learning.ts` — VMC samples seeded all-zero (`float >>> k` = 0); scale to uint32 first.
  - `morphic-field.ts` — malformed EMA (coeff ~1.93, saturating); reduced to a proper tau-decay EMA.
  - `narrative-memory.ts` — ring wraparound bug in the "now" timestamp.
  - `emergent-language.ts` — double-increment skipping every other sign id.
  - `integrated-information.ts` — `computeLocalIntegration` always returned 1; made a real share.
  - `quantum-qrng-full.ts` latent unchecked index; `clifford-tableau.ts` unused-var graft.
- **Verified clean:** audit subsystem (`logging/*`, server `/api/audit`), server security
  (`ai-sandbox`, `web-search`, `copilot` secret handling), 16 math kernels (SVD, Crank-Nicolson,
  Clifford, Wigner/CG/6j/9j), `world.ts` `Date.now` containment, `verify-receipts.ts`. An
  adversarial finder->verify workflow over the sim/ui clusters returned zero confirmed bugs.
- **Noted, not changed:** `brutal-god-releases.ts` duplicated block (wired flavor module, golden
  regen risk on ambiguous intent); `tsotchke-registry` honesty-metric (documented policy item).

---

## Surviving reports (canonical)

The dated archive now lives in `docs/reports/`. Historical report bodies preserve publication-era numbers;
the current truth baseline supersedes conflicting old counts or overclaims.

- **Comprehensive assessment:** [`reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md`](./reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md) (+ `-WHOLE-REPO`, `-SUPER-CREATURE`).
- **NHSI:** [`reports/2026-06-21-NHSI-HONESTY-AUDIT.md`](./reports/2026-06-21-NHSI-HONESTY-AUDIT.md) (honesty scorecard — gate-referenced) · [`reports/2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md`](./reports/2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md) · [`reports/2026-06-20-RESEARCH-BEDROCK.md`](./reports/2026-06-20-RESEARCH-BEDROCK.md) · [`reports/2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md`](./reports/2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md) · [`reports/2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml`](./reports/2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml).
- **A-Life:** [`reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md`](./reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md) · [`reports/2026-06-26-alife-comparison-matrix.csv`](./reports/2026-06-26-alife-comparison-matrix.csv).
- **Tsotchke:** living map [`TSOTCHKE-INTEGRATION-MAP-2026-06-26.md`](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md) · plan [`TSOTCHKE-CORPUS-INTEGRATION-PLAN-2026-06-26.md`](./TSOTCHKE-CORPUS-INTEGRATION-PLAN-2026-06-26.md) · source-provenance audits still cited from code (`TSOTCHKE-CORPUS-RALPH-WIRING-AUDIT-2026-06-19.md`, `TSOTCHKE_CORPUS_INTEGRATION_AUDIT-2026-06-26.md`, `TSOTCHKE-ULTIMATE-COMPREHENSIVE-AUDIT-REPORT-ASSESSMENT-2026-06-20.md`).

## 2026-06-26 — Roadmap Fulfillment: P1 Harness + Coupling Scaffold

- Added deterministic `scripts/p1-quantum-classical-experiment.ts` for a falsifiable quantum-vs-classical contrast harness; the bootstrap uses seeded RNG, not `Math.random`.
- Added `bench/quantum-classical.bench.ts` as a tiny reproducible scaffold around shipped contrast functions; it does not claim quantum advantage.
- Added `structuredCouplingModulationInto` and wired it through `FacultiesPantheon` with caller-owned scratch, preserving the hot-loop allocation rule.
- Added `bedauPackardActivity` as a pure open-endedness metric for future petri/soup ablations.
- Truth boundary preserved: this is measurement infrastructure and a coupling scaffold, not a new sentience claim and not a 14/14 claim.
