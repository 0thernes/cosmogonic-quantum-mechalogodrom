/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
 *
 * Count remeasured 2026-07-11 (Bun 1.3.14, tracked-only discovery); coverage remains the clean Ubuntu
 * floor because the same suite measured 93.18% line / 91.19% function on Windows. Propagated to every public surface and
 * policed by `tests/docs-receipts-law.test.ts`. Dr. Manhattan's law: if it is not measured, it is not real.
 *
 * To update after adding/removing tests: `bun scripts/verify-receipts.ts --print`, paste here, re-sync.
 */
export const CANONICAL_TEST_COUNT = 2819;
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
