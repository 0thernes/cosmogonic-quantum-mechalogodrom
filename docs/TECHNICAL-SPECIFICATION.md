<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Cosmogonic Quantum Mechalogodrom — Technical Specification

> A complete, measured technical specification of a browser-native, deterministic, 50,000-agent
> WebGL cosmic-ecosystem simulation. Every figure here was measured from the repository, not
> estimated. **Live:** <https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/> · **Spec page:**
> `/spec` · **Architecture docs:** `/docs`

**Version:** v0.18.0 · **Generated:** 2026-06-26 · **License:** Non-commercial research & play (© 0thernes; study / run / modify / share non-commercially, keep attribution, no for-profit use).
**Gate:** 1,477 tests · 95.03% line / 92.03% func (canonical synced via verify-receipts 2026-06-26, receipts law enforced).  
**NHSI scorecard:** [NHSI-PROGRESS-DASHBOARD.md](./NHSI-PROGRESS-DASHBOARD.md) · **Tsotchke depth:** [TSOTCHKE-INTEGRATION-MAP.md](./TSOTCHKE-INTEGRATION-MAP.md)

**Full Tsotchke wiring:** 20 Tsotchke corpus projects integrated (~16 wired). Eshkol as consciousness language. Primordial soup / petri as growth engine for digital biologics and sentience. 25 Archons (5 individuated apex minds + 20 live light-echo) with brutal god aspects (Valkorion, Thanos, Dark Phoenix, Galactus, Broly, Azathoth, Chaos Gods, Shuma Gorath, Mad Jim Jaspers, Pennywise, Anti-Monitor, Knull, Mr Mxyzptlk, Joker, Zod, Gilgamesh, Alucard, Griffith, EVA-01, Gurren Lagann, Sephiroth, Vergil, Dante, Starkiller, Riddick). Super Creature beginning only. All docs (README/ARCH/ER\*/PHILOSOPHY/CONTRACTS/SPECS/LABS/masters) + GH match local exactly. Accurate, truthful, current. Not LLM. "Grow What Thou Wilt."

---

## 0 · Identity

A single-page **TypeScript** simulation — with an optional native **C++/Jolt** physics engine
(ADR-0007) — that renders up to **50,000 morphogenic organisms** (10,000 at 60 fps on integrated
graphics; the 50k mega tier is opt-in for beefy GPUs), governed by **deterministic, seeded** physics and a
**pre-2016 classical-AI** cognition stack — finite-state machines, GOAP planning, utility AI, tiny
perceptrons, Markov chains, game theory. There is **no neural-network accelerator in the loop**: the
intelligence is architectural, not parametric. The whole world is **bit-reproducible from one 32-bit
seed**.

---

## 1 · Codebase metrics (measured)

| Metric                                     | Value                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Total authored lines (incl. native engine) | **79,319**                                                            |
| Native C++ engine (separate, ADR-0007)     | 1,644 lines · 6 files                                                 |
| Files                                      | **331**                                                               |
| Folders                                    | **32** (+ root)                                                       |
| Distinct file types                        | 21                                                                    |
| App source (TypeScript)                    | 35,226 lines · 108 files                                              |
| Tests                                      | 14,117 lines · 100 files                                              |
| Test : source ratio                        | 0.40 → **95.03% line / 92.03% func** coverage (`bun test --coverage`) |
| Passing tests                              | **1,477** (0 failing)                                                 |

### 1.1 Languages

| Language                       | Lines  | Share   | Fraction |
| ------------------------------ | ------ | ------- | -------- |
| TypeScript                     | 50,751 | 63.98 % | ≈ 2/3    |
| Markdown                       | 15,965 | 20.13 % | ≈ 1/5    |
| HTML                           | 8,190  | 10.32 % | ≈ 1/10   |
| C++ (native engine, ADR-0007)  | 1,644  | 1.63 %  | —        |
| CSS (Tailwind source)          | 1,644  | 1.55 %  | ≈ 1/64   |
| XML (master files)             | 428    | 0.54 %  | —        |
| bun.lock / YAML / JSON / other | 1,644  | 1.84 %  | —        |

