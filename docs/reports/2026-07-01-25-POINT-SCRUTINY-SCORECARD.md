<!-- reviewed: 2026-07-01 | mega-audit 25-point scrutiny | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# 25-Point Critical Scrutiny Scorecard — Cosmogonic Quantum Mechalogodrom

**Living document.** A single, continuously-rewritten critical scorecard: 25 adversarial scrutiny
points across engineering, architecture, Tsotchke integration, consciousness/cognition claims, and
A-Life standing. Each point is scored `0–10` (higher = more defensible), graded, and backed by a
`file:line` or gate receipt. Scored by the 2026-07-01 mega-audit (four code-grounded auditors +
adversarial verification of every finding). It is deliberately **not** all-green — the honest value of
a scorecard is where it is red.

> Read every claim against [`VERIFICATION-ANALYTICAL-DATA.md`](../VERIFICATION-ANALYTICAL-DATA.md) §1.
> Current receipts: **v0.22.0 · canonical floor 3,167 tests · 84.64 % line / 82.21 % function**;
> latest Windows-local gate on 2026-07-12 measured **3,001 completed cases · 0 failures ·
> 3,539,785 `expect()` calls**. The portable coverage floor remains the synced canonical
> `84.64 % / 82.21 %`; the latest Windows-local coverage receipt is recorded in the table below.

## Bottom line

Overall **8.3 / 10** across 25 points (8.1 → 8.2 → 8.3 across the three audit rounds as tracked gaps
closed: the 113-system matrix, all six PM artifacts, ADR-0011, the reproducibility artifact — and two
stale self-criticisms were retracted in the repo's favor: the SBOM **is** released with SLSA provenance,
and `meanAbsCoupling` **is** already a gate metric with a 0.188 regression floor). The project is
engineering-strong and honesty-strong: determinism, type-safety, test rigor, reproducibility, and
sentience discipline all score ≥ 9. It remains **weakest on the two axes it names itself** — **faculty
coupling** (mean `~0.27` at the audit config after the 2026-07-02 selfAware un-rail — improving but
still the weak regime; "a pile is not a mind") and **external peer validation** (the replication
artifact now exists; a citable third-party run does not). Those two, not any code defect, are the real
gap between "impressive, honest artifact" and "serious scientific contribution."

![25-point scrutiny scorecard](./assets/scrutiny-25-scorecard.svg)

## The 25 points

Grade key: **A** ≥ 9 · **A−** 8–9 · **B+** 7.5–8 · **B** 6.5–7.5 · **C+** 5.5–6.5 · **C** ≤ 5.5.

### A · Engineering & code health

| #   | Scrutiny point            | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Determinism integrity     | 9.5   | A     | No `Math.random`/`Date.now`/`performance.now` in sim/math; all randomness via seeded `Rng` (`src/math/rng.ts`). Only UI-seed exceptions in `src/main.ts`.                                                                                                                                                                                                                 |
| 2   | Type safety & lint        | 9.5   | A     | `tsc --strict` + `oxlint`; **0** `TODO`/`FIXME`/`@ts-ignore`/`eslint-disable` across `src/`. Gate-enforced.                                                                                                                                                                                                                                                               |
| 3   | Test rigor & coverage     | 9.0   | A     | `3,167`-test canonical floor; latest Windows-local full receipt measured `3,001` completed cases / `0` fail and `3,539,785` `expect()` calls. Windows coverage measured `93.39%` line / `91.37%` func; published portable coverage remains the canonical `84.64%` line / `82.21%` func floor. Receipts law (`verify-receipts.ts`) makes an unmeasured number unshippable. |
| 4   | Time complexity / scaling | 8.5   | A−    | Entity update is `O(n·k)` on a spatial grid (`ctx.grid`), not `O(n²)`; ultra-tier LOD ≥ 5k; 50k ceiling. Stagger gates never gate RNG draws (determinism-safe).                                                                                                                                                                                                           |
| 5   | GPU resource discipline   | 8.0   | A−    | Recurring leak class (per-instance `THREE.*` outside cache) — but caught: `World.dispose()` sweep landed `bf1a405d`/2026-07-01, spy-verified `count→0` + idempotent.                                                                                                                                                                                                      |

### B · Architecture & organization

