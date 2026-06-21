<!-- Independent deep-dive audit — 21-agent skeptic swarm (4 REAL : >=5 STUB truth table). Verified source of truth for the Tsotchke->Cosmogonic integration state. -->

# TSOTCHKE × COSMOGONIC — INDEPENDENT DEEP-DIVE AUDIT & ASSESSMENT (2026-06-20)

> **⚠ CORRECTION (2026-06-21 · 0thernes directive).** This report's "decorative / stub / laundered /
> trig-surrogate" verdicts target **Cosmogonic's own facade-bridge leaves** (our wiring debt) — **not** the
> **Tsotchke** corpus. Tsotchke's algorithms are **real, correct, MIT-licensed** quantum research; they run
> as exact deterministic simulation and lack only a physical QPU (speed/scale, not correctness). The bridge
> proxies noted here have since been relabeled honestly — see `THIRD-PARTY-NOTICES.md` → **"On Tsotchke —
> binding."** Preserved as a historical record; read its Tsotchke-adjacent framing through this correction.

> Authored as the master architect/engineer of both codebases, under the three governing personas: BROLY (finish/receipts), STARKILLER (contracts/skepticism), MANHATTAN (determinism/measurement — UNKNOWN is a result, never laundered). Every verdict cites a file. Stub counts are stubs; they are never inflated into "wired."

---

## 1. Executive Summary

**Tsotchke** is a real, large, polyglot research corpus (≈13K files, ≈2.1M LOC across ~21 mirrors at `(Tsotchke)/mirrors/`). Its load-bearing pillars are genuine, production-to-research-grade C/C++ engines: **Eshkol** (232K-LOC compiled-Scheme cognitive compiler with first-class automatic differentiation + 22 consciousness primitives), **Moonlab** (≈110K-LOC C quantum simulator: dense statevector, Clifford tableau, tensor networks, VQE/QAOA/Grover/QEC, MIT v1.0.2), **QGTL** (quantum geometric tensor / Fubini–Study / Berry curvature), **libirrep** (SO(3)/SU(2) rep theory + 18-module QEC substrate), and **spin_based_neural_network** (NQS + Ising/Hopfield + topological QC). It is not a hallucination; the mirrors are on disk and were read in full during port verification.

**Cosmogonic Quantum Mechalogodrom** is a deterministic, seeded, 50K-entity WebGL ecosystem (v0.11.0; ~79K LOC, ~64% TS) governed by a strict contract-first architecture (MODULE-CONTRACTS V1+V2, acyclic module graph, full `bun run check` gate, ~1,290 tests / ~94.6% line coverage). Its centerpiece is the **Super Creature**: a ~10K-parameter, ~24-faculty composite "mind" (`src/sim/super-mind.ts`, 1,354 LOC) wired into a real 6-qubit statevector register and a set of ported Tsotchke primitives.

**The single most important honest finding:** the integration is **genuine but narrow and front-loaded into four primitives**. The _core mathematical substrates_ (Eshkol reverse-mode AD, Clifford tableau, QGT/Fubini–Study, spin-glass Hopfield) are **REAL, faithful, deterministic, and live in the per-beat `think()` hot path**. But the _named "Tsotchke corpus" breadth_ — VQE, libirrep QEC/MWPM, QGE/quantum-quake physics — is **decorative**: trig surrogates and constant-ish proxies wearing algorithm names, several citing upstream files that **do not exist**. The owner's mandate ("every aspect of Cosmogonic utilizes everything from Tsotchke") is, by measured evidence, **~25–30% delivered for real**, with the remainder being honest-but-shallow proxies or laundered overclaims in `THIRD-PARTY-NOTICES.md`.

---

## 2. The Tsotchke Corpus

### 2.1 Repo-by-repo capability table

