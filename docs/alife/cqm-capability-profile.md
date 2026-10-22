# CQM-25: digital-life capability research profile

Proposed operational framework; reviewed 2026-10-21. Evidence reference: `339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9`.

A research-informed profile for artificial life, embodied synthetic cognition and procedural morphogenesis, spanning the organization of one being, adaptive behavior, consciousness-related mechanisms and the engineering of inspectable worlds.

This is an author-defined research profile, not a consensus gold standard or an executed 25-task benchmark. Engineering dimensions do not establish consciousness, sentience, AGI or superintelligence. Numeric capability scores remain null until calibrated.

## Visual scale and the nine-axis comparison

The existing visual-scale rating remains 4.0 (rich visuals). A single complex being qualifies: Xylos exposes neural activity through deforming membranes and a visible graph, while apex forms and populations add other scales. Population capacity, delivered frame time and individual visual expressiveness are distinct measurements. The rubric's 5.0 anchor, iconic spectacle, has no independent calibration that justifies a numerical uplift in this review.

The 155-system comparison remains a separate nine-axis rubric. No peer scores or rankings are inferred here.

## Evaluation protocol

1. Declare the unit of analysis, entity boundary, intended modeling fidelity and applicable axes before evaluation. Treat individual, population and world measurements separately. N/A needs a scope reason; missing or failed evidence cannot be relabeled N/A.
2. Freeze the implementation, task generator, development and held-out distributions, training exposure, horizon, hardware and resource budget. Preregister primary metrics, meaningful effect sizes, failure conditions and stopping rules.
3. Use controls appropriate to the claim: random/fixed policy, frozen learning, interrupted recurrence, disconnected broadcast, replayed environment or matched sham intervention. Match compute and other confounds where feasible.
4. Report independent experimental units and their dependence. Consecutive frames are not independent replicates; population studies must account for shared lineages and use independently initialized runs.
5. Publish outcome distributions, uncertainty intervals, negative results, missingness and sensitivity analyses. Use multiplicity control for families of inferential tests; do not select only favorable seeds.
6. Archive the commit, configuration, seeds or recorded entropy inputs, interventions and raw outputs. Reproduce each result within stated numerical tolerances, and seek independent replication of the specific result.
7. Separate capability measurement, implementation evidence, causal evidence and external validity. A unit-test pass or a named module does not establish the full axis protocol. Strong evidence can support a negative result.
8. Before cross-system scoring, calibrate task-specific anchors on multiple systems, use independent raters and report agreement. Publish all eligible denominators and resource limits. Do not translate nine historical scores into 25 new scores.
9. For AGI or superintelligence comparisons, declare task-family coverage, capability depth, reference populations, adaptation budget, tool access, compute, time and human assistance. Report weak domains; neither a single exceptional task nor a profile average establishes general superhuman ability.
10. For neurometric analogues, identify the estimator, perturbation design, null models and validation domain. Human PCI thresholds, brain-score correlations and animal sentience criteria do not automatically transfer to software.
11. Reuse relevant existing evaluation resources such as Avida, MODES, EvoGym, Animal-AI, Melting Pot and Brain-Score with their own protocols. This profile organizes several research goals; it is not the first ALife benchmark or a universal standard.

## Limits

- This initial edition is a source and repository review with proposed experiments. Its 25 acceptance protocols have not been executed as a unified benchmark; every numeric capability score is null.
- The selected axes and grouping are author-defined, correlated and not exhaustive. Primary literature motivates the constructs; it does not establish consensus on this exact profile or equal axis weights.
- Implementation and bounded-test labels refer to cited repository mechanisms and narrow tests. Failed V4 and Phase-B advancement criteria remain visible; mechanism presence does not imply generalization.
- Life-like organization, cognition, subjective consciousness and valenced sentience are different claims. Theory-linked mechanisms and reward or valence variables do not establish experience.
- The profile supplements the original Butlin indicator mapping; it does not replace those 14 indicators or claim their criteria are all met. Human neuroscience and animal behavior evidence require justified transfer to artificial systems.
- Engineering breadth, substrate count, photorealism, visual beauty, number of beings and parameter count contribute no points to mental-capability claims. No overall life, consciousness, sentience, AGI or SI score is calculated.

## 1. Reproduction and heredity

Production of descendants with causally inherited, variable organization.

