<!-- reviewed: 2026-07-01 | mega-audit 25-point scrutiny | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# 25-Point Critical Scrutiny Scorecard — Cosmogonic Quantum Mechalogodrom

**Living document.** A single, continuously-rewritten critical scorecard: 25 adversarial scrutiny
points across engineering, architecture, Tsotchke integration, consciousness/cognition claims, and
A-Life standing. Each point is scored `0–10` (higher = more defensible), graded, and backed by a
`file:line` or gate receipt. Scored by the 2026-07-01 mega-audit (four code-grounded auditors +
adversarial verification of every finding). It is deliberately **not** all-green — the honest value of
a scorecard is where it is red.

> Read every claim against [`2026-06-26-CURRENT-TRUTH-BASELINE.md`](./2026-06-26-CURRENT-TRUTH-BASELINE.md).
> Current receipts: **v0.18.0 · 1,984 tests** (published floor; `2104` measured) **· 92.13% line / 89.66%
> function · Butlin 8/14 met + 6/14 partial · not sentient.**

## Bottom line

Overall **8.1 / 10** across 25 points. The project is engineering-strong and honesty-strong: determinism,
type-safety, test rigor, reproducibility, and sentience discipline all score ≥ 9. It is **weakest on two
axes that it already names itself** — **faculty coupling** (`~0.18` mean, "a pile is not a mind") and
**external peer validation** (none yet). Those two, not any code defect, are the real gap between
"impressive, honest artifact" and "serious scientific contribution."

![25-point scrutiny scorecard](./assets/scrutiny-25-scorecard.svg)

## The 25 points

Grade key: **A** ≥ 9 · **A−** 8–9 · **B+** 7.5–8 · **B** 6.5–7.5 · **C+** 5.5–6.5 · **C** ≤ 5.5.

### A · Engineering & code health

| #   | Scrutiny point            | Score | Grade | Criticism / evidence                                                                                                                                                           |
| --- | ------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Determinism integrity     | 9.5   | A     | No `Math.random`/`Date.now`/`performance.now` in sim/math; all randomness via seeded `Rng` (`src/math/rng.ts`). Only UI-seed exceptions in `src/main.ts`.                      |
| 2   | Type safety & lint        | 9.5   | A     | `tsc --strict` + `oxlint`; **0** `TODO`/`FIXME`/`@ts-ignore`/`eslint-disable` across `src/`. Gate-enforced.                                                                    |
| 3   | Test rigor & coverage     | 9.0   | A     | `1,984`-test floor (`2104` measured), `2,912,102` `expect()` calls, `92.13%` line / `89.66%` func; receipts law (`verify-receipts.ts`) makes an unmeasured number unshippable. |
| 4   | Time complexity / scaling | 8.5   | A−    | Entity update is `O(n·k)` on a spatial grid (`ctx.grid`), not `O(n²)`; ultra-tier LOD ≥ 5k; 50k ceiling. Stagger gates never gate RNG draws (determinism-safe).                |
| 5   | GPU resource discipline   | 8.0   | A−    | Recurring leak class (per-instance `THREE.*` outside cache) — but caught: `World.dispose()` sweep landed `bf1a405d`/2026-07-01, spy-verified `count→0` + idempotent.           |

### B · Architecture & organization

| #   | Scrutiny point                | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Living-docs SSOT              | 8.5   | A−    | Strong single-source discipline — but this audit found a real **blind spot**: `docs/reports/*` advertised "live values" yet sat outside `sync-surfaces` and `verify:facts`, so receipts froze two canon-generations back (`1771·94.77`). Fixed: canon refreshed, drifted copies rewritten, the two current-truth reports added to `SURFACES`. |
| 7   | Module contracts & boundaries | 8.5   | A−    | Binding `MODULE-CONTRACTS-2026-06-26.md` + 10 ADRs + dependency facades. Gap: ADRs frozen at 0010 — post-0.18.0 decisions (GPU dispose, sandbox hardening) live only in `AUDIT-LOG`.                                                                                                                                                          |
| 8   | PM surface coverage           | 6.5   | B     | ERD/KANBAN/ROADMAP/CHANGELOG/500-point present + maintained. **Missing:** PRD, Risk Register, Test-Strategy, Perf-Targets, SBOM manifest, Security-Architecture. See §Gaps.                                                                                                                                                                   |
| 9   | CI/CD & QA                    | 7.5   | B+    | Full `bun run check` mirrored in CI, cross-platform matrix, dependency-review + `bun audit`. Gaps: no e2e/Playwright, perf-regression is informational-only, SBOM not published to releases.                                                                                                                                                  |

