/**
 * Tests for the NHI super-mind (src/sim/nhi.ts) and the game-theory primitives it leans on
 * (src/sim/ai/brains.ts). Everything is pure + seeded, so the contract is: same seed ⇒ same mind ⇒
 * same decisions, bit-for-bit. We also assert the apex decision stays well-formed and that distinct
 * seeds yield distinct personalities (the world must not fill with identical clones).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  bestResponse,
  iteratedMove,
  regretMatch,
  GameStrategy,
  TinyMLP,
} from '../src/sim/ai/brains';
import { NhiMind, NhiAction, type NhiPercept } from '../src/sim/nhi';

describe('game theory: bestResponse', () => {
  test('picks the row maximizing expected payoff', () => {
    // Prisoner's dilemma payoff (row player): C=[3,0], D=[5,1]; row-major 2x2.
    const payoff = [3, 0, 5, 1];
    // Opponent certain to cooperate → defect (row 1) dominates.
    expect(bestResponse(payoff, 2, 2, [1, 0])).toBe(1);
    // Opponent certain to defect → defect still dominates (1 > 0).
    expect(bestResponse(payoff, 2, 2, [0, 1])).toBe(1);
  });
  test('ties resolve to the lowest index; empty → -1', () => {
    expect(bestResponse([2, 2, 2, 2], 2, 2, [0.5, 0.5])).toBe(0);
    expect(bestResponse([], 0, 0, [])).toBe(-1);
  });
});

describe('game theory: iteratedMove', () => {
  const rng = mulberry32(1);
  test('TIT_FOR_TAT cooperates first, then mirrors', () => {
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, -1, false, 0, rng)).toBe(0);
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, 1, true, 1, rng)).toBe(1);
    expect(iteratedMove(GameStrategy.TIT_FOR_TAT, 0, true, 2, rng)).toBe(0);
  });
  test('GRUDGER cooperates until betrayed, then defects forever', () => {
    expect(iteratedMove(GameStrategy.GRUDGER, 0, false, 5, rng)).toBe(0);
    expect(iteratedMove(GameStrategy.GRUDGER, 0, true, 6, rng)).toBe(1);
  });
  test('ALWAYS_DEFECT always defects', () => {
    expect(iteratedMove(GameStrategy.ALWAYS_DEFECT, 0, false, 0, rng)).toBe(1);
  });
  test('PROBER opens with a defection then probes', () => {
    expect(iteratedMove(GameStrategy.PROBER, -1, false, 0, rng)).toBe(1);
    expect(iteratedMove(GameStrategy.PROBER, 1, false, 1, rng)).toBe(0);
    // round>2 and the opponent kept cooperating → exploit them (defect).
    expect(iteratedMove(GameStrategy.PROBER, 0, false, 3, rng)).toBe(1);
  });
  test('GENEROUS_TFT sometimes forgives a defection (deterministic per seed)', () => {
    const r = mulberry32(42);
    let forgave = 0;
    for (let i = 0; i < 200; i++)
      if (iteratedMove(GameStrategy.GENEROUS_TFT, 1, true, i, r) === 0) forgave++;
    expect(forgave).toBeGreaterThan(0); // forgives some
    expect(forgave).toBeLessThan(200); // but not all
  });
});

describe('game theory: regretMatch', () => {
  test('with no positive regret, returns a valid in-range action', () => {
    const a = regretMatch([0, 0, 0], 3, mulberry32(7));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(3);
  });
  test('favors the highest-regret action', () => {
    const counts = [0, 0, 0];
    const rng = mulberry32(9);
    for (let i = 0; i < 1000; i++) {
      const a = regretMatch([1, 8, 1], 3, rng);
      counts[a] = (counts[a] ?? 0) + 1;
    }
    expect((counts[1] ?? 0) > (counts[0] ?? 0)).toBe(true);
    expect((counts[1] ?? 0) > (counts[2] ?? 0)).toBe(true);
  });
  test('empty → -1', () => {
    expect(regretMatch([], 0, mulberry32(1))).toBe(-1);
  });
});

const PERCEPT: NhiPercept = {
  beat: 0,
  energy: 0.6,
  crowding: 0.4,
  chaos: 0.3,
  threat: 0.2,
  rivalFaction: 2,
  rivalLastMove: 1,
};

describe('NhiMind', () => {
  test('exposes honest 3/6/12 capacity tiers with a 9-input semantic gene', () => {
    for (const [hidden, weights] of [
      [3, 58],
      [6, 109],
      [12, 211],
    ] as const) {
      const snap = new NhiMind(mulberry32(100 + hidden), { geneHidden: hidden }).snapshot();
      expect(snap.dims).toEqual({ in: 9, hid: hidden, out: 7 });
      expect(snap.sensory.length).toBe(9);
      expect(snap.hidden.length).toBe(hidden);
      expect(snap.output.length).toBe(7);
      expect(snap.weights.length).toBe(weights);
      expect(snap.neuralSemanticInputs).toBe(true);
    }
    expect(() => new NhiMind(mulberry32(1), { geneHidden: 4 as never })).toThrow(RangeError);
    expect(() => new NhiMind(mulberry32(1), { neuralSemanticInputs: 'yes' as never })).toThrow(
      TypeError,
    );
  });

  test('zero corpus lanes preserve the legacy 5→6→7 neural outputs and birth RNG position', () => {
    const seed = 0x5e6a7;
    const referenceRng = mulberry32(seed);
    // Historical birth layout: five traits, 12×12 voice transitions, then 85 gene weights.
    for (let i = 0; i < 5 + 12 * 12; i++) referenceRng();
    const legacyWeights = new Float32Array(TinyMLP.weightCount(5, 6, 7));
    for (let i = 0; i < legacyWeights.length; i++) legacyWeights[i] = referenceRng() * 2 - 1;
    const expectedNextDraw = referenceRng();

    const birthRng = mulberry32(seed);
    const mind = new NhiMind(birthRng);
    expect(birthRng()).toBe(expectedNextDraw);

    mind.think(PERCEPT, mulberry32(0xdec1de));
    const snap = mind.snapshot();
    expect(snap.sensory.slice(5)).toEqual([0, 0, 0, 0]);

    const legacy = new TinyMLP(5, 6, 7, legacyWeights);
    const hidden = new Float32Array(6);
    const output = new Float32Array(7);
    legacy.forward(snap.sensory.slice(0, 5), hidden, output);
    expect(snap.hidden).toEqual(Array.from(hidden));
    expect(snap.output).toEqual(Array.from(output));
  });

  test('each neural semantic lane has a deterministic monotone trace toward its inherited action', () => {
    const lanes = [
      ['corpusResource', 5, NhiAction.HUNT],
      ['corpusThreat', 6, NhiAction.RETREAT],
      ['corpusExplore', 7, NhiAction.MIMIC],
      ['corpusSocial', 8, NhiAction.SPAWN_SWARM],
    ] as const;

    for (const [lane, sensoryIndex, target] of lanes) {
      const trace = [0, 0.25, 0.5, 0.75, 1].map((level) => {
        const mind = new NhiMind(mulberry32(0x51a9));
        mind.think({ ...PERCEPT, [lane]: level }, mulberry32(0xca05e));
        const snap = mind.snapshot();
        expect(snap.sensory[sensoryIndex]).toBe(level);
        return snap.output[target] ?? Number.NaN;
      });
      expect(trace.every(Number.isFinite)).toBe(true);
      for (let i = 1; i < trace.length; i++) {
        expect(trace[i]).toBeGreaterThanOrEqual(trace[i - 1] ?? -Infinity);
      }
      expect(trace.at(-1)).toBeGreaterThan(trace[0] ?? Infinity);
    }
  });

  test('neural semantic ablation zeros only neural lanes while hand-written routes stay live', () => {
    const driven: NhiPercept = {
      ...PERCEPT,
      corpusResource: 1,
      corpusThreat: 1,
      corpusExplore: 1,
      corpusSocial: 1,
    };
    const active = new NhiMind(mulberry32(0xab1a), { neuralSemanticInputs: true });
    const ablated = new NhiMind(mulberry32(0xab1a), { neuralSemanticInputs: false });
    active.think(driven, mulberry32(0xc0de));
    ablated.think(driven, mulberry32(0xc0de));
    expect(active.snapshot().sensory.slice(5)).toEqual([1, 1, 1, 1]);
    expect(ablated.snapshot().sensory.slice(5)).toEqual([0, 0, 0, 0]);
    expect(ablated.snapshot().neuralSemanticInputs).toBe(false);

    const routeDelta = (lane: Partial<NhiPercept>, action: number): number => {
      const baseline = new NhiMind(mulberry32(0x771), { neuralSemanticInputs: false });
      const operational = new NhiMind(mulberry32(0x771), { neuralSemanticInputs: false });
      baseline.think(PERCEPT, mulberry32(0x772));
      operational.think({ ...PERCEPT, ...lane }, mulberry32(0x772));
      return (
        (operational.snapshot().scores[action] ?? 0) - (baseline.snapshot().scores[action] ?? 0)
      );
    };
    expect(routeDelta({ corpusResource: 1 }, NhiAction.HUNT)).toBeCloseTo(0.35, 5);
    expect(routeDelta({ corpusThreat: 1 }, NhiAction.RETREAT)).toBeCloseTo(0.3, 5);
    expect(routeDelta({ corpusExplore: 1 }, NhiAction.MIMIC)).toBeCloseTo(0.18, 5);
    expect(routeDelta({ corpusSocial: 1 }, NhiAction.SPAWN_SWARM)).toBeCloseTo(0.24, 5);
  });

  test('invalid corpus telemetry is normalized before neural and utility consumption', () => {
    const cases = [
      {
        drives: {
          corpusResource: Number.NaN,
          corpusThreat: Number.POSITIVE_INFINITY,
          corpusExplore: Number.NEGATIVE_INFINITY,
          corpusSocial: 99,
          corpusConfidence: Number.NaN,
        },
        expectedLanes: [0, 0, 0, 1],
      },
      {
        drives: {
          corpusResource: -10,
          corpusThreat: 10,
          corpusExplore: 0.5,
          corpusSocial: Number.NaN,
          corpusConfidence: Number.POSITIVE_INFINITY,
        },
        expectedLanes: [0, 1, 0.5, 0],
      },
    ] as const;

    for (const [index, { drives, expectedLanes }] of cases.entries()) {
      const mind = new NhiMind(mulberry32(0xfa17 + index));
      const intent = mind.think({ ...PERCEPT, ...drives }, mulberry32(0xb0ad + index));
      const snap = mind.snapshot();
      expect(snap.sensory.slice(5)).toEqual(Array.from(expectedLanes));
      expect(snap.sensory.every((value) => Number.isFinite(value) && Math.abs(value) <= 1)).toBe(
        true,
      );
      expect(snap.hidden.every((value) => Number.isFinite(value) && Math.abs(value) <= 1)).toBe(
        true,
      );
      expect(snap.output.every((value) => Number.isFinite(value) && Math.abs(value) <= 1)).toBe(
        true,
      );
      expect(snap.scores.every((value) => Number.isFinite(value) && Math.abs(value) <= 5)).toBe(
        true,
      );
      expect(intent.action).toBeGreaterThanOrEqual(0);
      expect(intent.action).toBeLessThan(7);
    }
  });

  test('hostile core, kin, and rival telemetry cannot poison persistent cognition', () => {
    const mind = new NhiMind(mulberry32(0xfa117));
    const intent = mind.think(
      {
        beat: Number.POSITIVE_INFINITY,
        energy: Number.NaN,
        crowding: Number.POSITIVE_INFINITY,
        chaos: Number.NEGATIVE_INFINITY,
        threat: Number.NaN,
        rivalFaction: Number.MAX_SAFE_INTEGER,
        rivalLastMove: 99,
        kinPresence: Number.POSITIVE_INFINITY,
        kinMood: Number.NaN,
      },
      mulberry32(0xb0a4d),
    );
    const first = mind.snapshot();
    expect(intent.target).toBe(-1);
    expect(intent.magnitude).toBeGreaterThanOrEqual(0);
    expect(intent.magnitude).toBeLessThanOrEqual(1);
    expect(Number.isFinite(intent.magnitude)).toBe(true);
    expect(first.rivalCount).toBe(0);
    for (const values of [
      first.sensory,
      first.hidden,
      first.output,
      first.scores,
      first.policy,
      first.regret,
      first.memory,
    ]) {
      expect(values.every(Number.isFinite)).toBe(true);
    }
    expect(Number.isFinite(first.mood)).toBe(true);
    expect(Number.isFinite(first.policyTemperature)).toBe(true);

    // A valid later beat remains healthy, proving the hostile sample did not enter persistent state.
    mind.think({ ...PERCEPT, beat: 1 }, mulberry32(0x5afe));
    const recovered = mind.snapshot();
    expect(recovered.memory.every(Number.isFinite)).toBe(true);
    expect(recovered.regret.every(Number.isFinite)).toBe(true);
    expect(recovered.policy.every(Number.isFinite)).toBe(true);
  });

  test('counterfactual regret develops positive mass instead of remaining in uniform fallback', () => {
    const mind = new NhiMind(mulberry32(0x5e9e7));
    const rng = mulberry32(0xa11ce);
    for (let beat = 0; beat < 256; beat++) {
      mind.think(
        {
          ...PERCEPT,
          beat,
          chaos: 0.85,
          threat: (beat % 7) / 6,
          corpusResource: (beat % 5) / 4,
          corpusExplore: ((beat + 2) % 5) / 4,
        },
        rng,
      );
    }
    const regret = mind.snapshot().regret;
    expect(regret.every(Number.isFinite)).toBe(true);
    expect(regret.some((value) => value > 1e-6)).toBe(true);
    expect(Math.max(...regret) - Math.min(...regret)).toBeGreaterThan(0.01);
    const snapshot = mind.snapshot();
    expect(snapshot.policy.reduce((sum, probability) => sum + probability, 0)).toBeCloseTo(1, 5);
    expect(snapshot.policy[snapshot.lastAction]).toBeGreaterThanOrEqual(0);
    const maxScore = Math.max(...snapshot.scores);
    const softmax = snapshot.scores.map((score) =>
      Math.exp((score - maxScore) / snapshot.policyTemperature),
    );
    const softmaxTotal = softmax.reduce((sum, weight) => sum + weight, 0);
    const positiveRegret = snapshot.policyRegret.reduce(
      (sum, value) => sum + Math.max(0, value),
      0,
    );
    for (let i = 0; i < snapshot.policy.length; i++) {
      const regretProbability =
        positiveRegret > 0
          ? Math.max(0, snapshot.policyRegret[i] ?? 0) / positiveRegret
          : 1 / snapshot.policy.length;
      const expected =
        (1 - snapshot.regretMix) * ((softmax[i] ?? 0) / softmaxTotal) +
        snapshot.regretMix * regretProbability;
      expect(snapshot.policy[i]).toBeCloseTo(expected, 12);
    }
    expect(snapshot.policyRegret).not.toEqual(snapshot.regret); // pre-choice vs post-choice slices
  });

  test('GOAP facts advance only on acknowledged material outcomes', () => {
    const preconditioned = new NhiMind(mulberry32(0xd011));
    preconditioned.acknowledge(NhiAction.DOMINATE, true);
    expect(preconditioned.snapshot().facts).toBe(0); // DOMINATE requires acknowledged SWARM

    const mind = new NhiMind(mulberry32(0xacce55));
    expect(mind.snapshot().facts).toBe(0);
    mind.acknowledge(NhiAction.SPAWN_SWARM, false);
    expect(mind.snapshot().facts).toBe(0);
    mind.acknowledge(NhiAction.SPAWN_SWARM, true);
    expect(mind.snapshot().facts).toBe(1);
    expect(mind.snapshot().plannedAction).not.toBe(NhiAction.SPAWN_SWARM);
    mind.acknowledge(NhiAction.DOMINATE, true);
    expect(mind.snapshot().facts).toBe(5);
    expect(mind.snapshot().plannedAction).toBe(NhiAction.MANIPULATE);
    // DOMINATE + DECEIVE completes the declared goal and starts a fresh scheme.
    mind.acknowledge(NhiAction.MANIPULATE, true);
    expect(mind.snapshot().facts).toBe(0);
    expect(mind.snapshot().plannedAction).toBe(NhiAction.MANIPULATE);
    expect(() => mind.acknowledge(99 as never, true)).toThrow(RangeError);
    expect(() => mind.acknowledge(NhiAction.HUNT, 'yes' as never)).toThrow(TypeError);
  });

  test('is bit-reproducible: same seed ⇒ identical decision stream', () => {
    const run = (): string => {
      const mind = new NhiMind(mulberry32(123));
      const rng = mulberry32(456);
      const out: string[] = [];
      for (let b = 0; b < 30; b++) {
        const intent = mind.think({ ...PERCEPT, beat: b }, rng);
        out.push(
          `${intent.action}:${intent.spawn}:${intent.ownMove}:${intent.utterance.join(',')}`,
        );
      }
      return out.join('|');
    };
    expect(run()).toBe(run());
  });

  test('emits well-formed intents', () => {
    const mind = new NhiMind(mulberry32(5));
    const rng = mulberry32(6);
    for (let b = 0; b < 100; b++) {
      const intent = mind.think({ ...PERCEPT, beat: b, chaos: (b % 10) / 10 }, rng);
      expect(intent.action).toBeGreaterThanOrEqual(0);
      expect(intent.action).toBeLessThan(7);
      expect(intent.spawn).toBeGreaterThanOrEqual(0);
      expect(intent.magnitude).toBeGreaterThanOrEqual(0);
      expect(intent.magnitude).toBeLessThanOrEqual(1);
      expect(intent.utterance.length).toBeGreaterThan(0);
      for (const g of intent.utterance) {
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThan(12);
      }
      // SPAWN_SWARM must release ≥1; every other action releases none.
      if (intent.action === NhiAction.SPAWN_SWARM) expect(intent.spawn).toBeGreaterThan(0);
      else expect(intent.spawn).toBe(0);
      // MANIPULATE targets a faction; nothing else does.
      if (intent.action === NhiAction.MANIPULATE) expect(intent.target).toBe(PERCEPT.rivalFaction);
      else expect(intent.target).toBe(-1);
    }
  });

  test('distinct seeds → distinct personalities (no clone army)', () => {
    const a = new NhiMind(mulberry32(1));
    const b = new NhiMind(mulberry32(2));
    const traits = (m: NhiMind): number[] => [
      m.narcissism,
      m.aggression,
      m.deceit,
      m.hallucination,
      m.volatility,
    ];
    expect(traits(a)).not.toEqual(traits(b));
    for (const t of [...traits(a), ...traits(b)]) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  test('produces a variety of actions over time (not stuck on one)', () => {
    const mind = new NhiMind(mulberry32(77));
    const rng = mulberry32(88);
    const seen = new Set<number>();
    for (let b = 0; b < 300; b++) {
      const energy = (b % 7) / 7;
      const threat = ((b * 3) % 5) / 5;
      seen.add(mind.think({ ...PERCEPT, beat: b, energy, threat, chaos: (b % 4) / 4 }, rng).action);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3); // a scheming mind explores its options
  });

  test('corpus drives change the decision trace under an identical seed and percept history', () => {
    const trace = (operational: boolean): number[] => {
      const mind = new NhiMind(mulberry32(909));
      const rng = mulberry32(707);
      const out: number[] = [];
      for (let beat = 0; beat < 100; beat++) {
        out.push(
          mind.think(
            {
              ...PERCEPT,
              beat,
              energy: 0.45,
              crowding: 0.45,
              chaos: 0.25,
              threat: 0.25,
              ...(operational
                ? {
                    corpusResource: 1,
                    corpusThreat: 1,
                    corpusSocial: 1,
                    corpusExplore: 1,
                    corpusConfidence: 1,
                  }
                : {}),
            },
            rng,
          ).action,
        );
      }
      return out;
    };

    const baseline = trace(false);
    const operational = trace(true);
    expect(operational).toEqual(trace(true));
    expect(operational).not.toEqual(baseline);
    expect(operational.filter((action, i) => action !== baseline[i]).length).toBeGreaterThan(0);
  });

  test('spawnChild yields a mutated but valid offspring mind', () => {
    const parent = new NhiMind(mulberry32(11));
    const child = parent.spawnChild(mulberry32(12));
    const rng = mulberry32(13);
    const intent = child.think(PERCEPT, rng);
    expect(intent.action).toBeGreaterThanOrEqual(0);
    expect(intent.action).toBeLessThan(7);
  });

  test('spawnChild preserves expanded architecture/control and mutates inherited weights in bounds', () => {
    const parent = new NhiMind(mulberry32(0xa11ce), {
      geneHidden: 12,
      neuralSemanticInputs: false,
    });
    const child = parent.spawnChild(mulberry32(0xb17));
    const p = parent.snapshot();
    const c = child.snapshot();
    expect(c.dims).toEqual({ in: 9, hid: 12, out: 7 });
    expect(c.neuralSemanticInputs).toBe(false);
    expect(c.weights.length).toBe(211);
    const deltas = c.weights.map((weight, i) => Math.abs(weight - (p.weights[i] ?? 0)));
    expect(deltas.every((delta) => Number.isFinite(delta) && delta <= 0.150001)).toBe(true);
    expect(deltas.filter((delta) => delta > 0).length).toBeGreaterThan(200);
    expect(
      c.weights.every((weight) => Number.isFinite(weight) && Math.abs(weight) <= 1.150001),
    ).toBe(true);
  });

  test('expanded-tier decisions and neural bounds remain deterministic', () => {
    const runExpanded = (): { actions: number[]; snapshot: ReturnType<NhiMind['snapshot']> } => {
      const mind = new NhiMind(mulberry32(0x12e), { geneHidden: 12 });
      const rng = mulberry32(0xd371);
      const actions: number[] = [];
      for (let beat = 0; beat < 40; beat++) {
        actions.push(
          mind.think(
            {
              ...PERCEPT,
              beat,
              corpusResource: (beat % 5) / 4,
              corpusThreat: ((beat + 1) % 5) / 4,
              corpusExplore: ((beat + 2) % 5) / 4,
              corpusSocial: ((beat + 3) % 5) / 4,
            },
            rng,
          ).action,
        );
      }
      return { actions, snapshot: mind.snapshot() };
    };
    const first = runExpanded();
    const second = runExpanded();
    expect(first).toEqual(second);
    expect(first.snapshot.hidden.every((value) => value >= -1 && value <= 1)).toBe(true);
    expect(first.snapshot.output.every((value) => value >= -1 && value <= 1)).toBe(true);
  });

  // Behavioral decision signature over many beats — a fingerprint of the child's inherited gene.
  const decisionTrace = (mind: NhiMind, seed: number): number[] => {
    const rng = mulberry32(seed);
    const out: number[] = [];
    for (let b = 0; b < 80; b++) {
      out.push(mind.think({ ...PERCEPT, beat: b, chaos: (b % 5) / 5 }, rng).action);
    }
    return out;
  };

  test('two-parent spawnChild is deterministic from seed', () => {
    const pa = new NhiMind(mulberry32(101));
    const pb = new NhiMind(mulberry32(202));
    const c1 = pa.spawnChild(mulberry32(303), pb);
    const c2 = pa.spawnChild(mulberry32(303), pb);
    expect(decisionTrace(c1, 9)).toEqual(decisionTrace(c2, 9));
  });

  test('a two-parent child differs from the single-parent clone (crossover is engaged)', () => {
    const pa = new NhiMind(mulberry32(101));
    const pb = new NhiMind(mulberry32(202));
    // Same parent A and same child-seed; the ONLY difference is whether mate B contributes genes.
    const solo = pa.spawnChild(mulberry32(303));
    const crossed = pa.spawnChild(mulberry32(303), pb);
    // With B's genes mixed in, the inherited gene — and thus the decision fingerprint — should differ.
    expect(decisionTrace(crossed, 9)).not.toEqual(decisionTrace(solo, 9));
  });
});
