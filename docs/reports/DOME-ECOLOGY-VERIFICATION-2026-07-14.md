# Dome Ecology Verification — 2026-07-14

## Verification posture

This is a current-code verification report for the Xenomimic tether removal and Big Tree ecology
work. It separates executable evidence from local browser evidence and from work that still requires a
human or deployed-site check.

Evidence labels used below:

- **Automated** — asserted by focused Bun tests against the implementation.
- **Local browser** — observed in a local headless Chromium run and captured in a JSON/PNG artifact.
- **Inspected** — confirmed by direct source inspection, but not independently exercised as a live
  semantic scenario in this report.
- **Pending** — not yet demonstrated by the required final run or deployed GitHub Pages site.

The final merged-tree Windows coverage receipt is **3,275 pass, 0 fail**, with **3,551,817
expectations across 365 files** and **93.59% line / 91.60% function coverage**. The portable
published floors remain **84.64% / 82.21%**. The exact GitHub Pages artifact also passed one atomic,
serial phone-plus-desktop Chromium run. The final post-report aggregate gate and deployed Pages
verification remain pending as of this report revision.

## Xenomimic tether: root cause and closure

### Root cause

The current owner screenshot and the historical Xenomimic implementation exposed three related but
distinct causes:

1. The visible cross-ground line in the current scene was the default-visible Entity connectome axon
   web in `src/sim/connectome.ts`, not the Xenomimic logical twin bond. Because its endpoints followed
   organisms, it visually presented as a creature tether.
2. A historical Xenomimic connectome path could render the logical twin/connectome relationship as
   Three.js line geometry, and named `Line`, `LineLoop`, or `LineSegments` remnants could survive a
   partial hot reload in a long-lived scene.
3. Xenomimic movement previously used an origin-centred radial projection and reversed heading at that
   radius. Even without a visible line, that home-radius restriction behaved like an invisible
   navigation leash.

The logical bipolar/psionic relationship was not itself the defect. It remains as bounded topology and
percept accounting; rendering or physically constraining that relationship was the defect.

### Rendering, physics, navigation, and logic changes

- `src/sim/xenomimic-connectome.ts` is now topology accounting only. It imports no Three.js rendering
  primitive, creates no scene object, geometry, material, joint, spring, IK target, ray, trail, or
  particle. Its constructor deliberately ignores the scene argument.
- `visible` is permanently `false`; `setVisible()` is a no-op. `World` explicitly calls
  `setVisible(false)`, including around the independent Entity neural-web control.
- `src/sim/connectome.ts` now permanently retires the Entity axon-web renderer too. Its
  `LineSegments` stays invisible with draw range zero, and `setWebVisible()` is a forced-invisible
  compatibility no-op. Link construction, topology pairs, activation propagation, GraphMind
  communities, tribes, and telemetry continue to operate without geometry or colour-buffer writes.
- `World.purgeOrphanXenomimicTethers()` delegates to the tested
  `purgeLegacyXenomimicTethers()` helper. It removes only legacy line primitives whose names identify
  them as Xenomimic/twin/connectome/tether objects, disposes their geometry and single or array-backed
  materials, and does not target tails, limbs, tendrils, live Xenomimic bodies, or the separate Entity
  connectome.
- Connectome synchronization uses fixed capture/index arrays, releases vacated creature references when
  the population shrinks, and clears every capture on idempotent disposal. Logical link counts remain
  available to telemetry without retaining dead bodies or recreating a renderer.
- `XenomimicPopulation` now contains bodies only at the canonical square platform boundary. The movement
  integrator explicitly has no origin radius, partner-distance clamp, spring, or home force; each axis is
  clamped/reflected independently only at the authored platform edge.
- Temporary Big Tree travel is explicit locomotion intent from the shared visitor adapter. `Travel`
  preserves the authored heading, `Calm` settles the body, and `Normal` returns to the existing neural
  locomotion. This state is bounded visit behavior, not a twin or origin tether.

### Evidence that no hidden tether remains

- **Automated:** `tests/xenomimic-connectome.test.ts` proves no line-renderer construction, permanent
  invisibility, bounded logical links, allocation-free synchronization, and reference cleanup after
  shrink/disposal.