**Code (TS + C++ + HTML + CSS) = 61,644 lines = 77.5 %**; documentation + config = 22.5 %. (Totals are
measured over all tracked authored files, excluding the vendored `node_modules/` and the generated
`native/build/` artifacts.)

### 1.2 Lines by area

| Area                                            | Files | Lines  |
| ----------------------------------------------- | ----- | ------ |
| `src/` (application)                            | 109   | 36,456 |
| `tests/`                                        | 99    | 14,117 |
| `docs/`                                         | 50    | 11,644 |
| repo root (README, LICENSE, configs)            | 24    | 7,000  |
| `lab/` (self-contained artifact)                | 1     | 3,861  |
| `legacy/` (preserved origin)                    | 7     | 2,035  |
| `native/` (C++ engine, ADR-0007)                | 6     | 1,644  |
| `masters/` (3 governing XML personas)           | 3     | 428    |
| `.github/` · `bench/` · `scripts/` · `.claude/` | 27    | 1,644  |

`src/` subsystems: `sim/` 17,353 (61 files) · `ui/` 9,007 (19 files) · `world.ts` 2,395 (composition
root) · `math/` 2,246 (12 files) · `audio/` 1,644 · `server/` 1,644 · `styles/` 1,644 · `core/` 582 ·
plus `types.ts` · `main.ts` · `docs-page.ts` · `logging/`.

---

## 2 · Technology stack & versions

**Runtime & frameworks (5):** Bun `1.3.14` (runtime + bundler + test) · TypeScript `^6.0.3` (strict,
`verbatimModuleSyntax`) · Three.js `^0.184.0` (WebGL2 renderer) · Tailwind CSS `^4.3.0` · HTMX
`^2.0.10`.

**Production libraries (12):** three `^0.184.0` · mermaid `^11.15.0` · graphology `^0.26.0`
(+communities-louvain `^2.0.2`, +metrics `^2.4.0`) · d3-delaunay `^6.0.4` · simplex-noise `^4.0.3` ·
simple-statistics `^7.9.0` · @noble/hashes `^2.2.0` · htmx.org `^2.0.10` · @fontsource-variable/inter
`^5.2.8` · @fontsource/jetbrains-mono `^5.2.8`.

**Dev tooling (10):** oxlint `^1.69.0` · prettier `^3.8.4` (+tailwind plugin) · tsc `^6.0.3` ·
mitata `^1.0.34` (bench) · bun-plugin-tailwind `^0.1.2` · @types/{bun, three, d3-delaunay}.

**22 declared dependencies resolve to 106 packages** (725 MB on disk) — a deliberately lean,
facade-isolated tree (each dependency is behind an owned module with a documented escape route, per
[ADR 0005](adr/0005-math-stack-selection.md)).

---

## 3 · System architecture

A strict acyclic layering (verified across 50+ modules — no runtime import cycles):

```
math / constants  (leaves: rng, scalar, spatial-hash, quantum, heap, games)
        ▲
sim/*  (30+ behavioural systems: entities, titans, shoggoths, nhi, factions, ·)
        ▲
core (engine, quality) ── world.ts (composition root: builds SimContext, ticks every system)
        ▲
ui / render (observatory, hud, panels, viz3d, instanced-entities, postfx)
        ▲
server.ts (Bun.serve) ──serves──▶ index.html (/) · docs.html (/docs) · specs.html (/spec) · lab (/lab)
```

- **Composition root:** `world.ts` owns the `SimContext` dependency bag and ticks every system once
  per frame. Leaf modules never import the type hub at runtime.
