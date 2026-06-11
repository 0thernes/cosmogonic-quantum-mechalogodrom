/**
 * Observatory experiments (CONTRACTS V3.5). DOM-free by design: the chart math is exported as
 * pure helpers. Falsifiable claims:
 * - SeriesRing push/wrap math: ordering before and after wrap, multi-series column alignment,
 *   copy semantics, NaN-safety, and a never-replaced pre-allocated backing store,
 * - strideFor downsampling: exact strides plus the invariant that the sampled point count
 *   (the draw loops' `floor((n-1)/stride) + 1`) never exceeds the requested maximum,
 * - warPaletteIndex clamps every input into the 3-slot palette,
 * - readToken falls back to the literal when the style source or token is absent,
 * - the Observatory constructor degrades to a single console.warn no-op without a DOM.
 */
import { describe, expect, spyOn, test } from 'bun:test';
import {
  OBS_ENV_SERIES,
  OBS_RING_CAPACITY,
  OBS_SERIES,
  Observatory,
  readToken,
  SeriesRing,
  strideFor,
  WAR_CELLS,
  warPaletteIndex,
} from '../src/ui/observatory';
import type { ObservatorySnapshot } from '../src/ui/observatory';

describe('observatory contract constants', () => {
  test('match CONTRACTS V3.5 (10 series, 180-sample rings, 3 env lines, 10×10 war grid)', () => {
    expect(OBS_SERIES).toBe(10);
    expect(OBS_RING_CAPACITY).toBe(180);
    expect(OBS_ENV_SERIES).toBe(3);
    expect(WAR_CELLS).toBe(100);
  });
});

describe('SeriesRing', () => {
  test('rejects degenerate shapes', () => {
    expect(() => new SeriesRing(0, 10)).toThrow();
    expect(() => new SeriesRing(3, 0)).toThrow();
  });

  test('count grows to capacity, then sticks', () => {
    const ring = new SeriesRing(2, 4);
    expect(ring.count).toBe(0);
    for (let k = 1; k <= 4; k++) {
      ring.pushColumn([k, -k]);
      expect(ring.count).toBe(k);
    }
    ring.pushColumn([5, -5]);
    ring.pushColumn([6, -6]);
    expect(ring.count).toBe(4);
  });

  test('preserves order before wrapping (index 0 = oldest)', () => {
    const ring = new SeriesRing(1, 8);
    for (let k = 0; k < 5; k++) ring.pushColumn([k * 10]);
    for (let i = 0; i < 5; i++) expect(ring.at(0, i)).toBe(i * 10);
  });

  test('wraps: oldest columns are evicted first', () => {
    const ring = new SeriesRing(1, 4);
    for (let k = 0; k < 6; k++) ring.pushColumn([k]); // 0..5 pushed, capacity 4
    expect(ring.count).toBe(4);
    expect(ring.at(0, 0)).toBe(2); // 0 and 1 evicted
    expect(ring.at(0, 1)).toBe(3);
    expect(ring.at(0, 2)).toBe(4);
    expect(ring.at(0, 3)).toBe(5);
  });

  test('multi-series columns stay aligned across many wraps', () => {
    const ring = new SeriesRing(3, 5);
    for (let k = 0; k < 23; k++) ring.pushColumn([k, k * 10, k * 100]);
    expect(ring.count).toBe(5);
    for (let i = 0; i < 5; i++) {
      const k = 18 + i; // newest 5 columns are 18..22
      expect(ring.at(0, i)).toBe(k);
      expect(ring.at(1, i)).toBe(k * 10);
      expect(ring.at(2, i)).toBe(k * 100);
    }
  });

  test('copies values — the caller may reuse the input array', () => {
    const ring = new SeriesRing(2, 4);
    const scratch = [7, 8];
    ring.pushColumn(scratch);
    scratch[0] = 999;
    scratch[1] = -999;
    expect(ring.at(0, 0)).toBe(7);
    expect(ring.at(1, 0)).toBe(8);
  });

  test('missing and non-finite entries are stored as 0', () => {
    const ring = new SeriesRing(4, 2);
    ring.pushColumn([1, Number.NaN, Number.POSITIVE_INFINITY]); // 4th entry missing
    expect(ring.at(0, 0)).toBe(1);
    expect(ring.at(1, 0)).toBe(0);
    expect(ring.at(2, 0)).toBe(0);
    expect(ring.at(3, 0)).toBe(0);
  });

  test('out-of-window reads return 0 instead of stale buffer contents', () => {
    const ring = new SeriesRing(2, 4);
    ring.pushColumn([5, 6]);
    expect(ring.at(0, 1)).toBe(0); // beyond count
    expect(ring.at(0, -1)).toBe(0);
    expect(ring.at(2, 0)).toBe(0); // beyond series
    expect(ring.at(-1, 0)).toBe(0);
  });

  test('backing store is one pre-allocated Float32Array, never replaced', () => {
    const ring = new SeriesRing(OBS_SERIES, OBS_RING_CAPACITY);
    const internals = ring as unknown as { buf: Float32Array };
    expect(internals.buf).toBeInstanceOf(Float32Array);
    expect(internals.buf.length).toBe(OBS_SERIES * OBS_RING_CAPACITY);
    const before = internals.buf;
    const column = new Float32Array(OBS_SERIES);
    for (let k = 0; k < 500; k++) {
      column.fill(k);
      ring.pushColumn(column);
    }
    expect(internals.buf).toBe(before); // same object: ring reused, not regrown
    expect(ring.count).toBe(OBS_RING_CAPACITY);
  });
});

