/**
 * PER-ENTITY NEURAL CONTROLLER (V42) — the directive's "50–150 parameter neural network so it's alive
 * and can do shit" at chaos-biome scale. Every normal organism carries the genome's compact **70-param
 * brain** (a {@link TinyMLP} 6→6→4 from [genome.ts](./genome.ts)): each beat it PERCEIVES its own state
 * + the world (energy, age, speed, chaos, a stable personality bias, a phase clock), and STEERS itself
 * — a small, bounded velocity nudge layered on top of the morphotype's behavior field, so 50,000
 * entities each move with their own reactive, individual character instead of a single shared rule.
 * Four diagonal leaky recurrent context states retain semantic resource, threat, exploration, and social
 * evidence per persistent brain identity when the shared Tsotchke ecology field is active. Storage is
 * allocated up front so attachment stays allocation-free: 17 bytes/organism (4×FP32 + ready bit). These
 * EMA-style states are runtime memory, not extra inherited parameters or an unqualified RNN claim.
 *
 * EFFICIENT AT 50k: `World` uses full evaluation every frame to maintain visual quality. The genome
 * pool is one flat typed array; normal runtime tiers keep FP32 fidelity and use a direct FP32 hot path
 * for the allocation-free forward pass. Packed FP16/INT8 remain explicit opt-in formats for tools/tests.
 *
 * DETERMINISM-SAFE: the genomes are rolled ONCE from an INJECTED dedicated {@link Rng} sub-stream (never
 * the world's main rng), and the field is driven by {@link World} — NOT by the bare `EntityManager` the
 * golden determinism test exercises — so the pinned same-seed population trace stays byte-identical.
 * No `Math.random` / `Date.now`. Leaf module (depends only on `genome`, `Rng`, and the entity type).
 */
import type { Rng } from '../math/rng';
import type { Entity, OrganismGoalField, OrganismIntelligenceSignal } from '../types';
import type { QuantizationConfig } from '../math/quantization';
import { fp16BitsToFp32, fp32ToFp16Bits, fp32ToInt8, int8ToFp32 } from '../math/quantization';
import {
  randomGenome,
  BRAIN_IN,
  BRAIN_HIDDEN,
  BRAIN_OUT,
  BRAIN_GENES,
  GENOME_LEN,
  TRAIT,
  TRAIT_GENES,
} from './genome';

/** Steering authority: the brain nudges velocity by at most ~this per think (a flavour, not a takeover). */
const STEER_GAIN = 0.045;
/** Matches connectome ACT_MAX — brain excitation feeds the same activation field. */
const ACT_MAX = 4;
const DEFAULT_QUANTIZATION: QuantizationConfig = {
  useFp16: false,
  useInt8: false,
  int8MaxError: 0.01,
};

const clamp01 = (x: number): number => (!Number.isFinite(x) || x <= 0 ? 0 : x >= 1 ? 1 : x);
type GenomeStorage = Float32Array | Uint16Array | Uint8Array;
type GenomeStorageKind = 'fp32' | 'fp16' | 'int8';

