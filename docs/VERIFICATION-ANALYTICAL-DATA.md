<!-- reviewed: 2026-07-11 | V4 Phase-A current-truth pass | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Verification Analytical Data ΓÇö cross-surface fact ledger

**Living index** (not an archive). One place that records every fact duplicated across the repo's
surfaces (MD ┬╖ HTML ┬╖ XML ┬╖ code), its **single source of truth**, and where each surface restates it ΓÇö
so a drift between the README, the dashboard, a master XML, or a spec page is caught at a glance.
Rewritten in place when the facts change (per the binding living-doc law in
[CLAUDE.md](../CLAUDE.md)). Last reconciled by a publication-surface current-truth pass on
**2026-07-11** (┬º1 plus the V4 Phase-A result and preserved V3 predecessor).

> **How the numbers stay honest:** the version (`package.json`) and the measured receipts +
> NHSI design counts (`scripts/canonical-receipts.ts`) are the ONLY places those facts are edited.
> `scripts/sync-surfaces.ts` propagates them to every surface; `bun run sync:check` and
> `bun run verify:receipts` are gate-enforced (`bun run check`). Never hand-edit a synced token.

---

## 1 ┬╖ Canonical facts (single source of truth)

| Fact                                          | Canonical value                                                                                                                                                                              | Source of truth                                                                                                                                                                             | Propagated by           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Package version                               | `0.21.13`                                                                                                                                                                                    | `package.json` `version`                                                                                                                                                                    | `sync-surfaces.ts`      |
| Test count (exact tracked suite)              | `2964`                                                                                                                                                                                       | `scripts/canonical-receipts.ts`                                                                                                                                                             | `sync-surfaces.ts`      |
| Line coverage                                 | `84.64%`                                                                                                                                                                                     | `scripts/canonical-receipts.ts`                                                                                                                                                             | `sync-surfaces.ts`      |
| Function coverage                             | `82.21%`                                                                                                                                                                                     | `scripts/canonical-receipts.ts`                                                                                                                                                             | `sync-surfaces.ts`      |
| Faculties (design)                            | `100` (~30 deep-wired)                                                                                                                                                                       | `CANONICAL_FACULTIES`                                                                                                                                                                       | `sync-surfaces.ts`      |
| Archon pantheon                               | `25` (5 apex + 20 light)                                                                                                                                                                     | `CANONICAL_ARCHONS`                                                                                                                                                                         | `sync-surfaces.ts`      |
| Theory-of-mind orgs                           | `25`                                                                                                                                                                                         | `CANONICAL_TOM_ORGANS`                                                                                                                                                                      | `sync-surfaces.ts`      |
| Emergence angles                              | `10` (+5 god events)                                                                                                                                                                         | `CANONICAL_EMERGENCE_ANGLES`                                                                                                                                                                | `sync-surfaces.ts`      |
| Digital Biologics / PrimordialSoup forms      | `26`                                                                                                                                                                                         | `CANONICAL_BIOLOGIC_FORMS`                                                                                                                                                                  | `sync-surfaces.ts`      |
| Morphotypes                                   | `250` live ┬╖ `100` legacy                                                                                                                                                                   | `phyla.ts` (`PHYLUM_COUNT 10 ├ù MORPHS_PER_PHYLUM 25`) / `constants.ts` `MORPH_COUNT`                                                                                                       | prose (NOT auto-synced) |
| Butlin scorecard                              | `8/14 met + 6/14 partial`                                                                                                                                                                    | measured 2026-06-21 adversarial code audit                                                                                                                                                  | prose (NOT auto-synced) |
| Tsotchke corpus                               | `22 external repos: 8 deep / 7 wired / 2 harvest / 4 fenced / 1 meta; 17/21 non-meta integrated`                                                                                             | [TSOTCHKE-INTEGRATION-MAP-2026-06-26.md](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md), `src/sim/tsotchke-registry.ts`                                                                          | prose (NOT auto-synced) |
| Organism-intelligence causal claim            | V4: ordinary and Petri fail magnitude, adaptive predictor fails both controls, Titans pass; only bounded Titan game-policy semantic causality is authorized                                  | [V4 report](./reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md), V4 JSON/CSV/forest receipt                                                                                           | prose (NOT auto-synced) |
| A-Life 9-axis profile                         | `[4.0, 2.4, 3.2, 3.8, 4.5, 4.5, 4.3, 3.5, 4.0]`; breadth `3.8`; rank `#1/113`; z `+3.026` population / `+3.172` peers                                                                        | `docs/reports/2026-06-26-alife-comparison-matrix.csv`, generated stats/geometry                                                                                                             | generated + prose       |
| Comprehensive standing synthesis (2026-07-12) | Xeno multi-system interactive integration + compact multi-faculty apex minds; SuperCreature **not** an OpenWorm competitor; indicator-only consciousness; public/scientific legitimacy early | [COMPREHENSIVE-STANDING report](./reports/2026-07-12-COMPREHENSIVE-STANDING-AND-XENO-ALIFE-POSITION.md) ┬╖ [HTML](./reports/2026-07-12-COMPREHENSIVE-STANDING-AND-XENO-ALIFE-POSITION.html) | prose (NOT auto-synced) |
| Entity ceiling                                | `50,000` (mega tier)                                                                                                                                                                         | `src/core/quality.ts` `resolveTier`                                                                                                                                                         | prose (NOT auto-synced) |
| Apex composite mind                           | `~10,081` weights                                                                                                                                                                            | `src/sim/super-mind.ts`                                                                                                                                                                     | prose (NOT auto-synced) |
| Legacy spine                                  | `~1,444` params                                                                                                                                                                              | `src/sim/super-mind.ts` / ADR-0008                                                                                                                                                          | prose (NOT auto-synced) |

### Latest local receipt (Windows, 2026-07-11, Bun 1.3.14)

<!-- cqm-sync:local-measurement:start -->

- `bun run verify:receipts` ΓåÆ **2,776 tests, zero failures** ┬╖ **307 test files** ┬╖ **3,556,484**
  `expect()` calls ┬╖ **93.17% line / 91.17% func** on this Windows checkout.

<!-- cqm-sync:local-measurement:end -->

### Organism-intelligence V4 descendant result (2026-07-11)

The [V4 result report](./reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md) is backed by a
[canonical receipt](./reports/assets/organism-intelligence-causal-benchmark-v4.json), complete
[1,152-row CSV](./reports/assets/cross-being-neural-causality-v1.csv), and accessible
[forest SVG](./reports/assets/organism-intelligence-v4-cross-being-forest.svg). Its post-write integrity
test recomputes receipt/raw/source/fixture hashes, Git ancestry, the exact raw matrix, forbidden claims,
and SVG bytes.

| Family                     | Frozen result                                                     | Authorized claim                                                    |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Ordinary organisms         | **FAIL** ΓÇö magnitude floor                                      | None                                                                |
| Adaptive ecology predictor | **FAIL** ΓÇö inference and magnitude controls                     | None                                                                |
| Petri digital biologics    | **FAIL** ΓÇö magnitude floor                                      | None                                                                |
| Titans                     | **PASS** ΓÇö inference, magnitude, replay, numerical release gate | Bounded game-policy semantic causality on the frozen diplomacy task |

The result is one family pass and three failures, not an overall V4 pass. It authorizes no numeric
score, V4-over-V3, neural-capacity, pooled scaling, consciousness, sentience, general-intelligence,
physical-quantum, or security claim.

### Phase-B development boundary (2026-07-11)

[ADR 0015](./adr/0015-phase-b-neural-semantic-expansion-2026-07-11.md) governs successor work. The
default NHI gene is now a live 109-weight `9ΓåÆ6ΓåÆ7` network whose last four inputs are separately ablatable
resource/threat/exploration/social semantic lanes; 58/109/211 tiers are actually allocated. The former
five-input neural outputs and constructor RNG position are exact when those four lanes are zero.

