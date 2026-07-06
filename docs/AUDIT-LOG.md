<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Audit Log (centralized)

**One place for the project's audit history.** New audits, reviews, and fix-passes append a dated
entry HERE (newest first). The dated reports under [`docs/reports/`](./reports/) are **living,
continuously-rewritten current documents** — rewritten in place to current truth, never forked into
dated / historical / "superseded snapshot" copies (per the binding "Living docs, no archives" law in
[CLAUDE.md](../CLAUDE.md)). Live facts (version, test/coverage receipts) are propagated automatically by
`scripts/sync-surfaces.ts`. This log records what changed and why.

---

## 2026-07-06 (pass 12) — Master plan Stages 0–5: truth repair + doc compress + test merge (v0.20.0)

Owner brief: implement consolidation master plan — fewer files/lines, fix stale receipts, worker hygiene.

### Code

- **`src/core/worker-pool.ts`** — `getWorkerCount()` honors `maxWorkers` (capped at hardware concurrency).
- **`tests/worker-pool.test.ts`** — maxWorkers cap tests.
- **Deleted** extensionless orphan `src/core/graphics-ab` (canonical: `graphics-abstraction.ts`).
- **`tests/wilderness.test.ts`** — safe Points guard (oxlint).
- **`tests/docs-truth-law.test.ts`** — markdown glob integrity guard.

### Docs

- **`scripts/canonical-receipts.ts`** → **2,319 / 84.35% / 82.05%** (Linux gate floor); `bun run sync`.
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

## 2026-07-06 (pass 10) — Large-doc compress + singularities test merge (v0.20.0)

Owner brief: continue consolidation — **fewer lines**, no new files.

### Docs rewritten in place

- **`docs/PRE-2016-AI-2026-06-26.md`** — 865 → ~70 lines: technique index + master table; B/C/D → AI-SUBSYSTEM / COPILOT-PROVIDERS / KANBAN pointers.
- **`docs/MODULE-CONTRACTS-2026-06-26.md`** — deduped Tsotchke preamble + removed redundant FULL TSOTCHKE amendment block.
- **`docs/BOOK-2026-06-26.md`** — fixed AUDIT-LOG + PRE-2016 descriptions.

### Tests

- `singularities-fidelity.test.ts` → **`tests/singularities.test.ts`**.

---

## 2026-07-06 (pass 9) — Receipt fixes + doc folds + test merges (v0.20.0)

Owner brief: continue consolidation — **fewer files**, **fewer lines**, fix stale receipts.

### Docs rewritten / deleted

- Stale **v0.18.0** / **~92%** in NHSI honesty + manifesto → **v0.20.0** / **83.95% / 81.57%**.
- ADRs 0007–0009: **1771 tests** → published floor **1,984**.
- `docs/BRAIN-PARAMETER-SCALE-PLAN.md` → folded into `APEX-1B-SUBSTRATE-ARCHITECTURE` §Brain parameter scale.
- `docs/TSOTCHKE-LICENSE-UNBLOCK-PLAN-2026-06-26.md` → folded into `TSOTCHKE-INTEGRATION-MAP` §License unblock steps.
- **`docs/AUDIT-LOG.md`** — July 2026 verbose entries compressed to index (this file, pass 9).

### Tests merged

- `entity-vitals{2,3}.test.ts` → `tests/entity-vitals.test.ts`
- `portal-death-fauna.test.ts` → `tests/portal-death.test.ts`
- `classical-contrast-perceptron.test.ts` → `tests/classical-contrast.test.ts`
- `creature-exterior-phenomena.test.ts` → `tests/creature-exterior-layers.test.ts`
- `quantum-quake-qge-geometry.test.ts` → `tests/quantum-quake-physics.test.ts`

---

## 2026-07-06 (pass 8) — Large-doc trim + test merge (v0.20.0)

Owner brief: continue consolidation — **fewer lines**, no new files.

### Docs rewritten in place

- **`docs/UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md`** — 1,071 → ~90 lines: living index + twelve-issue status table;
  open work now lives in that index; verbose pass narrative removed.
- **`docs/MEGA-MASTER-DEEP-DIVE-RESEARCH-REPORT-2026-06-27.md`** — 3,252 → ~940 lines: retained §10 (25
  benchmark specs) + §11 (bug registry) only; architecture/consciousness/pass-2–9 narrative removed
  (canonical docs linked in header).
- **`docs/AUDIT-LOG.md`** — June 2026 entries compressed to index table (this file, pass 8).
- **`docs/reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md`** — stale 92.13% coverage → 83.95% / 81.57%.

### Tests

- `glyph-exterior-{signature,palette,geometry}.test.ts` → **`tests/glyph-exterior.test.ts`** (one file).

---

## 2026-07-06 (pass 7) — Doc/test consolidation: fewer files, fewer lines (v0.20.0)

