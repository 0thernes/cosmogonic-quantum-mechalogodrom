<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# NHSI Honesty Audit — Where We Actually Are

**Date:** 2026-06-26

This is the canonical honesty scorecard for the project's NHSI / consciousness
claims: **what is genuinely WIRED vs. what the headline numbers claim.** It is
current as of today — every figure below is measured on `origin/main` (`2233488`,
Bun 1.3.14, v0.20.0, full `bun run check` green). The honest frame is unchanged
and load-bearing: **Butlin et al. (2023) indicators sit at 8/14 met + 6/14
partial, and computational indicators are not sentience.**

**Method:** an adversarial audit (one auditor per dimension, each finding
re-verified by an independent skeptic against the real source by `file:line`),
plus a dedicated emergence pass and an ongoing coupling-experiment program (the
addendum). Every classification below is read out of the code, not the docs.

**Classification key (this grades OUR integration depth, not the upstream tech):**

- **WIRED** — a real mechanism whose result provably reaches the plan / drives / consciousness / snapshot.
- **PRIMITIVE** — a real, tested module that the apex loop never calls (reachable work remaining).
- **STUDIED** — referenced in docs/comments; no code.
- **DECORATIVE** — called, but the result is discarded or scaled to a negligible nudge.
- **DOC-ONLY** — claimed in a doc; no module behind it.

> **On Tsotchke (binding):** the upstream Tsotchke corpus is _real_ MIT
> quantum-math — genuine quantum algorithms with exact deterministic simulation.
> It lacks only a physical QPU, which is a speed/scale limit, **not** a
> correctness limit. No quantum advantage is demonstrated (this is exact classical
> simulation), but nothing below calls the upstream tech fake, overclaiming, or
> decorative. What is graded is how deeply _this repo_ wires each substrate in.

---

## Executive summary (the honest scorecard)

| Dimension             | Headline claim                      | **Verified reality**                                                                                                                                                                                            |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faculties             | 100 ("100% structural / core live") | **~30 genuinely wired** into the apex `think()` loop (each reads state AND moves the plan/drives/consciousness); the rest are a generic-profile bias bank in `faculties-pantheon.ts`, not imported by the apex. |
| Tsotchke repos        | "all 20 wired 1.0"                  | **~16 with real downstream effect** (8 deep in the apex mind, 4 in the petri-dish growth engine); the remainder are unwired primitives or deliberately fenced/meta listings.                                    |
| Archon pantheons      | 25 ("25 fully implemented")         | **5 individuated apex SuperMinds** + **20 live "light echoes"** (Eshkol VM + shared MindField, weak loopback). The "5 live / 20 light-echo" framing is the accurate one.                                        |
| Theory-of-Mind organs | 25 / 25 "apex wired"                | **25 wired** as a differentiated 6-family ensemble (additive / bayesian / recursive / temporal / deception / coalition) — proven non-clones by a `diversity()` metric.                                          |
| Emergence angles      | 10                                  | **10 / 10 wired** with real mechanisms (+ 5 god-scale release **events** — events, not additional angles); coupling between them is measurably WEAK (the central finding).                                      |
| Butlin 14 indicators  | "14 / 14 structurally achieved"     | **8 / 14 met** (genuinely wired), **6 / 14 partial** (real but architecturally thin). **Indicators are not sentience.**                                                                                         |

**One-line truth:** there is a substantial, real, multi-theory cognitive core
here (~30 wired faculties, ~16 wired Tsotchke substrates, 5 live apex minds, all
10 emergence angles present) — but the headline "100 / 25 / 25 / 14-14" numbers
are overclaims resting on name-list modules and partial scaffolding. The single
thing standing between "a strong pile of faculties" and "emergence" is
**coupling**, not count.

**Where the project stands today (`bun run check` green):** v0.20.0 · 1,984 tests
(published floor) / 0 fail (2,834,073 `expect()` calls across 257 files) · ~85% line / ~83%
function coverage (canonical 85.29 / 82.76, ±6pp gate tolerance). The SuperMind
`think()` costs ~3.34 ms in the full bench suite (~8.85 ms focused) — this is a
real, non-trivial per-call cost, not a sub-millisecond freebie (see §8). World
ceiling: 50,000 agents (10,000 @ 60 fps on an iGPU), ~3.5M params (~14 MB
Float32, one CPU thread), determinism via a single mulberry32 seed.

