/**
 * CANONICAL RECEIPTS -- the single source of truth for the repo's measured gate figures.
 *
 * Measured 2026-06-20 (Bun 1.3.14, cold shell) and verified by `scripts/verify-receipts.ts`
 * (run in `bun run check` + CI). Propagated to every public surface and policed by
 * `tests/docs-receipts-law.test.ts`. Dr. Manhattan's law: if it is not measured, it is not real.
 *
 * TEST_COUNT is an EXACT integer — it is portable (identical local and CI). COVERAGE is a PORTABLE
 * FLOOR, not a point measurement: line/function coverage differs by ~4-5 points between a local dev
 * machine (Windows) and the CI runner (Linux) and jitters run-to-run, so an exact pin can never be
 * green in both environments (this silently red-failed every release before v0.12). We therefore pin
 * the CI-enforced gate floor (>= 90 % line / >= 85 % func); verify-receipts asserts the measured gate
 * is AT OR ABOVE it. Honest (coverage genuinely clears the floor everywhere) and reproducible.
 *
 * To update after adding/removing tests: `bun scripts/verify-receipts.ts --print` for the exact count;
 * keep coverage at the gate floor (raise only with the documented CI coverage threshold).
 */
export const CANONICAL_TEST_COUNT = 1293;
export const CANONICAL_LINE_COV = '90.00';
export const CANONICAL_FUNC_COV = '85.00';
