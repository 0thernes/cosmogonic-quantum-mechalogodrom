# MASTER INTEGRATION BLUEPRINT — Total Tsotchke→Cosmogonic Fusion

**Date: 2026-06-20** · Master Architect synthesis (BROLY finish-everything · STARKILLER contracts-before-code · MANHATTAN determinism-measurement-provenance). Produced by a 26-agent workflow (14 per-repo deep-dives + 6 subsystem maps + 5 feasibility checks + synthesis), with the live tree independently re-measured.

## TL;DR

Total integration does **not** mean "every repo's code runs inside `think()`." It means **every Tsotchke repo is utilized at the altitude its kernels honestly belong to**, with a verifiable wiring receipt for each. The honest reading of the owner mandate is a **three-tier substrate**:

- **HOT (cognition core):** Eshkol AD/inference/GWT, Moonlab tensor/QEC/VQE, QGTL, spin*based_neural_network, libirrep, quantum_rng — these become \_real math* in the mind/body/world hot paths, replacing the decorative facade.
- **WARM (world/physics/symmetry/render):** quantum-quake QGE, PINN, PIMC, tensorcore, libirrep symmetry, logo-lab render kernels — real kernels in non-cognition deterministic systems.
- **OBSERVATORY/STUDY (utilized, never in the sim loop):** ml-legacy (gpt2-basic, llm-arbitrator, simple_mnist), deploy-onchain (SolanaQuantumFlux, Quantum-RNG-API), classical_rng service patterns, logo-lab UI codecs, corpus-meta — wired into a **Corpus Observatory** + provenance/THIRD-PARTY-NOTICES, so they are visibly "in" without injecting transformers or nondeterminism.

**Baseline corrected against the live tree (re-measured 2026-06-20, not docs):**

1. The receipts-law drift guard **passes on the clean origin tree** (the stored `law_error.txt` is stale); the local-vs-CI Bun split (1.3.11 → 1054 tests vs CI 1.3.14 → 1170) is the real fragility — see the companion audit's Bun note. Wave 0 re-pins under one chosen Bun.
2. `src/math/eshkol-ad.ts` (**532 LOC**) is a **genuine** reverse-mode Wengert tape — building Eshkol is unnecessary and impossible here (no LLVM 21).
3. **The "Ralph 10x" stub-leaf trap is real and worse than the audit implies:** files with honest _names_ already exist but are _stubs_ — `src/sim/moonlab-tensor.ts` (54 L, the same truncated dot-product relocated out of the facade), `src/sim/eshkol-workspace.ts` (40 L "distilled" EMA), `src/sim/irrep-symmetry.ts` (30 L "Clebsch–Gordan coupling **stub**"), `pinn-residual.ts` (27 L "proxy"), `pimc-paths.ts` (38 L), `qge-physics.ts` (29 L "proxy"), `qge-aliveness.ts` (42 L). **The facade rot has metastasized into named leaves.** The integration is therefore _fill-the-stubs_, not _create-the-files_ — which is cheaper but demands a stub-honesty test so a real-named-but-fake module can never re-enter the gate.
4. `tsotchke-facade.ts` is imported by **15** modules (not 12) in the live tree.

This blueprint sequences 8 waves to make every named leaf real, retire the facade, and wire the full corpus — finishing each wave with the binding gate (`bun run check`), bench, docs, CHANGELOG, and a THIRD-PARTY-NOTICES row.

---

## 2. Repo→Capability Catalog