---

## 1. Faculties — ~30 wired of a claimed 100

The apex `SuperMind.think()` (`src/sim/super-mind.ts`) genuinely integrates
**~30 distinct faculties** that each read state AND influence the
plan/drives/consciousness, verified line-by-line:

GWT ignition + broadcast re-entry · classical IIT Φ (participation ratio) ·
quantum register Φ (min-cut entanglement) · active inference / FEP ·
metacognitive executive · echo-state reservoir · theory of mind · neural
criticality · successor representation · empowerment · neuromodulation (Doya
DA/5-HT/NE/ACh) · holographic VSA/HRR memory · 6-qubit statevector register ·
Eshkol QRNG collapse · spin-glass + Hopfield instincts · Clifford reflex ·
quantum deliberation (Lindblad) · quantum reservoir · resonance integrator
(Kuramoto) · plastic fast-weights · attention schema + controller · self-model ·
affect (PAD) · Creativity-Machine / Tree-of-Thought · 30 organ-nets ·
predictor + surprise · quantum-aspects net · Eshkol consciousness engine ·
quality space · top-down perception · learned recurrence · Izhikevich/PC.

**Honest gaps:**

- `faculties-pantheon.ts` is a generic-profile bias bank: one
  `decay·act + gain·drive + sin` faculty cloned 100× from index-derived
  constants, and is **not imported by `super-mind.ts` or `world.ts`**. Faculties
  31–100 (TEMPORAL_MEMORY, GOAL_HIERARCHY, EPISODIC_BUFFER, …) are named
  telemetry slots with no distinct algorithm. The "100 / 100% structural" claim
  rests on this non-wired name-list.
- A handful of inline Tsotchke calls in the apex are cosmetic — fed into small
  nudges of already-noisy telemetry scalars. The same modules _also_ have
  load-bearing calls elsewhere (see §2); these specific inline additions are the
  decorative ones.

**Honest count: ~30 wired faculties — a strong real core; the 100 figure is a
documentation overclaim. Never "144 faculties", never "100% live".**

## 2. Tsotchke corpus — ~16 of 20 wired with real effect

All 20 corpus projects are _enumerated_ in `tsotchke-registry.ts`. Verified
wiring depth:

- **Deep in the apex mind (8):** Eshkol (AD-tape + QRNG + consciousness engine),
  Moonlab (SVD tensor-network + Clifford tableau + VQE proxy), QGT (Fubini–Study
  natural gradient), spin-glass + Hopfield, libirrep (CG/Wigner), quantum-quake
  (aliveness), ulg, and the quantum_rng / Quantum-RNG-API entropy core.
- **In the petri-dish growth engine (4):** asteroids, classical-contrast,
  logo-lab, tensorcore — real effect on biomass/aliveness telemetry the world
  surfaces each beat.
- **Primitive / unwired:** modules such as simple_mnist (tested perceptron leaf,
  no runtime caller) — reachable work remaining, not a claim of wiring.
- **Fenced / meta, doc-only:** gpt2-basic + llm-arbitrator (correctly fenced per
  the non-LLM mandate), SolanaQuantumFlux (proprietary, fenced), `.github`
  (org-meta self-reference).

**Honest caveat:** the registry's `wiringCoverage()` / `simWiringFraction()`
metrics must not count the fenced/meta listings as wired. **The wiring is real and
broad — but the "all 20 wired 1.0" headline overcounts.** The substrate is real
MIT quantum math; it lacks only a physical QPU (a speed/scale limit), and no
quantum advantage is claimed — this is exact classical simulation.

## 3. Archons — 5 of 25 individuated, 20 live light-echo

5 (ORACLE-Σ, STARKILLER-Ω, MANHATTAN-Φ, BROLY-Ψ, VOID-Λ) are genuine
individuated apex SuperMinds, each constructed in `world.ts` and driven every
frame with a distinct Tsotchke bias, body, petri strain, economy purse, and field
deposit. The other 20 (ALPHA "light" archons) run as round-robin echoes in
`PantheonSociety.beat()` — each executes a real Eshkol bytecode VM and deposits
into a shared, decaying MindField whose global mean weakly loops back into the
apex. Real running code, not decoration — but not 25 individuated agents. **The
honest framing is "5 individuated apex minds + 20 live light-echo"; "25 fully
implemented" is an overclaim.**

