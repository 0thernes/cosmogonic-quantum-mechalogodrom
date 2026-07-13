# ADR 0014: Semantic Cross-Being Neural Scaling

**Status:** Accepted; Phase-A implemented and evaluated, with failed families retained for Phase-B work
**Date:** 2026-07-11
**Depends on:** [ADR 0013](./0013-operational-organism-intelligence-2026-07-10.md)
**Successor:** [ADR 0015](./0015-phase-b-neural-semantic-expansion-2026-07-11.md)

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

| Item                                                                                                                         | Status on 2026-07-11                      | What may be said now                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-0013 shared field, goal-preserved V3 ablation, reversal task, numerical and 50k cost seals                               | **Implemented and receipted**             | Bounded fixed-task results only, including the failed/tied controls.                                                                  |
| Per-repository `resource`, `threat`, `exploration`, or `social` destination; `null` for fenced/meta rows                     | **Implemented, tested, and V4-evaluated** | Exact reviewed mapping/counts and inert exclusions; ordinary/Petri effects were positive but below the frozen family magnitude floor. |
| Corpus aggregation by explicit semantic destination rather than registry index; channel identity included in ablation output | **Implemented, tested, and V4-evaluated** | All 17 rows perturb only their declared aggregate; V4 does not authorize a broad semantic-task or cross-family claim.                 |
| Four diagonal leaky recurrent semantic context states attached to stable brain identity                                      | **Implemented, tested, and V4-evaluated** | Identity/lifecycle/replay passed, but ordinary recurrent-context benefit missed the frozen magnitude floor.                           |
| Adaptive `simple_mnist`-inspired ecology predictor                                                                           | **Implemented, tested, and V4-evaluated** | The live 4-4-1 learner failed inference and magnitude against frozen/shuffled controls; no adaptive-prediction claim.                 |
| Petri and Titan semantic action wiring                                                                                       | **Implemented, tested, and V4-evaluated** | Petri inference passed but magnitude failed; Titans passed and authorize only bounded game-policy semantic causality.                 |
| Phase-A repository protocol with 64 disjoint evaluation seeds                                                                | **Frozen and executed**                   | Internal repository preregistration only, not external preregistration or replication.                                                |
| V4 JSON/CSV result and failure-forward forest chart                                                                          | **Generated and integrity-verified**      | One family passed and three failed; raw rows, failures, hashes, and the receipt-bound forest are public.                              |

No prose or diagram may promote a planned row to implemented. A worktree experiment is not a release
receipt. The canonical result is [the V4 report](../reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md),
not an exploratory rerun.

The V4 receipt ran the frozen 1k/5k/10k/50k ordinary-population curve in three fresh processes. Its
aggregate log-log runtime slope was `1.008909`, the 50,000-entity incremental median was `2.0491 ms`, the
worst of 18 counterbalanced batch medians was `2.82825 ms`, and semantic context remained exactly 17
bytes/entity. This passes the frozen population-cost gate but remains a machine-local result.

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

Assignments are hypotheses, not facts inherited from repository names. V4 publishes the complete mapping
and tests it against channel-permuted controls. The ordinary and Petri mapping-specificity contrasts are
positive but below the frozen magnitude floor, so structural routing remains implemented while broad claims
that those semantics improve behavior remain blocked. The Titan task passes its bounded family gate.

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
allocation, and exactly 17 bytes/entity allocated at field construction. Entity-context inclusion in a full
world/brain snapshot is still planned; V4's exact replay restarts the deterministic arm and is not evidence
of mid-run entity-context restoration.

The state belongs to **brain identity**, not array position:

- compaction may move an entity slot while preserving the same brain-state index;
- reproduction creates a fresh state unless a separately documented inheritance experiment is enabled;
- death/removal clears the retired identity, and a newborn reusing a slot receives zeroed context;
- a future world/brain snapshot must reproduce all four states exactly before snapshot-resume replay can pass;
- 30 Hz and 60 Hz paths use simulation-time-normalized decay/update rules;
- an identity-permutation or slot-compaction test must fail if context follows the wrong being.

The four states are context memory, not four additional consciousness indicators. Their existence is not
evidence of intelligence until a matched task shows an independently measured behavioral benefit.

### 3. Turn `simple_mnist` into a bounded adaptive ecology predictor

The static corpus helper still has a deterministic fixed baseline for standalone structural use. The live
shared field replaces that row with a local `simple_mnist`-inspired 4-4-1 tanh/sigmoid MLP trained against a
delayed ecological target. This is a local adaptation, not native upstream code parity.

The shared, cadence-level learner:

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

One focused development reversal test beats a frozen arm, but V4 does not reproduce that advantage. Across
the 64 frozen evaluation seeds the adaptive learner loses to both frozen and target-shuffled controls on
true-label Brier score, so adaptive ecological prediction is rejected for Phase A. Training loss alone does
not pass; any successor protocol must retain future-cadence prediction error as its primary metric and score
an independently measured ecological action outcome separately.

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

V4 now establishes that ordinary routing/context and Petri differential selection are reproducible but
too small for their frozen family magnitude rule. The adaptive predictor fails its frozen and shuffled
controls. Titan diplomacy/payoff is the only Phase-A family that satisfies its independently scored
64-seed behavior gate. No other family advances phase because of the Titan result.

