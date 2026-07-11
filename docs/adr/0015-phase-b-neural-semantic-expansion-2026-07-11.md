# ADR 0015: Phase-B Neural-Semantic Expansion

**Status:** Accepted for development; predictor/ordinary V2 tasks completed and rejected; no confirmatory freeze
**Date:** 2026-07-11
**Depends on:** [ADR 0014](./0014-semantic-cross-being-neural-scaling-2026-07-11.md) and the
[V4 Phase-A result](../reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md)

## Context

V4 is a useful falsifier, not a tuning target. Its 1,152 raw rows over 64 frozen seeds authorize only
bounded Titan game-policy semantic causality. Ordinary organisms and Petri biologics pass inference but
miss the fixed magnitude floor; the adaptive predictor loses to frozen and shuffled controls. V4 does
not establish ordinary recurrent benefit, adaptive prediction, Petri causality, neural scaling, pooled
cross-family scaling, numeric score uplift, consciousness, sentience, general intelligence, physical
quantum advantage, or security.

Phase B must explain those failures before adding capacity. A larger network attached to an unchanged
information bottleneck is not greater intelligence.

### Failure constraints inherited from V4

| Family    | Mechanistic finding                                                                                                                                                                                                                                                                                                          | Phase-B constraint                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary  | The four scalar semantic EMAs sit outside the `6→6→4` MLP. The true goal bearing remains visible during cue and dropout, while resource memory only adds `0.1 × context` to an already-known goal gain. With the frozen decay, the recurrence-only score lift is analytically capped near `0.00239`, versus the `0.05` gate. | Bind semantic identity to a delayed bearing and score actual food/survival. Do not increase gain, slow decay, lower the gate, or reuse the task merely to manufacture a pass.                         |
| Predictor | The `4→4→1` learner is memoryless in the regime. Fixed-rate Brier-SGD must overwrite a confident old mapping after a reversal; shuffled feedback drifts toward the Brier-optimal climatology and wins.                                                                                                                       | Add pre-outcome temporal context, a fast linear path, bounded drift response, prequential scoring from the first forecast, and short-horizon drift tasks. Preserve the failed V4 predictor unchanged. |
| Petri     | Every seed moves in the expected direction, but the effect is attenuated by slow fitness updates, asymmetric founders, a share-compression metric, and no actual death/reproduction competition.                                                                                                                             | Use symmetric/counterbalanced founders, finite nutrients, real reproduction/death, and descendant share or lineage survival. Do not amplify gains, lengthen V4, lower its floor, or select seeds.     |
| Titans    | The bounded diplomacy task passes.                                                                                                                                                                                                                                                                                           | Retain the result without generalizing it to neural, ecological, cross-family, consciousness, or sentience claims.                                                                                    |

## Decision

Phase B has three separate stages:

1. **Development mechanisms** may be implemented and tested with explicitly non-evidentiary seeds.
2. **Development tasks and controls** may reject mechanisms or choose one fixed configuration.
3. A **new protocol and manifest** may be committed only after source, task, controls, thresholds, and
   dependency closure are frozen. Fresh confirmatory seeds are derived only after that commit.

Development output is not a release receipt. No public score or capability claim changes in stages 1–2.

### Current implementation state

