# ADR 0016: Social Contact Density Law

**Status:** Accepted (supersedes the social-radius freeze in ADR 0012)
**Date:** 2026-07-11
**Depends on:** [ADR 0012](./0012-expanded-habitat-with-stable-populations-2026-07-10.md)

## Context

ADR 0012 expanded usable land 4× and the roaming column ~12× while **freezing** local social,
feeding, vision, and interaction radii at legacy unit lengths. Organism and caste counts stayed
fixed. Encounter density collapsed. Living systems that still had game theory, trade, alliance,
flock, Nash, connectome, and NHI kin wiring almost never met a partner. The runtime read as
super-avoidant isolates — not ALife.

## Decision

1. **Binding social contact law** in `src/sim/constants.ts`:
   - `SOCIAL_SCALE = HABITAT_XZ_SCALE * 2` multiplies organism-local radii (flock, Nash, market,
     typemorph, setunion, graphseek, connectome).
   - `SOCIAL_CASTE_SCALE = HABITAT_XZ_SCALE * ARENA` multiplies sparse-caste radii (Shoggoth trade /
     threat / tendril / consume, puppeteer opportunity, NHI kin + body social).
   - All contact disks are derived through `socialR` / `casteR` (or the canonical exported radii).
     **Never hard-code a bare legacy radius for social contact again.**

2. **Chain ecology**: graphseek + ambient social use nearest-neighbor springs at classic
   `optD = 4 + typeId` (filaments / nets), not crowd-centroid blobs.

3. **Social-core packing**: founders spawn in mid-field (`SOCIAL_SPAWN_*`); NHI/titan roam packs
   mid-field overlapping orbits; titans use per-stratum multi-altitude homeY + dual-frequency Y.

4. **Theory cadence**: `theoryStride = 1` — full-rate social/theory re-eval.

5. **ADR 0012 remains** for habitat size and flora counts. Its clause "keep social radii unchanged"
   is **void**. Habitat growth without population growth **must** scale social contact disks.

## Consequences

- Multi-neighbor flock / Nash / trade / connectome contact returns at desktop-tier populations.
- Titans occupy stacked altitude bands again (not one mid-plane shelf).
- Neighbor-query CPU cost rises (desired: restore design-era `k`).
- Consciousness / sentience claims are **not** established by this ADR.

## Verification

- `tests/habitat-scale.test.ts` social-contact + NHI social-core seals.
- `tests/titans.test.ts` multi-altitude + social-core span seals.
- Focused: behaviors, connectome, shoggoth, NHI, entities.
