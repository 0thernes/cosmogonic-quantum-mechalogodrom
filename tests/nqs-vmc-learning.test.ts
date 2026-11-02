/**
 * NQS/VMC learner — locks the batch-9 non-finite guards on the online quantum-state learner wired
 * live into super-mind (V=6/H=8/lr=0.005/reg=0.001, stepped every beat). The learner had ZERO test
 * coverage, so its guard against a diverged-weight `exp()` overflow — which would inject a sticky NaN
 * that pins the apex `cons.surprise` forever (the net re-initialises only in its constructor) — could
 * silently regress. Pure math over a seeded RNG; NOT a sentience claim.
 */
import { describe, expect, test } from 'bun:test';
import {
  initNQS,
  initVMC,
  amplitude,
  localEnergy,
  vmcStep,
  type VMCConfig,
} from '../src/sim/nqs-vmc-learning';

const CONFIG: VMCConfig = {
  sampleCount: 8,
  thermalizationSteps: 5,
  learningRate: 0.005,
  regularization: 0.001,
};

describe('nqs-vmc: normal training is finite + deterministic', () => {
  test('a vmcStep on freshly-initialised weights yields finite, deterministic telemetry', () => {
    const archA = initNQS(6, 8, 0xabcdef);
    const stateA = initVMC(archA, CONFIG, 0x1234);
    const tA = vmcStep(archA, stateA, CONFIG, 0x1234);
    expect(Number.isFinite(tA.energy)).toBe(true);
    expect(Number.isFinite(tA.energyVariance)).toBe(true);
    expect(Number.isFinite(tA.gradientNorm)).toBe(true);
    expect(tA.parameterCount).toBe(6 * 8 + 6 + 8);

    // Same seed ⇒ identical telemetry (deterministic substrate).
    const archB = initNQS(6, 8, 0xabcdef);
    const stateB = initVMC(archB, CONFIG, 0x1234);
    const tB = vmcStep(archB, stateB, CONFIG, 0x1234);
    expect(tB).toEqual(tA);
  });
});

describe('nqs-vmc: localEnergy survives an exp() overflow (batch-9 guard)', () => {
  test('diverged weights overflow the amplitude but localEnergy returns a finite 0, never NaN', () => {
    const arch = initNQS(6, 8, 0x777);
    arch.weights.fill(100); // ⇒ logAmp ≈ Σ|activation| ≫ 709 ⇒ exp() overflow

    // Precondition: the overflow genuinely happens (this is the tail the underflow-only guard missed).
    const psi = amplitude(arch, 0b111111); // all visible = +1 ⇒ every activation ≈ +600
    expect(Number.isFinite(psi.re)).toBe(false); // Infinity (or NaN) — the hazard is real

    // The guard must convert that into a finite 0, not propagate NaN into the energy sum.
    for (const bits of [0b111111, 0b101010, 0b000001, 0]) {
      const e = localEnergy(arch, bits);
      expect(Number.isFinite(e)).toBe(true);
    }
  });

  test('a full vmcStep on pathological weights never poisons the live parameters with NaN', () => {
    const arch = initNQS(6, 8, 0x9);
    arch.weights.fill(100);
    const state = initVMC(arch, CONFIG, 0x55);
    const t = vmcStep(arch, state, CONFIG, 0x55);
    expect(Number.isFinite(t.energy)).toBe(true);
    expect(Number.isFinite(t.energyVariance)).toBe(true);
    // The parameters the next beat reads must stay finite — no sticky NaN.
    for (const w of arch.weights) expect(Number.isFinite(w)).toBe(true);
    for (const b of arch.visibleBiases) expect(Number.isFinite(b)).toBe(true);
    for (const b of arch.hiddenBiases) expect(Number.isFinite(b)).toBe(true);
  });

  test('vmcStep skips the update (finite guard) when a parameter is already non-finite', () => {
    const arch = initNQS(6, 8, 0x3);
    const before = Float32Array.from(arch.weights);
    arch.weights[0] = Number.NaN; // a pre-existing NaN ⇒ gradNorm becomes non-finite
    const state = initVMC(arch, CONFIG, 0x2);
    const t = vmcStep(arch, state, CONFIG, 0x2);
    // The finite-skip guard returns zeroed telemetry rather than writing a non-finite update.
    expect(t.energy).toBe(0);
    expect(t.gradientNorm).toBe(0);
    // The clean weights are left untouched (the skip does not compound the damage).
    for (let i = 1; i < before.length; i++) expect(arch.weights[i]).toBe(before[i]);
  });
});

describe('nqs-vmc: pooled step scratch', () => {
  test('interleaving shapes and repeated steps matches an uninterrupted run bit-for-bit', () => {
    const run = (interleave: boolean) => {
      const arch = initNQS(6, 8, 0x5eed);
      const state = initVMC(arch, CONFIG, 0x77);
      const out: number[] = [];
      for (let k = 0; k < 6; k++) {
        if (interleave) {
          const other = initNQS(4, 5, k + 1);
          vmcStep(other, initVMC(other, CONFIG, k), CONFIG, k);
        }
        const t = vmcStep(arch, state, CONFIG, 0x77 + k);
        out.push(t.energy, t.energyVariance, t.gradientNorm);
      }
      return [...out, ...arch.weights, ...arch.visibleBiases, ...arch.hiddenBiases];
    };
    const a = run(false);
    const b = run(true);
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) expect(Object.is(a[i], b[i])).toBe(true);
  });
});
