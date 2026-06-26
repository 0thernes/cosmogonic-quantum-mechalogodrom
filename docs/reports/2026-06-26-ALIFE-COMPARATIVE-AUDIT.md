# A-Life Comparative Audit: Cosmogonic Quantum Mechalogodrom vs 25 Known Systems

**Date:** 2026-06-26  
**Scope:** current local repo at audit time, plus a sourced literature/documentation survey of 25 well-known Artificial Life / open-ended evolution / digital organism systems.  
**Companion data:** [`2026-06-26-alife-comparison-matrix.csv`](./2026-06-26-alife-comparison-matrix.csv)

> **Post-gate upgrade:** This copy includes the full `bun run check` result taken after the report was
> drafted and restored into `docs/reports/`. Current receipts: `1477` tests, `0` failures,
> `95.18%` line / `92.13%` function coverage, sync clean, build clean.

## Bottom Line

Cosmogonic Quantum Mechalogodrom is best classified as a **deterministic, browser-first, multi-substrate A-Life and cognitive-architecture testbed**. It is not "the first A-Life system," not the first digital evolution platform, not the first neural artificial ecology, not the first morphogenesis simulator, not the first open-ended search system, and not evidence of sentience.

Its defensible novelty is narrower and stronger:

1. It is a rare synthesis of large-scale interactive A-Life, deterministic replay, explicit reproduction/heredity, multi-agent ecology, quantum/geometric/spin/symmetry math substrates, and a multi-theory cognitive/Butlin-indicator scoreboard in one runnable codebase.
2. In the 25-system comparison matrix, it scores highest on **breadth of integrated mechanisms**: `4.44 / 5` across nine implementation axes, `z = 3.01` above the survey mean.
3. Its scientific maturity is low: `1.5 / 5` peer maturity. There is no peer-reviewed result yet proving that the integrated substrates produce robust, non-trivial, long-run open-ended evolution.
4. Current live verification found real engineering strength and one important performance truth: the full repo gate passes (`1477 pass, 0 fail` inside `bun run check`), but the live SuperMind benchmark is far slower than the older benchmark doc claims.

The cleanest claim is: **survey-rare synthesis, not global world-first proof.**

## Method

This audit uses three evidence channels:

| Evidence channel              | What was done                                                                                                                 | Status                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Internal code/docs inspection | Read governing files, README, module contracts, honesty audit, Tsotchke map, benchmarks, key source exports                   | Current local tree                  |
| Live verification             | `bun install`, `bun test`, `bun scripts/verify-receipts.ts --print`, `bun run bench`, focused `bun bench/super-mind.bench.ts` | Current local machine               |
| External comparison           | Sourced survey of 25 known A-Life systems from official pages, project pages, papers, or reputable indexes                    | Literature/documentation based only |

External projects were **not** downloaded and rebenchmarked. Scores for them are literature/documentation judgments, not fresh runtime measurements.

## What This Repo Is

Deductively, a system qualifies as Artificial Life when it builds synthetic populations or substrates that exhibit life-like processes: reproduction or persistence, heredity or state continuity, variation, selection pressure, ecological interaction, morphogenesis/self-organization, adaptation, and emergent collective dynamics.

This repo has code-backed instances of most of those:

| A-Life criterion       | Cosmogonic evidence                                                                      | Verdict                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Population of agents   | Entity manager, phyla, titans, factions, petri colonies, super minds                     | Met                                       |
| Heredity / genome      | `genome.ts`, `lineage.ts`, `primordial-soup.ts`, petri biologics                         | Met                                       |
| Mutation / variation   | Genome mutation, morphotypes, strains, Eshkol program mutation proxies                   | Met                                       |
| Selection pressure     | Resource/economy loops, predation, death, war, petri vitality/speciation                 | Met                                       |
| Ecological interaction | Titans, factions, shoggoths, puppet masters, economy, connectome, stigmergy              | Strong                                    |
| Morphogenesis          | 250 morphotypes, super bodies, petri strains, logo/tensor/irrep influences               | Strong but not full developmental biology |
| Cognition              | SuperMind, active inference, ToM, metacognition, reservoir, empowerment, GWT/IIT proxies | Strong as functional models               |
| Open-endedness         | Emergence angles and strain/speciation scaffolding                                       | Partial, not proven long-run OEE          |
| Scientific measurement | Seeded RNG, many tests, coverage, benchmarks, receipts                                   | Strong, with doc drift caveats            |

Therefore, deductively: **this is a real A-Life testbed**.

It is also a cognitive-theory sandbox, but it is **not** a conscious or sentient entity. The repo's own honesty audit says the Butlin-style status is `8/14 met + 6/14 partial`; these are computational indicators, not subjective experience.

