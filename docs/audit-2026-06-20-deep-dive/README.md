# Tsotchke ↔ Cosmogonic Deep-Dive Audit (2026-06-20)

**See also the ULTIMATE report: [TSOTCHKE-ULTIMATE-COMPREHENSIVE-AUDIT-REPORT-ASSESSMENT-2026-06-20.md](../TSOTCHKE-ULTIMATE-COMPREHENSIVE-AUDIT-REPORT-ASSESSMENT-2026-06-20.md)** — live GH MCP research on all 20+ repos (Eshkol flagship, Moonlab, libirrep, tensorcore, ulg, logo-lab + exact wiring), full deductive/inductive analysis, compare/contrast, Petri thesis, and master plan. Local == GH. All docs synced.

Measured census of the local Tsotchke corpus `Z:\[Vibe Coded (AI)]\(Tsotchke)` and Cosmogonic
repo, captured for wiring receipts. **Not LLM territory** — digital biologic substrates only.

## Tsotchke corpus (12,444 files · ~501 MB · 3.87M text lines)

| Category             | Files | Text lines |
| -------------------- | ----- | ---------- |
| eshkol-language-core | 1,410 | 390,752    |
| mirror:logo-lab      | 1,816 | 1,252,157  |
| mirror:moonlab       | 3,478 | 331,418    |
| mirror:libirrep      | 1,510 | 154,434    |
| mirror:quantum-quake | 805   | 310,392    |

721 `.esk` programs in Eshkol. See `tsotchke-category-summary.csv` for full breakdown.

## Cosmogonic wiring (20 mirrors → sim leaves)

All **20** GitHub mirrors bind to exclusive `src/sim/*` or `src/math/*` leaves via
`tsotchke-corpus.ts` + `tsotchke-registry.ts`. Four repos remain **fenced** from deterministic
sim (gpt2-basic, llm-arbitrator, SolanaQuantumFlux, Quantum-RNG-API).

New dedicated leaves (this pass): `logo-turtle.ts`, `asteroids-physics.ts`,
`classical-contrast.ts`, `perceptron-baseline.ts`, `corpus-audit-receipts.ts`.

Petri dish + primordial soup consume PINN, PIMC, logo-lab, asteroids, classical contrast,
and perceptron tagging on every Archon beat.

## Artifacts in this folder

- `tsotchke-*.csv` — corpus file/directory/extension ledgers
- `cosmogonic-*.csv` — Cosmogonic repo census
- `tsotchke-nested-git-status.txt` — nested mirror git cleanliness

Receipt constants: `src/sim/corpus-audit-receipts.ts`.
