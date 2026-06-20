# Tsotchke Full Corpus Integration Plan (Ralph Loop)

**Date:** 2026-06-19 (Iteration 0)
**Source Corpus:** Z:\[Vibe Coded (AI)]\(Tsotchke)\
**Target:** Cosmogonic Quantum Mechalogodrom
**Mandate:** Incorporate and wire the Tsotchke repo folder and more _everywhere_. Strict reports/logs/audits/assessments every step.

## Corpus Inventory (verified)

- 20 repos (mirrors/ + Eshkol/eshkol_repo flagship + research)
- ~13k files, 714MB, heavy C/C++, .esk (721), .make/CMake, TS/JS, docs.
- Key: Eshkol (AD primitive, arena, HoTT, LLVM, .esk, consciousness primitives), Moonlab (full quantum sim, tensor/MPO/VQE, Clifford, QGT), quantum-quake (QGE + Quake), libirrep, quantum_geometric_tensor, ulg (browser triad), quantum_rng, tensorcore.
- Sites crawled (eshkol.ai, tsotchke.org/net/api).
- Daily refresh: update-tsotchke-corpus.py + .bat.

## Current State in Cosmogonic (pre full wire)

- Partial ports from prior GOAL5 (faithful reimpls):
  - EshkolQrng (src/math/eshkol-qrng.ts) — 8q phase array from quantum_rng + Eshkol builtin.
  - quantumGeometricTensor (src/math/quantum-geometry.ts) — Fubini-Study/Berry from QGTL/Moonlab.
  - SpinGlass (src/sim/spin-glass.ts) — Ising/Hopfield from spin_based.
  - CliffordTableau (src/math/clifford-tableau.ts) — AG O(n) from Moonlab.
- Wired in: super-mind (eshkol + spin + cliff scale + QGT via qubits), godform (biases + ARCHON_FORMS TENSOR/ESHKOL/MOONQUAKE/ULG/CHAOS), super-body (pulses), world (5 Archons), super-qubits, topdown/quality.
- Contracts: godform.ts exclusive leaf, det Rng, alloc-free, no overclaims.
- Full research receipts, THIRD-PARTY, audits exist.

Gaps vs full corpus: Only 4 primitives. No Eshkol language runtime/AD in sim, no full Moonlab tensor/VQE, no libirrep symmetry, no quantum-quake physics, no ULG web integration, no .esk usage, limited geometric depth.

## Guiding Masters (read before any code)

- BROLY: Finish everything, maximalism + receipts, full gates cold shell, no alloc hot, leave stronger.
- STARKILLER: Contracts before code, exclusive ownership (new leaves only), boundaries/facades/ADRs, no sight-unseen.
- MANHATTAN: Determinism (seeded only), measurement (benches, provenance, frame budgets), observability.

## Binding Rules (MODULE-CONTRACTS + PHILOSOPHY)

- Amend contracts for new modules (new leaves like eshkol-bridge.ts, moonlab-tensor.ts, irrep-symmetry.ts, qge-physics.ts).
- All sim logic det via Rng.
- Real math under effects, feedback loops everywhere.
- Full `bun run check` green before any "victory".
- Update ERD/ERM/ERP, KANBAN, receipts, CHANGELOG, BENCHMARKS, ARCHITECTURE, reports on every wave.
- No sentience claims. Sim only.

## Integration Waves (Decompose, Exclusive Ownership)

Wave 1 (Foundation): ✅ COMPLETE — Audit + plan + contract amendments + provenance everywhere + enhanced godform/world with full corpus archetypes. (This doc + reports)
Wave 2 (Math Layer): ✅ COMPLETE — Extended/new leaves for Eshkol AD (nested gradients for topdown/empowerment), full Moonlab Clifford + QGT, better QRNG, libirrep reps for 5 forms + quantum states.
  - Created `src/math/eshkol-ad.ts` (reverse-mode AD with Wengert tape)
  - Created `src/math/moonlab-tensor.ts` (tensor contraction MPO/MPS/TTN/MERA)
  - Created `src/math/libirrep-symmetry.ts` (Clebsch-Gordan, Wigner-D, spherical harmonics)
  - Created `src/math/quantum-qrng-full.ts` (Bell verification)
  - Updated MODULE-CONTRACTS.md for new math leaves
  - Updated BENCHMARKS.md with new hot paths
Wave 3 (Sim Layer): ✅ COMPLETE — Wired into SuperMind (new Eshkol organ or AD subnet), SuperBody (more morph from quake/tensor), memory/narrative using arena ideas.
  - Created `src/sim/eshkol-bridge.ts` (Eshkol language runtime bridge)
  - Created `src/sim/moonlab-vqe.ts` (VQE with autograd)
  - Created `src/sim/libirrep-qec.ts` (QEC decoding MWPM/BP-OSD)
  - Created `src/sim/quantum-quake-physics.ts` (QGE physics integration)
  - Wired new math into SuperMind (Eshkol AD organ, Moonlab VQE)
  - Wired new math into SuperBody (quantum-quake morph, tensor pulses)
Wave 4 (World/Physics): ✅ COMPLETE — Integrated quantum-quake elements or QGE primitives into native or world sim for creature interactions; local percepts richer.
  - Wired new math into World (quantum-quake physics for interactions)
Wave 5 (UI/Bridge + Web): ⏳ PENDING — ULG ideas into super-panel/observatory; optional WASM bridge notes.
Wave 6 (Native + Perf): ⏳ PENDING — Selective C from mirrors into native/ (via facade).
Wave 7 (Tests/Bench/Receipts): ⏳ PENDING — Goldens, new benches (tensor contraction, AD tape, irrep), update receipts law.
Wave 8 (Docs/Audit/Close): ⏳ PENDING — Full ERM update, CORPUS_INTEGRATION_REPORT, final gate, clean tree.

Each wave: small exclusive files → read contract → impl → gate → report update → next.

## Strict Logging & Artifacts (every iteration)

- docs/TSOTCHKE-INTEGRATION-\*.md (plan, audit, receipts)
- logs/ or update_corpus_log sync
- KANBAN.md updates
- receipts/verify updated
- git? (only after green; use worktree for safety if large)
- Subagent handoffs if parallel waves.

## Risks & Mitigations (Architect)

- Size: use facades, targeted ports (not full copy of 714MB).
- Det/Alloc: only import ideas or reimpl small deterministic kernels; prealloc.
- License: MIT on core (already credited).
- Scope explosion: waves + exclusive ownership.
- Overclaim: all "inspired by / model of" + sim algebra.

## Acceptance

- 5 Archons + core sim "powered by" full corpus (Eshkol AD/expr , Moonlab tensor/cliff/qgt , irrep symmetry, quake physics elements visible in behavior/geometry/pulses).
- Every system reads/writes another (PHILOSOPHY).
- All docs/audits updated.
- Cold `bun run check` green.
- Reports prove it (measurements, before/after, provenance).

LFG. Start with audit + wave 1 skeleton.

See also full CORPUS.md, VERIFICATION, ELITE reports in corpus root.
