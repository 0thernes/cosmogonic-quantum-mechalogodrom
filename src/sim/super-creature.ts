/**
 * THE SUPER CREATURES (5 Archons / pantheon, GOAL5) + legacy spine — apex minds of the Mechalogodrom (V31+).
 *
 * One unique being is always active: **half the size of a Titan but ~100× its power**, driven by a
 * genuine **deep neural mind** an order of magnitude larger than an NHI's tiny intuition gene. Where a
 * normal creature carries a 50–150-parameter controller and an NHI a single-hidden-layer gene, the
 * Super Creature thinks through a **stacked two-stage network** — a CORTEX that compresses 18 percepts
 * into a 16-dim world-model latent, then an ACTOR that maps that latent to 8 motor/social drives. That
 * is a true 4-layer net (18→32→16→12→8) of **1444 parameters**, inside the briefed 1000–1500 band.
 *
 * On top of the network sit the faculties the brief names: an **emotion-like state** (valence /
 * arousal / dominance, each an EMA of real signals), **episodic memory** (a salience ring), a
 * **prediction loop** (a forecast of next-beat salience; the gap is felt as SURPRISE and feeds back as
 * arousal), **GOAP-style planning** (a goal is chosen each beat from the drive scores), and
 * **self-replication** — when sated and dominant it births up to **3 mutated twins**.
 *
 * The cortex+actor are FROZEN (rolled once, only mutated on spawn), but the prediction loop can LEARN:
 * {@link SuperCreature.enableLearning} lights a real online world-model — a 18→8→1 MLP trained by exact
 * reverse-mode Eshkol-AD backprop ({@link ./ad-mlp}) — that forecasts salience, corrects itself every
 * beat, and takes over the surprise signal. It is the one part of the apex mind that grows during life;
 * its error provably falls (tests/super-creature-learning.test.ts). The world lights it on the live
 * apex archons; it is OFF by default, so the frozen baseline is byte-identical.
 *
 * Everything is deterministic: weights are rolled from an injected {@link Rng}, twin mutation draws from
 * the same seeded stream, and the world-model is seeded from a SEPARATE identity-derived substream +
 * trained by pure exact AD (no rng) — so a seed reproduces the Super Creature's entire psychological
 * arc. No `Math.random` / `Date.now`. (Contract rule 7.) `think` is allocation-free in the frozen
 * baseline; with learning lit it makes small bounded per-beat AD-tape allocations (the live apex only).
 *
 * This module is the SPINE; the masterful morphing many-eyed BODY + 4K shader that renders it hang off
 * {@link SuperCreature.snapshot} in later increments. See [[reliquary-surface-state]] and ENTITY-SHEETS.
 *
 * ============================================================================
 * NOT SENTIENT DISCLAIMER (binding per MODULE-CONTRACTS-2026-06-26.md + masters)
 * NOT SENTIENT. This is a deterministic mathematical model / functional correlate only.
 * No phenomenal consciousness or sentience is implemented or claimed here or in callers.
 * Phenomenal consciousness ~1/10 (contract); hard problem untouched. All "mind"/"plan"/"emotion"
 * terms describe explicit EMA/argmax/numeric mechanisms. See docs/SUPER-CREATURE-RESEARCH-2026-06-26.md
 * ============================================================================
 */

import type { Rng } from '../math/rng';
import { mulberry32, hashSeed } from '../math/rng';
import { TinyMLP, MemoryRing } from './ai/brains';
import { createMlp, mlpPredict, mlpTrainStep, type Mlp } from './ad-mlp';

/** Network shape — chosen so the total parameter count lands inside the briefed 1000–1500 band. */
const SENSE = 18; // perception inputs
const CORTEX_HID = 32; // cortex hidden width
const LATENT = 16; // world-model embedding width
const ACTOR_HID = 12; // actor hidden width
const ACT = 8; // motor/social drives

/** Parameter budget: cortex (18→32→16) + actor (16→12→8). Asserted in tests to stay in [1000,1500]. */
export const SUPER_PARAM_COUNT =
  TinyMLP.weightCount(SENSE, CORTEX_HID, LATENT) + TinyMLP.weightCount(LATENT, ACTOR_HID, ACT);

/**
 * Online world-model shape (18→8→1). The cortex+actor above are FROZEN (rolled once, only ever mutated
 * on spawn); this extra head is the one part of the apex mind that genuinely LEARNS during its life —
 * a real MLP trained by exact reverse-mode Eshkol-AD backprop ({@link ./ad-mlp}) to forecast next-beat
 * salience, correcting itself every beat. Off by default (byte-identical to the frozen baseline); the
 * world lights it on the live apex archons via {@link SuperCreature.enableLearning}.
 */
const WM_HID = 8; // world-model hidden width
const WM_LR = 0.05; // default gradient-descent step for the online world-model
const WM_TAU = 0.05; // EMA smoothing for the learned prediction-error telemetry
/** Total learnable params the online world-model adds when lit: (SENSE·h + h) + (h·1 + 1). */
export const SUPER_WORLDMODEL_PARAMS = SENSE * WM_HID + WM_HID + (WM_HID * 1 + 1);

/**
 * Online VALUE head (18→6→1). A second learned net that forecasts the creature's OWN next-beat energy
 * (survival value). When lit, a predicted energy DROP raises "survival urgency" that biases the GOAP
 * planner toward feeding/conserving and away from risky wandering — reactive instinct becomes learned,
 * goal-directed value. Off by default (byte-identical). Trained by the same exact Eshkol-AD backprop.
 */
const VALUE_HID = 6; // value-head hidden width
const THREAT_HID = 6; // dread-head hidden width
/** Total learnable params the value head adds when lit: (SENSE·h + h) + (h·1 + 1). */
export const SUPER_VALUE_PARAMS = SENSE * VALUE_HID + VALUE_HID + (VALUE_HID * 1 + 1);
/** Total learnable params the dread (threat-anticipation) head adds when lit — same 18→h→1 shape. */
export const SUPER_THREAT_PARAMS = SENSE * THREAT_HID + THREAT_HID + (THREAT_HID * 1 + 1);
const SOCIAL_HID = 6; // social (rival-anticipation) head hidden width
/** Total learnable params the social head adds when lit — same 18→h→1 shape. */
export const SUPER_SOCIAL_PARAMS = SENSE * SOCIAL_HID + SOCIAL_HID + (SOCIAL_HID * 1 + 1);
const FORESIGHT_HID = 6; // foresight-head hidden width
/** Planning HORIZON of the foresight head: it forecasts energy this many beats ahead (vs the value head's 1). */
const FORESIGHT_K = 6;
/** Total learnable params the foresight head adds when lit — same 18→h→1 shape. */
export const SUPER_FORESIGHT_PARAMS =
  SENSE * FORESIGHT_HID + FORESIGHT_HID + (FORESIGHT_HID * 1 + 1);
