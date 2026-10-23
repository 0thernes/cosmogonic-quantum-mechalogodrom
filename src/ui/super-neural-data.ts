/**
 * Pure numeric provenance for the 27 PRIME Archon cards. No clock, paint state, RNG, or simulation writes.
 * Build at snapshot cadence; histories cost O(96 * latent width), never O(browser frame count).
 */
import { SUPER_SENSE_CHANNELS, QUANTUM_ASPECTS, type SuperMindSnapshot } from '../sim/super-mind';
import { SUPER_PLANS } from '../sim/super-creature';
import { amplitudesFromBorn, pairIndex, pairwiseMutualInformation } from '../math/qubit-pair-info';

/** Complete renderer input: units and source are visible, and invalid measurements remain invalid. */
export interface NeuralCard {
  id: string;
  title: string;
  source: string;
  unit: string;
  note: string;
  kind: 'bars' | 'lines' | 'heat' | 'bloch';
  series: { label: string; values: number[] }[];
  labels: string[];
  range?: [number, number];
  columns?: number;
  selected?: number[];
  warning?: string;
}

interface NeuralSample {
  tick: number;
  latent: number[];
  rms: number;
  entropy: number;
  coherence: number;
  sampled: number;
}
const HISTORY_CAPACITY = 96;
const PERCEPT_KEYS = [
  'energy',
  'threat',
  'crowding',
  'chaos',
  'wealthRel',
  'preyClose',
  'rivalClose',
  'pull',
  'light',
  'sound',
  'phase',
] as const;

function numeric(v: unknown): number {
  return typeof v === 'number' ? v : NaN;
}
function copied(a: readonly number[] | undefined): number[] {
  return a ? Array.from(a, numeric) : [];
}
function rms(a: readonly number[]): number {
  return a.length ? Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length) : NaN;
}
function shown(v: unknown): string {
  return typeof v === 'number' && Number.isFinite(v)
    ? String(Number(v.toPrecision(5)))
    : 'unavailable';
}
function labels(n: number, prefix: string): string[] {
  return Array.from({ length: n }, (_, i) => prefix + i);
}
function started(s: SuperMindSnapshot): boolean {
  const o = s.observatory;
  return (
    !!o && Number.isSafeInteger(o.tick) && o.tick > 0 && (o.mode === 'full' || o.mode === 'echo')
  );
}
function sample(s: SuperMindSnapshot): NeuralSample {
  const latent = copied(s.latent);
  return {
    tick: s.observatory.tick,
    latent,
    rms: rms(latent),
    entropy: numeric(s.qubits.entropy),
    coherence: numeric(s.qubits.coherence),
    sampled: numeric(s.qubits.sampled),
  };
}

/**
 * Received cognition samples, collected for every tab together. Paused/repeated snapshots do not
 * advance history; tick rollback starts a new series. Source identity changes are cleared by the owner.
 */
export class NeuralHistory {
  readonly samples: NeuralSample[] = [];

  /** Accept a completed, new cognition tick; take owned copies and retain at most 96 received samples. */
  ingest(s: SuperMindSnapshot): boolean {
    if (!started(s)) {
      if (s.observatory?.tick === 0) this.clear();
      return false;
    }
    const tick = s.observatory.tick;
    const last = this.samples[this.samples.length - 1];
    if (last?.tick === tick) return false;
    if (last && tick < last.tick) this.clear();
    this.samples.push(sample(s));
    if (this.samples.length > HISTORY_CAPACITY) this.samples.shift();
    return true;
  }

  /** Discard all received samples after a source/session change. */
  clear(): void {
    this.samples.length = 0;
  }
}

