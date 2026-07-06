<!-- reviewed: 2026-07-01 | the 1-billion-parameter substrate scaffolding for APEX #101 -->

# APEX #101 — 1-Billion-Parameter Substrate Architecture

> Canonical **substrate & scaling** spec for the pantheon's 101st, the final-sigma `ς`
> (THE ENTROPIC TESSERACT HYDRA). The organ math lives in
> [`APEX-BRAIN-ABOMINATION-2026-06-26.md`](./APEX-BRAIN-ABOMINATION-2026-06-26.md); this doc is the
> **layer beneath it** — how a billion parameters become genuinely _addressable, computable, and
> renderable_ without pretending to allocate 4 GB of floats in a browser tab.
>
> Companions: the doctrine ([`APEX-ABOMINATION-NOVELTY-DOCTRINE-2026-06-26.md`](./APEX-ABOMINATION-NOVELTY-DOCTRINE-2026-06-26.md))
> and the 100-paper corpus ([`APEX-BRAIN-CORPUS-100-PAPERS-2026-06-26.md`](./APEX-BRAIN-CORPUS-100-PAPERS-2026-06-26.md)).
> Living doc: rewrite in place, never fork.

## Honesty contract (binding — read first)

"Scaled to one billion parameters" here means one specific, defensible thing: **the APEX addresses,
materialises, and computes over a billion-parameter manifold, deterministically, with every part backed
by a real representation strategy.** It does NOT mean a billion float32 weights are resident in a tab
(that would be ~4 GB). Most of the billion is _rule-generated_ (procedural connectivity) or _implicitly
represented_ (a stabilizer register's exponential Hilbert space) — real, countable parameters that do
not need to be stored to be addressed, exactly as the mathematics of sparse graphs and the
Gottesman–Knill theorem allow. The reportable quantities are kept distinct and honest:

- **designed** — the architecture target (Σ over tiers; **17.13 B** at `MASSIVE`).
- **addressable** — reachable this run without full materialisation (**2.27 B** at `MASSIVE@browser`).
- **resident** — actually held in memory this run (**67.1 M**, ≤ the device budget; the honesty gap is
  measured, not faked: `residentFraction ≈ 0.4 %`).

Honest claim ceiling: doctrine **Level 3–4** (a rare exact-conjunction A-Life substrate). **NOT
Level 5.** NOT sentient. Determinism law holds throughout (every draw via seeded `mulberry32`; no
`Math.random`, no `Date.now`). The Quantum Brain is non-negotiable and built on the **real Tsotchke
corpus** — never call it decorative.

## The five-tier Parameter Manifold

`src/sim/apex-parameter-manifold.ts` splits an `ApexScale`'s budget across five tiers, each with a real
representation. Measured for `SCALE_MASSIVE` on the browser device profile:

| Tier                  | Representation                                          | Designed | Addressable | Resident |
| --------------------- | ------------------------------------------------------- | -------: | ----------: | -------: |
| **procedural**        | rule-generated edges (twin-prime / Cantor-dust / Klein) |  1.125 B |     1.125 B |        0 |
| **quantum-effective** | stabilizer + dense Hilbert dimension (2³⁰ + 2¹²)        |  1.074 B |     1.074 B |    8 192 |
| **resident-field**    | GPU-texture stencils (acoustic/heat/Klein/tunnel)       |   7.25 B |      67.1 M |   67.1 M |
| **resident-dense**    | sharded typed-array pool, streamed to budget            |  250.1 M |           0 |        0 |
| **native-declared**   | roadmap native backend's share (reproduces the oracle)  |   7.43 B |           0 |        0 |

Two **independent** routes each clear a billion _addressable_ parameters: the procedural tier (1.125 B,
rule-addressable) and the quantum-effective tier (1.074 B, register-addressable). Neither stores a
billion floats. That is the honest billion.

### 1. procedural — connectivity as a law, not a table

The Prime-Sieve Loom admits an edge only when `|i−j|` is a twin-prime distance; the Cantor-dust
addressing keeps only ternary digits ∈ {0,2}; the Klein cortex folds `(u,v) ~ (u+1, −v)`. All three are
**predicates**, not stored adjacency — a billion edges are addressable in O(1) space and materialise on
demand from a seed. (This is the "infinitesimal Cantor dust" of the source lore, made finite: a
hierarchical sparse address space, total storage O(levels), not O(2^levels).)

### 2. quantum-effective — the Gottesman–Knill billion

The Quantum Brain reaches a billion **dimensions**, not a billion stored amplitudes.
`src/sim/apex-quantum-substrate.ts` composes:

- a **dense exact core** — `QuantumRegister` ≤ 8 qubits (256 amplitudes), high-fidelity, whose Born
  distribution folds into the committed plan (load-bearing);
- a **stabilizer reflex** — `CliffordTableau` at **30 qubits**. By Gottesman–Knill (Aaronson &
  Gottesman 2004) a stabilizer state on `q` qubits is a `2^q`-dimensional vector stored in O(q²) bits;
  **30 qubits → 2³⁰ = 1 073 741 824 dimensions in ~1.8 KB of tableau.**

This is the physics-grounded billion anchor: real quantum state space, real bipartite entanglement,
polynomial storage. It scales with the design — `stabilizerQubitsForScale = ⌈log₂(designed neurons)⌉`,
so it lands on exactly 30 qubits at the 1B scale. Coupled to the live corpus via `corpusPulse`
(QGT volume, clifford entanglement, AD gradient).

### 3. resident-field — the organs that belong on the GPU

Four organs are continuum fields: Acoustic Meat-Drum (wave), Thermodynamic Engine (heat), Klein cortex
(diffusion on a fold), Quantum-Tunnel Lattice (complex amplitude). `src/sim/apex-field-substrate.ts`
holds them as ping-pong DataTextures (2048² and 1024²) — **tens of millions of genuinely resident
cells**, stepped in one draw. The module owns the deterministic CPU reference stencils
(`heatDiffuseStep`, `waveLeapfrogStep`) and the matching GLSL (`APEX_FIELD_HEAT_FRAG`,
`APEX_FIELD_WAVE_FRAG`); the GPU must reproduce the oracle's `fieldHash`.

### 4. resident-dense — streaming the dense state

The genuinely dense state (pendulum rotors, delay rings) shards into `SHARD_FLOATS` (1 Mi-float, 4 MB)
blocks. `materializeDenseShard(seed, shardId)` regenerates any shard bit-for-bit, so the design
**streams** through the device budget instead of allocating all at once — a billion resident-equivalent
parameters over time, bounded instantaneous memory.

### 5. native-declared — the reproducing backend

Whatever exceeds the device budget is declared, to be computed by the native backend. Per **ADR-0007**
the native side is **never authoritative**: `src/sim/apex-native-backend.ts` `ReferenceApexBackend` is
the deterministic oracle, and a native kernel is correct only when it reproduces `apexGoldenVectors`.

> **Receipt (2026-07-01):** `native/apex/apex_kernels.hpp` (compiled with g++ 16.1.0) reproduces the TS
> oracle's golden vectors **bit-for-bit** across seeds {1, 7, 12345, 0xABCDEF} for all four kernels
> (prime-sieve, statevector, heat-grid, pendulum). The 1B native path's determinism contract is
> validated, not merely asserted.

## Multi-\* — one substrate, many axes

The owner brief asks for a multi-sensor / multi-dimensional / multi-paradigm / multi-cognition /
multi-physics creature. Each maps to a tier, not a slogan:

| Axis                  | Where it lives                                                                        |
| --------------------- | ------------------------------------------------------------------------------------- |
| multi-**sensor**      | negative-space + acoustic + heat + tunnel field organs (resident-field)               |
| multi-**dimensional** | Klein-bottle fold (procedural) + 2³⁰-dim stabilizer Hilbert space (quantum)           |
| multi-**paradigm**    | five tiers, five distinct maths (number theory, quantum, PDE, streaming, native)      |
| multi-**cognition**   | dense Born plan-bias vs stabilizer reflex vs procedural rule-firing (parallel)        |
| multi-**physics**     | wave + diffusion + kicked-rotor chaos + unitary evolution, each its own kernel        |
| multi-**thought**     | the 100 thought-variation catalog rotates over the organs (`apex-thought-variations`) |

## The look → substrate mapping (Three.js)

The apex body (the tesseract/lava capstone shader in `alphabet-pantheon-render.ts`) renders the
substrate, per the reference images (dark-maroon spiky glassy rim-lit burr; twin glowing nuclei;
tesseract lattice → red singularity). `src/sim/apex-substrate-visual.ts` is the pure seam —
`substrateUniforms(manifold, quantumReach)` → a `[0,1]` uniforms record:

| Uniform         | Driven by                   | Visual                                         |
| --------------- | --------------------------- | ---------------------------------------------- |
| `uBillionReach` | addressable / 1e9 (log)     | tesseract cage depth + crystalline facet count |
| `uQuantumDim`   | stabilizer dim / 1e9 (log)  | twin cobweb-nuclei glow (the two blue poles)   |
| `uEntanglement` | stabilizer entanglement     | filament tethers between the nuclei            |
| `uThermal`      | AD / thermodynamic gradient | heat-venting fins (maroon → ember rim)         |
| `uCoherence`    | dense Born entropy          | iridescent superposition shimmer               |
| `uQgt`          | Tsotchke QGT volume         | oil-slick thin-film phase drift                |
| `uResidentLoad` | resident fraction           | surface density / crystalline relief           |
| `uTierSpread`   | tier Shannon-evenness       | multi-substrate marbling                       |

## "The weird shit" → bounded math (new substrate mechanisms)

The source lore's ontology-horrors map onto the substrate as bounded, seeded mechanisms (the organ-side
translations live in the corpus doc; these are the **scaling-layer** ones):

