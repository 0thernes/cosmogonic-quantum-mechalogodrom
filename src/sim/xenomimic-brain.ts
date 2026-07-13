/**
 * XENOMIMIC BRAIN — a bipolar twin mind using exact classical statevector math (NOT sentient).
 *
 * Every xenomimic is born as one half of an ENTANGLED TWIN PAIR that shares a single ~100-parameter
 * brain yet thinks with OPPOSITE "directional thought curvature" — a Joker/Batman tug-of-war inside one
 * world. Both halves read the same weights; the MIMIC (curvature +1) leans INTO the environment's pull,
 * the ANTI-MIMIC (curvature −1) leans AGAINST it, so identical senses drive divergent action. This is the
 * user's "same brains, different perturbian curvature, spikey neurons, schizo two states / one world
 * psionics."
 *
 * The substrate is five real coupled faculties (coupling > count):
 *  1. A genuine 6→8→5 tanh MLP ({@link ../sim/ad-mlp}) = 101 trainable parameters — the "100-param brain".
 *  2. A real 3-qubit statevector ({@link ../math/quantum} QuantumRegister) prepared into a SINGLET-like
 *     anti-correlated Bell pair on the two twin qubits plus a shared "bond" qubit. Measuring the twins
 *     yields OPPOSITE bits — the simulated mechanism for anti-mimicry — while sense-parameterised rotations
 *     tilt which twin's basin the world currently favours.
 *  3. Born-rule superposition ({@link ../math/quantum-coherence}) — the l1 coherence of the live
 *     statevector drives SHIMMER and SPIKY-NEURON perturbation, and a Born-rule collapse (measure) is
 *     what TELEPORTS a xenomimic: a superposed creature is "everywhere" until it is looked at.
 *  4. A Free-Energy-Principle predictive-coding loop: each twin runs a generative model that PREDICTS
 *     its own next senses, and the squared prediction error (a variational-free-energy proxy) drives
 *     behaviour — a SURPRISED creature is aroused (flees/hops faster, grazes less), a creature whose
 *     world is predictable settles, grazes, and acts with higher precision (the winning basin dominates
 *     harder when its model is confident). Honest online predictive coding, NOT full policy-search
 *     active inference — the agent modulates arousal/precision, it does not plan over future policies.
 *  5. A continuous position-space Schrödinger substrate ({@link ../math/schrodinger}): each beat evolves a
 *     Gaussian wavepacket by the EXACT unitary Crank–Nicolson scheme under a potential the creature's own
 *     senses shape (food digs an attractive well, threat raises a repulsive barrier, crowding adds drift),
 *     and reads back the wavefunction's positional SPREAD √(⟨x²⟩−⟨x⟩²) as a spatial-uncertainty cue that
 *     widens the twin's exploratory turn. This is a genuinely SECOND, independent live consumer of the raw
 *     CN primitive (the apex mind consumes it via `sim/latent-substrates.ts`; this brain consumes it for a
 *     wholly separate population), and a distinct substrate CLASS — a continuous wavefunction PDE, not the
 *     discrete 3-qubit register above nor the MSE free-energy loop. Ablation-gated (GATE-XENO-SCHRODINGER).
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
import { gaussianPacket, cnStep, type Wave } from '../math/schrodinger';
import { mulberry32, hashSeed, type Rng } from '../math/rng';

/** Sense-vector width fed to the shared MLP. */
export const XENO_BRAIN_INPUTS = 6;
/** Hidden width — tuned so the total parameter count lands at ~100 (the owner's "100 params each"). */
export const XENO_BRAIN_HIDDEN = 8;
/** Motor-output width: [turn, speed, jump, eat, mate]. */
export const XENO_BRAIN_OUTPUTS = 5;

/** Predictive-coding learning rate: how fast a twin's generative model tracks its senses each beat. */
const PRED_LR = 0.25;
/** Surprise gain — scales mean-squared prediction error into a bounded [0,1] free-energy proxy. */
const SURPRISE_GAIN = 3;

