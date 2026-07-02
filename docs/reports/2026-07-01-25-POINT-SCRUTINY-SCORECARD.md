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

Overall **8.3 / 10** across 25 points (8.1 → 8.2 → 8.3 across the three audit rounds as tracked gaps
closed: the 113-system matrix, all six PM artifacts, ADR-0011, the reproducibility artifact — and two
stale self-criticisms were retracted in the repo's favor: the SBOM **is** released with SLSA provenance,
and `meanAbsCoupling` **is** already a gate metric with a 0.188 regression floor). The project is
engineering-strong and honesty-strong: determinism, type-safety, test rigor, reproducibility, and
sentience discipline all score ≥ 9. It remains **weakest on the two axes it names itself** — **faculty
coupling** (`~0.19` mean, "a pile is not a mind") and **external peer validation** (the replication
artifact now exists; a citable third-party run does not). Those two, not any code defect, are the real
gap between "impressive, honest artifact" and "serious scientific contribution."

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

| #   | Scrutiny point                | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Living-docs SSOT              | 8.5   | A−    | Strong single-source discipline — but this audit found a real **blind spot**: `docs/reports/*` advertised "live values" yet sat outside `sync-surfaces` and `verify:facts`, so receipts froze two canon-generations back (`1771·94.77`). Fixed: canon refreshed, drifted copies rewritten, the two current-truth reports added to `SURFACES`.                                                                                               |
| 7   | Module contracts & boundaries | 8.5   | A−    | Binding `MODULE-CONTRACTS-2026-06-26.md` + 11 ADRs + dependency facades. The "ADRs frozen at 0010" gap is closed: [ADR-0011](../adr/0011-post-018-hardening-conventions-2026-07-02.md) names the four post-0.18.0 hardening conventions (GPU ownership, numeric domain guards, SSOT surface registration, grid-first radius actions).                                                                                                       |
| 8   | PM surface coverage           | 8.5   | A−    | **All six PM artifacts now exist** (2026-07-02): [PRD](../PRD-2026-07-02.md), [Risk Register](../RISK-REGISTER-2026-07-02.md), [Test Strategy](../TEST-STRATEGY-2026-07-02.md), [Perf Targets](../PERFORMANCE-TARGETS-2026-07-02.md), [Security Architecture](../SECURITY-ARCHITECTURE-2026-07-02.md), [Dependency Manifest](../DEPENDENCY-MANIFEST-2026-07-02.md) — plus ERD/KANBAN/ROADMAP/CHANGELOG/500-point, all linked from BOOK §10. |
| 9   | CI/CD & QA                    | 8.0   | A−    | Full `bun run check` mirrored in CI, cross-platform matrix, `bun audit`, **SBOM published per release with SLSA provenance** (release.yml:113 — the earlier "not published" criticism was stale and is retracted). Remaining gaps: no e2e/Playwright, perf-regression is informational-only.                                                                                                                                                |

### C · Tsotchke integration depth

| #   | Scrutiny point            | Score | Grade | Criticism / evidence                                                                                                                                                                                |
| --- | ------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Corpus breadth            | 8.5   | A−    | 20 corpus projects: **15 deep-wired** (re-measured this audit), **0 computed-but-dropped** (PIMC + logo-lab false-positives refuted — both consumed), 2 harvest, 3 fenced (LLM mandate), 0 missing. |
| 11  | Causal depth              | 8.5   | A−    | Outputs consumed in hot paths: PIMC `pathWeight`→`super-mind.ts:1437` (EXPLORE) + `petri-dish.ts:219`; logo `logoMorphScalar`→`petri-dish.ts:226`; ulg/QGT/spin/Eshkol into `super-mind`/`world`.   |
| 12  | Quantum-substrate honesty | 9.0   | A     | Exact classical simulation (Born rule, unitarity 1e-12); **no quantum advantage claimed** — "lacks only a physical QPU = speed/scale, not correctness." Never called fake.                          |

