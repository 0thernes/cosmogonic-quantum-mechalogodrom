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
 * onto an actual sim effect (faction manipulation, swarm spawn, behaviour-field perturbation,
 * utterance toast/SFX); the renderer gives the NHI its alien, morphing body. This fixes the audit's
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
} from './ai/brains';

/** What an NHI decides to do this beat. The integrator turns each into an actual world effect. */
export const NhiAction = {
  /** Whisper false goals into a rival faction (belief-state manipulation / gaslighting). */
  MANIPULATE: 0,
  /** Assert dominance over the local region (warps nearby behaviour toward the NHI). */
  DOMINATE: 1,
  /** Release a mutated mini-swarm of offspring. */
  SPAWN_SWARM: 2,
  /** Broadcast a hallucinated utterance (alien toast + bizarre SFX). */
  BROADCAST: 3,
  /** Mimic the nearest order (shoggoth/titan/organism) — camouflage + identity theft. */
  MIMIC: 4,
  /** Hunt — converge on prey/energy. */
  HUNT: 5,
  /** Retreat and brood (rebuild energy, nurse grudges). */
  RETREAT: 6,
} as const;
export type NhiActionId = (typeof NhiAction)[keyof typeof NhiAction];
const ACTION_COUNT = 7;

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
}

/** The NHI's decision for this beat — pure data the integrator executes. */
export interface NhiIntent {
  action: NhiActionId;
  /** Faction targeted by MANIPULATE, else -1. */
  target: number;
  /** Effect strength 0..1 — spawn size, perturbation gain, toast urgency. */
  magnitude: number;
  /** Offspring released on SPAWN_SWARM (0 otherwise). */
  spawn: number;
  /** Hallucinated glyph sequence — indices into the integrator's alien-voice alphabet. */
  utterance: number[];
  /** The NHI's own move toward the rival this beat: 0 = cooperate, 1 = defect (for the integrator). */
  ownMove: number;
}

/** Per-rival bookkeeping for the iterated game (one persona per faction the NHI has met). */
interface Rival {
  strategy: number;
  everBetrayed: boolean;
  lastOpp: number;
  round: number;
}

