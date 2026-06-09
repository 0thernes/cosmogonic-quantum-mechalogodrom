import type { QualityProfile } from '../types';

/**
 * Detect device capability once at startup (legacy lines 153-162, starCount line 457).
 *
 * Browser-only: reads `matchMedia` and the viewport size. "Mobile" means a
 * touch-first pointer (`hover:none` / `pointer:coarse`) OR a viewport under
 * 600px in either dimension; every budget below keys off that single bit.
 */
export function detectQuality(): QualityProfile {
  const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  const isSmall = window.innerWidth < 600 || window.innerHeight < 600;
  const isMobile = isTouch || isSmall;
  return {
    isMobile,
    dprCap: isMobile ? 1.25 : 2,
    maxEntities: isMobile ? 650 : 1000,
    quantumCount: isMobile ? 3500 : 6000,
    maxLinks: isMobile ? 2200 : 4000,
    shadows: !isMobile,
    starCount: isMobile ? 2000 : 4000,
  };
}