| Development component                | State on 2026-07-11                                                                                                                                                                                            | Claim consequence                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Historical-seed firewall             | Implemented; reconstructs and rejects all 170 V1–V4 evaluation/calibration seeds and seals 22 mutually disjoint domain-separated development families                                                          | Prevents accidental evaluation-set reuse; creates no evidence                                                                           |
| NHI neural-semantic gene and effects | Implemented; default `9→6→7` gene has 109 live weights, with 58/109/211 tiers, component ablations, exact state, structured fact/effect acknowledgement, bounded target actions, and runtime lifecycle closure | Establishes a real, ablatable neural/world path; broad task benefit is not established                                                  |
| NHI closed-loop development          | Complete: 41,472/41,472 rows, fixed-point-free semantic derangement, target-valid yoke, paired phase reset, exact checkpoints, and narrow action-level contrasts                                               | Development-only: HUNT/resource and SPAWN/social diagnostics are positive, but conflict response declines; no adaptation or broad claim |
| Ecology predictor V2 leaf            | Implemented but not production-integrated; strict forecast/observe tokens, 54/98/186 live tiers, bounded optimizer, exact snapshots                                                                            | Candidate leaf remains non-evidentiary; production predictor remains V1                                                                 |
| Predictor development V2             | Complete: 4,224/4,224 rows retained across 6 tasks, 11 arms, 48 development seeds, and 16 fixed-configuration validation seeds                                                                                 | Rejected for protocol advancement: the temporal-input ablation is slightly better than H8 aggregate and unfavorable paired rows remain  |
| Ecology predictor V3 leaf            | Implemented but not production-integrated; 101 inputs, 80-step validity-marked history, 926/1,750/3,398 parameters, bounded RMSProp, ablations, and exact snapshots                                            | Candidate leaf remains non-evidentiary; production predictor remains V1                                                                 |
| Temporal-identifiability development | Complete: 46,080/46,080 rows, 80/80 distinct task profiles, terminal-input twins, locked validation, exact statistics, and byte-stable seals                                                                   | Rejected for advancement: the V3 H8 configuration fails all eight frozen criteria                                                       |
| Ordinary resource-head leaf          | Implemented but not production-integrated; 27/51/99 added parameters, one-shot food-reward API, recurrence/frozen controls, exact snapshots                                                                    | Candidate mechanism only; production benefit is not established                                                                         |
| Ordinary development V1              | Complete and retained as a rejected diagnostic; it lacked an executed legacy brain, independent model units, terminal contact, and adequate yoked controls                                                     | Structurally ineligible for evidence or protocol selection                                                                              |
| Ordinary development V2              | Complete: 4,224/4,224 rows retained across 4 model units, 11 paired arms, 8 validation seeds × 12 trials                                                                                                       | Rejected for protocol advancement: every neural/semantic/recurrent causal arm ties identity and the yoked action surrogate wins         |

## Seed firewall

No Phase-B development runner may accept a V1–V4 evaluation or calibration seed. Development,
validation, surrogate-calibration, and fault families use distinct domain-separated SHA-256 namespaces.
The future confirmatory family does not exist until a new protocol commit is immutable; its seeds will be
derived from that commit plus a new domain salt.

The implemented firewall exposes:

- 32/16/16/8 NHI train/validation/surrogate/fault seeds;
- 48/16/8 predictor development/fixed-configuration-validation/fault seeds;
- 32/16/32 temporal-task train/selection/locked-development-validation seeds plus 8/16/8
  temporal-model development/validation/fault seeds;
- 32/16/16/8 retained ordinary-V1 train/validation/surrogate/fault seeds; and
- 12/8/4/8/4 fresh ordinary-V2 train/validation/model/surrogate/fault seeds. The V2 fault family is
  reserved and explicitly not consumed by the task runner.

It asserts historical exclusion and mutual disjointness at module load and runner entry. The ordered
22-family SHA-256 seal is
`469f79e59c29639034afb4aea2bf6b0e3a82f2a3f3303b7fb3c9efa7ec443b8a`.

The frozen V4 authority remains unchanged:

- protocol SHA-256: `120318627c437ac08b1c752015b586b306d68bbc843c676948c3c7eec5721541`;
- Phase-A manifest SHA-256: `47ab35d0a5ee9056be09736dac7e5e3839ef01fcbcfa652c192d055a0b648778`;
- pinned RNG SHA-256: `87c880ed2b7f1e97c37f0c04cbdeb2d9e74a555a7fce22200ceaa756b7b6bcb0`.

V4 artifacts are historical and are never regenerated from Phase-B code.

## Workstream A: NHI neural-semantic closure

NHI is the first excluded neural family because it already has both perception and production world
writes. Its pre-Phase-B controller was hybrid: an 85-weight `5→6→7` TinyMLP plus GOAP, memory, repeated-game
policy, regret matching, and hand-written utilities. Energy, crowding, chaos, threat, rival state, and kin
state enter the policy. NHI actions can spawn ordinary entities, gather/scatter nearby organisms, overwrite
their strategy, and steer retreat.

