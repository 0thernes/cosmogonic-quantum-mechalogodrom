import { describe, expect, test, spyOn } from 'bun:test';
import { TinyMLP } from '../src/sim/ai/brains';
import { QuantumMind } from '../src/sim/super-qubits';
import { mulberry32 } from '../src/math/rng';
import { SuperMind, SUPER_SENSE_CHANNELS } from '../src/sim/super-mind';
import { SUPER_PLANS, type SuperPercept } from '../src/sim/super-creature';

function percept(overrides: Partial<SuperPercept> = {}): SuperPercept {
  return {
    energy: 0.65,
    threat: 0.2,
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.55,
    preyClose: 0.35,
    rivalClose: 0.15,
    pull: 0.1,
    light: 0.7,
    sound: 0.25,
    phase: 0.125,
    ...overrides,
  };
}

function maxIndex(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i]! > values[best]!) best = i;
  return best;
}

describe('SuperMind observatory provenance', () => {
  test('unstarted telemetry has no fabricated cognition sample or candidates', () => {
    const m = new SuperMind(mulberry32(401));
    const o = m.snapshot().observatory;
    expect(o.tick).toBe(0);
    expect(o.mode).toBe('unstarted');
    expect(o.rawPercept).toBeNull();
    expect(o.activeDepths).toBe(0);
    expect(o.variantsPerDepth).toBe(0);
    expect(o.search).toEqual({ scores: [], novelty: [], selectedVariants: [], evaluated: 0 });
    expect(o.memory).toEqual({ mean: 0, values: [] });
  });

  test('captures original percept separately from the actual eighteen cortex inputs', () => {
    const m = new SuperMind(mulberry32(402));
    const p = percept({ phase: 0.25 });
    const original = { ...p };
    m.think(p);
    p.light = 0;
    const o = m.snapshot().observatory;
    expect(o.rawPercept).toEqual(original);
    expect(o.senses).toHaveLength(SUPER_SENSE_CHANNELS.length);
    expect(SUPER_SENSE_CHANNELS).toHaveLength(18);
    expect(o.senses[0]).toBeCloseTo(original.energy, 6);
    expect(o.senses[8]).toBeCloseTo(original.light, 6);
    expect(o.senses[16]).toBeCloseTo(1, 6);
    expect(o.senses[17]).toBeCloseTo(0, 6);
    expect(o.reasoned).toHaveLength(16);
    expect(o.predicted).toHaveLength(16);
    expect(o.affectOutputs).toHaveLength(3);
    expect(o.selfModel).toHaveLength(4);
  });

  test('records evaluated full/echo candidates and each actual winner instead of a synthetic tree', () => {
    const m = new SuperMind(mulberry32(403));
    m.think(percept(), 'full');
    const full = m.snapshot().observatory;
    expect(full.tick).toBe(1);
    expect(full.mode).toBe('full');
    expect(full.activeDepths).toBe(5);
    expect(full.variantsPerDepth).toBe(5);
    expect(full.search.evaluated).toBe(25);
    expect(full.search.scores).toHaveLength(25);
    expect(full.search.novelty).toHaveLength(25);
    for (let d = 0; d < 5; d++) {
      expect(full.search.selectedVariants[d]).toBe(
        maxIndex(full.search.scores.slice(d * 5, d * 5 + 5)),
      );
    }
    m.think(percept({ phase: 0.3 }), 'echo');
    const echo = m.snapshot().observatory;
    expect(echo.tick).toBe(2);
    expect(echo.mode).toBe('echo');
    expect(echo.activeDepths).toBe(1);
    expect(echo.variantsPerDepth).toBe(1);
    expect(echo.search.evaluated).toBe(1);
    expect(echo.search.scores).toHaveLength(1);
    expect(echo.search.novelty).toHaveLength(1);
    expect(echo.search.selectedVariants).toEqual([0]);
  });

  test('organ telemetry reconstructs the actual attention-weighted aggregate', () => {
    const m = new SuperMind(mulberry32(404));
    m.think(percept());
    const o = m.snapshot().observatory;
    expect(o.organOutputs).toHaveLength(60);
    expect(o.organAttention).toHaveLength(30);
    let first = 0,
      second = 0,
      total = 0;
    for (let k = 0; k < 30; k++) {
      const gain = o.organAttention[k]!;
      // The first channel is stored in Float32 organActs before accumulation in the actual producer.
      first += Math.fround(o.organOutputs[k * 2]! * gain);
      second += o.organOutputs[k * 2 + 1]! * gain;
      total += gain;
    }
    expect(o.organAggregates[0]).toBeCloseTo(first / total, 6);
    expect(o.organAggregates[1]).toBeCloseTo(second / total, 6);
    expect(o.organAggregates[2]).toBeCloseTo(Math.tanh((first / total) * 2), 6);
    expect(o.organAggregates[3]).toBeCloseTo(Math.tanh((second / total) * 2), 6);
  });

  test('action fields match the returned intent and final argmax scores', () => {
    const m = new SuperMind(mulberry32(405));
    const intent = m.think(percept({ threat: 0.8 }));
    const snap = m.snapshot();
    const o = snap.observatory;
    expect(o.actionOutputs).toHaveLength(12);
    expect(o.drives).toEqual({
      move: intent.move,
      aggression: intent.aggression,
      deception: intent.deception,
      dominance: intent.dominance,
      spawn: intent.spawn,
      curiosity: intent.curiosity,
    });
    expect(o.planScores).toHaveLength(SUPER_PLANS.length);
    expect(SUPER_PLANS[maxIndex(o.planScores)]).toBe(intent.plan);
    expect(snap.plan).toBe(intent.plan);
    expect(o.memory.values.length).toBeGreaterThan(0);
    expect(o.memory.values.length).toBeLessThanOrEqual(48);
    expect(o.memory.mean).toBeCloseTo(
      o.memory.values.reduce((sum, v) => sum + v, 0) / o.memory.values.length,
      12,
    );
  });

  test('retained and caller-mutated samples cannot change later model telemetry', () => {
    const m = new SuperMind(mulberry32(406));
    m.think(percept());
    const first = m.snapshot();
    const retained = JSON.stringify({
      observatory: first.observatory,
      consciousness: first.consciousness,
    });
    const caller = m.snapshot();
    caller.observatory.senses[0] = 100;
    caller.observatory.search.scores[0] = 100;
    caller.observatory.rawPercept!.energy = 100;
    caller.observatory.drives.move.x = 100;
    caller.observatory.brain.quantumRaw[0] = 100;
    caller.observatory.brain.metaInput[0] = 100;
    caller.observatory.brain.searchWinnerVectors[0] = 100;
    caller.consciousness.dreaming = 100;
    const fresh = m.snapshot();
    expect(fresh.observatory).toEqual(first.observatory);
    expect(fresh.consciousness).toEqual(first.consciousness);
    m.think(percept({ energy: 0.9, phase: 0.6 }), 'echo');
    expect(
      JSON.stringify({ observatory: first.observatory, consciousness: first.consciousness }),
    ).toBe(retained);
  });

  test('extra observations neither advance samples nor change subsequent cognition', () => {
    const observed = new SuperMind(mulberry32(407));
    const control = new SuperMind(mulberry32(407));
    for (let i = 0; i < 6; i++) {
      const p = percept({ energy: 0.4 + i * 0.05, phase: i / 6 });
      const mode = i % 2 ? 'echo' : 'full';
      expect(observed.think(p, mode)).toEqual(control.think(p, mode));
      const before = observed.snapshot();
      expect(observed.snapshot()).toEqual(before);
      expect(observed.snapshot().observatory.tick).toBe(i + 1);
    }
    expect(observed.snapshot()).toEqual(control.snapshot());
  });

  test('Brain telemetry equals actual receiver arguments at their call time', () => {
    const m = new SuperMind(mulberry32(408));
    const calls: { shape: string; input: number[]; output: number[] }[] = [];
    const forward = TinyMLP.prototype.forward;
    const evolve = QuantumMind.prototype.evolve;
    let qubitInput: number[] = [];
    const networkSpy = spyOn(TinyMLP.prototype, 'forward').mockImplementation(function (
      this: TinyMLP,
      input,
      hidden,
      out,
    ) {
      const values = Array.from(input);
      forward.call(this, input, hidden, out);
      calls.push({
        shape: [this.nIn, this.nHidden, this.nOut].join('/'),
        input: values,
        output: Array.from(out),
      });
    });
    const qubitSpy = spyOn(QuantumMind.prototype, 'evolve').mockImplementation(function (
      this: QuantumMind,
      aspects,
      latent,
    ) {
      qubitInput = Array.from(aspects);
      evolve.call(this, aspects, latent);
    });
    try {
      m.think(percept(), 'full');
    } finally {
      networkSpy.mockRestore();
      qubitSpy.mockRestore();
    }
    const s = m.snapshot(),
      b = s.observatory.brain;
    const first = (shape: string) => calls.find((c) => c.shape === shape)!;
    expect(b.cortexOutput).toEqual(first('18/32/16').output);
    expect(b.imaginationWinner).toEqual(first('16/24/16').input);
    expect(b.quantumRaw).toEqual(first('16/20/10').output);
    expect(b.metaInput).toEqual(first('69/26/12').input);
    expect(b.qubitAspects).toEqual(qubitInput);
    expect(b.consolidatorOutput).toEqual(first('16/16/16').output);
    expect(first('16/16/4').input).toEqual(s.imagined);
    const generators = calls.filter((c) => c.shape === '24/32/16');
    for (let depth = 0; depth < 5; depth++) {
      const selected = s.observatory.search.selectedVariants[depth]!;
      const winner = generators[depth * 5 + selected]!.output;
      expect(b.searchWinnerVectors.slice(depth * 16, (depth + 1) * 16)).toEqual(winner);
      if (depth < 4) expect(generators[(depth + 1) * 5]!.input.slice(0, 16)).toEqual(winner);
    }
  });

  test('Brain payloads expose only completed full/echo slices and snapshots own their copies', () => {
    const m = new SuperMind(mulberry32(409));
    expect(Object.values(m.snapshot().observatory.brain).every((v) => v.length === 0)).toBe(true);
    m.think(percept(), 'full');
    const saved = m.snapshot();
    const before = structuredClone(saved.observatory.brain);
    expect(before.searchWinnerVectors).toHaveLength(80);
    m.think(percept({ phase: 0.7 }), 'echo');
    const current = m.snapshot().observatory.brain;
    expect(current.searchWinnerVectors).toHaveLength(16);
    expect(current.imaginationWinner).toHaveLength(16);
    expect(current.metaInput).toHaveLength(69);
    expect(current.qubitAspects).toHaveLength(10);
    expect(saved.observatory.brain).toEqual(before);
    current.qubitAspects[0] = 99;
    current.cortexOutput[0] = 99;
    expect(m.snapshot().observatory.brain.qubitAspects[0]).not.toBe(99);
    expect(m.snapshot().observatory.brain.cortexOutput[0]).not.toBe(99);
  });
});
