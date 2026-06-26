# A-Life Comparative Audit — Cosmogonic Quantum Mechalogodrom vs 25 Known Systems

**Date:** 2026-06-26 · **Edition:** v2 (visual-data-science upgrade) · **Repo:** `v0.18.0`
**Scope:** the current repo (`origin/main`) plus a sourced, adversarially re-verified survey of 25
well-known Artificial-Life / open-ended-evolution / digital-organism systems.
**Companion data (single source for every statistic + chart below):**
[`2026-06-26-alife-comparison-matrix.csv`](./2026-06-26-alife-comparison-matrix.csv)
**Reproducible stats + charts engine:** [`scripts/alife-comparison-stats.ts`](../../scripts/alife-comparison-stats.ts)
(`bun scripts/alife-comparison-stats.ts` regenerates [`assets/alife-stats.json`](./assets/alife-stats.json)
and all five SVGs below).

> **Manhattan's law, applied to a comparison.** Every number in this document is **computed**, not asserted:
> the statistics come from `alife-comparison-stats.ts` reading the CSV, the gate figures from a cold
> `bun test --coverage`, the peer facts from a 2026-06-26 adversarial web re-verification (8 agents, all 25
> sources re-checked). Where a figure is a calibrated judgment rather than a fresh runtime measurement, it
> is labelled as such. Read every claim against
> [`2026-06-26-CURRENT-TRUTH-BASELINE.md`](./2026-06-26-CURRENT-TRUTH-BASELINE.md); the baseline wins on
> any conflict. Current receipts after the P1/coupling sync: `1477` tests, `0` failures, `95.03%` line /
> `92.03%` function coverage, sync clean, build clean.

---

## Bottom line

Cosmogonic Quantum Mechalogodrom is a **deterministic, browser-first, multi-substrate A-Life and
cognitive-architecture testbed**. It is **not** "the first A-Life system," not the first digital-evolution
platform, not the first neural artificial ecology, not the first morphogenesis simulator, not the first
open-ended-search system, and **not evidence of sentience**.

Its defensible novelty is narrower and stronger, and now **measured**:

1. **Breadth of integrated mechanisms — rank #1 of 26, breadth mean `4.44 / 5`, `z = +3.01` above the
   survey population mean** (and `+3.84` vs the 25 peers alone), at the **100th percentile**. No surveyed
   system integrates as many distinct A-Life + cognition + substrate axes at once.
2. The breadth is concentrated on three axes where the field is essentially empty: **Consciousness-theory
   instrumentation (`+4.75 σ`), Substrate-pluralism (`+3.91 σ`), and Cognition/learning (`+1.72 σ`)** above
   the survey mean — these are the genuine, measured differentiators.
3. **Scientific maturity is low: peer-maturity `1.5 / 5`.** There is no peer-reviewed result yet proving the
   integrated substrates produce robust, non-trivial, long-run open-ended evolution; and across the survey,
   **breadth and maturity are negatively correlated (`r = −0.62`)** — broad systems are measurably the
   _least_ validated. Cosmogonic sits at the extreme of that pattern.
4. An adversarial frontier hunt (4 angles, 2020–2026) found **no system that fully refutes the
   exact-conjunction claim** — but it found real _partial_ peers on every component axis and narrowed the
   honest claim from "unique" to **"novel by integration."**

The cleanest single sentence: **a survey-rare, evidence-heavy synthesis whose novelty is in the
conjunction — not a global world-first, not a proven breakthrough, not sentience.**

---

## Visual abstract

**Breadth of integrated mechanisms, ranked (all 26 systems):**

