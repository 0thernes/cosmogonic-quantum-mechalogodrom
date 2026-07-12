/**
 * GATE-AD-HVP — proves the reverse-mode tape's new EXACT second-order path (`math/eshkol-ad.adHvp`,
 * forward-over-reverse Pearlmutter Hessian·vector products) is real analytic calculus, not an
 * approximation. Falsifiable / defensible, three independent ways:
 *   - ANALYTIC: closed-form Hessians (x², x·y) match H·v to machine precision;
 *   - GENERATIVE ORACLE: on a family of random multivariate functions at random points/directions,
 *     H·v equals the CENTRAL FINITE DIFFERENCE of the exact gradient — the same AD-vs-FD oracle
 *     method Eshkol ships upstream (PR #245);
 *   - CROSS-ENGINE: for scalar functions, H·v (this tape engine) equals f''(x) from the fully
 *     independent hyper-dual engine (`math/hyperdual`, Fike & Alonso) — two unrelated second-order
 *     implementations agreeing.
 * Also pins: the gradient falls out for free (adj == reverse-mode gradient), Hessian symmetry, and
 * determinism (identical bytes on repeat).
 */
import { describe, expect, test } from 'bun:test';
import {
  adTapeNew,
  adVar,
  adConst,
  adAdd,
  adSub,
  adMul,
  adDiv,
  adSin,
  adCos,
  adExp,
  adLog,
  adSqrt,
  adPow,
  adTanh,
  adSigmoid,
  adNeg,
  adAbs,
  adRelu,
  adBackward,
  adGradient,
  adHvp,
  adHessianDiag,
  type AdTape,
} from '../src/math/eshkol-ad';
import {
  hdAdd,
  hdMul,
  hdSin,
  hdCos,
  hdNeg,
  hdExp,
  hdLog,
  hdSqrt,
  hdPow,
  hdTanh,
  hdSigmoid,
  derivatives2,
  type HyperDual,
} from '../src/math/hyperdual';
import { mulberry32 } from '../src/math/rng';

/** A parametric scalar function recorded on a tape: returns its output node + its VAR leaf nodes. */
type Builder = (tape: AdTape, vals: number[]) => { output: number; vars: number[] };

function gradAt(build: Builder, vals: number[]): number[] {
  const tape = adTapeNew(512);
  const { output, vars } = build(tape, vals);
  adBackward(tape, output);
  return vars.map((v) => adGradient(tape, v));
}

function hvpAt(build: Builder, vals: number[], dir: number[]): { grad: number[]; hv: number[] } {
  const tape = adTapeNew(512);
  const { output, vars } = build(tape, vals);
  const d = new Float64Array(tape.len);
  vars.forEach((node, i) => {
    d[node] = dir[i] ?? 0;
  });
  const s = adHvp(tape, output, d);
  return { grad: vars.map((v) => s.adj[v] ?? 0), hv: vars.map((v) => s.adjDot[v] ?? 0) };
}

/** Central finite difference of the exact gradient along `dir` — the oracle H·v estimate. */
function fdHv(build: Builder, vals: number[], dir: number[], eps = 1e-5): number[] {
  const plus = gradAt(
    build,
    vals.map((x, i) => x + eps * (dir[i] ?? 0)),
  );
  const minus = gradAt(
    build,
    vals.map((x, i) => x - eps * (dir[i] ?? 0)),
  );
  return plus.map((g, i) => (g - (minus[i] ?? 0)) / (2 * eps));
}

