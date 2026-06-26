<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Verification Analytical Data — cross-surface fact ledger

**Living index** (not an archive). One place that records every fact duplicated across the repo's
surfaces (MD · HTML · XML · code), its **single source of truth**, and where each surface restates it —
so a drift between the README, the dashboard, a master XML, or a spec page is caught at a glance.
Rewritten in place when the facts change (per the binding "Living docs, no archives" law in
[CLAUDE.md](../CLAUDE.md)). Last reconciled by a full-repo audit pass on **2026-06-26**.

> **How the numbers stay honest:** the version (`package.json`) and the measured receipts +
> NHSI design counts (`scripts/canonical-receipts.ts`) are the ONLY places those facts are edited.
> `scripts/sync-surfaces.ts` propagates them to every surface; `bun run sync:check` and
> `bun run verify:receipts` are gate-enforced (`bun run check`). Never hand-edit a synced token.

---

## 1 · Canonical facts (single source of truth)

| Fact                | Canonical value           | Source of truth                                                                      | Propagated by           |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| Package version     | `0.18.0`                  | `package.json` `version`                                                             | `sync-surfaces.ts`      |
| Test count (floor)  | `1477`                    | `scripts/canonical-receipts.ts`                                                      | `sync-surfaces.ts`      |
| Line coverage       | `95.03%`                  | `scripts/canonical-receipts.ts`                                                      | `sync-surfaces.ts`      |
| Function coverage   | `92.03%`                  | `scripts/canonical-receipts.ts`                                                      | `sync-surfaces.ts`      |
| Faculties (design)  | `100` (~30 deep-wired)    | `CANONICAL_FACULTIES`                                                                | `sync-surfaces.ts`      |
| Archon pantheon     | `25` (5 apex + 20 light)  | `CANONICAL_ARCHONS`                                                                  | `sync-surfaces.ts`      |
| Theory-of-mind orgs | `25`                      | `CANONICAL_TOM_ORGANS`                                                               | `sync-surfaces.ts`      |
| Emergence angles    | `10` (+5 god events)      | `CANONICAL_EMERGENCE_ANGLES`                                                         | `sync-surfaces.ts`      |
| Biologic forms      | `26`                      | `CANONICAL_BIOLOGIC_FORMS`                                                           | `sync-surfaces.ts`      |
| Morphotypes         | `250` live · `100` legacy | `phyla.ts` (`PHYLUM_COUNT 10 × MORPHS_PER_PHYLUM 25`) / `constants.ts` `MORPH_COUNT` | prose (NOT auto-synced) |
| Butlin scorecard    | `8/14 met + 6/14 partial` | measured 2026-06-21 adversarial code audit                                           | prose (NOT auto-synced) |
| Tsotchke corpus     | `20 projects, ~16 wired`  | [TSOTCHKE-INTEGRATION-MAP.md](./TSOTCHKE-INTEGRATION-MAP.md)                         | prose (NOT auto-synced) |
| Entity ceiling      | `50,000` (mega tier)      | `src/core/quality.ts` `resolveTier`                                                  | prose (NOT auto-synced) |
| Apex composite mind | `~10,081` weights         | `src/sim/super-mind.ts`                                                              | prose (NOT auto-synced) |
| Legacy spine        | `~1,444` params           | `src/sim/super-mind.ts` / ADR-0008                                                   | prose (NOT auto-synced) |

### Measured reality (this audit, 2026-06-26, Bun 1.3.14)

- `bun test --coverage` → **2924 pass / 4 fail** before this pass · coverage **95.03% line / 92.03% func**
  (matches canonical exactly). The 2924 vs 1477 gap is **expected**: `CANONICAL_TEST_COUNT` is a
  documented **floor** (PORTABLE_TEST_FLOOR = 1400); `bun test` runs every `*.test.ts` in the working
  tree, and a file-rich local checkout (with nested `.claude/worktrees/` copies) measures far more than
  a clean CI checkout. The receipts law floors against 1400, so any count ≥ 1400 is green.
- The **4 failures** were `documentation link integrity` doc-link checks (see §3, Finding C) — fixed in
  this pass.

---

## 2 · Surface inventory (where shared facts are published)

