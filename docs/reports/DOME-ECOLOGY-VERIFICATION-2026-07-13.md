<!-- verified: 2026-07-14 | scope: current local working tree and local production Pages build -->

# Dome Ecology Verification

This report records the implementation and point-in-time verification of the Xenomimic tether
removal and Crystal Big Tree ecology. It separates committed history, current working-tree evidence,
automated execution, and local browser observation. It does **not** claim that the current ecology
working tree was published to GitHub Pages.

## Status summary

| Area                      | Current evidence                                                                                       | Status            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------- |
| Xenomimic visible tether  | Historical removal commit `3109218b`; topology-only connectome; local production scene probe           | Verified locally  |
| Xenomimic hidden leash    | Square `PLATFORM_HALF` containment and independent twin sensory input; focused movement tests          | Verified locally  |
| Fruit and leaf food       | One 20,000-slot `EdibleResourceRegistry`; atomic consumption and exact simulation-time respawn tests   | Verified locally  |
| Safe/neutral zone         | Identity-aware hysteresis plus conservative hostile-endpoint checks across the integrated harm systems | Verified locally  |
| Temporary visits          | Shared bounded visit manager, distributed slots, fixed budgets, cooldowns, and namespace-safe cleanup  | Verified locally  |
| Launched NHI visitors     | Dedicated backing-Entity adapter; real energy hunger/signals; shared food transaction and cleanup      | Verified locally  |
| Tree residents            | 250 live 6-6-4 neural controllers with direct motor/activity outputs and deterministic fallback        | Verified locally  |
| Development diagnostics   | Localhost construction gate plus aggregate and direct indexed actor/food receipts                      | Verified locally  |
| Local production artifact | Exact prefixed `site/` Pages smoke passed with canvas-only proof and zero failed local assets          | Verified locally  |
| Deployed GitHub Pages     | No deployment was requested or performed in this pass                                                  | **Not validated** |

## Xenomorph tether root cause

There were two distinct tether-shaped defects:

1. **Visible rendering cord.** Before commit `3109218b`,
   [`xenomimic-connectome.ts`](../../src/sim/xenomimic-connectome.ts) imported Three.js and owned two
   fixed line buffers, two dynamic `BufferAttribute`s, a `BufferGeometry`, an additive
   `LineBasicMaterial`, and a `THREE.LineSegments` scene object named
   `XenomimicCausalConnectome`. `sync()` rewrote pair and nearest-Entity line endpoints and draw
   ranges. This was the direct visible tether source.
2. **Invisible origin leash.** The population formerly projected every body back onto an
   origin-centred circular `arenaRadius` and reversed its heading at the radius. It did not join one
   twin to the other, but it imposed an artificial home-radius movement restriction that behaved as
   an invisible navigation tether.

The committed rendering removal is inspectable with:

```text
git show 3109218b -- src/sim/xenomimic-connectome.ts src/world.ts
```

That commit removed the Three.js import, position/color buffers, buffer attributes, geometry,
material, `LineSegments`, scene attachment, endpoint writer, update-range writes, and GPU-resource
disposal path. It retained only bounded logical topology counts needed by telemetry and neural
coupling.

## Rendering, movement, navigation, and logic changes

- [`xenomimic-connectome.ts`](../../src/sim/xenomimic-connectome.ts) now owns no render object,
  geometry, material, shader, beam, trail, or scene attachment. `visible` always returns `false`, and
  `setVisible()` is a compatibility no-op. Reciprocal-pair and nearest-Entity proximity counts remain
  operational without drawing a line.
- [`world.ts`](../../src/world.ts) explicitly keeps the Xenomimic connectome hidden at construction,
  update, and Entity neural-web toggles. `purgeOrphanXenomimicTethers()` narrowly finds legacy-named
  Xenomimic/twin/connectome `THREE.Line`, `LineLoop`, or `LineSegments` left by HMR or an older
  artifact, removes them from the scene, and disposes geometry and every material.
- [`xenomimics-render.ts`](../../src/sim/xenomimics-render.ts) represents the logical psionic
  relationship as per-body shimmer only; it does not create twin-bond geometry.
- [`xenomimics.ts`](../../src/sim/xenomimics.ts) replaced circular `arenaRadius` projection with
  per-axis square habitat containment at `-PLATFORM_HALF..+PLATFORM_HALF`. Only the crossed velocity
  component is reflected at the authored platform edge. There is no origin radius, home force,
  partner-distance clamp, positional spring, joint, or twin pull.
- The deprecated `arenaRadius` option is now only a compatibility alias for
  `habitatHalfExtent`. `twinSenseRange` supplies one bounded neural percept and never writes position,
  velocity, or heading. The body's local damped lean spring is intentional posture animation, not a
  tether.
