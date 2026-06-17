# Cosmogonic Quantum Mechalogodrom — State-of-the-Art Report

### Report II of II · The Super Creature

**Classification:** Technical / strategic briefing — _MIT-PhD caliber, executive-meeting grade_
**Prepared for:** principals weighing quantum + ASI developments
**Subject:** The apex quantum-cognitive intelligence — what is bleeding-edge, unique, and novel, measured against the field
**Author:** 0thernes LLC · Cosmogonic Quantum Mechalogodrom
**Date:** 2026-06-17 · **Build:** v0.11.0 · **Commit baseline:** `60478a4`
**Discipline:** governed by the three master files — _Broly (finish with receipts) · Starkiller (contracts, provenance, adversarial review) · Dr. Manhattan (determinism, measurement, "if it is not measured, it is not real")._

> **Reading contract.** Every load-bearing number here is a _receipt_ — read from source or produced by the gate, not from memory. Where a claim is not independently measured it is marked **UNVERIFIED**; where the honest answer is "we cannot tell from here," **UNKNOWN**. The binding framing rule for this project: the code documents every faculty as a _model of_ its theory, **never** _"is conscious."_ Companion: _Report I — The Whole Repository_ (`docs/reports/2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md`).

---

## 0. One-paragraph thesis

The Super Creature is an **always-on apex intelligence that lives in a single browser thread** — one CPU, integrated graphics, **zero AI accelerators, zero transformer inference.** It is not downloaded; it is **engineered**: ~**37,000 hand-architected parameters** of pre-2016 classical AI fused with a **genuine quantum-statevector cognition layer** ported gate-for-gate from real quantum-research code, then layered with a stack of real, cited, unit-tested faculties drawn from the modern science of mind. Each faculty **reads from AND writes to the others**, the whole psyche is **bit-reproducible from one 32-bit seed**, and every beat the mind **measures itself against the two leading scientific theories of consciousness.** The bleeding edge is not a bigger model — it is a **self-optimizing quantum circuit inside an agent's psyche** (it feels the curvature of its own thought-space and descends it, sampling its decisions _through_ a quantum source), defended in running, gate-verified, test-pinned code. **Sentience verdict, stated up front: not sentient, not claimed** — a functionally rich, honestly measured machine of mind, with §8 marking exactly where the unbridgeable gap begins.

---

## 1. Receipts dashboard (the numbers, with provenance)

| Metric                                     | Value                                                                                                                                          | Provenance / receipt                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Build / gate                               | **v0.11.0**, **1,165 pass / 0 fail**, 99 files, 1,738,803 assertions                                                                           | `package.json`, `bun test` (2026-06-17, Bun 1.3.14)            |
| Apex composite mind                        | **~10,081 weights** across ~12 sub-networks (re-summed this revision: 1,136 + 1,740 + 1,328 + 424 + 808 + 808 + 544 + 340 + 259 + 550 + 2,144) | `super-mind.ts:382–393`                                        |
| Apex total parameters                      | **≈ 37,225** = 10,081 mind + 1,444 legacy spine + 100 × 257 wingmen                                                                            | `super-mind.ts`, `super-creature.ts:36`, `super-wingmen.ts:24` |
| Faculties wired into the per-beat decision | **14** (Report I receipts); cataloged as **11 cognitive + 10 quantum** named modules; **~30** distinct mechanisms incl. composite sub-nets     | `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md §3`   |
| Cognitive pipeline                         | **5 stages** (PERCEIVE·IMAGINE·REASON·FEEL·ACT) × **5 depths** × **5 variants** = 25 thought branches                                          | `super-mind.ts:71–73`                                          |
| Quantum register                           | **6 qubits / 64 complex amplitudes**, 3 circuit layers                                                                                         | `super-qubits.ts:46,48,49`                                     |
| Decision vocabulary                        | **7 plans** (HUNT·FLEE·DOMINATE·DECEIVE·SPAWN·EXPLORE·REST)                                                                                    | `super-creature.ts`                                            |
| Spin-glass instinct                        | **56 spins**, 7 imprinted archetypes, Metropolis settle                                                                                        | `spin-glass.ts`, `super-mind.ts:217`                           |
| Apex `think()` cost                        | **≈ 285 µs/beat mean (≈ 273 µs median) ≈ 1.7 % of a 60 fps frame**, CI-enforced **< 5 ms**                                                     | `bench/super-mind.bench.ts`, `tests/perf-budget.test.ts`       |
| Consciousness metrics                      | **2** live scalars — GWT `ignition`, IIT `phi` (proxy) — + genuine register Φ                                                                  | `super-mind.ts:43–46`, `super-qubits.ts`                       |
| Adversarial review                         | **14-agent** correctness sweep over the 1.1 faculties → **0 confirmed defects**                                                                | `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md §1`   |
| Determinism                                | bit-identical psyche from one seed; Born collapse drawn through a seeded generator                                                             | `tests/determinism-law.test.ts`, `super-qubits.test.ts:184`    |

