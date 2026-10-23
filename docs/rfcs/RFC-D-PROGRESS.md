# RFC-D progress note

**Branch:** `feat/rfc-D-linear-alife-economy`  
**Status:** MVP v0 module ready for review; not yet adopted by Petri/HUD.

## Done

- `LinearResource` / `Inventory` / `transfer` / dual-hold guard
- Tests D1–D7 green
- Explicit non-goals in `docs/rfcs/RFC-D.md`

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
