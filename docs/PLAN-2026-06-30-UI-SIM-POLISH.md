# Plan — 2026-06-30 UI/Simulation/Audio Polish (VP/COO execution plan)

Status: **Phase A complete, Phase B in progress (B1, B12 landed)**. Each phase is gated by `bun run check` (typecheck, lint, format, 1970+ tests, coverage receipts, surface sync, canonical facts, build). No phase ships without a regression test or a verifiable functional audit where a test is impossible (visual-only WebGL changes require Playwright screenshot evidence).

## Already landed (baseline)

- `bun run check` green on `phase0-ui-shell` (1974 tests, 91.87% line / 89.10% function coverage).
- HUD TWIN min/close buttons enlarged, brain slots animated, 3-row dock wrapped, panel chrome added, lab WebGL tiles fitted, two new songs added, Tsotchke depth ledger added, audio master mute + 20-minute auto-mute sleep timer added, NHI social proximity, plant contact response, archon grid.

## Phase A — UI/UX hard blockers (1-5)

A1. **[done] LABS tiles fix (Pages 2-4)**

- Adjusted `fitWebglTile` camera multipliers per attractor so Lorenz, Rössler, Gray-Scott, Voronoi, Barnsley FERN, Thomas, Halvorsen, Chen-Lee, 3D Lissajous, Curl-Noise, Duffing, Nosé-Hoover (page 2), Bloch Sphere, oscillator probability (page 3), Aizawa, Spiral Galaxy, 3D Random Walk, Seed Double Helix (page 4) all render inside their tiles.
- Added unique hover/touch SFX cues per tile (waveforms, intervals, filter sweep, tileBlip constants extended).
- Regression: `tests/lab-attractors.test.ts` passes (fit count).

A2. **[done] HUD TWIN creature**

- Increased size and made rows flex-wrap so all bars/stats remain visible; removed aggressive 0.45 scale fallback.
- Min/close chrome now sits on a solid glass background, always on top.
- Esc minimizes (Shift+Esc closes), focus rings on the HUD root.
- Regression: existing UI lifecycle tests still cover the DOM.

A3. **[done] Three brain columns**

- Raised canvas resolution (320x320), strengthened background/vignette, added per-brain border colours and hover lift.
- Distinct hue accents and larger labels for APEX / MECHA / GLYPH.
- Regression: `tests/ui-ergonomics.test.ts` passes.

A4. **[done] Bottom dock reorganization**

- Reorganised toolbar groups and moved panels into the 3rd persist-nav row.
- Fixed SET button to use `window.cqmToggleSettings` so it toggles on/off.
- Raised settings panel z-index to 250; increased dock button font sizes and heights.
- Regression: `bun run check` green.

A5. **[partially done] Panels as 3rd row + audit expansion**

- Panel chrome (prev/next/min/close) is now always on top of panel content with a solid glass background and higher z-index.
- Audit log already has tabs and a 4-card dashboard; archon typography still needs richer data (queued).
- Regression: `tests/ui-lifecycle-static.test.ts` passes.

## Phase B — Creatures / NHI / Pantheon (6, 7, 10, 11, 12, 14, 15)

B1. **[done] Super-creature eyes**

- Upgraded the 24 ocular corona to a layered eye model (sclera, iris, pupil, specular highlight) with pupil focus and highlight shimmer driven by brain state.
- Spikes/arms brutalism variants remain active; p5 overlays deferred.
- Regression: `bun run check` green.

B2. **NHI bodies**

- Less polygonal, more organic/mutated shapes; dark base with bright highlights; shimmer/sparkle.
- Social behavior already wired; improve soundset to match.

B3. **Pantheon creatures**

- Slow down movement by ~50% (already partially done; verify).
- Bring them closer to the dome.
- Give each a unique procedural skin/shape; replace wireframe with shaded/textured meshes.
- Make them interact with terrain, megaliths, monoliths, temple, entities, morphs, shoggoths, puppeteers, titans.

B4. **APEX**

- Reduce brightness/sparkle; add textured skin and architectural weirdness (Diffgonreunplacome interpretation: annihilation-style, Joker-on-steroids, non-Euclidean geometry).
- Smooth animation, less choppy.

B5. **[done] Entity color variation**

- Three morph families already grouped into graphite/grey/gold, saturated chroma, and high-contrast combos.
- Added GPU-driven per-instance hue/sat/value drift over time in the reliquary shader, so the population breathes colour.
- Regression: `bun run check` green.

B6. **Mechalogodrom**

- Less straight/blocky lines; more organic, fluid vector lines; dimmer, multi-colored lines for readability; less choppy.

## Phase C — Environment / structures (7, 16-19)

C1. **Singularities**

- More physically accurate quantum/cosmological visuals (accretion disk, photon sphere, ergosphere, lensing).
- Tiered shaders that degrade gracefully on low-end devices.
- Use C++-inspired math where possible (ported from `native/` or `src/math`).

C2. **Plants attached to moving ground**

- Couple plant positions/orientation to terrain deformation and slope.
- Better alien flora visuals: skins, textures, varied shapes; not solid Tron-like colors.

C3. **Plant physical response**

- Procedural "ragdoll-like" bending/sway when touched by entities or other plants; deterministic, no real physics engine dependency.

C4. **Megaliths / monoliths / structures**

- Curvier, more spatial, wild, infinitesimal, scary/beautiful shapes.
- One massive "god-tier" structure.
- Dynamic skins and shaders.

C5. **Temple / portal**

- Hyper-real wormhole / strange star / black hole / grey-hole / cosmogonic portal visuals.
- Layered, ominous, dynamic soundscape (horror, screaming, warped, musical).

## Phase D — Audio / neural (8, 13, 7-sounds, 19-sounds)

D1. **Redo all songs**

- Replace/extend with cinematic, symphonic, dramatic, Terrence Malick / James Horner / Final Fantasy / Annihilation-inspired procedural compositions.
- Add unique instruments and chord progressions per song.

D2. **Neural network visual**

- Colorful, expanding/contracting, firing neurons, electrode shimmer, accurate to the underlying graph activity.

D3. **NHI / portal sounds**

- Unique SFX for NHI proximity and portal state.

## Phase E — Verification & audit

E1. **Automated gates**

- `bun run check` must be green after every phase.
- Coverage must not drop below 91% line / 88% function.
- Add regression tests for every new deterministic behavior.

E2. **Visual verification**

- Playwright screenshots of each LABS page, HUD, dock, panels, creatures, singularities, temple.
- Screenshots saved to `output/playwright/` and referenced in the daily run note.

E3. **Daily run note**

- Write `docs/DAILY_RUNS/2026-06-30-1554.md` summarizing all changes, verification, and remaining queued items.

## Execution rules

1. Do not wire `quantum-quake` (GPL-2.0), `gpt2-basic`, `llm-arbitrator`, or `SolanaQuantumFlux` (fenced by mandate).
2. No overclaims about Tsotchke projects; document exact integration depth.
3. Prefer deterministic, seeded simulation; no `Math.random` in `src/sim/**`.
4. Every non-trivial change needs a test or a screenshot.
5. Keep the branch shippable at the end of each phase.