function checked(card: NeuralCard, available: boolean): NeuralCard {
  if (!available)
    return {
      ...card,
      series: [],
      labels: [],
      selected: [],
      warning: 'No completed cognition tick; measurement unavailable.',
    };
  const vals = card.series.flatMap((row) => row.values);
  const invalid = vals.filter((v) => !Number.isFinite(v)).length;
  if (invalid)
    card.warning = [
      card.warning,
      String(invalid) + ' nonfinite or missing value(s); gaps are not zero.',
    ]
      .filter(Boolean)
      .join(' ');
  else if (!vals.length) card.warning = card.warning || 'No received samples for this measurement.';
  if (card.range) {
    const [lo, hi] = card.range;
    const outside = vals.filter(
      (v) => Number.isFinite(v) && (v < lo - 1e-12 || v > hi + 1e-12),
    ).length;
    if (outside)
      card.warning = [
        card.warning,
        `${outside} value(s) outside the declared plot range [${lo}, ${hi}]; inspect exact values.`,
      ]
        .filter(Boolean)
        .join(' ');
  }
  return card;
}

function candidates(s: SuperMindSnapshot, novelty: boolean): NeuralCard {
  const o = s.observatory;
  const width = Math.max(0, Math.trunc(o.variantsPerDepth));
  const depth = Math.max(0, Math.trunc(o.activeDepths));
  const data = novelty ? o.search.novelty : o.search.scores;
  const rows = Array.from({ length: depth }, (_, d) => ({
    label: 'depth ' + (d + 1),
    values: Array.from({ length: width }, (_, v) => numeric(data[d * width + v])),
  }));
  const selected = o.search.selectedVariants.flatMap((v, d) =>
    Number.isInteger(v) && v >= 0 && v < width && d < depth ? [d * width + v] : [],
  );
  return {
    id: novelty ? 'world_candidate_novelty' : 'cognition_candidate_search',
    title: novelty ? 'Evaluated candidate novelty' : 'Evaluated candidate scores',
    source: novelty ? 'observatory.search.novelty' : 'observatory.search.scores',
    unit: novelty ? 'novelty fraction' : 'selector score',
    note:
      o.mode +
      ': ' +
      o.search.evaluated +
      ' evaluated candidates; ' +
      depth +
      ' depth(s) × ' +
      width +
      ' variant(s). Borders mark each depth winner, not a branching tree.',
    kind: 'heat',
    series: rows,
    labels: labels(width, 'variant '),
    columns: width,
    selected,
    ...(novelty ? { range: [0, 1] as [number, number] } : {}),
    ...(data.length !== width * depth || o.search.evaluated !== data.length
      ? { warning: 'Candidate shape/count mismatch; missing cells remain unavailable.' }
      : {}),
  };
}

/**
 * Pairwise quantum mutual information of the pure register, computed numerically from the full statevector
 * (|amplitude| from the Born probabilities, arg from the phases). Off-diagonal cell (a,b) is
 * I(a:b) = S(a) + S(b) − S(ab) in bits; the diagonal is the single-qubit entropy S(q), a monotone of
 * the mixedness 1 − r². Never inferred from P(1). Invalid or unnormalized input is unavailable.
 */
function pairInformationCard(probs: readonly number[], phase: readonly number[]): NeuralCard {
  const base: NeuralCard = {
    id: 'quantum_pair_information',
    title: 'Pairwise quantum mutual information',
    source: 'qubits.probs + qubits.phase (full statevector)',
    unit: 'bits',
    note:
      'Cell (a,b) = I(a:b) = S(a)+S(b)−S(ab), von Neumann, of the pure global register: 0 = uncorrelated, ' +
      '1 = a GHZ pair (≥3 qubits), 2 = a Bell pair. Diagonal = single-qubit entropy S(q). Computed numerically ' +
      'from amplitudes, not from P(1); total correlation, not a pairwise entanglement witness. Classical simulation. ' +
      'Normalization roundoff within 1e-9 is removed; larger errors are unavailable.',
    kind: 'heat',
    series: [],
    labels: [],
    range: [0, 2],
  };
  const dim = probs.length;
  if (dim < 4 || (dim & (dim - 1)) !== 0 || phase.length !== dim)
    return { ...base, warning: 'Statevector shape unavailable; no pairwise matrix computed.' };
  let pi: ReturnType<typeof pairwiseMutualInformation>;
  try {
    const amp = amplitudesFromBorn(probs, phase);
    pi = pairwiseMutualInformation(amp.re, amp.im);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return {
      ...base,
      warning: 'Statevector unavailable: ' + error.message + '; no pairwise matrix computed.',
    };
  }
  const n = pi.qubits;
  const at = (a: number, c: number): number => {
    if (a === c) return pi.single[a]!;
    return pi.mutual[pairIndex(a, c, n)]!;
  };
  return {
    ...base,
    series: Array.from({ length: n }, (_, a) => ({
      label: 'q' + a,
      values: Array.from({ length: n }, (_, c) => at(a, c)),
    })),
    labels: labels(n, 'q'),
    columns: n,
  };
}

