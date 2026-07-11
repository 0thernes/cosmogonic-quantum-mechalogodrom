/**
 * QUANTUM RNG FULL (V3 MODEL) — deterministic state-vector sampler + CHSH model conformance.
 *
 * Uses the deterministic state-vector model adapted from quantum_rng v3.0.1 for output and an
 * independent two-qubit statevector (`math/quantum.ts`) for a CHSH reference calculation.
 *
 * The test prepares the maximally-entangled Bell state |Φ⁺⟩ = (|00⟩+|11⟩)/√2
 * (H on q0, then CX), rotates each qubit's measurement axis into the X–Z plane by
 * Ry(−θ), and reads the spin–spin correlation E(θₐ,θ_b) = Σᵢ (−1)^{aᵢ}(−1)^{bᵢ}|ψᵢ|²
 * straight from the Born-rule probabilities. With the canonical CHSH angles
 * (a=0, a′=π/2, b=π/4, b′=−π/4) the combination
 *   S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′)
 * reaches the quantum prediction 2√2 ≈ 2.828 for the modelled entangled state. This is a classical
 * simulator conformance result: classical software can calculate it, and it is not a physical Bell
 * experiment, proof of nonlocality, entropy-source validation, or security evidence.
 *
 * DETERMINISM (Manhattan): the Bell test is pure unitary linear algebra — NO
 * `Rng`, NO `Date.now`, exact every run. `entropy()` samples the deterministic state-vector output for
 * a Shannon-entropy diagnostic. The generator is not a CSPRNG or physical quantum entropy source.
 */

import type { Rng } from './rng';
import { QuantumRegister } from './quantum';
import { EshkolQrng, type EshkolQrngSnapshot } from './eshkol-qrng';

/** Bell test result */
export interface BellTestResult {
  S: number; /* CHSH S parameter */
  violation: boolean; /* true if the simulated CHSH value is above the local-hidden-variable bound */
  correlations: number[]; /* the four spin-spin correlations [E(a,b),E(a,b'),E(a',b),E(a',b')] */
  modelConformance: true;
  physicalExperiment: false;
}

/** Entropy estimate (Shannon entropy of recent output) */
export interface EntropyEstimate {
  entropy: number; /* Shannon entropy in bits */
  uniformity: number; /* uniformity score [0,1] */
}

/**
 * Spin–spin correlation E(θₐ,θ_b) of the Bell state |Φ⁺⟩ measured with each
 * qubit's axis rotated by Ry(−θ) into the X–Z plane. Pure, deterministic.
 */
export function bellCorrelation(angleA: number, angleB: number): number {
  const reg = new QuantumRegister(2);
  reg.apply('h', 0);
  reg.apply('cx', 1, 0); // |Φ+> = (|00> + |11>)/√2
  reg.apply('ry', 0, undefined, -angleA); // rotate q0 measurement axis
  reg.apply('ry', 1, undefined, -angleB); // rotate q1 measurement axis
  const p = reg.probabilities();
  let e = 0;
  for (let i = 0; i < p.length; i++) {
    const a = i & 1 ? -1 : 1;
    const b = i & 2 ? -1 : 1;
    e += a * b * (p[i] ?? 0);
  }
  return e;
}

/**
 * Deterministic classical state-vector model with CHSH reference diagnostics.
 */
export class QuantumRngFull extends EshkolQrng {
  constructor(seed: Rng) {
    super(seed);
  }

  /**
   * CHSH model-conformance calculation on an entangled two-qubit statevector. Returns S ≈ 2√2,
   * the threshold flag, and four correlations. It is explicitly not a physical experiment.
   */
  bellTest(): BellTestResult {
    const a = 0;
    const ap = Math.PI / 2;
    const b = Math.PI / 4;
    const bp = -Math.PI / 4;
    const Eab = bellCorrelation(a, b);
    const Eabp = bellCorrelation(a, bp);
    const Eapb = bellCorrelation(ap, b);
    const Eapbp = bellCorrelation(ap, bp);
    const S = Math.abs(Eab + Eabp + Eapb - Eapbp);
    return {
      S,
      violation: S > 2.0,
      correlations: [Eab, Eabp, Eapb, Eapbp],
      modelConformance: true,
      physicalExperiment: false,
    };
  }

  /**
   * Estimate Shannon entropy of recent output.
   * H = -Σ p(x) log₂ p(x)
   *
   * @returns entropy estimate with uniformity score
   */
  entropy(): EntropyEstimate {
    // Collect recent samples
    const samples = Array.from({ length: 64 }, () => 0);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = this.next01();
    }

    // Bin samples into histogram
    const bins = 16;
    const histogram = Array.from({ length: bins }, () => 0);
    for (const s of samples) {
      const bin = Math.min(bins - 1, Math.floor(s * bins));
      histogram[bin] = (histogram[bin] ?? 0) + 1;
    }

    // Compute Shannon entropy
    let entropy = 0;
    for (const count of histogram) {
      if (count > 0) {
        const p = count / samples.length;
        entropy -= p * Math.log2(p);
      }
    }

    // Uniformity: how close to uniform distribution
    const uniformity = entropy / Math.log2(bins);

    return { entropy, uniformity };
  }

  /**
   * Extended snapshot including Bell test and entropy.
   */
  snapshotFull(): EshkolQrngSnapshot & {
    bell: BellTestResult;
    entropy: EntropyEstimate;
  } {
    // entropy() advances 64 draws. Capture the base afterward so the receipt describes the live state
    // at method return rather than a stream position 64 draws behind it.
    const ent = this.entropy();
    const bell = this.bellTest();
    const base = this.snapshot();
    return { ...base, bell, entropy: ent };
  }
}

/**
 * Standalone Bell test function using any RNG.
 *
 * @param rng Seeded RNG for deterministic results
 * @returns Bell test result
 */
export function bellTestWithRng(rng: Rng): BellTestResult {
  const qrng = new QuantumRngFull(rng);
  return qrng.bellTest();
}

/**
 * Standalone entropy estimation using any RNG.
 *
 * @param rng Seeded RNG for deterministic results
 * @returns entropy estimate
 */
export function entropyWithRng(rng: Rng): EntropyEstimate {
  const qrng = new QuantumRngFull(rng);
  return qrng.entropy();
}
