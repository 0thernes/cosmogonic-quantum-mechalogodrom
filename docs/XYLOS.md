# Xylos — autonomous manifold creature

Xylos is one non-anthropomorphic organism in the Cosmogonic world. A compact recurrent mind
continuously reads local chemistry, maintains predictions, changes its neural coupling and
chooses movement and substrate disturbances. Its membrane, foci and filaments render that
state. It is not an Archon, chatbot, prompted agent or language model: it needs no tokens,
network inference or conversation to continue its numerical activity.

The design goal is an alien life process with a causal interior that can be observed and
challenged experimentally. Subjective experience, general intelligence and open-ended
biological evolution are not established by this implementation. Existing apex indicator
receipts do not transfer to Xylos.

## Observe and reproduce

Open **XYLOS** in the panel launcher, then **Observe Xylos** to bring the organism into view.
The inspector shows the actual neural disk, weighted connections, activity, energy,
prediction error, confidence, attention, workspace lead, rewiring and dropped steps.
Coherence, confidence and valence are operational proxies, not consciousness scores.
The six disk colors identify nutrient, hazard, field signal, X gradient, Z gradient and
homeostasis groups; bright foci have stronger activity and
white rings mark the leading workspace group. Disk edges are a planar drawing of the
actual graph; the disk metric influences the computation, not the shape of every drawn line.

**Live** is the default experiment mode. The session samples browser entropy outside the
simulation core and injects a numeric noise value. **Seeded** uses reproducible pseudorandom
input. If browser entropy is absent or fails, the inspector explicitly reports **seeded
fallback** and the organism continues. Browser entropy is not a physical quantum source.
Chaotic sensitivity of a deterministic system is different from fresh stochastic input;
neither establishes subjective experience.

**Record new life** resets Xylos to its initial brain seed and replaces the previous local
capture. It stores the numeric percept and noise sequence in a fixed-capacity buffer.
Recording stops visibly when the buffer is full; ordinary activity continues. **Replay
recording** reconstructs this brain trajectory from its seed and captured inputs, with
Xylos substrate writes disabled. The world continues on its own timeline: this is not a
whole-world rollback, and live entropy cannot be regenerated from the seed alone. Captures
are local to the running session and do not survive a reload. Selecting a life mode exits
replay without resetting the current brain state, and also stops an active recording.
A replay holds its completed brain state until a mode change. Starting a new recording
during replay switches to seeded mode. A paused world consumes no Xylos cognitive steps,
entropy or substrate writes.

## Ownership and bounded computation