- **Automated:** `tests/connectome.test.ts` proves the scene-level axon web is invisible from
  construction, cannot be re-enabled, writes no geometry, and still computes nonzero links and topology
  pairs. `tests/graph-mind.test.ts` proves the retained graph still drives communities and activation.
- **Automated:** `tests/xenomimic-cosmetics.test.ts` traverses a real Three.js scene and finds no
  Xenomimic `Line`, `LineLoop`, or `LineSegments`; it also plants historic named `Line`, `LineLoop`, and
  `LineSegments` remnants, proves the purge removes all three, verifies geometry and material-array
  disposal, confirms a second purge is idempotent, and seals the neural-web toggle against restoring a
  Xenomimic visual.
- **Automated:** `tests/xenomimics.test.ts` places bodies near square corners, widely separates twins,
  and proves neither radial projection nor partner-distance pulling occurs. Separate tests cover normal,
  travel, calm, teleport, predation/respawn, ground movement, lifecycle, and renderer disposal.
- **Automated:** the Big Tree visitor tests drive Xenomimic travel, calm social activity, departure, food,
  rest, death/despawn cleanup, and reset without introducing tether state.
- **Inspected:** there is no physics-joint or constraint object in the Xenomimic population, renderer,
  connectome, or visitor adapter.

This evidence closes the code and automated movement axes. A dedicated live manual pass following several
Xenomimics through every requested camera angle and combat/transition state has **not** yet been recorded;
the local browser captures described later are broad world-liveness evidence, not that dedicated close-up.

## Canonical Big Tree food

### Interface and authored resources

`EdibleResourceRegistry` in `src/sim/edible-resource.ts` is the canonical fixed-pool food interface used
by both fruits and leaves. The production Crystal tree registers **10,000 fruits and 10,000 leaves** as
stable records. Fruits award `28` nourishment units and leaves award `14`.

The registry's explicit runtime states are `available`, `reserved`, `consuming`, and `respawning`.
`respawning` is the consumed/unavailable phase; there is no second decorative food state outside the
registry. Each record contains a stable ID, generation, owner, lease, authored canopy position, reachable
interaction point, nutrition value, and simulation-time respawn deadline.

External ground and flight visitors target distributed interaction points around the tree rather than an
unreachable canopy transform. The authored approach scheme uses 48 angular slots across three radial
rings, while the shared visit manager separately provides 104 distinct activity positions:

| Activity slot | Count | Radius from tree centre |
| ------------- | ----: | ----------------------: |
| Eat           |    32 |                      78 |
| Rest          |    24 |                     132 |
| Socialize     |    24 |                     178 |
| Observe       |    16 |                     218 |
| Overflow/any  |     8 |                     205 |

### Discovery, reservation, approach, and consumption

- Contextual visit scoring combines hunger, fatigue, health deficit, stress, social need, curiosity,
  danger, distance, route feasibility, food availability, stable personality, occupancy, and simulation
  load. A stable hash-derived threshold varies decisions without an ambient RNG or synchronized rush.
- Ordinary organisms and Xenomimics are sampled on a staggered fixed budget of 64 candidates every
  0.1 scaled seconds. Independently owned fauna are sampled round-robin on a budget of 32 candidates
  every 0.1 scaled seconds.
- A successful visit reserves the nearest compatible activity slot. Food visitors then atomically call
  `reserveAny`, renew their owner/generation lease, steer to the record's interaction point, call
  `beginConsumption`, and finally call `completeConsumption`.
- Tree residents use the same registry transaction, but fly to the real authored canopy instance rather
  than a ground approach point.
- A successful transaction returns nutrition once. The species adapter translates it into the species'
  native energy scale; unsuccessful or stale attempts return zero and cannot award nutrition.
- If a target disappears, expires, or is won by another being, visitors clear the stale handle, wait on a
  short retry, select another kind/resource, or end the activity at a hard search deadline. No movement
  loop waits forever on a lost record.

Directly wired visitor categories are:

- ordinary `Entity` organisms;
- Xenomimics;
- all ten resident Crystal-tree species;
- Shoggoths, Titans, Leviathans, Puppeteers, and each autonomous Apex body.

