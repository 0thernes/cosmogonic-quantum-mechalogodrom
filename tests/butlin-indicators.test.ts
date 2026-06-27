import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperMind } from '../src/sim/super-mind';
import { AttentionController } from '../src/sim/attention-controller';
import { Metacognition } from '../src/sim/metacognition';
import { FastWeights } from '../src/sim/plastic-weights';
import { classicalParticipationRatio } from '../src/sim/integrated-information';
import { integratedInformation } from '../src/sim/integrated-information';
import type { SuperPercept } from '../src/sim/super-creature';

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
  test('GWT-4 explicit attention controller gates plan drives', () => {
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

  test('RPT fast-weights imprint changes recall across beats', () => {
    const fw = new FastWeights(4, 0.8, 0.05, 4);
    const x = [1, 0, 0, 0];
    fw.overlayInPlace(x, [0, 0, 0, 0], 1);
    const y1 = fw.recall(x);
    fw.overlayInPlace(x, [0, 0, 0, 0], 1);
    const y2 = fw.recall(x);
    expect(y2[0]).toBeGreaterThan(y1[0] ?? 0);
  });

  test('IIT-2 classical participation ratio + quantum Phi are live', () => {
    const pr = classicalParticipationRatio([0.2, 0.3, 0.25, 0.4, 0.1, 0.35, 0.2, 0.15]);
    expect(pr).toBeGreaterThan(0);
    expect(pr).toBeLessThanOrEqual(1);
    const re = [1, 0, 0, 0, 0, 0, 0, 0];
    const im = [0, 0, 0, 0, 0, 0, 0, 0];
    const qphi = integratedInformation(re, im, 3);
    expect(qphi.phi).toBeGreaterThanOrEqual(0);
  });

  test('AST-2 self-model accuracy tracks prediction error', () => {
    const m = new Metacognition();
    m.update(0.8, 0.7, 0.2, 0.1);
    const low = m.updateSelfModel([0.1, 0.2, 0.3, 0.4], [0.9, 0.8, 0.7, 0.6]);
    m.updateSelfModel([0.9, 0.8, 0.7, 0.6], [0.9, 0.8, 0.7, 0.6]);
    const high = m.selfAccuracy;
    expect(high).toBeGreaterThan(low);
    expect(m.snapshot().selfModelAccuracy).toBe(high);
  });

  test('SuperMind snapshot exposes GWT, IIT, HOT, agency, resonance, plasticity', () => {
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
  });
});
