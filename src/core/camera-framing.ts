/** Pure camera-framing helpers (DOM/three-free for headless verification). */

/**
 * Height required for a rotating top-down camera to contain every corner of a square.
 * Uses the narrower of horizontal/vertical half-FOV and a small framing margin.
 */
export function rotatingSquareSurveyHeight(
  halfExtent: number,
  verticalFovDeg: number,
  aspect: number,
): number {
  const safeHalf = Math.max(0, Number.isFinite(halfExtent) ? halfExtent : 0);
  const safeFov = Math.max(1, Math.min(179, Number.isFinite(verticalFovDeg) ? verticalFovDeg : 68));
  const safeAspect = Math.max(0.1, Number.isFinite(aspect) ? aspect : 1);
  const verticalTan = Math.tan((safeFov * Math.PI) / 360);
  const horizontalTan = verticalTan * safeAspect;
  const limitingTan = Math.max(1e-4, Math.min(verticalTan, horizontalTan));
  return (safeHalf * Math.SQRT2 * 1.05) / limitingTan;
}
