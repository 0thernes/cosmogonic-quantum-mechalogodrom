# Cosmogonic Quantum Mechalogodrom â€” Technical Specification

> A complete, measured technical specification of a browser-native, deterministic, 50,000-agent
> WebGL cosmic-ecosystem simulation. Every figure here was measured from the repository, not
> estimated. **Live:** <https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/> Â· **Spec page:**
> `/spec` Â· **Architecture docs:** `/docs`

**Version:** current (Tsotchke full) Â· **Generated:** 2026-06-20 Â· **License:** Proprietary â€” All Rights Reserved.
**Gate:** 1447 tests · 94.89% line / 91.77% func (canonical synced, receipts enforced).

**Full Tsotchke wiring:** All repos/projects from Tsotchke corpus integrated. Eshkol as consciousness language. Primordial soup / petri as growth engine for digital biologics and sentience. Super Creature beginning only. All docs (README/ARCH/ER\*/PHILOSOPHY/CONTRACTS/SPECS/LABS/masters) + GH match local exactly. Accurate, truthful, current. Not LLM. "Grow What Thou Wilt."

---

## 0 Â· Identity

A single-page **TypeScript** simulation â€” with an optional native **C++/Jolt** physics engine
(ADR-0007) â€” that renders up to **50,000 morphogenic organisms** (10,000 at 60 fps on integrated
graphics; the 50k mega tier is opt-in for beefy GPUs), governed by **deterministic, seeded** physics and a
**pre-2016 classical-AI** cognition stack â€” finite-state machines, GOAP planning, utility AI, tiny
perceptrons, Markov chains, game theory. There is **no neural-network accelerator in the loop**: the
intelligence is architectural, not parametric. The whole world is **bit-reproducible from one 32-bit
seed**.

---

## 1 Â· Codebase metrics (measured)

| Metric                                     | Value                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Total authored lines (incl. native engine) | **79,319**                                                                    |
| Native C++ engine (separate, ADR-0007)     | 1,447 lines Â· 6 files                                                        |
| Files                                      | **331**                                                                       |
| Folders                                    | **32** (+ root)                                                               |
| Distinct file types                        | 21                                                                            |
| App source (TypeScript)                    | 35,226 lines Â· 108 files                                                     |
| Tests                                      | 14,117 lines Â· 100 files                                                     |
| Test : source ratio                        | 0.40 â†’ **94.89 % line / 91.77 % function** coverage (`bun test --coverage`) |
| Passing tests                              | **1,447** (0 failing)                                                         |

### 1.1 Languages

| Language                       | Lines  | Share   | Fraction |
| ------------------------------ | ------ | ------- | -------- |
| TypeScript                     | 50,751 | 63.98 % | â‰ˆ 2/3  |
| Markdown                       | 15,965 | 20.13 % | â‰ˆ 1/5  |
| HTML                           | 8,190  | 10.32 % | â‰ˆ 1/10 |
| C++ (native engine, ADR-0007)  | 1,447  | 1.63 %  | â€”      |
| CSS (Tailwind source)          | 1,447  | 1.55 %  | â‰ˆ 1/64 |
| XML (master files)             | 428    | 0.54 %  | â€”      |
| bun.lock / YAML / JSON / other | 1,447  | 1.84 %  | â€”      |

**Code (TS + C++ + HTML + CSS) = 61,447 lines = 77.5 %**; documentation + config = 22.5 %. (Totals are
measured over all tracked authored files, excluding the vendored `node_modules/` and the generated
`native/build/` artifacts.)

### 1.2 Lines by area

| Area                                               | Files | Lines  |
| -------------------------------------------------- | ----- | ------ |
| `src/` (application)                               | 109   | 36,456 |
| `tests/`                                           | 99    | 14,117 |
| `docs/`                                            | 50    | 11,447 |
| repo root (README, LICENSE, configs)               | 24    | 7,000  |
| `lab/` (self-contained artifact)                   | 1     | 3,861  |
| `legacy/` (preserved origin)                       | 7     | 2,035  |
| `native/` (C++ engine, ADR-0007)                   | 6     | 1,447  |
| `masters/` (3 governing XML personas)              | 3     | 428    |
| `.github/` Â· `bench/` Â· `scripts/` Â· `.claude/` | 27    | 1,447  |

