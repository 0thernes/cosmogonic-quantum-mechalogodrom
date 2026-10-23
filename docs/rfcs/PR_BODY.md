# RFC-D: Linear resource / Inventory MVP v0

**Branch:** `feat/rfc-D-linear-alife-economy`  
**Target:** `main`  
**Draft:** yes

## Summary

Adds a small runtime linear bag for simulation payloads:

- `LinearResource` / `Inventory` / `transfer`
- Dual-hold forbidden (a token sits in at most one inventory)
- `cloneLinearResource` and `Inventory.copy` throw
- Self-transfer and empty-id transfer rejected

This is a **sim / economic invariant**, not a cryptography or physics claim.

## Tests

- `tests/rfc-d-linear-economy.test.ts` — D1–D9
- `tests/rfc-d-agent-dual-hold.test.ts` — forager home/field dual-hold

## Non-goals (explicit)

- No Petri/HUD wiring in this PR (`superhero-hud.ts` relic strings are cosmetic, not ownership)
- No Eshkol LINEAR bridge
- No crypto / capability tokens

## Docs

- `docs/rfcs/RFC-D.md`
- `docs/rfcs/RFC-D-PROGRESS.md`
- `src/sim/economy/README.md`

## Checklist

- [x] Green unit tests for no-clone / dual-hold / transfer
- [x] Progress note explains why HUD is out of scope
- [ ] Reviewer: confirm no accidental Petri rewrite
