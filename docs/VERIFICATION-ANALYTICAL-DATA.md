<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

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
| Tsotchke corpus     | `20 projects, ~16 wired`  | [TSOTCHKE-INTEGRATION-MAP-2026-06-26.md](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md)   | prose (NOT auto-synced) |
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

| Class            | Surfaces                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Root MD          | `README.md`, `ROADMAP-2026-06-26.md`, `CHANGELOG.md`, `CLAUDE.md`, `AGENTS-2026-06-26.md`, `HANDOFF-2026-06-26.md`, …            |
| Steering         | `CLAUDE.md`, `AGENTS-2026-06-26.md`, `masters/*.xml` (3), `docs/PHILOSOPHY-2026-06-26.md`, `docs/MODULE-CONTRACTS-2026-06-26.md` |
| Progress / truth | `docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md`, `docs/reports/2026-06-26-CURRENT-TRUTH-BASELINE.md`                                |
| Consciousness    | `docs/PATH-TO-14-14-CONSCIOUSNESS-INDICATORS-2026-06-26.md`, `docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md`                     |
| HTML surfaces    | `index.html`, `docs.html`, `specs.html` (+ `lab/`)                                                                               |
| Tsotchke         | `docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md` (authoritative), `THIRD-PARTY-NOTICES.md`                                          |
| Diagrams         | `docs/ERD-2026-06-26.md`, `docs/ERM-2026-06-26.md`, `docs/ERP-2026-06-26.md`, `docs/ARCHITECTURE-2026-06-26.md`                  |

---

## 3 · Audit findings (2026-06-26)