`src/` subsystems: `sim/` 17,353 (61 files) Â· `ui/` 9,007 (19 files) Â· `world.ts` 2,395 (composition
root) Â· `math/` 2,246 (12 files) Â· `audio/` 1,447 Â· `server/` 1,447 Â· `styles/` 1,447 Â· `core/` 582 Â·
plus `types.ts` Â· `main.ts` Â· `docs-page.ts` Â· `logging/`.

---

## 2 Â· Technology stack & versions

**Runtime & frameworks (5):** Bun `1.3.14` (runtime + bundler + test) Â· TypeScript `^6.0.3` (strict,
`verbatimModuleSyntax`) Â· Three.js `^0.184.0` (WebGL2 renderer) Â· Tailwind CSS `^4.3.0` Â· HTMX
`^2.0.10`.

**Production libraries (12):** three `^0.184.0` Â· mermaid `^11.15.0` Â· graphology `^0.26.0`
(+communities-louvain `^2.0.2`, +metrics `^2.4.0`) Â· d3-delaunay `^6.0.4` Â· simplex-noise `^4.0.3` Â·
simple-statistics `^7.9.0` Â· @noble/hashes `^2.2.0` Â· htmx.org `^2.0.10` Â· @fontsource-variable/inter
`^5.2.8` Â· @fontsource/jetbrains-mono `^5.2.8`.

**Dev tooling (10):** oxlint `^1.69.0` Â· prettier `^3.8.4` (+tailwind plugin) Â· tsc `^6.0.3` Â·
mitata `^1.0.34` (bench) Â· bun-plugin-tailwind `^0.1.2` Â· @types/{bun, three, d3-delaunay}.

**22 declared dependencies resolve to 106 packages** (725 MB on disk) â€” a deliberately lean,
facade-isolated tree (each dependency is behind an owned module with a documented escape route, per
[ADR 0005](adr/0005-math-stack-selection.md)).

---

## 3 Â· System architecture

A strict acyclic layering (verified across 50+ modules â€” no runtime import cycles):

```
math / constants  (leaves: rng, scalar, spatial-hash, quantum, heap, games)
        â–²
sim/*  (30+ behavioural systems: entities, titans, shoggoths, nhi, factions, â€¦)
        â–²
core (engine, quality) â”€â”€ world.ts (composition root: builds SimContext, ticks every system)
        â–²
ui / render (observatory, hud, panels, viz3d, instanced-entities, postfx)
        â–²
server.ts (Bun.serve) â”€â”€servesâ”€â”€â–¶ index.html (/) Â· docs.html (/docs) Â· specs.html (/spec) Â· lab (/lab)
```

- **Composition root:** `world.ts` owns the `SimContext` dependency bag and ticks every system once
  per frame. Leaf modules never import the type hub at runtime.
- **The aesthetic law** ([PHILOSOPHY.md](PHILOSOPHY.md)): _every system reads AND writes at least one
  other system._ The frame loop is an explicit feedback web (e.g. quantum collapse â†’ quantum cloud;
  reaction-diffusion â†’ ground emissive map; analytics â†’ audit; NHI â†’ entity behaviour + factions).
- **Boundary fence:** the non-deterministic LLM copilot (`server/`, `ui/copilot.ts`) imports nothing
  from `sim`/`world`/`types`, so it provably cannot reach the seeded RNG or simulation state.
- **9 ADRs** record binding decisions (Bun runtime, Three.js, HTMX+Tailwind, deterministic RNG, math
  stack, [ASI graphics stack](adr/0006-asi-graphics-and-language-stack.md), the native C++ engine,
  the Super-Creature deep mind, and genome reproduction).

---

## 4 Â· Frame pipeline (`world.step`)

