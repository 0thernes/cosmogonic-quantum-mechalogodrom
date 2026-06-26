/**
 * Neural Quantum State (NQS) / Variational Monte Carlo (VMC) online learning substrate.
 *
 * This implements RPT-1/2 (learned recurrence) by providing a neural network that learns
 * to represent quantum states and optimizes them via VMC. Unlike architected recurrence,
 * this substrate learns online from experience, enabling adaptive temporal patterns.
 *
 * Based on:
 * - Carleo & Troyer 2017 (Solving the quantum many-body problem with artificial neural networks)
 * - Saito 2017 (Neural-network quantum states)
 * - Han et al. 2018 (Deep neural network architectures for quantum many-body problems)
 *
 * NOT sentient — a functional machine learning substrate, not phenomenal learning.
 *
 * Implements the Tsotchke spin NQS/VMC substrate (from spin_based + Moonlab) and the
 * RPT (recurrent-processing) advance. This file is fully type-checked (no suppressions).
 */

import type { Complex } from '../math/quantum'; // added export for Tsotchke spin NQS/VMC (advanced from spin_based + Moonlab)

/** Simple RBM-style NQS architecture for representing quantum amplitudes. */
export interface NQSArchitecture {
  /** Number of visible units (qubits). */
  visibleCount: number;
  /** Number of hidden units. */
  hiddenCount: number;
  /** Visible-to-hidden weights (visibleCount × hiddenCount). */
  weights: Float32Array;
  /** Visible biases (visibleCount). */
  visibleBiases: Float32Array;
  /** Hidden biases (hiddenCount). */
  hiddenBiases: Float32Array;
}

/** VMC sampling configuration. */
export interface VMCConfig {
  /** Number of Monte Carlo samples per step. */
  sampleCount: number;
  /** Number of Metropolis-Hastings steps per sample. */
  thermalizationSteps: number;
  /** Learning rate for gradient descent. */
  learningRate: number;
  /** Regularization strength. */
  regularization: number;
}

/** VMC training state. */
export interface VMCState {
  /** Current samples (bitstrings as integers). */
  samples: Uint32Array;
  /** Sample amplitudes (complex). */
  amplitudes: Complex[];
  /** Energy estimates per sample. */
  energies: Float32Array;
  /** Gradient accumulators. */
  weightGradients: Float32Array;
  visibleGradients: Float32Array;
  hiddenGradients: Float32Array;
}

/** Read-only telemetry for NQS/VMC learning. */
export interface NQSTelemetry {
  /** Current energy estimate. */
  energy: number;
  /** Energy variance (convergence metric). */
  energyVariance: number;
  /** Acceptance rate in Metropolis-Hastings. */
  acceptanceRate: number;
  /** Gradient norm (optimization progress). */
  gradientNorm: number;
  /** Parameter count. */
  parameterCount: number;
}

/**
 * Initialize an NQS architecture with random weights (He initialization).
 */
export function initNQS(visibleCount: number, hiddenCount: number, seed: number): NQSArchitecture {
  const rng = seededRng(seed);
  const weights = new Float32Array(visibleCount * hiddenCount);
  const visibleBiases = new Float32Array(visibleCount);
  const hiddenBiases = new Float32Array(hiddenCount);

  const scale = Math.sqrt(2 / (visibleCount + hiddenCount));
  for (let i = 0; i < weights.length; i++) {
    weights[i] = (rng() * 2 - 1) * scale;
  }
  for (let i = 0; i < visibleCount; i++) {
    visibleBiases[i] = (rng() * 2 - 1) * scale * 0.1;
  }
  for (let i = 0; i < hiddenCount; i++) {
    hiddenBiases[i] = (rng() * 2 - 1) * scale * 0.1;
  }

  return { visibleCount, hiddenCount, weights, visibleBiases, hiddenBiases };
}

/**
 * Initialize VMC training state.
 */
