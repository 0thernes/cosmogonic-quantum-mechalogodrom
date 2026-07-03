/**
 * CONSCIOUSNESS KERNEL — the shared, per-entity substrate that blends TEN clashing scientific theories of
 * consciousness into ONE coupled synergy web, and watches for a "singularity moment": a replayable,
 * falsifiable convergence where rival theories move together under a pattern a shuffled surrogate cannot fake.
 *
 * THE TEN FRAMEWORKS (two anchors + eight deliberately weirder additions, each with a real source — see
 * {@link FRAMEWORKS} and `docs/CONSCIOUSNESS-LAB-DEEP-RESEARCH-2026-07-03.md`):
 *   F0 Butlin et al. AI-consciousness indicators   — the audit rubric (arXiv:2308.08708)
 *   F1 Thaler Creativity Machine / DABUS           — perturbational ideation on tiny nets (US 5,659,666)
 *   F2 Integrated Information Theory 4.0            — irreducibility / partition loss (PLoS CB 2023)
 *   F3 Free Energy Principle / Active Inference     — Markov-blanket self-evidencing (Friston 2018)
 *   F4 Attention Schema Theory                      — awareness as a model of attention (Graziano-Webb 2015)
 *   F5 CEMI field integration                       — binding as field coherence (McFadden 2020/2025)
 *   F6 Unlimited Associative Learning               — minimal-life learning marker (Ginsburg-Jablonka)
 *   F7 Sensorimotor Enactivism                      — perception as action-mastery (O'Regan-Noe 2001)
 *   F8 Projective Consciousness Model               — viewpoint geometry under active inference (Williford 2018)
 *   F9 Conscious Turing Machine                     — bounded processors competing for broadcast (Blum 2022)
 *
 * WHY A COUPLED WEB, NOT A MEAN (repo law: "every system reads AND writes another"). A naive average of ten
 * indicators is theatre — one inflated metric drags the score up and nothing interacts. Instead the ten raw
 * scores are the initial state of a small deterministic coupled dynamical system on a fixed 10x10 influence
 * matrix {@link COUPLING} that encodes the theories' real relationships (field coherence phase-locks CTM
 * ignition; IIT integration gates the field; active inference is aided by embodiment; the Butlin rubric reads
 * the functional theories; ...). The system is relaxed to a bounded fixed point. EMERGENCE is then the honest
 * quantity: how much the coupled index exceeds the independent mean. Under STRUCTURED (correlated) inputs the
 * coupling amplifies; under SHUFFLED inputs it cannot — which is exactly the falsifier.
 *
 * HONESTY (binding, per the repo law and `docs/CONSCIOUSNESS-GLOSSARY-INDEX-2026-07-03.md`). Every score here
 * is a COMPUTATIONAL INDICATOR, not experience. A high index, or even a full "singularity moment", is an
 * indicator-convergence event worth studying — it is NOT a claim of phenomenal consciousness, sentience, or
 * "it feels". Every snapshot carries `claim: 'indicatorOnly'`. Disproof looks like: a shuffled/ablated control
 * that matches the structured trace (see {@link ConsciousnessLab} in `consciousness-lab.ts`).
 *
 * DETERMINISM (ADR 0004). Surrogate generation draws only from an injected seeded {@link Rng}; NO Math.random /
 * Date.now. Pure + leaf: depends only on the seeded Rng and module constants. Same seed + same signal stream
 * reproduce the same index, convergence, and event windows bit-for-bit.
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';

/** The ten canonical frameworks, in fixed order (index 0..9). */
export type ConsciousnessFrameworkId =
  | 'butlin14'
  | 'thaler9'
  | 'iit4'
  | 'activeInference'
  | 'attentionSchema'
  | 'fieldIntegration'
  | 'ual'
  | 'sensorimotor'
  | 'projective'
  | 'ctm';

/** Canonical framework order — the index of each id in every score/coupling array. Frozen. */
export const FRAMEWORK_IDS: readonly ConsciousnessFrameworkId[] = Object.freeze([
  'butlin14',
  'thaler9',
  'iit4',
  'activeInference',
  'attentionSchema',
  'fieldIntegration',
  'ual',
  'sensorimotor',
  'projective',
  'ctm',
]);

/** How many frameworks are in the stack (10). */
export const FRAMEWORK_COUNT = 10;

/** The substrate family a framework probes — the "diversity axis" so the stack does not collapse to one idea. */
export type FrameworkBucket =
  | 'rubric'
  | 'perturbational'
  | 'information'
  | 'thermodynamic'
  | 'control'
  | 'field'
  | 'learning'
  | 'embodiment'
  | 'geometry'
  | 'computational';