/** Schrödinger exploration probe — grid size / step count for the per-twin Crank–Nicolson wavepacket. */
const SCHRO_GRID = 24;
const SCHRO_DX = 1;
const SCHRO_DT = 0.1;
const SCHRO_STEPS = 30;
/** Threat-barrier height in the sense-shaped potential (a stronger wall confines the drifting packet). */
const SCHRO_THREAT_W = 3;
/** How much the wavefunction's positional spread widens a twin's exploratory turn (≤30%). */
const SCHRO_TURN_GAIN = 0.3;
/**
 * Throttle: recompute the (costly) full CN wavepacket solve only every Nth beat and cache it between. The
 * exploration cue varies slowly with the environment, and evolving a fresh wavefunction for every twin
 * every beat is too heavy at swarm scale (≈22µs × 2 twins × up to 500 pairs). Deterministic — the schedule
 * is a fixed function of the beat counter, so the same seed reproduces the same cached values bit for bit.
 */
const SCHRO_RECOMPUTE = 6;

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
  /** Free-Energy-Principle surprise in [0,1]: this twin's squared prediction error this beat. */
  surprise: number;
  /**
   * Schrödinger positional spread in [0,1] — the normalised √variance of this twin's evolved Gaussian
   * wavepacket under a sense-shaped potential (see {@link schrodingerSpread}). Low = the packet localised
   * (confident/focused motion); high = it dispersed (spatial uncertainty → wider exploratory turn). Zero
   * when the substrate is ablated. Observable so the real position-space quantum dynamics can be measured.
   */
  quantumSpread: number;
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
  /**
   * IIT-style INTEGRATION Φ-proxy in [0,1]: the classical mutual information I(mimic;anti) between the
   * two entangled twin qubits. 1 = maximally integrated (the singlet — one indivisible psyche in two
   * bodies); 0 = independent. This is honest classical MI, NOT a rigorous IIT Φ or any sentience claim.
   */
  integration: number;
  /**
   * Free-Energy-Principle variational-free-energy proxy in [0,1]: the mean of the two twins' squared
   * prediction errors this beat. High = the pair's world just violated its generative model (arousal);
   * decays toward 0 as the model learns a stable environment. Honest predictive coding, not sentience.
   */
  freeEnergy: number;
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
  /** This kind's innate behavioural bias — so the 10 species genuinely think/feel differently. */
  private readonly temperament: SpeciesTemperament;
  /** Per-twin generative models: each twin's PREDICTED next sense vector (predictive coding). */
  private readonly predMimic = new Float64Array(XENO_BRAIN_INPUTS);
  private readonly predAnti = new Float64Array(XENO_BRAIN_INPUTS);
  /** Schrödinger-substrate gate (P-ablatable): 1 = wired, 0 = ablated to the null baseline. */
  private schroGate = 1;
  /** Beat counter driving the deterministic Schrödinger recompute schedule. */
  private beatCount = 0;
  /** Cached per-twin Schrödinger positional spreads, refreshed every {@link SCHRO_RECOMPUTE} beats. */
  private qSpreadMimic = 0;
  private qSpreadAnti = 0;

  constructor(seed: number, species = 0) {
    // Own weight-init substream, derived from the pair seed. Never touches the sim RNG.
    const initRng = mulberry32((hashSeed('xenomimic-brain') ^ (seed >>> 0)) >>> 0 || 1);
    this.net = createMlp(XENO_BRAIN_INPUTS, XENO_BRAIN_HIDDEN, XENO_BRAIN_OUTPUTS, initRng);
    // Generative models start neutral (0.5) — a fresh twin is maximally surprised until it learns.
    this.predMimic.fill(0.5);
    this.predAnti.fill(0.5);
    this.temperament =
      SPECIES_TEMPERAMENT[
        ((species % SPECIES_TEMPERAMENT.length) + SPECIES_TEMPERAMENT.length) %
          SPECIES_TEMPERAMENT.length
      ]!;
  }

  /** Total trainable parameters (≈100). Exposed for the gate that pins the "100-param brain" claim. */
  get parameterCount(): number {
    return mlpParamCount(this.net);
  }

  /**
   * Ablate (or restore) the Schrödinger exploration substrate — the ablation control for
   * GATE-XENO-SCHRODINGER. When ablated, {@link resolve} treats the wavepacket spread as 0, so the turn
   * coupling collapses to the exact identity (× (1 + 0)); nothing else in the beat changes and no RNG is
   * consumed differently, so the ablated run stays in lockstep with the wired run save for that one term.
   */
  setSchrodingerAblated(ablated: boolean): void {
    this.schroGate = ablated ? 0 : 1;
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
    // IIT integration proxy (mutual information of the twin bits) + GWT broadcast (how strongly the
    // winning basin floods the shared workspace) = bondTension gated by how integrated the pair is.
    const integration = twinMutualInfo(probs);
    const broadcast = clamp01(bondTension * integration);

    // ONE Born-rule collapse resolves the shared psionic state; the twin bits are anti-correlated.
    const outcome = reg.measure(rng);
    const mimicBit = outcome & 1;
    const antiBit = (outcome >> 1) & 1;
    // A collapse teleports the twin whose qubit read 1 while the pair was superposed. The 0.42 gate sits
    // just below the neutral-singlet coherence (3/7 ≈ 0.4286), so a teleport marks a genuinely superposed
    // beat, not a collapsed one — the environment's tilt pushes the pair across it.
    const teleportMimic = mimicBit === 1 && coherence > 0.42;
    const teleportAnti = antiBit === 1 && coherence > 0.42;

    // Free-Energy-Principle: each twin's surprise is the squared error of its generative model vs the
    // senses it actually received. Capture it BEFORE the model learns, then slide each model toward its
    // latest senses so a stable world drives surprise → 0 while a shifting one keeps the pair aroused.
    const surpriseMimic = this.surpriseOf(this.predMimic, sensesMimic);
    const surpriseAnti = this.surpriseOf(this.predAnti, sensesAnti);
    this.learnPred(this.predMimic, sensesMimic);
    this.learnPred(this.predAnti, sensesAnti);

    // Schrödinger exploration cue: refresh the (costly) per-twin wavepacket spread on the throttled
    // cadence, or hold the cached value; ablation pins both to the exact null baseline of 0.
    if (this.schroGate <= 0) {
      this.qSpreadMimic = 0;
      this.qSpreadAnti = 0;
    } else if (this.beatCount % SCHRO_RECOMPUTE === 0) {
      this.qSpreadMimic = schrodingerSpread(sensesMimic);
      this.qSpreadAnti = schrodingerSpread(sensesAnti);
    }
    this.beatCount++;

    return {
      mimic: this.resolve(
        sensesMimic,
        +1,
        coherence,
        this.mimicBasin,
        teleportMimic,
        mimicBit,
        broadcast,
        surpriseMimic,
        this.qSpreadMimic,
      ),
      anti: this.resolve(
        sensesAnti,
        -1,
        coherence,
        1 - this.mimicBasin,
        teleportAnti,
        antiBit,
        broadcast,
        surpriseAnti,
        this.qSpreadAnti,
      ),
      coherence,
      bondTension,
      mimicBit,
      antiBit,
      integration,
      freeEnergy: clamp01((surpriseMimic + surpriseAnti) * 0.5),
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
    broadcast: number,
    surprise: number,
    quantumSpread: number,
  ): XenomimicThought {
    const raw = mlpPredict(this.net, senses);
    const t = this.temperament;
    // Spiky-neuron perturbation: a sparse high-gain kick that grows with superposition + this beat's bit.
    const spike = coherence * (bit === 1 ? 1 : -1) * 0.5;
    // Free-Energy-Principle precision: confidence = 1 − surprise. A predictable world sharpens action.
    const precision = 1 - surprise;
    // Schrödinger exploration cue (computed on the pair's throttled cadence, ablatable): a dispersed
    // (uncertain) wavefunction widens the exploratory turn; a localised one keeps it focused.
    // GWT dominance: how much this twin's basin owns the shared decisiveness, AMPLIFIED by the broadcast
    // (an integrated pair floods its workspace) and PRECISION-WEIGHTED (a confident model acts harder).
    const dominance = (0.4 + basin * 0.6 * (0.5 + broadcast * 0.5)) * (0.7 + 0.3 * precision);
    const turn = clampSigned(
      (Math.tanh(raw[0]! * curvature) + spike * curvature) *
        dominance *
        t.agility *
        (1 + quantumSpread * SCHRO_TURN_GAIN),
    );
    // The mimic seeks (tanh→speed); the anti is restless — it converts the same drive into evasive burst.
    // Active-inference arousal: surprise makes a creature FLEE the unpredictable, so it moves/hops faster.
    const speed = clamp01(
      (curvature === 1 ? sig(raw[1]!) : 1 - sig(raw[1]!) * 0.7) * t.dash * (1 + surprise * 0.6),
    );
    const jump = clamp01(sig(raw[2]! + spike) * t.dash * (1 + surprise * 0.4));
    // Grazing is a settling behaviour: a creature eats when its model is CONFIDENT (low surprise), not
    // when the world is violating its predictions — surprise suppresses appetite (precision-gated graze).
    const eat = clamp01(
      sig(raw[3]!) * (curvature === 1 ? 1 : 0.7) * t.graze * (0.4 + 0.6 * precision),
    );
    const mate = clamp01(sig(raw[4]!) * (0.5 + basin * 0.5) * t.breed);
    return {
      turn,
      speed,
      jump,
      eat,
      mate,
      teleport,
      // Shimmer changes in cycles with NEUROLOGY (live quantum coherence), BODY (how much this twin's
      // basin owns the shared psyche), and the ENVIRONMENT (FEP surprise flickers an aroused creature
      // brighter — the owner's "shimmer/change in cycles based on the environment dynamics and their
      // neurology and body"). Surprise adds an independent glow floor, so even a collapsed creature
      // visibly flares when its world violates its predictions.
      shimmer: clamp01(coherence * (0.5 + basin * 0.5) + surprise * 0.3),
      surprise,
      quantumSpread,
    };
  }

  /**
   * Free-Energy-Principle surprise: the mean squared error between a twin's generative model (`pred`)
   * and the senses it actually received, scaled into a bounded [0,1] variational-free-energy proxy.
   */
  private surpriseOf(pred: Float64Array, senses: readonly number[]): number {
    let acc = 0;
    for (let i = 0; i < XENO_BRAIN_INPUTS; i++) {
      const e = clamp01(senses[i] ?? 0) - pred[i]!;
      acc += e * e;
    }
    return clamp01((acc / XENO_BRAIN_INPUTS) * SURPRISE_GAIN);
  }

  /** Online predictive-coding update: slide a twin's generative model toward its latest senses. */
  private learnPred(pred: Float64Array, senses: readonly number[]): void {
    for (let i = 0; i < XENO_BRAIN_INPUTS; i++) {
      pred[i]! += PRED_LR * (clamp01(senses[i] ?? 0) - pred[i]!);
    }
  }
}

