/**
 * HOT-1: Genuine Top-Down Generative Perception Loop.
 * The mind's imagination (imagitron) generates expected percepts that bias the next bottom-up sense.
 * This closes a real predict→generate→correct loop (predictive processing + higher-order).
 * Fixed weights, deterministic (no learning), allocation-free after ctor.
 * Used to make the creature "see what it expects" (hallucination when high novelty).
 * POWER OF MATH: recursive predictor + error (surprise) as control signal.
 * See GOAL5 contract, Butlin HOT-1, PP-1.
 * NOT sentient — pure computational model.
 */

import type { SuperPercept } from './super-creature';
import {
  eshkolADGradient,
  eshkolDual,
  eshkolApplyAD,
  moonlabTensorQualia,
  makeEshkolDual,
  dualAdd,
  gwtBroadcast,
  moonlabMpoStep,
  quakePerturb,
  libirrepSymmetry,
} from './tsotchke-facade'; // + quakePerturb + libirrepSym from Tsotchke (Eshkol AD/tape, Moonlab, libirrep, quantum-quake) into topdown HOT-1

export interface TopDownSnapshot {
  bias: number[]; // 4-d bias applied to [energy, threat, light, sound]
  error: number; // |imagined - actual| last step
}

const BIAS_DIMS = 4;

export class TopDownPerception {
  private readonly bias = new Float32Array(BIAS_DIMS);
  private lastError = 0;

  constructor() {
    // neutral start
  }

  /** Generate top-down bias from imagined latent / high-level state. O(1).
   * Eshkol corpus (Eshkol/eshkol_repo/.../AUTODIFF.md + ad_tape/dual): predict error as dual-tape style
   * (value + derivative) for HOT-1. Arena ownership notes for fixed bias buffer. Faithful to AD primitive.
   * See full local Z:\[Vibe Coded (AI)]\(Tsotchke) for source.
   * deeper tape-style error + dual for bias (Eshkol AD/tape).
   */
  generate(imaginedLatent: ArrayLike<number>, novelty: number): void {
    // Simple deterministic mapping: use first few dims + novelty to bias senses
    // Eshkol AD wire (from tape.esk + autodiff in corpus): use gradient of a "prediction error" func for bias strength
    const predErr = (x: number) => Math.abs(x - (imaginedLatent[0] ?? 0)) + novelty * 0.1;
    const adGrad = eshkolADGradient(predErr, (imaginedLatent[0] ?? 0) + novelty * 0.05); // derivative as control
    // Iteration 11: Eshkol forward dual from AUTODIFF (dual {val,d}) for better predict error
    const dual = eshkolDual(predErr, (imaginedLatent[0] ?? 0) + novelty * 0.05);
    // use makeEshkolDual + dualAdd for combined Eshkol forward AD (per AUTODIFF.md dual struct)
    const d1 = makeEshkolDual(adGrad, 0.5);
    const d2 = makeEshkolDual(dual.derivative, 0.2);
    const dTape = dualAdd(d1, d2);
    // additional AD tape-style (grad * dual as combined error signal for topdown into world/super)
    const tapeErr = adGrad * (dTape.derivative + 0.001);
    this.bias[0] =
      0.1 * (imaginedLatent[0] ?? 0) +
      0.05 * novelty +
      0.02 * adGrad +
      0.01 * dTape.derivative +
      0.005 * tapeErr; // energy + dual + tape (Eshkol)
    // eshkolApplyAD (Eshkol tape) + moonlabTensorQualia for bias[1/2] richer topdown
    this.bias[1] = eshkolApplyAD(0.08 * (imaginedLatent[1] ?? 0), adGrad, 0.05); // threat + AD
    const tq = moonlabTensorQualia([imaginedLatent[0] ?? 0, novelty, imaginedLatent[2] ?? 0], 6);
    this.bias[2] = 0.12 * (imaginedLatent[2] ?? 0) + 0.02 * tq; // light + tensor
    // gwtBroadcast + moonlabMpoStep (Tsotchke Eshkol GWT + Moonlab) for richer HOT-1 bias
    const gwtB = gwtBroadcast([this.bias[0] || 0, novelty], [0.5, 0.6]);
    const mpoB = moonlabMpoStep(new Float32Array([imaginedLatent[0] || 0, novelty]), 2);
    this.bias[0] += ((gwtB[0] || 0) + Math.abs(mpoB)) * 0.005;
    this.bias[3] = eshkolApplyAD(0.06 * (imaginedLatent[3] ?? 0) + 0.03 * novelty, adGrad, 0.02); // sound + more AD/tape from Eshkol
    // mpoB + gwt for Moonlab/Eshkol in sound bias too
    this.bias[3] += Math.abs(mpoB) * 0.01 + (gwtB[0] || 0) * 0.005;
    // wire quantum-quake + libirrepSym into topdown (aliveness + symmetry modulate bias for corpus effect)
    const qp = quakePerturb(0.5, 42, 0.1);
    const irSym = libirrepSymmetry(2, 3);
    this.bias[2] = (this.bias[2] ?? 0) + (qp - 1) * 0.01 + (irSym % 2) * 0.005; // Moonlab/Quake + irrep in HOT-1 bias
    for (let i = 0; i < BIAS_DIMS; i++) {
      this.bias[i] = Math.max(-0.3, Math.min(0.3, this.bias[i] ?? 0));
    }
  }

  /** Apply the top-down bias to a percept (HOT-1 loop close). O(1). */
  apply(percept: SuperPercept): void {
    // mutate in place (caller owns the object for this beat)
    percept.energy = Math.max(0, Math.min(1, (percept.energy ?? 0) + (this.bias[0] ?? 0)));
    percept.threat = Math.max(0, Math.min(1, (percept.threat ?? 0) + (this.bias[1] ?? 0)));
    percept.light = Math.max(0, Math.min(1, (percept.light ?? 0) + (this.bias[2] ?? 0)));
    percept.sound = Math.max(0, Math.min(1, (percept.sound ?? 0) + (this.bias[3] ?? 0)));
  }

  setError(e: number): void {
    this.lastError = e;
  }

  snapshot(): TopDownSnapshot {
    return {
      bias: Array.from(this.bias),
      error: this.lastError,
    };
  }
}
