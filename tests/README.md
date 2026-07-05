# Tests

**1,984-test floor** (measured receipts in `scripts/canonical-receipts.ts`). Full strategy, taxonomy, and gate law: [docs/TEST-STRATEGY-2026-07-02.md](../docs/TEST-STRATEGY-2026-07-02.md).

## Run

```bash
bun test                  # full suite
bun test tests/rng.test.ts  # single file
bun run verify:receipts   # measure + enforce canonical count/coverage
bun run check             # full gate (format · tsc · lint · tests · sync · facts · build)
```

## Layout

| Area        | Pattern                                | Examples                                                                   |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Pure math   | `tests/*.test.ts` matching `src/math/` | `rng`, `scalar`, `quantum`, `irrep`                                        |
| Simulation  | `tests/*` matching `src/sim/`          | `super-mind`, `phyla`, `petri-*`, `tsotchke-*`                             |
| UI static   | lifecycle/ergonomics without DOM       | `ui-lifecycle-static`, `ui-ergonomics`, `help-knowledge`                   |
| Doc law     | receipt/link/truth gates               | `doc-links`, `docs-receipts-law`, `docs-truth-law`, `docs-consistency-law` |
| Determinism | golden + same-seed                     | `determinism`, `feature-determinism`, `drivesuper-determinism`             |
| Benchmarks  | `bench/*.bench.ts`                     | `bun run bench` (not part of `bun test` gate count)                        |

## Conventions

- All sim randomness via seeded `Rng` — `Math.random` / `Date.now` banned in sim logic.
- Prefer property/invariant tests over trivial asserts.
- Doc surfaces are gate-policed; never hand-edit synced version/test/coverage tokens — run `bun run sync`.
