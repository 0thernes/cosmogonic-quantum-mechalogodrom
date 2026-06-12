import { describe, expect, test } from 'bun:test';
import { AudioAnalysis, type AudioBands } from '../src/audio/analysis';
import { AudioEngine } from '../src/audio/engine';
import { mulberry32 } from '../src/math/rng';
import type { SimState } from '../src/types';

/** Fresh SimState with v1 defaults — the engine only ever touches `songIdx`. */
function createSimState(): SimState {
  return {
    chaos: 1,
    mutations: 0,
    timeScale: 1,
    wireframe: false,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

interface FakeAnalyserHarness {
  analyser: AnalyserNode;
  /** Set the byte value (0..255) reported for each bin index on subsequent polls. */
  setSpectrum(fn: (binIndex: number) => number): void;
  /** Every Uint8Array instance handed to getByteFrequencyData, in call order. */
  polledBuffers: Uint8Array[];
}

/** Structural AnalyserNode stub: bin count + in-place byte spectrum fill, no DOM. */
function createFakeAnalyser(binCount: number): FakeAnalyserHarness {
  let spectrum: (binIndex: number) => number = () => 0;
  const polledBuffers: Uint8Array[] = [];
  const fake = {
    frequencyBinCount: binCount,
    getByteFrequencyData(array: Uint8Array): void {
      polledBuffers.push(array);
      for (let i = 0; i < array.length; i++) {
        array[i] = spectrum(i);
      }
    },
  };
  return {
    analyser: fake as unknown as AnalyserNode,
    setSpectrum: (fn) => {
      spectrum = fn;
    },
    polledBuffers,
  };
}

/** AudioAnalysis over an engine stub whose tapAnalyser() is the given function. */
function createAnalysis(tap: () => AnalyserNode | null): AudioAnalysis {
  return new AudioAnalysis({ tapAnalyser: tap } as unknown as AudioEngine);
}

/** Run `count` updates and return the (reused) bands object after the last one. */
function settle(analysis: AudioAnalysis, count: number): AudioBands {
  let bands = analysis.update();
  for (let i = 1; i < count; i++) {
    bands = analysis.update();
  }
  return bands;
}

describe('AudioEngine.tapAnalyser', () => {
  test('returns null before init() (no AudioContext yet)', () => {
    const engine = new AudioEngine(createSimState(), mulberry32(42));
    expect(engine.tapAnalyser()).toBeNull();
  });
});

describe('AudioAnalysis', () => {
  test('yields exact zeros and the reused object while audio is uninitialized', () => {
    // Real engine, never init()ed: tapAnalyser() stays null, bands stay hard zeros.
    const analysis = new AudioAnalysis(new AudioEngine(createSimState(), mulberry32(42)));
    const first = analysis.update();
    expect(first).toEqual({ bass: 0, mid: 0, treble: 0, level: 0 });
    expect(analysis.update()).toBe(first);
  });

  test('update() returns the same AudioBands instance every call (reused result)', () => {
    const h = createFakeAnalyser(128);
    const analysis = createAnalysis(() => h.analyser);
    expect(analysis.update()).toBe(analysis.update());
  });

  test('a saturated spectrum converges toward 1 and never exceeds it', () => {
    const h = createFakeAnalyser(128);
    h.setSpectrum(() => 255);
    const bands = settle(
      createAnalysis(() => h.analyser),
      200,
    );
    for (const v of [bands.bass, bands.mid, bands.treble, bands.level]) {
      expect(v).toBeGreaterThan(0.99);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('exponential smoothing: a step input rises gradually and monotonically', () => {
    const h = createFakeAnalyser(128);
    h.setSpectrum(() => 255);
    const analysis = createAnalysis(() => h.analyser);
    const v1 = analysis.update().level; // primitive snapshot — the object is reused
    const v2 = analysis.update().level;
    const v3 = analysis.update().level;
    expect(v1).toBeGreaterThan(0);
    expect(v1).toBeLessThan(1);
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
  });

  test('bands decay back to silence when the spectrum drops to zero', () => {
    const h = createFakeAnalyser(128);
    h.setSpectrum(() => 255);
    const analysis = createAnalysis(() => h.analyser);
    settle(analysis, 50);
    h.setSpectrum(() => 0);
    const bands = settle(analysis, 200);
    expect(bands.level).toBeLessThan(0.01);
    expect(bands.bass).toBeLessThan(0.01);
  });

  test('bass-only energy raises bass, leaves mid/treble at zero', () => {
    // At 128 bins the band edges are bass [0,4), mid [4,32), treble [32,128).
    const h = createFakeAnalyser(128);
    h.setSpectrum((i) => (i < 4 ? 255 : 0));
    const bands = settle(
      createAnalysis(() => h.analyser),
      200,
    );
    expect(bands.bass).toBeGreaterThan(0.99);
    expect(bands.mid).toBe(0);
    expect(bands.treble).toBe(0);
    expect(bands.level).toBeCloseTo(4 / 128, 5);
  });

  test('mid-only energy raises mid, leaves bass/treble at zero', () => {
    const h = createFakeAnalyser(128);
    h.setSpectrum((i) => (i >= 4 && i < 32 ? 255 : 0));
    const bands = settle(
      createAnalysis(() => h.analyser),
      200,
    );
    expect(bands.mid).toBeGreaterThan(0.99);
    expect(bands.bass).toBe(0);
    expect(bands.treble).toBe(0);
  });

  test('treble-only energy raises treble, leaves bass/mid at zero', () => {
    const h = createFakeAnalyser(128);
    h.setSpectrum((i) => (i >= 32 ? 255 : 0));
    const bands = settle(
      createAnalysis(() => h.analyser),
      200,
    );
    expect(bands.treble).toBeGreaterThan(0.99);
    expect(bands.bass).toBe(0);
    expect(bands.mid).toBe(0);
  });

  test('the FFT byte buffer is pre-allocated and reused across updates', () => {
    const h = createFakeAnalyser(128);
    const analysis = createAnalysis(() => h.analyser);
    analysis.update();
    analysis.update();
    analysis.update();
    expect(h.polledBuffers.length).toBe(3);
    expect(h.polledBuffers.at(0)?.length).toBe(128);
    expect(h.polledBuffers.at(1)).toBe(h.polledBuffers.at(0) as Uint8Array);
    expect(h.polledBuffers.at(2)).toBe(h.polledBuffers.at(0) as Uint8Array);
  });

  test('acquires the analyser lazily once the engine initializes mid-session', () => {
    let available: AnalyserNode | null = null;
    const analysis = createAnalysis(() => available);
    expect(analysis.update().level).toBe(0);
    const h = createFakeAnalyser(128);
    h.setSpectrum(() => 255);
    available = h.analyser; // "first user gesture" happens now
    expect(analysis.update().level).toBeGreaterThan(0);
  });

  test('rebinds the buffer once when the analyser reports a different bin count', () => {
    const h = createFakeAnalyser(64);
    h.setSpectrum(() => 255);
    const analysis = createAnalysis(() => h.analyser);
    const bands = settle(analysis, 200);
    expect(h.polledBuffers.at(0)?.length).toBe(64);
    expect(h.polledBuffers.at(-1)).toBe(h.polledBuffers.at(0) as Uint8Array);
    expect(bands.level).toBeGreaterThan(0.99);
    expect(bands.level).toBeLessThanOrEqual(1);
  });
});
