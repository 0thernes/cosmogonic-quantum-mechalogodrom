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
# 1. Build the native golden-vector checker (header-only, no deps):
g++ -std=c++20 -O2 native/apex/apex_golden.cpp -o native/apex/apex_golden      # or clang++ / MSVC

# 2. Its embedded native constants must match the compiled kernels (non-zero on drift):
./native/apex/apex_golden

# 3. Compare the executable to the CURRENT authoritative TypeScript oracle:
bun scripts/verify-native-apex.ts native/apex/apex_golden
```

The native CI job performs the same cross-language comparison after CMake/CTest, so a one-sided
TypeScript, C++, or embedded-vector change cannot self-validate.

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
preserved; the sibling render target follows the same safe rule. Where a platform
still diverges after quantisation, the contract is defined at the quantised hash, not raw bits.

## Status

Roadmap. `apex_kernels.hpp` + `apex_golden.cpp` are the contract and its checker; wiring a real
GPU/native compute path for the field/dense tiers (so the manifold's `native-declared` parameters
become genuinely computed) is the next step. Until then the TS oracle runs the capped live tier and
declares the rest honestly (see
[`docs/NOVELTY-SCIENTIFIC-EDGE-AND-CONTRIBUTIONS-2026-06-26.md`](../../docs/NOVELTY-SCIENTIFIC-EDGE-AND-CONTRIBUTIONS-2026-06-26.md)).
