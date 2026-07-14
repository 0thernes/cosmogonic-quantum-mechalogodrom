/**
 * The NHI super-mind (CONTRACTS V10 — the apex non-human intelligence).
 *
 * Where the leviathans are additive scenery, an NHI READS the world and WRITES to it: the smartest,
 * most manipulative agent in the cosmos. It is built ENTIRELY from the deterministic pre-2016 AI
 * kernel (ai/brains.ts) — game theory, utility AI, episodic memory, a Markov "voice", and a tiny
 * inherited neural gene — so a 10k-agent world stays bit-reproducible from one seed while every NHI
 * runs a singular, scheming, narcissistic, hallucinating mind. No `Math.random`/clock; a seeded
 * {@link Rng} is injected at birth and per decision.
 *
 * COGNITION ONLY (pure, DOM-free, unit-tested — leaf module: imports the kernel + the Rng type,
 * nothing from three.js or the rest of sim). The world integrator maps each emitted {@link NhiIntent}
 * onto an actual sim effect (faction manipulation, swarm spawn, conservative hunt transfer,
 * behavioral mimicry, retreat steering, or utterance toast/SFX); the renderer gives the NHI its alien,
 * morphing body. This fixes the audit's
 * "factions/brains built but wired into nothing" and the user-reported "NHI float away, do nothing".
 */
import type { Rng } from '../math/rng';
import {
  MemoryRing,
  MarkovChain,
  TinyMLP,
  utilityPick,
  softmaxPick,
  GameStrategy,
  iteratedMove,
  regretMatch,
  goapPlan,
  type GoapAction,
} from './ai/brains';

/** What an NHI decides to do this beat. The integrator turns each into an actual world effect. */
export const NhiAction = {
  /** Whisper false goals into a rival faction (belief-state manipulation / gaslighting). */
  MANIPULATE: 0,
  /** Assert dominance over the local region (warps nearby behaviour toward the NHI). */
  DOMINATE: 1,
  /** Release a small swarm of ordinary minions; this is not NHI-mind reproduction. */
  SPAWN_SWARM: 2,
  /** Broadcast a hallucinated utterance (alien toast + bizarre SFX). */
  BROADCAST: 3,
  /** Mimic the nearest ordinary organism's bounded movement and behavioral classification. */
  MIMIC: 4,
  /** Hunt — converge on prey/energy. */
  HUNT: 5,
  /** Retreat and brood (rebuild energy, nurse grudges). */
  RETREAT: 6,
} as const;
export type NhiActionId = (typeof NhiAction)[keyof typeof NhiAction];
export type NhiSelectionMode = 'uninitialized' | 'softmax' | 'regret-positive' | 'regret-uniform';
const ACTION_COUNT = 7;

// ── GOAP strategic layer ─────────────────────────────────────────────────────
// The NHI doesn't just react beat-to-beat — it PLANS a multi-step scheme toward DOMINION (become
// dominant AND have deceived the faction) and biases each beat toward the plan's next step. Facts
// are a 4-bit world model the NHI accumulates as it executes; reaching the goal resets it to scheme
// anew. goapPlan finds the cheapest path (e.g. swarm → dominate, plus deceive).
const F_SWARMED = 1;
const F_DECEIVED = 2;
const F_DOMINANT = 4;
const F_FED = 8;
const NHI_GOAL = F_DOMINANT | F_DECEIVED;
const NHI_GOAP: readonly GoapAction[] = [
  { pre: 0, preClear: F_SWARMED, set: F_SWARMED, clear: 0, cost: 2 }, // raise a swarm
  { pre: 0, preClear: F_DECEIVED, set: F_DECEIVED, clear: 0, cost: 1 }, // deceive the faction
  { pre: F_SWARMED, preClear: F_DOMINANT, set: F_DOMINANT, clear: 0, cost: 1 }, // dominate (needs a swarm)
  { pre: 0, preClear: F_FED, set: F_FED, clear: 0, cost: 2 }, // hunt / feed
];
/** GOAP action index → the {@link NhiAction} whose utility it nudges up. */
const NHI_PLAN_ACTION = [
  NhiAction.SPAWN_SWARM,
  NhiAction.MANIPULATE,
  NhiAction.DOMINATE,
  NhiAction.HUNT,
] as const;

/** Read-only snapshot of the world the NHI perceives this beat (the integrator fills it). */
export interface NhiPercept {
  /** Monotonic decision beat (NOT wall clock) — drives the iterated-game rounds. */
  beat: number;
  /** Own vitality 0..1 (low → retreat/scheme; high → dominate/spawn). */
  energy: number;
  /** World population as a fraction 0..1 of carrying capacity. */
  crowding: number;
  /** Global chaos 0..1 — amplifies volatility + hallucination. */
  chaos: number;
  /** Local threat 0..1 (rival titans / singularities nearby). */
  threat: number;
  /** Id of the nearest rival faction, or -1 when none is near. */
  rivalFaction: number;
  /** That rival's last move toward the NHI: 0 = cooperated, 1 = betrayed, -1 = unknown. */
  rivalLastMove: number;
  /**
   * USER #7a — NHIs are SOCIAL with each other. `kinPresence` 0..1 = density of OTHER NHIs nearby;
   * `kinMood` −1..+1 = their mean mood. `think()` uses them for real mood CONTAGION + social action
   * modulation (kin near → breed/broadcast/hold; isolated → scheme/hunt), so nearby minds genuinely
   * influence one another. Optional (default 0 = asocial) so any percept without them behaves as before.
   */
  kinPresence?: number;
  kinMood?: number;
  /** ADR-0013 shared non-LLM corpus drives. Optional zeros preserve standalone/headless behavior. */
  corpusResource?: number;
  corpusThreat?: number;
  corpusSocial?: number;
  corpusExplore?: number;
  corpusConfidence?: number;
}

/** The NHI's decision for this beat — pure data the integrator executes. */
export interface NhiIntent {
  action: NhiActionId;
  /** Faction targeted by MANIPULATE, else -1. */
  target: number;
  /** Effect strength 0..1 — spawn size, perturbation gain, toast urgency. */
  magnitude: number;
  /** Ordinary swarmling minions requested on SPAWN_SWARM (0 otherwise). */
  spawn: number;
  /** Hallucinated glyph sequence — indices into the integrator's alien-voice alphabet. */
  utterance: number[];
  /** The NHI's own move toward the rival this beat: 0 = cooperate, 1 = defect (for the integrator). */
  ownMove: number;
}

/**
 * A read-only snapshot of an NHI's live cognitive state — the data the 3×3 Observatory grid draws.
 * Every field is a real internal variable of {@link NhiMind.think}; nothing is decorative.
 */
