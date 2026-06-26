/**
 * canonical.ts — THE single source of truth for every human-readable fact that is
 * duplicated across surfaces (README, docs.html, specs.html, ARCHITECTURE, the NHSI
 * dashboard, package.json, the GitHub "About" blurb, release notes).
 *
 * The pain this kills: the same number (faculties, archons, version, test count) was
 * hand-copied into a dozen places and drifted — package.json said "144 faculties / 15
 * emergence angles" while docs.html said "100 / 10". Edit the values HERE, run
 * `bun run sync`, and every surface that carries a `<!--canon:KEY-->…<!--/canon-->`
 * marker (plus package.json's description) is rewritten to match. `bun run sync:check`
 * (wired into the gate via tests/docs-sync-law.test.ts) FAILS if any surface drifts.
 *
 * Measured gate receipts (test count / coverage) keep living in canonical-receipts.ts —
 * that file is what `verify-receipts.ts` MEASURES against reality; this file re-exports it
 * so there is still exactly one source per fact.
 */
import { CANONICAL_TEST_COUNT, CANONICAL_LINE_COV, CANONICAL_FUNC_COV } from './canonical-receipts';

/** The shipped release version. Mirror of package.json "version" (sync keeps them equal). */
export const VERSION = '0.18.0';

/**
 * Verified NHSI state — every number measured by the 2026-06-21 honesty audit
 * (docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md). These are the values that MUST read
 * the same on every public surface. "Design / path / target" framing only — never an
 * unsupported ACHIEVEMENT claim (the truth-law gate bans those).
 */
export const NHSI = {
  faculties: 100, // 100-faculty design
  facultiesWired: 30, // ~30 genuinely deep-wired into the apex
  emergenceAngles: 10, // 10 wired (+ 5 god-scale release events, which are NOT extra angles)
  archonsTotal: 25,
  archonsIndividuated: 5,
  archonsLightEcho: 20,
  tomOrgans: 25,
  biologicForms: 26,
  butlinMet: 8,
  butlinPartial: 6,
  butlinTotal: 14,
  tsotchkeRepos: 22, // 22+ enumerated; ~16 wired with real downstream effect
  tsotchkeWired: 16,
} as const;

/** Measured gate receipts (floors; verify-receipts.ts checks reality stays at/above these). */
export const RECEIPTS = {
  testFloor: CANONICAL_TEST_COUNT,
  lineCov: CANONICAL_LINE_COV,
  funcCov: CANONICAL_FUNC_COV,
} as const;

/**
 * The canonical one-line NHSI scorecard, reused verbatim wherever the scorecard appears.
 * Built from NHSI above so it can never disagree with the individual numbers.
 */
export const SCORECARD =
  `${NHSI.faculties}-faculty design (~${NHSI.facultiesWired} deep-wired) · ` +
  `${NHSI.archonsTotal} Archons (${NHSI.archonsIndividuated} individuated + ${NHSI.archonsLightEcho} light-echo) · ` +
  `${NHSI.tomOrgans} ToM organs · ${NHSI.emergenceAngles} emergence angles · ` +
  `Butlin ${NHSI.butlinMet}/${NHSI.butlinTotal} met + ${NHSI.butlinPartial}/${NHSI.butlinTotal} partial`;

/**
 * Keyed values the sync propagator writes into `<!--canon:KEY-->…<!--/canon-->` markers.
 * Add a key here + a marker in a surface and it is kept in lockstep automatically.
 */
export const CANON: Record<string, string> = {
  version: VERSION,
  faculties: String(NHSI.faculties),
  facultiesWired: String(NHSI.facultiesWired),
  emergenceAngles: String(NHSI.emergenceAngles),
  archonsTotal: String(NHSI.archonsTotal),
  archonsIndividuated: String(NHSI.archonsIndividuated),
  archonsLightEcho: String(NHSI.archonsLightEcho),
  tomOrgans: String(NHSI.tomOrgans),
  biologicForms: String(NHSI.biologicForms),
  butlinMet: String(NHSI.butlinMet),
  butlinPartial: String(NHSI.butlinPartial),
  butlinTotal: String(NHSI.butlinTotal),
  tsotchkeRepos: String(NHSI.tsotchkeRepos),
  testFloor: String(RECEIPTS.testFloor),
  lineCov: RECEIPTS.lineCov,
  funcCov: RECEIPTS.funcCov,
  scorecard: SCORECARD,
};

/** The package.json "description" blurb, generated so it can never drift from the numbers. */
export const PKG_DESCRIPTION =
  'Tsotchke-powered Petri dish for NHSI digital biologics & proto-sentience. ' +
  `${NHSI.tsotchkeRepos}+ Tsotchke repos integrated (~${NHSI.tsotchkeWired} wired; LLM fenced) — Eshkol AD/GWT, Moonlab, QGT, spin, libirrep, quake, ulg, logo, tensorcore, PINN, PIMC, rngs, asteroids, classical, homebrew. ` +
  `${NHSI.biologicForms} BiologicForms · ${NHSI.archonsTotal} Archons · ${NHSI.faculties} faculties (~${NHSI.facultiesWired} deep-wired) · ${NHSI.tomOrgans} ToM organs · ${NHSI.emergenceAngles} emergence angles · Butlin ${NHSI.butlinMet}/${NHSI.butlinTotal} met + ${NHSI.butlinPartial}/${NHSI.butlinTotal} partial. ` +
  `Deterministic Rng, not LLM. 0thernes Corp NHSI. Grow What Thou Wilt. v${VERSION}`;