| Repo                                                                                   | Languages                  | ~LOC                                      | Maturity                | Key algorithms                                                                                                                                                                    | Consciousness relevance                                                                              |
| -------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Eshkol**                                                                             | C17/C++20, LLVM IR, Scheme | ~232K                                     | production              | 3-mode AD (symbolic/forward/reverse, 32-level tape); Robinson unification; Friston factor-graph active inference; Baars GWT softmax; OALR arena; HoTT types; 75+ ML builtins      | CORE — AD substrate for all learning; logic/active-inference/GWT as compiler primitives              |
| **Moonlab**                                                                            | C, Python, Rust, TS/WASM   | ~110K core (≈647K w/ bindings)            | production (MIT v1.0.2) | Dense SV ≤32q; Aaronson–Gottesman Clifford tableau; MPS/DMRG/TDVP/CA-MPS; VQE/QAOA/Grover/QPE; 6 QEC families; Bell tests; ML-KEM; Bell-verified QRNG                             | The quantum execution engine; Cosmogonic's `quantum.ts` and `clifford-tableau.ts` derive from here   |
| **QGTL** (`quantum_geometric_tensor`)                                                  | C, CUDA, Metal             | ~50K–370K (disk LOC varies by count)      | research                | Fubini–Study metric; Berry curvature; natural-gradient on CP manifolds; hierarchical tensor nets; surface-code QEC                                                                | Geometric substrate for natural-gradient "instinct"                                                  |
| **libirrep**                                                                           | C11, Python, Rust          | ~95K                                      | production              | Wigner-d (Jacobi recurrence), Clebsch–Gordan (Schulten–Gordon), e3nn tensor products, Heisenberg ED/Lanczos, **18-module QEC substrate (syndrome extraction only — NO decoders)** | Symmetry backbone; QEC _primitives_, not decoders                                                    |
| **spin_based_neural_network**                                                          | C11, SDL2                  | ~72K                                      | production              | NQS (real/complex RBM + stochastic reconfiguration); Ising/Heisenberg/kagome; Berry/Chern; Majorana braiding B⁸=I; toric-code MWPM                                                | Differentiable magnetism/topology; source of the Metropolis/Ising update ported into `spin-glass.ts` |
| **tensorcore**                                                                         | ObjC/Metal, C              | ~117K                                     | production              | Apple-GPU GEMM (17.88 TFLOPS fp16), FlashAttention, quantized GEMV, training kernels                                                                                              | Accelerator — **not wired into Cosmogonic**                                                          |
| **quantum_rng**                                                                        | C                          | ~5–8K                                     | research                | 8-qubit phase-array QRNG, Born-rule sampling, decoherence sim                                                                                                                     | Source of `eshkol-qrng.ts` seeded quantum noise                                                      |
| **classical_rng**                                                                      | C                          | ~3K                                       | production              | constant-rotation mixing, prime seeding, NIST SP 800-22                                                                                                                           | Classical fallback entropy                                                                           |
| **quantum-quake**                                                                      | C, Python                  | ~48K                                      | research                | QGE quantum render path (DWT/IDWT), Gaussian wavepackets on 18q/64³ grid, projectile-authority gate                                                                               | Game-loop as agency measure; **its `qge_physics.c` is a particle system, NOT a QGT module**          |
| **ULG**                                                                                | TS/WASM/WGSL, C            | ~34K                                      | prototype               | PeerCompute + Eshkol + Moonlab browser triad; WebGPU parity gates                                                                                                                 | Browser-native quantum runtime                                                                       |
| **PINN**                                                                               | C, Python                  | ~2–8K                                     | prototype               | PDE residual losses (Schrödinger/Maxwell/heat/NS/wave)                                                                                                                            | Physics-grounded learning — not wired                                                                |
| **PIMC**                                                                               | UNKNOWN                    | UNKNOWN (0 in one survey, ~4K in another) | **UNKNOWN/stub**        | UNKNOWN                                                                                                                                                                           | **UNVERIFIED — do not cite**                                                                         |
| gpt2-basic, llm-arbitrator                                                             | BASIC/Py, TS               | ~18K/8K                                   | production              | **FENCED LLMs** — explicitly excluded from sim determinism                                                                                                                        | none (fenced)                                                                                        |
| simple_mnist, asteroids, logo-lab, SolanaQuantumFlux, Quantum-RNG-API, homebrew-eshkol | C / TS / Scheme            | small                                     | mixed                   | educational NN, terminal game, Three.js material lab, on-chain QRNG, REST QRNG, Eshkol qubit-RNG                                                                                  | peripheral / studied                                                                                 |

> **UNKNOWN preserved:** PIMC source is inaccessible/empty in one survey and ~4K in another; its scope is genuinely UNKNOWN. Noesis/qllm bridges in SbNN are opaque and untested. Eshkol's separate 772K-LOC `eshkol_repo` is catalogued but out-of-scope.

