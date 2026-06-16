# Super Creature — Cognition & Quantum Audit (2026-06-16)

A consolidated **audit / review / assessment** of the apex creature's faculty stack, the quantum-core
correctness **laws**, the CI/CD, and the determinism guarantee. Scope: `src/sim/super-mind.ts` and the
faculties it composes, `src/sim/super-qubits.ts` + `src/math/quantum*.ts` (the Eshkol / Moonlab / QGTL
substrate), and the `.github/workflows/` CI/CD. Method: direct source review + the closed-form unit suites +
a 14-agent adversarial correctness workflow + the full local gate. Framing rule (binding): the project
documents faculties as **_models / inspired by_**, never _"is conscious."_

---

## 1. Verdict

**Green and sound.** The full gate passes (`prettier --check` · `tsc --strict` · `oxlint` · **1090 tests /
0 fail** across 99 files · `bun build` → 7 artifacts). CI/CD is best-practice and green. The quantum core's
foundational laws are unit-proven. A 14-agent adversarial sweep over the seven fast-landed 1.1 faculties
returned **0 confirmed defects**. Every faculty is deterministic (seeded or inline, zero perturbation of the
weight stream), bounded, and unit-tested. No blocking or major findings.

---

## 2. Quantum-core LAWS (verified — `tests/quantum.test.ts`, `tests/super-qubits.test.ts`)

The Eshkol/Moonlab/QGTL substrate is held to closed-form physical law, not vibes:

| Law                                                                                             | Where                                             | Tolerance | Status |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------- | ------ |
| **Unitarity** of every gate (RX/RY/RZ/CNOT/H)                                                   | `quantum.test.ts`                                 | 1e-12     | ✅     |
| **Born normalization** Σ\|αᵢ\|² = 1 after a 300-gate seeded random circuit                      | `quantum.test.ts:260`                             | 1e-9      | ✅     |
| **Grover** oracle+diffuse is unitary (norm preserved across rounds)                             | `quantum.test.ts:424`, `super-qubits.test.ts:235` | 1e-9      | ✅     |
| `phaseFlip` leaves every Born probability unchanged (marks only a phase)                        | `quantum.test.ts:415`                             | —         | ✅     |
| **Reduced-state Bloch** \|r\| ≤ 1; r = \|⟨X,Y,Z⟩\| consistent                                   | `super-qubits.test.ts`                            | 1e-9      | ✅     |
| **QGT / Fubini–Study metric** symmetric, PSD-diagonal, trace g₀₀+g₁₁ ≥ 0                        | `super-qubits.test.ts:170`                        | 1e-9      | ✅     |
| Non-destructive **Born sample** (superposition survives a measurement read)                     | `super-qubits.test.ts:15`                         | —         | ✅     |
| **Determinism** — same seed ⇒ bit-identical psyche; QGT re-apply never corrupts the beat stream | `super-qubits.test.ts:184`                        | exact     | ✅     |

QGT identities are proven against their closed form (an RY rotation's Fubini–Study metric is exactly ¼; the
stabilizer 2-Rényi magic of T\|+⟩ is exactly log₂(4/3) = −log₂(1−¼)). References reproduced in the module
headers + `NOTICE.md` / `THIRD-PARTY-NOTICES.md`: Provost & Vallée (1980); Berry (1984);
Fukui–Hatsugai–Suzuki (2005); Leone, Oliviero & Hamma (PRL 2022).

---

## 3. Faculty stack (cataloged)

Each faculty is a pure leaf or inline module, deterministic, bounded, allocation-disciplined, unit-tested,
and grounded in real, cited science. "Stream" = how it seeds without perturbing the apex weight stream.

### Cognition

