# ADR 0018 — CQM-25 is the capability law

Status: accepted 2026-10-22 at the owner's direction.

## Context

Capability claims in this repository were made against the nine-axis, 155-system A-Life survey
(reproduction, open-endedness, ecology, morphology/physics, cognition/learning, substrate
pluralism, instrumentation, consciousness-theory, visual scale). That survey is a useful peer
comparison, but it cannot carry the repository's claims on its own:

- Two of its axes merge distinct constructs (body with physics; seven cognitive functions in one
  ladder), so a single number hides which part was shown.
- It has no axis for individual organization and viability (individuality, self-maintenance,
  homeostasis, repair), social cognition, or valence-related control. A system can score well on
  it while those questions stay unexamined.
- Its 0-5 ratings are rubric judgments. They do not state an acceptance experiment or a falsifier.

CQM-25 (`docs/alife/cqm-capability-profile.json`) defines 25 operational constructs, each with a
scope, measures, an acceptance experiment, a falsifier, primary sources and a repository evidence
state. Its canonical `assessment.score` fields are deliberately null until calibrated.

## Decision

CQM-25 framework version 1.0.0, adopted 2026-10-22, is the binding capability framework of this repository. Profile schema version 2 adds governance and crosswalk serialization without changing the framework taxonomy; the separate provisional-estimates dataset retains schema version 1. The rules live in the profile's
`governance` block, are rendered at the top of the published profile, and are summarized in
`CLAUDE.md` and `AGENTS.md`:

1. Every claim about life-like organization, cognition, consciousness-linked mechanisms,
   valence-related control or engineering scale is made against CQM-25.
2. A claim names its axis and that axis's evidence state, and claims no more than the state supports.
3. An evidence state changes only with repository evidence at the pinned commit and a passing test;
   raising a state follows the axis's acceptance experiment and survives its falsifier.
4. Canonical numeric capability scores stay null until a calibrated successor edition executes the protocols with
   controls, independent experimental units and reported rater agreement.
5. The nine-axis survey remains as a legacy comparison view with its own rubric and scores. It is
   crosswalked to CQM-25 at the level of constructs (`legacyCrosswalk`) and never supplies or
   receives CQM-25 scores.
6. No aggregate life, consciousness, sentience, AGI or superintelligence score is computed.
7. The owner-requested `docs/alife/cqm-capability-estimates.json` is a separate provisional author-estimate layer with a declared uncalibrated heuristic rubric, source provenance and submitted rationales pending independent review. It never populates canonical `assessment.score`, establishes measured capability or publishes an overall/domain mean or aggregate verdict.

The crosswalk records conceptual correspondence from each legacy axis to 19 of the 25 constructs. The six not separately represented are social communication, individuality, resource maintenance, homeostasis, repair/resilience and valence trade-offs, and are listed explicitly in every rendering. This mapping establishes neither measurement nor validation of any CQM-25 protocol; no score or validation transfers. The nine-axis
radar now labels each spoke with its CQM-25 axis numbers and calls itself the survey view.

## Consequences

- `scripts/gen-capability-profile.ts` rejects a profile without canonical governance, without all
  nine legacy axes in survey order, or with a CQM-25 axis mapped to two legacy axes.
- `tests/cqm-capability-law.test.ts` fails if the law disappears from the steering files, the
  contract, the profile or the gallery order, or if the crosswalk drifts from the survey's axes.
- The 155-system scores, statistics and rankings are unchanged; nothing is re-scored.
- CQM-25 binds claims made here. It is author-defined and is not presented as an external consensus
  standard; existing benchmarks (Avida, MODES, EvoGym, Animal-AI, Melting Pot, Brain-Score) remain
  the reference protocols where they apply.
- Calibration is the next step: executing an axis protocol end to end, with controls, is what moves
  an evidence state, and a calibrated edition is what may introduce canonical capability scores. The separately labeled provisional author estimates remain uncalibrated proposals under rule 7.
