# Consolidated 22-File Audit - Current Truth Pass

Generated: 2026-07-07  
Workspace: `Z:\[Vibe Coded (AI)]\CLAUDECODE\Cosmogonic Quantum Mechalogodrom`  
Scope: the 22 user-listed Markdown and HTML report artifacts in `docs/`

## Executive Verdict

The 22-file report fleet is rich but not clean. The best current answer is not any
single prior report. The accurate position is:

- The source/test verification side is comparatively strong.
- The report/publication side is inconsistent.
- The 16-file consolidated reports were the best sober draft before this pass, but
  they are now stale because the requested scope is 22 files and the live receipt
  has moved again.
- The named world systems are mostly covered, including Shoggoths, Puppeteers,
  Titans, Entities, SuperCreatures, Apex Abomination, Pantheons, Archon Godforms,
  GOD/GodColossus, Temple, flora/fauna/wildlife, and Tsotchke.
- The biggest missing layer is not "content exists"; it is "content is unified,
  current, falsifiable, browser-valid, and publication-ready."

## Current Evidence Snapshot

This audit integrates three critic lanes:

| Lane   | Focus                                       | Result                                                                                                                |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Hooke  | File staleness, contradictions, trust tiers | All 22 files exist; major scope, receipt, count, and overclaim drift found.                                           |
| Pauli  | Gates, receipts, HTML/format validity       | Typecheck/lint/sync pass; fresh fifth-pass `verify:receipts` run reported 2,378 pass; one old HTML remains malformed. |
| Singer | Coverage gaps and omitted named systems     | Named systems are covered but scattered; browser/public output and scientific controls remain weakest.                |

Fresh fifth-pass verification receipt available to this audit set:

| Item                              | Current observed value                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `verify:receipts`                 | 2,378 pass / 0 fail, fresh fifth-pass verified receipt                                                                |
| Expect calls                      | 2,867,096, fresh fifth-pass verified receipt                                                                          |
| Test files                        | 255                                                                                                                   |
| Line coverage                     | 92.01%                                                                                                                |
| Function coverage                 | 89.65%                                                                                                                |
| `typecheck`                       | Passed                                                                                                                |
| `lint`                            | Passed                                                                                                                |
| `sync:check`                      | Passed at canonical floor wording                                                                                     |
| `verify:facts`                    | Exit 0 with known fuzzy drift warnings; current full gate observed 14 warnings, no failures                           |
| `format:check` / release surfaces | Green after local-only archived report forks were excluded from Prettier; current consolidated pair remains formatted |
| Browser smoke                     | Not performed; Chrome/Edge exist by explicit path, but not as a one-command PATH/Playwright workflow                  |
| Build                             | Not rerun by critic because build writes generated artifacts                                                          |

Important distinction: `2,360` is the portable canonical floor embedded in sync
surfaces. It is not the latest local receipt. `2,373` was a previous current
receipt in the 16-file consolidation. The fresh fifth-pass verified local
receipt available to this audit set is `2,378`.

Post-write note: a final local `bun run verify:receipts` attempt after creating
these consolidated artifacts timed out after 120 seconds and left no live
`bun.exe` process. A later fifth-pass currentness lane completed the run and
verified `2,378 pass / 0 fail / 2,867,096 expect() calls`; that supersedes the
earlier timeout caveat for receipt wording.

## 22-File Trust Table

