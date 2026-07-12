/**
 * GATE-AD-MLP-CURVATURE — proves `sim/ad-mlp.mlpTrainStepCurvature` is a REAL exact second-order
 * (Gauss-Newton diagonal) optimiser that makes an online network learn FASTER than the fixed-rate SGD
 * step, not a decorative relabelling. Falsifiable / defensible:
 *   - EXACTNESS: one curvature step moves every parameter by exactly −lr·gᵢ/(Hᵍⁿᵢᵢ+damping), where gᵢ
 *     and the Gauss-Newton diagonal Hᵍⁿᵢᵢ = 2·Σ_k(∂fₖ/∂θᵢ)² are recomputed here by INDEPENDENT finite
 *     differences of the public forward pass — so the optimiser's internal exact AD matches calculus;
 *   - SMARTER: on an ill-conditioned regression, curvature reaches a far lower loss than SGD from the
 *     SAME seeded init at the SAME learning rate in the SAME step budget (the 2nd-order advantage);
 *   - CONVERGES + BOUNDED + FASTER: it stays finite (no divergence), converges, and crosses a loss
 *     threshold in fewer steps than SGD — diagonal 2nd-order is not unconditionally monotone, so we
 *     assert the properties that ARE true rather than overclaim monotonicity;
 *   - DISTINCT: curvature and SGD produce genuinely different trajectories (it is not an alias);
 *   - DETERMINISTIC: identical init + data ⇒ identical bytes.
 */
import { describe, expect, test } from 'bun:test';
import {
  createMlp,
  mlpPredict,
  mlpTrainStep,
  mlpTrainStepCurvature,
  mlpParamCount,
  type Mlp,
} from '../src/sim/ad-mlp';
import { mulberry32 } from '../src/math/rng';

function cloneMlp(net: Mlp): Mlp {
  return {
    din: net.din,
    h: net.h,
    dout: net.dout,
    w1: net.w1.slice(),
    b1: net.b1.slice(),
    w2: net.w2.slice(),
    b2: net.b2.slice(),
  };
}

/** Flat parameter accessors in the exact order the optimiser walks them (b1, w1, b2, w2). */
function paramRefs(net: Mlp): Array<{ get: () => number; set: (v: number) => void }> {
  const refs: Array<{ get: () => number; set: (v: number) => void }> = [];
  const mk = (arr: Float64Array, i: number) => ({
    get: () => arr[i]!,
    set: (v: number) => (arr[i] = v),
  });
  for (let j = 0; j < net.h; j++) refs.push(mk(net.b1, j));
  for (let i = 0; i < net.h * net.din; i++) refs.push(mk(net.w1, i));
  for (let k = 0; k < net.dout; k++) refs.push(mk(net.b2, k));
  for (let i = 0; i < net.dout * net.h; i++) refs.push(mk(net.w2, i));
  return refs;
}

function mse(net: Mlp, input: number[], target: number[]): number {
  const out = mlpPredict(net, input);
  let s = 0;
  for (let k = 0; k < target.length; k++) s += (out[k]! - target[k]!) ** 2;
  return s;
}

