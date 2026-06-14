# Entity Sheets — the Bestiary of the Mechalogodrom

_The differentiation bible. Every inhabitant of the world gets a sheet so it reads as a distinct
**biology, behavior, silhouette, material language, animation grammar, world-meaning** — and now an
**economic role** (V13). "Nothing generic cosmic." If two things look or act alike, one of them is a
bug._

> Source of truth: this doc names the intent; the code (`src/sim/*`, `native/src/*`) is the
> implementation. When they disagree, fix the code or amend the sheet — never let them drift silently.
> Cross-refs: [ERD.md](./ERD.md) · [MODULE-CONTRACTS.md](./MODULE-CONTRACTS.md) ·
> [AI-SUBSYSTEM.md](./AI-SUBSYSTEM.md) · economy in [`src/sim/economy.ts`](../src/sim/economy.ts).

Legend for the **economic role** row (V13): which currency a class leans toward (AURUM ☉ hoarders vs
UMBRA ☾ speculators), and a relative purse weight (stature).

---

## 1. ENTITY (the morphotype specimens) — the population

- **Biology:** instantiated from one of 250 deterministic **morphotypes** (`sim/phyla.ts`); 10 phyla
  × 25 + ~1% wildcard outliers. Each carries geometry, PBR palette, behavior, motion params.
- **Behavior:** one of 26 fields (`drift, orbit, pulse, swarm, flee, hunt, split, coil, spiral, …,
nash, market, lorenz`). They split, age, die (weather-tuned lifespan), and feed the connectome.
- **Silhouette:** the geometry cache — spheres, icosahedra, octahedra, tori, torus-knots, cones,
  boxes, and 3 vertex-deformed organics. In **SPECIMEN** view each is framed macro as a jewel.
- **Material language:** the **Reliquary Surface** (V12) — carved-mineral fBm relief engraved into
  the shading normal, worn-jewel roughness (polished crests / matte recesses), subsurface that
  **breathes with the audio bass**, thin-film iridescence on rim + ridge crests. **Six archetypes by
  silhouette (V27):** spheres = PEARL, ico/dodeca/knots = CRYSTAL, octa/tetra = GLASS, tori = AMBER,
  cylinders/cones/boxes = METAL, organics = BONE — each with its own relief, roughness, metalness,
  subsurface tint, and film, so silhouette and material read as one biology, not a recolour.
- **Animation grammar:** behavior-driven drift + the N(2) GPU vertex-melt under nightmare. In the
  **native Jolt engine** the specimens are real rigid bodies that drift, collide and settle — and
  **fracture on hard impact (V28):** the hardest contact each step shatters the smaller body into
  volume-conserving shards that burst apart along the impact normal with their own mass/inertia.
- **World meaning:** the biomass — the substrate every other power feeds on, herds, or converts.
- **Economic role:** ☉/☾ neutral; tiny purse (drones, weight ≈ 0.5). _Queued: per-entity wallets._

## 2. SHOGGOTH — the eldritch devourers

- **Biology:** deformed icosahedron cores studded with 7–11 blinking ocular points, trailing tendrils.
- **Behavior:** drift on lorenz-flavored currents; grid-query neighbors (r≈15) and **consume** them,
  respawning corrupted offspring. Tugged by active singularities. **Count: 100 (V14)** on desktop+
  (16 on phone). **Cognition (V24):** each one PERCEIVES prey density + rival crowding + singularity
  threat, REMEMBERS recent feeding (satiation EMA), then FLEES a dangerous crowd, HUNTS a prey-rich
  calm, and grows AGITATED (faster spin + eye-flicker) under threat — via the pure `creatureDrive`
  kernel. **DECEIVES (V26)** when outmatched: feigns weakness (dims glow + eyes, shrinks, softens
  tendrils, lays low) so a dominant rival overlooks it. **BARGAINS, TRADES & ALLIES (V29):** senses its
  nearest neighbour, and — via the kernel's `trade`/`ally` drives — strikes a deal with the UNLIKE
  (bargaining power ∝ wealth → worth flows to the wealthier, widening the spread) or forms a coalition
  with a PEER under threat (solidarity → worth to the poorer). The deal moves real money
  (`economy.transferWorth`, conservation-exact) and shows next tick through the wealth→boldness→glow
  coupling — verified live: 440 deals / 673 AURUM over 600 frames (103 bargains + 337 alliances).
  _Next: cognition-driven mutation._
- **Silhouette:** lumpen, asymmetric, writhing — the antithesis of the jewel specimens.
- **Material language:** dark, wet, glistening; emissive eyes; tendril line-segments.
- **Animation grammar:** roiling drift + tendril whip + eye-blink flicker; consumption lunges.
- **World meaning:** entropy made flesh — the predator pressure that keeps the population honest.
- **Economic role:** ☾ UMBRA (shadow money — they steal/hoard); medium purse. **All 100 are enrolled
  (V17)** with varied purses, and wealth drives boldness — rich = hunt harder + loom larger + glow
  brighter, broke = timid scavenger (relative to the live mean; verified 210→500 spread, ~31/~32
  bold/timid split).