- Spawn, explicit placement, teleport containment, and revival use the same square boundary.
  Xenomimic travel/calm visit modes preserve canonical locomotion and settle a hop through gravity
  rather than snapping or anchoring the body.

Evidence that hidden tether behavior does not remain:

- [`xenomimics.test.ts`](../../tests/xenomimics.test.ts) places bodies in square corners that the old
  radial clamp could not reach, separates twins beyond sensory range, and exercises movement and
  lifecycle transitions.
- [`xenomimic-cosmetics.test.ts`](../../tests/xenomimic-cosmetics.test.ts) seals the absence of a
  tether renderer, permanently disabled visibility, safe stale-object disposal, and neural-web
  toggling that cannot recreate the cord.
- The local production-page scene probe found `0` Xenomimic line objects, `0` legacy-named tether
  objects, and `connectome.visible === false`.

## Canonical food component

[`edible-resource.ts`](../../src/sim/edible-resource.ts) defines the canonical
`EdibleResourceRegistry`. [`crystal-ecosystem.ts`](../../src/sim/crystal-ecosystem.ts) registers
10,000 fruit slots and 10,000 leaf slots in that one fixed-capacity registry. External visitors and
tree residents call the same reserve, renew, begin, complete, cancel, and release operations; there
is no second tree-only nourishment path.

Every resource has a stable ID, kind, visual position, reachable interaction point, nourishment,
owner, lease deadline, respawn deadline, and generation. The exact runtime state model is:

```text
available -> reserved -> consuming -> respawning -> available
                    \-> available (cancel or expired lease)
```

The existing instance is hidden and restored in place. Consumption does not allocate replacement
meshes or collision objects, so repeated cycles cannot grow the number of resource objects.

## Discovery, reservation, approach, and consumption

### Ordinary Entities and Xenomimics

[`big-tree-visitors.ts`](../../src/sim/big-tree-visitors.ts) is the direct adapter over canonical
Entity and Xenomimic bodies.

1. Candidate discovery is round-robin, capped at 64 total candidates per 0.1 simulation seconds,
   and keyed by stable Entity ecology ID or Xenomimic pair/role identity.
2. [`big-tree-zone.ts`](../../src/sim/big-tree-zone.ts) scores hunger, fatigue, health deficit,
   stress, social need, curiosity, danger, distance, route availability, food availability, recent
   visit pressure, personality, occupancy, and simulation load. Stable hashing plus polling ordinal
   provides deterministic variation rather than synchronized visits.
3. A successful request reserves the nearest compatible activity slot. A food-motivated visitor
   then reserves a preferred fruit or leaf, falling back to either kind when necessary.
4. Native Entity velocity or Xenomimic heading/velocity is steered toward the authored slot and then
   the specific resource interaction point. Ordinary Entities must reach the full 3D interaction
   point; planar Xenomimics use their canonical ground X/Z reach model.
5. The adapter calls `beginConsumption()` and `completeConsumption()` on the registry, then converts
   the returned nourishment once into the species' canonical energy scale. Eating feedback uses
   existing belly/activity or shimmer state.
6. If ownership or generation changes, the adapter releases the stale handle, waits 0.4 simulation
   seconds, and retargets. Four seconds without a valid food target ends the activity rather than
   trapping the visitor.

### Fixed fauna and launched NHIs

[`big-tree-fauna-visitors.ts`](../../src/sim/big-tree-fauna-visitors.ts) reuses the same visit manager
and food registry for the fixed Shoggoth, Titan, Puppet Master, and launched-NHI rosters. The fixed
fauna systems
implement allocation-free `readBigTreeVisitor`, `setBigTreeVisitorIntent`,
`nourishBigTreeVisitor`, and `clearBigTreeVisitorIntent` hooks in
[`shoggoths.ts`](../../src/sim/shoggoths.ts), [`titans.ts`](../../src/sim/titans.ts), and
[`puppet-masters.ts`](../../src/sim/puppet-masters.ts). Stable species/owner namespaces prevent food
reservation collisions.

[`nhi-big-tree-source.ts`](../../src/sim/nhi-big-tree-source.ts) binds each launched NHI's stable
mind ID to its one canonical backing Entity; the visual `NhiBodySystem` follower is never registered
as a second visitor. Launched NHIs are excluded from the ordinary adapter, while material NHI minions
remain ordinary Entities. NHI hunger is derived from backing energy, fatigue and health deficit stay
zero because no such canonical states exist, and local kin, NHI mood, and the live organism
social/exploration/threat signal drive context. A successful shared food transaction replenishes the
backing Entity energy once. Travel/calm/social intent overrides ambient roam, and HUNT/MIMIC/RETREAT
cannot overwrite that locomotion or revive a cached target. Death, Genesis, failed-launch rollback,
and HMR teardown release the visit, food, partner, intent, and source reference.

