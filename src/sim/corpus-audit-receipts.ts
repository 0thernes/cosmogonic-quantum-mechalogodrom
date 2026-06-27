/**
 * CORPUS AUDIT RECEIPTS — measured census from docs/audit-2026-06-20-deep-dive/*.csv
 * (Tsotchke local corpus Z:\[Vibe Coded (AI)]\(Tsotchke), captured 2026-06-20).
 * Provenance index only — no runtime I/O on corpus path.
 */

/** Tsotchke corpus root file count (recursive). */
export const TSOTCHKE_FILE_COUNT = 12444;

/** Tsotchke corpus bytes (recursive). */
export const TSOTCHKE_BYTE_COUNT = 501_271_131;

/** Tsotchke text lines (recursive). */
export const TSOTCHKE_TEXT_LINES = 3_874_892;

/**
 * Eshkol `.esk` program files counted in the 2026-06-20 deep-dive CSV census (a dated provenance
 * snapshot). NOT the live figure: the runtime harvest (`generated-tsotchke-seeds.ts` `eskCount`)
 * currently scans **1436** `.esk` recursively, which is what README / NHSI dashboard / INTEGRATION-MAP
 * publish ("1436+"). Both are correct for what they measure (a dated root census vs the current
 * recursive harvest) — not a drift. Pinned to the 2026-06-20 capture.
 */
export const TSOTCHKE_ESK_COUNT = 721;

/** GitHub mirrors bound in TSOTCHKE_REPO_BINDINGS. */
export const TSOTCHKE_MIRROR_REPO_COUNT = 20;

/** Registry entries (incl. org .github meta). */
export const TSOTCHKE_REGISTRY_REPO_COUNT = 21;

/** Top corpus categories by text volume (from tsotchke-category-summary.csv). */
export const TSOTCHKE_TOP_CATEGORIES = [
  { name: 'eshkol-language-core', files: 1410, textLines: 390_752 },
  { name: 'mirror:logo-lab', files: 1816, textLines: 1_252_157 },
  { name: 'mirror:moonlab', files: 3478, textLines: 331_418 },
  { name: 'mirror:libirrep', files: 1510, textLines: 154_434 },
  { name: 'mirror:quantum-quake', files: 805, textLines: 310_392 },
] as const;

/** O(1). Coverage ratio: wired sim leaves / mirror repos. */
export function auditWiringReceipt(wiredLeafCount: number): number {
  return wiredLeafCount / TSOTCHKE_MIRROR_REPO_COUNT;
}