export class EntityBrainField {
  private readonly capacity: number;
  /** Flat genome pool: `capacity × GENOME_LEN` (trait region + brain weights), rolled once at boot. */
  private readonly genomes: GenomeStorage;
  private readonly storageKind: GenomeStorageKind;
  /** Non-null in the normal full-fidelity runtime path; avoids a per-gene storage-kind branch. */
  private readonly fp32Genomes: Float32Array | null;
  // Allocation-free scratch reused every forward pass.
  private readonly senses = new Float32Array(BRAIN_IN);
  private readonly hidden = new Float32Array(BRAIN_HIDDEN);
  private readonly out = new Float32Array(BRAIN_OUT);
  /** Optional live shared field + ecology goals. Null preserves the exact legacy/headless controller. */
  private intelligence: OrganismIntelligenceSignal | null = null;
  private goals: OrganismGoalField | null = null;
  private onlineLearningEnabled = true;
  /** Bounded online actor/value traces—one compact adaptive state per organism slot. */
  private readonly valueEstimate: Float32Array;
  private readonly actorBiasX: Float32Array;
  private readonly actorBiasZ: Float32Array;
  private readonly lastActionX: Float32Array;
  private readonly lastActionZ: Float32Array;
  private readonly lastEnergy: Float32Array;
  private readonly adaptiveReady: Uint8Array;
  /** Four bounded diagonal leaky recurrent context states per persistent brain identity. */
  private readonly semanticContext: Float32Array;
  private readonly semanticReady: Uint8Array;
  /** Counterfactual control: false reads the same semantic inputs without retaining prior context. */
  private semanticRecurrenceEnabled = true;
  /**
   * Current entity slot -> persistent brain identity. EntityManager swaps two uint32 entries while
   * compacting, so a survivor keeps its genome and learned state without copying 70 genes per move.
   */
  private readonly slotToBrain: Uint32Array;
  /** Time-normalizes online updates so 30/60/120 Hz do not learn at different wall-sim rates. */
  private lastThinkTime = Number.NaN;
  private learningStepScale = 1;
  /** Per-population-call controller constants; avoids repeated optional reads and 50k `Math.pow`s. */
  private activeSignal: OrganismIntelligenceSignal | null = null;
  private controllerActive = false;
  private adaptiveLearningRate = 0;
  private goalGainBase = 0.22;
  private semanticResourceInput = 0;
  private semanticThreatInput = 0;
  private semanticExplorationInput = 0;
  private semanticSocialInput = 0;
  private semanticUpdateRate = 0;
  private signalConfidence = 0;
  private explorationNudge = 0;
  private explorationCosOffset = 1;
  private explorationSinOffset = 0;
  private explorationCosZOffset = 1;
  private explorationSinZOffset = 0;
  private verticalThreatNudge = 0;
  private signalGainScale = 1;
  /** Slot-local corpus rotation is invariant until an entity/phase replaces that slot. */
  private readonly corpusAnglePhase: Float64Array;
  private readonly corpusAngleCos: Float64Array;
  private readonly corpusAngleSin: Float64Array;

  /** Roll one deterministic genome per slot from the injected (dedicated) rng. O(capacity). */
  constructor(capacity: number, rng: Rng, quantization: QuantizationConfig = DEFAULT_QUANTIZATION) {
    this.capacity = Math.max(0, capacity);
    this.storageKind = quantization.useInt8 ? 'int8' : quantization.useFp16 ? 'fp16' : 'fp32';
    const totalGenes = this.capacity * GENOME_LEN;
    this.genomes =
      this.storageKind === 'fp32'
        ? new Float32Array(totalGenes)
        : this.storageKind === 'fp16'
          ? new Uint16Array(totalGenes)
          : new Uint8Array(totalGenes);
    this.fp32Genomes = this.storageKind === 'fp32' ? (this.genomes as Float32Array) : null;
    this.valueEstimate = new Float32Array(this.capacity);
    this.actorBiasX = new Float32Array(this.capacity);
    this.actorBiasZ = new Float32Array(this.capacity);
    this.lastActionX = new Float32Array(this.capacity);
    this.lastActionZ = new Float32Array(this.capacity);
    this.lastEnergy = new Float32Array(this.capacity);
    this.adaptiveReady = new Uint8Array(this.capacity);
    this.semanticContext = new Float32Array(this.capacity * 4);
    this.semanticReady = new Uint8Array(this.capacity);
    this.slotToBrain = new Uint32Array(this.capacity);
    this.corpusAnglePhase = new Float64Array(this.capacity);
    this.corpusAngleCos = new Float64Array(this.capacity);
    this.corpusAngleSin = new Float64Array(this.capacity);
    this.corpusAnglePhase.fill(Number.NaN);

    for (let i = 0; i < this.capacity; i++) {
      this.slotToBrain[i] = i;
      const g = randomGenome(rng);
      const base = i * GENOME_LEN;
      if (this.storageKind === 'fp32') {
        (this.genomes as Float32Array).set(g, base);
      } else {
        for (let k = 0; k < GENOME_LEN; k++) this.setGene(base + k, g[k] ?? 0);
      }
    }
  }

  /**
   * Attach the composition-root-owned intelligence and EntityManager-owned ecology goal fields.
   * Both object identities remain stable. A null signal with non-null goals is the goal-only causal
   * control; passing null for both restores the exact original 6-sense/70-parameter controller path.
   */
  attachAdaptiveField(
    intelligence: OrganismIntelligenceSignal | null,
    goals: OrganismGoalField | null,
  ): void {
    this.intelligence = intelligence;
    this.goals = goals;
  }

  /** Counterfactual/benchmark control: keep perception + goals but freeze actor/value trace updates. */
  setOnlineLearningEnabled(enabled: boolean): void {
    this.onlineLearningEnabled = enabled;
  }

