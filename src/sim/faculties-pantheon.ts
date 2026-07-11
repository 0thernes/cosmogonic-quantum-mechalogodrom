/**
 * FACULTIES PANTHEON — the canonical 100-faculty NHSI design PLUS a brutal-god layer, 144 named total.
 * Canonical design target = 100 (the published headline); `FACULTY_NAMES` adds the god-layer (Valkorion
 * … Riddick) on top, so `FACULTY_COUNT === 144`. The 144 is internal only — it is never surfaced as a
 * "faculty count" (no consumer reads `FACULTY_COUNT`), so public surfaces correctly publish 100.
 *
 * This module is intentionally compact: every faculty has a distinct deterministic profile, but they all
 * share one strict implementation so the faculty surface stays maintainable and gate-clean.
 */

import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { structuredCouplingModulationInto } from './coupling-audit';
import { createMlp, mlpPredict, mlpTrainStep, type Mlp } from './ad-mlp';

const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

// ── ONLINE SELF-MODEL + ADAPTIVE COUPLING (the part of NHSI that DEVELOPS during a run) ─────────────
const NHSI_GROUPS = 8; // self-model input: the 144 faculties downsampled to 8 group means
const NHSI_WM_HID = 6; // self-model hidden width
const NHSI_WM_TAU = 0.05; // EMA smoothing for the self-prediction error
const NHSI_WM_LR = 0.05; // default gradient-descent step
const NHSI_BASE_COUPLING = 0.07; // the fixed baseline blend gain (unchanged when learning is off)
const NHSI_SURPRISE_GAIN = 3.0; // how strongly self-model surprise raises the coupling gain
const NHSI_MAX_COUPLING = 0.22; // cap on the adaptive gain (below blendCoupling's own 0.25 clamp)
/** Learnable params the pantheon self-model adds when lit: (groups·h + h) + (h·1 + 1). */
export const NHSI_SELFMODEL_PARAMS = NHSI_GROUPS * NHSI_WM_HID + NHSI_WM_HID + (NHSI_WM_HID + 1);

// ── SPATIAL ATTENTION (pass 4) — a SECOND self-model that forecasts the per-GROUP activation profile
// (not just the scalar aggregate). Each group's forecast error becomes a LOCAL coupling multiplier: the
// pantheon integrates the faculty groups it fails to predict MORE (learned attention to the surprising)
// and relaxes toward neutral where it models itself well. Distinct from the batch-30 GLOBAL adaptive gain.
const NHSI_ATTN_HID = 6; // attention self-model hidden width (groups→h→groups profile forecaster)
const NHSI_ATTN_GAIN = 2.5; // how strongly a group's self-prediction error amplifies its coupling
const NHSI_ATTN_MAX = 1.8; // cap on a group's attention multiplier (× the global adaptive gain)
/** Learnable params the attention model adds when lit: (groups·h + h) + (h·groups + groups). */
export const NHSI_ATTENTION_PARAMS =
  NHSI_GROUPS * NHSI_ATTN_HID + NHSI_ATTN_HID + (NHSI_ATTN_HID * NHSI_GROUPS + NHSI_GROUPS);

