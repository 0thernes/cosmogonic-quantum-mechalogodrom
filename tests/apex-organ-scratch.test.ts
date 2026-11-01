import { describe, expect, test } from 'bun:test';
import { ApexBrain, SCALE_APEX_START } from '../src/sim/apex-brain';
import type { Rng } from '../src/math/rng';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Reference forms (the pre-change code): idx() through the klein() tuple, and the tunnel step sampling
// from the array-returning rowProbabilities(). Installed on one brain; the other runs the shipped code.
function installReference(brain: any): void {
  const klein = brain.klein;
  klein.idx = function (u: number, v: number): number {
    const [uu, vv] = this.klein(u, v);
    return uu * this.h + vv;
  };
  const tunnel = brain.tunnel;
  tunnel.step = function (drive: number, rng: Rng): number {
    this.phase += 0.07 + 0.01 * drive;
    for (let i = 0; i < this.n; i++)
      for (let j = 0; j < this.n; j++) {
        const k = i * this.n + j;
        this.amp[k] = 0.5 + 0.5 * Math.sin(this.amp[k] * 3.1 + this.phase + i * 0.13 + j * 0.07);
      }
    let manifested = 0;
    for (let i = 0; i < this.n; i++) {
      const probs: number[] = this.rowProbabilities(i);
      const r = rng();
      let cum = 0;
      let pick = -1;
      for (let j = 0; j < this.n; j++) {
        cum += probs[j]!;
        if (r <= cum) {
          pick = j;
          break;
        }
      }
      this.manifest[i] = pick;
      if (pick >= 0 && pick !== i) manifested++;
    }
    return manifested / this.n;
  };
}

describe('apex Klein/Tunnel step without per-cell tuples or per-row arrays', () => {
  for (const [name, opts] of [
    ['default scale', undefined],
    ['start scale', { scale: SCALE_APEX_START }],
  ] as const) {
    test(`300 ticks + snapshot are byte-identical to the reference (${name})`, () => {
      const a = new ApexBrain(4242, opts);
      const b = new ApexBrain(4242, opts);
      installReference(b);
      expect((a as any).klein.idx).not.toBe((b as any).klein.idx);
      for (let t = 0; t < 300; t++) {
        const p = {
          threat: 0.5 + 0.4 * Math.sin(t * 0.13),
          energy: 0.5 + 0.4 * Math.cos(t * 0.07),
          chaos: 0.3,
          novelty: (t % 17) / 17,
          level: (t / 50) | 0,
        };
        expect(JSON.stringify(a.tick(p))).toBe(JSON.stringify(b.tick(p)));
      }
      expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
      const bytes = (x: Float64Array | Int32Array) =>
        Buffer.from(x.buffer, x.byteOffset, x.byteLength).toString('hex');
      const ka = (a as any).klein,
        kb = (b as any).klein,
        ta = (a as any).tunnel,
        tb = (b as any).tunnel;
      expect(bytes(ka.field)).toBe(bytes(kb.field));
      expect(bytes(ta.amp)).toBe(bytes(tb.amp));
      expect(bytes(ta.manifest)).toBe(bytes(tb.manifest));
      expect(ka.field.some((x: number) => x !== 0)).toBe(true);
    });
  }

  test('Klein idx equals the klein() tuple index on and across every seam', () => {
    const k = (new ApexBrain(7) as any).klein;
    let n = 0;
    for (let u = -2 * k.w; u < 3 * k.w; u++)
      for (let v = -2 * k.h; v < 3 * k.h; v++) {
        const [uu, vv] = k.klein(u, v);
        expect(k.idx(u, v)).toBe(uu * k.h + vv);
        n++;
      }
    expect(n).toBe(25 * k.w * k.h);
  });
});
