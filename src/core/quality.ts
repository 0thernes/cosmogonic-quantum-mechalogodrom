import type { QualityProfile, QualityTier } from '../types';
import { probeRuntimeCapability } from './runtime-capability';

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
 * - **ultra** — 10,000-entity hard ceiling, instanced; FILLS that ceiling
 *   (`targetEntities === maxEntities`). V40: reachable via `?tier=ultra` (the ≥16-core auto path now
 *   goes to `mega`); the per-frame neighbor-query throttles in docs/BENCHMARKS-2026-06-26.md keep sim-CPU smooth.
 * - **mega** — ≥ 16 cores AND ≥ 8 GB reported memory. The directive's 50,000-entity ceiling and the
 *   **V40 AUTO default** for capable machines (no opt-in); √N density scaling bounds neighbour cost.
 *
 * `targetEntities` is the steady-state population organic growth settles at;
 * `maxEntities` is the HARD ceiling all buffers are sized from. They are equal on every
 * tier (the earlier ultra 6,500 adaptive throttle was retired in 0.5.0 — history in
 * the "Ultra-tier 10k optimization" note in docs/BENCHMARKS-2026-06-26.md and CHANGELOG 0.5.0).
 *
 * quantum/links/stars scale sublinearly with the entity budget (they are ambience
 * layers, not the population). The tier is decided ONCE at boot — no runtime
 * switching (the instanced/mesh render paths must never swap mid-session).
 */
export const QUALITY_LADDER: Readonly<
  Record<QualityTier, Omit<QualityProfile, 'tier' | 'isMobile'>>
> = {
  // V123 (USER #6): the six-rung ladder — phone 1k · tablet 2k · laptop 5k · desktop 10k ·
  // ultra 25k · mega 50k. Everyone BOOTS phone (fast first paint); the perf chip climbs.
  phone: {
    dprCap: 1.25,
    maxEntities: 1000,
    targetEntities: 1000,
    quantumCount: 3500,
    maxLinks: 2200,
    shadows: false,
    starCount: 2000,
    instanced: false,
  },
  tablet: {
    dprCap: 1.75,
    maxEntities: 2000,
    targetEntities: 2000,
    quantumCount: 4500,
    maxLinks: 3000,
    shadows: true,
    starCount: 3000,
    instanced: true,
  },
  laptop: {
    dprCap: 2,
    maxEntities: 5000,
    targetEntities: 5000,
    quantumCount: 6000,
    maxLinks: 4000,
    shadows: true,
    starCount: 4500,
    instanced: true,
  },
  desktop: {
    dprCap: 2,
    maxEntities: 10000,
    // `targetEntities === maxEntities` on every tier, so organic growth deterministically settles
    // at the ceiling (same seed + same device → same cosmos). Per-frame neighbor-query throttles
    // (docs/BENCHMARKS-2026-06-26.md) keep sim-CPU smooth at 10k.
    targetEntities: 10000,
    quantumCount: 8000,
    maxLinks: 6000,
    shadows: true,
    starCount: 6000,
    instanced: true,
  },
  ultra: {
    // V123: the 25,000 rung between desktop and the full mega world (USER #6 ladder).
    dprCap: 2,
    maxEntities: 25000,
    targetEntities: 25000,
    quantumCount: 9000,
    maxLinks: 7000,
    shadows: true,
    starCount: 7000,
    instanced: true,
  },
  mega: {
    // V38 ceiling, V44 dropped to 25k, **V55 RESTORED to 50,000** — the earlier "50k crashes my
    // machine" was actually the WebGL CONTEXT LEAK (fixed V49/V50). `?tier=mega` selects it; the
    // EntityManager's √N density scale (entities.ts) keeps neighbour-query cost bounded.
    dprCap: 2,
    maxEntities: 50000,
    targetEntities: 50000,
    quantumCount: 10000,
    maxLinks: 8000,
    shadows: true,
    starCount: 8000,
    instanced: true,
  },
};

/**
 * Pure tier resolution from the probed capabilities — exported so the ladder is
 * testable without a DOM. `memGB` defaults to 8 when the platform hides it. O(1).
 */
export function resolveTier(isMobile: boolean, cores: number, memGB: number): QualityTier {
  // V123 (USER #6): this maps what the machine COULD run — the CAPABILITY rung. Boot no longer
  // uses it for the default (everyone boots `phone` for a fast first load; see detectQuality);
  // it stays the honest hardware ladder for `?tier=` guidance and tests.
  if (isMobile) return 'phone';
  if (cores >= 16 && memGB >= 8) return 'mega';
  if (cores >= 16) return 'ultra';
  if (cores >= 10) return 'desktop';
  if (cores >= 8) return 'laptop';
  return 'tablet';
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
  // Dev/QA override: `?tier=phone|laptop|desktop|ultra` forces a tier at boot (decided once, like
  // the auto path). Lets a desktop browser preview the phone path — and a touch-emulating preview
  // (which auto-detects 'phone') exercise the full desktop/ultra population. Absent → auto-detect.
  const forced = new URLSearchParams(window.location.search).get('tier');
  if (
    forced === 'phone' ||
    forced === 'tablet' ||
    forced === 'laptop' ||
    forced === 'desktop' ||
    forced === 'ultra' ||
    forced === 'mega'
  ) {
    const isMobileForced = forced === 'phone';
    const cap = probeRuntimeCapability({ isMobile: isMobileForced });
    return {
      tier: forced,
      isMobile: isMobileForced,
      hardwareTier: cap.hardwareTier,
      ...QUALITY_LADDER[forced],
    };
  }
  const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  const isSmall = window.innerWidth < 600 || window.innerHeight < 600;
  const isMobile = isTouch || isSmall;
  const cap = probeRuntimeCapability({ isMobile });
  // V123 (USER #6): EVERYONE boots the phone rung — the world paints in a couple of seconds
  // instead of a 5+ second 10k build, and the perf chip's tier switcher is one tap away for the
  // full ladder. `?tier=` (above) remains the direct door to any rung.
  return { tier: 'phone', isMobile, hardwareTier: cap.hardwareTier, ...QUALITY_LADDER.phone };
}
