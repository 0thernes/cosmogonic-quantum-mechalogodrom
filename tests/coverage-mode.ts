/**
 * Coverage-mode detection for wall-clock tests.
 *
 * `bun test --coverage` instruments every statement; median frame budgets (and some
 * heavy multi-seed evals) become meaningless / flake under full-suite contention.
 * Wall-clock assertions must skip or loosen when this is true; structural checks stay on.
 *
 * Signals (any one):
 * - `CQM_COVERAGE=1` — set by `scripts/verify-receipts.ts` for the gate child
 * - `RECEIPTS_LAW_CHILD=1` — legacy gate sentinel (same spawn)
 * - `BUN_COVERAGE` / `NODE_V8_COVERAGE` — if a runner sets them
 * - `--coverage` on argv — works when the test process itself receives the flag
 *
 * Manual local coverage: `CQM_COVERAGE=1 bun test --coverage`
 */
export function underCoverage(): boolean {
  if (process.env['CQM_COVERAGE'] === '1') return true;
  if (process.env['RECEIPTS_LAW_CHILD'] === '1') return true;
  if (process.env['BUN_COVERAGE']) return true;
  if (process.env['NODE_V8_COVERAGE']) return true;
  return process.argv.some((a) => a === '--coverage' || a.startsWith('--coverage='));
}

/**
 * Assert a wall-clock median budget only when coverage instrumentation is off.
 * Under coverage, only checks that the sample is a finite positive duration (smoke).
 */
export function expectWallBudgetMs(med: number, budgetMs: number): void {
  if (!Number.isFinite(med) || med < 0) {
    throw new Error(`expectWallBudgetMs: invalid sample ${med}`);
  }
  if (underCoverage()) {
    // Instrumented runs are not a valid wall-clock measurement surface.
    if (!(med > 0))
      throw new Error(`expectWallBudgetMs: under coverage expected med > 0, got ${med}`);
    return;
  }
  if (!(med < budgetMs)) {
    throw new Error(`expectWallBudgetMs: median ${med.toFixed(2)}ms ≥ budget ${budgetMs}ms`);
  }
}