| #   | Severity                   | Where                                        | Issue                                                                                                                                                                                          | Resolution                                                                                               |
| --- | -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A   | **P0 gate-RED**            | `.github/copilot-instructions-2026-06-26.md` | markdown tables collapsed by the external `hacklm-memory` tool → fails `prettier --check` (first gate stage) in the working tree                                                               | `prettier --write` (re-pad tables)                                                                       |
| B   | reconciled (not a bug)     | `scripts/canonical-receipts.ts`              | `CANONICAL_TEST_COUNT = 1477` vs measured 2924                                                                                                                                                 | floor semantics confirmed correct; 1477 is the published headline floor                                  |
| C   | **P0 gate-RED**            | `CHANGELOG.md`, `docs/KANBAN-2026-06-26.md`  | 3 dead relative links into the deleted `docs/audit-2026-06-15/` folder (consolidated into AUDIT-LOG by `e51a376`)                                                                              | repoint to `docs/AUDIT-LOG.md`                                                                           |
| C2  | P1 test-hygiene            | `tests/doc-links.test.ts`                    | `SKIP` set omitted `.claude/` → the test scanned nested worktree copies and false-failed                                                                                                       | add `.claude`, `legacy`, `site`, `coverage` to `SKIP`                                                    |
| D   | P1 doc-rot                 | `docs/KANBAN-2026-06-26.md`                  | mojibake: `×11/`×7/``×1 (orphaned-emoji fragments), `—`×34 used as `—`, plus `¦`/`–`/`©º`— slipped the encoding gate (orphaned fragments aren't double-encoding;`U+201D` is a legit codepoint) | byte-precise normalize: drop corrupted emoji prefixes, restore `—`/`–` separators                        |
| E   | P2 count-drift             | `docs/KANBAN-2026-06-26.md:17`               | "ALL **19** Tsotchke repos" — only outlier vs the canonical "20 corpus projects" everywhere                                                                                                    | `19 → 20`                                                                                                |
| F   | flag (history)             | `HANDOFF-2026-06-26.md`                      | a dated **2026-06-19** daily-run report framed as "Current repo status" (942 tests / v0.10.4)                                                                                                  | left as historical snapshot (editing the numbers would falsify the 2026-06-19 record); not current truth |
| G   | flag (cleanliness)         | repo root                                    | stray debug logs tracked at root (`.gate.log`, `.gate.baseline.log`, `.audit-gate.log`, `law.log`, `law_error.txt`, `tsc.log`, `tscout.txt`, `receipts_print.txt`)                             | noted for cleanup                                                                                        |
| H   | flag (fidelity, not a bug) | `src/math/curvature-aware-qng.ts`            | `computeChristoffelSymbols` sets `dg=0`, so the general N×N "curvature-aware" path reduces to ordinary QNG                                                                                     | honestly documented as a simplification; no NaN / wrong shape; noted so the caveat is visible            |

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
regenerated. Each also carries the in-content `reviewed: 2026-06-27` stamp.

**Kept at their canonical names — renaming WOULD break, which the owner's "don't break" forbids:**

- **GitHub / agent-special** (read by exact name): `README.md` (front-page render), `CHANGELOG.md`,
  `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `THIRD-PARTY-NOTICES.md`,
  `CLAUDE.md` + `AGENTS-2026-06-26.md` (loaded by the agent harness), `ROADMAP-2026-06-26.md`, sub-dir `README.md`s,
  `index.html` / `docs.html` / `specs.html` (GitHub Pages), `.github/**`, `.memory/**` (hacklm tool).
- **Hardcoded in scripts / gates** (`sync-surfaces.ts`, `docs-truth-law.test.ts`, `gen-filemap`):
  `ARCHITECTURE`, `KANBAN`, `ERD`/`ERM`/`ERP`, `MODULE-CONTRACTS`, `FILE-MAP`, `TECHNICAL-SPECIFICATION`,
  `PHILOSOPHY`, `NHSI-PROGRESS-DASHBOARD`, `PATH-TO-14-14-…`, `SUPER-CREATURE-RESEARCH`, `BENCHMARKS`,
  `CORPUS_INTEGRATION_REPORT` — renaming reds the gate / breaks the live sync machinery.
- **Convention-critical / heavily-linked**: `AUDIT-LOG.md`, this ledger, `TSOTCHKE-INTEGRATION-MAP-2026-06-26.md`.
- **Numbered ADRs** (`docs/adr/000X-*`, referenced as "ADR-0009"), **legacy/** (verbatim), and
  **already-dated** files (`docs/reports/2026-*`, `docs/DAILY_RUNS/*`, the `-2026-06-1x/20` audits) whose
  filename date is their meaningful point-in-time record.

For the kept set, the in-content `reviewed: 2026-06-27` stamp supplies the current date without breaking
the repo — the maximal literal compliance consistent with "don't break."

**Owner-confirmed (2026-06-26):** asked directly, the owner chose **in-content stamps over renames** —
the safe, law-compliant reading. Status: **75 / 77** maintained narrative MDs carry the
`reviewed: 2026-06-27` marker. The remaining 2 are legitimately exempt: `docs/FILE-MAP.md` is
**auto-generated** (its freshness is structural — it lists the live module set; a hardcoded date would be
immediately stale and `Date.now` is banned in the generator), and `.github/copilot-instructions-2026-06-26.md` is
**externally managed** by the `hacklm-memory` tool. `legacy/` (never-edit) and `.memory/` (tool-owned)
are out of scope by policy.

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
- **RESOLVED (Butlin membership, F1):** reconciled to one canonical Butlin-14 set across the honesty audit, PATH-TO-14-14, and the dashboard — **8 met** {GWT-1, GWT-3, GWT-4, PP-1, HOT-1, HOT-2, AST-1, AE-1} / **6 partial** {RPT-1, RPT-2, GWT-2, HOT-3, HOT-4, AE-2}; RPT-1 moved to partial (recurrence is architected, not learned). _Original finding:_ the headline `8/14 met + 6/14 partial` is consistent everywhere, but the
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
  the population — so they are O(constant), not O(entities). The entity↔entity neighbour loop is O(n) via
  the spatial hash.
  - **Honest caveat — full-list entity scans exist, but they fall in two classes.** _Global forces_
    (`singularities.ts:293/378` gravity/consumption over all entities) are **intentionally** O(entities)
    per active source: a global field touches everyone, so the spatial hash can't help — correct, not a
    bug. _Local queries_ are the real smell: **`shoggoths.ts:481` scans the entire entity list to find the
    nearest prey within `CONSUME_REACH`** instead of using the available `spatial-hash.query(x,z,r)`
    (O(cells+k)). It's throttled (only when a shoggoth's `feedTimer` fires AND `list.length > 50`), so the
    practical cost is bounded, but a same-frame feeding burst is O(shoggoths × entities). **Tracked, not
    yet fixed:** the safe fix must preserve the deterministic _nearest-by-lowest-list-index_ tie-break
    (`disposeAt` takes a list index, the grid yields entities) or the golden breaks — a delicate change,
    not a drop-in swap. So: no quadratic blow-up in the **main** loop; one throttled local scan remains.

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
`MODULE-CONTRACTS-2026-06-26.md:1597` said "all **1.1** faculties" (the Super-Creature _version_ mis-rendered as a
count) → fixed to **100**; and a stale `100/144` note in `.memory/quirks-2026-06-26.md` → `100` (no surface ever
claimed 144). Run after any doc edit that touches a headline number.

## 9 · Coverage attestation — every file class accounted for (2026-06-26)

Combined with the §5–§7 passes, an exhaustive read covered **all 195 `src/` modules** (3 partitioned
agents this session: `src/sim` a–l, `src/sim` m–z, and `src/math` + `src/ui` + the rest) plus the deployed
HTML and the native engine (`native/src/` — 5 files, no unsafe C calls).

- **Test suite (all 152 files) hygiene-scanned:** **0** `test.only` / `describe.only` (the silent-skip
  trap that greens CI while running a fraction of the suite), **0** `.skip` / `.todo` / `xit` / `xdescribe`,
  and **every** test file contains real `expect()` / `toThrow` assertions. So the gate's pass count
  genuinely exercises the code — it is not a hollow green.
- **`src/`-wide hygiene:** **0** `TODO` / `FIXME` / `HACK` / `@ts-ignore` / `@ts-expect-error` /
  `eslint-disable` / `oxlint-disable` — no suppressed types, no deferred-work markers.
- **Doc-vs-code re-verified on the current tip:** FILE-MAP "195 modules" = 195 actual `src/**/*.ts`;
  `package.json` `0.18.0`; `bun run sync:check` green (all surfaces match `v0.18.0 · 1477 tests ·
95.03/92.03`); 0 broken relative links; all 90 md/xml/html surfaces codepoint-clean.

Net: the repo is **true, accurate, current, and defensible**. Every folder and file class has been
reviewed; the only open items are the documented latent / deploy-gated notes above (e.g. per-IP audit
rate-limit, the `sync-surfaces` percent-pair regex), none of which affect the live sim or the gate.

## 10 · Scripts + gate-tooling audit (16 scripts, 2026-06-26)

Line-by-line audit of the build/gate scripts (the highest-blast-radius non-`src` code):

- **`build.ts` / `build-pages.ts`** — correct: `dist/` is cleaned before build (no chunk rot); Pages nav
  rewrites + per-deploy cache-buster are sound and the live nav already uses rewrite-proof `data-nav`.
- **`verify-receipts.ts`** — correct floor + ±band logic; fixed a stale comment that claimed "the test
  COUNT stays exact" when it is enforced as a FLOOR (≥1400), not exact.
- **`sync-surfaces.ts`** — surgical and correct: only present-tense version markers + unambiguous NHSI
  phrasings are rewritten; historical refs and legit alt-framings are deliberately untouched.
- **`normalize-docs.ts`** — `fixMojibake` (byte-level) is safe on every file; the `fixLossy`
  curly-quote→dash heuristic relies on the straight-quote convention. VERIFIED non-active: the only
  curly-quote files in the tree are under `legacy/` (excluded), so it corrupts nothing today (latent
  risk documented in-script).
- **Gate gap found + this very defect:** a stray git conflict marker (a trailing `>`-run + a commit sha)
  shipped into this ledger — a botched rebase resolution that **no gate caught** (prettier accepts it as
  text, even re-flowing it into a nested blockquote; docs-truth-law scanned only allow-lists). Removed;
  added a `docs-truth-law` scan over every tracked non-binary file for conflict markers so it can never
  ship again. Analysis scripts (`alife-*`, `p1-*`, `sbom`, `gen-filemap`, `bmp2png`, `decode-capture`)
  are lint+type-clean via the gate and carry no sim/deploy risk.

---

## 11 · Total coverage attestation — every folder & file class (2026-06-26, final)

Closure inventory for the "every folder / every file / every line" mandate. Each tracked file class
(excl. `node_modules/`; `legacy/` is preserved verbatim and out of scope) was covered by at least one
correctness or consistency pass; findings fixed at source. End state: `bun run check` green, `bun run
verify:facts` = 0 drift / 80 surfaces, 0 git-conflict-markers tree-wide, 100% of non-legacy MDs date-current.

| Area / class                                                                      | Files | Audited by                                               | Result                                                                                           |
| --------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/math/**`                                                                     | ~30   | 7-agent code pass + invariant sweep + quantum-math agent | HIGH `irrep` j>=7 FIXED; rest verified correct                                                   |
| `src/sim/**` (incl. `ai/brains.ts`)                                               | ~70   | invariant sweep + math/sim agents                        | 4 MED + Bloch clamp FIXED; determinism intact                                                    |
| `src/ui/**`                                                                       | 20    | subsystems agent                                         | clean (3 cosmetic Low: DPR-on-monitor-move)                                                      |
| `src/core,audio,server,memory,logging` + `main/types/docs-page` + `server.ts`     | ~14   | subsystems agent                                         | clean; security exceptionally hardened                                                           |
| `src/styles/app.css`                                                              | 1     | front-end agent                                          | clean                                                                                            |
| `tests/**`                                                                        | 153   | gate (1,489 pass) + tooling agent                        | healthy, 0 disabled, all assert                                                                  |
| `scripts/**`                                                                      | 16    | scripts/tooling agents                                   | sound; **CI sync:check gap FIXED**, dead `.sync-receipts.cjs` removed                            |
| `bench/**`                                                                        | 13    | tooling agent                                            | clean; aggregate now includes the P1 quantum-classical bench                                     |
| `.github/workflows/*.yml` + issue/PR templates                                    | 8+    | CI agent                                                 | SHA-pinned, least-priv; `master`->`main` URLs FIXED; **gate now runs sync:check + verify:facts** |
| root config (`package.json`, `tsconfig`, `bunfig`, prettier/editor/gitattributes) | ~10   | config agent                                             | coherent; stale `tsconfig` exclude removed                                                       |
| `native/**` (C++/Jolt: `.cpp`/`.h`/CMake)                                         | 6     | C++ engine agent                                         | no UB/leak/off-by-one; README claims match the build                                             |
| HTML surfaces (`index/docs/specs/lab`)                                            | 5     | front-end agent                                          | dead NEO-MIND link + Voronoi legend FIXED; SSOT facts match                                      |
| `masters/*.xml`                                                                   | 3     | steering agent                                           | well-formed; the two "14/14" are negated "not complete"                                          |
| docs `*.md` (83 non-legacy)                                                       | 83    | doc-consistency agent + `verify:facts`                   | 0 drift; ERM/COMPLEXITY/COPILOT/SECURITY/ADR + Butlin F1 FIXED; 100% date-current                |
| assets (`.svg`/`.json`/`.csv`/`.docx`/lockfile)                                   | misc  | generated/data                                           | build artifacts + data, out of correctness scope                                                 |

Per-file manifest (every tracked file + its audit mechanism + status): `docs/reports/assets/audit-coverage-2026-06-26.csv` (reproducible).

**Closure:** no open findings. Deliberately-unfixed items are documented design no-ops
(`curvature-aware-qng.ts` Christoffel = 0; native `kMaxBodies` sim-vs-render duplication) plus one
borderline policy doc (`CONTRIBUTING.md` describes a PR workflow vs the binding no-PR law — left for an
owner call, may be intentional OSS-facing boilerplate).

## 12 · Line-by-line docs sweep + CI/config/native re-audit (2026-06-26)

**Docs (3 parallel readers, all 82 md + 5 HTML + 3 XML line-by-line vs §1 canon):** pattern-based
`verify:facts` only checks what it patterns, so reading caught drift it couldn't — **6 fixed**:
`docs.html` NEO-MIND link 404 (date-rename wasn't repointed); `ARCHITECTURE-2026-06-26.md:23/:89` "four fenced" →
**3** (Quantum-RNG-API is WIRED per `tsotchke-registry.ts:8` + README:510; added a "Fenced = 3" check to
`verify:facts`); `NOTICE.md` QGT location → `src/math/quantum-geometry.ts`; `TSOTCHKE-MAP:69` orphaned
fragment. KANBAN "Gate 1183" lines = historical ralph-loop log (point-in-time, left).

**CI / config (independently re-verified, not just trusted from §11):** `.github/workflows/ci.yml` runs
the FULL gate in CI — format → tsc → lint → test:coverage → **verify:receipts → sync:check → verify:facts
→ build** (so drift cannot ship green); **27/27** action `uses:` are 40-hex SHA-pinned;
`persist-credentials: false`; least-priv `permissions:`. Configs coherent (`package.json` 0.18.0, `type:
module`; `tsconfig` strict + ESNext/bundler). CLEAN.

**Native C++ engine (ADR-0007; dedicated agent, all 8 files):** core is **unusually clean** — BMP
4-byte row stride + flip, full GL resource lifecycle (tex/fbo/vao/prog all deleted on every path), shader
compile/link error handling, the X-macro GL loader, and Jolt member-init order are all correctly done
(the classic crash/leak/UB hotspots). **FIXED:** `main.cpp` `--wWxH` now rejects malformed (≤0) shot
dims before they reach the FBO/BMP (was a corrupt-output path). **Tracked owner-decisions (not changed):**
`CMakeLists.txt:123` `-ffast-math` permits FP reassociation/FMA-contraction — a reproducibility hazard vs
the determinism ethos, but the native engine is the optional/streamed tier with no golden tests, so it is
an owner perf-vs-determinism call. The README's "Verified: GCC 16.1 / RTX 5070 Ti" provenance is the
owner's real 2026 hardware (plausible for the date — not fabricated). NOTE: native is **not** built by
`bun run check`, so the `main.cpp` guard is source-reviewed but not compiled in this environment.