Launched NHI matrix beings and player-controlled hero/avatar bodies are intentionally excluded so their
separate agency/locomotion remains authoritative. `WildernessPopulation` has no direct Big Tree visitor
adapter in this change. Those exclusions mean the literal claim –every living object in the repository—
is **not** made.

### Exact 5.0-second respawn and race safety

`EDIBLE_RESOURCE_RESPAWN_SECONDS` is exactly `5`. `completeConsumption()` changes the record to
`respawning`, removes its active lease/owner, hides it, and inserts that same fixed record once into an
indexed deadline heap at `now + 5`. It never allocates a replacement food object.

All food deadlines use `CrystalEcosystem.foodTime`, which advances from the world's scaled simulation
delta. No `Date`, `performance.now`, `setTimeout`, or wall-clock timer participates. Passing the same
simulation time pauses leases, visits, and respawns; changing simulation speed changes all of them through
the same established scaled-time model.

Duplicate protection is layered:

- only `available` records can be reserved;
- one `(ownerId, generation)` owns a live reservation;
- `beginConsumption()` accepts only the matching reserved generation;
- `completeConsumption()` accepts only the matching consuming generation and immediately changes state;
- the indexed respawn heap permits one deadline per record and throws on a duplicate insertion;
- generation increments invalidate every stale handle after cancellation, reset, or restoration.

The render lifecycle hides the exact instanced item immediately. At restoration it writes the authored
matrix first, marks only that 16-float Three r185 instance range dirty, and publishes `available` only
after restoration succeeds. A failed visual restore remains unavailable and is retried without
head-of-line blocking or a second timer. There is no per-item collider allocation or destruction to
stack; reachability is represented by stable interaction points and the shared transaction state.

**Automated evidence:** `tests/edible-resource.test.ts`, `tests/crystal-ecosystem.test.ts`, and
`tests/big-tree-fauna-visitors.test.ts` cover one-winner races, exactly-once nutrition, fruit and leaves,
immediate unavailability, no respawn at 4.999 seconds, restoration at 5.000 seconds, visual-restore
failure, target loss, lease expiry/renewal, cancellation/death/despawn, reset, fixed-object reuse, and
repeated deadline cycles.

## Food-only persistence boundary

Cross-session persistence is intentionally narrower than the in-memory visit manager:

- storage key: `cqm.big-tree-ecology.v1`;
- payload: version, fixed-pool capacity, and a sparse array of non-default food entries;
- persisted food data: stable ID, generation, and remaining respawn time in `[0,5]`;
- excluded data: actors, visitor bodies, activity slots, partners, relationship/faction state,
  reservations, owner handles, cooldowns, render objects, listeners, and callbacks.

Only currently respawning records and active claims needing normalization are emitted. Active reserved or
consuming claims restore as available at the next generation, so discarded actors cannot leave an orphaned
claim. When restore performs that normalization, `World` immediately rewrites the canonical sparse
checkpoint. A failed rewrite is not acknowledged, leaves synchronization dirty, and remains retryable on a
later lifecycle flush. A respawning record stores remaining **simulation** time; closing the application
does not consume that time, and the remaining interval resumes after reload.

Boot validates the entire snapshot before applying it and restores food before constructing visitor
adapters. Corrupt, wrong-version, wrong-capacity, duplicate-ID, or out-of-range data is rejected without
leaking a half-mutated registry. Genesis clears the isolated key. Dirty revision/time tracking suppresses
duplicate serialization, but a failed storage write remains retryable. Hidden-page, `pagehide`, and world
disposal hooks perform best-effort flushes.

**Automated evidence:** `tests/store.test.ts`, `tests/edible-resource.test.ts`, and
`tests/big-tree-world-integration.test.ts` cover JSON round trips, sparse checkpoints, normalized live
claims, remaining-time restoration, corrupt payload rejection, failed-write retry, Genesis clear, and
application lifecycle wiring.

Active visit state deliberately starts clean after reload. Protection is recomputed from position and new
decisions; stale targets, pairings, or faction state are not restored. This is safe cleanup, not seamless
continuation of an in-progress social visit.

## Big Tree safe, neutral, and social zone

### Boundary and transitions

