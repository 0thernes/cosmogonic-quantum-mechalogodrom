<!-- reviewed: 2026-07-10 | statevector-RNG provenance correction | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# THIRD-PARTY NOTICES — source-level ports, adaptations, and provenance

Cosmogonic Quantum Mechalogodrom is owned by 0thernes — © 2026 (see [LICENSE](./LICENSE)); released under a non-commercial research & play license (study / run / modify / share non-commercially, keep attribution, no for-profit use).
This file is the **source-level** attribution for algorithms that were ported / adapted into this
project's own TypeScript from third-party research code. It complements [NOTICE.md](./NOTICE.md), which
lists the bundled runtime dependencies and fonts.

The quantum- and spin-mind layer of the apex **Super Creature** contains a mixture of compatible
source-level algorithm ports and independent deterministic adaptations informed by **Tsotchke**, **Eshkol**,
and **Moonlab**. The table states the relationship for each entry; –adapted— must not be read as
gate-for-gate parity. MIT notices are retained below for the MIT-licensed upstream works. Repositories with
different or missing licenses are governed by the per-repository boundaries in
[the integration map](./docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md).

> **Tsotchke evidence boundary (updated 2026-07-10).** The corpus contains substantive implementations
> of stabilizer, tensor-network, QEC, VQE, QGT, AD, spin/Hopfield, symmetry, and RNG techniques. License,
> maturity, and integration depth differ by repository and are never inferred from the corpus as a whole.
> Cosmogonic's runtime evidence is deterministic classical simulation; it does not establish physical-QPU
> speedup, hardware entropy, cryptographic security, or experimental quantum behavior. A local bridge or
> facade is described as such without diminishing or inflating its upstream source.

## Ported primitives

