<!-- reviewed: 2026-07-12 | canonical Xenomimic implementation contract -->

# Canonical Xenomimics

Xenomimics are first-class, deterministic ground fauna. They are not the streamed Wilderness
octahedra, atmospheric particles, artifact scars, or a second hidden population. `World` constructs
one `XenomimicPopulation`, and every renderer, inspector, connectome, audio lane, ecology callback,
and control reads that population.

## Runtime contract

| Property          | Canonical behavior                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Seed              | Dedicated deterministic RNG substream; adding the system does not perturb the Entity golden                                      |
| Population        | One shared-brain pair at boot; smooth target ramp from 2 toward a hard cap of 1,000                                              |
| Birth             | Well-fed pairs create litters of 1-3 new pairs below the current target                                                          |
| Lifetime          | 150 simulation seconds by default                                                                                                |
| Natural revival   | 120 simulation seconds by default; due revivals are drained through a bounded budget                                             |
| Predation revival | Exactly 5 simulation seconds after another being eats a body                                                                     |
| XNO               | Adds exactly one live body per activation; the next singleton can complete its pair                                              |
| Time controls     | Uses simulation `dt`, so pause freezes life and every existing speed scale applies                                               |
| Terrain           | World-injected terrain height plus the live ground-displacement field                                                            |
| Plants            | `grazeAt` removes real flora energy; `foodAt` is only the read-only sensing fallback                                             |
| Entity exchange   | Sampled Entity neural activation enters the Xenomimic threat channel; sampled Entities can consume nearby bodies and gain energy |

## Body and presentation

Ten indexed, instanced morphs cross five visual grammars with counter-variants: porous Mobius web,
radial machine, shard bloom, wire tesseract, and lattice orb. Role, neurology, weather, chaos,
coherence, integration proxy, and twin tension drive chirality, proportion, shimmer, and color.
Weighted-fulcrum lean is a damped ground-contact pendulum; gait combines crawl, sprint, curve, sway,
hop, and landing impulses. Surface clamping prevents free sky flight.

The renderer owns at most ten opaque `InstancedMesh` draws at the 1,000-body cap. Four fixed
`vec4` instance lanes carry life, body physics, pair mind, and environment state. There is no
per-body `Object3D`, particle draw, or steady-frame typed-array allocation.

## Brain and twin dynamics

Each reciprocal mimic/anti-mimic pair shares one 6-input, 8-hidden, 5-output MLP: 48 input weights,
8 hidden biases, 40 output weights, and 5 output biases, for exactly 101 trainable parameters. The
roles apply opposite directional curvature to the shared result. The brain also advances a
classically simulated three-qubit statevector used for deterministic superposition, collapse, and
bounded teleport behavior.

The inspector exposes ten operational consciousness-theory indicator lanes, including IIT-style
integration and GWT-style broadcast values. These are computational diagnostics only. They are not
evidence of sentience, phenomenal experience, or physical quantum effects.

## Connectome, sound, and inspection

- `src/sim/xenomimic-connectome.ts` renders reciprocal twin edges and at most 48 nearest Entity
  bridges in one bounded `LineSegments` draw. Entity activation also changes the brain input, so the
  bridge is not decorative-only.
- `src/audio/xenomimic-audio.ts` maps aggregate population, pair tension, environment, and proximity
  into a fixed 15-node eerie sound field. Lifecycle stings are capped at four accepted events per
  second and six transient voices; mute and pause hard-silence it.
- `src/ui/xenomimic-panel.ts` reuses the Super-panel outer geometry and spacing while presenting
  population, ten species, lifecycle, 101-parameter brain, twin, ecology, and indicator telemetry.
- Public Telemetry places Xenomimics directly below Entities; Observatory accepts four Xenomimic
  lanes; View mode `mimic` selects a living ground subject for macro tracking.

## User surfaces

`XNO` (or the `Y` key) adds one body. `XENOMIMIC` in the horizontal panel dock opens the dedicated
inspector. `VIEW` cycles through `mimic` without replacing the existing Entity, Titan, specimen, and
cinematic modes. Help, Copilot, Lab adapters, Specs, Docs, README, changelog, and the Xenomimic issue
form all use this same canonical terminology.

## Verification targets

The focused test family covers deterministic replay, opposite twins, exact-one XNO semantics,
population/lifecycle bounds, five-second predation revival, real grazing callbacks, terrain
clamping, weighted fulcrum motion, ten indexed render batches, bounded connectome and audio graphs,
panel honesty language, Observatory/Telemetry wiring, and the UI controls. Whole-repository
typecheck, tests, evidence checks, and browser verification remain the release gate.