The pre-Phase-B honesty gap was that the four Tsotchke semantic lanes altered hand-written utilities but
did not enter the neural gene. Semantic action divergence from that historical path was hybrid-policy
evidence, not neural-semantic causality.

The first Phase-B implementation has:

- added resource, threat, exploration, and social lanes to the inherited gene;
- exposed a separate neural-semantic-input ablation while retaining the hybrid utility path;
- preserved default zero-semantic legacy outputs and default constructor RNG consumption;
- reported actual `9→H→7` live tiers: `H=3/6/12`, or `58/109/211` weights;
- preserved architecture and all expanded weights through the isolated `spawnChild` heredity API;
- made HUNT steer toward and conservatively transfer bounded energy from the exact perceived target;
- made MIMIC copy only bounded movement and behavioral classification, never stable identity or body;
- moved spatial indexing after integration/containment and incrementally indexed same-beat swarmlings;
- fixed regret matching to compare counterfactual utility against the sampled action rather than the
  greedy maximum;
- advanced GOAP facts only after a material world outcome, then recomputed the post-outcome next step;
- treated GOAP as an explicit utility bias rather than forced execution, enforced the SWARM precondition
  before acknowledging DOMINATE, and cached the allocating plan until facts change;
- bounded launched NHI population at 32, replaced population-wide lifecycle scans with O(live NHI)
  checks, and used the current spatial grid plus an allocation-free mood read for local kin sensing;
- pruned dead NHI minds, bodies, targets, and wallets on the next active NHI lifecycle scan (at most
  the next active frame at current cadence) and retired the whole layer synchronously during Genesis,
  with negative wallet ids disjoint from every fixed non-negative creature namespace; and
- exposed actual topology, weights, memory, mood, facts, regret, plan telemetry, and control mode to the
  observatory.

Production `SPAWN_SWARM` creates ordinary minions, not child NHI minds; the heredity API therefore has no
production reproduction claim. The NHI population is intentionally retired by Genesis because its
physical organisms live inside the reset `EntityManager`; dedicated pantheon/titan systems persist.
Versioned JSON-safe mind/system checkpoints now restore exact rival, planning, memory, neural, regret,
and population-beat state. Production actions return separate material-effect and `factSupported`
evidence; the mind decides whether that evidence advances its current GOAP state, and one failed mind
or diagnostic callback cannot starve later minds. Failed launches retain
monotonic attempt/RNG provenance and roll back without a fake death or mutation-accounting change.

The executed closed-loop task uses paired action-independent cue/outcome tapes, bounded action costs,
material service deltas, a phase-relative mind clock, and an exact environment/mind/policy reset before
the conflicting surface map. All 41,472 rows are retained. Validation full-arm mean service is
`0.060770689609`; pre/post conflict response is `-0.013306302297`. Full minus balanced semantic
derangement is `+0.020167955761`, while the neural-semantic ablation contrasts are interpretation-eligible
only for HUNT/resource (`+0.018742616898`) and SPAWN/social (`+0.017038134204`). This is a bounded
development diagnostic, not NHI reproduction, adaptation, reward learning, or confirmatory evidence.
Its configuration-protocol hash is
`bfff6581b8e3e032c596a114ef3bfc86c7d5067537efe24043d5d731a09e0f0c`; this hash covers declared
configuration/laws, not source blobs. Schedule and row seals are
`8acb60a51bbef06bbf238f8b365f8b9f2d61314850909ff109cbbf70514f617f` and
`43f26e8b224449db588dd56ba5dd16c7f37c579e396a5689421e5545ee35db06`. The Git tree is source
provenance. See the [V3 mechanism report](../reports/PHASE-B-MECHANISM-DEVELOPMENT-V3-2026-07-11.md).
No NHI confirmatory protocol or capacity study freezes from this result.

## Workstream B: successor ecology predictor

The V4 `TsotchkeEcologyPredictor` remains the version-1 implementation. Phase B has implemented a
separate, not-yet-integrated version-2 leaf with nine inputs available before the predicted outcome:

- current biomass depletion, metabolic depletion, crowding, chaos, and thermal stress;
- last revealed outcome, last signed residual, last outcome delta, and a context-valid bit.

The model is:

