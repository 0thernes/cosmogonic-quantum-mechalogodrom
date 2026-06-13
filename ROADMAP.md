# Roadmap

Where the Cosmogonic Quantum Mechalogodrom has been, is, and is going. Horizons — not dated promises.
Shipped work is in [CHANGELOG.md](./CHANGELOG.md); in-flight cards are on the
[Kanban board](./docs/KANBAN.md); the quality bar is the [500-Point Inspection](./docs/500-POINT-INSPECTION.md).
The **Next** horizon is sourced directly from that inspection's 20 open 🟡 WARNs — each is a named,
deliberate limitation, and promoting one to ✅ is a roadmap item.

## Shipped (the "beyond" arc)

| Version | Codename    | Theme                                                                                     |
| ------- | ----------- | ----------------------------------------------------------------------------------------- |
| 0.1–0.3 | Port        | Single-file WebGL cosmos → Bun + TS + three 0.184, contracts V1, 14 legacy bugs fixed     |
| 0.4     | XENOGENESIS | Alien biome: atmosphere, viz3d, 4-page Observatory, tier ladder to 10k                    |
| 0.5     | RESONANCE   | Fill the 10k ceiling, visible 25-algorithm sort show, 6 dramatic songs, mobile sheets     |
| 0.6     | ATELIER     | Observatory legibility, visible algo picker w/ light + sound, 4-page lab, `/docs` report  |
| 0.7     | BEYOND      | Swarm amendment waves, audit-backlog closure, lab → 12 3D boards/page                     |
| 0.8     | HARDENING   | Bounded-min-heap top-K DSA, CI/CD + CodeQL + governance, ERM/ERP/ROADMAP, 500-point audit |

## Now (in progress)

- Keep the full gate green at every commit (`bun run check`): 453 tests, ~926k assertions.
- Maintain the 500-point inspection as the pre-release bar; re-walk WARNs each tag.
- Documentation completeness sweep — README, architecture, ERD/ERM/ERP, Kanban, roadmap all cross-linked.

## Next (promoting audit WARNs to PASS)

Each item below is an open 🟡 in the [inspection](./docs/500-POINT-INSPECTION.md); the section number
is cited so the work is traceable.

- **Accessibility**
  - `prefers-reduced-motion` opt-out that calms the animated cosmos (§13.258).
  - axe-core automated a11y pass in CI (§13.259).
  - Formal WCAG-AA contrast verification for secondary/disabled states (§13.260).
- **Testing & quality gates**
  - Browser-level e2e (Playwright-class) for input/interaction and WebGL smoke (§17.340, §12.240).
  - Enforce a coverage threshold as a gate, not just broad coverage (§17.339).
  - Perf-regression threshold alert + historical bench time-series (§18.359, §18.360).
- **Security & deploy hardening** (for any public deployment)
  - HTTP security headers — CSP, `X-Content-Type-Options`, `Referrer-Policy` (§14.280).
  - Rate-limiting on `POST /api/audit` (§15.300).
- **Supply chain & ops**
  - Generate an SBOM as a release artifact (§21.420).
  - Optional cross-platform CI matrix (Windows + Linux) (§2.40).
  - A live deploy target (hosted URL) in addition to the downloadable build (§20.400).
- **Audio polish**
  - LUFS loudness normalization across the 6 songs (§10.200).

## Later (exploratory)

- More non-human substrates: additional titan archetypes, deeper economic/war game-theory.
- 2nd-order analytics: predictive omens, cross-system causal traces in the Observatory.
- Procedural lore expansion: longer naming grammars, era-aware epithets.
- WebGPU rendering path behind a feature flag once browser support broadens.
- A "replay from seed" mode that scrubs a deterministic run forward/backward.

## Non-goals

- Multiplayer / networking — the cosmos is a single-machine, single-user instrument by design.
- User accounts, telemetry exfiltration, or any PII collection — privacy scope stays nil.
- A general-purpose engine — this is a focused, opinionated art-simulation, not a framework.

Anything here can be filed as a [feature request](./.github/ISSUE_TEMPLATE/feature_request.yml); the
Kanban board is where accepted items get scoped and pulled into flight.