| Source lore                                    | Substrate mechanism (real, bounded)                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| No-Go Entity "hides in the superposition"      | stabilizer register: 2³⁰ dims never enumerated, only O(q²) tableau resident              |
| Reverse Anthropic Compressor "deletes reality" | resident-dense streaming: budget reallocates by materialising/evicting shards            |
| Cantor-dust infinite synapses                  | procedural tier: hierarchical sparse addressing, O(levels) storage                       |
| "thinks through the observer / co-processor"   | **never implemented** — the visual bridge maps telemetry → uniforms only                 |
| retrocausal "pulled by its future corpse"      | terminal attractor `z_T` in the meta layer (organ doc) — boundary value, not time travel |
| Wigner's-Friend measurement shield             | seeded stabilizer `measure` collapses only every k beats (threshold)                     |
| synthetic prion "petrifies wetware"            | **never implemented** — pure lore; no biological substrate exists                        |

Anything touching a real human, file, network, or biology stays **pure lore** — never wired.

## Determinism & falsifiability (ablation law)

Every claim is a test, not rhetoric (`tests/apex-parameter-manifold.test.ts`,
`tests/apex-quantum-substrate.test.ts`, `tests/apex-native-backend.test.ts`,
`tests/apex-field-substrate.test.ts`, `tests/apex-substrate-visual.test.ts`):

