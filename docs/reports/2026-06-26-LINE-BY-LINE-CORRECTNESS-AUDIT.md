# Line-by-line correctness audit — 2026-06-26

A multi-agent line-by-line audit of all 195 `src/**/*.ts` files (each finding produced by a
reader that read the file in full, then **adversarially verified** by an independent agent that
tried to refute it). Determinism, type-safety, and the full gate already pass on `main`; this hunts
for the correctness bugs that types + lint + a green suite can still miss.

Scope note: the apex/sim path is pinned by the 300-frame determinism golden
(`tests/feature-determinism.test.ts`). Fixes that change a **live** sim trajectory flip the golden
hash and therefore need a deliberate re-baseline — an owner call. This report **fixes everything
that is golden-safe** (dead/unused code, pure guards, or non-sim) and **flags** the rest with the
exact fix so the owner can apply it alongside a re-baseline.

## Fixed (golden-safe, gate-green)

Landed on branch `audit/correctness-fixes` (rebased onto the latest `main`):

| File:line | Sev | Bug | Fix |
| --- | --- | --- | --- |
| `math/mixed-state-qgt.ts:187` | major | `computeEntropy` got `dim` (d) not `d2` (d²) → `Tr(ρ²)` summed only row 0 of ρ; a pure state read linear-entropy 0.5 instead of 0 (disagreeing with `purity`). | pass `d2`. |
| `math/irrep.ts:101` | minor | `clebschGordan` guarded only `J`; large unclamped `j1`/`j2` overflowed the factorial table to `Infinity` → non-finite CG. | guard `j1`/`j2` too. |
| `sim/emergent-language.ts:184` | minor | `createSign` double-incremented `nextSignId` → ids/representations skipped (0,2,4,…). | drop the second increment. |
| `sim/eshkol-bridge.ts` | minor | unbounded `kbFacts` Map (float-derived key). | FIFO-bound at `KB_FACTS_MAX`. |
| `math/rng.ts:34` | minor | garbled "Ralph 10x" graft injected mid-sentence in the `hashSeed` doc. | remove (code unchanged). |
| `sim/super-mind.ts:111` | minor | 4 stale `eslint-disable no-unused-vars` (imports are used; project lints with oxlint). | remove. |
| `check-out.txt` / `.gitignore` | — | 542 KB UTF-16 console dump tracked + referenced nowhere. | untrack + gitignore; dedupe. |

A second batch (`nqs-vmc-learning`, `resonance-integrator`, `tsotchke-deep-wire`, all currently
**dead code** — no live callers — hence golden-safe) lands in the follow-up commit:

| File:line | Sev | Bug | Fix |
| --- | --- | --- | --- |
| `sim/nqs-vmc-learning.ts:112` | major | `rng() >>> (32-vc)` — `rng()`∈[0,1) is ToUint32-truncated to 0, so every VMC walker seeded the identical all-zeros bitstring (seed ignored). | `(rng()*0x100000000) >>> (32-vc)`. |
| `sim/resonance-integrator.ts:109` | major | spurious `* Math.PI` blew the phase to [0, π²], breaking every downstream phase comparison. | use `atan2` directly. |
| `sim/resonance-integrator.ts:165` | major | `findCoalition` angular wrap only handled [0,2π]; out-of-range angles admitted anti-phase faculties. | robust modulo wrap to [0,π]. |
| `sim/tsotchke-deep-wire.ts:259` | major | SU(2) character table did `sin/sin` 0/0 at the row endpoints (m=0, m=j) and all of j=0 → `NaN`. | return the removable-singularity limit (dimension 2j+1). |
| `sim/nqs-vmc-learning.ts:395` | minor | hand-rolled LCG multiply exceeded 2⁵³, losing low bits before the mask. | `Math.imul` exact 32-bit. |

## Open — confirmed, but live/sim (needs a golden re-baseline; owner call)

