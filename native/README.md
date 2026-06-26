<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Cosmogonic Quantum Mechalogodrom — Native Reliquary (C++ / OpenGL)

A **native C++20 engine** that renders the ornate NHI specimens as a ray-marched
gallery — the C++ + best-frameworks answer to the reference specimen plate, freed
from the browser's ceilings (true offscreen 4K, native loop, screenshot export).

The whole scene is signed-distance-field math in a single fragment shader
([`src/shaders.h`](src/shaders.h)) — no meshes, no textures. Every specimen
(urchin, Ω-ring, ribbed disc, spindle, star, diatom-lattice, pearl) is carved
with fBm filigree and lit with soft shadows, ambient occlusion, amber subsurface
translucency, and thin-film iridescence — all real `f(p, view, time)`.

> This is the sibling of the WebGL app in the repo root. The browser build is the
> instantly-shareable one; this native build is the no-limits one (the path
> [ADR-0006](../docs/adr) reserves for "later" — brought forward here).

## Verified

Built with **MinGW-w64 GCC 16.1** + CMake; rendered live on an **NVIDIA GeForce
RTX 5070 Ti** (`GL_VERSION 3.3.0 NVIDIA`). The offscreen `--shot` path produced
the `plate` and `hero` captures committed alongside the changelog.

## Frameworks

| Concern         | Library                             | How it's wired                          |
| --------------- | ----------------------------------- | --------------------------------------- |
| Windowing       | **GLFW 3.4**                        | FetchContent (auto)                     |
| Math            | **GLM 1.0.1**                       | FetchContent (auto, header-only)        |
| GL loading      | hand-rolled 3.3-core loader         | `src/gl_core.*` (no codegen dependency) |
| Physics (opt.)  | **Jolt Physics 5.2** (shipping-AAA) | `-DCQM_WITH_JOLT=ON`                    |
| Debug HUD (opt) | **Dear ImGui 1.91**                 | `-DCQM_WITH_IMGUI=ON`                   |

## Build

Requires a C++20 compiler, CMake ≥ 3.20, and Git (for FetchContent).

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release      # add -G "MinGW Makefiles" with MinGW
cmake --build build -j
```

The first configure clones GLFW + GLM (one-time). On Windows + MinGW the result
is a self-contained `build/cqm_native.exe` (the GCC runtimes are statically
linked).

`build.ps1` wraps both steps and puts the WinLibs MinGW toolchain on PATH.

## Run

```sh
./build/cqm_native.exe                 # interactive gallery (orbit the plate)
./build/cqm_native.exe --shot=out.bmp  # render one frame offscreen → BMP, exit
./build/cqm_native.exe --shot=hero.bmp --hero --w1920x1080
```

| Input         | Action                                        |
| ------------- | --------------------------------------------- |
| drag / arrows | orbit                                         |
| mouse wheel   | zoom · `W`/`S` dolly                          |
| `H`           | toggle hero specimen ↔ full plate             |
| `SPACE`       | pause the slow turntable                      |
| `P`           | save a **4K** screenshot (`reliquary_4k.bmp`) |
| `F`           | maximise · `ESC` quit                         |

BMP output converts to PNG with `bun ../scripts/bmp2png.ts in.bmp out.png`.

## C++ / TS Boundary (adversarial audit note)

Native C++ (CMake + GLFW/GLM + optional Jolt + handrolled GL) is a **sibling reliquary only**:

- Ray-marched SDF gallery for the 5+ specimen archetypes (no shared runtime state with browser sim).
- Offscreen `--shot` 4K capture + interactive orbit beyond browser caps.
- Optional physics (Jolt) for plate settling demo.
  The authoritative 5-Archon simulation (godform biases, SuperMind think, SuperBody update, quantum/Clifford/HOT/narrative, world drive loop, determinism via Rng) lives exclusively in `src/`. All hot paths enforce preallocated scratch, shared buffers, typed arrays, documented cadences — no per-frame `new`/`push`/`slice` in steady sim (snapshots for UI telemetry are the documented exception on slower cadence). C++ boundary is one-way viz export; no native engine drives creature minds or GOAL5 pantheon. See docs/adr/0007, MODULE-CONTRACTS, PHILOSOPHY (allocation-free hot, provenance).
