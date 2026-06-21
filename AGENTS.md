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

- Binding per-module spec: [docs/MODULE-CONTRACTS.md](docs/MODULE-CONTRACTS.md)
  (V1 + V2). Contract wins over any writer deviation.
- Aesthetic constitution: [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) — real math
  under every effect; every system reads AND writes another system.
- Full gate before any commit: `bun run check`
  (prettier → tsc strict → oxlint → bun test → verify:receipts → build).
- **NHSI progress dashboard:** [docs/NHSI-PROGRESS-DASHBOARD.md](docs/NHSI-PROGRESS-DASHBOARD.md)
  — VERIFIED progress (2026-06-21 honesty audit): 100-faculty design ~30 deep-wired · 25 Archons = 5 individuated + 20 light-echo · 25 ToM wired · 10 emergence angles (+5 god-scale events) · Butlin 8/14 met + 6/14 partial (indicators, not sentience). See [docs/NHSI-PROGRESS-DASHBOARD.md](docs/NHSI-PROGRESS-DASHBOARD.md) + [docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md](docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md).
- **Tsotchke binding:** real MIT corpus; depth in [docs/TSOTCHKE-INTEGRATION-MAP.md](docs/TSOTCHKE-INTEGRATION-MAP.md);
  never call upstream fake ([THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) §On Tsotchke).
- Dev server: `bun dev` — MUST run with cwd inside this repo (Bun HTML-import
  bundler fails from elsewhere). App at :3000, diagrams at /docs.
- Benchmarks: `bun run bench`; record new hot paths in docs/BENCHMARKS.md.
- Determinism: all sim randomness via seeded `Rng` (`src/math/rng.ts`).
  `Math.random`/`Date.now` are banned in sim logic.
- Path warning: this repo's absolute path contains `[ ]` — PowerShell requires
  `-LiteralPath`; prefer dedicated file tools.
- The original single-file artifact is preserved verbatim in `legacy/` — never
  edit it.
