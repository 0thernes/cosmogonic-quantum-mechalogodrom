# THIRD-PARTY NOTICES — source-level ported algorithms

Cosmogonic Quantum Mechalogodrom is proprietary — All Rights Reserved (see [LICENSE](./LICENSE)).
This file is the **source-level** attribution for algorithms that were ported / adapted into this
project's own TypeScript from third-party research code. It complements [NOTICE.md](./NOTICE.md), which
lists the bundled runtime dependencies and fonts.

The quantum- and spin-mind layer of the apex **Super Creature** adapts four primitives — reimplemented
at the source level, gate-for-gate / equation-for-equation — from the **Tsotchke** quantum research
repositories (some of which also ship inside the **Eshkol** language and the **Moonlab** simulator). The
original works are **MIT-licensed, © 2024–2026 tsotchke**. As required by the MIT License, the permission
notice and copyright are retained below. Our derivative implementations remain governed by this project's
proprietary license while honoring the upstream MIT terms.

## Ported primitives

| Adapted algorithm                                                                                                                                                                                                              | Ported into (ours)                                                                                                               | Upstream source                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quantum Geometric Tensor / Fubini–Study metric** (Re = metric, Im = Berry curvature)                                                                                                                                         | `src/math/quantum-geometry.ts` (`quantumGeometricTensor`), consumed by `src/sim/super-qubits.ts` (`QuantumMind.geometricMetric`) | Tsotchke `quantum_geometric_tensor` (QGTL): `quantum_geometric_metric.c` / `…_curvature.c` / `…_gradient.c`; **Moonlab** `src/algorithms/quantum_geometry/qgt.c` (`qgt_metric_at`) |
| **Quantum-inspired qubit-RNG** (8-qubit phase-array + noise simulator, 16-slot entropy pool, physical-constant mixing cascades, `quantum_noise` / `hadamard`/`phase` gates, Born `measure_state`)                              | `src/math/eshkol-qrng.ts` (`EshkolQrng`)                                                                                         | Tsotchke `quantum_rng` — `src/quantum_rng/quantum_rng.c`; the same primitive ships inside **Eshkol** as the `quantum-random` builtin (`lib/quantum/quantum_rng.c`)                 |
| **Spin-based neural network** (Hopfield/Ising associative memory: Hebbian imprint, Metropolis/Glauber settle, pattern-overlap recall)                                                                                          | `src/sim/spin-glass.ts` (`SpinGlass`)                                                                                            | Tsotchke `spin_based_neural_network` — `ising_model.c` (Metropolis update) + `nqs_gradient.c` (spin-Hamiltonian energy / local field)                                              |
| **Clifford stabilizer tableau** (Aaronson–Gottesman: binary destabiliser/stabiliser tableau, O(n) Clifford gates + O(n²) seeded measurement + GF(2)-rank bipartite entanglement — scales to 32+ qubits past the dense ceiling) | `src/math/clifford-tableau.ts` (`CliffordTableau`)                                                                               | **Moonlab** `src/backends/clifford/clifford.{c,h}` (the `CliffordTableau` / `clifford_*` backend); algorithm: Aaronson & Gottesman, _Phys. Rev. A_ 70, 052328 (2004)               |

### What is **ours** (not ported)

The 64-amplitude statevector simulator itself — `src/math/quantum.ts` (`QuantumRegister` + the
RY / RZ / H / CNOT gate set, Born sampling, reduced-density-matrix Bloch vectors, Shannon entropy) — is
this project's own Moonlab-style implementation, written from a study of the above repositories but not
copied from them. The QGT, the Eshkol measurement source, and the spin-glass instinct are the genuine
ports; they are layered **on top of** our own statevector.

### Determinism deviation (intentional)

The upstream qubit-RNG seeds itself from host entropy (`gettimeofday` / `rdtsc` / PID / ASLR). This
project's determinism law (CLAUDE.md; ADR 0004; `docs/PHILOSOPHY.md`) forbids `Math.random` / `Date.now`
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