- centre: world `(x=220, z=620)`;
- visitor entry radius: `240`;
- visitor exit radius: `270`;
- harm queries conservatively use the outer `270` radius, so an outside actor cannot attack a protected
  target through the hysteresis band;
- membership lifecycle: `Outside -> Travelling -> Active -> Leaving -> Cooldown -> Outside`;
- shared capacity: at most `72` travelling/active/leaving visitors;
- activity dwell: deterministic per-actor range `7–24` scaled seconds;
- revisit cooldown: deterministic per-actor range `35–95` scaled seconds;
- hard travel/leave limits: `90` and `50` scaled seconds;
- slot lease: `12` scaled seconds;
- stuck recovery: after 8 seconds without sufficient progress, select a different compatible slot; at
  most two recoveries before clean timeout/cooldown.

Arrival uses the smaller radius and departure uses the larger radius, preventing boundary flapping. Meals,
rest recovery, activity completion, dwell expiry, target/partner loss, route failure, stuck exhaustion,
despawn, reset, and capacity/slot rejection all have bounded cleanup paths. Departure steers to a stable
actor-specific point beyond the outer radius; it does not teleport.

### Aggression suppression and restoration

The same composition-root sanctuary predicate is wired into ordinary Entity behavior/brain input,
Xenomimic threat/predation, Shoggoth pursuit/tendrils/feeding, Puppeteer meddling, Titan diplomacy/combat,
singularity forces, ChaosField mutations, dome-wide fauna feeding, Apex hunting, portal death, and
Mechalogodrom blaze handling for ordinary organisms. Harm is rejected when either endpoint is protected.

Fauna visitor adapters set their canonical `aggressionSuppressed`/controlled lane while travelling,
active, and leaving, then clear it on departure, cancellation, despawn, or reset. Core systems suppress
the hostile action at execution time rather than rewriting faction or relationship tables. Leaving
therefore resumes current normal policy without automatically replaying an old target. Food competition
is resolved by the reservation transaction and never becomes an aggression trigger.

Friendly flocking/crowd separation remains available to prevent overlap; harmful impulses and mutations
are suppressed. The sanctuary does not create a separate physics world, relationship database, or
parallel combat system.

**Automated evidence:** `tests/big-tree-zone.test.ts`, `tests/big-tree-visitors.test.ts`,
`tests/big-tree-fauna-visitors.test.ts`, `tests/big-tree-world-integration.test.ts`, and the existing
sanctuary tests in Entity, Shoggoth, Titan, Xenomimic, feeding, hunt, hazard, singularity, and ChaosField
suites cover endpoint protection, de-escalation, exit cleanup, hysteresis, cooldowns, bounded dwell,
crowding, and target/partner loss.

There is no universal projectile/trap registry in this integration. Systems listed above are wired; any
future or currently unregistered damaging subsystem must explicitly consume the same predicate before the
zone can be claimed safe against it. The generic claim –all possible delayed effects are blocked— is not
made without that per-system audit.

## Tree residents and neural-controller verification

The tree owns **250 residents**: ten species with 25 individuals each. Every resident has a genuine,
fixed-size **6 -> 6 -> 4** `TinyMLP` controller with **70 finite parameters** and fixed input/hidden/output
buffers. Its six effective inputs encode metabolic state, food bearing, food proximity, local social
density, safe-zone calm minus threat, and phase shifted by stable personality. Four network outputs
materially contribute two movement axes plus metabolic and social drives; derived bounded activities are
eat, rest, socialize, and roam.

The controller output is consumed by locomotion and activity selection, not merely shown in a panel.
Residents reserve and eat through the canonical registry, react to real visitor/social density, and move
toward an authored welcome ring rather than following a particular visitor. They cannot permanently trail,
swarm, or trap a departing guest.

Model loading validates the exact parameter count and finiteness. Invalid dimensions/weights or non-finite
outputs invoke a deterministic friendly-rest fallback; a valid reload restores operation. Development
telemetry exposes readiness, decisions, fallback count/reason, last activity, motor axes, social drive, and
visitor inputs.

