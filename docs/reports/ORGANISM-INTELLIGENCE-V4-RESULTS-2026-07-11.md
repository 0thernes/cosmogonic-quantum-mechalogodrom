# Organism Intelligence V4 — Repository-Preregistered Results

**Generated:** 2026-07-11 · **Harness commit:** `4a029969f0a1dc6057bcc0917982cc3b95daaa20` ·
**Frozen manifest commit:** `5b72a22fa9d0f87ccd29c3302a00e32eb77d237e`

V4 is a repository-preregistered, fixed 64-seed-per-family descendant evaluation. It is **not** an
external preregistration or an independent replication. The post-write integrity test recomputes the
receipt hash, source and fixture hashes, exact 1,152-row CSV, Git ancestry, forbidden claims, and forest
SVG bytes. Failed rows and gates are retained.

**Portability erratum:** the live ordinary evaluator and result generator now contain a post-result,
calibration-identity-only portability amendment. The published V4 assets were not regenerated and remain
bound to runtime commit `4a029969f0a1dc6057bcc0917982cc3b95daaa20`; links below to live source files
do not represent those historical source bytes. Integrity checks recover and hash the recorded commit's
blobs directly. The live writer fails closed on these finalized paths; any successor result requires a
new result ID, schema version, and output paths. A 12-decimal projected scientific seal across all 64
ordinary seeds (`fc77fc74a65722c7c3a1128d392c2f4383674c3cff4cd2e9a84f57e44f8346bb`) retains live
regression strength without pretending the raw binary64 trace digests are cross-platform portable.

- [Canonical JSON receipt](./assets/organism-intelligence-causal-benchmark-v4.json)
- [Complete raw 1,152-row CSV](./assets/cross-being-neural-causality-v1.csv)
- [Accessible byte-stable forest SVG](./assets/organism-intelligence-v4-cross-being-forest.svg)
- [Frozen preregistration manifest](./assets/organism-intelligence-v4-phase-a-preregistration.json)
- [Executable frozen protocol](../../scripts/organism-intelligence-v4-protocol.ts)
- [Committed result generator](../../scripts/organism-intelligence-v4-benchmark.ts)
- [Post-write artifact integrity test](../../tests/organism-intelligence-v4-artifact-integrity.test.ts)

![V4 cross-being weakest-contrast forest](./assets/organism-intelligence-v4-cross-being-forest.svg)

## Result

| Family             | Controller  | Frozen family result                          | Weakest mean delta [unadjusted bootstrap 95% CI] | Claim result                                                      |
| ------------------ | ----------- | --------------------------------------------- | -----------------------------------------------: | ----------------------------------------------------------------- |
| Ordinary organisms | Neural      | **FAIL** — inference passed; magnitude failed |                 `+0.001140 [0.000806, 0.001450]` | Semantic task response and recurrent-context benefit **withheld** |
| Ecology predictor  | Neural      | **FAIL** — inference and magnitude failed     |               `-0.015721 [-0.017683, -0.013562]` | Adaptive next-cadence prediction **withheld**                     |
| Petri biologics    | Ecological  | **FAIL** — inference passed; magnitude failed |                 `+0.010359 [0.010335, 0.010383]` | Ecological semantic-selection causality **withheld**              |
| Titans             | Game policy | **PASS** — inference and magnitude passed     |                 `+0.104948 [0.083073, 0.126302]` | Bounded game-policy semantic causality **authorized**             |

This is **one family pass and three family failures**, not an overall V4 pass. Titans are non-neural;
their result is not evidence of neural-capacity scaling.

## Every preregistered contrast

The family law requires every declared contrast to pass both its inference and magnitude rules. Holm
values are adjusted within family; the shown confidence intervals are unadjusted paired-bootstrap
intervals, exactly as preregistered.

