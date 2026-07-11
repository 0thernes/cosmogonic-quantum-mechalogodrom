<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Audit Log (centralized)

**One place for the project's audit history.** New audits, reviews, and fix-passes append a dated
entry HERE (newest first). Active docs are rewritten in place for current truth; dated reports under
[`docs/reports/`](./reports/) are historical snapshots unless explicitly promoted by their README.
Living receipt truth is [VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md) §1 +
`scripts/canonical-receipts.ts`, propagated by `scripts/sync-surfaces.ts`. This log records what
changed and why.

---

## 2026-07-10 (pass 2) — fresh adversarial sweep (5 NEW findings beyond the original 69)

A second multi-agent sweep (12 hunter lenses — dispose-leaks, numerical-edge, determinism, ratchet,
dead-compute, boundary, async-error, perf-hotpath, world.ts, shader-GLSL, tsotchke-facade,
type-safety — each candidate adversarially verified) over the post-batch-8 tree. **5 findings survived
verification** (the rest were false-positives or adjudicated-intentional). Split by risk into two
gated commits: batch 9 (behavior-preserving) and batch 10 (the Moonlab degenerate-constant class).

### Batch 9 — behavior-preserving safety + perf (this commit)

- **[NQS-1] VMC `localEnergy` non-finite guard** (`nqs-vmc-learning.ts`) — the guard caught only
  underflow (`norm < 1e-12`); if the RBM weights diverge during training, `logAmp` overflows `exp()`
  → `norm` becomes NaN/Infinity, bypassing the guard and injecting a NaN `E_L` that propagates to
  permanently-NaN weights (the net re-initialises only in the constructor), which then pins the apex
  `cons.surprise` to NaN every beat forever. Widened to `!Number.isFinite(norm) || norm < 1e-12`, plus
  a defense-in-depth non-finite skip before the live weight update in `vmcStep`. A latent/tail hazard
  (needs weight divergence), now closed. Identical behaviour on every finite run.
- **[BOOT-1] unguarded `boot()` rejection** (`main.ts`) — `void boot()` had no `.catch()` and only the
  `new Engine(...)` construction was wrapped; a throw from `new World(...)`/`AuditTrail`/`MemoryStore`
  (dozens of GPU/three.js constructors) would become an unhandled rejection AND leave the `#cqm-boot`
  overlay up forever (removed only by `bootDone`/`bootAbort`, no timeout fallback) — a frozen loading
  screen. Now `boot().catch(...)` → `bootAbort()` + `showWebglRecovery(err)`, matching the Engine path.
  Lifecycle cancels resolve normally (never hit the handler); a clean boot skips it.
- **[PERF-1] `driveSuper` frame-invariant recompute** (`world.ts`) — the per-frame 5-archon loop called
  `getFullTsotchkeBias(i)` and `getCorpusPulseForArchon(i, seed^…)` — both **pure functions of `i` /
  the boot-constant seed** — every RUNNING frame, re-folding the whole Tsotchke facade (~12 literal
  arrays each, twice per archon ⇒ ~6–9k throwaway allocs/sec) to produce 5 constant results. Cached
  once via `??=` arrays (the existing `cachedMechaPulse`/`cachedGlyphPulse` idiom). Byte-identical
  values, zero behaviour change.

### Batch 10 — the Moonlab degenerate-constant class (this commit)

Two verified findings, same root cause: real MIT tensor-network kernels (`moonlab-tensor.ts`) fed
inputs that reshape to a **full-rank / rank-1** matrix, so the Eckart–Young bond truncation dropped
nothing and the returned retained-energy ratio was a fixed constant (~1) regardless of the inputs —
an inert "coupling" violating the PHILOSOPHY contract ("real math under every effect"). The sibling
`moonlabTensorQualia` was already patched for exactly this class (with a comment calling the
unguarded form an audit violation); `moonlabTensorContract` / `moonlabMpoStep` / `moonlabMpoApply`
were not. **These are real MIT kernels — the bug was the wiring feeding them degenerate shapes, never
the math.**

- **[MOON-1] kernel de-degeneracy** (`moonlab-tensor.ts`) — floored the reshape side `d = max(2, …)`
  (read past `state[0]`) and forced the retained rank **strictly below** the matrix side
  (`keep = max(1, min(chi, d − 1))`) in all three kernels. This is a **strict no-op for every call
  that already truncated** (`chi < d`, e.g. the length-9 golden inputs / `chi=1` sites) and only
  changes the degenerate `chi ≥ d` / length-2·3 cases — so a genuine rank-1 truncation now makes the
  ratio track the input's singular spectrum. Fixes ~20 contract sites (all `Float32Array(4)` operands:
  causal-graph, dark-energy, morphic, noosphere, omega-point, stigmergy, strange-attractor,
  temporal-crystal, xenomind, quality-space, super-body, super-mind tPred/tQ/tQ2/srT/empT,
  tsotchke-brain-intake) plus the length-≥3 MPO sites.
- **[MOON-2] residual length-2 call sites** — a length-2 MPO/contract operand packs to a rank-1 outer
  product whose ratio stays constant even after the kernel guard, silently dropping the 2nd feature.
  Widened the six such operands to length-3 with a cross term so the packed matrix is genuinely
  rank-2 and **both** features move the result: `godform.GODFORM_MPO_INPUT` (adDepth·quakeFactor),
  `world.superMpoInput` ×2 (quakeLife·hybridAliv; quakeAliveness·localD),
  `quality-space.mpoInput` (state0·state1), `topdown-perception.mpoInput` (imaginedLatent0·novelty),
  and `super-mind` hrrT's `[conf, 0.5]` → `[conf, 0.5, conf·0.5]` (its zero second row forced rank-1).

New `moonlab-tensor.test.ts` cases lock it: the contract ratio is now state-dependent (< 1 and varies
across inputs — the pre-fix constant 1 would fail), and a length-3 MPO input genuinely reads both
features. Behaviour-shifting but fully deterministic — the determinism/reproduce goldens stay bit-green
and the coupling-audit / Butlin thresholds absorb the shift. Receipts 2396 → **2399** (+3).

## 2026-07-10 — autonomous whole-repo audit (deps + ~60 findings across 8 batches)