- **The aesthetic law** ([PHILOSOPHY.md](PHILOSOPHY.md)): _every system reads AND writes at least one
  other system._ The frame loop is an explicit feedback web (e.g. quantum collapse → quantum cloud;
  reaction-diffusion → ground emissive map; analytics → audit; NHI → entity behaviour + factions).
- **Boundary fence:** the non-deterministic LLM copilot (`server/`, `ui/copilot.ts`) imports nothing
  from `sim`/`world`/`types`, so it provably cannot reach the seeded RNG or simulation state.
- **9 ADRs** record binding decisions (Bun runtime, Three.js, HTMX+Tailwind, deterministic RNG, math
  stack, [ASI graphics stack](adr/0006-asi-graphics-and-language-stack.md), the native C++ engine,
  the Super-Creature deep mind, and genome reproduction).

---

## 4 · Frame pipeline (`world.step`)

Each frame (`dt` clamped to ≤ 50 ms, then × time-scale):

1. camera + hotkeys + chaos/entropy decay
2. audio analysis → 4-band reactivity
3. macro-agents: puppet-masters, shoggoths, titans, leviathans, singularities
4. **entities.update** — up to 50k organisms: behaviour fields, physics, spatial-hash neighbours,
   auto-split, temperature-modified death + sparse respawn
5. **NHI beat** (every 18 frames, guarded): percept → GOAP-biased apex decision → spawn swarms /
   dominate / broadcast
6. connectome (graphology, strided cadence), quantum circuit + cloud, reaction-diffusion (128²),
   constellations, analytics
7. instanced-mesh mirror + render

Allocation-free in steady state (pre-allocated typed-array scratch); event-driven growth only.

---

## 5 · Determinism model

- **One seeded generator:** `mulberry32(seed)` (`math/rng.ts`). Same 32-bit seed → identical run,
  bit-for-bit. Human-readable run names map to seeds via FNV-1a.
- **Banned in simulation logic:** `Math.random`, `Date.now`, wall-clock — enforced by review + the
  determinism test suite (`determinism.test.ts`, `feature-determinism.test.ts`,
  `nan-stability.test.ts`).
- **Boot-stream neutrality:** systems that draw no RNG at construction can be placed anywhere without
  shifting the seeded stream; user events (NHI launch, apocalypse) draw RNG but are recorded in the
  audit ring so replays reproduce them.

---

## 6 · Render pipeline

- **WebGL2** via Three.js, ACES filmic tone-mapping, `LinearSRGBColorSpace` output with
  `ColorManagement` disabled (reproduces the authored legacy palette exactly).
- **Instancing:** up to 50,000 organisms collapse into **InstancedMesh pools** (≤ 80 pools, one draw
  call per geometry × transparency pair — not 50,000 draws). Per-instance channels: transform matrix,
  `instanceColor`, and a custom `vec4 instEmissive` (rgb = emissive·intensity, a = opacity) patched
  into the standard shader via `onBeforeCompile`.
- **Owned shader effects (GPU, no textures):** a baseline glass-jewel fresnel + thin-film sheen on
  every organism; 7 render modes (solid → wire → ghost → neon → chrome → hologram → iridescent); a
  SIMULATION N(2) vertex-melt gated on a `uNightmare` uniform.
- **Optional cinematic post-FX (`?fx=1`):** a procedural cosmic PMREM environment map (glass
  reflections) + an `EffectComposer` UnrealBloom pass — guarded (any failure falls back to the plain
  pipeline), OFF by default.
- **Environment systems:** `cosmic-web.ts`, `gold-lattice.ts`, `quantum-lattice.ts` add depth and
  context (frost-fractal web, gold-line architecture, neon sacred-geometry lattice).

---

## 7 · Intelligence architecture (the "AI")

A deterministic, allocation-free kernel of pre-transformer techniques (`sim/ai/brains.ts`):

