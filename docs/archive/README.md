<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# docs/archive — superseded historical reports

These are **point-in-time snapshots** from earlier development runs (autonomous-loop
iteration logs, same-day "master/omniscient/comprehensive" audits, and dated audit
folders). They are kept for provenance but are **not maintained** and may contain
numbers/claims that were true at publication and have since been corrected.

**For current, canonical state use the living docs instead:**

- [NHSI Progress Dashboard](../NHSI-PROGRESS-DASHBOARD.md) — the single living scorecard
  (measured receipts + honest NHSI counts).
- [Tsotchke Integration Map](../TSOTCHKE-INTEGRATION-MAP.md) — the canonical corpus-wiring ledger.
- [Architecture](../ARCHITECTURE.md) · [Technical Specification](../TECHNICAL-SPECIFICATION.md)
  · [Module Contracts](../MODULE-CONTRACTS.md).

Going forward there is **one** audit surface (the dashboard), kept in sync from a single
source of truth (`scripts/canonical-receipts.ts` → `bun run sync:canon`) — not a new
report per run. If you need to add a finding, update the dashboard; do not spawn another
`*-AUDIT-*.md`.
