# Peer-Review Meta-Analysis — Cosmogonic Quantum Mechalogodrom

**Purpose:** A falsifiable, defensible academic framework comparing this repository’s artificial-life stack against the broader A-Life / complex-systems / cognitive-architecture field. This is a **living scaffold** — expand each checkpoint with measured citations and repo line receipts (`file:line`).

**Honesty clause (binding):** Computational indicators of integration ≠ sentience, consciousness, or sentience claims. NHSI / Butlin-path language in-repo is explicitly non-sentience per `docs/reports/2026-06-21-NHSI-HONESTY-AUDIT.md`.

---

## Abstract (draft)

Cosmogonic Quantum Mechalogodrom (CQM) is a deterministic, browser-hosted artificial-life dome combining population genetics, multi-agent economies, quantum-inspired measurement layers, 100+ glyph archetypes with ~25k-parameter visual brains each, five Archon super-minds, and a Mechalogodrom apex scaffold targeting 5M designed parameters. This document structures **500 falsifiable checkpoints** across **25 domains** for meta-analytic comparison against ≥100 published A-Life systems.

---

## Method

1. **Inclusion:** Open or reproducible A-Life / ALife conference / artificial chemistries / Tierra-family / Lenia / soft robotics sims with published metrics.
2. **Exclusion:** Pure game engines without population dynamics; non-reproducible demos.
3. **CQM evidence:** `bun run check`, golden-hash replay, `docs/VERIFICATION-ANALYTICAL-DATA.md`, module contracts.
4. **Scoring:** Each checkpoint ∈ {0 absent, 1 partial, 2 met, 3 exceeds field median}. Target: defensible ≥2 on ≥70% of checkpoints.

---

## 25 domains × 20 checkpoints (500 total)

Each domain lists 20 testable claims. Mark status in the right column as work proceeds.

### 1. Reproducibility & determinism (20)

| #         | Checkpoint                                                                    | CQM anchor                          |
| --------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| 1.1       | Seeded RNG centralised                                                        | `src/math/rng.ts`                   |
| 1.2       | No `Math.random` in sim hot path                                              | oxlint / audit                      |
| 1.3       | Golden-hash CI                                                                | `.github/workflows/golden-hash.yml` |
| 1.4       | Replay from seed                                                              | world persist + seed boot           |
| 1.5       | Version pinned in receipts                                                    | `scripts/canonical-receipts.ts`     |
| 1.6       | Test count synced surfaces                                                    | `bun run sync:check`                |
| 1.7       | Build gate single command                                                     | `bun run check`                     |
| 1.8       | HMR-safe dispose paths                                                        | entity/pantheon dispose             |
| 1.9       | Documented nondeterminism exceptions                                          | MODULE-CONTRACTS                    |
| 1.10      | Frame budget documented                                                       | BENCHMARKS doc                      |
| 1.11–1.20 | _(extend: cross-browser WebGL variance, float order, worker isolation, etc.)_ | TBD                                 |

### 2. Population dynamics & evolution (20)

| #        | Checkpoint                                                       | CQM anchor      |
| -------- | ---------------------------------------------------------------- | --------------- |
| 2.1      | Birth/death/remorph lifecycle                                    | `entities.ts`   |
| 2.2      | 26 behavior repertoire                                           | `behaviors.ts`  |
| 2.3      | Auto-split under pressure                                        | entities        |
| 2.4      | Temperature-modulated mortality                                  | entities        |
| 2.5      | Phylum/morph diversity                                           | phyla tables    |
| 2.6      | Connectome rebuild cadence scales with N                         | `world.ts`      |
| 2.7      | Graph community detection                                        | graphMind       |
| 2.8      | Stigmergy / field coupling                                       | super creatures |
| 2.9–2.20 | _(extend: speciation metrics, Shannon diversity live HUD, etc.)_ | TBD             |

### 3. Multi-agent cognition (20)

| #        | Checkpoint                                       | CQM anchor               |
| -------- | ------------------------------------------------ | ------------------------ |
| 3.1      | Per-entity brains (cohort tick)                  | entityBrains             |
| 3.2      | 5 Archon deep minds                              | super-minds              |
| 3.3      | 100 × 25k glyph brains                           | `glyph-brain.ts`         |
| 3.4      | APEX 100k→5M roadmap                             | `apex-brain.ts`          |
| 3.5      | Mechalogodrom 5M designed                        | `mechalogodrom-brain.ts` |
| 3.6      | Theory-of-mind ensemble (6-family)               | NHSI dashboard           |
| 3.7      | Visual brain observatory                         | `super-neural.ts`        |
| 3.8      | MEGA 4D tesseract mode                           | tab IV cycle             |
| 3.9–3.20 | _(extend: ablation studies, lesion tests, etc.)_ | TBD                      |