| Family / full-minus-control contrast |        Mean |      Median |  Worst seed |         Bootstrap 95% CI |     Holm p | Inference | Magnitude |
| ------------------------------------ | ----------: | ----------: | ----------: | -----------------------: | ---------: | --------- | --------- |
| Ordinary − recurrence disabled       |  `0.001423` |  `0.001331` |  `0.000691` |   `[0.001323, 0.001522]` | `0.000200` | PASS      | **FAIL**  |
| Ordinary − cyclic semantics          |  `0.001140` |  `0.001135` | `-0.004207` |   `[0.000806, 0.001450]` | `0.000200` | PASS      | **FAIL**  |
| Ordinary − shared field disabled     |  `0.015666` |  `0.015657` |  `0.004805` |   `[0.014373, 0.016972]` | `0.000200` | PASS      | **FAIL**  |
| Ordinary − action-matched surrogate  |  `0.053426` |  `0.051251` |  `0.023192` |   `[0.048930, 0.058045]` | `0.000200` | PASS      | PASS      |
| Predictor adaptive − frozen          |  `0.000053` | `-0.011280` | `-0.059306` |  `[-0.010313, 0.011005]` | `0.991150` | **FAIL**  | **FAIL**  |
| Predictor adaptive − shuffled        | `-0.015721` | `-0.017178` | `-0.034587` | `[-0.017683, -0.013562]` | `1.000000` | **FAIL**  | **FAIL**  |
| Petri − shared field disabled        |  `0.017022` |  `0.017017` |  `0.016874` |   `[0.017007, 0.017037]` | `0.000150` | PASS      | **FAIL**  |
| Petri − cyclic semantics             |  `0.010359` |  `0.010353` |  `0.010117` |   `[0.010335, 0.010383]` | `0.000150` | PASS      | **FAIL**  |
| Petri − uniform flux                 |  `0.018329` |  `0.018350` |  `0.017566` |   `[0.018221, 0.018442]` | `0.000150` | PASS      | **FAIL**  |
| Titans − shared field disabled       |  `0.613802` |  `0.633333` |  `0.416667` |   `[0.597396, 0.629427]` | `0.000150` | PASS      | PASS      |
| Titans − cyclic semantics            |  `0.267708` |  `0.250000` |  `0.066667` |   `[0.244271, 0.291667]` | `0.000150` | PASS      | PASS      |
| Titans − action-matched surrogate    |  `0.104948` |  `0.100000` | `-0.133333` |   `[0.083073, 0.126302]` | `0.000150` | PASS      | PASS      |

For predictor magnitude, the preregistered aggregate relative true-label Brier reductions were
`+0.000199` versus frozen and `-0.063455` versus shuffled, both below the required `+0.05`.

## Load-bearing evidence and diagnostics

- The CSV contains the exact ordered matrix: `64 × (6 ordinary + 4 predictor + 4 Petri + 4 Titan)`
  rows. No seed, arm, negative effect, or failed gate was filtered.
- Matched initial-state, percept, task-schedule, and environment-RNG identities—and arm-specific
  intervention, calibration, and replay identities—are hashed per row. Every row replayed
  byte-identically within the recorded Windows platform/toolchain.
- Ordinary secondary evidence includes three explicit goal-reversal recovery windows with zero-lag and
  right-censoring semantics.
- Predictor feedback is exactly one cadence delayed; shuffled labels train only the shuffled control,
  while all arms are scored against unshuffled truth.
- Petri's disabled arm is compared to a fresh same-seed live legacy-path trajectory. This is honest
  same-build behavioral equality, not version-independent proof.
- Titan secondary evidence includes per-regime and aggregate pair payoff, energy transfer, relations,
  strategy-fitness EMA, war counts, and equal RNG draw counts.

## Calibration, numerical safety, and population cost

| Evidence                                     | Measured result                                                                                                                                      | Gate                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Ordinary action-matched calibration          | 7,680 vectors; action frequency `1.0`; nonzero magnitude min/median/max `0.001654 / 0.033484 / 0.080854`                                             | Bound by calibration SHA and 16 source replay hashes |
| Titan pooled-policy calibration              | 960 moves; cooperation rate `0.2125`                                                                                                                 | Bound by source-move SHA and content hash            |
| Shared/ordinary/predictor numerical campaign | 10,000 faulted steps; 0 violations; exact replay                                                                                                     | PASS                                                 |
| Petri numerical campaign                     | 10,000 faulted steps; 0 violations; exact replay                                                                                                     | PASS                                                 |
| Titan numerical campaign                     | 10,000 faulted steps; 0 violations; exact replay                                                                                                     | PASS                                                 |
| Ordinary population cost                     | Aggregate log-log slope `1.008909`; 50,000-entity incremental median `2.0491 ms`; worst recorded batch median `2.82825 ms`; 17 semantic bytes/entity | PASS, machine-local                                  |

The population-cost result gates only ordinary-organism claims. It is a measurement of this recorded
Windows machine and Bun run, not a universal hardware guarantee.

## Integrity receipt

- Receipt content SHA-256: `d3f838cabc73da309ae1e3a533b6c971edb7d186e1df81677a999900389e801e`
- Raw CSV SHA-256: `2f8de636571e118eaa48fe8c210fdc68120d11f838f7d541f62da1b559ae2240`
- Forest SVG file SHA-256: `3572556f726f69476b0f829de7f5e61dd2598cf0c14130ce04eb9d6c3f2dc999`
- Aggregate numerical trace SHA-256: `6c404cb3e288c147cb974afb54d0ad22b6a3f978209ce1d786e07e32de32c502`
- Numerical receipt content SHA-256: `5b3e4a9bc72f3253a9444c8e6a93a063f9b1a7e6910f755449b854463fbb521d`

## Claim boundary

V4 authorizes only **bounded game-policy semantic causality on the frozen Titan diplomacy task**. It
does not authorize a numeric score uplift, V4-over-V3 uplift, neural-capacity or pooled cross-family
scaling, consciousness, sentience, general intelligence, physical-quantum advantage, security, or
independent-replication claim. The ordinary, predictor, and Petri failures are productive falsification
evidence and remain visible in every artifact.
