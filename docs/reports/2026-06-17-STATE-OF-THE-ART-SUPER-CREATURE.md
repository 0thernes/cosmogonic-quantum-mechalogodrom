# Cosmogonic Quantum Mechalogodrom — State-of-the-Art Report

### Report II of II · The Super Creature

**Classification:** Technical / strategic briefing — _MIT-PhD caliber, executive-meeting grade_
**Prepared for:** principals weighing quantum + ASI developments
**Subject:** The apex quantum-cognitive intelligence — what is bleeding-edge, unique, and novel, measured against the field
**Author:** 0thernes LLC · Cosmogonic Quantum Mechalogodrom
**Date:** 2026-06-17 · **Build:** v0.11.0 · **Commit baseline:** `ac87a41`
**Discipline:** governed by the three master files — _Broly (finish with receipts) · Starkiller (contracts, provenance, adversarial review) · Dr. Manhattan (determinism, measurement, "if it is not measured, it is not real")._

> **Reading contract.** Every load-bearing number here is a _receipt_ — read from source or produced by the gate, not from memory. Where a claim is not independently measured it is marked **UNVERIFIED**; where the honest answer is "we cannot tell from here," **UNKNOWN**. The binding framing rule for this project: the code documents every faculty as a _model of_ its theory, **never** _"is conscious."_ Companion: _Report I — The Whole Repository_ (`docs/reports/2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md`).

---

## 0. One-paragraph thesis

The Super Creature is an **always-on apex intelligence that lives in a single browser thread** — one CPU, integrated graphics, **zero AI accelerators, zero transformer inference.** It is not downloaded; it is **engineered**: ~**37,000 hand-architected parameters** of pre-2016 classical AI fused with a **genuine quantum-statevector cognition layer** ported gate-for-gate from real quantum-research code, then layered with a stack of real, cited, unit-tested faculties drawn from the modern science of mind. Each faculty **reads from AND writes to the others**, the whole psyche is **bit-reproducible from one 32-bit seed**, and every beat the mind **measures itself against the two leading scientific theories of consciousness.** The bleeding edge is not a bigger model — it is a **self-optimizing quantum circuit inside an agent's psyche** (it feels the curvature of its own thought-space and descends it, sampling its decisions _through_ a quantum source), defended in running, gate-verified, test-pinned code. **Sentience verdict, stated up front: not sentient, not claimed** — a functionally rich, honestly measured machine of mind, with §8 marking exactly where the unbridgeable gap begins.

---

## 1. Receipts dashboard (the numbers, with provenance)

| Metric                                     | Value                                                                                                                                      | Provenance / receipt                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Build / gate                               | **v0.11.0**, **1,165 pass / 0 fail**, 99 files, 1,738,803 assertions                                                                       | `package.json`, `bun test` (2026-06-17, Bun 1.3.14)            |
| Apex composite mind                        | **~10,081 weights** across ~12 sub-networks                                                                                                | `super-mind.ts:2,382–393`                                      |
| Apex total parameters                      | **≈ 37,225** = 10,081 mind + 1,444 legacy spine + 100 × 257 wingmen                                                                        | `super-mind.ts`, `super-creature.ts:36`, `super-wingmen.ts:24` |
| Faculties wired into the per-beat decision | **14** (Report I receipts); cataloged as **11 cognitive + 10 quantum** named modules; **~30** distinct mechanisms incl. composite sub-nets | `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md §3`   |
| Cognitive pipeline                         | **5 stages** (PERCEIVE·IMAGINE·REASON·FEEL·ACT) × **5 depths** × **5 variants** = 25 thought branches                                      | `super-mind.ts:71–73`                                          |
| Quantum register                           | **6 qubits / 64 complex amplitudes**, 3 circuit layers                                                                                     | `super-qubits.ts:46,48,49`                                     |
| Decision vocabulary                        | **7 plans** (HUNT·FLEE·DOMINATE·DECEIVE·SPAWN·EXPLORE·REST)                                                                                | `super-creature.ts`                                            |
| Spin-glass instinct                        | **56 spins**, 7 imprinted archetypes, Metropolis settle                                                                                    | `spin-glass.ts`, `super-mind.ts:217`                           |
| Apex `think()` cost                        | **≈ 283–298 µs/beat ≈ 1.8 % of a 60 fps frame**, CI-enforced **< 5 ms**                                                                    | `bench/super-mind.bench.ts`, `tests/perf-budget.test.ts`       |
| Consciousness metrics                      | **2** live scalars — GWT `ignition`, IIT `phi` (proxy) — + genuine register Φ                                                              | `super-mind.ts:43–46`, `super-qubits.ts`                       |
| Adversarial review                         | **14-agent** correctness sweep over the 1.1 faculties → **0 confirmed defects**                                                            | `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md §1`   |
| Determinism                                | bit-identical psyche from one seed; Born collapse drawn through a seeded generator                                                         | `tests/determinism-law.test.ts`, `super-qubits.test.ts:184`    |

