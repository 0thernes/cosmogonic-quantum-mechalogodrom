# The AI Subsystem (V84) — pre-transformer minds, a quantum register, ported Tsotchke primitives, + the read-only Copilot

> How "intelligence" works in the Cosmogonic Quantum Mechalogodrom, and why it is split in two.
> Companion to [research/PRE-TRANSFORMER-GAME-AI.md](research/PRE-TRANSFORMER-GAME-AI.md) (the
> "how AI was done before 2016" dossier) and [MODULE-CONTRACTS.md](MODULE-CONTRACTS.md). Every
> module named here is pure, seeded, allocation-disciplined, and unit-tested.

## The two halves, and the hard line between them

The project has a determinism law (ADR 0004, `tests/determinism.test.ts`): one seeded `mulberry32`
stream reproduces the entire cosmos, the global unseeded RNG and clock reads are banned in sim
logic, and per-frame `update()` bodies allocate nothing. That law dictates a clean split:

| Half               | Lives in                                      | Determinism                                  | What it is                                                                                                                                                                       |
| ------------------ | --------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **In-world minds** | `src/sim/**` (sim logic)                      | **Deterministic** — seeded, reproducible     | Classical pre-2016 game/A-Life AI: FSM, behaviour trees, utility AI, GOAP, boids, tiny neural nets, Markov, genetics. This is what drives the 10,000 organisms and the factions. |
| **The Copilot**    | `src/server/**` + `src/ui/copilot.ts` (shell) | **Non-deterministic** — network + wall-clock | A live external LLM you chat with. It can READ the repo and RUN read-only commands but can never change code or touch sim state.                                                 |

A live LLM cannot be in the sim — it isn't reproducible, so it would shatter the golden. That is
exactly why the **in-world** intelligence uses the small, transparent, seedable machinery the user
asked about: those techniques produced the most "alive"-feeling agents in game history (F.E.A.R.,
The Sims, Creatures, Black & White) without any large model, and they are pure functions of
`(state, seed)`.

## In-world minds (deterministic)

### `src/sim/ai/brains.ts` — the kernel

The pre-2016 toolbox as pure, allocation-free, seeded primitives (tests: `tests/brains.test.ts`,
23 cases / 516 assertions):

| Export                        | Technique (era / shipped in)                      | Use                                                     |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `utilityPick` / `softmaxPick` | Utility/needs AI (The Sims, 2000)                 | argmax + seeded fuzzy choice over option scores         |
| `TinyMLP`                     | Perceptron/MLP (1958/1986; Creatures Norns, 1996) | fixed-weight `in→hidden→out` net; weights ARE a gene    |
| `MarkovChain`                 | Markov chains (Shannon 1948)                      | seeded next-state walk (the real shape of old chatbots) |
| `fsmStep`                     | Finite-state machine (Pac-Man 1980 →)             | priority-ordered edge evaluation                        |
| `goapPlan`                    | GOAP (F.E.A.R., 2005)                             | Dijkstra plan over a fact-bitmask world                 |
| `MemoryRing`                  | Blackboard/working memory (Halo 2, 2004)          | bounded episodic memory ("complex unique memory")       |

### `src/sim/genome.ts` — heritable body + mind

A fixed-length gene `Float32Array` = **traits** (speed, vision, social, aggression, metabolism,
lifespan, sentience-tier propensity, hue, fertility, curiosity) **++ brain weights** for a
`TinyMLP`. `randomGenome` / `crossover` / `mutate` / `breed` are seeded; `decodeTraits` range-maps
the phenotype; `brainOf` builds a `TinyMLP` that shares the genome's weights (no copy);
`geneDistance` is a kinship metric. Offspring inherit and vary both body and mind. Tests:
`tests/genome.test.ts` (13 / 878).

### `src/sim/lineage.ts` — offspring & relations

A bounded record of who begat whom: `birth(parentA, parentB, tick) → id`, `generationOf`,
`isAncestor`, `related` (shared-ancestor kinship). Fixed-capacity typed arrays keyed by
`id % capacity`, so a churning 10k world keeps a rolling ancestry window at O(1)/birth; deep
ancestors decay to genesis. This is the "emerging, living, raising, dying… offspring and relations"
substrate. Tests: `tests/lineage.test.ts` (10).