export interface NhiSnapshot {
  /** Fixed-at-birth personality, all 0..1. */
  traits: {
    narcissism: number;
    aggression: number;
    deceit: number;
    hallucination: number;
    volatility: number;
  };
  /** Running affect −1 (brooding) .. +1 (manic). */
  mood: number;
  /** Gene INPUT layer (9): five physical/affective signals + four shared-corpus lanes. */
  sensory: number[];
  /** Gene HIDDEN layer firing (3, 6, or 12; default 6). */
  hidden: number[];
  /** Gene OUTPUT layer firing (7 = one per action). */
  output: number[];
  /** Action utilities this beat (7) — the intention vector. */
  scores: number[];
  /** Exact marginal action distribution used before the latest seeded branch/sample. */
  policy: number[];
  /** Regret vector captured before the latest draw and used to construct `policy`. */
  policyRegret: number[];
  /** Live softmax temperature contributing to {@link policy}. */
  policyTemperature: number;
  /** Probability that the latest policy draw used the regret-matching branch. */
  regretMix: number;
  /** Which seeded branch actually produced {@link lastAction}. */
  selectionMode: NhiSelectionMode;
  /** Decayed counterfactual utility regret per action (7); this is not an external reward gradient. */
  regret: number[];
  /** Episodic memory valence, oldest→newest. */
  memory: number[];
  /** Flattened gene weights (the topology edges). */
  weights: number[];
  /** Network dims for the topology view. */
  dims: { in: number; hid: number; out: number };
  /** Whether corpus lanes are allowed into the neural gene (hand-written utility routes stay live). */
  neuralSemanticInputs: boolean;
  /** Whether corpus lanes contribute to hand-written utility and temperature terms. */
  semanticUtilityInputs: boolean;
  /** Whether computed neural outputs contribute to action utility. */
  neuralGeneOutput: boolean;
  /** Whether physical/personality/social hand-written utility terms contribute. */
  baseUtilityInputs: boolean;
  /** Whether the current GOAP next step receives its +1 utility bias. */
  goapBias: boolean;
  /** Materially acknowledged GOAP world-model bits (F_SWARMED | F_DECEIVED | F_DOMINANT | F_FED). */
  facts: number;
  /** The action the current GOAP plan wants next, or −1. */
  plannedAction: number;
  /** The action actually chosen this beat. */
  lastAction: number;
  /** Distinct rival factions modeled. */
  rivalCount: number;
}

/** GOAP fact-bit labels (index = bit) for the prediction view. */
export const NHI_FACT_LABELS = ['SWARM', 'DECEIVE', 'DOMINATE', 'FED'] as const;
/** Action labels (index = {@link NhiActionId}) for the intention + decision views. */
export const NHI_ACTION_LABELS = [
  'MANIP',
  'DOMIN',
  'SWARM',
  'CAST',
  'MIMIC',
  'HUNT',
  'BROOD',
] as const;

/** Per-rival bookkeeping for the iterated game (one persona per faction the NHI has met). */
interface Rival {
  strategy: number;
  everBetrayed: boolean;
  lastOpp: -1 | 0 | 1;
  round: number;
}

const VOICE_STATES = 12; // alien glyph alphabet size
const MEMORY = 16;
const LEGACY_GENE_IN = 5;
const GENE_IN = 9;
const DEFAULT_GENE_HID = 6;
const GENE_OUT = ACTION_COUNT;
const NHI_STATE_VERSION = 1 as const;
const NHI_PLAN_CAPACITY = 8;
const FLOAT32_MAX = 3.4028234663852886e38;

const RESTORED_IDENTITY = Symbol('nhi-restored-identity');

interface RestoredNhiIdentity {
  readonly traits: NhiSnapshot['traits'];
  readonly neuralSemanticInputs: boolean;
  readonly semanticUtilityInputs: boolean;
  readonly neuralGeneOutput: boolean;
  readonly baseUtilityInputs: boolean;
  readonly goapBias: boolean;
  readonly hidden: NhiGeneHidden;
  readonly voiceWeights: Float32Array;
  readonly geneWeights: Float32Array;
}

interface InternalNhiMindOptions extends NhiMindOptions {
  readonly [RESTORED_IDENTITY]?: RestoredNhiIdentity;
}

/** Supported NHI intuition-gene capacities. The default remains the historical six hidden units. */
export type NhiGeneHidden = 3 | 6 | 12;

/** Birth-time controls used by causal/scaling experiments without changing ordinary runtime calls. */
export interface NhiMindOptions {
  /** Hidden-unit capacity: 3/6/12 produce 58/109/211 live weights respectively. */
  geneHidden?: NhiGeneHidden;
  /** Ablates only corpus-to-neural inputs; existing corpus-to-utility routes remain operational. */
  neuralSemanticInputs?: boolean;
  /** Ablates corpus-to-utility/temperature terms without touching the corpus-to-neural path. */
  semanticUtilityInputs?: boolean;
  /** Ablates every gene-output utility term while retaining the telemetry forward pass. */
  neuralGeneOutput?: boolean;
  /** Ablates physical/personality/social hand utilities for gene-only or GOAP-only controls. */
  baseUtilityInputs?: boolean;
  /** Ablates the current GOAP plan's utility bias while retaining facts and plan telemetry. */
  goapBias?: boolean;
}

/** Exact, JSON-safe checkpoint for one NHI mind. The decision RNG remains caller-owned. */
export interface NhiMindStateSnapshot {
  readonly version: typeof NHI_STATE_VERSION;
  readonly identity: {
    readonly traits: NhiSnapshot['traits'];
    readonly controls: {
      readonly neuralSemanticInputs: boolean;
      readonly semanticUtilityInputs: boolean;
      readonly neuralGeneOutput: boolean;
      readonly baseUtilityInputs: boolean;
      readonly goapBias: boolean;
    };
    readonly dims: {
      readonly in: typeof GENE_IN;
      readonly hid: NhiGeneHidden;
      readonly out: typeof GENE_OUT;
    };
    readonly voiceWeights: readonly number[];
    readonly geneWeights: readonly number[];
  };
  readonly cognition: {
    readonly mood: number;
    /** Oldest to newest, matching the public observatory snapshot. */
    readonly memory: readonly number[];
    /** Sorted by rival id so serialization is canonical. */
    readonly rivals: readonly {
      readonly id: number;
      readonly strategy: number;
      readonly everBetrayed: boolean;
      readonly lastOpp: -1 | 0 | 1;
      readonly round: number;
    }[];
    readonly regret: readonly number[];
    readonly scores: readonly number[];
    readonly sensory: readonly number[];
    readonly hidden: readonly number[];
    readonly output: readonly number[];
    readonly policy: readonly number[];
    readonly policyRegret: readonly number[];
    readonly policyTemperature: number;
    readonly regretMix: number;
    readonly selectionMode: NhiSelectionMode;
    readonly facts: number;
    readonly plan: readonly number[];
    readonly planDirty: boolean;
    readonly plannedAction: number;
    readonly lastAction: number;
  };
}

interface ValidatedNhiState {
  readonly identity: RestoredNhiIdentity;
  readonly mood: number;
  readonly memory: Float32Array;
  readonly rivals: readonly {
    readonly id: number;
    readonly strategy: number;
    readonly everBetrayed: boolean;
    readonly lastOpp: -1 | 0 | 1;
    readonly round: number;
  }[];
  readonly regret: Float32Array;
  readonly scores: Float32Array;
  readonly sensory: Float32Array;
  readonly hidden: Float32Array;
  readonly output: Float32Array;
  readonly policy: Float64Array;
  readonly policyRegret: Float32Array;
  readonly policyTemperature: number;
  readonly regretMix: number;
  readonly selectionMode: NhiSelectionMode;
  readonly facts: number;
  readonly plan: Int32Array;
  readonly planDirty: boolean;
  readonly plannedAction: number;
  readonly lastAction: number;
}