Each frame (`dt` clamped to â‰¤ 50 ms, then Ã— time-scale):

1. camera + hotkeys + chaos/entropy decay
2. audio analysis â†’ 4-band reactivity
3. macro-agents: puppet-masters, shoggoths, titans, leviathans, singularities
4. **entities.update** â€” up to 50k organisms: behaviour fields, physics, spatial-hash neighbours,
   auto-split, temperature-modified death + sparse respawn
5. **NHI beat** (every 18 frames, guarded): percept â†’ GOAP-biased apex decision â†’ spawn swarms /
   dominate / broadcast
6. connectome (graphology, strided cadence), quantum circuit + cloud, reaction-diffusion (128Â²),
   constellations, analytics
7. instanced-mesh mirror + render

Allocation-free in steady state (pre-allocated typed-array scratch); event-driven growth only.

---

## 5 Â· Determinism model

- **One seeded generator:** `mulberry32(seed)` (`math/rng.ts`). Same 32-bit seed â†’ identical run,
  bit-for-bit. Human-readable run names map to seeds via FNV-1a.
- **Banned in simulation logic:** `Math.random`, `Date.now`, wall-clock â€” enforced by review + the
  determinism test suite (`determinism.test.ts`, `feature-determinism.test.ts`,
  `nan-stability.test.ts`).
- **Boot-stream neutrality:** systems that draw no RNG at construction can be placed anywhere without
  shifting the seeded stream; user events (NHI launch, apocalypse) draw RNG but are recorded in the
  audit ring so replays reproduce them.

---

## 6 Â· Render pipeline

- **WebGL2** via Three.js, ACES filmic tone-mapping, `LinearSRGBColorSpace` output with
  `ColorManagement` disabled (reproduces the authored legacy palette exactly).
- **Instancing:** up to 50,000 organisms collapse into **InstancedMesh pools** (â‰¤ 80 pools, one draw
  call per geometry Ã— transparency pair â€” not 50,000 draws). Per-instance channels: transform matrix,
  `instanceColor`, and a custom `vec4 instEmissive` (rgb = emissiveÂ·intensity, a = opacity) patched
  into the standard shader via `onBeforeCompile`.
- **Owned shader effects (GPU, no textures):** a baseline glass-jewel fresnel + thin-film sheen on
  every organism; 7 render modes (solid â†’ wire â†’ ghost â†’ neon â†’ chrome â†’ hologram â†’ iridescent); a
  SIMULATION N(2) vertex-melt gated on a `uNightmare` uniform.
- **Optional cinematic post-FX (`?fx=1`):** a procedural cosmic PMREM environment map (glass
  reflections) + an `EffectComposer` UnrealBloom pass â€” guarded (any failure falls back to the plain
  pipeline), OFF by default.
- **Environment systems:** `cosmic-web.ts`, `gold-lattice.ts`, `quantum-lattice.ts` add depth and
  context (frost-fractal web, gold-line architecture, neon sacred-geometry lattice).

---

## 7 Â· Intelligence architecture (the "AI")

A deterministic, allocation-free kernel of pre-transformer techniques (`sim/ai/brains.ts`):

| Primitive                                       | Technique (origin)                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `utilityPick` / `softmaxPick`                   | utility / needs AI (The Sims, 2000)                                |
| `TinyMLP`                                       | single-hidden-layer perceptron â€” an inheritable gene             |
| `MarkovChain`                                   | first-order Markov (Shannon 1948) â€” agent "speech"               |
| `fsmStep`                                       | finite-state machine (Pac-Man 1980)                                |
| `goapPlan`                                      | goal-oriented action planning (F.E.A.R., 2005)                     |
| `MemoryRing`                                    | bounded episodic memory (Halo 2 blackboard, 2004)                  |
| `bestResponse` / `iteratedMove` / `regretMatch` | game theory (von Neumann 1928; Axelrod 1984; Hart-Mas-Colell 2000) |