- Domain: Life, evolution and embodiment; kind: life; scope: entity, population.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Genome crossover and mutation are implemented, and the shipped entity fission test compares inherited-trait selection with a trait-blind control. This supports bounded heredity and fecundity selection; autonomous open-ended reproduction and the new pedigree protocol remain unassessed.
- Measures: viable offspring per parent; parent-offspring trait transmission; heritable variation under matched conditions
- Acceptance experiment: Track pedigrees across generations; intervene on inherited state, randomize parent-offspring assignments as a control, and distinguish autonomous reproduction from evaluator cloning.
- Falsifier: Offspring are injected by the harness, inherited variables do not affect descendants, or transmission vanishes after environment matching.
- Repository evidence: [Genome representation, crossover and mutation](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/genome.ts); [Deterministic inheritance and variation tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/genome.test.ts); [Production fission versus trait-blind selection control](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/entity-repro-select.test.ts)
- Sources: avida2003, bedau2000

## 2. Evolutionary innovation and open-endedness

Selection produces retained adaptive novelty across generations; open-endedness remains a finite-horizon research claim.

- Domain: Life, evolution and embodiment; kind: life; scope: population.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Existing entity and Petri tests exercise differential selection and strain-specific fitness effects. They do not establish retained new functions, superiority to drift across novel tasks, or sustained open-ended innovation; finite forms and scripted progression must not be counted as such evidence.
- Measures: fitness gain over drift control; functional novelty and retention; MODES trajectories with horizon
- Acceptance experiment: Run mutation/selection, neutral-drift and frozen-heredity populations under matched budgets; assess new functions on held-out challenges and plot novelty saturation over increasing horizons.
- Falsifier: Novelty is only random visual variation, improvement equals drift, or a fixed catalogue is repeatedly rediscovered.
- Repository evidence: [Bounded fecundity-selection contrast](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/entity-repro-select.test.ts); [Strain-dependent selection and ablation](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/petri-organism-intelligence-selection.test.ts); [Current open-endedness and reproduction limits](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/VERIFICATION-ANALYTICAL-DATA.md)
- Sources: modes2019, avida2003

## 3. Environmental and ecological coupling

Bidirectional functional dependence between an entity and its surroundings; multi-species ecology is an optional extension.

- Domain: Life, evolution and embodiment; kind: life; scope: entity, population, world.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos senses local Gray-Scott chemistry and changes that field through gated actions; tests check subsequent perception and compare a closed loop with uniform inputs. This supports a single-entity causal loop, not the full new perturbation protocol or long-horizon ecological persistence.
- Measures: effect of world perturbation on behavior; effect of entity intervention on world state; niche or interaction persistence when applicable
- Acceptance experiment: Perturb resource locations, environmental rules and entity actions independently; compare a live world with a recorded or shuffled environment. A single entity in a responsive environment is eligible.
- Falsifier: The environment is decorative, entity actions cannot change relevant state, or coupling disappears when shared scripted timing is removed.
- Repository evidence: [Local chemical sensing and field writes](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-habitat.ts); [Action-to-environment-to-perception controls](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-habitat.test.ts)
- Sources: modes2019, animalai2019, meltingpot2021

## 4. Morphology and development

Structured embodiment develops or changes through local rules and interactions, with measurable functional consequences.

- Domain: Life, evolution and embodiment; kind: life; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Procedural bodies change with internal state, evolution parameters and deterministic morph transitions. Existing body tests demonstrate state-dependent geometry and rendering behavior; they do not establish developmental growth with independently measured functional benefits under body lesions or changed boundary conditions.
- Measures: developmental reproducibility; structural organization; body perturbation effect on function
- Acceptance experiment: Grow from altered seeds and boundary conditions, quantify topology and task performance, and compare live development with a fixed or replayed shape.
- Falsifier: Apparent growth is a fixed animation or morphology changes have no tested functional consequence.
- Repository evidence: [Neural-state-dependent procedural embodiment](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-body.ts); [Geometry and graph response tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-body.test.ts); [Mind and evolution parameters drive body presentation](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/super-body-control.test.ts)
- Sources: nca2020, lenia2019, evogym2021

## 5. Embodied dynamics and internal consistency

Action, body and environment follow declared, consistent update laws. Earth-like physical realism is not required.

- Domain: Life, evolution and embodiment; kind: engineering; scope: entity, world.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos uses fixed-step cognitive updates and bounded motion, with tests for timestep partitioning, input validation and finite state. These are local consistency checks, not a convergence or invariant audit of every world subsystem; Earth-like physical realism is not required by this axis.
- Measures: timestep or resolution convergence; declared invariant violations; action-body-environment causal response
- Acceptance experiment: State the simulated laws, units and tolerances; vary timestep/resolution and perturb actuators, body parameters and boundary conditions. Test only invariants actually claimed by the model.
- Falsifier: Behavior depends on rendering framerate, undeclared teleports or impossible state transitions; claimed invariants fail outside tolerance.
- Repository evidence: [Fixed-step integration and bounded catch-up](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/core/xylos-session.ts); [Partition invariance and invalid-timestep checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-session.test.ts); [Long-run state and topology bounds](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts)
- Sources: evogym2021, lenia2019, reproducibility2021