A multi-agent audit (27 finder agents + adversarial verifiers) swept every file for bugs, dead
compute, determinism violations, and efficiency. 69 findings survived verification; ~60 were shipped
across five gated commits (the rest were false-positives, already-fixed, or intentional per
owner-intent; four are explicitly deferred below as owner-scoped). All sim changes preserve the
seeded-`Rng` determinism law and keep the determinism/reproduce goldens bit-green.

### Dependency hygiene (`8066d59`, `548992d`, `da7cd8d`)

three/@types/three 0.185.1, oxlint 1.73, prettier 3.9.5 (reformatted 14 files), mermaid 11.16,
tailwind 4.3.2, simple-statistics 7.9.3, typescript 7.0.2. Straight to `main`, no PRs.

### Batch 1+2 — 40 non-determinism-shifting fixes (`23e484d2`, 37 src + 1 new test)

Correctness, guard, dispose-path, and hygiene fixes spanning `world.ts`, `audio/engine.ts`,
`math/{clifford-tableau,libirrep-symmetry,quantization,schrodinger}.ts`, ~22 `sim/*` modules and
9 `ui/*` panels. Added `tests/glyph-exterior.test.ts`.

### Batch 3 — 14 determinism-shifting wires + perf (`9e17a8db`, 13 src + 1 test, +2 tests)

- **tsotchke-deep-wire** — rewrote the Eshkol VM parse/compile/execute (matching-paren span split,
  nested `define` signature unwrap, compile-args-before-CALL, param binding, unknown-func fallback)
  so `eshkolExecute` returns real bounded values instead of 0.
- **foundationals** — mean-centered the STDP correlation (was a one-way potentiation ratchet).
- **apex-brain** — fixed the Gödel MetaParadox residual (was degenerate 0 after beat 1; now a
  zero-input forecast vs. realized state, L2-renormalized).
- **world** — dropped the redundant primordial-soup double-step (channels 0..4 already tick in the
  archon loop).
- **behaviors** — bounce off `PLATFORM_FLOOR`, not the stale `-8` literal.
- **morphic-field** — cosine-weighted `readBias` + lossy MPO bond dim (was a constant `chi=4`).
- **super-qubits** — modulate the circuit by the Eshkol dual + GWT (was applying the raw input).
- **brutal-god-releases** — added the `shatter` and `watchmaker`/`time-loop` effect branches (+2
  deterministic tests).
- **quantum-quake / petri-dish** — thread the QGE `aliveness` into the substrate (was `curvature`).
- **narrative-memory** — real recency decay (`age/240`, live plan-tag + `cliffordBeat` timestamp);
  the old `/1e9` wrap made `exp(-age·3)≈1` always, so recency + tag-matching were inert.
- **super-mind** — event-source the holographic `COMMIT` (turns the write-only narrative telemetry
  — `narrativeEventCount`/`regimeShift`/`belief` on the snapshot — live); made the per-beat hot loop
  allocation-free (precomputed organ views + reused resonance/qualia scratch, byte-identical); wired
  the **real Robinson unification** faculty (`math/unification.ts`) into the belief-consistency gate
  (was a scalar `logic>0.6 ⇒ ×0.9` threshold wearing the port's name; now a per-beat KB + instinct
  goals, calibrated so full satisfaction reproduces the historical `×0.9`).
- **glyph-brain** — wired the four dead faculties in the 100-brain per-beat loop: predictor →
  prediction-error → surprise → novelty; memory-net energy → activity; meta self-monitor → spike
  threshold; Hebbian plastic overlay → latent (tanh-bounded). ~⅓ of the advertised 25k-param brain
  was computing and being discarded.

### Batch 4 — correctness + perf (`b8219955`-rebased commit)

- **postfx [5]** — `setSize` now re-syncs `composer.setPixelRatio(renderer.getPixelRatio())`.
  EffectComposer freezes its pixel ratio at construction, so moving the window to a monitor with a
  different `devicePixelRatio` rendered the whole default lens/bloom chain at the boot-time DPR.
- **super-mind [19]** — stopped building the full UI-cadence `QubitSnapshot` (4ⁿ-Pauli magic + 5× QGT
  circuit rebuild + IIT min-cut) every beat × 5 archons just to read two scalars. New cheap
  `coherenceL1Now()` (O(2ⁿ)) + `magicNormNow()` (O(4ⁿ), recomputed only on the full round-robin beat,
  cached for echo). Default `'full'` path is byte-identical; only echo beats reuse the cached magic.
- **super-neural [60] + pantheon-architecture-panel [61]** — hoisted the static Hamming-filtered axon
  pair sets (88k→~22k, 51k→~12.7k) out of the per-frame `O(n²)` loops and throttled the pantheon
  panel's unthrottled rAF to ~30 fps. Same drawn pairs, same order — render byte-identical.
- **[4] wilderness worker-drop** and **[53] causal-graph per-beat alloc** were found already fixed in
  the tree (Codex). Deferred sub-item: super-neural `spark()` gradient sprite-cache (needs in-browser
  visual verification — the pair-hoist is the safe structural half).

### Batch 5 — wire-more: dead-module activation + a latent divergence bug (this commit)

Per the wire-more mandate, brought two dead BRUTALISM modules live with **bounded, deterministic,
genuinely load-bearing** couplings (not metric-gaming) + determinism/boundedness tests:

- **[44] temporal-crystal** — the discrete-time-crystal (Floquet MBL spin oscillator) is now stepped
  each beat and its period-doubling order **leaky-pulled** into `cons.workspace` (the codebase EMA
  idiom — non-ratcheting). Honestly characterized as an autonomous _drive-rigid_ oscillator (a real
  DTC is rigid against the drive — the initial "stepped by arousal drives it" framing overclaimed and
  was corrected). Surfaced on the SuperMind snapshot. New `tests/temporal-crystal.test.ts`.