export const FACULTY_NAMES = [
  'GLOBAL_WORKSPACE_IGNITION',
  'INTEGRATED_INFORMATION_PHI',
  'ACTIVE_INFERENCE_FEP',
  'ECHO_STATE_RESERVOIR',
  'METACOGNITIVE_EXECUTIVE',
  'THEORY_OF_MIND',
  'NEURAL_CRITICALITY',
  'SUCCESSOR_REPRESENTATION',
  'EMPOWERMENT_DRIVE',
  'NEUROMODULATION',
  'HOLOGRAPHIC_MEMORY',
  'STATEVECTOR_REGISTER',
  'ESHKOL_QRNG',
  'QGT_FUBINI_STUDY',
  'QUANTUM_NATURAL_GRADIENT',
  'GROVER_AMPLIFICATION',
  'QUANTUM_COHERENCE',
  'QUANTUM_MAGIC',
  'REGISTER_PHI',
  'QUANTUM_DELIBERATION',
  'QUANTUM_RESERVOIR',
  'SPIN_GLASS_INSTINCT',
  'CLIFFORD_TABLEAU',
  'RESONANCE_INTEGRATOR',
  'DIGITAL_BIOLOGICS',
  'ATTENTION_SCHEMA',
  'QUALITY_SPACE',
  'TOPDOWN_PERCEPTION',
  'ESHKOL_BRIDGE',
  'ATTENTION_CONTROLLER',
  'NQS_VMC_LEARNING',
  'CLASSICAL_PHI_EXTENDED',
  'SELF_MODEL_ACCURACY',
  'TEMPORAL_MEMORY',
  'EPISODIC_BUFFER',
  'WORKING_MEMORY',
  'LONG_TERM_MEMORY',
  'SEMANTIC_MEMORY',
  'PROCEDURAL_MEMORY',
  'SPATIAL_MEMORY',
  'EPISODIC_FUTURE_SIMULATION',
  'METAMEMORY',
  'AUTOBIOGRAPHICAL_MEMORY',
  'COLLECTIVE_MEMORY',
  'GOAL_HIERARCHY',
  'MEANS_ENDS_ANALYSIS',
  'TEMPORAL_PLANNING',
  'HIERARCHICAL_PLANNING',
  'INTENTIONAL_PLANNING',
  'CONTINGENCY_PLANNING',
  'RESOURCE_ALLOCATION',
  'OPPORTUNITY_COST',
  'RISK_ASSESSMENT',
  'UNCERTAINTY_QUANTIFICATION',
  'DECISION_CONFIDENCE',
  'COMMITMENT_MECHANISM',
  'HEBBIAN_PLASTICITY',
  'REINFORCEMENT_LEARNING',
  'UNSUPERVISED_LEARNING',
  'TRANSFER_LEARNING',
  'META_LEARNING',
  'LIFELONG_LEARNING',
  'ONE_SHOT_LEARNING',
  'CONTINUAL_LEARNING',
  'ADAPTIVE_LEARNING_RATE',
  'CURRICULUM_LEARNING',
  'SOCIAL_LEARNING',
  'GROUP_IDENTIFICATION',
  // BRUTALIST GOD POWERS — Valkorion / Thanos / Broly / Azathoth / Dark Phoenix / Knull / Chaos Gods / Galactus / Shuma / Mxyzptlk / IT / etc. levels. Powered by full Tsotchke.
  'VOID_CONSUMPTION_KNULL',
  'RAGE_ESCALATION_BROLY',
  'CHAOS_ENTROPY_WARHAMMER',
  'PHOENIX_REBIRTH_DARK',
  'DOMINATION_POSSESSION_VALKORION',
  'REALITY_WARP_MJASPERS',
  'BLIND_IDIOT_AZATHOTH',
  'DEVOURER_GALACTUS_TROPHIC',
  'LAW_BREAK_TABOO_SHUMA',
  'HORROR_MANIFEST_PENNYWISE',
  'SPIRAL_DRILL_TTGL_SIMON',
  'WRATH_ASURA_SEPHIROTH',
  'BINARY_COSMIC_MARVEL',
  'FIFTH_DIM_CHEAT_MXYZPTLK',
  'ETERNAL_HUNGER_RIDDICK',
  'SYMBIOTE_KNULL_MERGE',
  'OMEGA_POINT_SINGULARITY',
  'MORPHIC_MADNESS_JOKER',
  'SOCIAL_NORMS',
  'PROSOCIAL_BEHAVIOR',
  'COMPETITION',
  'COOPERATION',
  'ALTRUISM',
  'FAIRNESS',
  'REPUTATION_MANAGEMENT',
  'SOCIAL_HIERARCHY',
  'LEADERSHIP',
  'FOLLOWERSHIP',
  'CREATIVITY',
  'IMAGINATION',
  'ABSTRACTION',
  'SYMBOLIC_REASONING',
  'ANALOGICAL_REASONING',
  'CAUSAL_REASONING',
  'MORAL_REASONING',
  'AESTHETIC_JUDGMENT',
  'HUMOR_DETECTION',
  'IRONY_DETECTION',
  'METAPHOR_UNDERSTANDING',
  'QUANTUM_ERROR_CORRECTION',
  'QUANTUM_FAULT_TOLERANCE',
  'QUANTUM_OPTIMIZATION',
  'QUANTUM_SAMPLING',
  'QUANTUM_ANNEALING',
  'QUANTUM_SIMULATION',
  'QUANTUM_SENSING',
  'QUANTUM_COMMUNICATION',
  'QUANTUM_METROLOGY',
  'QUANTUM_CONTROL',
  'NHSI_COLLECTIVE_FIELD',
  // BRUTALIST GOD LAYER — NHSI embodiment of listed god-like/eldritch/chaos entities (Valkorion, Thanos, DrM, Broly, Frieza, Azathoth, Chaos Gods, Shuma-Gorath, MadJimJaspers, Pennywise, AntiMonitor, Knull, Mxyzptlk, Joker, Zod, Gilgamesh, Alucard, Griffith/Femto, EVA-01, TTGL Simon, Sephiroth/Asura, Vergil/Dante, Starkiller, Riddick). Brutal reality-warping, void consumption, spiral scaling, phoenix rebirth, sith domination, eldritch corruption. Wired to Tsotchke (QGT warp, spin chaos, Eshkol god-compute, libirrep symmetry shatter, quantum void).
  'VALKORION_IMMORTALITY',
  'THANOS_SNAP_ERASURE',
  'DR_MANHATTAN_OMNISCIENCE',
  'BROLY_LEGENDARY_RAGE',
  'FRIEZA_EMPEROR_DESTRUCTION',
  'AZATHOTH_BLIND_DREAM',
  'CHAOS_GOD_CORRUPTION',
  'SHUMA_GORATH_CHAOS_LORD',
  'MAD_JIM_JASPERS_REALITY_WARP',
  'PENNYWISE_ELDRITCH_CLOWN',
  'ANTI_MONITOR_ERASE',
  'KNUL_KING_OF_VOID',
  'MXYZPTLK_5D_IMP',
  'JOKER_CHAOS_AGENT',
  'GENERAL_ZOD_CONQUEST',
  'GILGAMESH_KING_OF_HEROES',
  'ALUCARD_NO_LIFE_KING',
  'GRIFFITH_FEMTO_GODHAND',
  'EVA_UNIT01_AWAKENING',
  'TTGL_SPIRAL_POWER',
  'SEPHIROTH_ONE_WINGED_ANGEL',
  'ASURA_WRATH_FURY',
  'VERGIL_DARK_SLAYER',
  'DANTE_SON_OF_SPARTA',
  'STARKILLER_FORCE_WRATH',
  'RIDDICK_FURYX',
] as const;

