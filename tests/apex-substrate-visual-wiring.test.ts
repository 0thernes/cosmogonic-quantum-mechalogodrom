import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { AlphabetPantheonRender } from '../src/sim/alphabet-pantheon-render';
import { ApexSubstrateDriver } from '../src/sim/apex-substrate-driver';
import { substrateUniforms } from '../src/sim/apex-substrate-visual';
import { SCALE_MASSIVE } from '../src/sim/apex-brain';

const world = readFileSync(new URL('../src/world.ts', import.meta.url), 'utf8');

describe('apex-substrate-visual is wired into the live apex core shader', () => {
  it('World steps a live 1B substrate and pushes its uniforms to the pantheon render', () => {
    expect(world).toMatch(/new ApexSubstrateDriver\(\s*SCALE_MASSIVE/);
    expect(world).toContain('this.alphabetPantheon.setSubstrate(substrateUniforms(');
  });

  it('the apex core material carries every substrate uniform, fed from live telemetry', () => {
    const r = new AlphabetPantheonRender(new THREE.Scene());
    const before = r.substrateUniformValues();
    expect(Object.keys(before).sort()).toEqual(
      [
        'uBillionReach',
        'uCoherence',
        'uEntanglement',
        'uQgt',
        'uQuantumDim',
        'uResidentLoad',
        'uThermal',
        'uTierSpread',
      ].sort(),
    );
    const d = new ApexSubstrateDriver(SCALE_MASSIVE, 11);
    for (let i = 0; i < 4; i++) d.step(0.6);
    const tel = d.telemetry();
    const u = substrateUniforms(tel.manifold, tel.quantum);
    r.setSubstrate(u);
    const after = r.substrateUniformValues();
    for (const [k, v] of Object.entries(u)) expect(after[k]).toBe(v);
    expect(after.uBillionReach).toBeGreaterThan(0.9);
    r.dispose();
  });
});