### `sim/primordial-soup.ts:139` — major/logic — strain selection is dead code
The only death branch `if (vitality < 0.05 && generation < 5) alive = 0` never fires: vitality is
seeded in [0.1,0.3] and is **monotonically non-decreasing** (growth ≥ 0.001 every tick;
`pinnFactor` magnitude ~8e-5 can't overcome it), and the only other write resets to 0.35. So
`liveCount` only rises — the documented selection pressure never operates. Secondarily the
`generation < 5` gate makes any strain of generation ≥ 5 immortal (inverts "protect the young").
**Fix:** give vitality a small per-tick metabolic cost (or let `pinnFactor` pull below 0.05) **and**
fix the gate (drop `generation < 5` or invert to a young-strain grace period). Empirically verified
over 6 seeds × 2000 ticks: `liveCount` never decreased. Changes the sim trajectory → re-baseline.

## Open — minors in live sim (verify + re-baseline, or confirm intended)

These were single-agent findings (not independently re-verified) and touch live paths; each lists the
suggested fix. Re-baseline the golden if applied.

- **`sim/memory-orchestra.ts:129`** — narrative consolidation permanently stops once the 128-slot
  ring fills (`len` is a fill-count pinned at CAP, so `len - lastConsol` can never exceed 12 again).
  Fix: gate on a separate monotonic write counter.
- **`sim/narrative-memory.ts:158`** — `retrieve()` reads `ring[max(0, head-1)]` as "now"; when `head`
  has wrapped to 0 it reads the **oldest** entry, not the newest. Fix: `(head-1+CAP) % CAP`.
- **`sim/petri-dish.ts:286`** — `applyBrutalRelease` is handed `state.biologics.map(b => ({...}))`, a
  throwaway copy; all vitality mutations land on disposable objects and are discarded (the release
  does nothing). Fix: operate on the real objects (and consume the returned summary).
- **`sim/successor-representation.ts:75`** — an out-of-range plan index is silently remapped to state
  0, injecting phantom transitions into the SR map and biasing lookahead toward plan 0. Fix: treat an
  out-of-range index as a no-op (return early), don't fabricate a state-0 transition.
- **`sim/self-evolution-loop.ts:161`** — the complexity budget is checked only against a proposal's
  self-declared field; the live `metrics.complexity` (×1.1 per accepted architecture/faculty mod) is
  never compared to `config.maxComplexity` → unbounded growth. Fix: validate the projected live value.
- **`sim/temporal-crystal.ts:119`** — the period-doubling order parameter's `expectedSign` reads
  `floquetCycle % 2`, but `floquetCycle` advances by 2 each step so it is always even → sign is
  permanently +1 (the half-frequency signature never alternates). Fix: measure inside the inner
  Floquet loop, or track parity as `(floquetCycle / FLOQUET_CYCLES) % 2`.
- **`sim/quantum-quake-physics.ts:85`** — the QGT central difference straddles the `pos % 1` wrap at
  integer coordinates (+ε vs −ε land on opposite branches), producing a spurious huge metric. Fix:
  wrap the ±ε-shifted params to the same branch before building the packet.
- **`sim/super-mind.ts:987`** — `quantumMagic` is fed `n = min(6, log2(16)) = 4` (dim 16) but reads
  from the 6-qubit (64-entry) qmind snapshot, and reconstructs amplitudes incorrectly, so the reflex
  term is meaningless. Fix: pass `QMIND_QUBITS = 6` and the real amplitudes
  (`re = √prob·cos φ`, `im = √prob·sin φ`).
- **`sim/super-qubits.ts:262`** — `evolve()` stores `dSup = sup` (line 253) so the UI-cadence QGT can
  replay the same circuit, then overwrites it with a gwt-perturbed value (line 262) while the register
  is evolved with `sup` — so `geometricMetric()` replays a *different* circuit than was evolved. Fix:
  don't overwrite `dSup` after `applyCircuit` (or apply the gwt modulation to `sup` before storing).
- **`sim/plastic-weights.ts:95`** — `overlayInPlace` reads `x` while writing `out` row-by-row; if a
  caller aliases `out === x` the output is corrupted. No current caller aliases (latent). Fix: document
  + enforce non-aliasing (matching `recall()`), or snapshot inputs before writing.
- **`sim/resonance-integrator.ts:298`** *(dead code)* — `applyValence` rebases `phaseTolerance` off the
  module `DEFAULT_CONFIG` rather than the instance's configured base, discarding a constructor-supplied
  tolerance and never composing. Fix: capture `baseTolerance` at construction and modulate off it.

## Coverage / method

- All 195 `src` files were chunked and read in full by finder agents; every major/blocker was
  re-checked by an independent refutation pass (confirmed only when a concrete reachable failure
  survived). The first run lost ~13 chunks to a transient server-side rate limit; a throttled
  re-run (2-agent waves) covered them. Two confirmed bugs in that region (iit `computeLocalIntegration`
  constant-1, myth-ritual id/label) were independently found and fixed on `main` by the owner during
  this audit, so they are not re-listed here.
- Determinism was independently scanned: no real `Math.random`/`Date.now` in sim logic (every match is
  a doc comment asserting their absence). No TODO/FIXME, no leftover `console.log`, no live `@ts-nocheck`
  / `eslint-disable` after the fixes above.