describe('GATE-AD-MLP-CURVATURE: exact Gauss-Newton-diagonal preconditioned learning', () => {
  test('EXACTNESS: one step equals −lr·g/(Hᵍⁿ+damping) computed by independent finite differences', () => {
    const net = createMlp(3, 4, 2, mulberry32(0xc0ffee11));
    const input = [0.3, -0.7, 1.1];
    const target = [0.5, -0.2];
    const lr = 0.1;
    const damping = 1e-3;

    // Reference: finite-difference gradient of the loss and Gauss-Newton diagonal of the outputs.
    const ref = cloneMlp(net);
    const refs = paramRefs(ref);
    const hh = 1e-6;
    const predictedStep: number[] = refs.map((r) => {
      const x0 = r.get();
      // gᵢ = ∂L/∂θᵢ
      r.set(x0 + hh);
      const Lp = mse(ref, input, target);
      r.set(x0 - hh);
      const Lm = mse(ref, input, target);
      // Hᵍⁿᵢᵢ = 2·Σ_k (∂fₖ/∂θᵢ)²
      r.set(x0 + hh);
      const fp = mlpPredict(ref, input);
      r.set(x0 - hh);
      const fm = mlpPredict(ref, input);
      r.set(x0);
      const g = (Lp - Lm) / (2 * hh);
      let ggn = 0;
      for (let k = 0; k < target.length; k++) {
        const jac = (fp[k]! - fm[k]!) / (2 * hh);
        ggn += 2 * jac * jac;
      }
      return -(lr * g) / (ggn + damping);
    });

    // Actual: one real curvature step, then read the per-parameter deltas.
    const before = paramRefs(net).map((r) => r.get());
    mlpTrainStepCurvature(net, input, target, lr, damping);
    const after = paramRefs(net).map((r) => r.get());
    const actualStep = after.map((a, i) => a - before[i]!);

    expect(actualStep.length).toBe(mlpParamCount(net));
    for (let i = 0; i < actualStep.length; i++) {
      expect(Math.abs(actualStep[i]! - predictedStep[i]!)).toBeLessThan(
        1e-5 + 1e-3 * Math.abs(predictedStep[i]!),
      );
    }
  });

  test('SMARTER: under a conservative global lr, curvature beats SGD on an ill-conditioned task', () => {
    // Small inputs keep tanh in its responsive (near-linear) regime — no saturation confound — with an
    // 8× internal scale disparity between features that badly conditions the loss. At a global lr small
    // enough for SGD to stay stable on the worst direction, SGD crawls on the others; the exact
    // Gauss-Newton diagonal rescales per parameter and converges far faster. Asserted on the SEED
    // AGGREGATE (not a single lucky seed) so the advantage is a property of the method, not the draw.
    const scale = 8;
    const lr = 0.02; // conservative — the regime where 2nd-order preconditioning genuinely pays off
    const steps = 300;
    const one = (seed: number): { sgdLoss: number; curvLoss: number } => {
      const sgd = createMlp(3, 6, 1, mulberry32(seed));
      const curv = cloneMlp(sgd); // byte-identical start
      const rng = mulberry32(seed ^ 0x777);
      const data: Array<{ x: number[]; y: number[] }> = [];
      for (let i = 0; i < 16; i++) {
        const a = (rng() * 2 - 1) * 0.15;
        const b = (rng() * 2 - 1) * 0.15;
        const c = (rng() * 2 - 1) * 0.15 * scale; // the ill-conditioned axis
        data.push({ x: [a, b, c], y: [0.5 * a - 0.3 * b + 0.4 * (c / scale)] });
      }
      const meanLoss = (net: Mlp): number =>
        data.reduce((s, d) => s + mse(net, d.x, d.y), 0) / data.length;
      for (let step = 0; step < steps; step++) {
        const d = data[step % data.length]!;
        mlpTrainStep(sgd, d.x, d.y, lr);
        mlpTrainStepCurvature(curv, d.x, d.y, lr, 1e-4);
      }
      return { sgdLoss: meanLoss(sgd), curvLoss: meanLoss(curv) };
    };
    let sgdSum = 0;
    let curvSum = 0;
    let curvWins = 0;
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const seed of seeds) {
      const r = one(seed);
      sgdSum += r.sgdLoss;
      curvSum += r.curvLoss;
      if (r.curvLoss < r.sgdLoss) curvWins += 1;
    }
    const meanSgd = sgdSum / seeds.length;
    const meanCurv = curvSum / seeds.length;
    expect(Number.isFinite(meanCurv)).toBe(true);
    expect(curvWins).toBeGreaterThanOrEqual(6); // wins on the large majority of seeds
    expect(meanCurv).toBeLessThan(meanSgd * 0.5); // and by a decisive aggregate margin
    expect(meanCurv).toBeLessThan(1e-3); // while actually learning the map
  });

  test('CONVERGES + BOUNDED + FASTER: fewer steps to threshold than SGD, never blows up', () => {
    // On a single realizable example, the damped Gauss-Newton step converges — and crosses a loss
    // threshold in fewer steps than fixed-rate SGD at the same lr. Diagonal 2nd-order is NOT
    // unconditionally monotone on a nonconvex net (a step can overshoot when curvature is small), so
    // the honest claims are: it stays FINITE (no divergence), it CONVERGES, and it gets there FASTER.
    const input = [0.4, -0.3, 0.8, 0.1];
    const target = [0.6];
    const lr = 0.05;
    const stepsToThreshold = (curvature: boolean, thresh: number, cap: number): number => {
      const net = createMlp(4, 5, 1, mulberry32(0x5eed5eed));
      for (let step = 0; step < cap; step++) {
        const before = curvature
          ? mlpTrainStepCurvature(net, input, target, lr, 1e-2)
          : mlpTrainStep(net, input, target, lr);
        expect(Number.isFinite(before)).toBe(true); // never NaN/Inf — bounded, no blow-up
        if (mse(net, input, target) < thresh) return step + 1;
      }
      return cap; // did not reach threshold within the cap
    };
    const curvSteps = stepsToThreshold(true, 1e-3, 400);
    const sgdSteps = stepsToThreshold(false, 1e-3, 400);
    expect(curvSteps).toBeLessThan(400); // curvature converges below 1e-3
    expect(curvSteps).toBeLessThan(sgdSteps); // and reaches it in fewer steps than SGD
  });

  test('DISTINCT: curvature and SGD diverge in trajectory (a genuinely different optimiser)', () => {
    const a = createMlp(4, 5, 1, mulberry32(0xabcdef));
    const b = cloneMlp(a);
    const input = [0.5, 0.2, -0.4, 0.9];
    const target = [0.3];
    mlpTrainStep(a, input, target, 0.1);
    mlpTrainStepCurvature(b, input, target, 0.1, 1e-3);
    let maxDiff = 0;
    for (let i = 0; i < a.w1.length; i++)
      maxDiff = Math.max(maxDiff, Math.abs(a.w1[i]! - b.w1[i]!));
    expect(maxDiff).toBeGreaterThan(1e-6); // not the same update
  });

  test('DETERMINISTIC: identical init + data ⇒ identical bytes', () => {
    const run = (): number[] => {
      const net = createMlp(4, 5, 1, mulberry32(0x2222));
      for (let t = 0; t < 40; t++) mlpTrainStepCurvature(net, [0.3, 0.6, -0.2, 0.9], [0.4], 0.1);
      return Array.from(net.w2);
    };
    expect(run()).toEqual(run());
  });
});