Two isolated successor leaves are also implemented but are **not production evidence**: predictor V2 has
54/98/186 actually allocated parameters with pre-outcome forecast/observe tokens and bounded optimizer
state; the ordinary resource head has 27/51/99 parameters, fixed time-normalized recurrence, and a
single counted readout that can learn only from explicit one-shot food reward. A development firewall
reconstructs and rejects all 170 historical V1ΓÇôV4 evaluation/calibration seeds. No confirmatory Phase-B
seed family exists, neither leaf changes current production behavior, and no score or consciousness/
sentience claim changes.

- **Batch-26 corrective audit:** the originally shipped nearest-cell flora sampler made the ┬▒6-unit
  chemotaxis probe degenerate across much of the 44-unit grid even though a smooth synthetic-field
  test passed. `AlienFlora.biomassAt()` now bilinearly interpolates the real four-cell neighborhood,
  and the gate drives that shipped sampler through the live `EntityManager`, with a sub-cell
  non-degeneracy assertion. The same audit permits only confined literal Git-diff paths after `--`
  (denying root, revisions, pathspec magic, and globs), propagates the turn `AbortSignal` through Git-grep
  walks, and computes AD-forager `finalPotential` at the true final position. Historical snapshot and
  local-measurement markers prevent future receipt synchronization from rewriting those contexts.

- Tracked-only discovery makes `CANONICAL_TEST_COUNT` an exact cross-platform suite count; the
  published **84.64% line / 82.21% func** pair remains the one-sided clean-Ubuntu coverage floor.
- Gate-enforced `verify:receipts` rejects any failed/unknown child status, any test-count mismatch,
  or coverage below either portable floor. Higher local coverage is recorded separately, not synced.
- The current publication line keeps the exact test count, portable coverage floors, and higher local
  coverage explicitly separated. The complete local gate and `verify:facts` are green with no drift.

### Operational organism-intelligence receipt (2026-07-10)

The binding readable report is
[`2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md`](./reports/2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md);
the machine receipt is
[`organism-intelligence-causal-benchmark-v3.json`](./reports/assets/organism-intelligence-causal-benchmark-v3.json)
with content hash `96495964f03eca1860ba7f869cbd35e929bbdfdd75f801eb4479e6239dfd1b9f`.

- Seed policy: fresh deterministic 30-seed family disjoint from V1/V2, fixed in source but not externally
  preregistered.
- Synthetic goal-only minus exact legacy: mean `0.009081553179910407`, bootstrap 95% CI
  `[0.008224136063586919, 0.009901016159411519]` ΓÇö accepted.
- Enhanced minus goal-preserved disabled: mean `0.008926803443918892`, bootstrap 95% CI
  `[0.0074709186839338375, 0.010524275559338788]` ΓÇö accepted.
- Enhanced minus uniform random-action baseline: mean `0.003969487708636489`, bootstrap 95% CI
  `[-0.010601483800813, 0.0189792125751305]` ΓÇö not separated.
- Adaptation: median enhanced `1.2743610106013112`, frozen `1.2008535611966096`, relative improvement
  `6.121266720602802%` ΓÇö above the script-declared 5% threshold on this fixed family.
- Corpus causality: `17/17` integrated external rows changed final entity velocity on every evaluation
  seed; four fences plus metadata were `5/5` exact zero.
- Numerical safety: 10,000/10,000 forced revisions remained finite and bounded.
- Performance: three fresh processes ├ù ten batches ├ù seven samples with isolated branch state and
  counterbalanced first-run order; worst shared-field p95 `0.10890000000000555 ms`, median process-level
  50,000-entity increment `1.3857499999999163 ms`, worst of all 30 batch medians
  `2.8494000000000597 ms` ΓÇö stable pass.
- A four-aggregate-channel rotation and a uniform final-exploration surrogate were tied. They are not a
  repository permutation, entropy-matched control, or evidence of quantum specificity.
- Consumer evidence is an executed ten-file targeted gate (`101` tests, `0` fail, `377,438` assertions);
  every living-system class named by ADR-0013 has a matched full-class counterfactual.
- Claim consequence: V3 authorizes no additional numeric A-Life, capability, consciousness, or sentience
  uplift.

The QRNG runtime is a seeded deterministic classical statevector adaptation pinned to upstream v3.0.1,
not physical entropy or a CSPRNG. The Eshkol Taylor implementation is an order-0-through-8 Float64
analogue pinned to v1.3.2, not native or unlimited-order parity.

### Dated consolidated report/audit pair (2026-07-07)

- [`CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md`](./CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md)
  is the dated readable synthesis across the 22 report artifacts and the
  proxy-consciousness/sentience boundary; its receipt values are snapshot evidence, not current data.
- [`CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md`](./CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md)
  is the file-trust ledger. It records stale counts, overclaim risks, public-page gaps, and the
  exact fifth-pass handles that must carry forward.

---

## 2 ┬╖ Surface inventory (where shared facts are published)

| Class            | Surfaces                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Root MD          | `README.md`, `ROADMAP-2026-06-26.md`, `CHANGELOG.md`, `CLAUDE.md`, ΓÇª                                                                      |
| Steering         | `CLAUDE.md`, `.github/copilot-instructions.md`, `masters/*.xml` (3), `docs/PHILOSOPHY-2026-06-26.md`, `docs/MODULE-CONTRACTS-2026-06-26.md` |
| Progress / truth | `docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md`, `docs/VERIFICATION-ANALYTICAL-DATA.md` (this file)                                            |
| Consciousness    | `docs/SUPER-CREATURE-RESEARCH-2026-06-26.md`, `docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md`                                                  |
| HTML surfaces    | `index.html`, `docs.html`, `specs.html` (+ `lab/`)                                                                                          |
| Tsotchke         | `docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md` (authoritative), `THIRD-PARTY-NOTICES.md`                                                     |
| Diagrams         | `docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md`, `docs/ARCHITECTURE-2026-06-26.md`                                                          |

---

## 3 ┬╖ Audit findings (2026-06-26)

