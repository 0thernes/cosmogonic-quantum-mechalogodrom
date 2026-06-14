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
  the shading normal, worn-jewel roughness (polished crests / matte recesses), dielectric-glass pull,
  amber subsurface that **breathes with the audio bass**, thin-film iridescence on rim + ridge crests.
- **Animation grammar:** behavior-driven drift + the N(2) GPU vertex-melt under nightmare.
- **World meaning:** the biomass — the substrate every other power feeds on, herds, or converts.
- **Economic role:** ☉/☾ neutral; tiny purse (drones, weight ≈ 0.5). _Queued: per-entity wallets._

## 2. SHOGGOTH — the eldritch devourers

- **Biology:** deformed icosahedron cores studded with 7–11 blinking ocular points, trailing tendrils.
- **Behavior:** drift on lorenz-flavored currents; grid-query neighbors (r≈15) and **consume** them,
  respawning corrupted offspring. Tugged by active singularities. **Count: 100 (V14)** on desktop+
  (16 on phone) — lights capped to the first 4, the bulk glow emissive. _Next: smart/social/dangerous
  — perceive, remember, bargain, flee, hunt, deceive._
- **Silhouette:** lumpen, asymmetric, writhing — the antithesis of the jewel specimens.
- **Material language:** dark, wet, glistening; emissive eyes; tendril line-segments.
- **Animation grammar:** roiling drift + tendril whip + eye-blink flicker; consumption lunges.
- **World meaning:** entropy made flesh — the predator pressure that keeps the population honest.
- **Economic role:** ☾ UMBRA (shadow money — they steal/hoard); medium purse (weight ≈ 3).

## 3. PUPPET-MASTER (Puppeteer) — the unseen hands

- **Biology:** named NPC powers (KRONOS, SELENE, …) that never appear as bodies; they act _through_
  the world. Each thinks with a **different** brain technique (FSM / utility / Markov / GOAP).
- **Behavior:** KRONOS **remorphs** ≤30 entities per trigger; SELENE selects weather; others tune
  fields. They emit audit events + lore-named toasts. **Count: 100 (V14)** — the 3 named heroes keep
  their roles + lights; the 97 lesser WRAITH-_n_ hands reshape on long staggered intervals (a
  deterministic golden-angle layout, no rng). _Next: reactive/adaptive/deceptive bargaining._
- **Silhouette:** none (disembodied) — felt as toasts, weather shifts, mass remorphs.
- **Material language:** their signature is in the world's _changes_, not a mesh.
- **Animation grammar:** punctuated interventions, not continuous motion.
- **World meaning:** fate/agency — the world has authors, and they disagree.
- **Economic role:** ☉ AURUM (patrons — they tax/gift); large purse (weight ≈ 2.5–5 by title).

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
  dominance shifts emerge); buy-against-sell clearing (currency conserved).
- **World meaning:** scarcity, arbitrage, inflation, debt — the math layer the user demands run
  everything. _Queued: wallets driving behavior/war/migration/mutation; black markets, cartels._

---

## Differentiation checklist (apply to every new entity)

1. **Biology/origin** — where does it come from in the sim?
2. **Behavior** — what does it _do_, and with which AI technique (so it's unlike its neighbors)?
3. **Silhouette** — could you name it from a black outline alone?
4. **Material language** — what is its surface/shader signature?
5. **Animation grammar** — how does it _move_ (and only it)?
6. **World meaning** — what does it mean for the cosmos / the player?
7. **Economic role** — currency lean + purse weight + market behavior.