/** Corpus input order after the five legacy inputs: resource, threat, exploration, social. */
const SEMANTIC_TARGET_ACTIONS = [
  NhiAction.HUNT,
  NhiAction.RETREAT,
  NhiAction.MIMIC,
  NhiAction.SPAWN_SWARM,
] as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Normalize an optional external drive; non-finite telemetry is neutral rather than contagious. */
function unitDrive(v: number | undefined): number {
  return v !== undefined && Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

function signedDrive(v: number | undefined): number {
  return v !== undefined && Number.isFinite(v) ? clamp(v, -1, 1) : 0;
}

function rivalId(v: number): number {
  return Number.isSafeInteger(v) && v >= 0 && v <= 1_000_000 ? v : -1;
}

function rivalMove(v: number): -1 | 0 | 1 {
  return v === 0 || v === 1 ? v : -1;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function stateNumber(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`NHI state ${label} must be finite in [${minimum}, ${maximum}]`);
  }
  return value;
}

function stateInteger(value: unknown, label: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`NHI state ${label} must be an integer in [${minimum}, ${maximum}]`);
  }
  return value as number;
}

function stateBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`NHI state ${label} must be boolean`);
  return value;
}

function stateFloat32Array(
  value: unknown,
  length: number,
  label: string,
  minimum: number,
  maximum: number,
): Float32Array {
  if (!Array.isArray(value) || value.length !== length) {
    throw new RangeError(`NHI state ${label} must contain exactly ${length} values`);
  }
  const copy = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const entry = stateNumber(value[i], `${label}[${i}]`, minimum, maximum);
    const rounded = Math.fround(entry);
    if (!Number.isFinite(rounded) || rounded !== entry) {
      throw new RangeError(`NHI state ${label}[${i}] must be an exact finite float32`);
    }
    copy[i] = rounded;
  }
  return copy;
}

function stateFloat64Array(
  value: unknown,
  length: number,
  label: string,
  minimum: number,
  maximum: number,
): Float64Array {
  if (!Array.isArray(value) || value.length !== length) {
    throw new RangeError(`NHI state ${label} must contain exactly ${length} values`);
  }
  const copy = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    copy[i] = stateNumber(value[i], `${label}[${i}]`, minimum, maximum);
  }
  return copy;
}

function stateInt32Array(
  value: unknown,
  length: number,
  label: string,
  minimum: number,
  maximum: number,
): Int32Array {
  if (!Array.isArray(value) || value.length !== length) {
    throw new RangeError(`NHI state ${label} must contain exactly ${length} values`);
  }
  const copy = new Int32Array(length);
  for (let i = 0; i < length; i++) {
    copy[i] = stateInteger(value[i], `${label}[${i}]`, minimum, maximum);
  }
  return copy;
}

function exactArray(actual: ArrayLike<number>, expected: ArrayLike<number>, label: string): void {
  if (actual.length !== expected.length) throw new Error(`NHI state ${label} length mismatch`);
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) throw new Error(`NHI state ${label}[${i}] mismatch`);
  }
}

function selectionMode(value: unknown): NhiSelectionMode {
  if (
    value !== 'uninitialized' &&
    value !== 'softmax' &&
    value !== 'regret-positive' &&
    value !== 'regret-uniform'
  ) {
    throw new RangeError('NHI state selectionMode is invalid');
  }
  return value;
}

function validateNhiIdentity(snapshot: unknown): RestoredNhiIdentity {
  if (!isRecord(snapshot)) throw new TypeError('NHI state must be an object');
  if (snapshot.version !== NHI_STATE_VERSION) throw new Error('unsupported NHI state version');
  if (!isRecord(snapshot.identity)) throw new TypeError('NHI state identity must be an object');
  const identity = snapshot.identity;
  if (!isRecord(identity.traits)) throw new TypeError('NHI state traits must be an object');
  const traits = {
    narcissism: stateNumber(identity.traits.narcissism, 'traits.narcissism', 0, 1),
    aggression: stateNumber(identity.traits.aggression, 'traits.aggression', 0, 1),
    deceit: stateNumber(identity.traits.deceit, 'traits.deceit', 0, 1),
    hallucination: stateNumber(identity.traits.hallucination, 'traits.hallucination', 0, 1),
    volatility: stateNumber(identity.traits.volatility, 'traits.volatility', 0, 1),
  };
  if (!isRecord(identity.controls)) throw new TypeError('NHI state controls must be an object');
  const neuralSemanticInputs = stateBoolean(
    identity.controls.neuralSemanticInputs,
    'controls.neuralSemanticInputs',
  );
  const semanticUtilityInputs = stateBoolean(
    identity.controls.semanticUtilityInputs,
    'controls.semanticUtilityInputs',
  );
  const neuralGeneOutput = stateBoolean(
    identity.controls.neuralGeneOutput,
    'controls.neuralGeneOutput',
  );
  const baseUtilityInputs = stateBoolean(
    identity.controls.baseUtilityInputs,
    'controls.baseUtilityInputs',
  );
  const goapBias = stateBoolean(identity.controls.goapBias, 'controls.goapBias');
  if (!isRecord(identity.dims)) throw new TypeError('NHI state dims must be an object');
  if (identity.dims.in !== GENE_IN || identity.dims.out !== GENE_OUT) {
    throw new Error('NHI state input/output topology mismatch');
  }
  const hidden = stateInteger(identity.dims.hid, 'dims.hid', 3, 12);
  if (hidden !== 3 && hidden !== 6 && hidden !== 12) {
    throw new RangeError('NHI state hidden topology must be 3, 6, or 12');
  }
  const voiceWeights = stateFloat32Array(
    identity.voiceWeights,
    VOICE_STATES * VOICE_STATES,
    'identity.voiceWeights',
    0,
    1,
  );
  const geneWeights = stateFloat32Array(
    identity.geneWeights,
    TinyMLP.weightCount(GENE_IN, hidden, GENE_OUT),
    'identity.geneWeights',
    -FLOAT32_MAX,
    FLOAT32_MAX,
  );
  return {
    traits,
    neuralSemanticInputs,
    semanticUtilityInputs,
    neuralGeneOutput,
    baseUtilityInputs,
    goapBias,
    hidden,
    voiceWeights,
    geneWeights,
  };
}

