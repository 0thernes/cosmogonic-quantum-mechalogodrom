<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0007 — A native C++ engine + live rigid-body physics, alongside the web app

**Status:** Accepted · **Date:** 2026-06-14 · _amends_ ADR-0006 (scopes its "no C++" verdict to the
browser target; adds a second, native delivery target).

## Context

ADR-0006 gave the honest verdict for a **browser-delivered** product: GLSL now, Rust→WASM/WebGPU
later, and "Python/C++ cannot run client-side in the browser — we will not add a C++ toolchain to a
browser app." That remains correct **for the web app**.

The directive then escalated, repeatedly and explicitly: _"You'll be using C++ and the best
frameworks and tools and stacks and libraries… highly complex physics… make it come to life… must be
even better than the images."_ A goal hook judged the web-only GLSL work as not satisfying the C++ +
active-physics mandate. This is a product-scope change, not a contradiction of ADR-0006: the user
wants a **second, native target** where C++ and a real physics engine can run unconstrained.

## Decision

Build a **native C++20 engine** (`native/`) as a first-class second target, sibling to the web app —
not a replacement. The web app stays the instantly-shareable, deterministic, CI-deployed artifact;
the native engine is the no-browser-ceilings one (true offscreen 4K, native loop, real rigid-body
physics, screenshot export).

### Stack (best-in-class, self-provisioning)

| Concern         | Choice                                                               | Rationale                                                         |
| --------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Language        | **C++20**                                                            | The mandated core; modern, fast, RAII.                            |
| Build           | **CMake + FetchContent**                                             | A fresh checkout builds with only a C++20 compiler + CMake + Git. |
| Windowing       | **GLFW 3.4**                                                         | Industry-standard; FetchContent, links Win32/Cocoa/X11.           |
| Math            | **GLM 1.0.1**                                                        | GLSL-style vec/quat/mat; header-only (`GLM_BUILD_LIBRARY OFF`).   |
| GL loading      | hand-rolled 3.3-core loader (`gl_core.*`)                            | X-macro; **no Python/glad codegen step** → reliable build.        |
| Rendering       | **OpenGL 3.3** SDF ray-marcher (one frag shader)                     | Carries far more ornate 4K detail than meshes; no texture assets. |
| Physics         | **built-in impulse rigid-body** (`physics.h`), **active by default** | Guarantees live dynamics with zero external-fetch risk.           |
| Physics (heavy) | **Jolt Physics 5.2** (`-DCQM_WITH_JOLT`)                             | Shipping-AAA (Horizon Forbidden West) backend upgrade.            |
| Debug HUD       | **Dear ImGui 1.91** (`-DCQM_WITH_IMGUI`)                             | Optional in-window inspection.                                    |

### Toolchain provisioning

No compiler existed on the build machine (only CMake — no MSVC/LLVM/MinGW/SDK). We installed
**MinGW-w64 GCC 16.1 (UCRT)** via `winget BrechtSanders.WinLibs.POSIX.UCRT` — self-contained, links a
GL app standalone, statically linked into a portable `cqm_native.exe`. (See [[native-engine-build]]
memory + `../AUDIT-LOG.md` for paths.)

### Physics is ACTIVE, not optional

The earlier "Jolt wired behind a flag" was judged insufficient — physics must be **live**. So the
built-in solver (`native/src/physics.h`) runs **every frame by default** and its transforms ARE what
the ray-marcher draws: each specimen is a rigid body in a harmonic gravity well, integrating linear +
quaternion-angular state, resolving sphere-sphere collisions (restitution + positional correction +
friction-induced spin), confined to a spherical case, damping into a churning cluster. Jolt remains
the opt-in heavyweight backend for fracture/mass/inertia/crowd scale.

## Consequences

- **+** The C++ + active-physics mandate is met with a real, compiling, GPU-running binary — verified
  on an NVIDIA RTX 5070 Ti (a 30-step vs 420-step capture shows collided/clustered arrangements).
- **+** The web app is untouched and still passes its full gate (now 1477 tests).
- **−** Two render codebases to keep in aesthetic sync (the GLSL jewel BRDF is intentionally mirrored
  in both `src/sim/instanced-entities.ts` and `native/src/shaders.h`).
- **−** The native target is not yet in CI (local-build + offscreen-capture verification for now).

## Verification

`cmake --build` → 100% link; `cqm_native.exe --shot=out.bmp --frames=K` renders offscreen to BMP
(`scripts/bmp2png.ts` → PNG for review). Determinism: same integer-hash seed → same dance.

## Update (V18, 2026-06-14) — Jolt is ON by default

Jolt Physics 5.2 now compiles with MinGW GCC 16.1 and **drives the native specimens by default**
(`CQM_WITH_JOLT=ON`). `native/src/physics_jolt.h` is a drop-in backend matching the built-in solver's
interface: each specimen is a real Jolt rigid body (sphere shape, mass/inertia, restitution, damping),
a central harmonic well + soft case spring substitute for Jolt's (absent) radial gravity, and the
broad/narrow-phase solve produces the transforms the ray-marcher draws. Same deterministic shell
seeding as the built-in path; verified on the RTX 5070 Ti (320-frame offscreen shot). The built-in
impulse solver remains the `-DCQM_WITH_JOLT=OFF` fallback (no network fetch). Setup gotchas recorded
for posterity: Jolt needs `Trace`/`AssertFailed` callbacks set (else segfault) and the
allocator registered before any Jolt member allocates (run `globalInit()` as the first member-init).

## Follow-ups (tracked in KANBAN)

**Jolt fracture — SHIPPED (V28).** A hard enough contact shatters the smaller body of the pair into 3
volume-conserving shards (∛⅓ radius → mass conserved at unit density) that burst along the impact
normal with their own Jolt mass/inertia. Closing speed is sampled from **pre-solve** approach
velocities (the post-`Update` readback has the collision already resolved away); the 1.6 u/s gate is
~70% of the measured 2.24 u/s infall peak. Shards <0.42u are inert and growth is capped at 48 (shader
`MAX_BODIES` 24→48). Deterministic (`rqHash`-seeded scatter): 18→24 bodies, identical across runs.

Remaining: soft-body + crowd-scale; bring the native target into CI; render true 4K (3840×2160)
plates from the Jolt sim.