### 4. Physics & environment (20)

Arena containment, wind, sectors, atmosphere, RD, singularities, titans, quantum cloud — receipts in MODULE-CONTRACTS V1/V2.

### 5. Economy & game-theoretic coupling (20)

Market tick, sanctions, wallet, hero progression — `economy.ts`, superhero state.

### 6. Measurement & observability (20)

Audit log, telemetry HUD, ALife metrics gallery, benchmarks, smoke tests.

### 7. UI/UX & human-in-the-loop (20)

Center HUD, settings relocation, BIBLE manual, help system, mobile sheets.

### 8. Quantum-inspired layer (20)

QPU facade, Tsotchke corpus, collapse events, Bloch viz — never claim hardware QPU unless wired.

### 9. Emergence indicators (20)

Butlin-path partials — honest 8/14 met, 6/14 partial per NHSI audit.

### 10. Scalability (20)

Instancing, cadence ladders at 2k/5k/20k entities, frame pipeline ADR.

### 11. Security & supply chain (20)

THIRD-PARTY-NOTICES, no secrets in repo, hook-enforced sync.

### 12. Documentation completeness (20)

BOOK, MODULE-CONTRACTS, PHILOSOPHY, living reports policy.

### 13. Falsifiability hooks (20)

Each major claim maps to a test or metric — this document.

### 14. Comparative ALife benchmarks (20)

| #           | Checkpoint                                        | CQM anchor               |
| ----------- | ------------------------------------------------- | ------------------------ |
| 14.1        | Tierra comparison (population scale)              | 50k vs ~1k               |
| 14.2        | Avida comparison (determinism)                    | Seeded RNG, golden hash  |
| 14.3        | Lenia comparison (continuous dynamics)            | RD tiles in WildBeyond   |
| 14.4        | Polyworld comparison (neural nets)                | 25k glyph brains         |
| 14.5        | Boids comparison (flocking)                       | Wolfpack behavior        |
| 14.6        | Open-endedness metrics (Bedau/Packard)            | `open-endedness.ts`      |
| 14.7        | Browser-native advantage (zero install)           | Bun + WebGL              |
| 14.8        | Quantum layer uniqueness                          | Tsotchke statevector sim |
| 14.9        | Multi-currency economy comparison                 | 4-currency market        |
| 14.10       | Brain observatory comparison                      | 4-tab neural observatory |
| 14.11–14.20 | _(extend: Neural Darwinism, Heap of Souls, etc.)_ | TBD                      |

### 15. Neuroscience plausibility (20)

Connectome, spike trains, layer bands — explicitly "computational metaphor" not neuroclaim.

### 16. Philosophy & ethics (20)

PHILOSOPHY doc, non-sentience binding, access puzzle consent metaphor.

### 17. WildBeyond / educational corpus (20)

36 tiles, deterministic seeds, mobile fit, MIT Tsotchke lineage.

### 18. Long-horizon roadmap (20)

1B neuron target, ventures, multiplayer scaffold — labeled aspirational.

### 19. Open science & data export (20)

SVG reports, API waitlist, replay export — extend.

### 20. Performance per watt (20)

Frame ms HUD, bench scripts — extend with WebGPU path later.

### 21. Accessibility (20)

ARIA on HUD, touch targets ≥44px, reduced motion.

### 22. Cross-platform (20)

Windows CRLF law, Bun bundler cwd requirement, mobile WildBeyond.

### 23. Institutional fit (20)

See outreach table below — SFI, ELSI, MIT Media Lab, etc.

### 24. Funding narrative (20)

Solo dev honesty, defensible demos, peer-review preprint path.

### 25. Kill criteria (20)

Explicit conditions under which claims would be withdrawn (failed golden hash, broken determinism, etc.).

---

## Institution outreach scaffold (cold contact — verify before send)