function validateNhiState(snapshot: unknown): ValidatedNhiState {
  const identity = validateNhiIdentity(snapshot);
  if (!isRecord(snapshot) || !isRecord(snapshot.cognition)) {
    throw new TypeError('NHI state cognition must be an object');
  }
  const cognition = snapshot.cognition;
  const mood = stateNumber(cognition.mood, 'cognition.mood', -1, 1);
  const memoryLength = Array.isArray(cognition.memory) ? cognition.memory.length : -1;
  if (memoryLength < 0 || memoryLength > MEMORY) {
    throw new RangeError(`NHI state cognition.memory must contain at most ${MEMORY} values`);
  }
  const memory = stateFloat32Array(cognition.memory, memoryLength, 'cognition.memory', -1, 1);

  if (!Array.isArray(cognition.rivals)) {
    throw new TypeError('NHI state cognition.rivals must be an array');
  }
  const rivals: Array<{
    id: number;
    strategy: number;
    everBetrayed: boolean;
    lastOpp: -1 | 0 | 1;
    round: number;
  }> = [];
  let previousId = -1;
  for (let i = 0; i < cognition.rivals.length; i++) {
    const entry = cognition.rivals[i];
    if (!isRecord(entry)) throw new TypeError(`NHI state cognition.rivals[${i}] must be an object`);
    const id = stateInteger(entry.id, `cognition.rivals[${i}].id`, 0, 1_000_000);
    if (id <= previousId) {
      throw new RangeError('NHI state rivals must be uniquely sorted by ascending id');
    }
    previousId = id;
    const strategy = stateInteger(entry.strategy, `cognition.rivals[${i}].strategy`, 0, 4);
    const lastOpp = stateInteger(entry.lastOpp, `cognition.rivals[${i}].lastOpp`, -1, 1) as
      | -1
      | 0
      | 1;
    rivals.push({
      id,
      strategy,
      everBetrayed: stateBoolean(entry.everBetrayed, `cognition.rivals[${i}].everBetrayed`),
      lastOpp,
      round: stateInteger(entry.round, `cognition.rivals[${i}].round`, 0, Number.MAX_SAFE_INTEGER),
    });
  }

  const regret = stateFloat32Array(
    cognition.regret,
    ACTION_COUNT,
    'cognition.regret',
    -FLOAT32_MAX,
    FLOAT32_MAX,
  );
  const scores = stateFloat32Array(
    cognition.scores,
    ACTION_COUNT,
    'cognition.scores',
    -FLOAT32_MAX,
    FLOAT32_MAX,
  );
  const sensory = stateFloat32Array(cognition.sensory, GENE_IN, 'cognition.sensory', -1, 1);
  for (let i = 0; i < GENE_IN; i++) {
    if (i !== 4 && (sensory[i] ?? 0) < 0) {
      throw new RangeError(`NHI state cognition.sensory[${i}] must be in [0, 1]`);
    }
  }
  const hidden = stateFloat32Array(cognition.hidden, identity.hidden, 'cognition.hidden', -1, 1);
  const output = stateFloat32Array(cognition.output, ACTION_COUNT, 'cognition.output', -1, 1);
  const policy = stateFloat64Array(cognition.policy, ACTION_COUNT, 'cognition.policy', 0, 1);
  const policyRegret = stateFloat32Array(
    cognition.policyRegret,
    ACTION_COUNT,
    'cognition.policyRegret',
    -FLOAT32_MAX,
    FLOAT32_MAX,
  );
  const policyTemperature = stateNumber(
    cognition.policyTemperature,
    'cognition.policyTemperature',
    1e-6,
    16,
  );
  const regretMix = stateNumber(cognition.regretMix, 'cognition.regretMix', 0, 1);
  const mode = selectionMode(cognition.selectionMode);
  const facts = stateInteger(cognition.facts, 'cognition.facts', 0, 15);
  const plan = stateInt32Array(
    cognition.plan,
    NHI_PLAN_CAPACITY,
    'cognition.plan',
    0,
    NHI_GOAP.length - 1,
  );
  const planDirty = stateBoolean(cognition.planDirty, 'cognition.planDirty');
  const plannedAction = stateInteger(
    cognition.plannedAction,
    'cognition.plannedAction',
    -1,
    ACTION_COUNT - 1,
  );
  const lastAction = stateInteger(
    cognition.lastAction,
    'cognition.lastAction',
    0,
    ACTION_COUNT - 1,
  );

  if ((facts & F_DOMINANT) !== 0 && (facts & F_SWARMED) === 0) {
    throw new Error('NHI state dominant fact requires an acknowledged swarm');
  }
  if ((facts & NHI_GOAL) === NHI_GOAL) {
    throw new Error('NHI state cannot retain a satisfied GOAP goal');
  }

  // `policyRegret` is the exact pre-choice float32 regret copied into the policy builder. `regret`
  // is the post-choice Float32Array update. Proving this transition prevents a forged checkpoint
  // from steering every later regret-matching branch while keeping an otherwise valid policy.
  const sampledUtility = scores[lastAction] ?? 0;
  for (let i = 0; i < ACTION_COUNT; i++) {
    const expectedRegret = Math.fround(
      (policyRegret[i] ?? 0) * 0.97 + ((scores[i] ?? 0) - sampledUtility) * 0.1,
    );
    if (regret[i] !== expectedRegret) {
      throw new Error(`NHI state cognition.regret[${i}] does not match the latest choice update`);
    }
  }

  const policyTotal = policy.reduce((sum, probability) => sum + probability, 0);
  if (Math.abs(policyTotal - 1) > 1e-12) {
    throw new RangeError('NHI state policy must sum to one');
  }
  let maxScore = -Infinity;
  let positiveRegret = 0;
  for (let i = 0; i < ACTION_COUNT; i++) {
    maxScore = Math.max(maxScore, scores[i] ?? -Infinity);
    positiveRegret += Math.max(0, policyRegret[i] ?? 0);
  }
  let softmaxTotal = 0;
  const expectedSoftmax = new Float64Array(ACTION_COUNT);
  for (let i = 0; i < ACTION_COUNT; i++) {
    const weight = Math.exp(((scores[i] ?? -Infinity) - maxScore) / policyTemperature);
    expectedSoftmax[i] = weight;
    softmaxTotal += weight;
  }
  for (let i = 0; i < ACTION_COUNT; i++) {
    const regretProbability =
      positiveRegret > 0 ? Math.max(0, policyRegret[i] ?? 0) / positiveRegret : 1 / ACTION_COUNT;
    const expected =
      (1 - regretMix) * ((expectedSoftmax[i] ?? 0) / softmaxTotal) + regretMix * regretProbability;
    if (Math.abs((policy[i] ?? 0) - expected) > 1e-12) {
      throw new Error(`NHI state policy[${i}] does not match scores/regret controls`);
    }
  }
  if (mode === 'regret-positive' && positiveRegret <= 0) {
    throw new Error('NHI state regret-positive selection requires positive regret');
  }
  if (mode === 'regret-uniform' && positiveRegret > 0) {
    throw new Error('NHI state regret-uniform selection requires no positive regret');
  }

  const expectedPlan = new Int32Array(NHI_PLAN_CAPACITY);
  const expectedPlanLength = goapPlan(facts, NHI_GOAL, NHI_GOAP, expectedPlan);
  const expectedPlannedAction =
    expectedPlanLength > 0 ? (NHI_PLAN_ACTION[expectedPlan[0] ?? 0] ?? -1) : -1;
  if (planDirty) {
    if (facts !== 0 || plannedAction !== -1 || plan.some((entry) => entry !== 0)) {
      throw new Error('NHI state dirty plan must be the untouched initial plan');
    }
  } else {
    if (plannedAction !== expectedPlannedAction) {
      throw new Error('NHI state planned action does not match acknowledged facts');
    }
    for (let i = 0; i < Math.max(0, expectedPlanLength); i++) {
      if (plan[i] !== expectedPlan[i]) {
        throw new Error(`NHI state plan[${i}] does not match acknowledged facts`);
      }
    }
  }

  if (mode === 'uninitialized') {
    const allZero = (...arrays: readonly ArrayLike<number>[]): boolean =>
      arrays.every((array) => Array.from(array).every((entry) => entry === 0));
    if (
      mood !== 0 ||
      memory.length !== 0 ||
      rivals.length !== 0 ||
      !allZero(regret, scores, sensory, hidden, output, policyRegret) ||
      policyTemperature !== 1 ||
      regretMix !== 0 ||
      lastAction !== 0
    ) {
      throw new Error('NHI state uninitialized cognition is internally inconsistent');
    }
  } else {
    const probe = new TinyMLP(GENE_IN, identity.hidden, GENE_OUT, identity.geneWeights.slice());
    const expectedHidden = new Float32Array(identity.hidden);
    const expectedOutput = new Float32Array(ACTION_COUNT);
    probe.forward(sensory, expectedHidden, expectedOutput);
    exactArray(hidden, expectedHidden, 'cognition.hidden activation');
    exactArray(output, expectedOutput, 'cognition.output activation');
  }

  return {
    identity,
    mood,
    memory,
    rivals,
    regret,
    scores,
    sensory,
    hidden,
    output,
    policy,
    policyRegret,
    policyTemperature,
    regretMix,
    selectionMode: mode,
    facts,
    plan,
    planDirty,
    plannedAction,
    lastAction,
  };
}

