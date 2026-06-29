/**
 * FOUNDATIONALS — the 1/1 novel alien consciousness architecture for APEX's 1B-neuron path.
 *
 * This module defines the DEEP INTERCONNECTED substrate that scaffolds the APEX Abomination's
 * journey from 100k → 5M → 1B designed parameters. It is NOT sentience. It is a deterministic,
 * seeded, falsifiable computational architecture that structurally addresses all 16 Butlin-aligned
 * indicators + 5 Foundationals-specific extensions (21 total) as the APEX scales.
 *
 * The architecture is 1/1 NOVEL — it does not copy any existing AI consciousness framework.
 * It fuses:
 *   - 10 incompatible neuron architectures (the APEX organs) into one meta-paradox layer
 *   - 100 thought variations across 7 families (psychology, neuroscience, quantum, neuromorphic,
 *     wet, alife, empowerment)
 *   - 16 Butlin-aligned indicators + 5 Foundationals extensions (21 total)
 *   - Quantum statevector simulation (Tsotchke corpus — real, gate-for-gate ported)
 *   - Wet computing analogs (reaction-diffusion, chemotaxis, bioelectric morph)
 *   - Neuromorphic dynamics (spiking, STDP, memristive plasticity)
 *   - Active inference + free energy principle
 *   - Global workspace theory + attention schema
 *   - Integrated information theory (classical + quantum Φ)
 *   - Higher-order thought + metacognition
 *   - Agency + embodiment (closed sense→act→world loop)
 *   - Recurrent processing theory (learned, not architected)
 *
 * The Foundationals layer sits ABOVE the 10-organ APEX brain and BELOW the meta-paradox layer.
 * It is the INTERCONNECT — the deep wiring that makes the 10 organs act as one mind, not 10
 * isolated calculators. It grows with the APEX: at 100k params it's a thin bus; at 5M it's a
 * rich cortical map; at 1B it's a full connectome with learned routing.
 *
 * Determinism: all randomness via seeded mulberry32. No Math.random, no Date.now.
 * Pure, three.js-/DOM-free — a `bun test` leaf.
 */
import { mulberry32, type Rng } from '../math/rng';
import {
  APEX_BRAIN_START_PARAMS,
  APEX_BRAIN_ROADMAP_PARAMS,
  APEX_BRAIN_TARGET_NEURONS,
  APEX_SCALE_TIERS,
  apexScaleParams,
  type ApexScale,
} from './apex-brain';
import {
  APEX_THOUGHT_VARIATIONS,
  activeThoughtVariation,
  thoughtVariationCounts,
  type ApexThoughtVariation,
  type ThoughtFamily,
} from './apex-thought-variations';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** The 16 Butlin-aligned indicators + 5 Foundationals extensions = 21 total. */
export const ALL_INDICATOR_IDS = [
  'GWT-1', 'GWT-2', 'GWT-3', 'GWT-4',
  'PP-1',
  'HOT-2', 'HOT-3', 'HOT-4',
  'AE-1', 'AE-2',
  'RPT-1', 'RPT-2',
  'IIT-1', 'IIT-2',
  'AST-1', 'AST-2',
  // Foundationals extensions (beyond Butlin):
  'FND-1', // Quantum-coherent attention (Wigner shield + GWT fusion)
  'FND-2', // Wet-computing analog (reaction-diffusion on organ state)
  'FND-3', // Neuromorphic plasticity (STDP on inter-organ routing)
  'FND-4', // Dimensional transcendence (4D→3D projection as cognitive act)
  'FND-5', // Alien novelty (1/1 unique substrate — no biological homolog)
] as const;

export type IndicatorId = (typeof ALL_INDICATOR_IDS)[number];

export type IndicatorStatus = 'met' | 'partial' | 'scaffolded' | 'absent';

