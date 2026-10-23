/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
 *
 * PRIME observatory fidelity adds 7 snapshot, 8 quantum/proxy and 12 card/history tests (+27).
 * The full receipt gate verifies the exact count below; portable coverage floors remain unchanged.
 *
 * Integrated CQM-25 governance/crosswalk adds seven law checks and the tracked ADR link check
 * (+8 from 3436). The full receipt gate verifies the exact count below.
 *
 * Canonical CQM-25 authority adds five surface/policy checks and nine schema/estimate checks
 * (+14 from 3422). The full receipt gate verifies the exact count below.
 *
 * Chart-bounds gate adds twelve per-chart canvas checks, a clipped-label regression and four
 * label-helper tests (+17 from 3405). The full receipt gate verifies the exact count below.
 *
 * CQM-25 adds seven profile tests, three radar tests and one tracked Markdown link check (+11 from 3394).
 *
 * Prior publication adds three catalog tests, one malformed-document-URL test and two tracked Markdown
 * link checks (+6 from 3388). The full receipt gate verifies the exact count below.
 *
 * Count remeasured 2026-10-22 (Bun 1.4.2, Linux, full-history clone): 3,388 tests / 0 fail across 374
 * files; +7 from `tests/alife-landscape-report.test.ts` (the derived A-Life landscape index gate).
 * Measured 85.79% line / 83.90% function coverage, above the portable floor below. A SHALLOW clone
 * fails two provenance tests that `git show` historical commits — unshallow before measuring.
 *
 * Count remeasured 2026-07-16 (Bun 1.3.14): 3,304 tests / 0 fail / 3,742,758 expectations across 366
 * files, measured on Windows. +1 versus the earlier 2026-07-16 pass (3,303), from RESTORING
 * docs/PRD-2026-07-02.md: `tests/doc-links.test.ts` enumerates tracked markdown via `git ls-files`
 * and emits ONE test per file, so the suite grows by one whenever a .md is tracked — a real trap,
 * because a doc gates green while still untracked and only drifts the receipt once `git add` runs.
 * The prior +1 (3,302 -> 3,303) came from the inline-radar geometry gate in
 * `tests/alife-codeground-consistency.test.ts` (it decodes the shipped polygon back into a vector,
 * closing the hole that let docs.html/specs.html ship a radar stale on four axes).
 *
 * COUNT is platform-invariant, so the Windows measurement above is canon. COVERAGE is NOT: the two
 * percentages below stay the clean UBUNTU floor for the portable public contract and must never be
 * overwritten with a Windows figure (Windows reads higher — it measured 93.60/91.61 on 2026-07-14 —
 * and pasting that would silently RAISE the published floor without any new test covering a line).
 * Propagated to every public surface and
 * policed by `tests/docs-receipts-law.test.ts`. Dr. Manhattan's law: if it is not measured, it is not real.
 *
 * To update after adding/removing tests: `bun scripts/verify-receipts.ts --print`, paste here, re-sync.
 */
export const CANONICAL_TEST_COUNT = 3479;
export const CANONICAL_LINE_COV = '84.64';
export const CANONICAL_FUNC_COV = '82.21';

/**
 * NHSI DESIGN FACTS — single source of truth for the architecture counts published on every surface.
 * sync-surfaces.ts propagates these; `bun run sync:check` (gate-enforced) fails CI on any drift.
 * CAUTION — synced ONLY in their UNAMBIGUOUS canonical phrasing; the same noun carries legit other
 * framings that must NEVER be rewritten: "100-faculty DESIGN" != "~20 apex-active faculties" != "~30
 * deep-wired"; "25 Archon PANTHEON" != "5 individuated apex minds"; "10 emergence angles WIRED" (+5 events).
 */
export const CANONICAL_FACULTIES = 100;
export const CANONICAL_ARCHONS = 25;
export const CANONICAL_TOM_ORGANS = 25;
export const CANONICAL_EMERGENCE_ANGLES = 10;
export const CANONICAL_BIOLOGIC_FORMS = 26;
