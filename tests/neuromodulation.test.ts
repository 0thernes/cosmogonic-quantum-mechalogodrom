/**
 * NEUROMODULATION (Super Creature 1.1, V95) — Doya's four-neuromodulator metalearning layer. Pins
 * determinism, bounds [0,1], the dopamine reward-prediction-error semantics, the serotonin mood response,
 * the noradrenaline alarm response, NaN-safety, and liveness.
 */
import { describe, expect, test } from 'bun:test';
import { Neuromodulation } from '../src/sim/neuromodulation';

describe('Neuromodulation — Doya metalearning chemistry (V95)', () => {
  test('all four modulators stay bounded [0,1] across a wide sweep; rpe stays finite', () => {
    const n = new Neuromodulation();
    for (let i = 0; i < 80; i++) {
      n.update(
        (i % 5) / 4,
        (i % 7) / 3 - 1,
        (i % 4) / 3,
        ((i + 1) % 6) / 5,
        (i % 3) / 2,
        (i % 9) / 8,
      );
      const s = n.snapshot();
      for (const v of [s.dopamine, s.serotonin, s.noradrenaline, s.acetylcholine]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(s.rpe)).toBe(true);
      expect(s.rpe).toBeGreaterThanOrEqual(-1);
      expect(s.rpe).toBeLessThanOrEqual(1);
    }
  });

  test('deterministic — same state stream replays the identical chemistry', () => {
    const a = new Neuromodulation();
    const b = new Neuromodulation();
    const seq: Array<[number, number, number, number, number, number]> = [
      [0.9, 0.5, 0.6, 0.2, 0.1, 0.3],
      [0.1, -0.4, 0.9, 0.8, 0.7, 0.6],
      [0.5, 0.0, 0.5, 0.5, 0.5, 0.5],
    ];
    for (const o of seq) {
      a.update(...o);
      b.update(...o);
      expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
    }
  });

  test('dopamine = reward-prediction error: a reward above the running baseline pushes DA up, below pushes down', () => {
    // settle the baseline at a low reward, then deliver a big reward ⇒ positive RPE ⇒ DA climbs above 0.5
    const up = new Neuromodulation();
    for (let i = 0; i < 30; i++) up.update(0.1, 0, 0.3, 0.2, 0.1, 0.2); // low-reward baseline
    const before = up.snapshot().dopamine;
    up.update(1, 0, 0.3, 0.2, 0.1, 0.2); // sudden big reward ⇒ +RPE
    expect(up.snapshot().rpe).toBeGreaterThan(0);
    expect(up.snapshot().dopamine).toBeGreaterThan(before);

    // settle high, then a sudden drought ⇒ negative RPE
    const down = new Neuromodulation();
    for (let i = 0; i < 30; i++) down.update(0.9, 0, 0.3, 0.2, 0.1, 0.2);
    down.update(0, 0, 0.3, 0.2, 0.1, 0.2);
    expect(down.snapshot().rpe).toBeLessThan(0);
  });

  test('serotonin tracks tonic mood; noradrenaline tracks arousal/surprise/threat', () => {
    const happy = new Neuromodulation();
    const sad = new Neuromodulation();
    for (let i = 0; i < 60; i++) {
      happy.update(0.5, 1, 0.3, 0.1, 0, 0.2); // sustained positive valence
      sad.update(0.5, -1, 0.3, 0.1, 0, 0.2); // sustained negative valence
    }
    expect(happy.snapshot().serotonin).toBeGreaterThan(sad.snapshot().serotonin);

    const calm = new Neuromodulation();
    const alarmed = new Neuromodulation();
    for (let i = 0; i < 40; i++) {
      calm.update(0.5, 0, 0.05, 0.05, 0, 0.1);
      alarmed.update(0.5, 0, 0.95, 0.95, 0.9, 0.1);
    }
    expect(alarmed.snapshot().noradrenaline).toBeGreaterThan(calm.snapshot().noradrenaline);
  });

  test('NaN / ±Infinity inputs never produce NaN or escape the bounds', () => {
    const n = new Neuromodulation();
    for (const o of [
      [NaN, NaN, NaN, NaN, NaN, NaN],
      [Infinity, -Infinity, NaN, Infinity, -Infinity, NaN],
      [2, -5, 9, -3, 7, -2],
    ] as Array<[number, number, number, number, number, number]>) {
      n.update(...o);
      const s = n.snapshot();
      for (const v of [s.dopamine, s.serotonin, s.noradrenaline, s.acetylcholine]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(JSON.stringify(s)).not.toContain('null');
    }
  });
});
