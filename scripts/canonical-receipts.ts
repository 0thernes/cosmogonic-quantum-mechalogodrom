/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
 *
 * Measured 2026-06-20 (Bun 1.3.14, cold shell) and verified to match reality by
 * `scripts/verify-receipts.ts` (run in `bun run check` + CI). Propagated to every public surface and
 * policed by `tests/docs-receipts-law.test.ts`. Dr. Manhattan's law: if it is not measured, it is not real.
 *
 * To update after adding/removing tests: `bun scripts/verify-receipts.ts --print`, paste here, re-sync.
 */
// CANONICAL_TEST_COUNT is a FLOOR (a minimum), not an exact pin: the gate requires measured >= this.
// Parameterized doc/determinism tests count per-file, so the exact total is env-dependent (a clean CI
// checkout measures ~1462; a file-rich local/loop tree measures more). Pinning it exactly made CI
// perpetually red. Set below the leanest environment so every env passes; only lower if tests are
// genuinely removed. Coverage stays a published headline enforced within an explicit ±band.
export const CANONICAL_TEST_COUNT = 1400;
export const CANONICAL_LINE_COV = '95.71';
export const CANONICAL_FUNC_COV = '92.89';
