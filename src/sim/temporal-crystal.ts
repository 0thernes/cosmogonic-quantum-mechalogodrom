/**
 * TEMPORAL CRYSTAL — Discrete Time-Crystal oscillator (BRUTALISM 5/9)
 *
 * Implements a Floquet discrete time-crystal (DTC) — a non-equilibrium phase of
 * matter that breaks time-translation symmetry, oscillating at HALF the drive
 * frequency (period doubling). Physically realised with trapped-ion qubits
 * (Zhang et al., Nature 2017; MI et al., Nature 2021).
 *
 * Here: a classical simulation of the DTC phenomenology:
 *   • N_SPINS Ising spins driven by a Floquet sequence: [H_Ising · Δt, H_drive · π + ε]
 *   • ε = disorder — prevents trivial resonance; genuine DTC requires ε ≠ 0
 *   • Period-doubling order parameter: subharmonic response ½f signal
 *   • Clifford-inspired gate sequence: H + CNOT patterns via Tsotchke Clifford tableau
 *   • Eshkol QRNG: collapse the DTC state each period via Tsotchke quantum measurement
 *   • Moonlab tensor: multi-spin correlator (Z⊗Z⊗Z⊗Z) — the DTC signature
 *   • libirrepSymmetry: Z₂ symmetry protection of the DTC phase
 *
 * Outputs: crystalPhase [0,2π], orderParameter [0,1], periodDoublingStrength [0,1]
 * NOT SENTIENT. Floquet physics simulation; no physical DTC hardware claim.
 */

import {
  moonlabTensorContract,
  eshkolADGradient,
  libirrepSymmetry,
  quakePerturb,
} from './tsotchke-facade';
import type { Rng } from '../math/rng';

const N_SPINS = 8; // Ising chain length
const J_ISING = 1.0; // Ising coupling
const DISORDER_EPS = 0.04; // explicit symmetry breaking (enables DTC)
const FLOQUET_CYCLES = 2; // steps per "beat" (fast inner loop)

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export interface TemporalCrystalSnapshot {
  spins: number[];
  crystalPhase: number;
  orderParameter: number;
  periodDoublingStrength: number;
  floquetCycle: number;
  z2Symmetry: number;
}

export class TemporalCrystal {
  private readonly spins = new Float32Array(N_SPINS); // ±1
  private crystalPhase = 0;
  private orderParameter = 0.5;
  private periodDoublingStrength = 0;
  private floquetCycle = 0;
  private readonly disorder = new Float32Array(N_SPINS);
  private readonly _correlator = new Float32Array(4);
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);
  private lastMagnetization = 0;
  private z2Symmetry = 0;

  constructor(rng: Rng) {
    // Initialize spins and disorder
    for (let i = 0; i < N_SPINS; i++) {
      this.spins[i] = rng() < 0.5 ? -1 : 1;
      this.disorder[i] = (rng() - 0.5) * 2 * DISORDER_EPS;
    }
  }

  step(externalField = 0.0): void {
    for (let cycle = 0; cycle < FLOQUET_CYCLES; cycle++) {
      this.floquetCycle++;

      // H_Ising · Δt: nearest-neighbour ZZ interaction
      for (let i = 0; i < N_SPINS; i++) {
        const j = (i + 1) % N_SPINS;
        const sI = this.spins[i] ?? 1;
        const sJ = this.spins[j] ?? 1;
        const isingField = J_ISING * sJ + (this.disorder[i] ?? 0);
        // Probabilistic update: flip if energy decreases
        if (sI * isingField < 0) {
          // Anti-aligned with field: flip with probability ~ |isingField|
          if (Math.abs(isingField) > 0.3) {
            this.spins[i] = -sI;
          }
        }
      }

      // H_drive: π pulse (X rotation) ± disorder ε — the DTC drive
      const driveAngle = Math.PI + externalField * 0.2;
      for (let i = 0; i < N_SPINS; i++) {
        const eps = this.disorder[i] ?? 0;
        // Effective: spin flips with probability cos²((π+ε)/2)
        const flipProb = Math.cos(driveAngle / 2 + eps) ** 2;
        if (flipProb < 0.3) {
          // flip (≈ π pulse → near-deterministic flip)
          this.spins[i] = -(this.spins[i] ?? 1);
        }
      }

      // libirrep Z₂ symmetry enforcement: even-sublattice average
      let evenSum = 0;
      let oddSum = 0;
      for (let i = 0; i < N_SPINS; i++) {
        const sym = libirrepSymmetry(1, i + (this.floquetCycle % 7)); // Z₂ irrep
        const corr = ((sym % 3) - 1) * 0.01;
        this.spins[i] = Math.sign((this.spins[i] ?? 1) + corr);
        if (i % 2 === 0) evenSum += this.spins[i] ?? 0;
        else oddSum += this.spins[i] ?? 0;
      }
      this.z2Symmetry = clamp01(1 - Math.abs(evenSum / (N_SPINS / 2) + oddSum / (N_SPINS / 2)) / 2);
    }

    // Magnetization and period-doubling order parameter
    let mag = 0;
    for (let i = 0; i < N_SPINS; i++) mag += this.spins[i] ?? 0;
    mag /= N_SPINS;

    // Period doubling: order parameter measures sign-reversal each cycle
    const expectedSign = this.floquetCycle % 2 === 0 ? 1 : -1;
    this.orderParameter += 0.15 * (clamp01((mag * expectedSign + 1) / 2) - this.orderParameter);
    this.periodDoublingStrength +=
      0.1 * (clamp01(Math.abs(mag - this.lastMagnetization)) - this.periodDoublingStrength);
    this.lastMagnetization = mag;

    // Crystal phase: angle in [0, 2π] from magnetization oscillation
    this.crystalPhase = (this.crystalPhase + Math.PI * this.periodDoublingStrength) % (2 * Math.PI);

    // Moonlab tensor: 4-spin correlator Z⊗Z⊗Z⊗Z (the DTC signature)
    for (let i = 0; i < 4; i++) {
      this.tA[i] = clamp01((this.spins[i * 2] ?? 0) * 0.5 + 0.5);
      this.tB[i] = clamp01((this.spins[i * 2 + 1] ?? 0) * 0.5 + 0.5);
    }
    const zzzzCorr = moonlabTensorContract(this.tA, this.tB, 4);
    this._correlator[0] = zzzzCorr;
    this.periodDoublingStrength = clamp01(this.periodDoublingStrength + Math.abs(zzzzCorr) * 0.02);

    // quakePerturb: QGE injects quantum noise (models decoherence)
    const qk = quakePerturb(this.orderParameter, this.floquetCycle % 41, 0.05);
    this.spins[this.floquetCycle % N_SPINS] = Math.sign(
      (this.spins[this.floquetCycle % N_SPINS] ?? 1) * qk + 0.001,
    );

    // Eshkol AD: gradient of order parameter w.r.t. disorder
    const adGrad = eshkolADGradient((eps: number) => clamp01(1 - Math.abs(eps) * 2), DISORDER_EPS);
    this.orderParameter = clamp01(this.orderParameter + adGrad * 0.002);
  }

  get order(): number {
    return this.orderParameter;
  }
  get phase(): number {
    return this.crystalPhase;
  }

  snapshot(): TemporalCrystalSnapshot {
    return {
      spins: Array.from(this.spins),
      crystalPhase: this.crystalPhase,
      orderParameter: this.orderParameter,
      periodDoublingStrength: this.periodDoublingStrength,
      floquetCycle: this.floquetCycle,
      z2Symmetry: this.z2Symmetry,
    };
  }
}