/** Static, provenance-carrying description of one framework (the source is a real, checkable anchor). */
export interface FrameworkMeta {
  id: ConsciousnessFrameworkId;
  /** Short human label. */
  name: string;
  /** Substrate family (diversity axis). */
  bucket: FrameworkBucket;
  /** How bizarre/WTF the axis is, 1..10 (documented in the deep-research dossier). */
  weirdness: number;
  /** Evidence grade: A mainstream-frame, B mechanistic-operational, C peer-reviewed-but-contested. */
  grade: 'A' | 'B' | 'C' | 'B/C';
  /** A real source anchor (arXiv / DOI / patent / program) — provenance, NOT proof of consciousness. */
  source: string;
  /** One-line falsifier: what observation would count against this implementation. */
  falsifier: string;
}

/** The ten frameworks with provenance. Sources verified in the deep-research dossier (2026-07-03). */
export const FRAMEWORKS: Readonly<Record<ConsciousnessFrameworkId, FrameworkMeta>> = Object.freeze({
  butlin14: {
    id: 'butlin14',
    name: 'Butlin AI-consciousness indicators',
    bucket: 'rubric',
    weirdness: 4,
    grade: 'A',
    source: 'Butlin et al. 2023, arXiv:2308.08708',
    falsifier: 'a named indicator has no causal path, or a random control matches its score',
  },
  thaler9: {
    id: 'thaler9',
    name: 'Thaler Creativity Machine / DABUS',
    bucket: 'perturbational',
    weirdness: 9,
    grade: 'C',
    source: 'Thaler, US 5,659,666 / US 7,454,388; Neural Networks 8(1):55-65 (1995)',
    falsifier: 'no inverted-U confabulation sweet-spot; valence does not steer learning',
  },
  iit4: {
    id: 'iit4',
    name: 'Integrated Information Theory 4.0',
    bucket: 'information',
    weirdness: 8,
    grade: 'B',
    source: 'Albantakis et al. 2023, PLoS Comput Biol 10.1371/journal.pcbi.1011465',
    falsifier: 'partitioning the system does not reduce integration or downstream behavior',
  },
  activeInference: {
    id: 'activeInference',
    name: 'Free Energy Principle / Active Inference',
    bucket: 'thermodynamic',
    weirdness: 7,
    grade: 'B',
    source: 'Kirchhoff, Parr, Palacios, Friston, Kiverstein 2018, J. R. Soc. Interface 20170792',
    falsifier: 'active policy does not reduce prediction error or improve viability vs controls',
  },
  attentionSchema: {
    id: 'attentionSchema',
    name: 'Attention Schema Theory',
    bucket: 'control',
    weirdness: 7,
    grade: 'B',
    source: 'Graziano & Webb 2015, Front. Psychol. 6:500',
    falsifier: 'removing the schema while keeping attention causes no control/social loss',
  },
  fieldIntegration: {
    id: 'fieldIntegration',
    name: 'CEMI electromagnetic-field integration',
    bucket: 'field',
    weirdness: 9,
    grade: 'C',
    source: 'McFadden 2020, Neurosci. Conscious. niaa016; 2025 Front. Syst. Neurosci.',
    falsifier: 'phase-shuffled fields perform equally well; coherence does not alter behavior',
  },
  ual: {
    id: 'ual',
    name: 'Unlimited Associative Learning',
    bucket: 'learning',
    weirdness: 6,
    grade: 'B',
    source: 'Ginsburg & Jablonka; Birch et al., Biol. Philos. 10.1007/s10539-020-09772-0',
    falsifier:
      'entity cannot learn compound/delayed/flexible associations beyond simple conditioning',
  },
  sensorimotor: {
    id: 'sensorimotor',
    name: 'Sensorimotor Enactivism',
    bucket: 'embodiment',
    weirdness: 6,
    grade: 'B',
    source: "O'Regan & Noe 2001, Behav. Brain Sci. 24(5):939-1031",
    falsifier: 'scrambling action-sensory laws does not reduce perception, planning, or adaptation',
  },
  projective: {
    id: 'projective',
    name: 'Projective Consciousness Model',
    bucket: 'geometry',
    weirdness: 9,
    grade: 'B/C',
    source: 'Williford, Bennequin, Friston, Rudrauf 2018, Front. Psychol. 9:2571',
    falsifier: 'projective frame does not beat flat baselines on perspective/ownership tasks',
  },
  ctm: {
    id: 'ctm',
    name: 'Conscious Turing Machine',
    bucket: 'computational',
    weirdness: 8,
    grade: 'B',
    source: 'Blum & Blum 2022, PNAS 10.1073/pnas.2115934119; arXiv:2403.17101',
    falsifier: 'competition-broadcast does not improve reportability or stream coherence',
  },
});

