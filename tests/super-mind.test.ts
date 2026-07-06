/**
 * THE SUPER MIND (V45) — the apex creature's ~10k-param composite consciousness. Pins the parameter
 * budget, the 5-stage / 5-depth / 25-variant / 10-quantum architecture, determinism, bounded drives +
 * consciousness + quantum aspects, and NaN-freedom across the dream/hallucinate/reason/feel pipeline.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperMind,
  QUANTUM_ASPECTS,
  SUPER_DEPTHS,
  SUPER_VARIANTS,
  SUPER_STAGES,
  SUPER_ORGANS,
  SUPER_QUANTUM,
} from '../src/sim/super-mind';
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

describe('SuperMind composite consciousness (V45)', () => {
  test('the composite mind is ~10,000 parameters across its sub-networks', () => {
    const m = new SuperMind(mulberry32(1));
    expect(m.paramCount).toBeGreaterThanOrEqual(9000);
    expect(m.paramCount).toBeLessThanOrEqual(11000);
    // architecture: 5 stages, 5 depths, 25 variants, 30 organ-nets, 10 quantum aspects
    expect(SUPER_STAGES).toBe(5);
    expect(SUPER_DEPTHS).toBe(5);
    expect(SUPER_DEPTHS * SUPER_VARIANTS).toBe(25);
    expect(SUPER_ORGANS).toBe(30);
    expect(SUPER_QUANTUM).toBe(10);
    expect(QUANTUM_ASPECTS).toHaveLength(10);
    expect(m.snapshot().variants).toBe(25);
  });

  test('same seed ⇒ identical psyche (deterministic — the whole mind replays from a seed)', () => {
    const a = new SuperMind(mulberry32(42));
    const b = new SuperMind(mulberry32(42));
    const seq = [
      percept({ threat: 0.9, energy: 0.2 }),
      percept({ chaos: 0.95, sound: 0.9 }),
      percept({ preyClose: 0.9, wealthRel: 1 }),
    ];
    let last = '';
    for (const p of seq) {
      a.think(p);
      b.think(p);
      last = JSON.stringify(a.snapshot());
      expect(last).toBe(JSON.stringify(b.snapshot()));
    }
    expect(last.length).toBeGreaterThan(0);
  });

  test('#59 resonance integrator is wired live: bounded, dynamic, ignites, self-tunes its coupling, deterministic', () => {
    const m = new SuperMind(mulberry32(123));
    let mn = 1;
    let mx = 0;
    let ignitedEver = false;
    let lastHomeo: {
      coupling: number;
      meanOrder: number;
      setpoint: number;
      responsiveness: number;
    } | null = null;
    for (let i = 0; i < 200; i++) {
      m.think(percept({ threat: 0.05, energy: 0.85, chaos: 0.05, crowding: 0.05, sound: 0.1 }));
      const r = m.snapshot().resonance;
      expect(r.coupled).toBe(12); // the consciousness assembly
      expect(r.order).toBeGreaterThanOrEqual(0);
      expect(r.order).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.phase)).toBe(true);
      expect(r.homeostat).not.toBeNull(); // the apex mind runs the field in adaptive-coupling mode
      mn = Math.min(mn, r.order);
      mx = Math.max(mx, r.order);
      if (r.ignited) ignitedEver = true;
      lastHomeo = r.homeostat;
    }
    // A genuine dynamical variable (binds AND unbinds) that crosses into bound moments — not a
    // decorative constant.
    expect(mx - mn).toBeGreaterThan(0.3);
    expect(mx).toBeGreaterThan(0.6);
    expect(ignitedEver).toBe(true);
    // The adaptive-coupling homeostat self-tuned the assembly into the responsive regime: the slow mean
    // order sits near the setpoint and responsiveness is high.
    expect(lastHomeo!.setpoint).toBeCloseTo(0.5, 10);
    expect(Math.abs(lastHomeo!.meanOrder - lastHomeo!.setpoint)).toBeLessThan(0.2);
    expect(lastHomeo!.responsiveness).toBeGreaterThan(0.6);

    // Deterministic: the same seed replays the same standing-wave + homeostat trajectory bit-for-bit.
    const a = new SuperMind(mulberry32(55));
    const b = new SuperMind(mulberry32(55));
    for (let i = 0; i < 40; i++) {
      a.think(percept({ phase: i / 40, chaos: (i % 5) / 5 }));
      b.think(percept({ phase: i / 40, chaos: (i % 5) / 5 }));
      expect(JSON.stringify(a.snapshot().resonance)).toBe(JSON.stringify(b.snapshot().resonance));
    }
  }, 30000); // 200+ apex think() beats × the now-heavier 25-faculty stack; generous budget vs the 5s default

  test('drives + consciousness + quantum are all bounded; plan is always a real goal', () => {
    const m = new SuperMind(mulberry32(7));
    for (let i = 0; i < 40; i++) {
      const it = m.think(
        percept({ threat: (i % 10) / 10, energy: 1 - (i % 7) / 7, phase: i / 40 }),
      );
      for (const v of [it.move.x, it.move.y, it.move.z]) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
      for (const v of [it.aggression, it.deception, it.dominance, it.spawn, it.curiosity]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(it.quantum).toHaveLength(10);
      for (const qa of it.quantum) {
        expect(qa).toBeGreaterThanOrEqual(0);
        expect(qa).toBeLessThanOrEqual(1);
      }
      const c = it.consciousness;
      for (const v of [
        c.dreaming,
        c.hallucinating,
        c.reasoning,
        c.selfAware,
        c.novelty,
        c.surprise,
        c.ignition, // V89 · GWT broadcast
        c.phi, // V89 · IIT Φ proxy
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(c.feeling).toBeGreaterThanOrEqual(-1);
      expect(c.feeling).toBeLessThanOrEqual(1);
      // V99 — the metacog confidence now reads the GENUINE register Φ each beat (blended into its
      // integration cue); it must stay finite + bounded [0,1] (a regression guard: a non-number Φ would
      // silently NaN it, which the typed surface catches but the runtime bounds should too).
      const conf = m.snapshot().metacog.confidence;
      expect(Number.isFinite(conf)).toBe(true);
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
  });

  test('it always DREAMS (imagines) and the consciousness fields are live, not constant', () => {
    const m = new SuperMind(mulberry32(3));
    const dreams: number[] = [];
    for (let i = 0; i < 30; i++)
      dreams.push(m.think(percept({ chaos: i / 30 })).consciousness.dreaming);
    expect(Math.min(...dreams)).toBeGreaterThan(0); // it is always imagining
    expect(new Set(dreams.map((d) => Math.round(d * 1e3))).size).toBeGreaterThan(1); // it varies (alive)
  });

  test('V89 (SC 1.1) — ignition (GWT) + Φ (IIT) are live, bounded [0,1], finite metrics', () => {
    const m = new SuperMind(mulberry32(11));
    const igs: number[] = [];
    const phis: number[] = [];
    for (let i = 0; i < 60; i++) {
      const c = m.think(
        percept({
          threat: (i % 12) / 12,
          preyClose: ((i + 3) % 9) / 9,
          wealthRel: (i % 5) / 5,
          phase: i / 60,
        }),
      ).consciousness;
      for (const v of [c.ignition, c.phi]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      igs.push(c.ignition);
      phis.push(c.phi);
      // the snapshot carries the same metrics for the boards/telemetry
      expect(m.snapshot().consciousness.phi).toBe(c.phi);
    }
    // both are alive — they vary across the run, not pinned constants
    expect(new Set(igs.map((x) => Math.round(x * 1e3))).size).toBeGreaterThan(1);
    expect(new Set(phis.map((x) => Math.round(x * 1e3))).size).toBeGreaterThan(1);
  });

  test('GWT-4 attention controller is wired into the apex decision loop', () => {
    const a = new SuperMind(mulberry32(707));
    const b = new SuperMind(mulberry32(707));
    for (let i = 0; i < 24; i++) {
      const p = percept({
        threat: i % 2 ? 0.9 : 0.05,
        chaos: (i % 7) / 7,
        preyClose: (i % 5) / 5,
        phase: i / 24,
      });
      a.think(p);
      b.think(p);
      const sa = a.snapshot().attentionController;
      const sb = b.snapshot().attentionController;
      expect(JSON.stringify(sa)).toBe(JSON.stringify(sb));
      expect(sa.focus).toHaveLength(7);
      expect(sa.focus.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
      expect(sa.appliedGain).toBeGreaterThan(0);
      expect(Number.isFinite(sa.entropy)).toBe(true);
    }
  });

  test('no NaN across a long run of dreaming/reasoning/feeling', () => {
    const m = new SuperMind(mulberry32(5));
    for (let i = 0; i < 300; i++) {
      const it = m.think(percept({ threat: Math.sin(i) * 0.5 + 0.5, phase: (i % 60) / 60 }));
      const snap = m.snapshot();
      const fin =
        it.move.x +
        it.aggression +
        snap.emotion.valence +
        snap.consciousness.novelty +
        (snap.quantum[0] ?? 0);
      expect(Number.isFinite(fin)).toBe(true);
    }
  }, 30000); // 300 apex think() beats × the heavy 25-faculty stack; slow CI vs the 5s default
});