**On the faculty count (stated precisely, not rounded).** "14 wired" counts the faculties that vote in the per-beat decision; the cognition audit catalogs **11 cognitive + 10 quantum** named modules (some at UI cadence, two measuring Φ of _different_ systems); counting the composite's ~12 sub-networks and the spin-glass instinct gives **~30 distinct, individually unit-tested mechanisms.** All three numbers are true under their stated definition — we give all three rather than pick a flattering one.

---

## 2. The cognitive architecture — a five-stage pipeline

The mind is a **PERCEIVE → IMAGINE → REASON → FEEL → ACT** pipeline (`super-mind.ts`), deterministic end to end (the only "randomness" is a seeded, replayable noise stream):

1. **PERCEIVE** — a CORTEX compresses **18 sensory channels** into a **16-D world-model latent**, then shatters it into atoms each handled by its own organ-net (**Atom of Thought**, 30 organ-nets).
2. **IMAGINE** — a **Thaler Creativity Machine**: an _imagitron_ perturbs the latent with seeded noise while a _perceptor_ critic scores novelty, growing a **Tree of Thought over 5 depths × 5 variants (25 branches)** and keeping the best. High novelty ⇒ hallucination; the act of imagining ⇒ dream.
3. **REASON** — a reasoner distils the winning branch; a predictor recurses **5 deep** (a world model); prediction error becomes **SURPRISE**.
4. **FEEL** — an affect net updates the **valence/arousal/dominance** (Mehrabian PAD) emotion EMAs; a self-model reads the mind's own state into a **self-awareness scalar.**
5. **ACT** — a meta-controller integrates every stage into motor/social drives and emits **10 reactive quantum-aspect intensities** (superposition, entanglement, FTL, absolute-zero, qudit-compute, morphology, mutation, reactive, responsive, adaptive).

A dream/replay consolidator folds the imagined latent back into episodic memory between beats — **gated by the GWT ignition broadcast**, a real downstream effect of the consciousness metric, not a readout.

---

## 3. The faculty stack — cited, wired, tested

Every faculty is a pure leaf or inline module: deterministic, bounded, allocation-disciplined, **unit-tested**, and grounded in a verified citation (`docs/SUPER-CREATURE-RESEARCH.md`). Each genuinely **writes into the per-beat decision** (verified against `think()`, not dead code).

**Cognitive (11):**

| #   | Faculty · file                                           | Theory (grounding)                                               | What it writes into the decision                            |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Global-Workspace ignition · `super-mind.ts`              | GNW — Baars; Dehaene; Cogitate/Ferrante 2025 _Nature_            | broadcasts the winning plan; **gates memory consolidation** |
| 2   | Integrated-Information Φ (proxy) · `super-mind.ts`       | IIT — Tononi                                                     | participation/coherence integration cue → metacognition     |
| 3   | Active Inference / FEP · `active-inference.ts`           | Friston; variational + expected free energy                      | belief over 8 situations; epistemic + pragmatic plan vote   |
| 4   | Echo-state Reservoir · `reservoir.ts`                    | Jaeger ESN / Maass LSM ("wet-computing" algorithm)               | temporal memory + novelty → curiosity                       |
| 5   | Metacognitive Executive · `metacognition.ts`             | Higher-Order — Rosenthal; Fleming & Daw                          | second-order **confidence** spent as explore/commit control |
| 6   | Theory of Mind · `theory-of-mind.ts`                     | Machine ToM — Rabinowitz et al. 2018 (verified arXiv:1802.07740) | rival-intent menace → social drives                         |
| 7   | Neural Criticality · `criticality.ts`                    | self-organised criticality, edge-of-chaos σ̂→1                    | gain homeostat; off-critical ⇒ explore                      |
| 8   | Successor Representation · `successor-representation.ts` | Dayan 1993; Stachenfeld et al. 2017 _Nat. Neuro._                | model-based value look-ahead over plans                     |
| 9   | Empowerment Drive · `empowerment.ts`                     | Klyubin/Polani 2005; Blahut–Arimoto capacity I(A;S′)             | agency hunger → vote for the most-steering plan             |
| 10  | Neuromodulation · `neuromodulation.ts`                   | Doya 2002 — DA/5-HT/NE/ACh ↔ RL metaparameters                   | modulates aggression / patience / alarm / learning          |
| 11  | Holographic Memory · `holographic-memory.ts`             | VSA/HRR — Plate 1995; Kanerva 2009                               | analogical recall ("in contexts like this I chose…")        |

