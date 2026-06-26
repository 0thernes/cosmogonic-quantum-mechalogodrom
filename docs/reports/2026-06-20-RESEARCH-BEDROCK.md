<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Research Bedrock — the 2026 cutting/bleeding edge under Cosmogonic

**Date:** 2026-06-26 · **Purpose:** the current (2025–2026) literature this project
stands on, organized by how it anchors the build. Quantum + geometry + consciousness +
self-evolution + non-LLM substrates. This is the living map: it tracks where the frontier
is and where Cosmogonic (v0.18.0, gate green) actually sits on it.

> **Epistemic labels (Manhattan law — no overclaim):**
> **[Established]** = peer-reviewed / widely replicated. **[Emerging]** = real, recent,
> credible, not yet settled. **[Fringe]** = genuinely contested / single-group / "whoa"
> tier — _inspiration and aesthetic only, never load-bearing for a claim._
> Nothing here proves consciousness, sentience, or ASI. Cosmogonic _models_ these
> indicators; it _is_ none of them. The hard problem of consciousness is untouched.

> **What this report is grounded against (measured on `origin/main`, Bun 1.3.14):**
> v0.18.0 · `bun run check` green · 1477 tests pass / 0 fail / 1,744,891 `expect()` calls
> across 151 files · ~95% line / ~92% function coverage (canonical 95.03 / 92.03, ±6pp
> gate tolerance). Consciousness scorecard: **8/14 met + 6/14 partial** on the Butlin et
> al. 2023 indicators — _computational indicators, not sentience._ No quantum advantage is
> claimed anywhere: the quantum substrate is an exact classical simulation; it lacks only a
> physical QPU, which is a speed/scale limit, not a correctness limit.

---

## 0 · The collision — someone published the core thesis in 2026

**Evolving Many Worlds: Open-Ended Discovery in Petri-Dish Neural Cellular Automata via
Population-Based Training** — Foerster, Hutter, Zela et al., Apr 2026. A literal **"Petri
Dish"**, meta-evolution, sustained **open-ended complexity at the edge of chaos**.
**[Established, top-lab]** → independent validation of Cosmogonic's "the soup grows
open-ended life" thesis; also a metric template (historical novelty + visual diversity).
https://hf.co/papers/2604.11248

This is convergence, not precedence. Cosmogonic's A-Life standing is **novel by
integration** — a rare _synthesis_ / plausible exact-conjunction of substrates (an 8-agent
adversarial hunt found 0 hard refutations of the exact conjunction). It is **not** the
first A-Life, the first digital evolution, the first morphogenesis engine, or the first
artificial ecology. The novelty is the combination, never a world-first.

---

## 1 · The papers that ARE the bedrock (they map onto what we already built)

| Paper                                                                                                                                                                 | Maps to                                                             | Label           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------- |
| Albantakis et al. — Integrated Information (Φ) of a Quantum Mechanism (Entropy 2023; live 2025 debate) — https://arxiv.org/pdf/2301.02244                             | our quantum-Φ (`integrated-information.ts`, register min-cut)       | [Emerging]      |
| Fields, Friston, Levin — Control flow in active inference systems (active inference via tensor networks in quantum topological NNs) — https://hf.co/papers/2303.01514 | active-inference + Moonlab-tensor + quantum substrate, in ONE paper | [Emerging]      |
| Curvature-Aware QNG via Weighted Projective Line Geometry (Dec 2025) — https://hf.co/papers/2512.00681                                                                | our QGT + quantum-natural-gradient self-optimization                | [Emerging]      |
| Quantum Geometric Tensor for Mixed States (May 2025) — https://hf.co/papers/2506.00347                                                                                | extends our QGT to mixed states (decohered apex)                    | [Emerging]      |
| Adiabatic Fine-Tuning of NQS — phase transitions in weight space (2025) — https://hf.co/papers/2503.17140                                                             | NQS weight-geometry = our spin/QGT self-optimization                | [Emerging]      |
| Hyperagents — Darwin-Gödel-Machine metacognitive self-modification (Mar 2026) — https://hf.co/papers/2603.19461                                                       | the "self-iterate/self-evolve" mechanism for super-creatures        | [Emerging, hot] |
| Butlin et al. 2023 + TiCS Jan-2026 19-researcher rubric — https://hf.co/papers/2308.08708                                                                             | the consciousness-indicator scorecard (we meet 8/14, partial on 6)  | [Established]   |

