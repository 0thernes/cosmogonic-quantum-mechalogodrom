# ADR 0013: Operational Corpus Intelligence for Living Systems

**Status:** Accepted
**Date:** 2026-07-10

## Context

The Tsotchke ledger, the organism controllers, and the public intelligence reports had drifted apart.
The runtime registry contained 22 rows but only 21 of the 22 live public repository names: it omitted
`OBLITERATUS` and counted Cosmogonic's internal `classical-contrast` control as though it were an
external repository. Most ordinary organisms ran a compact 70-parameter controller that never read a
Tsotchke signal or an explicit ecological goal. Several specialist beings had stronger local cognition,
but no shared causal field connected the corpus to all living-system decisions. The public nine-axis
profile and consciousness/sentience feeds therefore cannot be raised merely because more code exists.

The upstream release audit also established two hard scientific boundaries:

- Quantum RNG v3.0.0 had range and health-test defects fixed in v3.0.1, while the current upstream
  branch still has a failing ARM64 duplicate-output test. A classical state-vector program can reproduce
  the CHSH prediction; that is model conformance, not evidence of physical quantum entropy or security.
- Eshkol v1.3.2 contains correctness fixes beyond the requested v1.3.1 release. Its native Taylor tower
  is real but bounded by operations and resources; the browser/runtime analogue is not exact-rational
  native Eshkol and Eshkol is not complete R7RS Scheme.

## Decision

### Corpus and provenance

- Keep an exact 22-entry **external** registry: 15 user repositories and seven organization
  repositories. Register `OBLITERATUS` as AGPL/non-LLM fenced. Keep `classical-contrast` in a separate
  internal-control ledger so it cannot inflate external coverage.
- Publish depth and integration mode separately. `direct-port`, `deterministic-facade`, `harvest`,
  `fenced`, and `meta` describe what Cosmogonic actually executes; they do not certify upstream claims.
- The corrected external depth tally is 8 deep, 7 wired, 2 harvest, 4 fenced, and 1 meta. The non-meta
  integration fraction is 17/21; the prior inflated fraction is superseded.
- Never copy AGPL, GPL-derived, proprietary, unlicensed, or chain-of-title-unclear source into the
  proprietary runtime. Independent mathematical analogues stay labelled as such. Fenced and meta rows
  must contribute exactly zero to runtime decisions.

### Shared intelligence field

- One `TsotchkeOrganismIntelligence` owner evaluates all external registry rows on a slow fixed cadence.
  Its work is O(22 + K^2 + 2^q), with bounded Taylor order `K <= 8` and state-vector size `q <= 8`.
- It writes a stable, reused signal object containing resource pressure, threat response, exploration,
  social drive, plasticity, forecast, confidence, corpus drive, health state, and revision. Consumers do
  O(1) work per organism; no organism loops over repositories.
- The Eshkol-inspired Taylor jet forecasts short-horizon ecological pressure from deterministic history.
  It is a Float64 runtime analogue pinned in provenance to Eshkol v1.3.2-evolve commit
  `8443ddaeecec579c60ac858348a23cf1912d7a78`, not native exact-rational or full-language parity.
- The exploration source is a deterministic classical state-vector model adapted from Quantum RNG
  v3.0.1 commit `a00ad483cbbef31ea7536f09ae99409d81c9a823`. It uses seeded simulation entropy only. Its RCT/APT-style
  counters are bounded diagnostics, not SP 800-90B validation. A health failure must reduce or replace
  exploration; CHSH never gates entropy, intelligence, or security.

### Living-system consumers

- Ordinary entities combine their neural action with the explicit flora-resource goal calculated by
  `EntityManager`. Each slot keeps bounded value/action traces and updates them from metabolic reward,
  making behavior reactive, goal-directed, and adaptive without changing the 70 inherited parameters.