### 2.2 The non-transformer-intelligence thesis

What makes Eshkol + Moonlab + QGT + spin + irrep a _genuine_ alternative to token LLMs is that each pillar supplies a substrate a transformer **does not have**, along **two distinct axes**:

- **Deductive / symbolic axis (Eshkol + libirrep):** Robinson unification, factor-graph belief propagation, and group-representation theory give _exact_ symbolic reasoning and symmetry constraints — knowledge as facts and rules with provable substitution, not next-token statistics. Compiler-integrated AD (`vm_autodiff.c`) makes gradients _exact_ and _first-class_, not framework bolt-ons.
- **Inductive / physical axis (Moonlab + QGT + spin):** statevector/Clifford/tensor-network quantum dynamics, Fubini–Study geometry, and spin-glass attractor recall give learning that is _physically grounded_ — energy minimization, decoherence, natural-gradient geodesics, content-addressable memory. These are inductive engines whose biases come from physics (least action, free energy, criticality), not from a training corpus.

The thesis holds **as a research claim about the corpus**. It does **not yet hold as a claim about Cosmogonic**, because (Section 4) most of the breadth is wired as proxies.

---

## 3. The Cosmogonic Engine

### 3.1 Subsystem map

- **MATH layer** (`src/math/`, ~21 files, ~2.2K LOC): leaf modules, DOM-free, deterministic. Real ports: `eshkol-ad.ts` (532L), `clifford-tableau.ts` (351L), `quantum-geometry.ts` (187L), `hopfield.ts`, `eshkol-qrng.ts`, `mps-svd.ts`, `irrep.ts`. New genuine implementations: `izhikevich.ts`, `predictive-coding.ts`, `schrodinger.ts`. Core: `quantum.ts` (statevector), `rng.ts` (Mulberry32). Stub: `libirrep-symmetry.ts` (self-labeled "SIMPLIFIED APPROXIMATION").
- **MIND layer** (`src/sim/super-*.ts` + faculties): `super-mind.ts` (1,354L) orchestrates a 5-stage pipeline (PERCEIVE→IMAGINE→REASON→FEEL→ACT) over ~24 faculties; `super-qubits.ts` (567L) is a real 6-qubit register; faculties incl. `active-inference`, `spin-glass`, `holographic-memory`, `quantum-deliberation` (Lindblad), `empowerment` (Blahut–Arimoto), `integrated-information` (genuine quantum Φ).
- **WORLD layer** (`src/sim/`, ~61–91 files): entities/phyla/morphotypes, connectome (Hebbian, ~10K links), graph-mind (Louvain+PageRank), reaction-diffusion (Gray–Scott), economy (Nash), NHI, titans/shoggoths/leviathans/puppet-masters, singularities, weather.
- **GOVERNANCE layer**: `masters/*.xml` (3 personas), `CLAUDE.md`, `docs/MODULE-CONTRACTS.md` (V1+V2), `docs/PHILOSOPHY.md`, `scripts/verify-receipts.ts` (fails build if any doc metric disagrees with live gate).

### 3.2 Scale numbers (measured)

50K peak entities (mega tier); ~3.5M params / ~14 MB; 8 factions · 10 titans · 100 puppet-masters · 100 shoggoths · 4 leviathans · Super Creature (~10K composite + 6-qubit) · 100 wingmen. ~79K repo LOC. ~1,290 tests, ~94.6% line / ~91.8% func coverage (Bun-version-jittery: 1045–1170 across runs). Native C++ engine `native/` ~1.3K LOC (Jolt + OpenGL, research).

### 3.3 Architecture posture under the 3 masters

- **STARKILLER (contracts):** strong. Composition root (`world.ts`) wires every system against `MODULE-CONTRACTS.md` signatures; acyclic graph with a type-only hub; leaf modules DOM-free. **Weakness:** the facade (`tsotchke-facade.ts`, imported by ~15 modules) is still decorative, and several ports cite non-existent upstream files — a boundary-honesty violation.
- **MANHATTAN (determinism/measurement):** strong on determinism — no `Math.random`/`Date.now` found in the audited port files; all randomness via injected seeded `Rng`. The receipts gate enforces measured-not-aspirational metrics. **Weakness:** measurement discipline is violated by `THIRD-PARTY-NOTICES.md` claiming gate-for-gate ports for files that are proxies.
- **BROLY (finish/receipts):** mixed. The four real primitives are finished with tests and receipts. The breadth is _not_ finished — it is laundered. Doc-comment cruft ("Ralph 10x", "5 Archons", "CA-MPS hybrid") pollutes otherwise-clean primitives.

