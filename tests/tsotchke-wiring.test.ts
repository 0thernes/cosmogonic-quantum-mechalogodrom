import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { getGodformBias, getFullTsotchkeBias } from '../src/sim/godform';
import { SuperMind } from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';

function percept(): SuperPercept {
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
  };
}

describe('Tsotchke corpus wiring — godform → SuperMind', () => {
  test('getFullTsotchkeBias carries eshkolProgram from godform', () => {
    for (let i = 0; i < 5; i++) {
      const base = getGodformBias(i);
      const full = getFullTsotchkeBias(i);
      expect(full.eshkolProgram).toBe(base.eshkolProgram);
      expect(full.tsotchkeModule).toBe(base.tsotchkeModule);
    }
  });

  test('SuperMind constructor receives and snapshots corpus program', () => {
    const bias = getFullTsotchkeBias(2);
    const m = new SuperMind(
      mulberry32(99),
      bias.cliffordWeight,
      bias.eshkolLogic,
      bias.eshkolInference,
      bias.eshkolWorkspace,
      bias.tsotchkeModule,
      bias.eshkolProgram,
    );
    m.think(percept());
    const snap = m.snapshot();
    expect(snap.eshkolConsciousness?.program).toBe(bias.eshkolProgram);
    expect(snap.eshkolConsciousness?.module).toBe(bias.tsotchkeModule);
  });

  test('distinct Archon programs yield distinct consciousness snapshots (same seed)', () => {
    const b0 = getFullTsotchkeBias(0);
    const b1 = getFullTsotchkeBias(1);
    const m0 = new SuperMind(
      mulberry32(7),
      b0.cliffordWeight,
      b0.eshkolLogic,
      b0.eshkolInference,
      b0.eshkolWorkspace,
      b0.tsotchkeModule,
      b0.eshkolProgram,
    );
    const m1 = new SuperMind(
      mulberry32(7),
      b1.cliffordWeight,
      b1.eshkolLogic,
      b1.eshkolInference,
      b1.eshkolWorkspace,
      b1.tsotchkeModule,
      b1.eshkolProgram,
    );
    m0.think(percept());
    m1.think(percept());
    expect(m0.snapshot().eshkolConsciousness?.program).not.toBe(
      m1.snapshot().eshkolConsciousness?.program,
    );
  });
});