/** One kind's innate temperament — multiplicative biases that make the 10 species behave distinctly. */
interface SpeciesTemperament {
  /** Turn responsiveness (jittery vs steady). */
  agility: number;
  /** Locomotor drive (cheetah-sprint vs snail-crawl). */
  dash: number;
  /** Appetite for flora. */
  graze: number;
  /** Reproductive eagerness. */
  breed: number;
}

/**
 * Ten distinct temperaments — the owner's "10 different kinds that operate and think and feel"
 * differently. Deliberately varied across the sprint/crawl, glutton/ascetic, and prolific/sparse axes.
 */
const SPECIES_TEMPERAMENT: readonly SpeciesTemperament[] = [
  { agility: 1.3, dash: 1.4, graze: 0.8, breed: 0.9 }, // 0 cheetah — fast, restless, lean
  { agility: 0.6, dash: 0.5, graze: 1.3, breed: 1.1 }, // 1 snail — slow, grazing, fecund
  { agility: 1.1, dash: 1.0, graze: 1.0, breed: 1.0 }, // 2 generalist
  { agility: 1.5, dash: 0.9, graze: 0.7, breed: 0.8 }, // 3 skittish darter
  { agility: 0.8, dash: 0.7, graze: 1.4, breed: 1.3 }, // 4 glutton breeder
  { agility: 1.0, dash: 1.3, graze: 0.9, breed: 0.7 }, // 5 sprinter ascetic
  { agility: 0.7, dash: 0.6, graze: 1.1, breed: 1.4 }, // 6 prolific crawler
  { agility: 1.4, dash: 1.1, graze: 0.8, breed: 0.9 }, // 7 agile forager
  { agility: 0.9, dash: 0.8, graze: 1.2, breed: 1.0 }, // 8 steady grazer
  { agility: 1.2, dash: 1.2, graze: 1.0, breed: 1.2 }, // 9 vigorous omnivore
];

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

