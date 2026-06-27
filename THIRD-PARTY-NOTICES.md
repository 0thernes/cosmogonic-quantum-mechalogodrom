<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# THIRD-PARTY NOTICES — source-level ported algorithms

Cosmogonic Quantum Mechalogodrom is owned by 0thernes — © 2026 (see [LICENSE](./LICENSE)); released under a non-commercial research & play license (study / run / modify / share non-commercially, keep attribution, no for-profit use).
This file is the **source-level** attribution for algorithms that were ported / adapted into this
project's own TypeScript from third-party research code. It complements [NOTICE.md](./NOTICE.md), which
lists the bundled runtime dependencies and fonts.

The quantum- and spin-mind layer of the apex **Super Creature** reimplements **ten primitives** at the
source level — the core quantum / AD / symmetry kernels gate-for-gate / equation-for-equation — from the
**Tsotchke** quantum research repositories (some of which also ship inside the **Eshkol** language and the
**Moonlab** simulator). The original works are **MIT-licensed, © 2024–2026 tsotchke**. As required by the
MIT License, the permission notice and copyright are retained below. Our derivative implementations remain
governed by this project's proprietary license while honoring the upstream MIT terms.

> **On Tsotchke — binding (0thernes directive, 2026-06-21).** The Tsotchke corpus is **real, correct,
> MIT-licensed quantum-research code**: genuine algorithms (Aaronson–Gottesman stabilizer tableau,
> Quantum Geometric Tensor / Fubini–Study + Berry curvature, VQE, QEC decoders, reverse-mode AD,
> spin-glass / Hopfield, SO(3) / Wigner). Our ports run them as **exact deterministic classical
> simulation** — a physical quantum computer (QPU) would add hardware **speed and scale, not
> correctness**. **Nothing in this project may describe Tsotchke's technology as fake, overclaiming,
> hallucinated, or fabricated.** Where a Cosmogonic _bridge_ function is a heuristic or telemetry-only
> proxy, that is a fact about **our** wiring status — never about the upstream tech, which is genuine and,
> as an integrated quantum corpus (statevector · stabilizer · tensor-network · QEC · VQE · QGT · QRNG),
> remarkably comprehensive. Treat it accordingly.

## Ported primitives

