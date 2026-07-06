/**
 * OPEN-ENDEDNESS INSTRUMENTATION — measuring whether the soup actually evolves.
 *
 * Applies the research bedrock (docs/NHSI-RESEARCH-PAPERS-LEDGER-2026-06-26.md): Bedau-Packard
 * EVOLUTIONARY ACTIVITY statistics (Bedau, Snyder & Packard 1998, "A classification of long-term
 * evolutionary dynamics") + a historical-novelty + contemporary-diversity open-endedness template
 * (cf. Lehman & Stanley 2011, novelty search). These turn "is it growing open-endedly or just
 * drifting/plateauing?" from a vibe into a measured signal — the same receipts discipline the rest
 * of the project lives by.
 *
 * PURE math: no rng draws, no Date.now, no DOM, no mutation of inputs — so it is determinism-safe
 * (never touches the seeded core stream) and fully unit-testable headlessly. The sim layer feeds it
 * per-epoch diversity snapshots every 300 frames in world.ts driveSuper (V-BEDAU); the metrics
 * themselves live here as pure functions.
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
  const cumulative = Array.from({ length: width }, () => 0);
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

/**
 * NEW-ACTIVITY SERIES — the core Bedau-Packard quantity. For each step `i ≥ window`, the "new
 * activity" is how far the current snapshot rises ABOVE the best it had reached in the trailing
 * `window` (`A_new[i] = max(0, snap[i] − max(snap[i−window … i−1]))`). A step that merely matches or
 * revisits recent ground contributes 0; only genuinely-new high-water marks count. Returns one value
 * per post-warmup step (empty when the series is too short). Pure — the shared basis of both the
 * activity fraction and the bounded/unbounded verdict below.
 */
export function newActivitySeries(snapshots: readonly number[], window = 8): number[] {
  const out: number[] = [];
  if (snapshots.length < window + 1) return out;
  for (let i = window; i < snapshots.length; i++) {
    let prevMax = 0;
    for (let j = i - window; j < i; j++) {
      const prev = snapshots[j] || 0;
      if (prev > prevMax) prevMax = prev;
    }
    out.push(Math.max(0, (snapshots[i] || 0) - prevMax));
  }
  return out;
}

/**
 * Bedau-Packard EVOLUTIONARY ACTIVITY (per ROADMAP P2).
 * Measures persistent adaptive novelty: the fraction of "new" structure that is maintained over time.
 * High + non-plateauing = open-ended (the substrate is doing real work, not just cycling).
 * For a series of diversity/novelty snapshots, returns activity A = (new persisting) / total.
 * Pure, for use in petri/soup ablations.
 */
export function bedauPackardActivity(
  snapshots: readonly number[], // e.g. successive shannonDiversity or historicalNovelty values
  window = 8,
): number {
  if (snapshots.length < window + 1) return 0;
  let persistingNew = 0;
  for (const a of newActivitySeries(snapshots, window)) persistingNew += a;
  let total = 0;
  for (let i = window; i < snapshots.length; i++) total += snapshots[i] || 0;
  // A = (new persisting) / total — a proper [0,1] fraction (matches the docstring). The previous
  // divisor `total / snapshots.length` (per-snapshot mean) over-scaled by snapshots.length and
  // saturated to 1 for any rising series. Instrumentation-only (not sim-coupled).
  return total > 0 ? Math.min(1, persistingNew / total) : 0;
}

/** The three long-term dynamics classes Bedau-Packard distinguish, plus a no-innovation floor. */
export type OpenEndednessClass = 'unbounded' | 'bounded' | 'inactive';

export interface OpenEndednessVerdict {
  /** Mean new-activity over the FIRST half of the post-warmup series (early innovation rate). */
  readonly newEarly: number;
  /** Mean new-activity over the SECOND half (late innovation rate — the tell). */
  readonly newLate: number;
  /** newLate / newEarly (0 when there was no early innovation). */
  readonly ratio: number;
  /** The verdict — the actual open-endedness signature, not a vibe. */
  readonly verdict: OpenEndednessClass;
}

/** Below this, an innovation rate is treated as effectively zero (guards ratio + inactive floor). */
const OEE_EPS = 1e-9;
/** Late innovation must be at least this fraction of the early rate to count as still-open-ended. */
const OEE_SUSTAIN = 0.5;

/**
 * BOUNDED vs UNBOUNDED evolutionary activity — the canonical open-endedness verdict (Bedau, Snyder &
 * Packard 1998, "A classification of long-term evolutionary dynamics"). The signature of a genuinely
 * open-ended system is that its rate of NEW adaptive activity does NOT decay to zero: it keeps minting
 * new high-water marks forever ("unbounded"), rather than saturating onto a plateau ("bounded") or
 * never innovating at all ("inactive"). We read that off {@link newActivitySeries} by comparing the
 * mean new-activity in the early half of the run against the late half:
 *   • both halves ≈ 0            → `inactive` (no innovation — a frozen/monoculture soup)
 *   • late ≥ {@link OEE_SUSTAIN} × early → `unbounded` (innovation persists — open-ended)
 *   • otherwise                   → `bounded` (innovation decayed — the run plateaued)
 * Pure, deterministic, headless — the honest "is it still evolving?" instrument for long runs. Note
 * this is the intrinsic-trend form; the fully rigorous Bedau-Packard test additionally subtracts a
 * neutral-shadow baseline to prove the activity is ADAPTIVE, not drift — see RESEARCH-BEDROCK.
 */
export function openEndednessVerdict(
  snapshots: readonly number[],
  window = 8,
): OpenEndednessVerdict {
  const series = newActivitySeries(snapshots, window);
  if (series.length < 2) return { newEarly: 0, newLate: 0, ratio: 0, verdict: 'inactive' };
  const mid = Math.floor(series.length / 2);
  const meanOf = (from: number, to: number): number => {
    let s = 0;
    for (let i = from; i < to; i++) s += series[i] ?? 0;
    return to > from ? s / (to - from) : 0;
  };
  const newEarly = meanOf(0, mid);
  const newLate = meanOf(mid, series.length);
  const ratio = newEarly > OEE_EPS ? newLate / newEarly : 0;
  let verdict: OpenEndednessClass;
  if (newEarly <= OEE_EPS && newLate <= OEE_EPS) verdict = 'inactive';
  else if (newLate > OEE_EPS && ratio >= OEE_SUSTAIN) verdict = 'unbounded';
  else verdict = 'bounded';
  return { newEarly, newLate, ratio, verdict };
}