## 3. PUPPET-MASTER (Puppeteer) — the unseen hands

- **Biology:** named NPC powers (KRONOS, SELENE, …) that never appear as bodies; they act _through_
  the world. Each thinks with a **different** brain technique (FSM / utility / Markov / GOAP).
- **Behavior:** KRONOS **remorphs** ≤30 entities per trigger; SELENE selects weather; others tune
  fields. They emit audit events + lore-named toasts. **Count: 100 (V14)** — the 3 named heroes keep
  their roles + lights; the 97 lesser WRAITH-_n_ hands reshape on long staggered intervals (a
  deterministic golden-angle layout, no rng). **Cognition (V25):** a SCHEMER's mind (shared
  `creatureDrive` kernel, no flee) — PERCEIVES the disorder in its sector, REMEMBERS recent meddling,
  and meddles MORE opportunistically over target-rich chaos (restless glow + spin). _Next: deception._
- **Silhouette:** none (disembodied) — felt as toasts, weather shifts, mass remorphs.
- **Material language:** their signature is in the world's _changes_, not a mesh.
- **Animation grammar:** punctuated interventions, not continuous motion.
- **World meaning:** fate/agency — the world has authors, and they disagree.
- **Economic role:** ☉ AURUM (patrons — they tax/gift). **All 100 enrolled (V19)** with varied
  purses; wealth drives how OFTEN each meddles — rich = reshape/stoke more often + loom larger + glow
  brighter, broke = fall quiet (relative to the live mean; verified 181→435 spread, ~32/~32 split).

## 4. TITAN — the ten colossi

- **Biology:** 10 fixed colossal intelligences with an **economy/war layer**: each has matter, energy,
  entropy ledgers and a 10×10 relation matrix (truce / alliance / war).
- **Behavior:** roam the mid-field; accrue resources; play an iterated PD over all 45 pairs →
  alliances/wars. **Wealth now steers diplomacy (V16):** a titan far richer in AURUM/UMBRA is
  emboldened to raid (→ war), a poorer one appeases — so the economy decides who marches. _Next:
  explicit patron→proxy funding + trade blocs._
- **Silhouette:** the obelisk ring in the VIZ3D instrument panel encodes them as towers; in-world they
  are the largest roaming bodies.
- **Material language:** identity-hued, translucent, emissive; drift toward war-red as wars mount.
- **Animation grammar:** slow, ponderous, geological; the war-network lines flare on conflict.
- **World meaning:** geopolitics — the macro power structure the economy now plugs into.
- **Economic role:** **enrolled economy agents** (V13) — titan-sized purses (weight 8 + per-titan
  bump). Their wealth will drive pacts/wars (queued coupling).

## 5. NHI — the non-human super-minds

- **Biology:** launched apex intelligences (`sim/nhi.ts`) — game theory, regret-matching, GOAP,
  memory grudges, a per-NHI alien Markov **voice**, and an inherited neural gene (`TinyMLP`).
- **Behavior:** spawn mutated swarms, **play the nearest faction** (gather/pacify when cooperating,
  scatter + Nash-gaslight when defecting), broadcast hallucinated utterances. **Mind is now
  inspectable (V15):** the ⊞ NEURAL Observatory shows a live 9-view 3×3 grid of its firing, topology,
  memory, reward, sensory, intention, affect, prediction, and decision state.
- **Silhouette:** an alien biomechanical red-eyed morphing body (`nhi-body.ts`).
- **Material language:** unmistakable cyan NHI glow + subsurface menace.
- **Animation grammar:** ethereal helix-weave float; morphing body; swarm summons.
- **World meaning:** the smartest things in the cosmos — the player's avatar of dominion.
- **Economic role:** **fattest purse** (weight 14) — super-mind speculators, enrolled on launch.

## 5★ SUPER CREATURE — the apex mind (V31)

_Always exactly one active (the prime `ARCHITECT-Ω`), plus up to 3 sired twins. The God / Simulator /
Oracle / Architect — half a Titan in size but ~100× its power._

- **Biology:** a singular apex intelligence (`sim/super-creature.ts`) carrying a **1444-parameter deep
  neural mind** — a stacked CORTEX (18→32→16, the world model) → ACTOR (16→12→8, the drives), a true
  4-layer net an order of magnitude past an NHI's gene. Born from a seeded sub-stream; twins inherit
  mutated weights, one generation deeper.
- **Behavior:** each beat it PERCEIVES 18 signals (threat / crowding / chaos / wealth / prey / rivals /
  pull / vision / hearing / interoception / circadian), compresses them to a world-model latent, and
  ACTS on 8 drives. It carries an **emotion-like state** (valence / arousal / dominance EMA), an
  **episodic memory**, a **prediction loop** (forecast → SURPRISE → arousal), **GOAP-style planning**
  (commits to HUNT / FLEE / DOMINATE / DECEIVE / SPAWN / EXPLORE / REST), and **self-replicates** up to
  3 mutated twins when sated + dominant. _Next: vision/sound from real world queries; manipulation of
  lesser entities; the access-puzzle-gated 2nd super creature + SUPERHERO player mode._
