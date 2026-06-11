import type { QualityProfile, QualityTier } from '../types';

/**
 * Quality tier ladder (CONTRACTS V3.1, PANTHEON).
 *
 * The legacy binary mobile/desktop split becomes a four-rung ladder keyed off
 * `hardwareConcurrency` and `deviceMemory` (Chromium-only; absent ⇒ assumed 8 GB,
 * which biases LAPTOP-class Firefox/Safari machines toward the core-count rungs):
 *
 * - **phone** — touch-first pointer or a sub-600px viewport. 650 entities on the
 *   legacy per-mesh render path (`instanced: false`), capped DPR, no shadows.
 * - **laptop** — fine pointer, < 10 cores. 2,000 entities, instanced.
 * - **desktop** — ≥ 10 cores. 5,000 entities, instanced.
 * - **ultra** — ≥ 16 cores AND ≥ 8 GB reported memory. 10,000-entity hard ceiling,
 *   instanced; the idle world settles at the adaptive `targetEntities` (6,500) so the
 *   ≥55fps desktop acceptance gate holds, with 10,000 reachable on demand via bursts.
 *
 * `targetEntities` is the ADAPTIVE steady-state population (organic growth stops there);
 * `maxEntities` is the HARD ceiling all buffers are sized from and bursts can still reach.
 * They are equal on every tier except ultra (see {@link QualityProfile.targetEntities} and
 * the "Ultra-tier 10k optimization" note in docs/BENCHMARKS.md for the 6,500 calibration).
 *
 * quantum/links/stars scale sublinearly with the entity budget (they are ambience
 * layers, not the population). The tier is decided ONCE at boot — no runtime
 * switching (the instanced/mesh render paths must never swap mid-session).
 */
export const QUALITY_LADDER: Readonly<
  Record<QualityTier, Omit<QualityProfile, 'tier' | 'isMobile'>>
> = {
  phone: {
    dprCap: 1.25,
    maxEntities: 650,
    targetEntities: 650,
    quantumCount: 3500,
    maxLinks: 2200,
    shadows: false,
    starCount: 2000,
    instanced: false,
  },
  laptop: {
    dprCap: 2,
    maxEntities: 2000,
    targetEntities: 2000,
    quantumCount: 4500,
    maxLinks: 3000,
    shadows: true,
    starCount: 3000,
    instanced: true,
  },
  desktop: {
    dprCap: 2,
    maxEntities: 5000,
    targetEntities: 5000,
    quantumCount: 6000,
    maxLinks: 4000,
    shadows: true,
    starCount: 4500,
    instanced: true,
  },
  ultra: {
    dprCap: 2,
    maxEntities: 10000,
    // The ultra tier fills its 10,000 ceiling — an ultra classification requires ≥16 cores,
    // which implies a GPU that can carry it (the perf optimizations keep sim-CPU ≈ 18 ms at
    // 10k; a discrete GPU absorbs the draw). `targetEntities === maxEntities` on every tier,
    // so organic growth deterministically settles at the ceiling (same seed + same device →
    // same cosmos). Per-frame neighbor-query throttles (docs/BENCHMARKS.md) keep it smooth.
    targetEntities: 10000,
    quantumCount: 8000,
    maxLinks: 6000,
    shadows: true,
    starCount: 6000,
    instanced: true,
  },
};

/**
 * Pure tier resolution from the probed capabilities — exported so the ladder is
 * testable without a DOM. `memGB` defaults to 8 when the platform hides it. O(1).
 */
export function resolveTier(isMobile: boolean, cores: number, memGB: number): QualityTier {
  if (isMobile) return 'phone';
  if (cores >= 16 && memGB >= 8) return 'ultra';
  if (cores >= 10) return 'desktop';
  return 'laptop';
}

/**
 * Detect device capability once at startup (legacy lines 153-162 + V3.1 ladder).
 *
 * Browser-only: reads `matchMedia`, the viewport size, `hardwareConcurrency`
 * and (when exposed) `deviceMemory`. "Mobile" means a touch-first pointer
 * (`hover:none` / `pointer:coarse`) OR a viewport under 600px in either
 * dimension — phones/foldables get the battery-honest tier no matter how many
 * cores they report.
 */
export function detectQuality(): QualityProfile {
  const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  const isSmall = window.innerWidth < 600 || window.innerHeight < 600;
  const isMobile = isTouch || isSmall;
  const cores = navigator.hardwareConcurrency || 4;
  const memGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const tier = resolveTier(isMobile, cores, memGB);
  return { tier, isMobile, ...QUALITY_LADDER[tier] };
}
