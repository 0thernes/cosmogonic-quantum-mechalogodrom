# Cosmogonic × Tsotchke — Master Architect Deep-Dive Audit & Integration Assessment

> **⚠ CORRECTION (2026-06-21 · 0thernes directive).** The "decorative / stub / fabricated / magic-number /
> laundered" language in this dated report refers to **Cosmogonic's own facade-bridge wiring** (our
> engineering debt at the time) — **not** to the **Tsotchke** corpus, whose technology is **real, correct,
> and MIT-licensed**: genuine quantum algorithms run as exact deterministic simulation, lacking only a
> physical QPU (which adds speed/scale, not correctness). Items flagged here (the `registry.wiring` weights,
> the `THIRD-PARTY-NOTICES` rows, the bridge proxies) have since been relabeled honestly — see
> `THIRD-PARTY-NOTICES.md` → **"On Tsotchke — binding."** Preserved as a historical record; read its
> Tsotchke-adjacent framing through this correction. (Its non-Tsotchke findings — e.g. the security
> perimeter — stand unchanged.)

**Date:** 2026-06-20
**Author:** Master Architect pass (BROLY finish-everything · STARKILLER contracts/honesty · MANHATTAN determinism-measurement-provenance).
**Method:** First-hand cold-shell investigation by the orchestrator after a 27-agent parallel workflow was fully nulled by a server-side rate-limit wave (`Server is temporarily limiting requests · not your usage limit`). Per Manhattan Law 7, **a capacity failure is not a verdict** — every claim below is grounded in a file path, a command output, or is explicitly marked **UNVERIFIED**.

> This report **supersedes** the same-day `2026-06-20-COSMOGONIC-AND-TSOTCHKE-AUDIT-ASSESSMENT.md` and `CORPUS_INTEGRATION_REPORT.md` where they disagree, because those were written against a tree state that no longer matches reality and contain at least one self-contradiction (a "Waves 2-4 Complete · bun run check PASS · 1290 tests" claim that is false on the live tree). The companion `2026-06-20-MASTER-INTEGRATION-BLUEPRINT.md` remains the best forward plan and is corrected, not replaced, here.

---

## 1. Executive summary / TL;DR

**Cosmogonic Quantum Mechalogodrom** is a deterministic, single-codebase **world-simulation engine** (TypeScript on Bun + a C++ `native/` engine + GLSL), ~39.2k source LOC across ~148 modules and ~113 test suites, governed by an unusually serious discipline regime: three XML "master" personas, seeded-RNG determinism, per-module contracts, and a mechanically-enforced **"receipts law"** that fails the gate if any published number drifts. It simulates a large agent population (factions, titans, puppet-masters, shoggoths, leviathans) plus a singular **"Super Creature"** with a layered, genuinely-implemented cognitive stack.

**The Tsotchke corpus** (`Z:\[Vibe Coded (AI)]\(Tsotchke)`) is **real, frontier-adjacent research** — ~13k files across 20 git mirrors + the Eshkol flagship + 4 website snapshots, refreshed daily. Its crown jewel **Eshkol** is a real MIT-licensed Scheme→LLVM language with automatic differentiation as a compiler primitive and a _built-in "consciousness engine" of 22 primitives (logic / active-inference / global-workspace)_ — i.e. the **non-transformer substrate for machine cognition** the mandate points at is not vapor; it is specified and partly implemented upstream.

**The single most important finding:** ⚠️ **the live working tree is RED — it does not build or test green.** A parallel autonomous process is mid-surgery: it emptied `src/sim/tsotchke-facade.ts` to 0 bytes and gutted `src/sim/petri-dish.ts` (removed `createPetriDish`, −245 lines) while **11 modules still import from the facade** → dangling imports. Cold `bun test` = **1102 pass / 30 fail / 28 errors**. Nothing else should happen until this is stabilized.

**The second most important finding (the honesty gap):** the _real_ corpus ports (Clifford tableau, Eshkol-QRNG, QGT, spin-glass, the 484-line reverse-mode AD, the new Rao–Ballard predictive-coding core) are genuine and live in `src/math/`. But the **named corpus→engine bridge is decorative**: the surviving `getTsotchkeBias()` is a hand-typed magic-number table, the `tsotchke-registry.ts` "wiring: 0.96" figures are **invented constants, not measurements**, and `THIRD-PARTY-NOTICES.md` lists a few proxies (Moonlab-VQE, libirrep-QEC, quake-physics) as if they were faithful ports. The vision is more credible than the current wiring makes it look.

