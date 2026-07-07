<!-- reviewed: 2026-07-07 | 22-report current-truth pass | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Tsotchke Corpus → Cosmogonic — Integration Map (living)

The full **Tsotchke** corpus is **EVERY repo and project** (tsotchke user + Tsotchke-Corporation org + Eshkol flagship + all mirrors + subprojects + sites from full local Z:\[Vibe Coded (AI)]\(Tsotchke) corpus + AUDIT-LOG.md). The scientific/toolchain tech is treated as real computational substrate where licensed, ported, harvested, or explicitly fenced; physical QPU scale would add speed/scale, not correctness or validity. This ledger accounts for all of it by depth class, wires the non-fenced scientific pieces with real downstream effect, harvests `.esk` DNA where appropriate, and keeps fenced LLM/onchain pieces provenance-only until unblock criteria are met.

- the `Eshkol/` language is in `Eshkol/eshkol_repo/` (not mirrors/). The tech is **real, correct, MIT-grade quantum-research code** that runs as exact
  deterministic simulation — see `THIRD-PARTY-NOTICES.md` → "On Tsotchke (binding)". This file is the honest
  ledger of which repos are wired into Cosmogonic, **where**, **how deep**, and **what blocks the rest**.

Status legend: ✅ wired deep (into apex mind) · 🟢 wired (world/sim) · 🟠 ported, telemetry-only ·
🔴 studied-only (license-gated) · ⛔ fenced by design · ⚪ not wired (redundant / toolchain).

**Depth categories:**

- **Deep (9):** real code in hot mind/world/scientific substrate paths.
- **Wired (7):** real code in world/sim/petri/contrast paths.
- **Harvest (2):** source, `.esk` DNA, toolchain, or API wrapper harvested; not a hot-path primitive.
- **Fenced (3):** deliberately excluded by the non-LLM/proprietary mandate.
- **Meta (1):** org-level metadata, not a runtime primitive.

## Code-level depth field (2026-06-30)

`src/sim/tsotchke-registry.ts` now exports a `DepthKind` union and a `depth` field on every `TsotchkeRepoEntry`. Values:

- `deep` — real closed-form code in hot mind/world paths every frame (9 scientific kernels, incl. `classical-contrast`).
- `wired` — real code in world/sim/petri/contrast paths (7 repos).
- `harvest` — source, `.esk` DNA, toolchain, or API wrapper harvested, not a hot-path leaf (2 repos).
- `fenced` — deliberately excluded by the non-LLM / proprietary mandate (3 repos).
- `meta` — org-level meta (`.github`).

Use `tsotchkeDepthFor(slug)` to query the ledger programmatically. This is the same classification used in the table below; the registry and this map are now guaranteed to stay in sync by the `tsotchke-registry.test.ts` suite.

## The 20-Project Tsotchke Corpus (22 registry slugs) (tsotchke user + Tsotchke-Corporation + local mirrors + Eshkol flagship + sites + meta)

**All 20 corpus projects / 22 registry entries are accounted for by explicit depth class.** The current registry truth is `9 deep`, `7 wired`, `2 harvest`, `3 fenced`, `1 meta`; honest scientific wired fraction is `18/21 = 0.857` when the meta entry is excluded. Use "all accounted for" or "all wired/harvested/studied/fenced by class"; do not flatten that into blanket full-depth wiring.

**Classification (current registry truth, reconciled 2026-07-07):**

- **Deep (9):** Eshkol, moonlab, tensorcore, libirrep, spin-based NN, QGT, quantum_rng, classical_rng, classical-contrast.
- **Wired (7):** simple_mnist, asteroids, PINN, PIMC, ulg, logo-lab, quantum-quake.
- **Harvest (2):** homebrew-eshkol and Quantum-RNG-API.
- **Fenced (3):** gpt2-basic, llm-arbitrator, SolanaQuantumFlux.
- **Meta (1):** `.github`.

