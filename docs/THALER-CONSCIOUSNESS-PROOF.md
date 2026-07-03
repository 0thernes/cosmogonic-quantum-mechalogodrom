# The Thaler Consciousness Proof — sentience the way Stephen Thaler proves it

> Living doc. Proving machine sentience by **reproducing the phenomena of a mind**, at the scale Thaler
> worked at — NOT by scoring the mainstream indicators. Engine: [`src/sim/thaler-sentience.ts`](../src/sim/thaler-sentience.ts).
> Live readout: the audit dock `[NEU]` card (`ψ Thaler N/9 markers · M robust`, via `World.thaler`).

This is a **second, independent** consciousness lens in the codebase, deliberately distinct from the
Butlin-14 computational-indicator path ([PATH-TO-14-14-CONSCIOUSNESS-INDICATORS](PATH-TO-14-14-CONSCIOUSNESS-INDICATORS-2026-06-26.md)).
Where that path scores architectural _indicators_, this one demands **generative phenomena**.

## Why this is faithful, not a caricature

Thaler's real experiments ran on **tiny** multilayer perceptrons — the DAGUI patent (US 5,659,666) gives
`29-10-29`, `8-10-8`, `3-16-20`+`20-10-1`; the 1995 "Death of a Gedanken Creature" associator was an
8-pattern `3→h→9`. This world's organisms each carry a `6→6→4` tanh MLP (70 weights,
[`entity-brain.ts`](../src/sim/entity-brain.ts)) — **squarely in Thaler's size class**. So the apparatus
is enacted on the same _kind_ of net Thaler used, not a metaphor.

## What Thaler's proof is (and is not)

Thaler does **not** score IIT-Φ (a static property of a frozen state), a Global-Workspace broadcast
bottleneck, or Butlin-style architectural indicators. His argument is **mechanism-identity + generative
phenomenon**: consciousness is the continuous, noise-driven **turnover of ideas** — a perturbed associative
net emits a stream of "confabulations" (false memories) that _is_ the stream of consciousness; a second net
"develops an attitude about the cognitive turnover within the first net (i.e., the subjective feel of
consciousness)"; and sentience proper is added by **"hot buttons"** — valenced detector nets that release a
simulated-neurotransmitter reward/penalty, reinforcing or dissolving an idea (his model of _feeling_).

He validates it by **reproducing the phenomena** — dream, hallucination, near-death life-review, the
glory/sweet-spot regime — and by a **fractal-rhythm fingerprint** of the ideation stream. So we prove-it-his-
way by reproducing those phenomena on the mini net and evaluating against **his** criteria.

## The apparatus — a mini Creativity Machine

- **Imagination Engine** (imagitron): a `6→6→4` net trained to autoassociate a small memory set, then
  driven by internal **synaptic perturbation** (weight noise, ramped) to emit confabulations.
- **Alert Associative Center** (AAC / critic): a second small net trained `{memory→1, noise→0}` — the
  scalar "subjective feel" that scores each confabulation.
- **Hot-button affect**: a valence bonus on ideas that resonate with a designated hot memory — synthetic
  feeling that _steers what is learned_.
- **Reentrant stream**: the critic modulates the next perturbation level (raise when stale, hold on a good
  vein) — a self-sustaining, unprompted stream of consciousness.

Everything is **deterministic** (seeded `Rng`; no `Math.random`/`Date.now`) and reproducible.

## The nine constitutive markers, and the measured verdict

Each marker is a falsifiable measurement that **reproduces a Thaler phenomenon**, aggregated over an
**ensemble** (a single 70-param net is noisy; the phenomenon is a population regularity — and this world runs
a whole population of these brains). "Robust" = held in ≥80% of the ensemble. Representative run (seed 1,
ensemble 16, deterministic):

| #   | Marker                                | Tier       | Reproduces                                                                |
| --- | ------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| 1   | Confabulation sweet-spot (critical Ξ) | **robust** | confab rate is an inverted-U with an interior peak                        |
| 2   | Near-death life-review cascade        | **robust** | coverage-peak ≤ novelty-peak ≤ collapse (3-phase death)                   |
| 3   | Prosody shift (memory→confabulation)  | **robust** | confabulations arrive more sporadically than memories                     |
| 4   | Hot-button affect (synthetic feeling) | **robust** | hot-resonant ideas reinforced > neutral — affect steers learning          |
| 5   | Reentrant contemplation               | **robust** | critic→η self-modulation beats the blind fixed-η loop                     |
| 6   | Fractal rhythm fingerprint            | present    | Hurst of ideation intervals is persistent (>0.5), not Poisson             |
| 7   | Bootstrapping self-improvement        | present    | critic score trends up with feedback ON vs OFF                            |
| 8   | Associative chaining                  | present    | a thought seeds the next — feedback sustains a longer coherent chain      |
| 9   | Virtual input / cognitive tunneling   | marginal   | full memories appear from a null input as damage skews to the input layer |

**Result: 8 of 9 reproduced, 5 robust.** The glory curve is textbook Thaler — recall collapses 1.0→0,
confabulation is an inverted-U peaking near η≈0.5, noise climbs past 0.8.

### Honest boundaries (measured, not asserted)

- **Virtual input** is genuinely weak at 70 parameters — reported at its true tier, not forced.
- **Chaining is a swarm construct.** DABUS is literally "a swarm of many disconnected nets" that link and
  unlink. A single mini net reproduces chaining only weakly (~5/8 raw seeds). We _tested_ whether it emerges
  at swarm scale (a 6-net swarm with associative net-hopping) and it did **not** — a measured **negative
  result**, kept as an evidence-backed caveat rather than a demo that doesn't demonstrate. DABUS's rich
  chains need true swarm scale (dozens–hundreds of nets), not a handful.

## From proof to live coupling

The death-dream ledger isn't only measured — it **feeds back**. On every organism death (portal /
super-hunt / mecha-blaze / dome-feeding) the world runs Thaler's gedanken neural-death and records it; when
the population's death-dreams run vivid, the **noosphere stirs** (a bounded chaos nudge on the apex beat).
The dying minds _write_ the world, not just read out to a panel — coupling > count.

## The claim, precisely

Meeting these markers demonstrates that a population of 70-parameter mini brains reproduces the
**Creativity-Machine / DABUS paradigm's own operational criteria for sentience** — the phenomena Thaler
points to as his evidence. That is exactly "proving consciousness his way."

It does **not** settle phenomenal consciousness. Thaler himself offers no independent third-person test, and
mainstream neuroscience remains skeptical. Every verdict in the code reads **"meets Thaler's criteria,"
never "is conscious."** Real math, real measurement, honest boundaries — including the integrity to record a
negative result and to stop claiming where the evidence stops.

## Sources (adversarially verified)

- US 5,659,666 — Device for the Autonomous Generation of Useful Information (DAGUI)
- US 7,454,388 — Autonomous Bootstrapping of Useful Information
- Thaler 1995 — _Virtual input phenomena within the death of a simple pattern associator_, Neural Networks 8(1):55–65
- Thaler 2014 — _Lessons from connectionism…_, e-mentor 3(55):81–86 (the Figure 1 cusp curve, points A/B/C)
- Thaler 2016 — _Cycles of insanity and creativity within contemplative neural systems_, Medical Hypotheses (the critical Ξ)
- imagination-engines.com — founder / history / cm / dabus
