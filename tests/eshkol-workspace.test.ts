/**
 * ESHKOL WORKSPACE — Global Workspace Theory tick tests.
 *
 * Pins the fix for a real defect: with the old absolute ignition threshold (0.28..0.63) the workspace
 * competition over 8 near-uniform specialists could NEVER clear it — ignition fired on 0/1600 real archon
 * beats, so the core GWT event (a specialist winning GLOBAL ACCESS) was dead everywhere it is used (petri,
 * digital-biologics). The threshold is now relative to uniform (1/n) with a sharper softmax, so ignition
 * is a SELECTIVE, real event. These tests guard both failure modes — never-ignite AND always-ignite — so a
 * future recalibration can't silently break it again. Pure/deterministic (no rng/clock/DOM).
 */
import { describe, expect, test } from 'bun:test';
import { eshkolWorkspaceTick, workspaceSalience } from '../src/sim/eshkol-workspace';
import { substrateVectorForArchon } from '../src/sim/tsotchke-registry';

describe('eshkol-workspace: real GWT ignition', () => {
  test('ignition is SELECTIVE over the real archon ensemble — fires sometimes, not never, not always', () => {
    let ignited = 0;
    let total = 0;
    for (let a = 0; a < 25; a++) {
      const sub = substrateVectorForArchon(a);
      for (let beat = 0; beat < 64; beat++) {
        if (eshkolWorkspaceTick(sub, beat).ignited) ignited++;
        total++;
      }
    }
    const rate = ignited / total;
    // the whole point: NOT the old dead 0%, and not a degenerate always-on workspace
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.75);
  });

  test('all tick fields are finite and in range; access ∈ [0,1], entropy ∈ [0,1], spotlight a valid index', () => {
    for (let a = 0; a < 25; a += 5) {
      const sub = substrateVectorForArchon(a);
      for (let beat = 0; beat < 8; beat++) {
        const ws = eshkolWorkspaceTick(sub, beat);
        for (const v of [
          ws.broadcastGain,
          ws.phiCoupling,
          ws.logicWeight,
          ws.inferenceWeight,
          ws.ignitionThreshold,
          ws.entropy,
          ws.access,
        ]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        expect(ws.spotlight).toBeGreaterThanOrEqual(0);
        expect(ws.spotlight).toBeLessThanOrEqual(8);
        expect(typeof ws.ignited).toBe('boolean');
        // when a specialist ignites, it must actually have cleared the threshold (definitional)
        if (ws.ignited) expect(ws.access).toBeGreaterThanOrEqual(ws.ignitionThreshold - 1e-9);
      }
    }
  });

  test('deterministic: same substrate + beat ⇒ bit-identical tick', () => {
    const sub = substrateVectorForArchon(7);
    expect(JSON.stringify(eshkolWorkspaceTick(sub, 21))).toBe(
      JSON.stringify(eshkolWorkspaceTick(sub, 21)),
    );
  });

  test('workspaceSalience returns a normalized distribution over k specialists', () => {
    const ws = eshkolWorkspaceTick(substrateVectorForArchon(2), 5);
    const w = workspaceSalience(ws, 4);
    expect(w.length).toBe(4);
    const sum = w.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6); // softmax normalizes
    for (const v of w) expect(v).toBeGreaterThanOrEqual(0);
  });
});
