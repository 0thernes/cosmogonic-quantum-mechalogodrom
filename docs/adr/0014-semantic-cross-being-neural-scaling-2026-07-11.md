# ADR 0014: Semantic Cross-Being Neural Scaling

**Status:** Proposed; Phase-A mechanisms and repository protocol implemented, V4 evaluation unpublished
**Date:** 2026-07-11
**Depends on:** [ADR 0013](./0013-operational-organism-intelligence-2026-07-10.md)

## Context

ADR 0013 established a bounded shared organism-intelligence field and a V3 causal receipt. V3 is useful
negative-inclusive evidence, but it does not license a cross-being neural-scaling claim:

- the goal task uses one fake ordinary entity and a one-step synthetic `+x` goal rather than a live
  flora/resource environment;
- the enhanced arm beats the goal-preserved substrate-disabled arm, and fixed-family reversal adaptation
  clears its declared 5% threshold, but the enhanced arm does **not** separate from the uniform
  random-action baseline;
- rotating the four aggregate channels does not establish mapping specificity, and the uniform
  exploration replacement does not establish exploration/substrate specificity;
- the ten-class consumer gate proves that a shared signal reaches each named action, trajectory, or
  ecological path. It does not publish raw per-seed, per-class beneficial-outcome distributions, and an
  action difference alone is not an intelligence improvement;
- performance is measured at the 50,000-entity endpoint. It does not yet publish a population-size curve
  or a within-family neural-capacity response curve;
- the Consciousness and Sentience lab entity rows are static profile adapters. Their 32-seed sweep belongs
  to the synthetic indicator lab, not to nine live beings executing neural counterfactuals.

The old corpus grouping also used `registryIndex % 4`. A cyclic rotation of arbitrary buckets cannot
falsify semantic use because the buckets had no stable meaning. The first prerequisite for a stronger
experiment is therefore an explicit semantic contract, followed by memory that remains attached to a
brain identity, an independently scored adaptive predictor, and class-level behavioral outcomes.

This ADR uses **neural** narrowly. Ordinary entity TinyMLPs, NHIs, SuperMind/APEX, and other actual neural
controllers may earn neural evidence. Flora, finite-state antagonists, game policies, visual brains, and
scaffolds may earn ecological or policy-causality evidence, but they are not silently relabelled neural.
Designed parameter counts and static adapter scores are not live neural capacity.

## Current implementation boundary

| Item                                                                                                                         | Status on 2026-07-11                         | What may be said now                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ADR-0013 shared field, goal-preserved V3 ablation, reversal task, numerical and 50k cost seals                               | **Implemented and receipted**                | Bounded fixed-task results only, including the failed/tied controls.                                   |
| Per-repository `resource`, `threat`, `exploration`, or `social` destination; `null` for fenced/meta rows                     | **Implemented and structurally tested**      | Exact reviewed mapping/counts and inert exclusions; semantic task benefit is not established.          |
| Corpus aggregation by explicit semantic destination rather than registry index; channel identity included in ablation output | **Implemented and structurally tested**      | All 17 rows perturb only their declared aggregate; reachability is not useful behavior.                |
| Four diagonal leaky recurrent semantic context states attached to stable brain identity                                      | **Implemented and focused-tested**           | Identity, birth/reset, delayed retention, control reset, and 30/60 Hz normalization only.              |
| Adaptive `simple_mnist`-inspired ecology predictor                                                                           | **Implemented and focused-tested**           | Live 4-4-1 delayed learner, frozen arm, reversal test, fault bounds, and schema-v2 snapshot; not V4.   |
| Petri and Titan semantic action wiring                                                                                       | **Implemented and focused-tested**           | Real differential biologic fitness and diplomacy/payoff/world-state causality; no broad family uplift. |
| Phase-A repository protocol with 64 disjoint evaluation seeds                                                                | **Implemented; results deliberately absent** | Internal repository preregistration only, not external preregistration or replication.                 |
| V4 JSON/CSV result and failure-forward forest chart                                                                          | **Planned**                                  | V3 remains canonical until V4 is generated in a later descendant commit and verified.                  |