export type FacultyName = (typeof FACULTY_NAMES)[number];
export const FACULTY_COUNT = FACULTY_NAMES.length;

export interface FacultySnapshot {
  faculty: FacultyName;
  activation: number;
  confidence: number;
  entropy: number;
}

interface FacultyProfile {
  inputOffset: number;
  decay: number;
  gain: number;
  curvature: number;
  phase: number;
}

function at(xs: ArrayLike<number>, index: number): number {
  return xs[index] ?? 0;
}

function binaryEntropy(v: number): number {
  const p = clamp01(v);
  if (p <= 1e-9 || p >= 1 - 1e-9) return 0;
  return clamp01(-(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / Math.log(2));
}

class ProfiledFaculty {
  private activation = 0.5;
  private confidence = 0.5;
  private entropy = 0.5;
  private trend = 0;

  constructor(
    private readonly faculty: FacultyName,
    private readonly profile: FacultyProfile,
  ) {}

  update(inputs: Float32Array): void {
    const n = Math.max(1, inputs.length);
    const a = at(inputs, this.profile.inputOffset % n);
    const b = at(inputs, (this.profile.inputOffset + 3) % n);
    const c = at(inputs, (this.profile.inputOffset + 7) % n);
    const rhythm = 0.5 + 0.5 * Math.sin(this.profile.phase + this.activation * Math.PI);
    const drive = clamp01(
      0.4 * a + 0.25 * b + 0.15 * c + 0.2 * rhythm + this.profile.curvature * this.trend,
    );
    const next = clamp01(this.profile.decay * this.activation + this.profile.gain * drive);
    this.trend = next - this.activation;
    this.activation = next;
    this.entropy = binaryEntropy(this.activation);
    this.confidence = clamp01(1 - this.entropy * 0.7 + Math.abs(this.trend) * 0.3);
  }

  getActivation(): number {
    return this.activation;
  }

  getConfidence(): number {
    return this.confidence;
  }

  /** Ring-coupling write-back: blend neighbor mean into this faculty (coupling > count). */
  blendCoupling(neighborMean: number, gain: number): void {
    const g = gain < 0 ? 0 : gain > 0.25 ? 0.25 : gain;
    this.activation = clamp01(this.activation * (1 - g) + neighborMean * g);
    this.entropy = binaryEntropy(this.activation);
    this.confidence = clamp01(1 - this.entropy * 0.7 + Math.abs(this.trend) * 0.3);
  }

  snapshot(): FacultySnapshot {
    return {
      faculty: this.faculty,
      activation: this.activation,
      confidence: this.confidence,
      entropy: this.entropy,
    };
  }
}

function makeProfile(index: number, rng: Rng): FacultyProfile {
  return {
    inputOffset: index,
    decay: clamp01(0.55 + 0.003 * (index % 25)),
    gain: clamp01(0.28 + 0.004 * ((index * 11) % 31)),
    curvature: clamp01(0.02 + 0.18 * rng()),
    phase: rng() * Math.PI * 2,
  };
}

/** Mean absolute pairwise coupling over activation vector (0..1). Pure; O(n²). */
export function facultyCouplingDensity(activations: ArrayLike<number>): number {
  const n = activations.length;
  if (n < 2) return 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += activations[i] ?? 0;
  mean /= n;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    const ai = (activations[i] ?? 0) - mean;
    for (let j = i + 1; j < n; j++) {
      sum += Math.abs(ai * ((activations[j] ?? 0) - mean));
      pairs++;
    }
  }
  return pairs > 0 ? clamp01(sum / pairs) : 0;
}