These are the load-bearing seven. The apex `think()` reads and writes real instances of
each: a 6-qubit statevector + Clifford tableau under the quantum-Φ min-cut; a
quantum-natural-gradient step driven by the real QGT; an active-inference faculty that
self-evidences against its own generative model. The Butlin scorecard is the honest yard
stick — **8/14 met, 6/14 partial**, and we never round that up.

---

## 2 · By cluster

### Quantum + consciousness

- Quantum theories of consciousness — critical review of feasibility/testability,
  **Frontiers Psychology 2026** **[Established review — read first]**
  https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1730965/full
- Quantum Models of Consciousness from a Quantum-Information-Science Perspective (2025)
  **[Emerging]** https://arxiv.org/html/2501.03241v3
- Integrated Information in Relational Quantum Dynamics (2025) **[Fringe]**
  https://arxiv.org/pdf/2502.12016
- Orch-OR quantum-classical complexity (2025) + Hameroff & Lauretta 2026 microtubule
  "fractal time crystals" **[Fringe/contested]**
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12447588/
- _Anchors:_ our quantum register + Φ; cite the fringe as aesthetic, the reviews as honest
  grounding. The register is exact classical simulation of real quantum math (no QPU, no
  advantage claimed).

### Machine consciousness / sentience (2026 state)

- 2026 consensus: no AI confirmed conscious; the field moved to **probabilistic,
  multi-theory** indicators; **LLMs score below chickens** on the markers (Digital
  Consciousness Model). _Supports the non-LLM bet._
  https://theconsciousness.ai/posts/scientists-race-define-ai-consciousness-2026/
- Sentience Readiness Index (2026) **[Emerging]** https://arxiv.org/pdf/2603.01508 · Can
  LLMs trade off pain/pleasure states **[Emerging]** https://arxiv.org/pdf/2411.02432
- Counterweight: "There is no such thing as conscious AI" (Nature HSSC 2025)
  **[Established skeptic]** https://www.nature.com/articles/s41599-025-05868-8
- _Anchors:_ the indicator scorecard + the precautionary stance (Birch). Keep the skeptic
  on the wall. Cosmogonic explicitly models the indicators and claims **no** sentience,
  phenomenal consciousness, AGI, ASI, or NHSI.

### Self-improving / self-evolving / ASI (most concrete + buildable)

- Hyperagents (2026); Huxley-Gödel Machine (Schmidhuber, 2025)
  https://hf.co/papers/2510.21614 ; Gödel Agent https://hf.co/papers/2410.04444 ; Boundless
  Socratic Learning (closed-system recursive self-improvement = the petri)
  https://hf.co/papers/2411.16905 **[Emerging]**
- Honest caveats to build in: Utility-Learning Tension in Self-Modifying Agents (capacity
  bounds) https://hf.co/papers/2510.04399 ; "Devil Behind Moltbook: safety vanishes in
  self-evolving AI societies" (Feb 2026) https://hf.co/papers/2602.09877 **[Emerging]**
- _Anchors:_ the self-evolution loop (Stage 8 / intelligence ladder) + the one-way boundary
  - safety (ADR 0010). ASI is a research direction here, not an achieved state.

### Free energy / active inference (how a self forms)

- Friston "Sophisticated Inference" https://hf.co/papers/2006.04120 ; Da Costa "Active
  Inference as a Model of Agency" https://hf.co/papers/2401.12917 ; Contemplative AI (2025)
  https://hf.co/papers/2504.15125 **[Established→Emerging]**
