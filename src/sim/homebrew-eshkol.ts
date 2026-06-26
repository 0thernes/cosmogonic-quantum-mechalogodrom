/**
 * HOMEBREW-ESHKOL — build-toolchain facade for the local `.esk` catalog.
 *
 * The upstream repo is a compiler/build toolchain (not a runtime primitive). Cosmogonic harvests
 * `.esk` programs via `scripts/harvest-tsotchke-corpus.ts`; this leaf exposes catalog receipts for
 * primordial-soup / digital-biologics DNA without duplicating the harvest pipeline.
 *
 * © tsotchke — see THIRD-PARTY-NOTICES.md + docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md.
 */

/** Fingerprint mix for a harvested program index (deterministic). */
export function eskCatalogFingerprint(index: number, seed: number): number {
  const h = ((index * 0x9e3779b1) ^ seed) >>> 0;
  return h % 0xffffff;
}

/** Normalised catalog vitality from harvest count + beat. */
export function eskCatalogVitality(harvestCount: number, beat: number): number {
  if (harvestCount <= 0) return 0;
  const density = Math.min(1, harvestCount / 2000);
  const phase = (beat % 360) / 360;
  return Math.max(0, Math.min(1, density * (0.6 + 0.4 * Math.sin(phase * Math.PI * 2))));
}

/** Receipt for registry / soup catalysis. */
export interface HomebrewEshkolReceipt {
  readonly fingerprint: number;
  readonly vitality: number;
  readonly harvestCount: number;
}

export function homebrewEshkolBeat(
  harvestCount: number,
  beat: number,
  seed: number,
): HomebrewEshkolReceipt {
  const idx = beat % Math.max(1, harvestCount);
  return {
    fingerprint: eskCatalogFingerprint(idx, seed),
    vitality: eskCatalogVitality(harvestCount, beat),
    harvestCount,
  };
}
