# Operational Organism Intelligence — causal audit

**Date:** 2026-07-10

**Status:** current evidence report

**Binding design contract:** [ADR-0013](../adr/0013-operational-organism-intelligence-2026-07-10.md)

**Machine-readable result:**
[`organism-intelligence-causal-benchmark-v2.json`](./assets/organism-intelligence-causal-benchmark-v2.json)
(`contentSha256` `e0fd138bd9af11dd4db6cd394abaed1b5d4e118324354c286614ea67af3a286b`)

## Verdict

The new shared organism-intelligence field has a measured, deterministic behavioral effect. It passed
the preregistered resource-seeking comparison, made every one of the 17 integrated external repository
channels causally visible while all five excluded channels stayed exactly inert, and remained within the
50,000-organism cost budget. The stronger adaptation claim did **not** pass: median post-reversal return
improved by `3.9129219926143224%`, below the preregistered `5%` threshold.

This is evidence for a bounded task behavior, not for general intelligence, phenomenal consciousness,
sentience, physical quantum entropy, or cryptographic security. The failed adaptation threshold and
non-specific substrate controls prohibit any uplift to the public A-Life, consciousness, or sentience
scores.

## Preregistered protocol

- 30 disjoint held-out deterministic seeds.
- 10,000 paired bootstrap samples.
- Controls: substrate disabled, repository-channel permutation, entropy-matched classical, random policy,
  and frozen learning traces for the reversal task.
- Resource task: one-step x-axis progress toward an identical flora goal.
- Adaptation task: 240 steps with the resource goal reversed after step 120.
- Acceptance for adaptation: enhanced median post-reversal return at least 5% above the frozen-trace
  ablation, with no seed losing more than 20%.

## V2 results

| Test                            | Exact measured result                                                                                                    | Acceptance                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Enhanced resource progress      | `0.014374130663348316` mean                                                                                              | context                                                               |
| Disabled resource progress      | `-0.0007765767154523202` mean                                                                                            | context                                                               |
| Enhanced − disabled             | `0.015150707378800638`; bootstrap 95% CI `[0.013177274872187228, 0.017323769627979817]`; Cohen's dz `2.5396124783677094` | **pass**                                                              |
| Enhanced − shuffled channels    | `-0.0000920090789140815`; bootstrap 95% CI `[-0.0003326717364833753, 0.00017295119097604573]`; dz `-0.13152139833851026` | no substrate-specific effect                                          |
| Enhanced − classical entropy    | `-0.0005543586448829664`; bootstrap 95% CI `[-0.0012357750695679093, 0.0001136388683422123]`; dz `-0.2901298770134111`   | no quantum-specific effect                                            |
| Post-reversal median            | enhanced `1.522862440765349`; frozen `1.465517869734803`; relative improvement `0.039129219926143224`                    | **fail** (`3.9129% < 5%`)                                             |
| Post-reversal enhanced − frozen | `0.12050746675240001` mean; bootstrap 95% CI `[0.07706648470318986, 0.16991166304806113]`; dz `0.908794532674938`        | positive secondary result; does not override failed primary threshold |
| Worst reversal seed             | relative loss `-0.01269826560965952`                                                                                     | safety bound passed                                                   |
| External-channel causality      | `17/17` integrated channels changed final entity velocity; `5/5` excluded channels were exactly zero                     | **pass**                                                              |
| Shared-field p95                | `0.024399999999999977 ms`                                                                                                | **pass**                                                              |
| 50,000-organism median          | legacy `8.7945 ms`; enhanced `11.104700000000008 ms`; incremental `2.310200000000009 ms`                                 | **pass**                                                              |

The V1 predecessor passed goal seeking, corpus causality, and cost but failed median reversal adaptation.
V2 corrected the actor trace to the goal-local frame and used a disjoint held-out seed set. Its adaptation
effect improved, but the preregistered primary criterion still failed; the result is reported rather than
tuned away.

## External repository ledger