No prose or diagram may promote a planned row to implemented. A worktree experiment is not a release
receipt.

One local post-implementation diagnostic ran the existing counterbalanced 50,000-entity worker in three
fresh processes: all 30 incremental batch medians stayed below 3 ms, the worst was 2.8397 ms, and the three
process medians were 1.7346, 1.6850, and 1.7882 ms. This is a hardware-local diagnostic, not the planned V4
population curve or a canonical receipt.

## Decision

### 1. Make the four channels semantic and stable

The shared corpus vector has this ordered contract:

| Index | Channel       | Meaning                                                               | Permitted examples                                                                    |
| ----: | ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
|     0 | `resource`    | food, biomass, metabolic opportunity, constructive field support      | Eshkol forecast support, PINN/resource residuals, morphology/toolchain support        |
|     1 | `threat`      | hazard, collision, instability, adversarial or defensive pressure     | Asteroids dynamics, spin recall, quake/aliveness stress, classical classifier warning |
|     2 | `exploration` | novelty, stochastic search, path diversity, geometric search pressure | state-vector/classical RNG controls, QGT, PIMC                                        |
|     3 | `social`      | symmetry, coordination, group structure, shared-world coupling        | Moonlab tensor coordination, libirrep symmetry, ULG field coupling                    |

Every external registry row must declare exactly one destination or `null`. Fenced and metadata rows are
`null` and remain exactly inert. Channel order is a serialized runtime contract shared by the registry,
corpus intake, organism signal, snapshots, consumers, controls, and evidence artifacts.

Assignments are hypotheses, not facts inherited from repository names. V4 must publish the complete
mapping and test it against channel-permuted controls. A failed mapping-specificity gate leaves the
structural routing implemented while blocking any claim that the semantics improve behavior.

### 2. Add four identity-stable diagonal recurrent context neurons

Ordinary entity brains now carry four diagonal leaky recurrent context states, one for each semantic
channel. They are EMA-style runtime memory, not inherited weights and not an unqualified RNN architecture.
For channel `c` at neural step `t`:

```text
target[c,t] = semanticInput[c,t] * boundedPersonalitySensitivity[c]
alpha(dt) = 1 - (1 - (0.08 + 0.14 * plasticity))^(60 * dt)
context[c,t+1] = context[c,t] + alpha(dt) * (target[c,t] - context[c,t])
```

The recurrence is diagonal: resource memory cannot silently become threat, exploration, or social memory.
Cross-channel interaction occurs later through explicit action consumers. Inputs, sensitivities, rates, and
states are finite and bounded. The adapter adds O(4) work per evaluated organism, no per-step heap
allocation, and exactly 17 bytes/entity allocated at field construction. Entity-context snapshot/restore is
still planned; it is not claimed by the current implementation.

The state belongs to **brain identity**, not array position:

- compaction may move an entity slot while preserving the same brain-state index;
- reproduction creates a fresh state unless a separately documented inheritance experiment is enabled;
- death/removal clears the retired identity, and a newborn reusing a slot receives zeroed context;
- a future world/brain snapshot must reproduce all four states exactly before V4 replay can pass;
- 30 Hz and 60 Hz paths use simulation-time-normalized decay/update rules;
- an identity-permutation or slot-compaction test must fail if context follows the wrong being.

The four states are context memory, not four additional consciousness indicators. Their existence is not
evidence of intelligence until a matched task shows an independently measured behavioral benefit.

### 3. Turn `simple_mnist` into a bounded adaptive ecology predictor

The static corpus helper still has a deterministic fixed baseline for standalone structural use. The live
shared field replaces that row with a local `simple_mnist`-inspired 4-4-1 tanh/sigmoid MLP trained against a
delayed ecological target. This is a local adaptation, not native upstream code parity.

The shared, cadence-level learner will:

1. read only four normalized observations available at prediction time: biomass depletion, metabolic
   depletion, crowding, and combined thermal/chaos stress;
