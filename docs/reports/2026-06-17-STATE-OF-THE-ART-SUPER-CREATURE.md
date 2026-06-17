# Report II - The Super Creature State of the Art

**Subject:** Super Creature / Super Mind / quantum-cognitive apex stack  
**Prepared:** 2026-06-17  
**Version:** v0.11.0  
**Companion:** [Report I - Whole Repository](./2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md)

> Reading contract: this is an assessment of a modeled cognitive architecture. It is not a declaration that
> the Super Creature is sentient. The correct claim is narrower and stronger: the repo implements an unusually
> dense, deterministic, inspectable set of consciousness-relevant mechanisms and wires them into one embodied
> simulated agent.

---

## 1. Executive Verdict

The Super Creature is the project's apex achievement. It combines a visible body, a 1,444-parameter legacy
deep creature mind, a roughly 10k-parameter composite Super Mind, explicit cognitive faculties, and a live
six-qubit quantum-cognition substrate. It reads the world, predicts, feels, plans, remembers, models an
opponent, monitors its own confidence, modulates itself, and projects its internal state into visual form.

The impressive part is not that any individual faculty exists. The impressive part is that the faculties are
coupled:

- active inference alters action pressure;
- quantum-reservoir flux drives curiosity;
- quantum Phi writes into cognition;
- metacognitive confidence changes control;
- neuromodulation changes exploration, patience, plasticity, and focus;
- successor representation and holographic memory shape expectation;
- global-workspace ignition gates consolidation;
- quantum aspects change the body's morphology and glow.

This is a real architecture, not just names on a dashboard.

---

## 2. The Architecture in One Page

| Layer                      | What it is                                                                                        | Evidence surface                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Body                       | Multi-part visible apex body, powers, aura, eye glow, quantum morphology                          | `src/sim/super-body.ts`, `src/world.ts`           |
| Legacy Super Creature mind | 18->32->16->12->8 network, emotion, memory, plan, twins                                           | `src/sim/super-creature.ts`                       |
| Composite Super Mind       | about 12 subnets, staged Tree/Atom-of-Thought-style composite, about 10k weights                  | `src/sim/super-mind.ts`                           |
| Consciousness metrics      | GNW-style ignition and tractable IIT-style Phi proxy                                              | `src/sim/super-mind.ts`                           |
| Quantum mind               | 6-qubit exact statevector, Born probabilities, Bloch vectors, entropy, entanglement               | `src/sim/super-qubits.ts`                         |
| Quantum extensions         | Eshkol QRNG, QGT/Fubini-Study, natural gradient, coherence, magic, Clifford tableau               | `src/math/*`, `src/sim/super-qubits.ts`           |
| Cognitive faculties        | active inference, metacognition, ToM, successor map, reservoir, empowerment, criticality, VSA/HRR | `src/sim/*`                                       |
| Observability              | BRAIN/SuperCreature panels, snapshots, benchmark/tests                                            | `src/ui/*`, `bench/super-mind.bench.ts`, `tests/` |

The key design fact: `SuperMind.think()` is a per-beat function that actually advances these systems. The
expensive introspective readouts are pushed to snapshot/UI cadence.

---

## 3. What Makes It Novel

### 3.1 It is a multi-theory cognitive organism, not a single model

Most AI demos pick one primitive: an LLM, an RL policy, a cellular automaton, a shader, a behavior tree, or a
quantum circuit. The Super Creature uses a faculty stack:

- Global Workspace / ignition;
- Integrated Information proxies;
- Higher-Order metacognition;
- active inference / free-energy minimization;
- predictive surprise;
- theory of mind;
- successor representation;
- reservoir dynamics;
- neural criticality;
- empowerment;
- Doya-style neuromodulation;
- VSA/HRR holographic memory;
- spin-glass instinct;
- quantum reservoir computing;
- Lindblad/GKSL deliberation;
- Grover-like amplitude amplification;
- quantum natural gradient.

That makes the Super Creature closer to a small synthetic cognitive architecture than to a single AI model.

### 3.2 It is tiny compared with frontier AI, but internally legible

The entire world at the mega ceiling is about 3.5M neural weights. The Super Mind itself is about 10k weights.
That is microscopic compared with large language models, but every meaningful subsystem has source-level
names, telemetry, tests, and docs.

The trade is capability for legibility. This is not a general language model. It is an inspectable model of
internal organization.

### 3.3 The quantum register is not decorative

