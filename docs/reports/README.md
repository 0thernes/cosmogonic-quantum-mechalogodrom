<!-- reviewed: 2026-07-01 | mega-audit receipt-drift fix | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Reports

Living technical reports and audits for Cosmogonic Quantum Mechalogodrom. **Each file here is a single,
current, continuously-rewritten document — not a dated snapshot and not an archive.** When the facts
change, the report is **rewritten in place** to the current truth. No historical duplicates, no
"superseded" copies, no per-version forks. One source per topic.

Every load-bearing number is the live measured value: **v0.20.0 · 1,984 tests · 83.95 % line / 81.57 % function ·
Butlin 8/14 met + 6/14 partial · not sentient**. The canonical numbers come from
`scripts/canonical-receipts.ts` + `package.json`, propagated by `scripts/sync-surfaces.ts` and
gate-enforced (`bun run sync:check`). The one-glance reference is
[2026-06-26-CURRENT-TRUTH-BASELINE.md](./2026-06-26-CURRENT-TRUTH-BASELINE.md).

## Reports

- [2026-06-26-CURRENT-TRUTH-BASELINE.md](./2026-06-26-CURRENT-TRUTH-BASELINE.md) — canonical current facts,
  one-glance reference (gate receipts, claim baseline, SuperMind benchmark).
- [2026-07-01-25-POINT-SCRUTINY-SCORECARD.md](./2026-07-01-25-POINT-SCRUTINY-SCORECARD.md) — 25-point
  adversarial critical scrutiny across engineering, architecture, Tsotchke depth, consciousness claims,
  and A-Life standing (overall 8.1/10; weak axes = coupling + peer validation). SVG chart in
  [assets/scrutiny-25-scorecard.svg](./assets/scrutiny-25-scorecard.svg).
- [2026-06-26-ALIFE-COMPARATIVE-AUDIT.md](./2026-06-26-ALIFE-COMPARATIVE-AUDIT.md) — A-Life comparative
  audit vs **112 known systems** (v4, 113-system expansion, code-grounded): measured statistics (breadth
  z = +4.02σ self / +2.83σ source-audited), **11 SVG charts**, PCA + clustering + Pareto + Mahalanobis geometry, a 9-agent
  code-grounding of the one self-scored row (`file:line`), and an adversarial novelty defense. Regenerable
  from the source CSV [2026-06-26-alife-comparison-matrix.csv](./2026-06-26-alife-comparison-matrix.csv) via
  three deterministic engines — [`scripts/alife-comparison-stats.ts`](../../scripts/alife-comparison-stats.ts),
  [`scripts/alife-comparison-geometry.ts`](../../scripts/alife-comparison-geometry.ts), and
  [`scripts/alife-codeground-sensitivity.ts`](../../scripts/alife-codeground-sensitivity.ts); charts + JSON in
  [assets/](./assets/).
- [2026-06-17-STATE-OF-THE-ART-COMBINED.md](./2026-06-17-STATE-OF-THE-ART-COMBINED.md) — the single,
  unified state-of-the-art assessment: the whole repository (Part I), the apex Super Creature (Part II),
  and the consciousness scorecard + verdict (Part III).
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