/**
 * Generate the historical five-input gene with exactly the historical RNG draws, then remap it into
 * the nine-input topology. A new corpus-lane weight inherits the matching action's hidden→output
 * coefficient (resource→HUNT, threat→RETREAT, explore→MIMIC, social→SPAWN_SWARM). Because tanh is
 * monotone, that alignment gives the target output a non-negative local response to its lane. This
 * is deterministic inherited initialization, not learning, and consumes no additional RNG draws.
 */
function expandedGeneWeights(rng: Rng, hidden: NhiGeneHidden): Float32Array {
  const legacy = new Float32Array(TinyMLP.weightCount(LEGACY_GENE_IN, hidden, GENE_OUT));
  for (let i = 0; i < legacy.length; i++) legacy[i] = rng() * 2 - 1;

  const expanded = new Float32Array(TinyMLP.weightCount(GENE_IN, hidden, GENE_OUT));
  const legacyHiddenStride = LEGACY_GENE_IN + 1;
  const expandedHiddenStride = GENE_IN + 1;
  const legacyOutputStart = hidden * legacyHiddenStride;
  const expandedOutputStart = hidden * expandedHiddenStride;

  for (let h = 0; h < hidden; h++) {
    const legacyRow = h * legacyHiddenStride;
    const expandedRow = h * expandedHiddenStride;
    // Preserve the legacy bias + five inputs byte-for-byte.
    expanded.set(legacy.subarray(legacyRow, legacyRow + legacyHiddenStride), expandedRow);
    for (let lane = 0; lane < SEMANTIC_TARGET_ACTIONS.length; lane++) {
      const target = SEMANTIC_TARGET_ACTIONS[lane] ?? NhiAction.HUNT;
      const inheritedOutputWeight = legacyOutputStart + target * (hidden + 1) + 1 + h;
      expanded[expandedRow + legacyHiddenStride + lane] = legacy[inheritedOutputWeight] ?? 0;
    }
  }
  expanded.set(legacy.subarray(legacyOutputStart), expandedOutputStart);
  return expanded;
}

/**
 * A single non-human intelligence. Born from a seeded {@link Rng} (rolls personality, weaves a
 * Markov voice + a neural gene); decides via {@link think} each beat. Few exist at once, so modest
 * per-decision work is fine — but every routine stays deterministic and the steady-state allocation
 * is only the returned intent's small `utterance` array.
 */
export class NhiMind {
  /** Personality traits, all 0..1, fixed at birth — the "broad psychological traits". */
  readonly narcissism: number;
  readonly aggression: number;
  readonly deceit: number;
  readonly hallucination: number;
  readonly volatility: number;

  private readonly memory = new MemoryRing(MEMORY);
  private readonly voice: MarkovChain;
  private readonly gene: TinyMLP;
  private readonly neuralSemanticInputs: boolean;
  private readonly semanticUtilityInputs: boolean;
  private readonly neuralGeneOutput: boolean;
  private readonly baseUtilityInputs: boolean;
  private readonly goapBias: boolean;
  private readonly rivals = new Map<number, Rival>();
  private readonly cumRegret = new Float32Array(ACTION_COUNT);
  private readonly scores = new Float32Array(ACTION_COUNT);
  /** GOAP world-model facts (4 bits) the NHI accumulates toward {@link NHI_GOAL}. */
  private facts = 0;
  /** Reused result buffer; the allocating planner runs only on first use or a material fact change. */
  private readonly plan = new Int32Array(NHI_PLAN_CAPACITY);
  private readonly geneIn: Float32Array;
  private readonly geneHid: Float32Array;
  private readonly geneOut: Float32Array;
  private readonly policy = new Float64Array(ACTION_COUNT);
  private readonly policyRegret = new Float64Array(ACTION_COUNT);
  private mood = 0; // -1 brooding .. +1 manic
  /** Telemetry/observatory only: the chosen action + current post-outcome GOAP next step. */
  private lastAction = 0;
  private lastPlanned = -1;
  private planDirty = true;
  private policyTemperature = 1;
  private regretMix = 0;
  private selectionMode: NhiSelectionMode = 'uninitialized';

  /** Birth an NHI: roll personality, weave a unique alien voice + intuition gene. Consumes `rng`. */
  constructor(rng: Rng, options: NhiMindOptions = {}) {
    const restoredIdentity = (options as InternalNhiMindOptions)[RESTORED_IDENTITY];
    const hidden = restoredIdentity?.hidden ?? options.geneHidden ?? DEFAULT_GENE_HID;
    if (hidden !== 3 && hidden !== 6 && hidden !== 12) {
      throw new RangeError(`NHI geneHidden must be 3, 6, or 12; received ${String(hidden)}`);
    }
    const neuralSemanticInputs =
      restoredIdentity?.neuralSemanticInputs ?? options.neuralSemanticInputs ?? true;
    if (typeof neuralSemanticInputs !== 'boolean') {
      throw new TypeError('NHI neuralSemanticInputs control must be boolean');
    }
    const semanticUtilityInputs =
      restoredIdentity?.semanticUtilityInputs ?? options.semanticUtilityInputs ?? true;
    const neuralGeneOutput = restoredIdentity?.neuralGeneOutput ?? options.neuralGeneOutput ?? true;
    const baseUtilityInputs =
      restoredIdentity?.baseUtilityInputs ?? options.baseUtilityInputs ?? true;
    const goapBias = restoredIdentity?.goapBias ?? options.goapBias ?? true;
    if (typeof semanticUtilityInputs !== 'boolean') {
      throw new TypeError('NHI semanticUtilityInputs control must be boolean');
    }
    if (typeof neuralGeneOutput !== 'boolean') {
      throw new TypeError('NHI neuralGeneOutput control must be boolean');
    }
    if (typeof baseUtilityInputs !== 'boolean') {
      throw new TypeError('NHI baseUtilityInputs control must be boolean');
    }
    if (typeof goapBias !== 'boolean') {
      throw new TypeError('NHI goapBias control must be boolean');
    }
    this.neuralSemanticInputs = neuralSemanticInputs;
    this.semanticUtilityInputs = semanticUtilityInputs;
    this.neuralGeneOutput = neuralGeneOutput;
    this.baseUtilityInputs = baseUtilityInputs;
    this.goapBias = goapBias;
    if (restoredIdentity) {
      this.narcissism = restoredIdentity.traits.narcissism;
      this.aggression = restoredIdentity.traits.aggression;
      this.deceit = restoredIdentity.traits.deceit;
      this.hallucination = restoredIdentity.traits.hallucination;
      this.volatility = restoredIdentity.traits.volatility;
      this.voice = new MarkovChain(VOICE_STATES, restoredIdentity.voiceWeights.slice());
      this.gene = new TinyMLP(GENE_IN, hidden, GENE_OUT, restoredIdentity.geneWeights.slice());
    } else {
      this.narcissism = rng();
      this.aggression = rng();
      this.deceit = rng();
      this.hallucination = rng();
      this.volatility = rng();
      // Voice: a seeded transition matrix skewed toward a few strong edges → each NHI speaks its own
      // alien dialect (the "unknown bizarre noises").
      const vw = new Float32Array(VOICE_STATES * VOICE_STATES);
      for (let i = 0; i < vw.length; i++) vw[i] = rng() ** 2;
      this.voice = new MarkovChain(VOICE_STATES, vw);
      // Intuition gene: the legacy RNG layout is retained, then expanded deterministically so a
      // default birth consumes the exact same random draws/downstream state as the 5→6→7 version.
      const gw = expandedGeneWeights(rng, hidden);
      this.gene = new TinyMLP(GENE_IN, hidden, GENE_OUT, gw);
    }
    this.geneIn = new Float32Array(GENE_IN);
    this.geneHid = new Float32Array(hidden);
    this.geneOut = new Float32Array(GENE_OUT);
    this.policy.fill(1 / ACTION_COUNT);
  }