## 6. Perception and perceptual integration

Task-relevant state is inferred from available sensory input across noise, ambiguity and transformations.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos integrates numeric chemical, hazard and gradient channels with learned reliability; existing tests compare predictable and noisy observations. These channels expose simulation measurements directly, so they do not establish visual recognition, label-free perception or robustness on the proposed held-out sensory tasks.
- Measures: held-out discrimination accuracy; noise/occlusion robustness; cross-channel integration benefit
- Acceptance experiment: Use unseen stimuli, cue-conflict and sensory-ablation tests; prevent access to ground-truth world labels; compare single-channel, shuffled-input and intact conditions.
- Falsifier: Success depends on privileged hidden-state access, fixed labels or nuisance cues rather than the claimed perceptual information.
- Repository evidence: [Numeric percepts and reliability-weighted updates](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Direct simulation measurements supplied to the organism](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-habitat.ts); [Reliability and continuous-input response tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts)
- Sources: animalai2019, brainscore2018

## 7. Learning and plasticity

Experience causes durable, useful changes in behavior or internal mappings.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos has plastic connections and online sensory/action predictors; existing tests compare learning with frozen controls and check forecast improvement in a bounded feedback environment. This establishes narrow mechanisms, not a broad learning benchmark, reversal generalization or durable improvement across task families.
- Measures: learning curve and sample efficiency; retained improvement; contingency-reversal adaptation
- Acceptance experiment: Train on controlled experience and test held-out trials with plasticity enabled versus frozen; reverse contingencies and use yoked-exposure controls.
- Falsifier: Performance changes are scripted or transient state drift, or remain unchanged when all learning updates are disabled.
- Repository evidence: [Plasticity and online predictive updates](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Frozen-learning and action-feedback controls](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts); [Associative imprint, recall and decay tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/plastic-weights.test.ts)
- Sources: animalai2019, homeostasis2014, continual2017

## 8. Memory and continual retention

Information from earlier experience affects later behavior despite delay, interference and new learning.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Associative fast weights and holographic context-action traces store and retrieve information, with tests for recall, interference-like superposition and decay. These bounded memory mechanisms do not establish continual retention across independently held-out task sequences or the proposed delayed behavioral memory protocol.
- Measures: delay-dependent recall; interference resistance; forward/backward transfer and forgetting
- Acceptance experiment: Use delayed nonmatching or sequence tasks, remove external traces, interleave new tasks, and selectively erase or scramble the proposed memory store.
- Falsifier: Later performance can be explained by current inputs, leaked labels or environmental traces; memory ablation has no predicted effect.
- Repository evidence: [Decaying context-action binding and recall](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/holographic-memory.ts); [Binding, noisy cleanup and context recall tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/holographic-memory.test.ts); [Associative superposition and forgetting tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/plastic-weights.test.ts)
- Sources: continual2017, animalai2019

## 9. Predictive and causal world models

Internal models predict outcomes and discriminate the consequences of interventions, rather than only correlations.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Xylos has bounded action-conditioned prediction tests. Broader evidence remains negative: the V4 adaptive ecology predictor failed both controls, and the Phase-B temporal predictor failed its advancement gate. These branch-specific results neither validate general causal modeling nor show that every predictor lacks useful ability.
- Measures: held-out prediction error; intervention prediction accuracy; counterfactual control benefit
- Acceptance experiment: Change action-outcome rules and hidden causes; test intervention forecasts on unseen combinations; ablate the model while matching compute and immediate observations.
- Falsifier: Only observational correlations are reproduced, intervention forecasts fail, or the claimed model never influences decisions.
- Repository evidence: [Bounded action-model and feedback prediction tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts); [Frozen V4 predictor failure and claim boundaries](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/VERIFICATION-ANALYTICAL-DATA.md); [Sealed temporal predictor failure with eight failed criteria](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/organism-intelligence-phase-b-predictor-temporal-development.test.ts)
- Sources: animalai2019, butlin2023, cognitive2026

## 10. Autonomous goal regulation

