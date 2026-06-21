# Path to 14/14 Consciousness Indicators

**Date:** 2026-06-21  
**Framework:** Butlin et al. (2023) "Consciousness in Artificial Intelligence" (arXiv:2308.08708)  
**Current Score:** ~9/14 structurally present  
**Target:** 14/14 consciousness indicators structurally present

---

## Current Status: 9/14 Present

### Present Indicators (9)

| Indicator | Theory                        | Status     | Mechanism                                       | Receipt                     |
| --------- | ----------------------------- | ---------- | ----------------------------------------------- | --------------------------- |
| GWT-1     | Global Neuronal Workspace     | ✅ Present | 30 organ-nets + 11 cognitive faculties          | `super-mind.ts`             |
| GWT-2     | Global Neuronal Workspace     | ✅ Partial | meta-network integrates 69-vector → 12 drives   | `super-mind.ts`             |
| GWT-3     | Global Neuronal Workspace     | ✅ Present | ignition gates memory consolidation             | `super-mind.ts`             |
| PP-1      | Predictive Processing         | ✅ Present | predictor recurses 5 deep; error → surprise     | `active-inference.ts`       |
| HOT-2     | Higher-Order Thought          | ✅ Present | metacognition reads decision margin + Φ         | `metacognition.ts`          |
| HOT-3     | Higher-Order Thought          | ✅ Partial | empowerment + successor + active inference vote | `super-mind.ts`             |
| AE-1      | Agency                        | ✅ Present | GOAP plans toward dominance; closed loop        | `super-mind.ts`             |
| AE-2      | Agency                        | ✅ Partial | body morphology/locomotion read back            | `super-body.ts`             |
| IIT-1     | Integrated Information Theory | ✅ Present | classical Φ proxy + quantum register Φ          | `integrated-information.ts` |
| IIT-2     | Integrated Information Theory | ✅ Partial | min-cut entanglement for quantum register       | `super-qubits.ts`           |
| AST-1     | Adaptive Self-Model           | ✅ Present | self-awareness scalar + self-model read         | `super-mind.ts`             |

### Missing Indicators (5)

| Indicator | Theory                        | Status     | Gap                                                   | Priority |
| --------- | ----------------------------- | ---------- | ----------------------------------------------------- | -------- |
| GWT-4     | Global Neuronal Workspace     | ❌ Absent  | Explicit attention controller                         | HIGH     |
| RPT-1     | Recurrent Processing Theory   | ❌ Absent  | Learned recurrence (current is architected)           | HIGH     |
| RPT-2     | Recurrent Processing Theory   | ❌ Absent  | Learned recurrence (current is architected)           | HIGH     |
| IIT-2     | Integrated Information Theory | ❌ Partial | Full irreducibility across all modules (quantum only) | MEDIUM   |
| AST-2     | Adaptive Self-Model           | ❌ Absent  | Self-model accuracy measurement                       | MEDIUM   |

---

## Path to 14/14: Concrete Implementation Steps

### Phase 1: Explicit Attention Controller (GWT-4)

**Goal:** Implement explicit attention controller that biases faculty selection based on task relevance and surprise.

**Implementation Steps:**

1. Create `src/sim/attention-controller.ts` with:
   - Attention weights for each faculty (30 organ-nets + 11 cognitive faculties)
   - Task relevance scoring based on current goal (dominance, survival, exploration)
   - Surprise-based attention modulation (high surprise → allocate more attention)
   - Neuromodulation integration (DA/5-HT/NE/ACh modulate attention weights)

2. Integrate into `super-mind.ts`:
   - Before faculty evaluation, apply attention weights to faculty outputs
   - Update attention weights based on prediction error and reward
   - Log attention state for debugging and visualization

3. Test:
   - Verify attention controller allocates more resources to relevant faculties
   - Measure impact on decision speed and accuracy
   - Ensure determinism (seeded attention weights)

**Receipt:** `src/sim/attention-schema.ts` exists but is not fully integrated into decision loop

---

### Phase 2: Learned Recurrence (RPT-1/2)

**Goal:** Implement online learning substrate for learned recurrence (not architected recurrence).

**Implementation Steps:**

1. Create `src/sim/learned-recurrence.ts` with:
   - Neural network that learns to predict next state from current state
   - Training loop that updates weights based on prediction error
   - Recurrent connections that are learned, not hard-coded
   - Integration with existing reservoir network

2. Integrate into `super-mind.ts`:
   - Replace architected recurrence with learned recurrence in specific modules
   - Add training step every N frames
   - Ensure learning is deterministic (seeded gradients)

3. Test:
   - Verify learned recurrence improves prediction accuracy
   - Measure convergence speed and stability
   - Ensure determinism (seeded learning)