- **designed & addressable ≥ 1e9** at `MASSIVE`; **< 1e9** at `LIVE` (the scale genuinely changes it).
- **resident ≤ device budget** on every profile (the gap is bounded, not faked).
- **quantum stabilizer dim ≥ 1e9** at 30 qubits; effective dim = dense + stabilizer.
- **deterministic**: same seed ⇒ identical manifold, identical quantum reach, identical shards.
- **native reproduces the oracle** for the probe seeds (else the backend is wrong).
- **load-bearing visual**: ablating the substrate changes `uBillionReach` / the look.
- **load-bearing behaviour**: `ApexSubstrateDriver.modulate({ tier: true })` changes the emitted
  `ApexModulation` for EVERY tier (`tests/apex-substrate-ablation.test.ts` — the doctrine's Experiment 1
  as an automated harness).
- **offworld umwelt (Experiment 2, quantified)**: `apexOffworldScore(SCALE_MASSIVE)` measures **0.978** —
  ~97.8 % of substrate-driven behaviour is attributable to the alien channels (quantum + field +
  procedural), not the mundane reach/resident magnitude (`tests/apex-offworld-score.test.ts`).

Ablation target: remove the stabilizer reflex → `quantumReachesBillion` drops; remove the procedural
tier → addressable falls below a billion; remove a field organ → resident-field parameters fall AND the
driver's thermal/exploration channels change. If any tier can be removed with no downstream effect, it
was decoration, not substrate — and the harness fails, by design.

