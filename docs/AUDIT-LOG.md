<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Audit Log (centralized)

**One place for the project's audit history.** New audits, reviews, and fix-passes append a dated
entry HERE (newest first). The dated reports under [`docs/reports/`](./reports/) are **living,
continuously-rewritten current documents** — rewritten in place to current truth, never forked into
dated / historical / "superseded snapshot" copies (per the binding "Living docs, no archives" law in
[CLAUDE.md](../CLAUDE.md)). Live facts (version, test/coverage receipts) are propagated automatically by
`scripts/sync-surfaces.ts`. This log records what changed and why.

---

## 2026-06-26 — Full-repo consistency audit + gate-RED fixes (verification ledger)

Obsessive cross-surface fact audit (every MD / HTML / XML / code path). The canonical source-of-truth
matrix + the full findings table live in
[VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md).

- **Gate restored to green.** 3 dead relative links (`CHANGELOG.md` + `docs/KANBAN.md` → the deleted
  `docs/audit-2026-06-15/` dir, consolidated by `e51a376`) repointed to `docs/AUDIT-LOG.md`;
  `tests/doc-links.test.ts` `SKIP` extended with `.claude` (transient worktrees) + `legacy`
  (preserved-verbatim) so nested-worktree pollution no longer false-fails the local gate. 0 broken
  links repo-wide.
- **CHANGELOG hygiene.** Merged three duplicate `## [0.16.1] - 2026-06-21` headers into one; removed 3
  orphaned Ralph-loop `###` slop lines below the reference-link footer; completed the footer links.
- **Count drift.** `docs/KANBAN.md` "ALL 19 Tsotchke repos" -> "20 projects" (canonical: 19 mirrors +
  Eshkol flagship).
- **Every MD date-stamped (the `/goal` "current date on every MD", done safely).** Prepended an
  idempotent `<!-- reviewed: 2026-06-26 … -->` marker to all **75 maintained** Markdown docs (excludes
  `legacy/**` verbatim, `.github/**` + `.memory/**` external-tool files, and the dated `CHANGELOG.md`).
  Done as an in-content stamp, NOT a filename rename — renaming would 404 the entire cross-link graph,
  the `sync-surfaces.ts` surface list, the doc-links gate, and GitHub Pages. Gate stays green.
- **Stale figures propagated to current truth (living-docs rewrite-in-place).** 13 loop-log / process /
  ADR surfaces carried stale receipts (`HANDOFF.md` 942/1172; `research_receipts.md`, `docs/GOAL5-*`,
  `docs/TSOTCHKE_CORPUS_INTEGRATION_AUDIT.md`, `docs/TSOTCHKE-CORPUS-RALPH-WIRING-*` 1183/1174;
  `docs/adr/0007/0008/0009` 671/736/1504; `docs/DESIGN-SYSTEM.md` 229; `docs/DAILY_RUNS/*` 942/913;
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
  `ARCHITECTURE.md` stale "0.16.1+ master" -> 0.17.1+.
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
- **Tsotchke:** living map [`TSOTCHKE-INTEGRATION-MAP.md`](./TSOTCHKE-INTEGRATION-MAP.md) · plan [`TSOTCHKE-CORPUS-INTEGRATION-PLAN.md`](./TSOTCHKE-CORPUS-INTEGRATION-PLAN.md) · source-provenance audits still cited from code (`TSOTCHKE-CORPUS-RALPH-WIRING-AUDIT-2026-06-19.md`, `TSOTCHKE_CORPUS_INTEGRATION_AUDIT.md`, `TSOTCHKE-ULTIMATE-COMPREHENSIVE-AUDIT-REPORT-ASSESSMENT-2026-06-20.md`).

## 2026-06-26 — Roadmap Fulfillment: P1 Harness + Coupling Scaffold

- Added deterministic `scripts/p1-quantum-classical-experiment.ts` for a falsifiable quantum-vs-classical contrast harness; the bootstrap uses seeded RNG, not `Math.random`.
- Added `bench/quantum-classical.bench.ts` as a tiny reproducible scaffold around shipped contrast functions; it does not claim quantum advantage.
- Added `structuredCouplingModulationInto` and wired it through `FacultiesPantheon` with caller-owned scratch, preserving the hot-loop allocation rule.
- Added `bedauPackardActivity` as a pure open-endedness metric for future petri/soup ablations.
- Truth boundary preserved: this is measurement infrastructure and a coupling scaffold, not a new sentience claim and not a 14/14 claim.