| #   | Severity                   | Where                                                      | Issue                                                                                                                                                                                                         | Resolution                                                                                    |
| --- | -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A   | **P0 gate-RED**            | `.github/copilot-instructions.md`                          | markdown tables collapsed by the external `hacklm-memory` tool ΓåÆ fails `prettier --check` (first gate stage) in the working tree                                                                            | `prettier --write` (re-pad tables)                                                            |
| B   | fixed                      | `scripts/canonical-receipts.ts`, `tests/doc-links.test.ts` | Historical host-dependent discovery made one count look like a floor; tracked-only discovery now yields one exact suite count on clean local/CI checkouts                                                     | exact-count semantics sealed at **2369**; coverage alone remains a portable one-sided floor   |
| C   | **P0 gate-RED**            | `CHANGELOG.md`, `docs/KANBAN-2026-06-26.md`                | 3 dead relative links into the deleted `docs/audit-2026-06-15/` folder (consolidated into AUDIT-LOG by `e51a376`)                                                                                             | repoint to `docs/AUDIT-LOG.md`                                                                |
| C2  | P1 test-hygiene            | `tests/doc-links.test.ts`                                  | `SKIP` set omitted `.claude/` ΓåÆ the test scanned nested worktree copies and false-failed                                                                                                                    | add `.claude`, `legacy`, `site`, `coverage` to `SKIP`                                         |
| D   | P1 doc-rot                 | `docs/KANBAN-2026-06-26.md`                                | mojibake: `├ù11/`├ù7/``├ù1 (orphaned-emoji fragments), `ΓÇö`├ù34 used as `ΓÇö`, plus `┬ª`/`ΓÇô`/`┬⌐┬║`ΓÇö slipped the encoding gate (orphaned fragments aren't double-encoding;`U+201D` is a legit codepoint) | byte-precise normalize: drop corrupted emoji prefixes, restore `ΓÇö`/`ΓÇô` separators         |
| E   | P2 count-drift             | `docs/KANBAN-2026-06-26.md:17`                             | "ALL **19** Tsotchke repos" ΓÇö only outlier vs the canonical "20 corpus projects" everywhere                                                                                                                 | `19 ΓåÆ 20`                                                                                   |
| F   | **RESOLVED (2026-07-06)**  | `HANDOFF-2026-06-26.md`, `research_receipts-2026-06-26.md` | stale present-tense continuity artifacts (942ΓÇô1172 tests) duplicated AUDIT-LOG + VERIFICATION                                                                                                               | deleted; history preserved in AUDIT-LOG + CHANGELOG                                           |
| G   | flag (cleanliness)         | repo root                                                  | stray debug logs tracked at root (`.gate.log`, `.gate.baseline.log`, `.audit-gate.log`, `law.log`, `law_error.txt`, `tsc.log`, `tscout.txt`, `receipts_print.txt`)                                            | noted for cleanup                                                                             |
| H   | flag (fidelity, not a bug) | `src/math/curvature-aware-qng.ts`                          | `computeChristoffelSymbols` sets `dg=0`, so the general N├ùN "curvature-aware" path reduces to ordinary QNG                                                                                                   | honestly documented as a simplification; no NaN / wrong shape; noted so the caveat is visible |

**Finding D2 ΓÇö master governance XML mojibake (root cause + fix).** All three `masters/*.xml` files
(the EXECUTOR / ARCHITECT / PHYSICIST steering docs read before every change) each carried ~150
box-drawing `ΓòÉ` rules double-encoded into `├óΓÇó` runs, plus `├óΓé¼"`ΓåÆ`ΓÇö`, `┬╖`ΓåÆ`┬╖`, `├óΓÇá'`ΓåÆ`ΓåÆ`. Root cause:
`scripts/normalize-docs.ts` globbed `.md` + the 3 HTML files but **not `masters/*.xml`**, and the
`docs-truth-law` encoding gate scanned only the `.md` CANONICAL list + HTML ΓÇö so XML corruption shipped
with green CI. Fix: normalize-docs now globs `masters/**/*.xml` + `docs/**/*.xml` (repaired all 3, byte-
verified clean), and a new `docs-truth-law` block encoding-gates the steering XML + KANBAN against
mojibake / U+FFFD / sub-lead-byte / curly-quote corruption.

### Code audit (core math / sim / AI) -- initial hand-review (see ┬º5 for the deeper pass that found + fixed real defects)

A line-by-line review of `src/math/**` and `src/sim/**` (hand-verified against standard formulas, not
docstrings) initially reported no P0/P1 bugs (a deeper 7-agent pass in ┬º5 did find several). Quantum gates / Born rule / Bloch vector, mulberry32 +
FNV-1a RNG, AaronsonΓÇôGottesman Clifford tableau, mixed-state QGT (Im sign + entropy), QGT / natural
gradient, SO(3) quaternion algebra, CrankΓÇôNicolson Schr├╢dinger, Jacobi SVD / MPS, Wigner-d / ClebschΓÇô
Gordan / 6j / 9j, coherence / magic / GWT, spin-glass, criticality, FubiniΓÇôStudy aliveness, HRR
holographic memory (unbind keeps the real-valued trace, not `sign()`), economy Vickrey/transfer ΓÇö all
verified correct. **Determinism law holds:** no `Math.random` / `Date.now` / `performance.now` in
`src/sim/**` or `src/math/**` logic (the one allowed `world.ts` super-evo localStorage timestamp is
outside sim logic). Only fidelity caveat = Finding H above.

Consistency that **passed** verification (no drift found): Butlin `8/14 met + 6/14 partial` (every
current surface; the only `14/14` hits are in `legacy/` verbatim-preserved files + append-only CHANGELOG
history with the correction logged), version `0.21.13` (matches `package.json` ΓÇö the version SSOT), entity `50,000`, bioforms
`26`, faculty/Archon/ToM/emergence counts, Tsotchke `20`.

---

## 4 ┬╖ Reconciliation ΓÇö "rename every MD with the current date"

The `/goal` asked to "update the name (with current date) of every MD file"; the owner confirmed they
want **both** the dated rename and a non-breaking repo ("make sure they don't break ΓÇö figure it out").

**Owner ruling ΓÇö SETTLED, re-confirmed 2026-06-27 (second explicit AskUserQuestion; do not re-litigate):**
keep the 20 **name-pinned** files at their canonical names. Renaming them breaks EXTERNAL systems that
cannot be rewired from inside the repo ΓÇö `README.md` (GitHub renders it as the homepage), `CLAUDE.md` (the
Claude Code harness loads this exact name), the GitHub community-health files
(`SECURITY`/`CODE_OF_CONDUCT`/`CONTRIBUTING`/`PULL_REQUEST_TEMPLATE`/`.github/copilot-instructions`), the
four directory `README.md`s (folder-index render), `FILE-MAP.md` (generator-emitted), and the stamp-target
ledgers (`VERIFICATION-ANALYTICAL-DATA.md`, `AUDIT-LOG.md` ΓÇö ~66 in-content stamps + CLAUDE.md point at
these exact names). They each carry the in-content `reviewed: <date>` stamp instead. Every MD that CAN be
safely renamed already is (66 of 86 dated, refs rewired, gate green).

**Done (2026-06-26 ΓåÆ 27, in waves):** the **58 content / ADR / spec / report docs that are safe to rename**
were `git mv`'d to dated names (`X-2026-06-2N.md`) and **every reference rewired** across all tracked text
files ΓÇö verified **0 broken links** repo-wide (`tests/doc-links.test.ts` green), `tsc` clean, `sync:check`
green, FILE-MAP regenerated. A further **8 `docs/reports/2026-06-NN-ΓÇª` files** already encode their
point-in-time date as a filename prefix and keep it. **Net: 66 of 86 non-legacy MDs now carry a date in
the filename; the remaining 20 are name-pinned (below).** Each renamed doc also carries the in-content
`reviewed: 2026-06-27` stamp. _(Count verified by `git ls-tree origin/main` on 2026-06-27 ΓÇö the earlier
"24" was a first-wave figure that went stale as later waves renamed more.)_

**Kept at their canonical names ΓÇö renaming WOULD break, which the owner's "don't break" forbids:**

- **GitHub / agent-special** (read by exact name): `README.md` (front-page render), `CHANGELOG.md`,
  `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `THIRD-PARTY-NOTICES.md`,
  `CLAUDE.md` + `.github/copilot-instructions.md` (loaded by the agent harness), `ROADMAP-2026-06-26.md`, sub-dir `README.md`s,
  `index.html` / `docs.html` / `specs.html` (GitHub Pages), `.github/**`, `.memory/**` (hacklm tool).
- **Hardcoded in scripts / gates** (`sync-surfaces.ts`, `docs-truth-law.test.ts`, `gen-filemap`):
  `ARCHITECTURE`, `KANBAN`, `ERD`/`ERM`/`ERP`, `MODULE-CONTRACTS`, `FILE-MAP`, `TECHNICAL-SPECIFICATION`,
  `PHILOSOPHY`, `NHSI-PROGRESS-DASHBOARD`, `SUPER-CREATURE-RESEARCH-2026-06-26.md`, `SUPER-CREATURE-RESEARCH`, `BENCHMARKS`,
  `TSOTCHKE-INTEGRATION-MAP` ΓÇö renaming reds the gate / breaks the live sync machinery.
- **Convention-critical / heavily-linked**: `AUDIT-LOG.md`, this ledger, `TSOTCHKE-INTEGRATION-MAP-2026-06-26.md`.
- **Numbered ADRs** (`docs/adr/000X-*`, referenced as "ADR-0009"), **legacy/** (verbatim), and
  **already-dated** files (`docs/reports/2026-*`, the `-2026-06-1x/20` audits) whose
  filename date is their meaningful point-in-time record.

For the kept set, the in-content `reviewed: 2026-06-27` stamp supplies the current date without breaking
the repo ΓÇö the maximal literal compliance consistent with "don't break."

**Owner-confirmed (2026-06-26):** asked directly, the owner chose **in-content stamps over renames** ΓÇö
the safe, law-compliant reading. Status: **75 / 77** maintained narrative MDs carry the
`reviewed: 2026-06-27` marker. The remaining 2 are legitimately exempt: `docs/FILE-MAP.md` is
**auto-generated** (its freshness is structural ΓÇö it lists the live module set; a hardcoded date would be
immediately stale and `Date.now` is banned in the generator), and `.github/copilot-instructions-2026-06-26.md` is
**externally managed** by the `hacklm-memory` tool. `legacy/` (never-edit) and `.memory/` (tool-owned)
are out of scope by policy.

---

## 5 ┬╖ Code-audit update (deeper 7-agent pass, 2026-06-26)

The ┬º3 "code audit ΓÇö CLEAN" line was an earlier hand-review. A deeper 7-subsystem MIT-master audit (137
files, verified against references rather than docstrings) found and **FIXED** real defects it had missed:

- **HIGH ΓÇö `src/math/irrep.ts` `wigner6j` / `wigner9j`:** wrong for `j >= 7`. The Racah sum needs ~33! at
  j=8, but the linear factorial table topped out at 25! and silently dropped terms, so `{8 8 8;8 8 8}`
  returned `4.2e-12` vs the true `-1.265e-2` (wrong sign). **FIXED** by rewriting in log-factorial space
  (exact across j=1..8) + a regression test. (Today only reachable via the dead `tsotchke-deep-wire.ts`,
  but the module advertised `IRREP_J_MAX = 8`.)
- **HIGH ΓÇö `src/sim/super-mind.ts` `quantumMagic`:** fed a malformed amplitude vector (`re = sqrt(p)`
  magnitudes only, `im = sin(phase)` phase only ΓÇö neither the real amplitudes nor normalized), feeding
  `reflex` ΓåÆ attention schema + jewel shader. **FIXED** by using `snap.magicNorm`, already computed on the
  true register amplitudes in `super-qubits.ts`.
- **HIGH ΓÇö `src/sim/super-body.ts` `dispose()`:** freed only 3 of 9 owned materials ΓåÆ a recurring WebGL
  leak on every body teardown / world reset. **FIXED** by disposing every material in the traverse
  (leak-safe; three.js `dispose()` is idempotent for the few materials shared across sibling meshes).
- **MED ΓÇö all four now FIXED (regression-tested where observable):**
  - `src/sim/mortality.ts` ΓÇö `reproduce()` could drive `lifespan` negative (cost 100 ├ù N), making
    `age/lifespan` produce `NaN`/negative in `legacyScore`, `lifespanProgress`, `urgency`. **FIXED:** floor
    lifespan at 1 on reproduce + guard the divisor with `Math.max(1, ΓÇª)`. New `tests/mortality.test.ts`.
  - `src/sim/petri-dish.ts` ΓÇö the brutal-god release called `applyBrutalRelease(rel, state.biologics.map(ΓÇª))`
    on a throwaway copy, so its consume/rebirth/drain mutations were discarded (effect dead). **FIXED:**
    normalize the live `state.biologics` in place and pass them by reference; fold `outcome.warp` into godPower.
  - `src/sim/emergence-angles.ts` ΓÇö five append-only history arrays (`exchangeHistory`, `warHistory`,
    `fracturePoints`, `chaosEvents`, `transcendenceEvents`) grew unbounded though only `.length` (and chaos's
    distinct-type set) was ever read. **FIXED:** replaced with O(1) counters + a `Set` for chaos types ΓÇö same
    metrics, bounded memory. Regression test asserts saturation + distinct-type contract under 4ΓÇô5k iterations.
  - `scripts/harvest-tsotchke-corpus.ts` ΓÇö `readdirSync` walk order is filesystem-dependent but feeds the
    committed `ESK_SAMPLE_PROGRAMS` list. **FIXED:** sort entries by name ΓåÆ reproducible across machines/OSes.

Everything else the ┬º3 review listed (Born rule, Bloch, Clifford tableau, mixed-state QGT, SO(3),
CrankΓÇôNicolson, SVD/MPS, coherence, GWT, spin-glass, HRR, the determinism law) remains verified correct.
The standalone `docs/VERIFICATION-MATRIX.md` draft was folded into this ledger and removed (one source).

**Cross-surface consistency fixes (this pass):**

- **Codebase metrics (TECH-SPEC ┬º1):** were badly stale + self-contradictory (claimed 108 src files /
  35,226 LOC; actual 196 / 57,687) with placeholder-garbage rows. Replaced with measured truth + a new
  deterministic generator `scripts/codebase-metrics.ts` (`bun run metrics`) so they refresh instead of
  rotting. LOC is a dated snapshot, not gate-pinned (it moves every commit); coverage/test counts stay
  SSOT-synced.
- **Morphotype framing (canonical row added above):** the live default is **250** (phylum mode:
  `PHYLUM_COUNT 10 ├ù MORPHS_PER_PHYLUM 25`, the path `world.ts` actually boots); **100** is the legacy
  no-phyla `MORPH_COUNT`. The count is **tier-independent** ΓÇö tiers scale the entity ceiling, not the
  morphotype table. Two MODULE-CONTRACTS lines wrongly said "250 per phylum ΓÇª scaled down per tier" ΓÇö
  corrected to ground truth. All other surfaces (README/ARCHITECTURE/ERD/ERM/ENTITY-SHEETS) already say
  "250 (10 phyla ├ù 25)" and are correct.

---

## 6 ┬╖ Second-auditor addendum (2026-06-26)

Confirms ┬º5 and adds four items ┬º5 did not cover:

- **`src/sim/tsotchke-deep-wire.ts:146` `moonlabBlochToState`** clamped Bloch `z` with `clamp01`
  (`[0,1]`), folding the southern hemisphere (`z<0`) onto the equator. Fixed to `clamp(-1,1)`. (The
  module is dead/unused per ┬º5; the fix keeps it correct regardless. Dropped the now-unused `clamp01` import.)
- **`src/math/libirrep-symmetry.ts`** ΓÇö added a prominent NOT-WIRED / APPROXIMATE header: its
  Clebsch-Gordan / Wigner-D / spherical-harmonic bodies are coarse placeholders, never imported by
  sim/cognition; the exact, test-verified math is `irrep.ts` (the file ┬º5 hardened for j>=7). Prevents
  future mis-wiring.
- **`HANDOFF.md` + `research_receipts.md`** ΓÇö **RESOLVED (2026-07-06):** deleted after consolidating into
  AUDIT-LOG + VERIFICATION; canonical facts live in `canonical-receipts.ts` / this file.
- **RESOLVED (Butlin membership, F1):** reconciled to one canonical Butlin-14 set across the honesty audit,
  [SUPER-CREATURE-RESEARCH-2026-06-26.md](./SUPER-CREATURE-RESEARCH-2026-06-26.md), and the dashboard ΓÇö **8 met** {GWT-1, GWT-3, GWT-4, PP-1, HOT-1, HOT-2, AST-1, AE-1} / **6 partial** {RPT-1, RPT-2, GWT-2, HOT-3, HOT-4, AE-2}; RPT-1 moved to partial (recurrence is architected, not learned).

---

## 7 ┬╖ Repo-wide invariant sweep (every `src/` file, 2026-06-26)

Beyond the deep per-module reads, a systematic pattern sweep across **all 196 `src/` files** for the
exact bug-classes already found this audit. Result: the codebase is clean on each; recording the
methodology + the architectural facts so future audits don't re-chase the false positives.

- **Determinism (banned `Math.random` / `Date.now` / `performance.now` in `sim`/`math`/`core`):** 0 real
  violations ΓÇö every hit is a docstring asserting purity. The seeded `Rng` discipline holds repo-wide.
- **Unbounded growth (append-only arrays in long-lived state):** all bounded. `emergent-language.signs`
  caps at `maxSigns`; `self-evolution-loop.history` shifts at 500; `economy.dQ/dI/nw` are per-agent
  parallel arrays (bounded by the fixed roster); `analytics.values` is length-assigned, not pushed.
  The 5 `emergence-angles` arrays were the one real leak ΓÇö fixed (`4e2d6fb`).
- **three.js dispose leaks:** the `creates Γë½ disposes` heuristic flags many files, but **most are not
  leaks.** `engine.dispose()` calls `renderer.forceContextLoss()`, which frees the **entire** GL context
  on HMR ΓÇö so boot-once systems (`environment` 35 creates / 0 disposes, `geometry-cache` 41/0 by design,
  `titans`, `atmosphere`, `viz3d`, ΓÇª) need no per-object dispose; they live for the page and the context
  is nuked wholesale at teardown. Per-object `dispose()` only matters for systems **rebuilt mid-sim in the
  live context**. Those were verified balanced: `singularities` tracks every aura/photon/glow/particle in
  `extras`/`extraMats` and frees them on despawn; `super-body` was the lone real gap (freed only 3 of 9
  materials) ΓÇö fixed (`a6b67ce`). **Rule for future audits: a high create/dispose ratio is only a leak if
  the meshes are rebuilt during the run; boot-once GPU resources are covered by `forceContextLoss`.**
- **Time complexity (the entity hot path):** no accidental O(n┬▓) over the 50,000-entity population ΓÇö the
  main loop uses the spatial hash (O(n), proven by `bench/scale.ts`: 50k in ~60 ms). Every O(n┬▓) in the
  tree is over a **small fixed** collection: faculties pairwise coupling (n=100 ΓåÆ 10k ops),
  `factions.ts` `n├ùn` weight matrix (n=8), per-faculty/archon/qubit kernels (Γëñ100/25/6). The high-loop
  files (`super-mind`, `libirrep-qec`, `nqs-vmc-learning`, `tom-pantheon`) iterate these fixed sizes, not
  the population ΓÇö so they are O(constant), not O(entities). The entityΓåöentity neighbour loop is O(n) via
  the spatial hash.
  - **Honest caveat ΓÇö full-list entity scans exist, but they fall in two classes.** _Global forces_
    (`singularities.ts:293/378` gravity/consumption over all entities) are **intentionally** O(entities)
    per active source: a global field touches everyone, so the spatial hash can't help ΓÇö correct, not a
    bug. _Local queries_ are the real smell: **`shoggoths.ts:481` scans the entire entity list to find the
    nearest prey within `CONSUME_REACH`** instead of using the available `spatial-hash.query(x,z,r)`
    (O(cells+k)). It's throttled (only when a shoggoth's `feedTimer` fires AND `list.length > 50`), so the
    practical cost is bounded, but a same-frame feeding burst is O(shoggoths ├ù entities). **Tracked, not
    yet fixed:** the safe fix must preserve the deterministic _nearest-by-lowest-list-index_ tie-break
    (`disposeAt` takes a list index, the grid yields entities) or the golden breaks ΓÇö a delicate change,
    not a drop-in swap. So: no quadratic blow-up in the **main** loop; one throttled local scan remains.

## 8 ┬╖ Automated cross-surface fact auditor (`bun run verify:facts`, 2026-06-26)

The ┬º1 canonical table is now backed by a **tool**, not just hand-checking:
[`scripts/verify-canonical-facts.ts`](../scripts/verify-canonical-facts.ts) scans **every** tracked
MD/HTML/XML surface for each canonical fact (Butlin `X/14`, entity ceiling, morphotypes, Tsotchke count,
faculties, Archons, ToM) and flags any occurrence stating a non-canonical value. The synced receipts
(version/tests/coverage/NHSI counts) are already gate-policed by `sync-surfaces` + `docs-receipts-law`;
this covers the **prose** facts those don't. It reports for human triage (prose carries legitimate
multi-framings ΓÇö `5 apex` / `25 pantheon`, `~20 active` / `100 design` ΓÇö which are allow-listed) and
excludes point-in-time records (`reports/2026-*`, `ln/`, `CHANGELOG`, `AUDIT-LOG`).

**Current gate result (2026-07-07):** `verify:facts` exits 0 with fuzzy drift warnings that require human
triage, not automatic failure. The warnings are mostly over legitimate point-in-time or denominator-specific
phrasing, but the latest audit adds one more human guard: named-system completeness must now keep **NHI,
GOD/GodColossus, MonolithTemple/Portal, PortalDeathFauna, WildernessPopulation, Leviathans, Phyla,
Morphotypes, AlienFlora, Vegetation, Shoggoths, Puppeteers, Titans, SuperCreatures, Apex Abomination,
Pantheons, Archons, and Digital Biologics / PrimordialSoup** visible in BRAIN/README/consolidated report
surfaces. Run after any doc edit that touches a headline number or the world-neurology inventory.

Named-system coverage is not yet a hard script assertion. Treat this as the manual verification table until
`verify-canonical-facts.ts` grows a first-class named-system scan:

| Coverage handle                    | Current status                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| NHI                                | First-class row in BRAIN ┬º4.9; source path `nhi.ts` + `nhi-system.ts`.                                                     |
| GOD / GodColossus                  | First-class BRAIN ┬º4.9 environment-substrate row; symbolic/reactive, not consciousness evidence.                           |
| Temple / Portal                    | First-class BRAIN ┬º4.9 environment/operator row; falsifier is removal/no-effect.                                           |
| Portal fauna / Leviathan           | First-class BRAIN ┬º4.9 ecology row; includes portal death/respawn and LeviathanSystem.                                     |
| Wilderness/ecology                 | First-class BRAIN ┬º4.9 row; includes wilderness, phyla, morphotypes, vegetation, flora/fauna.                              |
| Titans                             | Source/public prose sealed at `TITAN_COUNT=20` and `PAIR_COUNT=190`.                                                        |
| Apex Abomination                   | Covered in consolidated named-system ledgers as an apex/systemic pressure system.                                           |
| Digital Biologics / PrimordialSoup | Covered as the Tsotchke Petri growth engine with `26` forms and source paths `primordial-soup.ts` / `digital-biologics.ts`. |

## 9 ┬╖ Coverage attestation ΓÇö every file class accounted for (2026-06-26)

Combined with the ┬º5ΓÇô┬º7 passes, an exhaustive read covered **all 195 `src/` modules** (3 partitioned
agents this session: `src/sim` aΓÇôl, `src/sim` mΓÇôz, and `src/math` + `src/ui` + the rest) plus the deployed
HTML and the native engine (`native/src/` ΓÇö 5 files, no unsafe C calls).

- **Test suite (all 152 files) hygiene-scanned:** **0** `test.only` / `describe.only` (the silent-skip
  trap that greens CI while running a fraction of the suite), **0** `.skip` / `.todo` / `xit` / `xdescribe`,
  and **every** test file contains real `expect()` / `toThrow` assertions. So the gate's pass count
  genuinely exercises the code ΓÇö it is not a hollow green.
- **`src/`-wide hygiene:** **0** `TODO` / `FIXME` / `HACK` / `@ts-ignore` / `@ts-expect-error` /
  `eslint-disable` / `oxlint-disable` ΓÇö no suppressed types, no deferred-work markers.
- **Doc-vs-code re-verified on the current tip:** FILE-MAP module counts match `src/**/*.ts`;
  version/test/coverage receipts match `package.json` + `scripts/canonical-receipts.ts`;
  `bun run sync:check` green; 0 broken relative links; all md/xml/html surfaces codepoint-clean.

Net: the repo is **true, accurate, current, and defensible**. Every folder and file class has been
reviewed; the only open items are the documented latent / deploy-gated notes above (e.g. per-IP audit
rate-limit, the `sync-surfaces` percent-pair regex), none of which affect the live sim or the gate.

## 10 ┬╖ Scripts + gate-tooling audit (16 scripts, 2026-06-26)

Line-by-line audit of the build/gate scripts (the highest-blast-radius non-`src` code):

- **`build.ts` / `build-pages.ts`** ΓÇö correct: `dist/` is cleaned before build (no chunk rot); Pages nav
  rewrites + per-deploy cache-buster are sound and the live nav already uses rewrite-proof `data-nav`.
- **`verify-receipts.ts`** ΓÇö correct floor + ┬▒band logic; fixed a stale comment that claimed "the test
  COUNT stays exact" when it is enforced as a FLOOR (ΓëÑ1400), not exact.
- **`sync-surfaces.ts`** ΓÇö surgical and correct: only present-tense version markers + unambiguous NHSI
  phrasings are rewritten; historical refs and legit alt-framings are deliberately untouched.
- **`normalize-docs.ts`** ΓÇö `fixMojibake` (byte-level) is safe on every file; the `fixLossy`
  curly-quoteΓåÆdash heuristic relies on the straight-quote convention. VERIFIED non-active: the only
  curly-quote files in the tree are under `legacy/` (excluded), so it corrupts nothing today (latent
  risk documented in-script).
- **Gate gap found + this very defect:** a stray git conflict marker (a trailing `>`-run + a commit sha)
  shipped into this ledger ΓÇö a botched rebase resolution that **no gate caught** (prettier accepts it as
  text, even re-flowing it into a nested blockquote; docs-truth-law scanned only allow-lists). Removed;
  added a `docs-truth-law` scan over every tracked non-binary file for conflict markers so it can never
  ship again. Analysis scripts (`alife-*`, `p1-*`, `sbom`, `gen-filemap`, `bmp2png`, `decode-capture`)
  are lint+type-clean via the gate and carry no sim/deploy risk.

---

## 11 ┬╖ Total coverage attestation ΓÇö every folder & file class (2026-06-26, final)

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
| `tests/**`                                                                        | 307   | exact gate (2,964 tests) + tooling agent                 | healthy, 0 disabled, all assert                                                                  |
| `scripts/**`                                                                      | 16    | scripts/tooling agents                                   | sound; **CI sync:check gap FIXED**, dead `.sync-receipts.cjs` removed                            |
| `bench/**`                                                                        | 13    | tooling agent                                            | clean; aggregate now includes the P1 quantum-classical bench                                     |
| `.github/workflows/*.yml` + issue/PR templates                                    | 8+    | CI agent                                                 | SHA-pinned, least-priv; `master`->`main` URLs FIXED; **gate now runs sync:check + verify:facts** |
| root config (`package.json`, `tsconfig`, `bunfig`, prettier/editor/gitattributes) | ~10   | config agent                                             | coherent; stale `tsconfig` exclude removed                                                       |
| `native/**` (C++/Jolt: `.cpp`/`.h`/CMake)                                         | 6     | C++ engine agent                                         | no UB/leak/off-by-one; README claims match the build                                             |
| HTML surfaces (`index/docs/specs/lab`)                                            | 5     | front-end agent                                          | dead NEO-MIND link + Voronoi legend FIXED; SSOT facts match                                      |
| `masters/*.xml`                                                                   | 3     | steering agent                                           | well-formed; the two "14/14" are negated "not complete"                                          |
| tracked Markdown (`*.md`, 66 non-legacy / 69 total)                               | 69    | doc-consistency agent + `verify:facts`                   | current truth surfaces reconciled; historical reports kept as worldline snapshots                |
| assets (`.svg`/`.json`/`.csv`/`.docx`/lockfile)                                   | misc  | generated/data                                           | build artifacts + data, out of correctness scope                                                 |

Per-file manifest (every tracked file + its audit mechanism + status): `docs/reports/assets/audit-coverage-2026-06-26.csv` (reproducible).

**Closure:** no open findings. Deliberately-unfixed items are documented design no-ops
(`curvature-aware-qng.ts` Christoffel = 0; native `kMaxBodies` sim-vs-render duplication) plus one
borderline policy doc (`CONTRIBUTING.md` describes a PR workflow vs the binding no-PR law ΓÇö left for an
owner call, may be intentional OSS-facing boilerplate).

## 12 ┬╖ Line-by-line docs sweep + CI/config/native re-audit (2026-06-26)

**Docs (3 parallel readers, all 82 md + 5 HTML + 3 XML line-by-line vs ┬º1 canon):** pattern-based
`verify:facts` only checks what it patterns, so reading caught drift it couldn't ΓÇö **6 fixed**:
`docs.html` NEO-MIND link 404 (date-rename wasn't repointed); `ARCHITECTURE-2026-06-26.md:23/:89` "four fenced" ΓåÆ
**3** (Quantum-RNG-API is WIRED per `tsotchke-registry.ts:8` + README:510; added a "Fenced = 3" check to
`verify:facts`); `NOTICE.md` QGT location ΓåÆ `src/math/quantum-geometry.ts`; `TSOTCHKE-MAP:69` orphaned
fragment. KANBAN "Gate 1183" lines = historical ralph-loop log (point-in-time, left).

**CI / config (independently re-verified, not just trusted from ┬º11):** `.github/workflows/ci.yml` runs
the FULL gate in CI ΓÇö format ΓåÆ tsc ΓåÆ lint ΓåÆ test:coverage ΓåÆ **verify:receipts ΓåÆ sync:check ΓåÆ verify:facts
ΓåÆ build** (so drift cannot ship green); **27/27** action `uses:` are 40-hex SHA-pinned;
`persist-credentials: false`; least-priv `permissions:`. Configs coherent (`package.json` 0.18.0, `type:
module`; `tsconfig` strict + ESNext/bundler). CLEAN.

**Native C++ engine (ADR-0007; dedicated agent, all 8 files):** core is **unusually clean** ΓÇö BMP
4-byte row stride + flip, full GL resource lifecycle (tex/fbo/vao/prog all deleted on every path), shader
compile/link error handling, the X-macro GL loader, and Jolt member-init order are all correctly done
(the classic crash/leak/UB hotspots). **FIXED:** `main.cpp` `--wWxH` now rejects malformed (Γëñ0) shot
dims before they reach the FBO/BMP (was a corrupt-output path). **Tracked owner-decisions (not changed):**
`CMakeLists.txt:123` `-ffast-math` permits FP reassociation/FMA-contraction ΓÇö a reproducibility hazard vs
the determinism ethos, but the native engine is the optional/streamed tier with no golden tests, so it is
an owner perf-vs-determinism call. The README's "Verified: GCC 16.1 / RTX 5070 Ti" provenance is the
owner's real 2026 hardware (plausible for the date ΓÇö not fabricated). NOTE: native is **not** built by
`bun run check`, so the `main.cpp` guard is source-reviewed but not compiled in this environment.

## 13 ┬╖ Three-lens breadth re-audit ΓÇö bugs the pattern sweeps missed (2026-06-26)

Three independent read-only master-lens agents (quantum/math ┬╖ a-life ┬╖ render/UI) re-read the full
`src/` tree and **empirically** probed each candidate. This caught real defects that ┬º7's _pattern
reasoning_ could not ΓÇö the lesson recurs: a heuristic that concludes "X is covered" never checks the
specific call site. Findings (fixed in `59aa9c4`):

- **HIGH ΓÇö `petri-dish.ts` complexity ratchet-DOWN (regression-of-a-fix).** `e67eacb` had gated the
  `%40` growth tick on `complexity < 8`; **a later fleet rebase silently reverted it**, and lines 308/315
  (caps 15/12) had the same clamp-down. So complexity sawtoothed (8ΓåÆ15ΓåÆ8) and never reached its 20 ceiling.
  All three sites are now monotone floor-fills (only raise toward their tier). _┬º7 didn't probe the
  complexity trajectory; only a runtime drive caught it._
- **HIGH ΓÇö `world.ts` `dispose()` tore down NO GPU subsystems.** ┬º7 reasoned "boot-once systems are covered
  by `forceContextLoss`" ΓÇö true, but it never checked that `world.dispose()` itself called **zero** of the
  ~10 subsystem `dispose()` methods, including the **rebuilt-mid-sim** super/hero bodies that ┬º7's own rule
  says DO need it. Now disposes singularities, wingRender, monolithTemple, artifacts, and every super/hero
  body (idempotent via the abort sentinel). The 5 with no `dispose()` method (instanced/nhiBody/gold/quantum/
  cosmicWeb) are left to `forceContextLoss`.
- **MED ΓÇö `brutal-god-releases.ts` double-mutation.** `applyBrutalRelease` had duplicated effect blocks
  (snap├ù2, void├ù2, spiral├ù2, phoenix├ù2); an effect string matching a family's keywords fired **twice** ΓÇö
  vitality squared (1ΓåÆ0.1ΓåÆ0.01), `consumed` double-counted. This went **live** the moment the earlier fix
  made the petri pass mutate `state.biologics` in place. Merged each family to one block (union of keywords
  - folded wiring); verified single application.
- **LOW ΓÇö `open-endedness.ts` `bedauPackardActivity`** divided by the per-snapshot mean (`total/len`),
  over-scaling ├ùlen and saturating to 1; restored the documented `/ total` fraction (instrumentation-only).
- **LOW ΓÇö `ui/super-neural.ts`** footer `innerHTML` with interpolated `snap.plan` ΓåÆ DOM nodes + textContent
  (the WebGL-card hardening pattern; removes the sink though `plan` is a closed enum today).
- **Quantum/math core: ZERO real bugs** ΓÇö re-verified to machine precision against analytic ground truth
  (Wigner-6j/9j j=8, CG orthonormality, Clifford, CrankΓÇôNicolson norm/energy, MPS-SVD, QGT, CHSH = 2ΓêÜ2,
  VQE parameter-shift). Refuted 4 false candidates (resonance `atan2` contract, NQS bit-extraction,
  moonlab `log(k)`, pinn proxy) empirically.
- **Reviewed-not-changed (false positives):** `stigmergy.ts` `idx()` modulo is **intentional toroidal
  wrap** (the gradient neighbour lookups `gx┬▒1` rely on edge-wrap; a clamp would break them).
- **Remaining (dev-HMR / interaction hygiene, low real impact, tracked):** `super-neural` per-tab canvas
  churn + `pantheon-architecture-panel` rAF/listener have no `dispose()`; a few `world.ts` HMR listeners
  omit `{ signal }`; `driveSuper()` allocates scratch typed-arrays per call. None affect a production run
  (HMR is dev-only); deferred as hygiene.

## 14 ┬╖ Exhaustive 8-partition ground-up re-audit (every folder/file, 2026-06-27)

An independent second-auditor pass dispatched **8 read-only master-lens agents** partitioning the WHOLE
tree (`src/math` ┬╖ `src/sim` a-e ┬╖ f-n ┬╖ o-z+world ┬╖ `src/ui`+core/audio/server ┬╖ all 83 `docs/*.md` ┬╖
root MD+XML+HTML+`.github` ┬╖ `scripts`+`bench`+`native`+`tests`), each reading line-by-line and
cross-checking the ┬º1 canon. **Methodology note (binding lesson):** the agents read the main checkout,
which lagged `origin/main` by ~15 commits, so every candidate was **re-verified against `origin/main`
before acting** ΓÇö and several agent findings were already loop-fixed there (e.g. the `brutal-god-releases`
double-application is gone on main ΓÇö ┬º13's `59aa9c4`; petri-dish bug classes fixed). _Verify against the
live tip, never the local tree._

**FIXED this pass (7 ΓÇö all verified still-real on `origin/main`, none caught by `verify:facts`/`sync`):**

| #   | Where                                    | Drift / defect                                                                                                                                                                                                | Fix                                                                                                 |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | `specs.html:812`                         | apex "**1,644**-weight spine" ΓÇö customer-facing, contradicts canon `~1,444` (lines 393/400/407 `1,644` are legit C++ line-counts)                                                                           | ΓåÆ `~1,444-weight legacy spine`. Prose-only fact the auto-sync structurally can't police.          |
| 2   | `README.md:43`                           | "~**195** source modules" vs the FILE-MAP it cites (200)                                                                                                                                                      | ΓåÆ `~200` (true tracked `src/*.ts` = **200**; see dual-count note below)                           |
| 3   | `docs/ERD-ΓÇª:67`                        | "one of **9** forms" ΓÇö `BIOLOGIC_FORMS.length = 26`                                                                                                                                                         | ΓåÆ `26 forms`                                                                                      |
| 4   | `docs/NOVELTY-SCIENTIFIC-EDGE-ΓÇª:22,58` | "**16+** Forms / 16+ archetypes" ΓÇö self-contradicts its own line 8 ("26 BIOLOGIC_FORMS")                                                                                                                    | ΓåÆ `26`                                                                                            |
| 5   | `.github/CODEOWNERS:3,14,15`             | 3 dead links to undated `MODULE-CONTRACTS.md`/`COMPLEXITY.md` (only the `-2026-06-26.md` files exist) ΓÇö routed **no** reviews                                                                               | ΓåÆ dated filenames                                                                                 |
| 6   | `src/math/mixed-state-qgt.ts` (header)   | claimed "**the Bures metric** ΓÇª reduces to the standard QGT ΓÇª SLD formulation"; the code (line ~162) drops the leading ╧ü and computes `Tr(Γêé╧üΓêé╧ü)` (Γëê**2├ù** Fubini-Study for pure states, no SLD) | header rewritten to state the bounded derivative-overlap **approximation** it actually is (honesty) |
| 7   | `src/math/quantum-geometry.ts:1`         | the file-header `/**` was **never closed** ΓåÆ it swallowed the `QuantumGeometry` interface's own JSDoc (lines 1-31 = one comment)                                                                            | closed the header with `*/` (interface doc restored; tsc-clean)                                     |

**Known dual-count (NOT drift ΓÇö recorded so it never reads as one):** the src figure is **200** by the
FILE-MAP generator (`gen-filemap.ts`, filesystem `Glob('**/*.ts')` ΓÇö `.ts` _modules_) and **201** in the
TECH-SPEC ┬º1 metrics table (`codebase-metrics.ts`, `git ls-files` tally that counts src **files**, so it
adds `src/styles/app.css`: 200 `.ts` + 1 css = 201). Both are deterministic, regen-stable instruments of
the same tree ΓÇö the 1-file gap is exactly `app.css` (modules vs files). README's prose "~200 source
modules" tracks the FILE-MAP module count. Do not hand-edit either generated value. Likewise, keep the
generated `.esk` harvest count anchored to `src/sim/generated-tsotchke-seeds.ts`; the current runtime
harvest is **1,365** programs over **2,507** scanned files.

**Verified-real but DEFERRED (recorded, not changed ΓÇö owner call / by-design / risk):**

- `src/ui/{market-ticker,nhi-observatory,super-neural}.ts` snapshot `devicePixelRatio` once at construction
  ΓåÆ canvases blur after a monitor/DPR change (cosmetic; fix = re-read DPR in the size path). Server/core/
  audio layers audited **security-clean** (path-traversal/XSS/ReDoS/proto-pollution all guarded).
- `native/CMakeLists.txt:123` `-ffast-math` (FP-reassociation vs the determinism ethos) ΓÇö the documented
  owner perf call (the native engine is the optional streamed tier, no golden tests); also `main.cpp` vertex-
  shader leak on a fragment-compile-fail path + missing dim clamps (one-time fatal paths).
- Honesty-header candidates the agents flagged on the **behind** tree ΓÇö `nqs-vmc-learning.ts` ("implements
  RPT-1/2, integrated" but 0 importers), `morphic-field.ts` ("called each beat" but never instantiated),
  `temporal-crystal.ts` (Metropolis wording vs hard thresholds): re-verify wiring on `origin/main` before
  softening (the loop wires dead modules continuously ΓÇö cf. latent-substrates).
- `ulg-bridge.ts:2` "Universal **Language Gateway**" vs other docs' "Universal **Law Graph**" ΓÇö genuinely
  ambiguous (the file IS a web bridge); an owner ruling, not a safe unilateral edit.

**Confirmed clean by this pass:** quantum/math core machine-precision-correct (math agent re-probed Wigner-6j
j=8, Clifford, Crank-Nicolson, MPS-SVD, QGT, CHSH; only the ┬º6-style header honesty above remained);
determinism law holds across all `src/sim`+`src/math` (sole `Date.now` = the fenced `world.ts` idle-growth
localStorage, outside sim logic); test suite **0** `.only`/`.skip`/vacuous across 156 files; CI runs the full
superset gate. Net at this pass's tip: `verify:facts` 0 drift / 83 surfaces, gate green.

## 15 ┬╖ UI/UX/typography cross-surface audit (the four public surfaces, 2026-06-27)

Two design-master agents read all four HTML surfaces + `src/styles/app.css` + the 22 `src/ui/**` panels.
**The owner's instinct is correct: the surfaces are 3ΓÇô4 different design systems wearing a similar dark
coat.** `index.html` (via `app.css`), `specs.html`, and `docs.html` each redeclare `:root` from scratch
with _different hex values for the same conceptual roles_; `lab/` is a separate light (Anthropic-template)
theme. The per-surface visual quality is individually high; the cross-surface CONSISTENCY is the gap.

**FIXED this pass (objective / safe ΓÇö verified prettier-clean):**

| Where                 | Issue                                                                                                        | Fix                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `specs.html` footer   | "┬⌐ 2026 0thernes" printed **twice** in one line (copy-paste)                                                | removed the duplicate                                                                |
| `specs.html` `<head>` | **no favicon** (index + docs both carry the orbit-glyph SVG icon)                                            | added the same `data:` SVG favicon ΓåÆ all 3 dark surfaces now match                 |
| `docs.html:26`        | `--ink-faint rgba(ΓÇª,0.5)` Γëê **4.0:1** at 9ΓÇô10px = **WCAG-AA FAIL** (the diagram-hints/captions/footer) | ΓåÆ `0.62` (Γëê5.0:1, passes AA)                                                     |
| `docs.html:24`        | `--ink #b8c8e8` diverged from specs `#cfe0fb`                                                                | ΓåÆ `#cfe0fb` (unifies body text across the two doc pages + brighter = more legible) |
| `lab/ΓÇªhtml:40`      | no `theme-color`, no `viewport-fit=cover`                                                                    | added `theme-color #faf9f5` (light theme) + `viewport-fit=cover`                     |

**Cross-surface divergence inventory (RECORDED ΓÇö the "wireframing is different" finding; a deliberate
token-unification is the real fix, best done with rendering + owner sign-off):**

- **No shared design-token source.** Same role, different value across surfaces: `--ink` (`#9fb6d9` app /
  `#cfe0fb` specs / now-`#cfe0fb` docs), `--line` (cyan vs periwinkle `rgba(120,160,220,.18)` on specs),
  `--panel` (`rgba(8,14,30,.66)` specs vs `rgba(3,6,18,.85)` docs), and border-radius (`app.css` uses two
  tokens; specs hand-codes five different radii; docs uses three).
- **Heading font/scale divergence.** `specs.html h1` has **no `font-family`** ΓåÆ renders in JetBrains Mono
  while `docs.html` h1 uses Inter; scales are non-modular (specs h1 46pxΓåÆh2 13px vs docs h1 15pxΓåÆh2 11px).
  (Left unchanged ΓÇö mono-spec vs Inter-headings is a stylistic-identity owner call.)
- **Nav is a different component on every surface**, and the **lab has no link back** to dome/docs/spec
  (navigational dead-end). `index.html` corner pills even use 3 different accent colors for 3 peer links.
- **In-app HUD is split-brained:** the `index.html` _markup_ panels honor the `--text-*`/`--radius-panel`/
  `--shadow-panel` tokens perfectly (exemplary), but **~12 JS-injected dock panels** (`market-ticker`,
  `super-panel`, `super-neural`, `nhi-observatory`, `pantheon-architecture-panel`, `help-system`,
  `copilot`, `access-puzzle`, `center-hud`, ΓÇª) each hardcode raw px/hex in a `STYLE` template, producing a
  non-harmonious type sprawl (8.5/9/9.5/10/10.5/11/12/13px where the token scale intends 8/9/10), 7 panel
  backgrounds, 3 radii, 4 shadows. `center-hud.ts` then `!important`-re-homes them all (a smell rooted in
  each panel owning its own geometry). **Recommended canonical set** (apply to specs+docs, propagate tokens
  into the JS `STYLE` blocks): `--ink #cfe0fb ┬╖ --ink-faint rgba(207,224,251,.55) (never <11px) ┬╖ --accent
#0ef ┬╖ --line rgba(0,160,240,.16) ┬╖ --panel rgba(3,6,18,.85) ┬╖ --radius-panel 12px ┬╖ --radius-btn 6px ┬╖
headings Inter, body JetBrains Mono`.
- **Canvas-label legibility (HIGH, deferred ΓÇö needs code-change + render test):** `nhi-observatory.ts`/
  `super-neural.ts` `lab()` helper draws chart labels at base 6.5ΓÇô7px ├ù k(0.85) Γëê **5.5ΓÇô6px on a phone
  sheet** ΓÇö effectively unreadable. Needs a min-px floor (~8px) in the two helpers.
- **app.css duplicate `prefers-reduced-motion`** global block (`:116` `1ms` and `:1221` `0.01ms` ΓÇö both
  documented; the later supersedes) ΓÇö harmless redundancy, left for the owner/loop (app.css is hot).

**Verdict:** per-surface quality high; cross-surface consistency poor (owner is right). The fixes above
close the objective bugs + the one WCAG-AA failure + 3 consistency gaps with zero visual risk; the larger
token-unification (one `:root` + one nav component + propagating tokens into the JS panels + a canvas-label
floor) is the high-value follow-up, documented here so it can be done deliberately rather than blind.
