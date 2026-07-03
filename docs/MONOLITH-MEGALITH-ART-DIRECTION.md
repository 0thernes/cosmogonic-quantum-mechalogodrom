<!-- LIVING doc (rewrite in place; never fork a dated copy — see CLAUDE.md "Living docs, no archives"). -->

# The Monolith Megalith — Art Direction

> The engineering contract lives in [`src/sim/monolith-temple.ts`](../src/sim/monolith-temple.ts)
> (class `MonolithTemple`, alias `MonolithMegalith`). This is the **aesthetic + geometric** source of
> truth: what the level‑100 ascension end‑state _is_, the shapes it is built from, and the six
> reference images it is cut from. When the visuals change, rewrite this file — do not fork a snapshot.

---

## 0. The thesis — it is a GEOMETRY, not a colour scheme

The reference images share almost no colour information at all (they are black, white, and silver).
What they share is **structure**. Reading them as "a palette" is the mistake. Read as _engineering_,
they specify a build language with exactly two atomic primitives and a handful of composition rules:

- **Two primitives: the CUBE and the SPHERE.** Every image is made of stacked, nested, or packed cubes
  and spheres (img 2, 3, 4). Not gems, not cones, not cylinders — cube and sphere.
- **The space itself is a cubic WIREFRAME LATTICE** — a voxel grid receding to infinity (img 2, 4).
  The megalith does not sit in empty space; it is embedded in a grid of cells.
- **Recursion / nesting** — cubes inside cubes, holes inside cubes (img 1, 2). The core is a
  **Menger sponge** (a cube recursively carved with cubic cavities), not a smooth solid.
- **A point‑source, and dead‑straight radial FILAMENTS** exploding from it (img 1, 2, 3). Light as
  line segments, not glow blobs.
- **A woven geodesic SHELL** — great‑circle arcs caging a cube inside a sphere (img 3).
- **An orthogonal MAZE** of cubic blocks, colonised by a dendritic GROWTH, feeding a black VOID
  throat with filament webs (img 5).
- **Strict MONOCHROME** — black, white, silver. **Zero hue.** No green. No neon violet. The only
  concession is a razor, near‑symmetric chromatic split at the very edge of the crystal (the prism in
  img 1), kept so faint it reads as white sparkle.

---

## 1. What the six images actually are (geometry)

| #   | Image                        | Geometry (the build)                                                                                                                              |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kaleidoscope crystal, warp   | A recursive faceted **cube** (Menger‑like); a point‑source firing **dead‑straight radial filaments**; internal mirror‑folds; a triangular void    |
| 2   | Cosmic wireframe cube‑city   | An **infinite cubic wireframe lattice** (voxel grid) to the horizon; a central cluster of **star‑filled cubes** + god‑rays; suspended **spheres** |
| 3   | Dark megalith on a black sea | A **cube caged inside a woven geodesic sphere** of filament arcs; internal starburst — cube‑in‑sphere                                             |
| 4   | Grayscale data‑cathedral     | A brutalist **megastructure of packed CUBES + tessellated SPHERES** rising from a floor‑grid, receding into fog                                   |
| 5   | White maze + coral growth    | An **orthogonal maze of cubic blocks**; a **dendritic growth** threading the channels into a **black void throat**; filament webs fanning out     |

---

## 2. Image → system mapping (geometry + real math + a real signal)

Per the aesthetic constitution ([`PHILOSOPHY-2026-06-26.md`](./PHILOSOPHY-2026-06-26.md)): _real math
under every effect; every system reads another system._ Each subsystem is built from the cube/sphere/
lattice vocabulary, and driven by a **read‑only world scalar** (`chaos`, `entropy`,
`population/capacity`) — a readout, not decoration. It writes no sim state (the population golden
stays byte‑identical; the megalith is revealed by the impure ascension META‑layer, never the seeded
core), and draws zero `rng` / `Date.now`.

