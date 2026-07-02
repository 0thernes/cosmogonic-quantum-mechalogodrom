<!-- reviewed: 2026-07-02 | mega-audit round 3 | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0011 — Post-0.18.0 hardening conventions (GPU ownership · numeric domain guards · SSOT surface registration · grid-first radius actions)

- Status: Accepted
- Date: 2026-07-02
- Governs: the four recurring defect classes the 2026-06-29 → 2026-07-02 audit cycle kept re-finding.
  Retro-documents decisions that were living only in `docs/AUDIT-LOG.md` (the "ADRs frozen at 0010" gap).

## Context

Four defect classes recurred across independent audits — each was fixed ad-hoc more than once before the
pattern was named. An unnamed convention gets re-violated; these are now binding.

## Decisions

### 1 · GPU resource ownership (the dispose contract)

Any system that constructs `THREE.*` resources **outside** the shared `ctx.geos` cache **owns** them:
it MUST implement `dispose()` freeing every per-instance geometry/material/light, MUST be registered in
`World.dispose()`, and MUST have a spy-based test (`spyOn(THREE.Material.prototype,'dispose')`,
count→0, idempotent double-dispose). Module-shared constants (`TITAN_CORE_GEO` pattern) are explicitly
NOT disposed by instances — disposing them breaks the next HMR boot. (Origin: the VRAM-leak sweeps of
2026-06-25 → 07-01: NhiBody, RD, shoggoths, puppeteers, titans, leviathans.)

### 2 · Numeric domain guards (clamp, don't throw; guard, don't remove)

Every math primitive with a restricted domain (`log`, `sqrt`, reciprocal, variable-exponent `pow`)
guards its domain **inside the primitive** — clamping to an epsilon/zero and contributing `0` for a
singular gradient — rather than trusting callers. NaN/±Infinity from one unguarded kernel poisons an
entire tape/frame invisibly, which is worse than a slightly-wrong saturated value. Convention shapes:
`eshkol-ad.ts` (log→ε, sqrt→0, singular gradient→0), `hyperdual.ts` (`HD_EPS`, sign-preserving for
reciprocal), `dual.ts`. Per the Eshkol binding, unwired primitives are **guarded, never removed**.
(Origin: three separate audit rounds each found one more unguarded sibling — dual → hyperdual →
eshkol-ad/hdRecip.)

### 3 · SSOT surface registration (a "live" number must live inside a guard)

Any document that publishes a _current_ receipt (version / test count / coverage) MUST either be listed
in `sync-surfaces.ts` `SURFACES` or carry no receipt at all. `verify:facts` excludes `docs/reports/20*`
by policy, so an unregistered "living" report silently freezes — the 2026-07-01 blind spot where reports
advertised "live measured values" two canon-generations stale while every gate passed. Table-cell
phrasings the sync regex cannot anchor (receipt number in one cell, the word "tests" in the label cell)
are forbidden for current receipts. (Origin: AUDIT-LOG 2026-07-01.)

### 4 · Grid-first radius actions (no O(n) scans in per-frame paths)

Any per-frame effect over "entities within radius R" MUST use the frame's `SpatialHash`
(`this.grid.query(x, z, R)` + a 3D filter) instead of scanning `entities.list` — the sim's contract is
`O(n·k)`, and one O(n) action per actor silently reintroduces O(n·m). Exact-nearest queries may fall
back to a full scan **only** when the grid query returns no in-radius hit. Determinism requirement: the
converted effect must be order-independent per entity, or must sort grid hits into a stable order before
any order-dependent write. (Origin: `nhiApply` conversion 2026-07-02; `singularity` O(k) 2026-06-27.)

## Consequences

- New systems inherit four named contracts instead of re-deriving them from AUDIT-LOG archaeology.
- Audits can flag violations as ADR-0011 breaches (a contract citation, not a judgment call).
- The decision log is live again past 0010; subsequent architectural decisions get their own ADRs
  rather than accreting here — this ADR is scoped to exactly these four conventions.
