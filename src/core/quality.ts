import type { QualityProfile, QualityTier } from '../types';
import { getQuantizationConfig } from '../math/quantization';
import { detectWebGpu } from './webgpu-detect';

/**
 * Quality tier ladder (CONTRACTS V3.1, PANTHEON).
 *
 * The legacy binary mobile/desktop split becomes a four-rung ladder keyed off
 * `hardwareConcurrency` and `deviceMemory` (Chromium-only; absent ⇒ assumed 8 GB,
 * which biases LAPTOP-class Firefox/Safari machines toward the core-count rungs):
 *
 * - **phone** — touch-first pointer or a sub-600px viewport. 1,000 entities.
 * - **tablet** — fine pointer, < 8 cores. 2,000 entities.
 * - **laptop** — fine pointer, 8-9 cores. 5,000 entities.
 * - **desktop** — ≥ 10 cores. 10,000 entities.
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
 * quantum/stars scale sublinearly with the entity budget (ambience layers). Connectome
 * `maxLinks` scales WITH population (~12× `maxEntities`) so the neural web is never
 * artificially capped while the world fills. Tiers scale amount
 * of world only: DPR, shadows, instancing, color/post-FX and simulation cadence stay
 * full-fidelity on every tier. The tier is decided ONCE at boot — no runtime switching.
 */
export const QUALITY_LADDER: Readonly<
  Record<QualityTier, Omit<QualityProfile, 'tier' | 'isMobile' | 'quantization' | 'webGpu'>>
> = {
  // Quality contract: lower tiers may carry fewer entities, but they must not lower visual fidelity.
  phone: {
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 1000,
    targetEntities: 1000,
    quantumCount: 3500,
    maxLinks: 12000,
    shadows: true,
    starCount: 2000,
    instanced: true,
    simRate: 60,
  },
  tablet: {
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 2000,
    targetEntities: 2000,
    quantumCount: 4500,
    maxLinks: 24000,
    shadows: true,
    starCount: 3000,
    instanced: true,
    simRate: 60,
  },
  laptop: {
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 5000,
    targetEntities: 5000,
    quantumCount: 6000,
    maxLinks: 60000,
    shadows: true,
    starCount: 4500,
    instanced: true,
    simRate: 60,
  },
  desktop: {
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 10000,
    // `targetEntities === maxEntities` on every tier, so organic growth deterministically settles
    // at the ceiling (same seed + same device → same cosmos). Per-frame neighbor-query throttles
    // (docs/BENCHMARKS-2026-06-26.md) keep sim-CPU smooth at 10k.
    targetEntities: 10000,
    quantumCount: 8000,
    maxLinks: 120000,
    shadows: true,
    starCount: 6000,
    instanced: true,
    simRate: 60,
  },
  ultra: {
    // V123: the 25,000 rung between desktop and the full mega world (USER #6 ladder).
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 25000,
    targetEntities: 25000,
    quantumCount: 9000,
    maxLinks: 300000,
    shadows: true,
    starCount: 7000,
    instanced: true,
    simRate: 60,
  },
  mega: {
    // V38 ceiling, V44 dropped to 25k, **V55 RESTORED to 50,000** — the earlier "50k crashes my
    // machine" was actually the WebGL CONTEXT LEAK (fixed V49/V50). `?tier=mega` selects it; the
    // EntityManager's √N density scale (entities.ts) keeps neighbour-query cost bounded.
    dprCap: Number.POSITIVE_INFINITY,
    maxEntities: 50000,
    targetEntities: 50000,
    quantumCount: 10000,
    maxLinks: 600000,
    shadows: true,
    starCount: 8000,
    instanced: true,
    simRate: 60,
  },
};

/**
 * Neural + connectome cadence — full 60 Hz on every tier. The entity neural web is always ON
 * (Settings → ⎔ Neural only hides the visual layer); throttling it made the axon field feel
 * sparse/capped at population scale.
 */
const ADAPTIVE_CADENCE: Record<QualityTier, { neuralRate: number; connectomeRate: number }> = {
  phone: { neuralRate: 60, connectomeRate: 60 },
  tablet: { neuralRate: 60, connectomeRate: 60 },
  laptop: { neuralRate: 60, connectomeRate: 60 },
  desktop: { neuralRate: 60, connectomeRate: 60 },
  ultra: { neuralRate: 60, connectomeRate: 60 },
  mega: { neuralRate: 60, connectomeRate: 60 },
};

/**
 * Pure tier resolution from the probed capabilities — exported so the ladder is
 * testable without a DOM. `memGB` defaults to 8 when the platform hides it. O(1).
 */
export function resolveTier(isMobile: boolean, cores: number, memGB: number): QualityTier {
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
 *
 * Also detects WebGPU capabilities for progressive enhancement (Phase 2).
 */
export async function detectQuality(): Promise<QualityProfile> {
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
    // Detect WebGPU even with forced tier
    const webGpuCaps = await detectWebGpu();
    const cadence = ADAPTIVE_CADENCE[forced as QualityTier];
    return {
      tier: forced,
      isMobile: forced === 'phone',
      ...QUALITY_LADDER[forced],
      quantization: getQuantizationConfig(forced as QualityTier),
      simRate: 60,
      neuralRate: cadence.neuralRate,
      connectomeRate: cadence.connectomeRate,
      webGpu: webGpuCaps,
    };
  }
  const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  const isSmall = window.innerWidth < 600 || window.innerHeight < 600;
  const isMobile = isTouch || isSmall;
  const nav =
    (window as unknown as { navigator?: Navigator & { deviceMemory?: number } }).navigator ??
    (typeof navigator === 'undefined'
      ? undefined
      : (navigator as Navigator & { deviceMemory?: number }));
  const cores = Math.max(1, Math.floor(nav?.hardwareConcurrency ?? 8));
  const memGBRaw = nav?.deviceMemory;
  const memGB = Number.isFinite(memGBRaw) && memGBRaw !== undefined && memGBRaw > 0 ? memGBRaw : 8;
  const tier = resolveTier(isMobile, cores, memGB);
  // Detect WebGPU capabilities for progressive enhancement
  const webGpuCaps = await detectWebGpu();
  const cadence = ADAPTIVE_CADENCE[tier];
  return {
    tier,
    isMobile,
    ...QUALITY_LADDER[tier],
    quantization: getQuantizationConfig(tier),
    simRate: 60,
    neuralRate: cadence.neuralRate,
    connectomeRate: cadence.connectomeRate,
    webGpu: webGpuCaps,
  };
}
