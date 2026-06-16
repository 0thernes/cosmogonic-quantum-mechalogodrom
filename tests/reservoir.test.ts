import { describe, expect, test } from 'bun:test';
import {
  Reservoir,
  RESERVOIR_SIZE,
  RESERVOIR_IN,
  type ReservoirSnapshot,
} from '../src/sim/reservoir';
import { mulberry32 } from '../src/math/rng';

/** A deterministic input vector for beat `t` (a slow drifting pattern). */
function input(t: number): Float32Array {
  const u = new Float32Array(RESERVOIR_IN);
  for (let k = 0; k < RESERVOIR_IN; k++) u[k] = Math.sin(0.3 * t + 0.7 * k) * 0.8;
  return u;
}

describe('Reservoir — echo-state network (wet computing)', () => {
  test('deterministic: same seed + same input stream -> bit-identical state and snapshot', () => {
    const a = new Reservoir(mulberry32(12345));
    const b = new Reservoir(mulberry32(12345));
    for (let t = 0; t < 40; t++) {
      const u = input(t);
      a.step(u);
      b.step(u);
    }
    const sa = a.snapshot();
    const sb = b.snapshot();
    expect(sa.state).toEqual(sb.state);
    expect(sa.energy).toBe(sb.energy);
    expect(sa.echo).toBe(sb.echo);
    expect(a.novelty).toBe(b.novelty);
  });

  test('bounded state: leaky-tanh dynamics keep every node activation within (-1, 1)', () => {
    const r = new Reservoir(mulberry32(7));
    for (let t = 0; t < 200; t++) r.step(input(t));
    const s = r.snapshot();
    for (const v of s.state) expect(Math.abs(v)).toBeLessThan(1);
    expect(s.energy).toBeGreaterThanOrEqual(0);
    expect(s.energy).toBeLessThanOrEqual(1);
    expect(s.richness).toBeGreaterThanOrEqual(0);
    expect(s.richness).toBeLessThanOrEqual(1);
    expect(s.echo).toBeGreaterThanOrEqual(0);
    expect(s.echo).toBeLessThanOrEqual(1);
  });

  test('echo-state / washout: two reservoirs with the SAME weights but DIFFERENT initial drive converge under a shared input stream', () => {
    // Same seed => same fixed weights; perturb one with an extra random pre-roll so initial states differ.
    const a = new Reservoir(mulberry32(99));
    const b = new Reservoir(mulberry32(99));
    const pre = mulberry32(555);
    for (let t = 0; t < 15; t++) {
      const noise = new Float32Array(RESERVOIR_IN);
      for (let k = 0; k < RESERVOIR_IN; k++) noise[k] = pre() * 2 - 1;
      b.step(noise); // drive b into a different initial state
    }
    // Now feed BOTH the identical stream; the spectral radius < 1 must wash out the initial difference.
    let early = 0;
    {
      const u = input(0);
      a.step(u);
      b.step(u);
      const sa = a.snapshot();
      const sb = b.snapshot();
      for (let i = 0; i < sa.state.length; i++)
        early += Math.abs((sa.state[i] ?? 0) - (sb.state[i] ?? 0));
    }
    for (let t = 1; t < 120; t++) {
      const u = input(t);
      a.step(u);
      b.step(u);
    }
    const sa = a.snapshot();
    const sb = b.snapshot();
    let late = 0;
    for (let i = 0; i < sa.state.length; i++)
      late += Math.abs((sa.state[i] ?? 0) - (sb.state[i] ?? 0));
    expect(late).toBeLessThan(early); // the initial-condition dependence shrank — the echo-state property
    expect(late).toBeLessThan(1e-3); // and is effectively erased
  });

  test('novelty: a sustained constant input drives novelty toward 0; a fresh input spikes it', () => {
    const r = new Reservoir(mulberry32(3));
    const steady = new Float32Array(RESERVOIR_IN).fill(0.5);
    for (let t = 0; t < 80; t++) r.step(steady);
    const settled = r.novelty;
    expect(settled).toBeLessThan(0.05); // expectation has tracked the constant input
    const surprise = new Float32Array(RESERVOIR_IN).fill(-0.9);
    r.step(surprise);
    expect(r.novelty).toBeGreaterThan(settled); // a new pattern raises novelty
  });

  test('snapshot reports the configured size and a 24-wide state window', () => {
    const r = new Reservoir(mulberry32(1));
    r.step(input(0));
    const s: ReservoirSnapshot = r.snapshot();
    expect(s.size).toBe(RESERVOIR_SIZE);
    expect(s.state.length).toBe(24);
  });

  test('closed-form novelty: the first step from rest yields novelty = the RMS of the input', () => {
    // The leaky expectation starts at 0, so on beat 0 the deviation is exactly the input; novelty is
    // clamp01(sqrt(mean(u²))). A constant 0.5 vector ⇒ exactly 0.5; a [0.8,0.6,0…] vector ⇒ 0.25.
    const r1 = new Reservoir(mulberry32(2));
    r1.step(new Float32Array(RESERVOIR_IN).fill(0.5));
    expect(Math.abs(r1.novelty - 0.5)).toBeLessThan(1e-7);

    const r2 = new Reservoir(mulberry32(2));
    const u = new Float32Array(RESERVOIR_IN); // Σu² = 0.64+0.36 = 1 over 16 lanes ⇒ rms = 0.25
    u[0] = 0.8;
    u[1] = 0.6;
    r2.step(u);
    expect(Math.abs(r2.novelty - 0.25)).toBeLessThan(1e-7);
  });

  test('echo-state washout holds across MANY seeds (the contractive property, not the radius value)', () => {
    // The audit noted power iteration only APPROXIMATES ρ for non-normal W, so the radius number is not
    // trustworthy — but the property it is meant to deliver (initial-condition washout) is. Verify that
    // property directly across several seeds: a perturbed and a clean reservoir, fed an identical stream,
    // converge regardless of seed.
    for (const seed of [1, 7, 42, 99, 555, 12345]) {
      const a = new Reservoir(mulberry32(seed));
      const b = new Reservoir(mulberry32(seed));
      const pre = mulberry32((seed ^ 0xabcdef) >>> 0 || 1);
      for (let t = 0; t < 15; t++) {
        const noise = new Float32Array(RESERVOIR_IN);
        for (let k = 0; k < RESERVOIR_IN; k++) noise[k] = pre() * 2 - 1;
        b.step(noise);
      }
      let early = 0;
      {
        const u = input(0);
        a.step(u);
        b.step(u);
        const sa = a.snapshot();
        const sb = b.snapshot();
        for (let i = 0; i < sa.state.length; i++)
          early += Math.abs((sa.state[i] ?? 0) - (sb.state[i] ?? 0));
      }
      for (let t = 1; t < 140; t++) {
        const u = input(t);
        a.step(u);
        b.step(u);
      }
      const sa = a.snapshot();
      const sb = b.snapshot();
      let late = 0;
      for (let i = 0; i < sa.state.length; i++)
        late += Math.abs((sa.state[i] ?? 0) - (sb.state[i] ?? 0));
      expect(late).toBeLessThan(early); // initial-condition dependence shrank for THIS seed
      expect(late).toBeLessThan(1e-2); // and is effectively erased — washout holds, every seed
    }
  });
});
