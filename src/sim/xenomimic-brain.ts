/**
 * XENOMIMIC BRAIN — a bipolar entangled twin mind (real math, NOT sentient).
 *
 * Every xenomimic is born as one half of an ENTANGLED TWIN PAIR that shares a single ~100-parameter
 * brain yet thinks with OPPOSITE "directional thought curvature" — a Joker/Batman tug-of-war inside one
 * world. Both halves read the same weights; the MIMIC (curvature +1) leans INTO the environment's pull,
 * the ANTI-MIMIC (curvature −1) leans AGAINST it, so identical senses drive divergent action. This is the
 * user's "same brains, different perturbian curvature, spikey neurons, schizo two states / one world
 * psionics."
 *
 * The substrate is three real Tsotchke faculties, coupled (coupling > count):
 *  1. A genuine 6→8→5 tanh MLP ({@link ../sim/ad-mlp}) = 101 trainable parameters — the "100-param brain".
 *  2. A real 3-qubit statevector ({@link ../math/quantum} QuantumRegister) prepared into a SINGLET-like
 *     anti-correlated Bell pair on the two twin qubits plus a shared "bond" qubit. Measuring the twins
 *     yields OPPOSITE bits — the physical root of the anti-mimicry — while sense-parameterised rotations
 *     tilt which twin's basin the world currently favours.
 *  3. Born-rule superposition ({@link ../math/quantum-coherence}) — the l1 coherence of the live
 *     statevector drives SHIMMER and SPIKY-NEURON perturbation, and a Born-rule collapse (measure) is
 *     what TELEPORTS a xenomimic: a superposed creature is "everywhere" until it is looked at.
 *
 * Determinism: pure. The only stochasticity is the injected {@link Rng} passed to {@link beat} (the
 * population's dedicated substream) used by the Born-rule measurement; no Math.random / Date.now.
 *
 * HONESTY: quantum superposition here is a deterministic classical statevector, and the MLP is a bounded
 * function approximator. Nothing here is phenomenally conscious — it is operational control math dressed
 * in the theory it is named for.
 */
import { createMlp, mlpPredict, mlpParamCount, type Mlp } from './ad-mlp';
import { QuantumRegister } from '../math/quantum';
import { quantumCoherence } from '../math/quantum-coherence';
import { mulberry32, hashSeed, type Rng } from '../math/rng';

/** Sense-vector width fed to the shared MLP. */
export const XENO_BRAIN_INPUTS = 6;
/** Hidden width — tuned so the total parameter count lands at ~100 (the owner's "100 params each"). */
export const XENO_BRAIN_HIDDEN = 8;
/** Motor-output width: [turn, speed, jump, eat, mate]. */
export const XENO_BRAIN_OUTPUTS = 5;

/** One twin's resolved intent for a beat. All fields finite and bounded. */
export interface XenomimicThought {
  /** Heading change in [-1,1] (× the creature's turn rate). */
  turn: number;
  /** Forward drive in [0,1] (× max speed). */
  speed: number;
  /** Upward hop impulse in [0,1] (gated by the creature's ground contact). */
  jump: number;
  /** Appetite for grazing flora in [0,1]. */
  eat: number;
  /** Reproductive drive in [0,1]. */
  mate: number;
  /** Set when this beat's Born-rule collapse teleported the creature (superposition made real). */
  teleport: boolean;
  /** Shimmer phase in [0,1] driven by live quantum coherence — feeds the render sparkle. */
  shimmer: number;
}

/** Both twins resolved from one shared entangled beat, plus the pair-level couplings. */
export interface XenomimicBeat {
  mimic: XenomimicThought;
  anti: XenomimicThought;
  /** l1 coherence of the live 3-qubit statevector in [0,1] — how "superposed" the pair is right now. */
  coherence: number;
  /** |P(mimic wins) − P(anti wins)| in [0,1] — the tug-of-war tension between the two basins. */
  bondTension: number;
  /** Collapsed psionic bit of the mimic twin (0|1) — the singlet guarantees it differs from {@link antiBit}. */
  mimicBit: number;
  /** Collapsed psionic bit of the anti twin (0|1). */
  antiBit: number;
}

const clamp01 = (v: number): number => (!Number.isFinite(v) || v <= 0 ? 0 : v >= 1 ? 1 : v);
const clampSigned = (v: number): number =>
  !Number.isFinite(v) ? 0 : v <= -1 ? -1 : v >= 1 ? 1 : v;

/**
 * Shared brain of one twin pair. Construct once per pair; call {@link beat} on the pair cadence with
 * both twins' senses to resolve a synchronized, entangled decision for the whole pair.
 */
export class XenomimicBrain {
  private readonly net: Mlp;
  /** qubit 0 = mimic psyche · qubit 1 = anti psyche · qubit 2 = shared bond. */
  private readonly reg = new QuantumRegister(3);
  private readonly re = new Float64Array(8);
  private readonly im = new Float64Array(8);
  /** Latest Born-rule tilt toward the mimic basin in [0,1] (from the last prepared statevector). */
  private mimicBasin = 0.5;

  constructor(seed: number) {
    // Own weight-init substream, derived from the pair seed. Never touches the sim RNG.
    const initRng = mulberry32((hashSeed('xenomimic-brain') ^ (seed >>> 0)) >>> 0 || 1);
    this.net = createMlp(XENO_BRAIN_INPUTS, XENO_BRAIN_HIDDEN, XENO_BRAIN_OUTPUTS, initRng);
  }