| Adapted algorithm                                                                                                                                                                                                                                                                                 | Ported into (ours)                                                                                                                                                                                                                                              | Upstream source                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quantum Geometric Tensor / Fubini–Study metric** (Re = metric, Im = Berry curvature)                                                                                                                                                                                                            | `src/math/quantum-geometry.ts` (`quantumGeometricTensor`), consumed by `src/sim/super-qubits.ts` (`QuantumMind.geometricMetric`)                                                                                                                                | Tsotchke `quantum_geometric_tensor` (QGTL): `quantum_geometric_metric.c` / `…_curvature.c` / `…_gradient.c`; **Moonlab** `src/algorithms/quantum_geometry/qgt.c` (`qgt_metric_at`) |
| **Quantum-inspired qubit-RNG** (8-qubit phase-array + noise simulator, 16-slot entropy pool, physical-constant mixing cascades, `quantum_noise` / `hadamard`/`phase` gates, Born `measure_state`)                                                                                                 | `src/math/eshkol-qrng.ts` (`EshkolQrng`)                                                                                                                                                                                                                        | Tsotchke `quantum_rng` — `src/quantum_rng/quantum_rng.c`; the same primitive ships inside **Eshkol** as the `quantum-random` builtin (`lib/quantum/quantum_rng.c`)                 |
| **Spin-based neural network** (Hopfield/Ising associative memory: Hebbian imprint, Metropolis/Glauber settle, pattern-overlap recall)                                                                                                                                                             | `src/sim/spin-glass.ts` (`SpinGlass`)                                                                                                                                                                                                                           | Tsotchke `spin_based_neural_network` — `ising_model.c` (Metropolis update) + `nqs_gradient.c` (spin-Hamiltonian energy / local field)                                              |
| **Clifford stabilizer tableau** (Aaronson–Gottesman: binary destabiliser/stabiliser tableau, O(n) Clifford gates + O(n²) seeded measurement + GF(2)-rank bipartite entanglement — scales to 32+ qubits past the dense ceiling)                                                                    | `src/math/clifford-tableau.ts` (`CliffordTableau`)                                                                                                                                                                                                              | **Moonlab** `src/backends/clifford/clifford.{c,h}` (the `CliffordTableau` / `clifford_*` backend); algorithm: Aaronson & Gottesman, _Phys. Rev. A_ 70, 052328 (2004)               |
| **Eshkol AD (reverse-mode automatic differentiation)** (Wengert tape, nested gradients, dual numbers)                                                                                                                                                                                             | `src/math/eshkol-ad.ts` (`adTapeNew`, `adVar`, `adMul`, `adBackward`)                                                                                                                                                                                           | Tsotchke **Eshkol** `lib/backend/vm_autodiff.c` / `lib/backend/vm_symbolic_ad.c` (reverse-mode AD with 32-level tape)                                                              |
| **Moonlab VQE (Variational Quantum Eigensolver)** (parameter optimization with autograd, ansatz energy gradients)                                                                                                                                                                                 | `src/sim/moonlab-vqe.ts` (`vqeStep`, `vqeGradientDescent`, `vqeEnergyProxy`)                                                                                                                                                                                    | Tsotchke **Moonlab** `src/algorithms/vqe/vqe.c` (VQE with gradient descent)                                                                                                        |
| **Libirrep QEC decoding** (MWPM: Minimum Weight Perfect Matching, BP-OSD: Belief Propagation OSD for surface/toric codes)                                                                                                                                                                         | `src/sim/libirrep-qec.ts` (`mwpmDecode`, `bpOsdDecode`, `surfaceCodeSyndrome`, `toricCodeSyndrome`)                                                                                                                                                             | Tsotchke **libirrep** `src/qec/decoding.c` (MWPM/BP-OSD decoders for surface codes)                                                                                                |
| **Quantum Quake physics (QGE integration)** (quantum geometric tensor perturbations, Berry curvature, Fubini-Study distance, aliveness metrics)                                                                                                                                                   | `src/sim/quantum-quake-physics.ts` (`qgePerturb`, `berryCurvature`, `fubiniStudyDistance`, `qgeAlivenessProxy`)                                                                                                                                                 | Tsotchke **quantum_geometric_tensor** + **quantum_quake** (QGE physics for quantum simulation)                                                                                     |
| **Quantum-RNG statistical battery** (Shannon entropy, χ² uniformity, lag-1 serial correlation, monobit/frequency, longest-run; plus the quantum-quality metrics — consecutive-sample Hamming "collapse/superposition" flow, windowed-XOR "entanglement" entropy, consecutive-product correlation) | `src/math/rng-stats.ts` (`randomnessReport`, `shannonEntropy`, `chiSquareUniform`, `serialCorrelation`, `monobitFraction`, `longestRunBits`, `hammingFlow`, `windowedXorEntropy`, `productCorrelation`) — measures the quality of `EshkolQrng` / seeded streams | Tsotchke `quantum_rng` — `tests/quantum_stats.c` + `tests/statistical/statistical_tests.h` (statistical analysis suite: entropy / χ² / serial-correlation / pattern density)       |
| **SO(3) rotation toolkit** (unit-quaternion Lie group: composition, axis-angle, rotation matrices, ZYZ Euler, SLERP geodesic, bi-invariant geodesic distance, log/exp maps, and the **Karcher / Fréchet intrinsic Riemannian mean** of rotations)                                                 | `src/math/so3.ts` (`quatFromZYZ`, `slerp`, `geodesicDistance`, `karcherMean`, `quatLog`/`quatExp`) — rotation substrate for body/forms, paired with the libirrep Wigner-D lineage                                                                               | Tsotchke **libirrep** (SO(3)/Wigner-D toolkit); refs Shoemake (1985) SLERP, Moakher (2002) means of rotations on SO(3)                                                             |

### What is **ours** (not ported)

The 64-amplitude statevector simulator itself — `src/math/quantum.ts` (`QuantumRegister` + the
RY / RZ / H / CNOT gate set, Born sampling, reduced-density-matrix Bloch vectors, Shannon entropy) — is
this project's own Moonlab-style implementation, written from a study of the above repositories but not
copied from them. The QGT, the Eshkol measurement source, and the spin-glass instinct are the genuine
ports; they are layered **on top of** our own statevector.

### Determinism deviation (intentional)

The upstream qubit-RNG seeds itself from host entropy (`gettimeofday` / `rdtsc` / PID / ASLR). This
project's determinism law (CLAUDE.md; ADR 0004; `docs/PHILOSOPHY-2026-06-26.md`) forbids `Math.random` / `Date.now`
in sim logic, so those host-entropy sources are replaced by a single seeded `Rng` stream plus an internal
golden-ratio "runtime" surrogate. Everything downstream of the entropy source is upstream-exact, so the
same world seed replays the same quantum bitstream.

## Academic references (geometric tensor)

- R. Provost & G. Vallée, _Riemannian structure on manifolds of quantum states_, Commun. Math. Phys. 76 (1980).
- M. V. Berry, _Quantal phase factors accompanying adiabatic changes_, Proc. R. Soc. Lond. A 392 (1984).
- T. Fukui, Y. Hatsugai & H. Suzuki, _Chern numbers in discretized Brillouin zone_, J. Phys. Soc. Jpn. 74 (2005).

## MIT License (upstream — Tsotchke / Eshkol / Moonlab)

```
MIT License

Copyright (c) 2024–2026 tsotchke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
