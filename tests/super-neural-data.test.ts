import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperMind, type SuperMindSnapshot } from '../src/sim/super-mind';
import { buildNeuralCards, NeuralHistory, type NeuralCard } from '../src/ui/super-neural-data';

const percept = {
  energy: 0.65,
  threat: 0.2,
  crowding: 0.3,
  chaos: 0.4,
  wealthRel: 0.55,
  preyClose: 0.35,
  rivalClose: 0.15,
  pull: 0.1,
  light: 0.7,
  sound: 0.25,
  phase: 0.125,
};
function snapshot(): SuperMindSnapshot {
  const mind = new SuperMind(mulberry32(810));
  mind.think(percept);
  return mind.snapshot();
}
function card(s: SuperMindSnapshot, id: string, history?: NeuralHistory): NeuralCard {
  const found = buildNeuralCards(s, history)
    .flat()
    .find((c) => c.id === id);
  if (!found) throw new Error('missing card ' + id);
  return found;
}
const ids = [
  'world_raw_percept',
  'world_encoded_senses',
  'world_latent_history',
  'world_latent_imagined',
  'world_candidate_novelty',
  'world_organ_outputs',
  'world_latent_rms',
  'world_scalar_memory',
  'world_internal_prediction',
  'cognition_stage_outputs',
  'cognition_workspace',
  'cognition_affect',
  'cognition_candidate_search',
  'cognition_aif',
  'cognition_homeostat',
  'cognition_plan_scores',
  'cognition_self_model',
  'cognition_ising',
  'quantum_control_inputs',
  'quantum_basis_probabilities',
  'quantum_metric',
  'quantum_sample_stream',
  'quantum_qubit_mixedness',
  'quantum_local_coherence',
  'quantum_entropy_history',
  'quantum_sample_history',
  'quantum_bloch_vectors',
];