- Flora uses depletion and forecast signals to alter actual biomass recovery, which changes later food
  yield. Shoggoths, puppeteers, titans, leviathans, NHIs, glyph beings, wilderness fauna, and digital
  biologics consume bounded channels in an action, policy, or ecological path—not only in rendering.
- Missing signal injection preserves legacy behavior for focused/headless tests. The live composition
  root injects the field. The single field owner sanitizes and clamps its output; exported worker/pure
  kernels also sanitize direct numeric parameters. Object consumers read that owner-bounded signal and
  remain deterministic—they do not each duplicate the complete sanitization layer.
- Matched counterfactual tests currently cover ordinary entities, flora, NHIs, glyph beings, wilderness
  fauna, and primordial digital biologics. Shoggoths, puppeteers, titans, and leviathans have bounded
  source-level action/policy paths, but their full-class matched-control tests remain an open gate. This
  distinction is carried into the machine receipt and blocks an every-consumer or numeric-uplift claim.

### Claim boundary

The implementation may claim deterministic corpus-conditioned adaptation only after the preregistered
tests below pass. It must continue to say `indicatorOnly`: no benchmark establishes phenomenal
consciousness, sentience, physical quantumness, or general intelligence. Nine-axis, A-Life, scrutiny,
consciousness, and sentience scores change only from generated evidence receipts, never from prose.

## Preregistered Evaluation

All comparisons use identical initial state and seeds. The enhanced controller is compared with four
controls: substrate disabled, repo-channel permutation, entropy-matched classical exploration, and a
random-policy controller. Development and held-out seed sets are fixed before reading outcomes.

| Gate                | Metric                                                | Acceptance rule                                                                                                                                       |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replay              | World/action fingerprint                              | Same seed, config, and substrate snapshot is byte-identical on every run.                                                                             |
| Resource seeking    | Cosine progress toward a depleted-organism flora goal | Paired mean improvement over disabled is positive and the 95% bootstrap interval excludes zero on 30 held-out seeds.                                  |
| Adaptation          | Return after a resource-goal reversal                 | Enhanced median post-reversal return is at least 5% above its frozen-trace ablation; no catastrophic seed loses more than 20%.                        |
| Corpus causality    | Final action/velocity counterfactual                  | Ablating each of the 17 integrated external rows changes a downstream decision above `1e-9`; all four fenced rows and meta change it by exactly zero. |
| Coverage            | Explicit consumer inventory                           | Every living-system class named above must have a behavioral or ecological counterfactual test; source-path inspection alone does not pass this gate. |
| Numerical safety    | Runtime signals and state                             | All values remain finite and within documented bounds under fault injection and 10,000 steps.                                                         |
| Cost                | Shared-field and 50,000-entity benchmark              | Shared-field p95 is below 0.5 ms and incremental 50,000-entity median cost is below 3 ms on the release machine; exact machine metadata is stored.    |
| Scientific controls | Shuffled/classical/random comparisons                 | Report all outcomes and effect sizes. A failed or tied control blocks an uplift claim but does not get hidden.                                        |

The machine-readable receipt records seeds, task version, source commits, artifact hashes, effect sizes,
confidence intervals, regressions, and runtime cost. The public surfaces must render from that receipt.

## Consequences

- Per-frame population cost remains linear in living entities with a small constant; repository breadth
  is paid once per shared-field cadence. Consumer loops reuse storage; the bounded cadence pass and
  evidence snapshots may allocate and are measured rather than described as globally allocation-free.
- Registry honesty worsens the headline fraction from 85.7% to 81.0% while improving factual coverage.
- A passing behavioral ablation demonstrates causal use, not that every upstream repository was ported
  natively or deeply.
- QRNG hardware entropy, secure modes, and replay tapes remain deferred until a release has a fully green
  platform matrix and an output-linked security design. Native Eshkol build-oracle artifacts remain a
  separate, provenance-sealed enhancement rather than an implicit browser claim.
- If the paired benchmarks do not pass, the implementation and negative result remain publishable, but
  capability/consciousness/sentience scores do not increase.
