<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0006 — ASI-grade graphics: the rendering stack, languages, and libraries

**Status:** Accepted · **Date:** 2026-06-13 · supersedes the flat-shaded "1980s feel" baseline.

## Context

The directive: lift the world out of a flat-shaded look into modern, textured, cinematic 3D —
"3D dimensionality with texture, variance, structures, materials, context, depth, emotive lighting
and colouring… build only what an ASI would understand." Reference frames provided: glass-amber
radiolarian organisms, a frost-fractal cosmic web, a biomechanical red-eyed alien (the NHI), a neon
sacred-geometry quantum lattice, and a gold-line architectural void-chamber (depth + environment).

We researched current real-time graphics practice (Three.js docs via Context7) to choose tools
rather than guess.

## What modern WebGL game-graphics actually use (and what we adopt)

| Technique                      | Tool                                                                                                          | Decision                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cinematic glow                 | `EffectComposer` + `UnrealBloomPass` + `OutputPass` (`three/addons/postprocessing`)                           | **Adopt, flag-gated.** Bloom on emissives is the single biggest "no-1980s" lever. Gated behind a quality tier + a `?postfx` flag because it interacts with our non-standard `LinearSRGBColorSpace`/ACES pipeline and must be verified on a real GPU. |
| Image-based reflections        | `PMREMGenerator.fromScene` → `scene.environment`                                                              | **Adopt.** Procedural cosmic env so glass/metal read as wet jewels (the radiolarian look). Conservative `envMapIntensity`.                                                                                                                           |
| Glass / subsurface             | `MeshPhysicalMaterial` (`transmission`, `clearcoat`, `iridescence`, `sheen`) + owned shader fresnel/thin-film | **Partial.** Per-instance PBR isn't representable in our instanced pools, so the glass read is carried by an owned fragment shader (shipped: fresnel rim + thin-film) + pool-wide physical params.                                                   |
| Surface detail / texture       | procedural normal/roughness perturbation in-shader; triplanar noise                                           | **Adopt (shader).** Gives "texture and detail" without texture downloads — fits the no-asset, deterministic ethos.                                                                                                                                   |
| Volumetric depth / environment | fog gradients, parallax cosmic-web backdrop, gold-line architectural grid                                     | **Adopt incrementally** (the void-chamber + cosmic-web references) for "depth and context".                                                                                                                                                          |
| Future compute / fidelity      | WebGPU + **TSL** (Three Shading Language), `realism-effects` (SSGI/SSR/AO)                                    | **Deferred path** — when we move the heaviest fields/10k+ to GPU compute.                                                                                                                                                                            |

## Languages — the honest answer

This is a **browser-delivered WebGL app**: the runtime is JavaScript/TypeScript or **WebAssembly**,
and the _graphics_ language is **GLSL** (and, on the WebGPU path, **WGSL/TSL**). Against that reality:

- **GLSL — the real "game graphics" language.** Already used heavily; expanding it is where the
  visual gains live (fresnel, thin-film, procedural detail, the exotic render modes). No build change.
- **Rust → WASM** — the one _other_ language with genuine upside: a WASM kernel for the 10k-entity
  update loop / reaction-diffusion / physics (cf. Rapier, Rust/WASM). The perf path for the 10k target
  if pure-TS instancing isn't enough. **Considered; deferred** until profiling demands it.
- **WebGPU (WGSL/TSL)** — future compute + post-processing fidelity (Three already ships a WebGPU
  renderer). **Deferred path.**
- **Python / C++ / Go / PHP — cannot run client-side in the browser.** They do **not** help the
  deliverable (only offline tooling/servers, which Bun already covers). We will _not_ add a Python/C++
  toolchain to a browser app — it would break delivery. This is the honest engineering answer to
  "you'll need C++ and Python": for _this_ product, you need GLSL now and Rust/WASM + WebGPU later.

## Libraries considered

Keep `three` as the spine. Add (when verified): `three/addons` postprocessing (bundled with three —
no new dep) for bloom; optionally `postprocessing` (pmndrs) for a richer effect graph. The math/lib
catalog's deferred upgrades (`gpu-io`, `typegpu`, Rapier WASM) remain the GPU-compute/physics path.

## The NHI ("smartest things ever") — graphics + mind

- **Mind (shipped):** a deterministic super-mind (`src/sim/nhi.ts`) — game theory, regret-matching,
  GOAP-ready, memory grudges, a per-NHI alien Markov voice, inherited neural gene. Bit-reproducible.
- **Body (to build):** alien, biomechanical, uncanny (reference 3) — morphing geometry + a dedicated
  shader (subsurface veins, red ocular points, fresnel menace), not a cyan blob.
- **Acts on the world (to wire):** spawns mutated swarms, manipulates factions, perturbs nearby
  behaviour, broadcasts hallucinated utterances — ending "they float and do nothing."

## Verification & CI/CD

The preview's software-GPU is wedged this session, so **logic is verified by `bun test` + the full
gate**, and **visuals are verified on the real GPU via the live deploy** (CI/CD on every push to
`main`). High-risk visual changes ship **flag-gated OFF** until confirmed, then are promoted to
default — so the working public deploy is never regressed blind.