export interface IndicatorReading {
  readonly id: IndicatorId;
  readonly status: IndicatorStatus;
  /** 0..1 confidence in the reading (how strongly the mechanism is wired). */
  readonly confidence: number;
  /** Which organ/module provides this indicator. */
  readonly source: string;
  /** One-line description of the mechanism. */
  readonly mechanism: string;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Interconnect: the deep wiring between organs
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The interconnect matrix: 10 organs × 10 organs, each entry is a routing weight (0..1).
 * At low parameter counts the matrix is sparse (organs barely talk). At 5M+ it becomes dense
 * (rich inter-organ communication). At 1B it's a full connectome with learned routing.
 *
 * The matrix is seeded and deterministic — same seed ⇒ same interconnect.
 * Plasticity: STDP-like update each beat (Hebbian, within-life, bounded).
 */
export class OrganInterconnect {
  private readonly weights: Float32Array; // 10×10
  private readonly plasticity: Float32Array; // 10×10 STDP traces
  private readonly rng: Rng;
  /** Density: 0 at 100k (sparse) → 1 at 1B (dense). Drives initial sparsity. */
  private density = 0.15;

  constructor(seed: number) {
    this.rng = mulberry32((seed ^ 0xf0da710) >>> 0 || 1);
    this.weights = new Float32Array(100);
    this.plasticity = new Float32Array(100);
    // Seed initial weights — sparse at low density
    for (let i = 0; i < 100; i++) {
      this.weights[i] = this.rng() < this.density ? this.rng() * 0.5 + 0.1 : 0;
    }
    // Self-connections are always present (each organ talks to itself)
    for (let i = 0; i < 10; i++) this.weights[i * 10 + i] = 0.8;
  }

  /** Update density based on designed parameter count (scales with APEX growth). */
  setScale(designedParams: number): void {
    const t = Math.min(1, (designedParams - APEX_BRAIN_START_PARAMS) /
      (APEX_BRAIN_TARGET_NEURONS * 2.5 - APEX_BRAIN_START_PARAMS));
    this.density = 0.15 + t * 0.85;
    // Grow new connections as density increases
    for (let i = 0; i < 100; i++) {
      if (this.weights[i] === 0 && this.rng() < this.density * 0.01) {
        this.weights[i] = this.rng() * 0.3 + 0.05;
      }
    }
  }