```text
hidden = tanh(W1 · features + b1)
logit  = b2 + wSkip · features + w2 · hidden
prediction = sigmoid(logit)
```

Actual `H=4/8/16` tiers contain `54/98/186` trainable parameters. The API separates `forecast` from
`observe` with a single-use token, so future labels cannot enter the forecast call. Training uses bounded
cross-entropy logit gradients, deterministic RMSProp, one global gradient-norm clip, parameter clamping,
and a residual-EWMA drift score that interpolates fixed slow/fast rates. The development task scores
prequential soft-target squared error, calibration gap, and soft-target cross-entropy; it does not call a
soft-target metric –Brier.—

The completed development matrix covers stationary pressure, abrupt/gradual drift, recurring A/B/A,
covariate shift, and missing-feedback/irregular-elapsed-time synthetic tasks. It does **not** yet include
an open-loop live-world trace or an actual V1 arm. Its 11 arms are H4/H8/H16 adaptive; H8 frozen;
H8 temporal-input ablated; H8 drift-gain disabled; an H8 causal reservoir-lag gradient-target control;
matched current-5 and temporal-9 online logistic controls; persistence; and EWMA.

For the missing-feedback task, the regime switch is indexed by forecast cadence; the separately
reported elapsed-time coordinate is what advances irregularly. The descriptor and its hashes were
corrected to state that exact implemented law rather than imply an elapsed-time-triggered switch.

All 4,224 configured rows are retained. Development/validation aggregate soft-target squared error is:

| Arm                       | Development (48 seeds) | Fixed-config validation (16 seeds) |
| ------------------------- | ---------------------: | ---------------------------------: |
| H4 adaptive               |               0.002794 |                           0.002850 |
| H8 adaptive               |               0.002526 |                           0.002400 |
| H16 adaptive              |               0.002396 |                           0.002295 |
| H8 temporal-input ablated |           **0.002380** |                       **0.002284** |
| temporal-9 logistic       |               0.004594 |                           0.004904 |
| persistence               |               0.002950 |                           0.002844 |

H8 is not below the best fixed baseline in 87/288 development schedules and 34/96 validation schedules;
H16 is not below H8 in 126/288 and 42/96; H8 is not below temporal-9 logistic in 13/288 and 4/96.
Most importantly, removing the four temporal inputs slightly improves the aggregate in both roles. This
tested V2 configuration therefore fails to demonstrate temporal-context benefit and is blocked from
protocol advancement. The deterministic hashes are config
`55f31de82cb299862fe8ec807e48ffe93b56150ad6bd30ced147d2542b188a3e` and rows
`ec7f516f3b9567d89dc0bd49e998cec83f2977fe95d9eca38707aa5ec51dfb10`.

Phase B then added an isolated V3 leaf specifically to test temporal identifiability. Its 101 inputs are
five current covariates, 80 ordered historical values, and 16 validity markers. `H=8/16/32` allocates
`926/1,750/3,398` parameters. History is inserted before the current forecast, strict tokens prevent
double observation, bounded RMSProp handles updates, and versioned snapshots restore exact continuation.

The terminal-input-twin task makes the current query state identical while a cue 2, 8, or 16 steps in
the past determines the label. Every one of the 80 sealed task seeds has a distinct cue/query/neutral
profile. All 46,080 rows are retained; 36,864 locked-validation rows enter the gate. The primary H8
model measured SSE `0.168091430523`, cross-entropy `0.710259892165`, twin margin
`0.000118188607`, and ordering `0.5`. It failed all eight criteria: every-control mean and median gain,
every-delay gain, twin margin, ordering, Holm-adjusted p, bootstrap 99% lower bound, and worst-model gain.
Configuration and row seals are
`01afdd9d4983cc63652dd5bb266a5142bdf66f9ecf05a8e9d7c100216091a384` and
`76e6d40fb6fc548bb2475e9b38e46646b8641756c45f4bc6fea2915e4b5ff48f`. V3 therefore remains
non-production and cannot advance to a confirmatory protocol.

Even a future predictor success would not imply downstream ecological benefit; that requires a separate
route/action outcome.

## Workstream C: ordinary delayed resource memory