## Live Verification Results

### Dependency state

Initial `bun test` and `bun run bench` failed because `node_modules` did not exist. This was environmental, not a code verdict: `simple-statistics` and `mitata` were declared in `package.json` but absent locally. After `bun install`, the verification was meaningful.

### Tests and coverage

| Check                            | Live result                                                                 |
| -------------------------------- | --------------------------------------------------------------------------- |
| `bun run check`                  | full gate passed: format, typecheck, lint, tests, receipts, sync, build     |
| `bun test` inside full gate      | `1477 pass`, `0 fail`, `1744891 expect() calls`, `151` test files, `16.04s` |
| `bun scripts/verify-receipts.ts` | `1477` measured tests, `95.18%` line coverage, `92.13%` function coverage   |
| `bun run sync:check`             | Surfaces match current constants: `1477 tests`, `95.18% / 92.13%`           |

Interpretation: the actual live measurement and published/synced public constants differ. The gate tolerates this by design, but the public badge numbers are not exact live facts for this run.

### Benchmarks

Live full-suite benchmark, then focused super-mind benchmark:

| Benchmark                 |   Full-suite live run | Focused live run | Frame-budget interpretation                                                                  |
| ------------------------- | --------------------: | ---------------: | -------------------------------------------------------------------------------------------- |
| `mulberry32(42)()`        |             `1.47 ns` |        not rerun | Determinism overhead vs `Math.random()` was about `1.17x`, negligible absolutely             |
| `selectTopK` vs full sort | `623 us` vs `9.59 ms` |        not rerun | `15.4x` faster than full sort                                                                |
| Spatial hash query        |            `383.7 ns` |        not rerun | Good hot-path performance                                                                    |
| Gray-Scott RD step        |             `94.2 us` |        not rerun | About `0.56%` of a 60 fps frame per call                                                     |
| `SuperMind.think()`       |             `3.34 ms` |        `8.85 ms` | `20.0%` to `53.1%` of a 16.67 ms frame if run every frame                                    |
| `5x think()` batch        |            `14.47 ms` |       `25.40 ms` | If amortized every 4 frames: `3.62 ms` to `6.35 ms`, or `21.7%` to `38.1%` of a 60 fps frame |
| `SuperMind.snapshot()`    |             `2.44 ms` |        `6.89 ms` | UI-cadence cost, but expensive                                                               |

The older `docs/BENCHMARKS.md` claim that GOAL5 5x minds are `<2%` amortized is not defensible on the live June 26, 2026 run. The current measured range is roughly `10.9x` to `19.1x` above that `<2%` contract target.

## Comparison Matrix Summary

Axes are scored `0..5`:

1. Reproduction/heredity
2. Open-endedness
3. Ecology/multi-agent coupling
4. Morphology/physics
5. Cognition/learning
6. Substrate pluralism
7. Instrumentation/reproducibility
8. Consciousness-theory instrumentation
9. Visual/interactive scale

Peer maturity is scored separately and not included in breadth.

Computed from the CSV:

| Rank by breadth | Project                             | Breadth mean | Peer maturity |
| --------------: | ----------------------------------- | -----------: | ------------: |
|               1 | Cosmogonic Quantum Mechalogodrom    |       `4.44` |         `1.5` |
|               2 | ALIEN                               |       `3.50` |         `2.5` |
|               3 | Creatures                           |       `3.33` |         `4.0` |
|               4 | Framsticks                          |       `3.22` |         `4.0` |
|               5 | Polyworld                           |       `3.00` |         `4.5` |
|               6 | Gene Pool / Swimbots                |       `2.94` |         `3.0` |
|               7 | Karl Sims Evolved Virtual Creatures |       `2.89` |         `5.0` |
|               8 | Picbreeder                          |       `2.89` |         `4.5` |
|               9 | breve                               |       `2.78` |         `4.0` |
|              10 | Darwin Pond                         |       `2.67` |         `3.0` |

Survey mean breadth: `2.54`; standard deviation: `0.63`; Cosmogonic z-score: `3.01`.

That is a meaningful outlier signal, but it measures **breadth of synthesis**, not scientific truth.

## Nearest Neighbors In Feature Space

Euclidean distance uses the nine implementation axes above. Lower is closer.