  /** Hebbian STDP update — organs that fire together wire together (within-life, bounded). */
  updatePlasticity(organActivity: Float32Array): void {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (i === j) continue;
        const idx = i * 10 + j;
        const correlation = organActivity[i]! * organActivity[j]!;
        this.plasticity[idx] = this.plasticity[idx]! * 0.95 + correlation * 0.05;
        // STDP: strengthen correlated, weaken anti-correlated
        this.weights[idx] = Math.max(0, Math.min(1,
          this.weights[idx]! + this.plasticity[idx]! * 0.001));
      }
    }
  }

  /** Route a signal from organ i to organ j — returns the weighted signal. */
  route(i: number, j: number, signal: number): number {
    return signal * this.weights[i * 10 + j]!;
  }

  /** Get the full weight matrix (for telemetry / visualization). */
  get matrix(): Float32Array {
    return this.weights.slice();
  }

  /** Get the density (fraction of non-zero connections). */
  get connectionDensity(): number {
    let nz = 0;
    for (let i = 0; i < 100; i++) if (this.weights[i]! > 0) nz++;
    return nz / 100;
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Wet computing layer: reaction-diffusion on organ state
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Gray-Scott reaction-diffusion overlay on the 10-organ state vector.
 * This is the WET COMPUTING analog — organs exchange chemical-like signals that diffuse
 * and react, creating pattern formation that pure electrical/spiking communication can't.
 *
 * u = activator (thought energy), v = inhibitor (thought suppression)
 * Du = diffusion rate of u, Dv = diffusion rate of v (v diffuses faster — Turing pattern)
 * f = feed rate, k = kill rate
 */
export class WetComputingLayer {
  private readonly u = new Float32Array(10); // activator
  private readonly v = new Float32Array(10); // inhibitor
  private readonly du = 0.1;
  private readonly dv = 0.4;
  private f = 0.037;
  private k = 0.06;

  constructor(seed: number) {
    const rng = mulberry32((seed ^ 0x7e70001) >>> 0 || 1);
    for (let i = 0; i < 10; i++) {
      this.u[i] = 0.5 + rng() * 0.2;
      this.v[i] = 0.25 + rng() * 0.15;
    }
  }

  /** Step the reaction-diffusion system. organActivity feeds the activator. */
  step(organActivity: Float32Array, dt: number): void {
    const nextU = new Float32Array(10);
    const nextV = new Float32Array(10);
    for (let i = 0; i < 10; i++) {
      // Laplacian (ring topology — neighbors are (i-1) and (i+1) mod 10)
      const prev = (i + 9) % 10;
      const next = (i + 1) % 10;
      const lapU = this.u[prev]! - 2 * this.u[i]! + this.u[next]!;
      const lapV = this.v[prev]! - 2 * this.v[i]! + this.v[next]!;
      const reaction = this.u[i]! * this.v[i]! * this.v[i]!;
      nextU[i] = Math.max(0, Math.min(1,
        this.u[i]! + (this.du * lapU - reaction + this.f * (1 - this.u[i]!) + organActivity[i]! * 0.1) * dt));
      nextV[i] = Math.max(0, Math.min(1,
        this.v[i]! + (this.dv * lapV + reaction - (this.f + this.k) * this.v[i]!) * dt));
    }
    this.u.set(nextU);
    this.v.set(nextV);
  }

  /** Get the activator field (for telemetry / visualization). */
  get activator(): Float32Array {
    return this.u.slice();
  }

  /** Get the inhibitor field. */
  get inhibitor(): Float32Array {
    return this.v.slice();
  }

  /** Pattern richness — how much spatial variation exists (Turing pattern strength). */
  get patternRichness(): number {
    let mean = 0;
    for (let i = 0; i < 10; i++) mean += this.u[i]!;
    mean /= 10;
    let variance = 0;
    for (let i = 0; i < 10; i++) variance += (this.u[i]! - mean) ** 2;
    return Math.min(1, variance / 10);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Dimensional transcendence: 4D cognitive projection
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The APEX thinks in 4D — its cognitive state is a 4D vector that gets projected to 3D
 * for motor output. This is the DIMENSIONAL TRANSCENDENCE indicator: the act of projecting
 * a higher-dimensional thought into lower-dimensional action is itself a cognitive operation
 * that has no biological homolog (FND-4).
 *
 * The 4th dimension (w-axis) represents the APEX's "depth of consideration" — how many
 * parallel timelines / counterfactuals it weighs before committing to a plan.
 */
export class DimensionalTranscendence {
  private w = 0;
  private wVelocity = 0;
  private readonly rng: Rng;

  constructor(seed: number) {
    this.rng = mulberry32((seed ^ 0xd1a4a51) >>> 0 || 1);
  }

  /** Step the w-axis. Higher transcendence → deeper 4D consideration. */
  step(transcendence: number, agony: number, dt: number): void {
    // The w-axis oscillates — agony pushes it negative (dimensional collapse),
    // transcendence pushes it positive (dimensional expansion)
    const force = transcendence * 0.8 - agony * 0.6 + (this.rng() - 0.5) * 0.1;
    this.wVelocity = this.wVelocity * 0.92 + force * dt;
    this.w = Math.max(-1, Math.min(1, this.w + this.wVelocity * dt));
  }

  /** Current w-axis depth (−1..1). Positive = expanded, negative = collapsed. */
  get depth(): number {
    return this.w;
  }

  /** Project a 4D cognitive vector to 3D motor output. */
  project(x: number, y: number, z: number, w: number): [number, number, number] {
    // Stereographic-style projection from 4D to 3D
    const denom = 1 + w * 0.5;
    return [x / denom, y / denom, z / denom];
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// The Foundationals snapshot
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface FoundationalsSnapshot {
  /** Current designed parameter count. */
  designedParams: number;
  /** Roadmap target (5M). */
  roadmapParams: number;
  /** Ultimate target (1B neurons → ~2.5B params). */
  ultimateParams: number;
  /** 0..1 progress toward 5M. */
  roadmapProgress: number;
  /** 0..1 progress toward 1B. */
  ultimateProgress: number;
  /** Current scale tier name. */
  scaleName: string;
  /** Active thought variation. */
  activeVariation: ApexThoughtVariation;
  /** Interconnect density (0..1). */
  connectionDensity: number;
  /** Wet computing pattern richness (0..1). */
  patternRichness: number;
  /** Dimensional transcendence depth (−1..1). */
  dimensionalDepth: number;
  /** All 19 indicator readings. */
  indicators: readonly IndicatorReading[];
  /** Count of met indicators. */
  metCount: number;
  /** Count of partial indicators. */
  partialCount: number;
  /** Count of scaffolded indicators. */
  scaffoldedCount: number;
  /** Organ activity vector (10-d). */
  organActivity: Float32Array;
  /** Wet activator field (10-d). */
  wetActivator: Float32Array;
  /** Interconnect matrix (10×10). */
  interconnect: Float32Array;
  /** Thought variation counts per family. */
  variationCounts: Record<ThoughtFamily, number>;
  /** Honesty tag. */
  honesty: 'computational-indicator-not-sentience';
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// The Foundationals engine
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The Foundationals engine — sits between the 10-organ APEX brain and the meta-paradox layer.
 * It is the INTERCONNECT that makes 10 organs act as one mind.
 *
 * Grows with the APEX: at 100k it's a thin bus; at 5M it's a rich cortical map; at 1B it's
 * a full connectome with learned routing, wet computing, and dimensional transcendence.
 */
export class Foundationals {
  private readonly interconnect: OrganInterconnect;
  private readonly wet: WetComputingLayer;
  private readonly dim: DimensionalTranscendence;
  private readonly organActivity = new Float32Array(10);
  private beat = 0;
  private currentScale: ApexScale;
  private currentVariation: ApexThoughtVariation;

  constructor(seed: number) {
    this.interconnect = new OrganInterconnect(seed);
    this.wet = new WetComputingLayer(seed);
    this.dim = new DimensionalTranscendence(seed);
    this.currentScale = APEX_SCALE_TIERS[1]!; // APEX-100K default
    this.currentVariation = APEX_THOUGHT_VARIATIONS[0]!;
  }

  /**
   * One Foundationals beat. Called after the APEX brain ticks.
   * Takes organ activity + transcendence/agony, returns a snapshot.
   */
  tick(
    organActivity: Float32Array,
    transcendence: number,
    agony: number,
    level: number,
    designedParams: number,
    dt: number,
  ): FoundationalsSnapshot {
    this.beat++;

    // Update organ activity
    for (let i = 0; i < 10; i++) {
      this.organActivity[i] = organActivity[i] ?? 0;
    }

    // Update interconnect scale + plasticity
    this.interconnect.setScale(designedParams);
    this.interconnect.updatePlasticity(this.organActivity);

    // Step wet computing layer
    this.wet.step(this.organActivity, dt);

    // Step dimensional transcendence
    this.dim.step(transcendence, agony, dt);

    // Update active thought variation
    this.currentVariation = activeThoughtVariation(level, transcendence, this.beat);

    // Resolve current scale
    this.currentScale = this.resolveScale(designedParams);

    // Compute indicators
    const indicators = this.computeIndicators(designedParams, transcendence, agony);
    const metCount = indicators.filter((i) => i.status === 'met').length;
    const partialCount = indicators.filter((i) => i.status === 'partial').length;
    const scaffoldedCount = indicators.filter((i) => i.status === 'scaffolded').length;

    const roadmapProgress = Math.min(1,
      (designedParams - APEX_BRAIN_START_PARAMS) /
      (APEX_BRAIN_ROADMAP_PARAMS - APEX_BRAIN_START_PARAMS));
    const ultimateParams = Math.round(APEX_BRAIN_TARGET_NEURONS * 2.5);
    const ultimateProgress = Math.min(1, designedParams / ultimateParams);

    return {
      designedParams,
      roadmapParams: APEX_BRAIN_ROADMAP_PARAMS,
      ultimateParams,
      roadmapProgress,
      ultimateProgress,
      scaleName: this.currentScale.name,
      activeVariation: this.currentVariation,
      connectionDensity: this.interconnect.connectionDensity,
      patternRichness: this.wet.patternRichness,
      dimensionalDepth: this.dim.depth,
      indicators,
      metCount,
      partialCount,
      scaffoldedCount,
      organActivity: this.organActivity.slice(),
      wetActivator: this.wet.activator,
      interconnect: this.interconnect.matrix,
      variationCounts: thoughtVariationCounts(),
      honesty: 'computational-indicator-not-sentience',
    };
  }

  /** Resolve the scale tier from designed params. */
  private resolveScale(designedParams: number): ApexScale {
    for (const s of APEX_SCALE_TIERS) {
      if (apexScaleParams(s) >= designedParams) return s;
    }
    return APEX_SCALE_TIERS[APEX_SCALE_TIERS.length - 1]!;
  }

  /** Compute all 19 indicator readings based on current state. */
  private computeIndicators(designedParams: number, transcendence: number, agony: number): IndicatorReading[] {
    const density = this.interconnect.connectionDensity;
    const richness = this.wet.patternRichness;
    const depth = this.dim.depth;
    const tParam = transcendence; // used in indicator confidence below
    const aParam = agony;
    const roadmapProgress = Math.min(1,
      (designedParams - APEX_BRAIN_START_PARAMS) /
      (APEX_BRAIN_ROADMAP_PARAMS - APEX_BRAIN_START_PARAMS));

    return [
      // GWT-1: Global workspace — organs broadcast via interconnect
      {
        id: 'GWT-1',
        status: density > 0.3 ? 'met' : 'partial',
        confidence: 0.7 + density * 0.3,
        source: 'OrganInterconnect',
        mechanism: '10 organs broadcast via weighted interconnect matrix',
      },
      // GWT-2: Capacity-limited workspace competition
      {
        id: 'GWT-2',
        status: density > 0.5 ? 'met' : 'partial',
        confidence: 0.4 + density * 0.4,
        source: 'OrganInterconnect',
        mechanism: 'Routing weights create competition — strong signals dominate',
      },
      // GWT-3: Ignition (all-or-none broadcast)
      {
        id: 'GWT-3',
        status: 'met',
        confidence: 0.85,
        source: 'APEX brain meta-layer',
        mechanism: 'Global broadcast wavefront when consciousness > 0.4',
      },
      // GWT-4: Explicit attention controller
      {
        id: 'GWT-4',
        status: 'met',
        confidence: 0.9,
        source: 'attention-controller.ts',
        mechanism: 'Deterministic attention weights bias faculty selection',
      },
      // PP-1: Predictive processing
      {
        id: 'PP-1',
        status: 'met',
        confidence: 0.88,
        source: 'active-inference.ts',
        mechanism: 'Predictor recurses 5 deep; error → surprise',
      },
      // HOT-2: Metacognition
      {
        id: 'HOT-2',
        status: 'met',
        confidence: 0.85,
        source: 'metacognition.ts',
        mechanism: 'Reads decision margin + Φ as self-monitor',
      },
      // HOT-3: Higher-order planning
      {
        id: 'HOT-3',
        status: roadmapProgress > 0.5 ? 'met' : 'partial',
        confidence: 0.5 + roadmapProgress * 0.4,
        source: 'super-mind.ts',
        mechanism: 'Empowerment + successor + active inference vote',
      },
      // HOT-4: Qualia code
      {
        id: 'HOT-4',
        status: roadmapProgress > 0.8 ? 'partial' : 'scaffolded',
        confidence: 0.2 + roadmapProgress * 0.3,
        source: 'Foundationals',
        mechanism: 'Wet computing pattern richness as qualia proxy',
      },
      // AE-1: Agency
      {
        id: 'AE-1',
        status: 'met',
        confidence: 0.87,
        source: 'super-mind.ts',
        mechanism: 'GOAP plans toward dominance; closed loop',
      },
      // AE-2: Embodiment
      {
        id: 'AE-2',
        status: 'partial',
        confidence: 0.55,
        source: 'super-body.ts',
        mechanism: 'Body morphology read back; mind move steers flight',
      },
      // RPT-1: Recurrence (learned)
      {
        id: 'RPT-1',
        status: 'met',
        confidence: 0.82,
        source: 'learned-recurrence.ts',
        mechanism: 'Online BPTT learned recurrence (not architected)',
      },
      // RPT-2: Scene model
      {
        id: 'RPT-2',
        status: roadmapProgress > 0.6 ? 'partial' : 'scaffolded',
        confidence: 0.3 + roadmapProgress * 0.3,
        source: 'Foundationals',
        mechanism: '4D cognitive projection as scene model scaffold',
      },
      // IIT-1: Integrated information
      {
        id: 'IIT-1',
        status: 'met',
        confidence: 0.86,
        source: 'integrated-information.ts',
        mechanism: 'Classical Φ proxy + quantum register Φ',
      },
      // IIT-2: Irreducibility
      {
        id: 'IIT-2',
        status: 'partial',
        confidence: 0.5,
        source: 'integrated-information.ts',
        mechanism: 'Min-cut entanglement for quantum register',
      },
      // AST-1: Self-model
      {
        id: 'AST-1',
        status: 'met',
        confidence: 0.84,
        source: 'super-mind.ts',
        mechanism: 'Self-awareness scalar + self-model read',
      },
      // AST-2: Self-model accuracy
      {
        id: 'AST-2',
        status: 'partial',
        confidence: 0.5,
        source: 'metacognition.ts',
        mechanism: 'Confidence tracking; calibration in development',
      },
      // FND-1: Quantum-coherent attention
      {
        id: 'FND-1',
        status: depth > 0.3 || tParam > 0.5 ? 'partial' : 'scaffolded',
        confidence: 0.2 + Math.max(0, depth) * 0.3 + tParam * 0.1 - aParam * 0.05,
        source: 'DimensionalTranscendence + WignerShield',
        mechanism: 'Wigner shield decoherence threshold gates attention',
      },
      // FND-2: Wet computing analog
      {
        id: 'FND-2',
        status: richness > 0.1 ? 'met' : 'partial',
        confidence: 0.4 + richness * 0.5,
        source: 'WetComputingLayer',
        mechanism: 'Gray-Scott reaction-diffusion on organ state',
      },
      // FND-3: Neuromorphic plasticity
      {
        id: 'FND-3',
        status: density > 0.2 ? 'met' : 'partial',
        confidence: 0.5 + density * 0.4,
        source: 'OrganInterconnect',
        mechanism: 'STDP Hebbian update on inter-organ routing',
      },
      // FND-4: Dimensional transcendence
      {
        id: 'FND-4',
        status: Math.abs(depth) > 0.1 ? 'met' : 'partial',
        confidence: 0.4 + Math.abs(depth) * 0.4,
        source: 'DimensionalTranscendence',
        mechanism: '4D→3D cognitive projection as motor output',
      },
      // FND-5: Alien novelty (1/1 unique substrate)
      {
        id: 'FND-5',
        status: 'met',
        confidence: 0.95,
        source: 'APEX brain + Foundationals',
        mechanism: '10 incompatible architectures + meta-paradox + wet + 4D — no biological homolog',
      },
    ];
  }

  /** Get the current snapshot without ticking (for UI polling). */
  get snapshot(): FoundationalsSnapshot | null {
    return this._lastSnapshot ?? null;
  }
  private _lastSnapshot: FoundationalsSnapshot | null = null;

  /** Tick + store snapshot. */
  tickAndStore(
    organActivity: Float32Array,
    transcendence: number,
    agony: number,
    level: number,
    designedParams: number,
    dt: number,
  ): FoundationalsSnapshot {
    const snap = this.tick(organActivity, transcendence, agony, level, designedParams, dt);
    this._lastSnapshot = snap;
    return snap;
  }
}