  /**
   * Counterfactual control: retain semantic routing but replace recurrent context with current input.
   * A mode transition clears all retained context so re-enabling cannot resume stale pre-control memory.
   */
  setSemanticRecurrenceEnabled(enabled: boolean): void {
    if (enabled === this.semanticRecurrenceEnabled) return;
    this.semanticRecurrenceEnabled = enabled;
    this.semanticContext.fill(0);
    this.semanticReady.fill(0);
  }

  /** O(1) entity-list compaction hook: exchange persistent brain identities for two live slots. */
  swapEntitySlots(a: number, b: number): void {
    this.assertSlot(a);
    this.assertSlot(b);
    if (a === b) return;
    const brain = this.slotToBrain[a]!;
    this.slotToBrain[a] = this.slotToBrain[b]!;
    this.slotToBrain[b] = brain;
  }

  /** Clear online state for a newborn/recycled entity slot while retaining its pre-rolled genome. */
  clearEntitySlot(slot: number): void {
    this.assertSlot(slot);
    this.clearBrainState(this.slotToBrain[slot]!);
  }

  /** Genesis reset: restore identity mapping and remove all learned state in O(capacity). */
  resetEntitySlots(): void {
    for (let slot = 0; slot < this.capacity; slot++) this.slotToBrain[slot] = slot;
    this.valueEstimate.fill(0);
    this.actorBiasX.fill(0);
    this.actorBiasZ.fill(0);
    this.lastActionX.fill(0);
    this.lastActionZ.fill(0);
    this.lastEnergy.fill(0);
    this.adaptiveReady.fill(0);
    this.semanticContext.fill(0);
    this.semanticReady.fill(0);
    this.corpusAnglePhase.fill(Number.NaN);
    this.lastThinkTime = Number.NaN;
    this.learningStepScale = 1;
    this.activeSignal = null;
    this.controllerActive = false;
    this.adaptiveLearningRate = 0;
  }

  /** Low-cadence evidence view for one slot; never called by the population hot loop. */
  adaptiveStateAt(slot: number): {
    value: number;
    biasX: number;
    biasZ: number;
    lastActionX: number;
    lastActionZ: number;
    ready: boolean;
  } {
    this.assertSlot(slot);
    const brainSlot = this.slotToBrain[slot]!;
    return {
      value: this.valueEstimate[brainSlot] ?? 0,
      biasX: this.actorBiasX[brainSlot] ?? 0,
      biasZ: this.actorBiasZ[brainSlot] ?? 0,
      lastActionX: this.lastActionX[brainSlot] ?? 0,
      lastActionZ: this.lastActionZ[brainSlot] ?? 0,
      ready: (this.adaptiveReady[brainSlot] ?? 0) !== 0,
    };
  }

  /** Low-cadence evidence view of one identity's four semantic recurrent context states. */
  semanticStateAt(slot: number): {
    resource: number;
    threat: number;
    exploration: number;
    social: number;
    ready: boolean;
  } {
    this.assertSlot(slot);
    const brainSlot = this.slotToBrain[slot]!;
    const base = brainSlot * 4;
    return {
      resource: this.semanticContext[base] ?? 0,
      threat: this.semanticContext[base + 1] ?? 0,
      exploration: this.semanticContext[base + 2] ?? 0,
      social: this.semanticContext[base + 3] ?? 0,
      ready: (this.semanticReady[brainSlot] ?? 0) !== 0,
    };
  }

  /** Packed recurrent-context storage bytes, separate from inherited genome storage. */
  semanticStorageBytes(): number {
    return this.semanticContext.byteLength + this.semanticReady.byteLength;
  }

  /** Underlying genome storage bytes (used by perf receipts and memory budgets). */
  genomeStorageBytes(): number {
    return this.genomes.byteLength;
  }

  /** Storage representation selected for this field. */
  genomeStorageKind(): GenomeStorageKind {
    return this.storageKind;
  }

  /**
   * Return slot `i`'s genome. FP32 storage returns a live view; packed storage returns a dequantized
   * copy because subarray mutation cannot be reflected into packed integer buffers.
   */
  genomeAt(i: number): Float32Array {
    this.assertSlot(i);
    const base = this.slotToBrain[i]! * GENOME_LEN;
    if (this.storageKind === 'fp32') {
      return (this.genomes as Float32Array).subarray(base, base + GENOME_LEN);
    }
    const out = new Float32Array(GENOME_LEN);
    for (let k = 0; k < GENOME_LEN; k++) out[k] = this.getGene(base + k);
    return out;
  }

