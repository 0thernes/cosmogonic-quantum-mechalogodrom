/**
 * GEDANKEN DEATH (V127, USER) — Stephen Thaler's "Death of a Gedanken Creature" enacted on this world's
 * Gedanken Digital Biologics. Every organism carries a real 70-param `6→6→4` tanh MLP policy
 * (entity-brain.ts). Thaler's discovery (US Patent 5,659,666; "Device for the Autonomous Generation of
 * Useful Information"): progressively PERTURB a net's weights and, holding its input fixed, its outputs
 * drift off the learned response into NOVEL confabulations — the network "hallucinates" as it dies — the
 * intensity peaking at a MODERATE damage band (the "creativity sweet spot") before dissolving into
 * saturation/noise. This kernel measures exactly that, on the REAL nets, at the moment of death.
 *
 * What it computes — all falsifiable, all deterministic (a hash-seeded damage ramp, NO rng, so a death
 * never perturbs the seeded population stream):
 *  - DEATH DREAM: hold the dying creature's last senses fixed; ramp weight perturbation d: 0 → 1; at each
 *    step forward-pass the damaged net and measure `novelty` = ‖out(d) − out(0)‖ (drift off its own
 *    policy) and `saturation` = how many outputs have locked to ±1 (tanh lock-up = neural noise-death).
 *    The DREAM VIVIDNESS is `novelty · (1 − saturation)` — high where the confabulation is novel yet still
 *    structured. Its PEAK step is the "lucid death-dream", its output the being's final hallucination.
 *  - DEVOUR: when a predator consumes a prey mid-firing, the predator ABSORBS a fraction of the prey's
 *    weights (a real Hebbian/Lamarckian weight-space interpolation — the eater inherits the eaten's
 *    policy) and we measure the mind-distance closed + the shift in the predator's own output.
 *  - COLLISION DISPERSAL: two colliding nets' weight vectors — the pre-collision distance is the "how
 *    alien were these two minds", and the devour is the partial merge; the rest disperses (is lost).
 *
 * A {@link GedankenLedger} accumulates the population-scale evidence (death count, mean dream vividness,
 * mean lucid-dream damage band, devour count + mean weight transfer) — the live research readout.
 *
 * Pure + leaf: depends only on the brain layout constants. Operates on the 70-weight BRAIN slice of a
 * genome (caller passes `genome.subarray(TRAIT_GENES)` — see entity-brain.ts). O(steps · 70).
 */
import { BRAIN_IN, BRAIN_HIDDEN, BRAIN_OUT, BRAIN_GENES } from './genome';

/** Damage-ramp resolution — steps of the neuronal-death sweep from intact (d≈0) to dissolved (d=1). */
export const DEATH_STEPS = 12;
/** Perturbation gain at full damage: additive weight noise ∈ ±NOISE_AMP·d (weights are O(1)). Matches the
 *  additive-jitter model of `EntityBrainField.perturbBrains`, scaled up to fully dissolve the policy. */
const NOISE_AMP = 2.6;

/** Deterministic ±1 hash for weight index `k` under seed `seed` — the fixed "which synapses fail first"
 *  pattern of a given death (no rng ⇒ reproducible, and it can never touch the seeded population golden). */