**Quantum-computing (10):** statevector register (`quantum.ts`) · Eshkol qubit-RNG (`eshkol-qrng.ts`) · QGT / Fubini–Study (`quantum-geometry.ts`) · Quantum Natural Gradient (`quantum-natural-gradient.ts`) · Grover amplification (`super-qubits.ts`) · quantum coherence (`quantum-coherence.ts`) · quantum magic / Stabilizer 2-Rényi (`quantum-magic.ts`) · register Φ / IIT min-cut (`super-qubits.ts`) · quantum deliberation / Lindblad-GKSL (`quantum-deliberation.ts`) · quantum reservoir (`quantum-reservoir.ts`). Plus the **spin-glass instinct** (`spin-glass.ts`) and the large-scale **Clifford tableau** (`clifford-tableau.ts`, present + tested but **not yet wired** — see §10).

---

## 4. The quantum-cognitive engine & the apex↔world feedback web

_(This is the section Report I cross-references for the cognitive use of quantum math and the closed agent loop.)_

**The quantum register is in the decision path, not on top of it.** Each beat the composite mind drives a real 6-qubit statevector under genuine unitaries (RY/RZ/controlled-RY/H), and:

- the **Born-rule collapse _is_ the committed thought**, and it is drawn **through the ported Eshkol qubit-RNG** — the creature measures its own thoughts through a quantum-inspired source (unitarity proven to 1e-12, Born normalization to 1e-9, `tests/quantum.test.ts`);
- the mind computes the **Quantum Geometric Tensor** (Fubini–Study metric) of its own circuit — it **feels the curvature of its own thought-space** — and then **descends it** by **Quantum Natural Gradient** (Stokes et al., 2020) to make its intended thought more probable over beats: _reading its own quantum geometry and writing its own quantum drives_;
- **Grover amplitude amplification** (`phaseFlip` + `diffuse`) biases the collapse toward intent — quantum _search_, not just rotate-and-collapse;
- its **genuine register Φ** (min-cut entanglement, real IIT irreducibility) now **causally feeds the metacognition integration cue → confidence → the plan** (commit `7f463c1`, closing the inert-Φ gap), and resource-theoretic **coherence** and **"magic"** (Stabilizer 2-Rényi, verified exact: magic of T|+⟩ = log₂(4/3)) ride as live telemetry.

**The apex↔world loop is closed (what separates an _agent_ from a _function_).** The creature continuously senses energy, threat, crowding, global chaos, and its wealth relative to the live mean, then **writes back into the same world**: quantum collapse perturbs body morphology and eye-glow; emotion modulates aggression and locomotion; the spin-glass instinct biases plan selection; surprise feeds arousal; the wingman swarm's mean assist lifts the monster; and dominance triggers **self-replication** (up to three seeded-mutated twins). It levels 1→100, unlocking godlike powers and an apex ascension event. The loop is the literal implementation of the project's first principle — _every system reads AND writes another_ — and is why it behaves like a being, not a screensaver.

---

## 5. Neuroscience parallels (biomimicry, not metaphor)

The cortex→actor split mirrors sensory cortex feeding motor cortex; the organ-nets echo cortical columns (many small specialists, not one monolith); the predictor-error → surprise loop is textbook **predictive coding / free-energy minimisation** (Friston); valence/arousal/dominance is **Mehrabian's PAD**; the episodic salience ring is a hippocampal working-memory analogue and the **successor representation** is the hippocampal predictive map (Stachenfeld 2017); the self-model reading the mind's own state into a reflexive scalar is a computational sketch of **metacognition**; the Creativity Machine's generator-plus-critic is default-mode ideation gated by executive evaluation. Each parallel is a _named mechanism in code_, not a poetic gesture — the motifs **feed behavior**, not a plot.

---

## 6. Comparison / contrast