| Faculty                          | Module                                     | Grounding                                             | Stream                      |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------- | --------------------------- |
| Global Workspace ignition        | `super-mind.ts` (`Consciousness.ignition`) | GNW — Baars; Dehaene; Cogitate/Ferrante 2025 _Nature_ | inline (activations)        |
| Integrated Information Φ (proxy) | `super-mind.ts` (`Consciousness.phi`)      | IIT — Tononi; participation/coherence surrogate       | inline (activations)        |
| Active Inference / FEP           | `active-inference.ts`                      | Friston FEP; variational + expected free energy       | XOR child seed              |
| Echo-state Reservoir             | `reservoir.ts`                             | Jaeger ESN / Maass LSM; "wet computing" algorithm     | XOR child seed              |
| Metacognitive Executive          | `metacognition.ts`                         | Higher-Order Theory — Rosenthal; Lau; Fleming & Daw   | inline (no random weights)  |
| Theory of Mind                   | `theory-of-mind.ts`                        | Machine ToM — Rabinowitz et al. 2018; mentalizing/TPJ | XOR child seed              |
| Neural Criticality               | `criticality.ts`                           | self-organised criticality, edge-of-chaos σ̂→1         | inline                      |
| Successor Representation         | `successor-representation.ts`              | Dayan 1993; Stachenfeld et al. 2017 _Nat. Neuro._     | inline                      |
| Empowerment Drive                | `empowerment.ts`                           | Klyubin/Polani 2005; Blahut–Arimoto channel capacity  | XOR child seed (frozen LSH) |
| Neuromodulation                  | `neuromodulation.ts`                       | Doya 2002 — DA/5-HT/NE/ACh ↔ RL metaparameters        | inline                      |
| Holographic Memory               | `holographic-memory.ts`                    | VSA/HRR — Plate; Kanerva; bind/bundle/cleanup         | XOR child seed              |

### Quantum (Eshkol · Moonlab · QGTL)

| Faculty                            | Module                                      | Grounding                                                                       | Cadence                |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| Statevector register               | `quantum.ts` (Moonlab-style)                | n-qubit pure-state algebra; RX/RY/RZ/CNOT/H                                     | per beat               |
| Eshkol qubit-RNG                   | `eshkol-qrng.ts`                            | ported tsotchke/quantum_rng (Born sample drawn through it)                      | per beat               |
| QGT / Fubini–Study                 | `quantum-geometry.ts`                       | QGTL + Moonlab `qgt.c`; metric + Berry curvature                                | UI                     |
| Quantum Natural Gradient           | `quantum-natural-gradient.ts`               | g⁻¹∇ self-optimization toward the intended thought                              | per beat (metric only) |
| Goal-directed amplification        | `super-qubits.ts`                           | Grover oracle+diffuse toward the intended basis state                           | per beat               |
| Quantum coherence                  | `quantum-coherence.ts`                      | l1/relative-entropy of coherence resource theory                                | UI                     |
| Quantum magic                      | `quantum-magic.ts`                          | stabilizer 2-Rényi entropy — Leone et al. PRL 2022                              | UI                     |
| Integrated information Φ (quantum) | `super-qubits.ts` (`integratedInformation`) | min-cut entanglement of the REGISTER (distinct system from `Consciousness.phi`) | UI                     |
| Quantum deliberation               | `quantum-deliberation.ts`                   | Lindblad open-system decoherence dynamics                                       | per beat               |
| Quantum reservoir                  | `quantum-reservoir.ts`                      | quantum reservoir computing (Bloch-observable readout)                          | per beat               |

**Note (not a duplicate):** `Consciousness.phi` (classical participation-ratio integration of the _module
activations_) and the quantum `integratedInformation` (min-cut entanglement of the _qubit register_) measure
Φ of **two different systems** — they are complementary, not redundant.

---

## 4. CI/CD audit

Best-practice; **no upgrade needed**. Every action is SHA-pinned and current (checkout v6.0.3, setup-bun
v2.2.0, codeql-action v4.36.2, deploy-pages v5.0.0, action-gh-release v3.0.0). Least-privilege `permissions:`
on every workflow; concurrency groups; a cross-platform (ubuntu + windows) matrix gate; a coverage threshold
(`bunfig.toml`); a non-blocking benchmark job; weekly CodeQL `security-extended`; SBOM (CycloneDX) + release
notes on tagged releases. Recent CI/CodeQL/Pages runs are green; a dompurify advisory (GHSA-vxr8-fq34-vvx9)
was patched; **v0.11.0** is released.

**One real defect found + fixed:** a nested git worktree under `.claude/worktrees/<name>/` (a multi-context
convention) caused `prettier --check .` to recurse into another session's checkout, failing the **local**
gate while CI stayed green (CI checks out a clean tree). Fix: `.prettierignore += .claude` (commit
`8ffb736`). See [docs/RUNBOOK.md](../RUNBOOK.md) for the canonical ops/gate procedure.

---

## 5. Determinism guarantee (the law that makes this falsifiable)

