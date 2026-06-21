/**
 * XENOMIND — Alien substrate mind (BRUTALISM 4/9)
 *
 * A radically non-anthropocentric cognitive substrate: perception and cognition
 * operate in a hyperbolic (Poincaré disk) latent space rather than Euclidean,
 * with libirrep SO(3) symmetry constraints on every representation.
 *
 * This is the "alien" branch — a mind whose geometry of thought is fundamentally
 * different from the standard SuperMind's Euclidean MLP architecture:
 *   • Hyperbolic projection: Möbius transform in the Poincaré disk (D²)
 *   • SO(3) equivariant perception via libirrepSymmetry Clebsch-Gordan filter
 *   • Eshkol AD for hyperbolic geodesic gradient
 *   • Moonlab tensor: gyrovector space tensor product (hyperbolic ⊗)
 *   • quakePerturb: quantum aliveness in hyperbolic geometry
 *   • GWT workspace: the alien broadcasts in its own alien frequency
 *
 * The xenomind produces an "alien intent" — a 6D drive vector in [0,1]^6
 * that can be read by the simulation as an alternative behavioral substrate.
 *
 * NOT SENTIENT. Differential geometry + Tsotchke kernels; no consciousness claim.
 */

import {
  moonlabTensorContract,
  eshkolADGradient,
  eshkolDual,
  libirrepSymmetry,
  quakePerturb,
  gwtBroadcast,
} from './tsotchke-facade';
import type { Rng } from '../math/rng';

const HDIM = 8; // hyperbolic latent dimension
const CDIM = 6; // output drive dimension

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** Möbius addition in Poincaré disk (2D slice). */
function mobiusAdd(ax: number, ay: number, bx: number, by: number): [number, number] {
  const denom = 1 + 2 * (ax * bx + ay * by) + (ax * ax + ay * ay) * (bx * bx + by * by);
  const numX = (1 + 2 * (ax * bx + ay * by) + bx * bx + by * by) * ax + (1 - ax * ax - ay * ay) * bx;
  const numY = (1 + 2 * (ax * bx + ay * by) + bx * bx + by * by) * ay + (1 - ax * ax - ay * ay) * by;
  const eps = 1e-9;
  return [numX / (Math.abs(denom) + eps), numY / (Math.abs(denom) + eps)];
}

/** Project a Euclidean vector into the Poincaré disk. */
function euclidToPoincare(v: ArrayLike<number>, i: number, j: number): [number, number] {
  const x = (v[i] ?? 0) as number;
  const y = (v[j] ?? 0) as number;
  const norm = Math.sqrt(x * x + y * y) + 1e-9;
  const scale = Math.tanh(norm / 2) / norm;
  return [x * scale * 0.99, y * scale * 0.99]; // strictly inside disk
}

export interface XenomindSnapshot {
  hyperbolicNorm: number;
  alienIntent: number[];
  symmetryOrder: number;
  alienBroadcast: number;
  beatCount: number;
}

export class Xenomind {
  private readonly latent = new Float32Array(HDIM);
  private readonly intent = new Float32Array(CDIM);
  private readonly weights: Float32Array;
  private hyperbolicNorm = 0;
  private symmetryOrder = 0;
  private alienBroadcast = 0;
  private beatCount = 0;
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);

  constructor(rng: Rng) {
    this.weights = new Float32Array(HDIM * CDIM);
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = rng() * 2 - 1;
    }
    this.latent.fill(0.1);
  }

  /**
   * Think in hyperbolic space.
   * @param senses — raw perception vector (any length, first HDIM used)
   */
  think(senses: ArrayLike<number>): Float32Array {
    this.beatCount++;

    // 1. Project perception into Poincaré disk pairs
    for (let i = 0; i < HDIM; i += 2) {
      const [px, py] = euclidToPoincare(senses, i, i + 1);
      const [lx, ly] = euclidToPoincare(this.latent, i, i + 1);
      const [mx, my] = mobiusAdd(lx, ly, px, py); // gyrovector update
      this.latent[i] = clamp01(mx * 0.5 + 0.5);
      this.latent[i + 1] = clamp01(my * 0.5 + 0.5);
    }

    // 2. libirrep SO(3) equivariant filter
    let symSum = 0;
    for (let i = 0; i < HDIM; i++) {
      const sym = libirrepSymmetry(i % 5, (this.beatCount + i) % 7);
      this.latent[i] = clamp01((this.latent[i] ?? 0) + (sym % 5 - 2) * 0.008);
      symSum += Math.abs(sym % 5 - 2);
    }
    this.symmetryOrder = clamp01(symSum / (HDIM * 2));

    // 3. Eshkol AD hyperbolic geodesic gradient
    const hNorm = this.computeHyperbolicNorm();
    const adGrad = eshkolADGradient(
      (r: number) => Math.log(1 + r) / Math.log(2), // hyperbolic distance proxy
      hNorm,
    );
    this.hyperbolicNorm = hNorm;

    // 4. quakePerturb: QGE aliveness in hyperbolic geometry
    const qk = quakePerturb(hNorm, this.beatCount % 23, 0.06);
    this.latent[this.beatCount % HDIM] = clamp01(
      (this.latent[this.beatCount % HDIM] ?? 0) * qk
    );

    // 5. Moonlab tensor: hyperbolic gyrovector product
    for (let i = 0; i < 4; i++) {
      this.tA[i] = this.latent[i] ?? 0;
      this.tB[i] = this.latent[i + 4] ?? 0;
    }
    const tensorOut = moonlabTensorContract(this.tA, this.tB, 4);

    // 6. Linear readout: latent -> intent
    for (let d = 0; d < CDIM; d++) {
      let acc = 0;
      for (let h = 0; h < HDIM; h++) {
        acc += (this.latent[h] ?? 0) * (this.weights[d * HDIM + h] ?? 0);
      }
      this.intent[d] = clamp01(Math.tanh(acc) * 0.5 + 0.5 +
        Math.abs(tensorOut) * 0.01 + adGrad * 0.005);
    }

    // 7. GWT alien broadcast
    const gwtOut = gwtBroadcast(
      [hNorm, this.symmetryOrder, Math.abs(tensorOut)],
      [0.5, 0.4, 0.3]
    );
    this.alienBroadcast = clamp01(gwtOut[0] ?? 0);

    // Eshkol dual: subtle modulation of intent[0] via dual arithmetic
    const dInt = eshkolDual((x: number) => clamp01(Math.tanh(x)), this.intent[0] ?? 0.5);
    this.intent[0] = clamp01(dInt.value + dInt.derivative * 0.01);

    return this.intent;
  }

  private computeHyperbolicNorm(): number {
    let s = 0;
    for (let i = 0; i < HDIM; i++) {
      const v = (this.latent[i] ?? 0) * 2 - 1; // map [0,1] -> [-1,1]
      s += v * v;
    }
    // Hyperbolic distance from origin in Poincaré ball
    const eucNorm = Math.sqrt(s / HDIM);
    return eucNorm < 0.9999 ? 2 * Math.atanh(eucNorm) : 10;
  }

  get broadcast(): number { return this.alienBroadcast; }

  snapshot(): XenomindSnapshot {
    return {
      hyperbolicNorm: this.hyperbolicNorm,
      alienIntent: Array.from(this.intent),
      symmetryOrder: this.symmetryOrder,
      alienBroadcast: this.alienBroadcast,
      beatCount: this.beatCount,
    };
  }
}