| #   | Scrutiny point                | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Living-docs SSOT              | 8.5   | A−    | Strong single-source discipline — but this audit found a real **blind spot**: `docs/reports/*` advertised "live values" yet sat outside `sync-surfaces` and `verify:facts`, so receipts froze two canon-generations back (`1771·94.77`). Fixed: canon refreshed, drifted copies rewritten, the two current-truth reports added to `SURFACES`.                                                                         |
| 7   | Module contracts & boundaries | 8.5   | A−    | Binding `MODULE-CONTRACTS-2026-06-26.md` + 11 ADRs + dependency facades. The "ADRs frozen at 0010" gap is closed: [ADR-0011](../adr/0011-post-018-hardening-conventions-2026-07-02.md) names the four post-0.18.0 hardening conventions (GPU ownership, numeric domain guards, SSOT surface registration, grid-first radius actions).                                                                                 |
| 8   | PM surface coverage           | 8.5   | A−    | The PM surface set is consolidated: [Roadmap](../../ROADMAP-2026-06-26.md), [Risk Register](../RISK-REGISTER-2026-07-02.md), [Verification](../VERIFICATION-ANALYTICAL-DATA.md), [Benchmarks](../BENCHMARKS-2026-06-26.md), [Security Architecture](../SECURITY-ARCHITECTURE-2026-07-02.md), and [Third-Party Notices](../../THIRD-PARTY-NOTICES.md) — plus ERD/KANBAN/CHANGELOG/500-point, all linked from BOOK §10. |
| 9   | CI/CD & QA                    | 8.0   | A−    | Full `bun run check` mirrored in CI, cross-platform matrix, `bun audit`, **SBOM published per release with SLSA provenance** (release.yml:113 — the earlier "not published" criticism was stale and is retracted). Remaining gaps: no e2e/Playwright, perf-regression is informational-only.                                                                                                                          |

### C · Tsotchke integration depth

| #   | Scrutiny point            | Score | Grade | Criticism / evidence                                                                                                                                                                                                 |
| --- | ------------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Corpus breadth            | 8.5   | A−    | 20 corpus projects / 22 registry entries: **9 deep, 7 wired, 2 harvest, 3 fenced, 1 meta**; precise scientific wired fraction is `18/21`. Fenced entries remain provenance-only; no blanket full-depth wiring claim. |
| 11  | Causal depth              | 8.5   | A−    | Outputs consumed in hot paths: PIMC `pathWeight`→`super-mind.ts:1437` (EXPLORE) + `petri-dish.ts:219`; logo `logoMorphScalar`→`petri-dish.ts:226`; ulg/QGT/spin/Eshkol into `super-mind`/`world`.                    |
| 12  | Quantum-substrate honesty | 9.0   | A     | Exact classical simulation (Born rule, unitarity 1e-12); **no quantum advantage claimed** — "lacks only a physical QPU = speed/scale, not correctness." Never called fake.                                           |

### D · Consciousness / cognition claims

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Butlin indicator scorecard | 8.0   | A−    | `8/14 met + 6/14 partial` (Butlin et al. 2023), explicitly **computational indicators, not sentience** — never inflated to 9/14 or 14/14.                                                                                                                                                                                                                                                                                                |
| 14  | Faculty wiring honesty     | 7.5   | B+    | Honest that only **~30 of 100** faculties are deep-wired; `faculties-pantheon.ts` is a generic bias bank. The "100-faculty" headline is a _design_, not a live count — must always carry that caveat.                                                                                                                                                                                                                                    |
| 15  | Theories as mechanisms     | 8.5   | A−    | GWT ignition, IIT-Φ (participation ratio + min-cut entanglement), FEP/active-inference, HOT confidence, AST attention-schema, criticality, reservoir — all measured and fed back into behavior, not labels.                                                                                                                                                                                                                              |
| 16  | Coupling / binding         | 6.0   | C+    | **The real bottleneck**, incrementally improving: `meanAbsCoupling` lineage 0.167→0.183 (bind-gate)→0.197 (shared-processing)→**0.270** (2026-07-02 apex + selfAware un-rail; isolated faculties 5→3 across seeds). Gate-enforced floor + isolation receipt (`coupling-audit.test.ts`). Two routings measured NULL and reverted (reservoir input-gain, holographic imprint-scale). Still the weak regime — not a solved binding problem. |
| 17  | Multi-substrate breadth    | 8.5   | A−    | Live: deterministic classical + 6-qubit statevector + **16-qubit Clifford reflex** (`super-mind.ts:741`) + STDP fast-weights + echo-state reservoir + spin-glass Hopfield. Wet/chemical remains aspirational.                                                                                                                                                                                                                            |
| 18  | Scale / size framing       | 7.5   | B+    | Apex ≈ 10,081 weights; world ≈ 3.5M params. The "1-billion substrate" is a 5-tier `ParameterManifold` + 30-qubit Clifford (2³⁰ state space) — **addressable, not stored**; that caveat must always ride the claim.                                                                                                                                                                                                                       |
| 19  | Sentience discipline       | 9.5   | A     | Every surface repeats: **not sentient, hard problem untouched, indicators are proxies.** Exemplary claim hygiene for a project in this space.                                                                                                                                                                                                                                                                                            |

### E · A-Life standing & scientific defensibility