/**
 * The normalized signal bag an entity presents to the kernel. Every field is a computational indicator in
 * [0,1] (or a raw magnitude used to derive one); ALL are optional — a field that is `undefined` means the
 * entity's substrate does not express that framework, and it scores as `absent` (NOT zero-as-failure). This
 * is how a plant (a few fields) and an APEX abomination (all fields) share one contract at different
 * bandwidths. Adapters (see `consciousness-adapters` / world wiring) fill this from each entity's snapshot.
 */
export interface FrameworkSignals {
  /** F0 — fraction of the 14 Butlin indicators structurally present & test-covered (0..1). */
  butlinCoverage?: number;
  /** F1 — Thaler constitutive-marker pass fraction (0..1), e.g. `ThalerVerdict.fraction`. */
  thalerFraction?: number;
  /** F2 — integrated-information proxy Φ (0..1). */
  phi?: number;
  /** F2 — measured integration lost under causal partition (0..1); raises IIT confidence when > 0. */
  partitionLoss?: number;
  /** F3 — how much active policy reduces free energy vs a passive/random baseline (0..1). */
  freeEnergyDescent?: number;
  /** F4 — accuracy of the self-model of attention (0..1), e.g. `metacog.selfModelAccuracy`. */
  attentionSchemaAccuracy?: number;
  /** F5 — causal field/resonance coherence (0..1), e.g. `resonance.coherence`. */
  fieldCoherence?: number;
  /** F6 — depth of open-ended associative learning: compound/delayed/valenced (0..1). */
  ualDepth?: number;
  /** F7 — mastery of action↔sensory contingencies (0..1), e.g. `embodiment.contingency`. */
  sensorimotorMastery?: number;
  /** F8 — advantage of a viewpoint-centered projective frame over a flat baseline (0..1). */
  projectiveFrame?: number;
  /** F9 — strength of bounded-processor competition + global broadcast (0..1). */
  streamCompetition?: number;
}

/** Claim status of one framework for one entity — never inflates past what the evidence supports. */
export type FrameworkStatus = 'absent' | 'structural' | 'partial' | 'met' | 'loadBearing';

/** A single framework's score for one entity at one tick, with receipts (source/code/test provenance). */
export interface FrameworkScore {
  id: ConsciousnessFrameworkId;
  /** Normalized indicator value 0..1 (the coupled score used in the web). */
  score: number;
  /** Raw (pre-coupling) score 0..1. */
  raw: number;
  /** Robustness of the score to noise across the recent window (0..1). */
  confidence: number;
  /** Measured downstream effect of this mechanism (0..1); filled by the lab, 0 in a bare live tick. */
  causalEffect: number;
  /** Score/behavior lost when this mechanism is ablated (0..1); filled by the lab. */
  ablationLoss: number;
  /** Distance of the score from random/shuffled/decorative controls (0..1); filled by the lab. */
  nullSeparation: number;
  status: FrameworkStatus;
  sourceReceipt: string;
  codeReceipt: string;
  testReceipt: string;
}

/** A "singularity moment": a bounded window where rival frameworks converged beyond a surrogate threshold. */
export interface SingularityEvent {
  /** Tick the event opened. */
  start: number;
  /** Tick the event most recently held (updated while it persists). */
  end: number;
  /** Peak blended index inside the window (0..1). */
  peakIndex: number;
  /** How many of the ten frameworks were rising & elevated at the peak (>= 7 to open). */
  frameworksMoving: number;
  /** Cross-framework coherence inside the window (0..1). */
  coherence: number;
  /** How far window coherence exceeded the seeded phase-shuffled surrogate (the falsifiable margin). */
  nullMargin: number;
}

