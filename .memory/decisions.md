# Decisions

Architectural commitments made in this project. The full rationale for each lives in `docs/adr/`.

## Load-bearing commitments

- **Determinism is the #1 law (ADR-0004).** One 32-bit seed ⇒ a bit-identical universe. In `src/sim/**`
  there is NO `Math.random` and NO `Date.now`/`performance.now` — all randomness flows through the
  injected seeded `Rng` (`src/math/rng.ts`, `mulberry32`) with golden-ratio XOR sub-streams
  (e.g. `econRng`, `superRng`, `soupRng`). The 300-frame population golden (`tests/determinism.test.ts`)
  pins this; any new draw on the entity spawn path must use a dedicated sub-stream or re-baseline the
  golden deliberately.
- **Runtime & stack:** Bun (ADR-0001), three.js / WebGL2 (ADR-0002), HTMX + Tailwind (ADR-0003),
  C++20 native sibling + optional Jolt (ADR-0007).
- **Not LLM.** The simulation intelligence is classical AI kernels, seeded neural nets, active
  inference, reservoir computing, and ported quantum-math — never token prediction. The only LLM in the
  repo is the OPTIONAL, sandboxed, secret-blind docs copilot (`src/server/*`), which lives entirely
  OUTSIDE the deterministic sim and cannot write sim state.
- **Math substrate is real (ADR-0005).** The Tsotchke ports (Eshkol AD, statevector QM, Clifford
  tableau, QGT/QNG, MPS-SVD, surface-code MWPM, Hopfield/Izhikevich, etc.) are genuine, cited
  implementations. Never label Tsotchke math "fake": it lacks only a QPU (speed, not correctness).
  The canonical symmetry math lives in `src/math/irrep.ts` (Racah CG, Wigner-d, and the 6j/9j
  recoupling symbols) and `src/math/mps-svd.ts` (real one-sided-Jacobi SVD) — call those, not
  approximate re-exports.
- **Heredity is wired in the soup (ADR-0009, Accepted 2026-06-24).** `PrimordialSoup` breeds reborn
  strains from two living parents via `genome.recombine` on its own `soupRng` sub-stream, so the
  entity golden is untouched. Entity/NHI-path heredity remains tracked follow-up work.

## Honesty discipline (Manhattan's law)

- "If it is not measured, it is not real." Published test/coverage numbers are policed by the
  **receipts law** (`scripts/verify-receipts.ts` + `tests/docs-receipts-law.test.ts`) against the single
  source of truth `scripts/canonical-receipts.ts`. To change them: run
  `bun scripts/verify-receipts.ts --print`, paste into `canonical-receipts.ts`, then propagate to the
  policed surfaces (README, ROADMAP, docs.html, specs.html, TECHNICAL-SPECIFICATION,
  NHSI-PROGRESS-DASHBOARD). Never hand-write a count that disagrees with measurement.
- The `docs-truth-law` test forbids NHSI overclaims and blanket `wiring=1.0` assertions; use the
  verified numbers / "path" framing.
