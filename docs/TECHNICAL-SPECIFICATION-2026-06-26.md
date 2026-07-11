<!-- reviewed: 2026-07-10 | operational organism intelligence | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Cosmogonic Quantum Mechalogodrom — Technical Specification

> **Current intelligence contract (2026-07-10):** `TsotchkeOrganismIntelligence` is one shared,
> bounded-cadence field feeding living-system consumers through a stable signal object. The external
> ledger is `22` repositories (`8 deep`, `7 wired`, `2 harvest`, `4 fenced`, `1 meta`; `17/21`
> non-meta integrated). The current V3 fixed-family evaluation passed goal-only and
> corpus-conditioned synthetic-goal effects, per-row causality, exclusion inertness, numerical safety,
> `6.1213%` reversal adaptation, three-process performance stability, and every named consumer
> counterfactual. Uniform random-action baseline separation and aggregate-mapping specificity failed. No additional numeric
> capability, consciousness, or sentience uplift is authorized.
> [Receipt and limits.](./reports/2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md)

> A complete, measured technical specification of a browser-native, deterministic, 50,000-agent
> WebGL cosmic-ecosystem simulation. Every figure here was measured from the repository, not
> estimated. **Live:** <https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/> · **Spec page:**
> `/spec` · **Architecture docs:** `/docs`

**Version:** v0.21.13 · **Generated:** 2026-06-26 · **License:** Non-commercial research & play (© 0thernes; study / run / modify / share non-commercially, keep attribution, no for-profit use).
**Gate:** 2,530 tests · 84.64% line / 82.21% func (canonical synced via verify-receipts 2026-06-26, receipts law enforced).
**NHSI scorecard:** [NHSI-PROGRESS-DASHBOARD-2026-06-26.md](./NHSI-PROGRESS-DASHBOARD-2026-06-26.md) · **Tsotchke depth:** [TSOTCHKE-INTEGRATION-MAP-2026-06-26.md](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md)

**Tsotchke depth ledger:** 22 external repositories are accounted for as `8 deep`, `7 wired`,
`2 harvest`, `4 fenced`, and `1 meta`, with `17/21` non-meta repositories integrated. The internal
`classical-contrast` control is operational but outside that count. Eshkol is represented by bounded
ports and an order-0-through-8 Float64 Taylor analogue pinned to v1.3.2; the QRNG path is a deterministic
classical statevector adaptation pinned to v3.0.1, not physical entropy or a CSPRNG. Primordial soup/petri
is a growth engine for computational digital biologics and indicators, not evidence of sentience.

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