export function initVMC(arch: NQSArchitecture, config: VMCConfig, seed = 0x51f15e): VMCState {
  const samples = new Uint32Array(config.sampleCount);
  const amplitudes: Complex[] = [];
  const energies = new Float32Array(config.sampleCount);
  const weightGradients = new Float32Array(arch.weights.length);
  const visibleGradients = new Float32Array(arch.visibleCount);
  const hiddenGradients = new Float32Array(arch.hiddenCount);

  // Initialize samples to random bitstrings. seededRng() yields a float in [0,1); applying `>>>`
  // to it directly truncates to 0 (ToUint32 of a value < 1), which made every sample the all-zero
  // bitstring. Scale to a full uint32 first, then keep the top `visibleCount` bits.
  const rng = seededRng(seed);
  for (let i = 0; i < config.sampleCount; i++) {
    samples[i] = (rng() * 0x1_0000_0000) >>> (32 - arch.visibleCount);
    amplitudes.push({ re: 0, im: 0 });
  }

  return {
    samples,
    amplitudes,
    energies,
    weightGradients,
    visibleGradients,
    hiddenGradients,
  };
}

/**
 * Compute the log-amplitude of a bitstring under the NQS (RBM ansatz).
 *
 * For an RBM: log ψ(s) = Σ_i a_i s_i + Σ_j log(2 cosh(b_j + Σ_i W_ij s_i))
 */
export function logAmplitude(arch: NQSArchitecture, bitstring: number): number {
  let logAmp = 0;

  // Visible bias contribution
  for (let i = 0; i < arch.visibleCount; i++) {
    const s = (bitstring >> i) & 1 ? 1 : -1;
    logAmp += (arch.visibleBiases[i] ?? 0) * s;
  }

  // Hidden contribution
  for (let j = 0; j < arch.hiddenCount; j++) {
    let activation = arch.hiddenBiases[j] ?? 0;
    for (let i = 0; i < arch.visibleCount; i++) {
      const s = (bitstring >> i) & 1 ? 1 : -1;
      activation += (arch.weights[i * arch.hiddenCount + j] ?? 0) * s;
    }
    logAmp += Math.log(2 * Math.cosh(activation));
  }

  return logAmp;
}

/**
 * Compute the amplitude (complex) of a bitstring.
 */
export function amplitude(arch: NQSArchitecture, bitstring: number): Complex {
  const logAmp = logAmplitude(arch, bitstring);
  const phase = 0; // Real-valued RBM for simplicity
  return {
    re: Math.exp(logAmp) * Math.cos(phase),
    im: Math.exp(logAmp) * Math.sin(phase),
  };
}

/**
 * Metropolis-Hastings proposal: flip a random qubit.
 */
export function proposeFlip(bitstring: number, visibleCount: number, rng: () => number): number {
  const flipBit = Math.floor(rng() * visibleCount);
  return bitstring ^ (1 << flipBit);
}

/**
 * Metropolis-Hastings acceptance probability.
 */
export function acceptanceProbability(
  arch: NQSArchitecture,
  current: number,
  proposed: number,
  beta = 1,
): number {
  const logPsiCurrent = logAmplitude(arch, current);
  const logPsiProposed = logAmplitude(arch, proposed);
  const logRatio = 2 * (logPsiProposed - logPsiCurrent);
  return Math.min(1, Math.exp(beta * logRatio));
}

/**
 * Perform Metropolis-Hastings sampling (thermalization).
 */
export function thermalize(
  arch: NQSArchitecture,
  state: VMCState,
  config: VMCConfig,
  seed: number,
): number {
  const rng = seededRng(seed);
  let accepted = 0;
  let total = 0;

  for (let s = 0; s < config.sampleCount; s++) {
    let current = state.samples[s] ?? 0;
    for (let step = 0; step < config.thermalizationSteps; step++) {
      const proposed = proposeFlip(current, arch.visibleCount, rng);
      const prob = acceptanceProbability(arch, current, proposed);
      total++;
      if (rng() < prob) {
        current = proposed;
        accepted++;
      }
    }
    state.samples[s] = current;
    state.amplitudes[s] = amplitude(arch, current);
  }

  return total > 0 ? accepted / total : 0;
}

