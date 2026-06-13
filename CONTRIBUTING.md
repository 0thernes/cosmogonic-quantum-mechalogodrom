# Contributing

Thanks for poking at the Mechalogodrom. The bar is simple: keep it
deterministic, keep the hot paths allocation-free, and keep `bun run check`
green.

## Prerequisites

- [Bun](https://bun.sh) >= 1.3 (runtime, bundler, and test runner — there is no
  Node/webpack/vitest setup here; see
  [ADR 0001](./docs/adr/0001-bun-runtime.md)).

## Workflow

```sh
bun install        # install dependencies
bun dev            # hot-reloading server at http://localhost:3000
bun test           # unit tests
bun run bench      # mitata micro-benchmarks
bun run check      # THE gate: format:check + typecheck + lint + test + build
```

`bun run check` must pass before any PR is mergeable. CI runs the same
command, so running it locally is the fastest feedback you can get.

## Ground rules

These mirror the binding spec in
[docs/MODULE-CONTRACTS.md](./docs/MODULE-CONTRACTS.md) — read it before
touching module boundaries.

1. **Source of truth.** The legacy monolith at
   `legacy/cosmogonic-quantum-mechalogodrom.html` defines intended behavior.
   Port faithfully — same constants, same magic numbers, same feel — unless the
   Known Bugs table in the contract mandates a fix.
2. **Style.** Prettier: 100 columns, single quotes, semicolons, trailing
   commas, 2-space indent. `bun run format` before committing.
3. **TypeScript.** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
   `noUnusedParameters`, `verbatimModuleSyntax`. No `any` (use `unknown` and
   narrow). No `@ts-ignore` / `@ts-expect-error`. Non-null `!` only with a
   one-line invariant comment.
4. **Imports.** Extensionless relative imports (`../math/rng`).
   `import * as THREE from 'three'` (modern 0.184 API — r128-era calls like
   `BufferAttribute.updateRange` are gone; use
   `clearUpdateRanges()` / `addUpdateRange()`). Type-only imports use
   `import type`.
5. **Determinism.** The sim never calls the global random number generator.
   All randomness flows through the injected seeded `Rng`
   (`SimContext.rng` or a constructor argument). Same seed, same universe —
   this is what makes tests assertable and benchmarks stable
   ([ADR 0004](./docs/adr/0004-deterministic-rng.md)).
6. **Hot paths are allocation-free.** No `new`, array literals, closures, or
   string building inside per-frame `update()` bodies. Use documented
   module-level scratch objects. If you add a hot path, document its time
   complexity in JSDoc (see [docs/COMPLEXITY.md](./docs/COMPLEXITY.md)).
7. **Layering.** Browser globals only in `src/ui`, `src/core/engine.ts`,
   `src/audio/engine.ts`, `src/logging/audit.ts`, `src/memory/store.ts`, and
   `src/main.ts`. Leaf modules (`src/math/*`, `src/logging/logger.ts`,
   `src/memory/*`, `src/sim/constants.ts`, `src/audio/songs.ts`) must run
   under `bun test` with no DOM and must not import `src/types.ts` at runtime
   (`import type` is fine).
8. **JSDoc every export.** Hot-path functions state their big-O.

## Tests and benchmarks

- Tests live in `tests/` and run with `bun test`. Pure logic (math,
  algorithms, morphotypes, constants, songs data) must be testable without a
  DOM; browser-leaning modules use small shims (Map-backed `localStorage`,
  stubbed `fetch`).
- Benchmarks live in `bench/` and use [mitata](https://github.com/evanwashere/mitata)
  with deterministic inputs (`mulberry32(42)`). Don't benchmark against
  `Math.random()`-generated data — results won't be comparable across runs.

## Pull requests

- Keep diffs focused; one concern per PR.
- Explain _why_ in the description, especially for anything that changes a
  legacy constant or visual behavior.
- If a change alters a module's public surface, update
  `docs/MODULE-CONTRACTS.md` and the diagrams in `docs/ARCHITECTURE.md` /
  `docs/ERD.md` in the same PR.
- Add a `CHANGELOG.md` entry under `[Unreleased]` (Keep a Changelog format).

## Contributions & ownership

This project is **proprietary — All Rights Reserved** (see [LICENSE](./LICENSE)).
It is source-available, not open-source. By submitting any contribution
(code, docs, assets, or ideas) you assign all right, title, and interest in
that contribution to the Author (0thernes) and confirm it is your original
work, free of third-party claims. If you cannot assign those rights, do not
submit the contribution. Contributions are accepted at the Author's sole
discretion. For commercial-use, redistribution, or relicensing inquiries,
contact **0_0@0thernes.art**.