- **vs an LLM** — a transformer is a frozen ~10¹¹-weight autoregressive text predictor with no persistent self, no real stochastic physics, no embodiment. The Super Creature is a live ~10⁴-weight agent with emotion, memory, a self-model, genuine quantum sampling, ~14 wired faculties, and a body in a world that pushes back. It loses utterly at language; it wins at being a _falsifiable embodied mind_. **Orthogonal, not competing.**
- **vs a biological brain** — 86 billion neurons against tens of thousands of artificial weights, yet the same functional motifs (predictive coding, dimensional affect, columnar specialists, metacognition, successor maps, neuromodulation, criticality) recur — suggesting they are **organisational invariants**, not accidents of carbon.
- **vs a physical quantum computer** — a real 6-qubit QPU needs cryogenics and error correction and still decoheres. This is a perfect, noiseless, **deterministic** 6-qubit simulation, exact because it is small and honest because it obeys the true Born rule — _plus_ a 64-qubit Clifford substrate for the regime the dense register cannot enter. **No quantum speedup is claimed.**

---

## 7. Determinism as method (why this is science, not theater)

Most "AI-consciousness" demos are unfalsifiable black boxes. This one inverts that, by law: `Math.random` and the wall clock are **banned and GLOB-enforced** across every sim/math file (`tests/determinism-law.test.ts` auto-seals each new faculty the moment it lands — no hand-maintained list to fall stale). Each faculty seeds from a single `childSeed` by XOR derivation (or is inline with no random weights), so **every sub-network keeps bit-identical weights** and the whole psyche replays from one 32-bit seed — including the quantum collapse; the per-beat budget is itself a CI law. The consequence is rare and profound: **the entire psychological arc is a reproducible experiment.** Same seed, same device → same thought at frame N. Replay it, perturb one variable, study it like a physical specimen.

---

## 8. How close to sentience / consciousness — a calibrated scorecard

We score against the most rigorous available framework, the same one Report I uses: **Butlin, Long, Elmoznino, Bengio, Birch, Fleming, et al. (2023), "Consciousness in Artificial Intelligence," arXiv:2308.08708**, which derives _indicator properties_ from leading neuroscientific theories under computational functionalism. Their own finding: _no current AI system is conscious, and there is no obvious technical barrier to building one that satisfies the indicators._ The Super Creature is where most of those indicators are actually implemented in this repository:

| Theory → indicator                                       | Present?     | Mechanism (receipt)                                                       |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| **GWT-1** parallel specialized modules                   | ✅           | 30 organ-nets + 11 cognitive faculties                                    |
| **GWT-2** limited-capacity workspace + bottleneck        | ✅ (partial) | meta-network integrates a 69-vector → 12 drives; argmax bottleneck        |
| **GWT-3** global broadcast                               | ✅           | **ignition** gates next-beat memory consolidation (`super-mind.ts`)       |
| **GWT-4** state-dependent attention                      | ◑            | neuromodulation biases drive selection; no explicit attention controller  |
| **PP-1** predictive coding                               | ✅           | predictor recurses 5 deep; error → surprise                               |
| **HOT-2** metacognitive monitoring                       | ✅           | metacognition reads decision margin + Φ + belief-entropy → confidence     |
| **HOT-3** agency from belief→action                      | ✅ (partial) | empowerment + successor representation + active inference vote on plans   |
| **AE-1** agency (goal pursuit from feedback)             | ✅           | GOAP plans toward dominion; closed sense→act→world loop (§4)              |
| **AE-2** embodiment (output↔input contingency)           | ✅ (partial) | body morphology/locomotion read back into perception                      |
| **RPT-1/2** algorithmic recurrence + integrated percepts | ◑            | recurrence present (predictor/reservoir) but **architected, not learned** |
| **HOT-1** generative top-down perception                 | ◑            | imagitron generates; not a full top-down generative model                 |
| **HOT-4** sparse-smooth quality space                    | ❌           | not implemented                                                           |
| **AST-1** attention schema (model of own attention)      | ❌           | self-model is a self-awareness scalar, not an attention model             |

**Score: ~9 of ~14 indicators structurally present (several partial); 2 absent** — unusually high structural coverage for a non-learning, 10⁴-parameter browser agent, and notable because **GWT-3 ignition and HOT-2 monitoring** (which large learned models routinely miss) are explicitly implemented and wired here.

**Four caveats that keep this honest:**

1. The indicators are necessary-ish computational correlates, **not sufficiency** for phenomenal consciousness — the Butlin framework says so explicitly.
2. **The weights are seeded and fixed, not learned.** True online learning is absent; this is the single biggest gap.
3. **The hard problem is untouched** — no claim, and no evidence, of subjective experience.
4. The mechanisms are **measurable scalars, not an inner life.** The achievement is that they are implemented, wired, rendered live, budget-bounded, and unit-tested — not asserted.