Resident social learning is genuinely wired but deliberately narrow. With no external visitor present, a
resident in `SOCIAL` can form a bounded reciprocal episode with the nearest willing, unreserved
same-species resident in `SOCIAL` within that species' 25-member block. Both references are committed
atomically, both residents receive the same midpoint and bounded episode timer, and a third resident
cannot select either participant. A teacher must have completed at least two more canonical meals.
On success, all 70 parameters in the learner's live policy move exactly 8% toward the teacher's policy;
the teacher is unchanged. The path validates both complete vectors before mutation, is all-finite and
all-or-nothing, uses no RNG, observes a 25-second per-learner simulation-time cooldown, and records only
actual movement in an events-only ledger. A state change from either end releases both partner
references; reset/disposal clears the full fixed population, and a stale peer index is harmless. No
cross-species, general-intelligence, consciousness, sentience, or physical-quantum claim follows.

**Automated evidence:** `tests/tree-creature-brain.test.ts` exercises every input/output channel, all four
activities, deterministic inference, caller-owned buffers, invalid input/output, model-dimension failure,
and reload. `tests/tree-creature-teaching.test.ts` proves the exact blend, unchanged teacher, subsequent
behavior change, competence/cooldown/identity/shape gates, all-or-nothing non-finite rejection,
determinism, reset, one canonical meal producing exactly one competence increment, atomic reciprocal
pair formation, third-party exclusion, stale-peer safety, real Crystal integration, and either-side
pair release.
`tests/crystal-ecosystem.test.ts` proves outputs causally alter runtime movement, visitor presence changes
the social input without following visitors, residents share food without contests or permanent
reservations, and disposal is complete/idempotent.

## Social, teaching, learning, resting, and peaceful behavior

Operational reusable behaviors include contextual visits for food, rest, safety/observation, curiosity,
and social activity; calm approach/departure; exclusive reciprocal partner leases; orientation toward a
nearby willing partner; peaceful shared-space damping; ordinary neural-activation/payoff feedback;
Xenomimic shimmer feedback; fauna cross-species pairing; resident welcome-ring response; early completion;
timeout; partner-loss cleanup; and return to the original ecosystem controller.

Two implemented teaching/learning transfers are deliberately narrow and real:

1. When a **new** willing ordinary-organism pair contains exactly one cooperator (`strategy=0`) and one
   defector (`strategy=1`), the defector copies the cooperative strategy once. The canonical Nash behavior
   reads that strategy after the visit and heredity can pass it to descendants. Lease renewal cannot
   repeat or inflate the event.
2. The same-species resident teaching path described above updates the learner's live 70-parameter neural
   policy only after the two-meal competence gate, finite-vector validation, and per-learner cooldown pass.
   Its real ledger records event count, rejection count, last teacher, last learner, simulation time, and
   moved weight distance.

Mixed-species pairs do not claim a transfer. There is no broader cross-species skill, memory, trait,
policy-model, or hidden knowledge transfer, and social animation alone is not reported as learning.

Partner discovery is bounded by active capacity, not total population. Ordinary/Xenomimic matching is one
linear active pass. Fauna matching caches each eligible adapter read once, then performs deterministic
numeric distance comparisons over at most 72 active visitors; the potentially quadratic portion does not
re-read species adapters or scan inactive populations. Partner leases are symmetric/exclusive and are
released on distance, timeout, departure, despawn, reset, or error.

## Observability and debugging

At a sparse 600-frame cadence, development audit telemetry reports visitor counts by category, meals,
social pairs, cooperative-policy transfers, resident teaching events and latest teacher/learner/time/weight
delta, target losses, polls, cancellations, completed/timed-out visits, stuck recoveries, forced exits,
partner timeouts, capacity/slot rejection, available slots, each food-state count, pending respawns,
lifecycle errors, suppressed harm, and neural status. The teaching status also exposes rejection count.

Caller-owned visitor views expose reason/activity, target, selected slot, food ID/kind/state, owner,
partner, energy, and cooldown/deadline state without production geometry. The local browser hook is
restricted to localhost/127.0.0.1. No Big Tree or Xenomimic debug line is enabled in production.

## Automated test receipt

