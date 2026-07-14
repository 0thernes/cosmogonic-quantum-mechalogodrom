## Copy-paste prompt for Claude Code or Codex

```text
MODE: FULL REPOSITORY AUDIT, MODERNIZATION, OPTIMIZATION, DOCUMENTATION CLEANUP, RELEASE, AND DEPLOYMENT

Work autonomously in the current repository. This is an execution task, not a request for recommendations only. Inspect the repository, establish a baseline, make the necessary changes, validate them, commit them locally, push them to GitHub, and verify the live GitHub Pages deployment.

You are authorized to modify the repository, run its tools, update dependencies, create logical commits, push the completed work, and trigger the repository’s existing deployment and release workflows. Do not create paid resources, expose secrets, destroy production data, rewrite shared Git history, or force-push.

PRIMARY OUTCOME

Bring the entire project to a clean, current, production-ready state:

1. Local files contain the final intended implementation.
2. All intended changes are committed.
3. Local HEAD and the target GitHub branch resolve to the same commit SHA.
4. CI, builds, tests, and quality checks pass.
5. GitHub Pages is deployed successfully from the same source revision.
6. The live site is verified rather than merely assumed to be working.
7. Documentation, release information, navigation, and repository metadata accurately describe the shipped project.

Do not report completion unless each applicable result has been verified with evidence.

NON-NEGOTIABLE QUALITY CONSTRAINTS

- Preserve or improve visual quality.
- Preserve or improve intelligence, behavior, responsiveness, shaders, rendering, graphics, skins, environments, ecology, world behavior, animations, and presentation.
- Do not disable visual effects, lower asset quality, remove meaningful behavior, or simplify the experience merely to improve benchmark numbers.
- Do not introduce placeholder implementations, silent failures, fake mocks in production paths, misleading documentation, decorative abstractions, or speculative features.
- Do not remove tests simply because they fail. Determine whether the implementation, test, fixture, or expectation is stale.
- Do not overwrite, discard, reset, or accidentally commit unrelated user changes.
- Do not claim that something is fixed, current, secure, optimized, deployed, or verified without actually checking it.
- Prefer small, coherent, measurable improvements over gratuitous rewrites.
- Preserve backward compatibility where reasonably possible. Clearly document unavoidable breaking changes.
- Use factual language for concepts associated with CONSCIOUSNESS, SENTIENT, THALER, intelligence, awareness, or related project terminology. Do not make unsupported technical or scientific claims.

FIRST: UNDERSTAND THE REPOSITORY

Before editing:

1. Read all repository-specific instructions, including:
   - AGENTS.md
   - CLAUDE.md
   - CONTRIBUTING files
   - package-manager configuration
   - build and deployment documentation
   - CI workflows
   - release configuration
   - linting, formatting, test, and type-checking configuration

2. Inspect:
   - git status
   - current branch
   - remotes
   - recent commit history
   - tags and releases
   - submodules
   - workspaces or monorepo packages
   - lockfiles
   - generated files
   - deployment configuration
   - GitHub Pages source and workflow
   - existing uncommitted changes

3. Preserve unrelated existing work. Never use destructive reset, checkout, clean, or force operations against user work.

4. Detect the actual technology stack rather than assuming it:
   - languages
   - frameworks
   - package managers
   - runtimes
   - graphics APIs
   - rendering engines
   - testing tools
   - documentation generators
   - deployment system
   - supported browsers and platforms

5. Produce a concise execution checklist, then begin work immediately. Do not stop after producing a plan.

REPOSITORY-WIDE AUDIT

Inspect every tracked file at least once through an inventory, automated analysis, or direct review. Perform a careful line-by-line review of:

- all requested documentation
- all files you modify
- core application paths
- rendering and shader paths
- state and event systems
- public APIs
- build and deployment configuration
- security-sensitive code
- performance-critical loops
- tests covering critical behavior

Audit the project for:

- bugs and incorrect behavior
- incomplete wiring
- dead code
- unreachable code
- duplicated logic
- stale compatibility code
- obsolete feature flags
- abandoned experiments
- unused assets
- unused exports and imports
- circular dependencies
- architectural boundary violations
- excessive coupling
- unnecessary complexity
- poor naming
- oversized modules
- fragmented utilities
- misleading comments
- inconsistent types
- unsafe casts
- weak error handling
- swallowed exceptions
- race conditions
- stale closures
- async ordering problems
- resource leaks
- event-listener leaks
- timer leaks
- GPU or graphics-resource leaks
- excessive allocations
- unnecessary renders
- expensive repeated calculations
- invalid recursion or missing termination conditions
- cache invalidation problems
- state synchronization errors
- unhandled loading, empty, offline, and failure states
- broken links
- inaccessible interfaces
- fragile scripts
- obsolete configuration
- security weaknesses
- accidental secrets
- repository sprawl and general maintenance slop

Reason about behavior from multiple directions:

- Inputs to outputs
- Outputs back to their originating inputs
- Callers to callees
- Callees back to callers
- State producers to state consumers
- Event emitters to listeners
- Initialization to teardown
- Normal paths, boundary paths, failure paths, and recovery paths
- Recursive, iterative, asynchronous, and re-entrant execution
- Local behavior and system-wide consequences

Verify that all important systems are genuinely connected and operational rather than merely present in the codebase.

DEPENDENCIES, TOOLCHAINS, AND UPSTREAMS

Modernize the repository’s supported toolchain and libraries carefully.

1. Detect and use the repository’s existing package manager. Do not mix package managers.
2. Preserve deterministic lockfiles.
3. Review direct and transitive dependencies.
4. Review runtime versions, compiler versions, build tools, linters, formatters, test frameworks, GitHub Actions, deployment actions, and documentation tooling.
5. Check official changelogs, migration guides, release notes, and compatibility requirements before applying breaking upgrades.
6. Prefer current supported stable versions, not prereleases, unless this repository intentionally uses prereleases.
7. Do not blindly upgrade to the newest version when it would reduce compatibility, stability, or visual quality.
8. Apply required migrations rather than suppressing warnings.
9. Remove obsolete dependencies only after verifying they are genuinely unused.
10. Run the appropriate dependency and security audits and remediate actionable findings.
11. Do not silence audit findings without documenting a valid technical reason.

Pay special attention to repositories, packages, modules, submodules, copied code, APIs, or documentation associated with "Tsotchke":

- Locate every reference to Tsotchke across code, dependencies, documentation, remotes, submodules, and configuration.
- Identify the authoritative upstream repositories.
- Review upstream changes since the project’s currently integrated revision.
- Compare APIs, bug fixes, performance improvements, documentation, examples, and migration notes.
- Integrate relevant compatible improvements carefully.
- Respect licensing and attribution requirements.
- Do not copy code whose license or provenance is unclear.
- Do not replace project-specific behavior with upstream behavior without confirming compatibility.
- Record the upstream revisions or releases that were reviewed and integrated.

DOCUMENTATION AND MARKDOWN CONSOLIDATION

Perform a complete Markdown and documentation audit.

Give special attention to:

- SPECS
- DOCS
- LABS
- CONSCIOUSNESS
- SENTIENT
- THALER
- README
- About content
- Releases and changelog content
- GitHub Pages navigation and tabs
- contributor documentation
- architecture documentation
- setup and development instructions
- deployment documentation
- API and configuration references
- examples and tutorials
- all other .md, .mdx, and documentation-source files

For every documentation file:

1. Verify it against the current implementation.
2. Correct stale commands, paths, names, screenshots, links, APIs, versions, examples, and assumptions.
3. Test commands and code examples where practical.
4. Remove contradictions.
5. Fix spelling, grammar, structure, headings, formatting, and navigation.
6. Make terminology consistent across the project.
7. Ensure claims are accurate and appropriately qualified.
8. Replace vague or promotional language with concrete technical descriptions where needed.
9. Repair internal anchors, relative links, external links, images, and tab routing.
10. Confirm documentation renders correctly on GitHub and GitHub Pages.

For stale or duplicated Markdown:

- Compare older and newer files before changing them.
- Preserve unique, still-valid information.
- Merge useful material into one authoritative canonical document.
- Remove obsolete duplication only after the canonical replacement is complete.
- Update every inbound link to the canonical location.
- Use redirects, archive notices, or migration notes when removing a file would otherwise break external references.
- Preserve meaningful historical information in an archive, changelog, or Git history rather than leaving it mixed into current documentation.
- Do not create multiple documents that compete as the source of truth.

Create a clear documentation hierarchy so readers can immediately distinguish:

- current specifications
- current user documentation
- active experiments
- historical material
- internal research notes
- implementation details
- release information

CODE HEALTH AND STRUCTURE

Improve maintainability without performing unnecessary rewrites.

- Consolidate genuinely duplicated functionality.
- Split modules whose responsibilities are clearly mixed.
- Keep related code together.
- Make naming and directory structure predictable.
- Remove unnecessary wrappers and decorative abstractions.
- Reduce avoidable branching and nesting.
- Simplify algorithms where doing so preserves behavior.
- Strengthen type safety.
- Make invariants explicit.
- Improve errors so they identify the operation, context, and likely cause.
- Ensure startup, shutdown, reset, reload, and recovery paths are correct.
- Ensure subscriptions, listeners, workers, observers, graphics resources, and timers are cleaned up.
- Keep public interfaces stable unless a change is demonstrably beneficial and documented.
- Do not churn formatting or rename files without a concrete maintenance benefit.
- Do not modify generated or vendored files directly unless the repository’s process explicitly requires it.

TESTING AND QUALITY CONTROL

Inventory the complete test suite and determine which tests are:

- current and valid
- stale but repairable
- duplicated
- flaky
- obsolete because the feature no longer exists
- incorrectly asserting old behavior
- missing coverage for important behavior

Then:

1. Repair stale tests to reflect the verified intended behavior.
2. Fix implementation bugs exposed by valid tests.
3. Remove a test only when its covered behavior is demonstrably obsolete, duplicated, or invalid, and document the reason.
4. Add regression tests for every significant bug fixed.
5. Add targeted coverage for critical paths that currently lack protection.
6. Avoid broad snapshot rewrites that hide visual or behavioral regressions.
7. Make tests deterministic where possible.
8. Check for race conditions and cleanup failures in asynchronous tests.
9. Verify production builds, not only development mode.

Run every applicable quality gate, including:

- formatting
- linting
- type checking
- unit tests
- integration tests
- end-to-end tests
- shader validation
- asset validation
- documentation builds
- link checking
- production build
- package or application smoke tests
- security and dependency checks
- CI-equivalent commands

Do not disable a rule, test, warning, or check merely to obtain a green result. Fix the root cause or document a narrow, justified exception.

VISUAL, GRAPHICS, SHADER, AND WORLD-INTEGRITY REVIEW

Treat visual and experiential quality as a hard requirement.

Audit:

- shader compilation and linking
- render passes
- materials
- textures
- meshes
- animations
- lighting
- shadows
- particles
- post-processing
- skins
- environments
- world state
- ecology and simulation behavior
- camera behavior
- interaction feedback
- loading transitions
- resize behavior
- device-pixel-ratio handling
- WebGL/WebGPU or renderer fallbacks, when applicable
- resource creation and disposal
- context loss and recovery
- draw calls
- overdraw
- batching and instancing
- texture and geometry memory
- frame-to-frame allocations
- layout and UI rendering
- responsive behavior
- accessibility and reduced-motion handling where applicable

Capture a visual baseline before relevant changes. Compare representative scenes, pages, states, viewports, and interactions after the work.

A performance improvement is not acceptable when it causes an unintended reduction in:

- image quality
- shader fidelity
- lighting quality
- animation quality
- world density
- behavioral richness
- responsiveness
- correctness
- accessibility
- visual consistency

Do not delete effects or lower defaults merely to meet a frame-rate goal. Quality tiers or adaptive behavior may be improved only when they remain intentional, tested, and user-controllable.

DOME ECOLOGY, XENOMORPH, AND BIG TREE BEHAVIOR

Treat the following as required functional world behavior, not decorative or purely visual features. Inspect the existing entity, ecology, navigation, AI, animation, rendering, collision, physics, hunger, food, social, and state-management systems before implementing changes. Integrate with existing architecture rather than creating a disconnected parallel system.

XENOMORPH TETHER REMOVAL

The Xenomorphs currently have an unwanted tether-line effect or tether-like constraint. Remove it completely.

Investigate all possible sources, including:

- visible lines, trails, beams, ropes, tendrils, debug lines, and helper geometry
- line-renderer or shader effects
- physics joints, springs, constraints, or distance limits
- parent-child transform connections
- navigation leashes or home-radius constraints
- IK targets
- raycasts or targeting lines
- particle trails
- animation attachments
- stale references or hidden helper entities
- invisible forces that continue to pull, limit, or anchor movement
- code that creates, updates, or disposes of a tether object

Required result:

- No tether line is visible from any camera angle or during any Xenomorph state.
- No invisible physical tether, pulling force, artificial movement restriction, or stale constraint remains.
- Xenomorph movement, animation, navigation, combat, social behavior, and world interaction continue to operate correctly.
- Removing the tether must not create floating objects, broken attachments, animation snapping, physics instability, resource leaks, null references, or orphaned render objects.
- Remove associated dead code and unused assets only after verifying that they are not used elsewhere.
- Do not remove intentional anatomy, animation, tails, limbs, targeting indicators, or meaningful effects that are unrelated to the defect.

Test representative states, including:

- idle
- walking and running
- turning
- climbing or traversing, when supported
- entering and leaving the Big Tree area
- eating
- socializing
- reacting to other entities
- combat or threat states, when applicable
- spawning, despawning, resetting, and reloading
- multiple Xenomorphs active simultaneously

BIG TREE AS A SHARED FOOD SOURCE

The Big Tree’s fruits and leaves must become valid edible resources for every appropriate living being in the dome.

Integrate fruits and leaves with the same canonical food, edible, hunger, nutrition, perception, targeting, navigation, and consumption systems used by existing food Entities. Do not implement tree food as a one-off exception when a reusable edible-resource interface or component can be used.

Required behavior:

1. Fruits and leaves are recognized as food by all living beings that can eat.
2. Living beings can perceive or discover available tree food.
3. A hungry or nutritionally motivated being can select the Big Tree as a food destination.
4. The being can navigate to a valid reachable interaction point.
5. The being consumes a specific fruit or leaf through the existing eating behavior.
6. Successful consumption provides nourishment through the project’s existing hunger, energy, health, or nutritional systems.
7. The consumed item becomes unavailable immediately and cannot be eaten twice.
8. Each consumed fruit or leaf respawns exactly 5.0 seconds after successful consumption.
9. Respawning restores the item in a valid tree location without intersecting creatures, duplicating resources, stacking colliders, or leaking objects.
10. Respawn timing remains correct across pause, reset, reload, scene changes, and simulation-speed changes according to the project’s established time model.

Use a clear state model such as:

- available
- reserved or targeted
- being consumed
- consumed
- respawning
- available again

Prevent:

- multiple beings consuming the same item simultaneously
- duplicate nutrition rewards
- duplicate respawn timers
- permanently reserved food
- beings becoming stuck when another being reaches the food first
- unreachable fruit or leaf targets
- pathfinding loops
- rapid target switching
- respawn accumulation
- an unlimited number of resource objects
- collision or render objects remaining after consumption
- stale references after an item respawns
- food appearing edible before its visual and collision state is restored

When a targeted food item becomes unavailable, the being must recover gracefully by selecting another valid item, waiting briefly, choosing another food source, or continuing with another behavior.

Keep the tree visually alive and abundant, but preserve ecological and gameplay balance. Do not make hunger meaningless by providing unlimited instantaneous nourishment. Reuse or pool food objects where appropriate rather than repeatedly allocating and destroying expensive objects.

BIG TREE SAFE, NEUTRAL, AND SOCIAL ZONE

The Big Tree and its immediate surrounding area must function as a shared safe zone, neutral zone, resting place, nourishment area, and social gathering location for all living beings in the dome.

The zone must be integrated into entity decision-making. It must not merely be labeled as safe while entities continue behaving aggressively inside it.

Living beings may independently and probabilistically decide to visit the Big Tree for:

- eating fruit or leaves
- resting
- recovering energy
- relaxing
- socializing
- observing other beings
- friendly communication
- teaching or learning from one another, where the project has knowledge-transfer behavior
- reducing stress, fear, loneliness, or agitation, where those states exist
- seeking temporary safety
- peaceful coexistence with other species

Visit decisions should consider relevant state such as:

- hunger
- fatigue
- health
- stress
- social need
- curiosity
- current goal
- distance
- route availability
- zone occupancy
- recent visits
- cooldowns
- individual personality or species behavior
- danger outside the zone
- available food
- simulation performance

Do not send every being to the tree at once. Use weighted, contextual, randomized decisions so visits feel organic rather than synchronized or scripted.

SAFE-ZONE RULES

While inside the Big Tree safe zone:

- Living beings must not initiate attacks, predation, hunting, hostile pursuit, territorial aggression, or intentionally harmful behavior.
- Existing hostile targets must be released or suspended safely.
- Entering entities should transition from aggression to a calm or neutral state.
- Fear, panic, pursuit, and threat reactions should de-escalate appropriately.
- Friendly and neutral interactions should be favored.
- Beings may eat, rest, wander calmly, socialize, or observe.
- The zone must not permanently corrupt faction, relationship, or threat state after an entity leaves.
- Entities outside the zone must not exploit targeting logic to attack protected entities through the boundary.
- Projectiles, area effects, traps, hazards, or delayed attacks must not make the zone falsely safe. Handle them according to the project’s architecture without introducing abrupt or visually broken behavior.
- A safe-zone transition must not cause teleportation, animation snapping, navigation failure, or state-machine deadlock.
- Food competition must not turn into aggression inside the zone.
- Multiple species must be able to coexist there without collision chaos or crowding deadlocks.

Clearly define:

- the safe-zone center
- its effective radius or authored boundary
- entry and exit detection
- transition behavior
- allowed and suppressed actions
- what happens to an active hostile action on entry
- what happens when an entity exits
- how boundary oscillation is prevented
- how safe-zone state is restored after save/load or reset

Use hysteresis, cooldowns, or separate entry and exit thresholds when needed to prevent entities from rapidly switching safe-zone state at the boundary.

TEMPORARY VISITS, NOT PERMANENT CAMPING

Living beings must visit the Big Tree temporarily rather than remaining there forever.

Each visitor must have a bounded, randomized visit lifecycle. A typical lifecycle may include:

- decide to visit
- reserve or select a reachable destination
- travel to the tree
- enter the safe zone
- select an activity
- eat, rest, socialize, or relax
- remain for a context-appropriate randomized duration
- finish the visit
- leave the safe zone
- resume normal world behavior
- observe a cooldown before choosing another optional visit

Exit conditions should include one or more of:

- hunger has been sufficiently reduced
- energy or rest need has recovered
- social interaction has completed
- the selected activity has completed
- the randomized visit duration has elapsed
- a maximum dwell time has been reached
- the zone is overcrowded
- another higher-priority non-hostile need takes precedence
- the being has no valid activity remaining

Required safeguards:

- No entity may remain indefinitely because of a missing transition.
- No entity should repeatedly enter and exit every few seconds.
- No entity should reserve food or a social location forever.
- Visitors must release reservations when leaving, despawning, changing goals, or encountering an error.
- The tree must not attract all living beings continuously.
- Entities must resume their broader ecosystem routines after leaving.
- The zone should support a configurable capacity or crowd-density policy when necessary.
- Navigation should provide multiple approach, eating, resting, and social positions to avoid a single congested point.
- Stuck detection and recovery must return blocked entities to a valid behavior.

TREE-DWELLING CREATURES

The creatures living on or around the Big Tree must be friendly, kind, peaceful, responsive, and socially compatible with all appropriate living beings.

Where the project already has neural-network-controlled agents, learned controllers, adaptive agents, or an equivalent intelligence architecture:

- Connect the tree-dwelling creatures to the canonical intelligence system.
- Confirm their neural-network inputs and outputs are genuinely used.
- Confirm sensory inputs, decision outputs, animation, movement, social responses, and lifecycle handling are fully wired.
- Remove fake, decorative, disconnected, or unused neural-network paths.
- Preserve deterministic fallback behavior when a model is unavailable or produces invalid output.
- Validate model loading, tensor or input dimensions, output interpretation, numerical stability, cleanup, and performance.
- Do not describe a creature as neural-network-controlled unless the runtime behavior is actually driven by that system.

Their intended disposition is:

- friendly by default
- non-hostile
- curious without being intrusive
- welcoming to visitors
- calm inside the safe zone
- capable of friendly reactions and social behaviors
- never predatory toward safe-zone visitors
- able to return to normal tree activities after an interaction
- unable to trap, block, swarm, or permanently follow visitors

Friendly behavior should be expressed through the project’s existing animation, movement, sound, communication, relationship, and social systems rather than through labels alone.

SOCIALIZATION AND PEACEFUL INTERACTION

Implement or strengthen reusable social behaviors for temporary tree visits.

Possible interactions, when compatible with the existing project, include:

- greeting
- calmly approaching
- sitting or resting nearby
- observing
- sharing space
- exchanging non-hostile signals
- teaching or transferring knowledge
- learning from another entity
- group resting
- short cooperative activities
- peaceful species-to-species encounters
- positive relationship changes
- stress reduction
- ending an interaction politely and returning to normal activity

Social behavior must:

- require a valid willing partner
- respect distance and orientation
- time out safely
- handle a partner leaving or despawning
- avoid repeated greeting loops
- avoid all entities selecting the same partner
- prevent permanent pairing
- release interaction reservations
- remain interruptible by critical survival needs
- avoid O(N²) full-population searches every frame
- not create animation or navigation deadlocks

Teaching and learning behavior must use an existing knowledge, memory, trait, skill, policy, or information-transfer system when one exists. Do not fabricate hidden intelligence changes or claim learning occurred when only an animation was played.

ECOLOGY AND SYSTEM INTEGRATION

Ensure the Big Tree features participate correctly in the larger dome ecology.

Audit integration with:

- hunger and nutrition
- health and energy
- entity perception
- navigation and pathfinding
- spatial queries
- goals and utility scoring
- behavior trees or state machines
- neural-network controllers
- relationships and factions
- combat and threat systems
- social systems
- spawning and despawning
- save and load
- reset and restart
- pause and simulation speed
- day/night or environmental cycles
- animation
- audio
- particles and visual feedback
- physics and collision
- rendering and level of detail
- pooling and resource lifecycle
- telemetry and debugging
- deterministic tests
- performance profiling

Use spatial indexing, cached queries, event-driven updates, sensible polling intervals, or other appropriate methods so food discovery and social partner discovery do not require every living being to scan every fruit, leaf, and other being on every frame.

The system must remain performant with:

- many living beings
- many available food items
- several simultaneous visitors
- multiple food items respawning
- several concurrent social interactions
- visitors entering and leaving while other systems are active

Do not sacrifice visual fidelity, intelligence quality, ecological behavior, or responsiveness to achieve performance targets.

OBSERVABILITY AND DEBUGGING

Provide useful development-only visibility into the system without exposing debug clutter in production.

Where consistent with the repository’s practices, make it possible to inspect:

- whether an entity currently considers itself inside the safe zone
- its reason for visiting
- its selected activity
- its selected food or social target
- reservation ownership
- remaining visit time
- visit cooldown
- food state
- food respawn timer
- failed navigation attempts
- stuck-recovery events
- aggression suppression and restoration
- neural-controller status
- why an entity entered or exited a behavior

Debug visualization must be disabled in production unless explicitly enabled. No tether-like debug line may accidentally recreate the Xenomorph visual defect.

REQUIRED TESTS

Add or update focused automated tests for all applicable behavior.

Xenomorph tests:

- no tether renderer or tether object is created
- no hidden tether constraint affects movement
- spawn and despawn leave no orphaned resources
- movement remains valid after tether removal
- representative state transitions do not restore the tether

Tree food tests:

- fruit is recognized as edible
- leaves are recognized as edible
- each supported living-being category can target tree food
- successful consumption awards nourishment once
- simultaneous consumption cannot duplicate rewards
- consumed food becomes unavailable immediately
- consumed food respawns after 5.0 seconds
- food does not respawn before 5.0 seconds
- only one replacement is created or reactivated
- reservations are released after cancellation, death, despawn, or target loss
- a being recovers when its selected food is taken
- save/load or reset produces a valid food state
- repeated consumption and respawn cycles do not leak objects or timers

Safe-zone tests:

- entering suppresses hostile behavior
- entities do not initiate attacks inside the zone
- active hostile behavior de-escalates safely on entry
- leaving restores valid normal behavior without automatically restoring stale targets
- safe-zone boundary hysteresis prevents rapid state oscillation
- food competition does not trigger aggression
- multiple species can remain in the zone peacefully
- visitors eventually leave
- visitors observe a revisit cooldown
- no reservation persists after a visitor leaves
- crowding does not deadlock navigation
- a visitor recovers when its activity or partner becomes unavailable

Tree-creature and social tests:

- tree creatures default to friendly behavior
- they do not attack visitors
- neural-controller inputs and outputs are valid where applicable
- invalid neural output invokes a safe fallback
- social interactions start, complete, time out, and clean up correctly
- interaction partners can leave without trapping the other entity
- knowledge transfer is only recorded when the underlying system performs it
- entities do not remain permanently paired or at the tree

Performance tests or profiling scenarios:

- measure behavior with representative and stress-level entity counts
- verify food and social queries are not performed as avoidable full scans every frame
- check frame time while many visitors are active
- check memory and object counts across repeated food respawn cycles
- check that social interactions, safe-zone checks, and food targeting do not create significant frame spikes
- verify the changes remain compatible with the project’s 60–120 FPS performance objective

MANUAL VALIDATION SCENARIOS

Run and document representative live simulation checks:

1. Observe several Xenomorphs from multiple angles and confirm no visible tether exists.
2. Follow a Xenomorph through movement and behavior transitions and confirm no invisible tether affects it.
3. Allow multiple species to become hungry and verify they independently travel to the Big Tree.
4. Verify they select reachable fruits or leaves and consume them.
5. Time a consumed item and confirm it becomes available again after 5.0 seconds.
6. Verify two beings cannot consume the same item.
7. Observe several beings resting and socializing peacefully near the tree.
8. Confirm naturally arriving hostile or predatory beings become neutral inside the zone.
9. Confirm visitors leave after a brief, varied period and resume normal ecosystem behavior.
10. Confirm beings do not immediately return in an endless loop.
11. Confirm tree-dwelling creatures behave kindly and do not harass, trap, or follow visitors indefinitely.
12. Observe the system under crowding and verify entities do not form an immovable pile at a single interaction point.
13. Run repeated consumption, respawn, visit, and departure cycles and check for memory, timer, listener, navigation, or graphics-resource leaks.
14. Verify the same behavior after save/load, scene reload, application restart, and production build.
15. Confirm the changes introduce no visual, animation, shader, intelligence, ecology, or performance degradation.

PERFORMANCE MAXIMIZATION

Establish a repeatable baseline before optimizing. Record the environment, test scenario, resolution, relevant quality settings, and measurement method.

Target:

- A reliable 60 FPS or better on the project’s supported baseline hardware and representative workloads.
- Progress toward 120 FPS on capable hardware and lighter workloads.
- Approximately 16.67 ms per frame for 60 FPS.
- Approximately 8.33 ms per frame for 120 FPS.

Treat 60–120 FPS as a measurable target, not an unconditional claim across every device.

Profile before and after changes. Investigate:

- main-thread time
- render-thread or GPU time
- long tasks
- frame pacing
- shader compilation
- draw calls
- state changes
- overdraw
- layout and paint work
- component rerenders
- allocations and garbage collection
- memory growth
- asset loading
- network waterfalls
- cache behavior
- bundle size
- code splitting
- startup time
- input latency
- worker utilization
- expensive loops
- repeated parsing or serialization
- unnecessary synchronization
- redundant state propagation
- inefficient data structures
- avoidable recursive work
- hidden work occurring outside the visible frame

Prioritize optimizations based on measured impact. Do not add complex caching, concurrency, memoization, or custom low-level code without evidence that it improves a real bottleneck.

Record before-and-after measurements for meaningful optimizations. When the target cannot be reached in a tested scenario, report the actual result and identified bottleneck honestly.

INVISIBLE IMPROVEMENTS

Make beneficial internal improvements that users may not directly notice but will experience through greater reliability and smoothness:

- more predictable state transitions
- cleaner event flow
- stronger failure recovery
- lower memory usage
- fewer unnecessary renders
- reduced startup work
- improved caching
- safer resource cleanup
- clearer diagnostics
- better accessibility
- more deterministic builds
- faster tests
- improved CI reliability
- better developer tooling
- clearer repository organization

Every invisible improvement must preserve observable behavior unless the previous behavior was a verified bug.

RELEASE, GITHUB, AND DEPLOYMENT

Inspect and follow the repository’s established versioning, release, branch, and deployment conventions.

Do not invent a new release process when a working process already exists.

Before committing:

1. Review the complete diff.
2. Check for accidental files, secrets, generated noise, debugging statements, temporary logs, and unrelated changes.
3. Run all applicable validation.
4. Confirm documentation reflects the final implementation.

Commit strategy:

- Create logical, reviewable commits with descriptive messages.
- Do not combine unrelated changes into a meaningless "update everything" commit.
- Do not rewrite existing shared history.
- Do not force-push.
- Include dependency and lockfile changes in the appropriate upgrade commit.
- Leave the working tree clean.

Release handling:

- Follow the current semantic-versioning or repository-specific policy.
- Update changelog and release notes from actual changes.
- Do not fabricate issue numbers, benchmarks, features, or compatibility claims.
- Create a tag or GitHub Release only when the project’s established workflow calls for one.
- Ensure About, README, release documentation, package metadata, version displays, and navigation remain consistent.

Deployment handling:

1. Build the exact production artifact locally.
2. Confirm the expected GitHub Pages source and workflow.
3. Push the completed commits to the correct remote branch.
4. Confirm the remote branch SHA equals local HEAD.
5. Monitor the associated GitHub Actions and Pages deployment.
6. Resolve deployment failures when they are caused by the repository.
7. Verify the live Pages URL loads successfully.
8. Check important routes, assets, navigation tabs, console errors, and representative interactions.
9. Confirm the deployed content corresponds to the intended commit rather than a stale cached build.
10. Do not declare deployment complete solely because `git push` succeeded.

If credentials, branch protection, network access, or repository permissions prevent an external action, complete everything possible locally, leave the repository clean and committed, and report the exact blocked action, current SHA, command attempted, and repository state. Do not falsely report a push, release, merge, or deployment.

FINAL ACCEPTANCE CRITERIA

The task is complete only when all applicable criteria pass:

- Repository instructions were followed.
- Existing unrelated changes were preserved.
- Code audit completed.
- Documentation audit completed.
- Requested tabs and pages were reviewed.
- Stale Markdown was consolidated safely.
- Broken documentation links were fixed.
- Dependencies and toolchains were reviewed and responsibly updated.
- Relevant Tsotchke upstream changes were reviewed.
- Security and dependency checks were run.
- Stale tests were repaired, justified, or replaced.
- Significant bug fixes have regression tests.
- Linting passes.
- Type checking passes.
- Tests pass.
- Production build passes.
- Documentation and GitHub Pages builds pass.
- Important visual states were compared.
- No unintended visual or behavioral degradation was introduced.
- Performance was measured before and after applicable changes.
- The working tree is clean.
- All intended changes are committed.
- Local HEAD matches the pushed GitHub revision.
- CI is green or any external blocker is precisely documented.
- GitHub Pages is live and verified from the intended revision.
- Release and About information are accurate.
- No temporary files, hidden failures, unresolved merge conflicts, or accidental secrets remain.

- The unwanted Xenomorph tether line has been removed from rendering.
- Any corresponding invisible physics, movement, navigation, or logic tether has also been removed.
- Xenomorph movement and behavior remain correct after tether removal.
- Big Tree fruits and leaves use the canonical edible-resource system.
- All appropriate living beings can discover, navigate to, and consume tree food.
- Consumption grants nourishment exactly once.
- Consumed fruits and leaves respawn exactly 5.0 seconds after successful consumption.
- Food reservations, consumption state, and respawn behavior are race-safe and leak-free.
- The Big Tree functions as a real safe and neutral zone, not merely a visual label.
- Hostility, predation, and harmful actions are suppressed appropriately inside the safe zone.
- Safe-zone entry and exit do not corrupt normal relationship, faction, threat, or behavior state.
- Living beings visit the tree organically for nourishment, rest, safety, and social interaction.
- Tree visits are temporary, bounded, varied, and subject to cooldowns.
- No living being remains permanently stuck, paired, reserved, or camped at the tree.
- Tree-dwelling creatures are operationally friendly and non-hostile.
- Neural-network claims for tree creatures correspond to genuinely connected runtime behavior.
- Social and teaching interactions use real underlying systems and clean up correctly.
- Navigation, crowd handling, and interaction positions prevent avoidable congestion.
- The implementation remains performant at representative and stress-level entity counts.
- Repeated eating, respawning, socializing, entering, and leaving do not leak timers, listeners, objects, graphics resources, or state.
- The complete behavior has been validated in the production build and deployed GitHub Pages version.

FINAL REPORT

At the end, provide a concise but evidence-based report containing:

1. Executive summary
2. Important bugs and architectural issues found
3. Code-health improvements completed
4. Dependencies and toolchains upgraded
5. Tsotchke upstreams reviewed and changes integrated
6. Documentation files consolidated, removed, archived, or replaced
7. Tests added, repaired, removed, and executed
8. Visual and graphics validation performed
9. Performance methodology and before/after results
10. Security or dependency-audit results
11. Commit list and final local commit SHA
12. Remote branch and verified remote SHA
13. CI status
14. GitHub Pages deployment status and verified live URL
15. Release or tag information
16. Remaining known limitations or externally blocked actions

DOME ECOLOGY VERIFICATION

Report:

- the root cause of the Xenomorph tether
- every rendering, physics, navigation, or logic component removed or changed
- evidence that no hidden tether behavior remains
- the canonical food interface or component used by fruits and leaves
- how living beings discover, reserve, approach, and consume tree food
- how the exact 5.0-second respawn is implemented and tested
- how duplicate consumption and duplicate respawn are prevented
- the Big Tree safe-zone boundary and transition rules
- how aggression is suppressed and safely restored
- how temporary visit duration, exit conditions, and revisit cooldowns work
- how crowding and blocked navigation are handled
- how tree-dwelling neural agents are connected and validated
- which social, teaching, learning, resting, and peaceful behaviors are operational
- automated tests added or repaired
- manual simulation scenarios completed
- performance measurements with the new ecology active
- remaining limitations, unsupported species, or externally blocked validation

Be direct and honest. Distinguish clearly between:

- verified facts
- measured results
- reasoned conclusions
- unresolved uncertainties
- actions blocked by permissions or external services

Do not stop at analysis. Complete the audit, improvements, validation, commits, push, release handling, and deployment verification to the fullest extent supported by the repository and available credentials.
```