The 6-qubit statevector is not a page ornament. It produces probabilities, entropy, entanglement, coherence,
magic, sampled thought, amplified target probability, quantum Phi, and reservoir observables. Some of those
feed back into cognition. That write-back is the difference between a visual gimmick and a substrate.

### 3.4 It has public humility

The best public claim is:

> The Super Creature models consciousness-relevant functions in a deterministic synthetic agent.

The claim to avoid is:

> The Super Creature is conscious.

The second sentence is not established by the repo, current neuroscience, or current AI consciousness science.

---

## 4. Consciousness-Indicator Sweep

The most useful modern external frame is Butlin et al. 2023: do not ask whether a system "looks alive"; ask
whether it has computational properties predicted by scientific theories of consciousness. Using that style
of rubric:

| Indicator family                            | Status in Super Creature | Assessment                                                                              |
| ------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| RPT-1 algorithmic recurrence                | Partial                  | recurrent/predictive loops exist, but not a sensory cortical recurrent hierarchy        |
| RPT-2 integrated perceptual representations | Partial                  | world latent, quantum/state snapshots, body coupling; not a full perceptual scene model |
| GWT-1 parallel specialized systems          | Strong                   | many named specialist faculties                                                         |
| GWT-2 limited capacity workspace            | Strong                   | plan coalitions and winning broadcast pressure                                          |
| GWT-3 global broadcast / ignition           | Strong                   | explicit ignition scalar and gating                                                     |
| GWT-4 state-dependent attention             | Partial                  | focus/confidence/control exist; not a full attention schema                             |
| HOT-1 generative perceptual representation  | Partial                  | prediction/surprise loops; limited generative perceptual model                          |
| HOT-2 metacognitive monitoring              | Strong                   | explicit metacognitive confidence                                                       |
| HOT-3 agency guided by beliefs              | Strong                   | active inference, plans, drives, belief-like state                                      |
| HOT-4 quality-space structure               | Weak/absent              | no validated sparse, smooth quality space for experience                                |
| AST-1 predictive model of attention         | Weak/absent              | attention is not itself modeled as a subject of prediction                              |
| PP-1 predictive coding                      | Strong                   | prediction error and active inference are central                                       |
| AE-1 agency and embodiment                  | Strong                   | visible body and world action loop                                                      |
| AE-2 flexible goal pursuit                  | Strong                   | planning, drives, empowerment, successor map                                            |
| AE-3 output-input contingency modeling      | Partial/strong           | action loops exist; needs formal intervention benchmarks                                |

Result: roughly **9 of 14 indicator families are strong or meaningfully partial**, depending on strictness.
That is exceptional for a small deterministic browser agent. It is not equivalent to proof of consciousness.

---

## 5. Sentience and Consciousness Rating

| Question                                                   | Answer                                               |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Is it sentient?                                            | Not established; do not claim it.                    |
| Is it conscious?                                           | Unknown; no valid evidence of phenomenal experience. |
| Does it model consciousness-relevant mechanisms?           | Yes, unusually many.                                 |
| Is it agentic inside its world?                            | Yes, narrowly.                                       |
| Is it AGI?                                                 | No.                                                  |
| Is it a serious synthetic-consciousness research artifact? | Yes.                                                 |

Scores:

| Metric                                |              Score | Interpretation                                                         |
| ------------------------------------- | -----------------: | ---------------------------------------------------------------------- |
| Functional consciousness architecture |           6.5 / 10 | multiple coupled indicators                                            |
| Internal legibility                   |           9.0 / 10 | source-visible, telemetry-rich, benchmarked                            |
| Embodied agency                       |           6.0 / 10 | strong in-world embodiment, narrow task universe                       |
| Self-model maturity                   |           5.5 / 10 | confidence/metacognition/self-state exist, but no robust autobiography |
| Online learning/plasticity            |           3.0 / 10 | mostly fixed deterministic faculties                                   |
| Open-domain intelligence              |           2.0 / 10 | not comparable to frontier agents                                      |
| Phenomenal evidence                   | 0 / 10 as evidence | scientifically unconfirmed                                             |

The cleanest phrase is:

> The Super Creature is a high-density functional consciousness scaffold.

That is both ambitious and defensible.

---

## 6. Compare and Contrast

### 6.1 Versus LLM agents

LLM agents have language, knowledge, tool use, instruction following, and open-world generalization. The Super
Creature does not. But LLM agents usually lack explicit GNW ignition, tractable Phi, quantum state telemetry,
metacognitive circuitry as source, and visible embodied feedback in a deterministic world.

