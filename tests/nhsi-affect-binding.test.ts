import { describe, expect, test } from 'bun:test';
import { NhsiAffectBinding } from '../src/sim/nhsi-affect-binding';
import { FacultiesPantheon } from '../src/sim/faculties-pantheon';
import { mulberry32 } from '../src/math/rng';

const neutral = { padPleasure: 0, padArousal: 0, padDominance: 0, pain: 0, pleasure: 0 };

describe('NhsiAffectBinding (resonance-integrator + valence-steering wiring)', () => {
  test('aligned faculty groups form a standing wave', () => {
    const b = new NhsiAffectBinding();
    const out = b.step(new Float32Array(144).fill(0.6), neutral);
    expect(out.coherence).toBeGreaterThan(0.99);
    expect(out.coalitionSize).toBe(8);
    expect(out.standingWave).toBe(true);
  });

  test('pain raises exploration and flags urgency; pleasure lowers it', () => {
    const acts = new Float32Array(144).fill(0.5);
    const pain = new NhsiAffectBinding().step(acts, { ...neutral, pain: 1 });
    const joy = new NhsiAffectBinding().step(acts, { ...neutral, padPleasure: 1 });
    expect(pain.painUrgent).toBe(true);
    expect(pain.valence).toBeLessThan(0);
    expect(pain.exploration).toBeGreaterThan(joy.exploration);
  });

  test('live pantheon activations drive it deterministically', () => {
    const run = () => {
      const p = new FacultiesPantheon(mulberry32(7));
      const b = new NhsiAffectBinding();
      const fi = new Float32Array(16);
      let r = 0;
      for (let k = 0; k < 20; k++) {
        fi.fill((k % 5) / 5);
        p.update(fi);
        r = b.step(p.getActivations(), { ...neutral, padArousal: 0.3 }).resonance;
      }
      return r;
    };
    const a = run();
    expect(a).toBe(run());
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    expect(new FacultiesPantheon(mulberry32(1)).getActivations().length).toBeGreaterThan(100);
  });
});