| Nearest peer                        | Distance to Cosmogonic | Why it is close                                                        | Why it is still different                                                                         |
| ----------------------------------- | ---------------------: | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ALIEN                               |                 `5.17` | GPU artificial ecosystems, digital organisms, physics, visual scale    | Less cognitive-theory/Butlin/GWT/IIT instrumentation; less repo-level test evidence in this audit |
| Creatures                           |                 `5.57` | Artificial pets, genetics, brains, biochemistry, learning, interaction | Commercial virtual pets, not multi-substrate quantum/geometric cognitive lab                      |
| Polyworld                           |                 `6.48` | Neural agents, vision, metabolism, ecology, mating, predation          | Less substrate pluralism and consciousness-theory scoring                                         |
| Framsticks                          |                 `6.56` | Body/brain evolution, genotype/phenotype, 3D embodied creatures        | Stronger evolved morphology, weaker cognition/consciousness stack                                 |
| breve                               |                 `7.00` | 3D A-Life simulation environment                                       | Platform, not the same integrated specimen                                                        |
| Karl Sims Evolved Virtual Creatures |                 `7.14` | Canonical evolved 3D morphology/control                                | Task-evolved creatures, not persistent ecosystem/cognitive theory stack                           |
| ASAL                                |                 `7.35` | Modern search for A-Life simulations/open-ended novelty                | Meta-search over sims, not a deterministic embodied ecosystem itself                              |
| Picbreeder                          |                 `7.48` | Open-ended collaborative evolution                                     | Human-driven image evolution, not ecology/cognition                                               |

The closest real conceptual neighbor is **ALIEN**, not Avida/Tierra. Avida and Tierra are stronger at digital evolution purity; Cosmogonic is broader but less mature.

## Visual Map

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

Interpretation: Cosmogonic lands in the "broad but immature" quadrant. That is the honest quadrant.

## Axis Leaders

| Axis                                 | Leaders                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Reproduction/heredity                | Creatures, Framsticks, Gene Pool, Darwin Pond, MABE                                 |
| Open-endedness                       | Picbreeder, ASAL, Enhanced POET, ALIEN, Creatures/Avida/Tierra/Polyworld class      |
| Ecology                              | Cosmogonic, Polyworld, Sugarscape, Swarm, ALIEN                                     |
| Morphology/physics                   | ALIEN, Framsticks, Gene Pool, Karl Sims, breve, EvoGym                              |
| Cognition/learning                   | Cosmogonic, Creatures, Polyworld, OpenWorm, Enhanced POET                           |
| Substrate pluralism                  | Cosmogonic leads clearly in this scoring                                            |
| Instrumentation                      | Evolution Gym and Game of Life tooling/ecosystem lead; Cosmogonic is strong locally |
| Consciousness-theory instrumentation | Cosmogonic leads, but this is functional-theory instrumentation, not sentience      |
| Visual scale                         | Cosmogonic, ALIEN, Creatures, Karl Sims, Picbreeder                                 |

## Deductive Claims

### Claim 1: "This is Artificial Life."

Valid. The repo implements a synthetic ecology with agent populations, reproduction/heredity, mutation, interaction, selection-like pressure, morphogenesis, and emergent telemetry. This is a legitimate A-Life testbed.

### Claim 2: "This is not just an A-Life toy."

Mostly valid. It has strict TypeScript, deterministic seeded randomness, tests, coverage, benchmark harnesses, multiple subsystem contracts, and adversarial honesty docs. It is much more engineered than a casual particle demo.

### Claim 3: "This is world-first Artificial Life."

False. Conway's Life, Boids, Core War, Tierra, Avida, Polyworld, Framsticks, Sims, Creatures, Sugarscape, and many others predate it by decades.

### Claim 4: "This is world-first in its exact conjunction."

Plausible but not proven. Among the 25 surveyed systems, no comparator combines all of:

- deterministic one-seed replay,
- WebGL/browser-first large interactive ecology,
- explicit reproduction/petri/digital-biologics layer,
- five apex cognitive agents,
- active inference / ToM / metacognition / reservoir / empowerment / GWT / IIT-style metrics,
- exact quantum-state and quantum-geometry inspired subsystems,
- Tsotchke/Eshkol AD/GWT program-DNA framing,
- tests/coverage/benchmark receipts.

That supports a **survey-first / rare-conjunction** claim, not a universal world-first claim.

### Claim 5: "This is scientific evidence for sentience."

Invalid. It is evidence that certain functional correlates are implemented. It is not evidence of phenomenal consciousness. The hard problem is untouched.

## Inductive Claims

### Induction from code/tests

The codebase has enough test and module coverage to support the claim that many mechanisms are actually implemented, not only described. Live `bun run check` produced `1477` passing tests. The source/test file ratio is `195 src TS files / 151 test files = 1.29 source modules per test file`, which is strong for a research-style sim.

### Induction from performance