  /**
   * Experimental NHI-mind heredity leaf. The child inherits this NHI's intuition gene with point
   * mutation; an optional mate adds uniform crossover before mutation. Fully seeded by `rng`.
   * Production SPAWN_SWARM creates ordinary minions and does not call this API.
   */
  spawnChild(rng: Rng, mate?: NhiMind): NhiMind {
    const child = new NhiMind(rng, {
      geneHidden: this.gene.nHidden as NhiGeneHidden,
      neuralSemanticInputs: this.neuralSemanticInputs,
      semanticUtilityInputs: this.semanticUtilityInputs,
      neuralGeneOutput: this.neuralGeneOutput,
      baseUtilityInputs: this.baseUtilityInputs,
      goapBias: this.goapBias,
    });
    const w = child.gene.weights;
    const mateWeights =
      mate &&
      mate.gene.nIn === this.gene.nIn &&
      mate.gene.nHidden === this.gene.nHidden &&
      mate.gene.nOut === this.gene.nOut
        ? mate.gene.weights
        : undefined;
    for (let i = 0; i < w.length; i++) {
      const a = this.gene.weights[i] ?? 0;
      const inherited = mateWeights ? (rng() < 0.5 ? a : (mateWeights[i] ?? 0)) : a;
      w[i] = inherited + (rng() * 2 - 1) * 0.15; // point mutation
    }
    return child;
  }