No phase changes all families at once. A family ships behind its existing disabled/legacy behavior, gets
matched tests, and then enters the cross-being receipt. A failed family remains visible as failed or
`notEvaluated`; it is never replaced by a cross-family average.

### 5. Repository-preregister V4 before measuring it

V4 uses a repository preregistration. The Phase-A manifest is
`docs/reports/assets/organism-intelligence-v4-phase-a-preregistration.json`, and its executable authority is
`scripts/organism-intelligence-v4-protocol.ts`. The manifest pins that source at SHA-256
`120318627c437ac08b1c752015b586b306d68bbc843c676948c3c7eec5721541` plus one canonical fixture hash per
evaluated family. It also pins the imported `mulberry32` implementation in `src/math/rng.ts`; changing that
dependency invalidates the protocol seal. Both files were committed before any V4 result artifact was
generated. This is stronger than fixing seeds inside the result-producing script, but it is still **not
external preregistration or independent replication**.

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

The result generator imports the pinned protocol module unchanged. Copying its numbers into a second
implementation is not compliant. If the source or any fixture changes, the manifest hash must change in a
new preregistration commit before any affected successor result is generated.

The action surrogate must match the full arm's empirical action magnitude/rate distribution on separate
development seeds. V3's uniform action control remains reported but is not reused as though it were
distribution matched.

### 6. Publish raw V4 and cross-being evidence

The published canonical data products are:

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
| Replay and identity  | Same arm replays byte-identically within one platform/toolchain; cross-platform raw-binary64 byte identity is not claimed. Compaction preserves all four context states with brain identity; removal/newborn reuse cannot inherit retired context; snapshot/restore resumes exactly.                                                                                                                     |
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

### Post-result calibration identity portability amendment

The historical V4 result remains unchanged and sealed to the exact source bytes at its recorded
`runtimeBaseCommit`; integrity verification reads those historical blobs with `git show` instead of
requiring the live evaluator to remain forever byte-identical to an old result harness.

A Windows x64 versus Ubuntu/WSL x64 audit on Bun `1.3.14` found that both ordinary calibration runs had
action frequency `1`, exactly 7,680 non-zero magnitudes, and the same scientific ordering, while 1,265
raw magnitude leaves differed. The maximum absolute difference was
`1.3877787807814457e-17`. Fixed-decimal projections still had one differing value at 13 and 14 decimal
places and six at 15; 12 decimal places was therefore the tightest tested zero-difference boundary. Its
`1e-12` bin width is about 72,000 times the observed residue but 50 billion times finer than the smallest
non-zero V4 behavioral gate (`0.05`).

Current code now reports two distinct seals instead of relabeling the historical raw seal:

- `calibrationSha256` remains the exact platform-local binary64 payload hash: Windows
  `ca74e6d7cab350eb199b5674c6675085105d5abe869ed70c2081912f58fc58bb`; Ubuntu
  `40b1f01db3a224e7f1e88ac6a000c54b29f2c611a92b1be756ee577cf2103615`;
- `calibrationIdentitySha256` is the portable bounded-equivalence identity
  `001298f6b1231be1d766cc2e1498f7fbe3d19828170348faceb2aad9ef0724bf`, bound to
  `ordinary-v4-calibration-identity-fixed-decimal-1e-12-v1` and used only by the acceptance guard.

The projection does not feed behavior. Returned calibration magnitudes, surrogate actions, outcomes,
secondary payloads, and trace replays remain raw binary64. Values in the same 12-decimal bin are
intentionally equivalent for guard acceptance while their exact raw hashes remain distinct. This is not
a claim of full V4 cross-platform byte portability: the audit observed differences in 10/16 source replay
fingerprints, 196/384 arm replay fingerprints, 185/384 secondary payloads, and 2/384 surrogate primary
outcomes; the largest primary difference was at most `1.1102230246251565e-16`. Despite that residue,
Windows and Ubuntu produced the same ordinary inference pass vector `[PASS, PASS, PASS, PASS]`, magnitude
pass vector `[FAIL, FAIL, FAIL, PASS]`, magnitude failure, and family failure. A non-gating Cohen's `dz`
value still differed in its last bit, so no full-statistic byte identity is claimed. No V4 gate, verdict,
or authorized claim changed.

The live portable scientific projection across all 64 ordinary seeds is separately pinned at
`fc77fc74a65722c7c3a1128d392c2f4383674c3cff4cd2e9a84f57e44f8346bb`; it excludes raw platform-local
digests while retaining the bounded scientific payload, so deterministic live-evaluator drift cannot hide
behind SHA-shape checks alone.

V4 authorizes only bounded Titan game-policy semantic causality. It does not authorize ordinary recurrent
context benefit, adaptive ecological prediction, Petri ecological causality, neural-capacity response, or a
pooled cross-family result. A-Life numeric changes require their own code-grounded nine-axis evidence update.
Physical quantumness, quantum advantage, security, general intelligence, phenomenal consciousness, and
sentience remain outside this decision.

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
- The verified V4 artifact is now the current descendant receipt. Its three failures remain failures and
  its one Titan pass does not change public scores or the consciousness/sentience claim boundary.

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