Owner brief: deep audit of markdown + tests + workers — merge redundant docs, delete stale duplicates,
fix receipt drift, net **fewer** files and lines.

### Deleted markdown (merged or superseded)

- `HANDOFF-2026-06-26.md`, `research_receipts-2026-06-26.md` → history in AUDIT-LOG + VERIFICATION
- `docs/GOAL5-SWARM-HANDOFF-2026-06-19.md`, `docs/GOAL5-RESEARCH-RECEIPTS-2026-06-26.md` → TSOTCHKE-INTEGRATION-MAP
- `docs/PLAN-2026-06-30-UI-SIM-POLISH.md`, `docs/EXECUTION-PLAN-2026-06-30-POLISH-25-ITEMS-VP-COO.md` → UI-UX-DEEP-DIVE-AUDIT
- `docs/reports/2026-06-26-CURRENT-TRUTH-BASELINE.md` → VERIFICATION-ANALYTICAL-DATA §1
- `docs/PERFORMANCE-TARGETS-2026-07-02.md`, `docs/SCALING-ROADMAP-2026-06-26.md` → PERFORMANCE-OPTIMIZATION-ROADMAP
- Consciousness cluster (6 files) → `docs/CONSCIOUSNESS-LAB-MASTER-2026-07-03.md`
- `tests/README.md` → `docs/TEST-STRATEGY-2026-07-02.md` §7

### Deleted orphans (not run by Bun)

- `tests/worker-pool`, `tests/graphics-abstraction.test`, `tests/transform-feedback` (extensionless dupes)
- `src/core/worker` (orphan duplicate of worker-pool)
- `tests/wilderness-chunks.test.ts` → merged into `tests/wilderness.test.ts`

### Reference + receipt fixes

- `scripts/sync-surfaces.ts` — removed HANDOFF, research_receipts, CURRENT-TRUTH-BASELINE from SURFACES
- Stale **92.13%** coverage in PRD + scrutiny scorecard → canonical **83.95% / 81.57%**
- Cross-links repointed across BOOK, README, reports, ADR 0010, NHSI dashboard, lab JSON, consciousness kernel

---

## 2026-07-05 (pass 6) — Zero-degradation mandate: full neural/visual fidelity + all-core workers (v0.20.0)

Owner brief: nothing may degrade graphics, color, rendering detail, or neural intelligence; utilize all
CPU cores (wilderness workers) without lowering fidelity.

### Code

- **`getQuantizationConfig`** — FP32 genome storage on **every** tier (removed FP16 brain weights).
- **`entity-brain.ts`** — removed distance-based brain LOD + `forwardSimplified` path entirely.
- **`world.ts`** — entity brains, archon `driveSuper`, and NHI `tick` run **every frame**; RD every
  frame; graph-mind cadence no longer scales down at high population.
- **`entities.ts`** — ultra theory/flock cadence throttle removed (full behavior re-eval every frame).
- **`quality.ts`** — connectome `maxLinks` 8× → **12×** `maxEntities` per tier.
- **`worker-pool.ts`** — all tiers use full `hardwareConcurrency` workers for wilderness.
- **`wilderness-*`** — 64 chunks × 128 entities, 16k point render cap, opacity 0.88.
- **`viz3d.ts`** — full phylum tower ring on all tiers (no low-detail halving).
- **`SPAWN_BUDGET_ULTRA`** — 64 → 512 (faster apocalypse ramp without single-frame cliff).

### Gate

- `bun run check`.

---

## 2026-07-05 (pass 5) — MEGA-MASTER receipt sync + BOOK module truth + full-quality brains (v0.20.0)

Owner brief: finish deferred doc debt from pass 4; never lower visual/cognitive fidelity.

### Code

- **`src/world.ts`** — stop passing camera position into `thinkAll`; every entity gets the full
  70-param brain every neural tick (distance LOD in `entity-brain.ts` no longer active in live world).
- **`PerceptualPriorityCascade`** remains disabled (all near-tier); wilderness + workers unchanged.

### Docs / sync

- **`scripts/sync-surfaces.ts`** — MEGA-MASTER + BOOK added to `SURFACES`; extra receipt patterns
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

- **`scripts/sync-surfaces.ts`** — added STATE-OF-THE-ART, VERIFICATION ledger, TEST-STRATEGY, PRD to `SURFACES`; expanded receipt patterns (backtick counts, tilde coverage, canonical table rows, `1,477-test`).
- **`docs/VERIFICATION-ANALYTICAL-DATA.md`** — canonical coverage table aligned to `83.95% / 81.57%`.
- **`src/core/worker-pool.ts`** — `executeAsync` returns immediately when pool not initialized (prevents wilderness hang).
- **`src/world.ts`** — lazy `initWorkerPoolAsync()` + proper `dispose()` on worker pool.
- **`tests/README.md`** — test index pointing at TEST-STRATEGY + layout table.
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
logs remain in `docs/DAILY_RUNS/*`.

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