The existing 70-weight EntityBrain remains the base controller. Phase B has implemented an isolated,
revision-cadenced recurrent resource-head leaf with eight inputs:

- four named semantic lanes;
- the local cue vector `(goalX, goalZ) × desire × cover`;
- energy and speed.

`H=2/4/8` heads add `27/51/99` live parameters, for honest total live controller sizes
`97/121/169`. Of those added parameters, `9/15/27` (the `3H+3` actor/value readout) are online-plastic;
`18/36/72` input/recurrent scalars are fixed seeded inheritance, and leak constants are fixed state
dynamics rather than parameters. The head learns its single bounded actor/value readout only from
actual, once-consumed food reward; no second uncounted offset array exists. It caches its action between
existing staggered goal revisions so the world does not add a full 50,000-organism nonlinear pass each
frame.

Production integration remains gated on actual development-task benefit, adding one-shot graze reward to
the optional goal field, snapshot/lifecycle composition inside `EntityBrainField`, and the unchanged
population performance law.

The retained V1 diagnostic is not evidence: it never executed the real 70-weight brain, used one model
replicate, consumed its validation family during development, allowed post-contact wandering into endpoint
metrics, and had inadequate legacy/surrogate/feedback controls.

Corrected V2 executes and hashes the exact 70-weight `EntityBrainField`, composes it with the H4 resource
head under a fixed 50/50 bounded action law, and freezes identity-trained snapshots before paired
evaluation. Resource/threat cues use opposite bearings, then a mask/inertial reset and 30/90/180-step
delay. Swept segment-circle contact terminates on the first resource or threat patch, with deterministic
resource precedence on exact ties; outcome/path/energy freeze at contact and remaining compute is pure
padding that cannot mutate metrics or learned state. Survival is explicitly not reported because the task
has no death regime.

The 11 arms are identity; frozen cyclic semantics; semantics-off/bearing-retained;
bearing-off/semantics-retained; field-off; recurrence-disabled; state reset at delay;
eligibility-corrupted training with identical true physics and reward-event timing/count; exact legacy-70;
parameter-matched recurrence-padded feedforward (without a literal machine-FLOP-equality claim); and a
full-180-command open-loop action-magnitude-yoked surrogate.

All 4,224 configured rows are retained across 4 model initializations. Identity acquires food in 34/384
trials (`0.088542`). Cyclic, semantics-off, bearing-off, field-off, recurrence-disabled, state-reset,
eligibility-corrupted, and feedforward controls are each exactly the same 34/384 with identical per-model
rates `[0.104167, 0.020833, 0.104167, 0.125000]`. Exact legacy is 18/384 (`0.046875`), while the yoked
surrogate is higher at 50/384 (`0.130208`). The head changes some trajectory diagnostics and descriptively
beats legacy, but establishes no semantic, recurrence, state, or eligibility benefit and loses to its
yoked outcome control. It is rejected. Deterministic hashes are config
`7de3b0f4e979b7213f45e10d04d3457be251d126d45f98bc03b6086dc27476a7`, rows
`2529126f5ea894e8e14762cfc106d8e06d83ecea13247e03c56e5959f85a7067`, and yoke
`046941a03ff61463a172b3500c37105aa0586d3fea95857e40872947250d5614`. The yoke receipt includes the
validation-seed-separated direction-domain law and every full open-loop randomized direction tape.
The ordinary outcomes and yoke are unchanged; its config/row hashes changed only because those sealed
materials embed the expanded 22-family development firewall.

The existing ordinary population gate is not relaxed: aggregate log-log runtime slope `<= 1.15`; the
50,000-entity enhanced-minus-legacy median and every counterbalanced batch median remain `< 3 ms`. V4's
worst batch was `2.82825 ms`, so development has little slack. A head that misses the unchanged gate does
not deploy.

## Remaining family frontier

Families advance independently. A passing family cannot hide another failure.

