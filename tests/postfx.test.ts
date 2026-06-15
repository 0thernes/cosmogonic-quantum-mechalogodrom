/**
 * postFxMode() — resolves the post-FX tier from the `?fx=` URL override (V60 gravitational lens).
 * The only headless-testable export of src/core/postfx.ts (the rest needs a WebGLRenderer); its
 * branch logic — the no-DOM safe default, the off/cinematic alias sets, and the `lens` fallback —
 * had no coverage. `window` is stubbed on globalThis and restored after each case.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { postFxMode } from '../src/core/postfx';

const hadWindow = 'window' in globalThis;
const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (hadWindow) (globalThis as { window?: unknown }).window = originalWindow;
  else delete (globalThis as { window?: unknown }).window;
});

/** Point postFxMode at a given query string (or remove `window` entirely when search is null). */
function withSearch(search: string | null): void {
  if (search === null) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = { location: { search } };
  }
}

describe('postFxMode — URL tier resolution', () => {
  test('no DOM (server / test context) is safe and defaults to lens', () => {
    withSearch(null);
    expect(postFxMode()).toBe('lens');
  });

  test('a window without a location also falls back to lens', () => {
    (globalThis as { window?: unknown }).window = {};
    expect(postFxMode()).toBe('lens');
  });

  test('every "off" alias disables the pipeline', () => {
    for (const v of ['0', 'off', 'no', 'false']) {
      withSearch(`?fx=${v}`);
      expect(postFxMode()).toBe('off');
    }
  });

  test('every "on" alias selects the full cinematic pipeline', () => {
    for (const v of ['1', 'true', 'on', 'cinematic']) {
      withSearch(`?fx=${v}`);
      expect(postFxMode()).toBe('cinematic');
    }
  });

  test('absent or unrecognized fx values resolve to the lens default', () => {
    for (const search of ['', '?x=1', '?fx=', '?fx=bananas', '?fx=2', '?fx=ON']) {
      withSearch(search);
      expect(postFxMode()).toBe('lens');
    }
  });
});