Persistent internal priorities select and revise actions without a human choosing each step.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Implementation identified. Capability score: uncalibrated.
- Current finding: Xylos selects actions without stepwise human commands using energy-dependent hunger, uncertainty-linked curiosity and learned action forecasts. Its priorities are designed control rules; extended goal-persistence, novel goal switching and matched open-loop comparisons for this new axis have not been evaluated.
- Measures: goal persistence under distraction; context-sensitive goal switching; intervention rate per successful episode
- Acceptance experiment: Run extended unattended episodes, vary internal needs and external opportunities, and intervene on goal states; compare fixed-priority and open-loop policies.
- Falsifier: A script or external operator selects each goal, or declared priorities have no causal effect on action.
- Repository evidence: [Need-weighted autonomous motor policy](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Unprompted activity and causal action-model tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts)
- Sources: homeostasis2014, agi2024, butlin2023

## 11. Reasoning and planning

Multi-step decisions use relations or prospective consequences to achieve new goals.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Implementation identified. Capability score: uncalibrated.
- Current finding: NHI computes bounded GOAP next steps and updates its fact model after material outcome acknowledgement; the apex also has a discrete active-inference policy model. These constrained planners do not establish unfamiliar relational reasoning, broad planning generalization or success on the new planning protocol.
- Measures: novel-task success; planning-horizon scaling; replanning benefit under changed constraints
- Acceptance experiment: Use held-out detours, relational puzzles and changed action costs; compare reactive and planning-disabled controls with matched action/compute budgets.
- Falsifier: A memorized action sequence or local reflex matches performance, or plans fail after a relevant causal change.
- Repository evidence: [GOAP planning, utility bias and material fact acknowledgement](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/nhi.ts); [Discrete policy evaluation with stated approximation](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/active-inference.ts); [Bounded material-action development harness](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/organism-intelligence-phase-b-nhi-closed-loop-development.test.ts)
- Sources: animalai2019, agi2024, cognitive2026

## 12. Transfer and compositional generalization

Previously acquired capacities support unfamiliar tasks, combinations and environments under an explicit adaptation budget.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Bounded tasks and controlled development harnesses exist, but V4 passed only the Titan diplomacy family and failed ordinary, Petri and predictor gates. Phase-B remains development-only, including a failed temporal-predictor gate. Those results do not establish broad transfer; the new held-out-family protocol is unrun.
- Measures: zero/few-shot transfer; held-out combination accuracy; performance breadth and depth by task family
- Acceptance experiment: Hold out task families and combinations before development; log training exposure, adaptation compute and assistance; report disaggregated performance against matched baselines.
- Falsifier: Evaluation overlaps training, extensive hidden retraining is required, or success is confined to familiar surface variants.
- Repository evidence: [One family pass and three failures under the frozen V4 protocol](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md); [Failed successor development gate](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/organism-intelligence-phase-b-predictor-temporal-development.test.ts); [Narrow semantic development evidence and forbidden broader claims](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/organism-intelligence-phase-b-nhi-closed-loop-development.test.ts)
- Sources: animalai2019, agi2024, cognitive2026

## 13. Metacognition and self-modeling

The system monitors uncertainty or its own limitations and uses that information to regulate cognition and action.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Reliability cues and Taylor forecast remainders influence confidence and decision coherence; tests check directional changes and a causal resolver effect. This supports functional uncertainty regulation, not calibrated metacognitive accuracy, a comprehensive self-model or matched first-order-performance evaluation under the proposed protocol.
- Measures: confidence calibration; meta-d-prime/d-prime when assumptions hold; adaptive opt-out or information seeking; self-perturbation prediction
- Acceptance experiment: Match first-order difficulty, test confidence versus correctness, perturb sensors/actuators and test self-predictions; ablate the monitor and evaluate control consequences.
- Falsifier: Confidence is a decorative label, tracks only task difficulty, or monitoring ablation leaves supposedly dependent control unchanged.
- Repository evidence: [Reliability-based confidence executive](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/metacognition.ts); [Bounded confidence and cue-response tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/metacognition.test.ts); [Forecast confidence causally affects resolver coherence](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/predictive-metacognition.test.ts)
- Sources: metacognition2014, butlin2023

## 14. Social cognition and communication

Behavior uses information about other agents; signals causally coordinate or inform interaction.

- Domain: Adaptive and general cognition; kind: cognition; scope: entity, population.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Opponent beliefs and a learned rival-proximity head influence social threat/readiness; existing tests examine determinism, learning and isolated control effects. They do not establish communication semantics, unfamiliar-partner generalization or flexible social cognition across the new interaction protocol.
- Measures: novel-partner adaptation; coordination benefit; message-intervention effect; partner-state prediction
- Acceptance experiment: Test unfamiliar partners and opposing incentives; scramble communication or exchange partner identities; control for environmental cues and fixed coordination scripts.
- Falsifier: Signals are epiphenomenal, partners share privileged hidden state, or coordination cannot generalize beyond a fixed pairing.
- Repository evidence: [Bounded opponent-model mechanism](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/theory-of-mind.ts); [Belief and context-response checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/theory-of-mind.test.ts); [Narrow learned rival anticipation and operational controls](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/super-creature-social.test.ts)
- Sources: meltingpot2021, cognitive2026

