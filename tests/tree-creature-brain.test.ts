import { describe, expect, test } from 'bun:test';
import {
  createTreeCreatureAction,
  TREE_CREATURE_ACTIVITY,
  TREE_CREATURE_BRAIN_HIDDEN,
  TREE_CREATURE_BRAIN_INPUTS,
  TREE_CREATURE_BRAIN_OUTPUTS,
  TREE_CREATURE_BRAIN_PARAMETERS,
  TreeCreatureBrain,
  type TreeCreatureAction,
  type TreeCreaturePercept,
} from '../src/sim/tree-creature-brain';

const BASE_PERCEPT: TreeCreaturePercept = {
  energy: 0.5,
  foodDirectionX: 1,
  foodDirectionZ: 0,
  foodDistance: 0.5,
  socialDensity: 0.5,
  threat: 0.2,
  safeZoneCalm: 0.8,
  phase: 0,
  personality: 0.5,
};

function clonePercept(overrides: Partial<TreeCreaturePercept> = {}): TreeCreaturePercept {
  return { ...BASE_PERCEPT, ...overrides };
}

/** An authored, finite model that routes every one of the six inputs into a load-bearing output. */
function responsiveWeights(): Float32Array {
  const weights = new Float32Array(TREE_CREATURE_BRAIN_PARAMETERS);
  const hiddenStride = TREE_CREATURE_BRAIN_INPUTS + 1;
  for (let hidden = 0; hidden < TREE_CREATURE_BRAIN_HIDDEN; hidden++) {
    weights[hidden * hiddenStride + 1 + hidden] = 1.5;
  }
  const outputBase = TREE_CREATURE_BRAIN_HIDDEN * hiddenStride;
  const outputStride = TREE_CREATURE_BRAIN_HIDDEN + 1;
  // motor X reads food bearing + phase/personality
  weights[outputBase + 1 + 1] = 1.2;
  weights[outputBase + 1 + 5] = 0.8;
  // motor Z reads food proximity + calm/threat
  weights[outputBase + outputStride + 1 + 2] = 1.2;
  weights[outputBase + outputStride + 1 + 4] = 0.8;
  // metabolic and social activity axes read their matching channels
  weights[outputBase + outputStride * 2 + 1] = 1.2;
  weights[outputBase + outputStride * 3 + 1 + 3] = 1.2;
  return weights;
}

function biasedBrain(metabolicBias: number, socialBias: number): TreeCreatureBrain {
  const weights = new Float32Array(TREE_CREATURE_BRAIN_PARAMETERS);
  const outputBase = TREE_CREATURE_BRAIN_HIDDEN * (TREE_CREATURE_BRAIN_INPUTS + 1);
  const outputStride = TREE_CREATURE_BRAIN_HIDDEN + 1;
  weights[outputBase + outputStride * 2] = metabolicBias;
  weights[outputBase + outputStride * 3] = socialBias;
  return new TreeCreatureBrain(1, weights);
}

function expectFiniteBounded(action: TreeCreatureAction): void {
  expect(Number.isFinite(action.motorX + action.motorZ + action.steerX + action.steerZ)).toBe(true);
  expect(Number.isFinite(action.speed)).toBe(true);
  expect(Math.abs(action.motorX)).toBeLessThanOrEqual(1);
  expect(Math.abs(action.motorZ)).toBeLessThanOrEqual(1);
  expect(Math.hypot(action.steerX, action.steerZ)).toBeLessThanOrEqual(1.000001);
  expect(action.speed).toBeGreaterThanOrEqual(0);
  expect(action.speed).toBeLessThanOrEqual(1);
  for (const drive of [
    action.eatDrive,
    action.restDrive,
    action.socialActivityDrive,
    action.roamDrive,
  ]) {
    expect(drive).toBeGreaterThanOrEqual(0);
    expect(drive).toBeLessThanOrEqual(1);
  }
}

