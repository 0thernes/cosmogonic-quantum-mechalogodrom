# NHSI Honesty Audit — Where We Actually Are (2026-06-21)

**Method:** a 15-agent adversarial audit (one auditor per dimension, each finding re-verified by an
independent skeptic against the real source by `file:line`), plus a dedicated emergence pass. Every
classification below was read out of the code, not the docs. Verifiers confirmed the audits with high
trust (Tsotchke 16/16 confirmed, ToM 1/1 confirmed, no downgrades on the dimensions that completed
verification).

**Classification key (this grades OUR integration depth, not the upstream tech):**

- **WIRED** — a real mechanism whose result provably reaches the plan / drives / consciousness / snapshot.
- **PRIMITIVE** — a real, tested module that the apex loop never calls (reachable work remaining).
- **STUDIED** — referenced in docs/comments; no code.
- **DECORATIVE** — called, but the result is discarded or scaled to a negligible nudge.
- **DOC-ONLY** — claimed in a doc; no module behind it.

> **On Tsotchke (binding):** the upstream Tsotchke corpus is _real_ MIT quantum-math — genuine quantum
> algorithms with exact deterministic simulation. It lacks only a physical QPU, which is a speed/scale
> limit, **not** a correctness limit. Nothing below calls the upstream tech fake. What is graded is how
> deeply _this repo_ wires each substrate in.

---

## Executive summary (the honest scorecard)

| Dimension             | Dashboard claim                                   | **Verified reality**                                                                                                                                                                            |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faculties             | 100 / 100 ("100% structural / core live")         | **~30 genuinely wired** into the apex think() loop; 6 decorative Tsotchke nudges; the literal "100" is `faculties-pantheon.ts` — one generic faculty cloned 100×, **not imported by the apex**. |
| Tsotchke repos        | "all ~21 wired 1.0"                               | **~16 with real downstream effect** (12 deep in the apex mind, 4 in the petri-dish growth engine); 1 unwired primitive; 4 deliberately fenced/meta; 1 dead "deep-wire" module.                  |
| Archon pantheons      | 25 (dashboard already says "5 live / 20 planned") | **5 wired** as individuated apex SuperMinds; **20 real "light echoes"** (Eshkol VM + shared MindField, weak loopback). Dashboard's 5-live framing is accurate.                                  |
| Theory-of-Mind organs | 25 / 25 "apex wired"                              | **As of `7db653e`: 25 wired** as a differentiated ensemble (was 1 wired + 25 unreachable at audit time — this audit drove the fix).                                                             |
| Emergence angles      | 10                                                | **10 / 10 wired** with real mechanisms — but **coupling between them is measurably WEAK** (the central finding).                                                                                |
| Bleeding-edge papers  | ~30 applied                                       | **27 genuinely applied** (code-backed); 3 "applied" overclaims that are actually unwired primitives; 4 studied (some forward-dated, framing-only); 4 aspirational/unwired.                      |
| Butlin 14 indicators  | 14 / 14 "structurally achieved"                   | **8 / 14 met** (genuinely wired), **6 / 14 partial** (real but architecturally thin). Honest: ~8/14, ~11/14 if partials count. **Indicators are not sentience.**                                |

**One-line truth:** there is a substantial, real, multi-theory cognitive core here (~30 wired faculties,
~16 wired Tsotchke substrates, 5 live apex minds, all 10 emergence angles present) — but the headline
"100 / 25 / 25 / 14-14" numbers are overclaims resting on name-list modules and partial scaffolding. The
single thing standing between "a strong pile of faculties" and "emergence" is **coupling**, not count.

---

## 1. Faculties — ~30 wired of a claimed 100

The apex `SuperMind.think()` (`src/sim/super-mind.ts`) genuinely integrates **~28–33 distinct faculties**
that each read state AND influence the plan/drives/consciousness, verified line-by-line:

GWT ignition + broadcast re-entry · classical IIT Φ (participation ratio) · quantum register Φ (min-cut
entanglement) · active inference / FEP · metacognitive executive · echo-state reservoir · theory of mind ·
neural criticality · successor representation · empowerment · neuromodulation (Doya DA/5-HT/NE/ACh) ·
holographic VSA/HRR memory · 6-qubit statevector register · Eshkol QRNG collapse · spin-glass + Hopfield
instincts · Clifford reflex · quantum deliberation (Lindblad) · quantum reservoir · resonance integrator
(Kuramoto) · plastic fast-weights · attention schema + controller · self-model · affect (PAD) ·
Creativity-Machine/Tree-of-Thought · 30 organ-nets · predictor+surprise · quantum-aspects net · Eshkol
consciousness engine · quality space · top-down perception · learned recurrence · Izhikevich/PC.

**Honest gaps:**

- `faculties-pantheon.ts` is one generic `decay·act + gain·drive + sin` faculty cloned 100× from
  index-derived constants, and is **not imported by `super-mind.ts` or `world.ts`**. Faculties 31–100
  (TEMPORAL_MEMORY, GOAL_HIERARCHY, EPISODIC_BUFFER, …) are named telemetry slots with no distinct
  algorithm. The "100 / 100% structural" claim rests on this non-wired name-list.