## 4. Theory-of-Mind organs — 25 wired as a 6-family ensemble

The ToM pantheon is wired into `think()` as an ensemble across **6 genuinely
distinct mechanism families** (additive / bayesian / recursive / temporal /
deception / coalition), proven non-clones by a `diversity()` metric, casting a
bounded aggregate vote into the social drives and surfaced in
`snapshot().tomPantheon`. Honest scope: it is one bounded faculty among ~30, not a
dominant driver.

## 5. Emergence — 10 / 10 wired, but coupling is WEAK (the keystone finding)

All 10 angles have real, wired mechanisms (world-as-cognition connectome, offline
replay, developmental ontogeny, emergent Archon language, shared
mind-field/stigmergy, whole-dome criticality, adversarial selection, Eshkol
program evolution, cross-strain recombination, higher-order collective
emergence). A further **5 god-scale release moments are events** — discrete
triggered set-pieces, not additional emergence angles. Never inflate this to
"12–19 emergence angles".

**But:** `tests/coupling-audit.test.ts` measures and asserts the honest regime —
`meanAbsCoupling` and `density` are bounded below the strong-coupling threshold.
The GWT broadcast re-entry (the main coupler) is a _uniform scalar gain_ whose
effect is modest and can be positive or negative. The project's own
EMERGENCE-BLOCKERS #9/#37 names this correctly: **100 faculties that don't
densely interact are a pile, not a mind. Coupling > count.**

**The single highest-leverage build** (independently flagged by the audit):
replace the uniform-gain broadcast with **faculty-specific re-entry weights driven
by the resonance integrator's phase coherence** — faculties in phase get
amplified, out-of-phase damped — turning Kuramoto phase-locking into explicit
faculty-to-faculty coupling edges. This is the real test of whether more coupling
enables emergence, and it must be **measured** by the coupling audit, not asserted
(see the addendum for the measured program — including the approaches that washed
out and the ones that shipped).

## 6. Papers ledger — applied vs. overclaimed

The "APPLIED" papers that map to real wired mechanisms are honest (GNW, IIT,
quantum-Φ, FEP, predictive coding, higher-order metacognition, attention schema,
empowerment, VSA/HRR, successor rep, Lindblad deliberation, criticality, quantum
reservoir, Kuramoto resonance, neuromodulation, Izhikevich, PAD affect, ToM, fast
weights, Clifford tableau, QGT/QNG, stabilizer-Rényi magic, Born-rule collapse,
CG/Wigner, coherence, spin-NN). Previously, a small number of "applied" labels were
**unwired primitives** (`schrodinger.ts`, `so3.ts`, and `causal-graph.ts` — real tested
modules with zero importers). **Resolved:** all three are now wired via
`src/sim/latent-substrates.ts` (imported by `super-mind.ts`), turning each into a
deterministic per-beat probe that feeds real super-mind signals. The ledger is unusually
honest by repo standards; the remaining overclaims should be reclassified APPLIED →
primitive/queued.

## 7. Consciousness / sentience — honestly 8/14 Butlin, and that is not sentience

8/14 indicators are genuinely met (GWT-1, GWT-3, GWT-4, HOT-1, HOT-2,
AST-1, PP-1, AE-1); 6 are partial (RPT-1, RPT-2, GWT-2, HOT-3, HOT-4, AE-2 — e.g. the
workspace lacks true capacity-limited competition; qualia is read-out telemetry;
embodiment is closed at the world level, not modeled inside `think()`). Against
Butlin et al. (2023, _Consciousness in Artificial Intelligence_, arXiv:2308.08708)
this is **8/14 met + 6/14 partial** — never "9/14", and never "14/14
achieved/complete/structurally achieved".