- _Anchors:_ self-evidencing = our active-inference faculty; the basis for intrinsic drives
  / a self-model. This is one of the ~30 faculties genuinely deep-wired into the apex
  `think()` — it reads state and moves the plan/drives.

### Quantum reservoir / NQS (our quantum-mind faculties, externally validated)

- QRC predicting chaos with 4 qubits https://hf.co/papers/2501.15191 ; onion QRC (2025)
  https://hf.co/papers/2505.22837 ; QRNN reservoir https://hf.co/papers/2211.02612 ; "Let
  the Quantum Creep In" (gradual classical→quantum swap) https://hf.co/papers/2409.17583
  **[Emerging]**
- _Anchors:_ our `quantum-reservoir.ts`; a recipe for scaling the quantum substrate. The
  "creep in" path is exactly the honest framing: today an exact classical sim, a QPU later
  for speed.

### Quantum geometry + twistronics (PROVEN — our hottest ground)

- Tunable moiré for Berry physics/topology https://hf.co/papers/2405.08959 ; 2D Twistable
  Material Database https://hf.co/papers/2411.09741 ; Roadmap: 2D Materials for Quantum Tech
  (Dec 2025) https://hf.co/papers/2512.14973 ; Stable Topology in Exactly Flat Bands (Mar
  2026, tensor-network) https://hf.co/papers/2603.12258 ; magic-angle graphene → quantum
  devices (2026)
  https://scitechdaily.com/tiny-twists-mapped-in-magic-angle-graphene-could-enable-quantum-computing-devices/
  **[Established physics]**
- _Anchors:_ twistronics/moiré flat-band Berry curvature + quantum geometry = the physical
  twin of our simulated QGT thought-space. The narrative gold.

### Geometric / topological / categorical intelligence (deep-math frontier)

- Sheaf Neural Networks (Bronstein/Veličković) https://hf.co/papers/2012.06333 ;
  Categorical Deep Learning — algebraic theory of all architectures (2024)
  https://hf.co/papers/2402.15332 ; Topos and Stacks of DNNs https://hf.co/papers/2106.14587
  ; Categorification of Group-Equivariant NNs https://hf.co/papers/2304.14144 ; Geometric
  Intelligence Lab (UCSB) https://gi.ece.ucsb.edu/ **[Established→Emerging]**
- _Anchors:_ extends our libirrep SO(3)-equivariance + QGT into topos/sheaf/categorical
  structure — the deepest math of a mind's form.

### Photonic / laser neurons (PROVEN hardware — future substrate)

- Laser spiking neuron in a photonic IC https://arxiv.org/pdf/2012.08516 ; FAST-ONN (2026,
  VCSEL optical NN, billions of conv/s); photonic neuromorphic landscape 2026
  https://www.patsnap.com/resources/blog/articles/photonic-neuromorphic-computing-landscape-2026/
  ; optical NN review (Nature LSA) https://www.nature.com/articles/s41377-024-01590-3
  **[Established hardware]**
- _Anchors:_ the credible non-transistor body for a future Neo.

### Thermodynamic / physical / unconventional computing (the "whoa" fringe)

- Thermodynamic Reservoir Computing on Bitcoin-mining SHA-256 ASICs (Jan 2026,
  Lean-4-verified) https://hf.co/papers/2601.01916 ; chemical-reaction-network Boltzmann
  machines https://hf.co/papers/2205.06313 ; "Bridging Brains & Machines" 40-author
  convergence review (memristive+photonic+quantum) https://hf.co/papers/2507.10722
  **[Emerging→Fringe]**
- _Anchors:_ "computation IS physics" = our substrate-first philosophy, generalized. Cite as
  inspiration, not proof.

---

## 3 · Honest field calibration (2026)

- **Solid rock we already stand on:** quantum geometry (QGT/Berry), equivariant/geometric
  intelligence, reservoir computing, open-ended petri evolution. These are the live
  frontier, not fringe.