/**
 * Compute local energy for a sample: E_L(s) = ⟨s|H|ψ⟩ / ψ(s)
 *
 * For a transverse-field Ising model: H = -J Σ σ_i^z σ_{i+1}^z - h Σ σ_i^x
 */
export function localEnergy(
  arch: NQSArchitecture,
  bitstring: number,
  J: number = 1,
  h: number = 1,
): number {
  const psi = amplitude(arch, bitstring);
  const norm = psi.re * psi.re + psi.im * psi.im;
  if (norm < 1e-12) return 0;

  let energy = 0;

  // ZZ interactions
  for (let i = 0; i < arch.visibleCount - 1; i++) {
    const s_i = (bitstring >> i) & 1 ? 1 : -1;
    const s_ip1 = (bitstring >> (i + 1)) & 1 ? 1 : -1;
    energy -= J * s_i * s_ip1;
  }

  // X terms (off-diagonal)
  for (let i = 0; i < arch.visibleCount; i++) {
    const flipped = bitstring ^ (1 << i);
    const psiFlipped = amplitude(arch, flipped);
    const overlap = psi.re * psiFlipped.re + psi.im * psiFlipped.im;
    energy -= h * (overlap / norm);
  }

  return energy;
}

/**
 * Compute gradient of log ψ with respect to parameters.
 */
export function logPsiGradient(
  arch: NQSArchitecture,
  bitstring: number,
  outWeights: Float32Array,
  outVisible: Float32Array,
  outHidden: Float32Array,
): void {
  for (let i = 0; i < arch.visibleCount; i++) {
    const s = (bitstring >> i) & 1 ? 1 : -1;
    outVisible[i] = s;

    for (let j = 0; j < arch.hiddenCount; j++) {
      let activation = arch.hiddenBiases[j] ?? 0;
      for (let k = 0; k < arch.visibleCount; k++) {
        const s_k = (bitstring >> k) & 1 ? 1 : -1;
        activation += (arch.weights[k * arch.hiddenCount + j] ?? 0) * s_k;
      }
      const tanhAct = Math.tanh(activation);
      outWeights[i * arch.hiddenCount + j] = s * tanhAct;
    }
  }

  for (let j = 0; j < arch.hiddenCount; j++) {
    let activation = arch.hiddenBiases[j] ?? 0;
    for (let i = 0; i < arch.visibleCount; i++) {
      const s = (bitstring >> i) & 1 ? 1 : -1;
      activation += (arch.weights[i * arch.hiddenCount + j] ?? 0) * s;
    }
    outHidden[j] = Math.tanh(activation);
  }
}

/**
 * Perform one VMC training step (gradient descent on energy).
 */