function synapseNoise(k: number, seed: number): number {
  const x = Math.sin((k + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return 2 * (x - Math.floor(x)) - 1;
}

/** Allocation-free `6→6→4` tanh forward (mirrors EntityBrainField.forward), reading the 70-weight BRAIN
 *  slice `w` (bias-first per neuron) with senses `s` into `out`, using `hid` scratch. */
export function brainForward(
  w: ArrayLike<number>,
  s: ArrayLike<number>,
  hid: Float32Array,
  out: Float32Array,
): void {
  let p = 0;
  for (let h = 0; h < BRAIN_HIDDEN; h++) {
    let acc = w[p++] ?? 0;
    for (let i = 0; i < BRAIN_IN; i++) acc += (w[p++] ?? 0) * (s[i] ?? 0);
    hid[h] = Math.tanh(acc);
  }
  for (let o = 0; o < BRAIN_OUT; o++) {
    let acc = w[p++] ?? 0;
    for (let h = 0; h < BRAIN_HIDDEN; h++) acc += (w[p++] ?? 0) * (hid[h] ?? 0);
    out[o] = Math.tanh(acc);
  }
}

/** The measured signature of one gedanken death — a being's final neural dissolution, quantified. */
export interface DeathDream {
  /** Per-step confabulation drift ‖out(d) − out(0)‖ across the damage ramp (length {@link DEATH_STEPS}). */
  novelty: Float32Array;
  /** Per-step tanh-saturation 0..1 (the net locking to ±1 — noise-death). */
  saturation: Float32Array;
  /** Peak of `novelty·(1−saturation)` — the vividness of the lucid death-dream (novel yet still coherent). */
  vividness: number;
  /** Normalised damage 0..1 at which vividness peaks — the "sweet spot" of the death hallucination. */
  lucidBand: number;
  /** The being's final hallucinated 4-output at the lucid peak (its last dream), copied out. */
  finalDream: Float32Array;
}

const _hid = new Float32Array(BRAIN_HIDDEN);
const _o0 = new Float32Array(BRAIN_OUT);
const _od = new Float32Array(BRAIN_OUT);
const _pw = new Float32Array(BRAIN_GENES);

/**
 * Run Thaler's death experiment on one dying being: hold `senses` fixed, ramp weight perturbation and
 * measure the confabulation. `brain` is the 70-weight BRAIN slice, `seed` fixes the (deterministic)
 * synaptic-failure order for this death. Pure; returns fresh arrays. O(DEATH_STEPS · 70).
 */
export function gedankenDeath(
  brain: ArrayLike<number>,
  senses: ArrayLike<number>,
  seed: number,
): DeathDream {
  brainForward(brain, senses, _hid, _o0); // intact baseline policy (d = 0)
  let base = 0;
  for (let o = 0; o < BRAIN_OUT; o++) base += (_o0[o] ?? 0) * (_o0[o] ?? 0);
  const baseMag = Math.sqrt(base) + 1e-6;

  const novelty = new Float32Array(DEATH_STEPS);
  const saturation = new Float32Array(DEATH_STEPS);
  let vividness = 0;
  let lucidBand = 0;
  const finalDream = new Float32Array(BRAIN_OUT);

  for (let step = 0; step < DEATH_STEPS; step++) {
    const d = (step + 1) / DEATH_STEPS;
    for (let k = 0; k < BRAIN_GENES; k++) {
      _pw[k] = (brain[k] ?? 0) + synapseNoise(k, seed) * d * NOISE_AMP;
    }
    brainForward(_pw, senses, _hid, _od);
    let dev = 0;
    let sat = 0;
    for (let o = 0; o < BRAIN_OUT; o++) {
      const diff = (_od[o] ?? 0) - (_o0[o] ?? 0);
      dev += diff * diff;
      // tanh lock-up: an output past ~0.9 magnitude is a saturated (noise-death) neuron.
      const a = Math.abs(_od[o] ?? 0);
      sat += a > 0.9 ? (a - 0.9) / 0.1 : 0;
    }
    const nov = Math.sqrt(dev) / baseMag; // normalised drift off its own policy
    const satN = sat / BRAIN_OUT; // 0 = structured, 1 = fully locked
    novelty[step] = nov;
    saturation[step] = satN > 1 ? 1 : satN;
    const lucid = nov * (1 - (satN > 1 ? 1 : satN)); // novel AND still coherent
    if (lucid > vividness) {
      vividness = lucid;
      lucidBand = d;
      finalDream.set(_od);
    }
  }
  return { novelty, saturation, vividness, lucidBand, finalDream };
}

/** The measured outcome of one being devouring another mid-firing. */
export interface DevourResult {
  /** Pre-collision weight-space distance ‖predator − prey‖ — how alien the two minds were. */
  mindDistance: number;
  /** ‖Δpredator‖ — how far the predator's policy shifted by absorbing the prey (weight transfer). */
  transfer: number;
}

/**
 * A predator devours a prey mid-firing: the predator's BRAIN weights move a fraction `alpha` toward the
 * prey's (a real Lamarckian weight-space interpolation — the eater inherits the eaten's learned policy).
 * MUTATES `predator` in place; returns the measured mind-distance closed + transfer magnitude. When the
 * predator is itself a being whose determinism matters, gate `alpha` behind a user gesture upstream.
 * Pure arithmetic (no rng). O(70).
 */
export function devour(
  predator: Float32Array,
  prey: ArrayLike<number>,
  alpha = 0.25,
): DevourResult {
  let dist = 0;
  let moved = 0;
  for (let k = 0; k < BRAIN_GENES; k++) {
    const pk = predator[k] ?? 0;
    const qk = prey[k] ?? 0;
    const diff = qk - pk;
    dist += diff * diff;
    const delta = alpha * diff;
    predator[k] = pk + delta;
    moved += delta * delta;
  }
  return { mindDistance: Math.sqrt(dist), transfer: Math.sqrt(moved) };
}

/**
 * Population-scale evidence accumulator — the live "real research" readout of the world's neural
 * dying/feeding. Cheap running means (no history buffers). Deterministic; no rng.
 */
export class GedankenLedger {
  /** Total gedanken deaths measured. */
  deaths = 0;
  /** Total devour (consumption) events measured. */
  devours = 0;
  private vividSum = 0;
  private bandSum = 0;
  private noveltyPeakSum = 0;
  private transferSum = 0;
  private mindDistSum = 0;

  /** Record one death's measured dream. O(1). */
  recordDeath(d: DeathDream): void {
    this.deaths++;
    this.vividSum += d.vividness;
    this.bandSum += d.lucidBand;
    let peak = 0;
    for (let i = 0; i < d.novelty.length; i++) peak = Math.max(peak, d.novelty[i] ?? 0);
    this.noveltyPeakSum += peak;
  }

  /** Record one consumption's measured transfer. O(1). */
  recordDevour(r: DevourResult): void {
    this.devours++;
    this.transferSum += r.transfer;
    this.mindDistSum += r.mindDistance;
  }

  /** Mean lucid-death-dream vividness across all deaths (0 until the first death). */
  get meanVividness(): number {
    return this.deaths > 0 ? this.vividSum / this.deaths : 0;
  }
  /** Mean damage band (0..1) at which the death-dream peaks — Thaler's "sweet spot", empirically. */
  get meanLucidBand(): number {
    return this.deaths > 0 ? this.bandSum / this.deaths : 0;
  }
  /** Mean peak confabulation-novelty across all deaths. */
  get meanNoveltyPeak(): number {
    return this.deaths > 0 ? this.noveltyPeakSum / this.deaths : 0;
  }
  /** Mean policy-shift a predator gained per devour (inherited cognition). */
  get meanTransfer(): number {
    return this.devours > 0 ? this.transferSum / this.devours : 0;
  }
  /** Mean pre-collision mind-distance across devours (how alien eaten minds were). */
  get meanMindDistance(): number {
    return this.devours > 0 ? this.mindDistSum / this.devours : 0;
  }

  /** Reset the ledger (world reset). O(1). */
  clear(): void {
    this.deaths = 0;
    this.devours = 0;
    this.vividSum = 0;
    this.bandSum = 0;
    this.noveltyPeakSum = 0;
    this.transferSum = 0;
    this.mindDistSum = 0;
  }
}
