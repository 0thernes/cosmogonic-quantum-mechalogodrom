# APEX native kernels — the 1-billion-parameter reproduction backend

The APEX #101 brain (the Entropic Tesseract Hydra) designs toward **one billion parameters**. The heavy
dense organ kernels — a 100M-node prime sieve, a hundred-million-cell heat grid, the pendulum
integrators — cannot run at that scale in single-thread JavaScript. This directory is the **native C/C++
backend** that eventually runs them at scale.

## The contract (ADR-0007, binding)

The native side is **never authoritative**. The seeded TypeScript simulation
([`src/sim/apex-native-backend.ts`](../../src/sim/apex-native-backend.ts) → `ReferenceApexBackend`) is
the **oracle**. A native kernel is _correct_ only when it reproduces the oracle's golden vectors
(`apexGoldenVectors(seed)`) — bit-for-bit, at the defined quantisation (`QUANT = 1e6`). If they
disagree, the C++ is wrong; the oracle wins. This is the same one-way boundary the render engine has:
native may compute or accelerate, but the deterministic TS worldline is the source of truth.

`apex_kernels.hpp` mirrors the oracle algorithm exactly — the same `mulberry32` stream, the same
stencils, the same FNV-1a-over-quantised-floats hash.

## Verify reproduction

```sh
# 1. Build the native golden-vector printer (header-only, no deps):
g++ -std=c++17 -O2 native/apex/apex_golden.cpp -o native/apex/apex_golden      # or clang++ / MSVC

# 2. Print the native vectors:
./native/apex/apex_golden

# 3. Print the authoritative TS oracle vectors:
bun -e "import {apexGoldenVectors} from './src/sim/apex-native-backend'; \
  for (const s of [1,7,12345,0xabcdef]) { const g = apexGoldenVectors(s); \
  console.log(g.seed, g.primeSieve, g.statevector, g.heatGrid, g.pendulum); }"

# 4. The two tables must match. In TS, backendReproducesOracle(nativeBackend) is the gate.
```

## Kernels

| kernel             | organ                | law                                 |
| ------------------ | -------------------- | ----------------------------------- |
| `prime_sieve_hash` | Prime-Sieve Loom     | twin-prime edge set over `n` nodes  |
| `statevector_hash` | Quantum Brain        | Hadamard + phase-kick statevector   |
| `heat_grid_hash`   | Thermodynamic Engine | 5-point heat diffusion (CFL-stable) |
| `pendulum_hash`    | Pendulum Hive        | Chirikov standard-map kicked rotors |

## Determinism note

Cross-platform bit-exactness relies on the `QUANT = 1e6` quantisation absorbing benign FP-rounding
differences between engines. Compile **without** `-ffast-math` for the kernels so IEEE rounding is
preserved (the sibling render engine may use `-ffast-math`; these kernels must not). Where a platform
still diverges after quantisation, the contract is defined at the quantised hash, not raw bits.

## Status

Roadmap. `apex_kernels.hpp` + `apex_golden.cpp` are the contract and its checker; wiring a real
GPU/native compute path for the field/dense tiers (so the manifold's `native-declared` parameters
become genuinely computed) is the next step. Until then the TS oracle runs the capped live tier and
declares the rest honestly (see
[`docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md`](../../docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md)).