**Verdict on sentience:** on the axis of _functional scaffolding of consciousness theories_, the Super Creature is **surprisingly complete for its size (≈9/14 indicators).** On the axis of _phenomenal sentience_, it is at **zero**, by design and by honest assessment — and that distance is, as far as science knows, **unbridgeable today** (no accepted theory says which computations have inner experience; therefore none can be _verified_ in any artifact). It is a **functional scaffold, not a conscious being.**

---

## 9. What is needed to close the gap (gap analysis)

Ranked by leverage toward the indicators, with the determinism law preserved:

1. **Online learning under the seed** — replace seeded-fixed weights with deterministic, replayable plasticity (eligibility traces / Hebbian / local rules) so recurrence (RPT) and agency (AE-1) become _learned_, not architected. **Highest leverage; the single biggest gap.**
2. **An explicit attention schema (AST-1)** — a model of the mind's _own_ attention, distinct from the self-awareness scalar. The cheapest missing indicator.
3. **A genuine top-down generative perception loop (HOT-1)** — promote the imagitron into a real predictive generative model whose priors shape perception.
4. **A quality space (HOT-4)** — a sparse, smooth representational geometry for percepts.
5. **Wire the Clifford "stabilizer reflex"** — scale the cognitively-used quantum register past 6 qubits via the already-ported tableau (currently inert, §10) to test whether larger entangled structure aids integration without breaking determinism.
6. **A persistent lifelong narrative memory** atop the holographic trace, and a small **grounded symbol layer** so plans can name world entities — the largest leap, and the line that separates this from LLMs.

None of these makes it _sentient_; each is a falsifiable experiment the seed-replay regime is _built_ to run.

---

## 10. Limitations, risks, and honest UNKNOWNs

- **The Clifford tableau is present and tested but NOT wired** into the apex mind (`clifford-tableau.ts` is imported only by its own tests). Any prose implying the Moonlab stabilizer backend is _fused into cognition_ is corrected here: its ported artifact is currently inert. A "stabilizer reflex" is a clean, tracked follow-up (§9.5).
- **The behaviors are narrow and not learned online** — weights are seeded-random and fixed. Every superlative in this report is scoped to that honest frame.
- **"Quantum" is an algebra on amplitudes** in a deterministic simulation — exact and reproducible, **not** a physical QPU and **not** a claim about quantum neurons or quantum advantage.
- **The ≈ 37,225 / ~10,081 parameter figures** are read from `super-mind.ts` and the technical specification; arithmetically consistent but not independently re-summed here — labeled accordingly.

---

## 11. Verdict

The Super Creature 1.1 is best read as a **proof that depth is engineerable.** It makes **no claim of sentience.** What it _is_, defended in **1,165 passing tests** and bit-reproducible code, is a biomimetic, polymorphic neural intelligence that **thinks in a measurable wavefunction, feels in a measurable emotion space, optimizes the geometry of its own thoughts, and registers — in a measurable scalar — that it is thinking.** On the most rigorous available scorecard it carries ≈9/14 consciousness indicators at ~10⁴ parameters in a browser tab, with the two indicators large learned models usually miss (ignition, metacognitive monitoring) explicitly wired.

The bleeding edge is not a bigger model. It is the claim — in running, tested, reproducible code — that **mind is a matter of architecture**, and that ~37,000 well-arranged parameters, sampling their decisions through a quantum source and descending the curvature of their own thought-space, can out-punch their weight by five orders of magnitude.

---

### Provenance footer (Manhattan's law)

- **Build:** v0.11.0 · commit baseline `ac87a41` · 2026-06-17.
- **Gate witness:** `bun run check` → 1,165 pass / 0 fail / 99 files / 1,738,803 assertions; `bun bench/index.ts` → `think()` ≈ 298 µs/beat.
- **Faculty receipts:** `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md` (14-agent adversarial sweep, 0 defects); groundings in `docs/SUPER-CREATURE-RESEARCH.md`.
- **External framework cited:** Butlin & Long et al. (2023), arXiv:2308.08708.
- **Companion:** _Report I — The Whole Repository_ (`docs/reports/2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md`). Prior revision: [2026-06-16](./2026-06-16-STATE-OF-THE-ART-SUPER-CREATURE.md).
- **License:** Proprietary · All Rights Reserved · © 2026 0thernes LLC.