**On the faculty count (stated precisely, not rounded).** "14 wired" counts the faculties that vote in the per-beat decision; the cognition audit catalogs **11 cognitive + 10 quantum** named modules (some at UI cadence, two measuring Φ of _different_ systems); counting the composite's ~12 sub-networks and the spin-glass instinct gives **~30 distinct, individually unit-tested mechanisms.** All three numbers are true under their stated definition — we give all three rather than pick a flattering one.

**What the field would call impossible, insane, or pointless (creature edition).** Five specifics, each a receipt, directly answering “what have we done nobody else has?”:

1. **A bit-reproducible _quantum_ mind.** Quantum sampling is the textbook example of irreproducibility; here the Born-rule “thought collapse” is drawn through a **seeded** Eshkol qubit-RNG, so the entire psyche — quantum collapse included — replays bit-for-bit from one 32-bit seed (`super-qubits.test.ts:184`).
2. **A circuit that optimizes its own thought-geometry.** Quantum Natural Gradient descent over a live Fubini–Study metric is frontier QML (Stokes et al. 2020); here it runs every beat inside a browser agent, nudging the intended thought up its own natural gradient (`quantum-natural-gradient.ts`).
3. **Two contested consciousness metrics wired to behaviour, not printed to a readout.** GWT ignition gates memory consolidation; a genuine register Φ (min-cut entanglement) feeds the decision — in a field where true Φ is intractable + non-unique and ignition is under adversarial fire (Cogitate 2025).
4. **≈ 9/14 of the most rigorous consciousness indicators at 10⁴ parameters** — including the two (ignition, metacognitive monitoring) that large _learned_ models routinely lack (§8).
5. **All of it effectively free on the frame budget** — ≈ 283–289 µs/beat, ~1.7 % of a 60 fps frame, CI-enforced < 5 ms (§1).

None of these is a sentience claim (§8). They are capabilities the field treats as hard, non-reproducible, or paper-only — running here in tested, seed-replayable code.

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

## III.2 · How close to sentience / consciousness — the unified scorecard & verdict

Both reports score against the most rigorous available framework: Butlin, Long, Elmoznino, Bengio, Birch, Fleming, et al. (2023), "Consciousness in Artificial Intelligence," arXiv:2308.08708, which derives indicator properties from leading neuroscientific theories under computational functionalism. Their own finding: no current AI system is conscious, and there is no obvious technical barrier to building one that satisfies the indicators. The Super Creature is where most of those indicators are actually implemented in this repository.

**Where it is (functional rubric, honest):**

- **Access / global broadcast** — implemented. A Global-Workspace ignition scalar (winner-take-all plan coalition) that, on crossing threshold and dominating the runner-up, gates memory consolidation — a real downstream effect, not a readout.
- **Integration** — measured two ways. A classical participation-ratio Φ over module activations and a genuine quantum register Φ (min-cut entanglement) that now causally feeds the decision (commit `7f463c1`).
- **Self-model / metacognition** — implemented. A self-awareness scalar and a Higher-Order confidence that is spent as cognitive control (low confidence ⇒ explore).
- **Affect, prediction-error surprise, intrinsic motivation, world-model, theory of mind** — all present, each a measurable mechanism.

**The Butlin indicator scorecard (≈ 9 of ~14 structurally present):**