![Ranked breadth of integrated mechanisms — Cosmogonic #1 at 4.44, survey mean 2.54](./assets/alife-breadth-ranked.svg)

**Capability heatmap (26 systems × 9 axes), sorted by breadth:**

![Capability heatmap of all 26 systems across the 9 implementation axes](./assets/alife-axis-heatmap.svg)

**Breadth vs peer maturity — the "broad but immature" map:**

![Scatter of breadth mean vs peer maturity; Cosmogonic in the upper-left broad-but-immature quadrant](./assets/alife-breadth-vs-maturity.svg)

**Nine-axis capability profile (Cosmogonic vs survey mean vs nearest peer ALIEN):**

![Radar chart of the 9 capability axes comparing Cosmogonic, the survey mean, and ALIEN](./assets/alife-radar-profile.svg)

**Nearest neighbours in 9-axis feature space (Euclidean distance):**

![Bar chart of the 8 nearest peer systems by Euclidean distance from Cosmogonic](./assets/alife-nearest-neighbors.svg)

---

## Method

Three evidence channels, plus a reproducibility layer new to this edition:

| Channel                       | What was done                                                                                                                  | Status                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Internal code/docs inspection | Read governing files, README, module contracts, honesty audit, Tsotchke map, benchmarks, key source exports                    | Current `origin/main` tree                     |
| Live verification             | Cold `bun test --coverage`, `bun run check`, receipts, `bun run bench`, focused `bench/super-mind.bench.ts`                    | Current local machine (2026-06-26)             |
| External comparison           | Sourced survey of 25 known A-Life systems, then an **8-agent adversarial web re-verification** of every source + profile       | Literature/documentation + 2026-06-26 re-check |
| **Reproducible statistics**   | `scripts/alife-comparison-stats.ts` computes the full battery (z-scores, σ-outliers, correlation, Euclidean geometry) + 5 SVGs | Deterministic; re-run to regenerate            |

External projects were **not** downloaded and re-benchmarked. Their axis scores are
literature/documentation judgments, not fresh runtime measurements — and the 2026-06-26 re-verification
confirms each is **defensible** (see "Adversarial peer re-verification" below). The statistics are
population statistics over all 26 systems (peers + Cosmogonic), with `breadth = mean of the 9 implementation
axes`.

---

## What this repo is

A system qualifies as Artificial Life when it builds synthetic populations or substrates exhibiting
life-like processes: reproduction/persistence, heredity/state-continuity, variation, selection,
ecological interaction, morphogenesis/self-organization, adaptation, emergent collective dynamics.

| A-Life criterion       | Cosmogonic evidence                                                                      | Verdict                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Population of agents   | Entity manager, phyla, titans, factions, petri colonies, super minds                     | Met                                       |
| Heredity / genome      | `genome.ts`, `lineage.ts`, `primordial-soup.ts`, petri biologics                         | Met                                       |
| Mutation / variation   | Genome mutation, morphotypes, strains, Eshkol program mutation proxies                   | Met                                       |
| Selection pressure     | Resource/economy loops, predation, death, war, petri vitality/speciation                 | Met                                       |
| Ecological interaction | Titans, factions, shoggoths, puppet masters, economy, connectome, stigmergy              | Strong                                    |
| Morphogenesis          | 250 morphotypes, super bodies, petri strains, logo/tensor/irrep influences               | Strong but not full developmental biology |
| Cognition              | SuperMind, active inference, ToM, metacognition, reservoir, empowerment, GWT/IIT proxies | Strong as functional models               |
| Open-endedness         | Emergence angles and strain/speciation scaffolding                                       | Partial — not proven long-run OEE         |
| Scientific measurement | Seeded RNG, 1477 tests, coverage, benchmarks, receipts                                   | Strong, with doc-drift caveats            |

Deductively: **this is a real A-Life testbed.** It is also a cognitive-theory sandbox — but **not** a
conscious or sentient entity. The repo's own honesty audit grades the Butlin-style status at
**`8/14 met + 6/14 partial`**; those are computational indicators, not subjective experience.

---

## Live verification results

| Check                         | Live result (2026-06-26, Bun 1.3.14, cold shell)                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bun test` (re-measured here) | **`1477 pass`, `0 fail`, `1,744,891 expect() calls`, `151` files** (38.9 s)                                      |
| Coverage receipt              | **`95.03%` line, `92.03%` function** (canonical, `±6 pp` gate-enforced)                                          |
| `bun run check`               | full gate green: format, typecheck, lint, tests, receipts, sync, build                                           |
| `SuperMind.think()`           | `3.34 ms` (full-suite) / `8.85 ms` (focused) — **not** the old `<2%` frame claim                                 |
| `5× think()` batch            | `14.47 ms` / `25.40 ms` focused                                                                                  |
| Low-level kernels             | `mulberry32` `1.47 ns`; `selectTopK` `15.4×` faster than full sort; spatial hash `383 ns`; Gray-Scott RD `94 µs` |

Interpretation unchanged from v1: **the small math kernels are healthy; the multi-mind cognition stack now
needs fresh frame-budget work.** The old `docs/BENCHMARKS.md` "GOAL5 5× minds `<2%` amortized" claim is not
defensible on the live run (current measured range is ~`10.9×`–`19.1×` above that `<2%` target) and is
correctly flagged stale in the truth baseline.

---

## Statistical analysis (measured)

All figures below are emitted by `scripts/alife-comparison-stats.ts` into
[`assets/alife-stats.json`](./assets/alife-stats.json). `N = 26` systems (25 peers + Cosmogonic).

### Breadth distribution and the outlier signal

| Statistic                             |        Value | Note                                                |
| ------------------------------------- | -----------: | --------------------------------------------------- |
| Cosmogonic breadth mean               |   **`4.44`** | rank **#1 / 26**, **100th percentile**              |
| Survey breadth mean (all 26)          |       `2.54` | population mean                                     |
| Survey breadth std (all 26)           |       `0.63` | population σ                                        |
| Peer-only breadth mean (25)           |       `2.46` | excluding Cosmogonic                                |
| Peer-only breadth std (25)            |       `0.52` | excluding Cosmogonic                                |
| **Cosmogonic z-score (population)**   |  **`+3.01`** | `(4.44 − 2.54) / 0.63`                              |
| **Cosmogonic z-score (vs 25 peers)**  |  **`+3.84`** | `(4.44 − 2.46) / 0.52`                              |
| Median breadth / median peer-maturity | `2.44` / `4` | Cosmogonic maturity is `1.5` — far below the median |

A `z` of `+3` is a genuine statistical outlier: under a normal approximation, < 0.2 % of a population sits
that far above the mean. The signal is real — and the next subsection shows it is **not** uniform across
axes.

### Per-axis σ-outlier analysis — where the breadth actually lives

For each of the 9 axes: the survey mean/σ, the field leaders, Cosmogonic's score, and how many σ above the
survey mean that score sits (`z`). This is the most honest single table in the audit — it shows exactly
where the system is a true outlier and where it is merely above-average or **average**.

| Axis                     | Survey mean |      σ | Cosmogonic | **z vs survey** | Field leaders (score = max)                                        |
| ------------------------ | ----------: | -----: | ---------: | --------------: | ------------------------------------------------------------------ |
| **Consciousness-theory** |      `0.27` | `0.89` |      `4.5` |   **`+4.75 σ`** | **Cosmogonic (sole)**                                              |
| **Substrate pluralism**  |      `1.44` | `0.91` |      `5.0` |   **`+3.91 σ`** | **Cosmogonic (sole)**                                              |
| **Cognition / learning** |      `2.12` | `1.39` |      `4.5` |   **`+1.72 σ`** | **Cosmogonic (sole)**                                              |
| Ecology                  |      `2.96` | `1.43` |      `5.0` |       `+1.43 σ` | Cosmogonic, Polyworld, Sugarscape, Swarm                           |
| Instrumentation          |      `3.40` | `0.83` |      `4.5` |       `+1.32 σ` | Game of Life, EvoGym                                               |
| Visual scale             |      `3.35` | `1.33` |      `5.0` |       `+1.24 σ` | Cosmogonic, Karl Sims, Creatures, Picbreeder, Lenia, ALIEN         |
| Morphology / physics     |      `2.92` | `1.75` |      `4.0` |       `+0.61 σ` | Framsticks, Karl Sims, Gene Pool, breve, OpenWorm, EvoGym, ALIEN   |
| Reproduction             |      `3.15` | `1.73` |      `4.0` |       `+0.49 σ` | Tierra, Avida, Framsticks, Creatures, Darwin Pond, Gene Pool, MABE |
| **Open-endedness**       |      `3.25` | `1.19` |      `3.5` |   **`+0.21 σ`** | Picbreeder, POET, ASAL                                             |

**The honest reading:** Cosmogonic's outlier status is carried by **three axes the field has barely
touched** — consciousness-theory instrumentation (survey mean `0.27`; only one other system scores nonzero),
substrate pluralism, and (sole-leader) cognition. On **open-endedness — the axis that matters most for any
"unbounded life" claim — it is essentially at the survey mean (`+0.21 σ`)** and is _out-led_ by Picbreeder,
Enhanced POET, and ASAL. This is the single most important honesty point in the whole comparison: breadth is
not depth, and the one axis where depth would prove the thesis is the one where the system is ordinary and
unproven.

### Correlation: breadth vs maturity (`r = −0.62`)

Across all 26 systems, **breadth of synthesis and peer scientific maturity are moderately-to-strongly
negatively correlated: Pearson `r = −0.618`.** Broad "everything" systems are, in this survey, the
_least_ peer-validated; narrow, focused classics (Game of Life, Avida, Tierra, Karl Sims) are the most.
Cosmogonic sits at the extreme corner of that relationship — maximal breadth (`4.44`), near-minimal maturity
(`1.5`). The negative slope is not a knock; it is the structural law of the field, and it precisely scopes
what remains to be earned: **the maturity, via ablations and long-run open-endedness data, not more breadth.**

### Geometric / feature-space analysis (Euclidean nearest neighbours)

Treating each system as a point in 9-dimensional axis space, the nearest peers to Cosmogonic by Euclidean
distance are:

| Rank | Nearest peer |   Distance | Why close                                                     | Why still different                                                    |
| ---: | ------------ | ---------: | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
|    1 | **ALIEN**    | **`5.17`** | GPU artificial ecosystems, organisms, physics, visual scale   | Far less cognitive-theory/Butlin/GWT/IIT instrumentation               |
|    2 | Creatures    |     `5.57` | Genetics, neural brains, biochemistry, learning, interaction  | Commercial pets, not a multi-substrate quantum/geometric cognitive lab |
|    3 | Polyworld    |     `6.48` | Neural agents, vision, metabolism, ecology, mating, predation | Less substrate pluralism + consciousness-theory scoring; 2D fixed body |
|    4 | Framsticks   |     `6.56` | Body/brain co-evolution, genotype/phenotype, 3D embodiment    | Stronger evolved morphology, weaker cognition/consciousness stack      |
|    5 | breve        |     `7.00` | 3D A-Life simulation environment                              | A platform, not the same integrated specimen                           |
|    6 | Karl Sims VC |     `7.14` | Canonical evolved 3D morphology + control                     | Task-evolved creatures, not a persistent ecosystem/cognition stack     |
|    7 | ASAL         |     `7.35` | Modern search for A-Life sims / open-ended novelty            | Meta-search _over_ substrates, not a deterministic embodied ecosystem  |
|    8 | Picbreeder   |     `7.48` | Open-ended collaborative evolution                            | Human-driven image evolution, not ecology/cognition                    |

The closest real conceptual neighbour is **ALIEN**, not Avida/Tierra. Avida and Tierra are _purer_ digital
evolution; Cosmogonic is broader but less mature. The radar chart above makes the shape explicit: Cosmogonic
encloses the survey-mean polygon on nearly every axis but extends furthest exactly where the field is empty.

---

## Comparison matrix summary

Axes scored `0..5`: reproduction, open-endedness, ecology, morphology/physics, cognition/learning,
substrate-pluralism, instrumentation, consciousness-theory, visual-scale. Peer maturity is scored separately
and is **not** part of breadth.

| Rank by breadth | Project                              | Breadth mean | Peer maturity |
| --------------: | ------------------------------------ | -----------: | ------------: |
|               1 | **Cosmogonic Quantum Mechalogodrom** |   **`4.44`** |     **`1.5`** |
|               2 | ALIEN                                |       `3.50` |         `2.5` |
|               3 | Creatures                            |       `3.33` |         `4.0` |
|               4 | Framsticks                           |       `3.22` |         `4.0` |
|               5 | Polyworld                            |       `3.00` |         `4.5` |
|               6 | Gene Pool / Swimbots                 |       `2.94` |         `3.0` |
|               7 | Karl Sims Evolved Virtual Creatures  |       `2.89` |         `5.0` |
|               8 | Picbreeder                           |       `2.89` |         `4.5` |
|               9 | breve                                |       `2.78` |         `4.0` |
|              10 | Darwin Pond                          |       `2.67` |         `3.0` |

Survey mean breadth `2.54`; population σ `0.63`; **Cosmogonic z-score `+3.01`.** That is a meaningful outlier
signal — but it measures **breadth of synthesis, not scientific truth.**

### Visual map (breadth vs maturity quadrant)

```mermaid
quadrantChart
  title Breadth vs peer maturity
  x-axis Low peer maturity --> High peer maturity
  y-axis Narrow synthesis --> Broad synthesis
  quadrant-1 Mature broad systems
  quadrant-2 Broad but immature
  quadrant-3 Narrow immature
  quadrant-4 Mature focused classics
  Cosmogonic: [0.30, 0.89]
  ALIEN: [0.50, 0.70]
  Creatures: [0.80, 0.67]
  Framsticks: [0.80, 0.64]
  Polyworld: [0.90, 0.60]
  Avida: [1.00, 0.49]
  Tierra: [1.00, 0.39]
  Lenia: [0.80, 0.40]
  POET: [0.80, 0.47]
  EvoGym: [0.80, 0.49]
```

Cosmogonic lands in **"broad but immature."** That is the honest quadrant.

---

## Adversarial peer re-verification (2026-06-26)

An 8-agent web re-check (4 group fact-checkers + 4 novelty auditors) re-verified every peer. **Result: all
25 sources resolve, and every capability profile was judged defensible/sound.** The refinements below are
attribution/date precision — they do **not** change any axis score, so the statistics above are unaffected.
They are recorded here for accuracy.

| System                      | Verified refinement (does not alter scores)                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Avida**                   | Created **1993 at Caltech** (Ofria, Adami, C. Titus Brown); developed at Michigan State's Digital Evolution Lab since ~2003. Most scientifically rigorous of the digital-evolution set; open-endedness is _bounded/controlled_ by design. |
| **Tierra**                  | Reproduction + emergent ecology (parasites, hyper-parasites) are genuine strengths; **open-endedness is contested**, not a flat "yes."                                                                                                    |
| **Polyworld**               | `1992` (presented, ALIFE III) / `1994` (published); agents are **2D fixed-body** trapezoids — correctly **not** credited for evolved morphology. Author Larry Yaeger.                                                                     |
| **Framsticks**              | ECAL'99 (Komosinski & Ulatowski); genuine 3D body+brain co-evolution — strongest all-rounder alongside Karl Sims.                                                                                                                         |
| **Creatures**               | A-life design by **Steve Grand** (+ Toby Simpson); the **CAOS biochemistry** engine is its distinguishing axis.                                                                                                                           |
| **Darwin Pond / Gene Pool** | Ventrella; Darwin Pond created `1996`, free `~1998`; Gene Pool (`c.1997`) is its **successor** (adds sexual selection). Do not conflate with the 2022 NFT "Swimbots".                                                                     |
| **Echo**                    | Concept by **Holland** (_Hidden Order_, 1995); reference implementation by **Terry Jones** (SFI).                                                                                                                                         |
| **Swarm**                   | A **toolkit/framework** (Langton, SFI, 1994), not an organism — correctly scored on instrumentation/substrate axes.                                                                                                                       |
| **breve / MABE**            | **Platforms** (rate on what they _enable_); MABE = "**Modular Agent-Based Evolver**" (Bohm & Hintze, ALIFE 2017).                                                                                                                         |
| **Growing NCA**             | **Mordvintsev, Randazzo, Niklasson & Levin**, Distill 2020 (DOI `10.23915/distill.00023`); ~8k-param _learned_ update rule.                                                                                                               |
| **OpenWorm**                | Biological emulation (302-neuron c302 connectome + Sibernetic soft-body); a cognition credit is fair, **consciousness is not claimed**; single-organism, no reproduction/ecology.                                                         |
| **ALIEN**                   | Christian Heinemann (`chrxh`), `2018` initial / 2020s CUDA engine; **won the ALIFE 2024 Virtual Creatures Competition**; genuine reproduction+ecology+physics.                                                                            |
| **ASAL**                    | Multi-institution (Kumar/MIT lead … Ha/Sakana); arXiv `2412.17799` (Dec 2024), _Artificial Life_ journal 2025; a **foundation-model search method _over_ existing substrates**, not a new substrate.                                      |

---

## Novelty defense — the exact conjunction, adversarially tested

Four independent auditors were tasked to **refute** the rare/near-unique claim by hunting published peers for
each component angle (2020–2026). **Hard refutations found: 0.** No single system occupies the full
conjunction — but the honest verdict is **"novel by integration," not "unprecedented,"** because each
_component_ axis has real, named partial peers. This is the most defensible framing the evidence supports.

### Angle 1 — an honest quantum substrate causally driving an A-Life agent loop

**Survives as novel-by-combination.** The two halves each have established peers; the _conjunction_ has none.

- **Quantum + life (partial):** _Quantum Artificial Life_ (Alvarez-Rodriguez, Sanz, Lamata, Solano, IBM Q,
  _Sci. Rep._ 2018) encodes self-replication/mutation/death into real qubits — but there is **no goal-directed
  agent decision loop** and no behaving-creature environment.
- **Quantum + decision loop (partial):** **Projective Simulation** (Briegel group; trapped-ion + single-photon
  realizations) and the **VQC quantum-RL** family (e.g. arXiv `2203.14348`) genuinely put a quantum substrate
  in an action-selection loop — but in **abstract RL benchmarks** (CartPole, Invasion Game), not an A-Life
  ecosystem.
- **Honest caveat the auditor raised, kept here in spirit:** Cosmogonic's quantum modules are an _honest
  simulated substrate without a QPU and without a demonstrated behavioral advantage over a classical
  baseline_ — **the repo's own P1 quantum-vs-classical benchmark is exactly the missing receipt.** Until P1
  ships a pre-registered, ablation-controlled effect, the quantum novelty is **integration/aesthetic**, not a
  physics result.

### Angle 2 — instrumenting _multiple_ consciousness theories as measured mechanisms wired to behavior

**Partially refuted; survives only at the precise intersection, and the margin is thin and shrinking.**

- **AURA** (`youngbryan97/aura`, GitHub, 2025–2026) is the **closest peer found**: it instruments IIT-4.0 Φ,
  GWT broadcast, HOT, Attention Schema, and active inference, and **wires them into the control loop**
  (Φ-steered residual stream, GWT-gated action selection) — but it is a **single "sovereign" mind**, not an
  A-Life / multi-agent evolving population.
- Other partials: arXiv `2512.19155` (multi-theory, but **ablation probes**, single agent); **CENs** (AICCC
  2025, multi-agent + Φ, but emergence _scores_ not control-wired); attention-schema RL agents (one theory,
  not the battery).
- **Verdict:** the _general_ idea — "consciousness theories instrumented in agents" — is now **crowded
  (2023–2026); any first/unique claim on it is false.** The _specific_ intersection — a many-entity A-Life
  ecosystem where the full multi-theory battery (Butlin indicators + Φ + GWT ignition + attention schema +
  ToM) are first-class measured faculties wired to creature behavior — has **no exact peer**, but AURA closes
  most of the distance and appeared in this same window.

### Angle 3 — deterministic single-seed bit-reproducible 10k+ agent browser A-Life

**No single peer occupies the full 4-way cell; the claim survives on the conjunction.** The determinism axis
and the large-scale-browser axis are **split across different projects:**

- **Pixling World** — browser/WebGL2, **~1M NN agents** with heredity — but **no seed/bit-reproducibility**.
- **evo** (`tre-systems/evo`) — browser WebGPU, "thousands," "deterministic _world_" — but no explicit
  single-seed bit-for-bit replay; scale 10k+ unconfirmed.
- **primordial** (`casaisdev/primordial`) — clean **single-seed `mulberry32` bit-for-bit replay** + heredity —
  but **Canvas not WebGL**, "hundreds of organisms".
- **rust_scriptbots** — bit-for-bit deterministic + heredity — but a **native desktop app**, "thousands".
- **Why the cell is empty:** GPU/Web-Worker parallelism — the very thing that buys 10k–1M browser agents — is
  _the natural enemy of bit-for-bit determinism_ (non-associative float reductions, nondeterministic dispatch
  order, driver-dependent GPU math). Reconciling massive browser scale **with** single-seed reproducibility is
  the hard, rarely-attempted combination. (Several "50,000-agent deterministic WebGL cosmos" search hits were
  **echoes of this repo itself** and were excluded as self-citations.)

### Angle 4 — the 5-way exact conjunction

**No peer found; claim upheld.** Across the Sakana ASAL lineage, many-agent LLM sims, quantum-ALife, and
consciousness-metric implementations, every candidate matches only a **subset** of {tens-of-thousands-agent
ecology, real quantum substrate, ~20 cited neuro/cognitive faculties, consciousness metrics, deterministic
seeded replay}. **ASAL refutes none** (it is a foundation-model search _over_ simple classical substrates). A
"100k-agent / E8 quantum lattice" Academia.edu whitepaper is **quantum-_inspired_, un-peer-reviewed**, and
does not refute. _Caveat:_ the search engine is US-only and some primary sources returned 403, so confidence
is moderate-to-high, not absolute — a residual chance of an unindexed/niche project remains.

> **The defensible novelty claim, stated exactly:** the _integration_ — A-Life-at-scale + honest quantum
> statevector substrate + ~20 cited cognitive/quantum faculties + a multi-theory consciousness scoreboard +
> single-seed deterministic replay, in one browser tab — has **no published peer we could locate.** Every
> _ingredient_ is individually well-trodden. The rarity is the conjunction, and it is **survey-rare, not
> proven world-first.**

---

## Deductive claims

1. **"This is Artificial Life."** Valid — synthetic ecology with populations, heredity, mutation, selection,
   morphogenesis, emergent telemetry.
2. **"This is not just an A-Life toy."** Mostly valid — strict TypeScript, deterministic seeded RNG, 1477
   tests, coverage, benchmark harness, module contracts, adversarial honesty docs.
3. **"This is world-first Artificial Life."** **False** — Conway's Life, Boids, Core War, Tierra, Avida,
   Polyworld, Framsticks, Sims, Creatures, Sugarscape predate it by decades.
4. **"This is world-first in its exact conjunction."** **Plausible but not proven** — supported by a 4-angle
   adversarial hunt that found 0 hard refutations, but tempered by real partial peers (AURA, Pixling World,
   primordial, Quantum-ALife) on each component axis. A _survey-first / rare-conjunction_ claim, not a
   universal world-first.
5. **"This is scientific evidence for sentience."** **Invalid** — evidence that certain functional correlates
   are implemented; not evidence of phenomenal consciousness. The hard problem is untouched.

## Inductive claims

- **From code/tests:** `1477` passing tests, `195` src TS files / `151` test files (`1.29` source modules per
  test file) → many mechanisms are genuinely implemented, not only described.
- **From performance:** low-level kernels are healthy; the multi-mind cognition stack now needs fresh
  frame-budget work (live `think()` contradicts the old `<2%` doc).
- **From comparison:** classic systems specialize (Life/Lenia = cellular emergence; Tierra/Avida = digital
  organisms; Polyworld/Creatures = embodied neural ecology; Sims/Framsticks/EvoGym = morphology/control;
  Sugarscape/Echo/Swarm = societies; Picbreeder/POET/ASAL = open-ended search). Cosmogonic fuses many at once
  — and the `r = −0.62` breadth↔maturity correlation warns that breadth historically risks shallow
  "everything demos." The tests/contracts reduce that risk; they do not eliminate it.

## Probability bands

Calibrated judgment bands over the **surveyed evidence**, not universal probabilities.

| Proposition                                                                                             |        Band | Verdict                                           |
| ------------------------------------------------------------------------------------------------------- | ----------: | ------------------------------------------------- |
| Legitimately an A-Life system                                                                           | `0.90–0.98` | Yes                                               |
| First A-Life / digital-evolution / embodied-neural-ecology / OEE system                                 |     `<0.01` | No                                                |
| Rare among known A-Life in exact multi-substrate + consciousness-theory + deterministic WebGL synthesis | `0.72–0.88` | Plausible (↑ from v1 after the 0-refutation hunt) |
| Scientifically groundbreaking **today**                                                                 | `0.35–0.55` | Not yet proven                                    |
| Publishably notable after ablations + long-run studies                                                  | `0.55–0.75` | Plausible                                         |
| Demonstrates sentience                                                                                  |     `<0.01` | No                                                |

## Standard ratings

| Dimension                     | Rating | Reason                                                                    |
| ----------------------------- | -----: | ------------------------------------------------------------------------- |
| Engineering readiness         |  `7/9` | Full gate green; stale performance docs explicitly called out             |
| Scientific readiness          |  `3/9` | Hypothesis-generating prototype; no peer-reviewed result / ablation paper |
| A-Life novelty readiness      |  `6/9` | Strong integrated artifact; needs long-run OEE metrics + controls         |
| Consciousness-claim readiness |  `1/9` | Functional indicators only; no sentience evidence                         |
| Reproducibility readiness     |  `7/9` | Seeded determinism + tests strong; receipt/bootstrap drift to tighten     |
| Benchmark readiness           |  `5/9` | Harness exists + found useful truths; bench docs need refresh             |

---

## What is rare or unique (and what is not)

**Rare (now adversarially defended):**

1. **Substrate pluralism (`+3.91 σ`, sole field leader):** quantum statevectors, QGT, spin/Hopfield,
   irrep/symmetry, Eshkol AD/GWT, PINN/PIMC, procedural biologics all acting as life/cognition substrates.
2. **Functional consciousness scoreboard (`+4.75 σ`, survey mean `0.27`):** Butlin/GWT/IIT/FEP/HOT/AST
   instrumentation as first-class tested mechanisms — a near-empty axis in the field (closest peer: AURA,
   2025–2026, a single mind not an A-Life population).
3. **Deterministic theatrical ecosystem:** spectacle + single-seed replay + tests, where most large-scale
   browser A-Life (Pixling World, evo) gives up bit-reproducibility for GPU scale.
4. **Program-DNA framing:** Eshkol-like executable programs as heritable substrate code — interesting,
   _provided ablations show it matters._

**Not unique:** digital organisms (Tierra/Avida), embodied neural ecologies (Polyworld/Creatures), evolved
bodies/brains (Sims/Framsticks/EvoGym), open-endedness (Picbreeder/POET/ASAL), cellular emergence
(Life/Lenia/Growing-NCA).

---

## Scientific weak points (the gates between "impressive artifact" and "serious contribution")

1. **Peer validation is missing.** No external paper, reproducible public experiment suite, or independent
   replication.
2. **Ablations are missing.** If removing Eshkol AD/GWT/QGT/spin/irrep does **not** measurably change
   speciation, survival, diversity, or coupling, the substrate stack is decorative. **This is the single
   highest-leverage experiment** and it is exactly what would convert the breadth outlier into a depth result.
3. **Open-endedness is not proven** — and the statistics confirm it is the _weak_ axis (`+0.21 σ`, out-led by
   POET/Picbreeder/ASAL). Needs multi-seed long runs, novelty/diversity metrics, non-stationarity checks,
   plateau tests.
4. **The quantum advantage is unmeasured.** The P1 quantum-vs-classical benchmark is the missing receipt; the
   novelty auditor independently flagged it as the gap between "honest substrate" and "demonstrated advantage."
5. **Performance docs are stale.** Current `SuperMind` timings violate the old frame-budget claims (now
   flagged).
6. **Consciousness terms remain dangerous.** Better-disclaimed than most, but keep "proxy"/"indicator"
   language everywhere; never a `14/14` headline.

---

## Required experiments for a defensible paper

| Experiment                             | Design                                                                      | Metric                                                                    | Required result                                          |
| -------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Substrate ablation**                 | Full system vs remove Eshkol AD/GWT, QGT, spin/Hopfield, irrep, petri, ToM  | Speciation, lineage depth, Shannon diversity, mean survival, coupling     | ≥1 substrate has a reproducible non-trivial effect       |
| **P1 quantum-vs-classical**            | Parameter-matched quantum vs classical agent, ≥30 seeds/arm, pre-registered | Survival/decision-quality, effect size + 95% CI, ablation confirms causal | Significant effect (CI excludes 0) _or_ a clean negative |
| **Long-run OEE**                       | `N ≥ 30` seeds, fixed env, long horizons                                    | Novelty over time, diversity slope, innovation archive, plateau tests     | Continued innovation beyond boot transients              |
| **Performance truth**                  | Bench super-mind + world under one command after warmup                     | p50/p75/p99, allocation, frame share                                      | Updated docs match current measurements                  |
| **Consciousness-indicator discipline** | Butlin indicators as tests, not prose                                       | met/partial/unmet table with code receipts                                | No `14/14` headline unless code genuinely meets it       |
| **External replication**               | Fresh clone, scripted run, archived logs                                    | Exact command transcript + output                                         | Independent reproduction succeeds                        |

Statistically: do not publish single heroic runs — publish per-seed distributions, confidence intervals, and
effect sizes.

---

## Source index (re-verified 2026-06-26 — all resolve)

| System                              | Source                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Avida                               | https://alife.org/encyclopedia/digital-evolution/avida/ (origin: Ofria/Adami, Caltech 1993)                |
| Tierra                              | https://web.stanford.edu/class/sts129/Alife/html/Tierra.htm                                                |
| Polyworld                           | https://github.com/erjiang/polyworld-temp                                                                  |
| Framsticks                          | https://www.framsticks.com/                                                                                |
| Game of Life                        | https://conwaylife.com/                                                                                    |
| Boids                               | https://www.red3d.com/cwr/boids/                                                                           |
| Lenia                               | https://chakazul.github.io/lenia.html                                                                      |
| Karl Sims Evolved Virtual Creatures | https://www.karlsims.com/evolved-virtual-creatures.html                                                    |
| Creatures                           | https://en.wikipedia.org/wiki/Creatures_(video_game_series)                                                |
| OpenWorm                            | https://openworm.org/                                                                                      |
| Growing Neural Cellular Automata    | https://distill.pub/2020/growing-ca/ (DOI 10.23915/distill.00023)                                          |
| Enhanced POET                       | https://arxiv.org/abs/2003.08536                                                                           |
| MABE                                | https://alife.org/encyclopedia/software-platforms/mabe/                                                    |
| Picbreeder                          | https://pubmed.ncbi.nlm.nih.gov/20964537/                                                                  |
| EvoGym                              | https://openreview.net/forum?id=eoTy4ihL0W                                                                 |
| ALIEN                               | https://www.alien-project.org/index.html (ALIFE 2024 Virtual Creatures winner)                             |
| ASAL                                | https://sakana.ai/asal/ (arXiv 2412.17799; _Artificial Life_ 2025)                                         |
| Sugarscape                          | https://www.brookings.edu/books/growing-artificial-societies/                                              |
| Echo                                | https://pubmed.ncbi.nlm.nih.gov/11130923/                                                                  |
| Swarm                               | https://www.santafe.edu/research/results/working-papers/the-swarm-simulation-system-a-toolkit-for-building |
| breve                               | https://www.spiderland.org/s/                                                                              |
| Darwin Pond                         | https://www.ventrella.com/Darwin/darwin.html                                                               |
| Gene Pool / Swimbots                | https://www.swimbots.com/genepool/                                                                         |
| Biomorphs                           | https://www.cs.brandeis.edu/~obscure/cs113/watchmaker.html                                                 |
| Core War                            | https://arxiv.org/html/2601.03335v1                                                                        |

**Partial-peer sources surfaced by the novelty hunt** (kept for honest reference): Quantum Artificial Life
(Alvarez-Rodriguez et al., _Sci. Rep._ 2018, https://www.nature.com/articles/s41598-018-33125-3); Projective
Simulation (https://arxiv.org/abs/1407.2830); VQC quantum-RL (https://arxiv.org/abs/2203.14348); AURA
(https://github.com/youngbryan97/aura); CENs (https://dl.acm.org/doi/10.1145/3789982.3790046); Pixling World;
`casaisdev/primordial`; `tre-systems/evo`; `Dicklesworthstone/rust_scriptbots`.

---

## Reproducibility appendix

```sh
# Regenerate every statistic + all five SVG charts in this report from the source CSV:
bun scripts/alife-comparison-stats.ts
#   reads  docs/reports/2026-06-26-alife-comparison-matrix.csv
#   writes docs/reports/assets/alife-stats.json  + alife-*.svg  (deterministic; identical CSV -> identical bytes)

# Re-confirm the live gate receipts cited above:
bun test --coverage        # -> 1477 pass / 0 fail ; All files 95.03% line / 92.03% func
bun run check              # full gate (format, typecheck, lint, tests, receipts, sync, build)
```

---

## Final verdict

**Defensible:** a serious, unusually broad, evidence-heavy A-Life / cognitive testbed — the **broadest
integrated synthesis in the surveyed set (`z = +3.01`)**, especially rare in **substrate pluralism +
consciousness-theory instrumentation**, with **0 hard refutations** of the exact-conjunction novelty across a
4-angle adversarial hunt.

**Not defensible:** "world-first A-Life," "solved sentience," "proven NHSI," "demonstrated quantum advantage,"
"peer-validated breakthrough," or the old `<2%` 5-Archon frame-budget claim.

**Most accurate single sentence:** _Cosmogonic Quantum Mechalogodrom is a highly unusual, deterministic,
multi-substrate A-Life experiment whose novelty is in the integrated conjunction — measured as a `+3.01 σ`
breadth outlier carried by the field's emptiest axes — while its scientific status remains pre-publication and
its strongest claims still require ablation, long-run open-endedness data, the P1 quantum-vs-classical
receipt, and refreshed performance figures._

---

_0thernes LLC — measured, deterministic, reproducible — 2026-06-26. Statistics + charts computed by
`scripts/alife-comparison-stats.ts`; peers re-verified by an 8-agent adversarial web pass; read against
[`2026-06-26-CURRENT-TRUTH-BASELINE.md`](./2026-06-26-CURRENT-TRUTH-BASELINE.md)._