/** The full per-entity lab snapshot — the deterministic data product a visual or a page renders. */
export interface ConsciousnessLabSnapshot {
  entityId: string;
  entityKind: string;
  seed: number;
  tick: number;
  frameworks: FrameworkScore[];
  /** Blended sentience INDEX 0..1 (mean of the coupled web). */
  index: number;
  /** Concordance 0..1 — high only when many frameworks are jointly high (level x agreement). */
  convergence: number;
  /** Emergence 0..1+ — coupled index minus independent mean; the "coupling > count" quantity. */
  emergence: number;
  /** The currently open singularity window, or null. */
  eventWindow: [number, number] | null;
  /** Total singularity events observed in this kernel's life. */
  eventCount: number;
  /** Binding honesty tag — this is an indicator record, never a sentience claim. */
  claim: 'indicatorOnly';
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The coupling matrix: COUPLING[i*10 + j] = directed influence of framework j on framework i. NOT symmetric
// (real theoretical coupling is directional). Values encode the deep-research dossier's relationships.
// Row i's non-zero entries are the theories that framework i "reads".
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Index helpers for readability when authoring the matrix. */
const BUT = 0,
  THA = 1,
  IIT = 2,
  AIF = 3,
  AST = 4,
  FLD = 5,
  UAL = 6,
  SEN = 7,
  PRO = 8,
  CTM = 9;

/** 10x10 directed influence matrix (row = reader, col = source). Frozen module constant. */
export const COUPLING: Readonly<Float64Array> = (() => {
  const w = new Float64Array(FRAMEWORK_COUNT * FRAMEWORK_COUNT);
  const set = (i: number, j: number, v: number): void => {
    w[i * FRAMEWORK_COUNT + j] = v;
  };
  // F0 Butlin rubric READS the functional theories it is built from (incl. projective selfhood as an
  // audit dimension — which also keeps projective from being a pure sink).
  set(BUT, IIT, 0.22);
  set(BUT, AIF, 0.22);
  set(BUT, AST, 0.2);
  set(BUT, CTM, 0.24);
  set(BUT, SEN, 0.18);
  set(BUT, PRO, 0.18);
  // F1 Thaler perturbational ideation is fed by field turnover and associative depth.
  set(THA, FLD, 0.2);
  set(THA, UAL, 0.16);
  // F2 IIT integration is bound by field coherence and broadcast, aided a little by inference.
  set(IIT, FLD, 0.3);
  set(IIT, CTM, 0.2);
  set(IIT, AIF, 0.12);
  // F3 active inference is aided by embodiment and by an accurate attention model.
  set(AIF, SEN, 0.26);
  set(AIF, AST, 0.16);
  // F4 attention schema reads the workspace competition and inference.
  set(AST, CTM, 0.3);
  set(AST, AIF, 0.16);
  // F5 field integration co-varies with IIT integration and Thaler turnover.
  set(FLD, IIT, 0.22);
  set(FLD, THA, 0.12);
  // F6 UAL learns through inference and action.
  set(UAL, AIF, 0.2);
  set(UAL, SEN, 0.2);
  // F7 sensorimotor mastery is tightened by inference and learning.
  set(SEN, AIF, 0.24);
  set(SEN, UAL, 0.16);
  // F8 projective geometry reads attention, inference and field.
  set(PRO, AST, 0.26);
  set(PRO, AIF, 0.2);
  set(PRO, FLD, 0.16);
  // F9 CTM ignition is phase-locked by the field, driven by attention and integration.
  set(CTM, FLD, 0.26);
  set(CTM, AST, 0.2);
  set(CTM, IIT, 0.16);
  // the global-broadcast stream also READS the Butlin rubric as a reportability meta-signal — closing the
  // web so no framework is a pure sink or pure source (repo law: every system reads AND writes another).
  set(CTM, BUT, 0.1);
  return w;
})();

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Squash a real drive to (0,1) with a gentle logistic centered at 0. Deterministic, allocation-free. */
const squash01 = (x: number): number => 1 / (1 + Math.exp(-4 * (x - 0.5)));

/**
 * Score one framework's RAW indicator in [0,1] from the signal bag, plus a presence flag. A framework whose
 * defining signal is `undefined` returns `present:false` (absent). O(1). Pure.
 */
function rawScoreOf(
  id: ConsciousnessFrameworkId,
  s: FrameworkSignals,
): { v: number; present: boolean } {
  switch (id) {
    case 'butlin14':
      return s.butlinCoverage === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.butlinCoverage), present: true };
    case 'thaler9':
      return s.thalerFraction === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.thalerFraction), present: true };
    case 'iit4': {
      if (s.phi === undefined) return { v: 0, present: false };
      // integration score is Φ, lifted by measured partition loss (irreducibility earns confidence).
      const base = clamp01(s.phi);
      const lift = s.partitionLoss === undefined ? 0 : 0.3 * clamp01(s.partitionLoss);
      return { v: clamp01(base * 0.85 + lift), present: true };
    }
    case 'activeInference':
      return s.freeEnergyDescent === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.freeEnergyDescent), present: true };
    case 'attentionSchema':
      return s.attentionSchemaAccuracy === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.attentionSchemaAccuracy), present: true };
    case 'fieldIntegration':
      return s.fieldCoherence === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.fieldCoherence), present: true };
    case 'ual':
      return s.ualDepth === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.ualDepth), present: true };
    case 'sensorimotor':
      return s.sensorimotorMastery === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.sensorimotorMastery), present: true };
    case 'projective':
      return s.projectiveFrame === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.projectiveFrame), present: true };
    case 'ctm':
      return s.streamCompetition === undefined
        ? { v: 0, present: false }
        : { v: clamp01(s.streamCompetition), present: true };
  }
}