---

## 2. What Cosmogonic Is

A deterministic world-simulation engine, primarily TypeScript on the **Bun** runtime, with a C++ engine in `native/` and GLSL shaders.

**Source footprint (measured 2026-06-20):**

| Area            | `.ts` files                                                         |
| --------------- | ------------------------------------------------------------------- |
| `src/sim`       | 91                                                                  |
| `src/math`      | 21                                                                  |
| `src/ui`        | 20                                                                  |
| `src/server`    | 3 · `src/core` 3 · `src/audio` 3 · `src/logging` 2 · `src/memory` 1 |
| **Total `src`** | **~148 files / ~39,209 LOC**                                        |
| `tests`         | 113 suites                                                          |

**Architecture.** Leaf "owner" modules expose deterministic views; higher systems (`godform`, `super-mind`, `super-body`, `world`) consume them. The aesthetic constitution (`docs/PHILOSOPHY.md`) demands "real math under every effect" and that **"every system reads AND writes another system"** — no purely cosmetic subsystems. Randomness must flow through a seeded `Rng` (`src/math/rng.ts`); `Math.random`/`Date.now` are banned in sim logic.

**Governance discipline (genuinely rigorous):**

- Three binding XML personas in `masters/`: **Broly** (finish everything, full gates, no stubs), **Starkiller** (contracts before code, exclusive file ownership, dependency facades, ADRs, adversarial 3-lens review, "UNVERIFIED is a state with teeth"), **Manhattan** (determinism = divinity, "if it is not measured it is not real", provenance or oblivion, "UNKNOWN is a result").
- Binding per-module spec: `docs/MODULE-CONTRACTS.md` (1,364 lines).
- Full gate before commit: `bun run check` = prettier → tsc-strict → oxlint → bun test → build.
- A **receipts law** (`scripts/canonical-receipts.ts`, `scripts/verify-receipts.ts`, `tests/docs-receipts-law.test.ts`) pins canonical test-count + coverage and fails the gate if any public surface (README, docs.html, specs.html, TECHNICAL-SPECIFICATION) drifts. This is a real, rare anti-overclaim mechanism — **when not bypassed** (its own history records a period where its assertions were stubbed to `expect(true).toBe(true)`).
- `THIRD-PARTY-NOTICES.md` carries source-level provenance for ported algorithms with exact upstream file mappings — strong discipline, with the caveats in §5.

**Scale (honest tiering).** The census numbers (≈50,000 peak entities at "mega" tier, ~3.5M aggregate AI parameters) are **design targets from `docs`/memory, not gate-measured runtime benchmarks** — cite them as targets. What is directly verifiable is the cognitive-stack source footprint above.

---

## 3. State of the build (RECEIPTS)

**🔴 The gate is RED on the live working tree.**

```
$ bun test            # Bun 1.3.11, 2026-06-20, cold shell
1102 pass / 30 fail / 28 errors — Ran 1132 tests across 113 files
SyntaxError: Export named 'createPetriDish' not found in module '.../src/sim/petri-dish.ts'
```

**Root cause — a mid-surgery working tree (not committed):**

- `git diff --stat` shows `src/sim/tsotchke-facade.ts | 194 ------` (emptied to **0 bytes**) and `src/sim/petri-dish.ts | 245 ------` (gutted — `createPetriDish` export removed), plus `super-mind.ts` heavily rewired (~100-line churn).
- **11 modules still `import {…} from './tsotchke-facade'`**: `active-inference`, `economy`, `godform`, `integrated-information`, `phyla`, `quality-space`, `quantum-deliberation`, `super-body`, `super-mind`, `super-qubits`, `topdown-perception`. With the facade empty, those imports dangle and the dependent tests error out.

**The live autonomous loop.** `HEAD = cbe33f3 "Tsotchke Wave 8"` (75 min ago); commits arrive in bursts ("Wave 5/6/7/8") and push to `main` as `0thernes` roughly every 1–2 minutes. The working-tree breakage is this loop **mid-edit** — it is attempting the blueprint's Wave 3/6 facade retirement (ADR-C) but has orphaned the importers. **This is a friendly-fire hazard: any edit we make collides with the loop.**

