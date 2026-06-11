/**
 * Morphotype generation — port of legacy lines 276-289 (`MT` build loop),
 * extended for CONTRACTS V3.2 (PANTHEON) with optional phylum templating.
 *
 * A morphotype is the genome an entity instantiates: geometry index, PBR
 * material palette, behavior, and motion parameters. Generation is fully
 * deterministic from the injected {@link Rng} (Known Bug 9 fix: the legacy
 * file's ambient `rng` is replaced by an explicit seeded mulberry32).
 *
 * The implementation lives in {@link module:sim/phyla} so the taxonomy layer
 * (phyla + outliers) and the morphotype layer share one definition and can
 * never drift in their rng draw order. This module re-exports it under the
 * historical name/signature, plus the optional third `phyla` argument:
 *
 * - **No `phyla`**: the original 100-morphotype population, BIT-IDENTICAL to the
 *   legacy build (15 rng draws per morphotype, same field order).
 * - **With `phyla`**: `25 × phyla.length` morphotypes, each stamped with its
 *   phylum's traits plus ~1% wildcard outliers. See `sim/phyla.ts`.
 */
export { createMorphotypes, type PhylumMorphType, type Phylum } from './phyla';