The shared fauna adapter has a separate 24-candidate/0.15-second poll budget and at most 24 active
records while still sharing the global 72-visitor zone capacity.

## Exact five-second respawn and race safety

`EDIBLE_RESOURCE_RESPAWN_SECONDS` is exactly `5`. A valid completion atomically:

1. verifies `state === 'consuming'`, owner, generation, and unexpired lease;
2. removes the one lease-heap entry;
3. clears ownership;
4. records `respawnAt = now + 5`;
5. transitions to `respawning` and inserts one indexed respawn-heap entry;
6. hides the authored instance immediately; and
7. returns nourishment once.

Wrong-owner, stale-generation, duplicate, expired, or wrong-state calls return zero. Deterministic
per-kind free lists make free-resource selection O(1). Fixed indexed min-heaps permit each resource
to occur at most once in the lease heap and once in the respawn heap; a duplicate deadline insertion
is rejected rather than accumulated.

[`CrystalEcosystem.update()`](../../src/sim/crystal-ecosystem.ts) advances the registry with the full
scaled simulation `dt`. Pause and visual-only frames do not advance it; simulation speed uses the
same scaled clock as the rest of the ecology. At the deadline, `onRestore` writes the instance matrix
first. Only a successful restore publishes `available`; a failed restore remains unavailable and is
retried without adding another timer. Failed restores are deferred until the rest of the due batch
has run, so one bad visual callback cannot head-of-line block unrelated food. Reset likewise derives
availability from successful visual restoration instead of blindly republishing the authored count.
The unavailable census changes before the visual-hide callback, so even an exceptional presentation
path cannot leave consumed food discoverable or double-count its later restore.

[`edible-resource.test.ts`](../../tests/edible-resource.test.ts) seals no respawn at `4.999`, restore
at `5.0`, exactly-one nourishment, deterministic deadline ordering, owner lease expiry/renewal,
reset invalidation, restore-before-available, failed-restore retry without head-of-line blocking, and
repeated record reuse. [`crystal-ecosystem.test.ts`](../../tests/crystal-ecosystem.test.ts) additionally
seals that visual-only pause cannot advance the five-second clock and that hide/reset callback
failures cannot falsely advertise food.

## Big Tree safe-zone boundary and transitions

The canonical boundary in [`big-tree-zone.ts`](../../src/sim/big-tree-zone.ts) is centered at
`(220, 620)` in X/Z. A stable living identity enters at radius `240` and remains protected until it
crosses radius `270`. [`big-tree-sanctuary.ts`](../../src/sim/big-tree-sanctuary.ts) keeps that
identity-aware history in a fixed-capacity open-addressed registry. A first observation in the
240-270 annulus is outside; an identity that entered through 240 remains inside there. Stateless
projectile, spawn, area-effect, and hazard endpoints use the conservative outer radius so they
cannot attack through the boundary.

Ordinary Entities, Xenomimics, Shoggoths, Titans, and Puppet Masters do not share an ambiguous
position-only history. Ordinary actors use stable ecology IDs, Xenomimics use `(pairId, role)`, and
the three fixed-fauna systems use their stable slot/ID under distinct sanctuary namespaces. Their
inner-entry/outer-exit hysteresis therefore follows each living identity independently. If an
identity is absent/invalid or the fixed registry cannot accept it, the call falls back to the
conservative endpoint check rather than fabricating retained history.

On entry, canonical systems recompute sanctuary state and suppress harmful intent or effect rather
than teleporting the actor. On exit, the living faction, relationship, economy, and controller state
continues from the canonical system; a stale hostile target is not automatically restored.
Lifecycle removal clears the membership record. Genesis removes discarded ordinary-Entity and
launched-NHI membership because their backing Entity population is replaced, while preserving
unrelated live Xenomimic and fixed-fauna hysteresis history. It does not reset Crystal food, live
Xenomimic/fauna visits, or the shared scheduler.

## Aggression suppression and restoration

[`world.ts`](../../src/world.ts) supplies one sanctuary policy across the relevant systems:

- Entity behavior and [`entity-brain.ts`](../../src/sim/entity-brain.ts) suppress protected actor and
  target threat/aggression inputs while retaining calm flocking, collision separation, rest, and
  non-hostile movement.
- Xenomimics receive zero hostile pressure while protected, cannot be consumed through their public
  predation sink, and use calm/travel visit intent instead of hostile neural locomotion.
- Launched NHIs drop active HUNT targets while visit intent owns locomotion; their harmful field,
  hunt, mimic, and cross-boundary effects remain subject to the same sanctuary endpoint policy.