| Primitive                                       | Technique (origin)                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `utilityPick` / `softmaxPick`                   | utility / needs AI (The Sims, 2000)                                |
| `TinyMLP`                                       | single-hidden-layer perceptron — an inheritable gene               |
| `MarkovChain`                                   | first-order Markov (Shannon 1948) — agent "speech"                 |
| `fsmStep`                                       | finite-state machine (Pac-Man 1980)                                |
| `goapPlan`                                      | goal-oriented action planning (F.E.A.R., 2005)                     |
| `MemoryRing`                                    | bounded episodic memory (Halo 2 blackboard, 2004)                  |
| `bestResponse` / `iteratedMove` / `regretMatch` | game theory (von Neumann 1928; Axelrod 1984; Hart-Mas-Colell 2000) |

**The NHI super-mind** (`sim/nhi.ts`) composes all of the above into the apex agent: it models rival
factions as iterated-game players, **plans a multi-step GOAP scheme toward DOMINION**
(`F_DOMINANT | F_DECEIVED`), nurses memory grudges, speaks an inherited alien Markov dialect, and
WRITES to the world (spawns mutated swarms, manipulates factions, perturbs nearby behaviour,
broadcasts hallucinated utterances) — wired into `world.ts`, guarded, deterministic.

### 7.1 Model parameter sizes (measured)

| Mind                                    | Network                                    | Parameters                          |
| --------------------------------------- | ------------------------------------------ | ----------------------------------- |
| Organism brain (× up to 50,000)         | TinyMLP 6→6→4                              | **70 weights**                      |
| Faction brain (× 8 archetypes)          | TinyMLP 6→6→4                              | 70 weights                          |
| NHI intuition gene                      | TinyMLP 5→6→7                              | 85 weights                          |
| NHI alien voice                         | Markov 12×12                               | 144 weights                         |
| Super Creature minds (GOAL5: 5 Archons) | 5× composite · 12 sub-nets · 5 stages × 25 | ~10,081 weights each (~50.4k total) |
| Super Creature quantum minds            | 5× 6-qubit statevector + Clifford reflex   | 64 complex + 32q stabilizer each    |
| Quantum register (puppet-master, × 100) | 5-qubit statevector                        | 32 complex amplitudes (256 B)       |

**Whole-world neural mass at the 50k mega ceiling ≈ 3.5 million parameters** (≈ 50,000 × 70 organism
brains, plus the 5×~10,081-weight Super Creature / Archon composites (GOAL5), the 8 faction brains, and the apex NHI mind),
stored as Float32 = **≈ 14 MB of weights**, executed on **one CPU thread**. (The default ultra tier caps
at 10,000 organisms ≈ 700 K params ≈ 2.8 MB.)

The quantum minds no longer merely _study_ the Tsotchke quantum stack — **V84 ports three of its
primitives into development** and wires them into the live apex creature: the **Eshkol** qubit-RNG
(`src/math/eshkol-qrng.ts`) drives the Super Creature's thought-collapse Born sample; the **Quantum-
Geometric-Tensor / Fubini–Study metric** (QGTL + **Moonlab** `qgt.c`, via `src/math/quantum-geometry.ts`)
reads the curvature of the mind's own thought-space; and a **spin-glass instinct**
(`src/sim/spin-glass.ts`, from `spin_based_neural_network`) settles into a behavioural archetype each
beat. All three are seeded + deterministic, unit-tested, and MIT-attributed to © 2024–2026 tsotchke (see
[NOTICE.md](../NOTICE.md) + [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md)); the 64-amplitude
statevector simulator itself (`src/math/quantum.ts`) remains the project's own Moonlab-style
implementation. See [AI-SUBSYSTEM.md](AI-SUBSYSTEM.md) for the full quantum-mind design.

