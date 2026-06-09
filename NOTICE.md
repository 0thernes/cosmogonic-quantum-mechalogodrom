# NOTICE

Cosmogonic Quantum Mechalogodrom
Copyright (c) 2026 0thernes

This project is licensed under the MIT License (see [LICENSE](./LICENSE)).
It bundles or depends on the following third-party software and fonts.

## Runtime dependencies (bundled into the client build)

| Component                                                    | Version | License                | Copyright                             |
| ------------------------------------------------------------ | ------- | ---------------------- | ------------------------------------- |
| [three](https://threejs.org)                                 | 0.184   | MIT                    | (c) 2010-2026 three.js authors        |
| [htmx.org](https://htmx.org)                                 | 2.x     | 0BSD (Zero-Clause BSD) | (c) Big Sky Software and contributors |
| [tailwindcss](https://tailwindcss.com)                       | 4.x     | MIT                    | (c) Tailwind Labs, Inc.               |
| [mermaid](https://mermaid.js.org)                            | 11.x    | MIT                    | (c) Knut Sveidqvist and contributors  |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js) | 4.x     | MIT                    | (c) Jonas Wagner                      |

## Fonts (self-hosted via Fontsource)

| Font           | Package                      | License     | Copyright                                        |
| -------------- | ---------------------------- | ----------- | ------------------------------------------------ |
| Inter Variable | `@fontsource-variable/inter` | SIL OFL 1.1 | (c) The Inter Project Authors (Rasmus Andersson) |
| JetBrains Mono | `@fontsource/jetbrains-mono` | SIL OFL 1.1 | (c) JetBrains s.r.o.                             |

The SIL Open Font License 1.1 permits bundling, embedding, and redistribution
of the fonts; the fonts themselves remain under OFL-1.1 and are not relicensed
by this project's MIT license.

## Runtime note

This project is built, tested, and served with [Bun](https://bun.sh)
(MIT-licensed runtime by Oven, Inc.). Bun is a toolchain requirement; it is
not redistributed with this project.

Development-only tooling (TypeScript, Prettier, oxlint, mitata,
bun-plugin-tailwind, type packages) is not redistributed in builds and is
covered by each package's own license.