2. predict the **next-cadence** ecological pressure or resource-depletion target;
3. update only after that future observation arrives, preventing same-step target leakage;
4. keep bounded weights, learning rate, gradients, prediction, and error, with finite fault injection;
5. own reusable input/hidden scratch and perform O(model parameters) work once per shared-field cadence,
   never once per organism;
6. include weights, mode, pending input/prediction, revision, and update count in snapshot/restore;
7. expose bounded prediction and lagged absolute error only on the non-ablated operational signal; raw
   predictor state remains available in the diagnostic snapshot without leaking through an ablated arm.

One focused reversal test currently beats a frozen arm. The predictor is not V4-accepted until it also beats
frozen and target-shuffled arms on the 64 frozen evaluation seeds. Training loss alone does not pass; the
primary metric is future-cadence prediction error, followed by an independently measured ecological action
outcome.

### 4. Wire actions by family in measured phases

Cross-being rollout is phased so one passing family cannot hide another family's failure.

| Phase | Families                                                      | Required action/outcome boundary                                                                                                                                                                   |
| ----: | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     0 | Registry and corpus intake                                    | Semantic mapping, inert fences/meta, deterministic snapshot; no behavior claim.                                                                                                                    |
|     1 | Ordinary `EntityBrainField` organisms                         | Semantic context changes live action and improves a preregistered flora/resource task over matched controls.                                                                                       |
|     2 | Flora, primordial biologics, wilderness fauna                 | Publish ecological outcomes such as biomass recovery, lineage persistence, resource acquisition, or survival. Call non-neural mechanisms ecological/policy adaptation.                             |
|     3 | NHIs, glyph beings, shoggoths, puppeteers, titans, leviathans | Publish one independently scored task per family. Mere motion/action divergence does not pass. Glyph output must write a non-visual world consequence before it counts as behavioral intelligence. |
|     4 | Archon/APEX, Mechalogodrom, pantheon/light echoes             | Use their native live controllers and world writes. Visual-only, telemetry-only, static-profile, and designed-capacity paths remain labelled as such.                                              |

Each family adapter must declare `controllerType` (`neural`, `state-machine`, `game-policy`, `ecological`,
`visual`, or `scaffold`), `evidenceTier`, `liveParameters`, `designedParameters`, world-read paths,
world-write paths, primary task, and declared primary control set. Only `neural` plus a live world write is eligible
for a neural-scaling claim.

Current focused tests establish ordinary action routing/context retention, Petri differential selection,
and Titan diplomacy/payoff causality. They do not yet satisfy the table's independently scored 64-seed
benefit requirements, and no other family advances phase because of those local results.

No phase changes all families at once. A family ships behind its existing disabled/legacy behavior, gets
matched tests, and then enters the cross-being receipt. A failed family remains visible as failed or
`notEvaluated`; it is never replaced by a cross-family average.

### 5. Repository-preregister V4 before measuring it

V4 uses a repository preregistration. The Phase-A manifest is
`docs/reports/assets/organism-intelligence-v4-phase-a-preregistration.json`, and its executable authority is
`scripts/organism-intelligence-v4-protocol.ts`. The manifest pins that source at SHA-256
`120318627c437ac08b1c752015b586b306d68bbc843c676948c3c7eec5721541` plus one canonical fixture hash per
evaluated family. It also pins the imported `mulberry32` implementation in `src/math/rng.ts`; changing that
dependency invalidates the protocol seal. Both files are committed before any V4 result artifact is generated. This is stronger than
fixing seeds inside the result-producing script, but it is still **not external preregistration or independent
replication**.

The Phase-A manifest defines:

- 64 deterministic evaluation seeds disjoint from V1, V2, V3, development fixtures, and tuning seeds;
- the exact executable protocol source hash and canonical family-fixture hashes; every future raw row must
  additionally record its runtime initial-state, percept, goal-schedule, and RNG-tape hashes;
- the primary outcome for every family before results are observed;
- controller arms: full semantic/recurrent/adaptive path, goal/sensor-preserved substrate disable,
  recurrence-disabled or state-reset control, frozen predictor, target-shuffled predictor, semantic-channel
  permutation, exact legacy, and an action-distribution-matched random surrogate;
