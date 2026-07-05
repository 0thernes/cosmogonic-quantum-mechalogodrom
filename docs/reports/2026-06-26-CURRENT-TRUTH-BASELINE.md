<!-- reviewed: 2026-07-01 | mega-audit receipt-drift fix | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Current Facts — Cosmogonic Quantum Mechalogodrom

**Date:** 2026-07-05 · canonical one-glance quick-reference.

Every report and doc in this repo reflects these measured values. They are propagated from
`scripts/canonical-receipts.ts` + `package.json` by `scripts/sync-surfaces.ts` and gate-enforced
(`bun run sync:check`, `bun run verify:receipts`). This is a single current-facts sheet, not an archive —
when the numbers change it is rewritten in place.

## Measured gate

| Fact          | Value                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Repo package  | `v0.20.0`                                                                                                                |
| Full gate     | `bun run check` green (2026-07-05)                                                                                       |
| Gate stages   | `format:check`, `typecheck`, `lint`, `verify:receipts` (test+coverage), `sync:check`, `verify:facts`, `build`            |
| Tests         | `1,984 tests` (published floor) · measured cold run `2270 pass / 0 fail` · `2,834,073 expect() calls` · `257` test files |
| Coverage      | `85.29 % line / 82.76 % function` (canonical measured headline; test count is a FLOOR, coverage enforced within ±6pp)    |
| Build         | `11` artifacts emitted to `dist/`                                                                                        |
| Single source | `scripts/canonical-receipts.ts` + `package.json`                                                                         |

## Claim baseline

| Claim area                | Truthful framing                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sentience / consciousness | **Not demonstrated, not claimed.** Butlin-style indicators are computational proxies only; the hard problem is untouched.                                                                                   |
| Butlin scorecard          | **8/14 met + 6/14 partial** — never "9/14", never "14/14 achieved".                                                                                                                                         |
| Faculties                 | **100-faculty design, ~30 genuinely deep-wired** into the apex `think()`; the rest are a generic-profile bias bank.                                                                                         |
| Archons                   | **25-Archon pantheon = 5 individuated apex minds + 20 live light-echo.**                                                                                                                                    |
| Emergence                 | **10 angles wired** (+ 5 god-scale release events — events, not additional angles).                                                                                                                         |
| Tsotchke                  | **20 corpus projects, ~16 wired** with real downstream effect. Real MIT quantum math (never "fake"); lacks only a physical QPU = a speed/scale limit, not correctness.                                      |
| NHSI / AGI / ASI          | Research target + architecture program, not achieved capability.                                                                                                                                            |
| Quantum advantage         | Not demonstrated; the Tsotchke quantum math is an exact classical simulation unless a physical QPU is added.                                                                                                |
| A-Life novelty            | Rare synthesis / plausible exact-conjunction (0 hard refutations in an 8-agent hunt); **not** first A-Life, digital evolution, morphogenesis, or artificial ecology. Novel by integration, not world-first. |
| SuperMind frame budget    | Millisecond-scale (see below). The old sub-millisecond / `<2%` 5-Archon claims are stale and not repeated.                                                                                                  |

## SuperMind benchmark

Measured 2026-07-02, Bun 1.3.x, Intel Core Ultra 9 275HX (`bun run bench`):

| Operation              | Full bench suite | Note                                    |
| ---------------------- | ---------------: | --------------------------------------- |
| `SuperMind.think()`    |    `1.99 ms` avg | ~12% of a 16.67 ms frame (lone apex)    |
| `SuperMind.snapshot()` |    `1.35 ms` avg | UI cadence only (BRAIN board open)      |
| `5× think()` batch     |    `9.77 ms` avg | staggered `driveSuper`; ~58% of a frame |

This supports an engineering-readiness claim, not a solved frame-budget claim for every GOAL5 scenario; the
`<2%` target is a remediation goal until a fresh benchmark proves it. `think()` improved from `3.34 ms`
(2026-06-26) after the memory-orchestra / QRC / curvature-QNG wiring passes.