### C · Tsotchke integration depth

| #   | Scrutiny point            | Score | Grade | Criticism / evidence                                                                                                                                                                                |
| --- | ------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Corpus breadth            | 8.5   | A−    | 20 corpus projects: **15 deep-wired** (re-measured this audit), **0 computed-but-dropped** (PIMC + logo-lab false-positives refuted — both consumed), 2 harvest, 3 fenced (LLM mandate), 0 missing. |
| 11  | Causal depth              | 8.5   | A−    | Outputs consumed in hot paths: PIMC `pathWeight`→`super-mind.ts:1437` (EXPLORE) + `petri-dish.ts:219`; logo `logoMorphScalar`→`petri-dish.ts:226`; ulg/QGT/spin/Eshkol into `super-mind`/`world`.   |
| 12  | Quantum-substrate honesty | 9.0   | A     | Exact classical simulation (Born rule, unitarity 1e-12); **no quantum advantage claimed** — "lacks only a physical QPU = speed/scale, not correctness." Never called fake.                          |

### D · Consciousness / cognition claims

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                                            |
| --- | -------------------------- | ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Butlin indicator scorecard | 8.0   | A−    | `8/14 met + 6/14 partial` (Butlin et al. 2023), explicitly **computational indicators, not sentience** — never inflated to 9/14 or 14/14.                                                                                                       |
| 14  | Faculty wiring honesty     | 7.5   | B+    | Honest that only **~30 of 100** faculties are deep-wired; `faculties-pantheon.ts` is a generic bias bank. The "100-faculty" headline is a _design_, not a live count — must always carry that caveat.                                           |
| 15  | Theories as mechanisms     | 8.5   | A−    | GWT ignition, IIT-Φ (participation ratio + min-cut entanglement), FEP/active-inference, HOT confidence, AST attention-schema, criticality, reservoir — all measured and fed back into behavior, not labels.                                     |
| 16  | Coupling / binding         | 5.5   | C+    | **The real bottleneck** — `coupling-audit.ts` measures `meanAbsCoupling ≈ 0.18` (weak regime; GWT bind-gate lifted baseline 0.158→0.197). "100 faculties that don't densely interact are a pile, not a mind." Honestly flagged, not yet solved. |
| 17  | Multi-substrate breadth    | 8.5   | A−    | Live: deterministic classical + 6-qubit statevector + **16-qubit Clifford reflex** (`super-mind.ts:741`) + STDP fast-weights + echo-state reservoir + spin-glass Hopfield. Wet/chemical remains aspirational.                                   |
| 18  | Scale / size framing       | 7.5   | B+    | Apex ≈ 10,081 weights; world ≈ 3.5M params. The "1-billion substrate" is a 5-tier `ParameterManifold` + 30-qubit Clifford (2³⁰ state space) — **addressable, not stored**; that caveat must always ride the claim.                              |
| 19  | Sentience discipline       | 9.5   | A     | Every surface repeats: **not sentient, hard problem untouched, indicators are proxies.** Exemplary claim hygiene for a project in this space.                                                                                                   |