### D · Consciousness / cognition claims

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Butlin indicator scorecard | 8.0   | A−    | `8/14 met + 6/14 partial` (Butlin et al. 2023), explicitly **computational indicators, not sentience** — never inflated to 9/14 or 14/14.                                                                                                                                                                                  |
| 14  | Faculty wiring honesty     | 7.5   | B+    | Honest that only **~30 of 100** faculties are deep-wired; `faculties-pantheon.ts` is a generic bias bank. The "100-faculty" headline is a _design_, not a live count — must always carry that caveat.                                                                                                                      |
| 15  | Theories as mechanisms     | 8.5   | A−    | GWT ignition, IIT-Φ (participation ratio + min-cut entanglement), FEP/active-inference, HOT confidence, AST attention-schema, criticality, reservoir — all measured and fed back into behavior, not labels.                                                                                                                |
| 16  | Coupling / binding         | 5.5   | C+    | **The real bottleneck** — `meanAbsCoupling ≈ 0.19` (weak regime; GWT bind-gate lifted baseline 0.158→0.197). It **is already a gate metric**: `coupling-audit.test.ts:170` enforces a `0.188` regression floor + a `0.6` anti-overclaim ceiling. Instrumented and honestly flagged; the coupling itself is not yet solved. |
| 17  | Multi-substrate breadth    | 8.5   | A−    | Live: deterministic classical + 6-qubit statevector + **16-qubit Clifford reflex** (`super-mind.ts:741`) + STDP fast-weights + echo-state reservoir + spin-glass Hopfield. Wet/chemical remains aspirational.                                                                                                              |
| 18  | Scale / size framing       | 7.5   | B+    | Apex ≈ 10,081 weights; world ≈ 3.5M params. The "1-billion substrate" is a 5-tier `ParameterManifold` + 30-qubit Clifford (2³⁰ state space) — **addressable, not stored**; that caveat must always ride the claim.                                                                                                         |
| 19  | Sentience discipline       | 9.5   | A     | Every surface repeats: **not sentient, hard problem untouched, indicators are proxies.** Exemplary claim hygiene for a project in this space.                                                                                                                                                                              |

### E · A-Life standing & scientific defensibility

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------- | ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20  | Comparative breadth        | 8.5   | A−    | Breadth-of-synthesis `z = +4.02σ` (self-scored) / `+2.83σ` (source-audited) vs a **113-system** survey; deterministic stats + 11 SVGs regenerable from CSV. The signal strengthened when the field grew 25→113.                                                                                                                                                                           |
| 21  | Novelty discipline         | 8.5   | A−    | "Novel **by integration**, not world-first"; a `0`-hard-refutation adversarial hunt tempered by real partial peers (ALIEN, ASAL, Quantum-ALife).                                                                                                                                                                                                                                          |
| 22  | Peer maturity / validation | 5.0   | C+    | **Still the weakest axis** — no peer review, no published external replication. The mechanical excuse is now removed: [`scripts/reproduce.ts`](../../scripts/reproduce.ts) + [REPRODUCE-2026-07-02.md](../REPRODUCE-2026-07-02.md) let anyone replicate the determinism fingerprint + gate-enforced coupling band in one command. The remaining gap is an actual citable third-party run. |
| 23  | Reproducibility            | 9.5   | A     | Single-seed bit-identical runs; every stat/chart deterministic from `2026-06-26-alife-comparison-matrix.csv` (identical CSV → identical bytes).                                                                                                                                                                                                                                           |
| 24  | Comparative rigor vs "100" | 8.5   | A−    | **Now met:** the matrix holds Cosmogonic against **112 other systems** (113 total), each web-sourced and adversarially score-verified via an 8-bucket research fan-out — not fabricated rows. Only the Cosmogonic row is self-scored (+ code-grounded); all 112 peers carry a source URL.                                                                                                 |
| 25  | Benchmark honesty          | 8.5   | A−    | `SuperMind.think()` ≈ 1.99 ms (full suite, 2026-07-02) — ms-scale, and the stale "sub-millisecond / <2% frame / 289 µs" claims were explicitly retired.                                                                                                                                                                                                                                   |