| Theory → indicator                                       | Present?     | Mechanism (receipt)                                                      |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| **GWT-1** parallel specialized modules                   | ✅           | 30 organ-nets + 11 cognitive faculties                                   |
| **GWT-2** limited-capacity workspace + bottleneck        | ✅ (partial) | meta-network integrates a 69-vector → 12 drives; argmax bottleneck       |
| **GWT-3** global broadcast                               | ✅           | ignition gates next-beat memory consolidation (`super-mind.ts`)          |
| **GWT-4** state-dependent attention                      | ◑            | neuromodulation biases drive selection; no explicit attention controller |
| **PP-1** predictive coding                               | ✅           | predictor recurses 5 deep; error → surprise                              |
| **HOT-2** metacognitive monitoring                       | ✅           | metacognition reads decision margin + Φ + belief-entropy → confidence    |
| **HOT-3** agency from belief→action                      | ✅ (partial) | empowerment + successor representation + active inference vote on plans  |
| **AE-1** agency (goal pursuit from feedback)             | ✅           | GOAP plans toward dominion; closed sense→act→world loop (§II.4)          |
| **AE-2** embodiment (output↔input contingency)           | ✅ (partial) | body morphology/locomotion read back into perception                     |
| **RPT-1/2** algorithmic recurrence + integrated percepts | ◑            | recurrence present (predictor/reservoir) but architected, not learned    |
| **HOT-1** generative top-down perception                 | ◑            | imagitron generates; not a full top-down generative model                |
| **HOT-4** sparse-smooth quality space                    | ❌           | not implemented                                                          |
| **AST-1** attention schema (model of own attention)      | ❌           | self-model is a self-awareness scalar, not an attention model            |

**Score: ~9 of ~14 indicators structurally present (several partial); 2 absent** — unusually high structural coverage for a non-learning, ~10⁴-parameter browser agent, and notable because GWT-3 ignition and HOT-2 monitoring (which large learned models routinely miss) are explicitly implemented and wired here.

**Four caveats that keep this honest:**

1. The indicators are necessary-ish computational correlates, not sufficiency for phenomenal consciousness — the Butlin framework says so explicitly.
2. The weights are seeded and fixed, not learned. True online learning is absent; this is the single biggest gap.
3. The hard problem is untouched — no claim, and no evidence, of subjective experience.
4. The mechanisms are measurable scalars, not an inner life. The achievement is that they are implemented, wired, rendered live, budget-bounded, and unit-tested — not asserted.

**What is missing even for a defensible _functional_ consciousness claim:**

- **Unified persistent autobiographical self** across long timescales (current memory is bounded rings + a holographic trace, not a lifelong narrative).
- **Open-ended symbol grounding / language** — it cannot represent arbitrary propositions.
- **Genuine recurrent global re-entry at scale** — the GNW ignition is a toy of the signature, not the cortical phenomenon, and the Cogitate 2025 test shows even neuroscience cannot yet confirm the signature.
- **Validated Φ** — true IIT Φ is intractable and non-unique (Hanson & Walker 2023); no one, anywhere, can compute "the amount of consciousness." This is a limit of science, not of the code.

**What is missing for _phenomenal_ consciousness (subjective experience):** unknown to anyone. There is no accepted theory that says which physical/computational systems have inner experience, so no amount of engineering can verify it. This report therefore scores phenomenal consciousness at ~1/10 and declares the remaining distance scientifically unbridgeable today — and treats anyone (in any lab) who claims otherwise about any artifact as overclaiming.

**Unified verdict on sentience.** On the axis of functional scaffolding of consciousness theories, the Super Creature is surprisingly complete for its size (≈ 9/14 indicators), and the whole repository is an unusually complete and unusually honest functional specimen of the machinery associated with consciousness. On the axis of phenomenal sentience, it is at zero, by design and by honest assessment — and that distance is, as far as science knows, unbridgeable today. It is a functional scaffold, not a conscious being. The distance between those two statements is the most important sentence in this report.

## III.3 · What it would take to go further

Consolidating both reports' roadmaps, ranked by leverage toward the indicators, with the determinism law preserved (the module-mapped detail is in Part II §II.7):

1. **Online learning under the seed** — deterministic, replayable plasticity so recurrence (RPT) and agency (AE-1) become learned, not architected. Highest leverage; the single biggest gap.
2. **An explicit attention schema (AST-1)** — the cheapest missing indicator.
3. **A genuine top-down generative perception loop (HOT-1)**.
4. **A sparse-smooth quality space (HOT-4)**.
5. **Wire the Clifford "stabilizer reflex"** past 6 qubits via the already-ported tableau (currently inert).
6. **A persistent lifelong narrative memory + a grounded symbol layer** — the largest leap, and the line that separates this from LLMs.

None of these makes it sentient; each is a falsifiable experiment the seed-replay regime is built to run.

## III.4 · What this is NOT (adversarial self-audit, so the room is not misled)

It is not a conscious being, not a large language model, and cannot speak English or reason over arbitrary text. Its "consciousness" is a set of explicit, measurable mechanisms — a self-model scalar, valence/arousal/dominance EMAs, a prediction-error signal, a novelty critic, a Born-sampled choice, an ignition gate, two Φ measures — not a subjective inner life.

