import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES,
  XENOMIMIC_CONNECTOME_MAX_LINKS,
  XenomimicConnectome,
} from '../src/sim/xenomimic-connectome';
import { XenomimicPopulation } from '../src/sim/xenomimics';
import type { Xenomimic } from '../src/sim/xenomimics';

describe('XenomimicConnectome', () => {
  test('counts twin + entity topology but never draws physical tethers', () => {
    const population = new XenomimicPopulation(0x71c1c, { growthRamp: 999 });
    const first = population.bodyView()[0]!;
    const entity = { position: { x: first.x, y: first.y, z: first.z }, userData: { act: 0.7 } };
    const connectome = new XenomimicConnectome(null);

    connectome.sync(population, [entity], 1.25);

    // Twin pair + entity proximity are logical (psionic / sensing) — never LineSegments cords.
    expect(connectome.linkCount).toBe(2);
    expect(connectome.visible).toBe(false);
    connectome.dispose();
  });

  test('hard-bounds Entity bridges; visibility stays off; tears down idempotently', () => {
    const population = new XenomimicPopulation(0x51a1, { growthRamp: 999 });
    const first = population.bodyView()[0]!;
    const entities = Array.from({ length: 100 }, () => ({
      position: { x: first.x, y: first.y, z: first.z },
      userData: { act: 0.4 },
    }));
    const connectome = new XenomimicConnectome(null);

    expect(XENOMIMIC_CONNECTOME_MAX_LINKS).toBe(2500);
    expect(XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES).toBe(48);
    expect(connectome.visible).toBe(false);
    connectome.setVisible(true); // no-op
    expect(connectome.visible).toBe(false);
    connectome.sync(population, entities, 0);
    expect(connectome.linkCount).toBe(1 + XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES);
    expect(connectome.linkCount).toBeLessThanOrEqual(XENOMIMIC_CONNECTOME_MAX_LINKS);

    connectome.dispose();
    connectome.dispose();
  });

  test('sync contains no typed-array or collection construction', () => {
    const source = readFileSync('src/sim/xenomimic-connectome.ts', 'utf8');
    const syncBody = source.slice(source.indexOf('  sync('), source.indexOf('  dispose():'));
    expect(syncBody).not.toMatch(/new\s+(?:Float|Uint|Int)\d+Array/);
    expect(syncBody).not.toContain('Array.from');
    expect(syncBody).not.toContain('new Map');
    expect(syncBody).not.toContain('new Set');
    expect(source.toLowerCase()).toContain('psionic');
    expect(source).not.toContain('new THREE.LineSegments');
    expect(source).not.toContain('LineBasicMaterial');
  });

  test('shrinking populations and disposal release every captured creature reference', () => {
    const first = { pairId: 0, role: 0, x: 0, y: 0, z: 0 } as Xenomimic;
    const second = { pairId: 0, role: 1, x: 1, y: 0, z: 0 } as Xenomimic;
    const removedA = { pairId: 1, role: 0, x: 2, y: 0, z: 0 } as Xenomimic;
    const removedB = { pairId: 1, role: 1, x: 3, y: 0, z: 0 } as Xenomimic;
    let live: Xenomimic[] = [first, second, removedA, removedB];
    const population = {
      forEach(callback: (creature: Xenomimic) => void): void {
        live.forEach(callback);
      },
    } as XenomimicPopulation;
    const connectome = new XenomimicConnectome(null);
    const captured = (connectome as unknown as { creatures: Array<Xenomimic | null> }).creatures;

    connectome.sync(population, [], 0);
    expect(captured.slice(0, 4)).toEqual(live);

    live = [first, second];
    connectome.sync(population, [], 1);
    expect(captured.slice(0, 4)).toEqual([first, second, null, null]);

    connectome.dispose();
    expect(captured.every((creature) => creature === null)).toBe(true);
  });
});