---

## 4. Integration State — THE TRUTH TABLE

For every claimed port: verdict, whether it is **live in the per-beat hot path**, the consuming site, and the honest defect. Verdicts come from adversarial source-level diff against the on-disk mirrors.

| #   | Claimed port                                         | Cosmogonic file                                                                  | Upstream (real)                                                                         | Verdict                                                     | Hot path?                 | Honest status                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Eshkol reverse-mode AD (Wengert tape)**            | `src/math/eshkol-ad.ts` (532L)                                                   | Eshkol `lib/backend/vm_autodiff.c`                                                      | **REAL**                                                    | **yes**                   | Near-verbatim gate-for-gate; enum/struct/adjoint rules identical incl. saved-divisor DIV, variable-exponent POW. Live but _narrow_: only one scalar `(pred−imagined)²` surprise gradient per beat in `super-mind.ts:731–738`.                                                                                                                                 |
| 2   | **Clifford stabilizer tableau (Aaronson–Gottesman)** | `src/math/clifford-tableau.ts` (351L)                                            | Moonlab `src/backends/clifford/clifford.c`                                              | **REAL**                                                    | **yes**                   | Faithful gate-for-gate (H/S/CNOT/g/rowsum/measure match C); GF(2)-rank entanglement entropy is an honest TS-only extension; 40-qubit GHZ test passes (genuinely scales past dense register). `new CliffordTableau(16)` at `super-mind.ts:563`, beat reflex feeds attention schema.                                                                            |
| 3   | **QGT / Fubini–Study / Berry curvature**             | `src/math/quantum-geometry.ts` (187L)                                            | QGTL `quantum_geometric_tensor_network.c` + Moonlab `qgt.c`                             | **REAL**                                                    | **yes**                   | Equation-for-equation `Q_ij = ⟨∂ᵢψ\|∂ⱼψ⟩ − ⟨∂ᵢψ\|ψ⟩⟨ψ\|∂ⱼψ⟩`; Re→metric, Im→Berry. One _disclosed_ substitution: central finite-diff vs upstream parameter-shift (both valid estimators). Called every beat via `super-qubits.snapshot()`.                                                                                                                    |
| 4   | **Spin-glass Hopfield/Ising instinct**               | `src/sim/spin-glass.ts` (203L)                                                   | spin_nn `ising_model.c` (Metropolis/energy)                                             | **REAL**                                                    | **yes (conditionally)**   | Metropolis `dE=2·s·field`, `exp(−dE/T)` ported gate-for-gate; Hopfield imprint/overlap are the project's own _correct_ statmech layer (not from the cited file). Live only when an NHI is launched (`world.ts:920`, `frame%18`).                                                                                                                              |
| 5   | **Eshkol QRNG (seeded quantum noise)**               | `src/math/eshkol-qrng.ts` (370L)                                                 | quantum_rng `quantum_rng.c`                                                             | **REAL** (per math-layer audit; not separately diffed here) | yes                       | Seeded port; thought-collapse Born samples drawn through it.                                                                                                                                                                                                                                                                                                  |
| 6   | **Moonlab VQE**                                      | `src/sim/moonlab-vqe.ts` (116L)                                                  | Moonlab `src/algorithms/vqe.c` (~2400L)                                                 | **STUB**                                                    | yes                       | The consumed export `vqeEnergyProxy` is `(cos·cos+1)·0.5·w` — **no Hamiltonian, no Pauli terms, no ansatz, no statevector, no optimizer**. `vqeStep`/`vqeOptimize` are dead code optimizing a 2-D cosine via the (real) AD tape. Repo's own `2026-06-20-MASTER-ARCHITECT-DEEP-DIVE-AUDIT.md:112` already flags it a proxy/stub.                               |
| 7   | **libirrep QEC decoding (MWPM / BP-OSD)**            | `src/sim/libirrep-qec.ts` (174L)                                                 | **cited `src/qec/decoding.c` DOES NOT EXIST**                                           | **STUB / MISSING**                                          | yes                       | Upstream libirrep _explicitly scopes decoders OUT_ (`docs/qec_scoping.md:157`). `mwpmDecode` = 1-D adjacent pairing (no Blossom, distance arg unused); `bpOsdDecode` = fixed 0.7/0.3 smoothing (no parity-check matrix, no message passing, no OSD). Only `qecDecodingProxy` (`max(0,1−w/d²)`) is consumed; the 4 named decoders are dead code. No test file. |
| 8   | **QGE / quantum-quake physics**                      | `src/sim/quantum-quake-physics.ts` (166L)                                        | cited `src/physics/qge_physics.c` wrong (real `qge/qge_physics.c` is a particle system) | **STUB**                                                    | yes                       | `computeQGE` ignores its state arg (`_parameters` unused), returns `1+c·cos(φ)` trig; `berryCurvature` returns `c·sin(...)`; `fubiniStudyDistance` is Euclidean position distance, **not** `arccos\|⟨ψ₁\|ψ₂⟩\|`. Deterministic + bounded, but the math behind every name is fake.                                                                             |
| 9   | **Moonlab tensor-network ops**                       | `src/sim/moonlab-tensor.ts` (~150L) + `tensorContract2` in `quantum-geometry.ts` | Moonlab tensor stack                                                                    | **STUB / decorative**                                       | "yes" but **output dead** | `tensorContract2` is a genuine O(n³) multiply but its output is never read; kept alive by `const _tc2 = tensorContract2; // satisfy noUnused`. `super-mind.ts` writes `this.tensorScratch` which nothing reads.                                                                                                                                               |
| 10  | **libirrep symmetry (Wigner-d/CG)**                  | `src/math/irrep.ts` (148L, REAL) + `src/math/libirrep-symmetry.ts` (138L, STUB)  | libirrep                                                                                | **PARTIAL**                                                 | irrep.ts: limited         | `irrep.ts` is genuine Racah-formula CG + Wigner-d; `libirrep-symmetry.ts` self-labels "SIMPLIFIED APPROXIMATION FOR TESTING" (cos(mφ) fallbacks). Real path is `irrep.ts`; the facade twin is a deprecated stub.                                                                                                                                              |