/**
 * Build three groups of nine directly sourced cards. This function never ingests history or mutates
 * snapshots. If no history owner is supplied, histories contain only the current completed sample.
 */
export function buildNeuralCards(s: SuperMindSnapshot, history?: NeuralHistory): NeuralCard[][] {
  const o = s.observatory;
  const available = started(s);
  const observed = available ? (history?.samples ?? [sample(s)]) : [];
  const ticks = observed.map((v) => String(v.tick));
  const historyNote =
    observed.length +
    '/96 received cognition samples; x = received sample order; labels identify actual cognition ticks. ' +
    'Skipped ticks are not reconstructed; this is not every simulation beat.';
  const latent = copied(s.latent);
  const imagined = copied(s.imagined);
  const reasoned = copied(o.reasoned);
  const predicted = copied(o.predicted);
  const memory = copied(o.memory.values).reverse();
  const q = s.qubits;
  const g = q.geometry;
  const b = q.bloch;
  const metricValues = [...g.metric, g.determinant, g.trace, g.berry].map(numeric);
  const organRows = Array.from({ length: Math.ceil(o.organOutputs.length / 2) }, (_, i) => ({
    label: 'organ ' + i,
    values: [
      numeric(o.organOutputs[2 * i]),
      numeric(o.organOutputs[2 * i + 1]),
      numeric(o.organAttention[i]),
    ],
  }));
  const currentOutputs = [
    latent,
    imagined,
    reasoned,
    copied(o.affectOutputs),
    copied(o.actionOutputs),
  ];
  const groups: NeuralCard[][] = [
    [
      {
        id: 'world_raw_percept',
        title: 'Original World percept',
        source: 'observatory.rawPercept',
        unit: 'normalized input',
        note: 'Original numeric input to this PRIME mind before top-down modulation; phase is a cycle fraction.',
        kind: 'bars',
        series: [{ label: 'input', values: PERCEPT_KEYS.map((k) => numeric(o.rawPercept?.[k])) }],
        labels: [...PERCEPT_KEYS],
        range: [0, 1],
      },
      {
        id: 'world_encoded_senses',
        title: 'Actual cortex inputs',
        source: 'observatory.senses',
        unit: 'encoded activation',
        note: 'Eighteen actual inputs after modulation, including prior affect, memory, and signed phase sine/cosine.',
        kind: 'bars',
        series: [{ label: 'input', values: copied(o.senses) }],
        labels: [...SUPER_SENSE_CHANNELS],
        range: [-1, 1],
      },
      {
        id: 'world_latent_history',
        title: 'Workspace history',
        source: 'latent @ observatory.tick',
        unit: 'activation',
        note: historyNote,
        kind: 'heat',
        series: Array.from({ length: latent.length }, (_, i) => ({
          label: 'latent ' + i,
          values: observed.map((v) => numeric(v.latent[i])),
        })),
        labels: ticks,
        columns: observed.length,
      },
      {
        id: 'world_latent_imagined',
        title: 'Workspace and imagination',
        source: 'latent; imagined',
        unit: 'activation',
        note: 'Current workspace and current imagined vector, indexed by latent channel. Similarity alone is not prediction accuracy.',
        kind: 'lines',
        series: [
          { label: 'workspace', values: latent },
          { label: 'imagined', values: imagined },
        ],
        labels: labels(Math.max(latent.length, imagined.length), 'channel '),
      },
      candidates(s, true),
      {
        id: 'world_organ_outputs',
        title: 'Organ outputs and attention',
        source: 'observatory.organOutputs; observatory.organAttention',
        unit: 'activation / gain',
        note: 'One row per organ: its two raw outputs and its attention gain. No decorative network edges.',
        kind: 'heat',
        series: organRows,
        labels: ['output 0', 'output 1', 'attention'],
        columns: 3,
      },
      {
        id: 'world_latent_rms',
        title: 'Workspace RMS history',
        source: 'sqrt(mean(latent²)) @ observatory.tick',
        unit: 'RMS activation',
        note: historyNote + ' RMS is vector magnitude, not intelligence or spectral power.',
        kind: 'lines',
        series: [{ label: 'RMS', values: observed.map((v) => v.rms) }],
        labels: ticks,
      },
      {
        id: 'world_scalar_memory',
        title: 'Stored scalar memory',
        source: 'observatory.memory.values',
        unit: 'stored scalar',
        note:
          memory.length +
          '/48 valid entries, oldest to newest; mean = ' +
          shown(o.memory.mean) +
          '. This bounded salience/content ring is not an episodic recall score.',
        kind: 'lines',
        series: [{ label: 'memory', values: memory }],
        labels: memory.map((_, i) => String(i + 1)),
      },
      {
        id: 'world_internal_prediction',
        title: 'Reasoned and predicted latent',
        source: 'observatory.reasoned; observatory.predicted',
        unit: 'activation',
        note: 'Actual reasoner output and final recursive predictor output. This internal comparison has no held-out World target.',
        kind: 'lines',
        series: [
          { label: 'reasoned', values: reasoned },
          { label: 'predicted', values: predicted },
        ],
        labels: labels(Math.max(reasoned.length, predicted.length), 'channel '),
      },
    ],
    [
      {
        id: 'cognition_stage_outputs',
        title: 'Current output RMS',
        source:
          'latent; imagined; observatory.reasoned; observatory.affectOutputs; observatory.actionOutputs',
        unit: 'RMS activation',
        note: 'Current vector summaries after their actual updates. Workspace includes later coupling; bars are not stage durations or a process animation.',
        kind: 'bars',
        series: [{ label: 'RMS', values: currentOutputs.map(rms) }],
        labels: ['workspace', 'imagined', 'reasoned', 'affect output', 'action output'],
      },
      {
        id: 'cognition_workspace',
        title: 'Workspace capacity and broadcast',
        source: 'gwtCapacity; broadcast',
        unit: 'count / fraction',
        note: 'Occupancy and capacity are channel counts; access, pressure and broadcast are internal fractions, not consciousness probabilities.',
        kind: 'bars',
        series: [
          {
            label: 'workspace',
            values: [
              s.gwtCapacity.occupancy,
              s.gwtCapacity.capacity,
              s.gwtCapacity.access,
              s.gwtCapacity.pressure,
              s.broadcast,
            ].map(numeric),
          },
        ],
        labels: ['occupancy', 'capacity', 'access', 'pressure', 'broadcast'],
      },
      {
        id: 'cognition_affect',
        title: 'Controller affect state',
        source: 'emotion',
        unit: 'controller coordinate',
        note: 'Valence is signed; arousal and dominance use 0..1. These numerical control variables do not establish experienced feelings.',
        kind: 'bars',
        series: [
          {
            label: 'affect',
            values: [s.emotion.valence, s.emotion.arousal, s.emotion.dominance].map(numeric),
          },
        ],
        labels: ['valence', 'arousal', 'dominance'],
        range: [-1, 1],
      },
      candidates(s, false),
      {
        id: 'cognition_aif',
        title: 'Active-inference belief posterior',
        source: 'aif.posterior',
        unit: 'belief probability',
        note:
          'Discrete internal situation model; free energy = ' +
          shown(s.aif.freeEnergy) +
          ', surprise = ' +
          shown(s.aif.surprise) +
          ', epistemic term = ' +
          shown(s.aif.epistemic) +
          ', pragmatic term = ' +
          shown(s.aif.pragmatic) +
          '. These are model scores, not proven task competence.',
        kind: 'bars',
        series: [{ label: 'posterior', values: copied(s.aif.posterior) }],
        labels: labels(s.aif.posterior.length, 'situation '),
        range: [0, 1],
      },
      {
        id: 'cognition_homeostat',
        title: 'Activity homeostat',
        source: 'criticality',
        unit: 'ratio / gain / fraction',
        note: 'Branching is an activity-ratio estimate; proximity is derived from distance to its target. Neither is a perturbational criticality test.',
        kind: 'bars',
        series: [
          {
            label: 'homeostat',
            values: [
              s.criticality.branching,
              s.criticality.gain,
              s.criticality.activeFraction,
              s.criticality.proximity,
            ].map(numeric),
          },
        ],
        labels: ['branching estimate', 'gain', 'active fraction', 'target proximity'],
      },
      {
        id: 'cognition_plan_scores',
        title: 'Actual plan selector scores',
        source: 'observatory.planScores',
        unit: 'selector score',
        note:
          'Seven final scores supplied to argmax; signed scores remain signed. These are not probabilities. Selected plan: ' +
          s.plan +
          '.',
        kind: 'bars',
        series: [{ label: 'score', values: copied(o.planScores) }],
        labels: [...SUPER_PLANS],
        selected: [SUPER_PLANS.indexOf(s.plan)],
      },
      {
        id: 'cognition_self_model',
        title: 'Self-model and body prediction',
        source: 'metacog; embodiment',
        unit: 'internal score / error',
        note: 'Self-model accuracy is a smoothed internal prediction score. Confidence and control are controller variables; body error uses its own scale.',
        kind: 'bars',
        series: [
          {
            label: 'readout',
            values: [
              s.metacog.selfModelAccuracy,
              s.metacog.confidence,
              s.metacog.control,
              s.metacog.margin,
              s.embodiment.predictionError,
              s.embodiment.contingency,
            ].map(numeric),
          },
        ],
        labels: [
          'self-model accuracy',
          'confidence',
          'control',
          'margin',
          'body prediction error',
          'contingency',
        ],
      },
      {
        id: 'cognition_ising',
        title: 'Spin-lattice state',
        source: 'spin.spins',
        unit: 'spin',
        note:
          'Actual spin signs; energy = ' +
          shown(s.spin.energy) +
          ', magnetization = ' +
          shown(s.spin.magnetization) +
          ', best stored-pattern overlap = ' +
          shown(s.spin.bestOverlap) +
          '.',
        kind: 'heat',
        series: [{ label: 'spins', values: copied(s.spin.spins) }],
        labels: labels(s.spin.spins.length, 'spin '),
        columns: s.spin.spins.length,
        range: [-1, 1],
      },
    ],
    [
      {
        id: 'quantum_control_inputs',
        title: 'Quantum-aspect control inputs',
        source: 'observatory.brain.qubitAspects',
        unit: 'drive intensity',
        note: 'Ten controller aspects captured at the simulated circuit input, before later output modulation. Names are controls, not independent physical measurements.',
        kind: 'bars',
        series: [{ label: 'drive', values: copied(o.brain?.qubitAspects) }],
        labels: [...QUANTUM_ASPECTS],
        range: [0, 1],
      },
      {
        id: 'quantum_basis_probabilities',
        title: 'Computational-basis Born probabilities',
        source: 'qubits.probs',
        unit: 'probability',
        note:
          'All ' +
          q.probs.length +
          ' simulated basis states; bars are exact |amplitude|², without doubling or normalization for display.',
        kind: 'bars',
        series: [{ label: 'Born probability', values: copied(q.probs) }],
        labels: q.probs.map((_, i) => i.toString(2).padStart(q.qubits, '0')),
        range: [0, 1],
      },
      {
        id: 'quantum_metric',
        title: 'Circuit metric and Berry component',
        source: 'qubits.geometry',
        unit: 'circuit-coordinate derivative',
        note:
          'Pre-amplification circuit family: g00, g01, g10, g11, det(g), tr(g), F01 = −2 Im Q01. ' +
          'Determinant and trace are not curvature. Finite-difference half-width = ' +
          shown(g.finiteDifferenceStep) +
          '.',
        kind: 'bars',
        series: [
          {
            label: 'geometry',
            values: g.stencilCrossesBranch ? metricValues.map(() => NaN) : metricValues,
          },
        ],
        labels: ['g00', 'g01', 'g10', 'g11', 'det(g)', 'tr(g)', 'Berry F01'],
        ...(g.stencilCrossesBranch
          ? {
              warning:
                'Stencil crosses the discrete sup > 0.66 Hadamard switch; no smooth local metric is displayed.',
            }
          : {}),
      },
      {
        id: 'quantum_sample_stream',
        title: 'Classical adapter marginal probabilities',
        source: 'eshkol.amplitudes',
        unit: 'P(1)',
        note:
          'Raw per-qubit marginals from the classical state-vector adapter; no physical quantum entropy claim. Draws = ' +
          shown(s.eshkol.draws) +
          '; entropy estimate = ' +
          shown(s.eshkol.entropyEstimate) +
          '; last word = ' +
          s.eshkol.lastBits +
          '.',
        kind: 'bars',
        series: [{ label: 'P(1)', values: copied(s.eshkol.amplitudes) }],
        labels: labels(s.eshkol.amplitudes.length, 'adapter q'),
        range: [0, 1],
      },
      pairInformationCard(q.probs, q.phase),
      {
        id: 'quantum_local_coherence',
        title: 'Qubit probability and local coherence',
        source: 'qubits.p1; qubits.bloch[].x/y',
        unit: 'probability / Bloch magnitude',
        note: 'P(1) and sqrt(x²+y²) are distinct measurements. P(1)=0.5 alone does not show coherence.',
        kind: 'bars',
        series: [
          { label: 'P(1)', values: copied(q.p1) },
          { label: 'equatorial coherence', values: b.map((v) => Math.hypot(v.x, v.y)) },
        ],
        labels: labels(b.length, 'q'),
        range: [0, 1],
      },
      {
        id: 'quantum_entropy_history',
        title: 'Basis entropy and local coherence history',
        source: 'qubits.entropy; qubits.coherence @ observatory.tick',
        unit: 'normalized Shannon entropy / mean coherence',
        note:
          historyNote + ' Entropy describes the Born distribution, not global von Neumann entropy.',
        kind: 'lines',
        series: [
          { label: 'basis entropy', values: observed.map((v) => v.entropy) },
          { label: 'local coherence', values: observed.map((v) => v.coherence) },
        ],
        labels: ticks,
        range: [0, 1],
      },
      {
        id: 'quantum_sample_history',
        title: 'Non-destructive Born-sample history',
        source: 'qubits.sampled @ observatory.tick',
        unit: 'basis index',
        note:
          historyNote +
          ' Full indices 0..' +
          (q.dim - 1) +
          '; no row folding. Sampling does not collapse this statevector.',
        kind: 'bars',
        series: [{ label: 'sampled basis', values: observed.map((v) => v.sampled) }],
        labels: ticks,
        range: [0, q.dim - 1],
      },
      {
        id: 'quantum_bloch_vectors',
        title: 'Single-qubit Bloch vectors',
        source: 'qubits.bloch[].x/y/z',
        unit: 'Bloch coordinate',
        note: 'Actual reduced-state (x,y,z) vectors under a fixed projection. Vector length need not be one.',
        kind: 'bloch',
        series: b.map((v, i) => ({ label: 'q' + i, values: [v.x, v.y, v.z].map(numeric) })),
        labels: ['x', 'y', 'z'],
        range: [-1, 1],
      },
    ],
  ];
  return groups.map((group) => group.map((card) => checked(card, available)));
}