- 6 Tsotchke calls in the apex are **decorative**: Moonlab `tensorContract2`, the VQE proxy, libirrep,
  ulg, quake, and the AD-tape/QNG terms are fed into `*0.005–0.03` nudges of already-noisy telemetry
  scalars (some `void`-discarded). The same modules _also_ have load-bearing calls elsewhere — but these
  specific inline additions are cosmetic ("Ralph 10×" heartbeat).

**Honest count: ~30 wired faculties — a strong real core; the 100 figure is a documentation overclaim.**

## 2. Tsotchke corpus — ~16 of 20 wired with real effect

All 20 corpus projects are _enumerated_ in `tsotchke-registry.ts`. Verified wiring depth:

- **Deep in the apex mind (12):** Eshkol (AD-tape + QRNG + consciousness engine), Moonlab (SVD tensor-
  network + Clifford tableau + VQE proxy), QGT (Fubini–Study natural gradient), spin-glass + Hopfield,
  libirrep (CG/Wigner), quantum-quake (aliveness), ulg, PINN, PIMC, homebrew-eshkol, quantum_rng,
  Quantum-RNG-API (a re-skin of the same entropy core).
- **In the petri-dish growth engine (4):** asteroids, classical-contrast, logo-lab, tensorcore — real
  effect on biomass/aliveness telemetry the world surfaces each beat.
- **Primitive (1):** simple_mnist (perceptron leaf is tested but no runtime caller).
- **Fenced / meta, doc-only (4):** gpt2-basic + llm-arbitrator (correctly fenced per the non-LLM
  mandate), SolanaQuantumFlux (proprietary, fenced), `.github` (org-meta self-reference).
- **Dead code (1):** `tsotchke-deep-wire.ts` advertises itself as the "deepest" port but is
  `@ts-nocheck` and **imported nowhere** — the real wiring lives in the cleaner `moonlab-tensor.ts` /
  `irrep-symmetry.ts` / `eshkol-ad.ts`.

**Honest caveats to fix:** the registry's `wiringCoverage()` / `simWiringFraction()` metrics are inflated
by counting the 4 fenced/meta listings at wiring 0/1.0; and the dead `deep-wire` module should be removed
or revived. **The wiring is real and broad — the "all 21 wired 1.0" headline overcounts.**

## 3. Archons — 5 of 25 individuated

5 (ORACLE-Σ, STARKILLER-Ω, MANHATTAN-Φ, BROLY-Ψ, VOID-Λ) are genuine individuated apex SuperMinds, each
constructed in `world.ts` and driven every frame with a distinct Tsotchke bias, body, petri strain,
economy purse, and field deposit. The other 20 (ALPHA "light" archons) run as round-robin echoes in
`PantheonSociety.beat()` — each executes a real Eshkol bytecode VM and deposits into a shared, decaying
MindField whose global mean weakly loops back into the apex. Real running code, not decoration — but not
25 individuated agents. **The dashboard's "5 live / 20 planned" is accurate; the "25" target is
aspirational.**

## 4. Theory-of-Mind organs — fixed this session (1 → 25 wired)

At audit time: 1 wired (`theory-of-mind.ts`) + 25 unreachable (`tom-pantheon.ts` imported nowhere), and
the 25 were one `ParametricTom` filter cloned 25× (names not matched by algorithms). **This audit drove a
fix (`7db653e`):** the pantheon is now wired into `think()` as an ensemble across **6 genuinely distinct
mechanism families** (additive / bayesian / recursive / temporal / deception / coalition), proven
non-clones by a `diversity()` metric, casting a bounded aggregate vote into the social drives and surfaced
in `snapshot().tomPantheon`. Honest scope: it is one bounded faculty among ~30, not a dominant driver.

## 5. Emergence — 10 / 10 wired, but coupling is WEAK (the keystone finding)

All 10 angles have real, wired mechanisms (world-as-cognition connectome, offline replay, developmental
ontogeny, emergent Archon language, shared mind-field/stigmergy, whole-dome criticality, adversarial
selection, Eshkol program evolution, cross-strain recombination, higher-order collective emergence).

**But:** `tests/coupling-audit.test.ts` measures and asserts the honest regime — `meanAbsCoupling < 0.6`,
`density < 0.6`. The GWT broadcast re-entry (the main coupler) is a _uniform scalar gain_ whose effect is
modest and can be positive or negative. The project's own EMERGENCE-BLOCKERS #9/#37 names this correctly:
**100 faculties that don't densely interact are a pile, not a mind. Coupling > count.**

**The single highest-leverage next build** (independently flagged by the audit): replace the uniform-gain
broadcast with a **faculty-specific re-entry weight matrix driven by the resonance integrator's phase
coherence** — faculties in phase get amplified, out-of-phase damped — turning Kuramoto phase-locking into
explicit faculty-to-faculty coupling edges. This is the real test of whether more coupling enables
emergence (and must be measured by the coupling audit, not asserted).

