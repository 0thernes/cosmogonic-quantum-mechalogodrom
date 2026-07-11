# Operational Organism Intelligence — causal audit

**Date:** 2026-07-10

**Status:** current v3 evidence report

**Binding design contract:** [ADR-0013](../adr/0013-operational-organism-intelligence-2026-07-10.md)

**Machine-readable result:**
[`organism-intelligence-causal-benchmark-v3.json`](./assets/organism-intelligence-causal-benchmark-v3.json)
(`contentSha256` `bf63db97fa736d1da099b43dc177326e02e34c8cced9d310870229922b6f7b63`)

## Verdict

V3 fixes the v2 control confound: its substrate-disabled arm keeps the identical explicit ecology goal
and removes only the shared corpus signal. Under that matched control, the corpus-conditioned controller
improves one-step resource progress by `0.007518761600888019`, with bootstrap 95% CI
`[0.005891651061148594, 0.009238776533376803]`. The goal-only controller separately beats the exact
legacy controller by `0.007631945777912622`, with CI
`[0.006805921181039884, 0.008519529182282277]`.

The stronger claims do **not** pass. Median post-reversal return improves by only
`3.9129219926143224%`, below the preregistered `5%` threshold. Channel permutation and
entropy-matched classical controls remain tied with enhanced. Four specialist aggregate systems still
lack full-class matched counterfactuals. Therefore no additional A-Life, capability, consciousness, or
sentience score uplift is authorized by this receipt.

This is evidence for bounded deterministic task behavior—not for general intelligence, phenomenal
consciousness, sentience, physical quantum entropy, quantum advantage, or cryptographic security.

## Preregistered v3 protocol

- 30 disjoint held-out deterministic seeds and 10,000 paired bootstrap samples.
- Resource controls: goal-preserved substrate disable, exact legacy/no-goal context, repository-channel
  permutation, entropy-matched classical exploration, and random policy.
- Resource task: one-step x-axis progress toward the same explicit flora goal.
- Adaptation task: 240 steps with the resource goal reversed after step 120; online trace versus frozen
  trace.
- Corpus causality: every external row ablated separately on every one of the 30 held-out seeds.
- Numerical safety: 10,000 forced steps with NaN, positive/negative infinity, and extreme finite inputs.
- Performance: shared-field cadence plus legacy/enhanced 50,000-entity controller timings.
- Coverage: full-class matched counterfactuals are required; source inspection alone cannot pass.

## V3 results

| Test                            | Exact measured result                                                                                          | Gate                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Enhanced resource progress      | mean `0.014374130663348316`                                                                                    | context                        |
| Goal-only resource progress     | mean `0.006855369062460302`                                                                                    | context                        |
| Exact legacy progress           | mean `-0.0007765767154523202`                                                                                  | context                        |
| Goal-only − legacy              | `0.007631945777912622`; 95% CI `[0.006805921181039884, 0.008519529182282277]`; dz `3.150413721976839`          | **pass**                       |
| Enhanced − goal-only            | `0.007518761600888019`; 95% CI `[0.005891651061148594, 0.009238776533376803]`; dz `1.5791418472952083`         | **pass**                       |
| Enhanced − shuffled channels    | `-0.0000920090789140815`; 95% CI `[-0.0003326717364833753, 0.00017295119097604573]`; dz `-0.13152139833851026` | no substrate-specific uplift   |
| Enhanced − classical entropy    | `-0.0005543586448829664`; 95% CI `[-0.0012357750695679093, 0.0001136388683422123]`; dz `-0.2901298770134111`   | no quantum-specific uplift     |
| Post-reversal median            | enhanced `1.522862440765349`; frozen `1.465517869734803`; relative `0.039129219926143224`                      | **fail** (`3.9129% < 5%`)      |
| Post-reversal enhanced − frozen | mean `0.12050746675240001`; 95% CI `[0.07706648470318986, 0.16991166304806113]`; dz `0.908794532674938`        | positive secondary result only |
| Worst reversal seed             | relative loss `-0.01269826560965952`                                                                           | safety bound pass              |
| External-channel causality      | `17/17` integrated changed final velocity on each of 30 seeds; `5/5` excluded were exact zero on each seed     | **pass**                       |
| Numerical fault run             | 10,000/10,000 revisions; every signal finite and in `[0,1]`                                                    | **pass**                       |
| Shared-field p95                | `0.021599999999992292 ms`                                                                                      | **pass**                       |
| 50,000-organism median          | legacy `8.842500000000001 ms`; enhanced `11.512900000000002 ms`; incremental `2.6704000000000008 ms`           | **pass** (`< 3 ms`)            |
| Every-consumer counterfactual   | six classes direct; four specialist aggregates source-path only                                                | **open/fail**                  |

