# RFC-D progress note

**Branch:** `feat/rfc-D-linear-alife-economy`  
**Status:** MVP v0 module ready for review; not yet adopted by Petri/HUD.  
**Last test run:** 2026-10-22 (America/Los_Angeles) — **11 pass / 0 fail** via `bun run test:linear-economy`
(`rfc-d-linear-economy.test.ts` D1–D9 + `rfc-d-agent-dual-hold.test.ts`).

## Done

- `package.json` script alias `test:linear-economy` → economy unit tests (preferred over Petri/HUD wiring this slice)
- `LinearResource` / `Inventory` / `transfer` / dual-hold + self-transfer guards
- Tests D1–D9 + forager home/field green
- `docs/rfcs/RFC-D.md` sober MVP summary + Inventory API table
- `PR_BODY.md` / `CHANGELOG-RFC-D.md` for Submit quality

## Why HUD strings are not ownership

`src/ui/superhero-hud.ts` uses a cosmetic `INVENTORY = ['◈', …]` string list
for relic glyphs. Those are **not** `LinearResource` tokens and must not be
treated as quantum/economic ownership. Wiring them would be a product decision,
not part of this MVP.

## Petri

No single obvious call site adopts `transfer()` without a broader rewrite of
agent payload handling. Deferred on purpose — keep this PR small.

## Next (optional, later)

- One Petri trade demo using `transfer`
- Optional harvest gate vs Eshkol LINEAR (separate RFC)
- Open draft PR when Alex is ready (do not re-spam create_pr)