The final merged-tree cross-system ecology/tether run completed **211 pass, 0 fail** with **10,764
expectations across 17 files**. It covered the production activity bridge, canonical and fauna visitors,
zone/world composition, food registry and Crystal lifecycle, dome feeding, Shoggoth/Titan/Puppet/Apex
suppression, Entity and Xenomimic connectomes, GraphMind, and Xenomimic cosmetics. The repository-wide
coverage run then completed **3,275 pass, 0 fail** with **3,551,817 expectations across 365 files**.

```text
tests/big-tree-activity-bridge.test.ts
tests/big-tree-fauna-source-integration.test.ts
tests/big-tree-fauna-visitors.test.ts
tests/big-tree-visitors.test.ts
tests/big-tree-world-integration.test.ts
tests/big-tree-zone.test.ts
tests/connectome.test.ts
tests/crystal-ecosystem.test.ts
tests/dome-feeding.test.ts
tests/edible-resource.test.ts
tests/graph-mind.test.ts
tests/puppet-masters.test.ts
tests/shoggoths.test.ts
tests/super-hunt.test.ts
tests/titans.test.ts
tests/xenomimic-connectome.test.ts
tests/xenomimic-cosmetics.test.ts
```

Additional directly relevant suites, including performance, observability, persistence, tree-resident
brain/teaching, NHI, lifecycle wiring, Pages server, and free-movement tests, are part of the full receipt.

The performance-invariant suite uses 10,000 ordinary organisms plus 2,000 Xenomimics, a 72-visitor
capacity, fixed 64-candidate polling, 72 concurrent mixed-species social visitors, and 64 full
consume/respawn cycles over 256 fixed records. Source seals reject full-population polling, max-actor
deadline scans, and linear active-identity lookup.

## Performance measurements

Fresh local microbenchmark on 2026-07-14:

- CPU: Intel Core Ultra 9 275HX, observed clock about 3.64 GHz;
- runtime: Bun 1.3.14, x64 Windows;
- command: `bun bench/big-tree-ecology.bench.ts`.

| Scenario                                          |  Average |  Minimum |      p75 |       p99 |
| ------------------------------------------------- | -------: | -------: | -------: | --------: |
| 20,000 food records, no deadline due              |  1.81 ns |  1.22 ns |  1.83 ns |   5.64 ns |
| Renew 72 live food reservations                   |  1.73 us |  1.22 us |  1.79 us |   1.95 us |
| Snapshot a clean sparse 20,000-slot pool          | 75.77 us | 33.40 us | 80.30 us | 347.90 us |
| Stringify the clean sparse snapshot               | 81.49 ns | 56.30 ns | 87.01 ns | 133.40 ns |
| Step 72 active visit records                      |  4.50 ns |  2.10 ns |  4.79 ns |   7.89 ns |
| Match/update 50 unmatched fauna social candidates | 82.51 us | 52.40 us | 85.20 us | 142.90 us |

The 50-candidate fauna fixture performs one source read per active candidate rather than a nested
adapter-read scan. Food selection uses deterministic free lists; deadlines use indexed heaps;
active visit work is capacity-bounded; food hide/restore uses a single instance-matrix update range.

These microbenchmarks verify bounded component costs on this machine. They do **not** establish whole-world
60–120 FPS, browser GPU performance, or another machine's result.

## Local browser validation

One atomic, serial local natural-`requestAnimationFrame` smoke passed for phone and desktop. The harness does
not call the localhost `step()` hook or `gl.readPixels`; it gates bounded native rAF batches, captures an
unmodified full UI screenshot plus a separately masked canvas-only screenshot, samples PNG output, checks
camera framing, exercises a habitat-stress interval, and writes stage/failure artifacts.

| Evidence                     |       Phone |      Desktop |
| ---------------------------- | ----------: | -----------: |
| Viewport / DPR               | 390x844 / 2 | 1280x720 / 1 |
| Drawing buffer               |    780x1688 |     1280x720 |
| Flora instances              |      20,800 |       60,000 |
| World frame at capture       |           6 |            4 |
| Canvas-only average luma     |       70.86 |        49.22 |
| Canvas-only colour buckets   |         451 |          272 |
| Console errors / page errors |       0 / 0 |        0 / 0 |
| Failed responses / requests  |       0 / 0 |        0 / 0 |
| Active tree visitors         |           9 |            9 |
| Stress frames / duration     | 3 / 34.69 s |  2 / 55.22 s |
| Reported stress rate         |   0.086 FPS |    0.036 FPS |