| #   | Artifact                                                                         | Current trust | Use now                                      | Main issue                                                                      |
| --- | -------------------------------------------------------------------------------- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | `FILE-AUDIT-16-FILES-2026-07-07.md`                                              | Tier E        | Historical audit only                        | Scope is 16 files, not 22; superseded.                                          |
| 2   | `MEGA-ULTRATHINK-REPORT-AUDIT-REVIEW-2026-07-07.html`                            | Tier C        | Browser companion to audit draft             | Needs validation against current receipt and static render checks.              |
| 3   | `MEGA-ULTRATHINK-REPORT-AUDIT-REVIEW-2026-07-07.md`                              | Tier C        | Mine for methodology, controls, claim linter | Strong but not the final current master.                                        |
| 4   | `SUPER-REPORT-OMNISCIENT-OMNICOGNITIVE-ULTIMATE-2026-07-07.html`                 | Tier E        | Do not promote                               | Malformed HTML near `<h4>Build Paths:</h3>`; overclaim-prone.                   |
| 5   | `SUPER-REPORT-OMNISCIENT-OMNICOGNITIVE-ULTIMATE-2026-07-07.md`                   | Tier E        | Archive rhetoric/draft                       | Stale scale counts and overclaim language.                                      |
| 6   | `VERIFICATION-ANALYTICAL-DATA.md`                                                | Tier A        | Keep as evidence base                        | Current pass now separates 2,360 floor from 2,378 latest receipt.               |
| 7   | `MEGA-MASTER-BRAIN-NEUROLOGY-CONSCIOUSNESS-SENTIENCE-FINAL-HURRAH-2026-07-07.md` | Tier C+       | Mine heavily for named-system ledger         | Valuable coverage, but still needs sober falsifiability framing.                |
| 8   | `NHSI-PROGRESS-DASHBOARD-2026-06-26.md`                                          | Tier A-       | Keep as progress dashboard                   | Dated June 26; must be refreshed for July 7 receipt/state.                      |
| 9   | `SUPER-REPORT-ULTIMATE-MEGA-2026-07-06.md`                                       | Tier E        | Archive                                      | Stale scale counts and "complete/omniscient" wording.                           |
| 10  | `MEGA-MASTER-BRAIN-NEUROLOGY-CONSCIOUSNESS-SENTIENCE-PASS3-2026-07-06.md`        | Tier C+       | Mine for world-neurology and benchmark cards | Strong details, not current gate authority.                                     |
| 11  | `SUPER-REPORT-3RD-PASS-2026-07-06.md`                                            | Tier D        | Secondary archive                            | Useful historical synthesis, lower currentness.                                 |
| 12  | `SUPER-REPORT-2ND-PASS-2026-07-06.md`                                            | Tier D-       | Archive with caution                         | Contains bad path `src/sim/super-mith.ts`; actual is `src/sim/super-mind.ts`.   |
| 13  | `MEGA-MASTER-BRAIN-NEUROLOGY-CONSCIOUSNESS-SENTIENCE-PASS2-2026-07-06.md`        | Tier C        | Mine selectively                             | Good mid-pass synthesis, superseded by Pass3/Final.                             |
| 14  | `SUPER-REPORT-2026-07-06.md`                                                     | Tier D        | Secondary archive                            | Early draft, mostly superseded.                                                 |
| 15  | `MEGA-MASTER-BRAIN-NEUROLOGY-CONSCIOUSNESS-SENTIENCE-PASS1-2026-07-06.md`        | Tier D        | Secondary archive                            | Early pass, superseded.                                                         |
| 16  | `CONTROLS-2026-06-26.md`                                                         | Tier A-       | Keep, but label narrowly                     | UI/operator controls only; not scientific experimental controls.                |
| 17  | `CONSOLIDATED-16-MASTER-ASSESSMENT-CURRENT-2026-07-07.html`                      | Tier B-       | Near-current draft only                      | 16-file scope and 2,373 receipt are stale.                                      |
| 18  | `CONSOLIDATED-16-FILE-AUDIT-CURRENT-2026-07-07.md`                               | Tier B        | Use as issue map                             | Good sober audit, but 16-file scope and 2,373 receipt are stale.                |
| 19  | `CONSOLIDATED-16-MASTER-ASSESSMENT-CURRENT-2026-07-07.md`                        | Tier B-       | Near-current draft only                      | Needs 22-file rename, current receipt, and stronger browser/claim caveats.      |
| 20  | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md`             | Tier A-       | Canonical foundation after cleanup           | Very large and valuable; current pass fixes build/check and version tail drift. |
| 21  | `MASTER-ASSESSMENT-2026-07-07.html`                                              | Tier E        | Do not promote                               | Thin relative to full set; inherits stale floor/overclaim risk.                 |
| 22  | `MASTER-ASSESSMENT-2026-07-07.md`                                                | Tier E        | Do not promote                               | Uses older 2,360 framing and ends with overclaim-prone language.                |

## Relevance Ranking

### Promote After Cleanup

These are closest to canonical truth:

- `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md`
- `VERIFICATION-ANALYTICAL-DATA.md`
- `NHSI-PROGRESS-DASHBOARD-2026-06-26.md`
- `CONTROLS-2026-06-26.md`

Promotion condition: update receipts, remove internal contradictions, label UI
controls separately from scientific controls, and avoid sentience overclaim.

### Fold Into New Master

These have the strongest material but should not be canonical alone:

- `MEGA-MASTER...FINAL-HURRAH-2026-07-07.md`
- `MEGA-MASTER...PASS3-2026-07-06.md`
- `MEGA-MASTER...PASS2-2026-07-06.md`
- `MEGA-ULTRATHINK-REPORT-AUDIT-REVIEW-2026-07-07.md`
- `CONSOLIDATED-16-FILE-AUDIT-CURRENT-2026-07-07.md`
- `CONSOLIDATED-16-MASTER-ASSESSMENT-CURRENT-2026-07-07.md`

Fold condition: preserve named-system coverage, benchmark cards, current-truth
prefaces, claim linting, and browser-output warnings.

### Archive As Drafts

These are useful provenance, but not current master material:

- `PASS1`
- `SUPER-REPORT-2026-07-06.md`
- `SUPER-REPORT-2ND-PASS-2026-07-06.md`
- `SUPER-REPORT-3RD-PASS-2026-07-06.md`
- `SUPER-REPORT-ULTIMATE-MEGA-2026-07-06.md`
- `SUPER-REPORT-OMNISCIENT...md/html`
- `MASTER-ASSESSMENT-2026-07-07.md/html`
- `FILE-AUDIT-16-FILES-2026-07-07.md`

Archive condition: archive, do not delete, because these files preserve how the
analysis evolved.

## Staleness and Defect Ledger

| Defect                               | Severity | Where it appears                                                  | Current correction                                                                                                        |
| ------------------------------------ | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 16-file scope after scope grew to 22 | High     | `FILE-AUDIT-16`, `CONSOLIDATED-16-*`                              | Rename/update to 22-file scope.                                                                                           |
| 2,360 called latest                  | High     | `VERIFICATION`, `MASTER-ASSESSMENT` family                        | `2,360` is floor; latest observed is `2,378`.                                                                             |
| 2,373 / 2,376 called latest          | Medium   | `CONSOLIDATED-16-*`, earlier 22-file draft                        | Superseded by `2,378`.                                                                                                    |
| Malformed HTML                       | High     | `SUPER-REPORT-OMNISCIENT...html`                                  | Fix mismatched heading tag near `<h4>Build Paths:</h3>` before browser use; its TOC anchors also need verification.       |
| Format red                           | Medium   | Several super/master docs                                         | Prettier these files or archive them as unformatted drafts.                                                               |
| Build status contradiction           | High     | `BRAIN...ASSESSMENT`, consolidated drafts                         | Treat build-green and build-red claims as time-boxed unless rerun.                                                        |
| Public discoverability gap           | High     | `index.html`, `docs.html`, `specs.html` according to critic lanes | Public pages must link and publish the new `CONSOLIDATED-22-*` artifacts; current pass adds links plus Pages doc-copying. |
| Stale scale counts                   | Medium   | `SUPER-REPORT-ULTIMATE`, `OMNISCIENT`, `MASTER` family            | Current tracked scale: 584 TS files, 135,813 TS lines, 8 C/C++ files, 730 tracked files.                                  |
| Bad source path                      | Medium   | `SUPER-REPORT-2ND`                                                | Replace `super-mith.ts` with `super-mind.ts`.                                                                             |
| Overclaim language                   | High     | `ULTIMATE`, `OMNISCIENT`, `MASTER`                                | Use proxy-consciousness and falsifiable benchmark language.                                                               |
| Controls ambiguity                   | Medium   | Cross-report                                                      | `CONTROLS` is UI controls; scientific controls are ablations/nulls/seed sweeps/lab JSON/fact audits.                      |
| Archive index mismatch               | Medium   | `docs/reports/2026-07-07/INDEX.md`                                | Directory currently contains only `INDEX.md`; archive claims need verification.                                           |
| Markdown/HTML parity gap             | Medium   | New consolidated HTML                                             | Browser HTML is a condensed companion view, not a complete mirror of the Markdown master; label it that way or expand it. |

## Second-Pass Miss Check Addendum

After re-checking term coverage across the 22 files, the first consolidated
22-file pass did not miss a top-level named living category, but it did
under-cover several lower-level exact details. These are now binding addenda to
the audit.

| Under-covered item                  | Where it matters                            | Correct handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brain substrate inventory           | `BRAIN`, `PASS3`, `MASTER-ASSESSMENT`       | Carry forward SuperMind, EntityBrain, Connectome/GraphMind, GlyphBrain, MechalogodromBrain, ApexBrain, Izhikevich spiking substrate, ConsciousnessKernel, ConsciousnessLab, SentienceLab, MindField, Xenomind, Noosphere, and OmegaPoint as explicit brain/cognition substrates, not just generic "entity cognition."                                                                                                                                                                  |
| ApexBrain weird-organ names         | `BRAIN`, `SUPER-REPORT-2ND`                 | Preserve the 10 named organ architectures and the 11th quantum organ: PrimeSieveLoom, AcousticMeatDrum, EntropicNecroMatrix, KleinBottleCortex, PendulumHive, SlimeMoldHydra, ChronoWraith, QuantumTunnelLattice, ThermodynamicEngine, CancerousOuroboros, and QuantumBrainOrgan.                                                                                                                                                                                                      |
| ApexBrain Meta-Paradox layer        | `BRAIN`, `SUPER-REPORT-2ND`                 | Preserve RetrocausalTargetPull, CantorDust, GodelResidual/GödelResidual, PhantomPerception, ReverseAnthropicBudget, and WignerShield as bounded homages with falsifiers, not literal physics claims.                                                                                                                                                                                                                                                                                   |
| Thaler / DABUS / Creativity Machine | `BRAIN`, `PASS1`, `PASS2`                   | Treat Thaler/DABUS/Creativity Machine material as perturbational creativity benchmark material only; never as accepted consciousness proof.                                                                                                                                                                                                                                                                                                                                            |
| Additional theory names             | `PASS3`, `BRAIN`, `SUPER-REPORT-2ND`        | Preserve CEMI, UAL, CTM, sensorimotor, projective, and attention-schema terms as theory/kernel axes when source-mapping consciousness theory coverage.                                                                                                                                                                                                                                                                                                                                 |
| External brain/wetware references   | `NHSI`, `PASS2`, `PASS3`, `MEGA-ULTRATHINK` | Preserve DishBrain, Brainoware, Organoid Intelligence, EBRAINS / Virtual Brain Twin, OpenWorm ConnectomeToolbox, AllenSDK / Allen visual coding, FlyWire, and MICrONS as external comparison or future-import anchors.                                                                                                                                                                                                                                                                 |
| Butlin exact status                 | `NHSI`, `BRAIN`, `FINAL-HURRAH`             | Preserve `8/14 met + 6/14 partial + 0 sentience`; do not collapse this to generic "Butlin indicators."                                                                                                                                                                                                                                                                                                                                                                                 |
| Tsotchke and Eshkol count drift     | `NHSI`, `BRAIN`                             | Track the stale `.esk 1,436+` claim versus the corrected `1,365` count, and keep `20 corpus projects / 22 registry slugs` distinct from blanket "all repos" language. The precise scientific wiring fraction is `18/21 = 85.7%`; `tsotchkeWiringCoverage() = 1.0` is inflated because it averages only already-wired entries. Keep substrate/prose depth classes distinct from literal registry `depth:` fields: source also cites `9 deep / 7 wired / 2 harvest / 3 fenced / 1 meta`. |
| ApexBrain scale drift               | `BRAIN`, `SUPER-*`, `MASTER-ASSESSMENT`     | Replace stale `5M designed / ~600 live` with `1B designed / LIVE_NODE_CAP = 4096 per organ` where ApexBrain is meant.                                                                                                                                                                                                                                                                                                                                                                  |
| Current consciousness JSON drift    | `BRAIN`                                     | `butlinCoverage` in current `consciousness-data.json` is cited as `0.272`; do not preserve stale `0.714` claims.                                                                                                                                                                                                                                                                                                                                                                       |
| A-Life comparative matrix           | `NHSI`, `BRAIN`                             | Include breadth `4.44`, population `z=+4.02`, code-grounded `z=+2.83`, and 113-system comparison as a measured comparative claim requiring citation.                                                                                                                                                                                                                                                                                                                                   |
| Internal scale details              | `BRAIN`, `NHSI`                             | Include 5 apex + 20 light Archons, 100 GlyphBrains, 50k EntityBrains, ~53.7k-live STDP Mechalogodrom, and 144 faculties with about 30 wired as denominator-specific numbers.                                                                                                                                                                                                                                                                                                           |
| Benchmark-card doctrine             | `PASS2`, `BRAIN`                            | Preserve the nine-card doctrine: claim, conditions, seeds, metrics, acceptance, falsifier; publish raw lift, normalized lift, ablation loss, null gap, cost ratio, stability, and contradiction flag.                                                                                                                                                                                                                                                                                  |
| Real-connectome ladder              | `BRAIN`, `FINAL-HURRAH`                     | Keep the staged path: C. elegans/OpenWorm -> FlyWire adult fly -> MICrONS mouse visual cortex, with checksum/license/citation and controls.                                                                                                                                                                                                                                                                                                                                            |
| Real-connectome controls            | `BRAIN`                                     | Include degree-matched random graphs, shuffled signs, and lesion-hub controls.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Dead-code and thin-test gaps        | `BRAIN`                                     | Carry forward StrangeAttractor, TemporalCrystal, and the 26-form Biologic as wire-or-retire targets. Earlier reports saying `unification.ts` has 0 dedicated tests are now stale because `tests/unification.test.ts` exists; remaining reasoning gaps are ToT/predictor/level-k thinness, while belief propagation and causal graph are comparatively strong.                                                                                                                          |
| Ecology subclasses                  | `PASS3`                                     | Include PortalDeathFauna, WildernessPopulation, Phyla, Morphotypes, AlienFlora, and Vegetation, not only broad flora/fauna labels.                                                                                                                                                                                                                                                                                                                                                     |
| Pantheon internals                  | `PASS3`, `NHSI`, `BRAIN`                    | Include TomPantheon, FacultiesPantheon, GodformBias, PantheonSociety, MindField, and Brutal God Releases as internal mechanisms.                                                                                                                                                                                                                                                                                                                                                       |
| Tsotchke load-bearing proof         | `BRAIN`                                     | Preserve `corpusBrainScalar` ablation as the load-bearing test pattern for Tsotchke claims.                                                                                                                                                                                                                                                                                                                                                                                            |
| License/legal matrix                | `BRAIN`, `NHSI`                             | Keep GPL/fenced/proprietary leaves separate from deeply wired MIT-compatible code.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Build blocker specificity           | `BRAIN II.9`, `src/styles/app.css`          | Prior `src/styles/app.css:0` Tailwind/Bun scanner failure is now fixed by `source(none)` plus explicit `@source` roots for `src/`, root HTML, and `lab/`. Treat it as a sealed build-fix invariant, not an active blocker, unless a fresh build reopens it.                                                                                                                                                                                                                            |

Exact search-term note from the miss check: also preserve the terms
`A-Life matrix`, breadth 4.44, code-grounded z=+2.83, Thaler,
`Creativity Machine`, belief-propagation, causal-graph, ShoggothSystem, PuppetMasterSystem,
TitanSystem, and String.fromCodePoint in future source-mapped reports.

## Third-Pass Semantic Coverage Delta

The third semantic pass found no missing top-level creature or ontology class,
but it did find exact IDs and substrate names that the consolidated files had
flattened too much. These are important enough to patch because they are the
handles a reviewer would use to trace claims back to source.

| Missing or under-covered item                             | Source refs in the 22-file set                                                                                                                                                                                                                                                            | Verdict                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact Butlin indicator IDs                                | `VERIFICATION-ANALYTICAL-DATA.md:222`; `NHSI-PROGRESS-DASHBOARD-2026-06-26.md:152-168`; `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:828-843`                                                                                                                      | **Patch.** Preserve `GWT-1`, `GWT-3`, `GWT-4`, `PP-1`, `HOT-1`, `HOT-2`, `AST-1`, `AE-1` as MET and `GWT-2`, `HOT-3`, `HOT-4`, `AE-2`, `RPT-1`, `RPT-2` as PARTIAL.                                                                                                                                                                                                   |
| SOAR / ACT-R comparison                                   | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:1533`; `:1578-1592`                                                                                                                                                                                                   | **Patch.** The MIT cognitive-architecture read is not just "good theory vocabulary": Cosmogonic is broader than SOAR/ACT-R but less parsimonious and less human-data-validated.                                                                                                                                                                                       |
| Free Energy / AIF / Bayesian mechanism wording            | `SUPER-REPORT-2ND-PASS-2026-07-06.md:121-125`; `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:598`; `:703-716`; `:793`                                                                                                                                               | **Patch.** Keep variational free energy, expected free energy, Bayesian belief update, and the one-sample epistemic-surrogate caveat.                                                                                                                                                                                                                                 |
| Exact ten-kernel family names                             | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:178`; `:628-634`; `:642-652`; `PASS3:456`                                                                                                                                                                             | **Patch.** Preserve Butlin, Thaler, IIT-4, FEP/AIF, AST, CEMI, UAL, sensorimotor, projective, and CTM as the coupled F0-F9 family, including the weak `ual` and `projective` load-bearing caveat.                                                                                                                                                                     |
| Metacognition, valence, qualia, and quality-space caution | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:370`; `:600`; `:746`; `:834-836`; `:899-925`                                                                                                                                                                          | **Patch.** These are proxy variables: confidence, control, synthetic affect, and projected quality space. They must not be described as felt experience.                                                                                                                                                                                                              |
| Tsotchke exact math substrate vocabulary                  | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:177`; `:383-387`; `:951-953`; `:966-984`; `:1027-1040`; `:1045-1053`; `NHSI-PROGRESS-DASHBOARD-2026-06-26.md:168`                                                                                                     | **Patch.** Carry QGT/Fubini-Study/Berry, Moonlab Clifford/MPS/VQE, libirrep Wigner-D/Clebsch-Gordan/QEC, spin-NN/Hopfield/SK/NQS, QRNG, PINN, PIMC, ULG, TensorCore, Quantum-RNG-API, Quantum-Quake telemetry, and fenced SolanaQuantumFlux.                                                                                                                          |
| Classical AI / planning substrate names                   | `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:96`; `:288`; `:605-606`; `:835`; `:854`                                                                                                                                                                               | **Patch.** GOAP, TinyMLP, successor representation, reservoir computing, and NHI/adapters are useful reasoning/planning handles and should not disappear behind "entity cognition."                                                                                                                                                                                   |
| Ecological control-language terms                         | `PASS3:344-346`; `:375`; `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:514`; `:1162`; `PASS1:435`; `PASS2:411`                                                                                                                                                      | **Patch.** Preserve immune-system contrast, stigmergy, swarm/social-field language, docs-as-immune-system, homeostasis/control framing, and morphogenesis where tied to code.                                                                                                                                                                                         |
| Symbolic/archetypal layer precision                       | `FINAL-HURRAH:227`; `PASS3:409`; `PASS1:428`; `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:384`; `:607`; `:1029`; `:2218`                                                                                                                                          | **Patch.** Archons and mythic names should be framed as archetype-triggered deterministic bias fields or persona skins over math, never literal powers.                                                                                                                                                                                                               |
| Exact alias spellings used by source reports              | `MEGA-ULTRATHINK-REPORT-AUDIT-REVIEW-2026-07-07.md:172-173`; `:460-467`; `SUPER-REPORT-OMNISCIENT-OMNICOGNITIVE-ULTIMATE-2026-07-07.md:59-79`; `NHSI-PROGRESS-DASHBOARD-2026-06-26.md:19`; `:23-26`; `BRAIN-NEUROLOGY-CONSCIOUSNESS-ENGINEERING-ASSESSMENT-2026-07-06.md:596`; `:945-953` | **Patch.** Preserve searchable aliases: `Alien Flora`/`AlienFlora`, `Puppet Masters`/Puppeteers, `God-Colossus`/GodColossus, `Monolith Temple`/`MonolithTemple`, `Petri-Dish`/petri-dish, `GlyphCreatures`/GlyphBrain, `Digital Biologics`, `TsotchkeBrainIntake`, `real connectome`, `Butlin rubric`, `Cowan` bound, `QPU`, and `Sephiroth` as a mythic roster name. |
| False-positive terms from search                          | `PASS3:85`, `PASS3:181`, `SUPER-REPORT-2026-07-06.md:149-190`                                                                                                                                                                                                                             | **Do not patch.** `anima` came from animal/animation, `Unity` from community, and `Unreal` from unrealistic, not meaningful missing ontology.                                                                                                                                                                                                                         |

## Fourth-Pass Miss Check Addendum

The fresh subagent pass found no missing top-level world class. It did find
source handles and denominators that should be preserved so the consolidated
reports remain audit-grade rather than merely thematic.

| Newly sharpened item                              | Correct handling                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact policy handle                               | Preserve `indicatorOnly` as a literal policy handle, not only as prose like "indicator-only." It is the repo's boundary between computational indicators and phenomenal/sentience claims.                                                                                                                                                                                                                 |
| Consciousness Lab falsifier metrics               | Carry exact falsifier handles and current lab values: `runs=32`, `singularityRate=1`, `emergenceRate=1`, `ablationRate=0.40625`, `meanStructuredIndex=0.569244`, `meanNullIndex=0.571825`, `meanNullGap=0`, `meanConvergenceGap=0.062741`, `meanRewardGap=0.111229`, `eventTotal=90`, `singularityProven`, `meanIndex`, `peakIndex`, `ablationProven`, `setQuantumAblated`, and the `detect()` surrogate. |
| Tsotchke ablation method                          | Preserve `corpusBrainAblation(seed, frame)` alongside `corpusBrainScalar`; acceptance is per-repo L1 distance `> 1e-9`, with all 18 wired scientific repos load-bearing in the cited run.                                                                                                                                                                                                                 |
| Tsotchke legal and license boundary               | Keep hard-stop details: `quantum-quake` / `qge/` is GPL-2.0 through QuakeSpasm / id Software lineage and is telemetry/quarantine only; no-license unblock order is `ULG -> logo-lab -> PINN -> PIMC`.                                                                                                                                                                                                     |
| Tsotchke pipeline handles                         | Preserve `fullTsotchkeBiologicsCatalysis`, `corpusBeat`, `harvest-tsotchke-corpus.ts`, `generated-tsotchke-seeds.ts`, `primordial-soup.ts`, and `digital-biologics.ts`.                                                                                                                                                                                                                                   |
| Brutal release event handles                      | Preserve `VOID_KING`, `VOID_KING_AWAKENS`, `SPIRAL_WILL`, `BINARY_IGNITION`, `PHOENIX_FEAST`, and `PHOENIX_FEAST_REBIRTH` as event handles, not extra consciousness evidence.                                                                                                                                                                                                                             |
| Archon roster exactness                           | The 25-Archon layer should retain exact source handles `ORACLE-Σ`, `STARKILLER-Ω`, `MANHATTAN-Φ`, `BROLY-Ψ`, `VOID-Λ`, plus the 20 ALPHA names when a full appendix is built. ASCII aliases such as `ORACLE-Sigma` are publishing fallbacks only.                                                                                                                                                         |
| Shoggoth/Puppeteer/Titan denominators             | Preserve Shoggoths `100 / 16 strains`, Puppeteers `100 / 14 styles`, Titans `20`, and benchmark IDs `B2` Shoggoth, `B3` Puppeteer, `B4` Titan.                                                                                                                                                                                                                                                            |
| Leviathans                                        | Preserve `Leviathans` as a standalone portal-fauna/world-neurology vocabulary handle alongside `PortalDeathFauna`, not only as generic fauna.                                                                                                                                                                                                                                                             |
| Flora and phyla constants                         | Preserve `15,000` alien flora desktop, `5,200` mobile, `10,000` plants, `PHYLUM_COUNT=10`, `MORPHS_PER_PHYLUM=25`, and `OUTLIER_RATE=0.01` as ecology denominator handles.                                                                                                                                                                                                                                |
| Native C++ denominator                            | Preserve the ADR-0007 native denominator: 8 C/C++ files = 3 `.cpp` + 4 `.h` + 1 `.hpp`; optional streamed tier, not JS-gated and not compiled in every gate.                                                                                                                                                                                                                                              |
| Computed-but-unread loops                         | Preserve `Mortality`, `MythRitual`, and `latentSubstrate` as computed-but-unread coupling targets.                                                                                                                                                                                                                                                                                                        |
| Living-doc source-of-truth handles                | Preserve `canonical-receipts.ts`, `sync-surfaces.ts`, `FILE-MAP.md`, `AUDIT-LOG.md`, and point-in-time exception doctrine as living-doc governance handles.                                                                                                                                                                                                                                               |
| Builder taxonomy / 104-greatest lens from context | Treat the 104-builder, six-pillar taxonomy as a review lens, not as evidence from the 22 report files. It can guide scoring against Turing/Dijkstra/Knuth/Hopper/Hamilton/Patterson/Hennessy/Gregg/Russell style rigor, but it is not a repo receipt.                                                                                                                                                     |

## Named-System Coverage Ledger

The requested world is broad. The 22 files do not omit the major categories, but
the coverage is distributed and uneven.

| System                             | Covered?          | Best source among 22                          | Current audit read                                                                                                                                               |
| ---------------------------------- | ----------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base Entities                      | Yes               | `PASS3`, `FINAL-HURRAH`, `BRAIN`              | Strongest as measurable ALife agents. Need live behavior metrics tied to receipts.                                                                               |
| SuperCreatures                     | Yes               | `PASS2`, `PASS3`, `BRAIN`                     | Good as higher-capability agent layer. Needs clearer benchmark separation from base entities.                                                                    |
| Apex Abomination                   | Yes               | `FINAL-HURRAH`, `PASS3`                       | Covered as apex/systemic threat or anomaly. Needs falsifiers and event telemetry.                                                                                |
| Shoggoths                          | Yes               | `FINAL-HURRAH`, `PASS3`                       | Covered, but should be framed as plastic/adaptive agent class, not mystical proof.                                                                               |
| Puppeteers / Puppets               | Yes               | `FINAL-HURRAH`, `PASS3`                       | Covered. Needs causal-control metrics: what is commanded, what resists, what adapts.                                                                             |
| Titans                             | Yes               | `FINAL-HURRAH`, `PASS3`, source/static checks | Covered. Source truth is `TITAN_COUNT=20` / `PAIR_COUNT=190`; current source/public prose has been corrected, while future reports should cite the constants.    |
| NHIs                               | Yes, now promoted | `BRAIN`, source/static checks                 | Real NHI mind/body/orchestrator path (`nhi.ts`, `nhi-system.ts`, `world.ts`). Must be first-class in world-neurology, not swallowed by generic entity cognition. |
| PortalDeathFauna                   | Yes               | `PASS3`, `FINAL-HURRAH`, source/static checks | Covered as portal death/respawn ecology; keep the handle distinct from broad fauna.                                                                              |
| Leviathans                         | Yes               | `PASS3`, source/static checks                 | Covered as a large ecology/fauna pressure system; keep the handle distinct from broad fauna.                                                                     |
| Digital Biologics / PrimordialSoup | Yes               | `BRAIN`, `NHSI`, source/static checks         | Covered as Tsotchke Petri growth substrate with `26` forms and `primordial-soup.ts` / `digital-biologics.ts` source handles.                                     |
| Pantheons                          | Yes               | `FINAL-HURRAH`, `PASS3`                       | Covered as mythic/governance layer. Needs objective effects and doctrine-linting.                                                                                |
| 25 Archon Godforms                 | Yes               | `FINAL-HURRAH`, `PASS3`                       | Covered. Needs per-Archon behavioral inventory and current source cross-reference.                                                                               |
| GOD / GodColossus                  | Yes but weak      | `PASS3`, `FINAL-HURRAH`                       | Must be symbolic/reactive unless falsifiable cognition metrics exist.                                                                                            |
| Temple / Portal                    | Yes but weak      | `PASS3`, `FINAL-HURRAH`                       | Should be tested as environment/operator substrate, not consciousness evidence.                                                                                  |
| Plants / Flora                     | Yes               | `PASS3`, `FINAL-HURRAH`                       | Present but under-benchmarked; needs growth, signal, and ecology metrics.                                                                                        |
| Fauna / Wildlife                   | Yes               | `PASS3`, `FINAL-HURRAH`                       | Present but under-benchmarked; needs population, interaction, and niche metrics.                                                                                 |
| Tsotchke                           | Yes               | `BRAIN`, `FINAL-HURRAH`, `MEGA-ULTRATHINK`    | Central integration claim. Do not say wired into every repo without current evidence.                                                                            |

## What Is Current vs. Stale

### Current Enough To Carry Forward

- The 22-file scope.
- The 2,378-pass fresh fifth-pass verified receipt.
- The distinction between canonical floor and latest local receipt.
- The proxy-consciousness framing.
- The named-system coverage ledger from `FINAL-HURRAH` plus richer `PASS3`
  detail.
- The need to separate UI/operator controls from scientific controls.
- The warning that browser/public static pages lag the markdown/source truth.

### Stale Or Unsafe

- "16 files" as the total requested universe.
- "2,360 latest local receipt."
- "2,373 latest local receipt."
- Older half-sized Titan-count wording where source states 20.
- "Around 400 TS files / 50,000 LOC / 7 C/C++ files / 254 test files."
- "Complete omniscient omnicognitive" as a factual claim.
- "Sentience achieved" or "consciousness proven."
- "Tsotchke wired into every repo" without a repo-by-repo receipt.

### Unknown Until Rerun

- Clean production build status.
- Browser render fidelity of the generated HTML reports.
- Public GitHub Pages parity with local docs.
- Whether archived files have actually been copied under
  `docs/reports/2026-07-07/`.
- Whether all static pages have been regenerated after the Titan/source drift.

## Scientific and Academic Readiness Score

| Axis                                   | Score / 10 | Why                                                                                |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Local test evidence                    | 9.1        | Strong receipt count and coverage, assuming latest receipt is reproducible.        |
| Source/report traceability             | 7.2        | Many references exist, but currentness is scattered and some paths/counts drift.   |
| Browser/public readiness               | 4.8        | Malformed HTML, missing public links, and browser smoke not wired as one command.  |
| Neuroscience/consciousness rigor       | 6.8        | Good theory vocabulary; still needs stricter indicator-to-implementation mapping.  |
| Named-world coverage                   | 8.6        | Most categories are present; weakest points are GOD/Temple/flora/fauna benchmarks. |
| Controls and falsifiability            | 7.0        | Good seeds/ablations idea; needs one canonical lab protocol.                       |
| Publication hygiene                    | 5.9        | Formatting, overclaim, stale receipt, and archive integrity need cleanup.          |
| Overall internal-use readiness         | 7.6        | Good for internal decision-making after this consolidation.                        |
| Overall external-publication readiness | 5.8        | Not ready as a peer-reviewed whitepaper package yet.                               |

## Claim Linter

Use this language:

- "proxy-consciousness"
- "cognition-inspired architecture"
- "sentience-relevant indicators"
- "ALife behavioral complexity"
- "falsifiable benchmark signal"
- "symbolic mythic layer"
- "operator-facing UI control"
- "scientific control"

Avoid or quarantine this language unless proven:

- "sentient"
- "conscious"
- "omniscient"
- "omnipotent"
- "complete"
- "Nobel-level"
- "Planck-level"
- "MIT/PHD proven"
- "Turing/Fields-level proof"
- "wired into every repo"

Better replacements:

| Risky phrase                   | Safer phrase                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Sentience achieved             | Sentience-relevant proxies implemented and benchmarked.                                        |
| Omniscient master report       | Current 22-file consolidated audit.                                                            |
| Complete proof                 | Evidence-backed internal assessment with listed falsifiers.                                    |
| GOD is conscious               | GodColossus is a symbolic/reactive higher-order system unless further metrics prove otherwise. |
| Tsotchke wired into everything | Tsotchke integration is claimed in these reports; repo-by-repo wiring still requires receipts. |

## Gaps and Holes That Can Be Used

These are the high-value next moves:

1. Make `CONSOLIDATED-22-*` the new active pair and archive the `16` pair.
2. Keep `VERIFICATION-ANALYTICAL-DATA.md` sealed on the current split:
   `2,360` is the portable floor and `2,378` is the fresh fifth-pass verified
   receipt available to this audit set.
3. Fix `SUPER-REPORT-OMNISCIENT...html` or archive it away from browser-ready
   surfaces.
4. Keep `bun run check` / `bun run build` green and note that build writes
   generated artifacts.
5. Browser-smoke the new HTML once a local browser is available.
6. Keep public pages regenerated/patched so Titan wording and docs/specs match
   source, and keep discoverable links to the `CONSOLIDATED-22-*` artifacts.
7. Create one canonical "scientific controls" section that includes:
   ablations, null worlds, seed sweeps, deterministic replay, population
   statistics, survival curves, learning/adaptation deltas, and lab JSON receipts.
8. Add a named-system appendix with one row per Shoggoth, Puppeteer, Titan,
   Archon, flora/fauna class, Temple/Portal role, and Tsotchke surface.
9. Keep mythic language as ontology-of-the-world, not as scientific proof.
10. Archive superseded drafts, do not hard-delete them.

## Final Audit Position

The 22 reports collectively contain the needed material. The current problem is
not lack of imagination or lack of coverage. The problem is that current truth,
scientific controls, browser output, and mythic/cognitive language are split
across too many files with stale receipts and inconsistent levels of caution.

The new canonical path should be:

1. Use this 22-file audit as the file-trust ledger.
2. Use `CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md` as the master
   readable synthesis.
3. Use the matching HTML as the browser-facing view.
4. Treat all earlier "ultimate", "omniscient", and "master" drafts as archived
   strata unless they are refreshed against the latest receipt and claim linter.
