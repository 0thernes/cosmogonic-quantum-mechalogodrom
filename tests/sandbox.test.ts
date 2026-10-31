import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  SandboxController,
  factorOf,
  loadSettings,
  normalizeSettings,
  saveSettings,
  snapPct,
  type KV,
} from '../src/sim/sandbox';
import { miniWorldHref, stepPct, withLevel } from '../src/ui/sandbox-panel';

function memKV(): KV & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function fakeWorld() {
  const pool = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 100);
  pool.count = 40;
  const group = new THREE.Group();
  group.add(pool);
  let flowerSteps = 0;
  const calls: [string, number, number?][] = [];
  const w = {
    engine: { group: new THREE.Group() }, // skipped field
    flora: { group, update: () => void flowerSteps++ },
    weather: { step: () => 1 },
    plain: { foo: 1 },
    titans: [{ mesh: new THREE.Mesh() }, { mesh: new THREE.Mesh() }],
    phylumCount: 3,
    setPopulationScale: (f: number) => void calls.push(['pop', f]),
    setPhylumScale: (p: number, f: number) => void calls.push(['phylum', f, p]),
  };
  return { w, pool, group, calls, steps: () => flowerSteps };
}

describe('sandbox settings model', () => {
  test('levels snap to the 10 % grid within 0–300 %', () => {
    expect(snapPct(104)).toBe(100);
    expect(snapPct(-20)).toBe(0);
    expect(snapPct(999)).toBe(300);
    expect(snapPct(Number.NaN)).toBe(100);
    expect(stepPct(300, 1)).toBe(300);
    expect(stepPct(0, -1)).toBe(0);
    expect(stepPct(100, 1)).toBe(110);
  });
  test('defaults are never stored; off ⇒ factor 0', () => {
    expect(
      normalizeSettings({ a: { on: true, pct: 100 }, b: { on: false, pct: 100 }, c: 'junk' }),
    ).toEqual({ b: { on: false, pct: 100 } });
    expect(factorOf({ b: { on: false, pct: 200 } }, 'b')).toBe(0);
    expect(factorOf({ b: { on: true, pct: 250 } }, 'b')).toBe(2.5);
    expect(factorOf({}, 'x')).toBe(1);
    expect(withLevel({ a: { on: true, pct: 50 } }, 'a', true, 100)).toEqual({});
  });
  test('persists to storage and Reset clears the key', () => {
    const kv = memKV();
    saveSettings(kv, { x: { on: true, pct: 30 } });
    expect(loadSettings(kv)).toEqual({ x: { on: true, pct: 30 } });
    saveSettings(kv, {});
    expect(kv.map.size).toBe(0);
    kv.setItem('cqm.sandbox.v1', '{broken');
    expect(loadSettings(kv)).toEqual({});
  });
});

describe('sandbox registry (enumerated by reflection, not hand-picked)', () => {
  test('lists population, every phylum, every system and every instanced pool', () => {
    const { w } = fakeWorld();
    const ids = new SandboxController(w).entries.map((e) => e.id);
    expect(ids).toEqual([
      'pop:organisms',
      'phylum:0',
      'phylum:1',
      'phylum:2',
      'sys:flora',
      'sys:flora/pool0',
      'sys:weather',
      'sys:titans[0]',
      'sys:titans[1]',
    ]);
  });

  test('live apply: off hides + suspends, pool level scales count, reset restores exactly', () => {
    const { w, pool, group, calls, steps } = fakeWorld();
    const sb = new SandboxController(w);
    const origUpdate = w.flora.update;
    sb.apply({
      'sys:flora': { on: false, pct: 100 },
      'sys:flora/pool0': { on: true, pct: 50 },
      'pop:organisms': { on: true, pct: 30 },
      'phylum:2': { on: false, pct: 100 },
    });
    expect(group.visible).toBe(false);
    w.flora.update();
    expect(steps()).toBe(0);
    expect(sb.isSuspended('sys:flora')).toBe(true);
    expect(pool.count).toBe(20);
    expect(calls).toEqual([
      ['pop', 0.3],
      ['phylum', 0, 2],
    ]);
    sb.apply({ 'sys:flora/pool0': { on: true, pct: 300 } });
    expect(pool.count).toBe(100); // clamped to the instance buffer capacity
    sb.apply({});
    expect(group.visible).toBe(true);
    expect(w.flora.update).toBe(origUpdate);
    expect(pool.count).toBe(40);
    expect(calls.at(-2)).toEqual(['pop', 1]);
    expect(calls.at(-1)).toEqual(['phylum', 1, 2]);
  });

  test('default settings touch nothing (goldens safe)', () => {
    const { w, pool, calls } = fakeWorld();
    const before = w.flora.update;
    new SandboxController(w).apply({});
    expect(w.flora.update).toBe(before);
    expect(pool.count).toBe(40);
    expect(calls).toEqual([]);
  });
});

describe('mini world entry link', () => {
  test('enter adds world=mini and exit removes it, keeping other params', () => {
    expect(miniWorldHref('https://x.io/app/?tier=mega', true)).toBe(
      'https://x.io/app/?tier=mega&world=mini',
    );
    expect(miniWorldHref('https://x.io/app/?world=mini&tier=mega', false)).toBe(
      'https://x.io/app/?tier=mega',
    );
  });
});
