<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# NHSI Research Papers Ledger — the bleeding-edge bedrock, and where it's used

The deep-dive corpus behind Cosmogonic's apex mind, with an honest status per paper:
**APPLIED** = real math wired into `src/`; **STUDIED** = informs the design / validation frame; **ASPIRATIONAL**
= found, not yet implemented (the build queue). Companion to `docs/reports/2026-06-20-RESEARCH-BEDROCK.md`
and `docs/EMERGENCE-BLOCKERS-2026-06-26.md`. No consciousness/sentience is claimed — these operationalize functional
markers (see `THIRD-PARTY-NOTICES.md` honesty frame).

## A · Consciousness theory — APPLIED in code

| Paper                                                              | Used for                                                   | Module                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| Baars / Dehaene — **Global Neuronal Workspace**                    | winner-take-all ignition + broadcast gating consolidation  | `integrated-information.ts`, `super-mind.ts` |
| Tononi — **Integrated Information (IIT) Φ**                        | participation-ratio Φ proxy over module activations        | `integrated-information.ts`                  |
| Albantakis et al. 2023 — **Φ of a quantum mechanism**              | quantum-Φ via register min-cut entanglement                | `super-qubits.ts`                            |
| Friston — **Free Energy Principle / active inference**             | variational + expected free energy (epistemic + pragmatic) | `active-inference.ts`                        |
| Rao & Ballard 1999 — **Predictive coding**                         | recurrent predictor → surprise signal                      | `super-mind.ts` (`MIND_PC_NET`)              |
| Rosenthal/Lau; Fleming & Daw — **Higher-Order metacognition**      | 2nd-order confidence → explore/exploit control             | `metacognition.ts`                           |
| Graziano — **Attention Schema** (partial)                          | attention-confidence self-signal                           | `super-mind.ts` (`attnSchema`)               |
| Klyubin/Polani/Nehaniv 2005 + Blahut–Arimoto                       | **empowerment** channel-capacity agency drive              | `empowerment.ts`                             |
| Plate 1995; Kanerva 2009 — **VSA / HRR**                           | holographic compositional memory (bind/bundle/cleanup)     | `holographic-memory.ts`                      |
| Dayan 1993; Stachenfeld et al. 2017 — **Successor representation** | predictive-map model-based look-ahead                      | `successor-representation.ts`                |
| Lindblad 1976 / **GKSL master equation**                           | open-system deliberation: coherence → decision             | `quantum-deliberation.ts`                    |
| **Self-organized criticality** (branching ratio σ̂→1)               | edge-of-chaos homeostat                                    | `criticality.ts`                             |
| Fujii & Nakajima 2017 — **Quantum reservoir computing**            | 6-qubit register as temporal reservoir                     | `quantum-reservoir.ts`                       |
| **Kuramoto 1975; Strogatz 2000** — coupled oscillators             | binding-by-synchrony resonance integrator (#59)            | `resonance.ts`                               |
| Doya — **neuromodulation / metalearning**                          | DA/5-HT/NE/ACh drive modulation                            | `neuromodulation.ts`                         |
| Izhikevich 2003 — **spiking neuron**                               | cortex temporal dynamics                                   | `super-mind.ts`                              |
| Mehrabian–Russell — **PAD affect**                                 | 3-D emotion biasing drives                                 | `super-mind.ts` (`affect`)                   |
| Premack & Woodruff — **Theory of Mind**                            | opponent modeling                                          | `theory-of-mind.ts`                          |
| Orkin 2006 — **GOAP**                                              | goal-directed plan search                                  | `super-mind.ts` (`reasoner`)                 |
| **Hebb 1949; Ba & Hinton 2016 — fast weights**                     | within-life plastic self-modification (#87/#91)            | `plastic-weights.ts`                         |

## B · Quantum / geometry / symmetry — APPLIED (the Tsotchke substrate + ours)

| Paper                                                      | Used for                                            | Module                         |
| ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| Aaronson & Gottesman 2004 — **stabilizer tableau**         | Gottesman–Knill, 32+ qubit measurement              | `clifford-tableau.ts`          |
| Berry 1984; Provost & Vallée 1980 — **QGT / Fubini–Study** | metric (Re) + Berry curvature (Im) of thought-space | `quantum-geometry.ts`          |
| Stokes et al. 2020 — **Quantum Natural Gradient**          | QFI-descent self-optimization                       | `quantum-natural-gradient.ts`  |
| Leone–Oliviero–Hamma 2022 — **magic / stabilizer-Rényi**   | non-stabilizerness readout (T\|+⟩=log₂(4/3))        | `quantum.ts`                   |
| Born 1926 — **Born rule**                                  | seeded deterministic collapse                       | `eshkol-qrng.ts`               |
| Crank–Nicolson 1947                                        | trace-preserving Schrödinger evolution              | `schrodinger.ts`               |
| Shoemake 1985; Moakher 2002 — **SO(3) / Karcher mean**     | rotation-manifold geometry for body/forms           | `so3.ts`                       |
| Clebsch–Gordan / Wigner-D (libirrep)                       | SU(2) irrep equivariance → morphology               | `irrep.ts`, `libirrep-qec.ts`  |
| Baumgratz–Cramer–Plenio 2014 — coherence measures          | l₁/relative-entropy coherence telemetry             | `quantum-coherence.ts`         |
| Ising / Hopfield / Metropolis (spin-NN)                    | spin-glass instinct (attractor recall)              | `spin-glass.ts`, `hopfield.ts` |

## C · 2025–2026 frontier — STUDIED (informs design + validation)

| Paper                                                                           | Why it matters here                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Ferrante et al. (Cogitate Consortium), Nature 2025** — adversarial GWT-vs-IIT | both theories empirically challenged → we run _many_ theory-organs (N-of-25), not one |
| Butlin et al. 2023 (+ TiCS Jan-2026 rubric) — **14 consciousness indicators**   | the scorecard we measure against (8/14 met + 6/14 partial; the 14/14 build path)      |
| **Foerster, Hutter, Zela et al. (Apr 2026)** — open-ended Petri-NCA             | validates the open-endedness thesis; metric template (novelty + diversity)            |
| **Hyperagents — Darwin-Gödel-machine self-modification (Mar 2026)**             | the self-iteration roadmap for Stratum X                                              |

## D · Frontier — ASPIRATIONAL (found, queued, not yet wired)

| Paper                                                                    | Planned use                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| **Curvature-aware QNG via weighted projective geometry (Dec 2025)**      | extend QNG (#7) — apex self-optimization            |
| **Quantum Geometric Tensor for mixed states (May 2025)**                 | mixed-state QGT/Φ (#8/#56) under decoherence        |
| **Adiabatic fine-tuning of NQS — weight-space phase transitions (2025)** | online NQS/VMC learning (#86)                       |
| Eshkol AD-as-heritable-DNA (bytecode VM live execution)                  | self-differentiating `.esk` genomes (Stratum X #88) |

---

_Counts: ~30 APPLIED · 4 STUDIED · 4 ASPIRATIONAL. "Applied" means a tested module in `src/`, not a citation.
The frontier (C/D) is the deliberate edge — Cogitate-2025 (no single theory wins) is why the architecture is
an N-of-25 ensemble, not a bet on one theory._