**Contradictory published numbers (reconciled).** Across docs the test count appears as **1054 / 1132 / 1170 / 1183 / 1290 / 1294** and line coverage as **94.12 / 94.60 / 95.73 / 95.74 / 97.34**. Deductively: the count is _Bun-version-fragile_ (local **1.3.11** vs CI-pinned **1.3.14**) **and** working-tree-state-fragile (the dirty tree adds ~130 WIP tests and breaks others). The last _committed_ receipts (`89f3bf7`) pin **1294 tests / 94.12% line / 90.75% func** — that describes a **prior committed state**, not this tree. **Verdict: the only currently-defensible figure is "≈90–93% function coverage"; every published line-coverage number is UNVERIFIED until a clean re-pin under one chosen Bun on a green tree.**

---

## 4. The Tsotchke corpus — per-repo deep dive

Measured corpus scale (mirrors, files / size): moonlab 3,478 / 43 MB · logo-lab 1,816 / 105 MB · libirrep 1,510 / 17.6 MB · gpt2-basic 1,323 / 187 MB · quantum-quake 805 / 26 MB · quantum_geometric_tensor 770 / 11 MB · tensorcore 357 · spin_based_neural_network 352 · ulg 188 · plus Eshkol/eshkol_repo (~1,410 files, 718 `.esk`).