- [`shoggoths.ts`](../../src/sim/shoggoths.ts), [`titans.ts`](../../src/sim/titans.ts), and
  [`puppet-masters.ts`](../../src/sim/puppet-masters.ts) suspend pursuit, feeding, meddling, hostile
  contacts, and cross-boundary effects while preserving safe animation and crowd separation.
- [`chaos-field.ts`](../../src/sim/chaos-field.ts) preserves seeded draw cadence but suppresses direct
  protected-body mutation and cross-boundary entanglement effects.
- [`singularities.ts`](../../src/sim/singularities.ts) may retain visual lensing while suppressing
  harmful force on protected bodies.
- Super-hunt, dome-feeding, portal-death, mecha-blaze, NHI targeting/effects, global mutation and
  apocalypse actions, and Titan strike bursts receive protected endpoint or harm predicates at the
  composition root.

For portal death specifically, `World` forwards the same conservative sanctuary endpoint predicate
through [`portal-death-fauna.ts`](../../src/sim/portal-death-fauna.ts) to Shoggoth, Puppet Master,
Titan, and Leviathan rosters. A protected body in the portal cylinder is not killed, hidden, or
queued for respawn. An unprotected Shoggoth, Puppet Master, or Titan that is culled first releases
its active Big Tree movement intent. Leviathan protection at this hostile endpoint is a safe-zone
rule only; Leviathans remain unsupported as tree-food/visit actors because they have no canonical
hunger or nourishment sink.

The safe zone does not rewrite permanent faction or relationship data. Suppression is evaluated
from current identity/position, so leaving restores normal eligibility through a fresh decision,
not by reviving a cached attack.

## Temporary visit lifecycle, exit, and cooldown

All adapters use one `BigTreeVisitManager` state machine:

```text
Outside -> Travelling -> Active -> Leaving -> Cooldown -> Outside
```

- Global concurrent occupancy is capped at 72.
- The tree exposes 104 distributed positions: 32 eat at radius 78, 24 rest at 132, 24 socialize at
  178, 16 observe at 218, and 8 general at 205.
- Dwell is deterministically varied from 7-24 simulation seconds; revisit cooldown is 35-95 seconds.
- Travel and leaving have 90- and 50-second hard deadlines. Activity-slot leases are 12 seconds and
  renewable.
- Hunger reduction, rest target, activity completion, dwell expiry, target loss, death, despawn,
  reset, or error initiates cleanup/exit. Cooldown blocks immediate recamping.
- A valid low-need being that wanders inside without winning its optional utility draw is adopted as
  a canonical `Safety`/`Observe` visitor. It receives the same bounded dwell, departure, and cooldown
  lifecycle instead of remaining an unmanaged protected camper.
- If the leave deadline expires before a body crosses the outer radius, its adapter keeps a calm,
  deterministic radial egress intent through cooldown until the physical exit occurs. Food, slot,
  and partner reservations remain released; no teleport or immediate re-entry is introduced.
- Slot, food, and reciprocal social reservations are released during leave, cancellation, target
  loss, despawn, or timeout. Social partner leases expire and partner loss releases the survivor.

Reset ownership is namespace-scoped. `BigTreeSpeciesVisitors.resetOrdinary()` cancels only ordinary
Entity records during Genesis. A full adapter reset cancels only that adapter's ordinary/Xenomimic
namespaces, and `BigTreeVisitManager.cancelOwnerKind()` performs targeted cleanup for other bindings.
Only the World composition root resets the shared manager during full teardown, after adapters have
released intents/reservations and before source fauna are disposed. This prevents one adapter from
silently erasing another species' visit or leaving source-owned intent behind.

## Crowding and blocked navigation

Multiple radial rings avoid one gathering point. Capacity rejects excess requests before they can
reserve a destination. The manager measures progress toward a slot; eight seconds without sufficient
progress selects another compatible slot, with at most two recoveries before a clean exit/cooldown.
Travel and leave hard deadlines prevent missing transitions from becoming permanent camping.

Active identity lookup is O(1), active records are densely packed, and only the dense scheduled
deadline set is stepped. Social matching is one pass over each bounded adapter-local active set
rather than an all-pairs search. Direct steering is deliberately interruptible and uses canonical
velocity/intent hooks.

This is authored-slot steering, not a general obstacle-aware navmesh. `routeAvailable` is currently
true for these authored approaches; complex dynamic obstacle rerouting beyond alternate slots and
timeout recovery remains a limitation.

## Tree-dwelling neural agents

The production Crystal Tree has 10 species with 25 residents each: 250 exclusive controllers.
[`tree-creature-brain.ts`](../../src/sim/tree-creature-brain.ts) uses the existing `TinyMLP` primitive
as a real 6-input, 6-hidden, 4-output network with 70 parameters per resident and 17,500 parameters
total.

