/**
 * GATE-WILDERNESS-ANTICIPATION — proves the ambient wilderness fauna kernel
 * ({@link ../src/sim/wilderness-population simulateWildernessData}) now avoids chunk walls
 * ANTICIPATORILY (predictive), not merely reactively. The prior rule only pushed an entity once it was
 * ALREADY inside the danger margin (`localX < margin`); the upgraded kernel forecasts where the entity
 * will be from its current velocity and steers away from a wall it is PREDICTED to breach — even while
 * still OUTSIDE the reactive band. Falsifiable / defensible:
 *   - OPERATIONAL: an entity outside the reactive margin, aimed at a wall, is steered away THIS step by
 *     the threat signal — something the old reactive rule provably could not do (left and right walls);
 *   - ISOLATED: a matched control (identical seed, identical `exploreGain` via equal `explore`, zero
 *     `resource`) differs ONLY in the threat term, so the measured turn is the anticipation, not jitter;
 *   - deterministic + finite: identical inputs reproduce identical output; no NaN/Inf leaks.
 *
 * Wilderness is explicitly OUTSIDE the golden (ADR 0010), so this behavioural upgrade pins no golden.
 */
import { describe, expect, test } from 'bun:test';
import { simulateWildernessData } from '../src/sim/wilderness-population';

const CHUNK = 100;
const MARGIN = CHUNK * 0.16; // reactive danger band = 16 world units from each wall

// Layout: [x, y, z, vx, vy, vz, type, seed]. Same seed in every run ⇒ the 3 rng draws are identical and
// cancel in a control/smart diff; both runs are `adaptive` via explore=0.5 ⇒ identical exploreGain.
const stepTwice = (x: number, vx: number, threat: number): Float32Array => {
  const data = new Float32Array([x, 0, 50, vx, 0, 0, 2, 12345]);
  simulateWildernessData(data, 77, '0,0', 0.05, CHUNK, 0 /*resource*/, threat, 0.5 /*explore*/);
  return data;
};

describe('GATE-WILDERNESS-ANTICIPATION: fauna steer away from a wall they are predicted to hit', () => {
  test('OPERATIONAL (left wall): a threat-aware entity OUTSIDE the reactive margin still turns away', () => {
    // localX = 20 is OUTSIDE the reactive band (> margin=16): the old reactive rule would do nothing.
    const startX = 20;
    expect(startX).toBeGreaterThan(MARGIN);
    // Fast toward the left wall so the forecast (localX + vx·horizon) lands inside the margin.
    const control = stepTwice(startX, -10, 0); // threat 0 ⇒ no boundary steering at all
    const smart = stepTwice(startX, -10, 1); // threat 1 ⇒ predictive avoidance fires
    // Steered rightward (away from the left wall) relative to the control — while still outside the band.
    expect(smart[3]!).toBeGreaterThan(control[3]!);
  });

  test('OPERATIONAL (right wall): symmetry — a threat-aware entity turns back from the far wall', () => {
    // localX = 78 is OUTSIDE the right reactive band (< chunkSize-margin = 84).
    const startX = 78;
    expect(startX).toBeLessThan(CHUNK - MARGIN);
    const control = stepTwice(startX, 10, 0); // heading toward the right wall, no threat
    const smart = stepTwice(startX, 10, 1);
    // Steered leftward (away from the right wall) relative to the control.
    expect(smart[3]!).toBeLessThan(control[3]!);
  });

  test('an entity whose forecast CLEARS the wall is not pushed (no wasted force on an escaper)', () => {
    // localX = 12 is INSIDE the old reactive band (< margin=16), so the old rule WOULD push it — but it
    // is racing inward fast enough that its forecast clears the margin, so the predictive rule declines.
    const startX = 12;
    expect(startX).toBeLessThan(MARGIN);
    const control = stepTwice(startX, 20, 0);
    const smart = stepTwice(startX, 20, 1); // forecast = 12 + 20·horizon ⇒ well past the margin
    // Identical: the smarter rule spends no avoidance on an entity that is already escaping the wall.
    expect(smart[3]!).toBeCloseTo(control[3]!, 12);
  });

  test('deterministic + finite: identical inputs reproduce identical output', () => {
    const a = stepTwice(20, -10, 1);
    const b = stepTwice(20, -10, 1);
    expect(a).toEqual(b);
    for (const v of a) expect(Number.isFinite(v)).toBe(true);
  });
});
