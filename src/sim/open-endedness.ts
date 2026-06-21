/**
 * OPEN-ENDEDNESS INSTRUMENTATION — measuring whether the soup actually evolves.
 *
 * Applies the research bedrock (docs/reports/2026-06-20-RESEARCH-BEDROCK.md): Bedau-Packard
 * EVOLUTIONARY ACTIVITY statistics (Bedau, Snyder & Packard 1998, "A classification of long-term
 * evolutionary dynamics") + a historical-novelty + contemporary-diversity open-endedness template
 * (cf. Lehman & Stanley 2011, novelty search). These turn "is it growing open-endedly or just
 * drifting/plateauing?" from a vibe into a measured signal — the same receipts discipline the rest
 * of the project lives by.
 *
 * PURE math: no rng draws, no Date.now, no DOM, no mutation of inputs — so it is determinism-safe
 * (never touches the seeded core stream) and fully unit-testable headlessly. A sim/UI layer can feed
 * it per-epoch observations later; the metrics themselves live here as pure functions.
 */

/** log2 with a 0-safe guard (0 contributes 0 to entropy). */
function log2(x: number): number {
  return Math.log(x) / Math.LN2;
}

/**
 * Shannon DIVERSITY (in bits) of a categorical distribution given raw counts (e.g. per species /
 * morphotype / lineage). H = -Σ pᵢ·log2(pᵢ). Even spread of n categories → log2(n); a monoculture → 0.
 * Pure; negatives are clamped to 0; an empty/zero population → 0.
 */
export function shannonDiversity(counts: readonly number[]): number {
  let total = 0;
  for (const c of counts) if (c > 0) total += c;
  if (total <= 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * log2(p);
  }
  return h;
}

/** RICHNESS — the number of distinct categories currently present (nonzero count). Pure. */
export function richness(counts: readonly number[]): number {
  let n = 0;
  for (const c of counts) if (c > 0) n++;
  return n;
}

/**
 * HISTORICAL NOVELTY (novelty search / Foerster Petri-NCA): the Euclidean distance from the current
 * feature signature to its NEAREST neighbour in the historical archive of past signatures. High =
 * the population reached a region of feature-space it had not occupied before (open-ended motion);
 * low = it is revisiting old ground. An empty archive ⇒ maximally novel (+Infinity). Pure.
 */
export function historicalNovelty(
  signature: readonly number[],
  archive: readonly (readonly number[])[],
): number {
  if (archive.length === 0) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const past of archive) {
    let d2 = 0;
    const n = Math.min(signature.length, past.length);
    for (let i = 0; i < n; i++) {
      const diff = (signature[i] ?? 0) - (past[i] ?? 0);
      d2 += diff * diff;
    }
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

export interface EvolutionaryActivity {
  /** Per-component cumulative activity counter (sum of usage across the whole history). */
  readonly cumulative: number[];
  /** Total cumulative activity across all components. */
  readonly total: number;
  /** Mean cumulative activity per component (0 when there are no components). */
  readonly mean: number;
}

/**
 * BEDAU-PACKARD EVOLUTIONARY ACTIVITY. `history[t][i]` = how much component i (species/lineage/gene)
 * was "used"/present at epoch t. Returns the per-component cumulative activity (a component that
 * persists and stays used accrues activity), the total, and the mean. A genuinely open-ended system
 * keeps generating NEW activity (new components accruing) rather than plateauing — feed successive
 * snapshots and watch `total` grow with new lineages, not just inflate old ones. Pure; ragged rows
 * are tolerated (missing entries count as 0).
 */
export function evolutionaryActivity(
  history: readonly (readonly number[])[],
): EvolutionaryActivity {
  let width = 0;
  for (const row of history) if (row.length > width) width = row.length;
  const cumulative = new Array<number>(width).fill(0);
  for (const row of history) {
    for (let i = 0; i < row.length; i++) {
      const v = row[i] ?? 0;
      if (v > 0) cumulative[i] = (cumulative[i] ?? 0) + v;
    }
  }
  let total = 0;
  for (const c of cumulative) total += c;
  return { cumulative, total, mean: width === 0 ? 0 : total / width };
}