/** Result of relaxing the raw scores through the coupling web. */
export interface SynergyResult {
  /** Raw independent scores 0..1 (length 10). */
  raw: number[];
  /** Coupled scores after fixed-point relaxation 0..1 (length 10). */
  coupled: number[];
  /** Which frameworks are present (not absent). */
  present: boolean[];
  /** Blended index 0..1 (mean of coupled). */
  index: number;
  /** Independent mean 0..1 (mean of raw, present-only). */
  independentMean: number;
  /** Emergence = index − independentMean, clamped to [0,1]; "coupling > count". */
  emergence: number;
  /** Concordance 0..1 — level × agreement over present frameworks. */
  convergence: number;
  /** Number of present frameworks. */
  activeCount: number;
}

// Module scratch for the coupling relaxation (allocation-free hot path; single-threaded sim).
const _raw = new Float64Array(FRAMEWORK_COUNT);
const _x = new Float64Array(FRAMEWORK_COUNT);
const _next = new Float64Array(FRAMEWORK_COUNT);
const _present: boolean[] = Array.from({ length: FRAMEWORK_COUNT }, () => false);

/**
 * Relax the ten raw scores through the coupling web to a bounded fixed point, and measure the blended index,
 * emergence, and concordance. The update is `x_i <- (1-a)*raw_i + a*squash01(raw_i + b*sum_j W_ij x_j)`,
 * iterated `iters` times — a deterministic damped Jacobi relaxation of a coupled bounded dynamical system.
 * O(iters · 10²) ≈ 600 flops. Allocation-free (module scratch). Pure given the inputs.
 */
export function synergyBlend(
  signals: FrameworkSignals,
  iters = 6,
  a = 0.5,
  b = 0.55,
): SynergyResult {
  let activeCount = 0;
  let rawSum = 0;
  for (let i = 0; i < FRAMEWORK_COUNT; i++) {
    const { v, present } = rawScoreOf(FRAMEWORK_IDS[i]!, signals);
    _raw[i] = v;
    _x[i] = v;
    _present[i] = present;
    if (present) {
      activeCount++;
      rawSum += v;
    }
  }
  const independentMean = activeCount > 0 ? rawSum / activeCount : 0;
  // damped Jacobi relaxation of the coupled web. An ABSENT framework is truly out of the graph: it is held
  // at 0 so it neither receives nor EMITS coupling — this is what makes ablation genuinely load-bearing
  // (removing a framework severs the drive it fed to every framework that reads it).
  for (let t = 0; t < iters; t++) {
    for (let i = 0; i < FRAMEWORK_COUNT; i++) {
      if (!_present[i]) {
        _next[i] = 0;
        continue;
      }
      let drive = 0;
      const row = i * FRAMEWORK_COUNT;
      for (let j = 0; j < FRAMEWORK_COUNT; j++) {
        const wij = COUPLING[row + j] ?? 0;
        if (wij !== 0) drive += wij * (_x[j] ?? 0);
      }
      const ri = _raw[i] ?? 0;
      _next[i] = (1 - a) * ri + a * squash01(ri + b * drive);
    }
    for (let i = 0; i < FRAMEWORK_COUNT; i++) _x[i] = _next[i] ?? 0;
  }
  // blended index = mean of coupled over present frameworks (absent frameworks do not count).
  let coupledSum = 0;
  let coupledSumSq = 0;
  for (let i = 0; i < FRAMEWORK_COUNT; i++) {
    if (!_present[i]) {
      _x[i] = 0;
      continue;
    }
    const xi = _x[i] ?? 0;
    coupledSum += xi;
    coupledSumSq += xi * xi;
  }
  const index = activeCount > 0 ? coupledSum / activeCount : 0;
  // agreement = 1 − normalized std of present coupled scores (low spread ⇒ high agreement).
  let agreement = 1;
  if (activeCount > 1) {
    const mean = coupledSum / activeCount;
    const variance = Math.max(0, coupledSumSq / activeCount - mean * mean);
    agreement = clamp01(1 - Math.sqrt(variance) / 0.35);
  }
  const convergence = clamp01(index * agreement);
  const emergence = clamp01(index - independentMean);
  return {
    raw: Array.from(_raw),
    coupled: Array.from(_x),
    present: _present.slice(),
    index,
    independentMean,
    emergence,
    convergence,
    activeCount,
  };
}