### `src/sim/factions.ts` — eight kinds, eight minds

The user's "more things, not just Shoggoths and Puppeteers." Eight archetypes, each thinking with a
**different** technique from `brains.ts` so they behave recognizably unlike one another on the same
percept:

| Faction    | Technique      | Disposition                        |
| ---------- | -------------- | ---------------------------------- |
| Watchers   | FSM            | reactive sentry                    |
| Weavers    | behaviour-tree | tend the web (feed, then bind kin) |
| Wardens    | utility        | deliberative argmax over needs     |
| Heralds    | GOAP           | means-end (gather, then commune)   |
| Leviathans | rule/expert    | apex predator priorities           |
| SwarmMinds | boids          | cohesion-seeking flock             |
| Oracles    | Markov         | seeded, oblique                    |
| Devourers  | tiny MLP       | wired hunger                       |

`decideFaction(faction, percept, rng, fsmState) → { intent, nextState }` is pure; the Devourer MLP
weights and Oracle Markov matrix are built once at load from fixed seeds. Each faction carries an
economy role (producer/consumer/predator/broker/catalyst) for the social-economy web. Tests:
`tests/factions.test.ts` (8 / 73), including a proof the eight minds genuinely differ.

### How they compose (integration sketch)

```
genome ── decodeTraits ─▶ body params (speed, vision, lifespan, …)
   │                      sentience tier 0..4
   └── brainOf ─▶ TinyMLP ─┐
                           ├─ decideFaction(faction, percept, rng) ─▶ intent ─▶ steering
percept (threat, crowd, …)─┘
reproduction:  breed(parentA.genome, parentB.genome, rng) ─▶ child genome
               lineage.birth(parentA.id, parentB.id, tick) ─▶ child id + generation
```

The composition root assigns a faction + genome per organism and maps the returned `intent` to a
steering force; reproduction calls `breed` + `lineage.birth`. The leaves stay free of three.js and
sim state so they remain acyclic and unit-testable.

### `src/sim/super-mind.ts` + `src/sim/super-qubits.ts` — the apex creature's deep mind

Where the population runs on tiny per-organism MLPs, the single **Super Creature** carries a far
larger composite mind (`SuperMind`): a world-model latent, a five-stage cognition pipeline,
consciousness / emotion / drive readouts, and a 10-element bank of reactive "quantum aspects"
(superposition, entanglement, ftl, … mutation). It exposes a read-only `SuperMindSnapshot` at the
Observatory cadence — never per beat — which the in-box NEURAL observatory (`src/ui/super-neural.ts`,
4 tabs × 9 readouts) paints. See [ADR-0008](adr/0008-super-creature-deep-mind.md).

