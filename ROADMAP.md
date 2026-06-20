# Roadmap

Where the Cosmogonic Quantum Mechalogodrom has been, is, and is going. Horizons â€” not dated promises.
Shipped work is in [CHANGELOG.md](./CHANGELOG.md); in-flight cards are on the
[Kanban board](./docs/KANBAN.md); the quality bar is the [500-Point Inspection](./docs/500-POINT-INSPECTION.md).
The **Next** horizon is sourced directly from that inspection's 14 open ðŸŸ¡ WARNs â€” each is a named,
deliberate limitation, and promoting one to âœ… is a roadmap item.

## Shipped (the "beyond" arc)

| Version   | Codename    | Theme                                                                                                                                                                    |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1â€“0.3 | Port        | Single-file WebGL cosmos â†’ Bun + TS + three 0.184, contracts V1, 14 legacy bugs fixed                                                                                  |
| 0.4       | XENOGENESIS | Alien biome: atmosphere, viz3d, 4-page Observatory, tier ladder to 10k                                                                                                   |
| 0.5       | RESONANCE   | Fill the 10k ceiling, visible 25-algorithm sort show, 6 dramatic songs, mobile sheets                                                                                    |
| 0.6       | ATELIER     | Observatory legibility, visible algo picker w/ light + sound, 4-page lab, `/docs` report                                                                                 |
| 0.7       | BEYOND      | Swarm amendment waves, audit-backlog closure, lab â†’ 12 3D boards/page                                                                                                  |
| 0.8       | HARDENING   | Bounded-min-heap top-K DSA, CI/CD + CodeQL + governance, ERM/ERP/ROADMAP, 500-point audit                                                                                |
| 0.9       | AGImAGNOSIS | Pre-transformer game/A-Life AI (FSMÂ·utilityÂ·TinyMLPÂ·MarkovÂ·GOAP), genome+lineage, 8 factions, leviathans, NHI, artifact field, free-LLM Copilot, 5 cinematic cameras |

## Now (in progress)

- Keep the full gate green at every commit (`bun run check`): 1410 tests, ~1.74M assertions, 94.45% line / 91.30% func coverage. Tsotchke fully wired, digital biologics growing in the soup.
- Maintain the 500-point inspection as the pre-release bar; re-walk WARNs each tag.
- Documentation completeness sweep â€” README, architecture, ERD/ERM/ERP, Kanban, roadmap all cross-linked.

## Next (promoting audit WARNs to PASS)

Each item below is an open ðŸŸ¡ in the [inspection](./docs/500-POINT-INSPECTION.md); the section number
is cited so the work is traceable. (Promoted to âœ… post-`0.9.0` and retired from this list:
reduced-motion Â§13.258, WCAG-contrast gate Â§13.260, CI coverage gate Â§17.339, cross-platform CI
matrix Â§2.40, and a release SBOM Â§21.420.)

- **Accessibility**
  - axe-core automated a11y pass in CI, beyond the current static-markup gate (Â§13.259).
- **Testing & quality gates**
  - Browser-level e2e (Playwright-class) for input/interaction and WebGL smoke (Â§17.340, Â§12.240).
  - Perf-regression threshold alert + historical bench time-series (Â§18.359, Â§18.360).
- **Security & deploy hardening** (for any public deployment)
  - HTTP security headers â€” CSP, `X-Content-Type-Options`, `Referrer-Policy` (Â§14.280).
  - Rate-limiting on `POST /api/audit` (Â§15.300).
  - SSRF allow-listing + error-text secret scrubbing on the 11-provider Copilot fetch path.
- **Supply chain & ops**
  - A live deploy target (hosted URL) in addition to the downloadable build (Â§20.400).
- **Audio polish**
  - LUFS loudness normalization across the 6 songs (Â§10.200).

## Later (exploratory)

- More non-human substrates: additional titan archetypes, deeper economic/war game-theory.
- 2nd-order analytics: predictive omens, cross-system causal traces in the Observatory.
- Procedural lore expansion: longer naming grammars, era-aware epithets.
- WebGPU rendering path behind a feature flag once browser support broadens.
- A "replay from seed" mode that scrubs a deterministic run forward/backward.

## Non-goals

- Multiplayer / networking â€” the cosmos is a single-machine, single-user instrument by design.
- User accounts, telemetry exfiltration, or any PII collection â€” privacy scope stays nil.
- A general-purpose engine â€” this is a focused, opinionated art-simulation, not a framework.

Anything here can be filed as a [feature request](./.github/ISSUE_TEMPLATE/feature_request.yml); the
Kanban board is where accepted items get scoped and pulled into flight.
