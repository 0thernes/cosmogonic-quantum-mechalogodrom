<!-- reviewed: 2026-07-11 | V4 Phase-A organism intelligence | canonical code: src/sim/tsotchke-registry.ts -->

# Tsotchke Corpus → Cosmogonic — integration map

This is the binding public ledger for the live repositories under the `tsotchke` user and the
`Tsotchke-Corporation` organization. It distinguishes copied/ported mathematics, local deterministic
facades, build-time harvests, deliberate fences, and metadata. –Accounted for— does not mean every
repository is copied into, or has equal causal depth in, the simulation.

The authoritative code ledger is `src/sim/tsotchke-registry.ts`. The current causal evidence is the
[V4 Phase-A report](./reports/ORGANISM-INTELLIGENCE-V4-RESULTS-2026-07-11.md); the
[2026-07-10 V3 audit](./reports/2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md) is its
preserved predecessor. V4 supports only bounded Titan game-policy semantic causality; it withholds
ordinary recurrent benefit, adaptive prediction, Petri causality, neural scaling, pooled scaling, and all
consciousness/sentience uplift.

## Current totals

| Measure                    |                       Current value |
| -------------------------- | ----------------------------------: |
| External repositories      | `22` (`15` user + `7` organization) |
| Deep                       |                                 `8` |
| Wired                      |                                 `7` |
| Harvest                    |                                 `2` |
| Fenced                     |                                 `4` |
| Meta                       |                                 `1` |
| Integrated, excluding meta |        `17/21 = 0.8095238095238095` |

The former tally was wrong because it counted Cosmogonic's internal `classical-contrast` control as an
external repository and omitted the external `OBLITERATUS` repository. The control remains operational,
but it is listed separately and never inflates external coverage.

### Depth and representation

- **Deep:** a hot mind/world/scientific substrate path.
- **Wired:** a live world/simulation path, commonly a clean deterministic facade.
- **Harvest:** toolchain, catalog, DNA, or API-level material; not a hot-path source port.
- **Fenced:** zero simulation wiring by mandate or license boundary.
- **Meta:** organizational metadata only.
- **Direct port:** compatible mathematics represented directly with attribution.
- **Deterministic facade:** local Cosmogonic behavior inspired by an upstream role; not source parity.

## All 22 external repositories

|   # | Repository                  | Owner        | Depth   | Representation               | Cosmogonic leaf / role                                                                       | Declared source boundary                                      |
| --: | --------------------------- | ------------ | ------- | ---------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
|   1 | `eshkol`                    | user         | deep    | direct port + local analogue | `sim/eshkol-bridge.ts`; AD/GWT bridge and `.esk` DNA                                         | MIT; attribution required                                     |
|   2 | `moonlab`                   | user         | deep    | direct port                  | `sim/moonlab-tensor.ts`; Clifford/tensor substrate                                           | MIT; attribution required                                     |
|   3 | `tensorcore`                | user         | deep    | deterministic facade         | `sim/tensorcore-facade.ts`; local GEMM/attention role                                        | MIT; facade, not source parity                                |
|   4 | `libirrep`                  | user         | deep    | direct port                  | `sim/irrep-symmetry.ts`; symmetry constraints                                                | MIT; attribution required                                     |
|   5 | `spin_based_neural_network` | user         | deep    | direct port                  | Hopfield/spin-glass path                                                                     | MIT; attribution required                                     |
|   6 | `quantum_geometric_tensor`  | user         | deep    | direct port                  | quantum-geometry path                                                                        | MIT; attribution required                                     |
|   7 | `quantum_rng`               | user         | deep    | deterministic adaptation     | `eshkol-qrng`; seeded classical statevector path                                             | MIT; no hardware-entropy claim                                |
|   8 | `classical_rng`             | user         | deep    | direct port                  | `sim/classical-contrast.ts`; same-seed/same-length descriptive contrast, not entropy matched | MIT; feeds separately ledgered internal control               |
|   9 | `simple_mnist`              | user         | wired   | deterministic facade         | `sim/perceptron-baseline.ts`                                                                 | MIT; local baseline facade                                    |
|  10 | `asteroids`                 | user         | wired   | deterministic facade         | `sim/asteroids-physics.ts`; motility physics                                                 | MIT; local physics facade                                     |
|  11 | `PINN`                      | user         | wired   | deterministic facade         | `sim/pinn-residual.ts`; residual channel                                                     | no LICENSE; chain-of-title pending                            |
|  12 | `PIMC`                      | user         | wired   | deterministic facade         | `sim/pimc-paths.ts`; path-sampling channel                                                   | no LICENSE; chain-of-title pending                            |
|  13 | `ulg`                       | organization | wired   | deterministic facade         | `sim/ulg-bridge.ts`; rule/law channel                                                        | no LICENSE; assignment pending                                |
|  14 | `logo-lab`                  | organization | wired   | deterministic facade         | `sim/logo-turtle.ts`; procedural morph channel                                               | no LICENSE; assignment and NOTICE pending                     |
|  15 | `quantum-quake`             | organization | wired   | deterministic facade         | `sim/qge-aliveness.ts`; aliveness observable                                                 | GPL-derived upstream quarantined; separability review pending |
|  16 | `homebrew-eshkol`           | user         | harvest | harvest only                 | `sim/homebrew-eshkol.ts`; toolchain/catalog signal                                           | no LICENSE; no upstream source port                           |
|  17 | `Quantum-RNG-API`           | organization | harvest | harvest only                 | `sim/quantum-rng-api.ts`; API/toolchain signal                                               | MIT; REST wrapper is redundant to integrated core             |
|  18 | `gpt2-basic`                | user         | fenced  | none                         | no simulation leaf                                                                           | MIT; excluded by non-LLM mandate                              |
|  19 | `llm-arbitrator`            | user         | fenced  | none                         | no simulation leaf                                                                           | MIT; excluded by non-LLM mandate                              |
|  20 | `SolanaQuantumFlux`         | organization | fenced  | none                         | no simulation leaf                                                                           | proprietary; incompatible without explicit license            |
|  21 | `OBLITERATUS`               | organization | fenced  | none                         | no simulation leaf                                                                           | AGPL-3.0 refusal-removal LLM toolkit; mandate-fenced          |
|  22 | `.github`                   | organization | meta    | metadata                     | registry provenance only                                                                     | no runtime source or simulation leaf                          |

