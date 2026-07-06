/**
 * APEX Field Organs — the live multi-physics sensorium (the resident-field tier, made load-bearing).
 *
 * The manifold's `resident-field` tier declares four continuum organs; this steps them as a coupled,
 * excitable system and reads a **sensorium** off the resulting physics — real signals, not labels:
 * acoustic standing-wave energy + interference, thermodynamic load + gradient, Klein-fold coupling, and
 * tunnel-amplitude magnitude. The creature's drive excites the organs each beat and the interference it
 * produces is what the driver then senses (the embodiment loop: body IS the processor).
 *
 * Four distinct physics (wave, diffusion, folded diffusion, complex amplitude) → "multi-physics /
 * multi-sensor" is a fact here, not a slogan. Deterministic (seeded), DOM-free, allocation-light (the
 * grids own their buffers; `sense` reuses a module scratch object).
 *
 * @see src/sim/apex-field-substrate.ts  (the grids + stencils + GLSL)
 * @see docs/ARCHITECTURE-2026-06-26.md
 */

import { APEX_FIELDS, ApexFieldGrid } from './apex-field-substrate';

/** The multi-physics read-out of the field organs — every value finite, magnitudes bounded ≥ 0. */
export interface FieldSensorium {
  /** Acoustic standing-wave energy (Σ u², normalised 0..1). */
  readonly acousticEnergy: number;
  /** Acoustic spatial variance — the interference/structure strength (0..1). */
  readonly acousticInterference: number;
  /** Thermodynamic load — |Σ heat| normalised (0..1) → self-consumption pressure. */
  readonly heatLoad: number;
  /** Klein-cortex fold coupling — variance of the folded diffusion field (0..1). */
  readonly kleinFold: number;
  /** Quantum-tunnel amplitude magnitude — RMS of the amplitude field (0..1). */
  readonly tunnelAmplitude: number;
  /** Composite sensory richness across all four physics (0..1). */
  readonly richness: number;
}

const c01 = (v: number): number => (!Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v);
const squash = (v: number): number => c01(Math.tanh(Math.abs(v)));

/**
 * The four field organs stepped together. Construct once; {@link step} each beat with the creature's
 * drive; read {@link sense}. Deterministic given the seed.
 */
export class ApexFieldOrgans {
  private readonly acoustic: ApexFieldGrid;
  private readonly heat: ApexFieldGrid;
  private readonly klein: ApexFieldGrid;
  private readonly tunnel: ApexFieldGrid;

  constructor(seed: number) {
    const byName = (name: string) => APEX_FIELDS.find((f) => f.name === name) ?? APEX_FIELDS[0]!;
    // Distinct salted seeds so the four organs are genuinely independent physics.
    this.acoustic = new ApexFieldGrid(byName('acoustic'), (seed ^ 0xac00) >>> 0 || 1);
    this.heat = new ApexFieldGrid(byName('heat'), (seed ^ 0x4ea7) >>> 0 || 1);
    this.klein = new ApexFieldGrid(byName('klein'), (seed ^ 0x51e1) >>> 0 || 1);
    this.tunnel = new ApexFieldGrid(byName('tunnel'), (seed ^ 0x7c00) >>> 0 || 1);
  }

  /**
   * Excite the organs with the creature's `drive` (0..1), then advance each physics one step. The
   * wave organs (acoustic, tunnel) receive an impulse; the diffusion organs (heat, klein) receive a
   * heat deposit scaled by drive. O(Σ w·h) at the tractable live resolution.
   */
  step(drive: number): void {
    const d = c01(drive);
    this.acoustic.excite(d * 0.8);
    this.tunnel.excite(d * 0.6);
    this.heat.excite(d * 0.5);
    this.klein.excite(d * 0.4);
    this.acoustic.step();
    this.heat.step();
    this.klein.step();
    this.tunnel.step();
  }

  /** Read the multi-physics sensorium off the current organ states. O(Σ w·h). */
  sense(): FieldSensorium {
    const acousticEnergy = squash(this.energy(this.acoustic));
    const acousticInterference = squash(this.acoustic.variance() * 4);
    const heatLoad = squash(Math.abs(this.heat.total()) / 32);
    const kleinFold = squash(this.klein.variance() * 4);
    const tunnelAmplitude = squash(Math.sqrt(this.energy(this.tunnel)));
    const richness = c01(
      0.3 * acousticInterference +
        0.25 * tunnelAmplitude +
        0.2 * kleinFold +
        0.15 * acousticEnergy +
        0.1 * heatLoad,
    );
    return {
      acousticEnergy,
      acousticInterference,
      heatLoad,
      kleinFold,
      tunnelAmplitude,
      richness,
    };
  }

  /** Mean field energy Σ f² / N of a grid. O(w·h). */
  private energy(grid: ApexFieldGrid): number {
    const f = grid.field();
    const n = f.length;
    if (n === 0) return 0;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const v = f[i] ?? 0;
      s += v * v;
    }
    return s / n;
  }
}