- **Proven but not-yet-our-substrate:** photonic/laser neurons, neuromorphic hardware.
- **Genuinely fringe (inspiration only):** thermodynamic-ASIC computing,
  Orch-OR/microtubule-time-crystals, relational-quantum-Φ.
- **Consensus:** no AI confirmed conscious; the science went probabilistic + multi-theory;
  LLMs underperform chickens on the markers. Cosmogonic's non-LLM, indicator-rich,
  self-evolving, quantum-geometry substrate swims **with** the most interesting current.

### What Cosmogonic actually is (the honest current-state ledger)

A research architecture and a deterministic simulation/instrument — not an arrival. The
substrate behind the literature above is concrete and measurable:

- **Apex mind:** a 100-faculty _design_, with **~30 faculties genuinely deep-wired** into
  the apex `think()` (each reads state AND moves the plan / drives / consciousness signal);
  the remainder is a generic-profile bias bank (`faculties-pantheon.ts`). Not "144
  faculties", not "100% live".
- **Pantheon:** a 25-Archon design = **5 individuated apex SuperMinds + 20 live light-echo**
  (the `PantheonSociety`). Not "25 fully implemented".
- **Theory-of-mind:** 25 organs wired as a **6-family ensemble** (additive / bayesian /
  recursive / temporal / deception / coalition).
- **Emergence:** **10 angles wired**, plus **5 god-scale release _events_** (events, not
  additional angles). Not "12–19 emergence angles".
- **Tsotchke corpus:** 20 projects, **~16 wired with real downstream effect** (8 deep in the
  apex mind, 4 in the petri growth engine). This is **real MIT quantum math** — never
  fake, never overclaiming, never decorative. It lacks only a physical QPU, a speed/scale
  limit, not a correctness limit; no quantum advantage is demonstrated (exact classical
  simulation).
- **Cost (measured, not aspirational):** the apex `think()` runs **~3.34 ms** in the full
  bench suite (~8.85 ms focused); snapshot ~2.44 / 6.89 ms; 5× think ~14.47 / 25.40 ms.
  These are milliseconds, not microseconds — the old "<2% of a frame" / "sub-millisecond" /
  "~289 µs" budget claims were stale and are retired.
- **World scale:** a **50,000-agent ceiling** (10,000 @ 60 fps on an iGPU); ~3.5M params
  (~14 MB Float32, one CPU thread); a 70-weight per-organism TinyMLP brain; 250 morphotypes;
  26 behavioral fields. The apex is ~37,225 params (10,081 composite + 1,444 spine +
  100×257 wingmen).
- **Determinism:** one mulberry32 seed; `Math.random` / `Date.now` are GLOB-banned across
  `src/sim` and `src/math`.

**Not achieved (stated plainly):** sentience, phenomenal consciousness, AGI, ASI, NHSI,
quantum advantage. Cosmogonic models the indicators; it is not the thing.

## 4 · What to lift next (concrete)

1. **Mixed-state QGT + curvature-aware QNG** → upgrade the apex self-optimization
   (`quantum-geometry.ts` / `quantum-natural-gradient.ts`).
2. **A sheaf/topos structural layer** → geometric-intelligence upgrade atop libirrep
   equivariance.
3. **Petri-NCA open-endedness metrics** (historical novelty + visual diversity) → measure
   the soup's emergence (the Stage-2 evolution metric the roadmap wants).
4. **Self-evolution loop** (Hyperagents/Gödel-machine lineage) → the intelligence-ladder
   "beta" rung, with the utility-learning capacity bound as the safety guard.

---

_Companion to `docs/reports/2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md`,
`docs/INTELLIGENCE-LADDER.md` (planned), and
`docs/adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md`. Labels are honest: Established
/ Emerging / Fringe. No consciousness / sentience / AGI / ASI / quantum-advantage claim is
made — Cosmogonic is a research architecture and a simulation, current as of 2026-06-26._