export function vmcStep(
  arch: NQSArchitecture,
  state: VMCState,
  config: VMCConfig,
  seed: number,
): NQSTelemetry {
  // Thermalize samples
  const acceptanceRate = thermalize(arch, state, config, seed);

  // Compute local energies
  let totalEnergy = 0;
  let totalEnergySq = 0;
  for (let s = 0; s < config.sampleCount; s++) {
    const sample = state.samples[s] ?? 0;
    const E = localEnergy(arch, sample);
    state.energies[s] = E;
    totalEnergy += E;
    totalEnergySq += E * E;
  }

  const meanEnergy = totalEnergy / config.sampleCount;
  const energyVariance = totalEnergySq / config.sampleCount - meanEnergy * meanEnergy;

  // Reset gradients
  state.weightGradients.fill(0);
  state.visibleGradients.fill(0);
  state.hiddenGradients.fill(0);

  // Accumulate gradients (stochastic reconfiguration)
  const tempWeights = new Float32Array(arch.weights.length);
  const tempVisible = new Float32Array(arch.visibleCount);
  const tempHidden = new Float32Array(arch.hiddenCount);

  for (let s = 0; s < config.sampleCount; s++) {
    const sample = state.samples[s] ?? 0;
    logPsiGradient(arch, sample, tempWeights, tempVisible, tempHidden);

    const EL = (state.energies[s] ?? 0) - meanEnergy;
    for (let i = 0; i < arch.weights.length; i++) {
      state.weightGradients[i] = (state.weightGradients[i] ?? 0) + EL * (tempWeights[i] ?? 0);
    }
    for (let i = 0; i < arch.visibleCount; i++) {
      state.visibleGradients[i] = (state.visibleGradients[i] ?? 0) + EL * (tempVisible[i] ?? 0);
    }
    for (let i = 0; i < arch.hiddenCount; i++) {
      state.hiddenGradients[i] = (state.hiddenGradients[i] ?? 0) + EL * (tempHidden[i] ?? 0);
    }
  }

  // Average gradients
  const n = config.sampleCount;
  for (let i = 0; i < arch.weights.length; i++) {
    state.weightGradients[i] = (state.weightGradients[i] ?? 0) / n;
  }
  for (let i = 0; i < arch.visibleCount; i++) {
    state.visibleGradients[i] = (state.visibleGradients[i] ?? 0) / n;
  }
  for (let i = 0; i < arch.hiddenCount; i++) {
    state.hiddenGradients[i] = (state.hiddenGradients[i] ?? 0) / n;
  }

  // Compute gradient norm
  let gradNorm = 0;
  for (let i = 0; i < arch.weights.length; i++) {
    const g = state.weightGradients[i] ?? 0;
    gradNorm += g * g;
  }
  gradNorm = Math.sqrt(gradNorm);

  // Apply gradient descent with regularization
  const lr = config.learningRate;
  const reg = config.regularization;
  for (let i = 0; i < arch.weights.length; i++) {
    const w = arch.weights[i] ?? 0;
    arch.weights[i] = w - lr * ((state.weightGradients[i] ?? 0) + reg * w);
  }
  for (let i = 0; i < arch.visibleCount; i++) {
    const b = arch.visibleBiases[i] ?? 0;
    arch.visibleBiases[i] = b - lr * ((state.visibleGradients[i] ?? 0) + reg * b);
  }
  for (let i = 0; i < arch.hiddenCount; i++) {
    const b = arch.hiddenBiases[i] ?? 0;
    arch.hiddenBiases[i] = b - lr * ((state.hiddenGradients[i] ?? 0) + reg * b);
  }

  return {
    energy: meanEnergy,
    energyVariance,
    acceptanceRate,
    gradientNorm: gradNorm,
    parameterCount: arch.weights.length + arch.visibleCount + arch.hiddenCount,
  };
}

/**
 * Simple seeded RNG for deterministic training.
 */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Online learning controller for NQS/VMC.
 *
 * This provides a learned recurrence substrate that can be integrated into
 * the cognitive architecture for adaptive temporal patterns.
 */
export class NQSLearningController {
  private arch: NQSArchitecture;
  private state: VMCState;
  private config: VMCConfig;
  private stepCount = 0;
  private seed: number;

  constructor(visibleCount: number, hiddenCount: number, config: VMCConfig, seed: number) {
    this.arch = initNQS(visibleCount, hiddenCount, seed);
    this.state = initVMC(this.arch, config, seed ^ 0x9e3779b9);
    this.config = config;
    this.seed = seed;
  }

  /**
   * Perform one training step and return telemetry.
   */
  step(): NQSTelemetry {
    this.stepCount++;
    const stepSeed = this.seed + this.stepCount * 1000;
    return vmcStep(this.arch, this.state, this.config, stepSeed);
  }

  /**
   * Get the current learned representation of a bitstring.
   */
  getAmplitude(bitstring: number): Complex {
    return amplitude(this.arch, bitstring);
  }

  /**
   * Get the current architecture (for inspection/serialization).
   */
  getArchitecture(): Readonly<NQSArchitecture> {
    return this.arch;
  }

  /**
   * Get training progress.
   */
  getStepCount(): number {
    return this.stepCount;
  }
}