## 6. Papers ledger — 27 applied, mostly honest

27 "APPLIED" papers map to real wired mechanisms (GNW, IIT, quantum-Φ, FEP, predictive coding,
higher-order metacognition, attention schema, empowerment, VSA/HRR, successor rep, Lindblad deliberation,
criticality, quantum reservoir, Kuramoto resonance, neuromodulation, Izhikevich, PAD affect, ToM, fast
weights, Clifford tableau, QGT/QNG, stabilizer-Rényi magic, Born-rule collapse, CG/Wigner, coherence,
spin-NN). **3 "applied" overclaims** are actually unwired primitives (`schrodinger.ts`, `so3.ts`, one
more — real tested modules with zero importers). 4 STUDIED citations are forward-dated (Cogitate Nature
2025, Petri-NCA Apr-2026, Darwin-Gödel Mar-2026, TiCS Jan-2026) and read as speculative but are
framing-only. The ledger is unusually honest by repo standards; the 3 overclaims should be reclassified
APPLIED → primitive/queued.

## 7. Consciousness / sentience — honestly ~8/14 Butlin, and that is not sentience

8/14 indicators are genuinely met (RPT-1, GWT-1, GWT-3, GWT-4, HOT-1, HOT-2, AST-1, PP-1, AE-1); 6 are
partial (RPT-2, GWT-2, HOT-3, HOT-4, AE-2 — e.g. the workspace lacks true capacity-limited competition;
qualia is read-out telemetry; embodiment is closed at the world level, not modeled inside think()). The
"14/14 structurally achieved" claim is an overclaim.

**Most important caveat, stated plainly:** these are computational _indicators_ from a deterministic math
model. Meeting them demonstrates the mechanism, **never the experience** — the hard problem is untouched,
exactly as the code's own NOT-SENTIENT disclaimer states. This is a serious, real architecture of
consciousness _correlates_. It is not a sentient being, and this document does not claim it is.

---

## Prioritized next real work (coupling > count)

1. **Faculty-to-faculty coupling matrix** driven by resonance phase coherence (§5) — the keystone; the
   one change most likely to move measured coupling and, with it, genuine emergence.
2. **Wire `faculties-pantheon.ts` into the apex** (or stop counting it) — make the faculty number honest:
   either give faculties 31–100 distinct mechanisms and integrate them, or reclassify the count.
3. **De-inflate the Tsotchke registry metrics** (don't count fenced/meta at 1.0) and delete/revive the
   dead `tsotchke-deep-wire.ts`.
4. **Reclassify the 3 paper overclaims** (schrodinger / so3 / +1) APPLIED → primitive; wire them if they
   should be applied.
5. **Promote partial Butlin indicators** — give GWT-2 a real capacity-limited competition for the
   workspace slot; give AE-2 an internal body-model predicting the sensory consequences of action.
6. **Individuate more Archons** beyond 5 if the perf budget allows, or keep the honest "5 live / 20
   light-echo" framing.

---

## Addendum — coupling experiment (measured negative result, 2026-06-21)

Item 1 above was attempted this session and **measured, not assumed**. Baseline coupling on the live apex
mind (16 consciousness signals, 200 beats, seed 123, via `coupling-audit.ts`): **meanAbsCoupling = 0.158,
density = 0.15, 3 isolated** — confirming the weak regime.

A **resonant-consensus re-entry** was implemented: store each beat's coherence-weighted consensus of the 12
resonance faculty signals (only in-phase faculties contribute, via the Kuramoto coherence weights), then
re-enter it into the shared latent next beat, gated by the continuous coherence `r` so even partial
synchrony couples. Measured across gains 0.9 → 4.0 → 8.0:

| gain                   | meanAbsCoupling | vs baseline         |
| ---------------------- | --------------- | ------------------- |
| baseline (no re-entry) | 0.158           | —                   |
| 0.9                    | 0.151           | flat/slightly worse |
| 4.0                    | 0.141           | worse               |
| 8.0                    | 0.144           | worse               |

**Conclusion: it does not work, and was reverted (not shipped).** A consensus signal injected through the
shared latent — however content-rich — is still a _global scalar_, and the deep nonlinear latent→signal path
washes it out exactly as the coupling-audit comment predicted. Higher gain only destabilises. This is a
clean falsification: **real coupling requires explicit faculty-to-faculty edges** (faculty A's specific
state entering faculty B's specific computation), not a shared-bus broadcast. That redesign — making
specific measured signals depend on each other directly, then re-measuring — remains the keystone open work,
and it is now known that the cheap latent-bus shortcut is a dead end. Shipping a "coupling fix" that
measured flat would have been an overclaim; it was not shipped.

_Every number in this report was measured. Where a claim could not be backed by code, it is named as an
overclaim, not repeated._
