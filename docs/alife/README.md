# Artificial-life evidence catalog

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

The nine-axis scoring matrix is a single-rater literature rubric. Deterministic arithmetic does
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
consistency. Existing `gen:alife` continues to regenerate the separate numerical matrix reports.

The local server serves these files through its existing traversal-checked `/docs/` route. Production
builds copy this directory into `dist/docs/alife/`; GitHub Pages copies it into `site/docs/alife/`.
No report download launches the simulation or changes its state.