Energy/hunger, food bearing and proximity, social density, threat, safe-zone calm, phase, and stable
personality are compacted into the six input lanes. The four outputs directly contribute two motor
axes and two activity axes. [`crystal-ecosystem.ts`](../../src/sim/crystal-ecosystem.ts) consumes
those outputs to steer movement and choose eat, rest, socialize, or roam. Live visitor count and
social activity feed resident percepts.

Model length and every weight, input, and output are checked for finite values. Invalid weights,
input, or output invoke a deterministic resting fallback and increment observable fallback status.
The report therefore describes an action as neural-driven only when `modelReady` and the decision
path actually used the network. The seeded fixed weights are not an online-learning system and make
no consciousness or physical-quantum claim.

## Operational peaceful and social behavior

Implemented behavior includes contextual nourishment visits, energy recovery/rest, observation,
calm coexistence, willing reciprocal social pairing, partner-facing, positive Entity
activation/payoff feedback, Xenomimic shimmer feedback, and tree-resident social responses.
Interactions have reach checks, one-partner exclusivity, leases, dwell deadlines, partner-loss
cleanup, and critical lifecycle interruption.

No canonical knowledge/skill-transfer system is connected to these visits. Consequently, this pass
does not record teaching or learning and does not infer it from an animation. Greeting-specific
audio/animation is likewise not claimed beyond the existing social/observation feedback listed
above.

## Development-only observability

`main.ts` derives `developmentDiagnostics` only from `localhost` or `127.0.0.1`, passes that option
into `World` construction, and installs the pull-only
`window.__CQM__.bigTreeEcology.snapshot(query?)` hook only inside that same gate. A `World` without
the construction gate returns `null`, and a non-local static host receives no `window.__CQM__` debug
hook. The snapshot reads no random state, creates no renderer, line, beam, helper geometry, or
tether-like object, and performs direct indexed identity/food joins rather than scanning the living
population or the 20,000-item food pool.

The aggregate view reports the authored boundary, visit capacity/occupancy, core and fixed-fauna
polling/cancellation counters, sanctuary index health, the complete food-state census, and real
tree-neural-controller status. An optional `(ownerKind, ownerId)` query reports lifecycle state,
reason, activity, slot, physical safe-zone membership, remaining state/cooldown time, stuck
recoveries, social partner lease, selected destination, selected food reservation owner/generation,
and the last canonical transition event with its scaled-simulation timestamp. An optional `foodId`
query reports the pooled item state, nutrition, authored/interaction positions, generation,
reservation owner/lease, respawn deadline, and remaining respawn time. Sanctuary protection is also
reported explicitly as aggression suppression. Transition diagnostics survive manager snapshot/
restore; pre-observability version-1 manager snapshots load with a neutral diagnostic default.

The stable transition labels are `visit-requested`, `arrived`, `stuck-recovery`, `travel-timeout`,
`slot-lost`, `activity-finished`, `dwell-complete`, `left-zone`, `leave-timeout`,
`cooldown-complete`, and `stuck-timeout`; an untouched record reports `none`. Each non-neutral label
is paired with the scaled-simulation timestamp at which that manager transition was recorded.

The snapshot itself performs work and creates its JSON-safe result only when called. Development
mode separately retains one bounded aggregate audit record every 600 frames; it does not enumerate
actors or food. Production rendering and ecology queries do not gain diagnostic geometry or full
scans.

## Automated tests added or repaired

Primary ecology suites are:

- [`edible-resource.test.ts`](../../tests/edible-resource.test.ts): transaction races, exact respawn,
  deadlines, reset, visual lifecycle, failed-restore isolation, and leak-resistant record reuse.
- [`big-tree-zone.test.ts`](../../tests/big-tree-zone.test.ts): boundary, weighted decisions,
  capacity, visit lifecycle, deterministic transition causes, tied-deadline priority, legacy
  snapshot compatibility, rejection of deadline-less or malformed restored visits, reciprocal
  social-pair validation, leases, stuck recovery, and hot-path source seals.
- [`big-tree-sanctuary.test.ts`](../../tests/big-tree-sanctuary.test.ts): identity-aware hysteresis,
  conservative endpoints, namespace isolation, removal/reset, and fixed capacity.
- [`big-tree-visitors.test.ts`](../../tests/big-tree-visitors.test.ts): Entity/Xenomimic discovery,
  3D reach, race recovery, nutrition, rest, social lifecycle, identity, disposal, and fixed polling.
- [`big-tree-fauna-visitors.test.ts`](../../tests/big-tree-fauna-visitors.test.ts): fixed-fauna hooks,
  nourishment once, death/reset cleanup, cooldown, contextual calm, and 50,000-slot budget sealing.
- [`big-tree-performance.test.ts`](../../tests/big-tree-performance.test.ts): 12,000-candidate
  discovery, 8,000-candidate social load, 16,384 consume/respawn transactions, and source-level
  no-full-scan seals.