const CROWD_HID = 6; // spacing (crowding-anticipation) head hidden width
/** Total learnable params the spacing head adds when lit — same 18→h→1 shape. */
export const SUPER_CROWD_PARAMS = SENSE * CROWD_HID + CROWD_HID + (CROWD_HID * 1 + 1);
const FORAGE_HID = 6; // forage (prey-scarcity-anticipation) head hidden width
/** Total learnable params the forage head adds when lit — same 18→h→1 shape. */
export const SUPER_FORAGE_PARAMS = SENSE * FORAGE_HID + FORAGE_HID + (FORAGE_HID * 1 + 1);
const EVASION_HID = 6; // evasion (chaos-anticipation) head hidden width
/** Total learnable params the evasion head adds when lit — same 18→h→1 shape. */
export const SUPER_EVASION_PARAMS = SENSE * EVASION_HID + EVASION_HID + (EVASION_HID * 1 + 1);

/** Max living twins the Super Creature may sire (the brief's "twin/offspring creation up to 3"). */
export const SUPER_MAX_OFFSPRING = 3;

/** The goal the planner commits to this beat — a real argmax over drive scores, surfaced to telemetry. */
export type SuperPlan = 'HUNT' | 'FLEE' | 'DOMINATE' | 'DECEIVE' | 'SPAWN' | 'EXPLORE' | 'REST';
export const SUPER_PLANS: readonly SuperPlan[] = [
  'HUNT',
  'FLEE',
  'DOMINATE',
  'DECEIVE',
  'SPAWN',
  'EXPLORE',
  'REST',
] as const;

/** What the Super Creature can sense of the world each beat. Every field is 0..1 unless noted. */
export interface SuperPercept {
  energy: number; // health / satiation
  threat: number; // danger massing nearby
  crowding: number; // local entity density
  chaos: number; // global world disorder
  wealthRel: number; // its purse vs the live mean (0 = broke, 1 = richest)
  preyClose: number; // 1 = prey adjacent, 0 = none in range
  rivalClose: number; // 1 = a rival power adjacent
  pull: number; // singularity / gravitational tug
  light: number; // VISION: scene brightness toward it
  sound: number; // HEARING: audio energy (bass) toward it
  phase: number; // a slow world clock 0..1 (circadian)
}

/** The Super Creature's decision this beat — consumed by the world to move/animate/spawn it. */
export interface SuperIntent {
  move: { x: number; y: number; z: number }; // −1..1 per axis
  aggression: number; // 0..1
  deception: number; // 0..1 (feign-weakness / misdirect)
  dominance: number; // 0..1 projected aura
  spawn: number; // 0..1 desire to replicate
  curiosity: number; // 0..1 drive to explore
  wantsSpawn: boolean; // gated: high desire ∧ sated ∧ below the twin cap
  plan: SuperPlan; // the committed goal
}

/** A read-only view of the live mind — the data telemetry + the future Observatory draw. */
export interface SuperSnapshot {
  name: string;
  generation: number; // 0 = the prime, 1+ = a twin lineage depth
  paramCount: number;
  sizeRel: number; // size vs a Titan (0.5 = half)
  power: number; // power vs a Titan (≈100)
  emotion: { valence: number; arousal: number; dominance: number };
  surprise: number; // |predicted − actual| salience last beat — the prediction-loop error
  learning: boolean; // is the online world-model lit this life?
  learnedPredErr: number; // EMA of the learned forecaster's error (0 when frozen) — falls as it learns
  learnedValueErr: number; // EMA of the value head's next-energy forecast error (0 when frozen)
  survivalUrgency: number; // learned predicted energy drop biasing the planner (0 when frozen)
  learnedThreatErr: number; // EMA of the dread head's next-threat forecast error (0 when frozen)
  dread: number; // learned predicted threat rise biasing the planner toward defense (0 when frozen)
  learnedSocialErr: number; // EMA of the social head's next-rival forecast error (0 when frozen)
  menace: number; // learned predicted rival approach biasing posture/deception (0 when frozen)
  learnedForesightErr: number; // EMA of the foresight head's K-step energy forecast error (0 when frozen)
  foresightUrgency: number; // learned predicted FUTURE energy drop biasing proactive foraging (0 when frozen)
  learnedCrowdErr: number; // EMA of the spacing head's next-crowding forecast error (0 when frozen)
  spacing: number; // learned anticipated crowding driving dispersal (0 when frozen)
  learnedForageErr: number; // EMA of the forage head's next-prey forecast error (0 when frozen)
  forage: number; // learned anticipated prey scarcity driving exploration for new grounds (0 when frozen)
  learnedEvasionErr: number; // EMA of the evasion head's next-chaos forecast error (0 when frozen)
  evasion: number; // learned anticipated world-chaos driving deception/camouflage (0 when frozen)
  liveParamCount: number; // cortex+actor + world-model + value + dread + social + foresight + spacing + forage + evasion when lit
  offspring: number; // living twins sired (≤ SUPER_MAX_OFFSPRING)
  plan: SuperPlan;
  intent: {
    aggression: number;
    deception: number;
    dominance: number;
    spawn: number;
    curiosity: number;
  };
  sense: number[]; // 18 — the sensory view
  latent: number[]; // 16 — the world-model embedding
  act: number[]; // 8 — raw motor/social output
  memoryMean: number; // running salience memory
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
/** tanh output (−1..1) → unit interval (0..1). */
function unit(v: number): number {
  return v * 0.5 + 0.5;
}

let SUPER_SERIAL = 0; // names twins uniquely without any clock/rng

/** EMA smoothing for the emotion state — slow enough to feel like a temperament, fast enough to react. */
const EMOTION_TAU = 0.12;
/** Per-weight mutation magnitude when a twin is born (deterministic, drawn from the parent's rng). */
const TWIN_MUT_STD = 0.18;

/**
 * The apex mind. Construct once with a seeded {@link Rng} for the prime; `think` each beat with a
 * {@link SuperPercept}; read {@link snapshot} for telemetry. Births twins via {@link maybeSpawn}.
 */
export class SuperCreature {
  readonly name: string;
  readonly generation: number;
  /** Half a Titan (the brief). Titan size is the world's, so this is the RELATIVE factor. */
  readonly sizeRel = 0.5;
  /** ~100× a Titan's power (the brief). Relative, unitless — scales its world influence + visuals. */
  readonly power = 100;

  private readonly cortex: TinyMLP; // 18 → 32 → 16 (world model)
  private readonly actor: TinyMLP; //  16 → 12 →  8 (drives)

  // Allocation-free scratch (steady state allocates nothing in think()).
  private readonly sense = new Float32Array(SENSE);
  private readonly cortexHid = new Float32Array(CORTEX_HID);
  private readonly latent = new Float32Array(LATENT);
  private readonly actorHid = new Float32Array(ACTOR_HID);
  private readonly act = new Float32Array(ACT);