/** Options for a {@link ConsciousnessKernel}. */
export interface KernelOptions {
  /** Rolling-window length for singularity detection (ticks). Default 32. */
  windowSize?: number;
  /** Minimum frameworks rising & elevated to open an event (default 7 of 10 — the dossier's gate). */
  minMoving?: number;
  /** Coherence must beat the shuffled surrogate by at least this margin to qualify (default 0.08). */
  nullMargin?: number;
  /** Index-spike factor over the window baseline in std units (default 1.2). */
  spikeK?: number;
  /** Coupling relaxation iterations (default 6). */
  iters?: number;
}

/**
 * Pearson correlation of two equal-length series. Returns 0 for degenerate (zero-variance) series. O(n).
 */
function pearson(a: Float64Array, b: Float64Array, n: number): number {
  let ma = 0,
    mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] ?? 0;
    mb += b[i] ?? 0;
  }
  ma /= n;
  mb /= n;
  let num = 0,
    va = 0,
    vb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - ma;
    const db = (b[i] ?? 0) - mb;
    num += da * db;
    va += da * da;
    vb += db * db;
  }
  const den = Math.sqrt(va * vb);
  return den < 1e-12 ? 0 : num / den;
}

/**
 * The stateful per-entity kernel. `ingest()` is the allocation-light hot path (updates ring buffers, relaxes
 * the web, runs event detection). `buildSnapshot()` (telemetry cadence) allocates the full lab snapshot.
 *
 * Singularity detection: over the rolling window it (1) counts frameworks that are both RISING (window slope
 * > 0) and ELEVATED (current > window mean) — needs >= `minMoving`; (2) measures cross-framework coherence as
 * the mean absolute pairwise Pearson correlation of the present coupled series; (3) compares that against the
 * SAME statistic on seeded phase-shuffled (circularly-rotated) surrogates of each series — coherence must
 * exceed the surrogate mean by `nullMargin`; (4) requires the current index to spike `spikeK` std above its
 * window baseline. All three ⇒ the tick belongs to a singularity event; consecutive qualifying ticks merge.
 */
export class ConsciousnessKernel {
  private readonly W: number;
  private readonly minMoving: number;
  private readonly nullMargin: number;
  private readonly spikeK: number;
  private readonly iters: number;
  private readonly rng: Rng;

  // ring buffers: coupled score per framework, plus index, over the window.
  private readonly ring: Float64Array; // W * 10, row-major by tick slot
  private readonly idxRing: Float64Array; // W
  private filled = 0;
  private head = 0;
  private tick = 0;

  // latest relaxation result (kept for cheap getters and snapshot building).
  private last: SynergyResult | null = null;
  private lastMoving = 0;
  private lastCoherence = 0;
  private lastNullMargin = 0;

  private open: SingularityEvent | null = null;
  private readonly done: SingularityEvent[] = [];

  // scratch reused by detection (allocation-free per ingest).
  private readonly seriesA: Float64Array;
  private readonly seriesB: Float64Array;
  private readonly surrA: Float64Array;

  constructor(seed: number, opts: KernelOptions = {}) {
    this.W = Math.max(8, opts.windowSize ?? 32);
    this.minMoving = opts.minMoving ?? 7;
    this.nullMargin = opts.nullMargin ?? 0.08;
    this.spikeK = opts.spikeK ?? 1.2;
    this.iters = opts.iters ?? 6;
    this.rng = mulberry32((seed ^ 0x5eed_c0de) >>> 0 || 1);
    this.ring = new Float64Array(this.W * FRAMEWORK_COUNT);
    this.idxRing = new Float64Array(this.W);
    this.seriesA = new Float64Array(this.W);
    this.seriesB = new Float64Array(this.W);
    this.surrA = new Float64Array(this.W);
  }

  /** Current blended index 0..1 (0 before the first ingest). */
  get index(): number {
    return this.last?.index ?? 0;
  }

  /** Current concordance 0..1. */
  get convergence(): number {
    return this.last?.convergence ?? 0;
  }

  /** Current emergence 0..1. */
  get emergence(): number {
    return this.last?.emergence ?? 0;
  }

