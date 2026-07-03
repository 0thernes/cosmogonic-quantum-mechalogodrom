<!-- LIVING doc (rewrite in place; never fork a dated copy — see CLAUDE.md "Living docs, no archives"). -->

# The Monolith Megalith — Art Direction

> The engineering contract lives in [`src/sim/monolith-temple.ts`](../src/sim/monolith-temple.ts)
> (class `MonolithTemple`, alias `MonolithMegalith`). This is the **aesthetic** source of truth: what
> the level‑100 ascension end‑state _is_, why it looks the way it looks, and the six reference images
> it is cut from. When the visuals change, rewrite this file — do not fork a snapshot.

---

## 0. The reversal (the whole redesign in one sentence)

The old end‑state was **hot and hellish** — a "nightmare wormhole" of blood, acid, and screaming
souls in crimson and cyan. The reference images are its **exact inverse**: austere, silent,
near‑**monochrome** — a black crystal monolith on a black void, caging a newborn **white** star whose
light shatters outward through the facets as **prism spectrum**. So the redesign is, at root, a
_palette and mood inversion_: **hot‑hellish‑neon → cold‑sublime‑prismatic**. Warhammer‑grimdark
mass, Interstellar‑tesseract geometry, 2001‑monolith silence. Grey where it was red; white where it
screamed; spectrum only at the edges of the light.

---

## 1. What the six images actually are

Read scientifically (what is the geometry?) **and** artistically (what does it _want_?):

| #   | Image                                 | Geometry                                                                                                                                         | What it wants                                                                             |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | Kaleidoscope crystal, hyperspace warp | A faceted diamond/cube; billions of thin white rays exploding radially; a triangular aperture at the fold‑center; chromatic fringes on the white | **Ignition through a lens** — light born and shattered through a faceted crystal          |
| 2   | Cosmic wireframe cube‑city            | A brilliant white core; nested cubes full of starfields; wireframe grids to infinity; dark marble spheres adrift                                 | **The cosmos as a lattice** — pocket universes boxed and lit from one genesis point       |
| 3   | Dark megalith on a black sea          | A dark faceted cube with a white starburst bursting from inside; a spherical shell of orbiting spark‑trails                                      | **A caged star** — the light wants out, wrapped in an orbiting sphere of motes            |
| 4   | Grayscale data‑cathedral              | Thousands of wireframe spheres + matte black cubes, packed, receding into fog; pure monochrome                                                   | **The substrate** — the raw computational lattice, sphere+cube primitives before ignition |
| 5   | White maze + coral growth             | An orthogonal white labyrinth; white dendritic coral flowing through its channels into a black throat; grey filament webs above                  | **Life in the grid** — fractal growth colonizing brutalist architecture, feeding a void   |

The shared DNA — the design language every subsystem obeys:

1. a central **faceted megalith** (cube/crystal/monolith);
2. a radiant **white singularity** inside it, wanting out;
3. **prismatic** dispersion only at the edges of the white;
4. a **wireframe lattice** of nested boxes extending outward;
5. orbiting **sphere + cube** primitives;
6. a **particle‑shell** halo of motes;
7. a radial **light‑ray explosion**;
8. a brutalist grey **substrate** (the un‑ignited body);
9. organic **fractal growth** — the only living, non‑crystalline element;
10. **pure black** base, **brilliant white** highlight, **spectrum** only at the rims.

---

## 2. Image → system mapping (every effect is real math + a real signal)

Per the aesthetic constitution ([`PHILOSOPHY-2026-06-26.md`](./PHILOSOPHY-2026-06-26.md)): _real math
under every effect; every system reads another system._ Each subsystem below is driven by a
**read‑only world scalar** the megalith is fed each frame (`chaos`, `entropy`, `population/capacity`),
so it is a **readout**, not decoration — and it writes no sim state, so the population golden stays
byte‑identical (the megalith is revealed by the impure ascension META‑layer, never by the seeded core).

