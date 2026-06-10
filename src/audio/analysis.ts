/**
 * Per-frame audio frequency analysis (CONTRACTS V2 — Quantum Wildbeyond).
 *
 * Polls the {@link AudioEngine} analyser tap (fftSize 256 → 128 frequency bins) and
 * folds the byte spectrum into four normalized 0..1 bands: bass, mid, treble, and an
 * overall level. World couples these to visuals (point-light shimmer, constellation
 * pulse, quantum-cloud point-size breathing) with multipliers ≤ 0.35, so a silent
 * world renders identically to v1.
 *
 * Allocation discipline (contract rule 5): {@link AudioAnalysis.update} writes into a
 * pre-allocated `Uint8Array` and a single reused {@link AudioBands} object — zero
 * allocation per frame. The only post-construction allocation is a one-time defensive
 * buffer rebind if the analyser ever reports a bin count other than the engine-pinned
 * 128 (documented at the site).
 *
 * No browser globals at runtime: the engine dependency is type-only (erased by
 * `verbatimModuleSyntax`), and only the `AnalyserNode` handed over by
 * `AudioEngine.tapAnalyser()` is touched — so this module runs under `bun test` with a
 * stubbed analyser (contract rule 8).
 */
import type { AudioEngine } from './engine';

/**
 * Normalized 0..1 frequency bands refreshed by {@link AudioAnalysis.update}.
 *
 * The instance returned by `update()` is REUSED across calls — consume it the same
 * frame; never retain or mutate it.
 */
export interface AudioBands {
  /** Low-band energy (bins 0..n/32, ≈0–750 Hz at 48 kHz / fftSize 256): bass + chord roots. */
  bass: number;
  /** Mid-band energy (bins n/32..n/4, ≈750 Hz–6 kHz): melody, chords, harmonics. */
  mid: number;
  /** High-band energy (bins n/4..n, ≈6–24 kHz): sparkle, crystallize SFX, noise tails. */
  treble: number;
  /** Mean energy across the whole spectrum. */
  level: number;
}

/** frequencyBinCount matching the engine tap's pinned fftSize of 256. */
const DEFAULT_BIN_COUNT = 128;

/**
 * Per-call exponential smoothing factor: `smoothed += SMOOTHING * (raw - smoothed)`.
 * At 60 Hz this is a ≈47 ms time constant layered on the analyser's own
 * `smoothingTimeConstant` (0.8) — fast enough to pulse with beats, slow enough not to
 * flicker. Symmetric attack/decay, so bands also relax to 0 when the mix goes silent.
 */
const SMOOTHING = 0.3;

/**
 * Folds the live frequency spectrum of the {@link AudioEngine} busses into reusable
 * {@link AudioBands}.
 *
 * Construct once in world.ts beside the AudioEngine and call {@link update} once per
 * frame. Until `AudioEngine.init()` has run (first user gesture) the tap is null and
 * every band is exactly 0; afterwards the analyser is acquired lazily on the next
 * update — no extra wiring required.
 */
export class AudioAnalysis {
  private readonly audio: AudioEngine;
  /** Acquired lazily from {@link AudioEngine.tapAnalyser}; null until the engine inits. */
  private analyser: AnalyserNode | null = null;
  /** Pre-allocated FFT byte buffer, refilled in place by every {@link update}. */
  private bins: Uint8Array<ArrayBuffer>;
  /** Exclusive end index of the bass range (≥ 1). */
  private bassEnd = 1;
  /** Exclusive end index of the mid range (bassEnd ≤ midEnd ≤ bins.length). */
  private midEnd = 1;
  /** Normalization denominators (bin count × 255), precomputed off the hot path. */
  private bassDen = 255;
  private midDen = 255;
  private trebleDen = 255;
  private levelDen = 255;
  /** The single REUSED result object returned by every {@link update} call. */
  private readonly bands: AudioBands = { bass: 0, mid: 0, treble: 0, level: 0 };

  /**
   * @param audio Engine whose music+SFX busses feed the analyser tap. The reference is
   *   only polled via `tapAnalyser()` — construction order vs. `init()` is irrelevant.
   */
  constructor(audio: AudioEngine) {
    this.audio = audio;
    this.bins = new Uint8Array(DEFAULT_BIN_COUNT);
    this.applyBinLayout();
  }

  /**
   * Poll the analyser and refresh all four bands.
   *
   * Returns the single REUSED {@link AudioBands} object (valid until the next call —
   * consume same-frame, never retain). Exponentially smoothed ({@link SMOOTHING}); all
   * bands are exactly 0 while the audio engine is uninitialized, so the silent world
   * is bit-identical to v1. Allocation-free. O(fftSize/2) — one pass over the bins.
   */
  update(): AudioBands {
    let analyser = this.analyser;
    if (!analyser) {
      analyser = this.audio.tapAnalyser();
      if (!analyser) {
        const b = this.bands;
        b.bass = 0;
        b.mid = 0;
        b.treble = 0;
        b.level = 0;
        return b;
      }
      this.analyser = analyser;
      if (analyser.frequencyBinCount !== this.bins.length) {
        // One-time rebind, never per-frame: the engine pins fftSize 256, but honor
        // whatever bin count the acquired analyser actually reports (rule: parse,
        // never trust, at every boundary).
        this.bins = new Uint8Array(analyser.frequencyBinCount);
        this.applyBinLayout();
      }
    }
    analyser.getByteFrequencyData(this.bins);
    const bassSum = this.sumBins(0, this.bassEnd);
    const midSum = this.sumBins(this.bassEnd, this.midEnd);
    const trebleSum = this.sumBins(this.midEnd, this.bins.length);
    const b = this.bands;
    b.bass += SMOOTHING * (bassSum / this.bassDen - b.bass);
    b.mid += SMOOTHING * (midSum / this.midDen - b.mid);
    b.treble += SMOOTHING * (trebleSum / this.trebleDen - b.treble);
    b.level += SMOOTHING * ((bassSum + midSum + trebleSum) / this.levelDen - b.level);
    return b;
  }

  /**
   * Recompute band edges + normalization denominators from the current bin count.
   * Spectrum fractions: bass = first 1/32 (≈0–750 Hz at 48 kHz, fftSize 256), mid up
   * to 1/4 (≈6 kHz), treble the rest. Clamps keep every denominator ≥ 255 (no division
   * by zero) even for degenerate bin counts. Runs at construction + the rare rebind
   * only — never per frame. O(1).
   */
  private applyBinLayout(): void {
    const n = this.bins.length;
    this.bassEnd = Math.min(n, Math.max(1, n >> 5));
    this.midEnd = Math.min(n, Math.max(this.bassEnd, n >> 2));
    this.bassDen = this.bassEnd * 255;
    this.midDen = Math.max(1, this.midEnd - this.bassEnd) * 255;
    this.trebleDen = Math.max(1, n - this.midEnd) * 255;
    this.levelDen = Math.max(1, n) * 255;
  }

  /** Sum `bins[from..to)`. Allocation-free. O(to − from). */
  private sumBins(from: number, to: number): number {
    const bins = this.bins;
    let sum = 0;
    for (let i = from; i < to; i++) {
      // In range: callers pass 0 <= from <= to <= bins.length (applyBinLayout clamps).
      sum += bins[i]!;
    }
    return sum;
  }
}
