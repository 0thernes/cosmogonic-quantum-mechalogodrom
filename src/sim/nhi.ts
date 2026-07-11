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
  lastOpp: number;
  round: number;
}

const VOICE_STATES = 12; // alien glyph alphabet size
const MEMORY = 16;
const LEGACY_GENE_IN = 5;
const GENE_IN = 9;
const DEFAULT_GENE_HID = 6;
const GENE_OUT = ACTION_COUNT;

/** Supported NHI intuition-gene capacities. The default remains the historical six hidden units. */
export type NhiGeneHidden = 3 | 6 | 12;

/** Birth-time controls used by causal/scaling experiments without changing ordinary runtime calls. */
export interface NhiMindOptions {
  /** Hidden-unit capacity: 3/6/12 produce 58/109/211 live weights respectively. */
  geneHidden?: NhiGeneHidden;
  /** Ablates only corpus-to-neural inputs; existing corpus-to-utility routes remain operational. */
  neuralSemanticInputs?: boolean;
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
  private readonly rivals = new Map<number, Rival>();
  private readonly cumRegret = new Float32Array(ACTION_COUNT);
  private readonly scores = new Float32Array(ACTION_COUNT);
  /** GOAP world-model facts (4 bits) the NHI accumulates toward {@link NHI_GOAL}. */
  private facts = 0;
  /** Reused result buffer; the allocating planner runs only on first use or a material fact change. */
  private readonly plan = new Int32Array(8);
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
    const hidden = options.geneHidden ?? DEFAULT_GENE_HID;
    if (hidden !== 3 && hidden !== 6 && hidden !== 12) {
      throw new RangeError(`NHI geneHidden must be 3, 6, or 12; received ${String(hidden)}`);
    }
    const neuralSemanticInputs = options.neuralSemanticInputs ?? true;
    if (typeof neuralSemanticInputs !== 'boolean') {
      throw new TypeError('NHI neuralSemanticInputs control must be boolean');
    }
    this.neuralSemanticInputs = neuralSemanticInputs;
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
    s[NhiAction.MANIPULATE] =
      this.deceit * 1.2 + (nearestRival >= 0 ? 0.5 : -1) + (g[NhiAction.MANIPULATE] ?? 0) * 0.5;
    s[NhiAction.DOMINATE] =
      this.aggression + energy * 0.8 - threat * 0.5 + (g[NhiAction.DOMINATE] ?? 0) * 0.5;
    s[NhiAction.SPAWN_SWARM] =
      energy * 1.3 - crowding * 0.9 + this.narcissism * 0.6 + (g[NhiAction.SPAWN_SWARM] ?? 0) * 0.5;
    s[NhiAction.BROADCAST] =
      this.hallucination +
      this.narcissism * 0.7 +
      chaos * 0.5 +
      (g[NhiAction.BROADCAST] ?? 0) * 0.5;
    s[NhiAction.MIMIC] = this.deceit * 0.6 + threat * 0.7 + (g[NhiAction.MIMIC] ?? 0) * 0.5;
    s[NhiAction.HUNT] =
      (1 - energy) * 1.1 +
      this.aggression * 0.5 +
      corpusResource * 0.35 +
      (g[NhiAction.HUNT] ?? 0) * 0.5;
    s[NhiAction.RETREAT] =
      threat * 1.4 - energy * 0.6 + corpusThreat * 0.3 + (g[NhiAction.RETREAT] ?? 0) * 0.5;

    // 3a-social (USER #7a): kin nearby → the NHI BREEDS + BROADCASTS to the pack and holds ground
    // (safety in numbers); ISOLATED → it turns inward and schemes/hunts alone. Deterministic utility
    // nudges (no rng), so nearby minds shape each other's choices — the social layer is WIRED, not audio-only.
    const isolation = 1 - kinPresence;
    s[NhiAction.SPAWN_SWARM] = (s[NhiAction.SPAWN_SWARM] ?? 0) + kinPresence * 0.5;
    s[NhiAction.BROADCAST] = (s[NhiAction.BROADCAST] ?? 0) + kinPresence * 0.4;
    s[NhiAction.RETREAT] = (s[NhiAction.RETREAT] ?? 0) - kinPresence * 0.4;
    s[NhiAction.MANIPULATE] = (s[NhiAction.MANIPULATE] ?? 0) + isolation * 0.3;
    s[NhiAction.HUNT] = (s[NhiAction.HUNT] ?? 0) + isolation * 0.25;
    s[NhiAction.SPAWN_SWARM] = (s[NhiAction.SPAWN_SWARM] ?? 0) + corpusSocial * 0.24;
    s[NhiAction.BROADCAST] = (s[NhiAction.BROADCAST] ?? 0) + corpusSocial * 0.2;
    s[NhiAction.MIMIC] = (s[NhiAction.MIMIC] ?? 0) + corpusExplore * 0.18;

    // 3b. GOAP computes a cheapest next step and biases its utility. The hybrid stochastic policy may
    //     still diverge; material fact acknowledgements enforce the declared action preconditions.
    const planned = this.planDirty ? this.refreshPlannedAction() : this.lastPlanned;
    if (planned >= 0) s[planned] = (s[planned] ?? 0) + 1.0;

    // 4. Choose: volatility + chaos raise the softmax temperature → wild, unpredictable picks; a calm,
    //    confident NHI is near-greedy. Occasionally regret-matching overrides for adaptivity.
    const temp =
      0.2 +
      (this.volatility * 0.8 + chaos * 0.6 + corpusExplore * 0.12) *
        (1.5 - corpusConfidence * 0.12);
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
    const spawn =
      action === NhiAction.SPAWN_SWARM
        ? Math.max(1, Math.round((1 + this.narcissism * 5 + energy * 4) * magnitude))
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
   * Advance the GOAP world model only after the composition root confirms a material action outcome.
   * Sampling an intent is not achievement: capacity limits, no target, or a full/empty energy balance
   * can make SPAWN/MANIPULATE/DOMINATE/HUNT fail without setting their corresponding fact.
   */
  acknowledge(action: NhiActionId, factAchieved: boolean): void {
    if (!Number.isSafeInteger(action) || action < 0 || action >= ACTION_COUNT) {
      throw new RangeError(`NHI acknowledgement action is invalid: ${String(action)}`);
    }
    if (typeof factAchieved !== 'boolean') {
      throw new TypeError('NHI factAchieved acknowledgement must be boolean');
    }
    if (!factAchieved) return;
    const priorFacts = this.facts;
    if (action === NhiAction.SPAWN_SWARM) this.facts |= F_SWARMED;
    else if (action === NhiAction.MANIPULATE) this.facts |= F_DECEIVED;
    else if (action === NhiAction.DOMINATE && (this.facts & F_SWARMED) !== 0) {
      this.facts |= F_DOMINANT;
    } else if (action === NhiAction.HUNT) this.facts |= F_FED;
    if ((this.facts & NHI_GOAL) === NHI_GOAL) this.facts = 0;
    if (this.facts !== priorFacts || this.planDirty) this.refreshPlannedAction();
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