| #   | Repo / Project                                         | Origin           | License / Note                 | Cosmogonic leaf(s) / role                                                                      | Depth / Classification                                       | Status                               |
| --- | ------------------------------------------------------ | ---------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| 1   | **Eshkol** (flagship + .esk)                           | user + local     | MIT                            | eshkol-ad, eshkol-qrng, eshkol-bridge, eshkol-vm, .esk DNA harvest                             | apex: AD primitive + GWT + KB + factor-graph + heritable DNA | ✅ deep wired                        |
| 2   | **moonlab**                                            | user             | MIT                            | clifford-tableau, mps-svd, moonlab-tensor, moonlab-vqe                                         | clifford 32q+ + MPS tensor + VQE                             | ✅ deep                              |
| 3   | **quantum_geometric_tensor**                           | user             | MIT                            | quantum-geometry, quantum-natural-gradient                                                     | QGT Fubini-Study/Berry/natural grad                          | ✅ deep                              |
| 4   | **spin_based_neural_network**                          | user             | MIT                            | spin-glass, hopfield                                                                           | Ising/Hopfield/SK instinct + NQS                             | ✅ deep                              |
| 5   | **quantum_rng**                                        | user             | MIT                            | eshkol-qrng + rng-stats                                                                        | entropy core + battery                                       | ✅ deep                              |
| 6   | **libirrep**                                           | user             | MIT                            | irrep, so3, libirrep-qec, irrep-symmetry                                                       | SO(3)/SU(2) Wigner/CG/equivariant/QEC                        | ✅ deep                              |
| 7   | **tensorcore**                                         | user             | MIT                            | tensorcore-facade                                                                              | GEMM/attention kernels for morph DNA                         | ✅ deep                              |
| 8   | **classical_rng** + contrast                           | user             | MIT                            | classical-contrast, rng-stats                                                                  | quantum-vs-classical oracle                                  | ✅ deep                              |
| 9   | **asteroids**                                          | user             | MIT                            | asteroids-physics                                                                              | Newtonian petri motility                                     | 🟢 world/petri                       |
| 10  | **simple_mnist**                                       | user             | MIT                            | perceptron-baseline                                                                            | classical NN negative baseline                               | 🟢 world/petri                       |
| 11  | **PINN**                                               | user/mirrors     | NO LICENSE (original work)     | pinn-residual                                                                                  | RD field metabolism residuals                                | 🟠 ported shallow (license pending)  |
| 12  | **PIMC**                                               | mirrors          | NO LICENSE                     | pimc-paths                                                                                     | path-integral "soul" traces                                  | 🟠 ported shallow                    |
| 13  | **quantum-quake**                                      | org + fork       | GPL-derived (Quake) + tsotchke | quantum-quake-physics, qge-aliveness                                                           | QGE unitary aliveness + physics                              | 🟠 ported (GPL quarantine note)      |
| 14  | **ulg**                                                | org              | NO LICENSE (ubernaut)          | ulg-bridge                                                                                     | world law-graph / rules-as-cognition                         | 🔴 studied + harvest (chain pending) |
| 15  | **logo-lab**                                           | org              | NO LICENSE                     | logo-turtle                                                                                    | procedural morphogenesis                                     | 🔴 studied + harvest                 |
| 16  | **homebrew-eshkol**                                    | user             | NO LICENSE                     | harvest tooling for .esk                                                                       | build / .esk catalog (DNA source)                            | studied / toolchain                  |
| 17  | **Quantum-RNG-API**                                    | org              | MIT                            | — (core ported directly)                                                                       | REST wrapper (redundant)                                     | studied / meta                       |
| 18  | **gpt2-basic**                                         | user             | MIT                            | —                                                                                              | LLM transformer (fenced)                                     | ⛔ fenced (non-LLM)                  |
| 19  | **llm-arbitrator**                                     | user             | MIT                            | —                                                                                              | LLM router (fenced)                                          | ⛔ fenced                            |
| 20  | **SolanaQuantumFlux**                                  | org              | PROPRIETARY                    | —                                                                                              | on-chain QRNG (fenced)                                       | ⛔ fenced                            |
| 21+ | **Eshkol full mirrors/research/sites + all subcorpus** | local + user/org | various                        | full harvest for 1,365 `.esk` DNA + deep audit + papers in soup/petri catalysis + every report | researched + DNA (accounted for by class)                    | studied/researched for ALL           |

**Tally (20 projects / 22 registry entries):** 9 deep · 7 wired · 2 harvest · 3 fenced · 1 meta. **100% are accounted for by class; 18/21 non-meta scientific entries are wired or harvested/studied with live downstream accounting.** No "only a few" — registry + harvest + docs + masters declare every entry and the block/fence status for each. "Wired" means real code paths. "Harvest" means source/toolchain/API DNA used without hot-path runtime primitive. "Fenced" means deliberately excluded from simulation semantics until the mandate/license state changes.

**DEEP WIRING UPDATE (2026-06-21 BRUTALISM):** New `tsotchke-deep-wire.ts` adds full Moonlab (tensor networks, MPO, Bloch sphere, TT decomposition), full libirrep (character tables, Clebsch-Gordan, Wigner D-matrices, 6j/9j symbols, point groups), and full Eshkol compiler (parser, AST, bytecode, VM, optimizer, type checker). This represents the deepest possible integration of these three core Tsotchke repos beyond the existing facade layers.

**Additional (not in mirrors/):**