Both runs used Chromium's ANGLE **SwiftShader** software Vulkan renderer. Their explicit measurement class
is `headless-browser-liveness-not-production-fps`; the very low rates must not be presented as a native-GPU
performance result or compliance with the 60–120 FPS objective. Screenshots were visually inspected as
nonblank, abundant world renders, but they do not prove each requested ecology state transition.

Worker status was intentionally `dormant-main-thread`, matching the accepted runtime override: the
wilderness worker asset was built and served successfully, but no worker pool was active. This report does
not claim operational worker offload.

The status-bearing atomic summary records `status: passed`, requested/completed tiers
`[phone, desktop]`, every successful lifecycle stage, zero console/page/network failures, fixed food
census equality, sanctuary/visitor/neural diagnostics, worker-asset HTTP 200, and the four inspected PNG
paths under `output/playwright/`. The deployed GitHub Pages version has not yet been verified.

## Manual scenario accounting

The following requested behaviors have strong automated equivalents but have not all been completed as a
single human-observed live checklist:

| Requested scenario family                                  | Current evidence                                                                  | Status                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Xenomimic line absence and free movement                   | Scene/source tests; corner/separated-twin movement tests; broad local screenshots | Dedicated multi-angle/state manual follow still pending |
| Multi-species hunger, travel, fruit/leaf eating            | Core + all five direct fauna-category adapter tests                               | Automated; live long-form observation pending           |
| Exact 5.0-second reuse and two-eater race                  | Exact clock and transaction tests                                                 | Automated                                               |
| Peaceful rest/social coexistence and hostile de-escalation | Zone, species, fauna, combat/hazard tests                                         | Automated; live hostile-arrival observation pending     |
| Temporary visits, varied dwell, departure, cooldown        | Visit-state tests with bounded deadlines                                          | Automated                                               |
| Friendly tree residents, peer teaching, and safe fallback  | Neural/controller, teaching, and Crystal integration tests                        | Automated; live behavior tour pending                   |
| Crowding and blocked navigation                            | 72-capacity stress, multiple slots, stuck reroute/timeout tests                   | Automated                                               |
| Repeated resource/visit cleanup                            | 64-cycle pool stress plus reset/despawn/dispose tests                             | Automated                                               |
| Save/load/reset                                            | Primitive checkpoint, corruption, reset, lifecycle tests                          | Automated; application restart manual pass pending      |
| Production build and deployed Pages                        | Local 117-artifact Pages build + atomic smoke passed                              | Deployed-site verification pending                      |

## Remaining limitations and final acceptance blockers

1. Run the final repository-wide gate after all report/surface edits.
2. Verify the deployed GitHub Pages commit, assets, boot, console, and screenshots.
3. Perform and document the dedicated live semantic checklist, especially multi-angle Xenomimic states,
   naturally arriving hostility, long-form visit diversity, and repeated application restart.
4. Profile whole-world frame time and memory on representative native GPUs. Current SwiftShader evidence is
   liveness only and cannot validate 60–120 FPS.
5. Decide whether `WildernessPopulation` should become a direct visitor. NHI and player hero/avatar
   exclusions are intentional; wilderness absence is currently an unsupported category.
6. Audit any future projectile, trap, area-effect, or delayed-damage subsystem against the shared
   sanctuary predicate before extending the safe-zone claim to it.
7. Do not describe social animations as general learning. The verified transfers are the separate
   one-shot ordinary-organism `1 -> 0` strategy imitation and bounded same-species resident neural-policy
   blend; neither authorizes a cross-species, general-intelligence, consciousness, or sentience claim.

Subject to those explicit blockers, the current implementation is automated-test-backed for tether-free
Xenomimic rendering/movement, canonical race-safe fruit and leaf consumption, exact five-second
simulation-time respawn, bounded temporary visits, integrated sanctuary suppression, friendly neural tree
residents, narrow real policy transfer, fixed-pool cleanup, sparse food-only persistence, and bounded query
costs for the directly supported species. The policy-transfer evidence covers two distinct bounded
mechanisms: ordinary strategy imitation and same-species resident teaching.