## 15. Individuality and maintained boundary

A temporally identifiable organized unit maintains a functional distinction from its environment; boundaries may be distributed.

- Domain: Individual organization and viability; kind: life; scope: entity, population.
- Evidence review: Implementation identified. Capability score: uncalibrated.
- Current finding: Xylos maintains a separate recurrent state, topology, position and session history while exchanging numeric inputs and effects with its habitat. This identifies an implemented computational unit; maintained identity through component turnover, selective boundary exchange and functional cohesion under partition have not been assessed.
- Measures: identity persistence through component turnover; boundary-selective exchange; functional cohesion under partition
- Acceptance experiment: Declare candidate boundaries; exchange or remove components and compare within-unit versus cross-boundary interventions; track identity independently of rendered appearance.
- Falsifier: Identity is only a label or mesh ID, proposed boundaries predict no functional organization, or all coherence comes from an external coordinator.
- Repository evidence: [Persistent organism state and bounded topology](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Organism-specific lifecycle and recorded-input boundary](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/core/xylos-session.ts); [Explicit sensing and action interface](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-habitat.ts)
- Sources: autopoiesis1974, bedau2000

## 16. Resource-dependent self-maintenance

Acquired resources support ongoing maintenance of the entity's operational organization.

- Domain: Individual organization and viability; kind: life; scope: entity, world.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Entities consume edible resources and receive nourishment; Xylos energy affects hunger and movement. Existing resource tests cover ownership, depletion and timed restoration. These controls do not establish autonomous maintenance of operational organization or deprivation-dependent viability; scheduled resource respawn remains a designed intervention.
- Measures: resource-budget accounting; viability versus deprivation; maintenance flux and replenishment recovery
- Acceptance experiment: Couple declared resources to real model costs; apply deprivation and replenishment, disable maintenance actions, and compare to a resource-independent control.
- Falsifier: Resource numbers are cosmetic, survival is invariant to resource access, or the evaluator silently restores state.
- Repository evidence: [Grazing and energy-dependent control](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/entities.ts); [Resource-linked energy and movement](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Single-consumption accounting and explicit five-second respawn](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/edible-resource.test.ts)
- Sources: autopoiesis1974, homeostasis2014

## 17. Homeostatic regulation

Feedback keeps important internal variables within declared viable ranges despite disturbance.

- Domain: Individual organization and viability; kind: life; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: A criticality controller adjusts activation gain from a leaky branching-ratio estimate; existing tests cover silent-input excitation, bounded trajectories and an active-input regime. This is a narrow neural-gain homeostat, not evidence for whole-organism viable-range regulation or robust criticality across the new disturbance protocol.
- Measures: time in viable range; disturbance-recovery time; regulation cost and overshoot
- Acceptance experiment: Predefine viable ranges, apply sustained and transient disturbances, compare active regulation with clamped or disabled feedback, and test novel disturbance magnitudes.
- Falsifier: The system is stable only because the world never perturbs it, variables are directly reset, or feedback removal has no effect.
- Repository evidence: [Bounded gain feedback and simplified branching estimator](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/criticality.ts); [Local feedback and boundedness tests](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/criticality.test.ts)
- Sources: homeostasis2014

## 18. Repair and functional resilience

Function is restored or preserved after damage through regeneration, reconfiguration or adaptation.

- Domain: Individual organization and viability; kind: life; scope: entity.
- Evidence review: Not established. Capability score: uncalibrated.
- Current finding: Xylos supports bounded plastic rewiring and stable long-run state, but this review found no matching unseen-lesion recovery comparison for the proposed repair axis. Rewiring, visual morphing and timed resource restoration should not be counted as demonstrated functional regeneration or damage compensation.
- Measures: function recovered relative to predamage baseline; recovery time and resource cost; performance under unseen lesions
- Acceptance experiment: Apply untrained lesions, remove damaged components, separate structural regrowth from compensatory control, and compare enabled versus disabled repair with matched resources.
- Falsifier: Recovery is automatic scene reset, reserved replacement injection, or occurs only for memorized damage cases.
- Repository evidence: [Sparse topology rewiring mechanism](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Existing stability checks, not an unseen-lesion recovery assay](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts); [Mechanisms and remaining research interventions](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/XYLOS.md)
- Sources: nca2020, repair2015

## 19. Recurrent processing

