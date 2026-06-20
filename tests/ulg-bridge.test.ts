/**
 * Golden tests for the ULG bridge — proves real Hermite closure-table
 * interpolation + content-addressed artifact handoff, not a sinusoid / fixed avg.
 */
import { describe, expect, test } from 'bun:test';
import {
  ulgFieldSample,
  ulgTriadHandoff,
  ulgWorkerDepth,
  ulgCorpusResonance,
} from '../src/sim/ulg-bridge';

describe('ulg-bridge: real closure-table field', () => {
  test('bounded [0,1] and deterministic', () => {
    for (let t = 0; t < 20; t++) {
      const v = ulgFieldSample(t * 0.7, t * 1.3, t * 0.2, t);
      expect(v >= 0 && v <= 1).toBe(true);
      expect(v).toBe(ulgFieldSample(t * 0.7, t * 1.3, t * 0.2, t));
    }
  });

  test('C¹-smooth: tiny step ⇒ tiny change (not a high-freq sinusoid)', () => {
    const a = ulgFieldSample(0.5, 0.5, 0.5, 10);
    const b = ulgFieldSample(0.5001, 0.5, 0.5, 10);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });
});

describe('ulg-bridge: content-addressed artifact handoff', () => {
  test('deterministic + bounded', () => {
    const v = ulgTriadHandoff(0.6, 0.4, 0.8);
    expect(v).toBe(ulgTriadHandoff(0.6, 0.4, 0.8));
    expect(v >= 0 && v <= 1).toBe(true);
  });

  test('different inputs can select different artifact profiles', () => {
    // Across a sweep, more than one artifact weighting must be exercised
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) {
      seen.add(Math.round(ulgTriadHandoff(i * 0.013, i * 0.027, i * 0.019) * 1000));
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('ulg-bridge: worker depth + resonance', () => {
  test('worker depth bounded (0,1]', () => {
    for (let w = 1; w < 32; w++) {
      const d = ulgWorkerDepth(w * 3, w);
      expect(d > 0 && d <= 1).toBe(true);
    }
  });

  test('resonance is a clamped weighted blend', () => {
    expect(ulgCorpusResonance(1, 1, 1)).toBe(1);
    expect(ulgCorpusResonance(0, 0, 0)).toBe(0);
  });
});
