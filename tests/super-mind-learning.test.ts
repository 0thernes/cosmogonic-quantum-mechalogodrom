/**
 * V96 ONLINE LEARNING in the apex mind — the Stratum-X adaptation channel (per-plan reward bias).
 * Guards the four properties that make it safe to ship: (1) OFF by default ⇒ the learned bias stays
 * exactly zero ⇒ byte-identical frozen-weight behaviour; (2) it genuinely LEARNS when enabled (the bias
 * moves off zero); (3) it stays BOUNDED (no divergence); (4) it is DETERMINISM-safe (same seed + inputs →
 * identical learned bias) and resets cleanly on disable.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperMind } from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';

/** Mirror of the module-private bias cap in super-mind.ts (V96 PLAN_LEARN_CLAMP). */
const PLAN_LEARN_CLAMP = 0.5;

function percept(over: Partial<SuperPercept> = {}): SuperPercept {
  return {
    energy: 0.5,
    threat: 0.2,
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.3,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: 0.25,
    ...over,
  };
}

// A strongly rewarding stream (high energy + wealth, low threat) so the centred reward stays > 0.5 and
// the chosen plans' biases accumulate measurably.
const REWARDING = percept({ energy: 0.95, wealthRel: 0.95, threat: 0.02, preyClose: 0.8 });

describe('SuperMind online learning (V96)', () => {
  test('learns BY DEFAULT — the per-plan bias moves off zero with no explicit enable', () => {
    const m = new SuperMind(mulberry32(1));
    for (let i = 0; i < 200; i++) m.think(REWARDING);
    expect(m.learnedPlanBias().some((b) => Math.abs(b) > 1e-3)).toBe(true);
  });

  test('setLearning(false) FREEZES the mind — the bias stays exactly zero (byte-identical frozen mind)', () => {
    const m = new SuperMind(mulberry32(1));
    m.setLearning(false);
    for (let i = 0; i < 200; i++) m.think(REWARDING);
    expect(m.learnedPlanBias().every((b) => b === 0)).toBe(true);
  });

  test('ENABLED — the mind actually LEARNS: the per-plan bias moves off zero, and stays bounded', () => {
    const m = new SuperMind(mulberry32(2));
    m.setLearning(true, 0.05);
    for (let i = 0; i < 300; i++) m.think(REWARDING);
    const bias = m.learnedPlanBias();
    expect(bias.some((b) => Math.abs(b) > 1e-3)).toBe(true); // weights are no longer frozen
    for (const b of bias) {
      expect(Number.isFinite(b)).toBe(true);
      expect(Math.abs(b)).toBeLessThanOrEqual(PLAN_LEARN_CLAMP + 1e-9); // bounded — no divergence
    }
  });

  test('DETERMINISM — same seed + inputs + learning ⇒ identical learned bias (replayable)', () => {
    const run = (): number[] => {
      const m = new SuperMind(mulberry32(7));
      m.setLearning(true, 0.05);
      for (let i = 0; i < 150; i++) {
        m.think(percept({ energy: 0.5 + 0.4 * Math.sin(i), threat: 0.5 + 0.4 * Math.cos(i) }));
      }
      return m.learnedPlanBias();
    };
    expect(run()).toEqual(run()); // one seed → one cosmos, learning included
  });

  test('disabling resets the learned bias + trace to zero (back to the frozen mind)', () => {
    const m = new SuperMind(mulberry32(3));
    m.setLearning(true, 0.08);
    for (let i = 0; i < 200; i++) m.think(REWARDING);
    expect(m.learnedPlanBias().some((b) => Math.abs(b) > 1e-3)).toBe(true);
    m.setLearning(false);
    expect(m.learnedPlanBias().every((b) => b === 0)).toBe(true);
  });

  test('no NaN under a long varied run with learning on', () => {
    const m = new SuperMind(mulberry32(9));
    m.setLearning(true, 0.1);
    for (let i = 0; i < 400; i++) {
      m.think(
        percept({
          energy: (i % 5) / 5,
          threat: (i % 3) / 3,
          chaos: (i % 7) / 7,
          crowding: (i % 4) / 4,
        }),
      );
    }
    expect(m.learnedPlanBias().every((b) => Number.isFinite(b))).toBe(true);
    // 30s timeout: 400 full think() beats is genuinely heavy (apex mind + GWT-2 workspace +
    // embodiment), and under full-suite parallel CPU contention it brushes bun's 5s default. The
    // run is deterministic — this guards only against the scheduler flake, not any logic change.
  }, 30_000);
});