### 4.1 Tally

- **REAL, faithful, hot-path:** 4 core math primitives (**Eshkol AD, Clifford tableau, QGT, spin-glass**) + Eshkol QRNG (5 total) + `irrep.ts`.
- **STUB / decorative posing as a port:** 4 (**moonlab-vqe, libirrep-qec, quantum-quake-physics, moonlab-tensor**) + `libirrep-symmetry.ts` (and `ulg-bridge.ts`, `qge-aliveness` proxy).
- **MISSING upstream entirely (cited file does not exist):** libirrep-qec `src/qec/decoding.c`; quantum-quake-physics `src/physics/qge_physics.c` (wrong path).
- **Provenance laundering in `THIRD-PARTY-NOTICES.md` (74 lines):** lists VQE, QGE/quantum-quake, and libirrep-QEC as ports the code does not implement — **must be corrected**.

**Bottom line:** of the headline "corpus" claims, **the deep cognitive math (AD/Clifford/QGT/spin) is real and load-bearing; the quantum-application breadth (VQE/QEC/QGE) is decorative.** Real-to-decorative ratio among adversarially-diffed targets is **4 REAL : 3 STUB** on math, worsening to ~**1 : 2** once `moonlab-tensor` and `libirrep-symmetry` are counted.

---

## 5. Compare & Contrast — Arena vs Substrate

|                       | **Cosmogonic (the arena)**                                                                                            | **Tsotchke (the substrate)**                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Strength              | Determinism, contracts, frame budgets, ~1,290 tests, live WebGL embodiment, telemetry/observatories, a _running_ mind | Deep, peer-reviewed-grade algorithms: exact AD, real quantum simulation, geometry, symmetry, QEC                                 |
| What it lacks alone   | **Real algorithmic depth** — without Tsotchke its "quantum cognition" collapses to trig surrogates and MLPs           | **Embodiment, integration, determinism harness, a goal-directed agent to _use_ the math** — Tsotchke is engines without an arena |
| The honest dependency | Cosmogonic needs Tsotchke to make the "non-transformer intelligence" claim true rather than aspirational              | Tsotchke needs Cosmogonic to demonstrate the substrates composed into a single deterministic agent                               |