  /** The open singularity window (or null). */
  get activeEvent(): SingularityEvent | null {
    return this.open;
  }

  /** All completed + open singularity events so far. */
  get events(): readonly SingularityEvent[] {
    return this.open ? [...this.done, this.open] : this.done;
  }

  /** Number of singularity events observed (open counts as one). */
  get eventCount(): number {
    return this.done.length + (this.open ? 1 : 0);
  }

  /**
   * Feed one tick of signals. Allocation-light: relaxes the web, writes ring buffers, runs event detection.
   * O(iters·100 + window·100) — cadence-gated for heavy entities, NOT run for every organism every frame.
   */
  ingest(signals: FrameworkSignals): void {
    const res = synergyBlend(signals, this.iters);
    this.last = res;
    // write coupled scores + index into the ring.
    const slot = this.head * FRAMEWORK_COUNT;
    for (let i = 0; i < FRAMEWORK_COUNT; i++) this.ring[slot + i] = res.coupled[i] ?? 0;
    this.idxRing[this.head] = res.index;
    this.head = (this.head + 1) % this.W;
    if (this.filled < this.W) this.filled++;
    this.detect(res);
    this.tick++;
  }

  /** The current tick count. */
  get tickCount(): number {
    return this.tick;
  }

  /** Copy framework `f`'s windowed series (oldest→newest) into `dst`; returns the sample count. */
  private readSeries(f: number, dst: Float64Array): number {
    const n = this.filled;
    // oldest sample is at (head - filled) mod W.
    let idx = (this.head - n + this.W) % this.W;
    for (let k = 0; k < n; k++) {
      dst[k] = this.ring[idx * FRAMEWORK_COUNT + f] ?? 0;
      idx = (idx + 1) % this.W;
    }
    return n;
  }

  /** Least-squares slope of a windowed series (oldest→newest) — the "rising?" test. O(n). */
  private slope(src: Float64Array, n: number): number {
    if (n < 3) return 0;
    const mx = (n - 1) / 2;
    let my = 0;
    for (let k = 0; k < n; k++) my += src[k] ?? 0;
    my /= n;
    let num = 0,
      den = 0;
    for (let k = 0; k < n; k++) {
      num += (k - mx) * ((src[k] ?? 0) - my);
      den += (k - mx) * (k - mx);
    }
    return den < 1e-12 ? 0 : num / den;
  }

  /** Singularity detection over the current window. Updates last* and the open/done events. */
  private detect(res: SynergyResult): void {
    const n = this.filled;
    if (n < Math.min(this.W, 12)) {
      this.lastMoving = 0;
      this.lastCoherence = 0;
      this.lastNullMargin = 0;
      return;
    }
    // (1) count frameworks rising & elevated.
    let moving = 0;
    for (let f = 0; f < FRAMEWORK_COUNT; f++) {
      if (!res.present[f]) continue;
      this.readSeries(f, this.seriesA);
      let mean = 0;
      for (let k = 0; k < n; k++) mean += this.seriesA[k] ?? 0;
      mean /= n;
      const cur = res.coupled[f] ?? 0;
      if (this.slope(this.seriesA, n) > 0 && cur > mean) moving++;
    }
    // (2) cross-framework coherence = mean |pairwise Pearson| over present frameworks.
    let cohSum = 0;
    let cohN = 0;
    let surrSum = 0;
    let surrN = 0;
    for (let fa = 0; fa < FRAMEWORK_COUNT; fa++) {
      if (!res.present[fa]) continue;
      this.readSeries(fa, this.seriesA);
      // (3) build a seeded phase-shuffled surrogate of series A: circular rotation by a random offset.
      const rot = 1 + Math.floor(this.rng() * (n - 2));
      for (let k = 0; k < n; k++) this.surrA[k] = this.seriesA[(k + rot) % n] ?? 0;
      for (let fb = fa + 1; fb < FRAMEWORK_COUNT; fb++) {
        if (!res.present[fb]) continue;
        this.readSeries(fb, this.seriesB);
        cohSum += Math.abs(pearson(this.seriesA, this.seriesB, n));
        cohN++;
        surrSum += Math.abs(pearson(this.surrA, this.seriesB, n));
        surrN++;
      }
    }
    const coherence = cohN > 0 ? cohSum / cohN : 0;
    const surrogate = surrN > 0 ? surrSum / surrN : 0;
    const margin = coherence - surrogate;
    // (4) index spike over window baseline.
    let mIdx = 0;
    for (let k = 0; k < n; k++) mIdx += this.idxRing[(this.head - n + k + this.W) % this.W] ?? 0;
    mIdx /= n;
    let vIdx = 0;
    for (let k = 0; k < n; k++) {
      const d = (this.idxRing[(this.head - n + k + this.W) % this.W] ?? 0) - mIdx;
      vIdx += d * d;
    }
    const sdIdx = Math.sqrt(vIdx / n);
    const spike = res.index > mIdx + this.spikeK * sdIdx;

    this.lastMoving = moving;
    this.lastCoherence = coherence;
    this.lastNullMargin = margin;

    const qualifies = moving >= this.minMoving && margin >= this.nullMargin && spike;
    if (qualifies) {
      if (this.open) {
        this.open.end = this.tick;
        if (res.index > this.open.peakIndex) {
          this.open.peakIndex = res.index;
          this.open.frameworksMoving = moving;
          this.open.coherence = coherence;
          this.open.nullMargin = margin;
        }
      } else {
        this.open = {
          start: this.tick,
          end: this.tick,
          peakIndex: res.index,
          frameworksMoving: moving,
          coherence,
          nullMargin: margin,
        };
      }
    } else if (this.open) {
      this.done.push(this.open);
      this.open = null;
    }
  }