| Class            | Surfaces                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Root MD          | `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, `HANDOFF-2026-06-26.md`, …   |
| Steering         | `CLAUDE.md`, `AGENTS.md`, `masters/*.xml` (3), `docs/PHILOSOPHY.md`, `docs/MODULE-CONTRACTS.md`   |
| Progress / truth | `docs/NHSI-PROGRESS-DASHBOARD.md`, `docs/reports/2026-06-26-CURRENT-TRUTH-BASELINE.md`            |
| Consciousness    | `docs/PATH-TO-14-14-CONSCIOUSNESS-INDICATORS.md`, `docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md` |
| HTML surfaces    | `index.html`, `docs.html`, `specs.html` (+ `lab/`)                                                |
| Tsotchke         | `docs/TSOTCHKE-INTEGRATION-MAP.md` (authoritative), `THIRD-PARTY-NOTICES.md`                      |
| Diagrams         | `docs/ERD.md`, `docs/ERM.md`, `docs/ERP.md`, `docs/ARCHITECTURE.md`                               |

---

## 3 · Audit findings (2026-06-26)

| #   | Severity                   | Where                             | Issue                                                                                                                                                                                          | Resolution                                                                                               |
| --- | -------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A   | **P0 gate-RED**            | `.github/copilot-instructions.md` | markdown tables collapsed by the external `hacklm-memory` tool → fails `prettier --check` (first gate stage) in the working tree                                                               | `prettier --write` (re-pad tables)                                                                       |
| B   | reconciled (not a bug)     | `scripts/canonical-receipts.ts`   | `CANONICAL_TEST_COUNT = 1477` vs measured 2924                                                                                                                                                 | floor semantics confirmed correct; 1477 is the published headline floor                                  |
| C   | **P0 gate-RED**            | `CHANGELOG.md`, `docs/KANBAN.md`  | 3 dead relative links into the deleted `docs/audit-2026-06-15/` folder (consolidated into AUDIT-LOG by `e51a376`)                                                                              | repoint to `docs/AUDIT-LOG.md`                                                                           |
| C2  | P1 test-hygiene            | `tests/doc-links.test.ts`         | `SKIP` set omitted `.claude/` → the test scanned nested worktree copies and false-failed                                                                                                       | add `.claude`, `legacy`, `site`, `coverage` to `SKIP`                                                    |
| D   | P1 doc-rot                 | `docs/KANBAN.md`                  | mojibake: `×11/`×7/``×1 (orphaned-emoji fragments), `—`×34 used as `—`, plus `¦`/`–`/`©º`— slipped the encoding gate (orphaned fragments aren't double-encoding;`U+201D` is a legit codepoint) | byte-precise normalize: drop corrupted emoji prefixes, restore `—`/`–` separators                        |
| E   | P2 count-drift             | `docs/KANBAN.md:17`               | "ALL **19** Tsotchke repos" — only outlier vs the canonical "20 corpus projects" everywhere                                                                                                    | `19 → 20`                                                                                                |
| F   | flag (history)             | `HANDOFF-2026-06-26.md`           | a dated **2026-06-19** daily-run report framed as "Current repo status" (942 tests / v0.10.4)                                                                                                  | left as historical snapshot (editing the numbers would falsify the 2026-06-19 record); not current truth |
| G   | flag (cleanliness)         | repo root                         | stray debug logs tracked at root (`.gate.log`, `.gate.baseline.log`, `.audit-gate.log`, `law.log`, `law_error.txt`, `tsc.log`, `tscout.txt`, `receipts_print.txt`)                             | noted for cleanup                                                                                        |
| H   | flag (fidelity, not a bug) | `src/math/curvature-aware-qng.ts` | `computeChristoffelSymbols` sets `dg=0`, so the general N×N "curvature-aware" path reduces to ordinary QNG                                                                                     | honestly documented as a simplification; no NaN / wrong shape; noted so the caveat is visible            |

**Finding D2 — master governance XML mojibake (root cause + fix).** All three `masters/*.xml` files
(the EXECUTOR / ARCHITECT / PHYSICIST steering docs read before every change) each carried ~150
box-drawing `═` rules double-encoded into `â•` runs, plus `â€"`→`—`, `·`→`·`, `â†'`→`→`. Root cause:
`scripts/normalize-docs.ts` globbed `.md` + the 3 HTML files but **not `masters/*.xml`**, and the
`docs-truth-law` encoding gate scanned only the `.md` CANONICAL list + HTML — so XML corruption shipped
with green CI. Fix: normalize-docs now globs `masters/**/*.xml` + `docs/**/*.xml` (repaired all 3, byte-
verified clean), and a new `docs-truth-law` block encoding-gates the steering XML + KANBAN against
mojibake / U+FFFD / sub-lead-byte / curly-quote corruption.

### Code audit (core math / sim / AI) -- initial hand-review (see §5 for the deeper pass that found + fixed real defects)

A line-by-line review of `src/math/**` and `src/sim/**` (hand-verified against standard formulas, not
docstrings) initially reported no P0/P1 bugs (a deeper 7-agent pass in §5 did find several). Quantum gates / Born rule / Bloch vector, mulberry32 +
FNV-1a RNG, Aaronson–Gottesman Clifford tableau, mixed-state QGT (Im sign + entropy), QGT / natural
gradient, SO(3) quaternion algebra, Crank–Nicolson Schrödinger, Jacobi SVD / MPS, Wigner-d / Clebsch–
Gordan / 6j / 9j, coherence / magic / GWT, spin-glass, criticality, Fubini–Study aliveness, HRR
holographic memory (unbind keeps the real-valued trace, not `sign()`), economy Vickrey/transfer — all
verified correct. **Determinism law holds:** no `Math.random` / `Date.now` / `performance.now` in
`src/sim/**` or `src/math/**` logic (the one allowed `world.ts` super-evo localStorage timestamp is
outside sim logic). Only fidelity caveat = Finding H above.

Consistency that **passed** verification (no drift found): Butlin `8/14 met + 6/14 partial` (every
current surface; the only `14/14` hits are in `legacy/` verbatim-preserved files + append-only CHANGELOG
history with the correction logged), version `0.18.0` (all current markers), entity `50,000`, bioforms
`26`, faculty/Archon/ToM/emergence counts, Tsotchke `20`.

---

## 4 · Reconciliation — "rename every MD with the current date"

The `/goal` asked to "update the name (with current date) of every MD file"; the owner confirmed they
want **both** the dated rename and a non-breaking repo ("make sure they don't break — figure it out").

**Done (2026-06-26):** the **24 pure-content docs that are safe to rename** were `git mv`'d to dated
names (`X-2026-06-26.md`) and **every reference rewired** across all tracked text files — verified **0
broken links** repo-wide (`tests/doc-links.test.ts` green), `tsc` clean, `sync:check` green, FILE-MAP
regenerated. Each also carries the in-content `reviewed: 2026-06-26` stamp.

**Kept at their canonical names — renaming WOULD break, which the owner's "don't break" forbids:**

- **GitHub / agent-special** (read by exact name): `README.md` (front-page render), `CHANGELOG.md`,
  `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `THIRD-PARTY-NOTICES.md`,
  `CLAUDE.md` + `AGENTS.md` (loaded by the agent harness), `ROADMAP.md`, sub-dir `README.md`s,
  `index.html` / `docs.html` / `specs.html` (GitHub Pages), `.github/**`, `.memory/**` (hacklm tool).
- **Hardcoded in scripts / gates** (`sync-surfaces.ts`, `docs-truth-law.test.ts`, `gen-filemap`):
  `ARCHITECTURE`, `KANBAN`, `ERD`/`ERM`/`ERP`, `MODULE-CONTRACTS`, `FILE-MAP`, `TECHNICAL-SPECIFICATION`,
  `PHILOSOPHY`, `NHSI-PROGRESS-DASHBOARD`, `PATH-TO-14-14-…`, `SUPER-CREATURE-RESEARCH`, `BENCHMARKS`,
  `CORPUS_INTEGRATION_REPORT` — renaming reds the gate / breaks the live sync machinery.
- **Convention-critical / heavily-linked**: `AUDIT-LOG.md`, this ledger, `TSOTCHKE-INTEGRATION-MAP.md`.
- **Numbered ADRs** (`docs/adr/000X-*`, referenced as "ADR-0009"), **legacy/** (verbatim), and
  **already-dated** files (`docs/reports/2026-*`, `docs/DAILY_RUNS/*`, the `-2026-06-1x/20` audits) whose
  filename date is their meaningful point-in-time record.

For the kept set, the in-content `reviewed: 2026-06-26` stamp supplies the current date without breaking
the repo — the maximal literal compliance consistent with "don't break."

---

## 5 · Code-audit update (deeper 7-agent pass, 2026-06-26)

The §3 "code audit — CLEAN" line was an earlier hand-review. A deeper 7-subsystem MIT-master audit (137
files, verified against references rather than docstrings) found and **FIXED** real defects it had missed:

- **HIGH — `src/math/irrep.ts` `wigner6j` / `wigner9j`:** wrong for `j >= 7`. The Racah sum needs ~33! at
  j=8, but the linear factorial table topped out at 25! and silently dropped terms, so `{8 8 8;8 8 8}`
  returned `4.2e-12` vs the true `-1.265e-2` (wrong sign). **FIXED** by rewriting in log-factorial space
  (exact across j=1..8) + a regression test. (Today only reachable via the dead `tsotchke-deep-wire.ts`,
  but the module advertised `IRREP_J_MAX = 8`.)
- **HIGH — `src/sim/super-mind.ts` `quantumMagic`:** fed a malformed amplitude vector (`re = sqrt(p)`
  magnitudes only, `im = sin(phase)` phase only — neither the real amplitudes nor normalized), feeding
  `reflex` → attention schema + jewel shader. **FIXED** by using `snap.magicNorm`, already computed on the
  true register amplitudes in `super-qubits.ts`.
- **HIGH — `src/sim/super-body.ts` `dispose()`:** freed only 3 of 9 owned materials → a recurring WebGL
  leak on every body teardown / world reset. **FIXED** by disposing every material in the traverse
  (leak-safe; three.js `dispose()` is idempotent for the few materials shared across sibling meshes).
- **MED — all four now FIXED (regression-tested where observable):**
  - `src/sim/mortality.ts` — `reproduce()` could drive `lifespan` negative (cost 100 × N), making
    `age/lifespan` produce `NaN`/negative in `legacyScore`, `lifespanProgress`, `urgency`. **FIXED:** floor
    lifespan at 1 on reproduce + guard the divisor with `Math.max(1, …)`. New `tests/mortality.test.ts`.
  - `src/sim/petri-dish.ts` — the brutal-god release called `applyBrutalRelease(rel, state.biologics.map(…))`
    on a throwaway copy, so its consume/rebirth/drain mutations were discarded (effect dead). **FIXED:**
    normalize the live `state.biologics` in place and pass them by reference; fold `outcome.warp` into godPower.
  - `src/sim/emergence-angles.ts` — five append-only history arrays (`exchangeHistory`, `warHistory`,
    `fracturePoints`, `chaosEvents`, `transcendenceEvents`) grew unbounded though only `.length` (and chaos's
    distinct-type set) was ever read. **FIXED:** replaced with O(1) counters + a `Set` for chaos types — same
    metrics, bounded memory. Regression test asserts saturation + distinct-type contract under 4–5k iterations.
  - `scripts/harvest-tsotchke-corpus.ts` — `readdirSync` walk order is filesystem-dependent but feeds the
    committed `ESK_SAMPLE_PROGRAMS` list. **FIXED:** sort entries by name → reproducible across machines/OSes.

Everything else the §3 review listed (Born rule, Bloch, Clifford tableau, mixed-state QGT, SO(3),
Crank–Nicolson, SVD/MPS, coherence, GWT, spin-glass, HRR, the determinism law) remains verified correct.
The standalone `docs/VERIFICATION-MATRIX.md` draft was folded into this ledger and removed (one source).

**Cross-surface consistency fixes (this pass):**

- **Codebase metrics (TECH-SPEC §1):** were badly stale + self-contradictory (claimed 108 src files /
  35,226 LOC; actual 196 / 57,687) with placeholder-garbage rows. Replaced with measured truth + a new
  deterministic generator `scripts/codebase-metrics.ts` (`bun run metrics`) so they refresh instead of
  rotting. LOC is a dated snapshot, not gate-pinned (it moves every commit); coverage/test counts stay
  SSOT-synced.
- **Morphotype framing (canonical row added above):** the live default is **250** (phylum mode:
  `PHYLUM_COUNT 10 × MORPHS_PER_PHYLUM 25`, the path `world.ts` actually boots); **100** is the legacy
  no-phyla `MORPH_COUNT`. The count is **tier-independent** — tiers scale the entity ceiling, not the
  morphotype table. Two MODULE-CONTRACTS lines wrongly said "250 per phylum … scaled down per tier" —
  corrected to ground truth. All other surfaces (README/ARCHITECTURE/ERD/ERM/ENTITY-SHEETS) already say
  "250 (10 phyla × 25)" and are correct.

---

## 6 · Second-auditor addendum (2026-06-26)

Confirms §5 and adds four items §5 did not cover:

- **`src/sim/tsotchke-deep-wire.ts:146` `moonlabBlochToState`** clamped Bloch `z` with `clamp01`
  (`[0,1]`), folding the southern hemisphere (`z<0`) onto the equator. Fixed to `clamp(-1,1)`. (The
  module is dead/unused per §5; the fix keeps it correct regardless. Dropped the now-unused `clamp01` import.)
- **`src/math/libirrep-symmetry.ts`** — added a prominent NOT-WIRED / APPROXIMATE header: its
  Clebsch-Gordan / Wigner-D / spherical-harmonic bodies are coarse placeholders, never imported by
  sim/cognition; the exact, test-verified math is `irrep.ts` (the file §5 hardened for j>=7). Prevents
  future mis-wiring.
- **`HANDOFF.md` + `research_receipts.md`** — were stale present-tense (v0.10.4 / 942-1183 tests).
  Added historical banners pointing to current truth (`canonical-receipts.ts` / the dashboard).
- **FLAG (Butlin membership):** the headline `8/14 met + 6/14 partial` is consistent everywhere, but the
  prose enumerations disagree on _which_: `reports/2026-06-21-NHSI-HONESTY-AUDIT.md:183-184` lists **9**
  met names; `PATH-TO-14-14:5` lists only 5 explicit partials. The repo meets _9/14 by its own
  enumerations_ yet headlines a conservative _8_. Which single indicator is borderline (AST-1 or RPT-1)
  is an **owner ruling**; the 8/14 floor is kept everywhere until then.

---

## 7 · Repo-wide invariant sweep (every `src/` file, 2026-06-26)

Beyond the deep per-module reads, a systematic pattern sweep across **all 196 `src/` files** for the
exact bug-classes already found this audit. Result: the codebase is clean on each; recording the
methodology + the architectural facts so future audits don't re-chase the false positives.

- **Determinism (banned `Math.random` / `Date.now` / `performance.now` in `sim`/`math`/`core`):** 0 real
  violations — every hit is a docstring asserting purity. The seeded `Rng` discipline holds repo-wide.
- **Unbounded growth (append-only arrays in long-lived state):** all bounded. `emergent-language.signs`
  caps at `maxSigns`; `self-evolution-loop.history` shifts at 500; `economy.dQ/dI/nw` are per-agent
  parallel arrays (bounded by the fixed roster); `analytics.values` is length-assigned, not pushed.
  The 5 `emergence-angles` arrays were the one real leak — fixed (`4e2d6fb`).
- **three.js dispose leaks:** the `creates ≫ disposes` heuristic flags many files, but **most are not
  leaks.** `engine.dispose()` calls `renderer.forceContextLoss()`, which frees the **entire** GL context
  on HMR — so boot-once systems (`environment` 35 creates / 0 disposes, `geometry-cache` 41/0 by design,
  `titans`, `atmosphere`, `viz3d`, …) need no per-object dispose; they live for the page and the context
  is nuked wholesale at teardown. Per-object `dispose()` only matters for systems **rebuilt mid-sim in the
  live context**. Those were verified balanced: `singularities` tracks every aura/photon/glow/particle in
  `extras`/`extraMats` and frees them on despawn; `super-body` was the lone real gap (freed only 3 of 9
  materials) — fixed (`a6b67ce`). **Rule for future audits: a high create/dispose ratio is only a leak if
  the meshes are rebuilt during the run; boot-once GPU resources are covered by `forceContextLoss`.**
- **Time complexity (the entity hot path):** no accidental O(n²) over the 50,000-entity population — the
  main loop uses the spatial hash (O(n), proven by `bench/scale.ts`: 50k in ~60 ms). Every O(n²) in the
  tree is over a **small fixed** collection: faculties pairwise coupling (n=100 → 10k ops),
  `factions.ts` `n×n` weight matrix (n=8), per-faculty/archon/qubit kernels (≤100/25/6). The high-loop
  files (`super-mind`, `libirrep-qec`, `nqs-vmc-learning`, `tom-pantheon`) iterate these fixed sizes, not
  the population — so they are O(constant), not O(entities). No quadratic blow-up reachable at scale.

## 8 · Automated cross-surface fact auditor (`bun run verify:facts`, 2026-06-26)

The §1 canonical table is now backed by a **tool**, not just hand-checking:
[`scripts/verify-canonical-facts.ts`](../scripts/verify-canonical-facts.ts) scans **every** tracked
MD/HTML/XML surface for each canonical fact (Butlin `X/14`, entity ceiling, morphotypes, Tsotchke count,
faculties, Archons, ToM) and flags any occurrence stating a non-canonical value. The synced receipts
(version/tests/coverage/NHSI counts) are already gate-policed by `sync-surfaces` + `docs-receipts-law`;
this covers the **prose** facts those don't. It reports for human triage (prose carries legitimate
multi-framings — `5 apex` / `25 pantheon`, `~20 active` / `100 design` — which are allow-listed) and
excludes point-in-time records (`reports/2026-*`, `ln/`, `DAILY_RUNS/`, `CHANGELOG`, `AUDIT-LOG`).

**Current result: 0 drift across all 80 surfaces.** Building it surfaced one real bug —
`MODULE-CONTRACTS.md:1597` said "all **1.1** faculties" (the Super-Creature _version_ mis-rendered as a
count) → fixed to **100**; and a stale `100/144` note in `.memory/quirks.md` → `100` (no surface ever
claimed 144). Run after any doc edit that touches a headline number.