Cosmogonic without Tsotchke is a beautiful, well-governed simulation whose "quantum mind" is mostly proxy. Tsotchke without Cosmogonic is a shelf of excellent engines with no agent driving them in a closed loop. The four real ports are the only places the fusion is actually _load-bearing_ today.

---

## 6. Gaps to Total Fusion (ranked, with files)

1. **Fix laundered provenance (BLOCKER, MANHATTAN).** `THIRD-PARTY-NOTICES.md` claims gate-for-gate ports for `moonlab-vqe.ts`, `libirrep-qec.ts`, `quantum-quake-physics.ts`. Two cite **non-existent upstream files**. Relabel as "heuristic proxy inspired by" or make real. This is a truthfulness gap, not a feature gap — it ranks first.
2. **Make VQE real or honest** (`src/sim/moonlab-vqe.ts`). Cheapest honest fix: rename to "VQE-flavored energy proxy." Real fix: build a Pauli Hamiltonian + R_y ansatz over the existing `src/math/quantum.ts` statevector, `E=Σcᵢ⟨Pᵢ⟩`, optimize via the **already-real** `eshkol-ad.ts` tape. Currently a 0.03-weighted cosine into `cons.surprise` — low-risk to replace.
3. **Make QEC real or honest** (`src/sim/libirrep-qec.ts`). Port the _real_ upstream primitive `irrep_stabilizer_syndrome` (symplectic H·e from `src/surface_code.c` + `src/stabilizer_group.c`) and implement an actual min-weight matching or sum-product BP. Delete dead `mwpmDecode/bpOsdDecode/surfaceCodeSyndrome/toricCodeSyndrome`; rename the live `qecDecodingProxy` to `defectDensityPenalty`. Add a test.
4. **Make QGE real or honest** (`src/sim/quantum-quake-physics.ts`). Implement `computeQGE` as the genuine Fubini–Study QGT over `src/math/quantum.ts`, `fubiniStudyDistance = arccos|⟨ψ₁|ψ₂⟩|`, Berry curvature as antisymmetric `∂ᵢAⱼ−∂ⱼAᵢ`. Fix the non-existent path citation.
5. **Consume or delete dead tensor wiring.** `tensorContract2` output, `this.tensorScratch`, and the `_tc2`/`_useTensor` `noUnused` crutches in `super-mind.ts` (130, 439–440, 684, 1268–1274) are decorative. Either route into a real MPS computation or remove.
6. **Widen the AD footprint.** `eshkol-ad.ts` is real but computes one scalar/beat; replace the remaining facade central-difference paths (`super-mind.ts:705,709,872,903,1079,1108,1131`) so genuine AD dominates. Harden `adTapePush` (returns `-1` on overflow → `nodes[-1]` NaN) to throw.
7. **Wire WARM tier or fence it.** `izhikevich.ts`, `schrodinger.ts`, `mps-svd.ts`, `quantum-natural-gradient.ts` are real but **not** in the Super Creature loop. Either integrate or document as fenced experiments — do not let them imply integration.
8. **Retire the decorative facade.** `tsotchke-facade.ts` + `libirrep-symmetry.ts` should route through real leaves (`irrep.ts`) or be deleted; 15 importers currently touch a decorative surface.
9. **Resolve UNKNOWNs honestly.** PIMC scope, Noesis/qllm bridges, native-engine determinism remain UNKNOWN — keep them labeled UNKNOWN in specs, not "integrated."
10. **Reconcile spec drift.** ERD/ERM/ERP/PHILOSOPHY/MODULE-CONTRACTS predate the 2026-06-20 blueprint's "Tsotchke as foundation" rewrite; they must be updated to match _reality_ (4 real + N proxies), not the aspirational blueprint.

---

## 7. Risk Register (STARKILLER lens)

