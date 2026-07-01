/**
 * APEX Substrate Driver — fuses the 1-billion-parameter substrate into behavioural modulation.
 *
 * The doctrine's ablation law: "if a substrate can be removed with no downstream effect, it was
 * decoration, not biology." This module makes the manifold + Quantum Brain + field sensorium
 * *load-bearing* — it reads all three every beat and emits an {@link ApexModulation} (motor gain,
 * exploration, thermal stress, transcendence push, plan bias) that the apex creature consumes. Every
 * tier feeds a distinct behavioural channel, and {@link AblationFlags} let a harness zero any tier and
 * prove the output changes (`tests/apex-substrate-ablation.test.ts`).
 *
 * Deterministic (seeded), DOM-free, allocation-light. NOT a sentience claim — a wiring claim: the
 * billion is coupled to behaviour, not merely counted.
 *
 * @see src/sim/apex-parameter-manifold.ts · src/sim/apex-quantum-substrate.ts · src/sim/apex-field-organs.ts
 * @see docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md
 */

import type { ApexScale } from './apex-brain';
import {
  APEX_BILLION,
  DEVICE_BROWSER,
  buildManifold,
  stabilizerQubitsForScale,
  type DeviceProfile,
  type ManifoldSnapshot,
} from './apex-parameter-manifold';
import { ApexQuantumSubstrate, type QuantumReach } from './apex-quantum-substrate';
import { ApexFieldOrgans, type FieldSensorium } from './apex-field-organs';

/** Which substrate tiers to zero out (for the ablation harness). Omitted flags stay active. */
export interface AblationFlags {
  readonly procedural?: boolean;
  readonly quantum?: boolean;
  readonly field?: boolean;
  readonly resident?: boolean;
}

/** The behavioural modulation the apex consumes — every value finite and in `[0, 1]` (plan bias sums to 1). */
export interface ApexModulation {
  /** How strongly the apex acts (structural confidence from reach + resident load + field richness). */
  readonly motorGain: number;
  /** Empowerment / novelty drive (quantum coherence + field interference). */
  readonly exploration: number;
  /** Self-consumption pressure (field heat load + quantum magic). */
  readonly thermalStress: number;
  /** Pull toward Simulation 3 (billion reach + quantum + acoustic interference). */
  readonly transcendencePush: number;
  /** Plan-selection bias (quantum Born distribution blended with uniform). */
  readonly planBias: readonly number[];
  /** True when the substrate reaches a billion (manifold or quantum). */
  readonly billionReached: boolean;
}

const c01 = (v: number): number => (!Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v);

/** Log-scaled reach of `n` toward one billion → `[0, 1]`. O(1). */
function billionScale(n: number): number {
  if (n <= 1) return 0;
  return c01(Math.log10(n) / Math.log10(APEX_BILLION));
}

/**
 * The driver: owns the live Quantum Brain + field organs for one apex identity, steps them each beat,
 * and fuses their state (with the static manifold) into a behavioural modulation.
 */
export class ApexSubstrateDriver {
  readonly scale: ApexScale;
  readonly seed: number;
  readonly device: DeviceProfile;
  readonly manifold: ManifoldSnapshot;

  private readonly quantum: ApexQuantumSubstrate;
  private readonly fields: ApexFieldOrgans;
  private readonly proceduralAddressable: number;

  constructor(scale: ApexScale, seed: number, device: DeviceProfile = DEVICE_BROWSER) {
    this.scale = scale;
    this.seed = seed >>> 0 || 1;
    this.device = device;
    this.manifold = buildManifold(scale, device);
    this.proceduralAddressable =
      this.manifold.tiers.find((t) => t.tier === 'procedural')?.addressable ?? 0;
    this.quantum = new ApexQuantumSubstrate(this.seed, {
      denseQubits: Math.min(8, scale.qubits),
      stabilizerQubits: stabilizerQubitsForScale(scale, device),
    });
    this.fields = new ApexFieldOrgans(this.seed);
  }

  /** Advance the live substrate one beat with the creature's `drive` (0..1). O(bounded). */
  step(drive: number): void {
    this.quantum.step(drive);
    this.fields.step(drive);
  }

  /** Current quantum + field telemetry alongside the static manifold. O(bounded). */
  telemetry(): { manifold: ManifoldSnapshot; quantum: QuantumReach; sensorium: FieldSensorium } {
    return {
      manifold: this.manifold,
      quantum: this.quantum.reach(),
      sensorium: this.fields.sense(),
    };
  }

  /**
   * Fuse the substrate into a behavioural modulation. Each tier feeds a distinct channel; an
   * {@link AblationFlags} entry zeroes that tier's contribution so a harness can prove it is
   * load-bearing. O(nPlans + bounded).
   */
  modulate(nPlans = 6, ablate: AblationFlags = {}): ApexModulation {
    const n = Math.max(1, Math.floor(nPlans));
    const m = this.manifold;
    const q = this.quantum.reach();
    const s = this.fields.sense();

    const base = billionScale(m.addressableParams); // always present (the whole substrate)
    const proc = ablate.procedural ? 0 : billionScale(this.proceduralAddressable);
    const res = ablate.resident ? 0 : c01(m.residentParams / Math.max(1, m.deviceBudgetParams));
    const qd = ablate.quantum
      ? 0
      : c01(
          0.5 * (q.denseQubits > 0 ? q.bornEntropy / q.denseQubits : 0) +
            0.5 * q.stabilizerEntanglementNorm,
        );
    const fieldRich = ablate.field ? 0 : s.richness;
    const thermal = ablate.field ? 0 : s.heatLoad;
    const magic = ablate.quantum ? 0 : q.qgtVolume;
    const interference = ablate.field ? 0 : s.acousticInterference;

    // Plan bias: the Quantum Brain's Born distribution, blended with uniform (or uniform if ablated).
    const uniform = 1 / n;
    const planBias = Array.from({ length: n }, () => 0);
    if (ablate.quantum) {
      planBias.fill(uniform);
    } else {
      const qb = this.quantum.planBias(n);
      let sum = 0;
      for (let i = 0; i < n; i++) planBias[i] = 0.7 * (qb[i] ?? 0) + 0.3 * uniform;
      for (let i = 0; i < n; i++) sum += planBias[i] ?? 0;
      if (sum > 0) for (let i = 0; i < n; i++) planBias[i] = (planBias[i] ?? 0) / sum;
    }

    return {
      motorGain: c01(0.35 * base + 0.25 * fieldRich + 0.2 * qd + 0.15 * proc + 0.05 * res),
      exploration: c01(0.55 * qd + 0.35 * fieldRich + 0.1 * proc),
      thermalStress: c01(0.7 * thermal + 0.3 * magic),
      transcendencePush: c01(0.5 * base + 0.3 * qd + 0.2 * interference),
      planBias,
      billionReached: m.reachesBillion || q.reachesBillion,
    };
  }
}