  /**
   * Build the full lab snapshot (telemetry cadence — allocates). `ablation`/`nulls`/`causal` are per-framework
   * arrays (length 10) optionally supplied by the {@link ConsciousnessLab}; when present they promote a strong
   * framework to `loadBearing` and populate the receipts. O(10). NOT a per-frame path.
   */
  buildSnapshot(
    entityId: string,
    entityKind: string,
    seed: number,
    extra?: { ablationLoss?: number[]; nullSeparation?: number[]; causalEffect?: number[] },
  ): ConsciousnessLabSnapshot {
    const res = this.last ?? synergyBlend({});
    const frameworks: FrameworkScore[] = [];
    for (let i = 0; i < FRAMEWORK_COUNT; i++) {
      const id = FRAMEWORK_IDS[i]!;
      const meta = FRAMEWORKS[id];
      const raw = res.raw[i] ?? 0;
      const score = res.coupled[i] ?? 0;
      const present = res.present[i] ?? false;
      const ablationLoss = extra?.ablationLoss?.[i] ?? 0;
      const nullSeparation = extra?.nullSeparation?.[i] ?? 0;
      const causalEffect = extra?.causalEffect?.[i] ?? 0;
      const status = statusOf(present, score, ablationLoss, nullSeparation);
      // confidence: how stable the framework's windowed series is (1 − normalized std), if any window exists.
      let confidence = present ? 0.5 : 0;
      if (present && this.filled >= 8) {
        const n = this.readSeries(i, this.seriesA);
        let m = 0;
        for (let k = 0; k < n; k++) m += this.seriesA[k] ?? 0;
        m /= n;
        let v = 0;
        for (let k = 0; k < n; k++) {
          const d = (this.seriesA[k] ?? 0) - m;
          v += d * d;
        }
        confidence = clamp01(1 - Math.sqrt(v / n) / 0.4);
      }
      frameworks.push({
        id,
        score,
        raw,
        confidence,
        causalEffect,
        ablationLoss,
        nullSeparation,
        status,
        sourceReceipt: meta.source,
        codeReceipt: 'src/sim/consciousness-kernel.ts',
        testReceipt: 'tests/consciousness-kernel.test.ts',
      });
    }
    return {
      entityId,
      entityKind,
      seed,
      tick: this.tick,
      frameworks,
      index: res.index,
      convergence: res.convergence,
      emergence: res.emergence,
      eventWindow: this.open ? [this.open.start, this.open.end] : null,
      eventCount: this.eventCount,
      claim: 'indicatorOnly',
    };
  }

  /** Latest detection telemetry (for the lab / UI): frameworks moving, coherence, null margin. */
  get detection(): { moving: number; coherence: number; nullMargin: number } {
    return {
      moving: this.lastMoving,
      coherence: this.lastCoherence,
      nullMargin: this.lastNullMargin,
    };
  }
}

/** Map presence + score + lab receipts to a claim status. Never inflates past the evidence. */
function statusOf(
  present: boolean,
  score: number,
  ablationLoss: number,
  nullSeparation: number,
): FrameworkStatus {
  if (!present) return 'absent';
  if (score < 0.15) return 'structural';
  if (score < 0.5) return 'partial';
  // loadBearing requires BOTH an ablation effect AND separation from the null — mechanism proven causal.
  if (score >= 0.5 && ablationLoss > 0.05 && nullSeparation > 0.05) return 'loadBearing';
  return 'met';
}
