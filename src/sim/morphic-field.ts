/**
 * MORPHIC FIELD — WIRED (V-MORPH: the apex morphic-resonance beat in world.ts).
 *
 * Inspired by Rupert Sheldrake's morphic resonance hypothesis (treated here as a
 * mathematical model of cross-creature state correlation, NOT as empirical science).
 *
 * Maintains a shared field tensor F ∈ R^{FIELD_DIM}. Each apex beat the world imprints the apex
 * mind's consciousness latent (weighted by its transcendence) via {@link imprint}, then reads back a
 * morphic bias via {@link readBias}; when the field RESONATES strongly with the present latent (past
 * successful patterns align with now) the world adds a small bounded boost to collective chaos — a
 * genuine apex→field→world loop beside the noosphere + stigmergy collective fields. Deterministic
 * (draws no rng), so imprinting/reading never perturbs the seeded stream.
 *
 * Implementation:
 *   • EMA decay field (slow timescale: τ=0.03)
 *   • Moonlab MPO step for field propagation (matrix-product-operator compression)
 *   • Eshkol AD for gradient of morphic coupling strength
 *   • libirrep SO(3) symmetry projection (field respects rotational equivariance)
 *   • quakePerturb aliveness: field is never dead — quantum noise keeps it alive
 *
 * NOT SENTIENT. No empirical morphic-resonance claim. Mathematical model only.
 */

import {
  moonlabTensorContract,
  moonlabMpoStep,
  eshkolADGradient,
  libirrepSymmetry,
  quakePerturb,
  gwtBroadcast,
} from './tsotchke-facade';

const FIELD_DIM = 16;
const FIELD_TAU = 0.03; // slow morphic EMA
const RESONANCE_GAIN = 0.04;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export interface MorphicSnapshot {
  fieldNorm: number;
  resonanceStrength: number;
  imprints: number;
  bias: number[];
}

export class MorphicField {
  private readonly field = new Float32Array(FIELD_DIM);
  private readonly scratch = new Float32Array(FIELD_DIM);
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);
  private imprints = 0;
  private resonanceStrength = 0;

  constructor() {
    // Seed the field with a weak non-zero pattern (SO(3) symmetric basis)
    for (let i = 0; i < FIELD_DIM; i++) {
      const sym = libirrepSymmetry(i % 5, (i * 3) % 7);
      this.field[i] = ((sym % 11) / 11) * 0.1;
    }
  }

  /**
   * Imprint a creature's consciousness latent into the morphic field. Called once per apex beat by
   * world.ts (V-MORPH) with the apex mind's latent + its transcendence as the success weight.
   */
  imprint(latent: ArrayLike<number>, successScore: number): void {
    this.imprints++;
    const gain = clamp01(successScore) * RESONANCE_GAIN;
    for (let i = 0; i < FIELD_DIM; i++) {
      const l = (latent[i % latent.length] ?? 0) as number;
      // Slow morphic EMA (τ = FIELD_TAU): decay the stored field and blend in the gain-weighted
      // latent. The prior form added an extra `field*(1-gain)` term, giving field a coefficient of
      // ~1.93 — it saturated to the clamp ceiling every imprint instead of accumulating patterns.
      this.field[i] = (this.field[i] ?? 0) * (1 - FIELD_TAU) + l * gain * FIELD_TAU;
    }
    // Moonlab MPO: compress field through the MPO. chi=2 (not chi=4, which for a d=4 packing is
    // full-rank → a lossless no-op giving a flat constant every imprint) so the compression truncates.
    const mpo = moonlabMpoStep(this.field, 4, 2);
    this.field[0] = clamp01((this.field[0] ?? 0) + Math.abs(mpo) * 0.005);

    // libirrep SO(3) symmetry: enforce rotational equivariance on pairs
    for (let i = 0; i < FIELD_DIM - 1; i += 2) {
      const sym = libirrepSymmetry(2, i + 1);
      const corr = ((sym % 7) - 3) * 0.002;
      this.field[i] = clamp01((this.field[i] ?? 0) + corr);
      this.field[i + 1] = clamp01((this.field[i + 1] ?? 0) - corr);
    }

    // quakePerturb: field never goes dead — quantum aliveness injection
    const qk = quakePerturb(0.5 + (successScore - 0.5) * 0.3, this.imprints % 31, 0.05);
    this.field[this.imprints % FIELD_DIM] = clamp01(
      (this.field[this.imprints % FIELD_DIM] ?? 0) * qk,
    );
  }

  /**
   * Read morphic bias for a given creature's current latent.
   * Returns a 16D bias vector + scalar resonance strength.
   */
  readBias(latent: ArrayLike<number>): { bias: Float32Array; strength: number } {
    // Moonlab tensor contract: similarity between creature latent and field. A chi=4 contract on a
    // 4-element (d=2) vector is a lossless (full-rank) truncation → a degenerate constant, so resonance
    // was ~0.7 for ANY input and the world's chaos gate fired unconditionally. Weight the contract by a
    // real cosine alignment (and truncate at chi=1) so `sim` genuinely varies with apex-vs-field alignment.
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < 4; i++) {
      const a = (latent[i] ?? 0) as number;
      const b = this.field[i] ?? 0;
      this.tA[i] = a;
      this.tB[i] = b;
      dot += a * b;
      na += a * a;
      nb += b * b;
    }
    const cos = dot / (Math.sqrt(na * nb) + 1e-9);
    const sim = cos * moonlabTensorContract(this.tA, this.tB, 1);

    // GWT broadcast: amplify resonance when field is coherent
    const gwtOut = gwtBroadcast([Math.abs(sim), this.fieldNorm()], [0.6, 0.4]);
    this.resonanceStrength = clamp01(gwtOut[0] ?? 0);

    // Eshkol AD: gradient of resonance w.r.t. similarity (for adaptation)
    const grad = eshkolADGradient((s: number) => clamp01(s * s), Math.abs(sim));

    for (let i = 0; i < FIELD_DIM; i++) {
      this.scratch[i] = (this.field[i] ?? 0) * this.resonanceStrength * (1 + grad * 0.05);
    }
    return { bias: this.scratch, strength: this.resonanceStrength };
  }

  private fieldNorm(): number {
    let s = 0;
    for (let i = 0; i < FIELD_DIM; i++) s += (this.field[i] ?? 0) ** 2;
    return Math.sqrt(s);
  }

  /** Decay the field between beats (natural forgetting). */
  decay(): void {
    for (let i = 0; i < FIELD_DIM; i++) {
      this.field[i] = (this.field[i] ?? 0) * 0.999;
    }
  }

  snapshot(): MorphicSnapshot {
    return {
      fieldNorm: this.fieldNorm(),
      resonanceStrength: this.resonanceStrength,
      imprints: this.imprints,
      bias: Array.from(this.field),
    };
  }
}
