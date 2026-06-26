<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# NOTICE

Cosmogonic Quantum Mechalogodrom
Copyright (c) 2026 0thernes

This project is owned by 0thernes — © 2026 (see [LICENSE](./LICENSE)). It is released
under a **non-commercial research & play** license: study, research, run, modify, and
share it for any non-commercial purpose, keeping the © 0thernes notices; no for-profit
use without permission. It is not open-source. It bundles or
depends on the following third-party software and fonts, each of which remains
under its own license as listed below.

## Runtime dependencies (bundled into the client build)

| Component                                                                                      | Version | License                | Copyright                                                             |
| ---------------------------------------------------------------------------------------------- | ------- | ---------------------- | --------------------------------------------------------------------- |
| [three](https://threejs.org)                                                                   | 0.184   | MIT                    | (c) 2010-2026 three.js authors                                        |
| [htmx.org](https://htmx.org)                                                                   | 2.x     | 0BSD (Zero-Clause BSD) | (c) Big Sky Software and contributors                                 |
| [tailwindcss](https://tailwindcss.com)                                                         | 4.x     | MIT                    | (c) Tailwind Labs, Inc.                                               |
| [mermaid](https://mermaid.js.org)                                                              | 11.x    | MIT                    | (c) Knut Sveidqvist and contributors                                  |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js)                                   | 4.x     | MIT                    | (c) Jonas Wagner                                                      |
| [graphology](https://graphology.github.io)                                                     | 0.26    | MIT                    | (c) 2016-present Guillaume Plique                                     |
| [graphology-communities-louvain](https://github.com/graphology/graphology-communities-louvain) | 2.0.2   | MIT                    | (c) 2016-present Guillaume Plique                                     |
| [graphology-metrics](https://github.com/graphology/graphology-metrics)                         | 2.4.0   | MIT                    | (c) 2016-present Guillaume Plique                                     |
| [d3-delaunay](https://github.com/d3/d3-delaunay)                                               | 6.0.4   | ISC                    | (c) 2018-2021 Observable, Inc.; (c) 2021 Mapbox (embedded delaunator) |
| [@noble/hashes](https://github.com/paulmillr/noble-hashes)                                     | 2.2.0   | MIT                    | (c) 2022 Paul Miller                                                  |
| [simple-statistics](https://simple-statistics.github.io)                                       | 7.9.0   | ISC                    | (c) 2014 Tom MacWright                                                |

## Fonts (self-hosted via Fontsource)

| Font           | Package                      | License     | Copyright                                        |
| -------------- | ---------------------------- | ----------- | ------------------------------------------------ |
| Inter Variable | `@fontsource-variable/inter` | SIL OFL 1.1 | (c) The Inter Project Authors (Rasmus Andersson) |
| JetBrains Mono | `@fontsource/jetbrains-mono` | SIL OFL 1.1 | (c) JetBrains s.r.o.                             |

The SIL Open Font License 1.1 permits bundling, embedding, and redistribution
of the fonts; the fonts themselves remain under OFL-1.1 and are not relicensed
by this project's proprietary license.

## CDN-loaded (not redistributed)

The standalone lab artifact `lab/quantum-wildbeyond.html` loads
[p5.js](https://p5js.org) (LGPL-2.1) from a public CDN at runtime. p5.js is not
bundled, vendored, or redistributed by this project; it remains under its own
license.

## Ported / adapted algorithms (source-level)

The quantum-mind layer adapts specific algorithms — at the source level, re-implemented in TypeScript —
from the **Tsotchke** quantum research repositories. The original works are MIT-licensed, © 2024–2026
tsotchke; the MIT permission notice is retained here as required, and our derivative implementations
remain governed by this project's proprietary license while honoring the upstream MIT terms.

| Adapted algorithm                              | Ported into                                                            | Upstream source                                                               | License                |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Quantum Geometric Tensor / Fubini–Study metric | `src/math/quantum-geometry.ts` (consumed by `src/sim/super-qubits.ts`) | Tsotchke `quantum_geometric_tensor` (QGTL) + Moonlab `quantum_geometry/qgt.c` | MIT © 2024–26 tsotchke |
| Seeded quantum phase-noise qubit-RNG           | `src/math/eshkol-qrng.ts`                                              | Tsotchke `Eshkol/eshkol_repo/lib/quantum/quantum_rng.{c,h}`                   | MIT © 2024–26 tsotchke |
| Hopfield/Ising spin-glass associative instinct | `src/sim/spin-glass.ts`                                                | Tsotchke `spin_based_neural_network` (`ising_model.c`, `nqs_gradient.c`)      | MIT © 2024–26 tsotchke |

Academic references for the geometric tensor: Provost & Vallée, _Riemannian structure on manifolds of
quantum states_ (1980); Berry, _Quantal phase factors_ (1984); Fukui–Hatsugai–Suzuki (2005). The
statevector simulator (`src/math/quantum.ts`) is this project's own implementation, designed from a
study of the above repos but not copied from them.

## Runtime note

This project is built, tested, and served with [Bun](https://bun.sh)
(MIT-licensed runtime by Oven, Inc.). Bun is a toolchain requirement; it is
not redistributed with this project.

Development-only tooling (TypeScript, Prettier, oxlint, mitata,
bun-plugin-tailwind, type packages) is not redistributed in builds and is
covered by each package's own license.