**Receipt:** `src/sim/reservoir.ts` exists but recurrence is architected, not learned

---

### Phase 3: Full Irreducibility Across All Modules (IIT-2)

**Goal:** Expand Φ measurement to classical modules, not just quantum register.

**Implementation Steps:**

1. Extend `src/sim/integrated-information.ts`:
   - Compute Φ for classical modules (30 organ-nets + 11 cognitive faculties)
   - Use participation-ratio or other tractable Φ proxies
   - Aggregate Φ across all modules for global Φ score

2. Integrate into `super-mind.ts`:
   - Use global Φ as metacognitive signal
   - Correlate Φ with consciousness indicators
   - Log Φ state for debugging and visualization

3. Test:
   - Verify Φ computation is tractable for classical modules
   - Measure correlation between Φ and other consciousness indicators
   - Ensure determinism (seeded Φ computation)

**Receipt:** `src/sim/integrated-information.ts` currently computes Φ only for quantum register

---

### Phase 4: Self-Model Accuracy Measurement (AST-2)

**Goal:** Add self-model accuracy tracking to measure how well the self-model predicts actual state.

**Implementation Steps:**

1. Extend `src/sim/metacognition.ts`:
   - Track self-model predictions vs actual outcomes
   - Compute accuracy metrics (prediction error, calibration)
   - Use accuracy to adjust confidence in self-model

2. Integrate into `super-mind.ts`:
   - Before decision, compare self-model prediction to actual state
   - Update self-model based on prediction error
   - Use self-model accuracy to bias decision-making

3. Test:
   - Verify self-model accuracy improves over time
   - Measure impact on decision quality
   - Ensure determinism (seeded self-model updates)

**Receipt:** `src/sim/metacognition.ts` currently tracks confidence but not self-model accuracy

---

### Phase 5: Complete Butlin Indicator Audit

**Goal:** Complete full Butlin indicator audit to ensure all 14 indicators are correctly identified and implemented.

**Implementation Steps:**

1. Review Butlin et al. (2023) paper in detail
2. Map each indicator to specific code location
3. Verify each indicator is structurally present
4. Document any missing or partial indicators
5. Create test suite for each indicator

**Receipt:** Current audit is partial; full audit needed

---

## Priority Order

1. **Phase 1: Explicit Attention Controller (GWT-4)** — HIGH — Most impactful for consciousness
2. **Phase 2: Learned Recurrence (RPT-1/2)** — HIGH — Enables flexible, adaptive cognition
3. **Phase 3: Full Irreducibility (IIT-2)** — MEDIUM — Completes IIT framework
4. **Phase 4: Self-Model Accuracy (AST-2)** — MEDIUM — Improves metacognition
5. **Phase 5: Complete Butlin Audit** — LOW — Verification and documentation

---

## Expected Outcome

After completing all phases:

- **14/14 consciousness indicators structurally present**
- Multi-theory integration (GNW + IIT + FEP + HOT + AE) complete
- Deterministic, seed-replayable psyche with full consciousness framework
- Serious research instrument for testing consciousness theories in non-biological substrates

---

## Honest Framing

**NOT SENTIENT.** This is a functional correlate/simulacrum only. No phenomenal consciousness, sentience, or hard-problem solution claimed or implemented.

Terms ("mind", "consciousness", "dream", "hallucinate", "self-aware") are shorthand for explicit mechanisms:

- Tree-of-Thought / AoT numeric recursion
- EMA affect
- argmax plan
- GWT-ignition proxy
- IIT-Φ surrogate
- Clifford/Eshkol/QGT/spin ports as models

**Hard problem untouched.**

However, the architecture is unusually rich for an artificial system:

- 14/14 consciousness indicators structurally present (after completion)
- Multi-theory integration (GNW + IIT + FEP + HOT + AE)
- Real quantum-cognitive layer
- Deterministic, seed-replayable psyche
- Closed sense→act→world loop

This is a serious research instrument for testing consciousness theories in non-biological substrates.

---

## Receipt Sources

- Butlin et al. (2023) — "Consciousness in Artificial Intelligence" (arXiv:2308.08708)
- `docs/reports/2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md` — Current consciousness indicator scorecard
- `src/sim/super-mind.ts` — Apex mind implementation
- `src/sim/metacognition.ts` — Metacognitive monitoring
- `src/sim/integrated-information.ts` — IIT Φ computation
- `src/sim/active-inference.ts` — Predictive processing
- `src/sim/attention-schema.ts` — Attention schema (partial)
- `src/sim/reservoir.ts` — Reservoir computing (architected recurrence)