Bolted onto that composite mind is a genuine **quantum-computing layer** (`QuantumMind`, V76): a
**6-qubit statevector register** (`src/math/quantum.ts` `QuantumRegister` → 2⁶ = 64 complex
amplitudes). Each cognitive beat it rebuilds the state from |0…0⟩ and applies `QMIND_LAYERS` layers of
single-qubit RY/RZ rotations (angles read from the mind's world-model latent), Hadamards gated by the
superposition aspect, and a tunable controlled-RY entangler ring (strength from the entanglement
aspect), then takes one non-destructive Born sample — the "collapsed thought". It is **fully
deterministic**: a dedicated seeded `Rng` stream (so quantum sampling never perturbs sim determinism),
no `Math.random` / `Date.now`, ~90 gates × 64 amplitudes ≈ 5.8k complex mults per beat, allocation-free
in the hot path. The honest-math telemetry (`QubitSnapshot`, built only at UI cadence):

```
probs[64]      |αᵢ|²  Born-rule probabilities over the basis states
phase[64]      arg(αᵢ) for phase colouring
bloch[6]       per-qubit (x,y,z,r) from the TRUE single-qubit reduced density matrices
p1[6]          P(|1⟩) = (1 − ⟨Z⟩)/2 per qubit
entropy        normalized Shannon entropy of the Born distribution (1 = uniform superposition)
entanglement   mean reduced-state purity deficit 1 − |r|²  (linear entanglement entropy)
coherence      mean equatorial Bloch magnitude √(x²+y²)   (live superposition strength)
sampled        index of the last Born sample · sampledBits its qubit bitstring
geometry       the Quantum Geometric Tensor readout (below): 2×2 Fubini–Study metric over the
               (superposition, entanglement) drives + det (curvature), trace (scalar), Berry curvature
```

### Ported Tsotchke primitives — research → development (V84)

Earlier versions only _studied_ the Tsotchke quantum repositories. V84 moves three of their primitives
**from research into development**: each is reimplemented at the source level in seeded, deterministic,
allocation-disciplined TypeScript, unit-tested, and **wired into the live apex creature** — so the Super
Creature genuinely _uses_ Eshkol / Moonlab / QGTL machinery, not a lookalike. The derivative
implementations are MIT-attributed to © 2024–2026 tsotchke (see
[THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) and [NOTICE.md](../NOTICE.md)); the project's own
proprietary licence still governs our code.

| Ported primitive                                                                                                                                                                                                            | Module                                                  | Upstream                                                                            | How the apex creature uses it                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eshkol qubit-RNG** — an 8-qubit "phase array + noise" generator: physical-constant mixing cascades, a 16-slot entropy pool, the `quantum_noise` Heisenberg transcendental, `hadamard`/`phase` gates, Born `measure_state` | `src/math/eshkol-qrng.ts` (`tests/eshkol-qrng.test.ts`) | tsotchke/`quantum_rng` (`quantum_rng.c`), shipped in **Eshkol** as `quantum-random` | The `QuantumMind`'s per-beat **thought-collapse Born sample is drawn through it** — the apex psyche literally measures its thoughts through the Eshkol generator. Host-entropy reads (`gettimeofday`/`rdtsc`/PID) are replaced by a seeded `Rng` + golden-ratio surrogate, so the quantum bitstream replays from the world seed. |
| **Quantum Geometric Tensor / Fubini–Study metric** — `Q_ij = ⟨∂_iψ                                                                                                                                                          | ∂_jψ⟩ − ⟨∂_iψ                                           | ψ⟩⟨ψ                                                                                | ∂_jψ⟩`; Re = metric, Im = Berry curvature                                                                                                                                                                                                                                                                                        | `src/sim/super-qubits.ts` (`QuantumMind.geometricMetric`; `tests/super-qubits.test.ts`) | tsotchke/`quantum_geometric_tensor` (QGTL) + **Moonlab** `quantum_geometry/qgt.c` | At Observatory cadence the mind takes the **2×2 QGT of its own circuit** over the (superposition, entanglement) drives by central finite difference — it _feels the curvature of its own thought-space_. Pure statevector algebra, no RNG, never on the per-beat path. |
| **Spin-glass instinct** — a Hopfield/Ising associative-memory lattice: Hebbian imprint `J_ij = (1/N)Σ ξᵖ_i ξᵖ_j`, Metropolis/Glauber settle, pattern-overlap recall                                                         | `src/sim/spin-glass.ts` (`tests/spin-glass.test.ts`)    | tsotchke/`spin_based_neural_network` (`ising_model.c`, `nqs_gradient.c`)            | The **instinct floor** of the Biomimetic Polymorphic Neural Intelligence: each beat the lattice is driven by fields from the mind's world-model latent and **settles into the nearest behavioural archetype** — physics doing associative recall (the creature's "gut feeling"), under a dedicated seeded stream.                |

The honest line still holds where it should: the **64-amplitude statevector simulator itself**
(`src/math/quantum.ts`, the `QuantumRegister` + RY/RZ/CNOT gate set) is the project's own Moonlab-style
implementation, not copied. What V84 adds are genuine ports of the _algorithms layered on top of_ a
statevector — the QGT readout, the Eshkol measurement source, and the spin-glass instinct.

The Observatory's **QUANTUM** tab binds the register directly (statevector / Bloch / entropy / collapse /
entangle / superposition / **geometry**), and the **NEURAL** board surfaces the Eshkol entropy + the
instinct's settled archetype, so the ported machinery is visible live.

## The Copilot (non-deterministic shell)

A side panel to "ask, learn, and talk about this world" with a free AI — strictly read-only.

