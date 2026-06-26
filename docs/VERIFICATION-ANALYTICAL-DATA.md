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

| Fact                | Canonical value           | Source of truth                                              | Propagated by           |
| ------------------- | ------------------------- | ------------------------------------------------------------ | ----------------------- |
| Package version     | `0.18.0`                  | `package.json` `version`                                     | `sync-surfaces.ts`      |
| Test count (floor)  | `1477`                    | `scripts/canonical-receipts.ts`                              | `sync-surfaces.ts`      |
| Line coverage       | `95.03%`                  | `scripts/canonical-receipts.ts`                              | `sync-surfaces.ts`      |
| Function coverage   | `92.03%`                  | `scripts/canonical-receipts.ts`                              | `sync-surfaces.ts`      |
| Faculties (design)  | `100` (~30 deep-wired)    | `CANONICAL_FACULTIES`                                        | `sync-surfaces.ts`      |
| Archon pantheon     | `25` (5 apex + 20 light)  | `CANONICAL_ARCHONS`                                          | `sync-surfaces.ts`      |
| Theory-of-mind orgs | `25`                      | `CANONICAL_TOM_ORGANS`                                       | `sync-surfaces.ts`      |
| Emergence angles    | `10` (+5 god events)      | `CANONICAL_EMERGENCE_ANGLES`                                 | `sync-surfaces.ts`      |
| Biologic forms      | `26`                      | `CANONICAL_BIOLOGIC_FORMS`                                   | `sync-surfaces.ts`      |
| Butlin scorecard    | `8/14 met + 6/14 partial` | measured 2026-06-21 adversarial code audit                   | prose (NOT auto-synced) |
| Tsotchke corpus     | `20 projects, ~16 wired`  | [TSOTCHKE-INTEGRATION-MAP.md](./TSOTCHKE-INTEGRATION-MAP.md) | prose (NOT auto-synced) |
| Entity ceiling      | `50,000` (mega tier)      | `src/core/quality.ts` `resolveTier`                          | prose (NOT auto-synced) |
| Apex composite mind | `~10,081` weights         | `src/sim/super-mind.ts`                                      | prose (NOT auto-synced) |
| Legacy spine        | `~1,444` params           | `src/sim/super-mind.ts` / ADR-0008                           | prose (NOT auto-synced) |

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
| Root MD          | `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, …              |
| Steering         | `CLAUDE.md`, `AGENTS.md`, `masters/*.xml` (3), `docs/PHILOSOPHY.md`, `docs/MODULE-CONTRACTS.md`   |
| Progress / truth | `docs/NHSI-PROGRESS-DASHBOARD.md`, `docs/reports/2026-06-26-CURRENT-TRUTH-BASELINE.md`            |
| Consciousness    | `docs/PATH-TO-14-14-CONSCIOUSNESS-INDICATORS.md`, `docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md` |
| HTML surfaces    | `index.html`, `docs.html`, `specs.html` (+ `lab/`)                                                |
| Tsotchke         | `docs/TSOTCHKE-INTEGRATION-MAP.md` (authoritative), `THIRD-PARTY-NOTICES.md`                      |
| Diagrams         | `docs/ERD.md`, `docs/ERM.md`, `docs/ERP.md`, `docs/ARCHITECTURE.md`                               |

---

## 3 · Audit findings (2026-06-26)

| #   | Severity                   | Where                             | Issue                                                                                                                                                                                                                    | Resolution                                                                                                                                                                              |
| --- | -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **P0 gate-RED**            | `.github/copilot-instructions.md` | markdown tables collapsed by the external `hacklm-memory` tool → fails `prettier --check` (first gate stage) in the working tree                                                                                         | `prettier --write` (re-pad tables)                                                                                                                                                      |
| B   | reconciled (not a bug)     | `scripts/canonical-receipts.ts`   | `CANONICAL_TEST_COUNT = 1477` vs measured 2924                                                                                                                                                                           | floor semantics confirmed correct; 1477 is the published headline floor                                                                                                                 |
| C   | **P0 gate-RED**            | `CHANGELOG.md`, `docs/KANBAN.md`  | 3 dead relative links into the deleted `docs/audit-2026-06-15/` folder (consolidated into AUDIT-LOG by `e51a376`)                                                                                                        | repoint to `docs/AUDIT-LOG.md`                                                                                                                                                          |
| C2  | P1 test-hygiene            | `tests/doc-links.test.ts`         | `SKIP` set omitted `.claude/` → the test scanned nested worktree copies and false-failed                                                                                                                                 | add `.claude`, `legacy`, `site`, `coverage` to `SKIP`                                                                                                                                   |
| D   | P1 doc-rot                 | `docs/KANBAN.md`                  | mojibake: `Ÿ¥`×11/`Ÿ§`×7/`Ÿ¨`×1 (orphaned-emoji fragments), `”`×34 used as `—`, plus `¦`/`“`/`©º` — slipped the encoding gate (orphaned fragments aren't double-encoding; `U+201D` is a legit codepoint)                 | byte-precise normalize: drop corrupted emoji prefixes, restore `—`/`–` separators                                                                                                       |
| E   | P2 count-drift             | `docs/KANBAN.md:17`               | "ALL **19** Tsotchke repos" — only outlier vs the canonical "20 corpus projects" everywhere                                                                                                                              | `19 → 20`                                                                                                                                                                               |
| F   | ✅ FIXED                   | `HANDOFF.md` + 12 surfaces        | dated loop-log / process / ADR surfaces carried stale current-state receipts (`HANDOFF` `942 tests`; `research_receipts` / `GOAL5-*` / `TSOTCHKE_CORPUS` `1183`; ADRs `671`/`736`/`1504`; `TSOTCHKE-ULTIMATE` `v0.16.1`) | per the living-docs law (rewrite in place to current truth), **propagated all → `1477 / 95.03% / 92.03% / v0.18.0`**; only `CHANGELOG` per-release receipts + `legacy/**` kept verbatim |
| G   | flag (cleanliness)         | repo root                         | stray debug logs tracked at root (`.gate.log`, `.gate.baseline.log`, `.audit-gate.log`, `law.log`, `law_error.txt`, `tsc.log`, `tscout.txt`, `receipts_print.txt`)                                                       | noted for cleanup                                                                                                                                                                       |
| H   | flag (fidelity, not a bug) | `src/math/curvature-aware-qng.ts` | `computeChristoffelSymbols` sets `dg=0`, so the general N×N "curvature-aware" path reduces to ordinary QNG                                                                                                               | honestly documented as a simplification; no NaN / wrong shape; noted so the caveat is visible                                                                                           |

**Finding D2 — master governance XML mojibake (root cause + fix).** All three `masters/*.xml` files
(the EXECUTOR / ARCHITECT / PHYSICIST steering docs read before every change) each carried ~150
box-drawing `═` rules double-encoded into `â•` runs, plus `â€"`→`—`, `·`→`·`, `â†'`→`→`. Root cause:
`scripts/normalize-docs.ts` globbed `.md` + the 3 HTML files but **not `masters/*.xml`**, and the
`docs-truth-law` encoding gate scanned only the `.md` CANONICAL list + HTML — so XML corruption shipped
with green CI. Fix: normalize-docs now globs `masters/**/*.xml` + `docs/**/*.xml` (repaired all 3, byte-
verified clean), and a new `docs-truth-law` block encoding-gates the steering XML + KANBAN against
mojibake / U+FFFD / sub-lead-byte / curly-quote corruption.

### Code audit (core math / sim / AI) — CLEAN

A line-by-line review of `src/math/**` and `src/sim/**` (hand-verified against standard formulas, not
docstrings) found **no P0/P1 correctness bugs**. Quantum gates / Born rule / Bloch vector, mulberry32 +
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

The `/goal` asked to "update the name (with current date) of every MD file." This is **intentionally not
done as a rename**, because it directly conflicts with the repo's binding **"Living docs, no archives"**
law (CLAUDE.md): docs are single, current documents rewritten in place; dated/forked copies are
prohibited tech-debt, and renaming would break the cross-link graph that `tests/doc-links.test.ts`
enforces (and the `sync-surfaces.ts` surface list). The intent — _every doc current and mutually
consistent_ — is instead served by: (1) rewriting stale content in place, (2) refreshing the
verified-on date stamps inside docs, and (3) this ledger. Filenames that legitimately carry a date
(`docs/reports/2026-06-2x-*`, `docs/DAILY_RUNS/*`) are point-in-time records and keep their names.