  private readonly memory = new MemoryRing(32);
  private valence = 0; // −1 dread .. +1 triumph
  private arousal = 0; // 0 calm .. 1 frenzied
  private dominance = 0.5; // 0 cowed .. 1 god-mode
  private predictedSalience = 0; // the forecast for THIS beat, set last beat (cortex, or the learner)
  private surprise = 0; // |predicted − actual| last beat
  private plan: SuperPlan = 'REST';
  private offspring = 0;

  // ── ONLINE WORLD-MODEL (the one part of the apex mind that LEARNS during life) ────────────────────
  // A real 18→8→1 MLP trained by exact Eshkol-AD backprop to forecast next-beat salience. Null until
  // enableLearning() lights it; while lit it STEERS predictedSalience → surprise → arousal → planning,
  // so the creature's sense of the eventful rides an adaptive forecaster, not a frozen random readout.
  private worldModel: Mlp | null = null;
  private learn = false; // default OFF ⇒ think() is byte-identical to the frozen baseline
  private wmLr = WM_LR; // gradient-descent step; 0 freezes the net (the ablation control)
  private readonly prevSense = new Float64Array(SENSE); // last beat's percept — the world-model's input
  private readonly wmTarget = new Float64Array(1); // scratch target (this beat's actual salience)
  private prevValid = false; // guards the first beat (no prior percept to train on yet)
  private learnedPredErr = 0; // EMA of |world-model forecast − actual salience| — FALLS as it learns

  // ── ONLINE VALUE HEAD — learned survival value: forecasts next-beat energy, biases the planner ─────
  private valueModel: Mlp | null = null; // 18→6→1, created alongside the world-model when learning is lit
  private readonly valTarget = new Float64Array(1); // scratch target (this beat's actual energy)
  private energyForecast = 0; // the value head's forecast (made last beat) for THIS beat's energy
  private survivalUrgency = 0; // clamp(energy − forecastNext): a predicted DROP → seek food / conserve
  private learnedValueErr = 0; // EMA of |value forecast − actual energy| — FALLS as the value head learns

  // ── ONLINE DREAD HEAD — learned threat anticipation: forecasts next-beat threat, biases defense ────
  // A third 18→6→1 MLP (exact Eshkol-AD backprop) that forecasts next-beat THREAT. A predicted RISE
  // becomes `dread`, which pre-emptively raises fleeing/deceiving and suppresses hunting/exploring —
  // anticipatory defense, not reactive. Only the dread pathway touches FLEE/DECEIVE (the world-model and
  // value head never do), so its operational effect is cleanly isolable. Null until enableLearning().
  private threatModel: Mlp | null = null; // rides a third decorrelated substream, lit with the others
  private readonly thrTarget = new Float64Array(1); // scratch target (this beat's actual threat)
  private threatForecast = 0; // the dread head's forecast (made last beat) for THIS beat's threat
  private dread = 0; // clamp(forecastNext − threat): a predicted threat RISE → flee, stop feeding
  private learnedThreatErr = 0; // EMA of |threat forecast − actual threat| — FALLS as the head learns

  // ── ONLINE SOCIAL HEAD — learned rival anticipation: a fourth 18→6→1 MLP forecasts next-beat rival
  // proximity. A predicted APPROACH becomes `menace`, which biases the planner toward a social response —
  // POSTURE (dominate) if strong, FEINT (deceive) if weak — anticipating a rival before it closes. A
  // decorrelated substream; a `social:false` seam runs the mind WITHOUT the bias (the ablation control). ──
  private socialModel: Mlp | null = null; // null until enableLearning(); off ⇒ menace 0 ⇒ byte-identical
  private socialBias = true; // the seam: false learns the model but does not steer the plan
  private readonly socTarget = new Float64Array(1); // scratch target (this beat's actual rival proximity)
  private rivalForecast = 0; // the social head's forecast (made last beat) for THIS beat's rival proximity
  private menace = 0; // clamp(forecastNext − rival): a predicted rival APPROACH → posture / feint
  private learnedSocialErr = 0; // EMA of |rival forecast − actual rival| — FALLS as the head learns

  // ── ONLINE FORESIGHT HEAD — learned PLANNING HORIZON: a fifth 18→6→1 MLP forecasts energy FORESIGHT_K
  // beats ahead (vs the value head's 1). A predicted FUTURE drop becomes `foresightUrgency`, which drives
  // PROACTIVE foraging — the creature feeds/conserves BEFORE hunger arrives, not just when already low. A
  // K-deep ring of past percepts supplies the delayed (percept_{t−K} → energy_t) training pair. ──────────
  private foresightModel: Mlp | null = null; // null until enableLearning(); off ⇒ foresightUrgency 0
  private foresightBias = true; // the seam: false learns the model but does not steer the plan
  private senseRing: Float64Array | null = null; // FORESIGHT_K past SENSE-vectors (flat), for delayed training
  private foreBeat = 0; // beats seen since learning lit — indexes the ring
  private readonly foreTarget = new Float64Array(1); // scratch target (this beat's actual energy)
  private foresightUrgency = 0; // clamp(energy − forecast_{t+K}): a predicted FUTURE drop → forage early
  private learnedForesightErr = 0; // EMA of |K-step forecast − actual energy| — FALLS as the head learns

  // ── ONLINE SPACING HEAD — learned crowding anticipation: a sixth 18→6→1 MLP forecasts next-beat crowding.
  // A predicted congestion becomes `spacing`, a continuous overlay that AMPLIFIES the creature's movement
  // (disperse ahead of the crush) and damps aimless exploration. Continuous ⇒ robust; `spacing:false` seam. ─
  private crowdModel: Mlp | null = null; // null until enableLearning(); off ⇒ spacing 0 ⇒ byte-identical
  private crowdBias = true; // the seam: false learns the model but does not steer movement
  private readonly crowdTarget = new Float64Array(1); // scratch target (this beat's actual crowding)
  private crowdForecast = 0; // the spacing head's forecast (made last beat) for THIS beat's crowding
  private spacing = 0; // clamp((forecast − 0.3)·k): anticipated congestion → disperse
  private learnedCrowdErr = 0; // EMA of |crowding forecast − actual crowding| — FALLS as the head learns

  // ── ONLINE FORAGE HEAD — learned prey-scarcity anticipation: a seventh 18→6→1 MLP forecasts next-beat prey
  // proximity (s[5]). A predicted SCARCITY (prey below a floor) becomes `forage`, a continuous drive that
  // RAISES exploration + curiosity — the anticipatory counterpart to the reactive hunt heads: when the model
  // foresees prey thinning HERE, it ranges out to find new hunting grounds. Continuous ⇒ robust; the
  // `forage:false` seam learns the model but does not steer, isolating the exploratory effect. ─────────────
  private forageModel: Mlp | null = null; // null until enableLearning(); off ⇒ forage 0 ⇒ byte-identical
  private forageBias = true; // the seam: false learns the model but does not steer exploration
  private readonly forageTarget = new Float64Array(1); // scratch target (this beat's actual prey proximity)
  private preyForecast = 0; // the forage head's forecast (made last beat) for THIS beat's prey proximity
  private forage = 0; // clamp(floor − forecast): anticipated prey scarcity → explore for new grounds
  private learnedForageErr = 0; // EMA of |prey forecast − actual prey| — FALLS as the head learns

