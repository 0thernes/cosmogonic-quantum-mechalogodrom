/**
 * MIND-FIELD — stigmergic group-cognition substrate (emergence angle #5).
 *
 * All Archons read/write a shared field of `ARCHON_CHANNELS × FIELD_DIM` scalars. Each beat an Archon
 * deposits a trace of its activation vector; a deterministic diffusion mixes traces so culture and
 * alliance signals propagate without direct message-passing. Pure + deterministic; no rng.
 *
 * NOT sentient — a functional stigmergy model for society-scale coupling instrumentation.
 */
export const ARCHON_CHANNELS = 25;
export const FIELD_DIM = 8;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface MindFieldSnapshot {
  readonly channels: number;
  readonly dim: number;
  readonly energy: number;
  readonly peakChannel: number;
  readonly coherence: number;
}

/**
 * Shared stigmergic field — one slot per Archon channel, each `FIELD_DIM` wide.
 */
export class MindField {
  private readonly buf: Float32Array;
  private readonly scratch: Float32Array;

  constructor(
    readonly channels = ARCHON_CHANNELS,
    readonly dim = FIELD_DIM,
    private readonly decay = 0.92,
    private readonly diffuse = 0.04,
  ) {
    this.buf = new Float32Array(channels * dim);
    this.scratch = new Float32Array(channels * dim);
  }

  /** Deposit Archon `channel`'s vector (length ≤ dim) into the field. */
  deposit(channel: number, vector: readonly number[], strength = 1): void {
    const c = ((channel % this.channels) + this.channels) % this.channels;
    const off = c * this.dim;
    for (let d = 0; d < this.dim; d++) {
      const i = off + d;
      this.buf[i] = clamp01((this.buf[i] ?? 0) * this.decay + strength * (vector[d] ?? 0));
    }
  }

  /** Read channel `channel` into `out` (length ≥ dim). */
  sample(channel: number, out: Float32Array | number[]): void {
    const c = ((channel % this.channels) + this.channels) % this.channels;
    const off = c * this.dim;
    for (let d = 0; d < this.dim; d++) out[d] = this.buf[off + d] ?? 0;
  }

  /** Global mean field into `out` — what the pantheon collectively "feels". */
  mean(out: Float32Array | number[]): void {
    for (let d = 0; d < this.dim; d++) {
      let s = 0;
      for (let c = 0; c < this.channels; c++) s += this.buf[c * this.dim + d] ?? 0;
      out[d] = s / this.channels;
    }
  }

  /** One diffusion step: decay + neighbor mixing (ring topology over channels). Pure. */
  step(): void {
    const n = this.channels;
    const d = this.dim;
    for (let c = 0; c < n; c++) {
      const prev = (c + n - 1) % n;
      const next = (c + 1) % n;
      for (let k = 0; k < d; k++) {
        const i = c * d + k;
        const mix =
          ((this.buf[i] ?? 0) + (this.buf[prev * d + k] ?? 0) + (this.buf[next * d + k] ?? 0)) / 3;
        this.scratch[i] = clamp01((this.buf[i] ?? 0) * this.decay + this.diffuse * mix);
      }
    }
    this.buf.set(this.scratch);
  }

  snapshot(): MindFieldSnapshot {
    let energy = 0;
    let peak = 0;
    let peakCh = 0;
    const chEnergy = new Array<number>(this.channels).fill(0);
    for (let c = 0; c < this.channels; c++) {
      for (let k = 0; k < this.dim; k++) {
        const v = this.buf[c * this.dim + k] ?? 0;
        energy += Math.abs(v);
        chEnergy[c] = (chEnergy[c] ?? 0) + v;
      }
      if ((chEnergy[c] ?? 0) > peak) {
        peak = chEnergy[c] ?? 0;
        peakCh = c;
      }
    }
    let mean = 0;
    for (let c = 0; c < this.channels; c++) mean += chEnergy[c] ?? 0;
    mean /= this.channels;
    let varSum = 0;
    for (let c = 0; c < this.channels; c++) {
      const d = (chEnergy[c] ?? 0) - mean;
      varSum += d * d;
    }
    const coherence = clamp01(1 - Math.sqrt(varSum / Math.max(1, this.channels)));
    return {
      channels: this.channels,
      dim: this.dim,
      energy,
      peakChannel: peakCh,
      coherence,
    };
  }
}