### Internal control, not an external repository

| ID                   | Role                                                                    | Operational status                                         |
| -------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `classical-contrast` | Quantum-versus-classical experimental control backed by `classical_rng` | live, but excluded from the external count and denominator |

## Shared organism-intelligence path

`src/sim/tsotchke-organism-intelligence.ts` evaluates all 22 repository rows at a bounded cadence,
folds them into four aggregate semantic channels, and reuses one stable signal object. Ordinary
entities, flora, shoggoths, puppeteers, titans,
leviathans, NHI, glyph beings, wilderness fauna, and primordial digital biologics consume bounded
parts of that signal; existing Archon/apex paths remain in place. The field carries resource pressure,
threat response, exploration, social drive, plasticity, Taylor forecast, confidence, channel values,
and health/revision state.

The preserved V3 fixed-family predecessor found:

- all `17/17` integrated external rows changed final entity velocity on every evaluation seed;
- all `5/5` excluded rows (four fences plus metadata) were exactly inert;
- goal-only and corpus-conditioned differences passed their matched controls;
- reversal adaptation cleared the script-declared 5% threshold at `6.1213%` on the fresh disjoint fixed
  seed family;
- enhanced behavior did not separate from the uniform random-action baseline;
- rotating all four exposed aggregate channels and replacing the final exploration value with a uniform
  surrogate did not establish mapping, substrate, or quantum specificity;
- all 30 batch medians across three fresh 50,000-entity processes stayed below `3 ms` after hot-path
  precomputation and trigonometric reuse;
- all named living-system classes now have matched full-class counterfactuals.

These findings support bounded deterministic corpus-conditioned behavior on a fixed evaluation family.
They do not support general intelligence, consciousness, sentience, repository-identity specificity,
quantum advantage, or additional numeric score uplift.

The V4 descendant then tested semantic identity and family outcomes directly. Ordinary and Petri
contrasts were positive but missed the fixed magnitude floor, the adaptive predictor failed both controls,
and Titans alone passed. The resulting claim remains only bounded Titan game-policy semantic causality;
the registry counts and every broader prohibition above are unchanged.

## Eshkol boundary

Cosmogonic pins its reference to Eshkol `v1.3.2-evolve` commit
`8443ddaeecec579c60ac858348a23cf1912d7a78`, which includes corrections beyond v1.3.1. The local
Taylor-jet implementation is an order-0-through-8 Float64 runtime analogue. It is not native Eshkol
parity, unlimited Taylor order, exact-rational arithmetic, or full R7RS.

`.esk` files may be harvested as deterministic heritable fingerprints when the local corpus is
available. A harvested fingerprint records provenance and supplies a simulation signal; it does not
make the TypeScript runtime an Eshkol interpreter by itself.

## Quantum RNG boundary

The reference is Quantum RNG `v3.0.1` commit
`a00ad483cbbef31ea7536f09ae99409d81c9a823`; v3.0.1 fixes range and race defects in v3.0.0. The
Cosmogonic leaf is a seeded, deterministic classical statevector adaptation with diagnostic
repetition/adaptive-proportion-style counters. It is not a CSPRNG, physical entropy source, SP 800-90B
certification, physical Bell experiment, or proof of quantum advantage. A simulated CHSH value near
`2√2` is model-conformance evidence only. The live upstream audit also observed an ARM64
duplicate-output test failure, so no security- or production-readiness claim is made.

## License and provenance gates

This section records repository evidence, not legal advice.

- `PINN` and `PIMC`: no LICENSE file; keep local work at deterministic-facade depth until
  chain-of-title is cleared.
- `ulg` and `logo-lab`: no LICENSE file; assignment/NOTICE work remains before source integration.
- `quantum-quake`: keep GPL-derived source quarantined; the local deterministic facade is not a claim
  of upstream source integration.
- `SolanaQuantumFlux`: proprietary; fenced pending an explicitly compatible license.
- `OBLITERATUS`: AGPL-3.0 and LLM-oriented; fenced.
- `gpt2-basic` and `llm-arbitrator`: permissive license does not override the non-LLM simulation
  mandate; both remain deliberately inert.

See [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) for attribution and
[ADR-0013](./adr/0013-operational-organism-intelligence-2026-07-10.md) for the binding runtime and
claim contract.
