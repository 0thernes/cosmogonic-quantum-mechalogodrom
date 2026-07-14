<!-- reviewed: 2026-07-10 | operational organism intelligence | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# The AI Subsystem — pre-transformer minds, a classical statevector register, Tsotchke ports/adaptations, + the read-only Copilot

> How "intelligence" works in the Cosmogonic Quantum Mechalogodrom, and why it is split in two.
> Consolidates the pre-transformer technique index and [MODULE-CONTRACTS-2026-06-26.md](MODULE-CONTRACTS-2026-06-26.md). Every
> module named here is pure, seeded, allocation-disciplined, and unit-tested.

> **2026-07-10 causal update.** The living systems now share a bounded corpus-conditioned intelligence
> field that affects resource, threat, exploration, social, forecast, and plasticity signals. On a fresh
> disjoint fixed 30-seed family, goal-only and corpus-conditioned effects passed, adaptation cleared the
> script-declared 5% threshold at `6.1213%`, all `17/17` integrated rows were causal, and all `5/5`
> excluded rows stayed inert. Three-process performance stability and matched coverage for every named
> consumer class now pass after the population hot-path/test seal. Uniform random-action baseline separation and
> aggregate-mapping specificity did not pass. The aggregate
> rotation and uniform final-exploration surrogate are not repository-permutation or entropy-matched
> quantum controls. This supports bounded task behavior only; see the
> [full causal audit](./reports/2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md).

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

Where the population runs on tiny per-organism MLPs, the **5 Super Creatures (GOAL5 Archons: ORACLE-Σ etc)** each carry a far
larger composite mind (`SuperMind`): a world-model latent, a five-stage cognition pipeline,
consciousness / emotion / drive readouts, and a 10-element bank of reactive "quantum aspects"
(superposition, entanglement, ftl, … mutation). It exposes a read-only `SuperMindSnapshot` at the
Observatory cadence — never per beat — which the in-box NEURAL observatory (`src/ui/super-neural.ts`,
4 tabs × 9 readouts) paints. See [ADR-0008](adr/0008-super-creature-deep-mind-2026-06-26.md).

Bolted onto that composite mind is a deterministic **classical statevector simulation layer** (`QuantumMind`, V76): a
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

### Tsotchke primitives and deterministic adaptations — research → development (V84+)

Earlier versions only _studied_ the Tsotchke quantum repositories. The current runtime distinguishes
compatible algorithm ports from independent deterministic adaptations and facades. All are seeded,
allocation-disciplined TypeScript and are tested at their stated contract; a facade is not presented as
source parity. Compatible derivative implementations are attributed to © 2024–2026 tsotchke (see
[THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) and [NOTICE.md](../NOTICE.md)); the project's own
proprietary licence still governs our code.

| Ported primitive | Module | Upstream | How the apex creature uses it |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministic statevector RNG adaptation** — 2–8 classical-simulated qubits, unitary gates, Born sampling, snapshot/restore, and diagnostic repetition/adaptive-proportion-style counters | `src/math/deterministic-statevector-rng.ts` + compatibility wrapper `src/math/eshkol-qrng.ts` | `quantum_rng` `v3.0.1` (`a00ad483cbbef31ea7536f09ae99409d81c9a823`) | Supplies a repeatable simulation stream to existing apex paths. It is an independent adaptation, not the deleted phase-array gate-for-gate port, hardware entropy, a CSPRNG, SP 800-90B certification, or a physical Bell experiment. |
| **Quantum Geometric Tensor / Fubini–Study metric** — `Q_ij = ⟨∂_iψ                                                                                                                          | ∂_jψ⟩ − ⟨∂_iψ                                                                                 | ψ⟩⟨ψ                                                                     | ∂_jψ⟩`; Re = metric, Im = Berry curvature | `src/sim/super-qubits.ts` (`QuantumMind.geometricMetric`; `tests/super-qubits.test.ts`) | tsotchke/`quantum_geometric_tensor` (QGTL) + **Moonlab** `quantum_geometry/qgt.c` | At Observatory cadence the mind takes the **2×2 QGT of its own circuit** over the (superposition, entanglement) drives by central finite difference — it _feels the curvature of its own thought-space_. Pure statevector algebra, no RNG, never on the per-beat path. |
| **Spin-glass instinct** — a Hopfield/Ising associative-memory lattice: Hebbian imprint `J_ij = (1/N)Σ ξᵖ_i ξᵖ_j`, Metropolis/Glauber settle, pattern-overlap recall | `src/sim/spin-glass.ts` (`tests/spin-glass.test.ts`) | tsotchke/`spin_based_neural_network` (`ising_model.c`, `nqs_gradient.c`) | The **instinct floor** of the Biomimetic Polymorphic Neural Intelligence: each beat the lattice is driven by fields from the mind's world-model latent and **settles into the nearest behavioural archetype** — physics doing associative recall (the creature's "gut feeling"), under a dedicated seeded stream. |

