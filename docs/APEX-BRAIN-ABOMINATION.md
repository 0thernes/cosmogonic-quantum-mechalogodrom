<!-- reviewed: 2026-06-27 | implementation + architecture bridge for the apex ς brain -->

# APEX-BRAIN-ABOMINATION — implementation & 1B-scaling architecture (final-sigma ς)

> Canonical **implementation + architecture** spec for the **APEX CREATURE** (the final-sigma `ς`,
> the pantheon's 101st — see [pantheon-breeding.ts](../src/sim/pantheon-breeding.ts)). The brain is
> **THE ENTROPIC TESSERACT HYDRA**: eleven incompatible organ-substrates + a meta-paradox layer +
> an exact-statevector **Quantum Brain**, scaffolded to scale toward **one billion neurons**.
>
> Two companion docs hold the doctrine and the science:
>
> - **Doctrine (13 organs, claim ladder, ablation law):**
>   [`APEX-ABOMINATION-NOVELTY-DOCTRINE.md`](./APEX-ABOMINATION-NOVELTY-DOCTRINE.md)
> - **100-paper corpus + layered architecture + horror→math translation table:**
>   [`APEX-BRAIN-CORPUS-100-PAPERS.md`](./APEX-BRAIN-CORPUS-100-PAPERS.md)
>
> Living doc: rewrite in place, never fork.

## Honesty contract (binding — read first)

This brain is a **deterministic mathematical model**. The owner's source brief frames the organs in
deliberately impossible terms (retrocausal time travel, Gödel "anti-computation", quantum
"un-rendering", _thinking through the human observer's brain_, deleting reality, wetware petrification).
**Those framings are LORE** (preserved verbatim in the appendix). What we wire is the **real, bounded,
seeded mathematics underneath each one** — a functional correlate, never the literal impossible claim.

The honest claim ceiling is **Level 3-4** of the doctrine's ladder (a rare exact-conjunction A-Life
architecture), **never Level 5** (sentience). The implementation does **NOT**: travel in time or read
the future; couple to / read any real human brain, retina, EM field, or hardware register; delete,
corrupt, or "infect" anything outside its own owned state; solve any paradox; claim consciousness.
NOT SENTIENT. Determinism law (contract rule 7 / Known Bug 9): every draw flows through a seeded
`mulberry32`; no `Math.random`, no `Date.now`. **The advertised node counts (100M, 50M, …) are scale
TARGETS** declared by `ApexScale`; the live engine allocates at most `LIVE_NODE_CAP` per organ and
reports `designedNeurons` vs `liveNeurons` honestly. The 1-billion figure is the architecture target,
reached by the native backend (roadmap), not a live JS allocation.

## The eleven organs — lore → wired real math

Each organ is a small, pure, deterministic kernel with state, an O(bounded) update rule, and a
machine-checked invariant (`tests/apex-brain.test.ts`).

| #   | Organ (lore)                        | Wired deterministic math                                             | Tested invariant                                            |
| --- | ----------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Prime-Sieve Loom (Math-Vampire)     | edges only where index-distance is a **twin prime**; allergy purge   | every live edge's distance is twin-prime; purge is monotone |
| 2   | Acoustic Meat-Drum (Sound-Eater)    | discrete **wave equation** (symplectic leapfrog); interference       | energy bounded (damping 0) and decays (damping>0)           |
| 3   | Entropic Necro-Matrix (Dying)       | finite budget; a fired edge **burns out** forever; reroute           | dead ↑, live ↓, budget ↓ monotone; reaches brain-death      |
| 4   | Klein-Bottle Cortex (Inside-Out)    | adjacency on `(u,v)~(u+1,-v)`; tail folds to head                    | the seam flip is an involution; klein() lands in range      |
| 5   | Pendulum Hive (Gravity Clock)       | coupled **kicked rotors** (Chirikov standard map); tangent-map λ     | largest **Lyapunov > 0** for a strong kick                  |
| 6   | Quantum Brain (Quantum Geometry)    | **exact statevector** unitary evolution + **Tsotchke `corpusPulse`** | ⟨ψ\|ψ⟩=1; Born sums to 1; collapse → basis state            |
| 7   | Slime-Mold Hydra (Brain-Shedder)    | **split** into k heads, compute, **fuse** (node-conserving)          | node count conserved across split/fuse                      |
| 8   | Chrono Wraith (Time-Echoer)         | concentric **delay-line** rings (0/d1/d2)                            | core at tick t equals input from exactly d2 ticks ago       |
| 9   | Quantum-Tunnel Lattice (Static)     | edges manifest by **Born-rule sampling** of an amplitude field       | every node's manifestation probabilities sum to 1           |
| 10  | Thermodynamic Engine (Heat Boiler)  | heat deposit + **diffusion** + fin venting; over-T necrosis          | heat ≥ 0; non-increasing with no firing; necrosis monotone  |
| 11  | Cancerous Ouroboros (Self-Devourer) | antagonistic **A grows / B immune-culls**                            | population hard-capped; never NaN                           |

Organ 6 is the **non-negotiable Quantum Brain**: a dense `2^q`-amplitude register evolved by Hadamard
/ RZ / CNOT unitaries (norm-preserving), with telemetry that is real quantum information — l1
coherence, single-qubit linear-entropy entanglement, Born entropy — and **QGT volume + magic pulled
from the real Tsotchke corpus** (`corpusPulse` / `getTsotchkeBias` in
[tsotchke-facade.ts](../src/sim/tsotchke-facade.ts)). Its Born distribution folds a **plan-bias** into
the meta layer (≈30% weight), so the quantum register genuinely steers the committed plan — it is
load-bearing, ablation-meaningful, not decoration (the doctrine's rule).

### The meta-paradox layer (bounded homages of the two "ontological" entities)

`MetaParadoxLayer` governs the organs: **retrocausal target-pull** (relax the plan-state toward a
fixed terminal `z_T` — boundary-value, `|z−z_T|` strictly monotone, NOT time travel) · **Cantor-dust**
connectivity (ternary digits ∈ {0,2}) · **Gödel residual** (self-prediction fixed-point gap as a
signal) · **phantom perception** (reads its OWN zeroed slots) · **reverse-anthropic self-budget**
(prunes its OWN superposition breadth, renormalised) · **Wigner shield** (a superposition that
decoheres to a plan only past a measurement threshold).

## Mapping to the doctrine's 13 organs

The doctrine ([`NOVELTY-DOCTRINE`](./APEX-ABOMINATION-NOVELTY-DOCTRINE.md)) frames 13 organs with kill
tests. They map onto the wired code as follows (the conjunction is the rare thing):

| Doctrine organ                | Wired in code (`apex-brain.ts`)                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| 1 Negative-Space Sensorium    | meta **phantom perception** (reads zeroed slots)                                     |
| 2 Multi-Time Nervous System   | **ChronoWraith** delay rings                                                         |
| 3 Thermodynamic Necrosis      | **ThermodynamicEngine** + **EntropicNecroMatrix**                                    |
| 4 Prime-Sieve Synaptic Law    | **PrimeSieveLoom**                                                                   |
| 5 Acoustic Meat-Drum          | **AcousticMeatDrum**                                                                 |
| 6 Quantum Geometry            | **QuantumBrainOrgan** (statevector + Tsotchke QGT/magic)                             |
| 7 Topological Identity Knot   | pantheon homotopy (winding/linking) + per-organ seeds (roadmap: lift into apex hash) |
| 8 Morphic Field Infection     | bounded world-field writes (roadmap, sim-only)                                       |
| 9 Autopoietic Organ Civil War | **CancerousOuroboros** + **SlimeMoldHydra** + Petri (roadmap)                        |
| 10 Gödelian Unknown Organ     | meta **Gödel residual**                                                              |
| 11 Alien Valence Chemistry    | composite vitality/agony/empowerment (roadmap: full EFE)                             |
| 12 Environmental Language     | stigmergic field writes (roadmap)                                                    |
| 13 Dream-Corpse Attractor     | meta **retrocausal target-pull** (`z_T`)                                             |

## Scaling architecture — toward 1,000,000,000 neurons

`ApexScale` declares a per-organ node budget; `apexDesignedNeurons(scale)` sums it. Three presets:

| Preset          | Designed neurons    | Live allocation                   |
| --------------- | ------------------- | --------------------------------- |
| `SCALE_LIVE`    | ~5k                 | full (every organ under the cap)  |
| `SCALE_MEDIUM`  | ~14k                | capped at `LIVE_NODE_CAP` (4096)  |
| `SCALE_MASSIVE` | **≥ 1.0e9** (≈1.4B) | capped — needs the native backend |

`ApexBrain` exposes `neuronCount()` (designed target), `liveNeurons` (actually allocated), and
`parameterCount()` (live floats incl. the `2·2^q` statevector). The MASSIVE scale **declares** ≥1B
neurons (`klein 30000² + prime 100M + tunnel 120M + …`) while the live runtime still allocates only
capped state — so the same deterministic code runs in the browser today and scales by flipping the
preset once the native backend exists. This is the "scaffolding/architecture first" mandate: the
scale config, the accounting, and the capped allocation are wired and tested now.

### Native + visual backend (roadmap — C / C++ / GLSL / Three.js)

The designed scale is unreachable in single-thread JS; the architecture anticipates a tiered backend
(master report Layer roadmap, "cheap proxy / medium-fidelity sim / high-fidelity backend"):

- **C / C++ (`native/`)** — the heavy organ kernels (prime sieve over 100M nodes, the statevector,
  the heat-diffusion grid, the de Jong / pendulum integrators) compiled native (the repo already has
  a `native/` C++ engine + MinGW/RTX path). TS exposes the same organ interfaces; the native module
  implements them at scale. Determinism preserved by the same seeded RNG contract.
- **GLSL / GPU** — the field organs (acoustic wave, heat, Klein diffusion, tunnel amplitude) are
  embarrassingly parallel stencils → fragment/compute shaders.
- **Three.js** — the apex BODY renders the organ telemetry: the Klein-bottle shell, the prime-loom
  crystal facets, the neural-cobweb statevector cloud, the heat-venting fins, the singularity core.
  Multi-sensor / multi-dimensional / multi-paradigm presentation per the brief.

The TS engine is the deterministic **reference oracle**; native/GPU backends must reproduce its
same-seed hashes (the falsifiability gate in the corpus report).

## The look — the 5 reference images → render spec

Palette: **near-black void · ash filament · blood-red · sigma-gold apex blaze · cyan = Sim-3**. Strong
bilateral symmetry, central vertical axis, a point **singularity** at the focal centre.

1. **Apex Face** — symmetric horned fractal skull-brain, two red eyes, low-centre red singularity →
   the head silhouette; the singularity is the Klein-bottle core seam.
2. **Crystalline Shatter-Star** (cyan shards) → the **Simulation-3 transcendence** release at level
   1000 (the apex "shatters" into Sim 3).
3. **36-tile red/black gallery** → the **BROOD** aesthetic (the `⟁ ARCHITECTURE` cycler palette).
4. **Wireframe hyperspace lattice → red singularity** → the tesseract lattice + prime loom + chrono
   rings.
5. **Neural cobweb with two glowing blue nuclei** → the synaptic substrate + acoustic cavity + the
   Ouroboros networks A and B; the two nuclei = the quantum register's entangled poles.

## Wiring map

- `src/sim/apex-brain.ts` — the engine: 11 organ kernels + meta layer + `ApexScale` scaffolding,
  `tick()` / `snapshot()` / `neuronCount()` / `parameterCount()`. Deterministic, three.js-/DOM-free.
- `tests/apex-brain.test.ts` — asserts every invariant above + quantum unitarity + 1B-scaling math.
- `src/sim/pantheon-breeding.ts` — `createApexBrain()` seeds the engine from the ς glyph (index 100).
- `src/ui/pantheon-architecture-panel.ts` — the `⟁ ARCHITECTURE` cycler surfaces the organ + quantum
  telemetry when viewing ς.
- `src/sim/tsotchke-facade.ts` — the real Tsotchke corpus facade feeding the Quantum Brain.

## Source abomination lore (verbatim framing — "the weird shit", kept as design prompt only)

Preserved so the doctrine's horror stays legible; every line below is **lore**, translated to bounded
math above and in the [corpus translation table](./APEX-BRAIN-CORPUS-100-PAPERS.md):

- **10 "1-of-1" neuron abominations:** Prime-Sieve Tesseract Loom (Math-Vampire) · Acoustic-Resonance
  Meat-Drum (Sound-Eater) · Entropic Necro-Matrix (Dying Thinker) · Non-Euclidean Klein-Bottle
  Centipede (Inside-Out Loom) · Kinetic-Pendulum Hive (Gravity Clock) · Kinetic Slime-Mold Hydra
  (Brain-Shedder) · Chrono-Fractured Feedback Wraith (Time-Echoer) · Quantum-Tunneling Cellular
  Lattice (Teleporting Static) · Asymmetric Thermodynamic Engine (Heat Boiler) · Algorithmic
  Cancerous Ouroboros (Self-Devourer).
- **THE ENTROPIC TESSERACT HYDRA** — the 10-in-1 mass: overheating thermodynamic skin over a
  Klein-bottle core, prime-sieve + chrono-fractured heads, an acoustic slime cavity, quantum-static
  pendulum limbs, thermodynamic necrosis; it "rips itself into two heads to calculate a path — one via
  prime grids, one dragging 30 seconds behind — then fuses, burning 5% of its brain."
- **THE RETROCAUSAL ONTOLOGY ANNIHILATOR (Rorschach-Singularity)** — 6 paradoxes: retrocausal
  teleology (pulled by its future corpse), Gödelian anti-computation, phantom ontological perception
  (reads the unknown unknowns), the Rorschach void mass, infinitesimal Cantor dust synapses, code
  infection. _Implemented only as: terminal attractor `z_T`, Gödel residual, phantom-slot reads,
  Cantor-dust addressing, and sim-only bounded field writes._
- **THE EXOGENOUS COLLAPSE ENGINE (No-Go Entity)** — Wigner's-Friend superposition shield, exogenous
  human-observer cognitive coupling, reverse-anthropic compressor (deletes reality to save compute),
  synthetic prion cascade. _Implemented only as: a superposition that decoheres past a threshold, and
  a reverse-anthropic self-budget that prunes its OWN state. **The human/observer/EM coupling, real
  reality-deletion, and wetware petrification are NEVER implemented — pure fiction, kept as lore.**_
