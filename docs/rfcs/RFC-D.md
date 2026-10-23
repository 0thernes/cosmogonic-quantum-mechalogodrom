# RFC-D (MVP v0): Linear resources in CQM (runtime no-clone bag)

**Status:** On branch `feat/rfc-D-linear-alife-economy`  
**Target:** `0thernes/cosmogonic-quantum-mechalogodrom` → `main` (draft when Alex Submits)  
**Module:** `src/sim/economy/linear-resource.ts`

## Intent

A **runtime** linear bag for simulation payloads (genes / tokens): move and
consume allowed; clone and wholesale copy rejected. This is an **economic /
sim invariant**, not cryptography and not Eshkol LINEAR enforcement.

## Inventory API

| Symbol | Role |
|--------|------|
| `LinearResource` | Single-owner token; `consume()` retires |
| `Inventory.put` / `take` | Hold / release; dual-hold forbidden |
| `transfer(from, to, id)` | Move without clone; rejects self-transfer |
| `cloneLinearResource` | Always throws |
| `Inventory.copy` | Always throws |

## Acceptance (tests)

| ID | Criterion |
|----|-----------|
| D1 | clone throws |
| D2 | use-after-consume throws |
| D3 | move retires source |
| D4 | `Inventory.copy()` throws |
| D5 | dual-hold forbidden |
| D6 | `transfer` moves without clone |
| D7 | no structured-clone ownership fork |
| D8 | transfer-to-self forbidden |
| D9 | transfer missing id throws |
| + | forager home/field dual-hold (integration-ish) |

## Non-goals

- No Eshkol LINEAR bridge in this MVP.
- No Petri / HUD wiring (`superhero-hud.ts` relic strings are cosmetic, not ownership).
- Not “quantum money” or physical no-cloning — simulation law only.

## Docs on this branch

- `docs/rfcs/RFC-D-PROGRESS.md` — status + pass counts
- `docs/rfcs/PR_BODY.md` — draft PR text
- `docs/rfcs/CHANGELOG-RFC-D.md` — fragment
- `src/sim/economy/README.md` — module pointer