The honest line still holds where it should: the **64-amplitude statevector simulator itself**
(`src/math/quantum.ts`, the `QuantumRegister` + RY/RZ/CNOT gate set) is the project's own Moonlab-style
implementation, not copied. The QGT and spin/Hopfield paths retain their separately attributed algorithm
lineage. The RNG compatibility API now delegates to the independent deterministic statevector adaptation;
it must not be described as an Eshkol phase-array source port.

The Observatory's **QUANTUM** tab binds the register directly (statevector / Bloch / entropy / collapse /
entangle / superposition / **geometry**), and the **NEURAL** board surfaces the Eshkol entropy + the
instinct's settled archetype, so the ported machinery is visible live.

## The Copilot (non-deterministic shell)

A side panel to "ask, learn, and talk about this world" with a free AI — strictly read-only.

- **`src/server/copilot.ts`** — pluggable, OpenAI-compatible LLM bridge. Default provider is
  **FreeLLMAPI** (`http://localhost:3001/v1` by default), with key-less LLM7 and Pollinations behind
  it and keyed presets for Groq, Cerebras, OpenRouter, GitHub Models, Mistral, Gemini, NVIDIA,
  DeepSeek, and Hugging Face. Env overrides: `FREELLMAPI_BASE`, `FREELLMAPI_MODEL`,
  `FREELLMAPI_KEY`, or `CQM_LLM_ENDPOINT` / `CQM_LLM_MODEL` / `CQM_LLM_KEY` for a custom endpoint.
  Keyed providers accept rolling pools (`FOO_API_KEY`, `FOO_API_KEYS`, `FOO_API_KEY_2` ...
  `FOO_API_KEY_9`) so a rate-limited slot falls through to the next configured slot. A bounded
  agent loop runs the model's read-only tool calls and degrades gracefully when the provider is
  offline.
- **`src/server/ai-sandbox.ts`** — the hard boundary behind "read and run, can't change code." The
  model never gets a raw shell — only four gated tools: `read_file` / `list_dir` / `grep` (repo-
  confined; `legacy/`, `.git`, `.env`, `node_modules`, `dist`, and any `..` escape are blocked) and
  `run`, a single-command runner that is **default-deny**: the binary must be on a small ALLOW list,
  no token may be on the DENY list (no `rm`/`mv`/`git commit|push`/package runner/redirection/…), there
  must be no shell metacharacter, and `git` is further subcommand-gated to read-only verbs. Bun and
  other project-code executors are not exposed because their flags can preload modules or write artifacts.
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
an overall verdict. Multi-key providers appear as separate recovery rows (`key 1/N`, `key 2/N`, ...)
without exposing the credential values. The panel renders the **recovery pipeline** in failover order
with green ● / red ○ health lights, latency, and a human reason — `classifyHealth(status, err)` maps the ping to
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

Research → design: this AI subsystem index owns the pre-transformer technique index material.
Apex minds (5× GOAL5): [ADR-0008](adr/0008-super-creature-deep-mind-2026-06-26.md) + MODULE-CONTRACTS GOAL5. Modules + tests: `src/sim/ai/brains.ts`,
`src/sim/genome.ts`, `src/sim/lineage.ts`, `src/sim/factions.ts`, `src/sim/super-mind.ts`,
`src/sim/super-qubits.ts`, `src/math/quantum.ts`, `src/server/{copilot,ai-sandbox}.ts`,
`src/ui/{copilot,super-neural,super-panel}.ts`, and their `tests/*.test.ts`.