  // ── ONLINE EVASION HEAD — learned world-chaos anticipation: an eighth 18→6→1 MLP forecasts next-beat chaos
  // (s[3]). A predicted RISE in disorder becomes `evasion`, a continuous overlay that raises DECEPTION —
  // slip into camouflage / feint under the cover of a chaotic world before it fully breaks. Continuous ⇒
  // robust; the `evasion:false` seam learns the model but does not steer, isolating the deception effect. ──
  private evasionModel: Mlp | null = null; // null until enableLearning(); off ⇒ evasion 0 ⇒ byte-identical
  private evasionBias = true; // the seam: false learns the model but does not steer deception
  private readonly evasionTarget = new Float64Array(1); // scratch target (this beat's actual chaos)
  private chaosForecast = 0; // the evasion head's forecast (made last beat) for THIS beat's chaos
  private evasion = 0; // clamp(forecast − floor): anticipated HIGH disorder → deceive / hide
  private learnedEvasionErr = 0; // EMA of |chaos forecast − actual chaos| — FALLS as the head learns

  /**
   * Birth the Super Creature. With no preset weights it rolls a fresh deep mind from `rng` (the
   * prime); twins pass mutated weight arrays + an incremented generation (see {@link maybeSpawn}).
   */
  constructor(
    rng: Rng,
    opts?: { name?: string; generation?: number; cortexW?: Float32Array; actorW?: Float32Array },
  ) {
    this.generation = opts?.generation ?? 0;
    this.name =
      opts?.name ?? (this.generation === 0 ? 'ARCHITECT-Ω' : `ARCHITECT-Ω·${++SUPER_SERIAL}`);
    const cw = opts?.cortexW ?? SuperCreature.rollWeights(SENSE, CORTEX_HID, LATENT, rng);
    const aw = opts?.actorW ?? SuperCreature.rollWeights(LATENT, ACTOR_HID, ACT, rng);
    this.cortex = new TinyMLP(SENSE, CORTEX_HID, LATENT, cw);
    this.actor = new TinyMLP(LATENT, ACTOR_HID, ACT, aw);
  }

  /** Roll a bias-augmented weight array in [−1,1] for a `(in,hid,out)` layer pair. */
  private static rollWeights(nIn: number, nHid: number, nOut: number, rng: Rng): Float32Array {
    const w = new Float32Array(TinyMLP.weightCount(nIn, nHid, nOut));
    for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
    return w;
  }

  get paramCount(): number {
    return this.cortex.weights.length + this.actor.weights.length;
  }
  get offspringCount(): number {
    return this.offspring;
  }
  /** Live params: frozen cortex+actor + the online world-model, value head AND dread head when lit. */
  get liveParamCount(): number {
    return (
      this.paramCount +
      (this.worldModel
        ? SUPER_WORLDMODEL_PARAMS +
          SUPER_VALUE_PARAMS +
          SUPER_THREAT_PARAMS +
          SUPER_SOCIAL_PARAMS +
          SUPER_FORESIGHT_PARAMS +
          SUPER_CROWD_PARAMS +
          SUPER_FORAGE_PARAMS +
          SUPER_EVASION_PARAMS
        : 0)
    );
  }
  /** Is the online world-model learning this life? (false ⇒ the mind is the frozen baseline). */
  get isLearning(): boolean {
    return this.learn;
  }
  /** EMA of the online world-model's forecast error — the falsifiable "it is actually learning" readout. */
  get learnedPredictionError(): number {
    return this.learnedPredErr;
  }
  /** EMA of the value head's next-energy forecast error — falls as the survival value is learned. */
  get learnedValueError(): number {
    return this.learnedValueErr;
  }
  /** EMA of the dread head's next-threat forecast error — falls as threat anticipation is learned. */
  get learnedThreatError(): number {
    return this.learnedThreatErr;
  }
  /** EMA of the social head's next-rival forecast error — falls as rival anticipation is learned. */
  get learnedSocialError(): number {
    return this.learnedSocialErr;
  }
  /** EMA of the foresight head's K-step energy forecast error — falls as farsighted planning is learned. */
  get learnedForesightError(): number {
    return this.learnedForesightErr;
  }
  /** EMA of the spacing head's next-crowding forecast error — falls as crowding anticipation is learned. */
  get learnedCrowdError(): number {
    return this.learnedCrowdErr;
  }
  /** EMA of the forage head's next-prey forecast error — falls as prey-scarcity anticipation is learned. */
  get learnedForageError(): number {
    return this.learnedForageErr;
  }
  /** EMA of the evasion head's next-chaos forecast error — falls as chaos anticipation is learned. */
  get learnedEvasionError(): number {
    return this.learnedEvasionErr;
  }

