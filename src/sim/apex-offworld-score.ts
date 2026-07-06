/**
 * APEX Offworld Umwelt Score — the doctrine's Experiment 2, quantified.
 *
 * The ablation harness (`apex-substrate-ablation.test.ts`) proves each tier is load-bearing as a
 * BINARY. This turns that into a continuous measurement: of all the behaviour the substrate drives, what
 * FRACTION is attributable to the *alien / offworld* channels (the Quantum Brain, the field organs, the
 * procedural connectivity) versus the mundane "how big am I" signals (raw reach magnitude + resident
 * load)? The doctrine's target:
 *
 *   OffworldScore = I(Action; offworld channels) / I(Action; all channels)
 *
 * We estimate it deterministically as a behavioural-distance ratio over an ensemble of apex identities:
 * how far the {@link ApexModulation} moves when the offworld channels are ablated, relative to how far
 * it moves when the WHOLE substrate is ablated. High score ⇒ behaviour is dominated by the alien
 * substrate (an umwelt no Earth animal would recognise); low score ⇒ the alien channels were
 * decoration. NOT a sentience claim — an "is the alienness load-bearing" measurement (doctrine Level
 * 3-4). Deterministic, DOM-free.
 *
 * @see src/sim/apex-substrate-driver.ts
 * @see docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md  (Experiment 2 — Offworld Umwelt Score)
 */

import { mulberry32 } from '../math/rng';
import type { ApexScale } from './apex-brain';
import { DEVICE_BROWSER, type DeviceProfile } from './apex-parameter-manifold';
import {
  ApexSubstrateDriver,
  type AblationFlags,
  type ApexModulation,
} from './apex-substrate-driver';

/** Ablating the three alien substrates (leaves only the mundane reach + resident signals). */
const OFFWORLD_ABLATION: AblationFlags = { quantum: true, field: true, procedural: true };
/** Ablating the whole substrate (the mundane signals too). */
const NULL_ABLATION: AblationFlags = {
  quantum: true,
  field: true,
  procedural: true,
  resident: true,
};

/** The Offworld Umwelt read-out. */
export interface OffworldScore {
  /** 0..1 — fraction of substrate-driven behaviour attributable to the alien/offworld channels. */
  readonly score: number;
  /** 1 − score — how Earth-like (mundane) the behaviour is. */
  readonly earthLikeness: number;
  /** Mean behavioural distance when the offworld channels are ablated. */
  readonly dOffworld: number;
  /** Mean behavioural distance when the whole substrate is ablated. */
  readonly dTotal: number;
  /** Number of (identity × beat) samples averaged. */
  readonly samples: number;
}

const clamp01 = (v: number): number => (!Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v);

/** Euclidean distance between two modulations over the four scalar behaviour channels. O(1). */
function modDistance(a: ApexModulation, b: ApexModulation): number {
  const d0 = a.motorGain - b.motorGain;
  const d1 = a.exploration - b.exploration;
  const d2 = a.thermalStress - b.thermalStress;
  const d3 = a.transcendencePush - b.transcendencePush;
  return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3);
}

/**
 * Measure the Offworld Umwelt Score for a scale over an ensemble of apex identities. For each identity
 * the driver is warmed with a deterministic drive sequence and sampled at several beats; at each sample
 * we compare the full modulation against the offworld-ablated and fully-ablated modulations. O(ensemble
 * × beats × bounded). Deterministic given the seeds.
 */
export function apexOffworldScore(
  scale: ApexScale,
  opts?: {
    seeds?: readonly number[];
    warmBeats?: number;
    sampleEvery?: number;
    device?: DeviceProfile;
  },
): OffworldScore {
  const seeds = opts?.seeds ?? [1, 7, 42, 1337, 0xabcdef];
  const warmBeats = Math.max(4, opts?.warmBeats ?? 24);
  const sampleEvery = Math.max(1, opts?.sampleEvery ?? 4);
  const device = opts?.device ?? DEVICE_BROWSER;

  let sumOffworld = 0;
  let sumTotal = 0;
  let samples = 0;

  for (const seed of seeds) {
    const driver = new ApexSubstrateDriver(scale, seed, device);
    // Deterministic drive sequence derived from the seed (no Math.random).
    const driveRng = mulberry32((seed ^ 0xd21e5a1d) >>> 0 || 1);
    for (let beat = 0; beat < warmBeats; beat++) {
      driver.step(driveRng());
      if (beat % sampleEvery === 0) {
        const full = driver.modulate(6);
        sumOffworld += modDistance(full, driver.modulate(6, OFFWORLD_ABLATION));
        sumTotal += modDistance(full, driver.modulate(6, NULL_ABLATION));
        samples++;
      }
    }
  }

  const dOffworld = samples > 0 ? sumOffworld / samples : 0;
  const dTotal = samples > 0 ? sumTotal / samples : 0;
  const score = clamp01(dTotal > 1e-12 ? dOffworld / dTotal : 0);
  return { score, earthLikeness: clamp01(1 - score), dOffworld, dTotal, samples };
}
