# ADR 0017 — Xylos autonomous manifold and explicit entropy boundary

Status: accepted for the requested Xylos creature.

## Context

The owner requested a new alien organism with a small promptless, tokenless neural
brain and nondeterministic operation. The repository otherwise makes simulation
randomness reproducible from an injected seed. The supplied conceptual discussion
also misidentified Butlin's actual indicators and treated a scalar coherence score
as proof of subjective experience. Neither mistake belongs in the implementation.

## Decision

Give one new organism its own sparse recurrent neural state, geometric attenuation,
plastic edges, workspace competition, predictive perception, attention prediction,
and learned action consequences. Reuse the existing Eshkol workspace softmax
primitive. The six specialist groups are numerical perceptual channels; they are
not six independently trained general-purpose intelligences.

Acquire browser entropy exclusively in `src/core/xylos-session.ts`. Inject it into
the core as a bounded numerical sample. Seeded mode omits that external sample;
the core's own stochastic rewiring uses its isolated `Rng`. Live mode is the
owner-requested default. Seed-only replay of the whole world is no longer promised
when this mode writes shared chemistry. Browser entropy is not claimed to be
irreducible physical or quantum randomness.

Record complete numeric senses and entropy samples in a capped input tape, starting
from a fresh brain. Local replay reconstructs that brain exactly and disables its
habitat writes. It does not rewind the rest of the cosmos. Recording stops visibly
at capacity while autonomous operation continues. No persistence, network calls,
model downloads or new dependencies are needed.

Read the local Gray–Scott U/V fields and U gradients, then write a one-cell-radius
disturbance at most twice per simulation second. The procedural body renders real
neural foci and edges inside unequal Möbius membranes. Its four fixed draw calls
own their resources and expose an idempotent teardown.

## Failure and verification

Missing browser entropy produces a visible seeded fallback. Nonfinite perception
is rejected before neural mutation; pauses consume no samples. Fixed 20 Hz
cognition permits at most four catch-up steps per frame and counts discarded work.
The inspector exposes both modes, a fresh-life recording command, local replay,
camera focus, live neural metrics and the actual fourteen research targets.

The causal tests compare broadcast, recurrence, learning and action-model controls;
they also test live-input divergence, exact local replay, bounded long runs,
chemical write-back, fixed rendering buffers and disposal. These are computational
receipts, not a declaration that all fourteen indicators have been fully satisfied.
The indicator-specific acceptance path is maintained in [XYLOS.md](../XYLOS.md).

## Consequences and exit

The seed-plus-input contract isolates experimental reproducibility from a live
stochastic world. UI mode switches are explicit and audited. Existing Archon
indicator claims are unchanged and cannot be inherited by this new organism.
Removing Xylos requires removing its World constructor/update/disposal calls and
inspector slot; existing substrates retain their independent owners and APIs.
