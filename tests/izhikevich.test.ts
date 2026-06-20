/**
 * izhikevich.test.ts — behavioral-oracle tests for the REAL Izhikevich neuron
 * (src/math/izhikevich.ts). ADR-F stub-honesty: these assert real neurophysiology
 * a placeholder cannot fake — quiescence at rest, spiking above threshold, a
 * monotone f–I curve, exact post-spike reset, regime ordering (fast-spiking fires
 * faster than regular-spiking), finite dynamics, and determinism.
 */
import { describe, expect, test } from 'bun:test';
import {
  izhStep,
  izhRun,
  izhRest,
  firingRateHz,
  IZH_RS,
  IZH_FS,
  IZH_THRESHOLD,
} from '../src/math/izhikevich';

describe('membrane dynamics', () => {
  test('quiescent at rest with no input (no spikes)', () => {
    expect(izhRun(IZH_RS, 0, 300).spikes.length).toBe(0);
  });

  test('fires tonically above rheobase', () => {
    expect(izhRun(IZH_RS, 10, 400).spikes.length).toBeGreaterThan(2);
  });

  test('post-spike reset: membrane returns exactly to c on every spike', () => {
    const { spikes, trace } = izhRun(IZH_RS, 12, 400);
    expect(spikes.length).toBeGreaterThan(0);
    for (const t of spikes) expect(trace[t]).toBe(IZH_RS.c);
  });

  test('the recorded trace never exceeds threshold and stays finite', () => {
    const { trace } = izhRun(IZH_RS, 15, 400);
    for (const v of trace) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeLessThan(IZH_THRESHOLD);
    }
  });
});

describe('input–output', () => {
  test('f–I curve is monotone: more current ⇒ at least as many spikes', () => {
    const low = izhRun(IZH_RS, 5, 500).spikes.length;
    const mid = izhRun(IZH_RS, 12, 500).spikes.length;
    const high = izhRun(IZH_RS, 25, 500).spikes.length;
    expect(mid).toBeGreaterThanOrEqual(low);
    expect(high).toBeGreaterThanOrEqual(mid);
  });

  test('fast-spiking interneuron fires faster than regular-spiking at equal drive', () => {
    const rs = izhRun(IZH_RS, 15, 500).spikes.length;
    const fs = izhRun(IZH_FS, 15, 500).spikes.length;
    expect(fs).toBeGreaterThan(rs);
  });

  test('firingRateHz converts spike count to Hz over the tick window', () => {
    expect(firingRateHz([0, 500], 1000)).toBe(2);
    expect(firingRateHz([], 1000)).toBe(0);
  });
});

describe('determinism', () => {
  test('same parameters + current ⇒ identical spike train', () => {
    expect(izhRun(IZH_RS, 10, 300).spikes).toEqual(izhRun(IZH_RS, 10, 300).spikes);
  });

  test('izhRest gives v = c and u = b·c', () => {
    const s = izhRest(IZH_RS);
    expect(s.v).toBe(IZH_RS.c);
    expect(s.u).toBe(IZH_RS.b * IZH_RS.c);
  });

  test('a single step from rest under strong drive moves the membrane upward', () => {
    const r = izhStep(IZH_RS, izhRest(IZH_RS), 20);
    expect(r.state.v).toBeGreaterThan(IZH_RS.c);
  });
});