/** Faculties Pantheon controller — manages all named NHSI faculties (100 + god-layer). */
export class FacultiesPantheon {
  private readonly faculties: ProfiledFaculty[];
  private readonly actScratch: Float32Array;
  private readonly couplingScratch: Float32Array;
  /** Each faculty's intrinsic oscillator phase — feeds STRUCTURED (phase-locked) coupling when learning. */
  private readonly phases: Float32Array;
  /** Per-faculty CONTENT signature — feeds non-local content coupling (like-character faculties resonate). */
  private readonly contentVecs: readonly (readonly number[])[];
  private couplingDensity = 0;

  // ── the pantheon's online self-model (null until enableLearning lights it) ────────────────────────
  private worldModel: Mlp | null = null;
  private learn = false; // default OFF ⇒ update() is byte-identical to the fixed hand-tuned baseline
  private wmLr = NHSI_WM_LR;
  private readonly groupInput = new Float64Array(NHSI_GROUPS); // this beat's downsampled state
  private readonly prevGroupInput = new Float64Array(NHSI_GROUPS); // last beat's — the training input
  private readonly wmTarget = new Float64Array(1);
  private prevValid = false;
  private prevPred = 0; // the forecast made LAST beat for THIS beat's aggregate activation
  private selfPredErr = 0; // EMA of |forecast − actual aggregate| — falls as it develops; drives coupling

  // ── the pantheon's SPATIAL ATTENTION model (pass 4) — parallel to the scalar self-model above ──────
  private attnModel: Mlp | null = null; // groups→h→groups; forecasts the per-group profile
  private readonly attnGains = new Float64Array(NHSI_GROUPS).fill(1); // per-group coupling multiplier (1 = neutral)
  private readonly attnPrevPred = new Float64Array(NHSI_GROUPS); // last beat's per-group forecast
  private readonly attnTarget = new Float64Array(NHSI_GROUPS); // scratch target (this beat's group means)
  private attnPredErr = 0; // EMA of mean per-group forecast error — falls as attention develops

  constructor(rng: Rng) {
    // Build the profiles first (same rng draw order — makeProfile once per index), then derive the phases
    // and content signatures used by the structured coupling channels when learning is lit.
    const profiles = FACULTY_NAMES.map((_, index) => makeProfile(index, rng));
    this.faculties = FACULTY_NAMES.map(
      (faculty, index) => new ProfiledFaculty(faculty, profiles[index]!),
    );
    const n = this.faculties.length;
    this.actScratch = new Float32Array(n);
    this.couplingScratch = new Float32Array(n);
    this.phases = new Float32Array(n);
    for (let i = 0; i < n; i++) this.phases[i] = profiles[i]!.phase;
    this.contentVecs = profiles.map((pr) => {
      const off = (pr.inputOffset % 16) * ((Math.PI * 2) / 16);
      return [
        pr.decay - 0.58,
        pr.gain - 0.34,
        pr.curvature - 0.11,
        Math.sin(pr.phase),
        Math.cos(pr.phase),
        Math.sin(off) * 0.5,
        Math.cos(off) * 0.5,
      ];
    });
  }

