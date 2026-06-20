/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
 *
 * Measured 2026-06-20 (Bun 1.3.14, cold shell) and verified to match reality by
 * `scripts/verify-receipts.ts` (run in `bun run check` + CI). Propagated to every public surface and
 * policed by `tests/docs-receipts-law.test.ts`. Dr. Manhattan's law: if it is not measured, it is not real.
 *
 * To update after adding/removing tests: `bun scripts/verify-receipts.ts --print`, paste here, re-sync.
 */
export const CANONICAL_TEST_COUNT = 1242;
export const CANONICAL_LINE_COV = '94.71';
export const CANONICAL_FUNC_COV = '91.67';
