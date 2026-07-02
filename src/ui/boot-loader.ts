/**
 * BOOT LOADER controller (V121, USER #6) — feeds the #cqm-boot overlay REAL boot telemetry and
 * removes it on the first rendered world frame.
 *
 * The overlay itself is pure markup + compositor-driven CSS in index.html (transform/opacity
 * keyframes keep spinning even while the synchronous World construction blocks the main thread);
 * this module only writes measured values into the 8 metric tiles and fades the page out. Every
 * value shown is a real measurement or a real config fact — never a fabricated percentage. UI
 * layer only: no sim imports, `performance.now` is fine here (banned in sim logic, not in UI).
 */

/** One boot metric tile: set its value text and mark it settled (stops the sweep shimmer). */
export function bootStage(name: string, value: string, doc: Document = document): void {
  const tile = doc.querySelector<HTMLElement>(`#cqm-boot .m[data-boot="${name}"]`);
  if (!tile) return;
  const v = tile.querySelector<HTMLElement>('.v');
  if (v) v.textContent = value;
  tile.classList.add('done');
}

/**
 * Yield to the compositor so the overlay paints the latest tile values BEFORE the next synchronous
 * boot block runs (double-rAF = one guaranteed presented frame).
 */
export function bootPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Fade the overlay out (0.6 s CSS transition) and remove it from the DOM. Idempotent. */
export function bootDone(doc: Document = document): void {
  const el = doc.getElementById('cqm-boot');
  if (!el) return;
  el.classList.add('done');
  el.setAttribute('aria-hidden', 'true');
  setTimeout(() => el.remove(), 700);
}

/** Remove the overlay immediately (boot failure path — the recovery card must not sit under it). */
export function bootAbort(doc: Document = document): void {
  doc.getElementById('cqm-boot')?.remove();
}
