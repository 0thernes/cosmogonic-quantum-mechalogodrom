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
  fmtCompact,
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
  plotRect,
  readToken,
  rosterLayout,
  SeriesRing,
  shannonEntropy,
  strideFor,
  truncateToWidth,
  WAR_CELLS,
  warPaletteIndex,
  windowMeanStd,
} from '../src/ui/observatory';
import type { MeanStd, ObservatorySnapshot, PlotRect } from '../src/ui/observatory';
import { REL_TRUCE, REL_ALLIANCE, REL_WAR } from '../src/sim/titans';
import { mean, sampleStandardDeviation } from 'simple-statistics';

describe('observatory contract constants', () => {
  test('match CONTRACTS V3.5 (20 series, 180-sample rings, 3 env lines, 20×20 war grid)', () => {
    expect(OBS_SERIES).toBe(20);
    expect(OBS_RING_CAPACITY).toBe(180);
    expect(OBS_ENV_SERIES).toBe(3);
    expect(WAR_CELLS).toBe(400);
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
    expect(warPaletteIndex(1)).toBe(1); // alliance
    expect(warPaletteIndex(2)).toBe(2); // war
  });

  test('the palette-slot encoding matches the producer (titans REL_*) — locks against re-inversion', () => {
    // The observatory once inverted this: it painted alliances red-as-war and wars teal-as-ally, and
    // swapped the war/ally tallies. The consumer MUST speak the producer's convention. If either the
    // titans REL_* constants or warPaletteIndex drifts, this fails.
    expect(warPaletteIndex(REL_TRUCE)).toBe(0);
    expect(warPaletteIndex(REL_ALLIANCE)).toBe(1); // slot 1 = alliance → teal (accent)
    expect(warPaletteIndex(REL_WAR)).toBe(2); // slot 2 = war → red (danger)
    // types.ts + viz3d.ts consume the same 0/1/2 = truce/alliance/war encoding.
    expect([REL_TRUCE, REL_ALLIANCE, REL_WAR]).toEqual([0, 1, 2]);
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

describe('fmtCompact (in-canvas value readouts, V5.1)', () => {
  test('small integers print verbatim', () => {
    expect(fmtCompact(0)).toBe('0');
    expect(fmtCompact(7)).toBe('7');
    expect(fmtCompact(999)).toBe('999');
    expect(fmtCompact(-42)).toBe('-42');
  });

  test('thousands and millions collapse to a 1-decimal suffix', () => {
    expect(fmtCompact(1000)).toBe('1.0k');
    expect(fmtCompact(1500)).toBe('1.5k');
    expect(fmtCompact(12_345)).toBe('12.3k');
    expect(fmtCompact(2_500_000)).toBe('2.5M');
    expect(fmtCompact(-3400)).toBe('-3.4k');
  });

  test('fractional values keep up to the requested decimals, trailing zeros trimmed', () => {
    expect(fmtCompact(0.5)).toBe('0.5');
    expect(fmtCompact(0.25)).toBe('0.25');
    expect(fmtCompact(0.2)).toBe('0.2');
    expect(fmtCompact(3.1)).toBe('3.1');
    // Below 100 but with a clean integer value renders without a decimal point.
    expect(fmtCompact(50)).toBe('50');
    // Custom precision.
    expect(fmtCompact(0.123, 1)).toBe('0.1');
  });

  test('values in [100, 1000) round to whole numbers', () => {
    expect(fmtCompact(100)).toBe('100');
    expect(fmtCompact(523.7)).toBe('524');
  });

  test('non-finite inputs render the em-dash placeholder', () => {
    expect(fmtCompact(Number.NaN)).toBe('—');
    expect(fmtCompact(Number.POSITIVE_INFINITY)).toBe('—');
    expect(fmtCompact(Number.NEGATIVE_INFINITY)).toBe('—');
  });
});

describe('plotRect (V6.1 title-band + padding scheme)', () => {
  test('insets the plot body below the title band and by PAD on the other three sides', () => {
    const r = plotRect(400, 200);
    // Top is the reserved title band (30 backing px); left/right/bottom are inset by PAD (12).
    expect(r.top).toBe(30);
    expect(r.left).toBe(12);
    expect(r.right).toBe(400 - 12);
    expect(r.bottom).toBe(200 - 12);
    expect(r.width).toBe(r.right - r.left);
    expect(r.height).toBe(r.bottom - r.top);
    // The body never overlaps the title band: its top edge sits AT the band, never above it.
    expect(r.top).toBeGreaterThan(0);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });

  test('degenerate (tiny) canvases clamp to a well-ordered zero-area rect, never negative', () => {
    const r = plotRect(8, 8);
    expect(r.right).toBeGreaterThanOrEqual(r.left);
    expect(r.bottom).toBeGreaterThanOrEqual(r.top);
    expect(r.width).toBeGreaterThanOrEqual(0);
    expect(r.height).toBeGreaterThanOrEqual(0);
  });

  test('the readout band (above top) and the plot body do not share vertical space', () => {
    // Any y the title/readout uses is < top; any y the plot uses is in [top, bottom].
    const r = plotRect(300, 144);
    const titleBaselineY = 19; // matches the title()/readout() draw baselines
    expect(titleBaselineY).toBeLessThan(r.top);
  });
});

describe('rosterLayout (V6.1 c11 roster / c14 resource-bar rows)', () => {
  const tall: PlotRect = plotRect(300, 460); // 20 rows now require 2 columns to preserve row height
  const short: PlotRect = plotRect(300, 120); // very short regions still stay compact

  test('a tall region uses two columns so all 20 titan rows remain legible', () => {
    const lay = rosterLayout(tall, OBS_SERIES, 34, 6);
    expect(lay.cols).toBe(2);
    expect(lay.rows).toBe(Math.ceil(OBS_SERIES / 2));
    expect(lay.cellW).toBeCloseTo(tall.width / 2, 10);
    expect(lay.cellH).toBeCloseTo(tall.height / Math.ceil(OBS_SERIES / 2), 10);
    // Every row clears the minimum height so a name + value never have to overlap.
    expect(lay.cellH).toBeGreaterThanOrEqual(34);
    expect(lay.innerH).toBeCloseTo(lay.cellH - 6, 10);
    expect(lay.innerH).toBeGreaterThan(0);
  });

  test('a short region stays in a compact 2-column grid so 20 rows still fit', () => {
    const lay = rosterLayout(short, OBS_SERIES, 34, 6);
    expect(lay.cols).toBe(2);
    expect(lay.rows).toBe(Math.ceil(OBS_SERIES / 2)); // 10 rows per column
    expect(lay.cellW).toBeCloseTo(short.width / 2, 10);
    // Two columns double the per-row height vs. the single-column attempt.
    const single = short.height / OBS_SERIES;
    expect(lay.cellH).toBeGreaterThan(single);
  });

  test('innerH is always positive and gap is reserved inside each cell', () => {
    for (const region of [tall, short, plotRect(220, 72)]) {
      const lay = rosterLayout(region, OBS_SERIES, 34, 6);
      expect(lay.innerH).toBeGreaterThan(0);
      expect(lay.innerH).toBeLessThanOrEqual(lay.cellH);
      expect(lay.cols === 1 || lay.cols === 2).toBe(true);
    }
  });

  test('n is clamped to at least 1 (no divide-by-zero on an empty roster)', () => {
    const lay = rosterLayout(tall, 0, 34, 6);
    expect(lay.rows).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(lay.cellH)).toBe(true);
  });
});

describe('truncateToWidth (V6.1 ellipsis truncation, name never collides with value)', () => {
  // A deterministic fixed-advance measurer: every glyph is `unit` px wide.
  const measurer = (unit: number): Pick<CanvasRenderingContext2D, 'measureText'> => ({
    measureText: (s: string) => ({ width: s.length * unit }) as TextMetrics,
  });

  test('returns the text unchanged when it already fits', () => {
    const x = measurer(10);
    expect(truncateToWidth(x, 'NYX', 100)).toBe('NYX');
  });

  test('appends an ellipsis and drops characters when it overflows', () => {
    const x = measurer(10);
    // 'AETHON' is 60px; budget 45px fits 'AET…' (4 glyphs = 40px) but not 'AETH…' (50px).
    const out = truncateToWidth(x, 'AETHON', 45);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThan('AETHON'.length + 1);
    expect(out.length * 10).toBeLessThanOrEqual(45);
  });

  test('empty string or non-positive width yields an empty string', () => {
    const x = measurer(10);
    expect(truncateToWidth(x, '', 100)).toBe('');
    expect(truncateToWidth(x, 'NYX', 0)).toBe('');
    expect(truncateToWidth(x, 'NYX', -5)).toBe('');
  });

  test('a width too small for even one glyph collapses to the bare ellipsis', () => {
    const x = measurer(10);
    expect(truncateToWidth(x, 'AETHON', 5)).toBe('…');
  });
});

describe('Observatory boot-seed priming (V5.1, non-blank from first push)', () => {
  // Inspect the private rings to assert the first push lands TWO columns (so every
  // ≥2-sample timeline/area/band chart has a segment to draw immediately).
  interface RingPeek {
    readonly count: number;
    at(s: number, i: number): number;
  }
  interface ObsInternals {
    phylumRing: RingPeek;
    statRing: RingPeek;
    fluxRing: RingPeek;
    diversityRing: RingPeek;
  }

  test('the first push seeds a duplicate opening column across every page ring', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      const inner = obs as unknown as ObsInternals;
      expect(inner.phylumRing.count).toBe(0);
      obs.push({
        phylumCounts: [4, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        titanLedger: [{ name: 'SEED', energy: 3, matter: 2, entropy: 1, war: 0 }],
        warMatrix: new Uint8Array(WAR_CELLS),
        rdEnergy: 0.2,
        qEntropy: 0.5,
        trend: 1,
        entities: 10,
        energy: 30,
        links: 5,
      });
      // One real push primed a second identical column: count is 2, both columns equal.
      expect(inner.phylumRing.count).toBe(2);
      expect(inner.statRing.count).toBe(2);
      expect(inner.diversityRing.count).toBe(2);
      expect(inner.phylumRing.at(0, 0)).toBe(inner.phylumRing.at(0, 1));
      expect(inner.statRing.at(0, 0)).toBe(inner.statRing.at(0, 1));
      expect(inner.statRing.at(0, 0)).toBe(10); // entities → population series
      // The replay records a zero birth/death flux (population unchanged on the seed frame).
      expect(inner.fluxRing.count).toBe(2);
      expect(inner.fluxRing.at(0, 1)).toBe(0);
      expect(inner.fluxRing.at(1, 1)).toBe(0);
    } finally {
      warn.mockRestore();
    }
  });

  test('subsequent pushes add a single column each (priming only fires once)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const obs = new Observatory();
      const inner = obs as unknown as ObsInternals;
      const snap: ObservatorySnapshot = {
        phylumCounts: [1, 1, 1],
        titanLedger: [{ name: 'X', energy: 1, matter: 1, entropy: 1, war: 0 }],
        warMatrix: new Uint8Array(WAR_CELLS),
        rdEnergy: 0,
        qEntropy: 0,
        trend: 0,
      };
      obs.push(snap); // primes → 2
      expect(inner.phylumRing.count).toBe(2);
      obs.push(snap); // +1 → 3
      obs.push(snap); // +1 → 4
      expect(inner.phylumRing.count).toBe(4);
    } finally {
      warn.mockRestore();
    }
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