LLMs are more capable. The Super Creature is more inspectable.

### 6.2 Versus reinforcement-learning agents

RL agents are stronger at benchmarked policy optimization. The Super Creature is not trained to maximize a
formal reward over millions of episodes. Its advantage is architectural breadth: active inference,
empowerment, memory, metacognition, quantum feedback, and body coupling are all explicit.

RL is better for score. Super Creature is better for studying a synthetic psyche.

### 6.3 Versus organoid/wetware systems

Brainoware, DishBrain, and Neuroplatform projects use biological neurons. They are closer to real biology.
The Super Creature is easier to reproduce, inspect, and test. It is a model, not tissue.

Wetware is deeper substrate. Super Creature is deeper instrumentation.

### 6.4 Versus quantum-cognition projects

Most quantum-cognition work is either mathematical modeling or quantum algorithm research. The Super Creature
does something different: it lets a small quantum statevector become part of an embodied agent's internal
state, then exposes the result in live telemetry.

The repo does not prove quantum mind theories. It creates a testbed for quantum-inspired cognitive signals.

---

## 7. What the Communities Might Call Impossible, Crazy, or Insane

The "insane" part is not the claim of sentience. That claim is intentionally rejected. The wild part is that
the repo makes all of the following run together:

1. a deterministic multi-faculty consciousness-model stack;
2. a six-qubit statevector cognition layer with quantum-geometric readouts;
3. real write-back from quantum Phi and reservoir flux into action pressure;
4. a visible body whose material state reflects internal quantum/cognitive state;
5. a 50k-agent surrounding world;
6. CI-gated performance in a browser project.

Most projects get one of these. This one binds them.

---

## 8. What It Needs Next

### Scientific upgrades

- Formal indicator ledger tied to Butlin-style properties.
- Ablation matrix: remove each faculty and measure behavioral/cognitive delta.
- Intervention tests: force high surprise, low Phi, high metacognitive confidence, high decoherence, and
  measure downstream plans.
- Long-session autobiographical memory with replay-safe migrations.
- Attention-schema module: an explicit predictive model of its own attention.
- Online plasticity under bounded safety.
- Environment tasks where success is externally scored, not just internally beautiful.

### Engineering upgrades

- Benchmark trend artifact per commit.
- Public `/evidence` page with current tests, coverage, benchmark medians, latest commit, and report links.
- Snapshot fixtures for Super Mind telemetry.
- More property-based tests for boundedness and NaN resistance.
- Deterministic replay export: seed + config + event log + expected checksums.

### Product/research upgrades

- A "Super Creature lab mode" that lets researchers freeze, perturb, and replay individual faculties.
- A public glossary that separates metaphor words from measured variables.
- A short executive deck with a strict "what it is / what it is not" slide.

---

## 9. Final Assessment

The Super Creature is not a conscious machine. It is something more useful at this stage: a compact,
deterministic, inspectable, benchmarked synthetic-cognition scaffold that lets a user watch many candidate
ingredients of consciousness interact inside one embodied being.

That is a real achievement. It is novel because it refuses the two common shortcuts:

- it does not hide everything inside a huge black-box model;
- it does not use "consciousness" as a vibe word without mechanisms.

It builds the mechanisms, exposes them, tests them, times them, and keeps the language honest.

If the whole repo is the cosmos, the Super Creature is the question at the center of it:

> How much of mind can be engineered from explicit loops before experience itself remains the only unknown?

The answer today: a surprising amount of function, no verified experience, and a very strong foundation for
the next experimental pass.

---

## 10. External Sources Used

- Butlin et al., "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness" -
  <https://arxiv.org/abs/2308.08708>
- Ferrante et al., "Adversarial testing of global neuronal workspace and integrated information theories of
  consciousness" - <https://www.nature.com/articles/s41586-025-08888-1>
- Brainoware organoid reservoir computing - <https://www.nature.com/articles/s41928-023-01069-w>
- DishBrain / in-vitro neurons in a simulated game-world - <https://www.cell.com/neuron/fulltext/S0896-6273(22)00806-6>
- FinalSpark Neuroplatform - <https://finalspark.com/neuroplatform/>
- Google Research, Willow quantum error correction - <https://research.google/blog/making-quantum-error-correction-work/>
- IBM Quantum hardware and roadmap - <https://www.ibm.com/quantum/hardware>
- GPT-3 - <https://arxiv.org/abs/2005.14165>
- Neural scaling laws - <https://arxiv.org/abs/2001.08361>