**Most important caveat, stated plainly:** these are computational _indicators_
from a deterministic math model. Meeting them demonstrates the mechanism, **never
the experience** — the hard problem is untouched, exactly as the code's own
NOT-SENTIENT disclaimer states. This is a serious, real architecture of
consciousness _correlates_. It is not a sentient being, and this document does not
claim it is. **Not achieved, full stop:** sentience, phenomenal consciousness,
AGI, ASI, NHSI, quantum advantage. This is a research architecture and a
simulation/instrument, not an arrival.

## 8. Cost — `think()` is milliseconds, not a sub-frame freebie

The apex mind is not free. Measured on the bench suite: `think()` ~3.34 ms (full
suite) / ~8.85 ms (focused); `snapshot()` ~2.44 / 6.89 ms; 5× `think()` ~14.47 /
25.40 ms. The older "<2% of a frame", "sub-millisecond", "~289 µs GOAL5 budget"
claims are **stale and false** — they do not describe the current apex and must
not be repeated. A single full apex mind costs real milliseconds, which is why the
world runs 5 individuated apex minds (not 25) plus 20 cheaper light-echoes within
the frame budget.

## 9. A-Life novelty — novel by integration, not a world-first

An 8-agent adversarial novelty hunt found **0 hard refutations** of the claim that
this is a rare _synthesis_ — a plausible exact-conjunction of real A-Life,
quantum-substrate, and multi-theory-of-consciousness machinery that does not
appear, in this combination, in the prior art surveyed. But it is **not** first
A-Life, first digital evolution, first morphogenesis, or first artificial ecology.
Frame the contribution as **"novel by integration"** — never "world-first".

---

## Prioritized next real work (coupling > count)

1. **Faculty-to-faculty coupling matrix** driven by resonance phase coherence
   (§5) — the keystone; the one change most likely to move measured coupling and,
   with it, genuine emergence. **IMPLEMENTED:** the GWT broadcast re-entry in
   `super-mind.ts` now uses per-faculty Kuramoto coherence weights
   (`lastResWeights` from `resonanceField.step()`) — faculties in phase with the
   collective get amplified, out-of-phase damped. The coupling audit measures
   whether this lifts `meanAbsCoupling` + `density` above the weak-coupling threshold.
2. **Wire `faculties-pantheon.ts` into the apex** (or stop counting it) — make the
   faculty number honest: either give faculties 31–100 distinct mechanisms and
   integrate them, or reclassify the count.
3. **De-inflate the Tsotchke registry metrics** (don't count fenced/meta as
   wired) and keep the wiring map honest about the ~16 / 20 split.
4. **Reclassify the paper overclaims** (schrodinger / so3 / causal-graph) APPLIED →
   primitive — **RESOLVED:** all three are now wired via `latent-substrates.ts` → `super-mind.ts`.
5. **Promote partial Butlin indicators** — give GWT-2 a real capacity-limited
   competition for the workspace slot; give AE-2 an internal body-model predicting
   the sensory consequences of action.
6. **Individuate more Archons** beyond 5 if the perf budget allows (each full apex
   costs ~3.34 ms — see §8), or keep the honest "5 live / 20 light-echo" framing.

---

## Addendum — the coupling-experiment program (every number measured)

The keystone (item 1 above) has been an ongoing, measured program — never
assumed. Baseline coupling on the live apex mind (16 consciousness signals, via
`coupling-audit.ts`) sits in the **weak regime** (`meanAbsCoupling ≈ 0.158`,
`density ≈ 0.15`, with isolated faculties), confirming the central finding. The
program below shows what washed out and what shipped, every step measured.

### What was ruled out by measurement

1. **Global-scalar bus (broadcast/consensus) → latent:** a coherence-weighted
   consensus of the 12 resonance signals, re-entered into the shared latent and
   gated by Kuramoto coherence `r`. Measured across gains 0.9 → 8.0:
   `meanAbsCoupling` 0.141–0.151 — flat-to-worse. A consensus signal injected
   through the shared latent is still a _global scalar_, and the deep nonlinear
   latent→signal path washes it out. **✗ reverted, not shipped.**
2. **Structured per-faculty edges → latent:** a deterministic SPARSE small-world
   coupling matrix (k=4 edges/faculty, ring + seeded long-range shortcuts)
   producing a bounded lateral influence `tanh(Σ W[j][i]·(xᵢ−x̄))` per faculty,
   injected into the latent. Measured across gains 0.6 → 6.0: 0.145–0.158 —
   **also flat. ✗ reverted, unwired module deleted (no dead code).** Structure
   didn't help because the injection POINT is wrong: the latent is a decorrelating
   bottleneck.