describe('strideFor (series downsampling)', () => {
  test('1 when the window already fits', () => {
    expect(strideFor(0, 10)).toBe(1);
    expect(strideFor(1, 10)).toBe(1);
    expect(strideFor(180, 180)).toBe(1);
    expect(strideFor(50, 200)).toBe(1);
  });

  test('exact and ceiled division', () => {
    expect(strideFor(180, 90)).toBe(2);
    expect(strideFor(180, 64)).toBe(3); // ceil(2.8125)
    expect(strideFor(181, 90)).toBe(3);
  });

  test('degenerate maxPoints collapses to a single sample', () => {
    expect(strideFor(100, 0)).toBe(100);
    expect(strideFor(100, 1)).toBe(100);
  });

  test('property: the draw-loop point count never exceeds maxPoints', () => {
    for (let count = 2; count <= 400; count += 7) {
      for (const maxPoints of [1, 2, 3, 8, 64, 180]) {
        const stride = strideFor(count, maxPoints);
        expect(stride).toBeGreaterThanOrEqual(1);
        // Mirror of the draw loops: k*stride samples plus a clamp to the final column.
        const points = Math.floor((count - 1) / stride) + 1;
        expect(points).toBeLessThanOrEqual(maxPoints);
        expect(points).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('warPaletteIndex (palette mapping)', () => {
  test('maps the documented states', () => {
    expect(warPaletteIndex(0)).toBe(0); // truce/none
    expect(warPaletteIndex(1)).toBe(1); // war
    expect(warPaletteIndex(2)).toBe(2); // alliance
  });

  test('clamps exotic inputs into the 3-slot palette', () => {
    expect(warPaletteIndex(-1)).toBe(0);
    expect(warPaletteIndex(0.5)).toBe(0);
    expect(warPaletteIndex(1.5)).toBe(1);
    expect(warPaletteIndex(3)).toBe(2);
    expect(warPaletteIndex(255)).toBe(2);
    expect(warPaletteIndex(Number.NaN)).toBe(0);
    expect(warPaletteIndex(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('readToken', () => {
  test('falls back when the style source is absent', () => {
    expect(readToken(null, '--color-accent', '#0ef')).toBe('#0ef');
  });

  test('falls back when the token is empty or whitespace', () => {
    const empty = { getPropertyValue: () => '' };
    const blank = { getPropertyValue: () => '   ' };
    expect(readToken(empty, '--color-tribe-0', 'hsl(0deg 85% 60%)')).toBe('hsl(0deg 85% 60%)');
    expect(readToken(blank, '--color-warn', '#fa0')).toBe('#fa0');
  });

  test('returns the trimmed token value when set', () => {
    const style = {
      getPropertyValue: (name: string) => (name === '--color-accent' ? ' #123 ' : ''),
    };
    expect(readToken(style, '--color-accent', '#0ef')).toBe('#123');
  });
});

describe('Observatory (degraded, DOM-free)', () => {
  test('constructor without a DOM warns once and every method is a safe no-op', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      expect(warn).toHaveBeenCalledTimes(1);
      const snapshot: ObservatorySnapshot = {
        phylumCounts: [12, 30, 5],
        titanLedger: [{ name: 'AETHON', energy: 10, matter: 4, entropy: 2, war: 1 }],
        warMatrix: new Uint8Array(WAR_CELLS),
        rdEnergy: 0.4,
        qEntropy: 0.77,
        trend: -3.2,
      };
      expect(() => {
        obs.push(snapshot);
        obs.draw();
        obs.push(snapshot);
        obs.draw();
      }).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1); // no further warns from push/draw
    } finally {
      warn.mockRestore();
    }
  });
});