- pre-intervention equality requirements for environment, percepts, goals, action bounds, population,
  update schedule, and injected RNG tape;
- family exclusions and `notEvaluated` reasons before aggregation;
- normalized `[0,1]` primary outcomes, denominator/failure rules, deterministic paired-bootstrap and
  sign-flip procedures, all statistical thresholds, and the within-family Holm procedure.

The future result generator must import the pinned protocol module unchanged. Copying its numbers into a
second implementation is not compliant. If the source or any fixture changes, the manifest hash must change
in a new preregistration commit before any affected result is generated.

The action surrogate must match the full arm's empirical action magnitude/rate distribution on separate
development seeds. V3's uniform action control remains reported but is not reused as though it were
distribution matched.

### 6. Publish raw V4 and cross-being evidence

The planned canonical data products are:

- `docs/reports/assets/organism-intelligence-causal-benchmark-v4.json` — protocol, provenance,
  acceptance results, failures, and artifact hash;
- `docs/reports/assets/cross-being-neural-causality-v1.csv` — one raw row per
  seed × family × task × arm × live-capacity tier;
- `docs/reports/assets/organism-intelligence-v4-cross-being-forest.svg` — generated only from the JSON/CSV
  receipt, with the receipt SHA embedded in accessible metadata.

Each raw row records family and controller type, evidence tier, seed, task, arm, initial-state/percept/goal
and RNG-tape hashes, live and designed parameter counts separately, primary outcome, secondary outcomes,
latency, memory, replay fingerprint, and failure reason. Negative rows are retained.

The forest chart is the primary public visual. For every family it plots the declared primary contrast with
the smallest across-seed mean full-minus-control delta (source-order tie break), its **unadjusted** paired
bootstrap 95% interval, a separate within-family Holm-adjusted sign-flip pass marker, and a zero-effect line.
Intervals crossing zero are red; ineligible/static/visual/scaffold rows are gray and say `not supported`. No
chart may hide a failed class behind a pooled mean. Supporting visuals may show the per-seed signed-delta
heatmap and live-parameter/outcome/latency frontier, but they cannot replace the forest falsifier.

## V4 acceptance gates

All gates publish their failures. Passing a structural or performance gate does not compensate for a
failed behavioral control.