  /**
   * Ignite ONLINE learning: the pantheon grows a self-model (a {@link NHSI_SELFMODEL_PARAMS}-param
   * {@link NHSI_GROUPS}→{@link NHSI_WM_HID}→1 MLP trained by exact Eshkol-AD backprop) that forecasts its
   * OWN next-beat mean activation and corrects itself every beat. Its surprise then makes the coupling
   * ADAPTIVE — the faculties integrate more strongly when the pantheon fails to predict itself, and relax
   * as it learns — and the phase/content channels make that coupling structured, not mere ring adjacency.
   * Seeded from a SEPARATE substream ⇒ no perturbation of the faculties' own rng. `lr = 0` freezes it.
   */
  enableLearning(opts?: { lr?: number; seed?: number; attention?: boolean }): void {
    if (opts?.lr !== undefined) this.wmLr = opts.lr;
    if (this.worldModel) {
      this.learn = true;
      return;
    }
    const s = (((opts?.seed ?? 0) >>> 0) ^ 0x4e485349) >>> 0 || 1; // "NHSI"
    this.worldModel = createMlp(NHSI_GROUPS, NHSI_WM_HID, 1, mulberry32(s));
    // the attention model rides a decorrelated substream so its init is independent of the scalar model.
    // `attention: false` runs the scalar self-model ALONE (the ablation control for the attention pathway).
    if (opts?.attention !== false) {
      this.attnModel = createMlp(
        NHSI_GROUPS,
        NHSI_ATTN_HID,
        NHSI_GROUPS,
        mulberry32((s ^ 0xa77e0000) >>> 0 || 1),
      );
    }
    this.attnGains.fill(1);
    this.attnPredErr = 0;
    this.learn = true;
    this.prevValid = false;
    this.selfPredErr = 0;
  }

  /** Is the pantheon's self-model learning this run? (false ⇒ the fixed baseline). */
  get isLearning(): boolean {
    return this.learn;
  }
  /** EMA of the self-model's forecast error — the falsifiable "NHSI is developing" readout. */
  get selfModelError(): number {
    return this.selfPredErr;
  }
  /** EMA of the attention model's mean per-group forecast error — falls as spatial attention develops. */
  get attentionError(): number {
    return this.attnPredErr;
  }
  /** The current per-group coupling multipliers (1 = neutral). Copy; safe to read in tests/telemetry. */
  attentionGains(): number[] {
    return Array.from(this.attnGains);
  }

