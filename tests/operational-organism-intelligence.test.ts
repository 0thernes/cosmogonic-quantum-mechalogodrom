import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import { isBrainWired } from '../src/sim/tsotchke-brain-intake';
import { TsotchkeOrganismIntelligence } from '../src/sim/tsotchke-organism-intelligence';
import {
  FENCED_REPO_SLUGS,
  TSOTCHKE_REPO_COUNT,
  getTsotchkeRepoByIndex,
  type TsotchkeRepoSlug,
} from '../src/sim/tsotchke-registry';
import type {
  Entity,
  EntityData,
  OrganismGoalField,
  OrganismIntelligenceSignal,
} from '../src/types';

const INPUT = {
  frame: 0,
  chaos: 0.42,
  entropy: 0.16,
  temperature: 27,
  population: 6_500,
  capacity: 10_000,
  meanMetabolicEnergy: 0.48,
  floraBiomass: 0.62,
};

function buildSignal(ablated?: ReadonlySet<TsotchkeRepoSlug>): OrganismIntelligenceSignal {
  const field = new TsotchkeOrganismIntelligence(0x51a7, { cadenceFrames: 12 });
  const biomass = [0.82, 0.68, 0.51, 0.39];
  for (let i = 0; i < biomass.length; i++) {
    field.step(
      {
        ...INPUT,
        frame: i * 12,
        floraBiomass: biomass[i]!,
        meanMetabolicEnergy: 0.62 - i * 0.06,
      },
      ablated,
      true,
    );
  }
  return field.signal;
}