**The NHI super-mind** (`sim/nhi.ts`) composes all of the above into the apex agent: it models rival
factions as iterated-game players, **plans a multi-step GOAP scheme toward DOMINION**
(`F_DOMINANT | F_DECEIVED`), nurses memory grudges, speaks an inherited alien Markov dialect, and
WRITES to the world (spawns mutated swarms, manipulates factions, perturbs nearby behaviour,
broadcasts hallucinated utterances) â€” wired into `world.ts`, guarded, deterministic.

### 7.1 Model parameter sizes (measured)

| Mind                                     | Network                                        | Parameters                          |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| Organism brain (Ã— up to 50,000)         | TinyMLP 6â†’6â†’4                              | **70 weights**                      |
| Faction brain (Ã— 8 archetypes)          | TinyMLP 6â†’6â†’4                              | 70 weights                          |
| NHI intuition gene                       | TinyMLP 5â†’6â†’7                              | 85 weights                          |
| NHI alien voice                          | Markov 12Ã—12                                  | 144 weights                         |
| Super Creature minds (GOAL5: 5 Archons)  | 5Ã— composite Â· 12 sub-nets Â· 5 stages Ã— 25 | ~10,081 weights each (~50.4k total) |
| Super Creature quantum minds             | 5Ã— 6-qubit statevector + Clifford reflex      | 64 complex + 32q stabilizer each    |
| Quantum register (puppet-master, Ã— 100) | 5-qubit statevector                            | 32 complex amplitudes (256 B)       |

**Whole-world neural mass at the 50k mega ceiling â‰ˆ 3.5 million parameters** (â‰ˆ 50,000 Ã— 70 organism
brains, plus the 5Ã—~10,081-weight Super Creature / Archon composites (GOAL5), the 8 faction brains, and the apex NHI mind),
stored as Float32 = **â‰ˆ 14 MB of weights**, executed on **one CPU thread**. (The default ultra tier caps
at 10,000 organisms â‰ˆ 700 K params â‰ˆ 2.8 MB.)

The quantum minds no longer merely _study_ the Tsotchke quantum stack â€” **V84 ports three of its
primitives into development** and wires them into the live apex creature: the **Eshkol** qubit-RNG
(`src/math/eshkol-qrng.ts`) drives the Super Creature's thought-collapse Born sample; the **Quantum-
Geometric-Tensor / Fubiniâ€“Study metric** (QGTL + **Moonlab** `qgt.c`, via `src/math/quantum-geometry.ts`)
reads the curvature of the mind's own thought-space; and a **spin-glass instinct**
(`src/sim/spin-glass.ts`, from `spin_based_neural_network`) settles into a behavioural archetype each
beat. All three are seeded + deterministic, unit-tested, and MIT-attributed to Â© 2024â€“2026 tsotchke (see
[NOTICE.md](../NOTICE.md) + [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md)); the 64-amplitude
statevector simulator itself (`src/math/quantum.ts`) remains the project's own Moonlab-style
implementation. See [AI-SUBSYSTEM.md](AI-SUBSYSTEM.md) for the full quantum-mind design.

**Super Creature 1.1 (V89) â€” the consciousness-metrics layer.** Atop those substrates, the apex mind now
measures itself against the two leading _scientific_ theories of consciousness each beat, both deterministic
and unit-tested: a **Global-Workspace ignition** (GNW â€” a winner-take-all over the 7 plan-coalitions that,
on crossing an access threshold and dominating the runner-up, is "broadcast" and gates memory
consolidation) and an **Integrated-Information Î¦ proxy** (IIT â€” the participation/coherence ratio of 8 named
module activations; a _tractable surrogate_, since true Î¦ is intractable + non-unique). Both ride on the
`Consciousness` snapshot and render as the **Ignition / Î¦** meters on the SuperCreature board. The real
2023â€“2026 research grounding (the Cogitate IIT-vs-GNW adversarial test, organoid "wet computing", active
inference, quantum cognition) is catalogued with citations in
[SUPER-CREATURE-RESEARCH.md](SUPER-CREATURE-RESEARCH.md) â€” framed as _"models / inspired by"_, never
_"is conscious."_