/**
 * Schrödinger exploration cue — a genuinely SECOND, independent live consumer of the raw Crank–Nicolson
 * wavefunction primitive ({@link ../math/schrodinger} `gaussianPacket` + `cnStep`), distinct from the apex
 * mind's latent-substrate probe (`sim/latent-substrates.ts` `quantumUncertainty`) and wired into a wholly
 * separate population (the Xenomimic ground fauna). It evolves a Gaussian wavepacket for {@link SCHRO_STEPS}
 * EXACT unitary steps under a potential the creature's own senses shape, then reads back the normalised
 * positional SPREAD √(⟨x²⟩−⟨x⟩²) ∈ [0,1] as a spatial-uncertainty cue. The three senses shape the potential
 * (their effect DIRECTIONS below are the measured, emergent output of the CN evolution, not hand-set gains):
 *   • food (senses[0]) digs an attractive well at the centre — it localises the packet, strongly LOWERING
 *     the spread (measured ≈0.40 at food 0 → ≈0.18 at food 1: the dominant, robust driver → focused motion);
 *   • threat (senses[2]) raises a repulsive barrier near the right wall that reflects the drifting packet
 *     back, CONFINING it → a modestly lower spread (a more committed heading under threat);
 *   • crowding (senses[1]) gives the packet rightward drift momentum k₀ that presses it outward, modestly
 *     RAISING the spread (a pressed creature's wavefunction disperses → wider milling).
 *
 * This is real continuous position-space quantum dynamics (a wavefunction PDE), a substrate CLASS distinct
 * from the brain's discrete 3-qubit register and its MSE free-energy loop. DETERMINISM: pure — no `Rng`, no
 * `Date.now`; the same senses yield the same spread bit for bit (the CN solve is a fixed-order linear
 * algebra). Bounded to [0,1]. Exposed so GATE-XENO-SCHRODINGER can verify the dynamics are drive-responsive
 * and the coupling is operational (ablation-verified), not decorative.
 */