  /** Total trainable parameters (≈100). Exposed for the gate that pins the "100-param brain" claim. */
  get parameterCount(): number {
    return mlpParamCount(this.net);
  }

  /**
   * Prepare the entangled statevector for this beat and resolve BOTH twins.
   *
   * Statevector recipe (all exact gates): start |000⟩ → H(0), CX(0,1), X(1) makes the singlet-like
   * anti-correlated pair (|01⟩+|10⟩)/√2 on the twin qubits (measuring them yields OPPOSITE bits) →
   * H(2), CZ(2,0) phase-entangles the shared bond → RY(0,+θ) and RY(1,−θ) tilt the pair with the
   * environment (θ from the mean sense drive × curvature) so the world biases which twin's basin wins.
   */
  beat(sensesMimic: readonly number[], sensesAnti: readonly number[], rng: Rng): XenomimicBeat {
    const reg = this.reg;
    reg.reset();
    reg.apply('h', 0);
    reg.apply('cx', 1, 0);
    reg.apply('x', 1);
    reg.apply('h', 2);
    reg.apply('cz', 0, 2);
    // Environmental tilt: a rousing world (high mean drive) rotates the pair toward the mimic basin.
    const tilt = clamp01((meanDrive(sensesMimic) + meanDrive(sensesAnti)) * 0.5);
    const theta = (tilt - 0.5) * Math.PI; // [-π/2, π/2]
    reg.apply('ry', 0, undefined, theta);
    reg.apply('ry', 1, undefined, -theta);

    reg.amplitudesInto(this.re, this.im);
    const coherence = clamp01(quantumCoherence(this.re, this.im).l1Norm);
    // Born-rule probability that the mimic qubit reads 1 (its basin "wins") = Σ|amp|² over states with bit0 set.
    const probs = reg.probabilities();
    let pMimic = 0;
    for (let s = 0; s < probs.length; s++) if (s & 1) pMimic += probs[s]!;
    this.mimicBasin = clamp01(pMimic);
    const bondTension = clamp01(Math.abs(this.mimicBasin - 0.5) * 2);

    // ONE Born-rule collapse resolves the shared psionic state; the twin bits are anti-correlated.
    const outcome = reg.measure(rng);
    const mimicBit = outcome & 1;
    const antiBit = (outcome >> 1) & 1;
    // A collapse teleports the twin whose qubit read 1 while the pair was superposed. The 0.42 gate sits
    // just below the neutral-singlet coherence (3/7 ≈ 0.4286), so a teleport marks a genuinely superposed
    // beat, not a collapsed one — the environment's tilt pushes the pair across it.
    const teleportMimic = mimicBit === 1 && coherence > 0.42;
    const teleportAnti = antiBit === 1 && coherence > 0.42;

    return {
      mimic: this.resolve(sensesMimic, +1, coherence, this.mimicBasin, teleportMimic, mimicBit),
      anti: this.resolve(sensesAnti, -1, coherence, 1 - this.mimicBasin, teleportAnti, antiBit),
      coherence,
      bondTension,
      mimicBit,
      antiBit,
    };
  }

  /**
   * Map one twin's senses through the shared MLP under its curvature. The anti-twin (curvature −1)
   * inverts the heading and flips exploit↔avoid — the "opposite of mimicry". Live quantum coherence adds
   * a SPIKY-NEURON perturbation: the more superposed the pair, the sharper the sparse spike injected into
   * the motor drive (quantum→neural coupling). `basin` weights how much this twin's basin currently owns
   * the shared decisiveness.
   */
  private resolve(
    senses: readonly number[],
    curvature: 1 | -1,
    coherence: number,
    basin: number,
    teleport: boolean,
    bit: number,
  ): XenomimicThought {
    const raw = mlpPredict(this.net, senses);
    // Spiky-neuron perturbation: a sparse high-gain kick that grows with superposition + this beat's bit.
    const spike = coherence * (bit === 1 ? 1 : -1) * 0.5;
    const turn = clampSigned(
      (Math.tanh(raw[0]! * curvature) + spike * curvature) * (0.4 + basin * 0.6),
    );
    // The mimic seeks (tanh→speed); the anti is restless — it converts the same drive into evasive burst.
    const speed = clamp01(curvature === 1 ? sig(raw[1]!) : 1 - sig(raw[1]!) * 0.7);
    const jump = clamp01(sig(raw[2]! + spike));
    const eat = clamp01(sig(raw[3]!) * (curvature === 1 ? 1 : 0.7));
    const mate = clamp01(sig(raw[4]!) * (0.5 + basin * 0.5));
    return {
      turn,
      speed,
      jump,
      eat,
      mate,
      teleport,
      shimmer: clamp01(coherence * (0.5 + basin * 0.5)),
    };
  }
}

/** Logistic squash to (0,1). */
function sig(x: number): number {
  return 1 / (1 + Math.exp(-clampSigned(x) * 3));
}

/** Mean of the (already 0..1-ish) sense drives, clamped — the pair's environmental "rousing". */
function meanDrive(senses: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < senses.length; i++) s += clamp01(senses[i] ?? 0);
  return senses.length > 0 ? s / senses.length : 0;
}