  /**
   * V122 (USER #9): a BRUTAL morph mutation nudges every organism's BRAIN WEIGHTS by a tiny seeded
   * jitter (±amp, uniform) — a real, live neurological shift, not decoration: the 70-param policies
   * measurably drift so post-morph steering behaviour differs. Trait genes (the personality region)
   * are left untouched so identity survives the mutation; only cognition wobbles. Deterministic via
   * the injected rng (a user-gesture stream, like burst/mutate). O(capacity × brainGenes).
   */
  perturbBrains(rng: Rng, amp = 0.015): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      const base = slot * GENOME_LEN;
      for (let k = base + TRAIT_GENES; k < base + GENOME_LEN; k++) {
        this.setGene(k, this.getGene(k) + (rng() * 2 - 1) * amp);
      }
    }
  }

  /**
   * Move one predator brain toward a prey brain while mutating the real backing storage. This replaces
   * callers mutating `genomeAt(...).subarray(...)`, which cannot work once storage is packed.
   */
  devourBrain(
    predatorSlot: number,
    preyBrain: ArrayLike<number>,
    alpha = 0.25,
  ): { mindDistance: number; transfer: number } {
    if (predatorSlot < 0 || predatorSlot >= this.capacity) {
      return { mindDistance: 0, transfer: 0 };
    }
    const base = this.slotToBrain[predatorSlot]! * GENOME_LEN + TRAIT_GENES;
    let dist = 0;
    let moved = 0;
    for (let k = 0; k < BRAIN_GENES; k++) {
      const pk = this.getGene(base + k);
      const qk = preyBrain[k] ?? 0;
      const diff = qk - pk;
      dist += diff * diff;
      const delta = alpha * diff;
      this.setGene(base + k, pk + delta);
      moved += delta * delta;
    }
    return { mindDistance: Math.sqrt(dist), transfer: Math.sqrt(moved) };
  }

  /**
   * Drive every organism brain this frame: build each entity's senses, run its 70-param brain, and
   * apply the resulting bounded steering to its velocity. Returns how many entities thought. Pure
   * w.r.t. the world rng (touches only entity velocity); allocation-free. Launched NHIs are skipped
   * (they carry their own deep mind). `chaos` is the world disorder, `t` the sim clock (seconds).
   */
  think(list: ReadonlyArray<Entity | undefined>, chaos: number, t: number): number {
    const n = Math.min(list.length, this.capacity);
    if (n === 0) return 0;
    this.prepareThinkTime(t);
    this.prepareControllerContext(t);
    const chaosN = clamp01(chaos / 10);
    let thought = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e && this.thinkSlot(e, i, chaosN, t)) thought++;
    }
    return thought;
  }

  /**
   * Drive the exact original entity slots chosen by a caller-owned priority system. Unlike `think`,
   * this does not compact the list or apply the internal round-robin cohort: each index still maps to
   * its matching genome slot, which keeps perceptual-priority scheduling from steering the wrong brain.
   */
  thinkIndices(
    list: ReadonlyArray<Entity | undefined>,
    indices: ReadonlyArray<number>,
    chaos: number,
    t: number,
  ): number {
    if (indices.length === 0 || this.capacity === 0) return 0;
    this.prepareThinkTime(t);
    this.prepareControllerContext(t);
    const chaosN = clamp01(chaos / 10);
    let thought = 0;
    for (const slot of indices) {
      if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity || slot >= list.length)
        continue;
      const e = list[slot];
      if (e && this.thinkSlot(e, slot, chaosN, t)) thought++;
    }
    return thought;
  }

  /**
   * Explicit full-quality alias: every entity gets the full 70-param brain every evaluation.
   * An optional sanctuary predicate calms only threat/aggression inputs and steering for protected
   * organisms; cognition, resource/social/exploration context, learning, excitation, and bounded
   * non-hostile motor output remain active. `null` preserves the original controller exactly.
   */
  thinkAll(
    list: ReadonlyArray<Entity | undefined>,
    chaos: number,
    t: number,
    sanctuaryAt: ((x: number, z: number, ecologyId?: number) => boolean) | null = null,
  ): number {
    this.prepareThinkTime(t);
    this.prepareControllerContext(t);
    const chaosN = clamp01(chaos / 10);
    const n = Math.min(list.length, this.capacity);
    let thought = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (!e) continue;
      const protectedHere =
        sanctuaryAt?.(e.position.x, e.position.z, e.userData.ecologyId) === true;
      if (this.thinkSlot(e, i, chaosN, t, protectedHere)) thought++;
    }
    return thought;
  }

  private thinkSlot(
    e: Entity,
    slot: number,
    chaosN: number,
    t: number,
    protectedHere = false,
  ): boolean {
    const ud = e.userData;
    if (ud.isNhi) return false; // launched NHIs fly their own mind
    const brainSlot = this.slotToBrain[slot]!;
    const base = brainSlot * GENOME_LEN;
    const s = this.senses;
    // ── PERCEPTION (6 senses, all bounded) ──
    s[0] = clamp01(ud.energy / 100); // health / wealth
    s[1] = clamp01(ud.age / (ud.life > 1 ? ud.life : 1)); // mortality (age toward death)
    const sp = Math.hypot(ud.vel.x, ud.vel.y, ud.vel.z);
    s[2] = clamp01(sp / 6); // own speed
    const signal = this.activeSignal;
    s[3] = protectedHere
      ? 0
      : signal
        ? clamp01(chaosN * 0.7 + signal.threatResponse * 0.3)
        : chaosN; // sanctuary presents a calm threat lane; otherwise world disorder + shared threat forecast
    const fp32 = this.fp32Genomes;
    const curiosity = fp32
      ? (fp32[base + TRAIT.curiosity] ?? 0)
      : this.getGene(base + TRAIT.curiosity);
    const curiosityN = Number.isFinite(curiosity) ? curiosity : 0.5;
    s[4] = signal ? clamp01(curiosityN * 0.65 + signal.exploration * 0.35) : curiosityN; // stable personality + shared exploration pressure
    const phase = Math.sin(ud.ph + t * 0.6);
    s[5] = signal
      ? Math.max(-1, Math.min(1, phase * 0.72 + (signal.forecast - 0.5) * 0.56))
      : phase; // temporal phase + Eshkol-style ecological forecast
    // ── COGNITION (70-param brain, inline allocation-free forward) ──
    if (fp32) this.forwardFp32(base + TRAIT_GENES, fp32);
    else this.forward(base + TRAIT_GENES);
    const o = this.out;
    let actionX = o[0] ?? 0;
    let actionZ = o[1] ?? 0;
    let actionY = o[2] ?? 0;
    if (this.controllerActive) {
      const metabolic = clamp01(ud.energy / 100);
      // Nash payoff is a threat/aggression reward. A sanctuary visit suspends that term without
      // freezing metabolic learning or discarding the actor/value state used after a peaceful exit.
      const payoff = !protectedHere && Number.isFinite(ud.payoff) ? Math.tanh(ud.payoff * 0.1) : 0;
      const learningRate = this.adaptiveLearningRate;
      if (this.onlineLearningEnabled && (this.adaptiveReady[brainSlot] ?? 0) !== 0) {
        // Temporal-difference reward: food/wealth gain dominates; payoff supplies a smaller social term.
        const reward = Math.max(
          -1,
          Math.min(
            1,
            ((metabolic - (this.lastEnergy[brainSlot] ?? metabolic)) /
              Math.max(0.25, this.learningStepScale)) *
              6 +
              payoff * 0.12,
          ),
        );
        const oldValue = this.valueEstimate[brainSlot] ?? 0;
        const advantage = reward - oldValue;
        this.valueEstimate[brainSlot] = oldValue + learningRate * advantage;
        this.actorBiasX[brainSlot] = Math.max(
          -0.35,
          Math.min(
            0.35,
            (this.actorBiasX[brainSlot] ?? 0) +
              learningRate * advantage * (this.lastActionX[brainSlot] ?? 0),
          ),
        );
        this.actorBiasZ[brainSlot] = Math.max(
          -0.35,
          Math.min(
            0.35,
            (this.actorBiasZ[brainSlot] ?? 0) +
              learningRate * advantage * (this.lastActionZ[brainSlot] ?? 0),
          ),
        );
      } else if (this.onlineLearningEnabled) {
        this.adaptiveReady[brainSlot] = 1;
      }
      this.lastEnergy[brainSlot] = metabolic;

      const goals = this.goals;
      const goalDesire = clamp01(goals?.desire[slot] ?? 0);
      const goalCover = clamp01(goals?.cover[slot] ?? 0);
      const goalX = goals?.directionX[slot] ?? 0;
      const goalZ = goals?.directionZ[slot] ?? 0;
      const hasGoal = goalDesire > 0.001 && goalX * goalX + goalZ * goalZ > 1e-8;

      // Four identity-stable, diagonal recurrent context neurons. Named corpus/ecology evidence keeps
      // its meaning here: resource influences goal pursuit, threat evasive motion, exploration roaming,
      // and social evidence goal/heading coordination. Personality changes sensitivity without changing
      // lane identity. The stateless control sees the exact same current targets without memory.
      let semanticResource = 0;
      let semanticThreat = 0;
      let semanticExploration = 0;
      let semanticSocial = 0;
      if (signal) {
        const metabolismTrait = clamp01(
          fp32 ? (fp32[base + TRAIT.metabolism] ?? 0.5) : this.getGene(base + TRAIT.metabolism),
        );
        const aggressionTrait = clamp01(
          fp32 ? (fp32[base + TRAIT.aggression] ?? 0.5) : this.getGene(base + TRAIT.aggression),
        );
        const socialTrait = clamp01(
          fp32 ? (fp32[base + TRAIT.social] ?? 0.5) : this.getGene(base + TRAIT.social),
        );
        // Inputs and trait multipliers are already bounded [0,1], so these products cannot escape it.
        const resourceTarget = this.semanticResourceInput * (0.65 + metabolismTrait * 0.35);
        const threatTarget = protectedHere
          ? 0
          : this.semanticThreatInput * (0.65 + (1 - aggressionTrait) * 0.35);
        const explorationTarget = this.semanticExplorationInput * (0.65 + curiosityN * 0.35);
        const socialTarget = this.semanticSocialInput * (0.65 + socialTrait * 0.35);
        if (this.semanticRecurrenceEnabled) {
          const semanticBase = brainSlot * 4;
          const context = this.semanticContext;
          if ((this.semanticReady[brainSlot] ?? 0) === 0) {
            semanticResource = resourceTarget;
            semanticThreat = threatTarget;
            semanticExploration = explorationTarget;
            semanticSocial = socialTarget;
            this.semanticReady[brainSlot] = 1;
          } else {
            const rate = this.semanticUpdateRate;
            semanticResource = context[semanticBase] ?? 0;
            semanticThreat = context[semanticBase + 1] ?? 0;
            semanticExploration = context[semanticBase + 2] ?? 0;
            semanticSocial = context[semanticBase + 3] ?? 0;
            semanticResource += rate * (resourceTarget - semanticResource);
            semanticThreat += rate * (threatTarget - semanticThreat);
            semanticExploration += rate * (explorationTarget - semanticExploration);
            semanticSocial += rate * (socialTarget - semanticSocial);
          }
          // Entry de-escalates immediately instead of retaining a stale hostile context. Only the
          // threat lane is cleared; the three calm ecology/social memory lanes remain continuous.
          if (protectedHere) semanticThreat = 0;
          context[semanticBase] = semanticResource;
          context[semanticBase + 1] = semanticThreat;
          context[semanticBase + 2] = semanticExploration;
          context[semanticBase + 3] = semanticSocial;
        } else {
          semanticResource = resourceTarget;
          semanticThreat = threatTarget;
          semanticExploration = explorationTarget;
          semanticSocial = socialTarget;
        }
      }
      const goalGain =
        goalDesire *
        goalCover *
        (this.goalGainBase + semanticResource * 0.1 + semanticSocial * 0.035);

      // Actor traces live in the GOAL'S LOCAL FRAME: biasX = along-goal, biasZ = lateral. A learned
      // preference for successful goal pursuit therefore transfers when a resource patch moves or a
      // depleted patch reverses the target; the previous world-coordinate trace fought the new goal.
      const learnedAlong = this.actorBiasX[brainSlot] ?? 0;
      const learnedLateral = this.actorBiasZ[brainSlot] ?? 0;
      const learnedX = hasGoal ? goalX * learnedAlong - goalZ * learnedLateral : learnedAlong;
      const learnedZ = hasGoal ? goalZ * learnedAlong + goalX * learnedLateral : learnedLateral;

      // Threat and exploration need a spatial projection because the shared field has no world-space
      // bearing. Stable entity phase provides diversity without permuting semantic channel identity.
      let threatX = 0;
      let threatZ = 0;
      let explorationX = 0;
      let explorationZ = 0;
      if (signal) {
        let ca = this.corpusAngleCos[slot] ?? 0;
        let sa = this.corpusAngleSin[slot] ?? 0;
        if (this.corpusAnglePhase[slot] !== ud.ph) {
          const angle = slot * 2.399963229728653 + ud.ph;
          ca = Math.cos(angle);
          sa = Math.sin(angle);
          this.corpusAnglePhase[slot] = ud.ph;
          this.corpusAngleCos[slot] = ca;
          this.corpusAngleSin[slot] = sa;
        }
        const threatNudge = protectedHere ? 0 : semanticThreat * 0.055 * this.signalConfidence;
        threatX = ca * threatNudge;
        threatZ = sa * threatNudge;
        // Angle-addition reuses the corpus sin/cos pair; two extra transcendental calls per organism
        // become four scalar multiplies while remaining the exact same trigonometric model.
        const semanticExplorationNudge =
          (semanticExploration - semanticSocial * 0.35) * 0.055 * this.signalConfidence;
        explorationX =
          (ca * this.explorationCosOffset - sa * this.explorationSinOffset) *
          (this.explorationNudge + semanticExplorationNudge);
        explorationZ =
          (sa * this.explorationCosZOffset + ca * this.explorationSinZOffset) *
          (this.explorationNudge + semanticExplorationNudge);
      }

      actionX = Math.max(
        -1.5,
        Math.min(1.5, actionX + learnedX + goalX * goalGain + threatX + explorationX),
      );
      actionZ = Math.max(
        -1.5,
        Math.min(1.5, actionZ + learnedZ + goalZ * goalGain + threatZ + explorationZ),
      );
      if (signal) {
        actionY = Math.max(
          -1.25,
          Math.min(
            1.25,
            actionY +
              (protectedHere
                ? 0
                : this.verticalThreatNudge + semanticThreat * 0.03 * this.signalConfidence),
          ),
        );
      }
      this.lastActionX[brainSlot] = hasGoal ? actionX * goalX + actionZ * goalZ : actionX;
      this.lastActionZ[brainSlot] = hasGoal ? -actionX * goalZ + actionZ * goalX : actionZ;
    }
    // ── ACTION: a small, bounded steer; out[3] is an excitation that scales the authority ──
    const gain = STEER_GAIN * (0.5 + 0.75 * ((o[3] ?? 0) + 1) * 0.5) * this.signalGainScale;
    ud.vel.x += actionX * gain;
    ud.vel.z += actionZ * gain;
    ud.vel.y += actionY * gain * 0.5; // gentler vertical
    // Couple brain excitation into the shared activation field the connectome reads + renders.
    const excite = (o[3] ?? 0) + 1;
    ud.act += excite * excite * 0.022;
    if (ud.act > ACT_MAX) ud.act = ACT_MAX;
    return true;
  }

  /** Allocation-free MLP forward reading brain weights from the flat pool at `base` into `out`. */
  private forward(base: number): void {
    const s = this.senses;
    const hid = this.hidden;
    const out = this.out;
    let w = base;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      let acc = this.getGene(w++); // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += this.getGene(w++) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = this.getGene(w++); // bias
      for (let h = 0; h < BRAIN_HIDDEN; h++) acc += this.getGene(w++) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }

  /** Full-fidelity runtime fast path: same arithmetic/order as `forward`, minus packed-storage decode. */
  private forwardFp32(base: number, genes: Float32Array): void {
    const s = this.senses;
    const hid = this.hidden;
    const out = this.out;
    let w = base;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      let acc = genes[w++] ?? 0; // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += (genes[w++] ?? 0) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = genes[w++] ?? 0; // bias
      for (let h = 0; h < BRAIN_HIDDEN; h++) acc += (genes[w++] ?? 0) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }

  private getGene(index: number): number {
    if (this.storageKind === 'fp32') return (this.genomes as Float32Array)[index] ?? 0;
    if (this.storageKind === 'fp16')
      return fp16BitsToFp32((this.genomes as Uint16Array)[index] ?? 0);
    const min = this.int8Min(index);
    return int8ToFp32((this.genomes as Uint8Array)[index] ?? 0, min, this.int8Max());
  }

  private setGene(index: number, value: number): void {
    if (this.storageKind === 'fp32') {
      (this.genomes as Float32Array)[index] = value;
      return;
    }
    if (this.storageKind === 'fp16') {
      (this.genomes as Uint16Array)[index] = fp32ToFp16Bits(value);
      return;
    }
    (this.genomes as Uint8Array)[index] = fp32ToInt8(value, this.int8Min(index), this.int8Max());
  }

  private int8Min(index: number): number {
    return index % GENOME_LEN < TRAIT_GENES ? 0 : -1;
  }

  private int8Max(): number {
    return 1;
  }

  private assertSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      throw new RangeError(
        `brain slot must be an integer in [0,${Math.max(0, this.capacity - 1)}]`,
      );
    }
  }

  private clearBrainState(brainSlot: number): void {
    this.valueEstimate[brainSlot] = 0;
    this.actorBiasX[brainSlot] = 0;
    this.actorBiasZ[brainSlot] = 0;
    this.lastActionX[brainSlot] = 0;
    this.lastActionZ[brainSlot] = 0;
    this.lastEnergy[brainSlot] = 0;
    this.adaptiveReady[brainSlot] = 0;
    const semanticBase = brainSlot * 4;
    this.semanticContext[semanticBase] = 0;
    this.semanticContext[semanticBase + 1] = 0;
    this.semanticContext[semanticBase + 2] = 0;
    this.semanticContext[semanticBase + 3] = 0;
    this.semanticReady[brainSlot] = 0;
  }

  private prepareThinkTime(t: number): void {
    if (!Number.isFinite(t)) {
      this.learningStepScale = 1;
      this.lastThinkTime = Number.NaN;
      return;
    }
    if (!Number.isFinite(this.lastThinkTime) || t < this.lastThinkTime) {
      this.learningStepScale = 1;
    } else {
      this.learningStepScale = Math.max(0, Math.min(4, (t - this.lastThinkTime) * 60));
    }
    this.lastThinkTime = t;
  }

  /** Fold shared controller terms once per population pass rather than once per organism. */
  private prepareControllerContext(t: number): void {
    const intelligence = this.intelligence;
    const signal = intelligence?.enabled === true ? intelligence : null;
    this.activeSignal = signal;
    this.controllerActive = signal !== null || this.goals !== null;
    if (!this.controllerActive) {
      this.adaptiveLearningRate = 0;
      this.goalGainBase = 0.22;
      this.semanticResourceInput = 0;
      this.semanticThreatInput = 0;
      this.semanticExplorationInput = 0;
      this.semanticSocialInput = 0;
      this.semanticUpdateRate = 0;
      this.signalConfidence = 0;
      this.explorationNudge = 0;
      this.explorationCosOffset = 1;
      this.explorationSinOffset = 0;
      this.explorationCosZOffset = 1;
      this.explorationSinZOffset = 0;
      this.verticalThreatNudge = 0;
      this.signalGainScale = 1;
      return;
    }

    const baseLearningRate = 0.004 + (signal?.plasticity ?? 0) * 0.022;
    this.adaptiveLearningRate =
      this.learningStepScale <= 0 ? 0 : 1 - Math.pow(1 - baseLearningRate, this.learningStepScale);
    this.goalGainBase =
      0.22 + (signal?.resourcePressure ?? 0) * 0.2 + (signal?.confidence ?? 0) * 0.08;
    const channels = signal?.channels;
    this.semanticResourceInput = signal
      ? clamp01((channels?.[0] ?? 0) * 0.65 + signal.resourcePressure * 0.35)
      : 0;
    this.semanticThreatInput = signal
      ? clamp01((channels?.[1] ?? 0) * 0.65 + signal.threatResponse * 0.35)
      : 0;
    this.semanticExplorationInput = signal
      ? clamp01((channels?.[2] ?? 0) * 0.65 + signal.exploration * 0.35)
      : 0;
    this.semanticSocialInput = signal
      ? clamp01((channels?.[3] ?? 0) * 0.65 + signal.socialDrive * 0.35)
      : 0;
    const baseSemanticRate = 0.08 + (signal?.plasticity ?? 0) * 0.14;
    this.semanticUpdateRate =
      signal && this.learningStepScale > 0
        ? 1 - Math.pow(1 - baseSemanticRate, this.learningStepScale)
        : 0;
    this.signalConfidence = signal?.confidence ?? 0;
    this.explorationNudge = signal ? (signal.exploration - 0.5) * 0.08 : 0;
    if (signal) {
      this.explorationCosOffset = Math.cos(t * 0.17);
      this.explorationSinOffset = Math.sin(t * 0.17);
      this.explorationCosZOffset = Math.cos(t * 0.19);
      this.explorationSinZOffset = Math.sin(t * 0.19);
    } else {
      this.explorationCosOffset = 1;
      this.explorationSinOffset = 0;
      this.explorationCosZOffset = 1;
      this.explorationSinZOffset = 0;
    }
    this.verticalThreatNudge = signal ? (signal.threatResponse - 0.5) * 0.05 : 0;
    this.signalGainScale = signal ? 0.92 + signal.confidence * 0.16 : 1;
  }
}
