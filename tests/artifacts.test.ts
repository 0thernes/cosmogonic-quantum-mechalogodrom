import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { ArtifactField } from '../src/sim/artifacts';

describe('ArtifactField placement & influence', () => {
  test('placing raises the live count and the local influence field', () => {
    const f = new ArtifactField(new THREE.Scene(), 16);
    expect(f.count).toBe(0);
    expect(f.influenceAt(0, 0)).toBe(0);
    f.place(0, 2, 0, 'relic', 0);
    expect(f.count).toBe(1);
    expect(f.influenceAt(0, 0)).toBeGreaterThan(0);
  });
  test('influence falls off with distance to ~0 past the radius', () => {
    const f = new ArtifactField(new THREE.Scene(), 16);
    f.place(0, 2, 0, 'scar', 0);
    const near = f.influenceAt(2, 0);
    const mid = f.influenceAt(20, 0);
    const far = f.influenceAt(100, 0);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
    expect(far).toBe(0);
  });
  test('placeGround places at a fixed small height (still influences in xz)', () => {
    const f = new ArtifactField(new THREE.Scene(), 16);
    f.placeGround(5, -5, 'scar', 0);
    expect(f.count).toBe(1);
    expect(f.influenceAt(5, -5)).toBeGreaterThan(0);
  });
});

describe('ArtifactField bounded pool (ring eviction)', () => {
  test('count never exceeds capacity', () => {
    const cap = 4;
    const f = new ArtifactField(new THREE.Scene(), cap);
    for (let i = 0; i < cap * 3; i++) f.place(i * 5, 2, 0, 'mote', 0);
    expect(f.count).toBe(cap);
  });
});

describe('ArtifactField lifetime', () => {
  test('artifacts expire and free their slot after their life elapses', () => {
    const f = new ArtifactField(new THREE.Scene(), 16);
    f.place(0, 2, 0, 'relic', 0);
    expect(f.count).toBe(1);
    f.update(1, 5); // mid-life: still alive
    expect(f.count).toBe(1);
    f.update(1, 100); // well past ARTIFACT_LIFE (22) → recycled
    expect(f.count).toBe(0);
    expect(f.influenceAt(0, 0)).toBe(0);
  });
  test('update is safe with an empty field and after dispose', () => {
    const scene = new THREE.Scene();
    const f = new ArtifactField(scene, 8);
    expect(() => f.update(0.016, 1)).not.toThrow();
    f.place(1, 2, 3, 'scar', 0);
    f.update(0.016, 1);
    expect(() => f.dispose(scene)).not.toThrow();
  });
});

describe('ArtifactField kinds', () => {
  test('all three kinds place without error and contribute influence', () => {
    const f = new ArtifactField(new THREE.Scene(), 16);
    f.place(0, 2, 0, 'scar', 0);
    f.place(10, 2, 0, 'relic', 0);
    f.place(0, 2, 10, 'mote', 0);
    expect(f.count).toBe(3);
    f.update(0.016, 0.5);
    expect(f.count).toBe(3);
  });
});
