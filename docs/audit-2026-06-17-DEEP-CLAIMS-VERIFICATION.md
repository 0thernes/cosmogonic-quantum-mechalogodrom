# Deep Claims Verification — Audit Pass 2 (2026-06-17)

**Method:** cold-shell, Bun 1.3.14. Every claim below was executed, not read. Tolerances are the ones the
suite actually asserts; mathematical claims were independently re-derived. Governed by the trinity
(Broly / Starkiller / Dr. Manhattan): _if it is not measured, it is not real._

## 1. Quantum substrate — falsifiable physics, all green

| Claim                                                   | Asserted tolerance / control                                                     | Independent check                                 | Verdict                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| Stabilizer 2-Rényi **magic of T\|+⟩ = log₂(4/3)**       | `\|m.magic − log₂(4/3)\| < 1e-9`, `stabilizer === false`                         | re-derived: log₂(4/3) = **0.415037**              | ✅ exact                                     |
| Clifford-reachable states have **zero magic**           | `\|000⟩`, `\|+⟩³`, GHZ₃, S\|+⟩ all `< 1e-9`                                      | Gottesman–Knill: Clifford ⇒ stabilizer ⇒ 0 magic  | ✅ correct controls                          |
| **Unitarity** H·H = I                                   | `1e-12` on a scrambled state                                                     | textbook involution                               | ✅                                           |
| **Born normalization** Σp = 1                           | `1e-9` after a 300-gate seeded random circuit                                    | probability axiom                                 | ✅                                           |
| **QGT** Fubini–Study metric                             | symmetric, PSD-diagonal, finite; **QFI = 4·g = 1** to 1e-4                       | QFI = 4×Fubini–Study (Stokes 2020)                | ✅                                           |
| Amplitude amplification is **unitary**                  | norm preserved across iterations; phaseFlip leaves Born probs unchanged to 1e-12 | Grover step ∈ U(N)                                | ✅                                           |
| **Determinism**: same seed + drivers ⇒ identical psyche | `JSON.stringify(a) === JSON.stringify(b.snapshot())`; Born collapse bit-for-bit  | seeded mulberry32, child stream for the qubit RNG | ✅ genuine bit-replay incl. quantum collapse |

Suite tallies (each green): quantum 33 · quantum-geometry 3 · QNG 14 · coherence 4 · magic 6 ·
super-qubits 16 · clifford-tableau 9 · eshkol-qrng 7.

## 2. Cognitive faculties — wired, not decorative

The per-beat decision is a real **argmax over the 7-plan vocabulary** (`super-mind.ts`): drive scores
`[energy, threat, prey, rival, novelty, wealth]` plus the expected-free-energy vote (active inference),
the model-based look-ahead (successor representation), and the empowerment/holographic terms all bias
plan selection with bounded weights; the chosen plan is then `observe()`d by the successor, empowerment,
and holographic faculties (closing the learning loop). Confidence (metacognition) gates explore/commit.
All faculty suites green: active-inference 7 · ToM 5 · successor 9 · empowerment 7 · neuromodulation 5 ·
holographic 7 · metacognition 6 · criticality 5 · spin-glass 5 · super-mind 6.

## 3. Honesty boundaries re-confirmed

- **Clifford tableau is present + tested (9 tests) but NOT wired** into the apex mind — imported only by
  its own test. Any prose implying it is fused into cognition remains corrected.
- **Φ and magic are measured of _different_ systems** (register Φ vs. classical IIT proxy) — the reports
  flag this explicitly; the proxy is never called "the amount of consciousness."
- **"Quantum" is an exact algebra on amplitudes** in a deterministic sim — not a physical QPU.

## 4. New structural guard added this pass (GOV-DOC)

The published test-count / coverage figures drifted repeatedly across prior passes (agents wrote a number
they _believed_, e.g. "1,166", instead of one they _measured_). This is now **mechanically impossible**:

- `scripts/canonical-receipts.ts` — single source of truth for the measured triple.
- `scripts/verify-receipts.ts` — runs the real gate, parses the true count + coverage, **fails CI** if
  the canonical constants have drifted from reality (`bun run verify:receipts`, wired into `check` + CI).
- `tests/docs-receipts-law.test.ts` — fast guard: **fails** if any public surface publishes a test-count
  or coverage figure other than the canonical one. Comma-anchored so years (e.g. "Ferrante 2025") never
  false-positive.

Together: you cannot ship a receipt you did not measure.

---

_Verified 2026-06-17, Bun 1.3.14, Intel Xeon @ 2.90 GHz / 2 cores / Linux x86_64. Canonical gate at the
time of this audit: **1,052 tests / 0 fail · 94.67 % line / 91.29 % function** coverage._