### E · A-Life standing & scientific defensibility

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                            |
| --- | -------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20  | Comparative breadth        | 8.5   | A−    | Breadth-of-synthesis `z = +3.01σ` (self-scored) / `+2.10σ` (source-audited) vs a 25-system survey; deterministic stats + 11 SVGs regenerable from CSV.                                                                          |
| 21  | Novelty discipline         | 8.5   | A−    | "Novel **by integration**, not world-first"; a `0`-hard-refutation adversarial hunt tempered by real partial peers (ALIEN, ASAL, Quantum-ALife).                                                                                |
| 22  | Peer maturity / validation | 4.0   | C     | **The weakest axis.** No peer review, no external replication, confidence `0.75`. The self-scored Cosmogonic row is the audit's biggest single uncertainty.                                                                     |
| 23  | Reproducibility            | 9.5   | A     | Single-seed bit-identical runs; every stat/chart deterministic from `2026-06-26-alife-comparison-matrix.csv` (identical CSV → identical bytes).                                                                                 |
| 24  | Comparative rigor vs "100" | 7.0   | B     | The matrix is a **26-row, source-cited representative sample** of the ~100+ known A-Life systems — not 100 fabricated rows. Honest sampling; expanding with per-system code-grounded rows is a tracked improvement (see §Gaps). |
| 25  | Benchmark honesty          | 8.5   | A−    | `SuperMind.think()` ≈ 3.34 ms (full suite) — ms-scale, and the stale "sub-millisecond / <2% frame / 289 µs" claims were explicitly retired.                                                                                     |

## The two weak axes (where the real work is)

- **Coupling / binding (5.5).** The architecture has breadth (30 deep-wired faculties, 10 emergence
  angles) but the faculties do not yet densely interact: `coupling-audit.ts` measures mean absolute
  cross-faculty coupling at `~0.18` even after the GWT bind-gate lift. This is the project's own stated
  thesis (**coupling > count**) turned back on itself — and it is the highest-leverage research target.
  Concrete next step: route the GWT-ignited signal into more than the current ~7 of 16 access-faculties
  and re-measure, rather than adding an 8th theory.

- **Peer maturity / external validation (4.0).** Every internal receipt is strong, but nothing has been
  externally replicated or reviewed. The one self-scored row in the A-Life matrix is the single largest
  uncertainty in the whole comparative claim. The fix is not more code — it is a minimal reproducible
  artifact (fixed-seed run + the coupling/Butlin harness) that a third party can execute and confirm.

## Gaps & holes to add (prioritized)

Drawn from the doc-organization + PM audit. None are release-blockers; all are hygiene/clarity.

1. **PM artifacts (P2):** add `PRD`, `RISK-REGISTER`, `TEST-STRATEGY`, `PERFORMANCE-TARGETS`,
   `DEPENDENCY-MANIFEST` (SBOM policy), `SECURITY-ARCHITECTURE`. Scope is currently implicit in
   ROADMAP + PHILOSOPHY + MODULE-CONTRACTS.
2. **ADR-0011+ (P2):** record post-0.18.0 decisions (GPU-dispose contract, sandbox secret-leak
   hardening, memory-orchestra wiring) as ADRs — they exist only in `AUDIT-LOG` today.
3. **CI gaps (P1):** e2e/WebGL smoke (Playwright), perf-regression time-series + threshold alerting,
   publish `bun sbom` output to release artifacts.
4. **Snapshot ambiguity (P3):** clarify in `CLAUDE.md` whether root `HANDOFF-`, `AGENTS-`,
   `research_receipts-` and `docs/DAILY_RUNS/*` are living-in-place or archived point-in-time.
5. **Comparative matrix (P2):** grow the A-Life matrix beyond 26 rows with **source-cited, code-grounded**
   systems (e.g. NEAT/HyperNEAT, Geb, Chromaria, The Bibites, Species-ALRE) — never fabricated scores.
6. **Coupling instrumentation (P1):** promote `meanAbsCoupling` into a first-class gate metric with a
   regression floor, so the binding bottleneck is tracked like coverage is.

## Method

Four parallel code-grounded auditors (code-health, Tsotchke wiring, doc/PM, consciousness metrics) plus
adversarial verification of every finding against `file:line`. Two "computed-but-dropped" findings
(PIMC, logo-lab) were **refuted** on verification — both are consumed — and one stale claim (Clifford
tableau "not wired") was **confirmed** stale and corrected in `2026-06-17-STATE-OF-THE-ART-COMBINED.md`.
Scores are the audit's judgment, not a mechanical formula; the SVG is regenerable and the underlying
receipts are all gate-enforced or `file:line`-cited.
