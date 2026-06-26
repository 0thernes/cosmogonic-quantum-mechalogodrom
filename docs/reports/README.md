# Reports

Living technical reports and audits for Cosmogonic Quantum Mechalogodrom. **Each file here is a single,
current, continuously-rewritten document — not a dated snapshot and not an archive.** When the facts
change, the report is **rewritten in place** to the current truth. No historical duplicates, no
"superseded" copies, no per-version forks. One source per topic.

Every load-bearing number is the live measured value: **v0.18.0 · 1477 tests · ~95% line / ~92% function ·
Butlin 8/14 met + 6/14 partial · not sentient**. The canonical numbers come from
`scripts/canonical-receipts.ts` + `package.json`, propagated by `scripts/sync-surfaces.ts` and
gate-enforced (`bun run sync:check`). The one-glance reference is
[2026-06-26-CURRENT-TRUTH-BASELINE.md](./2026-06-26-CURRENT-TRUTH-BASELINE.md).

## Reports

- [2026-06-26-CURRENT-TRUTH-BASELINE.md](./2026-06-26-CURRENT-TRUTH-BASELINE.md) — canonical current facts,
  one-glance reference (gate receipts, claim baseline, SuperMind benchmark).
- [2026-06-26-ALIFE-COMPARATIVE-AUDIT.md](./2026-06-26-ALIFE-COMPARATIVE-AUDIT.md) — A-Life comparative
  audit vs 25 known systems: measured statistics (breadth z = +3.01σ), 5 SVG charts, and an adversarial
  novelty defense. Regenerable via [`scripts/alife-comparison-stats.ts`](../../scripts/alife-comparison-stats.ts)
  from the source CSV [2026-06-26-alife-comparison-matrix.csv](./2026-06-26-alife-comparison-matrix.csv);
  charts + stats JSON in [assets/](./assets/).
- [2026-06-17-STATE-OF-THE-ART-COMBINED.md](./2026-06-17-STATE-OF-THE-ART-COMBINED.md) — unified
  state-of-the-art assessment (whole repository + apex Super Creature).
- [2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md](./2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md) — 360° survey of
  the whole repository versus the field.
- [2026-06-17-STATE-OF-THE-ART-SUPER-CREATURE.md](./2026-06-17-STATE-OF-THE-ART-SUPER-CREATURE.md) — deep
  dive on the apex quantum-cognitive mind.
- [2026-06-20-RESEARCH-BEDROCK.md](./2026-06-20-RESEARCH-BEDROCK.md) — the 2026 literature the project
  stands on (Established / Emerging / Fringe).
- [2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md](./2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md)
  — rigorous frontier assessment + receipted roadmap.
- [2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml](./2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml) —
  machine-readable falsifiable research program (phases P0–P8).
- [2026-06-21-NHSI-HONESTY-AUDIT.md](./2026-06-21-NHSI-HONESTY-AUDIT.md) — verified wired-vs-claimed
  scorecard.
- [2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md](./2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md) — 0thernes
  Corp NHSI vision.

## Rule

**Rewrite, don't accumulate.** Update a report in place to the current truth; never fork a new dated or
"historical" copy. No archives. Filenames carry a creation date for ordering only — the content is always
the current, measured truth.
