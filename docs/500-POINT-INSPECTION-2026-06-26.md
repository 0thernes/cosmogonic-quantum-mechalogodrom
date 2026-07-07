<!-- reviewed: 2026-07-06 | pass 12 compress | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# 500-Point Inspection (index)

Standing audit: **25 sections × 20 checkpoints = 500 points**. Full per-point evidence lived in the
2026-06-26 sweep; this is the **compressed index** — section verdicts only. Re-run before each tagged
release; deltas in [CHANGELOG.md](../CHANGELOG.md).

| Verdict | Count |
| ------- | ----- |
| ✅ PASS | 486   |
| 🟡 WARN | 14    |
| ❌ FAIL | 0     |

Provenance: [MODULE-CONTRACTS-2026-06-26.md](./MODULE-CONTRACTS-2026-06-26.md) · [COMPLEXITY-2026-06-26.md](./COMPLEXITY-2026-06-26.md)

## Section summary (20 points each)

| §   | Topic                   | Pass | Warn | Notes                                                    |
| --- | ----------------------- | ---- | ---- | -------------------------------------------------------- |
| 1   | Repository structure    | 20   | 0    | Layered `src/`, acyclic `world.ts` root                  |
| 2   | TypeScript / strictness | 19   | 1    | `tsc --strict`, no suppressions                          |
| 3   | Determinism law         | 20   | 0    | Seeded `Rng`; GLOB-enforced                              |
| 4   | Module contracts        | 20   | 0    | V1–V102 signatures in MODULE-CONTRACTS                   |
| 5   | Math stack              | 20   | 0    | Pure `src/math/` isolation                               |
| 6   | Simulation core         | 19   | 1    | `src/sim/` bounded contexts                              |
| 7   | Rendering / WebGL       | 19   | 1    | observatory largest surface (~2.1k LOC)                  |
| 8   | Audio                   | 20   | 0    | Web Audio procedural engine                              |
| 9   | UI / observatory        | 18   | 2    | HTMX + Tailwind; a11y gates                              |
| 10  | NHSI / consciousness    | 20   | 0    | Butlin honest framing                                    |
| 11  | Tsotchke integration    | 19   | 1    | 20 projects / 22 entries; 18/21 wired fraction; 3 fenced |
| 12  | Apex / super-mind       | 20   | 0    | Deep-wired faculties tested                              |
| 13  | CI / gates              | 20   | 0    | `bun run check` full pipeline                            |
| 14  | Security                | 19   | 1    | No secrets in frontend                                   |
| 15  | Docs / receipts         | 19   | 1    | sync-surfaces + law tests                                |
| 16  | Benchmarks              | 20   | 0    | `bench/` hot paths                                       |
| 17  | Native engine           | 18   | 2    | C++ roadmap; ADR-0007                                    |
| 18  | Deploy / Pages          | 20   | 0    | GitHub Pages self-recover                                |
| 19  | Dependencies            | 19   | 1    | SBOM + pinned CI                                         |
| 20  | Performance             | 18   | 2    | Frame governor; perf HUD                                 |
| 21  | Accessibility           | 19   | 1    | WCAG contrast gate                                       |
| 22  | Reproducibility         | 20   | 0    | REPRODUCE doc + seed law                                 |
| 23  | Open-endedness          | 19   | 1    | 10 angles wired                                          |
| 24  | Agent / copilot fence   | 20   | 0    | Fenced LLM repos                                         |
| 25  | Living docs hygiene     | 20   | 0    | No archive forks                                         |

**WARN themes (14):** native engine not fully in-loop; observatory size; coupling mean still low regime;
external peer validation thin. See [NHSI-PROGRESS-DASHBOARD](./NHSI-PROGRESS-DASHBOARD-2026-06-26.md).

**Regenerate detail:** prior 500-line checklist in git history pre-2026-07-06 compress pass.