**Super Creature 1.1 (V89) — the consciousness-metrics layer.** Atop those substrates, the apex mind now
measures itself against the two leading _scientific_ theories of consciousness each beat, both deterministic
and unit-tested: a **Global-Workspace ignition** (GNW — a winner-take-all over the 7 plan-coalitions that,
on crossing an access threshold and dominating the runner-up, is "broadcast" and gates memory
consolidation) and an **Integrated-Information Φ proxy** (IIT — the participation/coherence ratio of 8 named
module activations; a _tractable surrogate_, since true Φ is intractable + non-unique). Both ride on the
`Consciousness` snapshot and render as the **Ignition / Φ** meters on the SuperCreature board. The real
2023–2026 research grounding (the Cogitate IIT-vs-GNW adversarial test, organoid "wet computing", active
inference, quantum cognition) is catalogued with citations in
[SUPER-CREATURE-RESEARCH.md](SUPER-CREATURE-RESEARCH.md) — framed as _"models / inspired by"_, never
_"is conscious."_

**Super Creature 1.1 — the multi-pillar expansion to ~20 coupled faculties.** Beyond
ignition + Φ, the apex mind now runs roughly twenty deterministic, unit-tested faculties each beat, each
reading from AND writing to the others (a negotiated plan-vote, not parallel gadgets): **Active Inference**
(Friston FEP — variational + expected free energy), a **Metacognitive Executive** (Higher-Order confidence
→ control), a **Successor Representation** predictive map (Dayan/Stachenfeld), **Doya neuromodulation**
(DA/5-HT/NE/ACh), an **Empowerment** drive (Blahut–Arimoto channel capacity), **Theory of Mind**, an
**echo-state Reservoir**, **Neural Criticality** (edge-of-chaos σ̂→1), a **spin-glass instinct**, a
**VSA/HRR holographic memory**, and a quantum core wired into the decision loop — the genuine statevector
**min-cut Φ**, **Quantum Reservoir Computing** (Fujii–Nakajima), a **Lindblad/GKSL deliberation qubit**,
**Grover** amplitude amplification, and **Quantum Natural Gradient** descent on its own Fubini–Study
geometry. The Aaronson–Gottesman **Clifford stabilizer tableau** (ported from Moonlab; 32+ qubits) is a
fourth MIT-credited primitive. **Current measured cost (2026-06-26):** `SuperMind.think()` is **3.34 ms**
in the full bench suite and **8.85 ms** in the focused SuperMind bench; the old sub-millisecond figures are
superseded. Full frontier assessment in [docs/reports/](reports/) and current numbers in
[BENCHMARKS.md](BENCHMARKS.md).

### 7.2 Contrast: this world vs. large language models

| Model                              | Parameters  | × larger than this world |
| ---------------------------------- | ----------- | ------------------------ |
| **This entire 50k-organism world** | **≈ 3.5 M** | 1×                       |
| BERT-base                          | 110 M       | 31×                      |
| Llama-7B                           | 7 B         | 2,000×                   |
| GPT-3                              | 175 B       | 50,000×                  |

The simulation's _entire_ population mind is **1/50,000th of GPT-3**. A single organism's "brain"
(70 weights) is smaller than a textbook perceptron demo. The point of this project is that **emergent
intelligence is engineered, not downloaded.**

---

## 8 · Memory, performance & hardware footprint

| Resource                        | Requirement                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GPU**                         | Any **WebGL2** device — integrated Intel / Apple / Android included. Quality tiers auto-scale (DPR cap, shadows, entity cap, instancing) down to phones. No discrete/RTX GPU required.                                                                                                                                            |
| **NPU / AI-accelerator / TOPS** | **Zero.** No transformer inference. All organism-brain forward passes ≈ 10,000 × ~140 FLOP × 60 fps ≈ **~0.08 GFLOP/s** — negligible on one CPU core. (The optional copilot chat calls a **remote** free LLM; that model never runs on-device.)                                                                                   |
| **CPU**                         | Any modern CPU. The single-threaded sim loop is the bottleneck at 10k, not the GPU. A `perf-budget.test.ts` enforces the per-frame budget.                                                                                                                                                                                        |
| **RAM**                         | ≈ **300–600 MB** resident at full population (Three.js scene + typed-array entity state + instanced buffers + audit ring).                                                                                                                                                                                                        |
| **Storage / download**          | `dist/` is 109 MB on disk (the full multi-page build), but the **app's initial payload is the ~960 KB entry chunk + Three.js** (single-digit MB; ~1–1.5 MB gzipped). The bulk — **ten 3.2 MB chunks (~32 MB) of Mermaid** — loads only on `/docs`, plus ~12 MB of self-hosted-font CSS. Routes load only what they need, gzipped. |

