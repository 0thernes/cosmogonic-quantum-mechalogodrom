<!-- reviewed: 2026-07-02 | mega-audit PM-artifact gap-fill | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Test Strategy

**Living document.** How this repo tests, what "covered" means, and where the edges are — so the
`1,984`-test suite is a designed thing, not an accretion. Canonical receipts live in
[VERIFICATION-ANALYTICAL-DATA.md](./VERIFICATION-ANALYTICAL-DATA.md); this is the _approach_.

## 1 · The receipts law (the spine)

If it is not measured, it is not real. `scripts/verify-receipts.ts` parses the real
`bun test --coverage` transcript and fails the gate on drift from `scripts/canonical-receipts.ts`
(the single source of truth). It is **impossible to ship a test-count or coverage figure that was not
measured** — the number in every doc is propagated from canon by `sync-surfaces.ts`.

- **Test count** is a **FLOOR** (`1,984`), not an exact pin: `bun test` runs every `*.test.ts` in the
  working tree, so a file-rich checkout measures more (2,104 on 2026-07-01). The gate floors against
  `min(canon, PORTABLE_TEST_FLOOR=1400)` so a lean CI checkout can never red on count.
- **Coverage** is enforced within an explicit **±6 pp** band (Bun instruments a slightly different file
  set locally vs CI). Current canon: **83.95 % line / 81.57 % function**. No bare float `===`.

## 2 · Test taxonomy

| Layer                    | What it proves                                                       | Examples                                                                                        |
| ------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Unit**                 | A pure function returns the right value                              | `scalar`, `rng`, `spatial-hash`, most of `src/math`                                             |
| **Property**             | An invariant holds over many inputs                                  | `nan-stability` (Lorenz stays finite), Clifford entanglement entropy (Bell=1, product=0, GHZ=1) |
| **Golden / determinism** | Same seed → bit-identical output                                     | same-seed world replay; RNG stream identity                                                     |
| **Numerical-edge**       | The advertised hard case is correct                                  | `irrep` Wigner-6j sign at j≥7 (log-space); SVD tolerance guards                                 |
| **Integration**          | Systems compose (world builds, faculties step, no NaN)               | apex `think()` runs a full beat; pantheon double-beat regression                                |
| **Contract / doc**       | Docs match code (links resolve, receipts consistent, encoding clean) | `doc-links`, `docs-receipts-law`, `docs-consistency-law`                                        |
| **Static / UI**          | Lifecycle + ergonomics without a DOM                                 | `ui-lifecycle-static`, `ui-ergonomics`                                                          |

## 3 · Determinism is a test target, not an assumption

All sim randomness flows through seeded `Rng` (`src/math/rng.ts`); `Math.random`/`Date.now` are banned in
sim logic and grep-enforced. Determinism tests assert **bit-identical** same-seed runs and that
stagger/LOD gates never gate an RNG draw (a skipped draw would desync the stream). This is the property
that makes every other claim reproducible.

## 4 · Owner-critical regression layer

`ci.yml` pins a set of named feature test files (the "owner-critical" layer) that must pass on every push
— the features whose silent breakage would be worst (GPU dispose, apex determinism, Tsotchke wiring,
sandbox security). New load-bearing features add their falsifiable test here.

## 5 · Coverage goals & known edges

- **Target:** hold ≥ 92% line / ≥ 89% function (the current floor); raise only with real tests, never by
  deleting hard-to-cover code.
- **Deliberately thin (accepted):** WebGL draw paths and shader compilation are exercised by headless
  smoke + static lifecycle tests, not pixel assertions (no GPU in CI). Browser interaction is smoke-only.
- **Gaps (tracked, see [RISK-REGISTER-2026-07-02.md](./RISK-REGISTER-2026-07-02.md)):** no e2e/Playwright
  input+WebGL gate; no perf-regression time-series. Both are P1 CI items.

## 6 · How to add a test (the rule)

Every substantive change lands with a **falsifiable** test that would fail if the change regressed —
prove disposal with a `spyOn(THREE.Material.prototype,'dispose')` + `count→0`, prove a fix with the exact
input that used to break. Comment-theater ("Ralph 10×") is not a test. `bun run check` must be green.

## 7 · Run commands and layout

```bash
bun test                  # full suite
bun test tests/rng.test.ts  # single file
bun run verify:receipts   # measure + enforce canonical count/coverage
bun run check             # full gate (format · tsc · lint · tests · sync · facts · build)
```

| Area        | Pattern                                | Examples                                                                   |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Pure math   | `tests/*.test.ts` matching `src/math/` | `rng`, `scalar`, `quantum`, `irrep`                                        |
| Simulation  | `tests/*` matching `src/sim/`          | `super-mind`, `phyla`, `petri-*`, `tsotchke-*`                             |
| UI static   | lifecycle/ergonomics without DOM       | `ui-lifecycle-static`, `ui-ergonomics`, `help-knowledge`                   |
| Doc law     | receipt/link/truth gates               | `doc-links`, `docs-receipts-law`, `docs-truth-law`, `docs-consistency-law` |
| Determinism | golden + same-seed                     | `determinism`, `feature-determinism`, `drivesuper-determinism`             |
| Benchmarks  | `bench/*.bench.ts`                     | `bun run bench` (not part of `bun test` gate count)                        |
