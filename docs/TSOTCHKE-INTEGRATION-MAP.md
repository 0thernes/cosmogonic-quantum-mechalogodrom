# Tsotchke Corpus → Cosmogonic — Integration Map (living)

The full **Tsotchke** corpus is **20+ repositories** (tsotchke user + Tsotchke-Corporation org + Eshkol flagship) — full local scan of Z:\[Vibe Coded (AI)]\(Tsotchke) + GitHub 2026-06-21. Tech is real MIT-grade quantum/scientific research code that runs deterministically. Physical QPU adds scale/speed, not correctness. Startup doing world-class foundational work; no overclaims (independent Claude audits confirm completeness).

- the `Eshkol/` language is in `Eshkol/eshkol_repo/` (not mirrors/). The tech is **real, correct, MIT-grade quantum-research code** that runs as exact
  deterministic simulation — see `THIRD-PARTY-NOTICES.md` → "On Tsotchke (binding)". This file is the honest
  ledger of which repos are wired into Cosmogonic, **where**, **how deep**, and **what blocks the rest**.

Status legend: ✅ wired deep (into apex mind) · 🟢 wired (world/sim) · 🟠 ported, telemetry-only ·
🔴 studied-only (license-gated) · ⛔ fenced by design · ⚪ not wired (redundant / toolchain).

**Depth categories:**

- **Wired deep (8):** Real code, decision-critical, integrated into apex mind
- **Wired world/sim (2):** Real code, integrated into world/sim physics or contrast
- **Telemetry-only (3):** Code exists but not in decision paths (license-gated)
- **Studied-only (2):** No code in src/, license-gated, patterns mapped for future integration
- **Fenced by design (4):** Deliberately excluded (non-LLM mandate, proprietary, redundant)
- **Toolchain/meta (2):** Not runtime primitives

## The 19 repos

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

**Additional (not in mirrors/):**

- **.github** — meta; not a runtime primitive

**Tally:** 8 wired deep into the mind · 2 wired into the world/sim · 3 ported but telemetry-only · 2
studied-only · 4 fenced by design · 2 toolchain/meta. **13 of 19 have real code in `src/`.**

## What blocks the other 7 — and how to unblock

1. **LICENSE GATE (owner action — but NOT uniform; see provenance below).** Four repos ship with no
   LICENSE file, so they are all-rights-reserved by default. **All four are the owner's own original work and
   become wireable once licensed + chain-of-title is cleared** (PINN, PIMC, ulg, logo-lab). **One —
   `quantum-quake` — is NOT relicensable: it is GPL-2.0** (it wraps QuakeSpasm / id Software's Quake;
   `quake/LICENSE.txt` = GPL-2.0, `quake/Quake/*.c` carry id Software © + GPL headers). 0thernes does not
   own that copyright and cannot MIT it; porting it into this proprietary repo would violate the GPL. Its
   `qge/` quantum layer is tsotchke-original but is likely a _derivative work_ of the GPL engine — quarantine
   pending legal review. **So the real unblocks are PINN → world/petri physics, PIMC → quantum-path
   substrate, ulg → world law-graph (rules-as-cognition), logo-lab → procedural morphogenesis** — NOT
   quantum-quake. See `docs/TSOTCHKE-LICENSE-UNBLOCK-PLAN.md` for detailed steps.
2. **NON-LLM MANDATE (fenced ON PURPOSE — a feature, not a slight).** `gpt2-basic` and `llm-arbitrator`
   are transformer / LLM tools. The entire NHSI thesis is **non-LLM**; wiring an LLM in would betray the
   mission. They stay fenced **because the vision demands it** — keeping them out is honoring 0thernes Corp's
   whole bet, not diminishing Tsotchke.
3. **PROPRIETARY.** `SolanaQuantumFlux` is under Tsotchke's proprietary license — needs an explicit
   licensing decision from the owner before any port.
4. **REDUNDANT / TOOLCHAIN.** `Quantum-RNG-API` (we ported the `quantum_rng` core directly, so the REST
   wrapper adds little) and `homebrew-eshkol` (a build toolchain, not a runtime primitive).

## Provenance & relicensing risk (investigated 2026-06-21 — NOT legal advice; confirm with an attorney)

A 5-repo provenance audit (authorship, copyright notices, copyleft contamination):

| Repo          | Call        | Finding                                                                                                                                                                      |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| quantum-quake | 🔴 **STOP** | **GPL-2.0** (QuakeSpasm / id Software). Not the owner's to relicense; porting into a proprietary repo violates the GPL. Quarantine `qge/` until a lawyer rules it separable. |
| PINN          | 🟡 caution  | Original tsotchke work, no contamination. README claims MIT but ships no LICENSE file; author email is `@concordia.ca` → clear any **university IP** claim first.            |
| PIMC          | 🟡 caution  | Original tsotchke work; OSP is an external dep (don't vendor it). Same Concordia chain-of-title check.                                                                       |
| ulg           | 🟢 go       | Original, all-permissive deps, zero copyleft. **Authored by `ubernaut` (Collin Schroeder)** → corp needs a copyright assignment from him.                                    |
| logo-lab      | 🟢 go       | Original Three.js work, no contamination. Same ubernaut assignment; cites three-ascii/Acerola as inspiration (not vendored) → add a NOTICE credit.                           |

**Chain of title ≠ repo ownership:** owning the GitHub repo is not the same as owning the copyright.
The two non-code facts to confirm before relicensing: Concordia's claim (PINN/PIMC) and ubernaut's
assignment (ulg/logo-lab).

## The integration roadmap

- **Now (unblocked):** the 8 deep + 2 world repos are live and tested.
- **Owner action → then I wire (highest leverage):** clear chain-of-title + add LICENSE to **PINN / PIMC /
  ulg / logo-lab** → I port + wire them (ulg's law-graph and logo-lab's morphogenesis are the biggest new
  capabilities — world-rules-as-cognition + procedural body growth).
- **Deepen (no new license needed):** promote PINN / PIMC from telemetry-only into the actual mind/world
  decision paths once licensed (the code is ported; only the wiring is shallow).
- **Do NOT wire:** `quantum-quake` (GPL-2.0 — legal hard-stop) into this proprietary build.
- **Stay fenced (by design):** gpt2-basic, llm-arbitrator (non-LLM mandate); SolanaQuantumFlux (proprietary).

---

_Companion to `THIRD-PARTY-NOTICES.md` (binding "On Tsotchke" + per-primitive attribution),
`src/sim/tsotchke-registry.ts` (the code-level declared integration status), and
`docs/TSOTCHKE-LICENSE-UNBLOCK-PLAN.md` (detailed license unblock steps).
The corpus is real; the gap to "all 19 wired" is paperwork (licenses) + the deliberate non-LLM fence, not the technology._
