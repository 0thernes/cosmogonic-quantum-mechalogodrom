# CQM-25 capability framework and artificial-life evidence catalog

## Canonical capability framework

**[CQM-25](./cqm-capability-profile.html)** version **1.0.0**, adopted **2026-10-22**, is the
canonical project capability framework. Its [JSON](./cqm-capability-profile.json) owns the 25
stable axis IDs, definitions, source references, measures, controls, falsifiers and pinned
repository evidence. The [readable specification](./cqm-capability-profile.md) and
[25-axis evidence map](../reports/assets/alife-capability-profile-25.svg) are generated views.
Feature plans and capability assessments must identify affected IDs, subject/scope and
evidence requirements, retaining negative results. Taxonomy changes require framework version
and contract review under [MODULE-CONTRACTS](../MODULE-CONTRACTS-2026-06-26.md).

Evidence states are implemented, bounded-test, mixed or unassessed; they are not numerical
capability ratings. Canonical `assessment.score` fields remain null until calibrated. A single organism is eligible; ecology
is one domain, and physical models follow their declared dynamics. The separate 14 Butlin
indicators retain their own assessment boundary. This project standard does not certify
consciousness, sentience, AGI or superintelligence and is not a universal scientific standard.

[Provisional author estimates](./cqm-capability-profile.html#provisional-estimates)
are a separate, explicitly labeled layer with their own [rubric and source data](./cqm-capability-estimates.json).
They retain source provenance and limitations, confer no measured capability, and do not populate
canonical `assessment.score` fields. No overall or domain mean, ranking or aggregate verdict is published.

The historical nine-axis 155-system matrix remains secondary comparison material. Its peer
scores, ranks and denominator cannot be transferred to CQM-25 or to the separate catalog below.

## Source-review catalog

Start with the [searchable 150-entry catalog](./cqm-alife-catalog.html),
[40-page PDF](./cqm-alife-audit.pdf), or [audit workbook](./cqm-alife-catalog.xlsx).
The [CSV](./cqm-alife-catalog.csv), [evidence JSON](./cqm-audit-evidence.json),
[editable report](./cqm-audit-notes.md), and [complete download bundle](./cqm-alife-audit-bundle.zip)
preserve sources, corrections, exclusions, source hashes and follow-up work.

## Scope and evidence

This edition contains **150 external entries**, with a separate Mechalogodrom profile:
132 entries have primary-source content review and 18 retain explicit partial-review labels.
These are systems, methods, toolkits, games, biological models and adjacent AI research;
the count is not 150 independent autonomous ecosystems or replicated experiments.
Identity and conservative mechanism descriptions were checked. Full-paper replication,
runtime validation of every external system and an independent scoring study were not performed.

The supplied PDF repeated ten names fourteen times (140 rows, 130 redundant rows).
The supplied CSV had 129 rows including Mechalogodrom. We merged UNIMAL into DERL,
moved generic quality-diversity to a glossary, excluded unresolved 3DVCE, and added 25 entries:
128 external rows - 3 dispositions + 25 additions = 150. Related projects retain family labels.
PDF-only Evosphere remains unresolved and outside the count.

## Snapshot and repository integration

The report records the **21 October 2026 source-review snapshot**, inspected against working files
with reference HEAD `3ab92db558d73b4e84c6576d1d92e76946f2f7f6`. Its original Git-status limitation,
file hashes, 129-row input, old prose findings and pending tracker are retained as historical evidence.
Its references to the repository describe that captured state, not an assertion about today's tree.

Before publication, GitHub had advanced to `f53a3fbef72282891eb7769912c0c5228d5b206e`, which separately
expanded the [scoring matrix](../reports/2026-06-26-alife-comparison-matrix.csv) to **155 named entries**
(154 peers plus Mechalogodrom), added a [generated rubric index](../reports/assets/alife-landscape-index.html),
and corrected the stale breadth/open-endedness/statistical prose. That commit is preserved.
The 155-entry matrix includes related versions and method rows, including DERL and UNIMAL separately;
its denominator and selection criteria differ from this 150-entry external catalog. Do not combine
their counts, transfer old z-scores to the new population, or interpret either as a field-wide ranking.
DarwinBots and EcoLab are included here using identifiable project sources; uncertainty about exact
inception dates is not treated as evidence that a project does not exist.

The historical nine-axis scoring matrix is a single-rater literature rubric, not the current capability framework. Deterministic arithmetic does
not validate the ratings, equal axis weights, project independence or scientific superiority.
The evidence catalog publishes no new aggregate winner. A controlled cross-system benchmark,
independent scoring and long-horizon causal experiments remain open work.

The [central audit log](../AUDIT-LOG.md) records this integration and subsequent validation.
Current test receipts remain in [VERIFICATION-ANALYTICAL-DATA.md](../VERIFICATION-ANALYTICAL-DATA.md)
and `scripts/canonical-receipts.ts`; the PDF is not the live test-count authority.

## Artifact maintenance

The seven download artifacts form one reviewed snapshot and are preserved byte-for-byte, including
the ZIP members. Update them together when a new source-review edition is produced. The evidence JSON
owns catalog IDs, names, categories, status labels and provenance for this snapshot; CSV/HTML/workbook
are reader formats. `tests/alife-evidence-catalog.test.ts` guards identity/count/status and format
consistency. `scripts/gen-capability-profile.ts` separately generates the canonical CQM-25
HTML, Markdown and SVG from its JSON. Existing `gen:alife` continues to regenerate the historical
nine-axis numerical matrix reports without changing their retained scores.

The local server serves these files through its existing traversal-checked `/docs/` route. Production
builds copy this directory into `dist/docs/alife/`; GitHub Pages copies it into `site/docs/alife/`.
No report download launches the simulation or changes its state.