function semanticSignal(
  channels: readonly [number, number, number, number],
): OrganismIntelligenceSignal {
  return {
    enabled: true,
    indicatorOnly: true,
    revision: 1,
    resourcePressure: 0.5,
    threatResponse: 0.5,
    exploration: 0.5,
    socialDrive: 0.5,
    plasticity: 0.5,
    forecast: 0.5,
    confidence: 1,
    corpusDrive: channels.reduce((sum, value) => sum + value, 0) / 4,
    ecologyRisk: 0.5,
    ecologySurprise: 0.25,
    channels: Float32Array.from(channels),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

function goals(directionX = 1, directionZ = 0): OrganismGoalField {
  return {
    directionX: new Float32Array([directionX]),
    directionZ: new Float32Array([directionZ]),
    desire: new Float32Array([1]),
    cover: new Float32Array([1]),
    revision: new Uint32Array([1]),
  };
}

function entity(): Entity {
  const userData = {
    vel: new THREE.Vector3(),
    age: 40,
    life: 600,
    ph: 0.37,
    energy: 45,
    payoff: 0,
    act: 0,
  } as unknown as EntityData;
  return { userData } as unknown as Entity;
}

function actionFor(signal: OrganismIntelligenceSignal): THREE.Vector3 {
  const brain = new EntityBrainField(1, mulberry32(0xb7a1));
  brain.attachAdaptiveField(signal, goals());
  const organism = entity();
  brain.thinkAll([organism], 4.2, 1.25);
  return organism.userData.vel.clone();
}

describe('ADR-0013 operational organism intelligence', () => {
  test('same seed + history replays the exact stable signal and cadence does not allocate a replacement', () => {
    const a = new TsotchkeOrganismIntelligence(77, { cadenceFrames: 12 });
    const b = new TsotchkeOrganismIntelligence(77, { cadenceFrames: 12 });
    const identity = a.signal;
    for (let i = 0; i < 8; i++) {
      const input = {
        ...INPUT,
        frame: i * 12,
        floraBiomass: 0.8 - i * 0.05,
        meanMetabolicEnergy: 0.64 - i * 0.03,
      };
      expect(a.step(input)).toBe(identity);
      b.step(input);
      expect({ ...a.signal, channels: Array.from(a.signal.channels) }).toEqual({
        ...b.signal,
        channels: Array.from(b.signal.channels),
      });
    }
    const revision = a.signal.revision;
    a.step({ ...INPUT, frame: 85 }); // fewer than 12 frames since frame 84
    expect(a.signal.revision).toBe(revision);
  });

  test('snapshot restore resumes the shared ecological forecast and state-vector stream exactly', () => {
    const source = new TsotchkeOrganismIntelligence(0x7130_2026, { cadenceFrames: 3 });
    for (let i = 0; i < 7; i++) {
      source.step(
        {
          frame: i * 3,
          chaos: 0.2 + i * 0.03,
          entropy: 0.18,
          temperature: 24,
          population: 2_000 + i * 50,
          capacity: 5_000,
          meanMetabolicEnergy: 0.7 - i * 0.03,
          floraBiomass: 0.8 - i * 0.04,
        },
        undefined,
        true,
      );
    }
    const restored = TsotchkeOrganismIntelligence.fromSnapshot(source.snapshot());
    const nextInput = {
      frame: 24,
      chaos: 0.51,
      entropy: 0.23,
      temperature: 31,
      population: 2_700,
      capacity: 5_000,
      meanMetabolicEnergy: 0.39,
      floraBiomass: 0.34,
    };

    source.step(nextInput, undefined, true);
    restored.step(nextInput, undefined, true);
    expect(restored.snapshot()).toEqual(source.snapshot());
  });

  test('Taylor forecast responds to a sustained ecological depletion trend and remains bounded', () => {
    const field = new TsotchkeOrganismIntelligence(91, { cadenceFrames: 1 });
    let first = 0;
    for (let frame = 0; frame < 8; frame++) {
      field.step({
        ...INPUT,
        frame,
        floraBiomass: 0.95 - frame * 0.1,
        meanMetabolicEnergy: 0.8 - frame * 0.06,
      });
      if (frame === 0) first = field.signal.resourcePressure;
      for (const value of [
        field.signal.resourcePressure,
        field.signal.forecast,
        field.signal.plasticity,
        field.signal.confidence,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(field.signal.resourcePressure).toBeGreaterThan(first);
    expect(field.signal.forecast).toBeGreaterThan(0.5);
  });

  test('live simple_mnist predictor learns on cadence and ablation removes its control routes', () => {
    const full = new TsotchkeOrganismIntelligence(0x4d4c_5001, { cadenceFrames: 1 });
    const ablated = new TsotchkeOrganismIntelligence(0x4d4c_5001, { cadenceFrames: 1 });
    const withoutSimpleMnist = new Set<TsotchkeRepoSlug>(['simple_mnist']);
    for (let frame = 0; frame < 12; frame++) {
      const input = {
        ...INPUT,
        frame,
        floraBiomass: frame < 6 ? 0.8 - frame * 0.06 : 0.25 + (frame - 6) * 0.08,
        meanMetabolicEnergy: frame < 6 ? 0.72 - frame * 0.05 : 0.3 + (frame - 6) * 0.07,
      };
      full.step(input);
      ablated.step(input, withoutSimpleMnist);
    }
    const fullSnapshot = full.snapshot();
    const ablatedSnapshot = ablated.snapshot();
    expect(fullSnapshot.ecologyPredictor.updateCount).toBe(11);
    expect(ablatedSnapshot.ecologyPredictor).toEqual(fullSnapshot.ecologyPredictor);
    expect(ablated.signal.ecologyRisk).toBe(0);
    expect(ablated.signal.ecologySurprise).toBe(0);
    expect(ablated.signal.channels[1]).not.toBe(full.signal.channels[1]);
    expect(ablated.signal.resourcePressure).not.toBe(full.signal.resourcePressure);
    expect(ablated.signal.threatResponse).not.toBe(full.signal.threatResponse);
    expect(ablated.signal.plasticity).not.toBe(full.signal.plasticity);
  });

  test('frozen live predictor scores lagged outcomes without mutating its parameters', () => {
    const field = new TsotchkeOrganismIntelligence(0x4d4c_f20a, {
      cadenceFrames: 1,
      ecologyPredictorAdaptive: false,
    });
    const initial = field.snapshot().ecologyPredictor;
    for (let frame = 0; frame < 8; frame++) {
      field.step({
        ...INPUT,
        frame,
        floraBiomass: 0.9 - frame * 0.1,
        meanMetabolicEnergy: 0.8 - frame * 0.07,
      });
    }
    const after = field.snapshot().ecologyPredictor;
    expect(after.adaptive).toBe(false);
    expect(after.updateCount).toBe(0);
    expect({ w1: after.w1, b1: after.b1, w2: after.w2, b2: after.b2 }).toEqual({
      w1: initial.w1,
      b1: initial.b1,
      w2: initial.w2,
      b2: initial.b2,
    });
    expect(field.signal.ecologySurprise).toBeGreaterThan(0);
  });

  test('predictor arm restore cannot cross frozen/adaptive controls and cadence gaps do not train', () => {
    const adaptive = new TsotchkeOrganismIntelligence(0x4d4c_a2a2, { cadenceFrames: 1 });
    adaptive.step({ ...INPUT, frame: 0 });
    const frozen = new TsotchkeOrganismIntelligence(0x4d4c_a2a2, {
      cadenceFrames: 1,
      ecologyPredictorAdaptive: false,
    });
    expect(() => frozen.restore(adaptive.snapshot())).toThrow(/predictor arm/);

    adaptive.setEnabled(false);
    adaptive.setEnabled(true);
    adaptive.step({ ...INPUT, frame: 100, floraBiomass: 0.1 });
    expect(adaptive.snapshot().ecologyPredictor.updateCount).toBe(0);
  });

  test('explicit flora goal improves final resource-direction progress over the identical legacy brain', () => {
    const enhanced = new EntityBrainField(1, mulberry32(0xb7a1));
    const legacy = new EntityBrainField(1, mulberry32(0xb7a1));
    enhanced.attachAdaptiveField(buildSignal(), goals(1, 0));
    const a = entity();
    const b = entity();
    enhanced.thinkAll([a], 4.2, 1.25);
    legacy.thinkAll([b], 4.2, 1.25);
    expect(a.userData.vel.x - b.userData.vel.x).toBeGreaterThan(0.005);
    expect(a.userData.vel.x).toBeGreaterThan(b.userData.vel.x);
  });

  test('positive metabolic reward updates the bounded online actor/value trace', () => {
    const brain = new EntityBrainField(1, mulberry32(123));
    brain.attachAdaptiveField(buildSignal(), goals(1, 0));
    const organism = entity();
    brain.thinkAll([organism], 3, 0);
    const before = brain.adaptiveStateAt(0);
    organism.userData.energy += 20;
    brain.thinkAll([organism], 3, 1 / 60);
    const after = brain.adaptiveStateAt(0);
    expect(after.ready).toBe(true);
    expect(after.value).toBeGreaterThan(before.value);
    expect(Math.abs(after.biasX) + Math.abs(after.biasZ)).toBeGreaterThan(0);
    expect(Math.abs(after.biasX)).toBeLessThanOrEqual(0.35);
    expect(Math.abs(after.biasZ)).toBeLessThanOrEqual(0.35);
  });

  test('online actor/value learning is normalized by simulated time across 30 and 60 Hz', () => {
    const run = (hz: number) => {
      const brain = new EntityBrainField(1, mulberry32(0x30_60_120));
      brain.attachAdaptiveField(buildSignal(), goals(1, 0));
      const organism = entity();
      brain.thinkAll([organism], 3, 0);
      for (let step = 1; step <= hz * 2; step++) {
        const time = step / hz;
        // A smooth, time-indexed reward trajectory isolates the learning clock from render cadence.
        organism.userData.energy = 45 + time * 14 + Math.sin(time * Math.PI) * 3;
        organism.userData.payoff = 0.5;
        organism.userData.vel.set(0, 0, 0);
        brain.thinkAll([organism], 3, time);
      }
      return brain.adaptiveStateAt(0);
    };

    const at30 = run(30);
    const at60 = run(60);
    expect(Math.abs(at30.value - at60.value)).toBeLessThan(0.015);
    expect(Math.abs(at30.biasX - at60.biasX)).toBeLessThan(0.015);
    expect(Math.abs(at30.biasZ - at60.biasZ)).toBeLessThan(0.015);
  });

  test('brain identity follows O(1) slot compaction and newborn slots cannot inherit learned state', () => {
    const brain = new EntityBrainField(2, mulberry32(0x51a7_ba11));
    const goalField: OrganismGoalField = {
      directionX: new Float32Array([1, -1]),
      directionZ: new Float32Array(2),
      desire: new Float32Array([1, 1]),
      cover: new Float32Array([1, 1]),
      revision: new Uint32Array([1, 1]),
    };
    brain.attachAdaptiveField(buildSignal(), goalField);
    const left = entity();
    const right = entity();
    brain.thinkAll([left, right], 3, 0);
    left.userData.energy = 90;
    left.userData.payoff = 2;
    right.userData.energy = 5;
    right.userData.payoff = -2;
    brain.thinkAll([left, right], 3, 1 / 60);
    const beforeLeft = brain.adaptiveStateAt(0);
    const beforeRight = brain.adaptiveStateAt(1);
    expect(beforeLeft.value).not.toBe(beforeRight.value);

    brain.swapEntitySlots(0, 1);
    expect(brain.adaptiveStateAt(0)).toEqual(beforeRight);
    expect(brain.adaptiveStateAt(1)).toEqual(beforeLeft);

    brain.clearEntitySlot(0);
    expect(brain.adaptiveStateAt(0)).toEqual({
      value: 0,
      biasX: 0,
      biasZ: 0,
      lastActionX: 0,
      lastActionZ: 0,
      ready: false,
    });
    expect(brain.adaptiveStateAt(1)).toEqual(beforeLeft);

    brain.resetEntitySlots();
    expect(brain.adaptiveStateAt(0).ready).toBe(false);
    expect(brain.adaptiveStateAt(1).ready).toBe(false);
  });

  test('four semantic recurrent context states follow brain identity and clear on birth/reset', () => {
    const brain = new EntityBrainField(2, mulberry32(0x4c41_4e45));
    const signal = semanticSignal([1, 0, 0, 0]);
    const goalField: OrganismGoalField = {
      directionX: new Float32Array([1, -1]),
      directionZ: new Float32Array(2),
      desire: new Float32Array([1, 1]),
      cover: new Float32Array([1, 1]),
      revision: new Uint32Array([1, 1]),
    };
    brain.attachAdaptiveField(signal, goalField);
    const left = entity();
    const right = entity();
    brain.thinkAll([left, right], 3, 0);
    signal.channels.set([0, 1, 0, 0]);
    brain.thinkIndices([left, right], [0], 3, 1 / 60);

    const beforeLeft = brain.semanticStateAt(0);
    const beforeRight = brain.semanticStateAt(1);
    expect(beforeLeft.ready).toBe(true);
    expect(beforeRight.ready).toBe(true);
    expect(beforeLeft).not.toEqual(beforeRight);
    for (const state of [beforeLeft, beforeRight]) {
      for (const value of [state.resource, state.threat, state.exploration, state.social]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(brain.semanticStorageBytes()).toBe(2 * 17);

    brain.swapEntitySlots(0, 1);
    expect(brain.semanticStateAt(0)).toEqual(beforeRight);
    expect(brain.semanticStateAt(1)).toEqual(beforeLeft);
    brain.clearEntitySlot(0);
    expect(brain.semanticStateAt(0)).toEqual({
      resource: 0,
      threat: 0,
      exploration: 0,
      social: 0,
      ready: false,
    });
    expect(brain.semanticStateAt(1)).toEqual(beforeLeft);
    brain.resetEntitySlots();
    expect(brain.semanticStateAt(0).ready).toBe(false);
    expect(brain.semanticStateAt(1).ready).toBe(false);
  });

  test('semantic recurrence retains a delayed resource cue beyond an otherwise identical stateless control', () => {
    const recurrent = new EntityBrainField(1, mulberry32(0x5e6a_4e71));
    const stateless = new EntityBrainField(1, mulberry32(0x5e6a_4e71));
    stateless.setSemanticRecurrenceEnabled(false);
    const recurrentSignal = semanticSignal([1, 0, 0, 0]);
    const statelessSignal = semanticSignal([1, 0, 0, 0]);
    recurrent.attachAdaptiveField(recurrentSignal, goals(1, 0));
    stateless.attachAdaptiveField(statelessSignal, goals(1, 0));
    const a = entity();
    const b = entity();
    recurrent.thinkAll([a], 3, 0);
    stateless.thinkAll([b], 3, 0);

    recurrentSignal.channels[0] = 0;
    statelessSignal.channels[0] = 0;
    a.userData.vel.set(0, 0, 0);
    b.userData.vel.set(0, 0, 0);
    recurrent.thinkAll([a], 3, 1 / 60);
    stateless.thinkAll([b], 3, 1 / 60);

    expect(recurrent.semanticStateAt(0).resource).toBeGreaterThan(0.5);
    expect(a.userData.vel.x - b.userData.vel.x).toBeGreaterThan(0.001);
  });

  test('semantic recurrent decay is normalized by simulated time across 30 and 60 Hz', () => {
    const run = (hz: number) => {
      const brain = new EntityBrainField(1, mulberry32(0x30_60_5e6a));
      const signal = semanticSignal([1, 0, 0, 0]);
      brain.attachAdaptiveField(signal, goals(1, 0));
      const organism = entity();
      brain.thinkAll([organism], 3, 0);
      signal.channels[0] = 0;
      for (let step = 1; step <= hz * 2; step++) {
        organism.userData.vel.set(0, 0, 0);
        brain.thinkAll([organism], 3, step / hz);
      }
      return brain.semanticStateAt(0);
    };
    const at30 = run(30);
    const at60 = run(60);
    expect(Math.abs(at30.resource - at60.resource)).toBeLessThan(1e-5);
    expect(Math.abs(at30.threat - at60.threat)).toBeLessThan(1e-5);
    expect(Math.abs(at30.exploration - at60.exploration)).toBeLessThan(1e-5);
    expect(Math.abs(at30.social - at60.social)).toBeLessThan(1e-5);
  });

  test('changing the recurrence control clears retained context instead of resuming stale memory', () => {
    const brain = new EntityBrainField(1, mulberry32(0xc1ea_5e6a));
    const signal = semanticSignal([1, 0, 0, 0]);
    brain.attachAdaptiveField(signal, goals(1, 0));
    const organism = entity();
    brain.thinkAll([organism], 3, 0);
    expect(brain.semanticStateAt(0).resource).toBeGreaterThan(0.5);

    brain.setSemanticRecurrenceEnabled(false);
    expect(brain.semanticStateAt(0).ready).toBe(false);
    expect(brain.semanticStateAt(0).resource).toBe(0);
    signal.channels[0] = 0;
    brain.setSemanticRecurrenceEnabled(true);
    brain.thinkAll([organism], 3, 1 / 60);
    expect(brain.semanticStateAt(0).resource).toBeLessThan(0.5);
  });

  test('each named semantic lane has a bounded causal route into final action', () => {
    const run = (channels: readonly [number, number, number, number]) => {
      const brain = new EntityBrainField(1, mulberry32(0x53e4_4e71));
      brain.attachAdaptiveField(semanticSignal(channels), goals(1, 0));
      const organism = entity();
      brain.thinkAll([organism], 3, 0);
      return organism.userData.vel.clone();
    };
    const baseline = run([0, 0, 0, 0]);
    const resource = run([1, 0, 0, 0]);
    const threat = run([0, 1, 0, 0]);
    const exploration = run([0, 0, 1, 0]);
    const social = run([0, 0, 0, 1]);
    const distance = (value: THREE.Vector3) => value.distanceTo(baseline);

    expect(resource.x).toBeGreaterThan(baseline.x);
    expect(threat.y).toBeGreaterThan(baseline.y);
    expect(Math.abs(exploration.z - baseline.z)).toBeGreaterThan(1e-5);
    expect(social.x).toBeGreaterThan(baseline.x);
    for (const action of [resource, threat, exploration, social]) {
      expect(distance(action)).toBeGreaterThan(1e-5);
      expect(Number.isFinite(action.x + action.y + action.z)).toBe(true);
    }
  });

  test('every integrated external repo reaches final organism velocity; fences and meta remain exact zero', () => {
    const baselineSignal = buildSignal();
    const baselineAction = actionFor(baselineSignal);
    const integrated: TsotchkeRepoSlug[] = [];
    const excluded: TsotchkeRepoSlug[] = [];
    for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
      const repo = getTsotchkeRepoByIndex(i);
      if (isBrainWired(repo)) integrated.push(repo.slug);
      else excluded.push(repo.slug);
    }
    expect(integrated).toHaveLength(17);
    expect(excluded).toHaveLength(5); // four fences + .github meta

    for (const slug of integrated) {
      const action = actionFor(buildSignal(new Set([slug])));
      const distance =
        Math.abs(action.x - baselineAction.x) +
        Math.abs(action.y - baselineAction.y) +
        Math.abs(action.z - baselineAction.z);
      expect(distance).toBeGreaterThan(1e-9);
    }
    for (const slug of excluded) {
      const action = actionFor(buildSignal(new Set([slug])));
      expect([action.x, action.y, action.z]).toEqual([
        baselineAction.x,
        baselineAction.y,
        baselineAction.z,
      ]);
    }
    expect(new Set(excluded)).toEqual(new Set([...FENCED_REPO_SLUGS, '.github']));
  });

  test('disabled field is explicit, stable, and contributes no channels', () => {
    const field = new TsotchkeOrganismIntelligence(5, { enabled: false });
    const identity = field.signal;
    expect(field.step(INPUT)).toBe(identity);
    expect(field.signal.enabled).toBe(false);
    expect(field.signal.indicatorOnly).toBe(true);
    expect(Array.from(field.signal.channels)).toEqual([0, 0, 0, 0]);
    expect(field.signal.ecologyRisk).toBe(0);
    expect(field.signal.ecologySurprise).toBe(0);
    expect(field.signal.integratedRepoCount).toBe(0);
  });

  test('10,000 forced fault-injection steps keep every shared signal finite and bounded', () => {
    const field = new TsotchkeOrganismIntelligence(0xf00d_10_00, { cadenceFrames: 1 });
    const faults = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1e12, 1e12];
    for (let frame = 0; frame < 10_000; frame++) {
      const fault = faults[frame % faults.length]!;
      const signal = field.step(
        {
          frame,
          chaos: frame % 7 === 0 ? fault : (frame % 101) / 100,
          entropy: frame % 11 === 0 ? fault : (frame % 97) / 96,
          temperature: frame % 13 === 0 ? fault : 20 + Math.sin(frame * 0.01) * 90,
          population: frame % 17 === 0 ? fault : frame * 10,
          capacity: frame % 19 === 0 ? fault : 50_000,
          meanMetabolicEnergy: frame % 23 === 0 ? fault : (frame % 89) / 88,
          floraBiomass: frame % 29 === 0 ? fault : (frame % 83) / 82,
        },
        undefined,
        true,
      );
      for (const value of [
        signal.resourcePressure,
        signal.threatResponse,
        signal.exploration,
        signal.socialDrive,
        signal.plasticity,
        signal.forecast,
        signal.confidence,
        signal.corpusDrive,
        signal.ecologyRisk,
        signal.ecologySurprise,
        ...signal.channels,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(field.signal.revision).toBe(10_000);
  });
});
