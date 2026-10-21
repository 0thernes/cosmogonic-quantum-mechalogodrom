/**
 * Eshkol AD microbenchmarks — reverse-mode automatic differentiation.
 *
 * Measures the Wengert tape primitive performance for gradient computation.
 * Port of tsotchke/Eshkol lib/backend/vm_autodiff.c.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import {
  adAdd,
  adBackward,
  adConst,
  adMul,
  adSin,
  adTapeNew,
  adTapeReset,
  adVar,
} from '../src/math/eshkol-ad';

group('eshkol-ad: Wengert tape operations', () => {
  const sharedTape10 = adTapeNew(10);
  const sharedTape20 = adTapeNew(20);

  bench('adTapeNew(100)', () => {
    do_not_optimize(adTapeNew(100));
  });

  bench('adConst + adVar creation', () => {
    adTapeReset(sharedTape10);
    const c = adConst(sharedTape10, 5);
    const v = adVar(sharedTape10, 3);
    do_not_optimize(c + v);
  });

  bench('adAdd (tape node creation)', () => {
    adTapeReset(sharedTape10);
    const a = adVar(sharedTape10, 2);
    const b = adVar(sharedTape10, 3);
    do_not_optimize(adAdd(sharedTape10, a, b));
  });

  bench('adMul (tape node creation)', () => {
    adTapeReset(sharedTape10);
    const a = adVar(sharedTape10, 2);
    const b = adVar(sharedTape10, 3);
    do_not_optimize(adMul(sharedTape10, a, b));
  });

  bench('adSin (tape node creation)', () => {
    adTapeReset(sharedTape10);
    const x = adVar(sharedTape10, 1.5);
    do_not_optimize(adSin(sharedTape10, x));
  });

  bench('adBackward (gradient propagation, 10 nodes)', () => {
    adTapeReset(sharedTape10);
    const x = adVar(sharedTape10, 2);
    const y = adVar(sharedTape10, 3);
    const z = adMul(sharedTape10, x, y);
    const w = adSin(sharedTape10, z);
    adBackward(sharedTape10, w);
    do_not_optimize(sharedTape10);
  });

  bench('complex expression: f(x,y) = sin(x*y) + x (gradient)', () => {
    adTapeReset(sharedTape20);
    const x = adVar(sharedTape20, 1.5);
    const y = adVar(sharedTape20, 2.3);
    const xy = adMul(sharedTape20, x, y);
    const s = adSin(sharedTape20, xy);
    const c = adConst(sharedTape20, 1.5);
    const result = adAdd(sharedTape20, s, c);
    adBackward(sharedTape20, result);
    do_not_optimize(sharedTape20);
  });
});

if (import.meta.main) {
  await run();
}
