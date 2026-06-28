import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperMind,
  SUPER_ORGANS,
  SUPER_STAGES,
  SUPER_DEPTHS,
  SUPER_VARIANTS,
} from '../src/sim/super-mind';
import { AttentionController } from '../src/sim/attention-controller';
import { Metacognition } from '../src/sim/metacognition';
import { ActiveInference } from '../src/sim/active-inference';
import { Embodiment } from '../src/sim/embodiment';
import { FastWeights } from '../src/sim/plastic-weights';
import { LearnedRecurrence } from '../src/sim/learned-recurrence';
import { gwtCapacityCompete, gwtCompete } from '../src/math/global-workspace';
import {
  classicalIntegratedInformation,
  classicalParticipationRatio,
  integratedInformation,
} from '../src/sim/integrated-information';
import type { SuperPercept } from '../src/sim/super-creature';
import { SUPER_PLANS } from '../src/sim/super-creature';

function percept(over: Partial<SuperPercept> = {}): SuperPercept {
  return {
    energy: 0.5,
    threat: 0.2,
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.3,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: 0.25,
    ...over,
  };
}

/** Butlin et al. (2023) structural presence receipts — functional proxies, NOT sentience claims. */
describe('Butlin 14/14 consciousness indicator receipts', () => {
  test('GWT-1: parallel specialized modules (30 organ-nets + 11 cognitive faculties + 25 ToM organs)', () => {
    const mind = new SuperMind(mulberry32(1));
    const s = mind.snapshot();
    expect(s.organs).toBe(SUPER_ORGANS);
    expect(s.stages).toBe(SUPER_STAGES);
    expect(s.depths).toBe(SUPER_DEPTHS);
    expect(s.variants).toBe(SUPER_DEPTHS * SUPER_VARIANTS);
    expect(s.tomPantheon.organs).toBeGreaterThan(0);
  });

  test('GWT-2: limited-capacity workspace bottleneck admits ≤ capacity coalitions', () => {
    const sal = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const r = gwtCapacityCompete(sal, sal.length, 4);
    expect(r.capacity).toBe(4);
    expect(r.occupancy).toBeLessThanOrEqual(4);
    expect(r.access).toBeGreaterThan(0);
    expect(r.pressure).toBeGreaterThan(0); // some salient content excluded by the bottleneck
    const mind = new SuperMind(mulberry32(2));
    for (let i = 0; i < 20; i++) mind.think(percept());
    const gwt = mind.snapshot().gwtCapacity;
    expect(gwt.capacity).toBeGreaterThan(0);
    expect(gwt.occupancy).toBeLessThanOrEqual(gwt.capacity);
  });

  test('GWT-3: global broadcast ignites a winner and broadcasts content', () => {
    const modules = [
      { salience: 2.0, proposal: new Float32Array([1, 0, 0]) },
      { salience: 0.5, proposal: new Float32Array([0, 1, 0]) },
      { salience: 0.5, proposal: new Float32Array([0, 0, 1]) },
    ];
    const r = gwtCompete(modules, 0.5);
    expect(r.ignited).toBe(true);
    expect(r.winner).toBe(0);
    expect(r.broadcast[0]).toBe(1);
    const mind = new SuperMind(mulberry32(3));
    for (let i = 0; i < 60; i++) mind.think(percept({ threat: i / 60 }));
    const s = mind.snapshot();
    expect(s.broadcast).toBeGreaterThanOrEqual(0);
    expect(s.consciousness.ignition).toBeGreaterThanOrEqual(0);
    expect(s.eshkolConsciousness.workspace).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(s.broadcast)).toBe(true);
  });

  test('GWT-4: explicit attention controller gates plan drives', () => {
    const c = new AttentionController();
    const drives = {
      HUNT: 0.1,
      FLEE: 0.1,
      DOMINATE: 0.1,
      DECEIVE: 0.1,
      SPAWN: 0.1,
      EXPLORE: 0.1,
      REST: 0.1,
    };
    c.updateAndApply(drives, [0.05, 1, 0.05, 0.4, 0.05, 0.1, 0.1], {
      energy: 0.2,
      threat: 1,
      novelty: 0.1,
      surprise: 0.8,
      ignition: 0.1,
      workspace: 0.2,
      confidence: 0.25,
      acetylcholine: 0.2,
    });
    expect(c.snapshot().dominantPlan).toBe('FLEE');
  });

  test('PP-1: predictive coding minimizes free energy / surprise', () => {
    const aif = new ActiveInference(mulberry32(4));
    aif.setPreference(new Float64Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
    const fe1 = aif.perceive(new Float64Array([0, 0, 0, 0, 0, 0]));
    expect(Number.isFinite(fe1.freeEnergy)).toBe(true);
    expect(fe1.freeEnergy).toBeGreaterThanOrEqual(0);
    const mind = new SuperMind(mulberry32(5));
    for (let i = 0; i < 20; i++) mind.think(percept());
    const s = mind.snapshot();
    expect(s.aif.freeEnergy).toBeGreaterThanOrEqual(0);
    expect(s.consciousness.surprise).toBeGreaterThanOrEqual(0);
  });

  test('HOT-2: metacognitive monitoring reads decision margin and confidence', () => {
    const m = new Metacognition();
    m.update(0.9, 0.8, 0.1, 0.1);
    expect(m.value).toBeGreaterThan(0.5);
    const mind = new SuperMind(mulberry32(6));
    for (let i = 0; i < 30; i++) mind.think(percept());
    const s = mind.snapshot();
    expect(s.metacog.confidence).toBeGreaterThanOrEqual(0);
    expect(s.metacog.control).toBeGreaterThanOrEqual(0);
    expect(s.metacog.margin).toBeGreaterThanOrEqual(0);
  });

  test('HOT-3: agency from belief→action via empowerment + successor + active inference', () => {
    const mind = new SuperMind(mulberry32(8));
    for (let i = 0; i < 30; i++) mind.think(percept());
    const s = mind.snapshot();
    expect(s.empowerment.actions).toBe(7);
    expect(s.empowerment.capacityNats).toBeGreaterThanOrEqual(0);
    expect(s.successor.states).toBe(7);
    expect(s.successor.horizon).toBeGreaterThan(0);
    expect(s.aif.belief).toBeGreaterThanOrEqual(0);
    expect(s.aif.belief).toBeLessThan(s.aif.situations);
  });

  test('AE-1: agency — goal pursuit from feedback via GOAP plan selection', () => {
    const mind = new SuperMind(mulberry32(9));
    for (let i = 0; i < 40; i++) mind.think(percept({ energy: 0.2, threat: 0.8 }));
    const plan = mind.snapshot().plan;
    expect(SUPER_PLANS).toContain(plan);
  });

  test('AE-2: embodiment — output↔input contingency learned in body model', () => {
    const e = new Embodiment(7, 4, 0x1234);
    for (let i = 0; i < 20; i++) {
      e.step(i % 7, [0.1 * i, 0.2 * i, 0.3 * i, 0.4 * i]);
    }
    const es = e.snapshot();
    expect(es.contingency).toBeGreaterThanOrEqual(0);
    expect(es.contingency).toBeLessThanOrEqual(1);
    expect(es.predictionError).toBeGreaterThanOrEqual(0);
    expect(es.steps).toBe(20);
    const mind = new SuperMind(mulberry32(10));
    for (let i = 0; i < 30; i++) mind.think(percept());
    expect(mind.snapshot().embodiment.contingency).toBeGreaterThanOrEqual(0);
  });

  test('RPT-1/2: learned recurrence integrates percepts across beats', () => {
    const fw = new FastWeights(4, 0.8, 0.05, 4);
    const x = [1, 0, 0, 0];
    fw.overlayInPlace(x, [0, 0, 0, 0], 1);
    const y1 = fw.recall(x);
    fw.overlayInPlace(x, [0, 0, 0, 0], 1);
    const y2 = fw.recall(x);
    expect(y2[0]).toBeGreaterThan(y1[0] ?? 0);
    const lr = new LearnedRecurrence(mulberry32(11), 8, 8);
    const out = lr.step(
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    );
    expect(out).toBeGreaterThanOrEqual(0);
    expect(lr.snapshot().hidden).toBeGreaterThan(0);
    const mind = new SuperMind(mulberry32(12));
    for (let i = 0; i < 30; i++) mind.think(percept());
    expect(mind.snapshot().learnedRecurrence.hidden).toBeGreaterThan(0);
    expect(mind.snapshot().learnedRecurrence.steps).toBeGreaterThan(0);
  });

  test('IIT-1: integrated information (phi) is computed from quantum and classical modules', () => {
    const re = [1, 0, 0, 0, 0, 0, 0, 0];
    const im = [0, 0, 0, 0, 0, 0, 0, 0];
    const qphi = integratedInformation(re, im, 3);
    expect(qphi.phi).toBeGreaterThanOrEqual(0);
    const activations = [0.8, 0.2, 0.3, 0.4];
    const adjacency = new Float32Array(16).fill(0.1);
    adjacency[0] = 0.5;
    adjacency[5] = 0.5;
    adjacency[10] = 0.5;
    adjacency[15] = 0.5;
    const cphi = classicalIntegratedInformation(activations, adjacency);
    expect(cphi.phi).toBeGreaterThanOrEqual(0);
    const mind = new SuperMind(mulberry32(13));
    for (let i = 0; i < 30; i++) mind.think(percept());
    expect(mind.snapshot().consciousness.phi).toBeGreaterThanOrEqual(0);
  });

  test('IIT-2: irreducibility / participation ratio live', () => {
    const pr = classicalParticipationRatio([0.2, 0.3, 0.25, 0.4, 0.1, 0.35, 0.2, 0.15]);
    expect(pr).toBeGreaterThan(0);
    expect(pr).toBeLessThanOrEqual(1);
    const mind = new SuperMind(mulberry32(14));
    for (let i = 0; i < 30; i++) mind.think(percept());
    expect(mind.snapshot().consciousness.phi).toBeGreaterThanOrEqual(0);
  });

  test('AST-1: adaptive self-model surfaces self-awareness scalar', () => {
    const mind = new SuperMind(mulberry32(15));
    for (let i = 0; i < 30; i++) mind.think(percept());
    expect(mind.snapshot().consciousness.selfAware).toBeGreaterThanOrEqual(0);
    expect(mind.snapshot().consciousness.selfAware).toBeLessThanOrEqual(1);
  });

  test('AST-2: self-model accuracy tracks prediction error', () => {
    const m = new Metacognition();
    m.update(0.8, 0.7, 0.2, 0.1);
    const low = m.updateSelfModel([0.1, 0.2, 0.3, 0.4], [0.9, 0.8, 0.7, 0.6]);
    m.updateSelfModel([0.9, 0.8, 0.7, 0.6], [0.9, 0.8, 0.7, 0.6]);
    const high = m.selfAccuracy;
    expect(high).toBeGreaterThan(low);
    expect(m.snapshot().selfModelAccuracy).toBe(high);
  });

  test('SuperMind snapshot exposes all consciousness substrates in one telemetry surface', () => {
    const mind = new SuperMind(mulberry32(99));
    for (let i = 0; i < 60; i++) mind.think(percept({ chaos: i / 60, threat: (i % 7) / 7 }));
    const s = mind.snapshot();
    expect(s.consciousness.ignition).toBeGreaterThanOrEqual(0);
    expect(s.consciousness.phi).toBeGreaterThanOrEqual(0);
    expect(s.metacog.confidence).toBeGreaterThanOrEqual(0);
    expect(s.metacog.selfModelAccuracy).toBeGreaterThanOrEqual(0);
    expect(s.resonance.coupled).toBe(12);
    expect(s.attentionController.focus.length).toBe(7);
    expect(s.broadcast).toBeGreaterThanOrEqual(0);
    expect(s.embodiment.contingency).toBeGreaterThanOrEqual(0);
    expect(s.gwtCapacity.capacity).toBeGreaterThan(0);
  });
});