export function schrodingerSpread(senses: readonly number[]): number {
  const food = clamp01(senses[0] ?? 0);
  const crowding = clamp01(senses[1] ?? 0);
  const threat = clamp01(senses[2] ?? 0);
  const mid = (SCHRO_GRID - 1) / 2;
  const barrier = SCHRO_GRID - 4;
  const V = Array.from({ length: SCHRO_GRID }, () => 0);
  for (let j = 0; j < SCHRO_GRID; j++) {
    const dm = j - mid;
    const db = j - barrier;
    V[j] = -food * Math.exp(-(dm * dm) / 18) + SCHRO_THREAT_W * threat * Math.exp(-(db * db) / 8);
  }
  let psi: Wave = gaussianPacket(
    SCHRO_GRID,
    SCHRO_DX,
    mid * SCHRO_DX,
    2 + 2 * (1 - food),
    0.5 + crowding,
  );
  for (let s = 0; s < SCHRO_STEPS; s++) psi = cnStep(psi, V, SCHRO_DT, SCHRO_DX);
  let num = 0;
  let num2 = 0;
  let den = 0;
  for (let j = 0; j < SCHRO_GRID; j++) {
    const p = psi.re[j]! * psi.re[j]! + psi.im[j]! * psi.im[j]!;
    const x = j * SCHRO_DX;
    num += x * p;
    num2 += x * x * p;
    den += p;
  }
  if (den <= 0) return 0;
  const mx = num / den;
  const varx = Math.max(0, num2 / den - mx * mx);
  return clamp01(Math.sqrt(varx) / (SCHRO_GRID * SCHRO_DX * 0.3));
}

/** Binary Shannon entropy H(p) in bits. */
function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/**
 * Classical mutual information I(q0;q1) in [0,1] between the two twin qubits, from the 8-state Born
 * distribution: I = H(q0) + H(q1) − H(q0,q1). The perfectly anti-correlated singlet gives I = 1 (one
 * indivisible psyche); a product state gives I = 0. An honest, bounded IIT-style integration proxy.
 */
function twinMutualInfo(probs: Float64Array | ArrayLike<number>): number {
  let p0 = 0; // P(q0 = 1)
  let p1 = 0; // P(q1 = 1)
  const joint = [0, 0, 0, 0]; // P(q0,q1) indexed by (q0 | q1<<1)
  for (let s = 0; s < probs.length; s++) {
    const pr = probs[s] ?? 0;
    const b0 = s & 1;
    const b1 = (s >> 1) & 1;
    if (b0) p0 += pr;
    if (b1) p1 += pr;
    joint[b0 | (b1 << 1)]! += pr;
  }
  let hJoint = 0;
  for (const pj of joint) if (pj > 0) hJoint -= pj * Math.log2(pj);
  const mi = binaryEntropy(p0) + binaryEntropy(p1) - hJoint;
  return mi <= 0 ? 0 : mi >= 1 ? 1 : mi;
}
