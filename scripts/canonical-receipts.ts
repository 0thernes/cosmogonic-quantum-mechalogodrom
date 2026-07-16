/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
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
export const CANONICAL_TEST_COUNT = 3312;
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