The low-level primitives are fast: RNG, scalar math, spatial hash, top-K, quantum n=5 gates, and RD steps are all within reasonable budgets. The SuperMind stack is the risk. Current live timing contradicts older docs, so the correct inductive conclusion is:

**The small math kernels are healthy; the multi-mind cognition stack now requires fresh frame-budget work.**

### Induction from comparison

Classic A-Life systems typically specialize:

- Game of Life and Lenia specialize in cellular emergence.
- Tierra and Avida specialize in digital organisms.
- Polyworld and Creatures specialize in embodied neural ecology.
- Framsticks, Sims, Gene Pool, EvoGym specialize in morphology/body-control evolution.
- Sugarscape, Echo, Swarm specialize in artificial societies/complex adaptive systems.
- Picbreeder, POET, ASAL specialize in open-ended search.

Cosmogonic's distinctiveness is that it attempts to fuse many of those categories at once. Historically, breadth alone can produce shallow "everything demos"; the repo's tests and contracts reduce that risk, but do not eliminate it.

## Probability Bands

These are calibrated judgment bands over the **surveyed evidence**, not universal mathematical probabilities.

| Proposition                                                                                                           | Probability band | Verdict        |
| --------------------------------------------------------------------------------------------------------------------- | ---------------: | -------------- |
| This repo is legitimately an A-Life system                                                                            |      `0.90-0.98` | Yes            |
| It is the first A-Life system                                                                                         |          `<0.01` | No             |
| It is the first digital evolution system                                                                              |          `<0.01` | No             |
| It is the first embodied neural artificial ecology                                                                    |          `<0.01` | No             |
| It is the first open-ended search / OEE project                                                                       |          `<0.01` | No             |
| It is rare among known A-Life systems in exact multi-substrate + consciousness-theory + deterministic WebGL synthesis |      `0.70-0.85` | Plausible      |
| It is scientifically groundbreaking today                                                                             |      `0.35-0.55` | Not yet proven |
| It could become publishably notable after ablations and long-run studies                                              |      `0.55-0.75` | Plausible      |
| It demonstrates sentience                                                                                             |          `<0.01` | No             |

## Standard Ratings

| Dimension                     | Rating | Reason                                                                                            |
| ----------------------------- | -----: | ------------------------------------------------------------------------------------------------- |
| Engineering readiness         |  `7/9` | Full gate passed after restoration; performance docs were stale and are now called out explicitly |
| Scientific readiness          |  `3/9` | Hypothesis-generating prototype; no peer-reviewed results or ablation paper                       |
| A-Life novelty readiness      |  `6/9` | Strong integrated artifact; needs long-run OEE metrics and controls                               |
| Consciousness-claim readiness |  `1/9` | Functional indicators only; no sentience evidence                                                 |
| Reproducibility readiness     |  `7/9` | Seeded determinism and tests strong; dependency/bootstrap and receipt drift need tightening       |
| Benchmark readiness           |  `5/9` | Harness exists and found useful truths; benchmark doc needs current refresh                       |

## What Is Rare Or Unique

Strong rare features:

1. **Substrate pluralism:** The repo attempts to make quantum statevectors, QGT, spin/Hopfield, irrep/symmetry, Eshkol AD/GWT, PINN/PIMC-style layers, and procedural biologics all act as life/cognition substrates.
2. **Functional consciousness scoreboard:** Most A-Life systems do not expose Butlin/GWT/IIT/FEP/HOT/AST-style instrumentation as first-class tested mechanisms.
3. **Deterministic theatrical ecosystem:** It combines visual spectacle with deterministic replay and tests instead of leaving everything as unmeasured animation.
4. **Program-DNA framing:** Eshkol-like executable programs as heritable substrate code is a legitimately interesting angle, provided ablations show it matters.

Not unique:

1. Digital organisms: Tierra and Avida got there decades earlier.
2. Neural embodied ecologies: Polyworld and Creatures are canonical.
3. Evolved bodies/brains: Sims, Framsticks, Gene Pool, EvoGym.
4. Open-endedness: Picbreeder, POET, ASAL, and the broader OEE literature.
5. Cellular emergence/morphogenesis: Game of Life, Lenia, Neural CA.

## Scientific Weak Points

These are not insults; they are the gates between "impressive artifact" and "serious contribution."

1. **Peer validation is missing.** No external paper, no reproducible public experiment suite, no independent replication.
2. **Ablations are missing.** If removing Eshkol AD/GWT/QGT/spin/irrep does not measurably change speciation, survival, diversity, or coupling, then the substrate stack is decorative.
3. **Open-endedness is not proven.** It needs multi-seed long runs, novelty/diversity metrics, non-stationarity checks, and evidence against plateauing.
4. **Performance docs are stale.** Current SuperMind measurements violate older frame-budget claims.
5. **Consciousness terms remain dangerous.** The repo is better than most at disclaimers, but phrases like "sentience index" can still be misread. Keep "proxy" and "indicator" language everywhere.