describe('GATE-AD-HVP: exact forward-over-reverse Hessian·vector products', () => {
  test('ANALYTIC: f=x² has H=[[2]] so H·v = 2v', () => {
    const build: Builder = (tape, [x]) => {
      const xn = adVar(tape, x ?? 0);
      return { output: adMul(tape, xn, xn), vars: [xn] };
    };
    for (const x of [-3, -0.5, 0, 1.7, 4.2]) {
      const { grad, hv } = hvpAt(build, [x], [1]);
      expect(grad[0]!).toBeCloseTo(2 * x, 9); // gradient for free
      expect(hv[0]!).toBeCloseTo(2, 9); // H·[1] = 2
      expect(hvpAt(build, [x], [3]).hv[0]!).toBeCloseTo(6, 9); // H·[3] = 6
    }
  });

  test('ANALYTIC: f=x·y has H=[[0,1],[1,0]] so H·(vx,vy) = (vy,vx)', () => {
    const build: Builder = (tape, [x, y]) => {
      const xn = adVar(tape, x ?? 0);
      const yn = adVar(tape, y ?? 0);
      return { output: adMul(tape, xn, yn), vars: [xn, yn] };
    };
    const { grad, hv } = hvpAt(build, [2, -5], [0.7, 1.3]);
    expect(grad[0]!).toBeCloseTo(-5, 9); // ∂/∂x = y
    expect(grad[1]!).toBeCloseTo(2, 9); // ∂/∂y = x
    expect(hv[0]!).toBeCloseTo(1.3, 9); // (H·v)_x = vy
    expect(hv[1]!).toBeCloseTo(0.7, 9); // (H·v)_y = vx
  });

  // A rich multivariate function touching add/sub/mul/div/sin/exp/log/sqrt/tanh/sigmoid/pow.
  const richBuild: Builder = (tape, [x, y, z]) => {
    const xn = adVar(tape, x ?? 0);
    const yn = adVar(tape, y ?? 0);
    const zn = adVar(tape, z ?? 0);
    const two = adConst(tape, 2);
    const one = adConst(tape, 1);
    const s1 = adSin(tape, adMul(tape, xn, yn)); // sin(x·y)
    const s2 = adExp(tape, adMul(tape, adConst(tape, 0.5), xn)); // exp(0.5x)
    const s3 = adTanh(tape, yn); // tanh(y)
    const s4 = adLog(tape, adAdd(tape, adMul(tape, xn, xn), one)); // log(x²+1)
    const s5 = adSqrt(tape, adAdd(tape, adMul(tape, zn, zn), one)); // sqrt(z²+1)
    const s6 = adSigmoid(tape, adSub(tape, xn, yn)); // sigmoid(x−y)
    const s7 = adDiv(tape, xn, adAdd(tape, adMul(tape, yn, yn), two)); // x/(y²+2)
    const s8 = adPow(tape, zn, adConst(tape, 3)); // z³ (constant exponent)
    const sum = adAdd(
      tape,
      adAdd(tape, adAdd(tape, s1, s2), adAdd(tape, s3, s4)),
      adAdd(tape, adAdd(tape, s5, s6), adAdd(tape, s7, s8)),
    );
    return { output: sum, vars: [xn, yn, zn] };
  };

  test('GENERATIVE ORACLE: H·v matches central-difference of the exact gradient on random points', () => {
    const rng = mulberry32(0x51235abc); // deterministic point/direction stream
    let checks = 0;
    for (let trial = 0; trial < 40; trial++) {
      // Points kept in a benign range so log/sqrt/div stay well inside their domains.
      const vals = [rng() * 2 - 1, rng() * 2 - 1, rng() * 1.5 + 0.2];
      const dir = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
      const { hv } = hvpAt(richBuild, vals, dir);
      const fd = fdHv(richBuild, vals, dir);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(hv[i]! - fd[i]!)).toBeLessThan(1e-3 + 1e-3 * Math.abs(hv[i]!));
        checks++;
      }
    }
    expect(checks).toBe(120); // every component of every trial was verified
  });

  test('CROSS-ENGINE: scalar H·[1] equals f″(x) from the independent hyper-dual engine', () => {
    // Matched scalar functions built in BOTH engines; assert tape-HVP curvature == hyper-dual f″.
    type Pair = { tape: (t: AdTape, x: number) => number; hd: (h: HyperDual) => HyperDual };
    const pairs: Pair[] = [
      { tape: (t, x) => adSin(t, adVar(t, x)), hd: (h) => hdSin(h) },
      { tape: (t, x) => adCos(t, adVar(t, x)), hd: (h) => hdCos(h) },
      {
        // −x² — exercises AD_NEG through a curved subgraph (f″ = −2).
        tape: (t, x) => {
          const xn = adVar(t, x);
          return adNeg(t, adMul(t, xn, xn));
        },
        hd: (h) => hdNeg(hdMul(h, h)),
      },
      { tape: (t, x) => adExp(t, adVar(t, x)), hd: (h) => hdExp(h) },
      { tape: (t, x) => adTanh(t, adVar(t, x)), hd: (h) => hdTanh(h) },
      { tape: (t, x) => adSigmoid(t, adVar(t, x)), hd: (h) => hdSigmoid(h) },
      { tape: (t, x) => adLog(t, adVar(t, x)), hd: (h) => hdLog(h) },
      { tape: (t, x) => adSqrt(t, adVar(t, x)), hd: (h) => hdSqrt(h) },
      { tape: (t, x) => adPow(t, adVar(t, x), adConst(t, 3)), hd: (h) => hdPow(h, 3) },
      {
        // sin(exp(x)) + tanh(x·x) — a composition exercising the chain rule twice.
        tape: (t, x) => {
          const xn = adVar(t, x);
          return adAdd(t, adSin(t, adExp(t, xn)), adTanh(t, adMul(t, xn, xn)));
        },
        hd: (h) => hdAdd(hdSin(hdExp(h)), hdTanh(hdMul(h, h))),
      },
    ];
    for (const p of pairs) {
      for (const x of [0.3, 0.9, 1.6]) {
        const tape = adTapeNew(64);
        const out = p.tape(tape, x);
        const dir = new Float64Array(tape.len);
        dir[0] = 1; // the sole VAR is node 0
        const s = adHvp(tape, out, dir);
        const { d2 } = derivatives2(p.hd, x);
        expect(s.adjDot[0]!).toBeCloseTo(d2, 8); // two independent engines agree on f″(x)
      }
    }
  });

  test('SYMMETRY: the reconstructed Hessian is symmetric (H_ij == H_ji)', () => {
    const tape = adTapeNew(512);
    const { output, vars } = richBuild(tape, [0.4, -0.3, 0.8]);
    const n = vars.length;
    const H: number[][] = [];
    for (let j = 0; j < n; j++) {
      const dir = new Float64Array(tape.len);
      dir[vars[j]!] = 1; // unit column j
      const s = adHvp(tape, output, dir);
      H.push(vars.map((v) => s.adjDot[v] ?? 0));
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) expect(H[i]![j]!).toBeCloseTo(H[j]![i]!, 9);
  });

  test('adHessianDiag matches the diagonal of the full HVP reconstruction', () => {
    const tape = adTapeNew(512);
    const { output, vars } = richBuild(tape, [0.5, 0.2, 0.9]);
    const diag = adHessianDiag(tape, output, vars);
    for (let j = 0; j < vars.length; j++) {
      const dir = new Float64Array(tape.len);
      dir[vars[j]!] = 1;
      const s = adHvp(tape, output, dir);
      expect(diag[j]!).toBeCloseTo(s.adjDot[vars[j]!]!, 9);
    }
  });

  test('PIECEWISE-LINEAR: |x| and relu(x) carry the right gradient and exactly zero curvature', () => {
    // Away from the kink, abs/relu are affine ⇒ f″ = 0 ⇒ H·v = 0, with slope ±1 / {0,1}.
    const absB: Builder = (tape, [x]) => {
      const xn = adVar(tape, x ?? 0);
      return { output: adAbs(tape, xn), vars: [xn] };
    };
    const reluB: Builder = (tape, [x]) => {
      const xn = adVar(tape, x ?? 0);
      return { output: adRelu(tape, xn), vars: [xn] };
    };
    for (const x of [1.5, -2.3]) {
      const a = hvpAt(absB, [x], [1]);
      expect(a.grad[0]!).toBeCloseTo(Math.sign(x), 9);
      expect(a.hv[0]!).toBeCloseTo(0, 12);
      const r = hvpAt(reluB, [x], [1]);
      expect(r.grad[0]!).toBeCloseTo(x > 0 ? 1 : 0, 9);
      expect(r.hv[0]!).toBeCloseTo(0, 12);
    }
  });

  test('DETERMINISTIC: identical inputs ⇒ identical H·v bytes', () => {
    const run = (): number[] => hvpAt(richBuild, [0.31, -0.42, 0.77], [1, -0.5, 0.25]).hv;
    expect(run()).toEqual(run());
  });
});