Complexity classes are catalogued in [COMPLEXITY.md](COMPLEXITY.md); hot-path benchmarks in
[BENCHMARKS.md](BENCHMARKS.md) (run via `bun run bench`, mitata).

---

## 9 · Security & compliance

- **Read-only copilot sandbox** (`server/ai-sandbox.ts`): default-deny, repo-confined; blocks
  `.env*` / `.git*` / `legacy` / `node_modules` / `dist`; allow-listed binaries; deny-listed tokens
  (incl. `find -delete` / `-exec`); shell-metacharacter filter; secret-free subprocess env. The
  copilot routes are **gated OFF in production** so a public deploy never exposes source.
- **Server:** HTML-escaped HTMX swaps (no stored XSS), body size limits, a fixed server-side LLM
  provider allow-list (no client-controlled SSRF), a 200-entry in-memory audit ring.
- **Supply chain:** `UNLICENSED` / `private`, Dependabot grouping, CodeQL `security-extended`,
  cross-platform CI gate, SBOM (`bun run sbom`, CycloneDX). License: **Non-commercial research & play
  (© 0thernes, patent-pending, commercial rights reserved); study / run / modify / share non-commercially with attribution, no for-profit use**.

---

## 10 · Build & deployment

- **Build:** `bun scripts/build.ts` → `Bun.build` of three HTML entrypoints (`index.html`,
  `docs.html`, `specs.html`), minified, Tailwind-compiled → `dist/`. Bundled asset references are
  relative, so the output is subpath-portable.
- **Pages assembler:** `bun scripts/build-pages.ts` copies `dist/` → `site/`, adds the `/lab`
  artifact, and rewrites the absolute nav links (`/docs`, `/spec`, `/lab`) to subpath-relative for
  GitHub _project_ Pages.
- **CI/CD:** GitHub Actions — `ci.yml` runs the full gate on every push; `pages.yml` builds + deploys
  the real app to GitHub Pages (source = GitHub Actions); `release.yml` packages a tarball + SBOM on
  `v*` tags.

---

## 11 · Quality engineering

The single gate — `bun run check` — must pass before every commit:

`prettier --check` → `tsc --noEmit` (strict) → `oxlint` → `bun test` (**1,477 tests, 0 fail**) →
`bun scripts/build.ts`. Coverage gate: line ≥ 0.90, function ≥ 0.85 (measured 95.03% line / 92.03% func, `bun test --coverage`).
Three governing "master" personas (`masters/*.xml`) encode the discipline: **the Executor** (finish
everything, full gates), **the Architect** (contracts before code, exclusive ownership), **the
Physicist** (determinism, measurement, frame budgets, provenance).

---

## 12 · Per-file line counts

### `src/` (89 files · 30,871 lines)