  /**
   * Ignite ONLINE learning: the apex world-model (a real {@link SUPER_WORLDMODEL_PARAMS}-param 18→8→1
   * MLP trained by exact reverse-mode Eshkol-AD backprop) begins forecasting next-beat salience and
   * CORRECTING itself every beat, and its forecast takes over the surprise loop. The net is seeded from
   * a SEPARATE deterministic substream derived from the creature's identity — NEVER the constructor rng
   * — so lighting learning cannot perturb the world's main draw order. Idempotent. `lr = 0` freezes the
   * net (the ablation control): it still forecasts but never updates, so its error cannot fall.
   */
  enableLearning(opts?: {
    lr?: number;
    seed?: number;
    social?: boolean;
    foresight?: boolean;
    spacing?: boolean;
    forage?: boolean;
    evasion?: boolean;
  }): void {
    if (opts?.lr !== undefined) this.wmLr = opts.lr;
    if (this.worldModel) {
      this.learn = true;
      return;
    }
    const seed =
      ((hashSeed(this.name) ^ ((this.generation + 1) * 0x9e3779b9)) >>> 0 || 1) ^
      ((opts?.seed ?? 0) >>> 0);
    this.worldModel = createMlp(SENSE, WM_HID, 1, mulberry32(seed >>> 0 || 1));
    // the value head rides a further-decorrelated substream so its init is independent of the world-model.
    this.valueModel = createMlp(SENSE, VALUE_HID, 1, mulberry32((seed ^ 0x5a5a5a5a) >>> 0 || 1));
    // the dread head rides yet another decorrelated substream (threat axis, independent of both above).
    this.threatModel = createMlp(SENSE, THREAT_HID, 1, mulberry32((seed ^ 0x33cc33cc) >>> 0 || 1));
    // the social head rides a fourth decorrelated substream (rival axis). `social:false` still creates the
    // model (so it learns and its error is measurable) but suppresses the plan bias — the ablation control.
    this.socialModel = createMlp(SENSE, SOCIAL_HID, 1, mulberry32((seed ^ 0x1c0ffee5) >>> 0 || 1));
    this.socialBias = opts?.social !== false;
    // the foresight head rides a fifth decorrelated substream (K-step energy horizon). Its ring holds the
    // last FORESIGHT_K percepts so it can train on the delayed (percept_{t−K} → energy_t) pair.
    this.foresightModel = createMlp(
      SENSE,
      FORESIGHT_HID,
      1,
      mulberry32((seed ^ 0x0f0e51a7) >>> 0 || 1),
    );
    this.foresightBias = opts?.foresight !== false;
    this.senseRing = new Float64Array(FORESIGHT_K * SENSE);
    this.foreBeat = 0;
    // the spacing head rides a sixth decorrelated substream (crowding axis). `spacing:false` = ablation control.
    this.crowdModel = createMlp(SENSE, CROWD_HID, 1, mulberry32((seed ^ 0x5aac1a60) >>> 0 || 1));
    this.crowdBias = opts?.spacing !== false;
    // the forage head rides a seventh decorrelated substream (prey axis). `forage:false` = ablation control.
    this.forageModel = createMlp(SENSE, FORAGE_HID, 1, mulberry32((seed ^ 0x0fa63a1e) >>> 0 || 1));
    this.forageBias = opts?.forage !== false;
    // the evasion head rides an eighth decorrelated substream (chaos axis). `evasion:false` = ablation control.
    this.evasionModel = createMlp(
      SENSE,
      EVASION_HID,
      1,
      mulberry32((seed ^ 0x3ca05e77) >>> 0 || 1),
    );
    this.evasionBias = opts?.evasion !== false;
    this.learn = true;
    this.prevValid = false;
    this.learnedPredErr = 0;
    this.learnedValueErr = 0;
    this.survivalUrgency = 0;
    this.energyForecast = 0;
    this.learnedThreatErr = 0;
    this.dread = 0;
    this.threatForecast = 0;
    this.learnedSocialErr = 0;
    this.menace = 0;
    this.rivalForecast = 0;
    this.learnedForesightErr = 0;
    this.foresightUrgency = 0;
    this.learnedCrowdErr = 0;
    this.spacing = 0;
    this.crowdForecast = 0;
    this.learnedForageErr = 0;
    this.forage = 0;
    this.preyForecast = 0;
    this.learnedEvasionErr = 0;
    this.evasion = 0;
    this.chaosForecast = 0;
  }

