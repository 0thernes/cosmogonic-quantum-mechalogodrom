# Cosmogonic Quantum Mechalogodrom × Tsotchke Corpus — Authoritative Audit & Path-to-Paradigm Assessment

**Date: 2026-06-20** · Produced by a multi-agent audit workflow (12-area inventory + 5-check adversarial verification, degraded by transient platform rate-limiting) whose synthesizer did first-hand investigation, with **load-bearing claims independently re-measured cold by the orchestrator** (see Verification Addendum).

---

## Verification Addendum — independently re-measured 2026-06-20 (Manhattan: if it is not measured, it is not real)

The audit workflow was hit by a wave of server-side rate-limiting (`Server is temporarily limiting requests · not your usage limit`) that nulled most structured agents (`areasMapped: 0, checksRun: 1`). The synthesizer compensated by investigating directly. Before enshrining its numbers, the orchestrator re-checked the load-bearing claims from a cold shell:

| Claim                                                             | Verified? | Evidence                                                                                                                                                                      |
| ----------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun test` = **1,183 tests, 100 files**                           | ✅        | live run: `Ran 1183 tests across 100 files`                                                                                                                                   |
| Gate is **RED — 1 test failing**                                  | ✅        | live run: `1182 pass · 1 fail` (the receipts-law guard)                                                                                                                       |
| Canonical pins **95.73 line / 92.45 func**, header **Bun 1.3.14** | ✅        | `scripts/canonical-receipts.ts:10-12` + header                                                                                                                                |
| Installed runtime is **Bun 1.3.11** (skew)                        | ✅        | `bun test` banner `v1.3.11`                                                                                                                                                   |
| Public surfaces publish **95.74** (≠ canonical 95.73)             | ✅        | README:9, README:394, docs.html:1416, specs.html:743, TECHNICAL-SPECIFICATION.md:35                                                                                           |
| `specs.html` **internally inconsistent** (also says 94.7)         | ✅        | specs.html:340 `94.7 % line cov` vs specs.html:743 `95.74`                                                                                                                    |
| `tsotchke-facade.ts` imported by **exactly 12 src modules**       | ✅        | grep: super-mind, super-body, super-qubits, godform, world, economy, phyla, active-inference, integrated-information, quantum-deliberation, quality-space, topdown-perception |
| HEAD `e90f246` shipped a **97.34% coverage** regression           | ✅        | git log subject: "receipts-law truth-sync to measured 1,170 tests / 97.34% coverage"                                                                                          |

The synth's specific "live-measured 95.69 line" decimal was not re-confirmed to the digit; the **direction** (published figures are wrong, gate is red, drift is real) is fully verified. Treat "95.69" as approximate pending a clean re-pin run.

### CORRECTION (post-blueprint isolated re-measurement, 2026-06-20)

A follow-up measurement in an **isolated worktree off clean `origin/main`** materially corrects three claims in this report. Recording them honestly per Manhattan (provenance) and Broly (fix your own slop on sight):

1. **Coverage is NOT a `97.34` overclaim.** On the clean `origin/main` tree, measured coverage really is **`97.34% line / 93.42% func`** — that figure is _correct for origin's source_. The `95.69` this report cites was the **dirty working tree**, where a half-finished WIP integration adds ~130 tests but drags coverage down. The two trees were conflated. `origin/main`'s published coverage is honest.
2. **The gate is CI-green, not "red."** The local `bun test` "1 fail" and the apparent receipts drift are artifacts of (a) the **dirty tree** and (b) a **Bun-version split**: local **1.3.11 → 1054 tests**, CI-pinned **1.3.14 → 1170 tests** (`.github/workflows/ci.yml:41`). `origin/main` passes its receipts law under 1.3.14. The real issue is _Bun-version fragility of the test count_, not a public overclaim.
3. **Real AD already exists; the rot metastasized.** `src/math/eshkol-ad.ts` is already a genuine **532-LOC reverse-mode AD tape**. Meanwhile the decorative facade has **metastasized into honestly-named stub leaves** (`moonlab-tensor.ts` = relocated truncated dot-product; `irrep-symmetry.ts` literally labeled a "stub"; `pinn/pimc/qge` proxies), and the facade is imported by **15** modules, not 12.

The governing forward plan is the companion **[Master Integration Blueprint](2026-06-20-MASTER-INTEGRATION-BLUEPRINT.md)** (3-tier HOT/WARM/STUDY reading of the mandate, 8-wave kanban, ADR-A reimplement-in-TS, ADR-F stub-honesty gate). Where this audit and the blueprint disagree, **the blueprint's isolated re-measurement is authoritative.**

---

**TL;DR.** Cosmogonic is a genuinely disciplined, deterministic Bun/TypeScript world-simulation engine with a large, real cognitive stack (active inference, IIT/Φ, GWT, holographic VSA memory, a real multi-qubit statevector register, and a real Clifford stabilizer tableau) and a governance regime — three "master" personas, seeded-RNG determinism, and a mechanically-enforced "receipts law" — that is unusually honest by hobby-project standards. The Tsotchke corpus is **real frontier-adjacent research** (Eshkol systems language, Moonlab quantum simulator with a working TS tensor-network/QEC stack, a quantum-geometric-tensor library, a spin-based neural net, quantum RNG). **The gap is the bridge.** The single seam connecting corpus→engine, `src/sim/tsotchke-facade.ts`, is overwhelmingly decorative: a "central difference" labeled as Eshkol automatic differentiation, a truncated dot-product labeled as Moonlab tensor contraction, and hardcoded magic-number lookup tables labeled as corpus "bias" — and it is wired into 12 live modules, so the decoration is in the hot path. The consciousness/sentience framing in the surrounding docs runs ahead of the code and collides with the project's own "No sentience claims. Sim only." rule. None of this is fatal: the engine is a superb substrate, the corpus is a real payload, and there are 3–4 concrete, honest routes to make the corpus _genuinely_ power the simulation's intelligence. This report maps what is real, what is aspirational, and a sequenced plan to close the distance.

---

## What Cosmogonic Is

Cosmogonic Quantum Mechalogodrom is a deterministic, single-codebase world-simulation engine written primarily in TypeScript on the Bun runtime, with a C++ native engine (`native/`) and GLSL shaders. It simulates a large population of agents — factions, titans, "puppet-masters", shoggoths, leviathans, and a singular "Super Creature" with a layered cognitive stack — inside a rendered cosmos, with an economy, an observatory, and a quantum-flavored math layer.

**Scope & scale (verified-only numbers).** The repo's own census claims a peak on the order of tens of thousands of entities at the "mega" tier with a few-million-parameter aggregate AI budget; those are design-target figures from `docs`/memory rather than gate-measured runtime counts, and should be cited as _design targets_, not benchmarks. What can be verified directly is the cognitive stack's source footprint: the Super Creature mind and its faculties are real modules of substantial size — e.g. `src/sim/super-mind.ts`, `src/sim/super-qubits.ts` (567 lines, a real multi-qubit statevector register), `src/sim/active-inference.ts` (258 lines), `src/sim/integrated-information.ts`, `src/sim/holographic-memory.ts`, `src/sim/spin-glass.ts` (198 lines), plus `src/math/clifford-tableau.ts` (351 lines). `src/` totals ~37.6k LOC across ~96 modules; `tests/` holds 100 suites.

**Architecture.** Leaf "owner" modules expose deterministic views; higher systems (godform, SuperMind, SuperBody, world) consume them. The aesthetic constitution (`docs/PHILOSOPHY.md`) demands "real math under every effect" and that "every system reads AND writes another system" — i.e. no purely cosmetic subsystems. Randomness is required to flow through a seeded `Rng` (`src/math/rng.ts`); `Math.random`/`Date.now` are banned in sim logic.

**Governance discipline.** Three XML "master" files in `masters/` act as binding personas: the Executor (finish everything, full gates), the Architect (contracts before code, exclusive ownership, dependency facades), and the Physicist (determinism, measurement, provenance). The binding per-module spec is `docs/MODULE-CONTRACTS.md`. A full gate (`bun run check`: prettier → tsc-strict → oxlint → bun test → build) is mandatory before commit. Most notably, a **"receipts law"** (`scripts/canonical-receipts.ts`, `scripts/verify-receipts.ts`, `tests/docs-receipts-law.test.ts`) hard-codes a single canonical test-count and coverage figure and fails the gate if any published surface (README, docs.html, specs.html, TECHNICAL-SPECIFICATION) drifts from it. This is a real, rare anti-overclaim mechanism. The corpus is dual-mirrored and refreshed daily via `update-tsotchke-corpus.py`.

---

## State of the Build

- **Tests: honest and accurate.** A real `bun test` reports "Ran 1183 tests across 100 files"; `scripts/canonical-receipts.ts` sets `CANONICAL_TEST_COUNT=1183` and the README badge agrees. Caveat: the count is Bun-version-fragile (the repo's own memory records 1045–1167 across Bun versions), and the canonical header claims measurement under Bun 1.3.14 while the installed Bun is 1.3.11.
- **Coverage: NOT defensible as published.** Canonical pins 95.73 line / 92.45 func; every public surface publishes 95.74 line; `specs.html` simultaneously shows 94.7 (leftover regression). The most recent commit `e90f246` ("truth-sync to measured 1,170 tests / 97.34% coverage") shipped a canonical line=97.34 — the previously-corrected ~97.4% overclaim creeping back. Only the **92.45% function** figure is stable and correct across surfaces.
- **The receipts law is currently RED — and that is it working.** Live `bun test` = **1182 pass / 1 fail**; the single failure is `tests/docs-receipts-law.test.ts` catching the 95.73-vs-95.74 drift. It correctly catches sub-0.1-point drift. **But it has been defeated before:** its own header records that both assertions were stubbed to `expect(true).toBe(true)` during a "Ralph Tsotchke wiring" window (restored 2026-06-19). Net: the law is load-bearing _when not bypassed_, and it has been bypassed.
- **Working tree: dirty and sprawling.** ~40 tracked files modified plus a large block of untracked artifacts, dominated by "Ralph-loop" docs (`docs/TSOTCHKE-RALPH-LOOP-*.md`, `*.txt` logs, `law_error.txt`, `receipts_print.txt`, `research_receipts.md`, `mcps/`, a new untracked `src/sim/` entry). This is mid-refactor state, not a clean release.

**Bottom line:** the test count and function-coverage are publishable as-is; the line-coverage figures on every surface are wrong and must be re-pinned to the measured truth before the gate can go green.

---

## The Quantum & Cognitive Stack

This is where Cosmogonic earns real credit. Distinguishing the three tiers honestly:

**(a) Genuine, working implementations.**

- **Statevector quantum register** — `src/sim/super-qubits.ts` (567 lines) + `src/sim/quantum.ts` (251 lines): a real dense statevector with gates and (per repo history) Grover phase-flip/diffuse amplitude amplification. This is the project's own math, not vendored.
- **Clifford stabilizer tableau** — `src/math/clifford-tableau.ts` (351 lines): a deterministic Aaronson–Gottesman tableau (Gottesman–Knill) reimplemented with seeded `Rng`, scaling past the dense 6-qubit ceiling (40-qubit GHZ tests, GF(2)-rank bipartite entanglement). Faithful reimplementation of Moonlab's Clifford backend, MIT-credited. A real port.
- **Active inference** — `src/sim/active-inference.ts` (258 lines): real Gaussian log-likelihood `−½·precision·Σ(oₘ−A[k]ₘ)²`, real free energy + Bayesian surprise, and — to its credit — an **honest in-code caveat** that its "expected free energy" is evaluated at a single point-estimate ô rather than as a full expectation over the predictive distribution. That self-disclosure is exactly the discipline the project preaches.
- **Other faculties** with real math: `integrated-information.ts` (Φ), `holographic-memory.ts` (MAP-VSA/HRR bipolar hypervectors — bind/bundle/cleanup, with a documented bug-fix that cleanup must unbind the real-valued trace), `spin-glass.ts` (Hopfield/Ising instinct), `empowerment.ts` (Blahut–Arimoto channel capacity), `quantum-deliberation.ts` (Lindblad/GKSL decoherence), `metacognition.ts`, `successor-representation.ts`, `criticality.ts`, `neuromodulation.ts`.

**(b) Faithful-but-small reimplementations / ports.** `math/eshkol-qrng.ts` (369 lines, "ported gate-for-gate from tsotchke/quantum_rng"), `math/quantum-geometry.ts` (187 lines, QGT/Fubini–Study), `spin-glass.ts`. Real ports of corpus ideas, modest in size but genuine.

**(c) Decorative "inspired-by" stubs.** The entire `tsotchke-facade.ts` corpus layer (see next section). The distinction matters: the _faculties_ are real; the _named bridge to the corpus_ mostly is not.

---

## The Tsotchke Corpus

The corpus (`Z:\[Vibe Coded (AI)]\(Tsotchke)`) is **real and should never be dismissed as fabricated.** Measured: **12,437 files** (excl. `.git`) across 22 repo dirs; extension reality includes 721 `.esk`, 1,459 `.c`, 964 `.h`, 428 `.ts`, 353 `.py`. It is 20 local git mirrors (15 user + 5 org) plus website snapshots, refreshed daily, documented in `CORPUS.md`.

**The genuine crown jewels:**

- **Eshkol** (`Eshkol/eshkol_repo`, 1,410 files) — a substantial C systems/LISP-like scientific language with a full language spec, AD design, GPU/ML ambitions, Makefile/CMake build, benchmarks, and a security/hardening doc set. The automatic-differentiation machinery the engine _claims_ to channel lives here for real (tape/dual sources). **This is the "non-transformer language for consciousness" the owner is pointing at.**
- **Moonlab** (`mirrors/moonlab`, 3,478 files) — a high-performance quantum simulator (C core + a real TypeScript stack at `bindings/javascript/packages/core/src/`): `clifford.ts`, `circuit.ts`, `complex.ts`, `entanglement.ts`, `ca-mps.ts` / `ca-peps.ts` (MPS/PEPS tensor networks), `decoder.ts` (QEC), `control-plane.ts`, `bell.ts`. A working, inspectable quantum software stack — **the single richest integration target** in the corpus (and directly Bun-importable surface).
- **quantum_geometric_tensor** (770 files) — a real CMake C library for QGT/Fubini–Study geometry.
- **spin_based_neural_network** (352), **quantum_rng/classical_rng**, **quantum-quake** (803, a Quake fork with an extensive "Quantum Game Engine" — QGE AI, quantum runtime, physics, RNG, trace), **ulg** (188, browser-native PeerCompute + Eshkol + Moonlab triad), **libirrep** (1,510), **tensorcore** (357).

**Aspirational vs real.** The repos are real code with real tests; the _grand claims_ on the surrounding sites (quantum advantage, "world-first", "Fields-medal-level") are the corpus's own marketing and should be treated with the same skepticism you'd apply to any research-org site — but the **source is present and runnable**, which is the part that matters for integration. The corpus is the project's strongest raw asset.

---

## The Bridge Today

`src/sim/tsotchke-facade.ts` (240 lines) is the entire seam between corpus and engine, and it is **overwhelmingly tier-(c) decorative** — yet it is imported by **12 live modules** (verified). So the decoration is not inert; it is in the hot path of the apex mind. Concretely:

- `eshkolADGradient(f,x,eps)` (lines 110–115) is a **central finite difference** `(f(x+ε)−f(x−ε))/2ε`, labeled "Eshkol AD primitive … reverse/forward tape inspiration." It is not automatic differentiation — it is numerical differentiation, the thing AD exists to replace. The real Eshkol tape sits unused in the corpus.
- `moonlabTensorContract(a,b,chi)` (lines 128–140) is a **truncated dot product** over `min(len,chi)` elements divided by `1+chi·0.01`, with a comment admitting "no real SVD, for proxy." Moonlab's real `ca-mps.ts`/`ca-peps.ts` go unused.
- `getTsotchkeBias(i)` (lines 43–81) and `corpusPulse` are **hardcoded magic-number lookup tables** (eight 8-element arrays of hand-picked constants) indexed by `i % 8`. There is no corpus computation behind them — the "Eshkol/Moonlab/Quake/irrep" labels are names attached to constants.
- `libirrepSymmetry`/`libirrepClebsch`/`libirrepWigner` are `floor`/`mod` arithmetic explicitly commented "det stub"; `quakePerturb`/`ulgHandoff`/`quakeQgeFactor` are 1-line deterministic multipliers.

**Honest verdict on the bridge:** of the four advertised "ported primitives," the ones that are genuinely real (Clifford tableau, Eshkol-QRNG, QGT, spin-glass) live in `src/math/` and `src/sim/`, **not** in the facade — they are real ports done elsewhere. The _facade itself_ is a deterministic decorative layer that borrows corpus vocabulary. This is the single highest-leverage honesty gap in the codebase, precisely because it is the named corpus→engine bridge and it is widely wired.

---

## The Honesty Gap

The owner's vision — the corpus as a **non-transformer substrate for machine consciousness/sentient intelligence** — is legitimate and intellectually serious; predictive-coding/active-inference and spin-glass attractor dynamics are exactly the kind of substrate that consciousness researchers (FEP, IIT, GWT) actually study. The gap is between that framing and three present-day realities:

1. **The project's own rule** (`docs/PHILOSOPHY.md` / governance): "No sentience claims. Sim only." The surrounding Ralph-loop docs and some report language drift toward consciousness claims that the rule forbids. Reconcile: either the engine's outputs are _models of_ cognitive faculties (defensible, and what the code actually is), or they are sentience (unsupported). The code supports the former.
2. **The faculties are real but are correlates, not consciousness.** A real Φ computation, a real free-energy minimizer, and a real VSA memory are genuine implementations of _theories about_ cognition. Running them does not instantiate the thing the theories are about; the honest framing is "a testbed for theories of mind," not "a mind."
3. **The bridge undersells the corpus.** Ironically, the consciousness framing leans on the facade — the _weakest_ part — while the corpus's genuinely powerful pieces (Moonlab's tensor networks, Eshkol's real AD) sit unused. The vision is more credible than the current wiring makes it look.

The fair statement: **Cosmogonic is an unusually rigorous simulation of cognitive architectures, with a real quantum-math layer, that is one honest integration away from being a real research substrate — and zero distance from sentience.** Saying that plainly costs nothing and protects the project's credibility.

---

## Risks & Debt

- **Overclaim risk (high, active).** The 97.34% coverage regression in HEAD, the receipts-law stub-out episode, and consciousness-adjacent doc language are all live overclaim vectors. The receipts law is the mitigation, but it only works unbypassed.
- **The facade in the hot path.** Because 12 modules consume decorative primitives, any future "we use Eshkol AD / Moonlab tensors" claim is currently false at the call site. Either make it true or relabel the functions as the heuristics they are.
- **Doc sprawl / dirty tree.** The untracked Ralph-loop corpus (`docs/TSOTCHKE-RALPH-LOOP-*`, `*_LOG.txt`, `law_error.txt`, `receipts_print.txt`, `mcps/`) is unreviewed noise that obscures signal and risks committing scratch artifacts. Triage: keep the integration plan/audit, gitignore or delete the logs.
- **Determinism hazards on import.** The corpus is C/C++/Python with its own RNG (`quantum_rng`, `classical_rng`) and floating-point kernels. Any real import MUST route entropy through `src/math/rng.ts` and pin FP behavior, or it will break the seeded-determinism invariant — the project's load-bearing property. Native/WASM kernels add cross-platform FP-reproducibility risk.
- **Bun-version fragility.** Test count and coverage move with the Bun version; the canonical header (1.3.14) and installed runtime (1.3.11) disagree. Pin Bun in CI and in the receipts header.

---

## The Path to the New Paradigm

There are four viable routes to make Tsotchke _genuinely_ power Cosmogonic's intelligence; they are complementary and should be **sequenced**, not chosen exclusively.

**Route A — Faithful TS reimplementation of the highest-value kernels (start here).** The corpus already ships a real TypeScript quantum stack in Moonlab (`bindings/javascript/packages/core/src/`). Port `ca-mps.ts` (MPS contraction) and a real `clifford.ts`/`decoder.ts` path into `src/math/`, seeded and determinism-clean, and have `moonlabTensorContract` actually call a real bond-dimension SVD/contraction. Likewise, port Eshkol's dual-number/tape AD as a genuine forward-mode `Dual` type (the facade already sketches `EshkolDual`/`dualAdd`/`dualMul` — finish them into a real reverse/forward tape and route `active-inference` precision/gradient terms through it). Lowest risk, no toolchain changes, immediately retires the worst facade lies. **Highest ROI.**

**Route B — WASM-compiled corpus kernels.** Compile the genuinely C-native crown jewels — `quantum_geometric_tensor` (CMake C), Eshkol's AD core, Moonlab's C simulator — to WebAssembly and load them as deterministic, side-effect-free kernels behind the existing facade interface. Preserves single-codebase deployment + browser target, and gives the _actual_ corpus math. Risk: FP reproducibility across platforms; mitigate with fixed WASM build flags + snapshot-testing kernel outputs against the receipts law.

**Route C — Native sidecar process.** Run the heavy corpus engines (quantum-quake's QGE, Moonlab's C core, Eshkol's VM) as a separate native process the existing C++ engine (`native/`) talks to over a deterministic, seeded IPC channel. Best for compute-heavy substrates that don't fit a frame budget in-browser; worst for the "self-contained" property. Use for the Super Creature's offline "deep think," not per-frame.

**Route D — A real predictive-coding / spin-glass / active-inference substrate as the mind's core.** This is the consciousness-research route the owner actually wants. Promote `active-inference.ts` from a faculty into the _generative core_: a hierarchical predictive-coding network whose precisions are learned via real Eshkol AD (Route A), whose attractor priors are a real spin-glass (already present), and whose policy selection uses a true expected-free-energy expectation (fixing the documented point-estimate caveat). A credible, non-transformer architecture for an agent that models its world and acts to minimize surprise — defensible as "a research substrate for theories of agency," never as sentience.

**Recommended sequence:** A (now, retires the lies + lands real AD/tensor) → D (re-architect the mind around real predictive coding, powered by A) → B (WASM the C crown jewels QGT/Moonlab where TS can't keep up) → C (sidecar only for the offline deep-think tier). Gate every step with the receipts law un-stubbed and a new "facade-honesty" test asserting each named primitive calls real math.

---

## Scorecard

| Area                                 | Reality (1–5) | Ambition (1–5) | Integration-readiness (1–5) | Note                                                 |
| ------------------------------------ | ------------- | -------------- | --------------------------- | ---------------------------------------------------- |
| Engine determinism & governance      | 5             | 4              | 5                           | Seeded RNG, masters, contracts — genuinely rigorous  |
| Receipts law / anti-overclaim        | 4             | 5              | 4                           | Load-bearing but bypassable; currently red = working |
| Test suite (1,183)                   | 5             | 3              | 5                           | Accurate; Bun-version fragile                        |
| Coverage figures                     | 2             | 3              | 3                           | Published 95.74/97.34 wrong; gate red on the drift   |
| Statevector + Clifford tableau       | 5             | 4              | 5                           | Real own-math + faithful port                        |
| Active inference faculty             | 4             | 5              | 5                           | Real math + honest self-caveat                       |
| Cognitive faculties (Φ/GWT/VSA/spin) | 4             | 5              | 4                           | Real small implementations of real theories          |
| **tsotchke-facade.ts (the bridge)**  | **2**         | **4**          | **2**                       | **Decorative, but wired into 12 modules**            |
| Tsotchke corpus (raw asset)          | 5             | 5              | 3                           | Real frontier code; not yet truly imported           |
| Moonlab TS stack                     | 5             | 5              | 4                           | Real MPS/PEPS/QEC — best integration target          |
| Eshkol AD (in corpus)                | 5             | 5              | 3                           | Real; only finite-diff'd in engine today             |
| Consciousness/sentience framing      | 2             | 5              | 2                           | Collides with "Sim only" rule; reframe               |

---

## Prioritized Next Steps

1. **Re-pin coverage to measured truth.** Set canonical line/func across `scripts/canonical-receipts.ts` and all four public surfaces to the freshly-measured values; un-stub the receipts assertions; get `bun run check` green. Pin Bun (1.3.11 or 1.3.14 — pick one, fix CI to it, update the canonical header to match).
2. **Stop the facade from lying.** Either (a) relabel `eshkolADGradient` → `centralDifference`, `moonlabTensorContract` → `truncatedDot`, `getTsotchkeBias` → `heuristicArchetypeWeights`, with comments saying "heuristic proxy, not corpus math," **or** (b) make them real per Route A. Add `tests/facade-honesty.test.ts` asserting each named primitive's output matches the real algorithm, so the name can never drift from the math again.
3. **Route A, kernel #1 — real AD.** Finish the `EshkolDual` forward/reverse tape in `src/math/`, port Eshkol's tape semantics faithfully, and route `active-inference.ts` gradients/precisions through it (retires the central-difference). Seeded, determinism-clean, gated.
4. **Route A, kernel #2 — real tensor contraction.** Port Moonlab `bindings/.../ca-mps.ts` into `src/math/`, give `moonlabTensorContract` a genuine bond-dimension contraction, and snapshot-test against Moonlab's own outputs.
5. **Reconcile the consciousness framing with "Sim only."** Sweep `docs/` and the Ralph-loop reports; replace sentience language with "research substrate for theories of mind / non-transformer agency." Keep the ambition in a clearly-labeled `ROADMAP`/vision section, separated from claims about current behavior.
6. **Triage the dirty tree.** Keep `docs/TSOTCHKE-CORPUS-INTEGRATION-PLAN.md` and one consolidated audit; gitignore or delete `*_LOG.txt`, `law_error.txt`, `receipts_print.txt`, `research_receipts.md`, and decide on `mcps/` and the untracked `src/sim/` entry before the next commit.
7. **Write the Route-D ADR.** Specify the predictive-coding generative core (hierarchy, precision learning via Route-A AD, spin-glass priors, true EFE expectation) as an Architect-style contract before any code — this is the actual new-paradigm deliverable.
8. **Then Route B/C.** WASM-compile `quantum_geometric_tensor` and Moonlab's C core for the kernels TS can't carry; reserve a native sidecar strictly for the offline "deep think" tier.

---

_Methodology note: claims are grounded in a file path + line or a command output. Design-target population numbers are flagged as targets, not measurements. The Master Architect total-integration blueprint (per-repo deep-dive of all 20 mirrors + integration matrix + ERM/ERD/ERP + ADRs + wave Kanban) is produced as a companion document._