- [`tree-creature-brain.test.ts`](../../tests/tree-creature-brain.test.ts): dimensions, direct
  outputs, deterministic replay, model validation, fallback, lifecycle status, and performance
  allocation contract.
- [`crystal-ecosystem.test.ts`](../../tests/crystal-ecosystem.test.ts) and the Crystal static/
  integration suites: fruit/leaf registration, ground interaction points, resident consumption,
  exact pause/resume timing, callback-failure-safe visual restore/reset, neural status, and disposal.
- [`big-tree-world-integration.test.ts`](../../tests/big-tree-world-integration.test.ts): one shared
  composition, authored rings, update order, fauna/NHI bindings, identity membership, hazards,
  lifecycle cleanup, localhost-only diagnostic gating, indexed observability, and no debug tether
  line.
- [`big-tree-observability.test.ts`](../../tests/big-tree-observability.test.ts): disabled-World
  `null`, aggregate receipt shape, direct actor/food joins, JSON-finite deadlines, non-mutating
  repeated pulls, source-level no-full-scan seals, and localhost hook wiring.
- [`portal-death.test.ts`](../../tests/portal-death.test.ts): propagation of the sanctuary endpoint
  predicate to every portal-cull roster and suppression of protected kills.
- [`nhi-big-tree-source.test.ts`](../../tests/nhi-big-tree-source.test.ts): backing-body-only
  registration, real signal/hunger mapping, zero fabricated fatigue, final travel/calm steering,
  exactly-once energy nourishment, and lifecycle cleanup.
- [`pages-smoke-server.test.ts`](../../tests/pages-smoke-server.test.ts) and the UI lifecycle seals:
  Pages-only prefixed routing, traversal rejection, deterministic frame quiescence, no direct
  `readPixels`, canvas-only capture, automatic-frame restoration, and a live Big Tree diagnostic
  contract check.
- Xenomimic and combat-system suites cover tether absence, square movement, threat suppression,
  endpoint gating, deterministic RNG cadence, and restoration on exit.

The latest broad ecology/hostile-surface receipt is **410 passed / 410 total**, with **35,952
assertions** across 40 files. It includes the canonical food, visitor, sanctuary, tree-controller, fixed-fauna,
launched-NHI, combat-boundary, Xenomimic movement/tether, rendering, lifecycle, and stress suites.

After the incidental-entry/egress and observability hardening, the current focused 15-file
ecology/Pages/UI receipt is **149 passed / 149 total**, with **9,495 assertions**. It includes every new Big Tree
suite, the concrete indexed diagnostic joins, Pages-only server containment, and automatic-frame
capture lifecycle seals. The direct Xenomimic suite separately passes **32 / 32** with **15,909
assertions**. Formatting, TypeScript, lint, and whitespace validation are green for the current
working tree.

The fresh canonical `bun run check` coverage pass reached **3,221 passed / 5 failed**, with
**3,599,540 assertions** across 360 files and 3,226 tests in 394.19 seconds. Every failure is an
expectation mismatch in concurrent, already-dirty Phase-B NHI evidence work. They are confined to
[`organism-intelligence-phase-b-nhi-closed-loop-development.test.ts`](../../tests/organism-intelligence-phase-b-nhi-closed-loop-development.test.ts)
and
[`phase-b-mechanism-evidence-artifacts.test.ts`](../../tests/phase-b-mechanism-evidence-artifacts.test.ts),
where the regenerated CSV/JSON/SVG receipts are internally consistent but no longer match pinned row,
fault, hash, and decline-label expectations after a concurrent `NhiMind` SPAWN-policy change. Their
isolated rerun was **10 passed / 5 failed**. The Phase-B harness imports `NhiMind` directly and no Big
Tree module; its scripts/tests are unchanged, and its generated-file byte-for-byte comparison passes.
The whole-repository gate is therefore red for five stale Phase-B pins, not for a reproduced
dome-ecology failure.

The fresh canonical `bun run check` passed formatting, TypeScript, and lint, then stopped inside
`verify:receipts` because that verifier correctly rejects a coverage transcript containing the same
five Phase-B failures. The later sync/fact/evidence/filemap/build/generated stages therefore did not
run inside that chained command. Their relevant local Pages build and focused checks are reported
separately rather than being mislabeled as a green end-to-end gate.

## Local production-page simulation checks

A locally built production Pages artifact was served and inspected in a real Chromium browser. The
live world reported 10,000 fruit, 10,000 leaves, 10,000 flowers, 250 neural tree residents with no
fallbacks, 34 authored draws, and approximately 1.085 million rendered triangles. One observation contained
50 ordinary visitors and 17 fixed-fauna visitors under the shared 72-visitor capacity, with 23 foods
reserved and zero lifecycle errors. Visit reasons and phases were mixed rather than synchronized.

