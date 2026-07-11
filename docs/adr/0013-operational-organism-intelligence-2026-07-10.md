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
- Matched counterfactual tests cover ordinary entities, flora, NHIs, glyph beings, wilderness fauna,
  primordial digital biologics, shoggoths, puppeteers, titans, and leviathans. Each specialist seal holds
  seed/config/signal values constant and toggles only the shared-field enable state; deterministic replay
  and full-class action/trajectory divergence are enforced. The machine receipt inventories the exact ten
  test files rather than treating source-path inspection as evidence.

### Claim boundary

The implementation may claim deterministic corpus-conditioned adaptation only within the exact fixed
evaluation conditions whose tests below pass. It must continue to say `indicatorOnly`: no benchmark establishes phenomenal
consciousness, sentience, physical quantumness, or general intelligence. Nine-axis, A-Life, scrutiny,
consciousness, and sentience scores change only from generated evidence receipts, never from prose.

## Fixed Evaluation (not external preregistration)

All paired comparisons use identical initial state and seeds. V3 uses a fresh deterministic 30-seed
family disjoint from V1/V2 and fixed in benchmark source before receipt generation; it is not an
externally preregistered or untouched validation set. The enhanced controller is compared with a
goal-preserved substrate disable, exact legacy/no-goal context, a uniform random-action baseline, a cyclic rotation of all
four exposed aggregate semantic channels, and a uniform replacement of the final composed exploration
value. The last two are sensitivity checks—not a 22-repository permutation, entropy-matched control, or
physical-quantum experiment.

| Gate                    | Metric                                                     | Acceptance rule                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replay                  | World/action fingerprint                                   | Same seed, config, and substrate snapshot is byte-identical on every run.                                                                                                                         |
| Synthetic goal response | One-step velocity response to an identical `+x` goal field | Report goal-only minus legacy, enhanced minus goal-preserved disabled, and enhanced minus random; each accepted difference must have a positive paired mean and 95% bootstrap lower bound.        |
| Adaptation              | Return after a synthetic goal-direction reversal           | Enhanced median post-reversal return is at least 5% above its frozen-trace ablation; no catastrophic seed loses more than 20%.                                                                    |
| Corpus causality        | Final action/velocity counterfactual                       | Ablating each of the 17 integrated external rows changes a downstream decision above `1e-9`; all four fenced rows and meta change it by exactly zero.                                             |
| Coverage                | Explicit consumer inventory                                | Every living-system class named above must have a behavioral or ecological counterfactual test; source-path inspection alone does not pass this gate.                                             |
| Numerical safety        | Runtime signals and state                                  | All values remain finite and within documented bounds under fault injection and 10,000 steps.                                                                                                     |
| Cost                    | Shared-field and 50,000-entity benchmark                   | Across three fresh processes, worst-process shared-field p95 is below 0.5 ms, the median process-level increment is below 3 ms, and all 30 counterbalanced 7-sample batch medians are below 3 ms. |
| Scientific controls     | Aggregate rotation / exploration surrogate / random        | Report all outcomes, limitations, and effect sizes. A failed or tied control blocks an uplift claim but does not get hidden.                                                                      |

The machine-readable receipt records seeds, task version, runtime commit, benchmark-source SHA-256,
artifact hash, test-evidence inventory, effect sizes, confidence intervals, regressions, and runtime
cost. The public surfaces must render from that receipt.

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