  /**
   * One cognitive beat: perceive → CORTEX (world model) → ACTOR (drives) → emotion / memory /
   * prediction-loop / plan. Pure & allocation-free. Returns the intent the world acts on.
   */
  think(p: SuperPercept): SuperIntent {
    // ── PERCEPTION: assemble the 18-vector (raw senses + interoceptive feedback) ──────────────────
    const s = this.sense;
    s[0] = clamp01(p.energy);
    s[1] = clamp01(p.threat);
    s[2] = clamp01(p.crowding);
    s[3] = clamp01(p.chaos);
    s[4] = clamp01(p.wealthRel);
    s[5] = clamp01(p.preyClose);
    s[6] = clamp01(p.rivalClose);
    s[7] = clamp01(p.pull);
    s[8] = clamp01(p.light);
    s[9] = clamp01(p.sound);
    s[10] = this.valence; // interoception: it feels its own state
    s[11] = this.arousal;
    s[12] = this.dominance;
    s[13] = this.memory.mean();
    s[14] = this.surprise;
    s[15] = this.offspring / SUPER_MAX_OFFSPRING;
    s[16] = Math.sin(p.phase * Math.PI * 2); // circadian, as a 2-phase clock
    s[17] = Math.cos(p.phase * Math.PI * 2);

    // ── COGNITION: cortex compresses to a world-model latent, actor maps it to drives ─────────────
    this.cortex.forward(s, this.cortexHid, this.latent);
    this.actor.forward(this.latent, this.actorHid, this.act);

    const a = this.act;
    const mx = a[0] ?? 0;
    const my = a[1] ?? 0;
    const mz = a[2] ?? 0;
    const aggression = unit(a[3] ?? 0);
    const deception = unit(a[4] ?? 0);
    const domProject = unit(a[5] ?? 0);
    const spawnDesire = unit(a[6] ?? 0);
    const curiosity = unit(a[7] ?? 0);
    const moveMag = clamp01(Math.sqrt(mx * mx + my * my + mz * mz) / Math.SQRT2);

    // ── VALUE HEAD: learned survival value — forecast next-beat energy, derive planning urgency ────
    // Trains on (prevSense → this beat's energy) by exact AD (prevSense is still LAST beat's here — the
    // world-model loop below overwrites it), then forecasts NEXT beat's energy from the current percept;
    // a predicted DROP becomes survivalUrgency, which biases the planner. OFF by default ⇒ survivalUrgency
    // stays 0 ⇒ the planner is byte-identical to the frozen baseline.
    if (this.learn && this.valueModel) {
      if (this.prevValid) {
        this.learnedValueErr +=
          WM_TAU * (Math.abs(this.energyForecast - (s[0] ?? 0)) - this.learnedValueErr);
        if (this.wmLr > 0) {
          this.valTarget[0] = s[0] ?? 0;
          mlpTrainStep(this.valueModel, this.prevSense, this.valTarget, this.wmLr);
        }
      }
      const energyNext = clamp01(mlpPredict(this.valueModel, s)[0] ?? 0);
      this.survivalUrgency = clamp01((s[0] ?? 0) - energyNext); // a predicted energy DROP
      this.energyForecast = energyNext; // compared to next beat's actual energy for the error EMA
    }

    // ── DREAD HEAD: learned threat anticipation — forecast next-beat threat, derive defensive dread ────
    // Mirror of the value head on the THREAT axis: trains on (prevSense → this beat's threat) by exact AD
    // (prevSense is still LAST beat's here — the world-model loop below overwrites it), then forecasts NEXT
    // beat's threat from the current percept; a predicted RISE becomes `dread`, biasing the planner toward
    // fleeing/deceiving and away from feeding/wandering. OFF by default ⇒ dread 0 ⇒ planner byte-identical.
    if (this.learn && this.threatModel) {
      if (this.prevValid) {
        this.learnedThreatErr +=
          WM_TAU * (Math.abs(this.threatForecast - (s[1] ?? 0)) - this.learnedThreatErr);
        if (this.wmLr > 0) {
          this.thrTarget[0] = s[1] ?? 0;
          mlpTrainStep(this.threatModel, this.prevSense, this.thrTarget, this.wmLr);
        }
      }
      const threatNext = clamp01(mlpPredict(this.threatModel, s)[0] ?? 0);
      this.dread = clamp01(threatNext - (s[1] ?? 0)); // a predicted threat RISE
      this.threatForecast = threatNext; // compared to next beat's actual threat for the error EMA
    }

    // ── SOCIAL HEAD: learned rival anticipation — forecast next-beat rival proximity (s[6]), derive menace ─
    // Same mirror on the SOCIAL axis: trains on (prevSense → this beat's rival proximity) by exact AD, then
    // forecasts NEXT beat's rival proximity; a predicted APPROACH becomes `menace`, biasing the planner
    // toward a social response (posture if strong, feint if weak). `socialBias` off (or learning off) ⇒
    // menace does not steer the plan ⇒ byte-identical baseline.
    if (this.learn && this.socialModel) {
      if (this.prevValid) {
        this.learnedSocialErr +=
          WM_TAU * (Math.abs(this.rivalForecast - (s[6] ?? 0)) - this.learnedSocialErr);
        if (this.wmLr > 0) {
          this.socTarget[0] = s[6] ?? 0;
          mlpTrainStep(this.socialModel, this.prevSense, this.socTarget, this.wmLr);
        }
      }
      const rivalNext = clamp01(mlpPredict(this.socialModel, s)[0] ?? 0);
      // `menace` = a continuous combat READINESS: the LEARNED expectation of rival presence, above a floor.
      // It overlays the motor intent every beat (not a rare argmax flip), so its effect is robust regardless
      // of whether a social plan wins. rivalForecast feeds the error EMA (ablation-verified learning).
      this.menace = clamp01((rivalNext - 0.3) * 1.4);
      this.rivalForecast = rivalNext;
    }

    // ── SPACING HEAD: learned crowding anticipation — forecast next-beat crowding (s[2]), derive spacing. A
    // continuous overlay (like the social readiness): a predicted congestion amplifies movement (disperse)
    // and damps aimless exploration. `spacing:false` (or learning off) ⇒ spacing 0 ⇒ byte-identical.
    if (this.learn && this.crowdModel) {
      if (this.prevValid) {
        this.learnedCrowdErr +=
          WM_TAU * (Math.abs(this.crowdForecast - (s[2] ?? 0)) - this.learnedCrowdErr);
        if (this.wmLr > 0) {
          this.crowdTarget[0] = s[2] ?? 0;
          mlpTrainStep(this.crowdModel, this.prevSense, this.crowdTarget, this.wmLr);
        }
      }
      const crowdNext = clamp01(mlpPredict(this.crowdModel, s)[0] ?? 0);
      this.spacing = clamp01((crowdNext - 0.3) * 1.4); // anticipated congestion → disperse
      this.crowdForecast = crowdNext;
    }

    // ── FORAGE HEAD: learned prey-scarcity anticipation — forecast next-beat prey proximity (s[5]), derive
    // `forage`. Same mirror on the PREY axis: trains on (prevSense → this beat's prey proximity) by exact AD,
    // then forecasts NEXT beat's prey; a predicted SCARCITY (prey below a floor) becomes `forage`, a continuous
    // drive that RAISES exploration + curiosity — range out for new hunting grounds before prey thins here.
    // `forageBias` off (or learning off) ⇒ forage 0 ⇒ the exploration overlay is byte-identical to baseline.
    if (this.learn && this.forageModel) {
      if (this.prevValid) {
        this.learnedForageErr +=
          WM_TAU * (Math.abs(this.preyForecast - (s[5] ?? 0)) - this.learnedForageErr);
        if (this.wmLr > 0) {
          this.forageTarget[0] = s[5] ?? 0;
          mlpTrainStep(this.forageModel, this.prevSense, this.forageTarget, this.wmLr);
        }
      }
      const preyNext = clamp01(mlpPredict(this.forageModel, s)[0] ?? 0);
      this.forage = clamp01((0.5 - preyNext) * 1.5); // predicted prey below the 0.5 "thinning" floor → range out
      this.preyForecast = preyNext; // compared to next beat's actual prey for the error EMA
    }

    // ── EVASION HEAD: learned world-chaos anticipation — forecast next-beat chaos (s[3]), derive `evasion`.
    // Same mirror on the CHAOS axis: trains on (prevSense → this beat's chaos) by exact AD, then forecasts NEXT
    // beat's chaos; anticipated HIGH disorder (forecast above a floor) becomes `evasion`, a continuous overlay
    // that raises DECEPTION — slip into camouflage / feint under the cover of the coming chaos. `evasionBias`
    // off (or learning off) ⇒ evasion 0 ⇒ the deception overlay is byte-identical to baseline.
    if (this.learn && this.evasionModel) {
      if (this.prevValid) {
        this.learnedEvasionErr +=
          WM_TAU * (Math.abs(this.chaosForecast - (s[3] ?? 0)) - this.learnedEvasionErr);
        if (this.wmLr > 0) {
          this.evasionTarget[0] = s[3] ?? 0;
          mlpTrainStep(this.evasionModel, this.prevSense, this.evasionTarget, this.wmLr);
        }
      }
      const chaosNext = clamp01(mlpPredict(this.evasionModel, s)[0] ?? 0);
      this.evasion = clamp01((chaosNext - 0.4) * 1.4); // anticipated HIGH disorder (above 0.4) → deceive/hide
      this.chaosForecast = chaosNext; // compared to next beat's actual chaos for the error EMA
    }

    // ── FORESIGHT HEAD: learned PLANNING HORIZON — forecast energy FORESIGHT_K beats ahead, derive proactive
    // urgency. Unlike the value head (1 beat), it trains on the DELAYED pair (percept_{t−K} → energy_t) held
    // in a K-deep ring, so it learns the longer arc. A predicted FUTURE drop → forage/conserve EARLY. OFF by
    // default (and under `foresight:false`) ⇒ foresightUrgency 0 ⇒ the planner is byte-identical.
    if (this.learn && this.foresightModel && this.senseRing) {
      const off = (this.foreBeat % FORESIGHT_K) * SENSE;
      if (this.foreBeat >= FORESIGHT_K) {
        const past = this.senseRing.subarray(off, off + SENSE); // percept from FORESIGHT_K beats ago
        this.learnedForesightErr +=
          WM_TAU *
          (Math.abs((mlpPredict(this.foresightModel, past)[0] ?? 0) - (s[0] ?? 0)) -
            this.learnedForesightErr);
        if (this.wmLr > 0) {
          this.foreTarget[0] = s[0] ?? 0; // train the K-ago percept toward THIS beat's realized energy
          mlpTrainStep(this.foresightModel, past, this.foreTarget, this.wmLr);
        }
      }
      for (let i = 0; i < SENSE; i++) this.senseRing[off + i] = s[i] ?? 0; // record this percept for t+K
      const energyAhead = clamp01(mlpPredict(this.foresightModel, s)[0] ?? 0);
      this.foresightUrgency = clamp01((s[0] ?? 0) - energyAhead); // a predicted FUTURE energy drop
      this.foreBeat++;
    }

    // ── PREDICTION LOOP: compare last beat's forecast to this beat's actual salience → surprise ────
    const salience = clamp01(0.5 * s[1] + 0.3 * s[2] + 0.2 * moveMag); // how eventful "now" is
    this.surprise = clamp01(Math.abs(this.predictedSalience - salience));
    this.memory.push(salience);
    // The forecast for the NEXT beat. FROZEN baseline: the cortex's random-init readout unit(latent[0]).
    // LEARNING (apex archons): a real MLP trained by exact Eshkol-AD backprop takes over — it forecasts
    // the SAME target, is corrected on (prevSense → salience) every beat, and its improving forecast now
    // DRIVES predictedSalience. So surprise (→ arousal → planning) rides an adaptive predictor whose
    // error provably falls (tests/super-creature-learning.test.ts), not a frozen readout. lr=0 = control.
    if (this.learn && this.worldModel) {
      if (this.prevValid && this.wmLr > 0) {
        this.wmTarget[0] = salience;
        mlpTrainStep(this.worldModel, this.prevSense, this.wmTarget, this.wmLr);
      }
      this.learnedPredErr += WM_TAU * (this.surprise - this.learnedPredErr); // realized error, smoothed
      this.predictedSalience = clamp01(mlpPredict(this.worldModel, s)[0] ?? 0);
      for (let i = 0; i < SENSE; i++) this.prevSense[i] = s[i] ?? 0; // remember for next-beat training
      this.prevValid = true;
    } else {
      this.predictedSalience = unit(this.latent[0] ?? 0); // frozen cortex forecast (unchanged baseline)
    }

    // ── EMOTION: each axis is an EMA toward a real signal (a temperament, not decoration) ─────────
    this.valence += EMOTION_TAU * (clamp(s[0] - s[1], -1, 1) - this.valence);
    const arouseTarget = clamp01(0.4 * moveMag + 0.3 * this.surprise + 0.3 * aggression);
    this.arousal += EMOTION_TAU * (arouseTarget - this.arousal);
    const domTarget = clamp01(0.6 * domProject + 0.4 * s[4]);
    this.dominance += EMOTION_TAU * (domTarget - this.dominance);

    // ── PLANNING (GOAP-lite): score each goal from drives+senses+emotion, commit to the argmax ────
    const drives: Record<SuperPlan, number> = {
      HUNT: aggression * (0.5 + 0.5 * s[5]) * (1 - 0.5 * s[1]),
      FLEE: s[1] * (1 - this.dominance),
      DOMINATE: domProject * (0.4 + 0.6 * s[4]) * this.dominance,
      DECEIVE: deception * s[1] * (1 - this.dominance),
      SPAWN: spawnDesire * s[0] * (this.offspring < SUPER_MAX_OFFSPRING ? 1 : 0),
      EXPLORE: curiosity * (1 - s[1]) * (0.5 + 0.5 * (1 - s[2])),
      REST: (1 - this.arousal) * (1 - s[1]) * s[0],
    };
    // SURVIVAL-AWARE PLANNING: a LEARNED predicted energy drop pulls toward feeding/conserving and away
    // from risky wandering/dominance games. survivalUrgency is 0 unless learning ⇒ the baseline is
    // byte-identical; when lit, reactive instinct becomes learned, value-directed goal selection.
    const su = this.survivalUrgency;
    if (su > 0) {
      drives.HUNT += su * 0.6 * (0.4 + 0.6 * (s[5] ?? 0)); // hungry → hunt toward prey harder
      drives.REST += su * 0.25 * (1 - (s[1] ?? 0)); // if safe, conserve
      drives.EXPLORE *= 1 - 0.5 * su; // don't wander when starving
      drives.DOMINATE *= 1 - 0.3 * su; // survival over dominance games
    }
    // FORESIGHT-AWARE PLANNING: a LEARNED predicted FUTURE (K-beat-ahead) energy drop pulls toward feeding /
    // banking energy BEFORE hunger arrives — proactive, not reactive. foresightUrgency is 0 unless learning
    // AND the foresight bias is on ⇒ the baseline (and the `foresight:false` control) are byte-identical.
    const fu = this.foresightBias ? this.foresightUrgency : 0;
    if (fu > 0) {
      drives.HUNT += fu * 0.6 * (0.4 + 0.6 * (s[5] ?? 0)); // forage ahead of the coming trough
      drives.REST += fu * 0.3 * (1 - (s[1] ?? 0)); // or bank energy while it is still safe
      drives.EXPLORE *= 1 - 0.35 * fu; // less aimless wandering when a drop looms
    }
    // SPACING-AWARE PLANNING: anticipated congestion damps aimless exploration (don't wander into the crush);
    // the primary dispersal effect is the continuous MOVE-magnitude overlay in the returned intent below.
    const sp = this.crowdBias ? this.spacing : 0;
    if (sp > 0) drives.EXPLORE *= 1 - 0.3 * sp;
    // FORAGE-AWARE PLANNING: a LEARNED predicted prey SCARCITY raises exploration — range out for new hunting
    // grounds before prey thins here (the anticipatory counterpart to the reactive hunt heads). This is the
    // ONLY head that RAISES EXPLORE, so its plan effect is cleanly attributable; the primary robust effect is
    // the continuous curiosity overlay in the returned intent below. fo is 0 unless learning AND the forage
    // bias is on ⇒ the baseline (and the `forage:false` control) are byte-identical.
    const fo = this.forageBias ? this.forage : 0;
    if (fo > 0) drives.EXPLORE *= 1 + 0.6 * fo;
    // DREAD-AWARE PLANNING: a LEARNED predicted threat RISE pre-emptively raises fleeing/deceiving and
    // suppresses committing to a hunt or a wander BEFORE the danger fully lands — anticipatory defense.
    // Only this pathway touches FLEE/DECEIVE, so its effect on plan choice is cleanly attributable to the
    // dread head. dread is 0 unless learning ⇒ the baseline is byte-identical.
    const dr = this.dread;
    if (dr > 0) {
      drives.FLEE += dr * 0.7 * (1 - this.dominance); // anticipate danger → prepare to bolt
      drives.DECEIVE += dr * 0.2 * (1 - this.dominance); // or slip away unseen
      drives.HUNT *= 1 - 0.4 * dr; // don't chase prey into rising danger
      drives.EXPLORE *= 1 - 0.5 * dr; // hunker rather than wander into it
    }
    // SOCIAL-AWARE PLANNING: when a rival is anticipated AND the creature is strong, it also leans to CONTEST
    // (dominate). Light — the primary social effect is the continuous readiness overlay on the motor intent
    // below, which does not depend on a social plan out-competing hunting/exploring.
    const mn = this.socialBias ? this.menace : 0;
    if (mn > 0) {
      drives.DOMINATE += mn * 0.5 * this.dominance; // strong → posture toward the anticipated rival
    }
    // POWER OF MATH (inline, legacy V31 path): number theory gcd resonance for combinatoric plan-limb alignment (Euclid)
    function _gcd(x: number, y: number) {
      while (y) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x || 1;
    }
    for (let ii = 0; ii < SUPER_PLANS.length; ii++) {
      const pk = SUPER_PLANS[ii]!;
      const res = (_gcd(ii + 1, ((s[0] * 10) | 0) + 1) % 3) * 0.02;
      drives[pk] = (drives[pk] ?? 0) + res;
    }
    let best: SuperPlan = 'REST';
    let bestScore = -Infinity;
    for (const k of SUPER_PLANS) {
      const v = drives[k];
      if (v > bestScore) {
        bestScore = v;
        best = k;
      }
    }
    this.plan = best;

    const wantsSpawn = spawnDesire > 0.8 && this.offspring < SUPER_MAX_OFFSPRING && s[0] > 0.5;
    // SOCIAL READINESS OVERLAY: a LEARNED expectation of rival presence raises combat readiness (aggression
    // + projected dominance) every beat it fires — a continuous, always-consumed effect. 0 unless learning
    // AND the social bias is on ⇒ the frozen baseline and the `social:false` control are byte-identical.
    const guard = this.socialBias ? this.menace : 0;
    // SPACING OVERLAY: anticipated congestion AMPLIFIES movement (disperse ahead of the crush) — a
    // continuous, always-consumed effect. 0 unless learning AND spacing bias on ⇒ byte-identical baseline.
    const disperse = sp > 0 ? 1 + sp * 0.6 : 1;
    // FORAGE OVERLAY: anticipated prey scarcity RAISES curiosity (investigate for new grounds) every beat it
    // fires — a continuous, always-consumed effect that does not depend on EXPLORE winning the argmax. 0 unless
    // learning AND the forage bias is on ⇒ the frozen baseline and the `forage:false` control are byte-identical.
    // EVASION OVERLAY: anticipated world-chaos RAISES deception (camouflage under the coming disorder) — a
    // continuous, always-consumed effect. 0 unless learning AND the evasion bias is on ⇒ byte-identical baseline.
    const ev = this.evasionBias ? this.evasion : 0;
    return {
      move: { x: mx * disperse, y: my * disperse, z: mz * disperse },
      aggression: guard > 0 ? clamp01(aggression + guard * 0.5) : aggression,
      deception: ev > 0 ? clamp01(deception + ev * 0.5) : deception,
      dominance: guard > 0 ? clamp01(domProject + guard * 0.4) : domProject,
      spawn: spawnDesire,
      curiosity: fo > 0 ? clamp01(curiosity + fo * 0.4) : curiosity,
      wantsSpawn,
      plan: best,
    };
  }

