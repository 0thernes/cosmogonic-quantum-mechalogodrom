# ADR 0012: Expanded Habitat With Stable Populations

**Status:** Accepted
**Date:** 2026-07-10

## Context

The live biosphere had a 1,200-unit ground edge, a ±540 usable square, and a 6..240 roaming column.
Its inhabitants crowded the available volume. The required change is exactly 2× width, 2× length,
and 3× ceiling height, with no increase to any non-plant population. Active alien flora is the sole
exception: its intended 15,000 desktop plants must become exactly 60,000 because land area is 4×.

`ARENA` and `ARENA_Y` also size authored bodies and architecture. Changing them would enlarge the
inhabitants and monuments rather than only the habitat.

## Decision

- Keep authored scales fixed: `ARENA=5`, `ARENA_MID=2.5`, `ARENA_Y=2`.
- Add habitat-only multipliers: `HABITAT_XZ_SCALE=2`, `HABITAT_Y_SCALE=3`.
- Derive one authoritative habitat: ground edge 2,400; platform ±1,080; floor/ceiling 6..720.
- Keep all entity, Shoggoth, Puppeteer, Titan, Leviathan, Pantheon, NHI, wilderness, quantum, and
  quality-tier counts unchanged.
- Set live `AlienFlora` to exactly 60,000 desktop / 20,800 phone plants. Preserve clearing density
  with 28 glades, keep at most nine instanced draw calls, and reject jittered placements outside walls.
- Extend all world-scale spawn, intent, containment, respawn, camera, fog, atmosphere, shadow, and
  background envelopes from the habitat constants. Keep local collision, feeding, vision, social,
  body-size, and interaction radii unchanged.
- Raise the ground to 600 segments (4-unit cells), band-limit only the highest four-octave detail
  frequency, and double Gray-Scott resolution per axis. Share the static CPU terrain profile and
  animated displacement constants between soil and plant roots.

## Consequences

- Usable land area is exactly 4×; the roaming column is approximately 12.2× its former volume.
- Non-plant encounter density falls intentionally, creating the requested breathing room without
  changing organism capabilities or counts.
- Flora construction performs one O(N) placement pass. After boot, per-frame CPU ecology is the fixed
  O(52×52) biomass grid and is independent of the 60,000 GPU instance count.
- Top-view distance and its temporary far plane are derived from FOV/aspect so portrait and narrow-FOV
  inspection can still frame every corner.
- The 600-segment ground keeps sampled triangle error below the plants' 0.5-unit seating depth but
  increases GPU vertex/triangle work; desktop/phone browser performance remains a release gate.

## Verification

`tests/habitat-scale.test.ts` seals exact dimensions, unchanged quality populations, object-scale
invariants, camera framing, terrain seating tolerance, and NHI waypoints. Focused environment, flora,
atmosphere, fauna, Pantheon, apex-body, reaction-diffusion, portal, and determinism suites seal the
dependent behavior. The merged tree's cold coverage run passed 2,418 tests with zero failures and
measured 92.61% line / 90.23% function coverage on Windows; the portable published floor remains
84.64% / 82.21%.

The strengthened visual smoke passed both release tiers:

- Phone: 390×844 at DPR 2 reached stock frame 57; screenshot metrics were luma 63.61 and 375 color
  buckets, with 0 console errors and 0 page errors.
- Desktop: 1280×720 at DPR 1 reached stock frame 46; screenshot metrics were luma 55.14 and 297 color
  buckets, with 0 console errors and 0 page errors.
- Under a sustained maximum-chaos/entropy storm, TOP at FOV 35 kept all eight floor/ceiling corners
  visible on both viewports. The live census was exactly 20,800 phone / 60,000 desktop plants in nine
  draw groups. Both tiers reported 24 workers, observed 24 simultaneously active, and fetched the
  built `/workers/simulation-worker.js` as 2,387-byte minified JavaScript with HTTP 200.

These receipts prove successful boot, frame advancement, nonblank output, exact flora populations,
narrow-lens habitat framing, worker delivery/activity, and clean browser consoles. The saturated
ANGLE/Vulkan SwiftShader samples advanced at about 0.83 phone / 0.60 desktop frames per second. That
is honest software-renderer stress telemetry, not a hardware-GPU acceptance claim; interactive
performance on a production GPU remains a separate measurement.
