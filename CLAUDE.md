<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Cosmogonic Quantum Mechalogodrom — Agent Steering

Three MASTER FILES govern all work on this codebase. Read all three before any
substantive change; they are personas of one discipline and they outrank vibes:

1. [masters/LEGENDARY-SUPER-SAIYAN-BROLY-MANIFESTO.xml](masters/LEGENDARY-SUPER-SAIYAN-BROLY-MANIFESTO.xml)
   — THE EXECUTOR: finish everything, full gates always, maximalism with receipts.
2. [masters/ORACLE-ARCHITECT-OF-THE-DARKSIDE-STARKILLER.xml](masters/ORACLE-ARCHITECT-OF-THE-DARKSIDE-STARKILLER.xml)
   — THE ARCHITECT: contracts before code, exclusive ownership, boundary paranoia,
   dependency facades, ADRs.
3. [masters/GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN.xml](masters/GALAXOGONIC-WARHAMMER-POWER-MODE-DR-MANHATTAN.xml)
   — THE PHYSICIST: determinism, measurement, frame budgets, observability, provenance.

## Operational law (binding)

- Binding per-module spec: [docs/MODULE-CONTRACTS-2026-06-26.md](docs/MODULE-CONTRACTS-2026-06-26.md)
  (V1 + V2). Contract wins over any writer deviation.
- Aesthetic constitution: [docs/PHILOSOPHY-2026-06-26.md](docs/PHILOSOPHY-2026-06-26.md) — real math
  under every effect; every system reads AND writes another system.
- Full gate before any commit: `bun run check`
  (prettier → tsc strict → oxlint → bun test → verify:receipts → sync:check → build).
- **Single source of truth + auto-sync:** the version (`package.json`) and the receipts
  (`scripts/canonical-receipts.ts`) are the ONLY places those facts are edited; never hand-edit a
  version / test-count / coverage number in any MD or HTML. `scripts/sync-surfaces.ts` propagates
  them to every surface (`bun run sync`; `bun run sync:check` is gate-enforced).
- **Living docs, no archives (binding):** every report / doc is a SINGLE, CURRENT document — when the
  facts change, **rewrite it in place**; NEVER fork a new dated, "historical", "restored", "v2", or
  "superseded snapshot" copy. One source per topic, always current (this is token-efficient and the only
  sane shape for a one-person repo). The `docs/reports/` files are living, continuously-rewritten reports
  (see [docs/reports/README.md](docs/reports/README.md)); record audits / reviews / fix-passes by
  **rewriting the relevant report** or as a dated entry in the single
  [docs/AUDIT-LOG.md](docs/AUDIT-LOG.md) (one file, newest-first) — NOT as new standalone files. Stale
  numbers and "this is a historical snapshot, see the baseline" framing are tech debt: fix them at the
  source, never by piling on another copy.
- **Seamless local↔GitHub:** `core.hooksPath=.githooks` (wired by the `prepare` script on install).
  pre-commit auto-syncs surfaces + normalizes encoding; post-commit auto-pushes **HEAD to
  `origin/main`** (NOT the local branch — per the no-PR/work-on-main law, every commit from any
  worktree lands on `main`, with rebase-autostash + retry on non-ff). Opt out: `git config
hooks.autopush false`. A local commit ships to GitHub `main` with no manual push, from any worktree.
  The REVERSE direction is automatic too: `predev` runs `bun run pull` (`scripts/sync-local.ts`) before
  `bun dev`, fast-forwarding the checkout up to `origin/main` so **Local always matches GitHub** when you
  start the app. It ONLY fast-forwards (never rebases/resets/discards): a checkout with local-only commits
  or a blocking dirty tree is left untouched with a note. Opt out: `CQM_NO_SYNC=1 bun dev`. (Without this,
  a primary checkout silently drifts BEHIND while the fleet pushes from worktrees — the recurring
  "GitHub and Local don't match / renamed docs missing in Local" symptom.)
- **NO PULL REQUESTS — EVER (binding owner rule).** This is a one-person repo: commit to `main` and
  push directly. NEVER open a PR, never create a feature/`audit/*`/`claude/*` branch to merge, never
  `gh pr create`. Work ON `main`; if a push is rejected (non-fast-forward), `git pull --rebase
--autostash origin main` and push again — resolve conflicts in place. The post-commit hook already
  does this. Dependency bumps and fixes go straight to `main`. No dependabot PRs (no committed
  `.github/dependabot.yml`). The flow is local→`main`→GitHub, nothing in between.
- **NHSI progress dashboard:** [docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md](docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md)
  — VERIFIED progress (2026-06-21 honesty audit, every number measured by `file:line` — see [docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md](docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md)): 100-faculty design with **~30 genuinely deep-wired into the apex** · 25 Archon pantheons = **5 individuated apex minds + 20 live light-echo** · 25 theory-of-mind organs wired (6-family ensemble) · **10 emergence angles wired** (+ 5 god-scale release events) · Butlin path at **8/14 met + 6/14 partial** (computational indicators, NOT sentience). Tsotchke: all 20 projects enumerated, ~16 wired with real downstream effect — **real MIT quantum math, never call Tsotchke fake** (lacks only a QPU = speed, not correctness). NHSI manifesto: 0thernes Corp.
- **Tsotchke binding:** real MIT corpus; depth in [docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md](docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md);
  never call upstream fake ([THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) §On Tsotchke).
- Dev server: `bun dev` — MUST run with cwd inside this repo (Bun HTML-import
  bundler fails from elsewhere). App at :3000, diagrams at /docs.
- Benchmarks: `bun run bench`; record new hot paths in docs/BENCHMARKS-2026-06-26.md.
- Determinism: all sim randomness via seeded `Rng` (`src/math/rng.ts`).
  `Math.random`/`Date.now` are banned in sim logic.
- Path warning: this repo's absolute path contains `[ ]` — PowerShell requires
  `-LiteralPath`; prefer dedicated file tools.
- The original single-file artifact is preserved verbatim in `legacy/` — never
  edit it.