const VOICE_STATES = 12; // alien glyph alphabet size
const MEMORY = 16;
const GENE_IN = 5;
const GENE_HID = 6;
const GENE_OUT = ACTION_COUNT;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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
  private readonly rivals = new Map<number, Rival>();
  private readonly cumRegret = new Float32Array(ACTION_COUNT);
  private readonly scores = new Float32Array(ACTION_COUNT);
  private readonly geneIn = new Float32Array(GENE_IN);
  private readonly geneHid = new Float32Array(GENE_HID);
  private readonly geneOut = new Float32Array(GENE_OUT);
  private mood = 0; // -1 brooding .. +1 manic

  /** Birth an NHI: roll personality, weave a unique alien voice + intuition gene. Consumes `rng`. */
  constructor(rng: Rng) {
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
    // Intuition gene: a tiny MLP mapping percept → action bias. Inheritable + mutatable (offspring).
    const gw = new Float32Array(TinyMLP.weightCount(GENE_IN, GENE_HID, GENE_OUT));
    for (let i = 0; i < gw.length; i++) gw[i] = rng() * 2 - 1;
    this.gene = new TinyMLP(GENE_IN, GENE_HID, GENE_OUT, gw);
  }

  /** Mutated offspring for SPAWN_SWARM: a fresh NHI whose gene is this one's, jittered. Seeded. */
  spawnChild(rng: Rng): NhiMind {
    const child = new NhiMind(rng);
    for (let i = 0; i < child.gene.weights.length; i++) {
      child.gene.weights[i] = (this.gene.weights[i] ?? 0) + (rng() * 2 - 1) * 0.15;
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
    // 1. Remember + drift mood (narcissism resists fear; chaos/threat tilt toward mania/brooding).
    this.memory.push(p.energy - p.threat + p.chaos * 0.5);
    this.mood = clamp(
      this.mood * 0.85 + (p.energy - p.threat) * 0.3 + this.memory.mean() * 0.1,
      -1,
      1,
    );

    // 2. Iterated game vs the nearest rival faction: our move + did they betray us?
    let ownMove = 0;
    if (p.rivalFaction >= 0) {
      const rv = this.rivalOf(p.rivalFaction, rng);
      if (p.rivalLastMove === 1) rv.everBetrayed = true;
      if (p.rivalLastMove >= 0) rv.lastOpp = p.rivalLastMove;
      ownMove = iteratedMove(rv.strategy, rv.lastOpp, rv.everBetrayed, rv.round, rng);
      rv.round++;
    }

    // 3. Action utilities: hand-designed drives + the inherited gene's vote.
    this.geneIn[0] = p.energy;
    this.geneIn[1] = p.threat;
    this.geneIn[2] = p.crowding;
    this.geneIn[3] = p.chaos;
    this.geneIn[4] = this.mood;
    this.gene.forward(this.geneIn, this.geneHid, this.geneOut);
    const s = this.scores;
    const g = this.geneOut;
    s[NhiAction.MANIPULATE] =
      this.deceit * 1.2 + (p.rivalFaction >= 0 ? 0.5 : -1) + (g[NhiAction.MANIPULATE] ?? 0) * 0.5;
    s[NhiAction.DOMINATE] =
      this.aggression + p.energy * 0.8 - p.threat * 0.5 + (g[NhiAction.DOMINATE] ?? 0) * 0.5;
    s[NhiAction.SPAWN_SWARM] =
      p.energy * 1.3 -
      p.crowding * 0.9 +
      this.narcissism * 0.6 +
      (g[NhiAction.SPAWN_SWARM] ?? 0) * 0.5;
    s[NhiAction.BROADCAST] =
      this.hallucination +
      this.narcissism * 0.7 +
      p.chaos * 0.5 +
      (g[NhiAction.BROADCAST] ?? 0) * 0.5;
    s[NhiAction.MIMIC] = this.deceit * 0.6 + p.threat * 0.7 + (g[NhiAction.MIMIC] ?? 0) * 0.5;
    s[NhiAction.HUNT] =
      (1 - p.energy) * 1.1 + this.aggression * 0.5 + (g[NhiAction.HUNT] ?? 0) * 0.5;
    s[NhiAction.RETREAT] = p.threat * 1.4 - p.energy * 0.6 + (g[NhiAction.RETREAT] ?? 0) * 0.5;

    // 4. Choose: volatility + chaos raise the softmax temperature → wild, unpredictable picks; a calm,
    //    confident NHI is near-greedy. Occasionally regret-matching overrides for adaptivity.
    const temp = 0.2 + (this.volatility * 0.8 + p.chaos * 0.6) * 1.5;
    let action =
      rng() < 0.15 + this.volatility * 0.2
        ? regretMatch(this.cumRegret, ACTION_COUNT, rng)
        : softmaxPick(s, rng, temp);
    if (action < 0) action = utilityPick(s);
    // Online regret update toward the greedy action (cheap, decaying).
    const greedy = utilityPick(s);
    const sg = s[greedy] ?? 0;
    for (let i = 0; i < ACTION_COUNT; i++) {
      this.cumRegret[i] = (this.cumRegret[i] ?? 0) * 0.97 + ((s[i] ?? 0) - sg) * 0.1;
    }

    // 5. Hallucinated utterance — a Markov walk whose length scales with hallucination + chaos.
    const len = 2 + Math.floor((this.hallucination + p.chaos) * 4);
    const utterance: number[] = [];
    let st = Math.min(VOICE_STATES - 1, Math.floor((this.mood + 1) * 0.5 * VOICE_STATES));
    for (let i = 0; i < len; i++) {
      st = this.voice.next(st, rng);
      utterance.push(st);
    }

    const magnitude = clamp(0.3 + this.aggression * 0.4 + p.chaos * 0.3 + this.mood * 0.2, 0, 1);
    const spawn =
      action === NhiAction.SPAWN_SWARM
        ? Math.max(1, Math.round((1 + this.narcissism * 5 + p.energy * 4) * magnitude))
        : 0;

    return {
      action: action as NhiActionId,
      target: action === NhiAction.MANIPULATE ? p.rivalFaction : -1,
      magnitude,
      spawn,
      utterance,
      ownMove,
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