describe('TreeCreatureBrain', () => {
  test('has the canonical compact 6→6→4 shape and 70 finite parameters', () => {
    const brain = new TreeCreatureBrain(7);
    const status = brain.status();
    expect(TREE_CREATURE_BRAIN_PARAMETERS).toBe(70);
    expect(TREE_CREATURE_BRAIN_OUTPUTS).toBe(4);
    expect(status.inputCount).toBe(6);
    expect(status.hiddenCount).toBe(6);
    expect(status.outputCount).toBe(4);
    expect(status.parameterCount).toBe(70);
    expect(status.modelReady).toBe(true);
    expect(brain.weightsView().length).toBe(70);
    for (const weight of brain.weightsView()) expect(Number.isFinite(weight)).toBe(true);
  });

  test('same seed and percept sequence produce identical weights and decisions', () => {
    const a = new TreeCreatureBrain(91);
    const b = new TreeCreatureBrain(91);
    expect(Array.from(a.weightsView())).toEqual(Array.from(b.weightsView()));
    const actionA = createTreeCreatureAction();
    const actionB = createTreeCreatureAction();
    for (let step = 0; step < 32; step++) {
      const percept = clonePercept({
        phase: step * 0.17,
        energy: 0.2 + (step % 7) * 0.1,
        socialDensity: (step % 5) / 4,
      });
      a.decide(percept, actionA);
      b.decide(percept, actionB);
      expect(actionA).toEqual(actionB);
    }
    expect(a.status()).toEqual(b.status());
  });

  test('all six neural channels materially affect bounded outputs and steering', () => {
    const brain = new TreeCreatureBrain(1, responsiveWeights());
    const baseline = createTreeCreatureAction();
    brain.decide(BASE_PERCEPT, baseline);

    const metabolic = createTreeCreatureAction();
    brain.decide(clonePercept({ energy: 0.9 }), metabolic);
    expect(metabolic.metabolicDrive).not.toBeCloseTo(baseline.metabolicDrive, 6);

    const bearing = createTreeCreatureAction();
    brain.decide(clonePercept({ foodDirectionX: 0, foodDirectionZ: 1 }), bearing);
    expect(bearing.motorX).not.toBeCloseTo(baseline.motorX, 6);

    const distance = createTreeCreatureAction();
    brain.decide(clonePercept({ foodDistance: 0.1 }), distance);
    expect(distance.motorZ).not.toBeCloseTo(baseline.motorZ, 6);

    const social = createTreeCreatureAction();
    brain.decide(clonePercept({ socialDensity: 0.9 }), social);
    expect(social.socialDrive).not.toBeCloseTo(baseline.socialDrive, 6);

    const safety = createTreeCreatureAction();
    brain.decide(clonePercept({ threat: 0.9, safeZoneCalm: 0.1 }), safety);
    expect(safety.motorZ).not.toBeCloseTo(baseline.motorZ, 6);

    const phasePersonality = createTreeCreatureAction();
    brain.decide(clonePercept({ phase: Math.PI / 2, personality: 0.5 }), phasePersonality);
    expect(phasePersonality.motorX).not.toBeCloseTo(baseline.motorX, 6);
    expect(
      Math.hypot(
        phasePersonality.steerX - baseline.steerX,
        phasePersonality.steerZ - baseline.steerZ,
      ),
    ).toBeGreaterThan(1e-4);

    for (const action of [
      baseline,
      metabolic,
      bearing,
      distance,
      social,
      safety,
      phasePersonality,
    ]) {
      expectFiniteBounded(action);
      expect(action.usedFallback).toBe(false);
    }
  });

  test('the neural activity axes can select eat, rest, social, and roam', () => {
    const eat = createTreeCreatureAction();
    biasedBrain(4, 0).decide(
      clonePercept({ energy: 0.1, foodDistance: 0.05, threat: 0, safeZoneCalm: 1 }),
      eat,
    );
    expect(eat.activity).toBe(TREE_CREATURE_ACTIVITY.EAT);

    const rest = createTreeCreatureAction();
    biasedBrain(-4, 0).decide(
      clonePercept({ energy: 0.2, foodDistance: 1, threat: 0, safeZoneCalm: 1 }),
      rest,
    );
    expect(rest.activity).toBe(TREE_CREATURE_ACTIVITY.REST);

    const social = createTreeCreatureAction();
    biasedBrain(0, 4).decide(
      clonePercept({ energy: 0.8, foodDistance: 1, socialDensity: 1, threat: 0, safeZoneCalm: 1 }),
      social,
    );
    expect(social.activity).toBe(TREE_CREATURE_ACTIVITY.SOCIAL);

    const roam = createTreeCreatureAction();
    biasedBrain(0, -4).decide(
      clonePercept({ energy: 1, foodDistance: 1, socialDensity: 0, threat: 0, safeZoneCalm: 0.5 }),
      roam,
    );
    expect(roam.activity).toBe(TREE_CREATURE_ACTIVITY.ROAM);
  });

  test('non-finite input invokes a deterministic finite rest fallback without disabling the model', () => {
    const brain = new TreeCreatureBrain(12);
    const action = createTreeCreatureAction();
    const returned = brain.decide(clonePercept({ energy: Number.NaN }), action);
    expect(returned).toBe(action);
    expect(action.usedFallback).toBe(true);
    expect(action.activity).toBe(TREE_CREATURE_ACTIVITY.REST);
    expect(action.steerX).toBe(0);
    expect(action.steerZ).toBe(0);
    expect(action.speed).toBe(0);
    expectFiniteBounded(action);
    expect(brain.status()).toMatchObject({
      modelReady: true,
      fallbackCount: 1,
      lastFallbackReason: 'invalid-input',
    });
  });

  test('non-finite neural output disables the model and invokes the same finite fallback', () => {
    const brain = new TreeCreatureBrain(13);
    brain.weightsView()[0] = Number.NaN; // corrupt the first hidden bias after successful model loading
    const action = createTreeCreatureAction();
    brain.decide(BASE_PERCEPT, action);
    expect(action.usedFallback).toBe(true);
    expect(action.activity).toBe(TREE_CREATURE_ACTIVITY.REST);
    expectFiniteBounded(action);
    expect(brain.status()).toMatchObject({
      modelReady: false,
      fallbackCount: 1,
      lastFallbackReason: 'invalid-output',
    });
  });

  test('invalid model dimensions fall back and valid reload restores operation', () => {
    const brain = new TreeCreatureBrain(14, new Float32Array(3));
    const action = createTreeCreatureAction();
    brain.decide(BASE_PERCEPT, action);
    expect(action.usedFallback).toBe(true);
    expect(brain.status().lastFallbackReason).toBe('invalid-weights');
    expect(brain.loadWeights(responsiveWeights())).toBe(true);
    brain.decide(BASE_PERCEPT, action);
    expect(action.usedFallback).toBe(false);
    expect(brain.status().modelReady).toBe(true);
  });

  test('steady-state decisions reuse the caller-owned action buffer', () => {
    const brain = new TreeCreatureBrain(15);
    const action = createTreeCreatureAction();
    let returned = action;
    for (let step = 0; step < 10_000; step++) {
      returned = brain.decide(clonePercept({ phase: step * 0.001 }), action);
    }
    expect(returned).toBe(action);
    expect(brain.status()).toMatchObject({ decisions: 10_000, fallbackCount: 0 });
    expectFiniteBounded(action);
  });
});