| Lines | File                      | Lines | File                           |
| ----: | ------------------------- | ----: | ------------------------------ |
|  2234 | ui/observatory.ts         |   246 | sim/connectome.ts              |
|  1656 | world.ts                  |   240 | sim/quantum.ts                 |
|  1126 | styles/app.css            |   216 | sim/analytics.ts               |
|   815 | sim/titans.ts             |   208 | sim/puppet-masters.ts          |
|   714 | sim/environment.ts        |   203 | sim/lore.ts                    |
|   627 | audio/engine.ts           |   192 | sim/graph-mind.ts              |
|   538 | sim/singularities.ts      |   184 | sim/constellations.ts          |
|   534 | ui/input.ts               |   183 | core/engine.ts                 |
|   514 | sim/entities.ts           |   182 | sim/artifacts.ts               |
|   491 | audio/songs.ts            |   179 | sim/lineage.ts                 |
|   475 | sim/behaviors.ts          |   174 | memory/store.ts · math/heap.ts |
|   446 | sim/algorithms.ts         |   170 | docs-page.ts                   |
|   438 | server/ai-sandbox.ts      |   165 | sim/qcircuit.ts                |
|   437 | sim/atmosphere.ts         |   162 | ui/panels.ts                   |
|   427 | server/copilot.ts         |   156 | audio/analysis.ts              |
|   420 | sim/instanced-entities.ts |   155 | logging/audit.ts               |
|   398 | sim/ai/brains.ts          |   153 | sim/genome.ts                  |
|   394 | sim/constants.ts          |   148 | sim/leviathans.ts              |
|   388 | sim/viz3d.ts              |   131 | sim/nhi-body.ts                |
|   354 | ui/copilot.ts             |   120 | sim/weather.ts                 |
|   353 | sim/phyla.ts              |   117 | ui/graphs.ts                   |
|   347 | types.ts                  |   112 | sim/geometry-cache.ts          |
|   324 | math/quantum.ts           |   105 | core/quality.ts                |
|   312 | sim/nhi.ts                |    95 | math/spatial-hash.ts           |
|   306 | sim/shoggoths.ts          |    93 | ui/hud.ts                      |
|   293 | sim/factions.ts           |    92 | sim/cosmic-web.ts              |
|   287 | sim/reaction-diffusion.ts |    87 | sim/nhi-system.ts              |
|   249 | math/games.ts             |    64 | logging/logger.ts              |
|     — | —                         |    63 | sim/gold-lattice.ts · main.ts  |
|     — | —                         |    61 | math/scalar.ts                 |
|     — | —                         |    59 | sim/quantum-lattice.ts         |
|     — | —                         |    52 | core/postfx.ts                 |
|     — | —                         |    40 | math/rng.ts                    |
|     — | —                         |    20 | sim/morphotypes.ts             |

### `tests/` (100 files · 14,117 lines)

`observatory 658 · quantum 396 · graph-mind 389 · viz3d 309 · singularities 286 · atmosphere 276 ·
reaction-diffusion 273 · phyla 264 · analytics 252 · songs 218 · store 214 · brains 205 ·
audio-analysis 202 · instanced 191 · audit 190 · spatial-hash 188 · heap 181 · games 180 ·
nan-stability 179 · nhi 166 · algorithms 161 · genome 153 · perf-budget 144 · lore 142 ·
quantum-cloud 132 · entities-death 125 · determinism 124 · leviathans 119 · scalar 116 ·
wave1-foundations 113 · render-modes 110 · weather 108 · feature-determinism 108 · lineage 100 ·
factions 98 · rng 94 · nhi-system 91 · ai-sandbox 89 · viz-systems 80 · artifacts 72 · quality 63 ·
contrast 62 · doc-links 57 · a11y-static 45`.

---

## 13 · Positioning

This is a ~69k-line TypeScript (+ optional C++/Jolt native engine) browser-native simulation that
renders **up to 50,000 agents** (10,000 at 60 fps on a laptop iGPU with zero AI accelerator), is
**bit-reproducible from one seed**, ships through a **full CI/CD gate** (1,477 tests, 95.03% line / 92.03% func coverage),
and whose entire emergent intelligence weighs **≈ 14 MB — 1/50,000th of GPT-3** at the mega ceiling. It
demonstrates that depth comes from **architecture,
determinism, and engineering discipline**, not parameter count or hardware.

**Frontier assessment (2026-06-17):** [State of the Art — Combined (whole repository + Super Creature)](./reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md) · [Super Creature Research](./SUPER-CREATURE-RESEARCH.md).