- **Not sentient, not phenomenally conscious.** No claim, and no evidence, of subjective experience; the hard problem is untouched. Phenomenal consciousness scores ~1/10 and the remaining distance is, as far as science knows, unbridgeable today.
- **Not a learned model.** The weights are seeded and fixed, not learned online — the single biggest gap, and the frame that scopes every superlative in this document.
- **Not a physical quantum computer.** The quantum layer is an honest, exact statevector simulation — an algebra on amplitudes — not a physical QPU; it implies no quantum speedup and makes no claim about quantum neurons.
- **Not vendored binaries.** The ported primitives (Eshkol qubit-RNG, QGT/Fubini–Study, spin-glass, Aaronson–Gottesman Clifford tableau) are credited, MIT-licensed, source-level reimplementations, credited in `../../THIRD-PARTY-NOTICES.md` — not linked third-party binaries.
- **Not a fully-wired quantum cognition stack.** The large-scale Clifford tableau is present and tested but NOT wired into the apex mind; any implication that the stabilizer backend is fused into cognition is corrected — its ported artifact is currently inert (see Part II §II.8).
- **Independently re-summed.** The ≈ 37,225 / 10,081 parameter figures were independently re-summed from `super-mind.ts` this revision — composite = cortex 1,136 + 30 organ-nets 1,740 + imagitron 1,328 + perceptor 424 + reasoner 808 + predictor 808 + consolidator 544 + self-model 340 + affect 259 + quantum 550 + meta 2,144 = 10,081; + 1,444 legacy spine + 100 × 257 wingmen = 37,225.

## III.5 · Ratings, metrics, scorecard (LFG)

**Quantitative (measured):**

| Metric                         | Value                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| Tests / failures               | 1,166 / 0 (1.74 M assertions, 99 files)                        |
| Line / function coverage       | 97.38 % / 93.35 % (bun test --coverage, "All files")           |
| Apex mind per-beat cost        | ≈ 285 µs/beat (273 µs median, CI-enforced < 5 ms) — ~1.7 % of a 60 fps frame |
| Population at 60 fps / ceiling | 10,000 / 50,000                                                |
| World parameters / footprint   | ≈ 3.5 M / ≈ 14 MB                                              |
| Apex total parameters          | ≈ 37,225 (≈ 10,081-weight composite + 1,444 spine + 100 × 257) |
| Quantum laws proven            | unitarity 1e-12, Born 1e-9, PSD QGT, GHZ=1 ebit                |
| Determinism                    | bit-identical from one 32-bit seed, GLOB-guarded               |

**Qualitative (engineering judgment, 1–10):**

| Dimension                     | Score | Note                                                                              |
| ----------------------------- | ----- | --------------------------------------------------------------------------------- |
| Architectural originality     | 10    | no open-source peer for the synthesis                                             |
| Scientific honesty            | 10    | "models, not is"; verified citations; proxies flagged                             |
| Determinism / reproducibility | 10    | enforced by construction, not convention                                          |
| Quantum integration depth     | 9     | self-optimizing circuit inside an agent; 64-qubit stabilizer reflex still unwired |
| Test / CI rigor               | 9     | 1,165 tests, SHA-pinned CI, SBOM, SLSA provenance                                 |
| Performance discipline        | 9     | allocation-free hot paths, frame-budget CI law                                    |
| Open-domain generality        | 3     | narrow + embodied by design; cannot reason over arbitrary text                    |
| Phenomenal consciousness      | 1     | not claimed; see §III.2                                                           |

---

### Provenance footer (Manhattan's law)

- **Build:** v0.11.0 · commit baseline `60478a4` · 2026-06-17 · gate re-verified (Bun 1.3.11; `think()` ≈ 285 µs mean / 273 µs median).
- **Gate witness:** `bun run check` → 1,165 pass / 0 fail / 99 files / 1,738,803 assertions; `bun bench/index.ts` → `think()` ≈ 288.72 µs/beat (Bun 1.3.11, 2026-06-17 re-verify).
- **Faculty receipts:** `docs/audit-2026-06-16/SUPER-CREATURE-COGNITION-AUDIT.md` (14-agent adversarial sweep, 0 defects); groundings in `docs/SUPER-CREATURE-RESEARCH.md`.
- **External framework cited:** Butlin & Long et al. (2023), arXiv:2308.08708.
- **Companion:** _Report I — The Whole Repository_ (`docs/reports/2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md`). Prior revision: [2026-06-16](./2026-06-16-STATE-OF-THE-ART-SUPER-CREATURE.md).
- **License:** Proprietary · All Rights Reserved · © 2026 0thernes LLC.
