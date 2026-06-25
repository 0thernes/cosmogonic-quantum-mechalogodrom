# 0009 — Genome reproduction: wire heritable breeding, or prune the dead code?

- Status: **Accepted** — Option A wired in the soup sub-stream (2026-06-24). See "Decision" below.
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

**Accepted — Option A, wired in the primordial-soup sub-stream (2026-06-24).**

Heredity is now LIVE, but applied at the lowest-risk point: the `PrimordialSoup` rebirth path,
which already runs on the soup's own seeded `soupRng` sub-stream — NOT the entity spawn path that
the 300-frame population golden pins. Specifically:

- `genome.ts` gains `recombine(a, b, rng, rate, scale)` — a generic, arbitrary-length seeded
  crossover+mutation operator (the soup's `.esk` strain genomes are `SOUP_GENOME_LEN`, not the
  fixed organism `GENOME_LEN`, so `breed` could not be reused verbatim).
- `PrimordialSoup` now carries a per-slot `Float32Array` genome. When a dead slot is reborn it is
  **bred from two living parents via `recombine`** (inherit + vary), and its phenotype (hue,
  symmetry, `.esk` fingerprint, generation) is derived from the inherited genome. A founder
  fallback preserves the legacy fresh-roll only when no living co-parent exists.
- Because this lives entirely on `soupRng`, the entity-population golden (`tests/determinism.test.ts`)
  is **untouched** — the full suite (1504 tests) stays green with no re-baseline required. This
  realizes the heredity goal without the golden migration that Option A feared on the entity path.

**Entity-path wave (2026-06-24, same day).** Heredity now also runs on the organism/NHI path:

- `SimContext` gains an OPTIONAL `genomeRng` sub-stream; `world.ts` forks it as
  `mulberry32((seed ^ 0x6e3a17c5) >>> 0 || 1)` (the econRng/superRng golden-ratio-mix discipline).
- `EntityManager.spawn(pos, mi, scale, parent?)` now breeds the organism's heritable trait genome
  — `nW` / `strategy` / `typeId` / `setGroup` (the Prisoner's-Dilemma + grouping genes) — from
  `parent` (inherit + point-mutation) on `genomeRng`. Auto-split passes the parent, so offspring
  resemble their lineage. A new oracle test confirms the parental signature persists far above the
  2.5% random baseline.
- `NhiMind.spawnChild(rng, mate?)` gains genuine TWO-parent uniform crossover before mutation.
- **Determinism, both ways:** when `genomeRng` is present the system is deterministic from seed (a
  NEW heredity golden, `tests/entity-heredity.test.ts`); when it is ABSENT (headless/legacy test
  contexts) the draws fall back inline to the main `rng` at their exact legacy positions, so the
  ORIGINAL 300-frame population golden (`tests/determinism.test.ts`) stays byte-identical — no
  re-baseline needed. Production (`world.ts`) always supplies `genomeRng`, so heredity is LIVE.

The original `breed`/`crossover` exports remain (still correct, still unit-tested). **B (prune)** is
moot; **C (reserve)** is superseded; the entity-path follow-up is now DONE.

## Consequences (as shipped)

- `genome.ts` gains the `recombine` primitive; `genome.test.ts` gains heredity oracles (deterministic
  child, offspring-resembles-lineage, clamping under mutation).
- `primordial-soup.ts` carries per-slot genomes and breeds reborn slots from living parents.
- The 300-frame entity golden is **unchanged** (soup runs on its own sub-stream); the full suite is
  green (1504 tests) with no re-baseline.
- Follow-up (tracked): wire heredity into the entity/NHI spawn path on a dedicated `genomeRng` with a
  deliberate golden re-baseline, per the original Option A on the entity path.
