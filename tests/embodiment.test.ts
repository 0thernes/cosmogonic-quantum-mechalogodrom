/**
 * Embodiment (Butlin AE-2) — proves the forward body-model genuinely LEARNS the sensory consequence of
 * actions and reports rising contingency for a predictable body (output↔input contingency modelled
 * inside think()). The super-mind reproducibility test covers its live integration.
 */
import { describe, expect, test } from 'bun:test';
import { Embodiment } from '../src/sim/embodiment';

describe('embodiment — AE-2 forward body-model', () => {
  test('a predictable body: contingency rises and prediction error falls toward 0', () => {
    const e = new Embodiment(7, 4, 123);
    const sensory = [0, 0, 0, 0];
    const trueDelta = [0.03, -0.02, 0.01, 0.04]; // plan 2 always causes this consistent sensory change
    let contingency = 0;
    for (let t = 0; t < 300; t++) {
      contingency = e.step(2, sensory);
      for (let j = 0; j < 4; j++) sensory[j] = (sensory[j] ?? 0) + (trueDelta[j] ?? 0); // world response
    }
    expect(contingency).toBeGreaterThan(0.7); // it learned its body is controllable
    expect(e.snapshot().predictionError).toBeLessThan(0.01); // the body model converged
  });

  test('contingency stays bounded [0,1] throughout', () => {
    const e = new Embodiment(7, 6, 7);
    const sensory = [0.2, 0.5, 0.1, 0.9, 0.3, 0.6];
    for (let t = 0; t < 100; t++) {
      const c = e.step(t % 7, sensory);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
      for (let j = 0; j < 6; j++) sensory[j] = (sensory[j] ?? 0) + (((t + j) % 3) - 1) * 0.01;
    }
  });

  test('deterministic — same seed + same action/sensory stream ⇒ identical snapshot', () => {
    const a = new Embodiment(7, 4, 99);
    const b = new Embodiment(7, 4, 99);
    const sa = [0, 0, 0, 0];
    const sb = [0, 0, 0, 0];
    for (let t = 0; t < 50; t++) {
      const p = t % 7;
      a.step(p, sa);
      b.step(p, sb);
      for (let j = 0; j < 4; j++) {
        sa[j] = (sa[j] ?? 0) + 0.01 * p;
        sb[j] = (sb[j] ?? 0) + 0.01 * p;
      }
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.snapshot().steps).toBe(50);
  });
});