- **[24] strange-attractor** — the tri-attractor chaos field (Lorenz + Rössler + Rabinovich, RK4) is
  stepped by arousal (a genuinely **drive-sensitive** input) and its chaos index feeds `curiosity`
  (fresh per-beat sum ⇒ no ratchet). Surfaced on the snapshot. **Fixed a latent divergence bug**: the
  RK4 integration reliably escaped to ±Infinity → NaN after ~400 steps (masked because the module was
  dead); added a basin **re-injection** guard (`boundVec` — reset to the attractor seed on escape, not
  clamp-and-stick, which would freeze the chaos dead-constant). Now bounded + genuinely varying over
  2000+ steps. New `tests/strange-attractor.test.ts`.

### Batch 6 — the three former deferrals, resolved honestly (`5a97ba8f`)

The owner directive is to handle everything; on review the earlier deferrals were over-cautious, so
each was resolved to its honest maximum (without shipping any fake/degenerate signal):

- **[23] instanced-entities motion-interpolation — already fully resolved (Codex `b8219955`).** The
  inert Phase 1.2 machinery (`instPrevPos`/`instSimTick`/`uRenderTime`/`uSimRate` + the ~160 KB/frame
  uploads + the no-op `mix()`) is gone; `interpolatedPos` is now just `instanceMatrix[3].xyz`. Better
  than the finding's "delete the test" — `tests/motion-interpolation.test.ts` was repurposed into a
  **regression guard** asserting those attributes/uniforms stay undefined. No action needed.
- **[37] dark-energy — WIRED into `world.ts`.** The quintessence Λ field now steps every apex beat with
  energy density ← apex vitality and matter density ← live population fullness; when the universe
  ACCELERATES (sparse + energetic ⇒ expansion > 0.85) it kindles a hair of collective chaos, in the
  exact gated-boost class as the noosphere/morphic/gedanken couplings (chaos decays at ~1538 so it
  never ratchets). `φ` is clamp-bounded — no divergence (verified over 3000 steps). Snapshot exposed
  via `world.darkEnergySnapshot`. New long-run + drive-sensitivity tests.
- **[9] mixed-state-qgt — gate-VERIFIED** (`tests/mixed-state-qgt.test.ts`). The finding's real harm
  was "no test ⇒ the audit fixes silently rot"; that is now fixed — the Hermitian ρ + Im-sign, the
  d²-vs-dim linear-entropy fix, the depolarizing-channel trace preservation, and a **non-degenerate
  state-dependent** Bures QGT over a real parameter family are all locked in. A full register-scale
  mixed-state QGT _consumer_ stays a genuine expensive UI-cadence design task (the cheap sim-signal is
  degenerate, and reduced-state mixedness is already computed inline in super-qubits) — NOT shipped
  rather than a fake or redundant signal.

### Batch 7 — adversarial self-review of batches 3–6 (`9a48cade`)

An 11-agent adversarial self-review (each agent tasked to _refute_ one of my own batch-3→6 wires by
reading the shipped code) returned **10 SOUND, 2 DEFECT** — both defects real, both fixed:

- **[44] temporal-crystal → `cons.workspace` was a DEAD STORE.** `super-mind.ts` reassigns
  `this.cons` to a fresh object mid-`think()` (STAGE-5, workspace ← `eshkolEngine.workspace`) and
  finalizes `cons.workspace` again at ~1902, so my earlier leaky-pull (written at ~1273, _before_
  both writes) was silently discarded — the coupling never reached the workspace `g01` reads next
  beat nor the snapshot. **Fix:** moved the leaky-pull to _after_ the ~1902 finalize, so
  `temporalCrystal.order` genuinely feeds the workspace. Now a live coupling, as claimed.
- **[9] mixed-state-qgt test had two vacuous assertions.** The "Im-sign" check asserted only
  antisymmetry + magnitude (invariant under the very ρ↔ρᵀ transpose bug it was meant to guard), and
  `fisher ≈ 4·volume` was tautological (both derive from `volume`). **Fix:** replaced with the ACTUAL
  expected Im sign (−cos·sin·sinφ < 0, which the pre-fix `ar·bi − ai·br` formula flips) and
  Berry-curvature antisymmetry (Ω = Im Q antisymmetric with zero diagonal) — genuinely sign-sensitive.

**Lesson (recorded to memory):** `this.cons` in `super-mind` is rebuilt mid-think; couple to `cons`
fields _at or after_ the ~1902 finalize (or to the source `eshkolEngine.workspace`), never before the
reassignment. Always adversarially self-review coupling wires — a plausible-looking wire can be a
no-op.

### Batch 8 — `spark()` sprite cache (`ff30c1af`)

The deferred sub-item of [60]: `super-neural.ts`'s `spark()` built a fresh radial-gradient every call
(hundreds/frame). Now bakes one 64×64 offscreen sprite per quantized hue (each RGB channel snapped to
/8 ⇒ measured **103** distinct sprites across all 360 hues × 4 bands + fixed colours; shift ≤7/channel,
imperceptible) and `drawImage`s it. Falls back to the original gradient when there is no DOM (headless
tests import but never draw). Together with the batch-4 pair-hoist this removes both the `O(n²)`
iteration and the per-surviving-pair gradient allocation on that render path.

Receipts: 2369 → **2396** tests (batches 1–3 → 2371; batch 5 → 2389; batch 6 adds dark-energy +2 and
mixed-state-qgt +5 → 2396; batches 7–8 strengthen assertions / cache a render path, no new tests),
coverage floor unchanged (84.64% line / 82.21% func — Windows measured higher). Full `bun run check`
green on each commit.

---

## 2026-07-08 — audit follow-through (facts · birthBiologic · GOAL5 · apex seam)

Shipped the four highest-leverage remediations from the full-stack audit (same day session):

1. **`verify:facts` false positives silenced** — Butlin pattern now requires met/partial/failed/Butlin
   context (allows honest `0/14 failed`); faculties allow the documented **144** expanded bank and
   require a faculty token after the number (kills table-noise hits).
2. **`birthBiologic` world-wired** — `petriDishBeat` ignition materializes full `birthBiologic`
   records (not thin `M${morph}` stubs); each beat `stepBiologic`s full records and drops dead ones.
3. **GOAL5 frame cut** — `SuperMind.think(p, 'full'|'echo')` + `apexThinkMode` round-robin: \*\*1 full
   - 4 echo\*\* per frame in `world.driveSuper` (echo = 1×1 ToT + 1 predictor step). Amortized full
     mind cost ~1/5 of the previous 5× full batch. Strict `<2%` still open; documented in BENCHMARKS.
