/**
 * Whether same-origin Bun server APIs exist for this rendered artifact.
 *
 * The production app and tests default to server-capable. `build-pages.ts` marks only its generated
 * static index with `data-cqm-static-host="true"`, letting the same bundle avoid guaranteed `/api/*`
 * 404/405 noise while preserving localStorage, simulation, and browser-direct features.
 */
export function serverApiAvailable(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    return document.documentElement.dataset['cqmStaticHost'] !== 'true';
  } catch {
    // A hostile/partial DOM shim must not disable the normal Bun-server path accidentally.
    return true;
  }
}
