# Frontend Action Plan — Cosmogonic Quantum Mechalogodrom

Living backlog for UI/UX, visual fidelity, and front-end wiring. Rewrite in place when status changes — no dated forks.

## Verify path

1. `bun dev` from repo root (path with `[ ]` — use `-LiteralPath` in PowerShell).
2. Open `http://localhost:3000` — hard refresh (`Ctrl+Shift+R`).
3. Center HUD: AI · HELP · AUDIT · NEURAL · MARKET · ARCHITECT · ARCHITECTURE tabs.

---

## Priority matrix

| ID    | Item                                               | Status                         | Where to look                                                                          |
| ----- | -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| 2     | Super Creature HUD fits without scrollbar          | **Done (pass 2026-06-28)**     | `src/ui/superhero-hud.ts` — `fitHeroBox`, no `overflow-x`                              |
| 3     | Sim controls in SET/Settings only                  | **Done**                       | `src/ui/settings-panel.ts`, `#pad-sim` hidden in `app.css`                             |
| 4     | Fullscreen laptop HUD clips above screen           | **Improved**                   | `src/ui/center-hud.ts` `fitHud` top inset + `--cqm-hud-max-height`                     |
| 5     | DOCS/SPEC SVGs start zoomed top-left               | **Fixed (pass 2026-06-28)**    | `src/alife-metrics-gallery.ts` — intrinsic img size + fit                              |
| 6     | WildBeyond Lorenz/Rössler blank on mobile          | **Fixed (pass 2026-06-28)**    | `lab/quantum-wildbeyond.html` — `attractorCamZ` / compact scale                        |
| 7     | Entities too white — darker saturated rainbow      | **Fixed (pass 2026-06-28)**    | `src/sim/entities.ts` `paintVibrant` — lower L + emissive cap                          |
| 9     | AUTO sort feels decorative                         | **Improved**                   | `world.ts` 4s cycle, `#algo-active` countdown, flash on advance                        |
| 11    | MEGA 4D brain visible + Architect/Neural in window | **In progress**                | `super-neural.ts` tab IV + cycle btn; `super-panel.ts` respects `--cqm-hud-max-height` |
| 12    | BIBLE depth                                        | **Ongoing**                    | `bible.html`, `scripts/gen-bible-corpus.ts`, BOOK index                                |
| 13    | 100 glyphs + APEX wild like super creatures        | **Improved (pass 2026-06-28)** | `alphabet-pantheon-render.ts` motor orbit + apex travel                                |
| 14    | 25k / 100k→5M params in UI                         | **Partial**                    | `docs/BRAIN-PARAMETER-SCALE-PLAN.md`, architecture panel                               |
| BONUS | Peer-review paper + outreach                       | **Started**                    | `docs/PEER-REVIEW-META-ANALYSIS.md`                                                    |

---

## How to find MEGA 4D brain (user path)

1. Center HUD → **ARCHITECT** (⬢) or dock **5 ARCHONS**.
2. Inside panel header → **⊞ NEURAL**.
3. Tab strip → **IV** (brain).
4. Click **⟁ COMPOSITE** to cycle → **⬡ MEGA 4D** (4D tesseract + 320 spike neurons).

Alternative: Center HUD → **ARCHITECTURE** (⟁) → brain mode cycle in pantheon panel.

---

## Next sprints (ordered)

### Sprint A — Visual proof (1–2 sessions)

- [ ] Playwright smoke screenshots: SVG fit, WildBeyond tiles 1–2, entity color sample, MEGA 4D tab IV.
- [ ] Composite connectome: add inter-layer micro-glomeruli (second ring of 36 satellites in `drawBrain`).
- [ ] Wire Mechalogodrom + APEX brain snapshots into architecture panel MEGA 4D labels.

### Sprint B — Pantheon life (visual-only)

- [ ] Trail ghosts / afterimages on high-activity glyphs (shader-free: duplicate instanced mesh at 0.2 opacity).
- [ ] Chaos storm: pantheon scatter event when `toggleChaosMode` fires.
- [ ] Parameter readout overlay: `25,000 × 100` live tick rate in ARCHITECTURE panel.

### Sprint C — BIBLE depth

- [ ] Auto-ingest every `docs/*.md` H2 into bible search index (not just BOOK table).
- [ ] WildBeyond chapter: all 36 tiles, controls, pulse/hot semantics.
- [ ] Glossary: 200+ terms from MODULE-CONTRACTS + PHILOSOPHY.

### Sprint D — Academic / outreach

- [ ] Complete 500×25 falsification grid in PEER-REVIEW-META-ANALYSIS (see doc).
- [ ] Institution outreach table: 50 labs (SFI, MIT CSAIL, ELSI, etc.) with contact scaffold.
- [ ] Pre-register hypotheses on Zenodo / OSF (optional).

---

## Do-not-break contracts

- Controls live in **SET → Settings** — never restore `#pad-sim` to dock without explicit request.
- Letter pantheon: **visual-only** — `PANTHEON_BREEDING_LIVE = false`; no economy/physics backend until asked.
- Live APEX brain runs `SCALE_LIVE`; designed 100k→5M is reporting/scaffold only.
- Determinism: sim randomness via seeded `Rng` only.

---

## Gate before commit

```bash
bun run check
```
