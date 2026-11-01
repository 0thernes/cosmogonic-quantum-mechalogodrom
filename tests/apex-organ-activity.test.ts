import { describe, expect, test } from 'bun:test';
import { createApexBrain } from '../src/sim/apex-brain';

const percept = (t: number) => ({
  threat: 0.5 + 0.4 * Math.sin(t * 0.13),
  energy: 0.5 + 0.4 * Math.cos(t * 0.07),
  chaos: 0.3 + 0.2 * Math.sin(t * 0.31),
  novelty: 0.5 + 0.5 * Math.sin(t * 0.017),
  level: (t / 40) | 0,
});

describe('ApexBrain.organActivityInto', () => {
  test('equals the snapshot organ fields and, like snapshot(), leaves the brain untouched', () => {
    const a = createApexBrain();
    const b = createApexBrain();
    const raw = new Float64Array(10);
    for (let t = 0; t < 240; t++) {
      const ta = a.tick(percept(t));
      const tb = b.tick(percept(t));
      expect(JSON.stringify(tb)).toBe(JSON.stringify(ta));
      const snap = a.snapshot();
      const beat = b.organActivityInto(raw);
      expect(beat).toBe(snap.beat);
      const want = [
        snap.loom.throughput,
        snap.drum.energy,
        snap.necro.liveFraction,
        snap.klein.energy,
        snap.hive.order,
        snap.hydra.coherence,
        snap.wraith.core,
        snap.tunnel.manifested,
        snap.thermo.totalHeat,
        snap.ouroboros.births,
      ];
      for (let k = 0; k < 10; k++) expect(Object.is(raw[k], want[k])).toBe(true);
    }
    expect(JSON.stringify(b.snapshot())).toBe(JSON.stringify(a.snapshot()));
  });
});