4. **World seam extract** — pure cadence helper lives in `src/sim/apex-cadence.ts` (first real split
   out of the driveSuper god-path; further world.ts decomposition remains open).

Tests: `tests/apex-cadence.test.ts`, super-mind echo determinism, digital-biologics petri wiring.

---

## 2026-07-07 (pass 23) - three-pass subagent audit + code-vs-doc truth-repair sweep

Ran a three-pass subagent audit (48 agents across three Workflows) grading every current
report/spec against `file:line` source, then shipped the confirmed corrections in one gated commit
(`94766d4`).

### Audit verdicts (verified against source)

- **Substance is honest.** The determinism ban (Math.random / Date.now / performance.now in
  `src/sim` + `src/math`) is comment-verified zero-hit AND gate-enforced (`tests/determinism-law.test.ts`);
  the "wired vs scaffolded" ledger is 100% accurate (LAB-only kernels unimported, `birthBiologic`
  unwired, glyph/god-colossus/temple decorative, super-mind/entity-brain/connectome/nhi live each
  frame); Butlin 8/14-met + 6-partial holds (HOT-4 is stronger than its "partial" label); Tsotchke is
  genuine math (9 deep leaves, 0 fenced imports, `corpusBrainAblation` load-bearing); the overclaim
  discipline is clean repo-wide. VERIFICATION-ANALYTICAL-DATA.md is code-exact.
- **`verify:facts` is report-only** (no process.exit/throw) - the one non-gating stage in `check`;
  `docs-truth-law.test` + `sync:check` DO hard-gate. Documented behavior, not a regression.

### Corrections shipped (`94766d4`, 14 files, gate green)

- ARCHITECTURE quality-profile table regenerated to the 6-tier ladder from `quality.ts` (adds tablet
  rung; maxLinks 12k-600k = 12x maxEntities; dprCap infinity; shadows/instanced on all tiers);
  COMPLEXITY + ENTITY-SCHEMA ranges likewise; "five-rung" -> "six-rung".
- TECH-SPEC section 7: Clifford reflex 32q -> 16q (`super-mind.ts:752`); puppet-master "x100 5-qubit
  register" -> one shared QuantumCircuitSystem register; think() 3.34/8.85 -> 1.99/9.77 ms (BENCHMARKS).
- ENTITY-SHEETS eyes 16 -> 24 / arms 11 -> 13; MODULE-CONTRACTS license MIT -> proprietary + phantom
  `src/ui/touch.ts`/`TouchControls` -> real `src/ui/input.ts`/`InputSystem`; NOTICE `eshkol-vm-bytecode.ts`
  -> `eshkol-vm.ts`; MONOLITH-ART retired V125 cube-tower/monochrome -> shipped raymarched Mandelbulb +
  1000-hue orbit-trap palette; PEER-REVIEW 4-currency -> 2-currency + 2-commodity; FILE-MAP regen
  (titans 20; Thaler header made self-qualifying); BRAIN `docs/docs` 404 link fixed; `world.ts` +
  `determinism-law.test.ts` stale V48 `Date.now`-exception comments dropped (removed at V105).

### Correctly NOT changed (receipts discipline)

- BENCHMARKS entity-cap numbers - measurements at a specific cap; relabeling would manufacture a false
  receipt. Needs a re-bench, not a doc edit.
- RUNBOOK "0.10.4" - the last entry of a historical semver-progression list, not a current-version claim.

### MEGA-MASTER trio: refreshed per owner call

The purpose-separated 3-part MEGA-MASTER series (synthesis / module-atlas / census), which the NHSI
dashboard declares the primary brain assessment, was flagged as a retire-vs-keep editorial decision and
put to the owner, who chose REFRESH over retire. Current-version refs bumped v0.21.7 -> v0.21.9, reviewed
date -> 2026-07-07, series kept (`143bfb1`); PASS-2 also had a naive-arithmetic think() 5x-batch figure
fixed 9.95 -> 9.77 ms. The loop was confirmed paused during the sweep (zero fleet pushes; HEAD stayed even
with origin/main).

---

## 2026-07-07 (pass 22) - 22-report doc-sprawl consolidation