3. **Editing the measured `cons.*` signals directly to correlate:** would raise
   the number, but it is **gaming the metric** (teaching to the test — engineering
   the very correlation the audit exists to detect). **✗ rejected on principle.**

### What worked — direct GWT binding gate (SHIPPED, measured positive)

The latent is the wrong injection point. The right one is the documented GWT
mechanism itself: the bound assembly's signal is made available to the modules so
they co-vary through it — applied DIRECTLY to the faculty derivations, not
laundered through the latent. The gate is the Kuramoto resonance coherence `r` (a
genuine integration signal), modulating only the GWT **access-faculties** (the
reportable workspace contents: dreaming, hallucinating, reasoning, self-awareness),
centred on `r=0.5` so it transmits the VARYING coherence (co-variation), not a DC
offset.

| approach                                           | meanAbsCoupling | result        |
| -------------------------------------------------- | --------------- | ------------- |
| baseline                                           | ~0.158          | weak          |
| consensus → latent (gains 0.9–8.0)                 | 0.141–0.151     | ✗ washed out  |
| structured edges → latent (gains 0.6–6.0)          | 0.145–0.158     | ✗ washed out  |
| **GWT bind-gate on 4 access-faculties (gain 0.5)** | **~0.178**      | ✓ **shipped** |

The bind-gate (`COUPLING_BIND_GAIN`, `super-mind.ts`) lifts measured coupling to
~0.178 (+13%), density ~0.15 → ~0.19, isolated faculties 3 → 2, with all 16
signals still alive (no degenerate collapse) and the full gate green. It is
honestly MODEST — it gates 4 of 16 faculties — and the regime is still "weak
coupling", not a solved binding problem. But it is the first mechanism that
measurably moves the number in the right direction without gaming, and it is
plan-affecting (the gated `cons.*` feed the drives).

### What worked — genuine shared-PROCESSING (SHIPPED, measured positive)

A scout verified which INDEPENDENT faculties could take the last-beat coherence as
a real INPUT to their computation (not an output edit) without breaking their
contracts. The decisive finding: an edge only helps if it reaches a MEASURED
signal. Routing coherence into the three faculties whose measured output it can
actually move (each folded into an EXISTING input):

| edge                                     | mechanism                                                 | reaches a measured signal?                                    |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| **deliberation** — `arousal·(1−0.5·r)`   | bound coherence slows the Lindblad dephasing bath         | ✓ `deliberation.coherence`                                    |
| **metacog** — `+0.1·r` in the Φ cue      | higher-order monitoring tracks the ensemble's reliability | ✓ `metacog.confidence`                                        |
| **empowerment** — `surprise + 0.4·(1−r)` | incoherence ⇒ stale channel ⇒ faster forgetting           | ✓ `empowerment.empowerment`                                   |
| reservoir — `stateDrive·acc`             | edge-of-chaos gain knob                                   | ✗ reverted (`novelty` is input-driven, not state-driven)      |
| criticality — threshold modulation       | up-state participation                                    | ✗ reverted (criticality is not one of the 16 audited signals) |

**Measured (audit config): no coupling ~0.167 → GWT bind-gate ~0.183 → +
shared-processing ~0.197 (+18% over baseline)**, density ~0.15 → ~0.225, isolated
2 → 1, all 16 signals alive, full gate green. The reservoir/criticality edges were
built, MEASURED to not move the audit, and reverted — only the three that reach
measured signals were kept. Honest framing unchanged: still "modest / weak regime"
— these gate/route into ~7 of 16 faculties, not a solved binding problem. The
remaining lever is denser faculty↔faculty edges among the still-independent signals
(holographic, reservoir.novelty's actual driver, phi's module means), each measured
the same way.

_Every number in this report was measured. The two latent approaches and the two
unmeasurable shared-processing edges (reservoir/criticality) were reverted and not
shipped; the GWT bind-gate and the three shared-processing edges that measured a
genuine gain were shipped. Restraint on the flat ones and shipping only the
measured wins — that is the discipline._