  /**
   * If the mind wants to replicate and is below the twin cap, sire a mutated child and return it
   * (else `null`). The child inherits the parent's weights perturbed by seeded Gaussian-ish noise —
   * a deterministic offspring, one generation deeper. Caller owns the returned twin.
   */
  maybeSpawn(rng: Rng): SuperCreature | null {
    if (this.offspring >= SUPER_MAX_OFFSPRING) return null;
    this.offspring++;
    const cw = SuperCreature.mutate(this.cortex.weights, rng);
    const aw = SuperCreature.mutate(this.actor.weights, rng);
    const child = new SuperCreature(rng, {
      name: `${this.name}·twin${this.offspring}`,
      generation: this.generation + 1,
      cortexW: cw,
      actorW: aw,
    });
    // A learning lineage: if the parent's world-model is lit, the child is born learning too (its own
    // net, seeded from its own unique identity ⇒ deterministic, no shared state, no rng perturbation).
    if (this.learn) child.enableLearning({ lr: this.wmLr });
    return child;
  }

  /**
   * V122 (USER #9): a BRUTAL morph mutation nudges the deep mind IN PLACE — a tiny seeded jitter on
   * every cortex/actor weight (±amp uniform, clamped to the same ±1.5 band the twin mutation uses),
   * so each morph press leaves a real, subtle neurological mark on the apex behaviour. Deterministic
   * (injected user-gesture rng), allocation-free. O(paramCount).
   */
  perturbMind(rng: Rng, amp = 0.008): void {
    const cw = this.cortex.weights;
    for (let i = 0; i < cw.length; i++) {
      cw[i] = clamp((cw[i] ?? 0) + (rng() * 2 - 1) * amp, -1.5, 1.5);
    }
    const aw = this.actor.weights;
    for (let i = 0; i < aw.length; i++) {
      aw[i] = clamp((aw[i] ?? 0) + (rng() * 2 - 1) * amp, -1.5, 1.5);
    }
  }