describe('Neural observatory numeric provenance', () => {
  test('27 stable cards are grouped 9/9/9 and identify actual sources and units', () => {
    const groups = buildNeuralCards(snapshot());
    expect(groups.map((g) => g.length)).toEqual([9, 9, 9]);
    expect(groups.flat().map((c) => c.id)).toEqual(ids);
    for (const c of groups.flat()) {
      expect(c.source.length).toBeGreaterThan(3);
      expect(c.unit.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(0);
    }
    expect(groups[0]![0]!.source).toBe('observatory.rawPercept');
    expect(groups[1]![6]!.source).toBe('observatory.planScores');
    expect(groups[2]![1]!.source).toBe('qubits.probs');
  });

  test('a fixed snapshot is deterministic and presentation does not mutate its inputs', () => {
    const s = snapshot();
    const before = structuredClone(s);
    const history = new NeuralHistory();
    history.ingest(s);
    const samples = structuredClone(history.samples);
    const first = buildNeuralCards(s, history);
    for (let i = 0; i < 8; i++) expect(buildNeuralCards(s, history)).toEqual(first);
    expect(s).toEqual(before);
    expect(history.samples).toEqual(samples);
  });

  test('changing one raw input changes only its own card; encoded channels stay separate', () => {
    const s = snapshot();
    const changed = structuredClone(s);
    changed.observatory.rawPercept!.energy = 0.123;
    const before = buildNeuralCards(s).flat();
    const after = buildNeuralCards(changed).flat();
    expect(after[0]!.series[0]!.values[0]).toBe(0.123);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(after[1]!.series[0]!.values).toEqual(s.observatory.senses);
  });

  test('signed activations and nonfinite values are retained, never abs/clamped/zero-filled', () => {
    const s = snapshot();
    s.observatory.senses[10] = -0.75;
    s.observatory.senses[11] = NaN;
    s.observatory.planScores = [-3, -2, -1, 0, 1, 2, 3];
    s.latent[0] = Infinity;
    const sense = card(s, 'world_encoded_senses');
    expect(sense.series[0]!.values[10]).toBe(-0.75);
    expect(Number.isNaN(sense.series[0]!.values[11])).toBe(true);
    expect(sense.warning).toContain('nonfinite');
    expect(card(s, 'cognition_plan_scores').series[0]!.values).toEqual(s.observatory.planScores);
    expect(card(s, 'world_latent_rms').series[0]!.values[0]).toBe(Infinity);
    expect(card(s, 'world_latent_rms').warning).toContain('nonfinite');
  });

  test('history deduplicates ticks, owns copies, caps real samples, and resets on rollback', () => {
    const s = snapshot();
    const history = new NeuralHistory();
    expect(history.ingest(s)).toBe(true);
    const initial = history.samples[0]!.latent[0];
    s.latent[0] = 99;
    expect(history.ingest(s)).toBe(false);
    expect(history.samples[0]!.latent[0]).toBe(initial);
    for (let tick = 2; tick <= 100; tick++) {
      s.observatory.tick = tick;
      history.ingest(s);
    }
    expect(history.samples).toHaveLength(96);
    expect(history.samples[0]!.tick).toBe(5);
    expect(history.samples[95]!.tick).toBe(100);
    s.observatory.tick = 3;
    expect(history.ingest(s)).toBe(true);
    expect(history.samples.map((v) => v.tick)).toEqual([3]);
    history.clear();
    expect(history.samples).toEqual([]);
  });

  test('all history channels collect without a paint or tab visit and retain skipped tick labels', () => {
    const s = snapshot();
    const history = new NeuralHistory();
    s.qubits.sampled = 32;
    history.ingest(s);
    s.observatory.tick = 17;
    s.qubits.sampled = 33;
    s.qubits.entropy = 0.75;
    s.qubits.coherence = 0.25;
    history.ingest(s);
    expect(history.samples).toHaveLength(2);
    const groups = buildNeuralCards(s, history);
    const all = groups.flat();
    for (const id of [
      'world_latent_history',
      'world_latent_rms',
      'quantum_entropy_history',
      'quantum_sample_history',
    ]) {
      expect(all.find((c) => c.id === id)!.labels).toEqual(['1', '17']);
    }
    expect(card(s, 'quantum_sample_history', history).series[0]!.values).toEqual([32, 33]);
    expect(card(s, 'quantum_entropy_history', history).series[0]!.values[1]).toBe(0.75);
    expect(card(s, 'quantum_entropy_history', history).series[1]!.values[1]).toBe(0.25);
    expect(history.samples).toHaveLength(2);
  });

  test('unstarted state has no fabricated measurements or history padding', () => {
    const s = new SuperMind(mulberry32(811)).snapshot();
    const history = new NeuralHistory();
    history.ingest(snapshot());
    expect(history.ingest(s)).toBe(false);
    expect(history.samples).toEqual([]);
    for (const c of buildNeuralCards(s, history).flat()) {
      expect(c.series).toEqual([]);
      expect(c.labels).toEqual([]);
      expect(c.warning).toContain('No completed cognition tick');
    }
    const started = snapshot();
    expect(card(started, 'world_latent_rms').series[0]!.values).toHaveLength(1);
    expect(card(started, 'world_latent_rms', history).series[0]!.values).toEqual([]);
  });

  test('full and echo candidate grids use actual counts and recorded winning variants', () => {
    const mind = new SuperMind(mulberry32(812));
    mind.think(percept, 'full');
    const full = mind.snapshot();
    const grid = card(full, 'cognition_candidate_search');
    expect(grid.columns).toBe(5);
    expect(grid.series.map((r) => r.values.length)).toEqual([5, 5, 5, 5, 5]);
    expect(grid.series.flatMap((r) => r.values)).toEqual(full.observatory.search.scores);
    expect(grid.selected).toEqual(
      full.observatory.search.selectedVariants.map((v, d) => d * 5 + v),
    );
    mind.think(percept, 'echo');
    const echo = mind.snapshot();
    const single = card(echo, 'cognition_candidate_search');
    expect(single.series.flatMap((r) => r.values)).toEqual(echo.observatory.search.scores);
    expect(single.columns).toBe(1);
    expect(single.selected).toEqual([0]);
    expect(card(echo, 'world_candidate_novelty').series[0]!.values).toEqual(
      echo.observatory.search.novelty,
    );
  });

  test('organ outputs, valid memory entries and current output RMS come from distinct actual buffers', () => {
    const s = snapshot();
    const organ = card(s, 'world_organ_outputs');
    expect(organ.series).toHaveLength(30);
    expect(organ.series[0]!.values).toEqual([
      s.observatory.organOutputs[0]!,
      s.observatory.organOutputs[1]!,
      s.observatory.organAttention[0]!,
    ]);
    expect(card(s, 'world_scalar_memory').series[0]!.values).toEqual(
      [...s.observatory.memory.values].reverse(),
    );
    s.latent = [3, 4];
    s.imagined = [-2, 2];
    s.observatory.reasoned = [6];
    s.observatory.affectOutputs = [0];
    s.observatory.actionOutputs = [-5];
    expect(card(s, 'cognition_stage_outputs').series[0]!.values).toEqual([
      Math.sqrt(12.5),
      2,
      6,
      0,
      5,
    ]);
  });

  test('Born and adapter probabilities retain exact values without display multiplication', () => {
    const s = snapshot();
    s.qubits.probs[0] = 0.125;
    s.qubits.probs[1] = 0.375;
    s.eshkol.amplitudes[0] = 0.6;
    s.eshkol.amplitudes[1] = 0;
    expect(card(s, 'quantum_basis_probabilities').series[0]!.values).toEqual(s.qubits.probs);
    expect(card(s, 'quantum_sample_stream').series[0]!.values).toEqual(s.eshkol.amplitudes);
    expect(card(s, 'quantum_basis_probabilities').labels).toHaveLength(64);
  });

  test('single-qubit purity and coherence do not invent pairwise entanglement from P(1)', () => {
    const s = snapshot();
    s.qubits.bloch = [
      { x: 1, y: 0, z: 0, r: 1 },
      { x: 0, y: 0, z: 0, r: 0 },
    ];
    s.qubits.p1 = [0.5, 0.5];
    const mixedness = card(s, 'quantum_qubit_mixedness');
    expect(mixedness.series[0]!.values).toEqual([1, 0.5]);
    expect(mixedness.series[1]!.values).toEqual([0, 1]);
    const coherence = card(s, 'quantum_local_coherence');
    expect(coherence.series[0]!.values).toEqual([0.5, 0.5]);
    expect(coherence.series[1]!.values).toEqual([1, 0]);
    expect(card(s, 'quantum_bloch_vectors').series[0]!.values).toEqual([1, 0, 0]);
  });

  test('geometry preserves signed Berry values and explicitly withholds branch-crossing local metrics', () => {
    const s = snapshot();
    s.qubits.geometry.metric = [1, -0.2, -0.2, 2];
    s.qubits.geometry.determinant = 1.96;
    s.qubits.geometry.trace = 3;
    s.qubits.geometry.berry = -0.3;
    s.qubits.geometry.stencilCrossesBranch = false;
    expect(card(s, 'quantum_metric').series[0]!.values).toEqual([1, -0.2, -0.2, 2, 1.96, 3, -0.3]);
    s.qubits.geometry.stencilCrossesBranch = true;
    const invalid = card(s, 'quantum_metric');
    expect(invalid.series[0]!.values.every(Number.isNaN)).toBe(true);
    expect(invalid.warning).toContain('Hadamard switch');
  });
});
