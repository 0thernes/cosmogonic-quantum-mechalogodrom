/**
 * Headless smoke + lifecycle tests for the V10/V11 viz systems (alien NHI body, cosmic web, gold
 * lattice, quantum lattice) + the V63 ascension MonolithTemple. These construct real three.js
 * Scene/geometry/material objects — which
 * need NO WebGL context — and run their per-frame update, so they catch the one class of bug the
 * wedged-GPU preview could not: a constructor or update that THROWS. (Visual correctness still needs
 * a real GPU; these lock in "does not crash + lifecycle is sound".)
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { CosmicWeb } from '../src/sim/cosmic-web';
import { GoldLattice } from '../src/sim/gold-lattice';
import { QuantumLattice } from '../src/sim/quantum-lattice';
import { NhiBodySystem } from '../src/sim/nhi-body';
import { MonolithTemple } from '../src/sim/monolith-temple';

describe('environment viz systems construct + update without throwing', () => {
  test('CosmicWeb adds to the scene and shimmers', () => {
    const scene = new THREE.Scene();
    const web = new CosmicWeb(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(() => {
      web.update(0);
      web.update(3.5);
      web.update(120);
    }).not.toThrow();
  });

  test('GoldLattice adds to the scene and tumbles', () => {
    const scene = new THREE.Scene();
    const gold = new GoldLattice(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(() => {
      gold.update(0);
      gold.update(42);
    }).not.toThrow();
  });

  test('QuantumLattice adds to the scene and breathes', () => {
    const scene = new THREE.Scene();
    const q = new QuantumLattice(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(() => {
      q.update(0);
      q.update(99);
    }).not.toThrow();
  });
});

describe('NhiBodySystem lifecycle', () => {
  test('spawn is idempotent per id; a dead NHI (null pos) disposes its body', () => {
    const scene = new THREE.Scene();
    const bodies = new NhiBodySystem(scene);
    expect(bodies.count).toBe(0);

    bodies.spawn(1, 0, 10, 0);
    bodies.spawn(1, 0, 10, 0); // same id → no duplicate
    bodies.spawn(2, 5, 5, 5);
    expect(bodies.count).toBe(2);

    const livePos = new THREE.Vector3(3, 4, 5);
    expect(() => bodies.update(1.2, (id) => (id === 1 ? livePos : null))).not.toThrow();
    expect(bodies.count).toBe(1); // id 2 returned null → its body was disposed

    bodies.clear();
    expect(bodies.count).toBe(0);
  });

  test('repeated updates following a moving NHI never throw', () => {
    const scene = new THREE.Scene();
    const bodies = new NhiBodySystem(scene);
    bodies.spawn(7, 0, 0, 0);
    const p = new THREE.Vector3();
    expect(() => {
      for (let i = 0; i < 50; i++) {
        p.set(Math.sin(i), i, Math.cos(i));
        bodies.update(i * 0.1, () => p);
      }
    }).not.toThrow();
    expect(bodies.count).toBe(1);
  });
});

describe('MonolithTemple — the V63 ascension Stage-2 portal', () => {
  test('builds hidden, then reveals + rises without throwing (determinism-neutral, no rng)', () => {
    const scene = new THREE.Scene();
    const temple = new MonolithTemple(scene);
    expect(temple.revealed).toBe(false);
    expect(temple.snapshot().visualNodes).toBeGreaterThanOrEqual(25);
    expect(scene.children.length).toBeGreaterThan(0); // meshes are built up-front (hidden until reveal)
    temple.reveal(0, 0, 0);
    expect(temple.revealed).toBe(true);
    expect(() => {
      for (let i = 0; i < 90; i++) temple.update(1 / 60, i / 60); // through the rise animation
    }).not.toThrow();
  });

  test('a silent reveal (restoring an already-ascended creature) settles without throwing', () => {
    const scene = new THREE.Scene();
    const temple = new MonolithTemple(scene);
    temple.reveal(10, 0, -5, true); // silent = no rise animation, just THERE
    expect(temple.revealed).toBe(true);
    expect(() => temple.update(1 / 60, 5)).not.toThrow();
    expect(temple.snapshot().rise).toBe(1);
  });

  test('reacts to real world state: chaos + entropy + crowding intensify the shadow cage', () => {
    const calm = new MonolithTemple(new THREE.Scene());
    calm.reveal(0, 0, 0, true);
    calm.setEnvironment({ chaos: 0, entropy: 0, population: 0, capacity: 50000 });
    calm.update(1 / 60, 12);
    const a = calm.snapshot();

    const storm = new MonolithTemple(new THREE.Scene());
    storm.reveal(0, 0, 0, true);
    storm.setEnvironment({ chaos: 1, entropy: 1, population: 50000, capacity: 50000 });
    storm.update(1 / 60, 12);
    const b = storm.snapshot();

    expect(b.reactivity).toBeGreaterThan(a.reactivity);
    expect(b.cageWarp).toBeGreaterThan(a.cageWarp);
    expect(b.shadow).toBeGreaterThan(a.shadow);
    expect(b.shimmer).toBeGreaterThan(a.shimmer);
    expect(b.crowding).toBe(1);
  });

  test('reactive snapshot is deterministic for the same update stream', () => {
    const a = new MonolithTemple(new THREE.Scene());
    const b = new MonolithTemple(new THREE.Scene());
    a.reveal(0, 0, 0, true);
    b.reveal(0, 0, 0, true);
    a.setEnvironment({ chaos: 0.42, entropy: 0.25, population: 1234, capacity: 50000 });
    b.setEnvironment({ chaos: 0.42, entropy: 0.25, population: 1234, capacity: 50000 });
    for (let i = 0; i < 120; i++) {
      a.update(1 / 60, i / 60);
      b.update(1 / 60, i / 60);
    }
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  test('environment guards clamp bad inputs instead of poisoning the temple with NaN', () => {
    const temple = new MonolithTemple(new THREE.Scene());
    temple.reveal(0, 0, 0, true);
    temple.setEnvironment({
      chaos: Number.POSITIVE_INFINITY,
      entropy: Number.NaN,
      population: -50,
      capacity: 0,
    });
    temple.update(Number.NaN, Number.POSITIVE_INFINITY);
    const snap = temple.snapshot();
    expect(Number.isFinite(snap.reactivity)).toBe(true);
    expect(Number.isFinite(snap.shadow)).toBe(true);
    expect(Number.isFinite(snap.shimmer)).toBe(true);
    expect(Number.isFinite(snap.cageWarp)).toBe(true);
    expect(snap.crowding).toBe(0);
  });
});
