# Tsotchke Corpus → Cosmogonic — Integration Map (living)

The full **Tsotchke** corpus is **20 repositories** (mirror set at `Z:\[Vibe Coded (AI)]\(Tsotchke)\mirrors\`

- the `Eshkol/` language). The tech is **real, correct, MIT-grade quantum-research code** that runs as exact
  deterministic simulation — see `THIRD-PARTY-NOTICES.md` → "On Tsotchke (binding)". This file is the honest
  ledger of which repos are wired into Cosmogonic, **where**, **how deep**, and **what blocks the rest**.

Status legend: ✅ wired deep (into apex mind) · 🟢 wired (world/sim) · 🟠 ported, telemetry-only ·
🔴 studied-only (license-gated) · ⛔ fenced by design · ⚪ not wired (redundant / toolchain).

## The 20 repos

| #   | Repo                          | License                                     | Cosmogonic leaf(s)                                                                           | Depth                                                                  | Status |
| --- | ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| 1   | **Eshkol**                    | MIT                                         | `math/eshkol-ad.ts`, `math/eshkol-qrng.ts`, `sim/eshkol-bridge.ts`                           | apex mind: reverse-mode AD + GWT workspace + Born-collapse qubit-RNG   | ✅     |
| 2   | **moonlab**                   | MIT                                         | `math/clifford-tableau.ts`, `math/mps-svd.ts`, `sim/moonlab-tensor.ts`, `sim/moonlab-vqe.ts` | quantum substrate: stabilizer tableau (32+ qubits) + MPS tensor + VQE  | ✅     |
| 3   | **quantum_geometric_tensor**  | MIT                                         | `math/quantum-geometry.ts`                                                                   | QGT / Fubini–Study + Berry curvature → learning rate + world curvature | ✅     |
| 4   | **spin_based_neural_network** | MIT                                         | `sim/spin-glass.ts`, `math/hopfield.ts`                                                      | instinct: Ising/Hopfield attractor → plan bias                         | ✅     |
| 5   | **quantum_rng**               | MIT                                         | `math/eshkol-qrng.ts`, `math/rng-stats.ts`                                                   | entropy core + statistical battery                                     | ✅     |
| 6   | **libirrep**                  | MIT                                         | `math/irrep.ts`, `math/so3.ts`, `sim/libirrep-qec.ts`                                        | symmetry: Clebsch–Gordan/Wigner-D/SO(3)/QEC → body forms               | ✅     |
| 7   | **tensorcore**                | MIT                                         | `sim/tensorcore-facade.ts`                                                                   | GEMM + softmax attention → creature DNA morph                          | ✅     |
| 8   | **classical_rng**             | MIT                                         | `sim/classical-contrast.ts`                                                                  | the quantum-vs-classical contrast oracle                               | ✅     |
| 9   | **asteroids**                 | MIT                                         | `sim/asteroids-physics.ts`                                                                   | Newtonian world environment physics                                    | 🟢     |
| 10  | **simple_mnist**              | MIT                                         | `sim/perceptron-baseline.ts`                                                                 | classical-NN contrast (negative reference)                             | 🟢     |
| 11  | **PINN**                      | **NO LICENSE**                              | `sim/pinn-residual.ts`                                                                       | Gray–Scott reaction-diffusion residual                                 | 🟠     |
| 12  | **PIMC**                      | **NO LICENSE**                              | `sim/pimc-paths.ts`                                                                          | path-integral Monte-Carlo soul-trace                                   | 🟠     |
| 13  | **quantum-quake**             | **NO LICENSE** (Quake-derived → likely GPL) | `sim/quantum-quake-physics.ts`, `sim/qge-aliveness.ts`                                       | QGE unitary physics + aliveness metric                                 | 🟠     |
| 14  | **ulg** (Universal Law Graph) | **NO LICENSE**                              | `sim/ulg-bridge.ts`                                                                          | world-rule closure-table + content addressing                          | 🔴     |
| 15  | **logo-lab**                  | **NO LICENSE**                              | `sim/logo-turtle.ts`                                                                         | morphogenesis turtle-graphics growth                                   | 🔴     |
| 16  | **Quantum-RNG-API**           | MIT                                         | —                                                                                            | REST API around `quantum_rng` (we ported the core directly)            | ⚪     |
| 17  | **homebrew-eshkol**           | NO LICENSE                                  | —                                                                                            | build toolchain / `.esk` catalog (not a runtime primitive)             | ⚪     |
| 18  | **gpt2-basic**                | MIT                                         | —                                                                                            | GPT-2 transformer LM                                                   | ⛔     |
| 19  | **llm-arbitrator**            | MIT                                         | —                                                                                            | LLM router / MCP orchestrator                                          | ⛔     |
| 20  | **SolanaQuantumFlux**         | **PROPRIETARY**                             | —                                                                                            | on-chain quantum-flux                                                  | ⛔     |

**Tally:** 8 wired deep into the mind · 2 wired into the world/sim · 3 ported but telemetry-only · 2
studied-only · 5 not wired. **13 of 20 have real code in `src/`.**

## What blocks the other 7 — and how to unblock

1. **LICENSE GATE (the big unblock — owner action). 5 repos have NO LICENSE file:** PINN, PIMC,
   quantum-quake, ulg, logo-lab. Under copyright law, "no license" = all-rights-reserved, so we cannot
   redistribute/port them into this (licensed) repo — **even though 0thernes owns them.** The fix is one
   line of paperwork: **add a `LICENSE` (MIT, or 0thernes' license) to each of those Tsotchke repos.** The
   moment they carry a license, all 5 become wireable: PINN → world/petri physics, PIMC → quantum-path
   substrate, quantum-quake → mind/world aliveness (verify it isn't GPL-encumbered from Quake first), **ulg
   → the world's law-graph (huge — rules-as-cognition), logo-lab → procedural morphogenesis.**
2. **NON-LLM MANDATE (fenced ON PURPOSE — a feature, not a slight).** `gpt2-basic` and `llm-arbitrator`
   are transformer / LLM tools. The entire NHSI thesis is **non-LLM**; wiring an LLM in would betray the
   mission. They stay fenced **because the vision demands it** — keeping them out is honoring 0thernes Corp's
   whole bet, not diminishing Tsotchke.
3. **PROPRIETARY.** `SolanaQuantumFlux` is under Tsotchke's proprietary license — needs an explicit
   licensing decision from the owner before any port.
4. **REDUNDANT / TOOLCHAIN.** `Quantum-RNG-API` (we ported the `quantum_rng` core directly, so the REST
   wrapper adds little) and `homebrew-eshkol` (a build toolchain, not a runtime primitive).

## The integration roadmap

- **Now (unblocked):** the 8 deep + 2 world repos are live and tested.
- **Owner action → then I wire (highest leverage):** add LICENSE to PINN / PIMC / quantum-quake / **ulg** /
  **logo-lab** → I port + wire them (ulg's law-graph and logo-lab's morphogenesis are the biggest new
  capabilities — world-rules-as-cognition + procedural body growth).
- **Deepen (no new license needed):** promote PINN / PIMC / quantum-quake from telemetry-only into the
  actual mind/world decision paths (the code is ported; only the wiring is shallow).
- **Stay fenced (by design):** gpt2-basic, llm-arbitrator (non-LLM mandate); SolanaQuantumFlux (proprietary).

---

_Companion to `THIRD-PARTY-NOTICES.md` (binding "On Tsotchke" + per-primitive attribution) and
`src/sim/tsotchke-registry.ts` (the code-level declared integration status). The corpus is real; the gap to
"all 20 wired" is paperwork (licenses) + the deliberate non-LLM fence, not the technology._