  /** Clone a weight array with per-weight mutation (two rng draws → an approx-normal nudge). */
  private static mutate(src: Float32Array, rng: Rng): Float32Array {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const g = (rng() + rng() - 1) * TWIN_MUT_STD; // sum of 2 uniforms ≈ triangular ~ Gaussian
      out[i] = clamp((src[i] ?? 0) + g, -1.5, 1.5);
    }
    return out;
  }

  /** Immutable snapshot for telemetry / the Observatory. Allocates the small arrays it returns. */
  snapshot(): SuperSnapshot {
    return {
      name: this.name,
      generation: this.generation,
      paramCount: this.paramCount,
      sizeRel: this.sizeRel,
      power: this.power,
      emotion: { valence: this.valence, arousal: this.arousal, dominance: this.dominance },
      surprise: this.surprise,
      learning: this.learn,
      learnedPredErr: this.learnedPredErr,
      learnedValueErr: this.learnedValueErr,
      survivalUrgency: this.survivalUrgency,
      learnedThreatErr: this.learnedThreatErr,
      dread: this.dread,
      learnedSocialErr: this.learnedSocialErr,
      menace: this.menace,
      learnedForesightErr: this.learnedForesightErr,
      foresightUrgency: this.foresightUrgency,
      learnedCrowdErr: this.learnedCrowdErr,
      spacing: this.spacing,
      learnedForageErr: this.learnedForageErr,
      forage: this.forage,
      learnedEvasionErr: this.learnedEvasionErr,
      evasion: this.evasion,
      liveParamCount: this.liveParamCount,
      offspring: this.offspring,
      plan: this.plan,
      intent: {
        aggression: unit(this.act[3] ?? 0),
        deception: unit(this.act[4] ?? 0),
        dominance: unit(this.act[5] ?? 0),
        spawn: unit(this.act[6] ?? 0),
        curiosity: unit(this.act[7] ?? 0),
      },
      sense: Array.from(this.sense),
      latent: Array.from(this.latent),
      act: Array.from(this.act),
      memoryMean: this.memory.mean(),
    };
  }
}
