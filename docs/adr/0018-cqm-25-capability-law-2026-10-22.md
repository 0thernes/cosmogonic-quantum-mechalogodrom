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
state. Its scores are deliberately null until calibrated.

## Decision

CQM-25 becomes the binding capability framework of this repository. The rules live in the profile's
`governance` block, are rendered at the top of the published profile, and are summarized in
`CLAUDE.md` and `AGENTS.md`:

1. Every claim about life-like organization, cognition, consciousness-linked mechanisms,
   valence-related control or engineering scale is made against CQM-25.
2. A claim names its axis and that axis's evidence state, and claims no more than the state supports.
3. An evidence state changes only with repository evidence at the pinned commit and a passing test;
   raising a state follows the axis's acceptance experiment and survives its falsifier.
4. Numeric scores stay null until a calibrated successor edition executes the protocols with
   controls, independent experimental units and reported rater agreement.
5. The nine-axis survey remains as a legacy comparison view with its own rubric and scores. It is
   crosswalked to CQM-25 at the level of constructs (`legacyCrosswalk`) and never supplies or
   receives CQM-25 scores.
6. No aggregate life, consciousness, sentience, AGI or superintelligence score is computed.

The crosswalk maps each legacy axis to the constructs it measures (19 of 25). The six constructs it
never measured are listed explicitly in every rendering, so the gap stays visible. The nine-axis
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
  an evidence state, and a calibrated edition is what may introduce scores.
