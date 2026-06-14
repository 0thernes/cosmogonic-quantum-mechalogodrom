/**
 * Headless smoke + lifecycle tests for the V10/V11 viz systems (alien NHI body, cosmic web, gold
 * lattice, quantum lattice). These construct real three.js Scene/geometry/material objects — which
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
