# ADR 0004 — Deterministic seeded RNG (mulberry32) injected everywhere

- Status: Accepted
- Date: 2026-06-09

## Context

The legacy file calls `Math.random()` in roughly sixty places — morphotype
generation, entity spawning, every stochastic behavior, Shoggoth respawns,
puppet-master rolls, quantum collapse, oscillator detune (Known Bug 9). The
consequences:

- **No reproducibility.** A bug seen once is gone forever; "the universe
  looked wrong" cannot be replayed.
- **No exact tests.** Nothing downstream of randomness can be asserted
  against a known sequence.
- **Unstable benchmarks.** Spatial-hash and algorithm benches measured
  different data every run, drowning regressions in noise.

## Decision

- **`mulberry32`** as the single PRNG: a 32-bit deterministic generator,
  one multiply-xorshift pipeline per draw, allocation-free, easily fast
  enough for thousands of draws per frame. `hashSeed` (FNV-1a) maps strings
  to seeds. Both live in the leaf module `src/math/rng.ts` with
  `type Rng = () => number` (uniform [0, 1)).
- **Injection, not imports.** Sim systems receive the stream via
  `SimContext.rng` or a constructor argument. No module reaches for a global
  generator; the built-in unseeded random function is **banned in sim logic**
  (contract rule 7) and its absence is enforceable by grep/lint.
- **Seed lifecycle.** First boot derives a varied seed —
  `(0xc05a06 ^ ((performance.now() * 1000) | 0)) >>> 0` — then persists it in
  `PersistedState.seed` (`localStorage` key `cqm.state`). Subsequent boots
  replay the same universe until the user resets.
- **Tests and benches** consume fixed seeds: determinism tests assert that
  identical seeds yield identical sequences; benchmarks generate inputs with
  `mulberry32(42)`.

## Consequences

**Positive**

- Reproducible universes: a seed fully determines morphotypes, spawns, and
  every stochastic decision (given the same user input timeline).
- Spatial-hash correctness tests compare against brute force on seeded data;
  algorithm tests can assert termination bounds on known arrays.
- mitata results are comparable across commits.

**Negative / accepted risks**

- **Call-order sensitivity.** All systems share one stream, so inserting a
  draw anywhere shifts every later draw — "same seed" only means "same run"
  for the same code version and input timeline. Accepted; per-system
  substreams (e.g. `mulberry32(hashSeed('shoggoths') ^ seed)`) are the
  documented escape hatch if this ever bites.
- mulberry32 is a 32-bit statistical PRNG: fine for simulation aesthetics,
  explicitly **not** cryptographic, and its period (~2³²) is ample for this
  workload but finite.
- Frame-rate-dependent draw counts (e.g. per-frame probability rolls) mean
  determinism is per-tick, not per-wall-clock-second — replays match only
  with matching timesteps.