The binding interfaces are in [Module Contracts](MODULE-CONTRACTS-2026-06-26.md#xylos-autonomous-manifold-creature).

| Module                      | Owned state and responsibility                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/sim/xylos-mind.ts`     | Deterministic neural state, predictions, workspace, plasticity and actions. No DOM, clocks, crypto, Three.js or I/O. |
| `src/core/xylos-session.ts` | Explicit noise source, mode changes and bounded input recording/replay.                                              |
| `src/sim/xylos-habitat.ts`  | Stable local chemical sensing and bounded reaction-diffusion write-back.                                             |
| `src/sim/xylos-body.ts`     | Procedural membrane, foci, filaments and GPU lifetime; consumes borrowed neural state.                               |
| `src/ui/xylos-panel.ts`     | Discoverable controls, operational measurements and research-target explanations.                                    |
| `src/world.ts`              | Fixed-step assembly, habitat coupling, camera focus and teardown.                                                    |

The manifold has 48 foci in six groups, four incoming connections per focus and a two-slot
workspace. Forecast residual variance supplies an uncalibrated reliability estimate that
gates perceptual correction and exploration. Learned attention-transition probabilities
bias the next admission, and an action-conditioned model forecasts sensory deltas for
heading selection. Coordinates lie inside a Poincaré disk; its metric modulates transmission and
plasticity. Sparse connectivity and bounded plasticity constrain work to O(48 × 4) per
cognitive step. Rewiring changes links inside a fixed pool rather than growing an unbounded
network. The body uses fixed-size geometry and reads the same activity and topology shown
by the inspector. Inspector drawing is O(48 + 192), throttled to every four cognitive steps
while open, and owns no independent animation timer.

Cognition runs at 20 Hz, with at most four catch-up steps in one frame. Excess accumulated
steps are discarded and counted. Percepts and noise are validated before changing state;
invalid input must fail visibly rather than manufacture plausible telemetry. Repeated
disposal is harmless. New performance receipts belong in
[Benchmarks](BENCHMARKS-2026-06-26.md), and repository-wide verification facts remain in
[Verification Analytical Data](VERIFICATION-ANALYTICAL-DATA.md).

## Indicator research map

The identifiers below refer to [Butlin et al. (2023), Table 1](https://arxiv.org/html/2308.08708v3#S0.T1).
The short titles paraphrase those targets. The mechanism mappings, proposed extensions and
acceptance experiments are this project's interpretation, not the paper's assessment of
Xylos. An implemented mechanism is a candidate for investigation; no row is certified by
appearance, naming, a scalar meter or an ordinary regression test.

| Target                                       | Candidate mechanism and remaining implementation path                                                                                                                                              | Required acceptance experiment                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RPT-1 — Recurrent sensing**                | Sparse recurrent state transforms recent numerical perception. Instrument and independently disable recurrent transmission.                                                                        | With matched seeds and input streams, compare intact versus feedforward control on delayed cue discrimination. Report both accuracy and state retention.                |
| **RPT-2 — Integrated percepts**              | Chemistry and gradients share a manifold, but an organised scene representation has not been demonstrated. Extend sensing to relational spatial features and expose their joint representation.    | Use different spatial arrangements with matched average chemistry; test whether the representation and action distinguish relations rather than scalar totals.          |
| **GWT-1 — Parallel specialists**             | Six differentiated groups execute on each step. Prove distinct useful roles rather than infer them from colored clusters.                                                                          | Lesion each group separately with identical input streams; look for selective deficits and recovery across held-out conditions.                                         |
| **GWT-2 — Selective bottleneck**             | Two workspace slots select competing module signals. Expose occupancy and attention selection independently for intervention.                                                                      | Sweep distractor strength and count competitors; verify bounded occupancy and task-relevant selection against random and unrestricted controls.                         |
| **GWT-3 — Shared broadcast**                 | Selected workspace activity feeds all groups. Add a controlled broadcast clamp without altering local sensory input.                                                                               | Perturb one broadcast under fixed inputs; measure downstream effects in each group and eliminate those effects by disconnecting its broadcast input.                    |
| **GWT-4 — Sequential workspace queries**     | Internal state biases attention, but compositional task execution is unproven. Add a held subgoal and explicit read/query trace.                                                                   | Test a task requiring successive specialist results; compare sequence completion with intact, shuffled and disabled broadcasts.                                         |
| **HOT-1 — Constructive perception**          | Noise, recurrent dynamics and feedback modify immediate input. Distinguish stimulus reconstruction from unrelated spontaneous activity.                                                            | Present predictable signals, omissions and matched corruptions; test whether omitted patterns are selectively reconstructed and whether feedback ablation removes this. |
| **HOT-2 — Reliability monitoring**           | Confidence follows forecast residual variance. Add labeled sensory reliability trials and calibration reporting; low variance alone is not correctness.                                            | Vary signal correctness independently of magnitude; evaluate confidence calibration and reliable/noisy discrimination on unseen noise conditions.                       |
| **HOT-3 — Monitored belief and action**      | Confidence affects control, but a general belief formation and revision system is not established. Expand learned cue beliefs and competing goal choices.                                          | Reverse the reliability of conflicting cues; verify appropriate belief and action revision, with confidence ablation and fixed-policy controls.                         |
| **HOT-4 — Structured feature geometry**      | Soft-thresholded channel codes and disk coupling supply candidate geometry, without establishing a perceptual quality space. Learn stimulus-specific codes with measurable neighborhood structure. | Measure activation sparsity, continuity under small stimulus changes and discrimination between distinct stimuli; compare against shuffled coordinates.                 |
| **AST-1 — Attention self-model**             | Attention includes an internal predictive state. Expose its estimate and its effect on selection separately from the actual attention index.                                                       | Mislead only the model while keeping input fixed; measure predictable selection errors, then compare recovery with intact and frozen-model runs.                        |
| **PP-1 — Prediction-led sensing**            | Forecast errors influence later activity. A full hierarchical predictive-coding account needs explicit generative and error paths with independent ablation.                                       | Compare forecasts against persistence and shuffled baselines; remove error feedback and test prediction and control degradation without changing the input history.     |
| **AE-1 — Adaptive goal pursuit**             | Internal energy, hazard and learned consequences guide movement and disturbances. Demonstrate flexible tradeoffs beyond a fixed weighted rule.                                                     | Reverse resource/hazard contingencies and switch goal priorities; compare learned adaptation against frozen-learning and random-action controls across seeds.           |
| **AE-2 — Learned sensorimotor consequences** | A compact action-consequence model relates actions to later sensation in a mutable substrate. Instrument predictions before each action and subsequent errors.                                     | Reverse movement or substrate response while preserving sensory statistics; test model relearning and useful control against a frozen consequence model.                |

The research path is to build controlled interventions, collect matched trajectories and
evaluate these explicit hypotheses. Ordinary engineering tests establish determinism,
finiteness, bounded capacity, causal coupling and resource disposal. Those checks are
necessary for reproducible experiments; they do not substitute for the acceptance
experiments above or establish consciousness.
