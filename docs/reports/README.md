# Reports & Audit Log — the one centralized index

This folder accumulated ~20 overlapping "comprehensive" reports and audits (five different
2026-06-20 audits of the same thing, two generations of the State-of-the-Art trio, …). That
is tech debt: the same findings, re-typed, drifting apart. This index is the single entry
point, and it sets the policy that stops the sprawl from coming back.

## Go-forward policy (read before adding a report)

- **Do not spawn a new dated "comprehensive" report for routine work.** The living truth has
  exactly three homes:
  1. **[../NHSI-PROGRESS-DASHBOARD.md](../NHSI-PROGRESS-DASHBOARD.md)** — the measured scorecard
     (faculties, archons, Butlin, receipts). Numbers there flow from
     **[`scripts/canonical.ts`](../../scripts/canonical.ts)** via `bun run sync`, so every
     surface (README, docs.html, specs.html, package.json) stays identical automatically.
  2. **[../../CHANGELOG.md](../../CHANGELOG.md)** — what shipped, per version.
  3. **The "Audit log" section below** — a one-line dated entry per audit, newest first.
- **A genuinely new deep audit** appends its findings here (or extends the dashboard), it does
  not create yet another `YYYY-MM-DD-NAME-OF-THE-SAME-THING.md`.
- Anything written once and now superseded moves to **[`archive/`](./archive/)** — preserved
  for the worldline, out of the way.

## Canonical / current

| Report                                                                                                                                                                                                               | What it is                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [2026-06-21-NHSI-HONESTY-AUDIT.md](./2026-06-21-NHSI-HONESTY-AUDIT.md)                                                                                                                                               | **The verified NHSI state** — every number measured by `file:line`. Source for `canonical.ts`.                          |
| [2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md](./2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md)                                                                                                                           | The 0thernes Corp founding vision / mission.                                                                            |
| [2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md](./2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md)                                                                                                     | The combined synthesis that merges the earlier assessment wave — read this instead of the individual 2026-06-20 audits. |
| [2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml](./2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml)                                                                                                                       | The phased roadmap.                                                                                                     |
| [2026-06-20-RESEARCH-BEDROCK.md](./2026-06-20-RESEARCH-BEDROCK.md)                                                                                                                                                   | Cited research foundation.                                                                                              |
| [2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md](./2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md) · [SUPER-CREATURE](./2026-06-17-STATE-OF-THE-ART-SUPER-CREATURE.md) · [COMBINED](./2026-06-17-STATE-OF-THE-ART-COMBINED.md) | Current State-of-the-Art snapshot (supersedes the 2026-06-16 trio).                                                     |

## Superseded (kept in place for history; do not extend)

- `2026-06-16-STATE-OF-THE-ART-{WHOLE-REPO,SUPER-CREATURE,COMBINED}.md` — superseded by the 2026-06-17 trio above.
- `2026-06-20-MASTER-ARCHITECT-DEEP-DIVE-AUDIT.md`, `2026-06-20-COSMOGONIC-AND-TSOTCHKE-AUDIT-ASSESSMENT.md`,
  `2026-06-20-BLEEDING-EDGE-NOVELTY-WORLD-CLASS-ASSESSMENT.md`, `2026-06-20-MASTER-INTEGRATION-BLUEPRINT.md`
  — folded into the 2026-06-20 SUPER-REPORT.

## Archived (moved to [`archive/`](./archive/))

Pure duplicates / one-offs with no inbound links: the duplicate `NHSI-FOUNDING-MANIFESTO`, the
`OMNISCIENT-…-MASTER-AUDIT`, the `INDEPENDENT-DEEP-DIVE-AUDIT`, the `PRESIDENTIAL-EXECUTIVE-10-SWEEP`,
and the `GOAL5-SUPER-CREATURES-PASS`.

## Audit log (newest first — append one line, don't add a file)

- **2026-06-26** — Consolidated this folder (20 → 15 + archive + this index) and set the
  no-new-reports policy. Closed the cross-surface drift root cause: `scripts/canonical.ts`
  single source + `bun run sync` propagation + `docs-sync-law` gate. Auto-push on every commit
  (`.githooks/post-commit`). Encoding corruption (FFFD / curly-dash / sub-lead-byte emoji
  tails) tooled + gated. See CHANGELOG for the commit list.
- **2026-06-21** — NHSI honesty audit: corrected dashboard overclaims to measured values
  (100-faculty design ~30 deep-wired · 5 individuated archons + 20 light-echo · Butlin 8/14 met, 6/14 partial). See `2026-06-21-NHSI-HONESTY-AUDIT.md`.