Feedback interactions perform temporally extended processing with a demonstrated functional contribution.

- Domain: Consciousness and sentience research; kind: theory-linked; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos has sparse recurrent state, and existing matched-input tests cut recurrence and observe changed activity. This establishes a causal local mechanism; selective task benefits under timed, compute-matched interruption and broader theory-linked interpretation remain unassessed. It is not a consciousness finding.
- Measures: recurrent influence over time; task-specific recurrence-ablation effect; stability under input removal
- Acceptance experiment: Identify feedback pathways; interrupt recurrence at controlled times while preserving feed-forward computation where possible; compare intact, sham and compute-matched conditions.
- Falsifier: A loop exists only in the scheduler, recurrent states carry no task-relevant content, or cutting them has no predicted selective effect.
- Repository evidence: [Explicit recurrent pathways and intervention option](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Recurrence ablation with matched numeric inputs](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts)
- Sources: butlin2023, butlin2025

## 20. Global availability and broadcast

Selected information becomes usable by multiple otherwise specialized processes through a constrained shared route.

- Domain: Consciousness and sentience research; kind: theory-linked; scope: entity.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos admits two of six specialist groups into a constrained workspace, and existing tests check admission and broadcast effects across groups. This is a bounded broadcast mechanism; flexible use of novel content by independently tested consumers and the full new protocol remain unassessed.
- Measures: cross-module access; broadcast bottleneck behavior; downstream dependence on selected content
- Acceptance experiment: Introduce novel content into one specialist, test flexible use by independent consumers, lesion the shared route and retain local processing; distinguish broadcasting from a globally readable log.
- Falsifier: All modules simply read privileged world state, no selective bottleneck exists, or shared content has no causal effect on consumers.
- Repository evidence: [Two-slot workspace and cross-group broadcast](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Admission bottleneck and broadcast intervention checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-mind.test.ts)
- Sources: butlin2023, butlin2025, cogitate2025

## 21. Causal integration and differentiation

Perturbations reveal both interaction between parts and distinguishable system responses beyond shared input or noise.

- Domain: Consciousness and sentience research; kind: theory-linked; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: The indicator lab compares structured oscillator coupling with shuffled and ablated conditions, and tests check resulting index changes. Its synthetic driver and chosen estimator do not establish integrated information or perturbational complexity of the full organism, human PCI validity, or consciousness.
- Measures: perturbation spread and duration; response differentiation; partition and shuffled-surrogate effects
- Acceptance experiment: Record standardized internal perturbations, partition candidate mechanisms, and compare coupled, disconnected, replayed and noise-matched surrogates. Publish the exact estimator and state-space scale.
- Falsifier: The metric is explained by noise or common input, rises equally in disconnected surrogates, or changes mainly with sampling/estimator choices.
- Repository evidence: [Synthetic oscillator driver and explicit comparison conditions](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/consciousness-lab.ts); [Bounded null and ablation checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/consciousness-lab.test.ts); [Indicator-only and live-coupling limitations](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/VERIFICATION-ANALYTICAL-DATA.md)
- Sources: pci2013, cogitate2025, butlin2025

## 22. Valence-related control and motivational trade-offs

Persistent positive/negative functional states modulate learning and flexible trade-offs; this is evidence about control, not felt experience.

- Domain: Consciousness and sentience research; kind: theory-linked; scope: entity.
- Evidence review: Mixed or restricted evidence. Capability score: uncalibrated.
- Current finding: Hunger, threat and uncertainty influence action utilities, and drive tests compare context-dependent hunting, fleeing and social responses. Signed valence telemetry and these designed trade-offs do not establish a persistent learned valence pathway, the new devaluation protocol or felt positive/negative experience.
- Measures: context-sensitive approach/avoidance; devaluation and reversal response; cross-context state persistence; state-ablation effect
- Acceptance experiment: Vary competing benefits and costs, learned cues and internal state; test persistence and generalization; disable the proposed valence pathway and compare fixed-reflex/reward-only controls.
- Falsifier: Only a signed reward variable or emotional animation is present, responses are fixed reflexes, or state manipulation has no specific behavioral consequence.
- Repository evidence: [Energy, hazard, valence telemetry and motor utility](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-mind.ts); [Context-dependent drive functions](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/cognition.ts); [Threat, hunger and social-context contrasts](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/cognition.test.ts)
- Sources: sentience2021, tradeoffs2022, homeostasis2014

## 23. Substrate pluralism and model coverage

The platform supports meaningfully distinct dynamics or implementation substrates under explicit interfaces and evaluation conditions.

