/**
 * Quantum-RNG-API facade — REST wrapper semantics over the ported Eshkol QRNG core.
 *
 * Tsotchke's `Quantum-RNG-API` org repo exposes HTTP endpoints; Cosmogonic runs the same entropy
 * pipeline locally via {@link EshkolQrng}. This leaf records API-shaped receipts for registry/catalysis.
 *
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */
import { EshkolQrng, type EshkolQrngSnapshot } from '../math/eshkol-qrng';
import type { Rng } from '../math/rng';

export interface QrngApiReceipt {
  /** Simulated endpoint: `/v1/random` draw in [0,1). */
  readonly draw: number;
  /** Battery level 0..1 (buffer fill proxy). */
  readonly battery: number;
  /** Underlying Eshkol snapshot. */
  readonly core: EshkolQrngSnapshot;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** One API draw + receipt from an existing Eshkol core (deterministic, no global state). */
export function qrngApiDrawFrom(core: EshkolQrng): QrngApiReceipt {
  const snap = core.snapshot();
  const draw = core.next01();
  const battery = clamp01(snap.entropyEstimate);
  return { draw, battery, core: snap };
}

/** Convenience: one-shot client from seed (constructs a dedicated core). */
export function qrngApiDraw(seedRng: Rng): QrngApiReceipt {
  return qrngApiDrawFrom(new EshkolQrng(seedRng));
}