| Priority | Family                                                                 | Current honest controller/effect                                                                  | Advancement requirement                                                                                                    |
| -------: | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
|        1 | NHI                                                                    | Hybrid policy with a default 109-weight `9→6→7` semantic gene, exact state, and real world writes | Fresh dependency-closed confirmatory protocol only after stable benefit across supported actions/conflict regimes          |
|        2 | Alien flora                                                            | Non-neural bounded ecological-rate controller; biomass affects grazing and chemotaxis             | Independent resource-service outcome; never relabel as neural scaling                                                      |
|        3 | Shoggoths                                                              | Heuristic/game policy writing prey, satiation, economy, velocity, and offspring                   | Prey-capture/satiation/economy benefit against semantic and action controls                                                |
|        4 | Archon/SuperMind                                                       | Five live composite neural minds, each reporting 10,081 MLP weights                               | Target-bearing perception, externally scored reward, material plan/action writes, and real capacity configurations         |
|        5 | Primordial soup                                                        | 128 slots × 24 heritable scalars; ecological/genetic, not neural                                  | Descendant survival or resource service after materialization, not an argmax-construction result                           |
|        6 | APEX                                                                   | Heterogeneous neural/dynamical scaffold with live tiers `953/21,851/41,383`                       | Consume returned motor/plan in the world, use energy as a live input, and score beneficial behavior rather than divergence |
|        7 | Mechalogodrom                                                          | 53,728 live STDP/fusion parameters; direct output is primarily visual                             | Real task action head, external reward, snapshot/restore, and STDP-on/frozen/time-shuffled controls                        |
|        8 | Petri                                                                  | Non-neural differential selection with a positive but sub-floor V4 result                         | Symmetric founders, finite nutrients, real birth/death competition, descendant-share outcome                               |
|        9 | Wilderness fauna, puppeteers, leviathans                               | Heuristic/state-machine ecological controllers                                                    | Material task outcomes and exact semantic/action controls; no neural claim                                                 |
|       10 | Glyphs, light echoes, wingmen, hero/twins, foundationals, god-colossus | Visual, proxy, scaffold, or incompletely action-wired paths                                       | Remain explicitly ineligible until a controller has live inputs, independently scored world writes, and replayable state   |

## Development gates

A mechanism may proceed toward a new protocol only if development validation shows all of the following:

- the declared primary outcome improves against every primary causal control;
- paired bootstrap lower bound is above zero and Holm-adjusted sign-flip inference passes;
- median absolute gain is at least the development floor fixed before validation and worst paired loss is
  no worse than its fixed bound;
- benefit survives every declared regime, bearing, delay, or task-family stratum;
- exact replay, brain-identity lifecycle, snapshot continuation, and 30/60/120 Hz state laws pass;
- at least 10,000 faulted steps per live tier have zero finite/bound violations;
- runtime and memory remain inside the existing family-specific budgets;
- action changes without resource, survival, prediction, or other material outcome gain count as failure.

Neural-capacity scaling additionally requires all tiers to be actually allocated and exercised under
identical information and training budgets, monotone adjacent-tier effects, a positive adjusted
high-minus-low lower bound, and Spearman `rho >= 0.5` between log live parameters and the frozen outcome.
Tier comparisons must domain-separate model-birth and action-policy RNG streams: H3/H6/H12 initialization
consumes different draw counts, so sharing one downstream stream would confound capacity with policy RNG
position.

## Dependency and receipt closure

The next manifest records a sorted SHA-256 map for every local transitive import used by protocol,
fixture, evaluator, task, controller, RNG, statistics, and artifact generation. It also records a root
hash over that map. A closure test fails when an imported local source is absent.

Integrity reads historical bytes with:

```text
git show <recorded-runtime-commit>:<path>
```

It does not require historical sources to remain equal to future `HEAD`. The manifest also pins the lock
file, Bun/toolchain identity, task fixtures, control calibration, and source ancestry. Result generation
rejects a dirty or source-divergent tree.

Because predictor V2, predictor V3, and ordinary V2 fail their development gates—and the NHI result is
only a narrow development diagnostic with a negative conflict response—no successor protocol, manifest,
confirmatory seed family, or claim-bearing result is frozen from these configurations.

## Claim boundary

Phase-B implementation, development success, larger parameter counts, or a future family pass does not by
itself change any A-Life, consciousness, or sentience score. `indicatorOnly` remains true. Phenomenal
consciousness, sentience, general intelligence, physical quantum advantage, and security require separate
theory-grounded, preregistered experiments and external replication.
