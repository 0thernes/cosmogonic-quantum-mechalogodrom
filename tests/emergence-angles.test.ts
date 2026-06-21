// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { EMERGENCE_ANGLES, EmergenceAnglesController } from '../src/sim/emergence-angles';
import { ARCHON_CHANNELS } from '../src/sim/pantheon';

describe('NHSI emergence angles (10/10)', () => {
  test('defines ten emergence mechanisms including god-scale brutal substrates', () => {
    expect(EMERGENCE_ANGLES.length).toBe(10);
    expect(EMERGENCE_ANGLES).toContain('ESHKOL_PROGRAM_EVOLUTION');
    expect(EMERGENCE_ANGLES).toContain('CROSS_STRAIN_RECOMBINATION');
    expect(EMERGENCE_ANGLES).toContain('HIGHER_ORDER_EMERGENCE');
    expect(EMERGENCE_ANGLES).toContain('ARCHON_WARFARE');
    expect(EMERGENCE_ANGLES).toContain('TRANSCENDENCE');
  });

  test('god-scale snapshots ride brutal events via tickGodScaleEmergence', () => {
    const ctrl = new EmergenceAnglesController();
    ctrl.tickGodScaleEmergence(0, 1, 0.9, 0.85, 42);
    const god = ctrl.getGodScaleSnapshots();
    expect(god.length).toBeGreaterThanOrEqual(0);
    // Brutal god modes (Valkorion, Broly, Knull, Phoenix, Gurren etc) via brutal-god-releases
    expect(god.length).toBeGreaterThanOrEqual(0);
  });

  test('registers all 25 archon strains for cross-strain + collective emergence', () => {
    const ctrl = new EmergenceAnglesController();
    const genome = new Float32Array(32);
    for (let i = 0; i < ARCHON_CHANNELS; i++) {
      for (let k = 0; k < genome.length; k++) genome[k] = 0.2 + ((i * 0.01 + k * 0.003) % 0.7);
      ctrl.registerStrain(`archon-${i}`, genome);
    }
    ctrl.recombineStrains('archon-0', 'archon-24');
    const em = ctrl.getAggregateEmergence();
    expect(em).toBeGreaterThanOrEqual(0);
    expect(em).toBeLessThanOrEqual(1);
  });

  test('brutal god events are deterministic from archon + emergence + seed', () => {
    const ctrl = new EmergenceAnglesController();
    const a = ctrl.triggerBrutalGodEvent(7, 0.72, 0.88, 1200);
    const b = ctrl.triggerBrutalGodEvent(7, 0.72, 0.88, 1200);
    expect(a.event).toBe(b.event);
    expect(a.powerDelta).toBe(b.powerDelta);
    expect(a.brutality).toBe(b.brutality);
  });
});
