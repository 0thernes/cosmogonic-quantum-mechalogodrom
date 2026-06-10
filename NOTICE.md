# NOTICE

Cosmogonic Quantum Mechalogodrom
Copyright (c) 2026 0thernes

This project is licensed under the MIT License (see [LICENSE](./LICENSE)).
It bundles or depends on the following third-party software and fonts.

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
by this project's MIT license.

## CDN-loaded (not redistributed)

The standalone lab artifact `lab/quantum-wildbeyond.html` loads
[p5.js](https://p5js.org) (LGPL-2.1) from a public CDN at runtime. p5.js is not
bundled, vendored, or redistributed by this project; it remains under its own
license.

## Runtime note

This project is built, tested, and served with [Bun](https://bun.sh)
(MIT-licensed runtime by Oven, Inc.). Bun is a toolchain requirement; it is
not redistributed with this project.

Development-only tooling (TypeScript, Prettier, oxlint, mitata,
bun-plugin-tailwind, type packages) is not redistributed in builds and is
covered by each package's own license.