Direct matched counterfactuals cover ordinary entities, alien flora, NHIs, glyph beings, wilderness
fauna, and primordial digital biologics. Shoggoths, puppeteers, titans, and leviathans have bounded live
action/policy paths but still need full-class matched controls. Archon/apex and Mechalogodrom paths are
pre-existing deep systems outside this new every-consumer gate.

## Why v2 is superseded

V2 compared enhanced against a control that removed both the corpus signal and the explicit resource
goal. Its positive difference therefore mixed two interventions. V3 preserves the goal while disabling
the corpus, reports the goal-only-versus-legacy result separately, and evaluates all 22 row ablations on
all 30 seeds. The v1/v2 JSON files remain tracked as historical evidence but no current public surface
uses them as the operative claim receipt.

## External repository ledger

The live registry contains exactly 22 external repositories: 15 under the `tsotchke` user and seven
under `Tsotchke-Corporation`. The corrected classes are `8 deep`, `7 wired`, `2 harvest`, `4 fenced`,
and `1 meta`. Thus `17/21 = 0.8095238095238095` non-meta repositories are integrated. The internal
`classical-contrast` experiment remains operational but is not an external repository.

| Class   | Count | External repositories                                                                                                                  |
| ------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Deep    |     8 | `eshkol`, `moonlab`, `tensorcore`, `libirrep`, `spin_based_neural_network`, `quantum_geometric_tensor`, `quantum_rng`, `classical_rng` |
| Wired   |     7 | `simple_mnist`, `asteroids`, `PINN`, `PIMC`, `ulg`, `logo-lab`, `quantum-quake`                                                        |
| Harvest |     2 | `homebrew-eshkol`, `Quantum-RNG-API`                                                                                                   |
| Fenced  |     4 | `gpt2-basic`, `llm-arbitrator`, `SolanaQuantumFlux`, `OBLITERATUS`                                                                     |
| Meta    |     1 | `.github`                                                                                                                              |

`OBLITERATUS` is an AGPL-3.0 refusal-removal LLM toolkit and is fenced by both license and the non-LLM
simulation mandate. `gpt2-basic` and `llm-arbitrator` are mandate-fenced; `SolanaQuantumFlux` is
proprietary. Fenced and metadata rows are exactly inert.

## Eshkol and QRNG provenance boundaries

The Eshkol reference is `v1.3.2-evolve` commit
`8443ddaeecec579c60ac858348a23cf1912d7a78`, selected because it contains correctness fixes beyond
the requested v1.3.1 release. Cosmogonic implements an order-0-through-8 Float64 Taylor-jet analogue;
it is not native Eshkol parity, exact-rational arithmetic, unlimited order, or full R7RS.

The Quantum RNG reference is `v3.0.1` commit
`a00ad483cbbef31ea7536f09ae99409d81c9a823`. Cosmogonic uses a seeded deterministic classical
state-vector adaptation. Its health counters are diagnostics only. It is not a CSPRNG, SP 800-90B
certification, hardware entropy source, physical Bell experiment, or quantum-advantage result. A
simulated CHSH value near `2√2` is classical model conformance. The upstream audit also observed a
current ARM64 duplicate-output test failure, so no production/security-readiness claim is made.

## Public 9-axis profile and 113-system comparison

The current canonical code-grounded vector is:

`[4.0, 2.2, 3.2, 3.8, 3.9, 4.5, 4.3, 3.5, 4.0]`

The independently gated live soup-selection and ordinary-entity goal/adaptation paths support the
bounded ecology/cognition increases already represented here. V3 authorizes no further increase.

- breadth `3.711`, rank `#1 / 113`;
- population z-score `2.881`, peer-only z-score `3.008`;
- Mahalanobis distance `10.245`;
- on the nine-dimensional Pareto front, dominated by `0` and dominating `22` systems;
- profile evenness `0.992`; peer maturity remains `1.5 / 5`.

These are curated comparative scores, not independent scientific validation. The
consciousness-theory axis measures instrumentation breadth, not consciousness.

## Claim gate

Allowed now:

- explicit ecology-goal controller improvement over exact legacy;
- corpus-conditioned resource-goal improvement over a goal-preserved disable control;
- per-repository causal reach for all 17 integrated rows on all 30 held-out seeds;
- exact inertness for four fences plus metadata;
- 10,000-step bounded numerical safety and measured execution within the local performance budget.

Not allowed now:

- success under the preregistered 5% reversal-adaptation criterion;
- every-consumer counterfactual coverage;
- substrate-specific or quantum-specific behavioral uplift;
- additional numeric A-Life, capability, consciousness, or sentience uplift from v3;
- phenomenal consciousness, sentience, general intelligence, physical quantumness, or security claims.