- Domain: Engineering and observation context; kind: engineering; scope: entity, population, world.
- Evidence review: Implementation identified. Capability score: uncalibrated.
- Current finding: CQM combines distinct classical mathematical mechanisms, including simulated quantum dynamics, geometry, recurrent controllers and fields, with documented adapters. Selected substrate coupling is implemented; equivalent cross-substrate evaluation and universal semantic fidelity are unassessed. These integrations do not imply physical quantum hardware or complete upstream runtimes.
- Measures: independent substrate families supported; cross-substrate protocol coverage; semantic fidelity of adapters
- Acceptance experiment: Inventory implemented substrates, run equivalent declared probes on each, document where equivalence fails, and separate distinct dynamics from reskins or parameter presets.
- Falsifier: Different substrates are only renamed copies, adapters leak answers, or comparison assumes unverified equivalence.
- Repository evidence: [Wave, geometry and structural-causal adapters](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/latent-substrates.ts); [Bounded adapter behavior checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/latent-substrates.test.ts); [Per-integration scope, provenance and limits](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md)
- Sources: bedau2000, lenia2019, evogym2021

## 24. Instrumentation and reproducibility

Experiments expose traceable state, interventions, configurations and replayable or statistically reproducible outcomes.

- Domain: Engineering and observation context; kind: engineering; scope: entity, population, world.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Seeded receipts, bounded numeric recording and exact Xylos input replay are implemented and tested locally. Xylos replay suppresses habitat effects and does not rewind the shared world. Independent replication of this new profile and execution of its 25-axis protocols have not occurred.
- Measures: trace completeness; seed/replay agreement; independent rerun agreement; provenance and intervention coverage
- Acceptance experiment: Archive commit, config, seed/entropy tape, task distribution, budgets and raw traces; replay locally and rerun independently; record numerical tolerances and missing data.
- Falsifier: Claims cannot be traced to raw runs, unlogged randomness changes conclusions, or the displayed score cannot be recomputed.
- Repository evidence: [Bounded organism-specific input recording and replay](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/core/xylos-session.ts); [Seeded and recorded-input agreement checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-session.test.ts); [Seed-dependent apex receipt and fingerprint checks](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/reproduce.test.ts)
- Sources: reproducibility2021

## 25. Visual and embodied scale

Observable detail, responsiveness and inspectability across body and population scales; one complex being is a valid primary target.

- Domain: Engineering and observation context; kind: engineering; scope: entity, population, world.
- Evidence review: Bounded test evidence. Capability score: uncalibrated.
- Current finding: Xylos alone is a valid visual subject: its neural state drives membranes and a visible sparse graph, with tests for geometry changes and fixed rendering bounds. This is separate from population capacity; no new hardware-specific latency, frame-rate or comparative aesthetic benchmark was run.
- Measures: per-entity functional degrees of freedom; inspectable component depth; entity count separately; latency and frame rate at stated hardware
- Acceptance experiment: Report single-entity complexity and population capacity as separate measures; inspect sensors, actions and internal state while varying visual load; compare displayed state to simulation traces.
- Falsifier: More particles or organisms are presented as more intelligence, render detail lacks causal counterparts, or the viewer cannot inspect the claimed entity mechanisms.
- Repository evidence: [Individual-body membranes and live neural graph](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/sim/xylos-body.ts); [State-to-geometry coupling and bounded presentation](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/tests/xylos-body.test.ts); [Organism inspection and experiment controls](https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9/src/ui/xylos-panel.ts)
- Sources: reproducibility2021, lenia2019

## Research foundations