| Gate                 | Acceptance rule                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preregistration      | Protocol, 64-seed evaluation manifest, outcomes, exclusions, and thresholds exist at a commit earlier than the result commit; seeds are disjoint from V1–V3 and all tuning fixtures.                                                                                                                                                                                                                     |
| Matched arms         | Before intervention, state, percept, goal, population, motor-bound, update-schedule, and environment-RNG-tape hashes are identical. Any declared surrogate stream is isolated and hash-recorded. Only the declared controller arm differs.                                                                                                                                                               |
| Replay and identity  | Same arm replays byte-identically; compaction preserves all four context states with brain identity; removal/newborn reuse cannot inherit retired context; snapshot/restore resumes exactly.                                                                                                                                                                                                             |
| Semantic specificity | For every declared full-vs-cyclic contrast, paired mean is > 0, the unadjusted paired-bootstrap 95% lower bound is > 0, and the within-family Holm-adjusted one-sided paired sign-flip `p < 0.05`.                                                                                                                                                                                                       |
| Recurrent context    | Full recurrence beats recurrence-disabled control with median paired gain `>= 0.05` absolute normalized outcome points, minimum seed delta `>= -0.20` points, and the same bootstrap/sign-flip inference rule. A context-state difference without outcome lift does not pass.                                                                                                                            |
| Adaptive prediction  | Every arm is scored on the same true labels; only the shuffled control's training feedback is permuted. Mean Brier is first computed per seed, then averaged across all 64 seeds. Against frozen and shuffled-training controls, `(controlMeanBrier - adaptiveMeanBrier) / controlMeanBrier >= 0.05`; denominator `<= 1e-12` fails as undefined. Per-seed true-label quality deltas also pass inference. |
| Family behavior      | Every executablely declared primary contrast passes. For ordinary organisms, Petri biologics, and Titans, every contrast has median paired gain `>= 0.05` absolute normalized outcome points and minimum seed delta `>= -0.20` points. Percent-relative interpretations are forbidden.                                                                                                                   |
| Cross-family claim   | Every family named in the claim passes individually. Failed, non-neural, visual, scaffold, and `notEvaluated` rows remain explicit and cannot be averaged into a pass.                                                                                                                                                                                                                                   |
| Neural capacity      | A within-family capacity claim requires at least three **actually live** capacity tiers, high-minus-low adjusted lower bound > 0, and Spearman `rho >= 0.5` between log live parameters and the preregistered outcome. Cross-sectional differences between unlike beings do not count.                                                                                                                   |
| Population cost      | For the ordinary population path, publish 1k, 5k, 10k, and 50k runs; log-log runtime slope must be `<= 1.15`, the existing 50k incremental median and every counterbalanced batch median remain below 3 ms, and bytes/entity stay bounded by the declared state layout.                                                                                                                                  |
| Numerical safety     | Semantic channels, context, predictor state, actions, and snapshots remain finite and within declared bounds for 10,000 fault-injected steps.                                                                                                                                                                                                                                                            |
| Receipt integrity    | V4 records source commit, protocol-source and fixture SHA-256 values, benchmark and preregistration SHA-256, raw-data SHA-256, machine/toolchain data, every seed row, effect sizes, intervals, adjusted sign-flip p-values, failures, and a content hash. Public pages pin that hash.                                                                                                                   |
| Generated visual     | Rebuilding the forest from the canonical receipt is byte-identical; labels, intervals, zero line, failed rows, ineligible rows, and receipt SHA are regression-tested.                                                                                                                                                                                                                                   |
| Claim law            | `indicatorOnly` remains true. `consciousnessUpliftAllowed` and `sentienceUpliftAllowed` remain false regardless of V4 task performance unless a separate preregistered consciousness/sentience experiment establishes those claims.                                                                                                                                                                      |

V4 may authorize only the family-specific statements whose gates pass: semantic task response, recurrent
context benefit, adaptive ecological prediction, bounded neural-capacity response, or policy/ecological
causality. A-Life numeric changes require their own code-grounded nine-axis evidence update. Physical
quantumness, quantum advantage, security, general intelligence, phenomenal consciousness, and sentience
remain outside this decision.

## Consequences

- Explicit semantics make channel-permutation controls meaningful and make repository assignments
  reviewable, at the cost of treating every assignment as a hypothesis that can fail.
- Four diagonal states add bounded O(4n) population work and identity-lifecycle complexity. Slot compaction,
  newborn clearing, snapshot schema, and performance receipts become release-critical.
- The adaptive predictor is paid once per shared cadence, not per organism. It adds real online learning
  but also creates leakage, calibration, stability, and snapshot risks that frozen and shuffled controls
  must expose.
- Cross-family rollout becomes slower because every family needs an independent outcome and matched
  control. This is intentional: ten action divergences are not ten demonstrated benefits.
- Generated raw rows and a failure-forward forest chart make negative results visible and independently
  re-analysable. Public presentation can be less flattering while becoming more scientifically useful.
- V3 remains the current fixed-task receipt until the preregistered V4 artifact exists. Partial WIP does
  not change public scores or the consciousness/sentience claim boundary.

## Rejected alternatives

- **Keep `registryIndex % 4`.** Rejected because bucket rotation cannot test semantic specificity.
- **Use a fully recurrent 4×4 matrix immediately.** Rejected because cross-channel mixing would obscure
  which semantic memory caused an action; diagonal recurrence is the falsifiable first step.
- **Call every consumer neural.** Rejected because flora, FSMs, game policies, visuals, and scaffolds have
  different causal status.
- **Accept any action divergence as improvement.** Rejected because deterministic harm and arbitrary
  perturbation also cause divergence.
- **Tune V4 thresholds after looking at V4 outcomes.** Rejected; changes require a new protocol/version and
  a fresh disjoint evaluation family.
- **Raise consciousness or sentience scores when V4 passes.** Rejected because bounded task performance is
  not evidence of phenomenal experience.
