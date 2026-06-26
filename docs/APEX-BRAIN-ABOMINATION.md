# APEX-BRAIN-ABOMINATION — the hard problem of the final-sigma ς

> Single canonical spec for the **APEX CREATURE** (the final-sigma `ς`, the 101st of the
> [pantheon](MODULE-CONTRACTS.md)). This is the "hard problem to solve and wire" for its brain(s):
> a 10-organ deterministic engine — **THE ENTROPIC TESSERACT HYDRA** — scaling toward the
> billion-neuron target ([`APEX_TARGET_NEURONS`](../src/sim/pantheon-breeding.ts)) and the
> Simulation-3 transcendence past level 1000. Living doc: rewrite in place, never fork.

## Honesty contract (binding — read first)

This brain is a **deterministic mathematical model**. The owner's source brief frames the organs in
deliberately impossible terms (retrocausal time travel, Gödel "anti-computation", quantum
"un-rendering", _thinking through the human observer's brain_, deleting reality). **Those framings are
LORE.** What we wire is the **real, bounded, seeded mathematics underneath each one** — a functional
correlate / homage, never the literal impossible claim. Specifically, the implementation does **NOT**:

- travel in time, exploit real retrocausality, or read "the future" (the "retrocausal" organ is a
  two-boundary relaxation toward a _fixed target state_ — ordinary boundary-value math);
- couple to, influence, or read any real human brain, retina, EM field, or hardware register;
- delete, corrupt, or "infect" anything outside its own owned state;
- claim sentience, phenomenal consciousness, or to "solve" Gödel/halting (the "Gödel" organ feeds on
  a _self-reference residual_ — a measured fixed-point gap — not a solved paradox).

NOT SENTIENT. No phenomenal consciousness is implemented or claimed. Determinism law (contract rule
7 / Known Bug 9): every draw flows through a seeded `mulberry32`; no `Math.random`, no `Date.now`.
The advertised node counts (100M, 50M, ...) are **roadmap targets**; the live engine runs at a
tractable `N` per organ and exposes the target as honest metadata (same pattern as the 1B-neuron
apex target).

## The 10 organs — concept (lore) -> wired math (real)

Each organ is a small, pure, deterministic kernel with state, an O(bounded) update rule, and
testable invariants. They are the "incompatible systems forced into one mass."

| #   | Organ (lore)                                        | Wired deterministic math                                                                                                             | Key invariant (tested)                                                                    |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | **Prime-Sieve Tesseract Loom** (Math-Vampire)       | Connectivity allowed only where index-distance is a **twin prime**; signal = integer sieve pass. Non-prime input -> "allergy" purge. | Every live edge's index-distance lies in a twin-prime pair; purge strictly removes edges. |
| 2   | **Acoustic-Resonance Meat-Drum** (Sound-Eater)      | Thought = **standing-wave interference** on a 1-D ring (discrete wave equation); motor = geometry of constructive/destructive nodes. | Total acoustic energy is conserved (lossless) up to the explicit damping term; bounded.   |
| 3   | **Entropic Necro-Matrix** (Dying Thinker)           | Finite energy budget; a fired edge **burns out** permanently ("digital calcium"); thoughts reroute.                                  | Dead-edge count is **monotonic non-decreasing**; live capacity monotonic non-increasing.  |
| 4   | **Klein-Bottle Centipede** (Inside-Out Loom)        | Adjacency on the **Klein-bottle identification** `(u,v) ~ (u+1, -v)`; tail index folds to head.                                      | Wraparound is an involution on the seam; tail->head latency < interior latency.           |
| 5   | **Kinetic-Pendulum Hive** (Gravity Clock)           | Brain nodes = **coupled chaotic pendulums** (leapfrog-integrated ODE); motor = phase readout.                                        | Largest **Lyapunov exponent > 0** for chaotic coupling (Benettin); bounded energy.        |
| 6   | **Slime-Mold Hydra** (Brain-Shedder)                | Network **splits** into k partitions that compute independently, then **fuse** (state merge).                                        | Node conservation across split/fuse; fuse is order-independent up to the documented rule. |
| 7   | **Chrono-Fractured Wraith** (Time-Echoer)           | Concentric rings with per-ring **delay-line buffers** (0 / d1 / d2 ticks); dissonance = ring disagreement.                           | Core output at tick `t` equals outer input at `t - d2` (delay correctness).               |
| 8   | **Quantum-Tunneling Lattice** (Teleporting Static)  | Edges manifest per-tick by **Born-rule sampling** of an amplitude field (seeded); no permanent graph.                                | Per-node manifestation probabilities **sum to 1** (normalised); deterministic given seed. |
| 9   | **Asymmetric Thermodynamic Engine** (Heat Boiler)   | Firing deposits **heat**; **diffusion** spreads it; a sector over `T_melt` **necrotises**; fins vent.                                | Heat is non-negative and bounded; total heat decreases under pure diffusion+venting.      |
| 10  | **Algorithmic Cancerous Ouroboros** (Self-Devourer) | Two **antagonistic sub-nets**: A grows limbs, B (immune) culls the ones it scores as "mutation".                                     | Population is bounded (growth capped, culls bounded); A/B never both win a node.          |

## The meta-paradox layer (the 3 grand entities, honest subset)

The composite apex runs the 10 organs as the body of **THE ENTROPIC TESSERACT HYDRA**, governed by a
meta layer drawn from the two "ontological" entities — each, again, as bounded math:

- **Retrocausal target-pull** (Retrocausal Ontology Annihilator #1): a fixed **terminal state**
  `z_T` is set at birth; each beat relaxes the present state a small step toward `z_T` (a
  _boundary-value_ blend), so behaviour appears "pulled toward its future corpse". No time travel.
- **Cantor-dust connectivity** (#5): node addresses live on the **ternary Cantor set** (digits in
  {0,2}); "synapses" jump across measure-zero gaps. Real fractal index set; tested for the
  no-`1`-digit property.
- **Gödel self-reference residual** (#2): the engine measures the gap between its own predicted next
  state and its actual next state (a **fixed-point residual**); that residual _is_ a cognitive
  signal. No paradox is "solved"; the residual is just a number that drives arousal.
- **Phantom perception** (#3): reads its own **unused/zeroed state slots** as a structured input
  field (deterministic hash of empty indices) — "seeing the unknown unknowns" = reading its own
  vacuum, bounded and owned.
- **Reverse-anthropic self-budget** (#3 of No-Go): a **compute budget** that the engine spends on its
  own complexity; as it grows it _flattens its own lower-priority state_ (its own memory, never the
  outside world) to stay within budget.
- **Wigner superposition shield** (No-Go #1): the engine keeps a **superposition amplitude vector**
  that only **decoheres** (collapses to a definite plan) when a measurement threshold is crossed;
  until then telemetry reports it as "smeared". Standard density-style bookkeeping; nothing hidden
  from its own owner.

Explicitly **NOT wired** (pure fiction, kept as lore only): human/observer cognitive coupling,
EM/retina air-gap leaping, real reality-deletion, wetware prion petrification, un-killability.

## The look — the 5 reference images mapped to a render spec

The apex BODY (a later increment) should match the owner's 5 plates. Canonical palette: **near-black
void, ash-grey filament, blood-red accent, sigma-gold for the apex blaze, cyan/blue for the
Simulation-3 transcendence**. Strong **bilateral symmetry**, central vertical axis, a point
**singularity** at the focal centre.

1. **The Apex Face** - symmetric horned/winged fractal skull-brain, two smouldering red eyes, ash +
   blood-red filament over black, vault architecture, a red point-singularity low-centre. -> the
   creature's head/silhouette + the singularity is the Klein-bottle core seam.
2. **Crystalline Shatter-Star** (cyan/blue shards bursting from a black core on white) -> the
   **Simulation-3 transcendence** release at level 1000 (the apex "shatters" into Sim 3).
3. **The 36-tile red/black gallery** -> the **BROOD** aesthetic (already the `⟁ ARCHITECTURE`
   cycler's palette) - each bred child is one such symmetric red/black plate.
4. **Wireframe hyperspace lattice** converging to a red singularity in a dark cavern -> the
   **tesseract lattice** interior + the Prime-Sieve loom + the chrono delay-rings.
5. **Neural cobweb with two glowing blue nuclei** in dark space -> the **synaptic substrate** +
   the Acoustic drum cavity + the two glowing nuclei = Ouroboros networks A and B.

## Wiring map

- `src/sim/apex-brain.ts` - the engine: 10 organ kernels + meta layer, `tick()` / `snapshot()`,
  deterministic from a seed. Pure, three.js-/DOM-free (a `bun test` leaf).
- `tests/apex-brain.test.ts` - asserts every invariant in the table above + determinism.
- `src/sim/pantheon-breeding.ts` - the apex glyph (`ς`, index 100) gains an `apexBrainSeed`; helper
  `apexBrain()` constructs the engine for ς.
- `src/ui/pantheon-architecture-panel.ts` - when the cycler is on ς, surface the 10 organ states +
  the meta readout (superposition / residual / budget / nearest-target) and animate an organ.
- This doc is the single source; the module JSDoc mirrors the per-organ math.