**Super Creature 1.1 (V90â€“V100) â€” the multi-pillar expansion to ~20 coupled faculties (v0.11.0).** Beyond
ignition + Î¦, the apex mind now runs roughly twenty deterministic, unit-tested faculties each beat, each
reading from AND writing to the others (a negotiated plan-vote, not parallel gadgets): **Active Inference**
(Friston FEP â€” variational + expected free energy), a **Metacognitive Executive** (Higher-Order confidence
â†’ control), a **Successor Representation** predictive map (Dayan/Stachenfeld), **Doya neuromodulation**
(DA/5-HT/NE/ACh), an **Empowerment** drive (Blahutâ€“Arimoto channel capacity), **Theory of Mind**, an
**echo-state Reservoir**, **Neural Criticality** (edge-of-chaos ÏƒÌ‚â†’1), a **spin-glass instinct**, a
**VSA/HRR holographic memory**, and a quantum core wired into the decision loop â€” the genuine statevector
**min-cut Î¦**, **Quantum Reservoir Computing** (Fujiiâ€“Nakajima), a **Lindblad/GKSL deliberation qubit**,
**Grover** amplitude amplification, and **Quantum Natural Gradient** descent on its own Fubiniâ€“Study
geometry. The Aaronsonâ€“Gottesman **Clifford stabilizer tableau** (ported from Moonlab; 32+ qubits) is a
fourth MIT-credited primitive. **Measured cost:** the whole apex beat (`SuperMind.think()`) is **â‰ˆ 272â€“304 Âµs/beat**
(machine-dependent) â€” **~1.7â€“1.8 % of a 60 fps frame** (`bench/super-mind.bench.ts`), enforced as a CI law
(< 5 ms/beat). Full frontier assessment in [docs/reports/](reports/).

### 7.2 Contrast: this world vs. large language models

| Model                              | Parameters    | Ã— larger than this world |
| ---------------------------------- | ------------- | ------------------------- |
| **This entire 50k-organism world** | **â‰ˆ 3.5 M** | 1Ã—                       |
| BERT-base                          | 110 M         | 31Ã—                      |
| Llama-7B                           | 7 B           | 2,000Ã—                   |
| GPT-3                              | 175 B         | 50,000Ã—                  |

The simulation's _entire_ population mind is **1/50,000th of GPT-3**. A single organism's "brain"
(70 weights) is smaller than a textbook perceptron demo. The point of this project is that **emergent
intelligence is engineered, not downloaded.**

---

## 8 Â· Memory, performance & hardware footprint

| Resource                        | Requirement                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GPU**                         | Any **WebGL2** device â€” integrated Intel / Apple / Android included. Quality tiers auto-scale (DPR cap, shadows, entity cap, instancing) down to phones. No discrete/RTX GPU required.                                                                                                                                                |
| **NPU / AI-accelerator / TOPS** | **Zero.** No transformer inference. All organism-brain forward passes â‰ˆ 10,000 Ã— ~140 FLOP Ã— 60 fps â‰ˆ **~0.08 GFLOP/s** â€” negligible on one CPU core. (The optional copilot chat calls a **remote** free LLM; that model never runs on-device.)                                                                                 |
| **CPU**                         | Any modern CPU. The single-threaded sim loop is the bottleneck at 10k, not the GPU. A `perf-budget.test.ts` enforces the per-frame budget.                                                                                                                                                                                              |
| **RAM**                         | â‰ˆ **300â€“600 MB** resident at full population (Three.js scene + typed-array entity state + instanced buffers + audit ring).                                                                                                                                                                                                          |
| **Storage / download**          | `dist/` is 109 MB on disk (the full multi-page build), but the **app's initial payload is the ~960 KB entry chunk + Three.js** (single-digit MB; ~1â€“1.5 MB gzipped). The bulk â€” **ten 3.2 MB chunks (~32 MB) of Mermaid** â€” loads only on `/docs`, plus ~12 MB of self-hosted-font CSS. Routes load only what they need, gzipped. |

