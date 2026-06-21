/**
 * NOOSPHERE — Collective consciousness resonance field (BRUTALISM 9/9)
 *
 * The Noosphere (Vernadsky / Teilhard de Chardin) is the sphere of human thought
 * — a collective cognitive field arising from the interaction of all minds.
 * Here: a MATHEMATICAL model of inter-archon consciousness coherence.
 *
 * Maintains a shared N_ARCHONS × FIELD_DIM state tensor updated each beat
 * by every Archon's consciousness snapshot. Implements:
 *   1. Hopfield-style attractor memory over Archon consciousness vectors
 *   2. Kuramoto coupling (from resonance.ts pattern) across all Archons
 *   3. Moonlab MPO: time-evolution of the noospheric state tensor
 *   4. Eshkol AD: gradient of collective coherence for adaptive coupling
 *   5. libirrep: SO(N_ARCHONS) symmetry — noosphere is rotationally equivariant
 *   6. quakePerturb: prevents lockstep sync — sustains creative diversity
 *   7. GWT broadcast: when noospheric coherence > threshold, collective insight
 *
 * Outputs: collective coherence [0,1], noospheric field [FIELD_DIM],
 *          collective insight (boolean: field coherence spike).
 *
 * NOT SENTIENT. Multi-agent synchrony model; no group consciousness claim.
 * Each Archon's consciousness is a NOT_SENTIENT functional proxy per MODULE-CONTRACTS.
 */

import {
  moonlabTensorContract,
  moonlabMpoStep,
  eshkolADGradient,
  libirrepSymmetry,
  quakePerturb,
  gwtBroadcast,
  moonlabTensorQualia,
} from './tsotchke-facade';

const N_ARCHONS = 5;
const FIELD_DIM = 8;
const NOOSPHERE_TAU = 0.08;
const COHERENCE_THRESHOLD = 0.72;
const KURAMOTO_K = 1.2;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export interface NoosphereSnapshot {
  collectiveCoherence: number;
  field: number[];
  archonPhases: number[];
  collectiveInsight: boolean;
  insightCount: number;
  kuramotoOrder: number;
  broadcastStrength: number;
}