| Adapted algorithm                                                                                                                                                                                                                                                      | Ported into (ours)                                                                                                                                                                                                                           | Upstream source                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quantum Geometric Tensor / Fubini–Study metric** (Re = metric, Im = Berry curvature)                                                                                                                                                                                 | `src/math/quantum-geometry.ts` (`quantumGeometricTensor`), consumed by `src/sim/super-qubits.ts` (`QuantumMind.geometricMetric`)                                                                                                             | Tsotchke `quantum_geometric_tensor` (QGTL): `quantum_geometric_metric.c` / `…_curvature.c` / `…_gradient.c`; **Moonlab** `src/algorithms/quantum_geometry/qgt.c` (`qgt_metric_at`)                                                                      |
| **Deterministic statevector RNG adaptation** (2–8 classical-simulated qubits, unitary gates, Born collapse, snapshot/restore, and diagnostic repetition/adaptive-proportion-style counters); independent adaptation, **not** the former phase-array gate-for-gate port | `src/math/deterministic-statevector-rng.ts`; compatibility API `src/math/eshkol-qrng.ts` (`EshkolQrng`)                                                                                                                                      | Tsotchke `quantum_rng` **v3.0.1**, commit `a00ad483cbbef31ea7536f09ae99409d81c9a823`; MIT reference implementation. The Cosmogonic code is deterministic simulation, not hardware entropy, a CSPRNG, SP 800-90B certification, or native-source parity. |
| **Spin-based neural network** (Hopfield/Ising associative memory: Hebbian imprint, Metropolis/Glauber settle, pattern-overlap recall)                                                                                                                                  | `src/sim/spin-glass.ts` (`SpinGlass`)                                                                                                                                                                                                        | Tsotchke `spin_based_neural_network` — `ising_model.c` (Metropolis update) + `nqs_gradient.c` (spin-Hamiltonian energy / local field)                                                                                                                   |
| **Clifford stabilizer tableau** (Aaronson–Gottesman: binary destabiliser/stabiliser tableau, O(n) Clifford gates + O(n²) seeded measurement + GF(2)-rank bipartite entanglement — scales to 32+ qubits past the dense ceiling)                                         | `src/math/clifford-tableau.ts` (`CliffordTableau`)                                                                                                                                                                                           | **Moonlab** `src/backends/clifford/clifford.{c,h}` (the `CliffordTableau` / `clifford_*` backend); algorithm: Aaronson & Gottesman, _Phys. Rev. A_ 70, 052328 (2004)                                                                                    |
| **Eshkol AD (reverse-mode automatic differentiation)** (Wengert tape, nested gradients, dual numbers)                                                                                                                                                                  | `src/math/eshkol-ad.ts` (`adTapeNew`, `adVar`, `adMul`, `adBackward`)                                                                                                                                                                        | Tsotchke **Eshkol** `lib/backend/vm_autodiff.c` / `lib/backend/vm_symbolic_ad.c` (reverse-mode AD with 32-level tape)                                                                                                                                   |
| **Moonlab VQE (Variational Quantum Eigensolver)** (parameter optimization with autograd, ansatz energy gradients)                                                                                                                                                      | `src/sim/moonlab-vqe.ts` (`vqeStep`, `vqeGradientDescent`, `vqeEnergyProxy`)                                                                                                                                                                 | Tsotchke **Moonlab** `src/algorithms/vqe/vqe.c` (VQE with gradient descent)                                                                                                                                                                             |
| **Libirrep QEC decoding** (MWPM: Minimum Weight Perfect Matching, BP-OSD: Belief Propagation OSD for surface/toric codes)                                                                                                                                              | `src/sim/libirrep-qec.ts` (`mwpmDecode`, `bpOsdDecode`, `surfaceCodeSyndrome`, `toricCodeSyndrome`)                                                                                                                                          | Tsotchke **libirrep** `src/qec/decoding.c` (MWPM/BP-OSD decoders for surface codes)                                                                                                                                                                     |
| **Quantum Quake physics (QGE integration)** (quantum geometric tensor perturbations, Berry curvature, Fubini-Study distance, aliveness metrics)                                                                                                                        | `src/sim/quantum-quake-physics.ts` (`qgePerturb`, `berryCurvature`, `fubiniStudyDistance`, `qgeAlivenessProxy`)                                                                                                                              | Tsotchke **quantum_geometric_tensor** + **quantum_quake** (QGE physics for quantum simulation)                                                                                                                                                          |
| **RNG statistical diagnostics** (Shannon entropy, χ² uniformity, lag-1 serial correlation, monobit/frequency, longest-run, Hamming flow, windowed-XOR entropy, and product correlation); diagnostic names do not prove quantumness or entropy security                 | `src/math/rng-stats.ts` (`randomnessReport`, `shannonEntropy`, `chiSquareUniform`, `serialCorrelation`, `monobitFraction`, `longestRunBits`, `hammingFlow`, `windowedXorEntropy`, `productCorrelation`) — measures seeded simulation streams | Tsotchke `quantum_rng` — `tests/quantum_stats.c` + `tests/statistical/statistical_tests.h` (statistical analysis suite: entropy / χ² / serial-correlation / pattern density)                                                                            |
| **SO(3) rotation toolkit** (unit-quaternion Lie group: composition, axis-angle, rotation matrices, ZYZ Euler, SLERP geodesic, bi-invariant geodesic distance, log/exp maps, and the **Karcher / Fréchet intrinsic Riemannian mean** of rotations)                      | `src/math/so3.ts` (`quatFromZYZ`, `slerp`, `geodesicDistance`, `karcherMean`, `quatLog`/`quatExp`) — rotation substrate for body/forms, paired with the libirrep Wigner-D lineage                                                            | Tsotchke **libirrep** (SO(3)/Wigner-D toolkit); refs Shoemake (1985) SLERP, Moakher (2002) means of rotations on SO(3)                                                                                                                                  |

### What is **ours** (not ported)

The statevector simulators — `src/math/quantum.ts` (`QuantumRegister`) and
`src/math/deterministic-statevector-rng.ts` — are this project's own implementations written with
upstream provenance but not copied gate-for-gate. The QGT and spin/Hopfield paths retain their separate
attributed algorithm lineage. `src/math/eshkol-qrng.ts` now preserves an existing API over the independent
statevector adaptation; it is no longer an Eshkol phase-array measurement-source port.

### Deterministic adaptation (intentional)

The upstream QRNG uses host/hardware entropy pathways. Cosmogonic's determinism law (CLAUDE.md; ADR 0004;
`docs/PHILOSOPHY-2026-06-26.md`) forbids unseeded randomness and clocks in simulation logic. The local
implementation therefore uses an explicitly seeded classical statevector model whose snapshot replays the
same stream. This is a different execution contract, not an entropy-source substitution that preserves
gate-for-gate upstream equivalence.

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