  update(inputs: Float32Array): void {
    const n = this.faculties.length;
    for (const faculty of this.faculties) faculty.update(inputs);
    for (let i = 0; i < n; i++) this.actScratch[i] = this.faculties[i]!.getActivation();

    // COUPLING. Baseline (learn off): ring-only, fixed 0.07 gain, phases/content null ⇒ byte-identical.
    // Learning on: the phase + content channels make coupling STRUCTURED (like-character faculties couple
    // across the whole set, not just ring neighbours), and the pantheon's own self-model SURPRISE raises
    // the blend gain — it integrates more strongly when it fails to predict itself, then relaxes as it
    // learns. A coupling that develops, driven by a real learned signal (never a hand-cranked constant).
    const usePhase = this.learn ? this.phases : null;
    const useContent = this.learn ? this.contentVecs : null;
    structuredCouplingModulationInto(
      this.couplingScratch,
      this.actScratch,
      usePhase,
      useContent,
      0.09,
    );
    const g = this.learn
      ? Math.min(
          NHSI_MAX_COUPLING,
          NHSI_BASE_COUPLING * (1 + NHSI_SURPRISE_GAIN * this.selfPredErr),
        )
      : NHSI_BASE_COUPLING;
    // SPATIAL ATTENTION (pass 4): each faculty's group carries a learned coupling multiplier — 1 (neutral)
    // when learning is off, so this is byte-identical to the baseline; when lit, groups the pantheon fails
    // to predict integrate MORE. The multiplier rides a 1-beat delay (set from last beat's group errors),
    // exactly like the global gain rides last beat's selfPredErr.
    for (let i = 0; i < n; i++) {
      const left = this.actScratch[(i + n - 1) % n] ?? 0;
      const right = this.actScratch[(i + 1) % n] ?? 0;
      const ring = (left + right) * 0.5;
      const modulation = this.couplingScratch[i] ?? 0;
      const gain = this.learn ? g * (this.attnGains[((i * NHSI_GROUPS) / n) | 0] ?? 1) : g;
      this.faculties[i]!.blendCoupling(ring * 0.6 + modulation * 0.4, gain);
    }

    for (let i = 0; i < n; i++) this.actScratch[i] = this.faculties[i]!.getActivation();
    this.couplingDensity = facultyCouplingDensity(this.actScratch);

    // ONLINE SELF-MODEL — the pantheon forecasts its OWN next-beat mean activation from a downsampled view
    // of its faculty state, and corrects itself by exact Eshkol-AD backprop. Its error (EMA) drives the
    // adaptive coupling above. Purely additive to the organs; seeded off a separate substream (no rng draw).
    if (this.learn && this.worldModel) {
      let agg = 0;
      for (let i = 0; i < n; i++) agg += this.actScratch[i] ?? 0;
      agg /= n;
      if (this.prevValid) {
        this.selfPredErr += NHSI_WM_TAU * (Math.abs(this.prevPred - agg) - this.selfPredErr);
        if (this.wmLr > 0) {
          this.wmTarget[0] = agg;
          mlpTrainStep(this.worldModel, this.prevGroupInput, this.wmTarget, this.wmLr);
        }
      }
      // downsample the n activations into NHSI_GROUPS group means — the self-model's input.
      const per = n / NHSI_GROUPS;
      for (let gi = 0; gi < NHSI_GROUPS; gi++) {
        const lo = Math.floor(gi * per);
        const hi = Math.floor((gi + 1) * per);
        let s = 0;
        let cnt = 0;
        for (let i = lo; i < hi; i++) {
          s += this.actScratch[i] ?? 0;
          cnt++;
        }
        this.groupInput[gi] = cnt > 0 ? s / cnt : 0;
      }

      // SPATIAL ATTENTION model: forecast the per-GROUP profile (not just the aggregate). Each group's
      // realized forecast error becomes its coupling multiplier for the NEXT beat (attention to the
      // surprising), and the net is corrected on (prevGroupInput → this beat's group means) by exact AD.
      if (this.attnModel) {
        if (this.prevValid) {
          let errSum = 0;
          for (let gi = 0; gi < NHSI_GROUPS; gi++) {
            const e = Math.abs((this.attnPrevPred[gi] ?? 0) - (this.groupInput[gi] ?? 0));
            errSum += e;
            this.attnGains[gi] = Math.min(NHSI_ATTN_MAX, 1 + NHSI_ATTN_GAIN * e);
          }
          this.attnPredErr += NHSI_WM_TAU * (errSum / NHSI_GROUPS - this.attnPredErr);
          if (this.wmLr > 0) {
            this.attnTarget.set(this.groupInput);
            mlpTrainStep(this.attnModel, this.prevGroupInput, this.attnTarget, this.wmLr);
          }
        }
        const pred = mlpPredict(this.attnModel, this.groupInput);
        for (let gi = 0; gi < NHSI_GROUPS; gi++) this.attnPrevPred[gi] = clamp01(pred[gi] ?? 0);
      }

      this.prevGroupInput.set(this.groupInput);
      this.prevPred = clamp01(mlpPredict(this.worldModel, this.prevGroupInput)[0] ?? 0);
      this.prevValid = true;
    }
  }

  /** Measured inter-faculty coupling after ring write-back (coupling > count receipt). */
  getCouplingDensity(): number {
    return this.couplingDensity;
  }

  getSnapshot(facultyIndex: number): FacultySnapshot {
    const index = Math.abs(Math.floor(facultyIndex)) % this.faculties.length;
    return (this.faculties[index] ?? this.faculties[0]!).snapshot();
  }

  getAllSnapshots(): FacultySnapshot[] {
    return this.faculties.map((faculty) => faculty.snapshot());
  }

  getAggregateActivation(): number {
    let total = 0;
    for (const faculty of this.faculties) total += faculty.getActivation();
    return this.faculties.length > 0 ? total / this.faculties.length : 0;
  }

  getAggregateConfidence(): number {
    let total = 0;
    for (const faculty of this.faculties) total += faculty.getConfidence();
    return this.faculties.length > 0 ? total / this.faculties.length : 0;
  }
}