| Risk                                                | Severity   | Evidence                                                                                                                                     | Mitigation                                                                                     |
| --------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Overclaim / provenance laundering**               | **HIGH**   | `THIRD-PARTY-NOTICES.md` claims ports for VQE/QEC/QGE that the code doesn't implement; two cite non-existent files                           | Relabel proxies; cite only real upstream files; CI lint for "port of <path>" vs path existence |
| **Stub-as-feature drift**                           | HIGH       | `moonlab-vqe.ts` 116L, `libirrep-qec.ts` 174L, `quantum-quake-physics.ts` 166L all hot-path-wired proxies                                    | A "real-port" registry asserted by `corpus-audit-receipts.ts` with algorithm-fidelity tests    |
| **Spec inconsistency**                              | MEDIUM     | ERM/ERP not updated to post-2026-06-20 reality; blueprint describes ideal end-state as if landed                                             | Audit-and-reconcile pass; specs describe measured state                                        |
| **Determinism (residual)**                          | LOW        | No `Math.random`/`Date.now` in audited files; receipts gate enforces metrics                                                                 | Corpus-wide grep in CI (not yet confirmed run); `adTapePush` NaN-on-overflow foot-gun          |
| **License/scope**                                   | LOW–MEDIUM | Moonlab/libirrep MIT, credited; but FENCED LLMs (gpt2-basic, llm-arbitrator) must stay out of sim; repo is proprietary "All Rights Reserved" | Keep fences; verify MIT attribution matches only the _real_ ports                              |
| **Doc-comment cruft as signal**                     | LOW        | "Ralph 10x", "5 Archons", "CA-MPS hybrid" in clean primitives misrepresent capability                                                        | Strip aspirational headers from `clifford-tableau.ts`, `quantum-geometry.ts`                   |
| **Conditional liveness mistaken for unconditional** | LOW        | spin-glass live only if NHI launched (`world.ts:920`)                                                                                        | Document conditional hot-path activation in contracts                                          |

---

## 8. Recommended Path — Wave Plan (current real-wiring → total fusion)

Each wave names exclusive-ownership leaves, a contract note, and a measurable acceptance test. **HOT** = core cognitive math; **WARM** = physics/symmetry; **STUDY/FENCED** = catalogued only.

### Wave 0 — Truth Reconciliation (BLOCKER, owns docs only)

- **Leaves:** `THIRD-PARTY-NOTICES.md`, `docs/reports/*`, `tsotchke-facade.ts` headers.
- **Contract:** No file may claim "port of `<path>`" unless `<path>` exists upstream and the algorithm matches.
- **Acceptance:** a CI test (`verify-receipts.ts` extension) fails if any `THIRD-PARTY-NOTICES` "port" entry maps to a file whose cited upstream path is absent. **Pass = 0 phantom citations.**

### Wave 1 — HOT: Widen real AD dominance

- **Leaves:** `src/math/eshkol-ad.ts` (harden overflow), `super-mind.ts` (replace facade central-diff at the 7 cited lines).
- **Contract:** all gradient consumers in `think()` read the real tape; central-difference facade removed.
- **Acceptance:** unit test asserts AD gradient == analytic derivative to 1e-6 on 5 ops; `super-mind` surprise gradient comes from `adBackward`, verified by a tape-call counter ≥ N/beat.

### Wave 2 — HOT: VQE made real

- **Leaves:** `src/sim/moonlab-vqe.ts` (rewrite over `src/math/quantum.ts`), reuse `eshkol-ad.ts`.
- **Contract:** `vqeEnergy(H, θ) = Σcᵢ⟨Pᵢ⟩` on a real statevector; optimizer via real AD.
- **Acceptance:** recovers H₂ ground-state energy to within tolerance of Moonlab's reference (`E≈−1.137 Ha` for the toy Hamiltonian); test compares against a fixed Pauli-string Hamiltonian.

### Wave 3 — WARM: QEC syndrome + a real decoder

- **Leaves:** `src/sim/libirrep-qec.ts`, new `src/math/qec-syndrome.ts`.
- **Contract:** port `irrep_stabilizer_syndrome` (symplectic H·e); implement one genuine decoder (min-weight matching on the defect graph).
- **Acceptance:** on a distance-3 surface code, decoder corrects all weight-1 errors and a documented fraction of weight-2; test seeded + deterministic.

### Wave 4 — WARM: QGE/quantum-quake made real

- **Leaves:** `src/sim/quantum-quake-physics.ts`.
- **Contract:** `computeQGE`/`fubiniStudyDistance`/`berryCurvature` compute the genuine geometric quantities over `src/math/quantum.ts`.
- **Acceptance:** `fubiniStudyDistance(ψ,ψ)=0`, `=π/2` for orthogonal states; Berry curvature antisymmetric — closed-form tests pass.