  /**
   * The apex decision: given what the NHI perceives, decide what to do TO the world this beat.
   * Pipeline: remember → drift mood → play the iterated game vs the nearest rival → score actions
   * (hand-designed drives blended with the neural gene's vote) → choose with a volatility/chaos-scaled
   * softmax temperature, occasionally overridden by regret-matching for adaptivity → hallucinate an
   * utterance. Deterministic given `rng`.
   */
  think(p: NhiPercept, rng: Rng): NhiIntent {
    // Normalize the complete external boundary before persistent memory, mood, rivals, or regret can
    // consume it. One hostile telemetry sample must never poison all later decisions with NaN/Infinity.
    const energy = unitDrive(p.energy);
    const crowding = unitDrive(p.crowding);
    const chaos = unitDrive(p.chaos);
    const threat = unitDrive(p.threat);
    const nearestRival = rivalId(p.rivalFaction);
    const nearestRivalMove = rivalMove(p.rivalLastMove);
    // 1. Remember + drift mood (narcissism resists fear; chaos/threat tilt toward mania/brooding).
    // USER #7a social: MOOD CONTAGION — nearby kin pull this NHI's mood toward theirs (scaled by how
    // many are near), so a panicked cluster spirals together and a manic one feeds each other's frenzy.
    const kinPresence = unitDrive(p.kinPresence);
    const kinMood = signedDrive(p.kinMood);
    // External corpus telemetry is normalized once, before either causal arm consumes it. This keeps
    // both the neural lanes and hand-written utility routes finite and makes invalid input neutral.
    const corpusResource = unitDrive(p.corpusResource);
    const corpusThreat = unitDrive(p.corpusThreat);
    const corpusSocial = unitDrive(p.corpusSocial);
    const corpusExplore = unitDrive(p.corpusExplore);
    const corpusConfidence = unitDrive(p.corpusConfidence);
    // V122 (USER #3): the REMEMBER step was documented but never written — the MemoryRing was read
    // (mean() below, recent() in snapshot) yet nothing ever pushed, so the MEMORY observatory pane
    // sat at "filling memory…" forever and the mean() mood term was a dead 0. One valence sample per
    // decision beat (energy − threat + a little chaos), exactly as the pane's legend describes.
    this.memory.push(clamp(energy - threat + chaos * 0.2, -1, 1));
    this.mood = clamp(
      this.mood * 0.85 +
        (energy - threat) * 0.3 +
        this.memory.mean() * 0.1 +
        (kinMood - this.mood) * kinPresence * 0.18,
      -1,
      1,
    );

    // 2. Iterated game vs the nearest rival faction: our move + did they betray us?
    let ownMove = 0;
    if (nearestRival >= 0) {
      const rv = this.rivalOf(nearestRival, rng);
      if (nearestRivalMove === 1) rv.everBetrayed = true;
      if (nearestRivalMove >= 0) rv.lastOpp = nearestRivalMove;
      ownMove = iteratedMove(rv.strategy, rv.lastOpp, rv.everBetrayed, rv.round, rng);
      rv.round++;
    }

    // 3. Action utilities: hand-designed drives + the inherited gene's vote.
    this.geneIn[0] = energy;
    this.geneIn[1] = threat;
    this.geneIn[2] = crowding;
    this.geneIn[3] = chaos;
    this.geneIn[4] = this.mood;
    // Independently ablatable neural path. The hand-written semantic utility terms below remain
    // active in both arms, isolating neural semantic causality from the broader hybrid policy.
    this.geneIn[5] = this.neuralSemanticInputs ? corpusResource : 0;
    this.geneIn[6] = this.neuralSemanticInputs ? corpusThreat : 0;
    this.geneIn[7] = this.neuralSemanticInputs ? corpusExplore : 0;
    this.geneIn[8] = this.neuralSemanticInputs ? corpusSocial : 0;
    this.gene.forward(this.geneIn, this.geneHid, this.geneOut);
    const s = this.scores;
    const g = this.geneOut;
    const baseGain = this.baseUtilityInputs ? 1 : 0;
    const semanticGain = this.semanticUtilityInputs ? 1 : 0;
    const geneGain = this.neuralGeneOutput ? 0.5 : 0;
    s[NhiAction.MANIPULATE] =
      baseGain * (this.deceit * 1.2 + (nearestRival >= 0 ? 0.5 : -1)) +
      (g[NhiAction.MANIPULATE] ?? 0) * geneGain;
    s[NhiAction.DOMINATE] =
      baseGain * (this.aggression + energy * 0.8 - threat * 0.5) +
      (g[NhiAction.DOMINATE] ?? 0) * geneGain;
    // SPAWN is GOAP-useful but material births are CPU-expensive — bias it down vs hunt/broadcast.
    s[NhiAction.SPAWN_SWARM] =
      baseGain * (energy * 0.7 - crowding * 1.2 + this.narcissism * 0.35 - 0.35) +
      (g[NhiAction.SPAWN_SWARM] ?? 0) * geneGain * 0.65;
    s[NhiAction.BROADCAST] =
      baseGain * (this.hallucination + this.narcissism * 0.7 + chaos * 0.5) +
      (g[NhiAction.BROADCAST] ?? 0) * geneGain;
    s[NhiAction.MIMIC] =
      baseGain * (this.deceit * 0.6 + threat * 0.7) + (g[NhiAction.MIMIC] ?? 0) * geneGain;
    s[NhiAction.HUNT] =
      baseGain * ((1 - energy) * 1.1 + this.aggression * 0.5) +
      semanticGain * corpusResource * 0.35 +
      (g[NhiAction.HUNT] ?? 0) * geneGain;
    s[NhiAction.RETREAT] =
      baseGain * (threat * 1.4 - energy * 0.6) +
      semanticGain * corpusThreat * 0.3 +
      (g[NhiAction.RETREAT] ?? 0) * geneGain;

    // 3a-social (USER #7a): kin nearby → the NHI BREEDS + BROADCASTS to the pack and holds ground
    // (safety in numbers); ISOLATED → it turns inward and schemes/hunts alone. Deterministic utility
    // nudges (no rng), so nearby minds shape each other's choices — the social layer is WIRED, not audio-only.
    const isolation = 1 - kinPresence;
    s[NhiAction.SPAWN_SWARM] = (s[NhiAction.SPAWN_SWARM] ?? 0) + baseGain * kinPresence * 0.18;
    s[NhiAction.BROADCAST] = (s[NhiAction.BROADCAST] ?? 0) + baseGain * kinPresence * 0.4;
    s[NhiAction.RETREAT] = (s[NhiAction.RETREAT] ?? 0) - baseGain * kinPresence * 0.4;
    s[NhiAction.MANIPULATE] = (s[NhiAction.MANIPULATE] ?? 0) + baseGain * isolation * 0.3;
    s[NhiAction.HUNT] = (s[NhiAction.HUNT] ?? 0) + baseGain * isolation * 0.25;
    s[NhiAction.SPAWN_SWARM] = (s[NhiAction.SPAWN_SWARM] ?? 0) + semanticGain * corpusSocial * 0.24;
    s[NhiAction.BROADCAST] = (s[NhiAction.BROADCAST] ?? 0) + semanticGain * corpusSocial * 0.2;
    s[NhiAction.MIMIC] = (s[NhiAction.MIMIC] ?? 0) + semanticGain * corpusExplore * 0.18;

    // 3b. GOAP computes a cheapest next step and biases its utility. The hybrid stochastic policy may
    //     still diverge; material fact acknowledgements enforce the declared action preconditions.
    const planned = this.planDirty ? this.refreshPlannedAction() : this.lastPlanned;
    if (this.goapBias && planned >= 0) s[planned] = (s[planned] ?? 0) + 1.0;

    // 4. Choose: volatility + chaos raise the softmax temperature → wild, unpredictable picks; a calm,
    //    confident NHI is near-greedy. Occasionally regret-matching overrides for adaptivity.
    const temp =
      0.2 +
      (this.volatility * 0.8 + chaos * 0.6 + semanticGain * corpusExplore * 0.12) *
        (1.5 - semanticGain * corpusConfidence * 0.12);
    const regretMix = clamp(0.15 + this.volatility * 0.2, 0, 1);
    let maxScore = -Infinity;
    let positiveRegret = 0;
    for (let i = 0; i < ACTION_COUNT; i++) {
      this.policyRegret[i] = this.cumRegret[i] ?? 0;
      maxScore = Math.max(maxScore, s[i] ?? -Infinity);
      positiveRegret += Math.max(0, this.policyRegret[i] ?? 0);
    }
    let softmaxTotal = 0;
    for (let i = 0; i < ACTION_COUNT; i++) {
      const weight = Math.exp(((s[i] ?? -Infinity) - maxScore) / Math.max(1e-6, temp));
      this.policy[i] = weight;
      softmaxTotal += weight;
    }
    for (let i = 0; i < ACTION_COUNT; i++) {
      const softmaxProbability = (this.policy[i] ?? 0) / softmaxTotal;
      const regretProbability =
        positiveRegret > 0
          ? Math.max(0, this.policyRegret[i] ?? 0) / positiveRegret
          : 1 / ACTION_COUNT;
      this.policy[i] = (1 - regretMix) * softmaxProbability + regretMix * regretProbability;
    }
    this.policyTemperature = temp;
    this.regretMix = regretMix;
    const useRegret = rng() < regretMix;
    this.selectionMode = useRegret
      ? positiveRegret > 0
        ? 'regret-positive'
        : 'regret-uniform'
      : 'softmax';
    let action = useRegret
      ? regretMatch(this.policyRegret, ACTION_COUNT, rng)
      : softmaxPick(s, rng, temp);
    if (action < 0) action = utilityPick(s);
    this.lastAction = action;
    // Counterfactual regret compares every available action with what was actually sampled. Comparing
    // against the greedy maximum would make every increment non-positive and permanently force
    // regretMatch() into its uniform-fallback branch.
    const sampledUtility = s[action] ?? 0;
    for (let i = 0; i < ACTION_COUNT; i++) {
      this.cumRegret[i] = (this.cumRegret[i] ?? 0) * 0.97 + ((s[i] ?? 0) - sampledUtility) * 0.1;
    }

    // 5. Hallucinated utterance — a Markov walk whose length scales with hallucination + chaos.
    const len = 2 + Math.floor((this.hallucination + chaos) * 4);
    const utterance: number[] = [];
    let st = Math.min(VOICE_STATES - 1, Math.floor((this.mood + 1) * 0.5 * VOICE_STATES));
    for (let i = 0; i < len; i++) {
      st = this.voice.next(st, rng);
      utterance.push(st);
    }

    const magnitude = clamp(0.3 + this.aggression * 0.4 + chaos * 0.3 + this.mood * 0.2, 0, 1);
    // One child per intent — World also cooldowns + hard-caps material births.
    const spawn =
      action === NhiAction.SPAWN_SWARM
        ? Math.max(
            1,
            Math.min(1, Math.round((0.5 + this.narcissism * 0.8 + energy * 0.5) * magnitude)),
          )
        : 0;

    return {
      action: action as NhiActionId,
      target: action === NhiAction.MANIPULATE ? nearestRival : -1,
      magnitude,
      spawn,
      utterance,
      ownMove,
    };
  }

  /**
   * Advance the GOAP world model only after the composition root supplies material fact evidence.
   * Returns whether the internal fact state actually transitioned; repeated evidence and unmet GOAP
   * preconditions can legitimately return false. Sampling an intent is never evidence by itself.
   */
  acknowledge(action: NhiActionId, factSupported: boolean): boolean {
    if (!Number.isSafeInteger(action) || action < 0 || action >= ACTION_COUNT) {
      throw new RangeError(`NHI acknowledgement action is invalid: ${String(action)}`);
    }
    if (typeof factSupported !== 'boolean') {
      throw new TypeError('NHI factSupported acknowledgement must be boolean');
    }
    if (!factSupported) return false;
    const priorFacts = this.facts;
    if (action === NhiAction.SPAWN_SWARM) this.facts |= F_SWARMED;
    else if (action === NhiAction.MANIPULATE) this.facts |= F_DECEIVED;
    else if (action === NhiAction.DOMINATE && (this.facts & F_SWARMED) !== 0) {
      this.facts |= F_DOMINANT;
    } else if (action === NhiAction.HUNT) this.facts |= F_FED;
    if ((this.facts & NHI_GOAL) === NHI_GOAL) this.facts = 0;
    if (this.facts !== priorFacts || this.planDirty) this.refreshPlannedAction();
    return this.facts !== priorFacts;
  }

  /** Recompute observatory plan telemetry from the current materially acknowledged world model. */
  private refreshPlannedAction(): number {
    const steps = goapPlan(this.facts, NHI_GOAL, NHI_GOAP, this.plan);
    this.lastPlanned = steps > 0 ? (NHI_PLAN_ACTION[this.plan[0] ?? 0] ?? -1) : -1;
    this.planDirty = false;
    return this.lastPlanned;
  }

