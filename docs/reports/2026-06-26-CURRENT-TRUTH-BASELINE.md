# Current Truth Baseline For Restored Reports

**Date:** 2026-06-26  
**Canonical location:** `docs/reports/` inside the Git repository  
**Non-canonical source folder:** `C:\Users\Alexa\Downloads\COSMOGONIC REPORTS`

This file is the current-state guardrail for the restored dated report archive. The older reports remain
valuable as point-in-time research and strategy snapshots, but their body text must not be read as current
where it conflicts with this baseline or with the live repo gates.

## Current Measured Baseline

| Fact               | Current verified value                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Repo package       | `v0.18.0`                                                                                 |
| Full gate          | `bun run check` passed on 2026-06-26                                                      |
| Gate stages        | `format:check`, `typecheck`, `lint`, `bun test`, `verify:receipts`, `sync:check`, `build` |
| Test result        | `1477 pass`, `0 fail`, `1744891 expect() calls`, `151` test files                         |
| Coverage receipt   | `95.18%` line, `92.13%` function                                                          |
| Build result       | `7` artifacts emitted to `dist/`                                                          |
| Public sync source | `scripts/canonical-receipts.ts`                                                           |

## Current Scientific / Claim Baseline

| Claim area                | Current truthful framing                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Sentience / consciousness | **Not demonstrated. Not claimed.** Butlin-style indicators are computational proxies only.                                             |
| Butlin scorecard          | **8/14 met + 6/14 partial**, not "14/14 achieved."                                                                                     |
| NHSI / AGI / ASI          | Research target and architecture program, not achieved capability.                                                                     |
| Quantum advantage         | Not demonstrated; Tsotchke-derived quantum math is classically simulated unless a physical QPU is added.                               |
| A-Life novelty            | Rare synthesis and plausible exact-conjunction novelty; **not** first A-Life, digital evolution, morphogenesis, or artificial ecology. |
| GOAL5 / SuperMind budget  | Old sub-millisecond and `<2%` 5-Archon frame-budget claims are stale. Current live benches show millisecond-scale costs.               |

## Current SuperMind Benchmark Baseline

Measured on 2026-06-26, Bun 1.3.14, Intel Core Ultra 9 275HX:

| Operation              | Full bench suite | Focused `bench/super-mind.bench.ts` |
| ---------------------- | ---------------: | ----------------------------------: |
| `SuperMind.think()`    |    `3.34 ms` avg |                       `8.85 ms` avg |
| `SuperMind.snapshot()` |    `2.44 ms` avg |                       `6.89 ms` avg |
| `5x think()` batch     |   `14.47 ms` avg |                      `25.40 ms` avg |

The current evidence supports an engineering-readiness claim, not a solved frame-budget claim for every
GOAL5 scenario. Treat the `<2%` GOAL5 target as a remediation target until a new benchmark proves it again.

## Reading Rule

When a restored historical report says `v0.11.0`, `v0.16.1`, `1174 tests`, `1730 tests`, `1514 tests`,
`~9/14`, `14/14 achieved`, `~289 us`, `~443 us`, `266 us`, or `<2%`, read that as a historical measurement
or historical overclaim. The current baseline above supersedes it.