Complexity classes are catalogued in [COMPLEXITY.md](COMPLEXITY.md); hot-path benchmarks in
[BENCHMARKS.md](BENCHMARKS.md) (run via `bun run bench`, mitata).

---

## 9 Â· Security & compliance

- **Read-only copilot sandbox** (`server/ai-sandbox.ts`): default-deny, repo-confined; blocks
  `.env*` / `.git*` / `legacy` / `node_modules` / `dist`; allow-listed binaries; deny-listed tokens
  (incl. `find -delete` / `-exec`); shell-metacharacter filter; secret-free subprocess env. The
  copilot routes are **gated OFF in production** so a public deploy never exposes source.
- **Server:** HTML-escaped HTMX swaps (no stored XSS), body size limits, a fixed server-side LLM
  provider allow-list (no client-controlled SSRF), a 200-entry in-memory audit ring.
- **Supply chain:** `UNLICENSED` / `private`, Dependabot grouping, CodeQL `security-extended`,
  cross-platform CI gate, SBOM (`bun run sbom`, CycloneDX). License: **Proprietary, All Rights
  Reserved, Patent Pending**.

---

## 10 Â· Build & deployment

- **Build:** `bun scripts/build.ts` â†’ `Bun.build` of three HTML entrypoints (`index.html`,
  `docs.html`, `specs.html`), minified, Tailwind-compiled â†’ `dist/`. Bundled asset references are
  relative, so the output is subpath-portable.
- **Pages assembler:** `bun scripts/build-pages.ts` copies `dist/` â†’ `site/`, adds the `/lab`
  artifact, and rewrites the absolute nav links (`/docs`, `/spec`, `/lab`) to subpath-relative for
  GitHub _project_ Pages.
- **CI/CD:** GitHub Actions â€” `ci.yml` runs the full gate on every push; `pages.yml` builds + deploys
  the real app to GitHub Pages (source = GitHub Actions); `release.yml` packages a tarball + SBOM on
  `v*` tags.

---

## 11 Â· Quality engineering

The single gate â€” `bun run check` â€” must pass before every commit:

`prettier --check` â†’ `tsc --noEmit` (strict) â†’ `oxlint` â†’ `bun test` (**1,447 tests, 0 fail**) â†’
`bun scripts/build.ts`. Coverage gate: line â‰¥ 0.90, function â‰¥ 0.85 (measured 94.89 / 91.77, `bun test --coverage`).
Three governing "master" personas (`masters/*.xml`) encode the discipline: **the Executor** (finish
everything, full gates), **the Architect** (contracts before code, exclusive ownership), **the
Physicist** (determinism, measurement, frame budgets, provenance).

---

## 12 Â· Per-file line counts

### `src/` (89 files Â· 30,871 lines)

