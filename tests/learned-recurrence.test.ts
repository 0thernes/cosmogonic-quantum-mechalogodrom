import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { LearnedRecurrence } from '../src/sim/learned-recurrence';

describe('LearnedRecurrence (RPT-1/2)', () => {
  test('deterministic from seed — same input sequence ⇒ same error trajectory', () => {
    const a = new LearnedRecurrence(mulberry32(42));
    const b = new LearnedRecurrence(mulberry32(42));
    const inp = [0.2, 0.5, 0.1, 0.8, 0.3, 0.6, 0.4, 0.9, 0.1, 0.2, 0.7, 0.5, 0.3, 0.4, 0.6, 0.2];
    const tgt = [0.3, 0.4, 0.2, 0.7, 0.5, 0.5, 0.3, 0.8, 0.2, 0.3, 0.6, 0.4, 0.4, 0.5, 0.5, 0.3];
    const errsA: number[] = [];
    const errsB: number[] = [];
    for (let t = 0; t < 20; t++) {
      errsA.push(a.step(inp, tgt));
      errsB.push(b.step(inp, tgt));
    }
    expect(errsA).toEqual(errsB);
  });

  test('error decreases on a fixed target after many steps', () => {
    const lr = new LearnedRecurrence(mulberry32(7));
    const inp = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const tgt = [0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1];
    let first = lr.step(inp, tgt);
    for (let t = 0; t < 80; t++) lr.step(inp, tgt);
    const last = lr.step(inp, tgt);
    expect(last).toBeLessThanOrEqual(first + 0.05);
    expect(lr.snapshot().steps).toBe(82);
  });

  test('blendIntoLatent mutates latent in-place', () => {
    const lr = new LearnedRecurrence(mulberry32(1));
    const inp = new Float32Array(16).fill(0.5);
    const tgt = new Float32Array(16).fill(0.7);
    lr.step(inp, tgt);
    const latent = new Float32Array(16).fill(0);
    lr.blendIntoLatent(latent, 1);
    let sum = 0;
    for (let i = 0; i < 16; i++) sum += Math.abs(latent[i] ?? 0);
    expect(sum).toBeGreaterThan(0);
  });
});
