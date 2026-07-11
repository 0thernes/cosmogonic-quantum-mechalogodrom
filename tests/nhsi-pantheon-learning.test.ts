/**
 * NHSI FACULTIES PANTHEON — ONLINE SELF-MODEL + ADAPTIVE COUPLING (falsifiable gate).
 *
 * The 144-faculty pantheon was a FIXED bank of profiled dials with a hand-tuned coupling gain. This gate
 * proves the part that now DEVELOPS during a run: {@link FacultiesPantheon.enableLearning} lights a real
 * {@link NHSI_GROUPS}→6→1 MLP (exact reverse-mode Eshkol-AD backprop) that forecasts the pantheon's OWN
 * next-beat mean activation and corrects itself every beat; its surprise then makes the coupling ADAPTIVE
 * — the faculties integrate more strongly when the pantheon fails to predict itself, relaxing as it learns.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): NHSI now develops a self-model (its forecast error falls,
 * ablation-verified) and its coupling adapts to that self-uncertainty. It does NOT claim the aggregate
 * coupling-density scalar rose (it doesn't — the coupling is gentle by design; cranking it would be
 * inflation). NO consciousness / Butlin / A-Life score is moved.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { FacultiesPantheon, NHSI_SELFMODEL_PARAMS } from '../src/sim/faculties-pantheon';

const SEED = 42;
const N = 200;

/** A smooth, autoregressive faculty-input stream — the pantheon's aggregate is forecastable from it. */
function stream(i: number): Float32Array {
  const inp = new Float32Array(16);
  for (let k = 0; k < 16; k++) inp[k] = 0.5 + 0.4 * Math.sin(i * 0.05 + k * 0.5);
  return inp;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function run(mode: 'off' | 'trained' | 'frozen'): {
  err: number[];
  dens: number[];
  p: FacultiesPantheon;
} {
  const p = new FacultiesPantheon(mulberry32(SEED));
  if (mode !== 'off') p.enableLearning({ seed: SEED, lr: mode === 'trained' ? 0.05 : 0 });
  const err: number[] = [];
  const dens: number[] = [];
  for (let i = 0; i < N; i++) {
    p.update(stream(i));
    err.push(p.selfModelError);
    dens.push(p.getCouplingDensity());
  }
  return { err, dens, p };
}

describe('NHSI pantheon self-model + adaptive coupling', () => {
  test('1. DEVELOPS: the self-model drives its own forecast error down (early ≫ late)', () => {
    const trained = run('trained');
    const early = mean(trained.err.slice(5, 40));
    const late = mean(trained.err.slice(N - 60));
    expect(late).toBeLessThan(early * 0.5); // ≥50% error reduction — the pantheon genuinely develops
    expect(trained.p.selfModelError).toBeLessThan(0.05);
    expect(trained.p.isLearning).toBe(true);
  });

  test('2. ABLATION: a frozen-lr0 self-model never develops; trained ≪ frozen', () => {
    const trained = run('trained');
    const frozen = run('frozen');
    const tLate = mean(trained.err.slice(N - 60));
    const fLate = mean(frozen.err.slice(N - 60));
    expect(tLate).toBeLessThan(fLate * 0.2); // ≈50× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.1); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. ADAPTIVE COUPLING: learning makes the coupling respond to surprise (density ≠ baseline)', () => {
    const off = run('off');
    const trained = run('trained');
    // the coupling trajectory genuinely changed — it is no longer the fixed-gain baseline.
    expect(JSON.stringify(trained.dens)).not.toBe(JSON.stringify(off.dens));
    // and it is surprise-responsive: coupling is stronger EARLY (high self-surprise) than LATE (learned).
    const early = mean(trained.dens.slice(5, 40));
    const late = mean(trained.dens.slice(N - 40));
    expect(early).toBeGreaterThan(late);
    // stays bounded + non-degenerate.
    for (const d of trained.dens) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical trajectory while learning', () => {
    const a = new FacultiesPantheon(mulberry32(7));
    const b = new FacultiesPantheon(mulberry32(7));
    a.enableLearning({ seed: 7, lr: 0.05 });
    b.enableLearning({ seed: 7, lr: 0.05 });
    for (let i = 0; i < 80; i++) {
      a.update(stream(i));
      b.update(stream(i));
      expect(a.selfModelError).toBe(b.selfModelError);
      expect(a.getCouplingDensity()).toBe(b.getCouplingDensity());
    }
  });

  test('5. DEFAULT-OFF: learning is opt-in — the fixed baseline is byte-identical & self-err 0', () => {
    const a = new FacultiesPantheon(mulberry32(SEED));
    const b = new FacultiesPantheon(mulberry32(SEED));
    for (let i = 0; i < 80; i++) {
      a.update(stream(i));
      b.update(stream(i));
      expect(a.getCouplingDensity()).toBe(b.getCouplingDensity());
    }
    expect(a.isLearning).toBe(false);
    expect(a.selfModelError).toBe(0);
  });

  test('6. SCALE: the self-model adds a real, bounded parameter count', () => {
    expect(NHSI_SELFMODEL_PARAMS).toBe(8 * 6 + 6 + (6 + 1)); // 61
  });
});
