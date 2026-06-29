# Brain Parameter Scale Plan

Targets the directive in the V95/V96 session: 25k parameters per 100 letter creature and an APEX creature scaling from 100k to 5M parameters.

## Current state

- `AlphabetPantheonRender` already renders the 100 Greek+Latin+Roman letter archetypes as pure visual instanced meshes (no physics, no AI, no economy, no RNG draw). They are deterministic trig-driven "alive" bodies.
- `apexBrain` is a real `ApexBrain` class but its parameter count is much smaller than 100k today.
- The 5 Super Creatures (Archons/Godforms) are the only fully wired deep-mind + economy + body systems; the 100 letter creatures are NOT wired that way.

## Targets

| Entity           | Count | Params each | Total params | Notes                                                             |
| ---------------- | ----- | ----------- | ------------ | ----------------------------------------------------------------- |
| Letter creatures | 100   | 25,000      | 2.5M         | Visual-only autonomous behavior layer, no economy/physics backend |
| APEX capstone    | 1     | 100k → 5M   | 100k → 5M    | Scales through incremental brain growth milestones                |

## Why visual-only for the 100 and APEX

The user explicitly wants them to stop acting like the 5 Super Creatures (no backend wiring, no purse, no GOAP, no NHI). They should:

- Exist, move, react, evolve visually.
- Be "alive" in the dome.
- Not perturb the deterministic sim RNG, the economy, or entity physics.

This means the parameter budget is for a **shader/animation/behavior state machine**, not a full deep-mind simulator.

## Architecture options

### 1. Creature shader brain (visual-state vector)

Each creature carries a 25k-parameter state vector used by a custom vertex/fragment shader. This is the most GPU-efficient path.

- 25k params ≈ 100 KB per creature (f32). 100 creatures ≈ 10 MB GPU memory.
- Params drive:
  - Shape deformation (e.g., 8k displacement weights)
  - Color/flash/shimmer (e.g., 4k palette + timing params)
  - Motion/behavior (e.g., 4k attractor/wander params)
  - Neural-style weights (e.g., 9k small MLP weights for shader-based "behavior")
- All evaluated on GPU, no CPU work per creature.

### 2. CPU light brain (animation behavior model)

Keep the 25k params in typed arrays but only update a small active subset per frame.

- 100 × 25k f32 = 10 MB CPU memory — fine.
- Update only visible creatures or only a few parameters per frame.
- Use the params as a reservoir: a small recurrent kernel reads/writes a few values each frame.

### 3. Compressed/procedural parameters

Generate the 25k parameters procedurally from a seed + archetype index, then expand them in shader. This is the most scalable.

- Store ~1k "genome" values per creature.
- Expand to 25k via deterministic fractal/hashing functions on GPU.
- Creatures can "evolve" by mutating the small genome.

## Recommended approach for V96

Combine #1 and #3:

- **Per-creature genome**: ~1k f32 stored in a `DataTexture` or instanced attribute.
- **GPU expansion shader**: expands 1k → 25k using deterministic fractal functions + golden-ratio hashing.
- **Visual behavior**: the expanded params drive a custom shader material with vertex displacement, color pulsing, and motion.
- **Evolution**: small random mutations on the 1k genome (isolated UI/visual RNG, not the sim RNG).

This keeps the 100 creatures purely visual, deterministic, GPU-bound, and scalable.

## APEX scaling 100k → 5M

APEX starts as a single shader-driven brain with 100k parameters. Growth milestones:

| Milestone | Params | Visual upgrade                                       |
| --------- | ------ | ---------------------------------------------------- |
| Stage 0   | 100k   | Current APEX capstone mesh + enhanced shader         |
| Stage 1   | 250k   | Multi-layer shader displacement, more tendrils       |
| Stage 2   | 500k   | Procedural neuron-like geometry instances            |
| Stage 3   | 1M     | Multiple synchronized brain lobes                    |
| Stage 4   | 2.5M   | Full 4D hyper-dimensional deformation                |
| Stage 5   | 5M     | Mega godlike composite brain visible across the dome |

Each stage uses a larger GPU DataTexture. The jump from 100k to 5M is still a single GPU texture (~20 MB f32), which is fine.

## Implementation plan

1. Create a `PantheonBrainShader` class that owns the GPU parameter texture and material.
2. Port `AlphabetPantheonRender` to use this shader material.
3. Generate 100 × 1k genomes from the archetype seeds (no new RNG consumption).
4. Expand the 1k genome to 25k in the shader.
5. Add a `MutationSystem` for the 100 genomes (visual-only, optional, user-triggered).
6. Upgrade APEX to a `MegaBrainShader` starting at 100k params, with stage-unlock logic.

## Memory/perf budget

- 100 creatures × 1k genome f32 = 400 KB CPU.
- 100 creatures × 25k expanded f32 = 10 MB GPU (texture or instance buffer).
- APEX 5M f32 = 20 MB GPU.
- Total GPU extra: ~30 MB — acceptable for desktop and high-end mobile.

## Determinism & RNG discipline

- Genome generation must use a separate `visualRng` derived from the world seed.
- Shader expansion must be deterministic (no `Math.random` or GPU noise without seed).
- No writes to the main entity RNG, economy, or physics state.

## Open questions

- Should the 100 creatures react to each other (e.g., shader-based flocking), or only to world chaos?
- Should APEX brain growth be time-based, user-triggered, or achievement-based?
- Should the brain parameters be inspectable (e.g., a small telemetry panel showing active parameter counts)?

---

Status: planning document. Implementation is a separate V96 milestone.
