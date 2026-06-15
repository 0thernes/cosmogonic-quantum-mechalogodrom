# 0009 — Genome reproduction: wire heritable breeding, or prune the dead code?

- Status: **Proposed** (awaiting the operator's product decision — 2026-06-15)
- Deciders: the operator (product direction), with the ARCHITECT (ownership/boundaries) and the
  PHYSICIST (determinism / the same-seed golden)
- Relates to: [0004 deterministic RNG](./0004-deterministic-rng.md),
  [0008 the super-creature deep mind](./0008-super-creature-deep-mind.md)

## Context

The 500-point line-by-line pass (2026-06-15) confirmed — by grep and by reading
`tests/genome.test.ts` — that `src/sim/genome.ts` exports a full heritable-reproduction toolkit
(`crossover`, `mutate`, `breed`, plus `randomGenome` / `decodeTraits` / `brainOf` / `geneDistance`)
but that **`breed` and `crossover` are imported nowhere in `src/`**. Only `randomGenome` is used:
`EntityBrainField` rolls a flat pool of genomes once at boot, and `NhiMind.spawnChild` re-rolls fresh
personality traits per spawn rather than inheriting. So the inheritance path is **designed and
unit-tested but not wired** — the offspring of an organism do not carry their parents' genes.

This matters two ways:

1. **Anti-slop / clarity (100-point #035, #039):** exported-but-unused public functions read as
   accidental dead code to a future maintainer/AI. They are actually _reserved_ for a stated goal —
   the directive backlog lists **"creature mutation"** as queued work — but nothing in the code says
   so, so the intent is invisible.
2. **A real product gap:** the A-Life premise ("creatures … mutate and trade", PHILOSOPHY) is only
   half-built; reproduction currently produces variation by fresh rolls, not heredity + selection.

## The determinism constraint (why this is not a quick fix)

Wiring inheritance means drawing from an `Rng` at the **spawn/auto-split path** — the exact path the
same-seed golden (`tests/determinism.test.ts`, 300-frame bit-identical) pins. Any new draw there, in
the wrong order, **breaks the golden** (ADR-0004, contract rule 7). A correct wiring must either
(a) thread the offspring-genome draws through a **dedicated sub-stream** (like `econRng`/`superRng`)
so the population golden is untouched, or (b) append them after all existing per-spawn draws and
**re-baseline the golden** deliberately. Either way it is a **feature with a test-migration**, not a
sleep-shift one-liner — so it was explicitly NOT auto-applied during the unattended audit run.

## Options

| Option                                   | What                                                                                                                                                                          | Pros                                                                                                                                        | Cons                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Wire it**                          | On auto-split, offspring genome = `mutate(parent.genome, rate, rng)`; on sexual spawn, `breed(a, b, rng)`. Thread `EntityBrainField` to carry per-entity genome + lineage.    | Realizes heredity + selection; the genome system becomes load-bearing; satisfies the "creature mutation" goal                               | Adds rng draws to the golden-pinned spawn path → needs a dedicated sub-stream + golden re-baseline; touches `entities.ts`/`entity-brain.ts`/`nhi.ts`; a real sprint |
| **B — Prune it**                         | Delete `breed`/`crossover` (and the matching tests).                                                                                                                          | Removes dead code; smallest diff                                                                                                            | **Deletes the foundation for a planned feature**; likely premature; loses tested, correct primitives                                                                |
| **C — Reserve it (recommended interim)** | Keep the code; add a one-line "reserved for the planned reproduction feature — see ADR-0009; intentionally not yet wired" note to the `breed`/`crossover` JSDoc and the test. | Zero risk; resolves the anti-slop ambiguity immediately; preserves the goal; defers the determinism-sensitive wiring to a deliberate sprint | Doesn't ship the feature                                                                                                                                            |

## Decision

**Pending the operator.** The reviewer recommends **C now → A later**: mark the exports as reserved
(a safe, immediate doc fix) and schedule **A** as a proper feature with its own sub-stream + golden
re-baseline when reproduction/selection is the focus. **B (prune)** is discouraged because the
directive explicitly wants creature mutation. Whichever is chosen, record it here and flip Status to
Accepted.

## Consequences

- If **A**: a new `genomeRng` (or reuse `entityBrainRng`) sub-stream; `tests/determinism.test.ts`
  re-baselined with a documented rationale; a new test that offspring inherit parent traits.
- If **B**: `genome.ts` shrinks; `genome.test.ts` trimmed; the "creature mutation" backlog item is
  formally dropped.
- If **C**: a few doc lines; the audit's "dead code" flag becomes "reserved, tracked in ADR-0009";
  no behavior change.
