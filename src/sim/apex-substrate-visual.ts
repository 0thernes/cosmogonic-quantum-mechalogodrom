/**
 * APEX Substrate Visual Bridge — maps the 1-billion-parameter substrate telemetry onto shader uniforms.
 *
 * The apex BODY (the tesseract/lava capstone shader in `alphabet-pantheon-render.ts`) should render the
 * SUBSTRATE, not decoration: the reference images demand a dark-maroon spiky glassy rim-lit burr whose
 * intensity tracks how much of the billion is reachable, whose cobweb nuclei glow with the quantum
 * dimension, and whose fins vent with the thermodynamic gradient. This module is the pure, testable
 * seam: it takes the manifold + quantum reach and returns a `0..1` uniforms record the render layer
 * feeds to the GPU. No THREE, no DOM — the render code owns the material; this owns the mapping.
 *
 * Every uniform is load-bearing (an ablation of the substrate changes the look), honest (log-scaled so
 * the billion reads as "near full" without lying that it is literally resident), and bounded to `[0,1]`.
 *
 * @see docs/ARCHITECTURE-2026-06-26.md  (§ The look → substrate mapping)
 */

import { APEX_BILLION, type ManifoldSnapshot } from './apex-parameter-manifold';
import type { QuantumReach } from './apex-quantum-substrate';

/** Shader-ready uniforms driven by the substrate. All values are finite and in `[0, 1]`. */
export interface ApexSubstrateUniforms {
  /** How much of the billion is addressable this run (log-scaled) → tesseract cage depth + facet count. */
  readonly uBillionReach: number;
  /** Quantum stabilizer dimension vs a billion (log-scaled) → the twin cobweb-nuclei glow. */
  readonly uQuantumDim: number;
  /** Fraction of the design that is resident → surface density / crystalline relief. */
  readonly uResidentLoad: number;
  /** Dense-core Born entropy (normalised) → iridescent shimmer / superposition flicker. */
  readonly uCoherence: number;
  /** Stabilizer entanglement (0..1) → filament tether brightness between the nuclei. */
  readonly uEntanglement: number;
  /** Tsotchke corpus QGT volume → oil-slick thin-film phase drift. */
  readonly uQgt: number;
  /** Thermodynamic / AD gradient → heat-venting fin emission (the maroon → ember rim). */
  readonly uThermal: number;
  /** How evenly the billion spreads across the five tiers (0..1) → multi-substrate marbling. */
  readonly uTierSpread: number;
}

function clamp01(v: number): number {
  return !Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Log-scaled reach of `n` toward one billion → `[0, 1]` (1e6 ≈ 0.66, 1e9 ≈ 1). O(1). */
function billionScale(n: number): number {
  if (n <= 1) return 0;
  return clamp01(Math.log10(n) / Math.log10(APEX_BILLION));
}

/** Shannon-evenness of the tier resident distribution (0 = one tier, 1 = perfectly even). O(k). */
function tierSpread(m: ManifoldSnapshot): number {
  const vals = m.tiers.map((t) => t.designed).filter((v) => v > 0);
  const total = vals.reduce((a, v) => a + v, 0);
  if (total <= 0 || vals.length <= 1) return 0;
  let h = 0;
  for (const v of vals) {
    const p = v / total;
    h -= p * Math.log(p);
  }
  return clamp01(h / Math.log(vals.length));
}

/**
 * Build the substrate-driven uniforms for the apex body shader. Pure, O(k) in the tier count. The
 * render layer merges the result into the capstone `ShaderMaterial` uniforms.
 */
export function substrateUniforms(m: ManifoldSnapshot, q: QuantumReach): ApexSubstrateUniforms {
  return {
    uBillionReach: billionScale(m.addressableParams),
    uQuantumDim: billionScale(q.stabilizerDim),
    uResidentLoad: clamp01(m.residentFraction),
    uCoherence: clamp01(q.denseQubits > 0 ? q.bornEntropy / q.denseQubits : 0),
    uEntanglement: clamp01(q.stabilizerEntanglementNorm),
    uQgt: clamp01(q.qgtVolume),
    uThermal: clamp01(q.adGradient),
    uTierSpread: tierSpread(m),
  };
}