  /** Current bounded affect for allocation-free same-frame social sensing. */
  moodValue(): number {
    return this.mood;
  }

  /**
   * Capture every identity and cognition variable required for exact continuation when the caller
   * resumes the same decision-RNG state. The RNG is external and intentionally not serialized here.
   */
  stateSnapshot(): NhiMindStateSnapshot {
    const memory: number[] = [];
    for (let k = this.memory.size - 1; k >= 0; k--) memory.push(this.memory.recent(k) ?? 0);
    const rivals = Array.from(this.rivals.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, rival]) => ({ id, ...rival }));
    return {
      version: NHI_STATE_VERSION,
      identity: {
        traits: {
          narcissism: this.narcissism,
          aggression: this.aggression,
          deceit: this.deceit,
          hallucination: this.hallucination,
          volatility: this.volatility,
        },
        controls: {
          neuralSemanticInputs: this.neuralSemanticInputs,
          semanticUtilityInputs: this.semanticUtilityInputs,
          neuralGeneOutput: this.neuralGeneOutput,
          baseUtilityInputs: this.baseUtilityInputs,
          goapBias: this.goapBias,
        },
        dims: { in: GENE_IN, hid: this.gene.nHidden as NhiGeneHidden, out: GENE_OUT },
        voiceWeights: Array.from(this.voice.weights),
        geneWeights: Array.from(this.gene.weights),
      },
      cognition: {
        mood: this.mood,
        memory,
        rivals,
        regret: Array.from(this.cumRegret),
        scores: Array.from(this.scores),
        sensory: Array.from(this.geneIn),
        hidden: Array.from(this.geneHid),
        output: Array.from(this.geneOut),
        policy: Array.from(this.policy),
        policyRegret: Array.from(this.policyRegret),
        policyTemperature: this.policyTemperature,
        regretMix: this.regretMix,
        selectionMode: this.selectionMode,
        facts: this.facts,
        plan: Array.from(this.plan),
        planDirty: this.planDirty,
        plannedAction: this.lastPlanned,
        lastAction: this.lastAction,
      },
    };
  }

  /** Build an exact identity + cognition clone without consuming a birth RNG draw. */
  static fromState(snapshot: NhiMindStateSnapshot): NhiMind {
    const validated = validateNhiState(snapshot);
    const noBirthRng: Rng = () => {
      throw new Error('restoring an NHI state must not consume birth RNG');
    };
    const options: InternalNhiMindOptions = { [RESTORED_IDENTITY]: validated.identity };
    const mind = new NhiMind(noBirthRng, options);
    mind.applyValidatedState(validated);
    return mind;
  }

  /**
   * Restore cognition into the same immutable identity. Validation is complete before any mutation,
   * so malformed or cross-identity checkpoints leave the target untouched.
   */
  restoreState(snapshot: NhiMindStateSnapshot): void {
    const validated = validateNhiState(snapshot);
    const identity = validated.identity;
    if (
      identity.traits.narcissism !== this.narcissism ||
      identity.traits.aggression !== this.aggression ||
      identity.traits.deceit !== this.deceit ||
      identity.traits.hallucination !== this.hallucination ||
      identity.traits.volatility !== this.volatility ||
      identity.neuralSemanticInputs !== this.neuralSemanticInputs ||
      identity.semanticUtilityInputs !== this.semanticUtilityInputs ||
      identity.neuralGeneOutput !== this.neuralGeneOutput ||
      identity.baseUtilityInputs !== this.baseUtilityInputs ||
      identity.goapBias !== this.goapBias ||
      identity.hidden !== this.gene.nHidden
    ) {
      throw new Error('NHI state immutable identity mismatch');
    }
    exactArray(identity.voiceWeights, this.voice.weights, 'immutable voice identity');
    exactArray(identity.geneWeights, this.gene.weights, 'immutable gene identity');
    this.applyValidatedState(validated);
  }

  private applyValidatedState(state: ValidatedNhiState): void {
    this.mood = state.mood;
    this.memory.clear();
    for (const value of state.memory) this.memory.push(value);
    this.rivals.clear();
    for (const rival of state.rivals) {
      this.rivals.set(rival.id, {
        strategy: rival.strategy,
        everBetrayed: rival.everBetrayed,
        lastOpp: rival.lastOpp,
        round: rival.round,
      });
    }
    this.cumRegret.set(state.regret);
    this.scores.set(state.scores);
    this.geneIn.set(state.sensory);
    this.geneHid.set(state.hidden);
    this.geneOut.set(state.output);
    this.policy.set(state.policy);
    this.policyRegret.set(state.policyRegret);
    this.policyTemperature = state.policyTemperature;
    this.regretMix = state.regretMix;
    this.selectionMode = state.selectionMode;
    this.facts = state.facts;
    this.plan.set(state.plan);
    this.planDirty = state.planDirty;
    this.lastPlanned = state.plannedAction;
    this.lastAction = state.lastAction;
  }

  /**
   * Read-only snapshot of the live cognitive state for the Observatory's 3×3 grid. Allocates a few
   * small arrays per call — fine, as it runs on a slow cadence for one focused NHI, never in the hot
   * decision path. Memory is returned oldest→newest so the timeline reads left-to-right.
   */
  snapshot(): NhiSnapshot {
    const mem: number[] = [];
    for (let k = this.memory.size - 1; k >= 0; k--) mem.push(this.memory.recent(k) ?? 0);
    return {
      traits: {
        narcissism: this.narcissism,
        aggression: this.aggression,
        deceit: this.deceit,
        hallucination: this.hallucination,
        volatility: this.volatility,
      },
      mood: this.mood,
      sensory: Array.from(this.geneIn),
      hidden: Array.from(this.geneHid),
      output: Array.from(this.geneOut),
      scores: Array.from(this.scores),
      policy: Array.from(this.policy),
      policyRegret: Array.from(this.policyRegret),
      policyTemperature: this.policyTemperature,
      regretMix: this.regretMix,
      selectionMode: this.selectionMode,
      regret: Array.from(this.cumRegret),
      memory: mem,
      weights: Array.from(this.gene.weights),
      dims: { in: this.gene.nIn, hid: this.gene.nHidden, out: this.gene.nOut },
      neuralSemanticInputs: this.neuralSemanticInputs,
      semanticUtilityInputs: this.semanticUtilityInputs,
      neuralGeneOutput: this.neuralGeneOutput,
      baseUtilityInputs: this.baseUtilityInputs,
      goapBias: this.goapBias,
      facts: this.facts,
      plannedAction: this.lastPlanned,
      lastAction: this.lastAction,
      rivalCount: this.rivals.size,
    };
  }

  /** Lazily assign a repeated-game persona to a newly-met faction (deterministic from traits + rng). */
  private rivalOf(id: number, rng: Rng): Rival {
    let rv = this.rivals.get(id);
    if (!rv) {
      const roll = rng();
      const strategy =
        this.deceit > 0.7
          ? GameStrategy.PROBER
          : roll < 0.2
            ? GameStrategy.GRUDGER
            : roll < 0.5
              ? GameStrategy.TIT_FOR_TAT
              : roll < 0.75
                ? GameStrategy.GENEROUS_TFT
                : this.aggression > 0.6
                  ? GameStrategy.ALWAYS_DEFECT
                  : GameStrategy.TIT_FOR_TAT;
      rv = { strategy, everBetrayed: false, lastOpp: -1, round: 0 };
      this.rivals.set(id, rv);
    }
    return rv;
  }
}
