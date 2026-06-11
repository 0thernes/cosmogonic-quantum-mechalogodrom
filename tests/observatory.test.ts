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
  histogramBins,
  OBS_CANVAS_PER_PAGE,
  OBS_ENV_SERIES,
  OBS_HIST_BINS,
  OBS_PAGE_COUNT,
  OBS_RING_CAPACITY,
  OBS_SERIES,
  OBS_STAT_SERIES,
  OBS_VARIANCE_WINDOW,
  Observatory,
  readToken,
  SeriesRing,
  shannonEntropy,
  strideFor,
  WAR_CELLS,
  warPaletteIndex,
  windowMeanStd,
} from '../src/ui/observatory';
import type { MeanStd, ObservatorySnapshot } from '../src/ui/observatory';
import { mean, sampleStandardDeviation } from 'simple-statistics';

describe('observatory contract constants', () => {
  test('match CONTRACTS V3.5 (10 series, 180-sample rings, 3 env lines, 10×10 war grid)', () => {
    expect(OBS_SERIES).toBe(10);
    expect(OBS_RING_CAPACITY).toBe(180);
    expect(OBS_ENV_SERIES).toBe(3);
    expect(WAR_CELLS).toBe(100);
  });

  test('match CONTRACTS V4.3 (4 pages × 4 canvases, variance page shape)', () => {
    expect(OBS_PAGE_COUNT).toBe(4);
    expect(OBS_CANVAS_PER_PAGE).toBe(4);
    expect(OBS_STAT_SERIES).toBe(3); // population / energy / links
    expect(OBS_HIST_BINS).toBeGreaterThanOrEqual(2);
    expect(OBS_VARIANCE_WINDOW).toBeGreaterThanOrEqual(2);
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

describe('windowMeanStd (page-1 rolling mean±σ, V4.3)', () => {
  test('empty window yields zero mean and zero σ', () => {
    const ring = new SeriesRing(1, 8);
    const out: MeanStd = { mean: 1, std: 1 };
    windowMeanStd(ring, 0, 0, 4, [], out);
    expect(out.mean).toBe(0);
    expect(out.std).toBe(0);
  });

  test('single-sample window has the value as mean and zero σ (no n−1 throw)', () => {
    const ring = new SeriesRing(1, 8);
    ring.pushColumn([42]);
    const out: MeanStd = { mean: 0, std: 0 };
    windowMeanStd(ring, 0, ring.count, 4, [], out);
    expect(out.mean).toBe(42);
    expect(out.std).toBe(0);
  });

  test('matches simple-statistics over the trailing window', () => {
    const ring = new SeriesRing(1, 16);
    const all: number[] = [];
    for (let k = 0; k < 12; k++) {
      const v = k * k - 3 * k + 1;
      ring.pushColumn([v]);
      all.push(v);
    }
    const win = 5;
    const tail = all.slice(all.length - win);
    const out: MeanStd = { mean: 0, std: 0 };
    windowMeanStd(ring, 0, ring.count, win, [], out);
    expect(out.mean).toBeCloseTo(mean(tail), 10);
    expect(out.std).toBeCloseTo(sampleStandardDeviation(tail), 10);
  });

  test('window clamps to the available sample count', () => {
    const ring = new SeriesRing(1, 16);
    ring.pushColumn([2]);
    ring.pushColumn([4]);
    ring.pushColumn([6]);
    const out: MeanStd = { mean: 0, std: 0 };
    windowMeanStd(ring, 0, ring.count, 999, [], out);
    expect(out.mean).toBeCloseTo(mean([2, 4, 6]), 10);
    expect(out.std).toBeCloseTo(sampleStandardDeviation([2, 4, 6]), 10);
  });

  test('reuses the scratch array and result object (no allocation per call)', () => {
    const ring = new SeriesRing(1, 8);
    for (let k = 0; k < 6; k++) ring.pushColumn([k]);
    const tmp: number[] = [];
    const out: MeanStd = { mean: 0, std: 0 };
    const r1 = windowMeanStd(ring, 0, ring.count, 4, tmp, out);
    const r2 = windowMeanStd(ring, 0, ring.count, 4, tmp, out);
    expect(r1).toBe(out);
    expect(r2).toBe(out);
  });
});

describe('shannonEntropy (phylum diversity, V4.3)', () => {
  test('empty / single-occupied distribution has no diversity', () => {
    expect(shannonEntropy([0, 0, 0], 3)).toBe(0);
    expect(shannonEntropy([5, 0, 0], 3)).toBe(0);
  });

  test('uniform distribution reaches the normalized maximum of 1', () => {
    expect(shannonEntropy([4, 4, 4, 4], 4)).toBeCloseTo(1, 12);
    expect(shannonEntropy([7, 7], 2)).toBeCloseTo(1, 12);
  });

  test('skewed distribution lands strictly between 0 and 1', () => {
    const h = shannonEntropy([90, 5, 5], 3);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
  });

  test('only the first `series` categories are counted', () => {
    // The trailing categories are ignored, so this reads as a single occupied bucket.
    expect(shannonEntropy([10, 10, 10], 1)).toBe(0);
    expect(shannonEntropy([10, 10, 10], 2)).toBeCloseTo(1, 12);
  });

  test('negative and non-finite counts are treated as absent', () => {
    expect(shannonEntropy([5, -3, Number.NaN, Number.POSITIVE_INFINITY], 4)).toBe(0);
    expect(shannonEntropy([5, 5, -3, Number.NaN], 4)).toBeCloseTo(1, 12);
  });

  test('result is normalized into [0, 1] for many random distributions', () => {
    for (let t = 0; t < 50; t++) {
      const counts: number[] = [];
      for (let s = 0; s < OBS_SERIES; s++) counts.push(Math.floor(((t * 31 + s * 7) % 17) * 3));
      const h = shannonEntropy(counts, OBS_SERIES);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe('histogramBins (population histogram, V4.3)', () => {
  test('empty window leaves all bins at 0 and reports a zero peak', () => {
    const ring = new SeriesRing(1, 8);
    const out = new Float32Array(4);
    out.fill(9);
    expect(histogramBins(ring, 0, 0, 8, out)).toBe(0);
    for (const c of out) expect(c).toBe(0);
  });

  test('total binned count equals the number of samples taken', () => {
    const ring = new SeriesRing(1, 64);
    for (let k = 0; k < 40; k++) ring.pushColumn([(k * 13) % 50]);
    const out = new Float32Array(OBS_HIST_BINS);
    histogramBins(ring, 0, ring.count, 25, out);
    let total = 0;
    for (const c of out) total += c;
    expect(total).toBe(25); // last 25 of 40 samples
  });

  test('peak return value matches the tallest bin', () => {
    const ring = new SeriesRing(1, 16);
    for (let k = 0; k < 10; k++) ring.pushColumn([0]); // all identical → flat window
    const out = new Float32Array(8);
    const peak = histogramBins(ring, 0, ring.count, 10, out);
    expect(peak).toBe(10); // flat window dumps everything into the last bin
    expect(out[out.length - 1]).toBe(10);
    for (let b = 0; b < out.length - 1; b++) expect(out[b]).toBe(0);
  });

  test('values spread across the [min, max] span land in distinct bins', () => {
    const ring = new SeriesRing(1, 16);
    for (let k = 0; k < 4; k++) ring.pushColumn([k]); // 0,1,2,3 over 4 bins
    const out = new Float32Array(4);
    histogramBins(ring, 0, ring.count, 4, out);
    // min=0,max=3,span=3: 0→bin0, 1→bin1 (t=.33→1.33), 2→bin2, 3→clamped to bin3.
    expect(Array.from(out)).toEqual([1, 1, 1, 1]);
  });

  test('reuses the same backing buffer (zeroed, never reallocated)', () => {
    const ring = new SeriesRing(1, 16);
    for (let k = 0; k < 8; k++) ring.pushColumn([k]);
    const out = new Float32Array(OBS_HIST_BINS);
    histogramBins(ring, 0, ring.count, 8, out);
    const firstTotal = out.reduce((a, b) => a + b, 0);
    expect(firstTotal).toBe(8);
    histogramBins(ring, 0, ring.count, 3, out); // fewer samples → buffer must be re-zeroed
    const secondTotal = out.reduce((a, b) => a + b, 0);
    expect(secondTotal).toBe(3);
  });
});

describe('Observatory multi-page (degraded, DOM-free, V4.3)', () => {
  const fullSnapshot: ObservatorySnapshot = {
    phylumCounts: [12, 30, 5, 8, 0, 3, 19, 7, 1, 22],
    titanLedger: [
      { name: 'AETHON', energy: 10, matter: 4, entropy: 2, war: 1 },
      { name: 'NYX', energy: 7, matter: 9, entropy: 1, war: 0 },
    ],
    warMatrix: new Uint8Array(WAR_CELLS).fill(1),
    rdEnergy: 0.4,
    qEntropy: 0.77,
    trend: -3.2,
    entities: 107,
    energy: 540,
    links: 88,
    sentience: 0.63,
  };

  test('each unavailable page warns once on first draw; push/draw stay safe no-ops', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      expect(warn).toHaveBeenCalledTimes(0); // construction is silent; warns are per-page on draw
      expect(() => {
        for (let p = 0; p <= 3; p++) {
          obs.setPage(p as 0 | 1 | 2 | 3);
          obs.push(fullSnapshot);
          obs.draw();
          obs.push(fullSnapshot);
          obs.draw(); // second draw of the same page must NOT warn again
        }
      }).not.toThrow();
      // Exactly one warn per missing page (4 pages, each latched after its first draw).
      expect(warn).toHaveBeenCalledTimes(OBS_PAGE_COUNT);
    } finally {
      warn.mockRestore();
    }
  });

  test('setPage selects the active page and ignores out-of-range values', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      expect(obs.activePage).toBe(0);
      obs.setPage(2);
      expect(obs.activePage).toBe(2);
      obs.setPage(7 as unknown as 0 | 1 | 2 | 3); // out of range → unchanged
      expect(obs.activePage).toBe(2);
      obs.setPage(1);
      expect(obs.activePage).toBe(1);
    } finally {
      warn.mockRestore();
    }
  });

  test('a V3.5 snapshot (no V4 scalars) still pushes without throwing', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      const legacy: ObservatorySnapshot = {
        phylumCounts: [1, 2, 3],
        titanLedger: [{ name: 'OLD', energy: 1, matter: 1, entropy: 1, war: 0 }],
        warMatrix: new Uint8Array(WAR_CELLS),
        rdEnergy: 0.1,
        qEntropy: 0.5,
        trend: 0,
      };
      expect(() => {
        obs.push(legacy);
        obs.setPage(1);
        obs.draw();
        obs.setPage(3);
        obs.draw();
      }).not.toThrow();
    } finally {
      warn.mockRestore();
    }
  });
});