A fresh direct transaction against the built runtime registry reserved food `9999`, rejected a rival
reservation, began consumption once, awarded `28` nourishment once, returned `0` for duplicate
completion, and changed the item immediately to `respawning`. Its recorded start time was
`0.15087500000149123`, deadline `5.150875000001491`, and delay exactly `5`; it remained respawning at
`deadline - 1e-9` and became `available` at the deadline with generation advanced from `1` to `2`.

A direct runtime boundary probe confirmed center `(220, 620)`, entry radius `240`, exit radius `270`,
entry at radius `239`, retained protection at `250`, exit at `271`, and no fresh entry from the
240-270 annulus. A cross-boundary harmful action was rejected while an outside-to-outside action was
allowed.

The scene inspection found `0` `Line`, `LineLoop`, or `LineSegments` objects anywhere in
Xenomimic/Mimic/Tether/Connectome/Twin/Cord/Bond ancestry, no named legacy tether object, and
`xenomimicConnectome.visible === false`. The browser emitted two informational messages, zero
errors, and zero warnings. A focused screenshot was also captured and visually inspected with the
Crystal Tree alive and abundant and no evident Xenomimic cord.

After the incidental-entry/egress hardening and final Pages rebuild, a fresh lightweight production
probe reached frame `37` with 15 active visitors, 19,993 available and seven reserved foods, zero
food lifecycle errors, and 250 ready neural controllers with zero fallbacks. Indexed fruit `9999`
was available with finite authored/interaction positions and no stale owner/deadline. The repeated
scene scan again found zero Xenomimic/tether/connectome/twin-ancestry line objects, no legacy tether
name, and a hidden topology-only connectome; the console again contained two informational messages
and no warning or error.

These observations validate the local production artifact, not the deployed website. Automated
tests provide the longer race, crowd, cleanup, and transition coverage.

The standardized visual-smoke path now assembles `site/`, serves only that artifact beneath the real
`/cosmogonic-quantum-mechalogodrom/` project prefix, and verifies the static-host marker before
launching Chromium. It pauses only the automatic animation loop, advances 18 deterministic steps
once, hides all non-canvas body children for the evidence frame, takes one screenshot, restores the
page, and resumes animation. The obsolete direct `gl.readPixels` plus retry loop was removed because
it returned a false black buffer and repeatedly stalled SwiftShader.

A current post-observability phone production smoke passed. It captured a 780x1688 canvas in a
1,647,467-byte PNG with luma 71.47, 448 color buckets, 499 Entities, and 20,800 flora instances. The
live diagnostic reported seven active visitors under the shared capacity, 19,996 available and four
reserved food records, 250 ready neural controllers with zero fallbacks, and a concrete indexed
receipt for fruit `0`: generation `1`, nourishment `28`, a finite authored position, a finite ground
interaction point, and an available state with no stale owner or lease. Its fixed food census summed
to exactly 20,000.

The immediately preceding exact-Pages desktop run also passed: 1280x720, 904,999 bytes, luma 49.87,
267 buckets, 497 Entities, and 60,000 flora instances. The current phone run had zero console errors,
page errors, same-origin 4xx responses, or failed same-origin requests, and its screenshot was
visually inspected. The built worker resolved from the document base with HTTP 200, JavaScript
content type, and 3,689 bytes. The smoke now proves that asset before sustained software rendering,
reports its exact URL, and verifies that the newly spawned Pages server remains alive both after
readiness and at completion. The Pages-prefix work also repaired a root-absolute pantheon texture
URL. The current POWER runtime deliberately reports `main-thread-packed`; the built worker artifact
remains present without claiming that a dormant pool is active.

One combined phone-then-desktop invocation completed phone and then exhausted its cumulative
six-minute wrapper budget during desktop's software-rendered stress probe. Giving desktop an
independent six-minute process budget completed successfully with the metrics above. This is recorded
as orchestration-budget exhaustion, not as a browser assertion or simulation failure.

The following requested manual scenarios were **not** fully completed as long-duration visual
sessions in this pass: following several Xenomimics through every state from multiple camera angles;
extended multi-species crowd observation; application restart and full-world save/load; long-run
GPU/memory profiling; hardware-accelerated/ultra-tier rendering; and inspection of an actually
deployed GitHub Pages revision.

## Performance evidence

[`big-tree-performance.test.ts`](../../tests/big-tree-performance.test.ts) contains four focused
performance-invariant tests:

1. 10,000 ordinary Entities plus 2,000 Xenomimics retain the 64-candidate discovery budget and
   72-active capacity.
2. 6,000 ordinary Entities plus 2,000 Xenomimics produce a full 72-visitor/36-pair social workload
   in one bounded matching pass and clean it completely on reset.
