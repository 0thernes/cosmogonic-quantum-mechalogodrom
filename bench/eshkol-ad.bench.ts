/**
 * Eshkol AD microbenchmarks — reverse-mode automatic differentiation.
 *
 * Measures the Wengert tape primitive performance for gradient computation.
 * Port of tsotchke/Eshkol lib/backend/vm_autodiff.c.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { adAdd, adBackward, adConst, adMul, adSin, adTapeNew, adVar } from '../src/math/eshkol-ad';

group('eshkol-ad: Wengert tape operations', () => {
  bench('adTapeNew(100)', () => {
    do_not_optimize(adTapeNew(100));
  });

  bench('adConst + adVar creation', () => {
    const t = adTapeNew(10);
    const c = adConst(t, 5);
    const v = adVar(t, 3);
    do_not_optimize(c + v);
  });

  bench('adAdd (tape node creation)', () => {
    const t = adTapeNew(10);
    const a = adVar(t, 2);
    const b = adVar(t, 3);
    do_not_optimize(adAdd(t, a, b));
  });

  bench('adMul (tape node creation)', () => {
    const t = adTapeNew(10);
    const a = adVar(t, 2);
    const b = adVar(t, 3);
    do_not_optimize(adMul(t, a, b));
  });

  bench('adSin (tape node creation)', () => {
    const t = adTapeNew(10);
    const x = adVar(t, 1.5);
    do_not_optimize(adSin(t, x));
  });

  bench('adBackward (gradient propagation, 10 nodes)', () => {
    const t = adTapeNew(10);
    const x = adVar(t, 2);
    const y = adVar(t, 3);
    const z = adMul(t, x, y);
    const w = adSin(t, z);
    adBackward(t, w);
    do_not_optimize(t);
  });

  bench('complex expression: f(x,y) = sin(x*y) + x (gradient)', () => {
    const t = adTapeNew(20);
    const x = adVar(t, 1.5);
    const y = adVar(t, 2.3);
    const xy = adMul(t, x, y);
    const s = adSin(t, xy);
    const c = adConst(t, 1.5);
    const result = adAdd(t, s, c);
    adBackward(t, result);
    do_not_optimize(t);
  });
});

if (import.meta.main) {
  await run();
}