| Subsystem                | Image | Geometry / real math                                                                                        | Driven by                                     |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Menger core**          | 1,2,4 | Raymarched **Menger sponge** SDF (IQ) — a cube recursively carved with cubic cavities, caging a white point | `chaos→ignition`, `entropy→dispersion` (edge) |
| **Voxel lattice**        | 2     | Nested wireframe **cube shells** + radial struts + an inner **cell‑grid**; per‑vertex trig warp             | `reactivity→cageWarp` (breathing)             |
| **Ray‑burst**            | 1     | ~320 **dead‑straight radial line filaments** (LineSegments) from the core point, additive                   | `chaos→ignition` (glow bloom)                 |
| **Geodesic shell**       | 3     | 16 **great‑circle arcs** woven into a sphere caging the cube — cube‑in‑sphere                               | `shimmer→radius/opacity`                      |
| **Suspended primitives** | 2,4   | Instanced dark **cubes** (axis‑aligned) + tessellated wireframe **spheres** on a Fibonacci shell            | `shimmer→opacity`, `ignition→cube emissive`   |
| **Starfield**            | 2     | ~900 additive **points** seeded through the lattice volume                                                  | `shimmer→twinkle`                             |
| **Maze plinth**          | 5     | Ring of ~24 **axis‑aligned cubic blocks** (BoxGeometry, orthogonal, no tilt)                                | `reactivity→emissive kindle`                  |
| **Void throat**          | 5     | A black **void sphere** + a thin bright **rim** ring + a fan of **filament‑web** lines                      | `shadow→open`, `shimmer→rim/web`              |
| **Coral dendrite**       | 5     | Deterministic dendrite of **tiny cubes** threading the maze toward the void; `count = ⌊crowding·cap⌋`       | `population/capacity → coral extent`          |

The **coral is the keystone coupling**: a literal readout of the living population. Empty world ⇒ bare
maze; teeming world ⇒ the dendrite threads inward toward the void (falsifiable — the test asserts it).

---

## 3. The prophecy (art, for art's sake)

> In the first age there was only the **grid** — a cubic lattice of empty cells, wireframe to the
> horizon, counting nothing. This was the body before the body: the voxel spacetime, patient, unlit.
>
> Then a cell at the centre **folded into itself**, and folded again, cube within cube within cube,
> carving cavities out of its own mass until it was a **Menger crystal** — a solid made mostly of the
> holes in a solid. And in the deepest hole a **point of white** was struck. Because a cube of holes
> cannot hold light, the light came out **in straight lines** — a thousand dead‑straight filaments,
> exploding along the axes of the grid it was born in. That is the first law: _the burst is the shape
> of the cage it escaped._
>
> Around the crystal the old space remembered it was a **sphere** as well as a grid, and wove itself
> from great circles into a **shell** — a cube caught inside a woven sphere, the two Platonic
> intuitions holding each other. Dark **cubes** and gridded **spheres** hung in the lattice cells like
> the unlit cells' dreams of being lit.
>
> At the base, the grid degenerated into a **maze** — orthogonal blocks, channels between them — and
> into the maze came the **growth**: a dendrite, threading the channels, climbing toward the one cell
> at the centre that had become a **void**. The growth grew exactly as far as there were living things
> to grow it. That is the second law: _the growth is the census._
>
> The void is the door to the second world. It is not a light — it is an **absence**, rimmed in white,
> webbed in filament. When the grid has folded enough, and the lines have flown far enough, and the
> coral has reached the centre, the absence opens — into the next lattice, which is only this one seen
> from inside.
>
> The Megalith is not a monument. It is a **grid that measures itself** — cube and sphere and line and
> void, black where it is empty, white where it burns, and no other colour, ever.

---

## 4. Build rules (binding)

- **Primitives:** CUBE (`BoxGeometry`) and SPHERE (`Icosahedron`/`Sphere`) only. No cones, no
  cylinders, no octahedron gems. If a form isn't obviously a cube, a sphere, a line, or a point, it is
  wrong.
- **Lattice first:** the megalith is embedded in a wireframe voxel grid. The grid is structure, not
  background.
- **Recursion:** the core is a Menger sponge (real SDF). Nesting and self‑similarity everywhere.
- **Light is lines and points:** radial filaments (LineSegments) and star‑dust (Points), additive.
  Never a soft glow disc.
- **The portal is a VOID:** a black throat with a thin rim + filament web (img 5), not a glowing
  wormhole.
- **Colour:** strict grayscale. Every material is `r = g = b`. The ONLY near‑colour is a razor,
  near‑symmetric chromatic split on the Menger crystal's edge (physically real prism fire, img 1) —
  kept so subtle it reads white. **Forbidden: green, neon violet/purple, cyan tints, blood‑crimson,
  any saturated hue.** If you see hue in a base material, it is a bug.