Collapsed the competing "master assessment" sprawl in `docs/` (three rival 2026-07-07 master
lineages plus a stack of process-logs, ~28 report-like files locally) down to the single canonical
set, per the living-doc law (one topic = one file; `docs/reports/README.md`: "no forked copies, no
archives folder").

### Attribution (who authored the sprawl)

- **Canonical, kept:** `CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md` + `-FILE-AUDIT`
  (.md/.html) and `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md`, riding on the
  SSOT surfaces (VERIFICATION / NHSI-DASHBOARD / TECH-SPEC / CONTROLS / BOOK). The CONSOLIDATED-22 pair
  is a joint **GPT-5.5** (sober depth-class framing, claim-linter) + **ClaudeCode Opus 4.8** (named-system
  coverage) artifact; the BRAIN doc is the ClaudeCode 4-report merge.
- **Hype / superseded drafts (18), removed from the working tree:** the SUPER-REPORT / OMNISCIENT /
  ULTIMATE-MEGA / MASTER-ASSESSMENT / MEGA-ULTRATHINK / MEGA-MASTER-...PASS1-3 / FINAL-HURRAH /
  CONSOLIDATED-16 series (Windsor SWE-1.6 + Devin + early ClaudeCode SUPER-REPORT passes; each
  self-marked "superseded local draft"). These were **never committed** (no git history) - purely local
  uncommitted cruft from the parallel fleet session, so GitHub never carried them. Moved to the
  git-ignored local `docs/reports/2026-07-07/` folder as a browsable local archive.
- **Process-logs, deleted from the tracked tree (4 committed + 1 untracked):**
  `5-PASS-DOCUMENTATION-UPDATE-STRATEGY`, `DEPLOYMENT-INSTRUCTIONS`,
  `DOCUMENTATION-UPDATE-COMPLETION-SUMMARY`, `DOCUMENTATION-UPDATE-CORRECTED-SUMMARY` (Devin scaffolding,
  committed; the last two contradict each other) + the untracked `FINAL-CLEANUP-SUMMARY` (a 5th,
  loop-spawned mid-session). Status snapshots masquerading as docs; their history lives here now.

### Net

- Tracked `docs/` report surface consolidated toward the 5 canonical files (was ~28 report-like files
  locally). NOTE: a concurrent fleet loop committed a NEW
  `MEGA-MASTER-CONSCIOUSNESS-BRAIN-SENTIENCE-ASSESSMENT-PASS-1/2/3` set to `main` during this pass (its
  passes 19-21 below) - fresh sprawl not yet folded; needs the loop paused before a clean final sweep.
- GitHub was already clean of the 18 older drafts; the local working tree now matches it.
- Provenance: the 4 process-logs stay recoverable via git history; the 18 uncommitted drafts persist
  only in the local `docs/reports/2026-07-07/` archive - to publish them, un-exclude the folder in
  `.git/info/exclude` and `git add -f`.

### Gate

- No code paths touched. `doc-links` unaffected (drafts were prose mentions, not clickable links -
  grep-verified 0 relative-link refs). `build-pages.ts` `LOCAL_ONLY` `rm --force` no-ops harmlessly on
  the now-absent stale root entries (the `reports/2026-07-07` exclusion already covers the archive).

---

## 2026-07-06 (pass 21) — MEGA-MASTER brain assessment Pass 3 of 3 (complete)

Omniscient living-world census: `docs/MEGA-MASTER-CONSCIOUSNESS-BRAIN-SENTIENCE-ASSESSMENT-PASS-3-2026-07-06.md` + `docs/reports/assets/brain-evidence-matrix.json` + `docs/reports/assets/sim-modules-census-pass3.csv`.

### Content

- Full antagonist cognition: shoggoths, puppet-masters (`creatureDrive`), titans (IPD), leviathans, singularities.
- Population + ecology: entity-brains (50k), NHI (GOAP+MLP), wilderness, alien-flora (15k), dome-feeding, super-hunt.
- Pantheon/GOD/Temple: 25 Archon godforms, 25 ToM organs, 100 faculties; god-colossus + monolith-temple flagged DECORATIVE.
- Apex abomination stack: 5 SuperCreatures, ApexBrain, MechalogodromBrain, glyph-brains, abomination architecture.
- Cross-domain coupling matrix; gap audit vs Pass 1/2 and six original agent uploads.
- 185-module CSV census; preprint skeleton outline.
- NHSI dashboard now links Pass 3 as primary assessment surface.

### Claim boundary

- Explicitly `indicatorOnly`; no phenomenal sentience claims.

---

## 2026-07-06 (pass 20) — MEGA-MASTER brain assessment Pass 2 of 3

Module-level deep dive: `docs/MEGA-MASTER-CONSCIOUSNESS-BRAIN-SENTIENCE-ASSESSMENT-PASS-2-2026-07-06.md` + preview `docs/reports/assets/brain-evidence-matrix-pass2.json`.

### Content

- `world.ts` composition root anatomy (4,771 lines, 94 sim imports, verified frame pipeline).
- Authority-tier atlas: LIVE / TELEMETRY / LAB / SCAFFOLD / FENCED for all brain substrates.
- `driveSuper` read/write receipt with file:line citations.
- Full `src/sim/` domain inventory (185 files, 59,500 lines) and `src/math/` (31 files, 6,468 lines).
- 72 brain-related test files mapped (~900+ test blocks in cluster).
- 7 named wiring gaps with severity (kernel offline, digital-biologics unwired, mixed-state-qgt orphan, etc.).
- Native C++ split documented (gallery vs golden-vector oracle per ADR-0007).

---

Synthesized five prior agent reports (Gemini Antigravity ×2, Composer 2.5, Devin SWE 1.6, Codex GPT 5.5) plus the NHSI Progress Dashboard into a unified mega-assessment at `docs/MEGA-MASTER-CONSCIOUSNESS-BRAIN-SENTIENCE-ASSESSMENT-PASS-1-2026-07-06.md`.

### Content

- Reconciled version/breadth/Butlin/coupling conflicts against `VERIFICATION-ANALYTICAL-DATA.md` (v0.21.7, 4.44/5 A-Life breadth, 8/14+6 partial).
- Unified 12-substrate brain inventory, full consciousness theory matrix, Tsotchke per-repo wiring, multi-perspective reasoning grid, academic scrutiny ladder, folder inventory, wired-vs-scaffolded ledger, P0–P8 roadmap, and Pass 2/3 preview.
- NHSI dashboard now links the mega report as primary assessment surface.

### Claim boundary

- Explicitly `indicatorOnly`; no phenomenal sentience claims.

---

Follow-up to the `v0.21.6` clean release-tag repair: no code-path changes, only public-surface alignment.

### Surfaces

- Satellite nav on **docs / spec / bible** now links `/lab/consciousness` alongside `/lab/sentience`.
- README GitHub Pages bullet lists Bible + both lab URLs; governance review stamps bumped to `v0.21.7`.

### Gate

- `bun run check` green on Ubuntu portable receipts (`2,360` tests · `84.64%` line · `82.21%` func).

---

## 2026-07-06 (pass 17) — clean release-tag repair + v0.21.6

On top of the v0.21.0 V123 perf sweep: doc/deploy truth refresh only. A concurrent `v0.21.5` tag drift
briefly pointed the public release tag at an unbranched commit with a stale lower test floor.
v0.21.6 supersedes it without rewriting the published tag and keeps the living surfaces on the current
portable release receipts.

### A-Life

- Survey prose **25/44 → 113 systems** in README, docs.html, specs.html, NHSI dashboard.
- Regenerated **11 SVG charts** + embed; fixed geometry `chartPca` nSystems param.

### Surfaces

- Consciousness + Sentience Lab URLs; issue template contact links; CHANGELOG through 0.21.6.

### Gate

- `bun run check` green — **2,360** test floor · **84.64% / 82.21%** portable release floor
  (Windows local receipt measured **92.02% / 89.65%**).

---

## 2026-07-06 (pass 15) — Native leak + worker wait queue + truth surfaces (v0.20.0)

Full-repo debug pass: gates green; performance hygiene only — no render/sim/faculty reductions.

### Code

- **`native/src/main.cpp`** — `buildProgram()` deletes partial-compile shaders (`vs`/`fs`) on failure (GL leak fix).
- **`src/core/worker-pool.ts`** — event-driven `waitForAvailableWorker` queue (replaces 10 ms polling when pool saturated).
- **`src/world.ts`** — reuses `superMpoInput` in Archon spawn loop (avoids per-spawn `Float32Array` alloc).

### Docs / surfaces

- **`docs.html`** — forest tree: dated DESIGN-SYSTEM/COMPLEXITY paths, `reports/` (not deleted `diagrams/`), **250** test files.
- **`specs.html`** — measured 2026-07-06 line counts (src 94,494/285, tests 33,605/250, docs 9,237/43, native 1,327/7).
- **`docs/BENCHMARKS-2026-06-26.md`** — retired stale `1.875%` AD budget claim; cites measured `5× think()` (~9.77 ms).
- **`docs/VERIFICATION-ANALYTICAL-DATA.md`** — `.github/copilot-instructions.md` path fix.

### Hygiene

- **`bench/perceptual-p`** — deleted (extensionless duplicate of `bench/perceptual-priority.bench.ts`).
- **`tests/docs-truth-law.test.ts`** — extensionless-duplicate scan now includes `bench/`.

### Gate

- `bun run check` green — **2297** tests pass (receipt floor **2295** unchanged).

---

## 2026-07-06 (pass 14) — Worker pool correctness + wilderness buffer safety (v0.20.0)

Full-repo debug pass: gates green; fixed two ADR-0010 worker-path bugs without touching render/sim quality.

### Code

- **`src/core/worker-pool.ts`** — event-driven `waitForResult` (no 1 ms polling); `onerror` now settles
  in-flight tasks (prevents hung wilderness awaits); transferable path copies payload so caller-owned
  pooled buffers are not detached.
- **`src/sim/wilderness-population.ts`** — serializes worker frames via `pendingWorkerFrame` so
  pre-allocated `taskBuffers` are not reused while a transfer is in flight.
- **`tests/worker-pool.test.ts`** — detach guard + error-settlement tests.

### Gate

- `bun run check` green.

---

## 2026-07-06 (pass 13) — Full Markdown truth audit + governance cleanup (v0.20.0)

Owner brief: review all tracked Markdown after the 24-file delete + pass 12 link repair, then remove
stale current-tense receipt, path, and Tsotchke overclaim drift without changing runtime quality.

- **Receipt truth:** `README`, `RUNBOOK`, `DESIGN-SYSTEM`, `TECHNICAL-SPECIFICATION`,
  `VERIFICATION-ANALYTICAL-DATA`, `docs/reports/README`, and the scrutiny scorecard now distinguish the
  **2,295-test canonical floor / 84.41% / 82.11%** from higher local Windows receipt measurements.
- **`scripts/sync-surfaces.ts`:** deduped `SURFACES`, removed deleted report paths, retained current
  living docs and promoted reports, and added receipt patterns for floor table + `N-test floor` tokens.
- **Governance conflict:** `CLAUDE.md` + this log now match `docs/reports/README.md`: active docs are
  current truth, dated reports are historical snapshots unless explicitly promoted.
- **Dead owners:** removed or repointed references to deleted `CONSCIOUSNESS-LAB-MASTER`,
  `PERFORMANCE-OPTIMIZATION-ROADMAP`, `TEST-STRATEGY`, and deleted AGENTS-era steering files.
- **Overclaim cleanup:** Tsotchke prose now says `20` projects with `~16` wired and fenced repos
  provenance-only, instead of blanket "all repos / every system fully wired" claims.
- **Doc hygiene:** removed duplicate legend / ledger lines and refreshed measured codebase metrics.
- **Gate:** `bun run sync` + `bun run check` green.

## 2026-07-06 (pass 12) — Master plan Stages 0–5: truth repair + doc compress + test merge (v0.20.0)

Owner brief: implement consolidation master plan — fewer files/lines, fix stale receipts, worker hygiene.

### Code

- **`src/core/worker-pool.ts`** — `getWorkerCount()` honors `maxWorkers` (capped at hardware concurrency).
- **`tests/worker-pool.test.ts`** — maxWorkers cap tests.
- **Deleted** extensionless orphan `src/core/graphics-ab` (canonical: `graphics-abstraction.ts`).
- **`tests/wilderness.test.ts`** — safe Points guard (oxlint).
- **`tests/docs-truth-law.test.ts`** — markdown glob integrity guard.

### Docs

- **`scripts/canonical-receipts.ts`** → **2,295 / 84.41% / 82.11%** (portable Linux gate floor); `bun run sync`.
- **`docs/500-POINT-INSPECTION`** — compressed to section index.
- **`docs/reports/README.md`** — historical snapshot policy; removed links to deleted reports.
- Rebased atop remote **24-file delete** pass (APEX/NHSI reports already removed upstream).
- KANBAN/TECH-SPEC/VERIFICATION measured counts aligned.

### Tests merged (where not already upstream)

- Remote already merged wingmen/qubits selfopt; kept upstream test hygiene.

### Gate

- `bun run check` green.

---

## 2026-07-06 (pass 11) — Local↔GitHub sync + CI receipts fix (v0.20.0)

Owner brief: make Local match GitHub reliably; fix Windows CI receipts failure.

### Code

- **`scripts/sync-guard.ts`** — stop treating stale `REBASE_HEAD` as stuck rebase (false-positive blocked `bun dev`).
- **`scripts/verify-receipts.ts`** — coverage law is regression-floor only (Windows CI measures higher; no longer fails CI).
- **`scripts/canonical-receipts.ts`** — refreshed to live Windows-measured **2,372 tests · 91.91% / 89.62%** (replaces the interim Linux 84.35/82.05 receipt).

### Docs

- **`docs/RUNBOOK-2026-06-26.md`** — Local↔GitHub sync playbook + GitHub repo hygiene section.

### Gate

- `bun run check` green · Windows CI receipts law unblocked.

---

## 2026-07-05–06 (passes 6–10) — Consolidation index (v0.20.0)

- **Pass 10:** compressed the former pre-transformer AI dossier into `AI-SUBSYSTEM`, deduped Tsotchke
  contract prose, and merged singularities fidelity coverage into `tests/singularities.test.ts`.
- **Pass 9:** folded brain-scale/license plans into canonical owners and merged small duplicate tests
  (`entity-vitals`, `portal-death`, `classical-contrast`, `creature-exterior-layers`,
  `quantum-quake-physics`).
- **Pass 8:** reduced UI/UX and mega-master reports to compact indexes; merged glyph exterior tests.
- **Pass 7:** deleted redundant handoff/research/plan/baseline/test-index docs, removed extensionless
  orphan tests/source files, and repointed performance/test strategy ownership to BENCHMARKS,
  VERIFICATION, and RUNBOOK.
- **Pass 6:** enforced the zero-degradation mandate: FP32 genome storage, no distance brain LOD, every-frame
  entity/archon/NHI/RD cadence, denser connectome budgets, all-core wilderness workers, richer wilderness
  render caps, and faster apocalypse ramp. Gate: `bun run check`.

---

## 2026-07-05 (pass 5) — MEGA-MASTER receipt sync + BOOK module truth + full-quality brains (v0.20.0)

Owner brief: finish deferred doc debt from pass 4; never lower visual/cognitive fidelity.

### Code

- **`src/world.ts`** — stop passing camera position into `thinkAll`; every entity gets the full
  70-param brain every neural tick (distance LOD in `entity-brain.ts` no longer active in live world).
- **`PerceptualPriorityCascade`** remains disabled (all near-tier); wilderness + workers unchanged.

### Docs / sync

- **`scripts/sync-surfaces.ts`** — former MEGA-MASTER + BOOK added to `SURFACES`; extra receipt patterns
  (`passing tests`, `(0 failing)`, gauge rows, quoted coverage claims).
- **`docs/MEGA-MASTER-DEEP-DIVE-RESEARCH-REPORT-2026-06-27.md`** — measured-state receipts + module
  count (250 TS) synced; stale 91% prose fixed.
- **`docs/BOOK-2026-06-26.md`** — module inventory points at FILE-MAP (no stale "77 modules").
- **former FRONTEND-ACTION-PLAN** — pass 4–5 landed items (connectome, wilderness render, perf HUD,
  full-quality brains), later folded into `docs/UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md`.

### Gate

- `bun run sync` then `bun run check`.

---

## 2026-07-05 (pass 4) — Wilderness render + worker kernel fix + doc pointers (v0.20.0)

Owner brief: finish ADR 0010 Stage 3b ambient layer (visible, not just computed), fix worker stride
bug, scale chunk density, consolidate polish-plan docs.

### Code

- **`src/sim/wilderness-render.ts`** (new) — additive `THREE.Points` renderer (4096 cap), shimmer
  vertex colors, sync from population each frame; NOT in golden.
- **`src/sim/wilderness-population.ts`** — `maxChunks` 32, `entitiesPerChunk` 64, `loadRadius` 3;
  `forEachEntity()`, `getActiveChunkCount()` for render + telemetry.
- **`src/workers/simulation-worker.ts`** — kernel stride fixed 3→8 (matches entity layout); velocity
  integration + jitter on worker path.
- **`src/world.ts`** — construct/dispose `WildernessRenderer`; sync in running + suspended loops;
  `getPerfSnapshot()` adds `wildernessChunks`.
- **`src/ui/perf-hud.ts`** / **`src/main.ts`** — wild line shows `wild N (M ch)`.
- **`tests/wilderness.test.ts`** (new) — population + renderer smoke tests.

### Docs

- **`docs/PLAN-2026-06-30-UI-SIM-POLISH.md`** — pointer stub + historical Phase A/B/C preserved.
- **`docs/EXECUTION-PLAN-2026-06-30-POLISH-25-ITEMS-VP-COO.md`** — pointer stub + historical matrix
  preserved.
- **`docs/MEGA-MASTER-DEEP-DIVE-RESEARCH-REPORT-2026-06-27.md`** — header receipts refreshed.
- **`docs/UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md`** — Pass 10 status banner (wilderness render landed).

### Gate

- `bun run sync` then `bun run check`.

---

## 2026-07-05 (pass 3) — Total audit: perf HUD metrics + doc consolidation + full-core workers (v0.20.0)

Owner brief: comprehensive audit pass — stale markdown, perf observability, device utilization (never
lowering visual fidelity).

### Code

- **`src/ui/perf-hud.ts`** — expanded HUD: frame ms, p95, heap MB, entity/link/wilderness counts, worker
  pool utilization, hardware cores; pure format helpers + tests.
- **`src/main.ts`** — wires `PerformanceMonitor` + `World.getPerfSnapshot()` into HUD (render-layer only).
- **`src/world.ts`** — `getPerfSnapshot()` read-only telemetry for HUD.
- **`src/core/worker-pool.ts`** — use all reported `hardwareConcurrency` cores on capable tiers (wilderness
  offload is best-effort per ADR 0010; core golden unchanged).

### Docs

- **`AGENTS-2026-06-26.md`** — reduced to pointer stub; **`CLAUDE.md`** remains canonical steering.
- **`scripts/sync-surfaces.ts`** — additional present-tense version patterns (`Canonical receipts:`,
  `stands today:`, manifesto `(vX)`, RESEARCH-BEDROCK blockquote).
- **`docs/VERIFICATION-ANALYTICAL-DATA.md`** — §9 closure no longer cites stale `0.18.0` / `92.13%`.

### Gate

- `bun run sync` then `bun run check`.

---

## 2026-07-05 (pass 2) — Receipt drift sweep + worker pool + test index (v0.20.0)

Second audit pass: living reports still carried `1,477` / `92.13%` / `v0.18.0` tokens after the first consolidation.

### Fixes

- **`scripts/sync-surfaces.ts`** — added then-current state-of-the-art, VERIFICATION ledger, former TEST-STRATEGY, and PRD surfaces; expanded receipt patterns (backtick counts, tilde coverage, canonical table rows, `1,477-test`).
- **`docs/VERIFICATION-ANALYTICAL-DATA.md`** — canonical coverage table aligned to `83.95% / 81.57%`.
- **`src/core/worker-pool.ts`** — `executeAsync` returns immediately when pool not initialized (prevents wilderness hang).
- **`src/world.ts`** — lazy `initWorkerPoolAsync()` + proper `dispose()` on worker pool.
- **`tests/README.md`** — former test index later consolidated into VERIFICATION + RUNBOOK.
- **`docs/GOAL5-RESEARCH-RECEIPTS-2026-06-26.md`** — deleted audit doc refs → integration map.

### Gate

- `bun run sync` then `bun run check`.

---

## July 2026 index (compressed — pass 9)

Pre–pass-8 July entries compressed 2026-07-06. Full narrative removed; outcomes indexed.

| Date       | Entry (short)                                | Outcome                                                                 |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| 2026-07-05 | pass 1 Living-docs consolidation             | 9 redundant Tsotchke/perf docs deleted; sync SURFACES expanded          |
| 2026-07-03 | Perf deep dive vs Gemini 3.1 Pro             | Whole-repo perf analysis; roadmap items documented                      |
| 2026-07-03 | Perf follow-through                          | Fonts off critical path; off-screen shader culling                      |
| 2026-07-02 | Performance & load-time audit (V126)         | Two shipped load wins; runtime confirmed already-optimal                |
| 2026-07-02 | TOWER accretion + portal buzz kill (V125)    | Chaotic accretion geometry; nightmare audio fixed                       |
| 2026-07-02 | GOAL8 ten-item owner pass (V123)             | entities-invisible fix; tier ladder; pantheon nav; glyph cortex         |
| 2026-07-02 | TOWER + MONOLITH geometry rebuilds (V124)    | GodColossus + megalith cube/sphere/lattice/void                         |
| 2026-07-02 | MONOLITH redesign (V123)                     | hot-hellish → cold-sublime-prismatic                                    |
| 2026-07-02 | GOAL7 eleven-item (V122)                     | dead-pane root causes; audio doze; BRUTAL entity spectacle              |
| 2026-07-02 | GOAL6 six-item (V120/V121)                   | reset scope; growth; pause; pantheon continuity                         |
| 2026-07-02 | Round 4 coupling experiment (R1)             | selfAware un-rail shipped; two routings measured NULL                   |
| 2026-07-02 | Round 3 reproducibility + scorecard          | artifact sweep; scorecard self-corrections                              |
| 2026-07-02 | Ultracode round                              | 113-system A-Life matrix; AD guards; Tsotchke wire-more; 5 PM artifacts |
| 2026-07-01 | Mega-audit SSOT receipt drift                | Clifford stale-claim fixed; 25-point scrutiny scorecard                 |
| 2026-07-01 | Sandbox secret-leak + GPU leak + convergence | CRITICAL sandbox closed; GPU leak fixed                                 |
| 2026-07-01 | GPU-leak sweep (colossal creatures)          | shoggoths/puppeteers/titans/leviathans dispose()                        |
| 2026-07-01 | Super Creature apex audit                    | pantheon double-beat fixed; comment-theater sweep                       |
| 2026-07-01 | Real-bound body-visual campaign              | instVitals 1–3; titan/wingmen/leviathan/NHI GPU suites de-decorated     |

---

## June 2026 index (compressed — pass 8)

Pre-July entries compressed 2026-07-06. Full narrative removed; outcomes indexed. Point-in-time session
logs deleted per living docs policy (no archives).

| Date       | Entry (short)                                        | Outcome                                                               |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 2026-06-30 | QA pass 3 + Director paranoid audit (62 findings)    | Neon UI validated; determinism worker fix; dompurify bump; gate green |
| 2026-06-30 | QA pass 2 + petri emergence                          | Emergence wiring tests; truth ledger updates                          |
| 2026-06-28 | QA pass + petri/truth                                | Petri routing tests; exterior coverage                                |
| 2026-06-27 | V-HUD / V-TEMPLE / V-MECHA / Copilot                 | HUD readability; temple chaos coupling; ABC surfaced                  |
| 2026-06-27 | V-VITALS 1–3 + titans + wingmen + creature luminance | Per-entity GPU vitals suites; de-decoration campaign                  |
| 2026-06-27 | Singularity O(k); adversarial 9-defect; runtime boot | Force sweep optimized; GPU leaks fixed; app boots verified            |
| 2026-06-27 | UI/UX cross-surface audit                            | 5 visual fixes; parity Local↔GitHub                                   |
| 2026-06-27 | Honesty sweep + shader injection                     | Doc/comment truth; apex-body metalness fix                            |
| 2026-06-27 | Exhaustive 8-partition re-audit                      | 7 cross-surface fixes                                                 |
| 2026-06-26 | Petri active-bug + COUNT audit + subsystem audit     | Active bugs fixed; count constants verified                           |
| 2026-06-26 | Dated MD filenames + deep correctness + consistency  | Reference rewire; quantum/A-life/engine review                        |
| 2026-06-26 | Living-docs policy + A-Life truth + math pass        | Reports rewritten current; unwired leaves labeled                     |
| 2026-06-26 | Line-by-line source audit                            | 8 latent bugs in unwired paths fixed; lint 27→0                       |
| 2026-06-26 | Roadmap P1 harness + coupling scaffold               | Quantum-classical experiment script; structured coupling modulation   |

---

## Canonical report pointers

| Topic            | Living document                                                                    |
| ---------------- | ---------------------------------------------------------------------------------- |
| Facts / receipts | [VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md)               |
| SOTA assessment  | [VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md)               |
| NHSI honesty     | [NHSI-PROGRESS-DASHBOARD-2026-06-26.md](./NHSI-PROGRESS-DASHBOARD-2026-06-26.md)   |
| A-Life matrix    | [PEER-REVIEW-META-ANALYSIS.md](./PEER-REVIEW-META-ANALYSIS.md)                     |
| Tsotchke         | [TSOTCHKE-INTEGRATION-MAP-2026-06-26.md](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md) |
| UI backlog       | [UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md](./UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md)       |
| Benchmarks/bugs  | [BENCHMARKS-2026-06-26.md](./BENCHMARKS-2026-06-26.md)                             |