- **Silhouette (V32, `sim/super-body.ts`):** a freakish many-eyed colossus — a faceted crystalline
  CORE (R≈6, ½-Titan class) wrapped in a wireframe ARCHITECTURE cage, ringed by a corona of **16
  glowing EYES** (iris + void pupil), stabbed through by **11 radial SPIKE-ARMS**, and orbited by **3
  chrome RINGS** (the halo-mechanism). Reads instantly as the apex authority — verified on screen.
- **Material language (V32):** a hand-written **god-jewel shader** (patched `MeshStandardMaterial`, real
  scene lighting): object-space **fBm crystalline relief** + worn-jewel roughness + **thin-film
  iridescence** (Fresnel-cycled hue) + a **subsurface GOD-GLOW in the live plan colour scaled by
  dominance**. Distinct from every Reliquary jewel archetype; the eyes blaze, the rings are mirror-chrome.
- **Animation grammar (V32):** wholly cognition-driven — spin + heartbeat ∝ arousal, glow + eye-blaze ∝
  dominance, core colour + eye colour = the committed plan, arm-splay ∝ aggression, vertex morph-wobble
  ∝ surprise, the cage counter-rotates, the rings never rest, and the whole body drifts on the mind's
  own movement output. Verified live: plan DOMINATE → the whole colossus glows violet.
- **World meaning:** the dominant being — God/Oracle/Architect energy. The smartest, most powerful thing
  in the cosmos; the player's eventual avatar (SUPERHERO mode) and the world's apex authority.
- **Economic role:** **apex purse** (weight 20 — fatter than an NHI's 14), enrolled on launch; its
  wealth will steer its dominance + twin cadence (queued coupling). **Appears in telemetry** via the
  self-mounting **⬢ ARCHITECT** panel (identity · 1444p deep mind · ½ Titan ×100 · plan · 7
  emotion/intent meters · twins · wallet).

## 6. LEVIATHAN — the fourth order

- **Biology:** a fourth class of colossi (`sim/leviathans.ts`), distinct from titans.
- **Behavior / silhouette / material:** _to be sheeted in detail (queued) — must NOT read like a
  titan; give it its own silhouette + material + motion grammar._

## 7. SINGULARITIES — the cosmological holes

Five distinct kinds (`sim/singularities.ts`), each with its own physics + meaning — **never one
generic "black hole."**

- **Black hole:** inward pull; spaghettification (queued GPU stretch). Material: event-horizon dark +
  accretion glow.
- **White hole:** outward ejection — the time-reverse twin.
- **Grey hole:** ambiguous — intermittent pull/push.
- **Strange star:** exotic-matter surface; quark-glow material.
- **Entropy field:** the order/heat-death axis (bipolar twin of chaos) — uniformity creep.
- **World meaning:** the cosmological forces that warp space, drag the big bodies, and end epochs.
- **Economic role:** environmental — they destroy/relocate wealth (queued: sanctions/shocks).

## 8. GRAPH TRIBE — emergent communities

- **Biology:** Louvain community-detection over the live connectome; members get a `setGroup`
  write-back and a lore name.
- **Silhouette / material:** tribe-hued coloring across member entities.
- **World meaning:** emergent society — the substrate for coalitions + signaling in the economy.

## 9. ECONOMY AGENTS — the market (V13)

- **Biology:** any registered intelligence (titans, NHIs; queued: shoggoths/puppeteers/tribes) with a
  **wallet** {AURUM ☉, UMBRA ☾, QUANTA ◇, ICHOR ❖} sized to stature.
- **Behavior:** tâtonnement commodity pricing; a **currency-adoption game** (softmax best-response →
  dominance shifts emerge); buy-against-sell clearing (currency conserved). **Market mechanics (V20):**
  a **cartel** of the richest few withholds supply (oligopoly); **arbitrage** mean-reverts the
  commodity price gap; **sanctions** (`economy.sanction`) embargo an agent's production + trade —
  **titan wars now trigger sanctions** (war with ≥3 rivals → embargo).
- **World meaning:** scarcity, arbitrage, inflation, sanctions, cartels — the math layer that now runs
  titan war, shoggoth hunting, and puppeteer meddling (210 agents). _Next: off-book black market +
  auctions + tribe wallets._

---

## Differentiation checklist (apply to every new entity)

1. **Biology/origin** — where does it come from in the sim?
2. **Behavior** — what does it _do_, and with which AI technique (so it's unlike its neighbors)?
3. **Silhouette** — could you name it from a black outline alone?
4. **Material language** — what is its surface/shader signature?
5. **Animation grammar** — how does it _move_ (and only it)?
6. **World meaning** — what does it mean for the cosmos / the player?
7. **Economic role** — currency lean + purse weight + market behavior.
