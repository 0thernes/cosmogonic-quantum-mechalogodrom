# Audit Log (centralized)

**One place for the project's audit history.** New audits, reviews, and fix-passes append a dated
entry HERE (newest first) instead of spawning a new standalone report file each time. The dated
reports under [`docs/reports/`](./reports/) and the `docs/*AUDIT*` / `docs/*REPORT*` files are a
**frozen historical archive** (point-in-time worldline snapshots) — indexed at the bottom of this
file, not added to. Live facts (version, test/coverage receipts) are propagated automatically by
`scripts/sync-surfaces.ts`; this log records what changed and why.

---

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

## Historical archive index

Point-in-time reports, grouped. These are frozen — read for history, do not extend.

**NHSI / honesty / progress**

- [`reports/2026-06-21-NHSI-HONESTY-AUDIT.md`](./reports/2026-06-21-NHSI-HONESTY-AUDIT.md) — the
  canonical honesty scorecard (referenced by README/CLAUDE/AGENTS + the truth-law gate).
- [`reports/2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md`](./reports/2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md),
  [`reports/2026-06-21-NHSI-FOUNDING-MANIFESTO-0THERNES-CORP.md`](./reports/2026-06-21-NHSI-FOUNDING-MANIFESTO-0THERNES-CORP.md)
- [`NHSI-PROGRESS-DASHBOARD.md`](./NHSI-PROGRESS-DASHBOARD.md) (living), [`reports/2026-06-20-RESEARCH-BEDROCK.md`](./reports/2026-06-20-RESEARCH-BEDROCK.md),
  [`reports/2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md`](./reports/2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md)

**State-of-the-art / deep dives**

- [`reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md`](./reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md)
  (+ `-SUPER-CREATURE`, `-WHOLE-REPO`; and the 2026-06-16 set)
- [`reports/2026-06-20-INDEPENDENT-DEEP-DIVE-AUDIT.md`](./reports/2026-06-20-INDEPENDENT-DEEP-DIVE-AUDIT.md),
  [`reports/2026-06-20-MASTER-ARCHITECT-DEEP-DIVE-AUDIT.md`](./reports/2026-06-20-MASTER-ARCHITECT-DEEP-DIVE-AUDIT.md),
  [`audit-2026-06-20-deep-dive/`](./audit-2026-06-20-deep-dive/)
- [`reports/2026-06-20-BLEEDING-EDGE-NOVELTY-WORLD-CLASS-ASSESSMENT.md`](./reports/2026-06-20-BLEEDING-EDGE-NOVELTY-WORLD-CLASS-ASSESSMENT.md)

**Tsotchke corpus integration**

- [`TSOTCHKE-INTEGRATION-MAP.md`](./TSOTCHKE-INTEGRATION-MAP.md) (living),
  `TSOTCHKE-*-AUDIT-*.md` / `TSOTCHKE-RALPH-LOOP-*.md` (frozen iteration logs).

**Earlier worldlines:** [`audit-2026-06-13/`](./audit-2026-06-13/), [`audit-2026-06-15/`](./audit-2026-06-15/),
[`audit-2026-06-16/`](./audit-2026-06-16/), [`reports/2026-06-18-*`](./reports/).