| Repo                                                   | Maturity       | Top reusable kernels                                                                                                                                                                                                       | Best integration vector                                                                                                      | Effort | Cosmogonic targets                                                                                                                        |
| ------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Eshkol** (`Eshkol/eshkol_repo`)                      | production-ish | reverse-mode AD tape (`vm_autodiff.c`), forward dual (`vm_dual.c`), hyper-dual Hessian (`vm_hyperdual.c`), factor-graph BP + variational/expected free energy (`vm_inference.c`), GWT softmax broadcast (`vm_workspace.c`) | **reimplement-ts** (NOT buildable: needs LLVM 21, machine has only MinGW GCC 16)                                             | L      | `eshkol-ad.ts` (✅ real, extend), `eshkol-workspace.ts` (stub→real), `active-inference.ts`, `super-mind.ts`, `predictive-coding.ts` (new) |
| **Moonlab** (`mirrors/moonlab/.../core/src`)           | production-ish | Clifford tableau (`clifford.c`), MPS/MPO + bond-χ SVD (`ca-mps.ts`/`tensor-network.ts`), VQE/QAOA, QEC GREEDY/MWPM decoder (`decoder.ts`), Grover                                                                          | **reimplement-ts from C/pure-TS** (WASM core NOT importable; `Math.random` seeds in `clifford.ts`/`quantum-state.ts`)        | L      | `clifford-tableau.ts` (✅), `moonlab-tensor.ts` (stub→real), `ca-mps.ts` (new), `qec-decoder.ts` (new), `vqe-qng.ts` (new)                |
| **quantum_geometric_tensor (QGTL)**                    | research       | QGT/Fubini–Study/Berry, Christoffel connection, SVD-pseudoinverse natural gradient, Fukui–Hatsugai–Suzuki Chern, surface-code QEC                                                                                          | **reimplement-ts** (don't import: `-ffast-math`/`-march=native`, rand() in ~20 wider files)                                  | M      | `quantum-geometry.ts` (✅ deepen), `quantum-natural-gradient.ts` (✅ harden), `chern-number.ts` (new), `super-qubits.ts`                  |
| **libirrep**                                           | production-ish | Wigner small-d/full-D (`wigner_d.c`), Clebsch–Gordan/3j (`clebsch_gordan.c`), point-group projectors (`point_group.c`), real SH, SO(3) toolkit, NequIP equivariant layer                                                   | **reimplement-ts** (clean except one caller-seeded LCG)                                                                      | L      | `irrep-symmetry.ts` (stub→real), `so3.ts` (new), `godform.ts`, `super-body.ts`, `phyla.ts`                                                |
| **spin_based_neural_network**                          | research       | Ising/Hopfield Metropolis (`ising_model.c`), **disordered/SK glass** (`disordered_model.c`), RL over spin states                                                                                                           | **reimplement-ts** (already partial: `spin-glass.ts` ✅)                                                                     | M      | `spin-glass.ts` (extend disordered mode), `collective-spin-market.ts` (new), economy                                                      |
| **quantum_rng** (+classical_rng)                       | research       | quantum-noise gate cascade (✅ ported `eshkol-qrng.ts`), **statistical-test suite** (entropy/χ²/serial-corr/runs), game_rng rotation-prime mixer                                                                           | **reimplement-ts** (entropy core DONE; stats kernel is the new asset)                                                        | M      | `eshkol-qrng.ts` (✅), `rng-stats.ts` (new), `rng.ts` (alt stream), `qrng-bridge.ts` (new)                                                |
| **quantum-quake (QGE)**                                | research       | unitary Schrödinger propagator (`qge_physics.c`), QGE aliveness observable taxonomy (`qge_quantum_runtime.h`)                                                                                                              | **reimplement-ts UNITARY ONLY** (gate: license under `quake/LICENSE.txt` only; `qge_rng.c` = hardware entropy, NEVER import) | M      | `qge-physics.ts` (stub→real), `qge-aliveness.ts` (stub→real), `chaos-field.ts`, `singularities.ts`                                        |
| **PINN**                                               | research       | physics-informed residual operators (Schrödinger/Heat/Wave/Navier–Stokes)                                                                                                                                                  | **reimplement-ts** (pure forward C, clean)                                                                                   | S      | `pinn-residual.ts` (stub→real), `reaction-diffusion.ts`, `atmosphere.ts` (wave step)                                                      |
| **PIMC**                                               | research       | Metropolis path sampler → \|Ψ₀\|², E₀                                                                                                                                                                                      | **reimplement-ts** (Java `Random`→seeded Rng)                                                                                | S      | `pimc-paths.ts` (stub→real), `singularities.ts`, `chaos-field.ts`                                                                         |
| **tensorcore**                                         | research       | SIMD blocked GEMM / conv2d stencil                                                                                                                                                                                         | **reimplement-ts reference** (WASM optional later)                                                                           | S      | `tensor-kernels.ts` (new), RD/wave Laplacian, BENCHMARKS.md                                                                               |
| **logo-lab**                                           | prototype      | `asciiRenderer.js` (CPU scene→glyph), `createMaterialFromProfile` (MeshPhysical), procedural iridescence, ruled-surface geometry, URL/state codecs                                                                         | **ts-import (strip JSX/inline-LCG)** (LICENSE UNVERIFIED — gate)                                                             | M      | `jewel-material.ts` (new), `ascii-pass.ts` (new), `viz3d-substrate.ts` (new), UI codecs                                                   |
| **ulg**                                                | research       | GpuBroker capability probe + lease, WGSL carrier kernel w/ CPU-parity, WorkerSupervisor                                                                                                                                    | **study/ts-import render-only** (NO LICENSE — gated, owner confirm)                                                          | M      | `gpu-broker.ts` (new, render-only; strip `Date.now`), substrate render worker                                                             |
| **ml-legacy** (gpt2-basic/llm-arbitrator/simple_mnist) | research       | fixed-point exp-LUT softmax, Q4 quant (ideas only)                                                                                                                                                                         | **study-only / contrast** (transformer + wall-clock RNG; mandate forbids)                                                    | S      | PHILOSOPHY/BOOK negative reference; Corpus Observatory                                                                                    |
| **deploy-onchain** (SolanaQuantumFlux/Quantum-RNG-API) | production-ish | typed-client facade shape, Swagger REST + healthcheck, N-API binding pattern                                                                                                                                               | **study-only / service-plane** (Solana SDK PROPRIETARY; core already ported)                                                 | S      | provenance closure; out-of-band telemetry templates                                                                                       |
| **corpus-meta**                                        | research       | cross-corpus ERM ontology, substantiated-vs-marketing partition                                                                                                                                                            | **study-only**                                                                                                               | M      | ERM.md/ERD.md/ENTITY-SHEETS.md, frontier reports                                                                                          |

---

## 3. The Integration Matrix

Cosmogonic subsystem (rows) × Tsotchke repos (cols). Cell = `kernel · wave`. Empty cell = no honest contribution.

| Subsystem ↓ / Repo → | Eshkol                 | Moonlab                 | QGTL                  | libirrep                    | spin_nn            | quantum_rng           | quake/QGE                | PINN                  | PIMC                     | tensorcore             | logo-lab              | ulg                  | ml-legacy          | onchain               | corpus-meta      |
| -------------------- | ---------------------- | ----------------------- | --------------------- | --------------------------- | ------------------ | --------------------- | ------------------------ | --------------------- | ------------------------ | ---------------------- | --------------------- | -------------------- | ------------------ | --------------------- | ---------------- |
| **mind**             | AD+BP+GWT ·1-2         | tensor+VQE+QEC ·3-5     | QGT precision ·3      | equivariant head ·5         | instinct vote ·2   | collapse entropy ·1   | —                        | predictive-coding ·D  | —                        | —                      | —                     | —                    | contrast (BOOK) ·8 | —                     | substrate map ·0 |
| **body/forms**       | morph-energy grad ·3   | —                       | —                     | Wigner/CG/SH placement ·1-2 | —                  | —                     | aliveness observable ·5  | —                     | —                        | —                      | jewel material ·1     | —                    | —                  | —                     | —                |
| **world/physics**    | —                      | MPS field compress ·6   | curvature bends G ·3  | equivariant filaments ·6    | —                  | seeded entropy ·4     | Schrödinger wavefield ·2 | PDE residual ops ·2   | ground-state sampling ·4 | GEMM/conv2d stencil ·5 | ruled-surface geom ·1 | —                    | —                  | —                     | —                |
| **quantum-math**     | AD exact-grad ·6       | ca-mps/decoder/vqe ·3-5 | Chern/connection ·2   | —                           | —                  | qrng-bridge ·1        | —                        | —                     | —                        | —                      | —                     | —                    | —                  | —                     | —                |
| **economy/society**  | tâtonnement-grad ·2    | —                       | market fragility κ ·5 | —                           | SK market ·2-3     | —                     | —                        | —                     | —                        | —                      | —                     | —                    | —                  | service (study)       | —                |
| **render/UI**        | —                      | viz3d substrate ·2      | eigen-ellipsoid ·2    | —                           | spin heat-field ·4 | rng-stats readout ·1  | —                        | —                     | —                        | —                      | ascii-pass+jewel ·1   | gpu-broker render ·3 | —                  | REST template (study) | —                |
| **native**           | —                      | C kernels (later)       | SIMD QGT (later)      | C ABI (later)               | —                  | N-API ref             | —                        | —                     | —                        | C/WASM GEMM (later)    | —                     | WGSL ref             | NEON ref (study)   | N-API ref             | —                |
| **observability**    | inference telemetry ·2 | stabilizer snapshot ·1  | Berry/Chern ·2        | —                           | order-param ·3     | **rng-stats gate ·1** | aliveness scalar ·5      | residual telemetry ·2 | —                        | bench ·5               | URL codecs ·1         | —                    | **Observatory ·7** | **Observatory ·7**    | provenance ·0    |

Every repo lands in ≥1 cell; every subsystem gains. ml-legacy/onchain/corpus-meta land honestly in observability/study, never in `think()`.

---

## 4. Unified ERM / ERD / ERP

### Core entities (both corpora reconciled)

```
QuantumState |ψ⟩  ──evolves-under──▶ Hamiltonian/MPO
     │                                    ▲
     ├─measured-by──▶ CliffordTableau ──GF(2)-rank──▶ EntanglementEntropy
     ├─differentiated-by──▶ EshkolDual / ADGraph(tape)
     ├─geometry-of──▶ QGT(Q_μν) ──Re──▶ FubiniStudyMetric ──Im──▶ BerryCurvature ──plaquette──▶ ChernNumber
     │                       └──Christoffel──▶ GeometricConnection
     └─collapsed-through──▶ EshkolQrng(seeded) ──audited-by──▶ StatisticalResult

TensorNetwork/MPS ──bond-χ-SVD──▶ CompressedLatent
IrrepGroup(point-group) ──projector P_μ──▶ SymmetrySector ──Wigner-D──▶ OrientedFeature
SpinGlass(SK couplings) ──Metropolis──▶ Archetype / CollectiveOrder

Mind ──has──▶ Faculty[13] ──votes-on──▶ Plan
Faculty ──reads/writes──▶ {QGT, SpinGlass, Tableau, Holographic, ActiveInference}
Creature ──has──▶ Genome ──decodes──▶ Traits + Body(forms)
Body ──placed-by──▶ Wigner-D/SH(libirrep)
World ──contains──▶ {ChaosField, ReactionDiffusion, Singularities, CosmicWeb}
Economy ──agents──▶ Faction/Titan ──coupled-by──▶ SpinGlass + ActiveInference
```

### Process flows (ERP — every system reads AND writes another, PHILOSOPHY law)

1. **Cognition descent:** `EshkolDual/tape (eshkol-ad.ts)` → exact ∇ of **active-inference** free-energy F → **predictive-coding** layer error → **plan** argmax. _(replaces facade central-difference)_
2. **Qualia tensor:** `super-qubits |ψ⟩` → `moonlab-tensor MPS` low-rank compress of the IMAGINE latent → bounded plan vote. _(replaces truncated dot-product)_
3. **Instinct:** `spin-glass` recall archetype → biases plan; **economy** SK-disordered market → regime flips → loyalty.
4. **Geometry-as-precision:** `QGT volume/Berry/Chern` of the live circuit → learning-rate modulation in predictive-coding + "market fragility κ" in economy + "curved cosmos" G in singularities.
5. **Form equivariance:** `genome traits` → `irrep-symmetry` Wigner-D/CG/point-group → SO(3)-equivariant body parts (a rotated genome → rotated body).
6. **Provenance:** every kernel → THIRD-PARTY-NOTICES row + Corpus Observatory node (closes "every repo utilized").

---

## 5. New Owned Leaves & Facades (Starkiller)

Single owner per leaf; each replaces a specific decorative symbol. **★ = file exists today but is a STUB to be made real (fill, don't create).**

| Module                                                            | Contract sketch                                                                          | Replaces in facade/stub                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/math/eshkol-ad.ts` (✅ real, 532 L)                          | `tape(): {record, backward, grad}` exact reverse-mode                                    | facade `eshkolADGradient` central-diff                 |
| `src/sim/eshkol-workspace.ts` ★                                   | real GWT register/set_content/step + factor-graph BP                                     | `eshkolLogic/Inference/Workspace` EMAs, `gwtBroadcast` |
| `src/sim/predictive-coding.ts` (new)                              | 2–3 layer hierarchical PC; precision-weighted error UP, belief DOWN; uses eshkol-ad grad | Route-D generative core (none today)                   |
| `src/sim/moonlab-tensor.ts` ★ (54 L)                              | real MPS site-tensors + deterministic one-sided SVD bond-χ truncation                    | the relocated truncated dot-product                    |
| `src/math/ca-mps.ts` (new)                                        | Clifford-Assisted MPS on `CliffordTableau`; >8-qubit entangled path                      | `_caMps*` telemetry stubs                              |
| `src/math/qec-decoder.ts` (new)                                   | GREEDY/union-find syndrome decoder; deterministic tie-break                              | absent                                                 |
| `src/math/vqe-qng.ts` (new)                                       | variational loop on `QuantumRegister` via QNG + QGT metric                               | facade `eshkolADGradient`-as-optimizer                 |
| `src/math/chern-number.ts` (new)                                  | Fukui–Hatsugai–Suzuki link-variable Chern                                                | facade `qgtVolume` magic numbers                       |
| `src/sim/irrep-symmetry.ts` ★ (30 L)                              | real Wigner-d (Edmonds) + CG/3j (Schulten–Gordon) + point-group projector                | facade `libirrepClebsch/Wigner/Symmetry`               |
| `src/math/so3.ts` (new)                                           | quaternion↔ZYZ, SLERP, geodesic, Karcher mean; NO sampler                                | ad-hoc Euler in super-body                             |
| `src/sim/qge-physics.ts` ★ (29 L)                                 | unitary split-step Schrödinger on small complex grid; \|ψ\|² field                       | chaos-field "qP wobble" proxy                          |
| `src/sim/qge-aliveness.ts` ★ (42 L)                               | aliveness scalar from purity/Clifford-rank                                               | facade `quakePerturb/quakeQgeFactor`                   |
| `src/sim/pinn-residual.ts` ★ (27 L)                               | Schrödinger/heat/wave/NS residual operators                                              | the Gray-Scott "proxy"                                 |
| `src/sim/pimc-paths.ts` ★ (38 L)                                  | Metropolis path sampler, injected seeded Rng, fixed draw-count                           | absent/proxy                                           |
| `src/sim/tensor-kernels.ts` (new)                                 | blocked GEMM + conv2d, fixed reduction order (bit-identical)                             | scalar Laplacian                                       |
| `src/math/rng-stats.ts` (new)                                     | entropy/χ²/serial-corr/runs/transition-matrix over a sample buffer                       | absent (provenance gate)                               |
| `src/sim/qrng-bridge.ts` (new)                                    | owns one `EshkolQrng` per seeded sub-stream; serves corpus entropy                       | `corpusPulse.rngEntropy` magic                         |
| `src/sim/collective-spin-market.ts` (new)                         | SK disordered lattice over agents; null-by-default `attach()`                            | economy facade constants                               |
| `src/render/jewel-material.ts` (new)                              | `MaterialProfile → MeshPhysicalMaterial` factory + iridescence                           | (render gap)                                           |
| `src/render/ascii-pass.ts` (new)                                  | EffectComposer ShaderPass adapting asciiRenderer                                         | (render gap)                                           |
| `src/sim/viz3d-substrate.ts` (new)                                | pure-trig in-scene QGT eigen-ellipsoid + Clifford sculpture; zero ctx.rng                | 2D-only telemetry                                      |
| `src/render/gpu-broker.ts` (new, **gated on ulg license**)        | render-only WebGPU probe + wasm-cpu fallback; NO Date.now                                | (none)                                                 |
| `src/sim/tsotchke-facade.ts` (**REWRITE→thin shim, then delete**) | re-export real leaves so 15 importers stay green during migration                        | the whole decorative layer                             |

---

## 6. ADRs

**ADR-A — Reimplement-in-TS as the default; WASM only for native batch later; sidecar never in sim.** _Context:_ Moonlab core is WASM-locked (no `dist/`, stale blobs, `$EMSDK` build); Eshkol needs LLVM 21 (absent); QGTL ships `-ffast-math`/`-march=native`. _Decision:_ Port C/TS **algorithms** into pure deterministic TS leaves with seeded Rng. WASM-compile (QGT SIMD, tensorcore GEMM) is permitted **only** behind `native/` for batch throughput, gated by golden-vector parity, never on the sim hot path. _Consequences:_ slower than native but bit-reproducible and contract-owned. _Exit:_ if a kernel is provably too slow even at cognitive cadence, vendor its C via stable ABI into `native/` with a parity test.

**ADR-B — Determinism strategy for imported entropy/FP.** _Context:_ `quantum_rng.c`, `qge_rng.c`, Moonlab `clifford.ts` all read host entropy / `Math.random`. _Decision:_ The `eshkol-qrng.ts` pattern is canonical law — every port replaces `gettimeofday/rdtsc/PID/Math.random` with an injected seeded `Rng`, pins summation/iteration order, fixes SVD sign convention, documents draw-count. _Consequences:_ one deliberate, documented deviation per entropy boundary; bit-identical replay. _Exit:_ a `facade-honesty + stub-honesty` test fails the gate if any sim module imports `Math.random`/`Date.now` or a leaf named for a kernel returns a trivially-detectable proxy.

**ADR-C — The predictive-coding generative core (Route D).** _Context:_ the apex mind needs a real non-transformer generative substrate, not 40 magic-noise facade calls. _Decision:_ build `predictive-coding.ts` (hierarchical free-energy column) reusing `active-inference.ts` belief + `eshkol-ad.ts` gradient; remove the ~40 "Ralph 10x" facade calls in `super-mind.ts` in ONE atomic wave with a re-baselined determinism golden. _Consequences:_ changes the cognition bitstream once (intentional receipt regen). _Exit:_ if PC destabilizes plan voting, keep it behind a bounded vote weight like every other faculty.

**ADR-D — License/credit strategy.** _Context:_ corpus is MIT (c) tsotchke except SolanaQuantumFlux (PROPRIETARY), ulg (NO LICENSE), quantum-quake (license under `quake/` only). _Decision:_ reimplement MIT algorithms into the All-Rights-Reserved tree retaining the MIT notice in THIRD-PARTY-NOTICES (already the proven pattern). **Hard-gate:** do NOT port ulg or SolanaQuantumFlux source until the owner confirms; read `quake/LICENSE.txt` before any QGE port. _Consequences:_ clean provenance; two repos remain study-only until cleared. _Exit:_ owner clearance unlocks ulg render kernels.

**ADR-E — Honestly "utilizing" peripheral repos.** _Context:_ ml-legacy (transformer + wall-clock RNG) and onchain (network/proprietary) violate the non-transformer + determinism laws if wired to cognition. _Decision:_ utilize them via the **Corpus Observatory** (a read-only in-world panel sourcing file-counts/port-lineage/study-notes for all 22 repos) + PHILOSOPHY/BOOK negative-reference prose + THIRD-PARTY-NOTICES, never code in `think()`. _Consequences:_ "every repo wired in" is literally true and architecturally honest. _Exit:_ none — permanent home for study-tier repos.

**ADR-F — Stub-leaf honesty (new, forced by the live tree).** _Context:_ fake math already escaped into honestly-_named_ leaves (`moonlab-tensor.ts`, `irrep-symmetry.ts` "stub"). _Decision:_ add a `tests/stub-honesty.test.ts` asserting each "real-port" leaf passes a behavioral oracle (CG obeys orthonormality, Wigner-d unitarity ≤1e-10, MPS reconstructs a known low-rank tensor, AD matches finite-diff to 1e-7). _Consequences:_ "done" becomes measurable. _Exit:_ none — permanent gate.

---

## 7. Determinism & Security Plan (Manhattan)

- **Entropy boundary (every port):** inject seeded `Rng` from `src/math/rng.ts`; replace `gettimeofday/clock/rdtsc/getpid/Math.random/java.util.Random`. Confirmed hazards to neutralize: `quantum_rng.c:86-265`, `qge_rng.c` (hardware callback — DROP), Moonlab `clifford.ts:77-78` + `quantum-state.ts:607,621`, `simple_mnist.c srand(time)`, logo-lab inline LCG + `Date.now`, ulg `GpuBroker Date.now:94/124/135`.
- **FP tolerances:** all sim-feeding leaves use `Float64Array`, fixed accumulation order (ascending index), NO parallel/tree reduction, NO `-ffast-math` equivalence, NO Float32 intermediates crossing module boundaries. SVD: force first-nonzero-component-positive sign convention. Cap libirrep degree j≤6.
- **Draw-count discipline:** every leaf that draws Rng exposes a CONSTANT documented per-tick draw count; child-seeds derived by XOR of a ctor childSeed, never an extra `rng()` draw.
- **Facade/stub-honesty tests:** (a) no sim module imports `Math.random`/`Date.now` (grep gate); (b) ADR-F behavioral oracles; (c) determinism replay (same seed ⇒ same bitstream) per wave.
- **Provenance:** one THIRD-PARTY-NOTICES row per adopted kernel mapping to exact upstream file + MIT notice; Corpus Observatory node per repo; receipts-law constants re-pinned each wave via `scripts/verify-receipts.ts --print`, regenerated intentionally on cognition-bitstream waves.
- **Gated repos:** ulg (no LICENSE) and SolanaQuantumFlux (proprietary) — no source port until owner confirms; quake license read first.

---

## 8. Wave-Sequenced Kanban

**Wave 0 — STABILIZE.** Green tree, honest baseline. Re-pin receipts-law constants under one chosen Bun, delete stale `law_error.txt`, triage dirty tree, add `tests/stub-honesty.test.ts` scaffold + grep gate for `Math.random`/`Date.now` in sim, register `tsotchke-facade` in MODULE-CONTRACTS.md. Gate: `bun run check` GREEN.

**Wave 1 — Route A entropy + symmetry + render-cheap.** `qrng-bridge.ts`, `rng-stats.ts`, `clifford-backend.ts`, `irrep-symmetry.ts`★, `jewel-material.ts`, `ascii-pass.ts`. Real CG/Wigner-d/point-group; rng quality gate; Clifford large-N substrate; ASCII + jewel render modes. Gate + bench + THIRD-PARTY rows (libirrep, classical_rng, logo-lab[gated]).

**Wave 2 — Eshkol mind core + spin/QGT deepen + viz3d substrate.** `eshkol-ad.ts` (extend), `eshkol-workspace.ts`★, `active-inference.ts` (factor-graph backend), `chern-number.ts`, `viz3d-substrate.ts`, `collective-spin-market.ts`, economy tâtonnement-as-gradient. Exact ∇ free-energy; real GWT; Chern scalar; SK market. **Re-baseline determinism golden (atomic).**

**Wave 3 — Route D predictive-coding + Moonlab tensor + body morph-grad.** `predictive-coding.ts` (new), `moonlab-tensor.ts`★ (real MPS), `so3.ts`, super-body morph-energy gradient, gpu-broker (if ulg cleared). **Remove the ~40 facade noise calls in super-mind (atomic, ADR-C).**

**Wave 4 — world/physics kernels.** `qge-physics.ts`★ (unitary Schrödinger), `pinn-residual.ts`★, `pimc-paths.ts`★, `vqe-qng.ts`. Real wavefield, PDE residual regularizers, ground-state particle placement, variational decision energy. Per-leaf golden vectors.

**Wave 5 — perf + symmetry-equivariant forms + economy inference + QEC.** `tensor-kernels.ts`, `qec-decoder.ts`, `qge-aliveness.ts`★, `agent-inference-economy.ts`, equivariant aspect head, market-fragility κ. Bit-identical GEMM/conv2d (BENCHMARKS.md).

**Wave 6 — far-field + symmetry lattice + Moonlab field compress + facade retirement.** `mps-field.ts`/cosmic-web, `symmetry.ts` filaments, libirrep aspect equivariance, **rewrite `tsotchke-facade.ts` → thin re-export shim**, migrate importers off it, delete magic tables. Gate (all 15 importers green).

**Wave 7 — Corpus Observatory (study-tier utilization).** `observatory.ts` + new Corpus Observatory panel + provenance reader. In-world panel sourcing all 22 repos' file-counts/lineage/study-notes; ml-legacy/onchain/corpus-meta visibly utilized. Docs (PHILOSOPHY/BOOK negative-reference prose) + THIRD-PARTY closure.

**Wave 8 — finish + frontier-report truth-sync.** ERM/ERD/ENTITY-SHEETS reconciled with corpus ontology; frontier reports updated (no laundered marketing numbers); CHANGELOG; final receipts re-pin; full corpus-wired DoD checklist signed. Gate GREEN.

---

## 9. Risks & Open Questions (ranked)

1. **[HIGH] Stub-leaf laundering already happened** — named leaves return proxies. _Mitigation:_ ADR-F behavioral-oracle gate (Wave 0) before any "done" claim.
2. **[HIGH] Atomic cognition-bitstream changes** (Waves 2–3 remove ~40 facade noise calls + swap central-diff→AD) shift every seeded golden. _Mitigation:_ one re-baseline per wave via verify-receipts, recorded as intentional.
3. **[MED] ulg + SolanaQuantumFlux license** (no LICENSE / proprietary). _Mitigation:_ gated study-only until owner confirms; quake LICENSE read first. **UNVERIFIED until owner clears.**
4. **[MED] FP cross-platform drift** in lgamma/Jacobi/Schulten recurrences + SVD. _Mitigation:_ fixed order, sign convention, pinned regression vectors; cap j≤6.
5. **[MED] Bun-version test-count split** (local 1.3.11 → 1054 vs CI 1.3.14 → 1170) blocks locally-verifiable CI-green for any test-adding commit. _Mitigation (Wave 0):_ align local Bun to the CI pin (or vice-versa) and re-pin once.
6. **[LOW] Performance at cadence** — Wigner-D/MPS heavier than O(1) stubs. _Mitigation:_ precompute caches at boot; keep off per-frame/per-particle paths; record in BENCHMARKS.
7. **[LOW] Riemann curvature in QGTL is a stub** — do not present as working. _Mitigation:_ only port Berry (rank-2) + Christoffel; mark Riemann UNVERIFIED.

## 10. Definition of Done

"All of Tsotchke wired into all of Cosmogonic" is measured by:

- **(a)** `tsotchke-facade.ts` deleted; zero sim module imports a decorative/stub symbol (grep gate green).
- **(b)** Every "real-port" leaf passes ADR-F behavioral oracles (CG orthonormality, Wigner-d unitarity, MPS low-rank reconstruction, AD vs finite-diff 1e-7, Schrödinger unitarity, χ² entropy threshold).
- **(c)** Every HOT/WARM repo has ≥1 wired kernel in the Integration Matrix with a passing determinism replay test + a THIRD-PARTY-NOTICES row mapping to exact upstream files.
- **(d)** Every STUDY repo (ml-legacy, onchain, corpus-meta, plus gated ulg/Solana until cleared) appears as a Corpus Observatory node + provenance entry — utilized, never in `think()`.
- **(e)** `bun run check` GREEN (prettier→tsc strict→oxlint→bun test→build) on every wave; receipts-law guard green with intentionally re-pinned constants; BENCHMARKS.md records every new hot path.
- **(f)** PHILOSOPHY "every system reads AND writes another" holds for each new leaf.

The corpus is real, MIT-clean for the cognition tier, and the only thing standing between "decorative" and "total" is execution discipline — which is exactly what BROLY/STARKILLER/MANHATTAN are for. Finish it wave by wave; let each wave end GREEN.
