# Operational Organism-Intelligence Causal Audit

**Date:** 2026-07-10

**Status:** current V3 evidence report

**Binding design contract:** [ADR-0013](../adr/0013-operational-organism-intelligence-2026-07-10.md)

**Machine-readable result:**
[`organism-intelligence-causal-benchmark-v3.json`](./assets/organism-intelligence-causal-benchmark-v3.json)
(`contentSha256` `dbf77fa42c9490eb38763c2f1a281b52667bec9e5081c24a3a283b1a78dcc23a`)

## Verdict

V3 uses a fresh deterministic 30-seed family disjoint from V1 and V2. It is a fixed evaluation set,
not an externally preregistered or untouched validation set. On this family:

- the synthetic `+x` goal controller beats exact legacy by `0.009081553179910407`, with bootstrap 95% CI
  `[0.008224136063586919, 0.009901016159411519]`;
- the corpus-conditioned controller beats the goal-preserved substrate-disabled control by
  `0.008926803443918892`, with CI `[0.0074709186839338375, 0.010524275559338788]`;
- reversal adaptation improves by `6.121266720602802%`, clearing the script-declared `5%` threshold;
- all `17/17` integrated repository rows remain causal on every evaluation seed, all `5/5` excluded
  rows remain exactly inert, 10,000 forced numerical-fault steps remain finite and bounded, all ten
  named living-system classes have matched counterfactuals, and all 30 performance batches across three
  fresh processes remain under `3 ms` incremental cost.

The complete claim gate still fails. Enhanced behavior does not separate from the uniform random-action baseline; rotating
all four exposed aggregate semantic channels does not establish mapping specificity; replacing the final
exploration signal with a uniform surrogate is also tied and is not an entropy-matched or physical-quantum
control. Therefore V3 authorizes no additional A-Life, capability, consciousness, or sentience score
uplift. The statistical task is a synthetic goal-field response—not a flora/resource simulation.

This is bounded deterministic task evidence—not evidence of general intelligence, phenomenal
consciousness, sentience, physical quantum entropy, quantum advantage, or cryptographic security.

## Fixed V3 protocol

- 30 fresh deterministic evaluation seeds, disjoint from V1/V2, plus 10,000 paired bootstrap samples.
- The seed family is fixed in the benchmark source but was not externally preregistered.
- Synthetic-goal controls: goal-preserved substrate disable, exact legacy/no-goal context, a cyclic rotation of
  all four exposed aggregate semantic channels, a uniform replacement of the final composed exploration
  value, and a uniform random-action baseline.
- The aggregate rotation is not described as a 22-repository permutation because the live consumer API
  exposes four aggregate channels. The uniform exploration surrogate is not described as entropy matched.
- Goal task: one-step x-axis response to the same synthetic `+x` goal field; no flora/resource
  environment is constructed.
- Adaptation task: 240 steps with the synthetic goal direction reversed after step 120; online trace versus frozen trace.
- Corpus causality: every external row is ablated separately on every evaluation seed.
- Numerical safety: 10,000 forced steps with NaN, positive/negative infinity, and extreme finite inputs.
- Performance: three fresh processes, each with ten batches of seven samples per branch at 50,000 entities;
  branch state is isolated and first-run order is counterbalanced. The worst shared-field p95, median
  process increment, and all-30-batch stability are reported.
- Consumer coverage: the receipt executes and records the exact ten-file targeted Bun test gate; only
  full-class matched counterfactuals pass.

## V3 results

| Test                                     | Exact measured result                                                                                             | Gate                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Enhanced synthetic-goal response         | mean `0.013675299144226055`                                                                                       | context                              |
| Goal-only synthetic response             | mean `0.004748495700307164`                                                                                       | context                              |
| Exact legacy response                    | mean `-0.0043330574796032395`                                                                                     | context                              |
| Uniform random-action response           | mean `0.009705811435589566`                                                                                       | context                              |
| Goal-only − legacy                       | `0.009081553179910407`; 95% CI `[0.008224136063586919, 0.009901016159411519]`; dz `3.7930432385228356`            | **pass**                             |
| Enhanced − goal-only                     | `0.008926803443918892`; 95% CI `[0.0074709186839338375, 0.010524275559338788]`; dz `2.0584821748050905`           | **pass**                             |
| Enhanced − random                        | `0.003969487708636489`; 95% CI `[-0.010601483800813, 0.0189792125751305]`; dz `0.09414009637952211`               | **fail/tied**                        |
| Enhanced − aggregate rotation            | `-0.000029724700357763793`; 95% CI `[-0.00034302817854577695, 0.0002708306663364767]`; dz `-0.033895147462430615` | no aggregate-mapping-specific uplift |
| Enhanced − uniform exploration surrogate | `0.00017427102104637573`; 95% CI `[-0.0005910144811096056, 0.0010254502857670654]`; dz `0.0754619380605088`       | no surrogate-specific uplift         |
| Post-reversal median                     | enhanced `1.2743610106013112`; frozen `1.2008535611966096`; relative `0.06121266720602802`                        | **pass** (`6.1213% > 5%`)            |
| Post-reversal enhanced − frozen          | mean `0.15978181829699184`; 95% CI `[0.11788071166290177, 0.20429248191903368]`; dz `1.3134377665377908`          | **pass on fixed family**             |
| Worst reversal seed                      | relative loss `-0.0027290855917749624`                                                                            | safety bound pass                    |
| External-row causality                   | `17/17` integrated changed velocity on each of 30 seeds; `5/5` excluded were exact zero on each seed              | **pass**                             |
| Numerical fault run                      | 10,000/10,000 revisions; every signal finite and in `[0,1]`                                                       | **pass**                             |
| Shared-field worst-process p95           | `0.11370000000000147 ms`                                                                                          | **pass**                             |
| 50,000-entity process-median increment   | `1.3580999999999506 ms` across three isolated, order-counterbalanced processes                                    | **pass**                             |
| 50,000-entity repeat stability           | worst of 30 batch medians `2.740300000000161 ms`; `30/30 < 3 ms`                                                  | **pass**                             |
| Every-consumer counterfactual            | targeted ten-file run: `101` tests, `0` fail, `377,438` assertions across all ten named classes                   | **pass**                             |