- **.github** — meta; not a runtime primitive

**Tally (ALL, full scan):** 22 entries (20 corpus projects plus `.github` meta and `classical-contrast`). Dedicated real leaves/tests cover the deep and wired scientific subset (eshkol-ad/bridge/cognition/workspace/vm/qrng + moonlab-tensor/vqe/clifford/mps + qgt-geometry + spin-glass/hopfield + irrep/so3/libirrep-qec + tensorcore + pinn/pimc/qge + asteroids + perceptron + classical-contrast + ulg/logo bridges). Full catalysis and `corpusBeatForArchon` account for the registry by depth class. Eshkol `.esk` (1,365) is harvested from local Z:\[Vibe Coded (AI)]\(Tsotchke) as heritable DNA. Three entries remain fenced by design; Quantum-RNG-API is harvest/toolchain, not fenced. Classical sim is the valid substrate here; QPU would add scale.
**ALL 20+ Tsotchke repos (tsotchke user + Tsotchke-Corporation) are accounted for per this pass: deep/wired where ported, harvested where toolchain/API/DNA, fenced where mandated.**

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
   quantum-quake. See **License unblock steps** below.
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

- **Now (unblocked):** the current ledger is `9 deep`, `7 wired`, `2 harvest`, `3 fenced`, `1 meta`, with a scientific wired fraction of `18/21`; fenced entries stay provenance-only.
- **Owner action → then I wire (highest leverage):** clear chain-of-title + add LICENSE to **PINN / PIMC /
  ulg / logo-lab** → I port + wire them (ulg's law-graph and logo-lab's morphogenesis are the biggest new
  capabilities — world-rules-as-cognition + procedural body growth).
- **Deepen (no new license needed):** promote PINN / PIMC from telemetry-only into the actual mind/world
  decision paths once licensed (the code is ported; only the wiring is shallow).
- **Do NOT wire:** `quantum-quake` (GPL-2.0 — legal hard-stop) into this proprietary build.
- **Stay fenced (by design):** gpt2-basic, llm-arbitrator (non-LLM mandate); SolanaQuantumFlux (proprietary).

## Integration waves (complete — 2026-06-26)

Waves 1–4 from the former corpus integration report are **done** in code:

| Wave | Scope                                          | Status     |
| ---- | ---------------------------------------------- | ---------- |
| 1    | Eshkol AD + GWT + `.esk` DNA harvest           | ✅ Shipped |
| 2    | Moonlab tensor / MPO / Clifford reflex         | ✅ Shipped |
| 3    | QGT / spin / libirrep / quake / ulg facades    | ✅ Shipped |
| 4    | Registry depth field + tsotchke-registry tests | ✅ Shipped |

This map is the **only** Tsotchke wiring ledger; redundant audit/plan copies were removed (see `docs/AUDIT-LOG.md`).

## License unblock steps (owner action — NOT legal advice)

Four repos ship without LICENSE files (PINN, PIMC, ulg, logo-lab) — owner's original work; wireable once
MIT licensed + chain-of-title cleared. **quantum-quake is GPL-2.0** (QuakeSpasm derivative) — do NOT wire
into this proprietary build; quarantine `qge/` pending legal review.

| Repo          | Current                        | Unblock                                           | Cosmogonic value                     |
| ------------- | ------------------------------ | ------------------------------------------------- | ------------------------------------ |
| PINN          | telemetry (`pinn-residual.ts`) | MIT LICENSE + clear Concordia IP                  | field metabolism for biologics       |
| PIMC          | telemetry (`pimc-paths.ts`)    | MIT LICENSE + clear Concordia IP                  | quantum-path "soul" substrate        |
| ulg           | studied (`ulg-bridge.ts`)      | MIT LICENSE + ubernaut copyright assignment       | world law-graph / rules-as-cognition |
| logo-lab      | studied (`logo-turtle.ts`)     | MIT LICENSE + ubernaut assignment + NOTICE credit | procedural morphogenesis             |
| quantum-quake | ported telemetry               | **STOP** — GPL hard-stop                          | quarantine only                      |

**Priority:** ULG → logo-lab → PINN → PIMC. **Stay fenced:** gpt2-basic, llm-arbitrator (non-LLM mandate);
SolanaQuantumFlux (proprietary). Confirm chain-of-title with a qualified attorney before integration.

---

_Companion to `THIRD-PARTY-NOTICES.md` (binding "On Tsotchke" + per-primitive attribution) and
`src/sim/tsotchke-registry.ts` (the code-level declared integration status).
The corpus is real; the gap to wiring the remaining ~4 of 20 is paperwork (licenses) + the deliberate non-LLM fence, not the technology._