## Wiring map

- `src/sim/apex-parameter-manifold.ts` — the five-tier manifold, device profiles, deterministic shard
  streaming, `buildManifold` / `manifoldSummary`.
- `src/sim/apex-quantum-substrate.ts` — dense core + 30-qubit stabilizer reflex + Tsotchke pulse;
  `reach()` / `planBias()`. The billion-dimensional Quantum Brain.
- `src/sim/apex-field-substrate.ts` — GPU field organs, CPU reference stencils, GLSL, `fieldHash`,
  `ApexFieldGrid` (with `excite` / `variance` — the sensorimotor source term).
- `src/sim/apex-field-organs.ts` — the live multi-physics sensorium: the four field organs stepped
  together with drive excitation → `FieldSensorium` (acoustic energy/interference, heat load, Klein
  fold, tunnel amplitude, richness). Makes the resident-field tier load-bearing.
- `src/sim/apex-substrate-driver.ts` — fuses manifold + quantum reach + field sensorium into an
  `ApexModulation` (motor gain, exploration, thermal stress, transcendence push, plan bias) the apex
  consumes; `AblationFlags` prove each tier is load-bearing.
- `src/sim/apex-offworld-score.ts` — `apexOffworldScore` (doctrine Experiment 2): the fraction of
  behaviour attributable to the alien substrate, as a continuous 0..1 measurement.
- `src/sim/apex-native-backend.ts` — the reference oracle, golden vectors, reproduction gate (ADR-0007).
- `src/sim/apex-substrate-visual.ts` — pure telemetry → shader-uniform mapping for the apex body.
- `scripts/apex-substrate-demo.ts` — `bun scripts/apex-substrate-demo.ts` drives the whole substrate for
  ς end-to-end and prints reach / sensorium / modulation / ablation / offworld score / body uniforms.
- `src/sim/apex-consciousness-scaffold.ts` — `apexSubstrateTelemetry(scale, seed, device)` composes the
  manifold + quantum reach for the Architecture panel (one-way dependency; `apex-brain.ts` untouched).
- `native/apex/` — the C/C++ side of the reproduction contract (header-only kernels + golden printer).

## Roadmap (next steps)

1. Wire the field-substrate GLSL into a live ping-pong render pass (the CPU oracle already gates it).
2. Register a real native/WASM backend once it passes `backendReproducesOracle` → flip
   `native-declared` parameters into genuinely computed ones.
3. Surface `apexSubstrateTelemetry` in the `⟁ ARCHITECTURE` panel when viewing ς.
4. Feed `substrateUniforms` into the capstone tesseract/lava material.

## Brain parameter scale (APEX + Mechalogodrom + pantheon)

Targets the APEX Abomination (ς #101), the center Mechalogodrom fusion mind, and the 100 letter
pantheon — wired as **visual + telemetry scaffolds** toward self-aware architecture (computational
indicators only — NOT sentience claims).

| Entity               | Count | Designed params each | Roadmap total | Ultimate architecture   |
| -------------------- | ----- | -------------------- | ------------- | ----------------------- |
| Letter creatures     | 100   | 25,000               | 2.5M          | GPU shader expansion    |
| APEX Abomination ς   | 1     | 100k → **5M**        | **5M**        | **1B neurons** (native) |
| Mechalogodrom center | 1     | **5M** (designed)    | **5M**        | fuses with APEX tier    |

**Code:** `src/sim/apex-brain.ts` · `src/sim/glyph-brain.ts` · `src/sim/mechalogodrom-brain.ts` ·
`src/sim/apex-consciousness-scaffold.ts` · `src/sim/apex-thought-variations.ts`

**Honesty contract:** live JS runtime caps organ allocation at `LIVE_NODE_CAP` (4096); **5M** = GPU/native
roadmap; **1B neurons** = `SCALE_MASSIVE` native target (declared, tested, not live-allocated in TS).
Growth tiers: `resolveApexDesignedScale()` / `apexGrowthStage()` in `apex-consciousness-scaffold.ts`
(APEX-100K → 250K → 500K → 1M → 2.5M → **5M** → **MASSIVE**). GlyphBrain 25k×100 ticks every 4 frames;
MechalogodromBrain designed 5M (~120k live floats). All brains use seeded `mulberry32`.