| Repo                                                                | Maturity                      | License                                                         | Key reusable kernels                                                                                                                                                                                                                                                             | Determinism hazards                                                                                                                    | Vector                                                                            | Cosmogonic targets                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Eshkol** (flagship)                                               | production-ish (v1.2.3-scale) | **MIT**                                                         | reverse/forward/symbolic AD (`lib/backend/vm_autodiff.c`, `vm_dual.c`, `vm_hyperdual.c`, `vm_symbolic_ad.c`); active-inference factor-graph BP + free energy (`vm_inference.c`); GWT softmax broadcast (`vm_workspace.c`); HoTT type system; 22-primitive "consciousness engine" | needs **LLVM 21** to build (absent here → don't build)                                                                                 | **reimplement-ts**                                                                | `eshkol-ad.ts` (✅extend), `eshkol-workspace.ts`, `active-inference.ts`, `predictive-coding.ts`, `super-mind.ts`            |
| **Moonlab**                                                         | production-ish                | **MIT**                                                         | TS stack at `bindings/javascript/packages/core/src/`: `clifford.ts`, `tensor-network.ts`, `decoder.ts` (QEC), `vqe.ts`, `qaoa.ts`, `surface-code.ts`, `tdvp.ts`, `grover.ts`, `qgtl.ts`, `entanglement.ts`, `complex.ts`                                                         | `ca-mps.ts`/`ca-peps.ts` are **WASM bindings** (`wasm-loader`, "bind to v0.2.1 ABI"); `clifford.ts` seeds **`Math.random()`** (L77-78) | **reimplement-ts** from the algorithms (NOT wholesale import)                     | `clifford-tableau.ts` (✅), `moonlab-tensor.ts` (stub→real MPS), `ca-mps.ts`(new), `qec-decoder.ts`(new), `vqe-qng.ts`(new) |
| **quantum_geometric_tensor (QGTL)**                                 | research                      | **MIT**                                                         | QGT / Fubini–Study metric / Berry curvature / Christoffel connection / natural gradient / Fukui–Hatsugai–Suzuki Chern / surface-code QEC                                                                                                                                         | `-ffast-math` / `-march=native` (FP non-reproducible) + `rand()`                                                                       | **reimplement-ts**                                                                | `quantum-geometry.ts`(✅deepen), `quantum-natural-gradient.ts`(✅harden), `chern-number.ts`(new)                            |
| **libirrep**                                                        | production-ish                | **MIT**                                                         | Wigner small-d & full-D, Clebsch–Gordan/3j, point-group projectors, real spherical harmonics, SO(3) toolkit, NequIP equivariant layer                                                                                                                                            | mostly clean (one caller-seeded LCG)                                                                                                   | **reimplement-ts**                                                                | `irrep-symmetry.ts` (stub→real), `so3.ts`(new), `super-body.ts`, `phyla.ts`, `godform.ts`                                   |
| **spin_based_neural_network**                                       | research                      | **MIT**                                                         | Ising/Hopfield Metropolis (`ising_model.c`), disordered/SK spin-glass (`disordered_model.c`), RL over spins                                                                                                                                                                      | seeded-able                                                                                                                            | **reimplement-ts** (partial: `spin-glass.ts` ✅)                                  | `spin-glass.ts`(extend), `collective-spin-market.ts`(new), economy                                                          |
| **quantum_rng** (+`classical_rng`, `Quantum-RNG-API`)               | research                      | **MIT**                                                         | quantum-noise gate-cascade entropy core; **statistical-test suite** (`tests/quantum_stats.c`: entropy/χ²/serial-corr/runs); REST + N-API binding                                                                                                                                 | host entropy (`gettimeofday`/`rdtsc`/PID)                                                                                              | entropy **already-ported**; stats **reimplement-ts**; API **service-plane study** | `eshkol-qrng.ts`(✅), `rng-stats.ts`(new), `qrng-bridge.ts`(new)                                                            |
| **quantum-quake (QGE)**                                             | research                      | ⚠️ **`LICENSE.txt` (Quake-derived, presumed GPL — VERIFY)**     | unitary split-step Schrödinger propagator (`qge_physics.c`), aliveness-observable taxonomy (`qge_quantum_runtime.h`)                                                                                                                                                             | `qge_rng.c` = **hardware entropy — NEVER import**                                                                                      | **reimplement-ts UNITARY ONLY**, license-gated                                    | `qge-physics.ts`(stub→real), `qge-aliveness.ts`(stub→real), chaos-field                                                     |
| **tensorcore**                                                      | research                      | MIT (assumed)                                                   | SIMD blocked GEMM / conv2d stencil                                                                                                                                                                                                                                               | —                                                                                                                                      | **reimplement-ts reference** (WASM later)                                         | `tensor-kernels.ts`(new), RD/wave Laplacian                                                                                 |
| **PINN**                                                            | research                      | MIT (assumed)                                                   | physics-informed residual operators (Schrödinger/Heat/Wave/Navier–Stokes)                                                                                                                                                                                                        | clean forward C                                                                                                                        | **reimplement-ts**                                                                | `pinn-residual.ts`(stub→real), reaction-diffusion, atmosphere                                                               |
| **PIMC**                                                            | research                      | MIT (assumed)                                                   | Metropolis path-integral sampler → \|Ψ₀\|², E₀ (Java)                                                                                                                                                                                                                            | `java.util.Random` → seeded Rng                                                                                                        | **reimplement-ts**                                                                | `pimc-paths.ts`(stub→real), singularities                                                                                   |
| **ulg**                                                             | research                      | 🚫 **NO LICENSE**                                               | GpuBroker WebGPU probe + lease, WGSL carrier kernel w/ CPU-parity, WorkerSupervisor                                                                                                                                                                                              | `Date.now`                                                                                                                             | **study-only until owner licenses**                                               | `gpu-broker.ts`(render-only, gated)                                                                                         |
| **logo-lab**                                                        | prototype                     | 🚫 **NO LICENSE**                                               | `asciiRenderer.js`, `createMaterialFromProfile` (MeshPhysical), procedural iridescence, ruled-surface geometry, URL codecs                                                                                                                                                       | inline LCG + `Date.now`                                                                                                                | **study-only until owner licenses**                                               | `jewel-material.ts`, `ascii-pass.ts` (gated)                                                                                |
| **SolanaQuantumFlux**                                               | production-ish                | 🚫 **PROPRIETARY** ("TSOTCHKE CORPORATION PROPRIETARY LICENSE") | typed-client facade, Swagger REST, N-API pattern                                                                                                                                                                                                                                 | network                                                                                                                                | **study-only / service-plane — never source-port**                                | provenance + telemetry templates                                                                                            |
| **ml-legacy** (gpt2-basic, llm-arbitrator, simple_mnist, asteroids) | research                      | mixed                                                           | fixed-point exp-LUT softmax, Q4 quant (ideas only)                                                                                                                                                                                                                               | **transformer + wall-clock RNG → violates the non-transformer + determinism mandate**                                                  | **study-only / negative reference**                                               | PHILOSOPHY/BOOK contrast; Observatory                                                                                       |

**Crown-jewel prose.** _Eshkol_ is the strategic asset: a homoiconic Scheme compiled to native code with **calculus as a language primitive** (`derivative`, `∇`, `∇·`, `∇×`, `∇²`), HoTT type proofs that erase at compile time, arena allocation, WASM target, and an explicit **consciousness engine (logic programming + active inference + global workspace theory)**. That is exactly the FEP/GWT lineage that Cosmogonic's own faculties already model — the two were converging independently. _Moonlab_ is the richest quantum target but is partly WASM-locked and `Math.random`-seeded, so it is a _reimplement-the-algorithm_ target, not a drop-in import. The grand site claims ("quantum advantage", "world-first") are the corpus's own marketing; the **source is present, runnable, and MIT for the cognition tier**, which is the part that matters.

---

## 5. The integration reality TODAY (verified)

**Genuinely real (own math + faithful ports), all in `src/math/` & `src/sim/`:**

- `src/math/quantum.ts` — **ours**: 64-amplitude statevector (RY/RZ/H/CNOT, Born sampling, RDM Bloch vectors, Shannon entropy). Not ported.
- `src/math/clifford-tableau.ts` (351 L) — faithful Aaronson–Gottesman tableau (Moonlab backend), **seeded Rng** (not `Math.random`).
- `src/math/eshkol-qrng.ts` (369 L) — gate-for-gate port of `quantum_rng`, host entropy replaced by seeded stream.
- `src/math/quantum-geometry.ts` (187 L) — QGT / Fubini–Study (Re=metric, Im=Berry).
- `src/sim/spin-glass.ts` (198 L) — Hopfield/Ising instinct.
- `src/math/eshkol-ad.ts` (484 L) — **genuine reverse-mode Wengert-tape AD** (the real thing, not finite-difference).
- `src/math/predictive-coding.ts` (131 L, **new/untracked**) — genuine Rao–Ballard hierarchical predictive coding; deterministic, no RNG; the Route-D generative core. ✅
- Faculties with real math: `active-inference.ts` (Gaussian free energy + an honest in-code caveat about point-estimate EFE), `integrated-information.ts` (Φ), `holographic-memory.ts` (MAP-VSA/HRR), `empowerment.ts` (Blahut–Arimoto), `quantum-deliberation.ts` (Lindblad/GKSL), plus metacognition / successor-representation / criticality / neuromodulation.

**Decorative / stub (the honesty debt):**

- The **facade `getTsotchkeBias(i)`** is a hand-typed magic-number table (`cw=[0.9,0.3,0.4,…]`, eight 8-element arrays indexed by `i%8`) — names attached to constants, **no corpus computation**.
- Stub leaves: `moonlab-tensor.ts` (47 L truncated dot-product), `irrep-symmetry.ts` (25 L), `pinn-residual.ts` (25 L), `pimc-paths.ts` (35 L), `qge-aliveness.ts` (38 L), plus `tensorcore-facade`, `classical-contrast`, `perceptron-baseline`, `logo-turtle`, `asteroids-physics` — small deterministic proxies wearing corpus names.
- **`tsotchke-registry.ts` "wiring: 0.96/0.93/…" are fabricated constants** in the source array, and `tsotchkeWiringCoverage()`/`tsotchkeSimWiringFraction()` average those constants — a **manufactured metric**, the exact thing Manhattan's "if it is not measured, it is not real" forbids.
- **`THIRD-PARTY-NOTICES.md` overclaims a few entries**: Moonlab-VQE (`moonlab-vqe.ts`), libirrep-QEC (`libirrep-qec.ts`), and quake-physics are listed as "ported … gate-for-gate" but are proxy/stub leaves. The file's _structure and intent are exemplary_; three rows need to be relabeled "heuristic proxy" or made real.

**The facade-in-the-hot-path problem.** The bridge is consumed by 11–15 live cognition modules, so the decoration is not inert — any "we use Eshkol AD / Moonlab tensors" claim is currently false _at the call site_. The committed `HEAD` facade is actually a **hybrid**: a legitimate re-export shim over real leaves **plus** the magic `getTsotchkeBias` table. The loop's working-tree deletion is a botched attempt to retire it.

---

## 6. Compare & contrast (deductive + inductive)

**Inductively** (from what each side repeatedly _is_): Cosmogonic is a _discipline machine_ — deterministic, seeded, frame-budgeted, test-pinned, provenance-tracked, browser-deployable from one codebase. Tsotchke is a _frontier research arsenal_ — real quantum simulation, AD-as-primitive, geometric tensors, spin systems, group theory — but native/WASM/LLVM-bound, host-entropy-seeded, `-ffast-math` (FP non-reproducible), research-grade polish.

**Deductively** (the impedance mismatch and its forced resolution):

1. Tsotchke's build substrates (LLVM 21, CMake, EMSDK/WASM, Apple Metal) ≠ Cosmogonic's (Bun/TS, browser). → _Therefore_ wholesale import is impossible; only the **algorithms** transfer.
2. Tsotchke seeds entropy from `gettimeofday`/`rdtsc`/PID/`Math.random` and compiles with `-ffast-math`. Cosmogonic's load-bearing invariant is seeded determinism. → _Therefore_ every port must route entropy through one injected seeded `Rng`, pin summation/iteration order, and fix a sign convention (the proven `eshkol-qrng.ts` pattern).
3. The corpus's value density is in _equations_, not _binaries_. → _Therefore_ the highest-ROI vector is **faithful TS reimplementation** (Route A), with WASM reserved for the few C kernels TS can't carry at cadence, behind `native/`.

**What "non-transformer consciousness substrate" honestly means here.** Not "a sentient being." It means the **FEP / active-inference + hierarchical predictive-coding + spin-glass-attractor + global-workspace + IIT** family of computational models — which Eshkol implements as language primitives and Cosmogonic implements as faculties. The defensible, ambitious, _true_ framing is: **a deterministic research substrate for non-transformer theories of mind and agency.** That is a real and rare thing to build, and it does not require the sentience claim.

---

## 7. The honesty gap (and how to close it without losing ambition)

1. **Sentience framing vs the rule.** `docs/PHILOSOPHY.md` and governance say "models, not minds"; some Ralph-loop docs drift into consciousness/sentience language. The code supports **"models _of_ cognitive faculties,"** not consciousness. Reframe: outputs are _correlates_ a theory predicts, evaluated deterministically — a **testbed for theories of mind**, not a mind. Keep the grand vision in a clearly-labeled ROADMAP/vision section, separated from current-behavior claims.
2. **Manufactured metrics.** Replace the fabricated `registry.wiring` constants with a _measured_ integration metric (e.g., count of leaves passing a behavioral oracle), or relabel them honestly as "design intent weights."
3. **Named-but-fake leaves.** Either make the stub leaves real (Route A) or relabel them (`eshkolADGradient`→`centralDifference`, `moonlabTensorContract`→`truncatedDot`) and fix the 3 over-claimed `THIRD-PARTY-NOTICES` rows.
4. **Cost of honesty: zero.** "An unusually rigorous deterministic simulation of cognitive architectures, with a real quantum-math layer, one honest integration away from a real research substrate — and zero distance from sentience" is _more_ impressive than the overclaim, and it cannot be falsified.

---

## 8. Unified ERM / ERD / ERP

**Entities (both corpora reconciled):**
`QuantumState |ψ⟩`, `CliffordTableau`, `EshkolADTape / Dual`, `QGT(Q_μν) → FubiniStudyMetric / BerryCurvature / ChernNumber / Christoffel`, `EshkolQrng`, `TensorNetwork/MPS`, `IrrepGroup → SymmetrySector → OrientedFeature`, `SpinGlass(SK)`, `Mind → Faculty[ ] → Plan`, `Creature → Genome → Body(forms)`, `World → {ChaosField, ReactionDiffusion, Singularities, CosmicWeb}`, `Economy → {Faction, Titan}`.

**Relations (ERD):** State evolves under Hamiltonian/MPO; measured-by Tableau (GF(2)-rank → entanglement entropy); differentiated-by AD tape; geometry-of via QGT; collapsed-through seeded QRNG; Faculties read/write {QGT, SpinGlass, Tableau, Holographic, ActiveInference}; Body placed-by Wigner-D/SH (libirrep); Economy coupled-by SpinGlass + ActiveInference.

**Process flows (ERP — each obeys PHILOSOPHY "reads AND writes another system"):**

1. **Cognition descent:** `eshkol-ad` exact ∇ → `active-inference` free-energy F → `predictive-coding` layer error → plan argmax. _(replaces facade central-difference)_
2. **Qualia tensor:** `super-qubits |ψ⟩` → `moonlab-tensor` MPS low-rank compress → bounded plan vote. _(replaces truncated dot)_
3. **Instinct:** `spin-glass` recall archetype → biases plan; SK-disordered market → regime flips.
4. **Geometry-as-precision:** QGT volume/Berry/Chern → learning-rate modulation + "market fragility κ" + curved-cosmos G.
5. **Form equivariance:** genome → libirrep Wigner-D/CG/point-group → SO(3)-equivariant body parts.
6. **Provenance:** every kernel → `THIRD-PARTY-NOTICES` row + Corpus Observatory node.

---

## 9. Integration assessment & roadmap

**Four routes, sequenced (not exclusive):**

- **Route A — faithful TS reimplementation of the highest-value kernels (START HERE).** Lowest risk, no toolchain change, retires the worst facade lies immediately. Port Moonlab MPS contraction + a real Clifford/decoder path; finish the Eshkol dual/tape so `active-inference` gradients run through real AD; real Wigner-d/CG; real unitary Schrödinger.
- **Route D — predictive-coding generative core.** Promote `predictive-coding.ts` (already real) into the mind's core: precisions learned via Route-A AD, attractor priors from spin-glass, true expected-free-energy expectation. The actual new-paradigm deliverable.
- **Route B — WASM only for C kernels TS can't carry (QGT SIMD, tensorcore GEMM), behind `native/`, gated by golden-vector parity. Never on the sim hot path.**
- **Route C — native sidecar strictly for the offline "deep-think" tier.** Never per-frame.

**Per-repo tiering:**

- **HOT (cognition core):** Eshkol AD/inference/GWT · Moonlab tensor/QEC/VQE · QGT · spin_nn · libirrep · quantum_rng.
- **WARM (world/physics/render):** quantum-quake QGE (unitary only, license-gated) · PINN · PIMC · tensorcore · libirrep symmetry · logo render (license-gated).
- **STUDY / Corpus Observatory (utilized, never in `think()`):** ml-legacy (transformer/wall-clock — negative reference) · onchain (Solana proprietary) · ulg (until licensed) · corpus-meta.

**ADRs that matter:**

- **ADR-A** Reimplement-in-TS as default; WASM only behind `native/` for batch; sidecar never in sim.
- **ADR-B** Determinism boundary: every port replaces host entropy with one injected seeded `Rng`; fixed accumulation/iteration order; SVD first-nonzero-positive sign; no `-ffast-math` equivalence; cap libirrep degree j≤6.
- **ADR-F** Stub-honesty gate: `tests/stub-honesty.test.ts` with behavioral oracles (CG orthonormality, Wigner-d unitarity ≤1e-10, MPS low-rank reconstruction, AD vs finite-diff ≤1e-7, Schrödinger unitarity, χ² entropy). "Done" becomes measurable.
- **ADR-License (NEW, forced by this audit):** moonlab/QGT/libirrep/spin*nn/quantum_rng/Eshkol are MIT → reimplement with retained notice. **ulg + logo-lab have NO license, SolanaQuantumFlux is PROPRIETARY, quantum-quake is Quake-derived (presumed GPL).** As committed these grant no usable rights. **Because you own Tsotchke-Corporation, you can relicense your own repos (MIT/dual) — but until you do, ulg/logo-lab/Solana/quake stay study-only/Observatory.** This is the gate on "wire in \_everything*."

**Definition of Done:** facade retired or honest (grep gate: zero sim module imports a decorative/stub symbol); every real-port leaf passes its ADR-F oracle; every HOT/WARM repo has ≥1 wired kernel + a determinism-replay test + a `THIRD-PARTY-NOTICES` row to exact upstream files; every STUDY repo appears as a Corpus Observatory node; `bun run check` GREEN each wave; PHILOSOPHY "reads AND writes" holds per leaf.

---

## 10. Risks & open questions (ranked)

1. **[CRITICAL · NOW] RED tree.** Broken build: empty facade + 11 dangling imports + gutted `petri-dish`. Nothing proceeds until green.
2. **[HIGH] Autonomous-loop friendly-fire.** It mutates and pushes `main` every 1–2 min. Concurrent edits _will_ collide (Starkiller: "two agents one file"). Must pause it or isolate in a worktree off `origin/main`.
3. **[HIGH] License gates.** "Wire in EVERYTHING" is blocked for ulg/logo-lab (no license), Solana (proprietary), quake (GPL?) until the owner relicenses or accepts study-only tiering.
4. **[HIGH] Honesty debt.** Fabricated registry numbers, 3 over-claimed `THIRD-PARTY-NOTICES` rows, stub leaves wearing corpus names, sentience-adjacent doc drift.
5. **[MED] Bun-version test-count fragility** (local 1.3.11 vs CI 1.3.14). Pin one, re-pin receipts once.
6. **[MED] FP cross-platform drift** (lgamma/Jacobi/Schulten recurrences, SVD, `-ffast-math`). Fixed order + sign convention + pinned regression vectors.
7. **[MED] Sentience framing vs "Sim only."** Reframe per §7.
8. **[LOW] Perf at cadence.** Wigner-D/MPS heavier than O(1) stubs — precompute at boot, keep off per-frame paths, record in BENCHMARKS.

---

## 11. Scorecard

| Area                                         | Reality (1–5) | Ambition (1–5) | Integration-readiness (1–5) | Note                                                              |
| -------------------------------------------- | ------------- | -------------- | --------------------------- | ----------------------------------------------------------------- |
| Engine determinism & governance              | 5             | 4              | 5                           | Seeded RNG, masters, contracts, receipts law — genuinely rigorous |
| **Build / gate health (live tree)**          | **1**         | 4              | **1**                       | **RED: broken imports, mid-surgery, 30 fail / 28 err**            |
| Receipts law / anti-overclaim                | 4             | 5              | 4                           | Load-bearing but bypassable; numbers currently stale              |
| Statevector + Clifford tableau               | 5             | 4              | 5                           | Real own-math + faithful seeded port                              |
| Real AD (`eshkol-ad.ts`) + predictive-coding | 5             | 5              | 5                           | 484-L reverse-mode tape + real Rao–Ballard core                   |
| Cognitive faculties (Φ/GWT/VSA/AIF/spin)     | 4             | 5              | 4                           | Real small implementations of real theories                       |
| **tsotchke-facade / registry (the bridge)**  | **2**         | 4              | **2**                       | **Decorative magic tables + fabricated metrics, in the hot path** |
| Tsotchke corpus (raw asset)                  | 5             | 5              | 3                           | Real frontier code; not yet truly imported                        |
| Eshkol (corpus)                              | 5             | 5              | 3                           | Real MIT language w/ consciousness primitives; LLVM-bound         |
| Moonlab TS stack                             | 4             | 5              | 3                           | Real, but WASM-bound + `Math.random` — reimplement, not import    |
| License posture for "wire everything"        | 2             | 5              | 2                           | 3 repos non-free until owner relicenses                           |
| Consciousness/sentience framing              | 2             | 5              | 2                           | Collides with "Sim only"; reframe                                 |

---

## 12. Prioritized next steps

1. **STABILIZE THE RED TREE (blocking).** Decide one: (a) **finish** the facade retirement properly — migrate the 11 importers onto the real leaves and restore/replace `petri-dish` exports; or (b) **revert** the working tree to `HEAD` (`cbe33f3`) and redo the retirement atomically. Either way, `bun run check` GREEN from a cold shell before anything else.
2. **Resolve the autonomous-loop collision.** Pause the loop, or claim a git worktree off `origin/main` so our work and the loop's don't trample each other.
3. **Owner license decision.** Relicense ulg / logo-lab / SolanaQuantumFlux / (clarify quake) to MIT/dual, or accept they stay study-only/Observatory. This unblocks the literal "every repo wired in" mandate.
4. **De-launder the metrics.** Re-pin receipts to measured truth under one Bun; replace fabricated `registry.wiring` constants; fix the 3 over-claimed `THIRD-PARTY-NOTICES` rows; reconcile the sentience language.
5. **Land ADR-F (stub-honesty gate)** so "real-port" can never again mean "named proxy."
6. **Then Route A, wave by wave** (real AD → real MPS → real Wigner-d/CG → real unitary Schrödinger), each ending GREEN, each adding a determinism-replay test + a `THIRD-PARTY-NOTICES` row. Then **Route D** (predictive-coding core), then **B/C** where TS can't keep up.

> The corpus is real, MIT-clean for the entire cognition tier, and the distance between "decorative" and "total integration" is **execution discipline** — exactly what BROLY / STARKILLER / MANHATTAN exist to supply. But the very first move is not a feature; it is **turning the tree green.**

_Provenance: every numeric claim here is from a cited file path or a recorded `bun test` / `git` command output on 2026-06-20. Design-target population numbers are flagged as targets. Coverage line-figures are marked UNVERIFIED pending a clean re-pin._