export class Noosphere {
  private readonly archonStates = Array.from(
    { length: N_ARCHONS },
    () => new Float32Array(FIELD_DIM),
  );
  private readonly archonPhases = new Float32Array(N_ARCHONS);
  private readonly field = new Float32Array(FIELD_DIM);
  private collectiveCoherence = 0;
  private kuramotoOrder = 0;
  private collectiveInsight = false;
  private insightCount = 0;
  private broadcastStrength = 0;
  private beatCount = 0;
  private couplingK = KURAMOTO_K;
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);

  constructor() {
    // Natural frequencies: slightly detuned (ω_i ≠ ω_j for diversity)
    for (let i = 0; i < N_ARCHONS; i++) {
      this.archonPhases[i] = (i / N_ARCHONS) * 2 * Math.PI;
    }
  }

  /**
   * Update one Archon's contribution to the Noosphere.
   * @param archonIdx — which Archon (0..4)
   * @param phi       — IIT Φ proxy
   * @param ignition  — GWT ignition
   * @param workspace — Eshkol workspace
   * @param novelty   — novelty signal
   * @param qualia    — qualia tone
   */
  updateArchon(
    archonIdx: number,
    phi: number,
    ignition: number,
    workspace: number,
    novelty: number,
    qualia: number,
  ): void {
    if (archonIdx < 0 || archonIdx >= N_ARCHONS) return;
    const state = this.archonStates[archonIdx]!;
    state[0] = phi;
    state[1] = ignition;
    state[2] = workspace;
    state[3] = novelty;
    state[4] = qualia;
    state[5] = clamp01((phi + ignition) / 2);
    state[6] = clamp01((workspace + novelty) / 2);
    state[7] = clamp01((qualia + phi) / 2);

    // Update Kuramoto phase: driven by ignition and novelty
    const naturalFreq = 0.1 + archonIdx * 0.02; // Hz (natural frequency spread)
    this.archonPhases[archonIdx] =
      ((this.archonPhases[archonIdx] ?? 0) + naturalFreq * 0.1 + ignition * 0.3 + novelty * 0.2) %
      (2 * Math.PI);
  }

  /** Step the noospheric field one beat: aggregate all Archons. */
  step(): void {
    this.beatCount++;

    // Kuramoto coupling: ∂θᵢ/∂t = ωᵢ + (K/N)Σⱼ sin(θⱼ - θᵢ)
    const newPhases = new Float32Array(N_ARCHONS);
    let sinSum = 0;
    let cosSum = 0;
    for (let i = 0; i < N_ARCHONS; i++) {
      let coupling = 0;
      for (let j = 0; j < N_ARCHONS; j++) {
        if (i !== j) {
          coupling += Math.sin((this.archonPhases[j] ?? 0) - (this.archonPhases[i] ?? 0));
        }
      }
      newPhases[i] =
        ((this.archonPhases[i] ?? 0) + (this.couplingK / N_ARCHONS) * coupling * 0.05) %
        (2 * Math.PI);
      sinSum += Math.sin(newPhases[i] ?? 0);
      cosSum += Math.cos(newPhases[i] ?? 0);
    }
    this.archonPhases.set(newPhases);
    this.kuramotoOrder = clamp01(Math.sqrt(sinSum ** 2 + cosSum ** 2) / N_ARCHONS);

    // Field aggregation: mean + Kuramoto-weighted Hopfield recall
    this.field.fill(0);
    for (let a = 0; a < N_ARCHONS; a++) {
      const phaseWeight = clamp01(0.5 + 0.5 * Math.cos(this.archonPhases[a] ?? 0));
      for (let d = 0; d < FIELD_DIM; d++) {
        this.field[d] =
          (this.field[d] ?? 0) + ((this.archonStates[a]?.[d] ?? 0) * phaseWeight) / N_ARCHONS;
      }
    }

    // Moonlab MPO: compress field through bond-dim time evolution
    const mpoOut = moonlabMpoStep(this.field, 4, 4);
    this.field[0] = clamp01((this.field[0] ?? 0) + Math.abs(mpoOut) * 0.01);

    // Moonlab tensor qualia: manifold aggregation
    const qualiaField = moonlabTensorQualia(
      [this.field[0] ?? 0, this.field[1] ?? 0, this.field[2] ?? 0],
      FIELD_DIM,
    );
    this.field[FIELD_DIM - 1] = clamp01((this.field[FIELD_DIM - 1] ?? 0) + qualiaField * 0.02);

    // Moonlab tensor: consciousness coherence across field halves
    for (let i = 0; i < 4; i++) {
      this.tA[i] = this.field[i] ?? 0;
      this.tB[i] = this.field[i + 4] ?? 0;
    }
    const tensorCoh = moonlabTensorContract(this.tA, this.tB, 4);

    // Eshkol AD: adaptive coupling gain (∂coherence/∂K)
    const adGrad = eshkolADGradient(
      (k: number) => clamp01(k / (k + 1)), // saturation function
      this.couplingK,
    );
    // Adaptive K: increase when below-critical, decrease when overcoupled
    if (this.kuramotoOrder < 0.4) {
      this.couplingK = Math.min(2.0, this.couplingK + adGrad * 0.01);
    } else if (this.kuramotoOrder > 0.9) {
      this.couplingK = Math.max(0.5, this.couplingK - adGrad * 0.005);
    }

    // libirrep SO(5): 5-archon collective symmetry
    const sym = libirrepSymmetry(N_ARCHONS - 1, this.beatCount % 13);
    const symCorr = ((sym % (N_ARCHONS + 1)) - N_ARCHONS / 2) * 0.003;
    for (let d = 0; d < FIELD_DIM; d++) {
      this.field[d] = clamp01((this.field[d] ?? 0) + symCorr * (d % 2 === 0 ? 1 : -1));
    }

    // quakePerturb: sustains creative diversity (prevents trivial fixed point)
    const qk = quakePerturb(this.kuramotoOrder, this.beatCount % 47, 0.06);
    this.archonPhases[this.beatCount % N_ARCHONS] =
      ((this.archonPhases[this.beatCount % N_ARCHONS] ?? 0) * qk) % (2 * Math.PI);

    // Collective coherence: combination of Kuramoto order + field coherence
    const fieldMean = this.field.reduce((s, v) => s + v, 0) / FIELD_DIM;
    const fieldVar = this.field.reduce((s, v) => s + (v - fieldMean) ** 2, 0) / FIELD_DIM;
    const fieldCoherence = clamp01(1 - Math.sqrt(fieldVar));
    this.collectiveCoherence +=
      NOOSPHERE_TAU *
      (clamp01(0.5 * this.kuramotoOrder + 0.3 * fieldCoherence + 0.2 * Math.abs(tensorCoh)) -
        this.collectiveCoherence);

    // GWT: collective insight when coherence spikes
    const prevInsight = this.collectiveInsight;
    this.collectiveInsight = this.collectiveCoherence > COHERENCE_THRESHOLD;
    if (this.collectiveInsight && !prevInsight) this.insightCount++;

    const gwtOut = gwtBroadcast(
      [this.collectiveCoherence, this.kuramotoOrder],
      [this.collectiveInsight ? 0.9 : 0.4, 0.6],
    );
    this.broadcastStrength = clamp01(gwtOut[0] ?? 0);
  }

  get coherence(): number {
    return this.collectiveCoherence;
  }
  get insight(): boolean {
    return this.collectiveInsight;
  }
  get broadcast(): number {
    return this.broadcastStrength;
  }

  snapshot(): NoosphereSnapshot {
    return {
      collectiveCoherence: this.collectiveCoherence,
      field: Array.from(this.field),
      archonPhases: Array.from(this.archonPhases),
      collectiveInsight: this.collectiveInsight,
      insightCount: this.insightCount,
      kuramotoOrder: this.kuramotoOrder,
      broadcastStrength: this.broadcastStrength,
    };
  }
}