The live registry contains exactly 22 external repositories: 15 under the `tsotchke` user and seven under
`Tsotchke-Corporation`. The corrected classes are `8 deep`, `7 wired`, `2 harvest`, `4 fenced`, and
`1 meta`. Thus `17/21 = 0.8095238095238095` non-meta repositories are integrated. The internal
`classical-contrast` experiment remains operational but is not an external repository and never enters
this denominator.

| Class   | Count | External repositories                                                                                                                  |
| ------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Deep    |     8 | `eshkol`, `moonlab`, `tensorcore`, `libirrep`, `spin_based_neural_network`, `quantum_geometric_tensor`, `quantum_rng`, `classical_rng` |
| Wired   |     7 | `simple_mnist`, `asteroids`, `PINN`, `PIMC`, `ulg`, `logo-lab`, `quantum-quake`                                                        |
| Harvest |     2 | `homebrew-eshkol`, `Quantum-RNG-API`                                                                                                   |
| Fenced  |     4 | `gpt2-basic`, `llm-arbitrator`, `SolanaQuantumFlux`, `OBLITERATUS`                                                                     |
| Meta    |     1 | `.github`                                                                                                                              |

`OBLITERATUS` is an AGPL-3.0 refusal-removal LLM toolkit and is fenced both by license boundary and by
the non-LLM simulation mandate. `gpt2-basic` and `llm-arbitrator` are likewise mandate-fenced;
`SolanaQuantumFlux` is proprietary. No fenced or metadata channel affects simulation behavior.

## Eshkol and QRNG provenance boundaries

The Eshkol reference is `v1.3.2-evolve` commit
`8443ddaeecec579c60ac858348a23cf1912d7a78`, selected because it contains correctness fixes beyond
the requested v1.3.1 release. Cosmogonic implements an order-0-through-8 Float64 Taylor-jet runtime
analogue. It is not native Eshkol parity, exact-rational arithmetic, unlimited Taylor order, or full R7RS.

The Quantum RNG reference is `v3.0.1` commit
`a00ad483cbbef31ea7536f09ae99409d81c9a823`; v3.0.1 repairs range and race defects in v3.0.0. The
Cosmogonic runtime is a seeded, deterministic classical statevector adaptation. Its health counters are
diagnostics only. It is **not** a CSPRNG, SP 800-90B certification, hardware entropy source, physical Bell
experiment, or evidence of quantum advantage. A simulated CHSH value near `2√2` is classical model
conformance. The upstream audit also observed a current ARM64 duplicate-output test failure, so no
production- or security-readiness claim is made.

## Public 9-axis profile and 113-system comparison

The current code-grounded vector is:

`[4.0, 2.2, 3.0, 3.8, 3.8, 4.5, 4.3, 3.5, 4.0]`

in the order reproduction, open-endedness, ecology, morphology/physics, cognition/learning, substrate
pluralism, instrumentation, consciousness-theory, and visual scale. From the generated 113-system
comparison:

- breadth mean `3.678` (displayed `3.68`), rank `#1 / 113`;
- population z-score `2.83`, peer-only z-score `2.95`;
- Mahalanobis distance `10.252`;
- on the nine-dimensional Pareto front, dominated by `0` systems and dominating `22`;
- profile evenness `0.992`; peer maturity remains `1.5 / 5`.

These are comparative scores produced from a curated matrix, not independent scientific validation.
The corpus-conditioned benchmark does not authorize increasing any axis. In particular, the
consciousness-theory axis measures instrumentation breadth, not consciousness.

## Claim gate

Allowed now:

- deterministic, corpus-conditioned resource-goal improvement against the disabled control;
- per-repository causal reach for all 17 integrated external channels;
- bounded shared-field and 50,000-organism execution cost.

Not allowed now:

- adaptation success under the preregistered 5% primary criterion;
- substrate-specific or quantum-specific behavioral uplift;
- numeric A-Life, capability, consciousness, or sentience uplift;
- phenomenal consciousness, sentience, general intelligence, physical quantumness, or security claims.