| Institution                               | Contact type               | Interest angle                           |
| ----------------------------------------- | -------------------------- | ---------------------------------------- |
| Santa Fe Institute                        | Complex systems / ALife    | Emergence metrics, graph mind            |
| MIT CSAIL Synthetic Biology               | ALife + computation        | Tsotchke quantum corpus integration      |
| ELSI Tokyo                                | Origins of life            | Chemo-digital hybrid metaphor            |
| University of Sussex CCNR                 | Cognitive science          | Butlin-indicator honesty framework       |
| IT University Copenhagen                  | Game AI / ALife            | Browser-scale deterministic dome         |
| International Society for Artificial Life | Conference                 | Demo + reproducibility package           |
| ALife Society (ISAL)                      | Conference / journal       | ALife 2026 submission, demo track        |
| MIT Media Lab                             | HCI + ALife                | Browser-native interactive evolution     |
| Stanford SAIL                             | AI / cognition             | Active inference + free energy impl      |
| OpenAI Scholars                           | Research access            | Deterministic ALife benchmark env        |
| Google DeepMind                           | Research collaboration     | Open-endedness metrics, ALife env        |
| NVIDIA Research                           | GPU / simulation           | WebGPU shader brain scaling path         |
| Mozilla Foundation                        | Open web / OSS             | Browser-native research instrument       |
| Wellcome Trust                            | Computational biology      | Digital biologics, Tsotchke corpus       |
| Schmidt Sciences                          | AI research funding        | Falsifiable ALife meta-analysis          |
| Moore Foundation                          | Science research           | Emergence, complex systems               |
| Templeton Foundation                      | Consciousness research     | Computational correlates (non-sentience) |
| NSF (CISE)                                | Grant                      | ALife / complex systems / education      |
| EU Horizon Europe                         | Grant                      | Digital twins, ALife, quantum sim        |
| JSPS KAKENHI                              | Grant (Japan)              | ELSI collaboration, origins of life      |
| Max Planck Institute                      | Neuroscience               | Connectome visualization, spike models   |
| Imperial College London                   | Computational neuroscience | IIT / Φ metrics, active inference        |
| UCL Gatsby Unit                           | Neuroscience / ML          | Neural dynamics, latent space models     |
| Caltech CNS                               | Computational neuro        | Brain observatory, cortical layers       |
| Berkeley AI Research (BAIR)               | AI / RL                    | Multi-agent economy, emergent behavior   |
| CMU Robotics Institute                    | ALife / robotics           | Embodied cognition, morphology           |
| ETH Zurich AI Center                      | AI / simulation            | Deterministic ALife, quantum sim         |
| Allen Institute for Brain Science         | Neuroscience               | Brain observatory, connectome            |
| Human Brain Project / EBRAINS             | Neuroscience platform      | Brain simulation, connectome             |
| New York University (NYU) CDS             | Data science / ALife       | Open-endedness, complexity metrics       |

_(Expand to 50+ rows with names/emails in a private CRM — not committed to repo.)_

---

## Immediate next authoring steps

1. Fill domains 1–3 checkpoints 1.11–3.20 with `file:line` receipts.
2. Run comparative scoring spreadsheet (export from this md).
3. Draft OSF pre-registration: hypotheses H1–H5 (determinism, diversity, brain coupling, economy stability, emergence indicators).
4. Link smoke screenshots from `output/playwright/`.
5. Draft arXiv preprint: "Cosmogonic Quantum Mechalogodrom: A Browser-Native Deterministic Artificial Life Dome with Quantum-Inspired Measurement Layers."
6. Prepare ALife 2026 conference submission: demo track + full paper.
7. Compile comparative benchmark table vs Tierra, Avida, Lenia, Polyworld, Boids++.
8. Write falsifiability appendix: explicit conditions for claim withdrawal.

---

## Comparative benchmark scaffold (to be filled with literature scores)

| System          | Population | Determinism | Brain model       | Economy    | Quantum layer   | Browser-native  | Open-endedness metrics |
| --------------- | ---------- | ----------- | ----------------- | ---------- | --------------- | --------------- | ---------------------- |
| CQM (this repo) | 50k        | Seeded      | 25k–5M            | 4-currency | Statevector sim | Yes (Bun+WebGL) | Bedau/Packard live     |
| Tierra          | ~1k        | Seeded      | None              | No         | No              | No              | Bedau/Packard          |
| Avida           | ~3.6k      | Seeded      | Digital organisms | No         | No              | No              | Complexity metrics     |
| Lenia           | ~100       | Seeded      | Continuous CA     | No         | No              | No (Python)     | Variety metrics        |
| Polyworld       | ~100       | Seeded      | Neural nets       | No         | No              | No (C++)        | Behavioral diversity   |
| Boids++         | ~1k        | Seeded      | None              | No         | No              | No              | Flocking metrics       |

---

## Falsifiability hypotheses (pre-registration draft)

- **H1 (Determinism):** Same seed + same browser engine produces byte-identical population trajectories. Falsified by golden-hash mismatch.
- **H2 (Diversity):** Shannon diversity of entity morphotypes remains >2.0 over 10k ticks. Falsified by monoculture collapse.
- **H3 (Brain coupling):** Glyph brain motor outputs correlate with visual displacement (r > 0.3). Falsified by disconnect.
- **H4 (Economy stability):** Four-currency market reaches non-zero equilibrium. Falsified by currency collapse to zero.
- **H5 (Emergence):** Open-endedness metrics (Bedau/Packard) show non-decreasing novelty over 10k ticks. Falsified by plateau.

---

## Kill criteria (sample)

- Golden hash mismatch without documented seed change → halt emergence claims.
- `Math.random` in sim path → fail reproducibility domain.
- Brain viz disconnected from live snapshots → downgrade "wired" language in UI copy.