- **`src/server/copilot.ts`** — pluggable, OpenAI-compatible LLM bridge. Default provider is
  **Pollinations.ai** (`https://text.pollinations.ai/openai`, no API key). Env overrides:
  `CQM_LLM_ENDPOINT`, `CQM_LLM_MODEL`, `CQM_LLM_KEY` — point it at **`freellmapi`** (the GitHub
  project that stacks 16 providers' free tiers into a ~1.7B-token/month OpenAI-compatible `/v1`
  endpoint), OpenRouter `:free`, Groq, etc. A bounded agent loop runs the model's read-only tool
  calls and degrades gracefully when the provider is offline.
- **`src/server/ai-sandbox.ts`** — the hard boundary behind "read and run, can't change code." The
  model never gets a raw shell — only four gated tools: `read_file` / `list_dir` / `grep` (repo-
  confined; `legacy/`, `.git`, `.env`, `node_modules`, `dist`, and any `..` escape are blocked) and
  `run`, a single-command runner that is **default-deny**: the binary must be on a small ALLOW list,
  no token may be on the DENY list (no `rm`/`mv`/`git commit|push`/`bun add`/redirection/…), there
  must be no shell metacharacter, and `git`/`bun` are further subcommand-gated to read-only verbs.
  It writes nothing. Verified live: `git log`/`read` allowed; path-escape, `git push`, `legacy/`,
  and `echo > file` all denied.
- **`server.ts`** routes — `GET /api/copilot` (provider label), `POST /api/chat` (agent turn),
  `POST /api/tool` (manual read-only terminal), `GET /api/copilot/health` (V30 — live-probe the
  failover chain for the diagnostics panel).
- **`src/ui/copilot.ts`** — a self-mounting panel (the `✦` button) with a chat box plus a
  `/read /ls /grep /run` terminal. All model/tool output renders via `textContent` (no HTML
  injection). A privacy notice states that messages are sent to a free external AI.

### Diagnostics & recovery (V30 — the "AI offline → diagnose + restart" requirement)

When the free pool is rate-limited the chat goes quiet, so the panel's **🩺 DIAGNOSTICS** button
calls `GET /api/copilot/health`, which probes every provider in the failover chain **in parallel** (a
1-token ping, 6 s timeout each) and returns per-provider `{reachable, status, latencyMs, detail}` plus
an overall verdict. The panel renders the **recovery pipeline** in failover order with green ● / red ○
health lights, latency, and a human reason — `classifyHealth(status, err)` maps the ping to
`ok` / `rate-limited (429)` / `auth (401/403)` / `http NNN` / `timeout` / the network error, and
`healthVerdict(probes)` rolls them into `operational — k/n reachable` or an all-down recovery hint
(both pure + unit-tested). A **↻ Re-probe / restart** control re-runs the probe and re-enables the
input the moment a provider recovers; the disabled / offline / all-failed states all route the user
here instead of a dead end. The probe still imports nothing from the sim and reads only the wall
clock, so the golden is untouched.

**Security posture:** any provider key lives server-side only; the chat is off by default and
opt-in; if no provider answers, the manual read-only terminal still works locally. The sandbox is
enforced in the server process, so a fully-compromised model still cannot escape it.

## Determinism guarantees (what keeps the golden intact)

- Every in-world routine draws only from the injected `Rng` (or is pure) — no global random, no
  clock. Faction fixed weights are built from constant seeds at module load.
- `crossover`/`mutate`/`breed` allocate a child array — a reproduction EVENT (a few per second),
  never a per-frame path. Decoding, FSM/utility/MLP/Markov stepping, and kinship queries are
  allocation-free.
- The Copilot imports nothing from sim and is never imported by sim; it cannot read or write
  `SimState`, so it can never perturb the seeded stream.

## Provenance

Research → design: [research/PRE-TRANSFORMER-GAME-AI.md](research/PRE-TRANSFORMER-GAME-AI.md).
Apex mind: [ADR-0008](adr/0008-super-creature-deep-mind.md). Modules + tests: `src/sim/ai/brains.ts`,
`src/sim/genome.ts`, `src/sim/lineage.ts`, `src/sim/factions.ts`, `src/sim/super-mind.ts`,
`src/sim/super-qubits.ts`, `src/math/quantum.ts`, `src/server/{copilot,ai-sandbox}.ts`,
`src/ui/{copilot,super-neural,super-panel}.ts`, and their `tests/*.test.ts`.