These figures are **measured, not pinned** — line counts move every commit, so they are a dated
snapshot rather than a gate-enforced receipt. Refresh them with `bun run metrics`
([`scripts/codebase-metrics.ts`](../scripts/codebase-metrics.ts), deterministic over `git ls-files`).
Snapshot: **2026-07-11**. (Coverage + passing-test counts ARE SSOT-synced — see §1's last two rows.)

| Metric                                  | Value                                                                 |
| --------------------------------------- | --------------------------------------------------------------------- |
| Total tracked authored files            | **790**                                                               |
| Total tracked authored lines            | **213,740**                                                           |
| App source (`src/`)                     | 102,468 lines · 299 files                                             |
| Tests (`tests/`)                        | 39,202 lines · 281 files                                              |
| Native C++ engine (`native/`, ADR-0007) | 1,835 lines · 12 files                                                |
| Test : source ratio                     | 0.38 → **84.64% line / 82.21% func** coverage (`bun test --coverage`) |
| Passing tests                           | **2,521** (exact tracked suite; 0 failing)                            |

(Excludes the vendored `node_modules/`, generated `dist/` · `coverage/` · `native/build/`, and nested
`.claude/worktrees/` checkouts.)

### 1.1 By file type

| Type                | Files | Lines   | Share   |
| ------------------- | ----- | ------- | ------- |
| TypeScript          | 627   | 148,177 | 69.33 % |
| Markdown            | 72    | 21,666  | 10.15 % |
| HTML                | 10    | 14,724  | 6.90 %  |
| JSON                | 16    | 11,192  | 5.24 %  |
| PNG (shots)         | 4     | 9,552   | 4.47 %  |
| CSS (Tailwind)      | 2     | 2,476   | 1.16 %  |
| C/C++ hdr+impl      | 8     | 1,527   | 0.72 %  |
| CSV                 | 4     | 844     | 0.40 %  |
| XML (masters)       | 4     | 707     | 0.33 %  |
| YAML · lock · other | 43    | ~2,799  | ~1.3 %  |

**Code (TS + C++ + HTML + CSS) ≈ 166,759 lines ≈ 78.1 %**; documentation + config + assets ≈ 21.9 %.

### 1.2 Lines by area

| Area                                  | Files | Lines   |
| ------------------------------------- | ----- | ------- |
| `src/` (application)                  | 299   | 102,468 |
| `tests/`                              | 281   | 39,202  |
| `docs/`                               | 81    | 23,064  |
| `lab/` (self-contained artifact)      | 5     | 13,311  |
| repo root (README, LICENSE, configs)  | 27    | 11,781  |
| `output/` (tracked visual receipts)   | 3     | 9,551   |
| `scripts/`                            | 33    | 7,331   |
| `legacy/` (preserved origin)          | 6     | 2,072   |
| `native/` (C++ engine, ADR-0007)      | 12    | 1,835   |
| `bench/`                              | 16    | 1,260   |
| `.github/`                            | 12    | 1,018   |
| `masters/` (3 governing XML personas) | 3     | 477     |
| `.memory/`                            | 5     | 167     |
| `.vscode/`                            | 3     | 94      |
| `.githooks/`                          | 2     | 93      |
| `.claude/`                            | 1     | 11      |
| `public/`                             | 1     | 1       |

Detailed `src/` subsystem counts are intentionally generated on demand by `bun run metrics`; this
section records only the current high-level measured areas to avoid stale hand-maintained internals.

---

## 2 · Technology stack & versions

**Runtime & frameworks (5):** Bun `1.3.14` (runtime + bundler + test) · TypeScript `7.0.2` (strict,
`verbatimModuleSyntax`) · Three.js `0.185.1` (WebGL2 renderer) · Tailwind CSS `^4.3.2` · HTMX
`^2.0.10`.

**Production libraries (12):** three `0.185.1` · mermaid `^11.16.0` · graphology `^0.26.0`
(+communities-louvain `^2.0.2`, +metrics `^2.4.0`) · d3-delaunay `^6.0.4` · simplex-noise `^4.0.3` ·
simple-statistics `^7.9.3` · @noble/hashes `^2.2.0` · htmx.org `^2.0.10` · @fontsource-variable/inter
`^5.2.8` · @fontsource/jetbrains-mono `^5.2.8`.

**Dev tooling (10):** oxlint `^1.73.0` · prettier `^3.9.5` (+tailwind plugin `^0.8.0`) · tsc `7.0.2` ·
mitata `^1.0.34` (bench) · bun-plugin-tailwind `^0.1.2` · @types/{bun, three, d3-delaunay}.

**22 declared dependencies resolve to 153 CycloneDX components** in the current frozen install graph —
a facade-isolated tree with explicit runtime/development scopes and dependency references (see
[ADR 0005](adr/0005-math-stack-selection-2026-06-26.md)).

---

## 3 · System architecture

A strict acyclic layering (verified across 50+ modules — no runtime import cycles):

```text
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
- **The aesthetic law** ([PHILOSOPHY-2026-06-26.md](PHILOSOPHY-2026-06-26.md)): _every system reads AND writes at least one
  other system._ The frame loop is an explicit feedback web (e.g. quantum collapse → quantum cloud;
  reaction-diffusion → ground emissive map; analytics → audit; NHI → entity behaviour + factions).
- **Boundary fence:** the non-deterministic LLM copilot (`server/`, `ui/copilot.ts`) imports nothing
  from `sim`/`world`/`types`, so it provably cannot reach the seeded RNG or simulation state.
- **Center HUD readability:** `ui/center-hud.ts` owns one tall shared center slot
  (`clamp(300px, 56vh, 660px)` desktop; `clamp(320px, 64vh, 720px)` touch). The
  Architecture panel uses a responsive canvas/data body and resizes its backing canvas to the actual
  CSS box, so it no longer collapses into a thin visualization strip.
- **9 ADRs** record binding decisions (Bun runtime, Three.js, HTMX+Tailwind, deterministic RNG, math
  stack, [ASI graphics stack](adr/0006-asi-graphics-and-language-stack-2026-06-26.md), the native C++ engine,
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
  every organism; 10 render modes (solid → wire → ghost → neon → chrome → hologram → iridescent →
  plasma → obsidian → prismatic); a
  SIMULATION N(2) vertex-melt gated on a `uNightmare` uniform.
- **Optional cinematic post-FX (`?fx=1`):** a procedural cosmic PMREM environment map (glass
  reflections) + an `EffectComposer` UnrealBloom pass — guarded (any failure falls back to the plain
  pipeline), OFF by default.
- **Environment systems:** `cosmic-web.ts`, `gold-lattice.ts`, `quantum-lattice.ts` add depth and
  context (frost-fractal web, gold-line architecture, neon sacred-geometry lattice).
- **Ascension temple:** `monolith-temple.ts` is now a deterministic reactive abomination, not a
  static arch: black-hole shadow core, singularity ring, warped impossible line cage, jagged altar
  spikes, portal rings, and a halo. It reads chaos, entropy, and population/capacity crowding through
  `setEnvironment()` and exposes a finite `snapshot()` for tests; it draws no RNG and writes no sim
  state.
- **Central spectacle systems:** `mechalogodrom.ts` renders 10 additional bipolar titan-variant
  shells that converge into a central shadow-core / event-horizon / warped-mesh hybrid;
  `alphabet-pantheon-render.ts` renders all 100 Greek+Latin alphabet archetypes as five instanced
  dome-body pools. Both are boot-stream-neutral visual projections: no RNG draws, no simulation-state
  writes, chaos read only.

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

| Mind                                              | Network                                    | Parameters                          |
| ------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| Organism brain (× up to 50,000)                   | TinyMLP 6→6→4                              | **70 weights**                      |
| Faction brain (× 8 archetypes)                    | TinyMLP 6→6→4                              | 70 weights                          |
| NHI intuition gene                                | TinyMLP 5→6→7                              | 85 weights                          |
| NHI alien voice                                   | Markov 12×12                               | 144 weights                         |
| Super Creature minds (GOAL5: 5 Archons)           | 5× composite · 12 sub-nets · 5 stages × 25 | ~10,081 weights each (~50.4k total) |
| Super Creature quantum minds                      | 5× 6-qubit statevector + Clifford reflex   | 64 complex + 16q stabilizer each    |
| Quantum register (1 shared, puppet-master-driven) | 5-qubit statevector                        | 32 complex amplitudes (256 B)       |

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
implementation. See [AI-SUBSYSTEM-2026-06-26.md](AI-SUBSYSTEM-2026-06-26.md) for the full quantum-mind design.

**Super Creature 1.1 (V89) — the consciousness-metrics layer.** Atop those substrates, the apex mind now
measures itself against the two leading _scientific_ theories of consciousness each beat, both deterministic
and unit-tested: a **Global-Workspace ignition** (GNW — a winner-take-all over the 7 plan-coalitions that,
on crossing an access threshold and dominating the runner-up, is "broadcast" and gates memory
consolidation) and an **Integrated-Information Φ proxy** (IIT — the participation/coherence ratio of 8 named
module activations; a _tractable surrogate_, since true Φ is intractable + non-unique). Both ride on the
`Consciousness` snapshot and render as the **Ignition / Φ** meters on the SuperCreature board. The real
2023–2026 research grounding (the Cogitate IIT-vs-GNW adversarial test, organoid "wet computing", active
inference, quantum cognition) is catalogued with citations in
[SUPER-CREATURE-RESEARCH-2026-06-26.md](SUPER-CREATURE-RESEARCH-2026-06-26.md) — framed as _"models / inspired by"_, never
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
geometry. The Aaronson–Gottesman **Clifford stabilizer tableau** (ported from Moonlab; 16 qubits) is a
fourth MIT-credited primitive. **Current measured cost (2026-06-26):** `SuperMind.think()` is **1.99 ms**
in the full bench suite and **9.77 ms** for the 5× `think()` batch; the old sub-millisecond figures are
superseded. Full frontier assessment in [docs/reports/](reports/) and current numbers in
[BENCHMARKS-2026-06-26.md](BENCHMARKS-2026-06-26.md).

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
| **CPU**                         | Any modern CPU. The main simulation loop is primarily single-threaded, with bounded Web Worker offload for wilderness physics; the CPU remains the measured 10k bottleneck. A `perf-budget.test.ts` enforces the per-frame budget.                                                                                                |
| **RAM**                         | ≈ **300–600 MB** resident at full population (Three.js scene + typed-array entity state + instanced buffers + audit ring).                                                                                                                                                                                                        |
| **Storage / download**          | `dist/` is 109 MB on disk (the full multi-page build), but the **app's initial payload is the ~960 KB entry chunk + Three.js** (single-digit MB; ~1–1.5 MB gzipped). The bulk — **ten 3.2 MB chunks (~32 MB) of Mermaid** — loads only on `/docs`, plus ~12 MB of self-hosted-font CSS. Routes load only what they need, gzipped. |

Complexity classes are catalogued in [COMPLEXITY-2026-06-26.md](COMPLEXITY-2026-06-26.md); hot-path benchmarks in
[BENCHMARKS-2026-06-26.md](BENCHMARKS-2026-06-26.md) (run via `bun run bench`, mitata).

---

## 9 · Security & compliance

- **Read-only copilot sandbox** (`server/ai-sandbox.ts`): default-deny, repo-confined; blocks
  `.env*` / `.git*` / `legacy` / `node_modules` / `dist`; allow-listed binaries; deny-listed tokens
  (incl. `find -delete` / `-exec`); Git diff requires confined literal paths after `--` and rejects
  repository root, revisions, pathspec magic, and globs;
  shell-metacharacter filter; secret-free subprocess env; turn cancellation is threaded through
  Git-grep walks. The
  copilot routes are **OFF by default in every environment** and require explicit `COPILOT_ENABLED=1`.
- **Server:** HTML-escaped HTMX swaps (no stored XSS), body size limits, a fixed server-side LLM
  provider allow-list (no client-controlled SSRF), a 200-entry in-memory audit ring.
- **Supply chain:** private package under the repository's custom non-commercial license; automated
  Dependabot PRs disabled by binding policy; push-diff dependency review, full-tree audit, CodeQL
  `security-extended`, cross-platform CI, CycloneDX SBOM, checksums, and release provenance. License: **Non-commercial research & play
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

`prettier --check` → `tsc --noEmit` (strict) → `oxlint` → `bun test` (**2,530 tests, 0 fail**) →
`bun scripts/build.ts`. Receipt regression guard: coverage must stay within the `verify:receipts` tolerance from the canonical **84.64% line / 82.21% func** floor; local Windows receipt runs may measure higher.
Three governing "master" personas (`masters/*.xml`) encode the discipline: **the Executor** (finish
everything, full gates), **the Architect** (contracts before code, exclusive ownership), **the
Physicist** (determinism, measurement, frame budgets, provenance).

---

## 12 · Per-file line counts

A full per-file roster is generated, not hand-kept — run `bun run metrics`
([`scripts/codebase-metrics.ts`](../scripts/codebase-metrics.ts)) for the current per-area / per-type
breakdown, or `bun run filemap` for the file tree. Below is the **2026-07-11** measured snapshot of the
heaviest files (where the weight sits); refresh it with the same commands when source lines move.

### `src/` — heaviest files (299 files · 102,468 lines total; top of the list)

Current top-12 by weight: `world.ts` 4,954 (composition root) · `styles/app.css` 2,442 ·
`ui/observatory.ts` 2,330 · `sim/apex-brain.ts` 2,136 · `sim/super-mind.ts` 2,077 ·
`ui/super-neural.ts` 1,847 · `sim/titans.ts` 1,565 · `sim/super-body.ts` 1,424 ·
`sim/creature-exterior-layers.ts` 1,395 · `ui/copilot.ts` 1,181 · `sim/entities.ts` 1,145 ·
`sim/singularities.ts` 1,131. The table below refreshes the established extended roster:

| Lines | File                        | Lines | File                      |
| ----: | --------------------------- | ----: | ------------------------- |
|  4954 | world.ts (composition root) |  1131 | sim/singularities.ts      |
|  2330 | ui/observatory.ts           |  1061 | audio/engine.ts           |
|  2077 | sim/super-mind.ts           |   750 | sim/economy.ts            |
|  1847 | ui/super-neural.ts          |  1145 | sim/entities.ts           |
|  2442 | styles/app.css              |  1099 | sim/instanced-entities.ts |
|  1565 | sim/titans.ts               |  1023 | server/copilot.ts         |
|  1107 | ui/nhi-observatory.ts       |   601 | sim/super-qubits.ts       |
|   869 | sim/tsotchke-deep-wire.ts   |  1056 | ui/center-hud.ts          |
|  1424 | sim/super-body.ts           |   714 | sim/petri-dish.ts         |
|  1031 | sim/environment.ts          |   551 | sim/libirrep-qec.ts       |
|   696 | sim/emergence-angles.ts     |   557 | math/eshkol-ad.ts         |

### `tests/` — heaviest files (281 files · 39,202 lines total)

`worker-pool 899 · singularities 746 · observatory 670 · quantum 462 · entity-vitals 448 · copilot 422 ·
apex-brain 419 · atmosphere 398 · graph-mind 389 · titans 386 · tsotchke-registry 349 · public-intelligence-receipts 348` ·
… (full list via `bun run metrics`).

---

## 13 · Positioning

This is a ~102.4k-line app-source (+ optional C++/Jolt native engine) browser-native simulation that
renders **up to 50,000 agents** (10,000 at 60 fps on a laptop iGPU with zero AI accelerator), is
**bit-reproducible from one seed**, ships through a **full CI/CD gate** (2,530 tests, 84.64% line / 82.21% func coverage),
and whose entire emergent intelligence weighs **≈ 14 MB — 1/50,000th of GPT-3** at the mega ceiling. It
demonstrates that depth comes from **architecture,
determinism, and engineering discipline**, not parameter count or hardware.

**Frontier assessment:** [VERIFICATION-ANALYTICAL-DATA](./VERIFICATION-ANALYTICAL-DATA.md) · [Super Creature Research](./SUPER-CREATURE-RESEARCH-2026-06-26.md).