## The two weak axes (where the real work is)

- **Coupling / binding (5.5).** The architecture has breadth (30 deep-wired faculties, 10 emergence
  angles) but the faculties do not yet densely interact: `coupling-audit.ts` measures mean absolute
  cross-faculty coupling at `~0.19` even after the GWT bind-gate lift, and the gate now locks that in
  (`coupling-audit.test.ts:170`, floor `0.188`). This is the project's own stated thesis
  (**coupling > count**) turned back on itself — and it is the highest-leverage research target.
  Concrete next step: route the GWT-ignited signal into more than the current ~7 of 16 access-faculties
  and re-measure, rather than adding an 8th theory.

- **Peer maturity / external validation (5.0).** Every internal receipt is strong, and the mechanical
  replication path now ships ([`scripts/reproduce.ts`](../../scripts/reproduce.ts) +
  [REPRODUCE-2026-07-02.md](../REPRODUCE-2026-07-02.md): one command → determinism fingerprint +
  gate-band coupling on any machine). What remains is the part no code can do: an actual **citable
  third-party replication or peer-reviewed treatment** of the coupling/open-endedness experiments.

## Gaps & holes (status-tracked)

Drawn from the doc-organization + PM audit. None are release-blockers; all are hygiene/clarity.

1. **PM artifacts — DONE, 6 of 6 (2026-07-02):** [`PRD`](../PRD-2026-07-02.md),
   [`RISK-REGISTER`](../RISK-REGISTER-2026-07-02.md), [`TEST-STRATEGY`](../TEST-STRATEGY-2026-07-02.md),
   [`PERFORMANCE-TARGETS`](../PERFORMANCE-TARGETS-2026-07-02.md),
   [`SECURITY-ARCHITECTURE`](../SECURITY-ARCHITECTURE-2026-07-02.md), and
   [`DEPENDENCY-MANIFEST`](../DEPENDENCY-MANIFEST-2026-07-02.md) all exist, linked from BOOK §10.
2. **ADR-0011 — DONE (2026-07-02):** [`0011-post-018-hardening-conventions`](../adr/0011-post-018-hardening-conventions-2026-07-02.md)
   names the four recurring conventions (GPU ownership, numeric domain guards, SSOT surface
   registration, grid-first radius actions). Future decisions get their own ADRs.
3. **CI gaps (P1, still open):** e2e/WebGL smoke (Playwright), perf-regression time-series + threshold
   alerting. (The SBOM item is retracted — release.yml already publishes it with SLSA provenance.)
4. **Snapshot ambiguity (P3, still open):** clarify in `CLAUDE.md` whether root `HANDOFF-`, `AGENTS-`,
   `research_receipts-` and `docs/DAILY_RUNS/*` are living-in-place or archived point-in-time.
5. **Comparative matrix — DONE 2026-07-02:** grew from 26 to **113 rows**, each source-cited and
   adversarially score-verified. Next: code-ground a sample of the peer rows (currently literature-scored).
6. **Coupling instrumentation — retracted (already existed):** `meanAbsCoupling` has been a first-class
   gate metric since the bind-gate work (`coupling-audit.test.ts:170`, floor `0.188` + ceiling `0.6`).
   The open work is raising the _coupling itself_, not the instrumentation.
7. **Reproducibility artifact — DONE (2026-07-02):** see point #22.

## Method

Four parallel code-grounded auditors (code-health, Tsotchke wiring, doc/PM, consciousness metrics) plus
adversarial verification of every finding against `file:line`. Two "computed-but-dropped" findings
(PIMC, logo-lab) were **refuted** on verification — both are consumed — and one stale claim (Clifford
tableau "not wired") was **confirmed** stale and corrected in `2026-06-17-STATE-OF-THE-ART-COMBINED.md`.
Scores are the audit's judgment, not a mechanical formula; the SVG is regenerable and the underlying
receipts are all gate-enforced or `file:line`-cited.