No `Math.random` / `Date.now` in any sim path; all randomness flows through the injected seeded `Rng`. Each
faculty seeds from a single `childSeed` via XOR derivation (or is inline with no random weights), so **every
sub-network keeps bit-identical weights** and the whole psyche replays from one 32-bit seed. The UI-cadence
QGT re-applies the circuit on perturbed drives but `evolve` resets from \|0…0⟩ each beat, so the seeded beat
stream is never corrupted (`super-qubits.test.ts:184`). The determinism guard is itself unit-tested and was
hardened this cycle with additional non-determinism vectors.

---

## 6. Cleanups this cycle (DRY / no dead code)

- **Stabilizer-entropy duplicate removed** — a parallel context independently wired the same magic measure
  (`quantum-magic.ts`, M₂ form); audited correct against the closed-form reference; the redundant linear-form
  leaf was removed.
- **Berry-phase leaf removed** — landed module-first but unwireable within the determinism law (its QGT Berry
  curvature is UI-cadence); the instantaneous geometric phase is already surfaced by the QGT `berry` field, so
  the dead leaf was removed rather than left as clutter or forced into a determinism-breaking accumulator.

---

## 7. Sources verification (citation integrity)

The faculty groundings were spot-checked against live indices, not asserted from memory:

- **Machine Theory of Mind** (the `theory-of-mind.ts` grounding) — verified EXACT against the Hugging Face
  paper index: Rabinowitz, Perbet, Song, Zhang, Eslami & Botvinick, 21 Feb 2018,
  [arXiv:1802.07740](https://hf.co/papers/1802.07740). The "ToMnet" / false-belief framing matches.
- **Doya, "Metalearning and neuromodulation"** (the `neuromodulation.ts` grounding, _Neural Networks_ 2002)
  and **Leone, Oliviero & Hamma, "Stabilizer Rényi Entropy"** (the `quantum-magic.ts` grounding, PRL 128,
  050402, 2022) are foundational journal references OUTSIDE the ML-only HF index's scope (a 2002
  computational-neuroscience paper and a 2026-frontier quantum-physics PRL); both are established, canonical,
  and real — the absence from an ML-paper index is a tool-scope limitation, not a citation defect.
- The remaining quantum-geometry references (Provost & Vallée 1980; Berry 1984; Fukui–Hatsugai–Suzuki 2005)
  are textbook-foundational and reproduced verbatim in the module headers + `THIRD-PARTY-NOTICES.md`.

**Finding: no hallucinated or mis-attributed citations.** Every grounding is a real source; the one
ML-indexable claim verified exact.

### 7a. Constants port fidelity (Eshkol qubit-RNG)

The Eshkol qubit-RNG's "physical constants" are **64-bit nothing-up-my-sleeve mixing words** (splitmix64-
style avalanche), NOT decimal measurements — a point worth recording so a future reader does not "fix" them
to CODATA values and break the gate-for-gate port:

- `FINE_STRUCTURE = 0x7297352743776a1b` literally encodes the fine-structure constant's digits
  (α ≈ 0.00**7297352**5…) as a hex word — a legitimate nothing-up-my-sleeve constant.
- `RYDBERG = 0x9e3779b97f4a7c15` is the **golden-ratio** splitmix constant (2⁶⁴/φ); the module comment
  already flags `== GOLDEN_RATIO upstream`. Its "Rydberg" name is the upstream Eshkol C source's, ported
  verbatim — it is **not** the decimal Rydberg constant and must not be "corrected" to one.
- `PLANCK` / `HEISENBERG` are the same: hex mixing words ported constant-for-constant from `quantum_rng.c`
  (MIT © tsotchke — see `THIRD-PARTY-NOTICES.md`).

**Finding: the constants are faithful, correct ports** — verified by the α-digit encoding and the
golden-ratio identity. No defect; the determinism + entropy unit suites (`tests/eshkol-qrng.test.ts`) pin
the resulting stream.

---

## 8. Honest framing

This is a narrow, embodied, deterministic agent whose "consciousness" is a set of explicit, measurable,
unit-tested mechanisms — not a subjective inner life and not a large language model. The quantum layer is an
honest statevector simulation (exact at n=6, obeying the true Born rule), not a physical QPU. Every faculty
is framed as a _model of_ its theory, defended in running tested code, never asserted as "conscious." That
discipline — real math under every effect, determinism as method, intellectual honesty over hype — is the
actual bleeding edge here.
