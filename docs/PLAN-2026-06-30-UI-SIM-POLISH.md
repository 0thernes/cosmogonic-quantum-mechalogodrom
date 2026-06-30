# Plan — 2026-06-30 UI/Simulation/Audio Polish (VP/COO execution plan)

Status: drafted and in progress. Each phase is gated by `bun run check` (typecheck, lint, format, 1970+ tests, coverage receipts, surface sync, canonical facts, build). No phase ships without a regression test or a verifiable functional audit where a test is impossible (visual-only WebGL changes require Playwright screenshot evidence).

## Already landed (baseline)

- `bun run check` green on `phase0-ui-shell` (1974 tests, 91.87% line / 89.10% function coverage).
- HUD TWIN min/close buttons enlarged, brain slots animated, 3-row dock wrapped, panel chrome added, lab WebGL tiles fitted, two new songs added, Tsotchke depth ledger added, audio master mute + 20-minute auto-mute sleep timer added, NHI social proximity, plant contact response, archon grid.

## Phase A — UI/UX hard blockers (1-5)

A1. **LABS tiles fix (Pages 2-4)**

- Adjust `fitWebglTile` camera multipliers per attractor so Lorenz, Rössler, Gray-Scott, Voronoi, Barnsley FERN, Thomas, Halvorsen, Chen-Lee, 3D Lissajous, Curl-Noise, Duffing, Nosé-Hoover (page 2), Bloch Sphere, oscillator probability (page 3), Aizawa, Spiral Galaxy, 3D Random Walk, Seed Double Helix (page 4) all render inside their tiles.
- Add hover/touch interaction + unique SFX cues per tile.
- Regression: `tests/lab-attractors.test.ts` already counts fits; add per-tile bounding-box check by rendering to a canvas in tests if feasible, otherwise a Playwright screenshot gate.

A2. **HUD TWIN creature**

- Increase size and switch to CSS flexbox/grid; ensure all bars/stats are visible.
- Make min/close buttons always accessible, sitting inside the creature box, not hidden behind it.
- Add keyboard accessibility (Esc to close, focus rings).
- Regression: add a static DOM test that `#cqm-hero` contains `.cqm-hero-min` and `.cqm-hero-close`.

A3. **Three brain columns**

- Render APEX / MECHA / GLYPH as three square columns with high-density, chaotic-but-readable neural mini visualizers (sparklines, firing nodes, synaptic pulses, electrode shimmer).
- Use CSS grid; keep the overall widget compact but legible.
- Regression: `tests/ui-ergonomics.test.ts` should verify the three labels exist.

A4. **Bottom dock reorganization**

- Group left: Music, Song, SFX, Mute, Rewind/Reset, Time Speed, View, Space.
- Group center: Algo.
- Group right: Entropy, Chaos, Brutalism, NHI, Apocalypse + Environment, Singularity, Render, N1/N2.
- Fix SET/settings panel so it toggles on/off and its panel sits above the dock (z-index / flex ordering) and never gets clipped on short viewports; improve font legibility.
- Regression: add a static DOM test that the dock has the expected groups and that the settings toggle toggles the modal class.

A5. **Panels as 3rd row + audit expansion**

- Move COPILOT, HELP, AUDIT, NHI OBS, MARKET, ARCHON GODFORMS, PANTHEONS, APEX into a dedicated 3rd row dock bar.
- Give each panel top-right min/close and left/right cycle buttons; ensure one-open-at-a-time.
- Audit log: split into 4 tabs/scopes (DEV, BIO, NEURO, SUBSTRATE) with richer data per line.
- Archon Godforms: fill dead space with per-archon stats, glyphs, and readable typography.
- Regression: extend `tests/ui-lifecycle-static.test.ts` and add panel-state tests.

## Phase B — Creatures / NHI / Pantheon (6, 7, 10, 11, 12, 14, 15)

B1. **Brutalism + super-creature eyes/spikes/arms**

- Vary eyes, spikes, and arms when Brutalism is toggled; make eyes high-detail, procedural, and react to brain state.
- Use p5.js/implicit surface overlays where Three.js alone is insufficient; keep performance gated by frame governor.

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

B5. **Entity color variation**

- 1/3 dark black/grey/gold, 1/3 purple/blue/red/green/pink, 1/3 dynamic crazy combos.
- Dynamic hue/brightness/saturation shifts over time.

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
