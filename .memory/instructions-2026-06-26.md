<!-- reviewed: 2026-06-26 | repo-wide consistency + correctness audit; canonical facts in docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Instructions

How Copilot / AI collaborators should behave in this project.

## Before you change anything

1. Read `AGENTS-2026-06-26.md` / `CLAUDE.md` (operating contract) and the relevant `docs/adr/*`.
2. Treat the **2026-06-21 NHSI HONESTY-AUDIT** as the canonical status of record. When a doc and the
   audit disagree on a number, the audit wins.
3. Run the gate locally before claiming done: `bun run check`
   (= format:check → typecheck → lint → test → verify:receipts → build).

## Hard rules (never violate)

- **Determinism:** no `Math.random` / `Date.now` / `performance.now` in `src/sim/**`. Use the injected
  `Rng`. If you add an `Rng` draw to the entity spawn path, you WILL break the 300-frame golden — use a
  dedicated sub-stream or re-baseline deliberately and say so.
- **Allocation-free hot paths:** per-frame `update`/`step`/`sync` code must not allocate. Use module
  scratch, typed SoA buffers, and partial GPU uploads (`addUpdateRange`). Reproduction events (a few
  per second) may allocate; per-frame loops may not.
- **Strict TypeScript:** no `any`, no `@ts-ignore`/`@ts-nocheck`, honor `noUncheckedIndexedAccess`
  (guard index access, do not cast it away).
- **No overclaiming.** Do not write "100% / gate-for-gate REAL / fully wired / 14-14 achieved" unless a
  test measures it. Label proxies as proxies (`phiSurrogate`, GWT "ignition", consciousness composite).
- **Numbers come from measurement.** Update `scripts/canonical-receipts.ts`, never hand-edit counts.

## When you finish

- Keep diffs logically grouped with conventional-commit messages.
- If you changed behavior intentionally, update the affected goldens AND say why in the commit.
- If you removed code that looked like dead "corpus wiring," confirm it was genuinely `void`-discarded
  (no effect on any return) before deleting — load-bearing terms (`acc += …`) change output.