### Wave 5 — WARM: Tensor networks load-bearing

- **Leaves:** `src/sim/moonlab-tensor.ts`, `src/math/mps-svd.ts`, remove dead `tensorContract2` wiring.
- **Contract:** an MPS truncation actually feeds a Super Creature decision (e.g., entanglement-aware plan score).
- **Acceptance:** Eckart–Young best-rank-χ error bound test; a `think()` vote demonstrably changes with bond dimension.

### Wave 6 — WARM: Symmetry + spiking integration

- **Leaves:** `irrep.ts` (promote over `libirrep-symmetry.ts`, delete the stub), `izhikevich.ts` (wire a spiking reflex).
- **Acceptance:** CG coefficients match Racah reference to 1e-10; a spiking unit fires in the loop and shifts arousal telemetry.

### Wave 7 — STUDY / FENCED

- **Catalogue only:** tensorcore (accelerator), PINN, ULG, SolanaQuantumFlux, on-chain QRNG; **fence** gpt2-basic, llm-arbitrator (no sim coupling).
- **Acceptance:** Corpus Observatory panel lists studied-not-wired repos honestly; CI fence test ensures fenced LLMs are never imported by `src/sim/`.

---

## 9. Verdict

How far are we from _"every aspect of Cosmogonic utilizes everything from Tsotchke"_? **Honestly, about a quarter of the way — and the quarter that exists is the right, hard quarter.** The deepest, most credible substrates — Eshkol reverse-mode AD, the Aaronson–Gottesman Clifford tableau, the QGT/Fubini–Study geometry, and the spin-glass Hopfield instinct — are **genuine, faithful-to-source, deterministic, and live in the per-beat `think()` loop**, with passing discriminating tests and a 40-qubit GHZ proving real scale. That is a real non-transformer cognitive core, not theater. But the _breadth_ the mandate demands — VQE, libirrep QEC/MWPM, QGE/quantum-quake physics, Moonlab tensor networks — is currently **decorative trig and constant-ish proxies**, several citing upstream files that do not exist, and laundered into `THIRD-PARTY-NOTICES.md` as ports they are not. The corpus is real; four of its primitives are really fused; the rest is honest-looking scaffolding that must either be made real (Waves 2–6) or relabeled as proxy (Wave 0). Until then, the truthful claim is: **"Cosmogonic's apex mind genuinely runs on four ported Tsotchke quantum/AD primitives, with a roadmap — not a reality — for total corpus fusion."**

---

### Key files cited

- REAL ports: `src/math/eshkol-ad.ts`, `src/math/clifford-tableau.ts`, `src/math/quantum-geometry.ts`, `src/sim/spin-glass.ts`, `src/math/eshkol-qrng.ts`, `src/math/irrep.ts`
- STUB ports: `src/sim/moonlab-vqe.ts`, `src/sim/libirrep-qec.ts`, `src/sim/quantum-quake-physics.ts`, `src/sim/moonlab-tensor.ts`, `src/math/libirrep-symmetry.ts`
- Orchestration / wiring: `src/sim/super-mind.ts`, `src/sim/super-qubits.ts`, `src/world.ts`, `src/sim/super-body.ts`, `src/sim/nhi-system.ts`
- Governance / provenance: `THIRD-PARTY-NOTICES.md`, `docs/MODULE-CONTRACTS.md`, `scripts/verify-receipts.ts`, `docs/reports/2026-06-20-MASTER-ARCHITECT-DEEP-DIVE-AUDIT.md`
- Upstream mirrors: `(Tsotchke)/mirrors/moonlab/src/backends/clifford/clifford.c`, `.../src/algorithms/vqe.c`, `(Tsotchke)/mirrors/libirrep/{src/surface_code.c,src/stabilizer_group.c,docs/qec_scoping.md}`, `(Tsotchke)/mirrors/quantum-quake/qge/qge_physics.c`, `(Tsotchke)/mirrors/quantum_geometric_tensor/...`
- UNKNOWN (preserved): `(Tsotchke)/mirrors/PIMC`, SbNN `noesis_bridge.c` / `qllm_bridge`, `native/` determinism
