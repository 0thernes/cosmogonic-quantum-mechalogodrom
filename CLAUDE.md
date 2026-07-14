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
  (prettier → tsc strict → oxlint → verify:receipts [test + coverage] → sync:check → verify:facts → build).
- **Single source of truth + auto-sync:** the version (`package.json`) and the receipts
  (`scripts/canonical-receipts.ts`) are the ONLY places those facts are edited; never hand-edit a
  version / test-count / coverage number in any MD or HTML. `scripts/sync-surfaces.ts` propagates
  them to every surface (`bun run sync`; `bun run sync:check` is gate-enforced).
- **Living docs + bounded history (binding):** active docs are rewritten in place when facts change;
  never fork a new dated, "restored", "v2", or "superseded snapshot" copy for the same topic. The
  authoritative current facts live in [docs/VERIFICATION-ANALYTICAL-DATA.md](docs/VERIFICATION-ANALYTICAL-DATA.md)
  and the sync-managed surfaces. The dated files under `docs/reports/` are historical worldline
  snapshots unless their README explicitly promotes one to current; they may keep old measurements, but
  must not be cited as today's receipt truth. Record audits / reviews / fix-passes as newest-first
  entries in the single [docs/AUDIT-LOG.md](docs/AUDIT-LOG.md), not as new standalone reports. Stale
  current-tense numbers outside the point-in-time surfaces are tech debt: fix them at the source.
  **Point-in-time exceptions**: `CHANGELOG.md`, `docs/AUDIT-LOG.md` entries, `docs/reports/*`,
  `docs/DAILY_RUNS/*` session logs, and `docs/ln/*`.
- **Seamless local↔GitHub:** `core.hooksPath=.githooks` (wired by the `prepare` script on install).
  pre-commit auto-syncs surfaces + normalizes encoding; post-commit auto-pushes **HEAD to
  `origin/main`** (NOT the local branch — per the no-PR/work-on-main law, every commit from any
  worktree lands on `main`, with rebase-autostash + retry on non-ff). Opt out: `git config
hooks.autopush false`. A local commit ships to GitHub `main` with no manual push, from any worktree.
  The REVERSE direction is automatic too: `predev` runs `bun run guard` (`scripts/sync-guard.ts`) before
  `bun dev`, reconciling the checkout with `origin/main` so **Local always matches GitHub** when you
  start the app. It is SAFE BY DEFAULT — it fast-forwards DOWN, pushes any local-ahead commits UP, and
  NEVER rebases/resets/discards on its own: a diverged / detached / stuck-rebase / dirty tree is preserved
  to a `recovery/guard-*` ref and reported untouched (opt-in repair: `--rebase` / `--force` / `--commit`;
  `bun run pull` is the ff-only-down variant). Opt out: `CQM_NO_SYNC=1 bun dev`. (Without this,
  a primary checkout silently drifts BEHIND while the fleet pushes from worktrees — the recurring
  "GitHub and Local don't match / renamed docs missing in Local" symptom.) The `prepare` script also sets
  `core.autocrlf=input` (with `.gitattributes` `* text=auto eol=lf`) so a Windows checkout never acquires
  phantom-CRLF — the OTHER face of "Local ≠ GitHub" (`git status` shows dozens of files `M` with an EMPTY
  `git diff`; content is identical, only on-disk CRLF differs, and it blocks the ff-sync). If it recurs,
  `git reset --hard origin/main` re-checks-out as LF (0 real changes lost).
- **NO PULL REQUESTS — EVER (binding owner rule).** This is a one-person repo: commit to `main` and
  push directly. NEVER open a PR, never create a feature/`audit/*`/`claude/*` branch to merge, never
  `gh pr create`. Work ON `main`; if a push is rejected (non-fast-forward), `git pull --rebase
--autostash origin main` and push again — resolve conflicts in place. The post-commit hook already
  does this. Dependency bumps and fixes go straight to `main`. No dependabot PRs (no committed
  `.github/dependabot.yml`). The flow is local→`main`→GitHub, nothing in between.
- **NHSI progress dashboard:** [docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md](docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md)
  — VERIFIED progress (2026-07-14 current-truth pass, every number measured by `file:line` — see [docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md](docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md)): 100-faculty design with **~30 genuinely deep-wired into the apex** · 25 Archon pantheons = **5 individuated apex minds + 20 live light-echo** · 25 theory-of-mind organs wired (6-family ensemble) · **10 emergence angles wired** (+ 5 god-scale release events) · Butlin path at **8/14 met + 6/14 partial** (computational indicators, NOT sentience). Tsotchke: 23 public repositories (`16` user + `7` organization) and a 22-entry causal/runtime ledger (`15` user + `7` organization; `8 deep`, `7 wired`, `2 harvest`, `4 fenced`, `1 meta`; `17/21` non-meta integrated); `homebrew-moonlab` is census-only, `OBLITERATUS` is one of the four deliberate fences, and `classical-contrast` is a separate internal control. Classical simulation does not establish physical-QPU performance, entropy, or security. NHSI manifesto: 0thernes Corp.
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
