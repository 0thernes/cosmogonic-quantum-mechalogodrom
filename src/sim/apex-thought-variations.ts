/**
 * APEX thought-variation catalog — 100 deterministic 1/1 alien cognitive substrates.
 *
 * Each entry maps a named variation (psychology, neuroscience, quantum, neuromorphic, wet computing,
 * A-Life) to an apex organ correlate. These are ARCHITECTURE METADATA — they drive telemetry labels
 * and growth-stage rotation, not literal sentience claims (honesty contract: Level 3-4 conjunction,
 * never Level 5).
 *
 * @see docs/ARCHITECTURE-2026-06-26.md
 */
export type ThoughtFamily =
  | 'psychology'
  | 'neuroscience'
  | 'quantum'
  | 'neuromorphic'
  | 'wet'
  | 'alife'
  | 'empowerment';

export type ApexOrganRef =
  | 'loom'
  | 'drum'
  | 'necro'
  | 'klein'
  | 'hive'
  | 'quantum'
  | 'hydra'
  | 'wraith'
  | 'tunnel'
  | 'thermo'
  | 'ouroboros'
  | 'meta-phantom'
  | 'meta-retro'
  | 'meta-godel'
  | 'meta-wigner';

export interface ApexThoughtVariation {
  readonly id: number;
  readonly name: string;
  readonly family: ThoughtFamily;
  readonly organ: ApexOrganRef;
  /** One-line scientific substrate (real math underneath — not lore). */
  readonly substrate: string;
}

const STEMS: Record<ThoughtFamily, readonly string[]> = {
  psychology: [
    'Predictive-ghost',
    'Umwelt-scar',
    'Valence-inversion',
    'Appraisal-cascade',
    'Counterfactual-dream',
    'Attachment-knot',
    'Dissociation-fold',
    'Hypervigilance-ring',
    'Ego-dissolution',
    'Shadow-latent',
    'Archetype-reservoir',
    'Trauma-imprint',
    'Flow-state',
    'Cognitive-dissonance',
    'Theory-of-mind-echo',
  ],
  neuroscience: [
    'Spike-rainbow',
    'Dendritic-shimmer',
    'Apical-tuft',
    'Oscillatory-gamma',
    'Thalamic-gate',
    'Cortical-column',
    'Cerebellar-error',
    'Hippocampal-loop',
    'Basal-ganglia-go',
    'Amygdala-surge',
    'Claustrum-bind',
    'Default-mode',
    'Salience-network',
    'Mirror-resonance',
    'Neuromodulator-drip',
    'Synaptic-tagging',
    'Spindle-wave',
    'Place-cell',
    'Grid-field',
    'Predictive-coding',
  ],
  quantum: [
    'Born-collapse',
    'Entangle-pair',
    'Decoherence-shield',
    'Superposition-plan',
    'QGT-volume',
    'Magic-state',
    'Tunnel-manifest',
    'Amplitude-interference',
    'Phase-kick',
    'Stabilizer-reflex',
    'Statevector-bloom',
    'Measurement-scar',
    'Qubit-reservoir',
    'Linear-entropy',
    'Unitary-breath',
  ],
  neuromorphic: [
    'Memristor-plasticity',
    'Spiking-ISAAC',
    'Loihi-echo',
    'Crossbar-routing',
    'Event-camera',
    'Silicon-dendrite',
    'Analog-mismatch',
    'Reservoir-echo',
    'Pulse-frequency',
    'STDP-scar',
    'Neuromorphic-heat',
    'Axon-delay-line',
    'Soma-integrate',
    'Inhibitory-surround',
    'Winner-take-all',
  ],
  wet: [
    'Protein-folding-pulse',
    'Ion-channel-storm',
    'Microtubule-resonance',
    'Chemotaxis-trail',
    'Slime-pulse',
    'Bioelectric-morph',
    'Enzyme-cascade',
    'Lipid-raft',
    'Cytoskeletal-wave',
    'Metabolic-oscillator',
  ],
  alife: [
    'Petri-lineage',
    'NCA-scar',
    'Morphogen-gradient',
    'Stigmergic-trail',
    'Autopoiesis-loop',
    'Open-ended-novelty',
    'Emergence-angle',
    'Faculty-echo',
    'Archon-light',
    'Digital-biologic',
    'Primordial-soup',
    'Tsotchke-catalysis',
    'Eshkol-program',
    'Biologic-form',
    'Morphic-field',
  ],
  empowerment: [
    'Affordance-map',
    'Expected-free-energy',
    'Active-inference',
    'Empowerment-max',
    'Game-theory-pulse',
    'Cartel-signal',
    'Arbitrage-scent',
    'Sanction-ghost',
    'Black-market',
    'Vickrey-bid',
  ],
};

function buildCatalog(): ApexThoughtVariation[] {
  const out: ApexThoughtVariation[] = [];
  let id = 0;
  const organCycle: ApexOrganRef[] = [
    'loom',
    'drum',
    'necro',
    'klein',
    'hive',
    'quantum',
    'hydra',
    'wraith',
    'tunnel',
    'thermo',
    'ouroboros',
    'meta-phantom',
    'meta-retro',
    'meta-godel',
    'meta-wigner',
  ];
  for (const [family, stems] of Object.entries(STEMS) as [ThoughtFamily, readonly string[]][]) {
    for (let i = 0; i < stems.length; i++) {
      const organ = organCycle[id % organCycle.length]!;
      out.push({
        id,
        name: stems[i]!,
        family,
        organ,
        substrate: `${family} · ${organ} correlate`,
      });
      id++;
    }
  }
  if (out.length !== 100)
    throw new Error(`thought catalog must have 100 entries, got ${out.length}`);
  return out;
}

/** The full 100-variation catalog (immutable). */
export const APEX_THOUGHT_VARIATIONS: readonly ApexThoughtVariation[] = buildCatalog();

/** Pick the active variation for a beat from level + transcendence (deterministic rotation). */
export function activeThoughtVariation(
  level: number,
  transcendence: number,
  beat: number,
): ApexThoughtVariation {
  const idx =
    (Math.floor(level * 0.7) + Math.floor(transcendence * 100) + beat) %
    APEX_THOUGHT_VARIATIONS.length;
  return APEX_THOUGHT_VARIATIONS[idx]!;
}

/** Count variations per family (for telemetry / Bible). */
export function thoughtVariationCounts(): Record<ThoughtFamily, number> {
  const c: Record<ThoughtFamily, number> = {
    psychology: 0,
    neuroscience: 0,
    quantum: 0,
    neuromorphic: 0,
    wet: 0,
    alife: 0,
    empowerment: 0,
  };
  for (const v of APEX_THOUGHT_VARIATIONS) c[v.family]++;
  return c;
}