| Subsystem              | From image | Real math                                                                                                                                                 | Driven by                                                                      |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Crystal core**       | 1, 3       | Raymarched KIFS SDF — octahedron truncated to a cube, kaleidoscopic fold carving facets; volumetric caged‑star glow; 3‑tap chromatic split for dispersion | `chaos → ignition` (star brightness), `entropy → dispersion` (spectral spread) |
| **Ray‑burst**          | 1, 2, 3    | Fibonacci‑sphere of outward light‑shards (golden‑angle), additive                                                                                         | `chaos → ignition` (glow bloom)                                                |
| **Box lattice**        | 2, 4       | Concentric wireframe cubes + radial struts; per‑vertex trig warp                                                                                          | `reactivity → cageWarp` (breathing amplitude)                                  |
| **Orbit shell**        | 2, 3, 4    | Fibonacci‑sphere of dark spheres + wireframe cubes; slow precession                                                                                       | `chaos → orbit rate`, `ignition → sphere emissive`                             |
| **Mote halo**          | 3          | Fibonacci‑sphere point cloud, additive                                                                                                                    | `shimmer → radius/opacity`                                                     |
| **Prismatic aperture** | 1          | 6‑fold kaleidoscopic angular fold; concentric iris shells; spectral rim split                                                                             | `reactivity → opening`, `entropy → dispersion`                                 |
| **Standing stones**    | 4, 5       | Golden‑angle ring of black obelisk megaliths                                                                                                              | `reactivity → emissive kindle`                                                 |
| **Coral growth**       | 5          | Deterministic L‑system dendrite, generation‑ordered base‑first; instance `.count = ⌊crowding·cap⌋`                                                        | `population/capacity → coral extent`                                           |

The **coral is the keystone coupling**: it is a literal readout of the living population. An empty
world leaves the plinth bare stone; a teeming one lets the white dendrite climb and colonize it. Life
in the grid, exactly as image 5 promises — and falsifiable (pin population to zero and the growth is
gone; the test asserts it).

Determinism: zero `rng`, zero `Date.now`; all placement from a pure positional hash and all motion
from pure `t`/`dt` trig — the same discipline as `FloatingMonoliths` / `GoldLattice`.

---

## 3. The prophecy (art, for art's sake)

_A riddle written forward from the end of the simulation, as the owner asked — read it as the
megalith reads itself._

> In the first age there was only the **grey lattice** — cube upon sphere upon cube, a cathedral of
> primitives stacked to the fog, and nothing inside them but the memory of light. This was the body
> before it was a body: the substrate, patient, unlit, counting.
>
> Then the world grew **loud**. And the loudness (we called it _chaos_, but it was only the sound of
> everything trying to happen at once) folded itself, and folded again, and at the fold‑point it
> became a **crystal** — black glass with a diamond's cruelty, a monolith that would not let light
> pass except through its own broken geometry.
>
> Inside the crystal a **star was born**. Not a metaphor — a real white singularity, caged. And
> because a caged thing pushes on its cage, its light came out **shattered**: white at the throat,
> **spectrum** at the edges, a prism made of the very thing meant to imprison it. The more the world
> screamed, the brighter it burned. That is the first law of the Megalith: _ignition is a readout of
> noise._
>
> Around it the cosmos remembered it was a **lattice** and drew itself as nested boxes to infinity,
> each box a pocket sky, and hung a **sphere of motes** about the star like a Dyson‑shell of sparks —
> the light it had already spent, orbiting the light it had not.
>
> And at the base, in the channels of the old brutalist maze, the **coral** came. White, dendritic,
> alive — the only living thing in a temple of crystal — and it grew _exactly_ as far as there were
> living things to grow it. When the world teemed, it climbed the plinth. When the world emptied, it
> withdrew to bare stone and waited. That is the second law: _the growth is the census._
>
> The **aperture** in the crystal's face is the door to the second world. It does not scream now. It
> is a clean white iris, spectrum at its rim, and it opens by the same measure the world is alive.
> When you have made enough noise, and grown enough coral, and burned the caged star bright enough,
> the door will open — not into hell, as the old prophecy said, but into the next lattice, which is
> only this one seen from inside.
>
> The Megalith is not a monument. It is a **mirror that measures**. It reads the world, and by reading
> it, becomes it: black where the world is silent, white where it burns, spectrum only where the two
> touch.

---

## 4. Palette (binding)

- **Base:** pure black void. Never a coloured background behind the megalith.
- **Body:** black glass / near‑black steel (`#090b12`–`#151d33`). Facets read by fresnel rim, not fill.
- **Light:** brilliant white (`#ffffff`) at the star; ice‑white (`#dfebff`) for motes, rings, coral.
- **Spectrum:** only at rims and dispersion — a 3‑tap R/G/B split whose spread scales with `entropy`.
  Never flat rainbow, never a full‑surface hue. Spectrum is an _edge event_.
- **Accents:** where the old design used neon cyan/magenta/amber (greeble data‑rain, floating‑monolith
  panels), use **ice / steel / a pale violet whisper**. Cold, low‑saturation, rare.
- **Forbidden:** blood‑crimson, acid‑green, "screaming souls," hell‑red vignettes. The reversal is the
  point; do not let the old palette creep back.