3. 256 fixed food records complete 64 full batches—16,384 individual consume/respawn transactions—
   without replacing records or accumulating leases/deadlines.
4. Source seals prohibit full-population polling, all-actor deadline scans, nested social matching,
   and linear active-identity lookup.

The latest broad regression run reported **8.05 ms** for the 16,384-transaction case. These numbers
are machine/run dependent and are not treated as cross-platform benchmark thresholds.

The fixed-fauna suite separately proves a bounded discovery budget against 50,000 available fauna
slots. These results establish bounded algorithmic work and stable object counts. They do not replace
a sustained browser frame-time trace.

The diagnostics snapshot has source-level seals against population iteration and pooled-food
enumeration. No standalone snapshot latency benchmark was recorded in this report; its performance
claim is limited to pull-only invocation and direct indexed detail reads.

The exact Pages smokes identified ANGLE **SwiftShader**. The current phone run advanced four real
animation frames in 25.049 seconds (**0.160 FPS**); the preceding desktop run advanced three in
62.563 seconds (**0.048 FPS**). Those are software-rasterizer functional observations, not hardware
frame-rate measurements. They contained 499/497 Entities rather than the 10,000 target population;
the production growth ramp does not reach 10,000 during a short smoke. An isolated current Crystal
Tree census measured about 1.055 ms for a logic-plus-visual update and 0.430 ms for visual-only update
on this machine, so the tree JavaScript was not the multi-second SwiftShader frame bottleneck. The
repository's 60-120 FPS objective remains **unproven** until a current 10,000-Entity run is profiled
on confirmed hardware acceleration.

## Remaining limitations and externally unvalidated claims

- Direct visitor support covers canonical ordinary Entities (including NHI minions), Xenomimics,
  Shoggoths, Titans, Puppet Masters, launched NHIs, and Crystal Tree residents. Other reviewed rosters
  were deliberately excluded where a visit would fabricate embodiment or metabolism. Leviathans can
  remove prey but expose no hunger, nutrition callback, stable public actor ID, or targetable movement
  intent. The five `SuperBodySystem` bodies have targetable movement but only an unread cumulative
  meal counter, not a bounded/depleting metabolic reserve. The #101 APEX capstone has
  pure-trigonometric movement and no nutrition sink; its `CONSUME` value is a plan signal, not
  metabolism. Hero energy is player power, wingmen are parent-relative formations, Archons are
  non-spatial cognitive components, glyph brains are explicitly visual-only, wilderness fauna live
  behind a packed one-way boundary, and Petri/digital biologics have no dome-world navigation body.
- Activity travel uses deterministic direct steering to distributed authored points, alternate-slot
  recovery, and deadlines. It is not a general obstacle-aware pathfinder.
- `BigTreeVisitManager` has validated JSON-safe manager-local snapshot/restore and reset behavior,
  and food reset invalidates outstanding handles. That snapshot omits the Crystal clock/food state,
  adapter body bindings, sanctuary hysteresis, and configuration identity, so it is not a standalone
  `World` save. Application persistence intentionally stores preferences and reloads a fresh cosmos;
  cross-restart simulation restoration is not claimed.
- The development API is intentionally localhost-only and requires an explicit actor identity and/or
  `foodId` for detail. It is a momentary receipt, not a visitor-enumeration API, production UI, world
  save, or browser-persistent audit trail. It retains only the last lifecycle transition cause and
  timestamp for each manager record, not unbounded transition history.
- Socialization and observation are operational. Teaching/learning is not recorded because no
  canonical knowledge-transfer subsystem is wired to tree visits.
- Reciprocal leased partner pairing is implemented inside the ordinary/Xenomimic pool and separately
  inside the fixed-fauna/launched-NHI pool, including cross-species pairs within each compatible pool
  and 3D reach. Cross-pool ordinary-to-fixed-fauna targeting and visitor-to-tree-resident pairing are
  not implemented; peaceful coexistence and aggregate tree-resident social response still operate.
  No species-specific teaching or knowledge-transfer path is claimed.
- Tree controllers are genuine runtime neural networks with deterministic safe fallback, but their
  current seeded weights are not evidence of training, online learning, sentience, or consciousness.
- The local production artifact was validated. The GitHub Pages deployment was neither published nor
  checked because deployment was outside this request.
- The short browser probe found no console, asset, or tether defects but was not a long-duration GPU-memory,
  listener, timer, navigation, or frame-pacing profile. Repeated lifecycle stability is currently
  supported primarily by deterministic automated tests.
- The current standardized phone smoke and preceding exact-Pages desktop smoke passed. Their
  SwiftShader frame-rate observations cannot close the 60-120 FPS hardware objective, and no
  deployed-site validation was performed.