## Required Experiments For A Defensible Paper

Minimum experiment plan:

| Experiment                         | Design                                                                     | Metric                                                                             | Required result                                            |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Substrate ablation                 | Full system vs remove Eshkol AD/GWT, QGT, spin/Hopfield, irrep, petri, ToM | Speciation rate, lineage depth, Shannon diversity, mean survival, coupling density | At least one substrate has reproducible non-trivial effect |
| Long-run OEE                       | `N >= 30` seeds, fixed hardware/env, long horizons                         | novelty over time, diversity slope, innovation archive, plateau tests              | Continued innovation beyond transient boot dynamics        |
| Performance truth                  | Bench super-mind and world under same command after warmup                 | p50/p75/p99, allocation, frame share                                               | Updated docs match current measurements                    |
| Consciousness indicator discipline | Butlin indicators as tests, not prose                                      | met/partial/unmet table with code receipts                                         | No 14/14 headline unless code genuinely meets it           |
| External replication               | Fresh clone, scripted run, archived logs                                   | exact command transcript and output                                                | Independent reproduction succeeds                          |

Statistically, do not publish single heroic runs. Publish per-seed distributions, confidence intervals, and effect sizes.

## Source Index For Comparator Set

The full scoring matrix links one source per row. Key sources:

| System                              | Source                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Avida                               | https://alife.org/encyclopedia/digital-evolution/avida/                                                    |
| Tierra                              | https://web.stanford.edu/class/sts129/Alife/html/Tierra.htm                                                |
| Polyworld                           | https://github.com/erjiang/polyworld-temp                                                                  |
| Framsticks                          | https://www.framsticks.com/                                                                                |
| Game of Life                        | https://conwaylife.com/                                                                                    |
| Boids                               | https://www.red3d.com/cwr/boids/                                                                           |
| Lenia                               | https://chakazul.github.io/lenia.html                                                                      |
| Karl Sims Evolved Virtual Creatures | https://www.karlsims.com/evolved-virtual-creatures.html                                                    |
| Creatures                           | https://en.wikipedia.org/wiki/Creatures_(video_game_series)                                                |
| OpenWorm                            | https://openworm.org/                                                                                      |
| Growing Neural Cellular Automata    | https://distill.pub/2020/growing-ca/                                                                       |
| Enhanced POET                       | https://arxiv.org/abs/2003.08536                                                                           |
| MABE                                | https://alife.org/encyclopedia/software-platforms/mabe/                                                    |
| Picbreeder                          | https://pubmed.ncbi.nlm.nih.gov/20964537/                                                                  |
| EvoGym                              | https://openreview.net/forum?id=eoTy4ihL0W                                                                 |
| ALIEN                               | https://www.alien-project.org/index.html                                                                   |
| ASAL                                | https://sakana.ai/asal/                                                                                    |
| Sugarscape                          | https://www.brookings.edu/books/growing-artificial-societies/                                              |
| Echo                                | https://pubmed.ncbi.nlm.nih.gov/11130923/                                                                  |
| Swarm                               | https://www.santafe.edu/research/results/working-papers/the-swarm-simulation-system-a-toolkit-for-building |
| breve                               | https://www.spiderland.org/s/                                                                              |
| Darwin Pond                         | https://www.ventrella.com/Darwin/darwin.html                                                               |
| Gene Pool / Swimbots                | https://www.swimbots.com/genepool/                                                                         |
| Biomorphs                           | https://www.cs.brandeis.edu/~obscure/cs113/watchmaker.html                                                 |
| Core War                            | https://arxiv.org/html/2601.03335v1                                                                        |

## Final Verdict

**Defensible:** This repo is a serious and unusually broad A-Life/cognitive testbed. In the surveyed set, it is the broadest integrated synthesis and is especially rare in substrate pluralism plus consciousness-theory instrumentation.

**Not defensible:** "World first A-Life," "solved sentience," "proven NHSI," "peer-validated breakthrough," or the old `<2%` 5-Archon frame-budget claim.

**Most accurate single sentence:**  
Cosmogonic Quantum Mechalogodrom is a highly unusual, evidence-heavy, deterministic multi-substrate A-Life experiment whose novelty is in the integrated conjunction, while its scientific status remains pre-publication and its strongest claims now require ablation, long-run open-endedness data, and refreshed performance receipts.
