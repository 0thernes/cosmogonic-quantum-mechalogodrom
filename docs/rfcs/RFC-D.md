# RFC-D (MVP v0): Linear resources in CQM (runtime no-clone bag)

**Status:** Implemented locally on `feat/rfc-D-linear-alife-economy`  
**Target repo:** `0thernes/cosmogonic-quantum-mechalogodrom`  
**Effort estimate:** Already small; inventory bag is a modest follow-on (hours)

## Intent

Give CQM a **runtime** linear bag for simulation resources (genes / payloads): move and consume are allowed; clone and wholesale `copy()` are rejected. This is an **economic / sim invariant**, not a cryptographic security claim and not a claim that Eshkol types enforce it yet.

## Precise model

- `LinearResource`: single-owner token; `consume()` retires it; second use throws.
- `moveLinearResource`: transfers ownership (source retired).
- `cloneLinearResource`: always throws (`no-cloning`).
- `Inventory`: holds resources; `copy()` throws; `take`/`put` move semantics.

## Non-goals

- No Eshkol LINEAR bridge in this MVP.
- No petri UI wiring required for merge.
- Not “quantum money” or real no-cloning physics — simulation law only.

## Acceptance

| ID | Criterion |
|----|-----------|
| D1 | clone throws |
| D2 | use-after-consume throws |
| D3 | move retires source |
| D4 | `Inventory.copy()` throws |

## Open questions

1. Tombstone spent ids for telemetry vs delete?
2. When (if ever) to gate harvest on Eshkol LINEAR?
