<!-- Thanks for contributing to Cosmogonic Quantum Mechalogodrom. Keep PRs small and focused. -->

## What & why

<!-- One or two sentences: what does this change and what problem does it solve? Link issues. -->

Closes #

## Type of change

- [ ] 🐛 Bug fix (correctness / determinism / NaN-stability)
- [ ] ✨ Feature (new sim system, UI, or analytics)
- [ ] ⚡ Performance (complexity or allocation improvement — include before/after)
- [ ] 📚 Docs only
- [ ] 🔧 Build / CI / tooling

## The gate

<!-- CI runs `bun run check` (prettier → tsc --strict → oxlint → bun test → build). Confirm locally. -->

- [ ] `bun run check` passes locally (format, types, lint, tests, build)
- [ ] New behaviour is covered by tests; determinism-sensitive code has a seeded test
- [ ] No `Math.random` / `Date.now()` in sim logic (seeded `mulberry32` via `SimContext` only)
- [ ] Per-frame `update()` bodies stay allocation-free (module scratch only) — see docs/COMPLEXITY-2026-06-26.md
- [ ] Touched modules' JSDoc + `docs/MODULE-CONTRACTS.md` updated if the contract changed
- [ ] If a hot path's Big-O changed, `docs/COMPLEXITY-2026-06-26.md` (and `bench/` if applicable) updated

## Notes for the reviewer

<!-- Trade-offs, follow-ups, anything you want eyes on. Screenshots/clips welcome for visual changes. -->