| #   | Scrutiny point             | Score | Grade | Criticism / evidence                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20  | Comparative breadth        | 8.5   | A−    | Breadth-of-synthesis `z = +4.02σ` (self-scored) / `+2.83σ` (source-audited) vs a **113-system** survey; deterministic stats + 11 SVGs regenerable from CSV. The signal strengthened when the field grew 25→113.                                                                                                                    |
| 21  | Novelty discipline         | 8.5   | A−    | "Novel **by integration**, not world-first"; a `0`-hard-refutation adversarial hunt tempered by real partial peers (ALIEN, ASAL, Quantum-ALife).                                                                                                                                                                                   |
| 22  | Peer maturity / validation | 5.0   | C+    | **Still the weakest axis** — no peer review, no published external replication. The mechanical excuse is now removed: [`scripts/reproduce.ts`](../../scripts/reproduce.ts) lets anyone replicate the determinism fingerprint + gate-enforced coupling band in one command. The remaining gap is an actual citable third-party run. |
| 23  | Reproducibility            | 9.5   | A     | Single-seed bit-identical runs; every stat/chart deterministic from `2026-06-26-alife-comparison-matrix.csv` (identical CSV → identical bytes).                                                                                                                                                                                    |
| 24  | Comparative rigor vs "100" | 8.5   | A−    | **Now met:** the matrix holds Cosmogonic against **112 other systems** (113 total), each web-sourced and adversarially score-verified via an 8-bucket research fan-out — not fabricated rows. Only the Cosmogonic row is self-scored (+ code-grounded); all 112 peers carry a source URL.                                          |
| 25  | Benchmark honesty          | 8.5   | A−    | `SuperMind.think()` ≈ 1.99 ms (full suite, 2026-07-02) — ms-scale, and the stale "sub-millisecond / <2% frame / 289 µs" claims were explicitly retired.                                                                                                                                                                            |

## The two weak axes (where the real work is)

- **Coupling / binding (6.0).** The architecture has breadth (30 deep-wired faculties, 10 emergence
  angles) but the faculties do not yet densely interact. The 2026-07-02 measured experiment moved it:
  the audit's isolated-faculty diagnostic located the weak nodes (selfAware/holographic/reservoir), the
  **selfAware un-rail** shipped (+2.7% mean coupling in all 6 seed×horizon cells; isolated faculties
  5→3; the faculty was saturated at the 1.0 clamp rail where a constant series couples to nothing), and
  two routings measured NULL and were reverted (reservoir input-gain — the echo-state tanh normalises a
  scalar gain away; holographic imprint-scale — cleanup-cosine confidence is scale-robust). Lesson
  encoded in the test + AUDIT-LOG: **target the measured isolated nodes, and prefer un-pinning saturated
  instruments over adding input gains that nonlinearities wash out.** Remaining levers: holographic +
  reservoir need _structural_ couplers (shared inputs, not scalar gains), and seed-42 selfAware is still
  borderline.

- **Peer maturity / external validation (5.0).** Every internal receipt is strong, and the mechanical
  replication path now ships ([`scripts/reproduce.ts`](../../scripts/reproduce.ts): one command → determinism fingerprint +
  gate-band coupling on any machine). What remains is the part no code can do: an actual **citable
  third-party replication or peer-reviewed treatment** of the coupling/open-endedness experiments.

## Gaps & holes (status-tracked)

Drawn from the doc-organization + PM audit. None are release-blockers; all are hygiene/clarity.

1. **PM artifacts — consolidated (2026-07-06):** [`ROADMAP`](../../ROADMAP-2026-06-26.md),
   [`RISK-REGISTER`](../RISK-REGISTER-2026-07-02.md), [`VERIFICATION`](../VERIFICATION-ANALYTICAL-DATA.md),
   [`BENCHMARKS`](../BENCHMARKS-2026-06-26.md), [`SECURITY-ARCHITECTURE`](../SECURITY-ARCHITECTURE-2026-07-02.md),
   and [`THIRD-PARTY-NOTICES`](../../THIRD-PARTY-NOTICES.md) are linked from BOOK §10.
2. **ADR-0011 — DONE (2026-07-02):** [`0011-post-018-hardening-conventions`](../adr/0011-post-018-hardening-conventions-2026-07-02.md)
   names the four recurring conventions (GPU ownership, numeric domain guards, SSOT surface
   registration, grid-first radius actions). Future decisions get their own ADRs.
3. **CI gaps (P1, still open):** e2e/WebGL smoke (Playwright), perf-regression time-series + threshold
   alerting. (The SBOM item is retracted — release.yml already publishes it with SLSA provenance.)
4. **Snapshot ambiguity — DONE (2026-07-02):** `CLAUDE.md` now enumerates the point-in-time exceptions
   (exactly the `verify-canonical-facts.ts` EXCLUDE list); everything else — including the dated-name
   root files — is living, with the filename date as a creation stamp.
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
