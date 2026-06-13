# The AI Subsystem (V9) — pre-transformer minds + the read-only Copilot

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
  `POST /api/tool` (manual read-only terminal).
- **`src/ui/copilot.ts`** — a self-mounting panel (the `✦` button) with a chat box plus a
  `/read /ls /grep /run` terminal. All model/tool output renders via `textContent` (no HTML
  injection). A privacy notice states that messages are sent to a free external AI.

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
Modules + tests: `src/sim/ai/brains.ts`, `src/sim/genome.ts`, `src/sim/lineage.ts`,
`src/sim/factions.ts`, `src/server/{copilot,ai-sandbox}.ts`, `src/ui/copilot.ts`, and their
`tests/*.test.ts`.