## Evidence inventory and complete named-consumer coverage

The JSON field `consumerCoverage` binds the receipt to a targeted `bun test` run (`101` pass, `0` fail,
`377,438` assertions) over these exact evidence files; the full repository gate reruns them:

- `tests/operational-organism-intelligence.test.ts`
- `tests/alien-flora.test.ts`
- `tests/nhi.test.ts`
- `tests/glyph-brain.test.ts`
- `tests/wilderness.test.ts`
- `tests/tsotchke-facade.test.ts`
- `tests/shoggoths.test.ts`
- `tests/puppet-masters.test.ts`
- `tests/titans.test.ts`
- `tests/leviathans.test.ts`

Those tests cover ordinary entities, alien flora, NHIs, glyph beings, wilderness fauna, primordial
digital biologics, shoggoths, puppeteers, titans, and leviathans. The four specialist seals hold
seed/config/signal values fixed, toggle only `enabled`, assert deterministic replay, and require
full-class action or trajectory divergence. Archon/apex and Mechalogodrom paths are pre-existing deep
systems outside this named-consumer gate.

## Why earlier receipts are superseded

V2 removed both the corpus signal and the explicit goal in its disabled arm, confounding goal-controller
and corpus effects. The first V3 draft fixed that control but reused the V2 seeds and overstated a
four-aggregate-channel rotation as a repository permutation and a final exploration replacement as
entropy matched. The current V3 receipt replaces that draft before publication: it uses a disjoint seed
family, honest control names, a uniform-random-action difference, isolated and order-counterbalanced
three-process/30-batch performance stability, an executed ten-file consumer gate, and a SHA-256 of the
exact benchmark source. V1/V2 remain tracked as historical evidence.

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

## Eshkol, QRNG, and receipt provenance

The Eshkol reference is `v1.3.2-evolve` commit
`8443ddaeecec579c60ac858348a23cf1912d7a78`. Cosmogonic implements an order-0-through-8 Float64
Taylor-jet analogue; it is not native Eshkol parity, exact-rational arithmetic, unlimited order, or full
R7RS.

The Quantum RNG reference is `v3.0.1` commit
`a00ad483cbbef31ea7536f09ae99409d81c9a823`. Cosmogonic uses a seeded deterministic classical
state-vector adaptation. It is not a CSPRNG, SP 800-90B certification, hardware entropy source,
physical Bell experiment, or quantum-advantage result. A simulated CHSH value near `2√2` is classical
model conformance. The upstream audit also observed a current ARM64 duplicate-output test failure, so
no production/security-readiness claim is made.

The provisional measured runtime parent is commit `628ff6bfbf861a393b1af63b69df8f5efbbe1494`. The exact benchmark
source has SHA-256 `542e44bd6a502788f511ecb9e2be46414d17cfefae13fb416faeacfb3360ea68`.

## Public 9-axis profile and 113-system comparison

The current canonical code-grounded vector is:

`[4.0, 2.2, 3.2, 3.8, 3.9, 4.5, 4.3, 3.5, 4.0]`

The independently gated live soup-selection and ordinary-entity paths support the bounded
ecology/cognition increases already represented here. V3 authorizes no further increase.

- breadth `3.711`, rank `#1 / 113`;
- population z-score `2.881`, peer-only z-score `3.008`;
- Mahalanobis distance `10.245`;
- on the nine-dimensional Pareto front, dominated by `0` and dominating `22` systems;
- profile evenness `0.992`; peer maturity remains `1.5 / 5`.

These are curated comparative scores, not independent scientific validation. The
consciousness-theory axis measures instrumentation breadth, not consciousness.

## Claim gate

Allowed now:

- synthetic goal-controller improvement over exact legacy on the fixed V3 family;
- corpus-conditioned improvement over a goal-preserved disabled control;
- fixed-family reversal adaptation above the script-declared 5% threshold;
- per-repository causal reach for all 17 integrated rows on all 30 evaluation seeds;
- exact inertness for four fences plus metadata;
- 10,000-step bounded numerical safety;
- all 30 incremental-cost batch medians below `3 ms` across three fresh processes;
- matched counterfactual coverage for all ten named living-system classes.

Not allowed now:

- independent/preregistered replication or generalization beyond the fixed seed family;
- superiority to the uniform random-action baseline;
- repository-identity, substrate-specific, or quantum-specific behavioral uplift;
- additional numeric A-Life, capability, consciousness, or sentience uplift from V3;
- phenomenal consciousness, sentience, general intelligence, physical quantumness, or security claims.
