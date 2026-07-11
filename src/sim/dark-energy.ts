/**
 * DARK ENERGY — Cosmological constant drift engine (BRUTALISM 6/9)
 *
 * Models dark energy / cosmological constant Λ as a slow drift variable
 * that governs world expansion rate, affecting entity density, resource
 * availability, and the emergence/collapse threshold of complexity.
 *
 * Physics grounding:
 *   • Λ ≈ 1.1056×10⁻⁵² m⁻² (Planck 2018) — here normalized to [0,1]
 *   • Quintessence model: Λ(t) driven by a slow-roll scalar field φ
 *   • V(φ) = λ_q φ⁴ (quartic potential) — simple tracker quintessence
 *   • Equation of state w(t) = p/ρ ∈ [-1, -1/3] — dark energy signature
 *   • Moonlab tensor: stress-energy tensor contraction T^μν
 *   • Eshkol AD: ∂w/∂φ for rolling field gradient
 *   • quakePerturb: vacuum fluctuations (Planck-scale quantum jitter)
 *   • libirrepSymmetry: Lorentz SO(3,1) → SO(3) spatial sector
 *
 * Sim mapping:
 *   Λ_high → rapid expansion → resource dilution, isolation, entropy
 *   Λ_low  → contraction / Big Crunch tendency → crowding, heat death
 *   w≈−1   → cosmological constant (steady)
 *   w>−1   → dynamic quintessence (evolving)
 *
 * NOT SENTIENT. Cosmological scalar field model; no physical claim beyond sim.
 */

import {
  moonlabTensorContract,
  eshkolADGradient,
  libirrepSymmetry,
  quakePerturb,
  moonlabMpoStep,
} from './tsotchke-facade';

const LAMBDA_0 = 0.5; // normalized initial cosmological constant
const PHI_0 = 0.1; // quintessence field initial value
const LAMBDA_Q = 0.3; // quartic coupling
const SLOW_ROLL_ETA = 0.003; // field rolling rate
const EOS_TARGET = -0.95; // equation-of-state target (near Λ)

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export interface DarkEnergySnapshot {
  lambda: number; // cosmological constant [0,1]
  phi: number; // quintessence field
  w: number; // equation of state
  expansionRate: number; // dR/dt proxy [0,1]
  vacuumEnergy: number; // V(φ)
  hubble: number; // Hubble parameter proxy
}

export class DarkEnergy {
  private lambda = LAMBDA_0;
  private phi = PHI_0;
  private phiDot = 0.0; // field velocity
  private w = EOS_TARGET;
  private expansionRate = LAMBDA_0;
  private hubble = 0.5;
  private beatCount = 0;
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);
  private readonly mpoField = new Float32Array(4);

  /** Step the dark-energy field one sim beat. */
  step(energyDensity: number, matterDensity: number): void {
    this.beatCount++;

    // Quintessence slow-roll: φ̈ + 3H φ̇ + V′(φ) = 0
    // V(φ) = λ_q φ⁴ → V′(φ) = 4λ_q φ³
    const vPrime = 4 * LAMBDA_Q * this.phi ** 3;
    const hubbleNow = this.hubble;
    this.phiDot += (-3 * hubbleNow * this.phiDot - vPrime) * SLOW_ROLL_ETA;
    this.phi = clamp(this.phi + this.phiDot * SLOW_ROLL_ETA, -2, 2);

    // V(φ) = λ_q φ⁴
    const vacuumEnergy = LAMBDA_Q * this.phi ** 4;

    // Eshkol AD: ∂w/∂φ (equation of state gradient). The ratio is ADDED (not subtracted): quintessence
    // w rises from the −1 cosmological-constant floor toward the −1/3 acceleration boundary as the
    // potential term grows. Subtracting it drove the model ≤ −1 for all φ, so the clamp pinned it to a
    // constant −1 and the central-difference gradient was identically 0 — `this.w += adGrad*0.005`
    // below then contributed nothing. With `-1 + ratio` the model is φ-dependent inside the band
    // (φ₀=0.1 → ratio≈6e-5, unsaturated), so the AD nudge is finally live.
    const adGrad = eshkolADGradient(
      (phi: number) => clamp(-1 + (LAMBDA_Q * phi ** 4) / (0.5 + LAMBDA_Q * phi ** 4), -1, -1 / 3),
      this.phi,
    );

    // Equation of state: w = (K - V) / (K + V)
    const K = 0.5 * this.phiDot ** 2;
    const V = Math.max(0, vacuumEnergy);
    this.w = K + V > 1e-9 ? clamp((K - V) / (K + V), -1, -1 / 3) : -1;
    // Re-clamp after the AD nudge so w keeps its documented physical range. Before the sign fix above
    // adGrad was identically 0, so this addition was a silent no-op and w never left [-1,-1/3]; now that
    // the nudge is live it must be bounded here rather than relying on it staying incidentally small.
    this.w = clamp(this.w + adGrad * 0.005, -1, -1 / 3);

    // Friedmann equation: H² = (8πG/3)(ρ_m + ρ_Λ)
    // ρ_Λ = Λ / (8πG) → normalized
    const rhoTotal = clamp01(matterDensity * 0.4 + vacuumEnergy * 0.6);
    this.hubble = clamp01(Math.sqrt(Math.max(0, rhoTotal)) * 0.9 + 0.1);

    // Λ drift: cosmological constant modulated by quintessence
    this.lambda = clamp01(LAMBDA_0 + vacuumEnergy * 0.3 + energyDensity * 0.1);

    // Moonlab tensor: stress-energy T^μν contraction (4-component)
    this.tA[0] = clamp01(this.lambda);
    this.tA[1] = clamp01(this.hubble);
    this.tA[2] = clamp01(matterDensity);
    this.tA[3] = clamp01(energyDensity);
    this.tB[0] = clamp01(-this.w);
    this.tB[1] = clamp01(1 + this.w); // pressure-to-density ratio
    this.tB[2] = clamp01(K);
    this.tB[3] = clamp01(V);
    const tensorTrace = moonlabTensorContract(this.tA, this.tB, 4);
    this.expansionRate = clamp01(this.lambda + Math.abs(tensorTrace) * 0.05);

    // libirrep SO(3) spatial sector: Lorentz sym → SO(3)
    const sym = libirrepSymmetry(1, this.beatCount % 11);
    this.expansionRate = clamp01(this.expansionRate + ((sym % 3) - 1) * 0.002);

    // MPO: compress Λ field across bond-dim (time-series compression)
    this.mpoField[0] = this.lambda;
    this.mpoField[1] = this.phi;
    this.mpoField[2] = this.w + 1;
    this.mpoField[3] = this.hubble;
    const mpoOut = moonlabMpoStep(this.mpoField, 2, 4);
    this.lambda = clamp01(this.lambda + Math.abs(mpoOut) * 0.001);

    // quakePerturb: vacuum quantum fluctuations
    const qk = quakePerturb(this.lambda, this.beatCount % 53, 0.04);
    this.phi *= qk;
  }

  get expansion(): number {
    return this.expansionRate;
  }
  get cosmologicalConstant(): number {
    return this.lambda;
  }
  get equationOfState(): number {
    return this.w;
  }

  snapshot(): DarkEnergySnapshot {
    return {
      lambda: this.lambda,
      phi: this.phi,
      w: this.w,
      expansionRate: this.expansionRate,
      vacuumEnergy: LAMBDA_Q * this.phi ** 4,
      hubble: this.hubble,
    };
  }
}