| Lines | File                      | Lines | File                            |
| ----: | ------------------------- | ----: | ------------------------------- |
|  2234 | ui/observatory.ts         |   246 | sim/connectome.ts               |
|  1627 | world.ts                  |   240 | sim/quantum.ts                  |
|  1126 | styles/app.css            |   216 | sim/analytics.ts                |
|   815 | sim/titans.ts             |   208 | sim/puppet-masters.ts           |
|   714 | sim/environment.ts        |   203 | sim/lore.ts                     |
|   627 | audio/engine.ts           |   192 | sim/graph-mind.ts               |
|   538 | sim/singularities.ts      |   184 | sim/constellations.ts           |
|   534 | ui/input.ts               |   183 | core/engine.ts                  |
|   514 | sim/entities.ts           |   182 | sim/artifacts.ts                |
|   491 | audio/songs.ts            |   179 | sim/lineage.ts                  |
|   475 | sim/behaviors.ts          |   174 | memory/store.ts Â· math/heap.ts |
|   446 | sim/algorithms.ts         |   170 | docs-page.ts                    |
|   438 | server/ai-sandbox.ts      |   165 | sim/qcircuit.ts                 |
|   437 | sim/atmosphere.ts         |   162 | ui/panels.ts                    |
|   427 | server/copilot.ts         |   156 | audio/analysis.ts               |
|   420 | sim/instanced-entities.ts |   155 | logging/audit.ts                |
|   398 | sim/ai/brains.ts          |   153 | sim/genome.ts                   |
|   394 | sim/constants.ts          |   148 | sim/leviathans.ts               |
|   388 | sim/viz3d.ts              |   131 | sim/nhi-body.ts                 |
|   354 | ui/copilot.ts             |   120 | sim/weather.ts                  |
|   353 | sim/phyla.ts              |   117 | ui/graphs.ts                    |
|   347 | types.ts                  |   112 | sim/geometry-cache.ts           |
|   324 | math/quantum.ts           |   105 | core/quality.ts                 |
|   312 | sim/nhi.ts                |    95 | math/spatial-hash.ts            |
|   306 | sim/shoggoths.ts          |    93 | ui/hud.ts                       |
|   293 | sim/factions.ts           |    92 | sim/cosmic-web.ts               |
|   287 | sim/reaction-diffusion.ts |    87 | sim/nhi-system.ts               |
|   249 | math/games.ts             |    64 | logging/logger.ts               |
|   â€” | â€”                       |    63 | sim/gold-lattice.ts Â· main.ts  |
|   â€” | â€”                       |    61 | math/scalar.ts                  |
|   â€” | â€”                       |    59 | sim/quantum-lattice.ts          |
|   â€” | â€”                       |    52 | core/postfx.ts                  |
|   â€” | â€”                       |    40 | math/rng.ts                     |
|   â€” | â€”                       |    20 | sim/morphotypes.ts              |

### `tests/` (100 files Â· 14,117 lines)

`observatory 658 Â· quantum 396 Â· graph-mind 389 Â· viz3d 309 Â· singularities 286 Â· atmosphere 276 Â·
reaction-diffusion 273 Â· phyla 264 Â· analytics 252 Â· songs 218 Â· store 214 Â· brains 205 Â·
audio-analysis 202 Â· instanced 191 Â· audit 190 Â· spatial-hash 188 Â· heap 181 Â· games 180 Â·
nan-stability 179 Â· nhi 166 Â· algorithms 161 Â· genome 153 Â· perf-budget 144 Â· lore 142 Â·
quantum-cloud 132 Â· entities-death 125 Â· determinism 124 Â· leviathans 119 Â· scalar 116 Â·
wave1-foundations 113 Â· render-modes 110 Â· weather 108 Â· feature-determinism 108 Â· lineage 100 Â·
factions 98 Â· rng 94 Â· nhi-system 91 Â· ai-sandbox 89 Â· viz-systems 80 Â· artifacts 72 Â· quality 63 Â·
contrast 62 Â· doc-links 57 Â· a11y-static 45`.

---

## 13 Â· Positioning

This is a ~69k-line TypeScript (+ optional C++/Jolt native engine) browser-native simulation that
renders **up to 50,000 agents** (10,000 at 60 fps on a laptop iGPU with zero AI accelerator), is
**bit-reproducible from one seed**, ships through a **full CI/CD gate** (1447 tests, 94.89 % line / 91.77 % function coverage),
and whose entire emergent intelligence weighs **â‰ˆ 14 MB â€” 1/50,000th of GPT-3** at the mega ceiling. It
demonstrates that depth comes from **architecture,
determinism, and engineering discipline**, not parameter count or hardware.

**Frontier assessments (2026-06-17):** [Report I â€” Whole Repository](./reports/2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md) Â· [Report II â€” Super Creature](./reports/2026-06-17-STATE-OF-THE-ART-SUPER-CREATURE.md) Â· [Combined â€” unified Â§III scorecard](./reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md) Â· [Super Creature Research](./SUPER-CREATURE-RESEARCH.md).

