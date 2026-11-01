# Mini World and the Sandbox panel

## Mini World (`?world=mini`)

Open it from the top-centre pill (on phones: "✦ Mini World") or by adding `?world=mini` to the URL.
"← Back to the full-size world" (on phones: "← Full world") returns.

It is a true miniature of the full world:

| Quantity                                                                                                                                                            | Factor                            | Why                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Entity counts and capacities                                                                                                                                        | `WORLD_SCALE` = 0.1               | one tenth of everything                                              |
| Horizontal layout (arena, rings, landmark positions, landmark footprints)                                                                                           | `WORLD_LINEAR` = √0.1 ≈ 0.316     | area × 0.1, so **density matches the full world**                    |
| Vertical column (ceiling, landmark altitudes, biome strata, camera heights)                                                                                         | `WORLD_LINEAR` = √0.1 ≈ 0.316     | width:height matches the full world (683 × 226 vs 2160 × 714)        |
| Populations and caps (super creatures 5→1, glyph brains 100→10, crystal-tree census, xenomimics, NHI minds, coral, feeders, waste constructs, wilderness per chunk) | `scaleCount` = round(n/10), min 1 | fewer things, each at full intelligence and fidelity                 |
| Mechalogodrom altitude                                                                                                                                              | `PLATFORM_CEIL − 24` ≈ 207.8      | the god and its orbiting corona stay under the 231.8 ceiling         |
| Creature bodies, effect and contact radii                                                                                                                           | 1 (unscaled)                      | creatures look and behave at full size                               |
| Fog density                                                                                                                                                         | 1 (unscaled)                      | same atmosphere and visibility as the full world                     |
| Camera start                                                                                                                                                        | `WORLD_LINEAR`                    | frames the smaller arena the way the full camera frames the full one |

Shape: the floor stays at 6 and the ceiling drops from 720 to about 231.8 (`columnY` in
`src/sim/constants.ts`), so Mini World is a flat slab with the full world's proportions, not a tall
column. Creatures clamp to the new ceiling; the biome strata squeeze into it.

Trade-off: landmarks (crystal tree, mechalogodrom, god-colossus, cosmic web) scale with the layout,
so they are about 3.2× smaller relative to creatures than in the full world. A 1/10-area world
cannot hold full-size megastructures. Scaling everything uniformly, including bodies and the camera,
would render identically to the full world, so it would not be a miniature at all.

Quality is never reduced: shadows and the top render tier stay on, and the render resolution is
`min(devicePixelRatio, cap) × scale` with `scale ≤ 1`, so it never exceeds the device's native ratio.

Mini World always boots from Sandbox defaults. Sandbox changes made inside it last for the
session only and never overwrite the main world's saved settings.

## Sandbox panel (🧪)

Lists every world system (populations, phyla, systems and their pools), found by reflection over the
running World. Each one can be switched on or off and set from 0 to 300 % in 10 % steps. Changes
apply live and are saved in `localStorage` (`cqm.sandbox.v1`) for the main world. "Reset to default"
clears them.

When any setting differs from default, a "🧪 Custom sandbox active · N changes" badge shows under
the Mini World pill. Click it to open the panel.

## Xenomind trust gate

The xenomind's nudges to the archon percept (pull and light) go through `XenomindTrustGate`
(`src/sim/xenomind-gate.ts`). Its influence is exactly zero until it has watched at least 600 beats
and its intent agrees with the brains' own pull at least 80 % of the time (EMA 0.01). After that it
only pushes further in the direction the brain already leans. It draws no random numbers, so
seeded determinism and goldens are unchanged.