- **bedau2000:** [Open problems in artificial life](https://authors.library.caltech.edu/records/qjbd9-wyf80) (research agenda). ALife spans origins, evolutionary potential, and relations to mind; this is an agenda, not a certification standard.
- **avida2003:** [The evolutionary origin of complex features](https://www.nature.com/articles/nature01568) (primary experiment). Digital replication, mutation and selection can be investigated experimentally; complexity is task-relative.
- **modes2019:** [The MODES Toolbox: Measurements of Open-Ended Dynamics in Evolving Systems](https://doi.org/10.1162/artl_a_00280) (measurement framework). Tracks change, novelty, complexity and ecological potential. Finite observations cannot prove unlimited open-endedness.
- **evogym2021:** [Evolution Gym: A Large-Scale Benchmark for Evolving Soft Robots](https://arxiv.org/abs/2201.09863) (benchmark). NeurIPS 2021 benchmark, arXiv posted 2022. Measures joint body/controller optimization, not consciousness.
- **nca2020:** [Growing Neural Cellular Automata](https://distill.pub/2020/growing-ca/) (primary experiment). Demonstrates learned growth, persistence and regeneration; repair is distinct from subjective experience.
- **homeostasis2014:** [Homeostatic reinforcement learning for integrating reward collection and physiological stability](https://elifesciences.org/articles/04811) (computational neuroscience model). Connects internal-state regulation and reward-driven behavior; a candidate model rather than a universal requirement.
- **continual2017:** [Overcoming catastrophic forgetting in neural networks](https://doi.org/10.1073/pnas.1611835114) (primary experiment). Measures retention of previously learned tasks across subsequent training.
- **animalai2019:** [The Animal-AI Environment: Training and Testing Animal-Like Artificial Cognition](https://arxiv.org/abs/1909.07483) (benchmark). Animal-cognition-inspired testing beyond training environments; no implication of sentience.
- **agi2024:** [Position: Levels of AGI for Operationalizing Progress on the Path to AGI](https://proceedings.mlr.press/v235/morris24b.html) (research framework). Separates performance, generality and autonomy. A proposed framework, not a universally accepted AGI certificate.
- **cognitive2026:** [Measuring Progress Toward AGI: A Cognitive Framework](https://arxiv.org/abs/2605.28405) (preprint framework). Proposes held-out cognitive tasks and cognitive profiles; May 2026 preprint, not established consensus.
- **butlin2023:** [Consciousness in Artificial Intelligence: Insights from the Science of Consciousness](https://arxiv.org/abs/2308.08708) (theory-derived research framework). Computational indicators drawn from several theories; meeting indicators is not proof of consciousness.
- **butlin2025:** [Identifying indicators of consciousness in AI systems](https://doi.org/10.1016/j.tics.2025.10.011) (methodological research). Theory-derived indicators address uncertainty and gaming; criteria remain revisable.
- **cogitate2025:** [Adversarial testing of global neuronal workspace and integrated information theories of consciousness](https://www.nature.com/articles/s41586-025-08888-1) (preregistered primary experiment). Human neuroscience results challenged important predictions of both theories; do not portray either as settled consensus.
- **pci2013:** [A theoretically based index of consciousness independent of sensory processing and behavior](https://doi.org/10.1126/scitranslmed.3006294) (primary neurophysiology experiment). Human TMS/EEG perturbational complexity index; software analogues do not inherit human thresholds or diagnostic validity.
- **metacognition2014:** [How to measure metacognition](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2014.00443/full) (measurement methodology). Distinguishes metacognitive sensitivity, bias and efficiency; match first-order performance before comparison.
- **sentience2021:** [Review of the Evidence of Sentience in Cephalopod Molluscs and Decapod Crustaceans](https://www.lse.ac.uk/asset-library/news/sentience-in-cephalopod-molluscs-and-decapod-crustaceans-final-report-november-2021.pdf) (commissioned evidence review). Animal neural and behavioral indicators motivate converging evidence; no validated transfer to software.
- **tradeoffs2022:** [Motivational trade-offs and modulation of nociception in bumblebees](https://pubmed.ncbi.nlm.nih.gov/35881793/) (primary animal experiment). Context-dependent trade-offs motivate functional assays; reward variables and avoidance alone do not establish felt valence.
- **reproducibility2021:** [Improving Reproducibility in Machine Learning Research](https://jmlr.org/papers/v22/20-303.html) (research methodology). Supports explicit code, data, experimental configuration and reproducibility reporting.
- **lenia2019:** [Lenia - Biology of Artificial Life](https://arxiv.org/abs/1812.05433) (ALife research platform). Continuous cellular automata support varied organism-like patterns; morphology alone does not establish cognition.
- **brainscore2018:** [Brain-Score: Which Artificial Neural Network for Object Recognition is most Brain-Like?](https://cbmm.mit.edu/sites/default/files/publications/Brain-Score%20bioRxiv.pdf) (neural and behavioral benchmark). Neural/behavioral similarity is domain-specific; neither brain similarity nor a composite is a consciousness measure.
- **repair2015:** [Robots that can adapt like animals](https://pubmed.ncbi.nlm.nih.gov/26017452/) (primary robotics experiment). Tests recovery of function after unseen damage; distinguishes functional adaptation from structural regrowth.
- **meltingpot2021:** [Scalable Evaluation of Multi-Agent Reinforcement Learning with Melting Pot](https://arxiv.org/abs/2107.06857) (benchmark). Tests social interaction generalization to novel partners and situations.
- **autopoiesis1974:** [Autopoiesis: The organization of living systems, its characterization and a model](https://repositorio.uchile.cl/bitstream/handle/2250/160309/item_34548860810.pdf) (theoretical model). One influential account of maintained organization; not a settled universal definition of life.
